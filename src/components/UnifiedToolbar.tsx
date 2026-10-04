import { RefreshCw, Search, Command, PanelRight, ArrowDownCircle } from "lucide-react";

interface UnifiedToolbarProps {
  title: string;
  subtitle: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onRefresh: () => void;
  onCheckUpdates: () => void;
  isLoading: boolean;
  isCheckingUpdates: boolean;
  lastChecked: number | null;
  showSearchInput?: boolean;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  canInspect?: boolean;
}

function formatRelativeTime(timestampSec: number): string {
  const diffSec = Math.floor(Date.now() / 1000 - timestampSec);
  if (diffSec < 45) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Date(timestampSec * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const UnifiedToolbar: React.FC<UnifiedToolbarProps> = ({
  title,
  subtitle,
  searchTerm,
  setSearchTerm,
  onRefresh,
  onCheckUpdates,
  isLoading,
  isCheckingUpdates,
  lastChecked,
  showSearchInput = true,
  isInspectorOpen,
  onToggleInspector,
  canInspect = false,
}) => {
  return (
    <header className="h-14 px-6 apple-toolbar flex items-center justify-between gap-4 sticky top-0 z-10 drag-region select-none">
      {/* Title & View Info */}
      <div className="no-drag flex items-center gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 tracking-tight leading-none">
            {title}
          </h2>
          <p className="text-[11px] text-zinc-400 font-medium mt-1 leading-none flex items-center gap-2">
            <span>{subtitle}</span>
            {lastChecked ? (
              <>
                <span className="text-zinc-600">•</span>
                <span
                  className="text-zinc-400"
                  title={`Last index update: ${new Date(lastChecked * 1000).toLocaleString()}`}
                >
                  Last checked:{" "}
                  <span className="text-zinc-300 font-mono text-[10px]">
                    {formatRelativeTime(lastChecked)}
                  </span>
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {/* Toolbar Controls */}
      <div className="flex items-center gap-2 no-drag">
        {showSearchInput && (
          <div className="relative w-52 group">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 group-focus-within:text-blue-400 transition-colors" />
            <input
              type="text"
              placeholder="Filter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-10 py-1 text-xs rounded-lg border border-white/8 bg-black/30 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[9px] text-zinc-500 font-mono bg-white/[0.06] px-1 py-0.5 rounded pointer-events-none">
              <Command className="w-2.5 h-2.5 inline" /> F
            </div>
          </div>
        )}

        <button
          onClick={onCheckUpdates}
          disabled={isLoading || isCheckingUpdates}
          className="h-7 px-2.5 rounded-lg border border-blue-500/25 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 hover:text-blue-100 transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          title="Refresh Homebrew package index and check for updates (runs brew update)"
        >
          <ArrowDownCircle
            className={`w-3.5 h-3.5 ${isCheckingUpdates ? "animate-spin text-blue-400" : "text-blue-400"}`}
          />
          <span className="hidden sm:inline text-[11px]">
            {isCheckingUpdates ? "Checking..." : "Check Updates"}
          </span>
        </button>

        <button
          onClick={onRefresh}
          disabled={isLoading || isCheckingUpdates}
          className="h-7 px-2.5 rounded-lg border border-white/8 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          title="Reload local package data (fast, no network update)"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-zinc-400" : "text-zinc-400"}`}
          />
          <span className="hidden sm:inline text-[11px]">Reload</span>
        </button>

        {canInspect && (
          <button
            onClick={onToggleInspector}
            className={`h-7 px-2 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
              isInspectorOpen
                ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                : "border-white/8 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white"
            }`}
            title="Toggle Package Inspector"
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};
