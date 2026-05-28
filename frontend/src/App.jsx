import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { CardService } from './services/CardService';
import DataTable from './components/DataTable';
import Sidebar from './components/Sidebar';
import ProductCard from './components/ProductCard';
import ProgressModal from './components/ProgressModal';

function App() {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';

    // Стан налаштувань SQLite
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

    const [activeTable, setActiveTable] = useState('');
    const [results, setResults] = useState([]); // Повний накопичувальний масив поточної сесії
    const [isTableRoute, setIsTableRoute] = useState(false);
    const [query, setQuery] = useState(() => localStorage.getItem('savedQuery') || '');
    const [loading, setLoading] = useState(false);
    const [autoScraping, setAutoScraping] = useState(false);
    const [saveDebugHtml, setSaveDebugHtml] = useState(false);
    const [saveDir, setSaveDir] = useState('backend/data');

    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        itemsPerPage: 60,
    });
    const [scrapeAllPages, setScrapeAllPages] = useState(false);
    const [maxScrapePages, setMaxScrapePages] = useState(0);
    const [itemsPerPageSelection, setItemsPerPageSelection] = useState(60);
    const [frontendPage, setFrontendPage] = useState(1);

    const autoScrapeRef = useRef(scrapeAllPages);
    const maxPagesRef = useRef(maxScrapePages);
    useEffect(() => { autoScrapeRef.current = scrapeAllPages; }, [scrapeAllPages]);
    useEffect(() => { maxPagesRef.current = maxScrapePages; }, [maxScrapePages]);

    useEffect(() => {
        localStorage.setItem('dbSettings', JSON.stringify(dbSettings));
    }, [dbSettings]);
    useEffect(() => {
        localStorage.setItem('savedQuery', query);
    }, [query]);

    // Завантаження останньої збереженої таблиці при старті проекту
    useEffect(() => {
        if (dbSettings.loadLatestOnStart) {
            axios
                .post(`${backendUrl}/api/tables/latest`, { dbSettings })
                .then((res) => {
                    if (res.data.tableName) {
                        setActiveTable(res.data.tableName);
                        // Одноразово стягуємо всі наявні записи для відновлення стану фронтенду
                        axios.post(`${backendUrl}/api/cards/list`, {
                            dbSettings,
                            tableName: res.data.tableName,
                            page: 1,
                            limit: 100000
                        }).then(cardsRes => {
                            setResults(cardsRes.data.cards);
                            setFrontendPage(1);
                        });
                    }
                })
                .catch((err) => console.error('Помилка завантаження останньої таблиці', err));
        }
    }, [dbSettings.source]);

    // ГОЛОВНИЙ СКРАПІНГ (ВИПРАВЛЕНО ЗАМИКАННЯ ЧЕРЕЗ RECURSIVE OVERRIDE)
    const handleScrape = async (action = 'search', isAutoCall = false, overrideTable = null) => {
        if (!query && action === 'search') return alert('Будь ласка, введіть запит для пошуку');
        if (!isAutoCall) setLoading(true);

        // Визначаємо ім'я таблиці: пріоритет у переданого аргументу, щоб уникнути stale closure
        const currentTableName = overrideTable || activeTable;

        try {
            const response = await axios.post(`${backendUrl}/api/scrape`, {
                query,
                saveDebugHtml,
                action,
                itemsPerPage: itemsPerPageSelection,
                dbSettings,
                activeTable: currentTableName,
            });

            if (!response.data.success) throw new Error(response.data.error || 'Помилка сервера');

            const newTableName = response.data.tableName;

            if (action === 'search') {
                setActiveTable(newTableName);
                setResults(response.data.data); // Для нового пошуку перезаписуємо стейт
                setFrontendPage(1);
            } else {
                // Для наступних сторінок — стабільно накопичуємо нові картки у кінець масиву
                setResults((prev) => [...prev, ...response.data.data]);
            }

            setPagination(response.data.pagination);

            // Логіка авто-скрапінгу наступних сторінок
            if (
                autoScrapeRef.current &&
                response.data.pagination.currentPage < response.data.pagination.totalPages
            ) {
                if (!maxPagesRef.current || response.data.pagination.currentPage < maxPagesRef.current) {
                    setAutoScraping(true);
                    // Передаємо актуальне ім'я таблиці прямо в наступний виклик функції!
                    setTimeout(() => handleScrape('next', true, newTableName), 3000);
                    return;
                }
            }
            setAutoScraping(false);
        } catch (error) {
            console.error('Помилка скрапінгу:', error);
            setAutoScraping(false);
            if (!isAutoCall) alert(`Сталася помилка: ${error.message}`);
        } finally {
            if (!isAutoCall) setLoading(false);
        }
    };

    // Оновлення поодинокої картки в базі даних SQLite3
    const updateCardInDb = async (updatedCard) => {
        try {
            await axios.put(`${backendUrl}/api/cards/${updatedCard.id}`, {
                dbSettings,
                tableName: activeTable,
                updates: updatedCard,
            });
        } catch (err) {
            console.error('Помилка оновлення запису в БД', err);
        }
    };

    const handleActionAndSync = (actionFunc, cardId, ...args) => {
        const newResults = actionFunc(results, cardId, ...args);
        setResults(newResults);
        const updatedCard = newResults.find((c) => c.id === cardId);
        if (updatedCard) updateCardInDb(updatedCard);
    };

    const toggleCardCheck = (id) =>
        handleActionAndSync((res, cid) => res.map((c) => c.id === cid ? { ...c, cardChecked: !c.cardChecked } : c), id);
    const toggleUniquenessCheck = (id) =>
        handleActionAndSync((res, cid) => res.map((c) => c.id === cid ? { ...c, uniqueness: !c.uniqueness } : c), id);
    const toggleCleanText = (id) => handleActionAndSync(CardService.toggleCleanText, id);
    const toggleLinkSave = (id, field) => handleActionAndSync(CardService.toggleLinkSave, id, field);
    const handleDepthChange = (id, val) => handleActionAndSync(CardService.handleDepthChange, id, val);
    const toggleLineCheck = (id, lineIdx) => handleActionAndSync(CardService.toggleLineCheck, id, lineIdx);

    const handleClear = () => {
        if (window.confirm('Очистити робоче вікно? (Дані в БД залишаться)')) {
            setActiveTable('');
            setResults([]);
            setQuery('');
            setPagination({ currentPage: 1, totalPages: 1, itemsPerPage: 60 });
        }
    };

    const handleSaveData = async (format) => {
        if (!activeTable) return alert('Немає активної таблиці!');
        try {
            const res = await axios.post(`${backendUrl}/api/save`, {
                format,
                directory: saveDir,
                dbSettings,
                tableName: activeTable,
            });
            if (res.data.success) alert(`✅ Збережено!\nШлях: ${res.data.filePath}`);
        } catch (error) {
            alert(`❌ Помилка: ${error.response?.data?.error || error.message}`);
        }
    };

    // Розрахунок пагінації для локального масиву відображення
    const totalFrontendPages = Math.max(1, Math.ceil(results.length / itemsPerPageSelection));
    const displayedResults = results.slice(
        (frontendPage - 1) * itemsPerPageSelection,
        frontendPage * itemsPerPageSelection
    );

    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [saveSteps, setSaveSteps] = useState([
        { id: 'csv', name: 'Експорт CSV', status: 'idle', path: '' },
        { id: 'json', name: 'Експорт JSON', status: 'idle', path: '' },
        { id: 'sqlite', name: 'Експорт SQLite3', status: 'idle', path: '' },
        { id: 'xml', name: 'Експорт XML', status: 'idle', path: '' },
        { id: 'pdf', name: 'Експорт PDF', status: 'idle', path: '' },
    ]);

    const handleSaveAllFormats = async () => {
        const tableData = CardService.extractTableData(results);
        if (!tableData || tableData.length === 0) return alert('❌ Немає активних даних!');
        
        setIsProgressModalOpen(true);
        setSaveSteps((prev) => prev.map((step) => ({ ...step, status: 'pending', path: '' })));
        const formats = ['csv', 'json', 'sqlite', 'xml', 'pdf'];

        for (const format of formats) {
            setSaveSteps((prev) => prev.map((step) => step.id === format ? { ...step, status: 'processing' } : step));
            try {
                const response = await axios.post(`${backendUrl}/api/save`, { 
                    format, directory: saveDir, dbSettings, tableName: activeTable 
                });
                if (response.data.success) {
                    setSaveSteps((prev) =>
                        prev.map((step) => step.id === format ? { ...step, status: 'success', path: response.data.filePath } : step)
                    );
                } else throw new Error(response.data.error || 'Помилка');
            } catch (err) {
                setSaveSteps((prev) =>
                    prev.map((step) => step.id === format ? { ...step, status: 'error', error: err.message } : step)
                );
            }
        }
    };

    const PaginationBanner = () =>
        results.length > 0 && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-2xl flex flex-wrap justify-between items-center text-sm font-semibold text-indigo-300 shadow-sm gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <span>📄 Сторінка скрапера:</span>
                    <span className="bg-indigo-500/20 px-3 py-1 rounded-md text-indigo-200 border border-indigo-500/30">
                        {pagination.currentPage} / {pagination.totalPages || '?'}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <span>Відображення:</span>
                    <button
                        onClick={() => setFrontendPage((p) => Math.max(1, p - 1))}
                        disabled={frontendPage === 1}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white px-3 py-1 rounded-md transition-colors"
                    >
                        ◀
                    </button>
                    <span className="bg-indigo-500/20 px-3 py-1 rounded-md text-indigo-200 border border-indigo-500/30">
                        {frontendPage} / {totalFrontendPages}
                    </span>
                    <button
                        onClick={() => setFrontendPage((p) => Math.min(totalFrontendPages, p + 1))}
                        disabled={frontendPage === totalFrontendPages || totalFrontendPages === 0}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white px-3 py-1 rounded-md transition-colors"
                    >
                        ▶
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <span>📊 Накопичено в таблиці:</span>
                    <span className="bg-emerald-500/20 px-3 py-1 rounded-md text-emerald-300 border border-emerald-500/30">
                        {results.length} шт.
                    </span>
                </div>
            </div>
        );

    if (isTableRoute) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans flex flex-col">
                <h1 className="text-xl font-bold text-cyan-400 text-center mb-4">Таблиця виводу</h1>
                <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
                    <button onClick={handleSaveAllFormats} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-lg transition-all">⚡ Збереження в усі формати</button>
                    {['csv', 'json', 'sqlite', 'xml', 'pdf'].map(fmt => (
                        <button key={fmt} onClick={() => handleSaveData(fmt)} className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-bold py-1.5 px-3 rounded-lg uppercase hover:bg-slate-800">{fmt}</button>
                    ))}
                </div>

                <DataTable
                    results={results}
                    onDeleteRow={(id) => toggleCardCheck(id)}
                    onDeleteColumn={(p) => setResults((prev) => CardService.deleteColumn(prev, p))}
                    onDeleteCell={(id, p) => setResults((prev) => CardService.deleteCell(prev, id, p))}
                    itemsPerPageSelection={itemsPerPageSelection}
                    onClose={() => setIsTableRoute(false)}
                />

                <ProgressModal isOpen={isProgressModalOpen} onClose={() => setIsProgressModalOpen(false)} saveSteps={saveSteps} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans selection:bg-cyan-500 selection:text-slate-900">
            <div className="max-w-[1600px] mx-auto space-y-6">
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-3xl shadow-2xl space-y-4">
                    <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">eBay Structural Skeleton</h1>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-cyan-500/50 outline-none text-slate-200 placeholder-slate-600"
                            placeholder="Введіть товар..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleScrape('search')}
                            disabled={loading}
                        />
                        <button
                            onClick={() => handleScrape('search')}
                            disabled={loading}
                            className="bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg active:scale-95 disabled:opacity-50 shrink-0"
                        >
                            {loading && !autoScraping ? 'Сканування...' : 'Новий Пошук'}
                        </button>
                    </div>

                    <div className="flex items-center gap-3 px-2">
                        <label className="flex items-center gap-2 cursor-pointer group text-slate-400 text-sm hover:text-slate-200 transition-colors">
                            <input
                                type="checkbox"
                                checked={saveDebugHtml}
                                onChange={(e) => setSaveDebugHtml(e.target.checked)}
                                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                            />
                            <span>Зберігати HTML сторінок для відлагодження</span>
                        </label>
                    </div>
                </div>

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
                    />

                    <main className="flex-1 w-full min-w-0">
                        {autoScraping && (
                            <div className="bg-amber-950/40 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between text-sm font-semibold text-amber-300 shadow-sm gap-4 mb-4 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <span className="animate-spin inline-block">⏳</span>
                                    <span>Авто-скрапінг: обробка сторінки {pagination.currentPage + 1} / {maxScrapePages || pagination.totalPages}...</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setScrapeAllPages(false);
                                        setAutoScraping(false);
                                    }}
                                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                >
                                    ⏹ Зупинити
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
                                    toggleUniquenessCheck={toggleUniquenessCheck}
                                    handleDepthChange={handleDepthChange}
                                    toggleCleanText={toggleCleanText}
                                    toggleLinkSave={toggleLinkSave}
                                    toggleLineCheck={toggleLineCheck}
                                />
                            ))}

                            {results.length === 0 && !loading && (
                                <div className="text-center text-slate-500 py-20 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                                    ✨ Панель порожня. Зробіть пошук.
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <PaginationBanner />
                        </div>
                    </main>
                </div>
            </div>
            <ProgressModal isOpen={isProgressModalOpen} onClose={() => setIsProgressModalOpen(false)} saveSteps={saveSteps} />
        </div>
    );
}

export default App;