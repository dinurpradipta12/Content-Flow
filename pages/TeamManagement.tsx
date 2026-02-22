import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Workspace } from '../types';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Search, Users, Briefcase, ChevronRight, UserMinus, Key, EyeOff, Eye, Loader2, Globe, Layers, X, Plus, Target } from 'lucide-react';

interface AppUser {
    id: string;
    username: string;
    password: string;
    role: string;
    full_name: string;
    avatar_url: string;
    email: string;
    is_active: boolean;
    subscription_start: string | null;
    subscription_end: string | null;
    created_at: string;
}

interface WorkspaceData extends Workspace {
    members?: string[];
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

export const TeamManagement: React.FC = () => {
    const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
    const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceData[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [kpis, setKpis] = useState<KPI[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceData | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Modal state
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [saving, setSaving] = useState(false);

    // KPI Add Form
    const [showAddKPI, setShowAddKPI] = useState(false);
    const [kpiForm, setKpiForm] = useState({ metric_name: '', category: 'General', target_value: 100, actual_value: 0, unit: '%', period: 'Monthly', notes: '' });
    const [addingKPI, setAddingKPI] = useState(false);
    const [minCompletionRate, setMinCompletionRate] = useState(80);

    const currentUserAvatar = localStorage.getItem('user_avatar') || 'https://picsum.photos/40/40';

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch workspaces that current user is a part of
            const tenantId = localStorage.getItem('tenant_id') || localStorage.getItem('user_id');
            const { data: wsData, error: wsError } = await supabase
                .from('workspaces')
                .select('*')
                .eq('admin_id', tenantId)
                .order('name');
            if (wsError) throw wsError;

            // Simple filter for ownership/membership via avatar for this MVP
            // If they are Admin/Developer they might see all, but let's just show those they are strictly a part of
            const userRole = localStorage.getItem('user_role');
            let myWorkspaces = wsData || [];
            if (userRole !== 'Developer') {
                myWorkspaces = myWorkspaces.filter(w => (w.members || []).includes(currentUserAvatar));
            }
            setWorkspaces(myWorkspaces);

            if (myWorkspaces.length > 0) {
                if (!selectedWorkspace) {
                    setSelectedWorkspace(myWorkspaces[0]);
                } else {
                    const updatedSelected = myWorkspaces.find(w => w.id === selectedWorkspace.id);
                    if (updatedSelected) setSelectedWorkspace(updatedSelected);
                }
            }

            const { data: allWsData } = await supabase.from('workspaces').select('*').eq('admin_id', tenantId);
            if (allWsData) setAllWorkspaces(allWsData);

            // Fetch team members and KPIs
            const { data: tmData } = await supabase.from('team_members').select('*').eq('admin_id', tenantId);
            if (tmData) setTeamMembers(tmData);

            const { data: kData } = await supabase.from('team_kpis').select('*');
            if (kData) setKpis(kData);

            // Fetch all users to map avatars
            const { data: userData, error: userError } = await supabase
                .from('app_users')
                .select('*')
                .order('full_name');
            if (userError) throw userError;

            // ISOLATION: Admin only sees users they created (or themselves).
            const currentUserId = localStorage.getItem('user_id');
            let isolatedUsers = userData as any[];
            if (userRole !== 'Developer') {
                isolatedUsers = isolatedUsers.filter(u => u.admin_id === currentUserId || u.id === currentUserId);
            }

            setUsers(isolatedUsers as AppUser[]);
        } catch (err) {
            console.error("Error fetching team management data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Supabase Realtime
        const appUsersChannel = supabase.channel('team_mgmt_app_users')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, fetchData)
            .subscribe();

        const workspacesChannel = supabase.channel('team_mgmt_workspaces')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces' }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(appUsersChannel);
            supabase.removeChannel(workspacesChannel);
        };
    }, []);

    const getUserKPIs = (user: AppUser) => {
        const tm = teamMembers.find(t => t.full_name === user.full_name);
        if (!tm) return [];
        return kpis.filter(k => k.member_id === tm.id);
    };

