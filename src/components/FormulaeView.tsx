import { useState } from "react";
import {
  ExternalLink,
  ArrowUpCircle,
  Terminal,
  CheckCircle,
  Layers,
} from "lucide-react";
import { FormulaItem, OutdatedPackage } from "../types/brew";
import { InspectedItem } from "./PackageInspector";
import { AppIcon } from "./AppIcon";

interface FormulaeViewProps {
  formulae: FormulaItem[];
  outdatedList: OutdatedPackage[];
  searchTerm: string;
  onUpgrade: (name: string) => void;
  onUninstall: (name: string) => void;
  isActionRunning: boolean;
  isLoading?: boolean;
  selectedItem: InspectedItem;
  onSelectItem: (item: InspectedItem) => void;
}

export const FormulaeView: React.FC<FormulaeViewProps> = ({
  formulae,
  outdatedList,
  searchTerm,
  onUpgrade,
  isLoading,
  selectedItem,
  onSelectItem,
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
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Control row with Apple Segmented Control */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="apple-segmented-container">
          <button
            onClick={() => setFilterMode("all")}
            className={`apple-segmented-btn cursor-pointer ${
              filterMode === "all" ? "active" : ""
            }`}
          >
            All Formulae ({formulae.length})
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

        <div className="text-xs text-zinc-500 font-mono">
          {filtered.length} of {formulae.length} packages
        </div>
      </div>

      {isLoading ? (
        <div className="border border-white/6 rounded-xl p-6 apple-shimmer h-80" />
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center text-zinc-500 border border-dashed border-white/8 rounded-2xl">
          <Terminal className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-semibold text-zinc-400">No formulae found</p>
          <p className="text-xs text-zinc-600 mt-1">Try modifying your search or filter</p>
        </div>
      ) : (
        <div className="border border-white/6 rounded-xl bg-[#18181c]/60 backdrop-blur-xl overflow-hidden shadow-xl shadow-black/20">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/20 border-b border-white/6 text-zinc-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Formula</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Version Status</th>
                <th className="py-2.5 px-4">Dependencies</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
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

                const isSelected =
                  selectedItem?.type === "formula" &&
                  (selectedItem.data as FormulaItem).name === item.name;

                return (
                  <tr
                    key={item.name}
                    onClick={() =>
                      onSelectItem({
                        type: "formula",
                        data: item,
                        outdatedInfo,
                      })
                    }
                    className={`hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                      isSelected ? "bg-[#0A84FF]/10 ring-1 ring-[#0A84FF]/40" : ""
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono font-semibold text-zinc-200">
                      <div className="flex items-center gap-2.5">
                        <AppIcon name={item.name} desc={item.desc} isCask={false} size="sm" />
                        <span className="group-hover:text-[#0A84FF] transition-colors">
                          {item.name}
                        </span>
                        {item.license && (
                          <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-white/[0.06] text-zinc-400 border border-white/5">
                            {item.license}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-4 text-zinc-400 max-w-sm truncate leading-relaxed">
                      {item.desc || "—"}
                    </td>

                    <td className="py-2.5 px-4 font-mono">
                      {isOutdated ? (
                        <div className="flex items-center gap-1.5 text-[#FF9F0A]">
                          <ArrowUpCircle className="w-3.5 h-3.5 text-[#FF9F0A] shrink-0" />
                          <span>{installedVer}</span>
                          <span className="text-zinc-600">&rarr;</span>
                          <span className="font-semibold text-[#FF9F0A]">
                            {outdatedInfo?.current_version || item.versions?.stable}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <CheckCircle className="w-3.5 h-3.5 text-[#30D158] shrink-0" />
                          <span>{installedVer}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-zinc-400">
                      {item.dependencies && item.dependencies.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 bg-white/[0.05] px-2 py-0.5 rounded-md text-[11px] font-mono border border-white/5">
                          <Layers className="w-3 h-3 text-zinc-500" />
                          {item.dependencies.length} deps
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {item.homepage && (
                          <a
                            href={item.homepage}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
                            title="Visit Homepage"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {isOutdated && (
                          <button
                            onClick={() => onUpgrade(item.name)}
                            className="px-2.5 py-0.5 apple-btn-primary text-[11px] cursor-pointer"
                          >
                            Update
                          </button>
                        )}
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
