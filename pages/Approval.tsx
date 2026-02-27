import React, { useState, useEffect } from 'react';
import { ApprovalInbox } from '../components/approval/ApprovalInbox';
import { ApprovalDetailModal } from '../components/approval/ApprovalDetailModal';
import { CreateRequestModal } from '../components/approval/CreateRequestModal';
import { getRequests, getTemplates, APPROVAL_SQL_SCRIPT } from '../services/approvalService';
import { ApprovalRequest, ApprovalTemplate } from '../types/approval';
import { Plus, RefreshCw, Database, Code, CheckCircle, Copy } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useAppConfig } from '../components/AppConfigProvider';

export const Approval: React.FC = () => {
    const [requests, setRequests] = useState<ApprovalRequest[]>([]);
    const [templates, setTemplates] = useState<ApprovalTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
    const { config } = useAppConfig();

    // Mock Current User (In real app, get from Context/Auth)
    const currentUser = {
        id: localStorage.getItem('user_id') || 'guest',
        name: localStorage.getItem('user_name') || 'Guest User',
        role: localStorage.getItem('user_role') || 'Member',
        avatar: localStorage.getItem('user_avatar') || ''
    };

    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [reqs, temps] = await Promise.all([
                getRequests(),
                getTemplates()
            ]);
            setRequests(reqs);
            setTemplates(temps);
        } catch (err) {
            console.error("Failed to fetch approval data:", err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 10000); // Auto refresh silently every 10s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const openId = localStorage.getItem('open_request_id');
        if (openId && requests.length > 0) {
            const req = requests.find(r => r.id === openId);
            if (req) {
                setSelectedRequest(req);
                setIsDetailModalOpen(true);
                localStorage.removeItem('open_request_id');
            }
        }
    }, [requests]);

    const handleSelectRequest = (req: ApprovalRequest) => {
        setSelectedRequest(req);
        setIsDetailModalOpen(true);
    };

    const handleCreateSuccess = () => {
        fetchData();
        setIsCreateModalOpen(false);
    };

    const handleUpdateSuccess = () => {
        fetchData();
        // Detail modal closes automatically or stays open? Let's close it for now.
        setIsDetailModalOpen(false);
    };

    // Mobile state
    const [mobileStatusFilter, setMobileStatusFilter] = useState<string>('all');

    const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
        'all': { label: 'Semua', color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400' },
        'Draft': { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400' },
        'Pending': { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
        'Approved': { label: 'Disetujui', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
        'Rejected': { label: 'Ditolak', color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
        'Returned': { label: 'Dikembalikan', color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-500' },
    };

    const filteredMobileRequests = mobileStatusFilter === 'all'
        ? requests
        : requests.filter(r => r.status === mobileStatusFilter);

    return (
        <>
        {/* ═══ MOBILE VIEW ═══ */}
        <div className="block md:hidden flex flex-col h-full pb-24 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 sticky top-0 z-40 bg-background py-2">
                <div>
                    <h2 className="text-base font-black text-foreground font-heading">{config?.page_titles?.['approval']?.title || 'Approval'}</h2>
                    <p className="text-[10px] text-mutedForeground">{requests.length} pengajuan</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-xl text-xs font-bold">
                    <Plus size={14} /> Buat
                </button>
            </div>

            {/* Status Filter Tabs - ClickUp/Lark style */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-3 flex-shrink-0">
                {Object.entries(statusConfig).map(([status, cfg]) => {
                    const count = status === 'all' ? requests.length : requests.filter(r => r.status === status).length;
                    return (
                        <button key={status} onClick={() => setMobileStatusFilter(status)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border transition-all ${mobileStatusFilter === status ? 'bg-foreground text-background border-foreground' : `${cfg.bg} ${cfg.color} border-transparent`}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                            <span className={`text-[8px] font-black px-1 py-0.5 rounded-full ${mobileStatusFilter === status ? 'bg-white/20' : 'bg-black/10'}`}>{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Request List */}
            <div className="flex-1 overflow-y-auto space-y-2">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredMobileRequests.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
                        <CheckCircle size={28} className="text-accent/40 mx-auto mb-2" />
                        <p className="text-sm font-bold text-foreground mb-1">Belum ada pengajuan</p>
                        <button onClick={() => setIsCreateModalOpen(true)}
                            className="mt-2 px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold">
                            + Buat Pengajuan
                        </button>
                    </div>
                ) : (
                    filteredMobileRequests.map(req => {
                        const cfg = statusConfig[req.status] || statusConfig['Draft'];
                        const templateName = req.template?.name || 'Pengajuan';
                        const stepCount = req.template?.workflow_steps?.length || 0;
                        const currentStep = req.current_step_index || 0;
                        const progress = stepCount > 0 ? Math.round((currentStep / stepCount) * 100) : 0;
                        return (
                            <button key={req.id} onClick={() => handleSelectRequest(req)}
                                className="w-full bg-card border border-border rounded-2xl p-3 text-left active:scale-[0.99] transition-transform hover:border-accent">
                                {/* Top row: template name + status badge */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-foreground truncate">{templateName}</p>
                                        <p className="text-[9px] text-mutedForeground mt-0.5">
                                            {req.form_data?.title || req.form_data?.name || Object.values(req.form_data || {})[0] || 'Tanpa judul'}
                                        </p>
                                    </div>
                                    <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${cfg.bg} ${cfg.color}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                        {cfg.label}
                                    </span>
                                </div>

                                {/* Progress bar */}
                                {stepCount > 0 && (
                                    <div className="mb-2">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-[8px] font-bold text-mutedForeground">Step {currentStep}/{stepCount}</span>
                                            <span className="text-[8px] font-bold text-mutedForeground">{progress}%</span>
                                        </div>
                                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                )}

                                {/* Bottom row: requester + date */}
                                <div className="flex items-center gap-2">
                                    {req.requester_avatar ? (
                                        <img src={req.requester_avatar} alt="" className="w-5 h-5 rounded-full border border-border object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[8px] font-black text-accent">{req.requester_name?.charAt(0) || '?'}</span>
                                        </div>
                                    )}
                                    <span className="text-[9px] font-bold text-mutedForeground truncate flex-1">{req.requester_name}</span>
                                    <span className="text-[9px] text-mutedForeground flex-shrink-0">
                                        {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>

        {/* ═══ DESKTOP VIEW ═══ */}
        <div className="hidden md:flex space-y-4 sm:space-y-5 md:space-y-6 flex-1 flex-col min-h-0">
            {/* Desktop Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 sm:gap-3 md:gap-4 pb-1 sm:pb-2 shrink-0">
                <div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground font-heading tracking-tight flex items-center gap-2 sm:gap-3">
                        {config?.page_titles?.['approval']?.title || 'Team Approval Section'}
                    </h2>
                    <p className="text-slate-500 font-medium mt-1.5 sm:mt-2 text-xs sm:text-sm md:text-base">
                        {config?.page_titles?.['approval']?.subtitle || 'Kelola pengajuan dan persetujuan dengan alur kerja dinamis.'}
                    </p>
                </div>
                <div className="flex gap-2 sm:gap-3 w-full md:w-auto">
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-accent text-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:shadow-[6px_6px_0px_0px_#0f172a] hover:-translate-y-1 transition-all flex-1 md:flex-none text-xs sm:text-sm md:text-base"
                        icon={<Plus size={14} className="sm:w-4.5 sm:h-4.5 md:w-[18px] md:h-[18px]" />}
                    >
                        Buat Pengajuan
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0 flex flex-col">
                <ApprovalInbox
                    requests={requests}
                    onSelectRequest={handleSelectRequest}
                    loading={loading}
                />
            </div>

            {/* Modals */}
            <ApprovalDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                request={selectedRequest}
                currentUser={currentUser}
                onUpdate={handleUpdateSuccess}
            />

            <CreateRequestModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                templates={templates}
                currentUser={currentUser}
                onSuccess={handleCreateSuccess}
            />

            {/* SQL Setup Modal */}
            <Modal isOpen={isSqlModalOpen} onClose={() => setIsSqlModalOpen(false)} title="Database Setup (SQL)" maxWidth="max-w-3xl">
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-100 text-blue-800 flex gap-3">
                        <Code size={24} className="shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-lg">Instruksi Setup</h4>
                            <p className="text-sm">
                                Fitur ini membutuhkan tabel baru di Supabase. Salin kode SQL di bawah ini dan jalankan di
                                <a href="https://supabase.com/dashboard/project/_/sql" target="_blank" rel="noreferrer" className="font-bold underline ml-1">
                                    Supabase SQL Editor
                                </a>.
                            </p>
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="absolute top-3 right-3 flex gap-2">
                            <button
                                onClick={() => { navigator.clipboard.writeText(APPROVAL_SQL_SCRIPT); alert("SQL Copied!"); }}
                                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-md flex items-center gap-2 transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Copy size={14} /> Salin SQL
                            </button>
                        </div>
                        <textarea
                            readOnly
                            className="w-full h-96 bg-slate-900 text-green-400 font-mono text-xs p-4 rounded-xl border-2 border-slate-700 outline-none resize-none custom-scrollbar"
                            value={APPROVAL_SQL_SCRIPT}
                        />
                    </div>
                </div>
            </Modal>
        </div>
        </>
    );
};
