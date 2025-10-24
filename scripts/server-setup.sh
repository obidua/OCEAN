#!/bin/bash

# Server Setup Script for Ocean DeFi
# Run this script on your production server (65.1.0.60)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Ocean DeFi Server Setup${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Update system
echo -e "${YELLOW}[1/8] Updating system packages...${NC}"
apt-get update -qq
apt-get upgrade -y -qq

# Install Node.js 20.x
echo -e "${YELLOW}[2/8] Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js already installed: $(node -v)"
fi

# Install PM2
echo -e "${YELLOW}[3/8] Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo "PM2 already installed: $(pm2 -v)"
fi

# Install serve
echo -e "${YELLOW}[4/8] Installing serve...${NC}"
if ! command -v serve &> /dev/null; then
    npm install -g serve
else
    echo "serve already installed"
fi

# Create deployment directory structure
echo -e "${YELLOW}[5/8] Creating deployment directories...${NC}"
mkdir -p /var/www/ocean-defi/{releases,shared,backups,logs}
echo "✓ Directories created"

# Setup .env file
echo -e "${YELLOW}[6/8] Setting up environment file...${NC}"
if [ ! -f "/var/www/ocean-defi/shared/.env" ]; then
    echo -e "${BLUE}Please paste your .env content, then press Ctrl+D:${NC}"
    cat > /var/www/ocean-defi/shared/.env
    echo ""
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo "✓ .env file already exists"
fi

# Install Nginx
echo -e "${YELLOW}[7/8] Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
else
    echo "Nginx already installed"
fi

# Create Nginx configuration
echo -e "${YELLOW}Creating Nginx configuration...${NC}"
cat > /etc/nginx/sites-available/ocean-defi << 'EOF'
server {
    listen 80;
    server_name _;

    # Increase buffer sizes for large headers
    client_header_buffer_size 16k;
    large_client_header_buffers 4 16k;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
EOF

# Enable Nginx site
if [ ! -L "/etc/nginx/sites-enabled/ocean-defi" ]; then
    ln -s /etc/nginx/sites-available/ocean-defi /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
fi

nginx -t && systemctl reload nginx
echo -e "${GREEN}✓ Nginx configured and reloaded${NC}"

# Setup firewall
echo -e "${YELLOW}[8/8] Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 3332/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 3000/tcp
    echo -e "${GREEN}✓ Firewall configured${NC}"
else
    echo -e "${YELLOW}UFW not installed, skipping firewall setup${NC}"
fi

# Setup PM2 startup
echo -e "${YELLOW}Setting up PM2 to start on boot...${NC}"
pm2 startup systemd -u root --hp /root | tail -1 | bash || true
echo -e "${GREEN}✓ PM2 startup configured${NC}"

# Generate SSH key for GitHub Actions
echo -e "${YELLOW}Generating SSH key for GitHub Actions...${NC}"
if [ ! -f "/root/.ssh/github_actions_deploy" ]; then
    ssh-keygen -t ed25519 -C "github-actions" -f /root/.ssh/github_actions_deploy -N ""
    cat /root/.ssh/github_actions_deploy.pub >> /root/.ssh/authorized_keys
    chmod 600 /root/.ssh/authorized_keys
    echo -e "${GREEN}✓ SSH key generated${NC}"
else
    echo "✓ SSH key already exists"
fi

echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo -e "1. Copy this SSH private key to GitHub Secrets (SSH_PRIVATE_KEY):"
echo -e "${YELLOW}----------------------------------------${NC}"
cat /root/.ssh/github_actions_deploy
echo -e "${YELLOW}----------------------------------------${NC}"
echo ""
echo -e "2. Copy your .env file to GitHub Secrets (ENV_FILE):"
echo "   Location: /var/www/ocean-defi/shared/.env"
echo ""
echo -e "3. Server is ready for deployment!"
echo "   - Application will be served on port 3000"
echo "   - Nginx proxy on port 80"
echo "   - SSH port: 3332"
echo ""
echo -e "${BLUE}Deployment commands:${NC}"
echo "   - Deploy: Push to master branch (auto) or run ./scripts/deploy.sh"
echo "   - Status: pm2 status"
echo "   - Logs: pm2 logs ocean-defi"
echo "   - Restart: pm2 restart ocean-defi"
echo ""
echo -e "${GREEN}Access your application at: http://$(hostname -I | awk '{print $1}')${NC}"
echo ""
