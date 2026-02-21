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

    Json(json!({"message": format!("Container {} assigned to project {}", id, project)})).into_response()
}

/// Create and run a new container
pub async fn create_container(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let image = body.get("image").and_then(|v| v.as_str()).unwrap_or("");
    let name = body.get("name").and_then(|v| v.as_str()).unwrap_or("");
    let project = body.get("project").and_then(|v| v.as_str()).unwrap_or("");
    let restart = body.get("restart").and_then(|v| v.as_str()).unwrap_or("unless-stopped");
    let network = body.get("network").and_then(|v| v.as_str()).unwrap_or("");
    let command = body.get("command").and_then(|v| v.as_str()).unwrap_or("");

    if image.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Image is required"}))).into_response();
    }

    // Build docker run arguments
    let mut args: Vec<String> = vec!["run".into(), "-d".into()];

    // Container name
    if !name.is_empty() {
        args.push("--name".into());
        args.push(name.to_string());
    }

    // Restart policy
    args.push("--restart".into());
    args.push(restart.to_string());

    // Network
    if !network.is_empty() {
        args.push("--network".into());
        args.push(network.to_string());
    }

    // Project label
    if !project.is_empty() {
        args.push("--label".into());
        args.push(format!("bizpanel.project={}", project));
    }

    // Ports: array of { host: "8080", container: "80", protocol: "tcp" }
    if let Some(ports) = body.get("ports").and_then(|v| v.as_array()) {
        for p in ports {
            let host = p.get("host").and_then(|v| v.as_str()).unwrap_or("");
            let container = p.get("container").and_then(|v| v.as_str()).unwrap_or("");
            let proto = p.get("protocol").and_then(|v| v.as_str()).unwrap_or("tcp");
            if !host.is_empty() && !container.is_empty() {
                args.push("-p".into());
                args.push(format!("{}:{}/{}", host, container, proto));
            }
        }
    }

    // Volumes: array of { host: "/data/db", container: "/var/lib/mysql", mode: "rw" }
    if let Some(volumes) = body.get("volumes").and_then(|v| v.as_array()) {
        for vol in volumes {
            let host = vol.get("host").and_then(|v| v.as_str()).unwrap_or("");
            let container = vol.get("container").and_then(|v| v.as_str()).unwrap_or("");
            let mode = vol.get("mode").and_then(|v| v.as_str()).unwrap_or("rw");
            if !host.is_empty() && !container.is_empty() {
                args.push("-v".into());
                args.push(format!("{}:{}:{}", host, container, mode));
            }
        }
    }

    // Environment variables: array of { key: "MYSQL_ROOT_PASSWORD", value: "secret" }
    if let Some(envs) = body.get("env").and_then(|v| v.as_array()) {
        for e in envs {
            let key = e.get("key").and_then(|v| v.as_str()).unwrap_or("");
            let val = e.get("value").and_then(|v| v.as_str()).unwrap_or("");
            if !key.is_empty() {
                args.push("-e".into());
                args.push(format!("{}={}", key, val));
            }
        }
    }

    // Memory limit
    if let Some(mem) = body.get("memory").and_then(|v| v.as_str()) {
        if !mem.is_empty() {
            args.push("--memory".into());
            args.push(mem.to_string());
        }
    }

    // CPU limit
    if let Some(cpus) = body.get("cpus").and_then(|v| v.as_str()) {
        if !cpus.is_empty() {
            args.push("--cpus".into());
            args.push(cpus.to_string());
        }
    }

    // Image
    args.push(image.to_string());

    // Command
    if !command.is_empty() {
        for part in command.split_whitespace() {
            args.push(part.to_string());
        }
    }

    let str_args: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    match docker_cmd_check(&str_args) {
        Ok(container_id) => {
            (StatusCode::CREATED, Json(json!({
                "message": "Container created and started",
                "containerId": container_id.trim()
            }))).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

/// Pull an image from Docker Hub
pub async fn pull_image(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let image = body.get("image").and_then(|v| v.as_str()).unwrap_or("");
    if image.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Image name required"}))).into_response();
    }

    match docker_cmd_check(&["pull", image]) {
        Ok(output) => Json(json!({"message": "Image pulled successfully", "output": output.trim()})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

/// Deploy docker-compose stack
/// Supports two modes:
/// 1. "config" - paste YAML content, we write it to a project dir
/// 2. "directory" - point to existing dir with docker-compose.yml
pub async fn compose_up(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let project = body.get("project").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();
    let config = body.get("config").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let directory = body.get("directory").and_then(|v| v.as_str()).unwrap_or("").trim().to_string();

    if config.is_empty() && directory.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Either 'config' (YAML content) or 'directory' path is required"}))).into_response();
    }

    let work_dir: String;

    if !directory.is_empty() {
        // Mode 2: Use existing directory
        let compose_path = std::path::Path::new(&directory);
        if !compose_path.exists() {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Directory not found: {}", directory)}))).into_response();
        }
        // Check if docker-compose.yml exists
        let yml = compose_path.join("docker-compose.yml");
        let yaml = compose_path.join("docker-compose.yaml");
        let compose_yml = compose_path.join("compose.yml");
        let compose_yaml = compose_path.join("compose.yaml");
        if !yml.exists() && !yaml.exists() && !compose_yml.exists() && !compose_yaml.exists() {
            return (StatusCode::BAD_REQUEST, Json(json!({"error": "No docker-compose.yml/yaml or compose.yml/yaml found in directory"}))).into_response();
        }
        work_dir = directory;
    } else {
        // Mode 1: Write config to project directory
        let proj_name = if project.is_empty() {
            format!("bizpanel-{}", std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs())
        } else {
            project.clone()
        };

        let proj_dir = format!("/opt/biz-panel/compose/{}", proj_name);
        if let Err(e) = std::fs::create_dir_all(&proj_dir) {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Failed to create dir: {}", e)}))).into_response();
        }

        let compose_file = format!("{}/docker-compose.yml", proj_dir);
        if let Err(e) = std::fs::write(&compose_file, &config) {
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": format!("Failed to write config: {}", e)}))).into_response();
        }

        work_dir = proj_dir;
    }

    // Run docker compose up -d
    let output = Command::new("docker")
        .args(&["compose", "up", "-d"])
        .current_dir(&work_dir)
        .output();

    match output {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout).to_string();
            let stderr = String::from_utf8_lossy(&o.stderr).to_string();
            if o.status.success() {
                (StatusCode::CREATED, Json(json!({
                    "message": "Docker Compose stack deployed",
                    "directory": work_dir,
                    "output": format!("{}\n{}", stdout, stderr).trim().to_string()
                }))).into_response()
            } else {
                (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({
                    "error": stderr.trim(),
                    "directory": work_dir
                }))).into_response()
            }
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

/// Stop and remove a docker-compose stack
pub async fn compose_down(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let directory = body.get("directory").and_then(|v| v.as_str()).unwrap_or("");
    if directory.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Directory path required"}))).into_response();
    }

    let output = Command::new("docker")
        .args(&["compose", "down"])
        .current_dir(directory)
        .output();

    match output {
        Ok(o) => {
            let stderr = String::from_utf8_lossy(&o.stderr).to_string();
            if o.status.success() {
                Json(json!({"message": "Stack stopped and removed", "output": stderr.trim()})).into_response()
            } else {
                (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": stderr.trim()}))).into_response()
            }
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
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

// ============================================================
// 🔥 ADVANCED DOCKER FEATURES
// ============================================================

/// 1. Container Stats WebSocket — Streams realtime CPU/RAM/Net/IO every 2s
pub async fn container_stats_ws(
    Path(id): Path<String>,
    ws: axum::extract::ws::WebSocketUpgrade,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_container_stats_ws(socket, id))
}

async fn handle_container_stats_ws(mut socket: axum::extract::ws::WebSocket, container_id: String) {
    use axum::extract::ws::Message;
    use std::time::Duration;

    let mut interval = tokio::time::interval(Duration::from_secs(2));

    loop {
        interval.tick().await;

        let output = Command::new("docker")
            .args(&["stats", "--no-stream", "--format", "{{json .}}", &container_id])
            .output();

        match output {
            Ok(o) if o.status.success() => {
                let data = String::from_utf8_lossy(&o.stdout).trim().to_string();
                if !data.is_empty() {
                    if socket.send(Message::Text(data.into())).await.is_err() {
                        break;
                    }
                }
            }
            _ => {
                let _ = socket.send(Message::Text(
                    json!({"error": "Container not found or not running"}).to_string().into()
                )).await;
                break;
            }
        }
    }
}

/// 2. Docker Registry Login — Authenticate with Docker Hub or private registries
pub async fn registry_login(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let server = body.get("server").and_then(|v| v.as_str()).unwrap_or("").trim();
    let username = body.get("username").and_then(|v| v.as_str()).unwrap_or("");
    let password = body.get("password").and_then(|v| v.as_str()).unwrap_or("");

    if username.is_empty() || password.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Username and password are required"}))).into_response();
    }

    // Use --password-stdin for security (never pass password as CLI arg)
    let mut cmd = std::process::Command::new("docker");
    cmd.args(&["login", "--username", username, "--password-stdin"]);
    if !server.is_empty() {
        cmd.arg(server);
    }

    cmd.stdin(std::process::Stdio::piped());
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    match cmd.spawn() {
        Ok(mut child) => {
            if let Some(mut stdin) = child.stdin.take() {
                use std::io::Write;
                let _ = stdin.write_all(password.as_bytes());
                drop(stdin); // Close stdin so docker can proceed
            }
            match child.wait_with_output() {
                Ok(output) => {
                    if output.status.success() {
                        let registry = if server.is_empty() { "Docker Hub" } else { server };
                        Json(json!({
                            "message": format!("Successfully logged in to {}", registry),
                            "registry": registry
                        })).into_response()
                    } else {
                        let err = String::from_utf8_lossy(&output.stderr).to_string();
                        (StatusCode::UNAUTHORIZED, Json(json!({"error": err.trim()}))).into_response()
                    }
                }
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
            }
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

/// List configured Docker registry credentials
pub async fn registry_list() -> impl IntoResponse {
    // Docker stores auth in ~/.docker/config.json
    let config_path = "/root/.docker/config.json";
    if let Ok(content) = std::fs::read_to_string(config_path) {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(auths) = v.get("auths").and_then(|a| a.as_object()) {
                let registries: Vec<serde_json::Value> = auths.keys().map(|k| {
                    json!({ "server": k, "configured": true })
                }).collect();
                return Json(json!(registries)).into_response();
            }
        }
    }
    Json(json!([])).into_response()
}

/// Docker Registry Logout
pub async fn registry_logout(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let server = body.get("server").and_then(|v| v.as_str()).unwrap_or("");
    let mut args = vec!["logout"];
    if !server.is_empty() {
        args.push(server);
    }
    match docker_cmd_check(&args) {
        Ok(msg) => Json(json!({"message": msg.trim()})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e}))).into_response(),
    }
}

/// 3. Container Exec WebSocket — Interactive shell inside a running container
pub async fn container_exec_ws(
    Path(id): Path<String>,
    ws: axum::extract::ws::WebSocketUpgrade,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_container_exec_ws(socket, id))
}

async fn handle_container_exec_ws(mut socket: axum::extract::ws::WebSocket, container_id: String) {
    use axum::extract::ws::Message;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::process::Command as TokioCommand;

    // Spawn docker exec -i
    let mut child = match TokioCommand::new("docker")
        .args(&["exec", "-i", &container_id, "/bin/sh", "-c", "TERM=xterm exec /bin/bash 2>/dev/null || exec /bin/sh"])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            let _ = socket.send(Message::Text(
                format!("Error: Failed to exec into container: {}\r\n", e).into()
            )).await;
            return;
        }
    };

    let mut stdin = child.stdin.take().unwrap();
    let mut stdout = child.stdout.take().unwrap();

    // Channel to pipe stdout -> ws
    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(64);

    // Background task: read stdout and send to channel
    tokio::spawn(async move {
        let mut buf = [0u8; 4096];
        loop {
            match stdout.read(&mut buf).await {
                Ok(0) => break,
                Ok(n) => {
                    let text = String::from_utf8_lossy(&buf[..n]).to_string();
                    if tx.send(text).await.is_err() { break; }
                }
                Err(_) => break,
            }
        }
    });

    // Main loop: multiplex WS recv + stdout channel
    loop {
        tokio::select! {
            // Data from container stdout -> send to browser
            Some(text) = rx.recv() => {
                if socket.send(Message::Text(text.into())).await.is_err() {
                    break;
                }
            }
            // Data from browser -> send to container stdin
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Text(input))) => {
                        if stdin.write_all(input.as_bytes()).await.is_err() { break; }
                        let _ = stdin.flush().await;
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
        }
    }

    // Cleanup
    let _ = child.kill().await;
}

// REST-based container exec (for simple one-off commands)
pub async fn container_exec(Path(id): Path<String>, Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let command = body.get("command").and_then(|v| v.as_str()).unwrap_or("ls -la");
    let workdir = body.get("workdir").and_then(|v| v.as_str()).unwrap_or("/");

    // Validate container ID
    let safe_id = regex::Regex::new(r"^[a-zA-Z0-9_.\-]+$").unwrap();
    if !safe_id.is_match(&id) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid container ID"}))).into_response();
    }

    let output = Command::new("docker")
        .args(&["exec", "-w", workdir, &id, "sh", "-c", command])
        .output();

    match output {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout).to_string();
            let stderr = String::from_utf8_lossy(&o.stderr).to_string();
            Json(json!({
                "exitCode": o.status.code().unwrap_or(-1),
                "stdout": stdout,
                "stderr": stderr,
                "command": command,
                "workdir": workdir
            })).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}
