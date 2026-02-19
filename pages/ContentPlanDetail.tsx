import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input, Select, CreatableSelect } from '../components/ui/Input';
import { Plus, Calendar, Instagram, Linkedin, Video, AtSign, FileText, Film, FileImage, Link as LinkIcon, Upload, CheckCircle, Table, LayoutGrid, ArrowLeft, Youtube, Facebook, Loader2, UserPlus, Copy, Check, RefreshCw, MoreHorizontal, Edit, Trash2, User, Layers, Hash, ExternalLink, Download, File, Filter, ChevronDown } from 'lucide-react';
import { ContentStatus, ContentPriority, Platform, ContentItem } from '../types';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../services/supabaseClient';

// --- TYPES & HELPERS ---

// Mock Team Members for Mentioning
const TEAM_MEMBERS = [
    { label: 'Aditya W. (You)', value: 'Aditya W.' },
    { label: 'Sarah J. (Manager)', value: 'Sarah J.' },
    { label: 'Dimas R. (Editor)', value: 'Dimas R.' },
    { label: 'Bella (Designer)', value: 'Bella' },
    { label: 'Johan (Client)', value: 'Johan' }
];

// Helper: Get Platform Icon
const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
        case Platform.INSTAGRAM: return <Instagram size={16} />;
        case Platform.TIKTOK: return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
        );
        case Platform.THREADS: return <AtSign size={16} />;
        case Platform.LINKEDIN: return <Linkedin size={16} />;
        case Platform.YOUTUBE: return <Youtube size={16} />;
        case Platform.FACEBOOK: return <Facebook size={16} />;
        default: return <FileText size={16} />;
    }
};

