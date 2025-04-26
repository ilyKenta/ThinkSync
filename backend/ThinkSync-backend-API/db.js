const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Create a connection pool with retry logic
const createPoolWithRetry = async (maxRetries = 5, delay = 1000) => {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const pool = mysql.createPool({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                port: process.env.DB_PORT,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                ssl: {
                    rejectUnauthorized: true
                }
            });

            // Test the connection
            const connection = await pool.getConnection();
            connection.release();
            console.log('Successfully connected to the database');
            return pool;
        } catch (err) {
            retries++;
            console.error(`Database connection attempt ${retries} failed:`, err);
            if (retries === maxRetries) {
                throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
            }
            console.log(`Retrying in ${delay/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// Initialize the pool
let pool;
createPoolWithRetry()
    .then(createdPool => {
        pool = createdPool;
    })
    .catch(err => {
        console.error('Failed to initialize database pool:', err);
        process.exit(1); // Exit if we can't connect to the database
    });

async function executeQuery(sql, params = []) {
    if (!pool) {
        throw new Error('Database pool not initialized');
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const results = await connection.execute(sql, params);
        return results[0];
    } catch (err) {
        console.error('Query execution failed:', err);
        
        // Handle specific database errors
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed. Attempting to reconnect...');
            try {
                pool = await createPoolWithRetry();
                // Retry the query once after reconnection
                connection = await pool.getConnection();
                const results = await connection.execute(sql, params);
                return results[0];
            } catch (retryErr) {
                throw new Error('Failed to reconnect to database');
            }
        }
        
        // Handle other database errors
        if (err.code === 'ER_CON_COUNT_ERROR') {
            throw new Error('Too many database connections');
        }
        if (err.code === 'ECONNREFUSED') {
            throw new Error('Database server is not running');
        }
        
        throw err;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// Health check function
async function checkDatabaseHealth() {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        return true;
    } catch (err) {
        console.error('Database health check failed:', err);
        return false;
    }
}

module.exports = {
    executeQuery,
    pool,
    checkDatabaseHealth
};