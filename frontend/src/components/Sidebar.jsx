import React from 'react';

export default function Sidebar({
    saveDir,
    setSaveDir,
    openTableInNewTab,
    results,
    handleSaveAllFormats,
    handleSaveData,
    handleClear
}) {
    return (
        <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-6 space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 w-full">
                    <label className="block text-xs text-slate-400 font-mono mb-1">
                        📁 ШЛЯХ ДЛЯ ЗБЕРЕЖЕННЯ КАТАЛОГУ:
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={saveDir}
                            onChange={(e) =>
                                setSaveDir(e.target.value)
                            }
                            placeholder="Наприклад: D:\projects\data або залишіть пустим для дефолтного"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <button
                            onClick={() =>
                                setSaveDir('backend/data')
                            }
                            className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold px-3 py-2 rounded-xl transition-colors"
                            title="Скинути до дефолтного"
                        >
                            Дефолт
                        </button>
                    </div>
                </div>
            </div>
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-4 rounded-2xl shadow-xl space-y-4">
                <div>
                    <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase px-1">
                        Панель збереження
                    </h3>
                    <p className="text-[11px] text-slate-500 px-1 mt-0.5">
                        Керування структурою та вкладками
                    </p>
                </div>

                <div className="space-y-2 pt-1">
                    <button
                        onClick={openTableInNewTab}
                        disabled={results.length === 0}
                        className="w-full text-left text-xs font-bold px-4 py-3 rounded-xl border transition-all duration-300 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20 hover:bg-indigo-400"
                    >
                        <span>📊 Відкрити таблицю ↗</span>
                        <span className="bg-slate-900/40 text-[10px] text-white px-1.5 py-0.5 rounded-md border border-indigo-300/30">
                            {
                                results.filter((c) => c.cardChecked)
                                    .length
                            }
                        </span>
                    </button>

                    {/* КНОПКИ ЕКСПОРТУ */}
                    <div className="border border-slate-800/80 p-2 rounded-xl bg-slate-950/40 space-y-2">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block px-1">
                            Експорт Даних:
                        </span>

                        <button
                            onClick={handleSaveAllFormats}
                            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            ⚡ Зберегти в усі формати
                        </button>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() =>
                                    handleSaveData('csv')
                                }
                                className="flex-1 min-w-[30%] bg-emerald-500/10 text-emerald-400 text-[11px] font-bold py-1.5 rounded-lg border border-emerald-900/50 hover:bg-emerald-500/20 transition-colors"
                            >
                                CSV
                            </button>
                            <button
                                onClick={() =>
                                    handleSaveData('json')
                                }
                                className="flex-1 min-w-[30%] bg-amber-500/10 text-amber-400 text-[11px] font-bold py-1.5 rounded-lg border border-amber-900/50 hover:bg-amber-500/20 transition-colors"
                            >
                                JSON
                            </button>
                            <button
                                onClick={() =>
                                    handleSaveData('sqlite')
                                }
                                className="flex-1 min-w-[30%] bg-blue-500/10 text-blue-400 text-[11px] font-bold py-1.5 rounded-lg border border-blue-900/50 hover:bg-blue-500/20 transition-colors"
                            >
                                SQL
                            </button>
                            <button
                                onClick={() =>
                                    handleSaveData('xml')
                                }
                                className="flex-1 min-w-[45%] bg-fuchsia-500/10 text-fuchsia-400 text-[11px] font-bold py-1.5 rounded-lg border border-fuchsia-900/50 hover:bg-fuchsia-500/20 transition-colors"
                            >
                                XML
                            </button>
                            <button
                                onClick={() =>
                                    handleSaveData('pdf')
                                }
                                className="flex-1 min-w-[45%] bg-rose-500/10 text-rose-400 text-[11px] font-bold py-1.5 rounded-lg border border-rose-900/50 hover:bg-rose-500/20 transition-colors"
                            >
                                PDF
                            </button>
                        </div>
                    </div>

                    {results.length > 0 && (
                        <button
                            onClick={handleClear}
                            className="w-full text-left text-xs font-medium text-red-400 hover:text-red-300 border border-slate-800 hover:border-red-900/40 hover:bg-red-950/20 px-4 py-3 rounded-xl transition-colors mt-2"
                        >
                            🗑 Очистити робочі дані
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
}