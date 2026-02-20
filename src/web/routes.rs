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
                <span class="brand-text">Biz-Panel</span>
                <span class="brand-version">v2.0</span>
            </div>
            <div class="sidebar-nav">
                <a href="/" class="nav-item" data-page="dashboard"><span class="nav-icon">📊</span><span class="nav-label">Dashboard</span></a>

                <div class="nav-section">Server</div>
                <a href="/websites" class="nav-item"><span class="nav-icon">🌐</span><span class="nav-label">Websites</span></a>
                <a href="/databases" class="nav-item"><span class="nav-icon">🗄️</span><span class="nav-label">Databases</span></a>
                <a href="/docker" class="nav-item"><span class="nav-icon">🐳</span><span class="nav-label">Docker</span></a>
                <a href="/files" class="nav-item"><span class="nav-icon">📁</span><span class="nav-label">Files</span></a>
                <a href="/terminal" class="nav-item"><span class="nav-icon">💻</span><span class="nav-label">Terminal</span></a>

                <div class="nav-section">Services</div>
                <a href="/services" class="nav-item"><span class="nav-icon">⚙️</span><span class="nav-label">Services</span></a>
                <a href="/php" class="nav-item"><span class="nav-icon">🐘</span><span class="nav-label">PHP</span></a>
                <a href="/appstore" class="nav-item"><span class="nav-icon">🛒</span><span class="nav-label">App Store</span></a>

                <div class="nav-section">Security</div>
                <a href="/security" class="nav-item"><span class="nav-icon">🛡️</span><span class="nav-label">Firewall</span></a>
                <a href="/ssl" class="nav-item"><span class="nav-icon">🔒</span><span class="nav-label">SSL</span></a>

                <div class="nav-section">System</div>
                <a href="/backups" class="nav-item"><span class="nav-icon">💾</span><span class="nav-label">Backups</span></a>
                <a href="/logs" class="nav-item"><span class="nav-icon">📋</span><span class="nav-label">Logs</span></a>
                <a href="/cron" class="nav-item"><span class="nav-icon">⏰</span><span class="nav-label">Cron Jobs</span></a>
                <a href="/settings" class="nav-item"><span class="nav-icon">⚙️</span><span class="nav-label">Settings</span></a>
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
<div class="dashboard-grid">
    <div class="stat-card" id="cpuCard">
        <div class="stat-header">
            <span class="stat-icon">🖥️</span>
            <span class="stat-title">CPU Usage</span>
        </div>
        <div class="stat-value" id="cpuValue">—</div>
        <div class="stat-bar"><div class="stat-bar-fill cpu-bar" id="cpuBar" style="width:0%"></div></div>
        <div class="stat-detail" id="cpuDetail">Connecting...</div>
    </div>
    <div class="stat-card" id="memCard">
        <div class="stat-header">
            <span class="stat-icon">💾</span>
            <span class="stat-title">Memory</span>
        </div>
        <div class="stat-value" id="memValue">—</div>
        <div class="stat-bar"><div class="stat-bar-fill mem-bar" id="memBar" style="width:0%"></div></div>
        <div class="stat-detail" id="memDetail">Connecting...</div>
    </div>
    <div class="stat-card" id="diskCard">
        <div class="stat-header">
            <span class="stat-icon">💿</span>
            <span class="stat-title">Disk</span>
        </div>
        <div class="stat-value" id="diskValue">—</div>
        <div class="stat-bar"><div class="stat-bar-fill disk-bar" id="diskBar" style="width:0%"></div></div>
        <div class="stat-detail" id="diskDetail">Connecting...</div>
    </div>
    <div class="stat-card" id="uptimeCard">
        <div class="stat-header">
            <span class="stat-icon">⏱️</span>
            <span class="stat-title">Uptime</span>
        </div>
        <div class="stat-value" id="uptimeValue">—</div>
        <div class="stat-detail" id="uptimeDetail">Connecting...</div>
    </div>
