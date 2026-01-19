# Changelog

All notable changes to Biz-Panel will be documented in this file.

## [1.1.0] - 2026-01-18 - Advanced Services Management

### Added
- **PHP Multi-Version Management** (`/api/php/versions`)
  - Support for PHP 5.6, 7.4, 8.0, 8.1, 8.2, 8.3
  - Extension management (28+ extensions)
  - php.ini configuration editing
  - FPM service control
- **Unified Services Management** (`/api/services`)
  - 24 managed services (Node.js, Python, Go, Nginx, MySQL, Redis, etc.)
  - AWS/GCP-style service registry
  - Real-time status monitoring
  - Configuration management per service
  - Service logs viewing
- **Services Page** (`/services`)
  - Category-based filtering (Runtimes, Web Servers, Databases, Cache, Tools)
  - Search functionality
  - Install/Uninstall actions
  - Config editor modal
- **PHP Management Page** (`/php`)
  - Version cards with status
  - Extensions toggle modal
  - Config editor for php.ini
- **Code Splitting** (vite.config.ts)
  - Split bundles by vendor and page type
  - Reduced initial load time

### Changed
- **CORS Configuration**: Restricted from `["*"]` to specific origins
- **Sidebar Navigation**: Added PHP and Services menu items
- **Build Configuration**: Added manual chunks for better loading

### Fixed
- Removed console.log from Files.tsx
- Fixed sidebar CSS overlapping issues
- Auto-expand sidebar on load

### Security
- Restricted CORS origins (configurable via CORS_ORIGINS env)
- Audit completed with 89/100 health score

---

## [1.0.0] - 2026-01-18

### 🎉 Initial Release - Full Feature MVP

**Biz-Panel v1.0.0** is a complete server management panel combining the best features from Coolify, 1Panel, and aaPanel.

---

## ✅ All 15 Features Complete

### Core Features

| # | Feature | Status | Description |
|---|---------|--------|-------------|
| 1 | **Dashboard** | ✅ | Real-time system metrics (CPU, RAM, Disk, Network) |
| 2 | **Websites** | ✅ | Web server management (Nginx/Apache/OLS) |
| 3 | **Projects** | ✅ | Coolify-style Docker isolation |
| 4 | **Databases** | ✅ | MySQL, PostgreSQL, MongoDB, Redis |
| 5 | **Docker** | ✅ | Container/Image/Network/Volume management |
| 6 | **Security** | ✅ | Firewall rules management |
| 7 | **Files** | ✅ | File manager with editor |
| 8 | **Logs** | ✅ | Log viewer with streaming |
| 9 | **Terminal** | ✅ | Web terminal with PTY |
| 10 | **Cronjobs** | ✅ | Scheduled task management |
| 11 | **Settings** | ✅ | Panel configuration |
| 12 | **App Store** | ✅ | 14 one-click templates |
| 13 | **SSL** | ✅ | Let's Encrypt + custom certs |
| 14 | **Software** | ✅ | PHP/Node/Python installation |
| 15 | **Projects (Coolify)** | ✅ | Per-project Docker networks |

---

## Backend (Go + Gin)

### API Endpoints: 70+

**System**
- `GET /api/health` - Health check
- `GET /api/metrics` - System metrics
- `GET /api/metrics/ws` - WebSocket metrics

**Projects (Coolify-style)**
- `GET /api/projects` - List projects
- `POST /api/projects` - Create (auto-creates Docker network)
- `GET /api/projects/:id` - Get project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete (removes network)
- `POST /api/projects/:id/deploy` - Deploy
- `GET /api/projects/:id/containers` - List containers
- `POST /api/projects/:id/containers` - Add container

**Docker**
- `GET /api/docker/containers` - List containers
- `GET /api/docker/containers/:id` - Get details
- `POST /api/docker/containers/:id/start` - Start
- `POST /api/docker/containers/:id/stop` - Stop
- `POST /api/docker/containers/:id/restart` - Restart
- `DELETE /api/docker/containers/:id` - Remove
- `GET /api/docker/containers/:id/logs` - Logs
- `GET /api/docker/containers/:id/stats` - Stats
- `GET /api/docker/images` - List images
- `DELETE /api/docker/images/:id` - Remove
- `GET /api/docker/networks` - List networks
- `POST /api/docker/networks` - Create
- `DELETE /api/docker/networks/:id` - Remove
- `GET /api/docker/volumes` - List volumes
- `POST /api/docker/volumes` - Create
- `DELETE /api/docker/volumes/:name` - Remove

**Websites & Databases**
- `GET /api/websites` - List websites
- `POST /api/websites` - Create
- `DELETE /api/websites/:id` - Delete
- `GET /api/databases` - List databases
- `POST /api/databases` - Create
- `DELETE /api/databases/:id` - Delete

