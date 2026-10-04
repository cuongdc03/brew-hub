use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AppSettings {
    pub check_interval: String, // "1h", "6h", "24h", "never"
    pub notify_only_changed: bool,
    pub include_greedy: bool,
    pub launch_at_login: bool,
    pub keep_in_menu_bar: bool,
    pub show_dock_icon: bool,
    pub ignored_casks: Vec<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            check_interval: "1h".to_string(),
            notify_only_changed: true,
            include_greedy: false,
            launch_at_login: false,
            keep_in_menu_bar: true,
            show_dock_icon: true,
            ignored_casks: Vec::new(),
        }
    }
}

impl AppSettings {
    pub fn interval_seconds(&self) -> Option<u64> {
        match self.check_interval.as_str() {
            "1h" => Some(3600),
            "6h" => Some(21600),
            "24h" => Some(86400),
            "never" => None,
            _ => Some(3600),
        }
    }
}

pub fn get_settings_path() -> PathBuf {
    if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("brew-hub")
            .join("settings.json")
    } else {
        std::env::temp_dir().join("brew-hub").join("settings.json")
    }
}

pub fn load_settings() -> AppSettings {
    let path = get_settings_path();
    if let Ok(contents) = std::fs::read_to_string(&path) {
        if let Ok(settings) = serde_json::from_str::<AppSettings>(&contents) {
            return settings;
        }
    }
    AppSettings::default()
}

pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = get_settings_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }
    let data = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    std::fs::write(&path, data).map_err(|e| format!("Failed to write settings: {}", e))?;
    Ok(())
}

pub fn parse_outdated_keys(
    outdated_val: &serde_json::Value,
    ignored_casks: &[String],
) -> (std::collections::HashSet<String>, Vec<String>) {
    let mut keys = std::collections::HashSet::new();
    let mut names = Vec::new();

    if let Some(formulae) = outdated_val.get("formulae").and_then(|v| v.as_array()) {
        for f in formulae {
            if let Some(name) = f.get("name").and_then(|v| v.as_str()) {
                let current_ver = f
                    .get("current_version")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let key = format!("{}@{}", name, current_ver);
                keys.insert(key);
                names.push(format!("{} {}", name, current_ver));
            }
        }
    }

    if let Some(casks) = outdated_val.get("casks").and_then(|v| v.as_array()) {
        for c in casks {
            if let Some(name) = c.get("name").and_then(|v| v.as_str()) {
                if ignored_casks
                    .iter()
                    .any(|ignored| ignored.eq_ignore_ascii_case(name))
                {
                    continue;
                }
                let current_ver = c
                    .get("current_version")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let key = format!("{}@{}", name, current_ver);
                keys.insert(key);
                names.push(format!("{} {}", name, current_ver));
            }
        }
    }

    (keys, names)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_settings() {
        let def = AppSettings::default();
        assert_eq!(def.check_interval, "1h");
        assert!(def.notify_only_changed);
        assert!(!def.include_greedy);
        assert!(!def.launch_at_login);
        assert!(def.keep_in_menu_bar);
        assert!(def.show_dock_icon);
        assert!(def.ignored_casks.is_empty());
        assert_eq!(def.interval_seconds(), Some(3600));
    }

    #[test]
    fn test_interval_seconds_mapping() {
        let mut s = AppSettings::default();
        s.check_interval = "1h".to_string();
        assert_eq!(s.interval_seconds(), Some(3600));

        s.check_interval = "6h".to_string();
        assert_eq!(s.interval_seconds(), Some(21600));

        s.check_interval = "24h".to_string();
        assert_eq!(s.interval_seconds(), Some(86400));

        s.check_interval = "never".to_string();
        assert_eq!(s.interval_seconds(), None);
    }

    #[test]
    fn test_save_and_load_settings() {
        let temp_dir = std::env::temp_dir().join("brew-hub-test-settings");
        let _ = std::fs::create_dir_all(&temp_dir);
        let test_path = temp_dir.join("test-settings.json");

        let mut sample = AppSettings::default();
        sample.check_interval = "6h".to_string();
        sample.ignored_casks.push("postman".to_string());

        let json = serde_json::to_string_pretty(&sample).unwrap();
        std::fs::write(&test_path, json).unwrap();

        let read_back: AppSettings =
            serde_json::from_str(&std::fs::read_to_string(&test_path).unwrap()).unwrap();
        assert_eq!(read_back.check_interval, "6h");
        assert_eq!(read_back.ignored_casks, vec!["postman".to_string()]);

        let _ = std::fs::remove_file(test_path);
    }

    #[test]
    fn test_parse_outdated_keys_and_deduplication() {
        let sample_json = serde_json::json!({
            "formulae": [
                {
                    "name": "node",
                    "installed_versions": ["22.2.0"],
                    "current_version": "22.3.0"
                }
            ],
            "casks": [
                {
                    "name": "postman",
                    "installed_versions": ["12.29.0"],
                    "current_version": "12.30.0"
                },
                {
                    "name": "slack",
                    "installed_versions": ["4.38.0"],
                    "current_version": "4.39.0"
                }
            ]
        });

        // 1. Without ignore list
        let (keys, names) = parse_outdated_keys(&sample_json, &[]);
        assert_eq!(keys.len(), 3);
        assert!(keys.contains("node@22.3.0"));
        assert!(keys.contains("postman@12.30.0"));
        assert!(keys.contains("slack@4.39.0"));
        assert_eq!(names.len(), 3);

        // 2. With ignored casks
        let (keys_filtered, names_filtered) =
            parse_outdated_keys(&sample_json, &["postman".to_string()]);
        assert_eq!(keys_filtered.len(), 2);
        assert!(keys_filtered.contains("node@22.3.0"));
        assert!(!keys_filtered.contains("postman@12.30.0"));
        assert!(keys_filtered.contains("slack@4.39.0"));
        assert_eq!(names_filtered.len(), 2);

        // 3. Deduplication diff
        let mut seen = std::collections::HashSet::new();
        seen.insert("node@22.3.0".to_string());

        let new_keys: Vec<_> = keys_filtered.difference(&seen).collect();
        assert_eq!(new_keys.len(), 1);
        assert_eq!(new_keys[0], "slack@4.39.0");

        // Next check with same keys: difference is 0
        seen.insert("slack@4.39.0".to_string());
        let empty_diff: Vec<_> = keys_filtered.difference(&seen).collect();
        assert!(empty_diff.is_empty());
    }
}
