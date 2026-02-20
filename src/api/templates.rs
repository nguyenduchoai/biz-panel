//! App Store - Docker-based templates

use axum::{extract::Path, http::StatusCode, response::IntoResponse, Json};
use serde_json::json;
use std::process::Command;

fn get_template_list() -> Vec<serde_json::Value> {
    vec![
        json!({"id":"wordpress","name":"WordPress","description":"Popular CMS","category":"CMS","icon":"📝","version":"6.4","image":"wordpress:latest","ports":[{"host":8080,"container":80}],"env":[{"key":"WORDPRESS_DB_HOST","value":"db","required":true}]}),
        json!({"id":"ghost","name":"Ghost","description":"Professional publishing","category":"CMS","icon":"👻","version":"5.x","image":"ghost:latest","ports":[{"host":2368,"container":2368}],"env":[]}),
        json!({"id":"nextcloud","name":"Nextcloud","description":"Self-hosted cloud","category":"Cloud","icon":"☁️","version":"28","image":"nextcloud:latest","ports":[{"host":8081,"container":80}],"env":[]}),
        json!({"id":"gitea","name":"Gitea","description":"Git hosting","category":"DevTools","icon":"🍵","version":"1.21","image":"gitea/gitea:latest","ports":[{"host":3000,"container":3000}],"env":[]}),
        json!({"id":"portainer","name":"Portainer","description":"Docker management UI","category":"DevTools","icon":"🐳","version":"2.x","image":"portainer/portainer-ce:latest","ports":[{"host":9000,"container":9000}],"env":[]}),
        json!({"id":"nginx-proxy-manager","name":"Nginx Proxy Manager","description":"Reverse proxy","category":"Network","icon":"🔄","version":"2.x","image":"jc21/nginx-proxy-manager:latest","ports":[{"host":81,"container":81}],"env":[]}),
        json!({"id":"phpmyadmin","name":"phpMyAdmin","description":"MySQL management","category":"Database","icon":"🗄️","version":"5.x","image":"phpmyadmin:latest","ports":[{"host":8082,"container":80}],"env":[{"key":"PMA_HOST","value":"localhost","required":true}]}),
        json!({"id":"redis-commander","name":"Redis Commander","description":"Redis management","category":"Database","icon":"🔴","version":"0.8","image":"rediscommander/redis-commander:latest","ports":[{"host":8083,"container":8081}],"env":[]}),
        json!({"id":"prometheus","name":"Prometheus","description":"Monitoring system","category":"Monitoring","icon":"📊","version":"2.x","image":"prom/prometheus:latest","ports":[{"host":9090,"container":9090}],"env":[]}),
        json!({"id":"grafana","name":"Grafana","description":"Visualization","category":"Monitoring","icon":"📈","version":"10.x","image":"grafana/grafana:latest","ports":[{"host":3001,"container":3000}],"env":[]}),
        json!({"id":"uptime-kuma","name":"Uptime Kuma","description":"Uptime monitoring","category":"Monitoring","icon":"📡","version":"1.x","image":"louislam/uptime-kuma:latest","ports":[{"host":3002,"container":3001}],"env":[]}),
        json!({"id":"minio","name":"MinIO","description":"S3-compatible storage","category":"Storage","icon":"📦","version":"latest","image":"minio/minio:latest","ports":[{"host":9001,"container":9001}],"env":[{"key":"MINIO_ROOT_USER","value":"admin","required":true},{"key":"MINIO_ROOT_PASSWORD","value":"password","required":true}]}),
        json!({"id":"n8n","name":"n8n","description":"Workflow automation","category":"Automation","icon":"⚡","version":"1.x","image":"n8nio/n8n:latest","ports":[{"host":5678,"container":5678}],"env":[]}),
        json!({"id":"plausible","name":"Plausible","description":"Privacy-friendly analytics","category":"Analytics","icon":"📊","version":"2.x","image":"plausible/analytics:latest","ports":[{"host":8000,"container":8000}],"env":[]}),
    ]
}

pub async fn list_templates() -> impl IntoResponse {
    Json(json!(get_template_list()))
}

pub async fn get_categories() -> impl IntoResponse {
    let categories = vec!["CMS","Cloud","DevTools","Database","Monitoring","Network","Storage","Automation","Analytics"];
    Json(json!(categories))
}

pub async fn get_template(Path(id): Path<String>) -> impl IntoResponse {
    match get_template_list().into_iter().find(|t| t.get("id").and_then(|v| v.as_str()) == Some(&id)) {
        Some(t) => Json(t).into_response(),
        None => (StatusCode::NOT_FOUND, Json(json!({"error":"Template not found"}))).into_response(),
    }
}

pub async fn deploy_template(Path(id): Path<String>, Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let templates = get_template_list();
    let template = match templates.iter().find(|t| t.get("id").and_then(|v| v.as_str()) == Some(&id)) {
        Some(t) => t,
        None => return (StatusCode::NOT_FOUND, Json(json!({"error":"Not found"}))).into_response(),
    };

    let image = template.get("image").and_then(|v| v.as_str()).unwrap_or("");
    let name = template.get("name").and_then(|v| v.as_str()).unwrap_or(&id);
    let container_name = format!("biz-{}", id);

    // Build port mappings
    let mut port_args = Vec::new();
    if let Some(ports) = template.get("ports").and_then(|v| v.as_array()) {
        for p in ports {
            let host = p.get("host").and_then(|v| v.as_u64()).unwrap_or(0);
            let container = p.get("container").and_then(|v| v.as_u64()).unwrap_or(0);
            port_args.push("-p".to_string());
            port_args.push(format!("{}:{}", host, container));
        }
    }

    // Build env vars
    let mut env_args = Vec::new();
    if let Some(custom_env) = body.get("env").and_then(|v| v.as_object()) {
        for (k, v) in custom_env {
            env_args.push("-e".to_string());
            env_args.push(format!("{}={}", k, v.as_str().unwrap_or("")));
        }
    }

    let mut args = vec!["run", "-d", "--name", &container_name, "--restart", "unless-stopped"];
    let port_refs: Vec<&str> = port_args.iter().map(|s| s.as_str()).collect();
    let env_refs: Vec<&str> = env_args.iter().map(|s| s.as_str()).collect();
    args.extend(port_refs);
    args.extend(env_refs);
    args.push(image);

    match Command::new("docker").args(&args).output() {
        Ok(o) if o.status.success() => {
            let container_id = String::from_utf8_lossy(&o.stdout).trim().to_string();
            (StatusCode::CREATED, Json(json!({"message": format!("{} deployed", name), "containerId": container_id}))).into_response()
        }
        Ok(o) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": String::from_utf8_lossy(&o.stderr).to_string()}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}
