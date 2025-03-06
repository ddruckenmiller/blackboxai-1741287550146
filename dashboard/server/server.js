require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Database initialization
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        
        // Create users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                role ENUM('admin', 'editor', 'viewer') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create lesson_plans table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS lesson_plans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                date DATE NOT NULL,
                time TIME NOT NULL,
                duration INT NOT NULL,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);

        // Create system_logs table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                action TEXT NOT NULL,
                user_id INT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        connection.release();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Auth routes
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        await pool.query(
            'INSERT INTO system_logs (action, user_id) VALUES (?, ?)',
            [`User ${username} logged in`, user.id]
        );

        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User routes
app.post('/api/users', authenticateToken, async (req, res) => {
    try {
        const { username, password, email, role } = req.body;
        
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can create users' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, email, role]
        );

        await pool.query(
            'INSERT INTO system_logs (action, user_id) VALUES (?, ?)',
            [`Admin ${req.user.username} created user ${username}`, req.user.id]
        );

        res.status(201).json({ id: result.insertId, username, email, role });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, username, email, role, created_at FROM users'
        );
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Lesson plan routes
app.post('/api/lesson-plans', authenticateToken, async (req, res) => {
    try {
        const { title, description, date, time, duration } = req.body;
        const [result] = await pool.query(
            'INSERT INTO lesson_plans (title, description, date, time, duration, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description, date, time, duration, req.user.id]
        );

        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        console.error('Create lesson plan error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/lesson-plans', authenticateToken, async (req, res) => {
    try {
        const [lessons] = await pool.query(
            'SELECT * FROM lesson_plans ORDER BY date, time'
        );
        res.json(lessons);
    } catch (error) {
        console.error('Get lesson plans error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// System logs routes
app.get('/api/logs', authenticateToken, async (req, res) => {
    try {
        const [logs] = await pool.query(
            'SELECT l.*, u.username FROM system_logs l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.timestamp DESC LIMIT 100'
        );
        res.json(logs);
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Initialize database and start server
initializeDatabase().then(() => {
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
});
