#!/bin/bash
#
# Biz-Panel Auto-Update Script
# Checks for new versions from GitHub and updates automatically
#
# Usage: 
#   biz-panel update          # Check and update
#   biz-panel update --check  # Only check for updates
#   biz-panel update --force  # Force reinstall current version
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Config
INSTALL_DIR="/opt/biz-panel"
DATA_DIR="/var/lib/biz-panel"
LOG_DIR="/var/log/biz-panel"
VERSION_FILE="$INSTALL_DIR/version.json"
UPDATE_LOG="$LOG_DIR/update.log"

# GitHub repository (change this to your repo)
GITHUB_REPO="bizino-services/biz-panel"
GITHUB_API="https://api.github.com/repos/$GITHUB_REPO"
GITHUB_RAW="https://raw.githubusercontent.com/$GITHUB_REPO"

# Get current version
get_current_version() {
    if [ -f "$VERSION_FILE" ]; then
        cat "$VERSION_FILE" | grep '"version"' | sed 's/.*"version": *"\([^"]*\)".*/\1/'
    else
        echo "0.0.0"
    fi
}

# Get latest version from GitHub
get_latest_version() {
    # Try API first
    LATEST=$(curl -s "$GITHUB_API/releases/latest" 2>/dev/null | grep '"tag_name"' | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/' | tr -d 'v')
    
    if [ -z "$LATEST" ]; then
        # Fallback to raw file
        LATEST=$(curl -s "$GITHUB_RAW/main/version.json" 2>/dev/null | grep '"version"' | sed 's/.*"version": *"\([^"]*\)".*/\1/')
    fi
    
    echo "$LATEST"
}

# Compare versions (returns 1 if v1 > v2, 0 if equal, -1 if v1 < v2)
compare_versions() {
    local v1=$1
    local v2=$2
    
    # Split into arrays
    IFS='.' read -ra V1_ARR <<< "$v1"
    IFS='.' read -ra V2_ARR <<< "$v2"
    
    for i in 0 1 2; do
        local n1=${V1_ARR[$i]:-0}
        local n2=${V2_ARR[$i]:-0}
        
        if [ "$n1" -gt "$n2" ]; then
            echo "1"
            return
        elif [ "$n1" -lt "$n2" ]; then
            echo "-1"
            return
        fi
    done
    
    echo "0"
}

# Check for updates
check_update() {
    echo -e "${CYAN}Checking for updates...${NC}"
    
    CURRENT=$(get_current_version)
    LATEST=$(get_latest_version)
    
    if [ -z "$LATEST" ] || [ "$LATEST" = "null" ]; then
        echo -e "${YELLOW}⚠️  Could not check for updates (no internet or API limit)${NC}"
        return 1
    fi
    
    echo -e "Current version: ${YELLOW}$CURRENT${NC}"
    echo -e "Latest version:  ${GREEN}$LATEST${NC}"
    
    COMP=$(compare_versions "$LATEST" "$CURRENT")
    
    if [ "$COMP" = "1" ]; then
        echo ""
        echo -e "${GREEN}🎉 New version available: v$LATEST${NC}"
        return 0
    else
        echo ""
        echo -e "${GREEN}✓ You are running the latest version${NC}"
        return 2
    fi
}

# Download and install update
do_update() {
    local VERSION=$1
    local FORCE=$2
    
    CURRENT=$(get_current_version)
    
    if [ -z "$VERSION" ]; then
        VERSION=$(get_latest_version)
    fi
    
    if [ -z "$VERSION" ]; then
        echo -e "${RED}Error: Could not determine version to install${NC}"
        exit 1
    fi
    
    # Check if update needed
    if [ "$FORCE" != "true" ]; then
        COMP=$(compare_versions "$VERSION" "$CURRENT")
        if [ "$COMP" != "1" ]; then
            echo -e "${GREEN}✓ Already on version $CURRENT (target: $VERSION)${NC}"
            exit 0
        fi
    fi
    
    echo -e "${BLUE}Updating to version $VERSION...${NC}"
    echo "$(date): Starting update to v$VERSION" >> "$UPDATE_LOG"
    
    # Create backup
    echo -e "${CYAN}[1/5] Creating backup...${NC}"
    BACKUP_FILE="$DATA_DIR/backups/pre_update_$(date +%Y%m%d_%H%M%S).tar.gz"
    mkdir -p "$DATA_DIR/backups"
    tar -czf "$BACKUP_FILE" \
        -C "$INSTALL_DIR" . \
        -C /etc/biz-panel . 2>/dev/null || true
    echo "Backup created: $BACKUP_FILE" >> "$UPDATE_LOG"
    
    # Download new version
    echo -e "${CYAN}[2/5] Downloading v$VERSION...${NC}"
    DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/download/v$VERSION/biz-panel-$VERSION.tar.gz"
    TEMP_DIR=$(mktemp -d)
    
    if ! curl -sL "$DOWNLOAD_URL" -o "$TEMP_DIR/update.tar.gz"; then
        # Try alternative: clone and build
        echo "Direct download failed, trying git clone..."
        
        if ! command -v git &> /dev/null; then
            apt-get install -y git > /dev/null 2>&1 || yum install -y git > /dev/null 2>&1
        fi
        
        git clone --depth 1 --branch "v$VERSION" "https://github.com/$GITHUB_REPO.git" "$TEMP_DIR/repo" 2>/dev/null || \
        git clone --depth 1 "https://github.com/$GITHUB_REPO.git" "$TEMP_DIR/repo"
        
        cd "$TEMP_DIR/repo"
        
        # Build if Makefile exists
        if [ -f "Makefile" ]; then
            make build 2>/dev/null || true
        fi
        
        # Package files
        mkdir -p "$TEMP_DIR/package"
        cp -r backend/bin/biz-panel-server "$TEMP_DIR/package/" 2>/dev/null || true
        cp -r dist "$TEMP_DIR/package/web" 2>/dev/null || true
        cp version.json "$TEMP_DIR/package/" 2>/dev/null || true
    else
        # Extract downloaded package
        cd "$TEMP_DIR"
        tar -xzf update.tar.gz
        mv biz-panel-*/ package/
    fi
    
    # Stop service
    echo -e "${CYAN}[3/5] Stopping service...${NC}"
    systemctl stop biz-panel 2>/dev/null || true
    
    # Install new version
    echo -e "${CYAN}[4/5] Installing new version...${NC}"
    
    # Update binary
    if [ -f "$TEMP_DIR/package/biz-panel-server" ]; then
        cp "$TEMP_DIR/package/biz-panel-server" "$INSTALL_DIR/bin/"
        chmod +x "$INSTALL_DIR/bin/biz-panel-server"
    fi
    
    # Update web files
    if [ -d "$TEMP_DIR/package/web" ]; then
        rm -rf "$INSTALL_DIR/web"
        cp -r "$TEMP_DIR/package/web" "$INSTALL_DIR/"
    fi
    
    # Update version file
    if [ -f "$TEMP_DIR/package/version.json" ]; then
        cp "$TEMP_DIR/package/version.json" "$INSTALL_DIR/"
    else
        # Create version file
        cat > "$INSTALL_DIR/version.json" << EOF
{
  "version": "$VERSION",
  "build": "$(date +%Y%m%d)",
  "channel": "stable",
  "updatedAt": "$(date -Iseconds)"
}
EOF
    fi
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    # Start service
    echo -e "${CYAN}[5/5] Starting service...${NC}"
    systemctl start biz-panel 2>/dev/null || true
    
    # Verify
    sleep 2
    if systemctl is-active --quiet biz-panel; then
        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║     ✅ Update Complete!                                     ║${NC}"
        echo -e "${GREEN}╠════════════════════════════════════════════════════════════╣${NC}"
        echo -e "${GREEN}║${NC}  Previous version: $CURRENT                               ${GREEN}║${NC}"
        echo -e "${GREEN}║${NC}  Current version:  ${CYAN}$VERSION${NC}                               ${GREEN}║${NC}"
        echo -e "${GREEN}║${NC}  Backup saved to:  $BACKUP_FILE  ${GREEN}║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
        
        echo "$(date): Update to v$VERSION completed successfully" >> "$UPDATE_LOG"
    else
        echo -e "${RED}⚠️  Service failed to start after update${NC}"
        echo -e "${YELLOW}Rolling back...${NC}"
        
        # Rollback
        if [ -f "$BACKUP_FILE" ]; then
            cd "$INSTALL_DIR"
            tar -xzf "$BACKUP_FILE" --overwrite
            systemctl start biz-panel
        fi
        
        echo "$(date): Update to v$VERSION FAILED, rolled back" >> "$UPDATE_LOG"
        exit 1
    fi
}

# Auto-update check (for cron)
auto_check() {
    check_update > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        # New version available
        echo "New version available" > "$DATA_DIR/update_available"
        
        # Send notification (if configured)
        if [ -f "/etc/biz-panel/notify.sh" ]; then
            /etc/biz-panel/notify.sh "Biz-Panel: New version available"
        fi
    else
        rm -f "$DATA_DIR/update_available"
    fi
}

# Show release notes
show_release_notes() {
    VERSION=${1:-$(get_latest_version)}
    
    echo -e "${CYAN}Release Notes for v$VERSION:${NC}"
    echo ""
    
    NOTES=$(curl -s "$GITHUB_API/releases/tags/v$VERSION" 2>/dev/null | grep -oP '"body":\s*"\K[^"]+' | head -1)
    
    if [ -n "$NOTES" ]; then
        echo "$NOTES" | sed 's/\\n/\n/g' | sed 's/\\r//g'
    else
        echo "No release notes available."
        echo "Visit: https://github.com/$GITHUB_REPO/releases/tag/v$VERSION"
    fi
}

# Setup auto-update cron
setup_auto_update() {
    echo -e "${CYAN}Setting up automatic update checks...${NC}"
    
    # Create cron job to check daily at 3am
    CRON_CMD="0 3 * * * /usr/local/bin/biz-panel update --check >> $LOG_DIR/update.log 2>&1"
    
    # Add to crontab if not exists
    (crontab -l 2>/dev/null | grep -v "biz-panel update"; echo "$CRON_CMD") | crontab -
    
    echo -e "${GREEN}✓ Auto-update check scheduled (daily at 3:00 AM)${NC}"
    echo ""
    echo "To enable automatic updates (install new versions automatically):"
    echo "  Edit /etc/biz-panel/config.yaml and set:"
    echo "    auto_update: true"
}

# Main command handler
case "$1" in
    --check|-c)
        check_update
        ;;
    --force|-f)
        do_update "$2" "true"
        ;;
    --version|-v)
        VERSION=$2
        if [ -z "$VERSION" ]; then
            echo "Usage: biz-panel update --version <version>"
            exit 1
        fi
        do_update "$VERSION"
        ;;
    --notes|-n)
        show_release_notes "$2"
        ;;
    --auto)
        auto_check
        ;;
    --setup)
        setup_auto_update
        ;;
    --help|-h|"")
        echo -e "${CYAN}Biz-Panel Update Tool${NC}"
        echo ""
        echo "Usage: biz-panel update [options]"
        echo ""
        echo "Options:"
        echo "  (no args)        Check for updates and install if available"
        echo "  --check, -c      Only check for updates (don't install)"
        echo "  --force, -f      Force reinstall current version"
        echo "  --version, -v    Install specific version"
        echo "  --notes, -n      Show release notes"
        echo "  --setup          Setup automatic update checks"
        echo "  --help, -h       Show this help"
        echo ""
        echo "Examples:"
        echo "  biz-panel update            # Update to latest"
        echo "  biz-panel update --check    # Just check"
        echo "  biz-panel update -v 1.2.0   # Install v1.2.0"
        ;;
    *)
        # Default: check and update
        if check_update; then
            echo ""
            read -p "Do you want to update now? (y/n): " CONFIRM
            if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
                do_update
            else
                echo "Update cancelled."
            fi
        fi
        ;;
esac
