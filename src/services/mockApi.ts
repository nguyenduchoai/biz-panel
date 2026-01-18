/**
 * Mock API Service
 * Simulates backend responses for development
 */
import type {
    ResourceMetrics,
    Website,
    DatabaseServer,
    Container,
    DockerImage,
    ComposeStack,
    FirewallRule,
    BlockedIP,
    Fail2banJail,
    SSLCertificate,
    FileItem,
    Cronjob,
    AppTemplate,
    Activity,
} from '../types';

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Resource Metrics
export async function getResourceMetrics(): Promise<ResourceMetrics> {
    await delay(300);
    return {
        cpu: {
            usage: Math.floor(Math.random() * 40) + 30,
            cores: 4,
        },
        memory: {
            used: 5.2 * 1024 * 1024 * 1024,
            total: 8 * 1024 * 1024 * 1024,
            percentage: 65,
        },
        disk: {
            used: 120 * 1024 * 1024 * 1024,
            total: 500 * 1024 * 1024 * 1024,
            percentage: 24,
        },
        network: {
            bytesIn: Math.floor(Math.random() * 100000000),
            bytesOut: Math.floor(Math.random() * 50000000),
        },
        temperature: 45,
        uptime: 1296000, // 15 days
    };
}

// Websites
export async function getWebsites(): Promise<Website[]> {
    await delay(400);
    return [
        {
            id: '1',
            domain: 'api.example.com',
            aliases: [],
            engine: 'nginx',
            projectType: 'php',
            phpVersion: '8.3',
            ssl: { enabled: true, provider: 'letsencrypt', expiresAt: '2026-04-18' },
            documentRoot: '/home/admin/web/api.example.com/public',
            status: 'running',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-18',
        },
        {
            id: '2',
            domain: 'app.example.com',
            aliases: ['www.app.example.com'],
            engine: 'nginx',
            projectType: 'static',
            ssl: { enabled: true, provider: 'letsencrypt', expiresAt: '2026-03-04' },
            documentRoot: '/home/admin/web/app.example.com/dist',
            status: 'running',
            createdAt: '2025-12-15',
            updatedAt: '2026-01-17',
        },
        {
            id: '3',
            domain: 'blog.example.com',
            aliases: [],
            engine: 'apache',
            projectType: 'php',
            phpVersion: '8.2',
            ssl: { enabled: true, provider: 'custom', expiresAt: '2026-05-18' },
            documentRoot: '/home/admin/web/blog.example.com/public_html',
            status: 'updating',
            createdAt: '2025-11-01',
            updatedAt: '2026-01-18',
        },
        {
            id: '4',
            domain: 'shop.example.com',
            aliases: ['store.example.com'],
            engine: 'nginx',
            projectType: 'node',
            ssl: { enabled: true, provider: 'letsencrypt', expiresAt: '2026-04-01' },
            documentRoot: '/home/admin/web/shop.example.com',
            status: 'running',
            createdAt: '2025-10-20',
            updatedAt: '2026-01-16',
        },
    ];
}

