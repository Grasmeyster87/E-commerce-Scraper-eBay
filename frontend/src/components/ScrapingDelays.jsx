import { useState } from 'react';

export default function ScrapingDelays({ onSaveProfile, onLoadDefault }) {
    // State для керування назвою профілю та масивом чергування затримок
    const [profileName, setProfileName] = useState('Ebay Standard Config');
    const [pageDelays, setPageDelays] = useState([2000]); 
    const [customDelayInput, setCustomDelayInput] = useState('');

    // Додавання нової затримки в чергу
    const handleAddDelay = () => {
        const val = parseInt(customDelayInput, 10);
        if (!isNaN(val) && val > 0) {
            setPageDelays([...pageDelays, val]);
            setCustomDelayInput('');
        }
    };

    // Видалення затримки з черги
    const handleRemoveDelay = (indexToRemove) => {
        if (pageDelays.length > 1) {
            setPageDelays(pageDelays.filter((_, idx) => idx !== indexToRemove));
        }
    };

    // Передача структурованих даних наверх у Sidebar/App
    const handleSaveDelayProfile = () => {
        if (onSaveProfile) {
            onSaveProfile({ 
                profileName: profileName.trim() || 'Untitled Profile', 
                pageDelays 
            });
        }
    };

    // Скидання до дефолтних налаштувань
    const handleResetToDefault = () => {
        setProfileName('Ebay Standard Config');
        setPageDelays([2000]);
        if (onLoadDefault) {
            onLoadDefault();
        }
    };

    return (
        <div className="p-4 border-t border-slate-900 flex flex-col gap-4 bg-slate-950/20">
            
            {/* НОВЕ ПОЛЕ: Назва конфігурації / профілю */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Profile Identifier Name
                </label>
                <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="e.g. Aggressive Scraping"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                />
            </div>

            {/* Введення значень затримок (ms) */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Add Custom Delay (ms)
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="number"
                            value={customDelayInput}
                            onChange={(e) => setCustomDelayInput(e.target.value)}
                            placeholder="e.g. 3000"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-10 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-600 select-none">
                            ms
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleAddDelay}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-sm px-3 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                        title="Append delay to rotating queue"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Візуалізація черги затримок */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Active Queue (Alternating)
                </label>
                <div className="bg-slate-950/60 border border-slate-900 p-2.5 rounded-xl flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {pageDelays.length === 0 ? (
                        <span className="text-[10px] font-mono text-slate-500 italic">Queue is empty</span>
                    ) : (
                        pageDelays.map((ms, idx) => (
                            <div 
                                key={idx} 
                                className="bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono text-[10px] flex items-center gap-1.5 group"
                            >
                                <span>{ms}ms</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveDelay(idx)}
                                    className="text-slate-500 hover:text-red-400 font-sans font-bold transition-colors cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>
                        ))
                    )}
                </div>
                <p className="text-[9px] font-mono text-slate-600 leading-tight">
                    * Multiple values will rotate sequentially during page navigation.
                </p>
            </div>

            {/* Елементи керування */}
            <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="border border-slate-800 hover:border-slate-700 hover:bg-slate-900/40 text-slate-400 hover:text-slate-300 font-mono text-[10px] font-bold py-2 rounded-lg transition-colors cursor-pointer text-center"
                >
                    Default
                </button>
                <button
                    type="button"
                    onClick={handleSaveDelayProfile}
                    className="bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-400 font-mono text-[10px] font-bold py-2 rounded-lg transition-colors cursor-pointer text-center"
                >
                    Save Profile
                </button>
            </div>

        </div>
    );
}