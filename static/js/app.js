// Biz-Panel v2.0 - Frontend JavaScript
// Handles API calls, page rendering, and interactivity

const API_TOKEN = () => localStorage.getItem('biz_token') || '';

// ========== API HELPERS ==========

async function fetchAPI(url, options = {}) {
    const defaults = {
        headers: {
            'Authorization': `Bearer ${API_TOKEN()}`,
            'Content-Type': 'application/json',
        },
    };
    const res = await fetch(url, { ...defaults, ...options });
    if (res.status === 401) { window.location.href = '/login'; return; }
    return res.json();
}

async function postAPI(url, data) {
    return fetchAPI(url, { method: 'POST', body: JSON.stringify(data) });
}

async function putAPI(url, data) {
    return fetchAPI(url, { method: 'PUT', body: JSON.stringify(data) });
}

async function deleteAPI(url) {
    return fetchAPI(url, { method: 'DELETE' });
}

// ========== UTILITY FUNCTIONS ==========

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function showModal(title, content, onSubmit) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal"><h3>${title}</h3><div class="modal-body">${content}</div>
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="btn btn-primary" id="modalSubmit">Submit</button>
        </div></div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.getElementById('modalSubmit').addEventListener('click', () => { onSubmit(); });
}

// ========== PAGE RENDERERS ==========

function renderTable(title, icon, data, columns, actions = []) {
    const rows = Array.isArray(data) ? data : [];
    const actionBtns = actions.map(a => `<button class="btn btn-primary" onclick="${a.action}()">${a.label}</button>`).join('');

    return `
        <div class="page-header">
            <h2>${icon} ${title}</h2>
            <div class="header-actions">${actionBtns}</div>
        </div>
        ${rows.length === 0 ? '<div class="empty-state">No items found. Create one to get started.</div>' : `
        <table class="data-table">
            <thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}<th>Actions</th></tr></thead>
            <tbody>
                ${rows.map(row => `<tr>
                    ${columns.map(c => {
                        let val = row[c] ?? '';
                        if (c === 'status' || c === 'state') val = `<span class="status-badge status-${val}">${val}</span>`;
                        if (c === 'enabled') val = val ? '<span class="tag tag-green">Active</span>' : '<span class="tag tag-red">Disabled</span>';
                        return `<td>${val}</td>`;
                    }).join('')}
                    <td><button class="btn btn-danger btn-sm" onclick="deleteItem('${title.toLowerCase().replace(/\s+/g, '')}', '${row.id}')">Delete</button></td>
                </tr>`).join('')}
            </tbody>
        </table>`}`;
}

