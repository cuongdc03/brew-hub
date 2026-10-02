import React from "react";
import { RefreshCw, Search, Command } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  showSearchInput?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  searchTerm,
  setSearchTerm,
  onRefresh,
  isLoading,
  showSearchInput = true,
}) => {
  return (
    <header className="h-16 px-6 border-b border-white/6 bg-zinc-950/60 backdrop-blur-xl flex items-center justify-between gap-4 sticky top-0 z-10 drag-region select-none">
      <div className="no-drag">
        <h2 className="text-base font-bold text-zinc-100 tracking-tight flex items-center gap-2">
          {title}
        </h2>
        <p className="text-xs text-zinc-400 font-medium">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3 no-drag">
        {showSearchInput && (
          <div className="relative w-64 group">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-amber-400 transition-colors" />
            <input
              type="text"
              placeholder="Filter items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-12 py-1.5 text-xs rounded-xl border border-white/8 bg-zinc-900/60 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all shadow-inner"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-zinc-600 font-mono bg-zinc-800/60 px-1.5 py-0.5 rounded border border-white/5 pointer-events-none">
              <Command className="w-2.5 h-2.5 inline" /> F
            </div>
          </div>
        )}

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-xl border border-white/8 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 text-xs font-medium cursor-pointer ring-1 ring-transparent hover:ring-white/10"
          title="Refresh All Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-amber-400" : "text-zinc-400"}`} />
          <span className="hidden sm:inline">Sync Data</span>
        </button>
      </div>
    </header>
  );
};
