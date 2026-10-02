import { Sparkles, HardDrive, Trash2, FolderMinus } from "lucide-react";
import { CleanupPreview } from "../types/brew";

interface CleanupViewProps {
  preview: CleanupPreview | null;
  onRunCleanup: () => void;
  onRunAutoremove: () => void;
  isActionRunning: boolean;
}

export const CleanupView: React.FC<CleanupViewProps> = ({
  preview,
  onRunCleanup,
  onRunAutoremove,
  isActionRunning,
}) => {
  return (
    <div className="p-6 space-y-6">
      {/* Hero card for storage */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/20 dark:border-purple-500/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Homebrew Storage Cleaner
              </span>
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {preview?.total_space || "0 B"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
              Recover disk space by purging old downloaded tarballs, obsolete version bottles, and
              build cache files stored in ~/Library/Caches/Homebrew.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={onRunCleanup}
              disabled={isActionRunning}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Purge All Cache
            </button>

            <button
              onClick={onRunAutoremove}
              disabled={isActionRunning}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FolderMinus className="w-4 h-4 text-indigo-500" />
              Autoremove Orphans
            </button>
          </div>
        </div>
      </div>

      {/* Details List */}
      <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-purple-500" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recoverable Items ({preview?.items.length || 0})
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {preview?.total_space || "0 B"} pending removal
          </span>
        </div>

        <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[460px] overflow-y-auto">
          {!preview || preview.items.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30 text-purple-500" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Cache is clean! No space to reclaim right now.
              </p>
            </div>
          ) : (
            preview.items.map((item, idx) => (
              <div
                key={idx}
                className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-lg gap-4"
              >
                <div className="font-mono text-slate-600 dark:text-slate-300 truncate max-w-xl">
                  {item.path}
                </div>
                {item.size && (
                  <span className="font-mono font-medium text-purple-600 dark:text-purple-400 shrink-0 text-[11px] bg-purple-500/10 px-2 py-0.5 rounded">
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
