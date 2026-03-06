import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input, Select, CreatableSelect } from '../components/ui/Input';
import {
    Plus, Calendar, Instagram, Linkedin, Video, Zap, AtSign, FileText, Film, FileImage, Link as LinkIcon, Upload, CheckCircle, Table, LayoutGrid, ArrowLeft, Youtube, Facebook, Loader2, UserPlus, Copy, Check, RefreshCw, MoreHorizontal, Edit, Trash2, User, Users, Layers, Hash, ExternalLink, Download, File, Filter, ChevronDown, X, Clock, Wifi, WifiOff, FolderOpen, Image as ImageIcon, HardDrive, Bookmark, StickyNote, Palette, Globe, Paperclip, Eye, MessageCircle, Reply, SmilePlus, Send, Heart, ThumbsUp, ThumbsDown, AlertCircle, Crown
} from 'lucide-react';
import { ContentStatus, ContentPriority, Platform, ContentItem, NotificationType } from '../types.ts';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../services/supabaseClient';
import { useNotifications } from '../components/NotificationProvider';
import { googleCalendarService } from '../services/googleCalendarService';
import { PremiumLockScreen } from '../components/PremiumLockScreen';

// --- TYPES & HELPERS ---

interface Member {
    id: string;
    name: string;
    avatar: string;
    role?: string;
    online_status?: string;
    last_activity_at?: string;
}

// Helper: Get Platform Icon
const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
        case Platform.INSTAGRAM: return <Instagram size={16} />;
        case Platform.TIKTOK: return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
            </svg>
        );
        case Platform.THREADS: return <AtSign size={16} />;
        case Platform.LINKEDIN: return <Linkedin size={16} />;
        case Platform.YOUTUBE: return <Youtube size={16} />;
        case Platform.FACEBOOK: return <Facebook size={16} />;
        default: return <FileText size={16} />;
    }
};

// Helper: Format Status to Sentence Case
const formatStatus = (status: string) => {
    if (!status) return '';
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/, c => c.toUpperCase());
};

// Helper: Get Platform Color for Card Header (Badge Only)
const getPlatformBadgeStyle = (platform: Platform) => {
    switch (platform) {
        case Platform.INSTAGRAM: return 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-500/30';
        case Platform.TIKTOK: return 'bg-foreground text-background border-foreground shadow-hard-mini';
        case Platform.LINKEDIN: return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';
        default: return 'bg-muted text-mutedForeground border-border';
    }
};

// Helper: Get Card Base Style based on Status
const getCardStatusStyle = (status: ContentStatus) => {
    const statusBg = {
        [ContentStatus.PUBLISHED]: 'bg-emerald-50/40 dark:bg-emerald-500/10',
        [ContentStatus.IN_PROGRESS]: 'bg-violet-50/40 dark:bg-violet-500/10',
        [ContentStatus.REVIEW]: 'bg-amber-50/40 dark:bg-amber-500/10',
        [ContentStatus.REVISION]: 'bg-rose-50/40 dark:bg-rose-500/10',
        [ContentStatus.SCHEDULED]: 'bg-pink-50/40 dark:bg-pink-500/10',
    };

    return `${statusBg[status] || 'bg-card'} border-[3.5px] border-border shadow-hard hover:shadow-hard-hover`;
};

// Helper: Get Type Icon
const getTypeIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('video') || t.includes('reels')) return <Film size={14} />;
    if (t.includes('carousel')) return <FileImage size={14} />;
    return <FileText size={14} />;
};

// Helper: Pillar Color Generator (Simple Hash)
const getPillarStyle = (pillar: string) => {
    if (!pillar) return 'bg-slate-100 text-slate-500 border-[2px] border-transparent';
    const colors = [
        'bg-yellow-100 text-yellow-800 border-indigo-950 shadow-[1px_1px_0px_#1e1b4b]',
        'bg-emerald-100 text-emerald-800 border-indigo-950 shadow-[1px_1px_0px_#1e1b4b]',
        'bg-purple-100 text-purple-800 border-indigo-950 shadow-[1px_1px_0px_#1e1b4b]',
        'bg-blue-100 text-blue-800 border-indigo-950 shadow-[1px_1px_0px_#1e1b4b]',
        'bg-orange-100 text-orange-800 border-indigo-950 shadow-[1px_1px_0px_#1e1b4b]'
    ];
    const index = pillar.length % colors.length;
    return `${colors[index]} border-[2px]`;
};