function renderDockerPage(containers, stats, overview) {
    const list = Array.isArray(containers) ? containers : [];
    const statsList = Array.isArray(stats) ? stats : [];
    const ov = overview || {};

    // Build stats lookup by container name
    const statsMap = {};
    statsList.forEach(s => { statsMap[s.name] = s; });

    // Group containers by project
    const projects = {};
    list.forEach(c => {
        const proj = c.project || 'standalone';
        if (!projects[proj]) projects[proj] = [];
        projects[proj].push(c);
    });

    const running = list.filter(c => c.state === 'running').length;
    const stopped = list.filter(c => c.state !== 'running').length;

    return `
        <!-- Docker Overview Banner -->
        <div class="page-header">
            <h2>🐳 Docker</h2>
            <div class="header-actions">
                <button class="btn btn-primary" onclick="showDeployContainerForm()">+ Deploy Container</button>
                <button class="btn btn-secondary" onclick="showComposeForm()">📄 Compose</button>
                <button class="btn btn-secondary" onclick="showPullImageForm()">⬇ Pull Image</button>
                <button class="btn btn-secondary" onclick="showDockerTab('containers')" id="dockerTabBtn-containers">Containers</button>
                <button class="btn btn-secondary" onclick="showDockerTab('images')" id="dockerTabBtn-images">Images</button>
                <button class="btn btn-secondary" onclick="showDockerTab('networks')" id="dockerTabBtn-networks">Networks</button>
                <button class="btn btn-secondary" onclick="showDockerTab('volumes')" id="dockerTabBtn-volumes">Volumes</button>
            </div>
        </div>

        <!-- System Overview -->
        <div class="dashboard-grid" style="margin-bottom:24px">
            <div class="stat-card">
                <div class="stat-header"><span class="stat-icon">📊</span><span class="stat-title">Containers</span></div>
                <div class="stat-value">${list.length}</div>
                <div class="stat-detail"><span style="color:var(--success)">● ${running} running</span> · <span style="color:var(--text-muted)">${stopped} stopped</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><span class="stat-icon">📦</span><span class="stat-title">Images</span></div>
                <div class="stat-value">${ov.images || '—'}</div>
                <div class="stat-detail">Docker ${ov.serverVersion || '—'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><span class="stat-icon">🗂️</span><span class="stat-title">Projects</span></div>
                <div class="stat-value">${Object.keys(projects).length}</div>
                <div class="stat-detail">${ov.driver || '—'} driver</div>
            </div>
            <div class="stat-card">
                <div class="stat-header"><span class="stat-icon">💾</span><span class="stat-title">Disk Usage</span></div>
                <div class="stat-value">${ov.diskUsage && ov.diskUsage[0] ? ov.diskUsage[0].size : '—'}</div>
                <div class="stat-detail">${ov.diskUsage && ov.diskUsage[0] ? ov.diskUsage[0].reclaimable + ' reclaimable' : ''}</div>
            </div>
        </div>

        <!-- Container Tab -->
        <div id="dockerTab-containers">
            ${list.length === 0 ? '<div class="empty-state">No containers found. Deploy from App Store or use docker-compose.</div>' : ''}
            ${Object.keys(projects).sort().map(proj => `
                <div class="docker-project-group">
                    <div class="docker-project-header">
                        <div class="docker-project-title">
                            <span style="font-size:18px">${proj === 'standalone' ? '📦' : '🗂️'}</span>
                            <span>${proj === 'standalone' ? 'Standalone Containers' : proj}</span>
                            <span class="tag tag-blue" style="margin-left:8px">${projects[proj].length} container${projects[proj].length > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <div class="docker-container-list">
                        ${projects[proj].map(c => {
                            const s = statsMap[c.name] || {};
                            const isRunning = c.state === 'running';
                            return `
                            <div class="docker-container-card ${isRunning ? '' : 'docker-stopped'}">
                                <div class="docker-container-main">
                                    <div class="docker-container-left">
                                        <div class="docker-container-status">
                                            <span class="docker-status-dot ${isRunning ? 'status-running' : 'status-stopped'}"></span>
                                        </div>
                                        <div class="docker-container-info">
                                            <div class="docker-container-name">${c.name}</div>
                                            <div class="docker-container-image">${c.image}</div>
                                        </div>
                                    </div>
                                    <div class="docker-container-right">
                                        ${isRunning ? `
                                        <div class="docker-stats-grid">
                                            <div class="docker-stat-item">
                                                <span class="docker-stat-label">CPU</span>
                                                <span class="docker-stat-value">${s.cpu || '0%'}</span>
                                            </div>
                                            <div class="docker-stat-item">
                                                <span class="docker-stat-label">Memory</span>
                                                <span class="docker-stat-value">${s.memUsage || '—'}</span>
                                            </div>
                                            <div class="docker-stat-item">
                                                <span class="docker-stat-label">Net I/O</span>
                                                <span class="docker-stat-value">${s.netIO || '—'}</span>
                                            </div>
                                            <div class="docker-stat-item">
                                                <span class="docker-stat-label">Block I/O</span>
                                                <span class="docker-stat-value">${s.blockIO || '—'}</span>
                                            </div>
                                            <div class="docker-stat-item">
                                                <span class="docker-stat-label">PIDs</span>
                                                <span class="docker-stat-value">${s.pids || '—'}</span>
                                            </div>
                                        </div>
                                        ` : `
                                        <div class="docker-stopped-info">
                                            <span class="status-badge status-stopped">${c.state}</span>
                                            <span style="color:var(--text-muted);font-size:12px;margin-left:8px">${c.status}</span>
                                        </div>
                                        `}
                                    </div>
                                </div>
                                <div class="docker-container-meta">
                                    <div class="docker-meta-tags">
                                        ${c.ports ? `<span class="tag" title="Ports">${c.ports.substring(0,60)}${c.ports.length>60?'...':''}</span>` : ''}
                                        ${c.networks ? `<span class="tag" title="Networks">🌐 ${c.networks}</span>` : ''}
                                        ${c.service ? `<span class="tag tag-blue" title="Compose service">${c.service}</span>` : ''}
                                    </div>
                                    <div class="docker-container-actions">
                                        ${!isRunning ? `<button class="btn btn-success btn-sm" onclick="dockerAction('${c.id}','start')">▶ Start</button>` : ''}
                                        ${isRunning ? `<button class="btn btn-sm btn-secondary" onclick="dockerAction('${c.id}','stop')">⏹ Stop</button>` : ''}
                                        <button class="btn btn-sm btn-secondary" onclick="dockerAction('${c.id}','restart')">↺ Restart</button>
                                        <button class="btn btn-sm btn-secondary" onclick="viewContainerLogs('${c.id}','${c.name}')">📋 Logs</button>
                                        <button class="btn btn-danger btn-sm" onclick="dockerAction('${c.id}','remove')">Remove</button>
                                    </div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `).join('')}
        </div>

        <!-- Images / Networks / Volumes tabs (lazy loaded) -->
        <div id="dockerTab-images" style="display:none"></div>
        <div id="dockerTab-networks" style="display:none"></div>
        <div id="dockerTab-volumes" style="display:none"></div>

        <!-- Container Logs Modal -->
        <div id="containerLogsModal" style="display:none"></div>
    `;
}

function renderServicesPage(services) {
    const list = Array.isArray(services) ? services : [];
    const types = [...new Set(list.map(s => s.type))];
    return `
        <div class="page-header"><h2>⚙️ Services</h2></div>
        ${types.map(type => `
            <h3 style="margin: 20px 0 12px; color: var(--text-secondary); text-transform: capitalize;">${type}s</h3>
            <div class="service-grid">
                ${list.filter(s => s.type === type).map(s => `
                    <div class="service-card">
                        <div class="service-card-header">
                            <span class="service-card-icon">${s.icon}</span>
                            <div class="service-card-info">
                                <div class="service-card-name">${s.name}</div>
                                <div class="service-card-desc">${s.description}</div>
                            </div>
                            ${s.installed ? '<span class="tag tag-green">Installed</span>' : '<span class="tag tag-yellow">Not installed</span>'}
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted); margin: 8px 0;">
                            ${s.installedVersion ? `Version: ${s.installedVersion}` : ''}
                            ${s.status ? ` • Status: <span class="status-badge status-${s.status.state}">${s.status.state}</span>` : ''}
                        </div>
                        <div class="service-card-actions">
                            ${!s.installed ? `<button class="btn btn-primary btn-sm" onclick="installService('${s.id}')">Install</button>` : ''}
                            ${s.installed && s.systemdUnit ? `
                                <button class="btn btn-success btn-sm" onclick="serviceControl('${s.id}','start')">Start</button>
                                <button class="btn btn-sm" onclick="serviceControl('${s.id}','stop')" style="background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.3)">Stop</button>
                                <button class="btn btn-sm" onclick="serviceControl('${s.id}','restart')" style="background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3)">Restart</button>
                            ` : ''}
                            ${s.installed ? `<button class="btn btn-danger btn-sm" onclick="uninstallService('${s.id}')">Uninstall</button>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('')}`;
}

function renderFileManager() {
    return `
        <div class="page-header"><h2>📁 File Manager</h2></div>
        <div class="file-browser">
            <div class="file-breadcrumb" id="fileBreadcrumb">/</div>
            <ul class="file-list" id="fileList"><li class="loading-spinner">Loading...</li></ul>
        </div>`;
}

function renderTerminal() {
    return `
        <div class="page-header"><h2>💻 Terminal</h2></div>
        <div class="terminal-container">
            <div class="terminal-header">
                <span class="terminal-dot red"></span>
                <span class="terminal-dot yellow"></span>
                <span class="terminal-dot green"></span>
                <span class="terminal-title">bash — biz-panel</span>
            </div>
            <div id="terminal-el"></div>
        </div>`;
}

function renderLogsPage(sources) {
    const list = Array.isArray(sources) ? sources : [];
    return `
        <div class="page-header"><h2>📋 Logs</h2></div>
        <div class="service-grid">
            ${list.map(s => `
                <div class="service-card" onclick="viewLog('${s.name}')" style="cursor:pointer">
                    <div class="service-card-header">
                        <span class="service-card-icon">📄</span>
                        <div class="service-card-info">
                            <div class="service-card-name">${s.name}</div>
                            <div class="service-card-desc">${s.path} • ${formatBytes(s.size)}</div>
                        </div>
                        ${s.exists ? '<span class="tag tag-green">Available</span>' : '<span class="tag tag-red">Missing</span>'}
                    </div>
                </div>
            `).join('')}
        </div>
        <div id="logViewer" style="margin-top:20px;display:none">
            <div class="chart-card"><h3 id="logTitle">Log Viewer</h3>
                <pre id="logContent" style="max-height:500px;overflow:auto;font-size:12px;color:var(--text-secondary);background:var(--bg-input);padding:16px;border-radius:8px;font-family:monospace;white-space:pre-wrap;"></pre>
            </div>
        </div>`;
}

function renderSoftwarePage(software) {
    const list = Array.isArray(software) ? software : [];
    return `
        <div class="page-header"><h2>📦 Software</h2></div>
        <div class="service-grid">
            ${list.map(s => `
                <div class="service-card">
                    <div class="service-card-header">
                        <span class="service-card-icon">${s.icon}</span>
                        <div class="service-card-info">
                            <div class="service-card-name">${s.name}</div>
                            <div class="service-card-desc">${s.category}${s.version ? ' • v' + s.version : ''}</div>
                        </div>
                        ${s.installed ? '<span class="tag tag-green">Installed</span>' : '<span class="tag tag-yellow">Not installed</span>'}
                    </div>
                    <div class="service-card-actions">
                        ${!s.installed ? `<button class="btn btn-primary btn-sm" onclick="installSW('${s.id}')">Install</button>` : `<button class="btn btn-danger btn-sm" onclick="uninstallSW('${s.id}')">Uninstall</button>`}
                    </div>
                </div>
            `).join('')}
        </div>`;
}

function renderPHPPage(versions) {
    const list = Array.isArray(versions) ? versions : [];
    return `
        <div class="page-header"><h2>🐘 PHP Management</h2></div>
        <div class="service-grid">
            ${list.map(v => `
                <div class="service-card">
                    <div class="service-card-header">
                        <span class="service-card-icon">🐘</span>
                        <div class="service-card-info">
                            <div class="service-card-name">PHP ${v.version}</div>
                            <div class="service-card-desc">${v.isDefault ? '⭐ Default' : ''} ${v.status || ''}</div>
                        </div>
                        ${v.installed ? '<span class="tag tag-green">Installed</span>' : '<span class="tag tag-yellow">Not installed</span>'}
                    </div>
                    <div class="service-card-actions">
                        ${!v.installed ? `<button class="btn btn-primary btn-sm" onclick="installPHP('${v.version}')">Install</button>` :
                            `<button class="btn btn-success btn-sm" onclick="phpAction('${v.version}','start')">Start</button>
                             <button class="btn btn-sm" onclick="phpAction('${v.version}','restart')" style="background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3)">Restart</button>
                             <button class="btn btn-danger btn-sm" onclick="uninstallPHP('${v.version}')">Uninstall</button>`}
                    </div>
                </div>
            `).join('')}
        </div>`;
}

function renderAppStore(templates) {
    const list = Array.isArray(templates) ? templates : [];
    return `
        <div class="page-header"><h2>🛒 App Store</h2></div>
        <div class="service-grid">
            ${list.map(t => `
                <div class="service-card">
                    <div class="service-card-header">
                        <span class="service-card-icon">${t.icon}</span>
                        <div class="service-card-info">
                            <div class="service-card-name">${t.name}</div>
                            <div class="service-card-desc">${t.description} • v${t.version}</div>
                        </div>
                        <span class="tag tag-blue">${t.category}</span>
                    </div>
                    <div class="service-card-actions">
                        <button class="btn btn-primary btn-sm" onclick="deployApp('${t.id}')">Deploy</button>
                    </div>
                </div>
            `).join('')}
        </div>`;
}

function renderSettingsPage(settings) {
    return `
        <div class="page-header"><h2>⚙️ Settings</h2></div>
        <div class="chart-card">
            <h3>General Settings</h3>
            <div class="form-group"><label>Panel Title</label><input type="text" id="settTitle" value="${settings.general?.panelTitle || 'Biz-Panel'}"></div>
            <div class="form-group"><label>Timezone</label><input type="text" id="settTimezone" value="${settings.general?.timezone || 'UTC'}"></div>
            <div class="form-group"><label>Language</label>
                <select id="settLanguage"><option value="en" ${settings.general?.language==='en'?'selected':''}>English</option><option value="vi" ${settings.general?.language==='vi'?'selected':''}>Tiếng Việt</option></select>
            </div>
            <button class="btn btn-primary" onclick="saveSettings()">Save Settings</button>
        </div>
        <div class="chart-card" style="margin-top:20px">
            <h3>Change Password</h3>
            <div class="form-group"><label>New Password</label><input type="password" id="newPassword" placeholder="Min 8 characters"></div>
            <div class="form-group"><label>Confirm Password</label><input type="password" id="confirmPassword"></div>
            <button class="btn btn-primary" onclick="changePassword()">Change Password</button>
        </div>`;
}

// ========== ACTION HANDLERS ==========

async function deleteItem(type, id) {
    if (!confirm('Are you sure?')) return;
    const urlMap = { websites: '/api/websites/', databases: '/api/databases/', cronjobs: '/api/crons/', firewallrules: '/api/firewall/rules/' };
    const url = urlMap[type] || `/api/${type}/`;
    await deleteAPI(url + id);
    showToast('Deleted successfully');
    location.reload();
}

async function dockerAction(id, action) {
    if (action === 'remove' && !confirm('Remove this container?')) return;
    const url = action === 'remove' ? `/api/docker/containers/${id}` : `/api/docker/containers/${id}/${action}`;
    const method = action === 'remove' ? 'DELETE' : 'POST';
    showToast(`Container ${action}...`, 'info');
    await fetchAPI(url, { method });
    showToast(`Container ${action} successful`);
    setTimeout(() => loadPageContent('docker'), 1500);
}

async function viewContainerLogs(id, name) {
    const data = await fetchAPI(`/api/docker/containers/${id}/logs`);
    showModal('📋 Logs: ' + name,
        `<pre style="max-height:400px;overflow:auto;font-size:12px;color:var(--text-secondary);background:#000;padding:16px;border-radius:8px;font-family:var(--font-mono);white-space:pre-wrap;border:1px solid var(--border)">${(data.logs || 'No logs').replace(/</g,'&lt;')}</pre>`,
        () => {}
    );
}

async function showDockerTab(tab) {
    ['containers','images','networks','volumes'].forEach(t => {
        const el = document.getElementById('dockerTab-' + t);
        if (el) el.style.display = t === tab ? 'block' : 'none';
    });

    const tabEl = document.getElementById('dockerTab-' + tab);
    if (!tabEl || tabEl.dataset.loaded) return;

    tabEl.innerHTML = '<div class="loading-spinner">Loading...</div>';

    if (tab === 'images') {
        const images = await fetchAPI('/api/docker/images').catch(() => []);
        const list = Array.isArray(images) ? images : [];
        tabEl.innerHTML = `
            <div class="data-table-wrapper" style="margin-top:8px">
            <table class="data-table"><thead><tr><th>Repository</th><th>Tag</th><th>ID</th><th>Size</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>${list.map(i => `<tr>
                <td style="font-weight:600">${i.repository}</td><td><span class="tag">${i.tag}</span></td>
                <td style="font-family:var(--font-mono);font-size:12px">${(i.id||'').substring(0,12)}</td>
                <td>${i.size}</td><td>${i.created}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removeDockerImage('${i.id}')">Remove</button></td>
            </tr>`).join('') || '<tr><td colspan="6" class="empty-state">No images</td></tr>'}</tbody></table></div>`;
    } else if (tab === 'networks') {
        const nets = await fetchAPI('/api/docker/networks').catch(() => []);
        const list = Array.isArray(nets) ? nets : [];
        tabEl.innerHTML = `
            <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
                <button class="btn btn-primary btn-sm" onclick="showCreateNetworkForm()">+ Create Network</button>
            </div>
            <div class="data-table-wrapper">
            <table class="data-table"><thead><tr><th>Name</th><th>Driver</th><th>Scope</th><th>ID</th><th>Actions</th></tr></thead>
            <tbody>${list.map(n => `<tr>
                <td style="font-weight:600">${n.name}</td><td><span class="tag">${n.driver}</span></td>
                <td>${n.scope}</td><td style="font-family:var(--font-mono);font-size:12px">${(n.id||'').substring(0,12)}</td>
                <td>${['bridge','host','none'].includes(n.name) ? '' : `<button class="btn btn-danger btn-sm" onclick="removeDockerNetwork('${n.id}')">Remove</button>`}</td>
            </tr>`).join('') || '<tr><td colspan="5" class="empty-state">No networks</td></tr>'}</tbody></table></div>`;
    } else if (tab === 'volumes') {
        const vols = await fetchAPI('/api/docker/volumes').catch(() => []);
        const list = Array.isArray(vols) ? vols : [];
        tabEl.innerHTML = `
            <div class="data-table-wrapper" style="margin-top:8px">
            <table class="data-table"><thead><tr><th>Name</th><th>Driver</th><th>Mountpoint</th><th>Actions</th></tr></thead>
            <tbody>${list.map(v => `<tr>
                <td style="font-weight:600;font-family:var(--font-mono);font-size:13px">${v.name}</td><td><span class="tag">${v.driver}</span></td>
                <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${v.mountpoint}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removeDockerVolume('${v.name}')">Remove</button></td>
            </tr>`).join('') || '<tr><td colspan="4" class="empty-state">No volumes</td></tr>'}</tbody></table></div>`;
    }
    tabEl.dataset.loaded = '1';
}

async function removeDockerImage(id) { if (!confirm('Remove image?')) return; await deleteAPI(`/api/docker/images/${id}`); showToast('Image removed'); const el=document.getElementById('dockerTab-images'); if(el) el.dataset.loaded=''; showDockerTab('images'); }
async function removeDockerNetwork(id) { if (!confirm('Remove network?')) return; await deleteAPI(`/api/docker/networks/${id}`); showToast('Network removed'); const el=document.getElementById('dockerTab-networks'); if(el) el.dataset.loaded=''; showDockerTab('networks'); }
async function removeDockerVolume(name) { if (!confirm('Remove volume?')) return; await deleteAPI(`/api/docker/volumes/${name}`); showToast('Volume removed'); const el=document.getElementById('dockerTab-volumes'); if(el) el.dataset.loaded=''; showDockerTab('volumes'); }

// ===== DEPLOY CONTAINER FORM =====
function showDeployContainerForm() {
    showModal('🐳 Deploy New Container', `
        <div style="max-height:60vh;overflow-y:auto;padding-right:8px">
            <div class="form-group">
                <label>Image *</label>
                <input type="text" id="dc-image" placeholder="nginx:latest, mysql:8, redis:alpine...">
            </div>
            <div class="form-group">
                <label>Container Name *</label>
                <input type="text" id="dc-name" placeholder="my-nginx">
            </div>
            <div class="form-group">
                <label>Project (for grouping)</label>
                <input type="text" id="dc-project" placeholder="my-app, website-prod...">
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                <div class="form-group">
                    <label>Restart Policy</label>
                    <select id="dc-restart">
                        <option value="unless-stopped" selected>Unless Stopped</option>
                        <option value="always">Always</option>
                        <option value="on-failure">On Failure</option>
                        <option value="no">Never</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Network</label>
                    <input type="text" id="dc-network" placeholder="bridge (default)">
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                <div class="form-group">
                    <label>Memory Limit</label>
                    <input type="text" id="dc-memory" placeholder="512m, 1g...">
                </div>
                <div class="form-group">
                    <label>CPU Limit</label>
                    <input type="text" id="dc-cpus" placeholder="0.5, 1, 2...">
                </div>
            </div>

            <div class="form-group">
                <label>Ports <button type="button" class="btn btn-sm" onclick="addDcRow('ports')" style="float:right;padding:4px 8px;font-size:11px">+ Add Port</button></label>
                <div id="dc-ports">
                    <div class="dc-row" style="display:flex;gap:8px;margin-bottom:8px">
                        <input type="text" placeholder="Host port (8080)" style="flex:1" class="dc-port-host">
                        <input type="text" placeholder="Container port (80)" style="flex:1" class="dc-port-container">
                        <select style="width:80px" class="dc-port-proto"><option>tcp</option><option>udp</option></select>
                        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="padding:6px 8px">✕</button>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label>Volumes <button type="button" class="btn btn-sm" onclick="addDcRow('volumes')" style="float:right;padding:4px 8px;font-size:11px">+ Add Volume</button></label>
                <div id="dc-volumes">
                    <div class="dc-row" style="display:flex;gap:8px;margin-bottom:8px">
                        <input type="text" placeholder="Host path (/data)" style="flex:1" class="dc-vol-host">
                        <input type="text" placeholder="Container path (/var)" style="flex:1" class="dc-vol-container">
                        <select style="width:70px" class="dc-vol-mode"><option>rw</option><option>ro</option></select>
                        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="padding:6px 8px">✕</button>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label>Environment Variables <button type="button" class="btn btn-sm" onclick="addDcRow('env')" style="float:right;padding:4px 8px;font-size:11px">+ Add Var</button></label>
                <div id="dc-env">
                    <div class="dc-row" style="display:flex;gap:8px;margin-bottom:8px">
                        <input type="text" placeholder="KEY" style="flex:1" class="dc-env-key">
                        <input type="text" placeholder="value" style="flex:1" class="dc-env-value">
                        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="padding:6px 8px">✕</button>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label>Command (optional)</label>
                <input type="text" id="dc-command" placeholder="e.g. --appendonly yes">
            </div>
        </div>
    `, deployContainer);
}

function addDcRow(type) {
    const container = document.getElementById('dc-' + type);
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'dc-row';
    row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px';

    if (type === 'ports') {
        row.innerHTML = '<input type="text" placeholder="Host port" style="flex:1" class="dc-port-host"><input type="text" placeholder="Container port" style="flex:1" class="dc-port-container"><select style="width:80px" class="dc-port-proto"><option>tcp</option><option>udp</option></select><button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="padding:6px 8px">✕</button>';
    } else if (type === 'volumes') {
        row.innerHTML = '<input type="text" placeholder="Host path" style="flex:1" class="dc-vol-host"><input type="text" placeholder="Container path" style="flex:1" class="dc-vol-container"><select style="width:70px" class="dc-vol-mode"><option>rw</option><option>ro</option></select><button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="padding:6px 8px">✕</button>';
    } else if (type === 'env') {
        row.innerHTML = '<input type="text" placeholder="KEY" style="flex:1" class="dc-env-key"><input type="text" placeholder="value" style="flex:1" class="dc-env-value"><button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="padding:6px 8px">✕</button>';
    }
    container.appendChild(row);
}

async function deployContainer() {
    const image = document.getElementById('dc-image')?.value?.trim();
    const name = document.getElementById('dc-name')?.value?.trim();
    if (!image) { showToast('Image is required', 'error'); return; }
    if (!name) { showToast('Container name is required', 'error'); return; }

    // Collect ports
    const ports = [];
    document.querySelectorAll('#dc-ports .dc-row').forEach(row => {
        const h = row.querySelector('.dc-port-host')?.value?.trim();
        const c = row.querySelector('.dc-port-container')?.value?.trim();
        const p = row.querySelector('.dc-port-proto')?.value || 'tcp';
        if (h && c) ports.push({ host: h, container: c, protocol: p });
    });

    // Collect volumes
    const volumes = [];
    document.querySelectorAll('#dc-volumes .dc-row').forEach(row => {
        const h = row.querySelector('.dc-vol-host')?.value?.trim();
        const c = row.querySelector('.dc-vol-container')?.value?.trim();
        const m = row.querySelector('.dc-vol-mode')?.value || 'rw';
        if (h && c) volumes.push({ host: h, container: c, mode: m });
    });

    // Collect env vars
    const env = [];
    document.querySelectorAll('#dc-env .dc-row').forEach(row => {
        const k = row.querySelector('.dc-env-key')?.value?.trim();
        const v = row.querySelector('.dc-env-value')?.value?.trim();
        if (k) env.push({ key: k, value: v || '' });
    });

    const body = {
        image,
        name,
        project: document.getElementById('dc-project')?.value?.trim() || '',
        restart: document.getElementById('dc-restart')?.value || 'unless-stopped',
        network: document.getElementById('dc-network')?.value?.trim() || '',
        memory: document.getElementById('dc-memory')?.value?.trim() || '',
        cpus: document.getElementById('dc-cpus')?.value?.trim() || '',
        command: document.getElementById('dc-command')?.value?.trim() || '',
        ports, volumes, env,
    };

    showToast('Deploying container...', 'info');
    closeModal();

    try {
        const res = await postAPI('/api/docker/containers', body);
        showToast(res.message || 'Container deployed!');
        setTimeout(() => loadPageContent('docker'), 2000);
    } catch (err) {
        showToast('Deploy failed: ' + (err.message || err), 'error');
    }
}

// ===== PULL IMAGE =====
function showPullImageForm() {
    showModal('⬇ Pull Docker Image', `
        <div class="form-group">
            <label>Image Name</label>
            <input type="text" id="pull-image" placeholder="nginx:latest, mysql:8, redis:alpine, ubuntu:22.04...">
            <div style="margin-top:8px;font-size:12px;color:var(--text-muted)">
                Enter the image name with optional tag. Examples:<br>
                • <code style="color:var(--text-secondary)">nginx</code> — latest Nginx<br>
                • <code style="color:var(--text-secondary)">mysql:8.0</code> — MySQL 8<br>
                • <code style="color:var(--text-secondary)">postgres:16-alpine</code> — Lightweight PostgreSQL
            </div>
        </div>
        <div id="pull-progress" style="display:none;margin-top:16px">
            <div class="loading-spinner" style="padding:20px">Pulling image...</div>
        </div>
    `, pullImage);
}

async function pullImage() {
    const image = document.getElementById('pull-image')?.value?.trim();
    if (!image) { showToast('Image name is required', 'error'); return; }

    const progress = document.getElementById('pull-progress');
    if (progress) progress.style.display = 'block';

    showToast('Pulling ' + image + '...', 'info');

    try {
        const res = await postAPI('/api/docker/images/pull', { image });
        showToast(res.message || 'Image pulled!');
        closeModal();
        // Refresh images tab if open
        const el = document.getElementById('dockerTab-images');
        if (el) el.dataset.loaded = '';
    } catch (err) {
        showToast('Pull failed: ' + (err.message || err), 'error');
        if (progress) progress.innerHTML = '<div class="error-state">Failed: ' + (err.message||err) + '</div>';
    }
}

function closeModal() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
}

// ===== DOCKER COMPOSE =====
function showComposeForm() {
    showModal('📄 Docker Compose Deploy', `
        <div style="max-height:60vh;overflow-y:auto;padding-right:8px">
            <div class="form-group">
                <label>Project Name</label>
                <input type="text" id="compose-project" placeholder="my-project">
            </div>

            <div class="form-group">
                <label style="display:flex;align-items:center;gap:12px">
                    Deploy Mode
                    <div style="display:flex;gap:8px">
                        <button type="button" class="btn btn-sm btn-primary" id="compose-mode-paste" onclick="switchComposeMode('paste')">Paste Config</button>
                        <button type="button" class="btn btn-sm btn-secondary" id="compose-mode-dir" onclick="switchComposeMode('dir')">From Directory</button>
                    </div>
                </label>
            </div>

            <div id="compose-paste-panel">
                <div class="form-group">
                    <label>docker-compose.yml</label>
                    <textarea id="compose-config" rows="14" placeholder="version: '3.8'
services:
  web:
    image: nginx:latest
    ports:
      - '80:80'
  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: secret
    volumes:
      - db_data:/var/lib/mysql

volumes:
  db_data:" style="font-family:var(--font-mono);font-size:13px;resize:vertical;tab-size:2"></textarea>
                </div>
            </div>

            <div id="compose-dir-panel" style="display:none">
                <div class="form-group">
                    <label>Directory Path</label>
                    <div style="display:flex;gap:8px">
                        <input type="text" id="compose-directory" placeholder="/home/user/my-project" style="flex:1">
                        <button type="button" class="btn btn-secondary" onclick="openDirBrowser('compose-directory')" style="white-space:nowrap">📁 Browse</button>
                    </div>
                    <div style="margin-top:6px;font-size:12px;color:var(--text-muted)">
                        Directory phải chứa file <code>docker-compose.yml</code> hoặc <code>compose.yml</code>
                    </div>
                </div>
                <div id="dir-browser-compose-directory" class="dir-browser" style="display:none"></div>
            </div>
        </div>
    `, deployCompose);
}

function switchComposeMode(mode) {
    const pastePanel = document.getElementById('compose-paste-panel');
    const dirPanel = document.getElementById('compose-dir-panel');
    const pasteBtn = document.getElementById('compose-mode-paste');
    const dirBtn = document.getElementById('compose-mode-dir');
    if (mode === 'paste') {
        pastePanel.style.display = 'block'; dirPanel.style.display = 'none';
        pasteBtn.className = 'btn btn-sm btn-primary'; dirBtn.className = 'btn btn-sm btn-secondary';
    } else {
        pastePanel.style.display = 'none'; dirPanel.style.display = 'block';
        pasteBtn.className = 'btn btn-sm btn-secondary'; dirBtn.className = 'btn btn-sm btn-primary';
    }
}

async function deployCompose() {
    const project = document.getElementById('compose-project')?.value?.trim() || '';
    const config = document.getElementById('compose-config')?.value?.trim() || '';
    const directory = document.getElementById('compose-directory')?.value?.trim() || '';

    if (!config && !directory) {
        showToast('Paste YAML config hoặc nhập đường dẫn thư mục', 'error');
        return;
    }

    showToast('Deploying stack...', 'info');
    closeModal();

    try {
        const body = { project };
        if (config) body.config = config;
        if (directory) body.directory = directory;

        const res = await postAPI('/api/docker/compose/up', body);
        showToast(res.message || 'Stack deployed!');
        setTimeout(() => loadPageContent('docker'), 2000);
    } catch (err) {
        showToast('Deploy failed: ' + (err.message || err), 'error');
    }
}

// ===== CREATE NETWORK =====
function showCreateNetworkForm() {
    showModal('🌐 Create Docker Network', `
        <div class="form-group">
            <label>Network Name *</label>
            <input type="text" id="net-name" placeholder="my-network">
        </div>
        <div class="form-group">
            <label>Driver</label>
            <select id="net-driver">
                <option value="bridge" selected>bridge — Default, isolated network</option>
                <option value="host">host — Use host networking</option>
                <option value="overlay">overlay — Multi-host (Swarm)</option>
                <option value="macvlan">macvlan — Assign MAC address</option>
                <option value="none">none — No networking</option>
            </select>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px">
            <b>bridge</b> — Mặc định, dùng cho hầu hết trường hợp. Mỗi project nên có 1 network riêng để cách ly.<br>
            <b>overlay</b> — Dùng cho Docker Swarm, kết nối container giữa nhiều host.
        </div>
    `, createDockerNetwork);
}

async function createDockerNetwork() {
    const name = document.getElementById('net-name')?.value?.trim();
    const driver = document.getElementById('net-driver')?.value || 'bridge';
    if (!name) { showToast('Network name is required', 'error'); return; }

    showToast('Creating network...', 'info');
    closeModal();

    try {
        await postAPI('/api/docker/networks', { name, driver });
        showToast('Network "' + name + '" created!');
        const el = document.getElementById('dockerTab-networks');
        if (el) el.dataset.loaded = '';
        showDockerTab('networks');
    } catch (err) {
        showToast('Failed: ' + (err.message || err), 'error');
    }
}

// ===== DIRECTORY BROWSER =====
async function openDirBrowser(targetInputId, startPath) {
    const browserEl = document.getElementById('dir-browser-' + targetInputId);
    if (!browserEl) return;

    // Toggle visibility
    if (browserEl.style.display !== 'none' && !startPath) {
        browserEl.style.display = 'none';
        return;
    }

    const currentPath = startPath || document.getElementById(targetInputId)?.value?.trim() || '/';
    browserEl.style.display = 'block';
    browserEl.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:13px">Loading...</div>';

    try {
        const entries = await fetchAPI('/api/files?path=' + encodeURIComponent(currentPath));
        const list = Array.isArray(entries) ? entries : [];
        const dirs = list.filter(e => e.isDir);
        const composeFiles = list.filter(e => !e.isDir && ['docker-compose.yml','docker-compose.yaml','compose.yml','compose.yaml'].includes(e.name));

        browserEl.innerHTML = `
            <div class="dir-browser-header">
                <div class="dir-browser-path">
                    <span style="color:var(--text-muted);font-size:11px;text-transform:uppercase;font-weight:600;letter-spacing:0.05em">Path:</span>
                    <span style="font-family:var(--font-mono);font-size:13px">${currentPath}</span>
                </div>
                <div style="display:flex;gap:6px">
                    ${composeFiles.length > 0 ? `<span class="tag tag-green" style="font-size:11px">✓ compose found</span>` : ''}
                    <button class="btn btn-sm btn-primary" onclick="selectDir('${targetInputId}','${currentPath.replace(/'/g, "\\'")}')">✓ Select</button>
                </div>
            </div>
            <div class="dir-browser-list">
                ${currentPath !== '/' ? `
                    <div class="dir-browser-item" onclick="openDirBrowser('${targetInputId}','${currentPath.replace(/\/[^/]*\/?$/, '') || '/'}')">
                        <span class="dir-icon">↩</span>
                        <span class="dir-name">..</span>
                    </div>
                ` : ''}
                ${dirs.map(d => `
                    <div class="dir-browser-item" onclick="openDirBrowser('${targetInputId}','${d.path.replace(/'/g, "\\'")}')">
                        <span class="dir-icon">📁</span>
                        <span class="dir-name">${d.name}</span>
                    </div>
                `).join('')}
                ${dirs.length === 0 ? '<div style="padding:8px 12px;color:var(--text-muted);font-size:12px">Empty directory</div>' : ''}
            </div>
        `;
    } catch (err) {
        browserEl.innerHTML = `<div style="padding:16px;color:var(--danger);font-size:13px">Error: ${err.message || err}</div>`;
    }
}

function selectDir(targetInputId, path) {
    const input = document.getElementById(targetInputId);
    if (input) input.value = path;
    const browserEl = document.getElementById('dir-browser-' + targetInputId);
    if (browserEl) browserEl.style.display = 'none';
}

async function installService(id) { showToast('Installing ' + id + '...', 'info'); const res = await postAPI(`/api/services/${id}/install`); showToast(res.message || 'Installed'); setTimeout(() => location.reload(), 2000); }
async function uninstallService(id) { if (!confirm('Uninstall?')) return; await postAPI(`/api/services/${id}/uninstall`); showToast('Uninstalled'); setTimeout(() => location.reload(), 1000); }
async function serviceControl(id, action) { await postAPI(`/api/services/${id}/${action}`); showToast(`Service ${action}`); setTimeout(() => location.reload(), 1000); }

async function installSW(id) { showToast('Installing...', 'info'); await postAPI(`/api/software/${id}/install`); showToast('Installed!'); setTimeout(() => location.reload(), 2000); }
async function uninstallSW(id) { if (!confirm('Uninstall?')) return; await postAPI(`/api/software/${id}/uninstall`); showToast('Uninstalled'); setTimeout(() => location.reload(), 1000); }

async function installPHP(v) { showToast('Installing PHP ' + v + '...', 'info'); await postAPI(`/api/php/versions/${v}/install`); showToast('Installed!'); setTimeout(() => location.reload(), 2000); }
async function uninstallPHP(v) { if (!confirm('Uninstall?')) return; await postAPI(`/api/php/versions/${v}/uninstall`); showToast('Uninstalled'); setTimeout(() => location.reload(), 1000); }
async function phpAction(v, action) { await postAPI(`/api/php/versions/${v}/${action}`); showToast(`PHP-FPM ${action}`); setTimeout(() => location.reload(), 1000); }

async function deployApp(id) { showToast('Deploying...', 'info'); await postAPI(`/api/templates/${id}/deploy`, {}); showToast('Deployed!'); }

async function saveSettings() { await putAPI('/api/settings', { general: { panelTitle: document.getElementById('settTitle').value, timezone: document.getElementById('settTimezone').value, language: document.getElementById('settLanguage').value }}); showToast('Settings saved'); }

async function changePassword() {
    const p = document.getElementById('newPassword').value;
    const c = document.getElementById('confirmPassword').value;
    if (p !== c) { showToast('Passwords do not match', 'error'); return; }
    if (p.length < 8) { showToast('Password must be 8+ characters', 'error'); return; }
    await postAPI('/api/auth/change-password', { newPassword: p });
    showToast('Password changed');
}

// ========== FILE MANAGER ==========

let currentPath = '/';

async function loadFiles(path) {
    currentPath = path;
    const data = await fetchAPI(`/api/files?path=${encodeURIComponent(path)}`);
    const list = Array.isArray(data) ? data : [];
    const breadcrumb = document.getElementById('fileBreadcrumb');
    const fileList = document.getElementById('fileList');
    if (!fileList) return;

    // Build breadcrumb
    const parts = path.split('/').filter(Boolean);
    let crumbs = '<a href="#" onclick="loadFiles(\'/\');return false">/</a>';
    let buildPath = '';
    parts.forEach(p => { buildPath += '/' + p; crumbs += ` <a href="#" onclick="loadFiles('${buildPath}');return false">${p}</a> /`; });
    if (breadcrumb) breadcrumb.innerHTML = crumbs;

    // Parent directory
    let items = '';
    if (path !== '/') {
        const parent = path.split('/').slice(0, -1).join('/') || '/';
        items += `<li class="file-item" onclick="loadFiles('${parent}')"><span class="file-icon">⬆️</span><span class="file-name">..</span><span class="file-size"></span></li>`;
    }

    list.forEach(f => {
        const icon = f.isDir ? '📁' : getFileIcon(f.name);
        const click = f.isDir ? `onclick="loadFiles('${f.path}')"` : `onclick="viewFile('${f.path}')"`;
        items += `<li class="file-item" ${click}><span class="file-icon">${icon}</span><span class="file-name">${f.name}</span><span class="file-perm">${f.permissions}</span><span class="file-size">${f.isDir ? '-' : formatBytes(f.size)}</span><span class="file-modified">${f.modified ? new Date(f.modified).toLocaleString() : ''}</span></li>`;
    });

    fileList.innerHTML = items || '<li class="empty-state">Empty directory</li>';
}

function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const icons = { js: '📜', ts: '📘', py: '🐍', rs: '🦀', go: '🔵', php: '🐘', html: '🌐', css: '🎨', json: '📋', md: '📝', sh: '⚙️', yml: '📄', yaml: '📄', toml: '📄', sql: '🗄️', log: '📋', txt: '📝', png: '🖼️', jpg: '🖼️', svg: '🖼️', zip: '📦', tar: '📦', gz: '📦' };
    return icons[ext] || '📄';
}

async function viewFile(path) {
    const data = await fetchAPI(`/api/files/read?path=${encodeURIComponent(path)}`);
    showModal('Edit File: ' + path.split('/').pop(), `<textarea id="fileContent" style="width:100%;height:300px;font-family:monospace;font-size:12px">${(data.content || '').replace(/</g,'&lt;')}</textarea>`, async () => {
        await postAPI('/api/files/write', { path, content: document.getElementById('fileContent').value });
        showToast('File saved');
    });
}

async function viewLog(source) {
    const data = await fetchAPI(`/api/logs/${source}?lines=200`);
    const viewer = document.getElementById('logViewer');
    const content = document.getElementById('logContent');
    const title = document.getElementById('logTitle');
    if (viewer) { viewer.style.display = 'block'; title.textContent = 'Log: ' + source; content.textContent = (data.lines || []).join('\n'); content.scrollTop = content.scrollHeight; }
}

// ========== TERMINAL ==========

function initTerminal() {
    if (typeof Terminal === 'undefined') { setTimeout(initTerminal, 500); return; }
    const term = new Terminal({ theme: { background: '#0a0e1a', foreground: '#e2e8f0', cursor: '#6366f1', selectionBackground: 'rgba(99,102,241,0.3)' }, fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: 14, cursorBlink: true });
    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    const el = document.getElementById('terminal-el');
    if (!el) return;
    term.open(el);
    fitAddon.fit();

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/api/terminal/ws`);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
        ws.send(JSON.stringify({type: 'resize', cols: term.cols, rows: term.rows}));
        term.onData(data => ws.send(data));
        term.onResize(({cols, rows}) => ws.send(JSON.stringify({type: 'resize', cols, rows})));
    };
    ws.onmessage = (e) => {
        if (e.data instanceof ArrayBuffer) { term.write(new Uint8Array(e.data)); }
        else { term.write(e.data); }
    };
    ws.onclose = () => term.write('\r\n\x1b[31mConnection closed\x1b[0m\r\n');

    window.addEventListener('resize', () => fitAddon.fit());
}

// ========== CREATE MODALS ==========

function addWebsite() {
    showModal('Create Website', `
        <div class="form-group"><label>Domain</label><input type="text" id="newDomain" placeholder="example.com"></div>
        <div class="form-group"><label>Engine</label><select id="newEngine"><option value="nginx">Nginx</option><option value="apache">Apache</option></select></div>
        <div class="form-group"><label>Type</label><select id="newType"><option value="static">Static</option><option value="php">PHP</option><option value="node">Node.js</option><option value="proxy">Proxy</option></select></div>
    `, async () => {
        await postAPI('/api/websites', { domain: document.getElementById('newDomain').value, engine: document.getElementById('newEngine').value, projectType: document.getElementById('newType').value });
        showToast('Website created'); location.reload();
    });
}

function addDatabase() {
    showModal('Create Database', `
        <div class="form-group"><label>Name</label><input type="text" id="newDbName" placeholder="my_database"></div>
        <div class="form-group"><label>Engine</label><select id="newDbEngine"><option value="mysql">MySQL/MariaDB</option><option value="postgresql">PostgreSQL</option></select></div>
    `, async () => {
        await postAPI('/api/databases', { name: document.getElementById('newDbName').value, engine: document.getElementById('newDbEngine').value });
        showToast('Database created'); location.reload();
    });
}

function addCron() {
    showModal('Create Cron Job', `
        <div class="form-group"><label>Name</label><input type="text" id="newCronName" placeholder="Backup"></div>
        <div class="form-group"><label>Schedule</label><input type="text" id="newCronSchedule" placeholder="0 2 * * *"></div>
        <div class="form-group"><label>Command</label><input type="text" id="newCronCmd" placeholder="/scripts/backup.sh"></div>
    `, async () => {
        await postAPI('/api/crons', { name: document.getElementById('newCronName').value, schedule: document.getElementById('newCronSchedule').value, command: document.getElementById('newCronCmd').value });
        showToast('Cron job created'); location.reload();
    });
}

function addFirewallRule() {
    showModal('Add Firewall Rule', `
        <div class="form-group"><label>Port</label><input type="number" id="newFwPort" placeholder="443"></div>
        <div class="form-group"><label>Protocol</label><select id="newFwProto"><option value="tcp">TCP</option><option value="udp">UDP</option></select></div>
        <div class="form-group"><label>Action</label><select id="newFwAction"><option value="allow">Allow</option><option value="deny">Deny</option></select></div>
        <div class="form-group"><label>Description</label><input type="text" id="newFwDesc" placeholder="HTTPS"></div>
    `, async () => {
        await postAPI('/api/firewall/rules', { port: parseInt(document.getElementById('newFwPort').value), protocol: document.getElementById('newFwProto').value, action: document.getElementById('newFwAction').value, description: document.getElementById('newFwDesc').value });
        showToast('Rule added'); location.reload();
    });
}

function requestSSL() {
    showModal('Request Let\'s Encrypt SSL', `
        <div class="form-group"><label>Domain</label><input type="text" id="sslDomain" placeholder="example.com"></div>
        <div class="form-group"><label>Email</label><input type="email" id="sslEmail" placeholder="admin@example.com"></div>
    `, async () => {
        await postAPI('/api/ssl/letsencrypt', { domain: document.getElementById('sslDomain').value, email: document.getElementById('sslEmail').value });
        showToast('SSL requested'); location.reload();
    });
}

function selfSigned() {
    showModal('Generate Self-Signed SSL', `
        <div class="form-group"><label>Domain</label><input type="text" id="ssDomain" placeholder="example.com"></div>
    `, async () => {
        await postAPI('/api/ssl/self-signed', { domain: document.getElementById('ssDomain').value });
        showToast('Certificate generated'); location.reload();
    });
}

// ========== NAVIGATION ==========

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function logout() {
    localStorage.removeItem('biz_token');
    document.cookie = 'biz_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login';
}

// ========== SPA PAGE AUTO-INIT ==========
// Automatically detect page from URL and load content
// This runs when app.js is fully loaded, no inline script dependencies

async function loadPageContent(page) {
    const container = document.getElementById('dynamicContent');
    if (!container) return; // Not a dynamic page (e.g. dashboard has its own content)

    try {
        switch(page) {
            case 'websites':
                const sites = await fetchAPI('/api/websites');
                container.innerHTML = renderTable('Websites', '🌐', sites, ['id','domain','engine','status'], [
                    {label: 'Add Website', action: 'addWebsite'}
                ]);
                break;
            case 'databases':
                const dbs = await fetchAPI('/api/databases');
                container.innerHTML = renderTable('Databases', '🗄️', dbs, ['id','name','engine','charset'], [
                    {label: 'Create Database', action: 'addDatabase'}
                ]);
                break;
            case 'docker':
                container.innerHTML = '<div class="loading-spinner">Loading Docker data...</div>';
                const [dContainers, dStats, dOverview] = await Promise.all([
                    fetchAPI('/api/docker/containers').catch(() => []),
                    fetchAPI('/api/docker/containers/stats').catch(() => []),
                    fetchAPI('/api/docker/overview').catch(() => ({})),
                ]);
                container.innerHTML = renderDockerPage(dContainers, dStats, dOverview);
                break;
            case 'services':
                const services = await fetchAPI('/api/services');
                container.innerHTML = renderServicesPage(services);
                break;
            case 'files':
                container.innerHTML = renderFileManager();
                loadFiles('/');
                break;
            case 'terminal':
                container.innerHTML = renderTerminal();
                initTerminal();
                break;
            case 'logs':
                const sources = await fetchAPI('/api/logs/sources');
                container.innerHTML = renderLogsPage(sources);
                break;
            case 'cron':
                const crons = await fetchAPI('/api/crons');
                container.innerHTML = renderTable('Cron Jobs', '⏰', crons, ['id','name','schedule','command','enabled'], [
                    {label: 'Add Cron Job', action: 'addCron'}
                ]);
                break;
            case 'security':
                const rules = await fetchAPI('/api/firewall/rules');
                container.innerHTML = renderTable('Firewall Rules', '🛡️', rules, ['id','port','protocol','action','description'], [
                    {label: 'Add Rule', action: 'addFirewallRule'}
                ]);
                break;
            case 'ssl':
                const certs = await fetchAPI('/api/ssl');
                container.innerHTML = renderTable('SSL Certificates', '🔒', certs, ['id','domain','provider','status'], [
                    {label: 'Request SSL', action: 'requestSSL'}, {label: 'Self-Signed', action: 'selfSigned'}
                ]);
                break;
            case 'software':
                const sw = await fetchAPI('/api/software');
                container.innerHTML = renderSoftwarePage(sw);
                break;
            case 'php':
                const phpVersions = await fetchAPI('/api/php/versions');
                container.innerHTML = renderPHPPage(phpVersions);
                break;
            case 'appstore':
                const templates = await fetchAPI('/api/templates');
                container.innerHTML = renderAppStore(templates);
                break;
            case 'settings':
                const settings = await fetchAPI('/api/settings');
                container.innerHTML = renderSettingsPage(settings);
                break;
            case 'projects':
                container.innerHTML = '<div class="page-header"><h2>📦 Projects</h2></div><div class="empty-state">Projects management - Coming soon</div>';
                break;
            default:
                container.innerHTML = '<div class="empty-state">Page not found</div>';
        }
    } catch(err) {
        container.innerHTML = '<div class="error-state">Error loading page: ' + err.message + '</div>';
    }
}

// Auto-init: detect page and load when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Auth check (skip for login page)
    if (!localStorage.getItem('biz_token') && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
        return;
    }

    // Auto-detect page and load content
    var path = window.location.pathname.replace(/^\//, '') || 'dashboard';

    // Set page title in topbar
    var titleEl = document.getElementById('pageTitle');
    if (titleEl && path !== 'dashboard') {
        titleEl.textContent = path.charAt(0).toUpperCase() + path.slice(1);
    }

    // Highlight active nav item
    document.querySelectorAll('.nav-item').forEach(function(item) {
        if (window.location.pathname === item.getAttribute('href') ||
            (window.location.pathname === '/' && item.getAttribute('href') === '/')) {
            item.classList.add('active');
        }
    });

    // Load dynamic page content (if not dashboard — dashboard has its own inline init)
    if (path !== 'dashboard' && path !== '' && document.getElementById('dynamicContent')) {
        loadPageContent(path);
    }
});
