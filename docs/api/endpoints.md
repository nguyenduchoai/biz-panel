# Biz-Panel API Documentation

## Overview

This document describes the planned API endpoints for Biz-Panel backend.

## Base URL

```
Development: http://localhost:8080/api/v1
Production:  https://panel.yourdomain.com/api/v1
```

## Authentication

All endpoints require JWT authentication (except `/auth/*`).

```bash
Authorization: Bearer <jwt_token>
```

---

## Auth Endpoints

### POST /auth/login
Login and get JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "1",
    "username": "admin",
    "role": "admin"
  },
  "expiresAt": "2026-01-19T19:00:00Z"
}
```

---

## System Endpoints

### GET /system/info
Get server system information.

**Response:**
```json
{
  "hostname": "biz-server",
  "os": "Ubuntu 22.04",
  "kernel": "5.15.0-91-generic",
  "uptime": 86400,
  "cpuCores": 4,
  "totalMemory": 8589934592,
  "totalDisk": 107374182400
}
```

### GET /system/stats
Get real-time resource usage.

**Response:**
```json
{
  "cpu": {
    "usage": 23.5,
    "cores": [12.0, 35.0, 18.5, 28.0]
  },
  "memory": {
    "used": 4294967296,
    "total": 8589934592,
    "percent": 50.0
  },
  "disk": {
    "used": 53687091200,
    "total": 107374182400,
    "percent": 50.0
  },
  "network": {
    "rxBytes": 1073741824,
    "txBytes": 536870912,
    "rxRate": 1024000,
    "txRate": 512000
  }
}
```

---

## Websites Endpoints

### GET /websites
List all websites.

**Response:**
```json
{
  "data": [
    {
      "id": "1",
      "name": "My Website",
      "domain": "example.com",
      "engine": "nginx",
      "status": "running",
      "ssl": true,
      "sslExpiry": "2026-12-31T23:59:59Z",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

### POST /websites
Create new website.

**Request:**
```json
{
  "name": "New Site",
  "domain": "newsite.com",
  "engine": "nginx",
  "documentRoot": "/var/www/newsite"
}
```

### GET /websites/:id
Get website details.

### PUT /websites/:id
Update website configuration.

### DELETE /websites/:id
Delete website.

---

## Databases Endpoints

### GET /databases
List all databases.

**Response:**
```json
{
  "data": [
    {
      "id": "1",
      "name": "myapp_db",
      "engine": "postgresql",
      "size": 1073741824,
      "connections": 5,
      "status": "running",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

### POST /databases
Create new database.

### DELETE /databases/:id
Delete database.

---

## Docker Endpoints

### GET /docker/containers
List all containers.

**Response:**
```json
{
  "data": [
    {
      "id": "abc123",
      "name": "nginx-proxy",
      "image": "nginx:latest",
      "status": "running",
      "ports": ["80:80", "443:443"],
      "cpuPercent": 2.5,
      "memoryUsage": 134217728,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

### POST /docker/containers/:id/start
Start container.

### POST /docker/containers/:id/stop
Stop container.

### POST /docker/containers/:id/restart
Restart container.

### DELETE /docker/containers/:id
Remove container.

### GET /docker/images
List all images.

### DELETE /docker/images/:id
Remove image.

---

## Security Endpoints

### GET /security/firewall/rules
List firewall rules.

### POST /security/firewall/rules
Add firewall rule.

### DELETE /security/firewall/rules/:id
Remove firewall rule.

### GET /security/ssh-keys
List SSH keys.

### POST /security/ssh-keys
Add SSH key.

### DELETE /security/ssh-keys/:id
Remove SSH key.

---

## WebSocket Events

Connect to `ws://localhost:8080/ws` with JWT token.

### Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `system:stats` | Server → Client | Real-time system stats (every 2s) |
| `container:status` | Server → Client | Container status change |
| `terminal:output` | Server → Client | Terminal output |
| `terminal:input` | Client → Server | Terminal input |

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `INTERNAL_ERROR` | 500 | Server error |
