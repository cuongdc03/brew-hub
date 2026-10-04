import React from "react";
import { Server, Play, Square, RotateCw, FileCode, User, AlertTriangle, ShieldAlert } from "lucide-react";
import { ServiceInfo } from "../types/brew";

interface ServicesViewProps {
  services: ServiceInfo[];
  searchTerm: string;
  onServiceAction: (name: string, action: "start" | "stop" | "restart", asRoot?: boolean) => void;
  isActionRunning: boolean;
  isLoading?: boolean;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  searchTerm,
  onServiceAction,
  isActionRunning,
  isLoading,
}) => {
  const filtered = services.filter((s) => {
    const q = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.status.toLowerCase().includes(q);
  });

  const runningCount = services.filter((s) => s.status === "started").length;
  const errorCount = services.filter((s) => s.status === "error").length;

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Overview Card */}
      <div className="p-4 rounded-xl border border-white/6 bg-[#18181c]/60 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold text-zinc-100 text-xs tracking-tight flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-[#30D158]" />
            macOS LaunchDaemons & LaunchAgents
          </h4>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Background system daemons and user agents configured through Homebrew Services.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          {errorCount > 0 && (
            <span className="text-[#FF453A] flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {errorCount} failing
            </span>
          )}
          <div>
            <span className="font-bold text-[#30D158]">{runningCount}</span>{" "}
            <span className="text-zinc-500">of {services.length} active</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl apple-shimmer border border-white/6" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center text-zinc-500 border border-dashed border-white/8 rounded-2xl">
          <Server className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-semibold text-zinc-400">No services found</p>
          <p className="text-xs text-zinc-600 mt-1">
            Install server daemons like postgresql, redis, or nginx to manage them here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((svc) => {
            const isRunning = svc.status === "started";
            const isError = svc.status === "error";
            const isRoot = svc.user === "root";

            return (
              <div
                key={svc.name}
                className={`p-4 rounded-xl apple-card flex flex-col justify-between transition-colors ${
                  isError ? "border-red-500/30 bg-red-500/[0.02]" : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isRunning
                            ? "bg-[#30D158] shadow-xs shadow-[#30D158]/50"
                            : isError
                            ? "bg-[#FF453A] shadow-xs shadow-[#FF453A]/50 animate-pulse"
                            : "bg-zinc-600"
                        }`}
                      />
                      <h4 className="font-mono font-semibold text-xs text-zinc-100">
                        {svc.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isRoot && (
                        <span
                          className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono flex items-center gap-1"
                          title="Registered as system root daemon (requires administrator authorization)"
                        >
                          <ShieldAlert className="w-2.5 h-2.5" />
                          root
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md font-mono ${
                          isRunning
                            ? "bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20"
                            : isError
                            ? "bg-[#FF453A]/10 text-[#FF453A] border border-[#FF453A]/20"
                            : "bg-white/[0.05] text-zinc-400 border border-white/5"
                        }`}
                      >
                        {isError && svc.exit_code !== null && svc.exit_code !== undefined
                          ? `error (${svc.exit_code})`
                          : svc.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-zinc-400">
                    {svc.user && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <User className="w-3 h-3 text-zinc-500" />
                        <span>
                          User: <strong className="text-zinc-300 font-normal">{svc.user}</strong>
                        </span>
                      </div>
                    )}

                    {isError && svc.exit_code !== null && svc.exit_code !== undefined && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#FF453A] bg-red-500/10 border border-red-500/20 rounded-md p-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#FF453A]" />
                        <span>
                          Process exited with failure code{" "}
                          <strong className="font-mono font-bold text-red-200">{svc.exit_code}</strong>
                        </span>
                      </div>
                    )}

                    {svc.file && (
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500 truncate">
                        <FileCode className="w-3 h-3 text-zinc-600 shrink-0" />
                        <span className="truncate select-all" title={svc.file}>
                          {svc.file}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/6 flex items-center justify-end gap-1.5">
                  {isRunning ? (
                    <>
                      <button
                        onClick={() => onServiceAction(svc.name, "restart", isRoot)}
                        disabled={isActionRunning}
                        className="px-2.5 py-1 apple-btn-secondary text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title={isRoot ? "Restart service using administrator privileges" : "Restart service"}
                      >
                        <RotateCw className="w-3 h-3" />
                        Restart
                      </button>
                      <button
                        onClick={() => onServiceAction(svc.name, "stop", isRoot)}
                        disabled={isActionRunning}
                        className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[#FF453A] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title={isRoot ? "Stop service using administrator privileges" : "Stop service"}
                      >
                        <Square className="w-2.5 h-2.5 fill-current" />
                        Stop
                      </button>
                    </>
                  ) : isError ? (
                    <>
                      <button
                        onClick={() => onServiceAction(svc.name, "restart", isRoot)}
                        disabled={isActionRunning}
                        className="px-2.5 py-1 apple-btn-secondary text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Retry starting service"
                      >
                        <RotateCw className="w-3 h-3" />
                        Retry
                      </button>
                      <button
                        onClick={() => onServiceAction(svc.name, "stop", isRoot)}
                        disabled={isActionRunning}
                        className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[#FF453A] text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title="Stop and clear service error state"
                      >
                        <Square className="w-2.5 h-2.5 fill-current" />
                        Clear
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onServiceAction(svc.name, "start", isRoot)}
                      disabled={isActionRunning}
                      className="px-3 py-1 rounded-lg bg-[#30D158] hover:bg-[#28B84D] text-black text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title={isRoot ? "Start service using administrator privileges" : "Start service"}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Start Service
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
