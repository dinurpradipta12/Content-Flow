import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import {
    MessageSquare, X, Users, Send, Smile, Reply, Check, CheckCheck,
    Plus, AtSign, Image as ImageIcon, Search, Trash2, Lock, Hash,
    MessageCircle, ChevronDown, Circle, Bell, BellOff, Edit2, UserMinus,
    MoreVertical, Volume2, VolumeX, Eraser, Info, ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useNotifications } from '../components/NotificationProvider';
import { useAppConfig } from '../components/AppConfigProvider';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

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
    recipient_id?: string;
    sender_name: string;
    sender_avatar: string;
    content: string;
    type: string;
    reply_to_id?: string;
    metadata: any;
    created_at: string;
    read_by?: string[];
    is_read?: boolean;
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
    custom_status?: string;
}

interface DMConversation {
    userId: string;
    userName: string;
    userAvatar: string;
    userStatus: string;
    unread: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMMON_EMOJIS = [
    '👍', '❤️', '🔥', '😂', '😮', '😢', '🙏', '💯',
    '✅', '🚀', '✨', '🙌', '😍', '🎉', '👏', '💪',
    '🤔', '😅', '🥳', '💡', '⚡', '🎯', '💎', '🌟'
];

const STATUS_OPTIONS = [
    { value: 'online', label: 'Online', color: 'bg-emerald-500', icon: '🟢' },
    { value: 'idle', label: 'Away', color: 'bg-amber-400', icon: '🟡' },
    { value: 'busy', label: 'Sibuk', color: 'bg-red-500', icon: '🔴' },
    { value: 'offline', label: 'Offline', color: 'bg-slate-400', icon: '⚫' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const encryptDM = (text: string, key: string): string => {
    try { return btoa(text.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('')); }
    catch { return text; }
};
const decryptDM = (text: string, key: string): string => {
    try { const d = atob(text); return d.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join(''); }
    catch { return text; }
};
const getDMKey = (uid1: string, uid2: string) => [uid1, uid2].sort().join('-').slice(0, 16);
const getDMConvId = (uid1: string, uid2: string) => [uid1, uid2].sort().join('_');

const playChatSound = () => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } catch { /* ignore */ }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'online': return 'bg-emerald-500';
        case 'idle': return 'bg-amber-400';
        case 'busy': return 'bg-red-500';
        default: return 'bg-slate-400';
    }
};

// Chat background pattern (subtle dots)
const CHAT_BG_STYLE: React.CSSProperties = {
    backgroundImage: `radial-gradient(circle, rgba(148,163,184,0.15) 1px, transparent 1px)`,
    backgroundSize: '20px 20px'
};

// ─── Chat Notification Popup ──────────────────────────────────────────────────

interface ChatNotifPopup {
    id: string;
    senderName: string;
    senderAvatar: string;
    content: string;
    groupName?: string;
    isDM: boolean;
    senderId: string;
    groupId?: string;
    recipientId?: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const Messages: React.FC = () => {
    const { config } = useAppConfig();
    const { sendNotification } = useNotifications();
    const navigate = useNavigate();

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
    const [showContentMentionList, setShowContentMentionList] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [contentMentionSearch, setContentMentionSearch] = useState('');
    const [contentItems, setContentItems] = useState<any[]>([]);
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarTab, setSidebarTab] = useState<'groups' | 'dm' | 'members'>('groups');
    // Mobile: 'list' shows sidebar, 'chat' shows chat area
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

    // DM State
    const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
    const [activeDM, setActiveDM] = useState<DMConversation | null>(null);
    const [dmMessages, setDmMessages] = useState<ChatMessage[]>([]);
    const [dmUnread, setDmUnread] = useState<Record<string, number>>({});
    const [dmLatestMessages, setDmLatestMessages] = useState<Record<string, { content: string, time: string, isRead: boolean, isMine: boolean }>>({});

    // Typing
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const typingTimerRef = useRef<any>(null);
    const isTypingRef = useRef(false);

    // UI State
    const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
    const [showInputEmoji, setShowInputEmoji] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [userInfoModal, setUserInfoModal] = useState<WorkspaceMember | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [chatMode, setChatMode] = useState<'workspace' | 'dm'>('workspace');
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(localStorage.getItem('user_status') || 'online');
    const [customStatus, setCustomStatus] = useState('');

    // Chat header more menu
    const [showChatMoreMenu, setShowChatMoreMenu] = useState(false);
    const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
    const chatMoreMenuRef = useRef<HTMLDivElement>(null);

    // Workspace dropdown
    const [showWsDropdown, setShowWsDropdown] = useState(false);
    const wsDropdownRef = useRef<HTMLDivElement>(null);

    // Content detail modal & clear DM
    const [contentDetailId, setContentDetailId] = useState<string | null>(null);
    const [clearDMTarget, setClearDMTarget] = useState<WorkspaceMember | null>(null);

    // DM user context menu
    const [dmUserMenu, setDmUserMenu] = useState<string | null>(null);
    const dmUserMenuRef = useRef<HTMLDivElement>(null);

    // Group management state
    const [groupMenuOpen, setGroupMenuOpen] = useState<string | null>(null); // group id
    const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState<ChatGroup | null>(null);
    const [showEditGroupModal, setShowEditGroupModal] = useState<ChatGroup | null>(null);
    const [editGroupName, setEditGroupName] = useState('');
    const [editGroupMembers, setEditGroupMembers] = useState<string[]>([]);
    const [mutedGroups, setMutedGroups] = useState<Set<string>>(() => {
        try { return new Set(JSON.parse(localStorage.getItem('muted_groups') || '[]')); }
        catch { return new Set(); }
    });

    // Chat notification popup
    const [chatNotifPopup, setChatNotifPopup] = useState<ChatNotifPopup | null>(null);
    const [notifReplyInput, setNotifReplyInput] = useState('');
    const notifTimerRef = useRef<any>(null);

    // Refs
    const activeGroupRef = useRef<ChatGroup | null>(null);
    const activeDMRef = useRef<DMConversation | null>(null);
    const selectedWorkspaceRef = useRef<Workspace | null>(null);
    const workspacesRef = useRef<Workspace[]>([]);
    const messagesRef = useRef<ChatMessage[]>([]);
    const currentUserRef = useRef(currentUser);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const globalChannelRef = useRef<any>(null);
    const dmChannelRef = useRef<any>(null);
    const typingChannelRef = useRef<any>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const inputEmojiRef = useRef<HTMLDivElement>(null);
    const statusPickerRef = useRef<HTMLDivElement>(null);
    const groupMenuRef = useRef<HTMLDivElement>(null);
    const mutedGroupsRef = useRef(mutedGroups);

    // Sync refs
    useEffect(() => { activeGroupRef.current = activeGroup; }, [activeGroup]);
    useEffect(() => { activeDMRef.current = activeDM; }, [activeDM]);
    useEffect(() => { selectedWorkspaceRef.current = selectedWorkspace; }, [selectedWorkspace]);
    useEffect(() => { workspacesRef.current = workspaces; }, [workspaces]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { mutedGroupsRef.current = mutedGroups; }, [mutedGroups]);

