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

        // Then check every 15 minutes
        intervalId = setInterval(checkForUpdate, 15 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [initialVersion]);

    const handleUpdate = () => {
        // Force a complete reload ignoring cache
        window.location.reload();
    };

    if (!hasUpdate) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl rounded-2xl p-4 flex items-center space-x-4 border border-white/20 backdrop-blur-md">
                <div className="p-2 bg-white/20 rounded-full animate-pulse">
                    <RefreshCw className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h4 className="font-bold text-sm">Update Baru Tersedia! 🚀</h4>
                    <p className="text-xs text-blue-100 mt-0.5 max-w-[200px]">
                        Versi terbaru Aruneeka Planner sudah rilis. Muat ulang sekarang untuk menikmati performa terbaik.
                    </p>
                </div>
                <div className="flex flex-col space-y-2 ml-4">
                    <button
                        onClick={handleUpdate}
                        className="px-4 py-1.5 bg-white text-blue-600 text-xs font-bold rounded-lg shadow hover:bg-blue-50 transition-colors"
                    >
                        Muat Ulang
                    </button>
                    <button
                        onClick={() => setHasUpdate(false)}
                        className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors flex justify-center"
                    >
                        <span className="text-[10px] uppercase font-semibold">Nanti</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
