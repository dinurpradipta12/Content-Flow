import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useNotifications } from '../components/NotificationProvider';
import { Search, Plus, Instagram, Video, ArrowRight, MoreHorizontal, Linkedin, Youtube, Facebook, AtSign, Edit, Trash2, User, Image as ImageIcon, Loader2, Upload, Users, Ticket, Layers } from 'lucide-react';
import { Workspace } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAppConfig } from '../components/AppConfigProvider';

interface WorkspaceData extends Workspace {
    totalContent: number;
    publishedCount: number;
    members: string[];
    platforms: string[]; // 'IG', 'TK', 'LI', 'YT', 'FB', 'TH'
    color: 'violet' | 'pink' | 'yellow' | 'green';
    description?: string;
    period?: string;
    accountName?: string;
    logoUrl?: string;
}

// Helper to render platform icons
const renderPlatformIcon = (code: string) => {
    const style = "p-1.5 rounded-lg border-2 border-slate-800 shadow-sm transition-transform hover:-translate-y-0.5 flex items-center justify-center";
    switch (code) {
        case 'IG': return <div key="IG" title="Instagram" className={`bg-pink-100 text-pink-600 ${style}`}><Instagram size={18} /></div>;
        case 'TK': return <div key="TK" title="TikTok" className={`bg-black text-white ${style}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
            </svg>
        </div>;
        case 'LI': return <div key="LI" title="LinkedIn" className={`bg-blue-100 text-blue-700 ${style}`}><Linkedin size={18} /></div>;
        case 'YT': return <div key="YT" title="YouTube" className={`bg-red-100 text-red-600 ${style}`}><Youtube size={18} /></div>;
        case 'FB': return <div key="FB" title="Facebook" className={`bg-blue-50 text-blue-600 ${style}`}><Facebook size={18} /></div>;
        case 'TH': return <div key="TH" title="Threads" className={`bg-slate-100 text-slate-800 ${style}`}><AtSign size={18} /></div>;
        default: return null;
    }
};

// Helper to get account badge style based on platform
const getAccountStyle = (platforms: string[]) => {
    // Priority order for coloring
    if (platforms.includes('IG')) return 'bg-pink-50 text-pink-600 border-pink-200';
    if (platforms.includes('YT')) return 'bg-red-50 text-red-600 border-red-200';
    if (platforms.includes('LI')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (platforms.includes('FB')) return 'bg-blue-50 text-blue-600 border-blue-200';
    if (platforms.includes('TK')) return 'bg-slate-900 text-white border-slate-700';
    if (platforms.includes('TH')) return 'bg-slate-100 text-slate-900 border-slate-300';

    return 'bg-slate-50 text-slate-600 border-slate-200';
};

export const ContentPlan: React.FC = () => {
    const navigate = useNavigate();
    const { sendNotification } = useNotifications();
    const { config } = useAppConfig();
    const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Derive role from localStorage — used for UI access control
    const userRole = localStorage.getItem('user_role') || 'Member';
    const isAdminOrOwner = ['Admin', 'Owner', 'Developer'].includes(userRole);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [joinCode, setJoinCode] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        logoUrl: '',
        accountName: '', // Keep for backward compatibility or primary display
        platforms: [] as string[],
        description: '',
        period: '',
        profileLinks: {} as Record<string, string>,
        accountNames: {} as Record<string, string> // New: Store usernames per platform
    });

    const [currentUserName, setCurrentUserName] = useState('Anda');

    // --- SUPABASE INTEGRATION ---

    const fetchWorkspaces = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('user_id');
            const userRole = localStorage.getItem('user_role') || 'Member';

            // 1. Fetch User Data & Workspaces in Parallel
            const currentUserAvatar = localStorage.getItem('user_avatar') || 'https://picsum.photos/40/40';

            // OPTIMIZATION: Select ONLY needed columns to avoid huge payload size (from unused columns)
            let wsQuery = supabase.from('workspaces').select('id, name, platforms, color, account_name, logo_url, members, owner_id, role, created_at, description, period');

            // Construct OR condition safely: Avoid massive base64 strings in URL
            let orCond = `owner_id.eq.${userId},members.cs.{"${userId}"}`;
            if (currentUserAvatar && !currentUserAvatar.startsWith('data:')) {
                orCond += `,members.cs.{"${currentUserAvatar}"}`;
            }
            wsQuery = wsQuery.or(orCond);

            const [userRes, wsRes] = await Promise.all([
                supabase.from('app_users').select('avatar_url, full_name').eq('id', userId || '').single(),
                wsQuery.order('created_at', { ascending: false })
            ]);

            if (wsRes.error) throw wsRes.error;

            const userData = userRes.data;
            const wsData = wsRes.data || [];

            const currentAvatar = userData?.avatar_url || currentUserAvatar;
            const freshName = userData?.full_name || localStorage.getItem('user_name') || 'Anda';
            setCurrentUserName(freshName);

            if (wsData.length === 0) {
                setWorkspaces([]);
                return;
            }

            // 2. Fetch Content Stats — ONLY needed columns for counting
            const wsIds = wsData.map(ws => ws.id);
            const { data: contentData, error: contentError } = await supabase
                .from('content_items')
                .select('workspace_id, status') // Fetch ONLY these 2 columns
                .in('workspace_id', wsIds);

            if (contentError) throw contentError;

            // 3. Optimize Merging: Pre-calculate counts in O(N) using a map
            const statsMap: Record<string, { total: number, published: number }> = {};
            (contentData || []).forEach(item => {
                if (!statsMap[item.workspace_id]) statsMap[item.workspace_id] = { total: 0, published: 0 };
                statsMap[item.workspace_id].total++;
                if (item.status === 'Published') statsMap[item.workspace_id].published++;
            });

            // 4. Merge & Access Control
            const mergedData: WorkspaceData[] = wsData
                .filter(ws => {
                    const isOwner = ws.owner_id === userId;

                    if (!currentAvatar) return false;
                    const members: string[] = ws.members || [];
                    return members.some(m => {
                        if (m === userId) return true;
                        try { return decodeURIComponent(m) === decodeURIComponent(currentAvatar) || m === currentAvatar; }
                        catch { return m === currentAvatar; }
                    });
                })
                .map(ws => ({
                    id: ws.id,
                    name: ws.name,
                    role: ws.role || 'Owner',
                    platforms: ws.platforms || [],
                    color: ws.color || 'violet',
                    description: ws.description,
                    period: ws.period,
                    accountName: ws.account_name,
                    logoUrl: ws.logo_url,
                    members: ws.members || [],
                    totalContent: statsMap[ws.id]?.total || 0,
                    publishedCount: statsMap[ws.id]?.published || 0
                }));

            setWorkspaces(mergedData);
        } catch (error) {
            console.error("Error fetching workspaces:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkspaces();

        const handleClickOutside = () => setActiveMenu(null);
        document.addEventListener('click', handleClickOutside);

        // LISTEN FOR USER UPDATES (Profile Photo Sync)
        const handleUserUpdate = () => {
            fetchWorkspaces();
        };
        window.addEventListener('user_updated', handleUserUpdate);

        return () => {
            document.removeEventListener('click', handleClickOutside);
            window.removeEventListener('user_updated', handleUserUpdate);
        };
    }, []);

    const toggleMenu = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setActiveMenu(activeMenu === id ? null : id);
    };

    const handleOpenCreateModal = () => {
        setModalMode('create');
        setFormData({
            name: '',
            logoUrl: '',
            accountName: '',
            platforms: [],
            description: '',
            period: '',
            profileLinks: {},
            accountNames: {}
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (e: React.MouseEvent, workspace: WorkspaceData) => {
        e.stopPropagation();
        setModalMode('edit');
        setEditingId(workspace.id);
        setFormData({
            name: workspace.name,
            logoUrl: workspace.logoUrl || '',
            accountName: workspace.accountName || '',
            platforms: workspace.platforms,
            description: workspace.description || '',
            period: workspace.period || '',
            profileLinks: {}, // TODO: Load existing links if available in DB
            accountNames: { [workspace.platforms[0]]: workspace.accountName || '' } // Basic init
        });
        setIsModalOpen(true);
        setActiveMenu(null);
    };

    const handleDeleteWorkspace = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Apakah Anda yakin ingin menghapus workspace ini secara permanen? Data tidak dapat dikembalikan.')) {
            try {
                const { error } = await supabase.from('workspaces').delete().eq('id', id);
                if (error) throw error;
                // Remove from local state
                setWorkspaces(prev => prev.filter(w => w.id !== id));
            } catch (error) {
                console.error("Error deleting:", error);
                alert("Gagal menghapus data.");
            }
        }
        setActiveMenu(null);
    };

    // Handle Image Upload to Base64
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate size (max 1MB for base64 safety in standard text columns)
            if (file.size > 1024 * 1024) {
                alert("Ukuran file terlalu besar (Max 1MB)");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setFormData(prev => ({ ...prev, logoUrl: base64String }));
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleSaveWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();

        const colors: ('violet' | 'pink' | 'yellow' | 'green')[] = ['violet', 'pink', 'yellow', 'green'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const userId = localStorage.getItem('user_id') || '';
        const currentUserAvatar = localStorage.getItem('user_avatar') || 'https://picsum.photos/40/40';

        try {
            if (modalMode === 'create') {
                const { data, error } = await supabase.from('workspaces').insert([
                    {
                        name: formData.name,
                        role: 'Owner',
                        platforms: formData.platforms,
                        color: randomColor,
                        description: formData.description,
                        period: formData.period,
                        account_name: formData.accountName,
                        logo_url: formData.logoUrl, // Base64 string is saved here
                        members: [userId, currentUserAvatar], // Include both ID and Avatar for reliability and dispay
                        admin_id: localStorage.getItem('tenant_id') || userId,
                        owner_id: userId
                    }
                ]).select('id'); // Only select id to minimize response size (prevents "Failed to fetch" on large rows)

                if (error) throw error;
                fetchWorkspaces();

            } else if (modalMode === 'edit' && editingId) {
                const { error } = await supabase.from('workspaces').update({
                    name: formData.name,
                    platforms: formData.platforms,
                    description: formData.description,
                    period: formData.period,
                    account_name: formData.accountName,
                    logo_url: formData.logoUrl
                }).eq('id', editingId);

                if (error) throw error;
                fetchWorkspaces();
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving workspace:", error);
            alert("Gagal menyimpan data ke database.");
        }
    };

    const handleJoinWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode) return;

        try {
            // 1. Find Workspace by code
            const { data, error } = await supabase
                .from('workspaces')
                .select('*')
                .eq('invite_code', joinCode)
                .single();

            if (error || !data) {
                alert("Kode workspace tidak valid atau tidak ditemukan.");
                return;
            }

            const userId = localStorage.getItem('user_id') || '';
            const currentUserAvatar = localStorage.getItem('user_avatar') || 'https://picsum.photos/40/40';
            const currentMembers: string[] = data.members || [];

            // Check if already joined by ID or Avatar
            if (!currentMembers.includes(userId) && !currentMembers.includes(currentUserAvatar)) {
                // Store both for backward compatibility and to fix URL length issues in queries
                const updatedMembers = [...currentMembers, userId, currentUserAvatar];
                const { error: updateError } = await supabase
                    .from('workspaces')
                    .update({ members: updatedMembers })
                    .eq('id', data.id);

                if (updateError) throw updateError;

                // 3. Notify Workspace Owner
                await sendNotification({
                    recipientId: data.admin_id,
                    type: 'JOIN_WORKSPACE',
                    title: 'Member Baru Bergabung',
                    content: `telah bergabung ke workspace ${data.name}`,
                    workspaceId: data.id
                });
            }

            alert(`Berhasil bergabung ke workspace: ${data.name}`);
            setJoinCode('');
            setIsJoinModalOpen(false);
            fetchWorkspaces();

        } catch (err) {
            console.error(err);
            alert("Terjadi kesalahan saat bergabung.");
        }
    };

    const togglePlatform = (code: string) => {
        setFormData(prev => {
            const exists = prev.platforms.includes(code);
            let newPlatforms;
            if (exists) {
                newPlatforms = prev.platforms.filter(p => p !== code);
            } else {
                newPlatforms = [...prev.platforms, code];
            }

            // Auto-generate profile link placeholder if not exists
            const newLinks = { ...prev.profileLinks };
            if (!exists && !newLinks[code]) {
                newLinks[code] = '';
            }

            return { ...prev, platforms: newPlatforms, profileLinks: newLinks };
        });
    };

    const handleProfileLinkChange = (platformCode: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            profileLinks: {
                ...prev.profileLinks,
                [platformCode]: value
            }
        }));
    };

    const handleAccountNameChange = (platformCode: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            accountNames: {
                ...prev.accountNames,
                [platformCode]: value
            },
            // Update the main accountName to be the first one entered (for display consistency)
            accountName: prev.platforms[0] === platformCode ? value : prev.accountName
        }));
    };

    const currentUserId = localStorage.getItem('user_id');
    const isDeveloper = userRole === 'Developer';

    return (
        <div className="space-y-8 pb-12">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b-2 border-slate-100 pb-6">
                <div>
                    <h2 className="text-4xl font-extrabold text-slate-800 font-heading tracking-tight">{config?.page_titles?.['plan']?.title || 'Content Plan Workspace'}</h2>
                    <p className="text-slate-500 font-medium mt-2">{config?.page_titles?.['plan']?.subtitle || 'Pilih workspace untuk mulai mengelola konten.'}</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        className="bg-tertiary text-slate-900 hover:bg-[#FCD34D] whitespace-nowrap"
                        icon={<Users size={18} />}
                        onClick={() => setIsJoinModalOpen(true)}
                    >
                        Gabung Workspace
                    </Button>

                    {/* Only admins can create new workspaces */}
                    {isAdminOrOwner && (
                        <Button
                            icon={<Plus size={18} />}
                            className="whitespace-nowrap"
                            onClick={handleOpenCreateModal}
                        >
                            Buat Workspace
                        </Button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin" size={32} />
                        <span className="font-bold">Memuat data ...</span>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* Workspace Cards */}
                    {workspaces.map((ws) => (
                        <Card
                            key={ws.id}
                            className={`h-[320px] flex flex-col cursor-pointer hover:-translate-y-2 overflow-hidden relative`}
                            headerColor={ws.color}
                            onClick={() => navigate(`/plan/${ws.id}`)}
                        >
                            {/* --- LOGO BACKGROUND (Decorative) --- */}
                            {ws.logoUrl ? (
                                <img
                                    src={ws.logoUrl}
                                    alt="bg-logo"
                                    className="absolute -top-6 -right-6 w-40 h-40 object-contain opacity-10 rotate-12 pointer-events-none z-0"
                                />
                            ) : (
                                <Layers
                                    className="absolute -top-6 -right-6 w-40 h-40 text-slate-400 opacity-5 rotate-12 pointer-events-none z-0"
                                />
                            )}

                            {/* Menu Button (Absolute Top Right) - Only for Owner or Developer */}
                            {(isDeveloper || currentUserId === ws.owner_id) && (
                                <div className="absolute top-4 right-4 z-30">
                                    <button
                                        className={`p-1.5 rounded-full transition-colors border-2 ${activeMenu === ws.id ? 'bg-slate-100 border-slate-200' : 'border-transparent hover:bg-slate-100'}`}
                                        onClick={(e) => toggleMenu(e, ws.id)}
                                    >
                                        <MoreHorizontal size={20} className="text-slate-500" />
                                    </button>

                                    {activeMenu === ws.id && (
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-card border-2 border-border rounded-xl shadow-hard z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                            <button
                                                onClick={(e) => handleOpenEditModal(e, ws)}
                                                className="w-full text-left px-4 py-3 hover:bg-muted font-bold text-foreground flex items-center gap-3 transition-colors"
                                            >
                                                <Edit size={16} className="text-accent" />
                                                Edit Info Workspace
                                            </button>
                                            <div className="h-[2px] bg-border w-full"></div>
                                            <button
                                                onClick={(e) => handleDeleteWorkspace(e, ws.id)}
                                                className="w-full text-left px-4 py-3 hover:bg-red-500/10 text-red-500 font-bold flex items-center gap-3 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                                Hapus Permanen
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Header Layout: Logo Left, Info Stack Right */}
                            <div className="flex gap-4 items-start mb-6 relative z-20 pr-8">
                                {/* Left: Logo (Enlarged) */}
                                {ws.logoUrl ? (
                                    <div className="ws-logo-box w-[120px] h-[120px] flex-shrink-0 bg-card rounded-2xl border-2 border-border overflow-hidden p-1.5 shadow-sm">
                                        <img src={ws.logoUrl} alt="logo" className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="ws-logo-box w-[120px] h-[120px] flex-shrink-0 bg-muted/50 rounded-2xl border-2 border-border flex items-center justify-center p-1.5 shadow-sm text-mutedForeground">
                                        <Layers size={36} />
                                    </div>
                                )}

                                {/* Right: Stacked Info */}
                                <div className="flex flex-col flex-1 min-w-0">
                                    {/* 1. Logos Sosmed */}
                                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                        {ws.platforms.map((p, idx) => (
                                            <React.Fragment key={idx}>
                                                {renderPlatformIcon(p)}
                                            </React.Fragment>
                                        ))}
                                    </div>

                                    {/* 2. Nama Content Plan Workspace */}
                                    <h3 className="text-xl md:text-3xl font-bold font-heading text-foreground leading-tight truncate drop-shadow-sm mb-2" title={ws.name}>
                                        {ws.name}
                                    </h3>

                                    {/* 3. Status Workspace (Owner/Member) */}
                                    <div>
                                        <span className="inline-block px-4 py-1 rounded-full text-[11px] font-bold text-mutedForeground bg-muted border-2 border-border shadow-sm">
                                            {ws.role}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Stats Row: Progress Bar */}
                            <div className="space-y-2 mb-4 relative z-10">
                                <div className="flex justify-between text-xs font-bold text-mutedForeground">
                                    <span>Published</span>
                                    <span>{ws.totalContent > 0 ? Math.round((ws.publishedCount / ws.totalContent) * 100) : 0}%</span>
                                </div>
                                <div className="w-full bg-muted h-3 rounded-full overflow-hidden border border-border">
                                    <div
                                        className={`h-full rounded-full ${ws.color === 'violet' ? 'bg-accent' : ws.color === 'pink' ? 'bg-secondary' : 'bg-tertiary'} border-r-2 border-slate-900/10 transition-all duration-500`}
                                        style={{ width: `${ws.totalContent > 0 ? (ws.publishedCount / ws.totalContent) * 100 : 0}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs font-medium text-mutedForeground/80 mt-1">
                                    <span>{ws.totalContent - ws.publishedCount} Pending / Draft</span>
                                    <span>{ws.totalContent} Total Konten</span>
                                </div>
                            </div>

                            {/* 5. Footer Row: Members & Action (Pushed to bottom) */}
                            <div className="mt-auto pt-4 border-t-2 border-border border-dashed flex items-center justify-between gap-3 relative z-10">
                                <div className="flex -space-x-2 overflow-hidden flex-shrink-0 items-center">
                                    {ws.members.slice(0, 3).map((url, i) => (
                                        <img key={i} src={url} className="w-8 h-8 rounded-full border-2 border-card shadow-sm flex-shrink-0 bg-muted object-cover z-20" alt="Member" />
                                    ))}
                                    {ws.members.length > 3 && (
                                        <div className="w-8 h-8 rounded-full border-2 border-card shadow-sm flex-shrink-0 bg-muted flex items-center justify-center text-[10px] font-bold text-mutedForeground z-10 relative">
                                            +{ws.members.length - 3}
                                        </div>
                                    )}
                                </div>
                                <div className="text-accent font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all whitespace-nowrap min-w-0">
                                    <span>Buka Content Plan</span>
                                    <ArrowRight size={16} className="flex-shrink-0" />
                                </div>
                            </div>
                        </Card>
                    ))}
                    {workspaces.length === 0 && (
                        <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-2xl bg-muted">
                            {isAdminOrOwner ? (
                                // Admin: no workspaces yet
                                <>
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 border-2 border-accent/20 flex items-center justify-center">
                                        <Layers className="text-accent opacity-60" size={32} />
                                    </div>
                                    <h3 className="text-foreground font-black text-xl mb-1">Belum ada workspace</h3>
                                    <p className="text-mutedForeground font-medium text-sm mb-4">Buat workspace pertama Anda untuk mulai merencanakan konten.</p>
                                    <Button onClick={handleOpenCreateModal} icon={<Plus size={18} />}>Buat Workspace Baru</Button>
                                </>
                            ) : (
                                // Member: waiting to be invited
                                <>
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                                        <Users className="text-amber-500 opacity-80" size={32} />
                                    </div>
                                    <h3 className="text-slate-700 font-black text-xl mb-1">Menunggu Undangan</h3>
                                    <p className="text-slate-400 font-medium text-sm mb-4">Anda belum diundang ke workspace manapun.<br />Hubungi admin tim Anda atau masukkan kode undangan.</p>
                                    <Button
                                        className="bg-tertiary text-slate-900 hover:bg-[#FCD34D]"
                                        icon={<Users size={18} />}
                                        onClick={() => setIsJoinModalOpen(true)}
                                    >
                                        Masukkan Kode Undangan
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Create / Edit Workspace */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalMode === 'create' ? 'Buat Workspace Baru' : 'Edit Info Workspace'}
            >
                <form onSubmit={handleSaveWorkspace} className="space-y-5">

                    {/* Top Section: Logo & Basic Info */}
                    <div className="flex gap-4">
                        <div className="flex-shrink-0">
                            <label className="font-bold text-xs text-slate-600 block mb-1">Logo</label>

                            {/* Hidden File Input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/png, image/jpeg"
                                className="hidden"
                            />

                            <div
                                onClick={triggerFileInput}
                                className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-accent hover:border-accent cursor-pointer transition-colors relative overflow-hidden group"
                            >
                                {formData.logoUrl ? (
                                    <div className="relative w-full h-full p-2">
                                        {/* Use object-contain to preserve transparency and aspect ratio */}
                                        <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">Ganti</div>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={24} className="mb-1" />
                                        <span className="text-[10px] font-bold text-center px-1">Upload PNG</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 space-y-4">
                            <Input
                                label="Nama Workspace"
                                placeholder="Contoh: Arunika Personal"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* Platform Selection */}
                    <div>
                        <label className="font-bold text-xs text-mutedForeground mb-2 block ml-1">Platform (Pilih Minimal 1)</label>
                        <div className="flex flex-wrap gap-3 mb-4">
                            {[
                                { id: 'IG', label: 'Instagram', icon: <Instagram size={18} />, color: 'hover:bg-pink-500/10 hover:border-pink-500/50 hover:text-pink-500' },
                                { id: 'TK', label: 'TikTok', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>, color: 'hover:bg-slate-500/10 hover:border-slate-500/50 hover:text-foreground' },
                                { id: 'YT', label: 'YouTube', icon: <Youtube size={18} />, color: 'hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500' },
                                { id: 'LI', label: 'LinkedIn', icon: <Linkedin size={18} />, color: 'hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-500' },
                                { id: 'FB', label: 'Facebook', icon: <Facebook size={18} />, color: 'hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-500' },
                                { id: 'TH', label: 'Threads', icon: <AtSign size={18} />, color: 'hover:bg-slate-500/10 hover:border-slate-500/50 hover:text-foreground' },
                            ].map((p) => {
                                const isSelected = formData.platforms.includes(p.id);
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => togglePlatform(p.id)}
                                        className={`flex items-center justify-center flex-1 sm:flex-none gap-2 px-4 py-2 rounded-xl border-2 transition-all font-bold text-sm ${isSelected
                                            ? 'bg-accent border-accent text-white shadow-hard'
                                            : `bg-muted/50 border-border text-foreground ${p.color}`
                                            }`}
                                    >
                                        {p.icon}
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Dynamic Profile Links & Account Names */}
                        {formData.platforms.length > 0 && (
                            <div className="space-y-4 p-4 bg-muted rounded-xl border border-border animate-in slide-in-from-top-2">
                                <label className="font-bold text-xs text-mutedForeground block mb-1">Detail Akun per Platform</label>
                                {formData.platforms.map(code => (
                                    <div key={code} className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 flex justify-center text-mutedForeground">
                                                {code === 'IG' ? <Instagram size={16} /> :
                                                    code === 'YT' ? <Youtube size={16} /> :
                                                        code === 'LI' ? <Linkedin size={16} /> :
                                                            code === 'FB' ? <Facebook size={16} /> :
                                                                code === 'TH' ? <AtSign size={16} /> : <span className="font-bold text-xs">{code}</span>}
                                            </div>
                                            <Input
                                                placeholder={`Username ${code === 'IG' ? 'Instagram' : code} (e.g. @arunika)`}
                                                value={formData.accountNames[code] || ''}
                                                onChange={(e) => handleAccountNameChange(code, e.target.value)}
                                                className="h-9 text-xs"
                                                icon={<AtSign size={14} />}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Input
                                                placeholder={`Link Profile ${code === 'IG' ? 'Instagram' : code}...`}
                                                value={formData.profileLinks[code] || ''}
                                                onChange={(e) => handleProfileLinkChange(code, e.target.value)}
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Description & Period */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Periode Workspace (Bulan)"
                            type="month"
                            value={formData.period}
                            onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                        />
                        <div className="flex flex-col gap-1">
                            <label className="font-bold text-xs text-mutedForeground ml-1">Owner</label>
                            <div className="flex items-center gap-2 px-4 py-3 bg-muted border-2 border-border rounded-lg text-mutedForeground cursor-not-allowed">
                                <User size={18} />
                                <span className="font-bold text-sm">{currentUserName} (Anda)</span>
                            </div>
                        </div>
                    </div>

                    <Textarea
                        label="Keterangan Workspace"
                        placeholder="Deskripsikan tujuan workspace ini..."
                        className="min-h-[100px]"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />

                    {/* Footer Actions */}
                    <div className="pt-6 border-t-2 border-border flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Batal
                        </Button>
                        <Button type="submit">
                            {modalMode === 'create' ? 'Buat Workspace' : 'Simpan Perubahan'}
                        </Button>
                    </div>

                </form>
            </Modal>

            <Modal
                isOpen={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
                title="Gabung Workspace"
            >
                <form onSubmit={handleJoinWorkspace} className="space-y-4">
                    <div className="p-4 bg-muted rounded-xl border border-border text-sm text-foreground mb-2">
                        Masukkan kode undangan yang diberikan oleh pemilik workspace untuk bergabung. Anda akan otomatis ditambahkan sebagai member.
                    </div>
                    <Input
                        label="Kode Undangan"
                        placeholder="Contoh: X7K9L2"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        required
                        className="uppercase font-mono tracking-widest text-center text-lg"
                        maxLength={6}
                    />
                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsJoinModalOpen(false)}>
                            Batal
                        </Button>
                        <Button type="submit" icon={<Users size={18} />}>
                            Gabung Sekarang
                        </Button>
                    </div>
                </form>
            </Modal>
        </div >
    );
};