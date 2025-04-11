const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();
const axios = require("axios");


router.post('/microsoft', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: "Access token missing" });
    }

    try {
        const graphResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

        const userInfo = graphResponse.data;
        const { givenName, surname, id } = userInfo;

        if (!id || !givenName || !surname) {
            return res.status(400).json({ error: 'Incomplete user data from Microsoft' });
        }

        const userQuery = 'SELECT * FROM users WHERE user_ID = ?';
        db.execute(userQuery, [id], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database query failed' });
            }

            if (results.length === 0) {
                const insertQuery = 'INSERT INTO users (user_ID, fname, sname) VALUES (?, ?, ?)';
                db.execute(insertQuery, [id, givenName, surname], (err, results) => {
                    if (err) {
                        return res.status(500).json({ error: 'User registration failed' });
                    }
                    const token = jwt.sign({ id: id }, process.env.JWT_SECRET, { expiresIn: '1h' });
                    return res.status(201).json({ message: 'User registered successfully', token: token, user_ID: id});
                });
            } else {
                const token = jwt.sign({ id: id }, process.env.JWT_SECRET, { expiresIn: '1h' });
                return res.status(200).json({ message: 'User authenticated successfully' , token, user_ID: id});
            }
        });
    } catch (error) {
        return res.status(400).json({ error: 'Invalid Microsoft token' });
    }
});


const isValidUserPayload = (reqBody, includeResearchFields = false) => {
    const { user_ID, phone_number, department, acc_role, res_area, qualification, current_proj } = reqBody;
    if (!user_ID || typeof user_ID !== 'string') return false;
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

    if (!isValidUserPayload(req.body, true)) {
        return res.status(400).json({ error: 'Missing or invalid input fields for reviewer' });
    }

    const {user_ID, phone_number, department, acc_role, res_area, qualification, current_proj} = req.body;
    const role_name = 'reviewer';
    
    try {
        const userQuery = 'SELECT * FROM users WHERE user_ID = ?';
        db.execute(userQuery, [user_ID], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database query failed' });
            }
            if(results.length !== 0)
            {
                const user_query = 'UPDATE users set phone_number = ?, department = ?, acc_role = ? where user_ID = ?';
                db.execute(user_query, [phone_number, department, acc_role, user_ID], (err, results) => {
                    if (err) {
                        return res.status(400).json({ error: 'User credentials input failed' });
                    }
                });
        
        
                const reviewer_query = 'INSERT INTO reviewer (user_ID, res_area, qualification, current_proj) VALUES (?, ?, ?, ?)';
                db.execute(reviewer_query, [user_ID, res_area, qualification, current_proj], (err, results) => {
                    if (err) {
                        return res.status(400).json({ error: 'Reviewer credentials input failed' });
                    }
                });
        
        
                const roles_query = `
                INSERT INTO user_roles (user_ID, role_ID) 
                SELECT u.user_ID, r.role_ID 
                FROM users u, roles r 
                WHERE u.user_ID = ? AND r.role_name = ?
                `;
                db.execute(roles_query, [user_ID, role_name], (err, results) => {
                    if (err) {
                        return res.status(400).json({ error: 'Reviewer role assignment failed' });
                    }
                });
                return res.status(201).json({ message: 'All input successful' });
            }
            else
            {
                return res.status(400).json({ error: 'User does not exsist in database'});
            }
        });


    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});


router.post('/researcher', async (req, res) => {
    
    if (!isValidUserPayload(req.body, true)) {
        return res.status(400).json({ error: 'Missing or invalid input fields for researcher' });
    }
    
    const {user_ID, phone_number, department, acc_role, res_area, qualification, current_proj} = req.body;
    const role_name = 'researcher';

    try {
        const userQuery = 'SELECT * FROM users WHERE user_ID = ?';
        db.execute(userQuery, [user_ID], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database query failed' });
            }
            if(results.length !== 0)
            {
                const user_query = 'UPDATE users set phone_number = ?, department = ?, acc_role = ? where user_ID = ?';
                db.execute(user_query, [phone_number, department, acc_role, user_ID], (err, results) => {
                    if (err) {
                        return res.status(400).json({ error: 'User credentials input failed' });
                    }
                });


                const reviewer_query = 'INSERT INTO reviewer (user_ID, res_area, qualification, current_proj) VALUES (?, ?, ?, ?)';
                db.execute(reviewer_query, [user_ID, res_area, qualification, current_proj], (err, results) => {
                    if (err) {
                        return res.status(400).json({ error: 'Researcher credentials input failed' });
                    }
                });


                const roles_query = `
                INSERT INTO user_roles (user_ID, role_ID) 
                SELECT u.user_ID, r.role_ID 
                FROM users u, roles r 
                WHERE u.user_ID = ? AND r.role_name = ?
                `;
                db.execute(roles_query, [user_ID, role_name], (err, results) => {
                    if (err) {
                        return res.status(400).json({ error: 'Researcher role assignment failed' });
                    }
                });
                return res.status(201).json({ message: 'All input successful' });
            }
            else{
                return res.status(400).json({ error: 'User does not exsist in database'});
            }

        });

    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/register/admin', async (req, res) => {

    if (!isValidUserPayload(req.body, false)) {
        return res.status(400).json({ error: 'Missing or invalid input fields for admin' });
    }

    const {user_ID, phone_number, department, acc_role} = req.body;
    const role_name = 'admin';

    try {

        db.execute(userQuery, [user_ID], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database query failed' });
            }
            if(results.length !== 0)
            {
                const user_query = 'UPDATE users set phone_number = ?, department = ?, acc_role = ? where user_ID = ?';
                db.execute(user_query, [phone_number, department, acc_role, user_ID], (err, results) => {
                    if (err) {
                        return res.status(400).json({ error: 'User credentials input failed' });
                    }
                });


                const roles_query = `
                INSERT INTO user_roles (user_ID, role_ID) 
                SELECT u.user_ID, r.role_ID 
                FROM users u, roles r 
                WHERE u.user_ID = ? AND r.role_name = ?
                `;
                db.execute(roles_query, [user_ID, role_name], (err, results) => {
                    if (err) {
                        return res.status(400).json({ error: 'Researcher role assignment failed' });
                    }
                });
                return res.status(201).json({ message: 'All input successful' });
            }
            else
            {
                return res.status(400).json({ error: 'User does not exsist in database'});
            }

        });


        

    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;