// --- RICH TEXT RENDERER COMPONENT ---
const RichTextRenderer: React.FC<{ text: string; onPdfClick?: (url: string) => void }> = ({ text, onPdfClick }) => {
    if (!text) return <span className="text-mutedForeground italic">Belum ada script atau catatan yang ditambahkan.</span>;
    return (
        <div className="space-y-1">
            {text.split('\n').map((line, lineIdx) => {
                const fileMatch = line.match(/^\[(.*?)\]\((.*?)\)$/);
                if (fileMatch) {
                    const fileName = fileMatch[1];
                    const fileUrl = fileMatch[2];
                    const isImage = fileUrl.startsWith('data:image');
                    return (
                        <div
                            className={`my-3 group relative bg-card border-[3px] border-slate-900 rounded-2xl p-4 flex items-center gap-4 hover:shadow-[6px_6px_0px_#0f172a] hover:-translate-y-1 transition-all shadow-[4px_4px_0px_#0f172a] ${(fileName.toLowerCase().endsWith('.pdf') || fileUrl.startsWith('data:application/pdf')) ? 'cursor-pointer' : ''
                                }`}
                            onClick={() => {
                                if ((fileName.toLowerCase().endsWith('.pdf') || fileUrl.startsWith('data:application/pdf')) && onPdfClick) {
                                    onPdfClick(fileUrl);
                                }
                            }}
                        >
                            {isImage ? (
                                <div className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex-shrink-0">
                                    <img src={fileUrl} alt="preview" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className={`w-12 h-12 rounded-lg border flex items-center justify-center flex-shrink-0 ${(fileName.toLowerCase().endsWith('.pdf') || fileUrl.startsWith('data:application/pdf'))
                                    ? 'bg-red-50 text-red-500 border-red-100'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                    }`}>
                                    <FileText size={24} />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">{fileName}</p>
                                <p className="text-xs text-slate-500">
                                    {isImage ? 'Image File' : (fileName.toLowerCase().endsWith('.pdf') ? 'PDF Document (Klik untuk Preview)' : 'Document / File')}
                                </p>
                            </div>
                            <a
                                href={fileUrl}
                                download={fileName}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 bg-muted text-mutedForeground rounded-lg hover:bg-accent hover:text-white transition-colors"
                                title="Download"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Download size={18} />
                            </a>
                        </div>
                    );
                }
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const parts = line.split(urlRegex);
                if (parts.length === 3 && parts[0] === '' && parts[2] === '') {
                    const url = parts[1];
                    return (
                        <a key={lineIdx} href={url} target="_blank" rel="noopener noreferrer" className="my-2 block bg-card border-[3px] border-border hover:shadow-hard hover:-translate-y-1 rounded-2xl p-4 shadow-hard-mini transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <ExternalLink size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-blue-500 mb-0.5">External link</p>
                                    <p className="text-sm font-bold text-foreground truncate">{url}</p>
                                </div>
                            </div>
                        </a>
                    );
                }
                return (
                    <p key={lineIdx} className="leading-relaxed text-mutedForeground">
                        {parts.map((part, partIdx) => {
                            if (part.match(urlRegex)) {
                                return <a key={partIdx} href={part} target="_blank" rel="noopener noreferrer" className="text-accent font-bold hover:underline">{part}</a>;
                            }
                            return <span key={partIdx}>{part}</span>;
                        })}
                    </p>
                );
            })}
        </div>
    );
};

// --- KANBAN COMPONENTS ---

const KanbanCard: React.FC<{
    item: ContentItem;
    members: Member[];
    userRole: string; // Add userRole to check permissions
    onEdit: (item: ContentItem) => void;
    onDelete: (id: string) => void;
    onApprove: (id: string, status: 'approved' | 'revision' | 'pending') => void; // New prop
    onDragStart: (e: React.DragEvent, id: string) => void;
    onClick: (item: ContentItem) => void;
}> = ({ item, members, userRole, onEdit, onDelete, onApprove, onDragStart, onClick }) => {
    const [showMenu, setShowMenu] = useState(false);
    const isAdmin = userRole === 'Admin' || userRole === 'Owner' || userRole === 'Developer';
    const isFree = localStorage.getItem('user_subscription_package') === 'Free';

    // Find PIC member
    const picMember = members.find(m => m.name === item.pic);

    // Helpers for Approval UI - More prominent and colorful
    const getApprovalBadge = (status?: string) => {
        switch (status) {
            case 'approved':
                return <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-black border-[1.5px] border-emerald-700 dark:border-emerald-500/30 shadow-hard-mini"><CheckCircle size={10} strokeWidth={4} /> Approved</span>;
            case 'revision':
                return <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500 text-white dark:bg-rose-500/20 dark:text-rose-400 text-[10px] font-black border-[1.5px] border-rose-700 dark:border-rose-500/30 shadow-hard-mini"><RefreshCw size={10} strokeWidth={4} /> Revision</span>;
            default:
                return null;
        }
    };

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, item.id)}
            onClick={() => onClick(item)}
            className={`group rounded-[1.5rem] transition-all duration-300 hover:-translate-y-1.5 cursor-grab active:cursor-grabbing relative mb-4 flex-shrink-0 z-10 hover:z-20 overflow-visible p-4 ${getCardStatusStyle(item.status)}`}
        >
            {/* Header: PIC \u0026 Menu */}
            <div className={`flex justify-between items-center mb-2.5`}>
                <div className="flex items-center gap-2">
                    {item.pic ? (
                        <div className="group/pic relative">
                            {picMember ? (
                                <img
                                    src={picMember.avatar}
                                    alt={picMember.name}
                                    className="w-8 h-8 rounded-xl border-[2px] border-border shadow-hard-mini object-cover bg-card p-0.5 group-hover/pic:border-accent transition-colors"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-xl bg-violet-400 text-white flex items-center justify-center text-xs font-black border-[2px] border-border shadow-hard-mini">
                                    {item.pic.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-xl bg-muted border-[2px] border-border shadow-hard-mini flex items-center justify-center">
                            <User size={14} strokeWidth={3} className="text-mutedForeground" />
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-mutedForeground">Assignee</span>
                        <span className="text-xs font-black text-foreground">{item.pic ? item.pic.split(' ')[0] : 'Unassigned'}</span>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className="w-7 h-7 flex items-center justify-center bg-card rounded-xl border-[2px] border-border shadow-hard-mini hover:translate-y-[2px] hover:shadow-none transition-all text-foreground"
                    >
                        <MoreHorizontal size={14} strokeWidth={3} />
                    </button>
                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}></div>
                            <div className="absolute right-0 top-full mt-3 w-52 bg-card border-[3.5px] border-border rounded-2xl shadow-hard z-50 overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(item); }}
                                    className="w-full text-left px-5 py-3.5 hover:bg-muted flex items-center gap-3 font-black text-foreground text-[10px]"
                                >
                                    <Edit size={16} className="text-violet-600" strokeWidth={3} /> Edit Konten
                                </button>
                                {isAdmin && (
                                    <>
                                        <div className="h-[2px] bg-border" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowMenu(false); onApprove(item.id, 'approved'); }}
                                            className="w-full text-left px-5 py-3.5 hover:bg-emerald-50 flex items-center gap-3 font-black text-emerald-700 text-[10px] transition-colors"
                                        >
                                            <CheckCircle size={16} strokeWidth={3} /> Setujui
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowMenu(false); onApprove(item.id, 'revision'); }}
                                            className="w-full text-left px-5 py-3.5 text-[10px] text-rose-700 hover:bg-rose-50 flex items-center justify-between font-black"
                                        >
                                            <span className="flex items-center gap-3"><RefreshCw size={16} strokeWidth={3} /> Revisi</span>
                                            {isFree && <Crown size={12} className="text-amber-500" strokeWidth={3} />}
                                        </button>
                                    </>
                                )}
                                <div className="h-[2px] bg-border" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(item.id); }}
                                    className="w-full text-left px-5 py-3.5 hover:bg-rose-50 flex items-center gap-3 font-black text-rose-600 text-[10px]"
                                >
                                    <Trash2 size={16} strokeWidth={3} /> Hapus
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Title Section */}
            <div className="mb-2">
                <h4 className="font-heading font-black text-foreground text-xs sm:text-sm leading-snug tracking-tight line-clamp-2 group-hover:text-accent transition-colors">
                    {item.title}
                </h4>
            </div>

            {/* Tags & Badges Area */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                {getApprovalBadge(item.approval_status)}

                <span className="px-2 py-1 rounded-md text-[10px] font-black bg-card text-foreground border-[1.5px] border-border shadow-hard-mini flex items-center gap-1">
                    {getTypeIcon(item.type)} {item.type}
                </span>

                {item.pillar && (
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black ${getPillarStyle(item.pillar).replace('border-[2px]', 'border-[1.5px]')}`}>
                        {item.pillar}
                    </span>
                )}
            </div>

            {/* Footer: Integrated Platform Box */}
            <div className="mt-auto pt-2">
                <div className="bg-muted/30 dark:bg-muted/10 rounded-xl border-[1.5px] border-border p-2 flex items-center justify-between shadow-hard-mini group-hover:bg-card transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-card border-[1.5px] border-border flex items-center justify-center text-foreground shadow-hard-mini scale-90">
                            {getPlatformIcon(item.platform)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-mutedForeground">Platform</span>
                            <span className="text-xs font-black text-foreground">{item.platform}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 border-l-[1.5px] border-border pl-2">
                        <Calendar size={12} strokeWidth={3} className="text-mutedForeground" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-mutedForeground">Date</span>
                            <span className="text-[11px] font-black text-foreground whitespace-nowrap">
                                {item.date ? new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KanbanColumn: React.FC<{
    status: ContentStatus,
    items: ContentItem[],
    textColor: string,
    members: Member[],
    userRole: string, // New prop
    onEdit: (item: ContentItem) => void,
    onDelete: (id: string) => void,
    onApprove: (id: string, status: 'approved' | 'revision' | 'pending') => void, // New prop
    onDropTask: (e: React.DragEvent, status: ContentStatus) => void,
    onDragStart: (e: React.DragEvent, id: string) => void,
    onCardClick: (item: ContentItem) => void
}> = ({ status, items, textColor, members, userRole, onEdit, onDelete, onApprove, onDropTask, onDragStart, onCardClick }) => {
    // ... (keep existing handlers) ...
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-muted/50', 'border-accent/50');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('bg-muted/50', 'border-accent/50');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-muted/50', 'border-accent/50');
        onDropTask(e, status);
    };

    return (
        <div
            className="flex-1 flex-shrink-0 min-w-[320px] md:min-w-[360px] lg:min-w-[400px] flex flex-col pb-0"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Column Header - Bento Style */}
            <div className="flex-shrink-0 mb-8 pt-1">
                <div className="flex items-center justify-between pb-5 border-b-[4px] border-border group">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-mutedForeground">Status</span>
                        <h3 className={`font-heading font-black text-lg sm:text-xl tracking-wide ${textColor} drop-shadow-sm group-hover:translate-x-1 transition-transform`}>
                            {formatStatus(status)}
                        </h3>
                    </div>
                    <div className="bg-card text-foreground border-[3.5px] border-border w-10 h-10 rounded-2xl text-xs font-black flex items-center justify-center shadow-hard transform rotate-3">
                        {items.length}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 px-0 pb-0 flex flex-col gap-2 transition-colors duration-300 rounded-xl">
                {items.length > 0 ? (
                    items.map(item => (
                        <KanbanCard
                            key={item.id}
                            item={item}
                            members={members}
                            userRole={userRole}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onApprove={onApprove}
                            onDragStart={onDragStart}
                            onClick={onCardClick}
                        />
                    ))
                ) : (
                    <div className="py-12 border-[3.5px] border-dashed border-slate-300 rounded-[2rem] flex flex-col items-center justify-center text-mutedForeground bg-muted/50 group/empty">
                        <Layers size={32} className="mb-3 opacity-20 group-hover/empty:opacity-50 transition-opacity" strokeWidth={3} />
                        <span className="text-[10px] font-black">Kosong</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const ContentPlanDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { sendNotification, notifyWorkspaceMembers } = useNotifications();
    const [tasks, setTasks] = useState<ContentItem[]>([]);
    const [workspaceData, setWorkspaceData] = useState<{
        name: string,
        platforms: string[],
        invite_code: string,
        logo_url: string,
        period: string,
        account_name: string,
        members: string[]
    }>({
        name: 'Loading...',
        platforms: [],
        invite_code: '',
        logo_url: '',
        period: '',
        account_name: '',
        members: []
    });
    const [loading, setLoading] = useState(true);

    const [currentUserRole, setCurrentUserRole] = useState<string>('Member');
    const [currentUserPackage, setCurrentUserPackage] = useState<string>('');
    const isFree = localStorage.getItem('user_subscription_package') === 'Free' && localStorage.getItem('user_role') !== 'Developer';

    // Diagnostics Log
    useEffect(() => {
        console.log(`[ContentFlow-Detail] v1.6 initialized. User Role: ${currentUserRole}`);
    }, [currentUserRole]);

    const [errorState, setErrorState] = useState<string | null>(null);
    // Default to table view on mobile for better readability
    const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'brand_asset'>(() => {
        return window.innerWidth < 768 ? 'table' : 'kanban';
    });
    // Mobile: active status tab for Trello-style view
    const [mobileStatusTab, setMobileStatusTab] = useState<string>('all');

    // --- Presence Helpers ---
    const getStatusDot = (status: string) => {
        switch (status) {
            case 'online': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
            case 'idle': return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]';
            default: return 'bg-slate-400';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'online': return 'Online';
            case 'idle': return 'Idle';
            default: return 'Offline';
        }
    };

    const formatLastSeen = (dateString?: string) => {
        if (!dateString) return 'Tidak diketahui';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Baru saja';
        if (diffMin < 60) return `${diffMin}m lalu`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour}j lalu`;
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    };

    // Subscribing to Presence Changes (Team workspaces only)
    useEffect(() => {
        // ── Smart Sync: Skip realtime presence for personal workspaces ──
        const pkg = localStorage.getItem('user_subscription_package') || '';
        const isPersonal = pkg.toLowerCase().includes('personal') || pkg.toLowerCase() === 'free';
        if (isPersonal) {
            console.log('[SmartSync] Skipping presence channel for personal workspace');
            return;
        }

        const presenceChannel = supabase
            .channel('workspace_user_presence')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'app_users' },
                (payload: any) => {
                    setTeamMembers(prev => prev.map(u =>
                        u.id === payload.new.id
                            ? { ...u, online_status: payload.new.online_status, last_activity_at: payload.new.last_activity_at }
                            : u
                    ));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(presenceChannel);
        };
    }, []);
    const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);
    const [teamMembers, setTeamMembers] = useState<Member[]>([]); // NEW STATE

    // Table Filters State
    const [filterPlatform, setFilterPlatform] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

    // Date Period Filter State
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');
    const [tableSortOrder, setTableSortOrder] = useState<'asc' | 'desc'>('asc');

    // Brand Assets State
    interface BrandAssetItem {
        id: string;
        type: 'note' | 'link' | 'file' | 'image' | 'pdf' | 'color';
        title: string;
        content: string; // text for note, url for link, base64/url for file/image
        created_at: string;
        fileName?: string;
    }
    const [brandAssets, setBrandAssets] = useState<BrandAssetItem[]>([]);
    const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
    const [newAssetType, setNewAssetType] = useState<BrandAssetItem['type']>('note');
    const [newAssetTitle, setNewAssetTitle] = useState('');
    const [newAssetContent, setNewAssetContent] = useState('');
    const [newAssetFileName, setNewAssetFileName] = useState('');
    const [brandPdfPreviewUrl, setBrandPdfPreviewUrl] = useState<string | null>(null);
    const brandFileInputRef = useRef<HTMLInputElement>(null);

    // Load brand assets from localStorage (persisted per workspace)
    useEffect(() => {
        if (id) {
            const saved = localStorage.getItem(`brand_assets_${id}`);
            if (saved) {
                try { setBrandAssets(JSON.parse(saved)); } catch { }
            }
        }
    }, [id]);

    // Save brand assets to localStorage whenever they change
    useEffect(() => {
        if (id && brandAssets.length > 0) {
            localStorage.setItem(`brand_assets_${id}`, JSON.stringify(brandAssets));
        }
    }, [brandAssets, id]);

    const handleAddBrandAsset = () => {
        if (!newAssetTitle.trim() && !newAssetContent.trim()) return;
        const asset: BrandAssetItem = {
            id: `ba-${Date.now()}`,
            type: newAssetType,
            title: newAssetTitle.trim() || (newAssetType === 'note' ? 'Note' : newAssetType === 'link' ? 'Link' : 'File'),
            content: newAssetContent,
            created_at: new Date().toISOString(),
            fileName: newAssetFileName || undefined
        };
        setBrandAssets(prev => [...prev, asset]);
        setNewAssetTitle('');
        setNewAssetContent('');
        setNewAssetFileName('');
        setIsAddAssetModalOpen(false);
    };

    const handleDeleteBrandAsset = (assetId: string) => {
        setBrandAssets(prev => {
            const updated = prev.filter(a => a.id !== assetId);
            if (id) localStorage.setItem(`brand_assets_${id}`, JSON.stringify(updated));
            return updated;
        });
    };

    const handleBrandFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            alert('File terlalu besar (Max 10MB)');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setNewAssetContent(base64);
            setNewAssetFileName(file.name);
            // Auto-detect type
            if (file.type.startsWith('image/')) {
                setNewAssetType('image');
            } else if (file.type === 'application/pdf') {
                setNewAssetType('pdf');
            } else {
                setNewAssetType('file');
            }
            if (!newAssetTitle.trim()) {
                setNewAssetTitle(file.name);
            }
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<ContentItem | null>(null);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingId, setEditingId] = useState<string | null>(null);

    // PDF Preview States
    const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfMounted, setPdfMounted] = useState(false);

    useEffect(() => {
        if (isPdfPreviewOpen) {
            setPdfMounted(true);
        } else {
            const timer = setTimeout(() => setPdfMounted(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [isPdfPreviewOpen]);

    const [isDrivePreviewOpen, setIsDrivePreviewOpen] = useState(false);
    const [drivePreviewUrl, setDrivePreviewUrl] = useState<string | null>(null);
    const [driveMounted, setDriveMounted] = useState(false);

    useEffect(() => {
        if (isDrivePreviewOpen) {
            setDriveMounted(true);
        } else {
            const timer = setTimeout(() => setDriveMounted(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [isDrivePreviewOpen]);

    // Image Preview States
    const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

    // Content Result States
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const resultInputRef = useRef<HTMLInputElement>(null);
    const [uploadingResults, setUploadingResults] = useState(false);
    const [resultResultType, setResultResultType] = useState<'photo' | 'video'>('photo');
    const [resultMounted, setResultMounted] = useState(false);

    // --- RESULT COMMENTS STATE ---
    interface ResultComment {
        id: string;
        content_item_id: string;
        workspace_id: string;
        user_id: string;
        user_name: string;
        user_avatar: string;
        message: string;
        parent_id: string | null;
        reactions: Record<string, string[]>; // emoji -> [userId1, userId2]
        created_at: string;
    }
    const [resultComments, setResultComments] = useState<ResultComment[]>([]);
    const [commentInput, setCommentInput] = useState('');
    const [replyingTo, setReplyingTo] = useState<ResultComment | null>(null);
    const [sendingComment, setSendingComment] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
    const commentEndRef = useRef<HTMLDivElement>(null);
    const commentInputRef = useRef<HTMLInputElement>(null);

    // Fetch comments for selected task
    const fetchResultComments = async (contentItemId: string) => {
        const { data } = await supabase
            .from('result_comments')
            .select('*')
            .eq('content_item_id', contentItemId)
            .order('created_at', { ascending: true });
        setResultComments((data || []) as ResultComment[]);
    };

    // Real-time subscription for comments
    useEffect(() => {
        if (!isResultModalOpen || !selectedTask?.id) return;
        fetchResultComments(selectedTask.id);

        const channel = supabase
            .channel(`result-comments-${selectedTask.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'result_comments',
                filter: `content_item_id=eq.${selectedTask.id}`
            }, () => {
                fetchResultComments(selectedTask.id);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [isResultModalOpen, selectedTask?.id]);

    // Auto-scroll to bottom when new comments arrive
    useEffect(() => {
        if (commentEndRef.current) {
            commentEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [resultComments.length]);

    // Send comment (or reply)
    const handleSendComment = async () => {
        if (!commentInput.trim() || !selectedTask || !id) return;
        setSendingComment(true);
        try {
            const userId = localStorage.getItem('user_id') || '';
            const userName = localStorage.getItem('user_name') || localStorage.getItem('user_full_name') || 'Unknown';
            const userAvatar = localStorage.getItem('user_avatar') || '';

            const { error } = await supabase.from('result_comments').insert({
                content_item_id: selectedTask.id,
                workspace_id: id,
                user_id: userId,
                user_name: userName,
                user_avatar: userAvatar,
                message: commentInput.trim(),
                parent_id: replyingTo?.id || null
            });

            if (error) throw error;

            // Notify all workspace members
            const replyLabel = replyingTo ? ` (membalas ${replyingTo.user_name})` : '';
            for (const member of teamMembers) {
                if (member.id !== userId) {
                    await sendNotification({
                        recipientId: member.id,
                        type: 'CONTENT_REVISION' as NotificationType,
                        title: `Komentar Baru pada "${selectedTask.title}"`,
                        content: `${userName} berkomentar${replyLabel}: "${commentInput.trim().slice(0, 80)}${commentInput.trim().length > 80 ? '...' : ''}"`,
                        workspaceId: id,
                        metadata: { contentItemId: selectedTask.id, contentTitle: selectedTask.title }
                    });
                }
            }

            setCommentInput('');
            setReplyingTo(null);
        } catch (err) {
            console.error('Comment error:', err);
        } finally {
            setSendingComment(false);
        }
    };

    // Toggle reaction on a comment
    const handleToggleReaction = async (commentId: string, emoji: string) => {
        const userId = localStorage.getItem('user_id') || '';
        const comment = resultComments.find(c => c.id === commentId);
        if (!comment) return;

        const reactions = { ...(comment.reactions || {}) };
        const users = reactions[emoji] || [];
        if (users.includes(userId)) {
            reactions[emoji] = users.filter(u => u !== userId);
            if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
            reactions[emoji] = [...users, userId];
        }

        await supabase.from('result_comments').update({ reactions }).eq('id', commentId);
        setShowEmojiPicker(null);
    };

    useEffect(() => {
        if (isResultModalOpen) {
            setResultMounted(true);
        } else {
            const timer = setTimeout(() => setResultMounted(false), 800);
            return () => clearTimeout(timer);
        }
    }, [isResultModalOpen]);

    // Asset upload ref
    const assetInputRef = useRef<HTMLInputElement>(null);
    const [savingAsset, setSavingAsset] = useState(false);
    const [savingDriveUrl, setSavingDriveUrl] = useState(false);
    const [driveUrlInput, setDriveUrlInput] = useState('');

    // Invite Code
    const [copied, setCopied] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        status: ContentStatus.TODO as string,
        pillar: '',
        type: 'Carousel',
        script: '',
        priority: ContentPriority.MEDIUM,
        pic: '',
        approval: '',
        platform: Platform.INSTAGRAM,
        contentLink: ''
    });

    const notifyMemberByName = async (name: string, type: NotificationType, title: string, content: string, metadata?: any) => {
        if (!name) return;
        const member = teamMembers.find(m => m.name === name);
        if (member) {
            await sendNotification({
                recipientId: member.id,
                type,
                title,
                content,
                workspaceId: id,
                metadata
            });
        }
    };

    // --- DATA FETCHING ---
    const fetchData = async () => {
        if (!id) return;
        setLoading(true);
        setErrorState(null);
        try {
            const userId = localStorage.getItem('user_id');
            const userRole = localStorage.getItem('user_role') || 'Member';
            const tenantId = localStorage.getItem('tenant_id') || userId;

            // 1. Parallel Fetch: User Info, Workspace Info
            const [userRes, wsRes] = await Promise.all([
                supabase.from('app_users').select('avatar_url, role, subscription_package').eq('id', userId).single(),
                supabase.from('workspaces').select('*').eq('id', id).single(),
            ]);

            if (wsRes.error) throw new Error("Akses Ditolak atau Workspace tidak ditemukan.");

            const ws = wsRes.error ? null : wsRes.data;
            const userData = userRes.data;

            // 2. Build a comprehensive user query: tenant users + all workspace members
            const wsMemberIds = (ws?.members || []).filter((m: string) => {
                // Filter for values that look like UUIDs (user IDs)
                return m.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
            });

            let userOrCond = `admin_id.eq.${tenantId},id.eq.${tenantId}`;
            if (wsMemberIds.length > 0) {
                userOrCond += `,id.in.(${wsMemberIds.join(',')})`;
            }
            // Also match by username in members
            const wsMemberUsernames = (ws?.members || []).filter((m: string) => {
                return !m.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i) && !m.includes('/') && !m.startsWith('data:');
            });
            if (wsMemberUsernames.length > 0) {
                userOrCond += `,username.in.(${wsMemberUsernames.join(',')})`;
            }

            const [allUsersRes, itemsRes] = await Promise.all([
                supabase.from('app_users')
                    .select('id, full_name, email, avatar_url, role, online_status, last_activity_at, username')
                    .or(userOrCond),
                supabase.from('content_items')
                    .select('*')
                    .eq('workspace_id', id)
                    .order('created_at', { ascending: false })
            ]);

            if (itemsRes.error) throw itemsRes.error;

            const allUsers = allUsersRes.data || [];
            const items = itemsRes.data || [];

            const freshAvatar = userData?.avatar_url || localStorage.getItem('user_avatar');
            const freshRole = userData?.role || localStorage.getItem('user_role') || 'Member';
            const freshPackage = userData?.subscription_package || '';
            setCurrentUserRole(freshRole);
            setCurrentUserPackage(freshPackage);

            // Strict Access Control
            if (ws) {
                const isOwner = ws.owner_id === userId;
                if (!isOwner) {
                    const wsMembers: string[] = ws.members || [];
                    const isMember = wsMembers.some(m => {
                        if (m === userId) return true;
                        try { return decodeURIComponent(m) === decodeURIComponent(freshAvatar || '') || m === freshAvatar; }
                        catch { return m === freshAvatar; }
                    });
                    if (!isMember) {
                        throw new Error("Akses Ditolak. Anda tidak terdaftar sebagai anggota workspace ini.");
                    }
                }
            }

            // Invite Code Logic
            let currentCode = ws?.invite_code;
            if (ws && !currentCode) {
                const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                try {
                    await supabase.from('workspaces').update({ invite_code: newCode }).eq('id', id);
                    currentCode = newCode;
                } catch (err) {
                    console.warn("Update invite_code failed:", err);
                    currentCode = "SETUP-REQ";
                }
            }

            // Map to Member type and filter by workspace membership (using avatar list comparison)
            const wsMembersList: string[] = ws?.members || [];
            const mappedMembers: Member[] = allUsers
                .filter((u: any) => {
                    return wsMembersList.some(token => {
                        if (token === u.id || token === u.username) return true;
                        try { return decodeURIComponent(token) === decodeURIComponent(u.avatar_url) || token === u.avatar_url; }
                        catch { return token === u.avatar_url; }
                    });
                })
                .map((u: any) => ({
                    id: u.id,
                    name: u.full_name || u.email || 'Unknown',
                    avatar: u.avatar_url || '',
                    role: u.role || 'Member',
                    online_status: u.online_status || 'offline',
                    last_activity_at: u.last_activity_at
                }));

            setTeamMembers(mappedMembers);

            // For the header avatars, we'll use the first 5 members
            const headerMembers = mappedMembers.map(m => m.avatar).filter(Boolean).slice(0, 5);

            setWorkspaceData({
                name: ws?.name || 'Unknown',
                platforms: ws?.platforms || [],
                invite_code: currentCode || 'ERROR',
                logo_url: ws?.logo_url || '',
                period: ws?.period || '',
                account_name: ws?.account_name || '',
                members: ws?.members || []
            });

            // MAP Supabase data (snake_case) to Frontend Type (camelCase)
            const mappedItems = items.map((item: any) => ({
                ...item,
                contentLink: item.content_link, // MAPPING FIX
            }));

            setTasks(mappedItems as ContentItem[]);

        } catch (error: any) {
            console.error("Error fetching detail:", error);
            setErrorState(error.message || "Terjadi kesalahan saat memuat data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    useEffect(() => {
        const handleClickOutside = () => setActiveRowMenu(null);
        document.addEventListener('click', handleClickOutside);
        const handleUserUpdate = () => { fetchData(); };
        window.addEventListener('user_updated', handleUserUpdate);
        return () => {
            document.removeEventListener('click', handleClickOutside);
            window.removeEventListener('user_updated', handleUserUpdate);
        };
    }, []);

    useEffect(() => {
        const openId = localStorage.getItem('open_content_id');
        if (openId && tasks.length > 0) {
            const task = tasks.find(t => t.id === openId);
            if (task) {
                setSelectedTask(task);
                setIsDetailModalOpen(true);
                localStorage.removeItem('open_content_id');
            }
        }
    }, [tasks]);

    // Date filter helper
    const matchesDateFilter = (taskDate: string | undefined) => {
        if (!filterDateFrom && !filterDateTo) return true;
        if (!taskDate) return false;
        const d = new Date(taskDate).getTime();
        if (filterDateFrom && d < new Date(filterDateFrom).getTime()) return false;
        if (filterDateTo && d > new Date(filterDateTo + 'T23:59:59').getTime()) return false;
        return true;
    };

    // Filter Logic for Table View
    const filteredTableTasks = tasks
        .filter(task => {
            const matchPlatform = filterPlatform === 'all' || task.platform === filterPlatform;
            const matchStatus = filterStatus === 'all' || task.status === filterStatus;
            const matchDate = matchesDateFilter(task.date);
            return matchPlatform && matchStatus && matchDate;
        })
        .sort((a, b) => {
            const dateA = new Date(a.date || '').getTime() || 0;
            const dateB = new Date(b.date || '').getTime() || 0;
            return tableSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

    // --- ACTIONS (Create/Edit/Delete/Update) ---
    const handleOpenCreateModal = () => {
        setModalMode('create');
        setFormData({
            title: '',
            date: new Date().toISOString().split('T')[0],
            status: ContentStatus.TODO,
            pillar: '',
            type: 'Carousel',
            script: '',
            priority: ContentPriority.MEDIUM,
            pic: '',
            approval: '',
            platform: Platform.INSTAGRAM,
            contentLink: ''
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (item: ContentItem) => {
        setModalMode('edit');
        setEditingId(item.id);
        setFormData({
            title: item.title,
            date: item.date,
            status: item.status,
            pillar: item.pillar,
            type: item.type,
            script: (item as any).script || '',
            priority: item.priority,
            pic: (item as any).pic || '',
            approval: (item as any).approval || '',
            platform: item.platform,
            contentLink: item.contentLink || '' // Ensure this reads from mapped item
        });
        setIsModalOpen(true);
    };

    const handleApprove = async (contentId: string, status: 'approved' | 'revision' | 'pending') => {
        const currentUserId = localStorage.getItem('user_id');
        const currentUserName = localStorage.getItem('user_name') || 'Admin';
        const isFree = localStorage.getItem('user_subscription_package') === 'Free';

        // Lock Komentar Revisi if isFree
        if (isFree && status === 'revision') {
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Fitur revisi hanya tersedia untuk paket Premium.' } }));
            return;
        }

        const workspaceId = id; // use workspace id from useParams
        if (!currentUserId) return;

        try {
            const { error } = await supabase
                .from('content_items')
                .update({
                    approval_status: status,
                    approved_by: status === 'approved' ? currentUserId : null,
                    approved_at: status === 'approved' ? new Date().toISOString() : null
                })
                .eq('id', contentId);

            if (error) throw error;

            // Update local state
            setTasks(prev => prev.map(t => t.id === contentId ? {
                ...t,
                approval_status: status,
                approved_by: status === 'approved' ? currentUserId : undefined,
                approved_at: status === 'approved' ? new Date().toISOString() : undefined
            } : t));

            console.log(`[Approval] Content ${contentId} status updated to ${status}`);

            // Send notification to PIC
            const task = tasks.find(t => t.id === contentId);
            if (task && task.pic && status !== 'pending') {
                const picMember = teamMembers.find(m => m.name === task.pic);
                if (picMember && picMember.id) {
                    sendNotification({
                        recipientId: picMember.id,
                        workspaceId: workspaceId || null,
                        type: status === 'approved' ? 'CONTENT_APPROVED' : 'CONTENT_REVISION',
                        title: status === 'approved' ? 'Konten Disetujui! 🎉' : 'Ada Revisi Konten 🔄',
                        content: `Konten "${task.title}" telah ${status === 'approved' ? 'disetujui' : 'diminta revisi'} oleh ${currentUserName}`,
                        metadata: { content_id: contentId }
                    });
                }
            }
        } catch (err: any) {
            console.error('Error approving content:', err);
        }
    };

    const handleCardClick = (item: ContentItem) => {
        setSelectedTask(item);
        setIsDetailModalOpen(true);
    };

    const handleDeleteContent = async (itemId: string) => {
        if (!confirm("Hapus konten ini?")) return;
        try {
            const { error } = await supabase.from('content_items').delete().eq('id', itemId);
            if (error) throw error;
            setTasks(prev => prev.filter(t => t.id !== itemId));
            setIsDetailModalOpen(false);
        } catch (err) {
            console.error(err);
            alert("Gagal menghapus.");
        }
    };

    const handleQuickUpdateStatus = async (itemId: string, newStatus: ContentStatus) => {
        const item = tasks.find(t => t.id === itemId);
        setTasks(prev => prev.map(t => t.id === itemId ? { ...t, status: newStatus } : t));
        try {
            await supabase.from('content_items').update({ status: newStatus }).eq('id', itemId);

            // Notification logic
            if (item && item.status !== newStatus) {
                if (newStatus === ContentStatus.REVIEW) {
                    await notifyMemberByName(item.approval || '', 'CONTENT_REVISION', 'Review Konten', `mengirim konten "${item.title}" untuk di-review.`);
                } else if (newStatus === ContentStatus.SCHEDULED) {
                    await notifyMemberByName(item.pic || '', 'CONTENT_APPROVED', 'Konten Disetujui', `telah menyetujui konten "${item.title}" untuk dijadwalkan.`);
                } else if (newStatus === ContentStatus.IN_PROGRESS && item.status === ContentStatus.REVIEW) {
                    await notifyMemberByName(item.pic || '', 'CONTENT_REVISION', 'Konten Direvisi', `meminta revisi untuk konten "${item.title}".`);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleQuickUpdateLink = async (itemId: string, newLink: string) => {
        // Optimistic Update
        setTasks(prev => prev.map(t => t.id === itemId ? { ...t, contentLink: newLink } : t));

        try {
            // Sync to Database (using content_link)
            await supabase.from('content_items').update({ content_link: newLink }).eq('id', itemId);
        } catch (err) {
            console.error("Failed to sync link:", err);
        }
    };

    // Handle asset image upload (JPG/PNG → base64)
    const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedTask) return;
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Ukuran file terlalu besar (Max 5MB)' } }));
            return;
        }

        setSavingAsset(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                await supabase.from('content_items').update({ asset_url: base64 }).eq('id', selectedTask.id);
                setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, asset_url: base64 } : t));
                setSelectedTask(prev => prev ? { ...prev, asset_url: base64 } : null);
                setSavingAsset(false);
                window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: 'Asset berhasil diupload!' } }));
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Asset upload error:', err);
            setSavingAsset(false);
        }
    };

    // Handle save Google Drive folder URL
    const handleSaveDriveUrl = async () => {
        if (!selectedTask || !driveUrlInput.trim()) return;
        setSavingDriveUrl(true);
        try {
            const url = driveUrlInput.trim();
            await supabase.from('content_items').update({ drive_folder_url: url }).eq('id', selectedTask.id);
            setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, drive_folder_url: url } : t));
            setSelectedTask(prev => prev ? { ...prev, drive_folder_url: url } : null);
            setDriveUrlInput('');
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: 'Link Google Drive disimpan!' } }));
        } catch (err) {
            console.error('Drive URL save error:', err);
        } finally {
            setSavingDriveUrl(false);
        }
    };

    // Handle content result upload (multi-photo) via Supabase Storage
    const handleResultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedTask) return;
        const files: File[] = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const currentAssets = (selectedTask.result_assets as string[]) || [];
        const maxAllowed = 15 - currentAssets.length;

        if (files.length > maxAllowed) {
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: `Maksimum ${maxAllowed} foto lagi (sudah ada ${currentAssets.length})` } }));
            return;
        }

        setUploadingResults(true);
        try {
            const uploadedUrls: string[] = [];

            for (const file of files) {
                // Generate unique filename
                const ext = file.name.split('.').pop() || 'jpg';
                const fileName = `${id}/${selectedTask.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('result-assets')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    // Fallback: try base64 if storage fails (bucket might not exist)
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    uploadedUrls.push(base64);
                    continue;
                }

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('result-assets')
                    .getPublicUrl(uploadData.path);

                uploadedUrls.push(urlData.publicUrl);
            }

            const updatedAssets = [...currentAssets, ...uploadedUrls].slice(0, 15);

            const { error } = await supabase
                .from('content_items')
                .update({
                    result_assets: updatedAssets,
                    result_type: 'photo'
                })
                .eq('id', selectedTask.id);

            if (error) throw error;

            const updatedTask = { ...selectedTask, result_assets: updatedAssets, result_type: 'photo' as const };
            setSelectedTask(updatedTask);
            setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));

            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: 'Berhasil upload hasil foto!' } }));
        } catch (err) {
            console.error('Result upload error:', err);
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Gagal upload hasil.' } }));
        } finally {
            setUploadingResults(false);
        }
    };

    const handleSaveResultVideoUrl = async (url: string) => {
        if (!selectedTask) return;
        setUploadingResults(true);
        try {
            const { error } = await supabase
                .from('content_items')
                .update({
                    result_assets: [url],
                    result_type: 'video'
                } as any)
                .eq('id', selectedTask.id);

            if (error) throw error;

            const updatedTask = { ...selectedTask, result_assets: [url], result_type: 'video' as const };
            setSelectedTask(updatedTask);
            setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));

            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: 'Link video hasil disimpan' } }));
        } catch (err) {
            console.error('Video link save error:', err);
        } finally {
            setUploadingResults(false);
        }
    };

    // Convert Google Drive folder URL to embeddable preview URL
    const getDriveEmbedUrl = (url: string): string => {
        // Handle various Google Drive URL formats
        // Folder: https://drive.google.com/drive/folders/FOLDER_ID
        // File: https://drive.google.com/file/d/FILE_ID/view
        if (url.includes('/drive/folders/')) {
            const folderId = url.split('/drive/folders/')[1]?.split('?')[0]?.split('/')[0];
            if (folderId) return `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
        }
        if (url.includes('/file/d/')) {
            const fileId = url.split('/file/d/')[1]?.split('/')[0];
            if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
        }
        // Fallback: try to use as-is with Google Docs viewer
        return `https://drive.google.com/embeddedfolderview?id=${url}#list`;
    };

    const handleSaveContent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        const currentUserName = localStorage.getItem('user_name') || 'Seseorang';
        const wsName = workspaceData.name;

        const oldTask = modalMode === 'edit' ? tasks.find(t => t.id === editingId) : null;

        const payload = {
            title: formData.title,
            date: formData.date,
            status: formData.status as ContentStatus,
            pillar: formData.pillar,
            type: formData.type,
            platform: formData.platform,
            priority: formData.priority,
            script: formData.script,
            pic: formData.pic || null, // FIX: Use null instead of empty string for UUID safety
            approval: formData.approval || null, // FIX: Use null instead of empty string for UUID safety
            content_link: formData.contentLink
        };

        try {
            // Validation: Ensure workspace ID is a valid UUID
            if (!id || id.length < 36) {
                console.error("Invalid Workspace ID:", id);
                alert("ID Workspace tidak valid. Coba muat ulang halaman.");
                return;
            }

            const currentUserName = localStorage.getItem('user_name') || 'Seseorang';
            const wsName = workspaceData.name;
            let currentContentId = editingId;

            if (modalMode === 'create') {
                const { data, error } = await supabase.from('content_items')
                    .insert([{ workspace_id: id, ...payload }])
                    .select('id')
                    .single();
                if (error) throw error;
                currentContentId = data.id;

                // Notify All Workspace Members
                await notifyWorkspaceMembers({
                    workspaceId: id!,
                    title: 'Konten Baru Dibuat',
                    content: `telah membuat konten baru "${payload.title}" di workspace ${wsName}`,
                    type: 'INFO',
                    metadata: { content_id: currentContentId }
                });
            } else if (modalMode === 'edit' && editingId) {
                const { error } = await supabase.from('content_items').update(payload).eq('id', editingId);
                if (error) throw error;

                // NOTIFICATION LOGIC for status changes
                if (oldTask && oldTask.status !== payload.status) {
                    const isUrgent = payload.status === ContentStatus.PUBLISHED || payload.status === ContentStatus.REVIEW;
                    await notifyWorkspaceMembers({
                        workspaceId: id!,
                        title: 'Update Status Konten',
                        content: `telah mengganti status konten "${payload.title}" pada ${wsName} menjadi ${payload.status}.`,
                        type: 'STATUS_CHANGE',
                        metadata: {
                            content_id: editingId,
                            show_popup: isUrgent
                        }
                    });
                }
            }

            // Detect mentions and names in script (for both Create/Edit)
            if (payload.script) {
                const mentionedNames = new Set<string>();

                // 1. Traditional @mentions
                if (payload.script.includes('@')) {
                    const mentions = payload.script.match(/@\[([^\]]+)\]|@(\w+)/g);
                    if (mentions) {
                        const names = mentions.map(m => m.startsWith('@[') ? m.slice(2, -1) : m.slice(1));
                        names.forEach(n => mentionedNames.add(n));
                    }
                }

                // 2. Scan for full names (even without @) - Global mentioning
                teamMembers.forEach(m => {
                    if (m.name && payload.script.toLowerCase().includes(m.name.toLowerCase())) {
                        mentionedNames.add(m.name);
                    }
                });

                // Send notifications
                for (const name of Array.from(mentionedNames)) {
                    await notifyMemberByName(name, 'MENTION', 'Anda disebut', `menyebut Anda dalam script konten: ${payload.title}`, { content_id: currentContentId });
                }
            }

            setIsModalOpen(false);
            fetchData();

            // Sync to Google Calendar (Silently)
            try {
                await googleCalendarService.syncEvent({
                    id: currentContentId,
                    ...payload,
                    gcal_event_id: oldTask?.gcal_event_id
                });
            } catch (err) {
                console.warn("Failed to sync to GCal", err);
            }
        } catch (error: any) {
            console.error("Error saving content:", error);

            // Detect auth/RLS errors and try to refresh session
            const isAuthError = error?.code === '42501' || error?.message?.includes('row-level security') || error?.status === 401;
            if (isAuthError) {
                // Try refreshing the session
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                if (refreshError || !refreshData?.session) {
                    alert("Sesi Anda telah kedaluwarsa. Silakan login ulang.");
                    window.location.hash = '#/login';
                    return;
                }
                // Session refreshed, suggest retry
                alert("Sesi telah diperbarui. Silakan coba simpan kembali.");
            } else {
                alert("Gagal menyimpan konten.");
            }
        }
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("taskId", id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDropTask = async (e: React.DragEvent, newStatus: ContentStatus) => {
        const taskId = e.dataTransfer.getData("taskId");
        if (!taskId) return;
        const item = tasks.find(t => t.id === taskId);
        const originalTasks = [...tasks];
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        try {
            const { error } = await supabase.from('content_items').update({ status: newStatus }).eq('id', taskId);
            if (error) throw error;

            // Notification logic
            if (item && item.status !== newStatus) {
                const wsName = workspaceData.name;
                const isUrgent = newStatus === ContentStatus.PUBLISHED || newStatus === ContentStatus.REVIEW;
                await notifyWorkspaceMembers({
                    workspaceId: id!,
                    title: 'Update Status Konten (Drag & Drop)',
                    content: `telah mengganti status konten "${item.title}" pada ${wsName} menjadi ${newStatus}.`,
                    type: 'STATUS_CHANGE',
                    metadata: {
                        content_id: taskId,
                        show_popup: isUrgent
                    }
                });
            }
        } catch (err) {
            console.error("DnD Error:", err);
            setTasks(originalTasks);
            alert("Gagal memindahkan kartu.");
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(workspaceData.invite_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRegenerateCode = async () => {
        if (!id) return;
        if (!confirm("Ganti kode undangan?")) return;
        setIsRegenerating(true);
        try {
            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            await supabase.from('workspaces').update({ invite_code: newCode }).eq('id', id);
            setWorkspaceData(prev => ({ ...prev, invite_code: newCode }));
        } catch (error) {
            alert("Gagal update kode.");
        } finally {
            setIsRegenerating(false);
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("Ukuran file terlalu besar (Maks 5MB). Gunakan link eksternal untuk file besar.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                const fileMarkdown = `\n[${file.name}](${base64})`;
                setFormData(prev => ({ ...prev, script: prev.script ? prev.script + fileMarkdown : fileMarkdown }));
                alert(`File "${file.name}" berhasil dilampirkan!`);
            };
            reader.readAsDataURL(file);
        }
    };

    if (loading) return <div className="flex justify-center h-full items-center"><Loader2 className="animate-spin text-slate-300" /></div>;
    if (errorState) return <div className="p-8 text-center text-red-500">{errorState}</div>;

    return (
        <>
            {/* ═══════════════════════════════════════════════════════════════════
                MOBILE VIEW (< md) - Trello-inspired card list
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="block md:hidden flex flex-col h-full pb-24 animate-in fade-in duration-300">
                {/* Mobile Header */}
                <div className="flex items-center gap-2 mb-3 sticky top-0 z-40 bg-background py-2">
                    <button onClick={() => navigate('/plan')}
                        className="p-2 rounded-xl bg-card border border-border text-foreground flex-shrink-0">
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-black text-foreground truncate">{workspaceData.name || 'Content Plan'}</h2>
                        <p className="text-[9px] text-mutedForeground">{tasks.length} konten · {workspaceData.account_name}</p>
                    </div>
                    <button onClick={handleOpenCreateModal}
                        className="flex items-center gap-1 px-3 py-2 bg-accent text-white rounded-xl text-xs font-bold flex-shrink-0">
                        <Plus size={14} /> Tambah
                    </button>
                </div>

                {/* Platform filter - horizontal scroll */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-2 flex-shrink-0">
                    <button onClick={() => setFilterPlatform('all')}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black border transition-all ${filterPlatform === 'all' ? 'bg-foreground text-background border-foreground' : 'bg-card border-border text-foreground'}`}>
                        Semua
                    </button>
                    {workspaceData.platforms.map(p => (
                        <button key={formatStatus(p)} onClick={() => setFilterPlatform(p === 'IG' ? 'Instagram' : p === 'TK' ? 'TikTok' : p === 'YT' ? 'YouTube' : p === 'LI' ? 'LinkedIn' : p === 'FB' ? 'Facebook' : p)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black border transition-all ${filterPlatform !== 'all' && (filterPlatform === (p === 'IG' ? 'Instagram' : p === 'TK' ? 'TikTok' : p === 'YT' ? 'YouTube' : p === 'LI' ? 'LinkedIn' : p === 'FB' ? 'Facebook' : p)) ? 'bg-accent text-white border-accent' : 'bg-card border-border text-foreground'}`}>
                            {formatStatus(p)}
                        </button>
                    ))}
                </div>

                {/* Status tabs - Trello style */}
                <div className="flex gap-1 overflow-x-auto no-scrollbar pb-2 mb-3 flex-shrink-0">
                    {[
                        { value: 'all', label: 'Semua', color: 'bg-slate-500' },
                        { value: ContentStatus.TODO, label: 'Planning', color: 'bg-slate-400' },
                        { value: ContentStatus.IN_PROGRESS, label: 'In Progress', color: 'bg-blue-500' },
                        { value: ContentStatus.REVIEW, label: 'Review', color: 'bg-amber-500' },
                        { value: ContentStatus.REVISION, label: 'Revisi', color: 'bg-orange-500' },
                        { value: ContentStatus.SCHEDULED, label: 'Scheduled', color: 'bg-purple-500' },
                        { value: ContentStatus.PUBLISHED, label: 'Published', color: 'bg-emerald-500' },
                    ].map(s => {
                        const count = s.value === 'all' ? tasks.length : tasks.filter(t => t.status === s.value).length;
                        return (
                            <button key={s.value} onClick={() => setMobileStatusTab(s.value)}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border transition-all ${mobileStatusTab === s.value ? 'bg-foreground text-background border-foreground' : 'bg-card border-border text-foreground'}`}>
                                <div className={`w-2 h-2 rounded-full ${s.color}`} />
                                {s.label}
                                <span className={`text-[8px] font-black px-1 py-0.5 rounded-full ${mobileStatusTab === s.value ? 'bg-card/20' : 'bg-muted'}`}>{count}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content Cards - Trello style */}
                <div className="flex-1 overflow-y-auto space-y-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        tasks
                            .filter(t => {
                                const statusMatch = mobileStatusTab === 'all' || t.status === mobileStatusTab;
                                const platformMatch = filterPlatform === 'all' || t.platform === filterPlatform;
                                return statusMatch && platformMatch;
                            })
                            .sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime())
                            .map(task => {
                                const statusColors: Record<string, string> = {
                                    [ContentStatus.TODO]: 'border-l-slate-400',
                                    [ContentStatus.IN_PROGRESS]: 'border-l-blue-500',
                                    [ContentStatus.REVIEW]: 'border-l-amber-500',
                                    [ContentStatus.REVISION]: 'border-l-orange-500',
                                    [ContentStatus.SCHEDULED]: 'border-l-purple-500',
                                    [ContentStatus.PUBLISHED]: 'border-l-emerald-500',
                                };
                                const statusBadgeColors: Record<string, string> = {
                                    [ContentStatus.TODO]: 'bg-slate-100 text-slate-600',
                                    [ContentStatus.IN_PROGRESS]: 'bg-blue-50 text-blue-700',
                                    [ContentStatus.REVIEW]: 'bg-amber-50 text-amber-700',
                                    [ContentStatus.REVISION]: 'bg-orange-50 text-orange-700',
                                    [ContentStatus.SCHEDULED]: 'bg-purple-50 text-purple-700',
                                    [ContentStatus.PUBLISHED]: 'bg-emerald-50 text-emerald-700',
                                };
                                return (
                                    <button key={task.id} onClick={() => handleCardClick(task)}
                                        className={`w-full bg-card border border-border border-l-4 ${statusColors[task.status] || 'border-l-slate-300'} rounded-xl p-3 text-left active:scale-[0.99] transition-transform`}>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <p className="text-sm font-bold text-foreground line-clamp-2 flex-1">{task.title}</p>
                                            <span className={`flex-shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full ${statusBadgeColors[task.status] || 'bg-muted text-mutedForeground'}`}>
                                                {task.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {task.platform && (
                                                <span className="text-[9px] font-bold text-mutedForeground bg-muted px-1.5 py-0.5 rounded">{task.platform}</span>
                                            )}
                                            {task.date && (
                                                <span className="text-[9px] font-bold text-mutedForeground flex items-center gap-0.5">
                                                    <Calendar size={9} /> {new Date(task.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                </span>
                                            )}
                                            {task.pillar && (
                                                <span className="text-[9px] font-bold text-mutedForeground bg-muted px-1.5 py-0.5 rounded">{task.pillar}</span>
                                            )}
                                            {task.pic && (
                                                <span className="text-[9px] font-bold text-accent">{task.pic}</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                    )}
                    {!loading && tasks.filter(t => {
                        const statusMatch = mobileStatusTab === 'all' || t.status === mobileStatusTab;
                        const platformMatch = filterPlatform === 'all' || t.platform === filterPlatform;
                        return statusMatch && platformMatch;
                    }).length === 0 && (
                            <div className="text-center py-16 border-[3px] border-dashed border-slate-300 rounded-[2.5rem] bg-muted shadow-inner">
                                <Layers size={28} className="text-accent/40 mx-auto mb-2" />
                                <p className="text-sm font-bold text-foreground mb-1">Belum ada konten</p>
                                <button onClick={handleOpenCreateModal} className="mt-2 px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold">
                                    + Tambah Konten
                                </button>
                            </div>
                        )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                DESKTOP VIEW (≥ md) - Original Kanban/Table Layout
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="hidden md:flex flex-col h-full min-h-screen pb-10 relative overflow-x-hidden">
                {/* Header Section - Premium Bento Style (2 rows) */}
                <div className={`flex flex-col gap-2 flex-shrink-0 w-full mb-0 transition-all duration-300 ${isScrolled ? 'sticky top-0 z-40 bg-card/95 backdrop-blur-md py-4 border-b-[3.5px] border-slate-900 shadow-sm' : ''}`}>

                    {/* ROW 1: Identity & Team Info */}
                    <div className="flex flex-col lg:flex-row justify-between items-center lg:items-start gap-6 px-6">
                        {/* LEFT: Branding Identity */}
                        <div className="flex flex-col lg:flex-row items-center gap-8">
                            {/* 1. Back & Enlarged Logo (No inner box) */}
                            <div className="flex items-center gap-5 p-1">
                                <button
                                    onClick={() => navigate('/plan')}
                                    className="w-12 h-12 flex items-center justify-center rounded-2xl border-[3px] border-border bg-card hover:bg-muted text-foreground transition-all shadow-hard-mini active:translate-y-[2px] active:shadow-none"
                                >
                                    <ArrowLeft size={20} strokeWidth={4} />
                                </button>

                                <div className="w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center transition-transform hover:scale-105 duration-500 select-none">
                                    {workspaceData.logo_url ? (
                                        <img
                                            src={workspaceData.logo_url}
                                            alt="Logo"
                                            className="w-full h-full object-contain drop-shadow-[5px_5px_0px_rgba(30,27,75,0.15)]"
                                        />
                                    ) : (
                                        <Layers size={80} className="text-indigo-500" strokeWidth={2.5} />
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    {workspaceData.period && (
                                        <span className="px-3 py-1 bg-yellow-400 border-[2.5px] border-border text-foreground font-black rounded-xl text-[9px] shadow-hard-mini">
                                            {new Date(workspaceData.period).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                        </span>
                                    )}
                                    <div className="flex gap-2">
                                        {workspaceData.platforms.map(p => (
                                            <span key={formatStatus(p)} className="px-2 py-0.5 bg-violet-400 border-[2.5px] border-border text-white font-black rounded-lg text-[8px] shadow-hard-mini">
                                                {formatStatus(p)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <h2 className="font-heading font-black text-foreground leading-tight text-3xl sm:text-4xl lg:text-5xl tracking-tight">
                                    {workspaceData.name}
                                </h2>
                            </div>
                        </div>

                        {/* 2. Team & Integrated Socials */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 bg-card border-[3.5px] border-border rounded-[2.5rem] p-4 shadow-hard">
                            {/* Team Bubbles */}
                            <div className="flex items-center gap-3 pr-6 border-r-[3px] border-indigo-50">
                                <div className="flex -space-x-3">
                                    {teamMembers.slice(0, 4).map((m, i) => (
                                        <button key={i} onClick={() => setIsMemberModalOpen(true)} className="relative group transition-transform hover:scale-110 hover:z-20">
                                            <img
                                                src={m.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.name)}`}
                                                alt={m.name}
                                                className="w-10 h-10 rounded-xl border-[2.5px] border-border shadow-hard-mini bg-card object-cover group-hover:border-accent"
                                            />
                                        </button>
                                    ))}
                                    {teamMembers.length > 4 && (
                                        <button
                                            onClick={() => setIsMemberModalOpen(true)}
                                            className="w-10 h-10 rounded-xl border-[2.5px] border-border shadow-hard-mini bg-foreground text-background flex items-center justify-center text-[10px] font-black z-10 hover:bg-mutedForeground"
                                        >
                                            +{teamMembers.length - 4}
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-mutedForeground whitespace-nowrap">Collaborators</span>
                                    <button
                                        onClick={() => setIsMemberModalOpen(true)}
                                        className="text-[10px] font-black text-foreground hover:text-violet-600 flex items-center gap-1"
                                    >
                                        {teamMembers.length || 1} People <ChevronDown size={14} strokeWidth={4} />
                                    </button>
                                </div>
                            </div>

                            {/* Linked Accounts - Integrated */}
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black text-mutedForeground rotate-90 sm:rotate-0">Socials</span>
                                <div className="flex gap-2">
                                    {workspaceData.platforms.map(p => {
                                        const link = `https://${p === 'IG' ? 'instagram.com' : p === 'TK' ? 'tiktok.com' : 'example.com'}/${workspaceData.account_name.replace('@', '')}`;
                                        return (
                                            <a
                                                key={formatStatus(p)}
                                                href={link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-10 h-10 flex items-center justify-center bg-muted/30 border-[2.5px] border-border rounded-xl shadow-hard-mini hover:-translate-y-1 hover:bg-card transition-all text-foreground"
                                                title={`${formatStatus(p)}: ${workspaceData.account_name}`}
                                            >
                                                {getPlatformIcon(p === 'IG' ? Platform.INSTAGRAM : p === 'TK' ? Platform.TIKTOK : Platform.YOUTUBE)}
                                            </a>
                                        );
                                    })}
                                    {(currentUserRole === 'Developer' || currentUserRole === 'Admin' || currentUserRole === 'Owner') && (
                                        <button
                                            onClick={() => setIsInviteModalOpen(true)}
                                            className="w-10 h-10 rounded-xl border-[2.5px] border-dashed border-indigo-200 text-mutedForeground flex items-center justify-center hover:border-violet-500 hover:text-violet-500 hover:bg-violet-50 transition-all"
                                            title="Invite Team"
                                        >
                                            <Plus size={18} strokeWidth={3} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ROW 2: Navigation & Filters Toolbar - Borderless with Divider */}
                {viewMode !== 'brand_asset' && (
                    <div className={`pb-4 mb-4 mx-6 flex flex-col xl:flex-row gap-4 items-center justify-between transition-all duration-300 border-b-[3px] border-dashed border-border/50 ${isScrolled ? 'sticky top-24 z-30 bg-card/90 backdrop-blur-md px-6 py-4 rounded-3xl border-transparent shadow-hard-mini scale-[0.98]' : ''}`}>
                        <div className="flex flex-wrap items-center gap-6 justify-center lg:justify-start">
                            {/* View Switcher Integrated */}
                            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl">
                                {[
                                    { id: 'kanban', label: 'Board', icon: LayoutGrid, color: 'text-foreground' },
                                    { id: 'table', label: 'Table', icon: Table, color: 'text-foreground' },
                                    { id: 'brand_asset', label: 'Asset', icon: Palette, color: 'text-foreground' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setViewMode(tab.id as any)}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all text-[12px] font-black ${viewMode === tab.id ? `bg-card ${tab.color} shadow-hard-mini border-[2.5px] border-border` : 'text-mutedForeground hover:text-foreground bg-transparent border-[2.5px] border-transparent'}`}
                                    >
                                        <tab.icon size={14} strokeWidth={4} />
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="h-8 w-[2px] bg-indigo-100/50 hidden lg:block" />

                            {/* Platform Filters */}
                            <div className="flex flex-wrap items-center gap-3 justify-center">
                                <button
                                    onClick={() => setFilterPlatform('all')}
                                    className={`px-6 py-2.5 rounded-xl border-[2.5px] border-border font-black text-[12px] transition-all flex items-center gap-2 ${filterPlatform === 'all' ? 'bg-foreground text-background translate-y-[1px]' : 'bg-card text-foreground hover:-translate-y-1 hover:shadow-hard-mini'}`}
                                >
                                    Semua
                                </button>

                                {Object.values(Platform).filter(p => {
                                    const code = p === Platform.INSTAGRAM ? 'IG' :
                                        p === Platform.TIKTOK ? 'TK' :
                                            p === Platform.YOUTUBE ? 'YT' :
                                                p === Platform.LINKEDIN ? 'LI' :
                                                    p === Platform.FACEBOOK ? 'FB' :
                                                        p === Platform.THREADS ? 'TH' : '';
                                    return workspaceData.platforms.includes(code);
                                }).map(p => (
                                    <button
                                        key={formatStatus(p)}
                                        onClick={() => setFilterPlatform(p)}
                                        className={`px-6 py-2.5 rounded-xl border-[2.5px] border-indigo-950 font-black text-[12px] transition-all flex items-center gap-2 ${filterPlatform === p ? 'bg-violet-600 border-indigo-950 text-white translate-y-[1px]' : 'bg-card text-foreground hover:-translate-y-1 hover:shadow-[3px_3px_0px_#1e1b4b]'}`}
                                    >
                                        {getPlatformIcon(p)}
                                        {formatStatus(p)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Period & CTA */}
                        <div className="flex flex-wrap items-center gap-4 justify-center lg:justify-end w-full xl:w-auto">
                            <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-[1.25rem] border-[3px] border-indigo-950/20 shadow-hard-mini-mini">
                                <Calendar size={18} strokeWidth={3} className="ml-2 text-indigo-500" />
                                <input
                                    type="date"
                                    value={filterDateFrom}
                                    onChange={(e) => setFilterDateFrom(e.target.value)}
                                    className="px-4 py-2.5 rounded-xl border-[2.5px] border-indigo-950 text-[13px] font-bold outline-none bg-card shadow-button-mini active:scale-95 transition-all"
                                />
                                <span className="text-[13px] font-black text-indigo-300">→</span>
                                <input
                                    type="date"
                                    value={filterDateTo}
                                    onChange={(e) => setFilterDateTo(e.target.value)}
                                    className="px-4 py-2.5 rounded-xl border-[2.5px] border-indigo-950 text-[13px] font-bold outline-none bg-card shadow-button-mini active:scale-95 transition-all"
                                />
                            </div>

                            <div className="h-8 w-[2px] bg-indigo-100/50 hidden xl:block" />

                            {viewMode === 'table' && (
                                <div className="relative">
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="appearance-none pl-5 pr-12 py-3.5 rounded-2xl border-[3px] border-indigo-950 text-[13px] font-bold outline-none bg-card shadow-hard-mini cursor-pointer hover:bg-muted transition-all active:scale-95"
                                    >
                                        <option value="all">Semua Status</option>
                                        {Object.values(ContentStatus).map(s => (
                                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} strokeWidth={3} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500" />
                                </div>
                            )}

                            <Button
                                icon={<Plus size={20} strokeWidth={4} />}
                                className="h-14 px-10 text-[13px] font-black shadow-hard border-[3px] border-indigo-950 translate-x-1 active:translate-x-0 active:translate-y-1 active:shadow-none bg-violet-600 hover:bg-violet-700 rounded-2xl whitespace-nowrap"
                                onClick={handleOpenCreateModal}
                            >
                                Konten Baru
                            </Button>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                {viewMode === 'kanban' ? (
                    <div className="flex-1 w-full overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
                        <div className="flex gap-2 sm:gap-3 md:gap-4 lg:gap-6 items-start min-w-min w-full pl-2 sm:pl-3 md:pl-4 pr-3 sm:pr-4 md:pr-8">
                            {[ContentStatus.TODO, ContentStatus.IN_PROGRESS, ContentStatus.REVIEW, ContentStatus.REVISION, ContentStatus.SCHEDULED, ContentStatus.PUBLISHED].map(status => (
                                <KanbanColumn
                                    key={status}
                                    status={status}
                                    items={tasks.filter(t => t.status === status && (filterPlatform === 'all' || t.platform === filterPlatform) && matchesDateFilter(t.date))}
                                    textColor={
                                        status === ContentStatus.TODO ? 'text-foreground' :
                                            status === ContentStatus.IN_PROGRESS ? 'text-blue-500' :
                                                status === ContentStatus.REVIEW ? 'text-pink-500' :
                                                    status === ContentStatus.REVISION ? 'text-orange-500' :
                                                        status === ContentStatus.SCHEDULED ? 'text-purple-500' : 'text-emerald-500'
                                    }
                                    members={teamMembers}
                                    onEdit={handleOpenEditModal}
                                    onDelete={handleDeleteContent}
                                    onApprove={handleApprove}
                                    userRole={currentUserRole}
                                    onDragStart={handleDragStart}
                                    onDropTask={handleDropTask}
                                    onCardClick={handleCardClick}
                                />
                            ))}

                        </div>
                    </div>
                ) : viewMode === 'brand_asset' ? (
                    /* ═══ BRAND ASSET VIEW ═══ */
                    <div className="flex-1 w-full pb-8 px-2">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8 mt-6">
                            <div>
                                <h3 className="text-2xl font-heading font-black text-foreground flex items-center gap-3">
                                    <Palette size={28} className="text-accent" />
                                    Brand Assets
                                </h3>
                                <p className="text-sm font-bold text-mutedForeground mt-1">
                                    Kelola semua aset brand, catatan, dan referensi di satu tempat
                                </p>
                            </div>
                            <Button
                                icon={<Plus size={18} />}
                                onClick={() => {
                                    setNewAssetType('note');
                                    setNewAssetTitle('');
                                    setNewAssetContent('');
                                    setNewAssetFileName('');
                                    setIsAddAssetModalOpen(true);
                                }}
                            >
                                Tambah Asset
                            </Button>
                        </div>

                        {/* Gallery Grid */}
                        {brandAssets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 border-[3px] border-dashed border-slate-300 rounded-[32px] bg-card shadow-[4px_4px_0px_#0f172a]">
                                <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mb-6">
                                    <Palette size={36} className="text-accent" />
                                </div>
                                <h4 className="text-xl font-black text-foreground mb-2">Belum ada Brand Asset</h4>
                                <p className="text-sm font-bold text-mutedForeground mb-6 max-w-md text-center">
                                    Tambahkan logo, catatan brand, warna, file panduan, link referensi, dan aset lainnya.
                                </p>
                                <Button
                                    icon={<Plus size={18} />}
                                    onClick={() => {
                                        setNewAssetType('note');
                                        setNewAssetTitle('');
                                        setNewAssetContent('');
                                        setNewAssetFileName('');
                                        setIsAddAssetModalOpen(true);
                                    }}
                                >
                                    Tambah Asset Pertama
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {brandAssets.map(asset => (
                                    <div key={asset.id} className="bg-card border-[3px] border-slate-900 rounded-2xl overflow-hidden shadow-[2px_2px_0px_#0f172a] hover:shadow-[4px_4px_0px_#0f172a] hover:-translate-y-1 transition-all group relative">
                                        {/* Delete Button */}
                                        <button
                                            onClick={() => handleDeleteBrandAsset(asset.id)}
                                            className="absolute top-3 right-3 p-1.5 rounded-lg bg-card/90 border border-border text-mutedForeground hover:text-red-500 hover:border-red-300 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all z-10"
                                        >
                                            <Trash2 size={14} />
                                        </button>

                                        {/* Preview Area */}
                                        {asset.type === 'image' && (
                                            <div className="aspect-video bg-muted overflow-hidden">
                                                <img src={asset.content} alt={asset.title} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        {asset.type === 'pdf' && (
                                            <div
                                                className="aspect-video bg-red-50 flex flex-col items-center justify-center cursor-pointer hover:bg-red-100 transition-colors relative"
                                                onClick={() => setBrandPdfPreviewUrl(asset.content)}
                                            >
                                                <div className="absolute inset-0 opacity-30">
                                                    <iframe src={asset.content} className="w-full h-full pointer-events-none" title="PDF Mini Preview" />
                                                </div>
                                                <div className="relative z-10 flex flex-col items-center">
                                                    <FileText size={36} className="text-red-500 mb-2" />
                                                    <span className="text-xs font-black text-red-600">PDF Preview</span>
                                                    <span className="text-[10px] font-bold text-red-400 mt-1 flex items-center gap-1">
                                                        <Eye size={10} /> Klik untuk buka
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        {asset.type === 'color' && (
                                            <div className="aspect-video flex items-center justify-center" style={{ backgroundColor: asset.content || '#6366f1' }}>
                                                <span className="text-white font-black text-lg drop-shadow-lg">{asset.content || '#6366f1'}</span>
                                            </div>
                                        )}
                                        {asset.type === 'link' && (
                                            <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center">
                                                <Globe size={36} className="text-blue-500 mb-2" />
                                                <span className="text-[10px] font-bold text-blue-500 truncate max-w-[80%] px-2">{asset.content}</span>
                                            </div>
                                        )}
                                        {asset.type === 'note' && (
                                            <div className="aspect-video bg-gradient-to-br from-yellow-50 to-amber-50 p-4 flex flex-col">
                                                <StickyNote size={20} className="text-amber-500 mb-2 shrink-0" />
                                                <p className="text-xs font-bold text-slate-700 line-clamp-4 flex-1 overflow-hidden">{asset.content}</p>
                                            </div>
                                        )}
                                        {asset.type === 'file' && (
                                            <div className="aspect-video bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center">
                                                <File size={36} className="text-slate-500 mb-2" />
                                                <span className="text-[10px] font-bold text-slate-500 truncate max-w-[80%] px-2">{asset.fileName || 'File'}</span>
                                            </div>
                                        )}

                                        {/* Info Area */}
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-foreground text-sm truncate">{asset.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${asset.type === 'note' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                            asset.type === 'link' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                                asset.type === 'image' ? 'bg-pink-100 text-pink-700 border-pink-200' :
                                                                    asset.type === 'pdf' ? 'bg-red-100 text-red-700 border-red-200' :
                                                                        asset.type === 'color' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                                            'bg-slate-100 text-slate-600 border-slate-200'
                                                            }`}>
                                                            {asset.type}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-mutedForeground">
                                                            {new Date(asset.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                {asset.type === 'link' && (
                                                    <a href={asset.content.startsWith('http') ? asset.content : `https://${asset.content}`} target="_blank" rel="noreferrer"
                                                        className="p-2 rounded-lg border border-border hover:border-accent hover:bg-accent/10 transition-all text-mutedForeground hover:text-accent shrink-0">
                                                        <ExternalLink size={14} />
                                                    </a>
                                                )}
                                                {(asset.type === 'file' || asset.type === 'image') && (
                                                    <a href={asset.content} download={asset.fileName || asset.title}
                                                        className="p-2 rounded-lg border border-border hover:border-accent hover:bg-accent/10 transition-all text-mutedForeground hover:text-accent shrink-0">
                                                        <Download size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Add New Card */}
                                <button
                                    onClick={() => {
                                        setNewAssetType('note');
                                        setNewAssetTitle('');
                                        setNewAssetContent('');
                                        setNewAssetFileName('');
                                        setIsAddAssetModalOpen(true);
                                    }}
                                    className="bg-card border-[3px] border-dashed border-slate-300 rounded-[32px] shadow-[4px_4px_0px_#0f172a] flex flex-col items-center justify-center py-16 hover:border-slate-900 hover:bg-muted transition-all group/add hover:-translate-y-1 active:scale-95"
                                >
                                    <div className="w-16 h-16 rounded-[24px] bg-card border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] flex items-center justify-center mb-4 group-hover/add:bg-violet-50 transition-colors">
                                        <Plus size={32} className="text-foreground group-hover/add:text-accent" strokeWidth={3} />
                                    </div>
                                    <span className="text-sm font-black text-foreground group-hover/add:text-accent">Tambah Asset</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 w-full flex flex-col pt-2 pb-6 px-1">
                        {/* Table View Header */}
                        <div className="px-4 mb-6 flex items-center justify-between">
                            <h3 className="text-2xl font-heading font-black text-foreground tracking-tight">Summary List</h3>
                            <div className="h-[3px] flex-1 bg-slate-100 mx-6 rounded-full" />
                        </div>

                        {/* Table Container - Custom Scrollbar */}
                        <div className="flex-1 pb-4 overflow-x-auto no-scrollbar">
                            <table className="w-full min-w-[1000px] text-left border-separate border-spacing-y-3 px-2">
                                {/* Header */}
                                <thead className="sticky top-0 z-20">
                                    <tr className="group">
                                        <th className="px-5 py-4 bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest border-y-[3px] border-l-[3px] border-slate-950 dark:border-slate-800 rounded-l-2xl shadow-[0px_4px_0px_#0f172a] dark:shadow-[0px_4px_0px_#0f172a]">Status</th>
                                        <th className="px-5 py-4 bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest border-y-[3px] border-slate-950 dark:border-slate-800 shadow-[0px_4px_0px_#0f172a] dark:shadow-[0px_4px_0px_#0f172a]">Platform</th>
                                        <th className="px-5 py-4 bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest border-y-[3px] border-slate-950 dark:border-slate-800 shadow-[0px_4px_0px_#0f172a] dark:shadow-[0px_4px_0px_#0f172a] cursor-pointer hover:bg-blue-700 transition-colors" onClick={() => setTableSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                                            <div className="flex items-center gap-2">Tanggal {tableSortOrder === 'asc' ? '↑' : '↓'}</div>
                                        </th>
                                        <th className="px-5 py-4 bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest border-y-[3px] border-slate-950 dark:border-slate-800 shadow-[0px_4px_0px_#0f172a] dark:shadow-[0px_4px_0px_#0f172a] min-w-[200px]">Judul Konten</th>
                                        <th className="px-5 py-4 bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest border-y-[3px] border-slate-950 dark:border-slate-800 shadow-[0px_4px_0px_#0f172a] dark:shadow-[0px_4px_0px_#0f172a]">Pillar</th>
                                        <th className="px-5 py-4 bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest border-y-[3px] border-slate-950 dark:border-slate-800 shadow-[0px_4px_0px_#0f172a] dark:shadow-[0px_4px_0px_#0f172a] text-center">Script</th>
                                        <th className="px-5 py-4 bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest border-y-[3px] border-slate-950 dark:border-slate-800 shadow-[0px_4px_0px_#0f172a] dark:shadow-[0px_4px_0px_#0f172a]">Project Lead</th>
                                        <th className="px-5 py-4 bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest border-y-[3px] border-slate-950 dark:border-slate-800 shadow-[0px_4px_0px_#0f172a] dark:shadow-[0px_4px_0px_#0f172a] text-center">Approval</th>
                                        <th className="px-5 py-4 bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest border-y-[3px] border-slate-950 dark:border-slate-800 shadow-[0px_4px_0px_#0f172a] dark:shadow-[0px_4px_0px_#0f172a] min-w-[150px]">Social Link</th>
                                        <th className="px-5 py-4 bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest border-y-[3px] border-r-[3px] border-slate-950 dark:border-slate-800 rounded-r-2xl shadow-[0px_4px_0px_#0f172a] dark:shadow-[0px_4px_0px_#0f172a] text-right pr-8">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-transparent">
                                    {filteredTableTasks.length > 0 ? (
                                        filteredTableTasks.map((task) => (
                                            <tr
                                                key={task.id}
                                                className="group relative transition-all duration-300 hover:-translate-y-1 hover:-translate-x-[2px] bg-card rounded-2xl hover:shadow-[4px_6px_0px_#0f172a] dark:hover:shadow-[4px_6px_0px_#000000] z-0 hover:z-50"
                                            >
                                                {/* 1. Status (Interactive Dropdown) */}
                                                <td className="p-3 border-y-[2.5px] border-l-[2.5px] border-border rounded-l-2xl bg-inherit transition-colors">
                                                    <div className="relative">
                                                        <select
                                                            value={task.status}
                                                            onChange={(e) => handleQuickUpdateStatus(task.id, e.target.value as ContentStatus)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className={`appearance-none outline-none font-black text-[12px] uppercase tracking-wider py-1.5 pl-3 pr-8 rounded-lg border-2 cursor-pointer transition-all w-full min-w-[130px] shadow-sm ${task.status === ContentStatus.TODO ? 'bg-slate-200 text-slate-800 border-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600' :
                                                                task.status === ContentStatus.IN_PROGRESS ? 'bg-blue-500 text-white border-blue-700' :
                                                                    task.status === ContentStatus.REVIEW ? 'bg-amber-400 text-amber-950 border-amber-600' :
                                                                        task.status === ContentStatus.REVISION ? 'bg-rose-500 text-white border-rose-700' :
                                                                            task.status === ContentStatus.SCHEDULED ? 'bg-fuchsia-500 text-white border-fuchsia-700' :
                                                                                'bg-emerald-500 text-white border-emerald-700'
                                                                }`}
                                                        >
                                                            {Object.values(ContentStatus).map((s) => (
                                                                <option key={s} value={s}>{formatStatus(s)}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${task.status === ContentStatus.TODO || task.status === ContentStatus.REVIEW ? 'text-slate-800' : 'text-white'}`} />
                                                    </div>
                                                </td>

                                                {/* 2. Platform */}
                                                <td className="p-3 border-y-[2.5px] border-border bg-inherit transition-colors cursor-pointer" onClick={() => handleCardClick(task)}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1.5 rounded-md border-[2px] border-indigo-950 bg-card shadow-[2px_2px_0px_#1e1b4b] transform -rotate-2`}>
                                                            {getPlatformIcon(task.platform)}
                                                        </div>
                                                        <span className="text-[13px] font-bold text-foreground">{task.platform}</span>
                                                    </div>
                                                </td>

                                                {/* 3. Tanggal */}
                                                <td className="p-3 border-y-[2.5px] border-border bg-inherit transition-colors cursor-pointer" onClick={() => handleCardClick(task)}>
                                                    <div className="flex flex-col">
                                                        <span className="text-[12px] font-bold text-mutedForeground mb-0.5">Upload Date</span>
                                                        <div className="flex items-center gap-1.5 text-foreground font-bold text-[13px] whitespace-nowrap">
                                                            <Calendar size={14} className="text-violet-500" />
                                                            {task.date ? new Date(task.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* 4. Judul */}
                                                <td className="p-3 border-y-[2.5px] border-border bg-inherit transition-colors cursor-pointer" onClick={() => handleCardClick(task)}>
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="font-heading font-black text-foreground text-[15px] line-clamp-1 tracking-tight" title={task.title}>
                                                            {task.title}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[12px] font-bold text-violet-600 bg-violet-50 border border-violet-200 dark:text-violet-400 dark:bg-violet-500/10 dark:border-violet-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                                                {getTypeIcon(task.type)} {task.type}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* 5. Pillar */}
                                                <td className="p-3 border-y-[2.5px] border-border bg-inherit transition-colors cursor-pointer" onClick={() => handleCardClick(task)}>
                                                    {task.pillar ? (
                                                        <span className="px-3 py-1 rounded w-fit text-[12px] font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-2 border-slate-700 dark:border-slate-300 whitespace-nowrap shadow-sm tracking-wide">
                                                            {task.pillar}
                                                        </span>
                                                    ) : (
                                                        <span className="text-mutedForeground font-bold text-[13px]">—</span>
                                                    )}
                                                </td>

                                                {/* 6. Script Preview Button */}
                                                <td className="p-3 border-y-[2.5px] border-border bg-inherit transition-colors cursor-pointer text-center">
                                                    <button
                                                        onClick={() => handleCardClick(task)}
                                                        className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-105 flex items-center justify-center mx-auto ${task.script
                                                            ? 'bg-slate-900 dark:bg-slate-100 border-slate-700 dark:border-slate-300 text-white dark:text-slate-900 shadow-sm'
                                                            : 'bg-transparent border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-600'
                                                            }`}
                                                    >
                                                        <FileText size={16} strokeWidth={task.script ? 2.5 : 2} />
                                                    </button>
                                                </td>
                                                {/* 7. PIC */}
                                                <td className="p-3 border-y-[2.5px] border-border bg-inherit transition-colors cursor-pointer" onClick={() => handleCardClick(task)}>
                                                    {task.pic ? (
                                                        <div className="flex items-center gap-2" title={task.pic}>
                                                            <img
                                                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(task.pic)}`}
                                                                alt={task.pic}
                                                                className="w-8 h-8 rounded-full border border-border bg-card object-cover"
                                                            />
                                                            <span className="text-[12px] font-bold text-foreground truncate max-w-[100px]">{task.pic}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-mutedForeground font-bold text-[13px]">—</span>
                                                    )}
                                                </td>

                                                {/* 7.5 Approval Status (NEW) */}
                                                <td className="p-3 border-y-[2.5px] border-border bg-inherit transition-colors text-center relative">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        {(() => {
                                                            const status = task.approval_status;
                                                            if (status === 'approved') return <span className="px-2 py-0.5 rounded w-fit bg-transparent text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500 text-[12px] font-black uppercase tracking-widest flex items-center gap-1"><Check size={14} strokeWidth={3} /> Approved</span>;
                                                            if (status === 'revision') return <span className="px-2 py-0.5 rounded w-fit bg-transparent text-rose-600 dark:text-rose-400 border-2 border-rose-500 text-[12px] font-black uppercase tracking-widest flex items-center gap-1"><RefreshCw size={14} strokeWidth={3} /> Revision</span>;
                                                            return <span className="px-2 py-0.5 rounded w-fit bg-transparent text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-600 text-[12px] font-bold uppercase tracking-widest">Pending</span>;
                                                        })()}
                                                        {(currentUserRole === 'Admin' || currentUserRole === 'Owner' || currentUserRole === 'Developer') && (
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 bg-card p-1 shadow-md rounded border border-border">
                                                                <button onClick={(e) => { e.stopPropagation(); handleApprove(task.id, 'approved'); }} className="p-1.5 rounded bg-transparent text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 border-2 border-transparent hover:border-emerald-600 transition-all" title="Approve"><Check size={16} strokeWidth={3} /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleApprove(task.id, 'revision'); }} className="p-1.5 rounded bg-transparent text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500 border-2 border-transparent hover:border-rose-600 transition-all" title="Revision"><RefreshCw size={16} strokeWidth={3} /></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* 8. Link Input (Interactive - Controlled) */}
                                                <td className="p-3 border-y-[2.5px] border-border bg-inherit transition-colors">
                                                    <div className="relative flex items-center">
                                                        <LinkIcon size={14} className={`absolute left-3 z-10 ${task.contentLink ? 'text-blue-500' : 'text-mutedForeground'}`} />
                                                        <input
                                                            type="text"
                                                            value={task.contentLink || ''}
                                                            placeholder="Drop link..."
                                                            onChange={(e) => {
                                                                const newVal = e.target.value;
                                                                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, contentLink: newVal } : t));
                                                            }}
                                                            onBlur={(e) => handleQuickUpdateLink(task.id, e.target.value)}
                                                            className="w-full bg-card border-[2px] border-slate-900 text-[12px] font-medium text-foreground rounded-lg pl-9 pr-8 py-2.5 outline-none focus:ring-1 focus:ring-accent transition-all min-w-[140px]"
                                                        />
                                                        {task.contentLink && (
                                                            <a href={task.contentLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="absolute right-3 text-mutedForeground hover:text-blue-600">
                                                                <ExternalLink size={14} />
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* 9. Action (Menu) */}
                                                <td className="p-3 border-y-[2.5px] border-r-[2.5px] border-border rounded-r-2xl bg-inherit transition-colors text-right pr-5 relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveRowMenu(activeRowMenu === task.id ? null : task.id);
                                                        }}
                                                        className={`w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-foreground`}
                                                    >
                                                        <MoreHorizontal size={16} />
                                                    </button>

                                                    {/* Dropdown Menu */}
                                                    {activeRowMenu === task.id && (
                                                        <div className="absolute right-12 top-1/2 -translate-y-1/2 w-48 bg-card border border-border rounded-xl shadow-hard-mini z-50 overflow-hidden transform animate-in fade-in zoom-in-95 duration-200">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setActiveRowMenu(null); handleOpenEditModal(task); }}
                                                                className="w-full text-left px-4 py-3 hover:bg-muted flex items-center gap-2 font-bold text-[12px] text-foreground transition-colors border-b border-border"
                                                            >
                                                                <Edit size={16} className="text-violet-600" /> Edit Konten
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setActiveRowMenu(null); handleDeleteContent(task.id); }}
                                                                className="w-full text-left px-4 py-3 hover:bg-rose-50 flex items-center gap-2 font-bold text-[12px] text-rose-600 transition-colors"
                                                            >
                                                                <Trash2 size={16} /> Hapus Konten
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="p-8 text-center text-slate-600 text-[10px] font-black border-[3px] border-dashed border-slate-300 rounded-xl bg-card shadow-[2px_2px_0px_#0f172a] mt-2 block w-full">
                                                Tidak ada konten yang ditemukan.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div >

            {/* --- DETAIL MODAL --- */}
            {
                selectedTask && (
                    <Modal
                        isOpen={isDetailModalOpen}
                        onClose={() => {
                            setIsDetailModalOpen(false);
                            setIsPdfPreviewOpen(false);
                            setIsDrivePreviewOpen(false);
                            setIsResultModalOpen(false);
                            setPdfUrl(null);
                        }}
                        title={<div className="flex items-center gap-2"><div className="p-1.5 bg-violet-500 rounded-lg shadow-hard-mini"><FileText size={18} className="text-white" /></div><span className="text-foreground">Detail Konten</span></div>}
                        maxWidth={(isPdfPreviewOpen || isDrivePreviewOpen || isResultModalOpen) ? "max-w-full md:max-w-[48vw]" : "max-w-7xl"}
                        duration={800}
                        zIndex={9990}
                        overlayClassName={(isPdfPreviewOpen || isDrivePreviewOpen || isResultModalOpen) ? 'bg-indigo-950/20 backdrop-blur-none transition-all' : 'bg-indigo-950/60 backdrop-blur-sm'}
                        className={(isPdfPreviewOpen || isDrivePreviewOpen || isResultModalOpen) ? 'md:-translate-x-[50.5%] shadow-2xl' : 'translate-x-0'}
                    >
                        <div className="h-[88vh] md:h-[85vh] overflow-y-auto no-scrollbar px-6 md:px-10 pt-8 pb-10">
                            <div className="flex flex-col lg:flex-row gap-10 items-start">
                                {/* MAIN CONTENT (LEFT) */}
                                <div className="flex-1 space-y-8 min-w-0 order-2 lg:order-1">
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between gap-6">
                                            <div className="space-y-4">
                                                {/* Platform Sticker/Badge */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    {selectedTask.platform === Platform.INSTAGRAM ? (
                                                        <div className="px-4 py-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-full border-[3px] border-slate-900 shadow-hard-mini-mini text-[11px] font-black flex items-center gap-2 transform -rotate-2 hover:rotate-0 transition-transform">
                                                            <Instagram size={14} strokeWidth={3} /> Instagram
                                                        </div>
                                                    ) : selectedTask.platform === Platform.TIKTOK ? (
                                                        <div className="px-4 py-1.5 bg-slate-900 text-white rounded-full border-[3px] border-slate-950 shadow-[2px_2px_0px_#ff0050,-2px_-2px_0px_#00f2ea] text-[11px] font-black flex items-center gap-2 transform rotate-2 hover:rotate-0 transition-transform">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>
                                                            TikTok
                                                        </div>
                                                    ) : (
                                                        <div className="px-4 py-1.5 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-full border-[3px] border-slate-900 shadow-hard-mini-mini text-[11px] font-black flex items-center gap-2 transform -rotate-1">
                                                            {getPlatformIcon(selectedTask.platform)} {selectedTask.platform}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-black text-mutedForeground">Campaign Title</span>
                                                    <h2 className="text-2xl md:text-3xl lg:text-5xl font-black font-heading text-foreground leading-tight tracking-tight">
                                                        {selectedTask.title}
                                                    </h2>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Brief & Script - Priority Item */}
                                    <div className="bg-card rounded-[2.5rem] border-[3.5px] border-border shadow-hard relative overflow-hidden group/script hover:shadow-hard-xl transition-all">
                                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover/script:opacity-20 transition-opacity pointer-events-none">
                                            <StickyNote size={120} strokeWidth={3} className="text-foreground" />
                                        </div>
                                        <div className="p-8 pb-4 relative z-10 flex items-center gap-4">
                                            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-[3px] border-border shadow-hard-mini">
                                                <FileText size={24} strokeWidth={3} />
                                            </div>
                                            <div className="flex flex-col">
                                                <h4 className="font-heading font-black text-foreground text-xl tracking-tight">Brief & Content Script</h4>
                                                <p className="text-[10px] font-black text-mutedForeground">Detailed instructions for production</p>
                                            </div>
                                        </div>

                                        <div className="p-8 pt-0 relative z-10">
                                            <div className="bg-muted border-[3px] border-border shadow-inner rounded-2xl p-6 min-h-[150px] font-medium font-sans text-foreground leading-relaxed text-base">
                                                <RichTextRenderer
                                                    text={(selectedTask as any).script || '<i class="text-mutedForeground italic">Belum ada script atau catatan untuk konten ini.</i>'}
                                                    onPdfClick={(url) => {
                                                        const finalUrl = url.startsWith('http')
                                                            ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
                                                            : url;
                                                        setPdfUrl(finalUrl);
                                                        setIsPdfPreviewOpen(true);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Results */}
                                    <div className={`p-8 rounded-[2.5rem] border-[3.5px] border-border shadow-hard hover:-translate-y-1 hover:shadow-hard-xl transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-6 group ${selectedTask.result_assets && (selectedTask.result_assets as any).length > 0 ? 'bg-emerald-50/40 dark:bg-emerald-500/5' : 'bg-card'}`}
                                        onClick={() => setIsResultModalOpen(true)}
                                    >
                                        <div className="flex items-center gap-5 w-full">
                                            <div className={`w-16 h-16 flex items-center justify-center rounded-[1.5rem] border-[3px] border-border shadow-hard-mini transition-all group-hover:scale-110 ${selectedTask.result_assets && (selectedTask.result_assets as any[]).length > 0 ? 'bg-emerald-500 text-white' : 'bg-background text-foreground'}`}>
                                                {selectedTask.result_type === 'video' ? <Video size={28} strokeWidth={3} /> : <ImageIcon size={28} strokeWidth={3} />}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <p className="font-heading font-black text-foreground text-lg tracking-tight">Hasil Produksi Konten</p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${selectedTask.result_assets && (selectedTask.result_assets as any[]).length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-mutedForeground'}`} />
                                                    <p className="text-[10px] font-black text-accent">
                                                        {selectedTask.result_assets && (selectedTask.result_assets as any[]).length > 0
                                                            ? `${selectedTask.result_type === 'video' ? 'Video asset available' : `${(selectedTask.result_assets as any[]).length} photo(s) in gallery`}`
                                                            : 'No content results uploaded yet'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`shrink-0 px-8 py-4 rounded-[1.5rem] font-black text-xs transition-all border-[3px] border-border shadow-hard-mini flex items-center gap-3 ${selectedTask.result_assets && (selectedTask.result_assets as any[]).length > 0 ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-foreground text-background dark:bg-muted dark:text-foreground hover:bg-foreground/10'}`}>
                                            {selectedTask.result_assets && (selectedTask.result_assets as any[]).length > 0 ? 'Lihat Hasil' : 'Upload Hasil'} <Plus size={16} strokeWidth={4} />
                                        </div>
                                    </div>

                                    {/* Assets Storage Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {(() => {
                                            const isVideo = (selectedTask.type || '').toLowerCase().includes('video') || (selectedTask.type || '').toLowerCase().includes('reels');
                                            return (
                                                <div className={`border-[3.5px] rounded-[2rem] p-6 transition-all bg-card relative overflow-hidden group ${isVideo ? 'border-dashed border-border bg-muted/30 opacity-60' : 'border-border shadow-hard hover:-translate-y-1 hover:shadow-hard-xl'}`}>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-violet-100 dark:bg-violet-500/20 rounded-xl text-violet-600 dark:text-violet-400 border-[2px] border-border">
                                                                <ImageIcon size={18} strokeWidth={3} />
                                                            </div>
                                                            <span className="text-xs font-black text-foreground">Upload Image</span>
                                                        </div>
                                                    </div>

                                                    {(selectedTask as any).asset_url ? (
                                                        <div className="relative group/asset rounded-2xl overflow-hidden border-[3px] border-border shadow-hard-mini transform transition-transform hover:scale-[1.02]">
                                                            <img src={(selectedTask as any).asset_url} alt="Asset" className="w-full h-32 object-cover" />
                                                            <div className="absolute inset-0 bg-foreground/80 opacity-0 group-hover/asset:opacity-100 transition-all flex items-center justify-center gap-2">
                                                                <button onClick={() => assetInputRef.current?.click()} className="p-2 bg-card text-foreground rounded-lg border-[2px] border-border shadow-hard-mini active:translate-y-0.5"><Edit size={16} /></button>
                                                                <button
                                                                    onClick={async () => {
                                                                        await supabase.from('content_items').update({ asset_url: null }).eq('id', selectedTask.id);
                                                                        setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, asset_url: undefined } : t));
                                                                        setSelectedTask(prev => prev ? { ...prev, asset_url: undefined } : null);
                                                                    }}
                                                                    className="p-2 bg-rose-500 text-white rounded-lg border-[2px] border-border shadow-hard-mini active:translate-y-0.5"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => !isVideo && assetInputRef.current?.click()}
                                                            disabled={isVideo || savingAsset}
                                                            className={`w-full h-32 border-[3px] border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${isVideo ? 'border-border cursor-not-allowed' : 'border-violet-300 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/5 hover:bg-violet-50 hover:border-violet-500 cursor-pointer text-violet-500'}`}
                                                        >
                                                            {savingAsset ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} strokeWidth={3} />}
                                                            <span className="text-[11px] font-black">JPG / PNG</span>
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        <div className="border-[3.5px] border-border bg-card rounded-[2rem] p-6 shadow-hard hover:-translate-y-1 hover:shadow-hard-xl transition-all relative overflow-hidden">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 border-[2px] border-border">
                                                        <FolderOpen size={18} strokeWidth={3} />
                                                    </div>
                                                    <span className="text-xs font-black text-foreground">Google Drive</span>
                                                </div>
                                            </div>

                                            {(selectedTask as any).drive_folder_url ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                const embedUrl = getDriveEmbedUrl((selectedTask as any).drive_folder_url);
                                                                setDrivePreviewUrl(embedUrl);
                                                                setIsDrivePreviewOpen(true);
                                                            }}
                                                            className="flex-1 py-2.5 bg-emerald-500 text-white font-black text-[11px] border-[2.5px] border-border rounded-xl shadow-hard-mini active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <Eye size={14} /> Preview
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                await supabase.from('content_items').update({ drive_folder_url: null }).eq('id', selectedTask.id);
                                                                setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, drive_folder_url: undefined } : t));
                                                                setSelectedTask(prev => prev ? { ...prev, drive_folder_url: undefined } : null);
                                                            }}
                                                            className="p-2.5 bg-card border-[2.5px] border-border text-rose-500 rounded-xl shadow-hard-mini active:translate-y-0.5"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    <a href={(selectedTask as any).drive_folder_url} target="_blank" rel="noreferrer" className="block text-center text-[8px] font-black text-mutedForeground hover:text-accent truncate px-2">Open Full Url</a>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    <input
                                                        type="url"
                                                        placeholder="Paste link drive..."
                                                        value={driveUrlInput}
                                                        onChange={e => setDriveUrlInput(e.target.value)}
                                                        className="w-full px-4 py-2 bg-muted border-[2.5px] border-border rounded-xl text-[11px] font-black placeholder:text-mutedForeground focus:bg-card outline-none"
                                                    />
                                                    <button
                                                        onClick={handleSaveDriveUrl}
                                                        disabled={!driveUrlInput.trim() || savingDriveUrl}
                                                        className="py-2.5 bg-emerald-500 text-white font-black text-[10px] border-[2.5px] border-border shadow-hard-mini rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                    >
                                                        Link Drive
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* SIDEBAR (RIGHT) */}
                                <div className="w-full lg:w-80 space-y-6 order-1 lg:order-2 shrink-0">
                                    {/* 1. Status Indicator */}
                                    <div className="bg-foreground text-background p-6 rounded-[2.5rem] border-[3.5px] border-foreground shadow-hard space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black opacity-60">Status Konten</span>
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border-[2px] border-background" />
                                        </div>
                                        <div className="px-5 py-3 rounded-2xl border-[3px] border-background shadow-hard-mini bg-background text-foreground text-xs font-black flex items-center justify-center gap-3">
                                            {formatStatus(selectedTask.status)}
                                        </div>
                                        {selectedTask.approval && (
                                            <div className="bg-sky-500 text-white p-4 rounded-2xl border-[3px] border-background shadow-hard-mini space-y-2">
                                                <p className="text-[8px] font-black opacity-80">Approved by:</p>
                                                <div className="flex items-center gap-3 font-black text-[11px]">
                                                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedTask.approval}`} className="w-6 h-6 rounded-lg border-[1.5px] border-white" alt="" />
                                                    {selectedTask.approval}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. Metadata Bento Sidebar */}
                                    <div className="bg-card border-[3.5px] border-border rounded-[2.5rem] shadow-hard p-6 space-y-6">
                                        <h5 className="text-[10px] font-black text-mutedForeground mb-2 px-1">Details & Context</h5>

                                        {[
                                            { icon: <Calendar size={18} strokeWidth={3} />, label: 'Deadline', value: selectedTask.date ? new Date(selectedTask.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-', color: 'violet' },
                                            { icon: getPlatformIcon(selectedTask.platform), label: 'Platform', value: formatStatus(selectedTask.platform), color: 'default' },
                                            { icon: getTypeIcon(selectedTask.type), label: 'Type', value: selectedTask.type, color: 'default' },
                                            { icon: <Zap size={18} strokeWidth={3} />, label: 'Priority', value: formatStatus(selectedTask.priority), color: selectedTask.priority === ContentPriority.HIGH ? 'rose' : 'amber' },
                                            { icon: <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedTask.pic || 'user'}`} className="w-full h-full object-cover" alt="" />, label: 'Assignee', value: selectedTask.pic || 'Unassigned', color: 'image' },
                                            ...(selectedTask.pillar ? [{ icon: <Hash size={18} strokeWidth={3} />, label: 'Category', value: selectedTask.pillar, color: 'amber' }] : [])
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-4 group">
                                                <div className={`w-10 h-10 rounded-xl border-[2px] border-border flex items-center justify-center shadow-hard-mini-mini transition-transform group-hover:scale-110 overflow-hidden ${item.color === 'violet' ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400' :
                                                    item.color === 'rose' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400' :
                                                        item.color === 'amber' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                                                            'bg-muted text-foreground'
                                                    }`}>
                                                    {item.icon}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[8px] font-black text-mutedForeground">{item.label}</span>
                                                    <span className="text-[11px] font-black text-foreground truncate">{item.value}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 3. Post Link (Compact) */}
                                    <div className="bg-sky-50 dark:bg-sky-500/10 p-5 rounded-[2.5rem] border-[3.5px] border-border shadow-hard space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-card rounded-xl border-[2px] border-border shadow-hard-mini flex items-center justify-center text-sky-500">
                                                <LinkIcon size={18} strokeWidth={3} />
                                            </div>
                                            <p className="font-black text-[10px] text-foreground">Postingan Live</p>
                                        </div>
                                        {selectedTask.contentLink ? (
                                            <a
                                                href={selectedTask.contentLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full py-3 bg-sky-500 text-white font-black text-[10px] border-[2.5px] border-border rounded-xl hover:bg-sky-600 transition-all shadow-hard-mini flex items-center justify-center gap-2 active:translate-y-0.5"
                                            >
                                                Buka Link <ExternalLink size={14} strokeWidth={3} />
                                            </a>
                                        ) : (
                                            <div className="w-full py-3 bg-muted text-mutedForeground font-black text-[9px] border-[2.5px] border-border rounded-xl text-center grayscale opacity-60 italic">
                                                No link added
                                            </div>
                                        )}
                                    </div>

                                    {/* 4. Action Block */}
                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <button
                                            onClick={() => {
                                                setIsDetailModalOpen(false);
                                                handleOpenEditModal(selectedTask);
                                            }}
                                            className="py-4 bg-violet-600 text-white font-black text-[10px] border-[3px] border-border rounded-2xl hover:bg-violet-700 transition-all shadow-hard active:translate-y-1 flex items-center justify-center gap-2"
                                        >
                                            <Edit size={16} strokeWidth={3} /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteContent(selectedTask.id)}
                                            className="py-4 bg-card text-rose-500 font-black text-[10px] border-[3px] border-border rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-hard active:translate-y-1 flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={16} strokeWidth={3} /> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Modal>
                )
            }

            {/* --- PDF PREVIEW MODAL --- */}
            {/* Desktop: side-by-side | Mobile: full screen */}
            {
                pdfMounted && pdfUrl && (
                    <>
                        {/* Mobile: full screen overlay */}
                        <div className={`md:hidden fixed inset-0 z-[10001] bg-indigo-950 flex flex-col transition-all duration-300 ${isPdfPreviewOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <div className="flex items-center justify-between p-3 bg-slate-800 text-white">
                                <div className="flex items-center gap-2">
                                    <FileText size={16} />
                                    <span className="text-sm font-bold">PDF Preview</span>
                                </div>
                                <button onClick={() => setIsPdfPreviewOpen(false)} className="p-1.5 rounded-lg bg-card/10 hover:bg-card/20">
                                    <X size={16} />
                                </button>
                            </div>
                            <iframe src={pdfUrl} className="flex-1 w-full border-none" title="PDF Content" />
                        </div>
                        {/* Desktop: side-by-side */}
                        <Modal
                            isOpen={isPdfPreviewOpen}
                            onClose={() => setIsPdfPreviewOpen(false)}
                            title={<div className="flex items-center gap-2"><div className="p-1 bg-card/20 rounded"><FileText size={18} /></div><span>PDF Preview</span></div>}
                            maxWidth="max-w-[95vw] md:max-w-[48vw]"
                            duration={800}
                            zIndex={10000}
                            overlayClassName="md:bg-transparent md:backdrop-blur-none md:pointer-events-none"
                            className="pointer-events-auto shadow-2xl overflow-hidden md:translate-x-[50.5%]"
                        >
                            <div className="h-[75vh] bg-slate-100 -m-6 md:-m-8 relative overflow-hidden rounded-b-xl">
                                {pdfUrl && <iframe src={pdfUrl} className="w-full h-full border-none" title="PDF Content" />}
                            </div>
                        </Modal>
                    </>
                )
            }

            {/* --- DRIVE PREVIEW MODAL --- */}
            {/* Desktop: side-by-side | Mobile: full screen */}
            {
                driveMounted && drivePreviewUrl && (
                    <>
                        {/* Mobile: full screen overlay */}
                        <div className={`md:hidden fixed inset-0 z-[10001] bg-indigo-950 flex flex-col transition-all duration-300 ${isDrivePreviewOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <div className="flex items-center justify-between p-3 bg-slate-800 text-white">
                                <div className="flex items-center gap-2">
                                    <FolderOpen size={16} />
                                    <span className="text-sm font-bold">Google Drive</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a href={selectedTask?.drive_folder_url || ''} target="_blank" rel="noreferrer"
                                        className="px-2 py-1 bg-card/10 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                                        <ExternalLink size={12} /> Buka
                                    </a>
                                    <button onClick={() => setIsDrivePreviewOpen(false)} className="p-1.5 rounded-lg bg-card/10 hover:bg-card/20">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                            <iframe src={drivePreviewUrl} className="flex-1 w-full border-none" title="Google Drive Preview" allow="autoplay" />
                        </div>
                        {/* Desktop: side-by-side */}
                        <Modal
                            isOpen={isDrivePreviewOpen}
                            onClose={() => setIsDrivePreviewOpen(false)}
                            title={<div className="flex items-center gap-2"><div className="p-1 bg-card/20 rounded"><FolderOpen size={18} /></div><span>Google Drive Preview</span></div>}
                            maxWidth="max-w-[95vw] md:max-w-[48vw]"
                            duration={800}
                            zIndex={10000}
                            overlayClassName="md:bg-transparent md:backdrop-blur-none md:pointer-events-none"
                            className="pointer-events-auto shadow-2xl overflow-hidden md:translate-x-[50.5%]"
                        >
                            <div className="h-[75vh] bg-slate-100 -m-6 md:-m-8 relative overflow-hidden rounded-b-xl">
                                <div className="absolute top-2 right-2 z-10 flex gap-2">
                                    <a href={selectedTask?.drive_folder_url || ''} target="_blank" rel="noreferrer"
                                        className="px-3 py-1.5 bg-card/90 text-slate-800 font-bold text-xs rounded-lg shadow-sm hover:bg-card transition-colors flex items-center gap-1.5 border border-slate-200">
                                        <ExternalLink size={12} /> Buka di Drive
                                    </a>
                                </div>
                                {drivePreviewUrl && <iframe src={drivePreviewUrl} className="w-full h-full border-none" title="Google Drive Preview" allow="autoplay" />}
                            </div>
                        </Modal>
                    </>
                )
            }

            {/* --- RESULT UPLOAD MODAL --- */}
            {
                resultMounted && selectedTask && (
                    <Modal
                        isOpen={isResultModalOpen}
                        onClose={() => setIsResultModalOpen(false)}
                        title={<div className="flex items-center gap-2"><div className="p-1 bg-emerald-500 rounded"><CheckCircle size={18} className="text-white" /></div><span className="text-emerald-950">Upload Hasil Konten</span></div>}
                        maxWidth="max-w-[95vw] md:max-w-[48vw]"
                        duration={800}
                        zIndex={10000}
                        overlayClassName="md:bg-transparent md:backdrop-blur-none md:pointer-events-none"
                        className="pointer-events-auto shadow-2xl overflow-hidden md:translate-x-[50.5%]"
                    >
                        <div className="h-[75vh] p-4 md:p-8 space-y-4 md:space-y-8 overflow-y-auto no-scrollbar bg-card">
                            {/* Desktop Header Info */}
                            <div className="hidden md:block">
                                <h3 className="text-2xl font-black text-slate-800 mb-1">Manajemen Hasil Produksi</h3>
                                <p className="text-sm text-slate-500 font-medium">Upload hasil final konten Anda untuk di-review oleh tim.</p>
                            </div>

                            {/* Content Result Type Selector */}
                            <div className="flex bg-slate-100 p-1.5 rounded-2xl border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] mb-6">
                                <button
                                    onClick={() => setResultResultType('photo')}
                                    className={`flex-1 py-3 flex items-center justify-center gap-3 rounded-xl font-black text-sm transition-all border-[3px] ${resultResultType === 'photo' ? 'bg-card text-violet-600 shadow-[2px_2px_0px_#0f172a] border-slate-900' : 'border-transparent text-slate-500 hover:text-foreground'}`}
                                >
                                    <ImageIcon size={18} strokeWidth={2.5} /> Foto (Galeri)
                                </button>
                                <button
                                    onClick={() => setResultResultType('video')}
                                    className={`flex-1 py-3 flex items-center justify-center gap-3 rounded-xl font-black text-sm transition-all border-[3px] ${resultResultType === 'video' ? 'bg-card text-emerald-600 shadow-[2px_2px_0px_#0f172a] border-slate-900' : 'border-transparent text-slate-500 hover:text-foreground'}`}
                                >
                                    <Video size={18} strokeWidth={2.5} /> Video (Drive)
                                </button>
                            </div>

                            {resultResultType === 'photo' ? (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-1">
                                        <h5 className="text-xs font-black text-mutedForeground">Pilih Foto (Maks 15)</h5>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${selectedTask.result_assets && (selectedTask.result_assets as any[]).length >= 15 ? 'bg-red-100 text-red-600' : 'bg-accent/10 text-accent'}`}>
                                                {(selectedTask?.result_assets as any[] || []).length} / 15
                                            </span>
                                        </div>
                                    </div>

                                    <input
                                        ref={resultInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleResultUpload}
                                    />

                                    <button
                                        onClick={() => resultInputRef.current?.click()}
                                        disabled={uploadingResults || (selectedTask?.result_assets as any[] || []).length >= 15}
                                        className={`w-full py-5 border-3 border-dashed rounded-2xl flex items-center justify-center gap-4 transition-all group active:scale-[0.98] ${uploadingResults ? 'bg-muted border-slate-200' : (selectedTask?.result_assets as any[] || []).length >= 15 ? 'bg-muted border-slate-200 cursor-not-allowed opacity-50' : 'border-accent/20 bg-accent/5 hover:border-accent hover:bg-accent/10 cursor-pointer'}`}
                                    >
                                        {uploadingResults ? (
                                            <div className="flex items-center gap-3">
                                                <Loader2 size={24} className="animate-spin text-accent" />
                                                <span className="text-sm font-black text-accent animate-pulse">Memproses file...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 bg-accent text-white rounded-2xl flex items-center justify-center shadow-lg shadow-accent/30 group-hover:rotate-6 transition-transform">
                                                    <Upload size={20} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-black text-slate-800">Upload Hasil Foto</p>
                                                    <p className="text-[10px] font-bold text-mutedForeground">Click atau Drop file di sini</p>
                                                </div>
                                            </>
                                        )}
                                    </button>

                                    {/* GALLERY PREVIEW */}
                                    {selectedTask?.result_assets && (selectedTask.result_assets as any[]).length > 0 && (
                                        <div className="space-y-4">
                                            <h5 className="text-xs font-black text-mutedForeground px-1">Pratinjau Galeri</h5>
                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                                {(selectedTask.result_assets as string[]).map((asset, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="relative aspect-square rounded-2xl overflow-hidden border-[3px] border-slate-900 group shadow-[2px_2px_0px_#0f172a] hover:shadow-[4px_4px_0px_#0f172a] hover:-translate-y-1 transition-all cursor-pointer"
                                                        onClick={() => {
                                                            setImagePreviewUrl(asset);
                                                            setIsImagePreviewOpen(true);
                                                        }}
                                                    >
                                                        <img src={asset} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    const currentAssets = (selectedTask.result_assets as any[]) || [];
                                                                    const updated = currentAssets.filter((_, i) => i !== idx);
                                                                    const { error } = await supabase.from('content_items').update({ result_assets: updated }).eq('id', selectedTask.id);
                                                                    if (!error) {
                                                                        const ut = { ...selectedTask, result_assets: updated };
                                                                        setSelectedTask(ut);
                                                                        setTasks(prev => prev.map(t => t.id === selectedTask.id ? ut : t));
                                                                    }
                                                                }}
                                                                className="w-10 h-10 bg-red-500 text-white rounded-xl shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
                                                            >
                                                                <Trash2 size={20} />
                                                            </button>
                                                        </div>
                                                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-[10px] font-bold rounded-md backdrop-blur-sm">
                                                            {idx + 1}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ═══ COMMENT SECTION ═══ */}
                                    {isFree ? (
                                        <div className="border-t-2 border-slate-100 pt-5 space-y-4 pb-4">
                                            <PremiumLockScreen
                                                title="Komentar Revisi Terkunci"
                                                description="Berikan catatan, feedback, dan diskusikan revisi konten langsung dengan tim Anda. Upgrade ke paket Pro untuk menggunakan fitur ini."
                                            />
                                        </div>
                                    ) : (
                                        <div className="border-t-2 border-slate-100 pt-5 space-y-4">
                                            <div className="flex items-center gap-2 px-1">
                                                <MessageCircle size={16} className="text-mutedForeground" />
                                                <h5 className="text-xs font-black text-mutedForeground">Komentar Revisi</h5>
                                                {resultComments.length > 0 && (
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-accent/10 text-accent">{resultComments.length}</span>
                                                )}
                                            </div>

                                            {/* Comment List */}
                                            <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1 no-scrollbar">
                                                {resultComments.length === 0 ? (
                                                    <div className="text-center py-8">
                                                        <MessageCircle size={32} className="mx-auto text-slate-200 mb-2" />
                                                        <p className="text-xs font-bold text-slate-300">Belum ada komentar.</p>
                                                        <p className="text-[10px] text-slate-300">Berikan feedback untuk hasil konten ini.</p>
                                                    </div>
                                                ) : (
                                                    (() => {
                                                        const topLevel = resultComments.filter(c => !c.parent_id);
                                                        const replies = resultComments.filter(c => c.parent_id);
                                                        const currentUserId = localStorage.getItem('user_id') || '';

                                                        const renderComment = (comment: ResultComment, isReply = false) => {
                                                            const isOwn = comment.user_id === currentUserId;
                                                            const commentReplies = replies.filter(r => r.parent_id === comment.id);
                                                            const timeAgo = (() => {
                                                                const diff = Date.now() - new Date(comment.created_at).getTime();
                                                                const m = Math.floor(diff / 60000);
                                                                if (m < 1) return 'baru saja';
                                                                if (m < 60) return `${m}m`;
                                                                const h = Math.floor(m / 60);
                                                                if (h < 24) return `${h}j`;
                                                                return `${Math.floor(h / 24)}h`;
                                                            })();

                                                            return (
                                                                <div key={comment.id} className={`${isReply ? 'ml-8 pl-3 border-l-2 border-slate-100' : ''}`}>
                                                                    <div className={`group flex gap-2.5 py-2 px-2 rounded-xl transition-colors hover:bg-muted ${isReply ? '' : ''}`}>
                                                                        {/* Avatar */}
                                                                        <div className="flex-shrink-0 pt-0.5">
                                                                            {comment.user_avatar ? (
                                                                                <img src={comment.user_avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                                                                            ) : (
                                                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white text-[10px] font-black">
                                                                                    {comment.user_name.charAt(0).toUpperCase()}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Content */}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`text-xs font-black ${isOwn ? 'text-accent' : 'text-slate-700'}`}>{comment.user_name}</span>
                                                                                <span className="text-[9px] text-slate-300 font-bold">{timeAgo}</span>
                                                                            </div>

                                                                            {/* Reply indicator */}
                                                                            {comment.parent_id && (() => {
                                                                                const parent = resultComments.find(c => c.id === comment.parent_id);
                                                                                return parent ? (
                                                                                    <div className="text-[9px] text-mutedForeground font-bold flex items-center gap-1 mb-0.5">
                                                                                        <Reply size={9} /> membalas {parent.user_name}
                                                                                    </div>
                                                                                ) : null;
                                                                            })()}

                                                                            <p className="text-[13px] text-slate-600 leading-relaxed break-words">{comment.message}</p>

                                                                            {/* Reactions display */}
                                                                            {comment.reactions && Object.keys(comment.reactions).length > 0 && (
                                                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                                                    {Object.entries(comment.reactions).map(([emoji, users]) => (
                                                                                        <button
                                                                                            key={emoji}
                                                                                            onClick={() => handleToggleReaction(comment.id, emoji)}
                                                                                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all border ${(users as string[]).includes(currentUserId)
                                                                                                ? 'bg-accent/10 border-accent/30 text-accent'
                                                                                                : 'bg-muted border-slate-200 text-slate-500 hover:border-accent/30'
                                                                                                }`}
                                                                                        >
                                                                                            <span>{emoji}</span>
                                                                                            <span>{(users as string[]).length}</span>
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            )}

                                                                            {/* Action buttons */}
                                                                            <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button
                                                                                    onClick={() => { setReplyingTo(comment); commentInputRef.current?.focus(); }}
                                                                                    className="flex items-center gap-1 text-[10px] font-bold text-mutedForeground hover:text-accent px-1.5 py-0.5 rounded-md hover:bg-accent/5 transition-colors"
                                                                                >
                                                                                    <Reply size={10} /> Balas
                                                                                </button>
                                                                                <div className="relative">
                                                                                    <button
                                                                                        onClick={() => setShowEmojiPicker(showEmojiPicker === comment.id ? null : comment.id)}
                                                                                        className="flex items-center gap-1 text-[10px] font-bold text-mutedForeground hover:text-accent px-1.5 py-0.5 rounded-md hover:bg-accent/5 transition-colors"
                                                                                    >
                                                                                        <SmilePlus size={10} /> React
                                                                                    </button>
                                                                                    {showEmojiPicker === comment.id && (
                                                                                        <div className="absolute bottom-full left-0 mb-1 bg-card border-[3px] border-slate-900 rounded-xl shadow-[4px_4px_0px_#0f172a] p-1.5 flex gap-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                                                                                            {['👍', '❤️', '😂', '🔥', '👎'].map(emoji => (
                                                                                                <button
                                                                                                    key={emoji}
                                                                                                    onClick={() => handleToggleReaction(comment.id, emoji)}
                                                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-base transition-transform hover:scale-125"
                                                                                                >
                                                                                                    {emoji}
                                                                                                </button>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Render replies */}
                                                                    {commentReplies.map(reply => renderComment(reply, true))}
                                                                </div>
                                                            );
                                                        };

                                                        return topLevel.map(c => renderComment(c));
                                                    })()
                                                )}
                                                <div ref={commentEndRef} />
                                            </div>

                                            {/* Reply indicator */}
                                            {replyingTo && (
                                                <div className="flex items-center gap-2 px-3 py-2 bg-accent/5 border border-accent/20 rounded-xl animate-in slide-in-from-bottom-2">
                                                    <Reply size={12} className="text-accent" />
                                                    <span className="text-[11px] font-bold text-accent flex-1 truncate">Membalas {replyingTo.user_name}: "{replyingTo.message.slice(0, 50)}..."</span>
                                                    <button onClick={() => setReplyingTo(null)} className="text-mutedForeground hover:text-red-500"><X size={14} /></button>
                                                </div>
                                            )}

                                            {/* Comment Input */}
                                            <div className="flex items-center gap-2">
                                                <div className="flex-shrink-0">
                                                    {(() => {
                                                        const av = localStorage.getItem('user_avatar');
                                                        return av ? (
                                                            <img src={av} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white text-xs font-black">
                                                                {(localStorage.getItem('user_name') || 'U').charAt(0).toUpperCase()}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="flex-1 relative">
                                                    <input
                                                        ref={commentInputRef}
                                                        type="text"
                                                        placeholder={replyingTo ? `Balas ${replyingTo.user_name}...` : 'Tulis komentar revisi...'}
                                                        value={commentInput}
                                                        onChange={e => setCommentInput(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                                                        className="w-full px-4 py-3 bg-card border-[3px] border-slate-900 rounded-xl shadow-[2px_2px_0px_#0f172a] text-sm font-black text-slate-800 placeholder:text-mutedForeground focus:border-violet-500 focus:shadow-[4px_4px_0px_#0f172a] outline-none transition-all pr-12"
                                                    />
                                                    <button
                                                        onClick={handleSendComment}
                                                        disabled={!commentInput.trim() || sendingComment}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg bg-accent text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent/90 transition-all active:scale-90"
                                                    >
                                                        {sendingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <h5 className="text-xs font-black text-mutedForeground px-1">Link Hasil Produksi (Drive)</h5>
                                    <div className="space-y-4 pt-4">
                                        <div className="bg-emerald-50 border-[3px] border-slate-900 p-6 rounded-[32px] space-y-4 shadow-[4px_4px_0px_#0f172a]">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-card border-[2px] border-slate-900 shadow-[2px_2px_0px_#0f172a] text-emerald-600 rounded-2xl flex items-center justify-center">
                                                    <FolderOpen size={24} strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-emerald-950 text-sm">Google Drive Link</p>
                                                    <p className="text-[10px] text-emerald-700 font-bold mt-0.5">Pastikan akses link "Anyone with link"</p>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <input
                                                    type="url"
                                                    placeholder="https://drive.google.com/..."
                                                    className="w-full px-5 py-4 bg-card border-[3px] border-slate-900 shadow-[2px_2px_0px_#0f172a] rounded-2xl text-sm font-black text-foreground placeholder:text-mutedForeground focus:border-emerald-500 focus:shadow-[4px_4px_0px_#0f172a] outline-none transition-all"
                                                    defaultValue={selectedTask.result_type === 'video' ? (selectedTask.result_assets as string[])?.[0] : ''}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const val = (e.target as HTMLInputElement).value;
                                                            if (val) handleSaveResultVideoUrl(val);
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        const val = e.target.value;
                                                        if (val) handleSaveResultVideoUrl(val);
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        const input = document.querySelector('input[placeholder="https://drive.google.com/..."]') as HTMLInputElement;
                                                        if (input?.value) handleSaveResultVideoUrl(input.value);
                                                    }}
                                                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:bg-emerald-400 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0f172a] transition-all active:translate-y-0 active:shadow-[2px_2px_0px_#0f172a]"
                                                >
                                                    Simpan Link Produksi
                                                </button>
                                            </div>
                                        </div>

                                        {selectedTask.result_type === 'video' && (selectedTask.result_assets as string[])?.[0] && (
                                            <div className="p-4 bg-card border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] rounded-2xl flex items-center justify-between gap-4 mt-6">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 bg-card border-[2px] border-slate-900 shadow-[2px_2px_0px_#0f172a] rounded-xl flex items-center justify-center text-emerald-500">
                                                        <ExternalLink size={20} strokeWidth={2.5} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-slate-800">Preview Link Aktif</p>
                                                        <p className="text-[10px] text-slate-500 font-bold truncate">{(selectedTask.result_assets as string[])[0]}</p>
                                                    </div>
                                                </div>
                                                <a
                                                    href={(selectedTask.result_assets as string[])[0]}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-4 py-3 bg-indigo-950 text-white border-[2px] border-slate-900 shadow-[2px_2px_0px_#0f172a] rounded-xl text-[10px] font-black hover:bg-slate-800 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0f2e1b4b] transition-all shrink-0"
                                                >
                                                    Buka
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="pt-6 border-t border-slate-100">
                                <button
                                    onClick={() => setIsResultModalOpen(false)}
                                    className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm hover:bg-slate-200 transition-colors"
                                >
                                    Tutup Panel Hasil
                                </button>
                            </div>
                        </div>
                    </Modal>
                )
            }

            {/* --- IMAGE PREVIEW MODAL --- */}
            <Modal
                isOpen={isImagePreviewOpen}
                onClose={() => setIsImagePreviewOpen(false)}
                title="Pratinjau Foto"
                maxWidth="max-w-5xl"
                zIndex={10020}
            >
                <div className="flex items-center justify-center p-2 bg-indigo-950/5 rounded-2xl">
                    {imagePreviewUrl && (
                        <img
                            src={imagePreviewUrl}
                            alt="Full Preview"
                            className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
                        />
                    )}
                </div>
                <div className="mt-6 flex justify-center">
                    <button
                        onClick={() => setIsImagePreviewOpen(false)}
                        className="px-8 py-3 bg-indigo-950 text-white font-black rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                        Tutup Pratinjau
                    </button>
                </div>
            </Modal>

            {/* Modal Create/Edit Content - Redesigned to Dashboard Layout */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                maxWidth="max-w-7xl"
            >
                <form onSubmit={handleSaveContent} className="relative">
                    <div className="h-[85vh] md:h-[80vh] overflow-y-auto no-scrollbar px-1 pt-2 pb-10">
                        <div className="flex flex-col lg:flex-row gap-10 items-start">

                            {/* LEFT SIDE: MAIN WRITING AREA */}
                            <div className="flex-1 space-y-8 min-w-0">
                                {/* 1. HERO TITLE */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 border-[2px] border-border shadow-hard-mini-mini">
                                            <FileText size={18} strokeWidth={3} />
                                        </div>
                                        <span className="text-[13px] font-black text-mutedForeground">Judul Konten</span>
                                    </div>
                                    <input
                                        placeholder="Tulis Judul Konten Kamu Disini..."
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                        className="w-full bg-transparent border-none outline-none font-heading font-black text-3xl md:text-5xl text-foreground placeholder:text-mutedForeground/30 focus:ring-0 p-0 tracking-tight"
                                    />
                                </div>

                                {/* 2. PLATFORM SELECTOR (VISUAL) */}
                                <div className="space-y-4">
                                    <label className="text-[14px] font-black text-mutedForeground px-1">Social Platform</label>
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                        {[
                                            { id: Platform.INSTAGRAM, icon: <Instagram size={20} />, active: 'bg-pink-500 text-white shadow-hard-mini' },
                                            { id: Platform.TIKTOK, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>, active: 'bg-foreground text-background shadow-hard-mini dark:bg-muted dark:text-foreground' },
                                            { id: Platform.YOUTUBE, icon: <Youtube size={20} />, active: 'bg-rose-600 text-white shadow-hard-mini' },
                                            { id: Platform.LINKEDIN, icon: <Linkedin size={20} />, active: 'bg-blue-600 text-white shadow-hard-mini' },
                                            { id: Platform.THREADS, icon: <AtSign size={20} />, active: 'bg-indigo-600 text-white shadow-hard-mini' },
                                            { id: Platform.FACEBOOK, icon: <Facebook size={20} />, active: 'bg-sky-600 text-white shadow-hard-mini' },
                                        ].map((p) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, platform: p.id })}
                                                className={`h-14 flex items-center justify-center rounded-2xl border-[3.5px] border-border transition-all transform active:translate-y-1 ${formData.platform === p.id ? p.active : 'bg-card text-mutedForeground hover:border-accent hover:text-accent'}`}
                                                title={p.id}
                                            >
                                                {p.icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. SCRIPT & RESOURCES */}
                                <div className="space-y-4">
                                    <label className="text-[14px] font-black text-mutedForeground px-1">Production Brief / Script</label>
                                    <div className="bg-emerald-50/40 dark:bg-emerald-500/5 p-8 rounded-[2.5rem] border-[3.5px] border-border shadow-hard space-y-6 text-foreground">
                                        {/* Brief Input */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <StickyNote size={18} className="text-emerald-500" />
                                                <span className="text-[13px] font-black text-foreground">Script & Link Dokumen</span>
                                            </div>
                                            <div className="flex gap-3">
                                                <input
                                                    className="flex-1 px-5 py-4 bg-background border-[3px] border-border rounded-2xl outline-none focus:border-emerald-500 focus:shadow-hard-mini transition-all font-sans font-bold text-[14px] text-foreground placeholder:text-mutedForeground/50"
                                                    placeholder="Paste Link Google Doc atau Tulis Brief singkat..."
                                                    value={formData.script}
                                                    onChange={(e) => setFormData({ ...formData, script: e.target.value })}
                                                />
                                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-16 flex items-center justify-center bg-card border-[3px] border-dashed border-emerald-500 rounded-2xl hover:bg-emerald-50 transition-all text-emerald-500 shadow-hard-mini active:translate-y-1"
                                                >
                                                    <Upload size={24} strokeWidth={3} />
                                                </button>
                                            </div>
                                            <p className="text-[11px] font-black text-emerald-600 px-1">Tip: Paste link dokumen atau upload file script kamu.</p>
                                        </div>

                                        {/* Result Link */}
                                        <div className="space-y-3 pt-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <ExternalLink size={18} className="text-sky-500" />
                                                <span className="text-[13px] font-black text-foreground">Live Content Link (Optional)</span>
                                            </div>
                                            <input
                                                placeholder="https://social-media-post-url.com/..."
                                                value={formData.contentLink}
                                                onChange={(e) => setFormData({ ...formData, contentLink: e.target.value })}
                                                className="w-full px-5 py-4 bg-background border-[3px] border-border rounded-2xl outline-none focus:border-sky-500 focus:shadow-hard-mini transition-all font-sans font-bold text-[14px] text-foreground placeholder:text-mutedForeground/50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 4. TEAM & CATEGORY */}
                                <div className="space-y-4">
                                    <label className="text-[14px] font-black text-mutedForeground px-1">Team & Category</label>
                                    <div className="bg-card border-[3.5px] border-border rounded-[2.5rem] shadow-hard p-7 relative overflow-visible">
                                        {/* Background Effect Container - Clipped */}
                                        <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
                                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 -ml-16 -mb-16 rounded-full blur-3xl" />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                                            {/* PIC */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg border-2 border-border text-emerald-600 dark:text-emerald-400">
                                                        <User size={14} className="currentColor" />
                                                    </div>
                                                    <span className="text-[13px] font-black text-foreground">Project Lead / PIC</span>
                                                </div>
                                                <CreatableSelect
                                                    placeholder="Assign To..."
                                                    value={formData.pic}
                                                    onChange={(val) => setFormData({ ...formData, pic: val })}
                                                    colorTheme="yellow"
                                                    className="!border-[3px] !rounded-2xl !font-black !text-[14px]"
                                                    options={teamMembers.map(m => ({ label: m.name, value: m.name }))}
                                                />
                                            </div>

                                            {/* Approval */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 bg-sky-100 dark:bg-sky-500/20 rounded-lg border-2 border-border text-sky-600 dark:text-sky-400">
                                                        <CheckCircle size={14} className="currentColor" />
                                                    </div>
                                                    <span className="text-[13px] font-black text-foreground">Final Approval By</span>
                                                </div>
                                                <CreatableSelect
                                                    placeholder="Approver..."
                                                    value={formData.approval}
                                                    onChange={(val) => setFormData({ ...formData, approval: val })}
                                                    colorTheme="yellow"
                                                    className="!border-[3px] !rounded-2xl !font-black !text-[14px]"
                                                    options={teamMembers.map(m => ({ label: m.name, value: m.name }))}
                                                />
                                            </div>

                                            {/* Pillar */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg border-2 border-border text-amber-600 dark:text-amber-400">
                                                        <Hash size={14} className="currentColor" />
                                                    </div>
                                                    <span className="text-[13px] font-black text-foreground">Pillar / Category</span>
                                                </div>
                                                <input
                                                    placeholder="E.g. Edukasi, Promo..."
                                                    value={formData.pillar}
                                                    onChange={(e) => setFormData({ ...formData, pillar: e.target.value })}
                                                    className="w-full h-[52px] bg-background border-[3px] border-border rounded-2xl px-5 font-black text-[14px] focus:border-amber-500 focus:shadow-hard-mini-mini outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT SIDE: SIDEBAR METADATA */}
                            <div className="w-full lg:w-80 space-y-6 shrink-0">
                                {/* 1. STATUS & PRIORITY BENTO */}
                                <div className="bg-card border-[3.5px] border-border rounded-[2.5rem] shadow-hard p-7 space-y-8 relative">
                                    <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 -mr-16 -mt-16 rounded-full blur-3xl" />
                                    </div>
                                    <div className="relative z-10 space-y-8">
                                        <h5 className="text-[14px] font-black text-mutedForeground px-1">Config & Timeline</h5>

                                        {/* Date */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 bg-violet-100 dark:bg-violet-500/20 rounded-lg border-2 border-border text-violet-600 dark:text-violet-400">
                                                    <Calendar size={14} className="currentColor" />
                                                </div>
                                                <span className="text-[13px] font-black text-foreground">Deadline Posting</span>
                                            </div>
                                            <input
                                                type="date"
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                required
                                                className="w-full bg-background border-[3px] border-border rounded-2xl px-5 py-4 font-black text-[14px] focus:border-violet-500 focus:shadow-hard-mini-mini outline-none transition-all"
                                            />
                                        </div>

                                        {/* Status */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg border-2 border-border text-amber-600 dark:text-amber-400">
                                                    <RefreshCw size={14} className="currentColor" />
                                                </div>
                                                <span className="text-[13px] font-black text-foreground">Status Tahapan</span>
                                            </div>
                                            <CreatableSelect
                                                value={formData.status}
                                                onChange={(val) => setFormData({ ...formData, status: val })}
                                                colorTheme="yellow"
                                                options={Object.values(ContentStatus).map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }))}
                                                className="!border-[3px] !rounded-2xl !font-black !text-[14px]"
                                            />
                                        </div>

                                        {/* Type */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 bg-sky-100 dark:bg-sky-500/20 rounded-lg border-2 border-border text-sky-600 dark:text-sky-400">
                                                    <Layers size={14} className="currentColor" />
                                                </div>
                                                <span className="text-[13px] font-black text-foreground">Format Konten</span>
                                            </div>
                                            <CreatableSelect
                                                value={formData.type}
                                                onChange={(val) => setFormData({ ...formData, type: val })}
                                                colorTheme="pink"
                                                className="!border-[3px] !rounded-2xl !font-black !text-[14px]"
                                                options={[
                                                    { label: 'Carousel', value: 'Carousel' },
                                                    { label: 'Reels / Video', value: 'Reels' },
                                                    { label: 'Single Image', value: 'Single Image' },
                                                    { label: 'Story', value: 'Story' },
                                                ]}
                                            />
                                        </div>

                                        {/* Priority */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-lg border-2 border-border text-rose-600 dark:text-rose-400">
                                                    <Zap size={14} className="currentColor" />
                                                </div>
                                                <span className="text-[13px] font-black text-foreground">Urgency Level</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {[ContentPriority.LOW, ContentPriority.MEDIUM, ContentPriority.HIGH].map((p) => (
                                                    <button
                                                        key={formatStatus(p)}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, priority: p })}
                                                        className={`flex-1 py-3.5 rounded-2xl border-[3px] text-[14px] font-black transition-all ${formData.priority === p
                                                            ? 'bg-rose-500 border-border text-white shadow-hard-mini-mini'
                                                            : 'bg-background border-border text-mutedForeground hover:border-rose-400 hover:shadow-hard-mini-mini active:scale-95'}`}
                                                    >
                                                        {p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. ACTION BUTTONS SIDEBAR */}
                                    <div className="space-y-3 pt-2">
                                        <Button
                                            type="submit"
                                            size="large"
                                            className="w-full h-20 rounded-[2rem] shadow-hard-xl text-[14px] font-black"
                                        >
                                            {modalMode === 'create' ? 'Simpan Konten' : 'Simpan Perubahan'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setIsModalOpen(false)}
                                            className="w-full h-14 rounded-[1.5rem] text-[14px] font-black"
                                        >
                                            Batal
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Invite Code Modal - Unchanged */}
            <Modal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                title="Undang Member"
            >
                <div className="space-y-6 text-center py-4">
                    <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
                        <UserPlus size={32} className="text-accent" />
                    </div>
                    <div>
                        <h4 className="font-bold text-xl text-foreground">Kode Undangan Workspace</h4>
                        <p className="text-mutedForeground text-sm mt-1">Bagikan kode ini kepada tim Anda untuk bergabung.</p>
                    </div>

                    {workspaceData.invite_code === 'SETUP-REQ' ? (
                        <div className="p-6 bg-rose-50 border-[3px] border-dashed border-rose-500 rounded-xl relative shadow-[4px_4px_0px_#0f172a]">
                            <p className="font-black text-rose-600 mb-2 text-sm">Setup Database Diperlukan</p>
                            <p className="text-xs font-bold text-rose-500">Kolom 'invite_code' belum ada di database.</p>
                        </div>
                    ) : (
                        <div className="p-6 bg-card border-[3px] border-dashed border-slate-300 rounded-xl relative group transition-all hover:border-violet-500 hover:shadow-[4px_4px_0px_#0f172a]">
                            <p className="font-mono text-4xl font-black tracking-widest text-foreground select-all">
                                {workspaceData.invite_code}
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <Button onClick={handleCopyCode} disabled={workspaceData.invite_code === 'SETUP-REQ'} className="w-full" icon={copied ? <Check size={18} /> : <Copy size={18} />}>
                            {copied ? 'Kode Disalin!' : 'Salin Kode'}
                        </Button>
                        <button
                            onClick={handleRegenerateCode}
                            disabled={isRegenerating || workspaceData.invite_code === 'SETUP-REQ'}
                            className="text-mutedForeground hover:text-red-500 text-xs font-bold flex items-center justify-center gap-1 mx-auto transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={12} className={isRegenerating ? "animate-spin" : ""} />
                            {isRegenerating ? 'Memperbarui...' : 'Generate Kode Baru'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Member List Modal */}
            <Modal
                isOpen={isMemberModalOpen}
                onClose={() => setIsMemberModalOpen(false)}
            >
                <div className="p-1">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-card rounded-xl flex items-center justify-center border-[3px] border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                            <Users size={24} className="text-violet-600" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-foreground">Anggota Workspace</h3>
                            <p className="text-[10px] font-black text-slate-500 mt-1">Tim yang berkolaborasi di {workspaceData.name}</p>
                        </div>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 mb-4">
                        {teamMembers.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center gap-4 p-3 rounded-2xl border-[3px] border-slate-900 hover:-translate-y-1 transition-all bg-card shadow-[2px_2px_0px_#0f172a] hover:shadow-[4px_4px_0px_#0f172a]"
                            >
                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-xl border-[2px] border-slate-900 overflow-hidden bg-slate-100 shadow-[2px_2px_0px_#0f172a]">
                                        {member.avatar ? (
                                            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-mutedForeground">
                                                <User size={20} strokeWidth={2.5} />
                                            </div>
                                        )}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[2px] border-slate-900 ${getStatusDot(member.online_status || 'offline')}`}></div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-foreground truncate">{member.name}</h4>
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${member.role === 'Developer'
                                            ? 'bg-purple-100 text-purple-700 border-purple-200'
                                            : member.role === 'Admin' || member.role === 'Owner'
                                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                : 'bg-slate-100 text-slate-500 border-slate-200'
                                            }`}>
                                            {member.role || 'Member'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {member.online_status === 'online' ? (
                                            <Wifi size={10} className="text-emerald-500" />
                                        ) : member.online_status === 'idle' ? (
                                            <Clock size={10} className="text-amber-500" />
                                        ) : (
                                            <WifiOff size={10} className="text-mutedForeground" />
                                        )}
                                        <span className={`text-[10px] font-bold ${member.online_status === 'online'
                                            ? 'text-emerald-600'
                                            : member.online_status === 'idle'
                                                ? 'text-amber-600'
                                                : 'text-mutedForeground'
                                            }`}>
                                            {member.online_status === 'online'
                                                ? 'Sedang Aktif'
                                                : member.online_status === 'idle'
                                                    ? 'Sedang Idle'
                                                    : `Terakhir aktif: ${formatLastSeen(member.last_activity_at)}`
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6">
                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={() => setIsMemberModalOpen(false)}
                        >
                            Tutup
                        </Button>
                    </div>
                </div>
            </Modal>


            {/* Add Brand Asset Modal */}
            <Modal
                isOpen={isAddAssetModalOpen}
                onClose={() => setIsAddAssetModalOpen(false)}
                title="Tambah Brand Asset"
                maxWidth="max-w-xl"
            >
                <div className="space-y-5">
                    {/* Type Selector */}
                    <div>
                        <label className="block text-xs font-black text-mutedForeground mb-2">Tipe Asset</label>
                        <div className="flex flex-wrap gap-2">
                            {([
                                { value: 'note', label: 'Catatan', icon: <StickyNote size={16} />, color: 'bg-yellow-50 text-yellow-700 border-yellow-400' },
                                { value: 'link', label: 'Link', icon: <Globe size={16} />, color: 'bg-blue-50 text-blue-700 border-blue-400' },
                                { value: 'image', label: 'Gambar', icon: <ImageIcon size={16} />, color: 'bg-pink-50 text-pink-700 border-pink-400' },
                                { value: 'pdf', label: 'PDF', icon: <FileText size={16} />, color: 'bg-red-50 text-red-700 border-red-400' },
                                { value: 'file', label: 'File', icon: <File size={16} />, color: 'bg-muted text-slate-700 border-slate-400' },
                                { value: 'color', label: 'Warna', icon: <Palette size={16} />, color: 'bg-violet-50 text-violet-700 border-violet-400' }
                            ] as { value: typeof newAssetType, label: string, icon: React.ReactNode, color: string }[]).map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setNewAssetType(t.value)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black border-[3px] transition-all hover:-translate-y-1 active:scale-95 ${newAssetType === t.value
                                        ? 'bg-card border-slate-900 text-foreground shadow-[4px_4px_0px_#0f172a]'
                                        : 'bg-muted border-slate-200 text-mutedForeground hover:border-slate-900 hover:text-foreground hover:shadow-[4px_4px_0px_#0f172a]'
                                        }`}
                                >
                                    {t.icon} {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-black text-foreground mb-2">Judul</label>
                        <input
                            type="text"
                            value={newAssetTitle}
                            onChange={e => setNewAssetTitle(e.target.value)}
                            placeholder="Nama asset..."
                            className="w-full px-4 py-3 border-[3px] border-slate-900 shadow-[2px_2px_0px_#0f172a] rounded-xl text-sm font-black text-foreground placeholder:text-mutedForeground outline-none focus:border-violet-500 focus:shadow-[4px_4px_0px_#0f172a] transition-all bg-card"
                        />
                    </div>

                    {/* Content - Dynamic based on type */}
                    {newAssetType === 'note' && (
                        <div>
                            <label className="block text-xs font-black text-foreground mb-2">Catatan</label>
                            <textarea
                                value={newAssetContent}
                                onChange={e => setNewAssetContent(e.target.value)}
                                placeholder="Tulis catatan brand..."
                                rows={4}
                                className="w-full px-4 py-3 border-[3px] border-slate-900 shadow-[2px_2px_0px_#0f172a] rounded-xl text-sm font-black text-foreground placeholder:text-mutedForeground outline-none focus:border-violet-500 focus:shadow-[4px_4px_0px_#0f172a] transition-all bg-card resize-none"
                            />
                        </div>
                    )}

                    {newAssetType === 'link' && (
                        <div>
                            <label className="block text-xs font-black text-foreground mb-2">URL</label>
                            <input
                                type="url"
                                value={newAssetContent}
                                onChange={e => setNewAssetContent(e.target.value)}
                                placeholder="https://example.com"
                                className="w-full px-4 py-3 border-[3px] border-slate-900 shadow-[2px_2px_0px_#0f172a] rounded-xl text-sm font-black text-foreground placeholder:text-mutedForeground outline-none focus:border-violet-500 focus:shadow-[4px_4px_0px_#0f172a] transition-all bg-card"
                            />
                        </div>
                    )}

                    {newAssetType === 'color' && (
                        <div>
                            <label className="block text-xs font-black text-foreground mb-2">Kode Warna</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={newAssetContent || '#6366f1'}
                                    onChange={e => setNewAssetContent(e.target.value)}
                                    className="w-12 h-12 rounded-xl border-[3px] border-slate-900 shadow-[2px_2px_0px_#0f172a] cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={newAssetContent}
                                    onChange={e => setNewAssetContent(e.target.value)}
                                    placeholder="#6366f1"
                                    className="flex-1 px-4 py-3 border-[3px] border-slate-900 shadow-[2px_2px_0px_#0f172a] rounded-xl text-sm font-black text-foreground placeholder:text-mutedForeground outline-none focus:border-violet-500 focus:shadow-[4px_4px_0px_#0f172a] transition-all bg-card font-mono"
                                />
                            </div>
                        </div>
                    )}

                    {(newAssetType === 'image' || newAssetType === 'pdf' || newAssetType === 'file') && (
                        <div>
                            <label className="block text-xs font-black text-foreground mb-2">
                                Upload {newAssetType === 'image' ? 'Gambar' : newAssetType === 'pdf' ? 'PDF' : 'File'}
                            </label>
                            <div
                                onClick={() => brandFileInputRef.current?.click()}
                                className="border-[3px] border-dashed border-slate-300 rounded-[24px] p-10 text-center cursor-pointer hover:border-violet-500 hover:bg-violet-50 transition-all bg-card relative group overflow-hidden shadow-[4px_4px_0px_#0f172a]"
                            >
                                <div className="absolute inset-0 bg-violet-500/0 group-hover:bg-violet-500/5 transition-colors pointer-events-none" />
                                {newAssetContent ? (
                                    <div className="flex flex-col items-center gap-4 relative z-10">
                                        {newAssetType === 'image' && (
                                            <div className="relative">
                                                <img src={newAssetContent} alt="Preview" className="w-48 h-48 object-cover rounded-2xl border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a]" />
                                                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-violet-600 border-[3px] border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-center text-white">
                                                    <RefreshCw size={18} strokeWidth={3} className="animate-spin-slow" />
                                                </div>
                                            </div>
                                        )}
                                        {newAssetType === 'pdf' && (
                                            <div className="flex flex-col items-center gap-2 text-rose-600">
                                                <div className="w-16 h-16 rounded-2xl bg-rose-50 border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] flex items-center justify-center mb-2">
                                                    <FileText size={32} strokeWidth={3} />
                                                </div>
                                                <span className="font-black text-xs">{newAssetFileName}</span>
                                            </div>
                                        )}
                                        {newAssetType === 'file' && (
                                            <div className="flex flex-col items-center gap-2 text-foreground">
                                                <div className="w-16 h-16 rounded-2xl bg-muted border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] flex items-center justify-center mb-2">
                                                    <File size={32} strokeWidth={3} />
                                                </div>
                                                <span className="font-black text-xs">{newAssetFileName}</span>
                                            </div>
                                        )}
                                        <span className="text-[10px] font-black text-violet-600 bg-violet-100 px-3 py-1 rounded-full border-2 border-violet-200 mt-2">Klik untuk ganti file</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 relative z-10">
                                        <div className="w-16 h-16 rounded-[20px] bg-muted border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] flex items-center justify-center mb-2 group-hover:bg-violet-50 group-hover:scale-110 transition-all">
                                            <Upload size={32} strokeWidth={3} className="text-foreground" />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-sm font-black text-foreground block">Klik untuk upload file</span>
                                            <span className="text-[10px] font-black text-mutedForeground">Maksimal Kapasitas 10MB</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={brandFileInputRef}
                                type="file"
                                className="hidden"
                                accept={newAssetType === 'image' ? 'image/*' : newAssetType === 'pdf' ? '.pdf,application/pdf' : '*'}
                                onChange={handleBrandFileUpload}
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            onClick={handleAddBrandAsset}
                            className="flex-1"
                            icon={<Plus size={18} />}
                        >
                            Tambah Asset
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setIsAddAssetModalOpen(false)}
                            className="flex-1"
                        >
                            Batal
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Brand PDF Preview Popup */}
            <Modal
                isOpen={!!brandPdfPreviewUrl}
                onClose={() => setBrandPdfPreviewUrl(null)}
                title="PDF Preview"
                maxWidth="max-w-5xl"
            >
                <div className="h-[80vh]">
                    {brandPdfPreviewUrl && (
                        <iframe
                            src={brandPdfPreviewUrl}
                            className="w-full h-full rounded-2xl border-[3px] border-slate-900 shadow-[6px_6px_0px_#0f172a]"
                            title="Brand PDF Preview"
                        />
                    )}
                </div>
            </Modal>

            <style>{`
                .wipe-mask {
                    clip-path: inset(0 50% 0 50%);
                }
                .wipe-active {
                    clip-path: inset(0 0 0 0);
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </>
    );
};