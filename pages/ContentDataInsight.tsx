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
    Edit3,
    Save,
    Share2,
    MessageSquare,
    Heart,
    Eye,
    BarChart2,
    Award,
    AlertTriangle,
    FileBarChart,
    Hash,
    Layers,
    Target,
    Clock,
    PenTool,
    Star,
    ArrowUpRight,
    ArrowDownRight,
    Lightbulb,
    Users
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
    Area,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import { supabase } from '../services/supabaseClient';
import { ContentItem, Platform } from '../types';
import { analyzeContentLink } from '../services/scraperService';
import { useAppConfig } from '../components/AppConfigProvider';

const ChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border-2 border-slate-900 shadow-[4px_4px_0px_#1e293b] rounded-xl pointer-events-none">
                {label && <p className="text-slate-400 font-bold text-[10px] uppercase mb-1 leading-none">{label}</p>}
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
                        <p className="text-slate-900 font-black text-xs">
                            <span className="opacity-50 font-bold">{entry.name}:</span> {entry.value.toLocaleString()}{entry.name === 'value' && entry.dataKey === 'er' ? '%' : ''}
                        </p>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// Pie chart color palette
const PIE_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4'];

export const ContentDataInsight: React.FC = () => {
    const { config } = useAppConfig();
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

    // --- MONTHLY REPORT STATE ---
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportFilterAccount, setReportFilterAccount] = useState<string>('all');
    const [reportFilterPlatform, setReportFilterPlatform] = useState<string>('all');
    const [reportStartDate, setReportStartDate] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [reportEndDate, setReportEndDate] = useState<string>(() => {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    });
    const [reportNotes, setReportNotes] = useState<string>('');
    const [reportNextPlan, setReportNextPlan] = useState<string>('');
    const [savingReportNotes, setSavingReportNotes] = useState(false);

    // Load report notes from localStorage
    useEffect(() => {
        const savedNotes = localStorage.getItem(`report_notes_${reportFilterAccount}_${reportStartDate}`);
        const savedPlan = localStorage.getItem(`report_plan_${reportFilterAccount}_${reportStartDate}`);
        if (savedNotes) setReportNotes(savedNotes);
        else setReportNotes('');
        if (savedPlan) setReportNextPlan(savedPlan);
        else setReportNextPlan('');
    }, [reportFilterAccount, reportStartDate]);

    const saveReportNotesToStorage = () => {
        setSavingReportNotes(true);
        localStorage.setItem(`report_notes_${reportFilterAccount}_${reportStartDate}`, reportNotes);
        localStorage.setItem(`report_plan_${reportFilterAccount}_${reportStartDate}`, reportNextPlan);
        setTimeout(() => setSavingReportNotes(false), 800);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('user_id');
            const userRole = localStorage.getItem('user_role') || 'Member';
            const userAvatar = localStorage.getItem('user_avatar') || '';
            const tenantId = localStorage.getItem('tenant_id') || userId;
            const isAdminOrOwner = ['Admin', 'Owner', 'Developer'].includes(userRole);

            // FIX: Only fetch workspaces where user is owner OR explicitly a member
            // REMOVED: owner_id.eq.${tenantId} — this was causing invited users to see ALL admin workspaces
            // Now invited users only see workspaces they are explicitly added to (members array)
            let wsQuery = supabase.from('workspaces').select('id, account_name, members, owner_id');

            // Fetch workspaces where user is owner or explicitly a member
            let filterCondition = `owner_id.eq.${userId},members.cs.{"${userId}"}`;
            if (userAvatar && !userAvatar.startsWith('data:')) {
                filterCondition += `,members.cs.{"${userAvatar}"}`;
            }
            wsQuery = wsQuery.or(filterCondition);

            const { data: wsData, error: wsError } = await wsQuery;
            if (wsError) throw wsError;

            if (wsData) {
                // For members: filter locally to include workspaces they belong to
                // This is more reliable than PostgREST member filtering
                const accessibleWorkspaces = wsData.filter((w: any) => {
                    const isOwner = w.owner_id === userId;
                    if (isOwner) return true;

                    // Check membership by user ID or avatar
                    const members: string[] = w.members || [];
                    if (members.includes(userId || '')) return true;
                    if (!userAvatar) return false;
                    return members.some(m => {
                        try { return decodeURIComponent(m) === decodeURIComponent(userAvatar) || m === userAvatar; }
                        catch { return m === userAvatar; }
                    });
                });

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
                    .in('workspace_id', accessibleIds.length > 0 ? accessibleIds : ['00000000-0000-0000-0000-000000000000'])
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

    // ═══════════════════════════════════════════════
    // MONTHLY REPORT COMPUTED DATA
    // ═══════════════════════════════════════════════
    const reportData = React.useMemo(() => {
        // Filter data for report
        const filtered = data.filter(item => {
            const matchPlatform = reportFilterPlatform === 'all' || item.platform === reportFilterPlatform;
            const matchAccount = reportFilterAccount === 'all' || item.workspaces?.account_name === reportFilterAccount;
            let matchPeriod = true;
            if (item.date) {
                if (reportStartDate && item.date < reportStartDate) matchPeriod = false;
                if (reportEndDate && item.date > reportEndDate) matchPeriod = false;
            }
            return matchPlatform && matchAccount && matchPeriod;
        });

        // Total metrics
        let totalReach = 0, totalViews = 0, totalLikes = 0, totalComments = 0, totalShares = 0, totalSaves = 0;
        filtered.forEach(item => {
            const m = item.metrics || {};
            totalReach += (m as any).reach || 0;
            totalViews += m.views || 0;
            totalLikes += m.likes || 0;
            totalComments += m.comments || 0;
            totalShares += m.shares || 0;
            totalSaves += m.saves || 0;
        });
        const totalInteractions = totalLikes + totalComments + totalShares + totalSaves;
        const avgER = totalViews > 0 ? (totalInteractions / totalViews) * 100 : (totalReach > 0 ? (totalInteractions / totalReach) * 100 : 0);

        // Growth chart data (by week)
        const weeklyData: Record<string, { reach: number, views: number, interactions: number, er: number, count: number, denominator: number }> = {};
        const sortedFiltered = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        sortedFiltered.forEach(item => {
            const d = new Date(item.date);
            const weekNum = Math.ceil(d.getDate() / 7);
            const key = `Minggu ${weekNum}`;
            if (!weeklyData[key]) weeklyData[key] = { reach: 0, views: 0, interactions: 0, er: 0, count: 0, denominator: 0 };
            const m = item.metrics || {};
            weeklyData[key].reach += (m as any).reach || 0;
            weeklyData[key].views += m.views || 0;
            weeklyData[key].interactions += calculateInteractions(m);
            weeklyData[key].denominator += ((m as any).reach || m.views || 0);
            weeklyData[key].count++;
        });
        const growthChartData = Object.keys(weeklyData).map(wk => ({
            name: wk,
            reach: weeklyData[wk].reach,
            views: weeklyData[wk].views,
            interactions: weeklyData[wk].interactions,
            er: weeklyData[wk].denominator > 0 ? parseFloat(((weeklyData[wk].interactions / weeklyData[wk].denominator) * 100).toFixed(2)) : 0
        }));

        // Top 3 and Bottom 3 content (by total interactions)
        const withMetrics = filtered.filter(item => {
            const m = item.metrics || {};
            return (m.views || 0) > 0 || calculateInteractions(m) > 0;
        }).map(item => ({
            ...item,
            _interactions: calculateInteractions(item.metrics || {}),
            _er: calculateER(item.metrics || {})
        }));
        const top3 = [...withMetrics].sort((a, b) => b._interactions - a._interactions).slice(0, 3);
        const bottom3 = [...withMetrics].sort((a, b) => a._interactions - b._interactions).slice(0, 3);

        // Content Pillar Pie
        const pillarCount: Record<string, number> = {};
        filtered.forEach(item => {
            const pillar = item.pillar || 'Tanpa Pillar';
            pillarCount[pillar] = (pillarCount[pillar] || 0) + 1;
        });
        const pillarPieData = Object.keys(pillarCount).map(p => ({ name: p, value: pillarCount[p] }));

        // Posting frequency by day of week
        const dayFreq: Record<string, number> = { Sen: 0, Sel: 0, Rab: 0, Kam: 0, Jum: 0, Sab: 0, Min: 0 };
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        filtered.forEach(item => {
            if (item.date) {
                const day = new Date(item.date).getDay();
                dayFreq[dayNames[day]]++;
            }
        });
        const postingFreqData = Object.keys(dayFreq).map(d => ({ name: d, posts: dayFreq[d] }));

        // Platform breakdown
        const platformCount: Record<string, number> = {};
        filtered.forEach(item => {
            platformCount[item.platform] = (platformCount[item.platform] || 0) + 1;
        });
        const platformPieData = Object.keys(platformCount).map(p => ({ name: p, value: platformCount[p] }));

        // Metrics comparison bar data
        const metricsBarData = [
            { name: 'Likes', value: totalLikes, fill: '#ec4899' },
            { name: 'Comments', value: totalComments, fill: '#6366f1' },
            { name: 'Shares', value: totalShares, fill: '#10b981' },
            { name: 'Saves', value: totalSaves, fill: '#f59e0b' }
        ];

        return {
            filtered,
            totalReach,
            totalViews,
            totalLikes,
            totalComments,
            totalShares,
            totalSaves,
            totalInteractions,
            avgER,
            totalPosts: filtered.length,
            growthChartData,
            top3,
            bottom3,
            pillarPieData,
            postingFreqData,
            platformPieData,
            metricsBarData
        };
    }, [data, reportFilterAccount, reportFilterPlatform, reportStartDate, reportEndDate]);

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
        <>
            {/* ═══════════════════════════════════════════════════════════════════
            MOBILE VIEW (< md) - ClickUp/Asana Style
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="block md:hidden flex flex-col h-full pb-24 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-base font-black text-foreground font-heading">{config?.page_titles?.['insight']?.title || 'Content Insight'}</h2>
                        <p className="text-[10px] text-mutedForeground">{filteredData.length} konten</p>
                    </div>
                    <button onClick={fetchData} disabled={loading} className="p-2 rounded-xl bg-muted text-mutedForeground hover:text-foreground transition-colors">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Summary Stats - 2x2 grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-blue-500 rounded-xl p-3 text-white">
                        <p className="text-[9px] font-black uppercase tracking-wider opacity-80 mb-0.5">Total Reach</p>
                        <p className="text-xl font-black">{summaryStats.reach.toLocaleString()}</p>
                    </div>
                    <div className="bg-pink-500 rounded-xl p-3 text-white">
                        <p className="text-[9px] font-black uppercase tracking-wider opacity-80 mb-0.5">Engagement Rate</p>
                        <p className="text-xl font-black">{summaryStats.er.toFixed(2)}%</p>
                    </div>
                    <div className="bg-purple-600 rounded-xl p-3 text-white">
                        <p className="text-[9px] font-black uppercase tracking-wider opacity-80 mb-0.5">Interactions</p>
                        <p className="text-xl font-black">{summaryStats.interactions.toLocaleString()}</p>
                    </div>
                    <div className="bg-yellow-400 rounded-xl p-3 text-slate-900">
                        <p className="text-[9px] font-black uppercase tracking-wider opacity-70 mb-0.5">Views</p>
                        <p className="text-xl font-black">{summaryStats.views.toLocaleString()}</p>
                    </div>
                </div>

                {/* Platform Filter */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-3 flex-shrink-0">
                    {['all', Platform.INSTAGRAM, Platform.TIKTOK, Platform.YOUTUBE, Platform.LINKEDIN, Platform.FACEBOOK].map(p => (
                        <button key={p} onClick={() => setFilterPlatform(p)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black border transition-all ${filterPlatform === p ? 'bg-foreground text-background border-foreground' : 'bg-card border-border text-foreground'}`}>
                            {p === 'all' ? 'Semua' : p}
                        </button>
                    ))}
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto space-y-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
                            <BarChart2 size={28} className="text-accent/40 mx-auto mb-2" />
                            <p className="text-sm font-bold text-foreground">Belum ada data insight</p>
                            <p className="text-xs text-mutedForeground mt-1">Konten Published akan muncul di sini</p>
                        </div>
                    ) : (
                        filteredData.map(item => {
                            const m = item.metrics || {};
                            const er = calculateER(m);
                            const interactions = calculateInteractions(m);
                            const hasMetrics = m.views || interactions;
                            const isExpanded = expandedRowId === item.id;
                            return (
                                <div key={item.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                                    {/* Card Header */}
                                    <button onClick={() => toggleRow(item.id)} className="w-full flex items-start gap-3 p-3 text-left">
                                        <div className={`w-2 self-stretch rounded-full flex-shrink-0 ${item.platform === Platform.INSTAGRAM ? 'bg-pink-500' : item.platform === Platform.TIKTOK ? 'bg-slate-800' : item.platform === Platform.YOUTUBE ? 'bg-red-500' : 'bg-blue-500'}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="text-[9px] font-black text-mutedForeground bg-muted px-1.5 py-0.5 rounded">{item.platform}</span>
                                                {(m as any)?.isManual && <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Manual</span>}
                                            </div>
                                            <p className="text-xs font-bold text-foreground line-clamp-2">{item.title}</p>
                                            <p className="text-[9px] text-mutedForeground mt-0.5">{item.date ? new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            {hasMetrics ? (
                                                <>
                                                    <p className="text-sm font-black text-foreground">{er.toFixed(1)}%</p>
                                                    <p className="text-[9px] text-mutedForeground">ER</p>
                                                </>
                                            ) : (
                                                <span className="text-[9px] text-mutedForeground">No data</span>
                                            )}
                                        </div>
                                    </button>

                                    {/* Expanded Metrics */}
                                    {isExpanded && (
                                        <div className="px-3 pb-3 border-t border-border">
                                            {hasMetrics ? (
                                                <div className="grid grid-cols-3 gap-2 mt-2 mb-3">
                                                    <div className="text-center">
                                                        <p className="text-sm font-black text-foreground">{(m.views || 0).toLocaleString()}</p>
                                                        <p className="text-[8px] text-mutedForeground">Views</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-black text-foreground">{(m.likes || 0).toLocaleString()}</p>
                                                        <p className="text-[8px] text-mutedForeground">Likes</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-black text-foreground">{(m.comments || 0).toLocaleString()}</p>
                                                        <p className="text-[8px] text-mutedForeground">Comments</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-black text-foreground">{(m.shares || 0).toLocaleString()}</p>
                                                        <p className="text-[8px] text-mutedForeground">Shares</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-black text-foreground">{(m.saves || 0).toLocaleString()}</p>
                                                        <p className="text-[8px] text-mutedForeground">Saves</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-black text-foreground">{interactions.toLocaleString()}</p>
                                                        <p className="text-[8px] text-mutedForeground">Total Eng</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-mutedForeground text-center py-2">Belum ada data metrics</p>
                                            )}
                                            <div className="flex gap-2">
                                                <button onClick={(e) => openManualInput(e, item)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-accent text-white rounded-xl text-xs font-bold">
                                                    <Edit3 size={12} /> Input Manual
                                                </button>
                                                {item.contentLink && (
                                                    <button onClick={(e) => handleAnalyze(e, item.id, item.contentLink || '')}
                                                        disabled={analyzingId === item.id}
                                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-muted border border-border text-foreground rounded-xl text-xs font-bold disabled:opacity-50">
                                                        {analyzingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                                        {analyzingId === item.id ? 'Analisa...' : 'Auto Analisa'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Manual Input Modal - Mobile optimized */}
                {isManualModalOpen && selectedItemForInput && (
                    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-end" onClick={() => setIsManualModalOpen(false)}>
                        <div className="bg-card w-full rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
                            <h3 className="text-base font-black text-foreground mb-1">Input Metrics Manual</h3>
                            <p className="text-xs text-mutedForeground mb-4 line-clamp-1">{selectedItemForInput.title}</p>
                            <form onSubmit={saveManualMetrics} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { key: 'views', label: 'Views', icon: <Eye size={14} /> },
                                        { key: 'likes', label: 'Likes', icon: <Heart size={14} /> },
                                        { key: 'comments', label: 'Comments', icon: <MessageSquare size={14} /> },
                                        { key: 'shares', label: 'Shares', icon: <Share2 size={14} /> },
                                        { key: 'saves', label: 'Saves', icon: <Bookmark size={14} /> },
                                        { key: 'reach', label: 'Reach', icon: <Globe size={14} /> },
                                    ].map(({ key, label, icon }) => (
                                        <div key={key} className="bg-muted rounded-xl p-3">
                                            <div className="flex items-center gap-1.5 mb-1.5 text-mutedForeground">
                                                {icon}
                                                <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                value={manualMetrics[key as keyof typeof manualMetrics]}
                                                onChange={e => setManualMetrics(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                                                className="w-full bg-transparent text-lg font-black text-foreground outline-none border-b-2 border-border focus:border-accent transition-colors"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsManualModalOpen(false)}
                                        className="flex-1 py-3 bg-muted text-foreground rounded-xl text-sm font-bold">Batal</button>
                                    <button type="submit"
                                        className="flex-1 py-3 bg-accent text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                                        <Save size={14} /> Simpan
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
            DESKTOP VIEW (≥ md) - Original Layout
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="hidden md:flex space-y-2 sm:space-y-4 md:space-y-6 flex-1 flex-col min-h-0">
                {/* ... Header ... */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 sm:gap-3 md:gap-4 pb-1 sm:pb-2">
                    <div>
                        <h2 className="text-base md:text-2xl lg:text-4xl font-extrabold text-slate-800 font-heading tracking-tight flex items-center gap-2 sm:gap-3">
                            {config?.page_titles?.['insight']?.title || 'Content Data Insight'}
                        </h2>
                        <p className="text-slate-500 font-medium mt-0.5 md:mt-2 text-xs sm:text-sm hidden md:block">
                            {config?.page_titles?.['insight']?.subtitle || 'Analisa real-time atau input manual metrics untuk perhitungan ER yang presisi.'}
                        </p>
                    </div>

                    {/* Period Badge + Report Button */}
                    <div className="flex items-center gap-3">
                        {/* Period Indicator Badge */}
                        <div className="bg-white border-2 border-slate-800 px-2 sm:px-4 py-1 sm:py-2 rounded-xl shadow-hard transform rotate-1 hover:rotate-0 transition-transform cursor-default text-[10px] sm:text-sm">
                            <span className="font-heading font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                                <Calendar size={14} className="text-accent" />
                                <span className="hidden sm:inline">{getPeriodLabel()}</span>
                            </span>
                        </div>

                        {/* Full Monthly Report Button */}
                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-2 border-slate-800 px-4 py-2 rounded-xl shadow-hard hover:shadow-hard-hover hover:-translate-y-0.5 transition-all text-xs sm:text-sm font-black flex items-center gap-2 uppercase tracking-wide"
                        >
                            <FileBarChart size={16} />
                            <span className="hidden sm:inline">Monthly Report</span>
                        </button>
                    </div>
                </div>

                {/* Summary Cards - Colorful & Solid */}
                <div className={`grid gap-2 sm:gap-3 md:gap-4 ${filterPlatform === Platform.TIKTOK ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>

                    {/* Reach Card */}
                    {filterPlatform !== Platform.TIKTOK && (
                        <div
                            onClick={() => setSelectedMetric('reach')}
                            className="bg-blue-500 p-3 sm:p-5 rounded-lg sm:rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0F172A] flex flex-col justify-between h-28 sm:h-36 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0F172A] transition-all duration-200 cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 p-2 sm:p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                                <BarChart2 size={60} className="text-white" />
                            </div>
                            <div className="relative z-10 text-white">
                                <p className="text-[8px] sm:text-xs font-black uppercase tracking-wider mb-1 opacity-90">Total Reach</p>
                                <h3 className="text-2xl sm:text-3xl font-black">{summaryStats.reach.toLocaleString()}</h3>
                            </div>
                            <div className="relative z-10 mt-auto pt-2">
                                <span className="inline-block bg-black/20 text-white text-[8px] sm:text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                                    {getCardFooterText()}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Engagement Rate */}
                    <div
                        onClick={() => setSelectedMetric('er')}
                        className="bg-pink-500 p-3 sm:p-5 rounded-lg sm:rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0F172A] flex flex-col justify-between h-28 sm:h-36 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0F172A] transition-all duration-200 cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                            <TrendingUp size={80} className="text-white" />
                        </div>
                        <div className="relative z-10 text-white">
                            <p className="text-[8px] sm:text-xs font-black uppercase tracking-wider mb-1 opacity-90">Engagement Rate</p>
                            <h3 className="text-2xl sm:text-3xl font-black">{summaryStats.er.toFixed(2)}%</h3>
                        </div>
                        <div className="relative z-10 mt-auto pt-2">
                            <span className="inline-block bg-black/20 text-white text-[8px] sm:text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                                {getCardFooterText()}
                            </span>
                        </div>
                    </div>

                    {/* Interactions */}
                    <div
                        onClick={() => setSelectedMetric('interactions')}
                        className="bg-purple-600 p-3 sm:p-5 rounded-lg sm:rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0F172A] flex flex-col justify-between h-28 sm:h-36 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0F172A] transition-all duration-200 cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-2 sm:p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                            <Zap size={60} className="text-white" />
                        </div>
                        <div className="relative z-10 text-white">
                            <p className="text-[8px] sm:text-xs font-black uppercase tracking-wider mb-1 opacity-90">Total Interaksi</p>
                            <h3 className="text-2xl sm:text-3xl font-black">{summaryStats.interactions.toLocaleString()}</h3>
                        </div>
                        <div className="relative z-10 mt-auto pt-2">
                            <span className="inline-block bg-black/20 text-white text-[8px] sm:text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                                {getCardFooterText()}
                            </span>
                        </div>
                    </div>

                    {/* Views */}
                    <div
                        onClick={() => setSelectedMetric('views')}
                        className="bg-yellow-400 p-3 sm:p-5 rounded-lg sm:rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_#0F172A] flex flex-col justify-between h-28 sm:h-36 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#0F172A] transition-all duration-200 cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-2 sm:p-3 opacity-20 group-hover:opacity-30 transition-opacity">
                            <Eye size={60} className="text-black" />
                        </div>
                        <div className="relative z-10 text-slate-900">
                            <p className="text-[8px] sm:text-xs font-black uppercase tracking-wider mb-1 opacity-80">Content Views</p>
                            <h3 className="text-2xl sm:text-3xl font-black">{summaryStats.views.toLocaleString()}</h3>
                        </div>
                        <div className="relative z-10 mt-auto pt-2">
                            <span className="inline-block bg-black/10 text-slate-900 text-[8px] sm:text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
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
                            <div className="h-[180px] sm:h-[300px] w-full bg-white border-2 border-slate-800 rounded-xl p-3 sm:p-4 shadow-hard relative">
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
                                        <Tooltip content={<ChartTooltip />} />
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

                <div className="bg-card rounded-lg sm:rounded-xl border-2 border-slate-800 shadow-hard overflow-hidden flex flex-col flex-1 min-h-0">
                    {/* Toolbar */}
                    <div className="border-b-2 border-slate-200 p-2 sm:p-3 md:p-4 flex flex-col xl:flex-row gap-2 sm:gap-3 items-center justify-between">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 w-full xl:w-auto">
                            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 border rounded-lg font-bold text-[8px] sm:text-xs">
                                <Filter size={12} />
                                <span className="hidden sm:inline">Filter:</span>
                            </div>
                            <div className="w-28 sm:w-36 md:w-40">
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
                                    className="!py-1 sm:!py-2 !text-[8px] sm:!text-xs h-8 sm:h-9"
                                />
                            </div>
                            <div className="w-28 sm:w-36 md:w-40">
                                <Select
                                    value={filterAccount}
                                    onChange={(e) => setFilterAccount(e.target.value)}
                                    options={[{ label: 'Semua Akun', value: 'all' }, ...accounts.map(acc => ({ label: acc, value: acc }))]}
                                    className="!py-1 sm:!py-2 !text-[8px] sm:!text-xs h-8 sm:h-9"
                                />
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 border rounded-lg px-1 sm:px-2 h-8 sm:h-9">
                                <span className="text-[7px] sm:text-[10px] font-bold text-slate-400 uppercase">Periode</span>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-[7px] sm:text-xs font-bold outline-none bg-transparent w-20 sm:w-24" />
                                <span className="text-slate-300 text-xs">-</span>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-[7px] sm:text-xs font-bold outline-none bg-transparent w-20 sm:w-24" />
                            </div>
                            {(filterPlatform !== 'all' || filterAccount !== 'all' || startDate || endDate) && (
                                <button onClick={resetFilters} className="p-1 sm:p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <div className="flex-shrink-0 w-full xl:w-auto flex justify-end">
                            <Button variant="secondary" size="sm" onClick={fetchData} icon={<RefreshCw size={12} />} className="h-8 sm:h-9 text-[8px] sm:text-xs">Refresh</Button>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[10px] sm:text-sm">
                            <thead className="border-b-2 border-slate-100 sticky top-0 z-10 shadow-sm bg-white">
                                <tr>
                                    <th className="p-2 sm:p-3 md:p-4 w-8 sm:w-10"></th>
                                    <th className="p-2 sm:p-3 md:p-4 text-[7px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                                    <th className="p-2 sm:p-3 md:p-4 text-[7px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[120px] sm:min-w-[200px]">Judul</th>
                                    <th className="p-2 sm:p-3 md:p-4 text-[7px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">Link</th>
                                    <th className="p-2 sm:p-3 md:p-4 text-[7px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center min-w-[180px] sm:min-w-[280px]">Metrics</th>
                                    <th className="p-2 sm:p-3 md:p-4 text-[7px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 sm:p-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="animate-spin text-accent" size={24} sm:size={32} />
                                                <span className="text-xs sm:text-sm">Mengambil data...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 sm:p-12 text-center text-slate-400 italic bg-slate-50/50 text-xs sm:text-sm">
                                            Tidak ada konten published yang ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item) => (
                                        <React.Fragment key={item.id}>
                                            <tr
                                                className={`transition-colors cursor-pointer text-[9px] sm:text-sm ${expandedRowId === item.id ? 'bg-purple-500/10' : 'hover:bg-slate-500/5'}`}
                                                onClick={() => toggleRow(item.id)}
                                            >
                                                <td className="p-2 sm:p-3 md:p-4 text-center">
                                                    {expandedRowId === item.id ? <ChevronUp size={14} className="text-accent" /> : <ChevronDown size={14} className="text-slate-400" />}
                                                </td>
                                                <td className="p-2 sm:p-3 md:p-4 align-middle">
                                                    <div className="flex items-center gap-1 sm:gap-2 font-bold text-slate-600">
                                                        <Calendar size={12} sm:size={16} className="text-slate-400 flex-shrink-0" />
                                                        <span className="text-[7px] sm:text-sm whitespace-nowrap">{item.date ? new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-2 sm:p-3 md:p-4 align-middle max-w-[120px] sm:max-w-xs">
                                                    <p className="font-bold text-slate-800 text-[8px] sm:text-sm line-clamp-1 mb-0.5 sm:mb-1" title={item.title}>{item.title}</p>
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <span className="text-[6px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-bold uppercase">{item.type}</span>
                                                        <div className="flex items-center gap-0.5 sm:gap-1 text-slate-500">
                                                            {item.platform === Platform.INSTAGRAM ? <Instagram size={10} /> :
                                                                item.platform === Platform.TIKTOK ? (
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                                                    </svg>
                                                                ) : <Globe size={10} />}
                                                            <span className="text-[6px] sm:text-[10px] font-bold">@{item.workspaces?.account_name || '-'}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="p-2 sm:p-3 md:p-4 align-middle hidden sm:table-cell">
                                                    {item.contentLink ? (
                                                        <a
                                                            href={item.contentLink}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={e => e.stopPropagation()}
                                                            className="inline-flex items-center gap-1 text-[7px] sm:text-xs font-bold text-blue-500 bg-blue-500/10 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-blue-500/20 hover:bg-blue-500/20"
                                                        >
                                                            <LinkIcon size={10} /> Link
                                                        </a>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[7px] sm:text-xs font-bold text-slate-400 bg-slate-500/10 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-slate-500/20">
                                                            <LinkIcon size={10} /> Kosong
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="p-2 sm:p-3 md:p-4 align-middle">
                                                    {item.metrics ? (
                                                        <div className={`grid gap-1 sm:gap-2 text-center w-full text-[7px] sm:text-xs ${item.platform === Platform.INSTAGRAM ? 'grid-cols-3 sm:grid-cols-6 max-w-[250px] sm:max-w-[400px]' : 'grid-cols-2.5 sm:grid-cols-5 max-w-[200px] sm:max-w-[350px]'}`}>
                                                            {item.platform === Platform.INSTAGRAM && (
                                                                <div className="hidden sm:block"><span className="block text-[6px] sm:text-[10px] text-slate-400 font-bold uppercase">Reach</span><span className="text-[8px] sm:text-xs font-black text-slate-800">{(item.metrics as any).reach?.toLocaleString() || 0}</span></div>
                                                            )}
                                                            <div><span className="block text-[6px] sm:text-[10px] text-slate-400 font-bold uppercase">Views</span><span className="text-[8px] sm:text-xs font-black text-slate-800">{(item.metrics.views || 0).toLocaleString()}</span></div>
                                                            <div><span className="block text-[6px] sm:text-[10px] text-slate-400 font-bold uppercase">Likes</span><span className="text-[8px] sm:text-xs font-black text-slate-800">{(item.metrics.likes || 0).toLocaleString()}</span></div>
                                                            <div><span className="block text-[6px] sm:text-[10px] text-slate-400 font-bold uppercase">Comm</span><span className="text-[8px] sm:text-xs font-black text-slate-800">{(item.metrics.comments || 0).toLocaleString()}</span></div>
                                                            <div><span className="block text-[6px] sm:text-[10px] text-slate-400 font-bold uppercase">Share</span><span className="text-[8px] sm:text-xs font-black text-slate-800">{(item.metrics.shares || 0).toLocaleString()}</span></div>
                                                            <div className="hidden sm:block"><span className="block text-[6px] sm:text-[10px] text-slate-400 font-bold uppercase">Save</span><span className="text-[8px] sm:text-xs font-black text-slate-800">{(item.metrics.saves || 0).toLocaleString()}</span></div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center"><span className="text-[7px] sm:text-xs text-slate-400 italic">Belum</span></div>
                                                    )}
                                                </td>
                                                <td className="p-2 sm:p-3 md:p-4 align-middle text-right">
                                                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                                                        {/* TOMBOL INPUT MANUAL */}
                                                        <Button
                                                            size="sm"
                                                            className="h-7 sm:h-8 px-2 sm:px-3 text-[7px] sm:text-xs font-bold rounded-lg border-2 border-pink-500/30 text-pink-500 hover:bg-pink-500/10 hover:border-pink-500/50 shadow-sm hidden sm:flex"
                                                            onClick={(e) => openManualInput(e, item)}
                                                            title="Input Metrics Manual"
                                                        >
                                                            <Edit3 size={12} className="mr-1" /> Input
                                                        </Button>
                                                        <button
                                                            onClick={(e) => openManualInput(e, item)}
                                                            className="p-1 sm:p-2 text-pink-300 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition-colors sm:hidden"
                                                            title="Input Metrics"
                                                        >
                                                            <Edit3 size={12} />
                                                        </button>

                                                        <button onClick={(e) => handleDelete(e, item.id)} className="p-1 sm:p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                            <Trash2 size={14} sm:size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* EXPANDED ROW DETAIL */}
                                            {expandedRowId === item.id && (
                                                <tr className="bg-purple-50/30 animate-in slide-in-from-top-2 duration-200">
                                                    <td colSpan={6} className="p-3 sm:p-4 md:p-6 border-b-2 border-slate-100">
                                                        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6">
                                                            {/* Left: Detailed Metrics with NEW FORMULA */}
                                                            <div className="flex-1 space-y-2 sm:space-y-4">
                                                                <div className="flex justify-between items-center">
                                                                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-2"><TrendingUp size={14} sm:size={18} className="text-accent" /> Details</h4>
                                                                    {(item.metrics as any)?.isManual && (
                                                                        <span className="text-[8px] sm:text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-bold border border-pink-200">
                                                                            Manual
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {item.metrics ? (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                                                                        <div className="bg-white p-2 sm:p-4 rounded-lg sm:rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                                            <div className="absolute top-0 right-0 p-1">
                                                                                <TrendingUp size={40} className="text-slate-50 opacity-50 -rotate-12" />
                                                                            </div>
                                                                            <div className="flex justify-between items-start mb-1 sm:mb-2 relative z-10">
                                                                                <span className="text-[7px] sm:text-xs font-bold text-slate-400 uppercase">ER</span>
                                                                            </div>
                                                                            <p className="text-xl sm:text-3xl font-black text-slate-800 relative z-10">
                                                                                {calculateER(item.metrics).toFixed(2)}%
                                                                            </p>
                                                                            <p className="text-[7px] sm:text-[10px] text-slate-400 mt-0.5 sm:mt-1 relative z-10 font-medium">
                                                                                Interaksi/Views
                                                                            </p>
                                                                        </div>
                                                                        <div className="bg-white p-2 sm:p-4 rounded-lg sm:rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                                            <div className="absolute top-0 right-0 p-1">
                                                                                <Zap size={40} className="text-slate-50 opacity-50 -rotate-12" />
                                                                            </div>
                                                                            <div className="flex justify-between items-start mb-1 sm:mb-2 relative z-10">
                                                                                <span className="text-[7px] sm:text-xs font-bold text-slate-400 uppercase">Total</span>
                                                                            </div>
                                                                            <p className="text-xl sm:text-3xl font-black text-slate-800 relative z-10">
                                                                                {calculateInteractions(item.metrics).toLocaleString()}
                                                                            </p>
                                                                            <p className="text-[7px] sm:text-[10px] text-slate-400 mt-0.5 sm:mt-1 relative z-10 font-medium">
                                                                                L+C+S+V
                                                                            </p>
                                                                        </div>
                                                                        {/* Additional Stats Display */}
                                                                        {(item.metrics as any).reach > 0 && (
                                                                            <div className="col-span-1 sm:col-span-2 bg-blue-50 p-2 sm:p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                                                                                <span className="text-[7px] sm:text-xs font-bold text-blue-500 uppercase">Reach</span>
                                                                                <span className="font-black text-blue-900 text-xs sm:text-sm">{(item.metrics as any).reach.toLocaleString()}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-slate-100 p-3 sm:p-6 rounded-lg sm:rounded-xl text-center text-slate-400 italic text-[8px] sm:text-sm">Belum ada data detail.</div>
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
                        <div className="relative w-full max-w-lg flex flex-col animate-bounce-in shadow-hard rounded-xl bg-card border-2 border-slate-800 overflow-hidden">

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

                            <form onSubmit={saveManualMetrics} className="p-6 space-y-5 bg-card">
                                <div className="p-3 bg-yellow-500/10 border-2 border-yellow-500/20 rounded-lg text-xs text-yellow-600 font-bold mb-2 flex gap-2 items-center">
                                    <Zap size={14} /> Update data secara manual untuk hasil yang presisi.
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Conditional Field: Reach (Only IG) */}
                                    {selectedItemForInput?.platform === Platform.INSTAGRAM && (
                                        <div className="col-span-2">
                                            <div className="flex flex-col gap-1 w-full">
                                                <label className="font-bold text-xs text-slate-500 ml-1 flex items-center gap-1"><BarChart2 size={12} /> Reach / Jangkauan</label>
                                                <input
                                                    type="number"
                                                    className="bg-transparent border-2 border-slate-300 text-foreground rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                                    value={manualMetrics.reach}
                                                    onChange={(e) => setManualMetrics({ ...manualMetrics, reach: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-1 w-full">
                                        <label className="font-bold text-xs text-slate-500 ml-1 flex items-center gap-1"><Eye size={12} /> Total Views</label>
                                        <input
                                            type="number"
                                            className="bg-transparent border-2 border-slate-300 text-foreground rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                            value={manualMetrics.views}
                                            onChange={(e) => setManualMetrics({ ...manualMetrics, views: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 w-full">
                                        <label className="font-bold text-xs text-slate-500 ml-1 flex items-center gap-1"><Heart size={12} /> Likes</label>
                                        <input
                                            type="number"
                                            className="bg-transparent border-2 border-slate-300 text-foreground rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                            value={manualMetrics.likes}
                                            onChange={(e) => setManualMetrics({ ...manualMetrics, likes: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 w-full">
                                        <label className="font-bold text-xs text-slate-500 ml-1 flex items-center gap-1"><MessageSquare size={12} /> Comments</label>
                                        <input
                                            type="number"
                                            className="bg-transparent border-2 border-slate-300 text-foreground rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                            value={manualMetrics.comments}
                                            onChange={(e) => setManualMetrics({ ...manualMetrics, comments: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 w-full">
                                        <label className="font-bold text-xs text-slate-500 ml-1 flex items-center gap-1"><Share2 size={12} /> Shares</label>
                                        <input
                                            type="number"
                                            className="bg-transparent border-2 border-slate-300 text-foreground rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                            value={manualMetrics.shares}
                                            onChange={(e) => setManualMetrics({ ...manualMetrics, shares: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 w-full">
                                        <label className="font-bold text-xs text-slate-500 ml-1 flex items-center gap-1"><Bookmark size={12} /> Saves</label>
                                        <input
                                            type="number"
                                            className="bg-transparent border-2 border-slate-300 text-foreground rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
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

            {/* ═══════════════════════════════════════════════════════════════════
                FULL MONTHLY REPORT MODAL
                ═══════════════════════════════════════════════════════════════════ */}
            <Modal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                title={
                    <span className="flex items-center gap-2">
                        <FileBarChart size={20} />
                        Full Monthly Report
                    </span>
                }
                maxWidth="max-w-[85vw]"
            >
                <div className="space-y-8">
                    {/* ── Filter Bar ── */}
                    <div className="flex flex-wrap items-center gap-3 bg-slate-50 border-2 border-slate-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">
                            <Filter size={14} /> Filter Report
                        </div>
                        <div className="w-44">
                            <select
                                value={reportFilterAccount}
                                onChange={e => setReportFilterAccount(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 bg-white transition-colors"
                            >
                                <option value="all">Semua Akun</option>
                                {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div className="w-40">
                            <select
                                value={reportFilterPlatform}
                                onChange={e => setReportFilterPlatform(e.target.value)}
                                className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 bg-white transition-colors"
                            >
                                <option value="all">Semua Platform</option>
                                <option value={Platform.INSTAGRAM}>Instagram</option>
                                <option value={Platform.TIKTOK}>TikTok</option>
                                <option value={Platform.YOUTUBE}>YouTube</option>
                                <option value={Platform.LINKEDIN}>LinkedIn</option>
                                <option value={Platform.FACEBOOK}>Facebook</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 border-2 border-slate-300 rounded-xl px-3 py-2 bg-white">
                            <Calendar size={14} className="text-indigo-500" />
                            <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="text-xs font-bold outline-none bg-transparent w-28" />
                            <span className="text-slate-300 text-xs font-black">—</span>
                            <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="text-xs font-bold outline-none bg-transparent w-28" />
                        </div>
                        <div className="ml-auto text-xs font-bold text-slate-500">
                            {reportData.totalPosts} konten ditemukan
                        </div>
                    </div>

                    {/* ── Section 1: Total Metrics Cards ── */}
                    <div>
                        <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                            <BarChart2 size={20} className="text-indigo-500" />
                            Ringkasan Metrics Bulanan
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: 'Total Reach', value: reportData.totalReach, color: 'from-blue-500 to-blue-600', icon: <Globe size={20} /> },
                                { label: 'Total Views', value: reportData.totalViews, color: 'from-yellow-400 to-amber-500', icon: <Eye size={20} /> },
                                { label: 'Engagement Rate', value: `${reportData.avgER.toFixed(2)}%`, color: 'from-pink-500 to-rose-600', icon: <TrendingUp size={20} /> },
                                { label: 'Total Interaksi', value: reportData.totalInteractions, color: 'from-purple-500 to-purple-700', icon: <Zap size={20} /> },
                                { label: 'Total Likes', value: reportData.totalLikes, color: 'from-red-400 to-red-500', icon: <Heart size={20} /> },
                                { label: 'Total Comments', value: reportData.totalComments, color: 'from-indigo-400 to-indigo-600', icon: <MessageSquare size={20} /> },
                                { label: 'Total Shares', value: reportData.totalShares, color: 'from-emerald-400 to-emerald-600', icon: <Share2 size={20} /> },
                                { label: 'Total Saves', value: reportData.totalSaves, color: 'from-amber-400 to-orange-500', icon: <Bookmark size={20} /> }
                            ].map((card, i) => (
                                <div key={i} className={`bg-gradient-to-br ${card.color} p-4 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0px_#1e293b] text-white relative overflow-hidden`}>
                                    <div className="absolute top-2 right-2 opacity-20">{card.icon}</div>
                                    <p className="text-[9px] font-black uppercase tracking-wider opacity-90 mb-1">{card.label}</p>
                                    <p className="text-2xl font-black">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Section 2: Growth Charts ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Weekly Growth Line Chart */}
                        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-hard">
                            <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                <TrendingUp size={16} className="text-indigo-500" />
                                Grafik Pertumbuhan Per Minggu
                            </h4>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={reportData.growthChartData}>
                                        <defs>
                                            <linearGradient id="reportReach" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="reportViews" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="reportInteractions" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                                        <YAxis stroke="#64748b" fontSize={11} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                                        <Area type="monotone" dataKey="reach" name="Reach" stroke="#3b82f6" strokeWidth={2} fill="url(#reportReach)" />
                                        <Area type="monotone" dataKey="views" name="Views" stroke="#f59e0b" strokeWidth={2} fill="url(#reportViews)" />
                                        <Area type="monotone" dataKey="interactions" name="Interaksi" stroke="#8b5cf6" strokeWidth={2} fill="url(#reportInteractions)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Metrics Comparison Bar Chart */}
                        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-hard">
                            <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                <Layers size={16} className="text-purple-500" />
                                Komparasi Metrics Engagement
                            </h4>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={reportData.metricsBarData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                                        <YAxis stroke="#64748b" fontSize={11} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Bar dataKey="value" name="Total" radius={[8, 8, 0, 0]}>
                                            {reportData.metricsBarData.map((entry, index) => (
                                                <Cell key={index} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* ── Section 3: Top 3 & Bottom 3 Content ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top 3 */}
                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-2xl p-5">
                            <h4 className="text-sm font-black text-emerald-800 mb-4 flex items-center gap-2">
                                <Award size={18} className="text-emerald-600" />
                                🏆 Top 3 Konten Terbaik
                            </h4>
                            <div className="space-y-3">
                                {reportData.top3.length > 0 ? reportData.top3.map((item, i) => (
                                    <div key={item.id} className="bg-white border-2 border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 line-clamp-1">{item.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{item.platform}</span>
                                                <span className="text-[9px] font-black text-slate-500">{item.date ? new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-600">
                                                <span className="flex items-center gap-1"><Heart size={10} className="text-pink-500" />{(item.metrics?.likes || 0).toLocaleString()}</span>
                                                <span className="flex items-center gap-1"><MessageSquare size={10} className="text-indigo-500" />{(item.metrics?.comments || 0).toLocaleString()}</span>
                                                <span className="flex items-center gap-1"><Share2 size={10} className="text-emerald-500" />{(item.metrics?.shares || 0).toLocaleString()}</span>
                                                <span className="flex items-center gap-1 ml-auto font-black text-emerald-600"><ArrowUpRight size={10} />ER: {item._er.toFixed(2)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-xs text-slate-500 text-center py-4">Belum ada data metrics</p>
                                )}
                            </div>
                        </div>

                        {/* Bottom 3 */}
                        <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-5">
                            <h4 className="text-sm font-black text-red-800 mb-4 flex items-center gap-2">
                                <AlertTriangle size={18} className="text-red-500" />
                                📉 3 Konten Terendah / Not Perform
                            </h4>
                            <div className="space-y-3">
                                {reportData.bottom3.length > 0 ? reportData.bottom3.map((item, i) => (
                                    <div key={item.id} className="bg-white border-2 border-red-100 rounded-xl p-4 flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black text-sm shrink-0">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 line-clamp-1">{item.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{item.platform}</span>
                                                <span className="text-[9px] font-black text-slate-500">{item.date ? new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-600">
                                                <span className="flex items-center gap-1"><Heart size={10} className="text-pink-500" />{(item.metrics?.likes || 0).toLocaleString()}</span>
                                                <span className="flex items-center gap-1"><MessageSquare size={10} className="text-indigo-500" />{(item.metrics?.comments || 0).toLocaleString()}</span>
                                                <span className="flex items-center gap-1"><Share2 size={10} className="text-emerald-500" />{(item.metrics?.shares || 0).toLocaleString()}</span>
                                                <span className="flex items-center gap-1 ml-auto font-black text-red-500"><ArrowDownRight size={10} />ER: {item._er.toFixed(2)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-xs text-slate-500 text-center py-4">Belum ada data metrics</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Section 4: Total Posted + Pillar Pie + Posting Frequency ── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Total Konten */}
                        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 border-2 border-slate-800 rounded-2xl p-6 text-white shadow-hard relative overflow-hidden">
                            <div className="absolute top-4 right-4 opacity-20"><Hash size={60} /></div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Total Konten Posted</p>
                            <p className="text-5xl font-black">{reportData.totalPosts}</p>
                            <p className="text-xs font-bold opacity-70 mt-2">konten dipublikasikan pada periode ini</p>
                            <div className="mt-4 flex items-center gap-2 bg-white/15 px-3 py-2 rounded-xl text-[10px] font-bold">
                                <Target size={12} />
                                Rata-rata {reportData.totalPosts > 0 ? Math.ceil(reportData.totalPosts / 4) : 0} konten / minggu
                            </div>
                        </div>

                        {/* Pillar Pie Chart */}
                        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-hard">
                            <h4 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2">
                                <Layers size={16} className="text-indigo-500" />
                                Content Pillar Overview
                            </h4>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={reportData.pillarPieData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={70}
                                            innerRadius={35}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                            labelLine={false}
                                            fontSize={9}
                                            fontWeight={700}
                                        >
                                            {reportData.pillarPieData.map((_, i) => (
                                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#1e293b" strokeWidth={2} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {reportData.pillarPieData.map((p, i) => (
                                    <span key={p.name} className="flex items-center gap-1 text-[9px] font-bold text-slate-600">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        {p.name}: {p.value}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Posting Frequency Heatmap */}
                        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-hard">
                            <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                <Clock size={16} className="text-amber-500" />
                                Frekuensi Posting Per Hari
                            </h4>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={reportData.postingFreqData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                                        <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Bar dataKey="posts" name="Posts" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold mt-2 text-center">
                                Hari terbaik: <span className="text-indigo-600">{reportData.postingFreqData.reduce((best, d) => d.posts > best.posts ? d : best, { name: '-', posts: 0 }).name}</span>
                            </p>
                        </div>
                    </div>

                    {/* ── Section 5: Platform Distribution (jika multi-platform) ── */}
                    {reportFilterPlatform === 'all' && reportData.platformPieData.length > 1 && (
                        <div className="bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-hard">
                            <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                <Users size={16} className="text-teal-500" />
                                Distribusi Platform
                            </h4>
                            <div className="flex items-center gap-8">
                                <div className="h-[180px] w-[180px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={reportData.platformPieData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" fontSize={10} fontWeight={700}>
                                                {reportData.platformPieData.map((_, i) => (
                                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#1e293b" strokeWidth={2} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                    {reportData.platformPieData.map((p, i) => (
                                        <div key={p.name} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                            <div>
                                                <p className="text-xs font-black text-slate-800">{p.name}</p>
                                                <p className="text-lg font-black text-slate-600">{p.value} <span className="text-[9px] font-bold text-slate-400">konten</span></p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Section 6: Monthly Notes (Editable + Saved) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-[#FFFDF5] border-2 border-amber-300 rounded-2xl p-6 relative">
                            <div className="absolute top-0 left-0 w-2 h-full bg-amber-400 rounded-l-2xl" />
                            <h4 className="text-sm font-black text-amber-800 mb-3 flex items-center gap-2">
                                <PenTool size={16} className="text-amber-600" />
                                📝 Catatan Bulan Ini
                            </h4>
                            <textarea
                                value={reportNotes}
                                onChange={e => setReportNotes(e.target.value)}
                                rows={6}
                                placeholder="Tulis catatan performance bulan ini... (mis: Kolaborasi dengan influencer X meningkatkan reach 3x, Konten edukasi mendapat engagement tertinggi, dll.)"
                                className="w-full bg-transparent text-sm text-slate-700 font-medium outline-none resize-none placeholder:text-amber-300 leading-relaxed"
                            />
                        </div>

                        <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-6 relative">
                            <div className="absolute top-0 left-0 w-2 h-full bg-blue-400 rounded-l-2xl" />
                            <h4 className="text-sm font-black text-blue-800 mb-3 flex items-center gap-2">
                                <Target size={16} className="text-blue-600" />
                                🎯 Next Plan Strategy & Saran
                            </h4>
                            <textarea
                                value={reportNextPlan}
                                onChange={e => setReportNextPlan(e.target.value)}
                                rows={6}
                                placeholder="Tulis rencana dan strategi bulan depan... (mis: Fokus pada konten video pendek, Tingkatkan posting di hari Senin & Rabu, Target reach 50K, dll.)"
                                className="w-full bg-transparent text-sm text-slate-700 font-medium outline-none resize-none placeholder:text-blue-300 leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* Save Notes Button */}
                    <div className="flex justify-center">
                        <button
                            onClick={saveReportNotesToStorage}
                            className={`flex items-center gap-2 px-8 py-3 rounded-2xl border-2 border-slate-800 font-black text-sm shadow-hard transition-all ${savingReportNotes ? 'bg-emerald-500 text-white' : 'bg-white text-slate-800 hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-hard-hover'}`}
                        >
                            {savingReportNotes ? (
                                <><Save size={16} /> Tersimpan! ✓</>
                            ) : (
                                <><Save size={16} /> Simpan Catatan & Plan</>
                            )}
                        </button>
                    </div>

                    {/* ── Section 7: Rekomendasi AI / Insight Otomatis ── */}
                    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border-2 border-indigo-300 rounded-2xl p-6">
                        <h4 className="text-sm font-black text-indigo-800 mb-4 flex items-center gap-2">
                            <Lightbulb size={18} className="text-indigo-500" />
                            💡 Rekomendasi & Insight Otomatis
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Dynamic recommendations based on data */}
                            <div className="bg-white/80 border border-indigo-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Star size={14} className="text-amber-500" />
                                    <span className="text-xs font-black text-slate-800">Optimasi Engagement Rate</span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                    {reportData.avgER >= 3
                                        ? "✅ ER Anda sudah bagus! Pertahankan jenis konten yang mendapat engagement tinggi dan eksperimen dengan format baru."
                                        : reportData.avgER >= 1
                                            ? "⚡ ER cukup baik. Coba tambahkan CTA yang kuat dan gunakan hook di 3 detik pertama untuk meningkatkan interaksi."
                                            : "🔴 ER masih rendah. Fokus pada konten yang memancing komentar (pertanyaan, polling) dan sesuaikan waktu posting."}
                                </p>
                            </div>

                            <div className="bg-white/80 border border-indigo-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock size={14} className="text-indigo-500" />
                                    <span className="text-xs font-black text-slate-800">Frekuensi Posting</span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                    {reportData.totalPosts >= 20
                                        ? "✅ Volume posting bagus! Pastikan kualitas tetap terjaga meski kuantitas tinggi."
                                        : reportData.totalPosts >= 8
                                            ? "⚡ Volume cukup. Tingkatkan menjadi 4-5 konten/minggu untuk algoritma yang lebih optimal."
                                            : "🔴 Volume posting rendah. Idealnya minimal 3-4 konten per minggu untuk menjaga konsistensi di feed."}
                                </p>
                            </div>

                            <div className="bg-white/80 border border-indigo-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Layers size={14} className="text-purple-500" />
                                    <span className="text-xs font-black text-slate-800">Diversifikasi Content Pillar</span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                    {reportData.pillarPieData.length >= 3
                                        ? "✅ Variasi pillar sudah baik. Monitor mana yang paling engage dan beri porsi lebih."
                                        : "⚡ Coba tambah variasi content pillar (edukasi, behind-the-scene, testimonial, tips) agar audiens tidak bosan."}
                                </p>
                            </div>

                            <div className="bg-white/80 border border-indigo-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target size={14} className="text-emerald-500" />
                                    <span className="text-xs font-black text-slate-800">Kualitas vs Kuantitas</span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                    {reportData.top3.length > 0 && reportData.top3[0]._interactions > reportData.totalInteractions * 0.3
                                        ? "⚡ Engagement terlalu bergantung pada 1 konten viral. Coba stabilkan performa seluruh konten."
                                        : "✅ Distribusi engagement cukup merata. Pertahankan konsistensi kualitas konten."}
                                </p>
                            </div>

                            <div className="bg-white/80 border border-indigo-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Share2 size={14} className="text-teal-500" />
                                    <span className="text-xs font-black text-slate-800">Saves & Shares Ratio</span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                    {(reportData.totalSaves + reportData.totalShares) > reportData.totalLikes * 0.1
                                        ? "✅ Rasio saves/shares bagus! Konten Anda dianggap 'bookmark-worthy' oleh audiens."
                                        : "⚡ Tingkatkan konten yang 'saveable' seperti tips, infografis, atau checklist untuk boost shareability."}
                                </p>
                            </div>

                            <div className="bg-white/80 border border-indigo-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Eye size={14} className="text-blue-500" />
                                    <span className="text-xs font-black text-slate-800">Reach vs Views Efficiency</span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                    {reportData.totalReach > 0 && reportData.totalViews > reportData.totalReach * 0.8
                                        ? "✅ Views per reach tinggi — audiens menonton konten Anda secara penuh."
                                        : reportData.totalReach > 0
                                            ? "⚡ Views/reach bisa ditingkatkan. Perbaiki thumbnail, judul, dan hook awal konten."
                                            : "Data reach belum tersedia. Input reach secara manual untuk analisis lebih akurat."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
};