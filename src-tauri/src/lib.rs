mod brew;
mod settings;

use brew::{
    adopt_cask_package, check_brew_doctor, check_brewfile, export_brewfile_to_path,
    get_brewfile_content, get_cleanup_dry_run, get_installed_json, get_outdated_json_with_greedy,
    get_services_list, get_system_info, install_brewfile, manage_service_action, package_operation,
    run_autoremove_execute, run_cleanup_execute, save_brewfile, scan_unmanaged_apps, search_brew,
    BrewfileCheckResult, CleanupPreview, CommandOutput, SearchResult, ServiceInfo, SystemInfo,
    UnmanagedApp,
};
use settings::AppSettings;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_notification::NotificationExt;

#[tauri::command]
async fn get_system() -> Result<SystemInfo, String> {
    get_system_info().await
}

#[tauri::command]
async fn get_installed() -> Result<serde_json::Value, String> {
    get_installed_json().await
}

#[tauri::command]
async fn get_outdated(greedy: Option<bool>) -> Result<serde_json::Value, String> {
    let is_greedy = greedy.unwrap_or(false);
    get_outdated_json_with_greedy(is_greedy).await
}

#[tauri::command]
async fn get_settings() -> Result<AppSettings, String> {
    Ok(settings::load_settings())
}

#[tauri::command]
async fn update_settings(
    new_settings: AppSettings,
    app: tauri::AppHandle,
) -> Result<AppSettings, String> {
    settings::save_settings(&new_settings)?;

    #[cfg(desktop)]
    {
        use tauri_plugin_autostart::ManagerExt;
        let autolaunch = app.autolaunch();
        if new_settings.launch_at_login {
            let _ = autolaunch.enable();
        } else {
            let _ = autolaunch.disable();
        }
    }

    #[cfg(target_os = "macos")]
    {
        let policy = if new_settings.show_dock_icon {
            tauri::ActivationPolicy::Regular
        } else {
            tauri::ActivationPolicy::Accessory
        };
        let _ = app.set_activation_policy(policy);
    }

    let _ = app.emit("settings-changed", &new_settings);

    Ok(new_settings)
}

#[tauri::command]
async fn update_tray_badge(count: usize, app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if let Some(tray) = app.tray_by_id("main-tray") {
            let title = if count > 0 {
                Some(format!(" {}", count))
            } else {
                None
            };
            let _ = tray.set_title(title.as_deref());
        }
    }
    Ok(())
}

#[tauri::command]
async fn get_services() -> Result<Vec<ServiceInfo>, String> {
    get_services_list().await
}

#[tauri::command]
async fn manage_service(name: String, action: String) -> Result<CommandOutput, String> {
    manage_service_action(&name, &action).await
}

#[tauri::command]
async fn get_cleanup_preview() -> Result<CleanupPreview, String> {
    get_cleanup_dry_run().await
}

#[tauri::command]
async fn run_cleanup() -> Result<CommandOutput, String> {
    run_cleanup_execute().await
}

#[tauri::command]
async fn run_autoremove() -> Result<CommandOutput, String> {
    run_autoremove_execute().await
}

#[tauri::command]
async fn upgrade_package(name: String, is_cask: bool) -> Result<CommandOutput, String> {
    package_operation("upgrade", &name, is_cask).await
}

#[tauri::command]
async fn uninstall_package(name: String, is_cask: bool) -> Result<CommandOutput, String> {
    package_operation("uninstall", &name, is_cask).await
}

#[tauri::command]
async fn install_package(name: String, is_cask: bool) -> Result<CommandOutput, String> {
    package_operation("install", &name, is_cask).await
}

#[tauri::command]
async fn search_packages(query: String) -> Result<SearchResult, String> {
    search_brew(&query).await
}

#[tauri::command]
async fn check_doctor() -> Result<CommandOutput, String> {
    check_brew_doctor().await
}

#[tauri::command]
async fn scan_unmanaged() -> Result<Vec<UnmanagedApp>, String> {
    scan_unmanaged_apps().await
}

