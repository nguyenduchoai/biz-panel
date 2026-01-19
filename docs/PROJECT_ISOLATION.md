# 🐳 Biz-Panel: Project-Based Docker Isolation

## Kiến trúc giống Coolify

Biz-Panel sử dụng cách tiếp cận **Project-Based Isolation** giống như Coolify, trong đó mỗi Project có Docker network riêng biệt.

## 🔒 Cách hoạt động

```
┌─────────────────────────────────────────────────────────────────┐
│                        BIZ-PANEL SERVER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐    ┌─────────────────────────┐    │
│  │  📦 PROJECT: E-Commerce │    │  📦 PROJECT: Blog        │    │
│  │  Network: biz-panel-001 │    │  Network: biz-panel-002 │    │
│  │  ─────────────────────  │    │  ─────────────────────  │    │
│  │                         │    │                         │    │
│  │  ┌─────┐ ┌─────┐       │    │  ┌─────┐ ┌─────┐       │    │
│  │  │ API │ │ Web │       │    │  │ WP  │ │MySQL│       │    │
│  │  └──┬──┘ └──┬──┘       │    │  └──┬──┘ └──┬──┘       │    │
│  │     │       │          │    │     │       │          │    │
│  │  ┌──┴───────┴──┐       │    │  ┌──┴───────┴──┐       │    │
│  │  │    MySQL    │       │    │  │   Redis     │       │    │
│  │  └─────────────┘       │    │  └─────────────┘       │    │
│  │                         │    │                         │    │
│  │  ✓ Containers có thể   │    │  ✓ Containers có thể   │    │
│  │    giao tiếp với nhau  │    │    giao tiếp với nhau  │    │
│  └─────────────────────────┘    └─────────────────────────┘    │
│                                                                 │
│              ❌ KHÔNG THỂ GIAO TIẾP GIỮA 2 PROJECTS ❌           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📋 API Endpoints

### 1. Tạo Project (Tự động tạo Network)

```bash
POST /api/projects
Content-Type: application/json

{
  "name": "ecommerce-app",
  "description": "E-commerce platform",
  "type": "docker"
}
```

**Response:**
```json
{
  "id": "18e261b1",
  "name": "ecommerce-app",
  "networkId": "biz-panel-18e261b1",  // ← Network tự động được tạo
  "containers": [],
  "status": "idle"
}
```

### 2. Thêm Container vào Project

```bash
POST /api/projects/:id/containers
Content-Type: application/json

{
  "containerId": "abc123def456"
}
```

Container sẽ được connect vào network của project đó.

### 3. Xem Containers của Project

```bash
GET /api/projects/:id/containers
```

Trả về list containers được filter theo label `biz-panel.project=<projectId>`

### 4. Deploy Project

```bash
POST /api/projects/:id/deploy
```

Khi deploy, containers mới sẽ:
1. Được gắn label `biz-panel.project=<projectId>`
2. Tự động join vào network `biz-panel-<projectId>`

### 5. Xóa Project

```bash
DELETE /api/projects/:id
```

Khi xóa project:
1. Tất cả containers trong project được stop
2. Network của project được xóa
3. Volumes được giữ lại (optional cleanup)

## 🏷️ Docker Labels

Tất cả resources được quản lý bởi Biz-Panel đều có labels:

```yaml
labels:
  biz-panel.managed: "true"
  biz-panel.project: "<project-id>"
  biz-panel.project.name: "<project-name>"
```

## 🌐 Network Isolation

| Scenario | Result |
|----------|--------|
| Container A (Project 1) → Container B (Project 1) | ✅ Có thể kết nối |
| Container A (Project 1) → Container C (Project 2) | ❌ Không thể kết nối |
| Container A (Project 1) → Internet | ✅ Có thể kết nối |
| Container A (Project 1) → Host | ✅ Có thể kết nối |

## 📦 Ví dụ thực tế

### Tạo Project E-Commerce với nhiều containers:

```bash
# 1. Tạo project
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"ecommerce","type":"docker"}'

# Response: {"id":"abc123","networkId":"biz-panel-abc123",...}

# 2. Deploy nginx container vào project
docker run -d \
  --name ecom-nginx \
  --network biz-panel-abc123 \
  --label biz-panel.project=abc123 \
  nginx:alpine

# 3. Deploy API container vào project
docker run -d \
  --name ecom-api \
  --network biz-panel-abc123 \
  --label biz-panel.project=abc123 \
  node:20-alpine

# 4. Deploy database container vào project
docker run -d \
  --name ecom-db \
  --network biz-panel-abc123 \
  --label biz-panel.project=abc123 \
  postgres:16-alpine

# Tất cả 3 containers có thể giao tiếp với nhau qua:
# - ecom-nginx (hostname trong network)
# - ecom-api
# - ecom-db
```

## 🔄 So sánh với Coolify

| Feature | Coolify | Biz-Panel |
|---------|---------|-----------|
| Project-based isolation | ✅ | ✅ |
| Auto network creation | ✅ | ✅ |
| Container grouping | ✅ | ✅ |
| Environment separation | ✅ (dev/staging/prod) | 🔄 Coming |
| Git-based deploy | ✅ | 🔄 Coming |
| Multi-server | ✅ | 🔄 Coming |

## 🎯 Lợi ích

1. **Security**: Containers trong project khác không thể truy cập lẫn nhau
2. **Organization**: Dễ dàng quản lý theo project
3. **Cleanup**: Xóa project = xóa tất cả resources liên quan
4. **DNS**: Containers có thể gọi nhau bằng tên (container name)
5. **Monitoring**: Track resources per project

---

**Biz-Panel: "Coolify + 1Panel in one"**
