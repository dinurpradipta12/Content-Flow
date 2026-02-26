import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { supabase } from '../services/supabaseClient';
import {
    User,
    Camera,
    Key,
    CheckCircle,
    ArrowRight,
    ArrowLeft,
    Loader2,
    Briefcase,
    Shield
} from 'lucide-react';
import bcrypt from 'bcryptjs';
import { logActivity } from '../services/activityService';

interface FirstLoginModalProps {
    isOpen: boolean;
    onComplete: () => void;
}

export const FirstLoginModal: React.FC<FirstLoginModalProps> = ({ isOpen, onComplete }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState<any>(null);

    // Form states
    const [fullName, setFullName] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchUserData();
        }
    }, [isOpen]);

    const fetchUserData = async () => {
        const userId = localStorage.getItem('user_id');
        if (!userId) return;

        const { data, error } = await supabase
            .from('app_users')
            .select('*')
            .eq('id', userId)
            .single();

        if (data) {
            setUserData(data);
            setFullName(data.full_name || '');
            setJobTitle(data.job_title || '');
            setAvatarUrl(data.avatar_url || '');
        }
    };

    const handleNext = () => {
        setError('');
        if (step === 1) {
            if (!fullName.trim()) {
                setError('Nama lengkap wajib diisi.');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            setStep(3);
        }
    };

    const handleBack = () => {
        setStep(Math.max(1, step - 1));
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1 * 1024 * 1024) {
                alert('File terlalu besar (Maks. 1MB)');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFinish = async () => {
        setError('');
        if (newPassword && newPassword.length < 6) {
            setError('Password minimal 6 karakter.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Konfirmasi password tidak cocok.');
            return;
        }

        setLoading(true);
        try {
            const userId = localStorage.getItem('user_id');
            const now = new Date().toISOString();

            const updates: any = {
                full_name: fullName,
                job_title: jobTitle,
                avatar_url: avatarUrl,
                last_activity_at: now
            };

            if (newPassword) {
                updates.password = bcrypt.hashSync(newPassword, 10);
            }

            const { error: updateError } = await supabase
                .from('app_users')
                .update(updates)
                .eq('id', userId);

            if (updateError) throw updateError;

            // Log activity
            await logActivity({
                user_id: userId,
                action: 'UPDATE_PROFILE',
                details: { info: 'First time setup completed', has_avatar: !!avatarUrl }
            });
            if (newPassword) {
                await logActivity({
                    user_id: userId,
                    action: 'CHANGE_PASSWORD',
                    details: { method: 'First login wizard' }
                });
            }

            // Update local storage
            localStorage.setItem('user_name', fullName);
            localStorage.setItem('user_avatar', avatarUrl);
            localStorage.setItem('user_job_title', jobTitle);
            localStorage.removeItem('is_first_login');

            onComplete();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Terjadi kesalahan saat menyimpan data.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { }} // Force user to complete
            title={
                <div className="flex items-center gap-2">
                    <Shield className="text-white" size={20} />
                    <span>Lengkapi Profil Anda</span>
                </div>
            }
            maxWidth="max-w-md"
        >
            <div className="space-y-6">
                {/* Stepper Header */}
                <div className="flex items-center justify-between mb-8">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center flex-1 last:flex-none">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${step >= s ? 'bg-accent text-white border-slate-900 shadow-[2px_2px_0px_#000]' : 'bg-slate-100 text-slate-400 border-slate-200'
                                }`}>
                                {step > s ? '✓' : s}
                            </div>
                            {s < 3 && (
                                <div className={`flex-1 h-1 mx-2 rounded-full ${step > s ? 'bg-accent' : 'bg-slate-100'}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step 1: Basic Info */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-black text-slate-800">Halo! 👋</h3>
                            <p className="text-sm text-slate-500 font-bold">Mari lengkapi informasi dasar akun Anda.</p>
                        </div>
                        <Input
                            label="Nama Lengkap"
                            placeholder="Contoh: Andi Wijaya"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            icon={<User size={18} />}
                        />
                        <Input
                            label="Pekerjaan / Jabatan"
                            placeholder="Contoh: Content Creator"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            icon={<Briefcase size={18} />}
                        />
                    </div>
                )}

                {/* Step 2: Avatar */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-black text-slate-800">Foto Profil 📸</h3>
                            <p className="text-sm text-slate-500 font-bold">Biar rekan tim Anda mengenali Anda.</p>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-3xl border-4 border-slate-900 bg-slate-50 overflow-hidden shadow-hard">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <User size={64} />
                                        </div>
                                    )}
                                </div>
                                <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent text-white rounded-xl border-2 border-slate-900 flex items-center justify-center shadow-hard-mini cursor-pointer hover:scale-110 transition-transform">
                                    <Camera size={20} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                </label>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Maks. 1MB (PNG/JPG)</p>
                        </div>
                    </div>
                )}

                {/* Step 3: Password */}
                {step === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-black text-slate-800">Keamanan 🔒</h3>
                            <p className="text-sm text-slate-500 font-bold">Harap ganti password sementara Anda.</p>
                        </div>
                        <Input
                            label="Password Baru"
                            type="password"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            icon={<Key size={18} />}
                        />
                        <Input
                            label="Konfirmasi Password"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            icon={<Key size={18} />}
                        />
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 flex items-start gap-3">
                            <div className="bg-amber-100 p-1 rounded-lg text-amber-600">
                                <Key size={14} />
                            </div>
                            <p className="text-[11px] font-bold text-amber-800 leading-tight">
                                Disarankan menggunakan kombinasi huruf, angka, dan simbol untuk keamanan maksimal.
                            </p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl border-2 border-red-200 text-xs font-bold animate-shake">
                        {error}
                    </div>
                )}

                {/* Footer Actions */}
                <div className="flex gap-3 pt-4 border-t-2 border-slate-50">
                    {step > 1 && (
                        <Button
                            variant="secondary"
                            onClick={handleBack}
                            disabled={loading}
                            className="flex-1"
                        >
                            <ArrowLeft size={18} /> Kembali
                        </Button>
                    )}
                    <Button
                        onClick={step === 3 ? handleFinish : handleNext}
                        isLoading={loading}
                        className="flex-1"
                        icon={step === 3 ? <CheckCircle size={18} /> : <ArrowRight size={18} />}
                    >
                        {step === 3 ? 'Selesaikan' : 'Lanjut'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
