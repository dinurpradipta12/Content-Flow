import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { User as UserIcon } from 'lucide-react';

// ── Detect mobile/tablet ──────────────────────────────────────────────────────
const isMobileOrTablet = () =>
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1);

export const PresenceToast = () => {
    const [presence, setPresence] = useState<{ name: string; status: string; avatar?: string } | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const currentUserId = localStorage.getItem('user_id');
    const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
    const membersToTrackRef = useRef<Set<string>>(new Set());
    const statusCacheRef = useRef<Map<string, string>>(new Map());
    const userDetailsRef = useRef<Map<string, { name: string; avatar?: string }>>(new Map());
    const channelRef = useRef<any>(null);

    useEffect(() => {
        setIsMobile(isMobileOrTablet());
    }, []);

    useEffect(() => {
        if (!currentUserId) return;

        let isMounted = true;

        const setupPresenceTracking = async () => {
            try {
                const { data: currentUser } = await supabase
                    .from('app_users')
                    .select('id, avatar_url')
                    .eq('id', currentUserId)
                    .single();

                if (!currentUser || !isMounted) return;
                const myAvatar = currentUser.avatar_url;

                const { data: workspaces } = await supabase
                    .from('workspaces')
                    .select('owner_id, members');

                if (!workspaces || !isMounted) return;

                const memberIdsSet = new Set<string>();
                const memberAvatarsSet = new Set<string>();

                workspaces.forEach(ws => {
                    const members = ws.members || [];
                    const isMember = (ws.owner_id === currentUserId) ||
                        members.some((m: string) => {
                            if (m === currentUserId) return true;
                            try { return decodeURIComponent(m) === decodeURIComponent(myAvatar || '') || m === myAvatar; }
                            catch { return m === myAvatar; }
                        });

                    if (isMember) {
                        members.forEach((m: string) => {
                            if (m === currentUserId || m === myAvatar) return;
                            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m);
                            if (isUUID) {
                                memberIdsSet.add(m);
                            } else if (m.startsWith('http') && !m.startsWith('data:')) {
                                memberAvatarsSet.add(m);
                            }
                        });
                    }
                });

                const memberIds = Array.from(memberIdsSet);
                const memberAvatars = Array.from(memberAvatarsSet);

                if (memberIds.length > 0 || memberAvatars.length > 0) {
                    let query = supabase.from('app_users').select('id, online_status, full_name, username, avatar_url');

                    const filters = [];
                    if (memberIds.length > 0) filters.push(`id.in.(${memberIds.join(',')})`);
                    if (memberAvatars.length > 0) filters.push(`avatar_url.in.(${memberAvatars.map(a => `"${a}"`).join(',')})`);

                    const { data: usersToTrack } = await query.or(filters.join(','));

                    if (usersToTrack && isMounted) {
                        membersToTrackRef.current.clear();
                        statusCacheRef.current.clear();

                        usersToTrack.forEach(u => {
                            membersToTrackRef.current.add(u.id);
                            userDetailsRef.current.set(u.id, {
                                name: u.full_name || u.username || 'Seseorang',
                                avatar: u.avatar_url
                            });
                            if (u.online_status) {
                                statusCacheRef.current.set(u.id, u.online_status);
                            }
                        });

                        if (channelRef.current) {
                            supabase.removeChannel(channelRef.current);
                        }

                        const channel = supabase
                            .channel(`presence_toast_${currentUserId}_${Date.now()}`)
                            .on(
                                'postgres_changes',
                                {
                                    event: 'UPDATE',
                                    schema: 'public',
                                    table: 'app_users'
                                },
                                (payload) => {
                                    const newUser = payload.new;
                                    const userId = newUser.id;
                                    const newStatus = newUser.online_status;

                                    if (!membersToTrackRef.current.has(userId)) return;
                                    if (userId === currentUserId) return;

                                    const lastStatus = statusCacheRef.current.get(userId);

                                    if (newStatus && newStatus !== lastStatus) {
                                        statusCacheRef.current.set(userId, newStatus);

                                        const cached = userDetailsRef.current.get(userId);
                                        setPresence({
                                            name: newUser.full_name || newUser.username || cached?.name || 'Seseorang',
                                            status: newStatus,
                                            avatar: newUser.avatar_url || cached?.avatar
                                        });
                                        setIsVisible(true);

                                        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                                        toastTimerRef.current = setTimeout(() => {
                                            setIsVisible(false);
                                        }, 6000);
                                    }
                                }
                            )
                            .subscribe();

                        channelRef.current = channel;
                    }
                }
            } catch (err) {
                console.error('Presence setup error:', err);
            }
        };

        setupPresenceTracking();

        const intervalId = setInterval(() => {
            if (isMounted) setupPresenceTracking();
        }, 3 * 60 * 1000);

        return () => {
            isMounted = false;
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            if (intervalId) clearInterval(intervalId);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [currentUserId]);

    const getStatusText = (status: string) => {
        switch (status) {
            case 'online': return 'sedang online';
            case 'offline': return 'telah offline';
            case 'idle': return 'sedang idle';
            default: return status;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return '#22c55e';   // green-500
            case 'offline': return '#94a3b8';  // slate-400
            case 'idle': return '#eab308';     // yellow-500
            default: return '#cbd5e1';
        }
    };

    const getStatusEmoji = (status: string) => {
        switch (status) {
            case 'online': return '🟢';
            case 'offline': return '⚫';
            case 'idle': return '🟡';
            default: return '⚪';
        }
    };

    if (!presence) return null;

    // ── MOBILE: Dynamic Island-style pill ────────────────────────────────────
    if (isMobile) {
        return (
            <div
                className={`fixed left-1/2 -translate-x-1/2 z-[1001] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    isVisible
                        ? 'translate-y-0 opacity-100 scale-100'
                        : '-translate-y-full opacity-0 scale-75 pointer-events-none'
                }`}
                style={{ top: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))' }}
            >
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-[20px] bg-[#0d0d0d] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] whitespace-nowrap">
                    {/* Animated status dot */}
                    <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
                        style={{ backgroundColor: getStatusColor(presence.status) }}
                    ></div>

                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        {presence.avatar ? (
                            <img
                                src={presence.avatar}
                                alt=""
                                className="w-7 h-7 rounded-full border border-white/20 object-cover"
                            />
                        ) : (
                            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                                <UserIcon size={12} className="text-white/60" />
                            </div>
                        )}
                    </div>

                    {/* Text */}
                    <p className="text-[12px] font-bold text-white leading-none">
                        <span className="font-extrabold text-white">{presence.name}</span>
                        <span className="text-white/50 ml-1.5">{getStatusText(presence.status)}</span>
                    </p>
                </div>
            </div>
        );
    }

    // ── DESKTOP: Original pill style ─────────────────────────────────────────
    return (
        <div
            className={`fixed top-[4.5rem] sm:top-20 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-2.5 rounded-full bg-card backdrop-blur-md border-[2.5px] border-slate-900 shadow-hard transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] whitespace-nowrap z-[1000] ${
                isVisible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'
            }`}
        >
            <div
                className="w-3 h-3 rounded-full border-2 border-white animate-pulse shrink-0"
                style={{ backgroundColor: getStatusColor(presence.status) }}
            ></div>

            <div className="shrink-0">
                {presence.avatar ? (
                    <img src={presence.avatar} alt="" className="w-8 h-8 rounded-full border-2 border-slate-200 object-cover shadow-sm" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                        <UserIcon size={14} className="text-slate-400" />
                    </div>
                )}
            </div>

            <p className="text-xs font-bold text-slate-800 pr-1">
                <span className="font-extrabold text-slate-900 uppercase tracking-tight">{presence.name}</span>
                <span className="text-slate-500 ml-1.5">saat ini {getStatusText(presence.status)}</span>
            </p>
        </div>
    );
};
