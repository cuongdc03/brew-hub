import { useState } from "react";
import {
  ExternalLink,
  Trash2,
  ArrowUpCircle,
  AppWindow,
  CheckCircle,
} from "lucide-react";
import { CaskItem, OutdatedPackage } from "../types/brew";

interface CasksViewProps {
  casks: CaskItem[];
  outdatedList: OutdatedPackage[];
  searchTerm: string;
  onUpgrade: (name: string) => void;
  onUninstall: (name: string) => void;
  isActionRunning: boolean;
  isLoading?: boolean;
}

export const CasksView: React.FC<CasksViewProps> = ({
  casks,
  outdatedList,
  searchTerm,
  onUpgrade,
  onUninstall,
  isActionRunning,
  isLoading,
}) => {
  const [filterMode, setFilterMode] = useState<"all" | "outdated">("all");
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
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/80 border border-white/6 shadow-inner">
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filterMode === "all"
                ? "bg-zinc-800 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All Applications ({casks.length})
          </button>
          <button
            onClick={() => setFilterMode("outdated")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              filterMode === "outdated"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Updates Available ({outdatedList.length})
          </button>
        </div>

        <div className="text-xs text-zinc-400 font-mono">
          Showing <span className="text-zinc-200 font-semibold">{filteredCasks.length}</span> apps
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl glass-card animate-shimmer" />
          ))}
        </div>
      ) : filteredCasks.length === 0 ? (
        <div className="py-24 text-center text-zinc-500 border border-dashed border-white/8 rounded-2xl">
          <AppWindow className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-semibold text-zinc-400">No applications match your criteria</p>
          <p className="text-xs text-zinc-600 mt-1">Try adjusting your search query or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCasks.map((cask) => {
            const isOutdated = outdatedMap.has(cask.token) || cask.outdated;
            const outdatedInfo = outdatedMap.get(cask.token);
            const displayName =
              cask.name && cask.name.length > 0 ? cask.name[0] : cask.token;

            return (
              <div
                key={cask.token}
                className="p-5 rounded-2xl border border-white/6 bg-gradient-to-b from-zinc-900/60 to-zinc-950/60 backdrop-blur-xl shadow-lg shadow-black/20 hover:border-white/12 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20 flex items-center justify-center font-bold text-base shrink-0 ring-1 ring-white/20">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-zinc-100 tracking-tight truncate group-hover:text-amber-400 transition-colors">
                          {displayName}
                        </h4>
                        <span className="text-[11px] font-mono text-zinc-500 truncate block">
                          {cask.token}
                        </span>
                      </div>
                    </div>

                    {isOutdated ? (
                      <span className="text-[10px] font-medium font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                        <ArrowUpCircle className="w-3 h-3" />
                        Update
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
                        <CheckCircle className="w-3 h-3" />
                        Latest
                      </span>
                    )}
                  </div>

                  <p className="mt-3.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed min-h-[34px]">
                    {cask.desc || "No description provided for this cask."}
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-white/6 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-zinc-500 font-mono truncate max-w-[150px]">
                    v{cask.version}
                    {isOutdated && outdatedInfo && (
                      <span className="text-amber-400 font-semibold ml-1">
                        &rarr; {outdatedInfo.current_version}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {cask.homepage && (
                      <a
                        href={cask.homepage}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/6 transition-colors"
                        title="Open Official Homepage"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {isOutdated && (
                      <button
                        onClick={() => onUpgrade(cask.token)}
                        disabled={isActionRunning}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Upgrade
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to uninstall ${displayName}?`)) {
                          onUninstall(cask.token);
                        }
                      }}
                      disabled={isActionRunning}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                      title="Uninstall Cask"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
