/**
 * API Service - Real Backend Integration
 * Connects to Go backend API with Authentication
 */

// Get API URL from environment or default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/api';

// Get stored auth token
function getToken(): string | null {
    return localStorage.getItem('token');
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
    const token = getToken();
    const expiry = localStorage.getItem('tokenExpiry');
    if (!token || !expiry) return false;
    return Date.now() < parseInt(expiry) * 1000;
}

// Logout - clear stored auth
export function logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
    window.location.href = '/login';
}

// Generic fetch wrapper with error handling and auth
async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const token = getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add auth token if available
    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // Handle 401 - redirect to login
    if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// ============ AUTHENTICATION ============

export interface User {
    id: string;
    username: string;
    role: string;
}

export interface LoginResponse {
    token: string;
    expiresAt: number;
    user: User;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(error.error || 'Invalid credentials');
    }

    return response.json();
}

export async function getCurrentUser(): Promise<User> {
    return apiFetch('/auth/me');
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
    });
}

// ============ HEALTH & METRICS ============

export interface SystemMetrics {
    cpu: {
        usage: number;
        cores: number;
        model: string;
    };
    memory: {
        total: number;
        used: number;
        free: number;
        usedPercent: number;
    };
    disk: {
        total: number;
        used: number;
        free: number;
        usedPercent: number;
    };
    network: {
        bytesSent: number;
        bytesRecv: number;
    };
    uptime: number;
    hostname: string;
    platform: string;
    timestamp: number;
}

export async function getHealth(): Promise<{ status: string; version: string }> {
    return apiFetch('/health');
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
    return apiFetch('/metrics');
}

