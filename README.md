# Biz-Panel 🚀

> **Modern Server Management Panel** - Coolify + 1Panel + aaPanel in one
> 
> A premium, high-density server management interface with **project-based Docker isolation** like Coolify.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19.2-61dafb.svg)
![Go](https://img.shields.io/badge/Go-1.22-00ADD8.svg)

## 🚀 ONE-LINE INSTALL

```bash
# On Ubuntu/Debian VPS (as root):
curl -fsSL https://raw.githubusercontent.com/bizino-services/biz-panel/main/scripts/install.sh | sudo bash
```

**Or development mode:**

```bash
# Clone and run both frontend + backend
git clone https://github.com/bizino-services/biz-panel.git
cd biz-panel && bash dev.sh
```

**Access:**
- Frontend: `http://YOUR_VPS_IP:5173`
- Backend API: `http://YOUR_VPS_IP:8080/api`

---

## ✨ Core Features

### 📊 **Dashboard** (Real-time from Go Backend)
- CPU, RAM, Disk, Network metrics từ gopsutil
- WebSocket real-time updates
- System uptime và info

### 📦 **Projects** (Coolify-style Isolation) ⭐
```
PROJECT "e-commerce"
├── Network: biz-panel-e-commerce (isolated)
├── Containers: app, api, db, redis
└── All containers can communicate within project
    BUT isolated from other projects!
```
- Mỗi project = 1 Docker network riêng
- Containers trong cùng project giao tiếp được
- Projects khác nhau bị cô lập hoàn toàn

### 🐳 **Docker** (1Panel-style UI)
- Container management với real-time stats
- Image management
- Volume & Network management  
- Project-based filtering

### 🌐 **Websites Management**
- Multi-engine: Nginx, Apache, OpenLiteSpeed
- SSL/TLS certificate management
- PHP/Node/Static/Proxy projects

### 🗄️ **Databases**
- PostgreSQL, MySQL, MongoDB, Redis
- CRUD operations
- Connection monitoring

### 🔒 **Security**
- Firewall rules (UFW/iptables)
- SSH key management
- Security scanning
- Fail2ban integration

### 📁 **File Manager**
- Browse server files
- Edit, create, delete files/folders
- Permission management

### 📜 **Logs**
- Real-time log streaming
- Filter by source and level
- Search functionality

### 💻 **Terminal**
- Web-based SSH terminal
- Multi-tab support
- Container shell access

### ⏰ **Cronjobs**
- Cron expression builder
- Run history
- Enable/disable jobs

### ⚙️ **Settings**
- User management
- Backup configuration
- Notifications (Email, Slack, Discord)

### 📦 **App Store**
- One-click app installation
- Popular apps: WordPress, MySQL, PostgreSQL, Redis, etc.

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19.2 + TypeScript 5.9 |
| **UI Library** | Semi Design (ByteDance) |
| **State Management** | Zustand |
| **Data Fetching** | TanStack Query |
| **Routing** | React Router v7 |
| **Charts** | Recharts |
| **Terminal** | xterm.js |
| **Build Tool** | Vite 7 |

---

## 📁 Project Structure

```
biz-panel/
├── scripts/
│   ├── install.sh         # Production installer
│   └── one-liner.sh       # One-liner options
├── setup.sh               # Quick dev setup
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── layout/        # MainLayout, Sidebar, Header
│   │   ├── dashboard/     # Dashboard widgets
│   │   ├── websites/      # Website management
│   │   ├── databases/     # Database management
│   │   ├── docker/        # Container management
│   │   ├── security/      # Security features
│   │   └── appstore/      # App marketplace
│   ├── pages/             # 12 complete pages
│   ├── services/          # Mock API + types
│   ├── stores/            # Zustand stores
│   ├── theme/             # Dark theme CSS
│   └── types/             # TypeScript definitions
└── dist/                  # Production build
```

---

## 📦 Installation Options

### Option 1: One-Line Production Install ⭐

```bash
curl -fsSL https://raw.githubusercontent.com/bizino-services/biz-panel/main/scripts/install.sh | sudo bash
```

This will:
- ✅ Install Node.js 20
- ✅ Clone repository to `/opt/biz-panel`
- ✅ Build application
- ✅ Create systemd service
- ✅ Configure firewall
- ✅ Start Biz-Panel

### Option 2: Quick Development Setup

```bash
cd /home/biz-panel
bash setup.sh
```

### Option 3: Manual Installation

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/bizino-services/biz-panel.git
cd biz-panel

# Install dependencies
npm install

# Development
npm run dev -- --host 0.0.0.0 --port 5173

# Production
npm run build
npm run preview -- --host 0.0.0.0 --port 5173
```

---

## � Service Commands

After production install:

```bash
sudo systemctl start biz-panel      # Start
sudo systemctl stop biz-panel       # Stop
sudo systemctl restart biz-panel    # Restart
sudo systemctl status biz-panel     # Status
journalctl -u biz-panel -f          # View logs
```

---

## ⚙️ Environment Variables

```bash
# .env.local (optional)
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
BIZ_PANEL_PORT=5173
```

---

## 📋 Development Roadmap

### Phase 1: Frontend UI ✅ COMPLETE
- [x] All 12 pages implemented
- [x] Mock API service
- [x] Dark theme
- [x] One-line installer

### Phase 2: Backend Integration (Next)
- [ ] Go backend with Gin framework
- [ ] WebSocket real-time updates
- [ ] JWT authentication
- [ ] PostgreSQL database

### Phase 3: Production Features
- [ ] Docker container orchestration
- [ ] SSL automation (Let's Encrypt)
- [ ] Backup & restore
- [ ] Multi-server management

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [Semi Design](https://semi.design/) - Beautiful UI components by ByteDance
- [React](https://react.dev/) - The library for web and native user interfaces
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- [1Panel](https://1panel.cn/) - Inspiration for features
- [CasaOS](https://casaos.io/) - Inspiration for UX

---

**Built with ❤️ by Bizino Team**
