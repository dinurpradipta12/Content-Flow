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

    return (
        <div className="space-y-4 sm:space-y-5 md:space-y-6 flex-1 flex flex-col min-h-0">
            {/* Mobile Header */}
            <div className="flex md:hidden items-center justify-between pb-2 border-b border-border shrink-0">
                <div>
                    <h2 className="text-base font-black text-foreground font-heading">{config?.page_titles?.['approval']?.title || 'Approval'}</h2>
                    <p className="text-[10px] text-mutedForeground">{requests.length} pengajuan</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-xl text-xs font-bold">
                    <Plus size={14} /> Buat
                </button>
            </div>

            {/* Desktop Header */}
            <div className="hidden md:flex flex-col md:flex-row justify-between items-start md:items-end gap-2 sm:gap-3 md:gap-4 pb-1 sm:pb-2 shrink-0">
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
    );
};
