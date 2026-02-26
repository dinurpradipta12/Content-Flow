import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { User as UserIcon } from 'lucide-react';

export const PresenceToast = () => {
    const [presence, setPresence] = useState<{ name: string; status: string } | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const currentUserId = localStorage.getItem('user_id');
    const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!currentUserId) return;

        let membersToTrackIds: string[] = [];
        const statusCache = new Map<string, string>();

        const setupPresenceTracking = async () => {
            try {
                // 0. Get current user's data
                const { data: currentUser } = await supabase
                    .from('app_users')
                    .select('id, avatar_url')
                    .eq('id', currentUserId)
                    .single();

                if (!currentUser) return;
                const myAvatar = currentUser.avatar_url;

                // 1. Get all workspaces to find where user is a member
                const { data: workspaces } = await supabase
                    .from('workspaces')
                    .select('owner_id, admin_id, members');

                if (!workspaces) return;

                // 2. Extract unique members' avatars of our workspaces
                const avatarSet = new Set<string>();
                workspaces.forEach(ws => {
                    const isMember = (ws.owner_id === currentUserId || ws.admin_id === currentUserId) ||
                        (ws.members || []).some((m: string) => {
                            try { return decodeURIComponent(m) === decodeURIComponent(myAvatar || '') || m === myAvatar; }
                            catch { return m === myAvatar; }
                        });

                    if (isMember && ws.members) {
                        ws.members.forEach((m: string) => {
                            if (m !== myAvatar) avatarSet.add(m);
                        });
                    }
                });

                const membersToTrackAvatars = Array.from(avatarSet);

                // 3. Map avatars to User IDs for reliable tracking
                if (membersToTrackAvatars.length > 0) {
                    const { data: usersToTrack } = await supabase
                        .from('app_users')
                        .select('id, online_status')
                        .in('avatar_url', membersToTrackAvatars);

                    if (usersToTrack) {
                        usersToTrack.forEach(u => {
                            membersToTrackIds.push(u.id);
                            if (u.online_status) statusCache.set(u.id, u.online_status);
                        });
                    }
                }

                console.log(`Presence System: Tracking ${membersToTrackIds.length} peers.`);

                // 4. Realtime Subscription
                const channel = supabase
                    .channel('global_presence_toast')
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

                            // Skip self
                            if (userId === currentUserId) return;

                            // Only if user is in our track list
                            if (membersToTrackIds.includes(userId)) {
                                const lastStatus = statusCache.get(userId);

                                // Only if status actually changed
                                if (newStatus && newStatus !== lastStatus) {
                                    statusCache.set(userId, newStatus);

                                    // Trigger toast (except on initial state fill which shouldn't happen here)
                                    if (lastStatus !== undefined) {
                                        setPresence({
                                            name: newUser.full_name || newUser.username || 'Seseorang',
                                            status: newStatus
                                        });
                                        setIsVisible(true);

                                        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                                        toastTimerRef.current = setTimeout(() => {
                                            setIsVisible(false);
                                        }, 10000); // 10 seconds visibility
                                    }
                                }
                            }
                        }
                    )
                    .subscribe((status) => {
                        console.log('Presence Subscription Status:', status);
                    });

                return channel;
            } catch (err) {
                console.error('Presence setup error:', err);
            }
        };

        const channelPromise = setupPresenceTracking();

        return () => {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            channelPromise.then(channel => {
                if (channel) supabase.removeChannel(channel);
            });
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
            className={`absolute top-0 right-full mr-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border-[2.5px] border-slate-900 shadow-hard-mini transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] scale-90 sm:scale-100 whitespace-nowrap z-50 ${isVisible ? 'translate-y-0.5 opacity-100' : '-translate-y-12 opacity-0 pointer-events-none'
                }`}
        >
            <div className="relative shrink-0">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                    <UserIcon size={12} className="text-slate-600" />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusColor(presence.status)} animate-pulse`}></div>
            </div>
            <p className="text-[10px] font-bold text-slate-800 pr-1">
                <span className="font-extrabold text-slate-900">{presence.name}</span> <span className="text-slate-500">{getStatusText(presence.status)}</span>
            </p>
        </div>
    );
};
