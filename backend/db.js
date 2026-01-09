const mysql = require('mysql2');

// Create the connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',      // Docker service name 'db'
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'webapp',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 🚨 CRITICAL: Export the PROMISE wrapper!
// This allows you to use 'await pool.query()' in index.js
module.exports = pool.promise();