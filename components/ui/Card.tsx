import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  className?: string;
  headerColor?: 'violet' | 'pink' | 'yellow' | 'green' | 'white';
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  icon,
  className = '',
  headerColor = 'white',
  ...props
}) => {
  const headerColors = {
    violet: 'bg-accent text-white',
    pink: 'bg-secondary text-white',
    yellow: 'bg-tertiary text-foreground',
    green: 'bg-quaternary text-foreground',
    white: 'bg-card text-foreground'
  };

  return (
    <div
      className={`group relative bg-card border-2 border-slate-800 rounded-xl shadow-hard hover:scale-[1.01] transition-all duration-300 ${className}`}
      {...props}
    >
      {(title || icon) && (
        <div className={`px-6 py-4 border-b-2 border-slate-800 rounded-t-[10px] flex items-center gap-3 ${headerColors[headerColor]}`}>
          {icon && (
            <div className="bg-card border-2 border-slate-800 p-1.5 rounded-lg shadow-sm text-foreground">
              {icon}
            </div>
          )}
          {title && <h3 className="font-bold font-heading text-lg tracking-tight">{title}</h3>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};