#[tauri::command]
async fn adopt_cask(token: String) -> Result<CommandOutput, String> {
    adopt_cask_package(&token).await
}

#[tauri::command]
async fn get_brewfile(path: Option<String>) -> Result<String, String> {
    get_brewfile_content(path).await
}

#[tauri::command]
async fn save_brewfile_content(content: String, path: Option<String>) -> Result<String, String> {
    save_brewfile(content, path).await
}

#[tauri::command]
async fn check_brewfile_dependencies(
    path: Option<String>,
    content: Option<String>,
) -> Result<BrewfileCheckResult, String> {
    check_brewfile(path, content).await
}

#[tauri::command]
async fn install_brewfile_dependencies(
    path: Option<String>,
    content: Option<String>,
    no_upgrade: bool,
) -> Result<CommandOutput, String> {
    install_brewfile(path, content, no_upgrade).await
}

#[tauri::command]
async fn export_brewfile(target_path: String) -> Result<CommandOutput, String> {
    export_brewfile_to_path(&target_path).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .setup(|app| {
            let initial_settings = settings::load_settings();

            #[cfg(target_os = "macos")]
            {
                if !initial_settings.show_dock_icon {
                    let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                }
            }

            #[cfg(desktop)]
            {
                use tauri_plugin_autostart::ManagerExt;
                if let Ok(is_enabled) = app.autolaunch().is_enabled() {
                    if is_enabled != initial_settings.launch_at_login {
                        if initial_settings.launch_at_login {
                            let _ = app.autolaunch().enable();
                        } else {
                            let _ = app.autolaunch().disable();
                        }
                    }
                }
            }

            // Setup macOS Menu Bar Status Item (Tray)
            #[cfg(target_os = "macos")]
            {
                let show_i = MenuItem::with_id(app, "show", "Open Brew Hub", true, None::<&str>)?;
                let check_i =
                    MenuItem::with_id(app, "check", "Check for Updates", true, None::<&str>)?;
                let upgrade_i =
                    MenuItem::with_id(app, "upgrade", "Upgrade All Outdated", true, None::<&str>)?;
                let sep = PredefinedMenuItem::separator(app)?;
                let pref_i = MenuItem::with_id(
                    app,
                    "preferences",
                    "Preferences…",
                    true,
                    Some("CmdOrCtrl+,"),
                )?;
                let sep2 = PredefinedMenuItem::separator(app)?;
                let quit_i = MenuItem::with_id(app, "quit", "Quit Brew Hub", true, None::<&str>)?;

                let menu = Menu::with_items(
                    app,
                    &[&show_i, &check_i, &upgrade_i, &sep, &pref_i, &sep2, &quit_i],
                )?;

                let tray_icon_bytes = include_bytes!("../icons/tray-template.png");
                if let Ok(tray_image) = tauri::image::Image::from_bytes(tray_icon_bytes) {
                    let _tray = TrayIconBuilder::with_id("main-tray")
                        .icon(tray_image)
                        .icon_as_template(true)
                        .menu(&menu)
                        .show_menu_on_left_click(false)
                        .tooltip("Brew Hub - macOS Package Manager")
                        .on_menu_event(|app, event| match event.id.as_ref() {
                            "show" => {
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                }
                            }
                            "preferences" => {
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                    let _ = window.emit("open-preferences", ());
                                }
                            }
                            "quit" => {
                                app.exit(0);
                            }
                            "check" => {
                                let app_handle = app.clone();
                                tauri::async_runtime::spawn(async move {
                                    let current_settings = settings::load_settings();
                                    if let Ok(outdated_val) = brew::get_outdated_json_with_greedy(
                                        current_settings.include_greedy,
                                    )
                                    .await
                                    {
                                        let (current_keys, _) = settings::parse_outdated_keys(
                                            &outdated_val,
                                            &current_settings.ignored_casks,
                                        );
                                        let total = current_keys.len();

                                        #[cfg(target_os = "macos")]
                                        if let Some(tray) = app_handle.tray_by_id("main-tray") {
                                            let title = if total > 0 {
                                                Some(format!(" {}", total))
                                            } else {
                                                None
                                            };
                                            let _ = tray.set_title(title.as_deref());
                                        }

                                        let msg = if total > 0 {
                                            format!("{} updates ready to install", total)
                                        } else {
                                            "All Homebrew packages and applications are up to date!"
                                                .to_string()
                                        };
                                        let _ = app_handle
                                            .notification()
                                            .builder()
                                            .title("Brew Hub System Check")
                                            .body(&msg)
                                            .show();
                                    }
                                });
                            }
                            "upgrade" => {
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                    let _ = window.emit("tray-upgrade-all", ());
                                }
                            }
                            _ => {}
                        })
                        .on_tray_icon_event(|tray, event| {
                            if let TrayIconEvent::Click {
                                button: MouseButton::Left,
                                button_state: MouseButtonState::Up,
                                ..
                            } = event
                            {
                                let app = tray.app_handle();
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                }
                            }
                        })
                        .build(app)?;
                }

                // Background Periodic Check for Updates
                let bg_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_secs(12)).await;
                    let mut seen_outdated: std::collections::HashSet<String> =
                        std::collections::HashSet::new();

                    loop {
                        let current_settings = settings::load_settings();
                        if let Some(sleep_sec) = current_settings.interval_seconds() {
                            if let Ok(outdated_val) =
                                brew::get_outdated_json_with_greedy(current_settings.include_greedy)
                                    .await
                            {
                                let (current_keys, _) = settings::parse_outdated_keys(
                                    &outdated_val,
                                    &current_settings.ignored_casks,
                                );
                                let total = current_keys.len();

                                // Update tray title badge
                                #[cfg(target_os = "macos")]
                                {
                                    if let Some(tray) = bg_handle.tray_by_id("main-tray") {
                                        let title = if total > 0 {
                                            Some(format!(" {}", total))
                                        } else {
                                            None
                                        };
                                        let _ = tray.set_title(title.as_deref());
                                    }
                                }

                                // Deduplicate notifications
                                if current_settings.notify_only_changed {
                                    let new_keys: Vec<_> =
                                        current_keys.difference(&seen_outdated).cloned().collect();
                                    if !new_keys.is_empty() {
                                        let new_names: Vec<String> = new_keys
                                            .iter()
                                            .map(|k| k.split('@').next().unwrap_or(k).to_string())
                                            .collect();

                                        let msg = if new_names.len() == 1 {
                                            format!("1 new update available: {}", new_names[0])
                                        } else if new_names.len() <= 3 {
                                            format!(
                                                "{} new updates: {}",
                                                new_names.len(),
                                                new_names.join(", ")
                                            )
                                        } else {
                                            format!(
                                                "{} new updates including {}",
                                                new_names.len(),
                                                new_names[..2].join(", ")
                                            )
                                        };

                                        let _ = bg_handle
                                            .notification()
                                            .builder()
                                            .title("Brew Hub Updates Available")
                                            .body(&msg)
                                            .show();
                                    }
                                } else if total > 0 {
                                    let _ = bg_handle
                                        .notification()
                                        .builder()
                                        .title("Brew Hub Updates Available")
                                        .body(format!(
                                            "{} packages have new versions ready to install",
                                            total
                                        ))
                                        .show();
                                }

                                seen_outdated = current_keys;
                            }

                            tokio::time::sleep(std::time::Duration::from_secs(sleep_sec)).await;
                        } else {
                            tokio::time::sleep(std::time::Duration::from_secs(60)).await;
                        }
                    }
                });
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let settings = settings::load_settings();
                if settings.keep_in_menu_bar {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_system,
            get_installed,
            get_outdated,
            get_settings,
            update_settings,
            update_tray_badge,
            get_services,
            manage_service,
            get_cleanup_preview,
            run_cleanup,
            run_autoremove,
            upgrade_package,
            uninstall_package,
            install_package,
            search_packages,
            check_doctor,
            scan_unmanaged,
            adopt_cask,
            get_brewfile,
            save_brewfile_content,
            check_brewfile_dependencies,
            install_brewfile_dependencies,
            export_brewfile
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    builder.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Reopen { .. } = event {
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }
    });
}
