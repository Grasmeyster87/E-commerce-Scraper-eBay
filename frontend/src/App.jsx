import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
    // Відновлюємо запит та результати з localStorage при завантаженні
    const [query, setQuery] = useState(() => localStorage.getItem('savedQuery') || '');
    const [results, setResults] = useState(() => {
        const saved = localStorage.getItem('savedResults');
        return saved ? JSON.parse(saved) : [];
    });
    const [loading, setLoading] = useState(false);

    // Автоматично зберігаємо дані в localStorage при будь-якій їх зміні
    useEffect(() => {
        localStorage.setItem('savedResults', JSON.stringify(results));
    }, [results]);

    useEffect(() => {
        localStorage.setItem('savedQuery', query);
    }, [query]);

    const handleScrape = async () => {
        if (!query) return alert('Будь ласка, введіть запит для пошуку');
        setLoading(true);
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
            const response = await axios.post(`${backendUrl}/api/scrape`, { query });
            
            // ОБРОБКА ДАНИХ: Рахуємо максимальну глибину та будуємо семантичні адреси
            const processedData = response.data.data.map(card => {
                const maxDepth = card.lines.reduce((max, line) => Math.max(max, parseInt(line.depth || 0, 10)), 0);
                
                // ДИНАМІЧНЕ ОБЧИСЛЕННЯ СЕМАНТИЧНОГО ШЛЯХУ (DOM PATH ADDRESS)
                let currentPathTracker = [];
                const linesWithPaths = card.lines.map(line => {
                    const depth = parseInt(line.depth || 0, 10);
                    const isHtmlTag = line.isStructure === true || (typeof line.text === 'string' && line.text.trim().startsWith('<'));
                    
                    if (isHtmlTag) {
                        currentPathTracker[depth] = line.text.trim();
                        currentPathTracker = currentPathTracker.slice(0, depth + 1);
                        return { ...line, isHtmlTag, semanticPath: null };
                    } else {
                        const semanticPath = currentPathTracker.slice(0, depth).filter(Boolean).join(' > ');
                        return { ...line, isHtmlTag, semanticPath };
                    }
                });

                return {
                    ...card,
                    lines: linesWithPaths,
                    maxDepth: maxDepth,
                    currentDepth: maxDepth, 
                    uniqueness: true, // Унікальність включена за замовчуванням
                    showCleanText: false, // Режим прев'ю картки
                    saveCardLink: true,   
                    saveImgLink: true     
                };
            });
            
            setResults(processedData);
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
                card.id === cardId ? { ...card, cardChecked: !card.cardChecked } : card,
            ),
        );
    };

    // Перемикач для режиму Унікальності
    const toggleUniquenessCheck = (cardId) => {
        setResults((prev) =>
            prev.map((card) =>
                card.id === cardId ? { ...card, uniqueness: !card.uniqueness } : card,
            ),
        );
    };

    // ОНОВЛЕНО: Перемикач режиму чистий текст / структура з урахуванням Унікальності
    const toggleCleanText = (cardId) => {
        setResults((prev) => {
            const originCard = prev.find((c) => c.id === cardId);
            if (!originCard) return prev;

            const nextState = !originCard.showCleanText;
            const isUniqueSync = originCard.uniqueness !== false;

            return prev.map((card) => {
                // Якщо унікальність увімкнена — перемикаємо ВСІ картки, якщо вимкнена — тільки одну
                if (isUniqueSync || card.id === cardId) {
                    return { ...card, showCleanText: nextState };
                }
                return card;
            });
        });
    };

    // Перемикач індивідуальних чекбоксів для збереження лінків
    const toggleLinkSave = (cardId, field) => {
        setResults((prev) =>
            prev.map((card) =>
                card.id === cardId ? { ...card, [field]: !card[field] } : card,
            ),
        );
    };

    // Обробник зміни лічильника глибини
    const handleDepthChange = (cardId, newValue) => {
        setResults((prev) => {
            const originCard = prev.find((c) => c.id === cardId);
            if (!originCard) return prev;

            let parsedValue = parseInt(newValue, 10);
            if (isNaN(parsedValue)) parsedValue = originCard.maxDepth;
            if (parsedValue < 0) parsedValue = 0;
            if (parsedValue > originCard.maxDepth) parsedValue = originCard.maxDepth;

            const isUniqueSync = originCard.uniqueness !== false;

            return prev.map((card) => {
                if (isUniqueSync || card.id === cardId) {
                    const safeValue = Math.min(parsedValue, card.maxDepth);
                    return { ...card, currentDepth: safeValue };
                }
                return card;
            });
        });
    };

    // Перемикач для конкретного рядка (каскад + крос-картка)
    const toggleLineCheck = (cardId, lineIndex) => {
        setResults((prev) => {
            const originCard = prev.find((c) => c.id === cardId);
            if (!originCard) return prev;

            const targetLine = originCard.lines.find((l) => l.index === lineIndex);
            if (!targetLine) return prev;

            const nextCheckedState = !targetLine.checked;
            const targetText = targetLine.text;
            const isUniqueSync = originCard.uniqueness !== false;

            return prev.map((card) => {
                if (card.id !== cardId && !isUniqueSync) return card;

                const newLines = card.lines.map((line) => ({ ...line }));

                if (card.id === cardId) {
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
                    for (let i = 0; i < newLines.length; i++) {
                        if (newLines[i].text === targetText) {
                            newLines[i].checked = nextCheckedState;
                            const parentDepth = newLines[i].depth;

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

    // Очищення результатів вручну
    const handleClear = () => {
        if(window.confirm('Ви дійсно хочете очистити всі дані?')) {
            setResults([]);
            setQuery('');
            localStorage.removeItem('savedResults');
            localStorage.removeItem('savedQuery');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 font-sans selection:bg-cyan-500 selection:text-slate-900">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Шапка та Пошукова панель */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-3xl shadow-2xl space-y-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-linear-to-r from-cyan-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                            eBay Structural Skeleton
                        </h1>
                        {results.length > 0 && (
                            <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors">
                                Очистити дані
                            </button>
                        )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors text-slate-200 placeholder-slate-600 font-medium"
                            placeholder="Введіть товар для аналізу (наприклад: MacBook Pro)..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                            disabled={loading}
                        />
                        <button
                            onClick={handleScrape}
                            disabled={loading}
                            className="bg-linear-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shrink-0"
                        >
                            {loading ? 'Сканування...' : 'Сканувати'}
                        </button>
                    </div>
                </div>

                {/* Результати */}
                <div className="grid grid-cols-1 gap-6">
                    {results.map((card) => (
                        <div
                            key={card.id}
                            className={`bg-slate-900/60 backdrop-blur border p-5 rounded-2xl shadow-xl flex flex-col gap-4 transition-all duration-300 ${
                                card.cardChecked ? 'border-slate-800 opacity-100' : 'border-slate-900/40 opacity-40'
                            }`}
                        >
                            {/* БЛОК 1: КЕРУВАННЯ */}
                            <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-slate-950/60 border border-slate-800/60 p-3 px-4 rounded-xl shrink-0">
                                <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer transition-transform active:scale-95"
                                        checked={card.cardChecked}
                                        onChange={() => toggleCardCheck(card.id)}
                                    />
                                    <span>Зберігати</span>
                                </label>

                                <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer select-none border-l border-slate-800 pl-4 sm:pl-6">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-indigo-500 rounded cursor-pointer transition-transform active:scale-95"
                                        checked={card.uniqueness !== false}
                                        onChange={() => toggleUniquenessCheck(card.id)}
                                    />
                                    <span>Унікальність</span>
                                </label>

                                <div className="flex items-center gap-2 border-l border-slate-800 pl-4 sm:pl-6 mr-auto">
                                    <label htmlFor={`counter-${card.id}`} className="text-xs sm:text-sm font-semibold text-slate-200 select-none">
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
                                            onChange={(e) => handleDepthChange(card.id, e.target.value)}
                                            className="w-14 sm:w-16 bg-transparent text-center text-sm font-mono text-cyan-400 py-1 px-1 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <div className="flex flex-col border-l border-slate-700">
                                            <button 
                                                type="button"
                                                onClick={() => handleDepthChange(card.id, card.currentDepth + 1)}
                                                className="px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] leading-none py-0.5 border-b border-slate-700"
                                            >
                                                ▲
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => handleDepthChange(card.id, card.currentDepth - 1)}
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

                                {/* КНОПКА: ПОКАЗАТИ КАРТКУ (Тепер слухається прапорця "Унікальність") */}
                                <button
                                    type="button"
                                    onClick={() => toggleCleanText(card.id)}
                                    className={`text-xs font-bold px-4 py-2 rounded-xl border transition-all duration-200 select-none ${
                                        card.showCleanText
                                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20'
                                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-slate-100'
                                    }`}
                                >
                                    {card.showCleanText ? '✨ Показати структуру' : '📄 Показати Картку'}
                                </button>
                            </div>

                            {/* БЛОК 2: ОСНОВНИЙ КОНТЕНТ */}
                            <div className="flex flex-col md:flex-row gap-5">
                                {/* Фото + Чекбокси збереження лінків */}
                                <div className="flex flex-col w-full md:w-44 shrink-0 gap-3">
                                    {card.img && (
                                        <div className="w-full h-44 bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800/80 flex items-center justify-center p-2 relative group">
                                            <img src={card.img} alt="Product" className="object-contain max-w-full max-h-full transition-transform duration-300 group-hover:scale-105" />
                                        </div>
                                    )}
                                    
                                    {/* Блок збереження посилань */}
                                    <div className="bg-slate-950/50 border border-slate-800/60 p-3 rounded-xl space-y-2 text-xs text-slate-400">
                                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200 transition-colors select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={card.saveCardLink !== false}
                                                onChange={() => toggleLinkSave(card.id, 'saveCardLink')}
                                                className="w-3.5 h-3.5 accent-cyan-500 rounded border-slate-700"
                                            />
                                            <span className="truncate">link card: <a href={card.url || '#'} target="_blank" rel="noreferrer" className="text-cyan-400 underline hover:text-cyan-300 ml-1">Open</a></span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer hover:text-slate-200 transition-colors select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={card.saveImgLink !== false}
                                                onChange={() => toggleLinkSave(card.id, 'saveImgLink')}
                                                className="w-3.5 h-3.5 accent-cyan-500 rounded border-slate-700"
                                            />
                                            <span className="truncate">link img: <a href={card.img || '#'} target="_blank" rel="noreferrer" className="text-cyan-400 underline hover:text-cyan-300 ml-1">Open</a></span>
                                        </label>
                                    </div>
                                </div>

                                {/* Дерево або Чистий контент */}
                                <div className="flex-1 bg-slate-950/40 rounded-xl p-3 border border-slate-800/40 space-y-1 select-none max-h-100 overflow-y-auto custom-scrollbar">
                                    {card.lines
                                        .filter((line) => {
                                            const isHtmlTag = line.isHtmlTag;
                                            if (card.showCleanText) {
                                                return !isHtmlTag && parseInt(line.depth, 10) <= card.currentDepth;
                                            }
                                            return !isHtmlTag || parseInt(line.depth, 10) <= card.currentDepth;
                                        })
                                        .map((line) => (
                                        <div 
                                            key={line.index} 
                                            className={`flex items-stretch gap-1 rounded pr-2 transition-colors ${
                                                card.showCleanText ? 'hover:bg-transparent py-0.5' : 'hover:bg-slate-900/40'
                                            } ${line.checked ? 'opacity-100' : 'opacity-30'}`}
                                        >
                                            {!card.showCleanText ? (
                                                <>
                                                    <div className="flex items-center shrink-0 w-8">
                                                        <span className="text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-cyan-500/80 w-full text-center border border-slate-800/50">
                                                            {line.index}
                                                        </span>
                                                    </div>

                                                    <div className="flex shrink-0 items-stretch ml-1">
                                                        {Array.from({ length: line.depth }).map((_, i) => (
                                                            <div key={i} className="w-4 border-l border-slate-800/70 h-full shrink-0" />
                                                        ))}
                                                        <div className="w-4 h-full relative shrink-0">
                                                            <div className="absolute left-0 top-0 bottom-0 border-l border-slate-800/70" />
                                                            {line.depth > 0 && (
                                                                <div className="absolute left-0 top-1/2 w-2 border-t border-slate-800/70" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center shrink-0 pl-1 mr-2">
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-3.5 h-3.5 accent-emerald-500 shrink-0 cursor-pointer rounded" 
                                                            checked={line.checked} 
                                                            disabled={!card.cardChecked} 
                                                            onChange={() => toggleLineCheck(card.id, line.index)} 
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex items-center mr-2 text-cyan-500 font-bold text-sm select-none pl-2">
                                                    •
                                                </div>
                                            )}

                                            <div className="flex-1 py-1.5 overflow-hidden">
                                                <span className={`tracking-wide break-all block leading-relaxed ${
                                                    line.isHtmlTag
                                                        ? 'text-indigo-400 font-mono text-xs opacity-90'
                                                        : 'text-slate-200 font-bold text-sm'
                                                }`}>
                                                    {line.text}
                                                </span>
                                                
                                                {!card.showCleanText && line.semanticPath && (
                                                    <span className="block text-[10px] text-slate-500 font-mono truncate mt-0.5" title={line.semanticPath}>
                                                        📍 {line.semanticPath}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default App;