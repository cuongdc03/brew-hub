import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DIST_DIR = path.resolve("./dist");
const OUTPUT_DIR = path.resolve("./docs/screenshots");

// Mock Data representing an authentic, real-world macOS developer setup
const mockSystem = {
  brew_path: "/opt/homebrew/bin/brew",
  brew_version: "Homebrew 4.4.2",
  prefix: "/opt/homebrew",
  arch: "Apple Silicon (arm64)",
};

const mockCasks = [
  {
    token: "visual-studio-code",
    full_token: "visual-studio-code",
    name: ["Visual Studio Code"],
    desc: "Open-source code editor with rich extension ecosystem",
    homepage: "https://code.visualstudio.com/",
    version: "1.95.3",
    installed: "1.95.3",
    outdated: false,
    auto_updates: true,
  },
  {
    token: "docker",
    full_token: "docker",
    name: ["Docker Desktop"],
    desc: "App to build, share, and run container applications",
    homepage: "https://www.docker.com/products/docker-desktop/",
    version: "4.35.1",
    installed: "4.35.1",
    outdated: true,
    auto_updates: true,
  },
  {
    token: "raycast",
    full_token: "raycast",
    name: ["Raycast"],
    desc: "Blazingly fast, extendable macOS launcher & productivity tool",
    homepage: "https://www.raycast.com/",
    version: "1.86.0",
    installed: "1.86.0",
    outdated: false,
    auto_updates: true,
  },
  {
    token: "slack",
    full_token: "slack",
    name: ["Slack"],
    desc: "Team communication and collaboration platform",
    homepage: "https://slack.com/",
    version: "4.41.97",
    installed: "4.41.97",
    outdated: false,
    auto_updates: true,
  },
  {
    token: "firefox",
    full_token: "firefox",
    name: ["Mozilla Firefox"],
    desc: "Privacy-first, open-source web browser",
    homepage: "https://www.mozilla.org/firefox/",
    version: "133.0.0",
    installed: "133.0.0",
    outdated: true,
    auto_updates: true,
  },
  {
    token: "spotify",
    full_token: "spotify",
    name: ["Spotify"],
    desc: "Music streaming service with podcasts and playlists",
    homepage: "https://www.spotify.com/",
    version: "1.2.52.442",
    installed: "1.2.52.442",
    outdated: false,
    auto_updates: true,
  },
  {
    token: "postman",
    full_token: "postman",
    name: ["Postman"],
    desc: "Collaboration platform for API development and testing",
    homepage: "https://www.postman.com/",
    version: "11.23.2",
    installed: "11.23.2",
    outdated: false,
    auto_updates: true,
  },
  {
    token: "wezterm",
    full_token: "wezterm",
    name: ["WezTerm"],
    desc: "GPU-accelerated cross-platform terminal emulator written in Rust",
    homepage: "https://wezfurlong.org/wezterm/",
    version: "20240203-094154",
    installed: "20240203-094154",
    outdated: false,
    auto_updates: false,
  },
  {
    token: "notion",
    full_token: "notion",
    name: ["Notion"],
    desc: "Connected workspace for notes, docs, and project management",
    homepage: "https://www.notion.so/",
    version: "4.1.1",
    installed: "4.1.1",
    outdated: false,
    auto_updates: true,
  },
  {
    token: "rectangle",
    full_token: "rectangle",
    name: ["Rectangle"],
    desc: "Move and resize windows in macOS using keyboard shortcuts",
    homepage: "https://rectangleapp.com/",
    version: "0.82",
    installed: "0.82",
    outdated: false,
    auto_updates: true,
  },
  {
    token: "1password",
    full_token: "1password",
    name: ["1Password"],
    desc: "Password manager with secure vaults and biometrics",
    homepage: "https://1password.com/",
    version: "8.10.56",
    installed: "8.10.56",
    outdated: false,
    auto_updates: true,
  },
  {
    token: "tableplus",
    full_token: "tableplus",
    name: ["TablePlus"],
    desc: "Native modern relational database management GUI tool",
    homepage: "https://tableplus.com/",
    version: "6.2.0",
    installed: "6.2.0",
    outdated: false,
    auto_updates: true,
  },
];

