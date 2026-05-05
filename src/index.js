import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { EbayScraper } from './services/scraper.js';
import { FileHandler } from './utils/fileHandler.js';

puppeteer.use(StealthPlugin());

async function run() {
    console.log("🔗 З'єднання з відкритим браузером через CDP...");

    let browser;
    try {
        // Підключаємося до локального порту, який ми відкрили
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: null,
        });

        console.log('✅ Успішно підключено!');

        // Отримуємо всі відкриті вкладки і беремо першу,
        // або створюємо нову, якщо відкритих немає
        const pages = await browser.pages();
        const page = pages.length > 0 ? pages[0] : await browser.newPage();

        const scraper = new EbayScraper(page);
        const query = 'notebook laptop computer';
        let allProducts = [];

        console.log(`🔍 Починаємо пошук: ${query}...`);
        await scraper.search(query);

        for (let i = 1; i <= 2; i++) {
            console.log(`📄 Парсинг сторінки ${i}...`);

            // ПЕРЕД парсингом зберігаємо те, що бачимо для дебагу
            const html = await page.content();
            const screenshot = await page.screenshot({ fullPage: true });

            // Викликаємо ваш новий метод для збереження дебаг-інфо
            FileHandler.saveDebugInfo(html, screenshot, `page_${i}`);

            // Оголошуємо змінну ОДИН раз
            const products = await scraper.scrapePage();

            // Додаємо знайдені товари до загального списку
            allProducts = allProducts.concat(products);

            if (await scraper.hasNextPage()) {
                await scraper.goToNextPage();
            } else {
                console.log('⏭️ Наступної сторінки не знайдено.');
                break;
            }
        }

        console.table(allProducts.slice(0, 10));
        console.log(`📊 Всього зібрано: ${allProducts.length} товарів.`);
        FileHandler.saveToCSV(allProducts, 'ebay_keyboards.csv');
    } catch (error) {
        console.error(
            '❌ Виникла помилка. Перевірте, чи запущено Chrome з портом 9222.',
            error,
        );
    } finally {
        // ВАЖЛИВО: ми робимо disconnect(), а не close(),
        // щоб браузер залишився відкритим для наступних запусків
        if (browser) {
            await browser.disconnect();
            console.log('🔌 Відключено від браузера.');
        }
    }
}

run();
