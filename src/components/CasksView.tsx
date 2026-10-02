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
} from "lucide-react";
import { CaskItem, OutdatedPackage } from "../types/brew";
import { InspectedItem } from "./PackageInspector";
import { AppIcon } from "./AppIcon";

interface CasksViewProps {
  casks: CaskItem[];
  outdatedList: OutdatedPackage[];
  searchTerm: string;
  onUpgrade: (name: string) => void;
  onUninstall: (name: string) => void;
  isActionRunning: boolean;
  isLoading?: boolean;
  selectedItem: InspectedItem;
  onSelectItem: (item: InspectedItem) => void;
}

export const CasksView: React.FC<CasksViewProps> = ({
  casks,
  outdatedList,
  searchTerm,
  onUpgrade,
  onUninstall,
  isActionRunning,
  isLoading,
  selectedItem,
  onSelectItem,
}) => {
  const [filterMode, setFilterMode] = useState<"all" | "outdated">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [caskToUninstall, setCaskToUninstall] = useState<string | null>(null);
  const outdatedMap = new Map(outdatedList.map((o) => [o.name, o]));

  const filteredCasks = casks.filter((cask) => {
    const isOutdated = outdatedMap.has(cask.token) || cask.outdated;
    if (filterMode === "outdated" && !isOutdated) return false;

    const q = searchTerm.toLowerCase();
    const nameMatch = (cask.name || []).some((n) => n.toLowerCase().includes(q));
    const tokenMatch = cask.token.toLowerCase().includes(q);
    const descMatch = cask.desc?.toLowerCase().includes(q);
    return nameMatch || tokenMatch || descMatch;
  });

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Control bar with Apple Segmented Control & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Apple Segmented Pills */}
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
            Updates ({outdatedList.length})
          </button>
        </div>

        {/* View Mode & Count */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 font-mono">
            {filteredCasks.length} of {casks.length} apps
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

      {isLoading ? (
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
            const isOutdated = outdatedMap.has(cask.token) || cask.outdated;
            const outdatedInfo = outdatedMap.get(cask.token);
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
                        <h4 className="font-semibold text-sm text-zinc-100 tracking-tight truncate group-hover:text-[#0A84FF] transition-colors">
                          {displayName}
                        </h4>
                        <span className="text-[11px] font-mono text-zinc-500 truncate block">
                          {cask.token}
                        </span>
                      </div>
                    </div>

                    {isOutdated ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/30 flex items-center gap-1 shrink-0">
                        <ArrowUpCircle className="w-3 h-3" />
                        Update
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20 flex items-center gap-1 shrink-0">
                        <CheckCircle className="w-3 h-3" />
                        Latest
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-zinc-400 line-clamp-2 leading-relaxed min-h-[32px]">
                    {cask.desc || "macOS application"}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-white/6 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-zinc-500 font-mono truncate max-w-[140px]">
                    v{cask.version}
                    {isOutdated && outdatedInfo && (
                      <span className="text-[#FF9F0A] font-medium ml-1">
                        &rarr; {outdatedInfo.current_version}
                      </span>
                    )}
                  </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {cask.homepage && (
                      <a
                        href={cask.homepage}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
                        title="Open Homepage"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {isOutdated && (
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
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Table View */
        <div className="border border-white/6 rounded-xl bg-[#18181c]/60 backdrop-blur-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/20 border-b border-white/6 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Application</th>
                <th className="py-2.5 px-4">Identifier</th>
                <th className="py-2.5 px-4">Version</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {filteredCasks.map((cask) => {
                const isOutdated = outdatedMap.has(cask.token) || cask.outdated;
                const outdatedInfo = outdatedMap.get(cask.token);
                const displayName =
                  cask.name && cask.name.length > 0 ? cask.name[0] : cask.token;

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
                    className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-4 font-semibold text-zinc-200 flex items-center gap-2.5">
                      <AppIcon
                        name={cask.token}
                        desc={cask.desc}
                        isCask={true}
                        size="sm"
                      />
                      <span className="group-hover:text-[#0A84FF] transition-colors truncate">
                        {displayName}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-zinc-500">{cask.token}</td>
                    <td className="py-2.5 px-4 font-mono text-zinc-400">
                      v{cask.version}
                      {isOutdated && outdatedInfo && (
                        <span className="text-[#FF9F0A] ml-1">
                          &rarr; {outdatedInfo.current_version}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {isOutdated ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/30">
                          Update Available
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#30D158]/10 text-[#30D158]">
                          Up to date
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {isOutdated && (
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
    </div>
  );
};
