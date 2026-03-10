import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Card } from '../components/ui/Card';
import {
    Smile, Heart, Users, Calendar, Filter, Sparkles,
    TrendingUp, Info, Activity, UserPlus, ArrowUpRight,
    Search, ChevronRight, BarChart3, PieChart as PieIcon
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { MoodIndicator } from '../components/MoodIndicator';

interface UserMood {
    id: string;
    user_id: string;
    workspace_id: string;
    mood_emoji: string;
    mood_label: string;
    created_at: string;
    user?: {
        full_name: string;
        avatar_url: string;
        role: string;
    };
}

export const AdminMoodTracker: React.FC = () => {
    const [moods, setMoods] = useState<UserMood[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeWorkspaceId] = useState(localStorage.getItem('active_workspace_id'));
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

    useEffect(() => {
        fetchMoodStatistics();
    }, [activeWorkspaceId, timeRange]);

    const fetchMoodStatistics = async () => {
        if (!activeWorkspaceId) return;
        setLoading(true);
        try {
            let query = supabase
                .from('user_moods')
                .select(`
                    *,
                    user:app_users!user_id(full_name, avatar_url, role)
                `)
                .eq('workspace_id', activeWorkspaceId);

            if (timeRange === '7d') {
                const date = new Date();
                date.setDate(date.getDate() - 7);
                query = query.gte('created_at', date.toISOString());
            } else if (timeRange === '30d') {
                const date = new Date();
                date.setDate(date.getDate() - 30);
                query = query.gte('created_at', date.toISOString());
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            setMoods(data || []);
        } catch (err) {
            console.error('Error fetching mood stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const getDistribution = () => {
        const dist: Record<string, { count: number, emoji: string }> = {};
        moods.forEach(m => {
            if (!dist[m.mood_label]) dist[m.mood_label] = { count: 0, emoji: m.mood_emoji };
            dist[m.mood_label].count++;
        });

        const COLORS: Record<string, string> = {
            'Inspired': '#8B5CF6',
            'Good': '#10B981',
            'Neutral': '#3B82F6',
            'Tired': '#F59E0B',
            'Burnout': '#EF4444'
        };

        return Object.entries(dist).map(([name, data]) => ({
            name,
            value: data.count,
            emoji: data.emoji,
            color: COLORS[name] || '#64748b'
        }));
    };

    const getTrendData = () => {
        const trend: Record<string, number> = {};
        moods.forEach(m => {
            const date = new Date(m.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
            trend[date] = (trend[date] || 0) + 1;
        });

        return Object.entries(trend).map(([name, value]) => ({ name, value })).reverse();
    };

    const getLatestMoods = () => {
        // Group by user and take the latest
        const userLatest: Record<string, UserMood> = {};
        moods.forEach(m => {
            if (!userLatest[m.user_id]) userLatest[m.user_id] = m;
        });
        return Object.values(userLatest).slice(0, 5);
    };

    const stats = [
        { label: 'Total Mood Entries', value: moods.length, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Unique Responders', value: new Set(moods.map(m => m.user_id)).size, icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
        { label: 'Top Mood Today', value: getDistribution().sort((a, b) => b.value - a.value)[0]?.emoji || 'N/A', icon: Smile, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { label: 'Engagement Rate', value: `${moods.length > 0 ? Math.round((new Set(moods.map(m => m.user_id)).size / 10) * 100) : 0}%`, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-4xl md:text-6xl font-heading font-black text-foreground tracking-tighter uppercase italic">
                        Team Pulse Admin
                    </h2>
                    <p className="text-mutedForeground font-bold mt-2 pl-1 border-l-4 border-accent">
                        Monitor kesejahteraan psikologis tim dan dinamika kelompok.
                    </p>
                </div>

                <div className="flex bg-muted p-1.5 rounded-2xl border-2 border-slate-900 shadow-hard gap-1">
                    {(['7d', '30d', 'all'] as const).map((r) => (
                        <button
                            key={r}
                            onClick={() => setTimeRange(r)}
                            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${timeRange === r ? 'bg-card text-foreground border-2 border-slate-900 shadow-sm' : 'text-mutedForeground hover:text-foreground'}`}
                        >
                            {r === '7d' ? '7 Hari' : r === '30d' ? '30 Hari' : 'Semua'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((s, i) => (
                    <div key={i} className="bg-card border-4 border-slate-900 rounded-3xl p-6 shadow-hard hover:-translate-y-1 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-12 h-12 ${s.bg} rounded-2xl flex items-center justify-center border-4 border-slate-900 shadow-hard-mini`}>
                                <s.icon className={s.color} size={24} />
                            </div>
                            <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase tracking-widest border border-slate-200">REALTIME</span>
                        </div>
                        <p className="text-xs font-black text-mutedForeground uppercase tracking-widest mb-1">{s.label}</p>
                        <p className="text-4xl font-black text-foreground">{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Mood Distribution - Pie Chart */}
                <div className="lg:col-span-12 xl:col-span-5">
                    <Card title="Mood Distribution" icon={<PieIcon size={20} />} headerColor="purple">
                        <div className="p-8 h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={getDistribution()}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={120}
                                        paddingAngle={5}
                                        dataKey="value"
                                        strokeWidth={4}
                                        stroke="#fff"
                                    >
                                        {getDistribution().map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: '4px solid #0f172a', fontWeight: 'bold' }}
                                        itemStyle={{ color: '#0f172a' }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        formatter={(value, entry: any) => (
                                            <span className="text-xs font-black text-slate-700 uppercase tracking-widest mr-2">
                                                {entry.payload.emoji} {value}
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Mood Trend - Area Chart */}
                <div className="lg:col-span-12 xl:col-span-7">
                    <Card title="Activity Trend" icon={<BarChart3 size={20} />} headerColor="blue">
                        <div className="p-8 h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={getTrendData()}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                                    />
                                    <Tooltip
                                        cursor={{ stroke: '#0f172a', strokeWidth: 2 }}
                                        contentStyle={{ borderRadius: '16px', border: '4px solid #0f172a', fontWeight: 'bold' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#3B82F6"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Latest Moods Table */}
            <Card title="Recent Mood Updates" icon={<Activity size={20} />} headerColor="emerald">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b-4 border-slate-900">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-mutedForeground uppercase tracking-widest">Team Member</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-mutedForeground uppercase tracking-widest">Current Mood</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-mutedForeground uppercase tracking-widest">Last Update</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-mutedForeground uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-100">
                            {getLatestMoods().map((mood) => (
                                <tr key={mood.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative shrink-0">
                                                <img src={mood.user?.avatar_url} className="w-10 h-10 rounded-full border-2 border-slate-900" alt="" />
                                                <MoodIndicator moodEmoji={mood.mood_emoji} size="sm" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-foreground">{mood.user?.full_name}</p>
                                                <p className="text-[10px] font-bold text-mutedForeground">{mood.user?.role}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{mood.mood_emoji}</span>
                                            <span className="text-xs font-bold text-slate-700">{mood.mood_label}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                            <Calendar size={14} />
                                            {new Date(mood.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center">
                                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Importance Overlay */}
            <div className="bg-slate-900 border-4 border-slate-900 rounded-[2.5rem] p-8 md:p-12 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="md:w-1/4">
                        <div className="w-24 h-24 bg-card rounded-[2rem] border-4 border-slate-800 flex items-center justify-center rotate-3 shadow-[8px_8px_0px_#1e293b] group-hover:rotate-0 transition-transform duration-500">
                            <Sparkles className="text-accent" size={48} />
                        </div>
                    </div>
                    <div className="md:w-3/4 space-y-4">
                        <h3 className="text-3xl md:text-4xl font-heading font-black text-white italic tracking-tight uppercase">Why This Matters?</h3>
                        <p className="text-slate-400 font-bold leading-relaxed text-sm md:text-base">
                            Monitoring team mood isn't just about data; it's about <span className="text-white">empathy and psychological safety</span>. High performance is impossible without a healthy mental state. Use these insights to identify potential burnout early, celebrate high-morale periods, and foster a supportive workspace culture.
                        </p>
                        <div className="flex gap-4 pt-4">
                            <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 text-[10px] font-black text-slate-100 uppercase tracking-widest">Early Intervention</div>
                            <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 text-[10px] font-black text-slate-100 uppercase tracking-widest">Culture Building</div>
                            <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 text-[10px] font-black text-slate-100 uppercase tracking-widest">Well-being First</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
