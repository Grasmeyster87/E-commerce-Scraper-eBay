export class CardService {
    /**
     * Primary processing of the card array from the backend and generation of semantic paths
     */
    static processRawData(rawData) {
        return rawData.map((card) => {
            const maxDepth = card.lines.reduce(
                (max, line) => Math.max(max, parseInt(line.depth || 0, 10)),
                0,
            );

            let currentPathTracker = [];
            let originalPathTracker = [];

            // Counter for uniqueness of identical paths within one card
            let cleanPathCounters = {};

            const linesWithPaths = card.lines.map((line) => {
                const depth = parseInt(line.depth || 0, 10);
                const isHtmlTag =
                    line.isStructure === true ||
                    (typeof line.text === 'string' &&
                        line.text.trim().startsWith('<'));

                // Original path to display on hover (title)
                const htmlTagsPath = originalPathTracker
                    .slice(0, depth)
                    .filter(Boolean)
                    .join(' > ');

                // Cleaned up the path for grouping in columns (removing volatile classes like bold, primary)
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

                let finalSemanticPath;
                if (isHtmlTag) {
                    finalSemanticPath = cleanSemanticPath || null;
                } else {
                    // Для текстових вузлів визначаємо до якого блоку вони належать
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

                    // Add an entry index to avoid collapsing identical tags (for example, two spans in one div)
                    finalSemanticPath = `${baseSemanticPath}_[${cleanPathCounters[baseSemanticPath]}]`;
                }

                return {
                    ...line,
                    isHtmlTag,
                    semanticPath: finalSemanticPath,
                    htmlTagsPath: htmlTagsPath || null, // Save for display on hover
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
     * Toggle saving links based on the Uniqueness flag
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
     * Toggle "Show Card" mode with Uniqueness flag checked
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
     * Changing the depth counter considering limits and uniqueness
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
     * Working with row checkboxes (cascading subtag selection + CONTEXTUAL synchronization)
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
     * Delete an entire column from a table (deselect all lines with that path)
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
     * Delete a specific cell in a table
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
     * Formats card data into a flat table for export (CSV, SQLite, JSON)
     */
    static extractTableData(results) {
        const activeCards = results.filter((c) => c.cardChecked);
        if (activeCards.length === 0) return [];

        // Collecting unique titles (tag paths)
        const columnsSet = new Set();
        activeCards.forEach((card) => {
            card.lines.forEach((line) => {
                if (line.checked && !line.isHtmlTag && line.semanticPath) {
                    columnsSet.add(line.semanticPath);
                }
            });
        });

        // Sort columns by blocks and indexes
        const columns = Array.from(columnsSet).sort((a, b) => {
            const matchA = a.match(/^B(\d+)_/);
            const matchB = b.match(/^B(\d+)_/);
            if (matchA && matchB) {
                if (matchA[1] !== matchB[1])
                    return parseInt(matchA[1]) - parseInt(matchB[1]);
            }
            return a.localeCompare(b);
        });

        // Calculating indices for a beautiful output
        const blockCounters = {};
        const colDisplayNumbers = {};
        columns.forEach((col) => {
            const match = col.match(/^B(\d+)_/);
            const b = match ? match[1] : '99';
            if (!blockCounters[b]) blockCounters[b] = 1;
            colDisplayNumbers[col] = blockCounters[b]++;
        });

        // Building lines
        return activeCards.map((card, idx) => {
            // Basic system fields
            const rowObj = {
                '№': idx + 1,
                ID: card.id,
                URL: card.url || '',
                Image: card.img || '',
            };

            // Dynamic fields based on the selected structure
            columns.forEach((col) => {
                const line = card.lines.find(
                    (l) => l.semanticPath === col && !l.isHtmlTag && l.checked,
                );

                const match = col.match(/^B(\d+)_/);
                const blockName =
                    match && match[1] !== '99' ? `Блок ${match[1]}` : 'Інше';
                const colName = `${blockName} - Insert ${colDisplayNumbers[col]}`;

                rowObj[colName] = line ? line.text : ''; // If there is no data in this card, leave it blank.
            });

            return rowObj;
        });
    }
}
