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
      {/* Search Input Banner */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto space-y-2.5">
        <div className="relative group">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-blue-400 transition-colors" />
          <input
            type="text"
            placeholder="Search Homebrew packages (e.g. neovim, docker, vlc, raycast)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-24 py-3 text-xs rounded-xl border border-white/8 bg-black/40 backdrop-blur-xl shadow-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
          />
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-1.5 apple-btn-primary text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
          </button>
        </div>
        <p className="text-center text-[11px] text-zinc-500">
          Discover and install thousands of open-source CLI utilities and macOS desktop applications
        </p>
      </form>

      {/* Results View */}
      {results && (
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Segmented control */}
          <div className="flex items-center justify-between border-b border-white/6 pb-2.5">
            <div className="apple-segmented-container">
              <button
                onClick={() => setActiveTab("casks")}
                className={`apple-segmented-btn cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "casks" ? "active" : ""
                }`}
              >
                <AppWindow className="w-3.5 h-3.5" />
                <span>Applications ({results.casks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("formulae")}
                className={`apple-segmented-btn cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "formulae" ? "active" : ""
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Formulae ({results.formulae.length})</span>
              </button>
            </div>

            <span className="text-xs text-zinc-500 font-mono">{totalResults} found</span>
          </div>

          {/* Results Grid */}
          {activeTab === "casks" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.casks.length === 0 ? (
                <div className="py-16 col-span-2 text-center text-zinc-500 text-xs">
                  No applications found matching "{query}"
                </div>
              ) : (
                results.casks.map((cask: string) => (
                  <div
                    key={cask}
                    className="p-3.5 rounded-xl apple-card flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 app-squircle bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {cask.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs text-zinc-100 truncate group-hover:text-[#0A84FF] transition-colors">
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
                      className="px-3 py-1 apple-btn-secondary text-xs font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Download className="w-3 h-3 text-blue-400" />
                      GET
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
                  No formulae found matching "{query}"
                </div>
              ) : (
                results.formulae.map((form: string) => (
                  <div
                    key={form}
                    className="p-3.5 rounded-xl apple-card flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 app-squircle bg-gradient-to-tr from-purple-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        <Terminal className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-mono font-semibold text-xs text-zinc-100 truncate group-hover:text-[#0A84FF] transition-colors">
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
                      className="px-3 py-1 apple-btn-secondary text-xs font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Download className="w-3 h-3 text-purple-400" />
                      GET
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
