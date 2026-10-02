import React from "react";
import {
  AppWindow,
  Terminal,
  Database,
  Globe,
  Music,
  Film,
  Shield,
  Cloud,
  Network,
  Code2,
  Search,
} from "lucide-react";

interface AppIconProps {
  name: string;
  desc?: string | null;
  isCask?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  desc = "",
  isCask = false,
  size = "md",
  className = "",
}) => {
  const normalized = name.toLowerCase().replace(/[@._-]/g, "");
  const descLower = (desc || "").toLowerCase();

  // Size dimensions
  const dims = {
    sm: "w-7 h-7 rounded-lg text-xs",
    md: "w-10 h-10 app-squircle text-sm",
    lg: "w-14 h-14 app-squircle text-base",
  }[size];

  const iconDims = {
    sm: "w-3.5 h-3.5",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  }[size];

  // Specific brand logos for top Homebrew tools (clean human-crafted vectors)
  const renderBrand = () => {
    // Docker
    if (normalized.includes("docker")) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconDims}>
          <path d="M13.98 10.97h2.04v2.04h-2.04zm-3.06 0h2.04v2.04h-2.04zm-3.06 0h2.04v2.04H7.86zm-3.06 0H6.84v2.04H4.8zm9.18-3.06h2.04v2.04h-2.04zm-3.06 0h2.04v2.04h-2.04zm-3.06 0h2.04v2.04H7.86zm6.12-3.06h2.04v2.04H14zm8.68 8.16c-.4-.28-1.54-.36-2.38.16-.14-.76-.64-1.32-1.36-1.68l-.48-.22-.32.42c-.52.68-.66 1.62-.38 2.48-.44.26-1.18.38-2.22.42H2.2c-.36 1.4.12 3.86 2.06 5.8 2.02 2.02 5.06 2.5 8.78 1.48 4.28-1.18 7.32-4.7 7.74-9.36.84-.06 2.1-.56 2.4-1.12l.14-.3-.34-.18z" />
        </svg>
      );
    }

    // Git / GitHub
    if (normalized === "git" || normalized.includes("github") || normalized === "gh") {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconDims}>
          <path d="M21.62 10.45l-8.07-8.07a2.6 2.6 0 00-3.68 0L8.13 4.12l2.36 2.36c.63-.22 1.36-.08 1.86.42.5.5.64 1.23.42 1.86l2.27 2.27c.63-.22 1.36-.08 1.86.42.72.72.72 1.89 0 2.61a1.85 1.85 0 01-2.61 0c-.54-.54-.66-1.34-.37-1.99l-2.12-2.12v5.33c.3.18.57.44.75.76.54.93.22 2.13-.71 2.67-.93.54-2.13.22-2.67-.71-.54-.93-.22-2.13.71-2.67.24-.14.5-.22.77-.25v-5.4c-.27-.03-.53-.11-.77-.25-.63-.37-.99-1.04-.97-1.74L6.15 5.25 2.38 9.02a2.6 2.6 0 000 3.68l8.07 8.07c1.02 1.02 2.66 1.02 3.68 0l7.49-7.49c1.02-1.01 1.02-2.66 0-3.68z" />
        </svg>
      );
    }

    // Python
    if (normalized.includes("python")) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconDims}>
          <path d="M11.91 2c-5.02 0-4.71 2.17-4.71 2.17l.01 2.25h4.79v.68H5.21S2 6.74 2 11.83c0 5.1 2.8 4.93 2.8 4.93h1.67v-2.33s-.09-2.8 2.76-2.8h4.75s2.66.05 2.66-2.6V4.6S16.97 2 11.91 2zm-2.58 1.48a.9.9 0 110 1.8.9.9 0 010-1.8zm2.76 18.52c5.02 0 4.71-2.17 4.71-2.17l-.01-2.25h-4.79v-.68h6.79s3.21.36 3.21-4.73c0-5.1-2.8-4.93-2.8-4.93h-1.67v2.33s.09 2.8-2.76 2.8h-4.75s-2.66-.05-2.66 2.6v4.43s-.34 2.6 4.72 2.6zm2.58-1.48a.9.9 0 110-1.8.9.9 0 010 1.8z" />
        </svg>
      );
    }

    // Rust
    if (normalized.includes("rust") || normalized === "cargo") {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconDims}>
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.5 14.5h-2.1l-1.9-3.2h-1v3.2H9.5V7.5h3.4c1.9 0 3.1 1.1 3.1 2.8 0 1.2-.6 2.1-1.7 2.5l2.2 3.7zm-2.7-6.2c0-.8-.6-1.3-1.6-1.3h-1.7v2.6h1.7c1 0 1.6-.5 1.6-1.3z" />
        </svg>
      );
    }

    // Node / JS
    if (normalized.includes("node") || normalized.includes("npm") || normalized.includes("pnpm")) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconDims}>
          <path d="M12 2l9 5.2v10.4L12 23l-9-5.4V7.2L12 2zm0 2.5L5.2 8.3v7.4L12 19.5l6.8-3.8V8.3L12 4.5z" />
        </svg>
      );
    }

    // Neovim / Vim
    if (normalized.includes("nvim") || normalized.includes("vim")) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconDims}>
          <path d="M3 3h4.5l9.5 13.5V3H21v18h-4.5L7 7.5V21H3V3z" />
        </svg>
      );
    }

    // Nginx
    if (normalized.includes("nginx")) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconDims}>
          <path d="M12 2l10 5.8v11.6L12 22 2 17.4V7.8L12 2zm0 2.3L4.2 8.8v6.4L12 19.7l7.8-4.5V8.8L12 4.3zM7.5 7.5h2l5 7V7.5h2v9h-2l-5-7v7h-2v-9z" />
        </svg>
      );
    }

    // Redis
    if (normalized.includes("redis")) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconDims}>
          <path d="M12 2L3 6.5l9 4.5 9-4.5L12 2zm0 6.8L5.3 5.3 12 2 18.7 5.3 12 8.8zm-9 2.5l9 4.5 9-4.5v3.4l-9 4.5-9-4.5v-3.4zm0 5.7l9 4.5 9-4.5v3.4l-9 4.5-9-4.5v-3.4z" />
        </svg>
      );
    }

    // Postgres
    if (normalized.includes("postgres") || normalized.includes("pgsql")) {
      return <Database className={iconDims} />;
    }

    // Firefox
    if (normalized.includes("firefox")) {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconDims}>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M12 3a9 9 0 018.66 11.54C19 12 16.5 10.5 14 11c-2 .4-3 2-2.5 4 .4 1.5 2 2.5 3.5 2.5a6.5 6.5 0 01-9-4c0-3 2-5 4-6-1.5 1-2.5 3-2 5 .5 1.5 2 2.5 3.5 2.5" />
        </svg>
      );
    }

    // VS Code
    if (normalized.includes("code") || normalized.includes("vscode")) {
      return <Code2 className={iconDims} />;
    }

    // Raycast
    if (normalized.includes("raycast")) {
      return <Search className={iconDims} />;
    }

    // Slack / Discord / Chat
    if (normalized.includes("slack") || normalized.includes("discord") || normalized.includes("telegram")) {
      return <Network className={iconDims} />;
    }

    // Audio / Media
    if (normalized.includes("spotify") || normalized.includes("audacity") || descLower.includes("audio")) {
      return <Music className={iconDims} />;
    }

    if (normalized.includes("vlc") || descLower.includes("video") || descLower.includes("player")) {
      return <Film className={iconDims} />;
    }

    // Security / 1Password / GPG
    if (normalized.includes("password") || normalized.includes("gpg") || normalized.includes("openssl") || descLower.includes("crypt")) {
      return <Shield className={iconDims} />;
    }

    // Database keywords
    if (descLower.includes("database") || descLower.includes("sql") || descLower.includes("redis")) {
      return <Database className={iconDims} />;
    }

    // Web / HTTP
    if (descLower.includes("browser") || descLower.includes("http") || descLower.includes("url")) {
      return <Globe className={iconDims} />;
    }

    // Cloud / Kubernetes / Terraform
    if (normalized.includes("kube") || normalized.includes("terraform") || descLower.includes("cloud")) {
      return <Cloud className={iconDims} />;
    }

    // Default Fallbacks with human elegance
    if (isCask) {
      return <AppWindow className={iconDims} />;
    }
    return <Terminal className={iconDims} />;
  };

  return (
    <div
      className={`${dims} bg-[#202026] border border-white/10 text-zinc-300 flex items-center justify-center shrink-0 shadow-sm shadow-black/30 ring-1 ring-white/5 transition-transform group-hover:scale-105 ${className}`}
    >
      {renderBrand()}
    </div>
  );
};
