import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../locales/LanguageContext';

export default function LanguageSelector() {
    const { currentLanguage, setLanguage, languages, t, isRTL } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const activeLang = languages.find((l) => l.code === currentLanguage) || languages[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            {/* Dropdown Toggle Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="group flex items-center gap-2 bg-slate-950/80 hover:bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-200 transition-all duration-200 shadow-lg shadow-black/20 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer"
                aria-expanded={isOpen}
                aria-haspopup="true"
                title={t('languages.selectLanguage') || 'Select Language'}
            >
                <span className="text-sm select-none" role="img" aria-label={activeLang.name}>
                    {activeLang.flag}
                </span>
                <span className="font-semibold tracking-wide text-slate-100">
                    {activeLang.nativeName}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                    ({activeLang.code})
                </span>
                <span
                    className={`text-slate-500 group-hover:text-cyan-400 text-[10px] transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                >
                    ▼
                </span>
            </button>

            {/* Dropdown Menu Panel */}
            {isOpen && (
                <div
                    className={`absolute z-50 mt-2 w-56 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 shadow-2xl shadow-black/60 p-1.5 animate-fadeIn ${
                        isRTL ? 'left-0' : 'right-0'
                    }`}
                    role="menu"
                    aria-orientation="vertical"
                >
                    <div className="px-3 py-1.5 mb-1 border-b border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                            🌐 {t('languages.selectLanguage') || 'Language / Мова'}
                        </span>
                        <span className="text-[10px] text-indigo-400 font-mono">
                            {languages.length} {t('app.units') || 'langs'}
                        </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-0.5">
                        {languages.map((lang) => {
                            const isSelected = lang.code === currentLanguage;
                            return (
                                <button
                                    key={lang.code}
                                    type="button"
                                    onClick={() => {
                                        setLanguage(lang.code);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer text-left ${
                                        isSelected
                                            ? 'bg-linear-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100 border border-transparent'
                                    }`}
                                    role="menuitem"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="text-base select-none shrink-0" role="img" aria-label={lang.name}>
                                            {lang.flag}
                                        </span>
                                        <div className="flex flex-col min-w-0 text-left">
                                            <span className="truncate leading-tight text-slate-100 font-medium">
                                                {lang.nativeName}
                                            </span>
                                            <span className="text-[10px] text-slate-500 truncate leading-tight font-sans">
                                                {lang.name}
                                            </span>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <span className="text-cyan-400 font-bold text-xs shrink-0 ml-2">
                                            ✓
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
