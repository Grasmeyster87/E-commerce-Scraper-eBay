/*export class StructuralParser {
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
}*/

export class StructuralParser {
    static async parseProduct(liElement) {
        return await liElement.evaluate((li) => {
            // 1. Посилання та зображення залишаємо, вони базові
            const imgEl = li.querySelector('a[href] img[src]');
            const img = imgEl ? imgEl.src : null;
            const linkEl = imgEl ? imgEl.closest('a') : li.querySelector('a[href]');
            const url = linkEl ? linkEl.href : null;

            // Визначаємо зону контенту картки (все, крім блоку медіа)
            const contentArea = li.querySelector('.su-card-container__content') || li;
            const rawLines = [];

            // Функція для очищення тексту від сміття анти-ботів та zero-width коду
            function cleanText(str) {
                if (!str) return '';
                return str
                    .replace(/[\u200B-\u200D\uFEFF\u2060-\u206F\u2062]/g, '') // Видаляємо приховані роздільники літер
                    .replace(/\s+/g, ' ')                                    // Нормалізуємо пробіли
                    .trim();
            }

            // Рекурсивний обхід DOM дерева всередині картки
            function traverse(element) {
                if (!element) return;

                // Пропускаємо технічні теги, іконки та приховані службові підказки типу .clipped
                if (['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'BUTTON'].includes(element.tagName)) return;
                if (element.classList.contains('su-card-container__media') || element.classList.contains('clipped')) return;

                const childElements = Array.from(element.children);

                // ЛОГІКА ОБФУСКАЦІЇ: якщо у тега є діти, і текст всередині КОЖНОГО з них <= 1 символу
                const isObfuscated = childElements.length > 0 && childElements.every(el => {
                    const cleanTmp = el.textContent.replace(/[\u200B-\u200D\uFEFF\u2060-\u206F\u2062]/g, '').trim();
                    return cleanTmp.length <= 1;
                });

                if (isObfuscated) {
                    // Піднімаємося на тег вище (це наш поточний element) і забираємо весь рядок цілком
                    const combined = cleanText(element.textContent);
                    if (combined) rawLines.push(combined);
                    return; // Зупиняємо рекурсію для цієї гілки
                }

                // Якщо дійшли до кінцевого елемента (text node container)
                if (childElements.length === 0) {
                    const text = cleanText(element.textContent);
                    if (text) rawLines.push(text);
                    return;
                }

                // Рухаємося глибше по дереву
                for (const child of childElements) {
                    traverse(child);
                }
            }

            traverse(contentArea);

            // Фільтруємо унікальні рядки, прибираючи дублікати через накладання батьківських тегів
            const uniqueLines = [];
            for (let line of rawLines) {
                if (!uniqueLines.includes(line)) {
                    uniqueLines.push(line);
                }
            }

            // Генератор унікального ID для картки (як у курсах React: випадковий base36 + timestamp)
            const cardUniqueId = 'card_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

            // Перетворюємо масив рядків у структуру з індексами та bool параметрами
            const formattedLines = uniqueLines.map((text, idx) => ({
                index: idx + 1,
                text: text,
                checked: true // За замовчуванням кожна строка активна для додавання
            }));

            return {
                id: cardUniqueId,
                img,
                url,
                cardChecked: true, // Флаг унікальності / активності всієї картки
                lines: formattedLines
            };
        });
    }
}
