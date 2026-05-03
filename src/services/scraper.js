import { selectors } from '../config/selectors.js';
import { Parser } from './parser.js';

export class EbayScraper {
    constructor(page) {
        this.page = page;
    }

    async search(query) {
        const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    }

    async scrapePage() {
        // Чекаємо на появу карток товарів
        await this.page.waitForSelector(selectors.productCard);
        
        const productElements = await this.page.$$(selectors.productCard);
        const results = [];

        for (const el of productElements) {
            const data = await Parser.parseProduct(el);
            if (data.title) results.push(data);
        }

        return results;
    }

    async hasNextPage() {
        const nextButton = await this.page.$(selectors.paginationNext);
        return nextButton !== null;
    }

    async goToNextPage() {
        await Promise.all([
            this.page.click(selectors.paginationNext),
            this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        ]);
    }
}