import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { fetchActivityLogs } from '../services/activityService';
import {
    History,
    Search,
    Filter,
    User,
    Calendar,
    Tag,
    Info,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    RefreshCcw,
    Activity,
    Layers
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const ActivityLog: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState('all');

    const tenantId = localStorage.getItem('tenant_id');
    const userRole = localStorage.getItem('user_role');

    useEffect(() => {
        fetchWorkspaces();
        loadLogs();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('activity_logs_realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'activity_logs' },
                () => {
                    loadLogs();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        loadLogs();
    }, [selectedWorkspace]);

    const fetchWorkspaces = async () => {
        try {
            const userId = localStorage.getItem('user_id');
            const currentUserAvatar = localStorage.getItem('user_avatar') || '';

            let wsQuery = supabase.from('workspaces').select('id, name');

            // Apply same privacy logic as ContentPlan
            if (userRole !== 'Developer') {
                wsQuery = wsQuery.or(`owner_id.eq.${userId},members.cs.{"${currentUserAvatar}"}`);
            }

            const { data } = await wsQuery.order('name');
            if (data) setWorkspaces(data);
        } catch (err) {
            console.error('Failed to fetch workspaces:', err);
        }
    };

    const loadLogs = async () => {
        setLoading(true);
        try {
            let wsIdToFetch: string | string[] | undefined = undefined;

            if (selectedWorkspace !== 'all') {
                wsIdToFetch = selectedWorkspace;
            } else if (userRole !== 'Developer') {
                // Fetch only from workspaces we have access to
                const wsIds = workspaces.map(w => w.id);
                // If we don't have any workspaces yet, wait for them
                if (wsIds.length === 0) {
                    setLogs([]);
                    setLoading(false);
                    return;
                }
                wsIdToFetch = wsIds;
            }

            const data = await fetchActivityLogs(wsIdToFetch);
            setLogs(data || []);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        if (action.includes('CREATE')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (action.includes('UPDATE')) return 'bg-amber-100 text-amber-700 border-amber-200';
        if (action.includes('DELETE')) return 'bg-red-100 text-red-700 border-red-200';
        if (action.includes('LOGIN')) return 'bg-sky-100 text-sky-700 border-sky-200';
        if (action.includes('VERIFY')) return 'bg-purple-100 text-purple-700 border-purple-200';
        return 'bg-slate-100 text-slate-700 border-slate-300';
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.actor?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.actor?.username?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesAction = actionFilter === 'all' || log.action === actionFilter;

        return matchesSearch && matchesAction;
    });

    return (
        <div className="px-4 md:px-6 py-6 space-y-6 w-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent text-white rounded-2xl flex items-center justify-center shadow-hard border-2 border-slate-900">
                        <History size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">Log Aktivitas Tim</h1>
                        <p className="text-sm font-bold text-slate-500 italic">Pantau setiap perubahan dan aksi dalam tim Anda.</p>
                    </div>
                </div>
                <Button
                    variant="secondary"
                    onClick={loadLogs}
                    isLoading={loading}
                    icon={<RefreshCcw size={18} />}
                >
                    Segarkan
                </Button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-3xl border-4 border-slate-900 shadow-hard-mini">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cari aksi atau pengguna..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:ring-0 transition-all font-bold text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:ring-0 transition-all font-bold text-sm appearance-none"
                        value={selectedWorkspace}
                        onChange={(e) => setSelectedWorkspace(e.target.value)}
                    >
                        <option value="all">Semua Workspace</option>
                        {workspaces.map(ws => (
                            <option key={ws.id} value={ws.id}>{ws.name}</option>
                        ))}
                    </select>
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:ring-0 transition-all font-bold text-sm appearance-none"
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                    >
                        <option value="all">Semua Tipe Aksi</option>
                        <option value="LOGIN">Login</option>
                        <option value="CREATE_CONTENT">Buat Konten</option>
                        <option value="UPDATE_CONTENT">Update Konten</option>
                        <option value="DELETE_CONTENT">Hapus Konten</option>
                        <option value="INVITE_USER">Undang Tim</option>
                        <option value="UPDATE_PROFILE">Update Profil</option>
                        <option value="UPDATE_WORKSPACE">Update Workspace</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl">
                    <Activity size={18} className="text-slate-400" />
                    <span className="text-sm font-black text-slate-600">Total: {filteredLogs.length} Aksi</span>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-3xl border-4 border-slate-900 shadow-hard overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white font-black text-sm">
                                <th className="px-6 py-4 uppercase tracking-wider">Waktu</th>
                                <th className="px-6 py-4 uppercase tracking-wider">Workspace</th>
                                <th className="px-6 py-4 uppercase tracking-wider">Aktor</th>
                                <th className="px-6 py-4 uppercase tracking-wider">Aksi</th>
                                <th className="px-6 py-4 uppercase tracking-wider">Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-28"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-48"></div></td>
                                    </tr>
                                ))
                            ) : filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                                                <Calendar size={14} />
                                                {new Date(log.created_at).toLocaleString('id-ID', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-800 font-black text-xs uppercase">
                                                <Layers size={14} className="text-accent" />
                                                {(log as any).workspace?.name || 'Global / System'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full border-2 border-slate-900 overflow-hidden bg-slate-100 shrink-0">
                                                    {log.actor?.avatar_url ? (
                                                        <img src={log.actor.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500">
                                                            <User size={14} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-slate-800">{log.actor?.full_name || 'System'}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 capitalize">@{log.actor?.username || 'system'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black border-2 uppercase tracking-wide ${getActionColor(log.action)}`}>
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-2">
                                                <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                                <div className="text-sm font-bold text-slate-600 line-clamp-2">
                                                    {log.details ? (
                                                        typeof log.details === 'string' ? log.details : JSON.stringify(log.details)
                                                    ) : '-'}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border-2 border-slate-100">
                                                <History size={32} />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800">Belum ada aktivitas tercatat.</p>
                                                <p className="text-sm font-bold text-slate-400">Semua perubahan di tim akan muncul di sini.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Insight */}
            <div className="bg-amber-50 border-4 border-slate-900 p-6 rounded-3xl shadow-hard-mini flex items-center gap-6">
                <div className="w-14 h-14 bg-amber-400 rounded-2xl border-2 border-slate-900 flex items-center justify-center shrink-0">
                    <Tag size={24} className="text-slate-900" />
                </div>
                <div>
                    <h4 className="font-black text-slate-900">Keamanan & Akuntabilitas</h4>
                    <p className="text-sm font-bold text-slate-700">Log ini mencatat aksi administratif krusial. Gunakan data ini untuk memastikan transparansi dalam kolaborasi tim Aruneeka.</p>
                </div>
            </div>
        </div>
    );
};
