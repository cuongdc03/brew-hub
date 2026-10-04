use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Mutex as StdMutex, RwLock};
use tauri::ipc::Channel;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum OpEvent {
    Stdout(String),
    Stderr(String),
    Exit(Option<i32>),
    Error(String),
}

static RUNNING_OPERATIONS: std::sync::LazyLock<StdMutex<HashMap<String, u32>>> =
    std::sync::LazyLock::new(|| StdMutex::new(HashMap::new()));

/// Global lock to serialize mutating Homebrew operations (install, upgrade, uninstall, adopt, cleanup, autoremove, bundle install).
/// This prevents concurrent `brew` invocations from failing with "Another active Homebrew process is already in progress".
pub static BREW_MUTATION_LOCK: Mutex<()> = Mutex::const_new(());

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoremovePreview {
    pub formulae: Vec<String>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnmanagedApp {
    pub name: String,
    pub path: String,
    pub bundle_id: Option<String>,
    pub installed_version: Option<String>,
    pub cask_token: String,
    pub cask_name: String,
    pub cask_version: String,
    pub cask_desc: Option<String>,
    pub cask_homepage: Option<String>,
    pub auto_updates: bool,
    pub match_confidence: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrewfileData {
    pub path: String,
    pub content: String,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrewfileCheckResult {
    pub satisfied: bool,
    pub missing_count: usize,
    pub missing_items: Vec<String>,
    pub raw_output: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PackageDetail {
    pub name: String,
    pub full_name: String,
    pub is_cask: bool,
    pub desc: Option<String>,
    pub homepage: Option<String>,
    pub version: String,
    pub installed: bool,
    pub installed_version: Option<String>,
    pub outdated: bool,
    pub deprecated: bool,
    pub disabled: bool,
    pub license: Option<String>,
    pub dependencies: Vec<String>,
    pub caveats: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RichSearchResult {
    pub query: String,
    pub formulae: Vec<PackageDetail>,
    pub casks: Vec<PackageDetail>,
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

pub fn is_valid_package_name(name: &str) -> bool {
    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed.len() > 128 || trimmed.starts_with('-') {
        return false;
    }
    trimmed.chars().all(|c| {
        c.is_ascii_alphanumeric()
            || c == '-'
            || c == '_'
            || c == '.'
            || c == '@'
            || c == '+'
            || c == ':'
            || c == '/'
    })
}

pub fn validate_brewfile_path(path: &Path) -> Result<(), String> {
    let path_str = path.to_string_lossy();
    if path_str.contains('\0') {
        return Err("Path contains invalid null byte".to_string());
    }

    let file_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or_else(|| "Invalid file path: missing filename".to_string())?;

    let file_name_lower = file_name.to_lowercase();
    let is_valid_name = file_name_lower == "brewfile"
        || file_name_lower == ".brewfile"
        || file_name_lower.starts_with("brewfile.")
        || file_name_lower.ends_with(".rb")
        || file_name_lower.ends_with(".txt")
        || file_name_lower.ends_with(".brewfile");

    if !is_valid_name {
        return Err(
            "Brewfile filename must be 'Brewfile', '.Brewfile', or end with .rb, .txt, or .brewfile"
                .to_string(),
        );
    }

    let canonical_or_target = if path.exists() {
        path.canonicalize().unwrap_or_else(|_| path.to_path_buf())
    } else {
        path.to_path_buf()
    };
    let resolved_str = canonical_or_target.to_string_lossy();

    let forbidden_prefixes = [
        "/etc",
        "/bin",
        "/sbin",
        "/usr",
        "/System",
        "/Library",
        "/Applications",
    ];
    for prefix in &forbidden_prefixes {
        if resolved_str.starts_with(prefix) {
            return Err(format!(
                "Access denied: writing to '{}' is prohibited",
                prefix
            ));
        }
    }

    if resolved_str.starts_with("/private")
        && !resolved_str.starts_with("/private/tmp")
        && !resolved_str.starts_with("/private/var/folders")
        && !resolved_str.starts_with("/private/var/tmp")
    {
        return Err("Access denied: writing to '/private' is prohibited".to_string());
    }

    if let Ok(home) = std::env::var("HOME") {
        let sensitive_user_paths = [
            format!("{}/.ssh", home),
            format!("{}/.gnupg", home),
            format!("{}/.zshrc", home),
            format!("{}/.bashrc", home),
            format!("{}/.profile", home),
            format!("{}/.bash_profile", home),
            format!("{}/.zprofile", home),
        ];
        for sensitive in &sensitive_user_paths {
            if resolved_str == *sensitive || resolved_str.starts_with(&format!("{}/", sensitive)) {
                return Err(
                    "Access denied: writing to sensitive configuration file is prohibited"
                        .to_string(),
                );
            }
        }
    }

    Ok(())
}

pub fn get_or_create_askpass_script() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        let cache_dir = std::env::temp_dir().join("brew-hub");
        let _ = std::fs::create_dir_all(&cache_dir);
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&cache_dir, std::fs::Permissions::from_mode(0o700));
        }
        let script_path = cache_dir.join("brew-hub-askpass.sh");

        // StandardAdditions provides display dialog without needing tell application "System Events",
        // avoiding macOS TCC Automation prompts that cause silent permission failures.
        let script_content = r#"#!/bin/sh
exec /usr/bin/osascript -e '
set theResp to display dialog "Brew Hub requires administrator privileges to modify system packages:" default answer "" with hidden answer with icon caution with title "Brew Hub Authorization" buttons {"Cancel", "OK"} default button "OK"
text returned of theResp
'
"#;

        // Atomically write to a unique temporary file then rename into place
        // to prevent partial reads or truncate races during concurrent unit tests
        let tmp_script_path = cache_dir.join(format!(
            ".brew-hub-askpass.{}.{}.tmp",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));

        if std::fs::write(&tmp_script_path, script_content).is_ok() {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ = std::fs::set_permissions(
                    &tmp_script_path,
                    std::fs::Permissions::from_mode(0o700),
                );
            }
            if std::fs::rename(&tmp_script_path, &script_path).is_err() {
                // If rename failed (e.g. across mount or filesystem race), fall back to direct write
                let _ = std::fs::write(&script_path, script_content);
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    let _ = std::fs::set_permissions(
                        &script_path,
                        std::fs::Permissions::from_mode(0o700),
                    );
                }
            }
        } else {
            // Direct write fallback
            let _ = std::fs::write(&script_path, script_content);
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ =
                    std::fs::set_permissions(&script_path, std::fs::Permissions::from_mode(0o700));
            }
        }

        if script_path.exists() {
            Some(script_path)
        } else {
            None
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        None
    }
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

    // Enable SUDO_ASKPASS so brew uninstall / brew upgrade can prompt in GUI without hanging
    if let Some(askpass_path) = get_or_create_askpass_script() {
        cmd.env("SUDO_ASKPASS", askpass_path);
    }

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
    let prefix_str = String::from_utf8_lossy(&prefix_output.stdout)
        .trim()
        .to_string();

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

pub async fn get_outdated_json(greedy: bool) -> Result<serde_json::Value, String> {
    let mut cmd = create_brew_command();
    cmd.arg("outdated");
    if greedy {
        cmd.arg("--greedy");
    }
    cmd.arg("--json=v2");

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

static BREW_UPDATE_MUTEX: Mutex<()> = Mutex::const_new(());

pub async fn update_brew_index() -> Result<String, String> {
    let _guard = BREW_UPDATE_MUTEX.lock().await;
    let mut cmd = create_brew_command();
    cmd.env_remove("HOMEBREW_NO_AUTO_UPDATE");
    cmd.env("HOMEBREW_NO_ENV_HINTS", "1");
    cmd.arg("update");
    cmd.arg("--auto-update");
    cmd.arg("--quiet");

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute brew update: {}", e))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("brew update failed: {}", err_msg));
    }

    Ok("Homebrew index successfully updated".to_string())
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

pub fn is_valid_service_name(name: &str) -> bool {
    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed.len() > 128 || trimmed.starts_with('-') {
        return false;
    }
    trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' || c == '@')
}

pub async fn manage_service_action(
    name: &str,
    action: &str,
    as_root: bool,
) -> Result<CommandOutput, String> {
    let trimmed_action = action.trim();
    if !["start", "stop", "restart", "run", "kill"].contains(&trimmed_action) {
        return Err(format!(
            "Invalid service action '{}': must be one of start, stop, restart, run, kill",
            action
        ));
    }

    let trimmed_name = name.trim();
    if !is_valid_service_name(trimmed_name) {
        return Err(format!(
            "Invalid service name '{}': must be alphanumeric with safe punctuation (-_.@)",
            name
        ));
    }

    let output = if as_root {
        #[cfg(target_os = "macos")]
        {
            let mut cmd = Command::new("/usr/bin/sudo");
            cmd.arg("-A");
            cmd.arg(get_brew_bin());
            cmd.args(["services", trimmed_action, "--", trimmed_name]);
            let current_path = std::env::var("PATH").unwrap_or_default();
            let new_path = format!(
                "/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:{}",
                current_path
            );
            cmd.env("PATH", new_path);
            if let Some(askpass_path) = get_or_create_askpass_script() {
                cmd.env("SUDO_ASKPASS", askpass_path);
            }
            cmd.output()
                .await
                .map_err(|e| format!("Failed to execute sudo brew services {}: {}", action, e))?
        }
        #[cfg(not(target_os = "macos"))]
        {
            let mut cmd = create_brew_command();
            cmd.args(["services", trimmed_action, "--", trimmed_name]);
            cmd.output()
                .await
                .map_err(|e| format!("Failed to execute service action {}: {}", action, e))?
        }
    } else {
        let mut cmd = create_brew_command();
        cmd.args(["services", trimmed_action, "--", trimmed_name]);
        cmd.output()
            .await
            .map_err(|e| format!("Failed to execute service action {}: {}", action, e))?
    };

    Ok(CommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

pub fn parse_size_str(size_str: &str) -> Option<u64> {
    let s = size_str.trim();
    if s.is_empty() {
        return None;
    }
    let unit_idx = s.find(|c: char| c.is_alphabetic())?;
    let (num_part, unit_part) = s.split_at(unit_idx);
    let val: f64 = num_part.trim().parse().ok()?;
    let unit = unit_part.trim().to_uppercase();

    let multiplier: f64 = match unit.as_str() {
        "B" | "BYTES" => 1.0,
        "K" | "KB" | "KIB" => 1024.0,
        "M" | "MB" | "MIB" => 1024.0 * 1024.0,
        "G" | "GB" | "GIB" => 1024.0 * 1024.0 * 1024.0,
        "T" | "TB" | "TIB" => 1024.0 * 1024.0 * 1024.0 * 1024.0,
        _ => return None,
    };
    Some((val * multiplier) as u64)
}

pub fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = 1024 * KB;
    const GB: u64 = 1024 * MB;
    const TB: u64 = 1024 * GB;

    if bytes >= TB {
        format!("{:.1} TB", bytes as f64 / TB as f64)
    } else if bytes >= GB {
        format!("{:.1} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KB", bytes as f64 / KB as f64)
    } else if bytes > 0 {
        format!("{} B", bytes)
    } else {
        "0 B".to_string()
    }
}

pub fn parse_cleanup_output(stdout_str: &str) -> CleanupPreview {
    let mut items = Vec::new();
    let mut total_space = String::new();
    let mut parsed_total_bytes: u64 = 0;

    for line in stdout_str.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("Would remove:") {
            let rest = trimmed.trim_start_matches("Would remove:").trim();
            // Format can be: path (size)
            if let Some((path_part, size_part)) = rest.rsplit_once('(') {
                let size = size_part.trim_end_matches(')').trim().to_string();
                if let Some(bytes) = parse_size_str(&size) {
                    parsed_total_bytes += bytes;
                }
                items.push(CleanupItem {
                    path: path_part.trim().to_string(),
                    size: Some(size),
                });
            } else {
                let p = rest.trim().to_string();
                let file_size = std::fs::metadata(&p).map(|m| m.len()).ok();
                if let Some(bytes) = file_size {
                    parsed_total_bytes += bytes;
                }
                let size_str = file_size.map(format_bytes);
                items.push(CleanupItem {
                    path: p,
                    size: size_str,
                });
            }
        } else if trimmed.contains("free approximately") && trimmed.contains("of disk space") {
            if let Some(after) = trimmed.split("free approximately").nth(1) {
                if let Some(before) = after.split("of disk space").next() {
                    let cleaned = before.trim().trim_end_matches('.');
                    if !cleaned.is_empty() {
                        total_space = cleaned.to_string();
                    }
                }
            }
        }
    }

    if total_space.is_empty() || total_space == "0 B" {
        if parsed_total_bytes > 0 {
            total_space = format_bytes(parsed_total_bytes);
        } else {
            total_space = "0 B".to_string();
        }
    }

    CleanupPreview { items, total_space }
}

pub async fn get_cleanup_dry_run(prune_all: Option<bool>) -> Result<CleanupPreview, String> {
    let mut cmd = create_brew_command();
    let prune = prune_all.unwrap_or(true);
    if prune {
        cmd.args(["cleanup", "-n", "--prune=all"]);
    } else {
        cmd.args(["cleanup", "-n"]);
    }

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute brew cleanup dry run: {}", e))?;

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    Ok(parse_cleanup_output(&stdout_str))
}

pub async fn run_cleanup_execute(prune_all: Option<bool>) -> Result<CommandOutput, String> {
    let _lock = BREW_MUTATION_LOCK.lock().await;
    let mut cmd = create_brew_command();
    let prune = prune_all.unwrap_or(true);
    if prune {
        cmd.args(["cleanup", "--prune=all"]);
    } else {
        cmd.args(["cleanup"]);
    }

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

pub fn parse_autoremove_output(stdout: &str) -> Vec<String> {
    let mut formulae = Vec::new();
    let mut collecting = false;

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if trimmed.starts_with("==>") && trimmed.to_lowercase().contains("autoremov") {
            collecting = true;
            continue;
        }

        if collecting {
            if trimmed.starts_with("==>") || trimmed.starts_with("Warning:") {
                collecting = false;
            } else {
                formulae.push(trimmed.to_string());
            }
        }
    }

    formulae
}

pub async fn get_autoremove_dry_run() -> Result<AutoremovePreview, String> {
    let mut cmd = create_brew_command();
    cmd.args(["autoremove", "-n"]);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute brew autoremove -n: {}", e))?;

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let formulae = parse_autoremove_output(&stdout_str);

    Ok(AutoremovePreview { formulae })
}

pub async fn run_autoremove_execute() -> Result<CommandOutput, String> {
    let _lock = BREW_MUTATION_LOCK.lock().await;
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
    greedy: bool,
) -> Result<CommandOutput, String> {
    let _lock = BREW_MUTATION_LOCK.lock().await;

    if !matches!(operation, "install" | "uninstall" | "upgrade") {
        return Err(format!(
            "Invalid package operation: '{}'. Allowed operations: install, uninstall, upgrade",
            operation
        ));
    }
    let trimmed_name = name.trim();
    if !is_valid_package_name(trimmed_name) {
        return Err(format!("Invalid package name: '{}'", name));
    }
    let mut cmd = create_brew_command();
    let mut args = vec![operation];

    if is_cask {
        args.push("--cask");
    }
    if greedy && operation == "upgrade" {
        args.push("--greedy");
    }
    args.push("--");
    args.push(trimmed_name);
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

pub async fn pin_formula(name: &str) -> Result<CommandOutput, String> {
    let _lock = BREW_MUTATION_LOCK.lock().await;

    let trimmed = name.trim();
    if !is_valid_package_name(trimmed) {
        return Err(format!("Invalid package name: '{}'", name));
    }

    let mut cmd = create_brew_command();
    cmd.args(["pin", "--", trimmed]);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute brew pin {}: {}", trimmed, e))?;

    Ok(CommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

pub async fn unpin_formula(name: &str) -> Result<CommandOutput, String> {
    let _lock = BREW_MUTATION_LOCK.lock().await;

    let trimmed = name.trim();
    if !is_valid_package_name(trimmed) {
        return Err(format!("Invalid package name: '{}'", name));
    }

    let mut cmd = create_brew_command();
    cmd.args(["unpin", "--", trimmed]);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute brew unpin {}: {}", trimmed, e))?;

    Ok(CommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

pub async fn run_brew_streaming(
    op_id: String,
    args: Vec<String>,
    on_event: Channel<OpEvent>,
) -> Result<(), String> {
    let mut cmd = create_brew_command();
    cmd.args(&args);
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn brew command: {}", e))?;

    if let Some(pid) = child.id() {
        if let Ok(mut ops) = RUNNING_OPERATIONS.lock() {
            ops.insert(op_id.clone(), pid);
        }
    }

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let on_event_stdout = on_event.clone();
    let stdout_task = tokio::spawn(async move {
        if let Some(out) = stdout {
            let reader = BufReader::new(out);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = on_event_stdout.send(OpEvent::Stdout(line));
            }
        }
    });

    let on_event_stderr = on_event.clone();
    let stderr_task = tokio::spawn(async move {
        if let Some(err) = stderr {
            let reader = BufReader::new(err);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = on_event_stderr.send(OpEvent::Stderr(line));
            }
        }
    });

    let status_res = child.wait().await;
    let _ = tokio::join!(stdout_task, stderr_task);

    if let Ok(mut ops) = RUNNING_OPERATIONS.lock() {
        ops.remove(&op_id);
    }

    match status_res {
        Ok(status) => {
            let _ = on_event.send(OpEvent::Exit(status.code()));
            Ok(())
        }
        Err(e) => {
            let err_msg = format!("Process failed: {}", e);
            let _ = on_event.send(OpEvent::Error(err_msg.clone()));
            Err(err_msg)
        }
    }
}

pub async fn cancel_operation(op_id: &str) -> Result<bool, String> {
    let pid_opt = {
        if let Ok(ops) = RUNNING_OPERATIONS.lock() {
            ops.get(op_id).copied()
        } else {
            None
        }
    };

    if let Some(pid) = pid_opt {
        #[cfg(unix)]
        {
            let _ = std::process::Command::new("kill")
                .args(["-TERM", &pid.to_string()])
                .status();
        }
        #[cfg(windows)]
        {
            let _ = std::process::Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/F"])
                .status();
        }

        if let Ok(mut ops) = RUNNING_OPERATIONS.lock() {
            ops.remove(op_id);
        }
        Ok(true)
    } else {
        Ok(false)
    }
}

pub async fn search_brew(query: &str) -> Result<SearchResult, String> {
    let trimmed_query = query.trim();
    if trimmed_query.is_empty() || trimmed_query.len() > 100 {
        return Ok(SearchResult {
            formulae: Vec::new(),
            casks: Vec::new(),
        });
    }

    // Run --cask and --formula concurrently for precision and speed
    let mut cask_cmd = create_brew_command();
    cask_cmd.args(["search", "--cask", "--", trimmed_query]);

    let mut formula_cmd = create_brew_command();
    formula_cmd.args(["search", "--formula", "--", trimmed_query]);

    let (cask_res, formula_res) = tokio::join!(cask_cmd.output(), formula_cmd.output());

    let casks = match cask_res {
        Ok(output) => parse_search_output(&String::from_utf8_lossy(&output.stdout)),
        Err(_) => Vec::new(),
    };
    let formulae = match formula_res {
        Ok(output) => parse_search_output(&String::from_utf8_lossy(&output.stdout)),
        Err(_) => Vec::new(),
    };

    Ok(SearchResult { formulae, casks })
}

pub fn parse_formula_detail(val: &serde_json::Value) -> Option<PackageDetail> {
    let name = val.get("name")?.as_str()?.to_string();
    let full_name = val
        .get("full_name")
        .and_then(|v| v.as_str())
        .unwrap_or(&name)
        .to_string();
    let desc = val
        .get("desc")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let homepage = val
        .get("homepage")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let version = val
        .get("versions")
        .and_then(|v| v.get("stable"))
        .and_then(|v| v.as_str())
        .unwrap_or("latest")
        .to_string();
    let installed_arr = val.get("installed").and_then(|v| v.as_array());
    let is_installed = installed_arr.map(|a| !a.is_empty()).unwrap_or(false);
    let installed_version = installed_arr.and_then(|a| a.first()).and_then(|item| {
        item.get("version")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    });
    let outdated = val
        .get("outdated")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let deprecated = val
        .get("deprecated")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let disabled = val
        .get("disabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let license = val
        .get("license")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let dependencies = val
        .get("dependencies")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let caveats = val
        .get("caveats")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Some(PackageDetail {
        name,
        full_name,
        is_cask: false,
        desc,
        homepage,
        version,
        installed: is_installed,
        installed_version,
        outdated,
        deprecated,
        disabled,
        license,
        dependencies,
        caveats,
    })
}

pub fn parse_cask_detail(val: &serde_json::Value) -> Option<PackageDetail> {
    let token = val.get("token")?.as_str()?.to_string();
    let full_token = val
        .get("full_token")
        .and_then(|v| v.as_str())
        .unwrap_or(&token)
        .to_string();
    let desc = val
        .get("desc")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let homepage = val
        .get("homepage")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let version = val
        .get("version")
        .and_then(|v| v.as_str())
        .unwrap_or("latest")
        .to_string();
    let installed_val = val.get("installed").and_then(|v| v.as_str());
    let is_installed = installed_val.is_some();
    let installed_version = installed_val.map(|s| s.to_string());
    let outdated = val
        .get("outdated")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let deprecated = val
        .get("deprecated")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let disabled = val
        .get("disabled")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let caveats = val
        .get("caveats")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Some(PackageDetail {
        name: token,
        full_name: full_token,
        is_cask: true,
        desc,
        homepage,
        version,
        installed: is_installed,
        installed_version,
        outdated,
        deprecated,
        disabled,
        license: None,
        dependencies: Vec::new(),
        caveats,
    })
}

pub fn score_package(pkg: &PackageDetail, query_lower: &str) -> i32 {
    let name_lower = pkg.name.to_lowercase();
    if name_lower == query_lower {
        1000
    } else if name_lower.starts_with(query_lower) {
        500
    } else if name_lower.contains(query_lower) {
        250
    } else if let Some(ref desc) = pkg.desc {
        if desc.to_lowercase().contains(query_lower) {
            100
        } else {
            10
        }
    } else {
        0
    }
}

pub fn rank_package_details(details: &mut [PackageDetail], query: &str) {
    let q = query.trim().to_lowercase();
    details.sort_by(|a, b| {
        let score_a = score_package(a, &q);
        let score_b = score_package(b, &q);
        score_b.cmp(&score_a).then_with(|| a.name.cmp(&b.name))
    });
}

pub fn rank_token_names(names: &mut [String], query: &str) {
    let q = query.trim().to_lowercase();
    names.sort_by(|a, b| {
        let score_a = if a.to_lowercase() == q {
            1000
        } else if a.to_lowercase().starts_with(&q) {
            500
        } else if a.to_lowercase().contains(&q) {
            250
        } else {
            0
        };
        let score_b = if b.to_lowercase() == q {
            1000
        } else if b.to_lowercase().starts_with(&q) {
            500
        } else if b.to_lowercase().contains(&q) {
            250
        } else {
            0
        };
        score_b.cmp(&score_a).then_with(|| a.cmp(b))
    });
}

pub async fn get_package_info(name: &str, is_cask: bool) -> Result<PackageDetail, String> {
    let mut cmd = create_brew_command();
    if is_cask {
        cmd.args(["info", "--json=v2", "--cask", "--", name]);
    } else {
        cmd.args(["info", "--json=v2", "--formula", "--", name]);
    }

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run brew info: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let parsed: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse brew info JSON: {}", e))?;

    if is_cask {
        let casks = parsed.get("casks").and_then(|v| v.as_array());
        if let Some(cask) = casks.and_then(|c| c.first()) {
            if let Some(detail) = parse_cask_detail(cask) {
                return Ok(detail);
            }
        }
    } else {
        let formulae = parsed.get("formulae").and_then(|v| v.as_array());
        if let Some(formula) = formulae.and_then(|f| f.first()) {
            if let Some(detail) = parse_formula_detail(formula) {
                return Ok(detail);
            }
        }
    }

    Err(format!("Package '{}' not found", name))
}

pub async fn search_brew_rich(query: &str) -> Result<RichSearchResult, String> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(RichSearchResult {
            query: "".to_string(),
            formulae: Vec::new(),
            casks: Vec::new(),
        });
    }

    // 1. Search casks and formulae raw names concurrently
    let mut cask_cmd = create_brew_command();
    cask_cmd.args(["search", "--cask", "--", trimmed]);

    let mut formula_cmd = create_brew_command();
    formula_cmd.args(["search", "--formula", "--", trimmed]);

    let (cask_res, formula_res) = tokio::join!(cask_cmd.output(), formula_cmd.output());

    let mut raw_casks = match cask_res {
        Ok(out) => parse_search_output(&String::from_utf8_lossy(&out.stdout)),
        Err(_) => Vec::new(),
    };
    let mut raw_formulae = match formula_res {
        Ok(out) => parse_search_output(&String::from_utf8_lossy(&out.stdout)),
        Err(_) => Vec::new(),
    };

    // 2. Rank raw tokens before querying info
    rank_token_names(&mut raw_casks, trimmed);
    rank_token_names(&mut raw_formulae, trimmed);

    // Limit to top 15 each for rich metadata
    let top_casks: Vec<String> = raw_casks.into_iter().take(15).collect();
    let top_formulae: Vec<String> = raw_formulae.into_iter().take(15).collect();

    // 3. Batch query brew info --json=v2 concurrently
    let cask_info_fut = async {
        if top_casks.is_empty() {
            return Vec::new();
        }
        let mut cmd = create_brew_command();
        cmd.args(["info", "--json=v2", "--cask", "--"]);
        cmd.args(&top_casks);
        if let Ok(output) = cmd.output().await {
            if output.status.success() {
                if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&output.stdout) {
                    if let Some(arr) = val.get("casks").and_then(|v| v.as_array()) {
                        let parsed_details: Vec<PackageDetail> =
                            arr.iter().filter_map(parse_cask_detail).collect();
                        if !parsed_details.is_empty() {
                            return parsed_details;
                        }
                    }
                }
            }
        }
        // Fallback
        top_casks
            .into_iter()
            .map(|name| PackageDetail {
                name: name.clone(),
                full_name: name,
                is_cask: true,
                desc: None,
                homepage: None,
                version: "latest".to_string(),
                installed: false,
                installed_version: None,
                outdated: false,
                deprecated: false,
                disabled: false,
                license: None,
                dependencies: Vec::new(),
                caveats: None,
            })
            .collect()
    };

    let formula_info_fut = async {
        if top_formulae.is_empty() {
            return Vec::new();
        }
        let mut cmd = create_brew_command();
        cmd.args(["info", "--json=v2", "--formula", "--"]);
        cmd.args(&top_formulae);
        if let Ok(output) = cmd.output().await {
            if output.status.success() {
                if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&output.stdout) {
                    if let Some(arr) = val.get("formulae").and_then(|v| v.as_array()) {
                        let parsed_details: Vec<PackageDetail> =
                            arr.iter().filter_map(parse_formula_detail).collect();
                        if !parsed_details.is_empty() {
                            return parsed_details;
                        }
                    }
                }
            }
        }
        // Fallback
        top_formulae
            .into_iter()
            .map(|name| PackageDetail {
                name: name.clone(),
                full_name: name,
                is_cask: false,
                desc: None,
                homepage: None,
                version: "latest".to_string(),
                installed: false,
                installed_version: None,
                outdated: false,
                deprecated: false,
                disabled: false,
                license: None,
                dependencies: Vec::new(),
                caveats: None,
            })
            .collect()
    };

    let (mut casks, mut formulae) = tokio::join!(cask_info_fut, formula_info_fut);

    // 4. Rank details by relevance
    rank_package_details(&mut casks, trimmed);
    rank_package_details(&mut formulae, trimmed);

    Ok(RichSearchResult {
        query: trimmed.to_string(),
        formulae,
        casks,
    })
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

pub fn parse_search_output(stdout: &str) -> Vec<String> {
    let mut items = Vec::new();
    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty()
            || trimmed.starts_with("==>")
            || trimmed.starts_with("Error:")
            || trimmed.starts_with("Warning:")
        {
            continue;
        }
        for token in trimmed.split_whitespace() {
            if (token.starts_with('(') && token.ends_with(')')) || token == "✔" {
                continue;
            }
            items.push(token.to_string());
        }
    }
    items
}

pub fn is_valid_cask_token(token: &str) -> bool {
    if token.is_empty() || token.len() > 128 {
        return false;
    }
    let first = match token.chars().next() {
        Some(c) => c,
        None => return false,
    };
    if !first.is_ascii_lowercase() && !first.is_ascii_digit() {
        return false;
    }
    token.chars().all(|c| {
        c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '@' || c == '.' || c == '+'
    })
}

#[derive(Debug, Clone)]
struct CaskCatalogItem {
    token: String,
    name: String,
    version: String,
    desc: Option<String>,
    homepage: Option<String>,
    app_artifacts: Vec<String>,
    bundle_ids: Vec<String>,
    auto_updates: bool,
}

static CASK_CATALOG_CACHE: RwLock<Option<(std::time::Instant, Vec<CaskCatalogItem>)>> =
    RwLock::new(None);

fn load_cask_catalog() -> Vec<CaskCatalogItem> {
    // 1. Check in-memory cache (10 minute TTL)
    if let Ok(guard) = CASK_CATALOG_CACHE.read() {
        if let Some((instant, ref items)) = *guard {
            if instant.elapsed().as_secs() < 600 && !items.is_empty() {
                return items.clone();
            }
        }
    }

    let mut items = Vec::new();

    // 2. Check Homebrew internal payload if present (fast path when API cache exists)
    if let Ok(home) = std::env::var("HOME") {
        let api_internal = PathBuf::from(&home).join("Library/Caches/Homebrew/api/internal");
        if api_internal.exists() {
            if let Ok(entries) = std::fs::read_dir(&api_internal) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let name = path.file_name().unwrap_or_default().to_string_lossy();
                    if name.starts_with("packages.") && name.ends_with(".payload") {
                        if let Ok(content) = std::fs::read_to_string(&path) {
                            for line in content.lines() {
                                if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
                                    if let Some(casks_map) =
                                        val.get("casks").and_then(|c| c.as_object())
                                    {
                                        for (token, obj) in casks_map {
                                            let name = obj
                                                .get("names")
                                                .and_then(|n| n.as_array())
                                                .and_then(|arr| arr.first())
                                                .and_then(|v| v.as_str())
                                                .unwrap_or(token)
                                                .to_string();
                                            let version = obj
                                                .get("version")
                                                .and_then(|v| v.as_str())
                                                .unwrap_or("latest")
                                                .to_string();
                                            let desc = obj
                                                .get("desc")
                                                .and_then(|v| v.as_str())
                                                .map(|s| s.to_string());
                                            let homepage = obj
                                                .get("homepage")
                                                .and_then(|v| v.as_str())
                                                .map(|s| s.to_string());
                                            let auto_updates = obj
                                                .get("auto_updates")
                                                .and_then(|v| v.as_bool())
                                                .unwrap_or(false);

                                            let mut app_artifacts = Vec::new();
                                            let mut bundle_ids = Vec::new();

                                            if let Some(artifacts) =
                                                obj.get("raw_artifacts").and_then(|a| a.as_array())
                                            {
                                                for art in artifacts {
                                                    if let Some(pair) = art.as_array() {
                                                        let kind =
                                                            pair.first().and_then(|v| v.as_str());
                                                        if kind == Some(":app") {
                                                            if let Some(app_list) = pair
                                                                .get(1)
                                                                .and_then(|v| v.as_array())
                                                            {
                                                                for app_val in app_list {
                                                                    if let Some(app_str) =
                                                                        app_val.as_str()
                                                                    {
                                                                        app_artifacts.push(
                                                                            app_str.to_string(),
                                                                        );
                                                                    }
                                                                }
                                                            }
                                                        } else if kind == Some(":uninstall")
                                                            || kind == Some(":zap")
                                                        {
                                                            let s = format!("{:?}", pair.get(1));
                                                            for part in s.split('"') {
                                                                if part.contains('.')
                                                                    && !part.starts_with('/')
                                                                    && !part.contains(' ')
                                                                    && part.len() < 80
                                                                {
                                                                    bundle_ids
                                                                        .push(part.to_string());
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            items.push(CaskCatalogItem {
                                                token: token.clone(),
                                                name,
                                                version,
                                                desc,
                                                homepage,
                                                app_artifacts,
                                                bundle_ids,
                                                auto_updates,
                                            });
                                        }
                                        if !items.is_empty() {
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if !items.is_empty() {
                        break;
                    }
                }
            }
        }
    }

    // 3. Fallback: check or download official cask.json from formulae.brew.sh
    if items.is_empty() {
        let cache_dir = if let Ok(home) = std::env::var("HOME") {
            PathBuf::from(home).join("Library/Caches/brew-hub")
        } else {
            std::env::temp_dir().join("brew-hub")
        };
        let _ = std::fs::create_dir_all(&cache_dir);
        let brew_hub_cask_file = cache_dir.join("cask.json");

        let should_fetch = if !brew_hub_cask_file.exists() {
            true
        } else if let Ok(meta) = std::fs::metadata(&brew_hub_cask_file) {
            if let Ok(mtime) = meta.modified() {
                mtime
                    .elapsed()
                    .map(|d| d.as_secs() > 86400)
                    .unwrap_or(false)
            } else {
                false
            }
        } else {
            false
        };

        if should_fetch {
            let _ = std::process::Command::new("curl")
                .args([
                    "-s",
                    "-f",
                    "--compressed",
                    "-m",
                    "5",
                    "https://formulae.brew.sh/api/cask.json",
                    "-o",
                ])
                .arg(&brew_hub_cask_file)
                .status();
        }

        let mut fallback_paths = vec![
            brew_hub_cask_file,
            PathBuf::from("/tmp/cask.json"),
            std::env::temp_dir().join("brew-hub").join("cask.json"),
        ];
        if let Ok(home) = std::env::var("HOME") {
            fallback_paths.push(PathBuf::from(home).join("Library/Caches/Homebrew/api/cask.json"));
        }

        for p in &fallback_paths {
            if p.exists() {
                if let Ok(file) = std::fs::File::open(p) {
                    if let Ok(casks_arr) =
                        serde_json::from_reader::<_, Vec<serde_json::Value>>(file)
                    {
                        for obj in casks_arr {
                            if let Some(token) = obj.get("token").and_then(|v| v.as_str()) {
                                let name = obj
                                    .get("name")
                                    .and_then(|n| n.as_array())
                                    .and_then(|arr| arr.first())
                                    .and_then(|v| v.as_str())
                                    .unwrap_or(token)
                                    .to_string();
                                let version = obj
                                    .get("version")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("latest")
                                    .to_string();
                                let desc = obj
                                    .get("desc")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string());
                                let homepage = obj
                                    .get("homepage")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string());
                                let auto_updates = obj
                                    .get("auto_updates")
                                    .and_then(|v| v.as_bool())
                                    .unwrap_or(false);

                                let mut app_artifacts = Vec::new();
                                let mut bundle_ids = Vec::new();

                                if let Some(artifacts) =
                                    obj.get("artifacts").and_then(|a| a.as_array())
                                {
                                    for art in artifacts {
                                        if let Some(art_obj) = art.as_object() {
                                            if let Some(app_list) =
                                                art_obj.get("app").and_then(|v| v.as_array())
                                            {
                                                for app_val in app_list {
                                                    if let Some(app_str) = app_val.as_str() {
                                                        app_artifacts.push(app_str.to_string());
                                                    }
                                                }
                                            }
                                            if let Some(uninstall_list) =
                                                art_obj.get("uninstall").and_then(|v| v.as_array())
                                            {
                                                for u in uninstall_list {
                                                    if let Some(quit_arr) =
                                                        u.get("quit").and_then(|q| q.as_array())
                                                    {
                                                        for q in quit_arr {
                                                            if let Some(qs) = q.as_str() {
                                                                bundle_ids.push(qs.to_string());
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                items.push(CaskCatalogItem {
                                    token: token.to_string(),
                                    name,
                                    version,
                                    desc,
                                    homepage,
                                    app_artifacts,
                                    bundle_ids,
                                    auto_updates,
                                });
                            }
                        }
                        if !items.is_empty() {
                            break;
                        }
                    }
                }
            }
        }
    }

    // 4. Fallback: check cask_names.txt if present
    if items.is_empty() {
        if let Ok(home) = std::env::var("HOME") {
            let names_file = PathBuf::from(home).join("Library/Caches/Homebrew/api/cask_names.txt");
            if names_file.exists() {
                if let Ok(txt) = std::fs::read_to_string(&names_file) {
                    for line in txt.lines() {
                        let token = line.trim();
                        if !token.is_empty() {
                            items.push(CaskCatalogItem {
                                token: token.to_string(),
                                name: token.to_string(),
                                version: "latest".to_string(),
                                desc: None,
                                homepage: None,
                                app_artifacts: vec![format!("{}.app", token)],
                                bundle_ids: Vec::new(),
                                auto_updates: false,
                            });
                        }
                    }
                }
            }
        }
    }

    // Store in cache
    if let Ok(mut guard) = CASK_CATALOG_CACHE.write() {
        *guard = Some((std::time::Instant::now(), items.clone()));
    }

    items
}

fn collect_app_paths(search_dirs: &[PathBuf], max_depth: usize) -> Vec<PathBuf> {
    let mut app_paths = Vec::new();
    let mut queue: Vec<(PathBuf, usize)> = search_dirs.iter().map(|d| (d.clone(), 0)).collect();

    while let Some((dir, depth)) = queue.pop() {
        let entries = match std::fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            let file_name = path.file_name().unwrap_or_default().to_string_lossy();
            if file_name.starts_with('.') {
                continue;
            }

            if path.is_dir() {
                if path.extension().and_then(|ext| ext.to_str()) == Some("app") {
                    app_paths.push(path);
                } else if depth < max_depth {
                    queue.push((path, depth + 1));
                }
            }
        }
    }

    app_paths
}

fn scan_unmanaged_apps_sync(
    installed_cask_tokens: std::collections::HashSet<String>,
) -> Result<Vec<UnmanagedApp>, String> {
    let catalog = load_cask_catalog();
    if catalog.is_empty() {
        return Err("Unable to load Homebrew cask catalog. Please check your network connection or run 'brew update' to populate the local cache.".to_string());
    }

    let mut artifact_map: std::collections::HashMap<String, &CaskCatalogItem> =
        std::collections::HashMap::new();
    let mut token_map: std::collections::HashMap<String, &CaskCatalogItem> =
        std::collections::HashMap::new();
    let mut bundle_id_map: std::collections::HashMap<String, &CaskCatalogItem> =
        std::collections::HashMap::new();

    for item in &catalog {
        token_map.insert(item.token.to_lowercase(), item);
        for art in &item.app_artifacts {
            artifact_map.insert(art.to_lowercase(), item);
        }
        artifact_map.insert(format!("{}.app", item.token.to_lowercase()), item);
        for bid in &item.bundle_ids {
            bundle_id_map.insert(bid.to_lowercase(), item);
        }
    }

    let mut search_dirs = vec![PathBuf::from("/Applications")];
    if let Ok(home) = std::env::var("HOME") {
        let user_apps = PathBuf::from(home).join("Applications");
        if user_apps.exists() {
            search_dirs.push(user_apps);
        }
    }

    let app_paths = collect_app_paths(&search_dirs, 2);
    let mut detected = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();

    for path in app_paths {
        let path_str = path.to_string_lossy().to_string();
        if seen_paths.contains(&path_str) {
            continue;
        }
        seen_paths.insert(path_str.clone());

        let app_filename = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let app_filename_lower = app_filename.to_lowercase();

        // Skip self app
        if app_filename_lower == "brew-hub.app" {
            continue;
        }

        // Inspect Contents/Info.plist
        let plist_path = path.join("Contents/Info.plist");
        let mut bundle_id: Option<String> = None;
        let mut app_name = app_filename.trim_end_matches(".app").to_string();
        let mut installed_version: Option<String> = None;

        if plist_path.exists() {
            if let Ok(plist_val) = plist::Value::from_file(&plist_path) {
                if let Some(dict) = plist_val.as_dictionary() {
                    if let Some(bid) = dict.get("CFBundleIdentifier").and_then(|v| v.as_string()) {
                        // Skip Apple system apps based on bundle ID
                        if bid.starts_with("com.apple.") {
                            continue;
                        }
                        bundle_id = Some(bid.to_string());
                    }
                    if let Some(n) = dict
                        .get("CFBundleName")
                        .or_else(|| dict.get("CFBundleDisplayName"))
                        .and_then(|v| v.as_string())
                    {
                        if !n.trim().is_empty() {
                            app_name = n.to_string();
                        }
                    }
                    if let Some(v) = dict
                        .get("CFBundleShortVersionString")
                        .or_else(|| dict.get("CFBundleVersion"))
                        .and_then(|v| v.as_string())
                    {
                        installed_version = Some(v.to_string());
                    }
                }
            }
        }

        // Match against cask catalog with confidence level
        let mut matched_cask: Option<&CaskCatalogItem> = None;
        let mut match_confidence: Option<&str> = None;

        // 1. Artifact match (highest confidence)
        if let Some(c) = artifact_map.get(&app_filename_lower) {
            matched_cask = Some(c);
            match_confidence = Some("artifact");
        }
        // 2. Bundle ID match
        else if let Some(ref bid) = bundle_id {
            if let Some(c) = bundle_id_map.get(&bid.to_lowercase()) {
                matched_cask = Some(c);
                match_confidence = Some("bundle_id");
            }
        }

        // 3. Token match
        if matched_cask.is_none() {
            let token_slug = app_name.to_lowercase().replace([' ', '_'], "-");
            if let Some(c) = token_map.get(&token_slug) {
                matched_cask = Some(c);
                match_confidence = Some("token");
            } else {
                let sanitized = app_filename_lower
                    .trim_end_matches(".app")
                    .replace(' ', "-");
                if let Some(c) = token_map.get(&sanitized) {
                    matched_cask = Some(c);
                    match_confidence = Some("token");
                }
            }
        }

        if let Some(cask) = matched_cask {
            if installed_cask_tokens.contains(&cask.token.to_lowercase()) {
                continue;
            }

            detected.push(UnmanagedApp {
                name: app_name,
                path: path_str,
                bundle_id,
                installed_version,
                cask_token: cask.token.clone(),
                cask_name: cask.name.clone(),
                cask_version: cask.version.clone(),
                cask_desc: cask.desc.clone(),
                cask_homepage: cask.homepage.clone(),
                auto_updates: cask.auto_updates,
                match_confidence: match_confidence.map(|s| s.to_string()),
            });
        }
    }

    detected.sort_by_key(|a| a.name.to_lowercase());
    Ok(detected)
}

pub async fn scan_unmanaged_apps() -> Result<Vec<UnmanagedApp>, String> {
    let installed_val = get_installed_json()
        .await
        .map_err(|e| format!("Failed to retrieve installed casks: {}", e))?;

    let mut installed_cask_tokens = std::collections::HashSet::new();
    if let Some(casks) = installed_val.get("casks").and_then(|c| c.as_array()) {
        for cask in casks {
            if let Some(token) = cask.get("token").and_then(|t| t.as_str()) {
                installed_cask_tokens.insert(token.to_lowercase());
            }
        }
    }

    let result =
        tokio::task::spawn_blocking(move || scan_unmanaged_apps_sync(installed_cask_tokens))
            .await
            .map_err(|e| format!("Worker task failed: {}", e))??;

    Ok(result)
}

pub async fn adopt_cask_package(token: &str) -> Result<CommandOutput, String> {
    let _lock = BREW_MUTATION_LOCK.lock().await;

    let trimmed = token.trim();
    if !is_valid_cask_token(trimmed) {
        return Err(format!(
            "Invalid cask token '{}': token must be a standard Homebrew cask identifier without slashes or special characters",
            token
        ));
    }

    let mut cmd = create_brew_command();
    cmd.args(["install", "--cask", "--adopt", "--", trimmed]);

    let output = cmd.output().await.map_err(|e| {
        format!(
            "Failed to execute brew install --cask --adopt {}: {}",
            trimmed, e
        )
    })?;

    Ok(CommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

pub async fn get_brewfile_content(path: Option<String>) -> Result<BrewfileData, String> {
    if let Some(custom_path) = path.filter(|s| !s.trim().is_empty()) {
        let p = PathBuf::from(&custom_path);
        validate_brewfile_path(&p)?;
        if p.exists() {
            let content = std::fs::read_to_string(&p)
                .map_err(|e| format!("Failed to read Brewfile at {}: {}", custom_path, e))?;
            return Ok(BrewfileData {
                path: custom_path,
                content,
                source: "file".to_string(),
            });
        } else {
            return Err(format!("Brewfile at {} does not exist", custom_path));
        }
    }

    if let Ok(home) = std::env::var("HOME") {
        let standard_paths = [
            PathBuf::from(&home).join(".Brewfile"),
            PathBuf::from(&home).join(".config/homebrew/Brewfile"),
        ];
        for sp in &standard_paths {
            if sp.exists() {
                if let Ok(content) = std::fs::read_to_string(sp) {
                    return Ok(BrewfileData {
                        path: sp.to_string_lossy().to_string(),
                        content,
                        source: "file".to_string(),
                    });
                }
            }
        }
    }

    let mut cmd = create_brew_command();
    cmd.args(["bundle", "dump", "--file=-", "--force"]);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run brew bundle dump: {}", e))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let default_save_path = std::env::var("HOME")
        .map(|h| {
            PathBuf::from(h)
                .join(".Brewfile")
                .to_string_lossy()
                .to_string()
        })
        .unwrap_or_else(|_| "~/.Brewfile".to_string());

    Ok(BrewfileData {
        path: default_save_path,
        content: String::from_utf8_lossy(&output.stdout).to_string(),
        source: "dump".to_string(),
    })
}

pub async fn save_brewfile(content: String, path: Option<String>) -> Result<String, String> {
    let target_path = if let Some(p) = path.filter(|s| !s.trim().is_empty()) {
        let pb = PathBuf::from(p);
        validate_brewfile_path(&pb)?;
        pb
    } else {
        let home =
            std::env::var("HOME").map_err(|_| "HOME environment variable not set".to_string())?;
        let pb = PathBuf::from(home).join(".Brewfile");
        validate_brewfile_path(&pb)?;
        pb
    };

    if let Some(parent) = target_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    std::fs::write(&target_path, content).map_err(|e| {
        format!(
            "Failed to write Brewfile to {}: {}",
            target_path.display(),
            e
        )
    })?;

    Ok(target_path.to_string_lossy().to_string())
}

pub async fn check_brewfile(
    path: Option<String>,
    content: Option<String>,
) -> Result<BrewfileCheckResult, String> {
    let (check_file_path, is_temp) = if let Some(text) = content {
        let temp_dir = std::env::temp_dir().join("brew-hub");
        let _ = std::fs::create_dir_all(&temp_dir);
        let temp_file = temp_dir.join(format!("Brewfile.check.{}", std::process::id()));
        std::fs::write(&temp_file, text)
            .map_err(|e| format!("Failed to write temporary check Brewfile: {}", e))?;
        (temp_file, true)
    } else if let Some(p) = path.filter(|s| !s.trim().is_empty()) {
        let custom_p = PathBuf::from(p);
        validate_brewfile_path(&custom_p)?;
        (custom_p, false)
    } else {
        let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
        let default_p = PathBuf::from(home).join(".Brewfile");
        validate_brewfile_path(&default_p)?;
        (default_p, false)
    };

    let mut cmd = create_brew_command();
    cmd.args([
        "bundle",
        "check",
        &format!("--file={}", check_file_path.display()),
        "--verbose",
        "--no-upgrade",
    ]);

    let output_res = cmd.output().await;

    if is_temp {
        let _ = std::fs::remove_file(&check_file_path);
    }

    let output = output_res.map_err(|e| format!("Failed to run brew bundle check: {}", e))?;

    let stdout_str = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr_str = String::from_utf8_lossy(&output.stderr).to_string();
    let combined = format!("{}\n{}", stdout_str, stderr_str);

    let satisfied =
        output.status.success() || combined.contains("The Brewfile's dependencies are satisfied.");
    let mut missing_items = Vec::new();

    for line in combined.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('→') {
            missing_items.push(trimmed.trim_start_matches('→').trim().to_string());
        }
    }

    Ok(BrewfileCheckResult {
        satisfied,
        missing_count: missing_items.len(),
        missing_items,
        raw_output: combined,
    })
}

pub async fn install_brewfile(
    path: Option<String>,
    content: Option<String>,
    no_upgrade: bool,
) -> Result<CommandOutput, String> {
    let _lock = BREW_MUTATION_LOCK.lock().await;
    let (install_file_path, is_temp) = if let Some(text) = content {
        let temp_dir = std::env::temp_dir().join("brew-hub");
        let _ = std::fs::create_dir_all(&temp_dir);
        let temp_file = temp_dir.join(format!("Brewfile.install.{}", std::process::id()));
        std::fs::write(&temp_file, text)
            .map_err(|e| format!("Failed to write temporary install Brewfile: {}", e))?;
        (temp_file, true)
    } else if let Some(p) = path.filter(|s| !s.trim().is_empty()) {
        let custom_p = PathBuf::from(p);
        validate_brewfile_path(&custom_p)?;
        (custom_p, false)
    } else {
        let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
        let default_p = PathBuf::from(home).join(".Brewfile");
        validate_brewfile_path(&default_p)?;
        (default_p, false)
    };

    let mut cmd = create_brew_command();
    let mut args = vec![
        "bundle".to_string(),
        "install".to_string(),
        format!("--file={}", install_file_path.display()),
        "--verbose".to_string(),
    ];
    if no_upgrade {
        args.push("--no-upgrade".to_string());
    }
    cmd.args(&args);

    let output_res = cmd.output().await;

    if is_temp {
        let _ = std::fs::remove_file(&install_file_path);
    }

    let output = output_res.map_err(|e| format!("Failed to execute brew bundle install: {}", e))?;

    Ok(CommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

pub async fn export_brewfile_to_path(target_path: &str) -> Result<CommandOutput, String> {
    let target = PathBuf::from(target_path);
    validate_brewfile_path(&target)?;

    let mut cmd = create_brew_command();
    cmd.args([
        "bundle",
        "dump",
        &format!("--file={}", target_path),
        "--force",
    ]);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to export Brewfile to {}: {}", target_path, e))?;

    Ok(CommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_search_output() {
        let sample = "firefoxpwa\nfirefly (deprecated)\nfirefox ✔\n";
        let parsed = parse_search_output(sample);
        assert_eq!(parsed, vec!["firefoxpwa", "firefly", "firefox"]);
    }

    #[test]
    fn test_parse_search_output_empty_and_noise() {
        let sample = "\n  \n==> Formulae\ngit  git-lfs\n==> Casks\ngitkraken\nError: No formulae found\nWarning: Something\n";
        let parsed = parse_search_output(sample);
        assert_eq!(parsed, vec!["git", "git-lfs", "gitkraken"]);
    }

    #[tokio::test]
    #[ignore = "requires live Homebrew installation and network"]
    async fn test_search_brew_nonexistent_package() {
        let result = search_brew("nonexistentpackage123456789xyz").await;
        assert!(result.is_ok());
        let search_res = result.unwrap();
        assert!(search_res.formulae.is_empty());
        assert!(search_res.casks.is_empty());
    }

    #[tokio::test]
    #[ignore = "requires live Homebrew installation and network"]
    async fn test_search_brew_existing_package() {
        let result = search_brew("git").await;
        assert!(result.is_ok());
        let search_res = result.unwrap();
        assert!(search_res.formulae.contains(&"git".to_string()));
    }

    #[test]
    fn test_get_or_create_askpass_script() {
        let script = get_or_create_askpass_script();
        #[cfg(target_os = "macos")]
        {
            assert!(script.is_some());
            let path = script.unwrap();
            assert!(path.exists());
            assert!(path.ends_with("brew-hub-askpass.sh"));

            let content = std::fs::read_to_string(&path).unwrap();
            // Verify System Events was removed to avoid TCC prompt issues
            assert!(!content.contains("System Events"));
            assert!(content.contains("display dialog"));

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let metadata = std::fs::metadata(&path).unwrap();
                let mode = metadata.permissions().mode();
                // Strict 0o700 permission: readable/writable/executable by user only
                assert_eq!(mode & 0o777, 0o700);
            }
        }
        #[cfg(not(target_os = "macos"))]
        {
            assert!(script.is_none());
        }
    }

    #[test]
    fn test_is_valid_package_name() {
        // Valid package and cask names
        assert!(is_valid_package_name("git"));
        assert!(is_valid_package_name("node@20"));
        assert!(is_valid_package_name("visual-studio-code"));
        assert!(is_valid_package_name("homebrew/cask/docker"));
        assert!(is_valid_package_name("gcc+lib"));
        assert!(is_valid_package_name("openssl@3.0"));

        // Invalid: flag injections
        assert!(!is_valid_package_name("-v"));
        assert!(!is_valid_package_name("--force"));
        assert!(!is_valid_package_name("--zap"));
        assert!(!is_valid_package_name("-f"));

        // Invalid: metacharacters, spaces, empty
        assert!(!is_valid_package_name(""));
        assert!(!is_valid_package_name("   "));
        assert!(!is_valid_package_name("pkg; rm -rf /"));
        assert!(!is_valid_package_name("pkg && echo 1"));
        assert!(!is_valid_package_name("pkg`whoami`"));
        assert!(!is_valid_package_name("pkg$var"));
        assert!(!is_valid_package_name("pkg name with space"));
    }

    #[test]
    fn test_validate_brewfile_path() {
        // Valid paths
        assert!(validate_brewfile_path(Path::new("/tmp/Brewfile")).is_ok());
        assert!(validate_brewfile_path(Path::new("/tmp/my.brewfile")).is_ok());
        assert!(validate_brewfile_path(Path::new("/tmp/Brewfile.rb")).is_ok());
        assert!(validate_brewfile_path(Path::new("/tmp/packages.txt")).is_ok());

        // Invalid filenames
        assert!(validate_brewfile_path(Path::new("/tmp/script.sh")).is_err());
        assert!(validate_brewfile_path(Path::new("/tmp/exploit.py")).is_err());

        // Invalid: system paths
        assert!(validate_brewfile_path(Path::new("/etc/Brewfile")).is_err());
        assert!(validate_brewfile_path(Path::new("/bin/Brewfile")).is_err());
        assert!(validate_brewfile_path(Path::new("/Applications/Brewfile")).is_err());

        // Invalid: sensitive user directories
        if let Ok(home) = std::env::var("HOME") {
            let ssh_path = PathBuf::from(&home).join(".ssh/Brewfile");
            assert!(validate_brewfile_path(&ssh_path).is_err());
            let zshrc_path = PathBuf::from(&home).join(".zshrc");
            assert!(validate_brewfile_path(&zshrc_path).is_err());
        }
    }

    #[tokio::test]
    async fn test_package_operation_rejects_flag_injection() {
        let res = package_operation("install", "--force", false, false).await;
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Invalid package name"));

        let res2 = package_operation("unauthorized_op", "git", false, false).await;
        assert!(res2.is_err());
        assert!(res2.unwrap_err().contains("Invalid package operation"));
    }

    #[tokio::test]
    async fn test_manage_service_action_security() {
        let res = manage_service_action("--all", "start", false).await;
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Invalid service name"));

        let res2 = manage_service_action("redis", "restart; rm -rf /", false).await;
        assert!(res2.is_err());
        assert!(res2.unwrap_err().contains("Invalid service action"));
    }

    #[tokio::test]
    async fn test_adopt_cask_package_security() {
        let res = adopt_cask_package("--zap").await;
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Invalid cask token"));
    }

    #[test]
    fn test_create_brew_command_askpass_env() {
        let cmd = create_brew_command();
        #[cfg(target_os = "macos")]
        {
            let envs: std::collections::HashMap<_, _> = cmd
                .as_std()
                .get_envs()
                .filter_map(|(k, v)| v.map(|val| (k.to_os_string(), val.to_os_string())))
                .collect();
            assert!(envs.contains_key(std::ffi::OsStr::new("SUDO_ASKPASS")));
            let sudo_askpass = envs.get(std::ffi::OsStr::new("SUDO_ASKPASS")).unwrap();
            let askpass_path = PathBuf::from(sudo_askpass);
            assert!(askpass_path.exists());
            assert!(askpass_path.ends_with("brew-hub-askpass.sh"));
        }
    }

    #[test]
    fn test_brewfile_check_parsing_satisfied() {
        let sample = "The Brewfile's dependencies are satisfied.\n";
        let satisfied = sample.contains("The Brewfile's dependencies are satisfied.");
        assert!(satisfied);
    }

    #[test]
    fn test_brewfile_check_parsing_missing() {
        let sample = "brew bundle can't satisfy your Brewfile's dependencies.\n→ Cask iterm2 needs to be installed.\n→ Formula cowsay needs to be installed.\n";
        let mut missing_items = Vec::new();
        for line in sample.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with('→') {
                missing_items.push(trimmed.trim_start_matches('→').trim().to_string());
            }
        }
        assert_eq!(missing_items.len(), 2);
        assert_eq!(missing_items[0], "Cask iterm2 needs to be installed.");
        assert_eq!(missing_items[1], "Formula cowsay needs to be installed.");
    }

    #[test]
    fn test_collect_app_paths_depth_limit() {
        let temp_dir =
            std::env::temp_dir().join(format!("brew_hub_app_scan_test_{}", std::process::id()));
        let _ = std::fs::create_dir_all(&temp_dir);
        let nested_app = temp_dir
            .join("SubFolder")
            .join("Utilities")
            .join("DeepApp.app");
        let _ = std::fs::create_dir_all(&nested_app);
        let top_app = temp_dir.join("TopApp.app");
        let _ = std::fs::create_dir_all(&top_app);

        let paths_depth_0 = collect_app_paths(&[temp_dir.clone()], 0);
        assert!(paths_depth_0.iter().any(|p| p == &top_app));
        assert!(!paths_depth_0.iter().any(|p| p == &nested_app));

        let paths_depth_2 = collect_app_paths(&[temp_dir.clone()], 2);
        assert!(paths_depth_2.iter().any(|p| p == &top_app));
        assert!(paths_depth_2.iter().any(|p| p == &nested_app));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_cask_catalog_cache_ttl() {
        // Clear cache
        if let Ok(mut guard) = CASK_CATALOG_CACHE.write() {
            *guard = Some((
                std::time::Instant::now(),
                vec![CaskCatalogItem {
                    token: "mock-cask".to_string(),
                    name: "Mock App".to_string(),
                    version: "1.0.0".to_string(),
                    desc: Some("Mock Description".to_string()),
                    homepage: None,
                    app_artifacts: vec!["Mock App.app".to_string()],
                    bundle_ids: vec!["com.mock.app".to_string()],
                    auto_updates: false,
                }],
            ));
        }

        let catalog = load_cask_catalog();
        assert_eq!(catalog.len(), 1);
        assert_eq!(catalog[0].token, "mock-cask");
    }

    #[tokio::test]
    #[ignore = "requires live Homebrew installation and local applications"]
    async fn test_scan_unmanaged_apps_runnable() {
        let res = scan_unmanaged_apps().await;
        assert!(res.is_ok());
        let apps = res.unwrap();
        // Verifies structure without crashing on local environment
        for app in apps {
            assert!(!app.cask_token.is_empty());
            assert!(!app.name.is_empty());
        }
    }

    #[test]
    fn test_is_valid_cask_token() {
        assert!(is_valid_cask_token("google-chrome"));
        assert!(is_valid_cask_token("visual-studio-code"));
        assert!(is_valid_cask_token("slack"));
        assert!(is_valid_cask_token("1password"));
        assert!(is_valid_cask_token("dotnet@8"));
        assert!(is_valid_cask_token("font-fira-code"));

        // Reject malicious tokens / tap injection / path traversal
        assert!(!is_valid_cask_token("evil/tap/slack"));
        assert!(!is_valid_cask_token("../../etc/passwd"));
        assert!(!is_valid_cask_token("cask; rm -rf /"));
        assert!(!is_valid_cask_token("-invalid-start"));
        assert!(!is_valid_cask_token("UPPERCASE"));
        assert!(!is_valid_cask_token("has space"));
        assert!(!is_valid_cask_token(""));
    }

    #[tokio::test]
    async fn test_adopt_cask_package_rejects_malicious_tokens() {
        let res = adopt_cask_package("evil/tap/malicious").await;
        assert!(res.is_err());
        let err = res.unwrap_err();
        assert!(err.contains("Invalid cask token"));
    }

    #[tokio::test]
    async fn test_brew_mutation_lock_mutual_exclusion() {
        use std::sync::atomic::{AtomicBool, Ordering};
        use std::sync::Arc;

        let inside_critical_section = Arc::new(AtomicBool::new(false));
        let flag1 = inside_critical_section.clone();
        let flag2 = inside_critical_section.clone();

        let t1 = tokio::spawn(async move {
            let _lock = BREW_MUTATION_LOCK.lock().await;
            assert!(
                !flag1.swap(true, Ordering::SeqCst),
                "Critical section was breached"
            );
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
            flag1.store(false, Ordering::SeqCst);
        });

        let t2 = tokio::spawn(async move {
            let _lock = BREW_MUTATION_LOCK.lock().await;
            assert!(
                !flag2.swap(true, Ordering::SeqCst),
                "Critical section was breached"
            );
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
            flag2.store(false, Ordering::SeqCst);
        });

        let (r1, r2) = tokio::join!(t1, t2);
        assert!(r1.is_ok());
        assert!(r2.is_ok());
    }
    #[tokio::test]
    async fn test_update_brew_index_runnable() {
        let res = update_brew_index().await;
        assert!(
            res.is_ok(),
            "Expected update_brew_index to succeed: {:?}",
            res.err()
        );
    }

    #[test]
    fn test_is_valid_service_name() {
        assert!(is_valid_service_name("nginx"));
        assert!(is_valid_service_name("postgresql@16"));
        assert!(is_valid_service_name("redis-server"));
        assert!(is_valid_service_name("homebrew.mxcl.nginx"));
        assert!(!is_valid_service_name("nginx; rm -rf /"));
        assert!(!is_valid_service_name(""));
        assert!(!is_valid_service_name("has space"));
    }

    #[tokio::test]
    async fn test_manage_service_action_rejects_invalid_action() {
        let res = manage_service_action("nginx", "destroy", false).await;
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Invalid service action"));
    }

    #[tokio::test]
    async fn test_manage_service_action_rejects_malicious_name() {
        let res = manage_service_action("nginx; rm -rf /", "start", false).await;
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Invalid service name"));
    }

    #[test]
    fn test_parse_size_str() {
        assert_eq!(parse_size_str("1B"), Some(1));
        assert_eq!(parse_size_str("1.1KB"), Some(1126));
        assert_eq!(parse_size_str("10MB"), Some(10 * 1024 * 1024));
        assert_eq!(parse_size_str("2GB"), Some(2 * 1024 * 1024 * 1024));
        assert_eq!(parse_size_str("invalid"), None);
        assert_eq!(parse_size_str(""), None);
    }

    #[test]
    fn test_format_bytes() {
        assert_eq!(format_bytes(0), "0 B");
        assert_eq!(format_bytes(512), "512 B");
        assert_eq!(format_bytes(1024), "1.0 KB");
        assert_eq!(format_bytes(1024 * 1024), "1.0 MB");
        assert_eq!(format_bytes(1024 * 1024 * 1024), "1.0 GB");
    }

    #[test]
    fn test_parse_cleanup_output_standard() {
        let sample = "\
Would remove: /Users/test/Library/Caches/Homebrew/external_commands_list.txt (1B)
Would remove: /Users/test/Library/Caches/Homebrew/all_commands_list.txt (1.1KB)
==> This operation would free approximately 1.1KB of disk space.
";
        let preview = parse_cleanup_output(sample);
        assert_eq!(preview.items.len(), 2);
        assert_eq!(
            preview.items[0].path,
            "/Users/test/Library/Caches/Homebrew/external_commands_list.txt"
        );
        assert_eq!(preview.items[0].size.as_deref(), Some("1B"));
        assert_eq!(preview.total_space, "1.1KB");
    }

    #[test]
    fn test_parse_cleanup_output_fallback_when_summary_missing() {
        let sample = "\
Would remove: /Users/test/Library/Caches/Homebrew/pkg1.tar.gz (10MB)
Would remove: /Users/test/Library/Caches/Homebrew/pkg2.tar.gz (20MB)
";
        let preview = parse_cleanup_output(sample);
        assert_eq!(preview.items.len(), 2);
        assert_eq!(preview.total_space, "30.0 MB");
    }

    #[test]
    fn test_parse_autoremove_output_empty() {
        let sample = "";
        let formulae = parse_autoremove_output(sample);
        assert!(formulae.is_empty());
    }

    #[test]
    fn test_parse_autoremove_output_with_formulae() {
        let sample = "\
==> Would autoremove 2 unneeded formulae:
libyaml
openssl@1.1
";
        let formulae = parse_autoremove_output(sample);
        assert_eq!(
            formulae,
            vec!["libyaml".to_string(), "openssl@1.1".to_string()]
        );
    }

    #[tokio::test]
    async fn test_brewfile_save_and_read_custom_path() {
        let temp_dir = std::env::temp_dir().join("brew-hub-test");
        let _ = std::fs::create_dir_all(&temp_dir);
        let test_file = temp_dir.join(format!("Brewfile.test.{}", std::process::id()));
        let test_path = test_file.to_string_lossy().to_string();

        let sample_content = "tap \"homebrew/core\"\nbrew \"curl\"\n";
        let save_res = save_brewfile(sample_content.to_string(), Some(test_path.clone())).await;
        assert!(save_res.is_ok());

        let read_res = get_brewfile_content(Some(test_path.clone())).await;
        assert!(read_res.is_ok());
        let brewfile_data = read_res.unwrap();
        assert_eq!(brewfile_data.content, sample_content);
        assert_eq!(brewfile_data.path, test_path);
        assert_eq!(brewfile_data.source, "file");

        let _ = std::fs::remove_file(&test_file);
        let _ = std::fs::remove_dir(&temp_dir);
    }

    #[tokio::test]
    async fn test_brewfile_check_temp_cleanup() {
        let temp_check_file = std::env::temp_dir()
            .join("brew-hub")
            .join(format!("Brewfile.check.{}", std::process::id()));

        // Run check with inline content
        let _ = check_brewfile(None, Some("tap \"homebrew/core\"\n".to_string())).await;

        // Verify the temporary file was cleaned up and no longer exists
        assert!(!temp_check_file.exists());
    }

    #[tokio::test]
    async fn test_cancel_nonexistent_operation() {
        let res = cancel_operation("nonexistent_op_123").await;
        assert!(res.is_ok());
        assert!(!res.unwrap());
    }

    #[tokio::test]
    async fn test_pin_unpin_rejects_invalid_names() {
        let pin_res = pin_formula("--invalid").await;
        assert!(pin_res.is_err());
        assert!(pin_res.unwrap_err().contains("Invalid package name"));

        let unpin_res = unpin_formula("; dangerous").await;
        assert!(unpin_res.is_err());
        assert!(unpin_res.unwrap_err().contains("Invalid package name"));
    }

    #[tokio::test]
    async fn test_get_outdated_json_greedy_parameter() {
        let res_standard = get_outdated_json(false).await;
        assert!(res_standard.is_ok());
        let val_standard = res_standard.unwrap();
        assert!(val_standard.get("formulae").is_some());
        assert!(val_standard.get("casks").is_some());
    }

    #[test]
    fn test_rank_token_names() {
        let mut tokens = vec![
            "git-lfs".to_string(),
            "digitalocean-cli".to_string(),
            "git".to_string(),
            "gitsome".to_string(),
        ];
        rank_token_names(&mut tokens, "git");
        // "git" should be first (exact match)
        assert_eq!(tokens[0], "git");
        // "git-lfs" and "gitsome" (prefix matches) before "digitalocean-cli" (substring)
        assert!(tokens[1].starts_with("git"));
        assert!(tokens[2].starts_with("git"));
        assert_eq!(tokens[3], "digitalocean-cli");
    }

    #[test]
    fn test_parse_and_rank_package_details() {
        let formula_json = serde_json::json!({
            "name": "neovim",
            "full_name": "neovim",
            "desc": "Vim-fork focused on extensibility and agility",
            "homepage": "https://neovim.io/",
            "versions": {
                "stable": "0.10.4"
            },
            "installed": [
                {
                    "version": "0.10.3",
                    "installed_as_dependency": false,
                    "installed_on_request": true
                }
            ],
            "outdated": true,
            "deprecated": false,
            "disabled": false,
            "license": "Apache-2.0",
            "dependencies": ["libuv", "luajit"],
            "caveats": null
        });

        let detail = parse_formula_detail(&formula_json).expect("should parse formula detail");
        assert_eq!(detail.name, "neovim");
        assert_eq!(detail.version, "0.10.4");
        assert!(detail.installed);
        assert_eq!(detail.installed_version, Some("0.10.3".to_string()));
        assert!(detail.outdated);
        assert_eq!(detail.dependencies, vec!["libuv", "luajit"]);

        let cask_json = serde_json::json!({
            "token": "raycast",
            "full_token": "raycast",
            "desc": "Control your tools with a few keystrokes",
            "homepage": "https://raycast.com/",
            "version": "2.6.2.0",
            "installed": null,
            "outdated": false,
            "deprecated": false,
            "disabled": false,
            "caveats": "Requires macOS 12 or later"
        });

        let cask_detail = parse_cask_detail(&cask_json).expect("should parse cask detail");
        assert_eq!(cask_detail.name, "raycast");
        assert_eq!(cask_detail.version, "2.6.2.0");
        assert!(!cask_detail.installed);
        assert_eq!(
            cask_detail.caveats,
            Some("Requires macOS 12 or later".to_string())
        );

        let mut list = vec![cask_detail, detail];
        rank_package_details(&mut list, "neovim");
        assert_eq!(list[0].name, "neovim");
    }
}
