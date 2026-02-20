//! File Manager API

use axum::{
    extract::Query,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;

#[derive(Deserialize)]
pub struct ListQuery {
    pub path: Option<String>,
}

#[derive(Deserialize)]
pub struct ReadQuery {
    pub path: String,
}

#[derive(Deserialize)]
pub struct SearchQuery {
    pub path: Option<String>,
    pub query: String,
}

pub async fn list_directory(Query(q): Query<ListQuery>) -> impl IntoResponse {
    let path = q.path.unwrap_or_else(|| "/".to_string());
    let dir = PathBuf::from(&path);

    if !dir.exists() || !dir.is_dir() {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "Directory not found"}))).into_response();
    }

    let mut entries = Vec::new();

    if let Ok(contents) = std::fs::read_dir(&dir) {
        for entry in contents.flatten() {
            let meta = entry.metadata();
            let name = entry.file_name().to_string_lossy().to_string();
            let full_path = entry.path().to_string_lossy().to_string();

            if let Ok(m) = meta {
                let permissions = format!("{:o}", m.permissions().mode() & 0o777);

                // Get owner
                #[cfg(unix)]
                let owner = {
                    use std::os::unix::fs::MetadataExt;
                    let uid = m.uid();
                    match nix::unistd::User::from_uid(nix::unistd::Uid::from_raw(uid)) {
                        Ok(Some(user)) => user.name,
                        _ => uid.to_string(),
                    }
                };
                #[cfg(not(unix))]
                let owner = "root".to_string();

                let modified = m.modified().ok().map(|t| {
                    let dt: chrono::DateTime<chrono::Utc> = t.into();
                    dt.to_rfc3339()
                }).unwrap_or_default();

                entries.push(json!({
                    "name": name,
                    "path": full_path,
                    "isDir": m.is_dir(),
                    "size": m.len(),
                    "permissions": permissions,
                    "owner": owner,
                    "modified": modified,
                }));
            }
        }
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        let a_dir = a.get("isDir").and_then(|v| v.as_bool()).unwrap_or(false);
        let b_dir = b.get("isDir").and_then(|v| v.as_bool()).unwrap_or(false);
        match (a_dir, b_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => {
                let a_name = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let b_name = b.get("name").and_then(|v| v.as_str()).unwrap_or("");
                a_name.to_lowercase().cmp(&b_name.to_lowercase())
            }
        }
    });

    Json(json!(entries)).into_response()
}

pub async fn read_file(Query(q): Query<ReadQuery>) -> impl IntoResponse {
    let path = PathBuf::from(&q.path);

    if !path.exists() {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "File not found"}))).into_response();
    }

    match std::fs::read_to_string(&path) {
        Ok(content) => Json(json!({
            "path": q.path,
            "content": content,
            "size": content.len(),
        })).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

pub async fn write_file(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let path = body.get("path").and_then(|v| v.as_str()).unwrap_or("");
    let content = body.get("content").and_then(|v| v.as_str()).unwrap_or("");

    if path.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Path is required"}))).into_response();
    }

    match std::fs::write(path, content) {
        Ok(_) => Json(json!({"message": "File saved", "path": path})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

pub async fn create_directory(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let path = body.get("path").and_then(|v| v.as_str()).unwrap_or("");

    match std::fs::create_dir_all(path) {
        Ok(_) => (StatusCode::CREATED, Json(json!({"message": "Directory created"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

pub async fn delete_path(Query(q): Query<ReadQuery>) -> impl IntoResponse {
    let path = PathBuf::from(&q.path);

    if !path.exists() {
        return (StatusCode::NOT_FOUND, Json(json!({"error": "Path not found"}))).into_response();
    }

    let result = if path.is_dir() {
        std::fs::remove_dir_all(&path)
    } else {
        std::fs::remove_file(&path)
    };

    match result {
        Ok(_) => Json(json!({"message": "Deleted"})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

pub async fn rename_path(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let from = body.get("from").and_then(|v| v.as_str()).unwrap_or("");
    let to = body.get("to").and_then(|v| v.as_str()).unwrap_or("");

    match std::fs::rename(from, to) {
        Ok(_) => Json(json!({"message": "Renamed"})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

pub async fn copy_path(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let from = body.get("from").and_then(|v| v.as_str()).unwrap_or("");
    let to = body.get("to").and_then(|v| v.as_str()).unwrap_or("");

    let result = if PathBuf::from(from).is_dir() {
        // Copy directory recursively
        std::process::Command::new("cp")
            .args(["-r", from, to])
            .output()
            .map(|_| ())
            .map_err(|e| e.to_string())
    } else {
        std::fs::copy(from, to).map(|_| ()).map_err(|e| e.to_string())
    };

    match result {
        Ok(_) => Json(json!({"message": "Copied"})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn change_permissions(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let path = body.get("path").and_then(|v| v.as_str()).unwrap_or("");
    let mode = body.get("mode").and_then(|v| v.as_str()).unwrap_or("644");

    let mode_val = u32::from_str_radix(mode, 8).unwrap_or(0o644);
    let permissions = std::fs::Permissions::from_mode(mode_val);

    match std::fs::set_permissions(path, permissions) {
        Ok(_) => Json(json!({"message": "Permissions changed"})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

pub async fn search_files(Query(q): Query<SearchQuery>) -> impl IntoResponse {
    let search_path = q.path.unwrap_or_else(|| "/".to_string());
    let query = q.query;

    let output = std::process::Command::new("find")
        .args([&search_path, "-name", &format!("*{}*", query), "-maxdepth", "5"])
        .output();

    match output {
        Ok(o) => {
            let results: Vec<String> = String::from_utf8_lossy(&o.stdout)
                .lines()
                .take(100)
                .map(|l| l.to_string())
                .collect();
            Json(json!(results)).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}
