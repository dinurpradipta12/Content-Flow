import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Download, Palette, Type, Image as ImageIcon, Layers } from 'lucide-react';

export const CarouselMaker: React.FC = () => {
    const [bgColor, setBgColor] = useState('#8B5CF6');
    const [title, setTitle] = useState('Judul Konten Disini');
    const [content, setContent] = useState('Isi konten carousel kamu disini. Tulis sesuatu yang menarik.');

    const handleDownload = () => {
        alert("Fitur download ZIP akan segera tersedia! (Mock Download)");
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
            {/* Editor Sidebar */}
            <Card className="w-full md:w-1/3 flex flex-col gap-6 overflow-y-auto h-full" title="Editor">
                <div className="space-y-4">
                    <h4 className="font-bold flex items-center gap-2"><Palette size={18}/> Background</h4>
                    <div className="grid grid-cols-5 gap-2">
                        {['#8B5CF6', '#F472B6', '#FBBF24', '#34D399', '#1E293B'].map(color => (
                            <button 
                                key={color}
                                className={`w-8 h-8 rounded-full border-2 border-white shadow-md transition-transform hover:scale-110 ${bgColor === color ? 'ring-2 ring-slate-800' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => setBgColor(color)}
                            />
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="font-bold flex items-center gap-2"><Type size={18}/> Teks</h4>
                    <Input label="Judul Slide" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <Textarea label="Isi Konten" value={content} onChange={(e) => setContent(e.target.value)} />
                </div>

                <div className="space-y-4">
                     <h4 className="font-bold flex items-center gap-2"><Layers size={18}/> Referensi Desain</h4>
                     <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-transparent hover:border-slate-400 cursor-pointer transition-colors">
                        <ImageIcon className="mx-auto text-slate-400 mb-2" />
                        <p className="text-xs text-slate-500">Upload referensi (JPG/PNG)</p>
                     </div>
                </div>

                <div className="mt-auto pt-4">
                    <Button onClick={handleDownload} className="w-full" icon={<Download size={18}/>}>
                        Download .ZIP
                    </Button>
                </div>
            </Card>

            {/* Preview Area */}
            <div className="flex-1 bg-slate-200 rounded-xl border-2 border-slate-300 p-8 flex items-center justify-center overflow-hidden relative">
                 <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                 
                 {/* Canvas 4:5 Aspect Ratio */}
                 <div 
                    className="aspect-[4/5] h-[90%] bg-white shadow-2xl rounded-lg border-2 border-slate-800 relative overflow-hidden transition-colors duration-300"
                    style={{ backgroundColor: bgColor }}
                 >
                    {/* Decorative Elements based on style */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-bl-full"></div>
                    <div className="absolute bottom-10 left-[-20px] w-20 h-20 bg-black/10 rounded-full"></div>

                    <div className="p-8 h-full flex flex-col relative z-10 text-white">
                        <h2 className="text-4xl font-black font-heading leading-tight mb-6 drop-shadow-md">
                            {title}
                        </h2>
                        <div className="flex-1 bg-white/90 text-slate-800 p-6 rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm border-2 border-slate-800 shadow-hard">
                             <p className="text-lg font-medium leading-relaxed">{content}</p>
                        </div>
                        <div className="mt-6 flex justify-between items-center opacity-80">
                            <span className="text-sm font-bold">@arunika.flow</span>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                                <div className="w-2 h-2 rounded-full bg-white/50"></div>
                                <div className="w-2 h-2 rounded-full bg-white/50"></div>
                            </div>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    );
};