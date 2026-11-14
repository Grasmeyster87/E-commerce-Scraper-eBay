import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Підключаємо Stealth плагін для обходу базових антибот-систем
puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Клас скрапера для сторінки конкретного товару eBay.
 * Працює через підключення до відладочного порту Chrome (9222) з локальним профілем.
 */
export class ProductScraper {
    constructor(options = {}) {
        this.port = options.port || 9222;
        this.browserURL = `http://127.0.0.1:${this.port}`;
        this.profileDir = path.join(__dirname, 'browser_profile');
        this.debugDir = path.join(__dirname, 'debug');
        this.scriptPath = path.join(__dirname, 'launch_chrome.bat');
        this.browser = null;
        this.page = null;
    }

    /**
     * Перевіряє чи запущено Chrome на порту 9222 і якщо ні — запускає його автоматично
     */
    async ensureBrowser() {
        console.log(`🔍 Перевірка активної сесії Chrome на ${this.browserURL}...`);
        
        this.browser = await puppeteer
            .connect({
                browserURL: this.browserURL,
                defaultViewport: null,
            })
            .catch(() => null);

        if (!this.browser) {
            console.log(`🌐 Chrome не знайдено на порту ${this.port}. Запускаємо новий процес з профілем...`);
            
            // Якщо є bat-файл у папці проекту — запускаємо його
            if (fs.existsSync(this.scriptPath)) {
                exec(`"${this.scriptPath}"`, (err) => {
                    if (err) console.error('❌ Помилка виклику launch_chrome.bat:', err.message);
                });
            } else {
                // Прямий виклик Chrome якщо bat-файлу немає
                const chromeCmd = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=${this.port} --user-data-dir="${this.profileDir}" --no-first-run --no-default-browser-check --disable-sync --start-maximized --disable-gpu`;
                exec(chromeCmd, (err) => {
                    if (err) console.error('❌ Помилка запуску Chrome:', err.message);
                });
            }

            // Очікування доступності порту (до 15 спроб по 1 секунді)
            for (let attempt = 1; attempt <= 15; attempt++) {
                try {
                    await delay(1000);
                    this.browser = await puppeteer.connect({
                        browserURL: this.browserURL,
                        defaultViewport: null,
                    });
                    console.log('✅ Успішно підключено до Chrome!');
                    break;
                } catch (e) {
                    if (attempt === 15) {
                        throw new Error(`Не вдалося підключитися до Chrome на ${this.browserURL} після 15 секунд очікування.`);
                    }
                }
            }
        } else {
            console.log('✅ Знайдено вже запущений Chrome з сесією відладки.');
        }

        const pages = await this.browser.pages();
        this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();
        return { browser: this.browser, page: this.page };
    }

    /**
     * Обробляє модальне вікно вибору країни доставки та поштового індексу.
     * Вікно з'являється коли папка browser_profile очищена (новий профіль).
     * Вибирає Україну (UA) та вводить поштовий індекс 39600, натискає "Confirm".
     * @param {Object} page - Інстанс сторінки Puppeteer
     * @param {string} countryCode - Код країни (за замовчуванням 'UA')
     * @param {string} postalCode - Поштовий індекс (за замовчуванням '39600')
     */
    async handleShippingPreferences(page, countryCode = 'UA', postalCode = '39600') {
        try {
            // Перевіряємо наявність форми вибору країни (select#country)
            const countrySelect = await page.$('select#country');
            if (!countrySelect) {
                console.log('ℹ️  Форма вибору країни доставки не виявлена — профіль вже налаштований.');
                return false;
            }

            console.log(`🌍 Виявлено форму вибору країни доставки. Встановлюємо: ${countryCode}, індекс: ${postalCode}`);

            // Вибираємо країну зі списку
            await page.select('select#country', countryCode);
            await delay(800);

            // Очищаємо поле індексу та вводимо новий
            const postalInput = await page.$('input#postalCode');
            if (postalInput) {
                await postalInput.click({ clickCount: 3 }); // виділяємо весь текст
                await delay(200);
                await postalInput.type(postalCode, { delay: 50 });
            }
            await delay(500);

            // Натискаємо кнопку "Confirm" — кілька стратегій для надійності
            console.log('🔘 Шукаємо та натискаємо кнопку "Confirm"...');

            // Стратегія 1: Клік через page.evaluate (прямий DOM-клік, найнадійніший)
            const clicked = await page.evaluate(() => {
                // Шукаємо кнопку за кількома ознаками
                const btn =
                    document.querySelector('button.submit-button') ||
                    document.querySelector('button.btn--primary[type="submit"]') ||
                    document.querySelector('button[type="submit"]');
                if (btn) {
                    btn.scrollIntoView({ block: 'center' });
                    btn.click();
                    return true;
                }
                // Фоллбек: шукаємо за текстом "Confirm"
                const allButtons = Array.from(document.querySelectorAll('button'));
                const confirmBtn = allButtons.find(b => b.textContent.trim() === 'Confirm');
                if (confirmBtn) {
                    confirmBtn.scrollIntoView({ block: 'center' });
                    confirmBtn.click();
                    return true;
                }
                return false;
            });

            if (clicked) {
                console.log('✅ Натиснуто кнопку "Confirm" — налаштування доставки збережено.');
            } else {
                // Стратегія 2: Сабміт форми напряму якщо кнопка не спрацювала
                console.log('⚠️  Кнопку не знайдено, пробуємо сабміт форми напряму...');
                const submitted = await page.evaluate(() => {
                    const form = document.querySelector('form[action*="buyer-preferences"], form[action*="shipping-address"]');
                    if (form) {
                        form.submit();
                        return true;
                    }
                    return false;
                });
                if (submitted) {
                    console.log('✅ Форму відправлено через form.submit().');
                } else {
                    console.log('⚠️  Не вдалося ні натиснути кнопку, ні відправити форму.');
                }
            }

            // Чекаємо навігацію після підтвердження
            await delay(3000);

            return true;
        } catch (err) {
            console.log('⚠️  Помилка при обробці форми доставки:', err.message);
            return false;
        }
    }

    /**
     * Відкриває сторінку товару за вказаним URL
     * @param {string} url - Посилання на сторінку товару eBay
     * @param {Object} options - Налаштування завантаження (saveHtml, scroll)
     */
    async openProductPage(url, options = { saveHtml: true, scroll: true }) {
        await this.ensureBrowser();

        console.log(`🔗 Перехід на сторінку товару: ${url}`);
        await this.page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });

        // Чекаємо базового монтування контенту
        await delay(2500);

        // Обробка вікна вибору країни доставки (з'являється при чистому профілі)
        const prefsHandled = await this.handleShippingPreferences(this.page);
        if (prefsHandled) {
            // Якщо форма була оброблена, потрібно повторно перейти на сторінку товару,
            // бо після Confirm eBay може перенаправити на іншу сторінку
            const currentUrl = this.page.url();
            if (!currentUrl.includes('/itm/')) {
                console.log('🔁 Повертаємось на сторінку товару після налаштування доставки...');
                await this.page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000,
                });
                await delay(2500);
            }
        }

        // Плавний скрол для підвантаження лінивих зображень та блоків
        if (options.scroll) {
            console.log('📜 Виконуємо скрол сторінки для тригера динамічних блоків...');
            await this.page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 400;
                    const timer = setInterval(() => {
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= 1600) {
                            clearInterval(timer);
                            window.scrollTo(0, 0); // Повертаємось нагору
                            resolve();
                        }
                    }, 150);
                });
            });
            await delay(1000);
        }

        // Збереження HTML для аналізу тегів
        let savedHtmlPath = null;
        if (options.saveHtml) {
            savedHtmlPath = await this.saveDebugHtml();
        }

        return {
            page: this.page,
            browser: this.browser,
            savedHtmlPath,
        };
    }

    /**
     * Зберігає поточний HTML вміст сторінки у папку debug/
     */
    async saveDebugHtml(filenamePrefix = 'product') {
        if (!fs.existsSync(this.debugDir)) {
            fs.mkdirSync(this.debugDir, { recursive: true });
        }

        const html = await this.page.content();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filepath = path.join(this.debugDir, `${filenamePrefix}_${timestamp}.html`);
        const latestPath = path.join(this.debugDir, 'latest_product.html');

        fs.writeFileSync(filepath, html, 'utf8');
        fs.writeFileSync(latestPath, html, 'utf8');

        console.log(`💾 HTML збережено: ${filepath}`);
        console.log(`💾 Також оновлено: ${latestPath}`);
        return filepath;
    }

    /**
     * Від'єднання від браузера (не закриває вікно Chrome, щоб зберегти сесію)
     */
    async disconnect() {
        if (this.browser) {
            await this.browser.disconnect().catch(() => {});
            console.log('🔌 Відключено від відладочної сесії Chrome.');
        }
    }
}
