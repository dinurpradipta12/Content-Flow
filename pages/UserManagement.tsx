import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../services/supabaseClient';
import {
    Users, Trash2, RefreshCw, Loader2, Shield, UserPlus, Hash, Mail, Key, Globe,
    Eye, EyeOff, Copy, Power, Calendar, Clock, CheckCircle, XCircle, Layers, Search,
    ShieldCheck, ShieldX, AlertTriangle, TrendingUp, UserCheck, Bell, UserMinus,
    ArrowRight, Activity
} from 'lucide-react';
import { useAppConfig } from '../components/AppConfigProvider';
import bcrypt from 'bcryptjs';
import { logActivity } from '../services/activityService';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
    ResponsiveContainer, AreaChart, Area
} from 'recharts';

interface AppUser {
    id: string;
    username: string;
    password: string;
    role: string;
    full_name: string;
    avatar_url: string;
    email: string;
    is_active: boolean;
    is_verified: boolean;
    subscription_start: string | null;
    subscription_end: string | null;
    subscription_code: string | null;
    subscription_package: string | null;
    created_at: string;
    parent_user_id?: string | null;
    invited_by?: string | null;
    online_status?: 'online' | 'idle' | 'offline';
    last_activity_at?: string;
}

interface Workspace {
    id: string;
    name: string;
    members?: string[];
}

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Dashboard Modal States
    const [isGrowthModalOpen, setIsGrowthModalOpen] = useState(false);
    const [isExpiringModalOpen, setIsExpiringModalOpen] = useState(false);
    const [isAdminStatsModalOpen, setIsAdminStatsModalOpen] = useState(false);
    const [isAdminTeamModalOpen, setIsAdminTeamModalOpen] = useState(false);
    const [isInactiveModalOpen, setIsInactiveModalOpen] = useState(false);

    const [viewingAdminTeam, setViewingAdminTeam] = useState<AppUser | null>(null);

    const { config } = useAppConfig();
    const availablePackages = [
        ...(config?.payment_config?.personalPackages || []),
        ...(config?.payment_config?.teamPackages || []),
        ...(config?.payment_config?.packages || [])
    ];

    // Current user role
    const currentUserRole = localStorage.getItem('user_role') || 'Member';
    const isDeveloper = currentUserRole === 'Developer';
    const isAdmin = currentUserRole === 'Admin' || currentUserRole === 'Owner' || isDeveloper;

    // Detail modal
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [showDetailPassword, setShowDetailPassword] = useState(false);
    const [verifyCodeInput, setVerifyCodeInput] = useState('');
    const [selectedWorkspaceToAssign, setSelectedWorkspaceToAssign] = useState('');

    // Registration form
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        username: '',
        password: '',
        workspace_id: '',
        subscription_end: '',
        subscription_package: '',
    });
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('app_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers((data || []) as AppUser[]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Realtime Presence Listener
    useEffect(() => {
        const channel = supabase
            .channel('presence-all-users')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'app_users'
            }, (payload) => {
                const updatedUser = payload.new as AppUser;
                setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchWorkspaces = async () => {
        try {
            const userId = localStorage.getItem('user_id');
            const userRole = localStorage.getItem('user_role');
            const avatar = localStorage.getItem('user_avatar') || '';

            let query = supabase.from('workspaces').select('id, name, members');
            // Strict visibility: only own or invited (Applies to ALL roles)
            query = query.or(`owner_id.eq.${userId},members.cs.{"${userId}"}`);

            const { data } = await query.order('name');

            if (data) setWorkspaces(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        if (!form.full_name.trim()) { setFormError('Nama lengkap wajib diisi.'); return; }
        if (!form.username.trim()) { setFormError('Username wajib diisi.'); return; }
        if (form.password.length < 6) { setFormError('Password minimal 6 karakter.'); return; }

        const existing = users.find(u => u.username.toLowerCase() === form.username.toLowerCase());
        if (existing) { setFormError('Username sudah digunakan.'); return; }

        setRegistering(true);
        try {
            const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(form.full_name)}`;
            const now = new Date().toISOString();

            const hashedPassword = bcrypt.hashSync(form.password, 10);
            const insertData: any = {
                full_name: form.full_name,
                email: form.email,
                username: form.username,
                password: hashedPassword,
                role: 'Member',
                avatar_url: avatarUrl,
                is_active: true,
                subscription_start: now,
                subscription_package: form.subscription_package || 'Free',
                last_activity_at: null, // Explicit null to trigger FirstLoginModal on first login
            };
            if (form.subscription_end) {
                insertData.subscription_end = new Date(form.subscription_end).toISOString();
            }


            const { data: newUser, error } = await supabase.from('app_users').insert([insertData]).select().single();
            if (error) throw error;

            // Log activity
            await logActivity({
                action: 'INVITE_USER',
                entity_type: 'user',
                entity_id: newUser.id,
                details: { fullName: form.full_name, package: insertData.subscription_package }
            });

            setFormSuccess(`User "${form.username}" berhasil didaftarkan!`);
            setForm({ full_name: '', email: '', username: '', password: '', workspace_id: '', subscription_end: '', subscription_package: '' });
            fetchUsers();
            setTimeout(() => setFormSuccess(''), 4000);
        } catch (err: any) {
            console.error(err);
            if (err?.message?.includes('duplicate') || err?.message?.includes('unique')) {
                setFormError('Username sudah terdaftar.');
            } else {
                setFormError('Gagal mendaftarkan user. Cek koneksi database.');
            }
        } finally {
            setRegistering(false);
        }
    };

    const handleDeleteUser = async (id: string, username: string) => {
        if (!confirm(`Hapus user ${username}? Tindakan ini tidak bisa dibatalkan.`)) return;
        try {
            const { error } = await supabase.from('app_users').delete().eq('id', id);
            if (error) throw error;
            setUsers(prev => prev.filter(u => u.id !== id));
            if (selectedUser?.id === id) {
                setIsDetailOpen(false);
                setSelectedUser(null);
            }
        } catch (err) {
            console.error(err);
            alert("Gagal menghapus user.");
        }
    };

    const handleToggleActive = async (user: AppUser) => {
        if (!isDeveloper) { alert('Hanya Developer yang dapat mengubah status akun.'); return; }
        const newStatus = !user.is_active;
        try {
            const updateData: any = { is_active: newStatus };
            if (newStatus && user.subscription_end) {
                const endDate = new Date(user.subscription_end);
                const now = new Date();
                if (now > endDate) {
                    const newEnd = new Date();
                    newEnd.setDate(newEnd.getDate() + 30);
                    updateData.subscription_end = newEnd.toISOString();
                    updateData.subscription_start = now.toISOString();
                }
            }
            await supabase.from('app_users').update(updateData).eq('id', user.id);
            fetchUsers();
            if (selectedUser?.id === user.id) {
                setSelectedUser({ ...user, ...updateData });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleVerifyUser = async (user: AppUser) => {
        if (!isDeveloper) { alert('Hanya Developer yang dapat memverifikasi user.'); return; }

        // Check if verify code matches subscription_code
        if (!verifyCodeInput.trim()) {
            alert('Masukkan kode verifikasi terlebih dahulu.');
            return;
        }

        if (verifyCodeInput.trim().toUpperCase() !== (user.subscription_code || '').trim().toUpperCase()) {
            alert(`Kode verifikasi tidak cocok!\n\nKode yang dimasukkan: ${verifyCodeInput}\nKode user "${user.full_name}": ${user.subscription_code || '(kosong)'}\n\nPastikan kode yang dimasukkan sama dengan kode unik langganan user.`);
            return;
        }

        try {
            await supabase.from('app_users').update({ is_verified: true }).eq('id', user.id);
            fetchUsers();
            if (selectedUser?.id === user.id) {
                setSelectedUser({ ...user, is_verified: true });
            }
            setVerifyCodeInput('');
            alert(`User "${user.full_name}" berhasil diverifikasi! Kode cocok.`);
        } catch (err) {
            console.error(err);
            alert('Gagal memverifikasi user.');
        }
    };

    const handleUnverifyUser = async (user: AppUser) => {
        if (!isDeveloper) return;
        try {
            await supabase.from('app_users').update({ is_verified: false }).eq('id', user.id);
            fetchUsers();
            if (selectedUser?.id === user.id) {
                setSelectedUser({ ...user, is_verified: false });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddUserToWorkspace = async () => {
        if (!selectedWorkspaceToAssign || !selectedUser) return;

        try {
            const { data: ws, error: wsError } = await supabase
                .from('workspaces')
                .select('members, name')
                .eq('id', selectedWorkspaceToAssign)
                .single();

            if (wsError || !ws) {
                alert('Workspace tidak ditemukan.');
                return;
            }

            const currentMembers: string[] = ws.members || [];

            if (currentMembers.includes(selectedUser.id)) {
                alert(`User ${selectedUser.username} sudah ada di workspace ${ws.name}.`);
                return;
            }

            const updatedMembers = [...currentMembers, selectedUser.id];

            const { error: updateError } = await supabase
                .from('workspaces')
                .update({ members: updatedMembers })
                .eq('id', selectedWorkspaceToAssign);

            if (updateError) throw updateError;

            alert(`Berhasil menambahkan user ${selectedUser.username} ke workspace ${ws.name}!`);
            setSelectedWorkspaceToAssign('');
        } catch (err) {
            console.error('Error adding user to workspace:', err);
            alert('Gagal menambahkan user ke workspace.');
        }
    };

    const handleChangeRole = async (userId: string, newRole: string) => {
        if (!isDeveloper && !isAdmin) return;
        // Admin cannot promote to Developer
        if (!isDeveloper && newRole === 'Developer') { alert('Hanya Developer yang dapat menetapkan role Developer.'); return; }
        try {
            await supabase.from('app_users').update({ role: newRole }).eq('id', userId);
            fetchUsers();
            if (selectedUser?.id === userId) {
                setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateSubscriptionEnd = async (userId: string, newEnd: string) => {
        if (!isDeveloper) {
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Hanya Developer yang dapat mengubah subscription.' } }));
            return;
        }
        try {
            await supabase.from('app_users').update({ subscription_end: newEnd || null }).eq('id', userId);
            window.dispatchEvent(new Event('sub_updated'));
            fetchUsers();
            if (selectedUser?.id === userId) {
                setSelectedUser(prev => prev ? { ...prev, subscription_end: newEnd || null } : null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateSubscriptionPackage = async (userId: string, newPackage: string) => {
        if (!isDeveloper) {
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Hanya Developer yang dapat mengubah paket langganan.' } }));
            return;
        }
        try {
            await supabase.from('app_users').update({ subscription_package: newPackage }).eq('id', userId);
            fetchUsers();
            if (selectedUser?.id === userId) {
                setSelectedUser(prev => prev ? { ...prev, subscription_package: newPackage } : null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const openDetail = (user: AppUser) => {
        setSelectedUser(user);
        setShowDetailPassword(false);
        setIsDetailOpen(true);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const formatForDatetimeLocal = (isoString?: string | null) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    };

    const getSubscriptionStatus = (user: AppUser) => {
        if (!user.is_active) return { label: 'Nonaktif', color: 'bg-red-100 text-red-800 border-red-300', active: false };
        if (!user.subscription_end) return { label: 'Aktif (Unlimited)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', active: true };

        const end = new Date(user.subscription_end);
        const now = new Date();

        if (now > end) return { label: 'Expired', color: 'bg-red-100 text-red-800 border-red-300', active: false };

        const msLeft = end.getTime() - now.getTime();
        const minutesLeft = Math.floor(msLeft / (1000 * 60));
        const hoursLeft = Math.floor(minutesLeft / 60);
        const daysLeft = Math.floor(hoursLeft / 24);

        if (minutesLeft < 60) return { label: `${minutesLeft} menit lagi`, color: 'bg-amber-100 text-amber-800 border-amber-300', active: true };
        if (hoursLeft < 24) return { label: `${hoursLeft} jam lagi`, color: 'bg-amber-100 text-amber-800 border-amber-300', active: true };
        if (daysLeft <= 7) return { label: `${daysLeft} hari lagi`, color: 'bg-amber-100 text-amber-800 border-amber-300', active: true };

        return { label: 'Aktif', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', active: true };
    };

    useEffect(() => {
        fetchUsers();
        fetchWorkspaces();

        // Supabase Realtime: listen for changes on app_users
        const channel = supabase
            .channel('app_users_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'app_users' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setUsers(prev => [payload.new as AppUser, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setUsers(prev =>
                            prev.map(u => u.id === (payload.new as AppUser).id ? (payload.new as AppUser) : u)
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setUsers(prev => prev.filter(u => u.id !== (payload.old as any).id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Keep selectedUser in sync with users array
    useEffect(() => {
        if (selectedUser) {
            const updated = users.find(u => u.id === selectedUser.id);
            if (updated) setSelectedUser(updated);
        }
    }, [users]);

    // --- DASHBOARD CALCULATIONS ---
    const now = new Date();
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(now.getDate() + 5);

    const expiringUsers = users.filter(u =>
        u.subscription_end &&
        new Date(u.subscription_end) > now &&
        new Date(u.subscription_end) <= fiveDaysFromNow
    );

    const admins = users.filter(u => u.role === 'Admin' || u.role === 'Owner');
    const adminTeamStats = admins.map(admin => {
        const teamCount = users.filter(u => u.invited_by === admin.username).length;
        return { ...admin, teamCount };
    });

    const inactiveUsers = users.filter(u =>
        !u.is_active ||
        (u.subscription_end && new Date(u.subscription_end) < now)
    );

    const newestUsers = [...users]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    const growthData = React.useMemo(() => {
        const countsByDate: Record<string, number> = {};
        const sortedUsers = [...users].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        let runningTotal = 0;
        sortedUsers.forEach(u => {
            const date = new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            runningTotal++;
            countsByDate[date] = runningTotal;
        });

        return Object.entries(countsByDate).map(([name, value]) => ({ name, value }));
    }, [users]);

    return (
        <div className="space-y-4 sm:space-y-5 md:space-y-6 flex-1 flex flex-col min-h-0">
            {/* Access guard: Member = no access */}
            {!isAdmin && !isDeveloper && (
                <div className="flex flex-col items-center justify-center h-[40vh] sm:h-[50vh] text-center space-y-3 sm:space-y-4 border-2 border-dashed border-slate-300 rounded-lg sm:rounded-2xl bg-slate-50 p-4 sm:p-6">
                    <Shield className="text-slate-300 w-10 h-10 sm:w-12 sm:h-12" />
                    <h2 className="text-lg sm:text-2xl font-bold text-slate-400">Akses Ditolak</h2>
                    <p className="text-xs sm:text-sm text-slate-500">Halaman ini hanya untuk Developer dan Admin.</p>
                </div>
            )}

            {(isAdmin || isDeveloper) && (
                <>
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
                        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-accent rounded-lg sm:rounded-2xl flex items-center justify-center border-3 sm:border-4 border-slate-900 shadow-hard rotate-3 flex-shrink-0">
                                <Users size={20} className="sm:w-7 sm:h-7 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-black text-slate-900 leading-tight truncate">{config?.page_titles?.['management']?.title || 'User Management'}</h2>
                                <p className="text-slate-500 font-bold text-xs sm:text-sm">Total {users.length} pengguna terdaftar.</p>
                            </div>
                        </div>
                        <Button onClick={fetchUsers} variant="secondary" icon={<RefreshCw size={14} className={`${loading ? 'animate-spin' : ''} sm:w-4.5 sm:h-4.5 md:w-[18px] md:h-[18px]`} />} className="shadow-hard border-2 border-slate-900 text-xs sm:text-sm w-full md:w-auto">
                            Refresh Data
                        </Button>
                    </div>

                    {/* Summary Strategy Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                        {/* Card 1: Total Users */}
                        <div onClick={() => setIsGrowthModalOpen(true)}
                            className="bg-white p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-2xl border-3 sm:border-4 border-slate-900 shadow-hard hover:-translate-y-1 hover:shadow-[8px_8px_0px_#0f172a] transition-all cursor-pointer group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center border-2 border-slate-900">
                                    <Users className="text-blue-600" size={20} />
                                </div>
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-tighter">Growth</span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Users</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-900">{users.length}</span>
                                <span className="text-xs font-bold text-emerald-500 flex items-center"><TrendingUp size={12} className="mr-0.5" /> Live</span>
                            </div>
                        </div>

                        {/* Card 2: Expiring */}
                        <div onClick={() => setIsExpiringModalOpen(true)}
                            className="bg-white p-5 rounded-2xl border-4 border-slate-900 shadow-hard hover:-translate-y-1 hover:shadow-[8px_8px_0px_#0f172a] transition-all cursor-pointer group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center border-2 border-slate-900">
                                    <Bell className="text-amber-600" size={20} />
                                </div>
                                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase tracking-tighter">Retention</span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Masa Tenggang</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-900">{expiringUsers.length}</span>
                                <span className="text-xs font-bold text-slate-400">User / 5 Hari</span>
                            </div>
                        </div>

                        {/* Card 3: Admins */}
                        <div onClick={() => setIsAdminStatsModalOpen(true)}
                            className="bg-white p-5 rounded-2xl border-4 border-slate-900 shadow-hard hover:-translate-y-1 hover:shadow-[8px_8px_0px_#0f172a] transition-all cursor-pointer group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center border-2 border-slate-900">
                                    <ShieldCheck className="text-purple-600" size={20} />
                                </div>
                                <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-full uppercase tracking-tighter">Structure</span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Admin Roles</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-900">{admins.length}</span>
                                <span className="text-xs font-bold text-slate-400">Total Admin</span>
                            </div>
                        </div>

                        {/* Card 4: Inactive */}
                        <div onClick={() => setIsInactiveModalOpen(true)}
                            className="bg-white p-5 rounded-2xl border-4 border-slate-900 shadow-hard hover:-translate-y-1 hover:shadow-[8px_8px_0px_#0f172a] transition-all cursor-pointer group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center border-2 border-slate-900">
                                    <UserMinus className="text-red-600" size={20} />
                                </div>
                                <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-full uppercase tracking-tighter">Alert</span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Non-Aktif / Expired</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-900">{inactiveUsers.length}</span>
                                <span className="text-xs font-bold text-red-500">Warning</span>
                            </div>
                        </div>
                    </div>

                    {/* Main: Form + Table side-by-side */}
                    <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

                        {/* ===== REGISTRATION FORM ===== */}
                        <div className="w-full lg:w-[380px] shrink-0">
                            <div className="bg-white rounded-2xl border-4 border-slate-900 overflow-hidden sticky top-6 shadow-hard">
                                <div className="p-5 pb-4 border-b-4 border-slate-900 bg-yellow-300 relative">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/30 rounded-full blur-xl mix-blend-overlay"></div>
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-3 border-4 border-slate-900 shadow-[2px_2px_0px_#0f172a] relative z-10">
                                        <UserPlus className="text-slate-900" size={22} />
                                    </div>
                                    <h3 className="text-xl font-heading font-black text-slate-900 relative z-10">Undang Anggota</h3>
                                </div>

                                <form onSubmit={handleRegister} className="p-5 space-y-4">
                                    {/* Nama */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide">Nama Anggota</label>
                                        <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                                            className="w-full bg-white border-2 border-slate-900 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent md:hover:shadow-[2px_2px_0px_#0f172a] focus:shadow-[2px_2px_0px_#0f172a] transition-all"
                                            placeholder="Nama Lengkap" />
                                    </div>
                                    {/* Email */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide">Email Pribadi Anggota</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" size={16} />
                                            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                                className="w-full bg-white border-2 border-slate-900 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent md:hover:shadow-[2px_2px_0px_#0f172a] focus:shadow-[2px_2px_0px_#0f172a] transition-all"
                                                placeholder="user@gmail.com" />
                                        </div>
                                    </div>
                                    {/* Username */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide">Username Unik</label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" size={16} />
                                            <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                                                className="w-full bg-white border-2 border-slate-900 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent md:hover:shadow-[2px_2px_0px_#0f172a] focus:shadow-[2px_2px_0px_#0f172a] transition-all"
                                                placeholder="contoh: andi_dev" />
                                        </div>
                                    </div>
                                    {/* Password */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide">Password Sementara</label>
                                        <div className="relative group">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" size={16} />
                                            <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                                className="w-full bg-white border-2 border-slate-900 rounded-xl pl-10 pr-10 py-3 text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent md:hover:shadow-[2px_2px_0px_#0f172a] focus:shadow-[2px_2px_0px_#0f172a] transition-all"
                                                placeholder="Min. 6 Karakter" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 z-10">
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Subscription Period - Developer Only */}
                                    {isDeveloper && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide">Subscription Berakhir</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" size={16} />
                                                <input type="datetime-local" value={form.subscription_end} onChange={e => setForm(f => ({ ...f, subscription_end: e.target.value }))}
                                                    className="w-full bg-white border-2 border-slate-900 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent md:hover:shadow-[2px_2px_0px_#0f172a] focus:shadow-[2px_2px_0px_#0f172a] transition-all" />
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1">Kosongkan untuk akses unlimited.</p>
                                        </div>
                                    )}

                                    {/* Subscription Package */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide">Subscription Package</label>
                                        <select value={form.subscription_package} onChange={e => setForm(f => ({ ...f, subscription_package: e.target.value }))}
                                            className="w-full bg-white border-2 border-slate-900 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent md:hover:shadow-[2px_2px_0px_#0f172a] focus:shadow-[2px_2px_0px_#0f172a] transition-all">
                                            <option value="">Pilih Paket (Default: Free)</option>
                                            <option value="Free">Free</option>
                                            {availablePackages.map(pkg => (
                                                <option key={pkg.id} value={pkg.name}>{pkg.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {formError && <div className="bg-red-50 text-red-600 font-bold text-xs px-3 py-2 rounded-xl border-2 border-red-200">{formError}</div>}
                                    {formSuccess && <div className="bg-emerald-50 text-emerald-600 font-bold text-xs px-3 py-2 rounded-xl border-2 border-emerald-200">{formSuccess}</div>}

                                    <button type="submit" disabled={registering}
                                        className="w-full bg-accent hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:shadow-[2px_2px_0px_#0f172a] hover:translate-x-[2px] hover:translate-y-[2px] flex items-center justify-center gap-2 text-sm uppercase tracking-wide">
                                        {registering ? <><Loader2 className="animate-spin" size={16} /> Mendaftarkan...</> : 'Daftarkan User'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* ===== USER TABLE ===== */}
                        <div className="flex-1 min-w-0">
                            <div className="bg-white rounded-2xl border-4 border-slate-900 shadow-hard flex flex-col overflow-hidden">
                                <div className="px-6 py-5 border-b-4 border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between bg-primary relative gap-4">
                                    {/* Geometric detail */}
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 blur-2xl rounded-full"></div>

                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_#0f172a]">
                                            <Users className="text-slate-800" size={20} />
                                        </div>
                                        <h3 className="font-heading font-black text-white text-xl">Daftar User ({users.length})</h3>
                                    </div>

                                    {/* SEARCH BAR */}
                                    <div className="relative w-full sm:w-64 z-10">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Cari nama / username..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-white border-2 border-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-[2px_2px_0px_#0f172a]"
                                        />
                                    </div>
                                </div>
                                <div className="overflow-x-auto bg-white">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 border-b-4 border-slate-900">
                                            <tr>
                                                <th className="p-4 text-sm font-black text-slate-800 uppercase tracking-widest">User</th>
                                                <th className="p-4 text-sm font-black text-slate-800 uppercase tracking-widest hidden md:table-cell">Username</th>
                                                <th className="p-4 text-sm font-black text-slate-800 uppercase tracking-widest">Role</th>
                                                <th className="p-4 text-sm font-black text-slate-800 uppercase tracking-widest">Invited By</th>
                                                <th className="p-4 text-sm font-black text-slate-800 uppercase tracking-widest">Verifikasi</th>
                                                <th className="p-4 text-sm font-black text-slate-800 uppercase tracking-widest hidden md:table-cell">Status</th>
                                                <th className="p-4 text-sm font-black text-slate-800 uppercase tracking-widest hidden lg:table-cell">Package</th>
                                                <th className="p-4 text-sm font-black text-slate-800 uppercase tracking-widest hidden lg:table-cell">Subscription</th>
                                                <th className="p-4 text-sm font-black text-slate-800 uppercase tracking-widest text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-2 divide-slate-100">
                                            {loading ? (
                                                <tr><td colSpan={7} className="p-8 text-center text-slate-400"><div className="flex justify-center items-center gap-2"><Loader2 className="animate-spin" size={20} /> Memuat data...</div></td></tr>
                                            ) : users.length === 0 ? (
                                                <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-bold">Tidak ada user.</td></tr>
                                            ) : (
                                                users
                                                    .filter(u =>
                                                        (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        u.username.toLowerCase().includes(searchQuery.toLowerCase())
                                                    )
                                                    .map(user => {
                                                        const subStatus = getSubscriptionStatus(user);
                                                        return (
                                                            <tr key={user.id} className="hover:bg-violet-50/50 transition-colors cursor-pointer" onClick={() => openDetail(user)}>
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="relative shrink-0">
                                                                            <img src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name || 'U')}`}
                                                                                className="w-10 h-10 rounded-xl border-2 border-slate-900 object-cover bg-card shadow-sm" alt="Avatar" />
                                                                            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${user.online_status === 'online' ? 'bg-emerald-500' : user.online_status === 'idle' ? 'bg-amber-400' : 'bg-slate-300'}`} title={user.online_status === 'online' ? 'Online' : user.online_status === 'idle' ? 'Idle' : 'Offline'} />
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-bold text-slate-800 block text-sm">{user.full_name || 'No Name'}</span>
                                                                            {user.email && <span className="text-[11px] text-slate-400">{user.email}</span>}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 font-mono text-sm text-slate-600">@{user.username}</td>
                                                                <td className="p-4">
                                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${user.role === 'Developer' ? 'bg-slate-800 text-white border-slate-900' :
                                                                        user.role === 'Admin' || user.role === 'Owner' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                                            'bg-slate-100 text-slate-600 border-slate-200'
                                                                        }`}>{user.role}</span>
                                                                </td>
                                                                <td className="p-4">
                                                                    {user.invited_by ? (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-bold text-slate-700">{user.invited_by}</span>
                                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Admin Invited</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs font-bold text-slate-400">Self Register</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-4">
                                                                    {user.role === 'Developer' ? (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-slate-800 text-white border-slate-900">
                                                                            <ShieldCheck size={11} /> Dev
                                                                        </span>
                                                                    ) : user.is_verified ? (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-emerald-100 text-emerald-800 border-emerald-300">
                                                                            <ShieldCheck size={11} /> Verified
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-amber-100 text-amber-800 border-amber-300">
                                                                            <ShieldX size={11} /> Pending
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="p-4">
                                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${subStatus.color}`}>
                                                                        {subStatus.active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                                                                        {subStatus.label}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4 hidden lg:table-cell">
                                                                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                                                                        {user.subscription_package || 'Free'}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4 text-xs text-slate-500 hidden lg:table-cell">
                                                                    {user.subscription_end
                                                                        ? `s/d ${new Date(user.subscription_end).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                                                        : <span className="text-slate-400">Unlimited</span>
                                                                    }
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id, user.username); }}
                                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title="Hapus User" disabled={user.username === 'arunika'}>
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ====== DETAIL MODAL ====== */}
                    <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Detail Akses">
                        {selectedUser && (() => {
                            const subStatus = getSubscriptionStatus(selectedUser);
                            return (
                                <div className="space-y-6">
                                    {/* User Header */}
                                    <div className="flex items-start gap-4 p-4 border-2 border-border rounded-2xl bg-muted relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl"></div>
                                        <img src={selectedUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedUser.full_name || 'U')}`}
                                            className="w-20 h-20 rounded-xl border-2 border-border shadow-sm object-cover relative z-10 bg-card" alt="Avatar" />
                                        <div className="relative z-10">
                                            <h3 className="text-xl font-heading font-black text-foreground">{selectedUser.full_name}</h3>
                                            <p className="text-sm font-bold text-mutedForeground flex items-center gap-2">
                                                @{selectedUser.username}
                                                <span className="text-slate-300">•</span>
                                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${selectedUser.online_status === 'online' ? 'text-emerald-500' : selectedUser.online_status === 'idle' ? 'text-amber-500' : 'text-slate-400'}`}>
                                                    <div className={`w-2 h-2 rounded-full ${selectedUser.online_status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : selectedUser.online_status === 'idle' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                                                    {selectedUser.online_status === 'online' ? 'Online' : selectedUser.online_status === 'idle' ? 'Idle' : 'Offline'}
                                                </span>
                                            </p>
                                            {selectedUser.last_activity_at && selectedUser.online_status !== 'online' && (
                                                <p className="text-[10px] font-bold text-slate-400 mt-1">
                                                    Terakhir aktif: {new Date(selectedUser.last_activity_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            )}
                                            {/* Role Selector */}
                                            <div className="mt-2 flex items-center gap-2">
                                                {(isDeveloper || isAdmin) && selectedUser.username !== 'arunika' ? (
                                                    <select
                                                        value={selectedUser.role}
                                                        onChange={e => handleChangeRole(selectedUser.id, e.target.value)}
                                                        className="bg-card border-2 border-border rounded-lg px-3 py-1 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer shadow-sm appearance-none"
                                                    >
                                                        <option value="Member">Member</option>
                                                        <option value="Admin">Admin</option>
                                                        {isDeveloper && <option value="Developer">Developer</option>}
                                                    </select>
                                                ) : (
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border-2 shadow-[2px_2px_0px_#0f172a] ${selectedUser.role === 'Developer' ? 'bg-slate-900 text-white border-slate-900' :
                                                        selectedUser.role === 'Admin' || selectedUser.role === 'Owner' ? 'bg-accent text-white border-slate-900' :
                                                            'bg-card text-foreground border-border'
                                                        }`}>
                                                        {selectedUser.role}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-auto relative z-10">
                                            {isDeveloper && (
                                                <button onClick={() => handleDeleteUser(selectedUser.id, selectedUser.username)}
                                                    className="p-3 bg-card text-foreground hover:bg-red-500 hover:text-white rounded-xl transition-colors border-2 border-border shadow-sm hover:border-red-500"
                                                    disabled={selectedUser.username === 'arunika'} title="Hapus User">
                                                    <Trash2 size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Detail Pendaftaran */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-card rounded-2xl border-2 border-border shadow-sm p-3">
                                            <p className="text-[10px] font-black text-mutedForeground uppercase tracking-widest mb-1">Metode Daftar</p>
                                            <div className="flex items-center gap-2">
                                                {selectedUser.invited_by ? (
                                                    <>
                                                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                                                        <span className="text-sm font-black text-foreground">Admin Invited</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                        <span className="text-sm font-black text-foreground">Self Register</span>
                                                    </>
                                                )}
                                            </div>
                                            {selectedUser.invited_by && (
                                                <p className="text-xs font-bold text-mutedForeground mt-1">Oleh: {selectedUser.invited_by}</p>
                                            )}
                                        </div>
                                        <div className="bg-card rounded-2xl border-2 border-border shadow-sm p-3 text-right">
                                            <p className="text-[10px] font-black text-mutedForeground uppercase tracking-widest mb-1">Terdaftar Pada</p>
                                            <p className="text-sm font-black text-foreground">
                                                {new Date(selectedUser.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                            <p className="text-xs font-bold text-mutedForeground">
                                                {new Date(selectedUser.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                            </p>
                                        </div>
                                    </div>

                                    {/* Verification Section - Developer Only */}
                                    {isDeveloper && selectedUser.role !== 'Developer' && (
                                        <div>
                                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                                                <ShieldCheck size={16} /> Verifikasi Akun
                                            </h4>
                                            <div className={`bg-white rounded-2xl border-2 shadow-[4px_4px_0px_#0f172a] p-4 space-y-4 ${selectedUser.is_verified ? 'border-emerald-500' : 'border-amber-500'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center ${selectedUser.is_verified ? 'bg-emerald-300' : 'bg-amber-300'}`}>
                                                        {selectedUser.is_verified ? <ShieldCheck className="text-slate-900" size={24} /> : <AlertTriangle className="text-slate-900" size={24} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">
                                                            {selectedUser.is_verified ? 'Akun Terverifikasi ✓' : 'Belum Diverifikasi'}
                                                        </p>
                                                        <p className="text-xs font-bold text-slate-500">
                                                            Kode Langganan: <code className="bg-slate-100 px-2 py-0.5 rounded font-mono text-xs">{selectedUser.subscription_code || '(tidak ada)'}</code>
                                                        </p>
                                                    </div>
                                                </div>

                                                {!selectedUser.is_verified && (
                                                    <div className="space-y-3 pt-2 border-t-2 border-dashed border-slate-200">
                                                        <p className="text-[10px] font-bold text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                                            ⚠️ Masukkan kode verifikasi yang cocok dengan kode langganan user untuk memverifikasi akun ini. Kode harus sama persis.
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={verifyCodeInput}
                                                                onChange={(e) => setVerifyCodeInput(e.target.value.toUpperCase())}
                                                                className="flex-1 bg-white border-2 border-slate-900 rounded-xl px-4 py-2.5 text-sm font-black text-slate-900 tracking-widest text-center uppercase placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-[2px_2px_0px_#0f172a]"
                                                                placeholder="MASUKKAN KODE"
                                                            />
                                                            <button
                                                                onClick={() => handleVerifyUser(selectedUser)}
                                                                disabled={!verifyCodeInput.trim() || verifyCodeInput.trim().toUpperCase() !== (selectedUser.subscription_code || '').trim().toUpperCase()}
                                                                className={`px-5 py-2.5 rounded-xl font-black text-sm border-2 border-slate-900 transition-all flex items-center gap-2 ${verifyCodeInput.trim() && verifyCodeInput.trim().toUpperCase() === (selectedUser.subscription_code || '').trim().toUpperCase()
                                                                    ? 'bg-emerald-400 text-slate-900 shadow-[2px_2px_0px_#0f172a] hover:shadow-[4px_4px_0px_#0f172a] hover:-translate-y-0.5'
                                                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                                                                    }`}
                                                            >
                                                                <ShieldCheck size={16} /> Verifikasi
                                                            </button>
                                                        </div>
                                                        {verifyCodeInput.trim() && verifyCodeInput.trim().toUpperCase() !== (selectedUser.subscription_code || '').trim().toUpperCase() && (
                                                            <p className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                                                                <XCircle size={12} /> Kode tidak cocok dengan kode langganan user
                                                            </p>
                                                        )}
                                                        {verifyCodeInput.trim() && verifyCodeInput.trim().toUpperCase() === (selectedUser.subscription_code || '').trim().toUpperCase() && (
                                                            <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                                                <CheckCircle size={12} /> Kode cocok! Klik tombol Verifikasi untuk mengonfirmasi.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {selectedUser.is_verified && (
                                                    <div className="pt-2 border-t-2 border-dashed border-slate-200">
                                                        <button
                                                            onClick={() => handleUnverifyUser(selectedUser)}
                                                            className="text-xs font-bold text-red-500 hover:text-red-600 underline"
                                                        >
                                                            Cabut Verifikasi
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Keanggotaan Workspace */}
                                    <div>
                                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                                            <Layers size={16} /> Keanggotaan Workspace
                                        </h4>
                                        <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-4">
                                            {(() => {
                                                // Filter workspaces where selectedUser is actually a member
                                                const userWs = workspaces.filter(ws => {
                                                    const members = ws.members || [];
                                                    return members.some(m =>
                                                        m === selectedUser.id ||
                                                        m === selectedUser.username ||
                                                        m === selectedUser.avatar_url
                                                    );
                                                });

                                                if (userWs.length === 0) {
                                                    return <p className="text-sm text-slate-500 font-bold p-2">Belum ada workspace.</p>;
                                                }

                                                return (
                                                    <div className="space-y-3">
                                                        {userWs.map(ws => (
                                                            <div key={ws.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border-2 border-slate-900">
                                                                <Globe className="text-slate-400 shrink-0" size={16} />
                                                                <div className="flex-1 min-w-0">
                                                                    <span className="text-sm font-bold text-slate-900 line-clamp-1">{ws.name}</span>
                                                                </div>
                                                                <span className="px-2.5 py-1 text-xs font-bold bg-accent text-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] rounded shrink-0">Member</span>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!confirm(`Hapus ${selectedUser.username || selectedUser.full_name} dari workspace "${ws.name}"? Tindakan ini akan langsung menghapus keanggotaan.`)) return;
                                                                        try {
                                                                            const currentMembers: string[] = ws.members || [];
                                                                            const updatedMembers = currentMembers.filter(m =>
                                                                                m !== selectedUser.id &&
                                                                                m !== selectedUser.username &&
                                                                                m !== selectedUser.avatar_url
                                                                            );
                                                                            const { error } = await supabase
                                                                                .from('workspaces')
                                                                                .update({ members: updatedMembers })
                                                                                .eq('id', ws.id);
                                                                            if (error) throw error;
                                                                            alert(`Berhasil menghapus ${selectedUser.username || selectedUser.full_name} dari workspace "${ws.name}".`);
                                                                            fetchWorkspaces();
                                                                        } catch (err) {
                                                                            console.error(err);
                                                                            alert('Gagal menghapus user dari workspace.');
                                                                        }
                                                                    }}
                                                                    className="p-1.5 bg-red-100 border-2 border-red-300 rounded-lg text-red-500 hover:bg-red-500 hover:text-white hover:border-red-600 transition-all shrink-0"
                                                                    title="Hapus dari workspace"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Status Akun - Developer Only */}
                                    {isDeveloper && (
                                        <div>
                                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                                                <Power size={16} /> Status Akun
                                            </h4>
                                            <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center ${selectedUser.is_active !== false ? 'bg-emerald-300' : 'bg-red-300'}`}>
                                                        {selectedUser.is_active !== false ? <CheckCircle className="text-slate-900" size={24} /> : <XCircle className="text-slate-900" size={24} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">
                                                            {selectedUser.is_active !== false ? 'User Dapat Login' : 'Akun Dinonaktifkan'}
                                                        </p>
                                                        <p className="text-xs font-bold text-slate-500">
                                                            {subStatus.label}
                                                        </p>
                                                    </div>
                                                </div>
                                                {/* Toggle */}
                                                <button
                                                    onClick={() => handleToggleActive(selectedUser)}
                                                    className={`relative w-16 h-8 rounded-full border-2 border-slate-900 transition-colors duration-200 shadow-inner ${selectedUser.is_active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-6 h-6 bg-white border-2 border-slate-900 rounded-full shadow-[1px_1px_0px_#0f172a] transition-transform duration-200 ${selectedUser.is_active !== false ? 'translate-x-8' : 'translate-x-0.5'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Subscription Period - Developer Only */}
                                    {isDeveloper && (
                                        <div>
                                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                                                <Calendar size={16} /> Periode Subscription
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] p-3 text-center">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mulai</p>
                                                    <p className="text-sm font-black text-slate-900">
                                                        {selectedUser.subscription_start
                                                            ? new Date(selectedUser.subscription_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                                            : '-'}
                                                    </p>
                                                </div>
                                                <div className="bg-white rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] p-3 relative hover:shadow-[4px_4px_0px_#0f172a] transition-all">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 text-center">Berakhir</p>
                                                    <input
                                                        type="datetime-local"
                                                        value={formatForDatetimeLocal(selectedUser.subscription_end)}
                                                        onChange={e => {
                                                            const isoString = e.target.value ? new Date(e.target.value).toISOString() : '';
                                                            handleUpdateSubscriptionEnd(selectedUser.id, isoString);
                                                        }}
                                                        className="w-full text-sm font-black text-slate-900 bg-transparent text-center focus:outline-none cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 mt-2 text-center">Kosongkan tanggal berakhir untuk akses unlimited.</p>
                                        </div>
                                    )}

                                    {/* Subscription Package - Developer Only */}
                                    {isDeveloper && (
                                        <div>
                                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                                                <Layers size={16} /> Subscription Package
                                            </h4>
                                            <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] p-4">
                                                <select
                                                    value={selectedUser.subscription_package || 'Free'}
                                                    onChange={e => handleUpdateSubscriptionPackage(selectedUser.id, e.target.value)}
                                                    className="w-full bg-white border-2 border-slate-900 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent md:hover:shadow-[2px_2px_0px_#0f172a] focus:shadow-[2px_2px_0px_#0f172a] transition-all"
                                                >
                                                    <option value="Free">Free</option>
                                                    {availablePackages.map(pkg => (
                                                        <option key={pkg.id} value={pkg.name}>{pkg.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Password User - Developer Only */}
                                    {isDeveloper && (
                                        <div>
                                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                                                <Key size={16} /> Password User
                                            </h4>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 bg-white rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] px-4 py-3 flex items-center justify-between">
                                                    <span className="text-sm font-mono font-bold text-slate-900">
                                                        {showDetailPassword ? selectedUser.password : '••••••••'}
                                                    </span>
                                                    <button onClick={() => setShowDetailPassword(!showDetailPassword)} className="text-slate-500 hover:text-slate-900 ml-2">
                                                        {showDetailPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                                <button onClick={() => copyToClipboard(selectedUser.password)}
                                                    className="p-3 bg-white border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_#0f172a] text-slate-900 hover:bg-accent hover:text-white hover:shadow-[4px_4px_0px_#0f172a] transition-all" title="Copy password">
                                                    <Copy size={20} />
                                                </button>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Hanya password yang dibuat oleh Admin via Team Space yang terlihat.</p>
                                        </div>
                                    )}

                                    {/* Beri Akses Workspace Lain */}
                                    <div>
                                        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                                            <Globe size={16} /> Beri Akses Workspace Lain
                                        </h4>
                                        <div className="flex items-center gap-3">
                                            <select
                                                value={selectedWorkspaceToAssign}
                                                onChange={(e) => setSelectedWorkspaceToAssign(e.target.value)}
                                                className="flex-1 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="">Pilih Workspace...</option>
                                                {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                                            </select>
                                            <button
                                                onClick={handleAddUserToWorkspace}
                                                className="p-3 bg-accent border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_#0f172a] text-white hover:shadow-[4px_4px_0px_#0f172a] transition-all"
                                            >
                                                <UserPlus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </Modal>

                    {/* Modal Dash 1: Growth & Top New */}
                    <Modal isOpen={isGrowthModalOpen} onClose={() => setIsGrowthModalOpen(false)} title="Analisa Pertumbuhan User" maxWidth="max-w-4xl">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white p-6 rounded-2xl border-4 border-slate-900 shadow-hard h-[350px]">
                                    <h4 className="font-heading font-black text-slate-900 uppercase italic mb-6">Kumulatif User Baru</h4>
                                    <ResponsiveContainer width="100%" height="80%">
                                        <AreaChart data={growthData}>
                                            <defs>
                                                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                            <ReTooltip
                                                contentStyle={{ borderRadius: '12px', border: '3px solid #0f172a', fontWeight: 'bold', boxShadow: '4px 4px 0px #0f172a' }}
                                            />
                                            <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={4} fillOpacity={1} fill="url(#growthGrad)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-heading font-black text-slate-900 uppercase italic mb-4 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-accent" /> 5 User Terbaru
                                </h4>
                                <div className="space-y-3">
                                    {newestUsers.map(u => (
                                        <div key={u.id} className="bg-white p-3 rounded-xl border-2 border-slate-900 shadow-hard-mini flex items-center gap-3">
                                            <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.full_name || 'U')}`}
                                                className="w-10 h-10 rounded-lg border-2 border-slate-900" alt="" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-slate-900 line-clamp-1 uppercase tracking-tight">{u.full_name}</p>
                                                <p className="text-[10px] font-bold text-slate-400">Join: {new Date(u.created_at).toLocaleDateString('id-ID')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Modal>

                    {/* Modal Dash 2: Expiring Users */}
                    <Modal isOpen={isExpiringModalOpen} onClose={() => setIsExpiringModalOpen(false)} title="Prioritas Retention (Tenggang)" maxWidth="max-w-2xl">
                        <div className="space-y-4">
                            <p className="text-sm font-bold text-slate-500 mb-2">User yang masa berlangganannya akan habis dalam &lt; 5 hari.</p>
                            {expiringUsers.length === 0 ? (
                                <div className="bg-slate-50 p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                                    <CheckCircle className="mx-auto text-emerald-400 mb-2" size={32} />
                                    <p className="font-bold text-slate-400">Semua aman. Tidak ada user di masa tenggang.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {expiringUsers.map(u => {
                                        const status = getSubscriptionStatus(u);
                                        return (
                                            <div
                                                key={u.id}
                                                onClick={() => { setSelectedUser(u); setIsDetailOpen(true); setIsExpiringModalOpen(false); }}
                                                className="bg-white p-4 rounded-xl border-2 border-slate-900 shadow-hard-mini hover:translate-x-1 transition-all cursor-pointer flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.full_name || 'U')}`}
                                                        className="w-10 h-10 rounded-lg border-2 border-slate-900" alt="" />
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm italic">{u.full_name}</p>
                                                        <p className="text-xs font-bold text-slate-400">@{u.username}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(u.subscription_end!).toLocaleDateString('id-ID')}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </Modal>

                    {/* Modal Dash 3: Admin Overview */}
                    <Modal isOpen={isAdminStatsModalOpen} onClose={() => setIsAdminStatsModalOpen(false)} title="Struktur Admin & Team" maxWidth="max-w-3xl">
                        <div className="space-y-4">
                            <div className="bg-purple-600 p-4 rounded-xl border-4 border-slate-900 shadow-hard text-white flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck size={32} />
                                    <div>
                                        <h4 className="font-black text-lg leading-none">Admin Monitoring</h4>
                                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1">Invitation performance tracking</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-3xl font-black">{admins.length}</span>
                                    <p className="text-[10px] uppercase font-bold text-white/50 leading-none">Total Admins</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {adminTeamStats.map(admin => (
                                    <div key={admin.id} className="bg-white p-4 rounded-2xl border-4 border-slate-900 shadow-hard relative group overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-full -mr-10 -mt-10 group-hover:bg-purple-50 transition-colors"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-3 mb-4">
                                                <img src={admin.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(admin.full_name || 'U')}`}
                                                    className="w-12 h-12 rounded-xl border-2 border-slate-900" alt="" />
                                                <div>
                                                    <h5 className="font-black text-slate-900 uppercase italic tracking-tight">{admin.full_name}</h5>
                                                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full font-bold text-slate-500 uppercase">{admin.subscription_package || 'Free'}</span>
                                                </div>
                                            </div>
                                            <div
                                                onClick={() => { setViewingAdminTeam(admin); setIsAdminTeamModalOpen(true); }}
                                                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border-2 border-slate-900 cursor-pointer hover:bg-purple-50 transition-colors group/team"
                                            >
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Team Members</p>
                                                    <p className="text-2xl font-black text-slate-900">{admin.teamCount}</p>
                                                </div>
                                                <div className="w-10 h-10 bg-white rounded-lg border-2 border-slate-900 flex items-center justify-center group-hover/team:scale-110 transition-transform">
                                                    <UserCheck className="text-emerald-500" size={20} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-3">
                                                <Button
                                                    onClick={() => { setViewingAdminTeam(admin); setIsAdminTeamModalOpen(true); }}
                                                    variant="secondary" size="sm" className="h-9 text-[10px] font-black uppercase tracking-widest border-2 border-slate-900 shadow-hard-mini"
                                                >
                                                    List Team
                                                </Button>
                                                <Button
                                                    onClick={() => { setSelectedUser(admin); setIsDetailOpen(true); setIsAdminStatsModalOpen(false); }}
                                                    variant="secondary" size="sm" className="h-9 text-[10px] font-black uppercase tracking-widest border-2 border-slate-900 shadow-hard-mini"
                                                >
                                                    Full Info
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Modal>

                    {/* Modal Dash 3.5: Admin Team List */}
                    <Modal
                        isOpen={isAdminTeamModalOpen}
                        onClose={() => setIsAdminTeamModalOpen(false)}
                        title={`Tim ${viewingAdminTeam?.full_name || ''}`}
                        maxWidth="max-w-2xl"
                    >
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-900 mb-6">
                                <img
                                    src={viewingAdminTeam?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(viewingAdminTeam?.full_name || 'U')}`}
                                    className="w-14 h-14 rounded-xl border-2 border-slate-900"
                                    alt=""
                                />
                                <div>
                                    <h4 className="font-heading font-black text-xl text-slate-900 uppercase italic">Head of Team</h4>
                                    <p className="text-sm font-bold text-slate-500">@{viewingAdminTeam?.username} &bull; {viewingAdminTeam?.subscription_package || 'No Package'}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Member Terdaftar ({users.filter(u => u.invited_by === viewingAdminTeam?.username).length})</h5>
                                {users.filter(u => u.invited_by === viewingAdminTeam?.username).length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        <Users size={32} className="mx-auto text-slate-300 mb-2" />
                                        <p className="font-bold text-slate-400">Belum ada user yang diundang.</p>
                                    </div>
                                ) : (
                                    users.filter(u => u.invited_by === viewingAdminTeam?.username).map(member => {
                                        const status = getSubscriptionStatus(member);
                                        return (
                                            <div
                                                key={member.id}
                                                className="bg-white p-4 rounded-xl border-2 border-slate-900 shadow-hard-mini flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.full_name || 'M')}`}
                                                        className="w-10 h-10 rounded-lg border-2 border-slate-900"
                                                        alt=""
                                                    />
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm leading-none mb-1">{member.full_name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">@{member.username} &bull; Joined {new Date(member.created_at).toLocaleDateString('id-ID')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(member);
                                                            setIsDetailOpen(true);
                                                            setIsAdminTeamModalOpen(false);
                                                            setIsAdminStatsModalOpen(false);
                                                        }}
                                                        className="text-[9px] font-bold text-accent hover:underline"
                                                    >
                                                        Lihat Detail
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <Button
                                onClick={() => setIsAdminTeamModalOpen(false)}
                                className="w-full mt-6 bg-slate-900 text-white font-black uppercase tracking-widest py-4 border-b-4 border-slate-700 active:border-b-0 hover:translate-y-0.5 transition-all"
                            >
                                Tutup
                            </Button>
                        </div>
                    </Modal>

                    {/* Modal Dash 4: Inactive Accounts */}
                    <Modal isOpen={isInactiveModalOpen} onClose={() => setIsInactiveModalOpen(false)} title="Audit Akun Non-Aktif" maxWidth="max-w-2xl">
                        <div className="space-y-4">
                            <div className="bg-red-50 p-4 rounded-xl border-2 border-red-200 flex items-center gap-3 mb-4">
                                <AlertTriangle className="text-red-500 shrink-0" size={20} />
                                <p className="text-xs font-bold text-red-700">Akun berikut dalam status non-aktif atau masa langganan telah berakhir. User tidak dapat mengakses dashboard utama.</p>
                            </div>

                            <div className="grid gap-3">
                                {inactiveUsers.length === 0 ? (
                                    <div className="text-center py-10">
                                        <Activity size={40} className="text-emerald-400 mx-auto mb-2" />
                                        <p className="font-black text-slate-900">Sistem Bersih!</p>
                                        <p className="text-xs font-bold text-slate-400">Tidak ada akun non-aktif yang terdeteksi.</p>
                                    </div>
                                ) : (
                                    inactiveUsers.map(u => (
                                        <div key={u.id} className="bg-white p-4 rounded-2xl border-4 border-slate-900 shadow-hard-mini flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.full_name || 'U')}`}
                                                        className="w-12 h-12 rounded-xl border-2 border-slate-900 grayscale" alt="" />
                                                    <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 border-2 border-white shadow-sm">
                                                        <Power size={8} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm uppercase italic">{u.full_name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${!u.is_active ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                                                            {!u.is_active ? 'Banned' : 'Expired'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400">@{u.username}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleToggleActive(u)}
                                                    className="px-4 py-2 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                                                >
                                                    Aktifkan
                                                </button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => { setSelectedUser(u); setIsDetailOpen(true); setIsInactiveModalOpen(false); }}
                                                    className="h-9 px-3 border-2 border-slate-900 shadow-hard-mini"
                                                >
                                                    Detail
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </Modal>
                </>
            )}
        </div>
    );
};