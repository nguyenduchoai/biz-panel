# Biz-Panel 🚀

> **Modern Server Management Panel** - AWS Console meets Vercel Dashboard
> 
> A premium, high-density server management interface built with React, Semi Design, and TanStack Query.

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19.2-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)

## ✨ Features

### 📊 Dashboard
- Real-time resource monitoring (CPU, RAM, Disk, Network)
- System health indicators
- Quick action cards

### 🌐 Websites Management
- Multi-engine support (OpenResty, Nginx, Apache, Static)
- SSL/TLS certificate management
- Domain configuration

### 🗄️ Databases
- PostgreSQL, MySQL, MongoDB, Redis management
- Database CRUD operations
- Connection monitoring

### 🐳 Docker
- Container management
- Image registry
- Compose project support

### 🔒 Security
- Firewall rules management
- SSH key management
- Security scanning

### 📦 App Store
- One-click app installation
- Popular apps: WordPress, MySQL, PostgreSQL, Redis, etc.

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

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── layout/          # MainLayout, Sidebar, Header
│   ├── dashboard/       # Dashboard widgets
│   ├── websites/        # Website management
│   ├── databases/       # Database management
│   ├── docker/          # Container management
│   ├── security/        # Security features
│   └── appstore/        # App marketplace
├── pages/               # Page components
├── services/            # API services
├── stores/              # Zustand stores
├── theme/               # Theme configuration
├── types/               # TypeScript types
├── hooks/               # Custom React hooks
└── utils/               # Utility functions
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Clone repository
git clone https://github.com/nguyenduchoai/biz-panel.git
cd biz-panel

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

```bash
# .env.local
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
```

### Build for Production

```bash
npm run build
npm run preview  # Preview production build
```

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## 🎨 Design Philosophy

This panel follows the **"AWS Console meets Vercel"** design philosophy:
- **High-density information display** - Maximum data visibility
- **Dark mode first** - Easy on the eyes for long sessions
- **Component-based architecture** - Reusable, maintainable code
- **Responsive design** - Works on all screen sizes

## 📋 Development Roadmap

### Phase 1: Frontend UI ✅
- [x] Project setup with Vite + React + TypeScript
- [x] Semi Design integration
- [x] Layout components (Sidebar, Header, MainLayout)
- [x] Dashboard with mock data
- [x] Websites management UI
- [x] Databases management UI
- [x] Docker management UI
- [x] Security features UI
- [x] App Store UI

### Phase 2: Backend Integration (Next)
- [ ] Go backend with Gin framework
- [ ] WebSocket real-time updates
- [ ] API authentication (JWT)
- [ ] Database integration

### Phase 3: Production Features
- [ ] Docker container orchestration
- [ ] SSL certificate automation (Let's Encrypt)
- [ ] Backup & restore functionality
- [ ] Multi-server management

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Semi Design](https://semi.design/) - Beautiful UI components by ByteDance
- [React](https://react.dev/) - The library for web and native user interfaces
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- [1Panel](https://1panel.cn/) - Inspiration for features
- [CasaOS](https://casaos.io/) - Inspiration for UX

---

**Built with ❤️ by Bizino Team**
