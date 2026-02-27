import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import {
    MessageSquare, X, Users, Send, Smile, Reply, Check, CheckCheck,
    Plus, AtSign, Image as ImageIcon, ChevronLeft, Quote, Paperclip,
    Search, MoreVertical, BadgeCheck, Trash2, Lock, Globe, Hash,
    Phone, Video, Info, Bell, BellOff, UserCircle, ChevronRight,
    Layers, Wifi, WifiOff, MessageCircle, Edit3
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useNotifications } from '../components/NotificationProvider';
import { useAppConfig } from '../components/AppConfigProvider';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Workspace {
    id: string;
    name: string;
    color?: string;
    members: string[];
    admin_id: string;
    logo_url?: string;
    owner_id?: string;
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
    group_id?: string;
    workspace_id?: string;
    sender_id: string;
    recipient_id?: string; // for DMs
    sender_name: string;
    sender_avatar: string;
    content: string;
    type: string;
    reply_to_id?: string;
    metadata: any;
    created_at: string;
    read_by?: string[];
    reactions?: any[];
    is_deleted?: boolean;
}

interface WorkspaceMember {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
    online_status: string;
    last_activity_at?: string;
}

interface DMConversation {
    userId: string;
    userName: string;
    userAvatar: string;
    userStatus: string;
    lastMessage?: string;
    lastTime?: string;
    unread: number;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🙏', '💯', '✅', '🚀', '✨', '🙌'];

// Simple XOR encryption for DMs (basic obfuscation)
const encryptDM = (text: string, key: string): string => {
    try {
        return btoa(text.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join(''));
    } catch { return text; }
};
const decryptDM = (text: string, key: string): string => {
    try {
        const decoded = atob(text);
        return decoded.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
    } catch { return text; }
};
const getDMKey = (uid1: string, uid2: string) => [uid1, uid2].sort().join('-').slice(0, 16);
const getDMConvId = (uid1: string, uid2: string) => [uid1, uid2].sort().join('_');

// ─── Chat Sound ───────────────────────────────────────────────────────────────
const playChatSound = () => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch { /* ignore */ }
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const Messages: React.FC = () => {
    const { config } = useAppConfig();
    const { sendNotification } = useNotifications();

    const currentUser = {
        id: localStorage.getItem('user_id') || '',
        name: localStorage.getItem('user_name') || 'Guest',
        avatar: localStorage.getItem('user_avatar') || '',
        role: localStorage.getItem('user_role') || 'Member'
    };

    // ── State ──────────────────────────────────────────────────────────────────
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [groups, setGroups] = useState<ChatGroup[]>([]);
    const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarTab, setSidebarTab] = useState<'groups' | 'dm' | 'members'>('groups');

    // DM State
    const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
    const [activeDM, setActiveDM] = useState<DMConversation | null>(null);
    const [dmMessages, setDmMessages] = useState<ChatMessage[]>([]);
    const [dmUnread, setDmUnread] = useState<Record<string, number>>({});

    // Typing indicators
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const typingTimerRef = useRef<any>(null);
    const isTypingRef = useRef(false);

