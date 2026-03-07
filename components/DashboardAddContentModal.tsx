import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { supabase } from '../services/supabaseClient';
import { PlusCircle, Loader2 } from 'lucide-react';
import { ContentStatus, ContentPriority, Platform } from '../types';

interface DashboardAddContentModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaces: any[];
    onSuccess: () => void;
}

export const DashboardAddContentModal: React.FC<DashboardAddContentModalProps> = ({ isOpen, onClose, workspaces, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [workspaceId, setWorkspaceId] = useState('');
    const [platform, setPlatform] = useState<Platform>(Platform.INSTAGRAM);
    const [type, setType] = useState('Video/Reels');
    const [pillar, setPillar] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !workspaceId) {
            setError('Judul dan Workspace wajib diisi.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const userId = localStorage.getItem('user_id');
            const userName = localStorage.getItem('user_name') || 'User';

            const { error: insertError } = await supabase.from('content_items').insert({
                title: title.trim(),
                workspace_id: workspaceId,
                status: 'Planning', // Fixed to Planning
                platform,
                type,
                pillar: pillar.trim() || 'General',
                priority: 'Medium',
                pic: userName,
                date: new Date().toISOString()
            });

            if (insertError) throw insertError;

            // Success
            setTitle('');
            setWorkspaceId('');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error adding content:', err);
            setError(err.message || 'Gagal menambahkan konten.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Buat Konten Baru" maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-mutedForeground ml-1">Nama / Judul Konten</label>
                    <Input
                        placeholder="Contoh: Tutorial Masak Ayam..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="h-12 border-2 text-sm font-bold"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-mutedForeground ml-1">Pilih Workspace</label>
                    <Select
                        value={workspaceId}
                        onChange={(e) => setWorkspaceId(e.target.value)}
                        className="h-12 border-2 text-sm font-bold"
                    >
                        <option value="">Pilih Workspace...</option>
                        {workspaces.map(ws => (
                            <option key={ws.id} value={ws.id}>{ws.name}</option>
                        ))}
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-mutedForeground ml-1">Platform</label>
                        <Select
                            value={platform}
                            onChange={(e) => setPlatform(e.target.value as Platform)}
                            className="h-12 border-2 text-xs font-bold"
                        >
                            {Object.values(Platform).map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-mutedForeground ml-1">Jenis</label>
                        <Select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="h-12 border-2 text-xs font-bold"
                        >
                            <option value="Video/Reels">Video/Reels</option>
                            <option value="Carousel">Carousel</option>
                            <option value="Single Post">Single Post</option>
                            <option value="Story">Story</option>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-mutedForeground ml-1">Pilar Konten / Detail (Opsional)</label>
                    <Input
                        placeholder="Contoh: Edukasi, Promosi, dll."
                        value={pillar}
                        onChange={(e) => setPillar(e.target.value)}
                        className="h-12 border-2 text-sm font-bold"
                    />
                </div>

                {error && <p className="text-xs font-black text-red-500 bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}

                <div className="pt-4 flex gap-3">
                    <Button variant="outline" type="button" onClick={onClose} className="flex-1 h-14 font-black">Batal</Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 h-14 font-black bg-foreground text-background shadow-hard-mini hover:-translate-y-1 transition-all"
                    >
                        {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <PlusCircle className="mr-2" size={20} />}
                        Buat Konten
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
