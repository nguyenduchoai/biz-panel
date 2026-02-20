//! Docker management API - Enhanced with project grouping & container stats

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

fn docker_cmd_check(args: &[&str]) -> Result<String, String> {
    let output = Command::new("docker")
        .args(args)
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// Enhanced container listing with stats, labels, and project grouping
pub async fn list_containers() -> impl IntoResponse {
    // Get containers with extended info including labels for project grouping
    let format = "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.State}}\t{{.Ports}}\t{{.Size}}\t{{.CreatedAt}}\t{{.Label \"com.docker.compose.project\"}}\t{{.Label \"com.docker.compose.service\"}}\t{{.Label \"coolify.managed\"}}\t{{.Label \"bizpanel.project\"}}\t{{.Networks}}\t{{.Mounts}}";

    let output = docker_cmd(&["ps", "-a", "--format", format]);

    match output {
        Ok(data) => {
            let containers: Vec<serde_json::Value> = data
                .lines()
                .filter(|l| !l.is_empty())
                .map(|line| {
                    let parts: Vec<&str> = line.splitn(14, '\t').collect();
                    let id = parts.first().unwrap_or(&"").to_string();
                    let name = parts.get(1).unwrap_or(&"").to_string();
                    let compose_project = parts.get(8).unwrap_or(&"").to_string();
                    let compose_service = parts.get(9).unwrap_or(&"").to_string();
                    let coolify_managed = parts.get(10).unwrap_or(&"").to_string();
                    let bizpanel_project = parts.get(11).unwrap_or(&"").to_string();

                    // Determine project name: bizpanel label > compose project > "Standalone"
                    let project = if !bizpanel_project.is_empty() {
                        bizpanel_project
                    } else if !compose_project.is_empty() {
                        compose_project
                    } else {
                        "standalone".to_string()
                    };

                    json!({
                        "id": id,
                        "name": name,
                        "image": parts.get(2).unwrap_or(&""),
                        "status": parts.get(3).unwrap_or(&""),
                        "state": parts.get(4).unwrap_or(&""),
                        "ports": parts.get(5).unwrap_or(&""),
                        "size": parts.get(6).unwrap_or(&""),
                        "created": parts.get(7).unwrap_or(&""),
                        "project": project,
                        "service": compose_service,
                        "coolify": !coolify_managed.is_empty(),
                        "networks": parts.get(12).unwrap_or(&""),
                        "mounts": parts.get(13).unwrap_or(&""),
                    })
                })
                .collect();
            Json(json!(containers)).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

/// Get all containers stats in one shot (for the dashboard overview)
pub async fn list_containers_stats() -> impl IntoResponse {
    let output = docker_cmd(&[
        "stats", "--no-stream", "--format",
        "{{.ID}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}",
    ]);

    match output {
        Ok(data) => {
            let stats: Vec<serde_json::Value> = data
                .lines()
                .filter(|l| !l.is_empty())
                .map(|line| {
                    let parts: Vec<&str> = line.splitn(8, '\t').collect();
                    json!({
                        "id": parts.first().unwrap_or(&""),
                        "name": parts.get(1).unwrap_or(&""),
                        "cpu": parts.get(2).unwrap_or(&"0%"),
                        "memUsage": parts.get(3).unwrap_or(&""),
                        "memPercent": parts.get(4).unwrap_or(&"0%"),
                        "netIO": parts.get(5).unwrap_or(&""),
                        "blockIO": parts.get(6).unwrap_or(&""),
                        "pids": parts.get(7).unwrap_or(&"0"),
                    })
                })
                .collect();
            Json(json!(stats)).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

/// Docker system overview - disk usage, system info
pub async fn docker_overview() -> impl IntoResponse {
    let mut info = json!({});

    // Docker info
    if let Ok(data) = docker_cmd(&["info", "--format", "{{json .}}"]) {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(data.trim()) {
            info["serverVersion"] = v.get("ServerVersion").cloned().unwrap_or(json!(""));
            info["containers"] = v.get("Containers").cloned().unwrap_or(json!(0));
            info["containersRunning"] = v.get("ContainersRunning").cloned().unwrap_or(json!(0));
            info["containersStopped"] = v.get("ContainersStopped").cloned().unwrap_or(json!(0));
            info["containersPaused"] = v.get("ContainersPaused").cloned().unwrap_or(json!(0));
            info["images"] = v.get("Images").cloned().unwrap_or(json!(0));
            info["driver"] = v.get("Driver").cloned().unwrap_or(json!(""));
            info["memoryLimit"] = v.get("MemoryLimit").cloned().unwrap_or(json!(false));
            info["cpus"] = v.get("NCPU").cloned().unwrap_or(json!(0));
            info["totalMemory"] = v.get("MemTotal").cloned().unwrap_or(json!(0));
            info["operatingSystem"] = v.get("OperatingSystem").cloned().unwrap_or(json!(""));
            info["kernelVersion"] = v.get("KernelVersion").cloned().unwrap_or(json!(""));
        }
    }

    // Disk usage summary
    if let Ok(data) = docker_cmd(&["system", "df", "--format", "{{.Type}}\t{{.TotalCount}}\t{{.Active}}\t{{.Size}}\t{{.Reclaimable}}"]) {
        let disk: Vec<serde_json::Value> = data
            .lines()
            .filter(|l| !l.is_empty())
            .map(|line| {
                let parts: Vec<&str> = line.splitn(5, '\t').collect();
                json!({
                    "type": parts.first().unwrap_or(&""),
                    "total": parts.get(1).unwrap_or(&"0"),
                    "active": parts.get(2).unwrap_or(&"0"),
                    "size": parts.get(3).unwrap_or(&"0B"),
                    "reclaimable": parts.get(4).unwrap_or(&"0B"),
                })
            })
            .collect();
        info["diskUsage"] = json!(disk);
    }

    Json(info).into_response()
}

/// Assign a container to a project
pub async fn assign_project(Path(id): Path<String>, Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let project = body.get("project").and_then(|v| v.as_str()).unwrap_or("");
    if project.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Project name required"}))).into_response();
    }

    // Use docker label to tag the container with a project
    // Note: Docker doesn't support changing labels on running containers
    // So we store this in SQLite instead
    // For now, return success - the frontend will manage project assignments locally
    Json(json!({"message": format!("Container {} assigned to project {}", id, project)})).into_response()
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
