/**
 * Biz-Panel Type Definitions
 */

// Server Status Types
export type ServiceStatus = 'running' | 'stopped' | 'updating' | 'error' | 'unknown';

// Resource Metrics
export interface ResourceMetrics {
    cpu: {
        usage: number;
        cores: number;
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    disk: {
        used: number;
        total: number;
        percentage: number;
    };
    network: {
        bytesIn: number;
        bytesOut: number;
    };
    temperature?: number;
    uptime: number;
}

// Website Types
export interface Website {
    id: string;
    domain: string;
    aliases: string[];
    engine: 'nginx' | 'apache' | 'openlitespeed';
    projectType: 'php' | 'node' | 'static' | 'proxy';
    phpVersion?: string;
    ssl: {
        enabled: boolean;
        provider: 'letsencrypt' | 'custom' | 'none';
        expiresAt?: string;
    };
    documentRoot: string;
    status: ServiceStatus;
    createdAt: string;
    updatedAt: string;
}

// Database Types
export type DatabaseEngine = 'mysql' | 'postgresql' | 'mongodb' | 'redis';

export interface Database {
    id: string;
    name: string;
    engine: DatabaseEngine;
    size: number;
    tables?: number;
    collections?: number;
    keys?: number;
    charset?: string;
    createdAt: string;
}

export interface DatabaseServer {
    engine: DatabaseEngine;
    version: string;
    status: ServiceStatus;
    memory: number;
    connections: {
        current: number;
        max: number;
    };
    metrics?: {
        queriesPerSecond?: number;
        transactionsPerSecond?: number;
    };
    databases: Database[];
    users: DatabaseUser[];
}

export interface DatabaseUser {
    id: string;
    username: string;
    host: string;
    privileges: string;
}

// Docker Types
export interface Container {
    id: string;
    name: string;
    image: string;
    status: 'running' | 'paused' | 'exited' | 'created' | 'restarting';
    state: {
        running: boolean;
        paused: boolean;
        restarting: boolean;
        startedAt: string;
    };
    ports: PortMapping[];
    volumes: VolumeMapping[];
    networks: string[];
    stats: ContainerStats;
    labels: Record<string, string>;
}

export interface PortMapping {
    host: number;
    container: number;
    protocol: 'tcp' | 'udp';
}

export interface VolumeMapping {
    source: string;
    destination: string;
    mode: 'rw' | 'ro';
}

export interface ContainerStats {
    cpu: number;
    memory: {
        usage: number;
        limit: number;
        percentage: number;
    };
    network: {
        rx: number;
        tx: number;
    };
}

export interface DockerImage {
    id: string;
    repository: string;
    tag: string;
    size: number;
    created: string;
    containers: number;
}

export interface DockerVolume {
    name: string;
    driver: string;
    mountpoint: string;
    size?: number;
    createdAt: string;
    labels: Record<string, string>;
}

export interface ComposeStack {
    name: string;
    status: 'running' | 'partial' | 'stopped';
    services: number;
    runningServices: number;
    path: string;
    createdAt: string;
}

// Security Types
export interface FirewallRule {
    id: string;
    port: number;
    protocol: 'tcp' | 'udp' | 'both';
    source: string;
    action: 'allow' | 'deny';
    description: string;
    enabled: boolean;
}

export interface BlockedIP {
    id: string;
    ip: string;
    reason: string;
    source: 'manual' | 'fail2ban' | 'cloudflare';
    blockedAt: string;
    expiresAt?: string;
}

export interface Fail2banJail {
    name: string;
    status: 'active' | 'inactive';
    currentlyBanned: number;
    totalBanned: number;
    filter: string;
}

export interface SSLCertificate {
    id: string;
    domain: string;
    provider: 'letsencrypt' | 'custom';
    issuedAt: string;
    expiresAt: string;
    autoRenew: boolean;
    status: 'valid' | 'expiring' | 'expired';
}

// File Manager Types
export interface FileItem {
    name: string;
    path: string;
    type: 'file' | 'directory' | 'symlink';
    size: number;
    permissions: string;
    owner: string;
    group: string;
    modifiedAt: string;
    extension?: string;
}

// Cronjob Types
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
    logs?: CronjobLog[];
}

export interface CronjobLog {
    id: string;
    runAt: string;
    duration: number;
    status: 'success' | 'failed';
    output?: string;
    error?: string;
}

// App Store Types
export interface AppTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    version: string;
    stars: number;
    installs: number;
    tags: string[];
    requirements: {
        memory: string;
        disk: string;
    };
    installed?: boolean;
    installedVersion?: string;
}

export type AppCategory =
    | 'featured'
    | 'cms'
    | 'database'
    | 'devops'
    | 'analytics'
    | 'communication'
    | 'monitoring'
    | 'security';

// Settings Types
export interface User {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'user' | 'viewer';
    twoFactorEnabled: boolean;
    createdAt: string;
    lastLogin?: string;
}

export interface BackupConfig {
    enabled: boolean;
    schedule: string;
    retention: number;
    destinations: BackupDestination[];
}

export interface BackupDestination {
    id: string;
    type: 's3' | 'webdav' | 'local';
    name: string;
    config: Record<string, string>;
    status: 'active' | 'inactive' | 'error';
}

export interface NotificationChannel {
    id: string;
    type: 'email' | 'slack' | 'discord' | 'telegram';
    name: string;
    config: Record<string, string>;
    enabled: boolean;
    events: string[];
}

// Activity Types
export interface Activity {
    id: string;
    type: 'deploy' | 'backup' | 'update' | 'security' | 'create' | 'delete' | 'config';
    title: string;
    description: string;
    status: 'success' | 'failed' | 'pending';
    timestamp: string;
    icon?: string;
}

// Server Types (for multi-server support)
export interface Server {
    id: string;
    name: string;
    hostname: string;
    ip: string;
    status: 'online' | 'offline' | 'maintenance';
    os: string;
    metrics?: ResourceMetrics;
    isDefault: boolean;
}

// Log Types
export interface LogEntry {
    timestamp: string;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    source?: string;
    metadata?: Record<string, unknown>;
}

export interface LogSource {
    id: string;
    name: string;
    type: 'system' | 'web' | 'database' | 'container' | 'application';
    path: string;
    icon: string;
}
