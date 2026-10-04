import React from "react";
import {
  X,
  Download,
  ExternalLink,
  CheckCircle2,
  ArrowUpCircle,
  ShieldAlert,
  Terminal,
  Globe,
  Layers,
  FileText,
} from "lucide-react";
import { PackageDetail } from "../types/brew";
import { AppIcon } from "./AppIcon";

interface PackageDetailModalProps {
  packageDetail: PackageDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onInstall: (name: string, isCask: boolean) => void;
  isActionRunning: boolean;
}

export const PackageDetailModal: React.FC<PackageDetailModalProps> = ({
  packageDetail,
  isOpen,
  onClose,
  onInstall,
  isActionRunning,
}) => {
  if (!isOpen || !packageDetail) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#1c1c20] border border-white/10 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-1">
          <div className="flex items-center gap-3.5 min-w-0">
            <AppIcon
              name={packageDetail.name}
              isCask={packageDetail.is_cask}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-zinc-100 truncate">
                  {packageDetail.name}
                </h3>
                <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  v{packageDetail.version}
                </span>
                {packageDetail.installed && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Installed
                  </span>
                )}
                {packageDetail.outdated && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <ArrowUpCircle className="w-3 h-3" />
                    Update Available
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                {packageDetail.is_cask ? "Homebrew Cask (macOS Application)" : "Homebrew Formula (CLI/Library)"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/8 transition-colors cursor-pointer shrink-0"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Deprecation / Disabled Warning */}
        {(packageDetail.deprecated || packageDetail.disabled) && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              This package is {packageDetail.disabled ? "disabled" : "deprecated"} in Homebrew and may soon be removed or cease working.
            </span>
          </div>
        )}

        {/* Description */}
        {packageDetail.desc && (
          <div className="text-xs text-zinc-300 leading-relaxed bg-white/[0.02] p-3.5 rounded-xl border border-white/5">
            {packageDetail.desc}
          </div>
        )}

        {/* Metadata Grid */}
        <div className="bg-black/30 rounded-xl p-3.5 space-y-2 border border-white/6 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-zinc-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Type
            </span>
            <span className="font-mono text-zinc-300">
              {packageDetail.is_cask ? "Cask" : "Formula"}
            </span>
          </div>

          {packageDetail.license && (
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> License
              </span>
              <span className="font-mono text-zinc-300">{packageDetail.license}</span>
            </div>
          )}

          {packageDetail.installed_version && (
            <div className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-zinc-500">Installed Version</span>
              <span className="font-mono text-emerald-400 font-medium">
                {packageDetail.installed_version}
              </span>
            </div>
          )}

          {packageDetail.homepage && (
            <div className="flex justify-between items-center py-1">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Homepage
              </span>
              <a
                href={packageDetail.homepage}
                target="_blank"
                rel="noreferrer"
                className="text-[#0A84FF] hover:underline flex items-center gap-1 font-mono truncate max-w-[260px]"
              >
                <span className="truncate">{packageDetail.homepage}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}
        </div>

        {/* Dependencies */}
        {packageDetail.dependencies && packageDetail.dependencies.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Dependencies ({packageDetail.dependencies.length})
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
              {packageDetail.dependencies.map((dep) => (
                <span
                  key={dep}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-zinc-300 border border-white/5"
                >
                  {dep}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Caveats */}
        {packageDetail.caveats && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-amber-400/90 uppercase tracking-wider block">
              Important Caveats
            </span>
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
              {packageDetail.caveats}
            </div>
          </div>
        )}

        {/* Command CLI Preview */}
        <div className="bg-black/40 rounded-xl p-2.5 font-mono text-[11px] text-zinc-400 flex items-center justify-between border border-white/5">
          <span className="text-zinc-500 flex items-center gap-1">
            <Terminal className="w-3 h-3 text-zinc-400" /> $
          </span>
          <span className="text-zinc-200 select-all">
            brew install {packageDetail.is_cask ? "--cask " : ""}
            {packageDetail.name}
          </span>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onInstall(packageDetail.name, packageDetail.is_cask);
            }}
            disabled={isActionRunning}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
              packageDetail.outdated
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : packageDetail.installed
                ? "bg-white/[0.08] hover:bg-white/[0.12] text-zinc-200"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            {packageDetail.outdated
              ? "Upgrade"
              : packageDetail.installed
              ? "Reinstall"
              : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
};
