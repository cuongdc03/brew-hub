import React from "react";
import { Sparkles, HardDrive, Trash2, FolderMinus, ShieldCheck } from "lucide-react";
import { CleanupPreview } from "../types/brew";

interface CleanupViewProps {
  preview: CleanupPreview | null;
  onRunCleanup: () => void;
  onRunAutoremove: () => void;
  isActionRunning: boolean;
  isLoading?: boolean;
}

export const CleanupView: React.FC<CleanupViewProps> = ({
  preview,
  onRunCleanup,
  onRunAutoremove,
  isActionRunning,
  isLoading,
}) => {
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Apple Storage Management Banner */}
      <div className="p-6 rounded-2xl border border-white/6 bg-[#18181c]/70 backdrop-blur-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
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
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            onClick={onRunCleanup}
            disabled={isActionRunning}
            className="px-4 py-2 rounded-xl bg-[#BF5AF2] hover:bg-[#A845DB] text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Purge Cache
          </button>

          <button
            onClick={onRunAutoremove}
            disabled={isActionRunning}
            className="px-4 py-2 rounded-xl apple-btn-secondary text-xs font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <FolderMinus className="w-3.5 h-3.5 text-zinc-400" />
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
              <p className="text-[11px] text-zinc-500 mt-0.5">No redundant files detected.</p>
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
    </div>
  );
};
