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

            const insertData = {
                id: crypto.randomUUID(),
                full_name: form.fullName,
                email: form.email,
                username: form.username,
                password: form.password,
                role: 'Member',
                avatar_url: avatarUrl,
                is_active: true, // They can't login yet anyway due to is_verified = false
                subscription_start: now,
                subscription_code: form.subscriptionCode || null,
                is_verified: false // Must be verified by Admin/Developer
            };

            const { error } = await supabase.from('app_users').insert([insertData]);

            if (error) { throw error; }

            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 8000);

        } catch (err: any) {
            console.error(err);
            setErrorStatus('Gagal melakukan registrasi, periksa koneksi atau coba lagi nanti.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-emerald-50 border-4 border-emerald-500 rounded-3xl p-8 text-center shadow-[8px_8px_0px_0px_#10b981] animate-in slide-in-from-bottom-4">
                    <div className="w-20 h-20 bg-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-900 border-dashed">
                        <UserPlus size={40} className="text-emerald-900" />
                    </div>
                    <h2 className="text-3xl font-black text-emerald-900 mb-4">Pendaftaran Berhasil!</h2>
                    <p className="text-emerald-700 font-medium mb-6 leading-relaxed">
                        Terima kasih, <strong>{form.fullName}</strong>. Akun Anda telah tersimpan di sistem kami.
                        <br /><br />
                        Saat ini akun Anda sedang menunggu <strong>verifikasi dari Administrator</strong>.
                        {form.subscriptionCode && (
                            <> Kami akan mencocokkan kode unik <code className="bg-emerald-200 px-2 py-0.5 rounded font-mono text-sm">{form.subscriptionCode}</code> Anda.</>
                        )}
                        {' '}Jika berhasil divalidasi, Anda dapat langsung login.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-4 text-emerald-900 font-black rounded-xl border-4 border-emerald-900 bg-white hover:bg-emerald-100 transition-colors"
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
