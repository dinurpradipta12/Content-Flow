import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
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
    Settings,
    MoreHorizontal,
    UserPlus,
    UserMinus,
    Search,
    ChevronRight,
    AtSign,
    Edit2,
    Save,
    Image as ImageIcon
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useNotifications } from '../NotificationProvider';

interface WorkspaceChatProps {
    workspaceId: string;
    currentUser: {
        id: string;
        name: string;
        avatar?: string;
        role?: string;
    };
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

export const WorkspaceChat: React.FC<WorkspaceChatProps> = ({ workspaceId, currentUser }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'groups' | 'online'>('groups');
    const [groups, setGroups] = useState<ChatGroup[]>([]);
    const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [showGroupCreate, setShowGroupCreate] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [editingGroup, setEditingGroup] = useState<ChatGroup | null>(null);
    const [editName, setEditName] = useState('');
    const [editIcon, setEditIcon] = useState('users');

    const chatEndRef = useRef<HTMLDivElement>(null);
    const activeGroupRef = useRef<ChatGroup | null>(null);
    const { sendNotification } = useNotifications();

    const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'Owner' || currentUser.role === 'Developer';

    // 1. Initial Data Fetch
    useEffect(() => {
        if (!workspaceId) return;
        fetchWorkspaceMembers();
        fetchGroups();
        setupRealtime();
    }, [workspaceId]);

    // 2. Fetch Messages when active group changes
    useEffect(() => {
        if (activeGroup) {
            activeGroupRef.current = activeGroup;
            fetchMessages(activeGroup.id);
            markGroupAsRead(activeGroup.id);
        }
    }, [activeGroup]);

    // 3. Scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchWorkspaceMembers = async () => {
        const { data: wsData } = await supabase
            .from('workspaces')
            .select('members, admin_id')
            .eq('id', workspaceId)
            .single();

        if (wsData) {
            const { data: userData } = await supabase
                .from('app_users')
                .select('id, full_name, avatar_url, role');

            if (userData) {
                const members = userData.filter(u => wsData.members.includes(u.avatar_url) || u.id === wsData.admin_id);
                setWorkspaceMembers(members);
                setOnlineUsers(members);
            }
        }
    };

    const fetchGroups = async () => {
        const { data, error } = await supabase
            .from('workspace_chat_groups')
            .select('*')
            .eq('workspace_id', workspaceId);

        if (data) {
            setGroups(data);
            if (data.length > 0 && !activeGroup) {
                setActiveGroup(data[0]);
            } else if (data.length === 0 && isAdmin) {
                createGroup("General", []);
            }
        }
    };

    const createGroup = async (name: string, MemberIds: string[]) => {
        const { data, error } = await supabase
            .from('workspace_chat_groups')
            .insert({
                name,
                workspace_id: workspaceId,
                icon: 'users',
                created_by: currentUser.id
            })
            .select()
            .single();

        if (data) {
            const members = [currentUser.id, ...MemberIds].map(uid => ({
                group_id: data.id,
                user_id: uid
            }));
            await supabase.from('workspace_chat_members').insert(members);
            fetchGroups();
            setShowGroupCreate(false);
            setNewGroupName('');
            setSelectedMembers([]);
        }
    };

    const updateGroup = async () => {
        if (!editingGroup) return;
        const { error } = await supabase
            .from('workspace_chat_groups')
            .update({ name: editName, icon: editIcon })
            .eq('id', editingGroup.id);

        if (!error) {
            fetchGroups();
            if (activeGroup?.id === editingGroup.id) {
                setActiveGroup({ ...activeGroup, name: editName, icon: editIcon });
            }
            setEditingGroup(null);
        }
    };

    const fetchMessages = async (groupId: string) => {
        const { data, error } = await supabase
            .from('workspace_chat_messages')
            .select('*')
            .eq('group_id', groupId)
            .order('created_at', { ascending: true });

        if (data) {
            const { data: reads } = await supabase
                .from('workspace_chat_reads')
                .select('message_id, user_id')
                .eq('group_id', groupId);

            const messagesWithReads = data.map(msg => ({
                ...msg,
                read_by: reads?.filter(r => r.message_id === msg.id).map(r => r.user_id) || []
            }));

            setMessages(messagesWithReads);
        }
    };

