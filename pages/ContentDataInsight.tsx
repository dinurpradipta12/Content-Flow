import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Select, Input } from '../components/ui/Input'; // Import Input component
import { Modal } from '../components/ui/Modal'; // Import Modal
import { 
    Filter, 
    Trash2, 
    Instagram, 
    Calendar, 
    TrendingUp, 
    RefreshCw,
    Loader2,
    Zap,
    Globe,
    X,
    ChevronDown,
    ChevronUp,
    FileText,
    Bookmark,
    Link as LinkIcon,
    Edit3, // Icon for Manual Input
    Save, // Icon for Save
    Share2,
    MessageSquare,
    Heart,
    Eye,
    BarChart2
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

    // --- MANUAL INPUT STATE ---
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [selectedItemForInput, setSelectedItemForInput] = useState<ContentItem | null>(null);
    const [manualMetrics, setManualMetrics] = useState({
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        reach: 0
    });

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

    // --- HANDLERS ---

    const handleAnalyze = async (e: React.MouseEvent, id: string, url: string) => {
        e.stopPropagation();
        if (!url) {
            alert("Link postingan tidak tersedia. Harap input link di halaman Detail Konten terlebih dahulu.");
            return;
        }
        setAnalyzingId(id);
        try {
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
            setExpandedRowId(id);
        } catch (err: any) {
            console.error("Analysis failed:", err);
            alert(`Gagal menganalisa konten: ${err.message}`);
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

    // --- MANUAL INPUT HANDLERS ---

    const openManualInput = (e: React.MouseEvent, item: ContentItem) => {
        e.stopPropagation();
        setSelectedItemForInput(item);
        setManualMetrics({
            views: item.metrics?.views || 0,
            likes: item.metrics?.likes || 0,
            comments: item.metrics?.comments || 0,
            shares: item.metrics?.shares || 0,
            saves: item.metrics?.saves || 0,
            reach: (item.metrics as any)?.reach || 0 // Handle custom reach field
        });
        setIsManualModalOpen(true);
    };

    const saveManualMetrics = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemForInput) return;

        try {
            const timestamp = new Date().toISOString();
            // Preserve existing metrics data (like caption/username) but overwrite numbers
            const existingMetrics = selectedItemForInput.metrics || {};
            
            const updatedMetrics = {
                ...existingMetrics,
                ...manualMetrics,
                lastUpdated: timestamp,
                isManual: true // Flag to indicate manual entry
            };

            const { error } = await supabase
                .from('content_items')
                .update({ metrics: updatedMetrics })
                .eq('id', selectedItemForInput.id);

            if (error) throw error;

            setData(prev => prev.map(item => 
                item.id === selectedItemForInput.id ? { ...item, metrics: updatedMetrics as any } : item
            ));
            
            setIsManualModalOpen(false);
            setExpandedRowId(selectedItemForInput.id); // Auto expand to show result

        } catch (err) {
            console.error(err);
            alert("Gagal menyimpan data manual.");
        }
    };

    const toggleRow = (id: string) => {
        setExpandedRowId(expandedRowId === id ? null : id);
    };

    const resetFilters = () => {
        setFilterPlatform('all');
        setFilterAccount('all');
        setStartDate('');
        setEndDate('');
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

    // Helper for Total Interactions Formula
    const calculateInteractions = (m: any) => {
        if (!m) return 0;
        return (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0);
    };

    // Helper for ER Formula
    const calculateER = (m: any) => {
        if (!m || !m.views) return 0;
        const interactions = calculateInteractions(m);
        return (interactions / m.views) * 100;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
                <div>
                    <h2 className="text-4xl font-extrabold text-slate-800 font-heading tracking-tight flex items-center gap-3">
                        Content Data Insight
                    </h2>
                    <p className="text-slate-500 font-medium mt-2">
                        Analisa real-time atau input manual metrics untuk perhitungan ER yang presisi.
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
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap bg-white">Link Postingan</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center bg-white min-w-[280px]">Quick Metrics</th>
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
                                                    <div className="flex items-center gap-1 text-slate-500">
                                                        {item.platform === Platform.INSTAGRAM ? <Instagram size={12}/> : <Globe size={12}/>}
                                                        <span className="text-[10px] font-bold">@{item.workspaces?.account_name || '-'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            <td className="p-4 align-middle">
                                                {item.contentLink ? (
                                                     <a 
                                                        href={item.contentLink} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        onClick={e => e.stopPropagation()} 
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100"
                                                    >
                                                        <LinkIcon size={12} /> Link Tersedia
                                                    </a>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                                        <LinkIcon size={12} /> Kosong
                                                    </span>
                                                )}
                                            </td>

                                            <td className="p-4 align-middle">
                                                {item.metrics ? (
                                                    <div className={`grid gap-2 text-center w-full ${item.platform === Platform.INSTAGRAM ? 'grid-cols-6 max-w-[400px]' : 'grid-cols-5 max-w-[350px]'}`}>
                                                        {item.platform === Platform.INSTAGRAM && (
                                                            <div><span className="block text-[10px] text-slate-400 font-bold uppercase">Reach</span><span className="text-xs font-black text-slate-800">{(item.metrics as any).reach?.toLocaleString() || 0}</span></div>
                                                        )}
                                                        <div><span className="block text-[10px] text-slate-400 font-bold uppercase">Views</span><span className="text-xs font-black text-slate-800">{item.metrics.views.toLocaleString()}</span></div>
                                                        <div><span className="block text-[10px] text-slate-400 font-bold uppercase">Likes</span><span className="text-xs font-black text-slate-800">{item.metrics.likes.toLocaleString()}</span></div>
                                                        <div><span className="block text-[10px] text-slate-400 font-bold uppercase">Comm</span><span className="text-xs font-black text-slate-800">{item.metrics.comments.toLocaleString()}</span></div>
                                                        <div><span className="block text-[10px] text-slate-400 font-bold uppercase">Share</span><span className="text-xs font-black text-slate-800">{item.metrics.shares.toLocaleString()}</span></div>
                                                        <div><span className="block text-[10px] text-slate-400 font-bold uppercase">Save</span><span className="text-xs font-black text-slate-800">{(item.metrics.saves || 0).toLocaleString()}</span></div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center"><span className="text-xs text-slate-400 italic">Belum dianalisa</span></div>
                                                )}
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* TOMBOL INPUT MANUAL */}
                                                    <Button
                                                        size="sm"
                                                        className="h-8 px-3 text-xs font-bold rounded-lg border-2 border-pink-200 bg-pink-50 text-pink-600 hover:bg-pink-100 hover:border-pink-300 shadow-sm"
                                                        onClick={(e) => openManualInput(e, item)}
                                                        title="Input Metrics Manual"
                                                    >
                                                        <Edit3 size={14} className="mr-1.5" /> Input Metrics
                                                    </Button>

                                                    <button onClick={(e) => handleDelete(e, item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
                                                        {/* Left: Detailed Metrics with NEW FORMULA */}
                                                        <div className="flex-1 space-y-4">
                                                            <div className="flex justify-between items-center">
                                                                <h4 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={18} className="text-accent"/> Detailed Metrics</h4>
                                                                {(item.metrics as any)?.isManual && (
                                                                    <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-bold border border-pink-200">
                                                                        Data Manual
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {item.metrics ? (
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                                        <div className="absolute top-0 right-0 p-1">
                                                                            <TrendingUp size={64} className="text-slate-50 opacity-50 -rotate-12"/>
                                                                        </div>
                                                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                                                            <span className="text-xs font-bold text-slate-400 uppercase">Engagement Rate (ER)</span>
                                                                        </div>
                                                                        <p className="text-3xl font-black text-slate-800 relative z-10">
                                                                            {calculateER(item.metrics).toFixed(2)}%
                                                                        </p>
                                                                        <p className="text-[10px] text-slate-400 mt-1 relative z-10 font-medium">
                                                                            (Interaksi / Views) x 100%
                                                                        </p>
                                                                    </div>
                                                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                                        <div className="absolute top-0 right-0 p-1">
                                                                            <Zap size={64} className="text-slate-50 opacity-50 -rotate-12"/>
                                                                        </div>
                                                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                                                            <span className="text-xs font-bold text-slate-400 uppercase">Total Interaksi</span>
                                                                        </div>
                                                                        <p className="text-3xl font-black text-slate-800 relative z-10">
                                                                            {calculateInteractions(item.metrics).toLocaleString()}
                                                                        </p>
                                                                        <p className="text-[10px] text-slate-400 mt-1 relative z-10 font-medium">
                                                                            Like + Comment + Share + Save
                                                                        </p>
                                                                    </div>
                                                                    {/* Additional Stats Display */}
                                                                    {(item.metrics as any).reach > 0 && (
                                                                        <div className="col-span-2 bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                                                                            <span className="text-xs font-bold text-blue-500 uppercase">Total Reach</span>
                                                                            <span className="font-black text-blue-900">{(item.metrics as any).reach.toLocaleString()}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="bg-slate-100 p-6 rounded-xl text-center text-slate-400 italic text-sm">Belum ada data detail. Klik tombol Analyze atau Input Manual.</div>
                                                            )}
                                                        </div>

                                                        {/* Right: Content Details & Insights (REPLACED CAPTION) */}
                                                        <div className="flex-1 bg-white p-5 rounded-xl border-2 border-slate-200 shadow-sm relative">
                                                            <div className="absolute top-0 right-0 bg-yellow-400 text-slate-900 text-[10px] font-black px-2 py-1 rounded-bl-lg border-l border-b border-slate-800">CONTENT DETAILS</div>
                                                            <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><FileText size={18} className="text-slate-400"/> Insight & Details</h4>
                                                            
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                                        <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pillar Konten</span>
                                                                        <span className="font-bold text-slate-700 text-sm">{item.pillar || '-'}</span>
                                                                    </div>
                                                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                                        <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">PIC / Creator</span>
                                                                        <span className="font-bold text-slate-700 text-sm">{item.pic || item.assignee || '-'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                                                <div className="flex items-center gap-1">
                                                                     <span className="text-[10px] text-slate-300 font-mono">Last updated: {item.metrics?.lastUpdated ? new Date(item.metrics.lastUpdated).toLocaleTimeString() : '-'}</span>
                                                                </div>
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

            {/* MODAL INPUT MANUAL */}
            {isManualModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-lg flex flex-col animate-bounce-in shadow-hard rounded-xl bg-white border-2 border-slate-800 overflow-hidden">
                        
                        {/* Header Pop Art */}
                        <div className="px-6 py-4 border-b-2 border-slate-800 bg-pink-500 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full -z-0"></div>
                            <h3 className="font-bold font-heading text-lg tracking-tight flex items-center gap-2 z-10">
                                <Edit3 size={20} /> Input Metrics Manual
                            </h3>
                            <button 
                                onClick={() => setIsManualModalOpen(false)}
                                className="bg-black/20 hover:bg-black/30 text-white p-1.5 rounded-lg transition-all z-10"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={saveManualMetrics} className="p-6 space-y-5 bg-[#FFFDF5]">
                            <div className="p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg text-xs text-yellow-800 font-bold mb-2 flex gap-2 items-center">
                                <Zap size={14} /> Update data secara manual untuk hasil yang presisi.
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Conditional Field: Reach (Only IG) */}
                                {selectedItemForInput?.platform === Platform.INSTAGRAM && (
                                    <div className="col-span-2">
                                        <div className="flex flex-col gap-1 w-full">
                                            <label className="font-bold text-xs text-slate-600 ml-1 flex items-center gap-1"><BarChart2 size={12}/> Reach / Jangkauan</label>
                                            <input 
                                                type="number" 
                                                className="bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                                value={manualMetrics.reach}
                                                onChange={(e) => setManualMetrics({...manualMetrics, reach: parseInt(e.target.value) || 0})}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-1 w-full">
                                    <label className="font-bold text-xs text-slate-600 ml-1 flex items-center gap-1"><Eye size={12}/> Total Views</label>
                                    <input 
                                        type="number" 
                                        className="bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                        value={manualMetrics.views}
                                        onChange={(e) => setManualMetrics({...manualMetrics, views: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 w-full">
                                    <label className="font-bold text-xs text-slate-600 ml-1 flex items-center gap-1"><Heart size={12}/> Likes</label>
                                    <input 
                                        type="number" 
                                        className="bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                        value={manualMetrics.likes}
                                        onChange={(e) => setManualMetrics({...manualMetrics, likes: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 w-full">
                                    <label className="font-bold text-xs text-slate-600 ml-1 flex items-center gap-1"><MessageSquare size={12}/> Comments</label>
                                    <input 
                                        type="number" 
                                        className="bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                        value={manualMetrics.comments}
                                        onChange={(e) => setManualMetrics({...manualMetrics, comments: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 w-full">
                                    <label className="font-bold text-xs text-slate-600 ml-1 flex items-center gap-1"><Share2 size={12}/> Shares</label>
                                    <input 
                                        type="number" 
                                        className="bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                        value={manualMetrics.shares}
                                        onChange={(e) => setManualMetrics({...manualMetrics, shares: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 w-full">
                                    <label className="font-bold text-xs text-slate-600 ml-1 flex items-center gap-1"><Bookmark size={12}/> Saves</label>
                                    <input 
                                        type="number" 
                                        className="bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                        value={manualMetrics.saves}
                                        onChange={(e) => setManualMetrics({...manualMetrics, saves: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t-2 border-slate-100 flex justify-end gap-3">
                                <Button type="button" variant="secondary" onClick={() => setIsManualModalOpen(false)}>Batal</Button>
                                <Button type="submit" className="bg-pink-500 hover:bg-pink-600 border-pink-700" icon={<Save size={18}/>}>
                                    Simpan Metrics
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};