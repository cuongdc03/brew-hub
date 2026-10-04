import { useEffect, useState, useRef } from "react";
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
import { ArrowUpCircle, Square, Zap } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useBrewOperation } from "./hooks/useBrewOperation";
import {
  BrewfileCheckResult,
  BrewfileData,
  CaskItem,
  CleanupPreview,
  FormulaItem,
  OutdatedData,
  ServiceInfo,
  SystemInfo,
  UnmanagedApp,
} from "./types/brew";
import {
  fetchBrewfile,
  fetchCleanupPreview,
  fetchInstalledPackages,
  fetchOutdatedPackages,
  fetchServices,
  fetchSystemInfo,
  fetchUnmanagedApps,
  checkForUpdates,
} from "./services/api";

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [searchTerm, setSearchTerm] = useState("");

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [casks, setCasks] = useState<CaskItem[]>([]);
  const [unmanagedApps, setUnmanagedApps] = useState<UnmanagedApp[]>([]);
  const [isScanningUnmanaged, setIsScanningUnmanaged] = useState(false);
  const [unmanagedAppsError, setUnmanagedAppsError] = useState<string | null>(null);
  const [formulae, setFormulae] = useState<FormulaItem[]>([]);
  const [outdated, setOutdated] = useState<OutdatedData>({ formulae: [], casks: [] });
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [cleanupPreview, setCleanupPreview] = useState<CleanupPreview | null>(null);
  const [cleanupPruneAll, setCleanupPruneAll] = useState(true);

  const [brewfileData, setBrewfileData] = useState<BrewfileData | null>(null);
  const [brewfileSavedContent, setBrewfileSavedContent] = useState<string>("");
  const [brewfileCheckResult, setBrewfileCheckResult] = useState<BrewfileCheckResult | null>(null);
  const [isBrewfileLoading, setIsBrewfileLoading] = useState<boolean>(false);

  const isBrewfileDirty =
    brewfileData !== null && brewfileData.content !== brewfileSavedContent;

  const loadBrewfileData = async (path?: string) => {
    try {
      setIsBrewfileLoading(true);
      const data = await fetchBrewfile(path);
      setBrewfileData(data);
      setBrewfileSavedContent(data.content);
      setBrewfileCheckResult(null);
    } catch (err) {
      console.error("Failed to load Brewfile:", err);
    } finally {
      setIsBrewfileLoading(false);
    }
  };

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
  const {
    terminalState,
    isActionRunning,
    runOperation,
    cancelActiveOperation,
    closeTerminal,
    openTerminal,
    setTerminalState,
  } = useBrewOperation();

  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(() => {
    const saved = localStorage.getItem("brewhub_last_checked");
    return saved ? parseInt(saved, 10) : null;
  });

  const handleCheckForUpdates = async () => {
    if (isCheckingUpdates || isActionRunning) return;
    setIsCheckingUpdates(true);
    try {
      const res = await checkForUpdates();
      if (res.outdated) {
        setOutdated(res.outdated);
      }
      if (res.last_checked) {
        setLastChecked(res.last_checked);
        localStorage.setItem("brewhub_last_checked", res.last_checked.toString());
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const isActionRunningRef = useRef(isActionRunning);
  isActionRunningRef.current = isActionRunning;

  const outdatedRef = useRef(outdated);
  outdatedRef.current = outdated;

  const loadUnmanagedApps = async () => {
    setIsScanningUnmanaged(true);
    setUnmanagedAppsError(null);
    try {
      const apps = await fetchUnmanagedApps();
      setUnmanagedApps(apps);
    } catch (err: any) {
      console.warn("Failed to scan unmanaged apps:", err);
      const msg = typeof err === "string" ? err : err?.message || "Failed to scan applications";
      setUnmanagedAppsError(msg);
    } finally {
      setIsScanningUnmanaged(false);
    }
  };

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

      fetchCleanupPreview(true)
        .then((cln) => setCleanupPreview(cln))
        .catch((err) => console.warn("Failed to fetch cleanup preview:", err));
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
    const title = `brew ${action} ${name}`;
    const args = [action, name];
    await runOperation(title, args, { onSuccess: loadData });
  };

  useEffect(() => {
    loadData();
    loadUnmanagedApps();
  }, []);

  useEffect(() => {
    if (activeTab === "brewfile" && !brewfileData && !isBrewfileLoading) {
      loadBrewfileData();
    }
  }, [activeTab]);

  // Listen for macOS menu-bar tray actions
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let isMounted = true;

    listen("tray-upgrade-all", () => {
      if (isActionRunningRef.current) {
        return;
      }
      handleUpgradeAll(true);
    }).then((fn) => {
      if (isMounted) {
        unlisten = fn;
      } else {
        fn();
      }
    });

    return () => {
      isMounted = false;
      if (unlisten) unlisten();
    };
  }, []);

  // Listen for background or tray update check completions
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<any>("brew-updates-checked", (event) => {
      if (event.payload?.outdated) {
        setOutdated(event.payload.outdated);
      }
      if (event.payload?.last_checked) {
        setLastChecked(event.payload.last_checked);
        localStorage.setItem("brewhub_last_checked", event.payload.last_checked.toString());
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

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
    const title = `brew upgrade ${isCask ? "--cask " : ""}${greedy ? "--greedy " : ""}${name}`;
    const args = isCask
      ? greedy
        ? ["upgrade", "--cask", "--greedy", name]
        : ["upgrade", "--cask", name]
      : ["upgrade", name];
    await runOperation(title, args, { onSuccess: loadData });
  };

  const handleUpgradeAll = async (_forceRefresh = false) => {
    const pinnedFormulae = outdated.formulae.filter((f) => f.pinned);
    const upgradeableFormulae = outdated.formulae.filter((f) => !f.pinned);

    const ignoredCasksList = outdated.casks.filter((c) => ignoredCasks.includes(c.name));
    const upgradeableCasks = outdated.casks.filter((c) => !ignoredCasks.includes(c.name));

    // If there are pinned or ignored items, upgrade only non-pinned, non-ignored targets
    if (pinnedFormulae.length > 0 || ignoredCasksList.length > 0) {
      const targets = [
        ...upgradeableFormulae.map((f) => f.name),
        ...upgradeableCasks.map((c) => c.name),
      ];

      if (targets.length === 0) {
        return;
      }

      const args = ["upgrade", ...targets];
      if (includeGreedy && upgradeableCasks.length > 0) {
        args.push("--greedy");
      }
      await runOperation(`brew upgrade (${targets.length} packages)`, args, { onSuccess: loadData });
    } else {
      const args = ["upgrade"];
      if (includeGreedy) {
        args.push("--greedy");
      }
      await runOperation(includeGreedy ? "brew upgrade --greedy" : "brew upgrade", args, {
        onSuccess: loadData,
      });
    }
  };

  const handleUninstallPackage = async (name: string, isCask: boolean) => {
    const title = `brew uninstall ${isCask ? "--cask " : ""}${name}`;
    const args = isCask ? ["uninstall", "--cask", name] : ["uninstall", name];
    await runOperation(title, args, {
      onSuccess: () => {
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
        loadData();
      },
    });
  };

  const handleInstallPackage = async (name: string, isCask: boolean) => {
    const title = `brew install ${isCask ? "--cask " : ""}${name}`;
    const args = isCask ? ["install", "--cask", name] : ["install", name];
    await runOperation(title, args, { onSuccess: loadData });
  };

  const handleAdoptApp = async (token: string) => {
    const title = `brew install --cask --adopt ${token}`;
    const args = ["install", "--cask", "--adopt", token];
    await runOperation(title, args, {
      onSuccess: () => {
        loadData();
        fetchUnmanagedApps().then(setUnmanagedApps).catch(() => {});
      },
    });
  };

  const handleRunCommandInTerminal = async (
    title: string,
    runAction: () => Promise<{ success: boolean; stdout: string; stderr: string }>
  ) => {
    setTerminalState({
      isOpen: true,
      title,
      output: `==> Running: ${title}...\nPlease wait...\n`,
      status: "running",
      exitCode: null,
      activeOpId: null,
    });

    try {
      const res = await runAction();
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\n${res.stdout}\n${res.stderr}\n\n==> Operation ${
          res.success ? "completed successfully!" : "finished."
        }`,
        status: res.success ? "success" : "error",
        exitCode: res.success ? 0 : 1,
      }));
      loadData();
    } catch (err: any) {
      setTerminalState((prev) => ({
        ...prev,
        output: `${prev.output}\nError: ${err?.message || err}`,
        status: "error",
        exitCode: 1,
      }));
    }
  };

  const handleServiceAction = async (
    name: string,
    action: "start" | "stop" | "restart",
    asRoot = false
  ) => {
    const args = ["services", action, name];
    if (asRoot) {
      args.push("--root");
    }
    await runOperation(`brew services ${action} ${name}${asRoot ? " (privileged)" : ""}`, args, {
      onSuccess: async () => {
        const updated = await fetchServices();
        setServices(updated);
      },
    });
  };

  const handlePruneModeChange = (all: boolean) => {
    setCleanupPruneAll(all);
    fetchCleanupPreview(all)
      .then((cln) => setCleanupPreview(cln))
      .catch((err) => console.error("Failed to fetch cleanup preview:", err));
  };

  const handleRunCleanup = async () => {
    const args = cleanupPruneAll ? ["cleanup", "-s", "--prune=all"] : ["cleanup", "-s"];
    await runOperation(
      cleanupPruneAll ? "brew cleanup -s --prune=all" : "brew cleanup -s",
      args,
      {
        onSuccess: () => {
          fetchCleanupPreview(cleanupPruneAll)
            .then((cln) => setCleanupPreview(cln))
            .catch(() => {});
        },
      }
    );
  };

  const handleRunAutoremove = async () => {
    await runOperation("brew autoremove", ["autoremove"], { onSuccess: loadData });
  };

  const handleCheckDoctor = async () => {
    await runOperation("brew doctor", ["doctor"]);
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
          isBrewfileDirty,
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
          onRefresh={() => {
            loadData();
            loadUnmanagedApps();
          }}
          onCheckUpdates={handleCheckForUpdates}
          isLoading={isLoading || isScanningUnmanaged}
          isCheckingUpdates={isCheckingUpdates}
          lastChecked={lastChecked}
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
                onCheckUpdates={handleCheckForUpdates}
                isCheckingUpdates={isCheckingUpdates}
              />
            )}

            {activeTab === "casks" && (
              <CasksView
                casks={casks}
                outdatedList={outdated.casks || []}
                unmanagedApps={unmanagedApps}
                unmanagedAppsError={unmanagedAppsError}
                isScanningUnmanaged={isScanningUnmanaged}
                onRefreshUnmanaged={loadUnmanagedApps}
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
                pruneAll={cleanupPruneAll}
                onPruneModeChange={handlePruneModeChange}
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
                brewfileData={brewfileData}
                setBrewfileData={setBrewfileData}
                savedContent={brewfileSavedContent}
                setSavedContent={setBrewfileSavedContent}
                checkResult={brewfileCheckResult}
                setCheckResult={setBrewfileCheckResult}
                onReload={loadBrewfileData}
                isLoading={isBrewfileLoading}
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
                onClick={() => handleUpgradeAll()}
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

      {/* Background Running Indicator */}
      {isActionRunning && !terminalState.isOpen && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-3 bg-zinc-900/95 border border-amber-500/30 shadow-2xl shadow-black/60 rounded-full px-4 py-2 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-mono font-medium text-zinc-200 max-w-xs truncate">
              {terminalState.title || "Operation running"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
            <button
              onClick={openTerminal}
              className="px-2.5 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all cursor-pointer"
            >
              View Logs
            </button>
            <button
              onClick={cancelActiveOperation}
              className="p-1 rounded-lg text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
              title="Cancel operation"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>
      )}

      {/* Terminal Modal */}
      <TerminalModal
        isOpen={terminalState.isOpen}
        onClose={closeTerminal}
        title={terminalState.title}
        output={terminalState.output}
        isLoading={isActionRunning}
        status={terminalState.status}
        exitCode={terminalState.exitCode}
        onCancel={cancelActiveOperation}
      />
    </div>
  );
}

export default App;
