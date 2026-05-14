import React, { useState } from 'react';
import axios from 'axios';

function App() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);

    const handleScrape = async () => {
        if (!query) return alert('Please enter a search query');

        setLoading(true);
        try {
            const response = await axios.post(
                'http://localhost:5001/api/scrape',
                { query },
            );
            setResults(response.data.data);
        } catch (error) {
            const serverError = error.response?.data?.error || error.message;
            console.error('Error details:', serverError);
            alert(`Помилка: ${serverError}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-cyan-400 mb-8 text-center">
                    eBay Scraper Pro
                </h1>

                {/* Секція пошуку */}
                <div className="flex gap-4 mb-12">
                    <input
                        type="text"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:border-cyan-500"
                        placeholder="Search for items (e.g. MacBook Pro)..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button
                        onClick={handleScrape}
                        disabled={loading}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold px-6 py-2 rounded-xl transition-all disabled:opacity-50"
                    >
                        {loading ? 'Scraping...' : 'Start Scrape'}
                    </button>
                </div>

                {/* Секція результатів */}
                <div className="space-y-4">
                    {results.map((item, index) => (
                        <div
                            key={index}
                            className="flex gap-6 p-4 bg-slate-800 border border-slate-700 rounded-xl hover:border-cyan-500 transition-colors"
                        >
                            {/* Фотографія товару */}
                            {item.img && (
                                <div className="shrink-0 w-32 h-32 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                                    <img
                                        src={item.img}
                                        alt="Product"
                                        className="object-cover max-w-full max-h-full"
                                    />
                                </div>
                            )}

                            {/* Інформація про товар */}
                            <div className="flex flex-col justify-between flex-1">
                                <div>
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-lg font-bold text-slate-100 hover:text-cyan-400 transition-colors line-clamp-2"
                                    >
                                        {item.title}
                                    </a>
                                    <p className="text-2xl font-bold text-cyan-400 mt-2">
                                        {item.price}
                                    </p>
                                </div>

                                {/* Додаткові дані (Мітки) */}
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <span className="px-2 py-1 text-xs font-semibold bg-slate-700 text-slate-300 rounded-md">
                                        🛒 {item.status}
                                    </span>
                                    <span className="px-2 py-1 text-xs font-semibold bg-slate-700 text-slate-300 rounded-md">
                                        📦 {item.shipping}
                                    </span>
                                    <span className="px-2 py-1 text-xs font-semibold bg-slate-700 text-slate-300 rounded-md">
                                        🌍 {item.location}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {results.length === 0 && !loading && (
                        <p className="text-center text-slate-500 mt-10">
                            No results yet. Enter a query and start scraping.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;
