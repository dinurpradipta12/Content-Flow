import React, { useState } from 'react'; // Mission Modal Component
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { PlusCircle, Clock, Bell } from 'lucide-react';

interface DashboardAddMissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (mission: { text: string, time: string, notifPref: string }) => void;
}

export const DashboardAddMissionModal: React.FC<DashboardAddMissionModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [text, setText] = useState('');
    const [time, setTime] = useState('09:00');
    const [notifPref, setNotifPref] = useState('15m');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;

        onSuccess({ text: text.trim(), time, notifPref });
        setText('');
        setTime('09:00');
        setNotifPref('15m');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tambah Mission Baru" maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-mutedForeground ml-1">Nama Mission / Task</label>
                    <Input
                        placeholder="Contoh: Upload Reels Hari Ini..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="h-12 border-2 text-sm font-bold"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-mutedForeground ml-1">Waktu Task</label>
                        <Input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="h-12 border-2 text-sm font-bold"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-mutedForeground ml-1">Notifikasi</label>
                        <Select
                            value={notifPref}
                            onChange={(e) => setNotifPref(e.target.value)}
                            className="h-12 border-2 text-xs font-bold"
                        >
                            <option value="15m">15 Menit Sebelum</option>
                            <option value="30m">30 Menit Sebelum</option>
                            <option value="1d">1 Hari Sebelum</option>
                            <option value="none">Tanpa Notifikasi</option>
                        </Select>
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <Button variant="outline" type="button" onClick={onClose} className="flex-1 h-14 font-black">Batal</Button>
                    <Button
                        type="submit"
                        className="flex-1 h-14 font-black bg-foreground text-background shadow-hard-mini hover:-translate-y-1 transition-all"
                    >
                        <PlusCircle className="mr-2" size={20} />
                        Tambah Task
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
