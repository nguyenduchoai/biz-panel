//! CRUD handlers for Websites, Databases, Cronjobs, Firewall, Settings, Activities

use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde_json::json;
use uuid::Uuid;

use crate::models;
use crate::models::db;

// ========== WEBSITES ==========

pub async fn list_websites() -> impl IntoResponse {
    let conn = db::get_conn();
    let conn = conn.lock();

    let mut stmt = conn
        .prepare("SELECT id, domain, aliases, engine, project_type, php_version, ssl_enabled, ssl_provider, document_root, status, created_at, updated_at FROM websites ORDER BY created_at DESC")
        .unwrap();

    let websites: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "domain": row.get::<_, String>(1)?,
                "aliases": serde_json::from_str::<Vec<String>>(&row.get::<_, String>(2).unwrap_or_default()).unwrap_or_default(),
                "engine": row.get::<_, String>(3)?,
                "projectType": row.get::<_, String>(4)?,
                "phpVersion": row.get::<_, Option<String>>(5)?,
                "ssl": { "enabled": row.get::<_, bool>(6)?, "provider": row.get::<_, Option<String>>(7)? },
                "documentRoot": row.get::<_, String>(8)?,
                "status": row.get::<_, String>(9)?,
                "createdAt": row.get::<_, String>(10)?,
                "updatedAt": row.get::<_, String>(11)?,
            }))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    Json(json!(websites))
}

pub async fn create_website(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let id = Uuid::new_v4().to_string()[..8].to_string();
    let domain = body.get("domain").and_then(|v| v.as_str()).unwrap_or("");
    let engine = body.get("engine").and_then(|v| v.as_str()).unwrap_or("nginx");
    let project_type = body.get("projectType").and_then(|v| v.as_str()).unwrap_or("static");
    let php_version = body.get("phpVersion").and_then(|v| v.as_str());
    let document_root = format!("/var/www/{}", domain);
    let now = Utc::now().to_rfc3339();

    if domain.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Domain is required"}))).into_response();
    }

    // Create web root directory
    std::fs::create_dir_all(&document_root).ok();

    // Create nginx config if nginx
    if engine == "nginx" {
        crate::utils::create_nginx_config(domain, &document_root, php_version);
    }

    let conn = db::get_conn();
    let conn = conn.lock();
    conn.execute(
        "INSERT INTO websites (id, domain, engine, project_type, php_version, document_root, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'running', ?7, ?7)",
        rusqlite::params![id, domain, engine, project_type, php_version, document_root, now],
    ).ok();

    add_activity("create", "Website Created", &format!("Website '{}' created", domain));

    (StatusCode::CREATED, Json(json!({"id": id, "domain": domain, "status": "running"}))).into_response()
}

pub async fn delete_website(Path(id): Path<String>) -> impl IntoResponse {
    let conn = db::get_conn();
    let conn = conn.lock();

    // Get domain before deleting
    let domain: Option<String> = conn
        .query_row("SELECT domain FROM websites WHERE id = ?1", [&id], |row| row.get(0))
        .ok();

    let deleted = conn
        .execute("DELETE FROM websites WHERE id = ?1", [&id])
        .unwrap_or(0);

    if deleted == 0 {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "Website not found"}))).into_response();
    }

    // Clean up nginx config
    if let Some(ref d) = domain {
        crate::utils::remove_nginx_config(d);
    }

    add_activity("delete", "Website Deleted", &format!("Website '{}' deleted", domain.unwrap_or_default()));

    Json(json!({"message": "Website deleted"})).into_response()
}

// ========== DATABASES ==========

pub async fn list_databases() -> impl IntoResponse {
    let conn = db::get_conn();
    let conn = conn.lock();

    let mut stmt = conn
        .prepare("SELECT id, name, engine, size, tables_count, charset, created_at FROM databases ORDER BY created_at DESC")
        .unwrap();

    let dbs: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "engine": row.get::<_, String>(2)?,
                "size": row.get::<_, i64>(3)?,
                "tables": row.get::<_, i32>(4)?,
                "charset": row.get::<_, String>(5)?,
                "createdAt": row.get::<_, String>(6)?,
            }))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    Json(json!(dbs))
}

pub async fn create_database(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let id = Uuid::new_v4().to_string()[..8].to_string();
    let name = body.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let engine = body.get("engine").and_then(|v| v.as_str()).unwrap_or("mysql");
    let now = Utc::now().to_rfc3339();

    if name.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Name is required"}))).into_response();
    }

    // Actually create the database
    crate::utils::create_real_database(name, engine);

    let conn = db::get_conn();
    let conn = conn.lock();
    conn.execute(
        "INSERT INTO databases (id, name, engine, charset, created_at) VALUES (?1, ?2, ?3, 'UTF8', ?4)",
        rusqlite::params![id, name, engine, now],
    ).ok();

    add_activity("create", "Database Created", &format!("Database '{}' ({}) created", name, engine));

    (StatusCode::CREATED, Json(json!({"id": id, "name": name, "engine": engine}))).into_response()
}

