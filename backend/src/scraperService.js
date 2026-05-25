import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import { EbayScraper } from './services/scraper.js';
import { FileHandler } from './utils/fileHandler.js'; // ДОДАНО ІМПОРТ!

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Додано параметр saveDebugHtml
export async function runEbayScraper(searchQuery, saveDebugHtml = false) {
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
                if (err) console.error('❌ Не вдалося запустити Chrome через скрипт:', err.message);
            });

            for (let attempt = 1; attempt <= 7; attempt++) {
                try {
                    await delay(1000);
                    browser = await puppeteer.connect({
                        browserURL: 'http://127.0.0.1:9222',
                        defaultViewport: null
                    });
                    console.log(`✅ Успішно підключено до Chrome на спробі №${attempt}`);
                    break;
                } catch (connectError) {
                    if (attempt === 7) throw new Error('Chrome запускається занадто довго.');
                    console.log(`⏳ Очікування ініціалізації порту 9222 (спроба ${attempt}/7)...`);
                }
            }
        } else {
            console.log('🔄 Знайдено вже запущений Chrome. Перевикористовуємо поточне вікно.');
        }

        const pages = await browser.pages();
        const page = pages[0];
        const scraper = new EbayScraper(page);

        await scraper.search(searchQuery);
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        
        // НОВЕ: ЛОГІКА ДЕБАГУ
        if (saveDebugHtml) {
            const htmlContent = await page.content();
            const savedPath = FileHandler.saveDebugInfo(htmlContent, null, 'ebay_page');
            console.log(`💾 [DEBUG] HTML-код сторінки збережено: ${savedPath}`);
        }

        const data = await scraper.scrapePage();
        return data;

    } catch (error) {
        console.error('❌ Помилка в логіці скрапера:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.disconnect().catch(() => {});
            console.log('🛑 Сесію Puppeteer відключено. Вікно Chrome збережено.');
        }
    }
}