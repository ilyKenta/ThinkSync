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

// Helper for funding field validation
function validateFundingFields({ total_awarded, grant_status, grant_end_date }) {
    if (total_awarded === undefined || total_awarded === null) {
        return 'total_awarded is required';
    }
    if (typeof total_awarded !== 'number' || total_awarded < 0) {
        return 'total_awarded must be a non-negative number';
    }
    const allowedStatuses = ['active', 'completed', 'expired', 'cancelled'];
    if (grant_status !== undefined && grant_status !== null && !allowedStatuses.includes(grant_status)) {
        return `grant_status must be one of: ${allowedStatuses.join(', ')}`;
    }
    if (grant_end_date !== undefined && grant_end_date !== null && grant_end_date !== '') {
        // Validate YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(grant_end_date)) {
            return 'grant_end_date must be in YYYY-MM-DD format or null';
        }
        // Optionally, check if it's a valid date
        const d = new Date(grant_end_date);
        if (isNaN(d.getTime())) {
            return 'grant_end_date must be a valid date';
        }
    }
    return null;
}

// Initialize funding for a project
router.post('/:projectId', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }
        const { projectId } = req.params;
        const { total_awarded, grant_status, grant_end_date } = req.body;

        // Validate fields
        const validationError = validateFundingFields({ total_awarded, grant_status, grant_end_date });
        if (validationError) return res.status(400).json({ error: validationError });

        // Check if project has funding available
        const projectCheck = await db.executeQuery(
            `SELECT funding_available FROM projects WHERE project_ID = ?`,
            [projectId]
        );
        if (!projectCheck.length || projectCheck[0].funding_available <= 0) {
            return res.status(400).json({ error: 'Project does not have funding available' });
        }

        // Check if funding already exists
        const fundingArr = await db.executeQuery(
            `SELECT * FROM funding WHERE project_ID = ?`,
            [projectId]
        );
        if (fundingArr.length) {
            return res.status(400).json({ error: 'Funding already initialized for this project' });
        }
        // Insert funding
        const result = await db.executeQuery(
            `INSERT INTO funding (project_ID, total_awarded, grant_status, grant_end_date) VALUES (?, ?, ?, ?)`,
            [projectId, total_awarded, grant_status || 'active', grant_end_date || null]
        );
        res.status(201).json({ message: 'Funding initialized', funding_ID: result.insertId });
    } catch (error) {
        if (error.code && typeof error.code === 'string' && error.code.startsWith('ER_')) {
            res.status(500).json({ error: 'A server error occurred' });
        } else {
            res.status(401).json({ error: error.message || 'Failed to initialize funding' });
        }
    }
});

// Get funding summary for all projects (including categories)
router.get('/', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }

        // Get all projects for this user that have funding available
        const projects = await db.executeQuery(
            `SELECT project_ID, title, description FROM projects WHERE owner_ID = ? AND funding_available IS NOT NULL AND funding_available > 0`,
            [userId]
        );

        for (const project of projects) {
            const fundingArr = await db.executeQuery(
                `SELECT * FROM funding WHERE project_ID = ?`,
                [project.project_ID]
            );
            if (fundingArr.length) {
                project.funding = fundingArr[0];
                // Ensure grant_end_date is always present (even if null)
                if (!('grant_end_date' in project.funding)) project.funding.grant_end_date = null;
                const categories = await db.executeQuery(
                    `SELECT * FROM funding_categories WHERE funding_ID = ?`,
                    [project.funding.funding_ID]
                );
                project.categories = categories;
                project.funding_initialized = true;

                // Convert total_awarded to number
                project.funding.total_awarded = parseFloat(project.funding.total_awarded) || 0;

                // Calculate total spent and remaining dynamically
                const totalSpent = categories.reduce((sum, cat) => sum + (parseFloat(cat.amount_spent) || 0), 0);
                project.funding.amount_spent = parseFloat(totalSpent.toFixed(2));
                project.funding.amount_remaining = parseFloat((project.funding.total_awarded - totalSpent).toFixed(2));

                // Calculate percentage and remaining percentage
                project.funding.percentage = project.funding.total_awarded > 0 
                    ? parseFloat(((totalSpent / project.funding.total_awarded) * 100).toFixed(2))
                    : 0;
                project.funding.remainingPercentage = parseFloat((100 - project.funding.percentage).toFixed(2));

                // Calculate percentage for each category
                project.categories = project.categories.map(cat => {
                    // Convert amount_spent and amount_allocated to numbers
                    cat.amount_spent = parseFloat(cat.amount_spent) || 0;
                    
                    // Calculate percentage
                    cat.percentage = project.funding.total_awarded > 0 
                        ? parseFloat(((cat.amount_spent / project.funding.total_awarded) * 100).toFixed(2))
                        : 0;
                    return cat;
                });
            } else {
                project.funding = null;
                project.categories = [];
                project.funding_initialized = false;
            }
        }

        res.json({ projects });
    } catch (error) {
        if (error.code && typeof error.code === 'string' && error.code.startsWith('ER_')) {
            res.status(500).json({ error: 'A server error occurred' });
        } else {
            res.status(401).json({ error: error.message || 'Failed to fetch funding' });
        }
    }
});

