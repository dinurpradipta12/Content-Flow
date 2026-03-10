import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Heart, Users, MessageSquare, TrendingUp, Eye, EyeOff, Coffee, Lightbulb } from 'lucide-react';

interface MoodTrackerModalProps {
    userId: string;
    workspaceId: string;
    onClose?: () => void;
}

const MOODS = [
    {
        emoji: '😭', label: 'Burnout',
        gradient: 'from-red-500 to-rose-600',
        isLow: true,
        motivation: '💙 Wajar banget untuk merasa begini. Ambil napas dalam, minum air, dan ingat: kamu sudah melakukan yang terbaik. Istirahat sejenak itu bukan kelemahan — itu kebutuhan.',
        tip: 'Coba istirahat 5–10 menit sebelum melanjutkan.'
    },
    {
        emoji: '😴', label: 'Capek',
        gradient: 'from-amber-400 to-orange-500',
        isLow: true,
        motivation: '🌿 Kelelahan adalah tanda kamu sudah bekerja keras. Pelan-pelan saja hari ini — kualitas lebih baik dari kecepatan.',
        tip: 'Prioritaskan 1–2 tugas terpenting saja hari ini.'
    },
    {
        emoji: '😐', label: 'Biasa',
        gradient: 'from-slate-400 to-slate-600',
        isLow: false,
        motivation: null, tip: null
    },
    {
        emoji: '🙂', label: 'Baik',
        gradient: 'from-blue-400 to-indigo-500',
        isLow: false,
        motivation: null, tip: null
    },
    {
        emoji: '🤩', label: 'Semangat',
        gradient: 'from-pink-400 to-fuchsia-500',
        isLow: false,
        motivation: null, tip: null
    },
];

const WHY_POINTS = [
    {
        icon: MessageSquare,
        color: 'text-blue-500', bg: 'bg-blue-50',
        title: 'Kita jarang bisa cerita langsung',
        desc: 'Di tim yang sibuk, mood tracker jadi jembatan kecil untuk saling memahami.'
    },
    {
        icon: Users,
        color: 'text-purple-500', bg: 'bg-purple-50',
        title: 'Empati membangun tim yang kuat',
        desc: 'Ketika rekan tahu kamu sedang burnout, mereka bisa lebih pengertian.'
    },
    {
        icon: TrendingUp,
        color: 'text-emerald-500', bg: 'bg-emerald-50',
        title: 'Mood baik = performa baik',
        desc: 'Karyawan yang merasa didengar 4.6x lebih produktif.'
    },
];

/**
 * MoodTrackerModal Logic:
 * - Muncul SEKALI per session login.
 * - Saat logout → localStorage.clear() → popup muncul kembali.
 * - Key: mood_session_{userId}_{workspaceId}
 * - Privacy: is_private=true → tidak tampil ke rekan tim
 */
