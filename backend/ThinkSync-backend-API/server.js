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

app.use(cors({
    origin: process.env.CORS_ORIGIN
}));

app.use('/api/auth', authRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
