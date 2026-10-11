import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import en from './en.json';
import uk from './uk.json';
import de from './de.json';
import fr from './fr.json';
import es from './es.json';
import it from './it.json';
import ru from './ru.json';
import he from './he.json';
import ar from './ar.json';

const translations = {
    en,
    uk,
    de,
    fr,
    es,
    it,
    ru,
    he,
    ar,
};

export const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
    { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', dir: 'ltr' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr' },
    { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', dir: 'rtl' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية (الفصحى)', flag: '🇸🇦', dir: 'rtl' },
];

const LanguageContext = createContext(null);

const getNestedValue = (obj, path) => {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((prev, curr) => (prev && prev[curr] !== undefined ? prev[curr] : undefined), obj);
};

const interpolate = (str, params) => {
    if (!str || typeof str !== 'string' || !params) return str;
    return Object.keys(params).reduce((res, key) => {
        return res.replace(new RegExp(`\\{${key}\\}`, 'g'), params[key]);
    }, str);
};

export function LanguageProvider({ children }) {
    const [currentLanguage, setCurrentLanguage] = useState(() => {
        const saved = localStorage.getItem('appLanguage');
        if (saved && translations[saved]) {
            return saved;
        }
        return 'en';
    });

    const activeLanguageConfig = useMemo(() => {
        return languages.find((l) => l.code === currentLanguage) || languages[0];
    }, [currentLanguage]);

    useEffect(() => {
        localStorage.setItem('appLanguage', currentLanguage);
        document.documentElement.lang = activeLanguageConfig.code;
        document.documentElement.dir = activeLanguageConfig.dir;
    }, [currentLanguage, activeLanguageConfig]);

    const setLanguage = useCallback((langCode) => {
        if (translations[langCode]) {
            setCurrentLanguage(langCode);
        }
    }, []);

    const t = useCallback(
        (key, params) => {
            const currentDict = translations[currentLanguage] || translations.en;
            let val = getNestedValue(currentDict, key);

            // Fallback to English dictionary if translation key is missing in active locale
            if (val === undefined && currentLanguage !== 'en') {
                val = getNestedValue(translations.en, key);
            }

            if (val === undefined) {
                return key;
            }

            if (params && typeof params === 'object') {
                return interpolate(val, params);
            }

            return val;
        },
        [currentLanguage],
    );

    const value = useMemo(
        () => ({
            currentLanguage,
            setLanguage,
            t,
            isRTL: activeLanguageConfig.dir === 'rtl',
            languages,
            activeLanguage: activeLanguageConfig,
        }),
        [currentLanguage, setLanguage, t, activeLanguageConfig],
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
}

export default LanguageContext;
