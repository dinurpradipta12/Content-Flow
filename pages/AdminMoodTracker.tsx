import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import {
    Smile, Heart, Users, Calendar, Activity, TrendingUp,
    RefreshCw, BarChart3, PieChart as PieIcon, Sparkles,
    AlertTriangle, Clock, Coffee, HandHeart
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────
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
        job_title?: string;
    };
}

// ── Constants ────────────────────────────────────────────────────
const MOOD_META: Record<string, { color: string; bg: string; text: string; gradient: string; score: number }> = {
    'Semangat': { color: '#c026d3', bg: '#fdf4ff', text: '#86198f', gradient: 'from-pink-400 to-fuchsia-500', score: 5 },
    'Happy': { color: '#c026d3', bg: '#fdf4ff', text: '#86198f', gradient: 'from-pink-400 to-fuchsia-500', score: 5 },
    'Baik': { color: '#4f46e5', bg: '#eef2ff', text: '#3730a3', gradient: 'from-blue-400 to-indigo-500', score: 4 },
    'Good': { color: '#4f46e5', bg: '#eef2ff', text: '#3730a3', gradient: 'from-blue-400 to-indigo-500', score: 4 },
    'Biasa': { color: '#475569', bg: '#f1f5f9', text: '#334155', gradient: 'from-slate-400 to-slate-600', score: 3 },
    'Neutral': { color: '#475569', bg: '#f1f5f9', text: '#334155', gradient: 'from-slate-400 to-slate-600', score: 3 },
    'Capek': { color: '#f97316', bg: '#fff7ed', text: '#c2410c', gradient: 'from-amber-400 to-orange-500', score: 2 },
    'Tired': { color: '#f97316', bg: '#fff7ed', text: '#c2410c', gradient: 'from-amber-400 to-orange-500', score: 2 },
    'Burnout': { color: '#e11d48', bg: '#fff1f2', text: '#9f1239', gradient: 'from-red-500 to-rose-600', score: 1 },
};

const PIE_COLORS = ['#c026d3', '#4f46e5', '#475569', '#f97316', '#e11d48'];

// ── Helper ───────────────────────────────────────────────────────
const getMeta = (label: string) =>
    MOOD_META[label] ?? { color: '#64748b', bg: '#f8fafc', text: '#475569', gradient: 'from-slate-400 to-slate-600', score: 3 };

