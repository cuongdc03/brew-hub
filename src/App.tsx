import { useEffect, useState } from "react";
import { Sidebar, TabType } from "./components/Sidebar";
import { Header } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { CasksView } from "./components/CasksView";
import { FormulaeView } from "./components/FormulaeView";
import { ServicesView } from "./components/ServicesView";
import { CleanupView } from "./components/CleanupView";
import { SearchView } from "./components/SearchView";
import { TerminalModal } from "./components/TerminalModal";
import { ArrowUpCircle, Zap } from "lucide-react";
import {
  CaskItem,
  CleanupPreview,
  FormulaItem,
  OutdatedData,
  ServiceInfo,
  SystemInfo,
} from "./types/brew";
import {
  checkDoctor,
  executeAutoremove,
  executeCleanup,
  fetchCleanupPreview,
  fetchInstalledPackages,
  fetchOutdatedPackages,
  fetchServices,
  fetchSystemInfo,
  installPackage,
  manageService,
  uninstallPackage,
  upgradePackage,
} from "./services/api";

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [searchTerm, setSearchTerm] = useState("");

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [casks, setCasks] = useState<CaskItem[]>([]);
  const [formulae, setFormulae] = useState<FormulaItem[]>([]);
  const [outdated, setOutdated] = useState<OutdatedData>({ formulae: [], casks: [] });
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [cleanupPreview, setCleanupPreview] = useState<CleanupPreview | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isActionRunning, setIsActionRunning] = useState(false);

  const [terminalState, setTerminalState] = useState<{
    isOpen: boolean;
    title: string;
    output: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    title: "",
    output: "",
    isLoading: false,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Fetch base system & installed packages first
      const [sys, installed, svcs] = await Promise.all([
        fetchSystemInfo().catch((err) => {
          console.warn("Failed to get system info:", err);
          return null;
        }),
        fetchInstalledPackages().catch((err) => {
          console.warn("Failed to get installed packages:", err);
          return { formulae: [], casks: [] };
        }),
        fetchServices().catch((err) => {
          console.warn("Failed to get services:", err);
          return [];
        }),
      ]);

      if (sys) setSystemInfo(sys);
      setCasks(installed.casks);
      setFormulae(installed.formulae);
      setServices(svcs);

      // Fetch outdated and cleanup preview concurrently
      fetchOutdatedPackages()
        .then((out) => setOutdated(out))
        .catch((err) => console.warn("Failed to fetch outdated packages:", err));

      fetchCleanupPreview()
        .then((cln) => setCleanupPreview(cln))
        .catch((err) => console.warn("Failed to fetch cleanup preview:", err));
    } catch (err) {
      console.error("Error loading Homebrew data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpgradePackage = async (name: string, isCask: boolean) => {
    setTerminalState({
      isOpen: true,
      title: `brew upgrade ${isCask ? "--cask " : ""}${name}`,
      output: `==> Running: brew upgrade ${isCask ? "--cask " : ""}${name}\nPlease wait, updating package files...\n`,
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = await upgradePackage(name, isCask);
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\n==> Upgrade ${
          res.success ? "completed successfully!" : "finished with errors."
        }`,
        isLoading: false,
      }));
      loadData();
    } catch (err: any) {
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\nError: ${err?.message || err}`,
        isLoading: false,
      }));
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleUpgradeAll = async () => {
    setTerminalState({
      isOpen: true,
      title: "brew upgrade",
      output: "==> Upgrading all outdated packages & applications...\nPlease wait...\n",
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const allOutdatedNames = [
        ...outdated.formulae.map((f) => ({ name: f.name, isCask: false })),
        ...outdated.casks.map((c) => ({ name: c.name, isCask: true })),
      ];

      for (const item of allOutdatedNames) {
        setTerminalState((prev) => ({
          ...prev,
          output: `${prev.output}\n==> Upgrading ${item.name}...`,
        }));
        await upgradePackage(item.name, item.isCask);
      }

      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n\n==> All packages upgraded successfully!`,
        isLoading: false,
      }));
      loadData();
    } catch (err: any) {
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\nError: ${err?.message || err}`,
        isLoading: false,
      }));
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleUninstallPackage = async (name: string, isCask: boolean) => {
    setTerminalState({
      isOpen: true,
      title: `brew uninstall ${isCask ? "--cask " : ""}${name}`,
      output: `==> Running: brew uninstall ${isCask ? "--cask " : ""}${name}...\nPlease wait...\n`,
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = await uninstallPackage(name, isCask);
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\n==> Uninstall ${
          res.success ? "completed successfully!" : "finished."
        }`,
        isLoading: false,
      }));
      loadData();
    } catch (err: any) {
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\nError: ${err?.message || err}`,
        isLoading: false,
      }));
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleInstallPackage = async (name: string, isCask: boolean) => {
    setTerminalState({
      isOpen: true,
      title: `brew install ${isCask ? "--cask " : ""}${name}`,
      output: `==> Running: brew install ${isCask ? "--cask " : ""}${name}...\nDownloading and fetching dependencies...\n`,
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = await installPackage(name, isCask);
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\n==> Installation ${
          res.success ? "completed successfully!" : "finished."
        }`,
        isLoading: false,
      }));
      loadData();
    } catch (err: any) {
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\nError: ${err?.message || err}`,
        isLoading: false,
      }));
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleServiceAction = async (name: string, action: "start" | "stop" | "restart") => {
    setIsActionRunning(true);
    try {
      await manageService(name, action);
      const updated = await fetchServices();
      setServices(updated);
    } catch (err: any) {
      setTerminalState({
        isOpen: true,
        title: `brew services ${action} ${name}`,
        output: `Error executing service command: ${err?.message || err}`,
        isLoading: false,
      });
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleRunCleanup = async () => {
    setTerminalState({
      isOpen: true,
      title: "brew cleanup --prune=all",
      output: "==> Purging Homebrew cache and obsolete downloaded archives...\n",
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = await executeCleanup();
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\n==> Disk cleanup complete!`,
        isLoading: false,
      }));
      fetchCleanupPreview().then((cln) => setCleanupPreview(cln));
    } catch (err: any) {
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\nError during cleanup: ${err?.message || err}`,
        isLoading: false,
      }));
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleRunAutoremove = async () => {
    setTerminalState({
      isOpen: true,
      title: "brew autoremove",
      output: "==> Removing unneeded orphaned formulas that were installed as dependencies...\n",
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = await executeAutoremove();
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\n==> Autoremove complete!`,
        isLoading: false,
      }));
      loadData();
    } catch (err: any) {
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\nError during autoremove: ${err?.message || err}`,
        isLoading: false,
      }));
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleCheckDoctor = async () => {
    setTerminalState({
      isOpen: true,
      title: "brew doctor",
      output: "==> Running Homebrew Doctor to diagnose system issues...\nPlease wait...\n",
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = await checkDoctor();
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\n==> Diagnostic complete!`,
        isLoading: false,
      }));
    } catch (err: any) {
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\nError: ${err?.message || err}`,
        isLoading: false,
      }));
    } finally {
      setIsActionRunning(false);
    }
  };

  const getTabHeader = () => {
    switch (activeTab) {
      case "dashboard":
        return {
          title: "Dashboard Overview",
          subtitle: "Summary of your packages, updates, background services, and storage",
          showSearch: false,
        };
      case "casks":
        return {
          title: "Installed Applications",
          subtitle: "Manage macOS desktop apps installed through Homebrew Casks",
          showSearch: true,
        };
      case "formulae":
        return {
          title: "Command-Line Formulae",
          subtitle: "Manage CLI binaries, tools, and developer libraries",
          showSearch: true,
        };
      case "services":
        return {
          title: "Background Services",
          subtitle: "Monitor and control background daemons and system services",
          showSearch: true,
        };
      case "cleanup":
        return {
          title: "Storage Cleaner",
          subtitle: "Reclaim disk space by purging cached archives and obsolete bottles",
          showSearch: false,
        };
      case "search":
        return {
          title: "Explore Packages",
          subtitle: "Search and install formulae and desktop applications directly",
          showSearch: false,
        };
    }
  };

  const headerMeta = getTabHeader();
  const totalOutdatedCount = (outdated.formulae?.length || 0) + (outdated.casks?.length || 0);
  const runningServicesCount = services.filter((s) => s.status === "started").length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 antialiased font-sans select-none relative">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSearchTerm("");
        }}
        counts={{
          casks: casks.length,
          formulae: formulae.length,
          servicesRunning: runningServicesCount,
          outdated: totalOutdatedCount,
          cleanupSpace: cleanupPreview?.total_space || "0 B",
        }}
        systemInfo={systemInfo}
        onOpenDoctor={handleCheckDoctor}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950/95 relative">
        <Header
          title={headerMeta.title}
          subtitle={headerMeta.subtitle}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onRefresh={loadData}
          isLoading={isLoading}
          showSearchInput={headerMeta.showSearch}
        />

        <div className="flex-1 overflow-y-auto pb-20">
          {activeTab === "dashboard" && (
            <DashboardView
              casks={casks}
              formulae={formulae}
              outdated={outdated}
              services={services}
              cleanupPreview={cleanupPreview}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                setSearchTerm("");
              }}
              onUpgradePackage={handleUpgradePackage}
              onRunCleanup={handleRunCleanup}
              onRunAutoremove={handleRunAutoremove}
              onServiceAction={handleServiceAction}
              onOpenDoctor={handleCheckDoctor}
              isActionRunning={isActionRunning}
              isLoading={isLoading}
            />
          )}

          {activeTab === "casks" && (
            <CasksView
              casks={casks}
              outdatedList={outdated.casks || []}
              searchTerm={searchTerm}
              onUpgrade={(name) => handleUpgradePackage(name, true)}
              onUninstall={(name) => handleUninstallPackage(name, true)}
              isActionRunning={isActionRunning}
              isLoading={isLoading}
            />
          )}

          {activeTab === "formulae" && (
            <FormulaeView
              formulae={formulae}
              outdatedList={outdated.formulae || []}
              searchTerm={searchTerm}
              onUpgrade={(name) => handleUpgradePackage(name, false)}
              onUninstall={(name) => handleUninstallPackage(name, false)}
              isActionRunning={isActionRunning}
              isLoading={isLoading}
            />
          )}

          {activeTab === "services" && (
            <ServicesView
              services={services}
              searchTerm={searchTerm}
              onServiceAction={handleServiceAction}
              isActionRunning={isActionRunning}
              isLoading={isLoading}
            />
          )}

          {activeTab === "cleanup" && (
            <CleanupView
              preview={cleanupPreview}
              onRunCleanup={handleRunCleanup}
              onRunAutoremove={handleRunAutoremove}
              isActionRunning={isActionRunning}
              isLoading={isLoading}
            />
          )}

          {activeTab === "search" && (
            <SearchView
              onInstall={handleInstallPackage}
              isActionRunning={isActionRunning}
            />
          )}
        </div>

        {/* Floating Batch Action Bar when updates are available */}
        {totalOutdatedCount > 0 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-bottom-4 duration-200">
            <div className="px-5 py-2.5 rounded-2xl bg-zinc-900/90 border border-amber-500/30 backdrop-blur-2xl shadow-2xl shadow-amber-950/40 flex items-center gap-4 ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <ArrowUpCircle className="w-4 h-4 text-amber-400" />
                <span>
                  <strong className="text-amber-400 font-mono">{totalOutdatedCount}</strong> updates
                  ready to install
                </span>
              </div>

              <div className="h-4 w-px bg-white/10" />

              <button
                onClick={handleUpgradeAll}
                disabled={isActionRunning}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                Upgrade All
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Output Console / Modal */}
      <TerminalModal
        isOpen={terminalState.isOpen}
        onClose={() => setTerminalState((prev) => ({ ...prev, isOpen: false }))}
        title={terminalState.title}
        output={terminalState.output}
        isLoading={terminalState.isLoading}
      />
    </div>
  );
}

export default App;
