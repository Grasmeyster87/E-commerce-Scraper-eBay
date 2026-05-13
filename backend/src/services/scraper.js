/*import { selectors } from '../config/selectors.js';
import { Parser } from './parser.js';

export class EbayScraper {
    constructor(page) {
        this.page = page;
        this.listSelector = null;
    }

    /**
     * Виконує пошук на eBay за заданим запитом
     */
/*async search(query) {
        const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    }

    /**
     * Збирає дані про товари з поточної сторінки та фільтрує сміття
     */
/*async scrapePage() {
        // Якщо ми ще не знаємо, де список — шукаємо його за структурою
        if (!this.listSelector) {
            this.listSelector = await findProductList(this.page);
        }

        if (!this.listSelector) {
            console.error('❌ Не вдалося знайти структуру списку товарів');
            return [];
        }

        // Отримуємо всі li в нашому знайденому списку
        const productElements = await this.page.$$(`${this.listSelector} > li`);
        const results = [];

        for (const el of productElements) {
            const data = await StructuralParser.parse(el);

            // Ваша логіка фільтрації залишається
            if (data && data.title && !data.title.includes('Shop on eBay')) {
                results.push(data);
            }
        }

        return results;
    }

    // Перевіряє, чи існує кнопка переходу на наступну сторінку
     
    async hasNextPage() {
        const nextButton = await this.page.$(selectors.paginationNext);
        return nextButton !== null;
    }

    // Переходить на наступну сторінку з імітацією людської поведінки
    
    /*async goToNextPage() {
        const oldUrl = this.page.url();
        const nextButton = await this.page.$(selectors.paginationNext);

        if (nextButton) {
            // Прокрутка до кнопки для імітації реального користувача
            await nextButton.evaluate((el) => el.scrollIntoView());
            await new Promise((r) => setTimeout(r, 500));

            await nextButton.click();

            try {
                // Чекаємо зміни URL як підтвердження успішного переходу[cite: 6]
                await this.page.waitForFunction(
                    (old) => window.location.href !== old,
                    { timeout: 15000 },
                    oldUrl,
                );

                // Чекаємо рендеру нових товарів
                await this.page.waitForSelector(selectors.productCard, {
                    timeout: 10000,
                });
            } catch (e) {
                console.log(
                    '⚠️ Навігація затрималася, чекаємо додатковий час...',
                );
                await new Promise((r) => setTimeout(r, 3000));
            }
        }
    }
}*/

/* import { StructuralParser } from './parser.js'; // Переконайтеся, що ім'я збігається (Parser або StructuralParser)

export class EbayScraper {
    constructor(page) {
        this.page = page;
        this.listSelector = null;
    }

    async search(query) {
        const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
        await this.page.goto(url, { waitUntil: 'networkidle2' });
    }

    async findProductList() {
        this.listSelector = await this.page.evaluate(() => {
            // Пріоритет 1: Стандартний список eBay
            const mainList = document.querySelector("ul.srp-results, .srp-list");
            if (mainList) return "ul.srp-results";

            // Пріоритет 2: Будь-який контейнер, де багато елементів схожих на товар
            const containers = document.querySelectorAll("ul, div.srp-river-answer");
            for (const c of containers) {
                const items = c.querySelectorAll(":scope > li, :scope > div.s-item__wrapper");
                if (items.length > 10) {
                    c.classList.add("__scraper_main_list");
                    return ".__scraper_main_list";
                }
            }
            return null;
        });
    }

    async scrapePage() {
        // ОБОВ'ЯЗКОВО скидаємо селектор перед кожним парсингом нової сторінки
        this.listSelector = null;
        await this.findProductList();

        if (!this.listSelector) return [];

        // Шукаємо або прямі li, або блоки товарів
        const productElements = await this.page.$$(`${this.listSelector} > li, ${this.listSelector} .s-item__wrapper`);
        const results = [];

        for (const el of productElements) {
            const data = await Parser.parseProduct(el);
            if (data && data.title && !data.title.includes('Shop on eBay')) {
                results.push(data);
            }
        }
        return results;
    }

    async hasNextPage() {
        return (await this.page.$('a.pagination__next')) !== null;
    }

    async goToNextPage() {
        const nextButton = await this.page.$('a.pagination__next');
        if (nextButton) {
            const oldUrl = this.page.url();
            await nextButton.click();
            
            try {
                // Чекаємо, поки URL зміниться (це надійніше за waitForNavigation)
                await this.page.waitForFunction((old) => window.location.href !== old, { timeout: 10000 }, oldUrl);
                // Даємо час на рендер JS-карток
                await new Promise(r => setTimeout(r, 2000));
            } catch (e) {
                console.log("⚠️ Затримка при переході, але пробуємо парсити далі...");
            }
        }
    }
} */

import { StructuralParser } from './parser.js';

export class EbayScraper {
    constructor(page) {
        this.page = page;
        this.listSelector = null;
    }

    async search(query) {
        const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
        console.log(`Навігація на: ${url}`);

        // Чекаємо повного завантаження мережі
        await this.page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000,
        });

        // Додатково чекаємо появи хоча б одного елемента результатів
        // Це гарантує, що контекст не буде знищено під час пошуку списку
        await this.page
            .waitForSelector('.s-item__info, .s-item__wrapper', {
                timeout: 15000,
            })
            .catch(() =>
                console.log(
                    'Попередження: Селектор товарів не знайдено вчасно.',
                ),
            );
    }

    async findProductList() {
        this.listSelector = await this.page.evaluate(() => {
            const mainList = document.querySelector(
                'ul.srp-results, .srp-list',
            );
            if (mainList) return 'ul.srp-results';

            const containers = document.querySelectorAll(
                'ul, div.srp-river-answer',
            );
            for (const c of containers) {
                const items = c.querySelectorAll(
                    ':scope > li, :scope > div.s-item__wrapper',
                );
                if (items.length > 10) {
                    c.classList.add('__scraper_main_list');
                    return '.__scraper_main_list';
                }
            }
            return null;
        });
    }

    async scrapePage() {
        // Скидаємо селектор, щоб на кожній сторінці шукати заново
        this.listSelector = null;
        await this.findProductList();

        if (!this.listSelector) return [];

        const productElements = await this.page.$$(
            `${this.listSelector} > li, ${this.listSelector} .s-item__wrapper`,
        );
        const results = [];

        for (const el of productElements) {
            // ВИПРАВЛЕНО: Викликаємо StructuralParser замість Parser
            const data = await StructuralParser.parseProduct(el);
            if (data && data.title && !data.title.includes('Shop on eBay')) {
                results.push(data);
            }
        }
        return results;
    }

    async hasNextPage() {
        return (await this.page.$('a.pagination__next')) !== null;
    }

    async goToNextPage() {
        const nextButton = await this.page.$('a.pagination__next');
        if (nextButton) {
            const oldUrl = this.page.url();
            await nextButton.click();

            try {
                await this.page.waitForFunction(
                    (old) => window.location.href !== old,
                    { timeout: 10000 },
                    oldUrl,
                );
                await new Promise((r) => setTimeout(r, 2000));
            } catch (e) {
                console.log('⚠️ Затримка при переході...');
            }
        }
    }
}
