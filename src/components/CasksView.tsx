import React from "react";
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
}

export const CasksView: React.FC<CasksViewProps> = ({
  casks,
  outdatedList,
  searchTerm,
  onUpgrade,
  onUninstall,
  isActionRunning,
}) => {
  const outdatedMap = new Map(outdatedList.map((o) => [o.name, o]));

  const filteredCasks = casks.filter((cask) => {
    const q = searchTerm.toLowerCase();
    const nameMatch = (cask.name || []).some((n) => n.toLowerCase().includes(q));
    const tokenMatch = cask.token.toLowerCase().includes(q);
    const descMatch = cask.desc?.toLowerCase().includes(q);
    return nameMatch || tokenMatch || descMatch;
  });

  return (
    <div className="p-6 space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredCasks.length}</span> of{" "}
          {casks.length} applications
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {outdatedList.length} updates available
          </span>
        </div>
      </div>

      {filteredCasks.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <AppWindow className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No applications match your search</p>
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
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 dark:from-blue-500/30 dark:to-indigo-500/20 border border-blue-500/20 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-base shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {displayName}
                        </h4>
                        <span className="text-[11px] font-mono text-slate-400 truncate block">
                          {cask.token}
                        </span>
                      </div>
                    </div>

                    {isOutdated ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0">
                        <ArrowUpCircle className="w-3 h-3" />
                        Update
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                        <CheckCircle className="w-3 h-3" />
                        Current
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed min-h-[32px]">
                    {cask.desc || "No description provided."}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-500 font-mono truncate max-w-[140px]">
                    v{cask.version}
                    {isOutdated && outdatedInfo && (
                      <span className="text-amber-600 dark:text-amber-400 ml-1">
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
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        title="Visit Homepage"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {isOutdated && (
                      <button
                        onClick={() => onUpgrade(cask.token)}
                        disabled={isActionRunning}
                        className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-medium shadow-xs transition-colors cursor-pointer disabled:opacity-50"
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
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50"
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
