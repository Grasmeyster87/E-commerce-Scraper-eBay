import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer-extra';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { ProductParser } from './productParser.js';
import { DBService } from '../utils/dbService.js';
import { BrowserService } from './browser.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Сервіс для скрапінгу детальних сторінок кожного товару.
 * Зберігає дані в окрему таблицю "${tableName}_goods",
 * а також (за бажанням) зберігає HTML та завантажує медіа-файли в окрему папку з назвою таблиці товарів.
 * Підтримує відновлення перерваного скрапінгу та ведення журналів log_activ_table.txt і log_activ_table.json.
 */
export class ProductScraperService {
    static jobs = {};

    /**
     * Підключення до браузера Chrome. Використовує BrowserService для гарантії відповідного режиму (GUI / Headless).
     */
    static async connectBrowser(options = {}) {
        const headless = !!(options.scrapeWithoutGB || options.scrapeWithGBFP);
        return await BrowserService.ensureBrowser({ headless });
    }

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
                const confirmBtn = allButtons.find((b) => b.textContent.trim() === 'Confirm');
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
                    Referer: 'https://www.ebay.com/',
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
     * Додає запис до текстового журналу log_activ_table.txt
     */
    static appendTxtLog(tableFolder, message) {
        try {
            const txtLogPath = path.join(tableFolder, 'log_activ_table.txt');
            const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
            fs.appendFileSync(txtLogPath, `[${timestamp}] ${message}\n`, 'utf8');
        } catch (err) {
            console.error('⚠️ Помилка запису в log_activ_table.txt:', err.message);
        }
    }

    /**
     * Оновлює стан окремого товару в JSON журналі log_activ_table.json
     */
    static updateItemLog(tableFolder, logData, item) {
        try {
            if (!logData.items) logData.items = {};
            if (item && item.card_id) {
                logData.items[item.card_id] = {
                    ...logData.items[item.card_id],
                    ...item,
                    lastUpdated: new Date().toISOString(),
                };
            }

            let completed = 0;
            let failed = 0;
            for (const it of Object.values(logData.items)) {
                if (it.status === 'completed') completed++;
                else if (it.status === 'error') failed++;
            }

            logData.completedCount = completed;
            logData.failedCount = failed;
            logData.isFullyFinished = logData.totalCards > 0 && logData.completedCount >= logData.totalCards;
            logData.lastUpdated = new Date().toISOString();

            const jsonLogPath = path.join(tableFolder, 'log_activ_table.json');
            fs.writeFileSync(jsonLogPath, JSON.stringify(logData, null, 2), 'utf8');
        } catch (err) {
            console.error('⚠️ Помилка оновлення log_activ_table.json:', err.message);
        }
    }

