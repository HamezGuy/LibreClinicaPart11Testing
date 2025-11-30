# LibreClinica Part 11 Compliance Testing

> **⚠️ This is a SEPARATE, ISOLATED deployment for Part 11 testing only.**  
> It does NOT connect to your production backend at `api.accuratrials.com`.

## What This Is

A standalone LibreClinica deployment for testing 21 CFR Part 11 compliance features:
- ✅ Audit trails
- ✅ Electronic signatures  
- ✅ User authentication & access control
- ✅ Session timeout
- ✅ Password policies

## Quick Start (5 minutes)

### Prerequisites
- Ubuntu 22.04 server (AWS Lightsail 4GB RAM recommended - ~$20/month)
- Ports 80 and 443 open

### One-Command Setup

```bash
# Clone and run setup
git clone https://github.com/HamezGuy/LibreClinicaPart11Testing.git
cd LibreClinicaPart11Testing
bash setup.sh
```

### Manual Setup

```bash
# 1. Clone repository
git clone https://github.com/HamezGuy/LibreClinicaPart11Testing.git
cd LibreClinicaPart11Testing

# 2. Install Docker (if not installed)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in, then:
sudo apt-get update && sudo apt-get install -y docker-compose-plugin

# 3. Configure environment
cp ENV_TEMPLATE.txt .env
nano .env  # Edit settings

# 4. Start LibreClinica
docker compose up -d

# 5. Wait 2-3 minutes for startup, then access:
# http://YOUR_SERVER_IP/LibreClinica/
```

## Access LibreClinica

Once started, go to:
```
http://YOUR_SERVER_IP/LibreClinica/
```

**Default Login:**
- Username: `root`
- Password: `12345678`

## SSL Setup (Optional but Recommended)

For HTTPS with a custom domain:

```bash
# 1. Point your domain to your server IP (DNS A record)

# 2. Update nginx-ssl.conf with your domain
sed -i 's/YOUR_DOMAIN/part11.yourdomain.com/g' nginx-ssl.conf

# 3. Get SSL certificate
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  -d part11.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email

# 4. Switch to SSL config
cp nginx-ssl.conf nginx.conf
docker compose restart nginx

# 5. Access via HTTPS
# https://part11.yourdomain.com/LibreClinica/
```

## Container Overview

| Container | Purpose | Port |
|-----------|---------|------|
| `lc_part11_db` | PostgreSQL database | 5432 (internal) |
| `lc_part11_core` | LibreClinica (Java/Tomcat) | 8080 (internal) |
| `lc_part11_nginx` | Reverse proxy | 80, 443 |

## Useful Commands

```bash
# View all container status
docker compose ps

# View LibreClinica logs (useful for troubleshooting)
docker compose logs -f libreclinica

# Stop everything
docker compose down

# Stop and remove all data (fresh start)
docker compose down -v

# Restart LibreClinica
docker compose restart libreclinica

# Restart nginx (after config changes)
docker compose restart nginx
```

## Part 11 Testing Guide

### 1. Audit Trail Testing (§11.10(e))
- Create a study, add a subject, modify data
- Go to **Admin → Audit Logs** to verify all actions are logged
- Verify timestamps, user IDs, and before/after values

### 2. Electronic Signatures (§11.50, §11.70)
- Configure signature requirements in study settings
- Sign off on data entry
- Verify signature includes name, date/time, and meaning

### 3. Access Control (§11.10(d))
- Create users with different roles
- Verify role-based access restrictions
- Test that unauthorized users cannot access restricted areas

### 4. Session Timeout
- Leave session idle
- Verify automatic logout after timeout period

### 5. Password Policy (§11.300)
- Try creating users with weak passwords
- Verify password complexity requirements are enforced

## Isolation from Production

This deployment is **completely separate** from your production system:

| Aspect | Production | Part 11 Testing |
|--------|------------|-----------------|
| API Domain | `api.accuratrials.com` | Your test server IP |
| Database | `libreclinica` | `libreclinica_part11` |
| Docker Network | `lc_network` | `libreclinica_part11_network` |
| Container Names | `libreclinica_*` | `lc_part11_*` |
| Data Volumes | `libreclinica_*` | `libreclinica_part11_*` |

## Troubleshooting

### LibreClinica won't start
```bash
# Check logs
docker compose logs libreclinica

# Common fix: wait longer (first start takes 3-5 minutes)
# LibreClinica needs to initialize the database
```

### Can't connect to database
```bash
# Check postgres is running
docker compose ps postgres

# Check postgres logs
docker compose logs postgres
```

### 502 Bad Gateway
```bash
# LibreClinica is still starting up
# Wait 2-3 minutes and try again
docker compose logs -f libreclinica
# Look for "Server startup" message
```

## Files

```
LibreClinicaPart11Testing/
├── docker-compose.yml   # Main Docker configuration
├── nginx.conf           # HTTP nginx config (default)
├── nginx-ssl.conf       # HTTPS nginx config (use after SSL setup)
├── nginx-init.conf      # Initial nginx config (legacy)
├── setup.sh             # Quick setup script
├── ENV_TEMPLATE.txt     # Environment variables template
├── README.md            # This file
└── test-frontend/       # Optional: API testing UI on Vercel
```

## Support

- LibreClinica Documentation: https://libreclinica.org/documentation
- GitHub Issues: https://github.com/HamezGuy/LibreClinicaPart11Testing/issues
