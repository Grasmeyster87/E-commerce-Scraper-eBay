import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { CardService } from './services/CardService';
import DataTable from './components/DataTable';
import Sidebar from './components/Sidebar';
import ProductCard from './components/ProductCard';
import ProgressModal from './components/ProgressModal';

// API backend endpoint fallback from environment variables
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';

/**
 * Main Application Component
 * Manages the state, scraping orchestration, and SQLite3 database synchronization
 * for the eBay structural skeleton parsing tool.
 */
function App() {
    /**
     * SQLite3 Database settings state.
     * Persisted locally to maintain user configuration across page reloads.
     */
    const [dbSettings, setDbSettings] = useState(() => {
        const saved = localStorage.getItem('dbSettings');
        return saved
            ? JSON.parse(saved)
            : {
                  saveToDefault: true,
                  saveToCustom: false,
                  customPath: '',
                  loadLatestOnStart: true,
                  source: 'default',
              };
    });

    // Active SQLite database table name for the current scraping session
    const [activeTable, setActiveTable] = useState('');

    // Cumulative array storing all scraped cards accumulated during the session
    const [results, setResults] = useState([]);

    // UI routing state to toggle between standard card feed and spreadsheet data table
    const [isTableRoute, setIsTableRoute] = useState(false);

    // Search input query state, cached in localStorage
    const [query, setQuery] = useState(
        () => localStorage.getItem('savedQuery') || '',
    );

    // UI loading overlay and button lock state
    const [loading, setLoading] = useState(false);

    // State indicating if the automated multi-page scraping loop is running
    const [autoScraping, setAutoScraping] = useState(false);

    // Flag to enable/disable saving raw HTML snapshots for backend debugging
    const [saveDebugHtml, setSaveDebugHtml] = useState(false);

    // Target directory path for file exports (CSV, JSON, PDF, etc.)
    const [saveDir, setSaveDir] = useState('backend/data');

    // Scraper-specific pagination tracker (synchronized with target website state)
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        itemsPerPage: 60,
    });

    // Scraper automation configs
    const [scrapeAllPages, setScrapeAllPages] = useState(false);
    const [maxScrapePages, setMaxScrapePages] = useState(0);
    const [itemsPerPageSelection, setItemsPerPageSelection] = useState(60);

    // Frontend-only pagination state for rendering localized chunks of accumulated data
    const [frontendPage, setFrontendPage] = useState(1);

    //
    const [searchMode, setSearchMode] = useState('query');

    // State for storing a list of all available tables in the database
    const [availableTables, setAvailableTables] = useState([]);
    /**
     * Refs to capture the absolute latest state variables inside async setTimeout loops.
     * Prevents stale closures during automated recursive scraping.
     */
    const autoScrapeRef = useRef(scrapeAllPages);
    const maxPagesRef = useRef(maxScrapePages);
    useEffect(() => {
        autoScrapeRef.current = scrapeAllPages;
    }, [scrapeAllPages]);
    useEffect(() => {
        maxPagesRef.current = maxScrapePages;
    }, [maxScrapePages]);

    // Cache state modifications to localStorage
    useEffect(() => {
        localStorage.setItem('dbSettings', JSON.stringify(dbSettings));
    }, [dbSettings]);

    useEffect(() => {
        localStorage.setItem('savedQuery', query);
    }, [query]);

    /**
     * Auto-load effect.
     * Restores the latest active database table and its cards on application startup.
     */
    // 1. Create a ref to capture the current config object
    const dbSettingsRef = useRef(dbSettings);

    // 2. Synchronize the ref whenever settings change (lightweight in-memory operation)
    useEffect(() => {
        dbSettingsRef.current = dbSettings;
    }, [dbSettings]);

    // 3. Auto-load effect is now fully ESLint-clean (no mutable deps)
    useEffect(() => {
        if (dbSettings.loadLatestOnStart) {
            // Pass the ref's current value in the request payload
            axios
                .post(`${backendUrl}/api/tables/latest`, {
                    dbSettings: dbSettingsRef.current,
                })
                .then((res) => {
                    if (res.data.tableName) {
                        setActiveTable(res.data.tableName);

                        axios
                            .post(`${backendUrl}/api/cards/list`, {
                                dbSettings: dbSettingsRef.current, // also sourced from the ref
                                tableName: res.data.tableName,
                                page: 1,
                                limit: 100000,
                            })
                            .then((cardsRes) => {
                                setResults(cardsRes.data.cards);
                                setFrontendPage(1);
                                fetchAvailableTables();
                            });
                    }
                })
                .catch((err) =>
                    console.error(
                        'Failed to auto-load latest SQLite table:',
                        err,
                    ),
                );
        }
        // Only watch triggers that should genuinely initiate a database reload
    }, [dbSettings.source, dbSettings.loadLatestOnStart]);

    // 1. Додай новий стан для затримок (разом з іншими стейтами на початку App)
    const [pageDelays, setPageDelays] = useState([3000]); // Дефолтна затримка 3000ms

    // 2. Створи ref для синхронізації в асинхронних функціях
    const pageDelaysRef = useRef(pageDelays);

    useEffect(() => {
        pageDelaysRef.current = pageDelays;
    }, [pageDelays]);
    /**
     * Loads a list of all tables from the database and their number of cards.
     */
    const fetchAvailableTables = () => {
        axios
            .post(`${backendUrl}/api/tables/list`, {
                dbSettings: dbSettingsRef.current,
            })
            .then((res) => setAvailableTables(res.data.tables || []))
            .catch((err) => console.error('Failed to fetch tables:', err));
    };

    /**
     * Loads the contents of the selected table from the drop-down list.
     */
    const handleLoadTable = async (tableName) => {
        if (!tableName) return;
        setLoading(true);
        try {
            setActiveTable(tableName);
            const res = await axios.post(`${backendUrl}/api/cards/list`, {
                dbSettings,
                tableName,
                page: 1,
                limit: 100000,
            });
            setResults(res.data.cards);
            setFrontendPage(1);
            setPagination({ currentPage: 1, totalPages: 1, itemsPerPage: 60 });
        } catch (err) {
            alert(`Error loading table: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Core Scraping Orchestration Function.
     * Communicates with backend Puppeteer service to execute initial search or fetch next pages.
     * * @param {string} action - Scraper command ('search' | 'next')
     * @param {boolean} isAutoCall - Indicates if the invocation is part of an automated loop
     * @param {string|null} overrideTable - Direct string payload to bypass React state stale closure
     */
    const handleScrape = async (
        action = 'search',
        isAutoCall = false,
        overrideTable = null,
    ) => {
        if (!query && action === 'search')
            return alert('Please enter a search query');
        if (!isAutoCall) setLoading(true);

        // Fallback to override parameter to ensure the recursive step uses the correct sequential table
        const currentTableName = overrideTable || activeTable;

        try {
            const response = await axios.post(`${backendUrl}/api/scrape`, {
                query,
                searchMode,
                saveDebugHtml,
                action,
                itemsPerPage: itemsPerPageSelection,
                dbSettings,
                activeTable: currentTableName,
                pageDelays: pageDelaysRef.current,
                currentPage: pagination.currentPage,
            });

            if (!response.data.success)
                throw new Error(response.data.error || 'Server error');

            const newTableName = response.data.tableName;

            if (action === 'search') {
                setActiveTable(newTableName);
                setResults(response.data.data); // Reset state array on new search instance
                setFrontendPage(1);
            } else {
                // Accumulate next page data seamlessly into the single historical session array
                setResults((prev) => [...prev, ...response.data.data]);
            }

            setPagination(response.data.pagination);

            // Automated multi-page sequence validation
            if (
                autoScrapeRef.current &&
                response.data.pagination.currentPage <
                    response.data.pagination.totalPages
            ) {
                if (
                    !maxPagesRef.current ||
                    response.data.pagination.currentPage < maxPagesRef.current
                ) {
                    setAutoScraping(true);

                    // Recursive call with direct tableName pass to eliminate async state scoping bugs
                    setTimeout(
                        () => handleScrape('next', true, newTableName),
                        3000,
                    );
                    return;
                }
            }
            setAutoScraping(false);
        } catch (error) {
            console.error('Scraping handler failure:', error);
            setAutoScraping(false);
            if (!isAutoCall) alert(`Error occurred: ${error.message}`);
        } finally {
            if (!isAutoCall) setLoading(false);
            fetchAvailableTables();
        }
    };

    /**
     * Persists atomic card modifications directly to the backend SQLite3 database.
     * @param {Object} updatedCard - The modified card entity with updated field rules
     */
    const updateCardInDb = async (updatedCard) => {
        try {
            await axios.put(`${backendUrl}/api/cards/${updatedCard.id}`, {
                dbSettings,
                tableName: activeTable,
                updates: updatedCard,
            });
        } catch (err) {
            console.error(
                'Failed to sync card state update with SQLite3:',
                err,
            );
        }
    };

    /**
     * Higher-Order Helper to execute localized state mutations and automatically sync them to DB.
     * @param {Function} actionFunc - Pure function modifying the results array
     * @param {string} cardId - target identifier
     * @param {...any} args - Optional rest parameters for the structural mutations
     */
    const handleActionAndSync = (actionFunc, cardId, ...args) => {
        const newResults = actionFunc(results, cardId, ...args);
        setResults(newResults);
        const updatedCard = newResults.find((c) => c.id === cardId);
        if (updatedCard) updateCardInDb(updatedCard);
    };

    // Component-to-DB synced event dispatchers for processing options
    const toggleCardCheck = (id) =>
        handleActionAndSync(
            (res, cid) =>
                res.map((c) =>
                    c.id === cid ? { ...c, cardChecked: !c.cardChecked } : c,
                ),
            id,
        );
    const toggleUniquenessCheck = (id) =>
        handleActionAndSync(
            (res, cid) =>
                res.map((c) =>
                    c.id === cid ? { ...c, uniqueness: !c.uniqueness } : c,
                ),
            id,
        );
    const toggleCleanText = (id) =>
        handleActionAndSync(CardService.toggleCleanText, id);
    const toggleLinkSave = (id, field) =>
        handleActionAndSync(CardService.toggleLinkSave, id, field);
    const handleDepthChange = (id, val) =>
        handleActionAndSync(CardService.handleDepthChange, id, val);
    const toggleLineCheck = (id, lineIdx) =>
        handleActionAndSync(CardService.toggleLineCheck, id, lineIdx);

    /**
     * Clears UI workspace context without affecting safe historical SQLite entries.
     */
    const handleClear = () => {
        if (
            window.confirm(
                'Clear workspace? (Database tables will remain secure)',
            )
        ) {
            setActiveTable('');
            setResults([]);
            setQuery('');
            setPagination({ currentPage: 1, totalPages: 1, itemsPerPage: 60 });
        }
    };

    /**
     * Dispatches standalone file format extraction tasks to server utility layer.
     * @param {string} format - Document format type ('csv' | 'json' | 'sqlite' | 'xml' | 'pdf')
     */
    const handleSaveData = async (format) => {
        if (!activeTable) return alert('No active scraping table found');
        try {
            const res = await axios.post(`${backendUrl}/api/save`, {
                format,
                directory: saveDir,
                dbSettings,
                tableName: activeTable,
            });
            if (res.data.success)
                alert(`✅ Saved successfully!\nPath: ${res.data.filePath}`);
        } catch (error) {
            alert(
                `❌ Export error: ${error.response?.data?.error || error.message}`,
            );
        }
    };

    // Derived local frontend state logic for displaying strict chunks of cumulative session data
    const totalFrontendPages = Math.max(
        1,
        Math.ceil(results.length / itemsPerPageSelection),
    );
    const displayedResults = results.slice(
        (frontendPage - 1) * itemsPerPageSelection,
        frontendPage * itemsPerPageSelection,
    );

    // Dynamic state trackers for multi-format background export progress modal
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [saveSteps, setSaveSteps] = useState([
        { id: 'csv', name: 'Export CSV', status: 'idle', path: '' },
        { id: 'json', name: 'Export JSON', status: 'idle', path: '' },
        { id: 'sqlite', name: 'Export SQLite3', status: 'idle', path: '' },
        { id: 'xml', name: 'Export XML', status: 'idle', path: '' },
        { id: 'pdf', name: 'Export PDF', status: 'idle', path: '' },
    ]);

    /**
     * Asynchronously triggers serial exports for all supported document variations.
     * Iterates dynamically over target steps updating modal status tickers.
     */
    const handleSaveAllFormats = async () => {
        const tableData = CardService.extractTableData(results);
        if (!tableData || tableData.length === 0)
            return alert('❌ No operational data selected for export');

        setIsProgressModalOpen(true);
        setSaveSteps((prev) =>
            prev.map((step) => ({ ...step, status: 'pending', path: '' })),
        );
        const formats = ['csv', 'json', 'sqlite', 'xml', 'pdf'];

        for (const format of formats) {
            setSaveSteps((prev) =>
                prev.map((step) =>
                    step.id === format
                        ? { ...step, status: 'processing' }
                        : step,
                ),
            );
            try {
                const response = await axios.post(`${backendUrl}/api/save`, {
                    format,
                    directory: saveDir,
                    dbSettings,
                    tableName: activeTable,
                });
                if (response.data.success) {
                    setSaveSteps((prev) =>
                        prev.map((step) =>
                            step.id === format
                                ? {
                                      ...step,
                                      status: 'success',
                                      path: response.data.filePath,
                                  }
                                : step,
                        ),
                    );
                } else
                    throw new Error(
                        response.data.error || 'Export loop failed',
                    );
            } catch (err) {
                setSaveSteps((prev) =>
                    prev.map((step) =>
                        step.id === format
                            ? { ...step, status: 'error', error: err.message }
                            : step,
                    ),
                );
            }
        }
    };

    /**
     * Mini-component rendering pagination controls and analytical item counters.
     */
    const PaginationBanner = () =>
        results.length > 0 && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-2xl flex flex-wrap justify-between items-center text-sm font-semibold text-indigo-300 shadow-sm gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <span>📄 Scraper Web Page:</span>
                    <span className="bg-indigo-500/20 px-3 py-1 rounded-md text-indigo-200 border border-indigo-500/30">
                        {pagination.currentPage} /{' '}
                        {pagination.totalPages || '?'}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <span>Local View Layout:</span>
                    <button
                        onClick={() =>
                            setFrontendPage((p) => Math.max(1, p - 1))
                        }
                        disabled={frontendPage === 1}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white px-3 py-1 rounded-md transition-colors"
                    >
                        ◀
                    </button>
                    <span className="bg-indigo-500/20 px-3 py-1 rounded-md text-indigo-200 border border-indigo-500/30">
                        {frontendPage} / {totalFrontendPages}
                    </span>
                    <button
                        onClick={() =>
                            setFrontendPage((p) =>
                                Math.min(totalFrontendPages, p + 1),
                            )
                        }
                        disabled={
                            frontendPage === totalFrontendPages ||
                            totalFrontendPages === 0
                        }
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white px-3 py-1 rounded-md transition-colors"
                    >
                        ▶
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <span>📊 Accumulated In Table:</span>
                    <span className="bg-emerald-500/20 px-3 py-1 rounded-md text-emerald-300 border border-emerald-500/30">
                        {results.length} units
                    </span>
                </div>
            </div>
        );

    // Spreadsheet display route view fallback
    if (isTableRoute) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans flex flex-col">
                <h1 className="text-xl font-bold text-cyan-400 text-center mb-4">
                    Data Table Output
                </h1>
                <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
                    <button
                        onClick={handleSaveAllFormats}
                        className="bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-lg transition-all"
                    >
                        ⚡ Save All Formats
                    </button>
                    {['csv', 'json', 'sqlite', 'xml', 'pdf'].map((fmt) => (
                        <button
                            key={fmt}
                            onClick={() => handleSaveData(fmt)}
                            className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-bold py-1.5 px-3 rounded-lg uppercase hover:bg-slate-800"
                        >
                            {fmt}
                        </button>
                    ))}
                </div>

                <DataTable
                    results={results}
                    onDeleteRow={(id) => toggleCardCheck(id)}
                    onDeleteColumn={(p) =>
                        setResults((prev) => CardService.deleteColumn(prev, p))
                    }
                    onDeleteCell={(id, p) =>
                        setResults((prev) =>
                            CardService.deleteCell(prev, id, p),
                        )
                    }
                    itemsPerPageSelection={itemsPerPageSelection}
                    onClose={() => setIsTableRoute(false)}
                />

                <ProgressModal
                    isOpen={isProgressModalOpen}
                    onClose={() => setIsProgressModalOpen(false)}
                    saveSteps={saveSteps}
                />
            </div>
        );
    }

    // Main Workspace Layout
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans selection:bg-cyan-500 selection:text-slate-900">
            <div className="max-w-400 mx-auto space-y-6">
                {/* Search & Main Configuration Bar */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-3xl shadow-2xl space-y-4">
                    <h1 className="text-2xl sm:text-3xl font-extrabold bg-linear-to-r from-cyan-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                        eBay Structural Skeleton
                    </h1>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-cyan-500/50 outline-none text-slate-200 placeholder-slate-600"
                            placeholder="Enter product or URL..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === 'Enter' && handleScrape('search')
                            }
                            disabled={loading}
                        />
                        <button
                            onClick={() => handleScrape('search')}
                            disabled={loading}
                            className="bg-linear-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg active:scale-95 disabled:opacity-50 shrink-0"
                        >
                            {loading && !autoScraping
                                ? 'Scanning...'
                                : 'New Search'}
                        </button>
                    </div>

                    {/* Блок з чекбоксом та радіокнопками */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-2">
                        <label className="flex items-center gap-2 cursor-pointer group text-slate-400 text-sm hover:text-slate-200 transition-colors">
                            <input
                                type="checkbox"
                                checked={saveDebugHtml}
                                onChange={(e) =>
                                    setSaveDebugHtml(e.target.checked)
                                }
                                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                            />
                            <span>Save page HTML for debugging</span>
                        </label>

                        {/* Радіокнопки для вибору режиму */}
                        <div className="flex items-center space-x-4 bg-slate-950/50 p-2 rounded-xl border border-slate-800/80">
                            <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer hover:text-slate-100 transition-colors">
                                <input
                                    type="radio"
                                    name="searchMode"
                                    value="query"
                                    checked={searchMode === 'query'}
                                    onChange={(e) =>
                                        setSearchMode(e.target.value)
                                    }
                                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                                />
                                <span>Search by query</span>
                            </label>

                            <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer hover:text-slate-100 transition-colors">
                                <input
                                    type="radio"
                                    name="searchMode"
                                    value="link"
                                    checked={searchMode === 'link'}
                                    onChange={(e) =>
                                        setSearchMode(e.target.value)
                                    }
                                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                                />
                                <span>Search by link</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Dashboard Split View */}
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    <Sidebar
                        saveDir={saveDir}
                        setSaveDir={setSaveDir}
                        openTableInNewTab={() => setIsTableRoute(true)}
                        results={results}
                        handleSaveAllFormats={handleSaveAllFormats}
                        handleSaveData={handleSaveData}
                        handleClear={handleClear}
                        pagination={pagination}
                        scrapeAllPages={scrapeAllPages}
                        setScrapeAllPages={setScrapeAllPages}
                        onNextPage={() => handleScrape('next')}
                        loading={loading}
                        maxScrapePages={maxScrapePages}
                        setMaxScrapePages={setMaxScrapePages}
                        itemsPerPageSelection={itemsPerPageSelection}
                        setItemsPerPageSelection={setItemsPerPageSelection}
                        dbSettings={dbSettings}
                        setDbSettings={setDbSettings}
                        activeTable={activeTable}
                        availableTables={availableTables}
                        handleLoadTable={handleLoadTable}
                        setPageDelays={setPageDelays}
                    />

                    {/* Content Section & Product List Feed */}
                    <main className="flex-1 w-full min-w-0">
                        {autoScraping && (
                            <div className="bg-amber-950/40 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between text-sm font-semibold text-amber-300 shadow-sm gap-4 mb-4 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <span className="animate-spin inline-block">
                                        ⏳
                                    </span>
                                    <span>
                                        Auto-scraping: processing page{' '}
                                        {pagination.currentPage + 1} /{' '}
                                        {maxScrapePages ||
                                            pagination.totalPages}
                                        ...
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        setScrapeAllPages(false);
                                        setAutoScraping(false);
                                    }}
                                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                >
                                    ⏹ Stop
                                </button>
                            </div>
                        )}
                        <PaginationBanner />

                        <div className="grid grid-cols-1 gap-6">
                            {displayedResults.map((card) => (
                                <ProductCard
                                    key={card.id}
                                    card={card}
                                    toggleCardCheck={toggleCardCheck}
                                    toggleUniquenessCheck={
                                        toggleUniquenessCheck
                                    }
                                    handleDepthChange={handleDepthChange}
                                    toggleCleanText={toggleCleanText}
                                    toggleLinkSave={toggleLinkSave}
                                    toggleLineCheck={toggleLineCheck}
                                />
                            ))}

                            {results.length === 0 && !loading && (
                                <div className="text-center text-slate-500 py-20 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                                    ✨ Dashboard is empty. Run a search.
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <PaginationBanner />
                        </div>
                    </main>
                </div>
            </div>
            <ProgressModal
                isOpen={isProgressModalOpen}
                onClose={() => setIsProgressModalOpen(false)}
                saveSteps={saveSteps}
            />
        </div>
    );
}

export default App;