const mockFormulae = [
  {
    name: "node",
    full_name: "node",
    desc: "Platform built on V8 to build scalable network apps",
    homepage: "https://nodejs.org/",
    license: "MIT",
    versions: { stable: "23.3.0" },
    installed: [{ version: "23.1.0", installed_on_request: true }],
    outdated: true,
    pinned: false,
    dependencies: ["ca-certificates", "openssl@3", "icu4c@76"],
  },
  {
    name: "neovim",
    full_name: "neovim",
    desc: "Vim-fork focused on extensibility and usability",
    homepage: "https://neovim.io/",
    license: "Apache-2.0",
    versions: { stable: "0.10.3" },
    installed: [{ version: "0.10.2", installed_on_request: true }],
    outdated: true,
    pinned: false,
    dependencies: ["gettext", "libuv", "luajit", "tree-sitter"],
  },
  {
    name: "ffmpeg",
    full_name: "ffmpeg",
    desc: "Play, record, convert, and stream audio and video",
    homepage: "https://ffmpeg.org/",
    license: "GPL-2.0-or-later",
    versions: { stable: "7.1" },
    installed: [{ version: "7.0.2", installed_on_request: true }],
    outdated: true,
    pinned: false,
    dependencies: ["lame", "libvorbis", "libvpx", "x264", "x265"],
  },
  {
    name: "python@3.12",
    full_name: "python@3.12",
    desc: "Interpreted, interactive, object-oriented language",
    homepage: "https://www.python.org/",
    license: "Python-2.0",
    versions: { stable: "3.12.8" },
    installed: [{ version: "3.12.8", installed_on_request: true }],
    outdated: false,
    pinned: false,
    dependencies: ["mpdecimal", "openssl@3", "readline", "sqlite"],
  },
  {
    name: "rust",
    full_name: "rust",
    desc: "Safe, concurrent, practical systems language",
    homepage: "https://www.rust-lang.org/",
    license: "Apache-2.0 OR MIT",
    versions: { stable: "1.83.0" },
    installed: [{ version: "1.83.0", installed_on_request: true }],
    outdated: false,
    pinned: false,
    dependencies: ["libgit2", "libssh2", "openssl@3", "llvm"],
  },
  {
    name: "git",
    full_name: "git",
    desc: "Distributed revision control system",
    homepage: "https://git-scm.com",
    license: "GPL-2.0-only",
    versions: { stable: "2.47.1" },
    installed: [{ version: "2.47.1", installed_on_request: true }],
    outdated: false,
    pinned: false,
    dependencies: ["gettext", "pcre2"],
  },
  {
    name: "gh",
    full_name: "gh",
    desc: "GitHub command-line tool",
    homepage: "https://cli.github.com",
    license: "MIT",
    versions: { stable: "2.63.0" },
    installed: [{ version: "2.63.0", installed_on_request: true }],
    outdated: false,
    pinned: false,
    dependencies: [],
  },
  {
    name: "ripgrep",
    full_name: "ripgrep",
    desc: "Search tool like grep and The Silver Searcher",
    homepage: "https://github.com/BurntSushi/ripgrep",
    license: "Unlicense OR MIT",
    versions: { stable: "14.1.1" },
    installed: [{ version: "14.1.1", installed_on_request: true }],
    outdated: false,
    pinned: false,
    dependencies: ["pcre2"],
  },
  {
    name: "fzf",
    full_name: "fzf",
    desc: "Command-line fuzzy finder written in Go",
    homepage: "https://github.com/junegunn/fzf",
    license: "MIT",
    versions: { stable: "0.57.0" },
    installed: [{ version: "0.57.0", installed_on_request: true }],
    outdated: false,
    pinned: false,
    dependencies: [],
  },
  {
    name: "postgresql@16",
    full_name: "postgresql@16",
    desc: "Object-relational database system",
    homepage: "https://www.postgresql.org/",
    license: "PostgreSQL",
    versions: { stable: "16.6" },
    installed: [{ version: "16.6", installed_on_request: true }],
    outdated: false,
    pinned: false,
    dependencies: ["icu4c@76", "lz4", "openssl@3", "readline", "zstd"],
  },
  {
    name: "redis",
    full_name: "redis",
    desc: "Persistent key-value database, with built-in net interface",
    homepage: "https://redis.io/",
    license: "RSALv2 OR SSPLv1",
    versions: { stable: "7.4.1" },
    installed: [{ version: "7.4.1", installed_on_request: true }],
    outdated: false,
    pinned: false,
    dependencies: ["openssl@3"],
  },
  {
    name: "nginx",
    full_name: "nginx",
    desc: "HTTP(S) server and reverse proxy, and IMAP/POP3 proxy server",
    homepage: "https://nginx.org/",
    license: "BSD-2-Clause",
    versions: { stable: "1.27.3" },
    installed: [{ version: "1.27.3", installed_on_request: true }],
    outdated: false,
    pinned: false,
    dependencies: ["openssl@3", "pcre2"],
  },
];

