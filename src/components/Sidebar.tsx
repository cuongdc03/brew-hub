import React from "react";
import {
  LayoutDashboard,
  AppWindow,
  Terminal,
  Server,
  Sparkles,
  Search,
  Activity,
  Cpu,
} from "lucide-react";
import { SystemInfo } from "../types/brew";

export type TabType = "dashboard" | "casks" | "formulae" | "services" | "cleanup" | "search";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  counts: {
    casks: number;
    formulae: number;
    servicesRunning: number;
    outdated: number;
    cleanupSpace: string;
  };
  systemInfo: SystemInfo | null;
  onOpenDoctor: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  counts,
  systemInfo,
  onOpenDoctor,
}) => {
  const navItems = [
    {
      id: "dashboard" as TabType,
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: counts.outdated > 0 ? `${counts.outdated}` : undefined,
      badgeStyle: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    },
    {
      id: "casks" as TabType,
      label: "Applications",
      icon: AppWindow,
      badge: counts.casks > 0 ? `${counts.casks}` : undefined,
      badgeStyle: "bg-zinc-800/80 text-zinc-400 border border-white/5",
    },
    {
      id: "formulae" as TabType,
      label: "Formulae",
      icon: Terminal,
      badge: counts.formulae > 0 ? `${counts.formulae}` : undefined,
      badgeStyle: "bg-zinc-800/80 text-zinc-400 border border-white/5",
    },
    {
      id: "services" as TabType,
      label: "Services",
      icon: Server,
      badge: counts.servicesRunning > 0 ? `${counts.servicesRunning} on` : undefined,
      badgeStyle: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    },
    {
      id: "cleanup" as TabType,
      label: "Disk Cleaner",
      icon: Sparkles,
      badge: counts.cleanupSpace !== "0 B" && counts.cleanupSpace ? counts.cleanupSpace : undefined,
      badgeStyle: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    },
    {
      id: "search" as TabType,
      label: "Package Store",
      icon: Search,
    },
  ];

  return (
    <aside className="w-64 bg-zinc-950/80 backdrop-blur-2xl border-r border-white/6 flex flex-col justify-between select-none relative z-20">
      <div>
        {/* Top macOS Traffic Light Buffer & App Title */}
        <div className="pt-9 pb-4 px-5 drag-region">
          <div className="flex items-center gap-3 no-drag">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/25 text-white font-bold text-lg ring-1 ring-white/20">
              🍺
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-zinc-100 text-sm tracking-tight">
                  Brew Hub
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-white/5">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">Homebrew Companion</p>
            </div>
          </div>
        </div>

        {/* Section divider */}
        <div className="px-4 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-2.5">
            Navigation
          </span>
        </div>

        {/* Navigation items */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                  isActive
                    ? "bg-zinc-800/90 text-white shadow-sm ring-1 ring-white/10"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-1.5 rounded-lg transition-colors ${
                      isActive
                        ? "bg-amber-500/20 text-amber-400"
                        : "text-zinc-400 group-hover:text-zinc-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="tracking-tight font-medium">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${item.badgeStyle}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Info Card */}
      <div className="p-3 border-t border-white/6 space-y-2 bg-zinc-950/40">
        <button
          onClick={onOpenDoctor}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium bg-zinc-900/80 hover:bg-zinc-850 border border-white/6 text-zinc-300 hover:text-white transition-all group cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span>Brew Doctor</span>
          </div>
          <span className="text-[10px] text-zinc-400 group-hover:text-zinc-300">Run audit &rarr;</span>
        </button>

        {systemInfo && (
          <div className="px-3 py-2 rounded-xl bg-zinc-900/40 border border-white/4 text-[11px] text-zinc-400 space-y-1">
            <div className="flex justify-between items-center">
              <span>Homebrew:</span>
              <span className="font-mono text-[10px] text-zinc-300">
                {systemInfo.brew_version.split(" ")[1] || "Active"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Hardware:</span>
              <span className="font-mono text-[10px] uppercase text-emerald-400 font-semibold flex items-center gap-1">
                <Cpu className="w-3 h-3 inline" /> {systemInfo.arch}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
