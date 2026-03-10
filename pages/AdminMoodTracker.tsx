import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import {
    Smile, Heart, Users, Calendar, Activity, TrendingUp,
    RefreshCw, BarChart3, PieChart as PieIcon,
    AlertTriangle, Clock, Coffee, HandHeart, X, Settings
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
const BASE_MOOD_META: Record<string, { color: string; bg: string; text: string; score: number }> = {
    // Current Indonesian
    'Semangat': { color: '#ef4444', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 5 },
    'Baik': { color: '#f97316', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#000000', score: 4 },
    'Biasa': { color: '#3b82f6', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 3 },
    'Capek': { color: '#78350f', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 2 },
    'Burnout': { color: '#64748b', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 1 },

    // Colloquial Indonesian (from your screenshots)
    'Semangat!': { color: '#ef4444', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 5 },
    'Lagi Happy': { color: '#f97316', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#000000', score: 4 },
    'Biasa Aja': { color: '#3b82f6', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 3 },
    'Lagi Capek': { color: '#78350f', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 2 },
    'Lagi Burnout': { color: '#64748b', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 1 },

    // Legacy English (Case Insensitive equivalents in getMeta)
    'HAPPY': { color: '#ef4444', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 5 },
    'EXCITED': { color: '#ef4444', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 5 },
    'SUPER': { color: '#ef4444', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 5 },
    'GOOD': { color: '#f97316', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#000000', score: 4 },
    'CALM': { color: '#f97316', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#000000', score: 4 },
    'FINE': { color: '#3b82f6', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 3 },
    'NEUTRAL': { color: '#3b82f6', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 3 },
    'TIRED': { color: '#78350f', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 2 },
    'SAD': { color: '#78350f', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 2 },
    'ANGRY': { color: '#64748b', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 1 },
    'BURNOUT': { color: '#64748b', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff', score: 1 },
};

const SCORE_STYLES: Record<number, { color: string; bg: string; text: string }> = {
    5: { color: '#ef4444', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff' },
    4: { color: '#f97316', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#000000' },
    3: { color: '#3b82f6', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff' },
    2: { color: '#78350f', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff' },
    1: { color: '#64748b', bg: 'bg-slate-50 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100', text: '#ffffff' },
};

const PIE_COLORS = ['#ef4444', '#f97316', '#3b82f6', '#78350f', '#64748b'];

const DEFAULT_MOOD_CONFIG = {
    5: { label: 'Semangat', emoji: '🔥' },
    4: { label: 'Baik', emoji: '😊' },
    3: { label: 'Biasa', emoji: '😐' },
    2: { label: 'Capek', emoji: '🫩' },
    1: { label: 'Burnout', emoji: '😵‍💫' }
};

// ── Helper ───────────────────────────────────────────────────────
const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Baru saja';
    if (m < 60) return `${m} menit lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    return `${Math.floor(h / 24)} hari lalu`;
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

    // Support indicators
    const [receivedSupports, setReceivedSupports] = useState<Set<string>>(new Set());

    // Settings Modal State
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [moodSettings, setMoodSettings] = useState<Record<number, { label: string; emoji: string }>>(DEFAULT_MOOD_CONFIG);

    const currentUserId = localStorage.getItem('user_id');
    const isDeveloper = workspaceUsers.find(u => u.id === currentUserId)?.role === 'Developer';

    // ── Dynamic Mood Logic ─────────────────────────────────────────
    const getMeta = useCallback((label: string) => {
        const upLabel = label.toUpperCase();

        // 1. Check if the current settings have this exact label (case insensitive search)
        const currentEntry = Object.entries(moodSettings).find(([_, data]) => (data as any).label.toUpperCase() === upLabel);
        if (currentEntry) {
            const score = parseInt(currentEntry[0]);
            return { ...SCORE_STYLES[score], score, mood_label: (moodSettings as any)[score].label, mood_emoji: (moodSettings as any)[score].emoji };
        }

        // 2. If not found, check BASE_MOOD_META to find what "level/score" this label historically represents
        // Also check uppercase variant for legacy data robustness
        const base = BASE_MOOD_META[label] || BASE_MOOD_META[upLabel];
        if (base) {
            const score = base.score;
            // Map historical label to the CURRENT configuration for this score level
            const currentConfig = (moodSettings as any)[score];
            if (currentConfig) {
                return {
                    ...SCORE_STYLES[score],
                    score,
                    mood_label: currentConfig.label,
                    mood_emoji: currentConfig.emoji
                };
            }
            return { ...base, mood_label: label, mood_emoji: '😐' };
        }

        // Final fallback
        return { ...SCORE_STYLES[3], score: 3, mood_label: label, mood_emoji: '😐' };
    }, [moodSettings]);

    // ── Mood Heatmap Component (Internal) ──────────────────────────
    const MoodHeatmap: React.FC<{ moods: UserMood[] }> = ({ moods }) => {
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

            const emojiCount: Record<string, number> = {};
            dayMoods.forEach(m => {
                const meta = getMeta(m.mood_label);
                emojiCount[meta.mood_emoji] = (emojiCount[meta.mood_emoji] || 0) + 1;
            });
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
            if (score === null) return isDarkMode ? '#1e293b' : '#f1f5f9';
            if (score >= 4.5) return SCORE_STYLES[5].color;
            if (score >= 3.5) return SCORE_STYLES[4].color;
            if (score >= 2.5) return SCORE_STYLES[3].color;
            if (score >= 1.5) return SCORE_STYLES[2].color;
            return SCORE_STYLES[1].color;
        };

        const WEEK_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const startDow = new Date(days[0].date).getDay();
        const padded = [...Array(startDow).fill(null), ...days];
        const weeks = Math.ceil(padded.length / 7);

        return (
            <div className="space-y-3">
                <div className="flex gap-1 items-start">
                    <div className="flex flex-col gap-1.5 pt-0">
                        {WEEK_LABELS.map(d => (
                            <div key={d} className="h-7 flex items-center">
                                <span className="text-[8px] font-black text-slate-400 uppercase w-6">{d}</span>
                            </div>
                        ))}
                    </div>
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
                                                title={`${cell.label}\n${cell.count} entri${cell.score !== null ? ` • Skor: ${cell.score.toFixed(1)}` : ''}`}
                                                className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] transition-transform hover:scale-125 cursor-default ${isToday ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`}
                                                style={{ background: bg }}
                                            >
                                                {cell.count > 0 && cell.emoji ? cell.emoji : (cell.count > 0 ? '·' : '')}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 pt-1 justify-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rendah</span>
                    {[1, 2, 3, 4, 5].map(s => (
                        <div key={s} className="w-4 h-4 rounded" style={{ background: SCORE_STYLES[s].color }} />
                    ))}
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tinggi</span>
                </div>
            </div>
        );
    };

    // ── Reactive dark mode detection ──────────────────────────────
    const [isDarkMode, setIsDarkMode] = useState(() =>
        document.documentElement.classList.contains('theme-dark') ||
        document.documentElement.classList.contains('theme-midnight')
    );
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(
                document.documentElement.classList.contains('theme-dark') ||
                document.documentElement.classList.contains('theme-midnight')
            );
        });
        observer.observe(document.documentElement, { attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

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
            // 1. Fetch workspace users & config
            const { data: wsData } = await supabase.from('workspaces').select('owner_id, members, admin_id, mood_config').eq('id', wsId).single();

            if (wsData?.mood_config) {
                setMoodSettings(wsData.mood_config);
            } else {
                setMoodSettings(DEFAULT_MOOD_CONFIG);
            }

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

            // 3. Fetch support notifications for the last 24h
            const { data: supportNotifs } = await supabase
                .from('notifications')
                .select('recipient_id')
                .in('recipient_id', userIds)
                .eq('type', 'MOOD_SUPPORT')
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

            if (supportNotifs) {
                setReceivedSupports(new Set(supportNotifs.map(n => n.recipient_id)));
            }
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
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'workspaces',
                filter: `id=eq.${selectedWorkspaceId}`
            }, (payload) => {
                if (payload.new.mood_config) {
                    console.log('[Realtime] Mood configuration updated globally');
                    setMoodSettings(payload.new.mood_config);
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
            // Find all historical moods for this user (from heatmapMoods because it has 35 days)
            const userHistory = heatmapMoods
                .filter(m => m.user_id === u.id)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            const latest = userHistory[0];

            // 1. Dots (Last 5 unique days)
            const uniqueDays: Record<string, UserMood> = {};
            userHistory.forEach(m => {
                const d = m.created_at.split('T')[0];
                if (!uniqueDays[d]) uniqueDays[d] = m;
            });
            const dots = Object.values(uniqueDays).slice(0, 5).map(m => getMeta(m.mood_label).color);

            // 2. Streak count (consecutive days)
            let streak = 0;
            const daysSet = new Set(Object.keys(uniqueDays));
            const check = new Date();
            // If didn't check in today, starts from yesterday
            if (!daysSet.has(check.toISOString().split('T')[0])) {
                check.setDate(check.getDate() - 1);
            }
            while (daysSet.has(check.toISOString().split('T')[0])) {
                streak++;
                check.setDate(check.getDate() - 1);
            }

            // 3. Trend Indicator
            let trend = 'stable'; // 'up' | 'down' | 'stable'
            const prev = Object.values(uniqueDays)[1];
            if (latest && prev) {
                const s1 = getMeta(latest.mood_label).score;
                const s2 = getMeta(prev.mood_label).score;
                if (s1 > s2) trend = 'up';
                else if (s1 < s2) trend = 'down';
            }

            return {
                user_id: u.id,
                user: { full_name: u.name, avatar_url: u.avatar_url || '', role: u.role || '' },
                mood: latest,
                dots,
                streak,
                trend,
                receivedSupport: receivedSupports.has(u.id)
            };
        }).sort((a, b) => {
            const timeA = a.mood ? new Date(a.mood.created_at).getTime() : 0;
            const timeB = b.mood ? new Date(b.mood.created_at).getTime() : 0;
            return timeB - timeA;
        });
    })();

    const distribution = (() => {
        const dist: Record<string, { count: number; emoji: string; color: string; label: string }> = {};
        filteredMoods.forEach(m => {
            const meta = getMeta(m.mood_label);
            const key = meta.mood_label; // use the current label from settings
            if (!dist[key]) dist[key] = { count: 0, emoji: meta.mood_emoji, color: meta.color, label: meta.mood_label };
            dist[key].count++;
        });
        return Object.entries(dist)
            .map(([_, d]) => ({ name: d.label, value: d.count, emoji: d.emoji, color: d.color }))
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

    // ── Heatmap Insight Computations (A) ─────────────────────────────
    const heatmapInsights = (() => {
        const DOW = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

        // Best/worst day of week
        const byDow: Record<number, { total: number; score: number; count: number }> = {};
        filteredMoods.forEach(m => {
            const d = new Date(m.created_at).getDay();
            if (!byDow[d]) byDow[d] = { total: 0, score: 0, count: 0 };
            byDow[d].total++;
            byDow[d].score += getMeta(m.mood_label).score;
            byDow[d].count++;
        });
        const dowAvgs = Object.entries(byDow)
            .map(([d, v]) => ({ day: DOW[Number(d)], avg: v.score / v.total }))
            .sort((a, b) => b.avg - a.avg);
        const bestDay = dowAvgs[0] ?? null;
        const worstDay = dowAvgs[dowAvgs.length - 1] ?? null;

        // Check-in rate today
        const today = new Date().toISOString().split('T')[0];
        const checkedInToday = new Set(moods.filter(m => m.created_at.startsWith(today)).map(m => m.user_id)).size;
        const totalMembers = workspaceUsers.length || 1;
        const checkinRate = Math.round((checkedInToday / totalMembers) * 100);

        // Team streak: consecutive days (backwards from today) with ≥1 entry
        let streak = 0;
        const allDates = new Set(moods.map(m => m.created_at.split('T')[0]));
        const cur = new Date();
        while (true) {
            const key = cur.toISOString().split('T')[0];
            if (!allDates.has(key)) break;
            streak++;
            cur.setDate(cur.getDate() - 1);
            if (streak > 90) break;
        }

        // "Minggu Ini" strip (Option C) — Mon to Sun of current week
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
        const thisWeekDays = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            const dateKey = d.toISOString().split('T')[0];
            const dayMoods = moods.filter(m => m.created_at.startsWith(dateKey));
            const avgSc = dayMoods.length > 0
                ? dayMoods.reduce((s, m) => s + getMeta(m.mood_label).score, 0) / dayMoods.length
                : null;
            const topEmoji = dayMoods.length > 0
                ? dayMoods.sort((a, b) => getMeta(b.mood_label).score - getMeta(a.mood_label).score)[0]?.mood_emoji
                : null;
            const isToday = dateKey === today;
            const isFuture = d > now;
            return { label: DOW[(d.getDay())], dateKey, avgSc, topEmoji, isToday, isFuture, count: dayMoods.length };
        });

        return { bestDay, worstDay, checkinRate, checkedInToday, totalMembers, streak, thisWeekDays };
    })();

    const STATS = [
        { label: 'Total Entri', value: filteredMoods.length, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-100 border-blue-200 dark:border-blue-800', note: 'semua respons' },
        { label: 'Anggota Aktif', value: latestPerUser.length, icon: Users, color: 'text-purple-500', bg: 'bg-purple-100 border-purple-200 dark:border-purple-800', note: 'unik responden' },
        { label: 'Responden Hari Ini', value: respondersToday, icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-100 border-emerald-200 dark:border-emerald-800', note: 'login hari ini' },
        { label: 'Rata-Rata Mood', value: `${avgScore}/5`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-100 border-amber-200 dark:border-amber-800', note: 'skor tim' },
    ];

    // ── Chart styles (reactive to theme changes via isDarkMode state) ─
    const chartTooltipStyle = isDarkMode
        ? { borderRadius: '12px', border: '2px solid #475569', fontWeight: 700, fontSize: 11, backgroundColor: '#1e293b', color: '#f1f5f9' }
        : { borderRadius: '12px', border: '3px solid #0f172a', fontWeight: 700, fontSize: 11, backgroundColor: '#ffffff', color: '#0f172a' };

    const chartGridColor = isDarkMode ? '#334155' : '#e2e8f0';
    const chartAxisColor = isDarkMode ? '#94a3b8' : '#64748b';
    const legendTextColor = isDarkMode ? '#cbd5e1' : '#334155';

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
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 bg-card p-10 rounded-[3rem] border-[3.5px] border-slate-900 dark:border-slate-700 shadow-hard mb-12">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-1.5 rounded-full border-[3px] border-slate-900 dark:border-slate-700 bg-pink-100/50 dark:bg-pink-900/30 text-pink-600 font-black text-[10px] uppercase tracking-[0.2em] shadow-hard-mini flex items-center gap-2">
                            <Heart size={14} fill="currentColor" strokeWidth={3} /> Admin Zone
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground font-bold text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border-[2px] border-slate-200 dark:border-slate-700">
                            <Activity size={14} className="text-accent" strokeWidth={3} /> Psychological Tracker
                        </div>
                    </div>
                    <h1 className="text-4xl lg:text-6xl font-heading font-black text-foreground leading-tight uppercase tracking-tight">
                        Team Reflection
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold max-w-xl text-lg leading-relaxed">
                        Monitor kesejahteraan psikologis tim secara real-time untuk menciptakan lingkungan kerja yang lebih produktif dan empatik.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 -mb-1">
                    {/* Workspace Filter */}
                    <div className="relative">
                        <select
                            value={selectedWorkspaceId}
                            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                            className="p-3 sm:p-3.5 rounded-2xl border-[3.5px] border-indigo-300 dark:border-indigo-700 shadow-hard font-black text-xs uppercase tracking-widest text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 cursor-pointer min-w-[160px]"
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
                            className="p-3 sm:p-3.5 rounded-2xl border-[3.5px] border-slate-900 dark:border-slate-700 shadow-hard font-black text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 outline-none focus:border-slate-900 dark:focus:border-slate-500 cursor-pointer min-w-[160px]"
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
                        className="p-3 sm:p-3.5 rounded-2xl border-[3.5px] border-slate-900 dark:border-slate-700 shadow-hard hover:-translate-y-1 active:translate-y-0 active:shadow-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shrink-0"
                        title="Refresh"
                    >
                        <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} strokeWidth={3} />
                    </button>

                    {isDeveloper && (
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            className="p-3 sm:p-3.5 rounded-2xl border-[3.5px] border-slate-900 dark:border-slate-700 shadow-hard hover:-translate-y-1 active:translate-y-0 active:shadow-none bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white transition-all shrink-0"
                            title="Mood Settings"
                        >
                            <Settings size={20} strokeWidth={3} />
                        </button>
                    )}

                    <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border-[3.5px] border-slate-900 dark:border-slate-700 shadow-hard gap-0.5 overflow-x-auto w-full sm:w-auto">
                        {(['today', '7d', '30d', 'all'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setTimeRange(r)}
                                className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${timeRange === r ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                {r === 'today' ? 'Hari Ini' : r === '7d' ? '7 Hari' : r === '30d' ? '30 Hari' : 'Semua'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Alert: Burnout Detection ─────────────────────── */}
            {burnoutCount > 0 && (
                <div className="bg-red-100 border-[3.5px] border-slate-900 dark:border-red-800 rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center gap-5 shadow-hard-mini transition-all hover:-translate-y-1">
                    <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center flex-shrink-0 border-[3px] border-slate-900 dark:border-rose-800 shadow-hard-mini transform -rotate-6">
                        <AlertTriangle size={24} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h4 className="font-black text-base text-red-700 uppercase tracking-widest mb-1">⚠️ Perhatian Diperlukan</h4>
                        <p className="text-sm font-bold text-red-700 leading-relaxed max-w-3xl">
                            Ada <span className="bg-red-200 dark:bg-red-900/50 px-1.5 py-0.5 rounded border border-red-300 dark:border-red-700 font-black">{burnoutCount} anggota tim</span> saat ini melaporkan bahwa mereka merasa <strong className="text-red-700">Burnout</strong>.
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
                        className="bg-card border-[3.5px] border-slate-900 dark:border-slate-700 rounded-[2rem] p-6 shadow-hard hover:-translate-y-2 hover:shadow-[10px_10px_0px_rgba(15,23,42,1)] dark:hover:shadow-[10px_10px_0px_rgba(51,65,85,1)] transition-all duration-300 cursor-pointer"
                    >
                        <div className={`w-14 h-14 ${s.bg} border-[3px] border-slate-900 dark:border-slate-700 shadow-hard-mini rounded-2xl flex items-center justify-center mb-4`}>
                            <s.icon size={24} className={s.color} strokeWidth={2.5} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">{s.label}</p>
                        <p className="text-4xl font-black font-heading text-slate-900 dark:text-slate-100 leading-none">{s.value}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-2 bg-slate-100 dark:bg-slate-800/50 rounded-md px-2 py-1 uppercase tracking-widest inline-block">{s.note}</p>
                    </div>
                ))}
            </div>

            {/* ── Dashboard Middle Layer: Snapshots & Heatmap ───── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                {/* ── Left: Today's Team Mood Snapshot ────────────── */}
                {latestPerUser.length > 0 && (
                    <div className="bg-card border-[3.5px] border-slate-900 dark:border-slate-700 rounded-[2.5rem] shadow-hard overflow-hidden h-full flex flex-col">
                        <div className="p-6 md:p-8 border-b-[3.5px] border-slate-900 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-rose-200 dark:bg-rose-900/40 border-[3px] border-slate-900 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-hard-mini transform -rotate-3">
                                    <Smile size={24} className="text-rose-700 dark:text-rose-400" strokeWidth={2.5} />
                                </div>
                                <h3 className="font-black text-xl text-slate-900 dark:text-slate-100 uppercase tracking-tight">Mood Terkini</h3>
                            </div>
                            <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-xl border-[2.5px] border-slate-900 dark:border-slate-700 shadow-hard-mini">
                                <span className="w-2 h-2 bg-emerald-500 border border-slate-900 dark:border-emerald-900 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Live</span>
                            </div>
                        </div>

                        <div className="p-4 md:p-6 pt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-6 flex-1 items-start">
                            {latestPerUser.map((item) => {
                                const m = item.mood;
                                const hasMood = !!m;
                                const meta = hasMood ? getMeta(m!.mood_label) : { bg: 'bg-slate-50 dark:bg-slate-800/30', color: '#cbd5e1', score: 0 };
                                const currentUserId = localStorage.getItem('user_id');
                                const isSelf = item.user_id === currentUserId;
                                return (
                                    <div
                                        key={item.user_id}
                                        onClick={() => setSelectedUserModal(item.user_id)}
                                        className={hasMood ? `${meta.bg} flex items-center gap-4 p-3 rounded-[1.5rem] border-[3px] transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-hard border-slate-900 border-opacity-20 hover:border-opacity-100 dark:border-opacity-40 relative min-h-[90px]` : `flex items-center gap-4 p-3 rounded-[1.5rem] border-[3px] transition-all duration-300 cursor-pointer border-slate-300 dark:border-slate-700 grayscale-[40%] opacity-80 bg-slate-50 dark:bg-slate-800/30 relative min-h-[90px]`}
                                    >
                                        {hasMood && (
                                            <div className="absolute top-0 right-2 -translate-y-[70%] z-[30] pointer-events-none">
                                                <span
                                                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-hard border-[2px] border-slate-900 transform -rotate-1 inline-block whitespace-nowrap`}
                                                    style={{ backgroundColor: meta.color, color: meta.text }}
                                                >
                                                    {getMeta(m!.mood_label).mood_label}
                                                </span>
                                            </div>
                                        )}

                                        {/* Left Side: Enlarged Visuals (Avatar + Emoji + Heart) */}
                                        <div className="relative shrink-0 w-16 h-16">
                                            <img
                                                src={item.user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${item.user.full_name}`}
                                                className="w-full h-full rounded-2xl border-[3px] border-slate-900 dark:border-slate-700 object-cover shadow-hard-mini"
                                                alt=""
                                            />
                                            {hasMood && (
                                                <span className="absolute -bottom-1.5 -right-1.5 w-9 h-9 bg-white dark:bg-slate-800 rounded-full text-xl flex items-center justify-center border-[3px] border-slate-900 dark:border-slate-600 shadow-hard-mini z-10 transition-transform hover:scale-110">
                                                    {getMeta(m!.mood_label).mood_emoji}
                                                </span>
                                            )}
                                            {item.receivedSupport && (
                                                <span className="absolute -top-2 -left-2 w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center border-[2.5px] border-slate-900 dark:border-pink-900/50 shadow-hard-mini animate-bounce z-20">
                                                    <Heart size={16} fill="white" className="text-white" />
                                                </span>
                                            )}
                                        </div>

                                        {/* Content Area: Name, Time, Dots */}
                                        <div className="flex-1 min-w-0 pr-4 space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <p className={`text-base tracking-tight font-black truncate ${hasMood ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-400'}`}>{item.user.full_name || '–'}</p>
                                                {item.streak > 1 && (
                                                    <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[8px] font-black px-1.5 py-0.5 rounded-md border border-slate-900 dark:border-slate-700">
                                                        🔥{item.streak}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                {hasMood ? (
                                                    <>
                                                        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-900 dark:text-slate-100 leading-none">
                                                            <Clock size={12} strokeWidth={3} className="shrink-0" />
                                                            {new Date(m!.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} WIB
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-4.5">
                                                            {relativeTime(m!.created_at)}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Belum Update</span>
                                                )}
                                            </div>

                                            {/* Bottom: History Color Dots */}
                                            <div className="flex gap-1.5 pt-1.5">
                                                {item.dots.length > 0 ? item.dots.map((color, idx) => (
                                                    <div key={idx} className="w-2.5 h-2.5 rounded-full border border-black/10 dark:border-white/20 shadow-sm" style={{ backgroundColor: color }} />
                                                )) : (
                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest opacity-50">No Data</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Right: Mood Heatmap 35 Hari ─────────────────── */}
                <div className="bg-card border-[3.5px] border-slate-900 dark:border-slate-700 rounded-[2.5rem] shadow-hard overflow-hidden h-full flex flex-col">
                    <div className="p-6 md:p-8 border-b-[3.5px] border-slate-900 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-200 dark:bg-indigo-900/40 border-[3px] border-slate-900 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-hard-mini transform rotate-3">
                                <Calendar size={24} className="text-indigo-700 dark:text-indigo-400" strokeWidth={2.5} />
                            </div>
                            <h3 className="font-black text-xl text-slate-900 dark:text-slate-100 uppercase tracking-tight">Heatmap Mood</h3>
                        </div>
                    </div>
                    <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                        {filteredMoods.length > 0 ? (
                            <MoodHeatmap moods={filteredHeatmap} />
                        ) : (
                            <div className="py-8 text-center">
                                <span className="text-4xl opacity-20">📅</span>
                                <p className="text-sm font-bold text-muted-foreground mt-2">Belum ada data mood</p>
                            </div>
                        )}
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-6 text-center">Tren mood 35 hari terakhir</p>
                    </div>
                </div>
            </div>


            {/* ── 2. Insight Cards Row ──────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Best Day */}
                <div className="bg-card border-[3.5px] border-slate-900 dark:border-slate-700 rounded-[2rem] p-6 shadow-hard hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-emerald-100 border-[3px] border-slate-900 dark:border-emerald-800 shadow-hard-mini rounded-2xl flex items-center justify-center mb-4">
                        <span className="text-xl">🏆</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Hari Terbaik</p>
                    {heatmapInsights.bestDay ? (
                        <>
                            <p className="text-4xl font-black font-heading text-emerald-600 dark:text-emerald-400 leading-none">{heatmapInsights.bestDay.day}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-md px-2 py-1 uppercase tracking-widest inline-block">avg {heatmapInsights.bestDay.avg.toFixed(1)}/5</p>
                        </>
                    ) : (
                        <p className="text-4xl font-black font-heading text-slate-300 dark:text-slate-600 leading-none">–</p>
                    )}
                </div>

                {/* Worst Day */}
                <div className="bg-card border-[3.5px] border-slate-900 dark:border-slate-700 rounded-[2rem] p-6 shadow-hard hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-red-100 border-[3px] border-slate-900 dark:border-red-800 shadow-hard-mini rounded-2xl flex items-center justify-center mb-4">
                        <span className="text-xl">😰</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Hari Tersulit</p>
                    {heatmapInsights.worstDay && heatmapInsights.worstDay.day !== heatmapInsights.bestDay?.day ? (
                        <>
                            <p className="text-4xl font-black font-heading text-red-600 dark:text-red-400 leading-none">{heatmapInsights.worstDay.day}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-2 bg-red-50 dark:bg-red-900/30 rounded-md px-2 py-1 uppercase tracking-widest inline-block">avg {heatmapInsights.worstDay.avg.toFixed(1)}/5</p>
                        </>
                    ) : (
                        <p className="text-4xl font-black font-heading text-slate-300 dark:text-slate-600 leading-none">–</p>
                    )}
                </div>

                {/* Check-in Rate */}
                <div className="bg-card border-[3.5px] border-slate-900 dark:border-slate-700 rounded-[2rem] p-6 shadow-hard hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-blue-100 border-[3px] border-slate-900 dark:border-blue-800 shadow-hard-mini rounded-2xl flex items-center justify-center mb-4">
                        <span className="text-xl">📋</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Check-in Hari Ini</p>
                    <p className="text-4xl font-black font-heading text-blue-600 dark:text-blue-400 leading-none">{heatmapInsights.checkinRate}%</p>
                    <div className="mt-3 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-700"
                            style={{ width: `${heatmapInsights.checkinRate}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-2 bg-slate-100 dark:bg-slate-800/50 rounded-md px-2 py-1 uppercase tracking-widest inline-block">{heatmapInsights.checkedInToday}/{heatmapInsights.totalMembers} anggota</p>
                </div>

                {/* Team Streak */}
                <div className="bg-card border-[3.5px] border-slate-900 dark:border-slate-700 rounded-[2rem] p-6 shadow-hard hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 bg-amber-100 border-[3px] border-slate-900 dark:border-amber-800 shadow-hard-mini rounded-2xl flex items-center justify-center mb-4">
                        <span className="text-xl">🔥</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Streak Tim</p>
                    <p className="text-4xl font-black font-heading text-amber-600 dark:text-amber-400 leading-none">{heatmapInsights.streak}<span className="text-xl ml-1 font-bold">hr</span></p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-2 bg-amber-50 dark:bg-amber-900/30 rounded-md px-2 py-1 uppercase tracking-widest inline-block">berturut-turut</p>
                </div>
            </div>

            {/* ── 3. Minggu Ini Card ────────────────────────────── */}
            <div className="bg-card border-[3.5px] border-slate-900 dark:border-slate-700 rounded-[2.5rem] shadow-hard overflow-hidden">
                <div className="p-6 md:p-8 border-b-[3.5px] border-slate-900 dark:border-slate-700 flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50">
                    <div className="w-12 h-12 bg-violet-200 dark:bg-violet-900/40 border-[3px] border-slate-900 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-hard-mini transform -rotate-3">
                        <span className="text-xl">📆</span>
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-slate-900 dark:text-slate-100 uppercase tracking-tight">Refleksi Minggu Ini</h3>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Mood harian tim — Sen sampai Min</p>
                    </div>
                </div>
                <div className="p-6 md:p-8">
                    <div className="grid grid-cols-7 gap-3">
                        {heatmapInsights.thisWeekDays.map((day) => {
                            const bg = day.isFuture
                                ? 'bg-slate-50 dark:bg-slate-800/20 opacity-40'
                                : day.avgSc === null ? 'bg-slate-100 dark:bg-slate-800/40'
                                    : day.avgSc >= 4.5 ? 'bg-purple-100 dark:bg-purple-900/30'
                                        : day.avgSc >= 3.5 ? 'bg-blue-100 dark:bg-blue-900/30'
                                            : day.avgSc >= 2.5 ? 'bg-slate-100 dark:bg-slate-800/40'
                                                : day.avgSc >= 1.5 ? 'bg-orange-100 dark:bg-orange-900/30'
                                                    : 'bg-red-100 dark:bg-red-900/30';
                            return (
                                <div
                                    key={day.dateKey}
                                    title={day.count > 0 ? `${day.label}: ${day.count} entri, avg ${day.avgSc?.toFixed(1)}/5` : `${day.label}: belum ada data`}
                                    className={`${bg} rounded-2xl border-[3px] ${day.isToday
                                        ? 'border-slate-900 dark:border-indigo-400 shadow-hard-mini'
                                        : 'border-slate-200 dark:border-slate-700'
                                        } p-4 flex flex-col items-center gap-2 transition-transform hover:scale-105`}
                                >
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${day.isToday ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'
                                        }`}>{day.label}</span>
                                    <span className="text-2xl leading-none min-h-[2rem] flex items-center">
                                        {day.isFuture ? '' : day.topEmoji ?? '·'}
                                    </span>
                                    {day.count > 0 ? (
                                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/40 rounded-lg px-1.5 py-0.5">
                                            {day.avgSc?.toFixed(1)}/5
                                        </span>
                                    ) : !day.isFuture ? (
                                        <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600">—</span>
                                    ) : null}
                                    {day.isToday && (
                                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>


            {/* ── Charts Row ────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Pie Chart */}
                <div className="lg:col-span-5 bg-card border-[3.5px] border-slate-900 dark:border-slate-700 rounded-[2.5rem] shadow-hard overflow-hidden">
                    <div className="p-6 border-b-[3.5px] border-slate-900 dark:border-slate-700 flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50">
                        <div className="w-12 h-12 bg-violet-200 dark:bg-violet-900/40 border-[3px] border-slate-900 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-hard-mini transform -rotate-3">
                            <PieIcon size={24} className="text-violet-700 dark:text-violet-400" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-slate-900 dark:text-slate-100 uppercase tracking-tight">Distribusi Mood</h3>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Proporsi setiap mood dalam periode ini</p>
                        </div>
                    </div>
                    {
                        distribution.length > 0 ? (
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
                                            contentStyle={chartTooltipStyle}
                                            labelStyle={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom" height={40}
                                            formatter={(value, entry: any) => (
                                                <span style={{ fontSize: 10, fontWeight: 800, color: legendTextColor }}>
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
                        )
                    }
                </div>

                {/* Area Chart — Trend */}
                <div className="lg:col-span-7 bg-card border-[3.5px] border-slate-900 dark:border-slate-700 rounded-[2.5rem] shadow-hard overflow-hidden">
                    <div className="p-6 border-b-[3.5px] border-slate-900 dark:border-slate-700 flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50">
                        <div className="w-12 h-12 bg-blue-200 dark:bg-blue-900/40 border-[3px] border-slate-900 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-hard-mini transform rotate-3">
                            <BarChart3 size={24} className="text-blue-700 dark:text-blue-400" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-slate-900 dark:text-slate-100 uppercase tracking-tight">Tren Mood Tim</h3>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Rata-rata skor harian (1=Burnout → 5=Semangat)</p>
                        </div>
                    </div>
                    {
                        trendData.length > 0 ? (
                            <div className="p-6 h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                                        <XAxis dataKey="date" tick={{ fontSize: 9, fontWeight: 700, fill: chartAxisColor }} axisLine={false} tickLine={false} />
                                        <YAxis domain={[1, 5]} tick={{ fontSize: 9, fontWeight: 700, fill: chartAxisColor }} axisLine={false} tickLine={false} width={20} />
                                        <Tooltip
                                            contentStyle={chartTooltipStyle}
                                            labelStyle={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 700, fontSize: 10 }}
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
                        )
                    }
                </div>
            </div>

            {/* ── Full History Table ────────────────────────────── */}
            <div className="bg-card border-[3.5px] border-slate-900 dark:border-slate-700 rounded-[2.5rem] shadow-hard overflow-hidden">
                <div className="p-6 border-b-[3.5px] border-slate-900 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-200 dark:bg-emerald-900/40 border-[3px] border-slate-900 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-hard-mini transform -rotate-3">
                            <Activity size={24} className="text-emerald-700 dark:text-emerald-400" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-slate-900 dark:text-slate-100 uppercase tracking-tight">Riwayat Lengkap</h3>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">{moods.length} entri total dalam periode ini</p>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700 divide-x-2 divide-slate-200 dark:divide-slate-700">
                                <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">Anggota</th>
                                <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">Mood</th>
                                <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">Waktu</th>
                                <th className="px-5 py-3 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">Skor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-200 dark:divide-slate-700">
                            {moods.slice(0, 50).map((m) => {
                                const meta = getMeta(m.mood_label);
                                return (
                                    <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors divide-x-2 divide-slate-200 dark:divide-slate-700">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <img
                                                    src={m.user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${m.user?.full_name}`}
                                                    className="w-8 h-8 rounded-full border-2 border-slate-100 dark:border-slate-700 object-cover flex-shrink-0"
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
                                                    className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide !text-white"
                                                    style={{ background: meta.color }}
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
                                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl border-2 text-[10px] font-black !text-white"
                                                style={{ borderColor: meta.color, background: meta.color }}>
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



            {/* ── Modals ───────────────────────────────────────────────────────────── */}
            {
                selectedStatModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => { e.target === e.currentTarget && setSelectedStatModal(null) }}>
                        <div className="bg-white dark:bg-slate-900 border-[4px] border-slate-900 dark:border-slate-700 w-full max-w-md rounded-[2rem] shadow-[12px_12px_0px_rgba(15,23,42,1)] dark:shadow-[12px_12px_0px_rgba(51,65,85,1)] overflow-hidden animate-in zoom-in-95 mt-10">
                            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b-[4px] border-slate-900 dark:border-slate-700 flex justify-between items-center">
                                <h2 className="font-black text-xl uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <BarChart3 className="text-accent" size={20} strokeWidth={3} /> {selectedStatModal}
                                </h2>
                                <button onClick={() => setSelectedStatModal(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border-2 border-transparent hover:border-slate-900 dark:hover:border-slate-500 text-slate-800 dark:text-slate-200"><X size={20} strokeWidth={3} /></button>
                            </div>
                            <div className="p-6 max-h-[70vh] overflow-y-auto">
                                {(() => {
                                    if (selectedStatModal === 'Total Entri') {
                                        return (
                                            <div className="space-y-4">
                                                <p className="font-bold text-slate-700 dark:text-slate-300">Detail entri mood dalam periode yang dipilih.</p>
                                                <div className="bg-slate-100 dark:bg-slate-800/50 p-4 border-[3px] border-slate-900 dark:border-slate-700 rounded-2xl shadow-hard-mini">
                                                    <ul className="space-y-2">
                                                        {workspaceUsers.map(u => {
                                                            const userMoods = filteredMoods.filter(m => m.user_id === u.id);
                                                            return (
                                                                <li key={u.id} className="flex justify-between items-center border-b-2 border-slate-200 dark:border-slate-700 pb-2 last:border-0 last:pb-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`} className="w-8 h-8 rounded-lg border-2 border-slate-900 dark:border-slate-700" alt="" />
                                                                        <span className="font-bold text-sm text-foreground">{u.name}</span>
                                                                    </div>
                                                                    <span className="font-black text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 px-2 py-1 rounded-md border-2 border-slate-900 dark:border-slate-500">{userMoods.length} entri</span>
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
                                                <p className="font-bold text-slate-700 dark:text-slate-300">Anggota yang telah mengisi mood pada periode yang dipilih.</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {workspaceUsers.map(u => {
                                                        const isActive = activeUsers.has(u.id);
                                                        return (
                                                            <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border-[3px] shadow-hard-mini ${isActive ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-900 dark:border-emerald-700' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-400 dark:border-slate-600 opacity-60'}`}>
                                                                <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`} className={`w-10 h-10 rounded-lg border-2 ${isActive ? 'border-emerald-900 dark:border-emerald-700' : 'border-slate-400 dark:border-slate-600'} shadow-sm`} alt="" />
                                                                <div className="overflow-hidden">
                                                                    <div className="font-bold text-sm truncate text-slate-900 dark:text-slate-100">{u.name}</div>
                                                                    <div className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{isActive ? 'Aktif' : 'Pasif'}</div>
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
                                                <p className="font-bold text-slate-700 dark:text-slate-300">Responden yang telah mengisi mood hari ini ({todayMoods.length} Entri).</p>
                                                <div className="space-y-4">
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Sudah Mengisi</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {workspaceUsers.filter(u => responderIds.has(u.id)).map(u => (
                                                                <div key={u.id} className="flex items-center gap-2 bg-white dark:bg-slate-800 border-[2px] border-slate-900 dark:border-slate-700 rounded-lg p-1.5 shadow-hard-mini font-bold text-xs text-foreground"><img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`} className="w-6 h-6 rounded border border-slate-900 dark:border-slate-700" alt="" />{u.name}</div>
                                                            ))}
                                                            {workspaceUsers.filter(u => responderIds.has(u.id)).length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500 italic font-bold">Belum ada responden</p>}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Belum Mengisi</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {workspaceUsers.filter(u => !responderIds.has(u.id)).map(u => (
                                                                <div key={u.id} className="bg-slate-100 dark:bg-slate-800/50 border-[2px] border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 font-bold text-xs text-slate-500 dark:text-slate-400">{u.name}</div>
                                                            ))}
                                                            {workspaceUsers.filter(u => !responderIds.has(u.id)).length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500 italic font-bold">Semua sudah mengisi</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else if (selectedStatModal === 'Rata-Rata Mood') {
                                        return (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-center p-8 bg-violet-100 dark:bg-violet-900/40 border-[4px] border-violet-900 dark:border-violet-700 rounded-2xl shadow-hard">
                                                    <div className="text-center">
                                                        <span className="text-6xl font-black text-violet-900 dark:text-violet-200 font-heading">{avgScore}</span>
                                                        <p className="text-xs font-black text-violet-700 dark:text-violet-400 uppercase tracking-widest mt-2">Dari Skala 1 - 5</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white dark:bg-card border-[3px] border-slate-900 dark:border-slate-700 rounded-2xl p-4 shadow-hard-mini">
                                                    <h4 className="font-black text-sm uppercase tracking-widest text-slate-700 dark:text-slate-300 mb-4 border-b-2 border-slate-200 dark:border-slate-700 pb-2">Distribusi Skor</h4>
                                                    <div className="space-y-2">
                                                        {[5, 4, 3, 2, 1].map(score => {
                                                            const count = filteredMoods.filter(m => getMeta(m.mood_label).score === score).length;
                                                            const pct = filteredMoods.length ? Math.round((count / filteredMoods.length) * 100) : 0;
                                                            return (
                                                                <div key={score} className="flex items-center gap-3">
                                                                    <div className="w-12 font-black text-slate-500 dark:text-slate-400">Skor {score}</div>
                                                                    <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800/50 rounded-full border border-slate-900 dark:border-slate-700 overflow-hidden">
                                                                        <div className="h-full bg-slate-800 dark:bg-slate-400 border-r border-slate-900 dark:border-slate-700 transition-all" style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                    <div className="w-10 text-right font-bold text-sm text-foreground">{count}</div>
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
                )
            }

            {
                selectedUserModal && (() => {
                    const user = workspaceUsers.find(u => u.id === selectedUserModal);
                    if (!user) return null;

                    const userMoods = moods.filter(m => m.user_id === selectedUserModal).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    const latest = userMoods[0];
                    const latestMeta = latest ? getMeta(latest.mood_label) : null;
                    const currentUserId = localStorage.getItem('user_id');

                    return (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => { e.target === e.currentTarget && setSelectedUserModal(null) }}>
                            <div className="bg-white dark:bg-slate-900 border-[4px] border-slate-900 dark:border-slate-700 w-full max-w-2xl rounded-[2rem] shadow-[12px_12px_0px_rgba(15,23,42,1)] dark:shadow-[12px_12px_0px_rgba(51,65,85,1)] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 mt-10">
                                <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b-[4px] border-slate-900 dark:border-slate-700 flex justify-between items-center shrink-0">
                                    <div className="flex items-center gap-3">
                                        <img src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} className="w-10 h-10 rounded-xl border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800" alt="" />
                                        <div>
                                            <h2 className="font-black text-lg uppercase tracking-tight text-slate-900 dark:text-slate-100">{user.name}</h2>
                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{user.role || 'Member'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedUserModal(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border-2 border-transparent hover:border-slate-900 dark:hover:border-slate-500 text-slate-800 dark:text-slate-200"><X size={20} strokeWidth={3} /></button>
                                </div>

                                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                    {/* Latest Status */}
                                    {latest && latestMeta && (
                                        <div className={`flex items-center gap-4 p-4 rounded-[1.5rem] border-[3px] border-slate-900 dark:border-slate-700 shadow-hard-mini ${latestMeta.bg}`}>
                                            <div className="text-4xl bg-white dark:bg-slate-800 w-16 h-16 rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-sm flex items-center justify-center -rotate-3">{latestMeta.mood_emoji}</div>
                                            <div>
                                                <h4 className="font-black text-sm uppercase tracking-widest text-slate-600 dark:text-slate-300 mb-1">Status Terbaru</h4>
                                                <div className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-slate-100">
                                                    {latestMeta.mood_label}
                                                    <span className="text-xs font-semibold px-2 py-0.5 bg-white dark:bg-slate-800 rounded-md border border-slate-900 dark:border-slate-700 shadow-sm">{relativeTime(latest.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Recent History Inline Table */}
                                    <div className="space-y-3">
                                        <h4 className="font-black text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2"><Clock size={14} strokeWidth={3} /> Riwayat Terakhir</h4>
                                        {userMoods.length > 0 ? (
                                            <div className="bg-slate-50 dark:bg-slate-800/30 border-[3px] border-slate-900 dark:border-slate-700 rounded-2xl overflow-hidden shadow-hard-mini">
                                                <table className="w-full text-left border-collapse min-w-full">
                                                    <thead>
                                                        <tr className="bg-slate-200 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 border-b-[3px] border-slate-900 dark:border-slate-700">
                                                            <th className="p-3 whitespace-nowrap">Waktu</th>
                                                            <th className="p-3">Mood</th>
                                                            <th className="p-3 hidden sm:table-cell w-24">Skor</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y-2 divide-slate-200 dark:divide-slate-700">
                                                        {userMoods.slice(0, 10).map(m => {
                                                            const meta = getMeta(m.mood_label);
                                                            return (
                                                                <tr key={m.id} className="hover:bg-white dark:hover:bg-slate-800/60 transition-colors">
                                                                    <td className="p-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap align-middle">
                                                                        {new Date(m.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', ':')}
                                                                    </td>
                                                                    <td className="p-3 align-middle">
                                                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border-[2px] border-slate-900 dark:border-slate-700 text-xs font-bold shadow-sm whitespace-nowrap text-foreground">
                                                                            <span className="text-sm leading-none">{getMeta(m.mood_label).mood_emoji}</span> {getMeta(m.mood_label).mood_label}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-3 hidden sm:table-cell align-middle">
                                                                        <div className="flex gap-0.5">
                                                                            {[1, 2, 3, 4, 5].map(s => (
                                                                                <div key={s} className={`w-2 h-3 rounded-[1px] border border-slate-900 dark:border-slate-500 ${s <= meta.score ? 'bg-slate-800 dark:bg-slate-400' : 'bg-transparent'}`}></div>
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
                                            <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-[3px] border-slate-900 dark:border-slate-700 rounded-2xl border-dashed text-center font-bold text-slate-400 dark:text-slate-500">Belum ada data riwayat</div>
                                        )}
                                    </div>

                                    {/* Support Actions */}
                                    {user.id !== currentUserId && latest && (
                                        <div className="space-y-3">
                                            <h4 className="font-black text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2"><HandHeart size={14} strokeWidth={3} /> Kirim Dukungan (Maksimal 1 Jam Berapa Pun)</h4>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                {(['hug', 'coffee', 'donut', 'high_five'] as const).map(type => {
                                                    const emojis = { hug: '🤗', coffee: '☕', donut: '🍩', high_five: '🙌' };
                                                    const labels = { hug: 'Hug', coffee: 'Coffee', donut: 'Donut', high_five: 'High Five' };
                                                    return (
                                                        <button
                                                            key={type}
                                                            disabled={sendingSupport === user.id || sentSupport.has(user.id)}
                                                            onClick={() => sendVirtualSupport(latest, type)}
                                                            className="p-3 rounded-xl border-[3px] border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground hover:-translate-y-1 hover:shadow-hard-mini transition-all active:translate-y-0 active:shadow-none font-bold text-sm disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex flex-col items-center gap-1.5"
                                                        >
                                                            <span className="text-3xl">{emojis[type]}</span>
                                                            <span className="text-[10px] uppercase tracking-widest">{labels[type]}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {(sendingSupport === user.id || sentSupport.has(user.id)) && (
                                                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 text-center mt-2">✨ Dukungan berhasil dikirim! Silakan tunggu jika ingin mengirim lagi nanti.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()
            }

            {/* ── Modal: Mood Settings (Global) ────────────────────────────── */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div
                        className="bg-card w-full max-w-lg border-[3.5px] border-slate-900 dark:border-slate-700 rounded-[2.5rem] shadow-hard overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 md:p-8 border-b-[3.5px] border-slate-900 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-200 dark:bg-indigo-900/40 border-[3px] border-slate-900 dark:border-slate-700 rounded-2xl flex items-center justify-center shadow-hard-mini transform -rotate-3">
                                    <Settings size={24} className="text-indigo-700 dark:text-indigo-400" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-slate-900 dark:text-slate-100 uppercase tracking-tight">Team Configuration</h3>
                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Atur emoticon & label mood secara global</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border-[2.5px] border-slate-900 dark:border-slate-700 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors shadow-hard-mini"
                            >
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>

                        <div className="p-6 md:p-8 space-y-4 overflow-y-auto">
                            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 p-4 rounded-2xl mb-4">
                                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase flex items-center gap-2">
                                    <AlertTriangle size={14} /> Developer Access Only
                                </p>
                                <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1 leading-relaxed">
                                    Perubahan ini akan memperbarui definisi mood bagi seluruh tim di workspace ini. Pastikan label unik untuk setiap skor.
                                </p>
                            </div>

                            {[5, 4, 3, 2, 1].map((score) => (
                                <div key={score} className="p-4 bg-slate-50 dark:bg-slate-800/30 border-[3px] border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-900 flex items-center justify-center text-[10px] font-black shadow-hard-mini">
                                                {score}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                Level {score === 5 ? 'Tertinggi' : score === 1 ? 'Terendah' : 'Media'}
                                            </span>
                                        </div>
                                        <div className="w-4 h-4 rounded-full border border-slate-900" style={{ backgroundColor: SCORE_STYLES[score].color }} />
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-16">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1 text-center">Emoji</p>
                                            <input
                                                type="text"
                                                value={(moodSettings as any)[score].emoji}
                                                onChange={(e) => setMoodSettings({ ...moodSettings, [score]: { ...(moodSettings as any)[score], emoji: e.target.value } })}
                                                className="w-full h-12 p-2 rounded-xl border-[2.5px] border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-center text-xl shadow-hard-mini outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">Keterangan / Label</p>
                                            <input
                                                type="text"
                                                value={(moodSettings as any)[score].label}
                                                onChange={(e) => setMoodSettings({ ...moodSettings, [score]: { ...(moodSettings as any)[score], label: e.target.value } })}
                                                className="w-full h-12 p-3 px-4 rounded-xl border-[2.5px] border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 font-black text-xs uppercase tracking-widest shadow-hard-mini outline-none focus:border-indigo-500"
                                                placeholder="Contoh: Semangat"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-800/30 border-t-[3.5px] border-slate-900 dark:border-slate-700 flex flex-wrap justify-between items-center gap-4 mt-auto">
                            <button
                                onClick={() => {
                                    if (confirm('Reset semua emoticon dan label ke setelan default kode?')) {
                                        setMoodSettings(DEFAULT_MOOD_CONFIG);
                                    }
                                }}
                                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                                ↺ Reset ke Default
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSettingsModal(false)}
                                    disabled={savingSettings}
                                    className="px-6 py-3 rounded-2xl border-[3.5px] border-slate-900 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all opacity-50 disabled:cursor-not-allowed"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={async () => {
                                        setSavingSettings(true);
                                        try {
                                            const { error } = await supabase
                                                .from('workspaces')
                                                .update({ mood_config: moodSettings })
                                                .eq('id', selectedWorkspaceId);

                                            if (error) throw error;

                                            localStorage.setItem('mood_tracker_settings', JSON.stringify(moodSettings));
                                            setShowSettingsModal(false);
                                        } catch (err) {
                                            console.error('Error saving mood settings:', err);
                                            alert('Gagal menyimpan pengaturan ke database.');
                                        } finally {
                                            setSavingSettings(false);
                                        }
                                    }}
                                    disabled={savingSettings}
                                    className="px-8 py-3 rounded-2xl bg-indigo-600 border-[3.5px] border-slate-900 text-white font-black uppercase tracking-widest text-[10px] shadow-hard hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {savingSettings ? 'Menyimpan...' : 'Simpan Global'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes moodPulseFloat {
                    0%,100% { transform: translateY(0) scale(1); }
                    50%     { transform: translateY(-3px) scale(1.1); }
                }
            `}</style>
        </div>
    );
};
