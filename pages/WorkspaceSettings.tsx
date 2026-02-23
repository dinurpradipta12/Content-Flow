import React, { useState, useEffect } from 'react';
import { supabase, checkConnectionLatency } from '../services/supabaseClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    Layout,
    Database,
    Monitor,
    Eye,
    EyeOff,
    Bell,
    RefreshCw,
    Save,
    Copy,
    CheckCircle,
    AlertCircle,
    Wifi,
    Terminal,
    Code,
    Smartphone,
    Rocket
} from 'lucide-react';
import { useNotifications } from '../components/NotificationProvider';

interface PageConfig {
    title: string;
    subtitle: string;
}

interface AppConfig {
    app_name: string;
    app_logo: string;
    app_favicon: string;
    page_titles: Record<string, PageConfig>;
    hidden_pages: string[];
    app_version: string;
    changelog: string;
}
const DEFAULT_PAGE_TITLES: Record<string, PageConfig> = {
    'dashboard': { title: 'Halo, Aditya!', subtitle: 'Berikut laporan performa kontenmu bulan ini.' },
    'content-plan': { title: 'Content Plan', subtitle: 'Kelola dan jadwalkan ide konten Anda dengan struktur yang rapi.' },
    'approval': { title: 'Approval System', subtitle: 'Kelola pengajuan dan persetujuan dengan alur kerja dinamis.' },
    'insight': { title: 'Content Data Insight', subtitle: 'Analisa real-time atau input manual metrics untuk perhitungan ER yang presisi.' },
    'carousel': { title: 'Arunika Carousel', subtitle: 'Desain carousel aesthetic.' },
    'kpi': { title: 'Team KPI Board', subtitle: 'Monitor performa dan pencapaian tim secara real-time.' },
    'messages': { title: 'Messages', subtitle: 'Kolaborasi dan komunikasi instan bersama tim project Anda.' },
    'team': { title: 'Team Management', subtitle: 'Kelola akses anggota dalam workspace spesifik Anda.' },
};

