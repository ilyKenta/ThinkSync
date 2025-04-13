const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

var db = mysql.createConnection(
    {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        ssl: {
            rejectUnauthorized: true
        }
    }
);



function connectWithRetry(retries = 5, delay = 5000) {
    db.connect((err) => {
        if (err) {
            console.error('Database connection failed:', err.stack);
            if (retries === 0) {
                console.error('Max retries reached. Giving up.');
                return;
            }
            console.log(`Retrying in ${delay / 1000} seconds... (${retries} retries left)`);
            setTimeout(() => connectWithRetry(retries - 1, delay), delay);
        } else {
            console.log('Connected to MySQL database');
        }
    });
}
connectWithRetry();

module.exports = db;