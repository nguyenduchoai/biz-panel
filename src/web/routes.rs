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
    <title>Biz-Panel - Login</title>
    <link rel="stylesheet" href="/static/css/main.css">
    <style>
        .login-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #0a0e1a 0%, #1a1f35 50%, #0d1117 100%); }
        .login-card { background: rgba(22, 27, 45, 0.95); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 20px; padding: 48px; width: 420px; backdrop-filter: blur(20px); box-shadow: 0 25px 60px rgba(0,0,0,0.5), 0 0 120px rgba(99, 102, 241, 0.1); }
        .login-logo { text-align: center; margin-bottom: 32px; }
        .login-logo h1 { font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #818cf8, #6366f1, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
        .login-logo p { color: #64748b; margin-top: 8px; font-size: 14px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; color: #94a3b8; font-size: 13px; font-weight: 500; margin-bottom: 8px; }
        .form-group input { width: 100%; padding: 14px 16px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(99, 102, 241, 0.15); border-radius: 12px; color: #e2e8f0; font-size: 15px; transition: all 0.3s; box-sizing: border-box; }
        .form-group input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
        .login-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s; margin-top: 8px; }
        .login-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4); }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .error-msg { color: #f87171; font-size: 13px; text-align: center; margin-top: 12px; display: none; }
        .version { text-align: center; color: #475569; font-size: 12px; margin-top: 24px; }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <div class="login-logo">
                <h1>⚡ Biz-Panel</h1>
                <p>Premium Server Management Panel</p>
            </div>
            <form id="loginForm" onsubmit="handleLogin(event)">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="username" placeholder="Enter username" required autofocus>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="password" placeholder="Enter password" required>
                </div>
                <button type="submit" class="login-btn" id="loginBtn">Sign In</button>
                <div class="error-msg" id="errorMsg"></div>
            </form>
            <div class="version">v2.0.0 • Built with Rust 🦀</div>
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
                errEl.textContent = data.error || 'Login failed';
                errEl.style.display = 'block';
            }
        } catch(err) {
            errEl.textContent = 'Connection error';
            errEl.style.display = 'block';
        }
        btn.disabled = false; btn.textContent = 'Sign In';
    }
    </script>
</body>
</html>"##;

const BASE_HTML: &str = r##"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}} - Biz-Panel</title>
    <link rel="stylesheet" href="/static/css/main.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
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
                <a href="/websites" class="nav-item" data-page="websites"><span class="nav-icon">🌐</span><span class="nav-label">Websites</span></a>
                <a href="/databases" class="nav-item" data-page="databases"><span class="nav-icon">🗄️</span><span class="nav-label">Databases</span></a>
                <a href="/docker" class="nav-item" data-page="docker"><span class="nav-icon">🐳</span><span class="nav-label">Docker</span></a>
                <a href="/files" class="nav-item" data-page="files"><span class="nav-icon">📁</span><span class="nav-label">Files</span></a>
                <a href="/terminal" class="nav-item" data-page="terminal"><span class="nav-icon">💻</span><span class="nav-label">Terminal</span></a>
                <div class="nav-section">Services</div>
                <a href="/services" class="nav-item" data-page="services"><span class="nav-icon">⚙️</span><span class="nav-label">Services</span></a>
                <a href="/software" class="nav-item" data-page="software"><span class="nav-icon">📦</span><span class="nav-label">Software</span></a>
                <a href="/php" class="nav-item" data-page="php"><span class="nav-icon">🐘</span><span class="nav-label">PHP</span></a>
                <a href="/appstore" class="nav-item" data-page="appstore"><span class="nav-icon">🛒</span><span class="nav-label">App Store</span></a>
                <div class="nav-section">Security</div>
                <a href="/security" class="nav-item" data-page="security"><span class="nav-icon">🛡️</span><span class="nav-label">Security</span></a>
                <a href="/ssl" class="nav-item" data-page="ssl"><span class="nav-icon">🔒</span><span class="nav-label">SSL</span></a>
                <div class="nav-section">System</div>
                <a href="/logs" class="nav-item" data-page="logs"><span class="nav-icon">📋</span><span class="nav-label">Logs</span></a>
                <a href="/cron" class="nav-item" data-page="cron"><span class="nav-icon">⏰</span><span class="nav-label">Cron Jobs</span></a>
                <a href="/settings" class="nav-item" data-page="settings"><span class="nav-icon">⚙️</span><span class="nav-label">Settings</span></a>
            </div>
            <div class="sidebar-footer">
                <button class="logout-btn" onclick="logout()">🚪 Logout</button>
            </div>
        </nav>

        <!-- Main Content -->
        <main class="main-content">
            <header class="topbar">
                <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
                <div class="topbar-title" id="pageTitle">{{title}}</div>
                <div class="topbar-actions">
                    <span class="server-status" id="serverStatus">●</span>
                    <span class="topbar-user" id="currentUser">admin</span>
                </div>
            </header>
            <div class="page-content" id="pageContent">
                {{content}}
            </div>
        </main>
    </div>

    <!-- app.js loaded in head -->
    <script>
        // Highlight active nav (handled by app.js auto-init, this is a fallback)
    </script>
