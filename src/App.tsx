import { useEffect, useState } from "react";
import { Sidebar, TabType } from "./components/Sidebar";
import { UnifiedToolbar } from "./components/UnifiedToolbar";
import { DashboardView } from "./components/DashboardView";
import { CasksView } from "./components/CasksView";
import { FormulaeView } from "./components/FormulaeView";
import { ServicesView } from "./components/ServicesView";
import { CleanupView } from "./components/CleanupView";
import { BrewfileView } from "./components/BrewfileView";
import { SearchView } from "./components/SearchView";
import { TerminalModal } from "./components/TerminalModal";
import { PackageInspector, InspectedItem } from "./components/PackageInspector";
import { ArrowUpCircle, Zap } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import {
  CaskItem,
  CleanupPreview,
  FormulaItem,
  OutdatedData,
  ServiceInfo,
  SystemInfo,
  UnmanagedApp,
} from "./types/brew";
import {
  adoptCask,
  checkDoctor,
  executeAutoremove,
  executeCleanup,
  fetchCleanupPreview,
  fetchInstalledPackages,
  fetchOutdatedPackages,
  fetchServices,
  fetchSystemInfo,
  fetchUnmanagedApps,
  installPackage,
  manageService,
  pinPackage,
  uninstallPackage,
  unpinPackage,
  upgradePackage,
} from "./services/api";

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [searchTerm, setSearchTerm] = useState("");

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [casks, setCasks] = useState<CaskItem[]>([]);
  const [unmanagedApps, setUnmanagedApps] = useState<UnmanagedApp[]>([]);
  const [formulae, setFormulae] = useState<FormulaItem[]>([]);
  const [outdated, setOutdated] = useState<OutdatedData>({ formulae: [], casks: [] });
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [cleanupPreview, setCleanupPreview] = useState<CleanupPreview | null>(null);

  const [includeGreedy, setIncludeGreedy] = useState<boolean>(() => {
    try {
      return localStorage.getItem("brew_hub_greedy_casks") === "true";
    } catch {
      return false;
    }
  });

  const [ignoredCasks, setIgnoredCasks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("brew_hub_ignored_casks");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedItem, setSelectedItem] = useState<InspectedItem>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

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

      fetchOutdatedPackages(includeGreedy)
        .then((out) => setOutdated(out))
        .catch((err) => console.warn("Failed to fetch outdated packages:", err));

      fetchCleanupPreview()
        .then((cln) => setCleanupPreview(cln))
        .catch((err) => console.warn("Failed to fetch cleanup preview:", err));

      fetchUnmanagedApps()
        .then((apps) => setUnmanagedApps(apps))
        .catch((err) => console.warn("Failed to scan unmanaged apps:", err));
    } catch (err) {
      console.error("Error loading Homebrew data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleGreedy = async (val: boolean) => {
    setIncludeGreedy(val);
    try {
      localStorage.setItem("brew_hub_greedy_casks", String(val));
    } catch (e) {
      console.warn("Failed to persist greedy preference:", e);
    }
    try {
      const out = await fetchOutdatedPackages(val);
      setOutdated(out);
    } catch (err) {
      console.warn("Failed to re-fetch outdated packages with greedy flag:", err);
    }
  };

  const handleToggleIgnoreCask = (token: string) => {
    setIgnoredCasks((prev) => {
      const next = prev.includes(token)
        ? prev.filter((t) => t !== token)
        : [...prev, token];
      try {
        localStorage.setItem("brew_hub_ignored_casks", JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to persist ignored casks:", e);
      }
      return next;
    });
  };

  const handleTogglePinFormula = async (name: string, isCurrentlyPinned: boolean) => {
    const action = isCurrentlyPinned ? "unpin" : "pin";
    setTerminalState({
      isOpen: true,
      title: `brew ${action} ${name}`,
      output: `==> Running: brew ${action} ${name}...\n`,
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = isCurrentlyPinned ? await unpinPackage(name) : await pinPackage(name);
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n==> ${
          isCurrentlyPinned ? `Unpinned ${name} successfully` : `Pinned ${name} successfully`
        }`,
        isLoading: false,
      }));
      await loadData();
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

  useEffect(() => {
    loadData();
  }, []);

  // Listen for macOS menu-bar tray actions
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen("tray-upgrade-all", () => {
      handleUpgradeAll();
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, [outdated]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (terminalState.isOpen) {
          setTerminalState((prev) => ({ ...prev, isOpen: false }));
        } else if (isInspectorOpen) {
          setIsInspectorOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [terminalState.isOpen, isInspectorOpen]);

  const handleSelectItem = (item: InspectedItem) => {
    setSelectedItem(item);
    if (item) {
      setIsInspectorOpen(true);
    }
  };

  const handleUpgradePackage = async (name: string, isCask: boolean) => {
    const greedy = isCask && includeGreedy;
    setTerminalState({
      isOpen: true,
      title: `brew upgrade ${isCask ? "--cask " : ""}${greedy ? "--greedy " : ""}${name}`,
      output: `==> Running: brew upgrade ${isCask ? "--cask " : ""}${greedy ? "--greedy " : ""}${name}\nUpdating package binaries...\n`,
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = await upgradePackage(name, isCask, greedy);
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\n==> Upgrade ${
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

  const handleUpgradeAll = async () => {
    setTerminalState({
      isOpen: true,
      title: "brew upgrade",
      output: "==> Upgrading outdated packages & applications...\nPlease wait...\n",
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const pinnedFormulae = outdated.formulae.filter((f) => f.pinned);
      const upgradeableFormulae = outdated.formulae.filter((f) => !f.pinned);

      const ignoredCasksList = outdated.casks.filter((c) => ignoredCasks.includes(c.name));
      const upgradeableCasks = outdated.casks.filter((c) => !ignoredCasks.includes(c.name));

      if (pinnedFormulae.length > 0) {
        setTerminalState((prev) => ({
          ...prev,
          output: `${prev.output}\n==> Skipping ${pinnedFormulae.length} pinned formulae (held back):\n    ${pinnedFormulae.map((f) => f.name).join(", ")}\n`,
        }));
      }

      if (ignoredCasksList.length > 0) {
        setTerminalState((prev) => ({
          ...prev,
          output: `${prev.output}\n==> Skipping ${ignoredCasksList.length} ignored applications:\n    ${ignoredCasksList.map((c) => c.name).join(", ")}\n`,
        }));
      }

      const targets = [
        ...upgradeableFormulae.map((f) => ({ name: f.name, isCask: false })),
        ...upgradeableCasks.map((c) => ({ name: c.name, isCask: true })),
      ];

      if (targets.length === 0) {
        setTerminalState((prev) => ({
          ...prev,
          output: `${prev.output}\n==> No upgradeable packages remaining (all are pinned or ignored).`,
          isLoading: false,
        }));
        return;
      }

      for (const item of targets) {
        setTerminalState((prev) => ({
          ...prev,
          output: `${prev.output}\n==> Upgrading ${item.name}...`,
        }));
        await upgradePackage(item.name, item.isCask, item.isCask && includeGreedy);
      }

      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n\n==> All upgradeable packages completed successfully!`,
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
      if (res.success) {
        setSelectedItem((prev) => {
          if (!prev) return null;
          const prevName =
            prev.type === "cask"
              ? (prev.data as any).token
              : (prev.data as any).name;
          if (prevName === name) {
            setIsInspectorOpen(false);
            return null;
          }
          return prev;
        });
      }
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

  const handleAdoptApp = async (token: string) => {
    setTerminalState({
      isOpen: true,
      title: `brew install --cask --adopt ${token}`,
      output: `==> Running: brew install --cask --adopt ${token}...\nAdopting existing local application bundle into Homebrew...\n`,
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = await adoptCask(token);
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\n==> Adoption ${
          res.success
            ? "completed successfully! The application is now tracked by Homebrew."
            : "finished."
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

  const handleRunCommandInTerminal = async (
    title: string,
    runAction: () => Promise<{ success: boolean; stdout: string; stderr: string }>
  ) => {
    setTerminalState({
      isOpen: true,
      title,
      output: `==> Running: ${title}...\nPlease wait...\n`,
      isLoading: true,
    });
    setIsActionRunning(true);

    try {
      const res = await runAction();
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\n==> Operation ${
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
          title: "System Overview",
          subtitle: "Summary of packages, daemons, and storage health",
          showSearch: false,
          canInspect: false,
        };
      case "casks":
        return {
          title: "Applications",
          subtitle: "macOS desktop software installed with Homebrew Casks",
          showSearch: true,
          canInspect: true,
        };
      case "formulae":
        return {
          title: "Formulae",
          subtitle: "CLI binaries, developer tools, and system libraries",
          showSearch: true,
          canInspect: true,
        };
      case "services":
        return {
          title: "Services",
          subtitle: "Background system daemons and launch agents",
          showSearch: true,
          canInspect: false,
        };
      case "cleanup":
        return {
          title: "Storage",
          subtitle: "Purge cached archives and orphaned dependencies",
          showSearch: false,
          canInspect: false,
        };
      case "brewfile":
        return {
          title: "Brewfile & Sync",
          subtitle: "Declarative package backup, migration, and dependency check",
          showSearch: false,
          canInspect: false,
        };
      case "search":
        return {
          title: "Package Store",
          subtitle: "Explore and install new casks and formulae",
          showSearch: false,
          canInspect: false,
        };
    }
  };

  const headerMeta = getTabHeader();
  const actionableFormulaeCount = (outdated.formulae || []).filter((f) => !f.pinned).length;
  const actionableCasksCount = (outdated.casks || []).filter(
    (c) => !ignoredCasks.includes(c.name)
  ).length;
  const totalOutdatedCount = actionableFormulaeCount + actionableCasksCount;
  const runningServicesCount = services.filter((s) => s.status === "started").length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#111114] text-[#f5f5f7] antialiased select-none relative font-sans">
      {/* Apple-styled Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSearchTerm("");
        }}
        counts={{
          casks: casks.length,
          unmanagedCasks: unmanagedApps.length,
          formulae: formulae.length,
          servicesRunning: runningServicesCount,
          outdated: totalOutdatedCount,
          cleanupSpace: cleanupPreview?.total_space || "0 B",
        }}
        systemInfo={systemInfo}
        onOpenDoctor={handleCheckDoctor}
      />

      {/* Main Content Area with Split Inspector Support */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121215]">
        <UnifiedToolbar
          title={headerMeta.title}
          subtitle={headerMeta.subtitle}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onRefresh={loadData}
          isLoading={isLoading}
          showSearchInput={headerMeta.showSearch}
          isInspectorOpen={isInspectorOpen}
          onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
          canInspect={headerMeta.canInspect && Boolean(selectedItem)}
        />

        <div className="flex-1 flex overflow-hidden relative">
          {/* Scrollable Center Content */}
          <main className="flex-1 overflow-y-auto pb-20">
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
                onSelectItem={handleSelectItem}
                includeGreedy={includeGreedy}
                onToggleGreedy={handleToggleGreedy}
                ignoredCasks={ignoredCasks}
                onTogglePin={handleTogglePinFormula}
                onToggleIgnoreCask={handleToggleIgnoreCask}
              />
            )}

            {activeTab === "casks" && (
              <CasksView
                casks={casks}
                outdatedList={outdated.casks || []}
                unmanagedApps={unmanagedApps}
                searchTerm={searchTerm}
                onUpgrade={(name) => handleUpgradePackage(name, true)}
                onUninstall={(name) => handleUninstallPackage(name, true)}
                onAdopt={handleAdoptApp}
                isActionRunning={isActionRunning}
                isLoading={isLoading}
                selectedItem={selectedItem}
                onSelectItem={handleSelectItem}
                includeGreedy={includeGreedy}
                onToggleGreedy={handleToggleGreedy}
                ignoredCasks={ignoredCasks}
                onToggleIgnoreCask={handleToggleIgnoreCask}
              />
            )}

            {activeTab === "formulae" && (
              <FormulaeView
                formulae={formulae}
                outdatedList={outdated.formulae || []}
                searchTerm={searchTerm}
                onUpgrade={(name) => handleUpgradePackage(name, false)}
                onUninstall={(name) => handleUninstallPackage(name, false)}
                onTogglePin={handleTogglePinFormula}
                isActionRunning={isActionRunning}
                isLoading={isLoading}
                selectedItem={selectedItem}
                onSelectItem={handleSelectItem}
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

            {activeTab === "brewfile" && (
              <BrewfileView
                onRunCommandInTerminal={handleRunCommandInTerminal}
                isActionRunning={isActionRunning}
              />
            )}

            {activeTab === "search" && (
              <SearchView
                onInstall={handleInstallPackage}
                isActionRunning={isActionRunning}
              />
            )}
          </main>

          {/* Apple Inspector Panel on Right */}
          {isInspectorOpen && selectedItem && (
            <PackageInspector
              item={selectedItem}
              onClose={() => setIsInspectorOpen(false)}
              onUpgrade={handleUpgradePackage}
              onUninstall={handleUninstallPackage}
              onTogglePin={handleTogglePinFormula}
              ignoredCasks={ignoredCasks}
              onToggleIgnoreCask={handleToggleIgnoreCask}
              isActionRunning={isActionRunning}
            />
          )}
        </div>

        {/* Floating Batch Upgrade Bar */}
        {totalOutdatedCount > 0 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-bottom-4 duration-200">
            <div className="px-4 py-2 rounded-2xl bg-[#1C1C1E]/95 border border-white/10 backdrop-blur-2xl shadow-2xl flex items-center gap-3.5 ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <span className="w-2 h-2 rounded-full bg-[#FF9F0A] animate-ping" />
                <ArrowUpCircle className="w-4 h-4 text-[#FF9F0A]" />
                <span>
                  <strong className="text-[#FF9F0A] font-mono">{totalOutdatedCount}</strong> updates ready
                </span>
              </div>

              <div className="h-3.5 w-px bg-white/10" />

              <button
                onClick={handleUpgradeAll}
                disabled={isActionRunning}
                className="px-3 py-1 rounded-lg apple-btn-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                Upgrade All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Terminal Modal */}
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
