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

/*import { StructuralParser } from './parser.js';

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
}*/


/*import { StructuralParser } from './parser.js';

export class EbayScraper {
    constructor(page) {
        this.page = page;
        this.listSelector = null;
    }

    
    //Виконує пошук на eBay за заданим запитом
     
    async search(query) {
        const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
        // Використовуємо domcontentloaded для швидшого старту, далі структуру дочекається waitForFunction
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    }

    /*
    //Автоматично знаходить селектор списку товарів, базуючись виключно на структурі тегів
     
    async findProductList() {
        console.log('🔍 Аналіз сторінки: очікування завантаження чистої структури товарів...');

        try {
            // 1. Спочатку гарантовано чекаємо базовий каркас сторінки
            await this.page.waitForSelector('body', { timeout: 10000 });

            // 2. ГОЛОВНА ЗМІНА: Чекаємо, поки в DOM з'явиться хоча б один UL, 
            // який відповідає твоїй формулі структури картки товару.
            // Це повністю замінює хардкод-селектори (.s-item__info тощо)
            await this.page.waitForFunction(() => {
                const uls = document.querySelectorAll("ul");
                return Array.from(uls).some(ul => {
                    const lis = ul.querySelectorAll("li");
                    if (lis.length === 0) return false;

                    return Array.from(lis).some(li => {
                        // Перевірка умови: наявність картинки-посилання
                        const aWithImg = li.querySelector("a[href] img[src]");
                        // Перевірка умови: наявність блоку контенту з >= 3 дітьми
                        const parentDivs = Array.from(li.querySelectorAll("div"))
                            .filter(d => d.querySelectorAll(":scope > div").length >= 3);
                        
                        return !!(aWithImg && parentDivs.length > 0);
                    });
                });
            }, { timeout: 15000 });

            console.log('✅ Структурний аналіз успішний: потрібний тип контенту з’явився на сторінці.');
        } catch (error) {
            console.log('⚠️ Попередження: Не вдалося знайти структуру товарів за таймаутом (можливо, пуста видача або капча).');
        }

        // 3. Тепер динамічно визначаємо точний селектор (ID або клас) знайденого UL-списку
        const uls = await this.page.$$('ul');
        let specialUlCount = 0;

        for (const ul of uls) {
            const id = await ul.evaluate((el) => el.id);
            const className = await ul.evaluate((el) => el.className);
            
            // Перевіряємо кожен UL на відповідність твоїй структурі
            const hasValidItems = await ul.evaluate((el) => {
                const lis = el.querySelectorAll('li');
                if (lis.length === 0) return false;
                
                let matchCount = 0;
                lis.forEach(li => {
                    const aWithImg = li.querySelector('a[href] img[src]');
                    const parentDivs = Array.from(li.querySelectorAll('div'))
                        .filter(d => d.querySelectorAll(':scope > div').length >= 3);
                    if (aWithImg && parentDivs.length > 0) matchCount++;
                });
                return matchCount > 0;
            });

            if (hasValidItems) {
                specialUlCount++;
                
                // Зберігаємо селектор найпершого знайденого валідного списку товарів
                if (!this.listSelector) {
                    if (id) {
                        this.listSelector = `#${id}`;
                    } else if (className) {
                        const firstClass = className.split(' ')[0];
                        this.listSelector = `ul.${firstClass}`;
                    }
                }
            }
        }

        console.log(`📊 Статистика: всього знайдено спеціальних UL списків — ${specialUlCount}`);
        if (this.listSelector) {
            console.log(`🎯 Динамічний селектор успішно зафіксовано: "${this.listSelector}"`);
        }
    }

    
    //Збирає дані з поточної сторінки
     /*
    async scrapePage() {
        this.listSelector = null;
        // Запускаємо наш структурний пошук
        await this.findProductList();

        if (!this.listSelector) {
            console.error('❌ Скрапінг скасовано: не знайдено валідного контейнера для товарів.');
            return [];
        }

        // Збір елементів на основі згенерованого на льоту селектора
        const productElements = await this.page.$$(
            `${this.listSelector} > li, ${this.listSelector} .s-item__wrapper`,
        );
        const results = [];

        for (const el of productElements) {
            const data = await StructuralParser.parseProduct(el);
            // Фільтруємо сміттєві блоки самого eBay (наприклад, "Shop on eBay")
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
            } catch (error) {
                console.error('Помилка при переході на наступну сторінку:', error.message);
            }
        }
    }
}*/

