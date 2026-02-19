import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Search, Plus, Instagram, Video, ArrowRight, MoreHorizontal, Linkedin, Youtube, Facebook, AtSign, Edit, Trash2, User, Image as ImageIcon, Loader2, Upload, Users, Ticket, Layers } from 'lucide-react';
import { Workspace } from '../types';
import { supabase } from '../services/supabaseClient';

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
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
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
    const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
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
        accountName: '',
        platforms: [] as string[],
        description: '',
        period: ''
    });

    // --- SUPABASE INTEGRATION ---

    const fetchWorkspaces = async () => {
        setLoading(true);
        try {
            // 0. Get Current User Info for Syncing
            const userId = localStorage.getItem('user_id');
            const { data: userData } = await supabase.from('app_users').select('avatar_url').eq('id', userId).single();
            const freshAvatar = userData?.avatar_url || localStorage.getItem('user_avatar');

            // 1. Fetch Workspaces
            const { data: wsData, error: wsError } = await supabase
                .from('workspaces')
                .select('*')
                .order('created_at', { ascending: false });

            if (wsError) throw wsError;

            // 2. Fetch Content Stats for each workspace
            const { data: contentData, error: contentError } = await supabase
                .from('content_items')
                .select('workspace_id, status');

            if (contentError) throw contentError;

            // 3. Merge Data & Sync Avatar
            const mergedData: WorkspaceData[] = wsData.map((ws: any) => {
                const workspaceContent = contentData.filter((c: any) => c.workspace_id === ws.id);
                const total = workspaceContent.length;
                const published = workspaceContent.filter((c: any) => c.status === 'Published').length;

                // Sync Logic: If I am the creator/owner (role Owner), ensure my fresh avatar is the first member
                // If I am just a member, ensure my fresh avatar replaces my old one in the list (simple approximation)
                let currentMembers = ws.members || ['https://picsum.photos/40/40'];
                
                if (freshAvatar) {
                    if (ws.role === 'Owner') {
                         // Force update owner avatar at index 0
                         if (currentMembers.length > 0) currentMembers[0] = freshAvatar;
                         else currentMembers = [freshAvatar];
                    } 
                    // Note: Ideally we match by User ID, but since members is string[], 
                    // for this version we trust the Owner flag for the first slot.
                }

                return {
                    id: ws.id,
                    name: ws.name,
                    role: ws.role || 'Owner',
                    platforms: ws.platforms || [],
                    color: ws.color || 'violet',
                    description: ws.description,
                    period: ws.period,
                    accountName: ws.account_name,
                    logoUrl: ws.logo_url,
                    members: currentMembers,
                    totalContent: total,
                    publishedCount: published
                };
            });

            setWorkspaces(mergedData);
        } catch (error) {
            console.error("Error fetching workspaces:", error);
            // alert("Gagal memuat data workspace. Cek konsol.");
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
            period: ''
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
            period: workspace.period || ''
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
                        members: [currentUserAvatar] // Use current user avatar for sync accuracy
                    }
                ]).select();

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

            // 2. Check if already joined (Assuming based on avatar for this demo as we don't have proper user IDs)
            const currentUserAvatar = localStorage.getItem('user_avatar') || 'https://picsum.photos/40/40';
            const currentMembers: string[] = data.members || [];
            
            // Simple duplication check
            if (!currentMembers.includes(currentUserAvatar)) {
                 const updatedMembers = [...currentMembers, currentUserAvatar];
                 const { error: updateError } = await supabase
                    .from('workspaces')
                    .update({ members: updatedMembers })
                    .eq('id', data.id);
                 
                 if (updateError) throw updateError;
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
            if (exists) {
                return { ...prev, platforms: prev.platforms.filter(p => p !== code) };
            } else {
                return { ...prev, platforms: [...prev.platforms, code] };
            }
        });
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b-2 border-slate-100 pb-6">
                <div>
                    <h2 className="text-4xl font-extrabold text-slate-800 font-heading tracking-tight">Workspace Konten</h2>
                    <p className="text-slate-500 font-medium mt-2">Pilih workspace untuk mulai mengelola konten.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <Button 
                        // Style adjusted to match primary structure but with Tertiary (Yellow) color
                        className="bg-tertiary text-slate-900 hover:bg-[#FCD34D] whitespace-nowrap"
                        icon={<Users size={18}/>} 
                        onClick={() => setIsJoinModalOpen(true)}
                    >
                        Gabung Workspace
                    </Button>
                    
                    <Button 
                        icon={<Plus size={18}/>} 
                        className="whitespace-nowrap"
                        onClick={handleOpenCreateModal}
                    >
                        Buat Workspace
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin" size={32} />
                        <span className="font-bold">Memuat data dari Supabase...</span>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* Workspace Cards */}
                    {workspaces.map((ws) => (
                        <Card 
                            key={ws.id} 
                            className="h-[320px] flex flex-col cursor-pointer hover:-translate-y-2 overflow-hidden relative"
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

                            {/* 1. Header Row: Platforms & Menu */}
                            <div className="flex justify-between items-start mb-3 relative z-20">
                                <div className="flex gap-2">
                                    {ws.platforms.map((p, idx) => (
                                        <React.Fragment key={idx}>
                                            {renderPlatformIcon(p)}
                                        </React.Fragment>
                                    ))}
                                </div>
                                
                                {/* Menu Button & Dropdown */}
                                <div className="relative">
                                    <button 
                                        className={`p-1.5 rounded-full transition-colors border-2 border-transparent ${activeMenu === ws.id ? 'bg-slate-100 border-slate-200' : 'hover:bg-slate-100'}`}
                                        onClick={(e) => toggleMenu(e, ws.id)}
                                    >
                                        <MoreHorizontal size={20} className="text-slate-500" />
                                    </button>

                                    {activeMenu === ws.id && (
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-white border-2 border-slate-800 rounded-xl shadow-hard z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                            <button 
                                                onClick={(e) => handleOpenEditModal(e, ws)}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-3 transition-colors"
                                            >
                                                <Edit size={16} className="text-accent"/>
                                                Edit Info Workspace
                                            </button>
                                            <div className="h-[2px] bg-slate-100 w-full"></div>
                                            <button 
                                                onClick={(e) => handleDeleteWorkspace(e, ws.id)}
                                                className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-500 font-bold flex items-center gap-3 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                                Hapus Permanen
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Content Row: Title & Logo */}
                            <div className="mb-3 relative z-10 flex gap-3 items-center">
                                {/* Logo display in card */}
                                {ws.logoUrl && (
                                    <div className="w-12 h-12 flex-shrink-0 bg-white rounded-lg border border-slate-200 overflow-hidden p-1 shadow-sm">
                                         <img src={ws.logoUrl} alt="logo" className="w-full h-full object-contain" />
                                    </div>
                                )}
                                <h3 className="text-2xl font-black font-heading text-slate-800 leading-tight line-clamp-1 drop-shadow-sm" title={ws.name}>{ws.name}</h3>
                            </div>

                            {/* 3. Badges Row: Role & Account Name */}
                            <div className="flex justify-between items-center mb-5 relative z-10">
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border-2 border-slate-200">
                                    {ws.role}
                                </span>

                                {ws.accountName && (
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border-2 ${getAccountStyle(ws.platforms)}`}>
                                        <AtSign size={12}/>
                                        {ws.accountName.replace('@', '')}
                                    </span>
                                )}
                            </div>

                            {/* 4. Stats Row: Progress Bar */}
                            <div className="space-y-2 mb-4 relative z-10">
                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                    <span>Published</span>
                                    <span>{ws.totalContent > 0 ? Math.round((ws.publishedCount / ws.totalContent) * 100) : 0}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                                    <div 
                                        className={`h-full rounded-full ${ws.color === 'violet' ? 'bg-accent' : ws.color === 'pink' ? 'bg-secondary' : 'bg-tertiary'} border-r-2 border-slate-900/10 transition-all duration-500`}
                                        style={{ width: `${ws.totalContent > 0 ? (ws.publishedCount / ws.totalContent) * 100 : 0}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs font-medium text-slate-400 mt-1">
                                    <span>{ws.totalContent - ws.publishedCount} Pending / Draft</span>
                                    <span>{ws.totalContent} Total Konten</span>
                                </div>
                            </div>

                            {/* 5. Footer Row: Members & Action (Pushed to bottom) */}
                            <div className="mt-auto pt-4 border-t-2 border-slate-100 border-dashed flex items-center justify-between gap-3 relative z-10">
                                <div className="flex -space-x-2 overflow-hidden flex-shrink-0">
                                    {ws.members.map((url, i) => (
                                        <img key={i} src={url} className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0 bg-slate-200 object-cover" alt="Member" />
                                    ))}
                                </div>
                                <div className="text-accent font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all whitespace-nowrap min-w-0">
                                    <span>Buka Board</span> 
                                    <ArrowRight size={16} className="flex-shrink-0"/>
                                </div>
                            </div>
                        </Card>
                    ))}
                    {workspaces.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50">
                            <h3 className="text-slate-400 font-bold text-lg">Belum ada workspace.</h3>
                            <Button className="mt-4" onClick={handleOpenCreateModal} icon={<Plus size={18}/>}>Buat Baru Sekarang</Button>
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
                                        <Upload size={24} className="mb-1"/>
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
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                            <Input 
                                label="Nama Akun Social Media" 
                                placeholder="@username" 
                                icon={<AtSign size={16}/>}
                                value={formData.accountName}
                                onChange={(e) => setFormData({...formData, accountName: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* Platform Selection */}
                    <div>
                        <label className="font-bold text-xs text-slate-600 mb-2 block ml-1">Platform (Pilih Minimal 1)</label>
                        <div className="flex flex-wrap gap-3">
                            {[
                                { id: 'IG', label: 'Instagram', icon: <Instagram size={18}/>, color: 'hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600' },
                                { id: 'TK', label: 'TikTok', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>, color: 'hover:bg-slate-100 hover:border-slate-300 hover:text-black' },
                                { id: 'YT', label: 'YouTube', icon: <Youtube size={18}/>, color: 'hover:bg-red-50 hover:border-red-200 hover:text-red-600' },
                                { id: 'LI', label: 'LinkedIn', icon: <Linkedin size={18}/>, color: 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700' },
                                { id: 'FB', label: 'Facebook', icon: <Facebook size={18}/>, color: 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600' },
                                { id: 'TH', label: 'Threads', icon: <AtSign size={18}/>, color: 'hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900' },
                            ].map((p) => {
                                const isSelected = formData.platforms.includes(p.id);
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => togglePlatform(p.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all font-bold text-sm ${
                                            isSelected 
                                            ? 'bg-slate-800 border-slate-800 text-white shadow-hard' 
                                            : `bg-white border-slate-200 text-slate-500 ${p.color}`
                                        }`}
                                    >
                                        {p.icon}
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Description & Period */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label="Periode Workspace (Bulan)" 
                            type="month"
                            value={formData.period}
                            onChange={(e) => setFormData({...formData, period: e.target.value})}
                        />
                        <div className="flex flex-col gap-1">
                             <label className="font-bold text-xs text-slate-600 ml-1">Owner</label>
                             <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-slate-500 cursor-not-allowed">
                                <User size={18} />
                                <span className="font-bold text-sm">Aditya W. (Anda)</span>
                             </div>
                        </div>
                    </div>

                    <Textarea 
                        label="Keterangan Workspace" 
                        placeholder="Deskripsikan tujuan workspace ini..."
                        className="min-h-[100px]"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />

                    {/* Footer Actions */}
                    <div className="pt-6 border-t-2 border-slate-100 flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Batal
                        </Button>
                        <Button type="submit">
                            {modalMode === 'create' ? 'Buat Workspace' : 'Simpan Perubahan'}
                        </Button>
                    </div>

                </form>
            </Modal>

            {/* Modal Join Workspace */}
            <Modal
                isOpen={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
                title="Gabung Workspace"
            >
                <form onSubmit={handleJoinWorkspace} className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600 mb-2">
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
                        <Button type="submit" icon={<Users size={18}/>}>
                            Gabung Sekarang
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};