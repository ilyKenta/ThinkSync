const express = require('express');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const db = require('./db');



dotenv.config();

const app = express();
app.use(express.json());



app.use('/api/auth', authRoutes);
const PORT = 3000 || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));