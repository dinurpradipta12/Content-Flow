import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useNotifications } from '../components/NotificationProvider';
import { Search, Plus, Instagram, Video, ArrowRight, MoreHorizontal, Linkedin, Youtube, Facebook, AtSign, Edit, Trash2, User, Image as ImageIcon, Loader2, Upload, Users, Ticket, Layers, Lock, Globe, Sparkles } from 'lucide-react';
import { Workspace } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAppConfig } from '../components/AppConfigProvider';
import { useWorkspaces, useContentStats } from '../src/hooks/useDataQueries';
import { useQueryClient } from '@tanstack/react-query';

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
    profile_links?: Record<string, string>;
    account_names?: Record<string, string>;
    workspace_type?: 'personal' | 'team';
    owner_id?: string;
}

// Helper to render platform icons as links
const renderPlatformLink = (code: string, links?: Record<string, string>) => {
    const profileUrl = links?.[code] || '#';
    const style = "p-1.5 rounded-lg border-2 border-slate-800 shadow-sm transition-transform hover:-translate-y-1 hover:scale-110 flex items-center justify-center cursor-pointer";

    const content = (() => {
        switch (code) {
            case 'IG': return <Instagram size={18} />;
            case 'TK': return (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
            );
            case 'LI': return <Linkedin size={18} />;
            case 'YT': return <Youtube size={18} />;
            case 'FB': return <Facebook size={18} />;
            case 'TH': return <AtSign size={18} />;
            default: return null;
        }
    })();

    if (!content) return null;

    const bgClass = (() => {
        switch (code) {
            case 'IG': return 'bg-pink-100 text-pink-600';
            case 'TK': return 'bg-black text-white';
            case 'LI': return 'bg-blue-100 text-blue-700';
            case 'YT': return 'bg-red-100 text-red-600';
            case 'FB': return 'bg-blue-50 text-blue-600';
            case 'TH': return 'bg-slate-100 text-foreground';
            default: return '';
        }
    })();

    return (
        <a
            key={code}
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`${code}: ${profileUrl}`}
            onClick={(e) => e.stopPropagation()} // Prevent card navigation
            className={`${bgClass} ${style}`}
        >
            {content}
        </a>
    );
};

