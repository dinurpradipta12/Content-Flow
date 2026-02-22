import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
    MessageSquare,
    X,
    Users,
    Send,
    Smile,
    Reply,
    Check,
    CheckCheck,
    Plus,
    Search,
    ChevronRight,
    AtSign,
    Edit2,
    Image as ImageIcon,
    MoreVertical,
    Sidebar as SidebarIcon,
    Filter,
    ChevronLeft,
    Quote,
    Camera,
    Paperclip,
    Download,
    Maximize2,
    PlusCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useNotifications } from '../components/NotificationProvider';

interface Workspace {
    id: string;
    name: string;
    color?: string;
    members: string[];
    admin_id: string;
    logo_url?: string;
}

interface ChatGroup {
    id: string;
    name: string;
    workspace_id: string;
    icon?: string;
    created_by: string;
}

interface ChatMessage {
    id: string;
    group_id: string;
    sender_id: string;
    sender_name: string;
    sender_avatar: string;
    content: string;
    type: string;
    reply_to_id?: string;
    metadata: any;
    created_at: string;
    read_by?: string[]; // user ids
    reactions?: any[];
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🙏', '💯', '✅', '🚀', '✨', '🙌'];

export const Messages: React.FC = () => {
    // Current User Info
    const currentUser = {
        id: localStorage.getItem('user_id') || '',
        name: localStorage.getItem('user_name') || 'Guest',
        avatar: localStorage.getItem('user_avatar') || '',
        role: localStorage.getItem('user_role') || 'Member'
    };

    // State
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [groups, setGroups] = useState<ChatGroup[]>([]);
    const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [showWsSidebar, setShowWsSidebar] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);

