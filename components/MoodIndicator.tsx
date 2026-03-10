import React from 'react';

interface MoodIndicatorProps {
    moodEmoji: string | null;
    size?: 'sm' | 'md' | 'lg';
    animate?: boolean;
}

export const MoodIndicator: React.FC<MoodIndicatorProps> = ({ moodEmoji, size = 'sm', animate = true }) => {
    if (!moodEmoji) return null;

    const sizeClasses = {
        sm: 'w-5 h-5 text-[11px] -bottom-1 -left-1 border-[2px]',
        md: 'w-7 h-7 text-[15px] -bottom-1.5 -left-1.5 border-[2px]',
        lg: 'w-10 h-10 text-[20px] -bottom-2 -left-2 border-[3px]',
    };

    return (
        <>
            <div
                className={`
                    absolute ${sizeClasses[size]}
                    bg-white rounded-full
                    flex items-center justify-center
                    border-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]
                    z-10
                    transition-transform duration-300
                    hover:scale-150
                `}
                style={animate ? { animation: 'moodFloat 2.8s ease-in-out infinite' } : undefined}
            >
                <span className="relative leading-none select-none">{moodEmoji}</span>
            </div>

            <style>{`
                @keyframes moodFloat {
                    0%,  100% { transform: translateY(0px) scale(1);    }
                    30%       { transform: translateY(-3px) scale(1.08); }
                    60%       { transform: translateY(1px) scale(0.97);  }
                    80%       { transform: translateY(-2px) scale(1.04); }
                }
            `}</style>
        </>
    );
};
