use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub brew_path: String,
    pub brew_version: String,
    pub prefix: String,
    pub arch: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServiceInfo {
    pub name: String,
    pub status: String,
    pub user: Option<String>,
    pub file: Option<String>,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CleanupItem {
    pub path: String,
    pub size: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CleanupPreview {
    pub items: Vec<CleanupItem>,
    pub total_space: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub formulae: Vec<String>,
    pub casks: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandOutput {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
}

pub fn get_brew_bin() -> PathBuf {
    let candidates = [
        "/opt/homebrew/bin/brew",
        "/usr/local/bin/brew",
        "/home/linuxbrew/.linuxbrew/bin/brew",
    ];

    for path in &candidates {
        let p = PathBuf::from(path);
        if p.exists() {
            return p;
        }
    }

    PathBuf::from("brew")
}

pub fn create_brew_command() -> Command {
    let brew_bin = get_brew_bin();
    let mut cmd = Command::new(brew_bin);

    // Ensure common PATHs are present for GUI applications on macOS
    let current_path = std::env::var("PATH").unwrap_or_default();
    let new_path = format!(
        "/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:{}",
        current_path
    );
    cmd.env("PATH", new_path);
    cmd.env("HOMEBREW_NO_AUTO_UPDATE", "1");
    cmd.env("HOMEBREW_NO_EMOJI", "0");
    cmd
}

pub async fn get_system_info() -> Result<SystemInfo, String> {
    let brew_bin = get_brew_bin();
    let brew_path_str = brew_bin.to_string_lossy().to_string();

    let mut version_cmd = create_brew_command();
    version_cmd.arg("--version");
    let version_output = version_cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run brew --version: {}", e))?;

    let version_str = String::from_utf8_lossy(&version_output.stdout);
    let first_line = version_str.lines().next().unwrap_or("Unknown").to_string();

    let mut prefix_cmd = create_brew_command();
    prefix_cmd.arg("--prefix");
    let prefix_output = prefix_cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run brew --prefix: {}", e))?;
    let prefix_str = String::from_utf8_lossy(&prefix_output.stdout).trim().to_string();

    let arch = std::env::consts::ARCH.to_string();

    Ok(SystemInfo {
        brew_path: brew_path_str,
        brew_version: first_line,
        prefix: prefix_str,
        arch,
    })
}

pub async fn get_installed_json() -> Result<serde_json::Value, String> {
    let mut cmd = create_brew_command();
    cmd.args(["info", "--json=v2", "--installed"]);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute brew info: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse brew info JSON: {}", e))
}

pub async fn get_outdated_json() -> Result<serde_json::Value, String> {
    let mut cmd = create_brew_command();
    cmd.args(["outdated", "--json=v2"]);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute brew outdated: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse brew outdated JSON: {}", e))
}

pub async fn get_services_list() -> Result<Vec<ServiceInfo>, String> {
    let mut cmd = create_brew_command();
    cmd.args(["services", "list", "--json"]);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute brew services: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse services JSON: {}", e))
}

pub async fn manage_service_action(name: &str, action: &str) -> Result<CommandOutput, String> {
    let mut cmd = create_brew_command();
    cmd.args(["services", action, name]);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute service action {}: {}", action, e))?;

    Ok(CommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

pub async fn get_cleanup_dry_run() -> Result<CleanupPreview, String> {
    let mut cmd = create_brew_command();
    cmd.args(["cleanup", "-n"]);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute brew cleanup -n: {}", e))?;

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let mut items = Vec::new();
    let mut total_space = "0 B".to_string();

    for line in stdout_str.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("Would remove:") {
            let rest = trimmed.trim_start_matches("Would remove:").trim();
            // Format can be: path (size)
            if let Some((path_part, size_part)) = rest.rsplit_once('(') {
                let size = size_part.trim_end_matches(')').trim().to_string();
                items.push(CleanupItem {
                    path: path_part.trim().to_string(),
                    size: Some(size),
                });
            } else {
                items.push(CleanupItem {
                    path: rest.to_string(),
                    size: None,
                });
            }
        } else if trimmed.starts_with("==> This operation would free approximately") {
            let rest = trimmed
                .trim_start_matches("==> This operation would free approximately")
                .trim();
            let cleaned = rest.trim_end_matches("of disk space.").trim();
            total_space = cleaned.to_string();
        }
    }

    Ok(CleanupPreview { items, total_space })
}

pub async fn run_cleanup_execute() -> Result<CommandOutput, String> {
    let mut cmd = create_brew_command();
    cmd.args(["cleanup", "--prune=all"]);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute brew cleanup: {}", e))?;

    Ok(CommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

pub async fn run_autoremove_execute() -> Result<CommandOutput, String> {
    let mut cmd = create_brew_command();
    cmd.args(["autoremove"]);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute brew autoremove: {}", e))?;

    Ok(CommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

pub async fn package_operation(
    operation: &str,
    name: &str,
    is_cask: bool,
) -> Result<CommandOutput, String> {
    let mut cmd = create_brew_command();
    let mut args = vec![operation];

    if is_cask {
        args.push("--cask");
    }
    args.push(name);
    cmd.args(&args);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute brew {} {}: {}", operation, name, e))?;

    Ok(CommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

pub async fn search_brew(query: &str) -> Result<SearchResult, String> {
    let mut cmd = create_brew_command();
    cmd.args(["search", query]);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to search brew: {}", e))?;

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let mut formulae = Vec::new();
    let mut casks = Vec::new();

    let mut current_section = "";

    for line in stdout_str.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("==> Formulae") {
            current_section = "formulae";
            continue;
        } else if trimmed.starts_with("==> Casks") {
            current_section = "casks";
            continue;
        }

        if trimmed.is_empty() {
            continue;
        }

        let tokens: Vec<&str> = trimmed.split_whitespace().collect();
        for token in tokens {
            if token.starts_with('(') && token.ends_with(')') {
                continue;
            }
            if current_section == "formulae" {
                formulae.push(token.to_string());
            } else if current_section == "casks" {
                casks.push(token.to_string());
            }
        }
    }

    Ok(SearchResult { formulae, casks })
}

pub async fn check_brew_doctor() -> Result<CommandOutput, String> {
    let mut cmd = create_brew_command();
    cmd.arg("doctor");

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run brew doctor: {}", e))?;

    Ok(CommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}
