//! Data models

pub mod db;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ========== WEBSITE ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Website {
    pub id: String,
    pub domain: String,
    pub aliases: Vec<String>,
    pub engine: String,        // nginx, apache
    pub project_type: String,  // php, node, static, proxy
    pub php_version: Option<String>,
    pub ssl_enabled: bool,
    pub ssl_provider: Option<String>,
    pub document_root: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ========== DATABASE ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Database {
    pub id: String,
    pub name: String,
    pub engine: String, // mysql, postgresql, mongodb, redis
    pub size: i64,
    pub tables: i32,
    pub charset: String,
    pub created_at: DateTime<Utc>,
}

// ========== CRONJOB ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cronjob {
    pub id: String,
    pub name: String,
    pub schedule: String,
    pub command: String,
    pub cron_type: String, // command, script, url
    pub enabled: bool,
    pub last_run: Option<DateTime<Utc>>,
    pub last_status: Option<String>,
    pub next_run: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

// ========== FIREWALL ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirewallRule {
    pub id: String,
    pub port: i32,
    pub protocol: String, // tcp, udp
    pub source: String,
    pub action: String,   // allow, deny
    pub description: String,
    pub enabled: bool,
}

// ========== ACTIVITY LOG ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Activity {
    pub id: String,
    pub activity_type: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub timestamp: DateTime<Utc>,
}

// ========== SETTINGS ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub general: GeneralSettings,
    pub security: SecuritySettings,
    pub notifications: NotificationSettings,
    pub backup: BackupSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralSettings {
    pub panel_title: String,
    pub panel_port: u16,
    pub timezone: String,
    pub language: String,
    pub dark_mode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecuritySettings {
    pub enable_ssl: bool,
    pub session_timeout: u32,
    pub two_factor_enabled: bool,
    pub brute_force_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationSettings {
    pub email_enabled: bool,
    pub smtp_host: String,
    pub notify_deploy: bool,
    pub notify_ssl: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupSettings {
    pub enabled: bool,
    pub schedule: String,
    pub retention_days: u32,
    pub backup_databases: bool,
    pub backup_websites: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            general: GeneralSettings {
                panel_title: "Biz-Panel".to_string(),
                panel_port: 8888,
                timezone: "Asia/Ho_Chi_Minh".to_string(),
                language: "en".to_string(),
                dark_mode: true,
            },
            security: SecuritySettings {
                enable_ssl: false,
                session_timeout: 30,
                two_factor_enabled: false,
                brute_force_enabled: true,
            },
            notifications: NotificationSettings {
                email_enabled: false,
                smtp_host: String::new(),
                notify_deploy: true,
                notify_ssl: true,
            },
            backup: BackupSettings {
                enabled: true,
                schedule: "daily".to_string(),
                retention_days: 30,
                backup_databases: true,
                backup_websites: true,
            },
        }
    }
}

// ========== SYSTEM METRICS ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub cpu: CpuMetrics,
    pub memory: MemoryMetrics,
    pub disk: DiskMetrics,
    pub network: NetworkMetrics,
    pub uptime: u64,
    pub hostname: String,
    pub os: String,
    pub platform: String,
    pub load_avg: Vec<f64>,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuMetrics {
    pub usage: f32,
    pub cores: usize,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryMetrics {
    pub total: u64,
    pub used: u64,
    pub free: u64,
    pub used_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskMetrics {
    pub total: u64,
    pub used: u64,
    pub free: u64,
    pub used_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkMetrics {
    pub bytes_sent: u64,
    pub bytes_recv: u64,
    pub packets_sent: u64,
    pub packets_recv: u64,
}

// ========== SERVICE MANAGEMENT ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManagedService {
    pub id: String,
    pub name: String,
    pub service_type: String,
    pub description: String,
    pub icon: String,
    pub versions: Vec<String>,
    pub installed: bool,
    pub installed_version: Option<String>,
    pub port: Option<u16>,
    pub config_path: Option<String>,
    pub systemd_unit: Option<String>,
    pub status: Option<ServiceStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub state: String,
    pub pid: Option<u32>,
    pub uptime: Option<u64>,
    pub memory: Option<u64>,
    pub cpu: Option<f64>,
}

// ========== SSL ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SslCertificate {
    pub id: String,
    pub domain: String,
    pub provider: String,  // letsencrypt, self-signed, custom
    pub status: String,
    pub issued_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub auto_renew: bool,
}

// ========== PROJECT ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    pub project_type: String,
    pub status: String,
    pub domain: Option<String>,
    pub ssl: bool,
    pub containers: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ========== APP TEMPLATE ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub icon: String,
    pub version: String,
    pub docker_image: String,
    pub ports: Vec<PortMapping>,
    pub env_vars: Vec<EnvVar>,
    pub volumes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortMapping {
    pub host: u16,
    pub container: u16,
    pub protocol: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvVar {
    pub key: String,
    pub value: String,
    pub description: String,
    pub required: bool,
}

// ========== FILE MANAGER ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub permissions: String,
    pub owner: String,
    pub modified: DateTime<Utc>,
}

// ========== AUTH ==========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub username: String,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}
