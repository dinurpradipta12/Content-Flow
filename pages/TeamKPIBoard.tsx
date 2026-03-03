import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Modal } from '../components/ui/Modal';
import {
    Users, Target, TrendingUp, Plus, Trash2, Edit3, Save,
    ChevronDown, AlertCircle, CheckCircle, Clock, X, Loader2,
    BarChart3, User, Bell
} from 'lucide-react';
import { useNotifications } from '../components/NotificationProvider';
import { NotificationType } from '../types';
import { useAppConfig } from '../components/AppConfigProvider';

interface TeamMember {
    id: string;
    full_name: string;
    role: string;
    department: string;
    avatar_url: string;
    status: string;
}

interface WorkspaceItem {
    id: string;
    name: string;
    members: string[];
    admin_id: string;
    owner_id?: string;
}

interface KPI {
    id: string;
    member_id: string;
    metric_name: string;
    category: string;
    target_value: number;
    actual_value: number;
    unit: string;
    period: string;
    period_date: string;
    notes: string;
}

const PERIODS = [
    { value: 'all', label: 'All Time' },
    { value: 'monthly', label: 'This Month' },
    { value: 'quarterly', label: 'This Quarter' },
    { value: 'yearly', label: 'This Year' },
];

const getCompletionColor = (rate: number) => {
    if (rate >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-200' };
    if (rate >= 50) return { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', border: 'border-amber-200' };
    return { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50', border: 'border-red-200' };
};

const getStatusBadge = (rate: number) => {
    if (rate >= 80) return { label: 'On Track', icon: <CheckCircle size={12} />, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (rate >= 50) return { label: 'In Progress', icon: <Clock size={12} />, cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Di Bawah Target', icon: <AlertCircle size={12} />, cls: 'bg-red-50 text-red-700 border-red-200' };
};

export const TeamKPIBoard: React.FC = () => {
    const { config } = useAppConfig();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [kpis, setKpis] = useState<KPI[]>([]);
    const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [isAddKPIOpen, setIsAddKPIOpen] = useState(false);
    const [periodFilter, setPeriodFilter] = useState('all');

    const isAdmin = ['Admin', 'Owner', 'Developer'].includes(localStorage.getItem('user_role') || '');
    const currentUserAvatar = localStorage.getItem('user_avatar') || '';

    // Add member form
    const [newMember, setNewMember] = useState({ full_name: '', role: '', department: '', avatar_url: '' });
    // Add KPI form
    const [newKPI, setNewKPI] = useState({ metric_name: '', category: 'General', target_value: 100, actual_value: 0, unit: '%', period: 'monthly', period_date: new Date().toISOString().split('T')[0], notes: '' });
    // Edit KPI (admin)
    const [editingKPI, setEditingKPI] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<{ actual_value: number; notes: string }>({ actual_value: 0, notes: '' });
    // Member: slide-in actual input panel
    const [showMemberInput, setShowMemberInput] = useState(false);
    const [memberActuals, setMemberActuals] = useState<Record<string, { actual_value: number; notes: string }>>({});
    const [savingActuals, setSavingActuals] = useState(false);

    const { sendNotification } = useNotifications();
    const [allAppUsers, setAllAppUsers] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        fetchData();
        fetchAppUsers();
    }, []);

    const fetchAppUsers = async () => {
        const { data } = await supabase.from('app_users').select('id, full_name');
        if (data) setAllAppUsers(data.map(u => ({ id: u.id, name: u.full_name })));
    };

    const notifyByMention = async (text: string, sourceTitle: string) => {
        if (!text) return;

        const mentionedIds = new Set<string>();

        // 1. Traditional @mentions
        if (text.includes('@')) {
            const mentions = text.match(/@\[([^\]]+)\]|@(\w+)/g);
            if (mentions) {
                const names = mentions.map(m => m.startsWith('@[') ? m.slice(2, -1) : m.slice(1));
                for (const name of names) {
                    const user = allAppUsers.find(u => u.name === name);
                    if (user) mentionedIds.add(user.id);
                }
            }
        }

        // 2. Scan for full names (even without @) - As requested for global mentions
        allAppUsers.forEach(user => {
            if (user.name && text.toLowerCase().includes(user.name.toLowerCase())) {
                mentionedIds.add(user.id);
            }
        });

        // Send notifications
        for (const userId of mentionedIds) {
            await sendNotification({
                recipientId: userId,
                type: 'MENTION',
                title: 'Anda disebut di KPI Board',
                content: `menyebut Anda dalam catatan KPI: ${sourceTitle}`,
            });
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('user_id');
            const userRole = localStorage.getItem('user_role') || 'Member';
            const tenantId = localStorage.getItem('tenant_id') || userId;

            let wsQuery = supabase.from('workspaces').select('id,name,members,admin_id,owner_id');
            let orCond = `owner_id.eq.${userId},members.cs.{"${userId}"}`;
            if (currentUserAvatar && !currentUserAvatar.startsWith('data:')) {
                orCond += `,members.cs.{"${currentUserAvatar}"}`;
            }
            wsQuery = wsQuery.or(orCond);

            const [membersRes, kpisRes, wsRes] = await Promise.all([
                supabase.from('team_members').select('*').eq('admin_id', tenantId).order('full_name'),
                supabase.from('team_kpis').select('*').order('created_at', { ascending: false }),
                wsQuery.order('name'),
            ]);

            if (membersRes.data) setMembers(membersRes.data);
            if (kpisRes.data) setKpis(kpisRes.data);

            if (wsRes.data) {
                // For members: only show workspaces they belong to or own (redundancy check)
                let accessibleWorkspaces = (wsRes.data as WorkspaceItem[]).filter(ws =>
                    ws.owner_id === userId ||
                    (ws.members && ws.members.some((m: string) => {
                        try { return decodeURIComponent(m) === decodeURIComponent(currentUserAvatar) || m === currentUserAvatar; }
                        catch { return m === currentUserAvatar; }
                    }))
                );
                setWorkspaces(accessibleWorkspaces);
            }
        } catch (err) {
            console.error('Failed to fetch KPI data:', err);
        }
        setLoading(false);
    };

    const getMemberKPIs = (memberId: string) => {
        let filtered = kpis.filter(k => k.member_id === memberId);
        if (periodFilter === 'monthly') {
            const now = new Date();
            filtered = filtered.filter(k => {
                const d = new Date(k.period_date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
        } else if (periodFilter === 'quarterly') {
            const now = new Date();
            const q = Math.floor(now.getMonth() / 3);
            filtered = filtered.filter(k => {
                const d = new Date(k.period_date);
                return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear();
            });
        } else if (periodFilter === 'yearly') {
            const now = new Date();
            filtered = filtered.filter(k => new Date(k.period_date).getFullYear() === now.getFullYear());
        }
        return filtered;
    };

    const getCompletionRate = (memberId: string) => {
        const memberKPIs = getMemberKPIs(memberId);
        if (memberKPIs.length === 0) return 0;
        const total = memberKPIs.reduce((sum, k) => sum + Math.min((k.actual_value / k.target_value) * 100, 100), 0);
        return Math.round(total / memberKPIs.length);
    };

    const getPreviousMonthMemberKPIs = (memberId: string) => {
        let filtered = kpis.filter(k => k.member_id === memberId);
        const now = new Date();
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        filtered = filtered.filter(k => {
            const d = new Date(k.period_date);
            return d.getMonth() === prevMonthDate.getMonth() && d.getFullYear() === prevMonthDate.getFullYear();
        });
        return filtered;
    };

    const getPreviousMonthCompletionRate = (memberId: string) => {
        const memberKPIs = getPreviousMonthMemberKPIs(memberId);
        if (memberKPIs.length === 0) return 0;
        const total = memberKPIs.reduce((sum, k) => sum + Math.min((k.target_value > 0 ? k.actual_value / k.target_value : 0) * 100, 100), 0);
        return Math.round(total / memberKPIs.length);
    };

    const handleAddMember = async () => {
        if (!newMember.full_name.trim()) return;
        const tenantId = localStorage.getItem('tenant_id') || localStorage.getItem('user_id');
        const { error } = await supabase.from('team_members').insert([{
            full_name: newMember.full_name,
            role: newMember.role || 'Member',
            department: newMember.department,
            avatar_url: newMember.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newMember.full_name)}`,
            admin_id: tenantId
        }]);
        if (!error) {
            setNewMember({ full_name: '', role: '', department: '', avatar_url: '' });
            setIsAddMemberOpen(false);
            fetchData();
        }
    };

    const handleDeleteMember = async (id: string) => {
        if (!confirm('Hapus anggota tim ini? Semua KPI-nya juga akan terhapus.')) return;
        await supabase.from('team_members').delete().eq('id', id);
        setIsDetailOpen(false);
        setSelectedMember(null);
        fetchData();
    };

    const handleAddKPI = async () => {
        if (!selectedMember || !newKPI.metric_name.trim()) return;
        const { error } = await supabase.from('team_kpis').insert([{
            member_id: selectedMember.id,
            ...newKPI,
        }]);
        if (!error) {
            await notifyByMention(newKPI.notes, newKPI.metric_name);
            setNewKPI({ metric_name: '', category: 'General', target_value: 100, actual_value: 0, unit: '%', period: 'monthly', period_date: new Date().toISOString().split('T')[0], notes: '' });
            setIsAddKPIOpen(false);
            fetchData();
        }
    };

    const handleUpdateKPI = async (kpiId: string) => {
        await supabase.from('team_kpis').update({
            actual_value: editValues.actual_value,
            notes: editValues.notes,
        }).eq('id', kpiId);

        const kpi = kpis.find(k => k.id === kpiId);
        if (kpi) {
            await notifyByMention(editValues.notes, kpi.metric_name);
        }

        setEditingKPI(null);
        fetchData();
    };

    const openMemberInputPanel = (memberKPIs: KPI[]) => {
        const initials: Record<string, { actual_value: number; notes: string }> = {};
        memberKPIs.forEach(k => { initials[k.id] = { actual_value: k.actual_value, notes: k.notes || '' }; });
        setMemberActuals(initials);
        setShowMemberInput(true);
    };

    const handleSaveMemberActuals = async () => {
        setSavingActuals(true);
        try {
            await Promise.all(
                (Object.entries(memberActuals) as [string, { actual_value: number; notes: string }][]).map(([kpiId, vals]) =>
                    supabase.from('team_kpis').update({ actual_value: vals.actual_value, notes: vals.notes }).eq('id', kpiId)
                )
            );

            // Notify for each KPI note updated
            for (const [kpiId, vals] of Object.entries(memberActuals) as [string, { actual_value: number; notes: string }][]) {
                const kpi = kpis.find(k => k.id === kpiId);
                if (kpi && vals.notes) {
                    await notifyByMention(vals.notes, kpi.metric_name);
                }
            }

            fetchData();
            setShowMemberInput(false);
            // Auto-close detail modal with slight delay for slide-back effect
            setTimeout(() => setIsDetailOpen(false), 400);
        } catch (err) {
            console.error(err);
        }
        setSavingActuals(false);
    };

    const handleDeleteKPI = async (kpiId: string) => {
        if (!confirm('Hapus KPI ini?')) return;
        await supabase.from('team_kpis').delete().eq('id', kpiId);
        fetchData();
    };

    const openDetail = (member: TeamMember) => {
        setSelectedMember(member);
        setIsDetailOpen(true);
    };

    // ============================================================
    // WORKSPACE-BASED ACCESS CONTROL (for members)
    // ============================================================
    // Workspaces that the current user belongs to (based on avatar_url in members[])
    const myWorkspaces = isAdmin
        ? workspaces  // admins see all workspaces they own
        : workspaces.filter(ws =>
            (ws.members || []).some(m => {
                try { return decodeURIComponent(m) === decodeURIComponent(currentUserAvatar) || m === currentUserAvatar; }
                catch { return m === currentUserAvatar; }
            })
        );

    // All avatar_urls of members who share at least one workspace with current user
    const myWorkspaceAvatarSets: Set<string>[] = myWorkspaces.map(ws => new Set(ws.members || []));
    const peersAvatarSet = new Set<string>();
    myWorkspaceAvatarSets.forEach(setOfAvatars => setOfAvatars.forEach(av => peersAvatarSet.add(av)));

    // Stats & display: filter members by workspace filter + access control
    const filteredMembers = (() => {
        let base: typeof members;

        if (selectedWorkspaceId === 'all') {
            if (isAdmin) {
                base = members; // admin sees all
            } else {
                // member sees only peers from their workspaces
                base = currentUserAvatar
                    ? members.filter(m => peersAvatarSet.has(m.avatar_url))
                    : [];
            }
        } else {
            const ws = workspaces.find(w => w.id === selectedWorkspaceId);
            if (!ws) {
                base = [];
            } else {
                const wsAvatars = new Set(ws.members || []);
                base = members.filter(m => wsAvatars.has(m.avatar_url));
            }
        }

        return base;
    })();


    const totalMembers = filteredMembers.length;
    const avgCompletion = totalMembers > 0 ? Math.round(filteredMembers.reduce((s, m) => s + getCompletionRate(m.id), 0) / totalMembers) : 0;
    const onTrackCount = filteredMembers.filter(m => getCompletionRate(m.id) >= 80).length;

    const topPerformers = React.useMemo(() => {
        if (filteredMembers.length === 0) return [];
        let memberRates = filteredMembers.map(m => ({ member: m, rate: getCompletionRate(m.id) }));
        memberRates.sort((a, b) => b.rate - a.rate);
        return memberRates.filter(mr => mr.rate > 0).slice(0, 3);
    }, [filteredMembers, kpis, periodFilter]);

    const previousMonthBestPerformer = React.useMemo(() => {
        if (filteredMembers.length === 0) return null;
        let maxRate = -1;
        let best: TeamMember | null = null;
        filteredMembers.forEach(m => {
            const rate = getPreviousMonthCompletionRate(m.id);
            if (rate > maxRate) {
                maxRate = rate;
                best = m;
            }
        });
        return best && maxRate > 0 ? { member: best, rate: maxRate } : null;
    }, [filteredMembers, kpis]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-violet-500" size={40} />
                    <p className="text-slate-500 font-medium">Loading KPI data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl lg:text-4xl font-bold text-slate-900 flex items-center gap-2">
                        {config?.page_titles?.['kpi']?.title || 'Team KPI Board'}
                    </h1>
                    <p className="text-slate-500 text-xs sm:text-sm mt-0.5 hidden md:block">{config?.page_titles?.['kpi']?.subtitle || 'Monitor performa dan pencapaian tim secara real-time'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* Workspace Filter */}
                    {myWorkspaces.length > 1 && (
                        <select
                            value={selectedWorkspaceId}
                            onChange={e => setSelectedWorkspaceId(e.target.value)}
                            className="bg-transparent border-2 border-slate-200 text-foreground rounded-lg sm:rounded-xl px-2 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-bold focus:outline-none focus:border-violet-400 transition-colors cursor-pointer"
                        >
                            <option value="all">Semua Workspace</option>
                            {myWorkspaces.map(ws => {
                                const wsAvatars = new Set(ws.members || []);
                                const count = members.filter(m => wsAvatars.has(m.avatar_url)).length;
                                return (
                                    <option key={ws.id} value={ws.id}>
                                        {ws.name} ({count})
                                    </option>
                                );
                            })}
                        </select>
                    )}

                    <select
                        value={periodFilter}
                        onChange={e => setPeriodFilter(e.target.value)}
                        className="bg-transparent border-2 border-slate-200 text-foreground rounded-lg sm:rounded-xl px-2 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-bold focus:outline-none focus:border-violet-400 transition-colors cursor-pointer"
                    >
                        {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>

                </div>
            </div>

            {/* Split Content layout */}
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">

                {/* LEFT COLUMN: Main Stats & Member Grid */}
                <div className="flex-1 space-y-4 md:space-y-6 min-w-0">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                        <div className="bg-card rounded-xl sm:rounded-2xl border-2 border-slate-200 p-3 sm:p-5 flex items-center gap-2 sm:gap-4">
                            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-violet-100/10 rounded-lg sm:rounded-xl border-2 border-violet-100 flex items-center justify-center flex-shrink-0">
                                <Users className="text-violet-500" size={18} />
                            </div>
                            <div>
                                <p className="text-xl sm:text-2xl font-black text-foreground">{totalMembers}</p>
                                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Members</p>
                            </div>
                        </div>
                        <div className="bg-card rounded-xl sm:rounded-2xl border-2 border-slate-200 p-3 sm:p-5 flex items-center gap-2 sm:gap-4">
                            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-blue-100/10 rounded-lg sm:rounded-xl border-2 border-blue-100 flex items-center justify-center flex-shrink-0">
                                <Target className="text-blue-500" size={18} />
                            </div>
                            <div>
                                <p className="text-xl sm:text-2xl font-black text-foreground">{avgCompletion}%</p>
                                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">Completion</p>
                            </div>
                        </div>
                        <div className="bg-card rounded-xl sm:rounded-2xl border-2 border-slate-200 p-3 sm:p-5 flex items-center gap-2 sm:gap-4 col-span-2 sm:col-span-1">
                            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-emerald-100/10 rounded-lg sm:rounded-xl border-2 border-emerald-100 flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="text-emerald-500" size={18} />
                            </div>
                            <div>
                                <p className="text-xl sm:text-2xl font-black text-foreground">{onTrackCount}/{totalMembers}</p>
                                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">On Track</p>
                            </div>
                        </div>
                    </div>

                    {/* Member Grid */}
                    {filteredMembers.length === 0 ? (
                        <div className="text-center py-12 sm:py-20 bg-card rounded-lg sm:rounded-2xl border-2 border-dashed border-border">
                            <Users className="mx-auto text-mutedForeground mb-2 sm:mb-4" size={32} sm:size={48} />
                            {!isAdmin && myWorkspaces.length === 0 ? (
                                // Member with no workspace access
                                <>
                                    <h3 className="text-sm sm:text-lg font-bold text-mutedForeground">Belum Bergabung ke Workspace</h3>
                                    <p className="text-[10px] sm:text-sm text-mutedForeground/80 mt-1 max-w-xs mx-auto">
                                        Anda belum tergabung dalam workspace apapun. Hubungi admin untuk mendapatkan undangan.
                                    </p>
                                </>
                            ) : (
                                // Admin or member in workspace but no members yet
                                <>
                                    <h3 className="text-sm sm:text-lg font-bold text-mutedForeground">Belum ada anggota tim</h3>
                                    <p className="text-[10px] sm:text-sm text-mutedForeground/80 mt-1">Tidak ada anggota di workspace ini.</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                            {filteredMembers.map(member => {
                                const rate = getCompletionRate(member.id);
                                const color = getCompletionColor(rate);
                                const badge = getStatusBadge(rate);
                                const memberKPIs = getMemberKPIs(member.id);

                                return (
                                    <div
                                        key={member.id}
                                        onClick={() => openDetail(member)}
                                        className="bg-card rounded-lg sm:rounded-2xl border-2 border-border hover:border-accent hover:shadow-lg p-3 sm:p-5 cursor-pointer transition-all duration-200 group"
                                    >
                                        {/* Avatar + Info */}
                                        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                                            <img
                                                src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.full_name)}`}
                                                alt={member.full_name}
                                                className="w-10 sm:w-12 h-10 sm:h-12 rounded-full border-2 border-border object-cover group-hover:border-violet-300 transition-colors flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-foreground truncate text-xs sm:text-base">{member.full_name}</h3>
                                                <p className="text-[8px] sm:text-xs text-mutedForeground truncate">{member.role}{member.department ? ` · ${member.department}` : ''}</p>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mb-2 sm:mb-3">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[8px] sm:text-xs font-medium text-mutedForeground">Completion</span>
                                                <span className={`text-xs sm:text-sm font-bold ${color.text}`}>{rate}%</span>
                                            </div>
                                            <div className="h-2 sm:h-2.5 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${color.bg} rounded-full transition-all duration-700 ease-out`}
                                                    style={{ width: `${rate}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between">
                                            <span className={`inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-[11px] font-medium border ${badge.cls}`}>
                                                {badge.icon} <span className="hidden sm:inline">{badge.label}</span>
                                            </span>
                                            <span className="text-[9px] sm:text-[11px] text-mutedForeground/80">{memberKPIs.length} metrics</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div> {/* End Left Col */}

                {/* RIGHT COLUMN: Vision Board */}
                <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col gap-4">
                    <div className="bg-card border-3 border-slate-900 rounded-3xl shadow-[6px_6px_0px_#0f172a] overflow-hidden flex flex-col">
                        <div className="bg-amber-400 p-4 border-b-3 border-slate-900 flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                                <TrendingUp className="text-slate-900" size={20} />
                            </div>
                            <div>
                                <h3 className="font-heading font-black text-slate-900 text-lg leading-tight uppercase tracking-wider">Vision Board</h3>
                                <p className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">{PERIODS.find(p => p.value === periodFilter)?.label || 'Performance'}</p>
                            </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col items-center relative min-h-[300px]">
                            {/* Confetti / Badge background decoration */}
                            <div className="absolute top-4 right-4 w-16 h-16 bg-amber-400/10 rounded-full blur-xl pointer-events-none"></div>

                            {topPerformers.length > 0 ? (
                                <div className="flex flex-col items-center w-full relative z-10 animate-in fade-in slide-in-from-bottom-4 space-y-4">
                                    {/* TOP 1 */}
                                    <div className="flex flex-col items-center w-full pb-4 border-b-2 border-slate-100 border-dashed">
                                        <div className="relative mb-4">
                                            <div className="w-24 h-24 rounded-full border-4 border-amber-400 p-1 shadow-lg bg-white relative z-10">
                                                <img
                                                    src={topPerformers[0].member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(topPerformers[0].member.full_name)}`}
                                                    alt={topPerformers[0].member.full_name}
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            </div>
                                            {/* Crown Icon / Badge */}
                                            <div className="absolute -top-3 -right-2 bg-slate-900 text-amber-400 text-[10px] font-black px-2 py-1 rounded-full border-2 border-amber-400 transform rotate-12 shadow-sm z-20">
                                                #1 TOP
                                            </div>
                                        </div>

                                        <h4 className="font-black text-xl text-center text-foreground">{topPerformers[0].member.full_name}</h4>
                                        <p className="text-xs text-mutedForeground font-bold mb-4">{topPerformers[0].member.role} {topPerformers[0].member.department ? ` • ${topPerformers[0].member.department}` : ''}</p>

                                        <div className="w-full bg-muted/50 rounded-2xl p-4 border-2 border-slate-900 border-dashed mb-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Completion Score</span>
                                                <span className="text-lg font-black text-amber-500">{topPerformers[0].rate}%</span>
                                            </div>
                                            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                                                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${topPerformers[0].rate}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="w-full text-left">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Target size={12} /> Metrik Terfasilitasi</p>
                                            <div className="space-y-2">
                                                {getMemberKPIs(topPerformers[0].member.id).slice(0, 3).map(kpi => (
                                                    <div key={kpi.id} className="flex flex-col gap-1 p-2 bg-card border border-border shadow-sm rounded-xl">
                                                        <p className="text-[10px] font-bold text-foreground line-clamp-1">{kpi.metric_name}</p>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[9px] font-medium text-mutedForeground">
                                                                {kpi.actual_value} / {kpi.target_value} {kpi.unit}
                                                            </span>
                                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                                                                {kpi.target_value > 0 ? ((kpi.actual_value / kpi.target_value) * 100).toFixed(0) : 0}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {getMemberKPIs(topPerformers[0].member.id).length > 3 && (
                                                    <p className="text-[10px] text-center text-mutedForeground font-bold pt-1">
                                                        + {getMemberKPIs(topPerformers[0].member.id).length - 3} metrik lainnya
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sub-leaders (Best 2 and Best 3) */}
                                    {(topPerformers.length > 1) && (
                                        <div className="w-full flex gap-3 mt-2">
                                            {topPerformers.slice(1, 3).map((p, index) => (
                                                <div key={p.member.id} className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 flex flex-col items-center relative">
                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-slate-100 text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm z-20">
                                                        #{index + 2}
                                                    </div>
                                                    <img
                                                        src={p.member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.member.full_name)}`}
                                                        alt={p.member.full_name}
                                                        className="w-12 h-12 rounded-full border-2 border-slate-300 object-cover mt-2 mb-2 shadow-sm"
                                                    />
                                                    <h5 className="font-extrabold text-[10px] text-center line-clamp-1 w-full text-slate-800">{p.member.full_name}</h5>
                                                    <p className="text-[8px] text-slate-500 font-bold mb-1 truncate w-full text-center">{p.member.role}</p>
                                                    <div className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-xl border border-amber-200 w-full text-center">
                                                        {p.rate}%
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* PREVIOUS MONTH MVP */}
                                    {previousMonthBestPerformer && (
                                        <div className="w-full mt-4 pt-4 border-t-2 border-slate-100 border-dashed">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-3">🏅 MVP Bulan Lalu</p>
                                            <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border-2 border-violet-500/20 rounded-2xl p-3 flex items-center gap-3">
                                                <img
                                                    src={previousMonthBestPerformer.member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(previousMonthBestPerformer.member.full_name)}`}
                                                    alt={previousMonthBestPerformer.member.full_name}
                                                    className="w-10 h-10 rounded-full border-2 border-violet-300 object-cover"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="font-extrabold text-xs text-foreground truncate">{previousMonthBestPerformer.member.full_name}</h5>
                                                    <p className="text-[9px] text-violet-600 font-black truncate">{previousMonthBestPerformer.member.role}</p>
                                                </div>
                                                <div className="bg-violet-600 text-white font-black text-xs px-2 py-1 flex items-center justify-center rounded-lg shadow-sm whitespace-nowrap">
                                                    {previousMonthBestPerformer.rate}%
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            ) : (
                                <div className="text-center flex flex-col justify-center items-center h-full text-slate-400 mt-10">
                                    <TrendingUp size={48} className="opacity-20 mb-3" />
                                    <p className="font-bold text-sm">Belum Ada Data</p>
                                    <p className="text-[10px]">Capaian KPI teratas akan muncul di sini</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ====== DETAIL MODAL ====== */}
            <Modal isOpen={isDetailOpen} onClose={() => { setIsDetailOpen(false); setShowMemberInput(false); }} title={selectedMember?.full_name || 'Detail'} maxWidth="max-w-4xl">
                {selectedMember && (() => {
                    const memberKPIs = getMemberKPIs(selectedMember.id);
                    const rate = getCompletionRate(selectedMember.id);
                    const color = getCompletionColor(rate);
                    const badge = getStatusBadge(rate);

                    return (
                        <div className="flex gap-0 overflow-hidden transition-all duration-300" style={{ minHeight: 420 }}>
                            {/* ====== LEFT CARD: Member Profile + KPI List ====== */}
                            <div className={`flex flex-col transition-all duration-300 ease-in-out overflow-y-auto ${showMemberInput ? 'w-1/2 pr-3 sm:pr-4' : 'w-full'}`}>
                                {/* Member Header */}
                                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-4 bg-muted border-2 border-border mb-2 sm:mb-4 shrink-0 rounded-lg sm:rounded-2xl">
                                    <img
                                        src={selectedMember.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedMember.full_name)}`}
                                        alt={selectedMember.full_name}
                                        className="w-12 sm:w-14 h-12 sm:h-14 rounded-lg sm:rounded-2xl border-2 border-border object-cover shadow flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-sm sm:text-base font-black text-foreground truncate">{selectedMember.full_name}</h2>
                                        <p className="text-[10px] sm:text-xs text-mutedForeground truncate">{selectedMember.role}{selectedMember.department ? ` · ${selectedMember.department}` : ''}</p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold border ${badge.cls}`}>
                                                {badge.icon} <span className="hidden sm:inline">{badge.label}</span>
                                            </span>
                                            <span className={`text-xs sm:text-sm font-black ${color.text}`}>{rate}%</span>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <button onClick={() => handleDeleteMember(selectedMember.id)} className="p-1.5 sm:p-2 hover:bg-red-500/10 text-red-500 hover:text-red-400 rounded-lg sm:rounded-xl transition-colors shrink-0" title="Hapus anggota">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* Period Filter + Action Button */}
                                <div className="flex items-center justify-between mb-2 sm:mb-3 shrink-0 gap-1 sm:gap-2">
                                    <select
                                        value={periodFilter}
                                        onChange={e => setPeriodFilter(e.target.value)}
                                        className="bg-card border-2 border-border text-foreground rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium focus:outline-none focus:border-violet-400 transition-colors"
                                    >
                                        {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                    {isAdmin ? (
                                        <button
                                            onClick={() => setIsAddKPIOpen(true)}
                                            className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-[10px] sm:text-xs transition-colors whitespace-nowrap"
                                        >
                                            <Plus size={12} /> <span className="hidden sm:inline">Tambah KPI</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => openMemberInputPanel(memberKPIs)}
                                            disabled={memberKPIs.length === 0 || showMemberInput}
                                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-[10px] sm:text-xs transition-colors whitespace-nowrap"
                                        >
                                            <Edit3 size={12} /> <span className="hidden sm:inline">Input</span>
                                        </button>
                                    )}
                                </div>

                                {/* KPI List */}
                                {memberKPIs.length === 0 ? (
                                    <div className="text-center py-8 sm:py-10 bg-muted rounded-lg sm:rounded-xl border border-dashed border-border">
                                        <Target className="mx-auto text-mutedForeground mb-1 sm:mb-2" size={24} />
                                        <p className="text-xs sm:text-sm text-mutedForeground/80 font-medium">Belum ada KPI untuk periode ini</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1 sm:space-y-2 overflow-y-auto flex-1 pr-0.5" style={{ maxHeight: 300 }}>
                                        {memberKPIs.map(kpi => {
                                            const kpiRate = kpi.target_value > 0 ? Math.min(Math.round((kpi.actual_value / kpi.target_value) * 100), 100) : 0;
                                            const kpiColor = getCompletionColor(kpiRate);
                                            const isEditing = editingKPI === kpi.id;

                                            return (
                                                <div key={kpi.id} className="bg-card border-2 border-border rounded-xl p-3 hover:border-violet-200 transition-colors">
                                                    <div className="flex items-start justify-between mb-1.5">
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-foreground text-xs truncate">{kpi.metric_name}</h4>
                                                            <p className="text-[10px] text-mutedForeground">{kpi.category} · {kpi.period} · {new Date(kpi.period_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</p>
                                                        </div>
                                                        {isAdmin && (
                                                            <div className="flex items-center gap-1 ml-2 shrink-0">
                                                                {!isEditing ? (
                                                                    <>
                                                                        <button onClick={(e) => { e.stopPropagation(); setEditingKPI(kpi.id); setEditValues({ actual_value: kpi.actual_value, notes: kpi.notes }); }} className="p-1 hover:bg-blue-500/10 text-mutedForeground hover:text-blue-500 rounded-lg transition-colors" title="Edit KPI"><Edit3 size={12} /></button>
                                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteKPI(kpi.id); }} className="p-1 hover:bg-red-500/10 text-mutedForeground hover:text-red-500 rounded-lg transition-colors" title="Hapus"><Trash2 size={12} /></button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button onClick={() => handleUpdateKPI(kpi.id)} className="p-1 hover:bg-emerald-500/10 text-emerald-500 rounded-lg transition-colors"><Save size={12} /></button>
                                                                        <button onClick={() => setEditingKPI(null)} className="p-1 hover:bg-slate-500/10 text-mutedForeground rounded-lg transition-colors"><X size={12} /></button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Progress bar */}
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                            <div className={`h-full ${kpiColor.bg} rounded-full`} style={{ width: `${kpiRate}%` }} />
                                                        </div>
                                                        <span className={`text-[10px] font-bold ${kpiColor.text}`}>{kpiRate}%</span>
                                                    </div>
                                                    {/* Values */}
                                                    <div className="flex items-center gap-3 text-[10px] text-mutedForeground">
                                                        <span>Target: <strong className="text-foreground">{kpi.target_value}{kpi.unit}</strong></span>
                                                        {isEditing ? (
                                                            <span className="flex items-center gap-1">
                                                                Actual: <input type="number" value={editValues.actual_value} onChange={e => setEditValues(v => ({ ...v, actual_value: Number(e.target.value) }))} className="w-14 border border-violet-300 rounded px-1 py-0.5 text-xs font-bold text-violet-700 focus:outline-none bg-card" onClick={e => e.stopPropagation()} />{kpi.unit}
                                                            </span>
                                                        ) : (
                                                            <span>Actual: <strong className="text-foreground">{kpi.actual_value}{kpi.unit}</strong></span>
                                                        )}
                                                    </div>
                                                    {isEditing && (
                                                        <input type="text" placeholder="Catatan (opsional)" value={editValues.notes} onChange={e => setEditValues(v => ({ ...v, notes: e.target.value }))} className="mt-2 w-full border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-violet-300 bg-card text-foreground placeholder:text-mutedForeground" onClick={e => e.stopPropagation()} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* ====== RIGHT CARD: Member Actual Input Slide Panel ====== */}
                            <div className={`transition-all duration-300 ease-in-out ${showMemberInput ? 'w-1/2 opacity-100 pl-4 border-l-2 border-emerald-200' : 'w-0 opacity-0 overflow-hidden'}`}>
                                {showMemberInput && (
                                    <div className="flex flex-col h-full">
                                        {/* Panel header */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="font-black text-foreground text-sm">✏️ Input Pencapaian</h3>
                                                <p className="text-[10px] text-mutedForeground">Isi nilai aktual yang telah dicapai bulan ini</p>
                                            </div>
                                            <button onClick={() => setShowMemberInput(false)} className="p-1.5 hover:bg-slate-500/10 text-mutedForeground hover:text-foreground rounded-lg transition-colors">
                                                <X size={14} />
                                            </button>
                                        </div>

                                        {/* Per-KPI inputs */}
                                        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5" style={{ maxHeight: 320 }}>
                                            {memberKPIs.map(kpi => (
                                                <div key={kpi.id} className="bg-emerald-500/10 border-2 border-emerald-500/20 rounded-xl p-3">
                                                    <p className="text-xs font-black text-foreground truncate mb-0.5">{kpi.metric_name}</p>
                                                    <p className="text-[10px] text-mutedForeground mb-2">{kpi.period} · Target: <strong className="text-foreground">{kpi.target_value}{kpi.unit}</strong></p>
                                                    <div className="space-y-2">
                                                        <div>
                                                            <label className="text-[9px] font-black text-emerald-600 uppercase tracking-wide block mb-0.5">Nilai Aktual ({kpi.unit})</label>
                                                            <input
                                                                type="number" min={0}
                                                                value={memberActuals[kpi.id]?.actual_value ?? kpi.actual_value}
                                                                onChange={e => setMemberActuals(prev => ({ ...prev, [kpi.id]: { ...prev[kpi.id], actual_value: Number(e.target.value) } }))}
                                                                className="w-full border-2 border-emerald-500/30 rounded-lg px-3 py-1.5 text-sm font-bold text-foreground focus:outline-none focus:border-emerald-500 bg-card"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-mutedForeground uppercase tracking-wide block mb-0.5">Catatan</label>
                                                            <input
                                                                type="text" placeholder="Keterangan pencapaian..."
                                                                value={memberActuals[kpi.id]?.notes ?? kpi.notes ?? ''}
                                                                onChange={e => setMemberActuals(prev => ({ ...prev, [kpi.id]: { ...prev[kpi.id], notes: e.target.value } }))}
                                                                className="w-full border-2 border-border rounded-lg px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:border-emerald-400 bg-card placeholder:text-mutedForeground"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Save button */}
                                        <button
                                            onClick={handleSaveMemberActuals}
                                            disabled={savingActuals}
                                            className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-black text-sm transition-colors shadow-lg"
                                        >
                                            {savingActuals ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                            {savingActuals ? 'Menyimpan...' : 'Simpan & Tutup'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* ====== ADD MEMBER MODAL ====== */}
            <Modal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} title="Add Team Member">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
                        <input
                            type="text"
                            value={newMember.full_name}
                            onChange={e => setNewMember(m => ({ ...m, full_name: e.target.value }))}
                            className="w-full bg-card text-foreground border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors placeholder:text-mutedForeground"
                            placeholder="Nama lengkap"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                            <input
                                type="text"
                                value={newMember.role}
                                onChange={e => setNewMember(m => ({ ...m, role: e.target.value }))}
                                className="w-full bg-card text-foreground border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors placeholder:text-mutedForeground"
                                placeholder="Content Creator"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Department</label>
                            <input
                                type="text"
                                value={newMember.department}
                                onChange={e => setNewMember(m => ({ ...m, department: e.target.value }))}
                                className="w-full bg-card text-foreground border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors placeholder:text-mutedForeground"
                                placeholder="Marketing"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Avatar URL (optional)</label>
                        <input
                            type="text"
                            value={newMember.avatar_url}
                            onChange={e => setNewMember(m => ({ ...m, avatar_url: e.target.value }))}
                            className="w-full bg-card text-foreground border-2 border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors placeholder:text-mutedForeground"
                            placeholder="https://..."
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setIsAddMemberOpen(false)} className="px-4 py-2 text-sm font-medium text-mutedForeground hover:bg-slate-500/10 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleAddMember} className="px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors shadow-md">
                            Add Member
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ====== ADD KPI MODAL ====== */}
            <Modal isOpen={isAddKPIOpen} onClose={() => setIsAddKPIOpen(false)} title={`Add KPI for ${selectedMember?.full_name || ''}`}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Metric Name *</label>
                        <input
                            type="text"
                            value={newKPI.metric_name}
                            onChange={e => setNewKPI(k => ({ ...k, metric_name: e.target.value }))}
                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors"
                            placeholder="e.g. Engagement Rate Instagram"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            <input
                                type="text"
                                value={newKPI.category}
                                onChange={e => setNewKPI(k => ({ ...k, category: e.target.value }))}
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors"
                                placeholder="Social Media"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                            <select
                                value={newKPI.unit}
                                onChange={e => setNewKPI(k => ({ ...k, unit: e.target.value }))}
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors"
                            >
                                <option value="%">%</option>
                                <option value=" posts"> posts</option>
                                <option value=" views"> views</option>
                                <option value=" followers"> followers</option>
                                <option value="">custom</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Target Value</label>
                            <input
                                type="number"
                                value={newKPI.target_value}
                                onChange={e => setNewKPI(k => ({ ...k, target_value: Number(e.target.value) }))}
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Current Value</label>
                            <input
                                type="number"
                                value={newKPI.actual_value}
                                onChange={e => setNewKPI(k => ({ ...k, actual_value: Number(e.target.value) }))}
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
                            <select
                                value={newKPI.period}
                                onChange={e => setNewKPI(k => ({ ...k, period: e.target.value }))}
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors"
                            >
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Period Date</label>
                            <input
                                type="date"
                                value={newKPI.period_date}
                                onChange={e => setNewKPI(k => ({ ...k, period_date: e.target.value }))}
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                        <input
                            type="text"
                            value={newKPI.notes}
                            onChange={e => setNewKPI(k => ({ ...k, notes: e.target.value }))}
                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors"
                            placeholder="Optional notes"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setIsAddKPIOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleAddKPI} className="px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors shadow-md">
                            Add KPI
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
