import React from "react";
import { Server, Play, Square, RotateCw, FileCode, User } from "lucide-react";
import { ServiceInfo } from "../types/brew";

interface ServicesViewProps {
  services: ServiceInfo[];
  searchTerm: string;
  onServiceAction: (name: string, action: "start" | "stop" | "restart") => void;
  isActionRunning: boolean;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  searchTerm,
  onServiceAction,
  isActionRunning,
}) => {
  const filtered = services.filter((s) => {
    const q = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.status.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-4">
      {/* Description header */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
        <div>
          <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
            macOS LaunchDaemons & LaunchAgents
          </h4>
          <p className="text-slate-500 dark:text-slate-400">
            Start, stop, or restart background system daemons managed by Homebrew Services.
          </p>
        </div>
        <div className="text-right">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {services.filter((s) => s.status === "started").length}
          </span>{" "}
          of {services.length} running
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <Server className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No Homebrew services found</p>
          <p className="text-xs text-slate-500 mt-1">
            Install services like nginx, redis, or postgresql via Homebrew to manage them here.
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
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isRunning
                            ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                            : isError
                            ? "bg-red-500 shadow-xs shadow-red-500/50"
                            : "bg-slate-300 dark:bg-slate-700"
                        }`}
                      />
                      <h4 className="font-mono font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {svc.name}
                      </h4>
                    </div>

                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        isRunning
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : isError
                          ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {svc.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {svc.user && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Run by user: <strong className="text-slate-700 dark:text-slate-300">{svc.user}</strong></span>
                      </div>
                    )}

                    {svc.file && (
                      <div className="flex items-center gap-1.5 font-mono text-[11px] truncate">
                        <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate" title={svc.file}>
                          {svc.file}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-2">
                  {isRunning ? (
                    <>
                      <button
                        onClick={() => onServiceAction(svc.name, "restart")}
                        disabled={isActionRunning}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        Restart
                      </button>
                      <button
                        onClick={() => onServiceAction(svc.name, "stop")}
                        disabled={isActionRunning}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        Stop
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onServiceAction(svc.name, "start")}
                      disabled={isActionRunning}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
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
