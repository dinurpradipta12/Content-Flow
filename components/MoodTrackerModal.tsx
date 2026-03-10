import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Modal } from './ui/Modal';
import { CheckCircle, Heart, Sparkles, AlertCircle } from 'lucide-react';

interface MoodTrackerModalProps {
    userId: string;
    workspaceId: string;
    onClose?: () => void;
}

const MOODS = [
    { emoji: '😭', label: 'Burnout', color: 'bg-red-500', shadow: 'shadow-red-500/50' },
    { emoji: '😴', label: 'Tired', color: 'bg-amber-500', shadow: 'shadow-amber-500/50' },
    { emoji: '😐', label: 'Neutral', color: 'bg-slate-500', shadow: 'shadow-slate-500/50' },
    { emoji: '🙂', label: 'Good', color: 'bg-blue-500', shadow: 'shadow-blue-500/50' },
    { emoji: '🤩', label: 'Happy', color: 'bg-pink-500', shadow: 'shadow-pink-500/50' },
];

export const MoodTrackerModal: React.FC<MoodTrackerModalProps> = ({ userId, workspaceId, onClose }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);

    useEffect(() => {
        const checkDailyMood = async () => {
            if (!userId) return;

            const today = new Date().toISOString().split('T')[0];
            const lastCheck = localStorage.getItem(`mood_check_${userId}`);

            if (lastCheck === today) return;

            // Optional: Check database if already filled today for this workspace
            const { data } = await supabase
                .from('user_moods')
                .select('id')
                .eq('user_id', userId)
                .gte('created_at', `${today}T00:00:00`)
                .limit(1);

            if (data && data.length > 0) {
                localStorage.setItem(`mood_check_${userId}`, today);
                return;
            }

            // Show modal if not filled
            setIsOpen(true);
        };

        checkDailyMood();
    }, [userId]);

    const handleMoodSelect = async (mood: typeof MOODS[0]) => {
        if (!userId || !workspaceId) return;

        setIsSaving(true);
        setSelectedMood(mood.emoji);

        try {
            const today = new Date().toISOString().split('T')[0];

            // Upsert mood for today
            const { error } = await supabase
                .from('user_moods')
                .insert({
                    user_id: userId,
                    workspace_id: workspaceId,
                    mood_emoji: mood.emoji,
                    mood_label: mood.label
                });

            if (error) throw error;

            localStorage.setItem(`mood_check_${userId}`, today);
            localStorage.setItem(`current_mood_${userId}`, mood.emoji);

            setShowThankYou(true);
            setTimeout(() => {
                setIsOpen(false);
                if (onClose) onClose();
            }, 2000);
        } catch (err) {
            console.error('Error saving mood:', err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-lg rounded-[2.5rem] border-[4px] border-slate-900 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] overflow-hidden relative">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Sparkles size={120} />
                </div>

                <div className="p-8 sm:p-10">
                    {!showThankYou ? (
                        <div className="space-y-8">
                            <div className="text-center space-y-3">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent/10 border-2 border-accent/20 text-accent rounded-full text-xs font-black uppercase tracking-widest mb-2 animate-bounce">
                                    <Heart size={14} fill="currentColor" /> Daily Pulse
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-black text-foreground font-heading tracking-tight">Bagaimana mood kamu hari ini?</h2>
                                <p className="text-muted-foreground font-bold text-sm sm:text-base leading-relaxed">
                                    Berbagi mood membantu kita saling memahami dan berempati satu sama lain dalam tim, terutama saat kita jarang bisa bercerita langsung.
                                </p>
                            </div>

                            <div className="grid grid-cols-5 gap-3 sm:gap-4 py-4">
                                {MOODS.map((mood) => (
                                    <button
                                        key={mood.label}
                                        onClick={() => handleMoodSelect(mood)}
                                        disabled={isSaving}
                                        className={`group relative flex flex-col items-center gap-3 p-3 sm:p-4 rounded-3xl border-[3px] border-slate-900 transition-all duration-300 ${mood.color} hover:-translate-y-2 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] disabled:opacity-50 disabled:translate-y-0`}
                                    >
                                        <span className="text-3xl sm:text-4xl group-hover:scale-125 transition-transform duration-300 drop-shadow-md animate-mood-float">
                                            {mood.emoji}
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-tighter text-white opacity-90">
                                            {mood.label}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="bg-muted/50 border-2 border-slate-900/10 p-5 rounded-3xl flex items-start gap-4">
                                <div className="p-2 bg-blue-500 rounded-xl text-white shadow-hard-mini">
                                    <AlertCircle size={18} />
                                </div>
                                <div>
                                    <h4 className="font-black text-xs text-foreground uppercase tracking-widest mb-1">Kenapa ini penting?</h4>
                                    <p className="text-[11px] font-bold text-muted-foreground leading-snug">
                                        Mood yang baik meningkatkan kreativitas dan performa kerja. Dengan mengetahui mood tim, kita bisa saling mendukung dan menciptakan lingkungan kerja yang aman secara psikologis.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white border-[4px] border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] animate-bounce">
                                <CheckCircle size={48} strokeWidth={3} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-4xl font-black text-foreground font-heading italic">Thankyou, happy working!</h3>
                                <p className="text-muted-foreground font-bold">Terima kasih sudah jujur dengan perasaanmu hari ini.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes mood-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-mood-float {
                    animation: mood-float 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};
