# Rust Migration Technical Architecture Log

## 1. Motivations for Migration (Go -> Rust)
The original Go API & React frontend pair required ~55 MB footprint, dual systemd daemons, manual dependency installs (`Node.js`, `Go`), and suffered from startup sequence synchronization issues. By writing biz-panel in Rust (`Axum`), everything is statically compiled into a 4.1MB binary. Static frontend files are embedded into the binary using `include_str!()` or dynamic pathing if run as debug.
RAM usage plummeted from ~80 MB -> 9 MB.

## 2. Global Services Additions (v2)
1. **Background Tasks Engine:** Replaced basic synchronous execs with isolated `tokio::task::spawn_blocking` wrappers generating persistent tasks monitored through polling by the frontend.
2. **Interactive `pollTask` loop in JS:** Eliminates loading timeouts and keeps user experience crisp by showing accurate success/failure texts from stdout/stderr.
3. **Audit Engine:** `/security/audit` performs proactive server-side security checks replacing standard ad-hoc bash script deployments.
4. **Cloud Connectors (`rclone`):** Backups now seamlessly transition from local archive to cloud nodes. 

## 3. Toolchain & Dependencies
- Web Framework: **Axum 0.7**, **Tokio** runtime.
- Data Persistence: **rusqlite** (Embedded SQLite).
- Analytics: **sysinfo** (OS cross-platform metrics retrieval).
- Shell operations: **std::process::Command** via `sh -c`.
- Embedded Frontend: Pure HTML/CSS/JS (no bundler required).
