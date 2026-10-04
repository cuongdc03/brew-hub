import {
  AppWindow,
  Terminal,
  Server,
  ArrowUpCircle,
  HardDrive,
  Sparkles,
  Activity,
  Play,
  RotateCw,
  CheckCircle,
  Zap,
} from "lucide-react";
import {
  CaskItem,
  CleanupPreview,
  FormulaItem,
  OutdatedData,
  ServiceInfo,
} from "../types/brew";
import { InspectedItem } from "./PackageInspector";
import { AppIcon } from "./AppIcon";

interface DashboardViewProps {
  casks: CaskItem[];
  formulae: FormulaItem[];
  outdated: OutdatedData;
  services: ServiceInfo[];
  cleanupPreview: CleanupPreview | null;
  onNavigateTab: (tab: any) => void;
  onUpgradePackage: (name: string, isCask: boolean) => void;
  onRunCleanup: () => void;
  onRunAutoremove: () => void;
  onServiceAction: (name: string, action: "start" | "stop" | "restart", asRoot?: boolean) => void;
  onOpenDoctor: () => void;
  isActionRunning: boolean;
  isLoading?: boolean;
  onSelectItem: (item: InspectedItem) => void;
  onCheckUpdates?: () => void;
  isCheckingUpdates?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  casks,
  formulae,
  outdated,
  services,
  cleanupPreview,
  onNavigateTab,
  onUpgradePackage,
  onRunCleanup,
  onRunAutoremove,
  onServiceAction,
  onOpenDoctor,
  isActionRunning,
  isLoading,
  onSelectItem,
  onCheckUpdates,
  isCheckingUpdates = false,
}) => {
  const totalOutdated = (outdated.formulae?.length || 0) + (outdated.casks?.length || 0);
  const runningServices = services.filter((s) => s.status === "started");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Apple Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card: Casks */}
        <div
          onClick={() => onNavigateTab("casks")}
          className="p-4 rounded-xl apple-card cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Applications
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-[#0A84FF] border border-blue-500/20">
              <AppWindow className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-100 font-mono tracking-tight">
              {isLoading ? "—" : casks.length}
            </span>
            <span className="text-xs text-zinc-500">casks</span>
          </div>
        </div>

        {/* Card: Formulae */}
        <div
          onClick={() => onNavigateTab("formulae")}
          className="p-4 rounded-xl apple-card cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Formulae
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-[#BF5AF2] border border-purple-500/20">
              <Terminal className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-100 font-mono tracking-tight">
              {isLoading ? "—" : formulae.length}
            </span>
            <span className="text-xs text-zinc-500">binaries</span>
          </div>
        </div>

        {/* Card: Updates */}
        <div
          onClick={() => onNavigateTab("dashboard")}
          className="p-4 rounded-xl apple-card cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Updates
            </span>
            <div className="p-1.5 rounded-lg bg-[#FF9F0A]/10 text-[#FF9F0A] border border-[#FF9F0A]/20">
              <ArrowUpCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#FF9F0A] font-mono tracking-tight">
              {isLoading ? "—" : totalOutdated}
            </span>
            <span className="text-xs text-zinc-500">available</span>
          </div>
        </div>

        {/* Card: Cleanup */}
        <div
          onClick={() => onNavigateTab("cleanup")}
          className="p-4 rounded-xl apple-card cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Cleanable
            </span>
            <div className="p-1.5 rounded-lg bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20">
              <HardDrive className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#30D158] font-mono tracking-tight truncate">
              {cleanupPreview?.total_space || "0 B"}
            </span>
            <span className="text-xs text-zinc-500">cache</span>
          </div>
        </div>
      </div>

      {/* Quick Action Ribbon */}
      <div className="p-4 rounded-xl border border-white/6 bg-[#18181c]/70 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-zinc-100 text-xs tracking-tight flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#FF9F0A]" />
            Maintenance Quick Actions
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Maintain package health, reclaim cached storage, and test Homebrew doctor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRunCleanup}
            disabled={isActionRunning}
            className="px-3 py-1.5 apple-btn-secondary text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Clean Cache
          </button>

          <button
            onClick={onRunAutoremove}
            disabled={isActionRunning}
            className="px-3 py-1.5 apple-btn-secondary text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            Autoremove
          </button>

          <button
            onClick={onOpenDoctor}
            disabled={isActionRunning}
            className="px-3 py-1.5 apple-btn-secondary text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Doctor Check
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Outdated Packages Panel */}
        <div className="border border-white/6 rounded-xl bg-[#18181c]/60 backdrop-blur-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-[#FF9F0A]" />
              <h4 className="text-xs font-semibold text-zinc-200">
                Pending Updates ({totalOutdated})
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {onCheckUpdates && (
                <button
                  onClick={onCheckUpdates}
                  disabled={isCheckingUpdates || isActionRunning}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  title="Check upstream Homebrew repositories for updates (runs brew update)"
                >
                  <RotateCw className={`w-3 h-3 ${isCheckingUpdates ? "animate-spin text-blue-400" : ""}`} />
                  <span>{isCheckingUpdates ? "Checking..." : "Check Upstream"}</span>
                </button>
              )}
              {totalOutdated > 0 && (
                <span className="text-[10px] text-[#FF9F0A] font-mono px-2 py-0.5 rounded-full bg-[#FF9F0A]/10 border border-[#FF9F0A]/20">
                  Action required
                </span>
              )}
            </div>
          </div>

          <div className="p-2 flex-1 overflow-y-auto max-h-72 divide-y divide-white/4">
            {totalOutdated === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <CheckCircle className="w-8 h-8 text-[#30D158] mb-1.5 opacity-80" />
                <p className="text-xs font-medium text-zinc-300">All packages are up to date</p>
                <p className="text-[11px] text-zinc-500">No upgrades required</p>
              </div>
            ) : (
              <>
                {outdated.casks?.map((cask) => {
                  const fullCask = casks.find((c) => c.token === cask.name);
                  return (
                    <div
                      key={cask.name}
                      onClick={() =>
                        fullCask &&
                        onSelectItem({
                          type: "cask",
                          data: fullCask,
                          outdatedInfo: cask,
                        })
                      }
                      className="py-2 px-3 flex items-center justify-between text-xs hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <AppIcon name={cask.name} isCask={true} size="sm" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-200">{cask.name}</span>
                            <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-blue-500/10 text-blue-400">
                              Cask
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                            {cask.installed_versions.join(", ")} &rarr;{" "}
                            <span className="text-[#FF9F0A] font-medium">{cask.current_version}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpgradePackage(cask.name, true);
                        }}
                        disabled={isActionRunning}
                        className="px-2.5 py-0.5 apple-btn-primary text-[11px] cursor-pointer"
                      >
                        Update
                      </button>
                    </div>
                  );
                })}

                {outdated.formulae?.map((form) => {
                  const fullForm = formulae.find((f) => f.name === form.name);
                  return (
                    <div
                      key={form.name}
                      onClick={() =>
                        fullForm &&
                        onSelectItem({
                          type: "formula",
                          data: fullForm,
                          outdatedInfo: form,
                        })
                      }
                      className="py-2 px-3 flex items-center justify-between text-xs hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <AppIcon name={form.name} isCask={false} size="sm" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-200 font-mono">{form.name}</span>
                            <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-purple-500/10 text-purple-400">
                              Formula
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                            {form.installed_versions.join(", ")} &rarr;{" "}
                            <span className="text-[#FF9F0A] font-medium">{form.current_version}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpgradePackage(form.name, false);
                        }}
                        disabled={isActionRunning}
                        className="px-2.5 py-0.5 apple-btn-primary text-[11px] cursor-pointer"
                      >
                        Update
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Services Status Panel */}
        <div className="border border-white/6 rounded-xl bg-[#18181c]/60 backdrop-blur-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#30D158]" />
              <h4 className="text-xs font-semibold text-zinc-200">
                Services ({runningServices.length} Active)
              </h4>
            </div>
            <button
              onClick={() => onNavigateTab("services")}
              className="text-xs text-zinc-400 hover:text-white cursor-pointer"
            >
              View all &rarr;
            </button>
          </div>

          <div className="p-2 flex-1 overflow-y-auto max-h-72 divide-y divide-white/4">
            {services.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-zinc-500">No background services configured</p>
              </div>
            ) : (
              services.map((svc) => (
                <div
                  key={svc.name}
                  className="py-2 px-3 flex items-center justify-between text-xs hover:bg-white/[0.04] rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        svc.status === "started"
                          ? "bg-[#30D158]"
                          : svc.status === "error"
                          ? "bg-[#FF453A]"
                          : "bg-zinc-600"
                      }`}
                    />
                    <div>
                      <div className="font-mono font-medium text-zinc-200">{svc.name}</div>
                      <div className="text-[10px] text-zinc-500">
                        {svc.status}
                        {svc.user && ` • ${svc.user}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {svc.status === "started" ? (
                      <>
                        <button
                          onClick={() => onServiceAction(svc.name, "restart")}
                          disabled={isActionRunning}
                          title="Restart"
                          className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onServiceAction(svc.name, "stop")}
                          disabled={isActionRunning}
                          className="px-2 py-0.5 rounded bg-red-500/10 text-[#FF453A] hover:bg-red-500/20 text-[10px] font-medium transition-colors cursor-pointer"
                        >
                          Stop
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onServiceAction(svc.name, "start")}
                        disabled={isActionRunning}
                        className="px-2 py-0.5 rounded bg-[#30D158]/10 text-[#30D158] hover:bg-[#30D158]/20 text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        Start
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
