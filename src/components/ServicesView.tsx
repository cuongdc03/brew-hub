import React from "react";
import { Server, Play, Square, RotateCw, FileCode, User } from "lucide-react";
import { ServiceInfo } from "../types/brew";

interface ServicesViewProps {
  services: ServiceInfo[];
  searchTerm: string;
  onServiceAction: (name: string, action: "start" | "stop" | "restart") => void;
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

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-zinc-900/60 to-zinc-900/40 border border-emerald-500/20 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 shadow-xl shadow-black/10">
        <div>
          <h4 className="font-bold text-zinc-100 text-sm tracking-tight flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            macOS LaunchDaemons & LaunchAgents
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage system services and background daemons configured through Homebrew.
          </p>
        </div>
        <div className="text-right">
          <span className="font-mono font-bold text-emerald-400 text-sm">{runningCount}</span>{" "}
          <span className="text-xs text-zinc-400">of {services.length} running</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl glass-card animate-shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center text-zinc-500 border border-dashed border-white/8 rounded-2xl">
          <Server className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-semibold text-zinc-400">No services found</p>
          <p className="text-xs text-zinc-600 mt-1">
            Install background services (e.g., redis, nginx, postgresql) to control them here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((svc) => {
            const isRunning = svc.status === "started";
            const isError = svc.status === "error";

            return (
              <div
                key={svc.name}
                className="p-5 rounded-2xl border border-white/6 bg-gradient-to-b from-zinc-900/60 to-zinc-950/60 backdrop-blur-xl shadow-lg shadow-black/20 hover:border-white/12 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isRunning
                            ? "bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse"
                            : isError
                            ? "bg-red-400 shadow-sm shadow-red-400/80"
                            : "bg-zinc-600"
                        }`}
                      />
                      <h4 className="font-mono font-bold text-sm text-zinc-100 group-hover:text-amber-400 transition-colors">
                        {svc.name}
                      </h4>
                    </div>

                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full font-mono ${
                        isRunning
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : isError
                          ? "bg-red-500/15 text-red-300 border border-red-500/30"
                          : "bg-zinc-800 text-zinc-400 border border-white/5"
                      }`}
                    >
                      {svc.status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-zinc-400">
                    {svc.user && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Run by user: <strong className="text-zinc-200">{svc.user}</strong></span>
                      </div>
                    )}

                    {svc.file && (
                      <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500 truncate">
                        <FileCode className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                        <span className="truncate" title={svc.file}>
                          {svc.file}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-white/6 flex items-center justify-end gap-2">
                  {isRunning ? (
                    <>
                      <button
                        onClick={() => onServiceAction(svc.name, "restart")}
                        disabled={isActionRunning}
                        className="px-3 py-1.5 rounded-xl border border-white/8 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        Restart
                      </button>
                      <button
                        onClick={() => onServiceAction(svc.name, "stop")}
                        disabled={isActionRunning}
                        className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        Stop
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onServiceAction(svc.name, "start")}
                      disabled={isActionRunning}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Start Daemon
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
