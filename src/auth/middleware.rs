//! Auth middleware for JWT verification

use axum::{
    body::Body,
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
};

use crate::auth;

pub async fn require_auth(request: Request<Body>, next: Next) -> Result<Response, StatusCode> {
    // Skip auth for login, health, and static assets
    let path = request.uri().path();
    if path == "/api/auth/login"
        || path == "/api/health"
        || path.starts_with("/static")
        || path.starts_with("/favicon")
        || path == "/login"
    {
        return Ok(next.run(request).await);
    }

    // Check for JWT in Authorization header
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    // Also check cookie for web UI
    let cookie_token = request
        .headers()
        .get(header::COOKIE)
        .and_then(|h| h.to_str().ok())
        .and_then(|cookies| {
            cookies.split(';').find_map(|c| {
                let c = c.trim();
                c.strip_prefix("biz_token=")
            })
        });

    let token = if let Some(auth_str) = auth_header {
        auth_str.strip_prefix("Bearer ").map(String::from)
    } else {
        cookie_token.map(String::from)
    };

    match token {
        Some(t) => {
            if auth::verify_token(&t).is_some() {
                Ok(next.run(request).await)
            } else {
                // For web pages, redirect to login
                if !path.starts_with("/api/") {
                    Ok(Response::builder()
                        .status(StatusCode::FOUND)
                        .header("Location", "/login")
                        .body(Body::empty())
                        .unwrap())
                } else {
                    Err(StatusCode::UNAUTHORIZED)
                }
            }
        }
        None => {
            // For web pages, redirect to login
            if !path.starts_with("/api/") && path != "/login" {
                Ok(Response::builder()
                    .status(StatusCode::FOUND)
                    .header("Location", "/login")
                    .body(Body::empty())
                    .unwrap())
            } else if path.starts_with("/api/") {
                Err(StatusCode::UNAUTHORIZED)
            } else {
                Ok(next.run(request).await)
            }
        }
    }
}
