mod brew;

use brew::{
    adopt_cask_package, cancel_operation, check_brew_doctor, check_brewfile,
    export_brewfile_to_path, get_autoremove_dry_run, get_brewfile_content, get_cleanup_dry_run,
    get_installed_json, get_outdated_json, get_services_list, get_system_info, install_brewfile,
    manage_service_action, package_operation, pin_formula, run_autoremove_execute,
    run_brew_streaming, run_cleanup_execute, save_brewfile, scan_unmanaged_apps, search_brew,
    unpin_formula, update_brew_index, AutoremovePreview, BrewfileCheckResult, BrewfileData,
    CleanupPreview, CommandOutput, OpEvent, SearchResult, ServiceInfo, SystemInfo, UnmanagedApp,
};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_notification::NotificationExt;

static IS_QUITTING: AtomicBool = AtomicBool::new(false);

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
    get_outdated_json(greedy.unwrap_or(false)).await
}

#[tauri::command]
async fn check_for_updates(greedy: Option<bool>) -> Result<serde_json::Value, String> {
    let _ = update_brew_index().await;
    let outdated = get_outdated_json(greedy.unwrap_or(false)).await?;
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    Ok(serde_json::json!({
        "outdated": outdated,
        "last_checked": timestamp,
    }))
}

#[tauri::command]
async fn get_services() -> Result<Vec<ServiceInfo>, String> {
    get_services_list().await
}

#[tauri::command]
async fn manage_service(
    name: String,
    action: String,
    as_root: Option<bool>,
) -> Result<CommandOutput, String> {
    manage_service_action(&name, &action, as_root.unwrap_or(false)).await
}

#[tauri::command]
async fn get_cleanup_preview(prune_all: Option<bool>) -> Result<CleanupPreview, String> {
    get_cleanup_dry_run(prune_all).await
}

#[tauri::command]
async fn run_cleanup(prune_all: Option<bool>) -> Result<CommandOutput, String> {
    run_cleanup_execute(prune_all).await
}

#[tauri::command]
async fn get_autoremove_preview() -> Result<AutoremovePreview, String> {
    get_autoremove_dry_run().await
}

#[tauri::command]
async fn run_autoremove() -> Result<CommandOutput, String> {
    run_autoremove_execute().await
}

#[tauri::command]
async fn upgrade_package(
    name: String,
    is_cask: bool,
    greedy: Option<bool>,
) -> Result<CommandOutput, String> {
    package_operation("upgrade", &name, is_cask, greedy.unwrap_or(false)).await
}

#[tauri::command]
async fn uninstall_package(name: String, is_cask: bool) -> Result<CommandOutput, String> {
    package_operation("uninstall", &name, is_cask, false).await
}

#[tauri::command]
async fn install_package(name: String, is_cask: bool) -> Result<CommandOutput, String> {
    package_operation("install", &name, is_cask, false).await
}

#[tauri::command]
async fn pin_package(name: String) -> Result<CommandOutput, String> {
    pin_formula(&name).await
}

