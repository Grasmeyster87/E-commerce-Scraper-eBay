import { selectors } from '../config/selectors.js';
import { Parser } from './parser.js';

export class EbayScraper {
    constructor(page) {
        this.page = page;
    }

    /**
     * Виконує пошук на eBay за заданим запитом
     */
    async search(query) {
        const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    }

    /**
     * Збирає дані про товари з поточної сторінки та фільтрує сміття
     */
    async scrapePage() {
        // Чекаємо на появу карток товарів перед початком збору
        await this.page.waitForSelector(selectors.productCard);
        
        const productElements = await this.page.$$(selectors.productCard);
        const results = [];

        for (const el of productElements) {
            const data = await Parser.parseProduct(el);
            
            // Логіка фільтрації:
            // 1. Перевіряємо наявність заголовка
            // 2. Відсікаємо рекламні блоки "Shop on eBay"
            // 3. Гарантуємо, що ціна не є null
            const isRealProduct = data.title && 
                                 !data.title.includes('Shop on eBay') && 
                                 data.price;

            if (isRealProduct) {
                results.push(data);
            }
        }

        return results;
    }

    /**
     * Перевіряє, чи існує кнопка переходу на наступну сторінку
     */
    async hasNextPage() {
        const nextButton = await this.page.$(selectors.paginationNext);
        return nextButton !== null;
    }

    /**
     * Переходить на наступну сторінку з імітацією людської поведінки
     */
    async goToNextPage() {
        const oldUrl = this.page.url();
        const nextButton = await this.page.$(selectors.paginationNext);
        
        if (nextButton) {
            // Прокрутка до кнопки для імітації реального користувача
            await nextButton.evaluate(el => el.scrollIntoView());
            await new Promise(r => setTimeout(r, 500)); 
            
            await nextButton.click();
            
            try {
                // Чекаємо зміни URL як підтвердження успішного переходу[cite: 6]
                await this.page.waitForFunction(
                    (old) => window.location.href !== old,
                    { timeout: 15000 },
                    oldUrl
                );
                
                // Чекаємо рендеру нових товарів
                await this.page.waitForSelector(selectors.productCard, { timeout: 10000 });
            } catch (e) {
                console.log("⚠️ Навігація затрималася, чекаємо додатковий час...");
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }
}