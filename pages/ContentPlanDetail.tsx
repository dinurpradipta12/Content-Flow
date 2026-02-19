import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea, CreatableSelect } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { 
  Plus, Calendar, Search, Filter, LayoutGrid, List, 
  MoreHorizontal, Edit, Trash2, CheckCircle, Clock, 
  AlertCircle, ChevronDown, ExternalLink, FileText, 
  Instagram, Linkedin, Youtube, Facebook, ArrowLeft,
  Link as LinkIcon, Image as ImageIcon, Video, User,
  MoreVertical, CheckSquare, MessageSquare, Heart, Eye, Share2, Sparkles, Loader2,
  Trash, ChevronUp
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { ContentItem, ContentStatus, Platform, ContentPriority } from '../types';
import { generateScript } from '../services/geminiService';

// --- HELPER FUNCTIONS ---

const getPlatformIcon = (platform: Platform | string) => {
    switch (platform) {
        case Platform.INSTAGRAM: return <Instagram size={14} />;
        case Platform.TIKTOK: return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>;
        case Platform.YOUTUBE: return <Youtube size={14} />;
        case Platform.LINKEDIN: return <Linkedin size={14} />;
        case Platform.FACEBOOK: return <Facebook size={14} />;
        default: return <MessageSquare size={14} />;
    }
};

const getPlatformBadgeStyle = (platform: Platform | string) => {
    switch (platform) {
        case Platform.INSTAGRAM: return 'bg-pink-50 text-pink-600 border-pink-200';
        case Platform.TIKTOK: return 'bg-slate-100 text-slate-800 border-slate-300';
        case Platform.YOUTUBE: return 'bg-red-50 text-red-600 border-red-200';
        case Platform.LINKEDIN: return 'bg-blue-50 text-blue-700 border-blue-200';
        case Platform.FACEBOOK: return 'bg-blue-50 text-blue-600 border-blue-200';
        default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
};

const getPillarStyle = (pillar: string) => {
    const hash = pillar.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = [
        'bg-purple-100 text-purple-700',
        'bg-blue-100 text-blue-700',
        'bg-green-100 text-green-700',
        'bg-yellow-100 text-yellow-700',
        'bg-pink-100 text-pink-700',
        'bg-indigo-100 text-indigo-700'
    ];
    return colors[hash % colors.length];
};

const getTypeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('video') || t.includes('reels') || t.includes('tiktok')) return <Video size={12}/>;
    if (t.includes('carousel') || t.includes('image') || t.includes('photo')) return <ImageIcon size={12}/>;
    return <FileText size={12}/>;
};

// --- KANBAN COMPONENT ---

