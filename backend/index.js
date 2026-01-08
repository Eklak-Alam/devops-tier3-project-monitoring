require('dotenv').config(); // Load env vars immediately
const express = require('express');
const cors = require('cors');
const client = require('prom-client');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. SECURITY & MIDDLEWARE
// Optimized CORS: Allow specific origins in production, fallback to * for dev
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 2. OBSERVABILITY (Prometheus)
const register = new client.Registry();
client.collectDefaultMetrics({ register });

app.get('/metrics', async (req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
});

// 3. API ROUTES

// GET: Fetch All Users
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error("Database Error:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST: Add User
app.post('/api/users', async (req, res) => {
    const { name, email, role } = req.body;
    
    // Input Validation
    if (!name || !email) {
        return res.status(400).json({ error: "Missing required fields: name, email" });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
            [name, email, role || 'User']
        );
        res.status(201).json({ 
            id: result.insertId, 
            name, 
            email, 
            role: role || 'User' 
        });
    } catch (err) {
        // Handle duplicate email error specifically
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "Email already exists" });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT: Update User
app.put('/api/users/:id', async (req, res) => {
    const { name, email, role } = req.body;
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
            [name, email, role, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "User updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Remove User
app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// HEAVY TASK (Latency Test)
app.get('/api/heavy', (req, res) => {
    const delay = 2000;
    setTimeout(() => {
        res.json({ message: `Heavy task finished in ${delay}ms` });
    }, delay);
});

// 4. GLOBAL ERROR HANDLER (Fail-Safe)
app.use((req, res) => {
    console.warn(`[404] Route Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: "Endpoint not found" });
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Graceful Shutdown (Best Practice for Docker)
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        pool.end(); // Close DB pool
        console.log('HTTP server closed');
    });
});