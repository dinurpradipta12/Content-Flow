import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
  overlayClassName?: string;
  duration?: number;
  zIndex?: number;
  headerClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
  className = '',
  overlayClassName = '',
  duration = 700,
  zIndex = 9999,
  headerClassName = ''
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration]);

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

  if (!shouldRender || !mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center p-2 sm:p-3 md:p-4 transition-all duration-500 
        ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} 
        ${!overlayClassName.includes('bg-') && isOpen ? 'bg-slate-900/60' : ''} 
        ${!overlayClassName.includes('backdrop-blur-none') && isOpen ? 'backdrop-blur-sm' : ''} 
        ${overlayClassName}`}
      style={{ zIndex, transitionDuration: isOpen ? '200ms' : `${duration}ms` }}
    >
      <div
        className={`relative w-full ${maxWidth} max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-hard rounded-lg sm:rounded-xl bg-card border-2 border-border overflow-hidden transition-all ease-[cubic-bezier(0.34,1.56,0.64,1)] ${className}`}
        style={{ transitionDuration: `${duration}ms` }}
      >
        {/* Header */}
        <div className={`px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 border-b-4 border-border bg-muted text-foreground flex items-center justify-between shrink-0 gap-2 ${headerClassName}`}>
          <h3 className="font-bold font-heading text-sm sm:text-base md:text-lg tracking-tight truncate">{title}</h3>
          <button
            onClick={onClose}
            className="bg-background/20 hover:bg-background/30 text-background p-1 sm:p-1.5 rounded-xl transition-all border-2 border-transparent hover:border-background/50 flex-shrink-0"
          >
            <X size={16} className="sm:w-5 sm:h-5 font-black" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 custom-scrollbar bg-card">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};