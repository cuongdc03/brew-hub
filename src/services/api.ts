import { invoke } from "@tauri-apps/api/core";
import {
  CleanupPreview,
  CommandOutput,
  InstalledData,
  OutdatedData,
  SearchResult,
  ServiceInfo,
  SystemInfo,
} from "../types/brew";

export async function fetchSystemInfo(): Promise<SystemInfo> {
  return await invoke<SystemInfo>("get_system");
}

export async function fetchInstalledPackages(): Promise<InstalledData> {
  const data = await invoke<any>("get_installed");
  return {
    formulae: data.formulae || [],
    casks: data.casks || [],
  };
}

export async function fetchOutdatedPackages(): Promise<OutdatedData> {
  const data = await invoke<any>("get_outdated");
  return {
    formulae: data.formulae || [],
    casks: data.casks || [],
  };
}

export async function fetchServices(): Promise<ServiceInfo[]> {
  return await invoke<ServiceInfo[]>("get_services");
}

export async function manageService(
  name: string,
  action: "start" | "stop" | "restart"
): Promise<CommandOutput> {
  return await invoke<CommandOutput>("manage_service", { name, action });
}

export async function fetchCleanupPreview(): Promise<CleanupPreview> {
  return await invoke<CleanupPreview>("get_cleanup_preview");
}

export async function executeCleanup(): Promise<CommandOutput> {
  return await invoke<CommandOutput>("run_cleanup");
}

export async function executeAutoremove(): Promise<CommandOutput> {
  return await invoke<CommandOutput>("run_autoremove");
}

export async function upgradePackage(name: string, isCask: boolean): Promise<CommandOutput> {
  return await invoke<CommandOutput>("upgrade_package", { name, isCask });
}

export async function uninstallPackage(name: string, isCask: boolean): Promise<CommandOutput> {
  return await invoke<CommandOutput>("uninstall_package", { name, isCask });
}

export async function installPackage(name: string, isCask: boolean): Promise<CommandOutput> {
  return await invoke<CommandOutput>("install_package", { name, isCask });
}

export async function searchPackages(query: string): Promise<SearchResult> {
  return await invoke<SearchResult>("search_packages", { query });
}

export async function checkDoctor(): Promise<CommandOutput> {
  return await invoke<CommandOutput>("check_doctor");
}
