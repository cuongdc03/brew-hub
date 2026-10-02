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
}) => {
  const totalOutdated = (outdated.formulae?.length || 0) + (outdated.casks?.length || 0);
  const runningServices = services.filter((s) => s.status === "started");

  return (
    <div className="p-6 space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card: Casks */}
        <div
          onClick={() => onNavigateTab("casks")}
          className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              GUI Applications
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <AppWindow className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {casks.length}
            </span>
            <span className="text-xs text-slate-400">installed</span>
          </div>
        </div>

        {/* Card: Formulae */}
        <div
          onClick={() => onNavigateTab("formulae")}
          className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              CLI Formulae
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Terminal className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formulae.length}
            </span>
            <span className="text-xs text-slate-400">installed</span>
          </div>
        </div>

        {/* Card: Updates */}
        <div
          onClick={() => onNavigateTab("dashboard")}
          className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Updates Available
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ArrowUpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {totalOutdated}
            </span>
            <span className="text-xs text-slate-400">packages pending</span>
          </div>
        </div>

        {/* Card: Cleanup */}
        <div
          onClick={() => onNavigateTab("cleanup")}
          className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Recoverable Space
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {cleanupPreview?.total_space || "0 B"}
            </span>
            <span className="text-xs text-slate-400">in cache</span>
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 dark:border-amber-500/15 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            Quick Maintenance Hub
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Keep your Homebrew environment healthy, updated, and clean.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onRunCleanup}
            disabled={isActionRunning}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            Clean Cache
          </button>

          <button
            onClick={onRunAutoremove}
            disabled={isActionRunning}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-500" />
            Autoremove Orphans
          </button>

          <button
            onClick={onOpenDoctor}
            disabled={isActionRunning}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            Doctor Health Check
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outdated Packages Panel */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-amber-500" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Outdated Packages ({totalOutdated})
              </h4>
            </div>
            {totalOutdated > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Action needed
              </span>
            )}
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-80 divide-y divide-slate-100 dark:divide-slate-800/60">
            {totalOutdated === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  All packages are up to date!
                </p>
                <p className="text-[11px] text-slate-400">Everything is running latest versions.</p>
              </div>
            ) : (
              <>
                {outdated.casks?.map((cask) => (
                  <div
                    key={cask.name}
                    className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {cask.name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          Cask
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {cask.installed_versions.join(", ")} &rarr;{" "}
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {cask.current_version}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onUpgradePackage(cask.name, true)}
                      disabled={isActionRunning}
                      className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium text-[11px] transition-colors cursor-pointer"
                    >
                      Update
                    </button>
                  </div>
                ))}

                {outdated.formulae?.map((form) => (
                  <div
                    key={form.name}
                    className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                          {form.name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          Formula
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {form.installed_versions.join(", ")} &rarr;{" "}
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {form.current_version}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onUpgradePackage(form.name, false)}
                      disabled={isActionRunning}
                      className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium text-[11px] transition-colors cursor-pointer"
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
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-500" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Background Services ({runningServices.length} Active)
              </h4>
            </div>
            <button
              onClick={() => onNavigateTab("services")}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-80 divide-y divide-slate-100 dark:divide-slate-800/60">
            {services.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-slate-400">No background services configured</p>
              </div>
            ) : (
              services.map((svc) => (
                <div
                  key={svc.name}
                  className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-lg"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        svc.status === "started"
                          ? "bg-emerald-500 animate-pulse"
                          : svc.status === "error"
                          ? "bg-red-500"
                          : "bg-slate-400"
                      }`}
                    />
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        {svc.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        status: <span className="capitalize">{svc.status}</span>
                        {svc.user && ` • by ${svc.user}`}
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
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onServiceAction(svc.name, "stop")}
                          disabled={isActionRunning}
                          className="px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-medium transition-colors"
                        >
                          Stop
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onServiceAction(svc.name, "start")}
                        disabled={isActionRunning}
                        className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium transition-colors flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
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
