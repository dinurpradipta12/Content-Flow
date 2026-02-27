import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { MessageSquare, X, Send, Lock, Reply } from 'lucide-react';
import { useLocation } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatNotifPopup {
    id: string;
    senderName: string;
    senderAvatar: string;
    content: string;
    groupName?: string;
    isDM: boolean;
    senderId: string;
    groupId?: string;
}

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

// ─── Component ────────────────────────────────────────────────────────────────

export const ChatNotificationListener: React.FC = () => {
    const location = useLocation();
    const isOnMessagesPage = location.pathname === '/messages';

    const currentUser = {
        id: localStorage.getItem('user_id') || '',
        name: localStorage.getItem('user_name') || 'Guest',
    };

    const [popup, setPopup] = useState<ChatNotifPopup | null>(null);
    const [replyInput, setReplyInput] = useState('');
    const popupTimerRef = useRef<any>(null);
    const groupChannelRef = useRef<any>(null);
    const dmChannelRef = useRef<any>(null);
    // Cache user info to avoid repeated DB calls
    const userCacheRef = useRef<Record<string, { name: string; avatar: string }>>({});

    // Get muted groups from localStorage
    const getMutedGroups = (): Set<string> => {
        try { return new Set(JSON.parse(localStorage.getItem('muted_groups') || '[]')); }
        catch { return new Set(); }
    };

    const showPopup = (notif: ChatNotifPopup) => {
        setPopup(notif);
        setReplyInput('');
        if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
        popupTimerRef.current = setTimeout(() => setPopup(null), 8000);
    };

    // Fetch user info from DB with cache
    const getUserInfo = async (userId: string): Promise<{ name: string; avatar: string }> => {
        if (userCacheRef.current[userId]) return userCacheRef.current[userId];
        const { data } = await supabase.from('app_users').select('full_name, avatar_url').eq('id', userId).single();
        const info = { name: data?.full_name || 'Pengguna', avatar: data?.avatar_url || '' };
        userCacheRef.current[userId] = info;
        return info;
    };

    useEffect(() => {
        if (!currentUser.id) return;

        // ── Group chat messages listener ──────────────────────────────────────
        if (groupChannelRef.current) supabase.removeChannel(groupChannelRef.current);
        const groupChannel = supabase.channel('global-chat-notif-listener')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'workspace_chat_messages' }, async (payload) => {
                const msg = payload.new as any;
                if (msg.sender_id === currentUser.id) return;
                if (isOnMessagesPage) return;

                const mutedGroups = getMutedGroups();
                if (msg.group_id && mutedGroups.has(msg.group_id)) return;

                // Get sender info — prefer from message, fallback to DB
                let senderName = msg.sender_name;
                let senderAvatar = msg.sender_avatar || '';
                if (!senderName || senderName === 'Seseorang') {
                    const info = await getUserInfo(msg.sender_id);
                    senderName = info.name;
                    senderAvatar = senderAvatar || info.avatar;
                }

                // Get group name
                let groupName: string | undefined;
                if (msg.group_id) {
                    const { data: grp } = await supabase.from('workspace_chat_groups').select('name').eq('id', msg.group_id).single();
                    groupName = grp?.name;
                }

                playChatSound();
                showPopup({
                    id: msg.id,
                    senderName,
                    senderAvatar,
                    content: msg.content || '',
                    groupName,
                    isDM: false,
                    senderId: msg.sender_id,
                    groupId: msg.group_id,
                });
            })
            .subscribe();
        groupChannelRef.current = groupChannel;

        // ── DM messages listener ──────────────────────────────────────────────
        if (dmChannelRef.current) supabase.removeChannel(dmChannelRef.current);
        const dmChannel = supabase.channel('global-dm-notif-listener')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, async (payload) => {
                const msg = payload.new as any;
                if (msg.recipient_id !== currentUser.id) return;
                if (msg.sender_id === currentUser.id) return;
                if (isOnMessagesPage) return;

                const key = getDMKey(currentUser.id, msg.sender_id);
                const decryptedContent = msg.type === 'text' ? decryptDM(msg.content, key) : msg.content;

                // Get sender info — prefer from message, fallback to DB
                let senderName = msg.sender_name;
                let senderAvatar = msg.sender_avatar || '';
                if (!senderName || senderName === 'Seseorang') {
                    const info = await getUserInfo(msg.sender_id);
                    senderName = info.name;
                    senderAvatar = senderAvatar || info.avatar;
                }

                playChatSound();
                showPopup({
                    id: msg.id,
                    senderName,
                    senderAvatar,
                    content: decryptedContent,
                    isDM: true,
                    senderId: msg.sender_id,
                });
            })
            .subscribe();
        dmChannelRef.current = dmChannel;

        return () => {
            if (groupChannelRef.current) supabase.removeChannel(groupChannelRef.current);
            if (dmChannelRef.current) supabase.removeChannel(dmChannelRef.current);
            if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
        };
    }, [currentUser.id, isOnMessagesPage]);

    const handleReply = async () => {
        if (!replyInput.trim() || !popup?.isDM) return;
        const key = getDMKey(currentUser.id, popup.senderId);
        const encryptedContent = encryptDM(replyInput, key);
        await supabase.from('direct_messages').insert({
            sender_id: currentUser.id,
            recipient_id: popup.senderId,
            content: encryptedContent,
            type: 'text',
            metadata: {}
        });
        setReplyInput('');
        setPopup(null);
    };

    if (!popup) return null;

    return (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4 animate-in slide-in-from-top-3 duration-300">
            <div className="bg-card border-2 border-border rounded-2xl shadow-hard overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {popup.senderAvatar ? (
                            <img src={popup.senderAvatar} alt="" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                            <MessageSquare size={18} className="text-accent" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-black text-foreground text-sm">{popup.senderName}</span>
                            {popup.groupName && (
                                <span className="text-[10px] text-mutedForeground font-bold bg-muted px-1.5 py-0.5 rounded-full">#{popup.groupName}</span>
                            )}
                            {popup.isDM && (
                                <span className="text-[10px] text-accent font-bold bg-accent/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                    <Lock size={8} /> DM
                                </span>
                            )}
                            {!popup.isDM && (
                                <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-full">
                                    Group
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-mutedForeground truncate">{popup.content}</p>
                    </div>
                    <button onClick={() => setPopup(null)} className="text-mutedForeground hover:text-foreground flex-shrink-0 mt-0.5">
                        <X size={16} />
                    </button>
                </div>

                {/* Reply input for DM */}
                {popup.isDM && (
                    <div className="px-4 pb-4 flex gap-2">
                        <input
                            type="text"
                            value={replyInput}
                            onChange={e => setReplyInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleReply(); }}
                            placeholder="Balas pesan..."
                            className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent transition-colors text-foreground"
                            autoFocus
                        />
                        <button
                            onClick={handleReply}
                            disabled={!replyInput.trim()}
                            className="w-9 h-9 bg-accent text-white rounded-xl flex items-center justify-center hover:bg-accent/90 disabled:opacity-40 transition-all flex-shrink-0"
                        >
                            <Send size={14} />
                        </button>
                    </div>
                )}

                {/* Open chat button for group messages */}
                {!popup.isDM && (
                    <div className="px-4 pb-4 flex gap-2">
                        <a
                            href="/messages"
                            onClick={() => setPopup(null)}
                            className="flex-1 py-2 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 no-underline"
                        >
                            <Reply size={14} /> Buka Messages
                        </a>
                        <button
                            onClick={() => setPopup(null)}
                            className="px-4 py-2 bg-muted text-foreground rounded-xl text-sm font-bold hover:bg-muted/80 transition-colors"
                        >
                            Tutup
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
