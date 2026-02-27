import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Mail, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface EmailSetupModalProps {
    isOpen: boolean;
    currentEmail: string;
    userId: string;
    onComplete: () => void;
    onSkip: () => void;
}

export const EmailSetupModal: React.FC<EmailSetupModalProps> = ({
    isOpen,
    currentEmail,
    userId,
    onComplete,
    onSkip
}) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const isSyntheticEmail = currentEmail?.endsWith('@team.contentflow.app');

    const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !e.endsWith('@team.contentflow.app');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const trimmed = email.trim().toLowerCase();

        if (!isValidEmail(trimmed)) {
            setError('Masukkan email yang valid (bukan @team.contentflow.app).');
            return;
        }

        setLoading(true);
        try {
            // 1. Check if email already used by another user
            const { data: existing } = await supabase
                .from('app_users')
                .select('id')
                .ilike('email', trimmed)
                .neq('id', userId)
                .maybeSingle();

            if (existing) {
                setError('Email ini sudah digunakan oleh user lain.');
                setLoading(false);
                return;
            }

            // 2. Update email in app_users
            const { error: dbError } = await supabase
                .from('app_users')
                .update({ email: trimmed })
                .eq('id', userId);

            if (dbError) throw dbError;

            // 3. Update email in Supabase Auth
            const { error: authError } = await supabase.auth.updateUser({
                email: trimmed
            });

            if (authError) {
                console.warn('Auth email update warning:', authError.message);
                // Don't block — app_users is already updated
            }

            // 4. Mark setup as complete
            localStorage.setItem('email_setup_complete', 'true');
            setSuccess(true);

            setTimeout(() => {
                onComplete();
            }, 2000);
        } catch (err: any) {
            console.error('Email setup error:', err);
            setError(err.message || 'Gagal memperbarui email.');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        // Allow skip but remind next session
        localStorage.setItem('email_setup_skipped', new Date().toISOString());
        onSkip();
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleSkip}
            title=""
            maxWidth="max-w-md"
            hideHeader
        >
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="mx-auto w-16 h-16 bg-amber-100 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex items-center justify-center">
                        <Mail size={32} className="text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 font-heading uppercase tracking-tight">
                        Atur Email Aktif
                    </h2>
                    <p className="text-sm font-bold text-slate-500 leading-relaxed">
                        Akun kamu saat ini menggunakan email sementara. Atur email aktif agar bisa
                        menerima notifikasi penting dan memulihkan akun jika diperlukan.
                    </p>
                </div>

                {/* Current Email Info */}
                {isSyntheticEmail && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 flex items-center gap-3">
                        <AlertCircle size={18} className="text-amber-500 shrink-0" />
                        <div>
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Email Sementara</p>
                            <p className="text-xs font-bold text-amber-800 break-all">{currentEmail}</p>
                        </div>
                    </div>
                )}

                {success ? (
                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                        <CheckCircle size={24} className="text-emerald-500 shrink-0" />
                        <div>
                            <p className="font-black text-emerald-700 text-sm">Email berhasil diperbarui!</p>
                            <p className="text-xs font-bold text-emerald-600">Login berikutnya bisa pakai email baru kamu.</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-black text-slate-600 uppercase tracking-widest mb-1.5 block">
                                Email Aktif Baru
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                placeholder="contoh@email.com"
                                className="w-full bg-white border-2 border-slate-900 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-accent shadow-[2px_2px_0px_#0f172a] transition-all"
                                autoFocus
                            />
                            {error && (
                                <p className="text-xs font-bold text-red-500 mt-1.5 flex items-center gap-1">
                                    <AlertCircle size={12} /> {error}
                                </p>
                            )}
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2">
                            <Shield size={14} className="text-slate-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                                Email ini akan digunakan untuk login dan pemulihan akun. Pastikan email yang dimasukkan aktif dan bisa diakses.
                            </p>
                        </div>

                        <Button
                            type="submit"
                            isLoading={loading}
                            className="w-full bg-accent text-white border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:shadow-[6px_6px_0px_#0f172a] hover:-translate-y-1 transition-all py-3 font-black uppercase tracking-widest"
                        >
                            Simpan Email
                        </Button>

                        <button
                            type="button"
                            onClick={handleSkip}
                            className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-2"
                        >
                            Nanti saja, ingatkan lagi nanti
                        </button>
                    </form>
                )}
            </div>
        </Modal>
    );
};
