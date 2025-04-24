const express = require("express");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const projRoutes = require("./routes/project");
const collabRoutes = require("./routes/collaboration");
const db = require("./db");
const cors = require("cors");
const helmet = require("helmet");

dotenv.config();

const app = express();
app.use(express.json());

app.use(helmet());

// Configure CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbHealth = await db.checkDatabaseHealth();
        const healthStatus = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: dbHealth ? 'healthy' : 'unhealthy'
        };

        // Return 503 if database is unhealthy, 200 if everything is OK
        res.status(dbHealth ? 200 : 503).json(healthStatus);
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            database: 'unhealthy',
            error: 'Health check failed'
        });
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projRoutes);
app.use('/api/collaborations', collabRoutes);

// Use environment variable for port
const PORT = process.env.PORT || 5000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Health check available at: /health`);
    });
}

module.exports = app;
