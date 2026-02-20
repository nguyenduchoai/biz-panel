//! Log viewer API

use axum::{
    extract::{Path, Query, ws::{Message, WebSocket, WebSocketUpgrade}},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use tokio::io::AsyncBufReadExt;

#[derive(Deserialize)]
pub struct LogQuery {
    pub lines: Option<usize>,
    pub filter: Option<String>,
}

fn get_log_sources() -> HashMap<String, String> {
    let mut sources = HashMap::new();
    sources.insert("syslog".to_string(), "/var/log/syslog".to_string());
    sources.insert("auth".to_string(), "/var/log/auth.log".to_string());
    sources.insert("nginx-access".to_string(), "/var/log/nginx/access.log".to_string());
    sources.insert("nginx-error".to_string(), "/var/log/nginx/error.log".to_string());
    sources.insert("mysql".to_string(), "/var/log/mysql/error.log".to_string());
    sources.insert("biz-panel".to_string(), "/var/log/biz-panel/panel.log".to_string());
    sources.insert("kern".to_string(), "/var/log/kern.log".to_string());
    sources.insert("dpkg".to_string(), "/var/log/dpkg.log".to_string());
    sources.insert("ufw".to_string(), "/var/log/ufw.log".to_string());
    sources
}

pub async fn list_log_sources() -> impl IntoResponse {
    let sources = get_log_sources();

    let result: Vec<serde_json::Value> = sources
        .iter()
        .map(|(name, path)| {
            let exists = std::path::Path::new(path).exists();
            let size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
            json!({
                "name": name,
                "path": path,
                "exists": exists,
                "size": size,
            })
        })
        .collect();

    Json(json!(result))
}

pub async fn get_logs(Path(source): Path<String>, Query(q): Query<LogQuery>) -> impl IntoResponse {
    let sources = get_log_sources();
    let path = match sources.get(&source) {
        Some(p) => p,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Log source not found"}))).into_response(),
    };

    let lines = q.lines.unwrap_or(100);

    let output = std::process::Command::new("tail")
        .args(["-n", &lines.to_string(), path])
        .output();

    match output {
        Ok(o) => {
            let content = String::from_utf8_lossy(&o.stdout).to_string();
            let log_lines: Vec<&str> = content.lines().collect();

            // Apply filter if provided
            let filtered: Vec<&str> = if let Some(ref filter) = q.filter {
                log_lines.iter().filter(|l| l.contains(filter.as_str())).copied().collect()
            } else {
                log_lines
            };

            Json(json!({
                "source": source,
                "lines": filtered,
                "total": filtered.len(),
            })).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

pub async fn stream_logs(Path(source): Path<String>, ws: WebSocketUpgrade) -> impl IntoResponse {
    let sources = get_log_sources();
    let path = sources.get(&source).cloned().unwrap_or_default();
    ws.on_upgrade(move |socket| handle_log_stream(socket, path))
}

async fn handle_log_stream(mut socket: WebSocket, path: String) {
    let child = tokio::process::Command::new("tail")
        .args(["-f", "-n", "0", &path])
        .stdout(std::process::Stdio::piped())
        .spawn();

    if let Ok(mut child) = child {
        if let Some(stdout) = child.stdout.take() {
            let reader = tokio::io::BufReader::new(stdout);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                if socket.send(Message::Text(line.into())).await.is_err() {
                    break;
                }
            }
        }
        child.kill().await.ok();
    }
}

pub async fn download_log(Path(source): Path<String>) -> impl IntoResponse {
    let sources = get_log_sources();
    let path = match sources.get(&source) {
        Some(p) => p,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Not found"}))).into_response(),
    };

    match std::fs::read_to_string(path) {
        Ok(content) => {
            let headers = [
                (axum::http::header::CONTENT_TYPE, "text/plain"),
                (axum::http::header::CONTENT_DISPOSITION, &format!("attachment; filename=\"{}.log\"", source)),
            ];
            (headers, content).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

pub async fn clear_log(Path(source): Path<String>) -> impl IntoResponse {
    let sources = get_log_sources();
    let path = match sources.get(&source) {
        Some(p) => p,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error": "Not found"}))),
    };

    std::fs::write(path, "").ok();
    (StatusCode::OK, Json(json!({"message": "Log cleared"})))
}

pub async fn search_logs(Query(params): Query<std::collections::HashMap<String, String>>) -> impl IntoResponse {
    let query = params.get("query").map(|s| s.as_str()).unwrap_or("");
    let sources = get_log_sources();

    let mut results = Vec::new();

    for (name, path) in &sources {
        if !std::path::Path::new(path).exists() { continue; }

        let output = std::process::Command::new("grep")
            .args(["-i", "-n", "--max-count=20", query, path])
            .output();

        if let Ok(o) = output {
            let matches: Vec<String> = String::from_utf8_lossy(&o.stdout)
                .lines()
                .map(|l| l.to_string())
                .collect();
            if !matches.is_empty() {
                results.push(json!({
                    "source": name,
                    "matches": matches,
                }));
            }
        }
    }

    Json(json!(results))
}
