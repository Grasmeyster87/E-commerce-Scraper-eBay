import React from 'react';

export default function ProductCard({
    card,
    toggleCardCheck,
    toggleUniquenessCheck,
    handleDepthChange,
    toggleCleanText,
    toggleLinkSave,
    toggleLineCheck
}) {
    return (
        <div
            className={`bg-slate-900/60 backdrop-blur border p-5 rounded-2xl shadow-xl flex flex-col gap-4 transition-all duration-300 ${card.cardChecked ? 'border-slate-800 opacity-100' : 'border-slate-900/40 opacity-40'}`}
        >
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-slate-950/60 border border-slate-800/60 p-3 px-4 rounded-xl shrink-0">
                <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer transition-transform active:scale-95"
                        checked={card.cardChecked}
                        onChange={() =>
                            toggleCardCheck(card.id)
                        }
                    />
                    <span>Зберігати</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer select-none border-l border-slate-800 pl-4 sm:pl-6">
                    <input
                        type="checkbox"
                        className="w-4 h-4 accent-indigo-500 rounded cursor-pointer transition-transform active:scale-95"
                        checked={
                            card.uniqueness !== false
                        }
                        onChange={() =>
                            toggleUniquenessCheck(
                                card.id,
                            )
                        }
                    />
                    <span>Унікальність</span>
                </label>

                <div className="flex items-center gap-2 border-l border-slate-800 pl-4 sm:pl-6 mr-auto">
                    <label
                        htmlFor={`counter-${card.id}`}
                        className="text-xs sm:text-sm font-semibold text-slate-200 select-none"
                    >
                        Глибина:
                    </label>
                    <div className="relative flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden focus-within:border-cyan-500 transition-colors">
                        <input
                            type="number"
                            id={`counter-${card.id}`}
                            min="0"
                            max={card.maxDepth}
                            step="1"
                            value={card.currentDepth}
                            onChange={(e) =>
                                handleDepthChange(
                                    card.id,
                                    e.target.value,
                                )
                            }
                            className="w-14 sm:w-16 bg-transparent text-center text-sm font-mono text-cyan-400 py-1 px-1 focus:outline-none"
                        />
                        <div className="flex flex-col border-l border-slate-700">
                            <button
                                type="button"
                                onClick={() =>
                                    handleDepthChange(
                                        card.id,
                                        card.currentDepth +
                                            1,
                                    )
                                }
                                className="px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] leading-none py-0.5 border-b border-slate-700"
                            >
                                ▲
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    handleDepthChange(
                                        card.id,
                                        card.currentDepth -
                                            1,
                                    )
                                }
                                className="px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] leading-none py-0.5"
                            >
                                ▼
                            </button>
                        </div>
                    </div>
                    <span className="text-xs font-mono text-slate-500 select-none">
                        / {card.maxDepth}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        toggleCleanText(card.id)
                    }
                    className={`text-xs font-bold px-4 py-2 rounded-xl border transition-all duration-200 select-none ${card.showCleanText ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20' : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-slate-100'}`}
                >
                    {card.showCleanText
                        ? '✨ Показати структуру'
                        : '📄 Показати Картку'}
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-5">
                <div className="flex flex-col w-full md:w-44 shrink-0 gap-3">
                    {card.img && (
                        <div className="w-full h-44 bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center p-2 relative group">
                            <img
                                src={card.img}
                                alt="Product"
                                className="object-contain max-w-full max-h-full transition-transform duration-300 group-hover:scale-105"
                            />
                        </div>
                    )}
                    <div className="bg-slate-950/50 border border-slate-800/60 p-3 rounded-xl space-y-2 text-xs text-slate-400">
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200 transition-colors select-none">
                            <input
                                type="checkbox"
                                checked={
                                    card.saveCardLink !==
                                    false
                                }
                                onChange={() =>
                                    toggleLinkSave(
                                        card.id,
                                        'saveCardLink',
                                    )
                                }
                                className="w-3.5 h-3.5 accent-cyan-500 rounded border-slate-700"
                            />
                            <span className="truncate">
                                link card:{' '}
                                <a
                                    href={
                                        card.url || '#'
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-cyan-400 underline hover:text-cyan-300 ml-1"
                                >
                                    Open
                                </a>
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200 transition-colors select-none">
                            <input
                                type="checkbox"
                                checked={
                                    card.saveImgLink !==
                                    false
                                }
                                onChange={() =>
                                    toggleLinkSave(
                                        card.id,
                                        'saveImgLink',
                                    )
                                }
                                className="w-3.5 h-3.5 accent-cyan-500 rounded border-slate-700"
                            />
                            <span className="truncate">
                                link img:{' '}
                                <a
                                    href={
                                        card.img || '#'
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-cyan-400 underline hover:text-cyan-300 ml-1"
                                >
                                    Open
                                </a>
                            </span>
                        </label>
                    </div>
                </div>

                <div className="flex-1 bg-slate-950/40 rounded-xl p-3 border border-slate-800/40 space-y-1 select-none max-h-100 overflow-y-auto custom-scrollbar">
                    {card.lines
                        .filter((line) =>
                            card.showCleanText
                                ? !line.isHtmlTag &&
                                  parseInt(
                                      line.depth,
                                      10,
                                  ) <= card.currentDepth
                                : !line.isHtmlTag ||
                                  parseInt(
                                      line.depth,
                                      10,
                                  ) <=
                                      card.currentDepth,
                        )
                        .map((line) => (
                            <div
                                key={line.index}
                                className={`flex items-stretch gap-1 rounded pr-2 transition-colors ${card.showCleanText ? 'hover:bg-transparent py-0.5' : 'hover:bg-slate-900/40'} ${line.checked ? 'opacity-100' : 'opacity-30'}`}
                            >
                                {!card.showCleanText ? (
                                    <>
                                        <div className="flex items-center shrink-0 w-8">
                                            <span className="text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-cyan-500/80 w-full text-center border border-slate-800/50">
                                                {
                                                    line.index
                                                }
                                            </span>
                                        </div>
                                        <div className="flex shrink-0 items-stretch ml-1">
                                            {Array.from(
                                                {
                                                    length: line.depth,
                                                },
                                            ).map(
                                                (
                                                    _,
                                                    i,
                                                ) => (
                                                    <div
                                                        key={
                                                            i
                                                        }
                                                        className="w-4 border-l border-slate-800/70 h-full shrink-0"
                                                    />
                                                ),
                                            )}
                                            <div className="w-4 h-full relative shrink-0">
                                                <div className="absolute left-0 top-0 bottom-0 border-l border-slate-800/70" />
                                                {line.depth >
                                                    0 && (
                                                    <div className="absolute left-0 top-1/2 w-2 border-t border-slate-800/70" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center shrink-0 pl-1 mr-2">
                                            <input
                                                type="checkbox"
                                                className="w-3.5 h-3.5 accent-emerald-500 rounded border-slate-700 bg-slate-900 cursor-pointer m-0"
                                                checked={
                                                    line.checked
                                                }
                                                onChange={() =>
                                                    toggleLineCheck(
                                                        card.id,
                                                        line.index,
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0 py-1.5">
                                            <span
                                                className={`tracking-wide break-all block leading-relaxed ${line.isHtmlTag ? 'text-indigo-400 font-mono text-[11px] opacity-80' : 'text-slate-200 font-bold text-sm'}`}
                                            >
                                                {line.text}
                                            </span>
                                            {!line.isHtmlTag &&
                                                line.semanticPath && (
                                                    <span
                                                        className="block text-[10px] text-slate-500 font-mono truncate mt-0.5"
                                                        title={
                                                            line.semanticPath
                                                        }
                                                    >
                                                        📍{' '}
                                                        {
                                                            line.semanticPath
                                                        }
                                                    </span>
                                                )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center shrink-0 mr-2">
                                            <input
                                                type="checkbox"
                                                className="w-3.5 h-3.5 accent-emerald-500 rounded border-slate-700 bg-slate-900 cursor-pointer m-0"
                                                checked={
                                                    line.checked
                                                }
                                                onChange={() =>
                                                    toggleLineCheck(
                                                        card.id,
                                                        line.index,
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-slate-200 font-bold text-sm break-all">
                                                {line.text}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}