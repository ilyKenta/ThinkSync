const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

let connection;

async function connect() {
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: {
                rejectUnauthorized: true
            }
        });
        console.log('Connected to MySQL database');
        return connection;
    } catch (err) {
        console.error('Database connection failed:', err);
        throw err;
    }
}

async function connectWithRetry(retries = 5, delay = 5000) {
    try {
        return await connect();
    } catch (err) {
        if (retries === 0) {
            console.log('Max retries reached. Giving up.');
            throw err;
        }
        console.log(`Retrying in ${delay / 1000} seconds... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return connectWithRetry(retries - 1, delay);
    }
}

async function executeQuery(sql, params = []) {
    if (!connection) {
        await connectWithRetry();
    }
    try {
        const [results] = await connection.execute(sql, params);
        return results;
    } catch (err) {
        console.error('Query execution failed:', err);
        throw err;
    }
}

module.exports = {
    connect,
    connectWithRetry,
    executeQuery // Export connection for testing
};