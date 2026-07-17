import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';

export default function LinkCheckingModal({ isOpen, onClose, tableName, dbSettings }) {
    const [status, setStatus] = useState('idle'); // idle, running, finished, error, paused, cancelled
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [currentJobId, setCurrentJobId] = useState(null);
    const [deletedCount, setDeletedCount] = useState(0);
    const logsEndRef = useRef(null);
    
    // Auto scroll to bottom of logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    useEffect(() => {
        if (!isOpen || !tableName) return;
        
        let eventSource = null;
        let isComponentMounted = true;
        
        const startJob = async () => {
            setStatus('running');
            setProgress({ current: 0, total: 0 });
            setLogs([{ type: 'info', text: `Starting link checking for table: ${tableName}...` }]);
            setSummary(null);

            try {
                // 1. Start the job and get jobId
                const res = await axios.post(`${backendUrl}/api/check-links/start`, {
                    tableName,
                    dbSettings
                });
                
                if (!res.data.success || !res.data.jobId) {
                    throw new Error('Failed to start job');
                }
                
                const jobId = res.data.jobId;
                setCurrentJobId(jobId);
                
                // 2. Connect to SSE
                eventSource = new EventSource(`${backendUrl}/api/check-links/stream/${jobId}`);
                
                eventSource.onmessage = (event) => {
                    if (!isComponentMounted) return;
                    
                    try {
                        const data = JSON.parse(event.data);
                        
                        if (data.type === 'start') {
                            setProgress({ current: 0, total: data.total });
                            setLogs(prev => [...prev, { type: 'info', text: `Found ${data.total} cards to check.` }]);
                        } else if (data.type === 'progress') {
                            setProgress(prev => ({ ...prev, current: data.current }));
                            
                            let logMsg = '';
                            let logType = 'info';
                            
                            if (data.status === 'deleted') {
                                logMsg = `DELETED: Found "ended by seller" in ${data.url}`;
                                logType = 'success';
                                setDeletedCount(prev => prev + 1);
                            } else if (data.status === 'error') {
                                logMsg = `ERROR: Failed to check ${data.url} (${data.error})`;
                                logType = 'error';
                            } else if (data.status === 'ok') {
                                logMsg = `OK: Listing active ${data.url}`;
                                logType = 'info';
                            } else if (data.status === 'skipped') {
                                logMsg = `SKIPPED: Invalid URL`;
                                logType = 'warning';
                            }
                            
                            setLogs(prev => [...prev, { type: logType, text: logMsg }]);
                        } else if (data.type === 'finish') {
                            setStatus('finished');
                            setSummary({ deletedCount: data.deletedCount, tableDropped: data.tableDropped });
                            setLogs(prev => [...prev, { type: 'success', text: `Job finished! Deleted ${data.deletedCount} items.` }]);
                            if (data.tableDropped) {
                                setLogs(prev => [...prev, { type: 'warning', text: `Table ${tableName} was emptied and dropped.` }]);
                            }
                            if (data.cancelled) {
                                setStatus('cancelled');
                                setLogs(prev => [...prev, { type: 'warning', text: `Job was cancelled by the user.` }]);
                            }
                            eventSource.close();
                        } else if (data.type === 'error') {
                            setStatus('error');
                            setLogs(prev => [...prev, { type: 'error', text: `Server error: ${data.message}` }]);
                            eventSource.close();
                        }
                    } catch (err) {
                        console.error('Failed to parse SSE message', err);
                    }
                };
                
                eventSource.onerror = (err) => {
                    if (status !== 'finished' && isComponentMounted) {
                        setStatus('error');
                        setLogs(prev => [...prev, { type: 'error', text: 'Lost connection to server.' }]);
                    }
                    if (eventSource) eventSource.close();
                };
                
            } catch (err) {
                if (!isComponentMounted) return;
                setStatus('error');
                setLogs(prev => [...prev, { type: 'error', text: `Failed to start job: ${err.message}` }]);
            }
        };

        startJob();

        return () => {
            isComponentMounted = false;
            if (eventSource) {
                eventSource.close();
            }
        };
    }, [isOpen, tableName, dbSettings]);

    const handleAction = async (action) => {
        if (!currentJobId) return;
        try {
            await axios.post(`${backendUrl}/api/check-links/action`, {
                jobId: currentJobId,
                action
            });
            if (action === 'pause') setIsPaused(true);
            if (action === 'resume') setIsPaused(false);
            if (action === 'cancel') {
                setStatus('cancelled');
                onClose(true, summary); // Assuming we just close and refresh on cancel
            }
        } catch (err) {
            console.error(`Failed to ${action} job`, err);
        }
    };

    if (!isOpen) return null;

    const progressPercentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[90vh]">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                            <span>🔗</span> Link Checking Task
                        </h2>
                        <div className="flex items-center gap-4 mt-1">
                            <p className="text-xs text-slate-400 font-mono">Table: {tableName}</p>
                            <p className="text-xs text-rose-400 font-mono font-bold flex items-center gap-1">
                                <span>🗑️</span> Deleted: {deletedCount}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            if (status === 'running') {
                                if (window.confirm('Job is currently running. Are you sure you want to cancel and close?')) {
                                    handleAction('cancel');
                                }
                            } else {
                                onClose(true, summary);
                            }
                        }}
                        className="text-slate-400 hover:text-white transition-colors p-2"
                        title="Close Window"
                    >
                        ✕
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="p-5 bg-slate-900/50 shrink-0">
                    <div className="flex justify-between items-center mb-2 text-sm font-mono">
                        <span className="text-slate-300">
                            {status === 'running' ? (isPaused ? 'Paused...' : 'Scanning links...') : 
                             status === 'cancelled' ? 'Scan cancelled' :
                             status === 'finished' ? 'Scan complete' : 
                             status === 'error' ? 'Scan failed' : 'Preparing...'}
                        </span>
                        <span className="text-cyan-400 font-bold">
                            {progress.current} / {progress.total} ({progressPercentage}%)
                        </span>
                    </div>
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                        <div 
                            className={`h-full transition-all duration-300 ease-out ${status === 'error' ? 'bg-red-500' : 'bg-linear-to-r from-cyan-500 to-indigo-500'}`}
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                {/* Logs Terminal */}
                <div className="flex-1 bg-slate-950 border-t border-b border-slate-800 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed relative min-h-[300px]">
                    {logs.map((log, idx) => {
                        let colorClass = 'text-slate-300';
                        if (log.type === 'success') colorClass = 'text-emerald-400';
                        if (log.type === 'error') colorClass = 'text-rose-400';
                        if (log.type === 'warning') colorClass = 'text-amber-400';
                        if (log.type === 'info') colorClass = 'text-slate-400';

                        return (
                            <div key={idx} className={`mb-1.5 break-words ${colorClass}`}>
                                <span className="opacity-50 select-none mr-2">[{new Date().toLocaleTimeString()}]</span>
                                {log.text}
                            </div>
                        );
                    })}
                    <div ref={logsEndRef} />
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-slate-950 flex justify-between items-center shrink-0 border-t border-slate-800">
                    {/* Left: Pause/Resume Action */}
                    <div>
                        {status === 'running' && (
                            <button
                                onClick={() => handleAction(isPaused ? 'resume' : 'pause')}
                                className={`px-4 py-2 rounded-xl font-bold font-mono text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2 ${
                                    isPaused 
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20'
                                }`}
                            >
                                {isPaused ? '▶ Resume' : '⏸ Pause'}
                            </button>
                        )}
                    </div>
                    
                    {/* Right: Status / Close Action */}
                    <div className="flex justify-end gap-3">
                        {status === 'running' ? (
                            <div className="flex items-center gap-2 text-amber-500 font-mono text-sm px-4 py-2">
                                {isPaused ? (
                                    <span>⏸ Paused</span>
                                ) : (
                                    <span className="animate-pulse">⏳ Working... Please wait</span>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => onClose(true, summary)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold font-mono text-sm shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                            >
                                Close & Refresh
                            </button>
                        )}
                    </div>
                </div>
                
            </div>
        </div>
    );
}
