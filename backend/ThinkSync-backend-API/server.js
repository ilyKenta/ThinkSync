const express = require("express");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
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
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

// Use environment variable for port
const PORT = process.env.PORT || 5000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Health check available at: /health`);
    });
}

module.exports = app;
