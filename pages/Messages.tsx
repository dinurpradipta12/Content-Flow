import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
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
    Quote
} from 'lucide-react';
import { Button } from '../components/ui/Button';
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
}

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

    // Refs for real-time callbacks
    const activeGroupRef = useRef<ChatGroup | null>(null);
    const selectedWorkspaceRef = useRef<Workspace | null>(null);
    const workspacesRef = useRef<Workspace[]>([]);
    const currentUserRef = useRef(currentUser);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const { sendNotification } = useNotifications();

    // Sync refs
    useEffect(() => { activeGroupRef.current = activeGroup; }, [activeGroup]);
    useEffect(() => { selectedWorkspaceRef.current = selectedWorkspace; }, [selectedWorkspace]);
    useEffect(() => { workspacesRef.current = workspaces; }, [workspaces]);

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
            const { data: reads } = await supabase.from('workspace_chat_reads').select('message_id, user_id').eq('group_id', groupId);
            const messagesWithReads = data.map(msg => ({
                ...msg,
                read_by: reads?.filter(r => r.message_id === msg.id).map(r => r.user_id) || []
            }));
            setMessages(messagesWithReads);
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

    const handleNewMessage = (msg: ChatMessage, wsId: string) => {
        const isActiveGroup = activeGroupRef.current?.id === msg.group_id;
        if (isActiveGroup) {
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, { ...msg, read_by: [] }]);
            markMessagesAsRead([msg.id], msg.group_id);
        } else {
            setUnreadCounts(prev => ({ ...prev, [wsId]: (prev[wsId] || 0) + 1 }));
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

    const handleSendMessage = async () => {
        if (!input.trim() || !activeGroup || !selectedWorkspace) return;
        const content = input;
        const tempId = `temp-${Date.now()}`;
        const optimisticMsg: ChatMessage = {
            id: tempId,
            group_id: activeGroup.id,
            sender_id: currentUser.id,
            sender_name: currentUser.name,
            sender_avatar: currentUser.avatar,
            content,
            type: content.includes('@') ? 'mention' : 'text',
            reply_to_id: replyTo?.id,
            metadata: { reply_to: replyTo ? { name: replyTo.sender_name, content: replyTo.content } : null },
            created_at: new Date().toISOString(),
            read_by: [currentUser.id]
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
            setMessages(prev => prev.map(m => m.id === tempId ? { ...data, read_by: [currentUser.id] } : m));
            markMessagesAsRead([data.id], activeGroup.id);
        }
    };

    const handleInputChange = (val: string) => {
        setInput(val);
        const parts = val.split('@');
        if (val.endsWith('@')) { setShowMentionList(true); setMentionSearch(''); }
        else if (showMentionList) { setMentionSearch(parts[parts.length - 1]); if (val.endsWith(' ')) setShowMentionList(false); }
        else setShowMentionList(false);
    };

    if (!isLoaded) return <div className="p-20 text-center font-black animate-pulse">MEMUAT PESAN...</div>;

    return (
        <div className="flex bg-white rounded-3xl border-4 border-slate-900 shadow-hard h-[calc(100vh-140px)] overflow-hidden">
            {/* Workspace Sidebar */}
            <div className={`bg-slate-50 border-r-4 border-slate-900 flex flex-col items-center py-6 gap-4 transition-all duration-500 ease-in-out ${showWsSidebar ? 'w-20' : 'w-0 opacity-0 -translate-x-full overflow-hidden'}`}>
                {workspaces.map(ws => (
                    <button
                        key={ws.id}
                        onClick={() => setSelectedWorkspace(ws)}
                        className={`w-12 h-12 rounded-2xl border-4 transition-all relative group shrink-0 ${selectedWorkspace?.id === ws.id ? 'border-accent shadow-hard-mini scale-110' : 'border-slate-300 hover:border-slate-900 shadow-none'}`}
                        style={{ backgroundColor: ws.color || '#fff' }}
                    >
                        {ws.logo_url ? <img src={ws.logo_url} className="w-full h-full object-cover rounded-xl" /> : <span className="font-black text-xs">{ws.name.substring(0, 2).toUpperCase()}</span>}
                        {unreadCounts[ws.id] > 0 && <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900 animate-bounce">{unreadCounts[ws.id]}</div>}
                        <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">{ws.name}</div>
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative bg-white min-w-0">
                {/* Header */}
                <div className="h-20 border-b-4 border-slate-900 flex items-center justify-between px-8 bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowWsSidebar(!showWsSidebar)} className="p-2 bg-slate-100 rounded-xl hover:bg-accent hover:text-white transition-all">
                            {showWsSidebar ? <ChevronLeft size={20} /> : <SidebarIcon size={20} />}
                        </button>
                        <div>
                            <h2 className="font-black text-xl text-slate-900 uppercase tracking-tighter truncate max-w-[200px]">{selectedWorkspace?.name}</h2>
                            <p className="text-[10px] font-bold text-slate-400">CHANNEL: {activeGroup?.name || 'GENERAL'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <button className="p-2 border-2 border-slate-900 rounded-xl hover:bg-slate-50 shadow-hard-mini transition-all"><Filter size={18} /></button>
                            <div className="absolute top-full right-0 mt-2 w-48 bg-white border-4 border-slate-900 rounded-2xl shadow-hard opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50 p-2">
                                <p className="text-[10px] font-black uppercase text-slate-400 px-2 pb-2 border-b-2 border-slate-100 mb-2">Switch Workspace</p>
                                {workspaces.map(ws => <button key={ws.id} onClick={() => setSelectedWorkspace(ws)} className="w-full p-2 text-left hover:bg-slate-50 rounded-lg text-xs font-bold transition-all">{ws.name}</button>)}
                            </div>
                        </div>
                        <div className="flex -space-x-3">
                            {workspaceMembers.slice(0, 4).map(m => <img key={m.id} src={m.avatar_url} className="w-10 h-10 rounded-xl border-2 border-slate-900 object-cover bg-white" title={m.full_name} />)}
                            {workspaceMembers.length > 4 && <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-yellow-400 flex items-center justify-center font-black text-xs">+{workspaceMembers.length - 4}</div>}
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Inner Sidebar */}
                    <div className="w-64 border-r-4 border-slate-900 bg-slate-50 p-6 flex flex-col shrink-0 gap-8">
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-4">Groups</h4>
                            <div className="space-y-1.5">
                                {groups.map(g => (
                                    <button key={g.id} onClick={() => setActiveGroup(g)} className={`w-full p-3 rounded-xl flex items-center gap-3 border-2 transition-all ${activeGroup?.id === g.id ? 'border-accent bg-accent/10 text-accent font-black' : 'border-transparent text-slate-600 hover:bg-white hover:border-slate-200 font-bold'}`}>
                                        <div className={`w-2 h-2 rounded-full ${activeGroup?.id === g.id ? 'bg-accent' : 'bg-slate-300'}`} />
                                        <span className="text-xs truncate">{g.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-4">Online Members</h4>
                            <div className="space-y-3">
                                {workspaceMembers.map(m => (
                                    <div key={m.id} className="flex items-center gap-3">
                                        <div className="relative shrink-0"><img src={m.avatar_url} className="w-8 h-8 rounded-lg border-2 border-slate-900" /><div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" /></div>
                                        <div className="min-w-0"><p className="text-[11px] font-black text-slate-800 truncate leading-none mb-1">{m.full_name}</p><p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{m.role}</p></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white">
                        <div
                            className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-[radial-gradient(#e5e7eb_1px,transparent_1px)]"
                            style={{ backgroundSize: '20px 20px' }}
                        >
                            {messages.map((msg, idx) => {
                                const isMe = msg.sender_id === currentUser.id;
                                const replyParent = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) || msg.metadata?.reply_to : null;
                                return (
                                    <div key={msg.id} className={`flex items-start gap-4 ${isMe ? 'flex-row-reverse pl-20' : 'pr-20'}`}>
                                        <img src={msg.sender_avatar} className="w-9 h-9 rounded-xl border-2 border-slate-900 shrink-0 shadow-hard-mini" />
                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0`}>
                                            <div className="flex items-center gap-3 mb-1 px-1">
                                                <span className="font-black text-[11px] text-slate-900 uppercase tracking-tighter">{msg.sender_name}</span>
                                                <span className="text-[9px] font-bold text-slate-300">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            {replyParent && (
                                                <div className={`mb-1 p-2 bg-slate-50 border-l-4 border-accent rounded-lg text-[10px] font-bold text-slate-400 max-w-sm flex items-start gap-2 ${isMe ? 'mr-0' : 'ml-0'}`}>
                                                    <Quote size={10} className="shrink-0 mt-0.5" />
                                                    <span className="truncate whitespace-nowrap"><span className="text-accent">@{replyParent.sender_name || replyParent.name}:</span> {replyParent.content}</span>
                                                </div>
                                            )}
                                            <div className="group relative">
                                                <div className={`p-3.5 rounded-2xl text-[13px] leading-relaxed font-medium transition-all shadow-sm ${isMe ? 'bg-accent text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>{msg.content}</div>
                                                <div className={`absolute -top-10 ${isMe ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 bg-white border-2 border-slate-900 p-1.5 rounded-xl shadow-hard z-30`}>
                                                    <button onClick={() => setReplyTo(msg)} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-accent transition-all"><Reply size={14} /></button>
                                                    <div className="w-px h-4 bg-slate-100 mx-1" />
                                                    <button className="text-lg hover:scale-125 transition-transform px-1">👍</button>
                                                    <button className="text-lg hover:scale-125 transition-transform px-1">🔥</button>
                                                </div>
                                                {isMe && <div className="mt-1 flex items-center gap-1 opacity-60">{msg.read_by && msg.read_by.length > 1 ? <CheckCheck size={12} className="text-blue-500" /> : <Check size={12} className="text-slate-400" />}<span className="text-[9px] font-black text-slate-300 uppercase">Dibaca</span></div>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-8 bg-white border-t-2 border-slate-100">
                            {replyTo && (
                                <div className="mb-4 p-3 bg-slate-50 border-2 border-dashed border-accent rounded-2xl flex items-center justify-between text-xs font-bold text-slate-500">
                                    <div className="flex items-center gap-3 truncate"><div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center text-accent shrink-0"><Reply size={16} /></div><div className="truncate"><p className="text-[10px] text-accent uppercase font-black leading-none mb-1">Reply to {replyTo.sender_name}</p><p className="italic truncate leading-tight opacity-70">"{replyTo.content}"</p></div></div>
                                    <button onClick={() => setReplyTo(null)} className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all"><X size={16} /></button>
                                </div>
                            )}
                            <div className="flex gap-4 items-end relative">
                                {showMentionList && (
                                    <div className="absolute bottom-full mb-4 left-0 w-72 bg-white border-4 border-slate-900 rounded-2xl shadow-hard overflow-hidden z-[100]">
                                        <div className="p-3 bg-slate-50 border-b-2 border-slate-900 text-[10px] font-black uppercase text-slate-400">Mention Member</div>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                            {workspaceMembers.filter(m => m.full_name.toLowerCase().includes(mentionSearch.toLowerCase())).map(m => (
                                                <button key={m.id} onClick={() => {
                                                    const parts = input.split('@');
                                                    parts.pop();
                                                    setInput(parts.join('@') + '@' + m.full_name + ' ');
                                                    setShowMentionList(false);
                                                }} className="w-full px-4 py-3 hover:bg-yellow-50 flex items-center gap-3 border-b last:border-0 border-slate-100 transition-all font-bold text-sm">
                                                    <img src={m.avatar_url} className="w-8 h-8 rounded-lg border-2 border-slate-900" /><span>{m.full_name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex-1 relative">
                                    <textarea
                                        rows={1} value={input}
                                        onChange={e => handleInputChange(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                                        placeholder="Ketik pesan disini..."
                                        className="w-full bg-slate-50 border-4 border-slate-900 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:bg-white transition-all resize-none shadow-hard-mini"
                                    />
                                    <div className="absolute right-4 bottom-4 flex gap-2"><button className="p-1 text-slate-400 hover:text-accent"><Smile size={20} /></button></div>
                                </div>
                                <button
                                    onClick={handleSendMessage}
                                    className="h-[56px] w-[56px] bg-accent text-white rounded-2xl border-4 border-slate-900 shadow-hard flex items-center justify-center hover:-translate-y-1 hover:shadow-hard-hover active:translate-y-0 shadow-none transition-all shrink-0"
                                >
                                    <Send size={24} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