</div>

<div class="dashboard-row">
    <div class="chart-card">
        <h3>CPU & Memory History</h3>
        <canvas id="metricsChart" height="200"></canvas>
    </div>
    <div class="chart-card">
        <h3>Network Traffic</h3>
        <canvas id="networkChart" height="200"></canvas>
    </div>
</div>

<div class="dashboard-row">
    <div class="info-card">
        <h3>System Information</h3>
        <div class="info-grid">
            <div class="info-item"><span class="info-label">Hostname</span><span class="info-value" id="sysHostname">—</span></div>
            <div class="info-item"><span class="info-label">OS</span><span class="info-value" id="sysOS">—</span></div>
            <div class="info-item"><span class="info-label">CPU Model</span><span class="info-value" id="sysCPU">—</span></div>
            <div class="info-item"><span class="info-label">CPU Cores</span><span class="info-value" id="sysCores">—</span></div>
            <div class="info-item"><span class="info-label">Load Average</span><span class="info-value" id="sysLoad">—</span></div>
            <div class="info-item"><span class="info-label">Network TX</span><span class="info-value" id="sysNetTx">—</span></div>
            <div class="info-item"><span class="info-label">Network RX</span><span class="info-value" id="sysNetRx">—</span></div>
            <div class="info-item"><span class="info-label">Panel</span><span class="info-value">Biz-Panel v2.0 🦀</span></div>
        </div>
    </div>
    <div class="info-card">
        <h3>Recent Activity</h3>
        <div id="activityList" class="activity-list">
            <div class="loading-spinner">Connecting...</div>
        </div>
    </div>
</div>

<script>
// Dashboard real-time metrics
let metricsChart, networkChart;
const cpuHistory = [], memHistory = [], netTxHistory = [], netRxHistory = [], labels = [];

function initCharts() {
    const ctx1 = document.getElementById('metricsChart');
    const ctx2 = document.getElementById('networkChart');
    if (!ctx1 || !ctx2) return;

    const gridColor = 'rgba(255,255,255,0.04)';
    const tickColor = '#52525b';

    metricsChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'CPU %', data: cpuHistory, borderColor: '#ededed', backgroundColor: 'rgba(255,255,255,0.05)', fill: true, tension: 0.4, borderWidth: 1.5, pointRadius: 0 },
                { label: 'Memory %', data: memHistory, borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.05)', fill: true, tension: 0.4, borderWidth: 1.5, pointRadius: 0 },
            ],
        },
        options: {
            responsive: true,
            interaction: { intersect: false, mode: 'index' },
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } } },
                x: { grid: { color: gridColor }, ticks: { color: tickColor, maxTicksLimit: 8, font: { size: 11 } } }
            },
            plugins: { legend: { labels: { color: '#a1a1aa', font: { size: 12 }, usePointStyle: true, pointStyle: 'circle' } } }
        },
    });

    networkChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'TX (KB/s)', data: netTxHistory, borderColor: '#fbbf24', tension: 0.4, borderWidth: 1.5, pointRadius: 0 },
                { label: 'RX (KB/s)', data: netRxHistory, borderColor: '#60a5fa', tension: 0.4, borderWidth: 1.5, pointRadius: 0 },
            ],
        },
        options: {
            responsive: true,
            interaction: { intersect: false, mode: 'index' },
            scales: {
                y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } } },
                x: { grid: { color: gridColor }, ticks: { color: tickColor, maxTicksLimit: 8, font: { size: 11 } } }
            },
            plugins: { legend: { labels: { color: '#a1a1aa', font: { size: 12 }, usePointStyle: true, pointStyle: 'circle' } } }
        },
    });
}

let prevNetSent = 0, prevNetRecv = 0;

