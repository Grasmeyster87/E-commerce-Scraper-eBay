// src/services/CardService.js

export class CardService {
    /**
     * Первинна обробка масиву карток з бекенду та генерація семантичних шляхів
     */
    static processRawData(rawData) {
        return rawData.map(card => {
            const maxDepth = card.lines.reduce((max, line) => Math.max(max, parseInt(line.depth || 0, 10)), 0);
            
            let currentPathTracker = [];
            const linesWithPaths = card.lines.map(line => {
                const depth = parseInt(line.depth || 0, 10);
                const isHtmlTag = line.isStructure === true || (typeof line.text === 'string' && line.text.trim().startsWith('<'));
                
                if (isHtmlTag) {
                    currentPathTracker[depth] = line.text.trim();
                    currentPathTracker = currentPathTracker.slice(0, depth + 1);
                    return { ...line, isHtmlTag, semanticPath: null };
                } else {
                    const semanticPath = currentPathTracker.slice(0, depth).filter(Boolean).join(' > ');
                    return { ...line, isHtmlTag, semanticPath };
                }
            });

            return {
                ...card,
                lines: linesWithPaths,
                maxDepth: maxDepth,
                currentDepth: maxDepth, 
                uniqueness: true, 
                showCleanText: false, 
                saveCardLink: true,   
                saveImgLink: true     
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
        if (parsedValue > originCard.maxDepth) parsedValue = originCard.maxDepth;

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
     * Робота з чекбоксами рядків (каскадне виділення підтегів + кроскарткова синхронізація тексту)
     */
    static toggleLineCheck(results, cardId, lineIndex) {
        const originCard = results.find((c) => c.id === cardId);
        if (!originCard) return results;

        const targetLine = originCard.lines.find((l) => l.index === lineIndex);
        if (!targetLine) return results;

        const nextCheckedState = !targetLine.checked;
        const targetText = targetLine.text;
        const isUniqueSync = originCard.uniqueness !== false;

        return results.map((card) => {
            if (card.id !== cardId && !isUniqueSync) return card;

            const newLines = card.lines.map((line) => ({ ...line }));

            if (card.id === cardId) {
                const targetIdx = newLines.findIndex((l) => l.index === lineIndex);
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
                    if (newLines[i].text === targetText) {
                        newLines[i].checked = nextCheckedState;
                        const parentDepth = newLines[i].depth;

                        let j = i + 1;
                        while (j < newLines.length && newLines[j].depth > parentDepth) {
                            newLines[j].checked = nextCheckedState;
                            j++;
                        }
                    }
                }
            }

            return { ...card, lines: newLines };
        });
    }
}