// Helper to get account badge style based on platform
const getAccountStyle = (platforms: string[]) => {
    // Priority order for coloring
    if (platforms.includes('IG')) return 'bg-pink-50 text-pink-600 border-pink-200';
    if (platforms.includes('YT')) return 'bg-red-50 text-red-600 border-red-200';
    if (platforms.includes('LI')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (platforms.includes('FB')) return 'bg-blue-50 text-blue-600 border-blue-200';
    if (platforms.includes('TK')) return 'bg-slate-900 text-white border-slate-700';
    if (platforms.includes('TH')) return 'bg-slate-100 text-foreground border-slate-300';

    return 'bg-muted text-slate-600 border-slate-200';
};

export const ContentPlan: React.FC = () => {
    const navigate = useNavigate();
    const { sendNotification } = useNotifications();
    const { config } = useAppConfig();
    const queryClient = useQueryClient();
    const userId = localStorage.getItem('user_id');

    // Fetch workspaces and content stats using React Query hooks
    const { data: workspacesData = [], isLoading } = useWorkspaces(userId);
    const workspaceIds = workspacesData.map(ws => ws.id);
    const { data: contentStats = {} } = useContentStats(workspaceIds.length > 0 ? workspaceIds : undefined);

    // Transform hook data into the format needed by the component
    const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
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
        accountNames: {} as Record<string, string>, // New: Store usernames per platform
        workspace_type: 'team' as 'personal' | 'team'
    });

    const [currentUserName, setCurrentUserName] = useState('Anda');
    const [gridCols, setGridCols] = useState<3 | 4>(3);

    // Sync current user name from localStorage
    useEffect(() => {
        const freshName = localStorage.getItem('user_name') || 'Anda';
        setCurrentUserName(freshName);
    }, []);

    // Transform React Query hook data into WorkspaceData format
    useEffect(() => {
        if (!workspacesData.length) {
            setWorkspaces([]);
            return;
        }

        // Transform workspaces + merge with content stats
        const transformed: WorkspaceData[] = workspacesData.map(ws => ({
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
            profile_links: ws.profile_links || {},
            account_names: ws.account_names || {},
            workspace_type: (ws.workspace_type as 'personal' | 'team') || 'team',
            owner_id: ws.owner_id,
            // Merge with content stats from useContentStats hook
            totalContent: contentStats[ws.id]?.total || 0,
            publishedCount: contentStats[ws.id]?.published || 0
        }));

        setWorkspaces(transformed);
        console.log(`Transformed ${transformed.length} workspaces with content stats`);
    }, [workspacesData, contentStats]);

    useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        document.addEventListener('click', handleClickOutside);

        // LISTEN FOR USER UPDATES (Profile Photo Sync)
        const handleUserUpdate = () => {
            // React Query hooks will automatically refetch due to cache invalidation
            // No need to manually call fetchWorkspaces anymore
            console.log('User updated, React Query will refresh data');
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
        const isFree = localStorage.getItem('user_subscription_package') === 'Free' && localStorage.getItem('user_role') !== 'Developer';
        const myWorkspaces = workspaces.filter(ws => ws.owner_id === userId);
        if (isFree && myWorkspaces.length >= 2) {
            alert('Paket Free maksimal memiliki 2 Workspace. Silakan upgrade ke Premium untuk menambah lebih banyak.');
            return;
        }

        setModalMode('create');
        setFormData({
            name: '',
            logoUrl: '',
            accountName: '',
            platforms: [],
            description: '',
            period: '',
            profileLinks: {},
            accountNames: {},
            workspace_type: 'team'
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
            profileLinks: workspace.profile_links || {},
            accountNames: workspace.account_names || { [workspace.platforms[0]]: workspace.accountName || '' },
            workspace_type: workspace.workspace_type || 'team'
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
                // Invalidate cache so React Query refetches data
                await queryClient.invalidateQueries({ queryKey: ['workspaces', userId] });
                await queryClient.invalidateQueries({ queryKey: ['content-stats'] });
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
            if (file.size > 5 * 1024 * 1024) {
                alert("Ukuran file terlalu besar (Max 5MB)");
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
                        members: [userId, currentUserAvatar], // Include both ID and Avatar for reliability and display
                        admin_id: localStorage.getItem('tenant_id') || userId,
                        owner_id: userId,
                        profile_links: formData.profileLinks,
                        account_names: formData.accountNames,
                        workspace_type: formData.workspace_type // 'personal' or 'team'
                    }
                ]).select('id'); // Only select id to minimize response size (prevents "Failed to fetch" on large rows)

                if (error) throw error;
                // Invalidate cache so React Query refetches data
                await queryClient.invalidateQueries({ queryKey: ['workspaces', userId] });
                await queryClient.invalidateQueries({ queryKey: ['content-stats'] });

            } else if (modalMode === 'edit' && editingId) {
                const { error } = await supabase.from('workspaces').update({
                    name: formData.name,
                    platforms: formData.platforms,
                    description: formData.description,
                    period: formData.period,
                    account_name: formData.accountName,
                    logo_url: formData.logoUrl,
                    profile_links: formData.profileLinks,
                    account_names: formData.accountNames,
                    workspace_type: formData.workspace_type // 'personal' or 'team'
                }).eq('id', editingId);

                if (error) throw error;
                // Invalidate cache so React Query refetches data
                await queryClient.invalidateQueries({ queryKey: ['workspaces', userId] });
                await queryClient.invalidateQueries({ queryKey: ['content-stats'] });
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
            const currentUsername = localStorage.getItem('user_name') || '';
            const currentMembers: string[] = data.members || [];

            // Check if already joined by ID, Avatar or Username
            const alreadyJoined = currentMembers.includes(userId) || currentMembers.includes(currentUserAvatar);
            if (!alreadyJoined) {
                // Determine limits by fetching workspace owner's subscription
                const { data: adminData } = await supabase.from('app_users').select('subscription_package, role').eq('id', data.admin_id).single();
                const isAdminFree = (adminData?.subscription_package === 'Free') && (adminData?.role !== 'Developer');

                // Count unique members (rough estimate from tokens)
                const uniqueMembers = new Set();
                currentMembers.forEach(m => {
                    if (m.length > 30 || m.includes('@') || m.includes('http')) {
                        uniqueMembers.add(m); // IDs and URLs
                    }
                });

                if (isAdminFree && uniqueMembers.size >= 3) {
                    alert('Gagal bergabung. Pemilik Workspace ini menggunakan paket Free yang hanya mengizinkan maksimal 2 anggota lainnya.');
                    return;
                }

                // Store userId + username for visibility in all views
                const newTokens = [userId];
                if (currentUsername && !currentMembers.includes(currentUsername)) newTokens.push(currentUsername);
                if (currentUserAvatar && !currentUserAvatar.startsWith('data:') && !currentMembers.includes(currentUserAvatar)) newTokens.push(currentUserAvatar);
                const updatedMembers = [...currentMembers, ...newTokens];
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
            // Invalidate cache so React Query refetches data
            await queryClient.invalidateQueries({ queryKey: ['workspaces', userId] });
            await queryClient.invalidateQueries({ queryKey: ['content-stats'] });

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
    const tenantIdForEdit = localStorage.getItem('tenant_id');
    const isDeveloper = userRole === 'Developer';
    const isAdmin = ['Admin', 'Owner'].includes(userRole);

    return (
        <>
            {/* ═══ MOBILE VIEW ═══ */}
            <div className="block md:hidden pb-24 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 mt-2">
                    <div>
                        <h2 className="text-xl font-black text-foreground font-heading tracking-tight leading-none uppercase">{config?.page_titles?.['plan']?.title || 'Content Plan'}</h2>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{workspaces.length} workspace</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsJoinModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-amber-400 text-foreground rounded-xl text-[10px] uppercase font-black tracking-widest border-[3px] border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-y-[2px] hover:shadow-none transition-all">
                            <Users size={14} strokeWidth={3} /> Gabung
                        </button>
                        {isAdminOrOwner && (
                            <button onClick={handleOpenCreateModal}
                                className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-xl text-[10px] uppercase font-black tracking-widest border-[3px] border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-y-[2px] hover:shadow-none transition-all">
                                <Plus size={14} strokeWidth={3} /> Buat
                            </button>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="p-4 bg-card border-[3px] border-slate-900 rounded-2xl shadow-[4px_4px_0px_#0f172a]">
                            <Loader2 className="animate-spin w-8 h-8 text-foreground" strokeWidth={3} />
                        </div>
                    </div>
                ) : workspaces.length === 0 ? (
                    <div className="text-center py-12 border-[3px] border-dashed border-slate-900 rounded-3xl bg-muted shadow-inner">
                        <Layers size={36} strokeWidth={2.5} className="text-mutedForeground mx-auto mb-4" />
                        <p className="text-base font-black text-foreground mb-1 uppercase tracking-widest">Belum ada workspace</p>
                        <p className="text-xs font-bold text-slate-500 mb-6">Buat atau bergabung ke workspace</p>
                        {isAdminOrOwner && (
                            <button onClick={handleOpenCreateModal} className="px-5 py-3.5 bg-accent border-[3px] border-slate-900 text-white rounded-xl text-[10px] uppercase tracking-widest font-black shadow-[4px_4px_0px_#0f172a] hover:shadow-none hover:translate-y-[4px] transition-all w-3/4 mx-auto block max-w-xs">
                                Buat Workspace Baru
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {workspaces.map(ws => (
                            <button key={ws.id} onClick={() => navigate(`/plan/${ws.id}`)}
                                className="w-full bg-card border-[3px] border-slate-900 rounded-2xl p-4 flex flex-col gap-3 text-left shadow-[4px_4px_0px_#0f172a] hover:shadow-[6px_6px_0px_#0f172a] hover:-translate-y-1 transition-all active:translate-y-0 active:shadow-[2px_2px_0px_#0f172a] group">
                                <div className="flex gap-3 items-center w-full">
                                    {/* Logo */}
                                    <div className={`w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border-[3px] border-slate-900 shadow-[2px_2px_0px_#0f172a] bg-card ws-logo-box`}>
                                        {ws.logoUrl ? (
                                            <img src={ws.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                                        ) : (
                                            <Layers size={22} strokeWidth={2.5} className={ws.color === 'violet' ? 'text-accent' : ws.color === 'pink' ? 'text-pink-600' : ws.color === 'yellow' ? 'text-amber-600' : 'text-emerald-600'} />
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0 pr-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-lg font-black font-heading text-foreground truncate tracking-tight group-hover:text-accent transition-colors">{ws.name}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {ws.workspace_type === 'personal' ? (
                                                <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-widest text-purple-700 bg-purple-100 border-[2px] border-slate-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <Lock size={10} strokeWidth={3} /> Personal
                                                </span>
                                            ) : (
                                                <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-widest text-blue-700 bg-blue-100 border-[2px] border-slate-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    <Globe size={10} strokeWidth={3} /> Team
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-xl border-[2px] border-slate-900 bg-slate-100 flex items-center justify-center shadow-[2px_2px_0px_#0f172a] group-hover:bg-accent group-hover:text-white transition-all">
                                        <ArrowRight size={16} strokeWidth={3} />
                                    </div>
                                </div>
                                <div className="bg-muted p-3 rounded-xl border-2 border-slate-200 mt-1">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                                        <span>{ws.publishedCount} Published</span>
                                        <span className={ws.totalContent > 0 && Math.round((ws.publishedCount / ws.totalContent) * 100) >= 100 ? 'text-emerald-500' : 'text-accent'}>{ws.totalContent > 0 ? Math.round((ws.publishedCount / ws.totalContent) * 100) : 0}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border-[2px] border-slate-900">
                                        <div
                                            className={`h-full border-r-[2px] border-slate-900 ${ws.color === 'violet' ? 'bg-accent' : ws.color === 'pink' ? 'bg-pink-400' : ws.color === 'yellow' ? 'bg-amber-400' : 'bg-emerald-400'} transition-all`}
                                            style={{ width: `${ws.totalContent > 0 ? (ws.publishedCount / ws.totalContent) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Modals are shared between mobile and desktop */}
            </div>

            {/* ═══ DESKTOP VIEW ═══ */}
            <div className="hidden md:block space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-10 pb-4 sm:pb-6 md:pb-8 lg:pb-12">
                {/* 1. TOP HEADER SECTION - Dashboard Style */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 bg-card p-10 rounded-[3rem] border-[3.5px] border-slate-900 shadow-hard mb-12">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="px-4 py-1.5 rounded-full border-[3px] border-slate-900 bg-card text-foreground font-black text-[10px] uppercase tracking-[0.2em] shadow-[3px_3px_0px_#0f172a]">
                                {workspaces.length} Workspace Aktif
                            </div>
                            <div className="flex items-center gap-2 text-mutedForeground font-bold text-sm bg-slate-100 px-3 py-1 rounded-lg">
                                <Layers size={14} className="text-accent" /> Manage Your Content Ecosystem
                            </div>
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-heading font-black text-foreground leading-tight">
                            {config?.page_titles?.['plan']?.title || 'Content Plan'}
                        </h1>
                        <p className="text-slate-500 font-bold max-w-3xl text-xl leading-relaxed">
                            <Sparkles size={20} className="inline mr-2 text-amber-400 animate-pulse" />
                            {config?.page_titles?.['plan']?.subtitle || 'Pilih workspace untuk mulai mengelola konten secara profesional.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Layout Switcher */}
                        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border-[3px] border-slate-900 shadow-hard-mini mr-2">
                            <button
                                onClick={() => setGridCols(3)}
                                className={`px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${gridCols === 3 ? 'bg-slate-900 text-white' : 'text-mutedForeground'}`}
                            >
                                3 Baris
                            </button>
                            <button
                                onClick={() => setGridCols(4)}
                                className={`px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${gridCols === 4 ? 'bg-slate-900 text-white' : 'text-mutedForeground'}`}
                            >
                                4 Baris
                            </button>
                        </div>

                        <button
                            onClick={() => setIsJoinModalOpen(true)}
                            className="flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black text-base transition-all hover:-translate-y-2 hover:shadow-hard active:translate-y-0 active:shadow-none bg-amber-400 text-foreground border-[3.5px] border-slate-900 shadow-hard-mini"
                        >
                            <Users size={22} strokeWidth={3} /> <span>Gabung</span>
                        </button>
                        {isAdminOrOwner && (
                            <button
                                onClick={handleOpenCreateModal}
                                className="flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black text-base transition-all hover:-translate-y-2 hover:shadow-hard active:translate-y-0 active:shadow-none bg-accent text-white border-[3.5px] border-slate-900 shadow-hard-mini"
                            >
                                <Plus size={22} strokeWidth={3} /> <span>Buat Workspace</span>
                            </button>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="p-6 bg-card border-[4px] border-slate-900 rounded-3xl shadow-[8px_8px_0px_#0f172a] flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin w-12 h-12 text-foreground" strokeWidth={3} />
                            <span className="text-sm font-black uppercase tracking-widest text-foreground">Memuat data ...</span>
                        </div>
                    </div>
                ) : (
                    <div className={`flex flex-col gap-4 sm:grid sm:gap-6 md:gap-8 ${gridCols === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
                        {/* Workspace Cards - Premium Bento Style (Thin Edition) */}
                        {workspaces.map((ws) => (
                            <div
                                key={ws.id}
                                className={`group relative bg-card rounded-[2.5rem] border-[3.5px] border-slate-900 shadow-hard hover:shadow-[10px_10px_0px_#0f172a] transition-all p-6 flex flex-col cursor-pointer overflow-hidden animate-in fade-in zoom-in-95 duration-500 h-full`}
                                onClick={() => navigate(`/plan/${ws.id}`)}
                            >
                                {/* Header: Logo, Name & Menu */}
                                <div className="flex items-center gap-4 mb-5 relative z-10 w-full">
                                    <div className={`w-14 h-14 rounded-2xl border-[3px] border-slate-900 flex items-center justify-center shadow-hard-mini transition-transform group-hover:rotate-6 duration-300 overflow-hidden bg-card shrink-0 ws-logo-box`}>
                                        {ws.logoUrl ? (
                                            <img src={ws.logoUrl} alt={ws.name} className="w-full h-full object-contain p-1.5" />
                                        ) : (
                                            <Layers size={24} className={ws.color === 'violet' ? 'text-accent' : ws.color === 'pink' ? 'text-pink-500' : ws.color === 'yellow' ? 'text-amber-500' : 'text-emerald-500'} strokeWidth={2.5} />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 pr-8">
                                        <h3 className="text-xl font-black font-heading text-foreground leading-tight truncate group-hover:text-accent transition-colors">
                                            {ws.name}
                                        </h3>
                                        <p className="text-[10px] font-black text-mutedForeground uppercase tracking-widest mt-0.5">{ws.role}</p>
                                    </div>

                                    {(isDeveloper || isAdmin || currentUserId === ws.owner_id || tenantIdForEdit === ws.owner_id) && (
                                        <div onClick={(e) => e.stopPropagation()} className="absolute top-0 right-0">
                                            <button
                                                className={`w-8 h-8 rounded-lg border-[2px] border-slate-900 flex items-center justify-center transition-all ${activeMenu === ws.id ? 'bg-slate-900 text-white' : 'bg-card text-foreground hover:bg-muted'}`}
                                                onClick={(e) => toggleMenu(e, ws.id)}
                                            >
                                                <MoreHorizontal size={16} strokeWidth={3} />
                                            </button>

                                            {activeMenu === ws.id && (
                                                <div className="absolute right-0 top-full mt-2 w-48 bg-card border-[3px] border-slate-900 rounded-xl shadow-hard z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
                                                    <button onClick={(e) => handleOpenEditModal(e, ws)} className="w-full text-left px-4 py-3 hover:bg-muted font-black text-foreground uppercase tracking-widest text-[9px] flex items-center gap-2">
                                                        <Edit size={14} className="text-accent" strokeWidth={3} /> Edit
                                                    </button>
                                                    <div className="h-[2px] bg-slate-100"></div>
                                                    <button onClick={(e) => handleDeleteWorkspace(e, ws.id)} className="w-full text-left px-4 py-3 hover:bg-rose-50 text-rose-600 font-black uppercase tracking-widest text-[9px] flex items-center gap-2">
                                                        <Trash2 size={14} strokeWidth={3} /> Hapus
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Platforms Badge Row */}
                                <div className="flex items-center gap-1.5 mb-5 relative z-10 flex-wrap">
                                    <span className={`px-2.5 py-1 rounded-lg border-[2px] border-slate-900 font-black text-[8px] uppercase tracking-widest flex items-center gap-1 ${ws.workspace_type === 'personal' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {ws.workspace_type === 'personal' ? <Lock size={8} strokeWidth={3} /> : <Globe size={8} strokeWidth={3} />}
                                        {ws.workspace_type}
                                    </span>
                                    {ws.platforms.slice(0, 3).map((p) => (
                                        <div key={p} className="scale-75 origin-left -ml-1">
                                            {renderPlatformLink(p, ws.profile_links)}
                                        </div>
                                    ))}
                                    {ws.platforms.length > 3 && (
                                        <span className="text-[9px] font-black text-mutedForeground border border-slate-200 rounded-md px-1.5 py-0.5">
                                            +{ws.platforms.length - 3}
                                        </span>
                                    )}
                                </div>

                                {/* Compact Stats & Power Bar */}
                                <div className="mt-auto space-y-3 relative z-10">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[9px] font-black text-mutedForeground uppercase tracking-widest">{ws.publishedCount} / {ws.totalContent} Published</p>
                                        <div className={`text-xs font-black ${ws.totalContent > 0 && (ws.publishedCount / ws.totalContent) >= 1 ? 'text-emerald-500' : 'text-accent'}`}>
                                            {ws.totalContent > 0 ? Math.round((ws.publishedCount / ws.totalContent) * 100) : 0}%
                                        </div>
                                    </div>

                                    <div className="h-4 w-full rounded-full border-[2.5px] border-slate-900 bg-slate-100 overflow-hidden p-[2px] shadow-inner mb-4">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 border-r-[2px] border-slate-900 ${ws.color === 'violet' ? 'bg-accent' : ws.color === 'pink' ? 'bg-pink-400' : ws.color === 'yellow' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                            style={{ width: `${ws.totalContent > 0 ? (ws.publishedCount / ws.totalContent) * 100 : 0}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center pt-2">
                                        <div className="flex -space-x-2">
                                            {(ws.members || []).filter(m => m.includes('/') || m.startsWith('data:')).slice(0, 3).map((url, i) => (
                                                <img
                                                    key={i}
                                                    src={url}
                                                    className="w-8 h-8 rounded-full border-[2.5px] border-slate-900 shadow-hard-mini object-cover bg-card"
                                                    style={{ zIndex: 10 - i }}
                                                    alt="Member"
                                                />
                                            ))}
                                            {(ws.members || []).filter(m => m.includes('/') || m.startsWith('data:')).length > 3 && (
                                                <div className="w-8 h-8 rounded-full border-[2.5px] border-slate-900 bg-card flex items-center justify-center text-[8px] font-black shadow-hard-mini" style={{ zIndex: 0 }}>
                                                    +{(ws.members || []).filter(m => m.includes('/') || m.startsWith('data:')).length - 3}
                                                </div>
                                            )}
                                        </div>

                                        <div className="h-8 px-4 rounded-xl bg-slate-900 text-white font-black uppercase text-[9px] tracking-widest flex items-center gap-2 transition-all group-hover:bg-accent group-hover:shadow-hard shadow-hard-mini">
                                            Buka <ArrowRight size={12} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {workspaces.length === 0 && (
                            <div className="col-span-full py-16 text-center border-[4px] border-dashed border-slate-900 rounded-3xl bg-muted shadow-inner">
                                {isAdminOrOwner ? (
                                    // Admin: no workspaces yet
                                    <>
                                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-card border-[3px] border-slate-900 shadow-[6px_6px_0px_#0f172a] flex items-center justify-center transform -rotate-3">
                                            <Layers className="text-foreground" size={32} strokeWidth={3} />
                                        </div>
                                        <h3 className="text-foreground font-extrabold font-heading text-2xl mb-2">Belum ada workspace</h3>
                                        <p className="text-slate-500 font-bold text-sm mb-6 max-w-sm mx-auto">Buat workspace pertama Anda untuk mulai merencanakan konten dan berkolaborasi.</p>
                                        <Button
                                            onClick={handleOpenCreateModal}
                                            icon={<Plus size={18} strokeWidth={3} />}
                                            className="uppercase font-black tracking-widest text-[10px] sm:text-xs h-12 px-6 border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] bg-accent hover:bg-violet-600 w-auto hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0f172a] transition-all"
                                        >
                                            Buat Workspace Baru
                                        </Button>
                                    </>
                                ) : (
                                    // Member: waiting to be invited
                                    <>
                                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-100 border-[3px] border-slate-900 shadow-[6px_6px_0px_#0f172a] flex items-center justify-center transform -rotate-3">
                                            <Users className="text-amber-600" size={32} strokeWidth={3} />
                                        </div>
                                        <h3 className="text-foreground font-extrabold font-heading text-2xl mb-2">Menunggu Undangan</h3>
                                        <p className="text-slate-500 font-bold text-sm mb-6 max-w-sm mx-auto">Anda belum diundang ke workspace manapun.<br />Minta admin tim Anda atau masukkan kode undangan.</p>
                                        <Button
                                            className="bg-amber-400 text-foreground hover:bg-amber-500 uppercase font-black tracking-widest text-[10px] sm:text-xs h-12 px-6 border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] w-auto hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0f172a] transition-all"
                                            icon={<Users size={18} strokeWidth={3} />}
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

                        {/* Workspace Type Selection */}
                        <div>
                            <label className="font-black text-xs text-foreground mb-2 block ml-1 uppercase tracking-widest">Tipe Workspace</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, workspace_type: 'team' }))}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-[3px] border-slate-900 transition-all font-black text-sm uppercase tracking-widest ${formData.workspace_type === 'team'
                                        ? 'bg-accent text-white shadow-[4px_4px_0px_#0f172a] scale-100'
                                        : 'bg-card text-foreground shadow-[2px_2px_0px_#0f172a] hover:bg-slate-100 hover:-translate-y-1'
                                        }`}
                                >
                                    <Globe size={24} strokeWidth={3} />
                                    <span>Team</span>
                                    <span className={`text-[9px] font-bold leading-tight text-center tracking-normal normal-case ${formData.workspace_type === 'team' ? 'text-white/80' : 'text-slate-500'}`}>
                                        Terlihat oleh semua member yang sudah bergabung
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, workspace_type: 'personal' }))}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-[3px] border-slate-900 transition-all font-black text-sm uppercase tracking-widest ${formData.workspace_type === 'personal'
                                        ? 'bg-purple-600 text-white shadow-[4px_4px_0px_#0f172a] scale-100'
                                        : 'bg-card text-foreground shadow-[2px_2px_0px_#0f172a] hover:bg-slate-100 hover:-translate-y-1'
                                        }`}
                                >
                                    <Lock size={24} strokeWidth={3} />
                                    <span>Personal</span>
                                    <span className={`text-[9px] font-bold leading-tight text-center tracking-normal normal-case ${formData.workspace_type === 'personal' ? 'text-white/80' : 'text-slate-500'}`}>
                                        Hanya terlihat oleh member yang diundang secara khusus
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Top Section: Logo & Basic Info */}
                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <label className="font-black text-xs text-foreground block mb-2 uppercase tracking-widest">Logo</label>

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
                                    className="w-24 h-24 bg-slate-100 border-[3px] border-dashed border-slate-900 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:text-foreground hover:bg-slate-200 cursor-pointer transition-colors relative overflow-hidden group shadow-[2px_2px_0px_#0f172a]"
                                >
                                    {formData.logoUrl ? (
                                        <div className="relative w-full h-full p-2 bg-card">
                                            {/* Use object-contain to preserve transparency and aspect ratio */}
                                            <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black uppercase text-[10px] tracking-widest">Ganti</div>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload size={24} strokeWidth={2.5} className="mb-1" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-center px-1">Upload<br />PNG</span>
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
                            <label className="font-black text-xs text-foreground mb-2 block ml-1 uppercase tracking-widest">Platform (Pilih Minimal 1)</label>
                            <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
                                {[
                                    { id: 'IG', label: 'Instagram', icon: <Instagram size={18} strokeWidth={2.5} />, color: 'hover:bg-pink-100 hover:text-pink-600', activeBg: 'bg-pink-500' },
                                    { id: 'TK', label: 'TikTok', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>, color: 'hover:bg-slate-200 hover:text-foreground', activeBg: 'bg-slate-900' },
                                    { id: 'YT', label: 'YouTube', icon: <Youtube size={18} strokeWidth={2.5} />, color: 'hover:bg-red-100 hover:text-red-600', activeBg: 'bg-red-600' },
                                    { id: 'LI', label: 'LinkedIn', icon: <Linkedin size={18} strokeWidth={2.5} />, color: 'hover:bg-blue-100 hover:text-blue-700', activeBg: 'bg-blue-600' },
                                    { id: 'FB', label: 'Facebook', icon: <Facebook size={18} strokeWidth={2.5} />, color: 'hover:bg-blue-100 hover:text-blue-600', activeBg: 'bg-blue-500' },
                                    { id: 'TH', label: 'Threads', icon: <AtSign size={18} strokeWidth={2.5} />, color: 'hover:bg-slate-200 hover:text-foreground', activeBg: 'bg-slate-900' },
                                ].map((p) => {
                                    const isSelected = formData.platforms.includes(p.id);
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => togglePlatform(p.id)}
                                            className={`flex items-center justify-center flex-1 sm:flex-none gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border-[3px] border-slate-900 transition-all font-black uppercase text-[10px] sm:text-xs tracking-widest ${isSelected
                                                ? `${p.activeBg} text-white shadow-[2px_2px_0px_#0f172a] scale-100`
                                                : `bg-card text-foreground shadow-[3px_3px_0px_#0f172a] hover:-translate-y-1 ${p.color}`
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
                                <div className="space-y-4 p-5 bg-muted rounded-2xl border-[3px] border-slate-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] animate-in slide-in-from-top-2">
                                    <label className="font-black text-xs text-foreground block mb-1 uppercase tracking-widest">Detail Akun per Platform</label>
                                    {formData.platforms.map(code => (
                                        <div key={code} className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b-2 border-slate-200 border-dashed last:border-0 last:pb-0">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-card border-[2px] border-slate-900 rounded-lg text-foreground shadow-[2px_2px_0px_#0f172a]">
                                                    {code === 'IG' ? <Instagram size={16} strokeWidth={2.5} /> :
                                                        code === 'YT' ? <Youtube size={16} strokeWidth={2.5} /> :
                                                            code === 'LI' ? <Linkedin size={16} strokeWidth={2.5} /> :
                                                                code === 'FB' ? <Facebook size={16} strokeWidth={2.5} /> :
                                                                    code === 'TH' ? <AtSign size={16} strokeWidth={2.5} /> : <span className="font-black text-xs">{code}</span>}
                                                </div>
                                                <Input
                                                    placeholder={`Username ${code === 'IG' ? 'Instagram' : code} (e.g. @arunika)`}
                                                    value={formData.accountNames[code] || ''}
                                                    onChange={(e) => handleAccountNameChange(code, e.target.value)}
                                                    className="h-10 text-xs font-bold font-mono"
                                                    icon={<AtSign size={14} />}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <Input
                                                    placeholder={`Link Profile ${code === 'IG' ? 'Instagram' : code}...`}
                                                    value={formData.profileLinks[code] || ''}
                                                    onChange={(e) => handleProfileLinkChange(code, e.target.value)}
                                                    className="h-10 text-xs font-mono"
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
                                <label className="font-black text-xs text-foreground ml-1 uppercase tracking-widest">Owner</label>
                                <div className="flex items-center gap-3 px-4 py-3 bg-slate-100 border-[3px] border-slate-300 border-dashed rounded-xl text-slate-500 cursor-not-allowed">
                                    <User size={18} strokeWidth={2.5} />
                                    <span className="font-black text-sm uppercase tracking-widest">{currentUserName} (Anda)</span>
                                </div>
                            </div>
                        </div>

                        <Textarea
                            label={<span className="font-black uppercase tracking-widest text-foreground">Keterangan Workspace</span>}
                            placeholder="Deskripsikan tujuan workspace ini..."
                            className="min-h-[100px] font-medium"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />

                        {/* Footer Actions */}
                        <div className="pt-6 border-t-[3px] border-slate-900 border-dashed flex justify-end gap-3">
                            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="border-[3px] border-slate-900 font-black uppercase tracking-widest hover:-translate-y-1 shadow-[4px_4px_0px_#0f172a] hover:shadow-[6px_6px_0px_#0f172a] transition-all">
                                Batal
                            </Button>
                            <Button type="submit" className="border-[3px] border-slate-900 bg-accent hover:bg-violet-600 font-black uppercase tracking-widest shadow-[4px_4px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0f172a] transition-all">
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
                    <form onSubmit={handleJoinWorkspace} className="space-y-5">
                        <div className="p-4 bg-amber-50 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] text-sm text-foreground font-bold mb-4">
                            Masukkan kode undangan yang diberikan oleh pemilik workspace untuk bergabung. Anda akan otomatis ditambahkan sebagai member.
                        </div>
                        <Input
                            label="Kode Undangan"
                            placeholder="Contoh: X7K9L2"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            required
                            className="uppercase font-mono tracking-widest text-center text-xl font-black h-14 border-[3px] border-slate-900 shadow-inner bg-muted"
                            maxLength={6}
                        />
                        <div className="pt-6 border-t-[3px] border-dashed border-slate-900 flex justify-end gap-3">
                            <Button type="button" variant="secondary" onClick={() => setIsJoinModalOpen(false)} className="border-[3px] border-slate-900 font-black uppercase tracking-widest hover:-translate-y-1 shadow-[4px_4px_0px_#0f172a] hover:shadow-[6px_6px_0px_#0f172a] transition-all">
                                Batal
                            </Button>
                            <Button type="submit" icon={<Users size={18} strokeWidth={3} />} className="bg-amber-400 text-foreground hover:bg-amber-500 border-[3px] border-slate-900 font-black uppercase tracking-widest shadow-[4px_4px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0f172a] transition-all">
                                Gabung Sekarang
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div >
        </>
    );
};