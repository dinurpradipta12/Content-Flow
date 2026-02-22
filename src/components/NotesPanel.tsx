import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, Underline, List, X, ListOrdered } from 'lucide-react';

interface NotesPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ isOpen, onClose }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [content, setContent] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('carousel_notes') || '';
        setContent(saved);
        if (editorRef.current && saved) {
            editorRef.current.innerHTML = saved;
        }
    }, []);

    const execCommand = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        const html = e.currentTarget.innerHTML;
        setContent(html);
        localStorage.setItem('carousel_notes', html);
    };

    return (
        <div
            className={`flex flex-col h-full bg-[#fdfbf6] rounded-2xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_#0f172a] overflow-hidden ml-4 transition-all duration-300 ease-in-out shrink-0 transform origin-right ${isOpen ? 'w-80 opacity-100 scale-x-100' : 'w-0 opacity-0 scale-x-0 ml-0 border-0 shadow-none'
                }`}
        >
            {/* Header */}
            <div className="bg-amber-400 border-b-4 border-slate-900 px-4 py-3 flex items-center justify-between shrink-0 h-[60px]">
                <h3 className="font-heading font-black text-slate-900 text-lg flex items-center gap-2">
                    <span role="img" aria-label="memo">📝</span> Script Notes
                </h3>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-amber-500 rounded-lg transition-colors border-2 border-transparent hover:border-slate-900 shadow-none hover:shadow-[2px_2px_0px_0px_#0f172a]"
                >
                    <X size={20} className="text-slate-900" />
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#f4f0e6] border-b-2 border-slate-300 shrink-0">
                <button onClick={() => execCommand('bold')} className="p-1.5 hover:bg-amber-200 text-slate-700 hover:text-slate-900 rounded border border-transparent hover:border-slate-900 transition-colors" title="B">
                    <Bold size={16} strokeWidth={3} />
                </button>
                <button onClick={() => execCommand('italic')} className="p-1.5 hover:bg-amber-200 text-slate-700 hover:text-slate-900 rounded border border-transparent hover:border-slate-900 transition-colors" title="I">
                    <Italic size={16} strokeWidth={3} />
                </button>
                <button onClick={() => execCommand('underline')} className="p-1.5 hover:bg-amber-200 text-slate-700 hover:text-slate-900 rounded border border-transparent hover:border-slate-900 transition-colors" title="U">
                    <Underline size={16} strokeWidth={3} />
                </button>
                <div className="w-px h-5 bg-slate-300 mx-0.5"></div>
                <button onClick={() => execCommand('insertUnorderedList')} className="p-1.5 hover:bg-amber-200 text-slate-700 hover:text-slate-900 rounded border border-transparent hover:border-slate-900 transition-colors" title="ul">
                    <List size={16} strokeWidth={3} />
                </button>
                <button onClick={() => execCommand('insertOrderedList')} className="p-1.5 hover:bg-amber-200 text-slate-700 hover:text-slate-900 rounded border border-transparent hover:border-slate-900 transition-colors" title="ol">
                    <ListOrdered size={16} strokeWidth={3} />
                </button>
            </div>

            {/* Content Editable Area */}
            <div
                ref={editorRef}
                className="flex-1 p-5 outline-none custom-scrollbar overflow-y-auto text-slate-800 font-medium leading-relaxed prose prose-sm prose-amber focus:ring-inset focus:ring-4 focus:ring-amber-200 transition-shadow bg-white/50"
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                data-placeholder="Tulis script konten, brief, notes, atau ide visual disini... ✨"
                style={{
                    minHeight: '100px',
                    whiteSpace: 'pre-wrap',
                }}
            />
            {/* CSS hack for placeholder on contenteditable */}
            <style dangerouslySetInnerHTML={{
                __html: `
                [contenteditable][data-placeholder]:empty:before {
                    content: attr(data-placeholder);
                    color: #94a3b8;
                    cursor: text;
                    font-style: italic;
                }
            `}} />
        </div>
    );
};