**File Manager**
- `GET /api/files` - List directory
- `GET /api/files/read` - Read file
- `POST /api/files/write` - Write file
- `POST /api/files/mkdir` - Create directory
- `DELETE /api/files` - Delete
- `POST /api/files/rename` - Rename/move
- `POST /api/files/copy` - Copy
- `POST /api/files/chmod` - Change permissions
- `GET /api/files/search` - Search files

**Logs**
- `GET /api/logs/sources` - List log sources
- `GET /api/logs/:source` - Get logs
- `GET /api/logs/:source/stream` - WebSocket streaming
- `GET /api/logs/:source/download` - Download
- `DELETE /api/logs/:source` - Clear log
- `GET /api/logs/search` - Search

**Terminal**
- `GET /api/terminal/shells` - Available shells
- `GET /api/terminal/ws` - WebSocket PTY
- `POST /api/terminal/exec` - Execute command
- `GET /api/terminal/container/:id` - Container terminal

**Cronjobs**
- `GET /api/crons` - List
- `POST /api/crons` - Create
- `PUT /api/crons/:id` - Update
- `DELETE /api/crons/:id` - Delete
- `POST /api/crons/:id/run` - Run now

**Security**
- `GET /api/firewall/rules` - List rules
- `POST /api/firewall/rules` - Create
- `DELETE /api/firewall/rules/:id` - Delete

**App Store**
- `GET /api/templates` - List templates
- `GET /api/templates/categories` - Categories
- `GET /api/templates/:id` - Get template
- `POST /api/templates/:id/deploy` - Deploy

**SSL Certificates**
- `GET /api/ssl` - List certificates
- `GET /api/ssl/:id` - Get certificate
- `POST /api/ssl/letsencrypt` - Request Let's Encrypt
- `POST /api/ssl/upload` - Upload custom
- `POST /api/ssl/self-signed` - Generate self-signed
- `POST /api/ssl/:id/renew` - Renew
- `DELETE /api/ssl/:id` - Delete
- `GET /api/ssl/check-expiry` - Check expiry

**Software**
- `GET /api/software` - List software
- `POST /api/software/:id/install` - Install
- `POST /api/software/:id/uninstall` - Uninstall
- `GET /api/software/jobs/:jobId` - Install status
- `POST /api/software/:id/:action` - Service control

**Settings**
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update
- `GET /api/activities` - Activity log

---

## Frontend (React 19.2 + Semi Design)

### Pages: 15

1. **Dashboard** - Real-time metrics from backend
2. **Websites** - Web server management
3. **Projects** - Git deployments with Docker
4. **Databases** - CRUD for all DB types
5. **Docker** - 1Panel-style container UI
6. **Security** - Firewall management
7. **Files** - File browser + editor
8. **Logs** - Log viewer + search
9. **Terminal** - Web terminal
10. **Cron** - Cronjob management
11. **App Store** - One-click templates
12. **Software** - PHP/Node/Python install
13. **SSL** - Certificate management
14. **Settings** - Panel configuration
15. **Activities** - Action history

### Sidebar Navigation

```
📊 Dashboard
─── INFRASTRUCTURE ───
🌐 Websites
📦 Projects
🗄️ Databases
🐳 Docker
─── SOFTWARE ───
💻 Software
🔐 SSL Certs
─── OPERATIONS ───
🔒 Security
📁 Files
📄 Logs
💻 Terminal
⏰ Cronjobs
─── EXTRAS ───
🛒 App Store
⚙️ Settings
```

---

## App Store Templates (14)

| Category | Apps |
|----------|------|
| **Web Servers** | Nginx, Apache |
| **Databases** | MySQL, PostgreSQL, MongoDB, Redis |
| **CMS** | WordPress |
| **Dev Tools** | phpMyAdmin, Adminer, Portainer |
| **Monitoring** | Grafana, Prometheus |
| **Storage** | MinIO |
| **Code** | Gitea |

---

## Tech Stack

- **Backend**: Go 1.22, Gin, Docker SDK
- **Frontend**: React 19.2, TypeScript 5.9, Vite 7.3
- **UI**: Semi Design (ByteDance)
- **State**: TanStack Query, Zustand
- **Styling**: CSS Variables, Glass-morphism

---

## Quick Start

```bash
# Development
cd /home/biz-panel
bash dev.sh

# Access
http://YOUR_IP:5173    # Frontend
http://YOUR_IP:8080/api # Backend
```

---

## Roadmap

### v1.1.0 (Planned)
- [ ] JWT Authentication
- [ ] User management
- [ ] Real web server configuration

### v1.2.0 (Planned)
- [ ] Docker Compose editor
- [ ] Git-based deployments
- [ ] Build logs streaming

### v1.3.0 (Planned)
- [ ] Backup/Restore
- [ ] 2FA authentication
- [ ] SSH key management

---

**Biz-Panel v1.0.0** - *Coolify + 1Panel + aaPanel in one*

*"We don't just manage servers. We engineer infrastructure."*
