/**
 * Structural HTML Parser and DOM Normalization Engine.
 * Deconstructs nested DOM subtrees, handles anti-obfuscation patterns,
 * and generates linear hierarchical node tokens for matrix parsing pipelines.
 */
export class StructuralParser {
    /**
     * Extracts structural layouts and plain text metadata tokens from raw product elements.
     * Evaluates marketplace anti-scraping footprints and normalizes the resulting token tree matrix.
     * * @static
     * @async
     * @method parseProduct
     * @param {Object} liElement - Puppeteer ElementHandle reference pointing to the source listing <li> node.
     * @returns {Promise<Object|null>} Hydrated card data schema entity, or null if filtered by target exclusion criteria.
     */
    static async parseProduct(liElement) {
        return await liElement.evaluate((li) => {
            // Guard clause: Exclude structural layout boundaries, layout spacers, or auxiliary pagination tiles
            if (
                li.classList.contains(
                    'srp-river-answer--BASIC_PAGINATION_V2',
                ) ||
                li.querySelector('.s-pagination') ||
                li.innerText.includes('Items Per Page')
            ) {
                return null;
            }

            /** @type {string} Raw text content footprint inside the item node scope */
            const textContent = li.innerText;

            /** @type {boolean} Validation token checking for monetary currency strings or international pricing symbols */
            const hasCurrency =
                /[\$\£\€\¥\₣\₽\₴\₦\₹\₩\₺\₿]/.test(textContent) ||
                /\b(USD|EUR|GBP|CAD|AUD|NZD|JPY|CNY|CHF|SEK|NOK|DKK|MXN|BRL|RUB|UAH|TRY|INR|KRW|PLN|CZK|HUF)\b/i.test(
                    textContent,
                );

            // Guard clause: Filter out purely informational layouts or ad banners lacking structural pricing metrics
            if (!hasCurrency) return null;

            /** @type {Element|null} Target element reference for the primary visualization image node */
            const imgEl = li.querySelector('a[href] img[src]');

            /** @type {string|null} Resolved source absolute URI web reference for the item image display asset */
            const img = imgEl ? imgEl.src : null;

            /** @type {Element|null} Dynamic navigation anchor reference capturing target transactional redirect lines */
            const linkEl = imgEl
                ? imgEl.closest('a')
                : li.querySelector('a[href]');
            const url = linkEl ? linkEl.href : null;

            /** @type {Element} Target execution zone container restricting operational focus to item text data layers */
            const contentArea =
                li.querySelector('.su-card-container__content') || li;

            /** @type {Array<Object>} Flat repository data buffer storing parsed skeletal structural nodes and leaf string components */
            const rawItems = [];

            /**
             * Sanitizes string structures by neutralizing hidden spaces, blank byte values, and format break markers.
             * * @function cleanText
             * @param {string} str - Raw string token requiring sanitization processing.
             * @returns {string} Fully cleaned, normalized, space-balanced single-line string token.
             */
            function cleanText(str) {
                if (!str) return '';
                return str
                    .replace(/[\u200B-\u200D\uFEFF\u2060-\u206F\u2062]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            // Step 1: Inject root layout boundary node token to initialize tree containment constraints
            rawItems.push({
                text: `<li class="${li.className}">`,
                depth: 0,
                isStructure: true,
            });

            /**
             * Recursive tree traversal routine decomposing the DOM matrix into linear token streams.
             * Captures physical structural tag markers alongside deep textual leaf properties.
             * * @function traverse
             * @param {Element} element - Target structural DOM node entity currently being evaluated.
             * @param {number} currentDepth - Intermittent processing coordinate representing current node nesting hierarchy level.
             * @returns {void}
             */
            function traverse(element, currentDepth) {
                if (!element) return;

                // Exclusion boundary: Prevent scanning volatile scripts, system styles, graphical elements, or transactional action triggers
                if (
                    ['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'BUTTON'].includes(
                        element.tagName,
                    )
                )
                    return;

                // UI Guard: Filter out decorative media blocks and cropped hidden elements to ensure high data signal-to-noise ratio
                if (
                    element.classList.contains('su-card-container__media') ||
                    element.classList.contains('clipped')
                )
                    return;

                // PERSIST ARCHITECTURAL SKELETON: Extract physical tag element tokens along with formatting tokens                
                const tagName = element.tagName.toLowerCase();
                const classAttr = element.getAttribute('class');
                const classes = classAttr
                    ? ` class="${classAttr.trim().replace(/\s+/g, ' ')}"`
                    : '';
                rawItems.push({
                    text: `<${tagName}${classes}>`,
                    depth: currentDepth,
                    isStructure: true,
                });

                /** @type {Array<Element>} Collection pool listing immediate functional child elements of the current node segment */
                const childElements = Array.from(element.children);

                /** @type {boolean} Validation check detecting anti-scraping content obfuscation (split characters across hidden sub-spans) */
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

                // Anti-Obfuscation Resolution: If the element structure is obfuscated, collapse fragmented sub-nodes into a single unified text string
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

                // Terminal Node Verification: If the processing node is a leaf (contains no child sub-elements), harvest text content payload
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

                // Deep Propagation Loop: Cascade analysis into subsequent nested structural layer coordinates
                for (const child of childElements) {
                    traverse(child, currentDepth + 1);
                }
            }

            // Execute traversal sequencing beginning context scanning routines at depth level 1
            traverse(contentArea, 1);

            /** @type {string} Crypto-randomized multi-character string acting as a unique key descriptor token for session tracking */
            const cardUniqueId =
                'card_' +
                Math.random().toString(36).substring(2, 11) +
                Date.now().toString(36);

            // CRITICAL ARCHITECTURAL CONSTRAINT: Retain full node indexation lists intact to maintain column synchronization integrity
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
