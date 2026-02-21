import React from 'react';
import { useCarouselStore } from '../src/store/useCarouselStore';
import { Onboarding } from '../src/components/Onboarding';
import { Sidebar } from '../src/components/Sidebar';
import { Editor } from '../src/components/Editor';
import { BottomBar } from '../src/components/BottomBar';
import { Sparkles, Share2, Download, Settings } from 'lucide-react';

export const CarouselMaker: React.FC = () => {
    const isOnboarding = useCarouselStore((state) => state.isOnboarding);

    if (isOnboarding) {
        return <Onboarding />;
    }

    return (
        <div className="flex flex-col bg-slate-50 font-sans text-slate-900 h-[calc(100vh-140px)] relative border-4 border-slate-900 rounded-3xl overflow-hidden shadow-[12px_12px_0px_0px_#0f172a]">
            {/* Header */}
            <header className="h-16 bg-white border-b-4 border-slate-900 flex items-center justify-between px-6 shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent rounded-xl border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0px_0px_#0f172a]">
                        <Sparkles size={20} className="text-white" />
                    </div>
                    <h1 className="font-black text-xl uppercase tracking-tighter">AI Carousel Maker</h1>
                </div>

                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-4 py-2 font-black uppercase text-xs tracking-widest hover:bg-slate-100 rounded-lg transition-colors">
                        <Settings size={16} /> Settings
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 font-black uppercase text-xs tracking-widest hover:bg-slate-100 rounded-lg transition-colors">
                        <Share2 size={16} /> Share
                    </button>
                    <button className="bg-slate-900 text-white px-6 py-2 rounded-xl border-2 border-slate-900 font-black uppercase text-xs tracking-widest shadow-[4px_4px_0px_0px_#f27d26] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#f27d26] transition-all flex items-center gap-2">
                        <Download size={16} /> Download All
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
