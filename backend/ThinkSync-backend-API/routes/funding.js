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

// Helper for funding field validation
function validateFundingFields({ total_awarded, grant_status }) {
    if (total_awarded === undefined || total_awarded === null) {
        return 'total_awarded is required';
    }
    if (typeof total_awarded !== 'number' || total_awarded < 0) {
        return 'total_awarded must be a non-negative number';
    }
    const allowedStatuses = ['active', 'inactive', 'pending'];
    if (grant_status !== undefined && grant_status !== null && !allowedStatuses.includes(grant_status)) {
        return `grant_status must be one of: ${allowedStatuses.join(', ')}`;
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
        const { total_awarded, grant_status } = req.body;

        // Validate fields
        const validationError = validateFundingFields({ total_awarded, grant_status });
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
            `INSERT INTO funding (project_ID, total_awarded, grant_status) VALUES (?, ?, ?)`,
            [projectId, total_awarded, grant_status || 'active']
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
                const categories = await db.executeQuery(
                    `SELECT * FROM funding_categories WHERE funding_ID = ?`,
                    [project.funding.funding_ID]
                );
                project.categories = categories;
                project.funding_initialized = true;

                // Calculate total spent and remaining dynamically
                const totalSpent = categories.reduce((sum, cat) => sum + (cat.amount_spent || 0), 0);
                project.funding.amount_spent = totalSpent;
                project.funding.amount_remaining = project.funding.total_awarded - totalSpent;

                // Calculate percentage and remaining percentage
                project.funding.percentage = project.funding.total_awarded > 0 ? (totalSpent / project.funding.total_awarded) * 100 : 0;
                project.funding.remainingPercentage = 100 - project.funding.percentage;

                // Calculate percentage for each category
                project.categories = project.categories.map(cat => {
                    cat.percentage = project.funding.total_awarded > 0 ? (cat.amount_spent / project.funding.total_awarded) * 100 : 0;
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
        const { total_awarded, grant_status } = req.body;

        // Validate fields
        const validationError = validateFundingFields({ total_awarded, grant_status });
        if (validationError) return res.status(400).json({ error: validationError });

        const fundingArr = await db.executeQuery(
            `SELECT * FROM funding WHERE project_ID = ?`,
            [projectId]
        );
        if (!fundingArr.length) return res.status(404).json({ error: 'Funding not found' });
        const fundingId = fundingArr[0].funding_ID;
        await db.executeQuery(
            `UPDATE funding SET total_awarded=?, grant_status=? WHERE funding_ID=?`,
            [total_awarded, grant_status, fundingId]
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

// Get funding breakdown by category
router.get('/:projectId/categories', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        if (!(await checkResearcherRole(userId))) {
            return res.status(403).json({ error: 'Unauthorized: User is not a researcher' });
        }
        const { projectId } = req.params;
        const fundingArr = await db.executeQuery(
            `SELECT * FROM funding WHERE project_ID = ?`,
            [projectId]
        );
        if (!fundingArr.length) return res.status(404).json({ error: 'Funding not found' });
        const fundingId = fundingArr[0].funding_ID;
        const categories = await db.executeQuery(
            `SELECT * FROM funding_categories WHERE funding_ID = ?`,
            [fundingId]
        );
        res.json({ categories });
    } catch (error) {
        if (error.code && typeof error.code === 'string' && error.code.startsWith('ER_')) {
            res.status(500).json({ error: 'A server error occurred' });
        } else {
            res.status(401).json({ error: error.message || 'Failed to fetch funding categories' });
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
        const { category, description, amount_allocated, amount_spent } = req.body;

        // Validate required fields
        if (!category || typeof category !== 'string' || !category.trim()) {
            return res.status(400).json({ error: 'Category is required and must be a non-empty string' });
        }
        if (amount_allocated === undefined || amount_allocated === null) {
            return res.status(400).json({ error: 'amount_allocated is required' });
        }
        if (typeof amount_allocated !== 'number' || amount_allocated < 0) {
            return res.status(400).json({ error: 'amount_allocated must be a non-negative number' });
        }
        if (amount_spent !== undefined && amount_spent !== null) {
            if (typeof amount_spent !== 'number' || amount_spent < 0) {
                return res.status(400).json({ error: 'amount_spent must be a non-negative number' });
            }
        }

        const fundingArr = await db.executeQuery(
            `SELECT * FROM funding WHERE project_ID = ?`,
            [projectId]
        );
        if (!fundingArr.length) return res.status(404).json({ error: 'Funding not found' });
        const fundingId = fundingArr[0].funding_ID;
        const result = await db.executeQuery(
            `INSERT INTO funding_categories (funding_ID, category, description, amount_allocated, amount_spent)
             VALUES (?, ?, ?, ?, ?)`,
            [fundingId, category, description || null, amount_allocated, amount_spent || 0.00]
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
        const { category, description, amount_allocated, amount_spent } = req.body;

        // Validate required fields
        if (!category || typeof category !== 'string' || !category.trim()) {
            return res.status(400).json({ error: 'Category is required and must be a non-empty string' });
        }
        if (amount_allocated === undefined || amount_allocated === null) {
            return res.status(400).json({ error: 'amount_allocated is required' });
        }
        if (typeof amount_allocated !== 'number' || amount_allocated < 0) {
            return res.status(400).json({ error: 'amount_allocated must be a non-negative number' });
        }
        if (amount_spent !== undefined && amount_spent !== null) {
            if (typeof amount_spent !== 'number' || amount_spent < 0) {
                return res.status(400).json({ error: 'amount_spent must be a non-negative number' });
            }
        }

        const result = await db.executeQuery(
            `UPDATE funding_categories SET category=?, description=?, amount_allocated=?, amount_spent=? WHERE category_ID=?`,
            [category, description, amount_allocated, amount_spent, categoryId]
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

module.exports = router; 