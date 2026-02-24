import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { AppNotification, NotificationType } from '../types';
import { Bell, Info, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
            audio.play().catch(err => console.log('Audio play failed:', err));
        }
    };

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

        if (error) console.error('Error fetching notifications:', error);
        else setNotifications(data || []);
    }, [currentUserId]);

    useEffect(() => {
        if (!currentUserId) return;

        fetchNotifications();

        console.log('Subscribing to notifications for user:', currentUserId);

        // Realtime subscription
        const channel = supabase
            .channel(`notifications-${currentUserId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_id=eq.${currentUserId}`
                },
                async (payload) => {
                    console.log('New notification received via real-time:', payload);

                    try {
                        // Play sound - checking if it's a special developer notification
                        if (payload.new.metadata?.sound === 'special') {
                            playNotificationSound('special');
                        } else {
                            playNotificationSound('default');
                        }

                        // Fetch actor details for the new notification
                        const { data: actorData } = await supabase
                            .from('app_users')
                            .select('full_name, avatar_url')
                            .eq('id', payload.new.actor_id)
                            .single();

                        const newNotif = { ...payload.new, actor: actorData } as AppNotification;

                        // Update list
                        setNotifications(prev => [newNotif, ...prev]);

                        // Add to toasts
                        setToasts(prev => {
                            if (prev.find(t => t.id === newNotif.id)) return prev;
                            const newToasts = [...prev, newNotif];
                            return newToasts.slice(-3); // Max 3 items
                        });

                        // Remove toast after 10 seconds per request
                        setTimeout(() => {
                            setToasts(prev => prev.filter(t => t.id !== newNotif.id));
                        }, 10000);
                    } catch (err) {
                        console.error('Error handling real-time notification:', err);
                    }
                }
            )
            .subscribe((status) => {
                console.log('Notification subscription status:', status);
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

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, handleNotificationClick, sendNotification }}>
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
