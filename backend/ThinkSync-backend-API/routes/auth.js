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
    const { phone_number, department, acc_role, res_area, qualification, current_proj } = req.body;
    try {
        const user_query = 'INSERT INTO users (phone_number, department, acc_role) VALUES (?, ?, ?)';
        db.execute(user_query, [phone_number, department, acc_role], (err, results) => {
            if (err) {
                return res.status(400).json({ error: 'User credentials input failed' });
            }
            res.status(201).json({ message: 'User credentials input successfully' });
        });
        const reviewer_query = 'INSERT INTO reviewer (res_area, qualification, current_proj) VALUES (?, ?, ?)';
        db.execute(reviewer_query, [res_area, qualification, current_proj], (err, results) => {
            if (err) {
                return res.status(400).json({ error: 'Reviewer credentials input failed' });
            }
            res.status(201).json({ message: 'Reviewer credentials input successfully' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/register/researcher/credentials', async (req, res) => {
    const { phone_number, department, acc_role, res_area, qualification, current_proj } = req.body;
    try {
        const user_query = 'INSERT INTO users (phone_number, department, acc_role) VALUES (?, ?, ?)';
        db.execute(user_query, [phone_number, department, acc_role], (err, results) => {
            if (err) {
                return res.status(400).json({ error: 'User credentials input failed' });
            }
            res.status(201).json({ message: 'User credentials input successfully' });
        });
        const reviewer_query = 'INSERT INTO researcher (res_area, qualification, current_proj) VALUES (?, ?, ?)';
        db.execute(reviewer_query, [res_area, qualification, current_proj], (err, results) => {
            if (err) {
                return res.status(400).json({ error: 'Researcher credentials input failed' });
            }
            res.status(201).json({ message: 'Researcher credentials input successfully' });
        });
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