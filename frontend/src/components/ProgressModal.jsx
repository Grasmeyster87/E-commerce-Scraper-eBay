/**
 * ProgressModal Component
 * An overlay modal indicating the real-time status of batch file export operations.
 *
 * @param {boolean} isOpen - Determines if the modal is visible.
 * @param {Function} onClose - Handler to trigger modal dismissal.
 * @param {Object[]} saveSteps - Array representing the queue of format exports (e.g., CSV, JSON) and their statuses.
 */
export default function ProgressModal({ isOpen, onClose, saveSteps }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl p-6 overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                        🔄 Batch Data Export Pipeline
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-300 transition-colors text-sm font-bold p-1"
                    >
                        ✕ Dismiss
                    </button>
                </div>

                {/* Queue Tracker */}
                <div className="space-y-3 my-6">
                    {saveSteps.map((step) => (
                        <div
                            key={step.id}
                            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                step.status === 'processing'
                                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-sm'
                                    : step.status === 'success'
                                      ? 'bg-emerald-950/20 border-emerald-500/30'
                                      : step.status === 'error'
                                        ? 'bg-red-950/20 border-red-500/30'
                                        : 'bg-slate-950/40 border-slate-900'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                {/* State Indicators */}
                                {step.status === 'pending' && (
                                    <span className="w-2 h-2 rounded-full bg-slate-700 block"></span>
                                )}
                                {step.status === 'processing' && (
                                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                )}
                                {step.status === 'success' && (
                                    <span className="text-emerald-400 font-bold text-sm">✅</span>
                                )}
                                {step.status === 'error' && (
                                    <span className="text-red-400 font-bold text-sm">❌</span>
                                )}

                                {/* Job Details */}
                                <div>
                                    <p
                                        className={`text-sm font-semibold ${step.status === 'processing' ? 'text-indigo-300' : 'text-slate-300'}`}
                                    >
                                        {step.name}
                                    </p>
                                    {step.status === 'success' && (
                                        <p
                                            className="text-[10px] text-slate-500 font-mono truncate max-w-[320px]"
                                            title={step.path}
                                        >
                                            Path: {step.path}
                                        </p>
                                    )}
                                    {step.status === 'error' && (
                                        <p className="text-[10px] text-red-400 font-mono">
                                            Fault: {step.error}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Text Labels */}
                            <span className="text-xs font-mono font-bold">
                                {step.status === 'pending' && <span className="text-slate-600">Pending</span>}
                                {step.status === 'processing' && <span className="text-indigo-400 animate-pulse">Running...</span>}
                                {step.status === 'success' && <span className="text-emerald-400">Complete</span>}
                                {step.status === 'error' && <span className="text-red-400">Failed</span>}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Footer Action */}
                <div className="flex justify-end border-t border-slate-800 pt-4">
                    <button
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs px-5 py-2.5 rounded-xl transition-colors"
                    >
                        Acknowledge
                    </button>
                </div>
            </div>
        </div>
    );
}