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
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
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
    const [selectedMetric, setSelectedMetric] = useState<'reach' | 'er' | 'interactions' | 'views' | null>(null);
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
            const tenantId = localStorage.getItem('tenant_id') || localStorage.getItem('user_id');
            const userRole = localStorage.getItem('user_role') || 'Member';
            const userAvatar = localStorage.getItem('user_avatar') || '';
            const isAdminOrOwner = ['Admin', 'Owner', 'Developer'].includes(userRole);

            // Fetch all workspaces for this admin tenant
            const { data: wsData } = await supabase
                .from('workspaces')
                .select('id, account_name, members')
                .eq('admin_id', tenantId);

            if (wsData) {
                // For members: only show workspaces they belong to
                const accessibleWorkspaces = !isAdminOrOwner && userAvatar
                    ? wsData.filter((w: any) =>
                        (w.members || []).some((m: string) => {
                            try { return decodeURIComponent(m) === decodeURIComponent(userAvatar) || m === userAvatar; }
                            catch { return m === userAvatar; }
                        })
                    )
                    : wsData;

                const uniqueAccounts = Array.from(new Set(
                    accessibleWorkspaces.map((w: any) => w.account_name).filter((n: string) => n && n.trim() !== '')
                ));
                setAccounts(uniqueAccounts as string[]);

                // Get the IDs of accessible workspaces for content filtering
                const accessibleIds = accessibleWorkspaces.map((w: any) => w.id);

                // Fetch content items only from accessible workspaces
                const { data: items, error } = await supabase
                    .from('content_items')
                    .select(`*, workspaces!inner(name, account_name, admin_id)`)
                    .eq('status', 'Published')
                    .eq('workspaces.admin_id', tenantId)
                    .in('workspace_id', accessibleIds.length > 0 ? accessibleIds : ['__none__'])
                    .order('date', { ascending: true });

                if (error) throw error;

                if (items) {
                    const formattedItems = items.map((item: any) => ({
                        ...item,
                        contentLink: item.content_link,
                        workspaces: item.workspaces
                    }));
                    setData(formattedItems);
                }
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

    // Calculate Summary Stats based on Filtered Data
    const summaryStats = React.useMemo(() => {
        let totalReach = 0;
        let totalViews = 0;
        let totalInteractions = 0;

        filteredData.forEach(item => {
            const m = item.metrics || {};
            totalReach += (m as any).reach || 0;
            totalViews += m.views || 0;
            totalInteractions += calculateInteractions(m);
        });

        let er = 0;
        // ER Calculation Logic
        // If Instagram, use Reach as denominator if available
        if (filterPlatform === Platform.INSTAGRAM && totalReach > 0) {
            er = (totalInteractions / totalReach) * 100;
        }
        // For others (or if Reach is 0), use Views
        else if (totalViews > 0) {
            er = (totalInteractions / totalViews) * 100;
        }

        return {
            reach: totalReach,
            views: totalViews,
            interactions: totalInteractions,
            er
        };
    }, [filteredData, filterPlatform]);

    // Helper to format period string
    const getPeriodLabel = () => {
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const startMonth = start.toLocaleDateString('id-ID', { month: 'long' });
            const endMonth = end.toLocaleDateString('id-ID', { month: 'long' });
            const year = end.getFullYear();

            if (startMonth === endMonth) {
                return `Periode ${startMonth} ${year}`;
            }
            return `Periode ${startMonth} - ${endMonth} ${year}`;
        }
        // Default to current month if no filter
        const now = new Date();
        return `Periode ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
    };

    // Helper to get dynamic footer text
    const getCardFooterText = () => {
        if (filterPlatform === 'all') return "Semua Platform";
        const accountText = filterAccount !== 'all' ? filterAccount : "Semua Akun";
        return `${filterPlatform} Insight for ${accountText}`;
    };

    // Prepare Chart Data based on selectedMetric
    const chartData = React.useMemo(() => {
        if (!selectedMetric) return [];

        // Group by Date
        const groupedByDate: Record<string, number> = {};

        // Sort data by date ascending first
        const sortedData = [...filteredData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        sortedData.forEach(item => {
            const dateKey = new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

            if (!groupedByDate[dateKey]) groupedByDate[dateKey] = 0;

            const m = item.metrics || {};
            let value = 0;

            switch (selectedMetric) {
                case 'reach':
                    value = (m as any).reach || 0;
                    break;
                case 'views':
                    value = m.views || 0;
                    break;
                case 'interactions':
                    value = calculateInteractions(m);
                    break;
                case 'er':
                    // For daily ER, we average it? Or sum interactions / sum views?
                    // Let's do daily ER = (Daily Interactions / Daily Views/Reach) * 100
                    // But here we are summing values for the day first?
                    // Let's just sum the raw numbers first, then calculate ER later if needed.
                    // Actually, for ER chart, it's better to calculate per item and average? 
                    // Or calculate aggregate for the day. Let's do aggregate for the day.
                    // So we need intermediate storage.
                    break;
            }

            if (selectedMetric !== 'er') {
                groupedByDate[dateKey] += value;
            }
        });

        // Special handling for ER Chart Data
        if (selectedMetric === 'er') {
            const dailyTotals: Record<string, { interactions: number, denominator: number }> = {};

            sortedData.forEach(item => {
                const dateKey = new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                if (!dailyTotals[dateKey]) dailyTotals[dateKey] = { interactions: 0, denominator: 0 };

                const m = item.metrics || {};
                const interactions = calculateInteractions(m);
                const reach = (m as any).reach || 0;
                const views = m.views || 0;

                dailyTotals[dateKey].interactions += interactions;

                if (item.platform === Platform.INSTAGRAM && reach > 0) {
                    dailyTotals[dateKey].denominator += reach;
                } else {
                    dailyTotals[dateKey].denominator += views;
                }
            });

            return Object.keys(dailyTotals).map(date => ({
                name: date,
                value: dailyTotals[date].denominator > 0
                    ? parseFloat(((dailyTotals[date].interactions / dailyTotals[date].denominator) * 100).toFixed(2))
                    : 0
            }));
        }

        return Object.keys(groupedByDate).map(date => ({
            name: date,
            value: groupedByDate[date]
        }));
    }, [filteredData, selectedMetric]);

    // Analysis Helper
    const getAnalysis = () => {
        if (chartData.length < 2) return "Data belum cukup untuk analisa tren.";
        const last = chartData[chartData.length - 1].value;
        const prev = chartData[chartData.length - 2].value;
        const diff = last - prev;

        if (diff > 0) return `🔥 Tren Positif! Performa ${selectedMetric?.toUpperCase()} meningkat pada tanggal ${chartData[chartData.length - 1].name}.`;
        if (diff < 0) return `📉 Perhatian: Terjadi penurunan ${selectedMetric?.toUpperCase()} dibandingkan tanggal sebelumnya.`;
        return "⚡ Performa stabil.";
    };

    return (
        <div className="space-y-6">
            {/* ... Header ... */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
                <div>
                    <h2 className="text-4xl font-extrabold text-slate-800 font-heading tracking-tight flex items-center gap-3">
                        Content Data Insight
                    </h2>
                    <p className="text-slate-500 font-medium mt-2">
                        Analisa real-time atau input manual metrics untuk perhitungan ER yang presisi.
                    </p>
                </div>

                {/* Period Indicator Badge */}
                <div className="bg-white border-2 border-slate-800 px-4 py-2 rounded-xl shadow-hard transform rotate-1 hover:rotate-0 transition-transform cursor-default">
                    <span className="font-heading font-black text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                        <Calendar size={16} className="text-accent" />
                        {getPeriodLabel()}
                    </span>
                </div>
            </div>

            {/* Summary Cards - Colorful & Solid */}
            <div className={`grid gap-4 ${filterPlatform === Platform.TIKTOK ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>

                {/* Reach Card */}
                {filterPlatform !== Platform.TIKTOK && (
                    <div
                        onClick={() => setSelectedMetric('reach')}
                        className="bg-blue-500 p-5 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0F172A] flex flex-col justify-between h-36 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0F172A] transition-all duration-200 cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                            <BarChart2 size={80} className="text-white" />
                        </div>
                        <div className="relative z-10 text-white">
                            <p className="text-xs font-black uppercase tracking-wider mb-1 opacity-90">Total Reach</p>
                            <h3 className="text-3xl font-black">{summaryStats.reach.toLocaleString()}</h3>
                        </div>
                        <div className="relative z-10 mt-auto pt-2">
                            <span className="inline-block bg-black/20 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                                {getCardFooterText()}
                            </span>
                        </div>
                    </div>
                )}

                {/* Engagement Rate */}
                <div
                    onClick={() => setSelectedMetric('er')}
                    className="bg-pink-500 p-5 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0F172A] flex flex-col justify-between h-36 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0F172A] transition-all duration-200 cursor-pointer"
                >
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                        <TrendingUp size={80} className="text-white" />
                    </div>
                    <div className="relative z-10 text-white">
                        <p className="text-xs font-black uppercase tracking-wider mb-1 opacity-90">Engagement Rate</p>
                        <h3 className="text-3xl font-black">{summaryStats.er.toFixed(2)}%</h3>
                    </div>
                    <div className="relative z-10 mt-auto pt-2">
                        <span className="inline-block bg-black/20 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                            {getCardFooterText()}
                        </span>
                    </div>
                </div>

                {/* Interactions */}
                <div
                    onClick={() => setSelectedMetric('interactions')}
                    className="bg-purple-600 p-5 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0F172A] flex flex-col justify-between h-36 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0F172A] transition-all duration-200 cursor-pointer"
                >
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                        <Zap size={80} className="text-white" />
                    </div>
                    <div className="relative z-10 text-white">
                        <p className="text-xs font-black uppercase tracking-wider mb-1 opacity-90">Total Interaksi</p>
                        <h3 className="text-3xl font-black">{summaryStats.interactions.toLocaleString()}</h3>
                    </div>
                    <div className="relative z-10 mt-auto pt-2">
                        <span className="inline-block bg-black/20 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                            {getCardFooterText()}
                        </span>
                    </div>
                </div>

                {/* Views */}
                <div
                    onClick={() => setSelectedMetric('views')}
                    className="bg-yellow-400 p-5 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0F172A] flex flex-col justify-between h-36 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0F172A] transition-all duration-200 cursor-pointer"
                >
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                        <Eye size={80} className="text-black" />
                    </div>
                    <div className="relative z-10 text-slate-900">
                        <p className="text-xs font-black uppercase tracking-wider mb-1 opacity-80">Content Views</p>
                        <h3 className="text-3xl font-black">{summaryStats.views.toLocaleString()}</h3>
                    </div>
                    <div className="relative z-10 mt-auto pt-2">
                        <span className="inline-block bg-black/10 text-slate-900 text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                            {getCardFooterText()}
                        </span>
                    </div>
                </div>
            </div>

            {/* CHART MODAL */}
            {selectedMetric && (
                <Modal
                    isOpen={!!selectedMetric}
                    onClose={() => setSelectedMetric(null)}
                    title={`Grafik Analisa: ${selectedMetric.toUpperCase()}`}
                    maxWidth="max-w-4xl"
                >
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-xl flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Periode Data</p>
                                <p className="font-black text-slate-800 text-lg">{getPeriodLabel()}</p>
                            </div>
                            <div className={`px-4 py-2 rounded-lg font-bold text-white uppercase text-sm ${selectedMetric === 'reach' ? 'bg-blue-500' :
                                selectedMetric === 'er' ? 'bg-pink-500' :
                                    selectedMetric === 'interactions' ? 'bg-purple-600' : 'bg-yellow-400 text-black'
                                }`}>
                                {selectedMetric}
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="h-[300px] w-full bg-white border-2 border-slate-800 rounded-xl p-4 shadow-hard relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={
                                                selectedMetric === 'reach' ? '#3B82F6' :
                                                    selectedMetric === 'er' ? '#EC4899' :
                                                        selectedMetric === 'interactions' ? '#9333EA' : '#FACC15'
                                            } stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={
                                                selectedMetric === 'reach' ? '#3B82F6' :
                                                    selectedMetric === 'er' ? '#EC4899' :
                                                        selectedMetric === 'interactions' ? '#9333EA' : '#FACC15'
                                            } stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickMargin={10} />
                                    <YAxis stroke="#64748b" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '2px solid #1e293b',
                                            borderRadius: '8px',
                                            boxShadow: '4px 4px 0px 0px #1e293b'
                                        }}
                                        itemStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={
                                            selectedMetric === 'reach' ? '#3B82F6' :
                                                selectedMetric === 'er' ? '#EC4899' :
                                                    selectedMetric === 'interactions' ? '#9333EA' : '#CA8A04'
                                        }
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Analysis Box */}
                        <div className="bg-[#FFFDF5] border-2 border-slate-800 rounded-xl p-6 shadow-hard relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-slate-800"></div>
                            <h4 className="font-heading font-black text-xl text-slate-800 mb-2 flex items-center gap-2">
                                <TrendingUp size={24} className="text-slate-800" />
                                Hipotesa & Analisa Singkat
                            </h4>
                            <p className="text-slate-700 font-medium leading-relaxed">
                                {getAnalysis()}
                            </p>
                            <div className="mt-4 flex gap-2">
                                {chartData.slice(-3).map((d, i) => (
                                    <div key={i} className="bg-white border border-slate-200 p-2 rounded-lg text-xs">
                                        <span className="block font-bold text-slate-400">{d.name}</span>
                                        <span className="font-black text-slate-800">{d.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

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
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs font-bold text-slate-700 outline-none bg-transparent w-24" />
                            <span className="text-slate-300">-</span>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs font-bold text-slate-700 outline-none bg-transparent w-24" />
                        </div>
                        {(filterPlatform !== 'all' || filterAccount !== 'all' || startDate || endDate) && (
                            <button onClick={resetFilters} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex-shrink-0 w-full xl:w-auto flex justify-end">
                        <Button variant="secondary" size="sm" onClick={fetchData} icon={<RefreshCw size={14} />} className="h-9 text-xs">Refresh Data</Button>
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
                                                    <Calendar size={16} className="text-slate-400" />
                                                    {item.date ? new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle max-w-xs">
                                                <p className="font-bold text-slate-800 text-sm line-clamp-1 mb-1" title={item.title}>{item.title}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-bold uppercase">{item.type}</span>
                                                    <div className="flex items-center gap-1 text-slate-500">
                                                        {item.platform === Platform.INSTAGRAM ? <Instagram size={12} /> :
                                                            item.platform === Platform.TIKTOK ? (
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                                                </svg>
                                                            ) : <Globe size={12} />}
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
                                                                <h4 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={18} className="text-accent" /> Detailed Metrics</h4>
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
                                                                            <TrendingUp size={64} className="text-slate-50 opacity-50 -rotate-12" />
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
                                                                            <Zap size={64} className="text-slate-50 opacity-50 -rotate-12" />
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
                                                            <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><FileText size={18} className="text-slate-400" /> Insight & Details</h4>

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
                                            <label className="font-bold text-xs text-slate-600 ml-1 flex items-center gap-1"><BarChart2 size={12} /> Reach / Jangkauan</label>
                                            <input
                                                type="number"
                                                className="bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                                value={manualMetrics.reach}
                                                onChange={(e) => setManualMetrics({ ...manualMetrics, reach: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-1 w-full">
                                    <label className="font-bold text-xs text-slate-600 ml-1 flex items-center gap-1"><Eye size={12} /> Total Views</label>
                                    <input
                                        type="number"
                                        className="bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                        value={manualMetrics.views}
                                        onChange={(e) => setManualMetrics({ ...manualMetrics, views: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 w-full">
                                    <label className="font-bold text-xs text-slate-600 ml-1 flex items-center gap-1"><Heart size={12} /> Likes</label>
                                    <input
                                        type="number"
                                        className="bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                        value={manualMetrics.likes}
                                        onChange={(e) => setManualMetrics({ ...manualMetrics, likes: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 w-full">
                                    <label className="font-bold text-xs text-slate-600 ml-1 flex items-center gap-1"><MessageSquare size={12} /> Comments</label>
                                    <input
                                        type="number"
                                        className="bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                        value={manualMetrics.comments}
                                        onChange={(e) => setManualMetrics({ ...manualMetrics, comments: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 w-full">
                                    <label className="font-bold text-xs text-slate-600 ml-1 flex items-center gap-1"><Share2 size={12} /> Shares</label>
                                    <input
                                        type="number"
                                        className="bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                        value={manualMetrics.shares}
                                        onChange={(e) => setManualMetrics({ ...manualMetrics, shares: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 w-full">
                                    <label className="font-bold text-xs text-slate-600 ml-1 flex items-center gap-1"><Bookmark size={12} /> Saves</label>
                                    <input
                                        type="number"
                                        className="bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                        value={manualMetrics.saves}
                                        onChange={(e) => setManualMetrics({ ...manualMetrics, saves: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t-2 border-slate-100 flex justify-end gap-3">
                                <Button type="button" variant="secondary" onClick={() => setIsManualModalOpen(false)}>Batal</Button>
                                <Button type="submit" className="bg-pink-500 hover:bg-pink-600 border-pink-700" icon={<Save size={18} />}>
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