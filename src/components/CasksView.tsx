import { useState } from "react";
import {
  ExternalLink,
  ArrowUpCircle,
  AppWindow,
  CheckCircle,
  LayoutGrid,
  List,
  Trash2,
  AlertTriangle,
  Sparkles,
  DownloadCloud,
  Bell,
  BellOff,
  RotateCw,
} from "lucide-react";
import { CaskItem, OutdatedPackage, UnmanagedApp } from "../types/brew";
import { InspectedItem } from "./PackageInspector";
import { AppIcon } from "./AppIcon";

interface CasksViewProps {
  casks: CaskItem[];
  outdatedList: OutdatedPackage[];
  unmanagedApps?: UnmanagedApp[];
  unmanagedAppsError?: string | null;
  isScanningUnmanaged?: boolean;
  onRefreshUnmanaged?: () => void;
  searchTerm: string;
  onUpgrade: (name: string) => void;
  onUninstall: (name: string) => void;
  onAdopt?: (token: string) => void;
  isActionRunning: boolean;
  isLoading?: boolean;
  selectedItem: InspectedItem;
  onSelectItem: (item: InspectedItem) => void;
  includeGreedy?: boolean;
  onToggleGreedy?: (val: boolean) => void;
  ignoredCasks?: string[];
  onToggleIgnoreCask?: (token: string) => void;
}

