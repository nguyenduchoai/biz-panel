#!/bin/bash
#
# Biz-Panel Quick Setup - Development Mode
# Run: bash setup.sh
#

set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get VPS IP
VPS_IP=$(curl -s -4 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
PORT=5173

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              BIZ-PANEL QUICK SETUP                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Installing Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
    sudo apt-get install -y nodejs > /dev/null 2>&1
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Build
echo -e "${YELLOW}Building...${NC}"
npm run build > /dev/null 2>&1
echo -e "${GREEN}✓ Build completed${NC}"

# Start server
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Biz-Panel is ready!${NC}"
echo ""
echo -e "   🌐 Access: ${GREEN}http://${VPS_IP}:${PORT}${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Starting development server...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Run dev server
npm run dev -- --host 0.0.0.0 --port $PORT
