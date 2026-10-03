import React, { useState, useRef } from "react";
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
  FolderOpen,
  FolderUp,
  X,
  FileText,
} from "lucide-react";
import { open as openFileDialog, save as saveFileDialog } from "@tauri-apps/plugin-dialog";
import { BrewfileCheckResult, BrewfileData } from "../types/brew";
import {
  checkBrewfileDependencies,
  exportBrewfile,
  installBrewfileDependencies,
  saveBrewfile,
} from "../services/api";

interface BrewfileViewProps {
  onRunCommandInTerminal: (title: string, runAction: () => Promise<any>) => void;
  isActionRunning: boolean;
  brewfileData: BrewfileData | null;
  setBrewfileData: React.Dispatch<React.SetStateAction<BrewfileData | null>>;
  savedContent: string;
  setSavedContent: React.Dispatch<React.SetStateAction<string>>;
  checkResult: BrewfileCheckResult | null;
  setCheckResult: React.Dispatch<React.SetStateAction<BrewfileCheckResult | null>>;
  onReload: (path?: string) => Promise<void>;
  isLoading: boolean;
}

interface StatusAlert {
  text: string;
  type: "success" | "error" | "info";
}

export const BrewfileView: React.FC<BrewfileViewProps> = ({
  onRunCommandInTerminal,
  isActionRunning,
  brewfileData,
  setBrewfileData,
  savedContent,
  setSavedContent,
  checkResult,
  setCheckResult,
  onReload,
  isLoading,
}) => {
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [statusAlert, setStatusAlert] = useState<StatusAlert | null>(null);
  const statusTimerRef = useRef<any>(null);

  const content = brewfileData?.content || "";
  const isDirty = brewfileData !== null && content !== savedContent;

  const showStatus = (
    text: string,
    type: "success" | "error" | "info" = "info",
    duration = 4000
  ) => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
    setStatusAlert({ text, type });
    statusTimerRef.current = setTimeout(() => {
      setStatusAlert(null);
    }, duration);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheck = async () => {
    if (!brewfileData) return;
    try {
      setIsChecking(true);
      const res = await checkBrewfileDependencies(undefined, content);
      setCheckResult(res);
    } catch (err: any) {
      console.error("Check failed:", err);
      showStatus(`Check failed: ${err?.message || err}`, "error", 6000);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSave = async (customPath?: string) => {
    if (!brewfileData) return;
    const targetPath = customPath || brewfileData.path;
    try {
      setIsSaving(true);
      const savedPath = await saveBrewfile(content, targetPath);
      setSavedContent(content);
      setBrewfileData({
        ...brewfileData,
        path: savedPath,
        source: "file",
      });
      showStatus(`Successfully saved to ${savedPath}!`, "success");
    } catch (err: any) {
      showStatus(`Failed to save: ${err?.message || err}`, "error", 6000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAs = async () => {
    if (!brewfileData) return;
    try {
      const selected = await saveFileDialog({
        defaultPath: brewfileData.path || "Brewfile",
        filters: [{ name: "Brewfile", extensions: ["Brewfile", "txt", ""] }],
      });
      if (selected && typeof selected === "string") {
        await handleSave(selected);
      }
    } catch (err: any) {
      showStatus(`Save As failed: ${err?.message || err}`, "error", 6000);
    }
  };

  const handleOpenFile = async () => {
    if (isDirty) {
      const confirmDiscard = window.confirm(
        "You have unsaved changes in your Brewfile. Discard them and open another file?"
      );
      if (!confirmDiscard) return;
    }
    try {
      const selected = await openFileDialog({
        multiple: false,
        filters: [{ name: "Brewfile", extensions: ["Brewfile", "txt", ""] }],
      });
      if (selected && typeof selected === "string") {
        await onReload(selected);
        showStatus(`Loaded Brewfile from ${selected}`, "info");
      }
    } catch (err: any) {
      showStatus(`Failed to open file: ${err?.message || err}`, "error", 6000);
    }
  };

  const handleReload = async () => {
    if (isDirty) {
      const confirmDiscard = window.confirm(
        "You have unsaved changes in your Brewfile. Discard and reload from system?"
      );
      if (!confirmDiscard) return;
    }
    await onReload();
    showStatus("Reloaded Brewfile from system", "info");
  };

  const handleExportFile = async () => {
    try {
      const selected = await saveFileDialog({
        defaultPath: "Brewfile",
        filters: [{ name: "Brewfile", extensions: ["Brewfile", "txt", ""] }],
      });
      if (selected && typeof selected === "string") {
        const res = await exportBrewfile(selected);
        if (!res.success) {
          showStatus(
            `Export failed: ${res.stderr || res.stdout || "Command returned non-zero exit code"}`,
            "error",
            6000
          );
        } else {
          showStatus(`Exported snapshot to ${selected}`, "success");
        }
      }
    } catch (err: any) {
      showStatus(`Export failed: ${err?.message || err}`, "error", 6000);
    }
  };

  const handleSyncInstall = () => {
    onRunCommandInTerminal("brew bundle install", async () => {
      return await installBrewfileDependencies(undefined, content, false);
    });
  };

  const linesCount = content ? content.split("\n").length : 0;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl border border-white/6 bg-[#18181c]/70 backdrop-blur-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 text-[#0A84FF]">
            <FileCode2 className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Declarative Configuration & Migration
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-100 font-sans tracking-tight">
              Brewfile Manager
            </h3>
            <span
              className="text-xs text-zinc-400 font-mono truncate max-w-md"
              title={brewfileData?.path}
            >
              {brewfileData?.path || "~/.Brewfile"}
            </span>
            {brewfileData?.source === "dump" ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                Live System Snapshot
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                Disk File
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
            Snapshot your installed taps, formulae, casks, and services into a reproducible Brewfile.
            Check against machine state and restore your entire workstation setup with one click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleCheck}
            disabled={isChecking || isLoading || !brewfileData}
            className="px-3.5 py-2 rounded-xl apple-btn-secondary text-xs font-medium flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Check if all dependencies in the Brewfile are satisfied"
          >
            <FileCheck
              className={`w-3.5 h-3.5 text-blue-400 ${isChecking ? "animate-spin" : ""}`}
            />
            Check State
          </button>

          <button
            onClick={handleSyncInstall}
            disabled={isActionRunning || isLoading || !brewfileData}
            className="px-4 py-2 rounded-xl bg-[#0A84FF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Install / Sync
          </button>

          <button
            onClick={handleOpenFile}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl apple-btn-secondary text-xs font-medium flex items-center gap-2 cursor-pointer"
            title="Open Brewfile from disk"
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
            Open...
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
            onClick={handleReload}
            disabled={isLoading}
            className="p-2 rounded-xl apple-btn-secondary text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Reload from system"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Status Alert Notification */}
      {statusAlert && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${
            statusAlert.type === "error"
              ? "bg-red-500/10 border-red-500/20 text-red-300"
              : statusAlert.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-blue-500/10 border-blue-500/20 text-blue-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusAlert.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : statusAlert.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{statusAlert.text}</span>
          </div>
          <button
            onClick={() => setStatusAlert(null)}
            className="text-xs hover:text-white cursor-pointer ml-3 opacity-70 hover:opacity-100 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
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
                  {checkResult.missing_count} missing package(s) detected. Click "Install / Sync"
                  to resolve.
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
            {isDirty && (
              <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                ● Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave()}
              disabled={isSaving || !brewfileData}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                isDirty
                  ? "bg-[#0A84FF] hover:bg-[#0071E3] text-white border-blue-500 shadow-sm"
                  : "bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/5"
              }`}
              title={`Save changes to ${brewfileData?.path || "~/.Brewfile"}`}
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>

            <button
              onClick={handleSaveAs}
              disabled={isSaving || !brewfileData}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer border border-white/5"
              title="Save to a different path"
            >
              <FolderUp className="w-3.5 h-3.5" />
              Save As...
            </button>

            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Copy Brewfile contents"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => {
              if (brewfileData) {
                setBrewfileData({
                  ...brewfileData,
                  content: e.target.value,
                });
              }
            }}
            disabled={isLoading}
            spellCheck={false}
            rows={22}
            className="w-full bg-[#111114] text-zinc-200 font-mono text-xs leading-relaxed p-4 border-0 focus:ring-0 focus:outline-hidden resize-y select-text selection:bg-blue-600/30 selection:text-white"
            placeholder={
              isLoading
                ? "Generating live snapshot from Homebrew..."
                : "Brewfile is empty"
            }
          />
        </div>
      </div>
    </div>
  );
};
