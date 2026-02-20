//! System metrics - CPU, RAM, Disk, Network

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use sysinfo::{Disks, Networks, System};
use std::time::Duration;

pub async fn health_check() -> impl IntoResponse {
    Json(json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().timestamp(),
        "version": "2.0.0",
        "engine": "rust/axum"
    }))
}

pub async fn get_system_metrics() -> impl IntoResponse {
    match collect_metrics() {
        Ok(metrics) => (StatusCode::OK, Json(serde_json::to_value(metrics).unwrap())),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e})),
        ),
    }
}

fn collect_metrics() -> Result<crate::models::SystemMetrics, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    std::thread::sleep(Duration::from_millis(200));
    sys.refresh_cpu_usage();

    let disks = Disks::new_with_refreshed_list();
    let networks = Networks::new_with_refreshed_list();

    // CPU
    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let cpu_cores = sys.cpus().len();
    let cpu_model = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    // Memory
    let total_mem = sys.total_memory();
    let used_mem = sys.used_memory();
    let free_mem = sys.free_memory();

    // Disk (root partition)
    let (disk_total, disk_used, disk_free) = disks
        .iter()
        .find(|d| d.mount_point() == std::path::Path::new("/"))
        .map(|d| {
            (
                d.total_space(),
                d.total_space() - d.available_space(),
                d.available_space(),
            )
        })
        .unwrap_or((0, 0, 0));

    // Network
    let (bytes_sent, bytes_recv, pkts_sent, pkts_recv) = networks.iter().fold(
        (0u64, 0u64, 0u64, 0u64),
        |(bs, br, ps, pr), (_name, data)| {
            (
                bs + data.total_transmitted(),
                br + data.total_received(),
                ps + data.total_packets_transmitted(),
                pr + data.total_packets_received(),
            )
        },
    );

    // Host info
    let hostname = System::host_name().unwrap_or_else(|| "unknown".to_string());
    let os_name = System::name().unwrap_or_else(|| "Linux".to_string());
    let os_version = System::os_version().unwrap_or_default();

    // Load average
    let load = System::load_average();

    // Uptime
    let uptime = System::uptime();

    Ok(crate::models::SystemMetrics {
        cpu: crate::models::CpuMetrics {
            usage: cpu_usage,
            cores: cpu_cores,
            model: cpu_model,
        },
        memory: crate::models::MemoryMetrics {
            total: total_mem,
            used: used_mem,
            free: free_mem,
            used_percent: if total_mem > 0 {
                (used_mem as f64 / total_mem as f64) * 100.0
            } else {
                0.0
            },
        },
        disk: crate::models::DiskMetrics {
            total: disk_total,
            used: disk_used,
            free: disk_free,
            used_percent: if disk_total > 0 {
                (disk_used as f64 / disk_total as f64) * 100.0
            } else {
                0.0
            },
        },
        network: crate::models::NetworkMetrics {
            bytes_sent,
            bytes_recv,
            packets_sent: pkts_sent,
            packets_recv: pkts_recv,
        },
        uptime,
        hostname,
        os: os_name,
        platform: os_version,
        load_avg: vec![load.one, load.five, load.fifteen],
        timestamp: chrono::Utc::now().timestamp(),
    })
}

pub async fn metrics_websocket(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(handle_metrics_ws)
}

async fn handle_metrics_ws(mut socket: WebSocket) {
    let mut interval = tokio::time::interval(Duration::from_secs(2));

    loop {
        interval.tick().await;

        match collect_metrics() {
            Ok(metrics) => {
                if let Ok(json) = serde_json::to_string(&metrics) {
                    if socket.send(Message::Text(json.into())).await.is_err() {
                        break;
                    }
                }
            }
            Err(_) => continue,
        }
    }
}
