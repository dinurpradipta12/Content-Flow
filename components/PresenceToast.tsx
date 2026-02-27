import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { User as UserIcon } from 'lucide-react';

export const PresenceToast = () => {
    const [presence, setPresence] = useState<{ name: string; status: string; avatar?: string } | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const currentUserId = localStorage.getItem('user_id');
    const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
    const membersToTrackRef = useRef<Set<string>>(new Set());
    const statusCacheRef = useRef<Map<string, string>>(new Map());
    const userDetailsRef = useRef<Map<string, { name: string; avatar?: string }>>(new Map());
    const channelRef = useRef<any>(null);

    useEffect(() => {
        if (!currentUserId) return;

        let isMounted = true;

        const setupPresenceTracking = async () => {
            try {
                // 0. Get current user's data
                const { data: currentUser } = await supabase
                    .from('app_users')
                    .select('id, avatar_url')
                    .eq('id', currentUserId)
                    .single();

                if (!currentUser || !isMounted) return;
                const myAvatar = currentUser.avatar_url;

                // 1. Get all workspaces to find where user is a member
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

                            // Check if it's a UUID (User ID)
                            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m);
                            if (isUUID) {
                                memberIdsSet.add(m);
                            } else if (m.startsWith('http') && !m.startsWith('data:')) {
                                // Only track non-base64 avatars to avoid URI length issues
                                memberAvatarsSet.add(m);
                            }
                        });
                    }
                });

                const memberIds = Array.from(memberIdsSet);
                const memberAvatars = Array.from(memberAvatarsSet);

                console.log(`Presence System: Found ${memberIds.length} IDs and ${memberAvatars.length} Avatars to track`);

                // 3. Map members to User IDs for reliable tracking
                if (memberIds.length > 0 || memberAvatars.length > 0) {
                    let query = supabase.from('app_users').select('id, online_status, full_name, username, avatar_url');

                    // Build OR filter: match by ID OR by Avatar URL
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

                        console.log(`Presence System: Tracking ${membersToTrackRef.current.size} peers`);

                        // 4. Setup Realtime Subscription
                        // Remove old channel if exists
                        if (channelRef.current) {
                            supabase.removeChannel(channelRef.current);
                        }

                        // Subscribe to ALL app_users updates, filter in callback
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

                                    // Only process if it's a user we're tracking
                                    if (!membersToTrackRef.current.has(userId)) return;

                                    // Skip self
                                    if (userId === currentUserId) return;

                                    const lastStatus = statusCacheRef.current.get(userId);

                                    // Show toast if status changed
                                    if (newStatus && newStatus !== lastStatus) {
                                        statusCacheRef.current.set(userId, newStatus);

                                        // Show toast even on first status update
                                        // Use cached details if payload is missing them
                                        const cached = userDetailsRef.current.get(userId);
                                        setPresence({
                                            name: newUser.full_name || newUser.username || cached?.name || 'Seseorang',
                                            status: newStatus,
                                            avatar: newUser.avatar_url || cached?.avatar
                                        });
                                        setIsVisible(true);

                                        console.log(`[Presence] ${newUser.full_name || newUser.username} is now ${newStatus}`);

                                        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                                        toastTimerRef.current = setTimeout(() => {
                                            setIsVisible(false);
                                        }, 8000);
                                    }
                                }
                            )
                            .subscribe((status, error) => {
                                console.log(`[Presence] Subscription status: ${status}`, error);
                            });

                        channelRef.current = channel;
                    }
                } else {
                    console.log('No workspace members to track');
                }
            } catch (err) {
                console.error('Presence setup error:', err);
            }
        };

        setupPresenceTracking();

        // Re-setup tracking every 3 minutes to catch workspace membership changes
        const intervalId = setInterval(() => {
            if (isMounted) {
                setupPresenceTracking();
            }
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
            case 'online': return 'bg-green-500';
            case 'offline': return 'bg-slate-400';
            case 'idle': return 'bg-yellow-500';
            default: return 'bg-slate-300';
        }
    };

    if (!presence) return null;

    return (
        <div
            className={`fixed top-24 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-2.5 rounded-full bg-card backdrop-blur-md border-[2.5px] border-slate-900 shadow-hard transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-90 sm:scale-100 whitespace-nowrap z-[1000] ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'
                }`}
        >
            <div className={`w-3 h-3 rounded-full border-2 border-white ${getStatusColor(presence.status)} animate-pulse shrink-0`}></div>

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
