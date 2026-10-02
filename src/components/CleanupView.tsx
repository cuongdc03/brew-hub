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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Hero card for storage */}
      <div className="p-7 rounded-3xl bg-gradient-to-br from-purple-500/15 via-zinc-900/80 to-zinc-950 border border-purple-500/25 backdrop-blur-2xl shadow-2xl shadow-purple-950/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-400">
              <Sparkles className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Homebrew Storage Cleaner
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <h3 className="text-4xl sm:text-5xl font-black text-zinc-100 tracking-tight font-mono">
                {preview?.total_space || "0 B"}
              </h3>
              <span className="text-xs text-purple-300 font-medium">recoverable disk space</span>
            </div>
            <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
              Purges obsolete bottles, outdated download archives, and cached build assets from{" "}
              <code className="text-zinc-300 bg-zinc-800/80 px-1.5 py-0.5 rounded font-mono">~/Library/Caches/Homebrew</code>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={onRunCleanup}
              disabled={isActionRunning}
              className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ring-1 ring-white/20"
            >
              <Trash2 className="w-4 h-4" />
              Purge All Cache
            </button>

            <button
              onClick={onRunAutoremove}
              disabled={isActionRunning}
              className="px-5 py-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 border border-white/8 text-zinc-200 text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FolderMinus className="w-4 h-4 text-purple-400" />
              Autoremove Orphans
            </button>
          </div>
        </div>
      </div>

      {/* Details List */}
      <div className="border border-white/6 rounded-2xl bg-zinc-900/60 backdrop-blur-xl overflow-hidden shadow-lg shadow-black/20">
        <div className="p-4 border-b border-white/6 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
              Scanned Cache Files ({preview?.items.length || 0})
            </h4>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {preview?.total_space || "0 B"} total
          </span>
        </div>

        <div className="p-3 divide-y divide-white/4 max-h-[460px] overflow-y-auto">
          {isLoading ? (
            <div className="py-16 text-center text-zinc-500">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-400 animate-spin opacity-50" />
              <p className="text-xs">Analyzing cache directory...</p>
            </div>
          ) : !preview || preview.items.length === 0 ? (
            <div className="py-16 text-center text-zinc-500">
              <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-emerald-400/80" />
              <p className="text-sm font-semibold text-zinc-300">
                Your disk cache is completely clean!
              </p>
              <p className="text-xs text-zinc-500 mt-1">No redundant downloaded packages found.</p>
            </div>
          ) : (
            preview.items.map((item, idx) => (
              <div
                key={idx}
                className="py-2.5 px-3 flex items-center justify-between text-xs hover:bg-white/4 rounded-xl transition-colors gap-4"
              >
                <div className="font-mono text-zinc-400 truncate max-w-xl text-[11px]">
                  {item.path}
                </div>
                {item.size && (
                  <span className="font-mono font-semibold text-purple-300 shrink-0 text-[11px] bg-purple-500/15 border border-purple-500/25 px-2 py-0.5 rounded-md">
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
