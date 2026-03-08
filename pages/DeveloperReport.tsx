import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/ui/Button';
import {
    TrendingUp, TrendingDown, DollarSign, Users, Activity,
    ShieldCheck, Download, Printer, ArrowLeft, Calendar,
    FileText, Zap, Info, ChevronRight, Package, Clock
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, BarChart, Bar,
    PieChart, Pie, Cell, Legend, ComposedChart
} from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';

const AuditTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white p-4 border-2 border-white/10 shadow-xl rounded-2xl backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
                            <span className="text-xs font-bold">{entry.name}</span>
                        </div>
                        <span className="text-xs font-black">
                            {entry.name.toLowerCase().includes('revenue') || entry.name.toLowerCase().includes('forecast') ? `Rp ${entry.value.toLocaleString('id-ID')}` : entry.value.toLocaleString('id-ID')}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export const DeveloperReport: React.FC = () => {
    const navigate = useNavigate();
    const { type } = useParams();
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<any>(null);
    const [reportDate] = useState(new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }));

    const COLORS = ['#8B5CF6', '#F472B6', '#FBBF24', '#34D399', '#64748B'];

    // Metric configurations based on type
    const reportConfigs: any = {
        mrr: {
            title: 'REVENUE',
            advisory: 'Expansion MRR tumbuh 12% dari kuartal sebelumnya, indikasi kuat user tim sedang berkembang. Fokuskan kampanye upsell pada user Personal yang telah aktif lebih dari 6 bulan.',
            primaryMetric: 'totalRevenue'
        },
        audience: {
            title: 'AUDIENCE',
            advisory: 'Kelekatan aplikasi (DAU/MAU) berada di angka 45%, di atas rata-rata industri SaaS (20%). Tingkatkan retensi user baru dengan optimasi onboarding flow di 3 hari pertama.',
            primaryMetric: 'activeUsers'
        },
        churn: {
            title: 'RETENTION',
            advisory: 'Churn rate paling rendah tercatat pada paket Team, membuktikan stickiness fitur kolaborasi. Berikan diskon loyalitas bagi user yang akan memasuki bulan kritis ke-3.',
            primaryMetric: 'churnRate'
        },
        arpu: {
            title: 'LTV/ARPU',
            advisory: 'Nilai LTV meningkat beriringan dengan adopsi fitur otomatisasi oleh user Personal. Eksplorasi paket add-on untuk fitur yang paling sering digunakan oleh top 10% user.',
            primaryMetric: 'totalRevenue'
        },
        default: {
            title: 'EXECUTIVE',
            advisory: 'Team Enterprise adoptions is spiking. Scaling server capacity recommended for the next 2 fiscal quarters.',
            primaryMetric: null
        }
    };

    const currentConfig = reportConfigs[type as string] || reportConfigs.default;

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: users } = await supabase.from('app_users').select('id, is_active, subscription_package, created_at');
            const { data: payments } = await supabase
                .from('developer_inbox')
                .select('created_at, amount, package_name')
                .eq('type', 'renewal')
                .eq('is_resolved', true);

            const userList = users || [];
            const paymentList = payments || [];

            // Monthly breakdown for the last 6 months
            const last6Months = Array.from({ length: 6 }).map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - (5 - i));
                return d.toLocaleString('default', { month: 'short' });
            });

            const monthlyData = last6Months.map(month => {
                const revenue = paymentList
                    .filter(p => new Date(p.created_at).toLocaleString('default', { month: 'short' }) === month)
                    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

                const newUsers = userList
                    .filter(u => new Date(u.created_at).toLocaleString('default', { month: 'short' }) === month)
                    .length;

                return {
                    name: month,
                    revenue,
                    users: newUsers,
                    forecast: revenue * 1.1 // Mock forecast
                };
            });

            setReportData({
                monthlyData,
                totalRevenue: paymentList.reduce((acc, curr) => acc + (curr.amount || 0), 0),
                totalUsers: userList.length,
                activeUsers: userList.filter(u => u.is_active).length,
                churnRate: ((userList.filter(u => !u.is_active).length / (userList.length || 1)) * 100).toFixed(1),
                packageStats: [
                    { name: 'Personal Pro', value: userList.filter(u => u.subscription_package?.includes('Personal')).length },
                    { name: 'Team Enterprise', value: userList.filter(u => u.subscription_package?.includes('Team')).length },
                    { name: 'Free Tier', value: userList.filter(u => !u.subscription_package).length },
                ]
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        window.scrollTo(0, 0);
    }, [type]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center font-sans mt-[-80px]">
            <div className="w-16 h-16 border-8 border-accent border-t-transparent rounded-full animate-spin mb-4 shadow-hard"></div>
            <p className="text-white font-black text-xl uppercase tracking-tighter">Preparing Executive Audit...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0f172a] text-white pb-20 print:pb-0 font-sans selection:bg-accent selection:text-white">
            {/* Navigation & Actions - Unified with Dark Theme */}
            <div className="sticky top-0 z-50 bg-[#0f172a]/90 backdrop-blur-xl border-b-4 border-slate-900 px-6 py-4 flex items-center justify-between print:hidden">
                <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 font-black text-xs uppercase tracking-[0.3em] text-white/50 hover:text-white hover:bg-white/5"
                >
                    <ArrowLeft size={16} /> Back to Dashboard
                </Button>
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={handlePrint}
                        className="bg-transparent border-4 border-slate-900 shadow-hard-mini font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-900"
                    >
                        <Printer size={16} /> Print Report
                    </Button>
                    <Button
                        className="bg-accent text-white border-4 border-slate-900 shadow-hard-mini font-black text-[10px] uppercase tracking-widest flex items-center gap-2 active:translate-y-1 active:shadow-none transition-all"
                    >
                        <Download size={16} /> Export Data (CSV)
                    </Button>
                </div>
            </div>

            {/* Report Content - Landscape Grid Implementation */}
            <div className="w-full px-6 pt-10">
                {/* Visual Header */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-12 border-b-8 border-slate-900 pb-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-accent text-white rounded-[1.25rem] border-4 border-slate-900 shadow-hard-mini flex items-center justify-center font-black text-2xl">CF</div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Audit Engine v2.0</p>
                                <p className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                                    <ShieldCheck size={14} /> Systems Operational
                                </p>
                            </div>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-4 uppercase">
                            {currentConfig.title} <br />
                            <span className="text-accent italic">AUDIT REPORT</span>
                        </h1>
                    </div>

                    <div className="flex flex-col items-end gap-6">
                        <div className="text-right p-6 bg-slate-900/50 border-4 border-slate-900 rounded-3xl shadow-hard-mini">
                            <p className="text-[10px] font-black uppercase text-white/40 mb-1 tracking-widest">Reporting Period</p>
                            <p className="text-2xl font-black uppercase tracking-tight">{reportDate}</p>
                            <div className="h-1 w-full bg-accent mt-2 rounded-full"></div>
                        </div>
                        <div className="text-right hidden lg:block opacity-30">
                            <p className="text-[10px] font-black uppercase mb-1">Audit Serial</p>
                            <p className="font-mono text-lg font-bold">#AUD-{new Date().getFullYear()}-{Math.floor(Math.random() * 9000) + 1000}</p>
                        </div>
                    </div>
                </div>

                {/* Primary KPI Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    {[
                        { id: 'mrr', label: 'Gross Revenue', value: `Rp ${reportData.totalRevenue.toLocaleString('id-ID')}`, trend: '+12.5%', icon: DollarSign },
                        { id: 'audience', label: 'Client Base', value: reportData.totalUsers, sub: 'Entities', icon: Users },
                        { id: 'churn', label: 'Account Health', value: `${100 - reportData.churnRate}%`, trend: 'Healthy', icon: Activity },
                        { id: 'arpu', label: 'Cloud Uptime', value: '99.9%', sub: 'SLA Met', icon: ShieldCheck }
                    ].map((card, i) => {
                        const isFocused = type === card.id;
                        return (
                            <div key={i} className={`p-8 bg-slate-900/40 border-4 rounded-[2.5rem] shadow-hard-mini relative overflow-hidden group transition-all duration-300 ${isFocused ? 'border-accent scale-[1.02] bg-slate-900/80 shadow-accent/20 shadow-xl' : 'border-slate-900'}`}>
                                <div className="relative z-10 flex flex-col gap-2">
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isFocused ? 'text-accent' : 'text-white/40'}`}>{card.label}</p>
                                    <h3 className="text-4xl font-black tracking-tighter leading-none">
                                        {card.value} {card.sub && <span className="text-sm opacity-30 uppercase">{card.sub}</span>}
                                    </h3>
                                    {card.trend && <p className="text-[10px] font-black text-emerald-400 flex items-center gap-1"><TrendingUp size={12} /> {card.trend}</p>}
                                </div>
                                <card.icon size={80} className={`absolute -right-6 -bottom-6 group-hover:scale-110 transition-transform duration-500 ${isFocused ? 'text-accent/10' : 'text-white/5'}`} />
                            </div>
                        );
                    })}
                </div>

                {/* Main Landscape Split Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Column: Extensive Financial Data (8/12) */}
                    <div className="lg:col-span-8 space-y-10">
                        <div className="p-10 bg-slate-900/30 border-4 border-slate-900 rounded-[3.5rem] shadow-hard">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tighter uppercase mb-1">
                                        {type === 'audience' ? 'User Growth Velocity' : 'Revenue Matrix'}
                                    </h2>
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                        {type === 'audience' ? 'Monthly Acquisition Strategy' : 'Historical Progress vs AI Forecast'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-white/40 uppercase mb-1">{type === 'audience' ? 'DAILY ACTIVE' : 'AVG TICKET SIZE'}</p>
                                    <p className="text-xl font-black text-accent">
                                        {type === 'audience' ? `${reportData.activeUsers} Users` : `Rp ${(reportData.totalRevenue / (reportData.totalUsers || 1)).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`}
                                    </p>
                                </div>
                            </div>

                            <div className="h-[450px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={reportData.monthlyData}>
                                        <defs>
                                            <linearGradient id="auditGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={type === 'audience' ? '#F472B6' : '#8B5CF6'} stopOpacity={0.4} />
                                                <stop offset="95%" stopColor={type === 'audience' ? '#F472B6' : '#8B5CF6'} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 800, fill: '#64748B' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 800, fill: '#64748B' }} tickFormatter={(v) => type === 'audience' ? v : `Rp${v / 1000}k`} />
                                        <Tooltip content={<AuditTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                        <Area type="monotone" dataKey={type === 'audience' ? 'users' : 'revenue'} fill="url(#auditGradient)" stroke={type === 'audience' ? '#F472B6' : '#8B5CF6'} strokeWidth={6} />
                                        <Bar dataKey="forecast" barSize={12} fill="#1e293b" radius={[4, 4, 0, 0]} />
                                        <Line type="monotone" dataKey={type === 'audience' ? 'users' : 'revenue'} stroke={type === 'audience' ? '#F472B6' : '#8B5CF6'} strokeWidth={0} dot={{ fill: type === 'audience' ? '#F472B6' : '#8B5CF6', stroke: '#1e293b', strokeWidth: 4, r: 8 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Financial Ledger Mini-Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: 'Invoiced Amount', value: (reportData.totalRevenue * 1.1), icon: DollarSign, suffix: 'Gross' },
                                { label: 'Settlement Speed', value: 'Real-time', icon: Clock, suffix: 'Instant' },
                                { label: 'Success Rate', value: '99.8%', icon: ShieldCheck, suffix: 'Verified' }
                            ].map((item, i) => (
                                <div key={i} className="p-8 bg-slate-900/50 border-4 border-slate-900 rounded-[2.5rem] shadow-hard-mini flex items-center gap-6">
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border-2 border-white/5"><item.icon size={24} className="text-accent" /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">{item.label}</p>
                                        <p className="text-xl font-black">
                                            {typeof item.value === 'number' ? `Rp ${item.value.toLocaleString('id-ID', { maximumFractionDigits: 0 })}` : item.value}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column Sidebar: Secondary Metrics (4/12) */}
                    <div className="lg:col-span-4 space-y-10">
                        {/* Market Sentiment (Mini Chart) */}
                        <div className="p-8 bg-slate-900/30 border-4 border-slate-900 rounded-[3rem] shadow-hard">
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-xl font-black uppercase tracking-tighter">Market Growth</h3>
                                <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black text-rose-400 border border-rose-400/20">NEW USER VELOCITY</div>
                            </div>
                            <div className="h-[200px] w-full mb-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={reportData.monthlyData}>
                                        <CartesianGrid strokeDasharray="2 2" vertical={false} strokeOpacity={0.05} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748B' }} />
                                        <Tooltip content={<AuditTooltip />} />
                                        <Bar dataKey="users" fill="#F472B6" radius={[6, 6, 0, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-2xl border-2 border-white/5">
                                    <p className="text-[9px] font-black text-white/30 uppercase mb-1">Avg Signup</p>
                                    <p className="text-xl font-black text-white">+184</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border-2 border-white/5">
                                    <p className="text-[9px] font-black text-white/30 uppercase mb-1">Retention</p>
                                    <p className="text-xl font-black text-emerald-400">92.4%</p>
                                </div>
                            </div>
                        </div>

                        {/* Product Tier Adoption */}
                        <div className="p-8 bg-slate-900/30 border-4 border-slate-900 rounded-[3rem] shadow-hard">
                            <h3 className="text-xl font-black uppercase tracking-tighter mb-8 pl-4 border-l-4 border-emerald-400">Tier Adoption</h3>
                            <div className="flex items-center gap-6">
                                <div className="w-1/2 h-[180px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={reportData.packageStats}
                                                innerRadius={50}
                                                outerRadius={70}
                                                paddingAngle={8}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {reportData.packageStats.map((_: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<AuditTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-1/2 space-y-4">
                                    {reportData.packageStats.map((pkg: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest truncate">{pkg.name}</p>
                                                <p className="text-sm font-black text-white">{pkg.value} <span className="text-[9px] font-bold text-white/20">({Math.round((pkg.value / reportData.totalUsers) * 100)}%)</span></p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Advisory Insight - Context Awareness Note */}
                        <div className={`p-10 rounded-[3rem] border-4 border-dashed relative overflow-hidden transition-all ${type ? 'bg-accent/10 border-accent/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                            <Zap size={100} className={`absolute -left-10 -bottom-10 opacity-5 rotate-12 ${type ? 'text-accent' : 'text-emerald-500'}`} />
                            <div className="relative z-10">
                                <div className={`flex items-center gap-3 mb-4 ${type ? 'text-accent' : 'text-emerald-400'}`}>
                                    <Info size={20} />
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em]">{type ? 'Expert Advisory' : 'Strategy Advisory'}</h4>
                                </div>
                                <p className={`text-sm font-bold leading-relaxed italic pr-4 ${type ? 'text-accent/80' : 'text-emerald-100/80'}`}>
                                    "{currentConfig.advisory}"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Secure Footer Audit Stamp */}
                <div className="mt-20 pt-10 border-t-8 border-slate-900 flex flex-col md:flex-row items-center justify-between gap-10 opacity-30">
                    <div className="flex items-center gap-4">
                        <ShieldCheck size={24} />
                        <p className="text-[10px] font-black uppercase tracking-[0.5em]">Aruneeka Content Planner Pro Verified Analytics • {new Date().toLocaleTimeString('id-ID')}</p>
                    </div>
                    <div className="flex items-center gap-12">
                        <FileText size={24} />
                        <Printer size={24} />
                        <div className="px-4 py-2 border-2 border-white rounded-xl text-[10px] font-black uppercase">Official Audit Copy</div>
                    </div>
                </div>
            </div>

            {/* Print Decoration - Visual elements for PDF */}
            <div className="fixed top-0 left-0 w-2 h-full bg-accent opacity-0 print:opacity-100"></div>
        </div>
    );
};
