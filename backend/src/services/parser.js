export class StructuralParser {
    static async parseProduct(liElement) {
        return await liElement.evaluate((li) => {
            // 1. Посилання та картинка
            const imgEl = li.querySelector('a[href] img[src]');
            const img = imgEl ? imgEl.src : null;
            const linkEl = imgEl
                ? imgEl.closest('a')
                : li.querySelector('a.s-item__link');
            const url = linkEl ? linkEl.href : null;

            // 2. Шукаємо контейнер за структурою (діти li)
            const allDivs = Array.from(li.querySelectorAll('div'));
            const dataContainer = allDivs.find(
                (d) => d.querySelectorAll(':scope > div').length >= 3,
            );
            if (!dataContainer) return null;

            const blocks = dataContainer.querySelectorAll(':scope > div');

            // --- Блок 1: Назва (Твоя ідея з [class*="text"]) ---
            // Шукаємо span, де в класі є "text", але ігноруємо блоки-мітки
            const titleBlock = blocks[0] ? blocks[0].querySelector('a') : null;
            let title = 'N/A';

            if (titleBlock) {
                // Використовуємо частковий пошук класів для пошуку основного заголовка
                const mainTextSpan = titleBlock.querySelector(
                    'span[role="heading"], span[class*="text"]',
                );

                if (mainTextSpan) {
                    // Клонуємо елемент, щоб видалити "NEW LISTING" без шкоди для сторінки
                    const tempSpan = mainTextSpan.cloneNode(true);
                    const badges = tempSpan.querySelectorAll(
                        '.LIGHT_HIGHLIGHT, .s-item__watchheart-web-v5, span[class*="dynamic"]',
                    );
                    badges.forEach((b) => b.remove());

                    title = tempSpan.innerText
                        .replace('NEW LISTING', '')
                        .trim();
                } else {
                    title = titleBlock.innerText.trim();
                }
            }

            // --- Блок 2: Ціна (Пошук за символом валюти) ---
            const detailsBlock = blocks[1];
            let price = 'N/A';
            if (detailsBlock) {
                const textElements = Array.from(
                    detailsBlock.querySelectorAll(
                        'span[class*="text"], span[class*="price"]',
                    ),
                );
                const priceEl = textElements.find(
                    (el) =>
                        el.innerText.includes('$') ||
                        el.innerText.includes('£'),
                );
                price = priceEl ? priceEl.innerText.trim() : 'N/A';
            }

            return {
                title: title.replace(/^NEW LISTING\s+/i, ''),
                url,
                img,
                price,
                status: 'Buy It Now', // Спрощено, можна розширити пошук за ключовими словами
                shipping: 'Check eBay',
                location: 'Global',
            };
        });
    }
}
