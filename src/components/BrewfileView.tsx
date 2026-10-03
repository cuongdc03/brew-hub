import React, { useState, useEffect } from "react";
import {
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Save,
  Play,
  RotateCw,
  Copy,
  Check,
  FileCheck,
} from "lucide-react";
import { save as saveFileDialog } from "@tauri-apps/plugin-dialog";
import { BrewfileCheckResult } from "../types/brew";
import {
  checkBrewfileDependencies,
  exportBrewfile,
  fetchBrewfile,
  installBrewfileDependencies,
  saveBrewfile,
} from "../services/api";

interface BrewfileViewProps {
  onRunCommandInTerminal: (title: string, runAction: () => Promise<any>) => void;
  isActionRunning: boolean;
}

export const BrewfileView: React.FC<BrewfileViewProps> = ({
  onRunCommandInTerminal,
  isActionRunning,
}) => {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkResult, setCheckResult] = useState<BrewfileCheckResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadBrewfile = async () => {
    try {
      setIsLoading(true);
      const text = await fetchBrewfile();
      setContent(text);
      setCheckResult(null);
    } catch (err: any) {
      console.error("Failed to load Brewfile:", err);
      setStatusMessage(`Error loading Brewfile: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBrewfile();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheck = async () => {
    try {
      setIsChecking(true);
      const res = await checkBrewfileDependencies(undefined, content);
      setCheckResult(res);
    } catch (err: any) {
      console.error("Check failed:", err);
      setStatusMessage(`Check failed: ${err?.message || err}`);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveDefault = async () => {
    try {
      await saveBrewfile(content);
      setStatusMessage("Successfully saved to ~/.Brewfile!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(`Failed to save: ${err?.message || err}`);
    }
  };

  const handleExportFile = async () => {
    try {
      const selected = await saveFileDialog({
        defaultPath: "Brewfile",
        filters: [{ name: "Brewfile", extensions: ["Brewfile", "txt", ""] }],
      });
      if (selected) {
        await exportBrewfile(selected);
        setStatusMessage(`Exported snapshot to ${selected}`);
        setTimeout(() => setStatusMessage(null), 3500);
      }
    } catch (err: any) {
      setStatusMessage(`Export failed: ${err?.message || err}`);
    }
  };

  const handleSyncInstall = () => {
    onRunCommandInTerminal("brew bundle install", async () => {
      return await installBrewfileDependencies(undefined, content, false);
    });
  };

  const linesCount = content.split("\n").length;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl border border-white/6 bg-[#18181c]/70 backdrop-blur-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[#0A84FF]">
            <FileCode2 className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Declarative Configuration & Migration
            </span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-100 font-sans tracking-tight">
              Brewfile Manager
            </h3>
            <span className="text-xs text-zinc-400 font-mono">~/.Brewfile</span>
          </div>
          <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
            Snapshot your installed taps, formulae, casks, and services into a reproducible Brewfile.
            Check against machine state and restore your entire workstation setup with one click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleCheck}
            disabled={isChecking || isLoading}
            className="px-3.5 py-2 rounded-xl apple-btn-secondary text-xs font-medium flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Check if all dependencies in the Brewfile are satisfied"
          >
            <FileCheck className={`w-3.5 h-3.5 text-blue-400 ${isChecking ? "animate-spin" : ""}`} />
            Check State
          </button>

          <button
            onClick={handleSyncInstall}
            disabled={isActionRunning || isLoading}
            className="px-4 py-2 rounded-xl bg-[#0A84FF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Install / Sync
          </button>

          <button
            onClick={handleExportFile}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl apple-btn-secondary text-xs font-medium flex items-center gap-2 cursor-pointer"
            title="Export snapshot to file"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            Export...
          </button>

          <button
            onClick={loadBrewfile}
            disabled={isLoading}
            className="p-2 rounded-xl apple-btn-secondary text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Reload from system"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Status Alert Notification */}
      {statusMessage && (
        <div className="px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-mono flex items-center justify-between">
          <span>{statusMessage}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs text-blue-400 hover:text-white cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dependency Check Results */}
      {checkResult && (
        <div
          className={`p-4 rounded-xl border backdrop-blur-xl transition-all ${
            checkResult.satisfied
              ? "bg-[#30D158]/10 border-[#30D158]/25 text-emerald-300"
              : "bg-[#FF9F0A]/10 border-[#FF9F0A]/25 text-amber-300"
          }`}
        >
          <div className="flex items-center gap-2.5 font-semibold text-xs mb-1">
            {checkResult.satisfied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#30D158]" />
                <span>All dependencies in Brewfile are satisfied on this Mac!</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-[#FF9F0A]" />
                <span>
                  {checkResult.missing_count} missing package(s) detected. Click "Install / Sync" to resolve.
                </span>
              </>
            )}
          </div>

          {!checkResult.satisfied && checkResult.missing_items.length > 0 && (
            <div className="mt-2 space-y-1 font-mono text-[11px] text-amber-200/90 pl-6 border-l border-amber-500/20">
              {checkResult.missing_items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[#FF9F0A]">&rarr;</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Brewfile Editor Container */}
      <div className="border border-white/6 rounded-xl bg-[#141417] overflow-hidden shadow-2xl ring-1 ring-white/5">
        <div className="px-4 py-2.5 border-b border-white/6 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Brewfile
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              {linesCount} lines
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDefault}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer border border-white/5"
              title="Save changes to ~/.Brewfile"
            >
              <Save className="w-3.5 h-3.5" />
              Save to ~/.Brewfile
            </button>

            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Copy Brewfile contents"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isLoading}
            spellCheck={false}
            rows={22}
            className="w-full bg-[#111114] text-zinc-200 font-mono text-xs leading-relaxed p-4 border-0 focus:ring-0 focus:outline-hidden resize-y select-text selection:bg-blue-600/30 selection:text-white"
            placeholder={isLoading ? "Generating live snapshot from Homebrew..." : "Brewfile is empty"}
          />
        </div>
      </div>
    </div>
  );
};