const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Baru saja';
    if (m < 60) return `${m} menit lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    return `${Math.floor(h / 24)} hari lalu`;
};

// ── Mood Heatmap Component ────────────────────────────────────────
const MoodHeatmap: React.FC<{ moods: UserMood[] }> = ({ moods }) => {
    // Build 35-day grid (5 weeks)
    const days: { date: string; label: string; score: number | null; count: number; emoji: string }[] = [];
    const today = new Date();
    for (let i = 34; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayMoods = moods.filter(m => m.created_at.startsWith(dateStr));
        const score = dayMoods.length > 0
            ? dayMoods.reduce((s, m) => s + getMeta(m.mood_label).score, 0) / dayMoods.length
            : null;
        // dominant emoji
        const emojiCount: Record<string, number> = {};
        dayMoods.forEach(m => { emojiCount[m.mood_emoji] = (emojiCount[m.mood_emoji] || 0) + 1; });
        const topEmoji = Object.entries(emojiCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        days.push({
            date: dateStr,
            label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            score,
            count: dayMoods.length,
            emoji: topEmoji
        });
    }

    const getCellColor = (score: number | null) => {
        if (score === null) return '#f1f5f9';
        if (score >= 4.5) return '#c026d3';  // Semangat
        if (score >= 3.5) return '#4f46e5';  // Baik
        if (score >= 2.5) return '#94a3b8';  // Biasa
        if (score >= 1.5) return '#f97316';  // Capek
        return '#e11d48';                     // Burnout
    };

    const WEEK_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const startDow = new Date(days[0].date).getDay();
    const padded = [...Array(startDow).fill(null), ...days];
    const weeks = Math.ceil(padded.length / 7);

    return (
        <div className="space-y-3">
            {/* Week labels */}
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
                {/* intentionally empty header row — done via column labels below */}
            </div>
            <div className="flex gap-1 items-start">
                {/* Day of week column */}
                <div className="flex flex-col gap-1.5 pt-0">
                    {WEEK_LABELS.map(d => (
                        <div key={d} className="h-7 flex items-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase w-6">{d}</span>
                        </div>
                    ))}
                </div>
                {/* Heatmap grid — column per week */}
                <div className="flex-1 overflow-x-auto">
                    <div className="flex gap-1.5" style={{ minWidth: `${weeks * 32}px` }}>
                        {Array.from({ length: weeks }).map((_, wIdx) => (
                            <div key={wIdx} className="flex flex-col gap-1.5">
                                {Array.from({ length: 7 }).map((_, dIdx) => {
                                    const cell = padded[wIdx * 7 + dIdx];
                                    if (!cell) return <div key={dIdx} className="w-7 h-7" />;
                                    const bg = getCellColor(cell.score);
                                    const isToday = cell.date === today.toISOString().split('T')[0];
                                    return (
                                        <div
                                            key={dIdx}
                                            title={`${cell.label}\n${cell.count} entri${cell.score !== null ? ` • Skor: ${cell.score.toFixed(1)}` : ''}${cell.emoji ? ` ${cell.emoji}` : ''}`}
                                            className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] transition-transform hover:scale-125 cursor-default ${isToday ? 'ring-2 ring-slate-900 ring-offset-1' : ''
                                                }`}
                                            style={{ background: bg }}
                                        >
                                            {cell.count > 0 && cell.emoji ? cell.emoji : ''}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-2 pt-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rendah</span>
                {['#e11d48', '#f97316', '#94a3b8', '#4f46e5', '#c026d3'].map(c => (
                    <div key={c} className="w-4 h-4 rounded" style={{ background: c }} />
                ))}
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tinggi</span>
                <span className="ml-2 text-[9px] text-slate-300 font-semibold">• = hari dengan data</span>
            </div>
        </div>
    );
};

