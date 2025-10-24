#!/bin/bash

# Ocean DeFi Manual Deployment Script
# Usage: ./scripts/deploy.sh [server_ip] [server_port] [ssh_user]

set -e

# Configuration
SERVER_IP="${1:-65.1.0.60}"
SERVER_PORT="${2:-3332}"
SSH_USER="${3:-root}"
DEPLOY_PATH="/var/www/ocean-defi"
LOCAL_BUILD_DIR="./deploy-temp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Ocean DeFi Deployment Script${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo "Server: $SERVER_IP:$SERVER_PORT"
echo "User: $SSH_USER"
echo "Deploy Path: $DEPLOY_PATH"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    exit 1
fi

# Clean previous build
echo -e "${YELLOW}Cleaning previous build...${NC}"
rm -rf "$LOCAL_BUILD_DIR"
mkdir -p "$LOCAL_BUILD_DIR"

# Install dependencies
echo -e "${YELLOW}Installing root dependencies...${NC}"
npm ci

echo -e "${YELLOW}Installing dashboard dependencies...${NC}"
cd apps/dashboard
npm ci
cd ../..

# Sync contracts and generate dashboard .env
echo -e "${YELLOW}Syncing contract configuration...${NC}"
node scripts/sync_coreconfig.js

# Build dashboard
echo -e "${YELLOW}Building dashboard...${NC}"
cd apps/dashboard
npm run build
cd ../..

# Create deployment package
echo -e "${YELLOW}Creating deployment package...${NC}"
cp -r apps/dashboard/dist "$LOCAL_BUILD_DIR/"
cp -r scripts "$LOCAL_BUILD_DIR/"
cp -r config "$LOCAL_BUILD_DIR/"
cp package.json "$LOCAL_BUILD_DIR/"
cp package-lock.json "$LOCAL_BUILD_DIR/"
cp ecosystem.config.cjs "$LOCAL_BUILD_DIR/"

# Copy ABIs
mkdir -p "$LOCAL_BUILD_DIR/apps/dashboard/store/Contract_ABI"
cp -r apps/dashboard/store/Contract_ABI/* "$LOCAL_BUILD_DIR/apps/dashboard/store/Contract_ABI/"

# Create tarball
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TARBALL="ocean-defi-${TIMESTAMP}.tar.gz"

echo -e "${YELLOW}Creating tarball: $TARBALL${NC}"
cd "$LOCAL_BUILD_DIR"
tar -czf "../$TARBALL" .
cd ..

# Upload to server
echo -e "${YELLOW}Uploading to server...${NC}"
scp -P "$SERVER_PORT" "$TARBALL" "$SSH_USER@$SERVER_IP:/tmp/"

# Deploy on server
echo -e "${YELLOW}Deploying on server...${NC}"
ssh -p "$SERVER_PORT" "$SSH_USER@$SERVER_IP" << ENDSSH
set -e

echo "Starting deployment on server..."

# Create directories
mkdir -p "$DEPLOY_PATH"/{releases,shared,backups,logs}

# Backup current deployment
if [ -d "$DEPLOY_PATH/current" ]; then
    BACKUP_DIR="$DEPLOY_PATH/backups/backup_${TIMESTAMP}"
    echo "Creating backup at \$BACKUP_DIR..."
    cp -r "$DEPLOY_PATH/current" "\$BACKUP_DIR"
fi

# Extract new release
RELEASE_DIR="$DEPLOY_PATH/releases/release_${TIMESTAMP}"
mkdir -p "\$RELEASE_DIR"
echo "Extracting to \$RELEASE_DIR..."
tar -xzf "/tmp/$TARBALL" -C "\$RELEASE_DIR"
rm "/tmp/$TARBALL"

# Copy .env if exists in shared
if [ -f "$DEPLOY_PATH/shared/.env" ]; then
    echo "Using existing .env from shared directory..."
    cp "$DEPLOY_PATH/shared/.env" "\$RELEASE_DIR/.env"
else
    echo "Warning: No .env found in shared directory!"
    echo "Please create $DEPLOY_PATH/shared/.env with production configuration"
fi

# Install production dependencies
cd "\$RELEASE_DIR"
echo "Installing production dependencies..."
npm ci --production

# Update symlink
echo "Updating symlink to new release..."
ln -sfn "\$RELEASE_DIR" "$DEPLOY_PATH/current"

# Install serve if not exists
if ! command -v serve &> /dev/null; then
    echo "Installing serve globally..."
    npm install -g serve
fi

# Restart with PM2
if command -v pm2 &> /dev/null; then
    echo "Restarting application with PM2..."
    cd "$DEPLOY_PATH/current"
    pm2 delete ocean-defi 2>/dev/null || true
    pm2 start ecosystem.config.cjs
    pm2 save
else
    echo "PM2 not found. Installing PM2..."
    npm install -g pm2
    cd "$DEPLOY_PATH/current"
    pm2 start ecosystem.config.cjs
    pm2 save
    pm2 startup
fi

# Clean old releases (keep last 5)
echo "Cleaning old releases..."
cd "$DEPLOY_PATH/releases"
ls -t | tail -n +6 | xargs -I {} rm -rf {} 2>/dev/null || true

echo "Deployment completed successfully!"
echo "Application is running at http://\$(hostname -I | awk '{print \$1}'):3000"

ENDSSH

# Cleanup local files
echo -e "${YELLOW}Cleaning up local files...${NC}"
rm -rf "$LOCAL_BUILD_DIR"
rm -f "$TARBALL"

echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "Application URL: ${GREEN}http://$SERVER_IP:3000${NC}"
echo ""
echo "To check logs: ssh -p $SERVER_PORT $SSH_USER@$SERVER_IP 'pm2 logs ocean-defi'"
echo "To check status: ssh -p $SERVER_PORT $SSH_USER@$SERVER_IP 'pm2 status'"
echo ""