// Helper: Get Platform Color for Card Header (Badge Only)
const getPlatformBadgeStyle = (platform: Platform) => {
    switch (platform) {
        case Platform.INSTAGRAM: return 'bg-pink-100 text-pink-700 border-pink-200';
        case Platform.TIKTOK: return 'bg-slate-800 text-white border-slate-900';
        case Platform.LINKEDIN: return 'bg-blue-100 text-blue-700 border-blue-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

// Helper: Get Card Base Style based on Status
const getCardStatusStyle = (status: ContentStatus) => {
    switch (status) {
        case ContentStatus.PUBLISHED:
            // Green Theme for Done
            return 'bg-emerald-50 border-emerald-300 shadow-[4px_4px_0px_0px_#059669] hover:shadow-[6px_6px_0px_0px_#059669]';
        case ContentStatus.IN_PROGRESS:
            // Purple Theme
            return 'bg-purple-50/60 border-purple-200 shadow-hard hover:shadow-hard-hover';
        case ContentStatus.REVIEW:
            // Amber Theme
            return 'bg-amber-50/60 border-amber-200 shadow-hard hover:shadow-hard-hover';
        case ContentStatus.SCHEDULED:
            // Pink Theme
            return 'bg-pink-50/60 border-pink-200 shadow-hard hover:shadow-hard-hover';
        default: // TODO
            // White/Slate Theme
            return 'bg-white border-slate-800 shadow-hard hover:shadow-hard-hover';
    }
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
    if (!pillar) return 'bg-slate-100 text-slate-500';
    const colors = [
        'bg-yellow-100 text-yellow-700 border-yellow-200',
        'bg-green-100 text-green-700 border-green-200',
        'bg-purple-100 text-purple-700 border-purple-200', 
        'bg-blue-100 text-blue-700 border-blue-200',
        'bg-orange-100 text-orange-700 border-orange-200'
    ];
    const index = pillar.length % colors.length;
    return `${colors[index]} border`;
};

// --- RICH TEXT RENDERER COMPONENT ---
const RichTextRenderer: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return <span className="text-slate-400 italic">Belum ada script atau catatan yang ditambahkan.</span>;
    return (
        <div className="space-y-1">
            {text.split('\n').map((line, lineIdx) => {
                const fileMatch = line.match(/^\[(.*?)\]\((.*?)\)$/);
                if (fileMatch) {
                    const fileName = fileMatch[1];
                    const fileUrl = fileMatch[2];
                    const isImage = fileUrl.startsWith('data:image');
                    return (
                        <div key={lineIdx} className="my-3 group relative bg-white border-2 border-slate-200 rounded-xl p-3 flex items-center gap-4 hover:border-accent hover:shadow-md transition-all">
                            {isImage ? (
                                <div className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex-shrink-0">
                                    <img src={fileUrl} alt="preview" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-lg border border-red-100 flex items-center justify-center flex-shrink-0">
                                    <FileText size={24} />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">{fileName}</p>
                                <p className="text-xs text-slate-500">{isImage ? 'Image File' : 'Document / File'}</p>
                            </div>
                            <a href={fileUrl} download={fileName} target="_blank" rel="noreferrer" className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-accent hover:text-white transition-colors" title="Download / Preview">
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
                        <a key={lineIdx} href={url} target="_blank" rel="noopener noreferrer" className="my-2 block bg-blue-50/50 border-2 border-blue-100 hover:border-blue-300 rounded-xl p-3 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <ExternalLink size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-0.5">External Link</p>
                                    <p className="text-sm font-bold text-blue-900 truncate">{url}</p>
                                </div>
                            </div>
                        </a>
                    );
                }
                return (
                    <p key={lineIdx} className="leading-relaxed text-slate-700">
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
    onEdit: (item: ContentItem) => void; 
    onDelete: (id: string) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onClick: (item: ContentItem) => void;
}> = ({ item, onEdit, onDelete, onDragStart, onClick }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div 
            draggable 
            onDragStart={(e) => onDragStart(e, item.id)}
            onClick={() => onClick(item)}
            className={`group rounded-xl border-2 transition-all duration-200 hover:-translate-y-1 cursor-grab active:cursor-grabbing relative mb-4 flex-shrink-0 z-10 hover:z-20 overflow-visible ${getCardStatusStyle(item.status)}`}
        >
            {/* Header: Platform & Actions */}
            <div className={`px-4 py-3 flex justify-between items-center rounded-t-[10px]`}>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getPlatformBadgeStyle(item.platform)}`}>
                    {getPlatformIcon(item.platform)}
                    <span>{item.platform}</span>
                </div>
                
                <div className="relative">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className="p-1 hover:bg-black/5 rounded-md text-slate-400 hover:text-slate-800 transition-colors"
                    >
                        <MoreHorizontal size={16} />
                    </button>
                    {showMenu && (
                         <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}></div>
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white border-2 border-slate-800 rounded-lg shadow-hard z-50 overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-100">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit(item); }}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-bold text-slate-700"
                                >
                                    <Edit size={14} className="text-accent" /> Edit
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(item.id); }}
                                    className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-2 font-bold text-red-500"
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="px-4 pb-4 space-y-3">
                {/* Title */}
                <h4 className="font-heading font-bold text-slate-800 text-sm leading-snug line-clamp-3">
                    {item.title}
                </h4>

                {/* Badges: Pillar & Type */}
                <div className="flex flex-wrap gap-2">
                    {item.pillar && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPillarStyle(item.pillar)}`}>
                            {item.pillar}
                        </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/50 text-slate-600 border border-slate-200 flex items-center gap-1">
                        {getTypeIcon(item.type)} {item.type}
                    </span>
                </div>
                
                {/* Divider */}
                <div className="h-px bg-slate-400/20 border-t border-dashed border-slate-400/30 w-full"></div>

                {/* Footer: Date & PIC */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold bg-white/60 px-2 py-1 rounded border border-slate-200">
                        <Calendar size={12} className="text-slate-400" />
                        <span>{item.date ? new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                    </div>

                    {item.pic ? (
                        <div className="flex items-center gap-1.5" title={`PIC: ${item.pic}`}>
                            <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold border border-slate-800 shadow-sm">
                                {item.pic.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 truncate max-w-[60px]">{item.pic}</span>
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center">
                            <User size={12} className="text-slate-400" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const KanbanColumn: React.FC<{ 
    status: ContentStatus, 
    items: ContentItem[], 
    textColor: string,
    onEdit: (item: ContentItem) => void,
    onDelete: (id: string) => void,
    onDropTask: (e: React.DragEvent, status: ContentStatus) => void,
    onDragStart: (e: React.DragEvent, id: string) => void,
    onCardClick: (item: ContentItem) => void
}> = ({ status, items, textColor, onEdit, onDelete, onDropTask, onDragStart, onCardClick }) => {
    
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-slate-50/50', 'border-accent/50');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('bg-slate-50/50', 'border-accent/50');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-slate-50/50', 'border-accent/50');
        onDropTask(e, status);
    };

    return (
        <div 
            className="min-w-[300px] w-[300px] flex-shrink-0 flex flex-col h-full rounded-2xl border-2 border-transparent transition-colors"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Column Header */}
            <div className="flex-shrink-0 flex items-center justify-between py-4 px-2 mb-2">
                <div className="flex items-center gap-2">
                    <h3 className={`font-heading font-black text-xl tracking-wide ${textColor}`}>{status}</h3>
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-xs font-bold min-w-[24px] text-center border border-slate-300">
                        {items.length}
                    </span>
                </div>
            </div>
            
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-3 pb-8 pt-4 no-scrollbar">
                {items.length > 0 ? (
                    items.map(item => (
                        <KanbanCard 
                            key={item.id} 
                            item={item} 
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onDragStart={onDragStart}
                            onClick={onCardClick}
                        />
                    ))
                ) : (
                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300 text-xs font-bold select-none">
                        Kosong
                    </div>
                )}
            </div>
        </div>
    );
}

// --- MAIN COMPONENT ---

export const ContentPlanDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [errorState, setErrorState] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);

  // Table Filters State
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ContentItem | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

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

  // --- DATA FETCHING ---
  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    setErrorState(null);
    try {
        // 0. Sync Latest User Avatar
        const userId = localStorage.getItem('user_id');
        const { data: userData } = await supabase.from('app_users').select('avatar_url').eq('id', userId).single();
        const freshAvatar = userData?.avatar_url || localStorage.getItem('user_avatar');

        const { data: ws, error: wsError } = await supabase
            .from('workspaces')
            .select('*')
            .eq('id', id)
            .single();
        
        if (wsError) throw wsError;
        
        let currentCode = ws.invite_code;
        if (!currentCode) {
            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            try {
                await supabase.from('workspaces').update({ invite_code: newCode }).eq('id', id);
                currentCode = newCode;
            } catch (err) {
                console.warn("Update invite_code failed:", err);
                currentCode = "SETUP-REQ";
            }
        }

        // Sync Members logic
        let currentMembers = ws.members || [];
        if (freshAvatar) {
            if (currentMembers.length === 0) {
                currentMembers.push(freshAvatar);
            } else if (ws.role === 'Owner') {
                currentMembers[0] = freshAvatar;
            }
        }

        setWorkspaceData({ 
            name: ws.name, 
            platforms: ws.platforms || [], 
            invite_code: currentCode || 'ERROR',
            logo_url: ws.logo_url || '',
            period: ws.period || '',
            account_name: ws.account_name || '',
            members: currentMembers
        });

        const { data: items, error: itemsError } = await supabase
            .from('content_items')
            .select('*')
            .eq('workspace_id', id)
            .order('created_at', { ascending: false });

        if (itemsError) throw itemsError;

        // MAP Supabase data (snake_case) to Frontend Type (camelCase)
        const mappedItems = items.map((item: any) => ({
            ...item,
            contentLink: item.content_link, // MAPPING FIX
            // Other fields usually match or are handled by JS weak typing, but content_link -> contentLink is crucial
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

  // Filter Logic for Table View
  const filteredTableTasks = tasks.filter(task => {
      const matchPlatform = filterPlatform === 'all' || task.platform === filterPlatform;
      const matchStatus = filterStatus === 'all' || task.status === filterStatus;
      return matchPlatform && matchStatus;
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
      setTasks(prev => prev.map(t => t.id === itemId ? { ...t, status: newStatus } : t));
      try {
          await supabase.from('content_items').update({ status: newStatus }).eq('id', itemId);
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

  const handleSaveContent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!id) return;
      const payload = {
        title: formData.title,
        date: formData.date,
        status: formData.status as ContentStatus,
        pillar: formData.pillar,
        type: formData.type,
        platform: formData.platform,
        priority: formData.priority,
        script: formData.script,
        pic: formData.pic,
        approval: formData.approval,
        content_link: formData.contentLink // Ensure SNAKE_CASE for DB
      };
      try {
        if (modalMode === 'create') {
            const { error } = await supabase.from('content_items').insert([{ workspace_id: id, ...payload }]);
            if (error) throw error;
        } else if (modalMode === 'edit' && editingId) {
            const { error } = await supabase.from('content_items').update(payload).eq('id', editingId);
            if (error) throw error;
        }
        setIsModalOpen(false);
        fetchData();
      } catch (error) {
          console.error("Error saving content:", error);
          alert("Gagal menyimpan konten.");
      }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData("taskId", id);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDropTask = async (e: React.DragEvent, newStatus: ContentStatus) => {
      const taskId = e.dataTransfer.getData("taskId");
      if (!taskId) return;
      const originalTasks = [...tasks];
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      try {
          const { error } = await supabase.from('content_items').update({ status: newStatus }).eq('id', taskId);
          if (error) throw error;
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
          if (file.size > 2 * 1024 * 1024) {
              alert("Ukuran file terlalu besar (Maks 2MB). Gunakan link eksternal untuk file besar.");
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

  if (loading) return <div className="flex justify-center h-full items-center"><Loader2 className="animate-spin text-slate-300"/></div>;
  if (errorState) return <div className="p-8 text-center text-red-500">{errorState}</div>;

  return (
    <>
        <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-240px)] min-h-[500px] space-y-4">
        {/* Header Section Updated */}
        <div className="flex flex-col lg:flex-row justify-between items-end gap-6 border-b-2 border-slate-100 pb-6 flex-shrink-0 w-full max-w-full pl-2 md:pl-4">
            {/* LEFT SIDE: Logo -> Info -> Name -> Members */}
            <div className="flex flex-col items-start gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/plan')}
                        className="p-2 rounded-lg border-2 border-slate-200 hover:border-slate-800 hover:bg-white transition-all group bg-white shadow-sm text-slate-400 hover:text-slate-800"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div className="relative group">
                        {workspaceData.logo_url ? (
                            <img src={workspaceData.logo_url} alt="Logo" className="h-24 w-auto md:h-32 object-contain" />
                        ) : (
                            <div className="h-24 w-24 md:h-32 md:w-32 bg-accent/20 rounded-3xl border-2 border-slate-200 shadow-hard flex items-center justify-center">
                                <Layers size={48} className="text-accent" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {workspaceData.platforms.map(p => (
                        <span key={p} className="px-3 py-1 bg-pink-100 border-2 border-pink-200 text-pink-700 font-black font-heading rounded-lg text-xs transform -rotate-2 shadow-sm inline-block">
                            {p === 'IG' ? 'Instagram' : p === 'TK' ? 'TikTok' : p === 'YT' ? 'YouTube' : p === 'LI' ? 'LinkedIn' : p}
                        </span>
                    ))}
                    {workspaceData.period && (
                        <span className="px-3 py-1 bg-yellow-100 border-2 border-yellow-200 text-yellow-700 font-black font-heading rounded-lg text-xs transform rotate-2 shadow-sm inline-block">
                            {new Date(workspaceData.period).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                        </span>
                    )}
                </div>

                <h2 className="text-5xl md:text-7xl font-extrabold text-slate-800 font-heading tracking-tight drop-shadow-sm leading-tight max-w-3xl">
                    {workspaceData.name}
                </h2>

                <div className="flex items-center gap-3">
                    <div className="flex -space-x-3">
                        {workspaceData.members && workspaceData.members.length > 0 ? (
                            workspaceData.members.map((m, i) => (
                                <img key={i} src={m} alt="User" className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-slate-200 object-cover" />
                            ))
                        ) : (
                                <div className="w-10 h-10 rounded-full border-2 border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400">
                                <User size={16}/>
                                </div>
                        )}
                        <button 
                            onClick={() => setIsInviteModalOpen(true)}
                            className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 hover:bg-accent hover:text-white text-slate-500 flex items-center justify-center transition-colors shadow-sm z-10"
                            title="Invite"
                        >
                            <UserPlus size={16} />
                        </button>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                        {workspaceData.members?.length || 1} Member(s)
                    </span>
                </div>
            </div>

            {/* RIGHT SIDE: Actions & Account Info */}
            <div className="flex flex-col items-end gap-3 w-full lg:w-auto mt-4 lg:mt-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button 
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button 
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <Table size={20} />
                        </button>
                    </div>

                    <Button 
                        icon={<Plus size={18}/>} 
                        className="whitespace-nowrap h-[46px]"
                        onClick={handleOpenCreateModal}
                    >
                        Konten Baru
                    </Button>
                </div>

                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Content Plan For</p>
                    <div className="bg-white border-2 border-slate-800 rounded-lg px-4 py-2 shadow-hard inline-block">
                        <h3 className="font-heading font-black text-lg text-accent flex items-center gap-2 justify-end">
                            {workspaceData.account_name || '@username'}
                            <CheckCircle size={16} className="fill-blue-500 text-white" />
                        </h3>
                    </div>
                </div>
            </div>
        </div>

        {/* Content Area */}
        {viewMode === 'kanban' ? (
            <div className="flex-1 w-full overflow-x-auto overflow-y-hidden pb-4 no-scrollbar">
                <div className="inline-flex h-full gap-6 items-start px-1">
                    {[ContentStatus.TODO, ContentStatus.IN_PROGRESS, ContentStatus.REVIEW, ContentStatus.SCHEDULED, ContentStatus.PUBLISHED].map(status => (
                        <KanbanColumn 
                            key={status}
                            status={status} 
                            items={tasks.filter(t => t.status === status)} 
                            textColor={
                                status === ContentStatus.TODO ? 'text-slate-400' :
                                status === ContentStatus.IN_PROGRESS ? 'text-accent' :
                                status === ContentStatus.REVIEW ? 'text-amber-500' :
                                status === ContentStatus.SCHEDULED ? 'text-secondary' : 'text-emerald-600'
                            }
                            onEdit={handleOpenEditModal}
                            onDelete={handleDeleteContent}
                            onDropTask={handleDropTask}
                            onDragStart={handleDragStart}
                            onCardClick={handleCardClick}
                        />
                    ))}
                    <div className="w-12 flex-shrink-0 h-full"></div>
                </div>
            </div>
        ) : (
            <div className="flex-1 w-full overflow-hidden flex flex-col pt-2 pb-6 px-1">
                 {/* Filter Control Bar (Only for Table View) */}
                 <div className="flex items-center gap-3 mb-4 px-1 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500 mr-2">
                        <Filter size={16} /> Filter:
                    </div>
                    
                    {/* All */}
                    <button 
                        onClick={() => { setFilterPlatform('all'); setFilterStatus('all'); }}
                        className={`px-4 py-1.5 rounded-full border-2 text-xs font-bold transition-all ${filterPlatform === 'all' && filterStatus === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'}`}
                    >
                        All
                    </button>

                    {/* Platform Dropdown */}
                    <div className="relative">
                         <select 
                            value={filterPlatform}
                            onChange={(e) => setFilterPlatform(e.target.value)}
                            className={`appearance-none pl-4 pr-8 py-1.5 rounded-full border-2 text-xs font-bold outline-none cursor-pointer transition-all ${filterPlatform !== 'all' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}
                         >
                            <option value="all">By Platform</option>
                            {Object.values(Platform).map(p => <option key={p} value={p}>{p}</option>)}
                         </select>
                         <ChevronDown size={14} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${filterPlatform !== 'all' ? 'text-purple-700' : 'text-slate-400'}`} />
                    </div>

                    {/* Status Dropdown */}
                    <div className="relative">
                         <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className={`appearance-none pl-4 pr-8 py-1.5 rounded-full border-2 text-xs font-bold outline-none cursor-pointer transition-all ${filterStatus !== 'all' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}
                         >
                            <option value="all">By Status</option>
                            {Object.values(ContentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                         </select>
                         <ChevronDown size={14} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${filterStatus !== 'all' ? 'text-blue-700' : 'text-slate-400'}`} />
                    </div>
                    
                    {/* Reset Indicator */}
                    {(filterPlatform !== 'all' || filterStatus !== 'all') && (
                        <button 
                            onClick={() => { setFilterPlatform('all'); setFilterStatus('all'); }}
                            className="text-xs text-red-500 font-bold hover:underline ml-2"
                        >
                            Reset
                        </button>
                    )}
                 </div>

                 {/* Table Container - Custom Scrollbar */}
                <div className="overflow-auto custom-scrollbar flex-1 pb-4">
                    <table className="w-full text-left border-separate border-spacing-y-3 px-1">
                         {/* Header */}
                        <thead className="sticky top-0 z-20">
                            <tr>
                                <th className="px-4 py-3 bg-slate-100 rounded-l-xl text-slate-500 text-xs font-bold uppercase tracking-wider whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider whitespace-nowrap">Platform</th>
                                <th className="px-4 py-3 bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                                <th className="px-4 py-3 bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider min-w-[200px]">Judul</th>
                                <th className="px-4 py-3 bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider whitespace-nowrap">Pillar</th>
                                <th className="px-4 py-3 bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider whitespace-nowrap text-center">Script</th>
                                <th className="px-4 py-3 bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider whitespace-nowrap">PIC</th>
                                <th className="px-4 py-3 bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider min-w-[150px]">Link Postingan</th>
                                <th className="px-4 py-3 bg-slate-100 rounded-r-xl text-slate-500 text-xs font-bold uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-transparent">
                            {filteredTableTasks.length > 0 ? (
                                filteredTableTasks.map((task) => (
                                    <tr 
                                        key={task.id} 
                                        className="bg-white group transition-all duration-200 hover:-translate-y-1 hover:shadow-hard shadow-sm rounded-xl relative"
                                    >
                                        {/* 1. Status (Interactive Dropdown) */}
                                        <td className="p-3 border-y border-l border-slate-200 rounded-l-xl first:border-l-2">
                                            <div className="relative">
                                                <select
                                                    value={task.status}
                                                    onChange={(e) => handleQuickUpdateStatus(task.id, e.target.value as ContentStatus)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={`appearance-none outline-none font-bold text-xs py-1.5 pl-3 pr-8 rounded-full border-2 cursor-pointer transition-colors w-full min-w-[120px] ${
                                                        task.status === ContentStatus.TODO ? 'bg-slate-50 border-slate-300 text-slate-600' :
                                                        task.status === ContentStatus.IN_PROGRESS ? 'bg-purple-50 border-purple-300 text-purple-700' :
                                                        task.status === ContentStatus.REVIEW ? 'bg-amber-50 border-amber-300 text-amber-700' :
                                                        task.status === ContentStatus.SCHEDULED ? 'bg-pink-50 border-pink-300 text-pink-700' :
                                                        'bg-emerald-50 border-emerald-300 text-emerald-700'
                                                    }`}
                                                >
                                                    {Object.values(ContentStatus).map((s) => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-500">
                                                    <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                                </div>
                                            </div>
                                        </td>

                                        {/* 2. Platform */}
                                        <td className="p-3 border-y border-slate-200" onClick={() => handleCardClick(task)}>
                                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border ${getPlatformBadgeStyle(task.platform)}`}>
                                                {getPlatformIcon(task.platform)}
                                                <span className="hidden xl:inline">{task.platform}</span>
                                            </div>
                                        </td>

                                        {/* 3. Tanggal */}
                                        <td className="p-3 border-y border-slate-200" onClick={() => handleCardClick(task)}>
                                            <div className="flex items-center gap-1.5 text-slate-600 font-bold text-xs whitespace-nowrap">
                                                <Calendar size={12} className="text-slate-400"/>
                                                {task.date ? new Date(task.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                                            </div>
                                        </td>

                                        {/* 4. Judul */}
                                        <td className="p-3 border-y border-slate-200 cursor-pointer" onClick={() => handleCardClick(task)}>
                                            <div className="font-bold text-slate-800 text-sm line-clamp-2 min-w-[150px]" title={task.title}>
                                                {task.title}
                                            </div>
                                            <div className="flex items-center gap-1 mt-1">
                                                 <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-1 rounded flex items-center gap-1">
                                                    {getTypeIcon(task.type)} {task.type}
                                                 </span>
                                            </div>
                                        </td>

                                        {/* 5. Pillar */}
                                        <td className="p-3 border-y border-slate-200" onClick={() => handleCardClick(task)}>
                                            {task.pillar ? (
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap ${getPillarStyle(task.pillar)}`}>
                                                    {task.pillar}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </td>

                                        {/* 6. Script Preview Button */}
                                        <td className="p-3 border-y border-slate-200 text-center">
                                            <button 
                                                onClick={() => handleCardClick(task)}
                                                className={`p-1.5 rounded-lg border-2 transition-colors ${task.script ? 'bg-yellow-50 border-yellow-200 text-yellow-600 hover:bg-yellow-100' : 'bg-slate-50 border-slate-200 text-slate-300'}`}
                                                title={task.script ? 'Lihat Script' : 'Belum ada script'}
                                            >
                                                <FileText size={16} />
                                            </button>
                                        </td>

                                        {/* 7. PIC */}
                                        <td className="p-3 border-y border-slate-200" onClick={() => handleCardClick(task)}>
                                            {task.pic ? (
                                                <div className="flex items-center gap-1.5" title={task.pic}>
                                                    <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold border border-slate-800 shadow-sm shrink-0">
                                                        {task.pic.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 truncate max-w-[80px]">{task.pic}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </td>

                                        {/* 8. Link Input (Interactive - Controlled) */}
                                        <td className="p-3 border-y border-slate-200">
                                            <div className="relative flex items-center group/input">
                                                <LinkIcon size={14} className={`absolute left-2 z-10 ${task.contentLink ? 'text-blue-500' : 'text-slate-300'}`} />
                                                <input 
                                                    type="text"
                                                    value={task.contentLink || ''} // CONTROLLED INPUT
                                                    placeholder="Paste Link..."
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        // Update Local State for typing
                                                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, contentLink: newVal } : t));
                                                    }}
                                                    onBlur={(e) => handleQuickUpdateLink(task.id, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleQuickUpdateLink(task.id, e.currentTarget.value);
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={`w-full bg-slate-50 border-2 border-slate-200 text-xs text-slate-700 rounded-lg pl-7 pr-2 py-1.5 outline-none focus:border-blue-400 focus:bg-white focus:shadow-sm transition-all placeholder:text-slate-300 ${task.contentLink ? 'font-medium' : ''}`}
                                                />
                                                {task.contentLink && (
                                                    <a 
                                                        href={task.contentLink} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="absolute right-2 text-slate-400 hover:text-blue-600 p-0.5"
                                                        title="Buka Link"
                                                    >
                                                        <ExternalLink size={12} />
                                                    </a>
                                                )}
                                            </div>
                                        </td>

                                        {/* 9. Action (Menu) */}
                                        <td className="p-3 border-y border-r border-slate-200 rounded-r-xl first:border-r-2 text-right relative">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveRowMenu(activeRowMenu === task.id ? null : task.id);
                                                }}
                                                className={`p-1.5 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors ${activeRowMenu === task.id ? 'bg-slate-100 text-slate-800' : ''}`}
                                            >
                                                <MoreHorizontal size={18} />
                                            </button>
                                            
                                            {/* Dropdown Menu */}
                                            {activeRowMenu === task.id && (
                                                <div className="absolute right-8 top-8 w-32 bg-white border-2 border-slate-800 rounded-lg shadow-hard z-50 overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setActiveRowMenu(null); handleOpenEditModal(task); }}
                                                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-bold text-slate-700 transition-colors"
                                                    >
                                                        <Edit size={14} className="text-accent" /> Edit
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setActiveRowMenu(null); handleDeleteContent(task.id); }}
                                                        className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-2 font-bold text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-slate-400 font-bold border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 mt-2 block w-full">
                                        Tidak ada konten yang ditemukan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- DETAIL MODAL --- */}
        {selectedTask && (
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Detail Konten"
                maxWidth="max-w-5xl"
            >
                <div className="space-y-8">
                    {/* Header: Title & Platform */}
                    <div className="flex flex-col-reverse md:flex-row md:items-start justify-between gap-4">
                        <h2 className="text-3xl md:text-5xl font-black font-heading text-slate-800 leading-tight">
                            {selectedTask.title}
                        </h2>
                        
                        <div className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold border-2 border-slate-900 shadow-hard -rotate-2 transform transition-transform hover:rotate-0 ${getPlatformBadgeStyle(selectedTask.platform)}`}>
                            <div className="flex items-center gap-2">
                                {getPlatformIcon(selectedTask.platform)}
                                <span>{selectedTask.platform}</span>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl flex flex-col justify-center items-center text-center hover:border-accent transition-colors">
                            <span className="text-[10px] font-bold text-slate-400 tracking-wider">Tanggal Posting</span>
                            <div className="font-bold text-slate-800 text-lg flex items-center gap-2 mt-1">
                                <Calendar size={18} className="text-slate-400"/>
                                {selectedTask.date ? new Date(selectedTask.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                            </div>
                         </div>
                         <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl flex flex-col justify-center items-center text-center hover:border-accent transition-colors">
                            <span className="text-[10px] font-bold text-slate-400 tracking-wider">Tipe Konten</span>
                            <div className="font-bold text-slate-800 text-lg flex items-center gap-2 mt-1">
                                {getTypeIcon(selectedTask.type)}
                                {selectedTask.type}
                            </div>
                         </div>
                         <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl flex flex-col justify-center items-center text-center hover:border-accent transition-colors">
                            <span className="text-[10px] font-bold text-slate-400 tracking-wider">Prioritas</span>
                             <div className={`mt-1 px-3 py-1 rounded-lg text-sm font-black tracking-wide border-2 ${
                                selectedTask.priority === ContentPriority.HIGH ? 'bg-red-100 border-red-300 text-red-600' : 
                                selectedTask.priority === ContentPriority.MEDIUM ? 'bg-amber-100 border-amber-300 text-amber-600' : 
                                'bg-slate-100 border-slate-300 text-slate-600'
                             }`}>
                                {selectedTask.priority}
                            </div>
                         </div>
                         <div className="bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl flex flex-col justify-center items-center text-center hover:border-accent transition-colors">
                            <span className="text-[10px] font-bold text-slate-400 tracking-wider">PIC / Creator</span>
                            <div className="font-bold text-slate-800 text-lg flex items-center gap-2 mt-1">
                                <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-[10px] border border-slate-900 shadow-sm">
                                    {selectedTask.pic ? selectedTask.pic.charAt(0).toUpperCase() : <User size={12}/>}
                                </div>
                                <span className="truncate max-w-[100px]">{selectedTask.pic || '-'}</span>
                            </div>
                         </div>
                    </div>

                    {/* Status & Tags */}
                    <div className="flex flex-wrap gap-3 items-center py-2 border-y-2 border-slate-100 border-dashed">
                        <span className="text-xs font-bold text-slate-400 tracking-wide mr-2">Quick Stats:</span>
                        
                        <div className={`px-4 py-1.5 rounded-full border-2 text-sm font-bold flex items-center gap-2 ${
                            selectedTask.status === ContentStatus.TODO ? 'bg-slate-100 border-slate-300 text-slate-600' :
                            selectedTask.status === ContentStatus.IN_PROGRESS ? 'bg-purple-100 border-purple-300 text-purple-700' :
                            selectedTask.status === ContentStatus.REVIEW ? 'bg-amber-100 border-amber-300 text-amber-700' :
                            selectedTask.status === ContentStatus.SCHEDULED ? 'bg-pink-100 border-pink-300 text-pink-700' :
                            'bg-emerald-100 border-emerald-300 text-emerald-700'
                        }`}>
                            <div className={`w-2 h-2 rounded-full ${
                                selectedTask.status === ContentStatus.PUBLISHED ? 'bg-emerald-500' : 'bg-current'
                            }`}></div>
                            {selectedTask.status}
                        </div>

                        {selectedTask.pillar && (
                            <div className="bg-yellow-50 border-2 border-yellow-200 text-yellow-700 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
                                <Hash size={14}/> {selectedTask.pillar}
                            </div>
                        )}

                        {selectedTask.approval && (
                            <div className="bg-blue-50 border-2 border-blue-200 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
                                <CheckCircle size={14}/> Acc: {selectedTask.approval}
                            </div>
                        )}
                    </div>

                    {/* Post Link Section */}
                    <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-xl flex items-center justify-between gap-4 transition-colors hover:border-blue-400 group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <LinkIcon size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">Link Postingan</p>
                                <p className="text-xs text-slate-500">
                                    {selectedTask.contentLink ? 'Klik tombol untuk melihat postingan.' : 'Belum ada link yang ditautkan.'}
                                </p>
                            </div>
                        </div>
                        {selectedTask.contentLink ? (
                             <a 
                                href={selectedTask.contentLink} 
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                            >
                                Buka Postingan <ExternalLink size={14} />
                            </a>
                        ) : (
                            <div className="px-4 py-2 bg-slate-200 text-slate-400 font-bold text-sm rounded-lg cursor-not-allowed select-none">
                                Belum Tersedia
                            </div>
                        )}
                    </div>

                    {/* Script / Notes Area */}
                    <div className="bg-[#FFFDF5] p-5 rounded-2xl border-2 border-slate-800 relative shadow-hard">
                        <div className="absolute top-[-15px] left-1/2 -translate-x-1/2 w-40 h-8 bg-yellow-300 -rotate-1 rounded-sm border-2 border-slate-800 flex items-center justify-center shadow-sm z-10">
                             <span className="font-bold text-xs font-heading text-slate-800">Brief / Script</span>
                        </div>
                        
                        <div className="text-slate-700 font-medium font-sans text-base min-h-[100px] overflow-hidden">
                            <RichTextRenderer text={(selectedTask as any).script} />
                        </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="pt-4 flex flex-col-reverse md:flex-row justify-between items-center gap-4">
                        <button 
                            onClick={() => handleDeleteContent(selectedTask.id)}
                            className="text-slate-400 hover:text-red-500 font-bold text-sm flex items-center gap-2 px-4 py-3 hover:bg-red-50 rounded-xl transition-colors w-full md:w-auto justify-center"
                        >
                            <Trash2 size={18}/> Hapus Konten
                        </button>
                        <div className="flex gap-4 w-full md:w-auto">
                            <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)} className="w-full md:w-auto">Tutup</Button>
                            <Button 
                                onClick={() => { setIsDetailModalOpen(false); handleOpenEditModal(selectedTask); }}
                                icon={<Edit size={18}/>}
                                className="w-full md:w-auto"
                            >
                                Edit Konten
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        )}

        {/* Modal Create/Edit Content */}
        <Modal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            title={modalMode === 'create' ? "✨ Buat Konten Baru" : "✏️ Edit Konten"}
        >
            <form onSubmit={handleSaveContent} className="space-y-6 pb-4">
                
                {/* 1. INFORMASI UTAMA */}
                <div className="bg-purple-50 p-5 rounded-2xl border-2 border-purple-800 shadow-[4px_4px_0px_0px_#8B5CF6] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-purple-200 rounded-bl-full opacity-50"></div>
                    <h4 className="font-heading font-black text-purple-900 flex items-center gap-2 mb-4 text-lg">
                        <FileText className="text-purple-600" /> Informasi Utama
                    </h4>
                    <div className="space-y-4 relative z-10">
                        <Input 
                            label="Judul Konten" 
                            placeholder="Contoh: Tutorial React 2024" 
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            required
                            className="border-purple-200 focus:border-purple-600 focus:shadow-none"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input 
                                label="Tanggal Posting" 
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                                required
                                className="border-purple-200 focus:border-purple-600"
                            />
                             <Select 
                                label="Platform"
                                value={formData.platform}
                                onChange={(e) => setFormData({...formData, platform: e.target.value as Platform})}
                                options={[
                                    { label: 'Instagram', value: Platform.INSTAGRAM },
                                    { label: 'TikTok', value: Platform.TIKTOK },
                                    { label: 'Threads', value: Platform.THREADS },
                                    { label: 'LinkedIn', value: Platform.LINKEDIN },
                                    { label: 'YouTube', value: Platform.YOUTUBE },
                                    { label: 'Facebook', value: Platform.FACEBOOK },
                                ]}
                                className="border-purple-200 focus:border-purple-600"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. DETAIL & JENIS */}
                <div className="bg-pink-50 p-5 rounded-2xl border-2 border-pink-700 shadow-[4px_4px_0px_0px_#BE185D] relative">
                     <div className="absolute bottom-0 left-0 w-12 h-12 bg-pink-200 rounded-tr-full rounded-bl-2xl opacity-50"></div>
                    <h4 className="font-heading font-black text-pink-900 flex items-center gap-2 mb-4 text-lg relative z-10">
                        <Film className="text-pink-600" /> Detail & Jenis
                    </h4>
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                         <CreatableSelect 
                            label="Jenis Konten"
                            value={formData.type}
                            onChange={(val) => setFormData({...formData, type: val})}
                            colorTheme="pink"
                            options={[
                                { label: 'Carousel', value: 'Carousel' },
                                { label: 'Reels / Video', value: 'Reels' },
                                { label: 'Single Image', value: 'Single Image' },
                                { label: 'Threads', value: 'Threads' },
                                { label: 'Story', value: 'Story' },
                            ]}
                            className="border-pink-200"
                        />
                        <Input 
                            label="Konten Pillar" 
                            placeholder="Edukasi, Hiburan..."
                            value={formData.pillar}
                            onChange={(e) => setFormData({...formData, pillar: e.target.value})}
                            className="border-pink-200 focus:border-pink-500 focus:shadow-none"
                        />
                    </div>
                </div>

                {/* 3. STATUS & PIC */}
                <div className="bg-yellow-50 p-5 rounded-2xl border-2 border-yellow-600 shadow-[4px_4px_0px_0px_#CA8A04] relative">
                    <h4 className="font-heading font-black text-yellow-900 flex items-center gap-2 mb-4 text-lg">
                        <CheckCircle className="text-yellow-600" /> Status & Tim
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <CreatableSelect 
                            label="Status"
                            value={formData.status}
                            onChange={(val) => setFormData({...formData, status: val})}
                            colorTheme="yellow"
                            options={Object.values(ContentStatus).map(s => ({ label: s, value: s }))}
                        />
                         <Select 
                            label="Prioritas"
                            value={formData.priority}
                            onChange={(e) => setFormData({...formData, priority: e.target.value as ContentPriority})}
                            options={[
                                { label: 'High 🔥', value: ContentPriority.HIGH },
                                { label: 'Medium ⚡', value: ContentPriority.MEDIUM },
                                { label: 'Low ☕', value: ContentPriority.LOW },
                            ]}
                            className="border-yellow-200 focus:border-yellow-500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                         <CreatableSelect 
                            label="PIC (Penanggung Jawab)" 
                            placeholder="Pilih atau ketik nama..."
                            value={formData.pic}
                            onChange={(val) => setFormData({...formData, pic: val})}
                            colorTheme="yellow"
                            options={TEAM_MEMBERS}
                            className="border-yellow-200"
                        />
                         <CreatableSelect 
                            label="Approval By" 
                            placeholder="Pilih atau ketik nama..."
                            value={formData.approval}
                            onChange={(val) => setFormData({...formData, approval: val})}
                            colorTheme="yellow"
                            options={TEAM_MEMBERS}
                            className="border-yellow-200"
                        />
                    </div>
                </div>

                {/* 4. SCRIPT & FILES */}
                <div className="bg-emerald-50 p-5 rounded-2xl border-2 border-emerald-700 shadow-[4px_4px_0px_0px_#059669]">
                    <label className="font-heading font-black text-emerald-900 text-sm mb-2 flex items-center gap-2">
                        <File className="text-emerald-600" /> Script / Resources
                    </label>

                    {/* NEW INPUT: Link Postingan */}
                    <div className="mb-3">
                         <Input 
                            label="Link Postingan (Opsional)" 
                            placeholder="https://instagram.com/p/..."
                            value={formData.contentLink}
                            onChange={(e) => setFormData({...formData, contentLink: e.target.value})}
                            className="border-emerald-200 focus:border-emerald-600"
                            icon={<ExternalLink size={16}/>}
                        />
                    </div>

                    <div className="flex gap-2">
                         <div className="flex-1 relative">
                            <LinkIcon className="absolute left-3 top-3.5 text-emerald-400" size={16} />
                            <input 
                                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-emerald-200 rounded-lg outline-none focus:border-emerald-500 transition-all placeholder:text-slate-400 font-medium text-emerald-900"
                                placeholder="Paste Link Dokumen / Brief disini..."
                                value={formData.script}
                                onChange={(e) => setFormData({...formData, script: e.target.value})}
                            />
                         </div>
                         <input 
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                         />
                         <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-12 h-[50px] flex items-center justify-center bg-white border-2 border-dashed border-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-100 hover:border-emerald-500 transition-colors group"
                            title="Upload File"
                         >
                             <Upload size={20} className="text-emerald-400 group-hover:text-emerald-700" />
                         </div>
                    </div>
                     <p className="text-[10px] text-emerald-600 mt-2 italic">* Upload file akan disimpan sebagai lampiran di dalam script (max 2MB).</p>
                </div>

                <div className="pt-4 border-t-2 border-slate-100 flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Batal</Button>
                    <Button type="submit" icon={<CheckCircle size={18}/>}>
                        {modalMode === 'create' ? 'Buat Konten' : 'Simpan Perubahan'}
                    </Button>
                </div>
            </form>
        </Modal>

        {/* Invite Code Modal - Unchanged */}
        <Modal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            title="Undang Member"
        >
             {/* Same as before... */}
             <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
                    <UserPlus size={32} className="text-accent"/>
                </div>
                <div>
                    <h4 className="font-bold text-xl text-slate-800">Kode Undangan Workspace</h4>
                    <p className="text-slate-500 text-sm mt-1">Bagikan kode ini kepada tim Anda untuk bergabung.</p>
                </div>

                {workspaceData.invite_code === 'SETUP-REQ' ? (
                     <div className="p-6 bg-red-50 border-2 border-dashed border-red-300 rounded-xl relative">
                        <p className="font-bold text-red-600 mb-2">Setup Database Diperlukan</p>
                        <p className="text-xs text-red-500">Kolom 'invite_code' belum ada di database.</p>
                    </div>
                ) : (
                    <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl relative group transition-colors hover:border-accent">
                        <p className="font-mono text-4xl font-bold tracking-widest text-slate-800 select-all">
                            {workspaceData.invite_code}
                        </p>
                    </div>
                )}

                <div className="space-y-3">
                    <Button onClick={handleCopyCode} disabled={workspaceData.invite_code === 'SETUP-REQ'} className="w-full" icon={copied ? <Check size={18}/> : <Copy size={18}/>}>
                        {copied ? 'Kode Disalin!' : 'Salin Kode'}
                    </Button>
                    <button 
                        onClick={handleRegenerateCode}
                        disabled={isRegenerating || workspaceData.invite_code === 'SETUP-REQ'}
                        className="text-slate-400 hover:text-red-500 text-xs font-bold flex items-center justify-center gap-1 mx-auto transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={12} className={isRegenerating ? "animate-spin" : ""} />
                        {isRegenerating ? 'Memperbarui...' : 'Generate Kode Baru'}
                    </button>
                </div>
            </div>
        </Modal>
    </>
  );
};