import React, { useState } from "react";
import {
  Sparkles,
  HardDrive,
  Trash2,
  FolderMinus,
  ShieldCheck,
  AlertTriangle,
  PackageMinus,
  CheckCircle2,
  X,
  Clock,
  Layers,
} from "lucide-react";
import { CleanupPreview } from "../types/brew";
import { fetchAutoremovePreview } from "../services/api";

interface CleanupViewProps {
  preview: CleanupPreview | null;
  pruneAll: boolean;
  onPruneModeChange: (pruneAll: boolean) => void;
  onRunCleanup: () => void;
  onRunAutoremove: () => void;
  isActionRunning: boolean;
  isLoading?: boolean;
}

export const CleanupView: React.FC<CleanupViewProps> = ({
  preview,
  pruneAll,
  onPruneModeChange,
  onRunCleanup,
  onRunAutoremove,
  isActionRunning,
  isLoading,
}) => {
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [showAutoremoveModal, setShowAutoremoveModal] = useState(false);
  const [isCheckingAutoremove, setIsCheckingAutoremove] = useState(false);
  const [autoremoveFormulae, setAutoremoveFormulae] = useState<string[] | null>(null);

  const handleOpenPurgeModal = () => {
    setShowPurgeModal(true);
  };

  const handleConfirmPurge = () => {
    setShowPurgeModal(false);
    onRunCleanup();
  };

  const handleCheckAutoremove = async () => {
    setIsCheckingAutoremove(true);
    try {
      const res = await fetchAutoremovePreview();
      setAutoremoveFormulae(res.formulae || []);
      setShowAutoremoveModal(true);
    } catch (err) {
      console.error("Failed to check autoremove preview:", err);
      setAutoremoveFormulae([]);
      setShowAutoremoveModal(true);
    } finally {
      setIsCheckingAutoremove(false);
    }
  };

  const handleConfirmAutoremove = () => {
    setShowAutoremoveModal(false);
    onRunAutoremove();
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Apple Storage Management Banner */}
      <div className="p-6 rounded-2xl border border-white/6 bg-[#18181c]/70 backdrop-blur-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#BF5AF2]">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              macOS Storage Optimization
            </span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <h3 className="text-3xl sm:text-4xl font-bold text-zinc-100 font-mono tracking-tight">
              {preview?.total_space || "0 B"}
            </h3>
            <span className="text-xs text-zinc-400">reclaimable cache</span>
          </div>
          <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
            Reclaim disk space by clearing outdated binary bottles, downloaded archives, and
            temporary build logs from <code className="text-zinc-300 font-mono">~/Library/Caches/Homebrew</code>.
          </p>

          {/* Prune Scope Selector */}
          <div className="pt-2 flex items-center gap-2">
            <span className="text-[11px] font-medium text-zinc-400">Scope:</span>
            <div className="inline-flex rounded-lg bg-black/40 border border-white/8 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onPruneModeChange(true)}
                disabled={isActionRunning}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                  pruneAll
                    ? "bg-[#BF5AF2] text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Layers className="w-3 h-3" />
                All Cache (--prune=all)
              </button>
              <button
                type="button"
                onClick={() => onPruneModeChange(false)}
                disabled={isActionRunning}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                  !pruneAll
                    ? "bg-[#BF5AF2] text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Clock className="w-3 h-3" />
                &gt; 120 Days (Default)
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            onClick={handleOpenPurgeModal}
            disabled={isActionRunning || !preview || preview.items.length === 0}
            className="px-4 py-2 rounded-xl bg-[#BF5AF2] hover:bg-[#A845DB] text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Purge Cache
          </button>

          <button
            onClick={handleCheckAutoremove}
            disabled={isActionRunning || isCheckingAutoremove}
            className="px-4 py-2 rounded-xl apple-btn-secondary text-xs font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isCheckingAutoremove ? (
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            ) : (
              <FolderMinus className="w-3.5 h-3.5 text-zinc-400" />
            )}
            Autoremove Orphans
          </button>
        </div>
      </div>

      {/* Scanned Items Table */}
      <div className="border border-white/6 rounded-xl bg-[#18181c]/60 backdrop-blur-xl overflow-hidden shadow-xl shadow-black/20">
        <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-semibold text-zinc-200">
              Recoverable Assets ({preview?.items.length || 0})
            </h4>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            {preview?.total_space || "0 B"} pending deletion
          </span>
        </div>

        <div className="p-2 divide-y divide-white/4 max-h-[460px] overflow-y-auto">
          {isLoading ? (
            <div className="py-16 text-center text-zinc-500">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-purple-400 animate-spin opacity-50" />
              <p className="text-xs">Scanning Homebrew cache...</p>
            </div>
          ) : !preview || preview.items.length === 0 ? (
            <div className="py-16 text-center text-zinc-500">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-[#30D158] opacity-80" />
              <p className="text-xs font-semibold text-zinc-300">
                Cache storage is optimal
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                No redundant files detected for scope: {pruneAll ? "all cache" : "older than 120 days"}.
              </p>
            </div>
          ) : (
            preview.items.map((item, idx) => (
              <div
                key={idx}
                className="py-2 px-3 flex items-center justify-between text-xs hover:bg-white/[0.04] rounded-lg transition-colors gap-4"
              >
                <div className="font-mono text-zinc-400 truncate max-w-xl text-[11px]">
                  {item.path}
                </div>
                {item.size && (
                  <span className="font-mono text-[#BF5AF2] shrink-0 text-[11px] bg-[#BF5AF2]/10 border border-[#BF5AF2]/20 px-2 py-0.5 rounded-md">
                    {item.size}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Modal for Purge Cache */}
      {showPurgeModal && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#1c1c20] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[#BF5AF2]">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Purge Homebrew Cache?
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Scope: {pruneAll ? "All cached downloads (--prune=all)" : "Older than 120 days"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPurgeModal(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/6 space-y-2 text-xs">
              <div className="flex justify-between items-center text-zinc-300">
                <span>Reclaimable space:</span>
                <span className="font-mono font-semibold text-[#BF5AF2]">
                  {preview.total_space}
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span>Files to delete:</span>
                <span className="font-mono font-semibold text-zinc-100">
                  {preview.items.length} files
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 pt-1 border-t border-white/6 leading-relaxed">
                Notice: Cleared download archives will be re-downloaded if you reinstall or rebuild packages later.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-white/5 border border-white/6 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurge}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#BF5AF2] hover:bg-[#A845DB] text-white shadow-md transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Purge {preview.total_space}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation / Preview Modal for Autoremove */}
      {showAutoremoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#1c1c20] border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {autoremoveFormulae && autoremoveFormulae.length > 0 ? (
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <PackageMinus className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {autoremoveFormulae && autoremoveFormulae.length > 0
                      ? "Autoremove Orphaned Dependencies"
                      : "No Orphaned Packages"}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {autoremoveFormulae && autoremoveFormulae.length > 0
                      ? `${autoremoveFormulae.length} unneeded formula${
                          autoremoveFormulae.length > 1 ? "e" : ""
                        } detected`
                      : "Dependencies check complete"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAutoremoveModal(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {autoremoveFormulae && autoremoveFormulae.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  The following packages were originally installed as dependencies for other formulae,
                  but are no longer needed by any installed package:
                </p>

                <div className="p-3 rounded-xl bg-black/30 border border-white/6 max-h-48 overflow-y-auto divide-y divide-white/4">
                  {autoremoveFormulae.map((f, i) => (
                    <div key={i} className="py-1.5 flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-200">{f}</span>
                      <span className="text-[10px] text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded">
                        orphan
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-[11px] text-amber-300/90">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    These packages will be completely uninstalled. If you rely on any of them directly, install them explicitly first.
                  </span>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => setShowAutoremoveModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-white/5 border border-white/6 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAutoremove}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black shadow-md transition-all flex items-center gap-1.5"
                  >
                    <PackageMinus className="w-3.5 h-3.5" />
                    Uninstall {autoremoveFormulae.length} Packages
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  All installed formulae and dependencies are currently in use or were installed explicitly on request. No action is needed.
                </p>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => setShowAutoremoveModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-zinc-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
