import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
    Inbox, CheckCircle, XCircle, ShieldCheck, Clock, Trash2,
    RefreshCw, Loader2, User, Key, Mail, Filter, Search, CreditCard, ExternalLink
} from 'lucide-react';

interface InboxMessage {
    id: string;
    sender_name: string;
    sender_email: string;
    sender_username: string;
    subscription_code: string;
    user_id: string;
    message: string;
    is_read: boolean;
    is_resolved: boolean;
    created_at: string;
    // New fields for Renewal
    type?: 'registration' | 'renewal';
    package_name?: string;
    amount?: number;
    proof_url?: string;
    duration_days?: number;
}

export const DeveloperInbox: React.FC = () => {
    const [messages, setMessages] = useState<InboxMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread' | 'resolved'>('all');
    const [typeFilter, setTypeFilter] = useState<'registration' | 'renewal'>('registration');
    const [search, setSearch] = useState('');
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('developer_inbox')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMessages(data || []);
        } catch (err) {
            console.error('Failed to fetch inbox:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();

        // Realtime subscription
        const channel = supabase.channel('developer_inbox_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'developer_inbox' },
                () => fetchMessages()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleMarkRead = async (msg: InboxMessage) => {
        if (msg.is_read) return;
        await supabase.from('developer_inbox').update({ is_read: true }).eq('id', msg.id);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    };

    const handleVerifyUser = async (msg: InboxMessage) => {
        setVerifyingId(msg.id);
        try {
            const { data: user, error: userErr } = await supabase
                .from('app_users')
                .select('id, subscription_code, full_name')
                .eq('id', msg.user_id)
                .single();

            if (userErr || !user) {
                alert('User tidak ditemukan di database.');
                return;
            }

            if ((user.subscription_code || '').toUpperCase() !== (msg.subscription_code || '').toUpperCase()) {
                alert(`Kode tidak cocok!\n\nKode yang dikirim: ${msg.subscription_code}\nKode di database: ${user.subscription_code || '(kosong)'}`);
                return;
            }

            const { error: updateErr } = await supabase
                .from('app_users')
                .update({
                    is_verified: true,
                    subscription_package: msg.package_name || 'Free'
                })
                .eq('id', msg.user_id);

            if (updateErr) throw updateErr;

            await supabase
                .from('developer_inbox')
                .update({ is_resolved: true, is_read: true })
                .eq('id', msg.id);

            alert(`✅ User "${msg.sender_name}" berhasil diverifikasi! Kode cocok.`);
            fetchMessages();
        } catch (err) {
            console.error(err);
            alert('Gagal memverifikasi user.');
        } finally {
            setVerifyingId(null);
        }
    };

    const handleVerifyRenewal = async (msg: InboxMessage) => {
        if (!confirm(`Konfirmasi perpanjangan untuk ${msg.sender_name}?`)) return;
        setVerifyingId(msg.id);
        try {
            // 1. Ambil data user saat ini
            const { data: user, error: userErr } = await supabase
                .from('app_users')
                .select('id, subscription_end, full_name')
                .eq('id', msg.user_id)
                .single();

            if (userErr || !user) {
                alert('User tidak ditemukan.');
                return;
            }

            // 2. Hitung tanggal baru
            const currentEnd = user.subscription_end ? new Date(user.subscription_end) : new Date();
            const now = new Date();

            // Jika sudah expired, mulai dari hari ini. Jika belum, tambahkan ke sisa hari.
            const baseDate = currentEnd > now ? currentEnd : now;
            const newExpiry = new Date(baseDate.getTime() + (msg.duration_days || 30) * 24 * 60 * 60 * 1000);

            // 3. Update User
            const { error: updateErr } = await supabase
                .from('app_users')
                .update({
                    subscription_end: newExpiry.toISOString(),
                    subscription_package: msg.package_name || 'Free',
                    is_active: true // Pastikan aktif kembali jika sebelumnya suspend
                })
                .eq('id', msg.user_id);

            if (updateErr) throw updateErr;

            // 4. Kirim Notifikasi Sukses ke User
            await supabase.from('notifications').insert([{
                recipient_id: msg.user_id,
                type: 'renewal_success',
                title: 'Subscription Diperpanjang!',
                content: `Pembayaran Anda untuk paket ${msg.package_name} telah diverifikasi. Masa aktif diperpanjang hingga ${newExpiry.toLocaleDateString('id-ID')}.`,
                metadata: { new_expiry: newExpiry.toISOString() }
            }]);

            // 5. Tandai Resolv
            await supabase
                .from('developer_inbox')
                .update({ is_resolved: true, is_read: true })
                .eq('id', msg.id);

            alert(`✅ Perpanjangan "${msg.sender_name}" berhasil! Expire baru: ${newExpiry.toLocaleDateString('id-ID')}`);
            fetchMessages();
        } catch (err) {
            console.error(err);
            alert('Gagal memverifikasi perpanjangan.');
        } finally {
            setVerifyingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus pesan ini?')) return;
        await supabase.from('developer_inbox').delete().eq('id', id);
        fetchMessages();
    };

    const filteredMessages = messages.filter(msg => {
        // Tab Filter (Registration vs Renewal)
        const msgType = msg.type || 'registration';
        if (msgType !== typeFilter) return false;

        // Status Filter
        if (filter === 'unread' && msg.is_read) return false;
        if (filter === 'resolved' && !msg.is_resolved) return false;

        // Search
        if (search) {
            const q = search.toLowerCase();
            return (
                msg.sender_name.toLowerCase().includes(q) ||
                msg.sender_email.toLowerCase().includes(q) ||
                (msg.subscription_code || '').toLowerCase().includes(q)
            );
        }
        return true;
    });

    const unreadCount = messages.filter(m => !m.is_read).length;
    const regCount = messages.filter(m => (m.type || 'registration') === 'registration').length;
    const renewalCount = messages.filter(m => m.type === 'renewal').length;

    return (
        <div className="space-y-6 flex-1">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center relative shadow-hard-mini">
                            <Inbox size={24} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        Developer Inbox
                    </h1>
                    <p className="text-slate-500 font-bold text-sm mt-1">Kelola verifikasi registrasi dan perpanjangan langganan user.</p>
                </div>

                <button
                    onClick={fetchMessages}
                    className="self-start px-4 py-2 bg-white border-2 border-slate-900 rounded-xl font-bold text-sm text-slate-900 shadow-hard-mini hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Tabs & Filters */}
            <div className="flex flex-col gap-4">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border-2 border-slate-200 self-start">
                    <button
                        onClick={() => setTypeFilter('registration')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${typeFilter === 'registration' ? 'bg-white text-slate-900 shadow-md border-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Registrasi ({regCount})
                    </button>
                    <button
                        onClick={() => setTypeFilter('renewal')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${typeFilter === 'renewal' ? 'bg-white text-slate-900 shadow-md border-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Perpanjangan ({renewalCount})
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex bg-white border-2 border-slate-900 rounded-xl overflow-hidden shadow-hard-mini">
                        {(['all', 'unread', 'resolved'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${filter === f ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'} ${f !== 'all' ? 'border-l-2 border-slate-900' : ''}`}
                            >
                                {f === 'all' ? 'Semua' : f === 'unread' ? 'Belum Baca' : 'Resolved'}
                            </button>
                        ))}
                    </div>

                    <div className="relative flex-1 max-w-sm">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                            placeholder="Cari user..."
                        />
                    </div>
                </div>
            </div>

            {/* Messages List */}
            {loading && messages.length === 0 ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 size={32} className="animate-spin text-slate-400" />
                </div>
            ) : filteredMessages.length === 0 ? (
                <Card className="text-center py-16 border-dashed border-4">
                    <Inbox size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-xl font-black text-slate-300">Tidak ada pesan</p>
                    <p className="text-sm text-slate-300 mt-1">Belum ada aktivitas di kategori ini.</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredMessages.map(msg => (
                        <div
                            key={msg.id}
                            className={`bg-white border-2 rounded-2xl overflow-hidden transition-all hover:shadow-hard ${msg.is_resolved
                                ? 'border-emerald-400 bg-emerald-50/20 opacity-80'
                                : msg.is_read
                                    ? 'border-slate-200 shadow-sm'
                                    : 'border-slate-900 shadow-hard'
                                }`}
                            onClick={() => handleMarkRead(msg)}
                        >
                            <div className="p-6">
                                <div className="flex flex-col lg:flex-row gap-6">
                                    {/* User Block */}
                                    <div className="flex items-start gap-4 lg:w-1/3">
                                        <div className={`w-14 h-14 rounded-2xl border-4 flex items-center justify-center shrink-0 shadow-sm ${msg.is_resolved ? 'bg-emerald-100 border-white' : 'bg-slate-100 border-white'}`}>
                                            <User size={28} className={msg.is_resolved ? 'text-emerald-500' : 'text-slate-400'} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-black text-slate-900 truncate">{msg.sender_name}</h3>
                                                {msg.is_resolved && (
                                                    <CheckCircle size={14} className="text-emerald-500" />
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400"><Mail size={12} /> {msg.sender_email}</div>
                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400"><User size={12} /> @{msg.sender_username}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Interaction Block */}
                                    <div className="flex-1 space-y-4 pt-4 lg:pt-0 lg:border-l-2 lg:border-slate-100 lg:pl-6">
                                        {msg.type === 'renewal' ? (
                                            <div className="space-y-4">
                                                <div className="flex flex-wrap gap-4">
                                                    <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 flex-1 min-w-[200px] relative overflow-hidden group">
                                                        <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:scale-110 transition-transform"><CreditCard size={80} /></div>
                                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Paket & Nominal</p>
                                                        <p className="text-xl font-black text-emerald-900">{msg.package_name}</p>
                                                        <p className="text-sm font-bold text-emerald-600">Rp {msg.amount?.toLocaleString('id-ID')}</p>
                                                    </div>

                                                    {msg.proof_url && (
                                                        <div
                                                            className="w-32 h-24 bg-slate-100 border-2 border-slate-200 rounded-2xl overflow-hidden cursor-pointer relative group"
                                                            onClick={(e) => { e.stopPropagation(); setPreviewImage(msg.proof_url!); }}
                                                        >
                                                            <img src={msg.proof_url} alt="Proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                                <ExternalLink size={20} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                    <Clock size={14} /> Diterima: {new Date(msg.created_at).toLocaleString('id-ID')}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 relative overflow-hidden group">
                                                    <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform"><Key size={80} /></div>
                                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Kode Konfirmasi</p>
                                                    <p className="text-2xl font-black text-amber-900 tracking-[0.2em] font-mono">{msg.subscription_code}</p>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                    <Clock size={14} /> Diterima: {new Date(msg.created_at).toLocaleString('id-ID')}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Block */}
                                    <div className="flex flex-row lg:flex-col gap-2 shrink-0 pt-4 lg:pt-0">
                                        {!msg.is_resolved && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    msg.type === 'renewal' ? handleVerifyRenewal(msg) : handleVerifyUser(msg);
                                                }}
                                                disabled={verifyingId === msg.id}
                                                className="flex-1 lg:flex-none px-6 py-3 bg-slate-900 text-white font-black text-xs rounded-xl shadow-hard-mini hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {verifyingId === msg.id
                                                    ? <Loader2 size={16} className="animate-spin" />
                                                    : <ShieldCheck size={16} className="text-emerald-400" />
                                                }
                                                VERIFIKASI
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                                            className="px-4 py-3 bg-white text-red-500 font-bold text-xs rounded-xl border-2 border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={16} /> Hapus
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Proof Modal */}
            <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} title="Bukti Pembayaran">
                <div className="p-2">
                    <img src={previewImage || ''} alt="Bukti Transfer" className="w-full rounded-xl border-4 border-slate-900" />
                    <div className="mt-4 flex justify-end">
                        <Button onClick={() => setPreviewImage(null)} className="bg-slate-900">Tutup Preview</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
