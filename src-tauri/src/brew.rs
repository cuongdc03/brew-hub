use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::RwLock;
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
pub struct BrewfileCheckResult {
    pub satisfied: bool,
    pub missing_count: usize,
    pub missing_items: Vec<String>,
    pub raw_output: String,
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
                    let _ = std::fs::set_permissions(
                        &script_path,
                        std::fs::Permissions::from_mode(0o755),
                    );
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
            let token_slug = app_name.to_lowercase().replace(' ', "-").replace('_', "-");
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

    detected.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
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
    let mut cmd = create_brew_command();
    cmd.args(["install", "--cask", "--adopt", token]);

    let output = cmd.output().await.map_err(|e| {
        format!(
            "Failed to execute brew install --cask --adopt {}: {}",
            token, e
        )
    })?;

    Ok(CommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

pub async fn get_brewfile_content(path: Option<String>) -> Result<String, String> {
    if let Some(custom_path) = path {
        let p = PathBuf::from(&custom_path);
        if p.exists() {
            return std::fs::read_to_string(&p)
                .map_err(|e| format!("Failed to read Brewfile at {}: {}", custom_path, e));
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
                    return Ok(content);
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

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub async fn save_brewfile(content: String, path: Option<String>) -> Result<String, String> {
    let target_path = if let Some(p) = path {
        PathBuf::from(p)
    } else {
        let home =
            std::env::var("HOME").map_err(|_| "HOME environment variable not set".to_string())?;
        PathBuf::from(home).join(".Brewfile")
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
    let check_file_path = if let Some(text) = content {
        let temp_dir = std::env::temp_dir().join("brew-hub");
        let _ = std::fs::create_dir_all(&temp_dir);
        let temp_file = temp_dir.join("Brewfile.check");
        std::fs::write(&temp_file, text)
            .map_err(|e| format!("Failed to write temporary check Brewfile: {}", e))?;
        temp_file
    } else if let Some(p) = path {
        PathBuf::from(p)
    } else {
        let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
        PathBuf::from(home).join(".Brewfile")
    };

    let mut cmd = create_brew_command();
    cmd.args([
        "bundle",
        "check",
        &format!("--file={}", check_file_path.display()),
        "--verbose",
        "--no-upgrade",
    ]);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run brew bundle check: {}", e))?;

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
    let install_file_path = if let Some(text) = content {
        let temp_dir = std::env::temp_dir().join("brew-hub");
        let _ = std::fs::create_dir_all(&temp_dir);
        let temp_file = temp_dir.join("Brewfile.install");
        std::fs::write(&temp_file, text)
            .map_err(|e| format!("Failed to write temporary install Brewfile: {}", e))?;
        temp_file
    } else if let Some(p) = path {
        PathBuf::from(p)
    } else {
        let home = std::env::var("HOME").map_err(|_| "HOME not set".to_string())?;
        PathBuf::from(home).join(".Brewfile")
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

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute brew bundle install: {}", e))?;

    Ok(CommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

pub async fn export_brewfile_to_path(target_path: &str) -> Result<CommandOutput, String> {
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
}
