import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // Use createPortal to render outside the parent DOM hierarchy (at the body level)
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full ${maxWidth} max-h-[90vh] flex flex-col animate-bounce-in shadow-hard rounded-xl bg-white border-2 border-slate-800 overflow-hidden`}>
        {/* Header */}
        <div className="px-6 py-4 border-b-2 border-slate-800 bg-accent text-white flex items-center justify-between shrink-0">
          <h3 className="font-bold font-heading text-lg tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 text-white p-1.5 rounded-lg transition-all border border-transparent hover:border-white/50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-white">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};