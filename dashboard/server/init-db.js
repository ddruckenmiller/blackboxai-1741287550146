require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
    try {
        // Create connection to MySQL server
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        await connection.query(`USE ${process.env.DB_NAME}`);

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

        // Check if admin user exists
        const [adminUsers] = await connection.query(
            'SELECT * FROM users WHERE username = ?',
            ['admin']
        );

        // Create admin user if it doesn't exist
        if (adminUsers.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await connection.query(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                ['admin', hashedPassword, 'admin']
            );
            console.log('Admin user created successfully');
        }

        console.log('Database initialized successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

initializeDatabase();
