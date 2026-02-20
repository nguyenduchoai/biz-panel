//! Biz-Panel v2.0 - Premium Server Management Panel
//! Built entirely in Rust with Axum

mod api;
mod auth;
mod config;
mod models;
mod utils;
mod web;

use axum::Router;
use clap::{Parser, Subcommand};
use std::net::SocketAddr;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
    compression::CompressionLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Parser)]
#[command(name = "biz-panel", version = "2.0.0", about = "Premium Server Management Panel")]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Start the panel server
    Start {
        /// Port to listen on
        #[arg(short, long, default_value = "8888")]
        port: u16,
        /// Config file path
        #[arg(short, long, default_value = "/etc/biz-panel/config.toml")]
        config: String,
    },
    /// Show panel status
    Status,
    /// Change admin password
    Password,
    /// Show access info
    Info,
    /// Initialize panel (first-time setup)
    Init,
}

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "biz_panel=info,tower_http=info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cli = Cli::parse();

    match cli.command {
        Some(Commands::Status) => {
            cli_status();
        }
        Some(Commands::Password) => {
            cli_change_password();
        }
        Some(Commands::Info) => {
            cli_info();
        }
        Some(Commands::Init) => {
            cli_init();
        }
        Some(Commands::Start { port, config: config_path }) => {
            start_server(port, &config_path).await;
        }
        None => {
            // Default: start server
            let port = std::env::var("PANEL_PORT")
                .unwrap_or_else(|_| "8888".to_string())
                .parse::<u16>()
                .unwrap_or(8888);
            let config_path = std::env::var("CONFIG_PATH")
                .unwrap_or_else(|_| "/etc/biz-panel/config.toml".to_string());
            start_server(port, &config_path).await;
        }
    }
}

async fn start_server(port: u16, config_path: &str) {
    tracing::info!("🚀 Biz-Panel v2.0 starting...");

    // Load or create config
    let cfg = config::load_or_create(config_path);
    config::set_global(cfg.clone());

    // Initialize auth
    auth::init(&cfg);

    // Initialize database
    models::db::init_db(&cfg.database.path);

    // Start background metrics history logger
    api::metrics::start_history_logger();

    // CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        // Web UI routes (server-rendered HTML)
        .merge(web::routes::ui_routes())
        // API routes
        .nest("/api", api::router())
        // Static assets (embedded)
        .merge(web::routes::static_routes())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .layer(CompressionLayer::new());

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("🌐 Panel running at http://0.0.0.0:{}", port);
    tracing::info!("📋 Default credentials: admin / admin123");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// ========== CLI Commands ==========

fn cli_status() {
    println!("\x1b[36m=== Biz-Panel Status ===\x1b[0m\n");

    // Check if service is running
    let output = std::process::Command::new("systemctl")
        .args(["is-active", "biz-panel"])
        .output();

    match output {
        Ok(o) => {
            let status = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if status == "active" {
                println!("Service:  \x1b[32m● Running\x1b[0m");
            } else {
                println!("Service:  \x1b[31m● {}\x1b[0m", status);
            }
        }
        Err(_) => println!("Service:  \x1b[33m● Unknown\x1b[0m"),
    }

    // System info
    use sysinfo::System;
    let mut sys = System::new_all();
    sys.refresh_all();

    let total_mem = sys.total_memory() / 1024 / 1024;
    let used_mem = sys.used_memory() / 1024 / 1024;
    let cpu_usage = sys.global_cpu_info().cpu_usage();

    println!("\nCPU:      {:.1}%", cpu_usage);
    println!("Memory:   {} / {} MB ({:.1}%)", used_mem, total_mem,
        (used_mem as f64 / total_mem as f64) * 100.0);
}

fn cli_change_password() {
    println!("\x1b[36m=== Change Admin Password ===\x1b[0m\n");
    print!("Enter new password: ");
    use std::io::Write;
    std::io::stdout().flush().unwrap();

    let mut password = String::new();
    std::io::stdin().read_line(&mut password).unwrap();
    let password = password.trim();

    if password.len() < 8 {
        println!("\x1b[31mError: Password must be at least 8 characters\x1b[0m");
        return;
    }

    let hash = bcrypt::hash(password, bcrypt::DEFAULT_COST).unwrap();
    println!("Password hash: {}", hash);
    println!("\x1b[32m✓ Update the config file with this hash\x1b[0m");
}

fn cli_info() {
    println!("\x1b[36m╔════════════════════════════════════════════════════════════╗");
    println!("║              Biz-Panel Access Information                  ║");
    println!("╠════════════════════════════════════════════════════════════╣");
    println!("║  Panel:  http://<server-ip>:8888                          ║");
    println!("║  Built with Rust + Axum                                   ║");
    println!("╚════════════════════════════════════════════════════════════╝\x1b[0m");
}

fn cli_init() {
    println!("\x1b[36m=== Biz-Panel Initialization ===\x1b[0m\n");

    // Create directories
    let dirs = [
        "/etc/biz-panel",
        "/var/lib/biz-panel/db",
        "/var/lib/biz-panel/backups",
        "/var/lib/biz-panel/ssl",
        "/var/log/biz-panel",
    ];

    for dir in &dirs {
        std::fs::create_dir_all(dir).ok();
        println!("  Created: {}", dir);
    }

    // Generate default config
    let default_config = config::Config::default();
    let config_str = toml::to_string_pretty(&default_config).unwrap();
    std::fs::write("/etc/biz-panel/config.toml", &config_str).ok();
    println!("  Config:  /etc/biz-panel/config.toml");

    println!("\n\x1b[32m✓ Initialization complete\x1b[0m");
}
