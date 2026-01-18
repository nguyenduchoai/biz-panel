# Biz-Panel System Architecture

## Overview

Biz-Panel is a modern server management panel following the **"AWS Console meets Vercel"** design philosophy. It provides a high-density, premium interface for managing Linux servers.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Biz-Panel Frontend                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │   React 19  │  │ Semi Design │  │  Zustand    │               │
│  │   + TS 5.9  │  │     UI      │  │   Store     │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    TanStack Query                            │ │
│  │              (API Caching & Sync)                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ REST API + WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Biz-Panel Backend                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │  Go + Gin   │  │   WebSocket │  │    JWT      │               │
│  │  REST API   │  │   Server    │  │    Auth     │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Service Layer                             │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │ │
│  │  │Website │ │Database│ │ Docker │ │Security│ │AppStore│     │ │
│  │  │Service │ │Service │ │Service │ │Service │ │Service │     │ │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ System Calls / Docker API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Linux Server                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │   Docker    │  │   Nginx/    │  │  Databases  │               │
│  │   Engine    │  │  OpenResty  │  │ PG/MySQL/   │               │
│  │             │  │             │  │ MongoDB     │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 19.2 | UI rendering |
| Language | TypeScript 5.9 | Type safety |
| UI Library | Semi Design | ByteDance components |
| State | Zustand | Global state management |
| Data Fetching | TanStack Query | API caching & sync |
| Routing | React Router v7 | Client-side routing |
| Charts | Recharts | Data visualization |
| Terminal | xterm.js | Web terminal emulation |
| Build | Vite 7 | Fast development |

### Backend (Planned)
| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Go + Gin | REST API |
| WebSocket | Gorilla | Real-time updates |
| Auth | JWT | Authentication |
| Database | SQLite | Panel data storage |

## Module Architecture

### Core Modules
1. **Dashboard** - System overview and monitoring
2. **Websites** - Web server management (Nginx, Apache, OpenResty)
3. **Databases** - Database management (PostgreSQL, MySQL, MongoDB, Redis)
4. **Docker** - Container orchestration
5. **Security** - Firewall, SSH keys, scanning
6. **App Store** - One-click app installation

### Directory Structure
```
src/
├── components/           # Reusable UI components
│   ├── layout/          # Shell components
│   ├── dashboard/       # Dashboard widgets
│   ├── websites/        # Website components
│   ├── databases/       # Database components
│   ├── docker/          # Docker components
│   ├── security/        # Security components
│   └── appstore/        # App store components
├── pages/               # Route page components
├── services/            # API service layer
├── stores/              # Zustand stores
├── theme/               # Theme & design tokens
├── types/               # TypeScript definitions
├── hooks/               # Custom React hooks
└── utils/               # Utility functions
```

## Design Tokens

```css
:root {
  /* Colors */
  --color-bg-primary: #0f0f0f;
  --color-bg-secondary: #1a1a1a;
  --color-bg-tertiary: #252525;
  --color-text-primary: #ffffff;
  --color-text-secondary: #a0a0a0;
  --color-accent: #3b82f6;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

## Security Considerations

- All API endpoints require JWT authentication
- WebSocket connections use secure tokens
- HTTPS enforced in production
- Rate limiting on all endpoints
- Input sanitization for all user data
- CSRF protection enabled

## Performance Goals

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Bundle size: < 500KB gzipped
- API response time: < 200ms
