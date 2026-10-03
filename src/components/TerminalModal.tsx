import React, { useState } from "react";
import { X, Copy, Check, Terminal as TerminalIcon } from "lucide-react";

interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  output: string;
  isLoading?: boolean;
}

export const TerminalModal: React.FC<TerminalModalProps> = ({
  isOpen,
  onClose,
  title,
  output,
  isLoading,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ring-1 ring-white/10">
        {/* Window Bar */}
        <div className="px-4 py-3 bg-zinc-900/90 border-b border-white/8 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <TerminalIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-mono font-medium text-zinc-200 truncate max-w-md">
              {title}
            </span>
            {isLoading && (
              <span className="text-[10px] text-amber-400 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full font-mono animate-pulse">
                Running...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
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
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs leading-relaxed text-zinc-300 bg-zinc-950 select-text">
          {output ? (
            <pre className="whitespace-pre-wrap break-all selection:bg-amber-500/30 selection:text-white font-mono">
              {output}
            </pre>
          ) : (
            <div className="text-zinc-600 italic">Waiting for command execution...</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-zinc-900/60 border-t border-white/6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs rounded-xl font-semibold transition-all cursor-pointer border border-white/8"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
