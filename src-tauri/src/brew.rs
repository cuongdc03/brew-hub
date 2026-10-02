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

pub fn get_or_create_askpass_script() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        let cache_dir = std::env::temp_dir().join("brew-hub");
        let _ = std::fs::create_dir_all(&cache_dir);
        let script_path = cache_dir.join("brew-hub-askpass.sh");

        let script_content = r#"#!/bin/sh
exec /usr/bin/osascript -e '
tell application "System Events"
    activate
    set theResp to display dialog "Brew Hub requires administrator privileges to modify system packages:" default answer "" with hidden answer with icon caution with title "Brew Hub Authorization" buttons {"Cancel", "OK"} default button "OK"
    return text returned of theResp
end tell
'
"#;

        if !script_path.exists() {
            if let Ok(()) = std::fs::write(&script_path, script_content) {
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    let _ = std::fs::set_permissions(&script_path, std::fs::Permissions::from_mode(0o755));
                }
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
    let trimmed_query = query.trim();
    if trimmed_query.is_empty() {
        return Ok(SearchResult {
            formulae: Vec::new(),
            casks: Vec::new(),
        });
    }

    // Run --cask and --formula concurrently for precision and speed
    let mut cask_cmd = create_brew_command();
    cask_cmd.args(["search", "--cask", trimmed_query]);

    let mut formula_cmd = create_brew_command();
    formula_cmd.args(["search", "--formula", trimmed_query]);

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
    async fn test_search_brew_nonexistent_package() {
        let result = search_brew("nonexistentpackage123456789xyz").await;
        assert!(result.is_ok());
        let search_res = result.unwrap();
        assert!(search_res.formulae.is_empty());
        assert!(search_res.casks.is_empty());
    }

    #[tokio::test]
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
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let metadata = std::fs::metadata(&path).unwrap();
                let mode = metadata.permissions().mode();
                assert_eq!(mode & 0o777, 0o755);
            }
        }
        #[cfg(not(target_os = "macos"))]
        {
            assert!(script.is_none());
        }
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
}

