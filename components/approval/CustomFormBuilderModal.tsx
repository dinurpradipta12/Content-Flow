import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Plus, Trash2, Copy, CheckCircle } from 'lucide-react';

interface CustomFormBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CustomFormBuilderModal: React.FC<CustomFormBuilderModalProps> = ({ isOpen, onClose }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [fields, setFields] = useState<any[]>([]);
    const [generatedSql, setGeneratedSql] = useState('');
    const [copied, setCopied] = useState(false);

    const addField = () => {
        setFields([...fields, { id: `field_${Date.now()}`, label: '', type: 'text', required: false }]);
    };

    const updateField = (index: number, key: string, value: any) => {
        const newFields = [...fields];
        newFields[index][key] = value;
        setFields(newFields);
    };

    const removeField = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const generateSql = () => {
        if (!name) {
            alert("Nama template harus diisi");
            return;
        }

        const schema = JSON.stringify(fields);
        const workflow = JSON.stringify([
            { id: "step_1", name: "Review", type: "approval", approver_role: "Manager" }
        ]);

        const sql = `
INSERT INTO public.approval_templates (name, description, icon, form_schema, workflow_steps)
VALUES (
  '${name.replace(/'/g, "''")}',
  '${description.replace(/'/g, "''")}',
  'file-text',
  '${schema}',
  '${workflow}'
);
        `.trim();

        setGeneratedSql(sql);
        setCopied(false);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedSql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Buat Form Pengajuan Baru" maxWidth="max-w-4xl">
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-black uppercase tracking-wider mb-2">Nama Template</label>
                            <input 
                                type="text" 
                                className="w-full border-4 border-slate-900 p-3 rounded-xl font-bold focus:outline-none focus:bg-yellow-50 shadow-[4px_4px_0px_0px_#0f172a]"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Contoh: Pengajuan Cuti"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-black uppercase tracking-wider mb-2">Deskripsi</label>
                            <textarea 
                                className="w-full border-4 border-slate-900 p-3 rounded-xl font-bold focus:outline-none focus:bg-yellow-50 shadow-[4px_4px_0px_0px_#0f172a] resize-none"
                                rows={3}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Deskripsi singkat form ini..."
                            />
                        </div>
                    </div>

                    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] max-h-[400px] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-black uppercase tracking-wider">Field Form</label>
                            <Button onClick={addField} className="bg-accent text-white py-1 px-3 text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a]">
                                <Plus size={14} className="mr-1" /> Tambah Field
                            </Button>
                        </div>
                        
                        {fields.length === 0 ? (
                            <p className="text-sm text-slate-500 italic text-center py-4">Belum ada field. Klik tambah field.</p>
                        ) : (
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="bg-white p-3 rounded-lg border-2 border-slate-900 relative">
                                        <button onClick={() => removeField(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                                            <Trash2 size={16} />
                                        </button>
                                        <div className="space-y-2 pr-6">
                                            <input 
                                                type="text" 
                                                placeholder="Label Field (misal: Nama Lengkap)" 
                                                className="w-full border-2 border-slate-200 p-2 rounded font-bold text-sm focus:border-slate-900 focus:outline-none"
                                                value={field.label}
                                                onChange={e => updateField(index, 'label', e.target.value)}
                                            />
                                            <div className="flex gap-2">
                                                <select 
                                                    className="flex-1 border-2 border-slate-200 p-2 rounded font-bold text-sm focus:border-slate-900 focus:outline-none"
                                                    value={field.type}
                                                    onChange={e => updateField(index, 'type', e.target.value)}
                                                >
                                                    <option value="text">Teks Pendek</option>
                                                    <option value="textarea">Teks Panjang</option>
                                                    <option value="date">Tanggal</option>
                                                    <option value="user_select">Pilih User</option>
                                                    <option value="workspace_select">Pilih Workspace</option>
                                                    <option value="file">Upload File</option>
                                                    <option value="file_multiple">Upload Banyak File</option>
                                                </select>
                                                <label className="flex items-center gap-2 text-sm font-bold">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={field.required}
                                                        onChange={e => updateField(index, 'required', e.target.checked)}
                                                        className="w-4 h-4"
                                                    />
                                                    Wajib
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="border-t-4 border-slate-900 pt-6">
                    <Button onClick={generateSql} className="w-full bg-blue-500 text-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#0f172a] py-3 text-lg uppercase tracking-widest mb-4">
                        Generate SQL Query
                    </Button>

                    {generatedSql && (
                        <div className="bg-slate-900 text-green-400 p-4 rounded-xl relative font-mono text-sm overflow-x-auto">
                            <button 
                                onClick={copyToClipboard}
                                className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 p-2 rounded text-white transition-colors flex items-center gap-2"
                            >
                                {copied ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                            <pre className="whitespace-pre-wrap pt-8">{generatedSql}</pre>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
