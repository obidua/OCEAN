# 🚀 Production Deployment Guide

## Pre-Deployment Checklist

### 🔒 Security Review (MANDATORY)

- [ ] **Private Keys Protected**
  - [ ] `config/privateKeys.json` is NOT in repository
  - [ ] All `.env` files are gitignored
  - [ ] No hardcoded secrets in code
  - [ ] Review SECURITY.md guidelines

- [ ] **Environment Variables Secured**
  - [ ] Production `.env` file created from `.env.example`
  - [ ] All contract addresses verified
  - [ ] RPC URLs tested and working
  - [ ] Secrets stored in deployment platform (Vercel/Netlify secrets)

- [ ] **Git Repository Clean**
  ```bash
  # Verify no sensitive files are tracked
  git status --ignored
  
  # Check for accidentally committed secrets
  git log --all --full-history -- "*privateKeys*"
  git log --all --full-history -- "*.env"
  ```

### 🧪 Testing Checklist

- [ ] **Unit Tests Pass**
  ```bash
  npm run test # (if tests exist)
  ```

- [ ] **Build Succeeds**
  ```bash
  cd apps/dashboard
  npm run build:prod
  ```

- [ ] **TypeScript Check**
  ```bash
  npm run typecheck
  ```

- [ ] **Manual Testing Complete**
  - [ ] Wallet connection (MetaMask, WalletConnect)
  - [ ] Dashboard data loading
  - [ ] Portfolio creation/viewing
  - [ ] Income claiming
  - [ ] Team network display
  - [ ] Royalty program features
  - [ ] Mobile responsive design
  - [ ] PWA installation

### ⚡ Performance Review

- [ ] **RPC Configuration**
  - [ ] At least 3-5 RPC endpoints configured
  - [ ] All RPCs tested and responding
  - [ ] Dual RPC failover working

- [ ] **Bundle Size**
  ```bash
  npm run build:prod
  # Check dist/ folder size
  # Target: < 2MB total bundle size
  ```

- [ ] **Lighthouse Audit**
  - [ ] Performance score > 90
  - [ ] Accessibility score > 90
  - [ ] Best Practices score > 90
  - [ ] SEO score > 90

### 📱 Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## Deployment Steps

### Step 1: Build for Production

```bash
cd apps/dashboard

# Install dependencies
npm install

# Run production build
npm run build:prod

# Verify build output
ls -lh dist/
```

### Step 2: Deploy to Hosting Platform

#### Option A: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
# Settings > Environment Variables
```

**Vercel Configuration (vercel.json):**
```json
{
  "buildCommand": "npm run build:prod",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

#### Option B: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=apps/dashboard/dist
```

**Netlify Configuration (netlify.toml):**
```toml
[build]
  command = "cd apps/dashboard && npm run build:prod"
  publish = "apps/dashboard/dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

#### Option C: Custom Server (VPS/Cloud)

```bash
# Build locally
npm run build:prod

# Upload to server (example with rsync)
rsync -avz --delete dist/ user@server:/var/www/oceandefi/

# On server: Configure Nginx
sudo nano /etc/nginx/sites-available/oceandefi
```

**Nginx Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name oceandefi.com www.oceandefi.com;

    ssl_certificate /etc/letsencrypt/live/oceandefi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/oceandefi.com/privkey.pem;

    root /var/www/oceandefi;
    index index.html;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name oceandefi.com www.oceandefi.com;
    return 301 https://$server_name$request_uri;
}
```

### Step 3: Configure Environment Variables

**In your deployment platform, set:**

```bash
# Contract Addresses (from your .env)
VITE_ROOT_ADDRESS=0x...
VITE_USERREGISTRY=0x...
# ... (all other contract addresses)

# RPC URLs
VITE_RPC_URL=https://blockchain.ramestta.com
VITE_RPC_URL_2=https://blockchain2.ramestta.com
VITE_RPC_URL_3=https://blockchain3.ramestta.com
# ... (add 3-5 total RPCs)

# Network Config
VITE_CHAIN_ID=1370
VITE_NETWORK_NAME=Ramestta

# Optional: Analytics & Monitoring
VITE_GA_TRACKING_ID=your_tracking_id
VITE_SENTRY_DSN=your_sentry_dsn
```

### Step 4: DNS Configuration

1. **Add DNS Records:**
   - A record: `oceandefi.com` → Your server IP
   - CNAME: `www` → `oceandefi.com`

2. **SSL Certificate:**
   - Use Let's Encrypt (free): `certbot --nginx`
   - Or platform-managed SSL (Vercel/Netlify auto-provisions)

### Step 5: Post-Deployment Verification

```bash
# Test production URL
curl -I https://oceandefi.com

