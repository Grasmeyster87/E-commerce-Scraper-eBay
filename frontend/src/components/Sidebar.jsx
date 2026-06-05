import { useState } from 'react';
import ScrapingDelays from './ScrapingDelays';
import axios from 'axios';

export default function Sidebar({
    saveDir,
    setSaveDir,
    openTableInNewTab,
    results,
    handleSaveAllFormats,
    handleSaveData,
    handleClear,
    pagination,
    scrapeAllPages,
    setScrapeAllPages,
    onNextPage,
    loading,
    maxScrapePages,
    setMaxScrapePages,
    itemsPerPageSelection,
    setItemsPerPageSelection,
    dbSettings,
    setDbSettings,
    activeTable,
    availableTables,
    handleLoadTable,
    setPageDelays,
}) {
    // State to manage the expanded status of each menu section
    const [openSections, setOpenSections] = useState({
        automation: true, // Automation is open by default
        delays: false, // Delays dropdown initialized
        storage: true, // Database and table selection are open
        exports: false, // Exports are collapsed for compactness
    });

    /**
     * Toggles the visibility state of an accordion section
     * @param {string} sectionName
     */
    const toggleSection = (sectionName) => {
        setOpenSections((prev) => ({
            ...prev,
            [sectionName]: !prev[sectionName],
        }));
    };

    return (
        <div className="w-80 bg-slate-950 border-r border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto h-screen select-none custom-scrollbar shrink-0">
            {/* Header / Brand Logo */}
            <div className="flex items-center gap-3 px-2 py-1">
                <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20">
                    E
                </div>
                <div>
                    <h1 className="text-xs font-mono font-bold text-slate-200 tracking-wider">
                        EBAY SCRAPER
                    </h1>
                    <p className="text-[10px] font-mono text-indigo-400">
                        v1.2.0 • Enterprise Edition
                    </p>
                </div>
            </div>

            <hr className="border-slate-900" />

            {/* --- ACCORDION SYSTEM CONTAINER --- */}
            <div className="flex flex-col gap-3 flex-1">
                {/* SECTION 1: AUTOMATION & CONTROLS */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30 transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('automation')}
                        className="w-full bg-slate-900/80 hover:bg-slate-900 px-4 py-3 text-left text-[11px] font-mono font-bold text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            🚀 AUTOMATION CONTROLLER
                        </span>
                        <span
                            className={`text-slate-500 transition-transform duration-200 ${openSections.automation ? 'rotate-180' : ''}`}
                        >
                            ▼
                        </span>
                    </button>

                    {openSections.automation && (
                        <div className="p-4 bg-slate-950/40 border-t border-slate-900 space-y-4 animate-fadeIn">
                            {/* Target Items Limit */}
                            <div>
                                <label className="block text-[10px] text-slate-500 font-mono mb-1">
                                    ITEMS PER PAGE REQUEST:
                                </label>
                                <select
                                    value={itemsPerPageSelection}
                                    onChange={(e) =>
                                        setItemsPerPageSelection(
                                            Number(e.target.value),
                                        )
                                    }
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                                >
                                    <option value={60}>
                                        60 Items (Standard)
                                    </option>
                                    <option value={120}>
                                        120 Items (Extended)
                                    </option>
                                    <option value={240}>
                                        240 Items (Max Batch)
                                    </option>
                                </select>
                            </div>

                            {/* Recursive Scrape Toggle */}
                            <div className="bg-slate-950/60 border border-slate-900 p-3 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-mono text-slate-300">
                                        Scrape All Pages
                                    </p>
                                    <p className="text-[9px] font-mono text-slate-600">
                                        Recursive execution loop
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={scrapeAllPages}
                                    onChange={(e) =>
                                        setScrapeAllPages(e.target.checked)
                                    }
                                    className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>

                            {/* Bounded Target Execution */}
                            {!scrapeAllPages && (
                                <div className="animate-slideDown">
                                    <label className="block text-[10px] text-slate-500 font-mono mb-1">
                                        MAX BOUNDED PAGES:
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={maxScrapePages}
                                        onChange={(e) =>
                                            setMaxScrapePages(
                                                Math.max(
                                                    1,
                                                    parseInt(e.target.value) ||
                                                        1,
                                                ),
                                            )
                                        }
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            )}

                            {/* Manual Page-Turn Trigger */}
                            <button
                                type="button"
                                onClick={onNextPage}
                                disabled={
                                    loading ||
                                    (pagination &&
                                        pagination.currentPage >=
                                            pagination.totalPages)
                                }
                                className="w-full bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 text-slate-300 font-mono text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <span>🔄</span> Manual Next Page Step
                            </button>
                        </div>
                    )}
                </div>

                {/* SECTION 1.5: PAGINATION DELAYS CONFIGURATION */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30 transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('delays')}
                        className="w-full bg-slate-900/80 hover:bg-slate-900 px-4 py-3 text-left text-[11px] font-mono font-bold text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            ⏱️ PAGINATION DELAYS
                        </span>
                        <span
                            className={`text-slate-500 transition-transform duration-200 ${openSections.delays ? 'rotate-180' : ''}`}
                        >
                            ▼
                        </span>
                    </button>

                    {openSections.delays && (
                        <ScrapingDelays
                            onSaveProfile={async (profileData) => {
                                try {
                                    const backendUrl =
                                        import.meta.env.VITE_BACKEND_URL ||
                                        'http://localhost:5050';
                                    await axios.post(
                                        `${backendUrl}/api/settings/delays`,
                                        profileData,
                                    );
                                    setPageDelays(profileData.pageDelays);
                                    alert(
                                        `✅ Profile "${profileData.profileName}" saved successfully!`,
                                    );
                                } catch (err) {
                                    console.error(
                                        'Failed to save delay profile:',
                                        err,
                                    );
                                    alert(
                                        '❌ Error saving profile to database.',
                                    );
                                }
                            }}
                            onLoadDefault={() => {
                                setPageDelays([3000]); 
                                console.log(
                                    'Delay profile fallback restored to global defaults.',
                                );
                                // Тут ти також можеш додати логіку застосування дефолтних пауз до стейту App.jsx
                            }}
                        />
                    )}
                </div>

                {/* SECTION 2: STORAGE & PERSISTENCE */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30 transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('storage')}
                        className="w-full bg-slate-900/80 hover:bg-slate-900 px-4 py-3 text-left text-[11px] font-mono font-bold text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            🗄️ STORAGE & DATASET TARGETS
                        </span>
                        <span
                            className={`text-slate-500 transition-transform duration-200 ${openSections.storage ? 'rotate-180' : ''}`}
                        >
                            ▼
                        </span>
                    </button>

                    {openSections.storage && (
                        <div className="p-4 bg-slate-950/40 border-t border-slate-900 space-y-4 animate-fadeIn">
                            {/* Directory Config */}
                            <div>
                                <label className="block text-[10px] text-slate-500 font-mono mb-1">
                                    EXPORT DIRECTORY PATH:
                                </label>
                                <input
                                    type="text"
                                    value={saveDir}
                                    onChange={(e) => setSaveDir(e.target.value)}
                                    placeholder="backend/data"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            {/* Database Context Configuration */}
                            <div className="space-y-3 p-3 bg-slate-950/50 border border-slate-900 rounded-xl">
                                <label className="block text-[10px] text-cyan-500 font-mono font-bold">
                                    SQLITE3 CONFIGURATION:
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group hover:text-white text-[11px] text-slate-400">
                                    <input
                                        type="checkbox"
                                        checked={dbSettings.saveToDefault}
                                        onChange={(e) =>
                                            setDbSettings((p) => ({
                                                ...p,
                                                saveToDefault: e.target.checked,
                                            }))
                                        }
                                        className="w-3.5 h-3.5 accent-cyan-500 rounded"
                                    />
                                    <span>Log to primary table</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group hover:text-white text-[11px] text-slate-400">
                                    <input
                                        type="checkbox"
                                        checked={dbSettings.loadLatestOnStart}
                                        onChange={(e) =>
                                            setDbSettings((p) => ({
                                                ...p,
                                                loadLatestOnStart:
                                                    e.target.checked,
                                            }))
                                        }
                                        className="w-3.5 h-3.5 accent-cyan-500 rounded"
                                    />
                                    <span>Mount latest on boot</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group hover:text-white text-[11px] text-slate-400">
                                    <input
                                        type="checkbox"
                                        checked={dbSettings.saveToCustom}
                                        onChange={(e) =>
                                            setDbSettings((p) => ({
                                                ...p,
                                                saveToCustom: e.target.checked,
                                            }))
                                        }
                                        className="w-3.5 h-3.5 accent-indigo-500 rounded"
                                    />
                                    <span>Override storage path</span>
                                </label>

                                {dbSettings.saveToCustom && (
                                    <input
                                        type="text"
                                        value={dbSettings.customPath}
                                        onChange={(e) =>
                                            setDbSettings((p) => ({
                                                ...p,
                                                customPath: e.target.value,
                                            }))
                                        }
                                        placeholder="E.g., D:/my_databases/..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 font-mono text-[10px] text-slate-300 focus:border-indigo-500 outline-none"
                                    />
                                )}
                            </div>

                            {/* Tables Dataset Selector */}
                            <div>
                                <label className="block text-[10px] text-slate-500 font-mono mb-1">
                                    ACTIVE TABLE (DATASET):
                                </label>
                                <select
                                    value={activeTable || ''}
                                    onChange={(e) =>
                                        handleLoadTable(e.target.value)
                                    }
                                    disabled={loading}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-200 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                                >
                                    <option value="" disabled>
                                        Select a table to load...
                                    </option>
                                    {availableTables.map((table) => (
                                        <option
                                            key={table.name}
                                            value={table.name}
                                        >
                                            {table.name} ({table.count} rows)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* SECTION 3: SYSTEM ACTIONS & EXPORTS */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30 transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('exports')}
                        className="w-full bg-slate-900/80 hover:bg-slate-900 px-4 py-3 text-left text-[11px] font-mono font-bold text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            🛠️ WIZARDS & I/O OPERATIONS
                        </span>
                        <span
                            className={`text-slate-500 transition-transform duration-200 ${openSections.exports ? 'rotate-180' : ''}`}
                        >
                            ▼
                        </span>
                    </button>

                    {openSections.exports && (
                        <div className="p-4 bg-slate-950/40 border-t border-slate-900 space-y-4 animate-fadeIn">
                            {/* Live Visualizer Link */}
                            <button
                                type="button"
                                onClick={openTableInNewTab}
                                disabled={!results || results.length === 0}
                                className="w-full bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-mono text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <span>🖥️</span> Open Live Matrix Visualizer
                            </button>

                            {/* Batch Formats Block */}
                            <div className="space-y-2">
                                <label className="block text-[10px] text-slate-500 font-mono mb-1">
                                    SERIALIZE SINGLE EXPORT:
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['csv', 'json', 'xml', 'pdf'].map(
                                        (fmt) => (
                                            <button
                                                key={fmt}
                                                type="button"
                                                onClick={() =>
                                                    handleSaveData(fmt)
                                                }
                                                disabled={
                                                    !results ||
                                                    results.length === 0
                                                }
                                                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-mono text-[11px] py-2 rounded-lg transition-all capitalize disabled:opacity-40"
                                            >
                                                .{fmt} File
                                            </button>
                                        ),
                                    )}
                                </div>
                            </div>

                            {/* Full Core Bundle Wizard */}
                            <button
                                type="button"
                                onClick={handleSaveAllFormats}
                                disabled={!results || results.length === 0}
                                className="w-full bg-cyan-950/60 border border-cyan-800/40 hover:bg-cyan-900/50 text-cyan-400 font-mono text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                            >
                                <span>📦</span> Build Master Archive (.all)
                            </button>

                            {/* Destructive Clear Buffer */}
                            <button
                                type="button"
                                onClick={handleClear}
                                disabled={!results || results.length === 0}
                                className="w-full bg-rose-950/30 border border-rose-900/30 hover:bg-rose-900/40 text-rose-400 font-mono text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                            >
                                <span>🗑️</span> Purge Active View State
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination Active Snapshot (Footer Sidebar Status) */}
            {pagination && (
                <div className="bg-slate-950 border border-slate-900 p-3 rounded-xl font-mono text-[10px] text-slate-500 space-y-1 mt-auto">
                    <div className="flex justify-between">
                        <span>PIPELINE STATUS:</span>
                        <span
                            className={
                                loading
                                    ? 'text-amber-500 animate-pulse'
                                    : 'text-emerald-500'
                            }
                        >
                            {loading ? 'PROCESSING' : 'IDLE'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>PAGINATION NODE:</span>
                        <span className="text-slate-300">
                            Page {pagination.currentPage} /{' '}
                            {pagination.totalPages || '?'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>BUFFER SIZE:</span>
                        <span className="text-slate-300">
                            {results?.length || 0} Entities
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
