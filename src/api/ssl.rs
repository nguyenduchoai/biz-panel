//! SSL Certificate management

use axum::{extract::Path, http::StatusCode, response::IntoResponse, Json};
use serde_json::json;
use std::process::Command;
use uuid::Uuid;
use crate::models::db;

pub async fn list_certificates() -> impl IntoResponse {
    let conn = db::get_conn();
    let conn = conn.lock();
    let mut stmt = conn.prepare("SELECT id, domain, provider, status, issued_at, expires_at, auto_renew FROM ssl_certificates ORDER BY domain").unwrap();
    let certs: Vec<serde_json::Value> = stmt.query_map([], |row| {
        Ok(json!({"id": row.get::<_,String>(0)?, "domain": row.get::<_,String>(1)?, "provider": row.get::<_,String>(2)?,
            "status": row.get::<_,String>(3)?, "issuedAt": row.get::<_,Option<String>>(4)?, "expiresAt": row.get::<_,Option<String>>(5)?,
            "autoRenew": row.get::<_,bool>(6)?}))
    }).unwrap().filter_map(|r| r.ok()).collect();
    Json(json!(certs))
}

pub async fn get_certificate(Path(id): Path<String>) -> impl IntoResponse {
    let conn = db::get_conn();
    let conn = conn.lock();
    match conn.query_row("SELECT id, domain, provider, status, issued_at, expires_at, auto_renew FROM ssl_certificates WHERE id = ?1", [&id], |row| {
        Ok(json!({"id": row.get::<_,String>(0)?, "domain": row.get::<_,String>(1)?, "provider": row.get::<_,String>(2)?,
            "status": row.get::<_,String>(3)?, "issuedAt": row.get::<_,Option<String>>(4)?, "expiresAt": row.get::<_,Option<String>>(5)?,
            "autoRenew": row.get::<_,bool>(6)?}))
    }) {
        Ok(cert) => Json(cert).into_response(),
        Err(_) => (StatusCode::NOT_FOUND, Json(json!({"error":"Not found"}))).into_response(),
    }
}

pub async fn request_letsencrypt(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let domain = body.get("domain").and_then(|v| v.as_str()).unwrap_or("");
    let email = body.get("email").and_then(|v| v.as_str()).unwrap_or("admin@example.com");
    if domain.is_empty() { return (StatusCode::BAD_REQUEST, Json(json!({"error":"Domain required"}))).into_response(); }

    let id = Uuid::new_v4().to_string()[..8].to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Run certbot
    let output = Command::new("certbot").args(["certonly","--nginx","--non-interactive","--agree-tos","-m",email,"-d",domain]).output();
    let status = match output { Ok(o) if o.status.success() => "active", _ => "failed" };

    let conn = db::get_conn(); let conn = conn.lock();
    conn.execute("INSERT INTO ssl_certificates (id,domain,provider,status,issued_at,auto_renew) VALUES (?1,?2,'letsencrypt',?3,?4,1)",
        rusqlite::params![id, domain, status, now]).ok();
    (StatusCode::CREATED, Json(json!({"id":id,"domain":domain,"status":status}))).into_response()
}

pub async fn generate_self_signed(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let domain = body.get("domain").and_then(|v| v.as_str()).unwrap_or("");
    if domain.is_empty() { return (StatusCode::BAD_REQUEST, Json(json!({"error":"Domain required"}))).into_response(); }

    let id = Uuid::new_v4().to_string()[..8].to_string();
    let cert_dir = format!("/var/lib/biz-panel/ssl/{}", domain);
    std::fs::create_dir_all(&cert_dir).ok();

    let output = Command::new("openssl").args(["req","-x509","-nodes","-days","365","-newkey","rsa:2048",
        "-keyout",&format!("{}/privkey.pem", cert_dir),"-out",&format!("{}/fullchain.pem", cert_dir),
        "-subj",&format!("/CN={}", domain)]).output();

    let status = match output { Ok(o) if o.status.success() => "active", _ => "failed" };
    let now = chrono::Utc::now().to_rfc3339();

    let conn = db::get_conn(); let conn = conn.lock();
    conn.execute("INSERT INTO ssl_certificates (id,domain,provider,status,issued_at,auto_renew) VALUES (?1,?2,'self-signed',?3,?4,0)",
        rusqlite::params![id, domain, status, now]).ok();
    (StatusCode::CREATED, Json(json!({"id":id,"domain":domain,"status":status}))).into_response()
}

pub async fn renew_certificate(Path(id): Path<String>) -> impl IntoResponse {
    let conn = db::get_conn(); let conn = conn.lock();
    let domain: Option<String> = conn.query_row("SELECT domain FROM ssl_certificates WHERE id=?1", [&id], |r| r.get(0)).ok();
    match domain {
        Some(d) => {
            Command::new("certbot").args(["renew","--cert-name",&d]).output().ok();
            Json(json!({"message":"Renewal initiated"})).into_response()
        }
        None => (StatusCode::NOT_FOUND, Json(json!({"error":"Not found"}))).into_response(),
    }
}

pub async fn delete_certificate(Path(id): Path<String>) -> impl IntoResponse {
    let conn = db::get_conn(); let conn = conn.lock();
    let deleted = conn.execute("DELETE FROM ssl_certificates WHERE id=?1", [&id]).unwrap_or(0);
    if deleted == 0 { (StatusCode::NOT_FOUND, Json(json!({"error":"Not found"}))).into_response() }
    else { Json(json!({"message":"Certificate deleted"})).into_response() }
}
