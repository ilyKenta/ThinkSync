const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();
const axios = require("axios");

const executeQuery = (query, params) => {
    return new Promise((resolve, reject) => {
        db.execute(query, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

async function fetchUserIdFromGraph(token) {
    try {
        const graphResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const userInfo = graphResponse.data;
        return userInfo.id;
    } catch (error) {
        throw new Error('Failed to fetch user ID from Microsoft Graph');
    }
}

router.post('/microsoft', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(401).json({ error: "Access token missing" });
    }

    

    try {

        const graphResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

        const userInfo = graphResponse.data;
        const { givenName, surname, id , mail} = userInfo;

        if (!id || !givenName || !surname || !mail) {
            return res.status(400).json({ error: 'Incomplete user data from Microsoft' });
        }

        const validDomainPattern = /@[a-zA-Z0-9._%+-]+\.wits\.ac\.za$/i;
        if (!validDomainPattern.test(mail)) {
            return res.status(400).json({ error: 'Please sign up using a University of Witwatersrand email domain' });
        }

        const userQuery = 'SELECT * FROM users WHERE user_ID = ?';
        const results = await executeQuery(userQuery, [id]);

        if (results.length === 0) {
            const insertQuery = 'INSERT INTO users (user_ID, fname, sname) VALUES (?, ?, ?)';
            await executeQuery(insertQuery, [id, givenName, surname]);
            const token = jwt.sign({ id: id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            return res.status(201).json({ message: 'User registered successfully', token: token, user_ID: id});
        }
        else
        {
            const token = jwt.sign({ id: id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            return res.status(200).json({ message: 'User authenticated successfully' , token, user_ID: id});
        }
    } catch (error) {
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
        const user_ID = await fetchUserIdFromGraph(token);
        const role_name = 'reviewer';

        const userQuery = 'SELECT * FROM users WHERE user_ID = ?';
        const results_userQuery = await executeQuery(userQuery, [user_ID]);
        if (results_userQuery.length !== 0) {
            const check_reviewer_query = 'SELECT * FROM reviewer WHERE user_ID = ?';
            const results_check_reviewer_query = await executeQuery(check_reviewer_query, [user_ID]);
            if (results_check_reviewer_query.length === 0) {
                const user_query = 'UPDATE users SET phone_number = ?, department = ?, acc_role = ? WHERE user_ID = ?';
                await executeQuery(user_query, [phone_number, department, acc_role, user_ID]);

                const reviewer_query = 'INSERT INTO reviewer (user_ID, res_area, qualification, current_proj) VALUES (?, ?, ?, ?)';
                await executeQuery(reviewer_query, [user_ID, res_area, qualification, current_proj]);

                const roles_query = `
                    INSERT INTO user_roles (user_ID, role_ID) 
                    SELECT u.user_ID, r.role_ID 
                    FROM users u, roles r 
                    WHERE u.user_ID = ? AND r.role_name = ?
                `;
                await executeQuery(roles_query, [user_ID, role_name]);

                return res.status(201).json({ message: 'All input successful' });
            } else {
                return res.status(400).json({ error: 'User already signed up as reviewer' });
            }
        } else {
            return res.status(400).json({ error: 'User does not exist in database' });
        }
    } catch (error) {
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
        const user_ID = await fetchUserIdFromGraph(token);
        const role_name = 'researcher';

        const userQuery = 'SELECT * FROM users WHERE user_ID = ?';
        const results_userQuery = await executeQuery(userQuery, [user_ID]);
        if (results_userQuery.length !== 0) {
            const check_researcher_query = 'SELECT * FROM researcher WHERE user_ID = ?';
            const results_check_researcher_query = await executeQuery(check_researcher_query, [user_ID]);
            if (results_check_researcher_query.length === 0) {
                const user_query = 'UPDATE users SET phone_number = ?, department = ?, acc_role = ? WHERE user_ID = ?';
                await executeQuery(user_query, [phone_number, department, acc_role, user_ID]);

                const researcher_query = 'INSERT INTO researcher (user_ID, res_area, qualification, current_proj) VALUES (?, ?, ?, ?)';
                await executeQuery(researcher_query, [user_ID, res_area, qualification, current_proj]);

                const roles_query = `
                    INSERT INTO user_roles (user_ID, role_ID) 
                    SELECT u.user_ID, r.role_ID 
                    FROM users u, roles r 
                    WHERE u.user_ID = ? AND r.role_name = ?
                `;
                await executeQuery(roles_query, [user_ID, role_name]);

                return res.status(201).json({ message: 'All input successful' });
            } else {
                return res.status(400).json({ error: 'User already signed up as researcher' });
            }
        } else {
            return res.status(400).json({ error: 'User does not exist in database' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/admin', async (req, res) => {
    const { token, phone_number, department, acc_role} = req.body;
    const userData = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    if (!isValidUserPayload(userData)) {
        return res.status(400).json({ error: 'Missing or invalid input fields for admin' });
    }

    try {
        const user_ID = await fetchUserIdFromGraph(token);
        const role_name = 'admin';

        const userQuery = 'SELECT * FROM users WHERE user_ID = ?';
        const results_userQuery = await executeQuery(userQuery, [user_ID]);
        if (results_userQuery.length !== 0) {
            const check_admin_query = `
                SELECT u.*
                FROM users u
                JOIN user_roles ur ON u.user_ID = ur.user_ID
                JOIN roles r ON ur.role_ID = r.role_ID
                WHERE u.user_ID = ? AND r.role_name = 'admin';
            `;
            const results_check_admin_query = await executeQuery(check_admin_query, [user_ID]);
            if (results_check_admin_query.length === 0) {
                const user_query = 'UPDATE users SET phone_number = ?, department = ?, acc_role = ? WHERE user_ID = ?';
                await executeQuery(user_query, [phone_number, department, acc_role, user_ID]);

                const roles_query = `
                    INSERT INTO user_roles (user_ID, role_ID) 
                    SELECT u.user_ID, r.role_ID 
                    FROM users u, roles r 
                    WHERE u.user_ID = ? AND r.role_name = ?
                `;
                await executeQuery(roles_query, [user_ID, role_name]);

                return res.status(201).json({ message: 'All input successful' });
            } else {
                return res.status(400).json({ error: 'User already enrolled as admin' });
            }
        } else {
            return res.status(400).json({ error: 'User does not exist in database' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;