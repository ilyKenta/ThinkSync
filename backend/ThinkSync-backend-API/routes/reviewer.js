const express = require('express');
const router = express.Router();
const db = require('../db');
const { getUserIdFromToken, extractToken } = require('../utils/auth');

// Middleware to verify reviewer role
const isReviewer = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) {
            return res.status(401).json({ error: 'Authentication failed' });
        }
        const userId = await getUserIdFromToken(token);
        // Check user role in user_roles and roles tables
        const result = await db.executeQuery(
            `SELECT r.role_name FROM user_roles ur JOIN roles r ON ur.role_ID = r.role_ID WHERE ur.user_ID = ?`,
            [userId]
        );
        if (result.length === 0 || result[0].role_name !== 'reviewer') {
            return res.status(403).json({ error: 'Unauthorized: User is not a reviewer' });
        }
        req.userId = userId;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        if (error.message === 'Access token is required' || 
            error.message === 'Invalid token format' || 
            error.message === 'Token invalid' ||
            error.message === 'Token has expired') {
            return res.status(401).json({ error: error.message });
        }
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// GET: All proposals assigned to the reviewer
router.get('/proposals', isReviewer, async (req, res) => {
    try {
        const proposals = await db.executeQuery(
            `SELECT 
                p.project_ID,
                p.title,
                p.description,
                p.goals,
                p.start_date,
                p.end_date,
                p.funding_available,
                pr.skill_required,
                pr.experience_level,
                pr.role AS requirement_role,
                pr.technical_requirements,
                u.user_ID AS researcher_ID,
                u.fname AS researcher_fname,
                u.sname AS researcher_sname,
                ra.assignment_ID,
                ra.Assigned_at
            FROM review_assignments ra
            JOIN projects p ON ra.project_ID = p.project_ID
            JOIN users u ON p.owner_ID = u.user_ID
            LEFT JOIN project_requirements pr ON p.project_ID = pr.project_ID
            WHERE ra.reviewer_ID = ?`,
            [req.userId]
        );
        res.json({proposals: proposals});
    } catch (error) {
        console.error('Error fetching proposals:', error);
        res.status(500).json({ error: 'Failed to fetch proposals' });
    }
});

// POST: Submit a review for a proposal
router.post('/proposals/:projectId/review', isReviewer, async (req, res) => {
    const { projectId } = req.params;
    const { feedback, outcome } = req.body;
    // Validate input
    if (!feedback || !outcome) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!['approved', 'rejected', 'revise'].includes(outcome)) {
        return res.status(400).json({ error: 'Invalid outcome' });
    }
    try {
        // Check if the reviewer is assigned to this project
        const assignment = await db.executeQuery(
            'SELECT * FROM review_assignments WHERE project_ID = ? AND reviewer_ID = ?',
            [projectId, req.userId]
        );
        if (!assignment || assignment.length === 0) {
            return res.status(403).json({ error: 'Project not assigned to this reviewer' });
        }
        // Insert review
        await db.executeQuery(
            `INSERT INTO reviews (project_ID, reviewer_ID, feedback, outcome, reviewed_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [projectId, req.userId, feedback, outcome]
        );
        res.json({ message: 'Review submitted successfully' });
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

// GET: Get review status for a specific project
router.get('/proposals/:projectId/review', isReviewer, async (req, res) => {
    const { projectId } = req.params;
    try {
        const review = await db.executeQuery(
            `SELECT 
                r.outcome
            FROM reviews r
            JOIN users u ON r.reviewer_ID = u.user_ID
            WHERE r.project_ID = ?
            ORDER BY r.reviewed_at DESC
            LIMIT 1`,
            [projectId]
        );

        if (!review || review.length === 0) {
            return res.json({ review: null });
        }

        res.json({ review: review[0] });
    } catch (error) {
        console.error('Error fetching review:', error);
        res.status(500).json({ error: 'Failed to fetch review' });
    }
});

module.exports = router; 