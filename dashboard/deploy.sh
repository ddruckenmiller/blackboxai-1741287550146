#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root"
    exit 1
fi

# Deployment configuration
APP_NAME="admin-dashboard"
APP_DIR="/var/www/$APP_NAME"
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
SERVICE_FILE="/etc/systemd/system/$APP_NAME.service"
DOMAIN=""

# Get domain name
read -p "Enter your domain name (e.g., example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

# Install required packages
print_status "Installing required packages..."
apt update
apt install -y nodejs npm mysql-server nginx certbot python3-certbot-nginx

# Install PM2 globally
print_status "Installing PM2..."
npm install -g pm2

# Create application directory
print_status "Creating application directory..."
mkdir -p $APP_DIR
chown -R www-data:www-data $APP_DIR

# Copy application files
print_status "Copying application files..."
cp -r * $APP_DIR/
cd $APP_DIR/server

# Install dependencies
print_status "Installing Node.js dependencies..."
npm install --production

# Setup MySQL
print_status "Setting up MySQL..."
read -s -p "Enter MySQL root password: " MYSQL_ROOT_PASS
echo
read -s -p "Enter password for dashboard_user: " MYSQL_USER_PASS
echo

mysql -u root -p$MYSQL_ROOT_PASS << EOF
CREATE DATABASE IF NOT EXISTS admin_dashboard;
CREATE USER IF NOT EXISTS 'dashboard_user'@'localhost' IDENTIFIED BY '$MYSQL_USER_PASS';
GRANT ALL PRIVILEGES ON admin_dashboard.* TO 'dashboard_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Create .env file
print_status "Creating .env file..."
cat > .env << EOF
DB_HOST=localhost
DB_USER=dashboard_user
DB_PASSWORD=$MYSQL_USER_PASS
DB_NAME=admin_dashboard
JWT_SECRET=$(openssl rand -hex 32)
PORT=5000
EOF

# Initialize database
print_status "Initializing database..."
node init-db.js

# Setup Nginx configuration
print_status "Configuring Nginx..."
cat > $NGINX_CONF << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root $APP_DIR;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/

# Install SSL certificate
print_status "Installing SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Setup systemd service
print_status "Setting up systemd service..."
cp server/admin-dashboard.service $SERVICE_FILE
systemctl daemon-reload
systemctl enable $APP_NAME
systemctl start $APP_NAME

# Configure firewall
print_status "Configuring firewall..."
ufw allow 80
ufw allow 443
ufw allow 22

# Setup daily database backup
print_status "Setting up database backup..."
cat > /etc/cron.daily/backup-dashboard << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/$APP_NAME"
mkdir -p \$BACKUP_DIR
mysqldump -u dashboard_user -p'$MYSQL_USER_PASS' admin_dashboard > \$BACKUP_DIR/backup-\$(date +%Y%m%d).sql
find \$BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /etc/cron.daily/backup-dashboard

# Set proper permissions
print_status "Setting file permissions..."
chown -R www-data:www-data $APP_DIR
find $APP_DIR -type f -exec chmod 644 {} \;
find $APP_DIR -type d -exec chmod 755 {} \;

# Restart services
print_status "Restarting services..."
systemctl restart nginx
systemctl restart $APP_NAME

print_status "Deployment complete!"
echo -e "${GREEN}Your admin dashboard is now available at https://$DOMAIN${NC}"
echo -e "${GREEN}Default admin credentials:${NC}"
echo -e "${GREEN}Username: admin${NC}"
echo -e "${GREEN}Password: admin123${NC}"
echo -e "${YELLOW}Please change the admin password after first login!${NC}"

# Print important paths
echo -e "\nImportant paths:"
echo -e "Application files: ${GREEN}$APP_DIR${NC}"
echo -e "Nginx config: ${GREEN}$NGINX_CONF${NC}"
echo -e "Service file: ${GREEN}$SERVICE_FILE${NC}"
echo -e "Database backups: ${GREEN}/var/backups/$APP_NAME${NC}"
echo -e "Application logs: ${GREEN}journalctl -u $APP_NAME${NC}"
