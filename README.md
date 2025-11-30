# LibreClinica Part 11 Compliance Testing

## Overview

This is an **isolated deployment** for testing 21 CFR Part 11 compliance on LibreClinica. It is completely separate from the main production system (ElectronicDataCaptureReal + LibreClinica API on Lightsail).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│           PART 11 COMPLIANCE TESTING SETUP (ISOLATED)           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Test Frontend (Vercel)                                         │
│  └─ libreclinica-part11-test.vercel.app                        │
│                     │                                            │
│                     ▼ HTTPS                                      │
│                                                                  │
│  AWS Lightsail (Separate Instance)                              │
│  └─ part11-test.accuratrials.com                               │
│      ├─ nginx (Reverse Proxy + SSL)                            │
│      ├─ libreclinica-api (Node.js REST API)                    │
│      ├─ libreclinica-core (Java/Tomcat)                        │
│      └─ postgres (Database - SEPARATE from production)         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

PRODUCTION SETUP (UNCHANGED):
┌─────────────────────────────────────────────────────────────────┐
│  ElectronicDataCaptureReal (Vercel)                             │
│  └─ edc-real.vercel.app                                        │
│                     │                                            │
│                     ▼ HTTPS                                      │
│  AWS Lightsail (Production)                                     │
│  └─ api.accuratrials.com                                       │
│      ├─ nginx, api, core, postgres                             │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Steps

### Step 1: Create New Lightsail Instance

1. Log in to AWS Console → Lightsail
2. Create a **new instance** (don't modify existing production!)
3. Select: Ubuntu 22.04 LTS, 4GB RAM minimum
4. Name it: `libreclinica-part11-testing`
5. Create a static IP and attach it
6. Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### Step 2: Set Up DNS

Add an A record for your testing domain:
```
Type: A
Name: part11-test (or your chosen subdomain)
Value: <your-new-lightsail-static-ip>
TTL: 300
```

### Step 3: SSH Into Server and Install Docker

```bash
ssh ubuntu@<your-static-ip>

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
exit
# SSH back in for group changes to take effect
ssh ubuntu@<your-static-ip>

# Install Docker Compose plugin
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

### Step 4: Upload Configuration

From your local machine:
```bash
# Copy the entire part11 testing folder
scp -r libreclinica-part11-testing ubuntu@<your-static-ip>:~/
```

Or manually create files on the server.

### Step 5: Configure Environment

```bash
cd libreclinica-part11-testing

# Create .env file
cp ENV_TEMPLATE.txt .env
nano .env  # Edit with your values
```

Update `nginx.conf`:
```bash
# Replace YOUR_DOMAIN with your actual domain
sed -i 's/YOUR_DOMAIN/part11-test.accuratrials.com/g' nginx.conf
sed -i 's/YOUR_DOMAIN/part11-test.accuratrials.com/g' nginx-init.conf
```

### Step 6: Start Services (HTTP First)

```bash
# Use HTTP-only config first (for SSL setup)
cp nginx-init.conf nginx.conf

# Build and start
docker compose up -d --build

# Check status
docker compose ps
docker compose logs -f
```

### Step 7: Get SSL Certificate

```bash
# Get SSL certificate
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  -d part11-test.accuratrials.com \
  --email admin@accuratrials.com \
  --agree-tos \
  --no-eff-email

# Now switch to full nginx config
# Edit nginx.conf and uncomment the ssl_certificate lines

# Restart nginx
docker compose restart nginx
```

### Step 8: Deploy Test Frontend to Vercel

```bash
cd test-frontend

# Install Vercel CLI if needed
npm install -g vercel

# Deploy
vercel login
vercel --prod

# Set project name as: libreclinica-part11-test
```

Or connect to GitHub and deploy via Vercel Dashboard.

### Step 9: Update Frontend API URL

After deployment, open the test frontend and:
1. Set API URL to: `https://part11-test.accuratrials.com`
2. Click "Test Connection"
3. Login with LibreClinica credentials

## Part 11 Compliance Tests

The test frontend includes tests for:

| Requirement | Test |
|-------------|------|
| **§11.10(d)** Access Control | Login/Logout, Unauthorized Access Test |
| **§11.10(e)** Audit Trail | View Logs, Create Entries |
| **§11.50** Electronic Signatures | Sign Data with Re-authentication |
| **§11.70** Signature Linking | Verify Signatures |
| **§11.300** Password Controls | Policy Validation, Password Change |
| **Session Timeout** | 30-minute auto-logout |

## Test Log Export

All test actions are logged. Use the "Export Log" button to generate a timestamped report for compliance documentation.

## Cleanup

To remove the testing deployment:

```bash
# On Lightsail server
cd libreclinica-part11-testing
docker compose down -v

# This removes containers AND volumes (data)
```

Then terminate the Lightsail instance from AWS Console.

## Important Notes

⚠️ **This is a TEST environment** - Do not use for real clinical data
⚠️ **Separate from Production** - Uses different database and domain
⚠️ **SSL Required** - Part 11 requires encrypted transmission
⚠️ **Audit Logs** - All actions are logged for compliance verification

## File Structure

```
libreclinica-part11-testing/
├── docker-compose.yml      # Docker services configuration
├── nginx.conf              # Full nginx config (with SSL)
├── nginx-init.conf         # Initial nginx config (HTTP only)
├── ENV_TEMPLATE.txt        # Environment variable template
├── README.md               # This file
└── test-frontend/          # Vercel-deployable test UI
    ├── index.html          # Main HTML
    ├── styles.css          # Styling
    ├── app.js              # Application logic
    ├── package.json        # NPM config
    └── vercel.json         # Vercel deployment config
```

