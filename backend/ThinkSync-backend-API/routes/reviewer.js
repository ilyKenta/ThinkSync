const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios');

// Helper function to get user ID from Microsoft Entra token
async function getUserIdFromToken(token) {
        // if (!token) {
    //     throw new Error('Access token is required');
    // }

    // try {
    //     const graphResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
    //         headers: {
    //             Authorization: `Bearer ${token}`
    //         }
    //     });
    //     return graphResponse.data.id;
    // } catch (error) {
    //     throw new Error('Invalid token');
    // }
    return '65fc38ee-5415-49f4-96ee-4a1643a69923';
}

// Helper function to extract token from Authorization header
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided');
    }
    return authHeader.split(' ')[1];
}

// Middleware to verify reviewer role
const isReviewer = async (req, res, next) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        // Check user role in user_roles and roles tables
        const result = await db.executeQuery(
            `SELECT r.role_name FROM user_roles ur JOIN roles r ON ur.role_ID = r.role_ID WHERE ur.user_ID = ?`,
            [userId]
        );
        if (result.length !== 0 && result.role_name === 'reviewer') {
            return res.status(403).json({ error: 'Unauthorized: User is not a reviewer' });
        }
        req.userId = userId;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
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
    const { comments, recommendation } = req.body;
    // Validate input
    if (!comments || !recommendation) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!['approved', 'rejected', 'revised'].includes(recommendation)) {
        return res.status(400).json({ error: 'Invalid recommendation' });
    }
    try {
        // Check if the reviewer is assigned to this project
        const assignment = await db.executeQuery(
            'SELECT * FROM review_assignments WHERE project_ID = ? AND reviewer_ID = ?',
            [projectId, req.userId]
        );
        if (!assignment) {
            return res.status(403).json({ error: 'Project not assigned to this reviewer' });
        }
        // Insert review
        await db.executeQuery(
            `INSERT INTO reviews (project_ID, reviewer_ID, feedback, outcome, reviewed_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [projectId, req.userId, comments, recommendation]
        );
        res.json({ message: 'Review submitted successfully' });
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

module.exports = router; 