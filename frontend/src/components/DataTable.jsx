import { useState} from 'react';

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
 */
export default function DataTable({
    results,
    onDeleteRow,
    onDeleteColumn,
    onDeleteCell,
    itemsPerPageSelection,
    onClose,
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
                        onClick={() =>
                            setTablePage((p) => Math.min(totalPages, p + 1))
                        }
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
                            <th className="p-3 border-r border-slate-800 font-semibold text-slate-400 w-16 text-center">
                                №
                            </th>
                            <th className="p-3 border-r border-slate-800 font-semibold text-slate-400 w-32">
                                Entity ID
                            </th>

                            {columns.map((col) => {
                                // Extract hover preview path for column headers
                                let samplePath = col;
                                for (const c of activeCards) {
                                    const l = c.lines.find(
                                        (x) => x.semanticPath === col,
                                    );
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
                                    blockNum =
                                        match[1] === '99'
                                            ? 'Other'
                                            : `Block ${match[1]}`;
                                    if (match[1] === '1')
                                        bgClass = 'bg-blue-900/10 border-blue-800/30';
                                    else if (match[1] === '2')
                                        bgClass = 'bg-emerald-900/10 border-emerald-800/30';
                                    else if (match[1] === '3')
                                        bgClass = 'bg-purple-900/10 border-purple-800/30';
                                }

                                return (
                                    <th
                                        key={col}
                                        className={`p-2 border-r border-slate-800/50 font-mono text-xs text-indigo-300 relative group w-10 min-w-15 ${bgClass}`}
                                    >
                                        <div
                                            className="flex justify-center items-center h-full cursor-help px-2"
                                            title={samplePath}
                                        >
                                            <div className="flex flex-col items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[10px] text-slate-500 leading-none">
                                                    {blockNum}
                                                </span>
                                                <span className="font-bold text-slate-300">
                                                    {displayTitle}
                                                </span>
                                            </div>

                                            {/* Column Deletion Action */}
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
                    </thead>
                    
                    {/* Table Body */}
                    <tbody className="divide-y divide-slate-800/50">
                        {displayedCards.map((card, idx) => {
                            // Calculate global row index across all paginated views
                            const absoluteIndex =
                                (tablePage - 1) * itemsPerPage + idx + 1;

                            return (
                                <tr
                                    key={card.id}
                                    className="hover:bg-slate-800/40 transition-colors"
                                >
                                    {/* Row Index & Delete Action */}
                                    <td className="p-3 border-r border-slate-800 text-center font-medium bg-slate-950/20 sticky left-0">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-slate-400">
                                                {absoluteIndex}
                                            </span>
                                            <button
                                                onClick={() => onDeleteRow(card.id)}
                                                className="text-red-500 hover:text-red-400 w-5 h-5 rounded hover:bg-red-500/10 font-sans font-bold text-xs transition-colors flex items-center justify-center"
                                                title="Exclude entity from export"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </td>

                                    {/* Entity Identifier (Link) */}
                                    <td className="p-3 border-r border-slate-800 bg-slate-950/20">
                                        <a
                                            href={card.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-cyan-500 hover:underline font-mono text-xs"
                                        >
                                            {card.id}
                                        </a>
                                    </td>

                                    {/* Dynamic Data Cells */}
                                    {columns.map((col) => {
                                        const line = card.lines.find(
                                            (l) =>
                                                l.semanticPath === col &&
                                                !l.isHtmlTag &&
                                                l.checked,
                                        );

                                        const match = col.match(/^B(\d+)_/);
                                        let bgClass = '';
                                        if (match) {
                                            if (match[1] === '1') bgClass = 'bg-blue-900/5';
                                            else if (match[1] === '2') bgClass = 'bg-emerald-900/5';
                                            else if (match[1] === '3') bgClass = 'bg-purple-900/5';
                                        }

                                        return (
                                            <td
                                                key={col}
                                                className={`p-3 border-r border-slate-800/40 whitespace-nowrap min-w-37.5 group/cell relative ${bgClass}`}
                                            >
                                                {line ? (
                                                    <div
                                                        className="flex items-center justify-between gap-4"
                                                        title={line.htmlTagsPath || ''}
                                                    >
                                                        <span className="text-slate-200 font-medium wrap-break-word line-clamp-3">
                                                            {line.text}
                                                        </span>
                                                        <button
                                                            onClick={() => onDeleteCell(card.id, col)}
                                                            className="text-red-500/50 hover:text-red-400 hover:bg-red-500/10 font-sans font-bold text-xs w-5 h-5 rounded transition-colors opacity-0 group-hover/cell:opacity-100 flex items-center justify-center shrink-0"
                                                            title="Clear cell content"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-700 select-none flex justify-center">
                                                        -
                                                    </span>
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