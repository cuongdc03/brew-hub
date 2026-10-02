import React, { useState } from "react";
import {
  ExternalLink,
  Trash2,
  ArrowUpCircle,
  Terminal,
  CheckCircle,
  Layers,
} from "lucide-react";
import { FormulaItem, OutdatedPackage } from "../types/brew";

interface FormulaeViewProps {
  formulae: FormulaItem[];
  outdatedList: OutdatedPackage[];
  searchTerm: string;
  onUpgrade: (name: string) => void;
  onUninstall: (name: string) => void;
  isActionRunning: boolean;
}

export const FormulaeView: React.FC<FormulaeViewProps> = ({
  formulae,
  outdatedList,
  searchTerm,
  onUpgrade,
  onUninstall,
  isActionRunning,
}) => {
  const [onlyOutdated, setOnlyOutdated] = useState(false);
  const outdatedMap = new Map(outdatedList.map((o) => [o.name, o]));

  const filtered = formulae.filter((item) => {
    const isOutdated = outdatedMap.has(item.name) || item.outdated;
    if (onlyOutdated && !isOutdated) return false;

    const q = searchTerm.toLowerCase();
    const nameMatch = item.name.toLowerCase().includes(q);
    const descMatch = item.desc?.toLowerCase().includes(q);
    return nameMatch || descMatch;
  });

  return (
    <div className="p-6 space-y-4">
      {/* Filter and stats row */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</span> of{" "}
          {formulae.length} CLI formulae
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyOutdated}
              onChange={(e) => setOnlyOutdated(e.target.checked)}
              className="rounded border-slate-300 text-amber-500 focus:ring-amber-500/20"
            />
            <span>Show updates only ({outdatedList.length})</span>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <Terminal className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No formulae found</p>
        </div>
      ) : (
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Formula Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Installed Version</th>
                <th className="py-3 px-4">Dependencies</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((item) => {
                const isOutdated = outdatedMap.has(item.name) || item.outdated;
                const outdatedInfo = outdatedMap.get(item.name);
                const installedVer =
                  item.installed && item.installed.length > 0
                    ? item.installed[0].version
                    : item.versions?.stable || "Unknown";

                return (
                  <tr
                    key={item.name}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-850/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        {item.license && (
                          <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/50 dark:border-slate-700/50">
                            {item.license}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-sm truncate">
                      {item.desc || "—"}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      {isOutdated ? (
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                          <span>{installedVer}</span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className="font-semibold">
                            {outdatedInfo?.current_version || item.versions?.stable}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          <span>{installedVer}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {item.dependencies && item.dependencies.length > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {item.dependencies.length} deps
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.homepage && (
                          <a
                            href={item.homepage}
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
                            onClick={() => onUpgrade(item.name)}
                            disabled={isActionRunning}
                            className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Upgrade
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (confirm(`Uninstall formula ${item.name}?`)) {
                              onUninstall(item.name);
                            }
                          }}
                          disabled={isActionRunning}
                          className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50"
                          title="Uninstall"
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
    </div>
  );
};