function updateMetrics(data) {
    const cpuEl = document.getElementById('cpuValue');
    const cpuBar = document.getElementById('cpuBar');
    const cpuDetail = document.getElementById('cpuDetail');
    if (cpuEl) { cpuEl.textContent = data.cpu.usage.toFixed(1) + '%'; cpuBar.style.width = data.cpu.usage + '%'; cpuDetail.textContent = data.cpu.cores + ' cores · ' + data.cpu.model; }

    const memPct = data.memory.usedPercent || ((data.memory.used / data.memory.total) * 100);
    const memEl = document.getElementById('memValue');
    const memBar = document.getElementById('memBar');
    if (memEl) { memEl.textContent = memPct.toFixed(1) + '%'; memBar.style.width = memPct + '%'; document.getElementById('memDetail').textContent = formatBytes(data.memory.used) + ' / ' + formatBytes(data.memory.total); }

    const diskPct = data.disk.usedPercent || ((data.disk.used / data.disk.total) * 100);
    const diskEl = document.getElementById('diskValue');
    if (diskEl) { diskEl.textContent = diskPct.toFixed(1) + '%'; document.getElementById('diskBar').style.width = diskPct + '%'; document.getElementById('diskDetail').textContent = formatBytes(data.disk.used) + ' / ' + formatBytes(data.disk.total); }

    const uptimeEl = document.getElementById('uptimeValue');
    if (uptimeEl) { uptimeEl.textContent = formatUptime(data.uptime); document.getElementById('uptimeDetail').textContent = data.hostname; }

    setEl('sysHostname', data.hostname);
    setEl('sysOS', data.os + ' ' + data.platform);
    setEl('sysCPU', data.cpu.model);
    setEl('sysCores', data.cpu.cores);
    if (data.loadAvg) setEl('sysLoad', data.loadAvg.map(v => v.toFixed(2)).join(', '));
    setEl('sysNetTx', formatBytes(data.network.bytesSent));
    setEl('sysNetRx', formatBytes(data.network.bytesRecv));

    const now = new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'});
    labels.push(now);
    cpuHistory.push(data.cpu.usage);
    memHistory.push(memPct);

    const txRate = prevNetSent > 0 ? (data.network.bytesSent - prevNetSent) / 1024 : 0;
    const rxRate = prevNetRecv > 0 ? (data.network.bytesRecv - prevNetRecv) / 1024 : 0;
    netTxHistory.push(Math.max(0, txRate));
    netRxHistory.push(Math.max(0, rxRate));
    prevNetSent = data.network.bytesSent;
    prevNetRecv = data.network.bytesRecv;

    if (labels.length > 30) { labels.shift(); cpuHistory.shift(); memHistory.shift(); netTxHistory.shift(); netRxHistory.shift(); }
    if (metricsChart) { metricsChart.update('none'); }
    if (networkChart) { networkChart.update('none'); }
}

function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function connectMetricsWS() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/api/metrics/ws`);
    ws.onmessage = (e) => { try { updateMetrics(JSON.parse(e.data)); } catch(err) {} };
    ws.onclose = () => { setTimeout(connectMetricsWS, 3000); };
    ws.onerror = () => { ws.close(); };
}

async function loadActivities() {
    try {
        const token = localStorage.getItem('biz_token');
        const res = await fetch('/api/activities', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        const el = document.getElementById('activityList');
        if (el && Array.isArray(data)) {
            el.innerHTML = data.slice(0, 10).map(a => `
                <div class="activity-item">
                    <span class="activity-status ${a.status}">${a.status === 'success' ? '✅' : '❌'}</span>
                    <div class="activity-info">
                        <div class="activity-title">${a.title}</div>
                        <div class="activity-desc">${a.description}</div>
                    </div>
                    <span class="activity-time">${new Date(a.timestamp).toLocaleTimeString()}</span>
                </div>
            `).join('') || '<div class="empty-state">No recent activity</div>';
        }
    } catch(e) {}
}

document.addEventListener('DOMContentLoaded', function() {
    initCharts();
    connectMetricsWS();
    loadActivities();
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