    // UI State
    const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupIcon, setNewGroupIcon] = useState<string | null>(null);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [userInfoModal, setUserInfoModal] = useState<WorkspaceMember | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [chatMode, setChatMode] = useState<'workspace' | 'dm'>('workspace');

    // Refs
    const activeGroupRef = useRef<ChatGroup | null>(null);
    const activeDMRef = useRef<DMConversation | null>(null);
    const selectedWorkspaceRef = useRef<Workspace | null>(null);
    const workspacesRef = useRef<Workspace[]>([]);
    const messagesRef = useRef<ChatMessage[]>([]);
    const currentUserRef = useRef(currentUser);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const groupIconRef = useRef<HTMLInputElement>(null);
    const globalChannelRef = useRef<any>(null);
    const dmChannelRef = useRef<any>(null);
    const typingChannelRef = useRef<any>(null);

    // Sync refs
    useEffect(() => { activeGroupRef.current = activeGroup; }, [activeGroup]);
    useEffect(() => { activeDMRef.current = activeDM; }, [activeDM]);
    useEffect(() => { selectedWorkspaceRef.current = selectedWorkspace; }, [selectedWorkspace]);
    useEffect(() => { workspacesRef.current = workspaces; }, [workspaces]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);

    // ── Initial Fetch ──────────────────────────────────────────────────────────
    useEffect(() => {
        fetchWorkspaces();
        setupDMRealtime();
        setupTypingRealtime();

        const userStatusChannel = supabase.channel('messages_user_status')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_users' }, () => {
                if (selectedWorkspaceRef.current) fetchWorkspaceMembers(selectedWorkspaceRef.current);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(userStatusChannel);
            if (globalChannelRef.current) supabase.removeChannel(globalChannelRef.current);
            if (dmChannelRef.current) supabase.removeChannel(dmChannelRef.current);
            if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current);
        };
    }, []);

    useEffect(() => {
        if (selectedWorkspace) {
            fetchGroups(selectedWorkspace.id);
            fetchWorkspaceMembers(selectedWorkspace);
            setUnreadCounts(prev => ({ ...prev, [selectedWorkspace.id]: 0 }));
            setSelectedMembers([]);
        }
    }, [selectedWorkspace]);

    useEffect(() => {
        if (activeGroup) fetchMessages(activeGroup.id);
    }, [activeGroup]);

    useEffect(() => {
        if (activeDM) fetchDMMessages(activeDM.userId);
    }, [activeDM]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, dmMessages]);

    // ── Fetch Functions ────────────────────────────────────────────────────────
    const fetchWorkspaces = async () => {
        const userId = currentUser.id;
        const avatar = currentUser.avatar;

        let query = supabase.from('workspaces').select('id, name, owner_id, admin_id, members, logo_url, color');
        let orCond = `owner_id.eq.${userId},members.cs.{"${userId}"}`;
        if (avatar && !avatar.startsWith('data:')) orCond += `,members.cs.{"${avatar}"}`;
        query = query.or(orCond);

        const { data } = await query.order('name');
        if (data) {
            const myWorkspaces = data.filter(ws => {
                if (ws.owner_id === userId) return true;
                return ws.members?.some((m: string) => {
                    if (m === userId) return true;
                    try { return decodeURIComponent(m) === decodeURIComponent(avatar) || m === avatar; }
                    catch { return m === avatar; }
                });
            });
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
            if (data.length > 0 && !activeGroup) setActiveGroup(data[0]);
        }
    };

    const fetchWorkspaceMembers = async (ws: Workspace) => {
        const { data } = await supabase.from('app_users').select('id, full_name, avatar_url, role, online_status, last_activity_at');
        if (data) {
            const members = data.filter(u =>
                ws.members?.includes(u.id) ||
                ws.members?.includes(u.avatar_url) ||
                u.id === ws.admin_id ||
                u.id === ws.owner_id
            );
            setWorkspaceMembers(members as WorkspaceMember[]);

            // Build DM conversations
            const dms: DMConversation[] = members
                .filter(u => u.id !== currentUser.id)
                .map(u => ({
                    userId: u.id,
                    userName: u.full_name,
                    userAvatar: u.avatar_url,
                    userStatus: u.online_status || 'offline',
                    unread: dmUnread[u.id] || 0
                }));
            setDmConversations(dms);
        }
    };

    const fetchMessages = async (groupId: string) => {
        const { data } = await supabase.from('workspace_chat_messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
        if (data) {
            const { data: reads } = await supabase.from('workspace_chat_reads').select('message_id, user_id').eq('group_id', groupId);
            const { data: reactions } = await supabase.from('workspace_chat_reactions').select('*').eq('group_id', groupId);
            const withExtras = data.map(msg => ({
                ...msg,
                read_by: reads?.filter(r => r.message_id === msg.id).map(r => r.user_id) || [],
                reactions: reactions?.filter(r => r.message_id === msg.id) || []
            }));
            setMessages(withExtras);
            markMessagesAsRead(data.map(m => m.id), groupId);
        }
    };

    const fetchDMMessages = async (otherUserId: string) => {
        const { data } = await supabase
            .from('direct_messages')
            .select('*')
            .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUser.id})`)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });

        if (data) {
            const key = getDMKey(currentUser.id, otherUserId);
            const decrypted = data.map(msg => ({
                ...msg,
                content: msg.type === 'text' ? decryptDM(msg.content, key) : msg.content
            }));
            setDmMessages(decrypted);

            // Mark as read
            await supabase.from('direct_messages')
                .update({ is_read: true })
                .eq('recipient_id', currentUser.id)
                .eq('sender_id', otherUserId)
                .eq('is_read', false);

            setDmUnread(prev => ({ ...prev, [otherUserId]: 0 }));
        }
    };

    const markMessagesAsRead = async (msgIds: string[], groupId: string) => {
        if (!msgIds.length || !currentUser.id) return;
        const reads = msgIds.map(id => ({ message_id: id, user_id: currentUser.id, group_id: groupId }));
        await supabase.from('workspace_chat_reads').upsert(reads, { onConflict: 'message_id,user_id' });
    };

    // ── Realtime Setup ─────────────────────────────────────────────────────────
    const setupGlobalRealtime = (wsList: Workspace[]) => {
        if (!wsList.length) return;
        if (globalChannelRef.current) supabase.removeChannel(globalChannelRef.current);

        const channel = supabase.channel('global-workspace-chat')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workspace_chat_messages' }, (payload) => {
                handleNewMessage(payload.new as ChatMessage);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workspace_chat_reads' }, (payload) => {
                handleNewRead(payload.new);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_chat_reactions' }, (payload) => {
                handleReactionChange(payload);
            })
            .subscribe();

        globalChannelRef.current = channel;
    };

    const setupDMRealtime = () => {
        if (dmChannelRef.current) supabase.removeChannel(dmChannelRef.current);

        const channel = supabase.channel('dm-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
                const msg = payload.new as any;
                if (msg.recipient_id === currentUser.id || msg.sender_id === currentUser.id) {
                    const otherUserId = msg.sender_id === currentUser.id ? msg.recipient_id : msg.sender_id;
                    const key = getDMKey(currentUser.id, otherUserId);
                    const decryptedMsg = { ...msg, content: msg.type === 'text' ? decryptDM(msg.content, key) : msg.content };

                    if (activeDMRef.current?.userId === otherUserId) {
                        setDmMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, decryptedMsg]);
                        // Mark as read immediately
                        if (msg.sender_id !== currentUser.id) {
                            supabase.from('direct_messages').update({ is_read: true }).eq('id', msg.id);
                        }
                    } else if (msg.sender_id !== currentUser.id) {
                        setDmUnread(prev => ({ ...prev, [otherUserId]: (prev[otherUserId] || 0) + 1 }));
                        playChatSound();
                        // Send notification
                        sendNotification({
                            recipientId: currentUser.id,
                            type: 'MENTION',
                            title: `Pesan dari ${msg.sender_name}`,
                            content: msg.type === 'text' ? decryptDM(msg.content, key) : '📷 Foto',
                            metadata: { dm: true, sender_id: msg.sender_id }
                        });
                    }
                }
            })
            .subscribe();

        dmChannelRef.current = channel;
    };

    const setupTypingRealtime = () => {
        if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current);

        const channel = supabase.channel('typing-indicators')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_typing' }, (payload) => {
                const data = payload.new as any;
                if (!data || data.user_id === currentUser.id) return;

                const contextId = activeGroupRef.current?.id ||
                    (activeDMRef.current ? getDMConvId(currentUser.id, activeDMRef.current.userId) : null);

                if (data.context_id === contextId) {
                    setTypingUsers(prev => {
                        if (payload.eventType === 'DELETE') return prev.filter(n => n !== data.user_name);
                        if (!prev.includes(data.user_name)) return [...prev, data.user_name];
                        return prev;
                    });

                    // Auto-clear after 3s
                    setTimeout(() => {
                        setTypingUsers(prev => prev.filter(n => n !== data.user_name));
                    }, 3000);
                }
            })
            .subscribe();

        typingChannelRef.current = channel;
    };

    // ── Message Handlers ───────────────────────────────────────────────────────
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
        const wsId = msg.workspace_id;

        if (isActiveGroup) {
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, { ...msg, read_by: [], reactions: [] }]);
            markMessagesAsRead([msg.id], msg.group_id!);
        } else if (wsId) {
            setUnreadCounts(prev => ({ ...prev, [wsId]: (prev[wsId] || 0) + 1 }));
        }

        if (msg.sender_id !== currentUserRef.current.id) {
            playChatSound();
            if (msg.content.includes(`@${currentUserRef.current.name}`) || msg.content.includes('@everyone')) {
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

    // ── Typing Indicator ───────────────────────────────────────────────────────
    const handleTyping = useCallback(async () => {
        const contextId = activeGroup?.id ||
            (activeDM ? getDMConvId(currentUser.id, activeDM.userId) : null);
        if (!contextId || !currentUser.id) return;

        if (!isTypingRef.current) {
            isTypingRef.current = true;
            await supabase.from('chat_typing').upsert({
                user_id: currentUser.id,
                user_name: currentUser.name,
                context_type: activeGroup ? 'group' : 'dm',
                context_id: contextId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,context_id' });
        }

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(async () => {
            isTypingRef.current = false;
            await supabase.from('chat_typing').delete().eq('user_id', currentUser.id).eq('context_id', contextId);
        }, 2000);
    }, [activeGroup, activeDM, currentUser.id, currentUser.name]);

    // ── Send Message ───────────────────────────────────────────────────────────
    const handleSendMessage = async (fileUrl?: string, fileType?: string) => {
        if (!input.trim() && !fileUrl) return;

        if (chatMode === 'dm' && activeDM) {
            await sendDMMessage(fileUrl, fileType);
        } else {
            await sendGroupMessage(fileUrl, fileType);
        }
    };

    const sendGroupMessage = async (fileUrl?: string, fileType?: string) => {
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
            metadata: { reply_to: replyTo ? { name: replyTo.sender_name, content: replyTo.content } : null },
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

            // Handle mentions
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
                                content,
                                metadata: { workspace_id: selectedWorkspace.id }
                            });
                        }
                    }
                }
            }
        }
    };

    const sendDMMessage = async (fileUrl?: string, fileType?: string) => {
        if (!activeDM || !currentUser.id) return;

        const content = input;
        const msgType = fileType || 'text';
        const key = getDMKey(currentUser.id, activeDM.userId);
        const encryptedContent = msgType === 'text' ? encryptDM(content, key) : (fileUrl || content);

        const tempId = `temp-${Date.now()}`;
        const optimisticMsg: ChatMessage = {
            id: tempId,
            sender_id: currentUser.id,
            recipient_id: activeDM.userId,
            sender_name: currentUser.name,
            sender_avatar: currentUser.avatar,
            content: content, // Show decrypted locally
            type: msgType,
            reply_to_id: replyTo?.id,
            metadata: { reply_to: replyTo ? { name: replyTo.sender_name, content: replyTo.content } : null },
            created_at: new Date().toISOString(),
            reactions: []
        };

        setDmMessages(prev => [...prev, optimisticMsg]);
        setInput('');
        setReplyTo(null);

        const { data } = await supabase.from('direct_messages').insert({
            sender_id: currentUser.id,
            recipient_id: activeDM.userId,
            content: encryptedContent,
            type: msgType,
            reply_to_id: replyTo?.id,
            metadata: optimisticMsg.metadata
        }).select().single();

        if (data) {
            setDmMessages(prev => prev.map(m => m.id === tempId ? { ...data, content } : m));
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
        if (error?.code === '23505') {
            await supabase.from('workspace_chat_reactions').delete().eq('message_id', messageId).eq('user_id', currentUser.id).eq('emoji', emoji);
        }
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (chatMode === 'dm') {
            await supabase.from('direct_messages').update({ is_deleted: true }).eq('id', msgId);
            setDmMessages(prev => prev.filter(m => m.id !== msgId));
        } else {
            await supabase.from('workspace_chat_messages').delete().eq('id', msgId);
            setMessages(prev => prev.filter(m => m.id !== msgId));
        }
        setShowDeleteConfirm(null);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('File too large (Max 5MB)'); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            const type = file.type.startsWith('image/') ? 'image' : 'file';
            handleSendMessage(base64, type);
        };
        reader.readAsDataURL(file);
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || !selectedWorkspace || !currentUser.id) return;
        const { data: group } = await supabase.from('workspace_chat_groups').insert({
            name: newGroupName,
            workspace_id: selectedWorkspace.id,
            icon: newGroupIcon || 'users',
            created_by: currentUser.id
        }).select().single();

        if (group) {
            setGroups(prev => [...prev, group]);
            setActiveGroup(group);
            setShowGroupModal(false);
            setNewGroupName('');
            setNewGroupIcon(null);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInput(val);
        handleTyping();

        // Mention detection
        const lastAt = val.lastIndexOf('@');
        if (lastAt !== -1 && (lastAt === 0 || val[lastAt - 1] === ' ')) {
            setMentionSearch(val.slice(lastAt + 1));
            setShowMentionList(true);
        } else {
            setShowMentionList(false);
        }
    };

    const insertMention = (name: string) => {
        const lastAt = input.lastIndexOf('@');
        setInput(input.slice(0, lastAt) + `@${name} `);
        setShowMentionList(false);
    };

    // ── Computed Values ────────────────────────────────────────────────────────
    const onlineCount = workspaceMembers.filter(m => m.online_status === 'online').length;
    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0) + Object.values(dmUnread).reduce((a, b) => a + b, 0);
    const currentMessages = chatMode === 'dm' ? dmMessages : messages;
    const filteredMembers = workspaceMembers.filter(m => m.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // ── Render ─────────────────────────────────────────────────────────────────
    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3 text-mutedForeground">
                    <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-bold">Memuat pesan...</span>
                </div>
            </div>
        );
    }

    if (workspaces.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 mx-auto bg-accent/10 rounded-2xl flex items-center justify-center">
                        <MessageSquare size={32} className="text-accent opacity-60" />
                    </div>
                    <h3 className="font-black text-foreground text-xl">Belum ada workspace</h3>
                    <p className="text-mutedForeground text-sm">Bergabung ke workspace untuk mulai chat.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] gap-0 overflow-hidden">
            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
                <div className="bg-card border-2 border-border rounded-2xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Wifi size={18} className="text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-mutedForeground tracking-wider">Online</p>
                        <p className="text-xl font-black text-foreground">{onlineCount}</p>
                    </div>
                </div>
                <div className="bg-card border-2 border-border rounded-2xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center">
                        <MessageCircle size={18} className="text-accent" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-mutedForeground tracking-wider">Unread</p>
                        <p className="text-xl font-black text-foreground">{totalUnread}</p>
                    </div>
                </div>
                <div className="bg-card border-2 border-border rounded-2xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Hash size={18} className="text-blue-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-mutedForeground tracking-wider">Groups</p>
                        <p className="text-xl font-black text-foreground">{groups.length}</p>
                    </div>
                </div>
            </div>

            {/* ── Main Chat Layout ── */}
            <div className="flex flex-1 bg-card border-2 border-border rounded-2xl overflow-hidden min-h-0">

                {/* ── Left: Workspace Selector ── */}
                <div className="w-16 bg-muted/50 border-r-2 border-border flex flex-col items-center py-4 gap-2 flex-shrink-0">
                    {workspaces.map(ws => {
                        const isSelected = selectedWorkspace?.id === ws.id;
                        const wsUnread = unreadCounts[ws.id] || 0;
                        return (
                            <button
                                key={ws.id}
                                onClick={() => { setSelectedWorkspace(ws); setChatMode('workspace'); }}
                                className={`relative w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center overflow-hidden ${isSelected ? 'border-accent shadow-hard-mini scale-110' : 'border-border hover:border-accent/50'}`}
                                title={ws.name}
                            >
                                {ws.logo_url ? (
                                    <img src={ws.logo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center text-xs font-black ${isSelected ? 'bg-accent text-white' : 'bg-muted text-mutedForeground'}`}>
                                        {ws.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                {wsUnread > 0 && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                                        {wsUnread > 9 ? '9+' : wsUnread}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Middle: Channel/DM List ── */}
                <div className="w-64 border-r-2 border-border flex flex-col flex-shrink-0">
                    {/* Workspace name */}
                    <div className="p-4 border-b-2 border-border flex-shrink-0">
                        <h3 className="font-black text-foreground text-sm truncate">{selectedWorkspace?.name}</h3>
                        <p className="text-[10px] text-mutedForeground font-bold mt-0.5">{workspaceMembers.length} anggota</p>
                    </div>

                    {/* Search */}
                    <div className="px-3 py-2 flex-shrink-0">
                        <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mutedForeground" />
                            <input
                                type="text"
                                placeholder="Cari..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-muted border border-border rounded-lg py-1.5 pl-7 pr-3 text-xs font-medium outline-none focus:border-accent transition-colors text-foreground"
                            />
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex px-3 gap-1 mb-2 flex-shrink-0">
                        {(['groups', 'dm', 'members'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setSidebarTab(tab)}
                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${sidebarTab === tab ? 'bg-accent text-white' : 'text-mutedForeground hover:text-foreground'}`}
                            >
                                {tab === 'groups' ? 'Groups' : tab === 'dm' ? 'DM' : 'Members'}
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 custom-scrollbar">
                        {sidebarTab === 'groups' && (
                            <>
                                {filteredGroups.map(g => {
                                    const isActive = activeGroup?.id === g.id && chatMode === 'workspace';
                                    const unread = unreadCounts[g.id] || 0;
                                    return (
                                        <button
                                            key={g.id}
                                            onClick={() => { setActiveGroup(g); setChatMode('workspace'); }}
                                            className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-all text-left ${isActive ? 'bg-accent/10 text-accent' : 'hover:bg-muted text-foreground'}`}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {g.icon?.startsWith('data:') ? (
                                                    <img src={g.icon} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Hash size={14} className={isActive ? 'text-accent' : 'text-mutedForeground'} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{g.name}</p>
                                            </div>
                                            {unread > 0 && (
                                                <span className="w-5 h-5 bg-accent text-white text-[9px] font-black rounded-full flex items-center justify-center flex-shrink-0">
                                                    {unread}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setShowGroupModal(true)}
                                    className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-mutedForeground hover:text-accent hover:bg-muted transition-all mt-2"
                                >
                                    <div className="w-8 h-8 rounded-lg border-2 border-dashed border-border flex items-center justify-center flex-shrink-0">
                                        <Plus size={14} />
                                    </div>
                                    <span className="text-xs font-bold">Buat Group</span>
                                </button>
                            </>
                        )}

                        {sidebarTab === 'dm' && (
                            <>
                                {dmConversations
                                    .filter(dm => dm.userName.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map(dm => {
                                        const isActive = activeDM?.userId === dm.userId && chatMode === 'dm';
                                        const unread = dmUnread[dm.userId] || 0;
                                        return (
                                            <button
                                                key={dm.userId}
                                                onClick={() => { setActiveDM(dm); setChatMode('dm'); }}
                                                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 transition-all text-left ${isActive ? 'bg-accent/10' : 'hover:bg-muted'}`}
                                            >
                                                <div className="relative flex-shrink-0">
                                                    <img src={dm.userAvatar} alt="" className="w-8 h-8 rounded-full border border-border object-cover bg-muted" />
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${dm.userStatus === 'online' ? 'bg-emerald-500' : dm.userStatus === 'idle' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-bold truncate ${isActive ? 'text-accent' : 'text-foreground'}`}>{dm.userName}</p>
                                                    <p className="text-[9px] text-mutedForeground flex items-center gap-1">
                                                        <Lock size={8} /> Encrypted
                                                    </p>
                                                </div>
                                                {unread > 0 && (
                                                    <span className="w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center flex-shrink-0">
                                                        {unread}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                            </>
                        )}

                        {sidebarTab === 'members' && (
                            <>
                                {filteredMembers
                                    .sort((a, b) => (a.online_status === 'online' ? -1 : 1))
                                    .map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => setUserInfoModal(u)}
                                            className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 hover:bg-muted transition-all text-left"
                                        >
                                            <div className="relative flex-shrink-0">
                                                <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full border border-border object-cover bg-muted" />
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${u.online_status === 'online' ? 'bg-emerald-500' : u.online_status === 'idle' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-foreground truncate">
                                                    {u.full_name}
                                                    {u.id === currentUser.id && <span className="ml-1 text-[8px] text-accent">(Anda)</span>}
                                                </p>
                                                <p className={`text-[9px] font-bold ${u.online_status === 'online' ? 'text-emerald-500' : 'text-mutedForeground'}`}>
                                                    {u.online_status === 'online' ? 'Online' : u.online_status === 'idle' ? 'Away' : 'Offline'}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                            </>
                        )}
                    </div>
                </div>

                {/* ── Right: Chat Area ── */}
                <div className="flex-1 flex flex-col min-w-0">
                    {(activeGroup && chatMode === 'workspace') || (activeDM && chatMode === 'dm') ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-16 border-b-2 border-border flex items-center justify-between px-5 flex-shrink-0 bg-card">
                                <div className="flex items-center gap-3">
                                    {chatMode === 'dm' && activeDM ? (
                                        <>
                                            <div className="relative">
                                                <img src={activeDM.userAvatar} alt="" className="w-9 h-9 rounded-full border-2 border-border object-cover" />
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${activeDM.userStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-foreground text-sm">{activeDM.userName}</h4>
                                                <p className="text-[10px] text-mutedForeground flex items-center gap-1">
                                                    <Lock size={9} /> Pesan terenkripsi
                                                </p>
                                            </div>
                                        </>
                                    ) : activeGroup ? (
                                        <>
                                            <div className="w-9 h-9 bg-muted rounded-xl border-2 border-border flex items-center justify-center overflow-hidden">
                                                {activeGroup.icon?.startsWith('data:') ? (
                                                    <img src={activeGroup.icon} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Hash size={16} className="text-accent" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-foreground text-sm">{activeGroup.name}</h4>
                                                <p className="text-[10px] text-mutedForeground">{workspaceMembers.length} anggota</p>
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="p-2 rounded-xl hover:bg-muted text-mutedForeground hover:text-foreground transition-colors">
                                        <Search size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 custom-scrollbar">
                                {currentMessages.map((msg, idx) => {
                                    const isMe = msg.sender_id === currentUser.id;
                                    const prevMsg = currentMessages[idx - 1];
                                    const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                                    const replyMsg = msg.reply_to_id ? currentMessages.find(m => m.id === msg.reply_to_id) : null;
                                    const replyData = msg.metadata?.reply_to;

                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                            <div className={`flex gap-2 max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                {/* Avatar */}
                                                {!isMe && (
                                                    <div className="flex-shrink-0 self-end mb-1">
                                                        {showAvatar ? (
                                                            <button onClick={() => {
                                                                const member = workspaceMembers.find(m => m.id === msg.sender_id);
                                                                if (member) setUserInfoModal(member);
                                                            }}>
                                                                <img src={msg.sender_avatar} alt="" className="w-7 h-7 rounded-full border border-border object-cover bg-muted hover:ring-2 hover:ring-accent transition-all" />
                                                            </button>
                                                        ) : (
                                                            <div className="w-7" />
                                                        )}
                                                    </div>
                                                )}

                                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                    {/* Sender name */}
                                                    {!isMe && showAvatar && (
                                                        <span className="text-[10px] font-black text-mutedForeground mb-1 px-1">{msg.sender_name}</span>
                                                    )}

                                                    {/* Reply preview */}
                                                    {replyData && (
                                                        <div className={`text-[10px] px-2 py-1 rounded-lg mb-1 border-l-2 border-accent bg-muted/50 max-w-full ${isMe ? 'text-right' : 'text-left'}`}>
                                                            <span className="font-black text-accent">{replyData.name}: </span>
                                                            <span className="text-mutedForeground truncate">{replyData.content?.slice(0, 50)}</span>
                                                        </div>
                                                    )}

                                                    {/* Message bubble */}
                                                    <div className="relative">
                                                        <div
                                                            className={`px-3 py-2 rounded-2xl text-sm font-medium max-w-full break-words ${isMe
                                                                ? 'bg-accent text-white rounded-br-sm'
                                                                : 'bg-muted text-foreground border border-border rounded-bl-sm'
                                                            }`}
                                                        >
                                                            {msg.type === 'image' ? (
                                                                <button onClick={() => setPreviewImage(msg.content)}>
                                                                    <img src={msg.content} alt="img" className="max-w-[200px] max-h-[200px] rounded-xl object-cover hover:opacity-90 transition-opacity" />
                                                                </button>
                                                            ) : (
                                                                <span className="whitespace-pre-wrap">{msg.content}</span>
                                                            )}
                                                        </div>

                                                        {/* Message actions (hover) */}
                                                        <div className={`absolute top-0 ${isMe ? 'right-full mr-1' : 'left-full ml-1'} hidden group-hover:flex items-center gap-1 bg-card border border-border rounded-xl px-1.5 py-1 shadow-sm`}>
                                                            <button onClick={() => setReplyTo(msg)} className="p-1 hover:text-accent text-mutedForeground transition-colors" title="Reply">
                                                                <Reply size={12} />
                                                            </button>
                                                            <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)} className="p-1 hover:text-accent text-mutedForeground transition-colors" title="React">
                                                                <Smile size={12} />
                                                            </button>
                                                            {isMe && (
                                                                <button onClick={() => setShowDeleteConfirm(msg.id)} className="p-1 hover:text-red-500 text-mutedForeground transition-colors" title="Delete">
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Emoji picker */}
                                                        {showEmojiPicker === msg.id && (
                                                            <div className={`absolute z-50 ${isMe ? 'right-0' : 'left-0'} top-full mt-1 bg-card border-2 border-border rounded-2xl p-2 shadow-hard flex flex-wrap gap-1 w-48`}>
                                                                {COMMON_EMOJIS.map(e => (
                                                                    <button key={e} onClick={() => handleAddReaction(msg.id, e)} className="text-lg hover:scale-125 transition-transform p-0.5">
                                                                        {e}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Reactions */}
                                                    {msg.reactions && msg.reactions.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {Object.entries(
                                                                msg.reactions.reduce((acc: any, r: any) => {
                                                                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                                                    return acc;
                                                                }, {})
                                                            ).map(([emoji, count]) => (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() => handleAddReaction(msg.id, emoji)}
                                                                    className="flex items-center gap-1 px-2 py-0.5 bg-muted border border-border rounded-full text-xs hover:border-accent transition-colors"
                                                                >
                                                                    <span>{emoji}</span>
                                                                    <span className="font-bold text-mutedForeground">{count as number}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Time + read status */}
                                                    <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                        <span className="text-[9px] text-mutedForeground/60">
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {isMe && (
                                                            <span className="text-[9px] text-mutedForeground/60">
                                                                {(msg.read_by?.length || 0) > 1 ? <CheckCheck size={10} className="text-accent" /> : <Check size={10} />}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Typing indicator */}
                                {typingUsers.length > 0 && (
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-mutedForeground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-mutedForeground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-mutedForeground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <span className="text-[10px] text-mutedForeground font-bold italic">
                                            {typingUsers.join(', ')} sedang mengetik...
                                        </span>
                                    </div>
                                )}

                                <div ref={chatEndRef} />
                            </div>

                            {/* Reply preview */}
                            {replyTo && (
                                <div className="px-5 py-2 bg-muted/50 border-t border-border flex items-center justify-between flex-shrink-0">
                                    <div className="flex items-center gap-2 text-xs">
                                        <Reply size={12} className="text-accent" />
                                        <span className="font-black text-accent">{replyTo.sender_name}:</span>
                                        <span className="text-mutedForeground truncate max-w-[200px]">{replyTo.content}</span>
                                    </div>
                                    <button onClick={() => setReplyTo(null)} className="text-mutedForeground hover:text-foreground">
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Input Area */}
                            <div className="px-5 py-3 border-t-2 border-border flex-shrink-0 relative">
                                {/* Mention list */}
                                {showMentionList && (
                                    <div className="absolute bottom-full left-5 mb-2 bg-card border-2 border-border rounded-2xl shadow-hard overflow-hidden w-56 z-50">
                                        {workspaceMembers
                                            .filter(m => m.full_name.toLowerCase().includes(mentionSearch.toLowerCase()))
                                            .slice(0, 5)
                                            .map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => insertMention(m.full_name)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left"
                                                >
                                                    <img src={m.avatar_url} alt="" className="w-6 h-6 rounded-full border border-border object-cover" />
                                                    <span className="text-xs font-bold text-foreground">{m.full_name}</span>
                                                    <div className={`ml-auto w-2 h-2 rounded-full ${m.online_status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                </button>
                                            ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-2 bg-muted border-2 border-border rounded-2xl px-3 py-2 focus-within:border-accent transition-colors">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-mutedForeground hover:text-accent transition-colors flex-shrink-0"
                                    >
                                        <ImageIcon size={18} />
                                    </button>
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={handleInputChange}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                        placeholder={chatMode === 'dm' ? `Pesan ke ${activeDM?.userName}...` : `Pesan ke #${activeGroup?.name}...`}
                                        className="flex-1 bg-transparent outline-none text-sm font-medium text-foreground placeholder:text-mutedForeground"
                                    />
                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={!input.trim()}
                                        className="w-8 h-8 bg-accent text-white rounded-xl flex items-center justify-center hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-center p-8">
                            <div className="space-y-3">
                                <div className="w-16 h-16 mx-auto bg-accent/10 rounded-2xl flex items-center justify-center">
                                    <MessageSquare size={32} className="text-accent opacity-60" />
                                </div>
                                <h3 className="font-black text-foreground">Pilih channel atau DM</h3>
                                <p className="text-mutedForeground text-sm">Pilih group atau mulai percakapan baru</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modals ── */}

            {/* Image Preview */}
            {previewImage && (
                <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} alt="" className="max-w-full max-h-full rounded-2xl object-contain" />
                    <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            )}

            {/* Delete Confirm */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-hard max-w-sm w-full">
                        <h3 className="font-black text-foreground mb-2">Hapus Pesan?</h3>
                        <p className="text-mutedForeground text-sm mb-4">Pesan ini akan dihapus permanen.</p>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)} className="flex-1">Batal</Button>
                            <Button onClick={() => handleDeleteMessage(showDeleteConfirm)} className="flex-1 bg-red-500 hover:bg-red-600">Hapus</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Info Modal */}
            {userInfoModal && (
                <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4" onClick={() => setUserInfoModal(null)}>
                    <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-hard max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start gap-4 mb-4">
                            <div className="relative">
                                <img src={userInfoModal.avatar_url} alt="" className="w-16 h-16 rounded-2xl border-2 border-border object-cover" />
                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${userInfoModal.online_status === 'online' ? 'bg-emerald-500' : userInfoModal.online_status === 'idle' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-black text-foreground text-lg">{userInfoModal.full_name}</h3>
                                <p className="text-sm text-mutedForeground font-bold">{userInfoModal.role}</p>
                                <p className={`text-xs font-bold mt-1 ${userInfoModal.online_status === 'online' ? 'text-emerald-500' : 'text-mutedForeground'}`}>
                                    {userInfoModal.online_status === 'online' ? '● Online' : userInfoModal.online_status === 'idle' ? '● Away' : '● Offline'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                icon={<MessageCircle size={16} />}
                                onClick={() => {
                                    const dm: DMConversation = {
                                        userId: userInfoModal.id,
                                        userName: userInfoModal.full_name,
                                        userAvatar: userInfoModal.avatar_url,
                                        userStatus: userInfoModal.online_status,
                                        unread: 0
                                    };
                                    setActiveDM(dm);
                                    setChatMode('dm');
                                    setSidebarTab('dm');
                                    setUserInfoModal(null);
                                }}
                                className="flex-1"
                            >
                                Kirim Pesan
                            </Button>
                            <Button variant="secondary" onClick={() => setUserInfoModal(null)} className="flex-1">Tutup</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Group Modal */}
            <Modal isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} title="Buat Group Baru">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-black text-mutedForeground uppercase tracking-wider block mb-1.5">Nama Group</label>
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            placeholder="Contoh: Tim Konten IG"
                            className="w-full px-4 py-3 bg-muted border-2 border-border rounded-xl text-sm font-medium text-foreground outline-none focus:border-accent transition-colors"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setShowGroupModal(false)} className="flex-1">Batal</Button>
                        <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()} className="flex-1">Buat Group</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
