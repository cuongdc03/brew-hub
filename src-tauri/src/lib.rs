mod brew;

use brew::{
    check_brew_doctor, get_cleanup_dry_run, get_installed_json, get_outdated_json,
    get_services_list, get_system_info, manage_service_action, package_operation,
    run_autoremove_execute, run_cleanup_execute, search_brew, CleanupPreview, CommandOutput,
    SearchResult, ServiceInfo, SystemInfo,
};

#[tauri::command]
async fn get_system() -> Result<SystemInfo, String> {
    get_system_info().await
}

#[tauri::command]
async fn get_installed() -> Result<serde_json::Value, String> {
    get_installed_json().await
}

#[tauri::command]
async fn get_outdated() -> Result<serde_json::Value, String> {
    get_outdated_json().await
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_system,
            get_installed,
            get_outdated,
            get_services,
            manage_service,
            get_cleanup_preview,
            run_cleanup,
            run_autoremove,
            upgrade_package,
            uninstall_package,
            install_package,
            search_packages,
            check_doctor
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
