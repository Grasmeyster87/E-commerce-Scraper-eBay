/**
 * Service handling data formatting, column mapping, and architectural processing.
 */
export class CardService {
    /**
     * Primary data mapping, structure parsing, and semantic path mapping generation.
     * * @param {Object[]} rawData - Array of parsed raw cards from structural engine
     * @returns {Object[]} Processed and normalized structural cards array
     */
    static processRawData(rawData) {
        return rawData.map((card) => {
            const maxDepth = card.lines.reduce(
                (max, line) => Math.max(max, parseInt(line.depth || 0, 10)),
                0,
            );

            let currentPathTracker = [];
            let originalPathTracker = [];

            // Counter tracking unique instances of duplicate semantic nodes within a single card
            let cleanPathCounters = {};

            const linesWithPaths = card.lines.map((line) => {
                const depth = parseInt(line.depth || 0, 10);
                const isHtmlTag =
                    line.isStructure === true ||
                    (typeof line.text === 'string' &&
                        line.text.trim().startsWith('<'));

                // Original path configuration used for mouse hover annotations (title attr)
                const htmlTagsPath = originalPathTracker
                    .slice(0, depth)
                    .filter(Boolean)
                    .join(' > ');

                // Normalized semantic path mapping for unified column groups (filters design tokens like bold/primary)
                const cleanSemanticPath = currentPathTracker
                    .slice(0, depth)
                    .filter(Boolean)
                    .join(' > ');

                if (isHtmlTag) {
                    originalPathTracker[depth] = line.text.trim();
                    originalPathTracker = originalPathTracker.slice(
                        0,
                        depth + 1,
                    );

                    let cleanTagStr = line.text
                        .replace(
                            /\b(bold|large-\d|large|small|default|primary|secondary|negative|positive|regular|italic)\b/g,
                            '',
                        )
                        .replace(/\s+/g, ' ')
                        .replace(/ class="\s*"/, '')
                        .replace(/ class="([^"]*?)\s+"/g, ' class="$1"')
                        .trim();

                    currentPathTracker[depth] = cleanTagStr;
                    currentPathTracker = currentPathTracker.slice(0, depth + 1);
                }

                let finalSemanticPath = null;
                if (isHtmlTag) {
                    finalSemanticPath = cleanSemanticPath || null;
                } else {
                    // For text nodes, determine structural target block allocation based on contextual DOM layout indicators.                    
                    let bIndex = 99;
                    for (let i = 1; i <= depth; i++) {
                        const tag = originalPathTracker[i];
                        if (tag) {
                            if (tag.includes('__header')) {
                                bIndex = 1;
                                break;
                            }
                            if (tag.includes('__attributes')) {
                                bIndex = 2;
                                break;
                            }
                            if (tag.includes('__footer')) {
                                bIndex = 3;
                                break;
                            }
                        }
                    }

                    let baseSemanticPath = `B${bIndex}_${cleanSemanticPath}`;

                    if (!cleanPathCounters[baseSemanticPath]) {
                        cleanPathCounters[baseSemanticPath] = 0;
                    }
                    cleanPathCounters[baseSemanticPath]++;

                    // Append occurrence index to prevent collision/collapse of identical adjacent structures (e.g., matching spans inside a single block)
                    finalSemanticPath = `${baseSemanticPath}_[${cleanPathCounters[baseSemanticPath]}]`;
                }

                return {
                    ...line,
                    isHtmlTag,
                    semanticPath: finalSemanticPath,
                    htmlTagsPath: htmlTagsPath || null, // Persist raw telemetry path for UI-level hover states
                };
            });

            return {
                ...card,
                lines: linesWithPaths,
                maxDepth: maxDepth,
                currentDepth: maxDepth,
                uniqueness: true,
                showCleanText: false,
                saveCardLink: true,
                saveImgLink: true,
            };
        });
    }

    /**
     * Toggles URL or media resource target persistence, applying cascading updates based on uniqueness syncing.
     * @param {Object[]} results - The currently loaded structural dataset collection
     * @param {string|number} cardId - Unique target identifier for the primary card item
     * @param {string} field - Target property identifier to toggle (e.g., 'saveCardLink' | 'saveImgLink')
     * @returns {Object[]} The mutated data sequence containing synchronized target state modifications
     */
    static toggleLinkSave(results, cardId, field) {
        const originCard = results.find((c) => c.id === cardId);
        if (!originCard) return results;

        const nextState = !originCard[field];
        const isUniqueSync = originCard.uniqueness !== false;

        return results.map((card) => {
            if (isUniqueSync || card.id === cardId) {
                return { ...card, [field]: nextState };
            }
            return card;
        });
    }

    /**
     * Toggles raw textual parsing rendering modes across data layouts with respect to global structural uniqueness.
     * @param {Object[]} results - Collection representing the managed global state matrices
     * @param {string|number} cardId - Unique identifier for the context execution root
     * @returns {Object[]} Updated object collection with modified visualization layers
     */
    static toggleCleanText(results, cardId) {
        const originCard = results.find((c) => c.id === cardId);
        if (!originCard) return results;

        const nextState = !originCard.showCleanText;
        const isUniqueSync = originCard.uniqueness !== false;

        return results.map((card) => {
            if (isUniqueSync || card.id === cardId) {
                return { ...card, showCleanText: nextState };
            }
            return card;
        });
    }

    /**
     * Modifies rendering threshold offsets while safely clamping bounded indices and updating global nodes.
     * @param {Object[]} results - Collection containing global architectural parsing models
     * @param {string|number} cardId - Context target locator key
     * @param {string|number} newValue - Evaluated numeric value denoting technical parser parsing depth boundaries
     * @returns {Object[]} Regulated results array bounded safely within architectural metrics
     */
    static handleDepthChange(results, cardId, newValue) {
        const originCard = results.find((c) => c.id === cardId);
        if (!originCard) return results;

        let parsedValue = parseInt(newValue, 10);
        if (isNaN(parsedValue)) parsedValue = originCard.maxDepth;
        if (parsedValue < 0) parsedValue = 0;
        if (parsedValue > originCard.maxDepth)
            parsedValue = originCard.maxDepth;

        const isUniqueSync = originCard.uniqueness !== false;

        return results.map((card) => {
            if (isUniqueSync || card.id === cardId) {
                const safeValue = Math.min(parsedValue, card.maxDepth);
                return { ...card, currentDepth: safeValue };
            }
            return card;
        });
    }

    /**
     * Handles individual component row selections, performing cascading child flag selection and context synchronization.
     * @param {Object[]} results - Complete structural dataset matrix array reference
     * @param {string|number} cardId - Unique container identifying scope
     * @param {number} lineIndex - Numeric tracking position of target layout path item
     * @returns {Object[]} Modified collection mapping state metrics across children and corresponding nodes
     */
    static toggleLineCheck(results, cardId, lineIndex) {
        const originCard = results.find((c) => c.id === cardId);
        if (!originCard) return results;

        const targetLine = originCard.lines.find((l) => l.index === lineIndex);
        if (!targetLine) return results;

        const nextCheckedState = !targetLine.checked;
        const targetText = targetLine.text;
        const targetPath = targetLine.semanticPath;
        const isUniqueSync = originCard.uniqueness !== false;

        return results.map((card) => {
            if (card.id !== cardId && !isUniqueSync) return card;

            const newLines = card.lines.map((line) => ({ ...line }));

            if (card.id === cardId) {
                const targetIdx = newLines.findIndex(
                    (l) => l.index === lineIndex,
                );
                if (targetIdx !== -1) {
                    newLines[targetIdx].checked = nextCheckedState;
                    const parentDepth = newLines[targetIdx].depth;

                    for (let i = targetIdx + 1; i < newLines.length; i++) {
                        if (newLines[i].depth > parentDepth) {
                            newLines[i].checked = nextCheckedState;
                        } else {
                            break;
                        }
                    }
                }
            } else {
                for (let i = 0; i < newLines.length; i++) {
                    if (
                        newLines[i].text === targetText &&
                        newLines[i].semanticPath === targetPath
                    ) {
                        newLines[i].checked = nextCheckedState;
                        const parentDepth = newLines[i].depth;

                        let j = i + 1;
                        while (
                            j < newLines.length &&
                            newLines[j].depth > parentDepth
                        ) {
                            newLines[j].checked = nextCheckedState;
                            j++;
                        }
                    }
                }
            }

            return { ...card, lines: newLines };
        });
    }

    /**
     * Drops entire tabular field configuration globally by clearing active flags across matching semantic paths.
     * @param {Object[]} results - Data array container holding runtime card states
     * @param {string} path - Target semantic query route to be disqualified from processing
     * @returns {Object[]} Normalized dataset with matching attributes removed from operational pipelines
     */
    static deleteColumn(results, path) {
        return results.map((card) => ({
            ...card,
            lines: card.lines.map((line) =>
                line.semanticPath === path ? { ...line, checked: false } : line,
            ),
        }));
    }

    /**
     * Clear selected flag configuration for an explicit single item element matrix field.
     * @param {Object[]} results - Data context containing execution parameters
     * @param {string|number} cardId - Unique tracker index targeting specified item component
     * @param {string} path - Strict structural semantic path lookup key
     * @returns {Object[]} Mutated collection state with isolated cell metrics dereferenced
     */
    static deleteCell(results, cardId, path) {
        return results.map((card) => {
            if (card.id !== cardId) return card;
            return {
                ...card,
                lines: card.lines.map((line) =>
                    line.semanticPath === path
                        ? { ...line, checked: false }
                        : line,
                ),
            };
        });
    }

    /**
     * Transforms layered, hierarchical node structures into localized flat row-column schemas for serialization engine exports.
     * @param {Object[]} results - Multi-layered parsing artifact records list
     * @returns {Object[]} Formatted flat schema records set matching tabular extraction layouts
     */
    static extractTableData(results) {
        const activeCards = results.filter((c) => c.cardChecked);
        if (activeCards.length === 0) return [];

        // Aggregate unique structural headers based on clean semantic paths
        const columnsSet = new Set();
        activeCards.forEach((card) => {
            card.lines.forEach((line) => {
                if (line.checked && !line.isHtmlTag && line.semanticPath) {
                    columnsSet.add(line.semanticPath);
                }
            });
        });

        // Sort generated column headers sequentially by structural block and index hierarchy
        const columns = Array.from(columnsSet).sort((a, b) => {
            const matchA = a.match(/^B(\d+)_/);
            const matchB = b.match(/^B(\d+)_/);
            if (matchA && matchB) {
                if (matchA[1] !== matchB[1])
                    return parseInt(matchA[1]) - parseInt(matchB[1]);
            }
            return a.localeCompare(b);
        });

        // Map sequential identifiers for high-readability layout formatting
        const blockCounters = {};
        const colDisplayNumbers = {};
        columns.forEach((col) => {
            const match = col.match(/^B(\d+)_/);
            const b = match ? match[1] : '99';
            if (!blockCounters[b]) blockCounters[b] = 1;
            colDisplayNumbers[col] = blockCounters[b]++;
        });

        // Compile and map row objects matching structural layout requirements
        return activeCards.map((card, idx) => {
            // Initialize foundational system and source telemetry tracking keys
            const rowObj = {
                '№': idx + 1,
                ID: card.id,
                URL: card.url || '',
                Image: card.img || '',
            };

            // Populate dynamic cells extracted from validated responsive DOM layers
            columns.forEach((col) => {
                const line = card.lines.find(
                    (l) => l.semanticPath === col && !l.isHtmlTag && l.checked,
                );

                const match = col.match(/^B(\d+)_/);
                const blockName =
                    match && match[1] !== '99' ? `Блок ${match[1]}` : 'Інше';
                const colName = `${blockName} - Вставка ${colDisplayNumbers[col]}`;

                rowObj[colName] = line ? line.text : ''; 
            });

            return rowObj;
        });
    }
}