pub async fn delete_database(Path(id): Path<String>) -> impl IntoResponse {
    let conn = db::get_conn();
    let conn = conn.lock();

    let info: Option<(String, String)> = conn
        .query_row("SELECT name, engine FROM databases WHERE id = ?1", [&id], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })
        .ok();

    let deleted = conn.execute("DELETE FROM databases WHERE id = ?1", [&id]).unwrap_or(0);

    if deleted == 0 {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "Database not found"}))).into_response();
    }

    if let Some((name, engine)) = &info {
        crate::utils::drop_real_database(name, engine);
        add_activity("delete", "Database Deleted", &format!("Database '{}' deleted", name));
    }

    Json(json!({"message": "Database deleted"})).into_response()
}

// ========== CRONJOBS ==========

pub async fn list_cronjobs() -> impl IntoResponse {
    let conn = db::get_conn();
    let conn = conn.lock();

    let mut stmt = conn
        .prepare("SELECT id, name, schedule, command, cron_type, enabled, last_run, last_status, next_run, created_at FROM cronjobs ORDER BY created_at DESC")
        .unwrap();

    let crons: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "schedule": row.get::<_, String>(2)?,
                "command": row.get::<_, String>(3)?,
                "type": row.get::<_, String>(4)?,
                "enabled": row.get::<_, bool>(5)?,
                "lastRun": row.get::<_, Option<String>>(6)?,
                "lastStatus": row.get::<_, Option<String>>(7)?,
                "nextRun": row.get::<_, Option<String>>(8)?,
                "createdAt": row.get::<_, String>(9)?,
            }))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    Json(json!(crons))
}

pub async fn create_cronjob(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let id = Uuid::new_v4().to_string()[..8].to_string();
    let name = body.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let schedule = body.get("schedule").and_then(|v| v.as_str()).unwrap_or("* * * * *");
    let command = body.get("command").and_then(|v| v.as_str()).unwrap_or("");
    let cron_type = body.get("type").and_then(|v| v.as_str()).unwrap_or("command");
    let now = Utc::now().to_rfc3339();

    // Add to system crontab
    crate::utils::add_crontab_entry(schedule, command);

    let conn = db::get_conn();
    let conn = conn.lock();
    conn.execute(
        "INSERT INTO cronjobs (id, name, schedule, command, cron_type, enabled, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)",
        rusqlite::params![id, name, schedule, command, cron_type, now],
    ).ok();

    (StatusCode::CREATED, Json(json!({"id": id, "name": name}))).into_response()
}

pub async fn update_cronjob(Path(id): Path<String>, Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let conn = db::get_conn();
    let conn = conn.lock();

    let name = body.get("name").and_then(|v| v.as_str());
    let schedule = body.get("schedule").and_then(|v| v.as_str());
    let command = body.get("command").and_then(|v| v.as_str());
    let enabled = body.get("enabled").and_then(|v| v.as_bool());

    if let Some(n) = name { conn.execute("UPDATE cronjobs SET name = ?1 WHERE id = ?2", rusqlite::params![n, id]).ok(); }
    if let Some(s) = schedule { conn.execute("UPDATE cronjobs SET schedule = ?1 WHERE id = ?2", rusqlite::params![s, id]).ok(); }
    if let Some(c) = command { conn.execute("UPDATE cronjobs SET command = ?1 WHERE id = ?2", rusqlite::params![c, id]).ok(); }
    if let Some(e) = enabled { conn.execute("UPDATE cronjobs SET enabled = ?1 WHERE id = ?2", rusqlite::params![e, id]).ok(); }

    Json(json!({"message": "Cronjob updated"}))
}

pub async fn delete_cronjob(Path(id): Path<String>) -> impl IntoResponse {
    let conn = db::get_conn();
    let conn = conn.lock();

    let deleted = conn.execute("DELETE FROM cronjobs WHERE id = ?1", [&id]).unwrap_or(0);
    if deleted == 0 {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "Cronjob not found"}))).into_response();
    }

    Json(json!({"message": "Cronjob deleted"})).into_response()
}