// WebSocket for real-time metrics
export function subscribeToMetrics(
    onMessage: (metrics: SystemMetrics) => void,
    onError?: (error: Event) => void
): WebSocket {
    const ws = new WebSocket(`${WS_URL}/metrics/ws`);

    ws.onmessage = (event) => {
        try {
            const metrics = JSON.parse(event.data);
            onMessage(metrics);
        } catch (e) {
            console.error('Failed to parse metrics:', e);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
    };

    return ws;
}

// ============ PROJECTS (Coolify-style) ============

export interface Project {
    id: string;
    name: string;
    description: string;
    type: 'git' | 'docker' | 'static';
    status: 'idle' | 'building' | 'deploying' | 'running' | 'stopped' | 'failed';
    repository?: {
        url: string;
        branch: string;
    };
    domain?: string;
    networkId: string;
    containers: string[];
    resources: {
        cpuUsage: number;
        memoryUsage: number;
    };
    lastDeploy?: {
        id: string;
        status: string;
        startedAt: string;
        finishedAt?: string;
        logs: string[];
    };
    createdAt: string;
    updatedAt: string;
}

export async function getProjects(): Promise<Project[]> {
    return apiFetch('/projects');
}

export async function getProject(id: string): Promise<Project> {
    return apiFetch(`/projects/${id}`);
}

export async function createProject(data: Partial<Project>): Promise<Project> {
    return apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
    return apiFetch(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteProject(id: string): Promise<void> {
    return apiFetch(`/projects/${id}`, { method: 'DELETE' });
}

export async function deployProject(id: string): Promise<{ message: string; deployId: string }> {
    return apiFetch(`/projects/${id}/deploy`, { method: 'POST' });
}

export async function getProjectLogs(id: string): Promise<{ logs: string[] }> {
    return apiFetch(`/projects/${id}/logs`);
}

// Get containers belonging to a specific project (Coolify-style)
export async function getProjectContainers(projectId: string): Promise<Container[]> {
    return apiFetch(`/projects/${projectId}/containers`);
}

// Add an existing container to a project's network
export async function addContainerToProject(projectId: string, containerId: string): Promise<{
    message: string;
    containerId: string;
    projectId: string;
    network: string;
}> {
    return apiFetch(`/projects/${projectId}/containers`, {
        method: 'POST',
        body: JSON.stringify({ containerId }),
    });
}

// ============ DOCKER ============

export interface Container {
    id: string;
    name: string;
    image: string;
    status: string;
    state: string;
    created: string;
    ports: Array<{
        hostPort: number;
        containerPort: number;
        protocol: string;
    }>;
    labels: Record<string, string>;
    projectId: string;
    networks: string[];
    stats?: ContainerStats;
}

export interface ContainerStats {
    cpuPercent: number;
    memoryUsage: number;
    memoryLimit: number;
    memoryPercent: number;
    networkRx: number;
    networkTx: number;
}

export interface DockerImage {
    id: string;
    repository: string;
    tag: string;
    size: number;
    created: number;
    containers: number;
}

export interface DockerNetwork {
    id: string;
    name: string;
    driver: string;
    scope: string;
    projectId: string;
    containers: number;
}

export interface DockerVolume {
    name: string;
    driver: string;
    mountpoint: string;
    projectId: string;
    createdAt: string;
}

export async function getContainers(projectId?: string): Promise<Container[]> {
    const query = projectId ? `?projectId=${projectId}` : '';
    return apiFetch(`/docker/containers${query}`);
}

export async function getContainer(id: string): Promise<Container> {
    return apiFetch(`/docker/containers/${id}`);
}

export async function startContainer(id: string): Promise<void> {
    return apiFetch(`/docker/containers/${id}/start`, { method: 'POST' });
}

export async function stopContainer(id: string): Promise<void> {
    return apiFetch(`/docker/containers/${id}/stop`, { method: 'POST' });
}

export async function restartContainer(id: string): Promise<void> {
    return apiFetch(`/docker/containers/${id}/restart`, { method: 'POST' });
}

export async function removeContainer(id: string, force = false): Promise<void> {
    return apiFetch(`/docker/containers/${id}?force=${force}`, { method: 'DELETE' });
}

export async function getContainerLogs(id: string): Promise<{ logs: string }> {
    return apiFetch(`/docker/containers/${id}/logs`);
}

export async function getContainerStats(id: string): Promise<ContainerStats> {
    return apiFetch(`/docker/containers/${id}/stats`);
}

export async function getImages(): Promise<DockerImage[]> {
    return apiFetch('/docker/images');
}

export async function removeImage(id: string, force = false): Promise<void> {
    return apiFetch(`/docker/images/${id}?force=${force}`, { method: 'DELETE' });
}

export async function getNetworks(projectId?: string): Promise<DockerNetwork[]> {
    const query = projectId ? `?projectId=${projectId}` : '';
    return apiFetch(`/docker/networks${query}`);
}

export async function createNetwork(projectId: string, projectName: string): Promise<{ id: string }> {
    return apiFetch('/docker/networks', {
        method: 'POST',
        body: JSON.stringify({ projectId, projectName }),
    });
}

export async function removeNetwork(id: string): Promise<void> {
    return apiFetch(`/docker/networks/${id}`, { method: 'DELETE' });
}

export async function getVolumes(projectId?: string): Promise<DockerVolume[]> {
    const query = projectId ? `?projectId=${projectId}` : '';
    return apiFetch(`/docker/volumes${query}`);
}

export async function createVolume(name: string, projectId?: string): Promise<DockerVolume> {
    return apiFetch('/docker/volumes', {
        method: 'POST',
        body: JSON.stringify({ name, projectId }),
    });
}

export async function removeVolume(name: string, force = false): Promise<void> {
    return apiFetch(`/docker/volumes/${name}?force=${force}`, { method: 'DELETE' });
}

// ============ WEBSITES ============

export interface Website {
    id: string;
    domain: string;
    port: number;
    aliases: string[];
    engine: 'nginx' | 'apache' | 'openlitespeed';
    projectType: string;
    phpVersion?: string;
    ssl: {
        enabled: boolean;
        provider: string;
        autoRenew: boolean;
    };
    documentRoot: string;
    status: 'running' | 'stopped' | 'error';
    projectId?: string;
    createdAt: string;
}

export async function getWebsites(): Promise<Website[]> {
    return apiFetch('/websites');
}

export async function getWebsite(id: string): Promise<Website> {
    return apiFetch(`/websites/${id}`);
}

export async function createWebsite(data: Partial<Website>): Promise<Website> {
    return apiFetch('/websites', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateWebsite(id: string, data: Partial<Website>): Promise<Website> {
    return apiFetch(`/websites/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteWebsite(id: string): Promise<void> {
    return apiFetch(`/websites/${id}`, { method: 'DELETE' });
}

// ============ DATABASES ============

export interface Database {
    id: string;
    name: string;
    engine: 'mysql' | 'postgresql' | 'mongodb' | 'redis';
    size: number;
    tables?: number;
    charset?: string;
    projectId?: string;
    createdAt: string;
}

export async function getDatabases(): Promise<Database[]> {
    return apiFetch('/databases');
}

export async function getDatabase(id: string): Promise<Database> {
    return apiFetch(`/databases/${id}`);
}

export async function createDatabase(data: Partial<Database>): Promise<Database> {
    return apiFetch('/databases', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateDatabase(id: string, data: Partial<Database>): Promise<Database> {
    return apiFetch(`/databases/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}


export async function deleteDatabase(id: string): Promise<void> {
    return apiFetch(`/databases/${id}`, { method: 'DELETE' });
}

// ============ CRONJOBS ============

export interface Cronjob {
    id: string;
    name: string;
    schedule: string;
    command: string;
    type: 'command' | 'script' | 'url';
    enabled: boolean;
    lastRun?: string;
    lastStatus?: 'success' | 'failed';
    nextRun: string;
    createdAt: string;
}

export async function getCronjobs(): Promise<Cronjob[]> {
    return apiFetch('/crons');
}

export async function createCronjob(data: Partial<Cronjob>): Promise<Cronjob> {
    return apiFetch('/crons', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateCronjob(id: string, data: Partial<Cronjob>): Promise<Cronjob> {
    return apiFetch(`/crons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteCronjob(id: string): Promise<void> {
    return apiFetch(`/crons/${id}`, { method: 'DELETE' });
}

export async function runCronjob(id: string): Promise<{ status: string }> {
    return apiFetch(`/crons/${id}/run`, { method: 'POST' });
}

// ============ FIREWALL ============

export interface FirewallRule {
    id: string;
    port: number;
    protocol: 'tcp' | 'udp' | 'both';
    source: string;
    action: 'allow' | 'deny';
    description: string;
    enabled: boolean;
}

export async function getFirewallRules(): Promise<FirewallRule[]> {
    return apiFetch('/firewall/rules');
}

export async function createFirewallRule(data: Partial<FirewallRule>): Promise<FirewallRule> {
    return apiFetch('/firewall/rules', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function deleteFirewallRule(id: string): Promise<void> {
    return apiFetch(`/firewall/rules/${id}`, { method: 'DELETE' });
}

// ============ SETTINGS ============

export interface Settings {
    general: {
        panelTitle: string;
        panelPort: number;
        timezone: string;
        language: string;
        darkMode: boolean;
    };
    security: {
        enableSSL: boolean;
        sessionTimeout: number;
        twoFactorEnabled: boolean;
        bruteForceEnabled: boolean;
    };
    notifications: {
        emailEnabled: boolean;
        smtpHost: string;
        slackWebhook: string;
        discordWebhook: string;
    };
    backup: {
        enabled: boolean;
        schedule: string;
        retentionDays: number;
        backupDatabases: boolean;
        backupWebsites: boolean;
    };
}

export async function getSettings(): Promise<Settings> {
    return apiFetch('/settings');
}

export async function updateSettings(data: Settings): Promise<Settings> {
    return apiFetch('/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

// ============ ACTIVITIES ============

export interface Activity {
    id: string;
    type: string;
    title: string;
    description: string;
    status: 'success' | 'failed' | 'pending';
    projectId?: string;
    timestamp: string;
}

export async function getActivities(): Promise<Activity[]> {
    return apiFetch('/activities');
}

// ============ FILE MANAGER ============

export interface FileInfo {
    name: string;
    path: string;
    size: number;
    isDirectory: boolean;
    extension: string;
    permissions: string;
    modTime: number;
}

export async function listDirectory(path: string): Promise<{ path: string; parent: string; files: FileInfo[] }> {
    return apiFetch(`/files?path=${encodeURIComponent(path)}`);
}

export async function readFile(path: string): Promise<{ path: string; content: string; size: number }> {
    return apiFetch(`/files/read?path=${encodeURIComponent(path)}`);
}

export async function writeFile(path: string, content: string): Promise<{ message: string; path: string }> {
    return apiFetch('/files/write', {
        method: 'POST',
        body: JSON.stringify({ path, content }),
    });
}

export async function createDirectory(path: string): Promise<{ message: string; path: string }> {
    return apiFetch('/files/mkdir', {
        method: 'POST',
        body: JSON.stringify({ path }),
    });
}

export async function deletePath(path: string): Promise<{ message: string }> {
    return apiFetch(`/files?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
}

export async function renamePath(oldPath: string, newPath: string): Promise<{ message: string }> {
    return apiFetch('/files/rename', {
        method: 'POST',
        body: JSON.stringify({ oldPath, newPath }),
    });
}

export async function searchFiles(path: string, pattern: string): Promise<{ results: FileInfo[] }> {
    return apiFetch(`/files/search?path=${encodeURIComponent(path)}&pattern=${encodeURIComponent(pattern)}`);
}

// ============ LOGS ============

export interface LogSource {
    id: string;
    name: string;
    path: string;
    type: string;
    readable: boolean;
}

export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    source: string;
}

export async function getLogSources(): Promise<LogSource[]> {
    return apiFetch('/logs/sources');
}

export async function getLogs(source: string, lines: number = 100): Promise<{ entries: LogEntry[] }> {
    return apiFetch(`/logs/${source}?lines=${lines}`);
}

export async function searchLogs(query: string, source?: string): Promise<{ results: LogEntry[] }> {
    const params = new URLSearchParams({ q: query });
    if (source) params.append('source', source);
    return apiFetch(`/logs/search?${params}`);
}

// ============ TERMINAL ============

export async function getShells(): Promise<{ shells: string[] }> {
    return apiFetch('/terminal/shells');
}

export async function executeCommand(command: string, cwd?: string): Promise<{ output: string; exitCode: number }> {
    return apiFetch('/terminal/exec', {
        method: 'POST',
        body: JSON.stringify({ command, cwd }),
    });
}

// ============ APP STORE / TEMPLATES ============

export interface AppTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    version: string;
    image: string;
    ports: string[];
    volumes: string[];
    environment: Record<string, string>;
    minMemory: number;
    tags: string[];
}

export async function getTemplates(category?: string, search?: string): Promise<{ templates: AppTemplate[]; count: number }> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    return apiFetch(`/templates?${params}`);
}

export async function getTemplateCategories(): Promise<{ name: string; count: number }[]> {
    return apiFetch('/templates/categories');
}

export async function getTemplate(id: string): Promise<AppTemplate> {
    return apiFetch(`/templates/${id}`);
}

export async function deployTemplate(
    id: string,
    name: string,
    projectId?: string,
    environment?: Record<string, string>
): Promise<{ message: string; containerId: string }> {
    return apiFetch(`/templates/${id}/deploy`, {
        method: 'POST',
        body: JSON.stringify({ name, projectId, environment }),
    });
}

// ============ SSL CERTIFICATES ============

export interface SSLCertificate {
    id: string;
    domain: string;
    issuer: string;
    provider: 'letsencrypt' | 'custom' | 'self-signed';
    expiresAt: string;
    issuedAt: string;
    autoRenew: boolean;
    status: 'valid' | 'expired' | 'expiring' | 'pending' | 'error';
    certPath: string;
    keyPath: string;
}

export async function getSSLCertificates(): Promise<SSLCertificate[]> {
    return apiFetch('/ssl');
}

export async function getSSLCertificate(id: string): Promise<SSLCertificate> {
    return apiFetch(`/ssl/${id}`);
}

export async function requestLetsEncrypt(domain: string, email: string, aliases?: string[]): Promise<{ cert: SSLCertificate }> {
    return apiFetch('/ssl/letsencrypt', {
        method: 'POST',
        body: JSON.stringify({ domain, email, aliases, autoRenew: true }),
    });
}

export async function generateSelfSignedCert(domain: string, days: number = 365): Promise<{ cert: SSLCertificate }> {
    return apiFetch('/ssl/self-signed', {
        method: 'POST',
        body: JSON.stringify({ domain, days }),
    });
}

export async function renewSSLCertificate(id: string): Promise<{ message: string }> {
    return apiFetch(`/ssl/${id}/renew`, { method: 'POST' });
}

export async function deleteSSLCertificate(id: string): Promise<{ message: string }> {
    return apiFetch(`/ssl/${id}`, { method: 'DELETE' });
}

export async function checkSSLExpiry(): Promise<{ total: number; valid: number; expiring: SSLCertificate[]; expired: SSLCertificate[] }> {
    return apiFetch('/ssl/check-expiry');
}

// ============ SOFTWARE MANAGEMENT ============

export interface SoftwareItem {
    id: string;
    name: string;
    version: string;
    description: string;
    icon: string;
    category: 'runtime' | 'webserver' | 'database' | 'cache' | 'tools';
    installed: boolean;
    running?: boolean;
    installedVersion?: string;
    availableVersions: string[];
}

export async function getSoftwareList(category?: string): Promise<SoftwareItem[]> {
    const params = category ? `?category=${category}` : '';
    return apiFetch(`/software${params}`);
}

export async function installSoftware(id: string, version?: string): Promise<{ message: string; jobId: string }> {
    const params = version ? `?version=${version}` : '';
    return apiFetch(`/software/${id}/install${params}`, { method: 'POST' });
}

export async function uninstallSoftware(id: string): Promise<{ message: string }> {
    return apiFetch(`/software/${id}/uninstall`, { method: 'POST' });
}

export async function getInstallJobStatus(jobId: string): Promise<{
    id: string;
    software: string;
    status: 'pending' | 'installing' | 'success' | 'failed';
    progress: number;
    message: string;
}> {
    return apiFetch(`/software/jobs/${jobId}`);
}

export async function controlService(id: string, action: 'start' | 'stop' | 'restart'): Promise<{ message: string }> {
    return apiFetch(`/software/${id}/${action}`, { method: 'POST' });
}

// ============ HELPER: Format bytes ============

export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

// ============ HELPER: Format uptime ============

export function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}
