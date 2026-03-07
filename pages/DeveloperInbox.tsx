import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
    Inbox, CheckCircle, XCircle, ShieldCheck, Clock, Trash2,
    RefreshCw, Loader2, User, Key, Mail, Filter, Search, CreditCard, ExternalLink,
    Copy, Check, UserCircle, Tag, Hash, ChevronRight
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
    const [statusModal, setStatusModal] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'confirm';
        title: string;
        message: string;
        onConfirm?: () => void;
    }>({
        isOpen: false,
        type: 'success',
        title: '',
        message: ''
    });

    const showStatus = (type: 'success' | 'error' | 'confirm', title: string, message: string, onConfirm?: () => void) => {
        setStatusModal({ isOpen: true, type, title, message, onConfirm });
    };

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

            showStatus('success', 'Berhasil', `✅ User "${msg.sender_name}" berhasil diverifikasi! Kode cocok.`);
            fetchMessages();
        } catch (err) {
            console.error(err);
            showStatus('error', 'Gagal', 'Gagal memverifikasi user.');
        } finally {
            setVerifyingId(null);
        }
    };

    const handleVerifyRenewal = (msg: InboxMessage) => {
        showStatus('confirm', 'Konfirmasi', `Konfirmasi perpanjangan untuk ${msg.sender_name}?`, () => executeVerifyRenewal(msg));
    };

    const executeVerifyRenewal = async (msg: InboxMessage) => {
        setVerifyingId(msg.id);
        try {
            // 1. Ambil data user saat ini
            const { data: user, error: userErr } = await supabase
                .from('app_users')
                .select('id, subscription_end, full_name')
                .eq('id', msg.user_id)
                .single();

            if (userErr || !user) {
                showStatus('error', 'Gagal', 'User tidak ditemukan.');
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

            showStatus('success', 'Berhasil', `✅ Perpanjangan "${msg.sender_name}" berhasil! Expire baru: ${newExpiry.toLocaleDateString('id-ID')}`);
            fetchMessages();
        } catch (err) {
            console.error(err);
            showStatus('error', 'Gagal', 'Gagal memverifikasi perpanjangan.');
        } finally {
            setVerifyingId(null);
        }
    };

    const handleDelete = (id: string) => {
        showStatus('confirm', 'Hapus Pesan', 'Hapus pesan ini?', async () => {
            await supabase.from('developer_inbox').delete().eq('id', id);
            fetchMessages();
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Simple visual feedback could be added here if needed, 
        // but for now we'll just let it copy
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
        <div className="space-y-4 sm:space-y-5 md:space-y-6 flex-1">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 sm:gap-3 md:gap-4">
                <div>
                    <h1 className="text-base sm:text-2xl md:text-3xl font-black text-foreground flex items-center gap-2 sm:gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 text-white rounded-lg sm:rounded-xl flex items-center justify-center relative shadow-hard-mini flex-shrink-0">
                            <Inbox size={20} className="sm:w-6 sm:h-6" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] sm:text-[9px] font-black w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 border-white">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        Developer Inbox
                    </h1>
                    <p className="text-muted-foreground font-bold text-xs sm:text-sm mt-0.5 sm:mt-1">Kelola verifikasi registrasi dan perpanjangan langganan user.</p>
                </div>

                <button
                    onClick={fetchMessages}
                    className="self-start px-3 sm:px-4 py-1.5 sm:py-2 bg-card border-2 border-slate-900 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm text-foreground shadow-hard-mini hover:-translate-y-0.5 transition-all flex items-center gap-1.5 sm:gap-2"
                >
                    <RefreshCw size={14} className={`${loading ? 'animate-spin' : ''} sm:w-4 sm:h-4`} /> Refresh
                </button>
            </div>

            {/* Tabs & Filters */}
            <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
                <div className="flex bg-muted p-1 sm:p-1.5 rounded-lg sm:rounded-2xl border-2 border-border self-start gap-1 sm:gap-0">
                    <button
                        onClick={() => setTypeFilter('registration')}
                        className={`px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[7px] sm:text-xs font-black uppercase tracking-widest transition-all ${typeFilter === 'registration' ? 'bg-accent text-white shadow-md border-2 border-slate-900' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Registrasi ({regCount})
                    </button>
                    <button
                        onClick={() => setTypeFilter('renewal')}
                        className={`px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[7px] sm:text-xs font-black uppercase tracking-widest transition-all ${typeFilter === 'renewal' ? 'bg-accent text-white shadow-md border-2 border-slate-900' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Perpanjangan ({renewalCount})
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <div className="flex bg-card border-2 border-slate-900 rounded-lg sm:rounded-xl overflow-hidden shadow-hard-mini">
                        {(['all', 'unread', 'resolved'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${filter === f ? 'bg-accent text-white' : 'text-muted-foreground hover:bg-muted'} ${f !== 'all' ? 'border-l-2 border-slate-900' : ''}`}
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
                            className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border-2 border-border rounded-xl text-sm font-bold text-foreground focus:outline-none focus:border-slate-900 transition-colors"
                            placeholder="Cari user..."
                        />
                    </div>
                </div>
            </div>

            {/* Messages Grid */}
            {loading && messages.length === 0 ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 size={32} className="animate-spin text-slate-400" />
                </div>
            ) : filteredMessages.length === 0 ? (
                <div className="bg-card/50 border-4 border-dashed border-slate-200 rounded-[2rem] p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 border-2 border-slate-200">
                        <Inbox size={40} className="text-slate-300" />
                    </div>
                    <p className="text-xl font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Inbox Bersih!</p>
                    <p className="text-xs font-bold text-slate-400 max-w-[200px]">Semua permintaan telah diproses atau belum ada aktivitas baru.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                    {filteredMessages.map(msg => (
                        <div
                            key={msg.id}
                            className={`group bg-card border-4 rounded-[2rem] overflow-hidden transition-all duration-300 flex flex-col relative ${msg.is_resolved
                                ? 'border-emerald-500/20 bg-emerald-500/5 grayscale-[0.5]'
                                : msg.is_read
                                    ? 'border-slate-200'
                                    : 'border-slate-900 shadow-[8px_8px_0px_var(--shadow-color)] -translate-y-1'
                                }`}
                            onClick={() => handleMarkRead(msg)}
                        >
                            {/* Unread Indicator */}
                            {!msg.is_read && !msg.is_resolved && (
                                <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse z-20"></div>
                            )}

                            {/* Header: User Info */}
                            <div className="p-6 pb-2">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center shrink-0 shadow-sm ${msg.is_resolved ? 'bg-emerald-100 border-emerald-200' : 'bg-slate-100 border-slate-200'}`}>
                                        <UserCircle size={24} className={msg.is_resolved ? 'text-emerald-500' : 'text-slate-500'} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-foreground truncate uppercase text-sm">{msg.sender_name}</h3>
                                            {msg.is_resolved && <CheckCircle size={14} className="text-emerald-500 shrink-0" />}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground truncate">
                                            <Mail size={10} /> {msg.sender_email}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                    <Clock size={12} /> {new Date(msg.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            {/* Main Content: The Code / Renewal Info */}
                            <div className="px-6 py-4 flex-1">
                                {msg.type === 'renewal' ? (
                                    <div className="space-y-3">
                                        <div className="bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-4 relative overflow-hidden">
                                            <div className="absolute right-0 bottom-0 opacity-10 rotate-12"><CreditCard size={60} /></div>
                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Perpanjangan</p>
                                            <p className="text-lg font-black text-emerald-900 dark:text-emerald-400 truncate">{msg.package_name}</p>
                                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500/70">Rp {msg.amount?.toLocaleString('id-ID')}</p>
                                        </div>
                                        {msg.proof_url && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPreviewImage(msg.proof_url!); }}
                                                className="w-full h-14 bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group/btn"
                                            >
                                                <CreditCard size={16} className="text-slate-400 group-hover/btn:text-slate-600" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/btn:text-slate-700">Lihat Bukti TF</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="relative group/ticket">
                                        <div className="bg-amber-50 dark:bg-amber-500/10 border-4 border-slate-900 dark:border-amber-500/30 rounded-2xl p-5 relative overflow-hidden shadow-[4px_4px_0px_var(--shadow-color)]">
                                            <div className="absolute right-2 top-2 opacity-10"><Tag size={40} /></div>
                                            <p className="text-[8px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-[0.3em] mb-2 border-b border-amber-500/20 pb-1">Confirmation Ticket</p>
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xl font-black text-slate-900 dark:text-amber-400 tracking-wider font-mono truncate">{msg.subscription_code}</p>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(msg.subscription_code); }}
                                                    className="w-8 h-8 bg-slate-900 dark:bg-amber-500 text-white rounded-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-hard-mini shrink-0"
                                                    title="Salin Kode"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                            {/* Ticket Holes effect */}
                                            <div className="absolute top-1/2 -left-2 w-4 h-4 bg-card border-4 border-slate-900 rounded-full -translate-y-1/2"></div>
                                            <div className="absolute top-1/2 -right-2 w-4 h-4 bg-card border-4 border-slate-900 rounded-full -translate-y-1/2"></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions Segment */}
                            <div className="p-6 pt-2 bg-muted/30 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex gap-2">
                                    {!msg.is_resolved && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                msg.type === 'renewal' ? handleVerifyRenewal(msg) : handleVerifyUser(msg);
                                            }}
                                            disabled={verifyingId === msg.id}
                                            className="flex-1 px-4 py-3 bg-accent text-white font-black text-[10px] uppercase tracking-widest rounded-xl border-2 border-slate-900 shadow-hard-mini hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {verifyingId === msg.id
                                                ? <Loader2 size={14} className="animate-spin" />
                                                : <ShieldCheck size={14} />
                                            }
                                            Verifikasi
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                                        className="w-12 h-12 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                        title="Hapus Pesan"
                                    >
                                        <Trash2 size={18} />
                                    </button>
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

            {/* Status Modal */}
            <Modal isOpen={statusModal.isOpen} onClose={() => setStatusModal({ ...statusModal, isOpen: false })} title={statusModal.title}>
                <div className="p-8 text-center space-y-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-900 shadow-hard-mini ${statusModal.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                        statusModal.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                        {statusModal.type === 'success' ? <CheckCircle size={32} /> :
                            statusModal.type === 'error' ? <XCircle size={32} /> : <Clock size={32} />}
                    </div>
                    <p className="text-slate-800 font-bold">{statusModal.message}</p>
                    <div className="flex gap-3 pt-4">
                        {statusModal.type === 'confirm' ? (
                            <>
                                <Button onClick={() => setStatusModal({ ...statusModal, isOpen: false })} variant="outline" className="flex-1">Batal</Button>
                                <Button onClick={() => { statusModal.onConfirm?.(); setStatusModal({ ...statusModal, isOpen: false }); }} className="flex-1 bg-slate-900 text-white">Ya, Lanjutkan</Button>
                            </>
                        ) : (
                            <Button onClick={() => setStatusModal({ ...statusModal, isOpen: false })} className="w-full bg-slate-900 text-white">Tutup</Button>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};