// Databases
export async function getDatabases(): Promise<DatabaseServer[]> {
    await delay(400);
    return [
        {
            engine: 'mysql',
            version: '8.0.35',
            status: 'running',
            memory: 512 * 1024 * 1024,
            connections: { current: 45, max: 150 },
            metrics: { queriesPerSecond: 234 },
            databases: [
                { id: '1', name: 'production_db', engine: 'mysql', size: 2.3 * 1024 * 1024 * 1024, tables: 45, charset: 'utf8mb4', createdAt: '2025-06-01' },
                { id: '2', name: 'staging_db', engine: 'mysql', size: 156 * 1024 * 1024, tables: 45, charset: 'utf8mb4', createdAt: '2025-08-15' },
                { id: '3', name: 'analytics', engine: 'mysql', size: 890 * 1024 * 1024, tables: 12, charset: 'utf8mb4', createdAt: '2025-09-20' },
                { id: '4', name: 'wordpress', engine: 'mysql', size: 234 * 1024 * 1024, tables: 12, charset: 'utf8mb4', createdAt: '2025-11-01' },
            ],
            users: [
                { id: '1', username: 'admin', host: 'localhost', privileges: 'All Privileges' },
                { id: '2', username: 'app', host: '%', privileges: 'production_db' },
                { id: '3', username: 'readonly', host: '%', privileges: 'SELECT only' },
            ],
        },
        {
            engine: 'postgresql',
            version: '16.1',
            status: 'running',
            memory: 1024 * 1024 * 1024,
            connections: { current: 12, max: 100 },
            metrics: { transactionsPerSecond: 89 },
            databases: [
                { id: '5', name: 'api_db', engine: 'postgresql', size: 450 * 1024 * 1024, tables: 28, createdAt: '2025-07-01' },
                { id: '6', name: 'admin_db', engine: 'postgresql', size: 120 * 1024 * 1024, tables: 15, createdAt: '2025-08-01' },
            ],
            users: [
                { id: '4', username: 'postgres', host: 'localhost', privileges: 'Superuser' },
                { id: '5', username: 'api_user', host: '%', privileges: 'api_db' },
            ],
        },
        {
            engine: 'mongodb',
            version: '7.0.4',
            status: 'stopped',
            memory: 0,
            connections: { current: 0, max: 100 },
            databases: [],
            users: [],
        },
        {
            engine: 'redis',
            version: '7.2.3',
            status: 'running',
            memory: 128 * 1024 * 1024,
            connections: { current: 8, max: 1000 },
            databases: [
                { id: '7', name: 'default', engine: 'redis', size: 45 * 1024 * 1024, keys: 12540, createdAt: '2025-06-01' },
            ],
            users: [],
        },
    ];
}

// Docker Containers
export async function getContainers(): Promise<Container[]> {
    await delay(350);
    return [
        {
            id: 'a1b2c3d4e5f6',
            name: 'nginx-proxy',
            image: 'nginx:alpine',
            status: 'running',
            state: { running: true, paused: false, restarting: false, startedAt: '2026-01-16T10:00:00Z' },
            ports: [
                { host: 80, container: 80, protocol: 'tcp' },
                { host: 443, container: 443, protocol: 'tcp' },
            ],
            volumes: [],
            networks: ['bridge'],
            stats: { cpu: 12, memory: { usage: 45 * 1024 * 1024, limit: 128 * 1024 * 1024, percentage: 35 }, network: { rx: 1024000, tx: 512000 } },
            labels: {},
        },
        {
            id: 'b2c3d4e5f6g7',
            name: 'postgres-main',
            image: 'postgres:16',
            status: 'running',
            state: { running: true, paused: false, restarting: false, startedAt: '2026-01-13T08:00:00Z' },
            ports: [{ host: 5432, container: 5432, protocol: 'tcp' }],
            volumes: [{ source: 'postgres_data', destination: '/var/lib/postgresql/data', mode: 'rw' }],
            networks: ['bridge'],
            stats: { cpu: 2, memory: { usage: 256 * 1024 * 1024, limit: 512 * 1024 * 1024, percentage: 50 }, network: { rx: 2048000, tx: 1024000 } },
            labels: {},
        },
        {
            id: 'c3d4e5f6g7h8',
            name: 'redis-cache',
            image: 'redis:7-alpine',
            status: 'running',
            state: { running: true, paused: false, restarting: false, startedAt: '2026-01-13T08:00:00Z' },
            ports: [{ host: 6379, container: 6379, protocol: 'tcp' }],
            volumes: [{ source: 'redis_data', destination: '/data', mode: 'rw' }],
            networks: ['bridge'],
            stats: { cpu: 1, memory: { usage: 45 * 1024 * 1024, limit: 128 * 1024 * 1024, percentage: 35 }, network: { rx: 512000, tx: 256000 } },
            labels: {},
        },
        {
            id: 'd4e5f6g7h8i9',
            name: 'api-service',
            image: 'node:20-alpine',
            status: 'running',
            state: { running: true, paused: false, restarting: false, startedAt: '2026-01-18T06:00:00Z' },
            ports: [{ host: 3000, container: 3000, protocol: 'tcp' }],
            volumes: [{ source: '/home/admin/api', destination: '/app', mode: 'rw' }],
            networks: ['bridge'],
            stats: { cpu: 8, memory: { usage: 180 * 1024 * 1024, limit: 512 * 1024 * 1024, percentage: 35 }, network: { rx: 3072000, tx: 1536000 } },
            labels: { 'com.docker.compose.project': 'production' },
        },
    ];
}

