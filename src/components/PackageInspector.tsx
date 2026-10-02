import React from "react";
import {
  X,
  ExternalLink,
  ArrowUpCircle,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { CaskItem, FormulaItem, OutdatedPackage } from "../types/brew";

export type InspectedItem =
  | { type: "cask"; data: CaskItem; outdatedInfo?: OutdatedPackage }
  | { type: "formula"; data: FormulaItem; outdatedInfo?: OutdatedPackage }
  | null;

interface PackageInspectorProps {
  item: InspectedItem;
  onClose: () => void;
  onUpgrade: (name: string, isCask: boolean) => void;
  onUninstall: (name: string, isCask: boolean) => void;
  isActionRunning: boolean;
}

export const PackageInspector: React.FC<PackageInspectorProps> = ({
  item,
  onClose,
  onUpgrade,
  onUninstall,
  isActionRunning,
}) => {
  if (!item) return null;

  const isCask = item.type === "cask";
  const name = isCask
    ? (item.data as CaskItem).name?.[0] || (item.data as CaskItem).token
    : (item.data as FormulaItem).name;
  const token = isCask
    ? (item.data as CaskItem).token
    : (item.data as FormulaItem).name;
  const desc = item.data.desc;
  const homepage = item.data.homepage;
  const isOutdated = Boolean(item.outdatedInfo || item.data.outdated);

  const installedVer = isCask
    ? (item.data as CaskItem).version
    : (item.data as FormulaItem).installed?.[0]?.version ||
      (item.data as FormulaItem).versions?.stable ||
      "—";

  const latestVer = item.outdatedInfo?.current_version || installedVer;

  const dependencies = !isCask
    ? (item.data as FormulaItem).dependencies || []
    : [];

  const license = !isCask ? (item.data as FormulaItem).license : null;

  return (
    <aside className="w-80 border-l border-white/8 bg-[#18181c]/90 backdrop-blur-2xl flex flex-col justify-between z-20 shadow-2xl animate-in slide-in-from-right duration-200 select-none">
      <div className="overflow-y-auto p-5 space-y-6">
        {/* Header & Close */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 font-mono">
            {isCask ? "Application Details" : "Formula Details"}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
            title="Close Inspector (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Identity */}
        <div className="flex items-center gap-3.5">
          <div
            className={`w-14 h-14 app-squircle flex items-center justify-center font-bold text-xl text-white shadow-lg shrink-0 ${
              isCask
                ? "bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400"
                : "bg-gradient-to-tr from-purple-600 via-violet-600 to-fuchsia-400"
            }`}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base text-zinc-100 tracking-tight truncate leading-snug">
              {name}
            </h3>
            <p className="font-mono text-xs text-zinc-400 truncate">{token}</p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="space-y-2">
          {isOutdated ? (
            <button
              onClick={() => onUpgrade(token, isCask)}
              disabled={isActionRunning}
              className="w-full py-2 apple-btn-primary flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer shadow-md disabled:opacity-50"
            >
              <ArrowUpCircle className="w-4 h-4" />
              Update to v{latestVer}
            </button>
          ) : (
            <div className="w-full py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center justify-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Up to date
            </div>
          )}

          {homepage && (
            <a
              href={homepage}
              target="_blank"
              rel="noreferrer"
              className="w-full py-1.5 apple-btn-secondary flex items-center justify-center gap-1.5 text-xs text-zinc-300 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Visit Homepage
            </a>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            About
          </label>
          <p className="text-xs text-zinc-300 leading-relaxed">
            {desc || "No description provided by Homebrew."}
          </p>
        </div>

        {/* Specs Table */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Information
          </label>
          <div className="rounded-xl border border-white/6 bg-white/[0.03] divide-y divide-white/4 text-xs font-medium">
            <div className="p-2.5 flex justify-between items-center">
              <span className="text-zinc-400">Installed Version</span>
              <span className="font-mono text-zinc-200">{installedVer}</span>
            </div>

            <div className="p-2.5 flex justify-between items-center">
              <span className="text-zinc-400">Latest Version</span>
              <span className="font-mono text-zinc-200">{latestVer}</span>
            </div>

            {license && (
              <div className="p-2.5 flex justify-between items-center">
                <span className="text-zinc-400">License</span>
                <span className="text-zinc-200">{license}</span>
              </div>
            )}

            <div className="p-2.5 flex justify-between items-center">
              <span className="text-zinc-400">Type</span>
              <span className="capitalize text-zinc-200">{item.type}</span>
            </div>
          </div>
        </div>

        {/* Dependencies */}
        {dependencies.length > 0 && (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Dependencies</span>
              <span className="font-mono text-zinc-500">{dependencies.length}</span>
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
              {dependencies.map((dep) => (
                <span
                  key={dep}
                  className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/6 font-mono text-[11px] text-zinc-300"
                >
                  {dep}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Destructive Action */}
      <div className="p-4 border-t border-white/6 bg-black/20">
        <button
          onClick={() => {
            if (confirm(`Are you sure you want to uninstall ${name}?`)) {
              onUninstall(token, isCask);
              onClose();
            }
          }}
          disabled={isActionRunning}
          className="w-full py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Uninstall Package
        </button>
      </div>
    </aside>
  );
};
