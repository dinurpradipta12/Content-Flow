import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Rocket, RefreshCw } from 'lucide-react';

interface PageConfig {
    title: string;
    subtitle: string;
}

interface PaymentConfig {
    bankName: string;
    accountNumber: string;
    accountName: string;
    packages: { id: string; name: string; price: number; durationDays?: number }[];
}

interface AppConfig {
    app_name: string;
    app_logo: string;
    app_favicon: string;
    page_titles: Record<string, PageConfig>;
    hidden_pages: string[];
    app_version: string;
    changelog: string;
    payment_config?: PaymentConfig;
}

interface AppConfigContextType {
    config: AppConfig | null;
    loading: boolean;
}

const defaultContext: AppConfigContextType = {
    config: null,
    loading: true,
};

const AppConfigContext = createContext<AppConfigContextType>(defaultContext);

export const useAppConfig = () => useContext(AppConfigContext);

export const AppConfigProvider = ({ children }: { children: ReactNode }) => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [loading, setLoading] = useState(true);

    // Version Check
    const [currentVersion, setCurrentVersion] = useState<string | null>(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [changelog, setChangelog] = useState('');

    const fetchConfigValue = async () => {
        try {
            const { data, error } = await supabase.from('app_config').select('*').single();
            if (data) {
                setConfig(data);
                if (currentVersion === null) {
                    setCurrentVersion(data.app_version); // Initial version mount
                } else if (data.app_version !== currentVersion) {
                    // new version detected
                    setChangelog(data.changelog);
                    setShowUpdateModal(true);
                }
            }
        } catch (err) {
            console.error('Error fetching app config:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigValue();

        const channel = supabase.channel('app_config_realtime')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'app_config' },
                (payload) => {
                    const newConfig = payload.new as AppConfig;
                    setConfig(newConfig);
                    setCurrentVersion(prev => {
                        if (prev && newConfig.app_version !== prev) {
                            setChangelog(newConfig.changelog);
                            setShowUpdateModal(true);
                        }
                        return newConfig.app_version;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <AppConfigContext.Provider value={{ config, loading }}>
            {children}

            <Modal isOpen={showUpdateModal} onClose={() => { }} title="Pembaruan Sistem Tersedia" maxWidth="max-w-md">
                <div className="flex flex-col items-center justify-center text-center space-y-4 p-4">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                        <Rocket size={32} className="text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 font-heading">Versi Baru Dirilis!</h3>
                    <p className="text-sm font-bold text-slate-500">
                        Sistem telah diperbarui ke versi terbaru. Silakan muat ulang aplikasi untuk mendapatkan fitur terbaru dan memastikan kelancaran sistem.
                    </p>

                    <div className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-left my-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2">Changelog</h4>
                        <p className="text-sm font-bold text-slate-700 whitespace-pre-wrap">{changelog || 'Pembaruan stabilitas dan performa.'}</p>
                    </div>

                    <Button
                        onClick={() => window.location.reload()}
                        className="w-full h-12 text-sm uppercase tracking-widest gap-2"
                        icon={<RefreshCw size={18} />}
                    >
                        Muat Ulang Sekarang
                    </Button>
                </div>
            </Modal>
        </AppConfigContext.Provider>
    );
};
