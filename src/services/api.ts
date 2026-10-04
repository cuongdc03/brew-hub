import { invoke } from "@tauri-apps/api/core";
import {
  CleanupPreview,
  CommandOutput,
  InstalledData,
  OutdatedData,
  SearchResult,
  ServiceInfo,
  SystemInfo,
  UnmanagedApp,
  BrewfileCheckResult,
  CheckUpdatesResult,
  PackageDetail,
  RichSearchResult,
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

export async function checkForUpdates(): Promise<CheckUpdatesResult> {
  const data = await invoke<any>("check_for_updates");
  return {
    outdated: {
      formulae: data.outdated?.formulae || [],
      casks: data.outdated?.casks || [],
    },
    last_checked: data.last_checked || 0,
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

export async function searchPackagesRich(query: string): Promise<RichSearchResult> {
  return await invoke<RichSearchResult>("search_packages_rich", { query });
}

export async function getPackageDetails(name: string, isCask: boolean): Promise<PackageDetail> {
  return await invoke<PackageDetail>("get_package_details", { name, isCask });
}


export async function checkDoctor(): Promise<CommandOutput> {
  return await invoke<CommandOutput>("check_doctor");
}

export async function fetchUnmanagedApps(): Promise<UnmanagedApp[]> {
  return await invoke<UnmanagedApp[]>("scan_unmanaged");
}

export async function adoptCask(token: string): Promise<CommandOutput> {
  return await invoke<CommandOutput>("adopt_cask", { token });
}

export async function fetchBrewfile(path?: string): Promise<string> {
  return await invoke<string>("get_brewfile", { path });
}

export async function saveBrewfile(content: string, path?: string): Promise<string> {
  return await invoke<string>("save_brewfile_content", { content, path });
}

export async function checkBrewfileDependencies(
  path?: string,
  content?: string
): Promise<BrewfileCheckResult> {
  return await invoke<BrewfileCheckResult>("check_brewfile_dependencies", { path, content });
}

export async function installBrewfileDependencies(
  path?: string,
  content?: string,
  noUpgrade = false
): Promise<CommandOutput> {
  return await invoke<CommandOutput>("install_brewfile_dependencies", {
    path,
    content,
    noUpgrade,
  });
}

export async function exportBrewfile(targetPath: string): Promise<CommandOutput> {
  return await invoke<CommandOutput>("export_brewfile", { targetPath });
}