const mockOutdated = {
  formulae: [
    {
      name: "node",
      installed_versions: ["23.1.0"],
      current_version: "23.3.0",
      pinned: false,
      pinned_version: null,
    },
    {
      name: "neovim",
      installed_versions: ["0.10.2"],
      current_version: "0.10.3",
      pinned: false,
      pinned_version: null,
    },
    {
      name: "ffmpeg",
      installed_versions: ["7.0.2"],
      current_version: "7.1",
      pinned: false,
      pinned_version: null,
    },
  ],
  casks: [
    {
      name: "docker",
      installed_versions: ["4.35.1"],
      current_version: "4.36.0",
      pinned: false,
      pinned_version: null,
    },
    {
      name: "firefox",
      installed_versions: ["133.0.0"],
      current_version: "133.0.3",
      pinned: false,
      pinned_version: null,
    },
  ],
};

const mockServices = [
  {
    name: "postgresql@16",
    status: "started",
    user: "cuong",
    file: "~/Library/LaunchAgents/homebrew.mxcl.postgresql@16.plist",
    exit_code: 0,
  },
  {
    name: "redis",
    status: "started",
    user: "cuong",
    file: "~/Library/LaunchAgents/homebrew.mxcl.redis.plist",
    exit_code: 0,
  },
  {
    name: "nginx",
    status: "started",
    user: "cuong",
    file: "~/Library/LaunchAgents/homebrew.mxcl.nginx.plist",
    exit_code: 0,
  },
  {
    name: "ollama",
    status: "started",
    user: "cuong",
    file: "~/Library/LaunchAgents/homebrew.mxcl.ollama.plist",
    exit_code: 0,
  },
  {
    name: "mysql@8.4",
    status: "stopped",
    user: null,
    file: null,
    exit_code: null,
  },
  {
    name: "dnsmasq",
    status: "stopped",
    user: null,
    file: null,
    exit_code: null,
  },
];

const mockCleanupPreview = {
  total_space: "3.42 GB",
  items: [
    {
      path: "/Users/cuong/Library/Caches/Homebrew/downloads/node--23.1.0.tar.gz",
      size: "48.6 MB",
    },
    {
      path: "/Users/cuong/Library/Caches/Homebrew/downloads/rust--1.82.0.tar.gz",
      size: "248.2 MB",
    },
    {
      path: "/Users/cuong/Library/Caches/Homebrew/downloads/ffmpeg--7.0.2.tar.gz",
      size: "38.1 MB",
    },
    {
      path: "/Users/cuong/Library/Caches/Homebrew/downloads/llvm--19.1.2.tar.gz",
      size: "1.45 GB",
    },
    {
      path: "/Users/cuong/Library/Caches/Homebrew/downloads/docker--4.35.1.dmg",
      size: "620.8 MB",
    },
    {
      path: "/Users/cuong/Library/Caches/Homebrew/downloads/firefox--133.0.0.dmg",
      size: "134.5 MB",
    },
    {
      path: "/Users/cuong/Library/Caches/Homebrew/downloads/neovim--0.10.2.tar.gz",
      size: "14.2 MB",
    },
    {
      path: "/Users/cuong/Library/Caches/Homebrew/downloads/postgresql@16--16.5.tar.gz",
      size: "22.5 MB",
    },
    {
      path: "/Users/cuong/Library/Caches/Homebrew/downloads/openjdk--21.0.4.tar.gz",
      size: "192.4 MB",
    },
  ],
};