    const getKPICompletion = (user: AppUser) => {
        const ukpis = getUserKPIs(user);
        if (ukpis.length === 0) return 0;
        const total = ukpis.reduce((sum, k) => sum + Math.min((k.target_value > 0 ? k.actual_value / k.target_value : 0) * 100, 100), 0);
        return Math.round(total / ukpis.length);
    };

    const currentWorkspaceUsers = users.filter(u =>
        selectedWorkspace?.members?.some(m => {
            try {
                return decodeURIComponent(u.avatar_url) === decodeURIComponent(m) || u.avatar_url === m;
            } catch {
                return u.avatar_url === m;
            }
        })
    );

    const filteredUsers = currentWorkspaceUsers.filter(u =>
        (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ===================================
    // NEW LOGIC: ADMIN ADDS USERS
    // ===================================
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ full_name: '', username: '', password: '' });
    const [inviting, setInviting] = useState(false);

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorkspace || !inviteForm.full_name || !inviteForm.username || !inviteForm.password) return;
        setInviting(true);

        const adminId = localStorage.getItem('user_id');
        const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(inviteForm.full_name)}`;

        try {
            // Include admin_id to strictly bind them to this admin tenant
            // If they don't have the table altered yet, it will error, but we skip if it errors on that column
            // We just send data without admin_id if not strictly needed or handle fallback
            let insertData: any = {
                full_name: inviteForm.full_name,
                username: inviteForm.username.toLowerCase().replace(/\s/g, '_'),
                password: inviteForm.password,
                role: 'Member',
                avatar_url: avatarUrl,
                is_active: true,
                subscription_start: new Date().toISOString()
            };
            if (adminId) {
                insertData.admin_id = adminId;
            }

            const { data: newUser, error: insertError } = await supabase.from('app_users').insert([insertData]).select().single();
            if (insertError) throw insertError;

            // Automatically append this member's avatar to selectedWorkspace.members
            const updatedMembers = [...(selectedWorkspace.members || []), avatarUrl];
            const { error: wsError } = await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', selectedWorkspace.id);

            if (wsError) throw wsError;

            alert('Berhasil mendaftarkan dan menambahkan ke workspace!');
            setInviteForm({ full_name: '', username: '', password: '' });
            setIsInviteOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Invite error', error);
            if (error?.message?.includes('admin_id')) {
                // Temporary fallback if admin_id is not yet migrated
                let insertData = {
                    full_name: inviteForm.full_name,
                    username: inviteForm.username.toLowerCase().replace(/\s/g, '_'),
                    password: inviteForm.password,
                    role: 'Member',
                    avatar_url: avatarUrl,
                    is_active: true,
                    subscription_start: new Date().toISOString()
                };
                const { error: fallbackError } = await supabase.from('app_users').insert([insertData]);
                if (!fallbackError) {
                    const updatedMembers = [...(selectedWorkspace.members || []), avatarUrl];
                    await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', selectedWorkspace.id);
                    setInviteForm({ full_name: '', username: '', password: '' });
                    setIsInviteOpen(false);
                    fetchData();
                    return;
                }
            }
            alert('Gagal menambahkan anggota. Cek apakah username sudah ada.');
        } finally {
            setInviting(false);
        }
    };

    const handleOpenDetail = (user: AppUser) => {
        setSelectedUser(user);
        setNewPassword('');
        setShowPassword(false);
        setIsDetailOpen(true);
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !newPassword) return;

        setSaving(true);
        try {
            // Because passwords are plaintext in this MVP implementation
            const { error } = await supabase
                .from('app_users')
                .update({ password: newPassword })
                .eq('id', selectedUser.id);
            if (error) throw error;

            alert('Password berhasil diperbarui.');
            setNewPassword('');
            fetchData();
            // Automatically update the local selectedUser object so we can see it
            setSelectedUser(prev => prev ? { ...prev, password: newPassword } : null);
        } catch (error) {
            console.error(error);
            alert('Gagal mengupdate password.');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveFromWorkspace = async () => {
        if (!selectedUser || !selectedWorkspace) return;
        if (!confirm(`Keluarkan ${selectedUser.full_name} dari workspace ${selectedWorkspace.name}?`)) return;

        try {
            const updatedMembers = (selectedWorkspace.members || []).filter(url => url !== selectedUser.avatar_url);

            const { error } = await supabase
                .from('workspaces')
                .update({ members: updatedMembers })
                .eq('id', selectedWorkspace.id);
            if (error) throw error;

            // Local state update before refresh to make it snappier
            setSelectedWorkspace(prev => prev ? { ...prev, members: updatedMembers } : null);
            setIsDetailOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            alert('Gagal mengeluarkan anggota.');
        }
    };

    const handleAddToOtherWorkspace = async (workspaceId: string) => {
        if (!selectedUser) return;
        const wsToUpdate = allWorkspaces.find(w => w.id === workspaceId);
        if (!wsToUpdate) return;
        if (wsToUpdate.members?.includes(selectedUser.avatar_url)) {
            alert("User sudah ada di workspace ini.");
            return;
        }

        const updatedMembers = [...(wsToUpdate.members || []), selectedUser.avatar_url];
        const { error } = await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', workspaceId);
        if (error) {
            console.error(error);
            alert("Gagal menambahkan ke workspace.");
        } else {
            alert("Berhasil mengundang ke workspace!");
            fetchData();
        }
    };

    const handleRemoveFromSpecificWorkspace = async (wsId: string, wsName: string) => {
        if (!selectedUser) return;
        if (!confirm(`Hapus ${selectedUser.full_name} dari workspace "${wsName}"?`)) return;
        const ws = allWorkspaces.find(w => w.id === wsId);
        if (!ws) return;
        const updatedMembers = (ws.members || []).filter(m => m !== selectedUser.avatar_url);
        const { error } = await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', wsId);
        if (error) { console.error(error); alert('Gagal menghapus dari workspace.'); }
        else { fetchData(); }
    };

    const handleAddKPI = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setAddingKPI(true);
        try {
            // Try to find existing team_member record
            let tm = teamMembers.find(t =>
                t.full_name === selectedUser.full_name ||
                t.avatar_url === selectedUser.avatar_url
            );

            // Auto-create if not found
            if (!tm) {
                const tenantId = localStorage.getItem('tenant_id') || localStorage.getItem('user_id');
                const { data: newTm, error: tmErr } = await supabase.from('team_members').insert([{
                    full_name: selectedUser.full_name,
                    role: selectedUser.role || 'Member',
                    department: '',
                    avatar_url: selectedUser.avatar_url,
                    admin_id: tenantId,
                    status: 'active'
                }]).select().single();
                if (tmErr) throw new Error('Gagal membuat team member record: ' + tmErr.message);
                tm = newTm;
                // Refresh teamMembers locally
                setTeamMembers(prev => [...prev, newTm]);
            }

            const { error } = await supabase.from('team_kpis').insert([{
                member_id: tm.id,
                metric_name: kpiForm.metric_name,
                category: kpiForm.category,
                target_value: kpiForm.target_value,
                actual_value: kpiForm.actual_value,
                unit: kpiForm.unit,
                period: kpiForm.period,
                period_date: new Date().toISOString().split('T')[0],
                notes: kpiForm.notes
            }]);
            if (error) throw error;
            setKpiForm({ metric_name: '', category: 'General', target_value: 100, actual_value: 0, unit: '%', period: 'Monthly', notes: '' });
            setShowAddKPI(false);
            fetchData();
        } catch (err: any) { console.error(err); alert('Gagal menambahkan KPI: ' + (err?.message || '')); }
        finally { setAddingKPI(false); }
    };

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-300 relative w-full h-full min-h-[85vh]">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
                <div>
                    <h2 className="text-3xl md:text-5xl font-heading font-black text-slate-900 tracking-tight flex items-center gap-3">
                        Team Management
                    </h2>
                    <p className="text-slate-500 font-bold mt-2">Kelola akses anggota dalam workspace spesifik Anda.</p>
                </div>
                <div className="flex z-10">
                    <Button
                        className="whitespace-nowrap shadow-[4px_4px_0px_0px_#0f172a] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all"
                        onClick={() => {
                            if (!selectedWorkspace) return alert('Pilih Workspace di kiri dulu!');
                            setIsInviteOpen(!isInviteOpen);
                        }}
                    >
                        + Mendaftarkan Anggota
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-[75vh]">
                {/* LEFT: WORKSPACES LIST */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4">
                    <div className="bg-white rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] overflow-hidden flex flex-col h-full">
                        <div className="p-4 bg-primary flex items-center gap-3">
                            <Layers className="text-white" size={24} />
                            <h3 className="font-heading font-black text-white text-lg">My Workspaces</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
                            {loading && !workspaces.length ? (
                                <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" /></div>
                            ) : workspaces.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 font-bold">Tidak ada workspace ditemukan.</div>
                            ) : (
                                workspaces.map(ws => (
                                    <button
                                        key={ws.id}
                                        onClick={() => setSelectedWorkspace(ws)}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${selectedWorkspace?.id === ws.id
                                            ? 'bg-white border-slate-900 shadow-[4px_4px_0px_#0f172a] transform -translate-y-1'
                                            : 'bg-white border-transparent hover:border-slate-300 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-lg bg-pink-100 border-2 border-pink-200 flex items-center justify-center flex-shrink-0">
                                                <Globe className="text-pink-600" size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-heading font-black text-slate-900 truncate">{ws.name}</h4>
                                                <p className="text-xs font-bold text-slate-500">{ws.members?.length || 0} Members</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={20} className={selectedWorkspace?.id === ws.id ? 'text-accent' : 'text-slate-300'} />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: USERS LIST IN WORKSPACE */}
                <div className="w-full lg:w-2/3 flex flex-col">
                    <div className="bg-white rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] overflow-hidden flex flex-col h-full">
                        <div className="px-6 py-5 border-b-4 border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between bg-accent relative gap-4">
                            {/* Geometric detail */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full pointer-events-none"></div>

                            <div className="flex items-center gap-3 relative z-10">
                                <div className="bg-white p-2 border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_#0f172a]">
                                    <Users className="text-slate-800" size={20} />
                                </div>
                                <h3 className="font-heading font-black text-white text-xl">
                                    Anggota di {selectedWorkspace ? selectedWorkspace.name : '...'}
                                </h3>
                            </div>

                            {/* SEARCH BAR (Button moved out) */}
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto z-10">
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Cari anggota tim..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white border-2 border-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-[2px_2px_0px_#0f172a]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Invite Form inline dropdown */}
                        {isInviteOpen && selectedWorkspace && (
                            <form onSubmit={handleInviteUser} className="bg-emerald-50 border-b-4 border-slate-900 border-dashed p-6 animate-in fade-in slide-in-from-top-4">
                                <h4 className="font-black text-slate-900 mb-4 tracking-wide text-sm flex items-center gap-2">
                                    <UserMinus size={16} />
                                    Daftarkan & Undang Member Baru
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input type="text" value={inviteForm.full_name} onChange={e => setInviteForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Nama Lengkap" required className="bg-white border-2 border-slate-900 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 shadow-[2px_2px_0px_#0f172a] focus:outline-none focus:ring-2 focus:ring-accent" />
                                    <input type="text" value={inviteForm.username} onChange={e => setInviteForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '_') }))} placeholder="Username Login" required className="bg-white border-2 border-slate-900 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 shadow-[2px_2px_0px_#0f172a] focus:outline-none focus:ring-2 focus:ring-accent" />
                                    <input type="password" value={inviteForm.password} onChange={e => setInviteForm(p => ({ ...p, password: e.target.value }))} placeholder="Password Sementara" required className="bg-white border-2 border-slate-900 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 shadow-[2px_2px_0px_#0f172a] focus:outline-none focus:ring-2 focus:ring-accent" />
                                </div>
                                <div className="mt-4 flex gap-3">
                                    <Button type="submit" disabled={inviting}>
                                        {inviting ? <Loader2 className="animate-spin" size={16} /> : 'Daftarkan & Tambahkan'}
                                    </Button>
                                    <Button type="button" variant="secondary" onClick={() => setIsInviteOpen(false)}>Batal</Button>
                                </div>
                                <p className="text-xs text-slate-500 font-bold mt-3">Registrasi ini menggunakan data Admin Anda dan bebas kuota.</p>
                            </form>
                        )}

                        {/* List Area */}
                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3 relative">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-slate-400 z-10" size={32} />
                                </div>
                            ) : !selectedWorkspace ? (
                                <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-400">
                                    <Briefcase size={48} className="mb-2 opacity-50" />
                                    <p className="font-bold">Pilih workspace di panel kiri</p>
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-400">
                                    <Users size={48} className="mb-2 opacity-50" />
                                    <p className="font-bold">Belum ada anggota di workspace ini</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {filteredUsers.map(user => {
                                        const rate = getKPICompletion(user);
                                        return (
                                            <div
                                                key={user.id}
                                                className="bg-white border-2 border-slate-900 rounded-xl p-3 flex flex-col gap-2 cursor-pointer hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0f172a] shadow-[2px_2px_0px_#0f172a] transition-all group"
                                                onClick={() => handleOpenDetail(user)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name || 'U')}`}
                                                        className="w-9 h-9 rounded-xl border-2 border-slate-900 object-cover shrink-0 group-hover:-rotate-3 transition-transform"
                                                        alt="Avatar"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-black text-xs text-slate-900 truncate leading-tight">{user.full_name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 truncate">@{user.username}</p>
                                                    </div>
                                                </div>
                                                <span className={`self-start inline-block px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase border border-slate-900 ${user.role === 'Developer' ? 'bg-slate-900 text-white' :
                                                    user.role === 'Admin' || user.role === 'Owner' ? 'bg-accent text-white' :
                                                        'bg-slate-50 text-slate-700'
                                                    }`}>{user.role}</span>
                                                <div>
                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                        <div className={`h-full rounded-full ${rate >= minCompletionRate ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-400' : 'bg-red-500'
                                                            }`} style={{ width: `${rate}%` }} />
                                                    </div>
                                                    <p className={`text-[10px] font-bold text-right mt-0.5 ${rate >= minCompletionRate ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-500'
                                                        }`}>{rate}%</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* DETAIL MODAL */}
            <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Manajemen Anggota Tim" maxWidth="max-w-5xl">
                {selectedUser && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                        {/* LEFT COL */}
                        <div className="space-y-6">
                            {/* Header User */}
                            <div className="flex items-start gap-4 p-4 border-2 border-slate-900 rounded-2xl bg-white relative overflow-hidden shadow-[4px_4px_0px_#0f172a]">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl"></div>
                                <img src={selectedUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedUser.full_name || 'U')}`}
                                    className="w-16 h-16 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] object-cover relative z-10 bg-white" alt="Avatar" />
                                <div className="relative z-10">
                                    <h3 className="text-xl font-heading font-black text-slate-900">{selectedUser.full_name}</h3>
                                    <p className="text-sm font-bold text-slate-500 mb-1">@{selectedUser.username}</p>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-black bg-slate-900 text-white border-slate-900">
                                        {selectedUser.role}
                                    </span>
                                </div>
                            </div>

                            {/* Reset Password */}
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                                    <Key size={16} /> Password User
                                </h4>
                                <div className="bg-slate-50 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-4">
                                    <div className="mb-4">
                                        <p className="text-sm font-bold text-slate-700 mb-2">Password Saat Ini:</p>
                                        <div className="flex justify-between items-center bg-white border-2 border-slate-900 p-3 rounded-xl shadow-inner">
                                            <span className="font-mono font-bold text-slate-900">
                                                {showPassword ? selectedUser.password : '••••••••'}
                                            </span>
                                            <button onClick={() => setShowPassword(!showPassword)} className="text-slate-500 hover:text-slate-900">
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <form onSubmit={handleUpdatePassword} className="border-t-2 border-slate-200 pt-4 flex gap-3">
                                        <input
                                            type="text"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            placeholder="Ketik password baru..."
                                            required
                                            className="flex-1 bg-white border-2 border-slate-900 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent shadow-[2px_2px_0px_#0f172a]"
                                        />
                                        <Button type="submit" disabled={saving || !newPassword}>
                                            {saving ? <Loader2 className="animate-spin" size={16} /> : 'Ubah Password'}
                                        </Button>
                                    </form>
                                </div>
                            </div>

                            {/* WORKSPACES INFO & INVITE */}
                            <div className="space-y-3 pt-4 border-t-2 border-slate-200">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                                    <Globe size={16} /> Workspaces
                                </h4>
                                {/* Workspace tags with individual remove button */}
                                <div className="flex flex-wrap gap-2">
                                    {allWorkspaces.filter(ws => ws.members?.includes(selectedUser.avatar_url)).map(ws => (
                                        <span key={ws.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border-2 border-slate-900 rounded-lg text-xs font-bold text-slate-700 shadow-[2px_2px_0px_#0f172a]">
                                            {ws.name}
                                            <button
                                                onClick={() => handleRemoveFromSpecificWorkspace(ws.id, ws.name)}
                                                className="text-slate-400 hover:text-red-600 transition-colors ml-0.5"
                                                title={`Hapus dari ${ws.name}`}
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                    {allWorkspaces.filter(ws => ws.members?.includes(selectedUser.avatar_url)).length === 0 && (
                                        <p className="text-xs text-slate-400 italic">Tidak ada workspace</p>
                                    )}
                                </div>

                                {/* Add to Workspace feature */}
                                <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-300 p-3">
                                    <p className="text-xs font-bold text-emerald-800 mb-2">Undang ke workspace lain:</p>
                                    <div className="flex gap-2 items-center">
                                        <select
                                            id="ws-select"
                                            className="flex-1 bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 shadow-[2px_2px_0px_#0f172a]"
                                        >
                                            <option value="">-- Pilih Workspace --</option>
                                            {allWorkspaces.filter(ws => !ws.members?.includes(selectedUser.avatar_url)).map(ws => (
                                                <option key={ws.id} value={ws.id}>{ws.name}</option>
                                            ))}
                                        </select>
                                        <Button onClick={() => {
                                            const selectEl = document.getElementById('ws-select') as HTMLSelectElement;
                                            if (selectEl && selectEl.value) handleAddToOtherWorkspace(selectEl.value);
                                        }}>Undang</Button>
                                    </div>
                                </div>
                            </div>

                            {/* Hapus dari workspace aktif */}
                            <div className="pt-4 border-t-2 border-slate-200">
                                <div className="bg-red-50 rounded-2xl border-2 border-red-300 p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
                                    <p className="text-xs font-bold text-red-800">
                                        Keluarkan dari workspace <span className="italic">{selectedWorkspace?.name}</span>.
                                    </p>
                                    <button
                                        onClick={handleRemoveFromWorkspace}
                                        className="whitespace-nowrap bg-white text-red-600 hover:bg-red-600 hover:text-white font-black text-xs px-4 py-2.5 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] transition-all hover:translate-y-[2px] hover:shadow-none"
                                    >
                                        <UserMinus size={14} className="inline mr-1" /> Keluarkan
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COL - KPI */}
                        <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] h-full flex flex-col">
                            {/* KPI Header */}
                            <div className="pb-3 border-b-2 border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-heading font-black text-xl text-slate-900">Daftar KPI</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm px-3 py-1 bg-accent text-white rounded-full shadow-[2px_2px_0px_#0f172a]">
                                            {getKPICompletion(selectedUser)}% Selesai
                                        </span>
                                        <button
                                            onClick={() => setShowAddKPI(!showAddKPI)}
                                            className="p-1.5 bg-emerald-500 text-white rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:bg-emerald-600 transition-colors"
                                            title="Tambah KPI"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                                {/* Min Completion Rate setter */}
                                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                    <Target size={14} className="text-amber-600 shrink-0" />
                                    <span className="text-xs font-bold text-amber-800">Completion min:</span>
                                    <input
                                        type="number"
                                        min={0} max={100}
                                        value={minCompletionRate}
                                        onChange={e => setMinCompletionRate(Number(e.target.value))}
                                        className="w-16 bg-white border border-amber-300 rounded px-2 py-0.5 text-xs font-black text-amber-900 text-center focus:outline-none"
                                    />
                                    <span className="text-xs font-bold text-amber-700">%</span>
                                </div>
                                {/* Add KPI Form */}
                                {showAddKPI && (
                                    <form onSubmit={handleAddKPI} className="mt-3 bg-white border-2 border-slate-900 rounded-xl p-4 space-y-3 shadow-[3px_3px_0px_#0f172a] animate-in fade-in slide-in-from-top-2">
                                        <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Tambah KPI Baru</p>
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                                            {/* Nama Metrik */}
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-0.5">Nama Metrik *</label>
                                                <input required placeholder="Contoh: Jumlah Post, Revenue, dll." value={kpiForm.metric_name} onChange={e => setKpiForm(p => ({ ...p, metric_name: e.target.value }))} className="w-full border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:bg-yellow-50" />
                                            </div>
                                            {/* Kategori */}
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-0.5">Kategori</label>
                                                <input placeholder="General, Sales, dll." value={kpiForm.category} onChange={e => setKpiForm(p => ({ ...p, category: e.target.value }))} className="w-full border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:bg-yellow-50" />
                                            </div>
                                            {/* Periode */}
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-0.5">Periode</label>
                                                <select value={kpiForm.period} onChange={e => setKpiForm(p => ({ ...p, period: e.target.value }))} className="w-full border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold bg-white focus:outline-none focus:bg-yellow-50">
                                                    <option>Monthly</option>
                                                    <option>Quarterly</option>
                                                    <option>Yearly</option>
                                                    <option>Weekly</option>
                                                </select>
                                            </div>
                                            {/* Target */}
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-0.5">Target</label>
                                                <input type="number" min={0} placeholder="100" value={kpiForm.target_value} onChange={e => setKpiForm(p => ({ ...p, target_value: Number(e.target.value) }))} className="w-full border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:bg-yellow-50" />
                                            </div>
                                            {/* Aktual */}
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-0.5">Nilai Aktual</label>
                                                <input type="number" min={0} placeholder="0" value={kpiForm.actual_value} onChange={e => setKpiForm(p => ({ ...p, actual_value: Number(e.target.value) }))} className="w-full border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:bg-yellow-50" />
                                            </div>
                                            {/* Unit */}
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-0.5">Satuan (Unit)</label>
                                                <input placeholder="%, pcs, rupiah, post, dll." value={kpiForm.unit} onChange={e => setKpiForm(p => ({ ...p, unit: e.target.value }))} className="w-full border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:bg-yellow-50" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button type="submit" disabled={addingKPI} className="text-xs py-1.5">{addingKPI ? <Loader2 className="animate-spin" size={14} /> : 'Simpan KPI'}</Button>
                                            <Button type="button" variant="secondary" onClick={() => setShowAddKPI(false)} className="text-xs py-1.5">Batal</Button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            {/* KPI List */}
                            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 min-h-[300px]">
                                {getUserKPIs(selectedUser).length === 0 ? (
                                    <div className="text-slate-400 font-bold text-center py-10">
                                        <Target className="mx-auto mb-2 opacity-40" size={32} />
                                        Belum ada KPI terdaftar
                                    </div>
                                ) : (
                                    getUserKPIs(selectedUser).map(kpi => {
                                        const progress = kpi.target_value > 0 ? (kpi.actual_value / kpi.target_value) * 100 : 0;
                                        const pVal = Math.min(progress, 100);
                                        const isSuccess = pVal >= minCompletionRate;
                                        return (
                                            <div key={kpi.id} className="bg-white p-4 rounded-xl border-2 border-slate-200 hover:border-slate-900 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h5 className="font-bold text-slate-900 text-sm truncate pr-2">{kpi.metric_name}</h5>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${isSuccess ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-red-50 text-red-600 border-red-200'
                                                            }`}>{isSuccess ? '✓ Berhasil' : '✗ Perlu Ditingkatkan'}</span>
                                                        <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shadow-sm">{kpi.period}</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-end mb-1">
                                                    <span className="text-xs font-bold text-slate-500">{kpi.category}</span>
                                                    <span className="text-xs font-black text-slate-900">{kpi.actual_value} / {kpi.target_value} {kpi.unit}</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2 border border-slate-200 overflow-hidden">
                                                    <div className={`h-2 rounded-full ${pVal >= minCompletionRate ? 'bg-emerald-500' : pVal >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pVal}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
