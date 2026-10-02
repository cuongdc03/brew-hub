import { useState } from "react";
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Search Bar Banner */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto space-y-3">
        <div className="relative group">
          <Search className="w-5 h-5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-amber-400 transition-colors" />
          <input
            type="text"
            placeholder="Search formulae or casks (e.g., git, docker, raycast, vlc, ffmpeg)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-32 py-4 text-sm rounded-2xl border border-white/8 bg-zinc-900/80 backdrop-blur-xl shadow-xl shadow-black/20 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all font-medium"
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Explore"}
          </button>
        </div>
        <p className="text-center text-xs text-zinc-500 font-medium">
          Query the entire Homebrew registry with thousands of developer tools and desktop apps
        </p>
      </form>

      {/* Results View */}
      {results && (
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Sub-tabs */}
          <div className="flex items-center justify-between border-b border-white/6 pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("casks")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "casks"
                    ? "bg-zinc-800 text-white shadow-xs border border-white/10"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <AppWindow className="w-3.5 h-3.5 text-blue-400" />
                <span>GUI Applications ({results.casks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("formulae")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === "formulae"
                    ? "bg-zinc-800 text-white shadow-xs border border-white/10"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span>CLI Formulae ({results.formulae.length})</span>
              </button>
            </div>

            <span className="text-xs text-zinc-500 font-mono">{totalResults} matches found</span>
          </div>

          {/* Results list */}
          {activeTab === "casks" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.casks.length === 0 ? (
                <div className="py-16 col-span-2 text-center text-zinc-500 text-xs">
                  No GUI casks matching "{query}"
                </div>
              ) : (
                results.casks.map((cask: string) => (
                  <div
                    key={cask}
                    className="p-4 rounded-2xl border border-white/6 bg-zinc-900/60 backdrop-blur-xl shadow-md shadow-black/10 flex items-center justify-between hover:border-white/12 transition-all group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20 flex items-center justify-center font-bold text-sm shrink-0 ring-1 ring-white/20">
                        {cask.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-zinc-100 truncate group-hover:text-amber-400 transition-colors">
                          {cask}
                        </h4>
                        <span className="text-[10px] text-zinc-500 uppercase font-mono">
                          Homebrew Cask
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onInstall(cask, true)}
                      disabled={isActionRunning}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 border border-white/8"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
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
                <div className="py-16 col-span-2 text-center text-zinc-500 text-xs">
                  No CLI formulae matching "{query}"
                </div>
              ) : (
                results.formulae.map((form: string) => (
                  <div
                    key={form}
                    className="p-4 rounded-2xl border border-white/6 bg-zinc-900/60 backdrop-blur-xl shadow-md shadow-black/10 flex items-center justify-between hover:border-white/12 transition-all group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/20 flex items-center justify-center font-bold text-sm shrink-0 ring-1 ring-white/20">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-mono font-bold text-xs text-zinc-100 truncate group-hover:text-amber-400 transition-colors">
                          {form}
                        </h4>
                        <span className="text-[10px] text-zinc-500 uppercase font-mono">
                          Homebrew Formula
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onInstall(form, false)}
                      disabled={isActionRunning}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 border border-white/8"
                    >
                      <Download className="w-3.5 h-3.5 text-purple-400" />
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
