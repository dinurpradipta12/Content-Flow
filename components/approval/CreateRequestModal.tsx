import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { ApprovalTemplate, FormField } from '../../types/approval';
import { createRequest } from '../../services/approvalService';
import { supabase } from '../../services/supabaseClient';
import { CheckCircle, AlertCircle, FileText, UploadCloud, PlusCircle, Bell } from 'lucide-react';
import { CustomFormBuilderModal } from './CustomFormBuilderModal';
import { useNotifications } from '../../components/NotificationProvider';

interface CreateRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: ApprovalTemplate[];
    currentUser: any;
    onSuccess: () => void;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({ isOpen, onClose, templates, currentUser, onSuccess }) => {
    const [selectedTemplate, setSelectedTemplate] = useState<ApprovalTemplate | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [isCustomBuilderOpen, setIsCustomBuilderOpen] = useState(false);

    // Dropdown Data
    const [users, setUsers] = useState<any[]>([]);
    const [workspaces, setWorkspaces] = useState<any[]>([]);

    const { sendNotification } = useNotifications();

    const fetchAppUsers = async () => {
        // We can reuse the users state but for mentions we need names
    };

    const notifyByMention = async (text: string, sourceTitle: string, reqId?: string) => {
        if (!text || typeof text !== 'string') return;

        const mentionedIds = new Set<string>();

        // 1. Traditional @mentions
        if (text.includes('@')) {
            const mentions = text.match(/@\[([^\]]+)\]|@(\w+)/g);
            if (mentions) {
                const names = mentions.map(m => m.startsWith('@[') ? m.slice(2, -1) : m.slice(1));
                for (const name of names) {
                    const user = users.find(u => (u.full_name || u.username) === name);
                    if (user) mentionedIds.add(user.id);
                }
            }
        }

        // 2. Scan for full names (even without @) - Global mentioning
        users.forEach(user => {
            const fullName = user.full_name?.toLowerCase();
            const userName = user.username?.toLowerCase();
            const lowerText = text.toLowerCase();
            if ((fullName && lowerText.includes(fullName)) || (userName && lowerText.includes(userName))) {
                mentionedIds.add(user.id);
            }
        });

        // Send notifications
        for (const userId of Array.from(mentionedIds)) {
            await sendNotification({
                recipientId: userId,
                type: 'MENTION',
                title: 'Anda disebut dalam Pengajuan',
                content: `menyebut Anda dalam pengajuan baru: ${sourceTitle}`,
                metadata: reqId ? { request_id: reqId } : undefined
            });
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setSelectedTemplate(null);
            setFormData({});
        } else {
            fetchDropdownData();
        }
    }, [isOpen]);

    const fetchDropdownData = async () => {
        try {
            const [usersRes, wsRes] = await Promise.all([
                supabase.from('app_users').select('id, full_name, username, avatar_url'),
                supabase.from('workspaces').select('id, name, account_name, members')
            ]);

            if (usersRes.data) setUsers(usersRes.data);
            if (wsRes.data) setWorkspaces(wsRes.data);
        } catch (err) {
            console.error("Failed to fetch dropdown data", err);
        }
    };

    const handleTemplateSelect = (template: ApprovalTemplate) => {
        setSelectedTemplate(template);
        setFormData({});
    };

    const handleInputChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleFileUpload = (fieldId: string, e: React.ChangeEvent<HTMLInputElement>, isMultiple: boolean) => {
        const files = e.target.files;
        if (!files) return;

        if (isMultiple) {
            if (files.length > 15) {
                alert("Maksimal 15 file diperbolehkan.");
                return;
            }
            // For demo, we just store file names. In real app, upload to storage.
            const fileNames = (Array.from(files) as File[]).map(f => f.name).join(', ');
            handleInputChange(fieldId, `[Files: ${fileNames}]`);
        } else {
            const file = files[0];
            handleInputChange(fieldId, `[File: ${file.name}]`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemplate) return;

        setLoading(true);
        try {
            const newReq = await createRequest(selectedTemplate, formData, currentUser);
            const reqId = newReq.id;

            // Scan for mentions and assignments
            const judul = formData.judul_konten || selectedTemplate.name;
            for (const field of selectedTemplate.form_schema) {
                const value = formData[field.id];
                if (!value) continue;

                if (field.type === 'user_select') {
                    // This is an assignment, notify the user
                    const user = users.find(u => (u.full_name || u.username) === value);
                    if (user && user.id !== currentUser.id) {
                        await sendNotification({
                            recipientId: user.id,
                            type: 'MENTION',
                            title: 'Penugasan Approval',
                            content: `menugaskan Anda dalam pengajuan baru: ${judul}`,
                            metadata: { request_id: reqId }
                        });
                    }
                } else if (typeof value === 'string') {
                    await notifyByMention(value, judul, reqId);
                }
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Gagal membuat pengajuan.");
        } finally {
            setLoading(false);
        }
    };

    const renderField = (field: FormField) => {
        switch (field.type) {
            case 'select':
                return (
                    <div key={field.id} className="flex flex-col gap-1">
                        <label className="font-bold text-xs text-slate-600 ml-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <select
                            className="w-full bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none transition-all duration-200 focus:border-accent focus:shadow-[4px_4px_0px_0px_#8B5CF6] appearance-none"
                            value={formData[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            required={field.required}
                        >
                            <option value="" disabled>Pilih opsi...</option>
                            {field.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>
                );
            case 'user_select':
                // Filter users by selected workspace members if a workspace is selected
                const wsField = selectedTemplate?.form_schema.find(f => f.type === 'workspace_select');
                const selectedWsName = wsField ? formData[wsField.id] : null;
                const activeWs = workspaces.find(w => w.name === selectedWsName);

                const filteredUsers = activeWs && activeWs.members
                    ? users.filter(u => activeWs.members.includes(u.avatar_url))
                    : users;

                return (
                    <div key={field.id} className="flex flex-col gap-1">
                        <label className="font-bold text-xs text-slate-600 ml-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <select
                            className="w-full bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none transition-all duration-200 focus:border-accent focus:shadow-[4px_4px_0px_0px_#8B5CF6] appearance-none"
                            value={formData[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            required={field.required}
                        >
                            <option value="" disabled>{activeWs ? `Pilih PIC di ${activeWs.name}...` : 'Pilih PIC...'}</option>
                            {filteredUsers.map(u => (
                                <option key={u.id} value={u.full_name || u.username}>{u.full_name || u.username}</option>
                            ))}
                        </select>
                        {selectedWsName && filteredUsers.length === 0 && (
                            <p className="text-[10px] text-red-500 font-bold ml-1 italic">Tidak ada anggota ditemukan di workspace ini.</p>
                        )}
                    </div>
                );

            case 'workspace_select':
                return (
                    <div key={field.id} className="flex flex-col gap-1">
                        <label className="font-bold text-xs text-slate-600 ml-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <select
                            className="w-full bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none transition-all duration-200 focus:border-accent focus:shadow-[4px_4px_0px_0px_#8B5CF6] appearance-none"
                            value={formData[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            required={field.required}
                        >
                            <option value="" disabled>Pilih Workspace/Akun...</option>
                            {workspaces.map(ws => (
                                <option key={ws.id} value={ws.name}>{ws.name} {ws.account_name ? `(@${ws.account_name})` : ''}</option>
                            ))}
                        </select>
                    </div>
                );
            case 'textarea':
                return (
                    <div key={field.id} className="flex flex-col gap-1">
                        <label className="font-bold text-xs text-slate-600 ml-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                            className="w-full bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none transition-all duration-200 focus:border-accent focus:shadow-[4px_4px_0px_0px_#8B5CF6]"
                            rows={3}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            required={field.required}
                        />
                    </div>
                );
            case 'file':
            case 'file_multiple':
                return (
                    <div key={field.id} className="flex flex-col gap-1">
                        <label className="font-bold text-xs text-slate-600 ml-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative group cursor-pointer">
                            <div className="w-full bg-slate-50 border-2 border-dashed border-slate-300 hover:border-accent text-slate-500 rounded-lg px-4 py-6 flex flex-col items-center justify-center transition-all duration-200">
                                <UploadCloud size={24} className="mb-2 text-slate-400 group-hover:text-accent" />
                                <span className="text-sm font-bold">{formData[field.id] ? 'File Terpilih' : 'Klik untuk Upload'}</span>
                                {formData[field.id] && <span className="text-xs text-accent mt-1 truncate max-w-full px-4">{formData[field.id]}</span>}
                            </div>
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                multiple={field.type === 'file_multiple'}
                                accept={field.type === 'file_multiple' ? "image/jpeg, image/png" : ".pdf"}
                                onChange={(e) => handleFileUpload(field.id, e, field.type === 'file_multiple')}
                                required={field.required && !formData[field.id]}
                            />
                        </div>
                    </div>
                );
            default:
                return (
                    <Input
                        key={field.id}
                        label={field.label}
                        type={field.type}
                        required={field.required}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                    />
                );
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Buat Pengajuan Baru" maxWidth="max-w-2xl">
                {!selectedTemplate ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-2">
                        {templates.map(template => (
                            <button
                                key={template.id}
                                onClick={() => handleTemplateSelect(template)}
                                className="flex flex-col items-start p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-accent hover:shadow-hard transition-all text-left group"
                            >
                                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent group-hover:text-white transition-colors">
                                    <FileText size={24} className="text-slate-400 group-hover:text-white" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 mb-1">{template.name}</h3>
                                <p className="text-sm text-slate-500 line-clamp-2">{template.description}</p>
                            </button>
                        ))}

                        {/* Custom Form Builder Button (Superuser Only) */}
                        {currentUser?.role === 'superuser' && (
                            <button
                                onClick={() => { onClose(); setIsCustomBuilderOpen(true); }}
                                className="flex flex-col items-start p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl hover:border-accent hover:bg-yellow-50 hover:shadow-[4px_4px_0px_0px_#0f172a] transition-all text-left group"
                            >
                                <div className="w-12 h-12 bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center mb-4 group-hover:border-accent group-hover:text-accent transition-colors">
                                    <PlusCircle size={24} className="text-slate-400 group-hover:text-accent" />
                                </div>
                                <h3 className="font-black text-lg text-slate-800 mb-1 uppercase tracking-tight">Buat Form Baru</h3>
                                <p className="text-sm text-slate-500 font-bold">Setup form pengajuan secara custom dengan field dinamis.</p>
                            </button>
                        )}

                        {templates.length === 0 && (
                            <div className="col-span-2 text-center py-8 text-slate-400">
                                <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                                <p>Belum ada template approval tersedia.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-xl flex items-start gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-800">{selectedTemplate.name}</h4>
                                <p className="text-sm text-blue-600/80">{selectedTemplate.description}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedTemplate(null)}
                                className="ml-auto text-xs font-bold text-blue-500 hover:text-blue-700 underline"
                            >
                                Ganti Template
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                            {selectedTemplate.form_schema.map(field => renderField(field))}
                        </div>

                        <div className="flex justify-end pt-4 border-t-2 border-slate-100">
                            <Button type="submit" className="bg-accent text-white" isLoading={loading} icon={<CheckCircle size={18} />}>
                                Kirim Pengajuan
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            <CustomFormBuilderModal
                isOpen={isCustomBuilderOpen}
                onClose={() => setIsCustomBuilderOpen(false)}
            />
        </>
    );
};
