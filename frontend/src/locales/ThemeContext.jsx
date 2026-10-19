import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Available themes configuration.
 * Each theme has a code (used as data-theme attribute value),
 * a label key for i18n, and an icon.
 */
export const themes = [
    { code: 'dark', labelKey: 'theme.dark', icon: '🌙' },
    { code: 'light', labelKey: 'theme.light', icon: '☀️' },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [currentTheme, setCurrentTheme] = useState(() => {
        const saved = localStorage.getItem('appTheme');
        if (saved && themes.some((t) => t.code === saved)) {
            return saved;
        }
        return 'dark';
    });

    useEffect(() => {
        localStorage.setItem('appTheme', currentTheme);
        document.documentElement.setAttribute('data-theme', currentTheme);
    }, [currentTheme]);

    const setTheme = useCallback((themeCode) => {
        if (themes.some((t) => t.code === themeCode)) {
            setCurrentTheme(themeCode);
        }
    }, []);

    const activeTheme = useMemo(() => {
        return themes.find((t) => t.code === currentTheme) || themes[0];
    }, [currentTheme]);

    const value = useMemo(
        () => ({
            currentTheme,
            setTheme,
            themes,
            activeTheme,
        }),
        [currentTheme, setTheme, activeTheme],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export default ThemeContext;
