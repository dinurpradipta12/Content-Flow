import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, BarChart, ExternalLink, RefreshCw } from 'lucide-react';
import { analyzeContentPerformance } from '../services/geminiService';

export const Analysis: React.FC = () => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [mockMetrics, setMockMetrics] = useState<any>(null);

    const handleAnalyze = async () => {
        if (!url) return;
        setLoading(true);
        setAnalysis(null);
        setMockMetrics(null);

        // Simulate scraping delay
        setTimeout(async () => {
            // Mock Scraped Data
            const scrapedData = {
                likes: Math.floor(Math.random() * 5000) + 500,
                comments: Math.floor(Math.random() * 200) + 20,
                shares: Math.floor(Math.random() * 1000) + 50,
                saves: Math.floor(Math.random() * 800) + 100,
                reach: Math.floor(Math.random() * 50000) + 10000,
            };
            setMockMetrics(scrapedData);

            // Call AI
            const result = await analyzeContentPerformance(scrapedData, url);
            setAnalysis(result);
            setLoading(false);
        }, 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
             <div className="text-center space-y-4">
                <div className="inline-block bg-accent p-3 rounded-full border-2 border-slate-800 shadow-hard mb-2">
                    <BarChart className="text-white" size={32} />
                </div>
                <h2 className="text-4xl font-extrabold font-heading">Analisa Konten</h2>
                <p className="text-slate-600 max-w-lg mx-auto">
                    Masukkan link konten (Instagram/TikTok) kamu. AI akan melakukan scraping data dan memberikan evaluasi mendalam.
                </p>
            </div>

            <Card className="p-8">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <Input 
                            label="URL Konten" 
                            placeholder="https://instagram.com/p/..." 
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                    </div>
                    <Button 
                        onClick={handleAnalyze} 
                        disabled={loading || !url}
                        icon={loading ? <RefreshCw className="animate-spin" size={18}/> : <Search size={18}/>}
                        className="w-full md:w-auto"
                    >
                        {loading ? 'Analyzing...' : 'Analyze Now'}
                    </Button>
                </div>
            </Card>

            {mockMetrics && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-bounce-in">
                    {Object.entries(mockMetrics).map(([key, value]) => (
                        <div key={key} className="bg-white p-4 rounded-xl border-2 border-slate-200 text-center shadow-sm">
                            <p className="text-xs font-bold text-slate-400 mb-1 capitalize">{key}</p>
                            <p className="text-2xl font-black text-slate-800">{(value as number).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            )}

            {analysis && (
                <Card title="Hasil Analisa AI" headerColor="violet" className="animate-bounce-in">
                    <div className="prose prose-slate max-w-none whitespace-pre-line">
                        {analysis}
                    </div>
                    <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
                        <Button variant="secondary" size="sm" icon={<ExternalLink size={16}/>}>
                            Lihat Postingan Asli
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
};