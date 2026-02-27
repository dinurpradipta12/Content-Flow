import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Layers,
    Instagram,
    Linkedin,
    Youtube,
    Facebook,
    AtSign,
    Calendar,
    User,
    FileText,
    Film,
    FileImage,
    Loader2,
    RefreshCw,
    CheckCircle,
    Clock,
    AlertCircle,
    ChevronRight,
    Filter,
    X,
    Zap,
    Eye,
    ArrowUpRight,
    Hash,
    Circle
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ContentStatus, Platform } from '../types';
import { useAppConfig } from '../components/AppConfigProvider';

// --- TYPES ---
interface FlowItem {
    id: string;
    title: string;
    status: ContentStatus;
    platform: Platform;
    date: string;
    pillar: string;
    type: string;
    pic: string;
    workspace_id: string;
    workspace_name: string;
    workspace_color: string;
    workspace_logo: string;
    priority: string;
}

interface WorkspaceSummary {
    id: string;
    name: string;
    color: string;
    logo_url: string;
    platforms: string[];
    totalContent: number;
    byStatus: Record<string, number>;
}

// --- HELPERS ---
const getPlatformIcon = (platform: Platform | string, size = 14) => {
    switch (platform) {
        case Platform.INSTAGRAM:
        case 'IG':
            return <Instagram size={size} />;
        case Platform.TIKTOK:
        case 'TK':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
            );
        case Platform.LINKEDIN:
        case 'LI':
            return <Linkedin size={size} />;
        case Platform.YOUTUBE:
        case 'YT':
            return <Youtube size={size} />;
        case Platform.FACEBOOK:
        case 'FB':
            return <Facebook size={size} />;
        case Platform.THREADS:
        case 'TH':
            return <AtSign size={size} />;
        default:
            return <FileText size={size} />;
    }
};

const getTypeIcon = (type: string, size = 12) => {
    const t = (type || '').toLowerCase();
    if (t.includes('video') || t.includes('reels')) return <Film size={size} />;
    if (t.includes('carousel')) return <FileImage size={size} />;
    return <FileText size={size} />;
};

const STATUS_CONFIG: Record<ContentStatus, {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
    dotColor: string;
}> = {
    [ContentStatus.TODO]: {
        label: 'To-Do',
        color: 'text-slate-600',
        bg: 'bg-slate-100',
        border: 'border-slate-300',
        icon: <Circle size={14} />,
        dotColor: 'bg-slate-400'
    },
    [ContentStatus.IN_PROGRESS]: {
        label: 'In Progress',
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        border: 'border-blue-300',
        icon: <Clock size={14} />,
        dotColor: 'bg-blue-500'
    },
    [ContentStatus.REVIEW]: {
        label: 'Review',
        color: 'text-amber-600',
        bg: 'bg-amber-100',
        border: 'border-amber-300',
        icon: <Eye size={14} />,
        dotColor: 'bg-amber-500'
    },
    [ContentStatus.SCHEDULED]: {
        label: 'Scheduled',
        color: 'text-purple-600',
        bg: 'bg-purple-100',
        border: 'border-purple-300',
        icon: <Calendar size={14} />,
        dotColor: 'bg-purple-500'
    },
    [ContentStatus.PUBLISHED]: {
        label: 'Published',
        color: 'text-emerald-600',
        bg: 'bg-emerald-100',
        border: 'border-emerald-300',
        icon: <CheckCircle size={14} />,
        dotColor: 'bg-emerald-500'
    }
};

const WORKSPACE_COLORS: Record<string, string> = {
    violet: 'from-violet-500 to-purple-600',
    pink: 'from-pink-500 to-rose-600',
    yellow: 'from-yellow-400 to-amber-500',
    green: 'from-emerald-500 to-teal-600'
};