    /**
     * Перевіряє та ініціалізує папку товарів і файли журналів (log_activ_table.txt та log_activ_table.json).
     * Синхронізує стан з базою даних SQLite (визначає, які товари вже збережено).
     */
    static async ensureTableFolderAndLog(tableFolder, tableName, productTableName, totalCards, dbSettings) {
        let isFolderNewlyCreated = false;
        if (!fs.existsSync(tableFolder)) {
            fs.mkdirSync(tableFolder, { recursive: true });
            isFolderNewlyCreated = true;
        }

        const jsonLogPath = path.join(tableFolder, 'log_activ_table.json');
        const txtLogPath = path.join(tableFolder, 'log_activ_table.txt');

        let logData = null;
        if (fs.existsSync(jsonLogPath)) {
            try {
                const raw = fs.readFileSync(jsonLogPath, 'utf8');
                logData = JSON.parse(raw);
            } catch (err) {
                console.warn('⚠️ Помилка парсингу log_activ_table.json, створюємо оновлений:', err.message);
            }
        }

        if (!logData) {
            logData = {
                tableName,
                productTableName,
                folder: tableFolder,
                status: 'idle',
                totalCards: totalCards,
                completedCount: 0,
                failedCount: 0,
                isFullyFinished: false,
                startedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                items: {},
            };
        } else {
            logData.totalCards = totalCards;
            logData.tableName = tableName;
            logData.productTableName = productTableName;
            logData.folder = tableFolder;
        }

        // Гарантуємо, що таблиця товарів створена в базі даних SQLite
        try {
            await DBService.createProductTable(dbSettings, tableName);
        } catch (tblErr) {
            console.warn('⚠️ Помилка створення таблиці товарів:', tblErr.message);
        }

        // Синхронізація з базою даних: витягуємо список товарів, які вже є в БД
        const completedCardIds = new Set();
        try {
            const existingGoodsList = await DBService.getProductDetailsList(dbSettings, tableName);
            for (const item of existingGoodsList) {
                if (item.card_id) {
                    completedCardIds.add(String(item.card_id));
                    if (!logData.items[item.card_id] || logData.items[item.card_id].status !== 'completed') {
                        logData.items[item.card_id] = {
                            card_id: item.card_id,
                            itemId: item.itemId || '',
                            title: item.title || '',
                            url: item.url || '',
                            status: 'completed',
                            scrapedAt: item.scrapedAt || new Date().toISOString(),
                            htmlSaved: !!item.htmlFilePath,
                            mediaSaved: !!item.mediaFolderPath,
                        };
                    }
                }
            }
        } catch {}

        // Перевіряємо товари, що вже відмічені у logData.items як completed
        for (const [cardId, itemInfo] of Object.entries(logData.items || {})) {
            if (itemInfo.status === 'completed') {
                completedCardIds.add(String(cardId));
            }
        }

        logData.completedCount = completedCardIds.size;
        logData.isFullyFinished = logData.totalCards > 0 && logData.completedCount >= logData.totalCards;
        logData.lastUpdated = new Date().toISOString();

        // Записуємо оновлений JSON лог
        fs.writeFileSync(jsonLogPath, JSON.stringify(logData, null, 2), 'utf8');

        // Якщо текстового журналу немає, створюємо початковий заголовок
        if (!fs.existsSync(txtLogPath)) {
            const header = [
                '======================================================================',
                `ЖУРНАЛ СКРАПІНГУ ТОВАРІВ ДЛЯ ТАБЛИЦІ: ${tableName}`,
                `Таблиця товарів: ${productTableName}`,
                `Папка: ${tableFolder}`,
                `Створено: ${new Date().toISOString().replace('T', ' ').substring(0, 19)}`,
                `Всього карток у таблиці посилань: ${totalCards}`,
                `Вже збережено товарів: ${completedCardIds.size}`,
                `Повний скрапінг завершено: ${logData.isFullyFinished ? 'ТАК' : 'НІ'}`,
                '======================================================================\n',
            ].join('\n');
            fs.writeFileSync(txtLogPath, header, 'utf8');
        }

        return {
            logData,
            completedCardIds,
            isFolderNewlyCreated,
            jsonLogPath,
            txtLogPath,
        };
    }

    /**
     * Отримує статус готовності та прогрес для активної таблиці
     */
    static async checkExistingTableStatus(tableName, dbSettings) {
        if (!tableName) {
            throw new Error('Не вказано назву таблиці');
        }

        const db = await DBService.connect(dbSettings);
        let cards = [];
        try {
            cards = await DBService.all(db, `SELECT * FROM ${tableName}`);
        } catch (err) {
            db.close();
            throw new Error(`Таблицю "${tableName}" не знайдено або не вдалося прочитати: ${err.message}`);
        }
        db.close();

        const productTableName = `${tableName}_goods`;
        const dbPath = DBService.getDbPath(dbSettings);
        const dbDir = path.dirname(dbPath);
        const tableFolder = path.join(dbDir, productTableName);
        const folderExists = fs.existsSync(tableFolder);

        const { logData, completedCardIds } = await this.ensureTableFolderAndLog(
            tableFolder,
            tableName,
            productTableName,
            cards.length,
            dbSettings
        );

        const totalCards = cards.length;
        const completedCount = completedCardIds.size;
        const pendingCount = Math.max(0, totalCards - completedCount);
        const isFullyFinished = totalCards > 0 && completedCount >= totalCards;

        let recentLogs = [];
        const txtLogPath = path.join(tableFolder, 'log_activ_table.txt');
        if (fs.existsSync(txtLogPath)) {
            try {
                const lines = fs.readFileSync(txtLogPath, 'utf8').split('\n').filter(Boolean);
                recentLogs = lines.slice(-25);
            } catch {}
        }

        return {
            tableName,
            productTableName,
            folderPath: tableFolder,
            folderExists,
            totalCards,
            completedCount,
            pendingCount,
            isFullyFinished,
            status: logData.status || (isFullyFinished ? 'completed' : 'idle'),
            logJson: logData,
            recentLogs,
        };
    }

