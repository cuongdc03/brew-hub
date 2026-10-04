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
  FileCode2,
} from "lucide-react";
import { SystemInfo } from "../types/brew";
import { BrewHubLogo } from "./BrewHubLogo";

export type TabType =
  | "dashboard"
  | "casks"
  | "formulae"
  | "services"
  | "cleanup"
  | "brewfile"
  | "search";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  counts: {
    casks: number;
    unmanagedCasks?: number;
    formulae: number;
    servicesRunning: number;
    outdated: number;
    cleanupSpace: string;
    isBrewfileDirty?: boolean;
  };
  systemInfo: SystemInfo | null;
  onOpenDoctor: () => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  counts,
  systemInfo,
  onOpenDoctor,
}) => {
  const sections: NavSection[] = [
    {
      group: "LIBRARY",
      items: [
        {
          id: "dashboard" as TabType,
          label: "Dashboard",
          icon: LayoutDashboard,
          badge: counts.outdated > 0 ? `${counts.outdated}` : undefined,
          badgeColor: "bg-[#FF9F0A]/20 text-[#FF9F0A] border border-[#FF9F0A]/30",
        },
        {
          id: "casks" as TabType,
          label: "Applications",
          icon: AppWindow,
          badge:
            counts.unmanagedCasks && counts.unmanagedCasks > 0
              ? `${counts.casks} (+${counts.unmanagedCasks})`
              : counts.casks > 0
              ? `${counts.casks}`
              : undefined,
          badgeColor: "bg-white/[0.06] text-zinc-400 border border-white/5",
        },
        {
          id: "formulae" as TabType,
          label: "Formulae",
          icon: Terminal,
          badge: counts.formulae > 0 ? `${counts.formulae}` : undefined,
          badgeColor: "bg-white/[0.06] text-zinc-400 border border-white/5",
        },
      ],
    },
    {
      group: "SYSTEM",
      items: [
        {
          id: "services" as TabType,
          label: "Services",
          icon: Server,
          badge: counts.servicesRunning > 0 ? `${counts.servicesRunning}` : undefined,
          badgeColor: "bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30",
        },
        {
          id: "cleanup" as TabType,
          label: "Storage Cleaner",
          icon: Sparkles,
          badge:
            counts.cleanupSpace !== "0 B" && counts.cleanupSpace
              ? counts.cleanupSpace
              : undefined,
          badgeColor: "bg-[#BF5AF2]/20 text-[#BF5AF2] border border-[#BF5AF2]/30",
        },
        {
          id: "brewfile" as TabType,
          label: "Brewfile & Sync",
          icon: FileCode2,
          badge: counts.isBrewfileDirty ? "●" : undefined,
          badgeColor: "bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold",
        },
      ],
    },
    {
      group: "DISCOVERY",
      items: [
        {
          id: "search" as TabType,
          label: "Package Store",
          icon: Search,
        },
      ],
    },
  ];

  return (
    <aside className="w-60 apple-sidebar flex flex-col justify-between select-none relative z-20">
      <div>
        {/* macOS Traffic Lights Clearance & Artisan BrewHub Logo */}
        <div className="pt-9 pb-3 px-4 drag-region">
          <div className="flex items-center gap-2.5 no-drag">
            <BrewHubLogo size={32} />
            <div className="min-w-0">
              <h1 className="font-semibold text-zinc-100 text-[13px] tracking-tight leading-tight truncate">
                Brew Hub
              </h1>
              <p className="text-[11px] text-zinc-500 font-medium leading-none mt-0.5">
                macOS Package Manager
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="px-2.5 py-1 space-y-4">
          {sections.map((sec) => (
            <div key={sec.group} className="space-y-0.5">
              <div className="px-3 py-1">
                <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                  {sec.group}
                </span>
              </div>

              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#0A84FF]/20 text-[#0A84FF] font-semibold shadow-xs ring-1 ring-[#0A84FF]/30"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? "text-[#0A84FF]" : "text-zinc-500"
                        }`}
                      />
                      <span className="tracking-tight">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-medium ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer System Status & Doctor Audit */}
      <div className="p-3 border-t border-white/6 space-y-2 bg-black/10">
        <button
          onClick={onOpenDoctor}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/6 text-zinc-300 hover:text-white transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Brew Doctor</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">Verify &rarr;</span>
        </button>

        {systemInfo && (
          <div className="px-2.5 py-1.5 rounded-lg bg-black/20 border border-white/4 text-[10px] text-zinc-500 space-y-0.5">
            <div className="flex justify-between items-center">
              <span>Homebrew</span>
              <span className="font-mono text-zinc-400">
                {systemInfo.brew_version.split(" ")[1] || "Active"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Architecture</span>
              <span className="font-mono uppercase text-[#30D158] font-semibold flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5 inline" /> {systemInfo.arch}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