#[tauri::command]
async fn unpin_package(name: String) -> Result<CommandOutput, String> {
    unpin_formula(&name).await
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
async fn get_brewfile(path: Option<String>) -> Result<BrewfileData, String> {
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

#[tauri::command]
async fn execute_streaming_brew(
    op_id: String,
    args: Vec<String>,
    on_event: tauri::ipc::Channel<OpEvent>,
) -> Result<(), String> {
    run_brew_streaming(op_id, args, on_event).await
}

#[tauri::command]
async fn cancel_brew_operation(op_id: String) -> Result<bool, String> {
    cancel_operation(&op_id).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Setup macOS Menu Bar Status Item (Tray)
            #[cfg(target_os = "macos")]
            {
                let show_i = MenuItem::with_id(app, "show", "Open Brew Hub", true, None::<&str>)?;
                let check_i = MenuItem::with_id(app, "check", "Check for Updates", true, None::<&str>)?;
                let upgrade_i = MenuItem::with_id(app, "upgrade", "Upgrade All Outdated", true, None::<&str>)?;
                let sep = PredefinedMenuItem::separator(app)?;
                let quit_i = MenuItem::with_id(app, "quit", "Quit Brew Hub", true, None::<&str>)?;

                let menu = Menu::with_items(app, &[&show_i, &check_i, &upgrade_i, &sep, &quit_i])?;

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
                            "quit" => {
                                IS_QUITTING.store(true, Ordering::SeqCst);
                                app.exit(0);
                            }
                            "check" => {
                                let app_handle = app.clone();
                                tauri::async_runtime::spawn(async move {
                                    let _ = brew::update_brew_index().await;
                                    if let Ok(outdated_val) = brew::get_outdated_json(false).await {
                                        let timestamp = std::time::SystemTime::now()
                                            .duration_since(std::time::UNIX_EPOCH)
                                            .map(|d| d.as_secs())
                                            .unwrap_or(0);
                                        let _ = app_handle.emit(
                                             "brew-updates-checked",
                                             serde_json::json!({
                                                 "outdated": &outdated_val,
                                                 "last_checked": timestamp,
                                             }),
                                        );
                                        let f_count = outdated_val
                                            .get("formulae")
                                            .and_then(|v| v.as_array())
                                            .map(|a| a.len())
                                            .unwrap_or(0);
                                        let c_count = outdated_val
                                            .get("casks")
                                            .and_then(|v| v.as_array())
                                            .map(|a| a.len())
                                            .unwrap_or(0);
                                        let total = f_count + c_count;
                                        let msg = if total > 0 {
                                            format!(
                                                "{} updates ready to install ({} formulae, {} casks)",
                                                total, f_count, c_count
                                            )
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

                // Background Periodic Check for Updates (startup + every 1 hour)
                let bg_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_secs(12)).await;
                    loop {
                        let _ = brew::update_brew_index().await;
                        if let Ok(outdated_val) = brew::get_outdated_json(false).await {
                            let timestamp = std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .map(|d| d.as_secs())
                                .unwrap_or(0);
                            let _ = bg_handle.emit(
                                "brew-updates-checked",
                                serde_json::json!({
                                    "outdated": &outdated_val,
                                    "last_checked": timestamp,
                                }),
                            );
                            let f_count = outdated_val
                                .get("formulae")
                                .and_then(|v| v.as_array())
                                .map(|a| a.len())
                                .unwrap_or(0);
                            let c_count = outdated_val
                                .get("casks")
                                .and_then(|v| v.as_array())
                                .map(|a| a.len())
                                .unwrap_or(0);
                            let total = f_count + c_count;
                            if total > 0 {
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
                        }
                        tokio::time::sleep(std::time::Duration::from_secs(3600)).await;
                    }
                });
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                #[cfg(target_os = "macos")]
                {
                    if !IS_QUITTING.load(Ordering::SeqCst) {
                        let _ = window.hide();
                        api.prevent_close();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_system,
            get_installed,
            get_outdated,
            check_for_updates,
            get_services,
            manage_service,
            get_cleanup_preview,
            get_autoremove_preview,
            run_cleanup,
            run_autoremove,
            upgrade_package,
            uninstall_package,
            install_package,
            pin_package,
            unpin_package,
            search_packages,
            check_doctor,
            scan_unmanaged,
            adopt_cask,
            get_brewfile,
            save_brewfile_content,
            check_brewfile_dependencies,
            install_brewfile_dependencies,
            export_brewfile,
            execute_streaming_brew,
            cancel_brew_operation
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| match event {
        tauri::RunEvent::ExitRequested { .. } => {
            IS_QUITTING.store(true, Ordering::SeqCst);
        }
        tauri::RunEvent::Reopen { .. } => {
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }
        _ => {}
    });
}
