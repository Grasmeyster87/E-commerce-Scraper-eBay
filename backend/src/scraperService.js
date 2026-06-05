import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import { EbayScraper } from './services/scraper.js';
import { FileHandler } from './utils/fileHandler.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Orchestrates Puppeteer workflow, active Chrome connection hooks, and navigational steps.
 * * @param {string} searchQuery - The user search query string
 * @param {boolean} [saveDebugHtml=false] - Flag to save raw HTML for debugging
 * @param {string} [action='search'] - Core navigational action ('search' | 'next')
 * @param {number} [itemsPerPage=60] - Page size limitation configuration
 * @returns {Promise<Object>} Object containing extracted dataset and pagination state
 */
export async function runEbayScraper(
    searchQuery,
    saveDebugHtml = false,
    action = 'search',
    itemsPerPage = 60,
    pageDelays = [3000],
    currentPage = 1,
) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const scriptPath = path.join(__dirname, 'launch_chrome.bat');

    let browser = null;

    try {
        console.log('🔍 Checking for an active Chrome debugging session...');
        browser = await puppeteer
            .connect({
                browserURL: 'http://127.0.0.1:9222',
                defaultViewport: null,
            })
            .catch(() => null);

        if (!browser) {
            console.log(
                '🌐 Chrome not detected on port 9222. Initializing new runtime instance...',
            );
            exec(`"${scriptPath}"`, (err) => {
                if (err)
                    console.error(
                        '❌ Failed to launch Chrome execution script:',
                        err.message,
                    );
            });

            for (let attempt = 1; attempt <= 7; attempt++) {
                try {
                    await delay(1000);
                    browser = await puppeteer.connect({
                        browserURL: 'http://127.0.0.1:9222',
                        defaultViewport: null,
                    });
                    break;
                } catch (connectError) {
                    if (attempt === 7)
                        throw new Error(
                            'Chrome took too long to launch and bind port 9222.',
                        );
                }
            }
        }

        const pages = await browser.pages();
        const page = pages[0];
        const scraper = new EbayScraper(page);

        // NAVIGATION LOGIC
        if (action === 'search') {
            await scraper.search(searchQuery, itemsPerPage);
            await page
                .waitForNavigation({
                    waitUntil: 'networkidle2',
                    timeout: 10000,
                })
                .catch(() => {});
        } else if (action === 'next') {
            // Validate the array (to avoid errors if something wrong came from the front)            const delays =
            Array.isArray(pageDelays) && pageDelays.length > 0
                ? pageDelays
                : [3000];

            // Choose a loop delay.
            // currentPage - 1 is used to take index 0 on the 1st page.
            // Заміни той рядок на цей блок:
            const MIN_DELAY = 3000;

            // Отримуємо масив, якщо він порожній — використовуємо [3000]
            let rawDelays =
                Array.isArray(pageDelays) && pageDelays.length > 0
                    ? pageDelays
                    : [MIN_DELAY];

            // Фільтруємо масив: якщо якесь значення менше 3000, замінюємо його на 3000
            const delays = rawDelays.map((delay) =>
                delay < MIN_DELAY ? MIN_DELAY : delay,
            );

            // Тепер вибираємо затримку
            const currentDelay = delays[(currentPage - 1) % delays.length];

            console.log(
                `⏳ Applying dynamic pagination delay: ${currentDelay}ms (Page ${currentPage})`,
            );
            await delay(currentDelay);
            console.log(
                `⏳ Applying dynamic pagination delay: ${currentDelay}ms (Page ${currentPage})`,
            );

            // Call the delay function (it already exists at the beginning of the scraperService.js file)
            await delay(currentDelay);

            const clicked = await scraper.goToNextPageByClick();
            if (!clicked) {
                throw new Error(
                    'Last page reached or structural next button not found.',
                );
            }
            await page
                .waitForNavigation({
                    waitUntil: 'networkidle2',
                    timeout: 15000,
                })
                .catch(() => {});
        }

        if (saveDebugHtml) {
            const htmlContent = await page.content();
            FileHandler.saveDebugInfo(htmlContent, null, 'ebay_page');
        }

        const data = await scraper.scrapePage();
        const pagination = await scraper.getPaginationInfo();

        return { data, pagination };
    } catch (error) {
        console.error('❌ Помилка в логіці скрапера:', error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.disconnect().catch(() => {});
        }
    }
}