// Docker Images
export async function getImages(): Promise<DockerImage[]> {
    await delay(300);
    return [
        { id: 'sha256:abc123', repository: 'nginx', tag: 'alpine', size: 42 * 1024 * 1024, created: '2026-01-10', containers: 1 },
        { id: 'sha256:def456', repository: 'postgres', tag: '16', size: 380 * 1024 * 1024, created: '2026-01-05', containers: 1 },
        { id: 'sha256:ghi789', repository: 'redis', tag: '7-alpine', size: 32 * 1024 * 1024, created: '2026-01-08', containers: 1 },
        { id: 'sha256:jkl012', repository: 'node', tag: '20-alpine', size: 180 * 1024 * 1024, created: '2026-01-12', containers: 2 },
    ];
}

// Compose Stacks
export async function getComposeStacks(): Promise<ComposeStack[]> {
    await delay(250);
    return [
        { name: 'production', status: 'running', services: 5, runningServices: 5, path: '/home/admin/compose/production', createdAt: '2025-12-01' },
        { name: 'monitoring', status: 'running', services: 3, runningServices: 3, path: '/home/admin/compose/monitoring', createdAt: '2025-11-15' },
        { name: 'development', status: 'partial', services: 8, runningServices: 5, path: '/home/admin/compose/dev', createdAt: '2026-01-10' },
    ];
}

// Firewall Rules
export async function getFirewallRules(): Promise<FirewallRule[]> {
    await delay(300);
    return [
        { id: '1', port: 22, protocol: 'tcp', source: '0.0.0.0/0', action: 'allow', description: 'SSH', enabled: true },
        { id: '2', port: 80, protocol: 'tcp', source: '0.0.0.0/0', action: 'allow', description: 'HTTP', enabled: true },
        { id: '3', port: 443, protocol: 'tcp', source: '0.0.0.0/0', action: 'allow', description: 'HTTPS', enabled: true },
        { id: '4', port: 3306, protocol: 'tcp', source: '10.0.0.0/8', action: 'allow', description: 'MySQL', enabled: true },
        { id: '5', port: 5432, protocol: 'tcp', source: '10.0.0.0/8', action: 'allow', description: 'PostgreSQL', enabled: true },
        { id: '6', port: 6379, protocol: 'tcp', source: '127.0.0.1', action: 'allow', description: 'Redis', enabled: true },
    ];
}

// Blocked IPs
export async function getBlockedIPs(): Promise<BlockedIP[]> {
    await delay(250);
    return [
        { id: '1', ip: '185.220.101.0/24', reason: 'Tor Exit Node', source: 'fail2ban', blockedAt: '2026-01-18T08:30:00Z' },
        { id: '2', ip: '45.33.32.156', reason: 'SSH Brute Force', source: 'fail2ban', blockedAt: '2026-01-18T03:15:00Z' },
        { id: '3', ip: '91.213.50.74', reason: 'SQL Injection Attempt', source: 'manual', blockedAt: '2026-01-17T14:00:00Z' },
    ];
}

// Fail2ban Jails
export async function getFail2banJails(): Promise<Fail2banJail[]> {
    await delay(200);
    return [
        { name: 'sshd', status: 'active', currentlyBanned: 12, totalBanned: 234, filter: 'sshd' },
        { name: 'nginx-http-auth', status: 'active', currentlyBanned: 45, totalBanned: 1234, filter: 'nginx-http-auth' },
        { name: 'wordpress', status: 'active', currentlyBanned: 8, totalBanned: 89, filter: 'wordpress' },
    ];
}

// SSL Certificates
export async function getSSLCertificates(): Promise<SSLCertificate[]> {
    await delay(250);
    return [
        { id: '1', domain: 'api.example.com', provider: 'letsencrypt', issuedAt: '2026-01-18', expiresAt: '2026-04-18', autoRenew: true, status: 'valid' },
        { id: '2', domain: 'app.example.com', provider: 'letsencrypt', issuedAt: '2025-12-04', expiresAt: '2026-03-04', autoRenew: true, status: 'expiring' },
        { id: '3', domain: 'blog.example.com', provider: 'custom', issuedAt: '2025-11-18', expiresAt: '2026-05-18', autoRenew: false, status: 'valid' },
    ];
}

