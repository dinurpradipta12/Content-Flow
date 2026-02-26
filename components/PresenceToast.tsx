import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { User as UserIcon, Circle } from 'lucide-react';

export const PresenceToast = () => {
    const [presence, setPresence] = useState<{ name: string; status: string } | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const currentUserId = localStorage.getItem('user_id');

    useEffect(() => {
        if (!currentUserId) return;

        let membersToTrackAvatars: string[] = [];
        const statusCache = new Map<string, string>();

        const setupPresenceTracking = async () => {
            // 0. Get current user's data
            const { data: currentUser } = await supabase
                .from('app_users')
                .select('id, avatar_url, username')
                .eq('id', currentUserId)
                .single();

            if (!currentUser) return;
            const myAvatar = currentUser.avatar_url;

            // 1. Get workspaces current user is in
            // We fetch all and filter locally for robustness against encoding
            const { data: workspaces } = await supabase
                .from('workspaces')
                .select('owner_id, admin_id, members');

            if (workspaces) {
                // 2. Extract unique members' avatars (excluding self)
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
                membersToTrackAvatars = Array.from(avatarSet);
                console.log(`Presence Tracking: Tracking ${membersToTrackAvatars.length} workspace peers.`);

                // 2.5 Pre-populate statusCache with current statuses
                if (membersToTrackAvatars.length > 0) {
                    const { data: currentStatuses } = await supabase
                        .from('app_users')
                        .select('id, online_status')
                        .in('avatar_url', membersToTrackAvatars);

                    if (currentStatuses) {
                        currentStatuses.forEach(u => {
                            if (u.online_status) statusCache.set(u.id, u.online_status);
                        });
                    }
                }
            }

            // 3. Subscribe to updates
            const channel = supabase
                .channel('room_presence_toast')
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
                        const avatar = newUser.avatar_url;

                        // Skip self
                        if (userId === currentUserId) return;

                        // Only if member is in our workspaces (checked by avatar)
                        if (avatar && membersToTrackAvatars.includes(avatar)) {
                            const lastStatus = statusCache.get(userId);

                            // Only if status actually changed
                            if (newStatus && newStatus !== lastStatus) {
                                statusCache.set(userId, newStatus);

                                // Don't show toast on initial load (when cache is empty for this user)
                                if (lastStatus !== undefined) {
                                    setPresence({
                                        name: newUser.full_name || newUser.username,
                                        status: newStatus
                                    });
                                    setIsVisible(true);

                                    // Hide after 5 seconds
                                    setTimeout(() => {
                                        setIsVisible(false);
                                    }, 5000);
                                }
                            }
                        }
                    }
                )
                .subscribe();

            return channel;
        };

        const channelPromise = setupPresenceTracking();

        return () => {
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
            className={`absolute top-0 right-full mr-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border-[2.5px] border-slate-900 shadow-hard-mini transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden scale-90 sm:scale-100 whitespace-nowrap z-50 ${isVisible ? 'translate-y-0.5 opacity-100' : '-translate-y-12 opacity-0 pointer-events-none'
                }`}
        >
            <div className="relative shrink-0">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                    <UserIcon size={12} className="text-slate-600" />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusColor(presence.status)} animate-pulse`}></div>
            </div>
            <p className="text-[10px] font-bold text-slate-800 whitespace-nowrap pr-1">
                <span className="font-extrabold text-slate-900">{presence.name}</span> <span className="text-slate-500">{getStatusText(presence.status)}</span>
            </p>
        </div>
    );
};
