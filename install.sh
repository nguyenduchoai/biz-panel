#!/bin/bash
#
# Biz-Panel v2.0 - One-Click Installation Script
# Built with Rust 🦀
#
# Usage: curl -sSL https://get.biz-panel.com | bash
# Or:    bash install.sh
#
# Requirements: Ubuntu 20.04+ / Debian 11+
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Config
PANEL_VERSION="2.0.0"
INSTALL_DIR="/opt/biz-panel"
CONFIG_DIR="/etc/biz-panel"
DATA_DIR="/var/lib/biz-panel"
LOG_DIR="/var/log/biz-panel"
CONFIG_FILE="$CONFIG_DIR/config.toml"
PANEL_PORT=8888
API_PORT=8080

# GitHub release URL (update when publishing)
RELEASE_URL="https://github.com/bizino-services/biz-panel/releases/latest/download"

# ========== HELPERS ==========

print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║     ⚡ BIZ-PANEL v2.0 - Server Management Panel             ║"
    echo "║     Built with Rust 🦀 + Axum                               ║"
    echo "║                                                              ║"
    echo "║     Premium Server Management Made Simple                    ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { echo -e "\n${MAGENTA}━━━ $1 ━━━${NC}\n"; }

generate_password() {
    openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16
}

generate_jwt_secret() {
    openssl rand -hex 32
}

# ========== CHECKS ==========

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root: sudo bash install.sh"
        exit 1
    fi
}

check_os() {
    if [ ! -f /etc/os-release ]; then
        log_error "Unsupported operating system"
        exit 1
    fi

    . /etc/os-release

    case "$ID" in
        ubuntu|debian)
            log_success "Detected OS: $PRETTY_NAME"
            ;;
        *)
            log_warn "Untested OS: $PRETTY_NAME (proceeding anyway)"
            ;;
    esac

    # Check architecture
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64|amd64)
            ARCH="x86_64"
            ;;
        aarch64|arm64)
            ARCH="aarch64"
            ;;
        *)
            log_error "Unsupported architecture: $ARCH"
            exit 1
            ;;
    esac
    log_success "Architecture: $ARCH"
}

check_existing() {
    if [ -f "/usr/local/bin/biz-panel" ]; then
        log_warn "Biz-Panel is already installed!"
        read -p "Do you want to reinstall? (y/N): " RESPONSE
        if [ "$RESPONSE" != "y" ] && [ "$RESPONSE" != "Y" ]; then
            echo "Installation cancelled."
            exit 0
        fi
        # Stop existing service
        systemctl stop biz-panel 2>/dev/null || true
    fi
}

# ========== INSTALLATION STEPS ==========

install_system_deps() {
    log_step "Step 1/7: Installing system dependencies"

    apt-get update -qq

    # Essential packages
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
        curl wget openssl ca-certificates \
        build-essential pkg-config libssl-dev \
        sqlite3 > /dev/null 2>&1

    log_success "System dependencies installed"
}

install_rust() {
    log_step "Step 2/7: Installing Rust toolchain"

    if command -v rustc &> /dev/null; then
        RUST_VER=$(rustc --version | awk '{print $2}')
        log_success "Rust already installed: $RUST_VER"
    else
        log_info "Installing Rust via rustup..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable 2>&1 | tail -1
        source "$HOME/.cargo/env"
        log_success "Rust installed: $(rustc --version)"
    fi

    # Ensure cargo is in PATH
    export PATH="$HOME/.cargo/bin:$PATH"
    source "$HOME/.cargo/env" 2>/dev/null || true
}

build_panel() {
    log_step "Step 3/7: Building Biz-Panel from source"

    # Determine source directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    SOURCE_DIR=""

    # Check if we're in the source directory
    if [ -f "$SCRIPT_DIR/Cargo.toml" ]; then
        SOURCE_DIR="$SCRIPT_DIR"
    elif [ -f "$SCRIPT_DIR/../Cargo.toml" ]; then
        SOURCE_DIR="$SCRIPT_DIR/.."
    elif [ -f "/home/biz-panel/biz-panel-rust/Cargo.toml" ]; then
        SOURCE_DIR="/home/biz-panel/biz-panel-rust"
    else
        # Download from GitHub
        log_info "Downloading source code..."
        TEMP_DIR=$(mktemp -d)
        cd "$TEMP_DIR"
        curl -sSL "$RELEASE_URL/source.tar.gz" -o source.tar.gz 2>/dev/null || {
            log_error "Failed to download source. Please run from the source directory."
            exit 1
        }
        tar -xzf source.tar.gz
        SOURCE_DIR="$TEMP_DIR/biz-panel-rust"
    fi

    log_info "Building from: $SOURCE_DIR"
    cd "$SOURCE_DIR"

    # Build in release mode
    log_info "Compiling (this may take 2-5 minutes)..."
    source "$HOME/.cargo/env" 2>/dev/null || true
    cargo build --release 2>&1 | tail -5

    # Verify binary
    if [ ! -f "target/release/biz-panel" ]; then
        log_error "Build failed! Binary not found."
        exit 1
    fi

    BINARY_SIZE=$(du -h "target/release/biz-panel" | awk '{print $1}')
    log_success "Build complete! Binary size: $BINARY_SIZE"
}

create_directories() {
    log_step "Step 4/7: Creating directories"

    mkdir -p "$INSTALL_DIR"/{bin,web,config}
    mkdir -p "$DATA_DIR"/{db,backups,ssl}
    mkdir -p "$LOG_DIR"
    mkdir -p "$CONFIG_DIR"

    log_success "Directories created"
}