export const CasksView: React.FC<CasksViewProps> = ({
  casks,
  outdatedList,
  unmanagedApps = [],
  unmanagedAppsError = null,
  isScanningUnmanaged = false,
  onRefreshUnmanaged,
  searchTerm,
  onUpgrade,
  onUninstall,
  onAdopt,
  isActionRunning,
  isLoading,
  selectedItem,
  onSelectItem,
  includeGreedy = false,
  onToggleGreedy,
  ignoredCasks = [],
  onToggleIgnoreCask,
}) => {
  const [filterMode, setFilterMode] = useState<"all" | "outdated" | "unmanaged" | "ignored">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [caskToUninstall, setCaskToUninstall] = useState<string | null>(null);
  const [appToAdopt, setAppToAdopt] = useState<UnmanagedApp | null>(null);
  const outdatedMap = new Map(outdatedList.map((o) => [o.name, o]));

  const isCaskOutdated = (cask: CaskItem) => {
    return (
      outdatedMap.has(cask.token) ||
      cask.outdated ||
      Boolean(cask.installed && cask.installed !== cask.version)
    );
  };

  const filteredCasks = casks.filter((cask) => {
    const isIgnored = ignoredCasks.includes(cask.token);
    if (filterMode === "ignored") {
      if (!isIgnored) return false;
    } else {
      const isOutdated = isCaskOutdated(cask);
      if (filterMode === "outdated" && (!isOutdated || isIgnored)) return false;
    }

    const q = searchTerm.toLowerCase();
    const nameMatch = (cask.name || []).some((n) => n.toLowerCase().includes(q));
    const tokenMatch = cask.token.toLowerCase().includes(q);
    const descMatch = cask.desc?.toLowerCase().includes(q);
    return nameMatch || tokenMatch || descMatch;
  });

  const filteredUnmanaged = unmanagedApps.filter((app) => {
    const q = searchTerm.toLowerCase();
    const nameMatch = app.name.toLowerCase().includes(q);
    const tokenMatch = app.cask_token.toLowerCase().includes(q);
    const descMatch = (app.cask_desc || "").toLowerCase().includes(q);
    return nameMatch || tokenMatch || descMatch;
  });

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Control bar with Apple Segmented Control, Greedy Toggle & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Apple Segmented Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="apple-segmented-container">
            <button
              onClick={() => setFilterMode("all")}
              className={`apple-segmented-btn cursor-pointer ${
                filterMode === "all" ? "active" : ""
              }`}
            >
              All Applications ({casks.length})
            </button>
            <button
              onClick={() => setFilterMode("outdated")}
              className={`apple-segmented-btn cursor-pointer flex items-center gap-1.5 ${
                filterMode === "outdated" ? "active" : ""
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF9F0A]" />
              Updates ({casks.filter((c) => isCaskOutdated(c) && !ignoredCasks.includes(c.token)).length})
            </button>
            <button
              onClick={() => setFilterMode("unmanaged")}
              className={`apple-segmented-btn cursor-pointer flex items-center gap-1.5 ${
                filterMode === "unmanaged" ? "active" : ""
              }`}
              title="Desktop applications installed outside Homebrew that can be adopted"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#BF5AF2]" />
              Adopt Unmanaged ({unmanagedApps.length})
            </button>
            {ignoredCasks.length > 0 && (
              <button
                onClick={() => setFilterMode("ignored")}
                className={`apple-segmented-btn cursor-pointer flex items-center gap-1.5 ${
                  filterMode === "ignored" ? "active" : ""
                }`}
                title="Applications with ignored updates"
              >
                <BellOff className="w-3 h-3 text-zinc-400" />
                Ignored ({ignoredCasks.length})
              </button>
            )}
          </div>

          {/* Greedy Update Toggle */}
          {onToggleGreedy && (
            <button
              onClick={() => onToggleGreedy(!includeGreedy)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                includeGreedy
                  ? "bg-[#FF9F0A]/15 border-[#FF9F0A]/40 text-[#FF9F0A]"
                  : "bg-white/[0.04] border-white/8 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.07]"
              }`}
              title="Toggle --greedy: Include applications that manage their own updates or use latest tags"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Include auto-updating apps</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                  includeGreedy ? "bg-[#FF9F0A]/20 text-[#FF9F0A]" : "bg-white/10 text-zinc-400"
                }`}
              >
                {includeGreedy ? "ON" : "OFF"}
              </span>
            </button>
          )}
        </div>

        {/* View Mode & Count */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 font-mono">
            {filterMode === "unmanaged"
              ? `${filteredUnmanaged.length} adoptable apps`
              : `${filteredCasks.length} of ${casks.length} apps`}
          </span>

          <div className="apple-segmented-container">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white/[0.18] text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white/[0.18] text-white shadow-xs"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {filterMode === "unmanaged" ? (
        /* Unmanaged / Adoptable Apps View */
        unmanagedAppsError && filteredUnmanaged.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 border border-red-500/20 bg-red-500/5 rounded-2xl p-6">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-400" />
            <p className="text-sm font-semibold text-zinc-200">Failed to Scan Applications</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">{unmanagedAppsError}</p>
            {onRefreshUnmanaged && (
              <button
                onClick={onRefreshUnmanaged}
                disabled={isScanningUnmanaged}
                className="mt-4 px-4 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium border border-red-500/30 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isScanningUnmanaged ? "animate-spin" : ""}`} />
                {isScanningUnmanaged ? "Scanning..." : "Retry Scan"}
              </button>
            )}
          </div>
        ) : isScanningUnmanaged && filteredUnmanaged.length === 0 ? (
          <div className="py-24 text-center text-zinc-500 border border-white/5 rounded-2xl">
            <div className="w-8 h-8 mx-auto mb-3 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <p className="text-sm font-semibold text-zinc-300">Scanning /Applications...</p>
            <p className="text-xs text-zinc-500 mt-1">
              Matching installed desktop applications against the Homebrew cask catalog
            </p>
          </div>
        ) : filteredUnmanaged.length === 0 ? (
          <div className="py-24 text-center text-zinc-500 border border-dashed border-white/8 rounded-2xl">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-[#30D158] opacity-60" />
            <p className="text-sm font-semibold text-zinc-300">No unmanaged applications detected</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
              All detected desktop applications in /Applications are already managed by Homebrew or
              Apple native system services.
            </p>
            {onRefreshUnmanaged && (
              <button
                onClick={onRefreshUnmanaged}
                disabled={isScanningUnmanaged}
                className="mt-4 px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium border border-white/10 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isScanningUnmanaged ? "animate-spin" : ""}`} />
                Rescan Applications
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredUnmanaged.map((app) => (
              <div
                key={app.cask_token}
                className="p-4 rounded-xl apple-card flex flex-col justify-between group hover:border-[#BF5AF2]/30 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <AppIcon name={app.cask_token} desc={app.cask_desc} isCask={true} size="md" />
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-zinc-100 truncate group-hover:text-white transition-colors">
                          {app.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-zinc-500 truncate">
                            {app.cask_token}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {app.match_confidence === "artifact" && (
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          title="High confidence: Exact app bundle artifact match"
                        >
                          Exact
                        </span>
                      )}
                      {app.match_confidence === "bundle_id" && (
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                          title="High confidence: CFBundleIdentifier match"
                        >
                          Bundle ID
                        </span>
                      )}
                      {app.match_confidence === "token" && (
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-500/15 text-zinc-400 border border-zinc-500/30"
                          title="Heuristic match: App name to cask token"
                        >
                          Name
                        </span>
                      )}
                      <span className="text-[10px] font-medium font-mono px-2 py-0.5 rounded-full bg-[#BF5AF2]/15 text-[#BF5AF2] border border-[#BF5AF2]/30">
                        Unmanaged
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 mt-3 line-clamp-2 leading-relaxed">
                    {app.cask_desc || "Desktop application installed manually in /Applications."}
                  </p>

                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-zinc-500">
                      Local: <span className="text-zinc-300">{app.installed_version || "Detected"}</span>
                    </span>
                    <span className="text-zinc-500">
                      Cask: <span className="text-purple-300">{app.cask_version}</span>
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/6 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-zinc-600 truncate max-w-[140px]">
                    {app.path.replace("/Applications/", "")}
                  </span>

                  <button
                    onClick={() => setAppToAdopt(app)}
                    disabled={isActionRunning}
                    className="px-3 py-1.5 rounded-lg bg-[#BF5AF2] hover:bg-[#A845DB] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    title={`Review and adopt ${app.name} into Homebrew`}
                  >
                    <DownloadCloud className="w-3.5 h-3.5" />
                    Adopt into Homebrew
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/6 bg-[#18181c]/60 backdrop-blur-xl overflow-hidden shadow-xl shadow-black/20">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/6 bg-black/30 text-zinc-400 font-medium">
                  <th className="py-2.5 px-4 font-medium">Application</th>
                  <th className="py-2.5 px-4 font-medium">Cask Token</th>
                  <th className="py-2.5 px-4 font-medium">Match</th>
                  <th className="py-2.5 px-4 font-medium">Local Version</th>
                  <th className="py-2.5 px-4 font-medium">Cask Version</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {filteredUnmanaged.map((app) => (
                  <tr key={app.cask_token} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <AppIcon name={app.cask_token} desc={app.cask_desc} isCask={true} size="sm" />
                        <span className="font-medium text-zinc-200">{app.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-zinc-400">{app.cask_token}</td>
                    <td className="py-2.5 px-4">
                      {app.match_confidence === "artifact" && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Exact
                        </span>
                      )}
                      {app.match_confidence === "bundle_id" && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          Bundle ID
                        </span>
                      )}
                      {app.match_confidence === "token" && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
                          Name
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-zinc-300">
                      {app.installed_version || "Detected"}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-purple-300">{app.cask_version}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setAppToAdopt(app)}
                        disabled={isActionRunning}
                        className="px-3 py-1 rounded-lg bg-[#BF5AF2] hover:bg-[#A845DB] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title={`Review and adopt ${app.name} into Homebrew`}
                      >
                        <DownloadCloud className="w-3.5 h-3.5" />
                        Adopt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl apple-shimmer border border-white/6" />
          ))}
        </div>
      ) : filteredCasks.length === 0 ? (
        <div className="py-24 text-center text-zinc-500 border border-dashed border-white/8 rounded-2xl">
          <AppWindow className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-semibold text-zinc-400">No applications match your filter</p>
          <p className="text-xs text-zinc-600 mt-1">Try resetting the search or filter mode</p>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredCasks.map((cask) => {
            const isIgnored = ignoredCasks.includes(cask.token);
            const isVersionMismatch = Boolean(cask.installed && cask.installed !== cask.version);
            const isOutdated = isCaskOutdated(cask);
            const outdatedInfo = outdatedMap.get(cask.token);
            const installedVer = cask.installed || cask.version;
            const targetVer = outdatedInfo?.current_version || (isVersionMismatch ? cask.version : null);
            const displayName =
              cask.name && cask.name.length > 0 ? cask.name[0] : cask.token;

            const isSelected =
              selectedItem?.type === "cask" &&
              (selectedItem.data as CaskItem).token === cask.token;

            return (
              <div
                key={cask.token}
                onClick={() =>
                  onSelectItem({
                    type: "cask",
                    data: cask,
                    outdatedInfo,
                  })
                }
                className={`p-4 rounded-xl apple-card cursor-pointer flex flex-col justify-between group ${
                  isSelected ? "apple-card-selected ring-1 ring-[#0A84FF]/50" : ""
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <AppIcon
                        name={cask.token}
                        desc={cask.desc}
                        isCask={true}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-zinc-100 truncate group-hover:text-white transition-colors">
                          {displayName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-zinc-500 truncate">
                            {cask.token}
                          </span>
                          {cask.auto_updates && (
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-medium"
                              title="Self-updating application (Homebrew skips unless greedy updates enabled)"
                            >
                              Self-updating
                            </span>
                          )}
                          {isIgnored && (
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded-md bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 font-mono font-medium"
                              title="Updates are ignored for this application"
                            >
                              Ignored
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isIgnored ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium font-mono px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400 border border-zinc-500/25 shrink-0">
                        <BellOff className="w-3 h-3" />
                        Ignored
                      </span>
                    ) : isOutdated ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium font-mono px-2 py-0.5 rounded-full bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/30 shrink-0">
                        <ArrowUpCircle className="w-3 h-3" />
                        Update
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium font-mono px-2 py-0.5 rounded-full bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20 shrink-0">
                        <CheckCircle className="w-3 h-3" />
                        Latest
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 mt-3 line-clamp-2 leading-relaxed">
                    {cask.desc || "No description provided."}
                  </p>

                  {/* Version Tag */}
                  <div className="mt-3 flex items-center gap-2 text-xs font-mono">
                    <span className="text-zinc-500">v{installedVer}</span>
                    {isOutdated && targetVer && targetVer !== installedVer && (
                      <>
                        <span className="text-zinc-600">&rarr;</span>
                        <span className="text-[#FF9F0A] font-semibold">
                          v{targetVer}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-white/6 flex items-center justify-between">
                  {cask.homepage ? (
                    <a
                      href={cask.homepage}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-zinc-500 hover:text-blue-400 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-2">
                    {onToggleIgnoreCask && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleIgnoreCask(cask.token);
                        }}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isIgnored
                            ? "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                        }`}
                        title={isIgnored ? "Stop ignoring updates" : "Ignore updates for this app"}
                      >
                        {isIgnored ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {isOutdated && !isIgnored && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpgrade(cask.token);
                        }}
                        className="px-3 py-1 apple-btn-primary text-xs font-semibold cursor-pointer"
                      >
                        Update
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCaskToUninstall(cask.token);
                      }}
                      disabled={isActionRunning}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40"
                      title={`Remove ${displayName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl border border-white/6 bg-[#18181c]/60 backdrop-blur-xl overflow-hidden shadow-xl shadow-black/20">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/6 bg-black/30 text-zinc-400 font-medium">
                <th className="py-2.5 px-4 font-medium">Name</th>
                <th className="py-2.5 px-4 font-medium">Token</th>
                <th className="py-2.5 px-4 font-medium">Version</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {filteredCasks.map((cask) => {
                const isIgnored = ignoredCasks.includes(cask.token);
                const isVersionMismatch = Boolean(cask.installed && cask.installed !== cask.version);
                const isOutdated = isCaskOutdated(cask);
                const outdatedInfo = outdatedMap.get(cask.token);
                const installedVer = cask.installed || cask.version;
                const targetVer = outdatedInfo?.current_version || (isVersionMismatch ? cask.version : null);
                const displayName =
                  cask.name && cask.name.length > 0 ? cask.name[0] : cask.token;

                const isSelected =
                  selectedItem?.type === "cask" &&
                  (selectedItem.data as CaskItem).token === cask.token;

                return (
                  <tr
                    key={cask.token}
                    onClick={() =>
                      onSelectItem({
                        type: "cask",
                        data: cask,
                        outdatedInfo,
                      })
                    }
                    className={`hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                      isSelected ? "bg-[#0A84FF]/10 text-white" : ""
                    }`}
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <AppIcon
                          name={cask.token}
                          desc={cask.desc}
                          isCask={true}
                          size="sm"
                        />
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-zinc-200 group-hover:text-white truncate">
                            {displayName}
                          </span>
                          {cask.auto_updates && (
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-medium shrink-0"
                              title="Self-updating application"
                            >
                              Self-updating
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-zinc-500">
                      {cask.token}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-zinc-400">
                      <span>v{installedVer}</span>
                      {isOutdated && targetVer && targetVer !== installedVer && (
                        <span className="text-[#FF9F0A] ml-1.5 font-semibold">
                          &rarr; v{targetVer}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {isIgnored ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 px-2 py-0.5 rounded-full">
                          Ignored
                        </span>
                      ) : isOutdated ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#FF9F0A] bg-[#FF9F0A]/10 border border-[#FF9F0A]/20 px-2 py-0.5 rounded-full">
                          Upgrade ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#30D158] bg-[#30D158]/10 border border-[#30D158]/20 px-2 py-0.5 rounded-full">
                          Up to date
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {onToggleIgnoreCask && (
                          <button
                            onClick={() => onToggleIgnoreCask(cask.token)}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              isIgnored
                                ? "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                            }`}
                            title={isIgnored ? "Stop ignoring updates" : "Ignore updates for this app"}
                          >
                            {isIgnored ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {isOutdated && !isIgnored && (
                          <button
                            onClick={() => onUpgrade(cask.token)}
                            className="px-2.5 py-0.5 apple-btn-primary text-[11px] cursor-pointer"
                          >
                            Update
                          </button>
                        )}
                        <button
                          onClick={() => setCaskToUninstall(cask.token)}
                          disabled={isActionRunning}
                          className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40"
                          title={`Remove ${displayName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal */}
      {caskToUninstall && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1c20] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-zinc-100">
                  Uninstall Application?
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Are you sure you want to uninstall{" "}
                  <span className="font-mono text-zinc-200 font-semibold">{caskToUninstall}</span>?
                  This will remove the application bundle from your system.
                </p>
                <p className="text-[11px] text-amber-400/90 mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 leading-normal">
                  Note: Apps with system daemons, launch agents, or protected files will prompt for macOS administrator authorization.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setCaskToUninstall(null)}
                className="px-3.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const target = caskToUninstall;
                  setCaskToUninstall(null);
                  onUninstall(target);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Uninstall
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adopt Confirmation Modal */}
      {appToAdopt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1c20] border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#BF5AF2]/15 border border-[#BF5AF2]/30 text-[#BF5AF2]">
                <DownloadCloud className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-zinc-100">
                  Adopt Application into Homebrew?
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Homebrew will take over management of{" "}
                  <span className="text-zinc-200 font-semibold">{appToAdopt.name}</span> by linking the existing app bundle to the official cask formula.
                </p>
              </div>
            </div>

            <div className="bg-black/30 rounded-xl p-3.5 space-y-2 border border-white/6 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-zinc-500">Cask Token</span>
                <span className="font-mono text-purple-300 font-medium">{appToAdopt.cask_token}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-zinc-500">Source Tap</span>
                <span className="font-mono text-zinc-300">homebrew/cask (official)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-zinc-500">Existing Bundle</span>
                <span className="font-mono text-zinc-400 truncate max-w-[240px]" title={appToAdopt.path}>{appToAdopt.path}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-zinc-500">Version</span>
                <span className="font-mono text-zinc-300">
                  {appToAdopt.installed_version || "Detected"} &rarr; <span className="text-purple-300 font-semibold">{appToAdopt.cask_version}</span>
                </span>
              </div>
              {appToAdopt.cask_homepage && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-500">Homepage</span>
                  <a
                    href={appToAdopt.cask_homepage}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#0A84FF] hover:underline flex items-center gap-1 font-mono truncate max-w-[240px]"
                  >
                    <span>{appToAdopt.cask_homepage}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            <div className="bg-white/[0.03] rounded-lg p-2.5 font-mono text-[11px] text-zinc-400 flex items-center justify-between border border-white/5">
              <span className="text-zinc-500">$</span>
              <span className="text-zinc-200 select-all">brew install --cask --adopt {appToAdopt.cask_token}</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setAppToAdopt(null)}
                className="px-3.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const target = appToAdopt.cask_token;
                  setAppToAdopt(null);
                  if (onAdopt) onAdopt(target);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#BF5AF2] hover:bg-[#A845DB] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                Confirm & Adopt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
