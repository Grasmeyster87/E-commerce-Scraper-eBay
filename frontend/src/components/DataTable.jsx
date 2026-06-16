import { useState } from 'react';

/**
 * DataTable Component
 * Renders a spreadsheet-style table view of all active (checked) cards.
 * Supports paginated display, column/row/cell deletion, and block-based column grouping.
 *
 * @param {Object[]} results - Full results array containing all scraped cards.
 * @param {Function} onDeleteRow - Callback to toggle a card's checked state (removes from table).
 * @param {Function} onDeleteColumn - Callback to remove an entire column by semantic path.
 * @param {Function} onDeleteCell - Callback to remove a single cell by card ID and semantic path.
 * @param {number} itemsPerPageSelection - Number of rows displayed per table page.
 * @param {Function} onClose - Callback to return to the card feed view.
 * @param {string} visualizerLayout - Layout strategy mode for rendering standard or unified columns.
 */
export default function DataTable({
    results,
    onDeleteRow,
    onDeleteColumn,
    onDeleteCell,
    itemsPerPageSelection,
    onClose,
    visualizerLayout = 'structural_for_standart_date', // <--- ДОДАНО НОВИЙ ПРОП
}) {
    // Filter results to only include cards marked for saving
    const activeCards = results.filter((c) => c.cardChecked);

    // --- TABLE PAGINATION STATE ---
    const [tablePage, setTablePage] = useState(1);
    const itemsPerPage = itemsPerPageSelection || 60;

    // Total number of pages based on active card count
    const totalPages = Math.max(
        1,
        Math.ceil(activeCards.length / itemsPerPage),
    );

    // Auto-correct page if row deletion leaves current page empty
    const actualPage = tablePage > totalPages ? totalPages : tablePage;
    if (actualPage !== tablePage) {
        setTablePage(actualPage);
    }

    // Slice the active cards array for the current page
    const displayedCards = activeCards.slice(
        (actualPage - 1) * itemsPerPage,
        actualPage * itemsPerPage,
    );

    // --- DYNAMIC COLUMN GENERATION ---
    // Extract unique semantic paths to build table headers dynamically
    const columnsSet = new Set();
    activeCards.forEach((card) => {
        card.lines.forEach((line) => {
            if (line.checked && !line.isHtmlTag && line.semanticPath) {
                columnsSet.add(line.semanticPath);
            }
        });
    });

    // Sort columns alphabetically, but grouped by Block number (B1, B2, etc.)
    const columns = Array.from(columnsSet).sort((a, b) => {
        const matchA = a.match(/^B(\d+)_/);
        const matchB = b.match(/^B(\d+)_/);
        if (matchA && matchB) {
            if (matchA[1] !== matchB[1])
                return parseInt(matchA[1]) - parseInt(matchB[1]);
        }
        return a.localeCompare(b);
    });

    // Track sequential numbering for displaying clean column names per block
    const blockCounters = {};
    const colDisplayNumbers = {};
    columns.forEach((col) => {
        const match = col.match(/^B(\d+)_/);
        const b = match ? match[1] : '99';
        if (!blockCounters[b]) blockCounters[b] = 1;
        colDisplayNumbers[col] = blockCounters[b]++;
    });

    // --- NEW: SEMANTIC BLOCK 1 CLASSIFIER LOGIC ---
    const isStandardMode = visualizerLayout === 'structural_for_standart_date';
    
    const isObfuscatedSponsored = (text) => {
        if (!text) return false;
        const lower = text.toLowerCase();
        const lettersOnly = lower.replace(/[^a-z]/g, '');
        if (lettersOnly === 'sponsored' || lettersOnly === 'derosnops') return true;
        const sorted = lettersOnly.split('').sort().join('');
        if (sorted === 'denooprss') return true;
        return false;
    };

    // Separate native columns into B1 (for splitting) and the rest (B2, B3, etc. for normal mapping)
    const otherColumns = columns.filter(c => !c.startsWith('B1_'));
    let activeColumnsToMap = isStandardMode ? otherColumns : columns;

    if (isStandardMode) {
        let hasSponsored = false;
        // Find B3 columns that are EXCLUSIVELY sponsored, so we can hide them completely
        const exclusivelySponsoredB3Cols = new Set();
        otherColumns.forEach(col => {
            if (col.startsWith('B3_')) {
                let hasData = false;
                let allSponsored = true;
                for (const card of activeCards) {
                    const line = card.lines.find(l => l.semanticPath === col && !l.isHtmlTag && l.checked);
                    if (line) {
                        hasData = true;
                        if (isObfuscatedSponsored(line.text)) {
                            hasSponsored = true;
                        } else {
                            allSponsored = false;
                        }
                    }
                }
                if (hasData && allSponsored) {
                    exclusivelySponsoredB3Cols.add(col);
                }
            }
        });
        activeColumnsToMap = activeColumnsToMap.filter(col => !exclusivelySponsoredB3Cols.has(col));
        
        if (hasSponsored) {
            activeColumnsToMap.push('B3_Sponsored');
            activeColumnsToMap.sort((a, b) => {
                const matchA = a.match(/^B(\d+)_/);
                const matchB = b.match(/^B(\d+)_/);
                if (matchA && matchB) {
                    if (matchA[1] !== matchB[1]) return parseInt(matchA[1]) - parseInt(matchB[1]);
                }
                return a.localeCompare(b);
            });
            colDisplayNumbers['B3_Sponsored'] = 'Sponsored';
        }
    }

    /**
     * Evaluates a single token descriptor node and maps it into one of the 7 predefined slots.
     * @param {Object} line - Target node layout artifact.
     * @returns {number} Evaluated semantic index category slot identifier (1 to 7).
     */
    const classifyBlock1Token = (line) => {
        const textLower = (line.text || '').toLowerCase().trim();
        const tagsPath = (line.htmlTagsPath || '').toLowerCase();

        if (!textLower) return 7;

        // 1. New Listing markers
        if (textLower === 'new listing' || textLower.includes('new listing')) return 1;

        // 2. Price drop anomalies markers
        if (textLower === 'new low price' || textLower.includes('new low price')) return 2;

        // 3. Core Product Title (prioritizes metadata keywords or primary styling flags)
        if (tagsPath.includes('primary') || /\btitle\b/.test(tagsPath) || tagsPath.includes('__title')) return 3;

        // 4. Standard commercial item condition terms mapping
        const commercialConditions = [
            'brand new', 'pre-owned', 'new (other)', 'good - refurbished',
            'very good - refurbished', 'excellent - refurbished', 'open box',
            'used', 'seller refurbished', 'for parts or not working',
            'certified refurbished', 'like new', 'new without tags', 'nwot',
            'new with tags', 'nwt', 'refurbished', 'new other (see details)'
        ];
        if (commercialConditions.some(cond => textLower === cond || textLower.includes(cond))) return 4;

        // 5. Core marketplace ratings and feedback indicators
        if (textLower.includes('rating') || textLower.includes('★') || textLower.includes('stars') || /^\d+(\.\d+)?\s*(out of 5|stars)/i.test(textLower)) return 5;

        // 6. Specific product edition classification
        if (textLower.includes('standard edition')) return 6;

        // Fallback heuristic for product title recognition
        if (textLower.length > 25 && !textLower.includes('ebay') && !textLower.includes('stock') && !textLower.includes('feedback')) return 3;

        // 7. Remainder / Auxiliary custom listing strings
        return 7;
    };

    // Static definitions for the 7 new split columns
    const standardB1Headers = [
        { id: 1, label: '1. New Listing', bg: 'bg-blue-900/10' },
        { id: 2, label: '2. Low Price', bg: 'bg-red-900/10' },
        { id: 3, label: '3. Product Title', bg: 'bg-indigo-900/10' },
        { id: 4, label: '4. Condition', bg: 'bg-emerald-900/10' },
        { id: 5, label: '5. Ratings', bg: 'bg-amber-900/10' },
        { id: 6, label: '6. Edition', bg: 'bg-purple-900/10' },
        { id: 7, label: '7. Other Data', bg: 'bg-slate-800/30' },
    ];

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[calc(100vh-6rem)]">
            {/* --- TABLE CONTROL BAR --- */}
            <div className="flex flex-wrap items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50 gap-4">
                <button
                    onClick={onClose}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                >
                    ⬅ Back to Feed
                </button>

                {/* Pagination Controls */}
                <div className="flex items-center gap-4 text-sm font-semibold text-indigo-300 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
                    <span>Rows per page ({itemsPerPage}):</span>
                    <button
                        onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                        disabled={tablePage === 1}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-3 py-1 rounded-md transition-colors"
                    >
                        ◀
                    </button>
                    <span className="bg-indigo-500/20 px-3 py-1 rounded-md text-indigo-200 border border-indigo-500/30">
                        {tablePage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                        disabled={tablePage === totalPages}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-3 py-1 rounded-md transition-colors"
                    >
                        ▶
                    </button>
                </div>

                <div className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-900/50">
                    Total Rows: {activeCards.length}
                </div>
            </div>

            {/* --- TABLE DATA CONTAINER --- */}
            <div className="flex-1 overflow-auto custom-scrollbar p-1">
                <table className="w-full text-left border-collapse text-sm text-slate-300">
                    {/* Fixed Header */}
                    <thead className="bg-slate-950/95 sticky top-0 z-10 shadow-sm border-b border-slate-800">
                        <tr>
                            <th rowSpan={isStandardMode ? 2 : 1} className="p-3 border-r border-slate-800 font-semibold text-slate-400 w-16 text-center">№</th>
                            <th rowSpan={isStandardMode ? 2 : 1} className="p-3 border-r border-slate-800 font-semibold text-slate-400 w-32">Entity ID</th>

                            {/* Standard B1 Split Headers - Row 1 (Block Grouping) */}
                            {isStandardMode && standardB1Headers.map((header) => (
                                <th key={`std-header-r1-${header.id}`} className={`p-2 border-r border-slate-800/50 font-mono text-xs text-indigo-300 relative group w-10 min-w-15 ${header.bg} ${isStandardMode ? 'border-b' : ''}`}>
                                    <div className="flex justify-center items-center h-full px-2">
                                        <div className="flex flex-col items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity text-center">
                                            <span className="text-[10px] text-slate-500 leading-none">Block 1</span>
                                            <span className="font-bold text-slate-300">{header.id}</span>
                                        </div>
                                    </div>
                                </th>
                            ))}

                            {/* Dynamic Headers (Unified or Remainder) */}
                            {activeColumnsToMap.map((col) => {
                                let samplePath = col;
                                for (const c of activeCards) {
                                    const l = c.lines.find((x) => x.semanticPath === col);
                                    if (l && l.htmlTagsPath) {
                                        samplePath = l.htmlTagsPath;
                                        break;
                                    }
                                }

                                const match = col.match(/^B(\d+)_/);
                                let displayTitle = colDisplayNumbers[col];
                                let blockNum = 'Field';
                                let bgClass = '';
                                if (match) {
                                    blockNum = match[1] === '99' ? 'Other' : `Block ${match[1]}`;
                                    if (match[1] === '1') bgClass = 'bg-blue-900/10 border-blue-800/30';
                                    else if (match[1] === '2') bgClass = 'bg-emerald-900/10 border-emerald-800/30';
                                    else if (match[1] === '3') bgClass = 'bg-purple-900/10 border-purple-800/30';
                                }

                                return (
                                    <th key={col} rowSpan={isStandardMode ? 2 : 1} className={`p-2 border-r border-slate-800/50 font-mono text-xs text-indigo-300 relative group w-10 min-w-15 ${bgClass}`}>
                                        <div className="flex justify-center items-center h-full cursor-help px-2" title={samplePath}>
                                            <div className="flex flex-col items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[10px] text-slate-500 leading-none">{blockNum}</span>
                                                <span className="font-bold text-slate-300">{displayTitle}</span>
                                            </div>
                                            <button
                                                onClick={() => onDeleteColumn(col)}
                                                className="text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 w-5 h-5 flex justify-center items-center rounded font-sans font-bold text-xs transition-all opacity-0 group-hover:opacity-100 absolute top-1 right-1"
                                                title="Drop column from dataset"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>

                        {/* SECOND ROW (Only in Standard Mode) */}
                        {isStandardMode && (
                            <tr>
                                {standardB1Headers.map((header) => (
                                    <th key={`std-header-r2-${header.id}`} className={`p-1.5 border-r border-slate-800/50 font-mono text-xs text-indigo-300 relative ${header.bg}`}>
                                        <div className="flex flex-col items-center justify-center opacity-80 text-center">
                                            <span className="font-bold text-slate-300 whitespace-nowrap text-[10px] px-1">{header.label}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        )}
                    </thead>
                    
                    {/* Table Body */}
                    <tbody className="divide-y divide-slate-800/50">
                        {displayedCards.map((card, idx) => {
                            const absoluteIndex = (tablePage - 1) * itemsPerPage + idx + 1;

                            // Group B1 elements if in Standard Mode
                            const b1Slots = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
                            if (isStandardMode) {
                                card.lines.forEach(line => {
                                    if (line.checked && !line.isHtmlTag && line.semanticPath?.startsWith('B1_')) {
                                        const slotId = classifyBlock1Token(line);
                                        b1Slots[slotId].push(line);
                                    }
                                });
                            }

                            return (
                                <tr key={card.id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="p-3 border-r border-slate-800 text-center font-medium bg-slate-950/20 sticky left-0">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-slate-400">{absoluteIndex}</span>
                                            <button onClick={() => onDeleteRow(card.id)} className="text-red-500 hover:text-red-400 w-5 h-5 rounded hover:bg-red-500/10 font-sans font-bold text-xs transition-colors flex items-center justify-center" title="Exclude entity from export">✕</button>
                                        </div>
                                    </td>
                                    <td className="p-3 border-r border-slate-800 bg-slate-950/20">
                                        <a href={card.url} target="_blank" rel="noreferrer" className="text-cyan-500 hover:underline font-mono text-xs">{card.id}</a>
                                    </td>

                                    {/* Render Structured Standard B1 Columns */}
                                    {isStandardMode && standardB1Headers.map((header) => (
                                        <td key={`std-cell-${header.id}`} className={`p-3 border-r border-slate-800/40 whitespace-nowrap min-w-37.5 group/cell relative ${header.bg}`}>
                                            <div className="flex flex-col gap-2 min-h-6 justify-center">
                                                {b1Slots[header.id].map((line, i) => (
                                                    <div key={i} className="flex items-center justify-between gap-4 group/std" title={line.htmlTagsPath}>
                                                        <span className="text-slate-200 font-medium">{line.text}</span>
                                                        <button 
                                                            onClick={() => onDeleteCell(card.id, line.semanticPath)} 
                                                            className="text-red-500/50 hover:text-red-400 hover:bg-red-500/10 font-sans font-bold text-xs w-5 h-5 rounded transition-colors opacity-0 group-hover/std:opacity-100 flex items-center justify-center shrink-0"
                                                            title="Clear cell content"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                                {b1Slots[header.id].length === 0 && <span className="text-slate-700 select-none flex justify-center">-</span>}
                                            </div>
                                        </td>
                                    ))}

                                    {/* Render Unified / Remainder Columns */}
                                    {activeColumnsToMap.map((col) => {
                                        let line = null;
                                        if (col === 'B3_Sponsored') {
                                            line = card.lines.find((l) => l.semanticPath?.startsWith('B3_') && !l.isHtmlTag && l.checked && isObfuscatedSponsored(l.text));
                                        } else {
                                            line = card.lines.find((l) => 
                                                l.semanticPath === col && 
                                                !l.isHtmlTag && 
                                                l.checked && 
                                                !(isStandardMode && col.startsWith('B3_') && isObfuscatedSponsored(l.text))
                                            );
                                        }
                                        const match = col.match(/^B(\d+)_/);
                                        let bgClass = '';
                                        if (match) {
                                            if (match[1] === '1') bgClass = 'bg-blue-900/5';
                                            else if (match[1] === '2') bgClass = 'bg-emerald-900/5';
                                            else if (match[1] === '3') bgClass = 'bg-purple-900/5';
                                        }

                                        return (
                                            <td key={col} className={`p-3 border-r border-slate-800/40 whitespace-nowrap min-w-37.5 group/cell relative ${bgClass}`}>
                                                {line ? (
                                                    <div className="flex items-center justify-between gap-4" title={line.htmlTagsPath || ''}>
                                                        <span className="text-slate-200 font-medium">{line.text}</span>
                                                        <button
                                                            onClick={() => {
                                                                if (col === 'B3_Sponsored') {
                                                                    onDeleteCell(card.id, line.semanticPath);
                                                                } else {
                                                                    onDeleteCell(card.id, col);
                                                                }
                                                            }}
                                                            className="text-red-500/50 hover:text-red-400 hover:bg-red-500/10 font-sans font-bold text-xs w-5 h-5 rounded transition-colors opacity-0 group-hover/cell:opacity-100 flex items-center justify-center shrink-0"
                                                            title="Clear cell content"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-700 select-none flex justify-center">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Empty State Fallback */}
                {activeCards.length === 0 && (
                    <div className="p-10 text-center text-slate-500">
                        No active entities to display. Toggle the "Save" checkbox on target items.
                    </div>
                )}
            </div>
        </div>
    );
}