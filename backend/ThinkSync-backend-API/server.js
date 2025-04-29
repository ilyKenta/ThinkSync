const express = require("express");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const projRoutes = require("./routes/project");
const collabRoutes = require("./routes/collaboration");
const adminRoutes = require("./routes/admin");
const reviewerRoutes = require("./routes/reviewer");
const messageRoutes = require("./routes/messages");
const db = require("./db");
const cors = require("cors");
const helmet = require("helmet");

dotenv.config();

const app = express();
app.use(express.json());

app.use(helmet());

// Configure CORS
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:5500',
        'https://purple-field-0bb305703.6.azurestaticapps.net',
        '*'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

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
app.use('/api/admin', adminRoutes);
app.use('/api/reviewer', reviewerRoutes);
app.use('/api/messages', messageRoutes);

// Use environment variable for port
const PORT = process.env.PORT || 5000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Health check available at: /health`);
    });
}

module.exports = app;
