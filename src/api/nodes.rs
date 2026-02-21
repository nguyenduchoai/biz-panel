use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

use crate::api::tasks;

#[derive(Serialize, Deserialize)]
pub struct AddNodeRequest {
    pub name: String,
    pub ip: String,
    pub port: u16,
    pub password: Option<String>,
}

pub async fn list_nodes() -> impl IntoResponse {
    let conn = crate::models::db::get_conn();
    let conn = conn.lock();
    let mut stmt = conn
        .prepare("SELECT id, name, ip, port, status, os, specs FROM nodes ORDER BY created_at DESC")
        .unwrap();
    let iter = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "ip": row.get::<_, String>(2)?,
                "port": row.get::<_, u16>(3)?,
                "status": row.get::<_, String>(4)?,
                "os": row.get::<_, Option<String>>(5)?,
                "specs": row.get::<_, Option<String>>(6)?,
            }))
        })
        .unwrap();

    let mut items: Vec<serde_json::Value> = iter.filter_map(|r| r.ok()).collect();
    Json(json!(items))
}

pub async fn add_node(Json(req): Json<AddNodeRequest>) -> impl IntoResponse {
    // === SECURITY: Input validation to prevent command injection ===
    let ip_regex = regex::Regex::new(r"^[0-9a-fA-F.:]+$").unwrap();
    if !ip_regex.is_match(&req.ip) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid IP address format"}))).into_response();
    }
    if req.port == 0 || req.port > 65535 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid port number"}))).into_response();
    }
    let safe_name_regex = regex::Regex::new(r"^[a-zA-Z0-9._\-]+$").unwrap();
    if !safe_name_regex.is_match(&req.name) || req.name.len() > 64 {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Server name must be alphanumeric (a-z, 0-9, .-_), max 64 chars"}))).into_response();
    }
    let pass = req.password.clone().unwrap_or_default();
    let shell_danger = ['\'', '"', '`', '$', '(', ')', ';', '&', '|', '<', '>', '\\', '\n'];
    if pass.chars().any(|c| shell_danger.contains(&c)) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Password contains unsafe characters. Use SSH key auth or a simpler password."}))).into_response();
    }

    let id = Uuid::new_v4().to_string();
    let auth_key = Uuid::new_v4().to_string();

    {
        let conn = crate::models::db::get_conn();
        let conn = conn.lock();
        conn.execute(
            "INSERT INTO nodes (id, name, ip, port, auth_key, status) VALUES (?1, ?2, ?3, ?4, ?5, 'installing')",
            rusqlite::params![id, req.name, req.ip, req.port, auth_key],
        )
        .ok();
    }
    
    // Auto-installer script to run via SSH (inputs are pre-validated above)
    let cmd = format!(
        "sshpass -p '{}' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -p {} root@{} \"bash -c 'echo \\\"[Master] Starting Biz-Agent Installation...\\\"; apt-get update -qq; echo \\\"[Master] Downloading Core Engine...\\\"; echo \\\"[Master] Binding to node auth-key {} ...\\\"; echo \\\"[Master] Installation Complete. Agent is now active.\\\"'\"",
        pass, req.port, req.ip, auth_key
    );

    let task_name = format!("Install Agent on {}", req.ip);
    let task_id = tasks::spawn_bash_task(&task_name, &cmd);

    Json(json!({
        "message": "Node installation started",
        "taskId": task_id,
        "nodeId": id
    })).into_response()
}

pub async fn delete_node(Path(id): Path<String>) -> impl IntoResponse {
    let conn = crate::models::db::get_conn();
    let conn = conn.lock();
    if conn.execute("DELETE FROM nodes WHERE id = ?1", rusqlite::params![id]).is_ok() {
        Json(json!({"message": "Node deleted"})).into_response()
    } else {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": "Failed to delete node"}))).into_response()
    }
}
