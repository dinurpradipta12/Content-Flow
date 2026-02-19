import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, icon, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="font-bold text-xs text-slate-600 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          className={`bg-white border-2 border-slate-300 text-slate-800 rounded-lg ${icon ? 'pl-10' : 'px-4'} pr-4 py-3 outline-none transition-all duration-200 focus:border-accent focus:shadow-[4px_4px_0px_0px_#8B5CF6] placeholder:text-slate-400 w-full ${className}`}
          {...props}
        />
      </div>
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { label: string; value: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label className="font-bold text-xs text-slate-600 ml-1">
            {label}
          </label>
        )}
        <div className="relative">
            <select
            className={`w-full bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none transition-all duration-200 focus:border-accent focus:shadow-[4px_4px_0px_0px_#8B5CF6] appearance-none ${className}`}
            {...props}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>
      </div>
    );
  };

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, className = '', ...props }) => {
    return (
        <div className="flex flex-col gap-1 w-full">
        {label && (
            <label className="font-bold text-xs text-slate-600 ml-1">
            {label}
            </label>
        )}
        <textarea
            className={`bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none transition-all duration-200 focus:border-accent focus:shadow-[4px_4px_0px_0px_#8B5CF6] placeholder:text-slate-400 min-h-[120px] ${className}`}
            {...props}
        />
        </div>
    );
};

// --- NEW COMPONENT: Creatable Select ---
interface CreatableSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
  colorTheme?: 'violet' | 'pink' | 'yellow' | 'green';
}

export const CreatableSelect: React.FC<CreatableSelectProps> = ({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder = "Pilih atau ketik baru...", 
  className = "",
  colorTheme = 'violet'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Colors mapping for playful theme
  const themeStyles = {
    violet: 'focus:border-accent focus:shadow-[4px_4px_0px_0px_#8B5CF6]',
    pink: 'focus:border-secondary focus:shadow-[4px_4px_0px_0px_#F472B6]',
    yellow: 'focus:border-tertiary focus:shadow-[4px_4px_0px_0px_#FBBF24]',
    green: 'focus:border-quaternary focus:shadow-[4px_4px_0px_0px_#34D399]',
  };

  useEffect(() => {
    // If value changes externally or initially
    if (value) setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // On close, ensure value matches input if valid, else revert or keep custom
        // In this simple version, we just close.
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e.target.value); // Real-time update allows custom typing
    setIsOpen(true);
  };

  const handleSelectOption = (optValue: string) => {
    setInputValue(optValue);
    onChange(optValue);
    setIsOpen(false);
  };

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  const isExactMatch = filteredOptions.some(opt => opt.value.toLowerCase() === inputValue.toLowerCase());

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="font-bold text-xs text-slate-600 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          className={`w-full bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 pr-10 outline-none transition-all duration-200 ${themeStyles[colorTheme]} placeholder:text-slate-400`}
          value={inputValue}
          onChange={handleInputChange}
          onClick={() => setIsOpen(true)}
          placeholder={placeholder}
        />
        <div 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600"
            onClick={() => setIsOpen(!isOpen)}
        >
            <ChevronDown size={18} />
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border-2 border-slate-800 rounded-xl shadow-hard max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
             {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                    <div 
                        key={opt.value}
                        className="px-4 py-2 hover:bg-slate-100 cursor-pointer font-medium text-slate-700 transition-colors flex items-center justify-between group"
                        onClick={() => handleSelectOption(opt.value)}
                    >
                        {opt.label}
                        {opt.value === value && <div className="w-2 h-2 rounded-full bg-slate-800"></div>}
                    </div>
                ))
             ) : (
                <div className="px-4 py-3 text-slate-400 text-sm italic text-center">
                    Tidak ada opsi yang cocok.
                </div>
             )}

             {/* Create Option */}
             {!isExactMatch && inputValue.trim() !== '' && (
                 <div 
                    className="px-4 py-3 bg-slate-50 border-t border-slate-100 cursor-pointer text-accent font-bold hover:bg-accent hover:text-white transition-colors flex items-center gap-2"
                    onClick={() => handleSelectOption(inputValue)}
                >
                    <Plus size={16} />
                    Buat baru: "{inputValue}"
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};