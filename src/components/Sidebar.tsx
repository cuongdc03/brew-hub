import React from "react";
import {
  LayoutDashboard,
  AppWindow,
  Terminal,
  Server,
  Sparkles,
  Search,
  Activity,
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
      badge: counts.outdated > 0 ? `${counts.outdated} updates` : undefined,
      badgeColor: "bg-amber-500 text-white dark:bg-amber-600",
    },
    {
      id: "casks" as TabType,
      label: "Applications",
      icon: AppWindow,
      badge: counts.casks > 0 ? `${counts.casks}` : undefined,
      badgeColor: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
    {
      id: "formulae" as TabType,
      label: "Formulae",
      icon: Terminal,
      badge: counts.formulae > 0 ? `${counts.formulae}` : undefined,
      badgeColor: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
    {
      id: "services" as TabType,
      label: "Services",
      icon: Server,
      badge: counts.servicesRunning > 0 ? `${counts.servicesRunning} on` : undefined,
      badgeColor: "bg-emerald-500 text-white dark:bg-emerald-600",
    },
    {
      id: "cleanup" as TabType,
      label: "Disk Cleaner",
      icon: Sparkles,
      badge: counts.cleanupSpace !== "0 B" && counts.cleanupSpace ? counts.cleanupSpace : undefined,
      badgeColor: "bg-purple-500 text-white dark:bg-purple-600",
    },
    {
      id: "search" as TabType,
      label: "Explore / Install",
      icon: Search,
    },
  ];

  return (
    <aside className="w-64 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20 text-white font-bold text-xl">
            🍺
          </div>
          <div>
            <h1 className="font-semibold text-slate-900 dark:text-slate-100 text-base leading-tight tracking-tight">
              Brew Hub
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Homebrew Desktop</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Footer Info */}
      <div className="p-3 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
        <button
          onClick={onOpenDoctor}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span>Brew Doctor</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Check</span>
        </button>

        {systemInfo && (
          <div className="px-3 py-2 rounded-lg bg-slate-100/60 dark:bg-slate-950/40 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex justify-between items-center">
              <span>Homebrew:</span>
              <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                {systemInfo.brew_version.split(" ")[1] || "Active"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Architecture:</span>
              <span className="font-mono text-[10px] uppercase text-emerald-600 dark:text-emerald-400 font-semibold">
                {systemInfo.arch}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
