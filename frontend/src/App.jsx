// src/App.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { CardService } from './services/CardService';
import DataTable from './components/DataTable';

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

                    {/* ПРАВА ОСНОВНА ЧАСТИНА (Без змін) */}
                    <main className="flex-1 w-full min-w-0">
                        <div className="grid grid-cols-1 gap-6">
                            {results.map((card) => (
                                <div
                                    key={card.id}
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
                                                                        className="w-3.5 h-3.5 accent-emerald-500 shrink-0 cursor-pointer rounded"
                                                                        checked={
                                                                            line.checked
                                                                        }
                                                                        disabled={
                                                                            !card.cardChecked
                                                                        }
                                                                        onChange={() =>
                                                                            toggleLineCheck(
                                                                                card.id,
                                                                                line.index,
                                                                            )
                                                                        }
                                                                    />
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center mr-2 text-cyan-500 font-bold text-sm select-none pl-2">
                                                                •
                                                            </div>
                                                        )}

                                                        <div className="flex-1 py-1.5 overflow-hidden">
                                                            <span
                                                                className={`tracking-wide break-all block leading-relaxed ${line.isHtmlTag ? 'text-indigo-400 font-mono text-xs opacity-90' : 'text-slate-200 font-bold text-sm'}`}
                                                            >
                                                                {line.text}
                                                            </span>
                                                            {!card.showCleanText &&
                                                                !line.isHtmlTag &&
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
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
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
            {isProgressModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl p-6 overflow-hidden">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                                🔄 Пакетне збереження файлів...
                            </h3>
                            <button
                                onClick={() => setIsProgressModalOpen(false)}
                                className="text-slate-500 hover:text-slate-300 transition-colors text-sm font-bold p-1"
                            >
                                ✕ Закрити
                            </button>
                        </div>

                        <div className="space-y-3 my-6">
                            {saveSteps.map((step) => (
                                <div
                                    key={step.id}
                                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                        step.status === 'processing'
                                            ? 'bg-indigo-950/40 border-indigo-500/50 shadow-sm'
                                            : step.status === 'success'
                                              ? 'bg-emerald-950/20 border-emerald-500/30'
                                              : step.status === 'error'
                                                ? 'bg-red-950/20 border-red-500/30'
                                                : 'bg-slate-950/40 border-slate-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Іконка статусів */}
                                        {step.status === 'pending' && (
                                            <span className="w-2 h-2 rounded-full bg-slate-700 block"></span>
                                        )}
                                        {step.status === 'processing' && (
                                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        )}
                                        {step.status === 'success' && (
                                            <span className="text-emerald-400 font-bold text-sm">
                                                ✅
                                            </span>
                                        )}
                                        {step.status === 'error' && (
                                            <span className="text-red-400 font-bold text-sm">
                                                ❌
                                            </span>
                                        )}

                                        <div>
                                            <p
                                                className={`text-sm font-semibold ${step.status === 'processing' ? 'text-indigo-300' : 'text-slate-300'}`}
                                            >
                                                {step.name}
                                            </p>
                                            {step.status === 'success' && (
                                                <p
                                                    className="text-[10px] text-slate-500 font-mono truncate max-w-[320px]"
                                                    title={step.path}
                                                >
                                                    Шлях: {step.path}
                                                </p>
                                            )}
                                            {step.status === 'error' && (
                                                <p className="text-[10px] text-red-400 font-mono">
                                                    Помилка: {step.error}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <span className="text-xs font-mono font-bold">
                                        {step.status === 'pending' && (
                                            <span className="text-slate-600">
                                                Очікування
                                            </span>
                                        )}
                                        {step.status === 'processing' && (
                                            <span className="text-indigo-400 animate-pulse">
                                                Обробка...
                                            </span>
                                        )}
                                        {step.status === 'success' && (
                                            <span className="text-emerald-400">
                                                Готово
                                            </span>
                                        )}
                                        {step.status === 'error' && (
                                            <span className="text-red-400">
                                                Збій
                                            </span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end border-t border-slate-800 pt-4">
                            <button
                                onClick={() => setIsProgressModalOpen(false)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs px-5 py-2.5 rounded-xl transition-colors"
                            >
                                Зрозуміло
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