// Update funding details for a project
router.put('/:projectId', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }
        const { projectId } = req.params;
        const { total_awarded, grant_status, grant_end_date } = req.body;

        // Validate fields
        const validationError = validateFundingFields({ total_awarded, grant_status, grant_end_date });
        if (validationError) return res.status(400).json({ error: validationError });

        const fundingArr = await db.executeQuery(
            `SELECT * FROM funding WHERE project_ID = ?`,
            [projectId]
        );
        if (!fundingArr.length) return res.status(404).json({ error: 'Funding not found' });
        const fundingId = fundingArr[0].funding_ID;
        await db.executeQuery(
            `UPDATE funding SET total_awarded=?, grant_status=?, grant_end_date=? WHERE funding_ID=?`,
            [total_awarded, grant_status, grant_end_date || null, fundingId]
        );
        res.json({ message: 'Funding updated' });
    } catch (error) {
        if (error.code && typeof error.code === 'string' && error.code.startsWith('ER_')) {
            res.status(500).json({ error: 'A server error occurred' });
        } else {
            res.status(401).json({ error: error.message || 'Failed to update funding' });
        }
    }
});

// Add a new funding category
router.post('/:projectId/categories', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
 
       if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }
        const { projectId } = req.params;
        const { category, description, amount_spent } = req.body;

        // Validate required fields
        if (!category || typeof category !== 'string' || !category.trim()) {
            return res.status(400).json({ error: 'Category is required and must be a non-empty string' });
        }
        if (amount_spent === undefined || amount_spent === null) {
            return res.status(400).json({ error: 'amount_spent is required' });
        }
        if (typeof amount_spent !== 'number' || amount_spent < 0) {
            return res.status(400).json({ error: 'amount_spent must be a non-negative number' });
        }

        const fundingArr = await db.executeQuery(
            `SELECT * FROM funding WHERE project_ID = ?`,
            [projectId]
        );
        if (!fundingArr.length) return res.status(404).json({ error: 'Funding not found' });
        const fundingId = fundingArr[0].funding_ID;
        const result = await db.executeQuery(
            `INSERT INTO funding_categories (funding_ID, category, description, amount_spent)
             VALUES (?, ?, ?, ?)`,
            [fundingId, category, description || null, amount_spent || 0.00]
        );
        res.status(201).json({ message: 'Funding category created', category_ID: result.insertId });
    } catch (error) {
        if (error.code && typeof error.code === 'string' && error.code.startsWith('ER_')) {
            res.status(500).json({ error: 'A server error occurred' });
        } else {
            res.status(401).json({ error: error.message || 'Failed to create funding category' });
        }
    }
});

