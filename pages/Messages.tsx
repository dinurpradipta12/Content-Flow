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
    AtSign,
    Image as ImageIcon,
    Sidebar as SidebarIcon,
    ChevronLeft,
    Quote,
    Camera,
    Paperclip,
    Download,
    Maximize2,
    PlusCircle,
    UserPlus,
    Search,
    MoreVertical,
    BadgeCheck,
    CheckCircle2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useNotifications } from '../components/NotificationProvider';
import { useAppConfig } from '../components/AppConfigProvider';

interface Workspace {
    id: string;
    name: string;
    color?: string;
    members: string[]; // This stores avatar URLs based on Profile.tsx logic
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
    workspace_id: string;
    sender_id: string;
    sender_name: string;
    sender_avatar: string;
    content: string;
    type: string;
    reply_to_id?: string;
    metadata: any;
    created_at: string;
    read_by?: string[];
    reactions?: any[];
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🙏', '💯', '✅', '🚀', '✨', '🙌'];

export const Messages: React.FC = () => {
    const { config } = useAppConfig();

    // Current User
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
    const [showWsSidebar, setShowWsSidebar] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarTab, setSidebarTab] = useState<'groups' | 'online'>('groups');

    // Modals & UI Helpers
    const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupIcon, setNewGroupIcon] = useState<string | null>(null);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]); // User IDs

    const navigate = useNavigate();
    const { sendNotification } = useNotifications();

    // Refs
    const activeGroupRef = useRef<ChatGroup | null>(null);
    const selectedWorkspaceRef = useRef<Workspace | null>(null);
    const workspacesRef = useRef<Workspace[]>([]);
    const messagesRef = useRef<ChatMessage[]>([]);
    const currentUserRef = useRef(currentUser);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const groupIconRef = useRef<HTMLInputElement>(null);
    const globalChannelRef = useRef<any>(null);

    // Sync refs
    useEffect(() => { activeGroupRef.current = activeGroup; }, [activeGroup]);
    useEffect(() => { selectedWorkspaceRef.current = selectedWorkspace; }, [selectedWorkspace]);
    useEffect(() => { workspacesRef.current = workspaces; }, [workspaces]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);

    // 1. Initial Fetch
    useEffect(() => {
        fetchWorkspaces();

        // Realtime for User Status
        const userStatusChannel = supabase.channel('messages_user_status')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_users' }, () => {
                if (selectedWorkspaceRef.current) fetchWorkspaceMembers(selectedWorkspaceRef.current);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(userStatusChannel);
        };
    }, []);

    // 2. Fetch Groups & Members on Workspace Switch
    useEffect(() => {
        if (selectedWorkspace) {
            fetchGroups(selectedWorkspace.id);
            fetchWorkspaceMembers(selectedWorkspace);
            setUnreadCounts(prev => ({ ...prev, [selectedWorkspace.id]: 0 }));
            setSelectedMembers([]); // Reset member selection
        }
    }, [selectedWorkspace]);

    // 3. Fetch Messages on Group Switch
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
        const userRole = currentUser.role || 'Member';

        // OPTIMIZATION: Select only needed columns for the sidebar
        let query = supabase.from('workspaces').select('id, name, owner_id, admin_id, members, logo_url');

        // Construct OR condition safely: Avoid massive base64 strings in URL
        let orCond = `owner_id.eq.${userId},members.cs.{"${userId}"}`;
        if (avatar && !avatar.startsWith('data:')) {
            // Backward compatibility for URL-based avatars
            orCond += `,members.cs.{"${avatar}"}`;
        }
        query = query.or(orCond);

        const { data, error } = await query.order('name');

        if (error) {
            console.error("Error fetching workspaces:", error);
            setIsLoaded(true);
            return;
        }

        if (data) {
            // Safety filtering
            const myWorkspaces = data.filter(ws => {
                const isOwner = ws.owner_id === userId;
                if (isOwner) return true;

                return (ws.members && ws.members.some((m: string) => {
                    if (m === userId) return true;
                    try { return decodeURIComponent(m) === decodeURIComponent(avatar) || m === avatar; }
                    catch { return m === avatar; }
                }));
            });

            setWorkspaces(myWorkspaces);
            setupGlobalRealtime(myWorkspaces);
            if (myWorkspaces.length > 0) setSelectedWorkspace(myWorkspaces[0]);
            setIsLoaded(true);
        }
    };

    const fetchGroups = async (wsId: string) => {
        // Fetch public groups or groups where user is a member
        const { data: groupsData } = await supabase
            .from('workspace_chat_groups')
            .select('*')
            .eq('workspace_id', wsId);

        if (groupsData) {
            setGroups(groupsData);
            if (groupsData.length > 0) setActiveGroup(groupsData[0]);
        }
    };

    const fetchWorkspaceMembers = async (ws: Workspace) => {
        const { data: userData } = await supabase.from('app_users').select('id, full_name, avatar_url, role, online_status, last_activity_at');
        if (userData) {
            // Filter users based on workspace members list (avatar URLs) or admin ID
            const members = userData.filter(u => ws.members?.includes(u.avatar_url) || u.id === ws.admin_id);
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
            const { data: reads } = await supabase.from('workspace_chat_reads').select('message_id, user_id').eq('group_id', groupId);
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
        if (msgIds.length === 0 || !currentUser.id) return;
        const reads = msgIds.map(id => ({ message_id: id, user_id: currentUser.id, group_id: groupId }));
        await supabase.from('workspace_chat_reads').upsert(reads, { onConflict: 'message_id,user_id' });
    };

    const setupGlobalRealtime = (wsList: Workspace[]) => {
        if (wsList.length === 0) return;

        console.log('Setting up real-time for workspaces:', wsList.map(w => w.id));

        // Remove existing channels to avoid duplicates
        if (globalChannelRef.current) {
            supabase.removeChannel(globalChannelRef.current);
        }
        supabase.removeAllChannels();

        // Create ONE global channel for all workspace chat updates
        const channel = supabase.channel('global-workspace-chat');

        channel
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'workspace_chat_messages'
            }, (payload) => {
                console.log('Real-time message received:', payload.new);
                handleNewMessage(payload.new as ChatMessage);
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'workspace_chat_reads'
            }, (payload) => {
                handleNewRead(payload.new);
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'workspace_chat_reactions'
            }, (payload) => {
                handleReactionChange(payload);
            })
            .subscribe((status) => {
                console.log('Real-time subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to real-time updates');
                }
            });

        globalChannelRef.current = channel;
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

            if (reaction.user_id !== currentUserRef.current.id) {
                const msg = messagesRef.current.find(m => m.id === reaction.message_id);
                if (msg && msg.sender_id === currentUserRef.current.id) {
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

    const handleNewMessage = (msg: ChatMessage) => {
        const isActiveGroup = activeGroupRef.current?.id === msg.group_id;

        // Find which workspace this message belongs to
        const wsId = msg.workspace_id ||
            workspacesRef.current.find(w => w.id === msg.workspace_id)?.id ||
            workspacesRef.current[0]?.id;

        if (isActiveGroup) {
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, { ...msg, read_by: [], reactions: [] }]);
            markMessagesAsRead([msg.id], msg.group_id);
        } else if (wsId) {
            setUnreadCounts(prev => ({ ...prev, [wsId]: (prev[wsId] || 0) + 1 }));
        }

        if (msg.sender_id !== currentUserRef.current.id && wsId) {
            if (msg.content.includes(`@${currentUserRef.current.name}`) || msg.content.includes(`@everyone`)) {
                sendNotification({
                    recipientId: currentUserRef.current.id,
                    type: 'MENTION',
                    title: `Disebut di ${workspacesRef.current.find(w => w.id === wsId)?.name || 'Workspace'}`,
                    content: `${msg.sender_name}: ${msg.content}`,
                    metadata: { workspace_id: wsId, group_id: msg.group_id }
                });
            }
        }
    };

    const handleSendMessage = async (fileUrl?: string, fileType?: string) => {
        if (!input.trim() && !fileUrl) return;
        if (!activeGroup || !selectedWorkspace || !currentUser.id) return;

        const content = input;
        const msgType = fileType || (content.includes('@') ? 'mention' : 'text');
        const tempId = `temp-${Date.now()}`;

        const optimisticMsg: ChatMessage = {
            id: tempId,
            group_id: activeGroup.id,
            workspace_id: selectedWorkspace.id,
            sender_id: currentUser.id,
            sender_name: currentUser.name,
            sender_avatar: currentUser.avatar,
            content: fileUrl || content,
            type: msgType,
            reply_to_id: replyTo?.id,
            metadata: {
                reply_to: replyTo ? { name: replyTo.sender_name, content: replyTo.content } : null,
                original_text: fileUrl && content.trim() ? content : undefined
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
            workspace_id: optimisticMsg.workspace_id,
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

            if (content.includes('@')) {
                const mentions = content.match(/@(\w+)/g);
                if (mentions) {
                    for (const m of mentions) {
                        const name = m.slice(1);
                        const user = workspaceMembers.find(u => u.full_name.toLowerCase().includes(name.toLowerCase()));
                        if (user && user.id !== currentUser.id) {
                            sendNotification({
                                recipientId: user.id,
                                type: 'MENTION',
                                title: `${currentUser.name} menyebut anda`,
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
            await supabase.from('workspace_chat_reactions').delete().eq('message_id', messageId).eq('user_id', currentUser.id).eq('emoji', emoji);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('File too large (Max 5MB)');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            const type = file.type.startsWith('image/') ? 'image' : 'file';
            handleSendMessage(base64, type);
        };
        reader.readAsDataURL(file);
    };

    const handleGroupIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewGroupIcon(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || !selectedWorkspace || !currentUser.id) {
            console.warn('Missing required data for group creation:', { newGroupName, selectedWorkspace, userId: currentUser.id });
            return;
        }

        try {
            console.log('Creating group with payload:', {
                name: newGroupName,
                workspace_id: selectedWorkspace.id,
                icon: newGroupIcon ? (newGroupIcon.length > 100 ? 'base64_image' : newGroupIcon) : 'users',
                created_by: currentUser.id
            });

            const { data: group, error: groupError } = await supabase.from('workspace_chat_groups').insert({
                name: newGroupName,
                workspace_id: selectedWorkspace.id,
                icon: newGroupIcon || 'users',
                created_by: currentUser.id
            }).select().single();

            if (groupError) {
                console.error('Error creating group (Supabase):', groupError);
                if (groupError.message?.includes('column "icon" does not exist')) {
                    alert('Error: Database belum terupdate. Silahkan jalankan file migration 20260223_fix_chat_schema_columns.sql di Supabase SQL Editor.');
                } else {
                    alert(`Gagal membuat grup: ${groupError.message}`);
                }
                return;
            }

            if (!group) throw new Error('No group data returned after insert');

            // Add members to workspace_chat_members
            const membersToInsert = [currentUser.id, ...selectedMembers].map(uid => ({
                group_id: group.id,
                user_id: uid
            }));

            if (membersToInsert.length > 0) {
                const { error: memberError } = await supabase.from('workspace_chat_members').insert(membersToInsert);
                if (memberError) console.error('Error adding members:', memberError);
            }

            await fetchGroups(selectedWorkspace.id);
            setShowGroupModal(false);
            setNewGroupName('');
            setNewGroupIcon(null);
            setSelectedMembers([]);
        } catch (err: any) {
            console.error('Unexpected error creating group:', err);
            alert(`Terjadi kesalahan: ${err.message || 'Unknown error'}`);
        }
    };

    const handleInputChange = (val: string) => {
        setInput(val);
        const parts = val.split('@');
        if (val.endsWith('@')) { setShowMentionList(true); setMentionSearch(''); }
        else if (showMentionList) { setMentionSearch(parts[parts.length - 1]); if (val.endsWith(' ')) setShowMentionList(false); }
        else setShowMentionList(false);
    };

    const toggleMemberSelection = (userId: string) => {
        if (userId === currentUser.id) return; // Always included
        setSelectedMembers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    if (!isLoaded) return <div className="p-20 text-center font-black animate-pulse text-slate-400">Loading...</div>;

    return (
        <div className="flex bg-card rounded-[40px] border-2 border-border shadow-hard flex-1 min-h-0 overflow-hidden relative">
            {/* Workspace Bar (Thin & Modern) */}
            <div className={`bg-slate-900 flex flex-col items-center py-8 gap-6 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] shrink-0 overflow-y-auto no-scrollbar ${showWsSidebar ? 'w-20' : 'w-0 opacity-0 -translate-x-full'}`}>
                {workspaces.map(ws => (
                    <button
                        key={ws.id}
                        onClick={() => setSelectedWorkspace(ws)}
                        className={`w-12 h-12 rounded-2xl border-2 transition-all relative group flex items-center justify-center bg-white/10 hover:bg-white/20 ${selectedWorkspace?.id === ws.id ? 'border-accent ring-4 ring-accent/20 scale-110 bg-white/20' : 'border-white/10'}`}
                        title={ws.name}
                    >
                        {ws.logo_url ? (
                            <img src={ws.logo_url} className="w-8 h-8 object-contain" />
                        ) : (
                            <span className="font-black text-[10px] text-white/40">{ws.name.substring(0, 2).toUpperCase()}</span>
                        )}
                        <div className="absolute left-full ml-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-800 text-white text-[10px] font-black px-3 py-1.5 rounded-xl whitespace-nowrap z-[60] shadow-xl border border-white/10">{ws.name}</div>
                        {unreadCounts[ws.id] > 0 && (
                            <div className="absolute -top-1 -right-1 bg-accent text-white text-[8px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900">
                                {unreadCounts[ws.id]}
                            </div>
                        )}
                    </button>
                ))}
                <button
                    onClick={() => navigate('/plan')}
                    className="w-12 h-12 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center text-white/20 hover:text-white hover:border-white transition-all mt-auto"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex min-w-0">
                {/* Thread Sidebar */}
                <div className="w-96 border-r-2 border-border flex flex-col bg-card shrink-0">
                    <div className="p-8 pb-4">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShowWsSidebar(!showWsSidebar)}
                                    className={`p-2 rounded-xl transition-all ${showWsSidebar ? 'bg-slate-900 text-white' : 'bg-muted text-mutedForeground hover:bg-accent hover:text-white shadow-sm'}`}
                                >
                                    <SidebarIcon size={18} />
                                </button>
                                <h2 className="text-3xl font-black text-foreground font-heading">Messages</h2>
                            </div>
                            <button className="p-2.5 rounded-xl hover:bg-muted text-mutedForeground transition-all">
                                <Search size={22} />
                            </button>
                        </div>

                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-mutedForeground" size={18} />
                            <input
                                type="text"
                                placeholder={sidebarTab === 'groups' ? "Search groups..." : "Search members..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-muted/50 border-2 border-transparent focus:border-accent/30 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold outline-none transition-all"
                            />
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-muted/30 p-1 rounded-2xl mb-4 border border-border">
                            <button
                                onClick={() => setSidebarTab('groups')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'groups' ? 'bg-white text-accent shadow-sm border border-border' : 'text-mutedForeground hover:text-foreground'}`}
                            >
                                <Users size={14} />
                                Groups
                            </button>
                            <button
                                onClick={() => setSidebarTab('online')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'online' ? 'bg-white text-accent shadow-sm border border-border' : 'text-mutedForeground hover:text-foreground'}`}
                            >
                                <div className="relative">
                                    <AtSign size={14} />
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white"></div>
                                </div>
                                Members
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-8 space-y-1">
                        {sidebarTab === 'groups' ? (
                            groups
                                .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(g => {
                                    const lastMsg = messages.filter(m => m.group_id === g.id).slice(-1)[0];
                                    const isActive = activeGroup?.id === g.id;
                                    const unread = unreadCounts[g.id] || 0;

                                    return (
                                        <button
                                            key={g.id}
                                            onClick={() => setActiveGroup(g)}
                                            className={`w-full p-4 rounded-3xl flex items-start gap-4 transition-all relative group ${isActive ? 'bg-accent/5 ring-2 ring-accent/10' : 'hover:bg-muted'}`}
                                        >
                                            <div className="relative shrink-0">
                                                <div className={`w-14 h-14 rounded-2xl border-2 border-border flex items-center justify-center overflow-hidden bg-muted`}>
                                                    {g.icon?.startsWith('data:') ? (
                                                        <img src={g.icon} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Users size={24} className="text-mutedForeground" />
                                                    )}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-card rounded-full shadow-sm"></div>
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <div className="flex justify-between items-center mb-1">
                                                    <h4 className={`text-sm font-black truncate pr-2 ${isActive ? 'text-accent' : 'text-foreground'}`}>
                                                        {g.name}
                                                        {g.name.toLowerCase().includes('car') && <BadgeCheck size={14} className="inline ml-1 text-blue-500" />}
                                                    </h4>
                                                    <span className="text-[10px] font-bold text-mutedForeground uppercase tracking-tight whitespace-nowrap">
                                                        {lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-mutedForeground truncate leading-snug">
                                                    {lastMsg ? lastMsg.content : 'No messages yet'}
                                                </p>
                                            </div>
                                            {unread > 0 && (
                                                <div className="absolute top-1/2 -translate-y-1/2 right-4 bg-accent text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full">
                                                    {unread}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                        ) : (
                            workspaceMembers
                                .filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                                .sort((a, b) => {
                                    if (a.online_status === 'online' && b.online_status !== 'online') return -1;
                                    if (a.online_status !== 'online' && b.online_status === 'online') return 1;
                                    return 0;
                                })
                                .map(u => (
                                    <div
                                        key={u.id}
                                        className="w-full p-4 rounded-3xl flex items-center gap-4 hover:bg-muted transition-all cursor-default"
                                    >
                                        <div className="relative shrink-0">
                                            <img src={u.avatar_url} className="w-14 h-14 rounded-2xl border-2 border-border object-cover bg-white" />
                                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card shadow-sm ${u.online_status === 'online' ? 'bg-emerald-500' : u.online_status === 'idle' ? 'bg-amber-400' : 'bg-slate-300'}`}></div>
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <h4 className="text-sm font-black text-foreground truncate mb-0.5">
                                                {u.full_name}
                                                {u.id === currentUser.id && <span className="ml-2 text-[8px] px-1.5 py-0.5 bg-accent/10 text-accent rounded uppercase">You</span>}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                <p className={`text-[10px] font-bold uppercase tracking-tight ${u.online_status === 'online' ? 'text-emerald-500' : 'text-mutedForeground'}`}>
                                                    {u.online_status === 'online' ? 'Active Now' : u.online_status === 'idle' ? 'Away' : 'Offline'}
                                                </p>
                                                {u.online_status !== 'online' && u.last_activity_at && (
                                                    <>
                                                        <span className="text-slate-300">•</span>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                            {new Date(u.last_activity_at).toLocaleDateString() === new Date().toLocaleDateString()
                                                                ? new Date(u.last_activity_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                : 'Recently'}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                        )}

                        {sidebarTab === 'groups' && (
                            <button
                                onClick={() => setShowGroupModal(true)}
                                className="w-full p-6 border-2 border-dashed border-border rounded-3xl text-mutedForeground hover:text-accent hover:border-accent transition-all flex flex-col items-center gap-2 mt-4"
                            >
                                <Plus size={24} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Create New Group</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-white min-w-0">
                    {activeGroup ? (
                        <>
                            {/* Header */}
                            <div className="h-28 border-b-2 border-border flex items-center justify-between px-10 bg-white shrink-0 relative z-10">
                                <div className="flex items-center gap-5">
                                    <div className="relative shrink-0">
                                        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center border-2 border-border overflow-hidden">
                                            {activeGroup.icon?.startsWith('data:') ? (
                                                <img src={activeGroup.icon} className="w-full h-full object-cover" />
                                            ) : (
                                                <Users size={28} className="text-accent" />
                                            )}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="font-extrabold text-2xl text-slate-900 font-heading leading-none">
                                                {activeGroup.name}
                                            </h2>
                                            {activeGroup.name.toLowerCase().includes('car') && <BadgeCheck size={20} className="text-blue-500" />}
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none flex items-center gap-2">
                                            <CheckCircle2 size={12} className="text-emerald-500" /> Authorised Dealer
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="p-3 rounded-2xl hover:bg-slate-50 text-slate-400 transition-all">
                                        <MoreVertical size={22} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar bg-slate-50/30">
                                {messages.map((msg, idx) => {
                                    const isMe = msg.sender_id === currentUser.id;
                                    const replyParent = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) || msg.metadata?.reply_to : null;

                                    return (
                                        <div key={msg.id} className={`flex items-start gap-4 ${isMe ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}>
                                            {!isMe && (
                                                <div className="shrink-0 pt-1">
                                                    <img src={msg.sender_avatar} className="w-12 h-12 rounded-2xl border-2 border-white object-cover shadow-sm bg-muted" />
                                                </div>
                                            )}
                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0 max-w-[65%]`}>
                                                <div className="group relative flex flex-col gap-2">
                                                    <div className={`shadow-sm rounded-[24px] overflow-hidden border-2 ${isMe ? 'bg-white border-border text-slate-800 rounded-tr-none' : 'bg-muted/50 border-transparent text-slate-800 rounded-tl-none'}`}>
                                                        {replyParent && (
                                                            <div className="mx-4 mt-4 p-3 bg-muted border-l-4 border-accent rounded-xl text-[10px] font-bold text-mutedForeground italic flex items-start gap-2">
                                                                <Quote size={12} className="shrink-0 text-accent opacity-50" />
                                                                <span className="truncate">{replyParent.content}</span>
                                                            </div>
                                                        )}

                                                        {msg.type === 'image' ? (
                                                            <img src={msg.content} className="max-w-md max-h-[400px] object-cover cursor-pointer hover:opacity-95 transition-opacity" onClick={() => setPreviewImage(msg.content)} />
                                                        ) : msg.type === 'file' ? (
                                                            <div className="p-5 flex items-center gap-4">
                                                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-border flex items-center justify-center text-accent">
                                                                    <Paperclip size={20} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-black truncate">{msg.content.split('/').pop()?.slice(0, 30)}</p>
                                                                    <p className="text-[10px] font-bold text-mutedForeground uppercase">Attached File</p>
                                                                </div>
                                                                <a href={msg.content} download className="p-2 border-2 border-border rounded-xl text-mutedForeground hover:text-accent hover:border-accent transition-all">
                                                                    <Download size={18} />
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <div className="p-6 text-[15px] font-bold leading-relaxed">{msg.content}</div>
                                                        )}
                                                    </div>

                                                    <div className={`flex items-center gap-3 px-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {isMe && (
                                                            <div className="flex items-center">
                                                                <CheckCheck size={14} className={msg.read_by && msg.read_by.length > 1 ? 'text-blue-500' : 'text-slate-300'} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions Overlay */}
                                                    <div className={`absolute top-0 ${isMe ? '-left-12' : '-right-12'} opacity-0 group-hover:opacity-100 transition-all flex flex-col bg-white border-2 border-border p-1 rounded-2xl shadow-hard z-30`}>
                                                        <button onClick={() => setReplyTo(msg)} className="p-2 text-mutedForeground hover:text-accent transition-colors"><Reply size={18} /></button>
                                                        <button onClick={() => setShowEmojiPicker(msg.id)} className="p-2 text-mutedForeground hover:text-accent transition-colors"><Smile size={18} /></button>
                                                    </div>

                                                    {showEmojiPicker === msg.id && (
                                                        <div className="absolute top-12 left-0 bg-card border-4 border-slate-900 rounded-2xl p-4 grid grid-cols-4 gap-2 w-48 z-50 shadow-hard">
                                                            {COMMON_EMOJIS.slice(0, 12).map(e => (
                                                                <button key={e} onClick={() => handleAddReaction(msg.id, e)} className="text-xl p-2 hover:bg-muted rounded-xl transition-colors">{e}</button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {msg.reactions && msg.reactions.length > 0 && (
                                                    <div className={`mt-2 flex gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                        {Object.entries(msg.reactions.reduce((acc: any, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})).map(([emoji, count]: [string, any]) => (
                                                            <div key={emoji} className="px-2.5 py-1 bg-white border-2 border-border rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                                                                <span>{emoji}</span>
                                                                <span className="text-mutedForeground">{count}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-10 bg-white border-t-2 border-border">
                                {replyTo && (
                                    <div className="mb-4 flex items-center justify-between p-4 bg-muted/50 border-2 border-accent/20 rounded-2xl text-[10px] font-black text-mutedForeground uppercase tracking-widest relative overflow-hidden group">
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent"></div>
                                        <span className="truncate pl-2">Replying to: {replyTo.content}</span>
                                        <button onClick={() => setReplyTo(null)} className="p-1 hover:text-red-500 transition-colors">
                                            <X size={18} />
                                        </button>
                                    </div>
                                )}
                                <div className="flex gap-4 items-end relative">
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-16 w-16 bg-white border-2 border-border rounded-2xl flex items-center justify-center text-mutedForeground hover:text-accent hover:border-accent transition-all shadow-sm shrink-0"
                                    >
                                        <Paperclip size={24} />
                                    </button>
                                    <div className="flex-1 relative">
                                        {showMentionList && (
                                            <div className="absolute bottom-full mb-4 left-0 w-80 bg-card border-4 border-slate-900 rounded-3xl shadow-hard z-[100] max-h-72 overflow-y-auto custom-scrollbar">
                                                <div className="p-4 border-b-2 border-slate-100 bg-slate-50">
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mention Team Members</p>
                                                </div>
                                                {workspaceMembers.filter(m => m.full_name.toLowerCase().includes(mentionSearch.toLowerCase())).map(m => (
                                                    <button
                                                        key={m.id}
                                                        onClick={() => {
                                                            const p = input.split('@');
                                                            p.pop();
                                                            setInput(p.join('@') + '@' + m.full_name + ' ');
                                                            setShowMentionList(false);
                                                        }}
                                                        className="w-full p-4 hover:bg-muted flex items-center gap-4 transition-colors text-left"
                                                    >
                                                        <img src={m.avatar_url} className="w-10 h-10 rounded-xl border-2 border-slate-800" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-extrabold text-sm truncate">{m.full_name}</p>
                                                            <p className="text-[9px] font-black text-mutedForeground uppercase">{m.role}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <textarea
                                            rows={1}
                                            value={input}
                                            onChange={e => handleInputChange(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                                            placeholder="Type your message..."
                                            className="w-full bg-slate-50/50 border-2 border-border focus:border-accent/30 rounded-[28px] px-8 py-5 font-bold text-sm outline-none focus:bg-white transition-all resize-none shadow-sm min-h-[64px] max-h-48"
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                            <button onClick={() => setShowEmojiPicker(showEmojiPicker === 'input' ? null : 'input')} className="p-2 text-mutedForeground hover:text-accent transition-colors">
                                                <Smile size={22} />
                                            </button>
                                        </div>
                                        {showEmojiPicker === 'input' && (
                                            <div className="absolute bottom-full mb-4 right-0 bg-card border-4 border-slate-900 rounded-3xl p-6 grid grid-cols-6 gap-3 w-80 z-50 shadow-hard">
                                                {COMMON_EMOJIS.map(e => (
                                                    <button key={e} onClick={() => { setInput(p => p + e); setShowEmojiPicker(null); }} className="text-2xl p-2 hover:bg-muted rounded-xl transition-all hover:scale-125">{e}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleSendMessage()}
                                        className="h-16 w-16 bg-accent text-white rounded-2xl border-2 border-transparent shadow-hard flex items-center justify-center hover:bg-accent/90 transition-all hover:-translate-y-1 active:translate-y-0"
                                    >
                                        <Send size={24} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-slate-50/30">
                            <div className="w-32 h-32 bg-white rounded-[40px] border-4 border-slate-100 flex items-center justify-center text-slate-100 mb-8 shadow-sm">
                                <MessageSquare size={64} />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 font-heading mb-4">Select a conversation</h3>
                            <p className="text-slate-400 font-bold max-w-sm leading-relaxed">Choose a group or member from the sidebar to start collaborating.</p>
                        </div>
                    )}
                </div>

                {/* Modals */}
                <Modal isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} title="Buat Group Baru">
                    <div className="space-y-6 p-4">
                        <div className="flex flex-col items-center gap-4">
                            <div onClick={() => groupIconRef.current?.click()} className="w-24 h-24 rounded-3xl border-4 border-slate-900 shadow-hard flex items-center justify-center overflow-hidden bg-slate-50 cursor-pointer">{newGroupIcon ? <img src={newGroupIcon} className="w-full h-full object-cover" /> : <Camera size={32} className="text-slate-300" />}</div>
                            <input type="file" ref={groupIconRef} className="hidden" accept="image/*" onChange={handleGroupIconUpload} />
                            <p className="text-[10px] font-black text-slate-400 uppercase">Set Icon Group</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Nama Group</label>
                            <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Marketing, Project A, dll" className="w-full bg-slate-50 border-4 border-slate-900 rounded-xl px-4 py-3 font-bold outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Pilih Anggota Tim</label>
                            <div className="max-h-40 overflow-y-auto border-2 border-slate-100 rounded-xl p-2 space-y-2 custom-scrollbar">
                                {workspaceMembers.filter(m => m.id !== currentUser.id).map(m => (
                                    <button key={m.id} onClick={() => toggleMemberSelection(m.id)} className={`w-full p-2 flex items-center gap-3 rounded-lg border-2 transition-all ${selectedMembers.includes(m.id) ? 'border-accent bg-accent/5' : 'border-transparent'}`}>
                                        <div className={`w-4 h-4 border-2 border-slate-900 rounded flex items-center justify-center ${selectedMembers.includes(m.id) ? 'bg-accent' : ''}`}>{selectedMembers.includes(m.id) && <Check size={10} className="text-white" />}</div>
                                        <img src={m.avatar_url} className="w-8 h-8 rounded-lg border-2 border-slate-900" />
                                        <span className="text-xs font-bold">{m.full_name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Button onClick={handleCreateGroup} className="w-full" icon={<UserPlus size={18} />}>Buat Grup</Button>
                    </div>
                </Modal>

                {previewImage && <div className="fixed inset-0 z-[1000] bg-slate-900/90 flex items-center justify-center p-10" onClick={() => setPreviewImage(null)}><button className="absolute top-10 right-10 text-white"><X size={32} /></button><img src={previewImage} className="max-w-full max-h-full object-contain rounded-2xl border-4 border-white shadow-2xl animate-in zoom-in-75" /></div>}
            </div>
        </div>
    );
};
