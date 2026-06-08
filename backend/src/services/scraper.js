import { StructuralParser } from './parser.js';

/**
 * Orchestration Engine managing browser session loops, element discovery heuristics,
 * pagination tracking pipelines, and page-level resource extraction processes.
 */
export class EbayScraper {
    /**
     * Prepares configuration vectors mapping scraper routines onto open automated tabs.
     * * @constructor
     * @param {Object} page - Active Puppeteer page interface instance abstraction.
     */
    constructor(page) {
        /** @type {Object} Automated page context session bridge link */
        this.page = page;
        /** @type {string|null} Resolved global CSS container selector string targeting the item grid container */
        this.listSelector = null;
    }

    /**
     * Instructs the browser automation layer to dispatch search commands to the designated portal.
     * Formulates localized item query routes matching required items-per-page counts.
     * * @async
     * @method search
     * @param {string} query - Target user text string parameter representing product key matching rules.
     * @param {number} [itemsPerPage=60] - Layout capacity parameter adjusting page display densities.
     * @returns {Promise<void>}
     */
    async search(query, itemsPerPage = 60) {
        let url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
        if (itemsPerPage) {
            url += `&_ipg=${itemsPerPage}`;
        }
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    }

    /**
     * Executes advanced heuristics to isolate and resolve the main product container element path.
     * Evaluates item visibility metrics, text presence indicators, and image anchor counts across lists.
     * * @async
     * @method findProductList
     * @returns {Promise<void>}
     */
    async findProductList() {
        console.log(
            '🔍 Analyzing page architecture: searching for primary product layout structures...',
        );
        try {
            await this.page.waitForSelector('body', { timeout: 10000 });
            await this.page.waitForFunction(
                () => {
                    const uls = document.querySelectorAll('ul');
                    return Array.from(uls).some((ul) => {
                        if (ul.offsetHeight === 0 || ul.offsetWidth === 0)
                            return false;
                        const lis = ul.querySelectorAll('li');
                        return Array.from(lis).some((li) => {
                            const aWithImg =
                                li.querySelector('a[href] img[src]');
                            const parentDivs = Array.from(
                                li.querySelectorAll('div'),
                            ).filter(
                                (d) =>
                                    d.querySelectorAll(':scope > div').length >=
                                    3,
                            );
                            return !!(
                                aWithImg &&
                                parentDivs.length > 0 &&
                                li.innerText.trim().length > 0
                            );
                        });
                    });
                },
                { timeout: 15000 },
            );
        } catch (error) {
            console.log(
                '⚠️ Architecture Warning: Product list node resolution timed out.',
            );
            return;
        }

        /** @type {Array<Object>} Collection containing analyzed container structural pathways scored by valid item densities */
        const candidates = await this.page.evaluate(() => {
            const uls = document.querySelectorAll('ul');
            const results = [];
            uls.forEach((ul) => {
                if (ul.offsetHeight === 0 || ul.offsetWidth === 0) return;
                const lis = ul.querySelectorAll('li');
                let matchCount = 0;
                lis.forEach((li) => {
                    const aWithImg = li.querySelector('a[href] img[src]');
                    const parentDivs = Array.from(
                        li.querySelectorAll('div'),
                    ).filter(
                        (d) => d.querySelectorAll(':scope > div').length >= 3,
                    );
                    const hasRealText = li.innerText.trim().length > 0;
                    if (aWithImg && parentDivs.length > 0 && hasRealText)
                        matchCount++;
                });
                if (matchCount > 0) {
                    let selector = 'ul';
                    if (ul.id) selector = `#${ul.id}`;
                    else if (ul.className) {
                        const firstClass = ul.className.trim().split(/\s+/)[0];
                        if (firstClass) selector = `ul.${firstClass}`;
                    }
                    results.push({ selector, count: matchCount });
                }
            });
            return results;
        });

        // Rank layout container selector strings by density scores and elect the highest-confidence target entry
        if (candidates.length > 0) {
            candidates.sort((a, b) => b.count - a.count);
            this.listSelector = candidates[0].selector;
            console.log(
                `🎯 Target list selector established: "${this.listSelector}" (Yield: ${candidates[0].count} items)`,
            );
        }
    }

