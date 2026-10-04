import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Download,
  Terminal,
  AppWindow,
  Loader2,
  Sparkles,
  CheckCircle2,
  ArrowUpCircle,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { PackageDetail, RichSearchResult } from "../types/brew";
import { searchPackagesRich, getPackageDetails } from "../services/api";
import { AppIcon } from "./AppIcon";
import { PackageDetailModal } from "./PackageDetailModal";

interface SearchViewProps {
  onInstall: (name: string, isCask: boolean) => void;
  isActionRunning: boolean;
}

interface CuratedCategory {
  id: string;
  name: string;
  icon: any;
  items: { name: string; isCask: boolean; desc: string }[];
}

const CURATED_COLLECTIONS: CuratedCategory[] = [
  {
    id: "dev",
    name: "Developer Essentials",
    icon: Terminal,
    items: [
      { name: "git", isCask: false, desc: "Distributed revision control system" },
      { name: "neovim", isCask: false, desc: "Vim-fork focused on extensibility and agility" },
      { name: "gh", isCask: false, desc: "GitHub official command-line tool" },
      { name: "ripgrep", isCask: false, desc: "Fast line-oriented search tool (rg)" },
      { name: "tmux", isCask: false, desc: "Terminal multiplexer workspace" },
      { name: "docker", isCask: true, desc: "Container application platform & engine" },
    ],
  },
  {
    id: "apps",
    name: "Popular Applications",
    icon: AppWindow,
    items: [
      { name: "visual-studio-code", isCask: true, desc: "Code editor redefined and optimized" },
      { name: "raycast", isCask: true, desc: "Control your tools with a few keystrokes" },
      { name: "iterm2", isCask: true, desc: "Terminal emulator replacement for macOS" },
      { name: "firefox", isCask: true, desc: "Privacy-focused web browser by Mozilla" },
      { name: "warp", isCask: true, desc: "Modern Rust-based terminal with AI" },
      { name: "rectangle", isCask: true, desc: "Move and resize windows using keyboard shortcuts" },
    ],
  },
];

