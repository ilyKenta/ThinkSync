const express = require('express');
const router = express.Router();
const db = require('../db');
const { getUserIdFromToken, extractToken } = require('../utils/auth');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        
        const adminCheckQuery = `
            SELECT r.role_name 
            FROM roles r
            JOIN user_roles ur ON r.role_ID = ur.role_ID
            WHERE ur.user_ID = ? AND r.role_name = 'admin'
        `;
        const results = await db.executeQuery(adminCheckQuery, [userId]);
        
        if (results.length === 0) {
            return res.status(403).json({ error: 'Unauthorized: User is not an admin' });
        }
        next();
    } catch (error) {
        console.error('Error in admin middleware:', error);
        if (error.message === 'Access token is required' || 
            error.message === 'Invalid token format' || 
            error.message === 'Token invalid' ||
            error.message === 'Token has expired') {
            return res.status(401).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Server error' });
    }
};

// Get all users with their roles
router.get('/users', isAdmin, async (req, res) => {
    try {
        const usersQuery = `
            SELECT 
                u.user_ID,
                u.fname,
                u.sname,
                u.phone_number,
                u.department,
                u.acc_role,
                GROUP_CONCAT(DISTINCT r.role_name ORDER BY r.role_name SEPARATOR ', ') as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.user_ID = ur.user_ID
            LEFT JOIN roles r ON ur.role_ID = r.role_ID
            GROUP BY u.user_ID, u.fname, u.sname, u.phone_number, u.department, u.acc_role
        `;
        const users = await db.executeQuery(usersQuery);
        return res.status(200).json({users: users});
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Update user role
router.put('/users/:userId/role', isAdmin, async (req, res) => {
    const { userId } = req.params;
    const { newRole } = req.body;

    if (!newRole) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const token = extractToken(req);
        const adminId = await getUserIdFromToken(token);

        if (userId === adminId) {
            return res.status(400).json({ error: 'Admin cannot change their own role' });
        }

        const validRoles = ['researcher', 'reviewer', 'admin'];
        if (!validRoles.includes(newRole)) {
            return res.status(400).json({ error: 'Invalid role specified' });
        }

        // Get current role
        const currentRoleQuery = `
            SELECT r.role_name 
            FROM roles r
            JOIN user_roles ur ON r.role_ID = ur.role_ID
            WHERE ur.user_ID = ?
        `;
        //const currentRoles = await db.executeQuery(currentRoleQuery, [userId]);

        // Remove all current roles
        const removeRolesQuery = 'DELETE FROM user_roles WHERE user_ID = ?';
        await db.executeQuery(removeRolesQuery, [userId]);

        // If user was a researcher, delete their projects
        // if (currentRoles.some(role => role.role_name === 'researcher')) {
        //     const deleteProjectsQuery = 'DELETE FROM projects WHERE owner_ID = ?';
        //     await db.executeQuery(deleteProjectsQuery, [userId]);
        // }

        // If user was a reviewer, delete their reviews and assignments
        // if (currentRoles.some(role => role.role_name === 'reviewer')) {
        //     const deleteReviewsQuery = 'DELETE FROM reviews WHERE reviewer_ID = ?';
        //     const deleteAssignmentsQuery = 'DELETE FROM review_assignments WHERE reviewer_ID = ?';
        //     await db.executeQuery(deleteReviewsQuery, [userId]);
        //     await db.executeQuery(deleteAssignmentsQuery, [userId]);
        // }

        // Add new role
        const addRoleQuery = `
            INSERT INTO user_roles (user_ID, role_ID)
            SELECT ?, r.role_ID
            FROM roles r
            WHERE r.role_name = ?
        `;
        await db.executeQuery(addRoleQuery, [userId, newRole]);

        return res.status(200).json({ message: 'User role updated successfully' });
    } catch (error) {
        console.error('Error updating user role:', error);
        if (error.message === 'Access token is required' || 
            error.message === 'Invalid authorization format' || 
            error.message === 'Invalid token') {
            return res.status(401).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Server error' });
    }
});

// Get pending projects without reviewers
router.get('/projects/pending', isAdmin, async (req, res) => {
    try {
        const pendingProjectsQuery = `
            SELECT 
                p.*,
                u.fname as researcher_fname,
                u.sname as researcher_sname
            FROM projects p
            JOIN users u ON p.owner_ID = u.user_ID
            LEFT JOIN review_assignments ra ON p.project_ID = ra.project_ID
            WHERE p.review_status = 'pending'
            AND ra.assignment_ID IS NULL
        `;
        const projects = await db.executeQuery(pendingProjectsQuery);
        return res.status(200).json({projects: projects});
    } catch (error) {
        console.error('Error fetching pending projects:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Search reviewers by research area
router.get('/reviewers/search', isAdmin, async (req, res) => {
    const { research_area } = req.query;

    if (!research_area) {
        return res.status(400).json({ error: 'Research area is required' });
    }

    try {
        const reviewersQuery = `
            SELECT 
                u.user_ID,
                u.fname,
                u.sname,
                u.department,
                u.acc_role,
                r.qualification
            FROM users u
            JOIN reviewer r ON u.user_ID = r.user_ID
            WHERE r.res_area LIKE CONCAT('%', ?, '%')
        `;
        const reviewers = await db.executeQuery(reviewersQuery, [research_area]);
        
        // Map the results to match the expected format
        const formattedReviewers = reviewers.map(reviewer => ({
            user_ID: reviewer.user_ID,
            fname: reviewer.fname,
            sname: reviewer.sname,
            department: reviewer.department,
            acc_role: reviewer.acc_role,
            qualification: reviewer.qualification || null
        }));

        return res.status(200).json({ reviewers: formattedReviewers });
    } catch (error) {
        console.error('Error searching reviewers:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Assign reviewer to project
router.post('/projects/:projectId/assign-reviewer', isAdmin, async (req, res) => {
    const { projectId } = req.params;
    const { reviewerId } = req.body;

    if (!reviewerId) {
        return res.status(400).json({ error: 'Reviewer ID is required' });
    }

    try {
        // Check if project exists and is pending
        const projectCheckQuery = `
            SELECT project_ID 
            FROM projects 
            WHERE project_ID = ? AND review_status = 'pending'
        `;
        const project = await db.executeQuery(projectCheckQuery, [projectId]);
        
        if (project.length === 0) {
            return res.status(404).json({ error: 'Project not found or not pending review' });
        }

        // Check if reviewer exists and is a reviewer
        const reviewerCheckQuery = `
            SELECT r.role_name 
            FROM roles r
            JOIN user_roles ur ON r.role_ID = ur.role_ID
            WHERE ur.user_ID = ? AND r.role_name = 'reviewer'
        `;
        const reviewer = await db.executeQuery(reviewerCheckQuery, [reviewerId]);
        
        if (reviewer.length === 0) {
            return res.status(404).json({ error: 'Reviewer not found or not a valid reviewer' });
        }

        // Check if reviewer is already assigned
        const assignmentCheckQuery = `
            SELECT assignment_ID 
            FROM review_assignments 
            WHERE project_ID = ? AND reviewer_ID = ?
        `;
        const existingAssignment = await db.executeQuery(assignmentCheckQuery, [projectId, reviewerId]);
        
        if (existingAssignment.length > 0) {
            return res.status(400).json({ error: 'Reviewer is already assigned to this project' });
        }

        // Assign reviewer
        const assignReviewerQuery = `
            INSERT INTO review_assignments (project_ID, reviewer_ID)
            VALUES (?, ?)
        `;
        await db.executeQuery(assignReviewerQuery, [projectId, reviewerId]);

        return res.status(201).json({ message: 'Reviewer assigned successfully' });
    } catch (error) {
        console.error('Error assigning reviewer:', error);
        if (error.message === 'Access token is required' || 
            error.message === 'Invalid authorization format' || 
            error.message === 'Invalid token') {
            return res.status(401).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 