    const setupRealtime = () => {
        const channel = supabase
            .channel(`workspace_chat_global:${workspaceId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'workspace_chat_messages' },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    if (activeGroupRef.current && newMsg.group_id === activeGroupRef.current.id) {
                        setMessages(prev => {
                            if (prev.some(m => m.id === newMsg.id)) return prev;
                            return [...prev, { ...newMsg, read_by: [] }];
                        });
                        markAsRead(newMsg.id);
                    } else {
                        setUnreadCount(prev => prev + 1);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'workspace_chat_groups' },
                () => fetchGroups()
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'workspace_chat_reads' },
                (payload) => {
                    const newRead = payload.new;
                    setMessages(prev => prev.map(msg =>
                        msg.id === newRead.message_id
                            ? { ...msg, read_by: [...(msg.read_by || []), newRead.user_id] }
                            : msg
                    ));
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    const markAsRead = async (messageId: string) => {
        await supabase.from('workspace_chat_reads').insert({
            message_id: messageId,
            user_id: currentUser.id,
            group_id: activeGroupRef.current?.id
        });
    };

    const markGroupAsRead = async (groupId: string) => {
        // Implementation for marking all as read if needed
    };

    const handleSendMessage = async () => {
        if (!input.trim() || !activeGroup) return;

        const content = input;
        const msgType = content.includes('@') ? 'mention' : 'text';

        // Optimistic UI
        const tempId = `temp-${Date.now()}`;
        const optimisticMsg: ChatMessage = {
            id: tempId,
            group_id: activeGroup.id,
            sender_id: currentUser.id,
            sender_name: currentUser.name,
            sender_avatar: currentUser.avatar || '',
            content,
            type: msgType,
            reply_to_id: replyTo?.id,
            metadata: {
                reply_to: replyTo ? { name: replyTo.sender_name, content: replyTo.content } : null
            },
            created_at: new Date().toISOString(),
            read_by: [currentUser.id]
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setInput('');
        setReplyTo(null);

        const { data, error } = await supabase
            .from('workspace_chat_messages')
            .insert({
                group_id: optimisticMsg.group_id,
                sender_id: optimisticMsg.sender_id,
                sender_name: optimisticMsg.sender_name,
                sender_avatar: optimisticMsg.sender_avatar,
                content: optimisticMsg.content,
                type: optimisticMsg.type,
                reply_to_id: optimisticMsg.reply_to_id,
                metadata: optimisticMsg.metadata
            })
            .select()
            .single();

        if (data) {
            setMessages(prev => prev.map(m => (m.id === tempId ? { ...data, read_by: [currentUser.id] } : m)));
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
                                title: `Disebut di Chat Workspace`,
                                content: `${currentUser.name} menyebut Anda: "${content}"`,
                                metadata: { workspace_id: workspaceId }
                            });
                        }
                    }
                }
            }
            markAsRead(data.id);
        }
    };

    const handleInputChange = (val: string) => {
        setInput(val);
        const lastChar = val.slice(-1);
        if (lastChar === '@') {
            setShowMentionList(true);
            setMentionSearch('');
        } else if (showMentionList) {
            const parts = val.split('@');
            setMentionSearch(parts[parts.length - 1]);
        } else {
            setShowMentionList(false);
        }
    };

    const handleMentionSelect = (memberName: string) => {
        const parts = input.split('@');
        parts.pop();
        setInput(parts.join('@') + '@' + memberName + ' ');
        setShowMentionList(false);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            {!isOpen && (
                <button
                    onClick={() => { setIsOpen(true); setUnreadCount(0); }}
                    className="w-16 h-16 bg-accent text-white rounded-2xl border-4 border-slate-900 shadow-hard hover:-translate-y-1 transition-all flex items-center justify-center relative group"
                >
                    <MessageSquare size={32} />
                    {unreadCount > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full border-2 border-slate-900 animate-bounce">
                            {unreadCount}
                        </div>
                    )}
                </button>
            )}

            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[750px] h-[550px] bg-white border-4 border-slate-900 rounded-3xl shadow-hard flex overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
                    <div className="flex-[2.2] flex flex-col border-r-4 border-slate-900 bg-slate-50">
                        <div className="h-14 bg-white border-b-4 border-slate-900 flex items-center justify-between px-6 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-accent/10 rounded-lg border-2 border-slate-900 flex items-center justify-center">
                                    <MessageSquare size={16} className="text-accent" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-xs uppercase tracking-tight">{activeGroup?.name || 'Loading...'}</h3>
                                    <p className="text-[8px] font-bold text-slate-400">TIMESTAMP: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {messages.map((msg) => {
                                const isMe = msg.sender_id === currentUser.id;
                                const isAllRead = msg.read_by && (msg.read_by.length >= workspaceMembers.length);

                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group relative`}>
                                            <div className="w-10 h-10 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center shrink-0 overflow-hidden shadow-[2px_2px_0px_0px_#0f172a]">
                                                {msg.sender_avatar ? <img src={msg.sender_avatar} className="w-full h-full object-cover" /> : <Users size={20} />}
                                            </div>
                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%] relative`}>
                                                <div className="flex items-center gap-2 mb-1 px-1">
                                                    <span className="font-black text-[10px] text-slate-900 uppercase">{msg.sender_name}</span>
                                                    <span className="text-[9px] font-bold text-slate-400">
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className={`p-3 rounded-2xl border-2 border-slate-900 text-sm font-bold shadow-hard relative ${isMe ? 'bg-accent text-white rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none'}`}>
                                                    {msg.content}
                                                    <div className={`absolute -top-3 ${isMe ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20`}>
                                                        <button onClick={() => setReplyTo(msg)} className="p-1.5 bg-white border-2 border-slate-900 rounded-lg text-slate-600 hover:text-accent shadow-hard"><Reply size={12} /></button>
                                                        <button className="p-1.5 bg-white border-2 border-slate-900 rounded-lg text-slate-600 hover:text-yellow-500 shadow-hard"><Smile size={12} /></button>
                                                    </div>
                                                    <div className="absolute -right-8 bottom-1 group/reads cursor-help flex items-center gap-1">
                                                        {isMe && (
                                                            <div className="flex">
                                                                {isAllRead ? <CheckCheck size={14} className="text-blue-500" /> : <CheckCheck size={14} className="text-slate-300" />}
                                                            </div>
                                                        )}
                                                        <ChevronRight size={10} className="text-slate-400 group-hover/reads:rotate-90 transition-transform" />
                                                        <div className="absolute bottom-full right-0 mb-2 invisible group-hover/reads:visible bg-white border-2 border-slate-900 p-2 rounded-xl shadow-hard z-30 min-w-[120px]">
                                                            <p className="text-[10px] font-black text-slate-400 mb-1 border-b pb-1 uppercase italic tracking-tighter">Dibaca oleh:</p>
                                                            <div className="space-y-1">
                                                                {msg.read_by?.map(uid => {
                                                                    const u = workspaceMembers.find(mu => mu.id === uid);
                                                                    return u ? <div key={uid} className="flex items-center gap-2"><img src={u.avatar_url} className="w-4 h-4 rounded-full border border-slate-900" /><span className="text-[9px] font-black">{u.full_name}</span></div> : null;
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        <div className="p-4 bg-white border-t-4 border-slate-900 shrink-0">
                            {replyTo && (
                                <div className="mb-2 p-2 bg-slate-50 border-2 border-dashed border-slate-900 rounded-lg flex items-center justify-between text-[10px] font-bold text-slate-500">
                                    <div className="flex items-center gap-2 truncate">
                                        <Reply size={12} className="text-accent" />
                                        <span>Membalas @{replyTo.sender_name}: </span>
                                        <span className="italic truncate">"{replyTo.content}"</span>
                                    </div>
                                    <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-red-50 text-red-500 rounded-lg"><X size={10} /></button>
                                </div>
                            )}

                            <div className="flex gap-3 relative">
                                {showMentionList && (
                                    <div className="absolute bottom-full mb-3 left-0 w-64 bg-white border-4 border-slate-900 rounded-2xl shadow-hard overflow-hidden z-20">
                                        <div className="p-3 border-b-2 border-slate-900 bg-accent/5 flex items-center gap-2">
                                            <AtSign size={14} className="text-accent" />
                                            <span className="font-black text-[10px] uppercase tracking-tighter">Sebut Anggota</span>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                            {workspaceMembers.filter(m => m.full_name.toLowerCase().includes(mentionSearch.toLowerCase())).map(m => (
                                                <button key={m.id} onClick={() => handleMentionSelect(m.full_name)} className="w-full p-2 hover:bg-yellow-50 flex items-center gap-3 transition-colors border-b last:border-0 border-slate-100">
                                                    <img src={m.avatar_url} className="w-8 h-8 rounded-lg border-2 border-slate-900" /><span className="text-xs font-bold text-slate-800">{m.full_name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={e => handleInputChange(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Ketik pesan..."
                                        className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl px-4 py-2 font-bold text-[13px] outline-none focus:bg-yellow-50 transition-colors shadow-hard-mini"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1"><button className="p-1 text-slate-400 hover:text-accent transition-colors"><Smile size={16} /></button></div>
                                </div>
                                <button onClick={handleSendMessage} className="bg-accent text-white p-3 rounded-xl border-2 border-slate-900 shadow-hard-mini hover:translate-y-1 hover:shadow-none transition-all shrink-0"><Send size={18} /></button>
                            </div>
                        </div>
                    </div>

                    <div className="w-[280px] flex flex-col shrink-0">
                        <div className="flex h-16 shrink-0 border-b-4 border-slate-900">
                            <button onClick={() => setActiveTab('groups')} className={`flex-1 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-tighter ${activeTab === 'groups' ? 'bg-yellow-400' : 'bg-white hover:bg-slate-50'}`}><Users size={16} /> Groups</button>
                            <button onClick={() => setActiveTab('online')} className={`flex-1 flex items-center justify-center gap-2 border-l-4 border-slate-900 font-black text-xs uppercase tracking-tighter ${activeTab === 'online' ? 'bg-yellow-400' : 'bg-white hover:bg-slate-50'}`}><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Online</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                            {activeTab === 'groups' ? (
                                <>
                                    <div className="flex items-center justify-between mb-2 px-2">
                                        <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest italic">Daftar Group</h4>
                                        {isAdmin && <button onClick={() => setShowGroupCreate(true)} className="p-1.5 bg-accent text-white rounded-lg border-2 border-slate-900 hover:-translate-y-1 transition-all shadow-hard-mini"><Plus size={12} /></button>}
                                    </div>
                                    <div className="space-y-2">
                                        {groups.map(group => (
                                            <button key={group.id} onClick={() => setActiveGroup(group)} className={`w-full p-4 rounded-2xl border-4 text-left transition-all relative overflow-hidden group/item ${activeGroup?.id === group.id ? 'bg-accent/5 border-accent shadow-hard-mini' : 'bg-white border-slate-900 hover:border-accent'}`}>
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-xl border-2 border-slate-900 ${activeGroup?.id === group.id ? 'bg-accent text-white' : 'bg-slate-100'}`}>{group.icon === 'image' ? <ImageIcon size={14} /> : <Users size={14} />}</div>
                                                        <span className="font-black text-xs text-slate-800">{group.name}</span>
                                                    </div>
                                                    {isAdmin && <button onClick={(e) => { e.stopPropagation(); setEditingGroup(group); setEditName(group.name); setEditIcon(group.icon || 'users'); }} className="opacity-0 group-hover/item:opacity-100 p-2 text-slate-400 hover:text-accent transition-all"><Edit2 size={12} /></button>}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    {editingGroup && (
                                        <div className="bg-white p-4 rounded-2xl border-4 border-accent space-y-3 shadow-hard">
                                            <div className="flex items-center justify-between"><p className="font-black text-[10px] uppercase text-accent">Edit Group Info</p><button onClick={() => setEditingGroup(null)}><X size={14} /></button></div>
                                            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 border-2 border-slate-900 rounded-lg font-bold text-xs" />
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditIcon('users')} className={`flex-1 p-2 border-2 rounded-lg flex items-center justify-center ${editIcon === 'users' ? 'border-accent bg-accent/10' : 'border-slate-200'}`}><Users size={16} /></button>
                                                <button onClick={() => setEditIcon('image')} className={`flex-1 p-2 border-2 rounded-lg flex items-center justify-center ${editIcon === 'image' ? 'border-accent bg-accent/10' : 'border-slate-200'}`}><ImageIcon size={16} /></button>
                                            </div>
                                            <Button onClick={updateGroup} className="w-full bg-accent text-white text-[10px] py-2">Simpan</Button>
                                        </div>
                                    )}
                                    {showGroupCreate && (
                                        <div className="bg-slate-900/5 p-4 rounded-2xl border-4 border-slate-900 border-dashed space-y-3">
                                            <div className="flex items-center justify-between"><p className="font-black text-[10px] uppercase text-slate-600">Buat Group</p><button onClick={() => setShowGroupCreate(false)}><X size={14} /></button></div>
                                            <input type="text" placeholder="Nama Group..." value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="w-full p-2 border-2 border-slate-900 rounded-lg font-bold text-xs" />
                                            <div className="max-h-32 overflow-y-auto space-y-1">
                                                {workspaceMembers.map(m => (
                                                    <label key={m.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-white rounded">
                                                        <input type="checkbox" checked={selectedMembers.includes(m.id)} onChange={(e) => { if (e.target.checked) setSelectedMembers([...selectedMembers, m.id]); else setSelectedMembers(selectedMembers.filter(id => id !== m.id)); }} className="accent-accent" />
                                                        <span className="text-[10px] font-bold truncate">{m.full_name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <Button onClick={() => createGroup(newGroupName, selectedMembers)} disabled={!newGroupName.trim()} className="w-full bg-accent text-white text-[10px] py-2">Buat</Button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest italic mb-4 px-2">Online</h4>
                                    <div className="space-y-3">
                                        {onlineUsers.map(user => (
                                            <div key={user.id} className="flex items-center justify-between p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-hard-mini hover:bg-green-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative"><img src={user.avatar_url} className="w-10 h-10 rounded-xl border-2 border-slate-900 shadow-hard-mini" /><div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" /></div>
                                                    <div><p className="font-black text-xs text-slate-900 truncate max-w-[120px]">{user.full_name}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{user.role}</p></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
