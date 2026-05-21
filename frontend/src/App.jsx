import { useState } from 'react';
import axios from 'axios'; // Виправлено імпорт бібліотеки axios

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

    // Перемикач для головного чекбоксу картки (Зберігати)
    const toggleCardCheck = (cardId) => {
        setResults((prev) =>
            prev.map((card) =>
                card.id === cardId
                    ? { ...card, cardChecked: !card.cardChecked }
                    : card,
            ),
        );
    };

    // Перемикач для режиму глобальної синхронізації тегів (Унікальність)
    const toggleUniquenessCheck = (cardId) => {
        setResults((prev) =>
            prev.map((card) =>
                card.id === cardId
                    ? { ...card, uniqueness: !(card.uniqueness ?? true) }
                    : card,
            ),
        );
    };

    // Перемикач для конкретного рядка з каскадом та крос-картковою синхронізацією
    const toggleLineCheck = (cardId, lineIndex) => {
        setResults((prev) => {
            // 1. Шукаємо оригінальну картку та рядок, на який клікнули
            const originCard = prev.find((c) => c.id === cardId);
            if (!originCard) return prev;

            const targetLine = originCard.lines.find((l) => l.index === lineIndex);
            if (!targetLine) return prev;

            const nextCheckedState = !targetLine.checked;
            const targetText = targetLine.text;
            const isUniqueSync = originCard.uniqueness !== false; // true за замовчуванням

            // 2. Оновлюємо стан у всіх картках
            return prev.map((card) => {
                // Якщо унікальність вимкнена і це не поточна картка — ігноруємо її
                if (card.id !== cardId && !isUniqueSync) return card;

                const newLines = card.lines.map((line) => ({ ...line }));

                if (card.id === cardId) {
                    // А) Логіка для поточної картки (орієнтуємось суворо на унікальний індекс)
                    const targetIdx = newLines.findIndex((l) => l.index === lineIndex);
                    if (targetIdx !== -1) {
                        newLines[targetIdx].checked = nextCheckedState;
                        const parentDepth = newLines[targetIdx].depth;
                        
                        for (let i = targetIdx + 1; i < newLines.length; i++) {
                            if (newLines[i].depth > parentDepth) {
                                newLines[i].checked = nextCheckedState;
                            } else {
                                break;
                            }
                        }
                    }
                } else {
                    // Б) Логіка крос-карткової синхронізації (шукаємо збіги за текстом тегу)
                    for (let i = 0; i < newLines.length; i++) {
                        if (newLines[i].text === targetText) {
                            newLines[i].checked = nextCheckedState;
                            const parentDepth = newLines[i].depth;

                            // Синхронно перемикаємо всіх нащадків знайденого тегу на іншій картці
                            let j = i + 1;
                            while (j < newLines.length && newLines[j].depth > parentDepth) {
                                newLines[j].checked = nextCheckedState;
                                j++;
                            }
                        }
                    }
                }

                return { ...card, lines: newLines };
            });
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 font-sans selection:bg-cyan-500 selection:text-slate-900">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Шапка та Пошукова панель */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-3xl shadow-2xl space-y-4">
                    {/* Змінено на bg-linear-to-r відповідно до правил v4 */}
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-linear-to-r from-cyan-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                        eBay Structural Skeleton Scraper
                    </h1>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors text-slate-200 placeholder-slate-600 font-medium"
                            placeholder="Введіть товар для аналізу структури (наприклад: MacBook Pro)..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                            disabled={loading}
                        />
                        {/* Змінено на bg-linear-to-r відповідно до правил v4 */}
                        <button
                            onClick={handleScrape}
                            disabled={loading}
                            className="bg-linear-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shrink-0"
                        >
                            {loading ? 'Аналіз структури...' : 'Сканувати'}
                        </button>
                    </div>
                </div>

                {/* Результати */}
                <div className="grid grid-cols-1 gap-6">
                    {results.map((card) => (
                        <div
                            key={card.id}
                            className={`bg-slate-900/60 backdrop-blur border p-5 rounded-2xl shadow-xl flex flex-col gap-4 transition-all duration-300 ${
                                card.cardChecked
                                    ? 'border-slate-800 opacity-100'
                                    : 'border-slate-900/40 opacity-40'
                            }`}
                        >
                            {/* БЛОК 1: КЕРУВАННЯ (Зберігати та Унікальність) */}
                            <div className="flex items-center gap-6 bg-slate-950/60 border border-slate-800/60 p-3 px-4 rounded-xl shrink-0">
                                <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer transition-transform active:scale-95"
                                        checked={card.cardChecked}
                                        onChange={() => toggleCardCheck(card.id)}
                                    />
                                    <span>Зберігати</span>
                                </label>

                                <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer select-none border-l border-slate-800 pl-6">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-indigo-500 rounded cursor-pointer transition-transform active:scale-95"
                                        checked={card.uniqueness ?? true}
                                        onChange={() => toggleUniquenessCheck(card.id)}
                                    />
                                    <span>Унікальність</span>
                                </label>
                            </div>

                            {/* БЛОК 2: ОСНОВНИЙ КОНТЕНТ (Фото + Текст/Дерево) */}
                            <div className="flex flex-col md:flex-row gap-5">
                                {/* Фотографія товару */}
                                {card.img && (
                                    <div className="w-full md:w-44 h-44 shrink-0 bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center p-2 relative group">
                                        <img
                                            src={card.img}
                                            alt="Product Blueprint"
                                            className="object-contain max-w-full max-h-full transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <a
                                            href={card.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-cyan-400 backdrop-blur-[2px]"
                                        >
                                            Відкрити оригінал ↗
                                        </a>
                                    </div>
                                )}

                                {/* Дерево тегів та вмісту */}
                                {/* Змінено max-h-[350px] на канонічний макрос max-h-87.5 */}
                                <div className="flex-1 bg-slate-950/40 rounded-xl p-3 border border-slate-800/40 space-y-1 select-none max-h-87.5 overflow-y-auto custom-scrollbar">
                                    {card.lines.map((line) => (
                                        <div
                                            key={line.index}
                                            className={`flex items-stretch gap-1 rounded hover:bg-slate-900/40 pr-2 transition-colors ${
                                                line.checked
                                                    ? 'opacity-100'
                                                    : 'opacity-30'
                                            }`}
                                        >
                                            {/* Індекс рядка */}
                                            <div className="flex items-center shrink-0 w-8">
                                                <span className="text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-cyan-500/80 w-full text-center border border-slate-800/50">
                                                    {line.index}
                                                </span>
                                            </div>

                                            {/* Вертикальна CSS структура дерева */}
                                            <div className="flex shrink-0 items-stretch ml-1">
                                                {Array.from({ length: line.depth }).map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-4 border-l border-slate-800/70 h-full shrink-0"
                                                    />
                                                ))}
                                                <div className="w-4 h-full relative shrink-0">
                                                    <div className="absolute left-0 top-0 bottom-0 border-l border-slate-800/70" />
                                                    {line.depth > 0 && (
                                                        <div className="absolute left-0 top-1/2 w-2 border-t border-slate-800/70" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Чекбокс елемента структури */}
                                            <div className="flex items-center shrink-0 pl-1 mr-2">
                                                <input
                                                    type="checkbox"
                                                    className="w-3.5 h-3.5 accent-emerald-500 shrink-0 cursor-pointer rounded"
                                                    checked={line.checked}
                                                    disabled={!card.cardChecked}
                                                    onChange={() =>
                                                        toggleLineCheck(card.id, line.index)
                                                    }
                                                />
                                            </div>

                                            {/* Текст (Тег або Контент) */}
                                            <div className="flex-1 py-1.5">
                                                <span
                                                    className={`tracking-wide break-all block leading-relaxed ${
                                                        line.isStructure
                                                            ? 'text-indigo-400 font-mono text-xs opacity-90'
                                                            : 'text-slate-200 font-medium text-sm'
                                                    }`}
                                                >
                                                    {line.text}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}

                    {results.length === 0 && !loading && (
                        <div className="text-center text-slate-500 py-20 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                            ✨ Таблиця порожня. Введіть пошуковий запит, щоб отримати динамічні структури.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;