# ⚡ Biz-Panel v2.0

> **Premium Server Management Panel** — Built with Rust 🦀

[English](#english) | [Tiếng Việt](#tiếng-việt)

---

<a id="tiếng-việt"></a>

## 🇻🇳 Giới thiệu

**Biz-Panel** là hệ thống quản lý VPS/Server hoàn chỉnh — tương tự như **CyberPanel, aaPanel, HestiaCP** — nhưng được viết lại hoàn toàn bằng **Rust** để đạt hiệu năng cực cao.

### Tại sao cần Biz-Panel?

Khi bạn thuê một VPS (ví dụ: DigitalOcean, Vultr, Linode, AWS EC2...), bạn nhận được một server Linux trống. Để chạy website, bạn cần cài đặt và cấu hình **hàng chục phần mềm**: Nginx, PHP, MySQL, SSL, firewall... Thay vì phải gõ lệnh terminal cho từng thứ, **Biz-Panel cung cấp một giao diện web đẹp** để bạn quản lý tất cả chỉ bằng click chuột.

### Biz-Panel làm được gì?

```
🌐 Website      → Tạo website mới chỉ trong 30 giây (tự động cấu hình Nginx)
🗄️ Database     → Tạo database MySQL/PostgreSQL + user với 1 click
🐳 Docker       → Quản lý container, image, network, volume
📁 File Manager → Duyệt, sửa, upload file trên server qua web
💻 Terminal     → Terminal đầy đủ trên trình duyệt (không cần PuTTY/SSH)
⚙️ Services     → Cài/gỡ 17+ phần mềm: Nginx, MariaDB, Redis, Node.js, Python...
🔒 SSL          → Cấp chứng chỉ Let's Encrypt miễn phí hoặc self-signed
🐘 PHP          → Quản lý nhiều phiên bản PHP cùng lúc (8.3, 8.2, 8.1...)
🛡️ Firewall     → Mở/đóng cổng mạng dễ dàng qua UFW
📋 Logs         → Xem log hệ thống real-time
⏰ Cron         → Quản lý tác vụ tự động (backup, cleanup...)
🛒 App Store    → Cài ứng dụng 1 click: WordPress, Nextcloud, Grafana...
📊 Dashboard    → Theo dõi CPU, RAM, Disk, Network real-time
```

### Kiến trúc hệ thống

```
                    ┌─────────────────────────────────────────┐
                    │         Biz-Panel Binary (4.1 MB)       │
                    │              Single File                 │
                    ├──────────┬──────────┬───────────────────┤
                    │  Web UI  │   API    │   System Control  │
                    │ (HTML/   │ (REST +  │   (Linux CLI)     │
                    │  CSS/JS) │WebSocket)│                   │
                    ├──────────┴──────────┴───────────────────┤
                    │            Axum Web Framework            │
                    │        (async, tower middleware)         │
                    ├─────────────────────────────────────────┤
                    │           SQLite Database                │
                    │     (embedded, zero-config)              │
                    └─────────────┬───────────────────────────┘
                                  │
                    ┌─────────────▼───────────────────────────┐
                    │          Linux Server                    │
                    │                                         │
                    │  ┌─────────┐ ┌────────┐ ┌────────────┐ │
                    │  │  Nginx  │ │ MySQL  │ │   Docker   │ │
                    │  │  Apache │ │ Redis  │ │ Containers │ │
                    │  └─────────┘ └────────┘ └────────────┘ │
                    │  ┌─────────┐ ┌────────┐ ┌────────────┐ │
                    │  │   PHP   │ │Node.js │ │   UFW      │ │
                    │  │  (FPM)  │ │Python  │ │ (Firewall) │ │
                    │  └─────────┘ └────────┘ └────────────┘ │
                    └─────────────────────────────────────────┘
```

**Cách hoạt động:**
1. **Web UI** — Giao diện admin đẹp, dark theme, responsive. Toàn bộ HTML/CSS/JS được nhúng trực tiếp vào binary (không cần Node.js).
2. **REST API** — 80+ endpoint xử lý CRUD cho websites, databases, services... Có cả WebSocket cho metrics real-time và terminal.
3. **System Control** — Panel gọi các lệnh Linux (`systemctl`, `apt`, `ufw`, `certbot`, `docker`...) để thực sự quản lý server.
4. **SQLite** — Lưu trữ cấu hình, user, hoạt động. Embedded, không cần cài thêm database riêng cho panel.

### Tại sao chọn Rust?

| Tiêu chí | Go + React (v1) | Rust (v2) |
|----------|-----------------|-----------|
| Kích thước binary | ~50 MB (Go) + 5 MB (React) | **4.1 MB** (1 file duy nhất) |
| RAM sử dụng | ~80 MB | **~9 MB** |
| Thời gian khởi động | ~2 giây | **< 100ms** |
| Dependencies runtime | Node.js, npm, Go | **Không cần gì** |
| Deploy | Build frontend + backend riêng | **1 file, 1 lệnh** |
| Số service systemd | 2 (backend + frontend) | **1** |

### Cài đặt nhanh

```bash
# Cách 1: Cài từ source
git clone https://github.com/nguyenduchoai/biz-panel.git
cd biz-panel
sudo bash install.sh

# Cách 2: Nếu đã có Rust
cargo build --release
sudo cp target/release/biz-panel /usr/local/bin/
biz-panel start --port 8888
```

### Đăng nhập mặc định

```
🌐 URL:      http://<IP-Server>:8888
👤 Username: admin
🔑 Password: admin123
```

### Lệnh CLI

```bash
biz-panel start              # Khởi động panel
biz-panel start --port 9999  # Khởi động trên cổng tuỳ chỉnh
biz-panel status             # Xem trạng thái hệ thống
biz-panel info               # Xem thông tin truy cập
biz-panel password           # Đổi mật khẩu admin
biz-panel init               # Khởi tạo lần đầu
```

### Quản lý service

```bash
systemctl status biz-panel    # Xem trạng thái
systemctl restart biz-panel   # Khởi động lại
systemctl stop biz-panel      # Dừng panel
journalctl -u biz-panel -f    # Xem log real-time
```

### Cấu trúc dự án

```
biz-panel/
├── Cargo.toml          # Khai báo dependencies Rust
├── build.rs            # Build script (theo dõi static files)
├── install.sh          # Script cài đặt 1 lệnh
├── src/                # Source code Rust
│   ├── main.rs         # Entry point + CLI
│   ├── config.rs       # Quản lý cấu hình TOML
│   ├── auth/           # Xác thực JWT + middleware
│   ├── models/         # Data models + SQLite
│   ├── api/            # 12 API modules (80+ endpoints)
│   │   ├── handlers.rs # Websites, databases, crons, firewall
│   │   ├── metrics.rs  # Metrics + WebSocket real-time
│   │   ├── files.rs    # File manager
│   │   ├── terminal.rs # Web terminal (PTY)
│   │   ├── docker.rs   # Docker management
│   │   ├── services.rs # 17+ services management
│   │   ├── ssl.rs      # SSL certificates
│   │   ├── php.rs      # PHP multi-version
│   │   └── templates.rs# App Store (14 templates)
│   ├── utils/          # Nginx config, DB creation, UFW
│   └── web/            # Server-rendered HTML pages
└── static/             # CSS + JavaScript (embedded vào binary)
```

### Các dịch vụ được hỗ trợ

| Loại | Phần mềm |
|------|----------|
| **Runtime** | Node.js, Python, Go, Rust |
| **Web Server** | Nginx, Apache |
| **Database** | MariaDB/MySQL, PostgreSQL, MongoDB, Redis |
| **Cache** | Memcached |
| **Tools** | Docker, Certbot, PM2, Composer, Fail2ban, Supervisor |
| **PHP** | 8.3, 8.2, 8.1, 8.0, 7.4 (FPM, extensions, config) |

### App Store Templates

Cài đặt 1 click qua Docker:

| App | Mô tả |
|-----|-------|
| 📝 WordPress | CMS phổ biến nhất thế giới |
| 👻 Ghost | Blog platform hiện đại |
| ☁️ Nextcloud | Cloud storage tự host |
| 🍵 Gitea | Git server nhẹ |
| 🐳 Portainer | Docker GUI |
| 📊 Grafana | Dashboard monitoring |
| 🔴 Uptime Kuma | Theo dõi uptime |
| 🗄️ Adminer | Quản lý database web |
| 💬 Rocket.Chat | Chat team self-hosted |
| 📋 Vikunja | Task management |
| 🔍 Meilisearch | Search engine nhanh |
| 📈 Matomo | Analytics thay thế Google Analytics |
| ⚙️ n8n | Workflow automation |
| 🔐 Vaultwarden | Password manager (Bitwarden) |

### Yêu cầu hệ thống

- **OS**: Ubuntu 20.04+ / Debian 11+
- **Kiến trúc**: x86_64 hoặc ARM64 (aarch64)
- **RAM**: Tối thiểu 512 MB (panel chỉ dùng ~9 MB)
- **Disk**: 50 MB cho binary + dependencies

---

<a id="english"></a>

## 🇬🇧 English

A modern, blazing-fast server management panel built entirely in **Rust** using Axum. Single binary deployment with embedded frontend — no Node.js, no React, no Go required.

### ✨ Features

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

### 🚀 Quick Install

```bash
git clone https://github.com/nguyenduchoai/biz-panel.git
cd biz-panel
sudo bash install.sh
```

### 🏗️ Architecture

```
Single Rust Binary (4 MB)
├── Axum Web Framework (async, tower middleware)
├── Server-Side Rendering (embedded HTML/CSS/JS)
├── SQLite Database (embedded, zero-config)
├── JWT Authentication (bcrypt password hashing)
├── WebSocket (real-time metrics, terminal, log streaming)
└── System Integration (systemd, apt, ufw, docker, nginx)
```

### 📁 Project Structure

```
biz-panel/
├── Cargo.toml              # Rust dependencies
├── build.rs                # Static file change detection
├── install.sh              # One-click installation
├── src/
│   ├── main.rs             # CLI + server entry point
│   ├── config.rs           # TOML configuration
│   ├── auth/               # JWT authentication + middleware
│   ├── models/             # Data models + SQLite layer
│   ├── api/                # API router (80+ endpoints)
│   ├── utils/              # Nginx config gen, DB creation, UFW
│   └── web/                # Server-rendered HTML pages
└── static/                 # CSS + JS (compiled into binary)
```

### 🔧 CLI Commands

```bash
biz-panel start              # Start the panel server
biz-panel start --port 9999  # Start on custom port
biz-panel status             # Show system status
biz-panel info               # Show access info
biz-panel password           # Change admin password
biz-panel init               # First-time setup
```

### 🛠️ Development

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build release binary
cargo build --release

# Run
./target/release/biz-panel start --port 8888
```

### Default Credentials

```
🌐 URL:      http://<server-ip>:8888
👤 Username: admin
🔑 Password: admin123
```

### 🆚 Why Rust?

| Metric | Go + React (v1) | Rust (v2) |
|--------|-----------------|-----------|
| Binary size | ~50 MB + ~5 MB | **4.1 MB** single binary |
| Memory usage | ~80 MB | **~9 MB** |
| Startup time | ~2 seconds | **< 100ms** |
| Runtime deps | Node.js, npm, Go | **None** |
| Systemd services | 2 (backend + frontend) | **1** |
| Deploy | Build frontend + backend separately | **One binary, one command** |

---

## 📝 License

MIT License — Built by [Bizino Services](https://bizino.com)

*Built with ❤️ and Rust 🦀*
