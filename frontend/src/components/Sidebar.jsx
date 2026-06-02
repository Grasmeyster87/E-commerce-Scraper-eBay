/**
 * Sidebar Component
 * Central control panel housing configuration modules for scraping operations, 
 * data persistence routes, output file formats, and active dataset management.
 *
 * @param {Object} props - Aggregated props managing global state controls from App.jsx.
 */
export default function Sidebar({
    saveDir, setSaveDir, openTableInNewTab, results,
    handleSaveAllFormats, handleSaveData, handleClear,
    pagination, scrapeAllPages, setScrapeAllPages, onNextPage, loading,
    maxScrapePages, setMaxScrapePages, itemsPerPageSelection, setItemsPerPageSelection,
    dbSettings, setDbSettings, activeTable, availableTables, handleLoadTable
}) {
    return (
        <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-6 space-y-4">
            
            {/* --- PAGINATION & AUTOMATION MODULE --- */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-4">
                <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase px-1">
                    Job Automation
                </h3>
                
                <div className="space-y-3 px-1">
                    {/* Auto-Scrape Toggle */}
                    <label className="flex items-center gap-3 cursor-pointer group bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                        <input 
                            type="checkbox" 
                            checked={scrapeAllPages}
                            onChange={(e) => setScrapeAllPages(e.target.checked)}
                            className="w-4 h-4 accent-indigo-500 rounded cursor-pointer" 
                        />
                        <span className="text-[11px] font-bold text-slate-300">
                            Continuous Deep Scraping
                        </span>
                    </label>

                    {/* Pagination Limits */}
                    <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                        <span className="text-[11px] text-slate-400 font-bold">Items Per Target Page:</span>
                        <select 
                            className="bg-slate-900 text-cyan-400 font-mono text-xs border border-slate-700 rounded px-2 py-1 outline-none cursor-pointer"
                            value={itemsPerPageSelection}
                            onChange={(e) => setItemsPerPageSelection(parseInt(e.target.value))}
                        >
                            <option value={60}>60</option>
                            <option value={120}>120</option>
                            <option value={240}>240</option>
                        </select>
                    </div>

                    <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                        <span className="text-[11px] text-slate-400 font-bold" title="Caps automated requests. 0 implies unlimited execution.">
                            Execution Ceiling:
                        </span>
                        <input 
                            type="number" 
                            min="0"
                            className="bg-slate-900 w-16 text-cyan-400 font-mono text-xs border border-slate-700 rounded px-2 py-1 outline-none text-right"
                            value={maxScrapePages}
                            onChange={(e) => setMaxScrapePages(parseInt(e.target.value) || 0)}
                        />
                    </div>

                    {/* Next Operation Trigger */}
                    <button
                        onClick={onNextPage}
                        disabled={loading || pagination.currentPage >= pagination.totalPages}
                        className="w-full bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-lg text-xs flex justify-center items-center gap-2"
                    >
                        {loading ? 'Initializing...' : '➡️ Dispatch Next Request'}
                    </button>
                </div>
            </div>

            {/* --- IO & EXPORT PIPELINE MODULE --- */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-between gap-4">
                <div className="flex-1 w-full space-y-4">
                    {/* Path & DB Name */}
                    <div>
                        <label className="block text-[10px] text-slate-500 font-mono mb-1">
                            EXPORT DIRECTORY PATH & DB NAME:
                        </label>
                        <div className="flex flex-col gap-2">
                            <input
                                type="text"
                                value={saveDir}
                                onChange={(e) => setSaveDir(e.target.value)}
                                placeholder="backend/data"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                            />
                            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-cyan-400 font-mono flex items-center gap-2 overflow-hidden" title="Active SQLite Database File">
                                <span>🗄️</span>
                                <span className="truncate">
                                    {dbSettings.source === 'custom' && dbSettings.customPath 
                                        ? 'customDatabase.sqlite' 
                                        : 'defaultDatabseForDataSQLT3.sqlite'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Table Dropdown */}
                    <div>
                        <label className="block text-[10px] text-slate-500 font-mono mb-1">
                            ACTIVE TABLE (DATASET):
                        </label>
                        <select
                            value={activeTable || ""}
                            onChange={(e) => handleLoadTable(e.target.value)}
                            disabled={loading}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-200 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                        >
                            <option value="" disabled>Select a table to load...</option>
                            {availableTables.map((table) => (
                                <option key={table.name} value={table.name}>
                                    {table.name} ({table.count} rows)
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-4 rounded-2xl shadow-xl space-y-4">
                <div className="space-y-2 pt-1">
                    
                    {/* Visualizer Router Trigger */}
                    <button
                        onClick={openTableInNewTab} 
                        disabled={results.length === 0}
                        className="w-full text-left text-xs font-bold px-4 py-3 rounded-xl border transition-all duration-300 flex items-center justify-between disabled:opacity-40 disabled:pointer-events-none bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20 hover:bg-indigo-400"
                    >
                        <span>📊 Output Visualizer</span>
                        <span className="bg-slate-900/40 text-[10px] text-white px-1.5 py-0.5 rounded-md border border-indigo-300/30">
                            {results.filter((c) => c.cardChecked).length}
                        </span>
                    </button>

                    {/* Formats Gateway */}
                    <div className="border border-slate-800/80 p-2 rounded-xl bg-slate-950/40 space-y-2">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block px-1">File Dump Protocols:</span>
                        <button
                            onClick={handleSaveAllFormats}
                            className="w-full bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-lg transition-all"
                        >
                            ⚡ Process All Formats
                        </button>
                        <div className="flex flex-wrap gap-1.5 pt-2">
                            <button onClick={() => handleSaveData('csv')} className="flex-1 min-w-[30%] bg-emerald-500/10 text-emerald-400 text-[11px] font-bold py-1.5 rounded-lg border border-emerald-900/50 hover:bg-emerald-500/20">CSV</button>
                            <button onClick={() => handleSaveData('json')} className="flex-1 min-w-[30%] bg-amber-500/10 text-amber-400 text-[11px] font-bold py-1.5 rounded-lg border border-amber-900/50 hover:bg-amber-500/20">JSON</button>
                            <button onClick={() => handleSaveData('sqlite')} className="flex-1 min-w-[30%] bg-blue-500/10 text-blue-400 text-[11px] font-bold py-1.5 rounded-lg border border-blue-900/50 hover:bg-blue-500/20">SQL</button>
                            <button onClick={() => handleSaveData('xml')} className="flex-1 min-w-[45%] bg-fuchsia-500/10 text-fuchsia-400 text-[11px] font-bold py-1.5 rounded-lg border border-fuchsia-900/50 hover:bg-fuchsia-500/20">XML</button>
                            <button onClick={() => handleSaveData('pdf')} className="flex-1 min-w-[45%] bg-rose-500/10 text-rose-400 text-[11px] font-bold py-1.5 rounded-lg border border-rose-900/50 hover:bg-rose-500/20">PDF</button>
                        </div>
                    </div>

                    {/* Reset State Tool */}
                    {results.length > 0 && (
                        <button
                            onClick={handleClear}
                            className="w-full text-left text-xs font-medium text-red-400 hover:text-red-300 border border-slate-800 hover:bg-red-950/20 px-4 py-3 rounded-xl transition-colors mt-2"
                        >
                            🗑 Purge Active Dataset
                        </button>
                    )}
                </div>
            </div>

            {/* --- RELATIONAL DB (SQLITE3) CONFIGURATION --- */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-4">
                <h3 className="text-xs font-bold text-cyan-400 tracking-wider uppercase px-1 flex items-center gap-2">
                    🗄️ Database Context (SQLite3)
                </h3>
                
                <div className="space-y-3 px-1 text-[11px] text-slate-300">
                    <label className="flex items-center gap-3 cursor-pointer group hover:text-white">
                        <input 
                            type="checkbox" 
                            checked={dbSettings.saveToDefault}
                            onChange={(e) => setDbSettings(p => ({...p, saveToDefault: e.target.checked}))}
                            className="w-4 h-4 accent-cyan-500 rounded" 
                        />
                        <span>Enable logging to primary table per session</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group hover:text-white">
                        <input 
                            type="checkbox" 
                            checked={dbSettings.loadLatestOnStart}
                            onChange={(e) => setDbSettings(p => ({...p, loadLatestOnStart: e.target.checked}))}
                            className="w-4 h-4 accent-cyan-500 rounded" 
                        />
                        <span>Mount latest database state on initialization</span>
                    </label>

                    <div className="border-t border-slate-800 my-2 pt-2">
                        <label className="flex items-center gap-3 cursor-pointer group hover:text-white mb-2">
                            <input 
                                type="checkbox" 
                                checked={dbSettings.saveToCustom}
                                onChange={(e) => setDbSettings(p => ({...p, saveToCustom: e.target.checked}))}
                                className="w-4 h-4 accent-indigo-500 rounded" 
                            />
                            <span>Override persistent storage path</span>
                        </label>
                        
                        {dbSettings.saveToCustom && (
                            <input
                                type="text"
                                value={dbSettings.customPath}
                                onChange={(e) => setDbSettings(p => ({...p, customPath: e.target.value}))}
                                placeholder="E.g., D:/my_databases/..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 font-mono text-[10px] focus:border-indigo-500 outline-none"
                            />
                        )}
                    </div>

                    <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800 space-y-2">
                        <span className="font-bold text-slate-400">Target Read Source:</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" name="dbSource" value="default"
                                checked={dbSettings.source === 'default'}
                                onChange={(e) => setDbSettings(p => ({...p, source: e.target.value}))}
                                className="accent-cyan-500"
                            />
                            <span>Default DB</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" name="dbSource" value="custom"
                                disabled={!dbSettings.customPath}
                                checked={dbSettings.source === 'custom'}
                                onChange={(e) => setDbSettings(p => ({...p, source: e.target.value}))}
                                className="accent-indigo-500"
                            />
                            <span className={!dbSettings.customPath ? 'opacity-50' : ''}>Custom Volume</span>
                        </label>
                    </div>
                </div>
            </div>
        </aside>
    );
}