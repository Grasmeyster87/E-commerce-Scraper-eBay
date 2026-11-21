import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import { EbayScraper } from './services/scraper.js';
import { FileHandler } from './utils/fileHandler.js';
import { BrowserService } from './services/browser.js';

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
    searchMode = 'query',
    saveDebugHtml = false,
    action = 'search',
    itemsPerPage = 60,
    pageDelays = [3000],
    currentPage = 1,
    browserOptions = {},
) {
    const { scrapeWithoutGB = false, scrapeWithGBFP = false } = browserOptions;

    // Determine headless mode:
    // 1. Scraping without GB: always headless
    // 2. Scraping with GBFP: first page has GUI (for verification/captchas), subsequent pages are headless
    let isHeadless = false;
    if (scrapeWithoutGB) {
        isHeadless = true;
    } else if (scrapeWithGBFP) {
        isHeadless = !(action === 'search' || currentPage <= 1);
    }

    let browser = null;

    try {
        let previousUrl = null;

        // If switching from GUI to Headless for GBFP on page 2+:
        if (scrapeWithGBFP && isHeadless && BrowserService.currentMode === 'gui') {
            try {
                const existing = await puppeteer
                    .connect({
                        browserURL: 'http://127.0.0.1:9222',
                        defaultViewport: null,
                    })
                    .catch(() => null);
                if (existing) {
                    const openPages = await existing.pages();
                    if (openPages.length > 0) {
                        previousUrl = openPages[0].url();
                    }
                }
            } catch {}
        }

        // Ensure browser is running in the requested mode (GUI or Headless)
        browser = await BrowserService.ensureBrowser({ headless: isHeadless });

        const pages = await browser.pages();
        const page = pages.length > 0 ? pages[0] : await browser.newPage();
        const scraper = new EbayScraper(page);

        // If we restarted from GUI to Headless for GBFP, restore the search results page
        if (
            previousUrl &&
            previousUrl.includes('ebay.') &&
            !page.url().includes('ebay.')
        ) {
            console.log(
                `🔁 GBFP: Restoring search results page in headless browser: ${previousUrl}`,
            );
            await page
                .goto(previousUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 60000,
                })
                .catch(() => {});
            await delay(1500);
        }

        // NAVIGATION LOGIC
        if (action === 'search') {
            // Branching search logic
            if (searchMode === 'link') {
                console.log(`🔗 Navigating directly to URL: ${searchQuery}`);
                // Go directly to the generated link with filters
                await scraper.page.goto(searchQuery, {
                    waitUntil: 'networkidle2',
                    timeout: 60000,
                });
            } else {
                console.log(`🔍 Searching by query: ${searchQuery}`);
                // Standard search by entering text into the input
                await scraper.search(searchQuery, itemsPerPage);
                await page
                    .waitForNavigation({
                        waitUntil: 'networkidle2',
                        timeout: 10000,
                    })
                    .catch(() => {});
            }

/*             await scraper.search(searchQuery, itemsPerPage);
            await page
                .waitForNavigation({
                    waitUntil: 'networkidle2',
                    timeout: 10000,
                })
                .catch(() => {}); */
        } else if (action === 'next') {
            // Validate the array (to avoid errors if something wrong came from the front)            const delays =
            Array.isArray(pageDelays) && pageDelays.length > 0
                ? pageDelays
                : [3000];

            // Choose a loop delay.
            // currentPage - 1 is used to take index 0 on the 1st page.
            // Replace that line with this block
            const MIN_DELAY = 3000;

            // We get the array if it is empty — use [3000]
            let rawDelays =
                Array.isArray(pageDelays) && pageDelays.length > 0
                    ? pageDelays
                    : [MIN_DELAY];

            // Filter the array: if any value is less than 3000, replace it with 3000
            const delays = rawDelays.map((delay) =>
                delay < MIN_DELAY ? MIN_DELAY : delay,
            );

            // Now we choose the delay
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
