# Ocean DeFi CI/CD Setup Guide

## Overview
This project uses GitHub Actions for automated CI/CD deployment to your server at `65.1.0.60:3332`.

## Prerequisites

### 1. Server Setup (65.1.0.60)

SSH into your server and run:

```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install serve globally (for serving static files)
npm install -g serve

# Create deployment directory structure
mkdir -p /var/www/ocean-defi/{releases,shared,backups,logs}

# Create .env file in shared directory
nano /var/www/ocean-defi/shared/.env
```

Paste your production `.env` content into the file above.

### 2. Configure Nginx (Optional but Recommended)

```bash
# Install Nginx
apt-get install -y nginx

# Create Nginx configuration
nano /etc/nginx/sites-available/ocean-defi
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or use IP: 65.1.0.60

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
    }
}
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/ocean-defi /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 3. Setup SSH Key for GitHub Actions

On your server:

```bash
# Generate SSH key for GitHub Actions (if not exists)
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_deploy -N ""

# Add the public key to authorized_keys
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys

# Display private key (copy this for GitHub Secrets)
cat ~/.ssh/github_actions_deploy
```

### 4. Configure GitHub Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

1. **SSH_PRIVATE_KEY**
   - Value: Content of `~/.ssh/github_actions_deploy` from your server
   
2. **ENV_FILE**
   - Value: Your complete `.env` file content from the root directory

## Deployment Methods

### Method 1: Automatic Deployment (GitHub Actions)

**Triggers automatically when you push to master/main branch:**

```bash
git add .
git commit -m "Your changes"
git push origin master
```

GitHub Actions will:
1. ✅ Build the application
2. ✅ Run tests
3. ✅ Create deployment package
4. ✅ Deploy to server
5. ✅ Restart application with PM2
6. ✅ Run health checks

### Method 2: Manual Deployment (Deploy Script)

Make the script executable:

```bash
chmod +x scripts/deploy.sh
```

Run deployment:

```bash
# Default (uses 65.1.0.60:3332)
./scripts/deploy.sh

# Custom server
./scripts/deploy.sh 65.1.0.60 3332 root
```

### Method 3: Manual Deployment Steps

```bash
# 1. Build locally
npm ci
cd apps/dashboard
npm ci
npm run build
cd ../..

# 2. Create tarball
tar -czf deploy.tar.gz apps/dashboard/dist scripts config package.json ecosystem.config.cjs

# 3. Upload to server
scp -P 3332 deploy.tar.gz root@65.1.0.60:/tmp/

# 4. SSH and deploy
ssh -p 3332 root@65.1.0.60
cd /var/www/ocean-defi/releases
mkdir release_$(date +%Y%m%d_%H%M%S)
cd release_$(date +%Y%m%d_%H%M%S)
tar -xzf /tmp/deploy.tar.gz
npm ci --production
cd /var/www/ocean-defi
ln -sfn releases/release_$(date +%Y%m%d_%H%M%S) current
pm2 restart ocean-defi
```

## PM2 Management

### Common PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs ocean-defi

# Restart application
pm2 restart ocean-defi

# Stop application
pm2 stop ocean-defi

# Start application
pm2 start ocean-defi

# Monitor resources
pm2 monit

# View detailed info
pm2 show ocean-defi
```

### Configure PM2 to Start on Boot

```bash
pm2 startup
pm2 save
```

## Monitoring & Debugging

### Check Application Logs

```bash
# PM2 logs
pm2 logs ocean-defi

# System logs
tail -f /var/www/ocean-defi/logs/error.log
tail -f /var/www/ocean-defi/logs/out.log
```

### Check Application Status

```bash
# PM2 status
pm2 status

# Check if app is responding
curl http://localhost:3000

# Check from outside
curl http://65.1.0.60:3000
```

### Rollback Deployment

```bash
ssh -p 3332 root@65.1.0.60

# List releases
ls -la /var/www/ocean-defi/releases/

# Rollback to previous release
cd /var/www/ocean-defi
ln -sfn releases/release_YYYYMMDD_HHMMSS current
pm2 restart ocean-defi
```

## Firewall Configuration

```bash
# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS
ufw allow 443/tcp

# Allow custom SSH port
ufw allow 3332/tcp

# Allow app port (if accessing directly)
ufw allow 3000/tcp

# Enable firewall
ufw enable
```

## SSL/HTTPS Setup (Optional)

```bash
# Install Certbot
apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d your-domain.com

# Auto-renewal
certbot renew --dry-run
```

## Troubleshooting

### Deployment fails

```bash
# Check GitHub Actions logs in repository → Actions tab

# Check server connectivity
ssh -p 3332 root@65.1.0.60 "echo 'Connection OK'"

# Check disk space
ssh -p 3332 root@65.1.0.60 "df -h"
```

### Application not starting

```bash
# Check PM2 logs
pm2 logs ocean-defi --lines 100

# Check if port is in use
lsof -i :3000

# Restart PM2
pm2 restart ocean-defi
```

### Environment variables not working

```bash
# Check .env exists
ls -la /var/www/ocean-defi/shared/.env

# Copy to current release
cp /var/www/ocean-defi/shared/.env /var/www/ocean-defi/current/.env

# Restart app
pm2 restart ocean-defi
```

## Project Structure on Server

```
/var/www/ocean-defi/
├── current/              # Symlink to latest release
├── releases/             # All deployed releases
│   ├── release_20241024_120000/
│   ├── release_20241024_130000/
│   └── ...
├── shared/               # Shared files across releases
│   └── .env
├── backups/              # Backup of previous deployments
└── logs/                 # Application logs
    ├── error.log
    ├── out.log
    └── combined.log
```

## GitHub Actions Workflows

### 1. `deploy.yml` - Production Deployment
- Triggers on push to master/main
- Builds and deploys to production server
- Runs health checks

### 2. `test.yml` - Testing & Validation  
- Triggers on pull requests and feature branches
- Runs linting and type checking
- Tests build process

## Security Best Practices

1. ✅ Never commit `.env` files
2. ✅ Use GitHub Secrets for sensitive data
3. ✅ Use SSH key authentication (no passwords)
4. ✅ Keep server and dependencies updated
5. ✅ Use firewall (UFW) to restrict access
6. ✅ Enable SSL/HTTPS in production
7. ✅ Regular backups of deployment

## Accessing the Application

- **Direct**: http://65.1.0.60:3000
- **Via Nginx**: http://65.1.0.60 (port 80)
- **With Domain**: http://your-domain.com

## Support

For issues with:
- **GitHub Actions**: Check repository Actions tab
- **Server**: SSH in and check PM2 logs
- **Application**: Check browser console and network tab
