import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import { EbayScraper } from './services/scraper.js';
import { FileHandler } from './utils/fileHandler.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runEbayScraper(searchQuery, saveDebugHtml = false, action = 'search', itemsPerPage = 60) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const scriptPath = path.join(__dirname, 'launch_chrome.bat');

    let browser = null;

    try {
        console.log('🔍 Перевірка наявності активної сесії Chrome...');
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: null
        }).catch(() => null);

        if (!browser) {
            console.log('🌐 Chrome не знайдено на порту 9222. Запускаємо новий екземпляр...');
            exec(`"${scriptPath}"`, (err) => {
                if (err) console.error('❌ Не вдалося запустити Chrome:', err.message);
            });

            for (let attempt = 1; attempt <= 7; attempt++) {
                try {
                    await delay(1000);
                    browser = await puppeteer.connect({
                        browserURL: 'http://127.0.0.1:9222',
                        defaultViewport: null
                    });
                    break;
                } catch (connectError) {
                    if (attempt === 7) throw new Error('Chrome запускається занадто довго.');
                }
            }
        }

        const pages = await browser.pages();
        const page = pages[0];
        const scraper = new EbayScraper(page);

        // ЛОГІКА НАВІГАЦІЇ
        if (action === 'search') {
            await scraper.search(searchQuery, itemsPerPage);
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        } else if (action === 'next') {
            const clicked = await scraper.goToNextPageByClick();
            if (!clicked) {
                throw new Error('Досягнуто останньої сторінки або кнопку не знайдено.');
            }
            // Чекаємо, поки нова сторінка завантажиться після кліку
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
        }

        if (saveDebugHtml) {
            const htmlContent = await page.content();
            FileHandler.saveDebugInfo(htmlContent, null, 'ebay_page');
        }

        const data = await scraper.scrapePage();
        const pagination = await scraper.getPaginationInfo(); // Збираємо дані про сторінки

        return { data, pagination };

    } catch (error) {
        console.error('❌ Помилка в логіці скрапера:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.disconnect().catch(() => {});
        }
    }
}