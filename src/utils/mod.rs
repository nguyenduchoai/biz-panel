//! Utilities - system commands, nginx config generation, etc.

use std::process::Command;

pub fn create_nginx_config(domain: &str, document_root: &str, php_version: Option<&str>) {
    let php_block = if let Some(v) = php_version {
        format!(r#"
    location ~ \.php$ {{
        fastcgi_pass unix:/var/run/php/php{v}-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }}"#, v = v)
    } else {
        String::new()
    };

    let config = format!(r#"server {{
    listen 80;
    server_name {domain};
    root {root};
    index index.html index.php;

    access_log /var/log/nginx/{domain}.access.log;
    error_log /var/log/nginx/{domain}.error.log;

    location / {{
        try_files $uri $uri/ /index.html =404;
    }}
{php_block}
    location ~ /\.ht {{
        deny all;
    }}
}}"#, domain = domain, root = document_root, php_block = php_block);

    let path = format!("/etc/nginx/sites-available/{}", domain);
    std::fs::write(&path, &config).ok();

    // Enable site
    let link = format!("/etc/nginx/sites-enabled/{}", domain);
    std::os::unix::fs::symlink(&path, &link).ok();

    // Reload nginx
    Command::new("systemctl").args(["reload", "nginx"]).output().ok();
}

pub fn remove_nginx_config(domain: &str) {
    let available = format!("/etc/nginx/sites-available/{}", domain);
    let enabled = format!("/etc/nginx/sites-enabled/{}", domain);
    std::fs::remove_file(&enabled).ok();
    std::fs::remove_file(&available).ok();
    Command::new("systemctl").args(["reload", "nginx"]).output().ok();
}

pub fn create_real_database(name: &str, engine: &str) {
    match engine {
        "mysql" | "mariadb" => {
            Command::new("mysql")
                .args(["-e", &format!("CREATE DATABASE IF NOT EXISTS `{}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;", name)])
                .output()
                .ok();
        }
        "postgresql" => {
            Command::new("sudo")
                .args(["-u", "postgres", "createdb", name])
                .output()
                .ok();
        }
        _ => {}
    }
}

pub fn drop_real_database(name: &str, engine: &str) {
    match engine {
        "mysql" | "mariadb" => {
            Command::new("mysql")
                .args(["-e", &format!("DROP DATABASE IF EXISTS `{}`;", name)])
                .output()
                .ok();
        }
        "postgresql" => {
            Command::new("sudo")
                .args(["-u", "postgres", "dropdb", "--if-exists", name])
                .output()
                .ok();
        }
        _ => {}
    }
}

pub fn add_crontab_entry(schedule: &str, command: &str) {
    // Read current crontab
    let current = Command::new("crontab").arg("-l").output()
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .unwrap_or_default();

    let new_entry = format!("{} {}", schedule, command);
    let updated = format!("{}\n{}\n", current.trim(), new_entry);

    // Write new crontab
    let child = Command::new("crontab")
        .arg("-")
        .stdin(std::process::Stdio::piped())
        .spawn();

    if let Ok(mut child) = child {
        use std::io::Write;
        if let Some(ref mut stdin) = child.stdin {
            stdin.write_all(updated.as_bytes()).ok();
        }
        child.wait().ok();
    }
}

pub fn apply_ufw_rule(port: i32, protocol: &str, action: &str) {
    let rule = match action {
        "allow" => "allow",
        "deny" => "deny",
        _ => return,
    };
    Command::new("ufw")
        .args([rule, &format!("{}/{}", port, protocol)])
        .output()
        .ok();
}

pub fn remove_ufw_rule(port: i32, protocol: &str) {
    Command::new("ufw")
        .args(["delete", "allow", &format!("{}/{}", port, protocol)])
        .output()
        .ok();
}

/// Format bytes to human-readable string
pub fn format_bytes(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    let mut size = bytes as f64;
    let mut unit_idx = 0;
    while size >= 1024.0 && unit_idx < UNITS.len() - 1 {
        size /= 1024.0;
        unit_idx += 1;
    }
    format!("{:.1} {}", size, UNITS[unit_idx])
}

/// Format seconds to human-readable uptime
pub fn format_uptime(seconds: u64) -> String {
    let days = seconds / 86400;
    let hours = (seconds % 86400) / 3600;
    let mins = (seconds % 3600) / 60;
    if days > 0 {
        format!("{}d {}h {}m", days, hours, mins)
    } else if hours > 0 {
        format!("{}h {}m", hours, mins)
    } else {
        format!("{}m", mins)
    }
}
