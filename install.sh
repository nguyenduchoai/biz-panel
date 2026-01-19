#!/bin/bash
#
# Biz-Panel Installation Script
# One-click server management panel installation
# 
# Usage: curl -sSL https://get.biz-panel.com | bash
# Or: bash install.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Config
INSTALL_DIR="/opt/biz-panel"
DATA_DIR="/var/lib/biz-panel"
LOG_DIR="/var/log/biz-panel"
CONFIG_FILE="/etc/biz-panel/config.yaml"
PANEL_PORT=8888
API_PORT=8080

# Generate random password
generate_password() {
    openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 16
}

# Generate random username
generate_username() {
    echo "admin_$(openssl rand -hex 3)"
}

# Print banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║     ⚡ BIZ-PANEL - Server Management Panel                ║"
    echo "║                                                            ║"
    echo "║     Premium Server Management Made Simple                  ║"
    echo "║     Version: 1.1.0                                         ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}Error: Please run as root (sudo)${NC}"
        exit 1
    fi
}

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    else
        echo -e "${RED}Error: Unsupported operating system${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Detected OS: ${OS} ${OS_VERSION}${NC}"
}

# Install dependencies
install_dependencies() {
    echo -e "${BLUE}[1/7] Installing dependencies...${NC}"
    
    case $OS in
        ubuntu|debian)
            apt-get update -qq
            apt-get install -y -qq curl wget git nginx docker.io docker-compose openssl sqlite3 > /dev/null 2>&1
            ;;
        centos|rhel|rocky|almalinux)
            yum install -y -q curl wget git nginx docker docker-compose openssl sqlite > /dev/null 2>&1
            ;;
        *)
            echo -e "${RED}Error: Unsupported OS: $OS${NC}"
            exit 1
            ;;
    esac
    
    # Start Docker
    systemctl enable docker --now 2>/dev/null || true
    
    echo -e "${GREEN}✓ Dependencies installed${NC}"
}

# Create directories
create_directories() {
    echo -e "${BLUE}[2/7] Creating directories...${NC}"
    
    mkdir -p "$INSTALL_DIR"/{bin,web,config}
    mkdir -p "$DATA_DIR"/{db,backups,ssl}
    mkdir -p "$LOG_DIR"
    mkdir -p /etc/biz-panel
    
    echo -e "${GREEN}✓ Directories created${NC}"
}

# Generate credentials
generate_credentials() {
    echo -e "${BLUE}[3/7] Generating credentials...${NC}"
    
    ADMIN_USER=$(generate_username)
    ADMIN_PASS=$(generate_password)
    JWT_SECRET=$(openssl rand -hex 32)
    
    # Hash password with bcrypt (using openssl)
    ADMIN_PASS_HASH=$(echo -n "$ADMIN_PASS" | openssl passwd -6 -stdin)
    
    echo -e "${GREEN}✓ Credentials generated${NC}"
}

# Create configuration
create_config() {
    echo -e "${BLUE}[4/7] Creating configuration...${NC}"
    
    cat > "$CONFIG_FILE" << EOF
# Biz-Panel Configuration
# Generated on $(date)

server:
  host: 0.0.0.0
  port: $API_PORT
  panel_port: $PANEL_PORT

database:
  driver: sqlite
  path: $DATA_DIR/db/biz-panel.db

auth:
  jwt_secret: $JWT_SECRET
  session_timeout: 86400

admin:
  username: $ADMIN_USER
  password_hash: $ADMIN_PASS_HASH

security:
  allowed_ips: []
  enable_2fa: false

logging:
  level: info
  path: $LOG_DIR/biz-panel.log
  max_size: 100M
  max_backups: 7

features:
  docker: true
  websites: true
  databases: true
  firewall: true
  ssl: true
  monitoring: true
EOF

    chmod 600 "$CONFIG_FILE"
    
    echo -e "${GREEN}✓ Configuration created${NC}"
}

