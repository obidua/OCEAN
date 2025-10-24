# Quick Start - CI/CD Deployment

## 🚀 Quick Setup (5 minutes)

### Step 1: Setup Server (One-time)

SSH into your server and run:

```bash
ssh -p 3332 root@65.1.0.60
```

Then download and run the setup script:

```bash
curl -o server-setup.sh https://raw.githubusercontent.com/obidua/difi-ocean/master/scripts/server-setup.sh
chmod +x server-setup.sh
sudo ./server-setup.sh
```

The script will ask for your `.env` content - paste it and press Ctrl+D.

### Step 2: Configure GitHub Secrets

1. Go to your repository: https://github.com/obidua/difi-ocean
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets:

**SSH_PRIVATE_KEY**: Copy from server setup output (the long key starting with `-----BEGIN OPENSSH PRIVATE KEY-----`)

**ENV_FILE**: Copy your `.env` file content from the root directory

### Step 3: Deploy

Just push to master:

```bash
git add .
git commit -m "Setup CI/CD"
git push origin master
```

GitHub Actions will automatically deploy! 🎉

## 📱 Access Your App

- **Direct**: http://65.1.0.60:3000
- **Via Nginx**: http://65.1.0.60

## 🔍 Check Status

```bash
ssh -p 3332 root@65.1.0.60 "pm2 status"
```

## 📝 View Logs

```bash
ssh -p 3332 root@65.1.0.60 "pm2 logs ocean-defi"
```

## 🔄 Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
./scripts/deploy.sh
```

---

**Need detailed instructions?** See [CI_CD_SETUP.md](./CI_CD_SETUP.md)
