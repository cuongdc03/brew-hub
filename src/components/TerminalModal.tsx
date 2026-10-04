import React, { useState, useRef, useEffect } from "react";
import { X, Copy, Check, Terminal as TerminalIcon, AlertCircle, Square } from "lucide-react";

export interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  output: string;
  isLoading?: boolean;
  status?: "idle" | "running" | "success" | "error" | "cancelled";
  exitCode?: number | null;
  onCancel?: () => void;
}

const stripAnsi = (str: string) =>
  str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");

export const TerminalModal: React.FC<TerminalModalProps> = ({
  isOpen,
  onClose,
  title,
  output,
  isLoading,
  status = isLoading ? "running" : "idle",
  exitCode,
  onCancel,
}) => {
  const [copied, setCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new live streaming output arrives
  useEffect(() => {
    if (isOpen) {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [output, isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(stripAnsi(output));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCurrentlyRunning = status === "running" || isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ring-1 ring-white/10">
        {/* Window Bar */}
        <div className="px-4 py-3 bg-zinc-900/90 border-b border-white/8 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <TerminalIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-xs font-mono font-medium text-zinc-200 truncate max-w-md">
              {title}
            </span>
            {isCurrentlyRunning ? (
              <span className="text-[10px] text-amber-400 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full font-mono flex items-center gap-1.5 shrink-0 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Running...
              </span>
            ) : status === "success" ? (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 shrink-0">
                <Check className="w-3 h-3" />
                Success {exitCode !== undefined && exitCode !== null ? `(0)` : ""}
              </span>
            ) : status === "error" ? (
              <span className="text-[10px] text-red-400 bg-red-500/15 border border-red-500/25 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 shrink-0">
                <AlertCircle className="w-3 h-3" />
                Failed {exitCode !== undefined && exitCode !== null ? `(${exitCode})` : ""}
              </span>
            ) : status === "cancelled" ? (
              <span className="text-[10px] text-zinc-400 bg-zinc-500/15 border border-zinc-500/25 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 shrink-0">
                <Square className="w-2.5 h-2.5" />
                Cancelled
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
              title="Copy Output"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
              title={isCurrentlyRunning ? "Minimize to background" : "Close"}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs leading-relaxed text-zinc-300 bg-zinc-950 select-text">
          {output ? (
            <pre className="whitespace-pre-wrap break-all selection:bg-amber-500/30 selection:text-white font-mono">
              {stripAnsi(output)}
            </pre>
          ) : (
            <div className="text-zinc-600 italic">Waiting for command execution...</div>
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-zinc-900/60 border-t border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCurrentlyRunning && onCancel && (
              <button
                onClick={onCancel}
                className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 text-xs rounded-xl font-medium transition-all cursor-pointer border border-red-500/30 flex items-center gap-1.5"
                title="Cancel running operation"
              >
                <Square className="w-3 h-3 fill-current" />
                Cancel Operation
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs rounded-xl font-semibold transition-all cursor-pointer border border-white/8"
          >
            {isCurrentlyRunning ? "Minimize" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
};

