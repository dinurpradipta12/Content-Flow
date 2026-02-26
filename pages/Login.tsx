import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Layers, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import { useAppConfig } from '../components/AppConfigProvider';
import bcrypt from 'bcryptjs';
import { logActivity } from '../services/activityService';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const { config } = useAppConfig();

    // Theme-aware logo selection
    const currentTheme = localStorage.getItem('app_ui_theme') || 'light';
    const isDark = currentTheme === 'dark' || currentTheme === 'midnight';
    const appLogo = (isDark && config?.app_logo_light)
        ? config.app_logo_light
        : (config?.app_logo || localStorage.getItem('app_logo'));

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('abuse') === 'true') {
            setError("Sistem mendeteksi adanya pendaftaran beberapa akun Free Trial dari perangkat yang sama (Maks. 2 Akun). Sesuai Syarat & Ketentuan, akun Anda dibatasi untuk sementara.");
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Bypass check for demo if unconfigured, but usually we need Supabase
        if (!isSupabaseConfigured()) {
            setError("Database belum terhubung. Cek konfigurasi.");
            setLoading(false);
            return;
        }

        try {
            // Query for user by username first
            const { data, error: dbError } = await supabase
                .from('app_users')
                .select('*')
                .eq('username', username)
                .single();

            if (dbError) {
                if (dbError.code === 'PGRST116') {
                    throw new Error("Username atau Password salah.");
                } else {
                    console.error(dbError);
                    throw new Error("Gagal terhubung ke database. Pastikan tabel 'app_users' sudah dibuat via SQL Script di Settings.");
                }
            }

            if (data) {
                let isPasswordCorrect = false;

                // Check if stored password is a bcrypt hash (usually starts with $2a$ or $2b$)
                if (data.password.startsWith('$2a$') || data.password.startsWith('$2b$')) {
                    isPasswordCorrect = bcrypt.compareSync(password, data.password);
                } else {
                    // Plaintext check (Migration phase)
                    isPasswordCorrect = password === data.password;

                    // If correct, update to hash immediately
                    if (isPasswordCorrect) {
                        const newHash = bcrypt.hashSync(password, 10);
                        await supabase.from('app_users').update({ password: newHash }).eq('id', data.id);
                        console.log("Migrated user password to hash.");
                    }
                }

                if (!isPasswordCorrect) {
                    throw new Error("Username atau Password salah.");
                }
                // Check verification status (Developer implicitly verified)
                if (data.is_verified === false && data.role !== 'Developer') {
                    throw new Error("Akun Anda belum diverifikasi oleh Administrator. Mohon tunggu proses validasi kode langganan Anda.");
                }

                // Check account active status
                if (data.is_active === false) {
                    throw new Error("Akun Anda telah dinonaktifkan. Hubungi Developer/Admin untuk mengaktifkan kembali.");
                }

                // Check subscription end date
                if (data.subscription_end) {
                    const endDate = new Date(data.subscription_end);
                    const now = new Date();

                    if (now > endDate) {
                        // Auto-deactivate in DB
                        await supabase.from('app_users').update({ is_active: false }).eq('id', data.id);
                        throw new Error(`Langganan Anda berakhir pada ${endDate.toLocaleString('id-ID')}. Hubungi Developer/Admin untuk memperpanjang.`);
                    }
                }

                // Check Admin's subscription if user is a sub-member
                if (data.admin_id) {
                    const { data: adminData } = await supabase.from('app_users').select('subscription_end, is_active').eq('id', data.admin_id).single();
                    if (adminData) {
                        if (adminData.is_active === false) {
                            throw new Error("Akun Administrator Anda telah dinonaktifkan. Anda tidak dapat login sementara waktu.");
                        }
                        if (adminData.subscription_end) {
                            const adminEnd = new Date(adminData.subscription_end);
                            if (new Date() > adminEnd) {
                                throw new Error("Akses ditolak: Langganan Administrator tim Anda telah berakhir.");
                            }
                        }
                    }
                }

                // Login Success
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('user_id', data.id);
                localStorage.setItem('tenant_id', data.admin_id || data.id);
                localStorage.setItem('user_name', data.full_name || data.username);
                localStorage.setItem('user_role', data.role || 'Member');
                localStorage.setItem('user_avatar', data.avatar_url || 'https://picsum.photos/40/40');
                localStorage.setItem('user_job_title', data.job_title || '');
                if (data.subscription_end) {
                    localStorage.setItem('subscription_end', data.subscription_end);
                } else {
                    localStorage.removeItem('subscription_end');
                }

                // Check if this is their very first login via admin/system
                if (!data.last_activity_at) {
                    localStorage.setItem('is_first_login', 'true');
                } else {
                    localStorage.removeItem('is_first_login');
                }

                // Log login activity
                await logActivity({
                    user_id: data.id,
                    workspace_id: data.admin_id || data.id,
                    action: 'LOGIN',
                    details: { role: data.role }
                });

                navigate('/');
            }

        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-dot-grid">
            <div className="max-w-md w-full relative">
                {/* Background shapes */}
                <div className="absolute top-[-20px] left-[-20px] w-24 h-24 bg-tertiary rounded-full border-2 border-slate-800 -z-10"></div>
                <div className="absolute bottom-[-20px] right-[-20px] w-32 h-32 bg-secondary rounded-full border-2 border-slate-800 -z-10"></div>

                <Card className="shadow-2xl relative">
                    <div className="text-center mb-8 flex flex-col items-center justify-center">
                        {appLogo ? (
                            <img src={appLogo} className="w-full max-w-[360px] max-h-40 object-contain mx-auto mb-4" alt="Logo" />
                        ) : (
                            <div className="text-4xl font-black text-slate-900 mb-4">{config?.app_name || 'Aruneeka'}</div>
                        )}
                        <p className="text-slate-500 mt-2">Masuk untuk mengelola kontenmu.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <Input
                            label="Username"
                            placeholder="Contoh: arunika"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="pt-2">
                            <Button className="w-full" type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin mr-2" />
                                        Memproses...
                                    </>
                                ) : (
                                    "Masuk Sekarang"
                                )}
                            </Button>
                        </div>
                    </form>

                    {!isSupabaseConfigured() && (
                        <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-lg border border-yellow-200 text-center">
                            ⚠️ Database belum terhubung. Konfigurasi di dalam aplikasi (Settings) atau cek file .env.
                        </div>
                    )}

                    <div className="mt-4 text-center space-y-2">
                        <p className="text-xs text-slate-400 font-bold">
                            Belum punya akun? <button type="button" onClick={() => navigate('/terms')} className="text-accent hover:underline font-black">Daftar di sini</button>
                        </p>
                        <button type="button" onClick={() => navigate('/welcome')} className="text-xs text-slate-400 hover:text-slate-700 font-bold underline transition-colors">
                            ← Kembali ke Welcome
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
};