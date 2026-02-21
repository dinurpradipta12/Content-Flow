import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ApprovalRequest, ApprovalLog } from '../../types/approval';
import { getLogs, processApproval } from '../../services/approvalService';
import { 
    CheckCircle, 
    XCircle, 
    CornerUpLeft, 
    User, 
    Clock, 
    FileText, 
    ExternalLink,
    Image as ImageIcon,
    X,
    ChevronLeft,
    ChevronRight,
    Download,
    Send,
    Paperclip
} from 'lucide-react';

interface ApprovalDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: ApprovalRequest | null;
    currentUser: any;
    onUpdate: () => void;
}

export const ApprovalDetailModal: React.FC<ApprovalDetailModalProps> = ({ isOpen, onClose, request, currentUser, onUpdate }) => {
    const [logs, setLogs] = useState<ApprovalLog[]>([]);
    const [comment, setComment] = useState('');
    const [actionLoading, setActionLoading] = useState<'Approve' | 'Reject' | 'Return' | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    
    // Action Note Popover State
    const [activeAction, setActiveAction] = useState<'Approve' | 'Reject' | 'Return' | null>(null);

    // Preview Modal State
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [currentPreviewIndex, setCurrentPreviewIndex] = useState<number>(0);
    const [previewPdf, setPreviewPdf] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && request) {
            fetchLogs();
            setActiveAction(null);
            setComment('');
            setChatInput('');
            setSelectedFile(null);
            setPreviewImages([]);
            setPreviewPdf(null);
        }
    }, [isOpen, request]);

    const fetchLogs = async () => {
        if (!request) return;
        try {
            const data = await getLogs(request.id);
            setLogs(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleActionSubmit = async () => {
        if (!request || !activeAction) return;
        if (!comment && activeAction !== 'Approve') {
            alert("Harap berikan komentar/alasan untuk penolakan atau pengembalian.");
            return;
        }
        
        setActionLoading(activeAction);
        try {
            await processApproval(request, activeAction, comment, currentUser);
            onUpdate();
            // We don't close the modal automatically so user can see the updated status
            setActiveAction(null);
            setComment('');
            fetchLogs(); // Refresh logs
        } catch (err) {
            console.error(err);
            alert("Gagal memproses approval.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleSendChat = async () => {
        if ((!chatInput.trim() && !selectedFile) || !request) return;
        // In a real app, this would save a comment-only log to the database
        // For now, we'll just simulate adding it to the local state
        const newLog: ApprovalLog = {
            id: `temp-${Date.now()}`,
            request_id: request.id,
            step_name: 'Komentar',
            user_id: currentUser.id,
            user_name: currentUser.full_name || currentUser.username,
            action: 'Comment',
            comment: chatInput,
            attachment: selectedFile ? selectedFile.name : undefined,
            created_at: new Date().toISOString()
        };
        setLogs(prev => [...prev, newLog]);
        setChatInput('');
        setSelectedFile(null);
    };

    if (!request) return null;

    const steps = request.template?.workflow_steps || [];
    
    // Determine Header Color based on Status
    const getStatusBgColor = () => {
        switch (request.status) {
            case 'Approved': return 'bg-green-400';
            case 'Rejected': return 'bg-red-400';
            case 'Pending': return 'bg-yellow-400';
            case 'Returned': return 'bg-orange-400';
            default: return 'bg-slate-200';
        }
    };

    const openImagePreview = (index: number, total: number) => {
        // Mocking images for preview based on the number of files
        const images = Array.from({ length: total }).map((_, i) => `https://picsum.photos/seed/${request.id}-${i}/1200/800`);
        setPreviewImages(images);
        setCurrentPreviewIndex(index);
    };

    const openPdfPreview = (fileName: string) => {
        // Mocking PDF preview
        setPreviewPdf(fileName);
    };

    // Helper to render files
    const renderFiles = () => {
        const filesString = request.form_data.content_files || request.form_data.script_file;
        const linkString = request.form_data.script_link;

        if (!filesString && !linkString) {
            return <p className="text-slate-500 font-bold italic">Tidak ada lampiran.</p>;
        }

        return (
            <div className="space-y-4">
                {/* Link */}
                {linkString && (
                    <div className="flex items-center justify-between p-4 bg-blue-50 border-4 border-slate-900 rounded-xl">
                        <div className="flex items-center gap-3">
                            <ExternalLink size={24} className="text-blue-600" />
                            <span className="font-bold text-slate-900 truncate max-w-[200px] md:max-w-md">{linkString}</span>
                        </div>
                        <a href={linkString.startsWith('http') ? linkString : `https://${linkString}`} target="_blank" rel="noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-black uppercase text-xs border-2 border-slate-900 hover:-translate-y-1 transition-transform">
                            Buka Link
                        </a>
                    </div>
                )}

                {/* Files */}
                {filesString && (
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {/* Mocking file display based on string content */}
                        {filesString.includes('.jpg') || filesString.includes('.png') ? (
                            // Mock Images
                            Array.from({ length: Math.min(5, 15) }).map((_, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => openImagePreview(i, Math.min(5, 15))}
                                    className="shrink-0 w-32 h-32 bg-slate-200 border-4 border-slate-900 rounded-xl overflow-hidden cursor-pointer hover:-translate-y-2 transition-transform shadow-[4px_4px_0px_0px_#0f172a]"
                                >
                                    <img src={`https://picsum.photos/seed/${request.id}-${i}/200/200`} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            ))
                        ) : (
                            // PDF or other
                            <div className="flex items-center gap-3 p-4 bg-red-50 border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a]">
                                <FileText size={32} className="text-red-600" />
                                <div>
                                    <p className="font-black text-slate-900">Dokumen PDF</p>
                                    <p className="text-xs font-bold text-slate-500">{filesString.replace('[File: ', '').replace(']', '')}</p>
                                </div>
                                <Button onClick={() => openPdfPreview(filesString)} className="ml-4 bg-red-500 text-white border-2 border-slate-900">Preview</Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-7xl" hideHeader>
                {/* Custom Header Area */}
                <div className={`p-6 md:p-8 border-b-4 border-slate-900 flex flex-col md:flex-row justify-between items-start gap-6 ${getStatusBgColor()}`}>
                    <div className="flex-1">
                        {/* Status Badge */}
                        <div className="inline-block px-4 py-1.5 rounded-full border-4 border-slate-900 font-black text-sm uppercase mb-6 bg-white shadow-[4px_4px_0px_0px_#0f172a]">
                            Status: {request.status}
                        </div>
                        
                        {/* PIC Info */}
                        <div className="flex items-center gap-3 mb-6 bg-white/50 w-fit pr-6 rounded-full border-2 border-slate-900">
                            {request.requester_avatar ? (
                                <img src={request.requester_avatar} className="w-10 h-10 rounded-full border-r-2 border-slate-900 object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-100 border-r-2 border-slate-900 flex items-center justify-center">
                                    <User size={20} />
                                </div>
                            )}
                            <p className="font-bold text-slate-900 text-sm">
                                <span className="font-black">{request.requester_name}</span> telah mengajukan permohonan baru
                            </p>
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl md:text-5xl font-black font-heading text-slate-900 uppercase tracking-tight mb-6 leading-none">
                            {request.form_data.judul_konten || request.template?.name || 'Untitled Request'}
                        </h1>

                        {/* Sub Info */}
                        <div className="flex flex-wrap gap-4 text-sm font-bold text-slate-900">
                            <div className="bg-white/60 px-3 py-1.5 rounded-lg border-2 border-slate-900">
                                <span className="opacity-60 uppercase text-[10px] block leading-none mb-1">Pillar</span>
                                {request.form_data.pillar || '-'}
                            </div>
                            <div className="bg-white/60 px-3 py-1.5 rounded-lg border-2 border-slate-900">
                                <span className="opacity-60 uppercase text-[10px] block leading-none mb-1">Platform</span>
                                {request.form_data.platform || '-'}
                            </div>
                            {request.form_data.objective && (
                                <div className="bg-white/60 px-3 py-1.5 rounded-lg border-2 border-slate-900">
                                    <span className="opacity-60 uppercase text-[10px] block leading-none mb-1">Objective</span>
                                    {request.form_data.objective}
                                </div>
                            )}
                            <div className="bg-white/60 px-3 py-1.5 rounded-lg border-2 border-slate-900">
                                <span className="opacity-60 uppercase text-[10px] block leading-none mb-1">Tgl Posting</span>
                                {request.form_data.tanggal_posting ? new Date(request.form_data.tanggal_posting).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '-'}
                            </div>
                        </div>
                    </div>

                    {/* Workspace Label */}
                    <div className="bg-white border-4 border-slate-900 p-4 rounded-2xl transform rotate-2 shadow-[8px_8px_0px_0px_#0f172a] shrink-0 min-w-[200px]">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Workspace</p>
                        <p className="text-2xl font-black text-accent leading-tight">{request.form_data.workspace || '-'}</p>
                    </div>
                </div>

                {/* Body Area */}
                <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 bg-[#FFFDF5]">
                    
                    {/* Left Column: Files & Timeline */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Content Files */}
                        <div className="bg-white border-4 border-slate-900 rounded-2xl p-6 shadow-[8px_8px_0px_0px_#0f172a]">
                            <h3 className="font-black text-2xl mb-6 uppercase tracking-tight flex items-center gap-3">
                                <ImageIcon size={28} className="text-accent" /> Lampiran Konten
                            </h3>
                            {renderFiles()}
                        </div>

                        {/* Timeline Lark Style */}
                        <div className="bg-white border-4 border-slate-900 rounded-2xl p-6 shadow-[8px_8px_0px_0px_#0f172a]">
                            <h3 className="font-black text-2xl mb-6 uppercase tracking-tight flex items-center gap-3">
                                <Clock size={28} className="text-accent" /> Timeline Approval
                            </h3>
                            <div className="space-y-6">
                                {/* Submit Step */}
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-slate-900 flex items-center justify-center shrink-0 mt-1">
                                        <CheckCircle size={16} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-slate-900">Submit</h4>
                                                <p className="text-sm text-slate-600">{request.requester_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-bold text-blue-600">Submitted</span>
                                                <p className="text-xs text-slate-500">{new Date(request.created_at).toLocaleString('id-ID')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Workflow Steps */}
                                {steps.map((step, index) => {
                                    const log = logs.find(l => l.step_name === step.name);
                                    const isCurrent = index === request.current_step_index && request.status === 'Pending';
                                    const isCompleted = index < request.current_step_index || request.status === 'Approved';
                                    
                                    return (
                                        <div key={step.id} className="flex items-start gap-4 relative">
                                            {/* Connecting Line */}
                                            <div className="absolute left-4 top-[-24px] bottom-8 w-0.5 bg-slate-200 -z-10"></div>
                                            
                                            <div className={`w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center shrink-0 mt-1 ${
                                                isCompleted ? 'bg-green-100' : isCurrent ? 'bg-yellow-100 animate-pulse' : 'bg-slate-100'
                                            }`}>
                                                {isCompleted ? <CheckCircle size={16} className="text-green-600" /> : 
                                                 isCurrent ? <div className="w-2 h-2 bg-yellow-600 rounded-full"></div> : 
                                                 <Clock size={16} className="text-slate-400" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-slate-900">{step.name}</h4>
                                                        <p className="text-sm text-slate-600">{log ? log.user_name : step.approver_role}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        {log ? (
                                                            <>
                                                                <span className={`text-sm font-bold ${
                                                                    log.action === 'Approve' ? 'text-green-600' :
                                                                    log.action === 'Reject' ? 'text-red-600' : 'text-orange-600'
                                                                }`}>{log.action}</span>
                                                                <p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString('id-ID')}</p>
                                                            </>
                                                        ) : (
                                                            <span className="text-sm font-bold text-slate-400 italic">Pending</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {log?.comment && (
                                                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border-2 border-slate-200 text-sm italic text-slate-700">
                                                        "{log.comment}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* End Step */}
                                {request.status === 'Approved' && (
                                    <div className="flex items-start gap-4 relative">
                                        <div className="absolute left-4 top-[-24px] bottom-8 w-0.5 bg-slate-200 -z-10"></div>
                                        <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-slate-900 flex items-center justify-center shrink-0 mt-1">
                                            <CheckCircle size={16} className="text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-slate-900">End</h4>
                                                <span className="text-sm font-bold text-green-600">Disetujui Sepenuhnya</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="space-y-8">
                        {/* Comments / Activity Section */}
                        <div className="bg-white border-4 border-slate-900 rounded-2xl p-6 shadow-[8px_8px_0px_0px_#0f172a] flex flex-col h-[500px]">
                            <h3 className="font-black text-xl mb-4 uppercase tracking-tight border-b-4 border-slate-900 pb-2 shrink-0">Komentar & Aktivitas</h3>
                            
                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 mb-4">
                                {logs.filter(l => l.comment).map(log => {
                                    const isMe = log.user_id === currentUser?.id;
                                    return (
                                        <div key={log.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-slate-900 flex items-center justify-center shrink-0 overflow-hidden shadow-[2px_2px_0px_0px_#0f172a]">
                                                {log.user_avatar ? (
                                                    <img src={log.user_avatar} alt={log.user_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={18} className="text-slate-500" />
                                                )}
                                            </div>
                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className="font-black text-xs text-slate-900 uppercase tracking-tight">{isMe ? 'Anda' : log.user_name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">{new Date(log.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}</span>
                                                </div>
                                                <div className={`p-3 rounded-2xl border-2 border-slate-900 text-sm font-bold shadow-[4px_4px_0px_0px_#0f172a] ${
                                                    isMe ? 'bg-yellow-100 rounded-tr-none' : 'bg-white rounded-tl-none'
                                                }`}>
                                                    {log.comment}
                                                    {log.attachment && (
                                                        <div className="mt-2 pt-2 border-t border-slate-900/10 flex items-center gap-2 text-accent cursor-pointer hover:underline">
                                                            <FileText size={14} />
                                                            <span className="text-xs truncate">{log.attachment}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {logs.filter(l => l.comment).length === 0 && (
                                    <div className="h-full flex items-center justify-center">
                                        <p className="text-sm text-slate-400 italic font-bold">Belum ada komentar.</p>
                                    </div>
                                )}
                            </div>

                            {/* Chat Input */}
                            <div className="shrink-0 flex flex-col gap-2">
                                {selectedFile && (
                                    <div className="flex items-center justify-between bg-slate-100 p-2 rounded-lg border border-slate-300">
                                        <div className="flex items-center gap-2 text-sm text-slate-700 truncate">
                                            <Paperclip size={14} />
                                            <span className="truncate">{selectedFile.name}</span>
                                        </div>
                                        <button onClick={() => setSelectedFile(null)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input 
                                            type="text" 
                                            placeholder="Tulis komentar..." 
                                            className="w-full border-4 border-slate-900 rounded-xl pl-4 pr-12 py-3 font-bold text-sm focus:outline-none focus:bg-yellow-50 transition-colors shadow-[4px_4px_0px_0px_#0f172a]"
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                                        />
                                        <label className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-accent transition-colors p-1 hover:bg-slate-100 rounded-lg">
                                            <Paperclip size={20} />
                                            <input type="file" className="hidden" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) setSelectedFile(file);
                                            }} />
                                        </label>
                                    </div>
                                    <button 
                                        onClick={handleSendChat}
                                        className="bg-accent text-white p-4 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#0f172a] transition-all"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {request.status === 'Pending' && (
                            <div className="bg-white border-4 border-slate-900 rounded-2xl p-6 shadow-[8px_8px_0px_0px_#0f172a] sticky top-6">
                                <h3 className="font-black text-xl mb-4 uppercase tracking-tight border-b-4 border-slate-900 pb-2">Aksi</h3>
                                
                                <div className="flex flex-col gap-3 relative">
                                    
                                    <Button 
                                        onClick={() => setActiveAction('Approve')} 
                                        className="bg-green-400 text-slate-900 border-4 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:shadow-[4px_4px_0px_0px_#0f172a] py-2 text-sm uppercase tracking-widest w-full justify-center"
                                    >
                                        Approve
                                    </Button>
                                    <Button 
                                        onClick={() => setActiveAction('Reject')} 
                                        className="bg-red-400 text-slate-900 border-4 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:shadow-[4px_4px_0px_0px_#0f172a] py-2 text-sm uppercase tracking-widest w-full justify-center"
                                    >
                                        Reject
                                    </Button>
                                    <Button 
                                        onClick={() => setActiveAction('Return')} 
                                        className="bg-orange-400 text-slate-900 border-4 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:shadow-[4px_4px_0px_0px_#0f172a] py-2 text-sm uppercase tracking-widest w-full justify-center"
                                    >
                                        Return
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Action Note Modal */}
            <Modal 
                isOpen={!!activeAction} 
                onClose={() => { setActiveAction(null); setComment(''); }} 
                title={`Catatan ${activeAction}`}
                maxWidth="max-w-md"
            >
                <div className="space-y-4">
                    <p className="font-black uppercase text-sm text-slate-600">Berikan alasan atau catatan untuk aksi ini:</p>
                    <textarea 
                        className="w-full border-4 border-slate-900 p-3 rounded-xl font-bold focus:outline-none focus:bg-yellow-50 transition-colors resize-none text-sm shadow-[4px_4px_0px_0px_#0f172a]" 
                        rows={4}
                        placeholder="Tambahkan catatan..."
                        value={comment} 
                        onChange={e => setComment(e.target.value)} 
                    />
                    <div className="flex gap-3 pt-2">
                        <Button 
                            onClick={handleActionSubmit} 
                            isLoading={actionLoading === activeAction}
                            className={`flex-1 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] py-3 text-sm uppercase tracking-widest ${
                                activeAction === 'Approve' ? 'bg-green-500' :
                                activeAction === 'Reject' ? 'bg-red-500' : 'bg-orange-500'
                            } text-white`}
                        >
                            Konfirmasi
                        </Button>
                        <Button 
                            onClick={() => { setActiveAction(null); setComment(''); }} 
                            className="flex-1 bg-red-600 text-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] py-3 text-sm uppercase tracking-widest hover:bg-red-700"
                        >
                            Batal
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Image Preview Modal */}
            {previewImages.length > 0 && createPortal(
                <div className="fixed inset-0 z-[20000] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
                    {/* Top Actions */}
                    <div className="absolute top-4 right-4 flex gap-4 z-10">
                        <button 
                            className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = previewImages[currentPreviewIndex];
                                link.download = `image-${currentPreviewIndex}.jpg`;
                                link.click();
                            }}
                        >
                            <Download size={24} />
                        </button>
                        <button 
                            className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                            onClick={() => setPreviewImages([])}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Navigation */}
                    {previewImages.length > 1 && (
                        <>
                            <button 
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10"
                                onClick={() => setCurrentPreviewIndex(prev => prev === 0 ? previewImages.length - 1 : prev - 1)}
                            >
                                <ChevronLeft size={32} />
                            </button>
                            <button 
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10"
                                onClick={() => setCurrentPreviewIndex(prev => prev === previewImages.length - 1 ? 0 : prev + 1)}
                            >
                                <ChevronRight size={32} />
                            </button>
                        </>
                    )}

                    {/* Image Container */}
                    <div className="relative w-full h-full max-w-6xl max-h-[90vh] flex items-center justify-center">
                        <img 
                            src={previewImages[currentPreviewIndex]} 
                            alt={`Preview ${currentPreviewIndex + 1}`} 
                            className="max-w-full max-h-full object-contain border-8 border-white rounded-xl shadow-2xl animate-in fade-in zoom-in duration-300" 
                        />
                        
                        {/* Counter */}
                        {previewImages.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full font-bold tracking-widest text-sm backdrop-blur-md">
                                {currentPreviewIndex + 1} / {previewImages.length}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* PDF Preview Modal */}
            {previewPdf && createPortal(
                <div className="fixed inset-0 z-[20000] bg-black/90 flex items-center justify-center p-4 md:p-12 backdrop-blur-md">
                    {/* Top Actions */}
                    <div className="absolute top-4 right-4 flex gap-4 z-10">
                        <button 
                            className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                            onClick={() => {
                                alert("Download PDF: " + previewPdf);
                            }}
                        >
                            <Download size={24} />
                        </button>
                        <button 
                            className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                            onClick={() => setPreviewPdf(null)}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* PDF Container */}
                    <div className="w-full h-full max-w-5xl bg-white rounded-xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                        <div className="bg-slate-100 p-4 border-b-2 border-slate-200 flex items-center gap-3 shrink-0">
                            <FileText size={24} className="text-red-500" />
                            <span className="font-bold text-slate-800 truncate">{previewPdf.replace('[File: ', '').replace(']', '')}</span>
                        </div>
                        <div className="flex-1 bg-slate-200 w-full h-full relative">
                            {/* In a real app, this would be the actual URL to the PDF. 
                                For demo purposes, we'll use a placeholder PDF URL if available, 
                                or just a styled iframe that looks like a PDF viewer. */}
                            <iframe 
                                src={`https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf#toolbar=0`} 
                                className="absolute inset-0 w-full h-full border-none"
                                title="PDF Preview"
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