export const MoodTrackerModal: React.FC<MoodTrackerModalProps> = ({ userId, workspaceId, onClose }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);
    const [selectedMood, setSelectedMood] = useState<typeof MOODS[0] | null>(null);
    const [isPrivate, setIsPrivate] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    // Motivational nudge state — shows BEFORE thank you when mood is low
    const [showNudge, setShowNudge] = useState(false);

    useEffect(() => {
        const check = () => {
            if (!userId || !workspaceId) return;
            const sessionKey = `mood_session_${userId}_${workspaceId}`;
            if (localStorage.getItem(sessionKey) === 'true') return;
            setIsOpen(true);
        };
        const t = setTimeout(check, 1200);
        return () => clearTimeout(t);
    }, [userId, workspaceId]);

    const handleSelect = (mood: typeof MOODS[0]) => {
        if (isSaving) return;
        setSelectedMood(mood);

        // Low mood → show motivational nudge first, then thank you
        if (mood.isLow) {
            setShowNudge(true);
        } else {
            saveMoodAndClose(mood);
        }
    };

    const saveMoodAndClose = async (mood: typeof MOODS[0]) => {
        setIsSaving(true);

        // Mark session instantly
        localStorage.setItem(`mood_session_${userId}_${workspaceId}`, 'true');
        if (!isPrivate) {
            localStorage.setItem(`current_mood_${userId}`, mood.emoji);
        }

        setShowNudge(false);
        setShowThankYou(true);

        // Auto close after 1.8s
        setTimeout(() => {
            setIsOpen(false);
            if (onClose) onClose();
        }, 1800);

        // Save to DB in background
        supabase.from('user_moods').insert({
            user_id: userId,
            workspace_id: workspaceId,
            mood_emoji: mood.emoji,
            mood_label: mood.label,
            is_private: isPrivate,
        }).then(({ error }) => {
            if (error) console.error('Mood save error:', error);
        });

        setIsSaving(false);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[6px]"
                style={{ animation: 'moodFadeIn 0.3s ease-out both' }} />

            {/* Modal */}
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6"
                style={{ animation: 'moodFadeIn 0.3s ease-out both' }}>
                <div
                    className="bg-card w-full max-w-2xl rounded-[2rem] border-[4px] border-slate-900 shadow-[16px_16px_0px_0px_rgba(15,23,42,0.9)] overflow-hidden relative"
                    style={{ animation: 'moodSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
                >

                    {/* ── NUDGE STATE (low mood message before saving) ── */}
                    {showNudge && selectedMood ? (
                        <div className="p-8 sm:p-10 flex flex-col items-center gap-6 text-center"
                            style={{ animation: 'moodZoomIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}>

                            <div className="flex flex-col items-center gap-3">
                                <span className="text-7xl" style={{ animation: 'moodBounce 0.6s ease-out both' }}>
                                    {selectedMood.emoji}
                                </span>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 border-2 border-amber-300 rounded-full">
                                    <Lightbulb size={11} className="text-amber-600" />
                                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Sebentar ya…</span>
                                </div>
                            </div>

                            <div className="max-w-md space-y-3">
                                <p className="text-base sm:text-lg font-black text-foreground leading-snug">
                                    {selectedMood.motivation}
                                </p>
                                {selectedMood.tip && (
                                    <div className="flex items-center gap-2 bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3">
                                        <Coffee size={16} className="text-amber-600 shrink-0" />
                                        <p className="text-xs font-bold text-amber-800 text-left">{selectedMood.tip}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 w-full max-w-xs">
                                <button
                                    onClick={() => setShowNudge(false)}
                                    className="flex-1 py-2.5 rounded-xl border-[2.5px] border-slate-300 text-xs font-black text-slate-600 hover:border-slate-500 transition-all"
                                >
                                    Ubah Mood
                                </button>
                                <button
                                    onClick={() => saveMoodAndClose(selectedMood)}
                                    className="flex-1 py-2.5 rounded-xl border-[2.5px] border-slate-900 bg-slate-900 text-white text-xs font-black shadow-[3px_3px_0px_0px_rgba(15,23,42,0.4)] hover:-translate-y-0.5 transition-all"
                                >
                                    Lanjutkan →
                                </button>
                            </div>
                        </div>

                    ) : showThankYou && selectedMood ? (

                        /* ── THANK YOU STATE ── */
                        <div className="py-16 px-8 flex flex-col items-center justify-center text-center gap-5"
                            style={{ animation: 'moodZoomIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                            <div className="relative">
                                <div className="text-7xl leading-none" style={{ animation: 'moodBounce 0.6s ease-out both' }}>
                                    {selectedMood.emoji}
                                </div>
                                <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-pink-400/20 to-fuchsia-500/20 blur-xl -z-10" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-3xl sm:text-4xl font-black text-foreground font-heading italic tracking-tight">
                                    Thankyou, happy working!
                                </h3>
                                <p className="text-sm font-semibold text-muted-foreground">
                                    {isPrivate
                                        ? 'Mood kamu disimpan secara pribadi. 🔒'
                                        : 'Terima kasih sudah jujur dengan perasaanmu. Selamat berkarya! 🚀'
                                    }
                                </p>
                            </div>
                        </div>

                    ) : (

                        /* ── MAIN QUESTION STATE ── */
                        <div className="flex flex-col sm:flex-row min-h-0">

                            {/* LEFT: Pertanyaan + Emoji */}
                            <div className="flex-1 p-7 sm:p-9 flex flex-col justify-between gap-5">

                                {/* Badge */}
                                <div className="flex items-center gap-2 w-fit">
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-pink-100 border-2 border-pink-300 rounded-full">
                                        <Heart size={12} className="text-pink-500 fill-pink-500" />
                                        <span className="text-[10px] font-black text-pink-600 uppercase tracking-widest">Daily Pulse</span>
                                    </div>
                                </div>

                                {/* Question */}
                                <div className="space-y-1.5">
                                    <h2 className="text-2xl sm:text-3xl font-black text-foreground font-heading leading-tight tracking-tight">
                                        Bagaimana<br />mood kamu<br />hari ini?
                                    </h2>
                                    <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                                        Pilih satu emoji yang paling menggambarkan perasaanmu sekarang.
                                    </p>
                                </div>

                                {/* Emoji Grid */}
                                <div className="grid grid-cols-5 gap-2 sm:gap-3 w-full">
                                    {MOODS.map((mood) => (
                                        <button
                                            key={mood.label}
                                            onClick={() => handleSelect(mood)}
                                            disabled={isSaving}
                                            title={mood.label}
                                            className={`
                                                group relative flex flex-col items-center justify-center gap-1
                                                w-full aspect-square rounded-2xl border-[3px] border-slate-900
                                                bg-gradient-to-br ${mood.gradient}
                                                shadow-[4px_4px_0px_0px_rgba(15,23,42,0.8)]
                                                hover:-translate-y-1.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,0.9)]
                                                active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(15,23,42,0.9)]
                                                transition-all duration-200 ease-out
                                                disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0
                                            `}
                                        >
                                            <span className="text-2xl leading-none group-hover:scale-110 transition-transform duration-200 drop-shadow-md">
                                                {mood.emoji}
                                            </span>
                                            <span className="text-[9px] font-black uppercase tracking-tight text-white/90 leading-none">
                                                {mood.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Privacy Toggle */}
                                <button
                                    onClick={() => setIsPrivate(p => !p)}
                                    className={`flex items-center gap-2 w-fit px-3 py-2 rounded-xl border-2 transition-all duration-200 ${isPrivate
                                            ? 'border-slate-800 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-400'
                                        }`}
                                >
                                    {isPrivate
                                        ? <EyeOff size={13} className="text-white" />
                                        : <Eye size={13} />
                                    }
                                    <span className="text-[10px] font-black uppercase tracking-wider leading-none">
                                        {isPrivate ? '🔒 Hanya untuk saya' : 'Tampilkan ke tim'}
                                    </span>
                                </button>

                                {/* Footer */}
                                <p className="text-[9px] text-muted-foreground font-semibold opacity-60 italic leading-relaxed">
                                    Popup ini hanya muncul sekali setiap kamu login.
                                </p>
                            </div>

                            {/* RIGHT: Why it matters */}
                            <div className="w-full sm:w-[210px] bg-slate-50 border-t-[3px] sm:border-t-0 sm:border-l-[3px] border-slate-200 flex flex-col p-5 gap-4">
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Mengapa ini ada?</p>
                                    <h3 className="text-sm font-black text-foreground leading-snug">Karena kita peduli satu sama lain.</h3>
                                </div>

                                <div className="space-y-3 flex-1">
                                    {WHY_POINTS.map((point, i) => (
                                        <div key={i} className="flex items-start gap-2.5">
                                            <div className={`w-6 h-6 ${point.bg} rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-200`}>
                                                <point.icon size={12} className={point.color} />
                                            </div>
                                            <div className="space-y-0.5 min-w-0">
                                                <p className="text-[10px] font-black text-foreground leading-tight">{point.title}</p>
                                                <p className="text-[9px] font-medium text-muted-foreground leading-snug">{point.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-slate-900 text-slate-100 rounded-xl p-3 space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">Tahukah kamu?</p>
                                    <p className="text-[9px] font-semibold leading-relaxed text-slate-400">
                                        Tim yang saling memahami kondisi satu sama lain menghasilkan kolaborasi 3× lebih efektif.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes moodFadeIn {
                    from { opacity: 0; } to { opacity: 1; }
                }
                @keyframes moodSlideUp {
                    from { opacity: 0; transform: translateY(32px) scale(0.96); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes moodZoomIn {
                    from { opacity: 0; transform: scale(0.85); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes moodBounce {
                    0%   { transform: scale(0.3) rotate(-15deg); }
                    60%  { transform: scale(1.2) rotate(5deg); }
                    80%  { transform: scale(0.95) rotate(-3deg); }
                    100% { transform: scale(1) rotate(0deg); }
                }
            `}</style>
        </>
    );
};
