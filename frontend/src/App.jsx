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
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
            const response = await axios.post(`${backendUrl}/api/scrape`, { query });
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
        setResults(prev => prev.map(card => 
            card.id === cardId ? { ...card, cardChecked: !card.cardChecked } : card
        ));
    };

    // Перемикач для конкретного рядка всередині картки
    const toggleLineCheck = (cardId, lineIndex) => {
        setResults(prev => prev.map(card => {
            if (card.id !== cardId) return card;
            return {
                ...card,
                lines: card.lines.map(line => 
                    line.index === lineIndex ? { ...line, checked: !line.checked } : line
                )
            };
        }));
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
                                card.cardChecked ? 'border-slate-700 opacity-100' : 'border-red-950 opacity-50 bg-slate-900'
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
                                            onChange={() => toggleCardCheck(card.id)}
                                        />
                                        <span className={card.cardChecked ? 'text-cyan-400' : 'text-red-400'}>
                                            {card.cardChecked ? 'Включено' : 'Унікальна'}
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

                            {/* ПРАВА ЧАСТИНА: Стовпчик з безселекторними рядками контенту */}
                            <div className="flex-1 flex flex-col gap-2 justify-center">
                                <div className="text-xs text-slate-500 font-mono mb-1">
                                    ID: <span className="text-slate-400">{card.id}</span>
                                </div>
                                
                                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                    {card.lines.map((line) => (
                                        <div 
                                            key={line.index}
                                            className={`flex items-center gap-3 bg-slate-900/60 px-3 py-1.5 rounded border transition-all ${
                                                line.checked ? 'border-slate-700/50 text-slate-200' : 'border-slate-800 text-slate-600 line-through'
                                            }`}
                                        >
                                            {/* Номер по порядку */}
                                            <span className="text-xs font-mono bg-slate-800 px-1.5 py-0.5 rounded text-cyan-500 w-7 text-center shrink-0">
                                                {line.index}
                                            </span>
                                            
                                            {/* Наш BOOL чекбокс */}
                                            <input 
                                                type="checkbox"
                                                className="w-4 h-4 accent-emerald-500 shrink-0 cursor-pointer"
                                                checked={line.checked}
                                                disabled={!card.cardChecked} // Якщо картка вимкнена, рядки блокуються
                                                onChange={() => toggleLineCheck(card.id, line.index)}
                                            />
                                            
                                            {/* Текст рядка */}
                                            <span className="text-sm tracking-wide break-all font-medium">
                                                {line.text}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}

                    {results.length === 0 && !loading && (
                        <div className="text-center text-slate-500 py-20 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700">
                            ✨ Таблиця пуста. Введіть пошуковий запит, щоб отримати динамічні структури.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;