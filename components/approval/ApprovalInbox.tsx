import React, { useState } from 'react';
import {
    CheckCircle,
    Clock,
    XCircle,
    AlertCircle,
    FileText,
    Search,
    Folder,
    FolderOpen,
    ChevronRight
} from 'lucide-react';
import { ApprovalRequest, ApprovalStatus } from '../../types/approval';

interface ApprovalInboxProps {
    requests: ApprovalRequest[];
    onSelectRequest: (request: ApprovalRequest) => void;
    loading: boolean;
}

export const ApprovalInbox: React.FC<ApprovalInboxProps> = ({ requests, onSelectRequest, loading }) => {
    const [selectedWorkspace, setSelectedWorkspace] = useState<string>('Semua Akun');
    const [selectedStatus, setSelectedStatus] = useState<ApprovalStatus | 'All'>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('All');
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ 'Semua Akun': true });

    const workspaces = ['Semua Akun', ...Array.from(new Set(requests.map(r => r.form_data.workspace as string).filter(Boolean)))];
    const statuses: (ApprovalStatus | 'All')[] = ['All', 'Pending', 'Approved', 'Rejected', 'Returned'];
    const templates = ['All', ...Array.from(new Set(requests.map(r => r.template?.name as string).filter(Boolean)))];

    const filteredRequests = requests.filter(req => {
        const matchesWorkspace = selectedWorkspace === 'Semua Akun' || req.form_data.workspace === selectedWorkspace;
        const matchesStatus = selectedStatus === 'All' || req.status === selectedStatus;
        const matchesTemplate = selectedTemplate === 'All' || req.template?.name === selectedTemplate;
        const matchesSearch = req.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.form_data.judul_konten || req.template?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesWorkspace && matchesStatus && matchesTemplate && matchesSearch;
    });

    const getStatusColor = (status: ApprovalStatus) => {
        switch (status) {
            case 'Approved': return 'bg-green-400 text-slate-900 border-slate-900';
            case 'Rejected': return 'bg-red-400 text-slate-900 border-slate-900';
            case 'Pending': return 'bg-yellow-400 text-slate-900 border-slate-900';
            case 'Returned': return 'bg-orange-400 text-slate-900 border-slate-900';
            default: return 'bg-slate-200 text-slate-900 border-slate-900';
        }
    };

    const toggleFolder = (ws: string) => {
        setExpandedFolders(prev => ({ ...prev, [ws]: !prev[ws] }));
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
            {/* Left Sidebar: Folders */}
            <div className="w-full md:w-64 shrink-0 flex flex-col gap-4">
                <div className="bg-white border-4 border-slate-900 rounded-2xl p-4 shadow-[4px_4px_0px_0px_#0f172a] h-full overflow-y-auto custom-scrollbar">
                    <h3 className="font-black text-lg uppercase tracking-tight mb-4 border-b-4 border-slate-900 pb-2">Account List</h3>
                    <div className="space-y-2">
                        {workspaces.map(ws => {
                            const isSelected = selectedWorkspace === ws;
                            const isExpanded = expandedFolders[ws];
                            return (
                                <div key={ws} className="space-y-1">
                                    <div className={`w-full flex items-center justify-between p-1 rounded-xl border-2 font-bold transition-all ${isSelected
                                        ? 'bg-accent text-white border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] translate-x-1'
                                        : 'bg-white text-slate-700 border-transparent hover:border-slate-300 hover:bg-slate-50'
                                        }`}>
                                        <button
                                            onClick={() => {
                                                setSelectedWorkspace(ws as string);
                                                setSelectedStatus('All');
                                            }}
                                            className="flex items-center gap-2 truncate flex-1 p-1 text-left"
                                        >
                                            {isSelected ? <FolderOpen size={18} /> : <Folder size={18} className={isSelected ? 'text-white' : 'text-accent'} />}
                                            <span className="truncate">{ws as string}</span>
                                        </button>
                                        <button
                                            onClick={() => toggleFolder(ws as string)}
                                            className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'hover:bg-white/20' : 'hover:bg-slate-200'}`}
                                        >
                                            <ChevronRight size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                        </button>
                                    </div>

                                    {/* Sub-folders (Statuses) */}
                                    {isExpanded && (
                                        <div className="pl-6 space-y-1 mt-1 border-l-2 border-slate-200 ml-4 animate-in slide-in-from-top-2 duration-200">
                                            {statuses.map(status => (
                                                <button
                                                    key={status}
                                                    onClick={() => setSelectedStatus(status)}
                                                    className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs font-bold transition-all ${selectedStatus === status
                                                        ? 'bg-yellow-300 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-2 border-transparent'
                                                        }`}
                                                >
                                                    <span>{status === 'All' ? 'Semua Status' : status}</span>
                                                    {selectedStatus === status && <ChevronRight size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right: Approval List (Cards) */}
            <div className="flex-1 bg-white border-4 border-slate-900 rounded-2xl shadow-[8px_8px_0px_0px_#0f172a] flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b-4 border-slate-900 bg-[#FFFDF5] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="font-black text-xl uppercase tracking-tight">Daftar Pengajuan</h3>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <select
                            className="px-4 py-2 rounded-xl border-4 border-slate-900 focus:outline-none focus:bg-yellow-50 font-bold text-slate-900 transition-colors shadow-[2px_2px_0px_0px_#0f172a] bg-white"
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                        >
                            <option value="All">Filter Section</option>
                            {templates.filter(t => t !== 'All').map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        <div className="relative w-full sm:w-64">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900" />
                            <input
                                type="text"
                                placeholder="Cari judul / PIC..."
                                className="w-full pl-10 pr-4 py-2 rounded-xl border-4 border-slate-900 focus:outline-none focus:bg-yellow-50 font-bold text-slate-900 transition-colors shadow-[2px_2px_0px_0px_#0f172a]"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Card List */}
                <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50 p-6">
                    {loading && requests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-900 gap-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-slate-900"></div>
                            <p className="font-black uppercase tracking-widest">Memuat Data...</p>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="w-24 h-24 bg-slate-100 border-4 border-slate-900 rounded-full flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_#0f172a]">
                                <FileText size={40} className="text-slate-400" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Kosong</h3>
                            <p className="text-slate-500 font-bold">Tidak ada pengajuan di folder ini.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredRequests.map((req) => (
                                <div
                                    key={req.id}
                                    onClick={() => onSelectRequest(req)}
                                    className="bg-white border-4 border-slate-900 rounded-2xl p-5 flex flex-col gap-4 cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] shadow-[4px_4px_0px_0px_#0f172a] transition-all group"
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <h4 className="font-black text-slate-900 text-lg leading-tight group-hover:text-accent transition-colors line-clamp-2">
                                            {req.template?.name || 'Approval'}
                                        </h4>
                                        <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border-2 ${getStatusColor(req.status)}`}>
                                            {req.status}
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-sm font-bold text-slate-600">
                                        <p className="truncate"><span className="text-slate-400 uppercase text-[10px] tracking-wider block leading-none mb-0.5">Judul Konten</span> <span className="text-slate-900">{req.form_data.judul_konten || '-'}</span></p>
                                        <p className="truncate"><span className="text-slate-400 uppercase text-[10px] tracking-wider block leading-none mb-0.5">PIC Script</span> <span className="text-slate-900">{req.form_data.pic_script || '-'}</span></p>
                                        <p className="truncate"><span className="text-slate-400 uppercase text-[10px] tracking-wider block leading-none mb-0.5">Content Value</span> <span className="text-slate-900">{req.form_data.pillar || '-'}</span></p>
                                    </div>

                                    <div className="mt-auto pt-4 border-t-2 border-slate-100 flex justify-between items-end">
                                        <div className="flex items-center gap-2">
                                            {req.requester_avatar ? (
                                                <img src={req.requester_avatar} alt="PIC" className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-slate-900 flex items-center justify-center">
                                                    <span className="font-black text-xs text-slate-900">{req.requester_name.charAt(0)}</span>
                                                </div>
                                            )}
                                            <span className="font-black text-slate-900 text-xs">{req.requester_name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-slate-400 uppercase block leading-none mb-0.5">Arrived</span>
                                            <span className="text-xs font-bold text-slate-900">{new Date(req.created_at).toISOString().split('T')[0]}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
