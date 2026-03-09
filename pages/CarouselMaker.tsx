import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../src/components/Sidebar';
import { Editor } from '../src/components/Editor';
import { BottomBar } from '../src/components/BottomBar';
import {
    Sparkles, Plus, ChevronLeft, ChevronRight, Palette, X, Loader2, Save, ArrowLeft, Menu, Wrench, StickyNote,
    Layers,
    Copy,
    Trash2,
    FolderOpen,
    MoreHorizontal
} from 'lucide-react';
import { useCarouselStore } from '../src/store/useCarouselStore';
import { NotesPanel } from '../src/components/NotesPanel';
import { useAppConfig } from '../components/AppConfigProvider';
import { PremiumLockScreen } from '../components/PremiumLockScreen';

export const CarouselMaker: React.FC = () => {
    const navigate = useNavigate();
    const { config } = useAppConfig();
    const [brandLogo, setBrandLogo] = useState('');
    const [brandName, setBrandName] = useState('Arunika');
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [currentTheme, setCurrentTheme] = useState('light');
    const [customColor, setCustomColor] = useState('#8b5cf6');
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [showMobileBottomBar, setShowMobileBottomBar] = useState(false);
    const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const isFree = localStorage.getItem('user_subscription_package') === 'Free' && localStorage.getItem('user_role') !== 'Developer';

    const {
        resetCanvas,
        saveProject,
        loadProjects,
        loadFonts,
        currentProjectId,
        pages,
        canvasSize,
        currentPageIndex,
        setCurrentPageIndex,
        addPage,
        duplicatePage,
        deletePage
    } = useCarouselStore();

    useEffect(() => {
        const savedTheme = localStorage.getItem('carousel_ui_theme');
        if (savedTheme) setCurrentTheme(savedTheme);
        const savedColor = localStorage.getItem('carousel_custom_color');
        if (savedColor) setCustomColor(savedColor);
        // Don't try to load URLs from localStorage - they may not be stored anymore
        // Only load from context/config which fetches fresh from database
        const name = localStorage.getItem('app_name') || 'Arunika';
        setBrandName(name);

        loadFonts();
        loadProjects();
    }, []);

    const handleNewCanvas = async () => {
        if (window.confirm("Ingin menyimpan project saat ini sebelum mulai baru? Klik 'Cancel' untuk langsung reset tanpa simpan.")) {
            const name = prompt("Beri nama project ini:");
            if (name) {
                try {
                    setIsSaving(true);
                    await saveProject(name);
                    window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: 'Project disimpan!' } }));
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSaving(false);
                }
            }
        }
        resetCanvas();
    };

    const handleQuickSave = async () => {
        try {
            setIsSaving(true);
            let name = "Untitled Project";
            if (!currentProjectId) {
                const input = prompt("Nama project baru:", "Project " + new Date().toLocaleDateString());
                if (!input) return;
                name = input;
            }
            await saveProject(name);
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: 'Project Berhasil Disimpan!' } }));
        } catch (err) {
            console.error(err);
            alert("Gagal simpan project.");
        } finally {
            setIsSaving(false);
        }
    };

    const THEME_STYLES: Record<string, string> = {
        dark: `
            .theme-dark { background-color: #0f172a !important; color: #f8fafc !important; }
            .theme-dark header, .theme-dark aside, .theme-dark .bg-white, .theme-dark div.bg-white, .theme-dark button.bg-white { background-color: #1e293b !important; border-color: #334155 !important; color: #f8fafc !important; }
            .theme-dark .bg-slate-50, .theme-dark .bg-slate-100, .theme-dark .bg-slate-200 { background-color: #0f172a !important; border-color: #334155 !important; }
            .theme-dark .text-slate-900, .theme-dark .text-slate-800, .theme-dark .text-slate-700 { color: #f1f5f9 !important; }
            .theme-dark .text-slate-500, .theme-dark .text-slate-400 { color: #94a3b8 !important; }
            .theme-dark .border-slate-900, .theme-dark .border-slate-200, .theme-dark .border-slate-300 { border-color: #334155 !important; }
            .theme-dark [class*="shadow-"] { box-shadow: 4px 4px 0px 0px #020617 !important; }
            .theme-dark .bg-slate-900 { background-color: #3b82f6 !important; color: #fff !important; }
            .theme-dark input, .theme-dark select, .theme-dark textarea { background-color: #0f172a !important; color: #fff !important; border-color: #334155 !important; }
            .theme-dark .bg-red-50 { background-color: #1e3a8a !important; border-color: #1e40af !important; color: #bfdbfe !important; }
            .theme-dark .text-red-500, .theme-dark .text-red-600 { color: #93c5fd !important; }
            .theme-dark .hover\\:bg-red-500:hover { background-color: #3b82f6 !important; color: #fff !important; }
            .theme-dark .hover\\:text-red-500:hover { color: #60a5fa !important; }
            .theme-dark .bg-yellow-400 { background-color: #2563eb !important; color: #fff !important; }
            .theme-dark .text-accent { color: #60a5fa !important; }
            .theme-dark div[class*="bg-[#fdfbf6]"], .theme-dark div[class*="bg-[#f4f0e6]"] { background-color: #1e293b !important; color: #f8fafc !important; }
            .theme-dark .prose { color: #f8fafc !important; }
            .theme-dark [contenteditable] { color: #f8fafc !important; background-color: rgba(0,0,0,0.2) !important; }
            .theme-dark .bg-amber-400 { background-color: #fbbf24 !important; color: #000 !important; }
            .theme-dark .bg-amber-400 h3, .theme-dark .bg-amber-400 span, .theme-dark .bg-amber-400 button { color: #000 !important; }
            .theme-dark .fixed.bottom-28, .theme-dark .fixed.bottom-6 { background-color: #1e293b !important; border-color: #334155 !important; color: #f8fafc !important; }
            .theme-dark .fixed.bottom-28 div.bg-slate-300 { background-color: #334155 !important; }
            .theme-dark .fixed.bottom-28 button:hover, .theme-dark .fixed.bottom-6 button:hover { background-color: rgba(255,255,255,0.05) !important; }
        `,
        midnight: `
            .theme-midnight { background-color: #0c1130 !important; color: #e0e7ff !important; }
            .theme-midnight header, .theme-midnight aside, .theme-midnight .bg-white, .theme-midnight div.bg-white, .theme-midnight button.bg-white { background-color: #1e1b4b !important; border-color: #3730a3 !important; color: #e0e7ff !important; }
            .theme-midnight .bg-slate-50, .theme-midnight .bg-slate-100, .theme-midnight .bg-slate-200 { background-color: #0c1130 !important; border-color: #312e81 !important; }
            .theme-midnight .text-slate-900, .theme-midnight .text-slate-800, .theme-midnight .text-slate-700 { color: #c7d2fe !important; }
            .theme-midnight .text-slate-500, .theme-midnight .text-slate-400 { color: #818cf8 !important; }
            .theme-midnight .border-slate-900, .theme-midnight .border-slate-200, .theme-midnight .border-slate-300 { border-color: #3730a3 !important; }
            .theme-midnight [class*="shadow-"] { box-shadow: 4px 4px 0px 0px #0b0f29 !important; }
            .theme-midnight .bg-slate-900 { background-color: #6366f1 !important; color: #fff !important; }
            .theme-midnight input, .theme-midnight select, .theme-midnight textarea { background-color: #0c1130 !important; color: #fff !important; border-color: #3730a3 !important; }
            .theme-midnight .bg-red-50 { background-color: #312e81 !important; border-color: #3730a3 !important; color: #a5b4fc !important; }
            .theme-midnight .text-red-500, .theme-midnight .text-red-600 { color: #a5b4fc !important; }
            .theme-midnight .hover\\:bg-red-500:hover { background-color: #4f46e5 !important; color: #fff !important; }
            .theme-midnight .hover\\:text-red-500:hover { color: #818cf8 !important; }
            .theme-midnight .bg-yellow-400 { background-color: #4f46e5 !important; color: #fff !important; }
            .theme-midnight .bg-slate-900 .text-red-500, .theme-midnight aside .text-red-500 { color: #c7d2fe !important; }
            .theme-midnight .bg-slate-900 .hover\\:bg-red-50:hover, .theme-midnight aside .hover\\:bg-red-50:hover { background-color: rgba(99,102,241,0.2) !important; color: #e0e7ff !important; }
            .theme-midnight div[class*="bg-[#fdfbf6]"], .theme-midnight div[class*="bg-[#f4f0e6]"] { background-color: #1e1b4b !important; color: #e0e7ff !important; }
            .theme-midnight .prose { color: #e0e7ff !important; }
            .theme-midnight [contenteditable] { color: #e0e7ff !important; background-color: rgba(0,0,0,0.2) !important; }
            .theme-midnight .bg-amber-400 { background-color: #f59e0b !important; color: #000 !important; }
            .theme-midnight .bg-amber-400 h3, .theme-midnight .bg-amber-400 span, .theme-midnight .bg-amber-400 button { color: #000 !important; }
            .theme-midnight .fixed.bottom-28, .theme-midnight .fixed.bottom-6 { background-color: #1e1b4b !important; border-color: #3730a3 !important; color: #e0e7ff !important; }
            .theme-midnight .fixed.bottom-28 div.bg-slate-300 { background-color: #3730a3 !important; }
            .theme-midnight .fixed.bottom-28 button:hover, .theme-midnight .fixed.bottom-6 button:hover { background-color: rgba(255,255,255,0.05) !important; }
        `,
        pastel: `
            .theme-pastel { background-color: #fff1f2 !important; border-color: #fb7185 !important; }
            .theme-pastel header, .theme-pastel aside, .theme-pastel .bg-white { background-color: #ffe4e6 !important; border-color: #fda4af !important; color: #881337 !important; }
            .theme-pastel .bg-slate-50, .theme-pastel .bg-slate-100, .theme-pastel .bg-slate-200 { background-color: #fff1f2 !important; border-color: #fecdd3 !important; }
            .theme-pastel .text-slate-900, .theme-pastel .text-slate-800, .theme-pastel .text-slate-700 { color: #9f1239 !important; }
            .theme-pastel .text-slate-500, .theme-pastel .text-slate-400 { color: #e11d48 !important; }
            .theme-pastel .border-slate-900, .theme-pastel .border-slate-200 { border-color: #fb7185 !important; }
            .theme-pastel [class*="shadow-"] { box-shadow: 4px 4px 0px 0px #fb7185 !important; }
            .theme-pastel .bg-slate-900 { background-color: #fb7185 !important; color: #fff !important; }
            .theme-pastel input, .theme-pastel select, .theme-pastel textarea { background-color: #fff1f2 !important; color: #881337 !important; border-color: #fb7185 !important; }
            .theme-pastel .bg-red-50 { background-color: #fce7f3 !important; border-color: #fbcfe8 !important; color: #be185d !important; }
            .theme-pastel .bg-yellow-400 { background-color: #fb7185 !important; color: #fff !important; }
            .theme-pastel .bg-slate-900 .text-red-500 { color: #ffe4e6 !important; }
            .theme-pastel .bg-slate-900 .hover\\:bg-red-50:hover { background-color: rgba(255,255,255,0.2) !important; color: #fff !important; }
        `,
        'pastel-green': `
            .theme-pastel-green { background-color: #f0fdf4 !important; border-color: #4ade80 !important; }
            .theme-pastel-green header, .theme-pastel-green aside, .theme-pastel-green .bg-white { background-color: #dcfce7 !important; border-color: #86efac !important; color: #14532d !important; }
            .theme-pastel-green .bg-slate-50, .theme-pastel-green .bg-slate-100, .theme-pastel-green .bg-slate-200 { background-color: #f0fdf4 !important; border-color: #bbf7d0 !important; }
            .theme-pastel-green .text-slate-900, .theme-pastel-green .text-slate-800, .theme-pastel-green .text-slate-700 { color: #166534 !important; }
            .theme-pastel-green .text-slate-500, .theme-pastel-green .text-slate-400 { color: #22c55e !important; }
            .theme-pastel-green .border-slate-900, .theme-pastel-green .border-slate-200 { border-color: #4ade80 !important; }
            .theme-pastel-green [class*="shadow-"] { box-shadow: 4px 4px 0px 0px #4ade80 !important; }
            .theme-pastel-green .bg-slate-900 { background-color: #4ade80 !important; color: #14532d !important; }
            .theme-pastel-green input, .theme-pastel-green select, .theme-pastel-green textarea { background-color: #f0fdf4 !important; color: #14532d !important; border-color: #4ade80 !important; }
            .theme-pastel-green .bg-red-50 { background-color: #dcfce7 !important; border-color: #bbf7d0 !important; color: #166534 !important; }
            .theme-pastel-green .bg-yellow-400 { background-color: #4ade80 !important; color: #14532d !important; }
            .theme-pastel-green .bg-slate-900 .text-red-500 { color: #dcfce7 !important; }
            .theme-pastel-green .bg-slate-900 .hover\\:bg-red-50:hover { background-color: rgba(255,255,255,0.2) !important; color: #fff !important; }
        `,
        'pastel-yellow': `
            .theme-pastel-yellow { background-color: #fefce8 !important; border-color: #facc15 !important; }
            .theme-pastel-yellow header, .theme-pastel-yellow aside, .theme-pastel-yellow .bg-white { background-color: #fef9c3 !important; border-color: #fde047 !important; color: #713f12 !important; }
            .theme-pastel-yellow .bg-slate-50, .theme-pastel-yellow .bg-slate-100, .theme-pastel-yellow .bg-slate-200 { background-color: #fefce8 !important; border-color: #fef08a !important; }
            .theme-pastel-yellow .text-slate-900, .theme-pastel-yellow .text-slate-800, .theme-pastel-yellow .text-slate-700 { color: #854d0e !important; }
            .theme-pastel-yellow .text-slate-500, .theme-pastel-yellow .text-slate-400 { color: #eab308 !important; }
            .theme-pastel-yellow .border-slate-900, .theme-pastel-yellow .border-slate-200 { border-color: #facc15 !important; }
            .theme-pastel-yellow [class*="shadow-"] { box-shadow: 4px 4px 0px 0px #facc15 !important; }
            .theme-pastel-yellow .bg-slate-900 { background-color: #facc15 !important; color: #713f12 !important; }
            .theme-pastel-yellow input, .theme-pastel-yellow select, .theme-pastel-yellow textarea { background-color: #fefce8 !important; color: #713f12 !important; border-color: #facc15 !important; }
            .theme-pastel-yellow .bg-red-50 { background-color: #fef9c3 !important; border-color: #fef08a !important; color: #854d0e !important; }
            .theme-pastel-yellow .bg-yellow-400 { background-color: #facc15 !important; color: #713f12 !important; }
            .theme-pastel-yellow .bg-slate-900 .text-red-500 { color: #fef9c3 !important; }
            .theme-pastel-yellow .bg-slate-900 .hover\\:bg-red-50:hover { background-color: rgba(255,255,255,0.2) !important; color: #fff !important; }
        `,
        custom: `
            .theme-custom { background-color: ${customColor}15 !important; border-color: ${customColor} !important; }
            .theme-custom header, .theme-custom aside, .theme-custom .bg-white { background-color: #ffffff !important; border-color: ${customColor} !important; }
            .theme-custom .bg-slate-50, .theme-custom .bg-slate-100, .theme-custom .bg-slate-200 { background-color: ${customColor}05 !important; border-color: ${customColor}33 !important; }
            .theme-custom .text-slate-900, .theme-custom .text-slate-800, .theme-custom .text-slate-700 { color: ${customColor} !important; }
            .theme-custom .text-slate-500, .theme-custom .text-slate-400 { color: ${customColor}bb !important; }
            .theme-custom .border-slate-900, .theme-custom .border-slate-200 { border-color: ${customColor} !important; }
            .theme-custom [class*="shadow-"] { box-shadow: 4px 4px 0px 0px ${customColor} !important; }
            .theme-custom .bg-slate-900 { background-color: ${customColor} !important; color: #fff !important; }
            .theme-custom input, .theme-custom select, .theme-custom textarea { border-color: ${customColor} !important; color: ${customColor} !important; }
            .theme-custom .bg-red-50 { background-color: ${customColor}15 !important; border-color: ${customColor}44 !important; color: ${customColor} !important; }
            .theme-custom .bg-yellow-400 { background-color: ${customColor} !important; color: #fff !important; }
            .theme-custom .bg-slate-900 .text-red-500 { color: #fff !important; }
            .theme-custom .text-red-500, .theme-custom .text-red-600 { color: ${customColor} !important; }
            .theme-custom .hover\\:bg-red-500:hover { background-color: ${customColor} !important; color: #fff !important; }
            .theme-custom .bg-slate-900 .hover\\:bg-red-50:hover { background-color: rgba(255,255,255,0.2) !important; color: #fff !important; }
            .theme-custom aside .text-red-500 { color: ${customColor} !important; }
        `
    };

    if (isFree) {
        return <PremiumLockScreen
            title="Arunika Carousel Terkunci"
            description="Buat carousel memukau dalam hitungan detik dengan AI assistant dan berbagai template. Upgrade untuk membuka fitur pro ini."
        />;
    }

    return (
        <div className={`flex flex-col bg-slate-50 font-sans text-slate-900 flex-1 min-h-0 relative ${!isMobile ? 'border-4 border-slate-900 rounded-3xl shadow-[12px_12px_0px_0px_#0f172a]' : ''} overflow-hidden theme-${currentTheme}`}>
            {isMobile && <div className="flex-shrink-0 mobile-safe-top-spacer bg-white" />}
            {currentTheme !== 'light' && <style dangerouslySetInnerHTML={{ __html: THEME_STYLES[currentTheme] }} />}

            {showThemeModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white border-4 border-slate-900 rounded-3xl p-4 sm:p-6 w-[95vw] sm:w-[700px] max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_0px_#0f172a] relative">
                        <button onClick={() => setShowThemeModal(false)} className="absolute top-3 right-3 hover:bg-slate-100 p-2 rounded-xl">
                            <X size={18} />
                        </button>
                        <h2 className="font-black text-lg sm:text-2xl mb-4 sm:mb-6">Window Theme</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                            {[
                                { id: 'light', name: 'Light (Default)', colors: ['#f8fafc', '#ffffff', '#0f172a'] },
                                { id: 'dark', name: 'Dark Mode', colors: ['#0f172a', '#1e293b', '#f8fafc'] },
                                { id: 'midnight', name: 'Midnight', colors: ['#0c1130', '#1e1b4b', '#e0e7ff'] },
                                { id: 'pastel', name: 'Pastel Pink', colors: ['#fff1f2', '#ffe4e6', '#881337'] },
                                { id: 'pastel-green', name: 'Pastel Green', colors: ['#f0fdf4', '#dcfce7', '#14532d'] },
                                { id: 'pastel-yellow', name: 'Pastel Yellow', colors: ['#fefce8', '#fef9c3', '#713f12'] }
                            ].map(theme => (
                                <button
                                    key={theme.id}
                                    onClick={() => {
                                        setCurrentTheme(theme.id);
                                        localStorage.setItem('carousel_ui_theme', theme.id);
                                    }}
                                    className={`p-4 rounded-xl border-4 text-left transition-all hover:-translate-y-1 ${currentTheme === theme.id ? 'border-accent shadow-[4px_4px_0px_0px_var(--tw-shadow-color)] shadow-accent' : 'border-slate-200 hover:border-slate-900'}`}
                                >
                                    <div className="flex gap-2 mb-3">
                                        {theme.colors.map((c, i) => (
                                            <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900" style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                    <span className="font-bold text-sm block ml-1">{theme.name}</span>
                                </button>
                            ))}

                            <div className={`p-4 rounded-xl border-4 text-left transition-all ${currentTheme === 'custom' ? 'border-accent shadow-[4px_4px_0px_0px_var(--tw-shadow-color)] shadow-accent' : 'border-slate-200'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex gap-2">
                                        <div className="w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center overflow-hidden cursor-pointer relative" style={{ backgroundColor: customColor }}>
                                            <input
                                                type="color"
                                                value={customColor}
                                                onChange={(e) => {
                                                    setCustomColor(e.target.value);
                                                    localStorage.setItem('carousel_custom_color', e.target.value);
                                                    setCurrentTheme('custom');
                                                    localStorage.setItem('carousel_ui_theme', 'custom');
                                                }}
                                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer p-0"
                                            />
                                        </div>
                                    </div>
                                    {currentTheme !== 'custom' && (
                                        <button
                                            onClick={() => {
                                                setCurrentTheme('custom');
                                                localStorage.setItem('carousel_ui_theme', 'custom');
                                            }}
                                            className="text-[10px] font-black underline text-slate-500 hover:text-slate-900"
                                        >
                                            Select
                                        </button>
                                    )}
                                </div>
                                <span className="font-bold text-sm block ml-1">Custom Color</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header - Canva/ibis Paint style on mobile */}
            <header className="h-11 sm:h-14 lg:h-16 bg-white border-b-2 sm:border-b-4 border-slate-900 flex items-center justify-between px-2 sm:px-4 lg:px-6 shrink-0 z-20 gap-2">
                {/* Left: Back + Logo + Title */}
                <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 min-w-0">
                    <button onClick={() => navigate(-1)} className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-lg border-2 border-slate-900 shrink-0 shadow-[2px_2px_0px_0px_#0f172a] active:translate-y-0.5 active:shadow-none transition-all">
                        <ArrowLeft size={14} className="text-slate-900" />
                    </button>
                    {brandLogo ? (
                        <img src={brandLogo} alt="Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain shrink-0" />
                    ) : (
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-accent rounded-lg border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_#0f172a] shrink-0">
                            <Sparkles size={11} className="text-white" />
                        </div>
                    )}
                    <h1 className="font-black text-xs sm:text-base lg:text-xl tracking-tighter truncate max-w-[100px] sm:max-w-none">{config?.page_titles?.['carousel']?.title || 'Design'}</h1>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 flex-shrink-0">
                    {/* Mobile: Sidebar toggle */}
                    <button onClick={() => setShowMobileSidebar(!showMobileSidebar)} className="sm:hidden w-8 h-8 bg-slate-100 rounded-lg border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_#0f172a] active:translate-y-0.5 active:shadow-none transition-all">
                        <Menu size={14} className="text-slate-900" />
                    </button>
                    {/* Mobile: Theme */}
                    <button onClick={() => setShowThemeModal(true)} className="sm:hidden w-8 h-8 bg-slate-100 rounded-lg border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_#0f172a] active:translate-y-0.5 active:shadow-none transition-all">
                        <Palette size={14} className="text-slate-900" />
                    </button>
                    {/* Desktop: Theme + New Canvas */}
                    <button onClick={() => setShowThemeModal(true)} className="hidden sm:flex items-center gap-1 px-3 py-1.5 lg:px-4 lg:py-2 bg-slate-100 text-slate-900 font-black text-[10px] lg:text-xs tracking-widest hover:bg-slate-200 rounded-lg transition-colors border-2 border-slate-300 shrink-0">
                        <Palette size={12} /> <span className="hidden lg:inline">Theme</span>
                    </button>
                    <button onClick={handleNewCanvas} className="hidden sm:flex items-center gap-1 px-3 py-1.5 lg:px-4 lg:py-2 bg-white text-slate-900 font-black text-[10px] lg:text-xs tracking-widest hover:bg-slate-50 rounded-lg transition-colors border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] shrink-0">
                        <Plus size={12} /> <span className="hidden lg:inline">Canvas</span>
                    </button>
                    {/* Save button */}
                    <button onClick={handleQuickSave} disabled={isSaving}
                        className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 lg:px-4 lg:py-2 bg-accent text-white font-black text-[10px] sm:text-[10px] lg:text-xs tracking-widest hover:brightness-110 rounded-lg transition-all border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] disabled:opacity-50 shrink-0">
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        <span className="hidden sm:inline">{currentProjectId ? 'Update' : 'Save'}</span>
                        <span className="sm:hidden">{currentProjectId ? 'Update' : 'Save'}</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden min-h-0 relative">
                {/* DESKTOP SIDEBAR */}
                {!isMobile && (
                    <div className="flex min-w-0 max-w-full relative shrink-0">
                        <Sidebar />
                    </div>
                )}

                {/* MOBILE SLIDE-UP DRAWER (SIDEBAR) */}
                {isMobile && (
                    <div
                        className={`fixed inset-x-0 bottom-0 z-[100] transition-transform duration-300 ease-in-out transform ${showMobileSidebar ? 'translate-y-0' : 'translate-y-full'}`}
                        style={{ height: '70vh' }}
                    >
                        {/* Drawer Backdrop - can be dismissed by clicking outside if needed */}
                        <div
                            className={`fixed inset-0 bg-black/40 backdrop-blur-sm -z-10 transition-opacity duration-300 ${showMobileSidebar ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                            onClick={() => setShowMobileSidebar(false)}
                        />

                        {/* Content Container */}
                        <div className="h-full bg-white border-t-4 border-slate-900 rounded-t-[2.5rem] flex flex-col shadow-[0_-12px_40px_rgba(0,0,0,0.2)] overflow-hidden">
                            {/* Handle & Close */}
                            <div className="w-full h-12 flex items-center justify-between px-6 shrink-0">
                                <div className="w-10" /> {/* Spacer */}
                                <div className="w-12 h-1.5 bg-slate-200 rounded-full" onClick={() => setShowMobileSidebar(false)} />
                                <button
                                    onClick={() => setShowMobileSidebar(false)}
                                    className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl border-2 border-slate-900 shadow-mini active:translate-y-[2px] active:shadow-none transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Sidebar Content (Version Mobile) */}
                            <div className="flex-1 overflow-hidden">
                                <Sidebar isMobile={true} onClose={() => setShowMobileSidebar(false)} />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 flex overflow-hidden relative min-h-0 w-full">
                    <div className="flex-1 flex flex-col overflow-hidden relative transition-all duration-300 min-h-0 w-full">
                        <Editor isMobile={isMobile} />

                        {/* Desktop BottomBar */}
                        {!isMobile && (
                            <BottomBar />
                        )}
                    </div>

                    {/* Desktop Toolbar - Notes Toggle (Modified for mobile coexistence) */}
                    {!isMobile && (
                        <>
                            <button
                                onClick={() => setIsNotesOpen(!isNotesOpen)}
                                className={`absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center bg-white border-2 border-slate-900 rounded-l-lg sm:rounded-l-xl p-1 sm:p-1.5 shadow-[-4px_4px_0px_0px_#0f172a] hover:bg-amber-100 transition-all duration-300 ${isNotesOpen ? 'right-[calc(min(336px,50vw))]' : 'right-0'}`}
                                title="Toggle Script Notes"
                            >
                                {isNotesOpen ? <ChevronRight size={16} className="text-slate-700 sm:w-5 sm:h-5" /> : <ChevronLeft size={16} className="text-slate-700 sm:w-5 sm:h-5" />}
                            </button>

                            <div className="py-1 sm:py-2.5 pr-1 sm:pr-2.5 flex shrink-0 h-full relative z-10 transition-all duration-300 max-w-[50vw]">
                                <NotesPanel isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} />
                            </div>
                        </>
                    )}

                    {/* MOBILE TOOLBAR (Bottom Navigation) */}
                    {isMobile && (
                        <>
                            {/* Page Indicator / Mini Navigator */}
                            <div
                                className="fixed left-1/2 -translate-x-1/2 z-[85] flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-slate-900 shadow-mini"
                                style={{ bottom: `calc(7rem + env(safe-area-inset-bottom, 0px))` }}
                            >
                                <button
                                    disabled={currentPageIndex === 0}
                                    onClick={() => setCurrentPageIndex(currentPageIndex - 1)}
                                    className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-20"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <div className="flex items-center gap-1.5 px-2">
                                    {pages.map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={`h-1.5 transition-all duration-300 rounded-full ${currentPageIndex === idx ? 'w-6 bg-accent' : 'w-1.5 bg-slate-300'}`}
                                        />
                                    ))}
                                </div>
                                <button
                                    disabled={currentPageIndex === pages.length - 1}
                                    onClick={() => setCurrentPageIndex(currentPageIndex + 1)}
                                    className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-20"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>

                            <div
                                className="fixed left-1/2 -translate-x-1/2 z-[90] flex items-center gap-1 px-4 py-3 bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] rounded-[2rem]"
                                style={{ bottom: `calc(max(1rem, 1.5rem + env(safe-area-inset-bottom, 0px)))` }}
                            >
                                {[
                                    { id: 'content', icon: <Plus size={18} strokeWidth={3} />, label: 'Add', active: showMobileSidebar },
                                    { id: 'layers', icon: <Layers size={18} strokeWidth={3} />, label: 'Layers' },
                                    { id: 'projects', icon: <FolderOpen size={18} strokeWidth={3} />, label: 'Files' },
                                    { id: 'pages', icon: <Copy size={18} strokeWidth={3} />, label: 'Pages', action: () => setShowMobileBottomBar(!showMobileBottomBar) },
                                    { id: 'more', icon: <MoreHorizontal size={18} strokeWidth={3} />, label: 'More', action: () => setShowMobileMoreMenu(!showMobileMoreMenu) },
                                ].map((btn) => (
                                    <button
                                        key={btn.id}
                                        onClick={() => {
                                            if (btn.action) {
                                                btn.action();
                                            } else {
                                                setShowMobileSidebar(true);
                                                window.dispatchEvent(new CustomEvent('sidebar:switch-tab', { detail: { tab: btn.id } }));
                                            }
                                        }}
                                        className={`flex flex-col items-center gap-1 px-2 min-w-[50px] transition-transform active:scale-90 ${btn.active || (btn.id === 'pages' && showMobileBottomBar) || (btn.id === 'more' && showMobileMoreMenu) ? 'text-accent' : 'text-slate-900'}`}
                                    >
                                        <div className={`p-1 rounded-lg ${btn.active || (btn.id === 'pages' && showMobileBottomBar) || (btn.id === 'more' && showMobileMoreMenu) ? 'bg-amber-100' : ''}`}>
                                            {btn.icon}
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest">{btn.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* MOBILE MORE MENU */}
                            <div
                                className={`fixed inset-x-0 bottom-0 z-[110] transition-transform duration-300 ease-in-out transform ${showMobileMoreMenu ? 'translate-y-0' : 'translate-y-full'}`}
                            >
                                <div
                                    className={`fixed inset-0 bg-black/40 backdrop-blur-sm -z-10 transition-opacity duration-300 ${showMobileMoreMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                                    onClick={() => setShowMobileMoreMenu(false)}
                                />
                                <div className="bg-white border-t-4 border-slate-900 rounded-t-[2rem] p-6 shadow-2xl flex flex-col gap-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-black text-lg uppercase tracking-tighter">More Actions</h3>
                                        <button onClick={() => setShowMobileMoreMenu(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => { setShowThemeModal(true); setShowMobileMoreMenu(false); }}
                                            className="flex flex-col items-center gap-3 p-6 border-4 border-slate-900 rounded-2xl bg-white shadow-mini active:translate-y-1 active:shadow-none transition-all"
                                        >
                                            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                                                <Palette size={24} />
                                            </div>
                                            <span className="font-black text-xs">Window Theme</span>
                                        </button>
                                        <button
                                            onClick={() => { setIsNotesOpen(true); setShowMobileMoreMenu(false); }}
                                            className="flex flex-col items-center gap-3 p-6 border-4 border-slate-900 rounded-2xl bg-white shadow-mini active:translate-y-1 active:shadow-none transition-all"
                                        >
                                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                                                <StickyNote size={24} />
                                            </div>
                                            <span className="font-black text-xs">Script Notes</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* MOBILE PAGE DRAWER (Thumbnails) */}
                            <div
                                className={`fixed inset-x-0 bottom-0 z-[95] transition-transform duration-300 ease-in-out transform ${showMobileBottomBar ? 'translate-y-0' : 'translate-y-full'}`}
                                style={{ height: '40vh' }}
                            >
                                <div
                                    className={`fixed inset-0 bg-black/40 backdrop-blur-sm -z-10 transition-opacity duration-300 ${showMobileBottomBar ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                                    onClick={() => setShowMobileBottomBar(false)}
                                />
                                <div className="h-full bg-white border-t-4 border-slate-900 rounded-t-[2rem] flex flex-col p-6 shadow-2xl">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-black text-lg">Manage Pages</h3>
                                        <div className="flex items-center gap-2">
                                            <button onClick={addPage} className="flex items-center gap-2 bg-yellow-400 border-2 border-slate-900 px-3 py-1.5 rounded-xl font-bold text-xs shadow-mini active:translate-y-[1px]">
                                                <Plus size={14} /> Add
                                            </button>
                                            <button
                                                onClick={() => setShowMobileBottomBar(false)}
                                                className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-lg border-2 border-slate-900 shadow-mini active:translate-y-[1px]"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                        {pages.map((page, index) => (
                                            <div
                                                key={page.id}
                                                onClick={() => setCurrentPageIndex(index)}
                                                className={`relative shrink-0 w-32 aspect-[4/5] bg-slate-100 rounded-xl border-2 border-slate-900 overflow-hidden transition-all ${currentPageIndex === index ? 'ring-4 ring-accent ring-offset-2 scale-105' : 'opacity-70'}`}
                                                style={{ backgroundColor: page.background }}
                                            >
                                                {page.previewUrl && <img src={page.previewUrl} className="w-full h-full object-contain" />}
                                                <div className="absolute top-2 left-2 bg-white/90 px-1.5 rounded-md border border-slate-900 text-[8px] font-black">
                                                    #{index + 1}
                                                </div>
                                                <div className="absolute bottom-2 right-2 flex gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); duplicatePage(index); }} className="p-1 bg-white border border-slate-900 rounded-md"><Copy size={10} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); deletePage(index); }} className="p-1 bg-white border border-slate-900 rounded-md text-red-500"><Trash2 size={10} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* MOBILE SIDE-DRAWER NOTES */}
                    {isMobile && (
                        <div className={`fixed inset-0 z-[110] transition-opacity duration-300 ${isNotesOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                            {/* Backdrop */}
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsNotesOpen(false)} />

                            {/* Drawer Content */}
                            <div className={`absolute top-0 right-0 h-full w-[85vw] max-w-[400px] bg-white border-l-4 border-slate-900 shadow-[-12px_0_40px_rgba(0,0,0,0.2)] flex flex-col p-6 transition-transform duration-300 ease-in-out transform ${isNotesOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                                <div className="flex items-center justify-between mb-6 shrink-0">
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Design Script</h3>
                                    <button
                                        onClick={() => setIsNotesOpen(false)}
                                        className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl border-2 border-slate-900 shadow-mini active:translate-y-[2px] active:shadow-none transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <NotesPanel isOpen={true} onClose={() => setIsNotesOpen(false)} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
