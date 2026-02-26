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
    Layers,
    Wifi,
    WifiOff,
    Clock,
    Users
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
    const [presenceUsers, setPresenceUsers] = useState<any[]>([]);
    const [presenceLoading, setPresenceLoading] = useState(true);

    const tenantId = localStorage.getItem('tenant_id');
    const userRole = localStorage.getItem('user_role');
    const userId = localStorage.getItem('user_id');

    // Track if workspaces have been loaded
    const [workspacesLoaded, setWorkspacesLoaded] = useState(false);

    useEffect(() => {
        const init = async () => {
            await fetchWorkspaces();
            setWorkspacesLoaded(true);
        };
        init();
        fetchPresenceUsers();

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

        // Subscribe to user presence changes
        const presenceChannel = supabase
            .channel('activity_user_presence')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'app_users' },
                (payload: any) => {
                    // Only update if online_status changed
                    if (payload.new.online_status !== payload.old?.online_status) {
                        setPresenceUsers(prev => prev.map(u =>
                            u.id === payload.new.id
                                ? { ...u, online_status: payload.new.online_status, last_activity_at: payload.new.last_activity_at }
                                : u
                        ));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(presenceChannel);
        };
    }, []);

    // Load logs after workspaces are ready, or when workspace filter changes
    useEffect(() => {
        if (workspacesLoaded) {
            loadLogs();
        }
    }, [workspacesLoaded, selectedWorkspace]);

    const fetchWorkspaces = async () => {
        try {
            const currentUserAvatar = localStorage.getItem('user_avatar') || '';

            let wsQuery = supabase.from('workspaces').select('id, name, owner_id, members');

            // Apply same privacy logic as ContentPlan
            if (userRole !== 'Developer') {
                let orCond = `owner_id.eq.${userId}`;
                if (userId) orCond += `,members.cs.{"${userId}"}`;
                if (currentUserAvatar && !currentUserAvatar.startsWith('data:')) {
                    orCond += `,members.cs.{"${currentUserAvatar}"}`;
                }
                wsQuery = wsQuery.or(orCond);
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
            if (selectedWorkspace !== 'all') {
                // Specific workspace selected — fetch only that
                const data = await fetchActivityLogs(selectedWorkspace);
                setLogs(data || []);
            } else if (userRole === 'Developer') {
                // Developer sees everything
                const data = await fetchActivityLogs(undefined);
                setLogs(data || []);
            } else {
                // Non-developer: fetch logs from their workspaces + global/system logs (workspace_id is null)
                const wsIds = workspaces.map(w => w.id);

                // Fetch workspace-specific logs
                let wsLogs: any[] = [];
                if (wsIds.length > 0) {
                    wsLogs = (await fetchActivityLogs(wsIds)) || [];
                }

                // Also fetch global/system logs for this user (LOGIN, UPDATE_PROFILE, etc.)
                const { data: globalLogs } = await supabase
                    .from('activity_logs')
                    .select(`
                        *,
                        actor:user_id(full_name, username, avatar_url)
                    `)
                    .is('workspace_id', null)
                    .eq('user_id', userId!)
                    .order('created_at', { ascending: false })
                    .limit(50);

                // Merge and sort by date
                const allLogs = [...wsLogs, ...(globalLogs || [])];
                allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setLogs(allLogs.slice(0, 100));
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPresenceUsers = async () => {
        setPresenceLoading(true);
        try {
            const { data } = await supabase
                .from('app_users')
                .select('id, full_name, username, avatar_url, role, online_status, last_activity_at')
                .eq('is_active', true)
                .order('online_status', { ascending: true });
            if (data) setPresenceUsers(data);
        } catch (err) {
            console.error('Failed to fetch presence users:', err);
        } finally {
            setPresenceLoading(false);
        }
    };

    // Filter presence users by selected workspace
    const filteredPresenceUsers = React.useMemo(() => {
        if (selectedWorkspace === 'all') return presenceUsers;

        const ws = workspaces.find(w => w.id === selectedWorkspace);
        if (!ws) return presenceUsers;

        // Get member identifiers from workspace (avatar URLs + user IDs)
        const memberIdentifiers = ws.members || [];
        const ownerId = ws.owner_id;

        return presenceUsers.filter(user => {
            // Check if user is the owner
            if (user.id === ownerId) return true;
            // Check if user's ID is in members
            if (memberIdentifiers.includes(user.id)) return true;
            // Check if user's avatar_url is in members
            if (user.avatar_url && memberIdentifiers.includes(user.avatar_url)) return true;
            return false;
        });
    }, [presenceUsers, selectedWorkspace, workspaces]);

    const onlineUsers = filteredPresenceUsers.filter(u => u.online_status === 'online');
    const idleUsers = filteredPresenceUsers.filter(u => u.online_status === 'idle');
    const offlineUsers = filteredPresenceUsers.filter(u => !u.online_status || u.online_status === 'offline');

    const getStatusDot = (status: string) => {
        if (status === 'online') return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
        if (status === 'idle') return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]';
        return 'bg-slate-400';
    };

    const getStatusLabel = (status: string) => {
        if (status === 'online') return 'Online';
        if (status === 'idle') return 'Idle';
        return 'Offline';
    };

    const formatLastSeen = (dateStr: string | null) => {
        if (!dateStr) return 'Tidak diketahui';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Baru saja';
        if (diffMin < 60) return `${diffMin} menit lalu`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour} jam lalu`;
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
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

            {/* Main Content: Logs Table + Presence Sidebar */}
            <div className="flex gap-6 items-start">
                {/* Logs Table */}
                <div className="flex-1 min-w-0 bg-white rounded-3xl border-4 border-slate-900 shadow-hard overflow-hidden">
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

                {/* User Presence Sidebar */}
                <div className="w-72 shrink-0 hidden lg:block space-y-4 sticky top-6">
                    {/* Header Card */}
                    <div className="bg-card rounded-2xl border-4 border-slate-900 shadow-hard-mini overflow-hidden">
                        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-white" />
                                <h3 className="font-black text-white text-sm">Status Tim</h3>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {selectedWorkspace !== 'all'
                                    ? workspaces.find(w => w.id === selectedWorkspace)?.name || 'Workspace'
                                    : 'Semua'
                                }
                            </span>
                        </div>

                        {/* Status Summary */}
                        <div className="grid grid-cols-3 border-b-2 border-slate-500/10">
                            <div className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[9px] font-black text-emerald-500 uppercase">Online</span>
                                </div>
                                <span className="text-lg font-black text-foreground">{onlineUsers.length}</span>
                            </div>
                            <div className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]"></div>
                                    <span className="text-[9px] font-black text-amber-500 uppercase">Idle</span>
                                </div>
                                <span className="text-lg font-black text-foreground">{idleUsers.length}</span>
                            </div>
                            <div className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                                    <span className="text-[9px] font-black text-mutedForeground uppercase">Offline</span>
                                </div>
                                <span className="text-lg font-black text-foreground">{offlineUsers.length}</span>
                            </div>
                        </div>

                        {/* User List */}
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar p-2">
                            {presenceLoading ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                                            <div className="w-9 h-9 rounded-full bg-slate-500/10"></div>
                                            <div className="flex-1">
                                                <div className="h-3 bg-slate-500/10 rounded w-20 mb-1"></div>
                                                <div className="h-2 bg-slate-500/5 rounded w-14"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredPresenceUsers.length === 0 ? (
                                <div className="p-6 text-center">
                                    <User size={24} className="text-mutedForeground mx-auto mb-2" />
                                    <p className="text-xs font-bold text-mutedForeground">Tidak ada anggota ditemukan.</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {/* Online users first, then idle, then offline */}
                                    {[...onlineUsers, ...idleUsers, ...offlineUsers].map((user) => (
                                        <div
                                            key={user.id}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-slate-500/10"
                                        >
                                            {/* Avatar with status dot */}
                                            <div className="relative shrink-0">
                                                <div className="w-9 h-9 rounded-full border-2 border-slate-500/20 overflow-hidden bg-slate-500/10">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-mutedForeground">
                                                            <User size={14} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${getStatusDot(user.online_status || 'offline')}`}></div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-foreground truncate">{user.full_name || user.username}</p>
                                                <div className="flex items-center gap-1">
                                                    {user.online_status === 'online' ? (
                                                        <Wifi size={9} className="text-emerald-500" />
                                                    ) : user.online_status === 'idle' ? (
                                                        <Clock size={9} className="text-amber-500" />
                                                    ) : (
                                                        <WifiOff size={9} className="text-mutedForeground" />
                                                    )}
                                                    <span className={`text-[10px] font-bold ${user.online_status === 'online'
                                                        ? 'text-emerald-500'
                                                        : user.online_status === 'idle'
                                                            ? 'text-amber-500'
                                                            : 'text-mutedForeground'
                                                        }`}>
                                                        {user.online_status === 'online'
                                                            ? 'Online'
                                                            : user.online_status === 'idle'
                                                                ? 'Idle'
                                                                : formatLastSeen(user.last_activity_at)
                                                        }
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Role badge */}
                                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${user.role === 'Developer'
                                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                : user.role === 'Admin' || user.role === 'Owner'
                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    : 'bg-slate-500/10 text-mutedForeground border-slate-500/20'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
};