    /**
     * Extracts operational pagination indicators and analytical page progress flags from layout boundaries.
     * Evaluates controls and listings to determine layout navigation capacities.
     * * @async
     * @method getPaginationInfo
     * @returns {Promise<Object>} Object detailing currentPage, totalPages, and itemsPerPage metrics.
     */
    async getPaginationInfo() {
        return await this.page.evaluate(() => {
            let totalPages = 1;
            let currentPage = 1;
            let itemsPerPage = 0;

            // Step 1: Query for pagination navigational container components
            const olElements = document.querySelectorAll(
                'ol[class*="pagination"]',
            );
            if (olElements.length > 0) {
                const items = Array.from(olElements[0].querySelectorAll('li'));

                // Locate the active page segment by checking accessibility markers or class indicators
                const currentItem = items.find(
                    (li) =>
                        li.querySelector('[aria-current="page"]') ||
                        li.className.includes('current'),
                );
                if (currentItem) {
                    currentPage = parseInt(currentItem.textContent.trim()) || 1;
                }

                // Analyze node lists to deduce the maximum numerical index representing total layout pages
                const numbers = items
                    .map((li) => parseInt(li.textContent.trim()))
                    .filter((n) => !isNaN(n));
                if (numbers.length > 0) {
                    totalPages = Math.max(...numbers);
                }
            }

            // Step 2: Track dropdown structural components controlling items-per-page capacities
            const ippButton = document.querySelector(
                'button[aria-controls*="ipp"], [class*="ipp"] button',
            );
            if (ippButton) {
                itemsPerPage = parseInt(ippButton.textContent.trim()) || 0;
            }

            // Fallback strategy: If explicit controls are omitted, compute the configuration value by counting rendered item nodes
            if (!itemsPerPage) {
                itemsPerPage = document.querySelectorAll(
                    'li[class*="s-card"]',
                ).length;
            }

            return { currentPage, totalPages, itemsPerPage };
        });
    }

    /**
     * Simulates human interaction loops to execute next-page pagination requests.
     * Evaluates accessibility block parameters prior to dispatching click signals.
     * * @async
     * @method goToNextPageByClick
     * @returns {Promise<boolean>} True if action triggers navigation; false if pagination limits are met.
     */
    async goToNextPageByClick() {
        console.log(
            '🔄 Simulating user interaction: triggering next-page navigation action sequence...',
        );
        return await this.page.evaluate(() => {
            const navs = document.querySelectorAll('nav');
            let nextBtn = null;

            for (const nav of navs) {
                const ol = nav.querySelector('ol');
                if (ol) {
                    const lis = ol.querySelectorAll('li');
                    const hasDigits = Array.from(lis).some((li) => /\d/.test(li.textContent));
                    
                    if (hasDigits) {
                        let sibling = ol.nextElementSibling;
                        while (sibling) {
                            if (sibling.tagName.toLowerCase() === 'a' || sibling.tagName.toLowerCase() === 'button') {
                                nextBtn = sibling;
                                break;
                            }
                            sibling = sibling.nextElementSibling;
                        }
                        
                        // Fallback: get the first a/button that appears after ol in the DOM tree within this nav
                        if (!nextBtn) {
                            const elements = Array.from(nav.querySelectorAll('a, button'));
                            nextBtn = elements.find(
                                (el) => ol.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
                            );
                        }

                        if (nextBtn) {
                            break;
                        }
                    }
                }
            }

            if (nextBtn) {
                // Assert check to verify whether button states have been deactivated by interface limiters
                if (
                    (nextBtn.hasAttribute('aria-disabled') && nextBtn.getAttribute('aria-disabled') === 'true') ||
                    nextBtn.hasAttribute('disabled') ||
                    nextBtn.classList.contains('disabled') ||
                    nextBtn.getAttribute('href') === 'javascript:;' ||
                    nextBtn.getAttribute('href') === '#'
                ) {
                    return false;
                }
                nextBtn.click();
                return true;
            }
            return false;
        });
    }

    /**
     * Executes the main data gathering cycle over target product node arrays.
     * Filters layout garbage data elements and routes raw handles into deep decomposition parsers.
     * * @async
     * @method scrapePage
     * @returns {Promise<Object[]>} Collection array of fully structured, multi-layered data cards.
     */
    async scrapePage() {
        this.listSelector = null;
        await this.findProductList();

        if (!this.listSelector) return [];

        /** @type {Array<Object>} Low-level Puppeteer ElementHandle array containing target item wrappers */
        const productElements = await this.page.$$(
            `${this.listSelector} > li, ${this.listSelector} .s-item__wrapper`,
        );
        const results = [];

        for (const el of productElements) {
            /** @type {Object|null} Decompressed entity token schema object returned from the parser module */
            const data = await StructuralParser.parseProduct(el);
            if (data && data.lines && data.lines.length > 0) {
                /** @type {boolean} Anti-garbage filter flag validating structural listing context validity */
                const isGarbage = data.lines.some((line) =>
                    line.text.includes('Shop on eBay'),
                );
                if (!isGarbage) results.push(data);
            }
        }
        return results;
    }
}
