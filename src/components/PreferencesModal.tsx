import React, { useState, useEffect } from "react";
import {
  X,
  Sliders,
  Bell,
  EyeOff,
  Plus,
  Trash2,
  RotateCcw,
  Check,
} from "lucide-react";
import { AppSettings } from "../types/brew";
import { fetchSettings, updateSettings } from "../services/api";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (settings: AppSettings) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  check_interval: "1h",
  notify_only_changed: true,
  include_greedy: false,
  launch_at_login: false,
  keep_in_menu_bar: true,
  show_dock_icon: true,
  ignored_casks: [],
};

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const [activeTab, setActiveTab] = useState<"general" | "updates" | "ignored">("general");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [newIgnoredCask, setNewIgnoredCask] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch (e: any) {
      console.error("Failed to load settings:", e);
      setErrorMsg(e.toString());
    }
  };

  const handleSaveSetting = async (updated: AppSettings) => {
    try {
      setSettings(updated);
      const saved = await updateSettings(updated);
      onSettingsSaved?.(saved);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    } catch (e: any) {
      console.error("Failed to update settings:", e);
      setErrorMsg(e.toString());
    }
  };

  const handleToggle = (key: keyof AppSettings) => {
    const updated = {
      ...settings,
      [key]: !settings[key],
    };
    handleSaveSetting(updated);
  };

  const handleChangeInterval = (val: string) => {
    const updated = {
      ...settings,
      check_interval: val,
    };
    handleSaveSetting(updated);
  };

  const handleAddIgnoredCask = (e: React.FormEvent) => {
    e.preventDefault();
    const token = newIgnoredCask.trim().toLowerCase();
    if (!token) return;
    if (settings.ignored_casks.includes(token)) {
      setNewIgnoredCask("");
      return;
    }
    const updated = {
      ...settings,
      ignored_casks: [...settings.ignored_casks, token],
    };
    setNewIgnoredCask("");
    handleSaveSetting(updated);
  };

  const handleRemoveIgnoredCask = (token: string) => {
    const updated = {
      ...settings,
      ignored_casks: settings.ignored_casks.filter((c) => c !== token),
    };
    handleSaveSetting(updated);
  };

  const handleResetDefaults = () => {
    handleSaveSetting({ ...DEFAULT_SETTINGS });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">Preferences</h2>
              <p className="text-xs text-slate-400">Customize Brew Hub behavior and background tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {savedFeedback && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 animate-in fade-in">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/30 gap-6">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "general"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-4 h-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab("updates")}
            className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "updates"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bell className="w-4 h-4" />
            Updates & Notifications
          </button>
          <button
            onClick={() => setActiveTab("ignored")}
            className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "ignored"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <EyeOff className="w-4 h-4" />
            Ignored Casks
            {settings.ignored_casks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-slate-800 text-slate-300">
                {settings.ignored_casks.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* General Tab */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                <div>
                  <h4 className="text-sm font-medium text-slate-200">Keep Running in Menu Bar</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hides the window to the macOS menu bar when closed instead of quitting
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("keep_in_menu_bar")}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.keep_in_menu_bar ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.keep_in_menu_bar ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                <div>
                  <h4 className="text-sm font-medium text-slate-200">Launch at Login</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Automatically launch Brew Hub in background when you log in to macOS
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("launch_at_login")}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.launch_at_login ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.launch_at_login ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                <div>
                  <h4 className="text-sm font-medium text-slate-200">Show Dock Icon</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Display Brew Hub in the macOS Dock (turn off for menu bar only mode)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("show_dock_icon")}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.show_dock_icon ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.show_dock_icon ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Updates Tab */}
          {activeTab === "updates" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                <div>
                  <h4 className="text-sm font-medium text-slate-200">Check for Updates</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    How frequently Brew Hub automatically scans for outdated packages
                  </p>
                </div>
                <select
                  value={settings.check_interval}
                  onChange={(e) => handleChangeInterval(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="1h">Every 1 hour</option>
                  <option value="6h">Every 6 hours</option>
                  <option value="24h">Every 24 hours</option>
                  <option value="never">Never (manual only)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                <div>
                  <h4 className="text-sm font-medium text-slate-200">Notify Only When Updates Change</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Deduplicate notifications to only fire when newly outdated packages appear
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("notify_only_changed")}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.notify_only_changed ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.notify_only_changed ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                <div>
                  <h4 className="text-sm font-medium text-slate-200">Include Greedy Casks</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Include self-updating applications in the outdated scan (<code className="text-xs text-slate-300">--greedy</code>)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("include_greedy")}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.include_greedy ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.include_greedy ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Ignored Casks Tab */}
          {activeTab === "ignored" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Casks added here will be excluded from the outdated count, notifications, and menu bar badge.
              </p>

              <form onSubmit={handleAddIgnoredCask} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. google-chrome, postman, slack"
                  value={newIgnoredCask}
                  onChange={(e) => setNewIgnoredCask(e.target.value)}
                  className="flex-1 bg-slate-950/70 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!newIgnoredCask.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </form>

              {settings.ignored_casks.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl">
                  <EyeOff className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 font-medium">No ignored casks</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Add casks you do not wish to see update notifications for.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
                  {settings.ignored_casks.map((cask) => (
                    <div
                      key={cask}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/30 transition-colors"
                    >
                      <span className="text-sm font-mono text-slate-300">{cask}</span>
                      <button
                        onClick={() => handleRemoveIgnoredCask(cask)}
                        title="Remove from ignored"
                        className="text-slate-400 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
