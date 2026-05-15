/*import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { EbayScraper } from './services/scraper.js';

puppeteer.use(StealthPlugin());

export async function runEbayScraper(searchQuery) {
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: './browser_profile',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const pages = await browser.pages();
        const page = pages[0];
        const scraper = new EbayScraper(page);

        await scraper.search(searchQuery);
        
        // Чекаємо, поки з'являться результати, щоб уникнути "Execution context was destroyed"
        //await page.waitForSelector('.s-item__title', { timeout: 15000 });
        
        const data = await scraper.scrapePage();
        return data;
    } catch (error) {
        console.error('Scraper Logic Error:', error.message);
        throw error;
    } finally {
        // Гарантовано закриваємо браузер, щоб звільнити browser_profile
        if (browser) await browser.close();
    }
}*/

import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { EbayScraper } from './services/scraper.js';

puppeteer.use(StealthPlugin());

// Визначаємо аналог __dirname для ES-модулів (оскільки файл у backend/src/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Проста утиліта для паузи (очікування старту Chrome)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runEbayScraper(searchQuery) {
    // 1. Динамічно визначаємо шлях до скрипту запуску браузера
    // Якщо вибрав варіант з .sh, заміни 'launch_chrome.bat' на 'launch_chrome.sh'
    const scriptPath = path.join(__dirname, 'launch_chrome.bat');
    
    // Запускаємо скрипт у фоновому режимі, щоб Node.js не блокував виконання
    exec(`"${scriptPath}"`, (err) => {
        if (err) {
            console.error('❌ Не вдалося запустити Chrome через скрипт:', err.message);
        }
    });

    // КРИТИЧНО: Даємо Chrome 2 секунди для ініціалізації порту 9222
    await delay(2000);

    let browser;
    try {
        // 2. Підключаємося до автоматично створеного процесу через CDP
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: null
        });

        // --- ТВОЯ ЗБЕРЕЖЕНА ЛОГІКА (БЕЗ ЗМІН) ---
        const pages = await browser.pages();
        const page = pages[0];
        const scraper = new EbayScraper(page);

        await scraper.search(searchQuery);
        
        // Очікування стабілізації сторінки
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        
        const data = await scraper.scrapePage();
        return data;
        // --- КІНЕЦЬ ТВОЄЇ ЛОГІКИ ---

    } catch (error) {
        console.error('Scraper Logic Error:', error.message);
        throw error;
    } finally {
        // Оскільки Node.js сам породжує вікно під кожен запит,
        // цей блок коректно закриє весь процес Chrome в кінці,
        // повністю звільняючи browser_profile для майбутніх запусків.
        if (browser) {
            console.log('🛑 Закриваємо сесію браузера та звільняємо профіль...');
            await browser.close();
        }
    }
}