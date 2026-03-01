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
    const [showBypassCode, setShowBypassCode] = useState(false);
    const [bypassCode, setBypassCode] = useState('');
    const [backupUser, setBackupUser] = useState<any>(null);

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

            // Fetch user data first to check if they are an invited user
            let preloadedUser: any = null;
            if (!trimmedUsername.includes('@')) {
                const { data: userData } = await supabase
                    .from('app_users')
                    .select('*')
                    .ilike('username', trimmedUsername)
                    .maybeSingle();

                preloadedUser = userData;

                if (userData && userData.email && userData.email.includes('@') && !userData.email.endsWith('@aruneeka.id')) {
                    loginEmail = userData.email;
                    console.log("Found real email for username:", loginEmail);
                } else if (userData) {
                    // User exists but has no real email (invited user) — use synthetic email format
                    loginEmail = `${trimmedUsername.toLowerCase().replace(/[^a-z0-9]/g, '-')}@aruneeka.id`;
                    console.log("Using synthetic email:", loginEmail);
                }
            }

            // EARLY CHECK: If user is an invited user (has parent_user_id or invited_by, or synthetic email),
            // try legacy auth first to avoid email confirmation issues
            const isInvitedUser = preloadedUser && (
                preloadedUser.parent_user_id ||
                preloadedUser.invited_by ||
                (preloadedUser.email && preloadedUser.email.endsWith('@aruneeka.id'))
            );

            if (isInvitedUser && preloadedUser.password) {
                const isHash = preloadedUser.password.startsWith('$2');
                const isMatch = isHash
                    ? bcrypt.compareSync(trimmedPassword, preloadedUser.password)
                    : (trimmedPassword === preloadedUser.password);

                if (isMatch) {
                    console.log("Invited user - using legacy auth bypass");
                    // Use legacy auth for invited users to bypass email confirmation
                    localStorage.setItem('isLegacyAuth', 'true');
                    localStorage.setItem('user_id', preloadedUser.id);
                    localStorage.setItem('user_role', preloadedUser.role || 'Member');
                    localStorage.setItem('isAuthenticated', 'true');
                    if (preloadedUser.username) localStorage.setItem('user_username', preloadedUser.username);
                    if (preloadedUser.full_name) localStorage.setItem('user_name', preloadedUser.full_name);
                    if (preloadedUser.avatar_url) localStorage.setItem('user_avatar', preloadedUser.avatar_url);
                    if (preloadedUser.parent_user_id) localStorage.setItem('tenant_id', preloadedUser.parent_user_id);
                    if (preloadedUser.admin_id) localStorage.setItem('tenant_id', preloadedUser.admin_id);

                    // Check if account is active
                    if (preloadedUser.is_active === false) {
                        throw new Error("Akun Anda telah dinonaktifkan.");
                    }

                    await logActivity({ user_id: preloadedUser.id, action: 'LOGIN' });
                    navigate('/');
                    window.location.reload();
                    return;
                } else {
                    throw new Error("Username atau Password salah.");
                }
            }

            // 2. Try Standard Supabase Auth Login (for self-registered users with real email)
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: trimmedPassword
            });

            // 3. FALLBACK: Migration logic for old users
            if (authError) {
                // Specific Check for Email Not Confirmed
                if (authError.message.toLowerCase().includes('email not confirmed') || authError.message.toLowerCase().includes('confirm your email')) {
                    console.log("Email not confirmed in Supabase, checking local database fallback...");

                    // Try to find user in app_users to see if we can do a local bypass
                    const { data: localUser } = await supabase
                        .from('app_users')
                        .select('*')
                        .or(`email.ilike.${loginEmail},username.ilike.${trimmedUsername}`)
                        .maybeSingle();

                    if (localUser) {
                        setBackupUser(localUser);

                        // If we have a hashed password, try matching it
                        if (localUser.password) {
                            const isHash = localUser.password.startsWith('$2');
                            const isMatch = isHash
                                ? bcrypt.compareSync(trimmedPassword, localUser.password)
                                : (trimmedPassword === localUser.password);

                            if (isMatch) {
                                console.log("Local password match! Bypassing email confirmation for:", localUser.username);
                                loginLocally(localUser);
                                return;
                            }
                        }

                        // If password didn't match OR was empty (new user bug), show bypass code option
                        setShowResend(true);
                        setShowBypassCode(true);
                        throw new Error("⚠️ Email belum dikonfirmasi. Gunakan 'Kode Aktivasi' untuk masuk.");
                    }

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
                                        // EMERGENCY FALLBACK: Allow legacy login if Supabase is rate limiting us
                                        console.warn("Rate limit hit, using legacy fallback login for user:", legacyUser.username);

                                        localStorage.setItem('isLegacyAuth', 'true');
                                        localStorage.setItem('user_id', legacyUser.id);
                                        localStorage.setItem('user_role', legacyUser.role || 'Member');
                                        localStorage.setItem('isAuthenticated', 'true');
                                        if (legacyUser.username) localStorage.setItem('user_username', legacyUser.username);
                                        if (legacyUser.full_name) localStorage.setItem('user_name', legacyUser.full_name);
                                        if (legacyUser.avatar_url) localStorage.setItem('user_avatar', legacyUser.avatar_url);
                                        if (legacyUser.parent_user_id) localStorage.setItem('tenant_id', legacyUser.parent_user_id);

                                        setError("⚠️ Sistem sibuk. Anda masuk dengan 'Mode Kompatibilitas'. Keamanan akun akan ditingkatkan otomatis nanti.");

                                        setTimeout(() => {
                                            navigate('/');
                                            window.location.reload(); // Ensure AuthProvider re-checks localStorage
                                        }, 2000);
                                        return;
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

    const loginLocally = async (u: any) => {
        // Bypass mechanism
        localStorage.setItem('isLegacyAuth', 'true');
        localStorage.setItem('user_id', u.id);
        localStorage.setItem('user_role', u.role || 'Member');
        localStorage.setItem('isAuthenticated', 'true');
        if (u.username) localStorage.setItem('user_username', u.username);
        if (u.full_name) localStorage.setItem('user_name', u.full_name);
        if (u.avatar_url) localStorage.setItem('user_avatar', u.avatar_url);
        if (u.parent_user_id) localStorage.setItem('tenant_id', u.parent_user_id);
        if (u.admin_id) localStorage.setItem('tenant_id', u.admin_id);

        await logActivity({ user_id: u.id, action: 'BYPASS_LOGIN', details: { method: showBypassCode ? 'activation_code' : 'password_match' } });
        navigate('/');
        window.location.reload();
    };

    const handleBypassLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!backupUser || !bypassCode.trim()) return;

        console.log("Checking activation code fallback...");
        const normalizedInput = bypassCode.trim().toUpperCase();

        // Final logic: check against subscription_code OR username (if no code in DB)
        const correctCode = backupUser.subscription_code?.trim()?.toUpperCase();
        const fallbackUsernameCode = !correctCode ? backupUser.username?.trim()?.toUpperCase() : null;

        if ((correctCode && normalizedInput === correctCode) || (fallbackUsernameCode && normalizedInput === fallbackUsernameCode)) {
            console.log("Activation verified via " + (correctCode ? "Order ID" : "Username") + "! Granting access...");
            loginLocally(backupUser);
        } else {
            const errorMsg = correctCode
                ? "❌ Kode Aktivasi (Order ID) salah."
                : "❌ Kode aktivasi salah. Gunakan USERNAME Anda (HURUF BESAR) sebagai kode aktivasi darurat.";
            setError(errorMsg);
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

                                {showBypassCode && (
                                    <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <p className="text-[11px] font-bold text-amber-800 leading-relaxed text-center">
                                            Masukkan **Order ID / Kode Langganan** Anda sebagai kode aktivasi darurat:
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                className="flex-1 bg-white border-2 border-amber-300 rounded-lg px-3 py-2 text-sm font-black text-center tracking-widest outline-none focus:border-amber-500 uppercase"
                                                placeholder="ORDER-XXX-YYY"
                                                value={bypassCode}
                                                onChange={(e) => setBypassCode(e.target.value)}
                                            />
                                            <button
                                                onClick={handleBypassLogin}
                                                className="px-4 py-2 bg-amber-600 text-white font-black rounded-lg hover:bg-amber-700 transition-colors text-xs"
                                            >
                                                AKTIVASI
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {showResend && !showBypassCode && (
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

                    {/* Emergency Notes for Unconfirmed Emails */}
                    <div className="mt-6 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm shrink-0">
                                <AlertCircle size={16} className="text-accent" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Kendala Konfirmasi Email?</h4>
                                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                    Jika email konfirmasi belum masuk, tetap coba login. Jika muncul pesan "Email belum dikonfirmasi", gunakan **Username** Anda (HURUF BESAR) sebagai kode aktivasi darurat di kolom yang disediakan.
                                </p>
                            </div>
                        </div>
                    </div>

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