// File Manager
export async function getFiles(path: string): Promise<FileItem[]> {
    await delay(300);
    // Simulate different paths
    if (path === '/home/admin/web/example.com') {
        return [
            { name: 'public_html', path: `${path}/public_html`, type: 'directory', size: 0, permissions: 'drwxr-xr-x', owner: 'admin', group: 'admin', modifiedAt: '2026-01-18T10:30:00Z' },
            { name: 'logs', path: `${path}/logs`, type: 'directory', size: 0, permissions: 'drwxr-xr-x', owner: 'admin', group: 'admin', modifiedAt: '2026-01-18T12:00:00Z' },
            { name: 'ssl', path: `${path}/ssl`, type: 'directory', size: 0, permissions: 'drwxr-xr-x', owner: 'admin', group: 'admin', modifiedAt: '2026-01-15T08:00:00Z' },
            { name: 'backup', path: `${path}/backup`, type: 'directory', size: 0, permissions: 'drwxr-xr-x', owner: 'admin', group: 'admin', modifiedAt: '2026-01-17T02:00:00Z' },
            { name: '.env', path: `${path}/.env`, type: 'file', size: 2300, permissions: '-rw-r-----', owner: 'admin', group: 'admin', modifiedAt: '2026-01-10T14:20:00Z', extension: 'env' },
            { name: '.htaccess', path: `${path}/.htaccess`, type: 'file', size: 1100, permissions: '-rw-r--r--', owner: 'admin', group: 'admin', modifiedAt: '2026-01-05T09:15:00Z', extension: 'htaccess' },
            { name: 'nginx.conf', path: `${path}/nginx.conf`, type: 'file', size: 890, permissions: '-rw-r--r--', owner: 'admin', group: 'admin', modifiedAt: '2026-01-05T09:15:00Z', extension: 'conf' },
        ];
    }
    return [
        { name: 'home', path: '/home', type: 'directory', size: 0, permissions: 'drwxr-xr-x', owner: 'root', group: 'root', modifiedAt: '2026-01-18T10:00:00Z' },
        { name: 'var', path: '/var', type: 'directory', size: 0, permissions: 'drwxr-xr-x', owner: 'root', group: 'root', modifiedAt: '2026-01-18T10:00:00Z' },
        { name: 'etc', path: '/etc', type: 'directory', size: 0, permissions: 'drwxr-xr-x', owner: 'root', group: 'root', modifiedAt: '2026-01-18T10:00:00Z' },
    ];
}

// Cronjobs
export async function getCronjobs(): Promise<Cronjob[]> {
    await delay(300);
    return [
        { id: '1', name: 'DB Backup', schedule: '0 2 * * *', command: '/scripts/backup.sh', type: 'script', enabled: true, lastRun: '2026-01-18T02:00:00Z', lastStatus: 'success', nextRun: '2026-01-19T02:00:00Z' },
        { id: '2', name: 'Log Rotation', schedule: '0 0 * * 0', command: 'logrotate -f /etc/logrotate.conf', type: 'command', enabled: true, lastRun: '2026-01-14T00:00:00Z', lastStatus: 'success', nextRun: '2026-01-21T00:00:00Z' },
        { id: '3', name: 'SSL Renewal', schedule: '0 3 * * *', command: 'certbot renew --quiet', type: 'command', enabled: true, lastRun: '2026-01-18T03:00:00Z', lastStatus: 'success', nextRun: '2026-01-19T03:00:00Z' },
        { id: '4', name: 'Cache Clear', schedule: '0 */6 * * *', command: 'php /home/admin/web/api/artisan cache:clear', type: 'command', enabled: true, lastRun: '2026-01-18T12:00:00Z', lastStatus: 'success', nextRun: '2026-01-18T18:00:00Z' },
    ];
}

