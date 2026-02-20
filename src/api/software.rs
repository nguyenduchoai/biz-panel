//! Software management (aaPanel-style)

use axum::{extract::Path, http::StatusCode, response::IntoResponse, Json};
use serde_json::json;
use std::process::Command;

pub async fn list_software() -> impl IntoResponse {
    // Return list of all installable software with status
    let items = vec![
        check_sw("nginx", "Nginx", "Web Server", "🌐"),
        check_sw("apache2", "Apache", "Web Server", "🪶"),
        check_sw("mariadb-server", "MariaDB", "Database", "🐬"),
        check_sw("postgresql", "PostgreSQL", "Database", "🐘"),
        check_sw("redis-server", "Redis", "Cache", "🔴"),
        check_sw("nodejs", "Node.js", "Runtime", "⬢"),
        check_sw("python3", "Python", "Runtime", "🐍"),
        check_sw("docker.io", "Docker", "Container", "🐳"),
        check_sw("fail2ban", "Fail2ban", "Security", "🛡️"),
        check_sw("certbot", "Certbot", "SSL", "🔒"),
    ];
    Json(json!(items))
}

fn check_sw(pkg: &str, name: &str, category: &str, icon: &str) -> serde_json::Value {
    let installed = Command::new("dpkg").args(["-l", pkg]).output().map(|o| o.status.success()).unwrap_or(false);
    let version = if installed {
        Command::new("dpkg-query").args(["-W", "-f", "${Version}", pkg]).output()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()).ok()
    } else { None };
    json!({"id": pkg, "name": name, "category": category, "icon": icon, "installed": installed, "version": version})
}

pub async fn install_software(Path(id): Path<String>) -> impl IntoResponse {
    let output = Command::new("bash")
        .args(["-c", &format!("DEBIAN_FRONTEND=noninteractive apt-get install -y {}", id)])
        .output();
    match output {
        Ok(o) if o.status.success() => Json(json!({"message": format!("{} installed", id)})).into_response(),
        Ok(o) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": String::from_utf8_lossy(&o.stderr).to_string()}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

pub async fn uninstall_software(Path(id): Path<String>) -> impl IntoResponse {
    let output = Command::new("bash")
        .args(["-c", &format!("DEBIAN_FRONTEND=noninteractive apt-get purge -y {} && apt-get autoremove -y", id)])
        .output();
    match output {
        Ok(o) if o.status.success() => Json(json!({"message": format!("{} uninstalled", id)})).into_response(),
        Ok(o) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": String::from_utf8_lossy(&o.stderr).to_string()}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

pub async fn service_action(Path((id, action)): Path<(String, String)>) -> impl IntoResponse {
    let valid = ["start", "stop", "restart", "reload"];
    if !valid.contains(&action.as_str()) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid action"}))).into_response();
    }
    match Command::new("systemctl").args([&action, &id]).output() {
        Ok(o) if o.status.success() => Json(json!({"message": format!("{} {}", id, action)})).into_response(),
        Ok(o) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": String::from_utf8_lossy(&o.stderr).to_string()}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}
