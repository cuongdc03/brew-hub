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
  onServiceAction: (name: string, action: "start" | "stop" | "restart") => void;
  onOpenDoctor: () => void;
  isActionRunning: boolean;
  isLoading?: boolean;
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
}) => {
  const totalOutdated = (outdated.formulae?.length || 0) + (outdated.casks?.length || 0);
  const runningServices = services.filter((s) => s.status === "started");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card: Casks */}
        <div
          onClick={() => onNavigateTab("casks")}
          className="p-5 rounded-2xl border border-white/6 bg-gradient-to-b from-zinc-900/70 to-zinc-950/70 backdrop-blur-xl shadow-lg shadow-black/20 hover:border-blue-500/30 hover:from-blue-950/20 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              GUI Applications
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
              <AppWindow className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-100 tracking-tight font-mono">
              {isLoading ? "—" : casks.length}
            </span>
            <span className="text-xs text-zinc-500 font-medium">casks installed</span>
          </div>
        </div>

        {/* Card: Formulae */}
        <div
          onClick={() => onNavigateTab("formulae")}
          className="p-5 rounded-2xl border border-white/6 bg-gradient-to-b from-zinc-900/70 to-zinc-950/70 backdrop-blur-xl shadow-lg shadow-black/20 hover:border-purple-500/30 hover:from-purple-950/20 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              CLI Formulae
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
              <Terminal className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-100 tracking-tight font-mono">
              {isLoading ? "—" : formulae.length}
            </span>
            <span className="text-xs text-zinc-500 font-medium">binaries & libs</span>
          </div>
        </div>

        {/* Card: Updates */}
        <div
          onClick={() => onNavigateTab("dashboard")}
          className="p-5 rounded-2xl border border-white/6 bg-gradient-to-b from-zinc-900/70 to-zinc-950/70 backdrop-blur-xl shadow-lg shadow-black/20 hover:border-amber-500/30 hover:from-amber-950/20 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Pending Updates
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
              <ArrowUpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight font-mono">
              {isLoading ? "—" : totalOutdated}
            </span>
            <span className="text-xs text-zinc-500 font-medium">upgrades ready</span>
          </div>
        </div>

        {/* Card: Cleanup */}
        <div
          onClick={() => onNavigateTab("cleanup")}
          className="p-5 rounded-2xl border border-white/6 bg-gradient-to-b from-zinc-900/70 to-zinc-950/70 backdrop-blur-xl shadow-lg shadow-black/20 hover:border-emerald-500/30 hover:from-emerald-950/20 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Recoverable Cache
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight font-mono truncate">
              {cleanupPreview?.total_space || "0 B"}
            </span>
            <span className="text-xs text-zinc-500 font-medium">in cache</span>
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-zinc-900/60 to-zinc-900/40 border border-amber-500/20 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shadow-xl shadow-black/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-zinc-100 text-sm tracking-tight">
              One-Click Maintenance Hub
            </h3>
          </div>
          <p className="text-xs text-zinc-400">
            Keep packages updated, clear redundant bottle downloads, and verify system integrity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onRunCleanup}
            disabled={isActionRunning}
            className="px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/8 text-xs font-semibold text-zinc-200 hover:text-white transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 ring-1 ring-transparent hover:ring-white/10"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Clean Cache
          </button>

          <button
            onClick={onRunAutoremove}
            disabled={isActionRunning}
            className="px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/8 text-xs font-semibold text-zinc-200 hover:text-white transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 ring-1 ring-transparent hover:ring-white/10"
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            Autoremove Orphans
          </button>

          <button
            onClick={onOpenDoctor}
            disabled={isActionRunning}
            className="px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/8 text-xs font-semibold text-zinc-200 hover:text-white transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 ring-1 ring-transparent hover:ring-white/10"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Doctor Health Check
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outdated Packages Panel */}
        <div className="border border-white/6 rounded-2xl bg-zinc-900/60 backdrop-blur-xl overflow-hidden flex flex-col shadow-lg shadow-black/20">
          <div className="p-4 border-b border-white/6 flex items-center justify-between bg-zinc-950/40">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                Outdated Packages ({totalOutdated})
              </h4>
            </div>
            {totalOutdated > 0 && (
              <span className="text-[11px] text-amber-400 font-mono font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Action Recommended
              </span>
            )}
          </div>

          <div className="p-3 flex-1 overflow-y-auto max-h-80 divide-y divide-white/4">
            {totalOutdated === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <CheckCircle className="w-10 h-10 text-emerald-400 mb-2 opacity-80" />
                <p className="text-xs font-semibold text-zinc-200">All packages are up to date!</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Your system is running the latest versions.</p>
              </div>
            ) : (
              <>
                {outdated.casks?.map((cask) => (
                  <div
                    key={cask.name}
                    className="py-2.5 px-3 flex items-center justify-between text-xs hover:bg-white/4 rounded-xl transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200">
                          {cask.name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Cask
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        {cask.installed_versions.join(", ")} &rarr;{" "}
                        <span className="text-amber-400 font-medium">
                          {cask.current_version}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onUpgradePackage(cask.name, true)}
                      disabled={isActionRunning}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-medium text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      Update
                    </button>
                  </div>
                ))}

                {outdated.formulae?.map((form) => (
                  <div
                    key={form.name}
                    className="py-2.5 px-3 flex items-center justify-between text-xs hover:bg-white/4 rounded-xl transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200 font-mono">
                          {form.name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          Formula
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        {form.installed_versions.join(", ")} &rarr;{" "}
                        <span className="text-amber-400 font-medium">
                          {form.current_version}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onUpgradePackage(form.name, false)}
                      disabled={isActionRunning}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-medium text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      Update
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Services Status Panel */}
        <div className="border border-white/6 rounded-2xl bg-zinc-900/60 backdrop-blur-xl overflow-hidden flex flex-col shadow-lg shadow-black/20">
          <div className="p-4 border-b border-white/6 flex items-center justify-between bg-zinc-950/40">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                Active Services ({runningServices.length} Running)
              </h4>
            </div>
            <button
              onClick={() => onNavigateTab("services")}
              className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Manage all &rarr;
            </button>
          </div>

          <div className="p-3 flex-1 overflow-y-auto max-h-80 divide-y divide-white/4">
            {services.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-zinc-500">No background services configured</p>
              </div>
            ) : (
              services.map((svc) => (
                <div
                  key={svc.name}
                  className="py-2.5 px-3 flex items-center justify-between text-xs hover:bg-white/4 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        svc.status === "started"
                          ? "bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse"
                          : svc.status === "error"
                          ? "bg-red-400 shadow-sm shadow-red-400/80"
                          : "bg-zinc-600"
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-zinc-200 font-mono">
                        {svc.name}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        Status: <span className="capitalize font-medium text-zinc-400">{svc.status}</span>
                        {svc.user && ` • User: ${svc.user}`}
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
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onServiceAction(svc.name, "stop")}
                          disabled={isActionRunning}
                          className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Stop
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onServiceAction(svc.name, "start")}
                        disabled={isActionRunning}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
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
