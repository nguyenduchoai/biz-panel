//! Service management - Install/Uninstall/Control system services

use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::process::Command;

fn get_service_registry() -> Vec<serde_json::Value> {
    vec![
        // Runtimes
        json!({"id":"nodejs","name":"Node.js","type":"runtime","description":"JavaScript runtime","icon":"⬢","versions":["22","20","18"],"systemdUnit":"","packages":"nodejs"}),
        json!({"id":"python","name":"Python","type":"runtime","description":"Python runtime","icon":"🐍","versions":["3.12","3.11","3.10"],"systemdUnit":"","packages":"python3"}),
        json!({"id":"go","name":"Go","type":"runtime","description":"Go programming language","icon":"🔵","versions":["1.22","1.21"],"systemdUnit":"","packages":"golang"}),
        json!({"id":"rust","name":"Rust","type":"runtime","description":"Rust programming language","icon":"🦀","versions":["stable"],"systemdUnit":"","packages":"rustc"}),
        // Web Servers
        json!({"id":"nginx","name":"Nginx","type":"webserver","description":"High-performance HTTP server","icon":"🌐","versions":["1.25","1.24"],"systemdUnit":"nginx","port":80,"configPath":"/etc/nginx/nginx.conf","packages":"nginx"}),
        json!({"id":"apache","name":"Apache","type":"webserver","description":"Apache HTTP Server","icon":"🪶","versions":["2.4"],"systemdUnit":"apache2","port":80,"packages":"apache2"}),
        // Databases
        json!({"id":"mariadb","name":"MariaDB","type":"database","description":"MySQL-compatible database","icon":"🐬","versions":["11.4","10.11"],"systemdUnit":"mariadb","port":3306,"configPath":"/etc/mysql/mariadb.conf.d/","packages":"mariadb-server"}),
        json!({"id":"postgresql","name":"PostgreSQL","type":"database","description":"Advanced relational database","icon":"🐘","versions":["16","15"],"systemdUnit":"postgresql","port":5432,"packages":"postgresql"}),
        json!({"id":"mongodb","name":"MongoDB","type":"database","description":"Document database","icon":"🍃","versions":["7.0","6.0"],"systemdUnit":"mongod","port":27017,"packages":"mongod"}),
        json!({"id":"redis","name":"Redis","type":"database","description":"In-memory data store","icon":"🔴","versions":["7.2"],"systemdUnit":"redis-server","port":6379,"packages":"redis-server"}),
        // Cache
        json!({"id":"memcached","name":"Memcached","type":"cache","description":"Distributed memory cache","icon":"📦","versions":["1.6"],"systemdUnit":"memcached","port":11211,"packages":"memcached"}),
        // Tools
        json!({"id":"docker","name":"Docker","type":"tool","description":"Container platform","icon":"🐳","versions":["26","25"],"systemdUnit":"docker","packages":"docker.io"}),
        json!({"id":"certbot","name":"Certbot","type":"tool","description":"Let's Encrypt client","icon":"🔒","versions":["2.x"],"systemdUnit":"","packages":"certbot"}),
        json!({"id":"fail2ban","name":"Fail2ban","type":"tool","description":"Intrusion prevention","icon":"🛡️","versions":["1.0"],"systemdUnit":"fail2ban","packages":"fail2ban"}),
        json!({"id":"pm2","name":"PM2","type":"tool","description":"Node.js process manager","icon":"🔄","versions":["5.x"],"systemdUnit":"","packages":"pm2"}),
        json!({"id":"composer","name":"Composer","type":"tool","description":"PHP dependency manager","icon":"🎼","versions":["2.x"],"systemdUnit":"","packages":"composer"}),
        json!({"id":"supervisor","name":"Supervisor","type":"tool","description":"Process control","icon":"👁️","versions":["4.2"],"systemdUnit":"supervisor","packages":"supervisor"}),
    ]
}

fn is_installed(id: &str) -> bool {
    let check = match id {
        "nodejs" => Command::new("node").arg("--version").output(),
        "python" => Command::new("python3").arg("--version").output(),
        "go" => Command::new("go").arg("version").output(),
        "rust" => Command::new("rustc").arg("--version").output(),
        "pm2" => Command::new("pm2").arg("--version").output(),
        "composer" => Command::new("composer").arg("--version").output(),
        _ => Command::new("dpkg").args(["-l", &get_package_name(id)]).output(),
    };

    check.map(|o| o.status.success()).unwrap_or(false)
}

fn get_package_name(id: &str) -> String {
    match id {
        "nginx" => "nginx",
        "apache" => "apache2",
        "mariadb" => "mariadb-server",
        "postgresql" => "postgresql",
        "redis" => "redis-server",
        "memcached" => "memcached",
        "docker" => "docker.io",
        "certbot" => "certbot",
        "fail2ban" => "fail2ban",
        "supervisor" => "supervisor",
        _ => id,
    }.to_string()
}

