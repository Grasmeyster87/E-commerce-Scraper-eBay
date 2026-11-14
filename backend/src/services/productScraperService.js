import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer-extra';
import { ProductParser } from './productParser.js';
import { DBService } from '../utils/dbService.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Сервіс для скрапінгу детальних сторінок кожного товару.
 * Зберігає дані в окрему таблицю "${tableName}_товари",
 * а також (за бажанням) зберігає HTML та завантажує медіа-файли в окрему папку.
 */
export class ProductScraperService {
    /**
     * Обробляє модальне вікно вибору країни доставки та поштового індексу.
     * @param {Object} page - Інстанс сторінки Puppeteer
     * @param {string} countryCode - Код країни (за замовчуванням 'UA')
     * @param {string} postalCode - Поштовий індекс (за замовчуванням '39600')
     */
    static async handleShippingPreferences(page, countryCode = 'UA', postalCode = '39600') {
        try {
            const countrySelect = await page.$('select#country');
            if (!countrySelect) {
                return false;
            }

            console.log(`🌍 Виявлено форму вибору країни доставки. Встановлюємо: ${countryCode}, індекс: ${postalCode}`);

            await page.select('select#country', countryCode);
            await delay(800);

            const postalInput = await page.$('input#postalCode');
            if (postalInput) {
                await postalInput.click({ clickCount: 3 });
                await delay(200);
                await postalInput.type(postalCode, { delay: 50 });
            }
            await delay(500);

            const clicked = await page.evaluate(() => {
                const btn =
                    document.querySelector('button.submit-button') ||
                    document.querySelector('button.btn--primary[type="submit"]') ||
                    document.querySelector('button[type="submit"]');
                if (btn) {
                    btn.scrollIntoView({ block: 'center' });
                    btn.click();
                    return true;
                }
                const allButtons = Array.from(document.querySelectorAll('button'));
                const confirmBtn = allButtons.find(b => b.textContent.trim() === 'Confirm');
                if (confirmBtn) {
                    confirmBtn.scrollIntoView({ block: 'center' });
                    confirmBtn.click();
                    return true;
                }
                return false;
            });

            if (!clicked) {
                await page.evaluate(() => {
                    const form = document.querySelector('form[action*="buyer-preferences"], form[action*="shipping-address"]');
                    if (form) form.submit();
                });
            }

            await delay(3000);
            return true;
        } catch (err) {
            console.log('⚠️ Помилка при обробці форми доставки:', err.message);
            return false;
        }
    }

