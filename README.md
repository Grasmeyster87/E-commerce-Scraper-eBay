
# 🛒 eBay Scraper Pro

A professional full-stack tool for automated data collection from eBay. This project leverages **Puppeteer Stealth** on the backend to bypass anti-bot systems and **React (Vite)** for a sleek, modern interface.

## ✨ Features

* **Dynamic Environment:** Automatic port discovery and `.env` file generation.
* **Puppeteer Stealth:** Uses real browser profiles and stealth plugins for stable scraping.
* **Modern UI:** Built with **React 19**, **Vite**, and **Tailwind CSS v4**.
* **Smart Logic:** Automatic pagination and "garbage result" filtering.
* **Developer First:** Unified startup script with synchronized logs.

## 🚀 Quick Start

Forget about manual port configuration or setting up `.env` files. This project features a **Dynamic Startup** system.

1. **Clone the repository**
2. **Install dependencies** (in the root, `frontend`, and `backend` folders):
```bash
npm install

```


3. **Launch the entire project with one command**:
```bash
npm start

```



## 🛠 How It Works (DevOps Automation)

To provide a seamless developer experience, we implemented a custom lifecycle via `start.js`:

1. **Port Discovery:** The script scans the system for available ports (starting from `5001` for Backend and `5173` for Frontend).
2. **Auto-Config:** Once ports are found, the script automatically generates/updates `.env` files in both subdirectories with the correct URLs.
3. **Parallel Launch:** Both servers are launched simultaneously. Logs are piped to a single terminal with **color-coded prefixes** (`[BACKEND]` / `[FRONTEND]`) for easy debugging.

## 📦 Tech Stack

* **Frontend:** React 19, Vite, Tailwind CSS 4, Axios.
* **Backend:** Node.js, Express, Puppeteer (Stealth Plugin).
* **Environment:** Dynamic port allocation, Windows-friendly paths, and local browser profiles.

---

### ⚠️ Disclaimer

*This tool is for educational purposes only. Please respect eBay's robots.txt and Terms of Service. The developers are not responsible for any misuse of this tool.*

---

### Pro Tip for your Repo:

Since you now have a sophisticated `start.js` that handles everything, this README makes the project look much more "Senior" in a portfolio. It shows you didn't just write a scraper, but you also thought about the **Developer Experience (DX)**.

