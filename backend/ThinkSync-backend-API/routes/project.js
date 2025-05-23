const express = require('express');
const router = express.Router();
const db = require('../db');
const { getUserIdFromToken, extractToken } = require('../utils/auth');

// Validate project payload
const isValidProjectPayload = (projectData) => {
    const { title, description, goals, research_areas, start_date, end_date, funding_available } = projectData;
    
    if (!title || typeof title !== 'string' || title.length > 255) return false;
    if (!description || typeof description !== 'string') return false;
    if (!goals || typeof goals !== 'string') return false;
    if (!research_areas || typeof research_areas !== 'string') return false;
    
    // Validate MySQL DATE format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!start_date || !dateRegex.test(start_date)) return false;
    if (!end_date || !dateRegex.test(end_date)) return false;
    
    // Validate dates are in correct order
    if (new Date(start_date) >= new Date(end_date)) return false;
    
    if (typeof funding_available !== 'boolean') return false;

    return true;
};

// Validate project requirements payload
const isValidRequirementsPayload = (requirements) => {
    if (!Array.isArray(requirements)) return false;
    
    return requirements.every(req => {
        const { skill_required, experience_level, role, technical_requirements } = req;
        
        if (!skill_required || typeof skill_required !== 'string' || skill_required.length > 255) return false;
        if (!experience_level || !['beginner', 'intermediate', 'professional'].includes(experience_level.toLowerCase())) return false;
        if (!role || typeof role !== 'string' || role.length > 100) return false;
        if (!technical_requirements || typeof technical_requirements !== 'string') return false;

        return true;
    });
};

