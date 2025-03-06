# Installation Guide for Web Hosting

This guide provides step-by-step instructions for deploying the Admin Dashboard on a web hosting server.

## Prerequisites

- Linux-based server (Ubuntu/Debian recommended)
- Node.js 14+ installed
- MySQL 5.7+ installed
- Nginx or Apache web server
- SSL certificate (recommended for production)

## Installation Steps

### 1. Server Preparation

```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Install required packages if not already installed
sudo apt install -y nodejs npm mysql-server nginx

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. Database Setup

```bash
# Access MySQL
sudo mysql

# Create database and user
CREATE DATABASE admin_dashboard;
CREATE USER 'dashboard_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON admin_dashboard.* TO 'dashboard_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/admin-dashboard
sudo chown -R $USER:$USER /var/www/admin-dashboard

# Clone or upload application files
cd /var/www/admin-dashboard
# Copy all application files here

# Navigate to server directory
cd server

# Install dependencies
npm install --production

# Create and configure .env file
cp .env.example .env
# Edit .env with production values
```

### 4. Environment Configuration

Edit the `.env` file with production values:

```env
DB_HOST=localhost
DB_USER=dashboard_user
DB_PASSWORD=your_secure_password
DB_NAME=admin_dashboard
JWT_SECRET=your_very_secure_random_string
PORT=5000
```

### 5. Initialize Database

```bash
# Run database initialization script
node init-db.js
```

### 6. Nginx Configuration

Create a new Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/admin-dashboard
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend files
    location / {
        root /var/www/admin-dashboard;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration:

```bash
sudo ln -s /etc/nginx/sites-available/admin-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Start Application with PM2

```bash
# Navigate to server directory
cd /var/www/admin-dashboard/server

# Start application with PM2
pm2 start server.js --name "admin-dashboard"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### 8. Security Considerations

1. **Firewall Configuration**
```bash
# Allow only necessary ports
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
```

2. **SSL Certificate**
- Install SSL certificate using Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

3. **File Permissions**
```bash
# Set proper file permissions
sudo chown -R www-data:www-data /var/www/admin-dashboard
sudo find /var/www/admin-dashboard -type f -exec chmod 644 {} \;
sudo find /var/www/admin-dashboard -type d -exec chmod 755 {} \;
```

### 9. Monitoring and Maintenance

1. **Monitor Application**
```bash
# View PM2 status
pm2 status
pm2 monit

# View logs
pm2 logs admin-dashboard
```

2. **Regular Updates**
```bash
# Update application
cd /var/www/admin-dashboard
git pull # if using git

# Update dependencies
npm update

# Restart application
pm2 restart admin-dashboard
```

### 10. Backup Configuration

1. **Database Backup**
```bash
# Create backup script
sudo nano /etc/cron.daily/backup-dashboard
```

Add the following content:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/admin-dashboard"
mkdir -p $BACKUP_DIR
mysqldump -u dashboard_user -p'your_secure_password' admin_dashboard > $BACKUP_DIR/backup-$(date +%Y%m%d).sql
find $BACKUP_DIR -type f -mtime +7 -delete
```

Make the script executable:
```bash
sudo chmod +x /etc/cron.daily/backup-dashboard
```

## Troubleshooting

1. **Application not starting:**
   - Check PM2 logs: `pm2 logs admin-dashboard`
   - Verify .env configuration
   - Check Node.js version compatibility

2. **Database connection issues:**
   - Verify MySQL service status: `systemctl status mysql`
   - Check database credentials in .env
   - Verify database user permissions

3. **Nginx errors:**
   - Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
   - Verify SSL certificate configuration
   - Check file permissions

## Support

For additional support:
1. Check the application logs
2. Review the README.md file
3. Submit issues to the project repository
4. Contact system administrator

Remember to regularly:
- Monitor system resources
- Update system packages
- Backup database and configurations
- Review security settings
- Check application logs for errors
