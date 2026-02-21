//! Web UI routes - Serves HTML pages with embedded templates

use axum::{
    http::{header, StatusCode},
    response::{Html, IntoResponse},
    routing::get,
    Router,
};

/// UI page routes
pub fn ui_routes() -> Router {
    Router::new()
        .route("/login", get(login_page))
        .route("/", get(dashboard_page))
        .route("/dashboard", get(dashboard_page))
        .route("/websites", get(page_shell))
        .route("/databases", get(page_shell))
        .route("/docker", get(page_shell))
        .route("/security", get(page_shell))
        .route("/files", get(page_shell))
        .route("/logs", get(page_shell))
        .route("/terminal", get(page_shell))
        .route("/cron", get(page_shell))
        .route("/appstore", get(page_shell))
        .route("/software", get(page_shell))
        .route("/ssl", get(page_shell))
        .route("/php", get(page_shell))
        .route("/services", get(page_shell))
        .route("/settings", get(page_shell))
        .route("/backups", get(page_shell))
        .route("/monitoring", get(page_shell))
        .route("/projects", get(page_shell))
}

/// Static assets (embedded in binary)
pub fn static_routes() -> Router {
    Router::new()
        .route("/static/css/main.css", get(serve_css))
        .route("/static/js/app.js", get(serve_js))
        .route("/static/js/htmx.min.js", get(serve_htmx))
        .route("/static/js/chart.min.js", get(serve_chart))
        .route("/static/js/xterm.min.js", get(serve_xterm))
        .route("/static/css/xterm.min.css", get(serve_xterm_css))
        .route("/favicon.ico", get(serve_favicon))
}

// ========== PAGES ==========

async fn login_page() -> impl IntoResponse {
    Html(LOGIN_HTML)
}

async fn dashboard_page() -> impl IntoResponse {
    Html(render_page("Dashboard", "dashboard", DASHBOARD_CONTENT))
}

async fn page_shell() -> impl IntoResponse {
    Html(render_page("Biz-Panel", "dashboard", MAIN_APP_CONTENT))
}

// ========== STATIC ASSETS ==========

async fn serve_css() -> impl IntoResponse {
    ([(header::CONTENT_TYPE, "text/css")], MAIN_CSS)
}

async fn serve_js() -> impl IntoResponse {
    ([(header::CONTENT_TYPE, "application/javascript")], APP_JS)
}

async fn serve_htmx() -> impl IntoResponse {
    ([(header::CONTENT_TYPE, "application/javascript")], "/* HTMX loaded from CDN */")
}

async fn serve_chart() -> impl IntoResponse {
    ([(header::CONTENT_TYPE, "application/javascript")], "/* Chart.js loaded from CDN */")
}

async fn serve_xterm() -> impl IntoResponse {
    ([(header::CONTENT_TYPE, "application/javascript")], "/* xterm loaded from CDN */")
}

async fn serve_xterm_css() -> impl IntoResponse {
    ([(header::CONTENT_TYPE, "text/css")], "/* xterm CSS loaded from CDN */")
}

async fn serve_favicon() -> impl IntoResponse {
    StatusCode::NO_CONTENT
}

// ========== TEMPLATE HELPERS ==========

fn render_page(title: &str, active: &str, content: &str) -> String {
    BASE_HTML
        .replace("{{title}}", title)
        .replace("{{active}}", active)
        .replace("{{content}}", content)
}

// ========== EMBEDDED HTML ==========

