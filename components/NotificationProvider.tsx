import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { AppNotification, NotificationType } from '../types';
import { Bell, Info, X, CheckCircle2, AlertTriangle, MessageSquare, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { checkUpcomingContent } from '../services/notificationService';
import { registerPushNotifications, isPushSupported, showLocalNotification } from '../services/pushNotificationService';

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
    clearAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
    return context;
};

// ── Detect mobile/tablet ──────────────────────────────────────────────────────
const isMobileOrTablet = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || (navigator.maxTouchPoints > 1);
};

// ── Web Audio API beep (works on mobile without file loading) ─────────────────
const playBeep = (frequency = 880, duration = 0.15, type: OscillatorType = 'sine') => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
        setTimeout(() => ctx.close(), (duration + 0.1) * 1000);
    } catch (e) {
        // Silently fail if AudioContext not available
    }
};

const playSpecialBeep = () => {
    // Two-tone chime for special notifications
    playBeep(880, 0.12, 'sine');
    setTimeout(() => playBeep(1100, 0.18, 'sine'), 130);
};

// ── Vibration helper ──────────────────────────────────────────────────────────
const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [toasts, setToasts] = useState<AppNotification[]>([]);
    const [popupQueue, setPopupQueue] = useState<AppNotification[]>([]);
    const [currentPopup, setCurrentPopup] = useState<AppNotification | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(localStorage.getItem('user_id'));
    const [isMobile, setIsMobile] = useState(false);
    const [showPushBanner, setShowPushBanner] = useState(false);
    const navigate = useNavigate();

    // Notification Sounds (fallback for desktop)
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const specialAudioRef = useRef<HTMLAudioElement | null>(null);
    const audioUnlockedRef = useRef(false);

    useEffect(() => {
        setIsMobile(isMobileOrTablet());
    }, []);

    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioRef.current.preload = 'auto';
        specialAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
        specialAudioRef.current.preload = 'auto';
    }, []);

    const playNotificationSound = (type: 'default' | 'special' = 'default') => {
        // On mobile/tablet: use Web Audio API beep + vibration
        if (isMobileOrTablet()) {
            if (type === 'special') {
                playSpecialBeep();
                vibrate([100, 50, 100]);
            } else {
                playBeep(880, 0.15, 'sine');
                vibrate([80]);
            }
            return;
        }

        // Desktop: use audio files
        const audio = type === 'special' ? specialAudioRef.current : audioRef.current;
        if (audio && audioUnlockedRef.current) {
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.warn('Audio play failed:', err);
                    // Fallback to Web Audio API
                    type === 'special' ? playSpecialBeep() : playBeep();
                });
            }
        } else {
            // Fallback if audio not unlocked
            type === 'special' ? playSpecialBeep() : playBeep();
        }
    };

    // Audio Unlock for Mobile/iPad - unlock on first interaction
    useEffect(() => {
        const unlockAudio = () => {
            if (audioUnlockedRef.current) return;

            // Unlock HTML Audio elements
            [audioRef.current, specialAudioRef.current].forEach(audio => {
                if (audio) {
                    audio.muted = true;
                    audio.play().then(() => {
                        audio.pause();
                        audio.currentTime = 0;
                        audio.muted = false;
                    }).catch(() => { });
                }
            });

            // Unlock Web Audio API context
            try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const buf = ctx.createBuffer(1, 1, 22050);
                const src = ctx.createBufferSource();
                src.buffer = buf;
                src.connect(ctx.destination);
                src.start(0);
                setTimeout(() => ctx.close(), 100);
            } catch (e) { }

            audioUnlockedRef.current = true;
            console.log('[Audio] Unlocked for mobile/iPad');

            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
            window.removeEventListener('touchend', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };

        window.addEventListener('click', unlockAudio, { passive: true });
        window.addEventListener('touchstart', unlockAudio, { passive: true });
        window.addEventListener('touchend', unlockAudio, { passive: true });
        window.addEventListener('keydown', unlockAudio, { passive: true });

        return () => {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
            window.removeEventListener('touchend', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
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

        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('recipient_id', currentUserId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error fetching notifications:', error);
                return;
            }

            const notifs = data || [];
            const actorIds = [...new Set(notifs.map(n => n.actor_id).filter(Boolean))];
            let actorMap: Record<string, any> = {};
            if (actorIds.length > 0) {
                const { data: actors } = await supabase
                    .from('app_users')
                    .select('id, full_name, avatar_url')
                    .in('id', actorIds);
                if (actors) {
                    actorMap = Object.fromEntries(actors.map(a => [a.id, a]));
                }
            }

            const enrichedNotifs = notifs.map(n => ({
                ...n,
                actor: n.actor_id ? actorMap[n.actor_id] || { full_name: 'Seseorang', avatar_url: null } : null
            }));

            setNotifications(enrichedNotifs);

            const unreadPopups = enrichedNotifs.filter(n => !n.is_read && n.metadata?.show_popup);
            if (unreadPopups.length > 0) {
                setPopupQueue(unreadPopups);
            }
        } catch (err) {
            console.error('Error in fetchNotifications:', err);
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

            // Show push notification permission banner if not yet granted
            if (isPushSupported()) {
                const permission = 'Notification' in window ? Notification.permission : 'denied';
                const dismissed = localStorage.getItem('push_banner_dismissed');

                if (permission === 'default' && !dismissed) {
                    // Show banner after 5 seconds (after user has settled in)
                    setTimeout(() => setShowPushBanner(true), 5000);
                } else if (permission === 'granted') {
                    // Already granted - register silently
                    setTimeout(() => {
                        registerPushNotifications(currentUserId).then(success => {
                            if (success) console.log('[Push] Web Push registered');
                        });
                    }, 2000);
                }
            }
        }
    }, [currentUserId, fetchNotifications]);

    const handleAllowPush = async () => {
        setShowPushBanner(false);
        if (currentUserId) {
            const success = await registerPushNotifications(currentUserId);
            if (success) {
                console.log('[Push] Web Push registered after user consent');
            }
        }
    };

    const handleDismissPushBanner = () => {
        setShowPushBanner(false);
        localStorage.setItem('push_banner_dismissed', 'true');
    };

    useEffect(() => {
        if (!currentUserId) return;

        fetchNotifications();

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
                    try {
                        playNotificationSound(payload.new.metadata?.sound === 'special' ? 'special' : 'default');
                        fetchNotifications();

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

                        setToasts(prev => {
                            if (prev.find(t => t.id === newNotif.id)) return prev;
                            const updated = [...prev, newNotif];
                            return updated.slice(-3);
                        });

                        window.dispatchEvent(new CustomEvent('new-notification', { detail: payload.new }));

                        // Show local OS notification when app is in background/minimized
                        if (document.hidden && Notification.permission === 'granted') {
                            const actorName = actorData?.full_name || 'Seseorang';
                            const body = payload.new.metadata?.hide_actor_name
                                ? payload.new.content
                                : `${actorName}: ${payload.new.content}`;
                            showLocalNotification(payload.new.title || 'Notifikasi Baru', {
                                body,
                                tag: payload.new.id,
                                data: { url: '/' }
                            });
                        }

                        setTimeout(() => {
                            setToasts(prev => prev.filter(t => t.id !== newNotif.id));
                        }, 8000);
                    } catch (err) {
                        console.error('Error handling real-time payload:', err);
                    }
                }
            )
            .subscribe((status, error) => {
                if (error) console.error('Subscription error:', error);
                if (status === 'CHANNEL_ERROR') {
                    setTimeout(() => fetchNotifications(), 5000);
                }
            });

        return () => {
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

    const clearAllNotifications = async () => {
        if (!currentUserId) return;

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('recipient_id', currentUserId);

        if (!error) {
            setNotifications([]);
        }
    };

    const handleNotificationClick = (notif: AppNotification) => {
        markAsRead(notif.id);

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

        setToasts(prev => prev.filter(t => t.id !== notif.id));
    };

    const sendNotification = async ({ recipientId, type, title, content, workspaceId, metadata }: any) => {
        const actorId = localStorage.getItem('user_id');
        if (recipientId === actorId) return;

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

            const { data: workspace, error: wsError } = await supabase
                .from('workspaces')
                .select('members')
                .eq('id', workspaceId)
                .single();

            if (wsError || !workspace) return;

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

    // ── Update App Badge when unread count changes ────────────────────────────
    useEffect(() => {
        if ('setAppBadge' in navigator) {
            if (unreadCount > 0) {
                (navigator as any).setAppBadge(unreadCount).catch(() => {});
            } else {
                (navigator as any).clearAppBadge().catch(() => {});
            }
        }
    }, [unreadCount]);

    // ── Notification type icon helper ─────────────────────────────────────────
    const getNotifTypeIcon = (type: string, isSpecial: boolean) => {
        if (isSpecial) return <Bell size={12} className="text-amber-500" />;
        switch (type) {
            case 'MENTION': return <MessageSquare size={12} className="text-blue-500" />;
            case 'STATUS_CHANGE': return <CheckCircle2 size={12} className="text-emerald-500" />;
            case 'CONTENT_H1': return <AlertTriangle size={12} className="text-amber-500" />;
            case 'APPROVAL': return <CheckCircle2 size={12} className="text-purple-500" />;
            default: return <Bell size={12} className="text-accent" />;
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            markAllAsRead,
            handleNotificationClick,
            sendNotification,
            notifyWorkspaceMembers,
            clearAllNotifications
        }}>
            {children}

            {/* ══════════════════════════════════════════════════════════════════
                PUSH NOTIFICATION PERMISSION BANNER
                Shown once when user hasn't granted/denied permission yet
            ══════════════════════════════════════════════════════════════════ */}
            {showPushBanner && (
                <div className="fixed bottom-[80px] left-3 right-3 z-[9998] animate-in slide-in-from-bottom-4 fade-in duration-400 md:bottom-6 md:left-auto md:right-6 md:w-[360px]">
                    <div className="bg-card border-2 border-border rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-accent/5 border-b border-border">
                            <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Bell size={18} className="text-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-sm text-foreground leading-tight">Aktifkan Notifikasi</p>
                                <p className="text-[10px] text-mutedForeground font-bold">Terima update real-time di perangkat ini</p>
                            </div>
                            <button
                                onClick={handleDismissPushBanner}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 active:bg-slate-200 flex-shrink-0"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        {/* Body */}
                        <div className="px-4 py-3">
                            <p className="text-xs text-mutedForeground font-bold mb-3 leading-relaxed">
                                Dapatkan notifikasi langsung di HP/tablet kamu, bahkan saat app ditutup.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDismissPushBanner}
                                    className="flex-1 h-9 rounded-xl border-2 border-slate-200 text-xs font-black text-slate-500 active:bg-slate-50 transition-colors"
                                >
                                    Nanti Saja
                                </button>
                                <button
                                    onClick={handleAllowPush}
                                    className="flex-1 h-9 rounded-xl bg-accent text-white text-xs font-black active:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                                >
                                    <Bell size={13} /> Izinkan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TOAST NOTIFICATIONS
                - Mobile/Tablet: Dynamic Island-style pill at top center
                - Desktop: Slide-in cards from top-right
            ══════════════════════════════════════════════════════════════════ */}

            {/* MOBILE: Dynamic Island-style toasts */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-[9999] flex flex-col items-center gap-2 pt-safe pointer-events-none px-4" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}>
                {toasts.map((toast, index) => {
                    const isSpecial = toast.metadata?.sound === 'special';
                    return (
                        <div
                            key={toast.id}
                            onClick={() => handleNotificationClick(toast)}
                            className="pointer-events-auto w-full max-w-sm animate-dynamic-island-in"
                            style={{ animationDelay: `${index * 60}ms` }}
                        >
                            {/* Dynamic Island Pill */}
                            <div className={`relative flex items-center gap-3 px-4 py-3 rounded-[22px] shadow-[0_8px_32px_rgba(0,0,0,0.35)] overflow-hidden cursor-pointer active:scale-[0.97] transition-transform ${
                                isSpecial
                                    ? 'bg-[#1a1200] border border-amber-500/30'
                                    : 'bg-[#0d0d0d] border border-white/10'
                            }`}>
                                {/* Shimmer effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer pointer-events-none"></div>

                                {/* Progress bar */}
                                <div className={`absolute bottom-0 left-0 h-[2px] w-full origin-left animate-toast-progress-8s ${isSpecial ? 'bg-amber-500/50' : 'bg-white/20'}`}></div>

                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    {toast.actor?.avatar_url ? (
                                        <img src={toast.actor.avatar_url} className="w-9 h-9 rounded-full border border-white/20 object-cover" alt="" />
                                    ) : (
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border border-white/20 ${isSpecial ? 'bg-amber-500/20' : 'bg-white/10'}`}>
                                            <Bell size={16} className={isSpecial ? 'text-amber-400' : 'text-white/70'} />
                                        </div>
                                    )}
                                    {/* Type badge */}
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#1a1a1a] rounded-full flex items-center justify-center border border-white/10">
                                        {getNotifTypeIcon(toast.type, isSpecial)}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-0.5 ${isSpecial ? 'text-amber-400' : 'text-white/50'}`}>
                                        {toast.title}
                                    </p>
                                    <p className="text-[13px] font-bold text-white leading-tight truncate">
                                        {toast.actor?.full_name && !toast.metadata?.hide_actor_name && (
                                            <span className="font-extrabold">{toast.actor.full_name} </span>
                                        )}
                                        <span className="text-white/80">{toast.content}</span>
                                    </p>
                                </div>

                                {/* Close */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setToasts(prev => prev.filter(t => t.id !== toast.id));
                                    }}
                                    className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
                                >
                                    <X size={12} className="text-white/60" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* DESKTOP: Slide-in cards from top-right */}
            <div className="hidden md:flex fixed top-24 right-6 z-[9999] flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => {
                    const isSpecial = toast.metadata?.sound === 'special';
                    return (
                        <div
                            key={toast.id}
                            onClick={() => handleNotificationClick(toast)}
                            className={`pointer-events-auto border-2 rounded-2xl shadow-hard p-4 w-80 animate-notification-slide-in flex items-start gap-4 relative overflow-hidden group cursor-pointer transition-all ${
                                isSpecial
                                    ? 'bg-amber-50 border-amber-500 hover:bg-amber-100'
                                    : 'bg-white border-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            {/* Progress Bar */}
                            <div className={`absolute bottom-0 left-0 h-1.5 w-full origin-left animate-toast-progress ${isSpecial ? 'bg-amber-500/20' : 'bg-accent/20'}`}></div>

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
                                    {toast.actor?.full_name && !toast.metadata?.hide_actor_name && (
                                        <span className="text-slate-900 font-extrabold">{toast.actor.full_name} </span>
                                    )}
                                    {toast.content}
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
                    );
                })}
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                PERSISTENT POPUP
                - Mobile/Tablet: Bottom sheet (slides up from bottom)
                - Desktop: Bottom-right card
            ══════════════════════════════════════════════════════════════════ */}
            {currentPopup && (
                <>
                    {/* MOBILE: Bottom Sheet */}
                    <div className="md:hidden fixed inset-0 z-[10000] flex flex-col justify-end">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
                            onClick={() => {
                                markAsRead(currentPopup.id);
                                setCurrentPopup(null);
                            }}
                        />
                        {/* Sheet */}
                        <div className="relative bg-card rounded-t-3xl border-t-2 border-x-2 border-border shadow-[0_-8px_40px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom duration-400 pb-safe">
                            {/* Handle bar */}
                            <div className="flex justify-center pt-3 pb-1">
                                <div className="w-10 h-1 bg-slate-300 rounded-full"></div>
                            </div>

                            {/* Header */}
                            <div className={`mx-4 mb-4 rounded-2xl p-4 flex items-center gap-3 ${
                                currentPopup.type === 'CONTENT_H1' ? 'bg-amber-500' :
                                currentPopup.type === 'STATUS_CHANGE' ? 'bg-emerald-500' : 'bg-accent'
                            }`}>
                                <div className="relative flex-shrink-0">
                                    {currentPopup.actor?.avatar_url ? (
                                        <img src={currentPopup.actor.avatar_url} className="w-12 h-12 rounded-full border-2 border-white/50 object-cover" alt="" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
                                            {currentPopup.type === 'CONTENT_H1' ? <AlertTriangle size={22} className="text-white" /> : <Bell size={22} className="text-white" />}
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                                        {currentPopup.type === 'CONTENT_H1' ? <Clock size={10} className="text-amber-600" /> : <Info size={10} className="text-accent" />}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white/60 text-[9px] font-black uppercase tracking-widest">Notifikasi Penting</p>
                                    <h3 className="text-white font-black text-base leading-tight truncate">{currentPopup.title}</h3>
                                </div>
                                <button
                                    onClick={() => { markAsRead(currentPopup.id); setCurrentPopup(null); }}
                                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30 transition-colors flex-shrink-0"
                                >
                                    <X size={16} className="text-white" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="px-4 pb-2">
                                <p className="text-slate-600 font-bold leading-relaxed text-sm">
                                    {currentPopup.actor?.full_name && !currentPopup.metadata?.hide_actor_name && (
                                        <span className="text-slate-900 font-black">{currentPopup.actor.full_name} </span>
                                    )}
                                    {currentPopup.content}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="px-4 pb-4 pt-3 flex gap-3">
                                <button
                                    className="flex-1 h-12 rounded-2xl text-sm font-black border-2 border-slate-200 text-slate-600 active:bg-slate-100 transition-colors"
                                    onClick={() => { markAsRead(currentPopup.id); setCurrentPopup(null); }}
                                >
                                    Nanti Saja
                                </button>
                                <button
                                    className="flex-1 h-12 rounded-2xl shadow-sm bg-slate-900 text-white text-sm font-black active:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                    onClick={() => { handleNotificationClick(currentPopup); setCurrentPopup(null); }}
                                >
                                    Buka Detail <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* DESKTOP: Bottom-right card */}
                    <div className="hidden md:block fixed bottom-6 right-6 z-[10000] w-[400px] animate-in slide-in-from-right-10 fade-in duration-500">
                        <div className="bg-card border-2 border-slate-900 shadow-hard rounded-2xl overflow-hidden flex flex-col">
                            <div className={`p-4 flex items-center gap-4 border-b-2 border-slate-900 ${
                                currentPopup.type === 'CONTENT_H1' ? 'bg-amber-500' :
                                currentPopup.type === 'STATUS_CHANGE' ? 'bg-emerald-500' : 'bg-accent'
                            }`}>
                                <div className="relative">
                                    {currentPopup.actor?.avatar_url ? (
                                        <img src={currentPopup.actor.avatar_url} className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-sm" alt="" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white border-2 border-white/50">
                                            {currentPopup.type === 'CONTENT_H1' ? <AlertTriangle size={24} /> : <Bell size={24} />}
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border-2 border-slate-900 flex items-center justify-center text-slate-900 scale-90">
                                        {currentPopup.type === 'CONTENT_H1' ? <Clock size={12} className="text-amber-600" /> : <Info size={12} className="text-accent" />}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-black text-sm uppercase tracking-wider mb-0.5">{currentPopup.title}</h3>
                                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest leading-none">Notifikasi Penting</p>
                                </div>
                                <button
                                    onClick={() => { markAsRead(currentPopup.id); setCurrentPopup(null); }}
                                    className="text-white/60 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-5 bg-card">
                                <p className="text-slate-600 font-bold leading-relaxed text-sm">
                                    {currentPopup.actor?.full_name && !currentPopup.metadata?.hide_actor_name && (
                                        <span className="text-slate-900 font-black">{currentPopup.actor.full_name} </span>
                                    )}
                                    {currentPopup.content}
                                </p>
                                <div className="mt-5 flex gap-3">
                                    <button
                                        className="flex-1 h-10 rounded-xl text-xs font-black border-2 border-slate-200 hover:bg-slate-50 transition-colors"
                                        onClick={() => { markAsRead(currentPopup.id); setCurrentPopup(null); }}
                                    >
                                        Nanti Saja
                                    </button>
                                    <button
                                        className="flex-1 h-10 rounded-xl shadow-hard bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition-colors"
                                        onClick={() => { handleNotificationClick(currentPopup); setCurrentPopup(null); }}
                                    >
                                        Buka Detail
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                /* ── Dynamic Island animation ── */
                @keyframes dynamic-island-in {
                    0% {
                        transform: translateY(-100%) scale(0.8);
                        opacity: 0;
                        border-radius: 50px;
                    }
                    60% {
                        transform: translateY(4px) scale(1.02);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                }
                .animate-dynamic-island-in {
                    animation: dynamic-island-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }

                /* ── Shimmer effect ── */
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                .animate-shimmer {
                    animation: shimmer 2.5s ease-in-out infinite;
                }

                /* ── Desktop toast slide-in ── */
                @keyframes notification-slide-in {
                    0% { transform: translateY(-30px); opacity: 0; filter: blur(4px); }
                    100% { transform: translateY(0); opacity: 1; filter: blur(0); }
                }
                .animate-notification-slide-in {
                    animation: notification-slide-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }

                /* ── Progress bars ── */
                @keyframes toast-progress {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
                .animate-toast-progress {
                    animation: toast-progress 10s linear forwards;
                }
                @keyframes toast-progress-8s {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
                .animate-toast-progress-8s {
                    animation: toast-progress-8s 8s linear forwards;
                }

                /* ── Bottom sheet safe area ── */
                .pb-safe {
                    padding-bottom: max(1rem, env(safe-area-inset-bottom));
                }
                .pt-safe {
                    padding-top: max(0.75rem, env(safe-area-inset-top));
                }
            `}</style>
        </NotificationContext.Provider>
    );
};
