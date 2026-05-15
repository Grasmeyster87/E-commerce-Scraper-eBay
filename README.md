# 🛒 eBay Scraper Pro

A professional full-stack tool for automated data collection from eBay. This project leverages **Chrome DevTools Protocol (CDP)** browser debug mode and **Puppeteer Stealth** on the backend to seamlessly bypass anti-bot systems, combined with a sleek **React (Vite)** frontend interface.

## ✨ Features

* **Automated CDP Browser Management:** The backend automatically triggers a native launch script to spin up an official Google Chrome instance with Chrome DevTools Protocol enabled (`--remote-debugging-port=9222`). Puppeteer then hooks into this running instance via `puppeteer.connect()`.
    * **High Trust Score:** Using your real, system-installed Chrome browser instead of a stock Puppeteer Chromium instance dramatically reduces anti-bot detection rates.
    * **Persistent Sessions:** All cookies, history, and session data are stored locally within the project's `browser_profile` folder, maintaining a natural browsing footprint.
    * **Clean Lifecycle Management:** The browser is launched dynamically on demand and fully terminated upon completion, preventing memory leaks and profile locking.
* **Dynamic Environment:** Automatic port discovery and synchronized `.env` file generation on startup.
* **Puppeteer Stealth:** Integrated stealth plugins to mask automation footprints.
* **Modern UI:** A beautiful, responsive interface built with **React 19**, **Vite**, and **Tailwind CSS v4**.
* **Smart Filtering:** Automatic pagination handling and "garbage result" extraction logic.
* **Developer First:** A unified single-command startup system with color-coded multi-process logging.

## 🚀 Quick Start

Forget about manual port configuration, opening browser windows via terminal, or setting up `.env` files. This project features a completely **Dynamic Startup** system.

1. **Clone the repository**
2. **Install dependencies** (run in the root directory to install for both `frontend` and `backend`):
   ```bash
   npm install

```

3. **Launch the entire project with one command**:
```bash
npm start

```



## 🛠 How It Works (DevOps Automation)

To provide a seamless developer experience, we implemented a custom lifecycle via `start.js`:

1. **Port Discovery:** The script scans the system for available ports (starting from `5001` for the Backend and `5173` for the Frontend).
2. **Auto-Config:** Once ports are secured, the script automatically generates/updates `.env` files in both subdirectories with the correct URLs and environment variables.
3. **Parallel Launch:** Both servers are launched simultaneously. Logs are piped into a single terminal window with **color-coded prefixes** (`[BACKEND]` / `[FRONTEND]`) for real-time, easy debugging.

## 📦 Tech Stack

* **Frontend:** React 19, Vite, Tailwind CSS 4, Axios.
* **Backend:** Node.js, Express, Puppeteer (with `puppeteer-extra-plugin-stealth`).
* **Environment:** Cross-process dynamic port allocation, Windows-optimized automation scripts, and local decoupled browser sessions.

---

### ⚠️ Disclaimer

*This tool is for educational purposes only. Please respect eBay's robots.txt and Terms of Service. The developers are not responsible for any misuse of this tool.*