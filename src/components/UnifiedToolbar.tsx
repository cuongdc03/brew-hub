import { RefreshCw, Search, Command, PanelRight } from "lucide-react";

interface UnifiedToolbarProps {
  title: string;
  subtitle: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  showSearchInput?: boolean;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  canInspect?: boolean;
}

export const UnifiedToolbar: React.FC<UnifiedToolbarProps> = ({
  title,
  subtitle,
  searchTerm,
  setSearchTerm,
  onRefresh,
  isLoading,
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
          <p className="text-[11px] text-zinc-400 font-medium mt-0.5 leading-none">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Toolbar Controls */}
      <div className="flex items-center gap-2.5 no-drag">
        {showSearchInput && (
          <div className="relative w-56 group">
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
          onClick={onRefresh}
          disabled={isLoading}
          className="h-7 px-2.5 rounded-lg border border-white/8 bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          title="Sync Homebrew Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-400" : "text-zinc-400"}`} />
          <span className="hidden sm:inline text-[11px]">Sync</span>
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
