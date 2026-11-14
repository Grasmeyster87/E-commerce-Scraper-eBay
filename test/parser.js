/**
 * Утиліта для очищення тексту від прихованих символів та зайвих пробілів
 */
export function cleanText(str) {
    if (!str) return '';
    return str
        .replace(/[\u200B-\u200D\uFEFF\u2060-\u206F\u2062]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Клас для парсингу та аналізу HTML-структури сторінки товару eBay.
 * Містить готові методи витягування ключових полів, а також інструменти
 * для дослідження тегів і відладки власних алгоритмів.
 */
export class ProductParser {
    /**
     * Основний метод: парсинг повної інформації про товар зі сторінки
     * @param {Object} page - Інстанс сторінки Puppeteer
     * @returns {Promise<Object>} Об'єкт з структурованими даними товару
     */
    static async parseProduct(page) {
        return await page.evaluate(() => {
            const clean = (str) => {
                if (!str) return '';
                return str
                    .replace(/[\u200B-\u200D\uFEFF\u2060-\u206F\u2062]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            };

            // 1. НАЗВА ТОВАРУ (TITLE)
            const titleEl = 
                document.querySelector('h1.x-item-title__mainTitle span.ux-textspans') ||
                document.querySelector('h1.x-item-title__mainTitle') ||
                document.querySelector('h1[class*="title"]') ||
                document.querySelector('h1');
            const title = clean(titleEl ? titleEl.textContent : '');

            // 2. ЦІНА ТА ВАЛЮТА (PRICE)
            const priceEl = 
                document.querySelector('.x-price-primary .ux-textspans') ||
                document.querySelector('.x-price-primary') ||
                document.querySelector('.x-bin-price__content .ux-textspans') ||
                document.querySelector('[itemprop="price"]');
            const price = clean(priceEl ? priceEl.textContent : '');

            // Приблизна ціна у другій валюті (якщо є)
            const approxPriceEl = document.querySelector('.x-price-approx .ux-textspans');
            const approxPrice = clean(approxPriceEl ? approxPriceEl.textContent : '');

            // 3. СТАН ТОВАРУ (CONDITION)
            const conditionEl = 
                document.querySelector('.x-item-condition-text .ux-textspans') ||
                document.querySelector('.x-item-condition-value') ||
                document.querySelector('[data-testid="x-item-condition"]');
            const condition = clean(conditionEl ? conditionEl.textContent : '');

            // 4. НАЯВНІСТЬ / КІЛЬКІСТЬ (AVAILABILITY)
            const qtyEl = 
                document.querySelector('.d-quantity__availability .ux-textspans') ||
                document.querySelector('.d-quantity__availability') ||
                document.querySelector('[data-testid="d-quantity__availability"]');
            const availability = clean(qtyEl ? qtyEl.textContent : '');

            // 5. ДОСТАВКА (SHIPPING)
            const shippingContainer = 
                document.querySelector('.ux-labels-values--shipping') ||
                document.querySelector('[data-testid="ux-labels-values--shipping"]');
            let shipping = '';
            if (shippingContainer) {
                const boldSpans = Array.from(shippingContainer.querySelectorAll('.ux-textspans'))
                    .map(s => clean(s.textContent))
                    .filter(Boolean);
                shipping = boldSpans.join(' ');
            }
            if (!shipping) {
                const altShipping = document.querySelector('.ux-labels-values--shipping .ux-textspans--BOLD');
                shipping = clean(altShipping ? altShipping.textContent : '');
            }

            // 6. ПОВЕРНЕННЯ (RETURNS)
            const returnsEl = 
                document.querySelector('.ux-labels-values--returns .ux-textspans') ||
                document.querySelector('.ux-labels-values--returns');
            const returnsPolicy = clean(returnsEl ? returnsEl.textContent : '');

            // 7. ПРОДАВЕЦЬ (SELLER)
            const sellerNameEl = 
                document.querySelector('.x-sellercard-atf__info__about-seller a span.ux-textspans') ||
                document.querySelector('.x-sellercard-atf__info__about-seller a') ||
                document.querySelector('[data-testid="str-seller-card"] a');
            const sellerName = clean(sellerNameEl ? sellerNameEl.textContent : '');

            const feedbackScoreEl = document.querySelector('.x-sellercard-atf__info__about-seller .ux-textspans--SECONDARY');
            const feedbackScore = clean(feedbackScoreEl ? feedbackScoreEl.textContent : '');

            const positiveFeedbackEl = document.querySelector('.x-sellercard-atf__data-item .ux-textspans');
            const positiveFeedback = clean(positiveFeedbackEl ? positiveFeedbackEl.textContent : '');

            // 8. ХАРАКТЕРИСТИКИ ТОВАРУ (ITEM SPECIFICS)
            // Витягуємо всі пари "Назва характеристики -> Значення"
            const itemSpecifics = {};
            const specificSections = document.querySelectorAll('.ux-layout-section-evo__col, .ux-labels-values--itemSpecifics, [data-testid="ux-layout-section-evo"]');
            
            specificSections.forEach(section => {
                const labels = section.querySelectorAll('.ux-labels-values__labels');
                const values = section.querySelectorAll('.ux-labels-values__values');
                
                labels.forEach((labelEl, idx) => {
                    const labelText = clean(labelEl.textContent).replace(/:$/, '');
                    const valueEl = values[idx];
                    const valueText = clean(valueEl ? valueEl.textContent : '');
                    if (labelText && valueText) {
                        itemSpecifics[labelText] = valueText;
                    }
                });
            });

            // 9. МЕДІА ТА ПОСИЛАННЯ З ГАЛЕРЕЇ ТОВАРУ
            const images = new Set();
            const galleryLinks = new Map();
            const gallerySelector = [
                '.ux-image-filmstrip-carousel',
                '.ux-image-carousel',
                '.ux-image-filmstrip-carousel-item',
                '.ux-image-carousel-item',
                '.x-photos',
                '#vi_main_img_fs',
            ].join(',');
            const galleryRoots = Array.from(document.querySelectorAll(gallerySelector));

            const getMediaType = (url, hint = '') => {
                const value = `${hint} ${url}`.toLowerCase();
                if (/\.(mp4|m4v|mov|webm|avi|mkv|m3u8|mpd)(?:$|[?#])/.test(value) || /\bvideo\b|video\//.test(value)) {
                    return 'video';
                }
                if (/\.(pdf|ppt|pptx|pps|ppsx|odp|key)(?:$|[?#])/.test(value)) {
                    return 'presentation/document';
                }
                if (/\.(jpe?g|png|gif|webp|avif|bmp|svg)(?:$|[?#])/.test(value) || /image\//.test(value)) {
                    return 'image';
                }
                return 'link';
            };

            const addGalleryLink = (rawUrl, hint = '') => {
                if (!rawUrl || rawUrl.startsWith('#') || rawUrl.startsWith('javascript:')) return;
                let url;
                try {
                    url = new URL(rawUrl, document.baseURI).href;
                } catch {
                    return;
                }
                if (!/^https?:/i.test(url)) return;
                if (!galleryLinks.has(url)) {
                    galleryLinks.set(url, { type: getMediaType(url, hint), url });
                } else if (galleryLinks.get(url).type === 'link') {
                    galleryLinks.get(url).type = getMediaType(url, hint);
                }
            };

            const addSrcSet = (srcset, hint = '') => {
                if (!srcset) return;
                srcset.split(',').forEach((candidate) => {
                    const url = candidate.trim().split(/\s+/)[0];
                    addGalleryLink(url, hint);
                });
            };

            galleryRoots.forEach((root) => {
                root.querySelectorAll('a[href]').forEach((link) => addGalleryLink(link.getAttribute('href')));
                root.querySelectorAll('img').forEach((img) => {
                    const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-zoom-src');
                    if (src && !src.includes('s-l64') && !src.includes('icon')) {
                        const highResSrc = src.replace(/s-l\d+\./, 's-l1600.');
                        images.add(highResSrc);
                        addGalleryLink(highResSrc, 'image');
                    }
                    addSrcSet(img.getAttribute('srcset'), 'image');
                });
                root.querySelectorAll('source, video, audio, track, iframe, embed, object, picture').forEach((element) => {
                    const hint = element.getAttribute('type') || element.tagName.toLowerCase();
                    ['src', 'data', 'poster'].forEach((attribute) => {
                        addGalleryLink(element.getAttribute(attribute), hint);
                    });
                    addSrcSet(element.getAttribute('srcset'), hint);
                });
                root.querySelectorAll('[href], [src], [data-src], [data-url], [data-video], [data-file], [data-zoom-src], [poster]').forEach((element) => {
                    ['href', 'src', 'data-src', 'data-url', 'data-video', 'data-file', 'data-zoom-src', 'poster'].forEach((attribute) => {
                        addGalleryLink(element.getAttribute(attribute), `${element.tagName.toLowerCase()} ${attribute}`);
                    });
                });
            });

            // Головне зображення
            const mainImg = 
                document.querySelector('.ux-image-filmstrip-carousel-item img') ||
                document.querySelector('.ux-image-carousel-item img') ||
                document.querySelector('#icImg') ||
                document.querySelector('.x-item-main-image-atf img');
            if (mainImg && mainImg.src) {
                images.add(mainImg.src);
                addGalleryLink(mainImg.src, 'image');
            }

            // Резервний збір зображень для варіантів розмітки без розпізнаного контейнера галереї
            const carouselImgs = document.querySelectorAll('.ux-image-filmstrip-carousel-item img, .ux-image-carousel-item img');
            carouselImgs.forEach(img => {
                const src = img.getAttribute('src') || img.getAttribute('data-src');
                if (src && !src.includes('s-l64') && !src.includes('icon')) {
                    // Збільшуємо роздільну здатність зображення за шаблоном eBay (s-l500 -> s-l1600)
                    const highResSrc = src.replace(/s-l\d+\./, 's-l1600.');
                    images.add(highResSrc);
                }
            });

            // 10. КАТЕГОРІЇ (BREADCRUMBS)
            const breadcrumbs = [];
            const bcElements = document.querySelectorAll('.breadcrumbs ul li a, nav.breadcrumbs a');
            bcElements.forEach(el => {
                const text = clean(el.textContent);
                if (text) breadcrumbs.push(text);
            });

            // 11. ID ТОВАРУ (ITEM ID)
            let itemId = '';
            const match = window.location.href.match(/\/itm\/(\d+)/);
            if (match) itemId = match[1];

            return {
                url: window.location.href,
                itemId,
                title,
                price,
                approxPrice,
                condition,
                availability,
                shipping,
                returnsPolicy,
                seller: {
                    name: sellerName,
                    score: feedbackScore,
                    positivePercent: positiveFeedback,
                },
                breadcrumbs,
                itemSpecifics,
                images: Array.from(images),
                galleryLinks: Array.from(galleryLinks.values()),
            };
        });
    }

    /**
     * Парсинг опису товару від продавця (блок "Item description from the seller").
     * Опис знаходиться всередині iframe#desc_ifr, тому потрібен окремий доступ через Frame API.
     * Перед викликом необхідно прокрутити сторінку до блоку опису, щоб iframe завантажився (loading="lazy").
     * @param {Object} page - Інстанс сторінки Puppeteer
     * @returns {Promise<Object>} Об'єкт з текстом та HTML-вмістом опису
     */
    static async parseDescription(page) {
        try {
            // Прокручуємо до блоку опису, щоб iframe з lazy-loading завантажився
            await page.evaluate(() => {
                const descBlock = document.querySelector('.d-item-description, [data-testid="d-item-description"]');
                if (descBlock) {
                    descBlock.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            });

            // Даємо час на завантаження iframe після скролу
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Знаходимо iframe з описом
            const frameHandle = await page.$('iframe#desc_ifr');
            if (!frameHandle) {
                console.log('⚠️  iframe#desc_ifr не знайдено на сторінці.');
                return { text: '', html: '' };
            }

            const frame = await frameHandle.contentFrame();
            if (!frame) {
                console.log('⚠️  Не вдалося отримати вміст iframe опису.');
                return { text: '', html: '' };
            }

            // Чекаємо завантаження body у iframe
            await frame.waitForSelector('body', { timeout: 10000 }).catch(() => {});

            const description = await frame.evaluate(() => {
                const body = document.body;
                if (!body) return { text: '', html: '' };

                const clean = (str) => {
                    if (!str) return '';
                    return str
                        .replace(/[\u200B-\u200D\uFEFF\u2060-\u206F\u2062]/g, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                };

                /**
                 * Рекурсивно обходить DOM-дерево і конвертує HTML-структуру
                 * у форматований текст зі збереженням переносів рядків.
                 * Блокові теги (p, div, br, h1-h6, li, tr) → \n
                 * Інлайн-теги (span, a, b, i, strong, em) → без переносу
                 */
                function htmlToFormattedText(node) {
                    if (!node) return '';

                    // Текстовий вузол — повертаємо текст як є
                    if (node.nodeType === Node.TEXT_NODE) {
                        return node.textContent.replace(/[\u200B-\u200D\uFEFF]/g, '');
                    }

                    // Пропускаємо приховані елементи, скрипти, стилі
                    if (node.nodeType !== Node.ELEMENT_NODE) return '';
                    const tag = node.tagName;
                    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tag)) return '';

                    // Блокові теги які потребують переносу рядка
                    const blockTags = new Set([
                        'P', 'DIV', 'BR', 'HR',
                        'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
                        'LI', 'TR', 'DT', 'DD',
                        'BLOCKQUOTE', 'PRE', 'SECTION', 'ARTICLE',
                        'HEADER', 'FOOTER', 'FIGCAPTION',
                        'UL', 'OL', 'DL', 'TABLE', 'THEAD', 'TBODY',
                    ]);

                    const isBlock = blockTags.has(tag);
                    let result = '';

                    // BR — просто перенос без обходу дітей
                    if (tag === 'BR') return '\n';

                    // HR — горизонтальний розділювач
                    if (tag === 'HR') return '\n———\n';

                    // Маркер для елементів списку
                    if (tag === 'LI') result += '• ';

                    // Рекурсивно обходимо дочірні вузли
                    for (const child of node.childNodes) {
                        result += htmlToFormattedText(child);
                    }

                    // Додаємо перенос після блокового тега
                    if (isBlock && result.length > 0) {
                        result = '\n' + result.trimEnd() + '\n';
                    }

                    return result;
                }

                // Отримуємо форматований текст
                let formattedText = htmlToFormattedText(body);

                // Нормалізуємо: прибираємо зайві порожні рядки (більше 2 поспіль → 2)
                formattedText = formattedText
                    .replace(/[^\S\n]+/g, ' ')       // пробіли/табуляції (не \n) → один пробіл
                    .replace(/\n{3,}/g, '\n\n')       // 3+ переносів → 2
                    .replace(/^\n+/, '')               // прибрати переноси на початку
                    .replace(/\n+$/, '')               // прибрати переноси в кінці
                    .trim();

                // Витягуємо структуровані дані з опису (таблиці, списки, абзаци)
                const descriptionData = {};

                // Таблиці специфікацій всередині опису
                const tables = body.querySelectorAll('table');
                tables.forEach((table, tIdx) => {
                    const rows = table.querySelectorAll('tr');
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td, th');
                        if (cells.length >= 2) {
                            const key = clean(cells[0].textContent);
                            const value = clean(cells[1].textContent);
                            if (key && value) {
                                descriptionData[key] = value;
                            }
                        }
                    });
                });

                return {
                    text: formattedText,
                    html: body.innerHTML.trim(),
                    structuredData: descriptionData,
                };
            });

            return description;
        } catch (err) {
            console.log('⚠️  Помилка парсингу опису товару:', err.message);
            return { text: '', html: '', structuredData: {} };
        }
    }

    /**
     * Інструмент для відладки алгоритмів: декомпозиція тегів у дереві DOM
     * Розкладає вказаний селектор або контейнер на ієрархічні токени тегів, класів та глибини.
     * @param {Object} page - Puppeteer page
     * @param {string} containerSelector - Селектор блоку для аналізу (напр. 'h1', '.ux-layout-section-evo', '.x-price-primary')
     * @param {number} maxDepth - Максимальна глибина обходу (за замовчуванням 5)
     */
    static async inspectTagHierarchy(page, containerSelector, maxDepth = 5) {
        return await page.evaluate((selector, depthLimit) => {
            const root = document.querySelector(selector);
            if (!root) return { error: `Елемент за селектором "${selector}" не знайдено.` };

            const tokens = [];

            function traverse(node, currentDepth) {
                if (!node || currentDepth > depthLimit) return;
                if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG'].includes(node.tagName)) return;

                const tag = node.tagName ? node.tagName.toLowerCase() : '#text';
                const classes = node.className && typeof node.className === 'string' ? node.className.trim() : '';
                
                // Текст кінцевих вузлів
                const directText = Array.from(node.childNodes)
                    .filter(c => c.nodeType === Node.TEXT_NODE)
                    .map(c => c.textContent.trim())
                    .filter(Boolean)
                    .join(' ');

                tokens.push({
                    depth: currentDepth,
                    tag,
                    classes: classes || null,
                    attributes: {
                        id: node.id || undefined,
                        role: node.getAttribute('role') || undefined,
                        itemprop: node.getAttribute('itemprop') || undefined,
                    },
                    text: directText || null,
                    childrenCount: node.children ? node.children.length : 0,
                });

                if (node.children) {
                    for (const child of Array.from(node.children)) {
                        traverse(child, currentDepth + 1);
                    }
                }
            }

            traverse(root, 0);
            return {
                selector,
                totalNodes: tokens.length,
                tokens,
            };
        }, containerSelector, maxDepth);
    }

    /**
     * Пошук тегів за текстовим шаблоном (наприклад, знайти де знаходиться текст ціни або назви)
     * Допомагає швидко знайти який саме тег містить потрібну інформацію.
     * @param {Object} page - Puppeteer page
     * @param {string} keyword - Слово або фрагмент тексту для пошуку
     */
    static async findTagsByText(page, keyword) {
        return await page.evaluate((textToFind) => {
            const results = [];
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            let node;

            while ((node = walker.nextNode())) {
                const text = node.textContent.trim();
                if (text && text.toLowerCase().includes(textToFind.toLowerCase())) {
                    const parent = node.parentElement;
                    if (parent && !['SCRIPT', 'STYLE'].includes(parent.tagName)) {
                        results.push({
                            tag: parent.tagName.toLowerCase(),
                            className: parent.className || '',
                            id: parent.id || '',
                            matchedText: text.substring(0, 100),
                            path: parent.tagName.toLowerCase() + (parent.className ? '.' + String(parent.className).trim().replace(/\s+/g, '.') : ''),
                        });
                    }
                }
                if (results.length >= 10) break; // обмежуємо до топ 10 результатів
            }

            return results;
        }, keyword);
    }
}