# Verify HTTPS
curl -I https://oceandefi.com | grep "HTTP/2 200"

# Check security headers
curl -I https://oceandefi.com | grep "X-Frame-Options"

# Test API connectivity
curl https://oceandefi.com/api/health # (if you have health endpoint)
```

**Manual Checks:**
- [ ] Website loads correctly
- [ ] No console errors
- [ ] Wallet connects properly
- [ ] All features work
- [ ] Mobile version works
- [ ] PWA installs correctly

---

## Monitoring & Maintenance

### 🔍 Error Monitoring

**Recommended: Sentry Integration**

```bash
npm install @sentry/react @sentry/vite-plugin
```

**Configure Sentry (src/main.jsx):**
```javascript
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
```

### 📊 Analytics

**Google Analytics 4:**
```javascript
// src/utils/analytics.js
export const trackEvent = (eventName, params) => {
  if (window.gtag && import.meta.env.PROD) {
    window.gtag('event', eventName, params);
  }
};
```

### 🔄 CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [master]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: apps/dashboard/package-lock.json
      
      - name: Install dependencies
        run: |
          cd apps/dashboard
          npm ci
      
      - name: Run tests
        run: |
          cd apps/dashboard
          npm run typecheck
      
      - name: Build
        run: |
          cd apps/dashboard
          npm run build:prod
        env:
          VITE_ROOT_ADDRESS: ${{ secrets.VITE_ROOT_ADDRESS }}
          VITE_RPC_URL: ${{ secrets.VITE_RPC_URL }}
          # ... (all other env vars as secrets)
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: apps/dashboard
          vercel-args: '--prod'
```

### 🚨 Incident Response

**If something goes wrong:**

1. **Immediate Rollback:**
   ```bash
   # Vercel
   vercel rollback
   
   # Netlify
   netlify deploy --prod --dir=apps/dashboard/dist (previous version)
   
   # Custom server
   # Keep previous build as backup
   mv dist dist-backup-$(date +%Y%m%d)
   mv dist-previous dist
   ```

2. **Check Logs:**
   - Vercel: Dashboard → Deployment → Runtime Logs
   - Netlify: Dashboard → Deploys → Function logs
   - Custom: `tail -f /var/log/nginx/error.log`

3. **Monitor Sentry:**
   - Check for spike in errors
   - Identify affected users
   - Review error stack traces

---

## Optimization Tips

### 🎯 Performance

1. **Enable Compression:**
   - Gzip/Brotli in Nginx/hosting platform
   - Reduce bundle size with code splitting

2. **CDN Configuration:**
   - Use Cloudflare or similar CDN
   - Cache static assets aggressively
   - Enable HTTP/3 if available

3. **Image Optimization:**
   - Use WebP format where possible
   - Lazy load images
   - Compress with tools like TinyPNG

### 🔐 Security Hardening

1. **Content Security Policy:**
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="default-src 'self'; 
                  script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
                  style-src 'self' 'unsafe-inline';
                  img-src 'self' data: https:;
                  connect-src 'self' https://blockchain.ramestta.com;">
   ```

2. **Rate Limiting:**
   - Configure on Cloudflare or server
   - Prevent DDoS attacks
   - Limit RPC requests per IP

3. **Regular Updates:**
   ```bash
   npm audit
   npm audit fix
   npm update
   ```

---

## Troubleshooting

### Common Issues

**Issue: "Failed to fetch" errors**
- Check RPC URLs are accessible
- Verify CORS configuration
- Test with curl: `curl -X POST https://blockchain.ramestta.com`

**Issue: Wallet won't connect**
- Verify HTTPS is enabled
- Check browser console for errors
- Test with different wallet providers

**Issue: Slow loading**
- Add more RPC endpoints
- Check bundle size
- Review network waterfall in DevTools

**Issue: 404 on refresh**
- Configure SPA routing in hosting platform
- Add redirect rules (see configs above)

---

## Support

**For deployment help:**
- GitHub Issues: https://github.com/obidua/OCEAN-DeFi-Ecosystem/issues
- Discord: #tech-support
- Email: dev@oceandefi.com

**Emergency Contacts:**
- DevOps Lead: [Contact Info]
- Security Team: security@oceandefi.com
- On-call Engineer: [Phone/Discord]

---

**Last Updated:** November 6, 2025  
**Next Review:** Before each major deployment