export const WorkspaceSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'interface' | 'database'>('interface');
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [latency, setLatency] = useState<number>(0);
    const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'checking'>('checking');

    // Form States
    const [changelogInput, setChangelogInput] = useState('');
    const [sbUrl, setSbUrl] = useState(localStorage.getItem('sb_url') || '');
    const [sbKey, setSbKey] = useState(localStorage.getItem('sb_key') || '');

    const { sendNotification } = useNotifications();

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('app_config').select('*').single();
            if (data) {
                // Merge with default titles to ensure UI is populated if DB is missing some keys
                const mergedTitles = { ...DEFAULT_PAGE_TITLES, ...(data.page_titles || {}) };
                setConfig({ ...data, page_titles: mergedTitles });
                setChangelogInput(data.changelog || '');
            }

            // Check DB
            const ms = await checkConnectionLatency();
            setLatency(ms);
            setDbStatus(ms >= 0 ? 'connected' : 'error');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleSaveInterface = async () => {
        if (!config) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('app_config').update({
                page_titles: config.page_titles || {},
                hidden_pages: config.hidden_pages || []
            }).eq('id', 1);

            if (error) throw error;
            alert('Konfigurasi antarmuka berhasil disimpan secara global!');
        } catch (err) {
            alert('Gagal menyimpan konfigurasi.');
        } finally {
            setSaving(false);
        }
    };

    const handleSendUpdate = async () => {
        if (!config) return;
        if (!changelogInput.trim()) return alert('Harap isi changelog sebelum update.');

        setSaving(true);
        try {
            const newVersion = generateNextVersion(config.app_version);

            // 1. Update app_config
            const { error } = await supabase.from('app_config').update({
                app_version: newVersion,
                changelog: changelogInput,
                last_update_notif: new Date().toISOString()
            }).eq('id', 1);

            if (error) throw error;

            // 2. Clear changelog input
            setChangelogInput('');

            // 3. Update local state
            setConfig(prev => prev ? { ...prev, app_version: newVersion, changelog: changelogInput } : null);

            alert(`Versi ${newVersion} berhasil dideploy! Notifikasi akan muncul otomatis di semua user.`);
        } catch (err) {
            alert('Gagal mengirim update.');
        } finally {
            setSaving(false);
        }
    };

    const generateNextVersion = (current?: string) => {
        const parts = (current || '1.0.0').split('.').map(Number);
        parts[2] += 1; // Increment patch
        if (parts[2] > 9) {
            parts[2] = 0;
            parts[1] += 1;
        }
        if (parts[1] > 9) {
            parts[1] = 0;
            parts[0] += 1;
        }
        return parts.join('.');
    };

    const togglePageVisibility = (path: string) => {
        if (!config) return;
        const currentList = config.hidden_pages || [];
        const isHidden = currentList.includes(path);
        const newList = isHidden
            ? currentList.filter(p => p !== path)
            : [...currentList, path];

        setConfig({ ...config, hidden_pages: newList });
    };

    const updatePageTitle = (id: string, field: 'title' | 'subtitle', val: string) => {
        if (!config) return;
        const newTitles = { ...(config.page_titles || {}) };
        if (!newTitles[id]) return;
        newTitles[id][field] = val;
        setConfig({ ...config, page_titles: newTitles });
    };

    // SQL Templates
    const SQL_TEMPLATES = [
        { name: 'Core Tables', code: '-- Create all base tables\nCREATE TABLE workspaces ...' },
        { name: 'App Config Extension', code: '-- Add missing columns\nALTER TABLE app_config ADD COLUMN page_titles JSONB ...' },
        { name: 'Chat System', code: '-- Chat & Messages\nCREATE TABLE workspace_chat_messages ...' }
    ];

    if (loading && !config) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
                <Loader icon={<RefreshCw size={40} />} />
                <p className="font-black text-slate-400 animate-pulse">MEMUAT KONFIGURASI WORKSPACE...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-4xl md:text-6xl font-heading font-black text-slate-900 tracking-tighter uppercase italic">
                        Workspace Settings
                    </h2>
                    <p className="text-slate-500 font-bold mt-2 pl-1 border-l-4 border-accent">Configurasi Global & Pusat Kendali Developer.</p>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a]">
                    <button
                        onClick={() => setActiveTab('interface')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'interface' ? 'bg-white text-slate-900 border-2 border-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Monitor size={16} /> Interface
                    </button>
                    <button
                        onClick={() => setActiveTab('database')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'database' ? 'bg-white text-slate-900 border-2 border-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Database size={16} /> Database
                    </button>
                </div>
            </div>

            {activeTab === 'interface' ? (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* LEFT: PAGE TITLES & VISIBILITY */}
                    <div className="xl:col-span-8 space-y-8">
                        <Card title="Workspace Interface" icon={<Layout size={20} />} headerColor="purple">
                            <div className="p-6 space-y-8">
                                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
                                    <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm">Custom Page Headings</h4>
                                    <Button onClick={handleSaveInterface} disabled={saving} icon={<Save size={16} />}>
                                        {saving ? 'Simpan...' : 'Simpan Semua'}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {config && (Object.entries(config.page_titles || {}) as [string, PageConfig][]).map(([id, p]) => (
                                        <div key={id} className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 hover:border-accent group transition-all">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="px-2 py-1 bg-slate-900 text-white text-[10px] font-black uppercase rounded">{id}</span>
                                                <button
                                                    onClick={() => togglePageVisibility(id)}
                                                    className={`p-2 rounded-lg border-2 transition-all ${(config.hidden_pages || []).includes(id) ? 'bg-red-50 text-red-500 border-red-200' : 'bg-white text-slate-400 border-slate-100 hover:border-accent'}`}
                                                    title={(config.hidden_pages || []).includes(id) ? 'Status: Tersembunyi' : 'Status: Terlihat'}
                                                >
                                                    {(config.hidden_pages || []).includes(id) ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                <input
                                                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-900 focus:border-accent outline-none"
                                                    value={p.title}
                                                    onChange={e => updatePageTitle(id, 'title', e.target.value)}
                                                    placeholder="Judul Halaman"
                                                />
                                                <input
                                                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 focus:border-accent outline-none"
                                                    value={p.subtitle}
                                                    onChange={e => updatePageTitle(id, 'subtitle', e.target.value)}
                                                    placeholder="Sub Judul / Deskripsi"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* RIGHT: VERSION UPDATE */}
                    <div className="xl:col-span-4 space-y-8">
                        <div className="bg-slate-900 rounded-3xl border-4 border-slate-900 shadow-hard overflow-hidden">
                            <div className="p-6 bg-accent border-b-4 border-slate-900">
                                <div className="w-12 h-12 bg-white rounded-2xl border-4 border-slate-900 flex items-center justify-center mb-4 shadow-[3px_3px_0px_#000]">
                                    <Smartphone className="text-slate-900" size={24} />
                                </div>
                                <h3 className="text-2xl font-heading font-black text-white uppercase italic">Version Update</h3>
                                <p className="text-white/80 font-bold text-xs mt-1">Deploy pembaharuan ke seluruh user.</p>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Version</p>
                                        <p className="text-2xl font-black text-white font-mono">{config?.app_version || '1.0.0'}</p>
                                    </div>
                                    <div className="h-10 w-[2px] bg-slate-800"></div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Version</p>
                                        <p className="text-2xl font-black text-emerald-400 font-mono italic">
                                            {config ? generateNextVersion(config.app_version) : '...'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">What's New? (Changelog)</label>
                                    <textarea
                                        rows={5}
                                        value={changelogInput}
                                        onChange={e => setChangelogInput(e.target.value)}
                                        className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 text-sm font-bold text-white focus:border-accent outline-none transition-all placeholder:text-slate-600"
                                        placeholder="Tuliskan perubahan, penambahan fitur, atau perbaikan bug di sini..."
                                    />
                                </div>

                                <button
                                    onClick={handleSendUpdate}
                                    disabled={saving}
                                    className="w-full bg-white hover:bg-emerald-400 text-slate-900 font-black py-4 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_#2DD4BF] transition-all flex items-center justify-center gap-3 active:translate-x-1 active:translate-y-1 active:shadow-none"
                                >
                                    <Rocket size={20} />
                                    SEND UPDATE NOTIFICATION
                                </button>

                                <p className="text-[10px] font-bold text-slate-500 text-center leading-relaxed">
                                    Tombol ini akan memperbarui versi di seluruh database user secara realtime. User akan diminta untuk meraload halaman.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT: CONNECTION CONFIG */}
                    <div className="lg:col-span-5 space-y-6">
                        <Card title="Supabase Connection" icon={<Database size={20} />} headerColor="primary">
                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border-2 border-slate-200">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-4 border-slate-900 shadow-[2px_2px_0px_#000] ${dbStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400'}`}>
                                        <Wifi size={24} className="text-slate-900" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Hubungan</p>
                                        <p className={`text-lg font-black ${dbStatus === 'connected' ? 'text-emerald-600 uppercase' : 'text-red-600 uppercase italic'}`}>
                                            {dbStatus === 'connected' ? 'Connected' : 'Disconnected'}
                                        </p>
                                    </div>
                                    {dbStatus === 'connected' && (
                                        <div className="ml-auto text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latency</p>
                                            <p className="font-black text-slate-900">{latency.toFixed(0)}ms</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4 border-t-2 border-slate-100">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Supabase Project URL</label>
                                        <input
                                            value={sbUrl}
                                            onChange={e => setSbUrl(e.target.value)}
                                            className="w-full bg-white border-4 border-slate-900 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 shadow-[4px_4px_0px_transparent] focus:shadow-hard transition-all outline-none"
                                            placeholder="https://xxxxx.supabase.co"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Supabase Anon Key</label>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                value={sbKey}
                                                onChange={e => setSbKey(e.target.value)}
                                                className="w-full bg-white border-4 border-slate-900 rounded-2xl px-4 py-3 text-sm font-black text-slate-900 shadow-[4px_4px_0px_transparent] focus:shadow-hard transition-all outline-none"
                                                placeholder="..."
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full h-14"
                                        onClick={() => {
                                            localStorage.setItem('sb_url', sbUrl);
                                            localStorage.setItem('sb_key', sbKey);
                                            window.location.reload();
                                        }}
                                        icon={<RefreshCw size={18} />}
                                    >
                                        Hubungkan & Reload Aplikasi
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* RIGHT: SQL TEMPLATES */}
                    <div className="lg:col-span-7 space-y-6">
                        <Card title="Supabase SQL Templates" icon={<Terminal size={20} />} headerColor="slate">
                            <div className="p-6 space-y-6">
                                <p className="text-sm font-bold text-slate-500">Salin skrip berikut ke dalam **SQL Editor** Supabase Anda untuk memastikan struktur database terbaru.</p>

                                <div className="space-y-6">
                                    {SQL_TEMPLATES.map((tmpl, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex items-center gap-2">
                                                    <Code size={14} className="text-accent" />
                                                    <span className="text-xs font-black text-slate-800 uppercase tracking-widest">{tmpl.name}</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(tmpl.code);
                                                        alert('SQL copied!');
                                                    }}
                                                    className="flex items-center gap-2 text-[10px] font-black text-accent hover:underline uppercase tracking-widest bg-accent/5 px-2 py-1 rounded-lg"
                                                >
                                                    <Copy size={12} /> Copy SQL
                                                </button>
                                            </div>
                                            <div className="bg-slate-900 rounded-2xl border-4 border-slate-900 shadow-hard p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed">
                                                    {tmpl.code}
                                                </pre>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};

const Loader = ({ icon }: { icon: React.ReactNode }) => (
    <div className="border-4 border-slate-900 p-4 rounded-2xl bg-white shadow-hard animate-bounce">
        <div className="animate-spin text-accent">
            {icon}
        </div>
    </div>
);
