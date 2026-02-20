//! PHP multi-version management

use axum::{extract::Path, http::StatusCode, response::IntoResponse, Json};
use serde_json::json;
use std::process::Command;

const PHP_VERSIONS: &[&str] = &["8.3", "8.2", "8.1", "8.0", "7.4"];

pub async fn list_versions() -> impl IntoResponse {
    let versions: Vec<serde_json::Value> = PHP_VERSIONS.iter().map(|v| {
        let installed = Command::new("dpkg").args(["-l", &format!("php{}-fpm", v)]).output()
            .map(|o| o.status.success()).unwrap_or(false);
        let is_default = Command::new("php").arg("-v").output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains(v)).unwrap_or(false);
        let status = if installed {
            Command::new("systemctl").args(["is-active", &format!("php{}-fpm", v)]).output()
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).ok()
        } else { None };
        json!({"version": v, "installed": installed, "isDefault": is_default, "status": status})
    }).collect();
    Json(json!(versions))
}

pub async fn install_version(Path(version): Path<String>) -> impl IntoResponse {
    use super::tasks;
    let cmd = format!(
        "add-apt-repository -y ppa:ondrej/php 2>/dev/null; apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y php{v}-fpm php{v}-cli php{v}-common php{v}-mysql php{v}-xml php{v}-curl php{v}-mbstring php{v}-zip php{v}-gd php{v}-intl",
        v = version
    );
    let post = format!("systemctl enable --now php{}-fpm", version);
    let task_id = tasks::spawn_task_with_post(
        &format!("Install PHP {}", version),
        &cmd,
        Some(&post),
    );
    Json(json!({"taskId": task_id, "status": "installing", "message": format!("PHP {} installation started", version)}))
}

pub async fn uninstall_version(Path(version): Path<String>) -> impl IntoResponse {
    use super::tasks;
    let cmd = format!(
        "systemctl stop php{v}-fpm 2>/dev/null || true && DEBIAN_FRONTEND=noninteractive apt-get purge -y 'php{v}*' && apt-get autoremove -y",
        v = version
    );
    let task_id = tasks::spawn_bash_task(
        &format!("Uninstall PHP {}", version),
        &cmd,
    );
    Json(json!({"taskId": task_id, "status": "uninstalling", "message": format!("PHP {} removal started", version)}))
}

pub async fn control_fpm(Path((version, action)): Path<(String, String)>) -> impl IntoResponse {
    let unit = format!("php{}-fpm", version);
    let valid = ["start", "stop", "restart", "reload"];
    if !valid.contains(&action.as_str()) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error":"Invalid action"}))).into_response();
    }
    match Command::new("systemctl").args([&action, &unit]).output() {
        Ok(o) if o.status.success() => Json(json!({"message": format!("php{}-fpm {}", version, action)})).into_response(),
        Ok(o) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": String::from_utf8_lossy(&o.stderr).to_string()}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

pub async fn get_extensions(Path(version): Path<String>) -> impl IntoResponse {
    let output = Command::new("php").args([&format!("-d error_reporting=0"), "-m"]).output();
    let installed: Vec<String> = output.map(|o| String::from_utf8_lossy(&o.stdout).lines().map(String::from).collect()).unwrap_or_default();
    let common_exts = ["curl","gd","intl","mbstring","mysql","xml","zip","bcmath","imagick","redis","soap","ldap","pgsql","sqlite3","opcache"];
    let exts: Vec<serde_json::Value> = common_exts.iter().map(|e| {
        let is_installed = installed.iter().any(|i| i.to_lowercase() == e.to_lowercase());
        json!({"name": e, "installed": is_installed, "version": version})
    }).collect();
    Json(json!(exts))
}

pub async fn install_extension(Path((version, ext)): Path<(String, String)>) -> impl IntoResponse {
    use super::tasks;
    let pkg = format!("php{}-{}", version, ext);
    let post = format!("systemctl restart php{}-fpm", version);
    let task_id = tasks::spawn_task_with_post(
        &format!("Install {}", pkg),
        &format!("DEBIAN_FRONTEND=noninteractive apt-get install -y {}", pkg),
        Some(&post),
    );
    Json(json!({"taskId": task_id, "status": "installing", "message": format!("{} installation started", pkg)}))
}

pub async fn get_config(Path(version): Path<String>) -> impl IntoResponse {
    let ini_path = format!("/etc/php/{}/fpm/php.ini", version);
    match std::fs::read_to_string(&ini_path) {
        Ok(content) => Json(json!({"path": ini_path, "content": content})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

pub async fn update_config(Path(version): Path<String>, Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let ini_path = format!("/etc/php/{}/fpm/php.ini", version);
    let content = body.get("content").and_then(|v| v.as_str()).unwrap_or("");
    match std::fs::write(&ini_path, content) {
        Ok(_) => {
            Command::new("systemctl").args(["restart", &format!("php{}-fpm", version)]).output().ok();
            Json(json!({"message": "Config updated"})).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}
