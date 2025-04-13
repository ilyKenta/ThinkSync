const express = require("express");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth");
const db = require("./db");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(express.json());

app.use(cors({
    origin: 'http://localhost:3000'
}));

app.use('/api/auth', authRoutes);
const PORT = 5000 || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