# Download and install binaries
install_binaries() {
    echo -e "${BLUE}[5/7] Installing Biz-Panel...${NC}"
    
    # For local development - copy from current directory
    if [ -f "./backend/bin/biz-panel-server" ]; then
        cp ./backend/bin/biz-panel-server "$INSTALL_DIR/bin/"
    fi
    
    if [ -d "./dist" ]; then
        cp -r ./dist/* "$INSTALL_DIR/web/"
    fi
    
    # Create CLI tool
    cat > "$INSTALL_DIR/bin/biz-panel" << 'EOFCLI'
#!/bin/bash
#
# Biz-Panel CLI Tool
# Usage: biz-panel <command> [options]
#

CONFIG_FILE="/etc/biz-panel/config.yaml"
INSTALL_DIR="/opt/biz-panel"
LOG_DIR="/var/log/biz-panel"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

show_help() {
    echo -e "${CYAN}Biz-Panel CLI v1.1.0${NC}"
    echo ""
    echo "Usage: biz-panel <command> [options]"
    echo ""
    echo "Commands:"
    echo "  status          Show panel status"
    echo "  start           Start panel service"
    echo "  stop            Stop panel service"
    echo "  restart         Restart panel service"
    echo "  password        Change admin password"
    echo "  username        Show admin username"
    echo "  info            Show access information"
    echo "  logs            View panel logs"
    echo "  update          Update to latest version"
    echo "  backup          Backup panel data"
    echo "  restore         Restore from backup"
    echo "  port            Change panel port"
    echo "  ssl             Configure SSL certificate"
    echo "  firewall        Manage firewall"
    echo "  uninstall       Remove Biz-Panel"
    echo ""
    echo "Examples:"
    echo "  biz-panel password        # Change admin password"
    echo "  biz-panel port 9999       # Change panel port to 9999"
    echo "  biz-panel logs -f         # Follow logs in real-time"
}

show_status() {
    echo -e "${CYAN}=== Biz-Panel Status ===${NC}"
    echo ""
    
    if systemctl is-active --quiet biz-panel; then
        echo -e "Service:  ${GREEN}● Running${NC}"
    else
        echo -e "Service:  ${RED}● Stopped${NC}"
    fi
    
    # Get port from config
    PANEL_PORT=$(grep "panel_port:" "$CONFIG_FILE" 2>/dev/null | awk '{print $2}' || echo "8888")
    API_PORT=$(grep "port:" "$CONFIG_FILE" 2>/dev/null | head -1 | awk '{print $2}' || echo "8080")
    
    echo "Panel:    http://$(hostname -I | awk '{print $1}'):$PANEL_PORT"
    echo "API:      http://$(hostname -I | awk '{print $1}'):$API_PORT"
    echo ""
    
    # System resources
    echo -e "${CYAN}=== System Resources ===${NC}"
    echo "CPU:      $(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}')%"
    echo "Memory:   $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
    echo "Disk:     $(df -h / | awk 'NR==2{print $5}')"
}

change_password() {
    echo -e "${CYAN}=== Change Admin Password ===${NC}"
    echo ""
    
    # Read new password
    read -sp "Enter new password: " NEW_PASS
    echo ""
    read -sp "Confirm new password: " CONFIRM_PASS
    echo ""
    
    if [ "$NEW_PASS" != "$CONFIRM_PASS" ]; then
        echo -e "${RED}Error: Passwords do not match${NC}"
        exit 1
    fi
    
    if [ ${#NEW_PASS} -lt 8 ]; then
        echo -e "${RED}Error: Password must be at least 8 characters${NC}"
        exit 1
    fi
    
    # Hash new password
    NEW_HASH=$(echo -n "$NEW_PASS" | openssl passwd -6 -stdin)
    
    # Update config
    sed -i "s|password_hash:.*|password_hash: $NEW_HASH|" "$CONFIG_FILE"
    
    # Restart service
    systemctl restart biz-panel 2>/dev/null || true
    
    echo -e "${GREEN}✓ Password changed successfully${NC}"
}

show_username() {
    USERNAME=$(grep "username:" "$CONFIG_FILE" | awk '{print $2}')
    echo -e "Admin Username: ${GREEN}$USERNAME${NC}"
}

show_info() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              Biz-Panel Access Information                  ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo -e "║  ${NC}Panel URL:${CYAN}  http://$(hostname -I | awk '{print $1}'):8888        ║"
    echo -e "║  ${NC}Username:${CYAN}   $(grep 'username:' $CONFIG_FILE | awk '{print $2}')                              ║"
    echo -e "║  ${NC}Password:${CYAN}   [Use 'biz-panel password' to change]   ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

view_logs() {
    if [ "$1" == "-f" ]; then
        tail -f "$LOG_DIR/biz-panel.log"
    else
        tail -100 "$LOG_DIR/biz-panel.log"
    fi
}

change_port() {
    NEW_PORT=$1
    
    if [ -z "$NEW_PORT" ]; then
        read -p "Enter new port: " NEW_PORT
    fi
    
    if ! [[ "$NEW_PORT" =~ ^[0-9]+$ ]] || [ "$NEW_PORT" -lt 1 ] || [ "$NEW_PORT" -gt 65535 ]; then
        echo -e "${RED}Error: Invalid port number${NC}"
        exit 1
    fi
    
    sed -i "s|panel_port:.*|panel_port: $NEW_PORT|" "$CONFIG_FILE"
    systemctl restart biz-panel 2>/dev/null || true
    
    echo -e "${GREEN}✓ Port changed to $NEW_PORT${NC}"
    echo -e "Access panel at: http://$(hostname -I | awk '{print $1}'):$NEW_PORT"
}

do_backup() {
    BACKUP_FILE="/var/lib/biz-panel/backups/backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    echo "Creating backup..."
    tar -czf "$BACKUP_FILE" \
        -C /var/lib/biz-panel/db . \
        -C /etc/biz-panel . \
        2>/dev/null
    
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
}

do_uninstall() {
    echo -e "${YELLOW}Warning: This will remove Biz-Panel and all data!${NC}"
    read -p "Are you sure? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo "Cancelled"
        exit 0
    fi
    
    systemctl stop biz-panel 2>/dev/null || true
    systemctl disable biz-panel 2>/dev/null || true
    
    rm -rf /opt/biz-panel
    rm -rf /var/lib/biz-panel
    rm -rf /var/log/biz-panel
    rm -rf /etc/biz-panel
    rm -f /etc/systemd/system/biz-panel.service
    rm -f /usr/local/bin/biz-panel
    
    systemctl daemon-reload
    
    echo -e "${GREEN}✓ Biz-Panel uninstalled${NC}"
}

# Main command handler
case "$1" in
    status)
        show_status
        ;;
    start)
        systemctl start biz-panel
        echo -e "${GREEN}✓ Biz-Panel started${NC}"
        ;;
    stop)
        systemctl stop biz-panel
        echo -e "${GREEN}✓ Biz-Panel stopped${NC}"
        ;;
    restart)
        systemctl restart biz-panel
        echo -e "${GREEN}✓ Biz-Panel restarted${NC}"
        ;;
    password)
        change_password
        ;;
    username)
        show_username
        ;;
    info)
        show_info
        ;;
    logs)
        view_logs "$2"
        ;;
    port)
        change_port "$2"
        ;;
    backup)
        do_backup
        ;;
    update)
        # Run update script
        if [ -f "$INSTALL_DIR/scripts/update.sh" ]; then
            bash "$INSTALL_DIR/scripts/update.sh" "$2" "$3"
        else
            echo -e "${CYAN}Downloading update tool...${NC}"
            curl -sL "https://raw.githubusercontent.com/bizino-services/biz-panel/main/scripts/update.sh" -o /tmp/update.sh
            bash /tmp/update.sh "$2" "$3"
            rm -f /tmp/update.sh
        fi
        ;;
    version)
        if [ -f "$INSTALL_DIR/version.json" ]; then
            VERSION=$(cat "$INSTALL_DIR/version.json" | grep '"version"' | sed 's/.*"version": *"\([^"]*\)".*/\1/')
            BUILD=$(cat "$INSTALL_DIR/version.json" | grep '"build"' | sed 's/.*"build": *"\([^"]*\)".*/\1/')
            echo -e "Biz-Panel ${GREEN}v$VERSION${NC} (build $BUILD)"
        else
            echo -e "Biz-Panel ${GREEN}v1.1.0${NC}"
        fi
        ;;
    uninstall)
        do_uninstall
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Run 'biz-panel help' for usage"
        exit 1
        ;;