    /**
     * Запуск фонового завдання скрапінгу товарів для існуючої таблиці з підтримкою SSE-стрімінгу.
     */
    static async runExistingTableJob(jobId, tableName, dbSettings, options = {}) {
        const job = this.jobs[jobId];
        if (!job) return;

        const sendEvent = (data) => {
            if (job.res) {
                job.res.write(`data: ${JSON.stringify(data)}\n\n`);
            }
        };

        const {
            saveProductHtml = false,
            saveProductMedia = false,
            pageDelays = [1500],
        } = options;

        try {
            const db = await DBService.connect(dbSettings);
            let cards = [];
            try {
                cards = await DBService.all(db, `SELECT * FROM ${tableName}`);
            } finally {
                db.close();
            }

            if (!cards || cards.length === 0) {
                job.status = 'error';
                sendEvent({ type: 'error', message: 'У таблиці немає карток або посилань для скрапінгу.' });
                return;
            }

            const productTableName = await DBService.createProductTable(dbSettings, tableName);
            const dbPath = DBService.getDbPath(dbSettings);
            const dbDir = path.dirname(dbPath);
            const tableFolder = path.join(dbDir, productTableName);

            const { logData, completedCardIds, isFolderNewlyCreated } = await this.ensureTableFolderAndLog(
                tableFolder,
                tableName,
                productTableName,
                cards.length,
                dbSettings
            );

            logData.status = 'running';
            this.appendTxtLog(
                tableFolder,
                `>>> ЗАПУСК СЕСІЇ СКРАПІНГУ ІСНУЮЧОЇ ТАБЛИЦІ [Завдання ${jobId}] | HTML: ${saveProductHtml} | Media: ${saveProductMedia}`
            );

            // Знаходимо картки, які ще не були успішно скраплені
            const pendingCards = cards.filter((c) => !completedCardIds.has(String(c.id)));

            sendEvent({
                type: 'init',
                tableName,
                productTableName,
                tableFolder,
                folderExists: !isFolderNewlyCreated,
                totalCards: cards.length,
                completedCount: completedCardIds.size,
                pendingCount: pendingCards.length,
                isFullyFinished: cards.length > 0 && completedCardIds.size >= cards.length,
            });

            // Якщо всі картки вже скраплені
            if (pendingCards.length === 0) {
                logData.status = 'completed';
                logData.isFullyFinished = true;
                this.updateItemLog(tableFolder, logData, {});
                this.appendTxtLog(tableFolder, `[ЗАВЕРШЕНО] Всі ${cards.length} товарів уже успішно скраплені раніше.`);

                sendEvent({
                    type: 'finish',
                    totalCards: cards.length,
                    completedCount: cards.length,
                    failedCount: 0,
                    isFullyFinished: true,
                    cancelled: false,
                    message: 'Всі товари вже скраплені.',
                });
                return;
            }

            // Підключення до браузера (автоматично запускає Chrome при необхідності)
            let browser = null;
            try {
                browser = await this.connectBrowser(options);
            } catch (browserErr) {
                job.status = 'error';
                logData.status = 'error';
                this.appendTxtLog(tableFolder, `[ПОМИЛКА БРАУЗЕРА] ${browserErr.message}`);
                sendEvent({ type: 'error', message: `Помилка підключення до Chrome: ${browserErr.message}` });
                return;
            }

            job.status = 'running';

            for (let i = 0; i < pendingCards.length; i++) {
                if (job.isCancelled) {
                    this.appendTxtLog(tableFolder, `[СКАСОВАНО] Скрапінг зупинено користувачем.`);
                    logData.status = 'cancelled';
                    break;
                }

                while (job.isPaused) {
                    await delay(500);
                    if (job.isCancelled) break;
                }

                if (job.isCancelled) break;

                const card = pendingCards[i];
                const currentIndex = completedCardIds.size + 1;

                if (!card.url || !card.url.includes('/itm/')) {
                    this.appendTxtLog(
                        tableFolder,
                        `[ПРОПУСК] [${currentIndex}/${cards.length}] Картка ${card.id} не має валідного /itm/ посилання: ${card.url || 'порожньо'}`
                    );
                    this.updateItemLog(tableFolder, logData, {
                        card_id: card.id,
                        url: card.url,
                        status: 'skipped',
                        error: 'Недійсне посилання на товар',
                    });
                    sendEvent({
                        type: 'progress',
                        current: currentIndex,
                        total: cards.length,
                        card_id: card.id,
                        url: card.url,
                        status: 'skipped',
                        message: 'Пропущено (немає /itm/)',
                    });
                    continue;
                }

                sendEvent({
                    type: 'item_start',
                    current: currentIndex,
                    total: cards.length,
                    card_id: card.id,
                    url: card.url,
                });

                let productPage = null;
                try {
                    productPage = await browser.newPage();
                    await productPage.goto(card.url, {
                        waitUntil: 'domcontentloaded',
                        timeout: 60000,
                    });

                    await delay(2000);

                    // Обробка форми доставки
                    const prefsHandled = await this.handleShippingPreferences(productPage);
                    if (prefsHandled) {
                        const currentUrl = productPage.url();
                        if (!currentUrl.includes('/itm/')) {
                            await productPage.goto(card.url, {
                                waitUntil: 'domcontentloaded',
                                timeout: 60000,
                            });
                            await delay(2000);
                        }
                    }

                    // Лінивий скрол для підвантаження медіа
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

                    // 1. Парсинг товару
                    const productData = await ProductParser.parseProduct(productPage);
                    // 2. Парсинг опису
                    const descriptionData = await ProductParser.parseDescription(productPage);

                    // 3. Збереження HTML та медіа
                    let htmlFilePath = null;
                    let mediaFolderPath = null;
                    let mediaCount = 0;

                    if (saveProductHtml || saveProductMedia) {
                        const rawTitle = productData.title || card.id || `item_${productData.itemId}`;
                        const safeTitle =
                            rawTitle
                                .replace(/[\\/:*?"<>|\r\n\t]+/g, '_')
                                .replace(/\s+/g, ' ')
                                .trim()
                                .substring(0, 80) || card.id;

                        const productFolder = path.join(tableFolder, safeTitle);
                        if (!fs.existsSync(productFolder)) {
                            fs.mkdirSync(productFolder, { recursive: true });
                        }

                        if (saveProductHtml) {
                            const htmlContent = await productPage.content();
                            htmlFilePath = path.join(productFolder, 'product.html');
                            fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
                        }

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
                                    if (
                                        item &&
                                        item.url &&
                                        ['image', 'video', 'presentation/document'].includes(item.type)
                                    ) {
                                        mediaUrls.add(item.url);
                                    }
                                });
                            }

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
                                    if (ok) mediaCount++;
                                    idx++;
                                } catch {}
                            }
                        }
                    }

