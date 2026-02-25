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
            const tenantId = localStorage.getItem('tenant_id') || localStorage.getItem('user_id');
            const userRole = localStorage.getItem('user_role') || 'Member';
            const isBase64Avatar = currentUserAvatar?.startsWith('data:');
            const shouldSkipAvatarFilter = isBase64Avatar && currentUserAvatar.length > 500;

            let wsQuery = supabase.from('workspaces').select('id,name,members,admin_id');

            if (userRole === 'Developer') {
                // Developers see all
            } else if (shouldSkipAvatarFilter) {
                wsQuery = wsQuery.eq('admin_id', tenantId);
            } else {
                wsQuery = wsQuery.or(`admin_id.eq.${tenantId}${currentUserAvatar ? `,members.cs.{"${currentUserAvatar}"}` : ''}`);
            }

            const [membersRes, kpisRes, wsRes] = await Promise.all([
                supabase.from('team_members').select('*').eq('admin_id', tenantId).order('full_name'),
                supabase.from('team_kpis').select('*').order('created_at', { ascending: false }),
                wsQuery.order('name'),
            ]);

            if (membersRes.data) setMembers(membersRes.data);
            if (kpisRes.data) setKpis(kpisRes.data);

            if (wsRes.data) {
                const userId = localStorage.getItem('user_id');
                let accessibleWorkspaces = (wsRes.data as WorkspaceItem[]).filter(ws =>
                    ws.owner_id === userId || (ws.admin_id === userId && !ws.owner_id) || (ws.members && ws.members.some((m: string) => {
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-2">
                        {config?.page_titles?.['kpi']?.title || 'Team KPI Board'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">{config?.page_titles?.['kpi']?.subtitle || 'Monitor performa dan pencapaian tim secara real-time'}</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={periodFilter}
                        onChange={e => setPeriodFilter(e.target.value)}
                        className="bg-transparent border-2 border-slate-200 text-foreground rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-violet-400 transition-colors cursor-pointer"
                    >
                        {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>

                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card rounded-2xl border-2 border-slate-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-violet-100/10 rounded-xl flex items-center justify-center">
                        <Users className="text-violet-500" size={22} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-foreground">{totalMembers}</p>
                        <p className="text-xs text-slate-500 font-medium">Team Members</p>
                    </div>
                </div>
                <div className="bg-card rounded-2xl border-2 border-slate-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100/10 rounded-xl flex items-center justify-center">
                        <Target className="text-blue-500" size={22} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-foreground">{avgCompletion}%</p>
                        <p className="text-xs text-slate-500 font-medium">Avg. Completion</p>
                    </div>
                </div>
                <div className="bg-card rounded-2xl border-2 border-slate-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100/10 rounded-xl flex items-center justify-center">
                        <TrendingUp className="text-emerald-500" size={22} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-foreground">{onTrackCount}/{totalMembers}</p>
                        <p className="text-xs text-slate-500 font-medium">On Track</p>
                    </div>
                </div>
            </div>

            {/* Workspace Folder + Member Grid */}
            <div className="flex gap-5">
                {/* Left: Workspace Folders — only show workspaces accessible to current user */}
                {myWorkspaces.length > 1 && (
                    <div className="w-52 shrink-0">
                        <div className="bg-card border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_#0f172a] overflow-hidden">
                            <div className="p-3 border-b-2 border-slate-900 bg-violet-600">
                                <p className="text-white font-black text-xs uppercase tracking-widest">Workspace</p>
                            </div>
                            <div className="p-2 space-y-1">
                                <button
                                    onClick={() => setSelectedWorkspaceId('all')}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedWorkspaceId === 'all' ? 'bg-violet-600 text-white shadow-[2px_2px_0px_#0f172a]' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <Users size={13} /> Semua Workspace
                                    <span className="ml-auto text-[10px] opacity-70">{filteredMembers.length}</span>
                                </button>
                                {myWorkspaces.map(ws => {
                                    const wsAvatars = new Set(ws.members || []);
                                    const count = members.filter(m => wsAvatars.has(m.avatar_url)).length;
                                    return (
                                        <button
                                            key={ws.id}
                                            onClick={() => setSelectedWorkspaceId(ws.id)}
                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedWorkspaceId === ws.id ? 'bg-violet-600 text-white shadow-[2px_2px_0px_#0f172a]' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            <span className="truncate flex-1 text-left">{ws.name}</span>
                                            <span className="text-[10px] opacity-70">{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Right: Member Cards */}
                <div className="flex-1">
                    {filteredMembers.length === 0 ? (
                        <div className="text-center py-20 bg-card rounded-2xl border-2 border-dashed border-border">
                            <Users className="mx-auto text-mutedForeground mb-4" size={48} />
                            {!isAdmin && myWorkspaces.length === 0 ? (
                                // Member with no workspace access
                                <>
                                    <h3 className="text-lg font-bold text-mutedForeground">Belum Bergabung ke Workspace</h3>
                                    <p className="text-sm text-mutedForeground/80 mt-1 max-w-xs mx-auto">
                                        Anda belum tergabung dalam workspace apapun. Hubungi admin untuk mendapatkan undangan.
                                    </p>
                                </>
                            ) : (
                                // Admin or member in workspace but no members yet
                                <>
                                    <h3 className="text-lg font-bold text-mutedForeground">Belum ada anggota tim</h3>
                                    <p className="text-sm text-mutedForeground/80 mt-1">Tidak ada anggota di workspace ini.</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredMembers.map(member => {
                                const rate = getCompletionRate(member.id);
                                const color = getCompletionColor(rate);
                                const badge = getStatusBadge(rate);
                                const memberKPIs = getMemberKPIs(member.id);

                                return (
                                    <div
                                        key={member.id}
                                        onClick={() => openDetail(member)}
                                        className="bg-card rounded-2xl border-2 border-border hover:border-accent hover:shadow-lg p-5 cursor-pointer transition-all duration-200 group"
                                    >
                                        {/* Avatar + Info */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <img
                                                src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.full_name)}`}
                                                alt={member.full_name}
                                                className="w-12 h-12 rounded-full border-2 border-border object-cover group-hover:border-violet-300 transition-colors"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-foreground truncate">{member.full_name}</h3>
                                                <p className="text-xs text-mutedForeground truncate">{member.role}{member.department ? ` · ${member.department}` : ''}</p>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mb-3">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-xs font-medium text-mutedForeground">KPI Completion</span>
                                                <span className={`text-sm font-bold ${color.text}`}>{rate}%</span>
                                            </div>
                                            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${color.bg} rounded-full transition-all duration-700 ease-out`}
                                                    style={{ width: `${rate}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border ${badge.cls}`}>
                                                {badge.icon} {badge.label}
                                            </span>
                                            <span className="text-[11px] text-mutedForeground/80">{memberKPIs.length} metrics</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div> {/* end flex-1 member cards */}
            </div> {/* end workspace+cards flex */}

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
                            <div className={`flex flex-col transition-all duration-300 ease-in-out overflow-y-auto ${showMemberInput ? 'w-1/2 pr-4' : 'w-full'}`}>
                                {/* Member Header */}
                                <div className="flex items-center gap-3 p-4 bg-muted border-2 border-border mb-4 shrink-0 rounded-2xl">
                                    <img
                                        src={selectedMember.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedMember.full_name)}`}
                                        alt={selectedMember.full_name}
                                        className="w-14 h-14 rounded-2xl border-2 border-border object-cover shadow"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-base font-black text-foreground truncate">{selectedMember.full_name}</h2>
                                        <p className="text-xs text-mutedForeground truncate">{selectedMember.role}{selectedMember.department ? ` · ${selectedMember.department}` : ''}</p>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${badge.cls}`}>
                                                {badge.icon} {badge.label}
                                            </span>
                                            <span className={`text-sm font-black ${color.text}`}>{rate}%</span>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <button onClick={() => handleDeleteMember(selectedMember.id)} className="p-2 hover:bg-red-500/10 text-red-500 hover:text-red-400 rounded-xl transition-colors shrink-0" title="Hapus anggota">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Period Filter + Action Button */}
                                <div className="flex items-center justify-between mb-3 shrink-0">
                                    <select
                                        value={periodFilter}
                                        onChange={e => setPeriodFilter(e.target.value)}
                                        className="bg-card border-2 border-border text-foreground rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-violet-400 transition-colors"
                                    >
                                        {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                    </select>
                                    {isAdmin ? (
                                        <button
                                            onClick={() => setIsAddKPIOpen(true)}
                                            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
                                        >
                                            <Plus size={13} /> Tambah KPI
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => openMemberInputPanel(memberKPIs)}
                                            disabled={memberKPIs.length === 0 || showMemberInput}
                                            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
                                        >
                                            <Edit3 size={13} /> Input Pencapaian
                                        </button>
                                    )}
                                </div>

                                {/* KPI List */}
                                {memberKPIs.length === 0 ? (
                                    <div className="text-center py-10 bg-muted rounded-xl border border-dashed border-border">
                                        <Target className="mx-auto text-mutedForeground mb-2" size={28} />
                                        <p className="text-sm text-mutedForeground/80 font-medium">Belum ada KPI untuk periode ini</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 overflow-y-auto flex-1 pr-0.5" style={{ maxHeight: 300 }}>
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
