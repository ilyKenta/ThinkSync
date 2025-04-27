const express = require('express');
const db = require('../db');
const router = express.Router();
const { getUserIdFromToken, validateToken} = require('../utils/auth');



router.post('/microsoft', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(401).json({ error: "Access token missing" });
    }

    try {
        const graphResponse = await validateToken(token);

        const { given_name, family_name, oid, upn } = graphResponse;

        if (!oid || !given_name || !family_name || !upn) {
            return res.status(400).json({ error: 'Incomplete user data from Microsoft' });
        }

        const validDomainPattern = /@[a-zA-Z0-9._%+-]+\.wits\.ac\.za$/i;
        if (!validDomainPattern.test(upn)) {
            return res.status(400).json({ error: 'Please sign up using a University of Witwatersrand email domain' });
        }

        const userQuery = 'SELECT * FROM users WHERE user_ID = ?';
        const results = await db.executeQuery(userQuery, [oid]);

        if (results.length === 0) {
            const insertQuery = 'INSERT INTO users (user_ID, fname, sname) VALUES (?, ?, ?)';
            await db.executeQuery(insertQuery, [oid, given_name, family_name]);
            return res.status(201).json({ message: 'User registered successfully'});
        }
        else {
            // Get user's role when logging in
            const roleQuery = `
                SELECT r.role_name 
                FROM roles r
                JOIN user_roles ur ON r.role_ID = ur.role_ID
                WHERE ur.user_ID = ?
            `;
            const roleResults = await db.executeQuery(roleQuery, [oid]);
            
            const response = {
                message: 'User authenticated successfully',
                role: roleResults.length > 0 ? roleResults[0].role_name : null
            };
            
            return res.status(200).json(response);
        }
    } catch (error) {
        console.error('Error in /microsoft route:', error);
        return res.status(400).json({ error: 'Invalid Microsoft token' });
    }
});

const isValidUserPayload = (reqBody, includeResearchFields = false) => {
    const {phone_number, department, acc_role, res_area, qualification, current_proj } = reqBody;
    if (!phone_number || typeof phone_number !== 'string') return false;
    if (!department || typeof department !== 'string') return false;
    if (!acc_role || typeof acc_role !== 'string') return false;

    if (includeResearchFields) {
        if (!res_area || typeof res_area !== 'string') return false;
        if (!qualification || typeof qualification !== 'string') return false;
        if (!current_proj || typeof current_proj !== 'string') return false;
    }

    return true;
};

