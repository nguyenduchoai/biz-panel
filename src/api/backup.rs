//! Backup Management - Local, FTP, S3, Google Drive backups
//! 
//! Provides endpoints to trigger backups of websites, databases, or entire server configurations.

use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::process::Command;
use chrono::Local;

const BACKUP_DIR: &str = "/var/backups/biz-panel";

pub async fn list_backups() -> impl IntoResponse {
    std::fs::create_dir_all(BACKUP_DIR).ok();
    
    let mut backups = Vec::new();
    
    if let Ok(entries) = std::fs::read_dir(BACKUP_DIR) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    let file_name = entry.file_name().to_string_lossy().to_string();
                    let size = metadata.len();
                    let created = metadata.created()
                        .or_else(|_| metadata.modified())
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0);
                    
                    let target_type = if file_name.starts_with("db_") { "Database" }
                                    else if file_name.starts_with("web_") { "Website" }
                                    else { "System" };
                                    
                    backups.push(json!({
                        "name": file_name,
                        "size": size,
                        "created": created,
                        "type": target_type,
                        "location": "Local",
                    }));
                }
            }
        }
    }
    
    backups.sort_by(|a, b| {
        let a_time = a.get("created").and_then(|v| v.as_u64()).unwrap_or(0);
        let b_time = b.get("created").and_then(|v| v.as_u64()).unwrap_or(0);
        b_time.cmp(&a_time)
    });
    
    Json(json!(backups))
}

pub async fn create_backup(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    use super::tasks;
    std::fs::create_dir_all(BACKUP_DIR).ok();

    let backup_type = body.get("type").and_then(|v| v.as_str()).unwrap_or("");
    let target = body.get("target").and_then(|v| v.as_str()).unwrap_or("");
    let cloud = body.get("cloud").and_then(|v| v.as_bool()).unwrap_or(false);
    let encrypt = body.get("encrypt").and_then(|v| v.as_bool()).unwrap_or(false);

    if target.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Target is required"}))).into_response();
    }

    let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let mut cmd = String::new();
    let mut name = format!("Backup {} {}", backup_type, target);
    let mut file_path = String::new();

    let secret = crate::config::get().auth.jwt_secret;

    match backup_type {
        "database" => {
            if encrypt {
                file_path = format!("{}/db_{}_{}.sql.gz.gpg", BACKUP_DIR, target, timestamp);
                cmd = format!("mysqldump --force --opt --events --routines --triggers --databases {} | gzip | gpg --symmetric --cipher-algo AES256 --batch --passphrase '{}' -o {}", target, secret, file_path);
            } else {
                file_path = format!("{}/db_{}_{}.sql.gz", BACKUP_DIR, target, timestamp);
                cmd = format!("mysqldump --force --opt --events --routines --triggers --databases {} | gzip > {}", target, file_path);
            }
        }
        "website" => {
            let site_dir = format!("/var/www/{}", target); // Simple path resolution
            if encrypt {
                file_path = format!("{}/web_{}_{}.tar.gz.gpg", BACKUP_DIR, target.replace(".", "_"), timestamp);
                cmd = format!("tar -czf - -C /var/www {} | gpg --symmetric --cipher-algo AES256 --batch --passphrase '{}' -o {}", target, secret, file_path);
            } else {
                file_path = format!("{}/web_{}_{}.tar.gz", BACKUP_DIR, target.replace(".", "_"), timestamp);
                cmd = format!("tar -czf {} -C /var/www {}", file_path, target);
            }
            
            // Validate directory exists
            if !std::path::Path::new(&site_dir).exists() {
                return (StatusCode::NOT_FOUND, Json(json!({"error": format!("Website directory {} not found", site_dir)}))).into_response();
            }
        }
        _ => return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid backup type"}))).into_response(),
    }

    // Add rclone upload to Google Drive if requested
    if cloud {
        // Assuming rclone is configured remote named 'gdrive'
        let rclone_cmd = format!(" && rclone copy {} gdrive:BizPanelBackups/{}", file_path, backup_type);
        cmd.push_str(&rclone_cmd);
        name.push_str(" (Cloud)");
    }

    if encrypt {
        name.push_str(" (AES-256)");
    }

    let task_id = tasks::spawn_bash_task(&name, &cmd);

    Json(json!({
        "taskId": task_id,
        "status": "backing_up",
        "message": format!("Backup started in background"),
    })).into_response()
}

pub async fn delete_backup(Path(name): Path<String>) -> impl IntoResponse {
    // Basic path traversal prevention
    if name.contains('/') || name.contains("..") {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid file name"}))).into_response();
    }

    let file_path = format!("{}/{}", BACKUP_DIR, name);
    match std::fs::remove_file(&file_path) {
        Ok(_) => Json(json!({"message": "Backup deleted"})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

pub async fn get_rclone_config() -> impl IntoResponse {
    let output = Command::new("rclone").args(["listremotes"]).output();
    let remotes: Vec<String> = output
        .map(|o| String::from_utf8_lossy(&o.stdout).lines().map(|s| s.trim_end_matches(':').to_string()).collect())
        .unwrap_or_default();
        
    Json(json!({
        "installed": Command::new("rclone").arg("version").output().is_ok(),
        "remotes": remotes,
    }))
}