                    // 4. Збереження в SQLite
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

                    completedCardIds.add(String(card.id));

                    // 5. Оновлення журналів
                    this.updateItemLog(tableFolder, logData, {
                        card_id: card.id,
                        itemId: productData.itemId,
                        title: productData.title,
                        url: card.url,
                        status: 'completed',
                        scrapedAt: new Date().toISOString(),
                        htmlSaved: !!htmlFilePath,
                        mediaCount,
                    });

                    this.appendTxtLog(
                        tableFolder,
                        `[УСПІХ] [${completedCardIds.size}/${cards.length}] ID: ${card.id} | ${productData.title || 'Без назви'} | URL: ${card.url}`
                    );

                    sendEvent({
                        type: 'progress',
                        current: completedCardIds.size,
                        total: cards.length,
                        card_id: card.id,
                        title: productData.title,
                        url: card.url,
                        status: 'completed',
                    });
                } catch (itemErr) {
                    console.error(`❌ Помилка скрапінгу товару ${card.url}:`, itemErr.message);

                    this.updateItemLog(tableFolder, logData, {
                        card_id: card.id,
                        url: card.url,
                        status: 'error',
                        error: itemErr.message,
                        scrapedAt: new Date().toISOString(),
                    });

                    this.appendTxtLog(
                        tableFolder,
                        `[ПОМИЛКА] [${currentIndex}/${cards.length}] ID: ${card.id} | URL: ${card.url} | ${itemErr.message}`
                    );

                    sendEvent({
                        type: 'progress',
                        current: completedCardIds.size,
                        total: cards.length,
                        card_id: card.id,
                        url: card.url,
                        status: 'error',
                        error: itemErr.message,
                    });
                } finally {
                    if (productPage) {
                        await productPage.close().catch(() => {});
                    }
                }

                // Затримка між товарами
                const delayMs = Array.isArray(pageDelays) && pageDelays.length > 0 ? pageDelays[0] : 1500;
                await delay(delayMs);
            }

            if (browser) {
                await browser.disconnect().catch(() => {});
            }

            logData.isFullyFinished = cards.length > 0 && completedCardIds.size >= cards.length;
            logData.status = job.isCancelled
                ? 'cancelled'
                : logData.isFullyFinished
                  ? 'completed'
                  : 'interrupted';
            this.updateItemLog(tableFolder, logData, {});

            const finishMsg = job.isCancelled
                ? `[СКАСОВАНО] Завдання зупинено користувачем. Збережено: ${completedCardIds.size}/${cards.length}.`
                : `[СЕСІЯ ЗАВЕРШЕНА] Опрацьовано: ${completedCardIds.size}/${cards.length}. Повний скрапінг: ${logData.isFullyFinished ? 'ТАК' : 'НІ'}`;
            this.appendTxtLog(tableFolder, finishMsg);

            sendEvent({
                type: 'finish',
                totalCards: cards.length,
                completedCount: completedCardIds.size,
                failedCount: logData.failedCount,
                isFullyFinished: logData.isFullyFinished,
                cancelled: job.isCancelled,
                message: finishMsg,
            });
        } catch (err) {
            console.error('❌ Критична помилка у runExistingTableJob:', err);
            job.status = 'error';
            sendEvent({ type: 'error', message: err.message });
        }
    }

    /**
     * Головний метод: скрапінг детальної інформації для списку карток товарів
     * Використовується при звичайному пошуку з автоматичним скрапінгом сторінок.
     * @param {Array<Object>} cards - Масив оброблених карток з пошуку (містить id, url тощо)
     * @param {string} tableName - Назва активної таблиці пошуку
     * @param {Object} dbSettings - Налаштування бази даних
     * @param {Object} options - Опції збереження (saveProductHtml, saveProductMedia, pageDelays)
     */
    static async scrapeProductsForCards(cards, tableName, dbSettings, options = {}) {
        const { saveProductHtml = false, saveProductMedia = false, pageDelays = [1500] } = options;

        if (!cards || cards.length === 0) return;

        // Створюємо окрему таблицю для товарів: "${tableName}_goods"
        const productTableName = await DBService.createProductTable(dbSettings, tableName);

        // Визначаємо шлях для збереження файлів: створюємо папку з назвою таблиці товарів
        const dbPath = DBService.getDbPath(dbSettings);
        const dbDir = path.dirname(dbPath);
        const tableFolder = path.join(dbDir, productTableName);

        // Ініціалізуємо або оновлюємо журнали та перевіряємо існуючі товари
        const { logData, completedCardIds } = await this.ensureTableFolderAndLog(
            tableFolder,
            tableName,
            productTableName,
            cards.length,
            dbSettings
        );

        console.log(`\n======================================================================`);
        console.log(`🛍️ ЗАПУСК СКРАПІНГУ СТОРІНОК ТОВАРІВ (Всього: ${cards.length})`);
        console.log(`🗄️ Таблиця товарів: "${productTableName}"`);
        console.log(`📁 Директорія таблиці товарів: "${tableFolder}"`);
        console.log(`💾 Збереження HTML: ${saveProductHtml ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}`);
        console.log(`🖼️ Збереження фото/медіа: ${saveProductMedia ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}`);
        console.log(`🔎 Вже збережено раніше: ${completedCardIds.size} / ${cards.length}`);
        console.log(`======================================================================\n`);

        this.appendTxtLog(
            tableFolder,
            `>>> ЗАПУСК СЕСІЇ СКРАПІНГУ ПІД ЧАС ПОШУКУ (Всього: ${cards.length}, збережено раніше: ${completedCardIds.size})`
        );

        let browser = null;
        try {
            browser = await this.connectBrowser(options);
        } catch (e) {
            console.error('❌ Не вдалося підключитися до Chrome на порт 9222 для скрапінгу товарів:', e.message);
            this.appendTxtLog(tableFolder, `[ПОМИЛКА БРАУЗЕРА] ${e.message}`);
            return;
        }

        try {
            let processedInThisRun = 0;

            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];

                if (!card.url || !card.url.includes('/itm/')) {
                    console.log(`⏩ [${i + 1}/${cards.length}] Пропуск картки ${card.id} (немає валідного посилання на товар eBay)`);
                    this.updateItemLog(tableFolder, logData, {
                        card_id: card.id,
                        url: card.url,
                        status: 'skipped',
                        error: 'Недійсне посилання на товар',
                    });
                    continue;
                }

                // Перевіряємо, чи вже був цей товар завантажений раніше
                if (completedCardIds.has(String(card.id))) {
                    console.log(`⏩ [${i + 1}/${cards.length}] Пропуск картки ${card.id} (вже успішно збережено в базі та папці)`);
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
                    let mediaCount = 0;

                    if (saveProductHtml || saveProductMedia) {
                        const rawTitle = productData.title || card.id || `item_${productData.itemId}`;
                        const safeTitle =
                            rawTitle
                                .replace(/[\\/:*?"<>|\r\n\t]+/g, '_')
                                .replace(/\s+/g, ' ')
                                .trim()
                                .substring(0, 80) || card.id;

                        const productFolder = path.join(tableFolder, safeTitle);
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
                                    if (
                                        item &&
                                        item.url &&
                                        ['image', 'video', 'presentation/document'].includes(item.type)
                                    ) {
                                        mediaUrls.add(item.url);
                                    }
                                });
                            }

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
                                    if (ok) mediaCount++;
                                    idx++;
                                } catch {}
                            }
                            console.log(`🖼️ Завантажено ${mediaCount}/${mediaUrls.size} медіа-файлів у: ${mediaDir}`);
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

                    completedCardIds.add(String(card.id));
                    processedInThisRun++;

                    // 5. Оновлення журналів
                    this.updateItemLog(tableFolder, logData, {
                        card_id: card.id,
                        itemId: productData.itemId,
                        title: productData.title,
                        url: card.url,
                        status: 'completed',
                        scrapedAt: new Date().toISOString(),
                        htmlSaved: !!htmlFilePath,
                        mediaCount,
                    });

                    this.appendTxtLog(
                        tableFolder,
                        `[УСПІХ] [${completedCardIds.size}/${cards.length}] ID: ${card.id} | ${productData.title || 'Без назви'} | URL: ${card.url}`
                    );

                    console.log(`✅ Збережено товар у таблицю "${productTableName}": "${productData.title || card.id}"`);
                } catch (productErr) {
                    console.error(`❌ Помилка під час скрапінгу товару ${card.url}:`, productErr.message);

                    this.updateItemLog(tableFolder, logData, {
                        card_id: card.id,
                        url: card.url,
                        status: 'error',
                        error: productErr.message,
                        scrapedAt: new Date().toISOString(),
                    });

                    this.appendTxtLog(
                        tableFolder,
                        `[ПОМИЛКА] ID: ${card.id} | URL: ${card.url} | ${productErr.message}`
                    );
                } finally {
                    if (productPage) {
                        await productPage.close().catch(() => {});
                    }
                }

                // Невелика затримка між товарами
                const delayMs = Array.isArray(pageDelays) && pageDelays.length > 0 ? pageDelays[0] : 1200;
                await delay(delayMs);
            }

            logData.isFullyFinished = cards.length > 0 && completedCardIds.size >= cards.length;
            logData.status = logData.isFullyFinished ? 'completed' : 'interrupted';
            this.updateItemLog(tableFolder, logData, {});

            const finishSummary = `🎉 Скрапінг сторінок товарів завершено! Успішно збережено в цій сесії: ${processedInThisRun}, всього: ${completedCardIds.size}/${cards.length} товарів у "${productTableName}". Повний скрапінг: ${logData.isFullyFinished ? 'ТАК' : 'НІ'}.\n`;
            console.log(finishSummary);
            this.appendTxtLog(tableFolder, finishSummary);
        } finally {
            if (browser) {
                await browser.disconnect().catch(() => {});
            }
        }
    }
}
