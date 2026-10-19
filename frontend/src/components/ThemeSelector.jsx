import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../locales/ThemeContext';
import { useTranslation } from '../locales/LanguageContext';

export default function ThemeSelector() {
    const { currentTheme, setTheme, themes } = useTheme();
    const { t, isRTL } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const activeTheme = themes.find((th) => th.code === currentTheme) || themes[0];

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
                className="group flex items-center gap-2 bg-slate-950/80 hover:bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-200 transition-all duration-200 shadow-lg shadow-black/20 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 cursor-pointer theme-selector-btn"
                aria-expanded={isOpen}
                aria-haspopup="true"
                title={t('theme.selectTheme') || 'Select Theme'}
            >
                <span className="text-sm select-none" role="img" aria-label={t(activeTheme.labelKey)}>
                    {activeTheme.icon}
                </span>
                <span className="font-semibold tracking-wide text-slate-100 theme-selector-text">
                    {t(activeTheme.labelKey)}
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
                    className={`absolute z-50 mt-2 w-48 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 shadow-2xl shadow-black/60 p-1.5 animate-fadeIn theme-selector-dropdown ${
                        isRTL ? 'left-0' : 'right-0'
                    }`}
                    role="menu"
                    aria-orientation="vertical"
                >
                    <div className="px-3 py-1.5 mb-1 border-b border-slate-800/80 flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                            🎨 {t('theme.selectTheme') || 'Theme'}
                        </span>
                    </div>

                    <div className="space-y-0.5">
                        {themes.map((theme) => {
                            const isSelected = theme.code === currentTheme;
                            return (
                                <button
                                    key={theme.code}
                                    type="button"
                                    onClick={() => {
                                        setTheme(theme.code);
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
                                        <span className="text-base select-none shrink-0" role="img" aria-label={t(theme.labelKey)}>
                                            {theme.icon}
                                        </span>
                                        <span className="truncate leading-tight font-medium">
                                            {t(theme.labelKey)}
                                        </span>
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
