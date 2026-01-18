# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-18

### Added
- **Project Setup**
  - Initialized Vite + React 19 + TypeScript 5.9 project
  - Integrated Semi Design (ByteDance) as UI framework
  - Configured TanStack Query for data fetching
  - Added Zustand for state management
  - Integrated React Router v7 for routing
  - Added Recharts for data visualization
  - Integrated xterm.js for terminal emulation

- **Core Layout**
  - `MainLayout` - App shell with sidebar and header
  - `Sidebar` - Navigation with collapsible menu
  - `Header` - TopBar with search, notifications, user menu
  - Dark theme with CSS custom properties

- **Dashboard Module**
  - Real-time resource monitoring cards (CPU, RAM, Disk, Network)
  - System info widget
  - Quick stats overview
  - Resource usage charts

- **Websites Module**
  - Website listing with status indicators
  - Multi-engine support indicators (OpenResty, Nginx, Apache, Static)
  - SSL certificate status display
  - CRUD operations UI

- **Databases Module**
  - Database listing (PostgreSQL, MySQL, MongoDB, Redis)
  - Connection count display
  - Size metrics
  - Engine-based filtering

- **Docker Module**
  - Container management UI
  - Image listing
  - Compose project management
  - Container stats display

- **Security Module**
  - Firewall rules management
  - SSH key management
  - Security scanning UI
  - Port protection indicators

- **App Store**
  - One-click app installation UI
  - App cards with categories
  - Popular apps showcase

### Technical
- CSS-first styling approach (no Tailwind)
- Component-based architecture
- TypeScript strict mode
- ESLint configuration for React

---

## [Unreleased]

### Planned
- Go backend integration
- WebSocket real-time updates
- JWT authentication
- Docker API integration
- Let's Encrypt SSL automation
