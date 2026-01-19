#!/bin/bash
#
# Biz-Panel Development Server
# Starts both frontend and backend simultaneously
#

set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get VPS IP
VPS_IP=$(curl -s -4 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

# Ports
FRONTEND_PORT=5173
BACKEND_PORT=8080

# Check if backend binary exists
if [ ! -f "backend/bin/biz-panel-server" ]; then
    echo -e "${YELLOW}Building backend...${NC}"
    cd backend
    export PATH=$PATH:/usr/local/go/bin
    go build -o bin/biz-panel-server ./cmd/server
    cd ..
    echo -e "${GREEN}✓ Backend built${NC}"
fi

# Banner
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              🚀 BIZ-PANEL DEVELOPMENT SERVER                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Kill existing processes
echo -e "${YELLOW}Stopping existing processes...${NC}"
pkill -f "biz-panel-server" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Start backend in background
echo -e "${YELLOW}Starting backend on :${BACKEND_PORT}...${NC}"
cd backend
./bin/biz-panel-server &
BACKEND_PID=$!
cd ..
sleep 2

# Check if backend started
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✓ Backend running (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}✗ Backend failed to start${NC}"
    exit 1
fi

# Create .env for frontend
cat > .env.local << EOF
VITE_API_URL=http://${VPS_IP}:${BACKEND_PORT}/api
VITE_WS_URL=ws://${VPS_IP}:${BACKEND_PORT}/api
EOF

echo -e "${GREEN}✓ Environment configured${NC}"

# Print access info
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Biz-Panel is starting!${NC}"
echo ""
echo -e "   🌐 Frontend:  ${GREEN}http://${VPS_IP}:${FRONTEND_PORT}${NC}"
echo -e "   🔧 Backend:   ${GREEN}http://${VPS_IP}:${BACKEND_PORT}${NC}"
echo -e "   📡 API:       ${GREEN}http://${VPS_IP}:${BACKEND_PORT}/api${NC}"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Trap to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Stopped${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start frontend in foreground
npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT
