import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { useAppConfig } from '../components/AppConfigProvider';

export const Welcome: React.FC = () => {
    const navigate = useNavigate();
    const { config } = useAppConfig();
    const appName = config?.app_name || 'Aruneeka';

    // Theme-aware logo selection
    const currentTheme = localStorage.getItem('app_ui_theme') || 'light';
    const isDark = currentTheme === 'dark' || currentTheme === 'midnight';
    const appLogo = (isDark && config?.app_logo_light) ? config.app_logo_light : (config?.app_logo || '');

    useEffect(() => {
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [navigate]);

    return (
        <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-6 auth-bg relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-violet-200/50 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute top-[20%] -right-[15%] w-[50%] h-[50%] bg-amber-200/50 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
                <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] bg-emerald-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
            </div>

            <div className="relative z-10 max-w-lg w-full text-center">
                {/* Logo - centered, full logo without box */}
                <div className="mx-auto mb-10 flex items-center justify-center">
                    {appLogo ? (
                        <img src={appLogo} alt={appName} className="w-full max-w-[480px] max-h-48 object-contain" />
                    ) : (
                        <div className="text-6xl font-black text-foreground">{appName}</div>
                    )}
                </div>
                <p className="text-lg text-slate-600 font-medium mb-12 leading-relaxed max-w-md mx-auto">
                    Semoga tools ini bisa membantu kerja kamu agar lebih efektif
                </p>

                {/* Two Buttons: Login & Daftar */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full sm:w-auto px-12 py-5 bg-slate-900 text-white font-black text-xl uppercase tracking-widest rounded-[2rem] shadow-[8px_8px_0px_0px_#475569] hover:-translate-y-1.5 hover:shadow-[12px_12px_0px_0px_#475569] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-4 border-[4px] border-slate-900"
                    >
                        <LogIn size={24} strokeWidth={3} /> Login
                    </button>

                    <button
                        onClick={() => navigate('/terms')}
                        className="w-full sm:w-auto px-12 py-5 bg-card text-foreground font-black text-xl uppercase tracking-widest rounded-[2rem] shadow-[8px_8px_0px_0px_#0f172a] hover:-translate-y-1.5 hover:shadow-[12px_12px_0px_0px_#0f172a] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-4 border-[4px] border-slate-900"
                    >
                        <UserPlus size={24} strokeWidth={3} /> Daftar
                    </button>
                </div>

                {/* Version footer */}
                <p className="text-xs text-mutedForeground font-bold mt-12">
                    v{config?.app_version || '1.0.0'} — {appName}
                </p>
            </div>
        </div>
    );
};