esac
EOFCLI

    chmod +x "$INSTALL_DIR/bin/biz-panel"
    ln -sf "$INSTALL_DIR/bin/biz-panel" /usr/local/bin/biz-panel
    
    echo -e "${GREEN}✓ Biz-Panel installed${NC}"
}

# Create systemd service
create_service() {
    echo -e "${BLUE}[6/7] Creating system service...${NC}"
    
    cat > /etc/systemd/system/biz-panel.service << EOF
[Unit]
Description=Biz-Panel Server Management
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/bin/biz-panel-server -config $CONFIG_FILE
Restart=always
RestartSec=5
StandardOutput=append:$LOG_DIR/biz-panel.log
StandardError=append:$LOG_DIR/biz-panel.log

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable biz-panel
    
    echo -e "${GREEN}✓ Service created${NC}"
}

# Configure firewall
configure_firewall() {
    echo -e "${BLUE}[7/7] Configuring firewall...${NC}"
    
    # UFW (Ubuntu/Debian)
    if command -v ufw &> /dev/null; then
        ufw allow $PANEL_PORT/tcp 2>/dev/null || true
        ufw allow $API_PORT/tcp 2>/dev/null || true
        ufw allow 80/tcp 2>/dev/null || true
        ufw allow 443/tcp 2>/dev/null || true
    fi
    
    # Firewalld (CentOS/RHEL)
    if command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=$PANEL_PORT/tcp 2>/dev/null || true
        firewall-cmd --permanent --add-port=$API_PORT/tcp 2>/dev/null || true
        firewall-cmd --permanent --add-port=80/tcp 2>/dev/null || true
        firewall-cmd --permanent --add-port=443/tcp 2>/dev/null || true
        firewall-cmd --reload 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓ Firewall configured${NC}"
}

