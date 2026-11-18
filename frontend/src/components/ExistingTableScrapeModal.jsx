import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from '../locales/LanguageContext';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';

export default function ExistingTableScrapeModal({
    isOpen,
    onClose,
    tableName,
    dbSettings,
    options = {},
}) {
    const { t } = useTranslation();
    const [status, setStatus] = useState('idle'); // idle, starting, running, paused, finished, cancelled, error
    const [stats, setStats] = useState({
        totalCards: 0,
        completedCount: 0,
        pendingCount: 0,
        isFullyFinished: false,
        folderPath: '',
        folderExists: false,
    });
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [logs, setLogs] = useState([]);
    const [currentJobId, setCurrentJobId] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const logsEndRef = useRef(null);

    // Auto-scroll to bottom of logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    // Initial check of table status and folder upon opening modal
    useEffect(() => {
        if (!isOpen || !tableName) return;

        setStatus('idle');
        setLogs([]);
        setCurrentJobId(null);
        setIsPaused(false);

        axios
            .post(`${backendUrl}/api/scrape-existing/status`, {
                tableName,
                dbSettings,
            })
            .then((res) => {
                if (res.data.success) {
                    const data = res.data;
                    setStats({
                        totalCards: data.totalCards || 0,
                        completedCount: data.completedCount || 0,
                        pendingCount: data.pendingCount || 0,
                        isFullyFinished: !!data.isFullyFinished,
                        folderPath: data.folderPath || '',
                        folderExists: !!data.folderExists,
                    });
                    setProgress({
                        current: data.completedCount || 0,
                        total: data.totalCards || 0,
                    });

                    const initialLogs = [
                        {
                            type: 'info',
                            text: t('existingTableScrape.logCheckingFolder', {
                                folder: data.folderPath,
                            }),
                        },
                        {
                            type: data.folderExists ? 'success' : 'info',
                            text: data.folderExists
                                ? t('existingTableScrape.logFolderExists', {
                                      folder: data.folderPath,
                                  })
                                : t('existingTableScrape.logFolderCreated', {
                                      folder: data.folderPath,
                                  }),
                        },
                        {
                            type: 'info',
                            text: t('existingTableScrape.logExistingFound', {
                                count: data.completedCount,
                                total: data.totalCards,
                            }),
                        },
                    ];

                    if (data.isFullyFinished) {
                        initialLogs.push({
                            type: 'success',
                            text: t('existingTableScrape.statusAllCompleted'),
                        });
                        setStatus('finished');
                    } else {
                        initialLogs.push({
                            type: 'warning',
                            text: t('existingTableScrape.logRemaining', {
                                count: data.pendingCount,
                            }),
                        });
                    }

                    if (Array.isArray(data.recentLogs) && data.recentLogs.length > 0) {
                        data.recentLogs.forEach((line) => {
                            initialLogs.push({ type: 'secondary', text: line });
                        });
                    }

                    setLogs(initialLogs);
                }
            })
            .catch((err) => {
                console.error('Failed to fetch existing table status:', err);
                setLogs([
                    {
                        type: 'error',
                        text: t('existingTableScrape.serverError', {
                            message: err.message,
                        }),
                    },
                ]);
            });
    }, [isOpen, tableName, dbSettings, t]);

    // Handle starting the scraping job
    const handleStartJob = async () => {
        if (!tableName) return;

        setStatus('starting');
        setIsPaused(false);

        try {
            const res = await axios.post(`${backendUrl}/api/scrape-existing/start`, {
                tableName,
                dbSettings,
                saveProductHtml: options.saveProductHtml,
                saveProductMedia: options.saveProductMedia,
                pageDelays: options.pageDelays,
            });

            if (!res.data.success || !res.data.jobId) {
                throw new Error('Failed to start scraping job');
            }

            const jobId = res.data.jobId;
            setCurrentJobId(jobId);
            setStatus('running');

            // Connect to Server-Sent Events stream
            const eventSource = new EventSource(
                `${backendUrl}/api/scrape-existing/stream/${jobId}`,
            );

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'init') {
                        setStats((prev) => ({
                            ...prev,
                            totalCards: data.totalCards,
                            completedCount: data.completedCount,
                            pendingCount: data.pendingCount,
                            isFullyFinished: data.isFullyFinished,
                            folderPath: data.tableFolder,
                        }));
                        setProgress({
                            current: data.completedCount,
                            total: data.totalCards,
                        });
                    } else if (data.type === 'item_start') {
                        setLogs((prev) => [
                            ...prev,
                            {
                                type: 'info',
                                text: `[${data.current}/${data.total}] Скрапінг товару ID: ${data.card_id} (${data.url})`,
                            },
                        ]);
                    } else if (data.type === 'progress') {
                        setProgress({
                            current: data.current,
                            total: data.total,
                        });
                        setStats((prev) => ({
                            ...prev,
                            completedCount: data.current,
                            pendingCount: Math.max(0, data.total - data.current),
                        }));

                        if (data.status === 'completed') {
                            setLogs((prev) => [
                                ...prev,
                                {
                                    type: 'success',
                                    text: t('existingTableScrape.logItemSuccess', {
                                        title: data.title || data.card_id,
                                        url: data.url,
                                    }),
                                },
                            ]);
                        } else if (data.status === 'skipped') {
                            setLogs((prev) => [
                                ...prev,
                                {
                                    type: 'warning',
                                    text: t('existingTableScrape.logItemSkipped', {
                                        url: data.url,
                                    }),
                                },
                            ]);
                        } else if (data.status === 'error') {
                            setLogs((prev) => [
                                ...prev,
                                {
                                    type: 'error',
                                    text: t('existingTableScrape.logItemError', {
                                        url: data.url,
                                        error: data.error,
                                    }),
                                },
                            ]);
                        }
                    } else if (data.type === 'finish') {
                        setStatus(data.cancelled ? 'cancelled' : 'finished');
                        setStats((prev) => ({
                            ...prev,
                            isFullyFinished: !!data.isFullyFinished,
                            completedCount: data.completedCount,
                            pendingCount: Math.max(
                                0,
                                data.totalCards - data.completedCount,
                            ),
                        }));

                        if (data.cancelled) {
                            setLogs((prev) => [
                                ...prev,
                                {
                                    type: 'warning',
                                    text: t('existingTableScrape.logCancelled'),
                                },
                            ]);
                        } else {
                            setLogs((prev) => [
                                ...prev,
                                {
                                    type: 'success',
                                    text: t('existingTableScrape.logFinished', {
                                        count: data.completedCount,
                                        total: data.totalCards,
                                    }),
                                },
                                {
                                    type: 'info',
                                    text: t('existingTableScrape.logPathInfo'),
                                },
                            ]);
                        }
                        eventSource.close();
                    } else if (data.type === 'error') {
                        setStatus('error');
                        setLogs((prev) => [
                            ...prev,
                            {
                                type: 'error',
                                text: t('existingTableScrape.serverError', {
                                    message: data.message,
                                }),
                            },
                        ]);
                        eventSource.close();
                    }
                } catch (parseErr) {
                    console.error('SSE JSON parse error:', parseErr);
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
            };
        } catch (err) {
            console.error('Error starting scrape job:', err);
            setStatus('error');
            setLogs((prev) => [
                ...prev,
                {
                    type: 'error',
                    text: t('existingTableScrape.failedStart', {
                        message: err.message,
                    }),
                },
            ]);
        }
    };

    // Handle Pause/Resume
    const handleTogglePause = async () => {
        if (!currentJobId) return;
        const newPauseState = !isPaused;
        try {
            await axios.post(`${backendUrl}/api/scrape-existing/action`, {
                jobId: currentJobId,
                action: newPauseState ? 'pause' : 'resume',
            });
            setIsPaused(newPauseState);
            setStatus(newPauseState ? 'paused' : 'running');
        } catch (err) {
            console.error('Error toggling pause:', err);
        }
    };

    // Handle Cancel/Stop
    const handleCancelJob = async () => {
        if (!currentJobId) return;
        const confirmCancel = window.confirm(
            t('existingTableScrape.cancelConfirm'),
        );
        if (!confirmCancel) return;

        try {
            await axios.post(`${backendUrl}/api/scrape-existing/action`, {
                jobId: currentJobId,
                action: 'cancel',
            });
            setStatus('cancelled');
        } catch (err) {
            console.error('Error cancelling job:', err);
        }
    };

    const handleCloseModal = () => {
        if (status === 'running' || status === 'paused') {
            const confirmClose = window.confirm(
                t('existingTableScrape.cancelConfirm'),
            );
            if (!confirmClose) return;
            handleCancelJob();
        }
        onClose();
    };

    if (!isOpen) return null;

    const percent =
        progress.total > 0
            ? Math.min(
                  100,
                  Math.round((progress.current / progress.total) * 100),
              )
            : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-lg shadow-inner">
                            📦
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                                {t('existingTableScrape.title')}
                            </h3>
                            <p className="text-xs font-mono text-cyan-400 truncate max-w-md">
                                {tableName}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleCloseModal}
                        className="text-slate-400 hover:text-slate-100 p-2 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer"
                        title={t('existingTableScrape.close')}
                    >
                        ✕
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                    {/* Path Card */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-slate-400 shrink-0">📁 {t('existingTableScrape.folder')}:</span>
                            <span
                                className="text-indigo-300 truncate"
                                title={stats.folderPath}
                            >
                                {stats.folderPath || `./backend/data/${tableName}_goods/`}
                            </span>
                        </div>
                        <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider shrink-0 w-fit ${
                                stats.folderExists
                                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30'
                            }`}
                        >
                            {stats.folderExists ? 'FOLDER READY' : 'AUTO-CREATE'}
                        </span>
                    </div>

                    {/* Stats Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3 flex flex-col">
                            <span className="text-[10px] font-mono text-slate-500 uppercase">
                                {t('existingTableScrape.totalCards')}
                            </span>
                            <span className="text-lg font-mono font-bold text-slate-200 mt-1">
                                {stats.totalCards}
                            </span>
                        </div>

                        <div className="bg-slate-950/50 border border-emerald-500/20 rounded-2xl p-3 flex flex-col">
                            <span className="text-[10px] font-mono text-emerald-400 uppercase">
                                {t('existingTableScrape.alreadyScraped')}
                            </span>
                            <span className="text-lg font-mono font-bold text-emerald-400 mt-1">
                                {stats.completedCount}
                            </span>
                        </div>

                        <div className="bg-slate-950/50 border border-amber-500/20 rounded-2xl p-3 flex flex-col">
                            <span className="text-[10px] font-mono text-amber-400 uppercase">
                                {t('existingTableScrape.remaining')}
                            </span>
                            <span className="text-lg font-mono font-bold text-amber-400 mt-1">
                                {stats.pendingCount}
                            </span>
                        </div>

                        <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3 flex flex-col">
                            <span className="text-[10px] font-mono text-slate-500 uppercase">
                                {t('existingTableScrape.fullyFinished')}
                            </span>
                            <span className="text-sm font-mono font-bold mt-1 flex items-center gap-1.5">
                                {stats.isFullyFinished ? (
                                    <span className="text-emerald-400">
                                        ✅ {t('existingTableScrape.yes')}
                                    </span>
                                ) : (
                                    <span className="text-amber-400">
                                        ⏳ {t('existingTableScrape.no')}
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar & Status Pill */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-mono">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">Статус:</span>
                                {status === 'idle' && (
                                    <span className="text-slate-400 font-bold">Очікування запуску</span>
                                )}
                                {status === 'starting' && (
                                    <span className="text-cyan-400 font-bold animate-pulse">
                                        {t('existingTableScrape.statusPreparing')}
                                    </span>
                                )}
                                {status === 'running' && (
                                    <span className="text-indigo-400 font-bold animate-pulse">
                                        {t('existingTableScrape.statusScanning')}
                                    </span>
                                )}
                                {status === 'paused' && (
                                    <span className="text-amber-400 font-bold">
                                        {t('existingTableScrape.statusPaused')}
                                    </span>
                                )}
                                {status === 'finished' && (
                                    <span className="text-emerald-400 font-bold">
                                        {t('existingTableScrape.statusComplete')}
                                    </span>
                                )}
                                {status === 'cancelled' && (
                                    <span className="text-rose-400 font-bold">
                                        {t('existingTableScrape.statusCancelled')}
                                    </span>
                                )}
                                {status === 'error' && (
                                    <span className="text-red-400 font-bold">
                                        {t('existingTableScrape.statusFailed')}
                                    </span>
                                )}
                            </div>

                            <span className="font-bold text-slate-300">
                                {progress.current} / {progress.total} ({percent}%)
                            </span>
                        </div>

                        <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 p-0.5">
                            <div
                                className="bg-linear-to-r from-cyan-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Terminal Logs Window */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 px-1">
                            <span>ЖУРНАЛ СКАЧУВАННЯ (log_activ_table.txt / .json):</span>
                            <span>{logs.length} записів</span>
                        </div>

                        <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 h-56 overflow-y-auto font-mono text-xs space-y-1 shadow-inner select-text">
                            {logs.map((log, index) => (
                                <div
                                    key={index}
                                    className={`leading-relaxed break-all ${
                                        log.type === 'error'
                                            ? 'text-red-400'
                                            : log.type === 'warning'
                                              ? 'text-amber-400'
                                              : log.type === 'success'
                                                ? 'text-emerald-400'
                                                : log.type === 'secondary'
                                                  ? 'text-slate-600'
                                                  : 'text-slate-300'
                                    }`}
                                >
                                    {log.text}
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                        <span>📝 Режим:</span>
                        <span className="text-slate-300">
                            {options.saveProductHtml ? 'HTML ✓' : 'HTML ✗'},{' '}
                            {options.saveProductMedia ? 'Media ✓' : 'Media ✗'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {status === 'idle' && (
                            <button
                                onClick={handleStartJob}
                                className="bg-linear-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold font-mono text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer"
                            >
                                ▶ {t('existingTableScrape.start')}
                            </button>
                        )}

                        {(status === 'running' || status === 'paused') && (
                            <>
                                <button
                                    onClick={handleTogglePause}
                                    className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-mono text-xs font-bold px-4 py-2.5 rounded-xl border border-amber-500/30 transition-all cursor-pointer"
                                >
                                    {isPaused
                                        ? `▶ ${t('existingTableScrape.resume')}`
                                        : `⏸ ${t('existingTableScrape.pause')}`}
                                </button>

                                <button
                                    onClick={handleCancelJob}
                                    className="bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 font-mono text-xs font-bold px-4 py-2.5 rounded-xl border border-rose-500/40 transition-all cursor-pointer"
                                >
                                    ⏹ {t('existingTableScrape.cancel')}
                                </button>
                            </>
                        )}

                        {(status === 'finished' ||
                            status === 'cancelled' ||
                            status === 'error') && (
                            <>
                                {!stats.isFullyFinished && (
                                    <button
                                        onClick={handleStartJob}
                                        className="bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-xs font-bold px-4 py-2.5 rounded-xl border border-cyan-500/40 transition-all cursor-pointer"
                                    >
                                        🔄 {t('existingTableScrape.start')}
                                    </button>
                                )}
                                <button
                                    onClick={handleCloseModal}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold px-5 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
                                >
                                    {t('existingTableScrape.close')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
