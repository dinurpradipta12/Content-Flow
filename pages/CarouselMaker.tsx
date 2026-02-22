import React, { useState, useEffect } from 'react';
import { Sidebar } from '../src/components/Sidebar';
import { Editor } from '../src/components/Editor';
import { BottomBar } from '../src/components/BottomBar';
import { Sparkles, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCarouselStore } from '../src/store/useCarouselStore';
import { NotesPanel } from '../src/components/NotesPanel';

export const CarouselMaker: React.FC = () => {
    const [brandLogo, setBrandLogo] = useState('');
    const [brandName, setBrandName] = useState('Arunika');
    const [isNotesOpen, setIsNotesOpen] = useState(false);

    useEffect(() => {
        const favicon = localStorage.getItem('app_favicon') || '';
        const logo = localStorage.getItem('app_logo') || '';
        const name = localStorage.getItem('app_name') || 'Arunika';
        setBrandLogo(favicon || logo);
        setBrandName(name);
    }, []);

    const resetCanvas = useCarouselStore(state => state.resetCanvas);

    const handleNewCanvas = () => {
        if (window.confirm("Simpan Preset terlebih dahulu sebelum melanjutkan. Memulai canvas baru akan me-reset seluruh halaman ini. Lanjutkan?")) {
            resetCanvas();
        }
    };

    return (
        <div className="flex flex-col bg-slate-50 font-sans text-slate-900 h-[calc(100vh-100px)] relative border-4 border-slate-900 rounded-3xl overflow-hidden shadow-[12px_12px_0px_0px_#0f172a]">
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
                    <h1 className="font-black text-xl tracking-tighter leading-tight break-words">Arunika Carousel</h1>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={handleNewCanvas} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 font-black text-xs tracking-widest hover:bg-red-100 rounded-lg transition-colors border-2 border-red-200">
                        <Plus size={16} /> New Canvas
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                <Sidebar />
                <div className="flex-1 flex overflow-hidden relative">
                    <div className="flex-1 flex flex-col overflow-hidden relative transition-all duration-300">
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
