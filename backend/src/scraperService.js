import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { EbayScraper } from './services/scraper.js'; 

puppeteer.use(StealthPlugin());

export async function runEbayScraper(searchQuery) {
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: './browser_profile',
        // Додаємо прапорці для чистішого запуску
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--no-first-run',
            '--disable-extensions'
        ]
    });

    try {
        // Замість newPage() перевіряємо існуючі сторінки, щоб закрити "blank"
        const pages = await browser.pages();
        const page = pages[0]; // Використовуємо вже відкриту вкладку

        const scraper = new EbayScraper(page);
        
        console.log(`🔍 Починаємо пошук: ${searchQuery}...`);
        
        // Виконуємо пошук
        await scraper.search(searchQuery);

        // КРИТИЧНО: Чекаємо стабілізації сторінки перед збором даних
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        
        const data = await scraper.scrapePage(); 
        
        await browser.close(); // Закриваємо, щоб звільнити профіль для наступного запиту
        return data;
    } catch (error) {
        console.error('Помилка в логіці сервісу:', error.message);
        // Обов'язково закриваємо браузер при помилці, інакше профіль заблокується
        if (browser) await browser.close();
        throw error;
    }
}