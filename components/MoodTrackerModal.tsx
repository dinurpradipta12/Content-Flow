import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Heart, Users, MessageSquare, TrendingUp, Coffee, Lightbulb } from 'lucide-react';

interface MoodTrackerModalProps {
    userId: string;
    workspaceId: string;
    onClose?: () => void;
}

const MOODS = [
    {
        emoji: '😭', label: 'Burnout',
        gradient: 'linear-gradient(135deg, #ef4444, #e11d48)',
        isLow: true,
        motivation: '💙 Wajar banget untuk merasa begini. Ambil napas dalam, minum air, dan ingat: kamu sudah melakukan yang terbaik. Istirahat sejenak itu bukan kelemahan — itu kebutuhan.',
        tip: 'Coba istirahat 5–10 menit sebelum melanjutkan.'
    },
    {
        emoji: '😴', label: 'Capek',
        gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
        isLow: true,
        motivation: '🌿 Kelelahan adalah tanda kamu sudah bekerja keras. Pelan-pelan saja hari ini — kualitas lebih baik dari kecepatan.',
        tip: 'Prioritaskan 1–2 tugas terpenting saja hari ini.'
    },
    {
        emoji: '😐', label: 'Biasa',
        gradient: 'linear-gradient(135deg, #64748b, #475569)',
        isLow: false, motivation: null, tip: null
    },
    {
        emoji: '🙂', label: 'Baik',
        gradient: 'linear-gradient(135deg, #3b82f6, #4f46e5)',
        isLow: false, motivation: null, tip: null
    },
    {
        emoji: '🤩', label: 'Semangat',
        gradient: 'linear-gradient(135deg, #ec4899, #c026d3)',
        isLow: false, motivation: null, tip: null
    },
];

const WHY_POINTS = [
    {
        icon: MessageSquare,
        color: 'text-blue-500', bg: 'bg-blue-50',
        title: 'Kita jarang bisa cerita langsung',
        desc: 'Mood tracker jadi jembatan kecil untuk saling memahami di tim yang sibuk.'
    },
    {
        icon: Users,
        color: 'text-purple-500', bg: 'bg-purple-50',
        title: 'Empati membangun tim yang kuat',
        desc: 'Saat rekan tahu kamu burnout, mereka bisa lebih pengertian dan membantu.'
    },
    {
        icon: TrendingUp,
        color: 'text-emerald-500', bg: 'bg-emerald-50',
        title: 'Mood baik = performa baik',
        desc: 'Karyawan yang merasa didengar 4.6× lebih produktif dari rata-rata.'
    },
];

