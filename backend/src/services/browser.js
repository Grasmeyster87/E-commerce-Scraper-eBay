import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import puppeteer from 'puppeteer-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Сервіс для керування браузером Chrome, профілем користувача та режимами скрапінгу (GUI / Headless).
 */
export class BrowserService {
    static currentMode = null; // 'gui' | 'headless' | null
    static activeBrowser = null;

    /**
     * Отримує абсолютний шлях до директорії browser_profile
     */
    static getProfilePath() {
        const profilePath = path.resolve(__dirname, '../../browser_profile');
        if (!fs.existsSync(profilePath)) {
            fs.mkdirSync(profilePath, { recursive: true });
        }
        return profilePath;
    }

    /**
     * Рекурсивно вираховує об'єм файлів у директорії в байтах
     */
    static calculateDirectorySize(dirPath) {
        if (!fs.existsSync(dirPath)) return 0;
        let totalSize = 0;

        function traverse(currentPath) {
            try {
                const entries = fs.readdirSync(currentPath, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(currentPath, entry.name);
                    try {
                        if (entry.isDirectory()) {
                            traverse(fullPath);
                        } else if (entry.isFile()) {
                            const stats = fs.statSync(fullPath);
                            totalSize += stats.size;
                        }
                    } catch {
                        // Ігноруємо недоступні системні або тимчасові файли
                    }
                }
            } catch {
                // Ігноруємо помилки читання каталогу
            }
        }

        traverse(dirPath);
        return totalSize;
    }

    /**
     * Форматує кількість байтів у зручний формат (B, KB, MB, GB)
     */
    static formatBytes(bytes, decimals = 2) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    /**
     * Повертає об'єм папки профілю браузера в байтах та форматованому рядку
     */
    static getProfileSize() {
        const profilePath = this.getProfilePath();
        const bytes = this.calculateDirectorySize(profilePath);
        const formatted = this.formatBytes(bytes);
        return { bytes, formatted };
    }

    /**
     * Завершує процеси Chrome, що займають порт віддаленого налагодження 9222
     */
    static async killChromeProcesses(port = 9222) {
        if (this.activeBrowser) {
            try {
                await this.activeBrowser.close().catch(() => {});
            } catch {}
            this.activeBrowser = null;
        }

        return new Promise((resolve) => {
            exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
                if (err || !stdout) return resolve();
                const lines = stdout.trim().split('\n');
                const pids = new Set();
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 5) {
                        const pid = parseInt(parts[parts.length - 1], 10);
                        if (pid && !isNaN(pid) && pid > 0) {
                            pids.add(pid);
                        }
                    }
                }
                if (pids.size === 0) return resolve();
                let killed = 0;
                pids.forEach((pid) => {
                    exec(`taskkill /F /T /PID ${pid}`, () => {
                        killed++;
                        if (killed >= pids.size) resolve();
                    });
                });
            });
        });
    }

    /**
     * Очищає вміст папки профілю браузера
     */
    static async clearProfile() {
        console.log('🧹 Запуск процедури очищення папки профілю браузера...');
        await this.killChromeProcesses(9222);
        this.currentMode = null;
        await delay(1200);

        const profilePath = this.getProfilePath();
        if (fs.existsSync(profilePath)) {
            const entries = fs.readdirSync(profilePath);
            for (const entry of entries) {
                const fullPath = path.join(profilePath, entry);
                try {
                    fs.rmSync(fullPath, { recursive: true, force: true });
                } catch (err) {
                    console.warn(`⚠️ Не вдалося видалити ${fullPath}:`, err.message);
                }
            }
        } else {
            fs.mkdirSync(profilePath, { recursive: true });
        }

        const updated = this.getProfileSize();
        console.log(`✅ Профіль браузера успішно очищено. Новий розмір: ${updated.formatted}`);
        return { success: true, ...updated };
    }

    /**
     * Знаходить шлях до виконуваного файлу chrome.exe
     */
    static getChromePath() {
        const possiblePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.CHROME_PATH,
        ].filter(Boolean);

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) return p;
        }
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    }

    /**
     * Запускає екземпляр Chrome з вказаними параметрами (GUI або Headless)
     */
    static async launchChrome({ headless = false } = {}) {
        const chromeExe = this.getChromePath();
        const profilePath = this.getProfilePath();

        const args = [
            `--remote-debugging-port=9222`,
            `--user-data-dir=${profilePath}`,
            `--no-first-run`,
            `--no-default-browser-check`,
            `--disable-sync`,
            `--disable-gpu`,
        ];

        if (headless) {
            args.push('--headless=new');
            args.push('--window-size=1920,1080');
            console.log('🚀 Запуск Chrome у фоновому HEADLESS-режимі (Scraping without GB)...');
        } else {
            args.push('--start-maximized');
            console.log('🚀 Запуск Chrome з графічним вікном (GUI)...');
        }

        const child = spawn(chromeExe, args, {
            detached: true,
            stdio: 'ignore',
        });
        child.unref();

        let browser = null;
        for (let attempt = 1; attempt <= 15; attempt++) {
            await delay(1000);
            try {
                browser = await puppeteer.connect({
                    browserURL: 'http://127.0.0.1:9222',
                    defaultViewport: null,
                });
                break;
            } catch (err) {
                if (attempt === 15) {
                    throw new Error(`Chrome не відповідає на порті 9222 після 15 секунд (${err.message})`);
                }
            }
        }

        this.currentMode = headless ? 'headless' : 'gui';
        this.activeBrowser = browser;
        return browser;
    }

    /**
     * Гарантує доступність інстансу Chrome у потрібному режимі (GUI чи Headless).
     * Якщо режим змінився або вимагається перезавантаження (наприклад, для GBFP), перезапускає браузер.
     */
    static async ensureBrowser({ headless = false, forceRestart = false } = {}) {
        const targetMode = headless ? 'headless' : 'gui';

        let browser = await puppeteer
            .connect({
                browserURL: 'http://127.0.0.1:9222',
                defaultViewport: null,
            })
            .catch(() => null);

        if (browser) {
            if (!forceRestart && this.currentMode === targetMode) {
                this.activeBrowser = browser;
                return browser;
            }

            console.log(`🔁 Перезавантаження браузера для переходу з [${this.currentMode || 'поточного'}] у режим [${targetMode}]...`);
            await this.killChromeProcesses(9222);
            await delay(1200);
        }

        return await this.launchChrome({ headless });
    }
}
