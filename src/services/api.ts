import { Channel, invoke } from "@tauri-apps/api/core";
import {
  AutoremovePreview,
  CleanupPreview,
  CommandOutput,
  InstalledData,
  OutdatedData,
  SearchResult,
  ServiceInfo,
  SystemInfo,
  UnmanagedApp,
  BrewfileCheckResult,
  BrewfileData,
  OpEvent,
  CheckUpdatesResult,
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
  action: "start" | "stop" | "restart",
  asRoot?: boolean
): Promise<CommandOutput> {
  return await invoke<CommandOutput>("manage_service", { name, action, asRoot });
}

export async function fetchCleanupPreview(pruneAll = true): Promise<CleanupPreview> {
  return await invoke<CleanupPreview>("get_cleanup_preview", { pruneAll });
}

export async function executeCleanup(pruneAll = true): Promise<CommandOutput> {
  return await invoke<CommandOutput>("run_cleanup", { pruneAll });
}

export async function fetchAutoremovePreview(): Promise<AutoremovePreview> {
  return await invoke<AutoremovePreview>("get_autoremove_preview");
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

export async function fetchUnmanagedApps(): Promise<UnmanagedApp[]> {
  return await invoke<UnmanagedApp[]>("scan_unmanaged");
}

export async function adoptCask(token: string): Promise<CommandOutput> {
  return await invoke<CommandOutput>("adopt_cask", { token });
}

export async function fetchBrewfile(path?: string): Promise<BrewfileData> {
  return await invoke<BrewfileData>("get_brewfile", { path });
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

export async function streamBrewOperation(
  opId: string,
  args: string[],
  onEvent: (event: OpEvent) => void
): Promise<void> {
  const channel = new Channel<OpEvent>();
  channel.onmessage = onEvent;
  await invoke("execute_streaming_brew", {
    opId,
    args,
    onEvent: channel,
  });
}

export async function cancelBrewOperation(opId: string): Promise<boolean> {
  return await invoke<boolean>("cancel_brew_operation", { opId });
}