const LOGIN_HTML: &str = r##"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Biz-Panel — Login</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Inter',-apple-system,BlinkMacSystemFont,sans-serif; background: #000; color: #ededed; -webkit-font-smoothing: antialiased; }
        ::selection { background: #fff; color: #000; }

        .login-page {
            display:flex; align-items:center; justify-content:center; min-height:100vh;
            background: #000;
            position: relative;
            overflow: hidden;
        }
        /* Subtle radial gradient ambient light */
        .login-page::before {
            content:''; position:absolute; top:-50%; left:-50%; width:200%; height:200%;
            background: radial-gradient(circle at 50% 50%, rgba(56,189,248,0.03) 0%, transparent 50%);
            animation: ambientRotate 20s linear infinite;
        }
        @keyframes ambientRotate { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }

        .login-wrapper {
            width:100%; max-width:420px; padding:20px;
            position: relative; z-index: 1;
        }

        .login-header {
            text-align:center; margin-bottom:40px;
        }
        .login-header .logo {
            font-size:36px; margin-bottom:16px;
        }
        .login-header h1 {
            font-size:28px; font-weight:700; letter-spacing:-0.5px; color:#ededed;
        }
        .login-header p {
            font-size:14px; color:#71717a; margin-top:8px; font-weight:400;
        }

        .login-card {
            background: #0c0c0c;
            border: 1px solid #222;
            border-radius: 16px;
            padding: 36px 32px;
        }

        .form-group { margin-bottom:24px; }
        .form-group label { display:block; font-size:13px; font-weight:500; color:#a1a1aa; margin-bottom:8px; }
        .form-group input {
            width:100%; padding:14px 16px;
            background:#0a0a0a; border:1px solid #333; border-radius:8px;
            color:#ededed; font-size:15px; font-family:inherit;
            transition: all 0.2s; outline:none;
        }
        .form-group input:focus { border-color: #555; box-shadow: 0 0 0 1px #555; }
        .form-group input::placeholder { color:#52525b; }

        .login-btn {
            width:100%; padding:14px;
            background:#ededed; color:#000; border:none; border-radius:8px;
            font-size:14px; font-weight:600; font-family:inherit;
            cursor:pointer; transition:all 0.2s;
        }
        .login-btn:hover { background:#fff; box-shadow: 0 0 20px rgba(255,255,255,0.15); }
        .login-btn:active { transform: scale(0.98); }
        .login-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }

        .error-msg { color:#ef4444; font-size:13px; text-align:center; margin-top:16px; display:none; font-weight:500; }

        .login-footer { text-align:center; margin-top:32px; }
        .login-footer span { font-size:12px; color:#52525b; font-weight:400; }
    </style>
</head>
<body>
    <div class="login-page">
        <div class="login-wrapper">
            <div class="login-header">
                <div class="logo">⚡</div>
                <h1>Biz-Panel</h1>
                <p>Server Management Panel</p>
            </div>
            <div class="login-card">
                <form id="loginForm" onsubmit="handleLogin(event)">
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" id="username" placeholder="admin" required autofocus>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="password" placeholder="••••••••" required>
                    </div>
                    <button type="submit" class="login-btn" id="loginBtn">Sign in →</button>
                    <div class="error-msg" id="errorMsg"></div>
                </form>
            </div>
            <div class="login-footer">
                <span>v2.0.0 · Built with Rust 🦀</span>
            </div>
        </div>
    </div>
    <script>
    async function handleLogin(e) {
        e.preventDefault();
        const btn = document.getElementById('loginBtn');
        const errEl = document.getElementById('errorMsg');
        btn.disabled = true; btn.textContent = 'Signing in...';
        errEl.style.display = 'none';
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    username: document.getElementById('username').value,
                    password: document.getElementById('password').value,
                }),
            });
            const data = await res.json();
            if (res.ok && data.token) {
                document.cookie = `biz_token=${data.token}; path=/; max-age=86400; SameSite=Strict`;
                localStorage.setItem('biz_token', data.token);
                window.location.href = '/';
            } else {
                errEl.textContent = data.error || 'Invalid credentials';
                errEl.style.display = 'block';
            }
        } catch(err) {
            errEl.textContent = 'Connection failed';
            errEl.style.display = 'block';
        }
        btn.disabled = false; btn.textContent = 'Sign in →';
    }
    </script>
</body>
</html>"##;

const BASE_HTML: &str = r##"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}} — Biz-Panel</title>
    <link rel="stylesheet" href="/static/css/main.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <script src="/static/js/app.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.min.js"></script>
</head>
<body>
    <div class="app-layout">
        <!-- Sidebar -->
        <nav class="sidebar" id="sidebar">
            <div class="sidebar-brand">
                <span class="brand-icon">⚡</span>
                <span class="brand-text">Biz-SaaS</span>
                <span class="brand-version" style="background:var(--success-bg);color:var(--success);border-radius:4px;padding:2px 6px;font-size:10px;">MASTER</span>
            </div>
            <div class="sidebar-nav">
                <div style="padding: 10px 16px; margin-bottom: 8px;">
                    <a href="/servers" class="login-btn" style="text-decoration:none; display:flex; justify-content:center; background: var(--gradient-brand); color:#fff; border:none;">
                        🔗 Kết Nối Máy Chủ Mới
                    </a>
                </div>
                
                <a href="/" class="nav-item" data-page="dashboard"><span class="nav-icon">🖥️</span><span class="nav-label">Máy Chủ</span><span style="margin-left:auto;background:rgba(255,255,255,0.05);padding:2px 8px;border-radius:12px;font-size:11px;">5</span></a>
                <a href="/websites" class="nav-item"><span class="nav-icon">🌐</span><span class="nav-label">Website</span><span style="margin-left:auto;background:rgba(255,255,255,0.05);padding:2px 8px;border-radius:12px;font-size:11px;">12</span></a>
                <a href="/backups" class="nav-item"><span class="nav-icon">☁️</span><span class="nav-label">Sao Lưu</span></a>
                <a href="/events" class="nav-item"><span class="nav-icon">📡</span><span class="nav-label">Sự Kiện</span></a>
                <a href="/scripts" class="nav-item"><span class="nav-icon">📜</span><span class="nav-label">Scripts</span></a>

                <div class="nav-section">MANAGER</div>
                <a href="/teams" class="nav-item"><span class="nav-icon">👥</span><span class="nav-label">Nhóm</span></a>
                <a href="/providers" class="nav-item"><span class="nav-icon">🌩️</span><span class="nav-label">Nhà Cung Cấp</span></a>
                <a href="/git" class="nav-item"><span class="nav-icon">🐙</span><span class="nav-label">Git</span></a>
                <a href="/dns" class="nav-item"><span class="nav-icon">🌐</span><span class="nav-label">DNS</span></a>
                <a href="/ssh" class="nav-item"><span class="nav-icon">🔑</span><span class="nav-label">SSH Keys</span></a>
                <a href="/settings" class="nav-item"><span class="nav-icon">⚙️</span><span class="nav-label">Cài Đặt</span></a>
            </div>
            <div class="sidebar-footer">
                <button class="logout-btn" onclick="logout()">↗ Sign out</button>
            </div>
        </nav>

        <!-- Main Content -->
        <main class="main-content">
            <header class="topbar">
                <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
                <div class="topbar-title" id="pageTitle">{{title}}</div>
                <div class="topbar-actions">
                    <div class="server-status" id="serverStatus"><span class="dot"></span> Online</div>
                    <div class="topbar-user"><div class="avatar">A</div><span id="currentUser">admin</span></div>
                </div>
            </header>
            <div class="page-content" id="pageContent">
                {{content}}
            </div>
        </main>
    </div>
</body>
</html>"##;

const DASHBOARD_CONTENT: &str = r##"
<div class="quick-actions-bar" style="margin-bottom: 24px; background: linear-gradient(135deg, #0e7490 0%, #083344 100%); border-radius: 12px; padding: 24px; position:relative; overflow:hidden;">
    <h3 style="margin-bottom:8px; font-size: 20px; color: #fff; display:flex; align-items:center; gap:8px;">
        <span style="font-size: 24px;">📦</span> Di chuyển từ Control Panel
    </h3>
    <p style="color: rgba(255,255,255,0.7); max-width: 600px; font-size: 14px;">Dễ dàng di chuyển trạng web và cơ sở dữ liệu từ CyberPanel / aaPanel sang Biz-SaaS chỉ với 1 click chuột.</p>
    <div style="position:absolute; right: 24px; top: 50%; transform: translateY(-50%); display:flex; gap: 12px;">
       <button style="padding: 8px 16px; background: transparent; border: 1px solid rgba(255,255,255,0.3); color: #fff; border-radius: 8px; cursor: pointer;">⚡ CyberPanel</button>
       <button style="padding: 8px 16px; background: transparent; border: 1px solid rgba(255,255,255,0.3); color: #fff; border-radius: 8px; cursor: pointer;">🐘 aaPanel</button>
    </div>
</div>

<div class="card" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 24px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
        <h2 style="font-size:24px; font-weight:600; color:var(--text-primary);">Máy chủ</h2>
        <button class="login-btn" onclick="showAddNodeModal()" style="width:auto; padding: 10px 20px; background: var(--gradient-brand); color: #fff; border:none; display:flex; gap:8px;">
            <span>➕</span> Tạo Máy Chủ
        </button>
    </div>

    <div style="display:flex; justify-content:space-between; margin-bottom: 16px;">
        <div style="font-size:13px; color:var(--text-muted);">Bộ lọc đang hoạt động: <span style="color:var(--text-primary)">Không có bộ lọc</span></div>
        <div style="display:flex; gap:8px;">
            <input type="text" placeholder="🔍 Tìm Kiếm" style="padding:8px 16px; background:var(--bg-input); border:1px solid var(--border); border-radius:8px; color:var(--text-primary); outline:none;">
        </div>
    </div>

    <table class="data-table" style="width:100%; text-align:left; border-collapse:collapse;">
        <thead>
            <tr style="border-bottom: 1px solid var(--border); color:var(--text-muted); font-size:13px;">
                <th style="padding:12px 16px; width:40px;"><input type="checkbox"></th>
                <th style="padding:12px 16px;">Tên Server</th>
                <th style="padding:12px 16px;">IP Address</th>
                <th style="padding:12px 16px;">Trạng thái</th>
                <th style="padding:12px 16px;">Hành động</th>
            </tr>
        </thead>
        <tbody id="nodesTableBody">
            <tr><td colspan="5" style="padding: 16px; text-align: center;">Đang tải dữ liệu...</td></tr>
        </tbody>
    </table>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('pageTitle').textContent = 'Quản lý Máy Chủ (SaaS Master)';
    if (typeof loadNodes === 'function') loadNodes();
});
</script>
"##;

const MAIN_APP_CONTENT: &str = r##"
<div id="dynamicContent" class="dynamic-page">
    <div class="loading-spinner">Loading...</div>
</div>
"##;

const MAIN_CSS: &str = include_str!("../../static/css/main.css");
const APP_JS: &str = include_str!("../../static/js/app.js");
