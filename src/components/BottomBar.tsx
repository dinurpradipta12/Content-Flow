import React from 'react';
import { useCarouselStore } from '../store/useCarouselStore';
import { Plus, Copy, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export const BottomBar: React.FC = () => {
    const { 
        pages, 
        currentPageIndex, 
        setCurrentPageIndex, 
        addPage, 
        duplicatePage, 
        deletePage 
    } = useCarouselStore();

    return (
        <div className="h-32 bg-white border-t-4 border-slate-900 flex items-center px-6 gap-6 overflow-x-auto custom-scrollbar">
            <div className="flex gap-4 items-center h-full py-4">
                {pages.map((page, index) => (
                    <div 
                        key={page.id}
                        className={`relative group shrink-0 h-full aspect-[4/5] border-4 border-slate-900 rounded-lg overflow-hidden cursor-pointer transition-all shadow-[4px_4px_0px_0px_#0f172a] ${
                            currentPageIndex === index ? 'ring-4 ring-accent ring-offset-2 scale-105 z-10' : 'hover:scale-105'
                        }`}
                        onClick={() => setCurrentPageIndex(index)}
                        style={{ backgroundColor: page.background }}
                    >
                        <div className="absolute inset-0 flex flex-col p-2 pointer-events-none">
                            <div className="text-[6px] font-black uppercase truncate opacity-50">{page.content.hook}</div>
                            <div className="mt-auto text-[4px] font-bold opacity-30">Page {index + 1}</div>
                        </div>
                        
                        {/* Page Actions */}
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); duplicatePage(index); }}
                                className="p-1.5 bg-white rounded-md hover:bg-yellow-400 transition-colors"
                                title="Duplicate"
                            >
                                <Copy size={14} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); deletePage(index); }}
                                className="p-1.5 bg-white rounded-md hover:bg-red-500 hover:text-white transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}

                <button 
                    onClick={addPage}
                    className="shrink-0 h-full aspect-[4/5] border-4 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-accent hover:bg-yellow-50 transition-all group"
                >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
                        <Plus size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-accent">Add Page</span>
                </button>
            </div>

            <div className="ml-auto flex items-center gap-4 border-l-4 border-slate-900 pl-6 h-12">
                <div className="flex items-center gap-2">
                    <button 
                        disabled={currentPageIndex === 0}
                        onClick={() => setCurrentPageIndex(currentPageIndex - 1)}
                        className="p-2 bg-slate-100 rounded-lg border-2 border-slate-900 disabled:opacity-30 hover:bg-white transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-black text-sm uppercase tracking-widest px-4">
                        {currentPageIndex + 1} / {pages.length}
                    </span>
                    <button 
                        disabled={currentPageIndex === pages.length - 1}
                        onClick={() => setCurrentPageIndex(currentPageIndex + 1)}
                        className="p-2 bg-slate-100 rounded-lg border-2 border-slate-900 disabled:opacity-30 hover:bg-white transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
                
                <button className="bg-accent text-white px-6 py-2 rounded-xl border-4 border-slate-900 font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#0f172a] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all">
                    Export
                </button>
            </div>
        </div>
    );
};