</body>
</html>"##;

const DASHBOARD_CONTENT: &str = r##"
<div class="dashboard-grid">
    <div class="stat-card" id="cpuCard">
        <div class="stat-header">
            <span class="stat-icon">🖥️</span>
            <span class="stat-title">CPU Usage</span>
        </div>
        <div class="stat-value" id="cpuValue">--</div>
        <div class="stat-bar"><div class="stat-bar-fill cpu-bar" id="cpuBar" style="width:0%"></div></div>
        <div class="stat-detail" id="cpuDetail">Loading...</div>
    </div>
    <div class="stat-card" id="memCard">
        <div class="stat-header">
            <span class="stat-icon">💾</span>
            <span class="stat-title">Memory</span>
        </div>
        <div class="stat-value" id="memValue">--</div>
        <div class="stat-bar"><div class="stat-bar-fill mem-bar" id="memBar" style="width:0%"></div></div>
        <div class="stat-detail" id="memDetail">Loading...</div>
    </div>
    <div class="stat-card" id="diskCard">
        <div class="stat-header">
            <span class="stat-icon">💿</span>
            <span class="stat-title">Disk</span>
        </div>
        <div class="stat-value" id="diskValue">--</div>
        <div class="stat-bar"><div class="stat-bar-fill disk-bar" id="diskBar" style="width:0%"></div></div>
        <div class="stat-detail" id="diskDetail">Loading...</div>
    </div>
    <div class="stat-card" id="uptimeCard">
        <div class="stat-header">
            <span class="stat-icon">⏱️</span>
            <span class="stat-title">Uptime</span>
        </div>
        <div class="stat-value" id="uptimeValue">--</div>
        <div class="stat-detail" id="uptimeDetail">Loading...</div>
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
            <div class="info-item"><span class="info-label">Hostname</span><span class="info-value" id="sysHostname">--</span></div>
            <div class="info-item"><span class="info-label">OS</span><span class="info-value" id="sysOS">--</span></div>
            <div class="info-item"><span class="info-label">CPU Model</span><span class="info-value" id="sysCPU">--</span></div>
            <div class="info-item"><span class="info-label">CPU Cores</span><span class="info-value" id="sysCores">--</span></div>
            <div class="info-item"><span class="info-label">Load Average</span><span class="info-value" id="sysLoad">--</span></div>
            <div class="info-item"><span class="info-label">Network TX</span><span class="info-value" id="sysNetTx">--</span></div>
            <div class="info-item"><span class="info-label">Network RX</span><span class="info-value" id="sysNetRx">--</span></div>
            <div class="info-item"><span class="info-label">Panel</span><span class="info-value">Biz-Panel v2.0 🦀</span></div>
        </div>
    </div>
    <div class="info-card">
        <h3>Recent Activity</h3>
        <div id="activityList" class="activity-list">
            <div class="loading-spinner">Loading...</div>
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

    metricsChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'CPU %', data: cpuHistory, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4 },
                { label: 'Memory %', data: memHistory, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
            ],
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } }, x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', maxTicksLimit: 10 } } }, plugins: { legend: { labels: { color: '#94a3b8' } } } },
    });

    networkChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'TX (KB/s)', data: netTxHistory, borderColor: '#f59e0b', tension: 0.4 },
                { label: 'RX (KB/s)', data: netRxHistory, borderColor: '#3b82f6', tension: 0.4 },
            ],
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } }, x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', maxTicksLimit: 10 } } }, plugins: { legend: { labels: { color: '#94a3b8' } } } },
    });
}

