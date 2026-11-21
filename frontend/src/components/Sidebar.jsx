import { useState, useEffect } from 'react';
import ScrapingDelays from './ScrapingDelays';
import axios from 'axios';
import { useTranslation } from '../locales/LanguageContext';

export default function Sidebar({
    saveDir,
    setSaveDir,
    openTableInNewTab,
    results,
    handleSaveAllFormats,
    handleSaveData,
    handleClear,
    pagination,
    scrapeAllPages,
    setScrapeAllPages,
    scrapeProductPages = true,
    setScrapeProductPages,
    saveProductHtml = false,
    setSaveProductHtml,
    saveProductMedia = false,
    setSaveProductMedia,
    onNextPage,
    loading,
    maxScrapePages,
    setMaxScrapePages,
    itemsPerPageSelection,
    setItemsPerPageSelection,
    dbSettings,
    setDbSettings,
    activeTable,
    availableTables,
    handleLoadTable,
    setPageDelays,
    handleDeleteActiveTable,
    handleCheckLinks,
    handleScrapeExistingTable,
    scrapeWithoutGB = false,
    setScrapeWithoutGB,
    scrapeWithGBFP = false,
    setScrapeWithGBFP,
}) {
    const { t } = useTranslation();

    // State to manage the expanded status of each menu section
    const [openSections, setOpenSections] = useState({
        automation: true, // Automation is open by default
        browser: true, // Browser controller is open by default
        delays: false, // Delays dropdown initialized
        storage: true, // Database and table selection are open
        exports: false, // Exports are collapsed for compactness
    });

    // Browser Profile Size state & actions
    const [profileSize, setProfileSize] = useState({ bytes: 0, formatted: '...' });
    const [isClearingProfile, setIsClearingProfile] = useState(false);

    const fetchProfileSize = async () => {
        try {
            const backendUrl =
                import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';
            const res = await axios.get(`${backendUrl}/api/browser/profile/size`);
            if (res.data.success) {
                setProfileSize({
                    bytes: res.data.bytes,
                    formatted: res.data.formatted,
                });
            }
        } catch (err) {
            console.error('Failed to fetch browser profile size:', err);
        }
    };

    useEffect(() => {
        fetchProfileSize();
    }, []);

    const handleClearProfile = async () => {
        const confirmClear = window.confirm(t('sidebar.confirmClearProfile'));
        if (!confirmClear) return;

        setIsClearingProfile(true);
        try {
            const backendUrl =
                import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';
            const res = await axios.post(`${backendUrl}/api/browser/profile/clear`);
            if (res.data.success) {
                setProfileSize({
                    bytes: res.data.bytes,
                    formatted: res.data.formatted,
                });
                alert(t('sidebar.profileClearedSuccess'));
            } else {
                throw new Error(res.data.error || 'Failed to clear profile');
            }
        } catch (err) {
            console.error('Failed to clear browser profile:', err);
            alert(t('sidebar.profileClearError', { error: err.message }));
        } finally {
            setIsClearingProfile(false);
            fetchProfileSize();
        }
    };

    /**
     * Toggles the visibility state of an accordion section
     * @param {string} sectionName
     */
    const toggleSection = (sectionName) => {
        setOpenSections((prev) => ({
            ...prev,
            [sectionName]: !prev[sectionName],
        }));
    };

    return (
        <aside className="w-full lg:w-80 flex flex-col gap-4 select-none shrink-0">
            {/* Header / Brand Logo */}
            <div className="flex items-center gap-3 px-1 py-1">
                <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20">
                    E
                </div>
                <div>
                    <h1 className="text-xs font-mono font-bold text-slate-200 tracking-wider">
                        {t('sidebar.brandTitle')}
                    </h1>
                    <p className="text-[10px] font-mono text-indigo-400">
                        {t('sidebar.brandSubtitle')}
                    </p>
                </div>
            </div>

            <hr className="border-slate-800/80" />

            {/* --- ACCORDION SYSTEM CONTAINER --- */}
            <div className="flex flex-col gap-3">
                {/* SECTION 1: AUTOMATION & CONTROLS */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30 transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('automation')}
                        className="w-full bg-slate-900/80 hover:bg-slate-900 px-4 py-3 text-left text-[11px] font-mono font-bold text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            {t('sidebar.automationController')}
                        </span>
                        <span
                            className={`text-slate-500 transition-transform duration-200 ${openSections.automation ? 'rotate-180' : ''}`}
                        >
                            ▼
                        </span>
                    </button>

                    {openSections.automation && (
                        <div className="p-4 bg-slate-950/40 border-t border-slate-900 space-y-4 animate-fadeIn">
                            {/* Target Items Limit */}
                            <div>
                                <label className="block text-[10px] text-slate-500 font-mono mb-1">
                                    {t('sidebar.itemsPerPage')}
                                </label>
                                <select
                                    value={itemsPerPageSelection}
                                    onChange={(e) =>
                                        setItemsPerPageSelection(
                                            Number(e.target.value),
                                        )
                                    }
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                                >
                                    <option value={60}>
                                        {t('sidebar.itemsStandard')}
                                    </option>
                                    <option value={120}>
                                        {t('sidebar.itemsExtended')}
                                    </option>
                                    <option value={240}>
                                        {t('sidebar.itemsMaxBatch')}
                                    </option>
                                </select>
                            </div>

                            {/* Recursive Scrape Toggle */}
                            <div className="bg-slate-950/60 border border-slate-900 p-3 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-mono text-slate-300">
                                        {t('sidebar.scrapeAllPages')}
                                    </p>
                                    <p className="text-[9px] font-mono text-slate-600">
                                        {t('sidebar.scrapeAllSubtitle')}
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={scrapeAllPages}
                                    onChange={(e) =>
                                        setScrapeAllPages(e.target.checked)
                                    }
                                    className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>

                            {/* Scrape Product Pages Toggle */}
                            <div className="bg-slate-950/60 border border-slate-900 p-3 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-mono text-slate-300">
                                        {t('sidebar.scrapeProductPages')}
                                    </p>
                                    <p className="text-[9px] font-mono text-slate-600">
                                        {t('sidebar.scrapeProductPagesSubtitle')}
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={scrapeProductPages}
                                    onChange={(e) =>
                                        setScrapeProductPages && setScrapeProductPages(e.target.checked)
                                    }
                                    className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>

                            {/* Child options for Product Page Scraping */}
                            {scrapeProductPages && (
                                <div className="space-y-2 pl-3 border-l-2 border-indigo-500/30 ml-1 animate-slideDown">
                                    <div className="bg-slate-950/40 border border-slate-900 p-2.5 rounded-xl flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-mono text-slate-300">
                                                {t('sidebar.saveProductHtml')}
                                            </p>
                                            <p className="text-[9px] font-mono text-slate-600">
                                                {t('sidebar.saveProductHtmlSubtitle')}
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={saveProductHtml}
                                            onChange={(e) =>
                                                setSaveProductHtml && setSaveProductHtml(e.target.checked)
                                            }
                                            className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </div>

                                    <div className="bg-slate-950/40 border border-slate-900 p-2.5 rounded-xl flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-mono text-slate-300">
                                                {t('sidebar.saveProductMedia')}
                                            </p>
                                            <p className="text-[9px] font-mono text-slate-600">
                                                {t('sidebar.saveProductMediaSubtitle')}
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={saveProductMedia}
                                            onChange={(e) =>
                                                setSaveProductMedia && setSaveProductMedia(e.target.checked)
                                            }
                                            className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Bounded Target Execution */}
                            {!scrapeAllPages && (
                                <div className="animate-slideDown">
                                    <label className="block text-[10px] text-slate-500 font-mono mb-1">
                                        {t('sidebar.maxBoundedPages')}
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={maxScrapePages}
                                        onChange={(e) =>
                                            setMaxScrapePages(
                                                Math.max(
                                                    1,
                                                    parseInt(e.target.value) ||
                                                        1,
                                                ),
                                            )
                                        }
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            )}

                            {/* Manual Page-Turn Trigger */}
                            <button
                                type="button"
                                onClick={onNextPage}
                                disabled={
                                    loading ||
                                    (pagination &&
                                        pagination.currentPage >=
                                            pagination.totalPages)
                                }
                                className="w-full bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-855 text-slate-300 font-mono text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <span>🔄</span> {t('sidebar.manualNextPage')}
                            </button>

                            {/* Scraping an existing table */}
                            <button
                                type="button"
                                onClick={handleScrapeExistingTable}
                                disabled={!activeTable || loading}
                                className="w-full bg-slate-900 border border-cyan-500/50 hover:bg-cyan-950/40 text-cyan-400 font-mono text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <span>📦</span> {t('sidebar.scrapeExistingTable')}
                            </button>

                            {/* Live Visualizer Link */}
                            <button
                                type="button"
                                onClick={openTableInNewTab}
                                disabled={!results || results.length === 0}
                                className="w-full bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-mono text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <span>🖥️</span> {t('sidebar.openVisualizer')}
                            </button>

                            {/* Link Checking */}
                            <button
                                type="button"
                                onClick={handleCheckLinks}
                                disabled={!activeTable || loading}
                                className="w-full bg-slate-900 border border-amber-500/50 hover:bg-amber-900/40 text-amber-400 font-mono text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <span>🔗</span> {t('sidebar.linkChecking')}
                            </button>
                        </div>
                    )}
                </div>

                {/* SECTION 1.2: BROWSER CONTROLLER */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30 transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('browser')}
                        className="w-full bg-slate-900/80 hover:bg-slate-900 px-4 py-3 text-left text-[11px] font-mono font-bold text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            {t('sidebar.browserController')}
                        </span>
                        <span
                            className={`text-slate-500 transition-transform duration-200 ${openSections.browser ? 'rotate-180' : ''}`}
                        >
                            ▼
                        </span>
                    </button>

                    {openSections.browser && (
                        <div className="p-4 bg-slate-950/40 border-t border-slate-900 space-y-4 animate-fadeIn">
                            {/* Profile Size Display & Refresh */}
                            <div className="bg-slate-950/60 border border-slate-900 p-3 rounded-xl flex items-center justify-between">
                                <div className="min-w-0 pr-2">
                                    <p className="text-[10px] font-mono text-slate-500">
                                        {t('sidebar.browserProfileSize')}
                                    </p>
                                    <p className="text-xs font-mono font-bold text-cyan-400 truncate">
                                        {profileSize.formatted || '0 B'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={fetchProfileSize}
                                    title={t('sidebar.refreshProfileSize')}
                                    className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                                >
                                    🔄
                                </button>
                            </div>

                            {/* Clear Profile Button */}
                            <button
                                type="button"
                                onClick={handleClearProfile}
                                disabled={isClearingProfile || loading}
                                className="w-full bg-slate-900 border border-rose-500/40 hover:bg-rose-950/30 text-rose-300 font-mono text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <span>🗑️</span>{' '}
                                {isClearingProfile
                                    ? t('sidebar.clearingProfile')
                                    : t('sidebar.clearBrowserProfile')}
                            </button>

                            <hr className="border-slate-800/60" />

                            {/* Scraping without GB Toggle */}
                            <div className="bg-slate-950/60 border border-slate-900 p-3 rounded-xl flex items-center justify-between">
                                <div className="pr-2">
                                    <p className="text-xs font-mono text-slate-300">
                                        {t('sidebar.scrapeWithoutGB')}
                                    </p>
                                    <p className="text-[9px] font-mono text-slate-600">
                                        {t('sidebar.scrapeWithoutGBSubtitle')}
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={scrapeWithoutGB}
                                    onChange={(e) => {
                                        const val = e.target.checked;
                                        setScrapeWithoutGB && setScrapeWithoutGB(val);
                                        if (val && setScrapeWithGBFP) setScrapeWithGBFP(false);
                                    }}
                                    className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>

                            {/* Scraping with GBFP Toggle */}
                            <div className="bg-slate-950/60 border border-slate-900 p-3 rounded-xl flex items-center justify-between">
                                <div className="pr-2">
                                    <p className="text-xs font-mono text-slate-300">
                                        {t('sidebar.scrapeWithGBFP')}
                                    </p>
                                    <p className="text-[9px] font-mono text-slate-600">
                                        {t('sidebar.scrapeWithGBFPSubtitle')}
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={scrapeWithGBFP}
                                    onChange={(e) => {
                                        const val = e.target.checked;
                                        setScrapeWithGBFP && setScrapeWithGBFP(val);
                                        if (val && setScrapeWithoutGB) setScrapeWithoutGB(false);
                                    }}
                                    className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500 cursor-pointer"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* SECTION 1.5: PAGINATION DELAYS CONFIGURATION */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30 transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('delays')}
                        className="w-full bg-slate-900/80 hover:bg-slate-900 px-4 py-3 text-left text-[11px] font-mono font-bold text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            {t('sidebar.paginationDelays')}
                        </span>
                        <span
                            className={`text-slate-500 transition-transform duration-200 ${openSections.delays ? 'rotate-180' : ''}`}
                        >
                            ▼
                        </span>
                    </button>

                    {openSections.delays && (
                        <ScrapingDelays
                            onSaveProfile={async (profileData) => {
                                try {
                                    const backendUrl =
                                        import.meta.env.VITE_BACKEND_URL ||
                                        'http://localhost:5050';
                                    await axios.post(
                                        `${backendUrl}/api/settings/delays`,
                                        profileData,
                                    );
                                    setPageDelays(profileData.pageDelays);
                                    alert(
                                        t('delays.profileSaved', {
                                            name: profileData.profileName,
                                        }),
                                    );
                                } catch (err) {
                                    console.error(
                                        'Failed to save delay profile:',
                                        err,
                                    );
                                    alert(t('delays.profileSaveError'));
                                }
                            }}
                            onLoadDefault={() => {
                                setPageDelays([3000]);
                                console.log(
                                    'Delay profile fallback restored to global defaults.',
                                );
                                // Тут ти також можеш додати логіку застосування дефолтних пауз до стейту App.jsx
                            }}
                        />
                    )}
                </div>

                {/* SECTION 2: STORAGE & PERSISTENCE */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30 transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('storage')}
                        className="w-full bg-slate-900/80 hover:bg-slate-900 px-4 py-3 text-left text-[11px] font-mono font-bold text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            {t('sidebar.storageTargets')}
                        </span>
                        <span
                            className={`text-slate-500 transition-transform duration-200 ${openSections.storage ? 'rotate-180' : ''}`}
                        >
                            ▼
                        </span>
                    </button>

                    {openSections.storage && (
                        <div className="p-4 bg-slate-950/40 border-t border-slate-900 space-y-4 animate-fadeIn">
                            {/* Directory Config */}
                            <div>
                                <label className="block text-[10px] text-slate-500 font-mono mb-1">
                                    {t('sidebar.exportDirPath')}
                                </label>
                                <input
                                    type="text"
                                    value={saveDir}
                                    onChange={(e) => setSaveDir(e.target.value)}
                                    placeholder={t('sidebar.exportDirPlaceholder')}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            {/* Database Context Configuration */}
                            <div className="space-y-3 p-3 bg-slate-950/50 border border-slate-900 rounded-xl">
                                <label className="block text-[10px] text-cyan-500 font-mono font-bold">
                                    {t('sidebar.sqliteConfig')}
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group hover:text-white text-[11px] text-slate-400">
                                    <input
                                        type="checkbox"
                                        checked={dbSettings.saveToDefault}
                                        onChange={(e) =>
                                            setDbSettings((p) => ({
                                                ...p,
                                                saveToDefault: e.target.checked,
                                            }))
                                        }
                                        className="w-3.5 h-3.5 accent-cyan-500 rounded"
                                    />
                                    <span>{t('sidebar.logPrimaryTable')}</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group hover:text-white text-[11px] text-slate-400">
                                    <input
                                        type="checkbox"
                                        checked={dbSettings.loadLatestOnStart}
                                        onChange={(e) =>
                                            setDbSettings((p) => ({
                                                ...p,
                                                loadLatestOnStart:
                                                    e.target.checked,
                                            }))
                                        }
                                        className="w-3.5 h-3.5 accent-cyan-500 rounded"
                                    />
                                    <span>{t('sidebar.mountLatestBoot')}</span>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer group hover:text-white text-[11px] text-slate-400">
                                    <input
                                        type="checkbox"
                                        checked={dbSettings.saveToCustom}
                                        onChange={(e) =>
                                            setDbSettings((p) => ({
                                                ...p,
                                                saveToCustom: e.target.checked,
                                            }))
                                        }
                                        className="w-3.5 h-3.5 accent-indigo-500 rounded"
                                    />
                                    <span>{t('sidebar.overrideStoragePath')}</span>
                                </label>

                                {dbSettings.saveToCustom && (
                                    <input
                                        type="text"
                                        value={dbSettings.customPath}
                                        onChange={(e) =>
                                            setDbSettings((p) => ({
                                                ...p,
                                                customPath: e.target.value,
                                            }))
                                        }
                                        placeholder={t('sidebar.customPathPlaceholder')}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 font-mono text-[10px] text-slate-300 focus:border-indigo-500 outline-none"
                                    />
                                )}
                            </div>

                            {/* Tables Dataset Selector */}
                            <div>
                                <label className="block text-[10px] text-slate-500 font-mono mb-1">
                                    {t('sidebar.activeTable')}
                                </label>
                                <select
                                    value={activeTable || ''}
                                    onChange={(e) =>
                                        handleLoadTable(e.target.value)
                                    }
                                    disabled={loading}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-200 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
                                >
                                    <option value="" disabled>
                                        {t('sidebar.selectTable')}
                                    </option>
                                    {availableTables.map((table) => (
                                        <option
                                            key={table.name}
                                            value={table.name}
                                        >
                                            {table.name} ({t('sidebar.rowsCount', { count: table.count })})
                                        </option>
                                    ))}
                                </select>
                                {activeTable && (
                                    <button
                                        onClick={handleDeleteActiveTable}
                                        disabled={loading}
                                        className="w-full text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-30 border border-red-500/20 font-mono text-[10px] font-bold uppercase tracking-wide"
                                    >
                                        {t('sidebar.deleteTableBtn')}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* SECTION 3: SYSTEM ACTIONS & EXPORTS */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30 transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('exports')}
                        className="w-full bg-slate-900/80 hover:bg-slate-900 px-4 py-3 text-left text-[11px] font-mono font-bold text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                    >
                        <span className="flex items-center gap-2">
                            {t('sidebar.systemActions')}
                        </span>
                        <span
                            className={`text-slate-500 transition-transform duration-200 ${openSections.exports ? 'rotate-180' : ''}`}
                        >
                            ▼
                        </span>
                    </button>

                    {openSections.exports && (
                        <div className="p-4 bg-slate-950/40 border-t border-slate-900 space-y-4 animate-fadeIn">
                            {/* Batch Formats Block */}
                            <div className="space-y-2">
                                <label className="block text-[10px] text-slate-500 font-mono mb-1">
                                    {t('sidebar.serializeExport')}
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['csv', 'json', 'xml', 'pdf', 'sqlite'].map(
                                        (fmt) => (
                                            <button
                                                key={fmt}
                                                type="button"
                                                onClick={() =>
                                                    handleSaveData(fmt)
                                                }
                                                disabled={
                                                    !results ||
                                                    results.length === 0
                                                }
                                                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-mono text-[11px] py-2 rounded-lg transition-all capitalize disabled:opacity-40"
                                            >
                                                {t('sidebar.fileExport', { fmt })}
                                            </button>
                                        ),
                                    )}
                                </div>
                            </div>

                            {/* Full Core Bundle Wizard */}
                            <button
                                type="button"
                                onClick={handleSaveAllFormats}
                                disabled={!results || results.length === 0}
                                className="w-full bg-cyan-950/60 border border-cyan-800/40 hover:bg-cyan-900/50 text-cyan-400 font-mono text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                            >
                                <span>📦</span> {t('sidebar.buildMasterArchive')}
                            </button>

                            {/* Destructive Clear Buffer */}
                            <button
                                type="button"
                                onClick={handleClear}
                                disabled={!results || results.length === 0}
                                className="w-full bg-rose-950/30 border border-rose-900/30 hover:bg-rose-900/40 text-rose-400 font-mono text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                            >
                                <span>🗑️</span> {t('sidebar.purgeViewState')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination Active Snapshot (Footer Sidebar Status) */}
            {pagination && (
                <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl font-mono text-[10px] text-slate-500 space-y-1">
                    <div className="flex justify-between">
                        <span>{t('sidebar.pipelineStatus')}</span>
                        <span
                            className={
                                loading
                                    ? 'text-amber-500 animate-pulse'
                                    : 'text-emerald-500'
                            }
                        >
                            {loading ? t('sidebar.processing') : t('sidebar.idle')}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>{t('sidebar.paginationNode')}</span>
                        <span className="text-slate-300">
                            {t('sidebar.pageOf', {
                                current: pagination.currentPage,
                                total: pagination.totalPages || '?',
                            })}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>{t('sidebar.bufferSize')}</span>
                        <span className="text-slate-300">
                            {t('sidebar.entities', { count: results?.length || 0 })}
                        </span>
                    </div>
                </div>
            )}
        </aside>
    );
}
