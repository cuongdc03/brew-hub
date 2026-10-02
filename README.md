# 🍺 Brew Hub

A modern, high-performance desktop application for managing [Homebrew](https://brew.sh) packages, applications, background services, and disk storage on macOS. Built with **Tauri v2 (Rust)** and **React 19 + TypeScript + Tailwind CSS**.

---

## ✨ Features

- 🖥️ **macOS Application Manager (Casks):**
  - View installed desktop applications with live version diffs.
  - One-click app upgrades, homepage exploration, and uninstalls.
- ⚡ **CLI Formulae Manager:**
  - View installed developer tools, packages, and shared libraries.
  - Inspect dependencies, licenses, and installed versions.
  - Fast search and filter for pending updates.
- 🚦 **Background Services Controller:**
  - Monitor live macOS LaunchAgents and LaunchDaemons managed by `brew services`.
  - Instant Start, Stop, and Restart controls with running indicators.
- 🧹 **Storage & Cache Cleaner:**
  - Scan for reclaimable disk space from cached archives, obsolete bottles, and download artifacts.
  - Safe one-click cache purge (`brew cleanup --prune=all`).
  - Autoremove orphaned dependencies (`brew autoremove`).
- 🔍 **Package Explorer & Store:**
  - Search thousands of open-source CLI tools and desktop casks.
  - Install new packages with real-time terminal output logs.
- 🩺 **Brew Doctor Diagnostic:**
  - Run full system diagnostic health checks directly from the app.
- 💻 **Native macOS Aesthetic:**
  - Native translucent window framing, fast start times, and minimal memory footprint thanks to Tauri v2.

---

## 🛠️ Tech Stack

- **Desktop Engine:** [Tauri v2](https://v2.tauri.app/) (Rust 1.97+)
- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4
- **Icons & Styling:** Lucide React, macOS dark/light theme support
- **Async Process Management:** Tokio asynchronous process runner with system PATH resolution

---

## 🚀 Getting Started

### Prerequisites

- macOS (Apple Silicon or Intel)
- Homebrew installed (`brew`)
- Node.js (v20+) and `pnpm`
- Rust (`rustc` & `cargo`)

### Installation & Development

```bash
# Clone and enter the directory
cd brew-hub

# Install frontend dependencies
pnpm install

# Start the desktop application in development mode
pnpm tauri dev
```

### Building for Production

```bash
# Builds native macOS .app and .dmg bundles in src-tauri/target/release/bundle
pnpm tauri build
```

---

## 🔒 Security & Privilege Model

Brew Hub operates as a client on top of the native Homebrew executable. For privileged actions (such as removing casks with launch services, root helpers, or system daemons), Brew Hub uses native macOS authorization (`SUDO_ASKPASS`) via AppleScript dialogs. No passwords or credentials are ever stored, cached, or logged.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
