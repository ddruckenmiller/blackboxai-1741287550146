#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up Admin Dashboard...${NC}"

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}MySQL is not installed. Please install MySQL first.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Navigate to server directory
cd server

# Install dependencies
echo -e "${GREEN}Installing backend dependencies...${NC}"
npm install

# Check if .env exists, if not create it
if [ ! -f .env ]; then
    echo -e "${GREEN}Creating .env file...${NC}"
    cat > .env << EOL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=admin123
DB_NAME=admin_dashboard
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
EOL
    echo -e "${GREEN}.env file created. Please update with your database credentials.${NC}"
fi

# Initialize database
echo -e "${GREEN}Initializing database...${NC}"
node init-db.js

# Start the server
echo -e "${GREEN}Starting the server...${NC}"
npm run dev

echo -e "${GREEN}Setup complete!${NC}"
echo -e "${GREEN}You can now access the dashboard at http://localhost:5000${NC}"
echo -e "${GREEN}Default admin credentials:${NC}"
echo -e "${GREEN}Username: admin${NC}"
echo -e "${GREEN}Password: admin123${NC}"