// Update a funding category
router.put('/:projectId/categories/:categoryId', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }
        const { categoryId } = req.params;
        const { category, description, amount_spent } = req.body;

        // Validate required fields
        if (!category || typeof category !== 'string' || !category.trim()) {
            return res.status(400).json({ error: 'Category is required and must be a non-empty string' });
        }
        if (amount_spent === undefined || amount_spent === null) {
            return res.status(400).json({ error: 'amount_spent is required' });
        }
        if (typeof amount_spent !== 'number' || amount_spent < 0) {
            return res.status(400).json({ error: 'amount_spent must be a non-negative number' });
        }

        const result = await db.executeQuery(
            `UPDATE funding_categories SET category=?, description=?, amount_spent=? WHERE category_ID=?`,
            [category, description, amount_spent, categoryId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Funding category not found' });
        res.json({ message: 'Funding category updated' });
    } catch (error) {
        if (error.code && typeof error.code === 'string' && error.code.startsWith('ER_')) {
            res.status(500).json({ error: 'A server error occurred' });
        } else {
            res.status(401).json({ error: error.message || 'Failed to update funding category' });
        }
    }
});

// Delete a funding category
router.delete('/:projectId/categories/:categoryId', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }
        const { categoryId } = req.params;
        const result = await db.executeQuery(
            `DELETE FROM funding_categories WHERE category_ID = ?`,
            [categoryId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Funding category not found' });
        res.json({ message: 'Funding category deleted' });
    } catch (error) {
        if (error.code && typeof error.code === 'string' && error.code.startsWith('ER_')) {
            res.status(500).json({ error: 'A server error occurred' });
        } else {
            res.status(401).json({ error: error.message || 'Failed to delete funding category' });
        }
    }
});

