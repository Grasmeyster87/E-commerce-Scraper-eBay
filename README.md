```markdown
# 🛒 eBay Scraper Pro: Enterprise Data Extraction & DOM Normalization Engine

An enterprise-grade, full-stack web scraping architecture designed for automated, high-fidelity data extraction from eBay. This system leverages a decoupled **Chrome DevTools Protocol (CDP)** integration paired with **Puppeteer Stealth** to seamlessly navigate advanced anti-bot mitigation systems. It features a reactive **React 19 (Vite)** frontend dashboard for real-time orchestration, structural data manipulation, and multi-format serialization.

## 📌 Executive Summary

Unlike standard DOM scrapers, this engine incorporates a custom **Structural HTML Parser** that deconstructs complex, obfuscated UI nodes into a normalized, flat relational matrix. It safely isolates localized browser profiles, bypasses automated traffic detection, and persists extraction states into an embedded **SQLite3** database, ensuring zero data loss during extensive, multi-page data harvesting cycles.

---

## ✨ Architectural Highlights & Core Capabilities

### 🛡️ Anti-Bot Evasion & Session Integrity
* **Decoupled CDP Automation:** The backend dynamically provisions an official Google Chrome binary in debug mode (`--remote-debugging-port=9222`) rather than relying on default Chromium binaries. Puppeteer attaches externally, drastically elevating the browser trust score.
* **Persistent Sandboxed Profiles:** Session data, local storage, and cookies are isolated within a dedicated `browser_profile` directory. This preserves natural browsing fingerprints and prevents CAPTCHA triggers.
* **Stealth Fingerprinting:** Integrates `puppeteer-extra-plugin-stealth` to mask automation signatures, effectively neutralizing behavioral analysis routines.

### ⚙️ Structural Extraction Engine
* **Deep DOM Normalization:** Capable of traversing deeply nested HTML trees, neutralizing marketplace text obfuscation (e.g., hidden characters, fragmented spans), and mapping UI elements to clean semantic paths.
* **Intelligent Pagination:** Emulates natural human interaction by mapping localized pagination states, verifying accessibility DOM attributes, and executing bounded, recursive page-turn cycles.
* **Garbage Data Filtration:** Employs heuristic filtering to drop injected ad banners, promotional layouts, and visually hidden "noise" elements before they reach the database.

### 💾 Persistence & Serialization (ETL)
* **Atomic SQLite3 Storage:** Automatically provisions unique relational tables for distinct scraping sessions. Ensures continuous data persistence and state recovery across dashboard reloads.
* **Multi-Format Data Export:** A robust I/O pipeline capable of compiling massive session matrices into **CSV**, **JSON**, **XML**, **SQLite**, and beautifully formatted, multi-page **PDF** reports via `PDFKit`.

### 🖥️ Reactive Control Dashboard
* **Data Visualizer:** A responsive, spreadsheet-style UI built with Tailwind CSS v4, allowing users to modify tree traversal depth, toggle semantic columns, and selectively drop noisy data cells prior to export.
* **Asynchronous Progress Tracking:** Features a dedicated, non-blocking UI modal tracking the status of background batch serialization tasks.

---

## 📦 Technology Stack

### Frontend Application Layer
* **Framework:** React 19, Vite
* **Styling & UI:** Tailwind CSS v4
* **State & Networking:** React Hooks, Axios

### Backend Services & Automation
* **Runtime & API:** Node.js, Express.js
* **Automation:** Puppeteer Core, Puppeteer Stealth, Native Child Processes (`exec`, `spawn`)
* **Data Storage:** SQLite3 (Embedded Relational DB)
* **Serialization Utilities:** PDFKit (PDF generation), Native Node `fs` (I/O Streams)

---

## 🚀 Deployment & Orchestration

This repository features a custom **Dynamic DevOps Lifecycle** script (`start.js`) designed to eliminate environment configuration overhead. 

### Zero-Config Startup
The environment dynamically allocates available system TCP ports, injects them into synced `.env` files for both the client and server, and pipes color-coded I/O streams into a single unified terminal view.

1. **Clone the repository and install dependencies:**
   *(Run the install command in the root directory to provision both sub-workspaces)*
   ```bash
   npm install

```

2. **Initialize the Full-Stack Environment:**
```bash
npm start

```



### Behind the Scenes (`start.js`)

* **Port Discovery:** Scans for operational ports (defaulting to `5050` for the API and `>=5173` for the UI) bypassing Windows system-reserved ranges.
* **Environment Injection:** Automatically generates `.env` payloads (`PORT=5050`, `VITE_BACKEND_URL=...`) to ensure absolute client-server synchronization.
* **Parallel Execution:** Forks asynchronous child processes for backend (`npm run dev`) and frontend pipelines, attaching real-time termination hooks (`SIGINT`) to prevent orphan processes.

---

## ⚠️ Legal Disclaimer

*This software architecture is provided strictly for educational purposes, portfolio demonstration, and security research regarding DOM obfuscation techniques. The developers assume no liability for the misuse of this tool. Users are entirely responsible for adhering to the target marketplace's Terms of Service, `robots.txt` directives, and regional data privacy regulations.*

```

```