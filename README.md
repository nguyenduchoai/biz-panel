# ⚡ Biz-Panel v2.0

> **Premium Server Management Panel** — Built with Rust 🦀

A modern, blazing-fast server management panel built entirely in **Rust** using Axum. Single binary deployment with embedded frontend — no Node.js, no React, no Go required.

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Dashboard** | Real-time system metrics (CPU, RAM, Disk, Network) with WebSocket streaming |
| 🌐 **Websites** | Nginx vhost management with PHP/Node/Static/Proxy support |
| 🗄️ **Databases** | Create/manage MariaDB & PostgreSQL databases |
| 🐳 **Docker** | Full container, image, network & volume management |
| 📁 **File Manager** | Browse, edit, upload files with permissions management |
| 💻 **Terminal** | Full web-based PTY terminal via WebSocket |
| ⚙️ **Services** | Install/control 17+ services (Nginx, MariaDB, Redis, Node.js, etc.) |
| 🔒 **SSL** | Let's Encrypt & self-signed certificate management |
| 🐘 **PHP** | Multi-version PHP management (8.3, 8.2, 8.1, 8.0, 7.4) |
| 🛡️ **Security** | Firewall rules (UFW), JWT authentication, bcrypt passwords |
| 📋 **Logs** | Log viewer with real-time tail streaming |
| ⏰ **Cron Jobs** | System crontab management |
| 🛒 **App Store** | One-click Docker app deployment (WordPress, Nextcloud, Grafana, etc.) |
| 📦 **Software** | apt-based software installation |

## 🚀 Quick Install

```bash
# One-line install
curl -sSL https://get.biz-panel.com | sudo bash

# Or from source
git clone https://github.com/nguyenduchoai/biz-panel.git
cd biz-panel
sudo bash install.sh
```

## 🏗️ Architecture

```
Single Rust Binary (4 MB)
├── Axum Web Framework (async, tower middleware)
├── Server-Side Rendering (embedded HTML/CSS/JS)
├── SQLite Database (embedded, zero-config)
├── JWT Authentication (bcrypt password hashing)
├── WebSocket (real-time metrics, terminal, log streaming)
└── System Integration (systemd, apt, ufw, docker, nginx)
```

## 📁 Project Structure

```
biz-panel/
├── Cargo.toml              # Rust dependencies
├── install.sh              # One-click installation
├── src/
│   ├── main.rs             # CLI + server entry point
│   ├── config.rs           # TOML configuration
│   ├── auth/
│   │   ├── mod.rs          # JWT authentication
│   │   └── middleware.rs   # Auth middleware
│   ├── models/
│   │   ├── mod.rs          # Data models
│   │   └── db.rs           # SQLite database layer
│   ├── api/
│   │   ├── mod.rs          # API router (80+ endpoints)
│   │   ├── handlers.rs     # Websites, databases, crons, firewall
│   │   ├── metrics.rs      # System metrics + WebSocket
│   │   ├── files.rs        # File manager
│   │   ├── logs.rs         # Log viewer
│   │   ├── terminal.rs     # PTY terminal
│   │   ├── docker.rs       # Docker management
│   │   ├── services.rs     # Service orchestration
│   │   ├── ssl.rs          # SSL certificates
│   │   ├── software.rs     # Software management
│   │   ├── php.rs          # PHP multi-version
│   │   └── templates.rs    # App store templates
│   ├── utils/
│   │   └── mod.rs          # Nginx config, DB creation, UFW
│   └── web/
│       ├── mod.rs
│       └── routes.rs       # Server-rendered HTML pages
└── static/
    ├── css/main.css        # Premium dark theme
    └── js/app.js           # Frontend JavaScript
```

## 🔧 CLI Commands

```bash
biz-panel start              # Start the panel server
biz-panel start --port 9999  # Start on custom port
biz-panel status             # Show system status
biz-panel info               # Show access info
biz-panel password           # Change admin password
biz-panel init               # First-time setup
```

## 🛠️ Development

### Requirements

- Rust 1.75+ (installed automatically by install.sh)
- Linux (Ubuntu 20.04+ / Debian 11+)

### Build from Source

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build release binary
cargo build --release

# Run
./target/release/biz-panel start --port 8888
```

### Default Credentials

- **Username:** `admin`
- **Password:** `admin123`

## 🆚 Why Rust?

| Metric | Go + React (v1) | Rust (v2) |
|--------|-----------------|-----------|
| Binary size | ~50 MB (Go) + ~5 MB (React build) | **4.1 MB** single binary |
| Memory usage | ~80 MB | **~15 MB** |
| Dependencies | Node.js, npm, Go | **None** (single binary) |
| Deploy | Build frontend + backend separately | **One binary, one command** |
| Startup | ~2 seconds | **< 100ms** |

## 📝 License

MIT License — Built by [Bizino Services](https://bizino.com)

---

*Built with ❤️ and Rust 🦀*