// Simple Static Server for built app
function startServer(port = 4173) {
  const mimeTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split("?")[0];
    if (reqPath === "/") reqPath = "/index.html";

    const filePath = path.join(DIST_DIR, reqPath);
    const ext = path.extname(filePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" });
      fs.createReadStream(filePath).pipe(res);
    } else {
      const fallback = path.join(DIST_DIR, "index.html");
      res.writeHead(200, { "Content-Type": "text/html" });
      fs.createReadStream(fallback).pipe(res);
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const port = 4179;
  const server = await startServer(port);
  console.log(`Server started on http://localhost:${port}`);

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Inject Tauri Mock API & macOS Traffic Lights
  await page.addInitScript(
    ({
      mockSystem,
      mockCasks,
      mockFormulae,
      mockOutdated,
      mockServices,
      mockCleanupPreview,
    }) => {
      window.isTauri = true;
      window.__TAURI_INTERNALS__ = {
        invoke: async (cmd, args) => {
          console.log("Mock Invoke:", cmd, args);
          switch (cmd) {
            case "get_system":
              return mockSystem;
            case "get_installed":
              return { formulae: mockFormulae, casks: mockCasks };
            case "get_outdated":
              return mockOutdated;
            case "get_services":
              return mockServices;
            case "get_cleanup_preview":
              return mockCleanupPreview;
            case "check_doctor":
              return {
                success: true,
                stdout: "Your system is ready to brew.",
                stderr: "",
              };
            case "manage_service":
            case "run_cleanup":
            case "run_autoremove":
            case "upgrade_package":
            case "uninstall_package":
            case "install_package":
              return { success: true, stdout: "Success", stderr: "" };
            case "search_packages":
              return { formulae: [], casks: [] };
            default:
              return null;
          }
        },
        convertFileSrc: (fp) => fp,
        transformCallback: () => {},
      };

      // Add macOS native window traffic lights decoration
      window.addEventListener("DOMContentLoaded", () => {
        const trafficLights = document.createElement("div");
        trafficLights.id = "macos-traffic-lights";
        trafficLights.style.cssText = `
          position: fixed;
          top: 13px;
          left: 13px;
          display: flex;
          gap: 8px;
          z-index: 9999;
          pointer-events: none;
        `;
        trafficLights.innerHTML = `
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #FF5F56; border: 0.5px solid rgba(0, 0, 0, 0.25); box-shadow: inset 0 1px 0 rgba(255,255,255,0.2);"></div>
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #FFBD2E; border: 0.5px solid rgba(0, 0, 0, 0.25); box-shadow: inset 0 1px 0 rgba(255,255,255,0.2);"></div>
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #27C93F; border: 0.5px solid rgba(0, 0, 0, 0.25); box-shadow: inset 0 1px 0 rgba(255,255,255,0.2);"></div>
        `;
        document.body.appendChild(trafficLights);
      });
    },
    {
      mockSystem,
      mockCasks,
      mockFormulae,
      mockOutdated,
      mockServices,
      mockCleanupPreview,
    }
  );

  await page.goto(`http://localhost:${port}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  // 1. Overview (Dashboard)
  console.log("Capturing overview.png...");
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "overview.png"),
    animations: "disabled",
  });

  // 2. Applications (CasksView with inspector open)
  console.log("Capturing applications.png...");
  await page.locator('aside button:has-text("Applications")').click();
  await page.waitForTimeout(500);

  // Click on "Docker Desktop" card to open the inspector with badges & AppIcon
  const dockerCard = page.locator('div:has-text("Docker Desktop")').last();
  await dockerCard.click();
  await page.waitForTimeout(600);

  await page.screenshot({
    path: path.join(OUTPUT_DIR, "applications.png"),
    animations: "disabled",
  });

  // Close inspector so subsequent views have clean full-width layouts
  const closeBtn = page.locator('aside button[title*="Close Inspector"]');
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(300);
  }

  // 3. Formulae (FormulaeView)
  console.log("Capturing formulae.png...");
  await page.locator('aside button:has-text("Formulae")').click();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "formulae.png"),
    animations: "disabled",
  });

  // 4. Services (ServicesView)
  console.log("Capturing services.png...");
  await page.locator('aside button:has-text("Services")').click();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "services.png"),
    animations: "disabled",
  });

  // 5. Cleanup (CleanupView)
  console.log("Capturing cleanup.png...");
  await page.locator('aside button:has-text("Storage Cleaner")').click();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, "cleanup.png"),
    animations: "disabled",
  });

  console.log("All screenshots captured successfully!");

  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
