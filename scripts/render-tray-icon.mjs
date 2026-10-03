// Renders the monochrome macOS menu-bar (template) icon from the BrewHubLogo vessel paths.
// Usage: node scripts/render-tray-icon.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "src-tauri", "icons", "tray-template.png");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 8 32 32" width="44" height="44" fill="none">
  <path d="M17 15H31C32.1 15 33 15.9 33 17V30C33 34.4 29.4 38 25 38H23C18.6 38 15 34.4 15 30V17C15 15.9 15.9 15 17 15Z"
        stroke="#000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M33 19H35.5C37.4 19 39 20.6 39 22.5V25.5C39 27.4 37.4 29 35.5 29H33"
        stroke="#000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="19" y1="23" x2="29" y2="23" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="19" y1="28" x2="29" y2="28" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M24 8.5C24 8.5 21.5 10.5 21.5 12.5C21.5 13.9 22.6 15 24 15C25.4 15 26.5 13.9 26.5 12.5C26.5 10.5 24 8.5 24 8.5Z" fill="#000"/>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 44, height: 44 }, deviceScaleFactor: 1 });
await page.setContent(
  `<html><body style="margin:0;background:transparent">${svg}</body></html>`
);
await page.locator("svg").screenshot({ path: out, omitBackground: true });
await browser.close();
console.log("Wrote", out);
