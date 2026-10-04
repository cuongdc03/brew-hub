import React, { useState } from "react";
import {
  X,
  ExternalLink,
  ArrowUpCircle,
  Trash2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { CaskItem, FormulaItem, OutdatedPackage } from "../types/brew";
import { AppIcon } from "./AppIcon";

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
  const [showConfirm, setShowConfirm] = useState(false);
  if (!item) return null;

  const isCask = item.type === "cask";
  const caskData = isCask ? (item.data as CaskItem) : null;
  const formulaData = !isCask ? (item.data as FormulaItem) : null;

  const name = isCask
    ? caskData?.name?.[0] || caskData?.token || ""
    : formulaData?.name || "";
  const token = isCask
    ? caskData?.token || ""
    : formulaData?.name || "";
  const desc = item.data.desc;
  const homepage = item.data.homepage;

  const installedVer = isCask
    ? caskData?.installed || caskData?.version || "—"
    : formulaData?.linked_keg ||
      (formulaData?.installed && formulaData.installed.length > 0
        ? formulaData.installed[formulaData.installed.length - 1].version
        : formulaData?.versions?.stable || "—");

  const latestVer = isCask
    ? item.outdatedInfo?.current_version || caskData?.version || installedVer
    : item.outdatedInfo?.current_version || formulaData?.versions?.stable || installedVer;

  const isVersionMismatch = Boolean(
    isCask && caskData?.installed && caskData?.version && caskData.installed !== caskData.version
  );
  const isOutdated = Boolean(item.outdatedInfo || item.data.outdated || isVersionMismatch);

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
          <AppIcon
            name={token}
            desc={desc}
            isCask={isCask}
            size="lg"
          />
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
          onClick={() => setShowConfirm(true)}
          disabled={isActionRunning}
          className="w-full py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Uninstall Package
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1c20] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-zinc-100">
                  Uninstall {isCask ? "Application" : "Formula"}?
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Are you sure you want to uninstall{" "}
                  <span className="font-mono text-zinc-200 font-semibold">{name}</span>?
                  This will remove the package binaries and associated files from your machine.
                </p>
                {isCask && (
                  <p className="text-[11px] text-amber-400/90 mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 leading-normal">
                    Note: Applications with launch services or root files will prompt for macOS administrator authorization.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  onUninstall(token, isCask);
                  onClose();
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
    </aside>
  );
};
