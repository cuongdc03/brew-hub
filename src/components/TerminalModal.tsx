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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Window Bar */}
        <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <TerminalIcon className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-mono font-medium text-slate-200">{title}</span>
            {isLoading && (
              <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full font-mono animate-pulse">
                Running...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Copy Output"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 overflow-y-auto flex-1 font-mono text-xs leading-relaxed text-slate-300 bg-slate-950 select-text">
          {output ? (
            <pre className="whitespace-pre-wrap break-all">{output}</pre>
          ) : (
            <div className="text-slate-600 italic">No output yet. Waiting for command execution...</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-950/50 border-t border-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
