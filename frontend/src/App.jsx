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
      // Робимо запит до нашого бекенд-сервера
      const response = await axios.post('http://localhost:5000/api/scrape', { query });
      setResults(response.data.data);
    } catch (error) {
      console.error('Error scraping:', error);
      alert('Failed to start scraper. Check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-8 text-center">eBay Scraper Pro</h1>
        
        <div className="flex gap-4 mb-12">
          <input 
            type="text" 
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2"
            placeholder="Search for items..."
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
            <div key={index} className="p-4 bg-slate-800 border border-slate-700 rounded-xl">
              <h3 className="font-bold">{item.title}</h3>
              <p className="text-cyan-400">{item.price}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;