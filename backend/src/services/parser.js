/*export class StructuralParser {
    static async parseProduct(liElement) {
        return await liElement.evaluate((li) => {
            // ФІЛЬТР 1: Жорстко відкидаємо блоки пагінації eBay
            if (
                li.classList.contains(
                    'srp-river-answer--BASIC_PAGINATION_V2',
                ) ||
                li.querySelector('.s-pagination') ||
                li.innerText.includes('Items Per Page')
            ) {
                return null; // Це не товар
            }

            // ФІЛЬТР 2: Кожен реальний товар має містити ціну (знак валюти)
            const textContent = li.innerText;
            const hasCurrency =
                /[\$\£\€\¥\₣\₽\₴\₦\₹\₩\₺\₿]/.test(textContent) ||
                /\b(USD|EUR|GBP|CAD|AUD|NZD|JPY|CNY|CHF|SEK|NOK|DKK|MXN|BRL|RUB|UAH|TRY|INR|KRW|PLN|CZK|HUF)\b/i.test(
                    textContent,
                );

            if (!hasCurrency) {
                return null; // Якщо немає грошей — це заглушка або реклама
            }

            // 1. Посилання та зображення залишаємо, вони базові
            const imgEl = li.querySelector('a[href] img[src]');
            const img = imgEl ? imgEl.src : null;
            const linkEl = imgEl
                ? imgEl.closest('a')
                : li.querySelector('a[href]');
            const url = linkEl ? linkEl.href : null;

            // Визначаємо зону контенту картки (все, крім блоку медіа)
            const contentArea =
                li.querySelector('.su-card-container__content') || li;
            const rawLines = [];

            // Функція для очищення тексту від сміття анти-ботів та zero-width коду
            function cleanText(str) {
                if (!str) return '';
                return str
                    .replace(/[\u200B-\u200D\uFEFF\u2060-\u206F\u2062]/g, '') // Видаляємо приховані роздільники літер
                    .replace(/\s+/g, ' ') // Нормалізуємо пробіли
                    .trim();
            }

            // Рекурсивний обхід DOM дерева всередині картки
            function traverse(element) {
                if (!element) return;

                // Пропускаємо технічні теги, іконки та приховані службові підказки типу .clipped
                if (
                    ['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'BUTTON'].includes(
                        element.tagName,
                    )
                )
                    return;
                if (
                    element.classList.contains('su-card-container__media') ||
                    element.classList.contains('clipped')
                )
                    return;

                const childElements = Array.from(element.children);

                // ЛОГІКА ОБФУСКАЦІЇ: якщо у тега є діти, і текст всередині КОЖНОГО з них <= 1 символу
                const isObfuscated =
                    childElements.length > 0 &&
                    childElements.every((el) => {
                        const cleanTmp = el.textContent
                            .replace(
                                /[\u200B-\u200D\uFEFF\u2060-\u206F\u2062]/g,
                                '',
                            )
                            .trim();
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

            // Генератор унікального ID для картки
            const cardUniqueId =
                'card_' +
                Math.random().toString(36).substring(2, 11) +
                Date.now().toString(36);

            // Перетворюємо масив рядків у структуру з індексами та bool параметрами
            const formattedLines = uniqueLines.map((text, idx) => ({
                index: idx + 1,
                text: text,
                checked: true, // За замовчуванням кожна строка активна для додавання
            }));

            // Якщо після обробки не знайшлося жодного рядка — це теж сміття
            if (formattedLines.length === 0) return null;

            return {
                id: cardUniqueId,
                img,
                url,
                cardChecked: true, // Флаг унікальності / активності всієї картки
                lines: formattedLines,
            };
        });
    }
}*/
export class StructuralParser {
    static async parseProduct(liElement) {
        return await liElement.evaluate((li) => {
            if (
                li.classList.contains(
                    'srp-river-answer--BASIC_PAGINATION_V2',
                ) ||
                li.querySelector('.s-pagination') ||
                li.innerText.includes('Items Per Page')
            ) {
                return null;
            }

            const textContent = li.innerText;
            const hasCurrency =
                /[\$\£\€\¥\₣\₽\₴\₦\₹\₩\₺\₿]/.test(textContent) ||
                /\b(USD|EUR|GBP|CAD|AUD|NZD|JPY|CNY|CHF|SEK|NOK|DKK|MXN|BRL|RUB|UAH|TRY|INR|KRW|PLN|CZK|HUF)\b/i.test(
                    textContent,
                );

            if (!hasCurrency) return null;

            const imgEl = li.querySelector('a[href] img[src]');
            const img = imgEl ? imgEl.src : null;
            const linkEl = imgEl
                ? imgEl.closest('a')
                : li.querySelector('a[href]');
            const url = linkEl ? linkEl.href : null;

            // Зона контенту
            const contentArea =
                li.querySelector('.su-card-container__content') || li;

            const rawItems = [];

            function cleanText(str) {
                if (!str) return '';
                return str
                    .replace(/[\u200B-\u200D\uFEFF\u2060-\u206F\u2062]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            // 1. Додаємо корінь дерева: сам тег <li>
            rawItems.push({
                text: `<li class="${li.className}">`,
                depth: 0,
                isStructure: true,
            });

            // 2. Рекурсивна функція тепер фіксує і ТЕГИ, і ТЕКСТ
            function traverse(element, currentDepth) {
                if (!element) return;
                if (
                    ['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'BUTTON'].includes(
                        element.tagName,
                    )
                )
                    return;
                if (
                    element.classList.contains('su-card-container__media') ||
                    element.classList.contains('clipped')
                )
                    return;

                // ЗБЕРІГАЄМО СКЕЛЕТ: Записуємо поточний HTML тег та його класи
                const tagName = element.tagName.toLowerCase();
                // Використовуємо getAttribute('class'), який завжди повертає String або null
                const classAttr = element.getAttribute('class');
                const classes = classAttr
                    ? ` class="${classAttr.trim().replace(/\s+/g, ' ')}"`
                    : '';
                rawItems.push({
                    text: `<${tagName}${classes}>`,
                    depth: currentDepth,
                    isStructure: true,
                });

                const childElements = Array.from(element.children);

                // Перевірка на обфускацію (захист eBay)
                const isObfuscated =
                    childElements.length > 0 &&
                    childElements.every((el) => {
                        const cleanTmp = el.textContent
                            .replace(
                                /[\u200B-\u200D\uFEFF\u2060-\u206F\u2062]/g,
                                '',
                            )
                            .trim();
                        return cleanTmp.length <= 1;
                    });

                if (isObfuscated) {
                    const combined = cleanText(element.textContent);
                    if (combined) {
                        rawItems.push({
                            text: combined,
                            depth: currentDepth + 1,
                            isStructure: false,
                        });
                    }
                    return;
                }

                // Якщо це кінцевий вузол (лист) — записуємо його текст
                if (childElements.length === 0) {
                    const text = cleanText(element.textContent);
                    if (text) {
                        rawItems.push({
                            text: text,
                            depth: currentDepth + 1,
                            isStructure: false,
                        });
                    }
                    return;
                }

                // Занурюємося глибше
                for (const child of childElements) {
                    traverse(child, currentDepth + 1);
                }
            }

            // Починаємо обхід з глибини 1
            traverse(contentArea, 1);

            const cardUniqueId =
                'card_' +
                Math.random().toString(36).substring(2, 11) +
                Date.now().toString(36);

            // ВАЖЛИВО: Ми більше НЕ видаляємо дублікати, щоб не розірвати дерево!
            const formattedLines = rawItems.map((item, idx) => ({
                index: idx + 1,
                text: item.text,
                depth: item.depth,
                isStructure: item.isStructure,
                checked: true,
            }));

            return {
                id: cardUniqueId,
                img,
                url,
                cardChecked: true,
                lines: formattedLines,
            };
        });
    }
}
