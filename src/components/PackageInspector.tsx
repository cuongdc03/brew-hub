import React, { useState } from "react";
import {
  X,
  ExternalLink,
  ArrowUpCircle,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Pin,
  PinOff,
  Bell,
  BellOff,
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
  onTogglePin?: (name: string, isPinned: boolean) => void;
  ignoredCasks?: string[];
  onToggleIgnoreCask?: (token: string) => void;
  isActionRunning: boolean;
}

export const PackageInspector: React.FC<PackageInspectorProps> = ({
  item,
  onClose,
  onUpgrade,
  onUninstall,
  onTogglePin,
  ignoredCasks = [],
  onToggleIgnoreCask,
  isActionRunning,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
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

  const isPinned = !isCask && Boolean((item.data as FormulaItem).pinned);
  const isAutoUpdates = isCask && Boolean((item.data as CaskItem).auto_updates);
  const isIgnored = isCask && ignoredCasks.includes(token);

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
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <p className="font-mono text-xs text-zinc-400 truncate">{token}</p>
              {isPinned && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                  📌 Pinned
                </span>
              )}
              {isAutoUpdates && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                  Self-updating
                </span>
              )}
              {isIgnored && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 font-medium">
                  Ignored
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="space-y-2">
          {isOutdated ? (
            isPinned ? (
              <div className="w-full py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium flex items-center justify-center gap-2">
                <Pin className="w-3.5 h-3.5 text-amber-400" />
                <span>Update available (held back by pin)</span>
              </div>
            ) : isIgnored ? (
              <div className="space-y-1.5">
                <div className="w-full py-1.5 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-xs font-medium flex items-center justify-center gap-1.5">
                  <BellOff className="w-3.5 h-3.5" />
                  Updates ignored
                </div>
                <button
                  onClick={() => onUpgrade(token, isCask)}
                  disabled={isActionRunning}
                  className="w-full py-1.5 apple-btn-secondary text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5 text-[#FF9F0A]" />
                  Upgrade manually to v{latestVer}
                </button>
              </div>
            ) : (
              <button
                onClick={() => onUpgrade(token, isCask)}
                disabled={isActionRunning}
                className="w-full py-2 apple-btn-primary flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer shadow-md disabled:opacity-50"
              >
                <ArrowUpCircle className="w-4 h-4" />
                Update to v{latestVer}
              </button>
            )
          ) : (
            <div className="w-full py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center justify-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Up to date
            </div>
          )}

          {/* Formula Pin / Unpin Action */}
          {!isCask && onTogglePin && (
            <button
              onClick={() => onTogglePin(token, isPinned)}
              disabled={isActionRunning}
              className={`w-full py-1.5 apple-btn-secondary flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 ${
                isPinned ? "text-amber-300 hover:text-amber-200" : "text-zinc-300 hover:text-white"
              }`}
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5 text-amber-400" /> : <Pin className="w-3.5 h-3.5 text-zinc-400" />}
              {isPinned ? "Unpin Formula" : "Pin Formula (Hold Back)"}
            </button>
          )}

          {/* Cask Ignore Updates Action */}
          {isCask && onToggleIgnoreCask && (
            <button
              onClick={() => onToggleIgnoreCask(token)}
              disabled={isActionRunning}
              className={`w-full py-1.5 apple-btn-secondary flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 ${
                isIgnored ? "text-blue-400 hover:text-blue-300" : "text-zinc-300 hover:text-white"
              }`}
            >
              {isIgnored ? <Bell className="w-3.5 h-3.5 text-blue-400" /> : <BellOff className="w-3.5 h-3.5 text-zinc-400" />}
              {isIgnored ? "Stop Ignoring Updates" : "Ignore Updates for App"}
            </button>
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

            {!isCask && (
              <div className="p-2.5 flex justify-between items-center">
                <span className="text-zinc-400">Pinned Status</span>
                <span className={`font-mono text-xs ${isPinned ? "text-amber-400 font-semibold" : "text-zinc-300"}`}>
                  {isPinned ? "Pinned (held back)" : "Not pinned"}
                </span>
              </div>
            )}

            {isCask && isAutoUpdates && (
              <div className="p-2.5 flex justify-between items-center">
                <span className="text-zinc-400">Update Mechanism</span>
                <span className="text-cyan-400 text-xs">Self-updating</span>
              </div>
            )}

            {isCask && isIgnored && (
              <div className="p-2.5 flex justify-between items-center">
                <span className="text-zinc-400">Update Policy</span>
                <span className="text-zinc-400 text-xs">Ignored</span>
              </div>
            )}

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
