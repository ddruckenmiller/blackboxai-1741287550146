# Admin Dashboard with MySQL Backend

A full-stack admin dashboard application with user management, lesson planning, and system logging features.

## Features

- User Authentication & Authorization
- User Management (CRUD operations)
- Lesson Planning with Calendar Integration
- System Activity Logging
- Real-time Dashboard Statistics

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- Modern web browser

## Setup Instructions

1. **Database Setup**
   ```bash
   # Navigate to server directory
   cd server

   # Install dependencies
   npm install

   # Create .env file with your MySQL credentials
   cp .env.example .env
   # Edit .env with your database credentials

   # Initialize database and create admin user
   npm run init-db
   ```

2. **Start the Backend Server**
   ```bash
   # In the server directory
   npm run dev
   ```

3. **Access the Application**
   - Open `http://localhost:5000` in your web browser
   - Login with default admin credentials:
     - Username: admin
     - Password: admin123

## Default Admin Credentials
- Username: admin
- Password: admin123

## API Endpoints

### Authentication
- POST /api/login - Login user

### Users
- GET /api/users - Get all users
- POST /api/users - Create new user
- DELETE /api/users/:id - Delete user

### Lesson Plans
- GET /api/lesson-plans - Get all lesson plans
- POST /api/lesson-plans - Create new lesson plan
- PUT /api/lesson-plans/:id - Update lesson plan
- DELETE /api/lesson-plans/:id - Delete lesson plan

### System Logs
- GET /api/logs - Get system logs

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- CORS protection
- Environment variable configuration

## Production Deployment

1. Update `.env` with production database credentials
2. Set secure JWT secret
3. Enable HTTPS
4. Configure proper CORS settings
5. Set up proper logging
6. Use PM2 or similar for process management

## Tech Stack

- Frontend:
  - HTML5
  - CSS3 with modern features
  - JavaScript (ES6+)
  - FullCalendar.js for calendar functionality
  - Font Awesome for icons

- Backend:
  - Node.js
  - Express.js
  - MySQL
  - JWT for authentication
  - bcrypt for password hashing

## Development

To contribute or modify:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