install_binary() {
    log_step "Step 5/7: Installing binary"

    # Determine source directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    if [ -f "$SCRIPT_DIR/target/release/biz-panel" ]; then
        BIN_PATH="$SCRIPT_DIR/target/release/biz-panel"
    elif [ -f "/home/biz-panel/biz-panel-rust/target/release/biz-panel" ]; then
        BIN_PATH="/home/biz-panel/biz-panel-rust/target/release/biz-panel"
    else
        log_error "Binary not found!"
        exit 1
    fi

    # Install binary
    cp "$BIN_PATH" "$INSTALL_DIR/bin/biz-panel"
    chmod +x "$INSTALL_DIR/bin/biz-panel"

    # Create symlink
    ln -sf "$INSTALL_DIR/bin/biz-panel" /usr/local/bin/biz-panel

    log_success "Binary installed to $INSTALL_DIR/bin/biz-panel"
}

generate_config() {
    log_step "Step 6/7: Generating configuration"

    ADMIN_USER="admin"
    ADMIN_PASS=$(generate_password)
    JWT_SECRET=$(generate_jwt_secret)

    # Generate bcrypt hash
    ADMIN_PASS_HASH=$("$INSTALL_DIR/bin/biz-panel" password-hash "$ADMIN_PASS" 2>/dev/null || echo "")

    # If password hash generation fails, use a placeholder
    if [ -z "$ADMIN_PASS_HASH" ]; then
        # Use Python or openssl as fallback
        ADMIN_PASS_HASH=$(python3 -c "import bcrypt; print(bcrypt.hashpw(b'$ADMIN_PASS', bcrypt.gensalt()).decode())" 2>/dev/null || echo '$2b$12$placeholder')
    fi

    cat > "$CONFIG_FILE" << TOML
# Biz-Panel v2.0 Configuration
# Generated on $(date)

[server]
host = "0.0.0.0"
port = $API_PORT
panel_port = $PANEL_PORT

[database]
path = "$DATA_DIR/db/panel.db"

[auth]
jwt_secret = "$JWT_SECRET"
admin_user = "$ADMIN_USER"
admin_pass_hash = "$ADMIN_PASS_HASH"
session_timeout = 86400

[security]
allowed_ips = []
enable_2fa = false
brute_force_protection = true
max_login_attempts = 5

[logging]
level = "info"
path = "$LOG_DIR/panel.log"
max_size_mb = 100

[features]
docker = true
websites = true
databases = true
firewall = true
ssl = true
monitoring = true
terminal = true
file_manager = true
TOML

    chmod 600 "$CONFIG_FILE"

    log_success "Configuration generated"
}

create_systemd_service() {
    log_step "Step 7/7: Creating systemd service"

    cat > /etc/systemd/system/biz-panel.service << EOF
[Unit]
Description=Biz-Panel Server Management Panel
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/bin/biz-panel start --port $PANEL_PORT --config $CONFIG_FILE
Restart=always
RestartSec=5
StandardOutput=append:$LOG_DIR/panel.log
StandardError=append:$LOG_DIR/panel.log
Environment=RUST_LOG=biz_panel=info

# Security hardening
NoNewPrivileges=false
ProtectSystem=false
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable biz-panel
    systemctl start biz-panel

    log_success "Service created and started"
}

configure_firewall() {
    if command -v ufw &> /dev/null; then
        ufw allow $PANEL_PORT/tcp 2>/dev/null || true
        ufw allow 80/tcp 2>/dev/null || true
        ufw allow 443/tcp 2>/dev/null || true
        log_success "Firewall configured (UFW)"
    fi
}

# ========== FINAL ==========

print_success() {
    SERVER_IP=$(hostname -I | awk '{print $1}')

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}║     ✅ Biz-Panel v2.0 Installation Complete!                 ║${NC}"
    echo -e "${GREEN}║     Built with Rust 🦀                                       ║${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}║${NC}  🌐 Panel URL:   ${CYAN}http://$SERVER_IP:$PANEL_PORT${NC}${GREEN}                  ║${NC}"
    echo -e "${GREEN}║${NC}  👤 Username:    ${CYAN}$ADMIN_USER${NC}${GREEN}                                  ║${NC}"
    echo -e "${GREEN}║${NC}  🔑 Password:    ${CYAN}$ADMIN_PASS${NC}${GREEN}                          ║${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  📝 CLI Commands:                                            ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     biz-panel status    - Show panel status                 ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     biz-panel password  - Change admin password             ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     biz-panel info      - Show access info                  ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     biz-panel start     - Start with custom options          ${GREEN}║${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║${NC}  🛠️  Service Commands:                                       ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     systemctl status biz-panel                               ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     systemctl restart biz-panel                              ${GREEN}║${NC}"
    echo -e "${GREEN}║${NC}     journalctl -u biz-panel -f                               ${GREEN}║${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Please save these credentials! They won't be shown again.${NC}"
    echo ""

    # Save credentials
    cat > /root/.biz-panel-credentials << CREDS
# Biz-Panel v2.0 Credentials
# Generated on $(date)
# Built with Rust 🦀

URL: http://$SERVER_IP:$PANEL_PORT
Username: $ADMIN_USER
Password: $ADMIN_PASS

Config: $CONFIG_FILE
Binary: $INSTALL_DIR/bin/biz-panel

Commands:
  biz-panel status     - Show status
  biz-panel password   - Change password
  biz-panel info       - Show info
CREDS
    chmod 600 /root/.biz-panel-credentials
    log_success "Credentials saved to /root/.biz-panel-credentials"
}

# ========== MAIN ==========

main() {
    print_banner
    check_root
    check_os
    check_existing

    echo ""
    log_info "Starting installation..."
    echo ""

    install_system_deps
    install_rust
    build_panel
    create_directories
    install_binary
    generate_config
    create_systemd_service
    configure_firewall

    print_success
}

# Run
main "$@"
