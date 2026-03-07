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
    Users,
    Crown,
    Youtube,
    Facebook,
    Linkedin
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
import { PremiumLockScreen } from '../components/PremiumLockScreen';

const ChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card p-3 border-2 border-border shadow-[4px_4px_0px_#1e293b] rounded-xl pointer-events-none">
                {label && <p className="text-mutedForeground font-bold text-[10px] uppercase mb-1 leading-none">{label}</p>}
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
                        <p className="text-foreground font-black text-xs">
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

const getPlatformIcon = (platform: string, size = 16) => {
    switch (platform) {
        case Platform.INSTAGRAM: return <Instagram size={size} />;
        case Platform.TIKTOK: return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
            </svg>
        );
        case Platform.YOUTUBE: return <Youtube size={size} />;
        case Platform.FACEBOOK: return <Facebook size={size} />;
        case Platform.LINKEDIN: return <Linkedin size={size} />;
        default: return <Globe size={size} />;
    }
};

export const ContentDataInsight: React.FC = () => {
    const { config } = useAppConfig();
    const [data, setData] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

    const isFree = localStorage.getItem('user_subscription_package') === 'Free' && localStorage.getItem('user_role') !== 'Developer';

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
        reach: 0,
        reposts: 0
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
        const savedNotes = localStorage.getItem(`report_notes_${reportFilterAccount}_${reportFilterPlatform}_${reportStartDate}`);
        const savedPlan = localStorage.getItem(`report_plan_${reportFilterAccount}_${reportFilterPlatform}_${reportStartDate}`);

        if (savedNotes) setReportNotes(savedNotes); else setReportNotes('');
        if (savedPlan) setReportNextPlan(savedPlan); else setReportNextPlan('');
    }, [reportFilterAccount, reportFilterPlatform, reportStartDate]);

    const saveReportNotesToStorage = () => {
        setSavingReportNotes(true);
        localStorage.setItem(`report_notes_${reportFilterAccount}_${reportFilterPlatform}_${reportStartDate}`, reportNotes);
        localStorage.setItem(`report_plan_${reportFilterAccount}_${reportFilterPlatform}_${reportStartDate}`, reportNextPlan);
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
            reach: (item.metrics as any)?.reach || 0,
            reposts: item.metrics?.reposts || 0
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
        return (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0) + (m.reposts || 0);
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
        let totalReach = 0, totalViews = 0, totalLikes = 0, totalComments = 0, totalShares = 0, totalSaves = 0, totalReposts = 0;
        filtered.forEach(item => {
            const m = item.metrics || {};
            totalReach += (m as any).reach || 0;
            totalViews += m.views || 0;
            totalLikes += m.likes || 0;
            totalComments += m.comments || 0;
            totalShares += m.shares || 0;
            totalSaves += m.saves || 0;
            totalReposts += (m as any).reposts || 0;
        });
        const totalInteractions = totalLikes + totalComments + totalShares + totalSaves + totalReposts;
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
            totalReposts,
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
                    <div className="bg-yellow-400 rounded-xl p-3 text-foreground">
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
                                                    {item.platform === Platform.INSTAGRAM && (
                                                        <div className="text-center">
                                                            <p className="text-sm font-black text-foreground">{(m.reposts || 0).toLocaleString()}</p>
                                                            <p className="text-[8px] text-mutedForeground">Reposts</p>
                                                        </div>
                                                    )}
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
                                        { key: 'reposts', label: 'Reposts', icon: <RefreshCw size={14} />, condition: selectedItemForInput?.platform === Platform.INSTAGRAM },
                                        { key: 'reach', label: 'Reach', icon: <Globe size={14} /> },
                                    ].filter(f => f.condition !== false).map(({ key, label, icon }) => (
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
                        <h2 className="text-base md:text-2xl lg:text-4xl font-extrabold text-foreground font-heading tracking-tight flex items-center gap-2 sm:gap-3">
                            {config?.page_titles?.['insight']?.title || 'Content Data Insight'}
                        </h2>
                        <p className="text-slate-500 font-medium mt-0.5 md:mt-2 text-xs sm:text-sm hidden md:block">
                            {config?.page_titles?.['insight']?.subtitle || 'Analisa real-time atau input manual metrics untuk perhitungan ER yang presisi.'}
                        </p>
                    </div>

                    {/* Period Badge + Report Button */}
                    <div className="flex items-center gap-3">
                        {/* Period Indicator Badge */}
                        <div className="bg-card border-2 border-border px-2 sm:px-4 py-1 sm:py-2 rounded-xl shadow-hard transform rotate-1 hover:rotate-0 transition-transform cursor-default text-[10px] sm:text-sm">
                            <span className="font-heading font-black text-foreground uppercase tracking-wide flex items-center gap-2">
                                <Calendar size={14} className="text-accent" />
                                <span className="hidden sm:inline">{getPeriodLabel()}</span>
                            </span>
                        </div>

                        {/* Full Monthly Report Button */}
                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-2 border-border px-4 py-2 rounded-xl shadow-hard hover:shadow-hard-hover hover:-translate-y-0.5 transition-all text-xs sm:text-sm font-black flex items-center gap-2 uppercase tracking-wide"
                        >
                            <FileBarChart size={16} />
                            <span className="hidden sm:inline">Monthly Report</span>
                            {isFree && <Crown size={14} className="text-amber-300 ml-1" title="Pro Feature" />}
                        </button>
                    </div>
                </div>

                {/* Summary Cards - Premium Bento Style */}
                <div className={`grid gap-4 sm:gap-6 ${filterPlatform === Platform.TIKTOK ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>

                    {/* Reach Card */}
                    {filterPlatform !== Platform.TIKTOK && (
                        <div
                            onClick={() => setSelectedMetric('reach')}
                            className="bg-blue-600 p-5 rounded-2xl border-[3px] border-border shadow-[6px_6px_0px_var(--shadow-color)] flex flex-col justify-between h-36 relative overflow-hidden group hover:-translate-y-2 hover:shadow-[10px_10px_0px_var(--shadow-color)] transition-all duration-300 cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                <BarChart2 size={70} className="text-white" />
                            </div>
                            <div className="relative z-10 text-white">
                                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest mb-1 opacity-90">Total Reach</p>
                                <h3 className="text-2xl sm:text-4xl font-black tabular-nums">{summaryStats.reach.toLocaleString()}</h3>
                            </div>
                            <div className="relative z-10 mt-auto">
                                <span className="inline-block bg-card/20 text-white text-[10px] font-black px-3 py-1 rounded-full backdrop-blur-md border border-white/30">
                                    {getCardFooterText()}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Engagement Rate */}
                    <div
                        onClick={() => setSelectedMetric('er')}
                        className="bg-pink-600 p-5 rounded-2xl border-[3px] border-border shadow-[6px_6px_0px_var(--shadow-color)] flex flex-col justify-between h-36 relative overflow-hidden group hover:-translate-y-2 hover:shadow-[10px_10px_0px_var(--shadow-color)] transition-all duration-300 cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                            <TrendingUp size={90} className="text-white" />
                        </div>
                        <div className="relative z-10 text-white">
                            <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest mb-1 opacity-90">Engagement Rate</p>
                            <h3 className="text-2xl sm:text-4xl font-black tabular-nums">{summaryStats.er.toFixed(2)}%</h3>
                        </div>
                        <div className="relative z-10 mt-auto">
                            <span className="inline-block bg-card/20 text-white text-[10px] font-black px-3 py-1 rounded-full backdrop-blur-md border border-white/30">
                                {getCardFooterText()}
                            </span>
                        </div>
                    </div>

                    {/* Interactions */}
                    <div
                        onClick={() => setSelectedMetric('interactions')}
                        className="bg-violet-600 p-5 rounded-2xl border-[3px] border-border shadow-[6px_6px_0px_var(--shadow-color)] flex flex-col justify-between h-36 relative overflow-hidden group hover:-translate-y-2 hover:shadow-[10px_10px_0px_var(--shadow-color)] transition-all duration-300 cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                            <Zap size={70} className="text-white" />
                        </div>
                        <div className="relative z-10 text-white">
                            <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest mb-1 opacity-90">Total Interaksi</p>
                            <h3 className="text-2xl sm:text-4xl font-black tabular-nums">{summaryStats.interactions.toLocaleString()}</h3>
                        </div>
                        <div className="relative z-10 mt-auto">
                            <span className="inline-block bg-card/20 text-white text-[10px] font-black px-3 py-1 rounded-full backdrop-blur-md border border-white/30">
                                {getCardFooterText()}
                            </span>
                        </div>
                    </div>

                    {/* Views */}
                    <div
                        onClick={() => setSelectedMetric('views')}
                        className="bg-yellow-400 p-5 rounded-2xl border-[3px] border-border shadow-[6px_6px_0px_var(--shadow-color)] flex flex-col justify-between h-36 relative overflow-hidden group hover:-translate-y-2 hover:shadow-[10px_10px_0px_var(--shadow-color)] transition-all duration-300 cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                            <Eye size={70} className="text-black" />
                        </div>
                        <div className="relative z-10 text-foreground">
                            <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest mb-1 opacity-80">Content Views</p>
                            <h3 className="text-2xl sm:text-4xl font-black tabular-nums">{summaryStats.views.toLocaleString()}</h3>
                        </div>
                        <div className="relative z-10 mt-auto">
                            <span className="inline-block bg-black/10 text-foreground text-[10px] font-black px-3 py-1 rounded-full backdrop-blur-md border border-black/20">
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
                            <div className="bg-muted border-2 border-border p-4 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase">Periode Data</p>
                                    <p className="font-black text-foreground text-lg">{getPeriodLabel()}</p>
                                </div>
                                <div className={`px-4 py-2 rounded-lg font-bold text-white uppercase text-sm ${selectedMetric === 'reach' ? 'bg-blue-500' :
                                    selectedMetric === 'er' ? 'bg-pink-500' :
                                        selectedMetric === 'interactions' ? 'bg-purple-600' : 'bg-yellow-400 text-black'
                                    }`}>
                                    {selectedMetric}
                                </div>
                            </div>

                            {/* Chart Area */}
                            <div className="h-[180px] sm:h-[300px] w-full bg-card border-2 border-border rounded-xl p-3 sm:p-4 shadow-hard relative">
                                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
                            <div className="bg-[#FFFDF5] border-2 border-border rounded-xl p-6 shadow-hard relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-slate-800"></div>
                                <h4 className="font-heading font-black text-xl text-foreground mb-2 flex items-center gap-2">
                                    <TrendingUp size={24} className="text-foreground" />
                                    Hipotesa & Analisa Singkat
                                </h4>
                                <p className="text-slate-700 font-medium leading-relaxed">
                                    {getAnalysis()}
                                </p>
                                <div className="mt-4 flex gap-2">
                                    {chartData.slice(-3).map((d, i) => (
                                        <div key={i} className="bg-card border border-border p-2 rounded-lg text-xs">
                                            <span className="block font-bold text-mutedForeground">{d.name}</span>
                                            <span className="font-black text-foreground">{d.value.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Modal>
                )}

                <div className="bg-card rounded-2xl border-[3px] border-border shadow-[4px_4px_0px_var(--shadow-color)] overflow-hidden flex flex-col flex-1 min-h-0">
                    {/* Premium Toolbar */}
                    <div className="border-b-[3px] border-border p-4 bg-muted/30 flex flex-col 2xl:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-wrap items-center gap-4 w-full">
                            {/* Platform Capsules */}
                            <div className="flex bg-muted p-1.5 rounded-full border-2 border-border shadow-[4px_4px_0px_var(--shadow-color)] overflow-x-auto no-scrollbar max-w-full">
                                {['all', ...Object.values(Platform)].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setFilterPlatform(p)}
                                        className={`
                                            px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                                            ${filterPlatform === p
                                                ? 'bg-violet-600 text-white shadow-[2px_2px_0px_#4c1d95] scale-105'
                                                : 'text-slate-500 hover:text-violet-600 hover:bg-card'}
                                        `}
                                    >
                                        {p === 'all' ? 'Semua' : p}
                                    </button>
                                ))}
                            </div>

                            <div className="h-6 w-[2px] bg-slate-200 hidden xl:block" />

                            {/* Account & Date Filters */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="w-44">
                                    <Select
                                        value={filterAccount}
                                        onChange={(e) => setFilterAccount(e.target.value)}
                                        options={[{ label: 'SEMUA AKUN', value: 'all' }, ...accounts.map(acc => ({ label: acc.toUpperCase(), value: acc }))]}
                                        className="!py-2 !text-[11px] !font-black !rounded-xl !border-2 !border-border/60"
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-card border-2 border-border/60 rounded-xl px-3 py-1.5 shadow-sm">
                                    <Calendar size={14} className="text-slate-400" />
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs font-black outline-none bg-transparent w-28 uppercase" />
                                    <span className="text-slate-300 font-black">—</span>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs font-black outline-none bg-transparent w-28 uppercase" />
                                </div>
                                {(filterPlatform !== 'all' || filterAccount !== 'all' || startDate || endDate) && (
                                    <button onClick={resetFilters} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all border-2 border-transparent hover:border-rose-100 group">
                                        <X size={16} className="group-hover:rotate-90 transition-transform" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex-shrink-0 w-full 2xl:w-auto flex justify-end">
                            <Button variant="outline" size="sm" onClick={fetchData} icon={<RefreshCw size={14} />} className="h-10 !rounded-xl !border-[3.5px] !border-border !bg-background !text-foreground !font-black !shadow-[3px_3px_0px_var(--shadow-color)] hover:!translate-y-[-2px] hover:!shadow-[5px_5px_0px_var(--shadow-color)] transition-all">REFRESH DATA</Button>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left border-collapse text-[10px] sm:text-sm">
                            <thead className="border-b-2 border-border/50 sticky top-0 z-10 shadow-sm bg-card">
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
                                        <td colSpan={6} className="p-8 sm:p-12 text-center text-mutedForeground">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="animate-spin text-accent" size={24} sm:size={32} />
                                                <span className="text-xs sm:text-sm">Mengambil data...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 sm:p-12 text-center text-mutedForeground italic bg-muted/50 text-xs sm:text-sm">
                                            Tidak ada konten published yang ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item) => (
                                        <React.Fragment key={item.id}>
                                            <tr
                                                className={`transition-all duration-300 cursor-pointer group/row relative
                                                    ${expandedRowId === item.id ? 'bg-violet-50' : 'hover:bg-muted'}
                                                `}
                                                onClick={() => toggleRow(item.id)}
                                            >
                                                <td className="p-4 text-center">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${expandedRowId === item.id ? 'bg-violet-600 text-white rotate-180' : 'bg-slate-100 text-slate-400 group-hover/row:bg-slate-200 group-hover/row:text-slate-600'}`}>
                                                        <ChevronDown size={18} strokeWidth={3} />
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <div className="flex items-center gap-3">
                                                        {/* Date Label - SOFTENED */}
                                                        <div className="bg-slate-50 border-2 border-border px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-[2px_2px_0px_#f1f5f9]">
                                                            <Calendar size={14} className="text-violet-600" />
                                                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest whitespace-nowrap">
                                                                {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle max-w-xs">
                                                    <p className="font-black text-foreground text-[15px] leading-tight mb-1 group-hover/row:text-violet-600 transition-colors">{item.title}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 border-2 border-border text-slate-600 font-black uppercase tracking-widest">{item.type}</span>
                                                        <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-border">
                                                            {getPlatformIcon(item.platform, 12)}
                                                            <span className="text-[10px] font-black tracking-tight">@{item.workspaces?.account_name || '-'}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="p-4 align-middle hidden sm:table-cell">
                                                    {item.contentLink ? (
                                                        <a
                                                            href={item.contentLink}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={e => e.stopPropagation()}
                                                            className="inline-flex items-center gap-2 group/link px-4 py-2 bg-card border-[2.5px] border-border rounded-xl shadow-[3px_3px_0px_var(--shadow-color)] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_var(--shadow-color)] transition-all"
                                                        >
                                                            <LinkIcon size={14} className="text-violet-600" />
                                                            <span className="text-xs font-black text-foreground uppercase tracking-widest">BUKA</span>
                                                        </a>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border-[2.5px] border-border rounded-xl text-slate-400">
                                                            <LinkIcon size={14} />
                                                            <span className="text-xs font-black">NA</span>
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="p-4 align-middle">
                                                    {item.metrics ? (
                                                        <div className="flex items-center justify-center gap-3">
                                                            {/* Hero Metric: ER - BIGGER */}
                                                            <div className="bg-pink-100 border-2 border-pink-200 px-4 py-2.5 rounded-2xl text-center min-w-[85px] shadow-sm">
                                                                <span className="block text-[14px] font-black text-pink-700 leading-none">{calculateER(item.metrics).toFixed(1)}%</span>
                                                                <span className="text-[9px] font-black text-pink-500 uppercase tracking-widest mt-0.5 block">ER RT</span>
                                                            </div>
                                                            {/* Grid of micro-stats - VIOLET THEMED & CENTERED */}
                                                            <div className={`grid grid-cols-${item.platform === Platform.INSTAGRAM ? '6' : '5'} bg-violet-700 border-[3px] border-violet-700 p-1.5 rounded-2xl shadow-xl`}>
                                                                <div className="px-4 py-1.5 text-center border-r border-violet-600/50 min-w-[60px]">
                                                                    <span className="block text-[12px] font-black text-white leading-none">{(item.metrics.views || 0).toLocaleString()}</span>
                                                                    <span className="text-[8px] font-black text-violet-200 uppercase tracking-widest mt-0.5 block">VIEW</span>
                                                                </div>
                                                                <div className="px-4 py-1.5 text-center border-r border-violet-600/50 min-w-[60px]">
                                                                    <span className="block text-[12px] font-black text-white leading-none">{(item.metrics.likes || 0).toLocaleString()}</span>
                                                                    <span className="text-[8px] font-black text-violet-200 uppercase tracking-widest mt-0.5 block">LIKE</span>
                                                                </div>
                                                                <div className="px-4 py-1.5 text-center border-r border-violet-600/50 min-w-[60px]">
                                                                    <span className="block text-[12px] font-black text-white leading-none">{(item.metrics.comments || 0).toLocaleString()}</span>
                                                                    <span className="text-[8px] font-black text-violet-200 uppercase tracking-widest mt-0.5 block">COMM</span>
                                                                </div>
                                                                <div className="px-4 py-1.5 text-center border-r border-violet-600/50 min-w-[60px]">
                                                                    <span className="block text-[12px] font-black text-white leading-none">{(item.metrics.shares || 0).toLocaleString()}</span>
                                                                    <span className="text-[8px] font-black text-violet-200 uppercase tracking-widest mt-0.5 block">SHAR</span>
                                                                </div>
                                                                <div className={`px-4 py-1.5 text-center ${item.platform === Platform.INSTAGRAM ? 'border-r border-violet-600/50' : ''} min-w-[60px]`}>
                                                                    <span className="block text-[12px] font-black text-white leading-none">{(item.metrics.saves || 0).toLocaleString()}</span>
                                                                    <span className="text-[8px] font-black text-violet-200 uppercase tracking-widest mt-0.5 block">SAVE</span>
                                                                </div>
                                                                {item.platform === Platform.INSTAGRAM && (
                                                                    <div className="px-4 py-1.5 text-center min-w-[60px]">
                                                                        <span className="block text-[12px] font-black text-white leading-none">{(item.metrics.reposts || 0).toLocaleString()}</span>
                                                                        <span className="text-[8px] font-black text-violet-200 uppercase tracking-widest mt-0.5 block">REPOST</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-12 bg-slate-50 border-2 border-dashed border-border rounded-2xl flex items-center justify-center">
                                                            <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest italic">Belum Ada Data Metrics</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 align-middle text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="h-9 px-4 !rounded-xl !border-[2.5px] !border-border !bg-card !text-violet-600 !font-black !shadow-[3px_3px_0px_var(--shadow-color)] hover:!translate-y-[-2px] hover:!shadow-[5px_5px_0px_var(--shadow-color)] transition-all hidden sm:flex"
                                                            onClick={(e) => openManualInput(e, item)}
                                                        >
                                                            <Edit3 size={14} className="mr-2" /> INPUT
                                                        </Button>
                                                        <button
                                                            onClick={(e) => handleDelete(e, item.id)}
                                                            className="w-9 h-9 flex items-center justify-center bg-card border-2 border-border text-mutedForeground hover:text-rose-500 hover:border-rose-200 rounded-xl transition-all hover:bg-rose-50/10 shadow-sm"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* EXPANDED ROW DETAIL */}
                                            {expandedRowId === item.id && (
                                                <tr className="bg-card animate-in slide-in-from-top-4 duration-300">
                                                    <td colSpan={6} className="p-6 border-b-[3px] border-border">
                                                        <div className="flex flex-col lg:flex-row gap-6">
                                                            {/* Left: Detailed Metrics */}
                                                            <div className="flex-[1.5] space-y-4">
                                                                <div className="flex justify-between items-center">
                                                                    <h4 className="font-black text-foreground text-base flex items-center gap-2 uppercase tracking-widest"><TrendingUp size={20} className="text-violet-600" /> Metrics Breakdown</h4>
                                                                    {(item.metrics as any)?.isManual && (
                                                                        <span className="text-[10px] bg-yellow-400 text-slate-950 px-3 py-1 rounded-full font-black border-2 border-border shadow-[2px_2px_0px_#000] uppercase">
                                                                            PENGINPUTAN MANUAL
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {item.metrics ? (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                        <div className="bg-card p-5 rounded-2xl border-[3px] border-border shadow-[4px_4px_0px_#4c1d95] relative overflow-hidden group/detail">
                                                                            <div className="absolute -top-4 -right-4 p-2 opacity-5 scale-150 rotate-12 group-hover/detail:opacity-10 transition-opacity">
                                                                                <TrendingUp size={100} className="text-violet-900" />
                                                                            </div>
                                                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Engagement Rate</span>
                                                                            <p className="text-4xl font-black text-foreground tabular-nums">
                                                                                {calculateER(item.metrics).toFixed(2)}%
                                                                            </p>
                                                                            <p className="text-[10px] font-bold text-slate-500 mt-2 bg-slate-100 px-2 py-1 rounded-lg inline-block">
                                                                                Formula: (Interaksi / Views) × 100
                                                                            </p>
                                                                        </div>
                                                                        <div className="bg-card p-5 rounded-2xl border-[3px] border-border shadow-[4px_4px_0px_#4c1d95] relative overflow-hidden group/detail">
                                                                            <div className="absolute -top-4 -right-4 p-2 opacity-5 scale-150 rotate-12 group-hover/detail:opacity-10 transition-opacity">
                                                                                <Zap size={100} className="text-violet-900" />
                                                                            </div>
                                                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Interaksi</span>
                                                                            <p className="text-4xl font-black text-foreground tabular-nums">
                                                                                {calculateInteractions(item.metrics).toLocaleString()}
                                                                            </p>
                                                                            <p className="text-[10px] font-bold text-slate-500 mt-2 bg-slate-100 px-2 py-1 rounded-lg inline-block">
                                                                                Gabungan: L + C + S + Sv
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-slate-50 p-12 rounded-2xl border-4 border-dashed border-border text-center text-slate-400 font-black uppercase tracking-widest">Belum ada data detail.</div>
                                                                )}
                                                            </div>

                                                            {/* Right: Content Details */}
                                                            <div className="flex-1 bg-slate-900 p-6 rounded-2xl border-[3px] border-border shadow-[6px_6px_0px_#4c1d95] text-white relative">
                                                                <div className="absolute top-4 right-4 text-violet-400">
                                                                    <FileText size={24} />
                                                                </div>
                                                                <h4 className="font-black text-white text-base mb-6 uppercase tracking-widest flex items-center gap-2">
                                                                    Informasi Konten
                                                                </h4>

                                                                <div className="space-y-4">
                                                                    <div className="p-4 bg-card/5 rounded-xl border border-white/10">
                                                                        <span className="block text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1">Pillar Konten</span>
                                                                        <span className="font-black text-white text-lg">{item.pillar || 'GENERAL'}</span>
                                                                    </div>
                                                                    <div className="p-4 bg-card/5 rounded-xl border border-white/10">
                                                                        <span className="block text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1">PIC / Talent</span>
                                                                        <span className="font-black text-white text-lg">{item.pic || item.assignee || 'TEAM-WIDE'}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between opacity-60">
                                                                    <div className="flex items-center gap-2">
                                                                        <RefreshCw size={12} />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Update: {item.metrics?.lastUpdated ? new Date(item.metrics.lastUpdated).toLocaleTimeString() : 'N/A'}</span>
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
                        <div className="relative w-full max-w-lg flex flex-col animate-bounce-in shadow-hard rounded-xl bg-card border-2 border-border overflow-hidden">

                            {/* Header Pop Art */}
                            <div className="px-6 py-4 border-b-2 border-border bg-pink-500 text-white flex items-center justify-between shrink-0 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-card/10 rounded-bl-full -z-0"></div>
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
                                                    className="bg-transparent border-2 border-border/60 text-foreground rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
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
                                            className="bg-transparent border-2 border-border/60 text-foreground rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                            value={manualMetrics.views}
                                            onChange={(e) => setManualMetrics({ ...manualMetrics, views: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 w-full">
                                        <label className="font-bold text-xs text-slate-500 ml-1 flex items-center gap-1"><Heart size={12} /> Likes</label>
                                        <input
                                            type="number"
                                            className="bg-transparent border-2 border-border/60 text-foreground rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                            value={manualMetrics.likes}
                                            onChange={(e) => setManualMetrics({ ...manualMetrics, likes: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 w-full">
                                        <label className="font-bold text-xs text-slate-500 ml-1 flex items-center gap-1"><MessageSquare size={12} /> Comments</label>
                                        <input
                                            type="number"
                                            className="bg-transparent border-2 border-border/60 text-foreground rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                            value={manualMetrics.comments}
                                            onChange={(e) => setManualMetrics({ ...manualMetrics, comments: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 w-full">
                                        <label className="font-bold text-xs text-slate-500 ml-1 flex items-center gap-1"><Share2 size={12} /> Shares</label>
                                        <input
                                            type="number"
                                            className="bg-transparent border-2 border-border/60 text-foreground rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                            value={manualMetrics.shares}
                                            onChange={(e) => setManualMetrics({ ...manualMetrics, shares: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 w-full text-left">
                                        <label className="font-bold text-xs text-slate-500 ml-1 flex items-center gap-1"><Bookmark size={12} /> Saves</label>
                                        <input
                                            type="number"
                                            className="bg-transparent border-2 border-border/60 text-foreground rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                            value={manualMetrics.saves}
                                            onChange={(e) => setManualMetrics({ ...manualMetrics, saves: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>

                                    {/* Conditional Field: Repost (Only IG) */}
                                    {selectedItemForInput?.platform === Platform.INSTAGRAM && (
                                        <div className="flex flex-col gap-1 w-full text-left">
                                            <label className="font-bold text-xs text-slate-500 ml-1 flex items-center gap-1"><RefreshCw size={12} /> Reposts</label>
                                            <input
                                                type="number"
                                                className="bg-transparent border-2 border-border/60 text-foreground rounded-lg px-4 py-3 outline-none focus:border-pink-500 focus:shadow-[4px_4px_0px_0px_#EC4899] w-full transition-all"
                                                value={manualMetrics.reposts}
                                                onChange={(e) => setManualMetrics({ ...manualMetrics, reposts: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t-2 border-border/50 flex justify-end gap-3">
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
                    <div className="flex items-center gap-2">
                        <FileBarChart size={20} />
                        Full Monthly Report Dashboard
                    </div>
                }
                maxWidth="max-w-[98vw]"
            >
                {isFree ? (
                    <div className="py-4">
                        <PremiumLockScreen
                            title="Monthly Report Terkunci"
                            description="Dapatkan laporan performa konten bulanan secara komprehensif, insight AI otomatis, dan fitur ekspor ke PDF. Upgrade untuk membuka fitur pro ini."
                        />
                    </div>
                ) : (
                    <div className="p-4 space-y-6 max-h-[96vh] overflow-y-auto no-scrollbar">
                        {/* ── ROW 1: Filters ── */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 flex flex-wrap items-center gap-3 bg-slate-50 border-2 border-border rounded-3xl p-3 shadow-sm">
                                <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest px-3 border-r-2 border-border">
                                    <Filter size={14} />
                                </div>
                                <div className="w-44">
                                    <select
                                        value={reportFilterAccount}
                                        onChange={e => setReportFilterAccount(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-card border-2 border-border rounded-xl text-xs font-black outline-none focus:border-violet-500 transition-all cursor-pointer"
                                    >
                                        <option value="all">Semua Akun</option>
                                        {accounts.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div className="w-44">
                                    <select
                                        value={reportFilterPlatform}
                                        onChange={e => setReportFilterPlatform(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-card border-2 border-border rounded-xl text-xs font-black outline-none focus:border-violet-500 transition-all cursor-pointer"
                                    >
                                        <option value="all">Semua Platform</option>
                                        <option value={Platform.INSTAGRAM}>Instagram</option>
                                        <option value={Platform.TIKTOK}>TikTok</option>
                                        <option value={Platform.YOUTUBE}>YouTube</option>
                                        <option value={Platform.LINKEDIN}>LinkedIn</option>
                                        <option value={Platform.FACEBOOK}>Facebook</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 bg-card border-2 border-border rounded-xl px-3 py-1.5 font-sans">
                                    <Calendar size={14} className="text-violet-600" />
                                    <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="text-xs font-black outline-none bg-transparent w-28" />
                                    <span className="text-slate-300 text-xs font-black px-1">—</span>
                                    <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="text-xs font-black outline-none bg-transparent w-28" />
                                </div>
                                <div className="ml-auto flex items-center gap-4 pr-2">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                        FILTERS APPLIED
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ── ROW 2: Metrics Grid ── */}
                        <div className={`grid grid-cols-3 md:grid-cols-5 lg:grid-cols-${reportFilterPlatform === Platform.TIKTOK ? '7' : '9'} gap-3`}>
                            {[
                                { label: 'Reach', value: reportData.totalReach, color: 'blue', icon: <Globe size={14} /> },
                                { label: 'Views', value: reportData.totalViews, color: 'amber', icon: <Eye size={14} /> },
                                { label: 'ER RT', value: `${reportData.avgER.toFixed(2)}%`, color: 'pink', icon: <TrendingUp size={14} /> },
                                { label: 'Interaksi', value: reportData.totalInteractions, color: 'indigo', icon: <Zap size={14} /> },
                                { label: 'Likes', value: reportData.totalLikes, color: 'red', icon: <Heart size={14} /> },
                                { label: 'Comment', value: reportData.totalComments, color: 'blue', icon: <MessageSquare size={14} /> },
                                { label: 'Share', value: reportData.totalShares, color: 'emerald', icon: <Share2 size={14} /> },
                                { label: 'Save', value: reportData.totalSaves, color: 'orange', icon: <Bookmark size={14} /> },
                                { label: 'Repost', value: reportData.totalReposts, color: 'violet', icon: <RefreshCw size={14} /> }
                            ].filter(card => {
                                if (reportFilterPlatform === Platform.TIKTOK) {
                                    return card.label !== 'Reach' && card.label !== 'Repost';
                                }
                                return true;
                            }).map((card, i) => (
                                <div
                                    key={i}
                                    className={`bg-${card.color}-50 border-2 border-${card.color}-200 p-3 rounded-2xl shadow-sm hover:shadow-[5px_5px_0px_#00000020] hover:shadow-${card.color}-200/50 hover:-translate-y-1 transition-all relative overflow-hidden group`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <p className={`text-xs font-black uppercase text-${card.color}-700 tracking-wider font-heading`}>{card.label}</p>
                                        <div className={`p-1.5 rounded-lg bg-card border border-${card.color}-200 text-${card.color}-600 shadow-sm group-hover:scale-110 transition-transform`}>
                                            {card.icon}
                                        </div>
                                    </div>
                                    <p className={`text-xl font-black text-${card.color}-900 leading-none`}>
                                        {card.value.toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* ── ROW 3: Charts Side by Side ── */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 lg:col-span-8 bg-card border-2 border-border rounded-3xl p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-widest">
                                        <TrendingUp size={16} className="text-violet-600" />
                                        Weekly Performance Growth
                                    </h4>
                                    <div className="flex gap-4 text-xs font-black uppercase opacity-60">
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Reach</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Views</span>
                                    </div>
                                </div>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={reportData.growthChartData}>
                                            <defs>
                                                <linearGradient id="rReachM" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} /></linearGradient>
                                                <linearGradient id="rViewsM" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} /></linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={800} axisLine={false} tickLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={11} fontWeight={800} axisLine={false} tickLine={false} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Area type="monotone" dataKey="reach" stroke="#3b82f6" strokeWidth={3} fill="url(#rReachM)" />
                                            <Area type="monotone" dataKey="views" stroke="#f59e0b" strokeWidth={3} fill="url(#rViewsM)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="col-span-12 lg:col-span-4 bg-card border-2 border-border rounded-3xl p-5 shadow-sm">
                                <h4 className="text-xs font-black text-foreground mb-6 flex items-center gap-2 uppercase tracking-widest">
                                    <BarChart2 size={16} className="text-violet-600" /> Engagement Comparison
                                </h4>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={reportData.metricsBarData}>
                                            <XAxis dataKey="name" fontSize={11} fontWeight={900} axisLine={false} tickLine={false} />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                                {reportData.metricsBarData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* ── ROW 4: Performance Lists & Total Post ── */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 lg:col-span-3 bg-emerald-50/50 border-2 border-emerald-200 rounded-3xl p-4">
                                <h4 className="text-xs font-black text-emerald-800 mb-3 flex items-center gap-2 uppercase tracking-widest">
                                    <Award size={16} className="text-emerald-600" /> Top Perform
                                </h4>
                                <div className="space-y-2">
                                    {reportData.top3.map((item, i) => (
                                        <div key={item.id} className="bg-card p-2.5 rounded-xl border border-emerald-100 flex items-center gap-3 shadow-sm hover:translate-x-1 transition-transform cursor-default">
                                            <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0">{i + 1}</div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">{item._er.toFixed(1)}% ER • {(item.metrics?.views || 0).toLocaleString()} Views</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="col-span-12 lg:col-span-3 bg-rose-50/50 border-2 border-rose-200 rounded-3xl p-4 text-rose-800">
                                <h4 className="text-xs font-black text-rose-800 mb-3 flex items-center gap-2 uppercase tracking-widest">
                                    <AlertTriangle size={16} className="text-rose-600" /> Low Perform
                                </h4>
                                <div className="space-y-2">
                                    {reportData.bottom3.map((item, i) => (
                                        <div key={item.id} className="bg-card p-2.5 rounded-xl border border-rose-100 flex items-center gap-3 shadow-sm hover:translate-x-1 transition-transform cursor-default">
                                            <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center font-black text-xs shrink-0">{i + 1}</div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-tighter">{item._er.toFixed(1)}% ER • {(item.metrics?.views || 0).toLocaleString()} Views</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="col-span-12 lg:col-span-6 bg-violet-600 border-2 border-border p-6 rounded-3xl text-white shadow-[8px_8px_0px_#1e293b] flex items-center justify-between relative overflow-hidden group">
                                <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                    <BarChart2 size={200} />
                                </div>
                                <div className="relative z-10 flex items-center gap-6">
                                    <div className="bg-card/10 p-5 rounded-2xl border border-white/20 backdrop-blur-md">
                                        <Hash size={32} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Production Summary</p>
                                        <h2 className="text-5xl font-black leading-none mb-1">
                                            {reportData.totalPosts} <span className="text-xl opacity-60">Konten</span>
                                        </h2>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black bg-card/20 px-2 py-0.5 rounded-full uppercase tracking-widest text-white">Digital Content Portfolio</span>
                                            <span className="text-[10px] font-black opacity-60 uppercase tracking-widest text-white">{reportStartDate} — {reportEndDate}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden lg:flex flex-col items-end gap-1 relative z-10">
                                    <div className="text-xs font-black uppercase tracking-widest border-b border-white/20 pb-1 mb-1">Platform Split</div>
                                    <div className="flex gap-3">
                                        {reportData.platformPieData.map((p, i) => (
                                            <div key={i} className="flex flex-col items-center">
                                                <div className="text-sm font-black">{p.value}</div>
                                                <div className="text-[10px] font-bold opacity-70 uppercase">{p.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── ROW 5: Distribution, Frequency & Notes ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-card border-2 border-border rounded-3xl p-4 shadow-sm min-h-[180px]">
                                <h4 className="text-xs font-black text-foreground mb-4 flex items-center gap-2 uppercase tracking-widest">
                                    <Layers size={14} className="text-violet-600" /> Pillar Distribution
                                </h4>
                                <div className="flex items-center">
                                    <div className="w-2/3 h-[120px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={reportData.pillarPieData} innerRadius={30} outerRadius={45} paddingAngle={5} dataKey="value">
                                                    {reportData.pillarPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip content={<ChartTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="w-1/3 space-y-1.5 pr-2">
                                        {reportData.pillarPieData.map((p, i) => (
                                            <div key={p.name} className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-foreground truncate uppercase tracking-tighter">{p.name}</p>
                                                    <p className="text-xs font-bold text-slate-400 leading-none">{p.value} Post</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-card border-2 border-border rounded-3xl p-4 shadow-sm min-h-[180px]">
                                <h4 className="text-xs font-black text-foreground mb-4 flex items-center gap-2 uppercase tracking-widest">
                                    <Clock size={14} className="text-violet-600" /> Post Frequency
                                </h4>
                                <div className="h-[120px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={reportData.postingFreqData}>
                                            <XAxis dataKey="name" fontSize={11} fontWeight={900} axisLine={false} tickLine={false} />
                                            <Bar dataKey="posts" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-amber-50/50 border-2 border-amber-200 rounded-3xl p-4 min-h-[180px]">
                                <h4 className="text-xs font-black text-amber-800 mb-2 flex items-center gap-2 uppercase tracking-widest">
                                    <PenTool size={14} className="text-amber-600" /> Catatan Performa
                                </h4>
                                <textarea
                                    value={reportNotes}
                                    onChange={e => setReportNotes(e.target.value)}
                                    rows={5}
                                    placeholder="Tulis catatan..."
                                    className="w-full bg-card/50 border border-amber-200 rounded-xl p-2 text-xs font-medium outline-none resize-none focus:bg-card transition-all no-scrollbar"
                                />
                            </div>
                            <div className="bg-blue-50/50 border-2 border-blue-200 rounded-3xl p-4 min-h-[180px]">
                                <h4 className="text-xs font-black text-blue-800 mb-2 flex items-center gap-2 uppercase tracking-widest">
                                    <Target size={14} className="text-blue-600" /> Strategi & Target
                                </h4>
                                <textarea
                                    value={reportNextPlan}
                                    onChange={e => setReportNextPlan(e.target.value)}
                                    rows={5}
                                    placeholder="Tulis strategi..."
                                    className="w-full bg-card/50 border border-blue-200 rounded-xl p-2 text-xs font-medium outline-none resize-none focus:bg-card transition-all no-scrollbar"
                                />
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-center pt-2">
                            <button
                                onClick={saveReportNotesToStorage}
                                className={`flex items-center gap-2 px-10 py-3 rounded-2xl border-2 border-border font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_#1e293b] hover:-translate-y-0.5 transition-all ${savingReportNotes ? 'bg-emerald-500 text-white' : 'bg-card text-foreground hover:bg-muted'}`}
                            >
                                {savingReportNotes ? <><Save size={16} /> Tersimpan!</> : <><Save size={16} /> Simpan Laporan</>}
                            </button>
                        </div>
                    </div>
                )}
            </Modal >
        </>
    );
};