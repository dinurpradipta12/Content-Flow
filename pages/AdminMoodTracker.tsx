import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import {
    Smile, Heart, Users, Calendar, Activity, TrendingUp,
    RefreshCw, BarChart3, PieChart as PieIcon,
    AlertTriangle, Clock, Coffee, HandHeart, X
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
    const [selectedUserId, setSelectedUserId] = useState<string>('all');
    const [workspaceUsers, setWorkspaceUsers] = useState<{ id: string; name: string; avatar_url?: string; role?: string }[]>([]);

    // Workspace Selection State
    const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(localStorage.getItem('active_workspace_id') || '');

    const [sendingSupport, setSendingSupport] = useState<string | null>(null); // userId being supported
    const [sentSupport, setSentSupport] = useState<Set<string>>(new Set()); // userIds already sent

    // Modal States
    const [selectedStatModal, setSelectedStatModal] = useState<string | null>(null);
    const [selectedUserModal, setSelectedUserModal] = useState<string | null>(null);

    // ── Fetch Workspaces ──────────────────────────────────────────
    useEffect(() => {
        const fetchWs = async () => {
            const userId = localStorage.getItem('user_id');
            if (!userId) return;
            const { data } = await supabase.from('workspaces').select('id, name, owner_id, members').limit(100);
            if (data) {
                const myWs = data.filter(ws =>
                    ws.owner_id === userId ||
                    (Array.isArray(ws.members) && ws.members.includes(userId))
                );
                setWorkspaces(myWs.map(ws => ({ id: ws.id, name: ws.name || 'Workspace' })));
                if (myWs.length > 0 && !myWs.find(w => w.id === selectedWorkspaceId)) {
                    setSelectedWorkspaceId(myWs[0].id);
                }
            }
        };
        fetchWs();
    }, []);

    // ── Fetch ─────────────────────────────────────────────────────
    const [heatmapMoods, setHeatmapMoods] = useState<UserMood[]>([]);

    const fetchMoods = useCallback(async (silent = false) => {
        const wsId = selectedWorkspaceId;
        if (!wsId) {
            setLoading(false);
            return;
        }
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            // 1. Fetch workspace users first
            const { data: wsData } = await supabase.from('workspaces').select('owner_id, members, admin_id').eq('id', wsId).single();
            const currentUserId = localStorage.getItem('user_id');
            const tenantId = localStorage.getItem('tenant_id') || currentUserId;

            // 1. Identify all users who should be in this workspace explicitly
            const memberIds = new Set<string>();
            const avatarTokens = new Set<string>();

            if (wsData) {
                if (wsData.owner_id) memberIds.add(wsData.owner_id);
                if (wsData.admin_id) memberIds.add(wsData.admin_id);
                if (Array.isArray(wsData.members)) {
                    wsData.members.forEach((m: string) => {
                        if (m.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i)) {
                            memberIds.add(m);
                        } else if (m.startsWith('http') || m.includes('%2F')) {
                            avatarTokens.add(m);
                        }
                        // Note: intentionally skipping m.startsWith('data:') as they cause massive GET requests leading to HTTP/2 Protocol Errors.
                    });
                }
            }
            if (currentUserId) memberIds.add(currentUserId);
            if (tenantId) memberIds.add(tenantId);

            let userMap: Record<string, { full_name: string; avatar_url: string; role: string; job_title?: string }> = {};
            let wsUsersList: { id: string; name: string; avatar_url?: string; role?: string }[] = [];

            // 2. Strict fetch of users in this workspace
            const idList = Array.from(memberIds);
            const avatarList = Array.from(avatarTokens);

            let allUsers: any[] = [];

            if (idList.length > 0) {
                const { data } = await supabase.from('app_users').select('id,full_name,avatar_url,role,job_title').in('id', idList);
                if (data) allUsers.push(...data);
            }

            if (avatarList.length > 0) {
                const { data } = await supabase.from('app_users').select('id,full_name,avatar_url,role,job_title').in('avatar_url', avatarList);
                if (data) allUsers.push(...data);
            }

            // Deduplicate users
            const uniqueUsersMap = new Map();
            allUsers.forEach(u => uniqueUsersMap.set(u.id, u));
            const users = Array.from(uniqueUsersMap.values());

            if (users.length > 0) {
                userMap = Object.fromEntries(users.map(u => [u.id, u]));
                wsUsersList = users.map(u => ({
                    id: u.id,
                    name: u.full_name,
                    avatar_url: u.avatar_url,
                    role: u.role
                })).sort((a, b) => a.name.localeCompare(b.name));
            }

            setWorkspaceUsers(wsUsersList);
            const userIds = wsUsersList.map(u => u.id);

            // If no users, stop
            if (userIds.length === 0) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            // 2. Fetch moods for these users
            const now = new Date();

            // ── Date boundary untuk main query ─
            let fromDate: string | null = null;
            if (timeRange === 'today') {
                const d = new Date();
                d.setHours(0, 0, 0, 0); // local midnight
                fromDate = d.toISOString();
            } else if (timeRange === '7d') {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                d.setHours(0, 0, 0, 0);
                fromDate = d.toISOString();
            } else if (timeRange === '30d') {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                d.setHours(0, 0, 0, 0);
                fromDate = d.toISOString();
            }

            // ── Heatmap: 35 hari terakhir ─
            const heatmapFrom = new Date();
            heatmapFrom.setDate(heatmapFrom.getDate() - 34);
            heatmapFrom.setHours(0, 0, 0, 0);

            const [mainRes, heatRes] = await Promise.all([
                // Query utama (limit increased to 1000 to ensure we find everyone's latest)
                (() => {
                    let q = supabase
                        .from('user_moods')
                        .select('id,user_id,workspace_id,mood_emoji,mood_label,is_private,created_at')
                        .in('user_id', userIds)
                        .order('created_at', { ascending: false })
                        .limit(1000);
                    if (fromDate) q = q.gte('created_at', fromDate);
                    return q;
                })(),
                // Heatmap query
                supabase
                    .from('user_moods')
                    .select('user_id,mood_emoji,mood_label,created_at')
                    .in('user_id', userIds)
                    .gte('created_at', heatmapFrom.toISOString())
                    .order('created_at', { ascending: false })
                    .limit(1000)
            ]);

            if (mainRes.error) throw mainRes.error;
            const rawMoods: UserMood[] = mainRes.data || [];

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
    }, [selectedWorkspaceId, timeRange]);

    useEffect(() => { fetchMoods(); }, [fetchMoods]);

    // ── Realtime subscription ─────────────────────────────────────
    useEffect(() => {
        if (!selectedWorkspaceId || workspaceUsers.length === 0) return;

        const userIds = workspaceUsers.map(u => u.id);
        const channel = supabase
            .channel(`admin_mood_realtime_global`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'user_moods'
            }, (payload) => {
                // If the new mood belongs to one of our workspace members, refresh
                if (userIds.includes(payload.new.user_id)) {
                    console.log('[Realtime] New mood detected for team member:', payload.new.user_id);
                    fetchMoods(true);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [selectedWorkspaceId, workspaceUsers, fetchMoods]);

    // ── Virtual Support ────────────────────────────────────────────
    const sendVirtualSupport = async (targetMood: UserMood, type: 'hug' | 'coffee' | 'donut' | 'music' | 'high_five' | 'rocket') => {
        const actorId = localStorage.getItem('user_id');
        const actorName = localStorage.getItem('user_name') || 'Rekan tim';
        if (!actorId || targetMood.user_id === actorId) return;

        setSendingSupport(targetMood.user_id + type);
        try {
            let icon = '🤗';
            let label = 'Virtual Hug';
            let message = 'mengirimkan pelukan virtual untukmu. Kamu tidak sendirian, semangat ya! 💪';

            if (type === 'coffee') {
                icon = '☕'; label = 'Virtual Coffee';
                message = 'mentraktir kopi virtual. Istirahat sebentar dan charger energimu! ☕😄';
            } else if (type === 'donut') {
                icon = '🍩'; label = 'Virtual Donut';
                message = 'ngasih cemilan virtual biar harinya agak manis! 🍩✨';
            } else if (type === 'music') {
                icon = '🎧'; label = 'Virtual Music';
                message = 'ngirimin playlist virtual. Coba dengerin lagu favoritmu 1x putaran biar rileks! 🎵';
            } else if (type === 'high_five') {
                icon = '🤚'; label = 'High Five';
                message = 'ngasih Toss online! 🤚 Jaga terus vibe positifmu hari ini!';
            } else if (type === 'rocket') {
                icon = '🚀'; label = 'Virtual Rocket';
                message = 'ngelihat kamu lagi on fire banget nih kayanya, keep it up! 🚀🔥';
            }

            // We set show_popup and popup_type in metadata so NotificationProvider can show our Top-Center Modal
            await supabase.from('notifications').insert([{
                recipient_id: targetMood.user_id,
                actor_id: actorId,
                workspace_id: localStorage.getItem('active_workspace_id'),
                type: 'MOOD_SUPPORT',
                title: `${icon} ${label} dari ${actorName}`,
                content: message,
                metadata: {
                    sound: 'special',
                    type,
                    hide_actor_name: false,
                    show_popup: true,
                    popup_type: type,
                    actor_name: actorName
                }
            }]);

            // 🚀 Force Realtime via Broadcast (fallback if Postgres Changes is off)
            const brChannel = supabase.channel(`notif_realtime_${targetMood.user_id}`);
            brChannel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await brChannel.send({ type: 'broadcast', event: 'trigger_fetch', payload: {} });
                    supabase.removeChannel(brChannel);
                }
            });

            setSentSupport(prev => new Set([...prev, targetMood.user_id + type]));
        } catch (err) {
            console.error('Virtual support error:', err);
        } finally {
            setSendingSupport(null);
        }
    };

    // ── Computed ──────────────────────────────────────────────────
    const filteredMoods = selectedUserId === 'all' ? moods : moods.filter(m => m.user_id === selectedUserId);
    const filteredHeatmap = selectedUserId === 'all' ? heatmapMoods : heatmapMoods.filter(m => m.user_id === selectedUserId);

    const latestPerUser = (() => {
        const usersToShow = selectedUserId === 'all' ? workspaceUsers : workspaceUsers.filter(u => u.id === selectedUserId);
        return usersToShow.map(u => {
            const userMood = filteredMoods.find(m => m.user_id === u.id);
            return {
                user_id: u.id,
                user: { full_name: u.name, avatar_url: u.avatar_url || '', role: u.role || '' },
                mood: userMood // could be undefined if they haven't submitted
            };
        });
    })();

    const distribution = (() => {
        const dist: Record<string, { count: number; emoji: string; color: string }> = {};
        filteredMoods.forEach(m => {
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
        filteredMoods.forEach(m => {
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

    const avgScore = filteredMoods.length > 0
        ? (filteredMoods.reduce((s, m) => s + getMeta(m.mood_label).score, 0) / filteredMoods.length).toFixed(2)
        : '–';

    const burnoutCount = latestPerUser.filter(m => m.mood_label === 'Burnout').length;
    const respondersToday = (() => {
        const today = new Date().toISOString().split('T')[0];
        return new Set(filteredMoods.filter(m => m.created_at.startsWith(today)).map(m => m.user_id)).size;
    })();

    const topMood = distribution[0];

    const STATS = [
        { label: 'Total Entri', value: filteredMoods.length, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200', note: 'semua respons' },
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
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 bg-card p-10 rounded-[3rem] border-[3.5px] border-slate-900 shadow-hard mb-12">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-1.5 rounded-full border-[3px] border-slate-900 bg-pink-100/50 text-pink-600 font-black text-[10px] uppercase tracking-[0.2em] shadow-hard-mini flex items-center gap-2">
                            <Heart size={14} fill="currentColor" strokeWidth={3} /> Admin Zone
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm bg-slate-100 px-3 py-1.5 rounded-lg border-[2px] border-slate-200">
                            <Activity size={14} className="text-accent" strokeWidth={3} /> Psychological Tracker
                        </div>
                    </div>
                    <h1 className="text-4xl lg:text-6xl font-heading font-black text-foreground leading-tight uppercase tracking-tight">
                        Team Pulse
                    </h1>
                    <p className="text-slate-500 font-bold max-w-xl text-lg leading-relaxed">
                        Monitor kesejahteraan psikologis tim secara real-time untuk menciptakan lingkungan kerja yang lebih produktif dan empatik.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 -mb-1">
                    {/* Workspace Filter */}
                    <div className="relative">
                        <select
                            value={selectedWorkspaceId}
                            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                            className="p-3 sm:p-3.5 rounded-2xl border-[3.5px] border-indigo-300 shadow-hard font-black text-xs uppercase tracking-widest text-indigo-700 bg-indigo-50 outline-none focus:border-indigo-500 cursor-pointer min-w-[160px]"
                        >
                            {workspaces.map(ws => (
                                <option key={ws.id} value={ws.id}>{ws.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* User Filter */}
                    <div className="relative">
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="p-3 sm:p-3.5 rounded-2xl border-[3.5px] border-slate-900 shadow-hard font-black text-xs uppercase tracking-widest text-slate-700 bg-white outline-none focus:border-slate-900 cursor-pointer min-w-[160px]"
                        >
                            <option value="all">Semua Anggota</option>
                            {workspaceUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => fetchMoods(true)}
                        disabled={refreshing}
                        className="p-3 sm:p-3.5 rounded-2xl border-[3.5px] border-slate-900 shadow-hard hover:-translate-y-1 active:translate-y-0 active:shadow-none bg-white text-slate-700 hover:text-slate-900 transition-all shrink-0"
                        title="Refresh"
                    >
                        <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} strokeWidth={3} />
                    </button>

                    <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border-[3.5px] border-slate-900 shadow-hard gap-0.5 overflow-x-auto w-full sm:w-auto">
                        {(['today', '7d', '30d', 'all'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setTimeRange(r)}
                                className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${timeRange === r ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'}`}
                            >
                                {r === 'today' ? 'Hari Ini' : r === '7d' ? '7 Hari' : r === '30d' ? '30 Hari' : 'Semua'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Alert: Burnout Detection ─────────────────────── */}
            {burnoutCount > 0 && (
                <div className="bg-rose-100 border-[3.5px] border-slate-900 rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center gap-5 shadow-hard-mini transition-all hover:-translate-y-1">
                    <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center flex-shrink-0 border-[3px] border-slate-900 shadow-hard-mini transform -rotate-6">
                        <AlertTriangle size={24} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h4 className="font-black text-base text-rose-700 uppercase tracking-widest mb-1">⚠️ Perhatian Diperlukan</h4>
                        <p className="text-sm font-bold text-rose-900/80 leading-relaxed max-w-3xl">
                            Ada <span className="bg-rose-200 px-1.5 py-0.5 rounded border border-rose-300 text-rose-900">{burnoutCount} anggota tim</span> saat ini melaporkan bahwa mereka merasa <strong className="text-rose-700">Burnout</strong>.
                            Direkomendasikan segera menyapa atau memberikan dukungan moral.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Stats Grid ───────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {STATS.map((s, i) => (
                    <div
                        key={i}
                        onClick={() => setSelectedStatModal(s.label)}
                        className="bg-card border-[3.5px] border-slate-900 rounded-[2rem] p-6 shadow-hard hover:-translate-y-2 hover:shadow-[10px_10px_0px_rgba(15,23,42,1)] transition-all duration-300 cursor-pointer"
                    >
                        <div className={`w-14 h-14 ${s.bg} border-[3px] border-slate-900 shadow-hard-mini rounded-2xl flex items-center justify-center mb-4`}>
                            <s.icon size={24} className={s.color} strokeWidth={2.5} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{s.label}</p>
                        <p className="text-4xl font-black font-heading text-slate-900 leading-none">{s.value}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-2 bg-slate-100 rounded-md px-2 py-1 uppercase tracking-widest inline-block">{s.note}</p>
                    </div>
                ))}
            </div>

            {/* ── Today's Team Mood Snapshot ────────────────────── */}
            {latestPerUser.length > 0 && (
                <div className="bg-card border-[3.5px] border-slate-900 rounded-[2.5rem] shadow-hard overflow-hidden">
                    <div className="p-6 md:p-8 border-b-[3.5px] border-slate-900 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-rose-200 border-[3px] border-slate-900 rounded-2xl flex items-center justify-center shadow-hard-mini transform -rotate-3">
                                <Smile size={24} className="text-rose-700" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">Mood Terkini Per Anggota</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Entri mood paling baru dari setiap user</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-emerald-100 px-3 py-1.5 rounded-xl border-[2.5px] border-slate-900 shadow-hard-mini">
                            <span className="w-2.5 h-2.5 bg-emerald-500 border border-slate-900 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Live</span>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {latestPerUser.map((item) => {
                            const m = item.mood;
                            const hasMood = !!m;
                            const meta = hasMood ? getMeta(m!.mood_label) : { bg: '#f8fafc', color: '#cbd5e1', score: 0 };
                            const isLowMood = hasMood && meta.score <= 2;
                            const currentUserId = localStorage.getItem('user_id');
                            const isSelf = item.user_id === currentUserId;
                            return (
                                <div
                                    key={item.user_id}
                                    onClick={() => setSelectedUserModal(item.user_id)}
                                    className={`flex items-start gap-4 p-4 rounded-2xl border-[3.5px] transition-all duration-300 cursor-pointer ${hasMood ? 'hover:-translate-y-1 hover:shadow-hard border-slate-900' : 'border-slate-300 grayscale-[40%] opacity-80'}`}
                                    style={{ background: meta.bg }}
                                >
                                    <div className="relative shrink-0">
                                        <img
                                            src={item.user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${item.user.full_name}`}
                                            className="w-12 h-12 rounded-[1rem] border-[3px] border-slate-900 object-cover shadow-hard-mini"
                                            alt=""
                                        />
                                        {hasMood && (
                                            <span
                                                className="absolute -bottom-2 -right-2 w-7 h-7 bg-white rounded-full text-base flex items-center justify-center border-[2.5px] border-slate-900 shadow-hard-mini"
                                            >
                                                {m!.mood_emoji}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-black truncate ${hasMood ? 'text-foreground' : 'text-slate-400'}`}>{item.user.full_name || '–'}</p>
                                        <p className="text-[9px] font-semibold text-muted-foreground truncate">{item.user.role || ''}</p>

                                        {hasMood ? (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span
                                                    className="inline-block px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wide"
                                                    style={{ background: meta.color, color: '#fff' }}
                                                >
                                                    {m!.mood_label}
                                                </span>
                                                <span className="text-[8px] text-muted-foreground font-semibold">{relativeTime(m!.created_at)}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className="inline-block px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wide bg-slate-200 text-slate-500">
                                                    Belum Input
                                                </span>
                                            </div>
                                        )}

                                        {/* Virtual Support Buttons — available for all moods if not self */}
                                        {hasMood && !isSelf && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {isLowMood ? (
                                                    // Mood Rendah (Burnout, Capek)
                                                    <>
                                                        <button
                                                            onClick={() => sendVirtualSupport(m, 'hug')}
                                                            disabled={sendingSupport === m.user_id + 'hug' || sentSupport.has(m.user_id + 'hug')}
                                                            title="Kirim Virtual Hug"
                                                            className={`flex items-center gap-1 px-2 py-1 rounded-lg border-2 text-[9px] font-black transition-all ${sentSupport.has(m.user_id + 'hug')
                                                                ? 'border-rose-300 bg-rose-50 text-rose-500 cursor-default'
                                                                : 'border-rose-200 bg-white hover:border-rose-500 hover:bg-rose-50 text-rose-500 active:scale-95'
                                                                }`}
                                                        >
                                                            {sentSupport.has(m.user_id + 'hug') ? '🤗 Terkirim' : '🤗 Hug'}
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
                                                            {sentSupport.has(m.user_id + 'coffee') ? '☕ Terkirim' : '☕ Kopi'}
                                                        </button>
                                                    </>
                                                ) : meta.score === 3 ? (
                                                    // Mood Netral (Biasa)
                                                    <>
                                                        <button
                                                            onClick={() => sendVirtualSupport(m, 'donut')}
                                                            disabled={sendingSupport === m.user_id + 'donut' || sentSupport.has(m.user_id + 'donut')}
                                                            title="Kirim Donat"
                                                            className={`flex items-center gap-1 px-2 py-1 rounded-lg border-2 text-[9px] font-black transition-all ${sentSupport.has(m.user_id + 'donut')
                                                                ? 'border-sky-300 bg-sky-50 text-sky-500 cursor-default'
                                                                : 'border-sky-200 bg-white hover:border-sky-500 hover:bg-sky-50 text-sky-500 active:scale-95'
                                                                }`}
                                                        >
                                                            {sentSupport.has(m.user_id + 'donut') ? '🍩 Terkirim' : '🍩 Donat'}
                                                        </button>
                                                        <button
                                                            onClick={() => sendVirtualSupport(m, 'music')}
                                                            disabled={sendingSupport === m.user_id + 'music' || sentSupport.has(m.user_id + 'music')}
                                                            title="Kirim Musik"
                                                            className={`flex items-center gap-1 px-2 py-1 rounded-lg border-2 text-[9px] font-black transition-all ${sentSupport.has(m.user_id + 'music')
                                                                ? 'border-indigo-300 bg-indigo-50 text-indigo-500 cursor-default'
                                                                : 'border-indigo-200 bg-white hover:border-indigo-500 hover:bg-indigo-50 text-indigo-500 active:scale-95'
                                                                }`}
                                                        >
                                                            {sentSupport.has(m.user_id + 'music') ? '🎧 Terkirim' : '🎧 Musik'}
                                                        </button>
                                                    </>
                                                ) : (
                                                    // Mood Tinggi (Baik, Semangat)
                                                    <>
                                                        <button
                                                            onClick={() => sendVirtualSupport(m, 'high_five')}
                                                            disabled={sendingSupport === m.user_id + 'high_five' || sentSupport.has(m.user_id + 'high_five')}
                                                            title="High Five"
                                                            className={`flex items-center gap-1 px-2 py-1 rounded-lg border-2 text-[9px] font-black transition-all ${sentSupport.has(m.user_id + 'high_five')
                                                                ? 'border-emerald-300 bg-emerald-50 text-emerald-600 cursor-default'
                                                                : 'border-emerald-200 bg-white hover:border-emerald-500 hover:bg-emerald-50 text-emerald-600 active:scale-95'
                                                                }`}
                                                        >
                                                            {sentSupport.has(m.user_id + 'high_five') ? '🤚 Terkirim' : '🤚 High Five'}
                                                        </button>
                                                        <button
                                                            onClick={() => sendVirtualSupport(m, 'rocket')}
                                                            disabled={sendingSupport === m.user_id + 'rocket' || sentSupport.has(m.user_id + 'rocket')}
                                                            title="Rocket"
                                                            className={`flex items-center gap-1 px-2 py-1 rounded-lg border-2 text-[9px] font-black transition-all ${sentSupport.has(m.user_id + 'rocket')
                                                                ? 'border-purple-300 bg-purple-50 text-purple-600 cursor-default'
                                                                : 'border-purple-200 bg-white hover:border-purple-500 hover:bg-purple-50 text-purple-600 active:scale-95'
                                                                }`}
                                                        >
                                                            {sentSupport.has(m.user_id + 'rocket') ? '🚀 Terkirim' : '🚀 Roket'}
                                                        </button>
                                                    </>
                                                )}
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
            <div className="bg-card border-[3.5px] border-slate-900 rounded-[2.5rem] shadow-hard overflow-hidden">
                <div className="p-6 md:p-8 border-b-[3.5px] border-slate-900 flex items-center gap-4 bg-slate-50/50">
                    <div className="w-12 h-12 bg-indigo-200 border-[3px] border-slate-900 rounded-2xl flex items-center justify-center shadow-hard-mini transform rotate-3">
                        <Calendar size={24} className="text-indigo-700" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">Heatmap Mood Tim</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Tren mood 35 hari terakhir — hover untuk detail per hari</p>
                    </div>
                </div>
                <div className="p-6 md:p-8">
                    {filteredMoods.length > 0 ? (
                        <MoodHeatmap moods={filteredHeatmap} />
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
                <div className="lg:col-span-5 bg-card border-[3.5px] border-slate-900 rounded-[2.5rem] shadow-hard overflow-hidden">
                    <div className="p-6 border-b-[3.5px] border-slate-900 flex items-center gap-4 bg-slate-50/50">
                        <div className="w-12 h-12 bg-violet-200 border-[3px] border-slate-900 rounded-2xl flex items-center justify-center shadow-hard-mini transform -rotate-3">
                            <PieIcon size={24} className="text-violet-700" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">Distribusi Mood</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Proporsi setiap mood dalam periode ini</p>
                        </div>
                    </div>
                    {distribution.length > 0 ? (
                        <div className="p-6 h-[320px]">
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
                <div className="lg:col-span-7 bg-card border-[3.5px] border-slate-900 rounded-[2.5rem] shadow-hard overflow-hidden">
                    <div className="p-6 border-b-[3.5px] border-slate-900 flex items-center gap-4 bg-slate-50/50">
                        <div className="w-12 h-12 bg-blue-200 border-[3px] border-slate-900 rounded-2xl flex items-center justify-center shadow-hard-mini transform rotate-3">
                            <BarChart3 size={24} className="text-blue-700" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">Tren Mood Tim</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Rata-rata skor harian (1=Burnout → 5=Semangat)</p>
                        </div>
                    </div>
                    {trendData.length > 0 ? (
                        <div className="p-6 h-[320px]">
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
            <div className="bg-card border-[3.5px] border-slate-900 rounded-[2.5rem] shadow-hard overflow-hidden">
                <div className="p-6 border-b-[3.5px] border-slate-900 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-200 border-[3px] border-slate-900 rounded-2xl flex items-center justify-center shadow-hard-mini transform -rotate-3">
                            <Activity size={24} className="text-emerald-700" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">Riwayat Lengkap</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{moods.length} entri total dalam periode ini</p>
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

            {/* ── Why It Matters (Brutalism Edition) ───────────────────────────────── */}
            <div className="bg-amber-300 border-[3.5px] border-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-hard relative mt-4">
                <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center">
                    <div className="w-20 h-20 bg-amber-400 rounded-2xl border-[3px] border-slate-900 shadow-hard-mini flex items-center justify-center flex-shrink-0 transform -rotate-6">
                        <Heart className="text-slate-900" size={36} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-3 flex-1">
                        <h3 className="text-2xl md:text-3xl font-heading font-black text-slate-900 tracking-tight uppercase">
                            Catatan HR: Psychological Safety
                        </h3>
                        <p className="text-slate-900 font-bold text-base leading-relaxed max-w-4xl">
                            Dalam rutinitas kerja yang padat, bertanya <span className="bg-amber-100 border-[2px] border-slate-900 px-2 py-0.5 rounded-md font-black italic">"Bagaimana kabarmu?"</span> sering terlewat. Sistem Team Pulse memastikan kesejahteraan psikologis setiap anggota terpantau tanpa terkesan menginterogasi. Riset internal membuktikan bahwa tim yang didukung secara emosional mencatat stabilitas output hingga <span className="text-slate-900 font-black border-b-[4px] border-slate-900 uppercase">300% Lebih Konsisten</span>.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Modals ───────────────────────────────────────────────────────────── */}
            {selectedStatModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => { e.target === e.currentTarget && setSelectedStatModal(null) }}>
                    <div className="bg-white border-[4px] border-slate-900 w-full max-w-md rounded-[2rem] shadow-[12px_12px_0px_rgba(15,23,42,1)] overflow-hidden animate-in zoom-in-95 mt-10">
                        <div className="p-4 bg-slate-100 border-b-[4px] border-slate-900 flex justify-between items-center">
                            <h2 className="font-black text-xl uppercase tracking-tight text-slate-900 flex items-center gap-2">
                                <BarChart3 className="text-accent" size={20} strokeWidth={3} /> {selectedStatModal}
                            </h2>
                            <button onClick={() => setSelectedStatModal(null)} className="p-1.5 hover:bg-slate-200 rounded-xl transition-colors border-2 border-transparent hover:border-slate-900"><X size={20} strokeWidth={3} /></button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            {(() => {
                                if (selectedStatModal === 'Total Entri') {
                                    return (
                                        <div className="space-y-4">
                                            <p className="font-bold text-slate-700">Detail entri mood dalam periode yang dipilih.</p>
                                            <div className="bg-slate-100 p-4 border-[3px] border-slate-900 rounded-2xl shadow-hard-mini">
                                                <ul className="space-y-2">
                                                    {workspaceUsers.map(u => {
                                                        const userMoods = filteredMoods.filter(m => m.user_id === u.id);
                                                        return (
                                                            <li key={u.id} className="flex justify-between items-center border-b-2 border-slate-200 pb-2 last:border-0 last:pb-0">
                                                                <div className="flex items-center gap-2">
                                                                    <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`} className="w-8 h-8 rounded-lg border-2 border-slate-900" alt="" />
                                                                    <span className="font-bold text-sm">{u.name}</span>
                                                                </div>
                                                                <span className="font-black text-slate-900 bg-white px-2 py-1 rounded-md border-2 border-slate-900">{userMoods.length} entri</span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        </div>
                                    );
                                } else if (selectedStatModal === 'Anggota Aktif') {
                                    const activeUsers = new Set(filteredMoods.map(m => m.user_id));
                                    return (
                                        <div className="space-y-4">
                                            <p className="font-bold text-slate-700">Anggota yang telah mengisi mood pada periode yang dipilih.</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {workspaceUsers.map(u => {
                                                    const isActive = activeUsers.has(u.id);
                                                    return (
                                                        <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border-[3px] shadow-hard-mini ${isActive ? 'bg-emerald-100 border-emerald-900' : 'bg-slate-100 border-slate-400 opacity-60'}`}>
                                                            <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`} className={`w-10 h-10 rounded-lg border-2 ${isActive ? 'border-emerald-900' : 'border-slate-400'} shadow-sm`} alt="" />
                                                            <div className="overflow-hidden">
                                                                <div className="font-bold text-sm truncate text-slate-900">{u.name}</div>
                                                                <div className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>{isActive ? 'Aktif' : 'Pasif'}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                } else if (selectedStatModal === 'Responden Hari Ini') {
                                    const todayStr = new Date().toISOString().split('T')[0];
                                    const todayMoods = moods.filter(m => m.created_at.startsWith(todayStr));
                                    const responderIds = new Set(todayMoods.map(m => m.user_id));
                                    return (
                                        <div className="space-y-4">
                                            <p className="font-bold text-slate-700">Responden yang telah mengisi mood hari ini ({todayMoods.length} Entri).</p>
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Sudah Mengisi</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {workspaceUsers.filter(u => responderIds.has(u.id)).map(u => (
                                                            <div key={u.id} className="flex items-center gap-2 bg-white border-[2px] border-slate-900 rounded-lg p-1.5 shadow-hard-mini font-bold text-xs"><img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`} className="w-6 h-6 rounded border border-slate-900" alt="" />{u.name}</div>
                                                        ))}
                                                        {workspaceUsers.filter(u => responderIds.has(u.id)).length === 0 && <p className="text-xs text-slate-400 italic font-bold">Belum ada responden</p>}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Belum Mengisi</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {workspaceUsers.filter(u => !responderIds.has(u.id)).map(u => (
                                                            <div key={u.id} className="bg-slate-100 border-[2px] border-slate-300 rounded-lg px-2 py-1.5 font-bold text-xs text-slate-500">{u.name}</div>
                                                        ))}
                                                        {workspaceUsers.filter(u => !responderIds.has(u.id)).length === 0 && <p className="text-xs text-slate-400 italic font-bold">Semua sudah mengisi</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                } else if (selectedStatModal === 'Rata-Rata Mood') {
                                    return (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-center p-8 bg-violet-100 border-[4px] border-violet-900 rounded-2xl shadow-hard">
                                                <div className="text-center">
                                                    <span className="text-6xl font-black text-violet-900 font-heading">{avgScore}</span>
                                                    <p className="text-xs font-black text-violet-700 uppercase tracking-widest mt-2">Dari Skala 1 - 5</p>
                                                </div>
                                            </div>
                                            <div className="bg-white border-[3px] border-slate-900 rounded-2xl p-4 shadow-hard-mini">
                                                <h4 className="font-black text-sm uppercase tracking-widest text-slate-700 mb-4 border-b-2 border-slate-200 pb-2">Distribusi Skor</h4>
                                                <div className="space-y-2">
                                                    {[5, 4, 3, 2, 1].map(score => {
                                                        const count = filteredMoods.filter(m => getMeta(m.mood_label).score === score).length;
                                                        const pct = filteredMoods.length ? Math.round((count / filteredMoods.length) * 100) : 0;
                                                        return (
                                                            <div key={score} className="flex items-center gap-3">
                                                                <div className="w-12 font-black text-slate-500">Skor {score}</div>
                                                                <div className="flex-1 h-4 bg-slate-100 rounded-full border border-slate-900 overflow-hidden">
                                                                    <div className="h-full bg-slate-800 border-r border-slate-900 transition-all" style={{ width: `${pct}%` }} />
                                                                </div>
                                                                <div className="w-10 text-right font-bold text-sm">{count}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {selectedUserModal && (() => {
                const user = workspaceUsers.find(u => u.id === selectedUserModal);
                if (!user) return null;

                const userMoods = moods.filter(m => m.user_id === selectedUserModal).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const latest = userMoods[0];
                const latestMeta = latest ? getMeta(latest.mood_label) : null;
                const currentUserId = localStorage.getItem('user_id');

                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => { e.target === e.currentTarget && setSelectedUserModal(null) }}>
                        <div className="bg-white border-[4px] border-slate-900 w-full max-w-2xl rounded-[2rem] shadow-[12px_12px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 mt-10">
                            <div className="p-4 bg-slate-100 border-b-[4px] border-slate-900 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <img src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-white" alt="" />
                                    <div>
                                        <h2 className="font-black text-lg uppercase tracking-tight text-slate-900">{user.name}</h2>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{user.role || 'Member'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedUserModal(null)} className="p-1.5 hover:bg-slate-200 rounded-xl transition-colors border-2 border-transparent hover:border-slate-900"><X size={20} strokeWidth={3} /></button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                {/* Latest Status */}
                                {latest && latestMeta && (
                                    <div className="flex items-center gap-4 p-4 rounded-[1.5rem] border-[3px] border-slate-900 shadow-hard-mini" style={{ backgroundColor: latestMeta.bg }}>
                                        <div className="text-4xl bg-white w-16 h-16 rounded-2xl border-2 border-slate-900 shadow-sm flex items-center justify-center -rotate-3">{latest.mood_emoji}</div>
                                        <div>
                                            <h4 className="font-black text-sm uppercase tracking-widest text-slate-600 mb-1">Status Terbaru</h4>
                                            <div className="flex items-center gap-2 font-bold text-lg text-slate-900">
                                                {latest.mood_label}
                                                <span className="text-xs font-semibold px-2 py-0.5 bg-white rounded-md border border-slate-900 shadow-sm">{relativeTime(latest.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Recent History Inline Table */}
                                <div className="space-y-3">
                                    <h4 className="font-black text-xs uppercase tracking-widest text-slate-500 flex items-center gap-2"><Clock size={14} strokeWidth={3} /> Riwayat Terakhir</h4>
                                    {userMoods.length > 0 ? (
                                        <div className="bg-slate-50 border-[3px] border-slate-900 rounded-2xl overflow-hidden shadow-hard-mini">
                                            <table className="w-full text-left border-collapse min-w-full">
                                                <thead>
                                                    <tr className="bg-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 border-b-[3px] border-slate-900">
                                                        <th className="p-3 whitespace-nowrap">Waktu</th>
                                                        <th className="p-3">Mood</th>
                                                        <th className="p-3 hidden sm:table-cell w-24">Skor</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {userMoods.slice(0, 10).map(m => {
                                                        const meta = getMeta(m.mood_label);
                                                        return (
                                                            <tr key={m.id} className="border-b-2 border-slate-200 last:border-b-0 hover:bg-white transition-colors">
                                                                <td className="p-3 text-xs font-bold text-slate-700 whitespace-nowrap align-middle">
                                                                    {new Date(m.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', ':')}
                                                                </td>
                                                                <td className="p-3 align-middle">
                                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border-[2px] border-slate-900 text-xs font-bold shadow-sm whitespace-nowrap">
                                                                        <span className="text-sm leading-none">{m.mood_emoji}</span> {m.mood_label}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 hidden sm:table-cell align-middle">
                                                                    <div className="flex gap-0.5">
                                                                        {[1, 2, 3, 4, 5].map(s => (
                                                                            <div key={s} className={`w-2 h-3 rounded-[1px] border border-slate-900 ${s <= meta.score ? 'bg-slate-800' : 'bg-transparent'}`}></div>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-slate-50 border-[3px] border-slate-900 rounded-2xl border-dashed text-center font-bold text-slate-400">Belum ada data riwayat</div>
                                    )}
                                </div>

                                {/* Support Actions */}
                                {user.id !== currentUserId && latest && (
                                    <div className="space-y-3">
                                        <h4 className="font-black text-xs uppercase tracking-widest text-slate-500 flex items-center gap-2"><HandHeart size={14} strokeWidth={3} /> Kirim Dukungan (Maksimal 1 Jam Berapa Pun)</h4>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                            {(['hug', 'coffee', 'donut', 'high_five'] as const).map(type => {
                                                const emojis = { hug: '🤗', coffee: '☕', donut: '🍩', high_five: '🙌' };
                                                const labels = { hug: 'Hug', coffee: 'Coffee', donut: 'Donut', high_five: 'High Five' };
                                                return (
                                                    <button
                                                        key={type}
                                                        disabled={sendingSupport === user.id || sentSupport.has(user.id)}
                                                        onClick={() => sendVirtualSupport(latest, type)}
                                                        className="p-3 rounded-xl border-[3px] border-slate-900 bg-white hover:-translate-y-1 hover:shadow-hard-mini transition-all active:translate-y-0 active:shadow-none font-bold text-sm disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex flex-col items-center gap-1.5"
                                                    >
                                                        <span className="text-3xl">{emojis[type]}</span>
                                                        <span className="text-[10px] uppercase tracking-widest">{labels[type]}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {(sendingSupport === user.id || sentSupport.has(user.id)) && (
                                            <p className="text-xs font-black text-emerald-600 text-center mt-2">✨ Dukungan berhasil dikirim! Silakan tunggu jika ingin mengirim lagi nanti.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            <style>{`
                @keyframes moodPulseFloat {
                    0%,100% { transform: translateY(0) scale(1); }
                    50%     { transform: translateY(-3px) scale(1.1); }
                }
            `}</style>
        </div>
    );
};
