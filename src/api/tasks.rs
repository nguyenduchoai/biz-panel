//! Background Task System
//! Provides async task execution for long-running operations (installs, deploys, etc.)

use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

#[derive(Clone, Debug)]
pub struct Task {
    pub id: String,
    pub name: String,
    pub status: TaskStatus,
    pub output: String,
    pub error: String,
    pub started_at: u64,
    pub finished_at: Option<u64>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum TaskStatus {
    Running,
    Success,
    Failed,
}

impl TaskStatus {
    fn as_str(&self) -> &str {
        match self {
            TaskStatus::Running => "running",
            TaskStatus::Success => "success",
            TaskStatus::Failed => "failed",
        }
    }
}

type TaskStore = Arc<Mutex<HashMap<String, Task>>>;

fn task_store() -> &'static TaskStore {
    static STORE: OnceLock<TaskStore> = OnceLock::new();
    STORE.get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
}

fn now_ts() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()
}

fn gen_task_id() -> String {
    format!("task_{}", now_ts() * 1000 + (Instant::now().elapsed().subsec_millis() as u64))
}

/// Spawn a background task. Returns the task ID immediately.
pub fn spawn_task(name: &str, cmd: &str, args: &[&str]) -> String {
    let task_id = gen_task_id();
    let task = Task {
        id: task_id.clone(),
        name: name.to_string(),
        status: TaskStatus::Running,
        output: String::new(),
        error: String::new(),
        started_at: now_ts(),
        finished_at: None,
    };

    {
        let mut store = task_store().lock().unwrap();
        // Cleanup old finished tasks (keep last 50)
        if store.len() > 100 {
            let mut ids: Vec<(String, u64)> = store.iter()
                .filter(|(_, t)| t.status != TaskStatus::Running)
                .map(|(id, t)| (id.clone(), t.started_at))
                .collect();
            ids.sort_by_key(|(_, ts)| *ts);
            for (id, _) in ids.iter().take(ids.len().saturating_sub(50)) {
                store.remove(id);
            }
        }
        store.insert(task_id.clone(), task);
    }

    let tid = task_id.clone();
    let command = cmd.to_string();
    let arguments: Vec<String> = args.iter().map(|s| s.to_string()).collect();

    tokio::task::spawn(async move {
        let result = tokio::task::spawn_blocking(move || {
            std::process::Command::new(&command)
                .args(&arguments)
                .output()
        }).await;

        let mut store = task_store().lock().unwrap();
        if let Some(task) = store.get_mut(&tid) {
            task.finished_at = Some(now_ts());
            match result {
                Ok(Ok(output)) => {
                    task.output = String::from_utf8_lossy(&output.stdout).to_string();
                    if output.status.success() {
                        task.status = TaskStatus::Success;
                    } else {
                        task.status = TaskStatus::Failed;
                        task.error = String::from_utf8_lossy(&output.stderr).to_string();
                    }
                }
                Ok(Err(e)) => {
                    task.status = TaskStatus::Failed;
                    task.error = e.to_string();
                }
                Err(e) => {
                    task.status = TaskStatus::Failed;
                    task.error = format!("Task panicked: {}", e);
                }
            }
        }
    });

    task_id
}

/// Spawn with a full bash command string
pub fn spawn_bash_task(name: &str, bash_cmd: &str) -> String {
    spawn_task(name, "bash", &["-c", bash_cmd])
}

/// Spawn and also run a post-success command (e.g. systemctl enable)
pub fn spawn_task_with_post(name: &str, bash_cmd: &str, post_cmd: Option<&str>) -> String {
    let task_id = gen_task_id();
    let task = Task {
        id: task_id.clone(),
        name: name.to_string(),
        status: TaskStatus::Running,
        output: String::new(),
        error: String::new(),
        started_at: now_ts(),
        finished_at: None,
    };

    {
        let mut store = task_store().lock().unwrap();
        store.insert(task_id.clone(), task);
    }

    let tid = task_id.clone();
    let cmd = bash_cmd.to_string();
    let post = post_cmd.map(|s| s.to_string());

    tokio::task::spawn(async move {
        let result = tokio::task::spawn_blocking(move || {
            let output = std::process::Command::new("bash")
                .args(["-c", &cmd])
                .output()?;

            if output.status.success() {
                // Run post-success command if any
                if let Some(ref pcmd) = post {
                    let _ = std::process::Command::new("bash")
                        .args(["-c", pcmd])
                        .output();
                }
            }
            Ok::<_, std::io::Error>(output)
        }).await;

        let mut store = task_store().lock().unwrap();
        if let Some(task) = store.get_mut(&tid) {
            task.finished_at = Some(now_ts());
            match result {
                Ok(Ok(output)) => {
                    task.output = String::from_utf8_lossy(&output.stdout).to_string();
                    if output.status.success() {
                        task.status = TaskStatus::Success;
                    } else {
                        task.status = TaskStatus::Failed;
                        task.error = String::from_utf8_lossy(&output.stderr).to_string();
                    }
                }
                Ok(Err(e)) => { task.status = TaskStatus::Failed; task.error = e.to_string(); }
                Err(e) => { task.status = TaskStatus::Failed; task.error = format!("Task panicked: {}", e); }
            }
        }
    });

    task_id
}

// === API Handlers ===

/// GET /api/tasks/:id — Check task status
pub async fn get_task_status(Path(id): Path<String>) -> impl IntoResponse {
    let store = task_store().lock().unwrap();
    match store.get(&id) {
        Some(task) => {
            let elapsed = task.finished_at.unwrap_or(now_ts()) - task.started_at;
            Json(json!({
                "id": task.id,
                "name": task.name,
                "status": task.status.as_str(),
                "output": if task.output.len() > 2000 { &task.output[task.output.len()-2000..] } else { &task.output },
                "error": task.error,
                "elapsed": elapsed,
                "startedAt": task.started_at,
                "finishedAt": task.finished_at,
            })).into_response()
        }
        None => (StatusCode::NOT_FOUND, Json(json!({"error": "Task not found"}))).into_response(),
    }
}

/// GET /api/tasks — List recent tasks
pub async fn list_tasks() -> impl IntoResponse {
    let store = task_store().lock().unwrap();
    let mut tasks: Vec<_> = store.values().collect();
    tasks.sort_by(|a, b| b.started_at.cmp(&a.started_at));
    let list: Vec<_> = tasks.iter().take(20).map(|t| {
        json!({
            "id": t.id,
            "name": t.name,
            "status": t.status.as_str(),
            "elapsed": t.finished_at.unwrap_or(now_ts()) - t.started_at,
            "startedAt": t.started_at,
        })
    }).collect();
    Json(json!(list)).into_response()
}
