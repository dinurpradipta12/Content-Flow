import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Layers, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import { useAppConfig } from '../components/AppConfigProvider';
import { logActivity } from '../services/activityService';
import bcrypt from 'bcryptjs';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const { config } = useAppConfig();

    // Use standard logo for login (purple)
    const appLogo = config?.app_logo || localStorage.getItem('app_logo');

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [resendLoading, setResendLoading] = useState(false);
    const [showResend, setShowResend] = useState(false);

    const handleResendEmail = async () => {
        if (!username.includes('@')) {
            setError("Gagal mengirim ulang: Masukkan alamat email lengkap untuk verifikasi.");
            return;
        }
        setResendLoading(true);
        try {
            const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email: username.trim(),
            });
            if (resendError) throw resendError;
            setError("✅ Email konfirmasi telah dikirim ulang. Silakan cek inbox (atau folder spam) Anda.");
            setShowResend(false);
        } catch (err: any) {
            setError(`Gagal mengirim ulang: ${err.message}`);
        } finally {
            setResendLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setShowResend(false);

        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();

        if (!trimmedUsername || !trimmedPassword) {
            setError("Username dan Password tidak boleh kosong.");
            setLoading(false);
            return;
        }

        if (!isSupabaseConfigured()) {
            setError("Database belum terhubung. Cek konfigurasi.");
            setLoading(false);
            return;
        }

        try {
            // 1. Identify Login Type (Email or Username)
            let loginEmail = trimmedUsername;
            console.log("Attempting login for:", loginEmail);

            if (!trimmedUsername.includes('@')) {
                const { data: userData } = await supabase
                    .from('app_users')
                    .select('email')
                    .ilike('username', trimmedUsername)
                    .maybeSingle();

                if (userData && userData.email && userData.email.includes('@')) {
                    loginEmail = userData.email;
                    console.log("Found email for username:", loginEmail);
                } else if (userData) {
                    // User exists but has no email — use synthetic email format
                    loginEmail = `${trimmedUsername.toLowerCase().replace(/[^a-z0-9]/g, '-')}@aruneeka.id`;
                    console.log("Using synthetic email:", loginEmail);
                }
            }

            // 2. Try Standard Supabase Auth Login
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: trimmedPassword
            });

            // 3. FALLBACK: Migration logic for old users
            if (authError) {
                // Specific Check for Email Not Confirmed
                if (authError.message.toLowerCase().includes('email not confirmed') || authError.message.toLowerCase().includes('confirm your email')) {
                    setShowResend(true);
                    throw new Error("⚠️ Email Anda belum dikonfirmasi. Periksa inbox email Anda untuk memverifikasi akun.");
                }

                if (authError.message === 'Invalid login credentials') {
                    // Try finding legacy user by email OR username
                    let legacyUser = null;

                    if (loginEmail && loginEmail.includes('@')) {
                        const { data } = await supabase
                            .from('app_users')
                            .select('*')
                            .ilike('email', loginEmail)
                            .maybeSingle();
                        legacyUser = data;
                    }

                    // If not found by email, try by username directly (for invited users without email)
                    if (!legacyUser) {
                        const { data } = await supabase
                            .from('app_users')
                            .select('*')
                            .ilike('username', trimmedUsername)
                            .maybeSingle();
                        legacyUser = data;
                    }

                    if (legacyUser && legacyUser.password) {
                        const isHash = legacyUser.password.startsWith('$2');
                        const isMatch = isHash
                            ? bcrypt.compareSync(trimmedPassword, legacyUser.password)
                            : (trimmedPassword === legacyUser.password);

                        if (isMatch) {
                            console.log("Legacy password match! Starting migration...");

                            // Generate a synthetic email for users without one
                            const migrationEmail = legacyUser.email && legacyUser.email.includes('@')
                                ? legacyUser.email
                                : `${legacyUser.username.toLowerCase().replace(/[^a-z0-9]/g, '-')}@aruneeka.id`;

                            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                                email: migrationEmail,
                                password: trimmedPassword,
                                options: { data: { full_name: legacyUser.full_name, username: legacyUser.username } }
                            });

                            if (signUpError) {
                                // Handle email rate limit and already registered cases
                                const isRateLimit = signUpError.message.toLowerCase().includes('rate limit') ||
                                    signUpError.message.toLowerCase().includes('too many requests') ||
                                    (signUpError as any).status === 429;

                                if (signUpError.message.includes('already registered') || isRateLimit) {
                                    if (isRateLimit) {
                                        throw new Error("⚠️ Terlalu banyak permintaan login (Rate Limit). Silakan tunggu 1 menit dan coba klik 'Masuk Sekarang' lagi.");
                                    }

                                    // Try signing in directly if email already exists
                                    const { error: retryError } = await supabase.auth.signInWithPassword({
                                        email: migrationEmail,
                                        password: trimmedPassword
                                    });
                                    if (retryError) {
                                        // Specific Check for Email Not Confirmed during migration
                                        if (retryError.message.toLowerCase().includes('email not confirmed')) {
                                            setShowResend(true);
                                            throw new Error("⚠️ Email migrasi Anda belum dikonfirmasi. Silakan cek inbox email Anda.");
                                        }

                                        // If direct signin fails, update app_users email and show success
                                        // This handles case where auth already exists but app_users doesn't have email
                                        try {
                                            await supabase.from('app_users').update({
                                                email: migrationEmail,
                                                subscription_package: legacyUser.subscription_package || 'Free'
                                            }).eq('id', legacyUser.id);
                                        } catch (updateErr) {
                                            console.warn("Email update warning:", updateErr);
                                        }
                                        throw new Error(`Login gagal: ${retryError.message}`);
                                    }
                                    navigate('/');
                                    return;
                                }
                                console.error("Migration Error:", signUpError);
                                throw new Error(`Gagal migrasi: ${signUpError.message}`);
                            }

                            // Update app_users with email and ensure subscription_package is set
                            if (!legacyUser.email || !legacyUser.email.includes('@') || !legacyUser.subscription_package) {
                                await supabase.from('app_users').update({
                                    email: migrationEmail,
                                    subscription_package: legacyUser.subscription_package || 'Free'
                                }).eq('id', legacyUser.id);
                            }

                            // Update app_users ID to match auth user ID if they differ
                            if (signUpData?.user && signUpData.user.id !== legacyUser.id) {
                                await supabase.from('app_users').update({
                                    email: migrationEmail,
                                    subscription_package: legacyUser.subscription_package || 'Free'
                                }).eq('id', legacyUser.id);
                            }

                            setError("✅ Berhasil! Akun Anda telah ditingkatkan ke sistem keamanan baru. Silakan Masuk Kembali sekarang.");
                            setLoading(false);
                            return;
                        } else {
                            throw new Error("username atau Password Salah.");
                        }
                    } else {
                        throw new Error("Akun tidak ditemukan. Silakan hubungi admin.");
                    }
                }

                throw new Error(`Login gagal: ${authError.message}`);
            }

            const user = authData.user;
            if (!user) throw new Error("Gagal mendapatkan data user.");

            // 4. Fetch Full Profile from app_users (by ID first, fallback to email for migrated users)
            let profile = null;
            const { data: profileById } = await supabase
                .from('app_users')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (profileById) {
                profile = profileById;
            } else if (user.email) {
                const { data: profileByEmail } = await supabase
                    .from('app_users')
                    .select('*')
                    .ilike('email', user.email)
                    .maybeSingle();
                profile = profileByEmail;
            }

            if (!profile) {
                throw new Error("Profil pengguna tidak ditemukan di database.");
            }

            // 5. Permission & Subscription Verification
            if (profile.is_active === false) {
                await supabase.auth.signOut();
                throw new Error("Akun Anda telah dinonaktifkan.");
            }

            if (profile.is_verified === false && profile.role !== 'Developer') {
                await supabase.auth.signOut();
                throw new Error("Akun Anda belum diverifikasi oleh Administrator.");
            }

            // Check Expiry
            if (profile.subscription_end) {
                const endDate = new Date(profile.subscription_end);
                if (new Date() > endDate) {
                    await supabase.from('app_users').update({ is_active: false }).eq('id', profile.id);
                    await supabase.auth.signOut();
                    throw new Error(`Langganan Anda berakhir pada ${endDate.toLocaleString('id-ID')}.`);
                }
            }

            // Success: Activity log
            await logActivity({ user_id: profile.id, action: 'LOGIN' });

            // Mark email setup status
            if (profile.email && profile.email.includes('@') && !profile.email.endsWith('@aruneeka.id')) {
                localStorage.setItem('email_setup_complete', 'true');
            } else {
                localStorage.removeItem('email_setup_complete');
            }

            // Navigation will be handled by AuthProvider's state change
            navigate('/');

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Login gagal.');
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
                            label="Username / Email"
                            placeholder="Contoh: arunika atau arunika@email.com"
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
                            <div className="space-y-3">
                                <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-start gap-2">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>

                                {showResend && (
                                    <button
                                        type="button"
                                        onClick={handleResendEmail}
                                        disabled={resendLoading}
                                        className="w-full py-2 px-4 bg-white border-2 border-slate-200 hover:border-accent hover:text-accent text-slate-600 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        {resendLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                                        Kirim Ulang Email Konfirmasi
                                    </button>
                                )}
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