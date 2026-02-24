import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    Inbox, CheckCircle, XCircle, ShieldCheck, Clock, Trash2,
    RefreshCw, Loader2, User, Key, Mail, Filter, Search
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
}

export const DeveloperInbox: React.FC = () => {
    const [messages, setMessages] = useState<InboxMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread' | 'resolved'>('all');
    const [search, setSearch] = useState('');
    const [verifyingId, setVerifyingId] = useState<string | null>(null);

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
        await supabase.from('developer_inbox').update({ is_read: true }).eq('id', msg.id);
        fetchMessages();
    };

    const handleVerifyUser = async (msg: InboxMessage) => {
        setVerifyingId(msg.id);
        try {
            // Find user by user_id
            const { data: user, error: userErr } = await supabase
                .from('app_users')
                .select('id, subscription_code, full_name')
                .eq('id', msg.user_id)
                .single();

            if (userErr || !user) {
                alert('User tidak ditemukan di database.');
                return;
            }

            // Verify subscription code matches
            if ((user.subscription_code || '').toUpperCase() !== (msg.subscription_code || '').toUpperCase()) {
                alert(`Kode tidak cocok!\n\nKode yang dikirim: ${msg.subscription_code}\nKode di database: ${user.subscription_code || '(kosong)'}`);
                return;
            }

            // Update user to verified
            const { error: updateErr } = await supabase
                .from('app_users')
                .update({ is_verified: true })
                .eq('id', msg.user_id);

            if (updateErr) throw updateErr;

            // Mark inbox as resolved
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

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus pesan ini?')) return;
        await supabase.from('developer_inbox').delete().eq('id', id);
        fetchMessages();
    };

    const filteredMessages = messages.filter(msg => {
        if (filter === 'unread' && msg.is_read) return false;
        if (filter === 'resolved' && !msg.is_resolved) return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                msg.sender_name.toLowerCase().includes(q) ||
                msg.sender_email.toLowerCase().includes(q) ||
                msg.subscription_code.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const unreadCount = messages.filter(m => !m.is_read).length;

    return (
        <div className="space-y-6 flex-1">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center relative">
                            <Inbox size={24} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        Developer Inbox
                    </h1>
                    <p className="text-slate-500 font-bold text-sm mt-1">Pesan konfirmasi kode pendaftaran dari user baru</p>
                </div>

                <button
                    onClick={fetchMessages}
                    className="self-start px-4 py-2 bg-white border-2 border-slate-900 rounded-xl font-bold text-sm text-slate-900 shadow-[2px_2px_0px_#0f172a] hover:shadow-[4px_4px_0px_#0f172a] hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex bg-white border-2 border-slate-900 rounded-xl overflow-hidden shadow-[2px_2px_0px_#0f172a]">
                    {(['all', 'unread', 'resolved'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${filter === f ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'} ${f !== 'all' ? 'border-l-2 border-slate-900' : ''}`}
                        >
                            {f === 'all' ? `Semua (${messages.length})` : f === 'unread' ? `Belum Dibaca (${unreadCount})` : `Terverifikasi`}
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
                        placeholder="Cari nama, email, atau kode..."
                    />
                </div>
            </div>

            {/* Messages List */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 size={32} className="animate-spin text-slate-400" />
                </div>
            ) : filteredMessages.length === 0 ? (
                <Card className="text-center py-16">
                    <Inbox size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-xl font-black text-slate-400">Inbox Kosong</p>
                    <p className="text-sm text-slate-400 mt-1">Belum ada pesan konfirmasi dari user baru.</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredMessages.map(msg => (
                        <div
                            key={msg.id}
                            className={`bg-white border-2 rounded-2xl overflow-hidden transition-all hover:shadow-[4px_4px_0px_#0f172a] ${msg.is_resolved
                                    ? 'border-emerald-400 bg-emerald-50/30'
                                    : msg.is_read
                                        ? 'border-slate-200'
                                        : 'border-slate-900 shadow-[4px_4px_0px_#0f172a]'
                                }`}
                            onClick={() => !msg.is_read && handleMarkRead(msg)}
                        >
                            <div className="p-5">
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center shrink-0 ${msg.is_resolved
                                            ? 'bg-emerald-400 border-emerald-700'
                                            : 'bg-amber-300 border-slate-900'
                                        }`}>
                                        {msg.is_resolved
                                            ? <ShieldCheck size={24} className="text-emerald-900" />
                                            : <User size={24} className="text-slate-900" />
                                        }
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-black text-slate-900 text-sm truncate">{msg.sender_name}</h3>
                                            {!msg.is_read && (
                                                <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                                            )}
                                            {msg.is_resolved && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-300">
                                                    <CheckCircle size={10} /> Terverifikasi
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm text-slate-600 font-medium leading-relaxed mb-3">
                                            <strong>{msg.sender_name}</strong> telah mengirimkan kode konfirmasi sebagai berikut untuk bisa di verifikasi:
                                        </p>

                                        {/* Code Display */}
                                        <div className="flex items-center gap-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-3 mb-3">
                                            <Key size={20} className="text-amber-500 shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kode User</p>
                                                <p className="text-lg font-black text-slate-900 tracking-[0.3em] font-mono">{msg.subscription_code}</p>
                                            </div>
                                        </div>

                                        {/* Meta info */}
                                        <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 font-bold">
                                            <span className="flex items-center gap-1"><Mail size={12} /> {msg.sender_email}</span>
                                            <span className="flex items-center gap-1"><User size={12} /> @{msg.sender_username}</span>
                                            <span className="flex items-center gap-1"><Clock size={12} /> {new Date(msg.created_at).toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 shrink-0">
                                        {!msg.is_resolved && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleVerifyUser(msg); }}
                                                disabled={verifyingId === msg.id}
                                                className="px-4 py-2 bg-emerald-400 text-slate-900 font-black text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:shadow-[4px_4px_0px_#0f172a] hover:-translate-y-0.5 transition-all flex items-center gap-1.5 disabled:opacity-50"
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
                                            className="px-4 py-2 bg-white text-red-500 font-bold text-xs rounded-xl border-2 border-red-300 hover:bg-red-50 transition-colors flex items-center gap-1.5"
                                        >
                                            <Trash2 size={14} /> Hapus
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
