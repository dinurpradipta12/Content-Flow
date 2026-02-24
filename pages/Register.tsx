import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { UserPlus, User, Mail, Lock, Key, ArrowLeft, Loader2, Info } from 'lucide-react';

export const Register: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        username: '',
        password: '',
        subscriptionCode: ''
    });
    const [errorStatus, setErrorStatus] = useState('');
    const [success, setSuccess] = useState(false);
    const [registeredUserId, setRegisteredUserId] = useState('');
    const [sendingInbox, setSendingInbox] = useState(false);
    const [inboxSent, setInboxSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorStatus('');

        // Basic Validation
        if (!form.fullName || !form.email || !form.username || !form.password) {
            setErrorStatus('Nama lengkap, email, username, dan password wajib diisi.');
            return;
        }

        if (form.password.length < 6) {
            setErrorStatus('Password minimal 6 karakter.');
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email)) {
            setErrorStatus('Format email tidak valid.');
            return;
        }

        setLoading(true);
        try {
            // Cek username/email duplicate
            const { data: existingUser } = await supabase
                .from('app_users')
                .select('id')
                .or(`username.eq.${form.username},email.eq.${form.email}`)
                .maybeSingle();

            if (existingUser) {
                setErrorStatus('Username atau Email sudah terdaftar.');
                setLoading(false);
                return;
            }

            // Insert new user into db mapping
            const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(form.fullName)}`;
            const now = new Date().toISOString();
            const newUserId = crypto.randomUUID();

            const insertData = {
                id: newUserId,
                full_name: form.fullName,
                email: form.email,
                username: form.username,
                password: form.password,
                role: 'Admin', // New admin registration with subscription
                avatar_url: avatarUrl,
                is_active: true,
                subscription_start: now,
                subscription_code: form.subscriptionCode || null,
                is_verified: false // Must be verified by Developer
            };

            const { error } = await supabase.from('app_users').insert([insertData]);

            if (error) { throw error; }

            setRegisteredUserId(newUserId);
            setSuccess(true);

        } catch (err: any) {
            console.error(err);
            setErrorStatus('Gagal melakukan registrasi, periksa koneksi atau coba lagi nanti.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendToInbox = async () => {
        if (!registeredUserId || !form.subscriptionCode) return;
        setSendingInbox(true);
        try {
            const { error } = await supabase.from('developer_inbox').insert([{
                sender_name: form.fullName,
                sender_email: form.email,
                sender_username: form.username,
                subscription_code: form.subscriptionCode,
                user_id: registeredUserId,
                message: `${form.fullName} telah mengirimkan kode konfirmasi sebagai berikut untuk bisa di verifikasi. Kode user: ${form.subscriptionCode}`,
                is_read: false,
                is_resolved: false
            }]);

            if (error) throw error;
            setInboxSent(true);
        } catch (err) {
            console.error(err);
            alert('Gagal mengirim pesan ke Developer Inbox. Silakan hubungi via WhatsApp.');
        } finally {
            setSendingInbox(false);
        }
    };

    const handleSendWhatsApp = () => {
        const waNumber = '6281234567890'; // Developer WhatsApp number - replace as needed
        const message = encodeURIComponent(
            `Halo Developer Aruneeka,\n\nSaya telah mendaftar akun baru dengan informasi berikut:\n\nNama: ${form.fullName}\nEmail: ${form.email}\nUsername: ${form.username}\nKode Langganan: ${form.subscriptionCode}\n\nMohon diverifikasi agar akun saya dapat diaktifkan.\n\nTerima kasih!`
        );
        window.open(`https://wa.me/${waNumber}?text=${message}`, '_blank');
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-lg w-full bg-white border-4 border-slate-900 rounded-3xl p-8 text-center shadow-[8px_8px_0px_0px_#0f172a]">
                    <div className="w-20 h-20 bg-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-slate-900">
                        <UserPlus size={40} className="text-slate-900" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-3">Pendaftaran Berhasil!</h2>
                    <p className="text-slate-600 font-medium mb-6 leading-relaxed">
                        Terima kasih, <strong>{form.fullName}</strong>. Akun Anda telah tersimpan di sistem kami.
                        <br /><br />
                        Saat ini akun Anda sedang menunggu <strong>verifikasi dari Developer</strong>.
                    </p>

                    {/* Subscription Code Display */}
                    {form.subscriptionCode && (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-5 mb-6">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Kode Unik Langganan Anda</p>
                            <p className="text-3xl font-black text-slate-900 tracking-[0.3em] font-mono">{form.subscriptionCode}</p>
                            <p className="text-xs text-slate-500 font-medium mt-3 leading-relaxed">
                                Kirimkan kode ini ke Developer untuk proses verifikasi melalui salah satu metode berikut:
                            </p>
                        </div>
                    )}

                    {/* Action Buttons: WhatsApp & Inbox */}
                    {form.subscriptionCode && (
                        <div className="flex flex-col gap-3 mb-6">
                            <button
                                onClick={handleSendWhatsApp}
                                className="w-full py-3.5 bg-emerald-500 text-white font-black rounded-xl border-2 border-emerald-700 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 text-sm shadow-[2px_2px_0px_#064e3b]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                Kirim via WhatsApp
                            </button>
                            <button
                                onClick={handleSendToInbox}
                                disabled={inboxSent || sendingInbox}
                                className={`w-full py-3.5 font-black rounded-xl border-2 transition-colors flex items-center justify-center gap-2 text-sm ${inboxSent
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-400 cursor-default'
                                    : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-[2px_2px_0px_#334155]'
                                    }`}
                            >
                                {sendingInbox ? (
                                    <><Loader2 size={18} className="animate-spin" /> Mengirim...</>
                                ) : inboxSent ? (
                                    <><Info size={18} /> ✓ Pesan Terkirim ke Inbox Developer</>
                                ) : (
                                    <><Mail size={18} /> Kirim ke Inbox Developer</>
                                )}
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-3.5 text-slate-900 font-black rounded-xl border-2 border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors text-sm"
                    >
                        Kembali ke halaman Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 lg:p-10 relative">
            <div className="absolute top-4 left-4 z-10">
                <button
                    onClick={() => navigate('/terms')}
                    className="px-4 py-2 bg-white text-slate-600 font-bold text-sm rounded-xl border-2 border-slate-300 hover:border-slate-800 hover:text-slate-900 shadow-sm transition-all flex items-center gap-2"
                >
                    <ArrowLeft size={16} /> Kembali
                </button>
            </div>

            <div className="w-full max-w-lg bg-white border-4 border-slate-900 rounded-3xl shadow-[8px_8px_0px_0px_#0f172a] overflow-hidden flex flex-col z-10">
                <div className="bg-slate-900 text-white p-6 border-b-4 border-slate-900 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 shrink-0 transform -rotate-3 border-2 border-slate-700">
                        <UserPlus size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Daftar Akun Baru</h1>
                        <p className="text-xs text-slate-300 font-medium uppercase tracking-widest mt-0.5">Mulai perjalanan karirmu di Aruneeka</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
                    {errorStatus && (
                        <div className="p-4 bg-red-50 text-red-700 border-2 border-red-500 rounded-xl font-bold text-sm flex items-center gap-3">
                            <Info size={16} className="shrink-0" />
                            <span>{errorStatus}</span>
                        </div>
                    )}

                    {/* 1. Nama Lengkap */}
                    <div>
                        <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-1">Nama Lengkap</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                value={form.fullName}
                                onChange={e => setForm({ ...form, fullName: e.target.value })}
                                className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-sm font-bold rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-100 block pl-10 p-3 transition-all"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    {/* 2. Email Aktif */}
                    <div>
                        <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-1">Email Aktif</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-sm font-bold rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-100 block pl-10 p-3 transition-all"
                                placeholder="john@example.com"
                                required
                            />
                        </div>
                    </div>

                    {/* 3. Username Login & 4. Password */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-1">Username Login</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <span className="font-black text-slate-400">@</span>
                                </div>
                                <input
                                    type="text"
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-sm font-bold rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-100 block pl-10 p-3 transition-all"
                                    placeholder="johndoe"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-sm font-bold rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-100 block pl-10 p-3 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* 5. Kode Unik Langganan */}
                    <div className="pt-2 border-t-2 border-dashed border-slate-200">
                        <label className="block text-xs font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1"><Key size={14} /> Kode Unik Langganan</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={form.subscriptionCode}
                                onChange={e => setForm({ ...form, subscriptionCode: e.target.value.toUpperCase() })}
                                className="w-full bg-amber-50 border-2 border-amber-300 text-slate-900 text-lg text-center tracking-widest font-black rounded-xl focus:outline-none focus:border-amber-600 focus:bg-amber-100 block p-4 transition-all uppercase placeholder-amber-200"
                                placeholder="KODE-XXX-YYY"
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold text-center mt-2 leading-tight">Jika Anda berlangganan, masukkan kode unik yang diberikan saat konfirmasi pembelian. Admin akan mencocokkan kode ini untuk mengaktifkan akun Anda. Kosongkan jika belum memiliki kode.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 text-white font-black text-lg p-4 rounded-xl border-4 border-slate-900 hover:-translate-y-1 shadow-[4px_4px_0px_0px_#334155] hover:shadow-[6px_6px_0px_0px_#334155] active:translate-y-1 active:shadow-none transition-all disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? (
                            <><Loader2 size={24} className="animate-spin" /> Memproses...</>
                        ) : (
                            'Daftar Sekarang'
                        )}
                    </button>

                    <p className="text-xs text-slate-400 font-bold text-center">
                        Sudah punya akun? <button type="button" onClick={() => navigate('/login')} className="text-accent hover:underline font-black">Login di sini</button>
                    </p>
                </form>
            </div>
        </div>
    );
};