export const MoodTrackerModal: React.FC<MoodTrackerModalProps> = ({ userId, workspaceId, onClose }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);
    const [selectedMood, setSelectedMood] = useState<typeof MOODS[0] | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showNudge, setShowNudge] = useState(false);
    const [resolvedWsId, setResolvedWsId] = useState<string | null>(null);

    useEffect(() => {
        if (!userId || !workspaceId) return;
        setResolvedWsId(workspaceId);
        const t = setTimeout(() => {
            const sessionKey = `mood_session_${userId}_${workspaceId}`;
            if (localStorage.getItem(sessionKey) === 'true') return;
            setIsOpen(true);
        }, 800);
        return () => clearTimeout(t);
    }, [userId, workspaceId]);

    const handleSelect = (mood: typeof MOODS[0]) => {
        if (isSaving) return;
        setSelectedMood(mood);
        if (mood.isLow) { setShowNudge(true); }
        else { saveMoodAndClose(mood); }
    };

    const saveMoodAndClose = async (mood: typeof MOODS[0]) => {
        setIsSaving(true);
        const wsId = resolvedWsId || workspaceId || localStorage.getItem('active_workspace_id');
        if (wsId) localStorage.setItem(`mood_session_${userId}_${wsId}`, 'true');
        localStorage.setItem(`current_mood_${userId}`, mood.emoji);
        setShowNudge(false);
        setShowThankYou(true);
        setTimeout(() => { setIsOpen(false); if (onClose) onClose(); }, 2000);
        supabase.from('user_moods').insert({
            user_id: userId, workspace_id: wsId,
            mood_emoji: mood.emoji, mood_label: mood.label, is_private: false,
        }).then(({ error }) => { if (error) console.error('Mood save error:', error); });
        setIsSaving(false);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-[8px]"
                style={{ animation: 'moodFadeIn 0.3s ease-out both' }} />

            {/* Modal */}
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-8"
                style={{ animation: 'moodFadeIn 0.3s ease-out both' }}>
                <div
                    className="bg-card w-full max-w-[900px] rounded-[2.5rem] border-[4px] border-slate-900 shadow-[20px_20px_0px_0px_rgba(15,23,42,0.9)] overflow-hidden"
                    style={{ animation: 'moodSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
                >
                    {/* ── NUDGE STATE ── */}
                    {showNudge && selectedMood ? (
                        <div className="p-12 sm:p-16 flex flex-col items-center gap-8 text-center"
                            style={{ animation: 'moodZoomIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                            <div className="flex flex-col items-center gap-4">
                                <span className="text-9xl" style={{ animation: 'moodBounce 0.6s ease-out both' }}>
                                    {selectedMood.emoji}
                                </span>
                                <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 border-2 border-amber-300 rounded-full">
                                    <Lightbulb size={14} className="text-amber-600" />
                                    <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Sebentar ya…</span>
                                </div>
                            </div>
                            <div className="max-w-xl space-y-4">
                                <p className="text-xl sm:text-2xl font-black text-foreground leading-snug">
                                    {selectedMood.motivation}
                                </p>
                                {selectedMood.tip && (
                                    <div className="flex items-center gap-3 bg-amber-50 border-2 border-amber-200 rounded-2xl px-5 py-4">
                                        <Coffee size={20} className="text-amber-600 shrink-0" />
                                        <p className="text-sm font-bold text-amber-800 text-left">{selectedMood.tip}</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-4 w-full max-w-sm">
                                <button
                                    onClick={() => setShowNudge(false)}
                                    className="flex-1 py-3.5 rounded-xl border-[2.5px] border-slate-300 text-sm font-black text-slate-600 hover:border-slate-500 transition-all"
                                >
                                    Ubah Mood
                                </button>
                                <button
                                    onClick={() => saveMoodAndClose(selectedMood)}
                                    className="flex-1 py-3.5 rounded-xl border-[2.5px] border-slate-900 bg-slate-900 text-white text-sm font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,0.4)] hover:-translate-y-0.5 transition-all"
                                >
                                    Lanjutkan →
                                </button>
                            </div>
                        </div>

                    ) : showThankYou && selectedMood ? (

                        /* ── THANK YOU STATE ── */
                        <div className="py-20 px-12 flex flex-col items-center justify-center text-center gap-6"
                            style={{ animation: 'moodZoomIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                            <div className="relative">
                                <div className="text-9xl leading-none" style={{ animation: 'moodBounce 0.6s ease-out both' }}>
                                    {selectedMood.emoji}
                                </div>
                                <div className="absolute -inset-6 rounded-full bg-gradient-to-br from-pink-400/20 to-fuchsia-500/20 blur-2xl -z-10" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-4xl sm:text-5xl font-black text-foreground font-heading italic tracking-tight">
                                    Thankyou, happy working!
                                </h3>
                                <p className="text-base font-semibold text-muted-foreground">
                                    Mood kamu sudah dishare ke tim. Rekan-rekanmu bisa saling memahami satu sama lain. 🤝
                                </p>
                            </div>
                        </div>

                    ) : (

                        /* ── MAIN STATE ── */
                        <div className="flex flex-col sm:flex-row min-h-0">

                            {/* LEFT: Pertanyaan + Emoji */}
                            <div className="flex-1 p-9 sm:p-12 flex flex-col justify-between gap-7">

                                {/* Badge */}
                                <div className="flex items-center gap-2 w-fit">
                                    <div className="flex items-center gap-2 px-4 py-1.5 bg-pink-100 border-2 border-pink-300 rounded-full">
                                        <Heart size={14} className="text-pink-500 fill-pink-500" />
                                        <span className="text-xs font-black text-pink-600 uppercase tracking-widest">Daily Pulse</span>
                                    </div>
                                </div>

                                {/* Question */}
                                <div className="space-y-3">
                                    <h2 className="text-4xl sm:text-5xl font-black text-foreground font-heading leading-tight tracking-tight">
                                        Bagaimana<br />mood kamu<br />hari ini?
                                    </h2>
                                    <p className="text-sm font-semibold text-muted-foreground leading-relaxed max-w-sm">
                                        Mood kamu akan terlihat oleh sesama anggota workspace — bantu tim saling memahami! 💬
                                    </p>
                                </div>

                                {/* Emoji Grid */}
                                <div className="grid grid-cols-5 gap-3 sm:gap-4 w-full">
                                    {MOODS.map((mood) => (
                                        <button
                                            key={mood.label}
                                            onClick={() => handleSelect(mood)}
                                            disabled={isSaving}
                                            title={mood.label}
                                            className="group relative flex flex-col items-center justify-center gap-2 w-full aspect-square rounded-2xl border-[3px] border-slate-900 shadow-[5px_5px_0px_0px_rgba(15,23,42,0.8)] hover:-translate-y-2 hover:shadow-[7px_7px_0px_0px_rgba(15,23,42,0.9)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(15,23,42,0.9)] transition-all duration-200 ease-out disabled:opacity-60 disabled:cursor-not-allowed"
                                            style={{ background: mood.gradient }}
                                        >
                                            <span className="text-3xl sm:text-4xl leading-none group-hover:scale-110 transition-transform duration-200 drop-shadow-md">
                                                {mood.emoji}
                                            </span>
                                            <span className="text-[11px] font-black uppercase tracking-tight text-white/90 leading-none">
                                                {mood.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Team visibility badge */}
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border-2 border-emerald-200 rounded-xl w-fit">
                                    <Users size={16} className="text-emerald-600 shrink-0" />
                                    <span className="text-xs font-black text-emerald-700">
                                        Visible ke semua anggota workspace
                                    </span>
                                </div>

                                {/* Footer */}
                                <p className="text-xs text-muted-foreground font-semibold opacity-60 italic">
                                    Popup ini hanya muncul sekali setiap kamu login.
                                </p>
                            </div>

                            {/* RIGHT: Why it matters */}
                            <div className="w-full sm:w-[300px] bg-slate-50 border-t-[3px] sm:border-t-0 sm:border-l-[3px] border-slate-200 flex flex-col p-7 gap-5">
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">Mengapa ini ada?</p>
                                    <h3 className="text-base font-black text-foreground leading-snug">Karena kita peduli satu sama lain.</h3>
                                </div>

                                <div className="space-y-4 flex-1">
                                    {WHY_POINTS.map((point, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className={`w-8 h-8 ${point.bg} rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-200`}>
                                                <point.icon size={15} className={point.color} />
                                            </div>
                                            <div className="space-y-0.5 min-w-0">
                                                <p className="text-xs font-black text-foreground leading-tight">{point.title}</p>
                                                <p className="text-[11px] font-medium text-muted-foreground leading-snug">{point.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 space-y-1.5">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">Tahukah kamu?</p>
                                    <p className="text-[11px] font-semibold leading-relaxed text-slate-400">
                                        Tim yang saling memahami kondisi satu sama lain menghasilkan kolaborasi 3× lebih efektif.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes moodFadeIn { from{opacity:0} to{opacity:1} }
                @keyframes moodSlideUp {
                    from{opacity:0;transform:translateY(40px) scale(0.95)}
                    to{opacity:1;transform:translateY(0) scale(1)}
                }
                @keyframes moodZoomIn {
                    from{opacity:0;transform:scale(0.85)}
                    to{opacity:1;transform:scale(1)}
                }
                @keyframes moodBounce {
                    0%{transform:scale(0.3) rotate(-15deg)}
                    60%{transform:scale(1.25) rotate(5deg)}
                    80%{transform:scale(0.95) rotate(-3deg)}
                    100%{transform:scale(1) rotate(0deg)}
                }
            `}</style>
        </>
    );
};