fn get_service_status(systemd_unit: &str) -> Option<crate::models::ServiceStatus> {
    if systemd_unit.is_empty() {
        return None;
    }

    let output = Command::new("systemctl")
        .args(["show", systemd_unit, "--no-pager",
            "-p", "ActiveState,MainPID,MemoryCurrent"])
        .output()
        .ok()?;

    let data = String::from_utf8_lossy(&output.stdout);
    let mut state = "unknown".to_string();
    let mut pid = 0u32;
    let mut mem = 0u64;

    for line in data.lines() {
        if let Some(v) = line.strip_prefix("ActiveState=") { state = v.to_string(); }
        if let Some(v) = line.strip_prefix("MainPID=") { pid = v.parse().unwrap_or(0); }
        if let Some(v) = line.strip_prefix("MemoryCurrent=") { mem = v.parse().unwrap_or(0); }
    }

    Some(crate::models::ServiceStatus {
        state,
        pid: if pid > 0 { Some(pid) } else { None },
        uptime: None,
        memory: if mem > 0 { Some(mem) } else { None },
        cpu: None,
    })
}

fn get_installed_version(id: &str) -> Option<String> {
    let output = match id {
        "nodejs" => Command::new("node").arg("--version").output().ok()?,
        "python" => Command::new("python3").arg("--version").output().ok()?,
        "go" => Command::new("go").arg("version").output().ok()?,
        "rust" => Command::new("rustc").arg("--version").output().ok()?,
        "nginx" => Command::new("nginx").arg("-v").output().ok()?,
        "docker" => Command::new("docker").arg("--version").output().ok()?,
        _ => {
            Command::new("dpkg-query")
                .args(["-W", "-f", "${Version}", &get_package_name(id)])
                .output().ok()?
        }
    };

    let out = String::from_utf8_lossy(&output.stdout).to_string() +
              &String::from_utf8_lossy(&output.stderr).to_string();

    // Extract version number
    let version = out.trim().to_string();
    if version.is_empty() { None } else { Some(version) }
}

pub async fn list_services() -> impl IntoResponse {
    let registry = get_service_registry();

    let services: Vec<serde_json::Value> = registry
        .into_iter()
        .map(|mut s| {
            let id = s.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let systemd_unit = s.get("systemdUnit").and_then(|v| v.as_str()).unwrap_or("").to_string();

            let installed = is_installed(&id);
            s.as_object_mut().unwrap().insert("installed".to_string(), json!(installed));

            if installed {
                if let Some(version) = get_installed_version(&id) {
                    s.as_object_mut().unwrap().insert("installedVersion".to_string(), json!(version));
                }
                if !systemd_unit.is_empty() {
                    if let Some(status) = get_service_status(&systemd_unit) {
                        s.as_object_mut().unwrap().insert("status".to_string(), serde_json::to_value(status).unwrap());
                    }
                }
            }

            s
        })
        .collect();

    Json(json!(services))
}

pub async fn get_service(Path(id): Path<String>) -> impl IntoResponse {
    let registry = get_service_registry();
    match registry.into_iter().find(|s| s.get("id").and_then(|v| v.as_str()) == Some(&id)) {
        Some(mut service) => {
            let systemd_unit = service.get("systemdUnit").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let installed = is_installed(&id);
            service.as_object_mut().unwrap().insert("installed".to_string(), json!(installed));
            if installed {
                if let Some(version) = get_installed_version(&id) {
                    service.as_object_mut().unwrap().insert("installedVersion".to_string(), json!(version));
                }
                if !systemd_unit.is_empty() {
                    if let Some(status) = get_service_status(&systemd_unit) {
                        service.as_object_mut().unwrap().insert("status".to_string(), serde_json::to_value(status).unwrap());
                    }
                }
            }
            Json(service).into_response()
        }
        None => (StatusCode::NOT_FOUND, Json(json!({"error": "Service not found"}))).into_response(),
    }
}

