import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { 
    Filter, 
    Trash2, 
    ExternalLink, 
    Instagram, 
    Calendar, 
    TrendingUp, 
    Eye, 
    MessageCircle, 
    Share2, 
    RefreshCw,
    Loader2,
    Zap,
    Globe,
    X,
    AlertCircle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    FileText,
    Bookmark
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ContentItem, Platform } from '../types';
import { analyzeContentLink } from '../services/scraperService';

export const ContentDataInsight: React.FC = () => {
    const [data, setData] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    
    // Filters State
    const [filterPlatform, setFilterPlatform] = useState<string>('all');
    const [filterAccount, setFilterAccount] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    
    const [accounts, setAccounts] = useState<string[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: wsData } = await supabase.from('workspaces').select('account_name');
            if (wsData) {
                const uniqueAccounts = Array.from(new Set(
                    wsData.map((w: any) => w.account_name).filter((n: string) => n && n.trim() !== '')
                ));
                setAccounts(uniqueAccounts as string[]);
            }

            const { data: items, error } = await supabase
                .from('content_items')
                .select(`*, workspaces (name, account_name)`)
                .eq('status', 'Published')
                .order('date', { ascending: false });

            if (error) throw error;

            if (items) {
                const formattedItems = items.map((item: any) => ({
                    ...item,
                    contentLink: item.content_link,
                    workspaces: item.workspaces
                }));
                setData(formattedItems);
            }
        } catch (err) {
            console.error("Error fetching insights:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAnalyze = async (e: React.MouseEvent, id: string, url: string) => {
        e.stopPropagation(); // Prevent row toggle
        if (!url) {
            alert("Link postingan tidak tersedia. Harap input link di detail konten.");
            return;
        }
        setAnalyzingId(id);
        
        try {
            // Use the new Scraper Service
            const metrics = await analyzeContentLink(url);
            
            const timestamp = new Date().toISOString();
            const metricsData = { ...metrics, lastUpdated: timestamp };

            const { error } = await supabase
                .from('content_items')
                .update({ metrics: metricsData })
                .eq('id', id);

            if (error) throw error;

            setData(prev => prev.map(item => 
                item.id === id ? { ...item, metrics: metricsData as any } : item
            ));
            
            // Auto expand to show results
            setExpandedRowId(id);

        } catch (err: any) {
            console.error("Analysis failed:", err);
            const errorMessage = err.message || "Terjadi kesalahan yang tidak diketahui";
            // Show user-friendly error message with helpful tips
            alert(`Gagal menganalisa konten:\n\n${errorMessage}\n\nTip: Jika Anda menggunakan RapidAPI, pastikan:\n- API key sudah diatur di .env\n- Anda memiliki subscription untuk API\n- Link konten valid`);
        } finally {
            setAnalyzingId(null);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Hapus konten ini dari database?")) return;

        try {
            const { error } = await supabase.from('content_items').delete().eq('id', id);
            if (error) throw error;
            setData(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            alert("Gagal menghapus data.");
        }
    };

    const resetFilters = () => {
        setFilterPlatform('all');
        setFilterAccount('all');
        setStartDate('');
        setEndDate('');
    };

    const toggleRow = (id: string) => {
        setExpandedRowId(expandedRowId === id ? null : id);
    };

    const filteredData = data.filter(item => {
        const matchPlatform = filterPlatform === 'all' || item.platform === filterPlatform;
        const matchAccount = filterAccount === 'all' || item.workspaces?.account_name === filterAccount;
        let matchPeriod = true;
        if (item.date) {
            if (startDate && item.date < startDate) matchPeriod = false;
            if (endDate && item.date > endDate) matchPeriod = false;
        }
        return matchPlatform && matchAccount && matchPeriod;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
                <div>
                    <h2 className="text-4xl font-extrabold text-slate-800 font-heading tracking-tight flex items-center gap-3">
                        Content Data Insight
                    </h2>
                    <p className="text-slate-500 font-medium mt-2">
                        Analisa performa konten published dari seluruh database.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-slate-800 shadow-hard overflow-hidden flex flex-col min-h-[600px]">
                {/* Toolbar */}
                <div className="bg-slate-50 border-b-2 border-slate-200 p-3 flex flex-col xl:flex-row gap-3 items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-500 font-bold text-xs">
                            <Filter size={14} /> 
                            <span className="hidden sm:inline">Filter:</span>
                        </div>
                        <div className="w-36 md:w-40">
                            <Select 
                                value={filterPlatform}
                                onChange={(e) => setFilterPlatform(e.target.value)}
                                options={[
                                    { label: 'Semua Platform', value: 'all' },
                                    { label: 'Instagram', value: Platform.INSTAGRAM },
                                    { label: 'TikTok', value: Platform.TIKTOK },
                                    { label: 'LinkedIn', value: Platform.LINKEDIN },
                                    { label: 'YouTube', value: Platform.YOUTUBE },
                                    { label: 'Facebook', value: Platform.FACEBOOK },
                                ]}
                                className="!py-2 !text-xs !bg-white !border-slate-300 h-9"
                            />
                        </div>
                        <div className="w-36 md:w-40">
                            <Select 
                                value={filterAccount}
                                onChange={(e) => setFilterAccount(e.target.value)}
                                options={[{ label: 'Semua Akun', value: 'all' }, ...accounts.map(acc => ({ label: acc, value: acc }))]}
                                className="!py-2 !text-xs !bg-white !border-slate-300 h-9"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-2 h-9">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Periode</span>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs font-bold text-slate-700 outline-none bg-transparent w-24"/>
                            <span className="text-slate-300">-</span>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs font-bold text-slate-700 outline-none bg-transparent w-24"/>
                        </div>
                        {(filterPlatform !== 'all' || filterAccount !== 'all' || startDate || endDate) && (
                            <button onClick={resetFilters} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex-shrink-0 w-full xl:w-auto flex justify-end">
                        <Button variant="secondary" size="sm" onClick={fetchData} icon={<RefreshCw size={14}/>} className="h-9 text-xs">Refresh Data</Button>
                    </div>
                </div>

                {/* Data Table */}
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white border-b-2 border-slate-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 w-10"></th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap bg-white">Tanggal</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[200px] bg-white">Konten</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap bg-white">Platform & Akun</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center bg-white min-w-[280px]">Metrics Summary</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right bg-white">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="animate-spin text-accent" size={32} />
                                            <span>Mengambil data...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-400 italic bg-slate-50/50">
                                        Tidak ada konten published yang ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <React.Fragment key={item.id}>
                                        <tr 
                                            className={`transition-colors cursor-pointer ${expandedRowId === item.id ? 'bg-purple-50' : 'hover:bg-slate-50'}`}
                                            onClick={() => toggleRow(item.id)}
                                        >
                                            <td className="p-4 text-center">
                                                {expandedRowId === item.id ? <ChevronUp size={16} className="text-accent" /> : <ChevronDown size={16} className="text-slate-400" />}
                                            </td>
                                            <td className="p-4 align-middle">
                                                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                                    <Calendar size={16} className="text-slate-400"/>
                                                    {item.date ? new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle max-w-xs">
                                                <p className="font-bold text-slate-800 text-sm line-clamp-1 mb-1" title={item.title}>{item.title}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-bold uppercase">{item.type}</span>
                                                    {item.contentLink && (
                                                        <a href={item.contentLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 font-bold bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100">
                                                            Link <ExternalLink size={10} />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        {item.platform === Platform.INSTAGRAM ? <div className="text-pink-600 bg-pink-50 p-1 rounded"><Instagram size={14}/></div> : 
                                                         item.platform === Platform.TIKTOK ? <div className="text-black bg-slate-100 p-1 rounded"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg></div> :
                                                         <div className="text-slate-600 bg-slate-100 p-1 rounded"><Globe size={14}/></div>}
                                                        <span className="text-sm font-bold text-slate-700">{item.platform}</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-500 pl-7">@{item.workspaces?.account_name || 'unknown'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle">
                                                {item.metrics ? (
                                                    <div className="grid grid-cols-4 gap-2 text-center w-full max-w-[280px]">
                                                        <div><span className="block text-[10px] text-slate-400 font-bold uppercase">Views</span><span className="text-xs font-black text-slate-800">{item.metrics.views.toLocaleString()}</span></div>
                                                        <div><span className="block text-[10px] text-slate-400 font-bold uppercase">Likes</span><span className="text-xs font-black text-slate-800">{item.metrics.likes.toLocaleString()}</span></div>
                                                        <div><span className="block text-[10px] text-slate-400 font-bold uppercase">Comm</span><span className="text-xs font-black text-slate-800">{item.metrics.comments.toLocaleString()}</span></div>
                                                        <div><span className="block text-[10px] text-slate-400 font-bold uppercase">Share</span><span className="text-xs font-black text-slate-800">{item.metrics.shares.toLocaleString()}</span></div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center"><span className="text-xs text-slate-400 italic">No Data</span></div>
                                                )}
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        className={`h-8 text-xs ${item.metrics ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-slate-800 text-white'}`}
                                                        onClick={(e) => handleAnalyze(e, item.id, item.contentLink || '')}
                                                        disabled={analyzingId === item.id || !item.contentLink}
                                                        icon={analyzingId === item.id ? <Loader2 size={12} className="animate-spin"/> : <Zap size={12}/>}
                                                    >
                                                        {analyzingId === item.id ? '...' : item.metrics ? 'Update' : 'Analyze'}
                                                    </Button>
                                                    <button onClick={(e) => handleDelete(e, item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* EXPANDED ROW DETAIL */}
                                        {expandedRowId === item.id && (
                                            <tr className="bg-purple-50/30 animate-in slide-in-from-top-2 duration-200">
                                                <td colSpan={6} className="p-6 border-b-2 border-slate-100">
                                                    <div className="flex flex-col lg:flex-row gap-6">
                                                        {/* Left: Detailed Metrics */}
                                                        <div className="flex-1 space-y-4">
                                                            <h4 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={18} className="text-accent"/> Detailed Metrics</h4>
                                                            {item.metrics ? (
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <span className="text-xs font-bold text-slate-400 uppercase">Engagement Rate</span>
                                                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Good</span>
                                                                        </div>
                                                                        <p className="text-2xl font-black text-slate-800">
                                                                            {((item.metrics.likes + item.metrics.comments) / (item.metrics.views || 1) * 100).toFixed(2)}%
                                                                        </p>
                                                                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2"><div className="bg-green-500 h-1.5 rounded-full" style={{width: '65%'}}></div></div>
                                                                    </div>
                                                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <span className="text-xs font-bold text-slate-400 uppercase">Total Interactions</span>
                                                                        </div>
                                                                        <p className="text-2xl font-black text-slate-800">
                                                                            {(item.metrics.likes + item.metrics.comments + item.metrics.shares + (item.metrics.saves || 0)).toLocaleString()}
                                                                        </p>
                                                                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2"><div className="bg-accent h-1.5 rounded-full" style={{width: '40%'}}></div></div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="bg-slate-100 p-6 rounded-xl text-center text-slate-400 italic text-sm">Belum ada data detail. Klik tombol Analyze.</div>
                                                            )}
                                                        </div>

                                                        {/* Right: Content Preview & Caption */}
                                                        <div className="flex-1 bg-white p-5 rounded-xl border-2 border-slate-200 shadow-sm relative">
                                                            <div className="absolute top-0 right-0 bg-yellow-400 text-slate-900 text-[10px] font-black px-2 py-1 rounded-bl-lg border-l border-b border-slate-800">CONTENT PREVIEW</div>
                                                            <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><FileText size={18} className="text-slate-400"/> Caption & Hashtags</h4>
                                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-600 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                                                                {(item.metrics as any)?.caption ? (
                                                                    <p className="whitespace-pre-wrap">{(item.metrics as any).caption}</p>
                                                                ) : (
                                                                    <p className="italic text-slate-400">Caption tidak tersedia atau belum discraping.</p>
                                                                )}
                                                            </div>
                                                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Bookmark size={14} className="text-slate-400"/> 
                                                                    <span className="text-xs font-bold text-slate-500">{(item.metrics as any)?.saves || 0} Saves</span>
                                                                </div>
                                                                <span className="text-[10px] text-slate-300 font-mono">ID: {item.id.substring(0,8)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
