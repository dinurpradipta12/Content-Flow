import React from 'react';
import { Crown, Lock } from 'lucide-react';
import { Button } from './ui/Button';

interface PremiumLockScreenProps {
    title: string;
    description: string;
}

export const PremiumLockScreen: React.FC<PremiumLockScreenProps> = ({ title, description }) => {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
            <div className="relative mb-6">
                <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center border-4 border-amber-200">
                    <Lock className="text-amber-500 w-12 h-12" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                    <Crown className="text-amber-400 w-5 h-5" />
                </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-slate-800 font-heading mb-4 tracking-tight">
                {title}
            </h2>

            <p className="text-slate-500 font-bold max-w-md mx-auto mb-8 leading-relaxed">
                {description}
            </p>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 max-w-sm w-full mx-auto shadow-sm">
                <h3 className="font-black text-amber-800 uppercase tracking-widest text-xs mb-2">Upgrade Tersedia</h3>
                <p className="text-sm font-bold text-amber-700/80 mb-6">
                    Ambil paket langganan sekarang untuk membuka fitur eksklusif ini dan tingkatkan performa tim Anda.
                </p>
                <Button
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-hard-mini font-black text-base py-6"
                    onClick={() => window.dispatchEvent(new Event('open-payment-modal'))}
                >
                    <Crown className="w-5 h-5 mr-2 text-amber-400" /> Upgrade ke Pro
                </Button>
            </div>
        </div>
    );
};
