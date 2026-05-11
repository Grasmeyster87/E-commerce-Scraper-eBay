/*import { selectors } from '../config/selectors.js';

export class Parser {
    static async parseProduct(element) {
        return await element.evaluate((el, sel) => {
            const titleEl = el.querySelector(sel.title);
            const priceEl = el.querySelector(sel.price);
            const linkEl = el.querySelector(sel.link);

            return {
                title: titleEl ? titleEl.innerText.trim() : null,
                price: priceEl ? priceEl.innerText.trim() : null,
                url: linkEl ? linkEl.href : null,
            };
        }, selectors);
    }
}*/

export class StructuralParser {
    /**
     * Розбирає один елемент <li> за його структурою
     */
    static async parseProduct(liElement) {
        return await liElement.evaluate((li) => {
            // 1. Шукаємо картинку, яка знаходиться всередині посилання
            // Селектор "a[href] img[src]" знаходить саме тег <img>
            const imgEl = li.querySelector("a[href] img[src]");
            
            // Якщо картинку знайдено, беремо її src та href батьківського посилання
            const img = imgEl ? imgEl.src : null;
            const linkEl = imgEl ? imgEl.closest('a') : null;
            const url = linkEl ? linkEl.href : null;

            // 2. Шукаємо основний контейнер даних (дитина li, що містить >= 3 вкладених div)
            const allDivs = Array.from(li.querySelectorAll("div"));
            const dataContainer = allDivs.find(d => d.querySelectorAll(":scope > div").length >= 3);
            
            if (!dataContainer) return null;

            const blocks = dataContainer.querySelectorAll(":scope > div");
            
            // --- Блок 1: Назва ---
            const titleEl = blocks[0] ? blocks[0].querySelector("a span") : null;
            const title = titleEl ? titleEl.innerText.trim() : "N/A";

            // --- Блок 2: Ціна та деталі ---
            // Безпечно отримуємо другий блок (індекс 1)
            const detailsBlock = blocks[1];
            let infoSpans = [];
            
            if (detailsBlock) {
                infoSpans = Array.from(detailsBlock.querySelectorAll("span"))
                                 .map(s => s.innerText.trim())
                                 .filter(text => text.length > 0);
            }

            return {
                title,
                url,
                img,
                price: infoSpans[0] || "N/A",
                status: infoSpans[1] || null,
                shipping: infoSpans[2] || null,
                location: infoSpans[3] || null
            };
        });
    }
}
