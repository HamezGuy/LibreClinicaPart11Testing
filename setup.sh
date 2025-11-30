#!/bin/bash
# ================================================================
# LibreClinica Part 11 Testing - Quick Setup Script
# ================================================================
# Run this script on a fresh Ubuntu server (Lightsail/EC2)
# Usage: bash setup.sh
# ================================================================

set -e

echo "========================================"
echo "LibreClinica Part 11 Testing Setup"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}Warning: Running as root. Consider using a regular user with sudo.${NC}"
fi

# Step 1: Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}Docker installed. You may need to log out and back in.${NC}"
else
    echo -e "${GREEN}Docker already installed.${NC}"
fi

# Step 2: Install Docker Compose if not present
if ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}Installing Docker Compose plugin...${NC}"
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
    echo -e "${GREEN}Docker Compose installed.${NC}"
else
    echo -e "${GREEN}Docker Compose already installed.${NC}"
fi

# Step 3: Create .env file if not exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << 'EOF'
# LibreClinica Part 11 Testing Environment
# =========================================

# Database password (change this!)
DB_PASSWORD=LibreClinicaPart11Test!

# Your server URL (for LibreClinica system URL)
# Use your domain or IP address
LIBRECLINICA_URL=http://localhost

# Optional: Email settings for notifications
# MAIL_HOST=smtp.gmail.com
# MAIL_PORT=587
# MAIL_USERNAME=your-email@gmail.com
# MAIL_PASSWORD=your-app-password
# MAIL_SMTP_AUTH=true
# MAIL_SMTP_STARTTLS=true
EOF
    echo -e "${GREEN}.env file created. Edit it with your settings.${NC}"
else
    echo -e "${GREEN}.env file already exists.${NC}"
fi

# Step 4: Create certbot directories
mkdir -p certbot/conf certbot/www

# Step 5: Start services
echo ""
echo -e "${YELLOW}Starting LibreClinica...${NC}"
echo "This may take 2-3 minutes on first run."
echo ""

docker compose up -d

echo ""
echo -e "${GREEN}========================================"
echo "Setup Complete!"
echo "========================================${NC}"
echo ""
echo "LibreClinica is starting up. Wait 2-3 minutes, then access:"
echo ""
echo -e "  ${GREEN}http://$(hostname -I | awk '{print $1}')/LibreClinica/${NC}"
echo ""
echo "Default login:"
echo "  Username: root"
echo "  Password: 12345678"
echo ""
echo "Useful commands:"
echo "  View logs:     docker compose logs -f libreclinica"
echo "  Stop:          docker compose down"
echo "  Restart:       docker compose restart"
echo ""
echo "For SSL setup, see README.md"
echo ""

