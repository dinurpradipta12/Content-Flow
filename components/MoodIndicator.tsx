import React from 'react';

interface MoodIndicatorProps {
    moodEmoji: string | null;
    size?: 'sm' | 'md' | 'lg';
}

export const MoodIndicator: React.FC<MoodIndicatorProps> = ({ moodEmoji, size = 'sm' }) => {
    if (!moodEmoji) return null;

    const sizeClasses = {
        sm: 'w-5 h-5 text-[10px] -bottom-1 -left-1 border-[2px]',
        md: 'w-7 h-7 text-[14px] -bottom-1.5 -left-1.5 border-[2px]',
        lg: 'w-10 h-10 text-[20px] -bottom-2 -left-2 border-[3px]',
    };

    return (
        <div className={`absolute ${sizeClasses[size]} bg-white dark:bg-slate-800 rounded-full flex items-center justify-center border-slate-900 shadow-hard-mini transition-transform duration-300 hover:scale-125 z-10 animate-bounce-in`}>
            {moodEmoji}
        </div>
    );
};