/*import { StructuralParser } from './parser.js';

export class EbayScraper {
    constructor(page) {
        this.page = page;
        this.listSelector = null;
    }

    async search(query) {
        const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    }

    async findProductList() {
        console.log('🔍 Аналіз сторінки: очікування завантаження чистої структури товарів...');

        try {
            await this.page.waitForSelector('body', { timeout: 10000 });

            // 1. Очікуємо появи правильної структури в DOM
            await this.page.waitForFunction(() => {
                const uls = document.querySelectorAll("ul");
                return Array.from(uls).some(ul => {
                    // ФІЛЬТР 1: Відкидаємо невидимі UL (шаблони, приховані мобільні меню тощо)
                    if (ul.offsetHeight === 0 || ul.offsetWidth === 0) return false;

                    const lis = ul.querySelectorAll("li");
                    if (lis.length === 0) return false;

                    return Array.from(lis).some(li => {
                        const aWithImg = li.querySelector("a[href] img[src]");
                        const parentDivs = Array.from(li.querySelectorAll("div"))
                            .filter(d => d.querySelectorAll(":scope > div").length >= 3);
                        
                        // ФІЛЬТР 2: Шукаємо текстові блоки (заголовки, ціни)
                        const hasTextTags = li.querySelector("span, p, h2, h3, h4");
                        
                        // ФІЛЬТР 3: Перевіряємо, що всередині реально є текст, а не пустий каркас
                        const hasRealText = li.innerText.trim().length > 0;

                        return !!(aWithImg && parentDivs.length > 0 && hasTextTags && hasRealText);
                    });
                });
            }, { timeout: 15000 });

            console.log('✅ Структурний аналіз успішний: контент з текстом з’явився на сторінці.');
        } catch (error) {
            console.log('⚠️ Попередження: Не вдалося знайти структуру товарів за таймаутом.');
        }

        // 2. Знаходимо точний селектор валідного списку
        const uls = await this.page.$$('ul');
        let specialUlCount = 0;

        for (const ul of uls) {
            const id = await ul.evaluate((el) => el.id);
            const className = await ul.evaluate((el) => el.className);
            
            const hasValidItems = await ul.evaluate((el) => {
                // Ті самі фільтри для точного визначення потрібного елемента
                if (el.offsetHeight === 0 || el.offsetWidth === 0) return false;

                const lis = el.querySelectorAll('li');
                if (lis.length === 0) return false;
                
                let matchCount = 0;
                lis.forEach(li => {
                    const aWithImg = li.querySelector('a[href] img[src]');
                    const parentDivs = Array.from(li.querySelectorAll('div'))
                        .filter(d => d.querySelectorAll(':scope > div').length >= 3);
                    const hasTextTags = li.querySelector('span, p, h2, h3, h4');
                    const hasRealText = li.innerText.trim().length > 0;

                    if (aWithImg && parentDivs.length > 0 && hasTextTags && hasRealText) {
                        matchCount++;
                    }
                });
                
                // Вимагаємо хоча б 2 збіги, щоб точно відкинути випадкові поодинокі блоки-рекомендації
                return matchCount >= 2; 
            });

            if (hasValidItems) {
                specialUlCount++;
                
                if (!this.listSelector) {
                    if (id) {
                        this.listSelector = `#${id}`;
                    } else if (className) {
                        const firstClass = className.split(' ')[0];
                        this.listSelector = `ul.${firstClass}`;
                    }
                }
            }
        }

        console.log(`📊 Знайдено реальних (видимих) UL списків з товарами: ${specialUlCount}`);
        if (this.listSelector) {
            console.log(`🎯 Зафіксовано селектор для парсингу: "${this.listSelector}"`);
        }
    }

    async scrapePage() {
        this.listSelector = null;
        await this.findProductList();

        if (!this.listSelector) {
            console.error('❌ Скрапінг скасовано: не знайдено валідного контейнера для товарів.');
            return [];
        }

        const productElements = await this.page.$$(
            `${this.listSelector} > li, ${this.listSelector} .s-item__wrapper`,
        );
        const results = [];

        for (const el of productElements) {
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
            } catch (error) {
                console.error('Помилка при переході на сторінку:', error.message);
            }
        }
    }
}*/
import { StructuralParser } from './parser.js';

export class EbayScraper {
    constructor(page) {
        this.page = page;
        this.listSelector = null;
    }

    async search(query) {
        const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    }

