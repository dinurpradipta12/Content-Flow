import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../services/supabaseClient';
import {
    Users, Trash2, RefreshCw, Loader2, Shield, UserPlus, Hash, Mail, Key, Globe,
    Eye, EyeOff, Copy, Power, Calendar, Clock, CheckCircle, XCircle, Layers
} from 'lucide-react';

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

interface Workspace {
    id: string;
    name: string;
}

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Detail modal
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [showDetailPassword, setShowDetailPassword] = useState(false);

    // Registration form
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        username: '',
        password: '',
        workspace_id: '',
        subscription_end: '',
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

    const fetchWorkspaces = async () => {
        try {
            const { data } = await supabase.from('workspaces').select('id, name').order('name');
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
            const today = new Date().toISOString().split('T')[0];

            const insertData: any = {
                full_name: form.full_name,
                email: form.email,
                username: form.username,
                password: form.password,
                role: 'Member',
                avatar_url: avatarUrl,
                is_active: true,
                subscription_start: today,
            };
            if (form.subscription_end) {
                insertData.subscription_end = form.subscription_end;
            }

            const { error } = await supabase.from('app_users').insert([insertData]);
            if (error) throw error;

            setFormSuccess(`User "${form.username}" berhasil didaftarkan!`);
            setForm({ full_name: '', email: '', username: '', password: '', workspace_id: '', subscription_end: '' });
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
        const newStatus = !user.is_active;
        try {
            const updateData: any = { is_active: newStatus };
            // If reactivating and subscription was expired, extend it
            if (newStatus && user.subscription_end) {
                const endDate = new Date(user.subscription_end);
                const today = new Date();
                if (today > endDate) {
                    // Extend by 30 days from today
                    const newEnd = new Date();
                    newEnd.setDate(newEnd.getDate() + 30);
                    updateData.subscription_end = newEnd.toISOString().split('T')[0];
                    updateData.subscription_start = today.toISOString().split('T')[0];
                }
            }
            await supabase.from('app_users').update(updateData).eq('id', user.id);
            fetchUsers();
            // Update selected user inline
            if (selectedUser?.id === user.id) {
                setSelectedUser({ ...user, ...updateData });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateSubscriptionEnd = async (userId: string, newEnd: string) => {
        try {
            await supabase.from('app_users').update({ subscription_end: newEnd || null }).eq('id', userId);
            fetchUsers();
            if (selectedUser?.id === userId) {
                setSelectedUser(prev => prev ? { ...prev, subscription_end: newEnd || null } : null);
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

    const getSubscriptionStatus = (user: AppUser) => {
        if (!user.is_active) return { label: 'Nonaktif', color: 'bg-red-100 text-red-700 border-red-200', active: false };
        if (!user.subscription_end) return { label: 'Aktif (Unlimited)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', active: true };
        const end = new Date(user.subscription_end);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        if (today > end) return { label: 'Expired', color: 'bg-red-100 text-red-700 border-red-200', active: false };
        const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 7) return { label: `${daysLeft} hari lagi`, color: 'bg-amber-100 text-amber-700 border-amber-200', active: true };
        return { label: 'Aktif', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', active: true };
    };

    useEffect(() => {
        fetchUsers();
        fetchWorkspaces();
    }, []);

    // Keep selectedUser in sync with users array
    useEffect(() => {
        if (selectedUser) {
            const updated = users.find(u => u.id === selectedUser.id);
            if (updated) setSelectedUser(updated);
        }
    }, [users]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="text-violet-500" size={26} />
                        User Management
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Kelola pengguna aplikasi (Developer Access Only).</p>
                </div>
                <Button onClick={fetchUsers} variant="secondary" icon={<RefreshCw size={18} />}>
                    Refresh
                </Button>
            </div>

            {/* Main: Form + Table side-by-side */}
            <div className="flex flex-col lg:flex-row gap-6">

                {/* ===== REGISTRATION FORM ===== */}
                <div className="w-full lg:w-[380px] shrink-0">
                    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden sticky top-6">
                        <div className="p-5 pb-4 border-b border-slate-100">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 border-2 border-slate-200">
                                <UserPlus className="text-slate-600" size={22} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Undang Anggota</h3>
                        </div>

                        <form onSubmit={handleRegister} className="p-5 space-y-4">
                            {/* Nama */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 tracking-wide">Nama Anggota</label>
                                <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:bg-white transition-all"
                                    placeholder="Nama Lengkap" />
                            </div>
                            {/* Email */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 tracking-wide">Email Pribadi Anggota</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:bg-white transition-all"
                                        placeholder="user@gmail.com" />
                                </div>
                            </div>
                            {/* Username */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 tracking-wide">Username Unik</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:bg-white transition-all"
                                        placeholder="contoh: andi_dev" />
                                </div>
                            </div>
                            {/* Password */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 tracking-wide">Password Sementara</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:bg-white transition-all"
                                        placeholder="Min. 6 Karakter" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            {/* Target Workspace */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 tracking-wide">Target Workspace</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select value={form.workspace_id} onChange={e => setForm(f => ({ ...f, workspace_id: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-violet-400 focus:bg-white transition-all appearance-none cursor-pointer">
                                        <option value="">Pilih workspace (opsional)</option>
                                        {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            {/* Subscription Period */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 tracking-wide">Subscription Berakhir</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input type="date" value={form.subscription_end} onChange={e => setForm(f => ({ ...f, subscription_end: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-violet-400 focus:bg-white transition-all" />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Kosongkan untuk akses unlimited. Subscription aktif otomatis sejak hari ini.</p>
                            </div>

                            {formError && <div className="bg-red-50 text-red-600 text-xs font-medium px-3 py-2 rounded-lg border border-red-200">{formError}</div>}
                            {formSuccess && <div className="bg-emerald-50 text-emerald-600 text-xs font-medium px-3 py-2 rounded-lg border border-emerald-200">{formSuccess}</div>}

                            <button type="submit" disabled={registering}
                                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-violet-200 border-2 border-violet-700 flex items-center justify-center gap-2 text-sm">
                                {registering ? <><Loader2 className="animate-spin" size={16} /> Mendaftarkan...</> : 'Daftarkan User'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ===== USER TABLE ===== */}
                <div className="flex-1 min-w-0">
                    <Card className="overflow-hidden p-0">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <Users className="text-slate-400" size={18} />
                                <h3 className="font-bold text-slate-700 text-sm">Daftar User ({users.length})</h3>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b-2 border-slate-100">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-slate-500">User</th>
                                        <th className="p-4 text-xs font-bold text-slate-500">Username</th>
                                        <th className="p-4 text-xs font-bold text-slate-500">Role</th>
                                        <th className="p-4 text-xs font-bold text-slate-500">Status</th>
                                        <th className="p-4 text-xs font-bold text-slate-500">Subscription</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-400"><div className="flex justify-center items-center gap-2"><Loader2 className="animate-spin" size={20} /> Memuat data...</div></td></tr>
                                    ) : users.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-bold">Tidak ada user.</td></tr>
                                    ) : (
                                        users.map(user => {
                                            const subStatus = getSubscriptionStatus(user);
                                            return (
                                                <tr key={user.id} className="hover:bg-violet-50/50 transition-colors cursor-pointer" onClick={() => openDetail(user)}>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <img src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name || 'U')}`}
                                                                    className="w-10 h-10 rounded-full border border-slate-200 bg-slate-200 object-cover" alt="Avatar" />
                                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${user.is_active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`} />
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
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${subStatus.color}`}>
                                                            {subStatus.active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                                                            {subStatus.label}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-xs text-slate-500">
                                                        {user.subscription_end
                                                            ? `s/d ${new Date(user.subscription_end).toLocaleDateString('id-ID')}`
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
                    </Card>
                </div>
            </div>

            {/* ====== DETAIL MODAL ====== */}
            <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Detail Akses">
                {selectedUser && (() => {
                    const subStatus = getSubscriptionStatus(selectedUser);
                    return (
                        <div className="space-y-6">
                            {/* User Header */}
                            <div className="flex items-center gap-4">
                                <img src={selectedUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedUser.full_name || 'U')}`}
                                    className="w-20 h-20 rounded-2xl border-2 border-slate-200 object-cover" alt="Avatar" />
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{selectedUser.full_name}</h3>
                                    <p className="text-sm text-slate-500">@{selectedUser.username}</p>
                                    <span className={`inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full text-xs font-bold border ${selectedUser.role === 'Developer' ? 'bg-slate-800 text-white border-slate-900' :
                                            selectedUser.role === 'Admin' || selectedUser.role === 'Owner' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                        <Users size={12} /> {selectedUser.role}
                                    </span>
                                </div>
                                <div className="ml-auto">
                                    <button onClick={() => handleDeleteUser(selectedUser.id, selectedUser.username)}
                                        className="p-2.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors border border-transparent hover:border-red-200"
                                        disabled={selectedUser.username === 'arunika'} title="Hapus User">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Keanggotaan Workspace */}
                            <div>
                                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2">
                                    <Layers size={14} /> Keanggotaan Workspace
                                </h4>
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                    {workspaces.length > 0 ? (
                                        <div className="space-y-2">
                                            {workspaces.slice(0, 3).map(ws => (
                                                <div key={ws.id} className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-sm font-medium text-slate-700">{ws.name}</span>
                                                        <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-600 rounded">Member</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400">Belum ada workspace.</p>
                                    )}
                                </div>
                            </div>

                            {/* Status Akun */}
                            <div>
                                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2">
                                    <Power size={14} /> Status Akun
                                </h4>
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedUser.is_active !== false ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                            {selectedUser.is_active !== false ? <CheckCircle className="text-emerald-600" size={20} /> : <XCircle className="text-red-500" size={20} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">
                                                {selectedUser.is_active !== false ? 'User dapat login' : 'Akun dinonaktifkan'}
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                {subStatus.label}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Toggle */}
                                    <button
                                        onClick={() => handleToggleActive(selectedUser)}
                                        className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${selectedUser.is_active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${selectedUser.is_active !== false ? 'translate-x-7' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Subscription Period */}
                            <div>
                                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2">
                                    <Calendar size={14} /> Periode Subscription
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                                        <p className="text-[10px] text-slate-400 font-medium mb-1">Mulai</p>
                                        <p className="text-sm font-bold text-slate-700">
                                            {selectedUser.subscription_start
                                                ? new Date(selectedUser.subscription_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : '-'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                                        <p className="text-[10px] text-slate-400 font-medium mb-1">Berakhir</p>
                                        <input
                                            type="date"
                                            value={selectedUser.subscription_end || ''}
                                            onChange={e => handleUpdateSubscriptionEnd(selectedUser.id, e.target.value)}
                                            className="w-full text-sm font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1.5">Kosongkan tanggal berakhir untuk akses unlimited.</p>
                            </div>

                            {/* Password User */}
                            <div>
                                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2">
                                    <Key size={14} /> Password User
                                </h4>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between">
                                        <span className="text-sm font-mono text-slate-700">
                                            {showDetailPassword ? selectedUser.password : '••••••••'}
                                        </span>
                                        <button onClick={() => setShowDetailPassword(!showDetailPassword)} className="text-slate-400 hover:text-slate-600 ml-2">
                                            {showDetailPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <button onClick={() => copyToClipboard(selectedUser.password)}
                                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-violet-600 hover:border-violet-300 transition-colors" title="Copy password">
                                        <Copy size={16} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1.5 italic">Hanya password yang dibuat oleh Admin via Team Space yang terlihat disini.</p>
                            </div>

                            {/* Beri Akses Workspace Lain */}
                            <div>
                                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2">
                                    <Globe size={14} /> Beri Akses Workspace Lain
                                </h4>
                                <div className="flex items-center gap-2">
                                    <select className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-violet-400 transition-colors appearance-none cursor-pointer">
                                        <option value="">Pilih Workspace...</option>
                                        {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                                    </select>
                                    <button className="p-3 bg-violet-100 border border-violet-200 rounded-xl text-violet-600 hover:bg-violet-200 transition-colors">
                                        <UserPlus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
};