export const SearchView: React.FC<SearchViewProps> = ({ onInstall, isActionRunning }) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<RichSearchResult | null>(null);
  const [activeTab, setActiveTab] = useState<"casks" | "formulae">("casks");
  const [searchError, setSearchError] = useState<string | null>(null);

  // Detail Sheet state
  const [selectedPackage, setSelectedPackage] = useState<PackageDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setResults(null);
      setIsSearching(false);
      return;
    }

    setSearchError(null);
    setIsSearching(true);
    try {
      const res = await searchPackagesRich(trimmed);
      setResults(res);
      if (res.casks.length === 0 && res.formulae.length > 0) {
        setActiveTab("formulae");
      } else {
        setActiveTab("casks");
      }
    } catch (err: any) {
      console.error("Search failed:", err);
      setSearchError(err?.message || "Search failed to execute. Ensure Homebrew is functioning.");
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search-as-you-type (~250ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, 280);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  const handleInspectPackage = async (name: string, isCask: boolean) => {
    try {
      // If we already have rich details in results, use it immediately
      const existing = results
        ? (isCask ? results.casks : results.formulae).find((i) => i.name === name)
        : null;

      if (existing && existing.desc) {
        setSelectedPackage(existing);
        setIsDetailOpen(true);
      } else {
        const detail = await getPackageDetails(name, isCask);
        setSelectedPackage(detail);
        setIsDetailOpen(true);
      }
    } catch (err) {
      console.warn("Failed to fetch package details:", err);
      // Fallback modal with minimum info
      setSelectedPackage({
        name,
        full_name: name,
        is_cask: isCask,
        desc: null,
        homepage: null,
        version: "latest",
        installed: false,
        installed_version: null,
        outdated: false,
        deprecated: false,
        disabled: false,
        license: null,
        dependencies: [],
        caveats: null,
      });
      setIsDetailOpen(true);
    }
  };

  const totalResults = results ? results.casks.length + results.formulae.length : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Search Input Banner */}
      <div className="max-w-2xl mx-auto space-y-3">
        <div className="relative group">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-blue-400 transition-colors" />
          <input
            type="text"
            placeholder="Search packages with descriptions, versions & dependencies (e.g. neovim, docker, raycast)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-24 py-3 text-xs rounded-xl border border-white/8 bg-black/40 backdrop-blur-xl shadow-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
            autoFocus
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isSearching && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
            {query && !isSearching && (
              <button
                onClick={() => setQuery("")}
                className="text-zinc-500 hover:text-zinc-300 text-xs px-1.5 py-0.5 rounded cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          <span className="text-[11px] text-zinc-500 mr-1">Popular:</span>
          {["docker", "firefox", "raycast", "neovim", "visual-studio-code", "git", "node", "python"].map(
            (s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuery(s)}
                className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 border border-white/5 transition-all cursor-pointer"
              >
                {s}
              </button>
            )
          )}
        </div>

        {searchError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs text-center">
            {searchError}
          </div>
        )}
      </div>

      {/* Empty State: Curated Collections */}
      {!query.trim() && !results && (
        <div className="max-w-4xl mx-auto space-y-8 pt-4">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Curated Collections & Starter Kits</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CURATED_COLLECTIONS.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.id}
                  className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4"
                >
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800/80">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">{cat.name}</h3>
                  </div>

                  <div className="space-y-2.5">
                    {cat.items.map((item) => (
                      <div
                        key={item.name}
                        onClick={() => handleInspectPackage(item.name, item.isCask)}
                        className="p-2.5 rounded-xl bg-slate-800/30 hover:bg-slate-800/70 border border-slate-700/30 hover:border-slate-700 flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <AppIcon name={item.name} isCask={item.isCask} size="sm" />
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-zinc-100 group-hover:text-blue-400 transition-colors block truncate">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-zinc-400 truncate block">
                              {item.desc}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInstall(item.name, item.isCask);
                          }}
                          disabled={isActionRunning}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 transition-all cursor-pointer shrink-0 ml-2"
                        >
                          GET
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                results.casks.map((cask) => (
                  <div
                    key={cask.name}
                    onClick={() => handleInspectPackage(cask.name, true)}
                    className="p-3.5 rounded-xl apple-card flex items-start justify-between group hover:border-blue-500/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0 pr-2">
                      <AppIcon name={cask.name} isCask={true} size="md" />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-xs text-zinc-100 truncate group-hover:text-[#0A84FF] transition-colors">
                            {cask.name}
                          </h4>
                          <span className="text-[10px] font-mono text-zinc-500">
                            v{cask.version}
                          </span>

                          {cask.installed && (
                            <span className="flex items-center gap-0.5 text-[9px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full border border-emerald-500/20">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Installed
                            </span>
                          )}

                          {cask.outdated && (
                            <span className="flex items-center gap-0.5 text-[9px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-full border border-amber-500/20">
                              <ArrowUpCircle className="w-2.5 h-2.5" />
                              Update
                            </span>
                          )}

                          {cask.deprecated && (
                            <span className="flex items-center gap-0.5 text-[9px] font-medium text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded-full border border-rose-500/20">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              Deprecated
                            </span>
                          )}
                        </div>

                        {cask.desc ? (
                          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                            {cask.desc}
                          </p>
                        ) : (
                          <p className="text-[10px] text-zinc-600 uppercase font-mono">
                            Homebrew Cask
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspectPackage(cask.name, true);
                        }}
                        title="View Pre-install Details"
                        className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInstall(cask.name, true);
                        }}
                        disabled={isActionRunning}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50 transition-all ${
                          cask.outdated
                            ? "bg-amber-600 hover:bg-amber-500 text-white"
                            : cask.installed
                            ? "bg-white/[0.06] text-zinc-300 hover:bg-white/10"
                            : "apple-btn-secondary text-blue-400"
                        }`}
                      >
                        <Download className="w-3 h-3" />
                        {cask.outdated ? "UPGRADE" : cask.installed ? "INSTALLED" : "GET"}
                      </button>
                    </div>
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
                results.formulae.map((form) => (
                  <div
                    key={form.name}
                    onClick={() => handleInspectPackage(form.name, false)}
                    className="p-3.5 rounded-xl apple-card flex items-start justify-between group hover:border-purple-500/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0 pr-2">
                      <AppIcon name={form.name} isCask={false} size="md" />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-mono font-semibold text-xs text-zinc-100 truncate group-hover:text-[#0A84FF] transition-colors">
                            {form.name}
                          </h4>
                          <span className="text-[10px] font-mono text-zinc-500">
                            v{form.version}
                          </span>

                          {form.installed && (
                            <span className="flex items-center gap-0.5 text-[9px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full border border-emerald-500/20">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Installed
                            </span>
                          )}

                          {form.outdated && (
                            <span className="flex items-center gap-0.5 text-[9px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-full border border-amber-500/20">
                              <ArrowUpCircle className="w-2.5 h-2.5" />
                              Update
                            </span>
                          )}

                          {form.dependencies && form.dependencies.length > 0 && (
                            <span className="text-[9px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.2 rounded">
                              +{form.dependencies.length} deps
                            </span>
                          )}
                        </div>

                        {form.desc ? (
                          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                            {form.desc}
                          </p>
                        ) : (
                          <p className="text-[10px] text-zinc-600 uppercase font-mono">
                            Homebrew Formula
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspectPackage(form.name, false);
                        }}
                        title="View Pre-install Details"
                        className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInstall(form.name, false);
                        }}
                        disabled={isActionRunning}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50 transition-all ${
                          form.outdated
                            ? "bg-amber-600 hover:bg-amber-500 text-white"
                            : form.installed
                            ? "bg-white/[0.06] text-zinc-300 hover:bg-white/10"
                            : "apple-btn-secondary text-purple-400"
                        }`}
                      >
                        <Download className="w-3 h-3" />
                        {form.outdated ? "UPGRADE" : form.installed ? "INSTALLED" : "GET"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Pre-install Detail Sheet Modal */}
      <PackageDetailModal
        packageDetail={selectedPackage}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onInstall={onInstall}
        isActionRunning={isActionRunning}
      />
    </div>
  );
};
