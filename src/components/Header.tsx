import React from "react";
import { RefreshCw, Search } from "lucide-react";

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
    <header className="h-16 px-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-10">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
          {title}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {showSearchInput && (
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter current view..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
            />
          </div>
        )}

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          title="Refresh All Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-amber-500" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
};