    /**
     * Завантажує окремий медіа-файл (зображення, відео, документ) на диск.
     * @param {string} fileUrl - Пряме посилання на файл
     * @param {string} destPath - Цільовий шлях збереження файлу
     * @param {number} timeout - Таймаут запиту в мілісекундах
     * @returns {Promise<boolean>}
     */
    static async downloadMediaFile(fileUrl, destPath, timeout = 25000) {
        if (!fileUrl || !fileUrl.startsWith('http')) return false;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const res = await fetch(fileUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://www.ebay.com/',
                },
            });
            clearTimeout(timeoutId);

            if (!res.ok) return false;
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            fs.writeFileSync(destPath, buffer);
            return true;
        } catch {
            clearTimeout(timeoutId);
            return false;
        }
    }

    /**
     * Головний метод: скрапінг детальної інформації для списку карток товарів
     * @param {Array<Object>} cards - Масив оброблених карток з пошуку (містить id, url тощо)
     * @param {string} tableName - Назва активної таблиці пошуку
     * @param {Object} dbSettings - Налаштування бази даних
     * @param {Object} options - Опції збереження (saveProductHtml, saveProductMedia, pageDelays)
     */
    static async scrapeProductsForCards(cards, tableName, dbSettings, options = {}) {
        const { saveProductHtml = false, saveProductMedia = false } = options;

        if (!cards || cards.length === 0) return;

        // Створюємо окрему таблицю для товарів: "${tableName}_товари"
        const productTableName = await DBService.createProductTable(dbSettings, tableName);

        // Визначаємо шлях до папки бази даних
        const dbPath = DBService.getDbPath(dbSettings);
        const dbDir = path.dirname(dbPath);
        const dbName = path.basename(dbPath, path.extname(dbPath));

        console.log(`\n======================================================================`);
        console.log(`🛍️ ЗАПУСК СКРАПІНГУ СТОРІНОК ТОВАРІВ (Всього: ${cards.length})`);
        console.log(`🗄️ Таблиця товарів: "${productTableName}"`);
        console.log(`📁 Директорія БД: "${path.join(dbDir, dbName)}"`);
        console.log(`💾 Збереження HTML: ${saveProductHtml ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}`);
        console.log(`🖼️ Збереження фото/медіа: ${saveProductMedia ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}`);
        console.log(`======================================================================\n`);

        let browser = null;
        try {
            browser = await puppeteer.connect({
                browserURL: 'http://127.0.0.1:9222',
                defaultViewport: null,
            });
        } catch (e) {
            console.error('❌ Не вдалося підключитися до Chrome на порт 9222 для скрапінгу товарів:', e.message);
            return;
        }

        try {
            let processedCount = 0;

            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];

                if (!card.url || !card.url.includes('/itm/')) {
                    console.log(`⏩ [${i + 1}/${cards.length}] Пропуск картки ${card.id} (немає валідного посилання на товар eBay)`);
                    continue;
                }

                console.log(`\n📦 [${i + 1}/${cards.length}] Скрапінг товару: ${card.url}`);
                let productPage = null;

                try {
                    // Відкриваємо товар в окремій вкладці, не порушуючи сторінку пошуку
                    productPage = await browser.newPage();
                    await productPage.goto(card.url, {
                        waitUntil: 'domcontentloaded',
                        timeout: 60000,
                    });

                    await delay(2000);

                    // Перевіряємо та підтверджуємо країну/індекс доставки
                    const prefsHandled = await this.handleShippingPreferences(productPage);
                    if (prefsHandled) {
                        const currentUrl = productPage.url();
                        if (!currentUrl.includes('/itm/')) {
                            console.log('🔁 Повертаємось на сторінку товару після налаштування доставки...');
                            await productPage.goto(card.url, {
                                waitUntil: 'domcontentloaded',
                                timeout: 60000,
                            });
                            await delay(2000);
                        }
                    }

                    // Плавний скрол для підвантаження лінивих блоків та зображень
                    await productPage.evaluate(async () => {
                        await new Promise((resolve) => {
                            let totalHeight = 0;
                            const distance = 400;
                            const timer = setInterval(() => {
                                window.scrollBy(0, distance);
                                totalHeight += distance;
                                if (totalHeight >= 1600) {
                                    clearInterval(timer);
                                    window.scrollTo(0, 0);
                                    resolve();
                                }
                            }, 150);
                        });
                    });
                    await delay(1000);

                    // 1. Парсинг основних даних товару
                    const productData = await ProductParser.parseProduct(productPage);

                    // 2. Парсинг опису товару з iframe
                    const descriptionData = await ProductParser.parseDescription(productPage);

                    // 3. Збереження HTML та медіа у підпапку з назвою товару
                    let htmlFilePath = null;
                    let mediaFolderPath = null;

                    if (saveProductHtml || saveProductMedia) {
                        const rawTitle = productData.title || card.id || `item_${productData.itemId}`;
                        // Очищення назви від неприпустимих символів для файлової системи
                        const safeTitle = rawTitle
                            .replace(/[\\/:*?"<>|\r\n\t]+/g, '_')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .substring(0, 80) || card.id;

                        // Шлях: <папка бази данних>/<назва товару>
                        const productFolder = path.join(dbDir, dbName, safeTitle);
                        if (!fs.existsSync(productFolder)) {
                            fs.mkdirSync(productFolder, { recursive: true });
                        }

                        // Збереження HTML
                        if (saveProductHtml) {
                            const htmlContent = await productPage.content();
                            htmlFilePath = path.join(productFolder, 'product.html');
                            fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
                            console.log(`💾 HTML збережено: ${htmlFilePath}`);
                        }

                        // Збереження фото, відео, презентацій
                        if (saveProductMedia) {
                            const mediaDir = path.join(productFolder, 'media');
                            if (!fs.existsSync(mediaDir)) {
                                fs.mkdirSync(mediaDir, { recursive: true });
                            }
                            mediaFolderPath = mediaDir;

                            const mediaUrls = new Set();
                            if (Array.isArray(productData.images)) {
                                productData.images.forEach((u) => {
                                    if (u) mediaUrls.add(u);
                                });
                            }
                            if (Array.isArray(productData.galleryLinks)) {
                                productData.galleryLinks.forEach((item) => {
                                    if (item && item.url && ['image', 'video', 'presentation/document'].includes(item.type)) {
                                        mediaUrls.add(item.url);
                                    }
                                });
                            }

                            let downloadedCount = 0;
                            let idx = 1;
                            for (const mediaUrl of mediaUrls) {
                                try {
                                    let ext = '.jpg';
                                    try {
                                        const pathname = new URL(mediaUrl).pathname;
                                        const matchExt = pathname.match(/\.([a-zA-Z0-9]{3,5})$/);
                                        if (matchExt) ext = `.${matchExt[1]}`;
                                    } catch {}

                                    const filename = `media_${String(idx).padStart(2, '0')}${ext}`;
                                    const destPath = path.join(mediaDir, filename);
                                    const ok = await this.downloadMediaFile(mediaUrl, destPath);
                                    if (ok) downloadedCount++;
                                    idx++;
                                } catch (downloadErr) {
                                    // Ігноруємо помилки окремого медіа
                                }
                            }
                            console.log(`🖼️ Завантажено ${downloadedCount}/${mediaUrls.size} медіа-файлів у: ${mediaDir}`);
                        }
                    }

                    // 4. Збереження структурованих даних товару в БД
                    await DBService.insertProductDetails(dbSettings, tableName, {
                        card_id: card.id,
                        itemId: productData.itemId,
                        title: productData.title,
                        price: productData.price,
                        approxPrice: productData.approxPrice,
                        condition: productData.condition,
                        availability: productData.availability,
                        shipping: productData.shipping,
                        returnsPolicy: productData.returnsPolicy,
                        seller: productData.seller,
                        breadcrumbs: productData.breadcrumbs,
                        itemSpecifics: productData.itemSpecifics,
                        images: productData.images,
                        galleryLinks: productData.galleryLinks,
                        descriptionText: descriptionData.text,
                        descriptionHtml: descriptionData.html,
                        descriptionStructured: descriptionData.structuredData,
                        htmlFilePath,
                        mediaFolderPath,
                        url: card.url,
                        scrapedAt: new Date().toISOString(),
                    });

                    processedCount++;
                    console.log(`✅ Збережено товар у таблицю "${productTableName}": "${productData.title || card.id}"`);

                } catch (productErr) {
                    console.error(`❌ Помилка під час скрапінгу товару ${card.url}:`, productErr.message);
                } finally {
                    if (productPage) {
                        await productPage.close().catch(() => {});
                    }
                }

                // Невелика затримка між товарами
                await delay(1200);
            }

            console.log(`\n🎉 Скрапінг сторінок товарів завершено! Успішно збережено: ${processedCount}/${cards.length} товарів у "${productTableName}".\n`);
        } finally {
            if (browser) {
                await browser.disconnect().catch(() => {});
            }
        }
    }
}
