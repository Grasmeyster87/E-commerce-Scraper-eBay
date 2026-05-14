import puppeteer from 'puppeteer-extra';
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
}