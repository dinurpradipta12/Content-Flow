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
        <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 lg:gap-6 flex-1 min-h-0">
            {/* Left Sidebar: Folders - Hidden on mobile, shown as dropdown */}
            <div className="hidden lg:flex w-full lg:w-56 xl:w-64 shrink-0 flex-col gap-2 sm:gap-3 lg:gap-4 max-h-none overflow-y-visible border-b lg:border-b-0 lg:border-r border-border pb-2 lg:pb-0">
                <div className="bg-card border-3 sm:border-4 border-slate-900 rounded-lg sm:rounded-2xl p-2 sm:p-4 shadow-[4px_4px_0px_0px_#0f172a]">
                    <h3 className="font-black text-xs sm:text-sm lg:text-lg text-foreground uppercase tracking-tight mb-2 sm:mb-4 border-b-3 sm:border-b-4 border-slate-900 pb-1 sm:pb-2">Account List</h3>
                    <div className="space-y-1 sm:space-y-2">
                        {workspaces.map(ws => {
                            const isSelected = selectedWorkspace === ws;
                            const isExpanded = expandedFolders[ws];
                            return (
                                <div key={ws} className="space-y-0.5 sm:space-y-1">
                                    <div className={`w-full flex items-center justify-between p-0.5 sm:p-1 rounded-lg sm:rounded-xl border-2 font-bold text-[9px] sm:text-xs md:text-sm transition-all ${isSelected
                                        ? 'bg-accent text-white border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] translate-x-1'
                                        : 'bg-card text-mutedForeground border-transparent hover:border-slate-300 hover:bg-slate-500/10'
                                        }`}>
                                        <button
                                            onClick={() => {
                                                setSelectedWorkspace(ws as string);
                                                setSelectedStatus('All');
                                            }}
                                            className="flex items-center gap-1 sm:gap-2 truncate flex-1 p-0.5 sm:p-1 text-left"
                                        >
                                            {isSelected ? <FolderOpen size={12} className="sm:w-4 sm:h-4" /> : <Folder size={12} className={`sm:w-4 sm:h-4 ${isSelected ? 'text-white' : 'text-accent'}`} />}
                                            <span className="truncate hidden sm:inline text-[8px] sm:text-xs md:text-sm">{ws as string}</span>
                                        </button>
                                        <button
                                            onClick={() => toggleFolder(ws as string)}
                                            className={`p-0.5 sm:p-1.5 rounded-lg transition-colors ${isSelected ? 'hover:bg-white/20' : 'hover:bg-slate-200'}`}
                                        >
                                            <ChevronRight size={12} className={`sm:w-4 sm:h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                        </button>
                                    </div>

                                    {/* Sub-folders (Statuses) */}
                                    {isExpanded && (
                                        <div className="pl-3 sm:pl-6 space-y-0.5 sm:space-y-1 mt-0.5 sm:mt-1 border-l-2 border-slate-200 ml-2 sm:ml-4 animate-in slide-in-from-top-2 duration-200">
                                            {statuses.map(status => (
                                                <button
                                                    key={status}
                                                    onClick={() => setSelectedStatus(status)}
                                                    className={`w-full flex items-center justify-between p-1 sm:p-1.5 rounded-lg text-[8px] sm:text-xs font-bold transition-all ${selectedStatus === status
                                                        ? 'bg-yellow-400 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]'
                                                        : 'text-mutedForeground hover:text-foreground hover:bg-slate-500/10 border-2 border-transparent'
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
            <div className="flex-1 bg-card border-3 sm:border-4 border-slate-900 rounded-lg sm:rounded-2xl shadow-[8px_8px_0px_0px_#0f172a] flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="p-2 sm:p-3 lg:p-4 border-b-2 sm:border-b-4 border-slate-900 bg-background flex flex-col gap-2 sm:gap-3">
                    <div className="flex justify-between items-start gap-2 sm:gap-3">
                        <h3 className="font-black text-xs sm:text-base lg:text-xl text-foreground uppercase tracking-tight">Daftar Pengajuan</h3>
                        <select
                            className="px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 rounded-lg sm:rounded-xl border-2 sm:border-4 border-slate-900 focus:outline-none focus:bg-slate-500/10 font-bold text-foreground text-[10px] sm:text-xs lg:text-sm transition-colors shadow-[2px_2px_0px_0px_#0f172a] bg-card"
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                        >
                            <option value="All" className="bg-card">Filter</option>
                            {templates.filter(t => t !== 'All').map(t => (
                                <option key={t} value={t} className="bg-card">{t}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative w-full">
                        <Search size={14} className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-mutedForeground" />
                        <input
                            type="text"
                            placeholder="Cari..."
                            className="w-full pl-7 sm:pl-10 pr-2 sm:pr-4 py-1 sm:py-1.5 lg:py-2 rounded-lg sm:rounded-xl border-2 sm:border-4 border-slate-900 focus:outline-none focus:bg-slate-500/10 font-bold text-foreground text-xs sm:text-sm transition-colors shadow-[2px_2px_0px_0px_#0f172a] bg-card"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Card List */}
                <div className="flex-1 overflow-auto custom-scrollbar bg-card/50 p-2 sm:p-4 md:p-6">
                    {loading && requests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-900 gap-4">
                            <div className="animate-spin rounded-full h-8 sm:h-12 w-8 sm:w-12 border-b-4 border-slate-900"></div>
                            <p className="font-black text-xs sm:text-sm uppercase tracking-widest">Memuat Data...</p>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8">
                            <div className="w-16 sm:w-24 h-16 sm:h-24 bg-slate-100 border-2 sm:border-4 border-slate-900 rounded-full flex items-center justify-center mb-3 sm:mb-6 shadow-[4px_4px_0px_0px_#0f172a]">
                                <FileText size={20} className="sm:w-10 sm:h-10 text-slate-400" />
                            </div>
                            <h3 className="text-base sm:text-2xl font-black text-slate-900 uppercase tracking-tight mb-1 sm:mb-2">Kosong</h3>
                            <p className="text-slate-500 font-bold text-xs sm:text-sm">Tidak ada pengajuan di folder ini.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
                            {filteredRequests.map((req) => (
                                <div
                                    key={req.id}
                                    onClick={() => onSelectRequest(req)}
                                    className="bg-card border-2 sm:border-4 border-slate-900 rounded-lg sm:rounded-2xl p-2 sm:p-3 md:p-5 flex flex-col gap-1.5 sm:gap-3 md:gap-4 cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a] shadow-[4px_4px_0px_0px_#0f172a] transition-all group"
                                >
                                    <div className="flex justify-between items-start gap-1 sm:gap-2">
                                        <h4 className="font-black text-foreground text-xs sm:text-base md:text-lg leading-tight group-hover:text-accent transition-colors line-clamp-2">
                                            {req.template?.name || 'Approval'}
                                        </h4>
                                        <span className={`shrink-0 text-[8px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border-2 ${getStatusColor(req.status)}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <div className="space-y-0.5 sm:space-y-1.5 md:space-y-2 text-xs sm:text-sm font-bold text-mutedForeground">
                                        <p className="truncate"><span className="text-mutedForeground uppercase text-[7px] sm:text-[9px] tracking-wider block leading-none mb-0.5 opacity-60">Judul</span> <span className="text-foreground text-xs sm:text-sm">{req.form_data.judul_konten || '-'}</span></p>
                                        <p className="truncate"><span className="text-mutedForeground uppercase text-[7px] sm:text-[9px] tracking-wider block leading-none mb-0.5 opacity-60">PIC</span> <span className="text-foreground text-xs sm:text-sm">{req.form_data.pic_script || '-'}</span></p>
                                        <p className="truncate"><span className="text-mutedForeground uppercase text-[7px] sm:text-[9px] tracking-wider block leading-none mb-0.5 opacity-60">Value</span> <span className="text-foreground text-xs sm:text-sm">{req.form_data.pillar || '-'}</span></p>
                                    </div>

                                    <div className="mt-auto pt-1.5 sm:pt-3 md:pt-4 border-t-2 border-border/20 flex justify-between items-end gap-1">
                                        <div className="flex items-center gap-1 sm:gap-2">
                                            {req.requester_avatar ? (
                                                <img src={req.requester_avatar} alt="PIC" className="w-6 sm:w-8 h-6 sm:h-8 rounded-full border-2 border-slate-900 object-cover flex-shrink-0" />
                                            ) : (
                                                <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-slate-200 border-2 border-slate-900 flex items-center justify-center flex-shrink-0">
                                                    <span className="font-black text-[10px] sm:text-xs text-slate-900">{req.requester_name.charAt(0)}</span>
                                                </div>
                                            )}
                                            <span className="font-black text-foreground text-[10px] sm:text-xs truncate">{req.requester_name}</span>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className="text-[8px] sm:text-[10px] font-black text-mutedForeground uppercase block leading-none mb-0.5">Arrived</span>
                                            <span className="text-[10px] sm:text-xs font-bold text-foreground">{new Date(req.created_at).toISOString().split('T')[0]}</span>
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
