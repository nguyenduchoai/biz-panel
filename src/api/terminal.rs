//! Terminal API - PTY WebSocket

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::io::{Read, Write};
use std::process::Command;

pub async fn list_shells() -> impl IntoResponse {
    let shells = vec![
        json!({"name": "bash", "path": "/bin/bash", "available": std::path::Path::new("/bin/bash").exists()}),
        json!({"name": "sh", "path": "/bin/sh", "available": true}),
        json!({"name": "zsh", "path": "/usr/bin/zsh", "available": std::path::Path::new("/usr/bin/zsh").exists()}),
    ];
    Json(json!(shells))
}

pub async fn create_terminal(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(handle_terminal)
}

async fn handle_terminal(mut socket: WebSocket) {
    use portable_pty::{CommandBuilder, PtySize, native_pty_system};

    let pty_system = native_pty_system();

    let pair = match pty_system.openpty(PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    }) {
        Ok(pair) => pair,
        Err(e) => {
            let _ = socket.send(Message::Text(format!("Error: {}", e).into())).await;
            return;
        }
    };

    let mut cmd = CommandBuilder::new("/bin/bash");
    cmd.env("TERM", "xterm-256color");
    cmd.env("LANG", "en_US.UTF-8");

    let mut child = match pair.slave.spawn_command(cmd) {
        Ok(child) => child,
        Err(e) => {
            let _ = socket.send(Message::Text(format!("Error: {}", e).into())).await;
            return;
        }
    };

    let mut reader = pair.master.try_clone_reader().unwrap();
    let mut writer = pair.master.take_writer().unwrap();

    // Read from PTY → send to WebSocket
    let (tx, mut rx) = tokio::sync::mpsc::channel::<Vec<u8>>(32);

    // Spawn blocking reader
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    if tx.blocking_send(buf[..n].to_vec()).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });

    loop {
        tokio::select! {
            Some(data) = rx.recv() => {
                if socket.send(Message::Binary(data.into())).await.is_err() {
                    break;
                }
            }
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        // Handle resize
                        if text.starts_with(r#"{"type":"resize""#) {
                            if let Ok(resize) = serde_json::from_str::<serde_json::Value>(&text) {
                                let cols = resize.get("cols").and_then(|v| v.as_u64()).unwrap_or(80) as u16;
                                let rows = resize.get("rows").and_then(|v| v.as_u64()).unwrap_or(24) as u16;
                                pair.master.resize(PtySize {
                                    rows,
                                    cols,
                                    pixel_width: 0,
                                    pixel_height: 0,
                                }).ok();
                            }
                        } else {
                            writer.write_all(text.as_bytes()).ok();
                        }
                    }
                    Some(Ok(Message::Binary(data))) => {
                        writer.write_all(&data).ok();
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
        }
    }

    child.kill().ok();
}

pub async fn execute_command(Json(body): Json<serde_json::Value>) -> impl IntoResponse {
    let command = body.get("command").and_then(|v| v.as_str()).unwrap_or("");

    if command.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(json!({"error": "Command is required"}))).into_response();
    }

    let output = Command::new("bash")
        .args(["-c", command])
        .output();

    match output {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout).to_string();
            let stderr = String::from_utf8_lossy(&o.stderr).to_string();
            Json(json!({
                "stdout": stdout,
                "stderr": stderr,
                "exitCode": o.status.code().unwrap_or(-1),
            })).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}
