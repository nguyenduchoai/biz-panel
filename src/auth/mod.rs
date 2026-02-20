//! Authentication module - JWT + Bcrypt

pub mod middleware;

use axum::{extract::Json, http::StatusCode, response::IntoResponse};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use once_cell::sync::OnceCell;
use serde_json::json;

use crate::config::Config;
use crate::models::{Claims, LoginRequest, LoginResponse, UserInfo};

static AUTH_CONFIG: OnceCell<AuthState> = OnceCell::new();

struct AuthState {
    jwt_secret: String,
    admin_user: String,
    admin_pass_hash: String,
    session_timeout: u64,
}

pub fn init(config: &Config) {
    AUTH_CONFIG
        .set(AuthState {
            jwt_secret: config.auth.jwt_secret.clone(),
            admin_user: config.auth.admin_user.clone(),
            admin_pass_hash: config.auth.admin_pass_hash.clone(),
            session_timeout: config.auth.session_timeout,
        })
        .ok();
}

pub async fn login_handler(Json(req): Json<LoginRequest>) -> impl IntoResponse {
    let auth = AUTH_CONFIG.get().expect("Auth not initialized");

    // Verify username
    if req.username != auth.admin_user {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({"error": "Invalid credentials"})),
        );
    }

    // Verify password
    match bcrypt::verify(&req.password, &auth.admin_pass_hash) {
        Ok(true) => {}
        _ => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({"error": "Invalid credentials"})),
            );
        }
    }

    // Create JWT token
    let now = chrono::Utc::now().timestamp() as usize;
    let claims = Claims {
        sub: req.username.clone(),
        role: "admin".to_string(),
        iat: now,
        exp: now + (auth.session_timeout as usize),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(auth.jwt_secret.as_bytes()),
    )
    .unwrap_or_default();

    (
        StatusCode::OK,
        Json(json!(LoginResponse {
            token,
            user: UserInfo {
                username: req.username,
                role: "admin".to_string(),
            },
        })),
    )
}

pub fn verify_token(token: &str) -> Option<Claims> {
    let auth = AUTH_CONFIG.get()?;

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(auth.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .ok()?;

    Some(token_data.claims)
}

pub async fn get_current_user(
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    if let Some(auth_header) = headers.get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if let Some(token) = auth_str.strip_prefix("Bearer ") {
                if let Some(claims) = verify_token(token) {
                    return (
                        StatusCode::OK,
                        Json(json!({
                            "username": claims.sub,
                            "role": claims.role,
                        })),
                    );
                }
            }
        }
    }

    (
        StatusCode::UNAUTHORIZED,
        Json(json!({"error": "Not authenticated"})),
    )
}

pub async fn change_password_handler(
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let new_password = body
        .get("newPassword")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if new_password.len() < 8 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Password must be at least 8 characters"})),
        );
    }

    match bcrypt::hash(new_password, bcrypt::DEFAULT_COST) {
        Ok(hash) => {
            // Update config file
            let mut config = crate::config::get();
            config.auth.admin_pass_hash = hash;
            crate::config::update(config.clone());

            // Save to file
            if let Ok(content) = toml::to_string_pretty(&config) {
                std::fs::write("/etc/biz-panel/config.toml", content).ok();
            }

            (
                StatusCode::OK,
                Json(json!({"message": "Password changed successfully"})),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Failed to hash password: {}", e)})),
        ),
    }
}
