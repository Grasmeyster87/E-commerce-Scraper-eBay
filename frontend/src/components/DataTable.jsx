import React, { useState, useEffect } from 'react';

export default function DataTable({ results, onDeleteRow, onDeleteColumn, onDeleteCell, itemsPerPageSelection, onClose }) {
    const activeCards = results.filter((c) => c.cardChecked);

    // --- ПАГІНАЦІЯ ДЛЯ ТАБЛИЦІ ---
    const [tablePage, setTablePage] = useState(1);
    const itemsPerPage = itemsPerPageSelection || 60;
    
    // Розрахунок сторінок
    const totalPages = Math.max(1, Math.ceil(activeCards.length / itemsPerPage));
    
    // Якщо при видаленні рядка ми опинилися на "порожній" сторінці — повертаємося назад
    useEffect(() => {
        if (tablePage > totalPages) setTablePage(totalPages);
    }, [totalPages, tablePage]);

    // Обрізаємо масив карток для поточної сторінки
    const displayedCards = activeCards.slice((tablePage - 1) * itemsPerPage, tablePage * itemsPerPage);

    // --- ФОРМУВАННЯ СТОВПЦІВ (на основі ВСІХ activeCards, щоб структура не стрибала) ---
    const columnsSet = new Set();
    activeCards.forEach((card) => {
        card.lines.forEach((line) => {
            if (line.checked && !line.isHtmlTag && line.semanticPath) {
                columnsSet.add(line.semanticPath);
            }
        });
    });
    
    const columns = Array.from(columnsSet).sort((a, b) => {
        const matchA = a.match(/^B(\d+)_/);
        const matchB = b.match(/^B(\d+)_/);
        if (matchA && matchB) {
            if (matchA[1] !== matchB[1]) return parseInt(matchA[1]) - parseInt(matchB[1]);
        }
        return a.localeCompare(b);
    });

    const blockCounters = {};
    const colDisplayNumbers = {};
    columns.forEach(col => {
        const match = col.match(/^B(\d+)_/);
        const b = match ? match[1] : '99';
        if (!blockCounters[b]) blockCounters[b] = 1;
        colDisplayNumbers[col] = blockCounters[b]++;
    });

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[calc(100vh-6rem)]">
            
            {/* --- ВЕРХНЯ ПАНЕЛЬ КЕРУВАННЯ ТАБЛИЦЕЮ --- */}
            <div className="flex flex-wrap items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50 gap-4">
                <button 
                    onClick={onClose} 
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                >
                    ⬅ Повернутися до карток
                </button>

                {/* Блок пагінації */}
                <div className="flex items-center gap-4 text-sm font-semibold text-indigo-300 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
                    <span>Відображення ({itemsPerPage} на стор.):</span>
                    <button
                        onClick={() => setTablePage(p => Math.max(1, p - 1))}
                        disabled={tablePage === 1}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-3 py-1 rounded-md transition-colors"
                    >
                        ◀
                    </button>
                    <span className="bg-indigo-500/20 px-3 py-1 rounded-md text-indigo-200 border border-indigo-500/30">
                        {tablePage} / {totalPages}
                    </span>
                    <button
                        onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                        disabled={tablePage === totalPages}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-3 py-1 rounded-md transition-colors"
                    >
                        ▶
                    </button>
                </div>

                <div className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-900/50">
                    Всього в таблиці: {activeCards.length}
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-1">
                <table className="w-full text-left border-collapse text-sm text-slate-300">
                    <thead className="bg-slate-950/95 sticky top-0 z-10 shadow-sm border-b border-slate-800">
                        <tr>
                            <th className="p-3 border-r border-slate-800 font-semibold text-slate-400 w-16 text-center">№</th>
                            <th className="p-3 border-r border-slate-800 font-semibold text-slate-400 w-32">ID / URL</th>
                            
                            {columns.map((col, idx) => {
                                let samplePath = col;
                                for (const c of activeCards) {
                                    const l = c.lines.find(x => x.semanticPath === col);
                                    if (l && l.htmlTagsPath) {
                                        samplePath = l.htmlTagsPath;
                                        break;
                                    }
                                }

                                const match = col.match(/^B(\d+)_/);
                                let displayTitle = colDisplayNumbers[col];
                                let blockNum = 'Поле';
                                let bgClass = '';
                                if (match) {
                                    blockNum = match[1] === '99' ? 'Інше' : `Блок ${match[1]}`;
                                    if (match[1] === '1') bgClass = 'bg-blue-900/10 border-blue-800/30';
                                    else if (match[1] === '2') bgClass = 'bg-emerald-900/10 border-emerald-800/30';
                                    else if (match[1] === '3') bgClass = 'bg-purple-900/10 border-purple-800/30';
                                }

                                return (
                                <th key={col} className={`p-2 border-r border-slate-800/50 font-mono text-xs text-indigo-300 relative group w-10 min-w-[60px] ${bgClass}`}>
                                    <div className="flex justify-center items-center h-full cursor-help px-2" title={samplePath}>
                                        <div className="flex flex-col items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[10px] text-slate-500 leading-none">{blockNum}</span>
                                            <span className="font-bold text-slate-300">{displayTitle}</span>
                                        </div>
                                        
                                        <button 
                                            onClick={() => onDeleteColumn(col)}
                                            className="text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 w-5 h-5 flex justify-center items-center rounded font-sans font-bold text-xs transition-all opacity-0 group-hover:opacity-100 absolute top-1 right-1"
                                            title="Видалити весь стовпець з даних"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {/* ОНОВЛЕНО: Тепер ми ітеруємося по displayedCards (пагінація), а не по всьому масиву */}
                        {displayedCards.map((card, idx) => {
                            // Абсолютний індекс для коректного "№" рядка
                            const absoluteIndex = (tablePage - 1) * itemsPerPage + idx + 1;
                            
                            return (
                                <tr key={card.id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="p-3 border-r border-slate-800 text-center font-medium bg-slate-950/20 sticky left-0">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-slate-400">{absoluteIndex}</span>
                                            <button 
                                                onClick={() => onDeleteRow(card.id)}
                                                className="text-red-500 hover:text-red-400 w-5 h-5 rounded hover:bg-red-500/10 font-sans font-bold text-xs transition-colors flex items-center justify-center"
                                                title="Видалити рядок (зняти галочку з картки)"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </td>
                                    
                                    <td className="p-3 border-r border-slate-800 bg-slate-950/20">
                                        <a href={card.url} target="_blank" rel="noreferrer" className="text-cyan-500 hover:underline font-mono text-xs">
                                            {card.id}
                                        </a>
                                    </td>

                                    {columns.map((col) => {
                                        const line = card.lines.find((l) => l.semanticPath === col && !l.isHtmlTag && l.checked);
                                        
                                        const match = col.match(/^B(\d+)_/);
                                        let bgClass = '';
                                        if (match) {
                                            if (match[1] === '1') bgClass = 'bg-blue-900/5';
                                            else if (match[1] === '2') bgClass = 'bg-emerald-900/5';
                                            else if (match[1] === '3') bgClass = 'bg-purple-900/5';
                                        }
                                        
                                        return (
                                            <td key={col} className={`p-3 border-r border-slate-800/40 whitespace-nowrap min-w-[150px] group/cell relative ${bgClass}`}>
                                                {line ? (
                                                    <div className="flex items-center justify-between gap-4" title={line.htmlTagsPath || ''}>
                                                        <span className="text-slate-200 font-medium">{line.text}</span>
                                                        <button 
                                                            onClick={() => onDeleteCell(card.id, col)}
                                                            className="text-red-500/50 hover:text-red-400 hover:bg-red-500/10 font-sans font-bold text-xs w-5 h-5 rounded transition-colors opacity-0 group-hover/cell:opacity-100 flex items-center justify-center shrink-0"
                                                            title="Видалити клітинку"
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
                {activeCards.length === 0 && (
                    <div className="p-10 text-center text-slate-500">
                        Немає активних карток для відображення. Позначте чекбокс "Зберігати" на потрібних картках.
                    </div>
                )}
            </div>
        </div>
    );
}