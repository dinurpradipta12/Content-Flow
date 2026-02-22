import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Modal } from '../components/ui/Modal';
import {
    Users, Target, TrendingUp, Plus, Trash2, Edit3, Save,
    ChevronDown, AlertCircle, CheckCircle, Clock, X, Loader2,
    BarChart3, User
} from 'lucide-react';

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
    return { label: 'Behind', icon: <AlertCircle size={12} />, cls: 'bg-red-50 text-red-700 border-red-200' };
};

export const TeamKPIBoard: React.FC = () => {
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

    // Add member form
    const [newMember, setNewMember] = useState({ full_name: '', role: '', department: '', avatar_url: '' });
    // Add KPI form
    const [newKPI, setNewKPI] = useState({ metric_name: '', category: 'General', target_value: 100, actual_value: 0, unit: '%', period: 'monthly', period_date: new Date().toISOString().split('T')[0], notes: '' });
    // Edit KPI
    const [editingKPI, setEditingKPI] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<{ actual_value: number; notes: string }>({ actual_value: 0, notes: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const tenantId = localStorage.getItem('tenant_id') || localStorage.getItem('user_id');
            const [membersRes, kpisRes, wsRes] = await Promise.all([
                supabase.from('team_members').select('*').eq('admin_id', tenantId).order('full_name'),
                supabase.from('team_kpis').select('*').order('created_at', { ascending: false }),
                supabase.from('workspaces').select('id,name,members').eq('admin_id', tenantId).order('name'),
            ]);
            if (membersRes.data) setMembers(membersRes.data);
            if (kpisRes.data) setKpis(kpisRes.data);
            if (wsRes.data) setWorkspaces(wsRes.data as WorkspaceItem[]);
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
        setEditingKPI(null);
        fetchData();
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

    // Stats
    const filteredMembers = selectedWorkspaceId === 'all'
        ? members
        : (() => {
            const ws = workspaces.find(w => w.id === selectedWorkspaceId);
            if (!ws) return members;
            const wsAvatars = new Set(ws.members || []);
            return members.filter(m => wsAvatars.has(m.avatar_url));
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
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <BarChart3 className="text-violet-500" size={28} />
                        Team KPI Board
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Monitor performa dan pencapaian tim secara real-time</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={periodFilter}
                        onChange={e => setPeriodFilter(e.target.value)}
                        className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-violet-400 transition-colors cursor-pointer"
                    >
                        {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <button
                        onClick={() => setIsAddMemberOpen(true)}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-lg shadow-violet-200"
                    >
                        <Plus size={16} /> Add Member
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                        <Users className="text-violet-600" size={22} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{totalMembers}</p>
                        <p className="text-xs text-slate-500 font-medium">Team Members</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Target className="text-blue-600" size={22} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{avgCompletion}%</p>
                        <p className="text-xs text-slate-500 font-medium">Avg. Completion</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <TrendingUp className="text-emerald-600" size={22} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{onTrackCount}/{totalMembers}</p>
                        <p className="text-xs text-slate-500 font-medium">On Track</p>
                    </div>
                </div>
            </div>

            {/* Workspace Folder + Member Grid */}
            <div className="flex gap-5">
                {/* Left: Workspace Folders */}
                {workspaces.length > 1 && (
                    <div className="w-52 shrink-0">
                        <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-[4px_4px_0px_#0f172a] overflow-hidden">
                            <div className="p-3 border-b-2 border-slate-900 bg-violet-600">
                                <p className="text-white font-black text-xs uppercase tracking-widest">Workspace</p>
                            </div>
                            <div className="p-2 space-y-1">
                                <button
                                    onClick={() => setSelectedWorkspaceId('all')}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedWorkspaceId === 'all' ? 'bg-violet-600 text-white shadow-[2px_2px_0px_#0f172a]' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    <Users size={13} /> Semua Workspace
                                    <span className="ml-auto text-[10px] opacity-70">{members.length}</span>
                                </button>
                                {workspaces.map(ws => {
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
                        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-300">
                            <Users className="mx-auto text-slate-300 mb-4" size={48} />
                            <h3 className="text-lg font-bold text-slate-400">Belum ada anggota tim</h3>
                            <p className="text-sm text-slate-400 mt-1">Klik "Add Member" untuk menambahkan anggota.</p>
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
                                        className="bg-white rounded-2xl border-2 border-slate-200 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100 p-5 cursor-pointer transition-all duration-200 group"
                                    >
                                        {/* Avatar + Info */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <img
                                                src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.full_name)}`}
                                                alt={member.full_name}
                                                className="w-12 h-12 rounded-full border-2 border-slate-200 object-cover group-hover:border-violet-300 transition-colors"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-900 truncate">{member.full_name}</h3>
                                                <p className="text-xs text-slate-500 truncate">{member.role}{member.department ? ` · ${member.department}` : ''}</p>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mb-3">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-xs font-medium text-slate-500">KPI Completion</span>
                                                <span className={`text-sm font-bold ${color.text}`}>{rate}%</span>
                                            </div>
                                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
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
                                            <span className="text-[11px] text-slate-400">{memberKPIs.length} metrics</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div> {/* end flex-1 member cards */}
            </div> {/* end workspace+cards flex */}

            {/* ====== DETAIL MODAL ====== */}
            <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={selectedMember?.full_name || 'Detail'} maxWidth="max-w-3xl">
                {selectedMember && (() => {
                    const memberKPIs = getMemberKPIs(selectedMember.id);
                    const rate = getCompletionRate(selectedMember.id);
                    const color = getCompletionColor(rate);
                    const badge = getStatusBadge(rate);

                    return (
                        <div className="space-y-6">
                            {/* Member Header */}
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <img
                                    src={selectedMember.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedMember.full_name)}`}
                                    alt={selectedMember.full_name}
                                    className="w-16 h-16 rounded-full border-2 border-slate-200 object-cover"
                                />
                                <div className="flex-1">
                                    <h2 className="text-lg font-bold text-slate-900">{selectedMember.full_name}</h2>
                                    <p className="text-sm text-slate-500">{selectedMember.role}{selectedMember.department ? ` · ${selectedMember.department}` : ''}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${badge.cls}`}>
                                            {badge.icon} {badge.label}
                                        </span>
                                        <span className={`text-sm font-bold ${color.text}`}>{rate}% Complete</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteMember(selectedMember.id)}
                                    className="p-2 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                                    title="Hapus anggota"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            {/* Period Filter + Add KPI */}
                            <div className="flex items-center justify-between">
                                <select
                                    value={periodFilter}
                                    onChange={e => setPeriodFilter(e.target.value)}
                                    className="bg-white border-2 border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-violet-400 transition-colors"
                                >
                                    {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                                <button
                                    onClick={() => setIsAddKPIOpen(true)}
                                    className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-lg font-medium text-sm transition-colors"
                                >
                                    <Plus size={14} /> Add KPI
                                </button>
                            </div>

                            {/* KPI List */}
                            {memberKPIs.length === 0 ? (
                                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                    <Target className="mx-auto text-slate-300 mb-2" size={32} />
                                    <p className="text-sm text-slate-400 font-medium">Belum ada KPI untuk periode ini</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {memberKPIs.map(kpi => {
                                        const kpiRate = kpi.target_value > 0 ? Math.min(Math.round((kpi.actual_value / kpi.target_value) * 100), 100) : 0;
                                        const kpiColor = getCompletionColor(kpiRate);
                                        const isEditing = editingKPI === kpi.id;

                                        return (
                                            <div key={kpi.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-slate-800 text-sm truncate">{kpi.metric_name}</h4>
                                                        <p className="text-[11px] text-slate-400">{kpi.category} · {kpi.period} · {new Date(kpi.period_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 ml-2">
                                                        {!isEditing ? (
                                                            <>
                                                                <button onClick={(e) => { e.stopPropagation(); setEditingKPI(kpi.id); setEditValues({ actual_value: kpi.actual_value, notes: kpi.notes }); }} className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors">
                                                                    <Edit3 size={14} />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteKPI(kpi.id); }} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => handleUpdateKPI(kpi.id)} className="p-1.5 hover:bg-emerald-50 text-emerald-500 rounded-lg transition-colors">
                                                                    <Save size={14} />
                                                                </button>
                                                                <button onClick={() => setEditingKPI(null)} className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors">
                                                                    <X size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Progress */}
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1">
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className={`h-full ${kpiColor.bg} rounded-full transition-all duration-500`} style={{ width: `${kpiRate}%` }} />
                                                        </div>
                                                    </div>
                                                    <span className={`text-xs font-bold ${kpiColor.text} whitespace-nowrap`}>{kpiRate}%</span>
                                                </div>

                                                {/* Target vs Actual */}
                                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                    <span>Target: <strong className="text-slate-700">{kpi.target_value}{kpi.unit}</strong></span>
                                                    {isEditing ? (
                                                        <span className="flex items-center gap-1">
                                                            Actual:
                                                            <input
                                                                type="number"
                                                                value={editValues.actual_value}
                                                                onChange={e => setEditValues(v => ({ ...v, actual_value: Number(e.target.value) }))}
                                                                className="w-20 border border-violet-300 rounded px-2 py-0.5 text-xs font-bold text-violet-700 focus:outline-none"
                                                                onClick={e => e.stopPropagation()}
                                                            />
                                                            {kpi.unit}
                                                        </span>
                                                    ) : (
                                                        <span>Actual: <strong className="text-slate-700">{kpi.actual_value}{kpi.unit}</strong></span>
                                                    )}
                                                    {kpi.notes && !isEditing && <span className="text-slate-400 truncate max-w-[150px]" title={kpi.notes}>📝 {kpi.notes}</span>}
                                                </div>

                                                {isEditing && (
                                                    <input
                                                        type="text"
                                                        placeholder="Notes (optional)"
                                                        value={editValues.notes}
                                                        onChange={e => setEditValues(v => ({ ...v, notes: e.target.value }))}
                                                        className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-violet-300"
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })()}
            </Modal>

            {/* ====== ADD MEMBER MODAL ====== */}
            <Modal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} title="Add Team Member">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                        <input
                            type="text"
                            value={newMember.full_name}
                            onChange={e => setNewMember(m => ({ ...m, full_name: e.target.value }))}
                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors"
                            placeholder="Nama lengkap"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                            <input
                                type="text"
                                value={newMember.role}
                                onChange={e => setNewMember(m => ({ ...m, role: e.target.value }))}
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors"
                                placeholder="Content Creator"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                            <input
                                type="text"
                                value={newMember.department}
                                onChange={e => setNewMember(m => ({ ...m, department: e.target.value }))}
                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors"
                                placeholder="Marketing"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Avatar URL (optional)</label>
                        <input
                            type="text"
                            value={newMember.avatar_url}
                            onChange={e => setNewMember(m => ({ ...m, avatar_url: e.target.value }))}
                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition-colors"
                            placeholder="https://..."
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setIsAddMemberOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleAddMember} className="px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors shadow-lg shadow-violet-200">
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
                        <button onClick={handleAddKPI} className="px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors shadow-lg shadow-violet-200">
                            Add KPI
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
