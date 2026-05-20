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