# Print success message
print_success() {
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}║     ✅ Biz-Panel Installation Complete!                    ║${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}║${NC}  🌐 Panel URL:   ${CYAN}http://$SERVER_IP:$PANEL_PORT${NC}              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  👤 Username:    ${CYAN}$ADMIN_USER${NC}                          ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}  🔑 Password:    ${CYAN}$ADMIN_PASS${NC}                      ${GREEN}║${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  📝 CLI Commands:                                          ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     biz-panel status    - Show status                     ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     biz-panel password  - Change password                 ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     biz-panel logs      - View logs                       ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     biz-panel help      - Show all commands               ${GREEN}║${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Please save these credentials! They won't be shown again.${NC}"
    echo ""
    
    # Save credentials to file (readable only by root)
    cat > /root/.biz-panel-credentials << EOF
# Biz-Panel Credentials
# Generated on $(date)

URL: http://$SERVER_IP:$PANEL_PORT
Username: $ADMIN_USER
Password: $ADMIN_PASS

Note: Use 'biz-panel password' to change password
EOF
    chmod 600 /root/.biz-panel-credentials
    
    echo -e "${GREEN}Credentials saved to: /root/.biz-panel-credentials${NC}"
}

# Main installation flow
main() {
    print_banner
    check_root
    detect_os
    install_dependencies
    create_directories
    generate_credentials
    create_config
    install_binaries
    create_service
    configure_firewall
    
    # Start service
    systemctl start biz-panel 2>/dev/null || true
    
    print_success
}

# Run installation
main "$@"