// Create new project with requirements
router.post('/create', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);

        const projectData = req.body.project;
        const requirementsData = req.body.requirements;

        if (!projectData || !requirementsData) {
            return res.status(400).json({ error: 'Missing project or requirements data' });
        }

        if (!isValidProjectPayload(projectData)) {
            return res.status(400).json({ error: 'Invalid project data' });
        }

        if (!isValidRequirementsPayload(requirementsData)) {
            return res.status(400).json({ error: 'Invalid requirements data' });
        }

        const { title, description, goals, research_areas, start_date, end_date, funding_available } = projectData;

        // Insert project
        const projectResult = await db.executeQuery(
            'INSERT INTO projects (owner_ID, title, description, goals, research_areas, start_date, end_date, funding_available, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [userId, title, description, goals, research_areas, start_date, end_date, funding_available]
        );

        const projectId = projectResult.insertId;

        // Insert requirements
        for (const req of requirementsData) {
            await db.executeQuery(
                'INSERT INTO project_requirements (project_ID, skill_required, experience_level, role, technical_requirements) VALUES (?, ?, ?, ?, ?)',
                [projectId, req.skill_required, req.experience_level.toLowerCase(), req.role, req.technical_requirements]
            );
        }

        res.status(201).json({ message: 'Project created successfully', project_ID: projectId });
    } catch (error) {
        console.error('Error creating project:', error);
        if (error.message === 'Access token is required' || 
            error.message === 'Invalid token format' || 
            error.message === 'Token invalid' ||
            error.message === 'Token has expired') {
            return res.status(401).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all projects for an owner, including collaborators and reviews
router.get('/owner', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);

        // Fetch projects and requirements
        const projects = await db.executeQuery(`
            SELECT p.*, pr.requirement_ID, pr.skill_required, pr.experience_level, pr.role, pr.technical_requirements
            FROM projects p
            LEFT JOIN project_requirements pr ON p.project_ID = pr.project_ID
            WHERE p.owner_ID = ?
            ORDER BY p.created_at DESC
        `, [userId]);

        // Fetch collaborators for all projects
        const collaborators = await db.executeQuery(`
            SELECT pc.project_ID, u.user_ID, u.fname, u.sname, u.department, u.acc_role, pc.role, pc.joined_at
            FROM project_collaborations pc
            JOIN users u ON pc.user_ID = u.user_ID
            WHERE pc.project_ID IN (
                SELECT project_ID FROM projects WHERE owner_ID = ?
            )
        `, [userId]);

        // Fetch reviews for all projects
        const reviews = await db.executeQuery(`
            SELECT r.project_ID, r.review_ID, r.reviewer_ID, r.feedback, r.outcome, r.reviewed_at
            FROM reviews r
            WHERE r.project_ID IN (
                SELECT project_ID FROM projects WHERE owner_ID = ?
            )
        `, [userId]);

        // Group requirements, collaborators, and reviews by project
        const groupedProjects = projects.reduce((acc, row) => {
            if (!acc[row.project_ID]) {
                acc[row.project_ID] = {
                    project_ID: row.project_ID,
                    owner_ID: row.owner_ID,
                    title: row.title,
                    description: row.description,
                    goals: row.goals,
                    research_areas: row.research_areas,
                    start_date: row.start_date,
                    end_date: row.end_date,
                    funding_available: row.funding_available,
                    created_at: row.created_at,
                    review_status: row.review_status,
                    requirements: [],
                    collaborators: [],
                    reviews: []
                };
            }
            if (row.requirement_ID) {
                acc[row.project_ID].requirements.push({
                    requirement_ID: row.requirement_ID,
                    skill_required: row.skill_required,
                    experience_level: row.experience_level,
                    role: row.role,
                    technical_requirements: row.technical_requirements
                });
            }
            return acc;
        }, {});

        // Add collaborators to each project
        collaborators.forEach(collab => {
            if (groupedProjects[collab.project_ID]) {
                groupedProjects[collab.project_ID].collaborators.push({
                    user_ID: collab.user_ID,
                    fname: collab.fname,
                    sname: collab.sname,
                    department: collab.department,
                    acc_role: collab.acc_role,
                    role: collab.role,
                    joined: collab.joined
                });
            }
        });

        // Add reviews to each project
        reviews.forEach(review => {
            if (groupedProjects[review.project_ID]) {
                groupedProjects[review.project_ID].reviews.push({
                    review_ID: review.review_ID,
                    reviewer_ID: review.reviewer_ID,
                    feedback: review.feedback,
                    outcome: review.outcome,
                    reviewed_at: review.reviewed_at
                });
            }
        });

        res.status(200).json({ projects: Object.values(groupedProjects) });
    } catch (error) {
        console.error('Error fetching projects:', error);
        if (error.message === 'Access token is required' || 
            error.message === 'Invalid token format' || 
            error.message === 'Token invalid' ||
            error.message === 'Token has expired') {
            return res.status(401).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update project
router.put('/update/:projectId', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);

        const projectData = req.body.project;
        const requirementsData = req.body.requirements;

        if (!projectData || !requirementsData) {
            return res.status(400).json({ error: 'Missing project or requirements data' });
        }

        if (!isValidProjectPayload(projectData)) {
            return res.status(400).json({ error: 'Invalid project data' });
        }

        if (!isValidRequirementsPayload(requirementsData)) {
            return res.status(400).json({ error: 'Invalid requirements data' });
        }

        const projectId = req.params.projectId;
        const { title, description, goals, research_areas, start_date, end_date, funding_available } = projectData;

        // Check project ownership
        const [project] = await db.executeQuery(
            'SELECT owner_ID FROM projects WHERE project_ID = ?',
            [projectId]
        );

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.owner_ID !== userId) {
            return res.status(403).json({ error: 'Unauthorized to update this project' });
        }

        // Update project
        await db.executeQuery(
            'UPDATE projects SET title = ?, description = ?, goals = ?, research_areas = ?, start_date = ?, end_date = ?, funding_available = ? WHERE project_ID = ?',
            [title, description, goals, research_areas, start_date, end_date, funding_available, projectId]
        );

        // Delete existing requirements
        await db.executeQuery(
            'DELETE FROM project_requirements WHERE project_ID = ?',
            [projectId]
        );

        // Insert new requirements
        for (const req of requirementsData) {
            await db.executeQuery(
                'INSERT INTO project_requirements (project_ID, skill_required, experience_level, role, technical_requirements) VALUES (?, ?, ?, ?, ?)',
                [projectId, req.skill_required, req.experience_level.toLowerCase(), req.role, req.technical_requirements]
            );
        }

        res.status(200).json({ message: 'Project updated successfully' });
    } catch (error) {
        console.error('Error updating project:', error);
        if (error.message === 'Access token is required' || 
            error.message === 'Invalid token format' || 
            error.message === 'Token invalid' ||
            error.message === 'Token has expired') {
            return res.status(401).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete project
router.delete('/delete/:projectId', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);

        

        const projectId = req.params.projectId;

        // Check project ownership
        const [project] = await db.executeQuery(
            'SELECT owner_ID FROM projects WHERE project_ID = ?',
            [projectId]
        );

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.owner_ID !== userId) {
            return res.status(403).json({ error: 'Unauthorized to delete this project' });
        }

        // Delete project
        await db.executeQuery(
            'DELETE FROM projects WHERE project_ID = ?',
            [projectId]
        );

        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        if (error.message === 'Access token is required' || 
            error.message === 'Invalid token format' || 
            error.message === 'Token invalid' ||
            error.message === 'Token has expired') {
            return res.status(401).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get projects where user is a collaborator
router.get('/collaborator', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);

        // Query to get projects where user is a collaborator
        const query = `
            SELECT p.*, pc.role as collaborator_role
            FROM projects p
            JOIN project_collaborations pc ON p.project_ID = pc.project_ID
            WHERE pc.user_ID = ?
            ORDER BY p.created_at DESC
        `;

        const results = await db.executeQuery(query, [userId]);
        
        if (!results || results.length === 0) {
            return res.status(200).json({ projects: [] });
        }

        // For each project, get its requirements
        const projectsWithRequirements = await Promise.all(
            results.map(async (project) => {
                const requirementsQuery = `
                    SELECT * FROM project_requirements
                    WHERE project_ID = ?
                `;
                const requirements = await db.executeQuery(requirementsQuery, [project.project_ID]);
                return {
                    ...project,
                    requirements: requirements || []
                };
            })
        );

        res.status(200).json({ projects: projectsWithRequirements });
    } catch (error) {
        console.error('Error fetching collaborator projects:', error);
        if (error.message === 'Access token is required' || 
            error.message === 'Invalid token format' || 
            error.message === 'Token invalid' ||
            error.message === 'Token has expired') {
            return res.status(401).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
