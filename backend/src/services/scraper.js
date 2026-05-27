import { StructuralParser } from './parser.js';

export class EbayScraper {
    constructor(page) {
        this.page = page;
        this.listSelector = null;
    }

    async search(query, itemsPerPage = 60) {
        let url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
        if (itemsPerPage) {
            url += `&_ipg=${itemsPerPage}`;
        }
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    }

    async findProductList() {
        console.log('🔍 Аналіз сторінки: пошук головного списку товарів...');
        try {
            await this.page.waitForSelector('body', { timeout: 10000 });
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

        const candidates = await this.page.evaluate(() => {
            const uls = document.querySelectorAll("ul");
            const results = [];
            uls.forEach(ul => {
                if (ul.offsetHeight === 0 || ul.offsetWidth === 0) return;
                const lis = ul.querySelectorAll("li");
                let matchCount = 0;
                lis.forEach(li => {
                    const aWithImg = li.querySelector("a[href] img[src]");
                    const parentDivs = Array.from(li.querySelectorAll("div")).filter(d => d.querySelectorAll(":scope > div").length >= 3);
                    const hasRealText = li.innerText.trim().length > 0;
                    if (aWithImg && parentDivs.length > 0 && hasRealText) matchCount++;
                });
                if (matchCount > 0) {
                    let selector = 'ul';
                    if (ul.id) selector = `#${ul.id}`;
                    else if (ul.className) {
                        const firstClass = ul.className.trim().split(/\s+/)[0];
                        if (firstClass) selector = `ul.${firstClass}`;
                    }
                    results.push({ selector, count: matchCount });
                }
            });
            return results;
        });

        if (candidates.length > 0) {
            candidates.sort((a, b) => b.count - a.count);
            this.listSelector = candidates[0].selector;
            console.log(`🎯 Обрано список: "${this.listSelector}" (${candidates[0].count} шт.)`);
        }
    }

    // НОВЕ: Збір інформації про пагінацію через часткові селектори
    async getPaginationInfo() {
        return await this.page.evaluate(() => {
            let totalPages = 1;
            let currentPage = 1;
            let itemsPerPage = 0;

            // 1. Пошук блоку пагінації (ol з класом, що містить 'pagination')
            const olElements = document.querySelectorAll('ol[class*="pagination"]');
            if (olElements.length > 0) {
                const items = Array.from(olElements[0].querySelectorAll('li'));
                
                // Знаходимо поточну сторінку (за aria-current або виділенням)
                const currentItem = items.find(li => li.querySelector('[aria-current="page"]') || li.className.includes('current'));
                if (currentItem) {
                    currentPage = parseInt(currentItem.textContent.trim()) || 1;
                }

                // Шукаємо максимальну цифру серед усіх <li> для визначення загальної кількості сторінок
                const numbers = items.map(li => parseInt(li.textContent.trim())).filter(n => !isNaN(n));
                if (numbers.length > 0) {
                    totalPages = Math.max(...numbers);
                }
            }

            // 2. Пошук випадаючого списку кількості карток на сторінці
            const ippButton = document.querySelector('button[aria-controls*="ipp"], [class*="ipp"] button');
            if (ippButton) {
                itemsPerPage = parseInt(ippButton.textContent.trim()) || 0;
            }

            // Якщо кнопки немає, просто рахуємо кількість карток
            if (!itemsPerPage) {
                itemsPerPage = document.querySelectorAll('li[class*="s-card"]').length;
            }

            return { currentPage, totalPages, itemsPerPage };
        });
    }

    // НОВЕ: Емуляція кліку по кнопці "Next"
    async goToNextPageByClick() {
        console.log('🔄 Емуляція кліку на кнопку "Наступна сторінка"...');
        return await this.page.evaluate(() => {
            // Шукаємо кнопку за type="next" або частковим співпадінням класу
            const nextBtn = document.querySelector('button[type="next"], a[type="next"], [class*="pagination"] [class*="next"]');
            
            if (nextBtn) {
                // Перевіряємо чи не заблокована кнопка (aria-disabled)
                if (nextBtn.hasAttribute('aria-disabled') && nextBtn.getAttribute('aria-disabled') === 'true') {
                    return false;
                }
                nextBtn.click();
                return true;
            }
            return false;
        });
    }

    async scrapePage() {
        this.listSelector = null;
        await this.findProductList();

        if (!this.listSelector) return [];

        const productElements = await this.page.$$(
            `${this.listSelector} > li, ${this.listSelector} .s-item__wrapper`
        );
        const results = [];

        for (const el of productElements) {
            const data = await StructuralParser.parseProduct(el);
            if (data && data.lines && data.lines.length > 0) {
                const isGarbage = data.lines.some(line => line.text.includes('Shop on eBay'));
                if (!isGarbage) results.push(data);
            }
        }
        return results;
    }
}