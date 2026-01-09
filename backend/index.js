require('dotenv').config(); // Load env vars immediately
const express = require('express');
const cors = require('cors');
const client = require('prom-client');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. SECURITY & MIDDLEWARE
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- ROBUST AUTO-INIT DATABASE (The Magic Part) ---
// Helper to pause execution
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const initDb = async () => {
    let retries = 10; // Try for 50 seconds (10 * 5s)
    
    while (retries > 0) {
        try {
            // 1. Check if we can connect at all
            await pool.query("SELECT 1");
            
            // 2. If connected, run the table creation
            const query = `
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    role VARCHAR(50) DEFAULT 'User',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            await pool.query(query);
            console.log("✅ Database connected & Table 'users' verified/created.");
            return; // Success! Exit the function.
        } catch (err) {
            console.log(`⏳ Database not ready yet... Retrying in 5s (${retries} attempts left)`);
            console.error(`   Reason: ${err.message}`); // Optional: see why it failed
            retries--;
            await wait(5000); // Wait 5 seconds
        }
    }
    console.error("❌ Could not connect to Database after 10 attempts. Exiting.");
    process.exit(1); // Crash the container so Docker restarts it
};

// Run the retry logic immediately
initDb();

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

// 4. GLOBAL ERROR HANDLER
app.use((req, res) => {
    console.warn(`[404] Route Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: "Endpoint not found" });
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        pool.end();
        console.log('HTTP server closed');
    });
});