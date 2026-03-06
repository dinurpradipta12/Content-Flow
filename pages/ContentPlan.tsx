import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useNotifications } from '../components/NotificationProvider';
import { Search, Plus, Instagram, Video, ArrowRight, MoreHorizontal, Linkedin, Youtube, Facebook, AtSign, Edit, Trash2, User, Image as ImageIcon, Loader2, Upload, Users, Ticket, Layers, Lock, Globe } from 'lucide-react';
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
            case 'TH': return 'bg-slate-100 text-slate-800';
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
    if (platforms.includes('TH')) return 'bg-slate-100 text-slate-900 border-slate-300';

    return 'bg-slate-50 text-slate-600 border-slate-200';
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
                        <h2 className="text-xl font-black text-slate-900 font-heading tracking-tight leading-none uppercase">{config?.page_titles?.['plan']?.title || 'Content Plan'}</h2>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{workspaces.length} workspace</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsJoinModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-amber-400 text-slate-900 rounded-xl text-[10px] uppercase font-black tracking-widest border-[3px] border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:translate-y-[2px] hover:shadow-none transition-all">
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
                        <div className="p-4 bg-white border-[3px] border-slate-900 rounded-2xl shadow-[4px_4px_0px_#0f172a]">
                            <Loader2 className="animate-spin w-8 h-8 text-slate-900" strokeWidth={3} />
                        </div>
                    </div>
                ) : workspaces.length === 0 ? (
                    <div className="text-center py-12 border-[3px] border-dashed border-slate-900 rounded-3xl bg-slate-50 shadow-inner">
                        <Layers size={36} strokeWidth={2.5} className="text-slate-400 mx-auto mb-4" />
                        <p className="text-base font-black text-slate-900 mb-1 uppercase tracking-widest">Belum ada workspace</p>
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
                                className="w-full bg-white border-[3px] border-slate-900 rounded-2xl p-4 flex flex-col gap-3 text-left shadow-[4px_4px_0px_#0f172a] hover:shadow-[6px_6px_0px_#0f172a] hover:-translate-y-1 transition-all active:translate-y-0 active:shadow-[2px_2px_0px_#0f172a] group">
                                <div className="flex gap-3 items-center w-full">
                                    {/* Logo */}
                                    <div className={`w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border-[3px] border-slate-900 shadow-[2px_2px_0px_#0f172a] ${ws.color === 'violet' ? 'bg-accent/10' : ws.color === 'pink' ? 'bg-pink-100' : ws.color === 'yellow' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                                        {ws.logoUrl ? (
                                            <img src={ws.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                                        ) : (
                                            <Layers size={22} strokeWidth={2.5} className={ws.color === 'violet' ? 'text-accent' : ws.color === 'pink' ? 'text-pink-600' : ws.color === 'yellow' ? 'text-amber-600' : 'text-emerald-600'} />
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0 pr-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-lg font-black font-heading text-slate-900 truncate tracking-tight group-hover:text-accent transition-colors">{ws.name}</p>
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
                                <div className="bg-slate-50 p-3 rounded-xl border-2 border-slate-200 mt-1">
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
                {/* Page Header - Compact on mobile */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-[3px] border-slate-900 pb-5">
                    {/* Title Section */}
                    <div>
                        <h2 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-black text-slate-900 font-heading tracking-tight uppercase leading-none mb-1">{config?.page_titles?.['plan']?.title || 'Content Plan'}</h2>
                        <p className="text-xs sm:text-sm md:text-sm font-black text-slate-500 uppercase tracking-widest">{config?.page_titles?.['plan']?.subtitle || 'Pilih workspace untuk mulai mengelola konten.'}</p>
                    </div>

                    {/* Buttons - Stack on mobile */}
                    <div className="flex flex-wrap gap-3">
                        <Button
                            className="bg-amber-400 hover:bg-amber-500 text-slate-900 whitespace-nowrap text-xs sm:text-sm flex-1 sm:flex-none border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0f172a] font-black uppercase tracking-widest h-12 px-5 transition-all"
                            icon={<Users size={18} strokeWidth={3} />}
                            onClick={() => setIsJoinModalOpen(true)}
                        >
                            Gabung
                        </Button>

                        {/* Only admins can create new workspaces */}
                        {isAdminOrOwner && (
                            <Button
                                icon={<Plus size={18} strokeWidth={3} />}
                                className="bg-accent hover:bg-violet-600 text-white whitespace-nowrap text-xs sm:text-sm flex-1 sm:flex-none border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0f172a] font-black uppercase tracking-widest h-12 px-5 transition-all"
                                onClick={handleOpenCreateModal}
                            >
                                Buat Workspace
                            </Button>
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="p-6 bg-white border-[4px] border-slate-900 rounded-3xl shadow-[8px_8px_0px_#0f172a] flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin w-12 h-12 text-slate-900" strokeWidth={3} />
                            <span className="text-sm font-black uppercase tracking-widest text-slate-900">Memuat data ...</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 md:gap-6 lg:gap-8">
                        {/* Workspace Cards */}
                        {workspaces.map((ws) => (
                            <div
                                key={ws.id}
                                className={`h-auto flex flex-col cursor-pointer hover:-translate-y-2 overflow-hidden relative transition-all bg-card border-[3px] border-slate-900 rounded-3xl shadow-[6px_6px_0px_#0f172a] hover:shadow-[10px_10px_0px_#0f172a] group p-5 sm:p-6`}
                                onClick={() => navigate(`/plan/${ws.id}`)}
                            >
                                {/* --- LOGO BACKGROUND (Decorative) --- */}
                                {ws.logoUrl ? (
                                    <img
                                        src={ws.logoUrl}
                                        alt="bg-logo"
                                        className="absolute -top-6 -right-6 w-40 h-40 object-contain opacity-10 rotate-12 pointer-events-none z-0 transform group-hover:scale-110 transition-transform duration-500"
                                    />
                                ) : (
                                    <Layers
                                        className="absolute -top-6 -right-6 w-40 h-40 text-slate-400 opacity-5 rotate-12 pointer-events-none z-0 transform group-hover:scale-110 transition-transform duration-500"
                                    />
                                )}

                                {/* Menu Button (Absolute Top Right) - For Owner, Admin, or Developer */}
                                {(isDeveloper || isAdmin || currentUserId === ws.owner_id || tenantIdForEdit === ws.owner_id) && (
                                    <div className="absolute top-4 right-4 z-30" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            className={`p-1.5 rounded-lg transition-colors border-[3px] shrink-0 ${activeMenu === ws.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-900 text-slate-900 hover:bg-slate-100 shadow-[2px_2px_0px_#0f172a]'}`}
                                            onClick={(e) => toggleMenu(e, ws.id)}
                                        >
                                            <MoreHorizontal size={20} strokeWidth={2.5} />
                                        </button>

                                        {activeMenu === ws.id && (
                                            <div className="absolute right-0 top-full mt-2 w-56 bg-card border-[3px] border-slate-900 rounded-xl shadow-[6px_6px_0px_#0f172a] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                                <button
                                                    onClick={(e) => handleOpenEditModal(e, ws)}
                                                    className="w-full text-left px-4 py-3.5 hover:bg-slate-100 font-black text-slate-900 uppercase tracking-widest text-[10px] flex items-center gap-3 transition-colors"
                                                >
                                                    <Edit size={16} className="text-accent" strokeWidth={3} />
                                                    Edit Info Workspace
                                                </button>
                                                {(isDeveloper || currentUserId === ws.owner_id) && (
                                                    <>
                                                        <div className="h-[3px] bg-slate-900 w-full"></div>
                                                        <button
                                                            onClick={(e) => handleDeleteWorkspace(e, ws.id)}
                                                            className="w-full text-left px-4 py-3.5 hover:bg-rose-100 text-rose-600 font-black uppercase tracking-widest text-[10px] flex items-center gap-3 transition-colors"
                                                        >
                                                            <Trash2 size={16} strokeWidth={3} />
                                                            Hapus Permanen
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Header Layout: Logo Left, Info Stack Right */}
                                <div className="flex gap-4 items-start mb-4 relative z-20 pr-8">
                                    {/* Left: Logo */}
                                    {ws.logoUrl ? (
                                        <div className="ws-logo-box w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-white rounded-2xl border-[3px] border-slate-900 overflow-hidden p-1 shadow-[3px_3px_0px_#0f172a] transition-transform group-hover:-rotate-3">
                                            <img src={ws.logoUrl} alt="logo" className="w-full h-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="ws-logo-box w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-slate-100 rounded-2xl border-[3px] border-slate-900 flex items-center justify-center shadow-[3px_3px_0px_#0f172a] text-slate-400 transition-transform group-hover:-rotate-3">
                                            <Layers size={28} strokeWidth={2.5} />
                                        </div>
                                    )}

                                    {/* Right: Stacked Info */}
                                    <div className="flex flex-col flex-1 min-w-0 gap-2">
                                        {/* Workspace Name */}
                                        <h3 className="text-xl sm:text-2xl font-black font-heading text-slate-900 leading-none line-clamp-2 tracking-tight group-hover:text-accent transition-colors" title={ws.name}>
                                            {ws.name}
                                        </h3>

                                        {/* Badges row */}
                                        <div className="flex items-center gap-2 flex-wrap pb-1">
                                            <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-900 bg-white border-[2px] border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                                                {ws.role}
                                            </span>
                                            {ws.workspace_type === 'personal' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest text-purple-700 bg-purple-100 border-[2px] border-slate-900 shadow-[2px_2px_0px_#0f172a] uppercase">
                                                    <Lock size={12} strokeWidth={3} />
                                                    Personal
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest text-blue-700 bg-blue-100 border-[2px] border-slate-900 shadow-[2px_2px_0px_#0f172a] uppercase">
                                                    <Globe size={12} strokeWidth={3} />
                                                    Team
                                                </span>
                                            )}
                                        </div>

                                        {/* Platform icons */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {ws.platforms.slice(0, 4).map((p) => renderPlatformLink(p, ws.profile_links))}
                                            {ws.platforms.length > 4 && (
                                                <span className="text-[10px] font-black text-slate-500 border-2 border-slate-300 rounded-lg px-2 py-1">+{ws.platforms.length - 4}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Row: Progress Bar */}
                                <div className="space-y-2 mb-4 relative z-10 mt-2 bg-slate-50 p-3.5 rounded-2xl border-[2px] border-slate-200">
                                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-500">
                                        <span>{ws.publishedCount} Published</span>
                                        <span className={ws.totalContent > 0 && Math.round((ws.publishedCount / ws.totalContent) * 100) >= 100 ? 'text-emerald-500' : 'text-accent'}>{ws.totalContent > 0 ? Math.round((ws.publishedCount / ws.totalContent) * 100) : 0}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden border-[2px] border-slate-900 shadow-inner">
                                        <div
                                            className={`h-full border-r-[2px] border-slate-900 ${ws.color === 'violet' ? 'bg-accent' : ws.color === 'pink' ? 'bg-pink-400' : ws.color === 'yellow' ? 'bg-amber-400' : 'bg-emerald-400'} transition-all duration-500`}
                                            style={{ width: `${ws.totalContent > 0 ? (ws.publishedCount / ws.totalContent) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-[10px] font-black tracking-widest uppercase text-slate-400 text-right">
                                        {ws.totalContent} konten total
                                    </div>
                                </div>

                                {/* Footer Row: Members & Action */}
                                <div className="mt-auto pt-4 border-t-[3px] border-slate-900 border-dashed flex items-center justify-between gap-3 relative z-10">
                                    {/* Member photo stack - larger */}
                                    <div className="flex -space-x-3 overflow-hidden flex-shrink-0 items-center hover:space-x-1 transition-all">
                                        {(ws.members || []).filter(m => m.includes('/') || m.startsWith('data:')).slice(0, 4).map((url, i) => (
                                            <img
                                                key={i}
                                                src={url}
                                                className="w-10 h-10 rounded-full border-[3px] border-slate-900 shadow-[2px_2px_0px_#0f172a] flex-shrink-0 bg-white object-cover hover:-translate-y-1 transition-transform"
                                                style={{ zIndex: 20 - i }}
                                                alt="Member"
                                            />
                                        ))}
                                        {(ws.members || []).filter(m => m.includes('/') || m.startsWith('data:')).length > 4 && (
                                            <div className="w-10 h-10 rounded-full border-[3px] border-slate-900 shadow-[2px_2px_0px_#0f172a] flex-shrink-0 bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600 tracking-widest" style={{ zIndex: 10 }}>
                                                +{(ws.members || []).filter(m => m.includes('/') || m.startsWith('data:')).length - 4}
                                            </div>
                                        )}
                                        {(ws.members || []).filter(m => m.includes('/') || m.startsWith('data:')).length === 0 && (
                                            <div className="w-10 h-10 rounded-full border-[3px] border-dashed border-slate-300 flex items-center justify-center text-slate-300">
                                                <Users size={16} strokeWidth={2.5} />
                                            </div>
                                        )}
                                    </div>
                                    <button className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest px-4 py-3 rounded-xl shadow-[3px_3px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[5px_5px_0px_#0f172a] transition-all flex items-center gap-2 group-hover:bg-accent group-hover:shadow-[3px_3px_0px_#0f172a]">
                                        <span>Buka</span>
                                        <ArrowRight size={14} className="flex-shrink-0 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {workspaces.length === 0 && (
                            <div className="col-span-full py-16 text-center border-[4px] border-dashed border-slate-900 rounded-3xl bg-slate-50 shadow-inner">
                                {isAdminOrOwner ? (
                                    // Admin: no workspaces yet
                                    <>
                                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white border-[3px] border-slate-900 shadow-[6px_6px_0px_#0f172a] flex items-center justify-center transform -rotate-3">
                                            <Layers className="text-slate-900" size={32} strokeWidth={3} />
                                        </div>
                                        <h3 className="text-slate-900 font-extrabold font-heading text-2xl mb-2">Belum ada workspace</h3>
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
                                        <h3 className="text-slate-900 font-extrabold font-heading text-2xl mb-2">Menunggu Undangan</h3>
                                        <p className="text-slate-500 font-bold text-sm mb-6 max-w-sm mx-auto">Anda belum diundang ke workspace manapun.<br />Minta admin tim Anda atau masukkan kode undangan.</p>
                                        <Button
                                            className="bg-amber-400 text-slate-900 hover:bg-amber-500 uppercase font-black tracking-widest text-[10px] sm:text-xs h-12 px-6 border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] w-auto hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0f172a] transition-all"
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
                            <label className="font-black text-xs text-slate-900 mb-2 block ml-1 uppercase tracking-widest">Tipe Workspace</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, workspace_type: 'team' }))}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-[3px] border-slate-900 transition-all font-black text-sm uppercase tracking-widest ${formData.workspace_type === 'team'
                                        ? 'bg-accent text-white shadow-[4px_4px_0px_#0f172a] scale-100'
                                        : 'bg-white text-slate-900 shadow-[2px_2px_0px_#0f172a] hover:bg-slate-100 hover:-translate-y-1'
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
                                        : 'bg-white text-slate-900 shadow-[2px_2px_0px_#0f172a] hover:bg-slate-100 hover:-translate-y-1'
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
                                <label className="font-black text-xs text-slate-900 block mb-2 uppercase tracking-widest">Logo</label>

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
                                    className="w-24 h-24 bg-slate-100 border-[3px] border-dashed border-slate-900 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 cursor-pointer transition-colors relative overflow-hidden group shadow-[2px_2px_0px_#0f172a]"
                                >
                                    {formData.logoUrl ? (
                                        <div className="relative w-full h-full p-2 bg-white">
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
                            <label className="font-black text-xs text-slate-900 mb-2 block ml-1 uppercase tracking-widest">Platform (Pilih Minimal 1)</label>
                            <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
                                {[
                                    { id: 'IG', label: 'Instagram', icon: <Instagram size={18} strokeWidth={2.5} />, color: 'hover:bg-pink-100 hover:text-pink-600', activeBg: 'bg-pink-500' },
                                    { id: 'TK', label: 'TikTok', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" /></svg>, color: 'hover:bg-slate-200 hover:text-slate-900', activeBg: 'bg-slate-900' },
                                    { id: 'YT', label: 'YouTube', icon: <Youtube size={18} strokeWidth={2.5} />, color: 'hover:bg-red-100 hover:text-red-600', activeBg: 'bg-red-600' },
                                    { id: 'LI', label: 'LinkedIn', icon: <Linkedin size={18} strokeWidth={2.5} />, color: 'hover:bg-blue-100 hover:text-blue-700', activeBg: 'bg-blue-600' },
                                    { id: 'FB', label: 'Facebook', icon: <Facebook size={18} strokeWidth={2.5} />, color: 'hover:bg-blue-100 hover:text-blue-600', activeBg: 'bg-blue-500' },
                                    { id: 'TH', label: 'Threads', icon: <AtSign size={18} strokeWidth={2.5} />, color: 'hover:bg-slate-200 hover:text-slate-900', activeBg: 'bg-slate-900' },
                                ].map((p) => {
                                    const isSelected = formData.platforms.includes(p.id);
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => togglePlatform(p.id)}
                                            className={`flex items-center justify-center flex-1 sm:flex-none gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border-[3px] border-slate-900 transition-all font-black uppercase text-[10px] sm:text-xs tracking-widest ${isSelected
                                                ? `${p.activeBg} text-white shadow-[2px_2px_0px_#0f172a] scale-100`
                                                : `bg-white text-slate-700 shadow-[3px_3px_0px_#0f172a] hover:-translate-y-1 ${p.color}`
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
                                <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border-[3px] border-slate-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] animate-in slide-in-from-top-2">
                                    <label className="font-black text-xs text-slate-900 block mb-1 uppercase tracking-widest">Detail Akun per Platform</label>
                                    {formData.platforms.map(code => (
                                        <div key={code} className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-3 border-b-2 border-slate-200 border-dashed last:border-0 last:pb-0">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-white border-[2px] border-slate-900 rounded-lg text-slate-900 shadow-[2px_2px_0px_#0f172a]">
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
                                <label className="font-black text-xs text-slate-900 ml-1 uppercase tracking-widest">Owner</label>
                                <div className="flex items-center gap-3 px-4 py-3 bg-slate-100 border-[3px] border-slate-300 border-dashed rounded-xl text-slate-500 cursor-not-allowed">
                                    <User size={18} strokeWidth={2.5} />
                                    <span className="font-black text-sm uppercase tracking-widest">{currentUserName} (Anda)</span>
                                </div>
                            </div>
                        </div>

                        <Textarea
                            label={<span className="font-black uppercase tracking-widest text-slate-900">Keterangan Workspace</span>}
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
                        <div className="p-4 bg-amber-50 rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] text-sm text-slate-900 font-bold mb-4">
                            Masukkan kode undangan yang diberikan oleh pemilik workspace untuk bergabung. Anda akan otomatis ditambahkan sebagai member.
                        </div>
                        <Input
                            label="Kode Undangan"
                            placeholder="Contoh: X7K9L2"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            required
                            className="uppercase font-mono tracking-widest text-center text-xl font-black h-14 border-[3px] border-slate-900 shadow-inner bg-slate-50"
                            maxLength={6}
                        />
                        <div className="pt-6 border-t-[3px] border-dashed border-slate-900 flex justify-end gap-3">
                            <Button type="button" variant="secondary" onClick={() => setIsJoinModalOpen(false)} className="border-[3px] border-slate-900 font-black uppercase tracking-widest hover:-translate-y-1 shadow-[4px_4px_0px_#0f172a] hover:shadow-[6px_6px_0px_#0f172a] transition-all">
                                Batal
                            </Button>
                            <Button type="submit" icon={<Users size={18} strokeWidth={3} />} className="bg-amber-400 text-slate-900 hover:bg-amber-500 border-[3px] border-slate-900 font-black uppercase tracking-widest shadow-[4px_4px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#0f172a] transition-all">
                                Gabung Sekarang
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div >
        </>
    );
};