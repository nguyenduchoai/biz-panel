//! SQLite database layer

use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use rusqlite::Connection;
use std::sync::Arc;

static DB: OnceCell<Arc<Mutex<Connection>>> = OnceCell::new();

pub fn init_db(path: &str) {
    // Ensure parent directory exists
    if let Some(parent) = std::path::Path::new(path).parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let conn = Connection::open(path).expect("Failed to open database");

    // Create tables
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS websites (
            id TEXT PRIMARY KEY,
            domain TEXT NOT NULL,
            aliases TEXT DEFAULT '[]',
            engine TEXT DEFAULT 'nginx',
            project_type TEXT DEFAULT 'static',
            php_version TEXT,
            ssl_enabled INTEGER DEFAULT 0,
            ssl_provider TEXT,
            document_root TEXT,
            status TEXT DEFAULT 'stopped',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS databases (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            engine TEXT NOT NULL,
            size INTEGER DEFAULT 0,
            tables_count INTEGER DEFAULT 0,
            charset TEXT DEFAULT 'UTF8',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS cronjobs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            schedule TEXT NOT NULL,
            command TEXT NOT NULL,
            cron_type TEXT DEFAULT 'command',
            enabled INTEGER DEFAULT 1,
            last_run TEXT,
            last_status TEXT,
            next_run TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS firewall_rules (
            id TEXT PRIMARY KEY,
            port INTEGER NOT NULL,
            protocol TEXT DEFAULT 'tcp',
            source TEXT DEFAULT '0.0.0.0/0',
            action TEXT DEFAULT 'allow',
            description TEXT,
            enabled INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS activities (
            id TEXT PRIMARY KEY,
            activity_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'success',
            timestamp TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS ssl_certificates (
            id TEXT PRIMARY KEY,
            domain TEXT NOT NULL,
            provider TEXT DEFAULT 'self-signed',
            status TEXT DEFAULT 'pending',
            issued_at TEXT,
            expires_at TEXT,
            auto_renew INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            project_type TEXT DEFAULT 'docker',
            status TEXT DEFAULT 'idle',
            domain TEXT,
            ssl INTEGER DEFAULT 0,
            containers TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS metrics_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            cpu_usage REAL NOT NULL,
            mem_used INTEGER NOT NULL,
            mem_total INTEGER NOT NULL,
            disk_used INTEGER NOT NULL,
            disk_total INTEGER NOT NULL,
            net_sent INTEGER NOT NULL,
            net_recv INTEGER NOT NULL,
            load_one REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS nodes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            ip TEXT NOT NULL,
            port INTEGER DEFAULT 22,
            auth_key TEXT NOT NULL,
            status TEXT DEFAULT 'installing',
            os TEXT,
            specs TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        ",
    )
    .expect("Failed to create tables");

    tracing::info!("Database initialized at {}", path);

    DB.set(Arc::new(Mutex::new(conn))).ok();
}

pub fn get_conn() -> Arc<Mutex<Connection>> {
    DB.get().expect("Database not initialized").clone()
}