// Generate PDF report of all projects and their funding details
router.get('/report', async (req, res) => {
    let doc = null;
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }

        // Get all projects for this user that have funding
        const projects = await db.executeQuery(
            `SELECT p.project_ID, p.title, p.description, f.funding_ID, f.total_awarded, f.grant_status
             FROM projects p
             LEFT JOIN funding f ON p.project_ID = f.project_ID
             WHERE p.owner_ID = ? AND f.funding_ID IS NOT NULL`,
            [userId]
        );

        // Create a new PDF document
        doc = new PDFDocument({
            size: 'A4',
            margin: 50
        });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=funding-report.pdf');
        
        // Pipe the PDF to the response
        doc.pipe(res);

        // Add title
        doc.fontSize(24)
           .text('Project Funding Report', { align: 'center' })
           .moveDown(2);

        // For each project
        for (const project of projects) {
            try {
                // Add project title with background
                doc.rect(50, doc.y, 495, 30)
                   .fill('#f0f0f0');
                
                doc.fontSize(16)
                   .fillColor('#000000')
                   .text(project.title, 60, doc.y + 10)
                   .moveDown(2);

                // Get funding categories
                const categories = await db.executeQuery(
                    `SELECT * FROM funding_categories WHERE funding_ID = ?`,
                    [project.funding_ID]
                );

                // Calculate total spent and remaining
                const totalSpent = categories.reduce((sum, cat) => sum + (parseFloat(cat.amount_spent) || 0), 0);
                const amountRemaining = parseFloat(project.total_awarded) - totalSpent;
                const percentageSpent = (totalSpent / parseFloat(project.total_awarded)) * 100;

                // Add funding summary
                doc.fontSize(14)
                   .text('Funding Summary:', 60, doc.y, { underline: true })
                   .moveDown(0.5);

                // Create summary table
                const summaryTableTop = doc.y;
                const summaryTableLeft = 60;
                const summaryColWidth = 150;
                const summaryRowHeight = 30;

                // Draw table border
                doc.rect(summaryTableLeft, summaryTableTop, 475, summaryRowHeight * 4)
                   .stroke('#cccccc');

                // Table headers
                doc.fontSize(12)
                   .fillColor('#000000')
                   .text('Metric', summaryTableLeft + 10, summaryTableTop + 10)
                   .text('Amount', summaryTableLeft + summaryColWidth + 10, summaryTableTop + 10)
                   .text('Percentage', summaryTableLeft + (summaryColWidth * 2) + 10, summaryTableTop + 10);

                // Draw header separator
                doc.moveTo(summaryTableLeft, summaryTableTop + summaryRowHeight)
                   .lineTo(summaryTableLeft + 475, summaryTableTop + summaryRowHeight)
                   .stroke();

                // Add summary rows
                const summaryData = [
                    { label: 'Total Awarded', value: parseFloat(project.total_awarded), showPercentage: false },
                    { label: 'Total Spent', value: totalSpent, percentage: percentageSpent },
                    { label: 'Amount Remaining', value: amountRemaining, percentage: 100 - percentageSpent }
                ];

                summaryData.forEach((row, index) => {
                    const y = summaryTableTop + (summaryRowHeight * (index + 1));
                    doc.moveTo(summaryTableLeft, y)
                       .lineTo(summaryTableLeft + 475, y)
                       .stroke();

                    doc.text(row.label, summaryTableLeft + 10, y + 10)
                       .text(`R${Number(row.value).toFixed(2)}`, summaryTableLeft + summaryColWidth + 10, y + 10);
                    
                    // Only show percentage for rows that should have it
                    if (row.showPercentage !== false) {
                        doc.text(`${Number(row.percentage).toFixed(1)}%`, summaryTableLeft + (summaryColWidth * 2) + 10, y + 10);
                    }
                });

                doc.moveDown(2);

                // Aggregate amount_spent by normalized category
                const normalizeCategory = (catVal) => {
                    const lower = (catVal || '').trim().toLowerCase();
                    if (lower === 'personnel') return 'Personnel';
                    if (lower === 'equipment') return 'Equipment';
                    if (lower === 'consumables') return 'Consumables';
                    return 'Other';
                };
                const categoryTotals = {};
                categories.forEach(cat => {
                    const normalized = normalizeCategory(cat.category);
                    if (!categoryTotals[normalized]) categoryTotals[normalized] = 0;
                    categoryTotals[normalized] += parseFloat(cat.amount_spent) || 0;
                });
                // Prepare data for pie chart
                const chartData = Object.entries(categoryTotals).map(([label, value]) => ({ label, value }));
                // Add remaining amount as a slice
                chartData.push({ label: 'Remaining', value: amountRemaining });

                // Create pie chart for category breakdown
                try {
                    const width = 800;  // Increased from 400
                    const height = 800; // Increased from 400
                    const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
                        width, 
                        height,
                        backgroundColour: 'white',
                        type: 'png',
                        plugins: {
                            modern: ['chartjs-plugin-datalabels']
                        },
                        fonts: {
                            family: 'Arial',
                            size: 24,
                            weight: 'bold'
                        }
                    });

                    const configuration = {
                        type: 'pie',
                        data: {
                            labels: chartData.map(d => d.label),
                            datasets: [{
                                data: chartData.map(d => d.value),
                                backgroundColor: [
                                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                                    '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                                    '#8AC249'  // Green color for remaining amount
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
                                        family: 'DejaVu Sans' || 'sans-serif',
                                        weight: 'bold',
                                        size: 24
                                    },
                                    formatter: (value, ctx) => {
                                        const total = ctx.dataset.data.reduce((acc, data) => acc + data, 0);
                                        const percentage = Math.round((value * 100) / total);
                                        return `${percentage}%`;
                                    }
                                },
                                title: {
                                    display: true,
                                    text: 'Funding Category Breakdown',
                                    font: {
                                        family: 'DejaVu Sans' || 'sans-serif',
                                        size: 36,
                                        weight: 'bold'
                                    },
                                    padding: 40,
                                    color: '#333333'
                                },
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        font: {
                                            family: 'DejaVu Sans' || 'sans-serif',
                                            size: 24,
                                            weight: 'bold'
                                        },
                                        padding: 30,
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
                    
                    // Always add a new page for category details
                    doc.addPage();

                    // Add category details
                    doc.fontSize(14)
                       .text('Category Details:', 60, doc.y, { underline: true })
                       .moveDown(0.5);

                    // Create category table
                    let categoryTableTop = doc.y;
                    const categoryTableLeft = 60;
                    const categoryColWidth = 475 / 3; // 475 is the total table width, 3 columns
                    const categoryRowHeight = 30;
                    const headers = ['Category', 'Description', 'Spent'];

                    // Draw table headers
                    doc.fontSize(12)
                       .fillColor('#000000');
                    
                    // Draw all headers on the same line
                    const headerY = categoryTableTop;
                    headers.forEach((header, i) => {
                        doc.text(header, categoryTableLeft + (categoryColWidth * i), headerY);
                    });

                    // Draw header underline
                    doc.moveTo(categoryTableLeft, headerY + 20)
                       .lineTo(categoryTableLeft + 475, headerY + 20)
                       .stroke();

                    // Process each category
                    let currentY = headerY + 30;
                    for (const category of categories) {
                        // Check if we need a new page
                        if (currentY > 700) {
                            doc.addPage();
                            // Redraw headers on new page
                            doc.fontSize(12)
                               .fillColor('#000000');
                            
                            // Draw all headers on the same line
                            const newHeaderY = doc.y;
                            headers.forEach((header, i) => {
                                doc.text(header, categoryTableLeft + (categoryColWidth * i), newHeaderY);
                            });
                            doc.moveTo(categoryTableLeft, newHeaderY + 20)
                               .lineTo(categoryTableLeft + 475, newHeaderY + 20)
                               .stroke();
                            currentY = newHeaderY + 30;
                        }

                        const spent = parseFloat(category.amount_spent) || 0;

                        // Draw table row
                        doc.fontSize(10)
                           .text(category.category, categoryTableLeft, currentY, { width: categoryColWidth, align: 'left' })
                           .text(category.description || 'No Description', categoryTableLeft + categoryColWidth, currentY, { width: categoryColWidth, align: 'left' })
                           .text(`R${spent.toFixed(2)}`, categoryTableLeft + (categoryColWidth * 2), currentY, { width: categoryColWidth, align: 'left' });

                        // Draw row separator
                        doc.moveTo(categoryTableLeft, currentY + 20)
                           .lineTo(categoryTableLeft + 475, currentY + 20)
                           .stroke();

                        currentY += categoryRowHeight;
                    }

                    // Add page break between projects, but not after the last project
                    if (project !== projects[projects.length - 1]) {
                        doc.addPage();
                        // Reset position for next project
                        doc.y = 50; // Reset to top margin
                    }
                } catch (error) {
                    console.error('Error generating chart:', error);
                    doc.fontSize(14)
                       .text('Error generating chart. Please try again.', { align: 'center' })
                       .moveDown();
                }
            } catch (error) {
                console.error(`Error processing project ${project.title}:`, error);
                continue;
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

// Delete funding for a project (and all its categories)
router.delete('/:projectId', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }
        const { projectId } = req.params;

        // Get funding ID
        const fundingArr = await db.executeQuery(
            `SELECT funding_ID FROM funding WHERE project_ID = ?`,
            [projectId]
        );
        if (!fundingArr.length) return res.status(404).json({ error: 'Funding not found' });
        const fundingId = fundingArr[0].funding_ID;

        // Delete funding categories
        await db.executeQuery(
            `DELETE FROM funding_categories WHERE funding_ID = ?`,
            [fundingId]
        );

        // Delete funding
        await db.executeQuery(
            `DELETE FROM funding WHERE funding_ID = ?`,
            [fundingId]
        );

        res.json({ message: 'Funding deleted' });
    } catch (error) {
        if (error.code && typeof error.code === 'string' && error.code.startsWith('ER_')) {
            res.status(500).json({ error: 'A server error occurred' });
        } else {
            res.status(401).json({ error: error.message || 'Failed to delete funding' });
        }
    }
});

module.exports = router;