    // Close pickers on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(null);
            }
            if (inputEmojiRef.current && !inputEmojiRef.current.contains(e.target as Node)) {
                setShowInputEmoji(false);
            }
            if (statusPickerRef.current && !statusPickerRef.current.contains(e.target as Node)) {
                setShowStatusPicker(false);
            }
            if (groupMenuRef.current && !groupMenuRef.current.contains(e.target as Node)) {
                setGroupMenuOpen(null);
            }
            if (chatMoreMenuRef.current && !chatMoreMenuRef.current.contains(e.target as Node)) {
                // Use setTimeout to avoid race condition with click handlers on dropdown items
                setTimeout(() => setShowChatMoreMenu(false), 0);
            }
            if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target as Node)) {
                setShowWsDropdown(false);
            }
            if (dmUserMenuRef.current && !dmUserMenuRef.current.contains(e.target as Node)) {
                setDmUserMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // ── Persist workspace selection ────────────────────────────────────────────
    useEffect(() => {
        if (selectedWorkspace?.id) {
            localStorage.setItem('selected_workspace_id', selectedWorkspace.id);
        }
    }, [selectedWorkspace]);

    // ── Initial Fetch ──────────────────────────────────────────────────────────
    useEffect(() => {
        fetchWorkspaces();
        fetchDMSummaries();
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
            fetchContentItems(selectedWorkspace.id);
            setUnreadCounts(prev => ({ ...prev, [selectedWorkspace.id]: 0 }));
        }
    }, [selectedWorkspace]);

    useEffect(() => { if (activeGroup) fetchMessages(activeGroup.id); }, [activeGroup]);
    useEffect(() => { if (activeDM) fetchDMMessages(activeDM.userId); }, [activeDM]);
    useEffect(() => {
        setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 100);
    }, [messages.length, dmMessages.length, chatMode, activeGroup?.id, activeDM?.userId]);

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
            // Restore last selected workspace from localStorage, or use first
            const savedWsId = localStorage.getItem('selected_workspace_id');
            const savedWs = savedWsId ? myWorkspaces.find(ws => ws.id === savedWsId) : null;
            if (savedWs) setSelectedWorkspace(savedWs);
            else if (myWorkspaces.length > 0) setSelectedWorkspace(myWorkspaces[0]);
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
        const { data } = await supabase.from('app_users').select('id, full_name, avatar_url, role, online_status, last_activity_at');
        if (data) {
            const members = data.filter(u =>
                ws.members?.includes(u.id) || ws.members?.includes(u.avatar_url) ||
                u.id === ws.admin_id || u.id === ws.owner_id
            );
            setWorkspaceMembers(members as WorkspaceMember[]);
            const dms: DMConversation[] = members
                .filter(u => u.id !== currentUser.id)
                .map(u => ({ userId: u.id, userName: u.full_name, userAvatar: u.avatar_url, userStatus: u.online_status || 'offline', unread: dmUnread[u.id] || 0 }));
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
            const decrypted = data.map(msg => ({ ...msg, content: msg.type === 'image' ? msg.content : decryptDM(msg.content, key) }));
            setDmMessages(decrypted);
            await supabase.from('direct_messages').update({ is_read: true }).eq('recipient_id', currentUser.id).eq('sender_id', otherUserId).eq('is_read', false);
            setDmUnread(prev => ({ ...prev, [otherUserId]: 0 }));
            setDmLatestMessages(prev => {
                if (prev[otherUserId] && !prev[otherUserId].isRead && !prev[otherUserId].isMine) {
                    return { ...prev, [otherUserId]: { ...prev[otherUserId], isRead: true } };
                }
                return prev;
            });
        }
    };

    const fetchDMSummaries = async () => {
        const { data } = await supabase
            .from('direct_messages')
            .select('*')
            .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (data) {
            const latest: Record<string, { content: string, time: string, isRead: boolean, isMine: boolean }> = {};
            data.forEach(msg => {
                const otherUser = msg.sender_id === currentUser.id ? msg.recipient_id : msg.sender_id;
                if (!latest[otherUser]) {
                    const key = getDMKey(currentUser.id, otherUser);
                    const content = msg.type === 'image' ? '🖼️ Photo' : decryptDM(msg.content, key);
                    latest[otherUser] = {
                        content,
                        time: msg.created_at,
                        isRead: msg.is_read || false,
                        isMine: msg.sender_id === currentUser.id
                    };
                }
            });
            setDmLatestMessages(latest);
        }
    };

    const fetchContentItems = async (wsId: string) => {
        const { data } = await supabase.from('content_items').select('id, title, status, platform, workspace_id').eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(50);
        if (data) setContentItems(data);
    };

    const markMessagesAsRead = async (msgIds: string[], groupId: string) => {
        if (!msgIds.length || !currentUser.id) return;
        const reads = msgIds.map(id => ({ message_id: id, user_id: currentUser.id, group_id: groupId }));
        await supabase.from('workspace_chat_reads').upsert(reads, { onConflict: 'message_id,user_id' });
    };

    // ── Realtime ───────────────────────────────────────────────────────────────
    const setupGlobalRealtime = (wsList: Workspace[]) => {
        if (!wsList.length) return;
        if (globalChannelRef.current) supabase.removeChannel(globalChannelRef.current);
        const channel = supabase.channel('global-workspace-chat')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workspace_chat_messages' }, (payload) => handleNewMessage(payload.new as ChatMessage))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workspace_chat_reads' }, (payload) => handleNewRead(payload.new))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_chat_reactions' }, (payload) => handleReactionChange(payload))
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
                    const decryptedMsg = { ...msg, content: msg.type === 'image' ? msg.content : decryptDM(msg.content, key) };

                    setDmLatestMessages(prev => ({
                        ...prev,
                        [otherUserId]: {
                            content: decryptedMsg.type === 'image' ? '🖼️ Photo' : decryptedMsg.content,
                            time: msg.created_at,
                            isRead: msg.is_read || false,
                            isMine: msg.sender_id === currentUser.id
                        }
                    }));

                    if (activeDMRef.current?.userId === otherUserId) {
                        setDmMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, decryptedMsg]);
                        if (msg.sender_id !== currentUser.id) supabase.from('direct_messages').update({ is_read: true }).eq('id', msg.id);
                    } else if (msg.sender_id !== currentUser.id) {
                        setDmUnread(prev => ({ ...prev, [otherUserId]: (prev[otherUserId] || 0) + 1 }));
                        playChatSound();
                        showChatNotifPopup({
                            id: msg.id,
                            senderName: msg.sender_name || 'Seseorang',
                            senderAvatar: msg.sender_avatar || '',
                            content: decryptedMsg.content,
                            isDM: true,
                            senderId: msg.sender_id,
                            recipientId: msg.recipient_id,
                        });
                    }
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages' }, (payload) => {
                const msg = payload.new as any;
                if (msg.recipient_id === currentUser.id || msg.sender_id === currentUser.id) {
                    const otherUserId = msg.sender_id === currentUser.id ? msg.recipient_id : msg.sender_id;
                    setDmLatestMessages(prev => {
                        if (prev[otherUserId] && prev[otherUserId].time <= msg.created_at) {
                            return { ...prev, [otherUserId]: { ...prev[otherUserId], isRead: msg.is_read || false } };
                        }
                        return prev;
                    });
                    setDmMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: msg.is_read } : m));
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
                const contextId = activeGroupRef.current?.id || (activeDMRef.current ? getDMConvId(currentUser.id, activeDMRef.current.userId) : null);
                if (data.context_id === contextId) {
                    setTypingUsers(prev => {
                        if (payload.eventType === 'DELETE') return prev.filter(n => n !== data.user_name);
                        if (!prev.includes(data.user_name)) return [...prev, data.user_name];
                        return prev;
                    });
                    setTimeout(() => setTypingUsers(prev => prev.filter(n => n !== data.user_name)), 3000);
                }
            })
            .subscribe();
        typingChannelRef.current = channel;
    };

    // ── Chat Notification Popup ────────────────────────────────────────────────
    const showChatNotifPopup = (notif: ChatNotifPopup) => {
        setChatNotifPopup(notif);
        setNotifReplyInput('');
        if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
        notifTimerRef.current = setTimeout(() => setChatNotifPopup(null), 8000);
    };

    const handleNotifReply = async () => {
        if (!notifReplyInput.trim() || !chatNotifPopup) return;
        if (chatNotifPopup.isDM) {
            const key = getDMKey(currentUser.id, chatNotifPopup.senderId);
            const encryptedContent = encryptDM(notifReplyInput, key);
            await supabase.from('direct_messages').insert({
                sender_id: currentUser.id, recipient_id: chatNotifPopup.senderId,
                content: encryptedContent, type: 'text', metadata: {}
            });
        }
        setNotifReplyInput('');
        setChatNotifPopup(null);
    };

    // ── Message Handlers ───────────────────────────────────────────────────────
    const handleNewRead = (newRead: any) => {
        setMessages(prev => prev.map(msg =>
            msg.id === newRead.message_id ? { ...msg, read_by: Array.from(new Set([...(msg.read_by || []), newRead.user_id])) } : msg
        ));
    };

    const handleReactionChange = (payload: any) => {
        if (payload.eventType === 'INSERT') {
            const reaction = payload.new;
            setMessages(prev => prev.map(msg =>
                msg.id === reaction.message_id ? { ...msg, reactions: [...(msg.reactions || []), reaction] } : msg
            ));
        } else if (payload.eventType === 'DELETE') {
            const reaction = payload.old;
            setMessages(prev => prev.map(msg =>
                msg.id === reaction.message_id ? { ...msg, reactions: (msg.reactions || []).filter(r => r.id !== reaction.id) } : msg
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
            const groupId = msg.group_id;
            const isMuted = groupId ? mutedGroupsRef.current.has(groupId) : false;
            if (!isMuted) {
                playChatSound();
            }
            // Show group message notification popup
            if (!isActiveGroup) {
                const groupName = groups.find(g => g.id === msg.group_id)?.name;
                showChatNotifPopup({
                    id: msg.id,
                    senderName: msg.sender_name,
                    senderAvatar: msg.sender_avatar,
                    content: msg.content,
                    groupName,
                    isDM: false,
                    senderId: msg.sender_id,
                    groupId: msg.group_id,
                });
            }
            if (msg.content.includes(`@${currentUserRef.current.name}`) || msg.content.includes('@everyone')) {
                sendNotification({ recipientId: currentUserRef.current.id, type: 'MENTION', title: `Disebut di workspace`, content: `${msg.sender_name}: ${msg.content}`, metadata: { workspace_id: wsId } });
            }
        }
    };

    // ── Typing ─────────────────────────────────────────────────────────────────
    const handleTyping = useCallback(async () => {
        const contextId = activeGroup?.id || (activeDM ? getDMConvId(currentUser.id, activeDM.userId) : null);
        if (!contextId || !currentUser.id) return;
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            await supabase.from('chat_typing').upsert({ user_id: currentUser.id, user_name: currentUser.name, context_type: activeGroup ? 'group' : 'dm', context_id: contextId, updated_at: new Date().toISOString() }, { onConflict: 'user_id,context_id' });
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
        if (chatMode === 'dm' && activeDM) await sendDMMessage(fileUrl, fileType);
        else await sendGroupMessage(fileUrl, fileType);
    };

    const sendGroupMessage = async (fileUrl?: string, fileType?: string) => {
        if (!activeGroup || !selectedWorkspace || !currentUser.id) return;
        const content = input;
        const msgType = fileType || 'text';
        const tempId = `temp-${Date.now()}`;
        const optimisticMsg: ChatMessage = {
            id: tempId, group_id: activeGroup.id, workspace_id: selectedWorkspace.id,
            sender_id: currentUser.id, sender_name: currentUser.name, sender_avatar: currentUser.avatar,
            content: fileUrl || content, type: msgType, reply_to_id: replyTo?.id,
            metadata: { reply_to: replyTo ? { name: replyTo.sender_name, content: replyTo.content } : null },
            created_at: new Date().toISOString(), read_by: [currentUser.id], reactions: []
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setInput(''); setReplyTo(null);
        const { data } = await supabase.from('workspace_chat_messages').insert({
            group_id: optimisticMsg.group_id, workspace_id: optimisticMsg.workspace_id,
            sender_id: optimisticMsg.sender_id, sender_name: optimisticMsg.sender_name,
            sender_avatar: optimisticMsg.sender_avatar, content: optimisticMsg.content,
            type: optimisticMsg.type, reply_to_id: optimisticMsg.reply_to_id, metadata: optimisticMsg.metadata
        }).select().single();
        if (data) {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...data, read_by: [currentUser.id], reactions: [] } : m));
            if (content.includes('@')) {
                const mentions = content.match(/@([\w\s]+)/g);
                if (mentions) {
                    for (const m of mentions) {
                        const name = m.slice(1).trim();
                        const user = workspaceMembers.find(u => u.full_name.toLowerCase().includes(name.toLowerCase()));
                        if (user && user.id !== currentUser.id) {
                            sendNotification({ recipientId: user.id, type: 'MENTION', title: `${currentUser.name} menyebut anda`, content, metadata: { workspace_id: selectedWorkspace.id } });
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
            id: tempId, sender_id: currentUser.id, recipient_id: activeDM.userId,
            sender_name: currentUser.name, sender_avatar: currentUser.avatar,
            content, type: msgType, reply_to_id: replyTo?.id,
            metadata: { reply_to: replyTo ? { name: replyTo.sender_name, content: replyTo.content } : null },
            created_at: new Date().toISOString(), reactions: []
        };
        setDmMessages(prev => [...prev, optimisticMsg]);
        setInput(''); setReplyTo(null);
        const { data } = await supabase.from('direct_messages').insert({
            sender_id: currentUser.id, recipient_id: activeDM.userId,
            content: encryptedContent, type: msgType, reply_to_id: replyTo?.id, metadata: optimisticMsg.metadata
        }).select().single();
        if (data) setDmMessages(prev => prev.map(m => m.id === tempId ? { ...data, content } : m));
    };

    const handleAddReaction = async (messageId: string, emoji: string) => {
        setShowEmojiPicker(null);
        // Determine which message list to use based on chat mode
        const msgList = chatMode === 'dm' ? dmMessages : messages;
        const setMsgList = chatMode === 'dm' ? setDmMessages : setMessages;
        const existingReaction = msgList.find(m => m.id === messageId)?.reactions?.find(r => r.user_id === currentUser.id && r.emoji === emoji);
        if (existingReaction) {
            // Remove reaction
            setMsgList(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, reactions: (msg.reactions || []).filter(r => !(r.user_id === currentUser.id && r.emoji === emoji)) } : msg
            ));
            await supabase.from('workspace_chat_reactions').delete().eq('message_id', messageId).eq('user_id', currentUser.id).eq('emoji', emoji);
        } else {
            // Add reaction — first try to delete any existing one to avoid 409 conflict
            await supabase.from('workspace_chat_reactions').delete().eq('message_id', messageId).eq('user_id', currentUser.id).eq('emoji', emoji);
            const newReaction = { id: `temp-${Date.now()}`, message_id: messageId, user_id: currentUser.id, emoji, group_id: activeGroup?.id };
            setMsgList(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, reactions: [...(msg.reactions || []), newReaction] } : msg
            ));
            // Use upsert with ignoreDuplicates to silently handle 'already exists' without HTTP 409
            const { error: insertErr } = await supabase.from('workspace_chat_reactions').upsert(
                { message_id: messageId, user_id: currentUser.id, emoji, group_id: activeGroup?.id },
                { onConflict: 'message_id,user_id,emoji', ignoreDuplicates: true }
            );

            if (insertErr) {
                // Rollback on other errors
                setMsgList(prev => prev.map(msg =>
                    msg.id === messageId ? { ...msg, reactions: (msg.reactions || []).filter(r => r.id !== newReaction.id) } : msg
                ));
            }
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
            handleSendMessage(base64, file.type.startsWith('image/') ? 'image' : 'file');
        };
        reader.readAsDataURL(file);
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || !selectedWorkspace || !currentUser.id) return;
        const { data: group } = await supabase.from('workspace_chat_groups').insert({
            name: newGroupName, workspace_id: selectedWorkspace.id, icon: 'users', created_by: currentUser.id
        }).select().single();
        if (group) {
            setGroups(prev => [...prev, group]);
            setActiveGroup(group);
            setShowGroupModal(false);
            setNewGroupName('');
        }
    };

    // ── Clear Chat ─────────────────────────────────────────────────────────────
    const handleClearChat = async () => {
        setShowClearChatConfirm(false);
        setShowChatMoreMenu(false);
        if (chatMode === 'dm' && activeDM) {
            // Delete DM messages from DB
            const { error } = await supabase.from('direct_messages')
                .delete()
                .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${activeDM.userId}),and(sender_id.eq.${activeDM.userId},recipient_id.eq.${currentUser.id})`);
            if (!error) setDmMessages([]);
        } else if (chatMode === 'workspace' && activeGroup) {
            // Clear all messages in group
            const { error } = await supabase.from('workspace_chat_messages').delete().eq('group_id', activeGroup.id);
            if (!error) setMessages([]);
        }
    };

    const handleClearSpecificDM = async (user: WorkspaceMember) => {
        setClearDMTarget(null);
        const { error } = await supabase.from('direct_messages')
            .delete()
            .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${user.id}),and(sender_id.eq.${user.id},recipient_id.eq.${currentUser.id})`);
        if (!error) {
            if (activeDM?.userId === user.id) setDmMessages([]);
            setDmLatestMessages(prev => {
                const next = { ...prev };
                delete next[user.id];
                return next;
            });
        }
    };

    // ── Group Management ───────────────────────────────────────────────────────
    const handleDeleteGroup = async (group: ChatGroup) => {
        await supabase.from('workspace_chat_messages').delete().eq('group_id', group.id);
        await supabase.from('workspace_chat_groups').delete().eq('id', group.id);
        setGroups(prev => prev.filter(g => g.id !== group.id));
        if (activeGroup?.id === group.id) {
            const remaining = groups.filter(g => g.id !== group.id);
            setActiveGroup(remaining.length > 0 ? remaining[0] : null);
        }
        setShowDeleteGroupConfirm(null);
    };

    const handleOpenEditGroup = (group: ChatGroup) => {
        setShowEditGroupModal(group);
        setEditGroupName(group.name);
        // Pre-select all current workspace members
        setEditGroupMembers(workspaceMembers.map(m => m.id));
        setGroupMenuOpen(null);
    };

    const handleSaveEditGroup = async () => {
        if (!showEditGroupModal || !editGroupName.trim()) return;
        await supabase.from('workspace_chat_groups').update({ name: editGroupName }).eq('id', showEditGroupModal.id);
        setGroups(prev => prev.map(g => g.id === showEditGroupModal.id ? { ...g, name: editGroupName } : g));
        if (activeGroup?.id === showEditGroupModal.id) {
            setActiveGroup(prev => prev ? { ...prev, name: editGroupName } : prev);
        }
        setShowEditGroupModal(null);
    };

    const toggleMuteGroup = (groupId: string) => {
        setMutedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            localStorage.setItem('muted_groups', JSON.stringify(Array.from(next)));
            return next;
        });
        setGroupMenuOpen(null);
    };

    const handleUpdateStatus = async (status: string) => {
        setCurrentStatus(status);
        localStorage.setItem('user_status', status);
        setShowStatusPicker(false);
        await supabase.from('app_users').update({ online_status: status }).eq('id', currentUser.id);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInput(val);
        handleTyping();

        const lastAt = val.lastIndexOf('@');
        const lastHash = val.lastIndexOf('#');
        const cursorPos = e.target.selectionStart || 0;

        if (lastAt !== -1 && lastAt < cursorPos && (lastAt === 0 || val[lastAt - 1] === ' ')) {
            setMentionSearch(val.slice(lastAt + 1, cursorPos));
            setShowMentionList(true);
            setShowContentMentionList(false);
        } else if (lastHash !== -1 && lastHash < cursorPos && (lastHash === 0 || val[lastHash - 1] === ' ')) {
            setContentMentionSearch(val.slice(lastHash + 1, cursorPos));
            setShowContentMentionList(true);
            setShowMentionList(false);
        } else {
            setShowMentionList(false);
            setShowContentMentionList(false);
        }
    };

    const insertMention = (name: string) => {
        const lastAt = input.lastIndexOf('@');
        setInput(input.slice(0, lastAt) + `@${name} `);
        setShowMentionList(false);
    };

    const insertContentMention = (item: any) => {
        const lastHash = input.lastIndexOf('#');
        setInput(input.slice(0, lastHash) + `#[${item.title}](content:${item.id}) `);
        setShowContentMentionList(false);
    };

    // ── Computed ───────────────────────────────────────────────────────────────
    const onlineCount = workspaceMembers.filter(m => m.online_status === 'online').length;
    const totalUnread = (Object.values(unreadCounts) as number[]).reduce((a, b) => a + b, 0) + (Object.values(dmUnread) as number[]).reduce((a, b) => a + b, 0);
    const currentMessages = chatMode === 'dm' ? dmMessages : messages;
    const filteredMembers = workspaceMembers.filter(m => m.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const renderMessageContent = (content: string, isMe?: boolean) => {
        const parts = content.split(/(#\[[^\]]+\]\(content:[^)]+\)|https?:\/\/[^\s]+)/g);
        return parts.map((part, i) => {
            const contentMatch = part.match(/^#\[([^\]]+)\]\(content:([^)]+)\)$/);
            if (contentMatch) {
                const contentId = contentMatch[2];
                return (
                    <button
                        key={i}
                        onClick={() => setContentDetailId(contentId)}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded font-bold text-xs transition-colors ${isMe ? 'bg-amber-400/20 text-amber-200 hover:bg-amber-400/30' : 'bg-accent/20 text-accent hover:bg-accent/30'}`}
                    >
                        <Hash size={10} /> {contentMatch[1]}
                    </button>
                );
            }
            if (part.match(/^https?:\/\//)) {
                return (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={`underline font-medium ${isMe ? 'text-blue-200 hover:text-blue-100' : 'text-blue-500 hover:text-blue-600'}`}>
                        {part}
                    </a>
                );
            }

            // Detect basic @ mentions for styling
            const mentionParts = part.split(/(@\w+)/g);
            return (
                <span key={i}>
                    {mentionParts.map((mp, j) => {
                        if (mp.startsWith('@')) {
                            return <span key={j} className={`font-bold px-1 rounded-md ${isMe ? 'bg-white/20 text-white' : 'bg-accent/10 text-accent'}`}>{mp}</span>;
                        }
                        return <span key={j}>{mp}</span>;
                    })}
                </span>
            );
        });
    };

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
        <>
            {/* ═══════════════════════════════════════════════════════════════════
            MOBILE VIEW (< md) - Telegram/Slack Style
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="block md:hidden flex flex-col h-[calc(100vh-140px)] overflow-hidden animate-in fade-in duration-300">
                {mobileView === 'list' ? (
                    /* ── Conversation List ── */
                    <div className="flex flex-col h-full">
                        {/* Header */}
                        <div className="flex items-center justify-between px-1 pb-2 flex-shrink-0">
                            <h2 className="text-base font-black text-foreground">Pesan</h2>
                        </div>

                        {/* Workspace name header */}
                        <div className="flex items-center gap-2 px-1 pb-2 flex-shrink-0">
                            <h3 className="text-sm font-black text-foreground truncate">{selectedWorkspace?.name || 'Workspace'}</h3>
                            <span className="text-[9px] text-mutedForeground font-bold">{workspaceMembers.length} anggota</span>
                        </div>

                        {/* Workspace dropdown capsule */}
                        <div className="relative mb-2 flex-shrink-0" ref={wsDropdownRef}>
                            <button
                                onClick={() => setShowWsDropdown(!showWsDropdown)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-bold text-foreground hover:border-accent/50 transition-all w-full"
                            >
                                {selectedWorkspace?.logo_url ? <img src={selectedWorkspace.logo_url} alt="" className="w-4 h-4 rounded object-contain" /> : null}
                                <span className="truncate flex-1 text-left">{selectedWorkspace?.name || 'Pilih Workspace'}</span>
                                <ChevronDown size={12} className={`text-mutedForeground transition-transform ${showWsDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showWsDropdown && (
                                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border-2 border-border rounded-xl shadow-hard overflow-hidden">
                                    {workspaces.map(ws => {
                                        const isSelected = selectedWorkspace?.id === ws.id;
                                        const wsUnread = unreadCounts[ws.id] || 0;
                                        return (
                                            <button key={ws.id} onClick={() => {
                                                setSelectedWorkspace(ws); setChatMode('workspace');
                                                const wsGroups = groups.filter(g => g.workspace_id === ws.id);
                                                if (wsGroups.length > 0) { setActiveGroup(wsGroups[0]); setMobileView('chat'); }
                                                setShowWsDropdown(false);
                                            }}
                                                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-bold transition-colors ${isSelected ? 'bg-accent/10 text-accent' : 'text-foreground hover:bg-muted'}`}>
                                                {ws.logo_url ? <img src={ws.logo_url} alt="" className="w-5 h-5 rounded object-contain" /> : <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[9px] font-black text-mutedForeground">{ws.name.charAt(0)}</div>}
                                                <span className="truncate flex-1">{ws.name}</span>
                                                {isSelected && <span className="text-accent text-[10px]">✓</span>}
                                                {wsUnread > 0 && <span className="min-w-[16px] h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1">{wsUnread > 9 ? '9+' : wsUnread}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Search */}
                        <div className="relative mb-2 flex-shrink-0">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-mutedForeground" />
                            <input type="text" placeholder="Cari chat..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-muted border border-border rounded-xl py-2 pl-8 pr-3 text-xs font-medium outline-none focus:border-accent text-foreground" />
                        </div>

                        {/* Unified Conversation List */}
                        <div className="flex-1 overflow-y-auto space-y-0.5">
                            {/* Channels Section */}
                            <div className="mb-3">
                                <div className="flex items-center justify-between px-1 py-1">
                                    <span className="text-[9px] font-black text-mutedForeground uppercase tracking-widest">Channels</span>
                                    <button onClick={() => setShowGroupModal(true)} className="p-0.5 rounded hover:bg-muted text-mutedForeground hover:text-accent transition-colors">
                                        <Plus size={12} />
                                    </button>
                                </div>
                                {filteredGroups.map(g => {
                                    const isActive = activeGroup?.id === g.id && chatMode === 'workspace';
                                    const unread = unreadCounts[g.id] || 0;
                                    const isMuted = mutedGroups.has(g.id);
                                    return (
                                        <button key={g.id} onClick={() => { setActiveGroup(g); setChatMode('workspace'); setMobileView('chat'); }}
                                            className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all ${isActive ? 'bg-accent/10' : 'hover:bg-muted'}`}>
                                            <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
                                                {g.icon?.startsWith('data:') ? <img src={g.icon} className="w-full h-full object-cover rounded-xl" /> : <Hash size={16} className={isActive ? 'text-accent' : 'text-mutedForeground'} />}
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className={`text-sm font-bold truncate ${isActive ? 'text-accent' : 'text-foreground'}`}>{g.name}</p>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {isMuted && <VolumeX size={10} className="text-mutedForeground" />}
                                                {unread > 0 && !isMuted && <span className="min-w-[18px] h-[18px] bg-accent text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">{unread}</span>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Direct Messages Section */}
                            <div>
                                <div className="px-1 py-1">
                                    <span className="text-[9px] font-black text-mutedForeground uppercase tracking-widest">Direct Messages</span>
                                </div>
                                {(() => {
                                    const dmEntries = workspaceMembers
                                        .filter(u => u.id !== currentUser.id)
                                        .filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(u => {
                                            const isActive = activeDM?.userId === u.id && chatMode === 'dm';
                                            const unread = dmUnread[u.id] || 0;
                                            const isOnline = u.online_status === 'online';
                                            const isBusy = u.online_status === 'busy';
                                            const isIdle = u.online_status === 'idle';
                                            return { ...u, isActive, unread, isOnline, isBusy, isIdle };
                                        })
                                        .sort((a, b) => {
                                            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
                                            if ((a.unread > 0) !== (b.unread > 0)) return a.unread > 0 ? -1 : 1;
                                            if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
                                            if ((a.isBusy || a.isIdle) !== (b.isBusy || b.isIdle)) return (a.isBusy || a.isIdle) ? -1 : 1;
                                            return a.full_name.localeCompare(b.full_name);
                                        });

                                    return dmEntries.map(u => (
                                        <div key={u.id} className={`w-full relative group rounded-xl transition-all ${u.isActive ? 'bg-accent/10' : 'hover:bg-muted'}`}>
                                            <button onClick={() => {
                                                const dm: DMConversation = { userId: u.id, userName: u.full_name, userAvatar: u.avatar_url, userStatus: u.online_status, unread: 0 };
                                                setActiveDM(dm); setChatMode('dm'); setMobileView('chat');
                                            }}
                                                className="w-full flex items-center gap-3 px-2 py-2 text-left">
                                                <div className="relative flex-shrink-0">
                                                    <img src={u.avatar_url} alt="" className="w-10 h-10 md:w-11 md:h-11 rounded-full border border-border object-cover bg-muted" />
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(u.online_status)}`} />
                                                </div>
                                                <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-center">
                                                    <div className="flex items-center justify-between">
                                                        <p className={`text-sm font-bold truncate ${u.isActive ? 'text-accent' : 'text-foreground'}`}>{u.full_name}</p>
                                                        {dmLatestMessages[u.id] && <span className="text-[9px] text-mutedForeground font-medium ml-2 flex-shrink-0 flex items-center gap-1">{new Date(dmLatestMessages[u.id].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                                    </div>
                                                    {dmLatestMessages[u.id] ? (
                                                        <div className="flex items-center gap-1 mt-0.5 max-w-[85%]">
                                                            {dmLatestMessages[u.id].isMine && (
                                                                <div className="flex-shrink-0">
                                                                    {dmLatestMessages[u.id].isRead ? <CheckCheck size={12} className="text-accent" /> : <Check size={12} className="text-mutedForeground" />}
                                                                </div>
                                                            )}
                                                            <p className={`text-xs truncate ${!dmLatestMessages[u.id].isRead && !dmLatestMessages[u.id].isMine ? 'font-black text-foreground' : 'text-mutedForeground font-medium'}`}>
                                                                {dmLatestMessages[u.id].content}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] font-bold text-mutedForeground mt-0.5">Ketuk untuk mulai chat</p>
                                                    )}
                                                </div>
                                                {u.unread > 0 && (
                                                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                                        <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1">
                                                            {u.unread > 99 ? '99+' : u.unread}
                                                        </span>
                                                    </div>
                                                )}
                                            </button>

                                            {/* Context Menu Button Mobile */}
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDmUserMenu(dmUserMenu === u.id ? null : u.id); }}
                                                    className="p-2 mr-2 rounded bg-card/80 backdrop-blur-sm text-mutedForeground hover:text-foreground shadow-sm border border-border"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>
                                                {dmUserMenu === u.id && (
                                                    <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 w-40 bg-card border-2 border-border rounded-xl shadow-hard z-[9999] overflow-hidden" ref={dmUserMenuRef}>
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setUserInfoModal(u); setDmUserMenu(null); }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-left hover:bg-muted text-foreground"
                                                        >
                                                            <Info size={12} /> Info User
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setClearDMTarget(u); setDmUserMenu(null); }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-left hover:bg-red-50 text-red-500"
                                                        >
                                                            <Trash2 size={12} /> Kosongkan Chat
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── Chat View (Full Screen) ── */
                    <div className="flex flex-col h-full">
                        {/* Chat Header */}
                        <div className="flex items-center gap-2 px-1 pb-2 flex-shrink-0 border-b border-border">
                            <button onClick={() => setMobileView('list')} className="p-1.5 rounded-xl bg-muted text-foreground flex-shrink-0">
                                <X size={16} />
                            </button>
                            {chatMode === 'dm' && activeDM ? (
                                <>
                                    <div className="relative flex-shrink-0">
                                        <img src={activeDM.userAvatar} alt="" className="w-8 h-8 rounded-full border border-border object-cover" />
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${getStatusColor(activeDM.userStatus)}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-foreground text-sm truncate">{activeDM.userName}</h4>
                                        <p className="text-[9px] text-mutedForeground flex items-center gap-1"><Lock size={7} /> Terenkripsi</p>
                                    </div>
                                </>
                            ) : activeGroup ? (
                                <>
                                    <div className="w-8 h-8 bg-muted rounded-lg border border-border flex items-center justify-center flex-shrink-0">
                                        {activeGroup.icon?.startsWith('data:') ? <img src={activeGroup.icon} className="w-full h-full object-cover rounded-lg" /> : <Hash size={14} className="text-accent" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-foreground text-sm truncate">{activeGroup.name}</h4>
                                        <p className="text-[9px] text-mutedForeground">{workspaceMembers.length} anggota · {onlineCount} online</p>
                                    </div>
                                </>
                            ) : null}
                            {/* Mute + More */}
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                {chatMode === 'workspace' && activeGroup && (
                                    <button onClick={() => toggleMuteGroup(activeGroup.id)}
                                        className={`p-1.5 rounded-xl transition-colors ${mutedGroups.has(activeGroup.id) ? 'text-amber-500 bg-amber-50' : 'text-mutedForeground hover:bg-muted'}`}>
                                        {mutedGroups.has(activeGroup.id) ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                    </button>
                                )}
                                <div className="relative" ref={chatMoreMenuRef}>
                                    <button onClick={() => setShowChatMoreMenu(!showChatMoreMenu)} className="p-1.5 rounded-xl text-mutedForeground hover:bg-muted transition-colors">
                                        <MoreVertical size={14} />
                                    </button>
                                    {showChatMoreMenu && (
                                        <div className="absolute right-0 top-full mt-1 z-50 bg-card border-2 border-border rounded-xl shadow-hard w-44 overflow-hidden">
                                            <button onClick={() => { setShowClearChatConfirm(true); setShowChatMoreMenu(false); }}
                                                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-red-50 transition-colors text-left text-xs font-bold text-red-500">
                                                <Eraser size={12} /> Hapus Semua Chat
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5" style={CHAT_BG_STYLE}>
                            {currentMessages.map((msg, idx) => {
                                const isMe = msg.sender_id === currentUser.id;
                                const prevMsg = currentMessages[idx - 1];
                                const showSenderName = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                                const replyData = msg.metadata?.reply_to;
                                const reactionGroups = (msg.reactions || []).reduce((acc: any, r: any) => {
                                    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, hasMe: false };
                                    acc[r.emoji].count++;
                                    if (r.user_id === currentUser.id) acc[r.emoji].hasMe = true;
                                    return acc;
                                }, {});
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                        <div className={`flex gap-1.5 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                {!isMe && showSenderName && (
                                                    <span className="text-[9px] font-black text-mutedForeground mb-0.5 px-1">{msg.sender_name}</span>
                                                )}
                                                {replyData && (
                                                    <div className={`text-[9px] px-2 py-0.5 rounded-lg mb-0.5 border-l-2 border-accent/70 bg-accent/5 max-w-full ${isMe ? 'text-right' : 'text-left'}`}>
                                                        <span className="font-black text-accent">{replyData.name}: </span>
                                                        <span className="text-mutedForeground">{replyData.content?.slice(0, 40)}</span>
                                                    </div>
                                                )}
                                                <div className="relative">
                                                    <div className={`px-3 py-2 rounded-2xl text-sm font-medium max-w-full break-words ${isMe ? 'bg-accent text-white rounded-br-sm shadow-sm' : 'bg-slate-100 text-slate-800 border border-slate-200/80 rounded-bl-sm shadow-sm'}`}>
                                                        {msg.type === 'image' ? (
                                                            <button onClick={() => setPreviewImage(msg.content)}>
                                                                <img src={msg.content} alt="img" className="max-w-[160px] max-h-[160px] rounded-xl object-cover" />
                                                            </button>
                                                        ) : (
                                                            <span className="whitespace-pre-wrap">{renderMessageContent(msg.content, isMe)}</span>
                                                        )}
                                                    </div>
                                                    {/* Actions on long press / hover */}
                                                    <div className={`absolute top-0 ${isMe ? 'right-full mr-1' : 'left-full ml-1'} hidden group-hover:flex items-center gap-0.5 bg-card border border-border rounded-xl px-1 py-0.5 shadow-sm z-10`}>
                                                        <button onClick={() => setReplyTo(msg)} className="p-1 hover:text-accent text-mutedForeground"><Reply size={11} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id); }} className="p-1 hover:text-accent text-mutedForeground"><Smile size={11} /></button>
                                                        {isMe && <button onClick={() => setShowDeleteConfirm(msg.id)} className="p-1 hover:text-red-500 text-mutedForeground"><Trash2 size={11} /></button>}
                                                    </div>
                                                    {showEmojiPicker === msg.id && (
                                                        <div ref={emojiPickerRef} className={`absolute z-50 ${isMe ? 'right-0' : 'left-0'} top-full mt-1 bg-card border-2 border-border rounded-2xl p-2 shadow-hard w-48`} onClick={e => e.stopPropagation()}>
                                                            <div className="flex flex-wrap gap-1">
                                                                {COMMON_EMOJIS.map(e => (
                                                                    <button key={e} onClick={() => handleAddReaction(msg.id, e)} className={`text-base hover:scale-125 transition-transform p-0.5 rounded ${reactionGroups[e]?.hasMe ? 'bg-accent/20' : ''}`}>{e}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {Object.keys(reactionGroups).length > 0 && (
                                                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                                                        {Object.entries(reactionGroups).map(([emoji, data]: [string, any]) => (
                                                            <button key={emoji} onClick={() => handleAddReaction(msg.id, emoji)}
                                                                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-all hover:scale-105 ${data.hasMe ? 'bg-accent/10 border-accent text-accent shadow-sm' : 'bg-white border-border text-foreground'}`}>
                                                                <span>{emoji}</span><span className="font-bold">{data.count}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className={`flex items-center gap-0.5 mt-0.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    <span className="text-[8px] text-mutedForeground/60">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {isMe && ((msg.read_by?.length || 0) > 1 ? <CheckCheck size={9} className="text-accent" /> : <Check size={9} className="text-mutedForeground/60" />)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {typingUsers.length > 0 && (
                                <div className="flex items-center gap-1.5 px-2">
                                    <div className="flex gap-0.5">{[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 bg-mutedForeground rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div>
                                    <span className="text-[9px] text-mutedForeground italic">{typingUsers.join(', ')} mengetik...</span>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Reply preview */}
                        {replyTo && (
                            <div className="px-3 py-1.5 bg-muted/50 border-t border-border flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-1.5 text-xs">
                                    <Reply size={11} className="text-accent" />
                                    <span className="font-black text-accent">{replyTo.sender_name}:</span>
                                    <span className="text-mutedForeground truncate max-w-[150px]">{replyTo.content}</span>
                                </div>
                                <button onClick={() => setReplyTo(null)} className="text-mutedForeground"><X size={12} /></button>
                            </div>
                        )}

                        {/* Input */}
                        <div className="px-2 py-2 border-t border-border flex-shrink-0 bg-card">
                            <div className="flex items-end gap-1.5 bg-white border border-border rounded-2xl px-3 py-2 focus-within:border-accent focus-within:shadow-sm transition-all">
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                                <button onClick={() => fileInputRef.current?.click()} className="text-mutedForeground hover:text-accent flex-shrink-0 mb-0.5"><ImageIcon size={18} /></button>
                                <input type="text" value={input} onChange={handleInputChange}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                    placeholder={chatMode === 'dm' ? `Pesan ke ${activeDM?.userName}...` : `Pesan ke #${activeGroup?.name}...`}
                                    className="flex-1 bg-transparent outline-none text-sm font-medium text-foreground placeholder:text-mutedForeground py-0.5" />
                                <button onClick={() => setShowInputEmoji(!showInputEmoji)} className="text-mutedForeground hover:text-accent flex-shrink-0 mb-0.5"><Smile size={18} /></button>
                                <button onClick={() => handleSendMessage()} disabled={!input.trim()}
                                    className="w-8 h-8 bg-gradient-to-br from-accent to-accent/90 text-white rounded-xl flex items-center justify-center hover:shadow-md hover:shadow-accent/30 disabled:opacity-40 flex-shrink-0">
                                    <Send size={14} />
                                </button>
                            </div>
                            {showInputEmoji && (
                                <div ref={inputEmojiRef} className="absolute bottom-full right-2 mb-2 bg-card border-2 border-border rounded-2xl p-2 shadow-hard w-48 z-50">
                                    <div className="flex flex-wrap gap-1">{COMMON_EMOJIS.map(e => <button key={e} onClick={() => { setInput(prev => prev + e); setShowInputEmoji(false); }} className="text-base hover:scale-125 transition-transform p-0.5">{e}</button>)}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
            DESKTOP VIEW (≥ md) - Original Layout
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="hidden md:flex flex-col h-[calc(100vh-120px)] gap-0 overflow-hidden">

                {/* ── Chat Notification Popup ── */}
                {chatNotifPopup && (
                    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4 animate-in slide-in-from-top-3 duration-300">
                        <div className="bg-card border-2 border-border rounded-2xl shadow-hard overflow-hidden">
                            <div className="flex items-start gap-3 p-4">
                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {chatNotifPopup.senderAvatar ? (
                                        <img src={chatNotifPopup.senderAvatar} alt="" className="w-full h-full object-cover rounded-xl" />
                                    ) : (
                                        <MessageSquare size={18} className="text-accent" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-black text-foreground text-sm">{chatNotifPopup.senderName}</span>
                                        {chatNotifPopup.groupName && (
                                            <span className="text-[10px] text-mutedForeground font-bold bg-muted px-1.5 py-0.5 rounded-full">#{chatNotifPopup.groupName}</span>
                                        )}
                                        {chatNotifPopup.isDM && (
                                            <span className="text-[10px] text-accent font-bold bg-accent/10 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Lock size={8} /> DM</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-mutedForeground truncate">{chatNotifPopup.content}</p>
                                </div>
                                <button onClick={() => setChatNotifPopup(null)} className="text-mutedForeground hover:text-foreground flex-shrink-0 mt-0.5">
                                    <X size={16} />
                                </button>
                            </div>
                            {chatNotifPopup.isDM && (
                                <div className="px-4 pb-4 flex gap-2">
                                    <input
                                        type="text"
                                        value={notifReplyInput}
                                        onChange={e => setNotifReplyInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleNotifReply(); }}
                                        placeholder="Balas pesan..."
                                        className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent transition-colors text-foreground"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleNotifReply}
                                        disabled={!notifReplyInput.trim()}
                                        className="w-9 h-9 bg-accent text-white rounded-xl flex items-center justify-center hover:bg-accent/90 disabled:opacity-40 transition-all flex-shrink-0"
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                            )}
                            {!chatNotifPopup.isDM && (
                                <div className="px-4 pb-4 flex gap-2">
                                    <button
                                        onClick={() => {
                                            const group = groups.find(g => g.id === chatNotifPopup.groupId);
                                            if (group) { setActiveGroup(group); setChatMode('workspace'); }
                                            setChatNotifPopup(null);
                                        }}
                                        className="flex-1 py-2 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Reply size={14} /> Buka Chat
                                    </button>
                                    <button
                                        onClick={() => setChatNotifPopup(null)}
                                        className="px-4 py-2 bg-muted text-foreground rounded-xl text-sm font-bold hover:bg-muted/80 transition-colors"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Main Chat Layout ── */}
                <div className="flex flex-1 bg-card border-2 border-border rounded-2xl overflow-hidden min-h-0">

                    {/* ── Unified Sidebar ── */}
                    <div className={`${mobileView === 'chat' ? 'hidden md:flex' : 'flex'} w-full md:w-72 border-r border-border flex-col flex-shrink-0 bg-white/50`}>
                        {/* Sidebar Header — Workspace name + status */}
                        <div className="px-4 py-3 border-b border-border flex-shrink-0">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h2 className="font-black text-foreground text-base truncate">{selectedWorkspace?.name || 'Pesan'}</h2>
                                    <p className="text-[9px] text-mutedForeground font-bold">{workspaceMembers.length} anggota · {groups.length} channels</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-mutedForeground">
                                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{onlineCount}</span>
                                        {totalUnread > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full">{totalUnread}</span>}
                                    </div>
                                    <div className="relative" ref={statusPickerRef}>
                                        <button
                                            onClick={() => setShowStatusPicker(!showStatusPicker)}
                                            className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors relative"
                                            title="Ubah status"
                                        >
                                            <img src={currentUser.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                                            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusColor(currentStatus)}`} />
                                        </button>
                                        {showStatusPicker && (
                                            <div className="absolute right-0 top-full mt-1 z-50 bg-card border-2 border-border rounded-xl shadow-hard w-44 overflow-hidden">
                                                {STATUS_OPTIONS.map(s => (
                                                    <button
                                                        key={s.value}
                                                        onClick={() => handleUpdateStatus(s.value)}
                                                        className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left ${currentStatus === s.value ? 'bg-muted' : ''}`}
                                                    >
                                                        <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                                                        <span className="text-xs font-bold text-foreground">{s.label}</span>
                                                        {currentStatus === s.value && <span className="ml-auto text-accent text-[10px]">✓</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Workspace dropdown capsule */}
                            <div className="relative" ref={wsDropdownRef}>
                                <button
                                    onClick={() => setShowWsDropdown(!showWsDropdown)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-bold text-foreground hover:border-accent/50 transition-all w-full"
                                >
                                    {selectedWorkspace?.logo_url ? <img src={selectedWorkspace.logo_url} alt="" className="w-4 h-4 rounded object-contain" /> : null}
                                    <span className="truncate flex-1 text-left">{selectedWorkspace?.name || 'Pilih Workspace'}</span>
                                    <ChevronDown size={12} className={`text-mutedForeground transition-transform ${showWsDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                {showWsDropdown && (
                                    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border-2 border-border rounded-xl shadow-hard overflow-hidden">
                                        {workspaces.map(ws => {
                                            const isSelected = selectedWorkspace?.id === ws.id;
                                            const wsUnread = unreadCounts[ws.id] || 0;
                                            return (
                                                <button
                                                    key={ws.id}
                                                    onClick={() => {
                                                        setSelectedWorkspace(ws);
                                                        setChatMode('workspace');
                                                        const wsGroups = groups.filter(g => g.workspace_id === ws.id);
                                                        if (wsGroups.length > 0) setActiveGroup(wsGroups[0]);
                                                        setShowWsDropdown(false);
                                                    }}
                                                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-bold transition-colors ${isSelected ? 'bg-accent/10 text-accent' : 'text-foreground hover:bg-muted'}`}
                                                >
                                                    {ws.logo_url ? <img src={ws.logo_url} alt="" className="w-5 h-5 rounded object-contain" /> : <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[9px] font-black text-mutedForeground">{ws.name.charAt(0)}</div>}
                                                    <span className="truncate flex-1">{ws.name}</span>
                                                    {isSelected && <span className="text-accent text-[10px]">✓</span>}
                                                    {wsUnread > 0 && <span className="min-w-[16px] h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1">{wsUnread > 9 ? '9+' : wsUnread}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Search */}
                        <div className="px-3 py-2 flex-shrink-0">
                            <div className="relative">
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mutedForeground" />
                                <input
                                    type="text"
                                    placeholder="Cari chat..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-muted border border-border rounded-lg py-1.5 pl-7 pr-3 text-xs font-medium outline-none focus:border-accent transition-colors text-foreground"
                                />
                            </div>
                        </div>

                        {/* Unified Chat List */}
                        <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
                            {/* ── Channels Section ── */}
                            <div className="mb-3">
                                <div className="flex items-center justify-between px-2 py-1.5">
                                    <span className="text-[9px] font-black text-mutedForeground uppercase tracking-widest">Channels</span>
                                    <button onClick={() => setShowGroupModal(true)} className="p-0.5 rounded hover:bg-muted text-mutedForeground hover:text-accent transition-colors" title="Buat group baru">
                                        <Plus size={12} />
                                    </button>
                                </div>
                                <div className="space-y-0.5">
                                    {filteredGroups.map(g => {
                                        const isActive = activeGroup?.id === g.id && chatMode === 'workspace';
                                        const unread = unreadCounts[g.id] || 0;
                                        const isMuted = mutedGroups.has(g.id);
                                        return (
                                            <div key={g.id} className="relative group/item">
                                                <button
                                                    onClick={() => { setActiveGroup(g); setChatMode('workspace'); setMobileView('chat'); }}
                                                    className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2 transition-all text-left ${isActive ? 'bg-accent/10 text-accent' : 'hover:bg-muted text-foreground'}`}
                                                >
                                                    <div className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                                                        {g.icon?.startsWith('data:') ? <img src={g.icon} className="w-full h-full object-cover" /> : <Hash size={13} className={isActive ? 'text-accent' : 'text-mutedForeground'} />}
                                                    </div>
                                                    <p className={`text-xs font-bold truncate flex-1 ${isActive ? 'text-accent' : ''}`}>{g.name}</p>
                                                    {isMuted && <VolumeX size={10} className="text-mutedForeground flex-shrink-0" />}
                                                    {unread > 0 && !isMuted && <span className="min-w-[18px] h-[18px] bg-accent text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 flex-shrink-0">{unread}</span>}
                                                </button>
                                                <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity" ref={groupMenuOpen === g.id ? groupMenuRef : undefined}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setGroupMenuOpen(groupMenuOpen === g.id ? null : g.id); }}
                                                        className="p-1 rounded-lg hover:bg-muted text-mutedForeground hover:text-foreground transition-colors"
                                                    >
                                                        <MoreVertical size={12} />
                                                    </button>
                                                    {groupMenuOpen === g.id && (
                                                        <div className="absolute right-0 top-full mt-1 z-50 bg-card border-2 border-border rounded-xl shadow-hard w-44 overflow-hidden">
                                                            <button onClick={() => handleOpenEditGroup(g)} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted transition-colors text-left text-xs font-bold text-foreground">
                                                                <Edit2 size={12} className="text-accent" /> Edit Group
                                                            </button>
                                                            <button onClick={() => toggleMuteGroup(g.id)} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted transition-colors text-left text-xs font-bold text-foreground">
                                                                {isMuted ? <Volume2 size={12} className="text-emerald-500" /> : <VolumeX size={12} className="text-amber-500" />}
                                                                {isMuted ? 'Unmute Notifikasi' : 'Mute Notifikasi'}
                                                            </button>
                                                            <div className="border-t border-border" />
                                                            <button onClick={() => { setShowDeleteGroupConfirm(g); setGroupMenuOpen(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-red-50 transition-colors text-left text-xs font-bold text-red-500">
                                                                <Trash2 size={12} /> Hapus Group
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Direct Messages Section ── */}
                            <div>
                                <div className="flex items-center px-2 py-1.5">
                                    <span className="text-[9px] font-black text-mutedForeground uppercase tracking-widest">Direct Messages</span>
                                </div>
                                <div className="space-y-0.5">
                                    {(() => {
                                        // Build DM entries from workspace members (exclude self), sorted by activity + online
                                        const dmEntries = workspaceMembers
                                            .filter(u => u.id !== currentUser.id)
                                            .filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                                            .map(u => {
                                                const isActive = activeDM?.userId === u.id && chatMode === 'dm';
                                                const unread = dmUnread[u.id] || 0;
                                                const isOnline = u.online_status === 'online';
                                                const isBusy = u.online_status === 'busy';
                                                const isIdle = u.online_status === 'idle';
                                                return { ...u, isActive, unread, isOnline, isBusy, isIdle };
                                            })
                                            .sort((a, b) => {
                                                // Active chat first, then unread, then online, then idle/busy, then offline
                                                if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
                                                if ((a.unread > 0) !== (b.unread > 0)) return a.unread > 0 ? -1 : 1;
                                                if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
                                                if ((a.isBusy || a.isIdle) !== (b.isBusy || b.isIdle)) return (a.isBusy || a.isIdle) ? -1 : 1;
                                                return a.full_name.localeCompare(b.full_name);
                                            });

                                        return dmEntries.map(u => (
                                            <div key={u.id} className={`w-full relative group rounded-xl transition-all ${u.isActive ? 'bg-accent/10' : 'hover:bg-muted'}`}>
                                                <button onClick={() => {
                                                    const dm: DMConversation = { userId: u.id, userName: u.full_name, userAvatar: u.avatar_url, userStatus: u.online_status, unread: 0 };
                                                    setActiveDM(dm); setChatMode('dm'); setMobileView('chat');
                                                }}
                                                    className="w-full px-2 py-2 flex items-center gap-3 text-left">
                                                    <div className="relative flex-shrink-0">
                                                        <img src={u.avatar_url} alt="" className="w-10 h-10 md:w-11 md:h-11 rounded-full border border-border object-cover bg-muted" />
                                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(u.online_status)}`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-center">
                                                        <div className="flex items-center justify-between">
                                                            <p className={`text-sm font-bold truncate ${u.isActive ? 'text-accent' : 'text-foreground'}`}>{u.full_name}</p>
                                                            {dmLatestMessages[u.id] && <span className="text-[9px] text-mutedForeground font-medium ml-2 flex-shrink-0 flex items-center gap-1">{new Date(dmLatestMessages[u.id].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                                        </div>
                                                        {dmLatestMessages[u.id] ? (
                                                            <div className="flex items-center gap-1 mt-0.5 max-w-[85%]">
                                                                {dmLatestMessages[u.id].isMine && (
                                                                    <div className="flex-shrink-0">
                                                                        {dmLatestMessages[u.id].isRead ? <CheckCheck size={12} className="text-accent" /> : <Check size={12} className="text-mutedForeground" />}
                                                                    </div>
                                                                )}
                                                                <p className={`text-xs truncate ${!dmLatestMessages[u.id].isRead && !dmLatestMessages[u.id].isMine ? 'font-black text-foreground' : 'text-mutedForeground font-medium'}`}>
                                                                    {dmLatestMessages[u.id].content}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <p className="text-[10px] font-bold text-mutedForeground mt-0.5">Mulai obrolan</p>
                                                        )}
                                                    </div>
                                                    {u.unread > 0 && (
                                                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                                                            <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-sm">
                                                                {u.unread > 99 ? '99+' : u.unread}
                                                            </span>
                                                        </div>
                                                    )}
                                                </button>

                                                {/* Context Menu Button Desktop */}
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 md:opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDmUserMenu(dmUserMenu === u.id ? null : u.id); }}
                                                        className="p-2 mr-2 rounded bg-card/80 backdrop-blur-sm text-mutedForeground hover:text-foreground shadow-sm border border-border"
                                                    >
                                                        <MoreVertical size={14} />
                                                    </button>
                                                    {dmUserMenu === u.id && (
                                                        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 w-40 bg-card border-2 border-border rounded-xl shadow-hard z-[9999] overflow-hidden" ref={dmUserMenuRef}>
                                                            <button
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setUserInfoModal(u); setDmUserMenu(null); }}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-left hover:bg-muted text-foreground"
                                                            >
                                                                <Info size={12} /> Info User
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setClearDMTarget(u); setDmUserMenu(null); }}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-left hover:bg-red-50 text-red-500"
                                                            >
                                                                <Trash2 size={12} /> Kosongkan Chat
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Chat Area ── */}
                    <div className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0`}>
                        {(activeGroup && chatMode === 'workspace') || (activeDM && chatMode === 'dm') ? (
                            <>
                                {/* Chat Header */}
                                <div className="h-14 border-b border-border flex items-center justify-between px-3 md:px-5 flex-shrink-0 bg-gradient-to-r from-card to-card/95">
                                    <div className="flex items-center gap-2 md:gap-3">
                                        {/* Mobile back button */}
                                        <button
                                            onClick={() => setMobileView('list')}
                                            className="md:hidden p-1.5 rounded-lg hover:bg-muted text-mutedForeground hover:text-foreground transition-colors flex-shrink-0"
                                        >
                                            <X size={18} />
                                        </button>
                                        {chatMode === 'dm' && activeDM ? (
                                            <>
                                                <div className="relative">
                                                    <img src={activeDM.userAvatar} alt="" className="w-8 h-8 rounded-full border-2 border-border object-cover" />
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${getStatusColor(activeDM.userStatus)}`} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-foreground text-sm">{activeDM.userName}</h4>
                                                    <p className="text-[10px] text-mutedForeground flex items-center gap-1"><Lock size={9} /> Terenkripsi</p>
                                                </div>
                                            </>
                                        ) : activeGroup ? (
                                            <>
                                                <div className="w-8 h-8 bg-muted rounded-lg border-2 border-border flex items-center justify-center overflow-hidden">
                                                    {activeGroup.icon?.startsWith('data:') ? <img src={activeGroup.icon} className="w-full h-full object-cover" /> : <Hash size={14} className="text-accent" />}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-foreground text-sm">{activeGroup.name}</h4>
                                                    <p className="text-[10px] text-mutedForeground">{workspaceMembers.length} anggota · {onlineCount} online</p>
                                                </div>
                                            </>
                                        ) : null}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {/* Mute button in header for active group */}
                                        {chatMode === 'workspace' && activeGroup && (
                                            <button
                                                onClick={() => toggleMuteGroup(activeGroup.id)}
                                                className={`p-2 rounded-xl transition-colors ${mutedGroups.has(activeGroup.id) ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-mutedForeground hover:bg-muted hover:text-foreground'}`}
                                                title={mutedGroups.has(activeGroup.id) ? 'Unmute notifikasi' : 'Mute notifikasi'}
                                            >
                                                {mutedGroups.has(activeGroup.id) ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                            </button>
                                        )}
                                        {/* More menu button */}
                                        <div className="relative" ref={chatMoreMenuRef}>
                                            <button
                                                onClick={() => setShowChatMoreMenu(!showChatMoreMenu)}
                                                className="p-2 rounded-xl text-mutedForeground hover:bg-muted hover:text-foreground transition-colors"
                                                title="Opsi lainnya"
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                            {showChatMoreMenu && (
                                                <div className="absolute right-0 top-full mt-1 z-50 bg-card border-2 border-border rounded-xl shadow-hard w-48 overflow-hidden">
                                                    <button
                                                        onClick={() => { setShowClearChatConfirm(true); setShowChatMoreMenu(false); }}
                                                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-red-50 transition-colors text-left text-xs font-bold text-red-500"
                                                    >
                                                        <Eraser size={12} /> Hapus Semua Chat
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Messages with background pattern */}
                                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 custom-scrollbar" style={CHAT_BG_STYLE}>
                                    {currentMessages.map((msg, idx) => {
                                        const isMe = msg.sender_id === currentUser.id;
                                        const prevMsg = currentMessages[idx - 1];
                                        const showSenderName = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                                        const replyData = msg.metadata?.reply_to;

                                        // Group reactions by emoji
                                        const reactionGroups = (msg.reactions || []).reduce((acc: any, r: any) => {
                                            if (!acc[r.emoji]) acc[r.emoji] = { count: 0, users: [], hasMe: false };
                                            acc[r.emoji].count++;
                                            acc[r.emoji].users.push(r.user_id);
                                            if (r.user_id === currentUser.id) acc[r.emoji].hasMe = true;
                                            return acc;
                                        }, {});

                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                                <div className={`flex gap-1.5 max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>

                                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                        {!isMe && showSenderName && (
                                                            <span className="text-[10px] font-black text-mutedForeground mb-1 px-1">{msg.sender_name}</span>
                                                        )}

                                                        {/* Reply preview */}
                                                        {replyData && (
                                                            <div className={`text-[10px] px-2.5 py-1 rounded-lg mb-1 border-l-2 border-accent/70 bg-accent/5 max-w-full backdrop-blur-sm ${isMe ? 'text-right' : 'text-left'}`}>
                                                                <span className="font-black text-accent">{replyData.name}: </span>
                                                                <span className="text-mutedForeground">{replyData.content?.slice(0, 60)}</span>
                                                            </div>
                                                        )}

                                                        {/* Message bubble */}
                                                        <div className="relative">
                                                            <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium max-w-full break-words ${isMe
                                                                ? 'bg-accent text-white rounded-br-sm shadow-sm'
                                                                : 'bg-slate-100 text-slate-800 border border-slate-200/80 rounded-bl-sm shadow-sm'
                                                                }`}>
                                                                {msg.type === 'image' ? (
                                                                    <button onClick={() => setPreviewImage(msg.content)}>
                                                                        <img src={msg.content} alt="img" className="max-w-[200px] max-h-[200px] rounded-xl object-cover hover:opacity-90 transition-opacity" />
                                                                    </button>
                                                                ) : (
                                                                    <span className="whitespace-pre-wrap">{renderMessageContent(msg.content, isMe)}</span>
                                                                )}
                                                            </div>

                                                            {/* Message actions */}
                                                            <div className={`absolute top-0 ${isMe ? 'right-full mr-1' : 'left-full ml-1'} hidden group-hover:flex items-center gap-0.5 bg-card border border-border rounded-xl px-1.5 py-1 shadow-sm z-10`}>
                                                                <button onClick={() => setReplyTo(msg)} className="p-1 hover:text-accent text-mutedForeground transition-colors" title="Reply">
                                                                    <Reply size={12} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id); }}
                                                                    className="p-1 hover:text-accent text-mutedForeground transition-colors"
                                                                    title="React"
                                                                >
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
                                                                <div
                                                                    ref={emojiPickerRef}
                                                                    className={`absolute z-50 ${isMe ? 'right-0' : 'left-0'} top-full mt-1 bg-card border-2 border-border rounded-2xl p-3 shadow-hard w-52`}
                                                                    onClick={e => e.stopPropagation()}
                                                                >
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {COMMON_EMOJIS.map(e => (
                                                                            <button
                                                                                key={e}
                                                                                onClick={() => handleAddReaction(msg.id, e)}
                                                                                className={`text-lg hover:scale-125 transition-transform p-0.5 rounded ${reactionGroups[e]?.hasMe ? 'bg-accent/20' : ''}`}
                                                                            >
                                                                                {e}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Reactions display */}
                                                        {Object.keys(reactionGroups).length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {Object.entries(reactionGroups).map(([emoji, data]: [string, any]) => (
                                                                    <button
                                                                        key={emoji}
                                                                        onClick={() => handleAddReaction(msg.id, emoji)}
                                                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all hover:scale-105 ${data.hasMe ? 'bg-accent/10 border-accent text-accent shadow-sm' : 'bg-white border-border text-foreground hover:border-accent/50'}`}
                                                                    >
                                                                        <span>{emoji}</span>
                                                                        <span className="font-bold">{data.count}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Time + read */}
                                                        <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                            <span className="text-[9px] text-mutedForeground/60">
                                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            {isMe && (
                                                                (msg.read_by?.length || 0) > 1
                                                                    ? <CheckCheck size={10} className="text-accent" />
                                                                    : <Check size={10} className="text-mutedForeground/60" />
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
                                                {[0, 150, 300].map(delay => (
                                                    <div key={delay} className="w-2 h-2 bg-mutedForeground rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                                                ))}
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
                                        <button onClick={() => setReplyTo(null)} className="text-mutedForeground hover:text-foreground"><X size={14} /></button>
                                    </div>
                                )}

                                {/* Input Area */}
                                <div className="px-4 py-3 border-t-2 border-border flex-shrink-0 relative bg-card">
                                    {/* Mention list */}
                                    {showMentionList && (
                                        <div className="absolute bottom-full left-4 mb-2 bg-card border-2 border-border rounded-2xl shadow-hard overflow-hidden w-56 z-50">
                                            {workspaceMembers
                                                .filter(m => m.full_name.toLowerCase().includes(mentionSearch.toLowerCase()))
                                                .slice(0, 5)
                                                .map(m => (
                                                    <button key={m.id} onClick={() => insertMention(m.full_name)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left">
                                                        <img src={m.avatar_url} alt="" className="w-6 h-6 rounded-full border border-border object-cover" />
                                                        <span className="text-xs font-bold text-foreground">{m.full_name}</span>
                                                        <div className={`ml-auto w-2 h-2 rounded-full ${getStatusColor(m.online_status)}`} />
                                                    </button>
                                                ))}
                                        </div>
                                    )}

                                    {/* Content mention list */}
                                    {showContentMentionList && (
                                        <div className="absolute bottom-full left-4 mb-2 bg-card border-2 border-border rounded-2xl shadow-hard overflow-hidden w-64 z-50">
                                            <div className="px-3 py-1.5 border-b border-border">
                                                <p className="text-[10px] font-black text-mutedForeground uppercase tracking-wider">Mention Konten</p>
                                            </div>
                                            {contentItems
                                                .filter(c => c.title.toLowerCase().includes(contentMentionSearch.toLowerCase()))
                                                .slice(0, 6)
                                                .map(c => (
                                                    <button key={c.id} onClick={() => insertContentMention(c)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left">
                                                        <Hash size={12} className="text-accent flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-foreground truncate">{c.title}</p>
                                                            <p className="text-[9px] text-mutedForeground">{c.platform} · {c.status}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                        </div>
                                    )}

                                    {/* Input emoji picker */}
                                    {showInputEmoji && (
                                        <div ref={inputEmojiRef} className="absolute bottom-full right-4 mb-2 bg-card border-2 border-border rounded-2xl p-3 shadow-hard w-52 z-50">
                                            <div className="flex flex-wrap gap-1.5">
                                                {COMMON_EMOJIS.map(e => (
                                                    <button key={e} onClick={() => { setInput(prev => prev + e); setShowInputEmoji(false); }} className="text-lg hover:scale-125 transition-transform p-0.5">
                                                        {e}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 bg-white border border-border rounded-2xl px-4 py-2.5 focus-within:border-accent focus-within:shadow-sm transition-all min-h-[52px]">
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                                        <button onClick={() => fileInputRef.current?.click()} className="text-mutedForeground hover:text-accent transition-colors flex-shrink-0" title="Upload foto">
                                            <ImageIcon size={22} />
                                        </button>
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={handleInputChange}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                            placeholder={chatMode === 'dm' ? `Pesan ke ${activeDM?.userName}... (@ mention, # konten)` : `Pesan ke #${activeGroup?.name}... (@ mention, # konten)`}
                                            className="flex-1 bg-transparent outline-none text-sm font-medium text-foreground placeholder:text-mutedForeground"
                                        />
                                        <button
                                            onClick={() => setShowInputEmoji(!showInputEmoji)}
                                            className="text-mutedForeground hover:text-accent transition-colors flex-shrink-0"
                                            title="Emoji"
                                        >
                                            <Smile size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleSendMessage()}
                                            disabled={!input.trim()}
                                            className="w-10 h-10 bg-gradient-to-br from-accent to-accent/90 text-white rounded-xl flex items-center justify-center hover:shadow-md hover:shadow-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-center p-8 bg-gradient-to-br from-slate-50 to-white">
                                <div className="space-y-4">
                                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-accent/10 to-accent/5 rounded-3xl flex items-center justify-center shadow-inner">
                                        <MessageSquare size={36} className="text-accent opacity-70" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-foreground text-lg">Pilih channel atau DM</h3>
                                        <p className="text-mutedForeground text-sm mt-1">Pilih group atau mulai percakapan baru untuk mulai berkolaborasi</p>
                                    </div>
                                    <div className="flex items-center justify-center gap-4 text-[10px] text-mutedForeground">
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" />{onlineCount} online</span>
                                        <span>·</span>
                                        <span>{groups.length} channels</span>
                                        <span>·</span>
                                        <span>{workspaceMembers.length} anggota</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div >

            </div >

            {/* ═══════════════════════════════════════════════════════════════════
            GLOBAL MODALS — outside desktop/mobile containers so they work everywhere
            ═══════════════════════════════════════════════════════════════════ */}

            {/* Image Preview */}
            {
                previewImage && (
                    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
                        <img src={previewImage} alt="" className="max-w-full max-h-full rounded-2xl object-contain" />
                        <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"><X size={20} /></button>
                    </div>
                )
            }

            {/* Delete Message Confirm */}
            {
                showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(null)}>
                        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-hard max-w-sm w-full" onClick={e => e.stopPropagation()}>
                            <h3 className="font-black text-foreground mb-2">Hapus Pesan?</h3>
                            <p className="text-mutedForeground text-sm mb-4">Pesan ini akan dihapus permanen.</p>
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)} className="flex-1">Batal</Button>
                                <Button onClick={() => handleDeleteMessage(showDeleteConfirm)} className="flex-1 bg-red-500 hover:bg-red-600">Hapus</Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Clear Chat Confirm */}
            {
                showClearChatConfirm && (
                    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4" onClick={() => setShowClearChatConfirm(false)}>
                        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-hard max-w-sm w-full" onClick={e => e.stopPropagation()}>
                            <h3 className="font-black text-foreground mb-2">Hapus Semua Chat?</h3>
                            <p className="text-mutedForeground text-sm mb-4">
                                {chatMode === 'dm' ? 'Semua pesan DM ini akan dihapus permanen.' : `Semua pesan di #${activeGroup?.name} akan dihapus permanen.`}
                            </p>
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={() => setShowClearChatConfirm(false)} className="flex-1">Batal</Button>
                                <Button onClick={handleClearChat} className="flex-1 bg-red-500 hover:bg-red-600">Hapus Semua</Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Specific User Clear Chat Confirm */}
            {
                clearDMTarget && (
                    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4" onClick={() => setClearDMTarget(null)}>
                        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-hard max-w-sm w-full" onClick={e => e.stopPropagation()}>
                            <h3 className="font-black text-foreground mb-2">Kosongkan Chat dengan {clearDMTarget.full_name}?</h3>
                            <p className="text-mutedForeground text-sm mb-4">Semua pesan DM dengan pengguna ini akan dihapus permanen.</p>
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={() => setClearDMTarget(null)} className="flex-1">Batal</Button>
                                <Button onClick={() => handleClearSpecificDM(clearDMTarget)} className="flex-1 bg-red-500 hover:bg-red-600">Hapus Semua</Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Content Detail Popup Modal */}
            {contentDetailId && (
                <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4" onClick={() => setContentDetailId(null)}>
                    <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-hard max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-foreground text-base flex items-center gap-2"><Hash size={18} className="text-accent" /> Buka Detail Konten</h3>
                            <button onClick={() => setContentDetailId(null)} className="p-1.5 rounded-lg hover:bg-muted text-mutedForeground transition-colors"><X size={16} /></button>
                        </div>
                        <div className="py-2 text-center space-y-4">
                            <p className="text-sm font-medium text-mutedForeground">Dialihkan ke halaman Rencana Konten untuk melihat detail spesifik konten ini.</p>
                            <Button onClick={() => {
                                setContentDetailId(null);
                                const wsId = selectedWorkspace?.id;
                                if (wsId) navigate(`/plan/${wsId}?content=${contentDetailId}`);
                            }} className="w-full">
                                Lanjutkan Buka <ExternalLink size={14} className="ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Group Confirm */}
            {
                showDeleteGroupConfirm && (
                    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4" onClick={() => setShowDeleteGroupConfirm(null)}>
                        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-hard max-w-sm w-full" onClick={e => e.stopPropagation()}>
                            <h3 className="font-black text-foreground mb-2">Hapus Group?</h3>
                            <p className="text-mutedForeground text-sm mb-1">Group <span className="font-black text-foreground">#{showDeleteGroupConfirm.name}</span> akan dihapus permanen.</p>
                            <p className="text-mutedForeground text-xs mb-4">Semua pesan di dalam group ini juga akan terhapus.</p>
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={() => setShowDeleteGroupConfirm(null)} className="flex-1">Batal</Button>
                                <Button onClick={() => handleDeleteGroup(showDeleteGroupConfirm)} className="flex-1 bg-red-500 hover:bg-red-600">Hapus Group</Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit Group Modal */}
            {
                showEditGroupModal && (
                    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4" onClick={() => setShowEditGroupModal(null)}>
                        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-hard max-w-md w-full" onClick={e => e.stopPropagation()}>
                            <h3 className="font-black text-foreground text-lg mb-4">Edit Group</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-black text-mutedForeground uppercase tracking-wider block mb-1.5">Nama Group</label>
                                    <input
                                        type="text"
                                        value={editGroupName}
                                        onChange={e => setEditGroupName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEditGroup(); }}
                                        placeholder="Nama group..."
                                        className="w-full px-4 py-3 bg-muted border-2 border-border rounded-xl text-sm font-medium text-foreground outline-none focus:border-accent transition-colors"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-mutedForeground uppercase tracking-wider block mb-2">Anggota Group</label>
                                    <div className="max-h-48 overflow-y-auto space-y-1 border-2 border-border rounded-xl p-2">
                                        {workspaceMembers.map(m => (
                                            <label key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={editGroupMembers.includes(m.id)}
                                                    onChange={e => {
                                                        if (e.target.checked) setEditGroupMembers(prev => [...prev, m.id]);
                                                        else setEditGroupMembers(prev => prev.filter(id => id !== m.id));
                                                    }}
                                                    className="w-4 h-4 accent-accent rounded"
                                                />
                                                <div className="relative flex-shrink-0">
                                                    <img src={m.avatar_url} alt="" className="w-7 h-7 rounded-full border border-border object-cover bg-muted" />
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-card ${getStatusColor(m.online_status)}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-foreground truncate">{m.full_name}</p>
                                                    <p className="text-[9px] text-mutedForeground">{m.role}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-mutedForeground mt-1">{editGroupMembers.length} anggota dipilih</p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <Button variant="secondary" onClick={() => setShowEditGroupModal(null)} className="flex-1">Batal</Button>
                                    <Button onClick={handleSaveEditGroup} disabled={!editGroupName.trim()} className="flex-1">Simpan</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* User Info Modal */}
            {
                userInfoModal && (
                    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4" onClick={() => setUserInfoModal(null)}>
                        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-hard max-w-sm w-full" onClick={e => e.stopPropagation()}>
                            <div className="flex items-start gap-4 mb-4">
                                <div className="relative">
                                    <img src={userInfoModal.avatar_url} alt="" className="w-16 h-16 rounded-2xl border-2 border-border object-cover" />
                                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${getStatusColor(userInfoModal.online_status)}`} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-black text-foreground text-lg">{userInfoModal.full_name}</h3>
                                    <p className="text-sm text-mutedForeground font-bold">{userInfoModal.role}</p>
                                    <p className={`text-xs font-bold mt-1 ${userInfoModal.online_status === 'online' ? 'text-emerald-500' : userInfoModal.online_status === 'busy' ? 'text-red-500' : 'text-mutedForeground'}`}>
                                        {userInfoModal.online_status === 'online' ? '● Online' : userInfoModal.online_status === 'idle' ? '● Away' : userInfoModal.online_status === 'busy' ? '● Sibuk' : '● Offline'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    icon={<MessageCircle size={16} />}
                                    onClick={() => {
                                        const dm: DMConversation = { userId: userInfoModal.id, userName: userInfoModal.full_name, userAvatar: userInfoModal.avatar_url, userStatus: userInfoModal.online_status, unread: 0 };
                                        setActiveDM(dm); setChatMode('dm'); setUserInfoModal(null);
                                    }}
                                    className="flex-1"
                                >
                                    Kirim Pesan
                                </Button>
                                <Button variant="secondary" onClick={() => setUserInfoModal(null)} className="flex-1">Tutup</Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Create Group Modal */}
            <Modal isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} title="Buat Group Baru">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-black text-mutedForeground uppercase tracking-wider block mb-1.5">Nama Group</label>
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup(); }}
                            placeholder="Contoh: Tim Konten IG"
                            className="w-full px-4 py-3 bg-muted border-2 border-border rounded-xl text-sm font-medium text-foreground outline-none focus:border-accent transition-colors"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setShowGroupModal(false)} className="flex-1">Batal</Button>
                        <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()} className="flex-1">Buat Group</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
