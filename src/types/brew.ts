export interface SystemInfo {
  brew_path: string;
  brew_version: string;
  prefix: string;
  arch: string;
}

export interface FormulaInstalledVersion {
  version: string;
  installed_as_dependency?: boolean;
  installed_on_request?: boolean;
}

export interface FormulaItem {
  name: string;
  full_name: string;
  desc: string | null;
  homepage: string | null;
  license: string | null;
  versions: {
    stable: string;
  };
  installed: FormulaInstalledVersion[];
  outdated: boolean;
  pinned: boolean;
  dependencies: string[];
}

export interface CaskItem {
  token: string;
  full_token: string;
  name: string[];
  desc: string | null;
  homepage: string | null;
  version: string;
  installed: string | null;
  outdated: boolean;
  auto_updates: boolean | null;
}

export interface InstalledData {
  formulae: FormulaItem[];
  casks: CaskItem[];
}

export interface OutdatedPackage {
  name: string;
  installed_versions: string[];
  current_version: string;
  pinned: boolean;
  pinned_version: string | null;
}

export interface OutdatedData {
  formulae: OutdatedPackage[];
  casks: OutdatedPackage[];
}

export interface ServiceInfo {
  name: string;
  status: string; // "started" | "stopped" | "none" | "error"
  user: string | null;
  file: string | null;
  exit_code: number | null;
}

export interface CleanupItem {
  path: string;
  size: string | null;
}

export interface CleanupPreview {
  items: CleanupItem[];
  total_space: string;
}

export interface AutoremovePreview {
  formulae: string[];
}

export interface SearchResult {
  formulae: string[];
  casks: string[];
}

export interface CommandOutput {
  success: boolean;
  stdout: string;
  stderr: string;
}

export interface UnmanagedApp {
  name: string;
  path: string;
  bundle_id: string | null;
  installed_version: string | null;
  cask_token: string;
  cask_name: string;
  cask_version: string;
  cask_desc: string | null;
  cask_homepage: string | null;
  auto_updates: boolean;
}

export interface BrewfileCheckResult {
  satisfied: boolean;
  missing_count: number;
  missing_items: string[];
  raw_output: string;
}