interface KanbanColumnProps {
    status: ContentStatus;
    items: ContentItem[];
    textColor: string;
    onEdit: (item: ContentItem) => void;
    onDelete: (id: string) => void;
    onDropTask: (e: React.DragEvent, status: ContentStatus) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onCardClick: (item: ContentItem) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, items, textColor, onEdit, onDelete, onDropTask, onDragStart, onCardClick }) => {
    const isDragOver = useRef(false);

    return (
        <div 
            className="flex flex-col h-full min-w-[300px] w-[300px] bg-slate-100/50 rounded-2xl border-2 border-slate-200/60"
            onDragOver={(e) => { e.preventDefault(); isDragOver.current = true; }}
            onDragLeave={() => { isDragOver.current = false; }}
            onDrop={(e) => { isDragOver.current = false; onDropTask(e, status); }}
        >
            <div className={`p-4 font-black text-sm uppercase tracking-wide flex justify-between items-center ${textColor}`}>
                <span>{status}</span>
                <span className="bg-white px-2 py-0.5 rounded-full text-xs border border-slate-200 shadow-sm">{items.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 custom-scrollbar">
                {items.map((item) => (
                    <div 
                        key={item.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, item.id)}
                        onClick={() => onCardClick(item)}
                        className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm hover:shadow-hard hover:-translate-y-1 hover:border-slate-800 transition-all cursor-grab active:cursor-grabbing group relative"
                    >
                        <div className="flex justify-between items-start mb-2">
                             <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${getPlatformBadgeStyle(item.platform)}`}>
                                {getPlatformIcon(item.platform)}
                                {item.platform}
                             </span>
                             {item.priority === ContentPriority.HIGH && (
                                <span className="w-2 h-2 rounded-full bg-red-500" title="High Priority"></span>
                             )}
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm mb-2 line-clamp-2">{item.title}</h4>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                            {item.pillar && <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${getPillarStyle(item.pillar)}`}>{item.pillar}</span>}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold border border-slate-200 flex items-center gap-1">
                                {getTypeIcon(item.type)} {item.type}
                            </span>
                        </div>

                        <div className="flex justify-between items-end border-t border-slate-100 pt-3">
                             <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                                <Calendar size={12} />
                                {item.date ? new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                             </div>
                             {item.pic && (
                                 <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold" title={item.pic}>
                                     {item.pic.charAt(0).toUpperCase()}
                                 </div>
                             )}
                        </div>
                        
                        {/* Hover Actions */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                            >
                                <Edit size={12}/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---

export const ContentPlanDetail: React.FC = () => {
    const { id: workspaceId } = useParams();
    const navigate = useNavigate();

    // State
    const [tasks, setTasks] = useState<ContentItem[]>([]);
    const [workspaceName, setWorkspaceName] = useState('');
    const [workspaceMembers, setWorkspaceMembers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
    
    // Filters
    const [filterPlatform, setFilterPlatform] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Modals & UI
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<ContentItem | null>(null);
    const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'detail' | 'script' | 'metrics'>('detail');

    // Form State
    const [formData, setFormData] = useState<Partial<ContentItem>>({});
    const [isEditing, setIsEditing] = useState(false);

    // AI
    const [generatingScript, setGeneratingScript] = useState(false);

    useEffect(() => {
        if (workspaceId) fetchWorkspaceData();
    }, [workspaceId]);

    const fetchWorkspaceData = async () => {
        setLoading(true);
        try {
            // Get Workspace Info
            const { data: wsData, error: wsError } = await supabase
                .from('workspaces')
                .select('*')
                .eq('id', workspaceId)
                .single();
            
            if (wsError) throw wsError;
            setWorkspaceName(wsData.name);
            setWorkspaceMembers(wsData.members || []);

            // Get Content Items
            const { data: items, error: itemsError } = await supabase
                .from('content_items')
                .select('*')
                .eq('workspace_id', workspaceId)
                .order('date', { ascending: true });

            if (itemsError) throw itemsError;

            // Map and parse metrics if string (older data) or keep json
            const mappedItems: ContentItem[] = items.map((item: any) => ({
                ...item,
                contentLink: item.content_link, // map DB snake_case to camelCase
            }));
            
            setTasks(mappedItems);

        } catch (error) {
            console.error(error);
            alert("Gagal memuat data workspace.");
            navigate('/plan');
        } finally {
            setLoading(false);
        }
    };

    // --- CRUD HANDLERS ---

    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const taskData = {
                workspace_id: workspaceId,
                title: formData.title,
                pillar: formData.pillar,
                type: formData.type,
                platform: formData.platform,
                status: formData.status || ContentStatus.TODO,
                priority: formData.priority || ContentPriority.MEDIUM,
                date: formData.date,
                script: formData.script,
                pic: formData.pic,
                content_link: formData.contentLink // Save to DB column
            };

            if (isEditing && formData.id) {
                const { error } = await supabase
                    .from('content_items')
                    .update(taskData)
                    .eq('id', formData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('content_items')
                    .insert([taskData]);
                if (error) throw error;
            }

            setIsCreateModalOpen(false);
            fetchWorkspaceData(); // Refresh

        } catch (error) {
            console.error(error);
            alert("Gagal menyimpan task.");
        }
    };

    const handleDeleteContent = async (id: string) => {
        if (!confirm("Hapus konten ini?")) return;
        try {
            const { error } = await supabase.from('content_items').delete().eq('id', id);
            if (error) throw error;
            setTasks(prev => prev.filter(t => t.id !== id));
            setIsDetailModalOpen(false); // Close if open
        } catch (error) {
            alert("Gagal menghapus.");
        }
    };

    const handleQuickUpdateStatus = async (id: string, newStatus: ContentStatus) => {
        // Optimistic Update
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
        
        try {
            await supabase.from('content_items').update({ status: newStatus }).eq('id', id);
        } catch (e) {
            console.error("Failed to update status");
            fetchWorkspaceData(); // Revert on fail
        }
    };

    const handleQuickUpdateLink = async (id: string, newLink: string) => {
        // Find existing to avoid unnecessary updates if same
        const task = tasks.find(t => t.id === id);
        if(task && task.contentLink === newLink) return;

        setTasks(prev => prev.map(t => t.id === id ? { ...t, contentLink: newLink } : t));
        try {
            await supabase.from('content_items').update({ content_link: newLink }).eq('id', id);
        } catch(e) { console.error(e); }
    };

    // --- DRAG AND DROP ---
    
    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("taskId", id);
    };

    const handleDropTask = async (e: React.DragEvent, newStatus: ContentStatus) => {
        const taskId = e.dataTransfer.getData("taskId");
        if (!taskId) return;
        
        handleQuickUpdateStatus(taskId, newStatus);
    };

    // --- MODAL TRIGGERS ---

    const handleOpenCreateModal = () => {
        setIsEditing(false);
        setFormData({
            status: ContentStatus.TODO,
            priority: ContentPriority.MEDIUM,
            platform: Platform.INSTAGRAM,
            type: 'Reels',
            date: new Date().toISOString().split('T')[0]
        });
        setIsCreateModalOpen(true);
    };

    const handleOpenEditModal = (task: ContentItem) => {
        setIsEditing(true);
        setFormData(task);
        setIsCreateModalOpen(true);
    };

    const handleCardClick = (task: ContentItem) => {
        setSelectedTask(task);
        setActiveTab('detail');
        setIsDetailModalOpen(true);
    };

    const handleGenerateScript = async () => {
        if (!selectedTask) return;
        setGeneratingScript(true);
        try {
            const script = await generateScript(selectedTask.title, selectedTask.platform, selectedTask.type);
            // Save to DB immediately
            await supabase.from('content_items').update({ script }).eq('id', selectedTask.id);
            
            // Update Local
            const updated = { ...selectedTask, script };
            setSelectedTask(updated);
            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
            
        } catch (e) {
            alert("Gagal generate script.");
        } finally {
            setGeneratingScript(false);
        }
    };

    // --- FILTER LOGIC ---
    
    const filteredTableTasks = tasks.filter(t => {
        const matchPlatform = filterPlatform === 'all' || t.platform === filterPlatform;
        const matchStatus = filterStatus === 'all' || t.status === filterStatus;
        return matchPlatform && matchStatus;
    });

    const pillars = Array.from(new Set(tasks.map(t => t.pillar).filter(Boolean)));

    return (
        <div className="flex flex-col h-full -m-4 md:-m-8 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/plan')} className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black font-heading text-slate-800 flex items-center gap-2">
                            {workspaceName}
                            {loading && <Loader2 size={16} className="animate-spin text-slate-400"/>}
                        </h2>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-1">
                            <span>{tasks.length} Content Items</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <div className="flex -space-x-1">
                                {workspaceMembers.slice(0,5).map((m,i) => (
                                    <img key={i} src={m} className="w-5 h-5 rounded-full border border-white" alt="member"/>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-1 rounded-lg flex items-center">
                        <button 
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                    <Button icon={<Plus size={18}/>} onClick={handleOpenCreateModal}>Buat Konten</Button>
                </div>
            </div>

            {/* View Content */}
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
        
        {/* CREATE / EDIT MODAL */}
        <Modal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            title={isEditing ? 'Edit Konten' : 'Buat Konten Baru'}
        >
            <form onSubmit={handleSaveTask} className="space-y-4">
                <Input 
                    label="Judul Konten / Ide" 
                    placeholder="Contoh: Tips Produktivitas Harian" 
                    value={formData.title || ''}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                />
                
                <div className="grid grid-cols-2 gap-4">
                     <Select 
                        label="Platform"
                        value={formData.platform || Platform.INSTAGRAM}
                        onChange={(e) => setFormData({...formData, platform: e.target.value as Platform})}
                        options={Object.values(Platform).map(p => ({ label: p, value: p }))}
                    />
                    <Select 
                        label="Jenis Konten"
                        value={formData.type || 'Reels'}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        options={['Reels', 'Single Image', 'Carousel', 'Story', 'Thread', 'Video Long'].map(t => ({ label: t, value: t }))}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <CreatableSelect
                        label="Content Pillar"
                        value={formData.pillar || ''}
                        onChange={(val) => setFormData({...formData, pillar: val})}
                        options={pillars.map(p => ({ label: p, value: p }))}
                        placeholder="Pilih atau ketik..."
                     />
                     <Input 
                        label="Tanggal Tayang"
                        type="date"
                        value={formData.date || ''}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                     />
                </div>

                 <div className="grid grid-cols-2 gap-4">
                    <Select 
                        label="Prioritas"
                        value={formData.priority || ContentPriority.MEDIUM}
                        onChange={(e) => setFormData({...formData, priority: e.target.value as ContentPriority})}
                        options={Object.values(ContentPriority).map(p => ({ label: p, value: p }))}
                    />
                    <div className="flex flex-col gap-1 w-full">
                        <label className="font-bold text-xs text-slate-600 ml-1">PIC (Person In Charge)</label>
                        <select 
                             className="w-full bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none"
                             value={formData.pic || ''}
                             onChange={(e) => setFormData({...formData, pic: e.target.value})}
                        >
                            <option value="">Pilih Member...</option>
                            <option value="Aditya">Aditya (Me)</option>
                            {/* In real app, map from workspace members */}
                        </select>
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Batal</Button>
                    <Button type="submit">{isEditing ? 'Simpan Perubahan' : 'Buat Konten'}</Button>
                </div>
            </form>
        </Modal>

        {/* DETAIL MODAL */}
        {selectedTask && (
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Detail Konten"
                maxWidth="max-w-5xl"
            >
                 <div className="flex flex-col md:flex-row h-[500px] md:h-[600px] -m-6 md:-m-8">
                     {/* Sidebar Detail */}
                     <div className="w-full md:w-1/3 border-r-2 border-slate-100 bg-slate-50 p-6 flex flex-col gap-6 overflow-y-auto">
                        <div>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-2 border ${getPlatformBadgeStyle(selectedTask.platform)}`}>{selectedTask.platform}</span>
                            <h2 className="text-xl font-black font-heading text-slate-800 leading-tight">{selectedTask.title}</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><Calendar size={20}/></div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400">Jadwal Tayang</p>
                                    <p className="font-bold text-slate-800">{selectedTask.date ? new Date(selectedTask.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Belum dijadwalkan'}</p>
                                </div>
                            </div>
                             
                             <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
                                     <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Status</p>
                                     <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${selectedTask.status === ContentStatus.PUBLISHED ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{selectedTask.status}</span>
                                </div>
                                <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
                                     <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Type</p>
                                     <span className="font-bold text-slate-700 text-sm">{selectedTask.type}</span>
                                </div>
                             </div>

                             <div>
                                 <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 ml-1">Assigned To</p>
                                 <div className="flex items-center gap-2">
                                     <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold border-2 border-slate-800">{selectedTask.pic ? selectedTask.pic.charAt(0) : '?'}</div>
                                     <span className="font-bold text-slate-700">{selectedTask.pic || 'Unassigned'}</span>
                                 </div>
                             </div>

                             <div className="mt-auto pt-6">
                                <Button 
                                    className="w-full bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-red-500 hover:border-red-300" 
                                    icon={<Trash2 size={16}/>}
                                    onClick={() => handleDeleteContent(selectedTask.id)}
                                >
                                    Hapus Konten
                                </Button>
                             </div>
                        </div>
                     </div>

                     {/* Main Content Area */}
                     <div className="flex-1 flex flex-col bg-white overflow-hidden">
                         {/* Tabs */}
                         <div className="flex items-center border-b border-slate-200 px-6 pt-4 gap-6">
                             <button onClick={() => setActiveTab('detail')} className={`pb-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'detail' ? 'text-accent border-accent' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>Content Script</button>
                             <button onClick={() => setActiveTab('metrics')} className={`pb-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'metrics' ? 'text-accent border-accent' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>Metrics & Links</button>
                         </div>
                         
                         <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                            {activeTab === 'detail' && (
                                <div className="h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><FileText size={18}/> Script / Caption</h3>
                                        <Button size="sm" onClick={handleGenerateScript} disabled={generatingScript} icon={generatingScript ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>}>
                                            {generatingScript ? 'Magic Writing...' : 'Generate with AI'}
                                        </Button>
                                    </div>
                                    <textarea 
                                        className="flex-1 w-full bg-white border-2 border-slate-200 rounded-xl p-4 text-slate-700 font-medium leading-relaxed outline-none focus:border-accent resize-none custom-scrollbar"
                                        placeholder="Tulis script konten, caption, atau ide kasar disini..."
                                        value={selectedTask.script || ''}
                                        onChange={async (e) => {
                                            const val = e.target.value;
                                            setSelectedTask({ ...selectedTask, script: val });
                                        }}
                                        onBlur={async () => {
                                            // Auto save on blur
                                            await supabase.from('content_items').update({ script: selectedTask.script }).eq('id', selectedTask.id);
                                        }}
                                    />
                                    <p className="text-xs text-slate-400 mt-2 text-right">Perubahan disimpan otomatis saat Anda klik di luar area ketik.</p>
                                </div>
                            )}

                            {activeTab === 'metrics' && (
                                <div className="space-y-6">
                                     <div className="bg-white p-6 rounded-xl border-2 border-slate-200">
                                         <label className="font-bold text-xs text-slate-500 mb-2 block">Link Postingan (Published URL)</label>
                                         <div className="flex gap-2">
                                             <Input 
                                                value={selectedTask.contentLink || ''} 
                                                onChange={(e) => setSelectedTask({...selectedTask, contentLink: e.target.value})}
                                                onBlur={(e) => handleQuickUpdateLink(selectedTask.id, e.target.value)}
                                                placeholder="https://instagram.com/..."
                                                icon={<LinkIcon size={16}/>}
                                             />
                                             {selectedTask.contentLink && (
                                                 <a href={selectedTask.contentLink} target="_blank" rel="noreferrer" className="px-4 flex items-center justify-center bg-slate-100 border-2 border-slate-200 rounded-lg text-slate-600 hover:bg-slate-200">
                                                     <ExternalLink size={20} />
                                                 </a>
                                             )}
                                         </div>
                                     </div>

                                     {selectedTask.metrics ? (
                                         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="bg-white p-4 rounded-xl border-2 border-slate-200 text-center">
                                                <div className="text-slate-400 mb-1"><Eye size={20} className="mx-auto"/></div>
                                                <div className="text-2xl font-black text-slate-800">{selectedTask.metrics.views.toLocaleString()}</div>
                                                <div className="text-[10px] font-bold uppercase text-slate-400">Views</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border-2 border-slate-200 text-center">
                                                <div className="text-pink-500 mb-1"><Heart size={20} className="mx-auto"/></div>
                                                <div className="text-2xl font-black text-slate-800">{selectedTask.metrics.likes.toLocaleString()}</div>
                                                <div className="text-[10px] font-bold uppercase text-slate-400">Likes</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border-2 border-slate-200 text-center">
                                                <div className="text-blue-500 mb-1"><MessageSquare size={20} className="mx-auto"/></div>
                                                <div className="text-2xl font-black text-slate-800">{selectedTask.metrics.comments.toLocaleString()}</div>
                                                <div className="text-[10px] font-bold uppercase text-slate-400">Comments</div>
                                            </div>
                                             <div className="bg-white p-4 rounded-xl border-2 border-slate-200 text-center">
                                                <div className="text-green-500 mb-1"><Share2 size={20} className="mx-auto"/></div>
                                                <div className="text-2xl font-black text-slate-800">{selectedTask.metrics.shares.toLocaleString()}</div>
                                                <div className="text-[10px] font-bold uppercase text-slate-400">Shares</div>
                                            </div>
                                         </div>
                                     ) : (
                                         <div className="h-40 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400">
                                             <p className="font-bold">Belum ada data metrics.</p>
                                             <p className="text-sm">Pastikan link sudah diisi dan dianalisa di menu Insight.</p>
                                         </div>
                                     )}
                                </div>
                            )}
                         </div>
                     </div>
                 </div>
            </Modal>
        )}
    </div>
    );
};
