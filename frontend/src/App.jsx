import React, { useState } from 'react'

function App() {
  const [query, setQuery] = useState('')

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Навігація */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center font-black text-slate-900">E</div>
            <span className="text-xl font-bold tracking-tight">eBay<span className="text-cyan-400">Scraper</span></span>
          </div>
          <div className="flex gap-4">
            <span className="text-sm text-slate-400">v1.0.0</span>
          </div>
        </div>
      </nav>

      {/* Головний контент */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold mb-4">Пошук товарів на eBay</h1>
          <p className="text-slate-400">Введіть запит, щоб запустити автоматичний збір даних через Puppeteer</p>
        </header>

        {/* Панель керування */}
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-3xl shadow-xl">
          <div className="flex flex-col md:flex-row gap-4">
            <input 
              type="text" 
              placeholder="Наприклад: Laptop, RTX 4090, iPhone..." 
              className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95">
              Запустити скрапер
            </button>
          </div>
        </div>

        {/* Секція результатів (заглушка) */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 opacity-50">
          <div className="h-32 border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center text-slate-500">
            Тут будуть результати пошуку...
          </div>
          <div className="h-32 border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center text-slate-500">
            Чекаємо на запуск сервера...
          </div>
        </div>
      </main>
    </div>
  )
}

export default App