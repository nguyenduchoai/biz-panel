//! Configuration management

use once_cell::sync::OnceCell;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

static GLOBAL_CONFIG: OnceCell<Arc<RwLock<Config>>> = OnceCell::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub auth: AuthConfig,
    pub security: SecurityConfig,
    pub logging: LoggingConfig,
    pub features: FeaturesConfig,
    #[serde(default)]
    pub telegram: TelegramConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelegramConfig {
    pub enabled: bool,
    pub bot_token: String,
    pub chat_id: String,
    pub cpu_threshold: f64,
    pub mem_threshold: f64,
    pub disk_threshold: f64,
}

impl Default for TelegramConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            bot_token: "".to_string(),
            chat_id: "".to_string(),
            cpu_threshold: 90.0,
            mem_threshold: 90.0,
            disk_threshold: 90.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub panel_port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    pub jwt_secret: String,
    pub admin_user: String,
    pub admin_pass_hash: String,
    pub session_timeout: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub allowed_ips: Vec<String>,
    pub enable_2fa: bool,
    pub brute_force_protection: bool,
    pub max_login_attempts: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub path: String,
    pub max_size_mb: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeaturesConfig {
    pub docker: bool,
    pub websites: bool,
    pub databases: bool,
    pub firewall: bool,
    pub ssl: bool,
    pub monitoring: bool,
    pub terminal: bool,
    pub file_manager: bool,
}

impl Default for Config {
    fn default() -> Self {
        // Generate a random JWT secret
        use rand::Rng;
        let jwt_secret: String = rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(64)
            .map(char::from)
            .collect();

        // Default password hash for "admin123"
        let admin_pass_hash = bcrypt::hash("admin123", bcrypt::DEFAULT_COST)
            .unwrap_or_else(|_| String::from("$2b$12$default"));

        Config {
            server: ServerConfig {
                host: "0.0.0.0".to_string(),
                port: 8080,
                panel_port: 8888,
            },
            database: DatabaseConfig {
                path: "/var/lib/biz-panel/db/panel.db".to_string(),
            },
            auth: AuthConfig {
                jwt_secret,
                admin_user: "admin".to_string(),
                admin_pass_hash,
                session_timeout: 86400,
            },
            security: SecurityConfig {
                allowed_ips: vec![],
                enable_2fa: false,
                brute_force_protection: true,
                max_login_attempts: 5,
            },
            logging: LoggingConfig {
                level: "info".to_string(),
                path: "/var/log/biz-panel/panel.log".to_string(),
                max_size_mb: 100,
            },
            features: FeaturesConfig {
                docker: true,
                websites: true,
                databases: true,
                firewall: true,
                ssl: true,
                monitoring: true,
                terminal: true,
                file_manager: true,
            },
            telegram: TelegramConfig::default(),
        }
    }
}

pub fn load_or_create(path: &str) -> Config {
    if let Ok(content) = std::fs::read_to_string(path) {
        match toml::from_str(&content) {
            Ok(config) => {
                tracing::info!("Loaded config from {}", path);
                return config;
            }
            Err(e) => {
                tracing::warn!("Failed to parse config: {}, using defaults", e);
            }
        }
    }
    
    let config = Config::default();
    
    // Try to save default config
    if let Some(parent) = std::path::Path::new(path).parent() {
        std::fs::create_dir_all(parent).ok();
    }
    if let Ok(content) = toml::to_string_pretty(&config) {
        std::fs::write(path, content).ok();
    }
    
    config
}

pub fn set_global(config: Config) {
    GLOBAL_CONFIG.set(Arc::new(RwLock::new(config))).ok();
}

pub fn get() -> Config {
    GLOBAL_CONFIG
        .get()
        .expect("Config not initialized")
        .read()
        .clone()
}

pub fn update(config: Config) {
    if let Some(global) = GLOBAL_CONFIG.get() {
        *global.write() = config;
    }
}