    async findProductList() {
        console.log('🔍 Аналіз сторінки: пошук головного списку товарів за максимальною щільністю контенту...');

        try {
            await this.page.waitForSelector('body', { timeout: 10000 });

            // 1. Чекаємо, поки на сторінці з'явиться бодай один валідний список
            await this.page.waitForFunction(() => {
                const uls = document.querySelectorAll("ul");
                return Array.from(uls).some(ul => {
                    if (ul.offsetHeight === 0 || ul.offsetWidth === 0) return false;
                    const lis = ul.querySelectorAll("li");
                    return Array.from(lis).some(li => {
                        const aWithImg = li.querySelector("a[href] img[src]");
                        const parentDivs = Array.from(li.querySelectorAll("div"))
                            .filter(d => d.querySelectorAll(":scope > div").length >= 3);
                        return !!(aWithImg && parentDivs.length > 0 && li.innerText.trim().length > 0);
                    });
                });
            }, { timeout: 15000 });

        } catch (error) {
            console.log('⚠️ Попередження: Структуру товарів не знайдено за таймаутом.');
            return;
        }

        // 2. Збір всіх кандидатів та підрахунок карток всередині них
        const candidates = await this.page.evaluate(() => {
            const uls = document.querySelectorAll("ul");
            const results = [];

            uls.forEach(ul => {
                // Пропускаємо невидимі елементи (точно не товарна сітка)
                if (ul.offsetHeight === 0 || ul.offsetWidth === 0) return;

                const lis = ul.querySelectorAll("li");
                let matchCount = 0;

                lis.forEach(li => {
                    const aWithImg = li.querySelector("a[href] img[src]");
                    const parentDivs = Array.from(li.querySelectorAll("div"))
                        .filter(d => d.querySelectorAll(":scope > div").length >= 3);
                    const hasRealText = li.innerText.trim().length > 0;

                    if (aWithImg && parentDivs.length > 0 && hasRealText) {
                        matchCount++;
                    }
                });

                // Якщо знайдено хоча б 1 збіг, зберігаємо цього кандидата
                if (matchCount > 0) {
                    // Визначаємо найкращий селектор для цього конкретного UL
                    let selector = 'ul';
                    if (ul.id) {
                        selector = `#${ul.id}`;
                    } else if (ul.className) {
                        const firstClass = ul.className.trim().split(/\s+/)[0];
                        if (firstClass) selector = `ul.${firstClass}`;
                    }

                    results.push({
                        selector: selector,
                        count: matchCount
                    });
                }
            });

            return results;
        });

        // 3. Вибираємо UL з МАКСИМАЛЬНОЮ кількістю товарів
        if (candidates.length > 0) {
            // Сортуємо від більшого до меншого
            candidates.sort((a, b) => b.count - a.count);
            
            const bestMatch = candidates[0];
            this.listSelector = bestMatch.selector;

            console.log(`📊 Знайдено потенційних списків: ${candidates.length}`);
            candidates.forEach((c, idx) => {
                console.log(`   ${idx + 1}. Селектор: "${c.selector}" -> містить товарів: ${c.count}`);
            });
            console.log(`🎯 Автоматично обрано головний список (макс. контент): "${this.listSelector}" (${bestMatch.count} шт.)`);
        } else {
            console.log('⚠️ Не знайдено жодного відповідного списку.');
        }
    }

    /*async scrapePage() {
        this.listSelector = null;
        await this.findProductList();

        if (!this.listSelector) {
            console.error('❌ Скрапінг скасовано: не знайдено валідного контейнера для товарів.');
            return [];
        }

        const productElements = await this.page.$$(
            `${this.listSelector} > li, ${this.listSelector} .s-item__wrapper`,
        );
        const results = [];

        for (const el of productElements) {
            const data = await StructuralParser.parseProduct(el);
            if (data && data.title && !data.title.includes('Shop on eBay')) {
                results.push(data);
            }
        }
        return results;
    }*/

        async scrapePage() {
    this.listSelector = null;
    await this.findProductList();

    if (!this.listSelector) {
        console.error('❌ Скрапінг скасовано: не знайдено валідного контейнера для товарів.');
        return [];
    }

    const productElements = await this.page.$$(
        `${this.listSelector} > li, ${this.listSelector} .s-item__wrapper`
    );
    const results = [];

    for (const el of productElements) {
        const data = await StructuralParser.parseProduct(el);
        // Перевіряємо наявність ліній контенту
        if (data && data.lines && data.lines.length > 0) {
            // Фільтруємо сміттєві блоки "Shop on eBay", якщо цей текст зустрівся в рядках
            const isGarbage = data.lines.some(line => line.text.includes('Shop on eBay'));
            if (!isGarbage) {
                results.push(data);
            }
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
            } catch (error) {
                console.error('Помилка при переході на сторінку:', error.message);
            }
        }
    }
}