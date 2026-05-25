// src/components/DataTable.jsx
import React from 'react';

export default function DataTable({ results, onDeleteRow, onDeleteColumn, onDeleteCell }) {
    const activeCards = results.filter((c) => c.cardChecked);

    const columnsSet = new Set();
    activeCards.forEach((card) => {
        card.lines.forEach((line) => {
            if (line.checked && !line.isHtmlTag && line.semanticPath) {
                columnsSet.add(line.semanticPath);
            }
        });
    });
    const columns = Array.from(columnsSet);

    return (
        // Встановлюємо жорстку висоту для контейнера, щоб скролбар таблиці завжди був у межах екрана браузера!
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col h-[calc(100vh-6rem)]">
            
            {/* Саме цей блок отримує свій скролбар, який завжди видимий */}
            <div className="flex-1 overflow-auto custom-scrollbar p-1">
            
                <table className="w-full text-left border-collapse text-sm text-slate-300">
                    <thead className="bg-slate-950/95 sticky top-0 z-10 shadow-sm border-b border-slate-800">
                        <tr>
                            <th className="p-3 border-r border-slate-800 font-semibold text-slate-400 w-16 text-center">
                                №
                            </th>
                            <th className="p-3 border-r border-slate-800 font-semibold text-slate-400 w-32">
                                ID / URL
                            </th>
                            
                            {/* МІНІМАЛІСТИЧНІ ЗАГОЛОВКИ */}
                            {columns.map((col, idx) => (
                                <th key={col} className="p-2 border-r border-slate-800/50 font-mono text-xs text-indigo-300 relative group w-10 min-w-[60px]">
                                    <div className="flex justify-center items-center h-full cursor-help px-2" title={col}>
                                        <div className="flex flex-col items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[10px] text-slate-500 leading-none">Поле</span>
                                            <span className="font-bold text-slate-300">{idx + 1}</span>
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
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {activeCards.map((card, idx) => (
                            <tr key={card.id} className="hover:bg-slate-800/40 transition-colors">
                                {/* № рядка */}
                                <td className="p-3 border-r border-slate-800 text-center font-medium bg-slate-950/20 sticky left-0">
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-slate-400">{idx + 1}</span>
                                        <button 
                                            onClick={() => onDeleteRow(card.id)}
                                            className="text-red-500 hover:text-red-400 w-5 h-5 rounded hover:bg-red-500/10 font-sans font-bold text-xs transition-colors flex items-center justify-center"
                                            title="Видалити рядок (зняти галочку з картки)"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </td>
                                
                                {/* ID картки */}
                                <td className="p-3 border-r border-slate-800 bg-slate-950/20">
                                    <a href={card.url} target="_blank" rel="noreferrer" className="text-cyan-500 hover:underline font-mono text-xs">
                                        {card.id}
                                    </a>
                                </td>

                                {/* КЛІТИНКИ З ДАНИМИ (Ширина визначається контентом завдяки whitespace-nowrap) */}
                                {columns.map((col) => {
                                    const line = card.lines.find((l) => l.semanticPath === col && !l.isHtmlTag && l.checked);
                                    
                                    return (
                                        <td key={col} className="p-3 border-r border-slate-800/40 whitespace-nowrap min-w-[150px] group/cell relative">
                                            {line ? (
                                                <div className="flex items-center justify-between gap-4">
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
                        ))}
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