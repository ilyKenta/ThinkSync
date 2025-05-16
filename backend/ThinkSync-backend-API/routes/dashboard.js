const express = require('express');
const router = express.Router();
const db = require('../db');
const { getUserIdFromToken, extractToken } = require('../utils/auth');

// Get all widgets for a user
router.get('/widgets', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        
        const widgets = await db.executeQuery(
            `SELECT * FROM dashboard_widgets WHERE user_ID = ? ORDER BY position_y, position_x`,
            [userId]
        );
        
        res.json({ widgets });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new widget
router.post('/widgets', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        const { widget_type, position_x, position_y, width, height } = req.body;

        // Validate widget type
        const validTypes = ['projects', 'milestones', 'funding'];
        if (!validTypes.includes(widget_type)) {
            return res.status(400).json({ error: 'Invalid widget type' });
        }

        const result = await db.executeQuery(
            `INSERT INTO dashboard_widgets (user_ID, widget_type, position_x, position_y, width, height)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, widget_type, position_x, position_y, width || 1, height || 1]
        );

        res.status(201).json({ 
            message: 'Widget added successfully',
            widget_ID: result.insertId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update widget position and size
router.put('/widgets/:widgetId', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        const { widgetId } = req.params;
        const { position_x, position_y, width, height } = req.body;

        const result = await db.executeQuery(
            `UPDATE dashboard_widgets 
             SET position_x = ?, position_y = ?, width = ?, height = ?
             WHERE widget_ID = ? AND user_ID = ?`,
            [position_x, position_y, width, height, widgetId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Widget not found' });
        }

        res.json({ message: 'Widget updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a widget
router.delete('/widgets/:widgetId', async (req, res) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        const { widgetId } = req.params;

        const result = await db.executeQuery(
            `DELETE FROM dashboard_widgets WHERE widget_ID = ? AND user_ID = ?`,
            [widgetId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Widget not found' });
        }

        res.json({ message: 'Widget deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 