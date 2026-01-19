#!/bin/bash
#
# ╔══════════════════════════════════════════════════════════════════╗
# ║                    BIZ-PANEL INSTALLER v1.0                      ║
# ║              One-Click Server Management Panel                   ║
# ╚══════════════════════════════════════════════════════════════════╝
#
# Usage: curl -fsSL https://raw.githubusercontent.com/your-repo/biz-panel/main/scripts/install.sh | bash
# Or:    bash <(curl -fsSL https://your-domain.com/install.sh)
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/biz-panel"
SERVICE_NAME="biz-panel"
PORT="${BIZ_PANEL_PORT:-5173}"
NODE_VERSION="20"
REPO_URL="https://github.com/your-org/biz-panel.git"  # Replace with actual repo

# Get VPS IP
get_ip() {
    # Try multiple methods to get public IP
    IP=$(curl -s -4 ifconfig.me 2>/dev/null || \
         curl -s -4 icanhazip.com 2>/dev/null || \
         curl -s -4 ipinfo.io/ip 2>/dev/null || \
         hostname -I | awk '{print $1}')
    echo "$IP"
}

VPS_IP=$(get_ip)

# Print banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                  ║"
    echo "║   ██████╗ ██╗███████╗    ██████╗  █████╗ ███╗   ██╗███████╗██╗   ║"
    echo "║   ██╔══██╗██║╚══███╔╝    ██╔══██╗██╔══██╗████╗  ██║██╔════╝██║   ║"
    echo "║   ██████╔╝██║  ███╔╝     ██████╔╝███████║██╔██╗ ██║█████╗  ██║   ║"
    echo "║   ██╔══██╗██║ ███╔╝      ██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║   ║"
    echo "║   ██████╔╝██║███████╗    ██║     ██║  ██║██║ ╚████║███████╗███████╗"
    echo "║   ╚═════╝ ╚═╝╚══════╝    ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝"
    echo "║                                                                  ║"
    echo "║              Modern Server Management Panel                      ║"
    echo "║                      Installer v1.0                              ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Print step
step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}📦 $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Print success
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Print warning
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Print error
error() {
    echo -e "${RED}✗ $1${NC}"
}

# Print info
info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        echo "Please run: sudo bash install.sh"
        exit 1
    fi
}

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        error "Cannot detect OS. Only Ubuntu/Debian are supported."
        exit 1
    fi
    
    case $OS in
        ubuntu|debian)
            success "Detected: $PRETTY_NAME"
            ;;
        *)
            warning "Unsupported OS: $OS. Continuing anyway..."
            ;;
    esac
}

# Install Node.js
install_nodejs() {
    step "Installing Node.js ${NODE_VERSION}.x"
    
    if command -v node &> /dev/null; then
        CURRENT_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$CURRENT_VERSION" -ge "$NODE_VERSION" ]; then
            success "Node.js $(node -v) already installed"
            return
        fi
    fi
    
    info "Installing Node.js from NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
    
    success "Node.js $(node -v) installed"
    success "npm $(npm -v) installed"
}

# Install system dependencies
install_dependencies() {
    step "Installing system dependencies"
    
    apt-get update > /dev/null 2>&1
    apt-get install -y \
        curl \
        git \
        build-essential \
        > /dev/null 2>&1
    
    success "System dependencies installed"
}

# Clone or update repository
setup_repository() {
    step "Setting up Biz-Panel"
    
    if [ -d "$INSTALL_DIR" ]; then
        info "Updating existing installation..."
        cd "$INSTALL_DIR"
        git fetch --all > /dev/null 2>&1 || true
        git reset --hard origin/main > /dev/null 2>&1 || true
        success "Repository updated"
    else
        # For local installation (when repo doesn't exist yet)
        if [ -d "/home/biz-panel" ]; then
            info "Copying from local source..."
            mkdir -p "$INSTALL_DIR"
            cp -r /home/biz-panel/* "$INSTALL_DIR/"
            success "Files copied to $INSTALL_DIR"
        else
            info "Cloning repository..."
            git clone "$REPO_URL" "$INSTALL_DIR" > /dev/null 2>&1
            success "Repository cloned"
        fi
    fi
    
    cd "$INSTALL_DIR"
}

# Install npm dependencies
install_npm_deps() {
    step "Installing npm dependencies"
    
    cd "$INSTALL_DIR"
    npm install --production=false > /dev/null 2>&1
    
    success "npm dependencies installed"
}

# Build the application
build_app() {
    step "Building application"
    
    cd "$INSTALL_DIR"
    npm run build > /dev/null 2>&1
    
    success "Application built successfully"
}

# Create systemd service
create_service() {
    step "Creating systemd service"
    
    cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=Biz-Panel Server Management
Documentation=https://github.com/your-org/biz-panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port ${PORT}
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=biz-panel
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable ${SERVICE_NAME} > /dev/null 2>&1
    systemctl restart ${SERVICE_NAME}
    
    success "Service created and started"
}

# Configure firewall
configure_firewall() {
    step "Configuring firewall"
    
    if command -v ufw &> /dev/null; then
        ufw allow ${PORT}/tcp > /dev/null 2>&1 || true
        success "Port ${PORT} opened in UFW"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=${PORT}/tcp > /dev/null 2>&1 || true
        firewall-cmd --reload > /dev/null 2>&1 || true
        success "Port ${PORT} opened in firewalld"
    else
        warning "No firewall detected. Make sure port ${PORT} is accessible."
    fi
}

# Print completion message
print_completion() {
    echo ""
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                  ║"
    echo "║            🎉 BIZ-PANEL INSTALLED SUCCESSFULLY! 🎉               ║"
    echo "║                                                                  ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  📍 Access Biz-Panel:${NC}"
    echo ""
    echo -e "     ${WHITE}🌐 URL:${NC}  ${GREEN}http://${VPS_IP}:${PORT}${NC}"
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}  📚 Quick Commands:${NC}"
    echo ""
    echo -e "     ${YELLOW}Start:${NC}    systemctl start ${SERVICE_NAME}"
    echo -e "     ${YELLOW}Stop:${NC}     systemctl stop ${SERVICE_NAME}"
    echo -e "     ${YELLOW}Restart:${NC}  systemctl restart ${SERVICE_NAME}"
    echo -e "     ${YELLOW}Status:${NC}   systemctl status ${SERVICE_NAME}"
    echo -e "     ${YELLOW}Logs:${NC}     journalctl -u ${SERVICE_NAME} -f"
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${PURPLE}  💡 Installation Directory: ${INSTALL_DIR}${NC}"
    echo -e "${PURPLE}  💡 Service Name: ${SERVICE_NAME}${NC}"
    echo -e "${PURPLE}  💡 Port: ${PORT}${NC}"
    echo ""
    echo -e "${WHITE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Main installation
main() {
    print_banner
    
    check_root
    detect_os
    install_dependencies
    install_nodejs
    setup_repository
    install_npm_deps
    build_app
    create_service
    configure_firewall
    
    print_completion
}

# Run main
main "$@"