// ── Component ─────────────────────────────────────────────────────
export const AdminMoodTracker: React.FC = () => {
    const [moods, setMoods] = useState<UserMood[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeWorkspaceId] = useState(localStorage.getItem('active_workspace_id'));
    const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('7d');
    const [sendingSupport, setSendingSupport] = useState<string | null>(null); // userId being supported
    const [sentSupport, setSentSupport] = useState<Set<string>>(new Set()); // userIds already sent

    // ── Fetch ─────────────────────────────────────────────────────
    const [heatmapMoods, setHeatmapMoods] = useState<UserMood[]>([]);

    const fetchMoods = useCallback(async (silent = false) => {
        // Baca fresh dari localStorage setiap fetch (bukan dari stale state)
        const wsId = localStorage.getItem('active_workspace_id');
        if (!wsId) {
            setLoading(false);
            return;
        }
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const now = new Date();

            // ── Date boundary untuk main query ─
            let fromDate: string | null = null;
            if (timeRange === 'today') {
                fromDate = `${now.toISOString().split('T')[0]}T00:00:00`;
            } else if (timeRange === '7d') {
                const d = new Date(now); d.setDate(d.getDate() - 7);
                fromDate = d.toISOString();
            } else if (timeRange === '30d') {
                const d = new Date(now); d.setDate(d.getDate() - 30);
                fromDate = d.toISOString();
            }

            // ── Heatmap: 35 hari terakhir, ringan (tanpa join) ─
            const heatmapFrom = new Date(now);
            heatmapFrom.setDate(heatmapFrom.getDate() - 34);

            // Jalankan kedua query secara paralel
            const [mainRes, heatRes] = await Promise.all([
                // Query utama: tanpa join, dengan limit
                (() => {
                    let q = supabase
                        .from('user_moods')
                        .select('id,user_id,workspace_id,mood_emoji,mood_label,is_private,created_at')
                        .eq('workspace_id', wsId)
                        .order('created_at', { ascending: false })
                        .limit(300);
                    if (fromDate) q = q.gte('created_at', fromDate);
                    return q;
                })(),
                // Heatmap: selalu 35 hari, tanpa join, minimal kolom
                supabase
                    .from('user_moods')
                    .select('user_id,mood_emoji,mood_label,created_at')
                    .eq('workspace_id', wsId)
                    .gte('created_at', heatmapFrom.toISOString())
                    .order('created_at', { ascending: false })
                    .limit(1000)
            ]);

            if (mainRes.error) throw mainRes.error;
            const rawMoods: UserMood[] = mainRes.data || [];

            // ── Batch-fetch user info untuk user_id unik (1 request saja) ─
            const uniqueUserIds = [...new Set(rawMoods.map(m => m.user_id))];
            let userMap: Record<string, { full_name: string; avatar_url: string; role: string; job_title?: string }> = {};

            if (uniqueUserIds.length > 0) {
                const { data: users } = await supabase
                    .from('app_users')
                    .select('id,full_name,avatar_url,role,job_title')
                    .in('id', uniqueUserIds);
                if (users) {
                    userMap = Object.fromEntries(users.map(u => [u.id, u]));
                }
            }

            // Gabungkan data user ke moods
            const enriched: UserMood[] = rawMoods.map(m => ({
                ...m,
                user: userMap[m.user_id] || { full_name: 'Unknown', avatar_url: '', role: '' }
            }));

            setMoods(enriched);
            setHeatmapMoods((heatRes.data as UserMood[]) || []);
        } catch (err) {
            console.error('Error fetching mood stats:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeWorkspaceId, timeRange]);

    useEffect(() => { fetchMoods(); }, [fetchMoods]);

    // ── Realtime subscription ─────────────────────────────────────
    useEffect(() => {
        if (!activeWorkspaceId) return;
        const channel = supabase
            .channel('admin_mood_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_moods' }, () => fetchMoods(true))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [activeWorkspaceId, fetchMoods]);

    // ── Virtual Support ────────────────────────────────────────────
    const sendVirtualSupport = async (targetMood: UserMood, type: 'hug' | 'coffee') => {
        const actorId = localStorage.getItem('user_id');
        const actorName = localStorage.getItem('user_name') || 'Rekan tim';
        if (!actorId || targetMood.user_id === actorId) return;

        setSendingSupport(targetMood.user_id + type);
        try {
            const icon = type === 'hug' ? '🤗' : '☕';
            const label = type === 'hug' ? 'Virtual Hug' : 'Virtual Coffee';
            await supabase.from('notifications').insert([{
                recipient_id: targetMood.user_id,
                actor_id: actorId,
                workspace_id: localStorage.getItem('active_workspace_id'),
                type: 'MOOD_SUPPORT',
                title: `${icon} ${label} dari ${actorName}`,
                content: type === 'hug'
                    ? 'mengirimkan pelukan virtual untukmu. Kamu tidak sendirian, semangat ya! 💪'
                    : 'mentraktir kopi virtual. Istirahat sebentar dan charger energimu! ☕😄',
                metadata: { sound: 'special', type, hide_actor_name: false }
            }]);
            setSentSupport(prev => new Set([...prev, targetMood.user_id + type]));
        } catch (err) {
            console.error('Virtual support error:', err);
        } finally {
            setSendingSupport(null);
        }
    };

    // ── Computed ──────────────────────────────────────────────────
    const latestPerUser = (() => {
        const map = new Map<string, UserMood>();
        moods.forEach(m => { if (!map.has(m.user_id)) map.set(m.user_id, m); });
        return Array.from(map.values());
    })();

    const distribution = (() => {
        const dist: Record<string, { count: number; emoji: string; color: string }> = {};
        moods.forEach(m => {
            const key = m.mood_label;
            if (!dist[key]) dist[key] = { count: 0, emoji: m.mood_emoji, color: getMeta(key).color };
            dist[key].count++;
        });
        return Object.entries(dist)
            .map(([name, d]) => ({ name, value: d.count, emoji: d.emoji, color: d.color }))
            .sort((a, b) => b.value - a.value);
    })();

    const trendData = (() => {
        const byDate: Record<string, { date: string; total: number; score: number }> = {};
        moods.forEach(m => {
            const date = new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            if (!byDate[date]) byDate[date] = { date, total: 0, score: 0 };
            byDate[date].total++;
            byDate[date].score += getMeta(m.mood_label).score;
        });
        return Object.values(byDate)
            .map(d => ({ ...d, avg: parseFloat((d.score / d.total).toFixed(2)) }))
            .reverse()
            .slice(-14);
    })();

    const avgScore = moods.length > 0
        ? (moods.reduce((s, m) => s + getMeta(m.mood_label).score, 0) / moods.length).toFixed(2)
        : '–';

    const burnoutCount = latestPerUser.filter(m => m.mood_label === 'Burnout').length;
    const respondersToday = (() => {
        const today = new Date().toISOString().split('T')[0];
        return new Set(moods.filter(m => m.created_at.startsWith(today)).map(m => m.user_id)).size;
    })();

    const topMood = distribution[0];

    const STATS = [
        { label: 'Total Entri', value: moods.length, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200', note: 'semua respons' },
        { label: 'Anggota Aktif', value: latestPerUser.length, icon: Users, color: 'text-violet-500', bg: 'bg-violet-50 border-violet-200', note: 'unik responden' },
        { label: 'Responden Hari Ini', value: respondersToday, icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200', note: 'login hari ini' },
        { label: 'Rata-Rata Mood', value: `${avgScore}/5`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', note: 'skor tim' },
    ];

    if (loading) return (
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-muted-foreground">Memuat data mood tim…</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-pink-100 border-2 border-pink-300 rounded-full w-fit">
                            <Heart size={11} className="text-pink-500 fill-pink-500" />
                            <span className="text-[9px] font-black text-pink-600 uppercase tracking-widest">Admin Zone</span>
                        </div>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-heading font-black text-foreground tracking-tighter uppercase italic leading-none">
                        Team Pulse
                    </h2>
                    <p className="text-muted-foreground font-bold mt-2 text-sm pl-1 border-l-4 border-accent">
                        Monitor kesejahteraan psikologis tim secara real-time.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchMoods(true)}
                        disabled={refreshing}
                        className="p-2.5 rounded-xl border-2 border-slate-200 hover:border-slate-900 text-muted-foreground hover:text-foreground transition-all"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>

                    <div className="flex bg-muted p-1.5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.8)] gap-0.5">
                        {(['today', '7d', '30d', 'all'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setTimeRange(r)}
                                className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${timeRange === r ? 'bg-slate-900 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {r === 'today' ? 'Hari Ini' : r === '7d' ? '7 Hari' : r === '30d' ? '30 Hari' : 'Semua'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Alert: Burnout Detection ─────────────────────── */}
            {burnoutCount > 0 && (
                <div className="bg-red-50 border-[3px] border-red-400 rounded-2xl p-4 flex items-start gap-4 shadow-[4px_4px_0px_0px_rgba(239,68,68,0.3)]">
                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-red-700">
                        <AlertTriangle size={18} className="text-white" />
                    </div>
                    <div>
                        <h4 className="font-black text-sm text-red-700 uppercase tracking-wide">⚠️ Perhatian Diperlukan</h4>
                        <p className="text-xs font-semibold text-red-600 mt-0.5 leading-relaxed">
                            <strong>{burnoutCount} anggota tim</strong> saat ini melaporkan mood <strong>Burnout</strong>.
                            Pertimbangkan untuk menyapa atau memberikan dukungan ekstra kepada mereka hari ini.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Stats Grid ───────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map((s, i) => (
                    <div key={i} className="bg-card border-[3px] border-slate-900 rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.8)] hover:-translate-y-1 transition-all">
                        <div className={`w-10 h-10 ${s.bg} border rounded-xl flex items-center justify-center mb-3`}>
                            <s.icon size={18} className={s.color} />
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{s.label}</p>
                        <p className="text-2xl font-black text-foreground leading-none">{s.value}</p>
                        <p className="text-[9px] text-muted-foreground font-semibold mt-0.5">{s.note}</p>
                    </div>
                ))}
            </div>

            {/* ── Today's Team Mood Snapshot ────────────────────── */}
            {latestPerUser.length > 0 && (
                <div className="bg-card border-[3px] border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,0.8)] overflow-hidden">
                    <div className="p-4 border-b-2 border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center">
                                <Smile size={16} className="text-rose-500" />
                            </div>
                            <div>
                                <h3 className="font-black text-sm text-foreground">Mood Terkini Per Anggota</h3>
                                <p className="text-[9px] font-semibold text-muted-foreground">Entri mood paling baru dari setiap user</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
                        </div>
                    </div>

                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {latestPerUser.map((m) => {
                            const meta = getMeta(m.mood_label);
                            const isLowMood = meta.score <= 2;
                            const currentUserId = localStorage.getItem('user_id');
                            const isSelf = m.user_id === currentUserId;
                            return (
                                <div
                                    key={m.user_id}
                                    className="flex items-start gap-3 p-3 rounded-xl border-2 border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all"
                                    style={{ background: meta.bg }}
                                >
                                    <div className="relative shrink-0">
                                        <img
                                            src={m.user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${m.user?.full_name}`}
                                            className="w-10 h-10 rounded-full border-2 object-cover"
                                            style={{ borderColor: meta.color }}
                                            alt=""
                                        />
                                        <span
                                            className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full text-sm flex items-center justify-center border border-white shadow-sm"
                                            style={{ animation: 'moodPulseFloat 3s ease-in-out infinite' }}
                                        >
                                            {m.mood_emoji}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-foreground truncate">{m.user?.full_name || '–'}</p>
                                        <p className="text-[9px] font-semibold text-muted-foreground truncate">{m.user?.role || ''}</p>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <span
                                                className="inline-block px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wide"
                                                style={{ background: meta.color, color: '#fff' }}
                                            >
                                                {m.mood_label}
                                            </span>
                                            <span className="text-[8px] text-muted-foreground font-semibold">{relativeTime(m.created_at)}</span>
                                        </div>

                                        {/* Virtual Support Buttons — only for low mood & not self */}
                                        {isLowMood && !isSelf && (
                                            <div className="flex gap-1.5 mt-2">
                                                <button
                                                    onClick={() => sendVirtualSupport(m, 'hug')}
                                                    disabled={sendingSupport === m.user_id + 'hug' || sentSupport.has(m.user_id + 'hug')}
                                                    title="Kirim Virtual Hug"
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border-2 text-[9px] font-black transition-all ${sentSupport.has(m.user_id + 'hug')
                                                        ? 'border-rose-300 bg-rose-50 text-rose-500 cursor-default'
                                                        : 'border-rose-200 bg-white hover:border-rose-500 hover:bg-rose-50 text-rose-500 active:scale-95'
                                                        }`}
                                                >
                                                    {sentSupport.has(m.user_id + 'hug') ? '🤗 Terkirim!' : '🤗 Hug'}
                                                </button>
                                                <button
                                                    onClick={() => sendVirtualSupport(m, 'coffee')}
                                                    disabled={sendingSupport === m.user_id + 'coffee' || sentSupport.has(m.user_id + 'coffee')}
                                                    title="Kirim Virtual Coffee"
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border-2 text-[9px] font-black transition-all ${sentSupport.has(m.user_id + 'coffee')
                                                        ? 'border-amber-300 bg-amber-50 text-amber-600 cursor-default'
                                                        : 'border-amber-200 bg-white hover:border-amber-500 hover:bg-amber-50 text-amber-600 active:scale-95'
                                                        }`}
                                                >
                                                    {sentSupport.has(m.user_id + 'coffee') ? '☕ Terkirim!' : '☕ Kopi'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Mood Heatmap 35 Hari ─────────────────────────── */}
            <div className="bg-card border-[3px] border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,0.8)] overflow-hidden">
                <div className="p-4 border-b-2 border-slate-100 flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-center">
                        <Calendar size={16} className="text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="font-black text-sm text-foreground">Heatmap Mood Tim</h3>
                        <p className="text-[9px] font-semibold text-muted-foreground">Tren mood 35 hari terakhir — hover untuk detail per hari</p>
                    </div>
                </div>
                <div className="p-5">
                    {moods.length > 0 ? (
                        <MoodHeatmap moods={heatmapMoods} />
                    ) : (
                        <div className="py-8 text-center">
                            <span className="text-4xl opacity-20">📅</span>
                            <p className="text-sm font-bold text-muted-foreground mt-2">Belum ada data mood untuk ditampilkan</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Charts Row ────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Pie Chart */}
                <div className="lg:col-span-5 bg-card border-[3px] border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,0.8)] overflow-hidden">
                    <div className="p-4 border-b-2 border-slate-100 flex items-center gap-2">
                        <div className="w-8 h-8 bg-violet-50 border border-violet-200 rounded-xl flex items-center justify-center">
                            <PieIcon size={16} className="text-violet-500" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-foreground">Distribusi Mood</h3>
                            <p className="text-[9px] font-semibold text-muted-foreground">Proporsi setiap mood dalam periode ini</p>
                        </div>
                    </div>
                    {distribution.length > 0 ? (
                        <div className="p-4 h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={distribution}
                                        cx="50%" cy="45%"
                                        innerRadius={65} outerRadius={95}
                                        paddingAngle={4} dataKey="value"
                                        strokeWidth={3} stroke="#fff"
                                    >
                                        {distribution.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(val, name, props) => [`${val} entri`, `${props.payload?.emoji} ${name}`]}
                                        contentStyle={{ borderRadius: '12px', border: '3px solid #0f172a', fontWeight: 700, fontSize: 11 }}
                                    />
                                    <Legend
                                        verticalAlign="bottom" height={40}
                                        formatter={(value, entry: any) => (
                                            <span style={{ fontSize: 10, fontWeight: 800, color: '#334155' }}>
                                                {entry.payload?.emoji} {value}
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="p-8 flex flex-col items-center justify-center h-[280px] text-center gap-3">
                            <span className="text-5xl opacity-30">📊</span>
                            <p className="text-sm font-bold text-muted-foreground">Belum ada data mood</p>
                        </div>
                    )}
                </div>

                {/* Area Chart — Trend */}
                <div className="lg:col-span-7 bg-card border-[3px] border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,0.8)] overflow-hidden">
                    <div className="p-4 border-b-2 border-slate-100 flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center">
                            <BarChart3 size={16} className="text-blue-500" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-foreground">Tren Mood Tim</h3>
                            <p className="text-[9px] font-semibold text-muted-foreground">Rata-rata skor harian (1=Burnout → 5=Semangat)</p>
                        </div>
                    </div>
                    {trendData.length > 0 ? (
                        <div className="p-4 h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[1, 5]} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} width={20} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '3px solid #0f172a', fontWeight: 700, fontSize: 11 }}
                                        formatter={(val) => [`${val} / 5`, 'Avg Mood Score']}
                                    />
                                    <Area type="monotone" dataKey="avg" stroke="#4f46e5" strokeWidth={3} fill="url(#moodGrad)" dot={{ fill: '#4f46e5', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="p-8 flex flex-col items-center justify-center h-[280px] text-center gap-3">
                            <span className="text-5xl opacity-30">📈</span>
                            <p className="text-sm font-bold text-muted-foreground">Belum cukup data untuk tren</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Full History Table ────────────────────────────── */}
            <div className="bg-card border-[3px] border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,0.8)] overflow-hidden">
                <div className="p-4 border-b-2 border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center">
                            <Activity size={16} className="text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-foreground">Riwayat Lengkap</h3>
                            <p className="text-[9px] font-semibold text-muted-foreground">{moods.length} entri total dalam periode ini</p>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                        <thead>
                            <tr className="bg-slate-50 border-b-2 border-slate-100">
                                <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">Anggota</th>
                                <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">Mood</th>
                                <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">Waktu</th>
                                <th className="px-5 py-3 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">Skor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {moods.slice(0, 50).map((m) => {
                                const meta = getMeta(m.mood_label);
                                return (
                                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <img
                                                    src={m.user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${m.user?.full_name}`}
                                                    className="w-8 h-8 rounded-full border-2 border-slate-100 object-cover flex-shrink-0"
                                                    alt=""
                                                />
                                                <div>
                                                    <p className="text-xs font-black text-foreground leading-tight">{m.user?.full_name || 'Unknown'}</p>
                                                    <p className="text-[9px] font-semibold text-muted-foreground">{m.user?.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg leading-none">{m.mood_emoji}</span>
                                                <span
                                                    className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide"
                                                    style={{ background: meta.bg, color: meta.text, border: `1.5px solid ${meta.color}33` }}
                                                >
                                                    {m.mood_label}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                                                <Clock size={10} />
                                                {new Date(m.created_at).toLocaleString('id-ID', {
                                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </div>
                                            <p className="text-[9px] text-muted-foreground/60 mt-0.5">{relativeTime(m.created_at)}</p>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl border-2 text-[10px] font-black"
                                                style={{ borderColor: meta.color, color: meta.color, background: meta.bg }}>
                                                {meta.score}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {moods.length === 0 && (
                        <div className="py-16 flex flex-col items-center gap-4 text-center">
                            <span className="text-6xl opacity-20">💭</span>
                            <div>
                                <p className="font-black text-foreground">Belum ada data mood</p>
                                <p className="text-sm text-muted-foreground font-semibold mt-1">
                                    Data akan muncul setelah anggota tim mulai mengisi mood mereka.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Why It Matters ───────────────────────────────── */}
            <div className="bg-slate-900 border-[3px] border-slate-900 rounded-2xl p-6 md:p-8 overflow-hidden relative">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="text-white" size={32} />
                    </div>
                    <div className="space-y-2 flex-1">
                        <h3 className="text-2xl md:text-3xl font-heading font-black text-white italic tracking-tight">
                            Kenapa Mood Tracker Ini Ada?
                        </h3>
                        <p className="text-slate-400 font-semibold text-sm leading-relaxed">
                            Dalam tim yang padat kerja, kita sering tidak sempat bertanya <em className="text-white">"Kamu baik-baik saja?"</em> kepada rekan. Mood tracker menjadi jembatan kecil itu —
                            satu emoji yang membantu membangun empati tanpa harus bercerita panjang. Riset membuktikan tim yang
                            memiliki <span className="text-white font-black">psychological safety</span> menghasilkan output hingga
                            <span className="text-white font-black"> 3× lebih baik</span>.
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes moodPulseFloat {
                    0%,100% { transform: translateY(0) scale(1); }
                    50%     { transform: translateY(-3px) scale(1.1); }
                }
            `}</style>
        </div>
    );
};