router.post('/reviewer', async (req, res) => {
    const { token, phone_number, department, acc_role, res_area, qualification, current_proj } = req.body;
    const userData = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    if (!isValidUserPayload(userData, true)) {
        return res.status(400).json({ error: 'Missing or invalid input fields for reviewer' });
    }

    try {
        const user_ID = await getUserIdFromToken(token);
        const role_name = 'reviewer';

        const userQuery = 'SELECT * FROM users WHERE user_ID = ?';
        const results_userQuery = await db.executeQuery(userQuery, [user_ID]);
        
        if (results_userQuery.length !== 0) {
            const check_reviewer_query = 'SELECT * FROM reviewer WHERE user_ID = ?';
            const results_check_reviewer_query = await db.executeQuery(check_reviewer_query, [user_ID]);
            
            if (results_check_reviewer_query.length === 0) {
                const user_query = 'UPDATE users SET phone_number = ?, department = ?, acc_role = ? WHERE user_ID = ?';
                await db.executeQuery(user_query, [phone_number, department, acc_role, user_ID]);

                const reviewer_query = 'INSERT INTO reviewer (user_ID, res_area, qualification, current_proj) VALUES (?, ?, ?, ?)';
                await db.executeQuery(reviewer_query, [user_ID, res_area, qualification, current_proj]);

                const roles_query = `
                    INSERT INTO user_roles (user_ID, role_ID) 
                    SELECT u.user_ID, r.role_ID 
                    FROM users u, roles r 
                    WHERE u.user_ID = ? AND r.role_name = ?
                `;
                await db.executeQuery(roles_query, [user_ID, role_name]);

                return res.status(201).json({ message: 'All input successful' });
            } else {
                return res.status(400).json({ error: 'User already signed up as reviewer' });
            }
        } else {
            return res.status(400).json({ error: 'User does not exist in database' });
        }
    } catch (error) {
        console.error('Error in /reviewer route:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/researcher', async (req, res) => {
    const { token, phone_number, department, acc_role, res_area, qualification, current_proj } = req.body;
    const userData = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    if (!isValidUserPayload(userData, true)) {
        return res.status(400).json({ error: 'Missing or invalid input fields for researcher' });
    }

    try {
        const user_ID = await getUserIdFromToken(token);
        const role_name = 'researcher';

        const userQuery = 'SELECT * FROM users WHERE user_ID = ?';
        const results_userQuery = await db.executeQuery(userQuery, [user_ID]);
        
        if (results_userQuery.length !== 0) {
            const check_researcher_query = 'SELECT * FROM researcher WHERE user_ID = ?';
            const results_check_researcher_query = await db.executeQuery(check_researcher_query, [user_ID]);
            
            if (results_check_researcher_query.length === 0) {
                const user_query = 'UPDATE users SET phone_number = ?, department = ?, acc_role = ? WHERE user_ID = ?';
                await db.executeQuery(user_query, [phone_number, department, acc_role, user_ID]);

                const researcher_query = 'INSERT INTO researcher (user_ID, res_area, qualification, current_proj) VALUES (?, ?, ?, ?)';
                await db.executeQuery(researcher_query, [user_ID, res_area, qualification, current_proj]);

                const roles_query = `
                    INSERT INTO user_roles (user_ID, role_ID) 
                    SELECT u.user_ID, r.role_ID 
                    FROM users u, roles r 
                    WHERE u.user_ID = ? AND r.role_name = ?
                `;
                await db.executeQuery(roles_query, [user_ID, role_name]);

                return res.status(201).json({ message: 'All input successful' });
            } else {
                return res.status(400).json({ error: 'User already signed up as researcher' });
            }
        } else {
            return res.status(400).json({ error: 'User does not exist in database' });
        }
    } catch (error) {
        console.error('Error in /researcher route:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/admin', async (req, res) => {
    const { token, phone_number, department, acc_role } = req.body;
    const userData = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    if (!isValidUserPayload(userData)) {
        return res.status(400).json({ error: 'Missing or invalid input fields for admin' });
    }

    try {
        const user_ID = await getUserIdFromToken(token);
        const role_name = 'admin';

        const userQuery = 'SELECT * FROM users WHERE user_ID = ?';
        const results_userQuery = await db.executeQuery(userQuery, [user_ID]);
        
        if (results_userQuery.length !== 0) {
            const check_admin_query = `
                SELECT u.*
                FROM users u
                JOIN user_roles ur ON u.user_ID = ur.user_ID
                JOIN roles r ON ur.role_ID = r.role_ID
                WHERE u.user_ID = ? AND r.role_name = 'admin';
            `;
            const results_check_admin_query = await db.executeQuery(check_admin_query, [user_ID]);
            
            if (results_check_admin_query.length === 0) {
                const user_query = 'UPDATE users SET phone_number = ?, department = ?, acc_role = ? WHERE user_ID = ?';
                await db.executeQuery(user_query, [phone_number, department, acc_role, user_ID]);

                const roles_query = `
                    INSERT INTO user_roles (user_ID, role_ID) 
                    SELECT u.user_ID, r.role_ID 
                    FROM users u, roles r 
                    WHERE u.user_ID = ? AND r.role_name = ?
                `;
                await db.executeQuery(roles_query, [user_ID, role_name]);

                return res.status(201).json({ message: 'All input successful' });
            } else {
                return res.status(400).json({ error: 'User already enrolled as admin' });
            }
        } else {
            return res.status(400).json({ error: 'User does not exist in database' });
        }
    } catch (error) {
        console.error('Error in /admin route:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
module.exports.isValidUserPayload = isValidUserPayload;