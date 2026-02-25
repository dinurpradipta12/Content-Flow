import React, { useState, useEffect } from 'react';
import { Sidebar } from '../src/components/Sidebar';
import { Editor } from '../src/components/Editor';
import { BottomBar } from '../src/components/BottomBar';
import { Sparkles, Plus, ChevronLeft, ChevronRight, Palette, X, Loader2, Save } from 'lucide-react';
import { useCarouselStore } from '../src/store/useCarouselStore';
import { NotesPanel } from '../src/components/NotesPanel';
import { useAppConfig } from '../components/AppConfigProvider';

export const CarouselMaker: React.FC = () => {
    const { config } = useAppConfig();
    const [brandLogo, setBrandLogo] = useState('');
    const [brandName, setBrandName] = useState('Arunika');
    const [isNotesOpen, setIsNotesOpen] = useState(false);
    const [currentTheme, setCurrentTheme] = useState('light');
    const [customColor, setCustomColor] = useState('#8b5cf6');
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const {
        resetCanvas,
        saveProject,
        loadProjects,
        loadFonts,
        currentProjectId,
        pages,
        canvasSize
    } = useCarouselStore();

    useEffect(() => {
        const savedTheme = localStorage.getItem('carousel_ui_theme');
        if (savedTheme) setCurrentTheme(savedTheme);
        const savedColor = localStorage.getItem('carousel_custom_color');
        if (savedColor) setCustomColor(savedColor);
        const favicon = localStorage.getItem('app_favicon') || '';
        const logo = localStorage.getItem('app_logo') || '';
        const name = localStorage.getItem('app_name') || 'Arunika';
        setBrandLogo(favicon || logo);
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

    return (
        <div className={`flex flex-col bg-slate-50 font-sans text-slate-900 flex-1 min-h-0 relative border-4 border-slate-900 rounded-3xl overflow-hidden shadow-[12px_12px_0px_0px_#0f172a] theme-${currentTheme}`}>
            {currentTheme !== 'light' && <style dangerouslySetInnerHTML={{ __html: THEME_STYLES[currentTheme] }} />}

            {showThemeModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 w-[700px] shadow-[8px_8px_0px_0px_#0f172a] relative">
                        <button onClick={() => setShowThemeModal(false)} className="absolute top-4 right-4 hover:bg-slate-100 p-2 rounded-xl">
                            <X size={20} />
                        </button>
                        <h2 className="font-black text-2xl mb-6">Window Theme</h2>
                        <div className="grid grid-cols-3 gap-4">
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

            {/* Header */}
            <header className="h-16 bg-white border-b-4 border-slate-900 flex items-center justify-between px-6 shrink-0 z-20">
                <div className="flex items-center gap-3 max-w-[50%]">
                    {brandLogo ? (
                        <img src={brandLogo} alt="Logo" className="w-10 h-10 object-contain shrink-0" />
                    ) : (
                        <div className="w-10 h-10 bg-accent rounded-xl border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_#0f172a] shrink-0">
                            <Sparkles size={20} className="text-white" />
                        </div>
                    )}
                    <h1 className="font-black text-xl tracking-tighter leading-tight break-words">{config?.page_titles?.['carousel']?.title || 'Arunika Carousel'}</h1>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleQuickSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-accent text-white font-black text-xs tracking-widest hover:brightness-110 rounded-lg transition-all border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {currentProjectId ? 'Update Project' : 'Save Project'}
                    </button>
                    <button onClick={() => setShowThemeModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-900 font-black text-xs tracking-widest hover:bg-slate-200 rounded-lg transition-colors border-2 border-slate-300">
                        <Palette size={16} /> Theme
                    </button>
                    <button onClick={handleNewCanvas} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 font-black text-xs tracking-widest hover:bg-slate-50 rounded-xl transition-colors border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                        <Plus size={16} /> New Canvas
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                <Sidebar />
                <div className="flex-1 flex overflow-hidden relative min-h-0">
                    <div className="flex-1 flex flex-col overflow-hidden relative transition-all duration-300 min-h-0">
                        <Editor />
                        <BottomBar />
                    </div>

                    {/* Toggle Button for Notes */}
                    <button
                        onClick={() => setIsNotesOpen(!isNotesOpen)}
                        className={`absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center bg-white border-2 border-slate-900 rounded-l-xl p-1.5 shadow-[-4px_4px_0px_0px_#0f172a] hover:bg-amber-100 transition-all duration-300 ${isNotesOpen ? 'right-[336px]' : 'right-0'
                            }`}
                        title="Toggle Script Notes"
                    >
                        {isNotesOpen ? <ChevronRight size={20} className="text-slate-700" /> : <ChevronLeft size={20} className="text-slate-700" />}
                    </button>

                    {/* Right Notes Panel */}
                    <div className="py-2.5 pr-2.5 flex shrink-0 h-full relative z-10 transition-all duration-300">
                        <NotesPanel isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} />
                    </div>
                </div>
            </div>
        </div>
    );
};
