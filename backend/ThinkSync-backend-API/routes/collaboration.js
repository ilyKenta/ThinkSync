const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios');

// Get user ID from Entra token
const getUserIdFromToken = async (token) => {
    if (!token) {
        throw new Error('Access token is required');
    }

    try {
        // const graphResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
        //     headers: {
        //         Authorization: `Bearer ${token}`
        //     }
        // });
        // return graphResponse.data.id;
        return '65fc38ee-5415-49f4-96ee-4a1643a69923';
    } catch (error) {
        throw new Error('Invalid token');
    }
};

// Search for potential collaborators
router.get('/search', async (req, res) => {
    try {
        const { searchTerm, searchType } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Access token is required' });
        }

        if (!searchTerm || !searchType) {
            return res.status(400).json({ error: 'Search term and type are required' });
        }

        let query;
        let params;

        switch (searchType) {
            case 'name':
                query = `
                    SELECT u.user_ID, u.fname, u.sname, u.department, u.acc_role, r.res_area, r.qualification
                    FROM users u
                    LEFT JOIN researcher r ON u.user_ID = r.user_ID
                    WHERE CONCAT(u.fname, ' ', u.sname) LIKE ?
                `;
                params = [`%${searchTerm}%`];
                break;
            case 'skill':
                query = `
                    SELECT DISTINCT u.user_ID, u.fname, u.sname, u.department, u.acc_role, r.res_area, r.qualification
                    FROM users u
                    LEFT JOIN researcher r ON u.user_ID = r.user_ID
                    WHERE r.res_area LIKE ? OR r.qualification LIKE ?
                `;
                params = [`%${searchTerm}%`, `%${searchTerm}%`];
                break;
            case 'position':
                query = `
                    SELECT u.user_ID, u.fname, u.sname, u.department, u.acc_role, r.res_area, r.qualification
                    FROM users u
                    LEFT JOIN researcher r ON u.user_ID = r.user_ID
                    WHERE u.acc_role LIKE ?
                `;
                params = [`%${searchTerm}%`];
                break;
            default:
                return res.status(400).json({ error: 'Invalid search type' });
        }

        const results = await db.executeQuery(query, params);
        res.status(200).json({ collaborators: results });
    } catch (error) {
        console.error('Error searching collaborators:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send invitation to collaborator
router.post('/invite', async (req, res) => {
    try {
        const { project_ID, recipient_ID, proposed_role } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Access token is required' });
        }

        const sender_ID = await getUserIdFromToken(token);

        // Validate inputs
        if (!project_ID || !recipient_ID || !proposed_role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if project exists and sender is owner
        const projectQuery = 'SELECT owner_ID FROM projects WHERE project_ID = ?';
        const [project] = await db.executeQuery(projectQuery, [project_ID]);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.owner_ID !== sender_ID) {
            return res.status(403).json({ error: 'Only project owner can send invitations' });
        }

        // Check if invitation already exists
        const checkQuery = `
            SELECT * FROM invitations 
            WHERE project_ID = ? AND recipient_ID = ? 
            AND status IN ('pending', 'accepted')
        `;
        const existingInvites = await db.executeQuery(checkQuery, [project_ID, recipient_ID]);

        if (existingInvites.length > 0) {
            return res.status(400).json({ error: 'Invitation already exists' });
        }

        // Insert invitation
        const insertQuery = `
            INSERT INTO invitations (project_ID, sender_ID, recipient_ID, proposed_role, status, sent_at)
            VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        `;
        await db.executeQuery(insertQuery, [project_ID, sender_ID, recipient_ID, proposed_role]);

        res.status(201).json({ message: 'Invitation sent successfully' });
    } catch (error) {
        console.error('Error sending invitation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get invitations received by user
router.get('/invitations/received', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Access token is required' });
        }

        const userId = await getUserIdFromToken(token);

        const query = `
            SELECT i.*, p.title as project_title, u.fname as sender_fname, u.sname as sender_sname,
                   CASE 
                       WHEN i.status = 'pending' AND TIMESTAMPDIFF(DAY, i.sent_at, CURRENT_TIMESTAMP) > 7 
                       THEN 'expired' 
                       ELSE i.status 
                   END as current_status
            FROM invitations i
            JOIN projects p ON i.project_ID = p.project_ID
            JOIN users u ON i.sender_ID = u.user_ID
            WHERE i.recipient_ID = ?
            ORDER BY i.sent_at DESC
        `;

        const invitations = await db.executeQuery(query, [userId]);

        // Update expired invitations in database
        const updateExpiredQuery = `
            UPDATE invitations 
            SET status = 'expired'
            WHERE recipient_ID = ? 
            AND status = 'pending'
            AND TIMESTAMPDIFF(DAY, sent_at, CURRENT_TIMESTAMP) > 7
        `;
        await db.executeQuery(updateExpiredQuery, [userId]);

        res.status(200).json({ invitations });
    } catch (error) {
        console.error('Error fetching received invitations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get invitations sent by project owner
router.get('/invitations/sent/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Access token is required' });
        }

        const userId = await getUserIdFromToken(token);

        // Verify project ownership
        const projectQuery = 'SELECT owner_ID FROM projects WHERE project_ID = ?';
        const [project] = await db.executeQuery(projectQuery, [projectId]);

        if (!project || project.owner_ID !== userId) {
            return res.status(403).json({ error: 'Unauthorized to view these invitations' });
        }

        const query = `
            SELECT i.*, u.fname as recipient_fname, u.sname as recipient_sname,
                   CASE 
                       WHEN i.status = 'pending' AND TIMESTAMPDIFF(DAY, i.sent_at, CURRENT_TIMESTAMP) > 7 
                       THEN 'expired' 
                       ELSE i.status 
                   END as current_status
            FROM invitations i
            JOIN users u ON i.recipient_ID = u.user_ID
            WHERE i.project_ID = ?
            ORDER BY i.sent_at DESC
        `;

        const invitations = await db.executeQuery(query, [projectId]);

        // Update expired invitations
        const updateExpiredQuery = `
            UPDATE invitations 
            SET status = 'expired'
            WHERE project_ID = ? 
            AND status = 'pending'
            AND TIMESTAMPDIFF(DAY, sent_at, CURRENT_TIMESTAMP) > 7
        `;
        await db.executeQuery(updateExpiredQuery, [projectId]);

        res.status(200).json({ invitations });
    } catch (error) {
        console.error('Error fetching sent invitations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update invitation status
router.put('/invitation/:invitationId', async (req, res) => {
    try {
        const { invitationId } = req.params;
        const { status } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Access token is required' });
        }

        const userId = await getUserIdFromToken(token);

        if (!['accepted', 'declined', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Get invitation details
        const inviteQuery = 'SELECT * FROM invitations WHERE invitation_ID = ?';
        const [invitation] = await db.executeQuery(inviteQuery, [invitationId]);

        if (!invitation) {
            return res.status(404).json({ error: 'Invitation not found' });
        }

        // Verify user is authorized to update status
        if (status === 'cancelled' && invitation.sender_ID !== userId) {
            return res.status(403).json({ error: 'Only sender can cancel invitation' });
        }

        if (['accepted', 'declined'].includes(status) && invitation.recipient_ID !== userId) {
            return res.status(403).json({ error: 'Only recipient can accept/decline invitation' });
        }

        if (invitation.status !== 'pending') {
            return res.status(400).json({ error: 'Can only update pending invitations' });
        }

        // Update invitation status
        await db.executeQuery(
            'UPDATE invitations SET status = ? WHERE invitation_ID = ?',
            [status, invitationId]
        );

        // If accepted, add to project_collaborations
        if (status === 'accepted') {
            await db.executeQuery(
                'INSERT INTO project_collaborations (project_ID, user_ID, role) VALUES (?, ?, ?)',
                [invitation.project_ID, invitation.recipient_ID, invitation.proposed_role]
            );
        }

        res.status(200).json({ message: 'Invitation updated successfully' });
    } catch (error) {
        console.error('Error updating invitation:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
