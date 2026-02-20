//! API module - All REST API handlers

pub mod metrics;
pub mod handlers;
pub mod files;
pub mod logs;
pub mod terminal;
pub mod services;
pub mod docker;
pub mod tasks;
pub mod ssl;
pub mod software;
pub mod php;
pub mod templates;
pub mod backup;

use axum::{
    middleware as axum_middleware,
    routing::{delete, get, post, put},
    Router,
};
use crate::auth;

pub fn router() -> Router {
    Router::new()
        // Health check (no auth)
        .route("/health", get(metrics::health_check))
        // Auth routes
        .route("/auth/login", post(auth::login_handler))
        // Protected routes
        .nest("", protected_routes())
}

fn protected_routes() -> Router {
    Router::new()
        // Auth
        .route("/auth/me", get(auth::get_current_user))
        .route("/auth/change-password", post(auth::change_password_handler))
        // System metrics
        .route("/metrics", get(metrics::get_system_metrics))
        .route("/metrics/ws", get(metrics::metrics_websocket))
        // Websites
        .route("/websites", get(handlers::list_websites).post(handlers::create_website))
        .route("/websites/{id}", delete(handlers::delete_website))
        // Databases
        .route("/databases", get(handlers::list_databases).post(handlers::create_database))
        .route("/databases/{id}", delete(handlers::delete_database))
        // Cronjobs
        .route("/crons", get(handlers::list_cronjobs).post(handlers::create_cronjob))
        .route("/crons/{id}", put(handlers::update_cronjob).delete(handlers::delete_cronjob))
        .route("/crons/{id}/run", post(handlers::run_cronjob))
        // Firewall
        .route("/firewall/rules", get(handlers::list_firewall_rules).post(handlers::create_firewall_rule))
        .route("/firewall/rules/{id}", delete(handlers::delete_firewall_rule))
        // Settings
        .route("/settings", get(handlers::get_settings).put(handlers::update_settings))
        // Activities
        .route("/activities", get(handlers::list_activities))
        // File Manager
        .route("/files", get(files::list_directory).delete(files::delete_path))
        .route("/files/read", get(files::read_file))
        .route("/files/write", post(files::write_file))
        .route("/files/mkdir", post(files::create_directory))
        .route("/files/rename", post(files::rename_path))
        .route("/files/copy", post(files::copy_path))
        .route("/files/chmod", post(files::change_permissions))
        .route("/files/search", get(files::search_files))
        // Logs
        .route("/logs/sources", get(logs::list_log_sources))
        .route("/logs/search", get(logs::search_logs))
        .route("/logs/{source}", get(logs::get_logs).delete(logs::clear_log))
        .route("/logs/{source}/stream", get(logs::stream_logs))
        .route("/logs/{source}/download", get(logs::download_log))
        // Terminal
        .route("/terminal/shells", get(terminal::list_shells))
        .route("/terminal/ws", get(terminal::create_terminal))
        .route("/terminal/exec", post(terminal::execute_command))
        // Docker
        .route("/docker/containers", get(docker::list_containers).post(docker::create_container))
        .route("/docker/containers/stats", get(docker::list_containers_stats))
        .route("/docker/images/pull", post(docker::pull_image))
        .route("/docker/compose/up", post(docker::compose_up))
        .route("/docker/compose/down", post(docker::compose_down))
        .route("/docker/containers/{id}", get(docker::get_container).delete(docker::remove_container))
        .route("/docker/containers/{id}/start", post(docker::start_container))
        .route("/docker/containers/{id}/stop", post(docker::stop_container))
        .route("/docker/containers/{id}/restart", post(docker::restart_container))
        .route("/docker/containers/{id}/logs", get(docker::container_logs))
        .route("/docker/containers/{id}/stats", get(docker::container_stats))
        .route("/docker/containers/{id}/project", post(docker::assign_project))
        .route("/docker/overview", get(docker::docker_overview))
        .route("/docker/images", get(docker::list_images))
        .route("/docker/images/{id}", delete(docker::remove_image))
        .route("/docker/networks", get(docker::list_networks).post(docker::create_network))
        .route("/docker/networks/{id}", delete(docker::remove_network))
        .route("/docker/volumes", get(docker::list_volumes).post(docker::create_volume))
        .route("/docker/volumes/{name}", delete(docker::remove_volume))
        // SSL
        .route("/ssl", get(ssl::list_certificates))
        .route("/ssl/{id}", get(ssl::get_certificate).delete(ssl::delete_certificate))
        .route("/ssl/letsencrypt", post(ssl::request_letsencrypt))
        .route("/ssl/self-signed", post(ssl::generate_self_signed))
        .route("/ssl/{id}/renew", post(ssl::renew_certificate))
        // Software
        .route("/software", get(software::list_software))
        .route("/software/{id}/install", post(software::install_software))
        .route("/software/{id}/uninstall", post(software::uninstall_software))
        .route("/software/{id}/{action}", post(software::service_action))
        // PHP
        .route("/php/versions", get(php::list_versions))
        .route("/php/versions/{version}/install", post(php::install_version))
        .route("/php/versions/{version}/uninstall", post(php::uninstall_version))
        .route("/php/versions/{version}/extensions", get(php::get_extensions))
        .route("/php/versions/{version}/extensions/{ext}/install", post(php::install_extension))
        .route("/php/versions/{version}/config", get(php::get_config).put(php::update_config))
        .route("/php/versions/{version}/{action}", post(php::control_fpm))
        // Services
        .route("/services", get(services::list_services))
        .route("/services/{id}", get(services::get_service))
        .route("/services/{id}/install", post(services::install_service))
        .route("/services/{id}/uninstall", post(services::uninstall_service))
        .route("/services/{id}/config", get(services::get_service_config).put(services::update_service_config))
        .route("/services/{id}/logs", get(services::get_service_logs))
        .route("/services/{id}/{action}", post(services::control_service))
        // App Store Templates
        .route("/templates", get(templates::list_templates))
        .route("/templates/categories", get(templates::get_categories))
        .route("/templates/{id}", get(templates::get_template))
        .route("/templates/{id}/deploy", post(templates::deploy_template))
        // Backups
        .route("/backups", get(backup::list_backups).post(backup::create_backup))
        .route("/backups/{name}", delete(backup::delete_backup))
        .route("/backups/cloud/config", get(backup::get_rclone_config))
        // Background Tasks
        .route("/tasks", get(tasks::list_tasks))
        .route("/tasks/{id}", get(tasks::get_task_status))
        // Apply auth middleware
        .layer(axum_middleware::from_fn(crate::auth::middleware::require_auth))
}
