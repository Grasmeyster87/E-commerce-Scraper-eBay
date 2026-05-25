// src/App.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { CardService } from './services/CardService';
import DataTable from './components/DataTable';
import Sidebar from './components/Sidebar';
import ProductCard from './components/ProductCard';
import ProgressModal from './components/ProgressModal';

function App() {
    const [isTableRoute] = useState(
        () =>
            new URLSearchParams(window.location.search).get('view') === 'table',
    );

    const [query, setQuery] = useState(
        () => localStorage.getItem('savedQuery') || '',
    );
    const [results, setResults] = useState(() => {
        const saved = localStorage.getItem('savedResults');
        return saved ? JSON.parse(saved) : [];
    });
    const [loading, setLoading] = useState(false);

    // Новий стан для прапорця Debug HTML
    const [saveDebugHtml, setSaveDebugHtml] = useState(
        () => localStorage.getItem('saveDebugHtml') === 'true',
    );
    const [saveDir, setSaveDir] = useState(
        () => localStorage.getItem('saveDir') || 'backend/data',
    );

    useEffect(() => {
        localStorage.setItem('savedResults', JSON.stringify(results));
    }, [results]);

    useEffect(() => {
        localStorage.setItem('savedQuery', query);
    }, [query]);

    useEffect(() => {
        localStorage.setItem('saveDir', saveDir);
    }, [saveDir]);

    useEffect(() => {
        localStorage.setItem('saveDebugHtml', saveDebugHtml);
    }, [saveDebugHtml]);

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'savedResults' && e.newValue)
                setResults(JSON.parse(e.newValue));
            if (e.key === 'saveDir' && e.newValue) setSaveDir(e.newValue);
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const handleScrape = async () => {
        if (!query) return alert('Будь ласка, введіть запит для пошуку');
        setLoading(true);
        try {
            const backendUrl =
                import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';
            // Передаємо прапорець saveDebugHtml на бекенд
            const response = await axios.post(`${backendUrl}/api/scrape`, {
                query,
                saveDebugHtml,
            });

            const processed = CardService.processRawData(response.data.data);
            setResults(processed);
        } catch (error) {
            const serverError = error.response?.data?.error || error.message;
            console.error('Помилка:', serverError);
            alert(`Сталася помилка: ${serverError}`);
        } finally {
            setLoading(false);
        }
    };

    const openTableInNewTab = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('view', 'table');
        window.open(url.toString(), '_blank');
    };

    const handleChangeDirectory = () => {
        const newDir = window.prompt(
            'Введіть шлях до директорії збереження (відносно кореня сервера або абсолютний шлях):',
            saveDir,
        );
        if (newDir !== null && newDir.trim() !== '') {
            setSaveDir(newDir.trim());
        }
    };

    const handleSaveData = async (format) => {
        const tableData = CardService.extractTableData(results);
        if (tableData.length === 0)
            return alert('Немає активних карток для збереження!');

        try {
            const backendUrl =
                import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';
            const response = await axios.post(`${backendUrl}/api/save`, {
                format,
                data: tableData,
                directory: saveDir,
            });

            if (response.data.success) {
                alert(
                    `✅ Дані успішно збережено!\nШлях: ${response.data.filePath}`,
                );
            }
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message;
            alert(`❌ Помилка збереження: ${errorMsg}`);
        }
    };

    const handleSaveFormat = async (format) => {
        const tableData = CardService.extractTableData(results);
        if (!tableData || tableData.length === 0)
            return alert('Немає даних для збереження');

        try {
            const response = await axios.post(
                'http://localhost:5050/api/save',
                {
                    format,
                    data: tableData,
                    directory: saveDir, // Передаємо поточний каталог
                },
            );
            if (response.data.success) {
                alert(`Успішно збережено в: ${response.data.filePath}`);
            }
        } catch (error) {
            console.error('Помилка збереження:', error);
            alert(`Помилка: ${error.message}`);
        }
    };

    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [saveSteps, setSaveSteps] = useState([
        { id: 'csv', name: 'Експорт у формат CSV', status: 'idle', path: '' },
        { id: 'json', name: 'Експорт у формат JSON', status: 'idle', path: '' },
        {
            id: 'sqlite',
            name: 'Запис у базу даних SQLite3',
            status: 'idle',
            path: '',
        },
        {
            id: 'xml',
            name: 'Форматування в структуру XML',
            status: 'idle',
            path: '',
        },
        { id: 'pdf', name: 'Генерація PDF (pdfkit)', status: 'idle', path: '' },
    ]);

    const handleSaveAllFormats = async () => {
        const tableData = CardService.extractTableData(results);
        if (!tableData || tableData.length === 0) {
            alert('❌ Немає активних або вибраних даних для збереження!');
            return;
        }

        setIsProgressModalOpen(true);

        // Скидаємо статус усіх кроків до 'pending'
        setSaveSteps((prev) =>
            prev.map((step) => ({ ...step, status: 'pending', path: '' })),
        );

        // Список форматів для послідовного кола на бекенд
        const formats = ['csv', 'json', 'sqlite', 'xml', 'pdf'];

        for (const format of formats) {
            // Оновлюємо поточний крок на "завантажується"
            setSaveSteps((prev) =>
                prev.map((step) =>
                    step.id === format
                        ? { ...step, status: 'processing' }
                        : step,
                ),
            );

            try {
                const response = await axios.post(
                    'http://localhost:5050/api/save',
                    {
                        format,
                        data: tableData,
                        directory: saveDir,
                    },
                );

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
                } else {
                    throw new Error(response.data.error || 'Помилка виконання');
                }
            } catch (err) {
                console.error(`Помилка збереження для ${format}:`, err);
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

    const toggleCardCheck = (cardId) =>
        setResults((prev) =>
            prev.map((c) =>
                c.id === cardId ? { ...c, cardChecked: !c.cardChecked } : c,
            ),
        );
    const toggleUniquenessCheck = (cardId) =>
        setResults((prev) =>
            prev.map((c) =>
                c.id === cardId ? { ...c, uniqueness: !c.uniqueness } : c,
            ),
        );
    const toggleCleanText = (cardId) =>
        setResults((prev) => CardService.toggleCleanText(prev, cardId));
    const toggleLinkSave = (cardId, field) =>
        setResults((prev) => CardService.toggleLinkSave(prev, cardId, field));
    const handleDepthChange = (cardId, newValue) =>
        setResults((prev) =>
            CardService.handleDepthChange(prev, cardId, newValue),
        );
    const toggleLineCheck = (cardId, lineIndex) =>
        setResults((prev) =>
            CardService.toggleLineCheck(prev, cardId, lineIndex),
        );

    const handleClear = () => {
        if (window.confirm('Ви дійсно хочете очистити всі дані?')) {
            setResults([]);
            setQuery('');
            localStorage.removeItem('savedResults');
            localStorage.removeItem('savedQuery');
        }
    };

    // РЕНДЕР ТАБЛИЦІ
    if (isTableRoute) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
                <div className="flex justify-between items-center mb-4 px-2 flex-wrap gap-4">
                    <div className="flex flex-wrap items-center gap-6">
                        <h1 className="text-xl font-bold text-cyan-400">
                            Зведена таблиця даних
                        </h1>

                        {/* КНОПКИ ЕКСПОРТУ */}
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveAllFormats}
                                    className="bg-slate-800 hover:bg-slate-700 text-indigo-400 font-bold text-xs px-4 py-2 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
                                >
                                    📦 Експорт усього пакету значень
                                </button>
                            </div>
                            <button
                                onClick={() => handleSaveData('csv')}
                                className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-900/50 hover:bg-emerald-500/20 transition-colors"
                            >
                                CSV
                            </button>
                            <button
                                onClick={() => handleSaveData('json')}
                                className="bg-amber-500/10 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-900/50 hover:bg-amber-500/20 transition-colors"
                            >
                                JSON
                            </button>
                            <button
                                onClick={() => handleSaveData('sqlite')}
                                className="bg-blue-500/10 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-900/50 hover:bg-blue-500/20 transition-colors"
                            >
                                SQL
                            </button>
                            <button
                                onClick={() => handleSaveData('xml')}
                                className="bg-fuchsia-500/10 text-fuchsia-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-fuchsia-900/50 hover:bg-fuchsia-500/20 transition-colors"
                            >
                                XML
                            </button>
                            <button
                                onClick={() => handleSaveData('pdf')}
                                className="bg-rose-500/10 text-rose-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-900/50 hover:bg-rose-500/20 transition-colors"
                            >
                                PDF
                            </button>

 
                        </div>
                    </div>
                    <span className="text-xs text-slate-500">
                        Автосинхронізація увімкнена 🟢
                    </span>
                </div>
                <DataTable
                    results={results}
                    onDeleteRow={(cardId) => toggleCardCheck(cardId)}
                    onDeleteColumn={(path) =>
                        setResults((prev) =>
                            CardService.deleteColumn(prev, path),
                        )
                    }
                    onDeleteCell={(cardId, path) =>
                        setResults((prev) =>
                            CardService.deleteCell(prev, cardId, path),
                        )
                    }
                />
            </div>
        );
    }

    // РЕНДЕР КАРТОК
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 font-sans selection:bg-cyan-500 selection:text-slate-900">
            <div className="max-w-[1600px] mx-auto space-y-6">
                {/* ГОЛОВНА ПАНЕЛЬ ПОШУКУ */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-3xl shadow-2xl space-y-4">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                        eBay Structural Skeleton
                    </h1>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors text-slate-200 placeholder-slate-600 font-medium"
                            placeholder="Введіть товар для аналізу (наприклад: MacBook Pro)..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === 'Enter' && handleScrape()
                            }
                            disabled={loading}
                        />
                        <button
                            onClick={handleScrape}
                            disabled={loading}
                            className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shrink-0"
                        >
                            {loading ? 'Сканування...' : 'Сканувати'}
                        </button>
                    </div>

                    {/* НОВЕ: ЧЕКБОКС ЗБЕРЕЖЕННЯ HTML */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/50 mt-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                            <input
                                type="checkbox"
                                className="w-4 h-4 accent-indigo-500 rounded border-slate-700 bg-slate-900 cursor-pointer"
                                checked={saveDebugHtml}
                                onChange={(e) =>
                                    setSaveDebugHtml(e.target.checked)
                                }
                            />
                            Зберігати оригінальний HTML в backend/data/debug
                            (для аналізу верстки eBay)
                        </label>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* ЛІВА СТИКІ-ПАНЕЛЬ МЕНЮ */}
                    <Sidebar 
                        saveDir={saveDir}
                        setSaveDir={setSaveDir}
                        openTableInNewTab={openTableInNewTab}
                        results={results}
                        handleSaveAllFormats={handleSaveAllFormats}
                        handleSaveData={handleSaveData}
                        handleClear={handleClear}
                    />

                    {/* ПРАВА ОСНОВНА ЧАСТИНА (Без змін) */}
                    <main className="flex-1 w-full min-w-0">
                        <div className="grid grid-cols-1 gap-6">
                            {results.map((card) => (
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
                                    ✨ Панель порожня. Введіть пошуковий запит,
                                    щоб отримати динамічні структури.
                                </div>
                            )}
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
