import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export const AppUpdater = () => {
    const [hasUpdate, setHasUpdate] = useState(false);
    const [initialVersion, setInitialVersion] = useState<number | null>(null);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const checkForUpdate = async () => {
            try {
                const response = await fetch(`/version.json?t=${new Date().getTime()}`, {
                    cache: 'no-store'
                });

                if (response.ok) {
                    const data = await response.json();

                    if (initialVersion === null) {
                        // First time loading, record current version
                        setInitialVersion(data.version);
                    } else if (data.version && data.version !== initialVersion) {
                        // Document has been updated on the server
                        setHasUpdate(true);
                    }
                }
            } catch (err) {
                // Ignored, might be offline
                console.warn('Silent fail checking for app updates', err);
            }
        };

        // Check right away after a short delay to not block main thread
        setTimeout(checkForUpdate, 5000);

        // Then check every 30 seconds for near real-time updates
        intervalId = setInterval(checkForUpdate, 30 * 1000);

        // Also check immediately when user focuses back on the tab
        window.addEventListener('focus', checkForUpdate);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', checkForUpdate);
        };
    }, [initialVersion]);

    const handleUpdate = () => {
        // Force a complete reload ignoring cache
        window.location.reload();
    };

    if (!hasUpdate) return null;

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-5 fade-in duration-500">
            <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.24)] rounded-full px-5 py-2.5 flex items-center gap-4">
                <div className="flex items-center gap-3 text-sm font-medium text-white">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    Versi sistem Aruneeka terbaru tersedia!
                </div>
                <div className="flex items-center gap-3 border-l border-white/10 pl-4 ml-1">
                    <button
                        onClick={handleUpdate}
                        className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/30"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Muat Ulang
                    </button>
                    <button
                        onClick={() => setHasUpdate(false)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Tutup notifikasi"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
