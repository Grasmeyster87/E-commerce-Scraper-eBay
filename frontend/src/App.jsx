import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { CardService } from './services/CardService';
import DataTable from './components/DataTable';
import Sidebar from './components/Sidebar';
import ProductCard from './components/ProductCard';
import ProgressModal from './components/ProgressModal';

function App() {
    // ОНОВЛЕНО: Тепер це звичайний стан, ми не використовуємо URL для таблиці
    const [isTableRoute, setIsTableRoute] = useState(false);
    
    const [query, setQuery] = useState(() => localStorage.getItem('savedQuery') || '');
    const [results, setResults] = useState(() => {
        const saved = localStorage.getItem('savedResults');
        return saved ? JSON.parse(saved) : [];
    });
    const [loading, setLoading] = useState(false);
    const [autoScraping, setAutoScraping] = useState(false);
    const [saveDebugHtml, setSaveDebugHtml] = useState(() => localStorage.getItem('saveDebugHtml') === 'true');
    const [saveDir, setSaveDir] = useState(() => localStorage.getItem('saveDir') || 'backend/data');

    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, itemsPerPage: 0 });
    const [scrapeAllPages, setScrapeAllPages] = useState(false);
    const [maxScrapePages, setMaxScrapePages] = useState(0); 
    const [itemsPerPageSelection, setItemsPerPageSelection] = useState(60);
    const [frontendPage, setFrontendPage] = useState(1);
    
    const autoScrapeRef = useRef(scrapeAllPages);
    const maxPagesRef = useRef(maxScrapePages);
    const autoScrapingRef = useRef(false);
    useEffect(() => { autoScrapeRef.current = scrapeAllPages; }, [scrapeAllPages]);
    useEffect(() => { maxPagesRef.current = maxScrapePages; }, [maxScrapePages]);
    useEffect(() => { autoScrapingRef.current = autoScraping; }, [autoScraping]);

    const saveTimerRef = useRef(null);
    useEffect(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        const delay = autoScrapingRef.current ? 5000 : 300; 
        saveTimerRef.current = setTimeout(() => {
            try { localStorage.setItem('savedResults', JSON.stringify(results)); } catch(e) { console.warn('Досягнуто ліміт localStorage. Дані в пам\'яті збережені, але після оновлення сторінки частина може бути втрачена.'); }
        }, delay);
        return () => clearTimeout(saveTimerRef.current);
    }, [results]);
    useEffect(() => { localStorage.setItem('savedQuery', query); }, [query]);
    useEffect(() => { localStorage.setItem('saveDir', saveDir); }, [saveDir]);
    useEffect(() => { localStorage.setItem('saveDebugHtml', saveDebugHtml); }, [saveDebugHtml]);

    const handleScrape = async (action = 'search', isAutoCall = false) => {
        if (!query && action === 'search') return alert('Будь ласка, введіть запит для пошуку');
        
        if (!isAutoCall) setLoading(true);
        
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';
            const response = await axios.post(`${backendUrl}/api/scrape`, {
                query, saveDebugHtml, action, itemsPerPage: itemsPerPageSelection
            });

            const processed = CardService.processRawData(response.data.data);
            
            if (action === 'next') setResults(prev => [...prev, ...processed]); 
            else setResults(processed); 
            
            setPagination(response.data.pagination);
            if (action === 'search') setFrontendPage(1);

            if (autoScrapeRef.current && response.data.pagination.currentPage < response.data.pagination.totalPages) {
                if (!maxPagesRef.current || response.data.pagination.currentPage < maxPagesRef.current) {
                    console.log(`Запуск таймера для сторінки ${response.data.pagination.currentPage + 1}...`);
                    setAutoScraping(true);
                    setTimeout(() => handleScrape('next', true), 3000); 
                    return; 
                }
            }
            
            setAutoScraping(false);

        } catch (error) {
            const serverError = error.response?.data?.error || error.message;
            console.error('Помилка:', serverError);
            setAutoScraping(false);
            if (!isAutoCall) alert(`Сталася помилка: ${serverError}`);
        } finally {
            if (!isAutoCall) setLoading(false);
        }
    };

    // ОНОВЛЕНО: Відкриваємо таблицю безпосередньо в цій же вкладці
    const openTableInSameTab = () => {
        setIsTableRoute(true);
        window.scrollTo(0, 0); // Прокрутка вгору при відкритті
    };

    const handleSaveData = async (format) => {
        const tableData = CardService.extractTableData(results);
        if (tableData.length === 0) return alert('Немає активних карток для збереження!');

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';
            const response = await axios.post(`${backendUrl}/api/save`, {
                format, data: tableData, directory: saveDir,
            });
            if (response.data.success) alert(`✅ Дані успішно збережено!\nШлях: ${response.data.filePath}`);
        } catch (error) {
            alert(`❌ Помилка збереження: ${error.response?.data?.error || error.message}`);
        }
    };

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
                const response = await axios.post('http://localhost:5050/api/save', { format, data: tableData, directory: saveDir });
                if (response.data.success) {
                    setSaveSteps((prev) => prev.map((step) => step.id === format ? { ...step, status: 'success', path: response.data.filePath } : step));
                } else throw new Error(response.data.error || 'Помилка');
            } catch (err) {
                setSaveSteps((prev) => prev.map((step) => step.id === format ? { ...step, status: 'error', error: err.message } : step));
            }
        }
    };

    const toggleCardCheck = (cardId) => setResults((prev) => prev.map((c) => c.id === cardId ? { ...c, cardChecked: !c.cardChecked } : c));
    const toggleUniquenessCheck = (cardId) => setResults((prev) => prev.map((c) => c.id === cardId ? { ...c, uniqueness: !c.uniqueness } : c));
    const toggleCleanText = (cardId) => setResults((prev) => CardService.toggleCleanText(prev, cardId));
    const toggleLinkSave = (cardId, field) => setResults((prev) => CardService.toggleLinkSave(prev, cardId, field));
    const handleDepthChange = (cardId, newValue) => setResults((prev) => CardService.handleDepthChange(prev, cardId, newValue));
    const toggleLineCheck = (cardId, lineIndex) => setResults((prev) => CardService.toggleLineCheck(prev, cardId, lineIndex));
    const handleClear = () => {
        if (window.confirm('Очистити всі дані?')) {
            setResults([]); setQuery(''); setPagination({ currentPage: 1, totalPages: 1, itemsPerPage: 0 });
            localStorage.removeItem('savedResults'); localStorage.removeItem('savedQuery');
        }
    };

    const totalFrontendPages = Math.ceil(results.length / itemsPerPageSelection);
    const displayedResults = results.slice((frontendPage - 1) * itemsPerPageSelection, frontendPage * itemsPerPageSelection);

    const PaginationBanner = () => (
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
                        onClick={() => setFrontendPage(p => Math.max(1, p - 1))}
                        disabled={frontendPage === 1}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white px-3 py-1 rounded-md transition-colors"
                    >
                        ◀
                    </button>
                    <span className="bg-indigo-500/20 px-3 py-1 rounded-md text-indigo-200 border border-indigo-500/30">
                        {frontendPage} / {Math.max(1, totalFrontendPages)}
                    </span>
                    <button 
                        onClick={() => setFrontendPage(p => Math.min(totalFrontendPages, p + 1))}
                        disabled={frontendPage === totalFrontendPages || totalFrontendPages === 0}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white px-3 py-1 rounded-md transition-colors"
                    >
                        ▶
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <span>📊 Всього зібрано у базу:</span>
                    <span className="bg-emerald-500/20 px-3 py-1 rounded-md text-emerald-300 border border-emerald-500/30">
                        {results.length} шт.
                    </span>
                </div>
            </div>
        )
    );

    // ОНОВЛЕНО: Відображення таблиці в тому самому дереві React
    if (isTableRoute) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans flex flex-col">
                <h1 className="text-xl font-bold text-cyan-400 text-center mb-4">Таблиця виводу</h1>
                <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
                    <button onClick={handleSaveAllFormats} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-lg transition-all">⚡ Збереження в усі формати</button>
                    <button onClick={() => handleSaveData('csv')} className="bg-emerald-500/10 text-emerald-400 text-[11px] font-bold py-1.5 px-3 rounded-lg border border-emerald-900/50 hover:bg-emerald-500/20">CSV</button>
                    <button onClick={() => handleSaveData('json')} className="bg-amber-500/10 text-amber-400 text-[11px] font-bold py-1.5 px-3 rounded-lg border border-amber-900/50 hover:bg-amber-500/20">JSON</button>
                    <button onClick={() => handleSaveData('sqlite')} className="bg-blue-500/10 text-blue-400 text-[11px] font-bold py-1.5 px-3 rounded-lg border border-blue-900/50 hover:bg-blue-500/20">SQL</button>
                    <button onClick={() => handleSaveData('xml')} className="bg-fuchsia-500/10 text-fuchsia-400 text-[11px] font-bold py-1.5 px-3 rounded-lg border border-fuchsia-900/50 hover:bg-fuchsia-500/20">XML</button>
                    <button onClick={() => handleSaveData('pdf')} className="bg-rose-500/10 text-rose-400 text-[11px] font-bold py-1.5 px-3 rounded-lg border border-rose-900/50 hover:bg-rose-500/20">PDF</button>
                </div>
                
                {/* Передаємо додаткові props для керування пагінацією та закриттям таблиці */}
                <DataTable 
                    results={results} 
                    onDeleteRow={(id) => toggleCardCheck(id)} 
                    onDeleteColumn={(p) => setResults(prev => CardService.deleteColumn(prev, p))} 
                    onDeleteCell={(id, p) => setResults(prev => CardService.deleteCell(prev, id, p))} 
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
                            className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg active:scale-95 disabled:opacity-50 shrink-0"
                        >
                            {loading ? 'Сканування...' : 'Новий Пошук'}
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
                        saveDir={saveDir} setSaveDir={setSaveDir} 
                        openTableInNewTab={openTableInSameTab} /* Передаємо нову функцію */
                        results={results} handleSaveAllFormats={handleSaveAllFormats} handleSaveData={handleSaveData} handleClear={handleClear}
                        pagination={pagination} scrapeAllPages={scrapeAllPages} setScrapeAllPages={setScrapeAllPages}
                        onNextPage={() => handleScrape('next')} loading={loading}
                        maxScrapePages={maxScrapePages} setMaxScrapePages={setMaxScrapePages}
                        itemsPerPageSelection={itemsPerPageSelection} setItemsPerPageSelection={setItemsPerPageSelection}
                    />

                    <main className="flex-1 w-full min-w-0">
                        {autoScraping && (
                            <div className="bg-amber-950/40 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between text-sm font-semibold text-amber-300 shadow-sm gap-4 mb-4 animate-pulse">
                                <div className="flex items-center gap-3">
                                    <span className="animate-spin inline-block">⏳</span>
                                    <span>Авто-скрапінг: завантажується сторінка {pagination.currentPage + 1} / {maxScrapePages || pagination.totalPages}...</span>
                                </div>
                                <button 
                                    onClick={() => { setScrapeAllPages(false); setAutoScraping(false); }}
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
                                    key={card.id} card={card} toggleCardCheck={toggleCardCheck} toggleUniquenessCheck={toggleUniquenessCheck}
                                    handleDepthChange={handleDepthChange} toggleCleanText={toggleCleanText} toggleLinkSave={toggleLinkSave} toggleLineCheck={toggleLineCheck}
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