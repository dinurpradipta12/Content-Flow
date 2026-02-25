import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { AppNotification, NotificationType } from '../types';
import { Bell, Info, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { checkUpcomingContent } from '../services/notificationService';
import { AlertTriangle, CheckCircle2, MessageSquare, Clock } from 'lucide-react';

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    handleNotificationClick: (notif: AppNotification) => void;
    sendNotification: (params: {
        recipientId: string;
        type: NotificationType;
        title: string;
        content: string;
        workspaceId?: string;
        metadata?: any;
    }) => Promise<void>;
    notifyWorkspaceMembers: (params: {
        workspaceId: string;
        title: string;
        content: string;
        type?: string;
        metadata?: any;
    }) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [toasts, setToasts] = useState<AppNotification[]>([]);
    const [popupQueue, setPopupQueue] = useState<AppNotification[]>([]);
    const [currentPopup, setCurrentPopup] = useState<AppNotification | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(localStorage.getItem('user_id'));
    const navigate = useNavigate();

    // Notification Sounds
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const specialAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        // Special sound for Developer alerts (e.g., a "cash register" or "success chime")
        specialAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
    }, []);

    const playNotificationSound = (type: 'default' | 'special' = 'default') => {
        const audio = type === 'special' ? specialAudioRef.current : audioRef.current;
        if (audio) {
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn('Audio play failed (maybe needs interaction):', err);
                });
            }
        }
    };

    // Audio Unlock for Mobile/iPad
    useEffect(() => {
        const unlockAudio = () => {
            if (audioRef.current) {
                audioRef.current.play().then(() => {
                    audioRef.current?.pause();
                    audioRef.current!.currentTime = 0;
                }).catch(() => { });
            }
            if (specialAudioRef.current) {
                specialAudioRef.current.play().then(() => {
                    specialAudioRef.current?.pause();
                    specialAudioRef.current!.currentTime = 0;
                }).catch(() => { });
            }
            console.log('Audio context unlocked for iPad/Mobile');
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
        };

        window.addEventListener('click', unlockAudio);
        window.addEventListener('touchstart', unlockAudio);

        return () => {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
        };
    }, []);

    // Check for user ID changes (e.g., login/logout)
    useEffect(() => {
        const checkUser = () => {
            const id = localStorage.getItem('user_id');
            if (id !== currentUserId) {
                setCurrentUserId(id);
            }
        };

        const interval = setInterval(checkUser, 2000);
        window.addEventListener('storage', checkUser);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', checkUser);
        };
    }, [currentUserId]);

    const fetchNotifications = useCallback(async () => {
        if (!currentUserId) return;

        const { data, error } = await supabase
            .from('notifications')
            .select('*, actor:app_users!notifications_actor_id_fkey(full_name, avatar_url)')
            .eq('recipient_id', currentUserId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching notifications:', error);
            return;
        }

        const notifs = data || [];
        setNotifications(notifs);

        // Populate popup queue with unread popup-type notifications
        const unreadPopups = notifs.filter(n => !n.is_read && n.metadata?.show_popup);
        if (unreadPopups.length > 0) {
            setPopupQueue(unreadPopups);
        }
    }, [currentUserId]);

    // Manage standard popup sequence
    useEffect(() => {
        if (!currentPopup && popupQueue.length > 0) {
            setCurrentPopup(popupQueue[0]);
            setPopupQueue(prev => prev.slice(1));
        }
    }, [currentPopup, popupQueue]);

    // Initial check for upcoming content on mount or login
    useEffect(() => {
        if (currentUserId) {
            checkUpcomingContent().then(() => fetchNotifications());
        }
    }, [currentUserId, fetchNotifications]);

    useEffect(() => {
        if (!currentUserId) return;

        fetchNotifications();

        console.log('Subscribing to notifications for user:', currentUserId);

        // Realtime subscription - use a more unique channel name and persistent connection
        const channel = supabase
            .channel(`notif_realtime_${currentUserId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${currentUserId}`
                },
                async (payload) => {
                    console.log('Real-time event received:', payload);

                    try {
                        // 1. Play sound immediately to be as fast as possible
                        playNotificationSound(payload.new.metadata?.sound === 'special' ? 'special' : 'default');

                        // 2. Refresh the notification list from DB to ensure consistency
                        fetchNotifications();

                        // 3. Prepare Toast with actor data
                        let actorData = null;
                        if (payload.new.actor_id) {
                            const { data } = await supabase
                                .from('app_users')
                                .select('full_name, avatar_url')
                                .eq('id', payload.new.actor_id)
                                .single();
                            actorData = data;
                        }

                        const newNotif = {
                            ...payload.new,
                            actor: actorData || { full_name: 'Seseorang', avatar_url: null }
                        } as AppNotification;

                        // 4. Update toasts
                        setToasts(prev => {
                            if (prev.find(t => t.id === newNotif.id)) return prev;
                            const updated = [...prev, newNotif];
                            return updated.slice(-3);
                        });

                        // Notify custom event for other components (like Layout)
                        window.dispatchEvent(new CustomEvent('new-notification', { detail: payload.new }));

                        setTimeout(() => {
                            setToasts(prev => prev.filter(t => t.id !== newNotif.id));
                        }, 10000);
                    } catch (err) {
                        console.error('Error handling real-time payload:', err);
                    }
                }
            )
            .subscribe((status, error) => {
                console.log(`Notification status [${currentUserId}]:`, status);
                if (error) console.error('Subscription error:', error);

                if (status === 'CHANNEL_ERROR') {
                    console.warn('Real-time channel error. Retrying in 5s...');
                    setTimeout(() => fetchNotifications(), 5000);
                }
            });

        return () => {
            console.log('Unsubscribing from notifications');
            supabase.removeChannel(channel);
        };
    }, [currentUserId, fetchNotifications]);

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        }
    };

    const markAllAsRead = async () => {
        if (!currentUserId) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('recipient_id', currentUserId)
            .eq('is_read', false);

        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
    };

    const handleNotificationClick = (notif: AppNotification) => {
        // Mark as read
        markAsRead(notif.id);

        // Navigate based on metadata
        if (notif.metadata?.request_id) {
            navigate(`/approval`);
            localStorage.setItem('open_request_id', notif.metadata.request_id);
        } else if (notif.metadata?.content_id && notif.workspace_id) {
            navigate(`/plan/${notif.workspace_id}`);
            localStorage.setItem('open_content_id', notif.metadata.content_id);
        } else if (notif.workspace_id) {
            navigate(`/plan/${notif.workspace_id}`);
        } else if (notif.type === 'MENTION' && notif.content.toLowerCase().includes('kpi')) {
            navigate('/admin/team');
        }

        // Remove from toasts if present
        setToasts(prev => prev.filter(t => t.id !== notif.id));
    };

    const sendNotification = async ({ recipientId, type, title, content, workspaceId, metadata }: any) => {
        const actorId = localStorage.getItem('user_id');
        if (recipientId === actorId) return; // Don't notify yourself

        await supabase.from('notifications').insert([{
            recipient_id: recipientId,
            actor_id: actorId,
            type,
            title,
            content,
            workspace_id: workspaceId,
            metadata
        }]);
    };

    const notifyWorkspaceMembers = async ({ workspaceId, title, content, type = 'INFO', metadata = {} }: any) => {
        try {
            const actorId = localStorage.getItem('user_id');

            // 1. Get workspace members
            const { data: workspace, error: wsError } = await supabase
                .from('workspaces')
                .select('members')
                .eq('id', workspaceId)
                .single();

            if (wsError || !workspace) return;

            // 2. Get members by username to get their IDs
            const { data: users, error: userError } = await supabase
                .from('app_users')
                .select('id')
                .in('username', workspace.members || []);

            if (userError || !users) return;

            const notificationsToInsert = users
                .filter(u => u.id !== actorId)
                .map(u => ({
                    recipient_id: u.id,
                    actor_id: actorId,
                    workspace_id: workspaceId,
                    type,
                    title,
                    content,
                    metadata
                }));

            if (notificationsToInsert.length > 0) {
                await supabase.from('notifications').insert(notificationsToInsert);
            }
        } catch (err) {
            console.error('Failed to notify workspace members:', err);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            markAllAsRead,
            handleNotificationClick,
            sendNotification,
            notifyWorkspaceMembers
        }}>
            {children}

            {/* TOAST POPUP UI */}
            <div className="fixed top-24 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        onClick={() => handleNotificationClick(toast)}
                        className={`pointer-events-auto border-2 rounded-2xl shadow-hard p-4 w-80 animate-notification-slide-in flex items-start gap-4 relative overflow-hidden group cursor-pointer transition-all ${toast.metadata?.sound === 'special'
                            ? 'bg-amber-50 border-amber-500 hover:bg-amber-100'
                            : 'bg-white border-slate-800 hover:bg-slate-50'
                            }`}
                    >
                        {/* Progress Bar for 10s timer */}
                        <div className={`absolute bottom-0 left-0 h-1.5 w-full origin-left animate-toast-progress ${toast.metadata?.sound === 'special' ? 'bg-amber-500/20' : 'bg-accent/20'
                            }`}></div>

                        <div className="shrink-0 relative">
                            {toast.actor?.avatar_url ? (
                                <img src={toast.actor.avatar_url} className="w-12 h-12 rounded-full border-2 border-slate-800 object-cover" alt="" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent border-2 border-slate-800">
                                    <Bell size={24} />
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent rounded-full border-2 border-slate-900 flex items-center justify-center text-white scale-90">
                                <Info size={12} />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                            <p className="font-black text-[10px] text-accent uppercase tracking-widest mb-1">{toast.title}</p>
                            <p className="text-sm font-bold text-slate-700 leading-tight">
                                <span className="text-slate-900 font-extrabold">{toast.actor?.full_name}</span> {toast.content}
                            </p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setToasts(prev => prev.filter(t => t.id !== toast.id));
                            }}
                            className="bg-slate-100 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* PERSISTENT POPUP OVERLAY (Bottom Right) */}
            {currentPopup && (
                <div className="fixed bottom-6 right-6 z-[10000] w-[400px] animate-in slide-in-from-right-10 fade-in duration-500">
                    <div className="bg-card border-2 border-slate-900 shadow-hard rounded-2xl overflow-hidden flex flex-col">
                        {/* Header with Icon/Photo */}
                        <div className={`p-4 flex items-center gap-4 border-b-2 border-slate-900 ${currentPopup.type === 'CONTENT_H1' ? 'bg-amber-500' :
                            currentPopup.type === 'STATUS_CHANGE' ? 'bg-emerald-500' : 'bg-accent'
                            }`}>
                            <div className="relative">
                                {currentPopup.actor?.avatar_url ? (
                                    <img
                                        src={currentPopup.actor.avatar_url}
                                        className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-sm"
                                        alt=""
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white border-2 border-white/50">
                                        {currentPopup.type === 'CONTENT_H1' ? <AlertTriangle size={24} /> : <Bell size={24} />}
                                    </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border-2 border-slate-900 flex items-center justify-center text-slate-900 scale-90">
                                    {currentPopup.type === 'CONTENT_H1' ? <Clock size={12} className="text-amber-600" /> : <Info size={12} className="text-secondary" />}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-black text-sm uppercase tracking-wider mb-0.5">{currentPopup.title}</h3>
                                <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest leading-none">Notifikasi Penting</p>
                            </div>
                            <button
                                onClick={() => {
                                    markAsRead(currentPopup.id);
                                    setCurrentPopup(null);
                                }}
                                className="text-white/60 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Body */}
                        <div className="p-5 bg-card">
                            <p className="text-slate-600 font-bold leading-relaxed text-sm">
                                {currentPopup.actor?.full_name && (
                                    <span className="text-slate-900 font-black">{currentPopup.actor.full_name} </span>
                                )}
                                {currentPopup.content}
                            </p>

                            <div className="mt-5 flex gap-3">
                                <button
                                    className="flex-1 h-10 rounded-xl text-xs font-black border-2 border-slate-200 hover:bg-slate-50 transition-colors"
                                    onClick={() => {
                                        markAsRead(currentPopup.id);
                                        setCurrentPopup(null);
                                    }}
                                >
                                    Nanti Saja
                                </button>
                                <button
                                    className="flex-1 h-10 rounded-xl shadow-hard bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors"
                                    onClick={() => {
                                        handleNotificationClick(currentPopup);
                                        setCurrentPopup(null);
                                    }}
                                >
                                    Buka Detail
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes notification-slide-in {
                    0% { transform: translateY(-30px); opacity: 0; filter: blur(4px); }
                    100% { transform: translateY(0); opacity: 1; filter: blur(0); }
                }
                @keyframes toast-progress {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
                .animate-notification-slide-in {
                    animation: notification-slide-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                .animate-toast-progress {
                    animation: toast-progress 10s linear forwards;
                }
            `}</style>
        </NotificationContext.Provider>
    );
};
