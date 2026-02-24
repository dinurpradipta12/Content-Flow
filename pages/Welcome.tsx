import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { useAppConfig } from '../components/AppConfigProvider';

export const Welcome: React.FC = () => {
    const navigate = useNavigate();
    const { config } = useAppConfig();
    const appName = config?.app_name || 'Aruneeka';
    const appLogo = config?.app_logo || '';

    useEffect(() => {
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [navigate]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 auth-bg relative overflow-hidden">
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
                        <img src={appLogo} alt={appName} className="w-full max-w-[320px] max-h-36 object-contain" />
                    ) : (
                        <div className="text-6xl font-black text-slate-900">{appName}</div>
                    )}
                </div>

                {/* Welcome Text - exact text as requested */}
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight leading-tight">
                    Selamat datang di{' '}
                    <span className="text-violet-600 inline-block px-3 py-1 bg-violet-100 rounded-xl border-2 border-violet-900 leading-[1.3]">
                        {appName}
                    </span>
                </h1>
                <p className="text-lg text-slate-600 font-medium mb-12 leading-relaxed max-w-md mx-auto">
                    Semoga tools ini bisa membantu kerja kamu agar lebih efektif
                </p>

                {/* Two Buttons: Login & Daftar */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white font-bold text-lg rounded-2xl shadow-[4px_4px_0px_0px_#334155] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#334155] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 border-2 border-slate-900"
                    >
                        <LogIn size={22} /> Login
                    </button>

                    <button
                        onClick={() => navigate('/terms')}
                        className="w-full sm:w-auto px-10 py-4 bg-white text-slate-900 font-bold text-lg rounded-2xl shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 border-4 border-slate-900"
                    >
                        <UserPlus size={22} /> Daftar
                    </button>
                </div>

                {/* Version footer */}
                <p className="text-xs text-slate-400 font-bold mt-12">
                    v{config?.app_version || '1.0.0'} — {appName}
                </p>
            </div>
        </div>
    );
};
