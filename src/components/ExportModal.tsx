import React, { useState } from 'react';
import { useCarouselStore } from '../store/useCarouselStore';
import { X, Check, Download } from 'lucide-react';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (selectedPages: number[], format: 'png' | 'jpeg', quality: number) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
    const { pages } = useCarouselStore();
    const [selectedPages, setSelectedPages] = useState<number[]>(pages.map((_, i) => i));
    const [format, setFormat] = useState<'png' | 'jpeg'>('png');
    const [quality, setQuality] = useState<number>(1); // 1 = High Quality (HD)

    if (!isOpen) return null;

    const togglePage = (index: number) => {
        if (selectedPages.includes(index)) {
            setSelectedPages(selectedPages.filter(i => i !== index));
        } else {
            setSelectedPages([...selectedPages, index].sort((a, b) => a - b));
        }
    };

    const handleExport = () => {
        onExport(selectedPages, format, quality);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white border-4 border-slate-900 rounded-2xl shadow-[8px_8px_0px_0px_#0f172a] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b-4 border-slate-900 bg-slate-50">
                    <h2 className="font-black text-xl uppercase tracking-tight">Export Carousel</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Page Selection */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="font-bold text-sm text-slate-600 uppercase tracking-wider">Select Pages</label>
                            <button 
                                onClick={() => setSelectedPages(selectedPages.length === pages.length ? [] : pages.map((_, i) => i))}
                                className="text-xs font-bold text-accent hover:underline"
                            >
                                {selectedPages.length === pages.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                            {pages.map((page, index) => (
                                <button
                                    key={page.id}
                                    onClick={() => togglePage(index)}
                                    className={`aspect-[4/5] rounded-lg border-2 flex items-center justify-center text-sm font-black transition-all ${
                                        selectedPages.includes(index) 
                                            ? 'bg-accent text-white border-slate-900 shadow-sm scale-100' 
                                            : 'bg-slate-100 text-slate-400 border-transparent hover:bg-slate-200 scale-95'
                                    }`}
                                    style={{ backgroundColor: selectedPages.includes(index) ? undefined : page.background }}
                                >
                                    {selectedPages.includes(index) && <Check size={16} />}
                                    {!selectedPages.includes(index) && (index + 1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Format Selection */}
                    <div className="space-y-2">
                        <label className="font-bold text-sm text-slate-600 uppercase tracking-wider">Format</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setFormat('png')}
                                className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${
                                    format === 'png' 
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_0px_#f27d26]' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                PNG (Lossless)
                            </button>
                            <button 
                                onClick={() => setFormat('jpeg')}
                                className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${
                                    format === 'jpeg' 
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_0px_#f27d26]' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                JPG (Compressed)
                            </button>
                        </div>
                    </div>

                    {/* Quality Selection */}
                    <div className="space-y-2">
                        <label className="font-bold text-sm text-slate-600 uppercase tracking-wider">Quality</label>
                        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border-2 border-slate-200">
                            <input 
                                type="range" 
                                min="0.5" 
                                max="3" 
                                step="0.5" 
                                value={quality}
                                onChange={(e) => setQuality(parseFloat(e.target.value))}
                                className="w-full accent-slate-900"
                            />
                            <span className="font-mono font-bold text-xs bg-white px-2 py-1 rounded border border-slate-200 min-w-[3rem] text-center">
                                {quality}x
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                            {quality === 1 ? 'Standard (HD)' : quality > 1 ? 'Ultra Sharp (2x/3x)' : 'Draft (Low Res)'}
                        </p>
                    </div>

                    <button 
                        onClick={handleExport}
                        disabled={selectedPages.length === 0}
                        className="w-full bg-accent text-white py-4 rounded-xl border-2 border-slate-900 font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#0f172a] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Download size={20} /> Export {selectedPages.length} Pages
                    </button>
                </div>
            </div>
        </div>
    );
};
