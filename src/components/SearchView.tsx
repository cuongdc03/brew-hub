import React, { useState } from "react";
import { Search, Download, Terminal, AppWindow, Loader2 } from "lucide-react";
import { SearchResult } from "../types/brew";
import { searchPackages } from "../services/api";

interface SearchViewProps {
  onInstall: (name: string, isCask: boolean) => void;
  isActionRunning: boolean;
}

export const SearchView: React.FC<SearchViewProps> = ({ onInstall, isActionRunning }) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [activeTab, setActiveTab] = useState<"casks" | "formulae">("casks");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setIsSearching(true);
      const res = await searchPackages(query.trim());
      setResults(res);
      if (res.casks.length === 0 && res.formulae.length > 0) {
        setActiveTab("formulae");
      } else {
        setActiveTab("casks");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const totalResults = results ? results.casks.length + results.formulae.length : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Search Bar Banner */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Homebrew formulae or casks (e.g., git, docker, raycast, vlc)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-28 py-3.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
          </button>
        </div>
        <p className="text-center text-[11px] text-slate-400">
          Search thousands of open-source CLI tools, libraries, and desktop applications
        </p>
      </form>

      {/* Results View */}
      {results && (
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Sub-tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-4 text-xs font-medium">
              <button
                onClick={() => setActiveTab("casks")}
                className={`flex items-center gap-2 pb-2 -mb-2.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "casks"
                    ? "border-amber-500 text-amber-600 dark:text-amber-400 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <AppWindow className="w-4 h-4" />
                <span>GUI Applications ({results.casks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("formulae")}
                className={`flex items-center gap-2 pb-2 -mb-2.5 transition-colors cursor-pointer border-b-2 ${
                  activeTab === "formulae"
                    ? "border-amber-500 text-amber-600 dark:text-amber-400 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>CLI Formulae ({results.formulae.length})</span>
              </button>
            </div>

            <span className="text-xs text-slate-400">{totalResults} total results</span>
          </div>

          {/* Results list */}
          {activeTab === "casks" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.casks.length === 0 ? (
                <div className="py-12 col-span-2 text-center text-slate-400 text-xs">
                  No GUI casks matching "{query}"
                </div>
              ) : (
                results.casks.map((cask) => (
                  <div
                    key={cask}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-sm shrink-0">
                        {cask.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {cask}
                        </h4>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          Homebrew Cask
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onInstall(cask, true)}
                      disabled={isActionRunning}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Install
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "formulae" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.formulae.length === 0 ? (
                <div className="py-12 col-span-2 text-center text-slate-400 text-xs">
                  No CLI formulae matching "{query}"
                </div>
              ) : (
                results.formulae.map((form) => (
                  <div
                    key={form}
                    className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-sm shrink-0">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-mono font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {form}
                        </h4>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          Homebrew Formula
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onInstall(form, false)}
                      disabled={isActionRunning}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Install
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
