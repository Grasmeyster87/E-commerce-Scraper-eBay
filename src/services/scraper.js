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
    const oldUrl = this.page.url();
    const nextButton = await this.page.$(selectors.paginationNext);
    
    if (nextButton) {
        // Прокручуємо до кнопки, щоб клік був "людським"
        await nextButton.evaluate(el => el.scrollIntoView());
        await new Promise(r => setTimeout(r, 500)); // Коротка пауза перед кліком
        
        await nextButton.click();
        
        try {
            // Чекаємо, поки URL зміниться або з'являться нові товари
            // Це надійніше за waitForNavigation[cite: 5]
            await this.page.waitForFunction(
                (old) => window.location.href !== old,
                { timeout: 15000 },
                oldUrl
            );
            
            // Додатково чекаємо на появу карток товарів на новій сторінці
            await this.page.waitForSelector(selectors.productCard, { timeout: 10000 });
        } catch (e) {
            console.log("⚠️ Навігація затрималася або кнопка не спрацювала, пробуємо почекати мережу...");
            // Якщо URL не змінився, даємо сайту ще трохи часу
            await new Promise(r => setTimeout(r, 3000));
        }
    }
}
}