const express = require('express');
const router = express.Router();
const db = require('../db');
const { getUserIdFromToken, extractToken } = require('../utils/auth');
const PDFDocument = require('pdfkit');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { Chart, registerables } = require('chart.js');
Chart.register(...registerables);

// Register additional plugins
require('chartjs-plugin-datalabels');

// Helper to check researcher role
async function checkResearcherRole(userId) {
    const roles = await db.executeQuery(
        `SELECT r.role_name FROM user_roles ur JOIN roles r ON ur.role_ID = r.role_ID WHERE ur.user_ID = ?`,
        [userId]
    );
    return roles.some(r => r.role_name === 'researcher');
}

// Helper for milestone field validation
function validateMilestoneFields({ title, description, expected_completion_date, status }) {
    if (!title || typeof title !== 'string' || !title.trim()) {
        return 'Title is required and must be a non-empty string';
    }
    if (description !== undefined && description !== null && typeof description !== 'string') {
        return 'Description must be a string or null';
    }
    if (expected_completion_date !== undefined && expected_completion_date !== null) {
        // Accept only YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(expected_completion_date)) {
            return 'expected_completion_date must be in YYYY-MM-DD format or null';
        }
    }
    const allowedStatuses = ['Not Started', 'In Progress', 'Completed'];
    if (status !== undefined && status !== null && !allowedStatuses.includes(status)) {
        return `Status must be one of: ${allowedStatuses.join(', ')}`;
    }
    return null;
}

// Get all projects for the current researcher, each with its milestones
router.get('/', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }
        // Get all projects for this user
        const projects = await db.executeQuery(
            `SELECT project_ID, title, owner_ID FROM projects WHERE owner_ID = ?`,
            [userId]
        );
        // For each project, get its milestones and collaborators
        for (const project of projects) {
            // Get milestones
            const milestones = await db.executeQuery(
                `SELECT m.*, u.fname as assigned_user_fname, u.sname as assigned_user_sname 
                 FROM milestones m 
                 LEFT JOIN users u ON m.assigned_user_ID = u.user_ID 
                 WHERE m.project_ID = ? 
                 ORDER BY m.expected_completion_date ASC`,
                [project.project_ID]
            );
            project.milestones = milestones;

            // Get owner information
            const owner = await db.executeQuery(
                `SELECT user_ID, fname, sname FROM users WHERE user_ID = ?`,
                [project.owner_ID]
            );
            
            if (!owner.length) {
                return res.status(500).json({ error: 'Owner information not found' });
            }

            // Get collaborator information
            const collaborators = await db.executeQuery(
                `SELECT DISTINCT u.user_ID, u.fname, u.sname 
                 FROM project_collaborations pc 
                 JOIN users u ON pc.user_ID = u.user_ID 
                 WHERE pc.project_ID = ?`,
                [project.project_ID]
            );

            // Create a Set to track unique user IDs
            const uniqueUserIds = new Set();
            
            // Start with the owner
            const ownerInfo = {
                user_ID: owner[0].user_ID,
                first_name: owner[0].fname,
                last_name: owner[0].sname,
                is_owner: true
            };
            uniqueUserIds.add(ownerInfo.user_ID);

            // Filter collaborators to ensure no duplicates
            const uniqueCollaborators = collaborators
                .filter(collab => !uniqueUserIds.has(collab.user_ID))
                .map(collab => {
                    uniqueUserIds.add(collab.user_ID);
                    return {
                        user_ID: collab.user_ID,
                        first_name: collab.fname,
                        last_name: collab.sname,
                        is_owner: false
                    };
                });

            // Combine owner and unique collaborators
            project.collaborators = [ownerInfo, ...uniqueCollaborators];
        }

        // Fetch all milestones for all projects owned by the user for status summary
        const allMilestones = await db.executeQuery(
            `SELECT m.status FROM milestones m
             JOIN projects p ON m.project_ID = p.project_ID
             WHERE p.owner_ID = ?`,
            [userId]
        );

        // Calculate total count
        const total = allMilestones.length;
        let summary = [];
        if (total > 0) {
            // Count occurrences of each status
            const statusCounts = {};
            allMilestones.forEach(m => {
                const status = m.status || 'Not Started';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });

            // Convert counts to percentages
            summary = Object.entries(statusCounts).map(([status, count]) => ({
                status,
                count,
                percentage: (count / total) * 100
            }));
        }

        res.json({ projects, summary });
    } catch (error) {
        if (error.code && typeof error.code === 'string' && error.code.startsWith('ER_')) {
            res.status(500).json({ error: 'A server error occurred' });
        } else {
            res.status(401).json({ error: error.message || 'Authentication failed' });
        }
    }
});

