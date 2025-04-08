const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

var db = mysql.createConnection(
    {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.PORT,
        ssl: {
            rejectUnauthorized: true
        }
    }
);



db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL database');
});

module.exports = db;