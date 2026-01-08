const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST, 
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, // Use the one you set
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306, // <--- IMPORTANT: Uses env var or defaults to 3306
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Check connection immediately on startup (Optional but good for debugging)
pool.getConnection()
    .then(conn => {
        console.log(`✅ Database Connected to ${process.env.DB_HOST}:${process.env.DB_PORT}`);
        conn.release();
    })
    .catch(err => {
        console.error('❌ Database Connection Failed:', err.message);
    });

module.exports = pool;