// App Store Templates
export async function getAppTemplates(): Promise<AppTemplate[]> {
    await delay(400);
    return [
        { id: '1', name: 'WordPress', description: 'The world\'s most popular CMS', icon: '📝', category: 'cms', version: '6.4', stars: 4.8, installs: 50000, tags: ['php', 'blog', 'cms'], requirements: { memory: '512MB', disk: '2GB' } },
        { id: '2', name: 'Grafana', description: 'Open source analytics & monitoring', icon: '📊', category: 'monitoring', version: '10.2', stars: 4.9, installs: 30000, tags: ['monitoring', 'dashboard'], requirements: { memory: '256MB', disk: '1GB' } },
        { id: '3', name: 'n8n', description: 'Workflow automation tool', icon: '🔄', category: 'devops', version: '1.20', stars: 4.7, installs: 15000, tags: ['automation', 'workflow'], requirements: { memory: '512MB', disk: '1GB' } },
        { id: '4', name: 'Ollama', description: 'Run LLMs locally', icon: '🤖', category: 'featured', version: '0.1.24', stars: 4.9, installs: 25000, tags: ['ai', 'llm'], requirements: { memory: '8GB', disk: '20GB' } },
        { id: '5', name: 'GitLab', description: 'Complete DevOps platform', icon: '🦊', category: 'devops', version: '16.6', stars: 4.6, installs: 20000, tags: ['git', 'ci-cd'], requirements: { memory: '4GB', disk: '10GB' } },
        { id: '6', name: 'Gitea', description: 'Lightweight Git service', icon: '☕', category: 'devops', version: '1.21', stars: 4.8, installs: 18000, tags: ['git'], requirements: { memory: '256MB', disk: '500MB' } },
        { id: '7', name: 'Portainer', description: 'Container management UI', icon: '🐳', category: 'devops', version: '2.19', stars: 4.7, installs: 40000, tags: ['docker'], requirements: { memory: '256MB', disk: '500MB' }, installed: true, installedVersion: '2.19' },
        { id: '8', name: 'phpMyAdmin', description: 'MySQL administration', icon: '🗄️', category: 'database', version: '5.2', stars: 4.5, installs: 45000, tags: ['mysql', 'admin'], requirements: { memory: '128MB', disk: '100MB' }, installed: true, installedVersion: '5.2' },
        { id: '9', name: 'Plausible', description: 'Privacy-friendly analytics', icon: '📈', category: 'analytics', version: '2.0', stars: 4.8, installs: 12000, tags: ['analytics', 'privacy'], requirements: { memory: '512MB', disk: '1GB' } },
        { id: '10', name: 'Uptime Kuma', description: 'Monitoring uptime', icon: '🔔', category: 'monitoring', version: '1.23', stars: 4.9, installs: 35000, tags: ['monitoring', 'uptime'], requirements: { memory: '128MB', disk: '200MB' } },
    ];
}

// Activities
export async function getActivities(): Promise<Activity[]> {
    await delay(200);
    return [
        { id: '1', type: 'deploy', title: 'api-v2.3.1 deployed', description: 'Deployment completed successfully', status: 'success', timestamp: '2026-01-18T10:28:00Z' },
        { id: '2', type: 'backup', title: 'Backup completed', description: 'Daily backup to S3', status: 'success', timestamp: '2026-01-18T10:15:00Z' },
        { id: '3', type: 'security', title: 'SSL renewed', description: 'api.example.com certificate renewed', status: 'success', timestamp: '2026-01-18T09:00:00Z' },
        { id: '4', type: 'update', title: 'WordPress updated', description: 'Updated to version 6.4.2', status: 'success', timestamp: '2026-01-18T08:00:00Z' },
        { id: '5', type: 'create', title: 'shop.example.com created', description: 'New website created', status: 'success', timestamp: '2026-01-17T15:00:00Z' },
    ];
}

// Service status
export async function getServices(): Promise<Array<{ name: string; status: string }>> {
    await delay(200);
    return [
        { name: 'NGINX', status: 'running' },
        { name: 'MySQL', status: 'running' },
        { name: 'PostgreSQL', status: 'running' },
        { name: 'Redis', status: 'running' },
        { name: 'Docker', status: 'running' },
        { name: 'PHP-FPM', status: 'running' },
    ];
}
