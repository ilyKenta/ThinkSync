const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (email, password) VALUES (?, ?)';
        db.execute(query, [email, hashedPassword], (err, results) => {
            if (err) {
                return res.status(400).json({ error: 'User registration failed' });
            }
            res.status(201).json({ message: 'User registered successfully' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/register/reviewer/credentials', async (req, res) => {
    const {user_ID, phone_number, department, acc_role, res_area, qualification, current_proj, fname, sname} = req.body;
    const role_name = 'reviewer';
    
    try {
        const user_query = 'UPDATE users set phone_number = ?, department = ?, acc_role = ?, fname = ?, sname = ? where user_ID = ?';
        db.execute(user_query, [phone_number, department, acc_role, fname, sname, user_ID], (err, results) => {
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
        res.status(201).json({ message: 'All input successful' });

    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});


router.post('/register/researcher/credentials', async (req, res) => {
    const {user_ID, phone_number, department, acc_role, res_area, qualification, current_proj, fname, sname} = req.body;
    const role_name = 'researcher';

    try {
        const user_query = 'UPDATE users set phone_number = ?, department = ?, acc_role = ?, fname = ?, sname = ? where user_ID = ?';
        db.execute(user_query, [phone_number, department, acc_role, fname, sname, user_ID], (err, results) => {
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
        res.status(201).json({ message: 'All input successful' });

    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ?';
    db.execute(query, [email], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    });
});

module.exports = router;