import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { EbayScraper } from './services/scraper.js';

puppeteer.use(StealthPlugin());

async function run() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const scraper = new EbayScraper(page);
    const query = 'mechanical keyboard';
    let allProducts = [];

    try {
        console.log(`Starting search for: ${query}...`);
        await scraper.search(query);

        // Скрапимо перші 2 сторінки для прикладу
        for (let i = 1; i <= 2; i++) {
            console.log(`Scraping page ${i}...`);
            const products = await scraper.scrapePage();
            allProducts = allProducts.concat(products);

            if (await scraper.hasNextPage()) {
                await scraper.goToNextPage();
            } else {
                break;
            }
        }

        console.table(allProducts.slice(0, 10)); // Вивід перших 10 результатів
        console.log(`Total scraped: ${allProducts.length}`);
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await browser.close();
    }
}

run();
