import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ApprovalRequest, ApprovalLog } from '../../types/approval';
import { getLogs, processApproval } from '../../services/approvalService';
import { supabase } from '../../services/supabaseClient';
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
    Paperclip,
    Bell,
    Smile,
    Reply
} from 'lucide-react';
import { useNotifications } from '../../components/NotificationProvider';

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

    // Side Preview States (Side-by-side)
    const [isSidePreviewOpen, setIsSidePreviewOpen] = useState(false);
    const [sidePreviewUrl, setSidePreviewUrl] = useState<string | null>(null);
    const [sidePreviewType, setSidePreviewType] = useState<'image' | 'pdf'>('pdf');
    const [sidePreviewTitle, setSidePreviewTitle] = useState('');

    const { sendNotification } = useNotifications();
    const [allAppUsers, setAllAppUsers] = useState<{ id: string, name: string }[]>([]);
    const [targetApproverId, setTargetApproverId] = useState<string>('');
    const [sendingReminder, setSendingReminder] = useState(false);

    useEffect(() => {
        if (isOpen && request) {
            fetchLogs();
            fetchAppUsers();
            setActiveAction(null);
            setComment('');
            setChatInput('');
            setSelectedFile(null);
            setIsSidePreviewOpen(false);
            setSidePreviewUrl(null);

            // Subscribe to real-time logs
            const channel = supabase
                .channel(`approval_logs:${request.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'approval_logs',
                        filter: `request_id=eq.${request.id}`
                    },
                    () => {
                        fetchLogs();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [isOpen, request]);

    const fetchAppUsers = async () => {
        if (!request) return;

        // 1. Fetch all potentially relevant users
        const { data: userData } = await supabase.from('app_users').select('id, full_name, avatar_url');
        if (!userData) return;

        // 2. Get workspace name from request form data
        const wsName = request.form_data.workspace;

        if (wsName) {
            // 3. Fetch workspace to get its member list (avatar URLs)
            const { data: wsData } = await supabase
                .from('workspaces')
                .select('members')
                .eq('name', wsName)
                .single();

            if (wsData && wsData.members) {
                const members = wsData.members;
                const filtered = userData
                    .filter(u => members.includes(u.avatar_url))
                    .map(u => ({ id: u.id, name: u.full_name, avatar: u.avatar_url }));
                setAllAppUsers(filtered);
                return;
            }
        }

        // Fallback or if no workspace name found, show all (though per requirement we should ideally filter)
        setAllAppUsers(userData.map(u => ({ id: u.id, name: u.full_name, avatar: u.avatar_url })));
    };

    const notifyByMention = async (text: string, sourceTitle: string) => {
        if (!text) return;

        const mentionedIds = new Set<string>();

        // 1. Traditional @mentions
        if (text.includes('@')) {
            const mentions = text.match(/@\[([^\]]+)\]|@(\w+)/g);
            if (mentions) {
                const names = mentions.map(m => m.startsWith('@[') ? m.slice(2, -1) : m.slice(1));
                for (const name of names) {
                    const user = allAppUsers.find(u => u.name === name);
                    if (user) mentionedIds.add(user.id);
                }
            }
        }

        // 2. Scan for full names (even without @) - Global mentioning
        allAppUsers.forEach(user => {
            if (user.name && text.toLowerCase().includes(user.name.toLowerCase())) {
                mentionedIds.add(user.id);
            }
        });

        // Send notifications
        for (const userId of Array.from(mentionedIds)) {
            await sendNotification({
                recipientId: userId,
                type: 'MENTION',
                title: 'Anda disebut dalam Approval',
                content: `menyebut Anda dalam diskusi approval: ${sourceTitle}`,
                metadata: { request_id: request.id }
            });
        }
    };

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

            // 1. Notify Requester with personalized message
            if (request.requester_id !== currentUser.id) {
                const formTitle = request.form_data.judul_konten || request.template?.name || 'Untitled';
                const approverName = currentUser.name || currentUser.full_name || 'Seseorang';

                let notifTitle = '';
                let notifContent = '';

                if (activeAction === 'Approve') {
                    notifTitle = '🎉 Pengajuan Disetujui!';
                    notifContent = `Yeay, pengajuan "${formTitle}" kamu sudah di approve sama ${approverName}, nih!`;
                } else if (activeAction === 'Reject') {
                    notifTitle = '❌ Pengajuan Ditolak';
                    notifContent = `Yah, pengajuan "${formTitle}" kamu ditolak sama ${approverName}. Cek catatannya ya!`;
                } else if (activeAction === 'Return') {
                    notifTitle = '🔄 Pengajuan Dikembalikan';
                    notifContent = `Pengajuan "${formTitle}" kamu dikembalikan oleh ${approverName} untuk diperbaiki.`;
                }

                await sendNotification({
                    recipientId: request.requester_id,
                    type: activeAction === 'Approve' ? 'CONTENT_APPROVED' : 'CONTENT_REVISION',
                    title: notifTitle,
                    content: notifContent,
                    metadata: { request_id: request.id, show_popup: true, hide_actor_name: true }
                });
            }

            // 2. Notify Mentions in comment
            if (comment) {
                await notifyByMention(comment, request.form_data.judul_konten || 'Untitled');
            }

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

        // Notify Mentions in chat
        await notifyByMention(chatInput, request.form_data.judul_konten || 'Untitled');

        setChatInput('');
        setSelectedFile(null);
    };

    const handleSendReminder = async () => {
        if (!targetApproverId || !request) return;
        setSendingReminder(true);
        try {
            const targetUser = allAppUsers.find(u => u.id === targetApproverId);
            if (!targetUser) return;

            const deadline = request.form_data.tanggal_posting
                ? new Date(request.form_data.tanggal_posting).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'secepatnya';

            await sendNotification({
                recipientId: targetApproverId,
                type: 'CONTENT_APPROVAL',
                title: 'Pengajuan Approval Baru',
                content: `${request.requester_name} telah mengajukan permintaan ${request.template?.name || 'Konten'} ke kamu, segera cek sebelum ${deadline}`,
                metadata: { request_id: request.id }
            });

            alert(`Notifikasi telah dikirim ke ${targetUser.name}`);
        } catch (err) {
            console.error(err);
        } finally {
            setSendingReminder(false);
        }
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

    const openImagePreview = (title: string, url: string) => {
        setSidePreviewUrl(url);
        setSidePreviewType('image');
        setSidePreviewTitle(title);
        setIsSidePreviewOpen(true);
    };

    const openPdfPreview = (fileName: string) => {
        // Detect if it's a data URI (Base64)
        const dataUriMatch = fileName.match(/data:application\/pdf;base64,[^\s\)]+/);
        if (dataUriMatch) {
            setSidePreviewUrl(dataUriMatch[0]);
            setSidePreviewType('pdf');
            const nameMatch = fileName.match(/\[(.*?)\]/);
            setSidePreviewTitle(nameMatch ? nameMatch[1] : 'PDF Document');
            setIsSidePreviewOpen(true);
            return;
        }

        // Find if there's a real URL in the string (Supabase storage or other)
        const urlMatch = fileName.match(/https?:\/\/[^\s\)]+/);
        let url = urlMatch ? urlMatch[0] : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

        // Use Google Docs Viewer to bypass X-Frame-Options (Refused to connect)
        const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

        setSidePreviewUrl(viewerUrl);
        setSidePreviewType('pdf');
        setSidePreviewTitle(fileName.replace('[File: ', '').replace(']', '').split('](')[0]);
        setIsSidePreviewOpen(true);
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
                        {(() => {
                            const files: { name: string, url: string }[] = [];
                            const matches = filesString.matchAll(/\[(.*?)\]\((.*?)\)/g);
                            for (const match of matches) {
                                files.push({ name: match[1], url: match[2] });
                            }

                            if (files.length === 0) {
                                // Fallback for old data or single file without full markdown might still be there
                                const singleMatch = filesString.match(/\[File: (.*?)\]/);
                                const name = singleMatch ? singleMatch[1] : 'File';
                                return (
                                    <div className="flex items-center gap-3 p-4 bg-red-50 border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a]">
                                        <FileText size={32} className="text-red-600" />
                                        <div>
                                            <p className="font-black text-slate-900">Dokumen PDF</p>
                                            <p className="text-xs font-bold text-slate-500">{name}</p>
                                        </div>
                                        <Button onClick={() => openPdfPreview(filesString)} className="ml-4 bg-red-500 text-white border-2 border-slate-900">Preview</Button>
                                    </div>
                                );
                            }

                            return files.map((file, i) => {
                                const isImage = file.url.startsWith('data:image') || file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                const isPdf = file.url.startsWith('data:application/pdf') || file.name.endsWith('.pdf');

                                if (isImage) {
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => openImagePreview(file.name, file.url)}
                                            className="shrink-0 w-32 h-32 bg-slate-200 border-4 border-slate-900 rounded-xl overflow-hidden cursor-pointer hover:-translate-y-2 transition-transform shadow-[4px_4px_0px_0px_#0f172a]"
                                        >
                                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                        </div>
                                    );
                                }

                                if (isPdf) {
                                    return (
                                        <div key={i} className="flex items-center gap-3 p-4 bg-red-50 border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] shrink-0">
                                            <FileText size={32} className="text-red-600" />
                                            <div>
                                                <p className="font-black text-slate-900">PDF</p>
                                                <p className="text-xs font-bold text-slate-500 truncate max-w-[100px]">{file.name}</p>
                                            </div>
                                            <Button onClick={() => openPdfPreview(`[${file.name}](${file.url})`)} className="ml-2 bg-red-500 text-white border-2 border-slate-900 text-[10px] px-2 h-8">Preview</Button>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] shrink-0">
                                        <FileText size={32} className="text-slate-600" />
                                        <div>
                                            <p className="font-black text-slate-900 text-sm">{file.name}</p>
                                            <a href={file.url} download={file.name} className="text-[10px] text-blue-600 font-bold hover:underline">Download</a>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={() => {
                    onClose();
                    setIsSidePreviewOpen(false);
                }}
                title=""
                maxWidth={isSidePreviewOpen ? "max-w-[47vw]" : "max-w-7xl"}
                hideHeader
                duration={400}
                zIndex={9990}
                overlayClassName={isSidePreviewOpen ? 'bg-slate-900/40 backdrop-blur-none transition-all' : ''}
                className={isSidePreviewOpen ? '-translate-x-[52%] shadow-2xl' : 'translate-x-0'}
            >
                <div className="h-[85vh] overflow-y-auto no-scrollbar">
                    {/* Custom Header Area */}
                    <div className={`p-6 md:p-8 border-b-4 border-slate-900 flex flex-col md:flex-row justify-between items-start gap-6 ${getStatusBgColor()}`}>
                        <div className="flex-1">
                            {/* Status Badge */}
                            <div className="inline-block px-4 py-1.5 rounded-full border-4 border-slate-900 font-black text-sm uppercase mb-6 bg-card text-foreground shadow-[4px_4px_0px_0px_#0f172a]">
                                Status: {request.status}
                            </div>

                            {/* PIC Info */}
                            <div className="flex items-center gap-3 mb-6 bg-card/20 w-fit pr-6 rounded-full border-2 border-slate-900">
                                {request.requester_avatar ? (
                                    <img src={request.requester_avatar} className="w-10 h-10 rounded-full border-r-2 border-slate-900 object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-200 border-r-2 border-slate-900 flex items-center justify-center">
                                        <User size={20} className="text-foreground" />
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
                                <div className="bg-card/40 px-3 py-1.5 rounded-lg border-2 border-slate-900">
                                    <span className="opacity-60 uppercase text-[10px] block leading-none mb-1">Pillar</span>
                                    {request.form_data.pillar || '-'}
                                </div>
                                <div className="bg-card/40 px-3 py-1.5 rounded-lg border-2 border-slate-900">
                                    <span className="opacity-60 uppercase text-[10px] block leading-none mb-1">Platform</span>
                                    {request.form_data.platform || '-'}
                                </div>
                                {request.form_data.objective && (
                                    <div className="bg-card/40 px-3 py-1.5 rounded-lg border-2 border-slate-900">
                                        <span className="opacity-60 uppercase text-[10px] block leading-none mb-1">Objective</span>
                                        {request.form_data.objective}
                                    </div>
                                )}
                                <div className="bg-card/40 px-3 py-1.5 rounded-lg border-2 border-slate-900">
                                    <span className="opacity-60 uppercase text-[10px] block leading-none mb-1">Tgl Posting</span>
                                    {request.form_data.tanggal_posting ? new Date(request.form_data.tanggal_posting).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                </div>
                            </div>
                        </div>

                        {/* Workspace Label */}
                        <div className="bg-card border-4 border-slate-900 p-4 rounded-2xl transform rotate-2 shadow-[8px_8px_0px_0px_#0f172a] shrink-0 min-w-[200px]">
                            <p className="text-xs font-black text-mutedForeground uppercase tracking-widest mb-1">Workspace</p>
                            <p className="text-2xl font-black text-accent leading-tight">{request.form_data.workspace || '-'}</p>
                        </div>
                    </div>

                    {/* Body Area */}
                    <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 bg-background">

                        {/* Left Column: Files & Timeline */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Content Files */}
                            <div className="bg-card border-4 border-slate-900 rounded-2xl p-6 shadow-[8px_8px_0px_0px_#0f172a]">
                                <h3 className="font-black text-2xl mb-6 text-foreground uppercase tracking-tight flex items-center gap-3">
                                    <ImageIcon size={28} className="text-accent" /> Lampiran Konten
                                </h3>
                                {renderFiles()}
                            </div>

                            {/* User Assignment for Approval Notification */}
                            <div className="bg-card border-4 border-slate-900 rounded-2xl p-6 shadow-[8px_8px_0px_0px_#0f172a] mb-8">
                                <h3 className="font-black text-xl mb-4 text-foreground uppercase tracking-tight flex items-center gap-3">
                                    <Bell size={24} className="text-accent" /> Teruskan ke Approver
                                </h3>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <select
                                        value={targetApproverId}
                                        onChange={(e) => setTargetApproverId(e.target.value)}
                                        className="flex-1 bg-card border-4 border-slate-900 rounded-xl px-4 py-3 font-bold text-foreground outline-none focus:ring-4 focus:ring-slate-400/50 appearance-none"
                                    >
                                        <option value="">Pilih Member...</option>
                                        {allAppUsers.map(user => (
                                            <option key={user.id} value={user.id}>{user.name}</option>
                                        ))}
                                    </select>
                                    <Button
                                        onClick={handleSendReminder}
                                        disabled={!targetApproverId || sendingReminder}
                                        className="bg-accent text-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#0f172a] transition-all"
                                    >
                                        {sendingReminder ? 'Mengirim...' : 'Kirim Notifikasi'}
                                    </Button>
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 mt-3 uppercase tracking-widest">
                                    User yang dipilih akan menerima notifikasi untuk mengecek pengajuan ini
                                </p>
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
                                                    <h4 className="font-bold text-foreground">Submit</h4>
                                                    <p className="text-sm text-mutedForeground">{request.requester_name}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-bold text-blue-600">Submitted</span>
                                                    <p className="text-xs text-mutedForeground">{new Date(request.created_at).toLocaleString('id-ID')}</p>
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

                                                <div className={`w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center shrink-0 mt-1 ${isCompleted ? 'bg-green-100' : isCurrent ? 'bg-yellow-100 animate-pulse' : 'bg-slate-100'
                                                    }`}>
                                                    {isCompleted ? <CheckCircle size={16} className="text-green-600" /> :
                                                        isCurrent ? <div className="w-2 h-2 bg-yellow-600 rounded-full"></div> :
                                                            <Clock size={16} className="text-slate-400" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-foreground">{step.name}</h4>
                                                            <p className="text-sm text-mutedForeground">{log ? log.user_name : step.approver_role}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            {log ? (
                                                                <>
                                                                    <span className={`text-sm font-bold ${log.action === 'Approve' ? 'text-green-600' :
                                                                        log.action === 'Reject' ? 'text-red-600' : 'text-orange-600'
                                                                        }`}>{log.action}</span>
                                                                    <p className="text-xs text-mutedForeground">{new Date(log.created_at).toLocaleString('id-ID')}</p>
                                                                </>
                                                            ) : (
                                                                <span className="text-sm font-bold text-mutedForeground italic">Pending</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {log?.comment && (
                                                        <div className="mt-2 p-3 bg-muted rounded-lg border-2 border-slate-200 text-sm italic text-foreground">
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
                                                    <h4 className="font-bold text-foreground">End</h4>
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
                            <div className="bg-background border-4 border-slate-900 rounded-2xl p-6 shadow-[8px_8px_0px_0px_#0f172a] flex flex-col h-[500px]">
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
                                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%] relative group`}>
                                                    <div className="flex items-baseline gap-2 mb-1">
                                                        <span className="font-black text-xs text-foreground uppercase tracking-tight">{isMe ? 'Anda' : log.user_name}</span>
                                                        <span className="text-[10px] font-bold text-mutedForeground">{new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>

                                                    {/* Hover Actions */}
                                                    <div className={`absolute -top-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white border-2 border-slate-900 rounded-lg shadow-hard p-1 flex gap-1 z-10 ${isMe ? 'right-0' : 'left-0'}`}>
                                                        <button className="p-1 hover:bg-yellow-100 rounded text-slate-600 transition-colors" title="Beri Reaksi">
                                                            <Smile size={14} />
                                                        </button>
                                                        <button className="p-1 hover:bg-blue-100 rounded text-slate-600 transition-colors" title="Balas">
                                                            <Reply size={14} />
                                                        </button>
                                                    </div>

                                                    <div className={`p-3 rounded-2xl border-2 border-slate-900 text-sm font-bold shadow-[4px_4px_0px_0px_#0f172a] ${isMe ? 'bg-yellow-400 text-slate-900 rounded-tr-none' : 'bg-card text-foreground rounded-tl-none'
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
                                                className="w-full border-4 border-slate-900 rounded-xl bg-card pl-4 pr-12 py-3 font-bold text-foreground text-sm focus:outline-none focus:bg-slate-500/10 transition-colors shadow-[4px_4px_0px_0px_#0f172a]"
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
                                <div className="bg-card border-4 border-slate-900 rounded-2xl p-6 shadow-[8px_8px_0px_0px_#0f172a] sticky top-6">
                                    <h3 className="font-black text-xl text-foreground mb-4 uppercase tracking-tight border-b-4 border-slate-900 pb-2">Aksi</h3>

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
                    <p className="font-black uppercase text-sm text-mutedForeground">Berikan alasan atau catatan untuk aksi ini:</p>
                    <textarea
                        className="w-full border-4 border-slate-900 bg-card p-3 rounded-xl font-bold text-foreground focus:outline-none focus:bg-slate-500/10 transition-colors resize-none text-sm shadow-[4px_4px_0px_0px_#0f172a]"
                        rows={4}
                        placeholder="Tambahkan catatan..."
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                    />
                    <div className="flex gap-3 pt-2">
                        <Button
                            onClick={handleActionSubmit}
                            isLoading={actionLoading === activeAction}
                            className={`flex-1 border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] py-3 text-sm uppercase tracking-widest ${activeAction === 'Approve' ? 'bg-green-500' :
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

            {/* SIDE PREVIEW MODAL */}
            <Modal
                isOpen={isSidePreviewOpen}
                onClose={() => setIsSidePreviewOpen(false)}
                title={
                    <div className="flex items-center gap-2">
                        <div className="p-1 bg-white/20 rounded">
                            {sidePreviewType === 'pdf' ? <FileText size={18} /> : <ImageIcon size={18} />}
                        </div>
                        <span className="truncate max-w-[300px] font-heading font-black">{sidePreviewTitle}</span>
                    </div>
                }
                maxWidth="max-w-[47vw]"
                duration={400}
                zIndex={10000}
                overlayClassName="bg-transparent pointer-events-none backdrop-blur-0 shadow-none border-none"
                className={`pointer-events-auto shadow-2xl overflow-hidden ${isSidePreviewOpen ? 'translate-x-[52%] opacity-100 wipe-active' : 'translate-x-[52%] opacity-0 wipe-mask'}`}
            >
                <div className="h-[85vh] bg-slate-100 -m-6 md:-m-8 relative overflow-hidden rounded-b-xl flex items-center justify-center">
                    {sidePreviewType === 'pdf' ? (
                        <iframe
                            src={sidePreviewUrl || ''}
                            className="w-full h-full border-none"
                            title="PDF Content"
                        />
                    ) : (
                        <div className="w-full h-full p-4 flex items-center justify-center bg-slate-900">
                            <img
                                src={sidePreviewUrl || ''}
                                alt="Preview"
                                className="max-w-full max-h-full object-contain animate-in fade-in zoom-in duration-500 shadow-2xl border-4 border-white"
                            />
                        </div>
                    )}
                </div>
            </Modal>

            <style>{`
                .wipe-mask {
                    clip-path: inset(0 50% 0 50%);
                }
                .wipe-active {
                    clip-path: inset(0 0 0 0);
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </>
    );
};
