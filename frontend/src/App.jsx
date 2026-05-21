import React, { useState } from 'react';
import axios from 'axios';

function App() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);

    const handleScrape = async () => {
        if (!query) return alert('Будь ласка, введіть запит для пошуку');
        setLoading(true);
        try {
            const backendUrl =
                import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
            const response = await axios.post(`${backendUrl}/api/scrape`, {
                query,
            });
            setResults(response.data.data);
        } catch (error) {
            const serverError = error.response?.data?.error || error.message;
            console.error('Помилка:', serverError);
            alert(`Сталася помилка: ${serverError}`);
        } finally {
            setLoading(false);
        }
    };

    // Перемикач для головного чекбоксу картки
    const toggleCardCheck = (cardId) => {
        setResults((prev) =>
            prev.map((card) =>
                card.id === cardId
                    ? { ...card, cardChecked: !card.cardChecked }
                    : card,
            ),
        );
    };

    // Перемикач для конкретного рядка всередині картки
    const toggleLineCheck = (cardId, lineIndex) => {
        setResults((prev) =>
            prev.map((card) => {
                if (card.id !== cardId) return card;
                return {
                    ...card,
                    lines: card.lines.map((line) =>
                        line.index === lineIndex
                            ? { ...line, checked: !line.checked }
                            : line,
                    ),
                };
            }),
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-cyan-400 mb-8 text-center tracking-wide">
                    🛒 eBay Agnostic Scraper Pro
                </h1>

                {/* Панель пошуку */}
                <div className="flex gap-4 mb-10 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                    <input
                        type="text"
                        className="flex-1 bg-slate-950 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-400 text-lg"
                        placeholder="Введіть товар (наприклад: laptops, iphone)..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                        disabled={loading}
                    />
                    <button
                        className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 text-slate-950 font-bold px-6 py-2 rounded-lg transition-all text-lg cursor-pointer flex items-center"
                        onClick={handleScrape}
                        disabled={loading}
                    >
                        {loading ? '⚡ Скрапінг...' : '🚀 Запуск'}
                    </button>
                </div>

                {/* Сітка результатів */}
                <div className="grid grid-cols-1 gap-6">
                    {results.map((card) => (
                        <div
                            key={card.id}
                            className={`flex flex-col md:flex-row gap-6 bg-slate-800 p-5 rounded-xl border transition-all shadow-md ${
                                card.cardChecked
                                    ? 'border-slate-700 opacity-100'
                                    : 'border-red-950 opacity-50 bg-slate-900'
                            }`}
                        >
                            {/* ЛІВА ЧАСТИНА: Фото + Керування карткою */}
                            <div className="flex flex-col items-center w-full md:w-48 shrink-0 bg-slate-950 p-3 rounded-lg border border-slate-700 justify-between">
                                {card.img ? (
                                    <img
                                        src={card.img}
                                        alt="Product"
                                        className="w-full h-36 object-contain rounded mb-3"
                                    />
                                ) : (
                                    <div className="w-full h-36 bg-slate-900 flex items-center justify-center text-slate-600 rounded mb-3 text-sm">
                                        Немає фото
                                    </div>
                                )}

                                <div className="w-full border-t border-slate-800 pt-3 flex flex-col gap-2">
                                    <label className="flex items-center justify-center gap-2 bg-slate-900 py-1.5 px-3 rounded border border-slate-700 cursor-pointer text-xs font-semibold hover:bg-slate-800 transition-all">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-cyan-400 cursor-pointer"
                                            checked={card.cardChecked}
                                            onChange={() =>
                                                toggleCardCheck(card.id)
                                            }
                                        />
                                        <span
                                            className={
                                                card.cardChecked
                                                    ? 'text-cyan-400'
                                                    : 'text-red-400'
                                            }
                                        >
                                            {card.cardChecked
                                                ? 'Включено'
                                                : 'Унікальна'}
                                        </span>
                                    </label>

                                    {card.url && (
                                        <a
                                            href={card.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-center text-xs text-slate-400 hover:text-cyan-400 underline transition-all truncate"
                                        >
                                            🔗 Перейти на eBay
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* ПРАВА ЧАСТИНА: Стовпчик з ієрархічними рядками контенту */}
                            {/* ПРАВА ЧАСТИНА: Стовпчик з ієрархічними рядками контенту */}
                            <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                {card.lines.map((line) => (
                                    <div
                                        key={line.index}
                                        className={`flex items-stretch gap-2 bg-slate-900/40 px-3 py-1 rounded border transition-all ${
                                            line.checked
                                                ? 'border-slate-700/50'
                                                : 'border-slate-800 opacity-50 line-through'
                                        }`}
                                    >
                                        {/* 1. Номер по порядку (залишається без змін) */}
                                        <div className="flex items-center shrink-0 w-8">
                                            <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-cyan-500 w-full text-center">
                                                {line.index}
                                            </span>
                                        </div>

                                        {/* 2. СТРУКТУРА ДЕРЕВА (Повністю на CSS — лінії та кінцева гілка об'єднані) */}
                                        <div className="flex shrink-0 items-stretch ml-1">
                                            {/* Малюємо вертикальні лінії для попередніх рівнів глибини */}
                                            {Array.from({
                                                length: line.depth,
                                            }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="w-4 border-l border-slate-800/60 h-full shrink-0"
                                                />
                                            ))}

                                            {/* Кінцева гілка поточного рядка */}
                                            <div className="w-4 h-full relative shrink-0">
                                                {/* Головна вертикальна вісь гілки */}
                                                <div className="absolute left-0 top-0 bottom-0 border-l border-slate-800/60" />

                                                {/* Горизонтальний відвід (малюється замість "─", якщо елемент вкладений) */}
                                                {line.depth > 0 && (
                                                    <div className="absolute left-0 top-1/2 w-2 border-t border-slate-800/60" />
                                                )}
                                            </div>
                                        </div>

                                        {/* 3. Чекбокс (відокремлений невеликим відступом від CSS-гілки) */}
                                        <div className="flex items-center shrink-0 pl-1 mr-2">
                                            <input
                                                type="checkbox"
                                                className="w-3 h-3 accent-emerald-500 cursor-pointer"
                                                checked={line.checked}
                                                disabled={!card.cardChecked}
                                                onChange={() =>
                                                    toggleLineCheck(
                                                        card.id,
                                                        line.index,
                                                    )
                                                }
                                            />
                                        </div>

                                        {/* 4. Текст (Структура або Контент) */}
                                        <div className="flex-1 py-1.5">
                                            <span
                                                className={`tracking-wide break-all block leading-relaxed ${
                                                    line.isStructure
                                                        ? 'text-indigo-400 font-mono text-xs opacity-80'
                                                        : 'text-slate-100 font-medium text-sm'
                                                }`}
                                            >
                                                {line.text}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {results.length === 0 && !loading && (
                        <div className="text-center text-slate-500 py-20 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700">
                            ✨ Таблиця пуста. Введіть пошуковий запит, щоб
                            отримати динамічні структури.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;