let prevNetSent = 0, prevNetRecv = 0;

function updateMetrics(data) {
    // CPU
    const cpuEl = document.getElementById('cpuValue');
    const cpuBar = document.getElementById('cpuBar');
    const cpuDetail = document.getElementById('cpuDetail');
    if (cpuEl) { cpuEl.textContent = data.cpu.usage.toFixed(1) + '%'; cpuBar.style.width = data.cpu.usage + '%'; cpuDetail.textContent = data.cpu.cores + ' cores • ' + data.cpu.model; }

    // Memory
    const memPct = data.memory.usedPercent || ((data.memory.used / data.memory.total) * 100);
    const memEl = document.getElementById('memValue');
    const memBar = document.getElementById('memBar');
    if (memEl) { memEl.textContent = memPct.toFixed(1) + '%'; memBar.style.width = memPct + '%'; document.getElementById('memDetail').textContent = formatBytes(data.memory.used) + ' / ' + formatBytes(data.memory.total); }

    // Disk
    const diskPct = data.disk.usedPercent || ((data.disk.used / data.disk.total) * 100);
    const diskEl = document.getElementById('diskValue');
    if (diskEl) { diskEl.textContent = diskPct.toFixed(1) + '%'; document.getElementById('diskBar').style.width = diskPct + '%'; document.getElementById('diskDetail').textContent = formatBytes(data.disk.used) + ' / ' + formatBytes(data.disk.total); }

    // Uptime
    const uptimeEl = document.getElementById('uptimeValue');
    if (uptimeEl) { uptimeEl.textContent = formatUptime(data.uptime); document.getElementById('uptimeDetail').textContent = data.hostname; }

    // System info
    setEl('sysHostname', data.hostname);
    setEl('sysOS', data.os + ' ' + data.platform);
    setEl('sysCPU', data.cpu.model);
    setEl('sysCores', data.cpu.cores);
    if (data.loadAvg) setEl('sysLoad', data.loadAvg.map(v => v.toFixed(2)).join(', '));
    setEl('sysNetTx', formatBytes(data.network.bytesSent));
    setEl('sysNetRx', formatBytes(data.network.bytesRecv));

    // Charts
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

    // Status indicator
    const statusEl = document.getElementById('serverStatus');
    if (statusEl) { statusEl.style.color = '#10b981'; }
}

function setEl(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

// WebSocket for real-time metrics
function connectMetricsWS() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/api/metrics/ws`);
    ws.onmessage = (e) => { try { updateMetrics(JSON.parse(e.data)); } catch(err) {} };
    ws.onclose = () => { setTimeout(connectMetricsWS, 3000); };
    ws.onerror = () => { ws.close(); };
}

// Load activities
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
    <div class="loading-spinner">Loading page content...</div>
</div>
"##;

const MAIN_CSS: &str = include_str!("../../static/css/main.css");
const APP_JS: &str = include_str!("../../static/js/app.js");
