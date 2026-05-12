# E-commerce Scraper eBay

A professional full-stack tool for automated data collection from eBay, combining the power of Puppeteer on the backend and a modern React interface.

### ✨ Features
- **Puppeteer Engine:** Uses real browser profiles to bypass anti-bot systems.
- **Modern UI:** Built with **React + Vite** and the latest **Tailwind CSS v4**.
- **Smart Navigation:** Handles dynamic content loading and provides stable multi-page pagination.
- **Data Export:** Supports structured data extraction to CSV and JSON.

### 🛠 Tech Stack
- **Frontend:** React, Vite, Tailwind CSS 4.
- **Backend:** Node.js, Express, Puppeteer.
- **Environment:** Windows-friendly paths, integrated with Chrome user data.

### 🚀 Getting Started

#### 1. Backend Setup
```bash
cd backend
npm install
# The scraper uses a local browser profile in /browser_profile
node src/index.js
```
### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173/ in your browser.

⚠️ Disclaimer

This tool is for educational purposes only. Please respect eBay's robots.txt and Terms of Service.