// Create a new milestone
router.post('/:projectId', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }
        const { projectId } = req.params;
        const { title, description, expected_completion_date, assigned_user_ID, status } = req.body;

        // Validate fields
        const validationError = validateMilestoneFields({ title, description, expected_completion_date, status });
        if (validationError) return res.status(400).json({ error: validationError });

        // If assigned_user_ID is provided, check if it exists and is a collaborator or owner
        let assignedIdToUse = assigned_user_ID || null;
        if (assigned_user_ID) {
            // Check if user exists
            const userCheck = await db.executeQuery(
                `SELECT user_ID FROM users WHERE user_ID = ?`,
                [assigned_user_ID]
            );
            if (!userCheck.length) {
                return res.status(400).json({ error: 'assigned_user_ID does not exist' });
            }
            // Check if user is owner or collaborator
            const collabCheck = await db.executeQuery(
                `SELECT owner_ID as user_ID FROM projects WHERE project_ID = ? AND owner_ID = ?
                 UNION
                 SELECT user_ID FROM project_collaborations WHERE project_ID = ? AND user_ID = ?`,
                [projectId, assigned_user_ID, projectId, assigned_user_ID]
            );
            if (!collabCheck.length) {
                return res.status(400).json({ error: 'assigned_user_ID is not a collaborator or owner of the project' });
            }
        }

        const result = await db.executeQuery(
            `INSERT INTO milestones (project_ID, title, description, expected_completion_date, assigned_user_ID, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [projectId, title, description || null, expected_completion_date || null, assignedIdToUse, status || 'Not Started']
        );
        res.status(201).json({ message: 'Milestone created', milestone_ID: result.insertId });
    } catch (error) {
        if (error.code && typeof error.code === 'string' && error.code.startsWith('ER_')) {
            res.status(500).json({ error: 'A server error occurred' });
        } else {
            res.status(401).json({ error: error.message || 'Failed to create milestone' });
        }
    }
});

// Get details for a specific milestone
router.get('/:milestoneId', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }
        const { milestoneId } = req.params;
        const milestones = await db.executeQuery(
            `SELECT m.*, p.title as project_title, 
                    u.fname as assigned_user_fname, u.sname as assigned_user_sname
             FROM milestones m 
             JOIN projects p ON m.project_ID = p.project_ID 
             LEFT JOIN users u ON m.assigned_user_ID = u.user_ID
             WHERE m.milestone_ID = ?`,
            [milestoneId]
        );
        if (!milestones.length) return res.status(404).json({ error: 'Milestone not found' });

        // Get project collaborators
        const projectId = milestones[0].project_ID;
        const collaborators = await db.executeQuery(
            `SELECT DISTINCT u.user_ID, u.fname, u.sname 
             FROM (
                 SELECT owner_ID as user_ID FROM projects WHERE project_ID = ?
                 UNION
                 SELECT user_ID FROM project_collaborations WHERE project_ID = ?
             ) as project_users
             JOIN users u ON project_users.user_ID = u.user_ID`,
            [projectId, projectId]
        );

        res.json({ 
            milestone: milestones[0],
            collaborators: collaborators.map(c => ({
                user_ID: c.user_ID,
                name: `${c.fname} ${c.sname}`
            }))
        });
    } catch (error) {
        if (error.code && typeof error.code === 'string' && error.code.startsWith('ER_')) {
            res.status(500).json({ error: 'A server error occurred' });
        } else {
            res.status(401).json({ error: error.message || 'Failed to fetch milestone' });
        }
    }
});

// Update a milestone
router.put('/:projectId/:milestoneId', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }
        const { milestoneId, projectId } = req.params;
        const { title, description, expected_completion_date, assigned_user_ID, status } = req.body;

        // Validate fields
        const validationError = validateMilestoneFields({ title, description, expected_completion_date, status });
        if (validationError) return res.status(400).json({ error: validationError });

        // If assigned_user_ID is provided, check if it exists and is a collaborator or owner
        let assignedIdToUse = assigned_user_ID || null;
        if (assigned_user_ID) {
            // Check if user exists
            const userCheck = await db.executeQuery(
                `SELECT user_ID FROM users WHERE user_ID = ?`,
                [assigned_user_ID]
            );
            if (!userCheck.length) {
                return res.status(400).json({ error: 'assigned_user_ID does not exist' });
            }
            // Check if user is owner or collaborator
            const collabCheck = await db.executeQuery(
                `SELECT owner_ID as user_ID FROM projects WHERE project_ID = ? AND owner_ID = ?
                 UNION
                 SELECT user_ID FROM project_collaborations WHERE project_ID = ? AND user_ID = ?`,
                [projectId, assigned_user_ID, projectId, assigned_user_ID]
            );
            if (!collabCheck.length) {
                return res.status(400).json({ error: 'assigned_user_ID is not a collaborator or owner of the project' });
            }
        }

        const result = await db.executeQuery(
            `UPDATE milestones SET title=?, description=?, expected_completion_date=?, assigned_user_ID=?, status=?, updated_at=NOW() WHERE milestone_ID=?`,
            [title, description, expected_completion_date, assignedIdToUse, status, milestoneId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Milestone not found' });
        res.json({ message: 'Milestone updated' });
    } catch (error) {
        if (error.code && typeof error.code === 'string' && error.code.startsWith('ER_')) {
            res.status(500).json({ error: 'A server error occurred' });
        } else {
            res.status(401).json({ error: error.message || 'Failed to update milestone' });
        }
    }
});

// Delete a milestone
router.delete('/:projectId/:milestoneId', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }
        const { milestoneId } = req.params;
        const result = await db.executeQuery(
            `DELETE FROM milestones WHERE milestone_ID = ?`,
            [milestoneId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Milestone not found' });
        res.json({ message: 'Milestone deleted' });
    } catch (error) {
        if (error.code && typeof error.code === 'string' && error.code.startsWith('ER_')) {
            res.status(500).json({ error: 'A server error occurred' });
        } else {
            res.status(401).json({ error: error.message || 'Failed to delete milestone' });
        }
    }
});

// Generate PDF report of all projects and milestones
router.get('/report', async (req, res) => {
    let doc = null;
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }

        // Get all projects for this user
        const projects = await db.executeQuery(
            `SELECT project_ID, title, owner_ID FROM projects WHERE owner_ID = ?`,
            [userId]
        );

        // Create a new PDF document
        doc = new PDFDocument({
            size: 'A4',
            margin: 50
        });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=projects-report.pdf');
        
        // Pipe the PDF to the response
        doc.pipe(res);

        // Add title
        doc.fontSize(24)
           .text('Projects and Milestones Report', { align: 'center' })
           .moveDown(2);

        // Collect all milestone statuses for the overall pie chart
        const allMilestones = [];
        const projectData = [];

        // For each project, get its milestones and collaborators
        for (const project of projects) {
            try {
                // Get milestones with all fields
                const milestones = await db.executeQuery(
                    `SELECT milestone_ID, title, description, status, expected_completion_date, assigned_user_ID 
                     FROM milestones 
                     WHERE project_ID = ? 
                     ORDER BY expected_completion_date ASC`,
                    [project.project_ID]
                );

                // Get owner information
                const owner = await db.executeQuery(
                    `SELECT user_ID, fname, sname FROM users WHERE user_ID = ?`,
                    [project.owner_ID]
                );

                if (!owner.length) {
                    console.error(`Owner information not found for project ${project.project_ID}`);
                    continue;
                }

                // Get collaborator information
                const collaborators = await db.executeQuery(
                    `SELECT DISTINCT u.user_ID, u.fname, u.sname 
                     FROM project_collaborations pc 
                     JOIN users u ON pc.user_ID = u.user_ID 
                     WHERE pc.project_ID = ?`,
                    [project.project_ID]
                );

                // Create a Set to track unique user IDs
                const uniqueUserIds = new Set();
                
                // Start with the owner
                const ownerInfo = {
                    user_ID: owner[0].user_ID,
                    first_name: owner[0].fname,
                    last_name: owner[0].sname,
                    is_owner: true
                };
                uniqueUserIds.add(ownerInfo.user_ID);

                // Filter collaborators to ensure no duplicates
                const uniqueCollaborators = collaborators
                    .filter(collab => !uniqueUserIds.has(collab.user_ID))
                    .map(collab => {
                        uniqueUserIds.add(collab.user_ID);
                        return {
                            user_ID: collab.user_ID,
                            first_name: collab.fname,
                            last_name: collab.sname,
                            is_owner: false
                        };
                    });

                // Add milestones to overall collection
                milestones.forEach(m => {
                    const status = m.status || 'Not Started';
                    allMilestones.push(status);
                });

                projectData.push({
                    title: project.title,
                    owner: ownerInfo,
                    collaborators: uniqueCollaborators,
                    milestones: milestones
                });
            } catch (error) {
                console.error(`Error processing project ${project.project_ID}:`, error);
                continue; // Skip this project and continue with others
            }
        }

        // Calculate overall statistics
        const overallStatusCounts = {
            'Not Started': 0,
            'In Progress': 0,
            'Completed': 0
        };
        allMilestones.forEach(status => {
            overallStatusCounts[status]++;
        });

        try {
            // Add overall statistics section
            doc.fontSize(18)
               .text('Overall Milestone Statistics', { align: 'center' })
               .moveDown();

            // Create pie chart
            const width = 800;  // Decreased from 1200
            const height = 800; // Decreased from 1200
            const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
                width, 
                height,
                backgroundColour: 'white',
                type: 'png',
                plugins: {
                    modern: ['chartjs-plugin-datalabels']
                }
            });
            
            const configuration = {
                type: 'pie',
                data: {
                    labels: Object.keys(overallStatusCounts),
                    datasets: [{
                        data: Object.values(overallStatusCounts),
                        backgroundColor: [
                            '#FF6384', // Not Started - Red
                            '#36A2EB', // In Progress - Blue
                            '#4BC0C0'  // Completed - Teal
                        ],
                        borderWidth: 3,
                        borderColor: 'white',
                        hoverBorderWidth: 4,
                        hoverBorderColor: '#666666'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        animateScale: true,
                        animateRotate: true
                    },
                    plugins: {
                        datalabels: {
                            color: '#fff',
                            font: {
                                weight: 'bold',
                                size: 24  // Increased from 16
                            },
                            formatter: (value, ctx) => {
                                const total = ctx.dataset.data.reduce((acc, data) => acc + data, 0);
                                const percentage = Math.round((value * 100) / total);
                                return `${percentage}%`;
                            }
                        },
                        title: {
                            display: true,
                            text: 'Overall Milestone Status Distribution',
                            font: {
                                size: 36,  // Increased from 28
                                weight: 'bold',
                                family: 'Arial'
                            },
                            padding: 40,  // Increased padding
                            color: '#333333'
                        },
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: {
                                    size: 24,  // Increased from 18
                                    family: 'Arial',
                                    weight: 'bold'  // Added bold weight
                                },
                                padding: 30,  // Increased padding
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        }
                    }
                }
            };

            // Generate chart image with higher quality
            const image = await chartJSNodeCanvas.renderToBuffer(configuration);
            
            // Center the graph horizontally
            const pageWidth = 595.28; // A4 width in points
            const graphWidth = 400;
            const graphX = (pageWidth - graphWidth) / 2;
            doc.image(image, {
                fit: [400, 400],
                align: 'center',
                x: graphX
            });
            
            doc.moveDown();
        } catch (error) {
            console.error('Error generating chart:', error);
            doc.fontSize(14)
               .text('Error generating chart. Please try again.', { align: 'center' })
               .moveDown();
        }

        // Add overall statistics table
        doc.fontSize(14)
           .text('Status Breakdown:', { underline: true })
           .moveDown(0.5);

        // Create table for statistics
        const statsTableTop = doc.y;
        const statsTableLeft = 50;
        const statsColWidth = 150;
        const statsRowHeight = 30;

        // Draw table border
        doc.rect(statsTableLeft, statsTableTop, 450, statsRowHeight * 4)
           .stroke('#cccccc');

        // Table headers
        doc.fontSize(12)
           .fillColor('#000000')
           .text('Status', statsTableLeft + 10, statsTableTop + 10)
           .text('Count', statsTableLeft + statsColWidth + 10, statsTableTop + 10)
           .text('Percentage', statsTableLeft + (statsColWidth * 2) + 10, statsTableTop + 10);

        // Draw header separator
        doc.moveTo(statsTableLeft, statsTableTop + statsRowHeight)
           .lineTo(statsTableLeft + 450, statsTableTop + statsRowHeight)
           .stroke();

        // Table rows
        Object.entries(overallStatusCounts).forEach(([status, count], index) => {
            const y = statsTableTop + (statsRowHeight * (index + 1));
            const percentage = allMilestones.length > 0 ? (count / allMilestones.length) * 100 : 0;
            
            // Draw row separator
            doc.moveTo(statsTableLeft, y)
               .lineTo(statsTableLeft + 450, y)
               .stroke();

            doc.text(status, statsTableLeft + 10, y + 10)
               .text(count.toString(), statsTableLeft + statsColWidth + 10, y + 10)
               .text(`${percentage.toFixed(1)}%`, statsTableLeft + (statsColWidth * 2) + 10, y + 10);
        });

        doc.moveDown(3);

        // Add project details
        doc.fontSize(18)
           .text('Project Details', 50, doc.y, { width: 495, align: 'center' })
           .moveDown(2);

        // For each project
        for (const project of projectData) {
            try {
                // Add project title with background
                doc.rect(50, doc.y, 495, 30)
                   .fill('#f0f0f0');
                
                doc.fontSize(16)
                   .fillColor('#000000')
                   .text(project.title, 60, doc.y + 10)
                   .moveDown(2);

                // Add project team section
                doc.fontSize(14)
                   .text('Project Team:', 60, doc.y, { underline: true })
                   .moveDown(0.5);

                // Create table for project team
                const teamTableTop = doc.y;
                const teamTableLeft = 60;
                const teamColWidth = 150;
                const teamRowHeight = 30;

                // Check if we need a new page for the team table
                if (doc.y > 700) {
                    doc.addPage();
                    doc.fontSize(14)
                       .text('Project Team:', 60, doc.y, { underline: true })
                       .moveDown(0.5);
                    teamTableTop = doc.y;
                }

                // Draw table border
                doc.rect(teamTableLeft, teamTableTop, 475, teamRowHeight * (project.collaborators.length + 2))
                   .stroke('#cccccc');

                // Table headers
                doc.fontSize(12)
                   .fillColor('#000000')
                   .text('Role', teamTableLeft + 10, teamTableTop + 10)
                   .text('Name', teamTableLeft + teamColWidth + 10, teamTableTop + 10);

                // Draw header separator
                doc.moveTo(teamTableLeft, teamTableTop + teamRowHeight)
                   .lineTo(teamTableLeft + 475, teamTableTop + teamRowHeight)
                   .stroke();

                // Add owner row
                const ownerY = teamTableTop + teamRowHeight;
                doc.moveTo(teamTableLeft, ownerY)
                   .lineTo(teamTableLeft + 475, ownerY)
                   .stroke();
                doc.text('Owner', teamTableLeft + 10, ownerY + 10)
                   .text(`${project.owner.first_name} ${project.owner.last_name}`, teamTableLeft + teamColWidth + 10, ownerY + 10);

                // Add collaborator rows with page break handling
                let currentY = ownerY + teamRowHeight;
                project.collaborators.forEach((collab, index) => {
                    // Check if we need a new page
                    if (currentY > 700) {
                        doc.addPage();
                        // Redraw headers on new page
                        doc.fontSize(14)
                           .text('Project Team:', 60, doc.y, { underline: true })
                           .moveDown(0.5);
                        doc.fontSize(12)
                           .fillColor('#000000')
                           .text('Role', teamTableLeft + 10, doc.y + 10)
                           .text('Name', teamTableLeft + teamColWidth + 10, doc.y + 10);
                        doc.moveTo(teamTableLeft, doc.y + 30)
                           .lineTo(teamTableLeft + 475, doc.y + 30)
                           .stroke();
                        currentY = doc.y + 30;
                    }

                    doc.moveTo(teamTableLeft, currentY)
                       .lineTo(teamTableLeft + 475, currentY)
                       .stroke();
                    doc.text('Collaborator', teamTableLeft + 10, currentY + 10)
                       .text(`${collab.first_name} ${collab.last_name}`, teamTableLeft + teamColWidth + 10, currentY + 10);
                    currentY += teamRowHeight;
                });

                doc.moveDown(2);

                // Add milestones section
                doc.fontSize(14)
                   .text('Milestones:', 60, doc.y, { underline: true })
                   .moveDown(1);

                if (project.milestones && project.milestones.length > 0) {
                    // Table setup for milestones
                    const tableTop = doc.y;
                    const tableLeft = 60;
                    const colWidth = 95; // 475/5 columns
                    const rowHeight = 30;
                    const headers = ['Title', 'Status', 'Description', 'Expected Date', 'Assigned To'];

                    // Check if we need a new page for the milestones table
                    if (doc.y > 700) {
                        doc.addPage();
                        doc.fontSize(14)
                           .text('Milestones:', 60, doc.y, { underline: true })
                           .moveDown(1);
                    }

                    // Draw table headers
                    doc.fontSize(12)
                       .fillColor('#000000');
                    
                    // Draw all headers on the same line
                    const headerY = doc.y;
                    headers.forEach((header, i) => {
                        doc.text(header, tableLeft + (colWidth * i), headerY);
                    });

                    // Draw header underline
                    doc.moveTo(tableLeft, headerY + 20)
                       .lineTo(tableLeft + 475, headerY + 20)
                       .stroke();

                    // Process each milestone
                    let currentMilestoneY = headerY + 30;
                    for (const milestone of project.milestones) {
                        try {
                            // Check if we need a new page
                            if (currentMilestoneY > 700) {
                                doc.addPage();
                                // Redraw headers on new page
                                doc.fontSize(14)
                                   .text('Milestones:', 60, doc.y, { underline: true })
                                   .moveDown(1);
                                doc.fontSize(12)
                                   .fillColor('#000000');
                                
                                // Draw all headers on the same line
                                const newHeaderY = doc.y;
                                headers.forEach((header, i) => {
                                    doc.text(header, tableLeft + (colWidth * i), newHeaderY);
                                });
                                doc.moveTo(tableLeft, newHeaderY + 20)
                                   .lineTo(tableLeft + 475, newHeaderY + 20)
                                   .stroke();
                                currentMilestoneY = newHeaderY + 30;
                            }

                            // Get assigned user name if exists
                            let assignedUserName = 'Not Assigned';
                            if (milestone.assigned_user_ID) {
                                const assignedUser = await db.executeQuery(
                                    `SELECT fname, sname FROM users WHERE user_ID = ?`,
                                    [milestone.assigned_user_ID]
                                );
                                if (assignedUser.length > 0) {
                                    assignedUserName = `${assignedUser[0].fname} ${assignedUser[0].sname}`;
                                }
                            }

                            // Format date if exists
                            let formattedDate = 'Not Set';
                            if (milestone.expected_completion_date) {
                                const date = new Date(milestone.expected_completion_date);
                                formattedDate = date.toLocaleDateString();
                            }

                            // Draw table row
                            doc.fontSize(10) // Smaller font for table content
                               .text(milestone.title, tableLeft, currentMilestoneY, { width: colWidth, align: 'left' })
                               .text(milestone.status || 'Not Started', tableLeft + colWidth, currentMilestoneY, { width: colWidth, align: 'left' })
                               .text(milestone.description || 'No Description', tableLeft + (colWidth * 2), currentMilestoneY, { width: colWidth, align: 'left' })
                               .text(formattedDate, tableLeft + (colWidth * 3), currentMilestoneY, { width: colWidth, align: 'left' })
                               .text(assignedUserName, tableLeft + (colWidth * 4), currentMilestoneY, { width: colWidth, align: 'left' });

                            // Draw row separator
                            doc.moveTo(tableLeft, currentMilestoneY + 20)
                               .lineTo(tableLeft + 475, currentMilestoneY + 20)
                               .stroke();

                            currentMilestoneY += rowHeight;
                            doc.moveDown(1);
                        } catch (error) {
                            console.error(`Error processing milestone ${milestone.milestone_ID}:`, error);
                            continue;
                        }
                    }
                } else {
                    doc.fontSize(12)
                       .fillColor('#000000')
                       .text('No milestones found for this project.', 60, doc.y)
                       .moveDown(2);
                }

                // Add page break between projects, but not after the last project
                if (project !== projectData[projectData.length - 1]) {
                    doc.addPage();
                }
            } catch (error) {
                console.error(`Error processing project ${project.title}:`, error);
                continue; // Skip this project and continue with others
            }
        }

        // Finalize the PDF
        doc.end();
    } catch (error) {
        console.error('Error generating PDF report:', error);
        
        // If headers haven't been sent yet, send error response
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Failed to generate report',
                details: error.message 
            });
        }
        
        // If PDF document was created, end it
        if (doc) {
            doc.end();
        }
    }
});

module.exports = router; 