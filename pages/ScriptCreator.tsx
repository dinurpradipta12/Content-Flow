import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { Sparkles, Copy, Check } from 'lucide-react';
import { generateScript } from '../services/geminiService';
import { Platform } from '../types';

export const ScriptCreator: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [platform, setPlatform] = useState<string>(Platform.INSTAGRAM);
    const [contentType, setContentType] = useState('Reels');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        if (!topic) return;
        setLoading(true);
        setResult('');
        const script = await generateScript(topic, platform, contentType);
        setResult(script);
        setLoading(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-extrabold font-heading text-slate-800">Script Creator</h2>
                    <p className="text-slate-500">Buat script konten viral dalam hitungan detik dengan AI.</p>
                </div>
                
                <Card className="space-y-4">
                    <Input 
                        label="Topik Bahasan" 
                        placeholder="Contoh: Tips produktivitas untuk mahasiswa" 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Select 
                            label="Platform"
                            value={platform}
                            onChange={(e) => setPlatform(e.target.value)}
                            options={[
                                { label: 'Instagram', value: Platform.INSTAGRAM },
                                { label: 'TikTok', value: Platform.TIKTOK },
                                { label: 'Threads', value: Platform.THREADS },
                                { label: 'LinkedIn', value: Platform.LINKEDIN },
                            ]}
                        />
                         <Select 
                            label="Jenis Konten"
                            value={contentType}
                            onChange={(e) => setContentType(e.target.value)}
                            options={[
                                { label: 'Reels / Short Video', value: 'Reels' },
                                { label: 'Carousel', value: 'Carousel' },
                                { label: 'Single Image', value: 'Single Image' },
                                { label: 'Caption Only', value: 'Caption' },
                            ]}
                        />
                    </div>

                    <Button 
                        className="w-full mt-4" 
                        onClick={handleGenerate} 
                        disabled={loading || !topic}
                        icon={loading ? <Sparkles className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                    >
                        {loading ? 'Sedang Berpikir...' : 'Buat Script Ajaib'}
                    </Button>
                </Card>
            </div>

            <div className="relative">
                {result ? (
                    <Card title="Hasil Script" headerColor="green" className="h-full animate-bounce-in flex flex-col">
                        <div className="bg-slate-50 p-4 rounded-lg border-2 border-slate-200 flex-1 overflow-auto max-h-[500px]">
                            <p className="whitespace-pre-line text-slate-700 font-medium font-sans">
                                {result}
                            </p>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button variant="secondary" size="sm" onClick={handleCopy} icon={copied ? <Check size={16}/> : <Copy size={16}/>}>
                                {copied ? 'Tersalin' : 'Salin Text'}
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <div className="h-full min-h-[400px] border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                        <Sparkles size={48} className="mb-4 text-slate-300" />
                        <p>Hasil script akan muncul di sini.</p>
                    </div>
                )}
            </div>
        </div>
    );
};