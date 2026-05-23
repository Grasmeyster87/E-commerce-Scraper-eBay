export class CardService {
    /**
     * Первинна обробка масиву карток з бекенду та генерація семантичних шляхів
     */
    static processRawData(rawData) {
        return rawData.map((card) => {
            const maxDepth = card.lines.reduce(
                (max, line) => Math.max(max, parseInt(line.depth || 0, 10)),
                0,
            );

            let currentPathTracker = [];
            const linesWithPaths = card.lines.map((line) => {
                const depth = parseInt(line.depth || 0, 10);
                const isHtmlTag =
                    line.isStructure === true ||
                    (typeof line.text === 'string' &&
                        line.text.trim().startsWith('<'));

                // ОБЧИСЛЮЄМО СЕМАНТИЧНИЙ ШЛЯХ ДЛЯ ВСІХ (включаючи самі HTML теги на основі їхніх батьків)
                const semanticPath = currentPathTracker
                    .slice(0, depth)
                    .filter(Boolean)
                    .join(' > ');

                if (isHtmlTag) {
                    // Оновлюємо трекер для поточного рівня глибини
                    currentPathTracker[depth] = line.text.trim();
                    currentPathTracker = currentPathTracker.slice(0, depth + 1);
                }

                return {
                    ...line,
                    isHtmlTag,
                    // Якщо шлях порожній (корінь дерева), запишемо null, інакше — рядок шляху
                    semanticPath: semanticPath || null,
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
     * Перемикання збереження лінків з урахуванням прапорця Унікальності
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
     * Перемикання режиму "Показати Картку" з урахуванням прапорця Унікальності
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
     * Зміна лічильника глибини з урахуванням лімітів та унікальності
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
     * Робота з чекбоксами рядків (каскадне виділення підтегів + КОНТЕКСТНА синхронізація)
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
     * Видалення цілого стовпця з таблиці (зняття виділення з усіх ліній із цим шляхом)
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
     * Видалення конкретної клітинки в таблиці
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
     * Форматує дані карток у плоску таблицю для експорту (CSV, SQLite, JSON)
     */
    static extractTableData(results) {
        const activeCards = results.filter((c) => c.cardChecked);
        if (activeCards.length === 0) return [];

        // Збираємо унікальні заголовки (шляхи тегів)
        const columnsSet = new Set();
        activeCards.forEach((card) => {
            card.lines.forEach((line) => {
                if (line.checked && !line.isHtmlTag && line.semanticPath) {
                    columnsSet.add(line.semanticPath);
                }
            });
        });
        const columns = Array.from(columnsSet);

        // Будуємо рядки
        return activeCards.map((card, idx) => {
            // Базові системні поля
            const rowObj = {
                '№': idx + 1,
                ID: card.id,
                URL: card.url || '',
                Image: card.img || '',
            };

            // Динамічні поля на основі вибраної структури
            columns.forEach((col) => {
                const line = card.lines.find(
                    (l) => l.semanticPath === col && !l.isHtmlTag && l.checked,
                );
                rowObj[col] = line ? line.text : ''; // Якщо даних немає в цій картці, лишаємо порожнім
            });

            return rowObj;
        });
    }
}
