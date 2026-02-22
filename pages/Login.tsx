import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Layers, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            // Query to custom table app_users
            // Note: Password is plain text as per user requirement (ar4925) for this demo.
            const { data, error: dbError } = await supabase
                .from('app_users')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (dbError) {
                if (dbError.code === 'PGRST116') {
                    // No rows found
                    throw new Error("Username atau Password salah.");
                } else {
                    console.error(dbError);
                    throw new Error("Gagal terhubung ke database. Pastikan tabel 'app_users' sudah dibuat via SQL Script di Settings.");
                }
            }

            if (data) {
                // Check account active status
                if (data.is_active === false) {
                    throw new Error("Akun Anda telah dinonaktifkan. Hubungi Developer/Admin untuk mengaktifkan kembali.");
                }

                // Check subscription end date
                if (data.subscription_end) {
                    const endDate = new Date(data.subscription_end);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    endDate.setHours(0, 0, 0, 0);
                    if (today > endDate) {
                        // Auto-deactivate in DB
                        await supabase.from('app_users').update({ is_active: false }).eq('id', data.id);
                        throw new Error(`Langganan Anda berakhir pada ${endDate.toLocaleDateString('id-ID')}. Hubungi Developer/Admin untuk memperpanjang.`);
                    }
                }

                // Login Success
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('user_id', data.id);
                localStorage.setItem('user_name', data.full_name || data.username);
                localStorage.setItem('user_role', data.role || 'Member');
                localStorage.setItem('user_avatar', data.avatar_url || 'https://picsum.photos/40/40');
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
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-accent rounded-xl border-2 border-slate-800 flex items-center justify-center mx-auto mb-4 shadow-hard">
                            <Layers className="text-white" size={32} />
                        </div>
                        <h1 className="text-3xl font-black font-heading text-slate-800">Arunika Flow</h1>
                        <p className="text-slate-500">Masuk untuk mengelola kontenmu.</p>
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
                </Card>
            </div>
        </div>
    );
};