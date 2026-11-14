import { ProductScraper } from './scraper.js';
import { ProductParser } from './parser.js';

// Тестовий URL за замовчуванням
const DEFAULT_PRODUCT_URL = 'https://www.ebay.com/itm/198677451237?_trkparms=itmf%3D1%26aid%3D1110006%26rkt%3D5%26algo%3DHOMESPLICE.SIM%26pid%3D101224%26mech%3D1%26algv%3DSimOrganicCassiniWithToraRecalls%26pmt%3D0%26amclksrc%3DITM%26sd%3D206596947208%26sid%3DAQALAAAAEOvKvcwp4Qoe7T63RZaz%2BA0%3D%26itm%3D198677451237%26noa%3D1%26brand%3DCompaq%26asc%3D20200818143230%26ao%3D1%26rk%3D2%26mehot%3Dnone%26lsid%3D212%26meid%3Dc2fa4c24393848d69b6c9a97d8d695e4%26pg%3D2332490&_trksid=p2332490.c101224.m-1';

/**
 * Нормалізує аргумент: дозволяє передавати або чистий числовий ID, або повний URL
 * Очищує від непотрібних трекінгових параметрів eBay (?itmmeta=...&hash=...)
 */
function normalizeTargetUrl(input) {
    if (!input) return DEFAULT_PRODUCT_URL;
    input = input.trim().replace(/^['"]|['"]$/g, ''); // прибираємо лапки якщо є
    
    // Якщо передано тільки числовий ID товару: напр. 206652221638
    if (/^\d+$/.test(input)) {
        return `https://www.ebay.com/itm/${input}`;
    }
    
    // Якщо передано посилання на товар eBay — виділяємо канонічний URL без трекінг-параметрів
    const itemMatch = input.match(/https?:\/\/(?:www\.)?ebay\.[a-z.]+\/itm\/(\d+)/i);
    if (itemMatch) {
        return `https://www.ebay.com/itm/${itemMatch[1]}`;
    }
    
    return input;
}

// Отримуємо URL з аргументів командного рядка
const rawArg = process.argv[2];
const targetUrl = normalizeTargetUrl(rawArg);

console.log('='.repeat(70));
console.log('🚀 ЗАПУСК АВТОНОМНОГО СКРАПЕРА СТОРІНКИ ТОВАРУ EBAY');
console.log('='.repeat(70));
console.log(`🎯 Цільова сторінка товару: ${targetUrl}`);
console.log('💡 Підказка: у PowerShell посилання з & треба брати в лапки:');
console.log('   node index.js "https://www.ebay.com/itm/206652221638?..."');
console.log('   Або можна передати просто номер товару:');
console.log('   node index.js 206652221638\n');

async function main() {
    const scraper = new ProductScraper();

    try {
        // 1. Відкриття сторінки через браузер з відладкою та локальним профілем
        const { page, savedHtmlPath } = await scraper.openProductPage(targetUrl, {
            saveHtml: true,
            scroll: true,
        });

        console.log('\n⚙️ Виконуємо парсинг структури сторінки...');
        
        // 2. Витягування даних про товар
        const productData = await ProductParser.parseProduct(page);

        // 2.1. Витягування опису товару від продавця (з iframe)
        console.log('📝 Парсимо опис товару від продавця (iframe)...');
        const descriptionData = await ProductParser.parseDescription(page);

        // 3. Дослідження тегів для відладки алгоритмів (демонстрація для користувача)
        console.log('🔬 Досліджуємо структуру тегів блоку ціни та назви...');
        const titleTagHierarchy = await ProductParser.inspectTagHierarchy(page, 'h1', 4);
        const priceTagHierarchy = await ProductParser.inspectTagHierarchy(page, '.x-price-primary', 4);

        // 4. ВІДФОРМАТОВАНИЙ ВИВІД РЕЗУЛЬТАТІВ У КОНСОЛЬ
        console.log('\n' + '='.repeat(70));
        console.log('📦 ОСНОВНА ІНФОРМАЦІЯ ПРО ТОВАР:');
        console.log('='.repeat(70));
        console.log(`🆔 ID Товару:       ${productData.itemId || 'Не знайдено'}`);
        console.log(`🏷️ Назва:           ${productData.title || 'Не знайдено'}`);
        console.log(`💰 Ціна:            ${productData.price || 'Не знайдено'}`);
        if (productData.approxPrice) {
            console.log(`💱 Приблизна ціна:  ${productData.approxPrice}`);
        }
        console.log(`✨ Стан:            ${productData.condition || 'Не знайдено'}`);
        console.log(`📊 Наявність:       ${productData.availability || 'Не знайдено'}`);
        console.log(`🚚 Доставка:        ${productData.shipping || 'Не знайдено'}`);
        console.log(`🔄 Повернення:      ${productData.returnsPolicy || 'Не знайдено'}`);

        console.log('\n' + '='.repeat(70));
        console.log('👤 ПРОДАВЕЦЬ:');
        console.log('='.repeat(70));
        console.log(`Ім'я продавця:      ${productData.seller.name || 'Не знайдено'}`);
        console.log(`Відгуки (бал):      ${productData.seller.score || 'Не знайдено'}`);
        console.log(`Позитивні відгуки:  ${productData.seller.positivePercent || 'Не знайдено'}`);

        console.log('\n' + '='.repeat(70));
        console.log('📋 ХАРАКТЕРИСТИКИ ТОВАРУ (ITEM SPECIFICS):');
        console.log('='.repeat(70));
        const specificsKeys = Object.keys(productData.itemSpecifics);
        if (specificsKeys.length > 0) {
            const labelWidth = Math.max(...specificsKeys.map((key) => key.length));
            console.log(`${'Назва'.padEnd(labelWidth)}  Значення`);
            specificsKeys.forEach((key) => {
                console.log(`${key.padEnd(labelWidth)}  ${productData.itemSpecifics[key]}`);
            });
        } else {
            console.log('⚠️ Характеристики товару не виявлено або таблиця завантажується окремо.');
        }

        console.log('\n' + '='.repeat(70));
        console.log('📝 ОПИС ТОВАРУ ВІД ПРОДАВЦЯ (Item Description):');
        console.log('='.repeat(70));
        if (descriptionData.text) {
            // Виводимо текст опису (обрізаємо до 1000 символів для читабельності)
            const previewText = descriptionData.text.length > 1000
                ? descriptionData.text.substring(0, 1000) + '...'
                : descriptionData.text;
            console.log(previewText);

            // Структуровані дані з таблиць опису (якщо є)
            const structuredKeys = Object.keys(descriptionData.structuredData || {});
            if (structuredKeys.length > 0) {
                console.log('\n📊 Структуровані дані з опису:');
                console.table(descriptionData.structuredData);
            }
        } else {
            console.log('⚠️ Опис товару не знайдено або iframe не завантажився.');
        }
/*
        console.log('\n' + '='.repeat(70));
        console.log(`🖼️ ЗОБРАЖЕННЯ (Всього знайдено: ${productData.images.length}):`);
        console.log('='.repeat(70));
        productData.images.forEach((img, idx) => {
            console.log(` [${idx + 1}] ${img}`);
        });
*/
        console.log('\n' + '='.repeat(70));
        console.log(`🔗 УСІ ПОСИЛАННЯ З ГАЛЕРЕЇ МЕДІА (Всього знайдено: ${productData.galleryLinks.length}):`);
        console.log('='.repeat(70));
        productData.galleryLinks.forEach((media, idx) => {
            console.log(` [${idx + 1}] [${media.type}] ${media.url}`);
        });

        console.log('\n' + '='.repeat(70));
        console.log('🏷️ ПРИКЛАД ДЕКОМПОЗИЦІЇ ТЕГІВ ДЛЯ РОЗРОБКИ ВЛАСНИХ АЛГОРИТМІВ:');
        console.log('='.repeat(70));
        console.log('Дерево тегів навколо блоку ціни (.x-price-primary):');
        if (priceTagHierarchy && priceTagHierarchy.tokens) {
            priceTagHierarchy.tokens.forEach(token => {
                const indent = '  '.repeat(token.depth);
                const classStr = token.classes ? ` class="${token.classes}"` : '';
                const textStr = token.text ? ` -> "${token.text}"` : '';
                console.log(`${indent}<${token.tag}${classStr}>${textStr}`);
            });
        }

        console.log('\n' + '='.repeat(70));
        console.log('💾 ДЕБАГ ТА РОБОТА З HTML:');
        console.log('='.repeat(70));
        console.log(`Повний HTML збережено у: ${savedHtmlPath}`);
        console.log('Ви можете відкрити цей файл або latest_product.html у редакторі,');
        console.log('щоб протестувати свої нові селектори та функції у parser.js.');
        console.log('='.repeat(70) + '\n');

    } catch (err) {
        console.error('❌ Помилка під час скрапінгу/парсингу:', err);
    } finally {
        await scraper.disconnect();
    }
}

main();