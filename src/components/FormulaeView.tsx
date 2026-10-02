import { useState } from "react";
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
  isLoading?: boolean;
}

export const FormulaeView: React.FC<FormulaeViewProps> = ({
  formulae,
  outdatedList,
  searchTerm,
  onUpgrade,
  onUninstall,
  isActionRunning,
  isLoading,
}) => {
  const [filterMode, setFilterMode] = useState<"all" | "outdated">("all");
  const outdatedMap = new Map(outdatedList.map((o) => [o.name, o]));

  const filtered = formulae.filter((item) => {
    const isOutdated = outdatedMap.has(item.name) || item.outdated;
    if (filterMode === "outdated" && !isOutdated) return false;

    const q = searchTerm.toLowerCase();
    const nameMatch = item.name.toLowerCase().includes(q);
    const descMatch = item.desc?.toLowerCase().includes(q);
    return nameMatch || descMatch;
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Control row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/80 border border-white/6 shadow-inner">
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filterMode === "all"
                ? "bg-zinc-800 text-white shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All Formulae ({formulae.length})
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
          Showing <span className="text-zinc-200 font-semibold">{filtered.length}</span> packages
        </div>
      </div>

      {isLoading ? (
        <div className="border border-white/6 rounded-2xl p-6 glass-card animate-shimmer h-80" />
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center text-zinc-500 border border-dashed border-white/8 rounded-2xl">
          <Terminal className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-semibold text-zinc-400">No formulae found</p>
          <p className="text-xs text-zinc-600 mt-1">Try modifying your search or filter</p>
        </div>
      ) : (
        <div className="border border-white/6 rounded-2xl bg-zinc-900/60 backdrop-blur-xl overflow-hidden shadow-lg shadow-black/20">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/60 border-b border-white/6 text-zinc-400 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Formula Name</th>
                <th className="py-3.5 px-5">Description</th>
                <th className="py-3.5 px-5">Version Status</th>
                <th className="py-3.5 px-5">Dependencies</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
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
                    className="hover:bg-white/4 transition-colors group"
                  >
                    <td className="py-3.5 px-5 font-mono font-bold text-zinc-200">
                      <div className="flex items-center gap-2">
                        <span className="group-hover:text-amber-400 transition-colors">
                          {item.name}
                        </span>
                        {item.license && (
                          <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5">
                            {item.license}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-5 text-zinc-400 max-w-sm truncate leading-relaxed">
                      {item.desc || "—"}
                    </td>

                    <td className="py-3.5 px-5 font-mono">
                      {isOutdated ? (
                        <div className="flex items-center gap-1.5 text-amber-300">
                          <ArrowUpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{installedVer}</span>
                          <span className="text-zinc-600">&rarr;</span>
                          <span className="font-semibold text-amber-400">
                            {outdatedInfo?.current_version || item.versions?.stable}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{installedVer}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-zinc-400">
                      {item.dependencies && item.dependencies.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 bg-zinc-800/80 px-2 py-0.5 rounded-lg text-[11px] font-mono border border-white/5">
                          <Layers className="w-3 h-3 text-zinc-500" />
                          {item.dependencies.length} deps
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.homepage && (
                          <a
                            href={item.homepage}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/6 transition-colors"
                            title="Visit Homepage"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {isOutdated && (
                          <button
                            onClick={() => onUpgrade(item.name)}
                            disabled={isActionRunning}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
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
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
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