pub async fn run_cronjob(Path(id): Path<String>) -> impl IntoResponse {
    let conn = db::get_conn();
    let conn = conn.lock();

    let command: Option<String> = conn
        .query_row("SELECT command FROM cronjobs WHERE id = ?1", [&id], |row| row.get(0))
        .ok();

    if let Some(cmd) = command {
        let now = Utc::now().to_rfc3339();
        tokio::spawn(async move {
            let output = tokio::process::Command::new("bash")
                .arg("-c")
                .arg(&cmd)
                .output()
                .await;

            let status = match output {
                Ok(o) if o.status.success() => "success",
                _ => "failed",
            };

            let conn = db::get_conn();
            let conn = conn.lock();
            conn.execute(
                "UPDATE cronjobs SET last_run = ?1, last_status = ?2 WHERE id = ?3",
                rusqlite::params![now, status, id],
            ).ok();
        });

        Json(json!({"message": "Cronjob executed", "status": "running"}))
    } else {
        Json(json!({"error": "Cronjob not found"}))
    }
}

// ========== FIREWALL ==========

pub async fn list_firewall_rules() -> impl IntoResponse {
    let conn = db::get_conn();
    let conn = conn.lock();

    let mut stmt = conn
        .prepare("SELECT id, port, protocol, source, action, description, enabled FROM firewall_rules")
        .unwrap();

    let rules: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "port": row.get::<_, i32>(1)?,
                "protocol": row.get::<_, String>(2)?,
                "source": row.get::<_, String>(3)?,
                "action": row.get::<_, String>(4)?,
                "description": row.get::<_, String>(5)?,
                "enabled": row.get::<_, bool>(6)?,
            }))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    Json(json!(rules))
}

pub async fn create_firewall_rule(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let id = Uuid::new_v4().to_string()[..8].to_string();
    let port = body.get("port").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    let protocol = body.get("protocol").and_then(|v| v.as_str()).unwrap_or("tcp");
    let source = body.get("source").and_then(|v| v.as_str()).unwrap_or("0.0.0.0/0");
    let action = body.get("action").and_then(|v| v.as_str()).unwrap_or("allow");
    let description = body.get("description").and_then(|v| v.as_str()).unwrap_or("");

    // Apply UFW rule
    crate::utils::apply_ufw_rule(port, protocol, action);

    let conn = db::get_conn();
    let conn = conn.lock();
    conn.execute(
        "INSERT INTO firewall_rules (id, port, protocol, source, action, description, enabled) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)",
        rusqlite::params![id, port, protocol, source, action, description],
    ).ok();

    (StatusCode::CREATED, Json(json!({"id": id, "port": port}))).into_response()
}

pub async fn delete_firewall_rule(Path(id): Path<String>) -> impl IntoResponse {
    let conn = db::get_conn();
    let conn = conn.lock();

    let rule_info: Option<(i32, String, String)> = conn
        .query_row("SELECT port, protocol, action FROM firewall_rules WHERE id = ?1", [&id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .ok();

    let deleted = conn.execute("DELETE FROM firewall_rules WHERE id = ?1", [&id]).unwrap_or(0);
    if deleted == 0 {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "Rule not found"}))).into_response();
    }

    // Remove UFW rule
    if let Some((port, protocol, _action)) = rule_info {
        crate::utils::remove_ufw_rule(port, &protocol);
    }

    Json(json!({"message": "Firewall rule deleted"})).into_response()
}

// ========== SETTINGS ==========

pub async fn get_settings() -> impl IntoResponse {
    let settings = models::Settings::default(); // TODO: Load from DB
    Json(serde_json::to_value(settings).unwrap())
}

pub async fn update_settings(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    // Save settings
    let conn = db::get_conn();
    let conn = conn.lock();
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('panel_settings', ?1)",
        [body.to_string()],
    ).ok();

    Json(json!({"message": "Settings updated"}))
}

// ========== ACTIVITIES ==========

pub async fn list_activities() -> impl IntoResponse {
    let conn = db::get_conn();
    let conn = conn.lock();

    let mut stmt = conn
        .prepare("SELECT id, activity_type, title, description, status, timestamp FROM activities ORDER BY timestamp DESC LIMIT 50")
        .unwrap();

    let activities: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "type": row.get::<_, String>(1)?,
                "title": row.get::<_, String>(2)?,
                "description": row.get::<_, String>(3)?,
                "status": row.get::<_, String>(4)?,
                "timestamp": row.get::<_, String>(5)?,
            }))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    Json(json!(activities))
}

fn add_activity(activity_type: &str, title: &str, description: &str) {
    let id = Uuid::new_v4().to_string()[..8].to_string();
    let now = Utc::now().to_rfc3339();

    let conn = db::get_conn();
    let conn = conn.lock();
    conn.execute(
        "INSERT INTO activities (id, activity_type, title, description, status, timestamp) VALUES (?1, ?2, ?3, ?4, 'success', ?5)",
        rusqlite::params![id, activity_type, title, description, now],
    ).ok();
}
