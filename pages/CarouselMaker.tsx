import React, { useState, useEffect } from 'react';
import { Sidebar } from '../src/components/Sidebar';
import { Editor } from '../src/components/Editor';
import { BottomBar } from '../src/components/BottomBar';
import { Sparkles, Settings } from 'lucide-react';

export const CarouselMaker: React.FC = () => {
    const [brandLogo, setBrandLogo] = useState('');
    const [brandName, setBrandName] = useState('Arunika');

    useEffect(() => {
        const favicon = localStorage.getItem('app_favicon') || '';
        const logo = localStorage.getItem('app_logo') || '';
        const name = localStorage.getItem('app_name') || 'Arunika';
        setBrandLogo(favicon || logo);
        setBrandName(name);
    }, []);

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
                    <button className="flex items-center gap-2 px-4 py-2 font-black text-xs tracking-widest hover:bg-slate-100 rounded-lg transition-colors">
                        <Settings size={16} /> Settings
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Editor />
                    <BottomBar />
                </div>
            </div>
        </div>
    );
};
