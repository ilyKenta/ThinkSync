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
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use('/api/auth', authRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
