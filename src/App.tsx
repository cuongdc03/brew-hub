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

      // In parallel / background fetch outdated and cleanup preview which take a bit longer
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
      output: `Running: brew upgrade ${isCask ? "--cask " : ""}${name}...\nPlease wait...\n`,
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = await upgradePackage(name, isCask);
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\nOperation ${
          res.success ? "completed successfully!" : "failed."
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

  const handleUninstallPackage = async (name: string, isCask: boolean) => {
    setTerminalState({
      isOpen: true,
      title: `brew uninstall ${isCask ? "--cask " : ""}${name}`,
      output: `Running: brew uninstall ${isCask ? "--cask " : ""}${name}...\nPlease wait...\n`,
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = await uninstallPackage(name, isCask);
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\nOperation ${
          res.success ? "completed successfully!" : "failed."
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
      output: `Running: brew install ${isCask ? "--cask " : ""}${name}...\nPlease wait...\n`,
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = await installPackage(name, isCask);
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\nOperation ${
          res.success ? "completed successfully!" : "failed."
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
      output: "Purging Homebrew cache and obsolete downloaded archives...\n",
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = await executeCleanup();
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\nDisk cleanup complete!`,
        isLoading: false,
      }));
      // Refresh cleanup preview and system data
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
      output: "Removing unneeded orphaned formulas that were installed as dependencies...\n",
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = await executeAutoremove();
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\nAutoremove complete!`,
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
      output: "Running Homebrew Doctor to diagnose system issues...\nPlease wait...\n",
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = await checkDoctor();
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\nDiagnostic complete!`,
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
          title: "System Overview",
          subtitle: "Summary of your packages, updates, services, and disk usage",
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
          subtitle: "Manage CLI binaries, packages, and development libraries",
          showSearch: true,
        };
      case "services":
        return {
          title: "Background Services",
          subtitle: "Control background daemons and service lifecycles",
          showSearch: true,
        };
      case "cleanup":
        return {
          title: "Disk Storage Cleaner",
          subtitle: "Free up storage by purging cached packages and old bottles",
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased font-sans">
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
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950/80">
        <Header
          title={headerMeta.title}
          subtitle={headerMeta.subtitle}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onRefresh={loadData}
          isLoading={isLoading}
          showSearchInput={headerMeta.showSearch}
        />

        <div className="flex-1 overflow-y-auto">
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
            />
          )}

          {activeTab === "services" && (
            <ServicesView
              services={services}
              searchTerm={searchTerm}
              onServiceAction={handleServiceAction}
              isActionRunning={isActionRunning}
            />
          )}

          {activeTab === "cleanup" && (
            <CleanupView
              preview={cleanupPreview}
              onRunCleanup={handleRunCleanup}
              onRunAutoremove={handleRunAutoremove}
              isActionRunning={isActionRunning}
            />
          )}

          {activeTab === "search" && (
            <SearchView
              onInstall={handleInstallPackage}
              isActionRunning={isActionRunning}
            />
          )}
        </div>
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
