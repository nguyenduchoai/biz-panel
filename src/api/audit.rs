use axum::{response::IntoResponse, Json};
use serde_json::json;
use std::process::Command;

pub async fn run_security_audit() -> impl IntoResponse {
    let mut passed = Vec::new();
    let mut warnings = Vec::new();

    // 1. Check Root Login Over SSH
    let sshd_config = std::fs::read_to_string("/etc/ssh/sshd_config").unwrap_or_default();
    if sshd_config.contains("PermitRootLogin yes") || sshd_config.lines().any(|l| l.trim() == "PermitRootLogin yes") {
        warnings.push("Root SSH login is currently ENABLED. This is a severe security risk.");
    } else {
        passed.push("Root SSH login is disabled.");
    }

    // 2. Check SSH Port
    if sshd_config.contains("Port 22\n") || sshd_config.lines().any(|l| l.trim() == "Port 22") {
        warnings.push("SSH is running on the default port 22. Consider changing it to prevent brute force bots.");
    } else {
        passed.push("SSH port is customized.");
    }

    // 3. Check Fail2ban
    let f2b_status = Command::new("systemctl").args(["is-active", "fail2ban"]).output();
    if let Ok(output) = f2b_status {
        if String::from_utf8_lossy(&output.stdout).trim() == "active" {
            passed.push("Fail2ban is active and protecting services.");
        } else {
            warnings.push("Fail2ban is not running. Your server is vulnerable to brute force attacks.");
        }
    } else {
        warnings.push("Fail2ban is not installed.");
    }

    // 4. Check UFW/Firewall
    let ufw_status = Command::new("ufw").arg("status").output();
    if let Ok(output) = ufw_status {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.contains("Status: active") {
            passed.push("UFW Firewall is active.");
        } else {
            warnings.push("UFW Firewall is disabled.");
        }
    } else {
        let iptables = Command::new("iptables").args(["-L", "-n"]).output();
        if let Ok(out) = iptables {
            if String::from_utf8_lossy(&out.stdout).contains("ACCEPT") {
                passed.push("iptables rules are present.");
            } else {
                warnings.push("No active firewall detected.");
            }
        } else {
            warnings.push("No firewall installed or accessible.");
        }
    }

    // 5. Unattended Upgrades (Auto security updates)
    let auto_upgrades = Command::new("dpkg").args(["-l", "unattended-upgrades"]).output();
    if let Ok(output) = auto_upgrades {
        if String::from_utf8_lossy(&output.stdout).contains("unattended-upgrades") {
            passed.push("Automatic security updates are installed.");
        } else {
            warnings.push("unattended-upgrades is not installed. Keep your system updated manually.");
        }
    }

    // Overall Score Calculation
    let total_checks = passed.len() + warnings.len();
    let score = if total_checks == 0 { 0 } else { (passed.len() as f64 / total_checks as f64 * 100.0) as u32 };

    Json(json!({
        "score": score,
        "passed": passed,
        "warnings": warnings,
        "timestamp": chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
    }))
}
