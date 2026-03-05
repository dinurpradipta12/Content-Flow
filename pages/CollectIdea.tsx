import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { supabase } from '../services/supabaseClient';
import {
    Plus, Search, Trash2, ExternalLink, RefreshCw, Loader2,
    Zap, Instagram, Play, Youtube, Facebook, Linkedin, Video, Film,
    Hash, Globe, Layout, Layers, Filter, ArrowLeft, MoreHorizontal,
    PlusCircle, FolderOpen, Save, X
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Platform } from '../types';
import { useUserPreferences, useTeamKpis, useWorkspaces } from '../src/hooks/useDataQueries';

interface ContentIdea {
    id: string;
    title: string;
    platform: string;
    type: string;
    reference_link: string;
    description: string;
    workspace_id: string;
    created_at: string;
}

export const CollectIdea: React.FC = () => {
    const { id: workspaceParamId } = useParams();
    const navigate = useNavigate();

    const userId = localStorage.getItem('user_id');
    const { data: workspaces = [] } = useWorkspaces(userId);

    const [ideas, setIdeas] = useState<ContentIdea[]>([]);
    const [selectedWs, setSelectedWs] = useState(workspaceParamId || 'all');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newIdea, setNewIdea] = useState({
        title: '',
        platform: 'Instagram',
        type: 'Video/Reels',
        reference_link: '',
        description: '',
        workspace_id: workspaceParamId || ''
    });
    const [saving, setSaving] = useState(false);

    const fetchIdeas = async () => {
        setLoading(true);
        try {
            let query = supabase.from('content_ideas').select('*').eq('user_id', userId);

            if (selectedWs !== 'all') {
                query = query.eq('workspace_id', selectedWs);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            setIdeas(data || []);
        } catch (err) {
            console.error('Fetch ideas error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) fetchIdeas();
    }, [selectedWs, userId]);

    const handleAddIdea = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newIdea.title || !newIdea.workspace_id) return;

        setSaving(true);
        try {
            const { error } = await supabase.from('content_ideas').insert({
                ...newIdea,
                user_id: userId
            });
            if (error) throw error;

            setIsAddModalOpen(false);
            setNewIdea({
                title: '',
                platform: 'Instagram',
                type: 'Video/Reels',
                reference_link: '',
                description: '',
                workspace_id: selectedWs !== 'all' ? selectedWs : ''
            });
            fetchIdeas();
        } catch (err) {
            console.error('Add idea error:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteIdea = async (id: string) => {
        if (!confirm('Yakin ingin menghapus ide ini?')) return;
        try {
            await supabase.from('content_ideas').delete().eq('id', id);
            fetchIdeas();
        } catch (err) {
            console.error(err);
        }
    };

    const filteredIdeas = ideas.filter(idea =>
        idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.platform.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getPlatformIcon = (plt: string) => {
        const p = plt.toLowerCase();
        if (p === 'instagram') return <Instagram size={14} className="text-pink-500" />;
        if (p === 'tiktok') return <Video size={14} className="text-slate-900" />;
        if (p === 'youtube') return <Youtube size={14} className="text-red-500" />;
        if (p === 'facebook') return <Facebook size={14} className="text-blue-600" />;
        if (p === 'linkedin') return <Linkedin size={14} className="text-blue-700" />;
        return <Globe size={14} className="text-slate-400" />;
    };

    return (
        <div className="min-h-screen bg-transparent p-6 md:p-10 space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="w-10 h-10 rounded-xl border-2 border-slate-900 flex items-center justify-center hover:bg-slate-50 transition-all">
                        <ArrowLeft size={18} strokeWidth={3} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 font-heading tracking-tighter flex items-center gap-3">
                            <Zap className="text-amber-500 fill-amber-500" /> Papan Ide Pribadi
                        </h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Collecting inspiration for your future content.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            placeholder="Cari ide..."
                            className="w-full bg-slate-50 border-[3px] border-slate-900 rounded-2xl pl-12 pr-4 py-3 text-xs font-black uppercase outline-none focus:bg-white transition-all shadow-hard-mini"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Select
                        value={selectedWs}
                        onChange={(e) => setSelectedWs(e.target.value)}
                        className="bg-white border-[3px] border-slate-900 rounded-2xl px-5 py-3 text-xs font-black uppercase shadow-hard-mini h-[48px]"
                    >
                        <option value="all">ALL WORKSPACES</option>
                        {workspaces.map(ws => (
                            <option key={ws.id} value={ws.id}>{ws.name.toUpperCase()}</option>
                        ))}
                    </Select>

                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-slate-900 text-white rounded-2xl h-[48px] px-6 font-black uppercase text-xs shadow-hard-mini hover:-translate-y-1 transition-all"
                    >
                        <PlusCircle className="mr-2" size={18} /> Tambah Ide
                    </Button>
                </div>
            </div>

            {/* Ideas Table */}
            <div className="bg-white border-[3.5px] border-slate-900 rounded-[2.5rem] shadow-hard overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                                <th className="px-8 py-5">NAMA / JUDUL IDE</th>
                                <th className="px-6 py-5">PLATFORM</th>
                                <th className="px-6 py-5">JENIS</th>
                                <th className="px-6 py-5">REFERENSI</th>
                                <th className="px-6 py-5">AKSI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-[2px] divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <Loader2 className="animate-spin inline mr-2" />
                                        <span className="font-bold text-slate-400 italic">Memuat ide...</span>
                                    </td>
                                </tr>
                            ) : filteredIdeas.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center space-y-4">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
                                            <FolderOpen className="text-slate-200" size={32} />
                                        </div>
                                        <p className="font-bold text-slate-300 italic">Belum ada ide tersimpan di sini.</p>
                                    </td>
                                </tr>
                            ) : filteredIdeas.map(idea => (
                                <tr key={idea.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div>
                                            <p className="font-black text-slate-900 text-base">{idea.title}</p>
                                            <p className="text-xs font-bold text-slate-400 line-clamp-1 mt-0.5">{idea.description || 'No description'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 font-bold text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-white border-2 border-slate-100 flex items-center justify-center shadow-sm">
                                                {getPlatformIcon(idea.platform)}
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">{idea.platform}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-500 border border-indigo-100 rounded-lg text-[10px] font-black uppercase tracking-widest">{idea.type}</span>
                                    </td>
                                    <td className="px-6 py-6">
                                        {idea.reference_link ? (
                                            <a
                                                href={idea.reference_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-xs font-black text-accent hover:underline bg-accent/5 px-3 py-2 rounded-xl border border-accent/10 w-fit"
                                            >
                                                Ref Link <ExternalLink size={12} />
                                            </a>
                                        ) : (
                                            <span className="text-xs font-bold text-slate-300 italic">Kosong</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDeleteIdea(idea.id)}
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-red-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            {/* Future: Convert to Content Item */}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Idea Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Tambah Ide Baru" maxWidth="max-w-md">
                <form onSubmit={handleAddIdea} className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Workspace Target</label>
                        <Select
                            value={newIdea.workspace_id}
                            onChange={(e) => setNewIdea({ ...newIdea, workspace_id: e.target.value })}
                            className="h-12 border-2 text-sm font-bold shadow-sm"
                        >
                            <option value="">Pilih Workspace...</option>
                            {workspaces.map(ws => (
                                <option key={ws.id} value={ws.id}>{ws.name}</option>
                            ))}
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Judul / Konsep Ide</label>
                        <Input
                            placeholder="Contoh: Video ASMR bersihin keyboard..."
                            value={newIdea.title}
                            onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                            className="h-12 border-2 text-sm font-bold shadow-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Platform</label>
                            <Select
                                value={newIdea.platform}
                                onChange={(e) => setNewIdea({ ...newIdea, platform: e.target.value })}
                                className="h-12 border-2 text-xs font-bold shadow-sm"
                            >
                                {Object.values(Platform).map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Jenis Ide</label>
                            <Select
                                value={newIdea.type}
                                onChange={(e) => setNewIdea({ ...newIdea, type: e.target.value })}
                                className="h-12 border-2 text-xs font-bold shadow-sm"
                            >
                                <option value="Video/Reels">Video/Reels</option>
                                <option value="Carousel">Carousel</option>
                                <option value="Single Post">Single Post</option>
                                <option value="Educational">Educational</option>
                                <option value="Vlog">Vlog</option>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Link Referensi (Optional)</label>
                        <Input
                            placeholder="https://..."
                            value={newIdea.reference_link}
                            onChange={(e) => setNewIdea({ ...newIdea, reference_link: e.target.value })}
                            className="h-12 border-2 text-sm font-bold shadow-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Deskripsi / Detail</label>
                        <textarea
                            className="w-full bg-white border-2 border-slate-200 rounded-xl p-4 text-sm font-bold focus:border-slate-900 transition-all outline-none min-h-[100px]"
                            placeholder="Jelaskan detail ide kamu di sini..."
                            value={newIdea.description}
                            onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-14 font-black">Batal</Button>
                        <Button
                            disabled={saving}
                            className="flex-1 h-14 font-black bg-slate-900 text-white shadow-hard-mini hover:-translate-y-1 transition-all"
                        >
                            {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Simpan Ide
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
