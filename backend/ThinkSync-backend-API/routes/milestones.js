const express = require('express');
const router = express.Router();
const db = require('../db');
const { getUserIdFromToken, extractToken } = require('../utils/auth');

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
            `SELECT project_ID, title FROM projects WHERE owner_ID = ?`,
            [userId]
        );
        // For each project, get its milestones
        for (const project of projects) {
            const milestones = await db.executeQuery(
                `SELECT * FROM milestones WHERE project_ID = ? ORDER BY expected_completion_date ASC`,
                [project.project_ID]
            );
            project.milestones = milestones;
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
                `SELECT owner_ID FROM projects WHERE project_ID = ? AND owner_ID = ?
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
router.get('/:projectId/:milestoneId', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }
        const { milestoneId } = req.params;
        const milestones = await db.executeQuery(
            `SELECT * FROM milestones WHERE milestone_ID = ?`,
            [milestoneId]
        );
        if (!milestones.length) return res.status(404).json({ error: 'Milestone not found' });
        res.json({ milestone: milestones[0] });
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
                `SELECT user_ID FROM projects WHERE project_ID = ? AND owner_ID = ?
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

module.exports = router; 