pub async fn install_service(Path(id): Path<String>) -> impl IntoResponse {
    use super::tasks;

    let name = format!("Install {}", id);

    // Build install command
    let install_cmd = match id.as_str() {
        "nodejs" => "curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs".to_string(),
        "pm2" => "npm install -g pm2".to_string(),
        "composer" => "curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer".to_string(),
        "rust" => "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y".to_string(),
        _ => {
            let pkg = get_package_name(&id);
            format!("DEBIAN_FRONTEND=noninteractive apt-get install -y {}", pkg)
        }
    };

    // Build post-install command (enable systemd unit)
    let registry = get_service_registry();
    let post_cmd = registry.iter()
        .find(|s| s.get("id").and_then(|v| v.as_str()) == Some(&id))
        .and_then(|s| s.get("systemdUnit").and_then(|v| v.as_str()))
        .filter(|u| !u.is_empty())
        .map(|u| format!("systemctl enable --now {}", u));

    let task_id = tasks::spawn_task_with_post(
        &name,
        &install_cmd,
        post_cmd.as_deref(),
    );

    Json(json!({
        "taskId": task_id,
        "status": "installing",
        "message": format!("{} installation started in background", id),
    })).into_response()
}

pub async fn uninstall_service(Path(id): Path<String>) -> impl IntoResponse {
    use super::tasks;

    let pkg = get_package_name(&id);
    let name = format!("Uninstall {}", id);

    // Build full uninstall command: stop + disable + purge
    let registry = get_service_registry();
    let unit = registry.iter()
        .find(|s| s.get("id").and_then(|v| v.as_str()) == Some(&id))
        .and_then(|s| s.get("systemdUnit").and_then(|v| v.as_str()))
        .unwrap_or("");

    let cmd = match id.as_str() {
        "pm2" => "npm uninstall -g pm2".to_string(),
        _ => {
            let mut parts = Vec::new();
            if !unit.is_empty() {
                parts.push(format!("systemctl stop {} 2>/dev/null || true", unit));
                parts.push(format!("systemctl disable {} 2>/dev/null || true", unit));
            }
            parts.push(format!("DEBIAN_FRONTEND=noninteractive apt-get purge -y {} && apt-get autoremove -y", pkg));
            parts.join(" && ")
        }
    };

    let task_id = tasks::spawn_bash_task(&name, &cmd);

    Json(json!({
        "taskId": task_id,
        "status": "uninstalling",
        "message": format!("{} uninstall started in background", id),
    })).into_response()
}

pub async fn control_service(Path((id, action)): Path<(String, String)>) -> impl IntoResponse {
    let registry = get_service_registry();
    let unit = registry.iter()
        .find(|s| s.get("id").and_then(|v| v.as_str()) == Some(&id))
        .and_then(|s| s.get("systemdUnit").and_then(|v| v.as_str()))
        .unwrap_or(&id);

    if unit.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Service has no systemd unit"}))).into_response();
    }

    let valid_actions = ["start", "stop", "restart", "reload", "enable", "disable"];
    if !valid_actions.contains(&action.as_str()) {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Invalid action"}))).into_response();
    }

    match Command::new("systemctl").args([&action, unit]).output() {
        Ok(o) if o.status.success() => Json(json!({"message": format!("Service {} {}", id, action)})).into_response(),
        Ok(o) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": String::from_utf8_lossy(&o.stderr).to_string()}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

pub async fn get_service_config(Path(id): Path<String>) -> impl IntoResponse {
    let registry = get_service_registry();
    let config_path = registry.iter()
        .find(|s| s.get("id").and_then(|v| v.as_str()) == Some(&id))
        .and_then(|s| s.get("configPath").and_then(|v| v.as_str()));

    match config_path {
        Some(path) => {
            match std::fs::read_to_string(path) {
                Ok(content) => Json(json!({"path": path, "content": content})).into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
            }
        }
        None => (StatusCode::NOT_FOUND, Json(json!({"error": "No config file"}))).into_response(),
    }
}

pub async fn update_service_config(Path(id): Path<String>, Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let registry = get_service_registry();
    let config_path = registry.iter()
        .find(|s| s.get("id").and_then(|v| v.as_str()) == Some(&id))
        .and_then(|s| s.get("configPath").and_then(|v| v.as_str()));

    match config_path {
        Some(path) => {
            let content = body.get("content").and_then(|v| v.as_str()).unwrap_or("");
            match std::fs::write(path, content) {
                Ok(_) => Json(json!({"message": "Config updated"})).into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
            }
        }
        None => (StatusCode::NOT_FOUND, Json(json!({"error": "No config file"}))).into_response(),
    }
}

pub async fn get_service_logs(Path(id): Path<String>) -> impl IntoResponse {
    let registry = get_service_registry();
    let unit = registry.iter()
        .find(|s| s.get("id").and_then(|v| v.as_str()) == Some(&id))
        .and_then(|s| s.get("systemdUnit").and_then(|v| v.as_str()))
        .unwrap_or(&id);

    match Command::new("journalctl").args(["-u", unit, "-n", "100", "--no-pager"]).output() {
        Ok(o) => {
            let logs = String::from_utf8_lossy(&o.stdout).to_string();
            Json(json!({"logs": logs})).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}