// --- FLOW ITEM CARD ---
const FlowCard: React.FC<{
    item: FlowItem;
    onClick: (item: FlowItem) => void;
}> = ({ item, onClick }) => {
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG[ContentStatus.TODO];

    return (
        <div
            onClick={() => onClick(item)}
            className="group bg-card border-2 border-border rounded-xl p-3 cursor-pointer hover:-translate-y-1 hover:shadow-hard transition-all duration-200 relative overflow-hidden"
        >
            {/* Workspace color accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${WORKSPACE_COLORS[item.workspace_color] || WORKSPACE_COLORS.violet} rounded-t-xl`} />

            <div className="pt-1 space-y-2">
                {/* Platform + Type */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-mutedForeground">
                        {getPlatformIcon(item.platform)}
                        <span className="text-[10px] font-bold">{item.platform}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-mutedForeground bg-muted px-1.5 py-0.5 rounded border border-border">
                        {getTypeIcon(item.type)}
                        <span>{item.type}</span>
                    </div>
                </div>

                {/* Title */}
                <h4 className="font-bold text-foreground text-xs leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                    {item.title}
                </h4>

                {/* Pillar */}
                {item.pillar && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-mutedForeground">
                        <Hash size={10} />
                        <span className="truncate">{item.pillar}</span>
                    </div>
                )}

                {/* Footer: Date + PIC */}
                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-mutedForeground">
                        <Calendar size={10} />
                        <span>{item.date ? new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                    </div>
                    {item.pic ? (
                        <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[8px] font-bold border border-slate-800 shadow-sm">
                            {item.pic.charAt(0).toUpperCase()}
                        </div>
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center">
                            <User size={10} className="text-mutedForeground" />
                        </div>
                    )}
                </div>

                {/* Workspace badge */}
                <div className="flex items-center gap-1 text-[9px] font-bold text-mutedForeground/70 truncate">
                    {item.workspace_logo ? (
                        <img src={item.workspace_logo} alt="" className="w-3 h-3 object-contain rounded" />
                    ) : (
                        <Layers size={9} />
                    )}
                    <span className="truncate">{item.workspace_name}</span>
                </div>
            </div>
        </div>
    );
};

// --- FLOW COLUMN ---
const FlowColumn: React.FC<{
    status: ContentStatus;
    items: FlowItem[];
    onCardClick: (item: FlowItem) => void;
}> = ({ status, items, onCardClick }) => {
    const cfg = STATUS_CONFIG[status];
    const percentage = items.length;

    return (
        <div className="flex-1 flex-shrink-0 min-w-[260px] max-w-[320px] flex flex-col">
            {/* Column Header */}
            <div className={`flex-shrink-0 mb-4 p-3 rounded-xl border-2 ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-center justify-between mb-1">
                    <div className={`flex items-center gap-2 font-black text-xs uppercase tracking-wider ${cfg.color}`}>
                        {cfg.icon}
                        <span>{cfg.label}</span>
                    </div>
                    <span className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center text-white ${cfg.dotColor}`}>
                        {items.length}
                    </span>
                </div>
            </div>

            {/* Cards */}
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar pb-4">
                {items.length > 0 ? (
                    items.map(item => (
                        <FlowCard key={item.id} item={item} onClick={onCardClick} />
                    ))
                ) : (
                    <div className="h-24 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-mutedForeground/40 text-[10px] font-bold italic tracking-widest">
                        KOSONG
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export const ContentFlow: React.FC = () => {
    const navigate = useNavigate();
    const { config } = useAppConfig();

    const [allItems, setAllItems] = useState<FlowItem[]>([]);
    const [workspaceSummaries, setWorkspaceSummaries] = useState<WorkspaceSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all');
    const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
    const [selectedItem, setSelectedItem] = useState<FlowItem | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('user_id');
            const userRole = localStorage.getItem('user_role') || 'Member';
            const userAvatar = localStorage.getItem('user_avatar') || '';
            const tenantId = localStorage.getItem('tenant_id') || userId;

            // 1. Fetch workspaces
            // FIX: Only fetch workspaces where user is owner OR explicitly a member
            // REMOVED: owner_id.eq.${tenantId} — this was causing invited users to see ALL admin workspaces
            let wsQuery = supabase
                .from('workspaces')
                .select('id, name, platforms, color, logo_url, members, owner_id');

            let orCond = `owner_id.eq.${userId},members.cs.{"${userId}"}`;
            if (userAvatar && !userAvatar.startsWith('data:')) {
                orCond += `,members.cs.{"${userAvatar}"}`;
            }
            wsQuery = wsQuery.or(orCond);

            const { data: wsData, error: wsError } = await wsQuery.order('created_at', { ascending: false });
            if (wsError) throw wsError;

            const workspaces = wsData || [];
            if (workspaces.length === 0) {
                setAllItems([]);
                setWorkspaceSummaries([]);
                setLoading(false);
                return;
            }

            // 2. Fetch all content items for these workspaces
            const wsIds = workspaces.map((ws: any) => ws.id);
            const { data: contentData, error: contentError } = await supabase
                .from('content_items')
                .select('id, title, status, platform, date, pillar, type, pic, priority, workspace_id')
                .in('workspace_id', wsIds)
                .order('date', { ascending: true });

            if (contentError) throw contentError;

            const items = contentData || [];

            // 3. Build workspace map
            const wsMap: Record<string, any> = {};
            workspaces.forEach((ws: any) => {
                wsMap[ws.id] = ws;
            });

            // 4. Map items to FlowItem
            const flowItems: FlowItem[] = items.map((item: any) => {
                const ws = wsMap[item.workspace_id] || {};
                return {
                    id: item.id,
                    title: item.title,
                    status: item.status as ContentStatus,
                    platform: item.platform as Platform,
                    date: item.date,
                    pillar: item.pillar || '',
                    type: item.type || 'Post',
                    pic: item.pic || '',
                    priority: item.priority || 'Medium',
                    workspace_id: item.workspace_id,
                    workspace_name: ws.name || 'Unknown',
                    workspace_color: ws.color || 'violet',
                    workspace_logo: ws.logo_url || ''
                };
            });

            setAllItems(flowItems);

            // 5. Build workspace summaries
            const summaries: WorkspaceSummary[] = workspaces.map((ws: any) => {
                const wsItems = items.filter((i: any) => i.workspace_id === ws.id);
                const byStatus: Record<string, number> = {};
                Object.values(ContentStatus).forEach(s => { byStatus[s] = 0; });
                wsItems.forEach((i: any) => {
                    if (byStatus[i.status] !== undefined) byStatus[i.status]++;
                });
                return {
                    id: ws.id,
                    name: ws.name,
                    color: ws.color || 'violet',
                    logo_url: ws.logo_url || '',
                    platforms: ws.platforms || [],
                    totalContent: wsItems.length,
                    byStatus
                };
            });

            setWorkspaceSummaries(summaries);

        } catch (err) {
            console.error('ContentFlow fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filtered items
    const filteredItems = allItems.filter(item => {
        const matchWs = selectedWorkspace === 'all' || item.workspace_id === selectedWorkspace;
        const matchPlatform = selectedPlatform === 'all' || item.platform === selectedPlatform;
        return matchWs && matchPlatform;
    });

    // Group by status
    const itemsByStatus = Object.values(ContentStatus).reduce((acc, status) => {
        acc[status] = filteredItems.filter(i => i.status === status);
        return acc;
    }, {} as Record<ContentStatus, FlowItem[]>);

    // Stats
    const totalItems = filteredItems.length;
    const publishedItems = filteredItems.filter(i => i.status === ContentStatus.PUBLISHED).length;
    const inProgressItems = filteredItems.filter(i => i.status === ContentStatus.IN_PROGRESS).length;
    const reviewItems = filteredItems.filter(i => i.status === ContentStatus.REVIEW).length;
    const publishRate = totalItems > 0 ? Math.round((publishedItems / totalItems) * 100) : 0;

    // Unique platforms in filtered items
    const activePlatforms = [...new Set(filteredItems.map(i => i.platform))];

    const handleCardClick = (item: FlowItem) => {
        setSelectedItem(item);
        setIsDetailOpen(true);
    };

    const handleNavigateToWorkspace = (wsId: string, contentId?: string) => {
        if (contentId) {
            localStorage.setItem('open_content_id', contentId);
        }
        navigate(`/plan/${wsId}`);
    };

    return (
        <>
        {/* ═══════════════════════════════════════════════════════════════════
            MOBILE VIEW (< md) - ClickUp/Asana Style
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="block md:hidden flex flex-col h-full pb-24 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h2 className="text-base font-black text-foreground font-heading">{config?.page_titles?.['flow']?.title || 'Content Flow'}</h2>
                    <p className="text-[10px] text-mutedForeground">{totalItems} konten</p>
                </div>
                <button onClick={fetchData} disabled={loading} className="p-2 rounded-xl bg-muted text-mutedForeground">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Stats Row - 2x2 */}
            {!loading && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2">
                        <div className="w-7 h-7 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Layers size={14} className="text-accent" />
                        </div>
                        <div>
                            <p className="text-[8px] font-bold text-mutedForeground uppercase">Total</p>
                            <p className="text-base font-black text-foreground">{totalItems}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2">
                        <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CheckCircle size={14} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[8px] font-bold text-mutedForeground uppercase">Published</p>
                            <p className="text-base font-black text-foreground">{publishedItems}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Zap size={14} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[8px] font-bold text-mutedForeground uppercase">In Progress</p>
                            <p className="text-base font-black text-foreground">{inProgressItems}</p>
                        </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2">
                        <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Eye size={14} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="text-[8px] font-bold text-mutedForeground uppercase">Review</p>
                            <p className="text-base font-black text-foreground">{reviewItems}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Workspace Filter */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-2 flex-shrink-0">
                <button onClick={() => setSelectedWorkspace('all')}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black border transition-all ${selectedWorkspace === 'all' ? 'bg-foreground text-background border-foreground' : 'bg-card border-border text-foreground'}`}>
                    Semua
                </button>
                {workspaceSummaries.map(ws => (
                    <button key={ws.id} onClick={() => setSelectedWorkspace(ws.id)}
                        className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black border transition-all ${selectedWorkspace === ws.id ? 'bg-accent text-white border-accent' : 'bg-card border-border text-foreground'}`}>
                        {ws.logo_url && <img src={ws.logo_url} alt="" className="w-3 h-3 rounded object-contain" />}
                        <span className="truncate max-w-[70px]">{ws.name}</span>
                    </button>
                ))}
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-2 mb-3 flex-shrink-0">
                {Object.values(ContentStatus).map(status => {
                    const cfg = STATUS_CONFIG[status];
                    const count = itemsByStatus[status]?.length || 0;
                    return (
                        <button key={status} onClick={() => setSelectedPlatform(status === selectedPlatform ? 'all' : status)}
                            className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[9px] font-black border transition-all ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                            {cfg.label}
                            <span className={`text-[8px] font-black px-1 py-0.5 rounded-full bg-black/10`}>{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto space-y-1.5">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
                        <Layers size={28} className="text-accent/40 mx-auto mb-2" />
                        <p className="text-sm font-bold text-foreground">Belum ada konten</p>
                    </div>
                ) : (
                    filteredItems.map(item => {
                        const cfg = STATUS_CONFIG[item.status];
                        return (
                            <button key={item.id} onClick={() => handleCardClick(item)}
                                className="w-full bg-card border border-border rounded-xl p-3 text-left active:scale-[0.99] transition-transform hover:border-accent">
                                <div className="flex items-start gap-2.5">
                                    {/* Status dot */}
                                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dotColor}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>{cfg.label}</span>
                                            <span className="text-[8px] font-bold text-mutedForeground bg-muted px-1.5 py-0.5 rounded">{item.platform}</span>
                                            {item.priority === 'High' && <span className="text-[8px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded">🔥 High</span>}
                                        </div>
                                        <p className="text-xs font-bold text-foreground line-clamp-2">{item.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {item.date && (
                                                <span className="text-[9px] text-mutedForeground flex items-center gap-0.5">
                                                    <Calendar size={9} /> {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                </span>
                                            )}
                                            {item.pillar && <span className="text-[9px] text-mutedForeground">{item.pillar}</span>}
                                            {item.pic && <span className="text-[9px] font-bold text-accent">{item.pic}</span>}
                                        </div>
                                    </div>
                                    {/* Workspace logo */}
                                    {item.workspace_logo ? (
                                        <img src={item.workspace_logo} alt="" className="w-6 h-6 rounded object-contain flex-shrink-0 opacity-60" />
                                    ) : (
                                        <div className={`w-2 self-stretch rounded-full flex-shrink-0 bg-gradient-to-b ${WORKSPACE_COLORS[item.workspace_color] || WORKSPACE_COLORS.violet}`} />
                                    )}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            DESKTOP VIEW (≥ md) - Original Kanban Layout
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="hidden md:flex flex-col h-full min-h-screen pb-10">
            {/* Page Header */}
            <div className="flex flex-col gap-2 md:gap-4 border-b-2 border-border pb-3 md:pb-6 mb-3 md:mb-6">
                <div className="flex items-start justify-between gap-2 md:gap-4">
                    <div>
                        <h2 className="text-base md:text-2xl lg:text-4xl font-extrabold text-foreground font-heading tracking-tight">
                            {config?.page_titles?.['flow']?.title || 'Content Flow'}
                        </h2>
                        <p className="text-xs md:text-sm text-mutedForeground font-medium mt-0.5 md:mt-1 hidden md:block">
                            {config?.page_titles?.['flow']?.subtitle || 'Pantau alur konten dari semua workspace dalam satu tampilan.'}
                        </p>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-muted border-2 border-border rounded-xl text-xs font-bold text-mutedForeground hover:text-foreground hover:border-foreground transition-all disabled:opacity-50 flex-shrink-0"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>

                {/* Stats Row */}
                {!loading && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-card border-2 border-border rounded-xl p-3 flex items-center gap-3 shadow-sm">
                            <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center">
                                <Layers size={18} className="text-accent" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-mutedForeground uppercase tracking-wider">Total Konten</p>
                                <p className="text-xl font-black text-foreground">{totalItems}</p>
                            </div>
                        </div>
                        <div className="bg-card border-2 border-border rounded-xl p-3 flex items-center gap-3 shadow-sm">
                            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <CheckCircle size={18} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-mutedForeground uppercase tracking-wider">Published</p>
                                <p className="text-xl font-black text-foreground">{publishedItems} <span className="text-xs font-bold text-emerald-500">({publishRate}%)</span></p>
                            </div>
                        </div>
                        <div className="bg-card border-2 border-border rounded-xl p-3 flex items-center gap-3 shadow-sm">
                            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Zap size={18} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-mutedForeground uppercase tracking-wider">In Progress</p>
                                <p className="text-xl font-black text-foreground">{inProgressItems}</p>
                            </div>
                        </div>
                        <div className="bg-card border-2 border-border rounded-xl p-3 flex items-center gap-3 shadow-sm">
                            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                                <Eye size={18} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-mutedForeground uppercase tracking-wider">Perlu Review</p>
                                <p className="text-xl font-black text-foreground">{reviewItems}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex items-center gap-2 text-[10px] font-black text-mutedForeground uppercase tracking-[0.2em]">
                    <Filter size={12} /> Filter
                </div>

                {/* Workspace Filter */}
                <div className="flex flex-wrap gap-2">
                    <button
                            onClick={() => setSelectedWorkspace('all')}
                            className={`px-3 py-1.5 rounded-xl border-2 font-bold text-xs transition-all ${selectedWorkspace === 'all' ? 'bg-foreground text-background border-foreground' : 'bg-card border-border text-foreground hover:border-foreground'}`}
                        >
                            Semua Workspace
                        </button>
                    {workspaceSummaries.map(ws => (
                        <button
                            key={ws.id}
                            onClick={() => setSelectedWorkspace(ws.id)}
                            className={`px-3 py-1.5 rounded-xl border-2 font-bold text-xs transition-all flex items-center gap-1.5 ${selectedWorkspace === ws.id ? 'bg-accent text-white border-accent' : 'bg-card border-border text-foreground hover:border-accent'}`}
                        >
                            {ws.logo_url ? (
                                <img src={ws.logo_url} alt="" className="w-4 h-4 object-contain rounded" />
                            ) : (
                                <Layers size={12} />
                            )}
                            <span className="max-w-[100px] truncate">{ws.name}</span>
                        </button>
                    ))}
                </div>

                {/* Platform Filter */}
                {activePlatforms.length > 1 && (
                    <div className="flex flex-wrap gap-2 ml-auto">
                        <button
                            onClick={() => setSelectedPlatform('all')}
                            className={`px-3 py-1.5 rounded-xl border-2 font-bold text-xs transition-all ${selectedPlatform === 'all' ? 'bg-foreground text-background border-foreground' : 'bg-card border-border text-foreground hover:border-foreground'}`}
                        >
                            All Platforms
                        </button>
                        {activePlatforms.map(p => (
                            <button
                                key={p}
                                onClick={() => setSelectedPlatform(p)}
                                className={`px-3 py-1.5 rounded-xl border-2 font-bold text-xs transition-all flex items-center gap-1.5 ${selectedPlatform === p ? 'bg-accent text-white border-accent' : 'bg-card border-border text-foreground hover:border-foreground'}`}
                            >
                                {getPlatformIcon(p, 12)}
                                <span>{p}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Workspace Summary Cards */}
            {selectedWorkspace === 'all' && workspaceSummaries.length > 0 && !loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
                    {workspaceSummaries.map(ws => {
                        const publishedCount = ws.byStatus[ContentStatus.PUBLISHED] || 0;
                        const rate = ws.totalContent > 0 ? Math.round((publishedCount / ws.totalContent) * 100) : 0;
                        return (
                            <div
                                key={ws.id}
                                onClick={() => navigate(`/plan/${ws.id}`)}
                                className="bg-card border-2 border-border rounded-xl p-4 cursor-pointer hover:-translate-y-1 hover:shadow-hard transition-all group relative overflow-hidden"
                            >
                                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${WORKSPACE_COLORS[ws.color] || WORKSPACE_COLORS.violet} rounded-t-xl`} />
                                <div className="flex items-start gap-3 pt-1">
                                    {ws.logo_url ? (
                                        <img src={ws.logo_url} alt="" className="w-10 h-10 object-contain rounded-lg border border-border flex-shrink-0" />
                                    ) : (
                                        <div className="w-10 h-10 bg-muted rounded-lg border border-border flex items-center justify-center flex-shrink-0">
                                            <Layers size={18} className="text-mutedForeground" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-foreground text-sm truncate group-hover:text-accent transition-colors">{ws.name}</h4>
                                        <p className="text-[10px] text-mutedForeground font-bold">{ws.totalContent} konten</p>
                                    </div>
                                    <ArrowUpRight size={14} className="text-mutedForeground group-hover:text-accent transition-colors flex-shrink-0" />
                                </div>

                                {/* Mini status bar */}
                                <div className="mt-3 space-y-1.5">
                                    <div className="flex justify-between text-[9px] font-bold text-mutedForeground">
                                        <span>Published</span>
                                        <span className="text-accent">{rate}%</span>
                                    </div>
                                    <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden border border-border">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r ${WORKSPACE_COLORS[ws.color] || WORKSPACE_COLORS.violet} transition-all duration-500`}
                                            style={{ width: `${rate}%` }}
                                        />
                                    </div>
                                    <div className="flex gap-1.5 flex-wrap mt-2">
                                        {Object.values(ContentStatus).map(s => {
                                            const count = ws.byStatus[s] || 0;
                                            if (count === 0) return null;
                                            const cfg = STATUS_CONFIG[s];
                                            return (
                                                <span key={s} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                                                    {count} {cfg.label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Flow Pipeline */}
            {loading ? (
                <div className="flex items-center justify-center h-48 text-mutedForeground">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin w-8 h-8" />
                        <span className="text-sm font-bold">Memuat alur konten...</span>
                    </div>
                </div>
            ) : totalItems === 0 ? (
                <div className="flex-1 flex items-center justify-center py-16 border-2 border-dashed border-border rounded-2xl bg-muted/30">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 border-2 border-accent/20 flex items-center justify-center">
                            <Layers className="text-accent opacity-60" size={32} />
                        </div>
                        <h3 className="text-foreground font-black text-xl mb-1">Belum ada konten</h3>
                        <p className="text-mutedForeground font-medium text-sm mb-4">
                            {selectedWorkspace !== 'all' || selectedPlatform !== 'all'
                                ? 'Tidak ada konten yang cocok dengan filter yang dipilih.'
                                : 'Buat konten di workspace Anda untuk melihat alur di sini.'}
                        </p>
                        {(selectedWorkspace !== 'all' || selectedPlatform !== 'all') && (
                            <button
                                onClick={() => { setSelectedWorkspace('all'); setSelectedPlatform('all'); }}
                                className="flex items-center gap-2 mx-auto px-4 py-2 bg-muted border-2 border-border rounded-xl text-sm font-bold text-foreground hover:border-foreground transition-all"
                            >
                                <X size={14} /> Reset Filter
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* Pipeline Header with flow arrows */}
                    <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                        {Object.values(ContentStatus).map((status, idx) => {
                            const cfg = STATUS_CONFIG[status];
                            const count = itemsByStatus[status]?.length || 0;
                            return (
                                <React.Fragment key={status}>
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-bold whitespace-nowrap ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                                        <div className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                                        {cfg.label}
                                        <span className={`ml-1 w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center text-white ${cfg.dotColor}`}>
                                            {count}
                                        </span>
                                    </div>
                                    {idx < Object.values(ContentStatus).length - 1 && (
                                        <ChevronRight size={16} className="text-mutedForeground/40 flex-shrink-0" />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Kanban-style flow columns */}
                    <div className="flex-1 w-full overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
                        <div className="flex gap-4 items-start min-w-min">
                            {Object.values(ContentStatus).map(status => (
                                <FlowColumn
                                    key={status}
                                    status={status}
                                    items={itemsByStatus[status] || []}
                                    onCardClick={handleCardClick}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Detail Slide-over */}
            {isDetailOpen && selectedItem && (
                <>
                    <div
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
                        onClick={() => setIsDetailOpen(false)}
                    />
                    <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-card border-l-2 border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className={`h-2 bg-gradient-to-r ${WORKSPACE_COLORS[selectedItem.workspace_color] || WORKSPACE_COLORS.violet} flex-shrink-0`} />
                        <div className="flex items-center justify-between p-5 border-b-2 border-border flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 text-xs font-bold ${STATUS_CONFIG[selectedItem.status]?.bg} ${STATUS_CONFIG[selectedItem.status]?.border} ${STATUS_CONFIG[selectedItem.status]?.color}`}>
                                    <div className={`w-2 h-2 rounded-full ${STATUS_CONFIG[selectedItem.status]?.dotColor}`} />
                                    {STATUS_CONFIG[selectedItem.status]?.label}
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDetailOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-muted text-mutedForeground hover:text-foreground transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
                            {/* Title */}
                            <h3 className="text-xl font-black text-foreground font-heading leading-tight">
                                {selectedItem.title}
                            </h3>

                            {/* Platform + Type */}
                            <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border-2 border-border rounded-lg text-xs font-bold text-foreground">
                                    {getPlatformIcon(selectedItem.platform, 14)}
                                    <span>{selectedItem.platform}</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border-2 border-border rounded-lg text-xs font-bold text-foreground">
                                    {getTypeIcon(selectedItem.type, 14)}
                                    <span>{selectedItem.type}</span>
                                </div>
                                {selectedItem.priority && (
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${selectedItem.priority === 'High' ? 'bg-red-50 border-red-200 text-red-600' : selectedItem.priority === 'Medium' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                        <AlertCircle size={12} />
                                        {selectedItem.priority}
                                    </div>
                                )}
                            </div>

                            {/* Meta Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted border border-border rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-mutedForeground uppercase tracking-wider mb-1">Tanggal</p>
                                    <div className="flex items-center gap-1.5 font-bold text-foreground text-sm">
                                        <Calendar size={14} className="text-mutedForeground" />
                                        {selectedItem.date ? new Date(selectedItem.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                    </div>
                                </div>
                                <div className="bg-muted border border-border rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-mutedForeground uppercase tracking-wider mb-1">PIC</p>
                                    <div className="flex items-center gap-1.5 font-bold text-foreground text-sm">
                                        <User size={14} className="text-mutedForeground" />
                                        <span className="truncate">{selectedItem.pic || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Pillar */}
                            {selectedItem.pillar && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                                    <Hash size={14} className="text-yellow-600" />
                                    <span className="font-bold text-yellow-700 text-sm">{selectedItem.pillar}</span>
                                </div>
                            )}

                            {/* Workspace */}
                            <div className="flex items-center gap-3 p-3 bg-muted border-2 border-border rounded-xl">
                                {selectedItem.workspace_logo ? (
                                    <img src={selectedItem.workspace_logo} alt="" className="w-10 h-10 object-contain rounded-lg border border-border flex-shrink-0" />
                                ) : (
                                    <div className="w-10 h-10 bg-card rounded-lg border border-border flex items-center justify-center flex-shrink-0">
                                        <Layers size={18} className="text-mutedForeground" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-mutedForeground uppercase tracking-wider">Workspace</p>
                                    <p className="font-bold text-foreground text-sm truncate">{selectedItem.workspace_name}</p>
                                </div>
                            </div>

                            {/* Flow Progress */}
                            <div>
                                <p className="text-[10px] font-bold text-mutedForeground uppercase tracking-wider mb-3">Alur Konten</p>
                                <div className="flex items-center gap-1">
                                    {Object.values(ContentStatus).map((s, idx) => {
                                        const cfg = STATUS_CONFIG[s];
                                        const isActive = s === selectedItem.status;
                                        const isPast = Object.values(ContentStatus).indexOf(s) < Object.values(ContentStatus).indexOf(selectedItem.status);
                                        return (
                                            <React.Fragment key={s}>
                                                <div className={`flex flex-col items-center gap-1 flex-1`}>
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isActive ? `${cfg.dotColor} border-slate-900 shadow-hard-mini` : isPast ? 'bg-emerald-500 border-emerald-600' : 'bg-muted border-border'}`}>
                                                        {isPast ? (
                                                            <CheckCircle size={12} className="text-white" />
                                                        ) : isActive ? (
                                                            <div className="w-2 h-2 rounded-full bg-white" />
                                                        ) : (
                                                            <div className="w-2 h-2 rounded-full bg-border" />
                                                        )}
                                                    </div>
                                                    <span className={`text-[8px] font-bold text-center leading-tight ${isActive ? cfg.color : isPast ? 'text-emerald-600' : 'text-mutedForeground/50'}`}>
                                                        {cfg.label.split(' ')[0]}
                                                    </span>
                                                </div>
                                                {idx < Object.values(ContentStatus).length - 1 && (
                                                    <div className={`h-0.5 flex-1 mb-4 rounded-full ${isPast ? 'bg-emerald-400' : 'bg-border'}`} />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-5 border-t-2 border-border flex-shrink-0 space-y-2">
                            <button
                                onClick={() => handleNavigateToWorkspace(selectedItem.workspace_id, selectedItem.id)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white font-bold text-sm rounded-xl hover:bg-accent/90 transition-colors shadow-hard-mini"
                            >
                                <ArrowRight size={16} />
                                Buka di Workspace
                            </button>
                            <button
                                onClick={() => navigate(`/plan/${selectedItem.workspace_id}`)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted border-2 border-border text-foreground font-bold text-sm rounded-xl hover:border-foreground transition-colors"
                            >
                                <Layers size={14} />
                                Lihat Workspace
                            </button>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
        </>
    );
};