    // UI Helpers
    const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // message_id or 'input'
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupIcon, setNewGroupIcon] = useState<string | null>(null);
    const [uploadingGroupIcon, setUploadingGroupIcon] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    // Navigation
    const navigate = useNavigate();

    // Refs for real-time callbacks
    const activeGroupRef = useRef<ChatGroup | null>(null);
    const selectedWorkspaceRef = useRef<Workspace | null>(null);
    const workspacesRef = useRef<Workspace[]>([]);
    const currentUserRef = useRef(currentUser);
    const messagesRef = useRef<ChatMessage[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const groupIconRef = useRef<HTMLInputElement>(null);

    const { sendNotification } = useNotifications();

    // Sync refs
    useEffect(() => { activeGroupRef.current = activeGroup; }, [activeGroup]);
    useEffect(() => { selectedWorkspaceRef.current = selectedWorkspace; }, [selectedWorkspace]);
    useEffect(() => { workspacesRef.current = workspaces; }, [workspaces]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);

    // 1. Init
    useEffect(() => {
        fetchWorkspaces();
    }, []);

    // 2. Workspace Selection Change
    useEffect(() => {
        if (selectedWorkspace) {
            fetchGroups(selectedWorkspace.id);
            fetchWorkspaceMembers(selectedWorkspace);
            setUnreadCounts(prev => ({ ...prev, [selectedWorkspace.id]: 0 }));
        }
    }, [selectedWorkspace]);

    // 3. Group Selection Change
    useEffect(() => {
        if (activeGroup) {
            fetchMessages(activeGroup.id);
        }
    }, [activeGroup]);

    // 4. Scroll to Bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchWorkspaces = async () => {
        const userId = currentUser.id;
        const avatar = currentUser.avatar;
        const { data } = await supabase.from('workspaces').select('*');
        if (data) {
            const myWorkspaces = data.filter(ws =>
                ws.admin_id === userId || (ws.members && ws.members.includes(avatar))
            );
            setWorkspaces(myWorkspaces);
            setupGlobalRealtime(myWorkspaces);
            if (myWorkspaces.length > 0) setSelectedWorkspace(myWorkspaces[0]);
            setIsLoaded(true);
        }
    };

    const fetchGroups = async (wsId: string) => {
        const { data } = await supabase.from('workspace_chat_groups').select('*').eq('workspace_id', wsId);
        if (data) {
            setGroups(data);
            if (data.length > 0) setActiveGroup(data[0]);
        }
    };

    const fetchWorkspaceMembers = async (ws: Workspace) => {
        const { data: userData } = await supabase.from('app_users').select('id, full_name, avatar_url, role');
        if (userData) {
            const members = userData.filter(u => ws.members.includes(u.avatar_url) || u.id === ws.admin_id);
            setWorkspaceMembers(members);
        }
    };

    const fetchMessages = async (groupId: string) => {
        const { data } = await supabase
            .from('workspace_chat_messages')
            .select('*')
            .eq('group_id', groupId)
            .order('created_at', { ascending: true });

        if (data) {
            // Fetch reads
            const { data: reads } = await supabase.from('workspace_chat_reads').select('message_id, user_id').eq('group_id', groupId);
            // Fetch reactions
            const { data: reactions } = await supabase.from('workspace_chat_reactions').select('*').eq('group_id', groupId);

            const messagesWithExtras = data.map(msg => ({
                ...msg,
                read_by: reads?.filter(r => r.message_id === msg.id).map(r => r.user_id) || [],
                reactions: reactions?.filter(r => r.message_id === msg.id) || []
            }));

            setMessages(messagesWithExtras);
            markMessagesAsRead(data.map(m => m.id), groupId);
        }
    };

    const markMessagesAsRead = async (msgIds: string[], groupId: string) => {
        if (msgIds.length === 0) return;
        const reads = msgIds.map(id => ({ message_id: id, user_id: currentUserRef.current.id, group_id: groupId }));
        await supabase.from('workspace_chat_reads').upsert(reads, { onConflict: 'message_id,user_id' });
    };

    const setupGlobalRealtime = (wsList: Workspace[]) => {
        supabase.removeAllChannels();
        wsList.forEach(ws => {
            supabase.channel(`chat_ws:${ws.id}`)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workspace_chat_messages' },
                    (payload) => handleNewMessage(payload.new as ChatMessage, ws.id))
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workspace_chat_reads' },
                    (payload) => handleNewRead(payload.new))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_chat_reactions' },
                    (payload) => handleReactionChange(payload))
                .subscribe();
        });
    };

    const handleNewRead = (newRead: any) => {
        setMessages(prev => prev.map(msg =>
            msg.id === newRead.message_id
                ? { ...msg, read_by: Array.from(new Set([...(msg.read_by || []), newRead.user_id])) }
                : msg
        ));
    };

    const handleReactionChange = (payload: any) => {
        if (payload.eventType === 'INSERT') {
            const reaction = payload.new;
            setMessages(prev => prev.map(msg =>
                msg.id === reaction.message_id
                    ? { ...msg, reactions: [...(msg.reactions || []), reaction] }
                    : msg
            ));

            // Notification for reaction
            if (reaction.user_id !== currentUserRef.current.id) {
                const msg = messagesRef.current.find(m => m.id === reaction.message_id);
                if (msg && msg.sender_id === currentUserRef.current.id) {
                    // Only notify if someone reacts to MY message
                    sendNotification({
                        recipientId: currentUserRef.current.id,
                        type: 'REACTION',
                        title: `Reaksi baru`,
                        content: `Seseorang memberikan reaksi ${reaction.emoji} pada pesan Anda`,
                        metadata: { message_id: reaction.message_id }
                    });
                }
            }
        } else if (payload.eventType === 'DELETE') {
            const reaction = payload.old;
            setMessages(prev => prev.map(msg =>
                msg.id === reaction.message_id
                    ? { ...msg, reactions: (msg.reactions || []).filter(r => r.id !== reaction.id) }
                    : msg
            ));
        }
    };

    const handleNewMessage = (msg: ChatMessage, wsId: string) => {
        const isActiveGroup = activeGroupRef.current?.id === msg.group_id;
        if (isActiveGroup) {
            setMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, { ...msg, read_by: [], reactions: [] }];
            });
            markMessagesAsRead([msg.id], msg.group_id);
        } else {
            setUnreadCounts(prev => ({ ...prev, [wsId]: (prev[wsId] || 0) + 1 }));
        }

        // Mention Notification Logic
        if (msg.sender_id !== currentUserRef.current.id) {
            if (msg.content.includes(`@${currentUserRef.current.name}`) || msg.content.includes(`@everyone`)) {
                const wsName = workspacesRef.current.find(w => w.id === wsId)?.name || 'Workspace';
                sendNotification({
                    recipientId: currentUserRef.current.id,
                    type: 'MENTION',
                    title: `Disebut di ${wsName}`,
                    content: `${msg.sender_name}: ${msg.content}`,
                    metadata: { workspace_id: wsId, group_id: msg.group_id }
                });
            }
        }
    };

    const handleSendMessage = async (fileUrl?: string, fileType?: string) => {
        if (!input.trim() && !fileUrl) return;
        if (!activeGroup || !selectedWorkspace) return;

        const content = input;
        const msgType = fileType || (content.includes('@') ? 'mention' : 'text');

        const tempId = `temp-${Date.now()}`;
        const optimisticMsg: ChatMessage = {
            id: tempId,
            group_id: activeGroup.id,
            sender_id: currentUser.id,
            sender_name: currentUser.name,
            sender_avatar: currentUser.avatar,
            content: fileUrl || content,
            type: msgType,
            reply_to_id: replyTo?.id,
            metadata: {
                reply_to: replyTo ? { name: replyTo.sender_name, content: replyTo.content } : null,
                original_text: fileUrl ? content : undefined
            },
            created_at: new Date().toISOString(),
            read_by: [currentUser.id],
            reactions: []
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setInput('');
        setReplyTo(null);

        const { data } = await supabase.from('workspace_chat_messages').insert({
            group_id: optimisticMsg.group_id,
            sender_id: optimisticMsg.sender_id,
            sender_name: optimisticMsg.sender_name,
            sender_avatar: optimisticMsg.sender_avatar,
            content: optimisticMsg.content,
            type: optimisticMsg.type,
            reply_to_id: optimisticMsg.reply_to_id,
            metadata: optimisticMsg.metadata
        }).select().single();

        if (data) {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...data, read_by: [currentUser.id], reactions: [] } : m));
            markMessagesAsRead([data.id], activeGroup.id);

            // Mentions logic
            if (content.includes('@')) {
                const mentions = content.match(/@(\w+)/g);
                if (mentions) {
                    for (const m of mentions) {
                        const name = m.slice(1);
                        const user = workspaceMembers.find(u => u.full_name.toLowerCase().includes(name.toLowerCase()));
                        if (user && user.id !== currentUser.id) {
                            await sendNotification({
                                recipientId: user.id,
                                type: 'MENTION',
                                title: `${currentUser.name} menyebut anda di ${selectedWorkspace.name}`,
                                content: content,
                                metadata: { workspace_id: selectedWorkspace.id }
                            });
                        }
                    }
                }
            }
        }
    };

    const handleAddReaction = async (messageId: string, emoji: string) => {
        setShowEmojiPicker(null);
        const { error } = await supabase.from('workspace_chat_reactions').insert({
            message_id: messageId,
            user_id: currentUser.id,
            emoji,
            group_id: activeGroup?.id
        });
        if (error && error.code === '23505') {
            // Already reacted, remove it
            await supabase.from('workspace_chat_reactions')
                .delete()
                .eq('message_id', messageId)
                .eq('user_id', currentUser.id)
                .eq('emoji', emoji);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeGroup) return;

        setUploadingFile(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `chat/${activeGroup.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('content')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('content')
                .getPublicUrl(filePath);

            const type = file.type.startsWith('image/') ? 'image' : 'file';
            handleSendMessage(publicUrl, type);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Gagal mengupload file.');
        } finally {
            setUploadingFile(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || !selectedWorkspace) return;

        const { data, error } = await supabase.from('workspace_chat_groups').insert({
            name: newGroupName,
            workspace_id: selectedWorkspace.id,
            icon: newGroupIcon || 'users',
            created_by: currentUser.id
        }).select().single();

        if (data) {
            fetchGroups(selectedWorkspace.id);
            setShowGroupModal(false);
            setNewGroupName('');
            setNewGroupIcon(null);
        }
    };

    const handleGroupIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingGroupIcon(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `group-icon-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('content')
                .upload(`icons/${fileName}`, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('content')
                .getPublicUrl(`icons/${fileName}`);

            setNewGroupIcon(publicUrl);
        } catch (error) {
            console.error('Error group icon upload:', error);
        } finally {
            setUploadingGroupIcon(false);
        }
    };

    const handleInputChange = (val: string) => {
        setInput(val);
        const parts = val.split('@');
        if (val.endsWith('@')) { setShowMentionList(true); setMentionSearch(''); }
        else if (showMentionList) { setMentionSearch(parts[parts.length - 1]); if (val.endsWith(' ')) setShowMentionList(false); }
        else setShowMentionList(false);
    };

    if (!isLoaded) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">Memuat Pesan...</div>;

    return (
        <div className="flex bg-white rounded-[40px] border-4 border-slate-900 shadow-hard h-[calc(100vh-140px)] overflow-hidden">
            {/* Workspace Sidebar */}
            <div className={`bg-slate-50 border-r-4 border-slate-900 flex flex-col items-center py-8 gap-6 transition-all duration-500 ease-in-out ${showWsSidebar ? 'w-24' : 'w-0 opacity-0 -translate-x-full overflow-hidden'}`}>
                {workspaces.map(ws => (
                    <button
                        key={ws.id}
                        onClick={() => setSelectedWorkspace(ws)}
                        className={`w-14 h-14 rounded-2xl border-4 transition-all relative group flex flex-col items-center justify-center bg-white ${selectedWorkspace?.id === ws.id ? 'border-accent shadow-hard-mini scale-110' : 'border-slate-200 hover:border-slate-900 shadow-none'}`}
                    >
                        <div className="w-10 h-10 overflow-hidden rounded-xl flex items-center justify-center">
                            {ws.logo_url ? <img src={ws.logo_url} className="w-full h-full object-contain" /> : <span className="font-black text-xs text-slate-400">{ws.name.substring(0, 2).toUpperCase()}</span>}
                        </div>
                        <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded whitespace-nowrap z-50">
                            {ws.name}
                        </div>
                        {unreadCounts[ws.id] > 0 && <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-slate-900 animate-bounce">{unreadCounts[ws.id]}</div>}
                    </button>
                ))}
                <button
                    onClick={() => navigate('/admin/workspace')}
                    className="w-14 h-14 rounded-2xl border-4 border-dashed border-slate-300 flex items-center justify-center text-slate-300 hover:border-slate-900 hover:text-slate-900 transition-all shrink-0"
                >
                    <PlusCircle size={24} />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative bg-white min-w-0">
                {/* Header */}
                <div className="h-24 border-b-4 border-slate-900 flex items-center justify-between px-10 bg-white shrink-0 shadow-sm relative z-10">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setShowWsSidebar(!showWsSidebar)}
                            className={`p-3 rounded-2xl border-2 border-slate-900 transition-all ${showWsSidebar ? 'bg-slate-50 text-slate-400' : 'bg-accent text-white shadow-hard-mini -translate-x-2'}`}
                        >
                            {showWsSidebar ? <ChevronLeft size={22} /> : <SidebarIcon size={22} />}
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-slate-900 shadow-hard-mini">
                                <MessageSquare className="text-accent" size={24} />
                            </div>
                            <div>
                                <h2 className="font-black text-2xl text-slate-900 uppercase tracking-tighter truncate max-w-[300px] leading-none mb-1">{selectedWorkspace?.name}</h2>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        #{activeGroup?.name || 'GENERAL'} <span className="mx-2">•</span> {workspaceMembers.length} Tim Aktif
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Inner Sidebar */}
                    <div className="w-72 border-r-4 border-slate-900 bg-slate-50 p-8 flex flex-col shrink-0 gap-10">
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Daftar Group</h4>
                                <button
                                    onClick={() => setShowGroupModal(true)}
                                    className="w-8 h-8 bg-accent text-white rounded-xl border-2 border-slate-900 flex items-center justify-center hover:-translate-y-1 transition-all shadow-hard-mini"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="space-y-2">
                                {groups.map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => setActiveGroup(g)}
                                        className={`w-full p-4 rounded-[20px] flex items-center gap-3 border-4 transition-all ${activeGroup?.id === g.id ? 'border-accent bg-white shadow-hard-mini translate-x-2' : 'border-transparent text-slate-500 hover:bg-white hover:border-slate-200'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl border-2 border-slate-900 flex items-center justify-center shrink-0 overflow-hidden ${activeGroup?.id === g.id ? 'bg-accent text-white' : 'bg-slate-100'}`}>
                                            {g.icon && g.icon.startsWith('http') ? <img src={g.icon} className="w-full h-full object-cover" /> : <Users size={18} />}
                                        </div>
                                        <span className={`text-sm tracking-tight truncate ${activeGroup?.id === g.id ? 'font-black text-slate-900' : 'font-bold'}`}>{g.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic mb-6">Anggota Tim</h4>
                            <div className="space-y-4">
                                {workspaceMembers.map(m => (
                                    <div key={m.id} className="flex items-center gap-3 group">
                                        <div className="relative shrink-0">
                                            <img src={m.avatar_url} className="w-10 h-10 rounded-xl border-2 border-slate-900 group-hover:scale-105 transition-transform" />
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-slate-900 truncate leading-none mb-1">{m.full_name}</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{m.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-[radial-gradient(#f1f5f9_1px,transparent_1px)]" style={{ backgroundSize: '30px 30px' }}>
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender_id === currentUser.id;
                                const replyParent = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) || msg.metadata?.reply_to : null;

                                return (
                                    <div key={msg.id} className={`flex items-start gap-4 ${isMe ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                                        {/* FOTO */}
                                        <img src={msg.sender_avatar} className="w-12 h-12 rounded-[18px] border-[3px] border-slate-900 shrink-0 shadow-hard-mini" />

                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0 max-w-[70%]`}>
                                            {/* NAMA */}
                                            <span className="font-black text-xs text-slate-900 uppercase tracking-tighter mb-1.5 px-0.5">{msg.sender_name}</span>

                                            {replyParent && (
                                                <div className={`mb-2 p-3 bg-slate-50 border-l-4 border-accent rounded-xl text-[10px] font-bold text-slate-500 flex items-start gap-3 shadow-sm ${isMe ? 'mr-0' : 'ml-0'}`}>
                                                    <Quote size={12} className="shrink-0 text-accent opacity-50" />
                                                    <span className="truncate italic">
                                                        <span className="text-accent font-black not-italic uppercase tracking-tighter">@{replyParent.sender_name || replyParent.name}:</span> {replyParent.content}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="group relative flex items-end gap-2">
                                                {/* BUBBLE */}
                                                <div className={`shadow-hard-mini rounded-[24px] overflow-hidden border-2 border-slate-900 transition-all hover:scale-[1.01] ${isMe ? 'bg-accent text-white rounded-tr-none order-2' : 'bg-white text-slate-800 rounded-tl-none order-1'}`}>
                                                    {msg.type === 'image' ? (
                                                        <div className="p-1">
                                                            <div className="relative group/img overflow-hidden rounded-[20px] cursor-pointer" onClick={() => setPreviewImage(msg.content)}>
                                                                <img src={msg.content} className="max-w-md max-h-[400px] w-full object-cover transition-transform group-hover/img:scale-105" />
                                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-all">
                                                                    <Maximize2 className="text-white" size={32} />
                                                                </div>
                                                            </div>
                                                            {msg.metadata?.original_text && <p className="p-3 text-sm font-bold">{msg.metadata.original_text}</p>}
                                                        </div>
                                                    ) : msg.type === 'file' ? (
                                                        <div className="p-4 flex items-center gap-4 min-w-[200px]">
                                                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center border-2 border-white/20">
                                                                <Paperclip size={24} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-black truncate">{msg.content.split('/').pop()}</p>
                                                                <p className="text-[10px] font-bold opacity-70">Dokumen File</p>
                                                            </div>
                                                            <a href={msg.content} target="_blank" className="p-2 bg-white/20 rounded-lg hover:bg-white/40 transition-all"><Download size={18} /></a>
                                                        </div>
                                                    ) : (
                                                        <div className="p-5 text-[15px] font-bold leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                                                    )}
                                                </div>

                                                {/* CENTANG (KECIL) next to bubble for me */}
                                                {isMe && (
                                                    <div className="mb-2 order-1 opacity-50">
                                                        {msg.read_by && msg.read_by.length > 1 ? <CheckCheck size={14} className="text-blue-500" /> : <Check size={14} className="text-slate-400" />}
                                                    </div>
                                                )}

                                            </div>

                                            {/* TIME BELOW BUBBLE */}
                                            <div className={`mt-2 text-[9px] font-black uppercase tracking-widest text-slate-300 ${isMe ? 'text-right' : 'text-left'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>

                                            {/* REACTIONS */}
                                            {msg.reactions && msg.reactions.length > 0 && (
                                                <div className={`mt-2 flex flex-wrap gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    {Object.entries(msg.reactions.reduce((acc: any, r) => {
                                                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                                        return acc;
                                                    }, {})).map(([emoji, count]: [string, any]) => (
                                                        <button
                                                            key={emoji}
                                                            onClick={() => handleAddReaction(msg.id, emoji)}
                                                            className="flex items-center gap-1.5 px-2.5 py-1 bg-white border-2 border-slate-300 rounded-full text-xs hover:border-accent transition-all animate-in zoom-in-50"
                                                        >
                                                            <span>{emoji}</span>
                                                            <span className="font-black text-[10px] text-slate-400">{count}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Reaction Menu */}
                                            <div className={`absolute -top-12 ${isMe ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 bg-white border-2 border-slate-900 p-2 rounded-2xl shadow-hard z-30`}>
                                                <button onClick={() => setReplyTo(msg)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-accent transition-all" title="Reply"><Reply size={16} /></button>
                                                <div className="w-px h-5 bg-slate-100 mx-1" />
                                                <div className="flex gap-1">
                                                    {COMMON_EMOJIS.slice(0, 5).map(emoji => (
                                                        <button key={emoji} onClick={() => handleAddReaction(msg.id, emoji)} className="text-xl hover:scale-125 transition-transform px-1">{emoji}</button>
                                                    ))}
                                                    <button onClick={() => setShowEmojiPicker(msg.id)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"><Plus size={14} /></button>
                                                </div>
                                                {showEmojiPicker === msg.id && (
                                                    <div className="absolute top-full mt-2 left-0 bg-white border-4 border-slate-900 rounded-[24px] shadow-hard p-4 grid grid-cols-6 gap-2 w-72 z-50 animate-in slide-in-from-top-2">
                                                        <div className="col-span-6 flex items-center justify-between mb-2">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pilih Reaksi</span>
                                                            <button onClick={() => setShowEmojiPicker(null)}><X size={14} /></button>
                                                        </div>
                                                        {COMMON_EMOJIS.map(emoji => (
                                                            <button key={emoji} onClick={() => handleAddReaction(msg.id, emoji)} className="text-2xl hover:bg-accent/10 rounded-xl p-2 transition-all">{emoji}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-10 bg-white border-t-4 border-slate-900">
                            {replyTo && (
                                <div className="mb-6 p-4 bg-slate-50 border-2 border-dashed border-accent rounded-[24px] flex items-center justify-between animate-in slide-in-from-bottom-4">
                                    <div className="flex items-center gap-4 truncate">
                                        <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shrink-0 border-2 border-accent/20"><Reply size={24} /></div>
                                        <div className="truncate">
                                            <p className="text-[10px] text-accent uppercase font-black leading-none mb-2 tracking-widest">MEMBALAS PESAN {replyTo.sender_name}</p>
                                            <p className="font-bold truncate opacity-70 italic text-sm">"{replyTo.content}"</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setReplyTo(null)} className="p-3 hover:bg-red-50 text-red-500 rounded-2xl transition-all"><X size={20} /></button>
                                </div>
                            )}

                            <div className="flex gap-6 items-end relative">
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`h-[68px] w-[68px] rounded-2xl border-4 border-slate-900 shadow-hard flex items-center justify-center hover:-translate-y-1 transition-all shrink-0 ${uploadingFile ? 'animate-pulse bg-slate-100' : 'bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900'}`}
                                >
                                    <Paperclip size={28} />
                                </button>

                                <div className="flex-1 relative">
                                    {showMentionList && (
                                        <div className="absolute bottom-full mb-6 left-0 w-80 bg-white border-4 border-slate-900 rounded-[32px] shadow-hard overflow-hidden z-[100] animate-in slide-in-from-bottom-4">
                                            <div className="p-5 bg-slate-50 border-b-2 border-slate-900 text-[10px] font-black uppercase text-slate-400 tracking-widest">Sebut Anggota Tim</div>
                                            <div className="max-h-72 overflow-y-auto custom-scrollbar">
                                                {workspaceMembers.filter(m => m.full_name.toLowerCase().includes(mentionSearch.toLowerCase())).map(m => (
                                                    <button key={m.id} onClick={() => {
                                                        const p = input.split('@'); p.pop();
                                                        setInput(p.join('@') + '@' + m.full_name + ' '); setShowMentionList(false);
                                                    }} className="w-full px-6 py-4 hover:bg-accent/5 flex items-center gap-4 border-b last:border-0 border-slate-100 transition-all">
                                                        <img src={m.avatar_url} className="w-10 h-10 rounded-xl border-2 border-slate-900 shadow-hard-mini" />
                                                        <div className="text-left"><p className="text-sm font-black text-slate-900 leading-none mb-1">{m.full_name}</p><p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{m.role}</p></div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="relative">
                                        <textarea
                                            rows={1} value={input}
                                            onChange={e => handleInputChange(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                                            placeholder="Tulis pesan untuk tim..."
                                            className="w-full bg-slate-50 border-4 border-slate-900 rounded-[28px] px-8 py-5 font-black text-base outline-none focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all resize-none shadow-hard-mini overflow-hidden"
                                        />
                                        <div className="absolute right-4 bottom-4 flex gap-2">
                                            <button onClick={() => setShowEmojiPicker(showEmojiPicker === 'input' ? null : 'input')} className="p-2 text-slate-400 hover:text-accent transition-all hover:scale-110"><Smile size={24} /></button>
                                            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-accent transition-all hover:scale-110"><Camera size={24} /></button>
                                        </div>
                                    </div>

                                    {showEmojiPicker === 'input' && (
                                        <div className="absolute bottom-full mb-6 right-0 bg-white border-4 border-slate-900 rounded-[32px] shadow-hard p-6 grid grid-cols-6 gap-3 w-80 z-50 animate-in slide-in-from-bottom-4">
                                            <div className="col-span-6 flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emoticon</span>
                                                <button onClick={() => setShowEmojiPicker(null)}><X size={16} /></button>
                                            </div>
                                            {COMMON_EMOJIS.map(emoji => (
                                                <button key={emoji} onClick={() => { setInput(prev => prev + emoji); setShowEmojiPicker(null); }} className="text-3xl hover:bg-accent/10 rounded-2xl p-2 transition-all flex items-center justify-center">{emoji}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleSendMessage()}
                                    className="h-[68px] w-[68px] bg-accent text-white rounded-[28px] border-4 border-slate-900 shadow-hard flex items-center justify-center hover:-translate-y-1 hover:shadow-hard-hover active:translate-y-0 transition-all shrink-0"
                                >
                                    <Send size={28} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} title="Buat Group Baru">
                <div className="space-y-8 p-4">
                    <div className="flex flex-col items-center gap-6">
                        <div
                            className={`w-32 h-32 rounded-[32px] border-4 border-slate-900 shadow-hard flex items-center justify-center overflow-hidden bg-slate-50 relative group cursor-pointer ${uploadingGroupIcon ? 'animate-pulse' : ''}`}
                            onClick={() => groupIconRef.current?.click()}
                        >
                            {newGroupIcon ? <img src={newGroupIcon} className="w-full h-full object-cover" /> : <Users size={48} className="text-slate-300" />}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-all">
                                <Camera size={24} />
                                <span className="text-[10px] font-black uppercase mt-1">Ganti Ikon</span>
                            </div>
                        </div>
                        <input type="file" ref={groupIconRef} className="hidden" accept="image/png,image/jpeg" onChange={handleGroupIconUpload} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ikon Group (Opsional, gunakan PNG)</p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">Nama Group</label>
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            placeholder="Misal: Proyek Branding..."
                            className="w-full bg-slate-50 border-4 border-slate-900 rounded-2xl px-6 py-4 font-black text-lg outline-none focus:bg-white shadow-hard-mini transition-all"
                        />
                    </div>
                    <Button onClick={handleCreateGroup} className="w-full py-5 text-lg" icon={<Plus size={24} />}>Buat Group</Button>
                </div>
            </Modal>

            {
                previewImage && (
                    <div className="fixed inset-0 z-[10000] bg-slate-900/90 flex items-center justify-center p-10 animate-in fade-in duration-300" onClick={() => setPreviewImage(null)}>
                        <button className="absolute top-10 right-10 w-12 h-12 bg-white rounded-2xl border-4 border-slate-900 flex items-center justify-center hover:scale-110 transition-all z-10"><X size={24} /></button>
                        <img src={previewImage} className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl border-8 border-white animate-in zoom-in-75 duration-500" />
                    </div>
                )
            }
        </div >
    );
};
