//! Docker management API

use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::process::Command;

// Helper to run docker commands
fn docker_cmd(args: &[&str]) -> Result<String, String> {
    Command::new("docker")
        .args(args)
        .output()
        .map(|o| {
            if o.status.success() {
                String::from_utf8_lossy(&o.stdout).to_string()
            } else {
                String::from_utf8_lossy(&o.stderr).to_string()
            }
        })
        .map_err(|e| e.to_string())
}

pub async fn list_containers() -> impl IntoResponse {
    let output = docker_cmd(&[
        "ps", "-a", "--format",
        "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.State}}\t{{.Ports}}\t{{.Size}}",
    ]);

    match output {
        Ok(data) => {
            let containers: Vec<serde_json::Value> = data
                .lines()
                .filter(|l| !l.is_empty())
                .map(|line| {
                    let parts: Vec<&str> = line.splitn(7, '\t').collect();
                    json!({
                        "id": parts.first().unwrap_or(&""),
                        "name": parts.get(1).unwrap_or(&""),
                        "image": parts.get(2).unwrap_or(&""),
                        "status": parts.get(3).unwrap_or(&""),
                        "state": parts.get(4).unwrap_or(&""),
                        "ports": parts.get(5).unwrap_or(&""),
                        "size": parts.get(6).unwrap_or(&""),
                    })
                })
                .collect();
            Json(json!(containers)).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn get_container(Path(id): Path<String>) -> impl IntoResponse {
    match docker_cmd(&["inspect", &id]) {
        Ok(data) => {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&data) {
                Json(v).into_response()
            } else {
                Json(json!({"raw": data})).into_response()
            }
        }
        Err(e) => (StatusCode::NOT_FOUND, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn start_container(Path(id): Path<String>) -> impl IntoResponse {
    match docker_cmd(&["start", &id]) {
        Ok(_) => Json(json!({"message": "Container started"})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn stop_container(Path(id): Path<String>) -> impl IntoResponse {
    match docker_cmd(&["stop", &id]) {
        Ok(_) => Json(json!({"message": "Container stopped"})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn restart_container(Path(id): Path<String>) -> impl IntoResponse {
    match docker_cmd(&["restart", &id]) {
        Ok(_) => Json(json!({"message": "Container restarted"})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn remove_container(Path(id): Path<String>) -> impl IntoResponse {
    match docker_cmd(&["rm", "-f", &id]) {
        Ok(_) => Json(json!({"message": "Container removed"})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn container_logs(Path(id): Path<String>) -> impl IntoResponse {
    match docker_cmd(&["logs", "--tail", "200", &id]) {
        Ok(logs) => Json(json!({"logs": logs})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn container_stats(Path(id): Path<String>) -> impl IntoResponse {
    match docker_cmd(&["stats", "--no-stream", "--format", "{{json .}}", &id]) {
        Ok(data) => {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&data.trim()) {
                Json(v).into_response()
            } else {
                Json(json!({"raw": data})).into_response()
            }
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn list_images() -> impl IntoResponse {
    match docker_cmd(&["images", "--format", "{{.ID}}\t{{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"]) {
        Ok(data) => {
            let images: Vec<serde_json::Value> = data
                .lines()
                .filter(|l| !l.is_empty())
                .map(|line| {
                    let parts: Vec<&str> = line.splitn(5, '\t').collect();
                    json!({
                        "id": parts.first().unwrap_or(&""),
                        "repository": parts.get(1).unwrap_or(&""),
                        "tag": parts.get(2).unwrap_or(&""),
                        "size": parts.get(3).unwrap_or(&""),
                        "created": parts.get(4).unwrap_or(&""),
                    })
                })
                .collect();
            Json(json!(images)).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn remove_image(Path(id): Path<String>) -> impl IntoResponse {
    match docker_cmd(&["rmi", "-f", &id]) {
        Ok(_) => Json(json!({"message": "Image removed"})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn list_networks() -> impl IntoResponse {
    match docker_cmd(&["network", "ls", "--format", "{{.ID}}\t{{.Name}}\t{{.Driver}}\t{{.Scope}}"]) {
        Ok(data) => {
            let networks: Vec<serde_json::Value> = data
                .lines()
                .filter(|l| !l.is_empty())
                .map(|line| {
                    let parts: Vec<&str> = line.splitn(4, '\t').collect();
                    json!({
                        "id": parts.first().unwrap_or(&""),
                        "name": parts.get(1).unwrap_or(&""),
                        "driver": parts.get(2).unwrap_or(&""),
                        "scope": parts.get(3).unwrap_or(&""),
                    })
                })
                .collect();
            Json(json!(networks)).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn create_network(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let name = body.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let driver = body.get("driver").and_then(|v| v.as_str()).unwrap_or("bridge");

    match docker_cmd(&["network", "create", "--driver", driver, name]) {
        Ok(_) => (StatusCode::CREATED, Json(json!({"message": "Network created"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn remove_network(Path(id): Path<String>) -> impl IntoResponse {
    match docker_cmd(&["network", "rm", &id]) {
        Ok(_) => Json(json!({"message": "Network removed"})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn list_volumes() -> impl IntoResponse {
    match docker_cmd(&["volume", "ls", "--format", "{{.Name}}\t{{.Driver}}\t{{.Mountpoint}}"]) {
        Ok(data) => {
            let volumes: Vec<serde_json::Value> = data
                .lines()
                .filter(|l| !l.is_empty())
                .map(|line| {
                    let parts: Vec<&str> = line.splitn(3, '\t').collect();
                    json!({
                        "name": parts.first().unwrap_or(&""),
                        "driver": parts.get(1).unwrap_or(&""),
                        "mountpoint": parts.get(2).unwrap_or(&""),
                    })
                })
                .collect();
            Json(json!(volumes)).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn create_volume(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let name = body.get("name").and_then(|v| v.as_str()).unwrap_or("");
    match docker_cmd(&["volume", "create", name]) {
        Ok(_) => (StatusCode::CREATED, Json(json!({"message": "Volume created"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

pub async fn remove_volume(Path(name): Path<String>) -> impl IntoResponse {
    match docker_cmd(&["volume", "rm", &name]) {
        Ok(_) => Json(json!({"message": "Volume removed"})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}
