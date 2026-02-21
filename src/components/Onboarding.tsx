import React, { useState, useRef } from 'react';
import { Upload, Sparkles, Loader2 } from 'lucide-react';
import { useCarouselStore } from '../store/useCarouselStore';

export const Onboarding: React.FC = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const setIsOnboarding = useCarouselStore((state) => state.setIsOnboarding);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        
        setIsUploading(true);
        let p = 0;
        const interval = setInterval(() => {
            p += 5;
            setProgress(p);
            if (p >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    setIsOnboarding(false);
                }, 500);
            }
        }, 100);
    };

    return (
        <div className="flex-1 bg-slate-50 flex items-center justify-center p-6 min-h-[600px]">
            <div className="max-w-2xl w-full">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-accent rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] mb-6">
                        <Sparkles size={40} className="text-white" />
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tight mb-4 leading-none">
                        Arunika Carousel Dev
                    </h1>
                    <p className="text-xl font-bold text-slate-500">
                        Upload referensi desain, biarkan AI kami bekerja untuk Anda.
                    </p>
                </div>

                {!isUploading ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white border-8 border-dashed border-slate-300 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-yellow-50 transition-all group shadow-[12px_12px_0px_0px_#0f172a]"
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleUpload}
                            accept="image/*"
                        />
                        <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border-4 border-slate-900">
                            <Upload size={32} className="text-slate-400 group-hover:text-accent" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase mb-2">Upload Referensi Desain</h3>
                        <p className="text-slate-500 font-bold">Klik untuk memilih file gambar (JPG/PNG)</p>
                    </div>
                ) : (
                    <div className="bg-white border-8 border-slate-900 rounded-3xl p-12 shadow-[12px_12px_0px_0px_#0f172a]">
                        <div className="flex items-center gap-4 mb-8">
                            <Loader2 className="animate-spin text-accent" size={32} />
                            <h3 className="text-2xl font-black text-slate-900 uppercase">AI Sedang Menganalisis...</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="w-full bg-slate-100 h-8 rounded-full border-4 border-slate-900 overflow-hidden">
                                <div 
                                    className="h-full bg-accent transition-all duration-300" 
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={`flex items-center gap-3 font-bold transition-opacity ${progress > 20 ? 'opacity-100' : 'opacity-30'}`}>
                                    <div className="w-6 h-6 rounded-full bg-green-400 border-2 border-slate-900" />
                                    Mengekstrak Layout...
                                </div>
                                <div className={`flex items-center gap-3 font-bold transition-opacity ${progress > 40 ? 'opacity-100' : 'opacity-30'}`}>
                                    <div className="w-6 h-6 rounded-full bg-green-400 border-2 border-slate-900" />
                                    Mengidentifikasi Font...
                                </div>
                                <div className={`flex items-center gap-3 font-bold transition-opacity ${progress > 60 ? 'opacity-100' : 'opacity-30'}`}>
                                    <div className="w-6 h-6 rounded-full bg-green-400 border-2 border-slate-900" />
                                    Menyiapkan Palet Warna...
                                </div>
                                <div className={`flex items-center gap-3 font-bold transition-opacity ${progress > 80 ? 'opacity-100' : 'opacity-30'}`}>
                                    <div className="w-6 h-6 rounded-full bg-green-400 border-2 border-slate-900" />
                                    Membuat Canvas Editable...
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
