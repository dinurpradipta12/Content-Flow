import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    CalendarDays,
    BarChart2,
    Image as ImageIcon,
    PenTool,
    Settings,
    LogOut,
    ChevronDown,
    ChevronRight,
    UserPlus,
    Layers,
    Menu,
    Bell,
    Wifi,
    Upload,
    User,
    Palette,
    Database,
    Code,
    CheckCircle,
    XCircle,
    AlertCircle,
    Globe,
    ChevronUp,
    Shield,
    Briefcase,
    Users,
    Presentation,
    Power,
    MessageSquare,
    Inbox,
    AlertTriangle,
    BarChart3,
    Copy,
    GitBranch,
    Smartphone,
    Clock,
    CheckCheck,
    Trash2
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { Modal } from './ui/Modal';
import { Workspace } from '../types';
import { updateSupabaseConfig, checkConnectionLatency, supabase } from '../services/supabaseClient';
import { X } from 'lucide-react';
import { UserPresence } from './UserPresence';
import { PresenceToast } from './PresenceToast';
import { FirstLoginModal } from './FirstLoginModal';
import { EmailSetupModal } from './EmailSetupModal';
import { ChatNotificationListener } from './ChatNotificationListener';

const THEME_STYLES: Record<string, (color?: string) => string> = {
    dark: () => `
        body.theme-dark, .theme-dark, .theme-dark main, .theme-dark .bg-background, .theme-dark.bg-background { background-color: #0f172a !important; }
        .theme-dark .bg-dot-grid { background-image: radial-gradient(#334155 1px, transparent 1px) !important; }
        .theme-dark header, .theme-dark aside, .theme-dark .bg-white, .theme-dark .bg-card, .theme-dark [class*="bg-[#F"] { background-color: #1e293b !important; border-color: #475569 !important; color: #f8fafc !important; }
        .theme-dark .bg-slate-50, .theme-dark .bg-slate-100, .theme-dark .bg-slate-200 { background-color: #0f172a !important; border-color: #334155 !important; }
        .theme-dark .text-slate-900, .theme-dark .text-slate-800, .theme-dark .text-slate-700 { color: #f1f5f9 !important; }
        .theme-dark .text-slate-500, .theme-dark .text-slate-400 { color: #94a3b8 !important; }
        .theme-dark .border-slate-900, .theme-dark .border-slate-800, .theme-dark .border-slate-200 { border-color: #475569 !important; }
        .theme-dark .shadow-hard { box-shadow: 4px 4px 0px 0px #020617 !important; }
        .theme-dark .bg-slate-900 { background-color: #3b82f6 !important; color: #fff !important; }
        .theme-dark input, .theme-dark select, .theme-dark textarea { background-color: #0f172a !important; color: #fff !important; border-color: #475569 !important; }
        .theme-dark .bg-red-50 { background-color: #1e3a8a !important; border-color: #1e40af !important; color: #bfdbfe !important; }
        .theme-dark .text-red-500, .theme-dark .text-red-600 { color: #93c5fd !important; }
        .theme-dark .hover\\:bg-red-500:hover { background-color: #3b82f6 !important; color: #fff !important; }
        .theme-dark .hover\\:text-red-500:hover { color: #60a5fa !important; }
        .theme-dark .bg-yellow-400 { background-color: #2563eb !important; color: #fff !important; }
        .theme-dark .bg-yellow-400 * { color: #fff !important; }
        .theme-dark [class*="bg-"][class*="-600"] *, .theme-dark [class*="bg-"][class*="-700"] *, .theme-dark [class*="bg-"][class*="-800"] *, .theme-dark [class*="bg-"][class*="-900"] * { color: #fff !important; }
        .theme-dark .bg-slate-900 .text-red-500, .theme-dark aside .text-red-500 { color: #bfdbfe !important; }
        .theme-dark .bg-white\\/30 { background-color: rgba(255,255,255,0.1) !important; }

        /* Platform Badges - Solid Brand Colors (Keep for visibility) */
        .theme-dark .bg-pink-100 { background-color: #db2777 !important; color: #fff !important; }
        .theme-dark .bg-red-100 { background-color: #dc2626 !important; color: #fff !important; }
        .theme-dark .bg-blue-100, .theme-dark .bg-blue-50 { background-color: #2563eb !important; color: #fff !important; }
        .theme-dark .bg-slate-100 { background-color: #1e293b !important; color: #fff !important; }
        .theme-dark .bg-black { background-color: #000 !important; color: #fff !important; }
        
        /* Force icons to be white inside solid platform boxes */
        .theme-dark [class*="bg-pink-"] svg, .theme-dark [class*="bg-red-"] svg, .theme-dark [class*="bg-blue-"] svg, .theme-dark .bg-black svg { color: #fff !important; stroke: #fff !important; }
        
        /* Protection for specific branding elements (logos) */
        .theme-dark .bg-white.rounded-lg, .theme-dark .ws-logo-box { background-color: #ffffff !important; border-color: #e2e8f0 !important; color: #1e293b !important; }
        .theme-dark .bg-white.rounded-lg svg, .theme-dark .ws-logo-box svg, .theme-dark .bg-white.rounded-lg span { color: #1e293b !important; stroke: #1e293b !important; }
        
        /* Network Status Badge Fixes - Forced Visibility & Clean Backgrounds */
        .theme-dark .bg-green-50, .theme-dark .bg-emerald-50 { background-color: rgba(16, 185, 129, 0.15) !important; border-color: rgba(16, 185, 129, 0.4) !important; color: #34d399 !important; }
        .theme-dark .bg-yellow-50, .theme-dark .bg-amber-50 { background-color: rgba(245, 158, 11, 0.15) !important; border-color: rgba(245, 158, 11, 0.4) !important; color: #fbbf24 !important; }
        .theme-dark .bg-red-50 { background-color: rgba(239, 68, 68, 0.15) !important; border-color: rgba(239, 68, 68, 0.4) !important; color: #f87171 !important; }
        
        .theme-dark .bg-green-50 span, .theme-dark .bg-green-50 svg, .theme-dark .bg-emerald-50 svg,
        .theme-dark .bg-yellow-50 span, .theme-dark .bg-yellow-50 svg, .theme-dark .bg-amber-50 svg,
        .theme-dark .bg-red-50 span, .theme-dark .bg-red-50 svg { background-color: transparent !important; color: inherit !important; stroke: currentColor !important; }
        .theme-dark [class*="bg-"][class*="-50"] svg, .theme-dark [class*="bg-"][class*="-100"] svg { display: inline-block !important; visibility: visible !important; opacity: 1 !important; }

        /* Card Badges Fixes - Premium Translucent Look for Pillars & Types */
        .theme-dark .bg-yellow-100 { background-color: rgba(234, 179, 8, 0.15) !important; border-color: rgba(234, 179, 8, 0.4) !important; color: #fde047 !important; }
        .theme-dark .text-yellow-700, .theme-dark .bg-yellow-100 *, .theme-dark .text-yellow-700 * { color: #fde047 !important; }
        
        .theme-dark .bg-green-100 { background-color: rgba(34, 197, 94, 0.15) !important; border-color: rgba(34, 197, 94, 0.4) !important; color: #86efac !important; }
        .theme-dark .text-green-700, .theme-dark .bg-green-100 *, .theme-dark .text-green-700 * { color: #86efac !important; }
        
        .theme-dark .bg-purple-100 { background-color: rgba(168, 85, 247, 0.15) !important; border-color: rgba(168, 85, 247, 0.4) !important; color: #d8b4fe !important; }
        .theme-dark .text-purple-700, .theme-dark .bg-purple-100 *, .theme-dark .text-purple-700 * { color: #d8b4fe !important; }
        
        .theme-dark .bg-blue-100:not([class*="platform"]) { background-color: rgba(59, 130, 246, 0.15) !important; border-color: rgba(59, 130, 246, 0.4) !important; color: #93c5fd !important; }
        .theme-dark .text-blue-700:not([class*="platform"]), .theme-dark .bg-blue-100:not([class*="platform"]) * { color: #93c5fd !important; }

        /* Shadow Fixes - Neutralize light shadows in dark mode */
        .theme-dark [class*="shadow-violet-"], 
        .theme-dark [class*="shadow-emerald-"], 
        .theme-dark [class*="shadow-pink-"], 
        .theme-dark [class*="shadow-blue-"], 
        .theme-dark [class*="shadow-slate-"] { 
            --tw-shadow-color: rgba(2, 6, 23, 0.5) !important;
            box-shadow: 0 10px 15px -3px rgba(2, 6, 23, 0.5), 0 4px 6px -2px rgba(2, 6, 23, 0.5) !important;
        }
        .theme-dark [class*="hover\\:shadow-"]:hover {
            box-shadow: 0 20px 25px -5px rgba(2, 6, 23, 0.6), 0 10px 10px -5px rgba(2, 6, 23, 0.6) !important;
        }
        
        .theme-dark .bg-orange-100 { background-color: rgba(249, 115, 22, 0.15) !important; border-color: rgba(249, 115, 22, 0.4) !important; color: #fdba74 !important; }
        .theme-dark .text-orange-700, .theme-dark .bg-orange-100 *, .theme-dark .text-orange-700 * { color: #fdba74 !important; }
        
        .theme-dark .bg-amber-100 { background-color: rgba(245, 158, 11, 0.15) !important; border-color: rgba(245, 158, 11, 0.4) !important; color: #fbbf24 !important; }
        .theme-dark .text-amber-600, .theme-dark .text-amber-700, .theme-dark .bg-amber-100 *, .theme-dark .text-amber-600 * { color: #fbbf24 !important; }

        .theme-dark .bg-emerald-100 { background-color: rgba(16, 185, 129, 0.15) !important; border-color: rgba(16, 185, 129, 0.4) !important; color: #34d399 !important; }
        .theme-dark .text-emerald-700, .theme-dark .bg-emerald-100 *, .theme-dark .text-emerald-700 * { color: #34d399 !important; }

        .theme-dark .bg-red-100 { background-color: rgba(239, 68, 68, 0.15) !important; border-color: rgba(239, 68, 68, 0.4) !important; color: #f87171 !important; }
        .theme-dark .text-red-500, .theme-dark .text-red-600, .theme-dark .text-red-700, .theme-dark .bg-red-100 *, .theme-dark .text-red-600 * { color: #f87171 !important; }

        .theme-dark .bg-pink-100 { background-color: rgba(236, 72, 153, 0.15) !important; border-color: rgba(236, 72, 153, 0.4) !important; color: #f472b6 !important; }
        .theme-dark .text-pink-600, .theme-dark .text-pink-700, .theme-dark .bg-pink-100 *, .theme-dark .text-pink-600 * { color: #f472b6 !important; }
        
        .theme-dark .bg-yellow-300 { background-color: #facc15 !important; border-color: #eab308 !important; color: #020617 !important; }
        .theme-dark .bg-yellow-300 * { color: #020617 !important; }

        .theme-dark .bg-white\\/50, .theme-dark .bg-white\\/60 { background-color: rgba(255, 255, 255, 0.08) !important; border-color: rgba(255, 255, 255, 0.15) !important; color: #e2e8f0 !important; }
        .theme-dark .bg-white\\/50 *, .theme-dark .bg-white\\/60 * { color: #e2e8f0 !important; stroke: #e2e8f0 !important; }

        .theme-dark .text-mutedForeground, .theme-dark .text-slate-400 { color: #94a3b8 !important; }
        .theme-dark .text-mutedForeground svg, .theme-dark .text-slate-400 svg { color: #94a3b8 !important; stroke: #94a3b8 !important; }

        /* Calendar Cards - Dark Mode */
        .theme-dark .cal-instagram { background-color: rgba(236, 72, 153, 0.25) !important; border-color: rgba(236, 72, 153, 0.5) !important; color: #f9a8d4 !important; }
        .theme-dark .cal-instagram * { color: #f9a8d4 !important; }
        .theme-dark .cal-tiktok { background-color: #1e293b !important; border-color: #475569 !important; color: #f1f5f9 !important; }
        .theme-dark .cal-tiktok * { color: #f1f5f9 !important; }
        .theme-dark .cal-linkedin { background-color: rgba(59, 130, 246, 0.2) !important; border-color: rgba(59, 130, 246, 0.5) !important; color: #93c5fd !important; }
        .theme-dark .cal-linkedin * { color: #93c5fd !important; }
        .theme-dark .cal-youtube { background-color: rgba(239, 68, 68, 0.2) !important; border-color: rgba(239, 68, 68, 0.5) !important; color: #fca5a5 !important; }
        .theme-dark .cal-youtube * { color: #fca5a5 !important; }
        .theme-dark .cal-facebook { background-color: rgba(99, 102, 241, 0.2) !important; border-color: rgba(99, 102, 241, 0.5) !important; color: #a5b4fc !important; }
        .theme-dark .cal-facebook * { color: #a5b4fc !important; }
        .theme-dark .cal-threads { background-color: rgba(148, 163, 184, 0.15) !important; border-color: rgba(148, 163, 184, 0.4) !important; color: #cbd5e1 !important; }
        .theme-dark .cal-threads * { color: #cbd5e1 !important; }
        .theme-dark .cal-default { background-color: #1e293b !important; border-color: #475569 !important; color: #e2e8f0 !important; }
        .theme-dark .cal-default * { color: #e2e8f0 !important; }

        /* ContentFlow Status Column Headers - Dark Mode */
        .theme-dark .bg-slate-100 { background-color: rgba(51, 65, 85, 0.6) !important; border-color: #475569 !important; color: #cbd5e1 !important; }
        .theme-dark .bg-slate-100 * { color: #cbd5e1 !important; }
        .theme-dark .text-slate-600 { color: #94a3b8 !important; }
        .theme-dark .bg-blue-100 { background-color: rgba(30, 58, 138, 0.5) !important; border-color: #1d4ed8 !important; color: #93c5fd !important; }
        .theme-dark .bg-blue-100 * { color: #93c5fd !important; }
        .theme-dark .text-blue-600 { color: #60a5fa !important; }
        .theme-dark .bg-amber-100 { background-color: rgba(120, 53, 15, 0.5) !important; border-color: #b45309 !important; color: #fcd34d !important; }
        .theme-dark .bg-amber-100 * { color: #fcd34d !important; }
        .theme-dark .text-amber-600 { color: #fbbf24 !important; }
        .theme-dark .bg-purple-100 { background-color: rgba(76, 29, 149, 0.5) !important; border-color: #7c3aed !important; color: #c4b5fd !important; }
        .theme-dark .bg-purple-100 * { color: #c4b5fd !important; }
        .theme-dark .text-purple-600 { color: #a78bfa !important; }
        .theme-dark .bg-emerald-100 { background-color: rgba(6, 78, 59, 0.5) !important; border-color: #059669 !important; color: #6ee7b7 !important; }
        .theme-dark .bg-emerald-100 * { color: #6ee7b7 !important; }
        .theme-dark .text-emerald-600 { color: #34d399 !important; }
        .theme-dark .border-slate-300 { border-color: #475569 !important; }
        .theme-dark .border-blue-300 { border-color: #1d4ed8 !important; }
        .theme-dark .border-amber-300 { border-color: #b45309 !important; }
        .theme-dark .border-purple-300 { border-color: #7c3aed !important; }
        .theme-dark .border-emerald-300 { border-color: #059669 !important; }
    `,
    midnight: () => `
        body.theme-midnight, .theme-midnight, .theme-midnight main, .theme-midnight .bg-background, .theme-midnight.bg-background { background-color: #0c1130 !important; }
        .theme-midnight .bg-dot-grid { background-image: radial-gradient(#312e81 1px, transparent 1px) !important; }
        .theme-midnight header, .theme-midnight aside, .theme-midnight .bg-white, .theme-midnight .bg-card, .theme-midnight [class*="bg-[#F"] { background-color: #1e1b4b !important; border-color: #3730a3 !important; color: #e0e7ff !important; }
        .theme-midnight .bg-slate-50, .theme-midnight .bg-slate-100, .theme-midnight .bg-slate-200 { background-color: #0c1130 !important; border-color: #312e81 !important; }
        .theme-midnight .text-slate-900, .theme-midnight .text-slate-800, .theme-midnight .text-slate-700 { color: #c7d2fe !important; }
        .theme-midnight .text-slate-500, .theme-midnight .text-slate-400 { color: #818cf8 !important; }
        .theme-midnight .border-slate-900, .theme-midnight .border-slate-800, .theme-midnight .border-slate-200 { border-color: #4338ca !important; }
        .theme-midnight .shadow-hard { box-shadow: 4px 4px 0px 0px #0b0f29 !important; }
        .theme-midnight .bg-slate-900 { background-color: #6366f1 !important; color: #fff !important; }
        .theme-midnight input, .theme-midnight select, .theme-midnight textarea { background-color: #0c1130 !important; color: #fff !important; border-color: #4338ca !important; }
        .theme-midnight .bg-red-50 { background-color: #312e81 !important; border-color: #3730a3 !important; color: #a5b4fc !important; }
        .theme-midnight .text-red-500, .theme-midnight .text-red-600 { color: #a5b4fc !important; }
        .theme-midnight .hover\\:bg-red-500:hover { background-color: #4f46e5 !important; color: #fff !important; }
        .theme-midnight .hover\\:text-red-500:hover { color: #818cf8 !important; }
        .theme-midnight .bg-yellow-400 { background-color: #4f46e5 !important; color: #fff !important; }
        .theme-midnight .bg-yellow-400 * { color: #fff !important; }
        .theme-midnight [class*="bg-"][class*="-600"] *, .theme-midnight [class*="bg-"][class*="-700"] *, .theme-midnight [class*="bg-"][class*="-800"] *, .theme-midnight [class*="bg-"][class*="-900"] * { color: #fff !important; }
        .theme-midnight .bg-slate-900 .text-red-500, .theme-midnight aside .text-red-500 { color: #c7d2fe !important; }

        /* Platform Badges - Solid Brand Colors (Keep for visibility) */
        .theme-midnight .bg-pink-100 { background-color: #db2777 !important; color: #fff !important; }
        .theme-midnight .bg-red-100 { background-color: #dc2626 !important; color: #fff !important; }
        .theme-midnight .bg-blue-100, .theme-midnight .bg-blue-50 { background-color: #2563eb !important; color: #fff !important; }
        .theme-midnight .bg-slate-100 { background-color: #1e1b4b !important; color: #fff !important; }
        .theme-midnight .bg-black { background-color: #000 !important; color: #fff !important; }
        
        /* Force icons to be white inside solid platform boxes */
        .theme-midnight [class*="bg-pink-"] svg, .theme-midnight [class*="bg-red-"] svg, .theme-midnight [class*="bg-blue-"] svg, .theme-midnight .bg-black svg { color: #fff !important; stroke: #fff !important; }
        
        /* Protection for specific branding elements (logos) */
        .theme-midnight .bg-white.rounded-lg, .theme-midnight .ws-logo-box { background-color: #ffffff !important; border-color: #e2e8f0 !important; }
        .theme-midnight .bg-white.rounded-lg svg, .theme-midnight .ws-logo-box svg { color: #1e293b !important; stroke: #1e293b !important; }

        /* Network Status Badge Fixes - Forced Visibility & Clean Backgrounds */
        .theme-midnight .bg-green-50, .theme-midnight .bg-emerald-50 { background-color: rgba(16, 185, 129, 0.15) !important; border-color: rgba(16, 185, 129, 0.4) !important; color: #34d399 !important; }
        .theme-midnight .bg-yellow-50, .theme-midnight .bg-amber-50 { background-color: rgba(245, 158, 11, 0.15) !important; border-color: rgba(245, 158, 11, 0.4) !important; color: #fbbf24 !important; }
        .theme-midnight .bg-red-50 { background-color: rgba(239, 68, 68, 0.15) !important; border-color: rgba(239, 68, 68, 0.4) !important; color: #f87171 !important; }
        
        .theme-midnight .bg-green-50 span, .theme-midnight .bg-green-50 svg, .theme-midnight .bg-emerald-50 svg,
        .theme-midnight .bg-yellow-50 span, .theme-midnight .bg-yellow-50 svg, .theme-midnight .bg-amber-50 svg,
        .theme-midnight .bg-red-50 span, .theme-midnight .bg-red-50 svg { background-color: transparent !important; color: inherit !important; stroke: currentColor !important; }
        .theme-midnight [class*="bg-"][class*="-50"] svg, .theme-midnight [class*="bg-"][class*="-100"] svg { display: inline-block !important; visibility: visible !important; opacity: 1 !important; }

        /* Card Badges Fixes - Premium Translucent Look for Pillars & Types */
        .theme-midnight .bg-yellow-100 { background-color: rgba(234, 179, 8, 0.15) !important; border-color: rgba(234, 179, 8, 0.4) !important; color: #fde047 !important; }
        .theme-midnight .text-yellow-700, .theme-midnight .bg-yellow-100 *, .theme-midnight .text-yellow-700 * { color: #fde047 !important; }
        
        .theme-midnight .bg-green-100 { background-color: rgba(34, 197, 94, 0.15) !important; border-color: rgba(34, 197, 94, 0.4) !important; color: #86efac !important; }
        .theme-midnight .text-green-700, .theme-midnight .bg-green-100 *, .theme-midnight .text-green-700 * { color: #86efac !important; }
        
        .theme-midnight .bg-purple-100 { background-color: rgba(168, 85, 247, 0.15) !important; border-color: rgba(168, 85, 247, 0.4) !important; color: #d8b4fe !important; }
        .theme-midnight .text-purple-700, .theme-midnight .bg-purple-100 *, .theme-midnight .text-purple-700 * { color: #d8b4fe !important; }
        
        .theme-midnight .bg-blue-100:not([class*="platform"]) { background-color: rgba(59, 130, 246, 0.15) !important; border-color: rgba(59, 130, 246, 0.4) !important; color: #93c5fd !important; }
        .theme-midnight .text-blue-700:not([class*="platform"]), .theme-midnight .bg-blue-100:not([class*="platform"]) * { color: #93c5fd !important; }
        
        .theme-midnight .bg-orange-100 { background-color: rgba(249, 115, 22, 0.15) !important; border-color: rgba(249, 115, 22, 0.4) !important; color: #fdba74 !important; }
        .theme-midnight .text-orange-700, .theme-midnight .bg-orange-100 *, .theme-midnight .text-orange-700 * { color: #fdba74 !important; }
        
        .theme-midnight .bg-amber-100 { background-color: rgba(245, 158, 11, 0.15) !important; border-color: rgba(245, 158, 11, 0.4) !important; color: #fbbf24 !important; }
        .theme-midnight .text-amber-600, .theme-midnight .text-amber-700, .theme-midnight .bg-amber-100 *, .theme-midnight .text-amber-600 * { color: #fbbf24 !important; }

        .theme-midnight .bg-emerald-100 { background-color: rgba(16, 185, 129, 0.15) !important; border-color: rgba(16, 185, 129, 0.4) !important; color: #34d399 !important; }
        .theme-midnight .text-emerald-700, .theme-midnight .bg-emerald-100 *, .theme-midnight .text-emerald-700 * { color: #34d399 !important; }

        .theme-midnight .bg-red-100 { background-color: rgba(239, 68, 68, 0.15) !important; border-color: rgba(239, 68, 68, 0.4) !important; color: #f87171 !important; }
        .theme-midnight .text-red-500, .theme-midnight .text-red-600, .theme-midnight .text-red-700, .theme-midnight .bg-red-100 *, .theme-midnight .text-red-600 * { color: #f87171 !important; }

        .theme-midnight .bg-pink-100 { background-color: rgba(236, 72, 153, 0.15) !important; border-color: rgba(236, 72, 153, 0.4) !important; color: #f472b6 !important; }
        .theme-midnight .text-pink-600, .theme-midnight .text-pink-700, .theme-midnight .bg-pink-100 *, .theme-midnight .text-pink-600 * { color: #f472b6 !important; }
        
        .theme-midnight .bg-yellow-300 { background-color: #facc15 !important; border-color: #eab308 !important; color: #0b0f29 !important; }
        .theme-midnight .bg-yellow-300 * { color: #0b0f29 !important; }

        .theme-midnight .bg-white\\/50, .theme-midnight .bg-white\\/60 { background-color: rgba(255, 255, 255, 0.08) !important; border-color: rgba(255, 255, 255, 0.15) !important; color: #e2e8f0 !important; }
        .theme-midnight .bg-white\\/50 *, .theme-midnight .bg-white\\/60 * { color: #e2e8f0 !important; stroke: #e2e8f0 !important; }

        .theme-midnight .text-mutedForeground, .theme-midnight .text-slate-400 { color: #818cf8 !important; }
        .theme-midnight .text-mutedForeground svg, .theme-midnight .text-slate-400 svg { color: #818cf8 !important; stroke: #818cf8 !important; }

        /* ContentFlow Status Column Headers - Midnight Mode */
        .theme-midnight .bg-slate-100 { background-color: rgba(30, 27, 75, 0.8) !important; border-color: #4338ca !important; color: #c7d2fe !important; }
        .theme-midnight .bg-slate-100 * { color: #c7d2fe !important; }
        .theme-midnight .text-slate-600 { color: #a5b4fc !important; }
        .theme-midnight .bg-blue-100 { background-color: rgba(30, 27, 75, 0.7) !important; border-color: #4f46e5 !important; color: #a5b4fc !important; }
        .theme-midnight .bg-blue-100 * { color: #a5b4fc !important; }
        .theme-midnight .text-blue-600 { color: #818cf8 !important; }
        .theme-midnight .bg-amber-100 { background-color: rgba(120, 53, 15, 0.4) !important; border-color: #d97706 !important; color: #fde68a !important; }
        .theme-midnight .bg-amber-100 * { color: #fde68a !important; }
        .theme-midnight .text-amber-600 { color: #fcd34d !important; }
        .theme-midnight .bg-purple-100 { background-color: rgba(76, 29, 149, 0.4) !important; border-color: #7c3aed !important; color: #ddd6fe !important; }
        .theme-midnight .bg-purple-100 * { color: #ddd6fe !important; }
        .theme-midnight .text-purple-600 { color: #c4b5fd !important; }
        .theme-midnight .bg-emerald-100 { background-color: rgba(6, 78, 59, 0.4) !important; border-color: #059669 !important; color: #a7f3d0 !important; }
        .theme-midnight .bg-emerald-100 * { color: #a7f3d0 !important; }
        .theme-midnight .text-emerald-600 { color: #6ee7b7 !important; }
        .theme-midnight .border-slate-300 { border-color: #4338ca !important; }
        .theme-midnight .border-blue-300 { border-color: #4f46e5 !important; }
        .theme-midnight .border-amber-300 { border-color: #d97706 !important; }
        .theme-midnight .border-purple-300 { border-color: #7c3aed !important; }
        .theme-midnight .border-emerald-300 { border-color: #059669 !important; }
    `,
    pastel: () => `
        body.theme-pastel, .theme-pastel, .theme-pastel main, .theme-pastel .bg-background, .theme-pastel.bg-background { background-color: #fff1f2 !important; }
        .theme-pastel .bg-dot-grid { background-image: radial-gradient(#fda4af 1px, transparent 1px) !important; }
        .theme-pastel header, .theme-pastel aside, .theme-pastel .bg-white, .theme-pastel .bg-card { background-color: #ffe4e6 !important; border-color: #fda4af !important; }
        .theme-pastel .bg-slate-50, .theme-pastel .bg-slate-100, .theme-pastel .bg-slate-200, .theme-pastel .bg-muted { background-color: #fff1f2 !important; border-color: #fecdd3 !important; }
        .theme-pastel .text-slate-900, .theme-pastel .text-slate-800, .theme-pastel .text-slate-700, .theme-pastel .text-foreground { color: #9f1239 !important; }
        .theme-pastel .text-slate-500, .theme-pastel .text-slate-400, .theme-pastel .text-mutedForeground { color: #be185d !important; }
        .theme-pastel .border-slate-900, .theme-pastel .border-slate-800, .theme-pastel .border-slate-200, .theme-pastel .border-border { border-color: #fb7185 !important; }
        .theme-pastel .shadow-hard { box-shadow: 4px 4px 0px 0px #fb7185 !important; }
        .theme-pastel .bg-slate-900 { background-color: #fb7185 !important; color: #fff !important; }
        .theme-pastel .bg-slate-900 * { color: #fff !important; }
        .theme-pastel input, .theme-pastel select, .theme-pastel textarea { background-color: #fff1f2 !important; color: #881337 !important; border-color: #fb7185 !important; }
        .theme-pastel .bg-red-50 { background-color: #fce7f3 !important; border-color: #fbcfe8 !important; color: #be185d !important; }
        .theme-pastel .bg-yellow-400 { background-color: #fb7185 !important; color: #fff !important; }
        .theme-pastel .bg-slate-900 .text-red-500 { color: #ffe4e6 !important; }
        .theme-pastel .bg-slate-900 .hover\\:bg-red-50:hover { background-color: rgba(255,255,255,0.2) !important; color: #fff !important; }
        .theme-pastel .bg-accent { background-color: #fb7185 !important; color: #fff !important; }
        .theme-pastel .bg-accent * { color: #fff !important; }
        .theme-pastel .ws-logo-box { background-color: #ffffff !important; }
   `,
    'pastel-green': () => `
        body.theme-pastel-green, .theme-pastel-green, .theme-pastel-green main, .theme-pastel-green .bg-background, .theme-pastel-green.bg-background { background-color: #f0fdf4 !important; }
        .theme-pastel-green .bg-dot-grid { background-image: radial-gradient(#86efac 1px, transparent 1px) !important; }
        .theme-pastel-green header, .theme-pastel-green aside, .theme-pastel-green .bg-white, .theme-pastel-green .bg-card { background-color: #dcfce7 !important; border-color: #86efac !important; }
        .theme-pastel-green .bg-slate-50, .theme-pastel-green .bg-slate-100, .theme-pastel-green .bg-slate-200, .theme-pastel-green .bg-muted { background-color: #f0fdf4 !important; border-color: #bbf7d0 !important; }
        .theme-pastel-green .text-slate-900, .theme-pastel-green .text-slate-800, .theme-pastel-green .text-slate-700, .theme-pastel-green .text-foreground { color: #166534 !important; }
        .theme-pastel-green .text-slate-500, .theme-pastel-green .text-slate-400, .theme-pastel-green .text-mutedForeground { color: #15803d !important; }
        .theme-pastel-green .border-slate-900, .theme-pastel-green .border-slate-800, .theme-pastel-green .border-slate-200, .theme-pastel-green .border-border { border-color: #4ade80 !important; }
        .theme-pastel-green .shadow-hard { box-shadow: 4px 4px 0px 0px #4ade80 !important; }
        .theme-pastel-green .bg-slate-900 { background-color: #16a34a !important; color: #fff !important; }
        .theme-pastel-green .bg-slate-900 * { color: #fff !important; }
        .theme-pastel-green input, .theme-pastel-green select, .theme-pastel-green textarea { background-color: #f0fdf4 !important; color: #14532d !important; border-color: #4ade80 !important; }
        .theme-pastel-green .bg-red-50 { background-color: #dcfce7 !important; border-color: #bbf7d0 !important; color: #166534 !important; }
        .theme-pastel-green .bg-yellow-400 { background-color: #4ade80 !important; color: #14532d !important; }
        .theme-pastel-green .bg-slate-900 .text-red-500 { color: #dcfce7 !important; }
        .theme-pastel-green .bg-slate-900 .hover\\:bg-red-50:hover { background-color: rgba(255,255,255,0.2) !important; color: #fff !important; }
        .theme-pastel-green .bg-accent { background-color: #16a34a !important; color: #fff !important; }
        .theme-pastel-green .bg-accent * { color: #fff !important; }
        .theme-pastel-green .ws-logo-box { background-color: #ffffff !important; }
   `,
    'pastel-yellow': () => `
        body.theme-pastel-yellow, .theme-pastel-yellow, .theme-pastel-yellow main, .theme-pastel-yellow .bg-background, .theme-pastel-yellow.bg-background { background-color: #fefce8 !important; }
        .theme-pastel-yellow .bg-dot-grid { background-image: radial-gradient(#fde047 1px, transparent 1px) !important; }
        .theme-pastel-yellow header, .theme-pastel-yellow aside, .theme-pastel-yellow .bg-white, .theme-pastel-yellow .bg-card { background-color: #fef9c3 !important; border-color: #fde047 !important; }
        .theme-pastel-yellow .bg-slate-50, .theme-pastel-yellow .bg-slate-100, .theme-pastel-yellow .bg-slate-200, .theme-pastel-yellow .bg-muted { background-color: #fefce8 !important; border-color: #fef08a !important; }
        .theme-pastel-yellow .text-slate-900, .theme-pastel-yellow .text-slate-800, .theme-pastel-yellow .text-slate-700, .theme-pastel-yellow .text-foreground { color: #854d0e !important; }
        .theme-pastel-yellow .text-slate-500, .theme-pastel-yellow .text-slate-400, .theme-pastel-yellow .text-mutedForeground { color: #92400e !important; }
        .theme-pastel-yellow .border-slate-900, .theme-pastel-yellow .border-slate-800, .theme-pastel-yellow .border-slate-200, .theme-pastel-yellow .border-border { border-color: #facc15 !important; }
        .theme-pastel-yellow .shadow-hard { box-shadow: 4px 4px 0px 0px #facc15 !important; }
        .theme-pastel-yellow .bg-slate-900 { background-color: #ca8a04 !important; color: #fff !important; }
        .theme-pastel-yellow .bg-slate-900 * { color: #fff !important; }
        .theme-pastel-yellow input, .theme-pastel-yellow select, .theme-pastel-yellow textarea { background-color: #fefce8 !important; color: #713f12 !important; border-color: #facc15 !important; }
        .theme-pastel-yellow .bg-red-50 { background-color: #fef9c3 !important; border-color: #fef08a !important; color: #854d0e !important; }
        .theme-pastel-yellow .bg-yellow-400 { background-color: #facc15 !important; color: #713f12 !important; }
        .theme-pastel-yellow .bg-slate-900 .text-red-500 { color: #fef9c3 !important; }
        .theme-pastel-yellow .bg-slate-900 .hover\\:bg-red-50:hover { background-color: rgba(255,255,255,0.2) !important; color: #fff !important; }
        .theme-pastel-yellow .bg-accent { background-color: #ca8a04 !important; color: #fff !important; }
        .theme-pastel-yellow .bg-accent * { color: #fff !important; }
        .theme-pastel-yellow .ws-logo-box { background-color: #ffffff !important; }
   `,
    custom: (color) => `
        body.theme-custom, .theme-custom, .theme-custom main { background-color: ${color}15 !important; }
        .theme-custom .bg-background { background-color: ${color}10 !important; }
        .theme-custom .bg-dot-grid { background-image: radial-gradient(${color}33 1px, transparent 1px) !important; }
        .theme-custom header, .theme-custom aside, .theme-custom .bg-card, .theme-custom .bg-white { background-color: #ffffff !important; border-color: ${color}66 !important; }
        .theme-custom .bg-slate-50, .theme-custom .bg-slate-100, .theme-custom .bg-muted { background-color: ${color}08 !important; border-color: ${color}22 !important; }
        /* Text colors - always dark for readability on light custom backgrounds */
        .theme-custom .text-slate-900, .theme-custom .text-slate-800, .theme-custom .text-slate-700,
        .theme-custom .text-foreground { color: #1e293b !important; }
        .theme-custom .text-slate-500, .theme-custom .text-slate-400,
        .theme-custom .text-mutedForeground { color: #64748b !important; }
        /* Headings use custom color only if it's dark enough (handled by contrast) */
        .theme-custom h1.text-foreground, .theme-custom h2.text-foreground, .theme-custom h3.text-foreground { color: #1e293b !important; }
        .theme-custom .border-slate-900, .theme-custom .border-slate-200, .theme-custom .border-border { border-color: ${color}44 !important; }
        .theme-custom .shadow-hard { box-shadow: 4px 4px 0px 0px ${color} !important; }
        /* Interactive Elements - buttons/badges with custom color */
        .theme-custom .bg-slate-900, .theme-custom .bg-slate-800, .theme-custom .bg-slate-700 { background-color: ${color} !important; color: #fff !important; }
        .theme-custom .bg-slate-900 *, .theme-custom .bg-slate-800 *, .theme-custom .bg-slate-700 * { color: #fff !important; stroke: #fff !important; }
        .theme-custom input, .theme-custom select, .theme-custom textarea { background-color: #fff !important; border-color: ${color}88 !important; color: #1e293b !important; }
        .theme-custom .bg-accent { background-color: ${color} !important; color: #fff !important; }
        .theme-custom .bg-accent * { color: #fff !important; stroke: #fff !important; }
        /* Sidebar nav active state */
        .theme-custom aside .bg-accent, .theme-custom aside [class*="bg-accent"] { background-color: ${color} !important; }
        .theme-custom aside .bg-accent *, .theme-custom aside [class*="bg-accent"] * { color: #fff !important; }
        /* Chart & Metric Fixes */
        .theme-custom .recharts-text, .theme-custom .recharts-legend-item-text { fill: #1e293b !important; color: #1e293b !important; font-weight: 700 !important; }
        .theme-custom .recharts-cartesian-grid-horizontal line, .theme-custom .recharts-cartesian-grid-vertical line { stroke: ${color}22 !important; }
        /* Maintain accessibility on colored sections */
        .theme-custom [class*="bg-"][class*="-500"] *,
        .theme-custom [class*="bg-"][class*="-600"] *,
        .theme-custom [class*="bg-"][class*="-700"] *,
        .theme-custom [class*="bg-"][class*="-800"] *,
        .theme-custom [class*="bg-"][class*="-900"] *,
        .theme-custom [class*="bg-accent"] * { color: #fff !important; }
        .theme-custom .bg-yellow-400, .theme-custom .bg-yellow-400 * { color: #1e293b !important; }
        /* Card badges - keep readable */
        .theme-custom .bg-yellow-100, .theme-custom .bg-green-100, .theme-custom .bg-blue-100,
        .theme-custom .bg-purple-100, .theme-custom .bg-red-100, .theme-custom .bg-amber-100,
        .theme-custom .bg-emerald-100, .theme-custom .bg-pink-100, .theme-custom .bg-orange-100 { background-color: inherit; }
        /* Ensure text in muted/card areas is always readable */
        .theme-custom .bg-card p, .theme-custom .bg-card span, .theme-custom .bg-card div:not([class*="bg-"]) { color: inherit; }
        /* Workspace logo box stays white */
        .theme-custom .ws-logo-box { background-color: #ffffff !important; border-color: ${color}44 !important; }
   `
};
import { useNavigate } from 'react-router-dom';
import { useNotifications } from './NotificationProvider';
import { useAppConfig } from './AppConfigProvider';
import { CheckCircle2 } from 'lucide-react';
import { notifyDevelopers } from '../services/notificationService';

interface LayoutProps {
    children: React.ReactNode;
}

// --- LAYOUT COMPONENT ---

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>({ id: '1', name: 'Arunika Personal', role: 'Owner' });
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const location = useLocation();

    // Global Config
    const { config, loading: configLoading } = useAppConfig();

    // Settings State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'webapp' | null>('profile');

    // Mobile Notification Page State
    const [showMobileNotifications, setShowMobileNotifications] = useState(false);

    // Live Time for Header
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Notification State
    const { notifications, unreadCount, markAsRead, markAllAsRead, handleNotificationClick, clearAllNotifications } = useNotifications();
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationOpen(false);
            }
        };

        if (isNotificationOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isNotificationOpen]);

    // Role & Subscription Notification State
    const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
    const [showSubExpiredModal, setShowSubExpiredModal] = useState(false);

    // Payment Extension State
    const [daysToSubExp, setDaysToSubExp] = useState<number | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showRenewalSuccessModal, setShowRenewalSuccessModal] = useState(false);

    // Broadcast State
    const [activeBroadcast, setActiveBroadcast] = useState<{ id: string, title: string, message: string, type: string } | null>(null);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
    const [showEmailSetupModal, setShowEmailSetupModal] = useState(false);
    const [userEmail, setUserEmail] = useState('');


    // Status Modal State
    const [statusModal, setStatusModal] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'confirm';
        message: string;
        title?: string;
        onConfirm?: () => void;
    }>({ isOpen: false, type: 'success', message: '' });

    // Network State
    const [networkStatus, setNetworkStatus] = useState<'good' | 'unstable' | 'bad' | 'offline'>('good');
    const [latency, setLatency] = useState(0);

    // Context Theme State
    const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('app_ui_theme') || 'light');
    const [customColor, setCustomColor] = useState(() => localStorage.getItem('app_custom_color') || '#8b5cf6');
    const [showThemeModal, setShowThemeModal] = useState(false);

    // User Profile State
    const [userProfile, setUserProfile] = useState({
        id: localStorage.getItem('user_id') || '',
        name: localStorage.getItem('user_name') || 'User',
        role: localStorage.getItem('user_role') || 'Member',
        avatar: localStorage.getItem('user_avatar') || 'https://picsum.photos/40/40',
        jobTitle: localStorage.getItem('user_job_title') || '',
        subscriptionPackage: localStorage.getItem('user_subscription_package') || 'Personal',
        parentUserId: localStorage.getItem('parent_user_id') || null
    });

    // Branding State
    const [branding, setBranding] = useState({
        appName: localStorage.getItem('app_name') || 'Aruneeka Content Planner Pro',
        appLogo: localStorage.getItem('app_logo') || '',
        appLogoLight: localStorage.getItem('app_logo_light') || '',
        appFavicon: localStorage.getItem('app_favicon') || '',
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- ROLE CHECKERS ---
    const isDeveloper = userProfile.role === 'Developer';
    const isAdmin = userProfile.role === 'Admin' || userProfile.role === 'Owner' || isDeveloper;

    // 3. Fetch Latest User Profile from Supabase
    const fetchUserProfile = async () => {
        const userId = localStorage.getItem('user_id');
        if (!userId) return;

        try {
            const { data, error } = await supabase.from('app_users')
                .select('id, full_name, role, avatar_url, job_title, subscription_end, subscription_package, parent_user_id')
                .eq('id', userId)
                .single();
            if (data && !error) {
                const profileData = {
                    id: data.id,
                    name: data.full_name || 'User',
                    role: data.role || 'Member',
                    avatar: data.avatar_url || 'https://picsum.photos/40/40',
                    jobTitle: data.job_title || '',
                    subscriptionPackage: data.subscription_package || 'Personal',
                    parentUserId: data.parent_user_id
                };
                setUserProfile(profileData);

                // Abuse Protection: Check if more than 2 free trial accounts from same device
                if (profileData.subscriptionPackage === 'Free' && profileData.role !== 'Developer') {
                    const fingerprint = btoa(navigator.userAgent + screen.width + screen.height).slice(0, 32);
                    const { data: trialCount } = await supabase.rpc('check_trial_abuse', { fingerprint_check: fingerprint });
                    if (trialCount > 2) {
                        console.warn('Abuse detected. Protocol: Force Logout.');
                        handleLogout();
                        window.location.href = '/login?abuse=true';
                        return;
                    }
                }

                if (data.subscription_end) {
                    localStorage.setItem('subscription_end', data.subscription_end);
                } else {
                    localStorage.removeItem('subscription_end');
                }

                window.dispatchEvent(new Event('sub_updated'));

                // Keep localStorage in sync
                localStorage.setItem('user_name', profileData.name);
                localStorage.setItem('user_role', profileData.role);
                localStorage.setItem('user_avatar', profileData.avatar);
                localStorage.setItem('user_subscription_package', profileData.subscriptionPackage);
                if (profileData.parentUserId) localStorage.setItem('parent_user_id', profileData.parentUserId);
                else localStorage.removeItem('parent_user_id');
            }
        } catch (err) {
            console.warn("Failed to fetch user profile from DB, using localStorage fallback.");
        }
    };

    // --- INIT EFFECT ---
    useEffect(() => {
        // 1. Check Network
        const checkNetwork = async () => {
            if (!navigator.onLine) {
                setNetworkStatus('offline');
                return;
            }
            const ms = await checkConnectionLatency();
            setLatency(ms);
            if (ms === -1) setNetworkStatus('offline');
            else if (ms < 300) setNetworkStatus('good');
            else if (ms < 800) setNetworkStatus('unstable');
            else setNetworkStatus('bad');
        };
        checkNetwork();
        const interval = setInterval(checkNetwork, 10000);

        // Theme Load
        const savedTheme = localStorage.getItem('app_ui_theme');
        if (savedTheme) setCurrentTheme(savedTheme);
        const savedColor = localStorage.getItem('app_custom_color');
        if (savedColor) setCustomColor(savedColor);

        // Global Config is now managed by AppConfigProvider
        fetchUserProfile();

        // Check for first login setup
        if (localStorage.getItem('is_first_login') === 'true') {
            setShowFirstLoginModal(true);
        }

        // Check if user needs to set up real email
        const checkEmailSetup = async () => {
            const userId = localStorage.getItem('user_id');
            if (!userId) return;
            if (localStorage.getItem('email_setup_complete') === 'true') return;

            // Check if skip was recent (wait 24h before showing again)
            const skippedAt = localStorage.getItem('email_setup_skipped');
            if (skippedAt) {
                const hoursSinceSkip = (Date.now() - new Date(skippedAt).getTime()) / (1000 * 60 * 60);
                if (hoursSinceSkip < 24) return;
            }

            const { data } = await supabase.from('app_users').select('email').eq('id', userId).single();
            if (data?.email?.endsWith('@team.contentflow.app') || !data?.email) {
                setUserEmail(data?.email || '');
                setShowEmailSetupModal(true);
            }
        };
        checkEmailSetup();


        // 4. Listen for User Updates (Sync between Profile page and Layout)
        const handleUserUpdate = () => {
            setUserProfile({
                id: localStorage.getItem('user_id') || '',
                name: localStorage.getItem('user_name') || 'User',
                role: localStorage.getItem('user_role') || 'Member',
                avatar: localStorage.getItem('user_avatar') || 'https://picsum.photos/40/40',
                jobTitle: localStorage.getItem('user_job_title') || '',
                subscriptionPackage: localStorage.getItem('user_subscription_package') || 'Personal',
                parentUserId: localStorage.getItem('parent_user_id') || null
            });
        };
        window.addEventListener('user_updated', handleUserUpdate);
        window.addEventListener('sub_updated', handleUserUpdate);

        // 5. Global Event Listeners
        const handleOpenPayment = () => setShowPaymentModal(true);
        const handleAppAlert = (e: any) => {
            setStatusModal({
                isOpen: true,
                type: e.detail.type || 'success',
                message: e.detail.message,
                title: e.detail.title
            });
        };
        const handleAppConfirm = (e: any) => {
            setStatusModal({
                isOpen: true,
                type: 'confirm',
                message: e.detail.message,
                title: e.detail.title || 'Konfirmasi',
                onConfirm: e.detail.onConfirm
            });
        };

        window.addEventListener('open-payment-modal', handleOpenPayment);
        window.addEventListener('app-alert', handleAppAlert);
        window.addEventListener('app-confirm', handleAppConfirm);

        // 6. Fetch Global Broadcast
        const fetchLatestBroadcast = async () => {
            const { data } = await supabase
                .from('global_broadcasts')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) {
                // We just sync the ID but don't show the modal automatically on refresh
                // This satisfies the request to only show it "saat dikirimkan" (Realtime)
                localStorage.setItem('seen_broadcast_id', data.id);
            }
        };
        fetchLatestBroadcast();

        // 7. Realtime Listener for New Broadcasts
        const broadcastChannel = supabase
            .channel('global_broadcast_listener')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'global_broadcasts' },
                (payload: any) => {
                    const newMsg = payload.new;
                    const currentUserId = localStorage.getItem('user_id');
                    // Show to all users EXCEPT the sender (developer who sent it)
                    if (newMsg && newMsg.is_active && newMsg.sender_id !== currentUserId) {
                        setActiveBroadcast(newMsg);
                        setShowBroadcastModal(true);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'global_broadcasts' },
                (payload: any) => {
                    const newMsg = payload.new;
                    const currentUserId = localStorage.getItem('user_id');
                    // Show updated broadcast to all users except sender
                    if (newMsg && newMsg.is_active && newMsg.sender_id !== currentUserId) {
                        const seenId = localStorage.getItem('seen_broadcast_id');
                        if (seenId !== newMsg.id) {
                            setActiveBroadcast(newMsg);
                            setShowBroadcastModal(true);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            clearInterval(interval);
            window.removeEventListener('user_updated', handleUserUpdate);
            window.removeEventListener('sub_updated', handleUserUpdate);
            window.removeEventListener('open-payment-modal', handleOpenPayment);
            window.removeEventListener('app-alert', handleAppAlert);
            window.removeEventListener('app-confirm', handleAppConfirm);
            supabase.removeChannel(broadcastChannel);
        };
    }, []);

    // Dedicated Theme Sync Effect
    useEffect(() => {
        const syncTheme = () => {
            const root = document.documentElement;
            // Remove all theme classes
            const classesToRemove: string[] = [];
            root.classList.forEach(cls => {
                if (cls.startsWith('theme-')) classesToRemove.push(cls);
            });
            classesToRemove.forEach(cls => root.classList.remove(cls));

            // Add current theme
            if (currentTheme !== 'light') {
                root.classList.add(`theme-${currentTheme}`);
            }
        };
        syncTheme();
    }, [currentTheme]);

    // Helper to clear session but preserve theme
    const clearSessionPreserveTheme = () => {
        const theme = localStorage.getItem('app_ui_theme');
        const customColor = localStorage.getItem('app_custom_color');
        const seenBroadcast = localStorage.getItem('seen_broadcast_id');
        localStorage.clear();
        if (theme) localStorage.setItem('app_ui_theme', theme);
        if (customColor) localStorage.setItem('app_custom_color', customColor);
        if (seenBroadcast) localStorage.setItem('seen_broadcast_id', seenBroadcast);
    };

    // --- BRANDING EFFECT (Title & Favicon & Icons) ---
    useEffect(() => {
        document.title = branding.appName;
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        if (branding.appFavicon) link.href = branding.appFavicon;
        else if (branding.appLogo) link.href = branding.appLogo;

        // Update Web App Icon meta tags for mobile/PWA
        if (config?.app_icon_192 || config?.app_icon_512 || config?.app_icon_mask) {
            // Remove old manifest if exists
            let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
            if (manifestLink) manifestLink.remove();

            // Create new manifest with icons
            const manifest = {
                name: config.app_name || 'Aruneeka',
                short_name: config.app_name || 'Aruneeka',
                icons: [
                    ...(config.app_icon_192 ? [{
                        src: config.app_icon_192,
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                    }] : []),
                    ...(config.app_icon_512 ? [{
                        src: config.app_icon_512,
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any'
                    }] : []),
                    ...(config.app_icon_mask ? [{
                        src: config.app_icon_mask,
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'maskable'
                    }] : [])
                ],
                theme_color: currentTheme === 'dark' || currentTheme === 'midnight' ? '#0f172a' : '#f8fafc',
                background_color: currentTheme === 'dark' || currentTheme === 'midnight' ? '#0f172a' : '#ffffff',
                display: 'standalone',
                scope: '/',
                start_url: '/'
            };

            // Create blob and URL
            const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
            const manifestUrl = URL.createObjectURL(blob);

            // Add manifest link
            manifestLink = document.createElement('link');
            manifestLink.rel = 'manifest';
            manifestLink.href = manifestUrl;
            document.head.appendChild(manifestLink);

            // Update apple-touch-icon - CRITICAL for iOS home screen
            // Try to find existing link by id first, then by rel
            let appleLink = document.getElementById('apple-touch-icon-link') as HTMLLinkElement || document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
            
            // Only set if URL is valid and HTTPS
            if (config.app_icon_192 && config.app_icon_192.startsWith('https://')) {
                if (!appleLink) {
                    appleLink = document.createElement('link');
                    appleLink.id = 'apple-touch-icon-link';
                    appleLink.rel = 'apple-touch-icon';
                    document.head.appendChild(appleLink);
                }
                appleLink.href = config.app_icon_192;
                console.log('✅ Branding: Apple Touch Icon updated:', config.app_icon_192);
            } else {
                // No valid icon - use fallback
                console.log('⚠️ Invalid or missing app_icon_192. Using fallback icon. Config:', config.app_icon_192);
            }
        }
    }, [branding, config?.app_icon_192, config?.app_icon_512, config?.app_icon_mask, currentTheme]);

    // Sync local branding state with global config (including icons)
    useEffect(() => {
        if (config) {
            setBranding({
                appName: config.app_name || 'Aruneeka Content Planner Pro',
                appLogo: config.app_logo || '',
                appLogoLight: config.app_logo_light || '',
                appFavicon: config.app_favicon || ''
            });
            // Update cache for next refresh - only store small text values, not long URLs
            localStorage.setItem('app_name', config.app_name);
            // Don't store long image URLs in localStorage to avoid quota exceeded
            // These are fetched fresh from config which is already cached in memory
            
            // EARLY: Set apple-touch-icon immediately when config loads
            // This is critical for iOS home screen icon to work
            // Only set if URL is valid and HTTPS to prevent iOS fallback
            if (config.app_icon_192 && config.app_icon_192.startsWith('https://')) {
                let appleLink = document.getElementById('apple-touch-icon-link') as HTMLLinkElement;
                if (!appleLink) {
                    appleLink = document.createElement('link');
                    appleLink.id = 'apple-touch-icon-link';
                    appleLink.rel = 'apple-touch-icon';
                    document.head.appendChild(appleLink);
                }
                appleLink.href = config.app_icon_192;
                console.log('✅ Apple Touch Icon set:', config.app_icon_192);
            } else {
                console.warn('⚠️ app_icon_192 not configured or invalid URL. Using fallback icon.');
            }
        }
    }, [config]);

    // --- THEME SYNC WITH BODY & HTML ---
    useEffect(() => {
        // Remove all possible theme classes from body and html (root)
        const themeClasses = ['theme-light', 'theme-dark', 'theme-midnight', 'theme-pastel', 'theme-pastel-green', 'theme-pastel-yellow', 'theme-custom'];
        document.body.classList.remove(...themeClasses);
        document.documentElement.classList.remove(...themeClasses);

        // Add current theme class
        document.body.classList.add(`theme-${currentTheme}`);
        document.documentElement.classList.add(`theme-${currentTheme}`);
    }, [currentTheme]);

    // Listen for Role & Subscription Changes via Realtime + Local Poll
    useEffect(() => {
        const currentUserId = localStorage.getItem('user_id');
        const tenantId = localStorage.getItem('tenant_id');
        if (!currentUserId) return;

        // 1. Realtime Listener for Current User
        const userChannel = supabase
            .channel('app_users_status_checker')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'app_users', filter: `id=eq.${currentUserId}` },
                async (payload: any) => {
                    const newRole = payload.new.role;
                    const oldRole = localStorage.getItem('user_role');

                    // A. Role check
                    if (newRole && oldRole && newRole !== oldRole) {
                        setShowRoleChangeModal(true);
                    }

                    // B. Active & Sub check
                    if (payload.new.is_active === false) {
                        setShowSubExpiredModal(true);
                    }
                    if (payload.new.subscription_end && userProfile.role !== 'Developer') {
                        localStorage.setItem('subscription_end', payload.new.subscription_end);
                        if (new Date() > new Date(payload.new.subscription_end)) {
                            // Auto deactivate
                            await supabase.from('app_users').update({ is_active: false }).eq('id', currentUserId);
                            setShowSubExpiredModal(true);
                        } else {
                            window.dispatchEvent(new Event('sub_updated'));
                        }
                    } else {
                        localStorage.removeItem('subscription_end'); // unlimited
                        window.dispatchEvent(new Event('sub_updated'));
                    }
                }
            )
            .subscribe();

        // 1c. Listen for New Notifications from NotificationProvider
        const handleNewNotification = (e: any) => {
            if (e.detail.type === 'renewal_success') {
                setShowRenewalSuccessModal(true);
                fetchUserProfile();
            }
        };
        window.addEventListener('new-notification', handleNewNotification);

        // 1b. Realtime Listener for Admin/Tenant (Auto Logout if Admin Deactivated)
        let tenantChannel: any = null;
        if (tenantId && tenantId !== currentUserId) {
            tenantChannel = supabase
                .channel('app_users_admin_checker')
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'app_users', filter: `id=eq.${tenantId}` },
                    (payload: any) => {
                        if (payload.new.is_active === false) {
                            setStatusModal({
                                isOpen: true,
                                type: 'error',
                                message: 'Sesi berakhir karena Administrator tim Anda telah dinonaktifkan.'
                            });
                            setTimeout(() => {
                                clearSessionPreserveTheme();
                                navigate('/login');
                            }, 3000);
                        }
                    }
                )
                .subscribe();
        }

        // 2. Local Polling for Time-based Expiration & Tenant Check
        const checkExpiration = async () => {
            if (userProfile.role === 'Developer') return;
            const subEnd = localStorage.getItem('subscription_end');
            if (subEnd) {
                const endDate = new Date(subEnd);
                const now = new Date();

                // If past endDate and it's not the exact same calendar day
                if (now > endDate && now.getDate() !== endDate.getDate()) {
                    setShowSubExpiredModal(true);
                    await supabase.from('app_users').update({ is_active: false }).eq('id', currentUserId);
                    localStorage.removeItem('subscription_end'); // prevent looping updates
                    setDaysToSubExp(null);
                } else {
                    const diffTime = endDate.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays <= 5) {
                        setDaysToSubExp(diffDays < 0 ? 0 : diffDays);
                        console.log(`[Subscription] Banner showing! Days left: ${diffDays} `);
                    } else {
                        setDaysToSubExp(null);
                        console.log(`[Subscription] Banner hidden.Days left: ${diffDays} (Target <= 5)`);
                    }
                }
            } else {
                setDaysToSubExp(null);
            }

            // Check Admin Status periodically just in case realtime drops
            if (tenantId && tenantId !== currentUserId) {
                const { data: adminData } = await supabase.from('app_users').select('is_active').eq('id', tenantId).single();
                if (adminData && adminData.is_active === false) {
                    setStatusModal({
                        isOpen: true,
                        type: 'error',
                        message: 'Akses dihentikan: Administrator tim Anda sudah tidak aktif.'
                    });
                    setTimeout(() => {
                        clearSessionPreserveTheme();
                        navigate('/login');
                    }, 3000);
                }
            }
        };

        checkExpiration();
        const subInterval = setInterval(checkExpiration, 15000); // Check every 15 seconds
        window.addEventListener('sub_updated', checkExpiration);

        return () => {
            supabase.removeChannel(userChannel);
            if (tenantChannel) supabase.removeChannel(tenantChannel);
            clearInterval(subInterval);
            window.removeEventListener('sub_updated', checkExpiration);
            window.removeEventListener('new-notification', handleNewNotification);
        };
    }, []);

    // Handlers
    const handleLogout = () => {
        if (confirm('Apakah Anda yakin ingin keluar?')) {
            clearSessionPreserveTheme();
            navigate('/login');
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        const oldAvatar = localStorage.getItem('user_avatar');
        const newAvatar = userProfile.avatar;

        // 1. Save to LocalStorage
        localStorage.setItem('user_name', userProfile.name);
        localStorage.setItem('user_role', userProfile.role);
        localStorage.setItem('user_avatar', userProfile.avatar);
        localStorage.setItem('user_job_title', userProfile.jobTitle);

        // Trigger event for other components
        window.dispatchEvent(new Event('user_updated'));

        // 2. Persist to Database
        const userId = localStorage.getItem('user_id');
        if (userId) {
            try {
                // A. Update User Table
                const { error } = await supabase.from('app_users').update({
                    full_name: userProfile.name,
                    role: userProfile.role,
                    avatar_url: userProfile.avatar,
                    job_title: userProfile.jobTitle
                }).eq('id', userId);

                if (error) console.warn("Failed to sync profile to DB:", error);

                // B. Sync Avatar to Workspaces (Stack Views)
                if (oldAvatar && newAvatar && oldAvatar !== newAvatar) {
                    // Fetch all workspaces where the old avatar might be in members list
                    const { data: workspaces } = await supabase.from('workspaces').select('id, members');

                    if (workspaces) {
                        for (const ws of workspaces) {
                            if (ws.members && ws.members.includes(oldAvatar)) {
                                // Replace old avatar with new avatar in the array
                                const newMembers = ws.members.map((m: string) => m === oldAvatar ? newAvatar : m);
                                await supabase.from('workspaces').update({ members: newMembers }).eq('id', ws.id);
                            }
                        }
                    }
                }

            } catch (err) {
                console.warn("DB Update Error:", err);
            }
        }
        alert("Profil berhasil diperbarui dan disinkronisasi!");
    };

    const handleSaveBranding = async (e: React.FormEvent) => {
        e.preventDefault();

        // Only Developer can save branding
        if (!isDeveloper) {
            alert("Akses ditolak. Halaman ini khusus untuk Developer.");
            return;
        }

        // 1. Update State & LocalStorage (Optimistic)
        localStorage.setItem('app_name', branding.appName);
        localStorage.setItem('app_logo', branding.appLogo);
        localStorage.setItem('app_logo_light', branding.appLogoLight);
        localStorage.setItem('app_favicon', branding.appFavicon);

        // 2. Persist to Global Config Table
        try {
            const { error } = await supabase.from('app_config').upsert({
                id: 1,
                app_name: branding.appName,
                app_logo: branding.appLogo,
                app_logo_light: branding.appLogoLight,
                app_favicon: branding.appFavicon
            });
            if (error) throw error;
            alert("Branding Global berhasil diperbarui!");
        } catch (err) {
            console.error(err);
            alert("Gagal menyimpan ke database global. Cek koneksi.");
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'user' | 'app' | 'favicon' | 'app_light') => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { alert("File terlalu besar (Max 5MB)"); return; }
            const reader = new FileReader();
            reader.onloadend = () => {
                const res = reader.result as string;
                if (type === 'user') setUserProfile(p => ({ ...p, avatar: res }));
                else if (type === 'app') setBranding(b => ({ ...b, appLogo: res }));
                else if (type === 'app_light') setBranding(b => ({ ...b, appLogoLight: res }));
                else if (type === 'favicon') setBranding(b => ({ ...b, appFavicon: res }));
            };
            reader.readAsDataURL(file);
        }
    };

    // UI Helpers
    const [selectedPackageId, setSelectedPackageId] = useState('');
    const [paymentProof, setPaymentProof] = useState('');
    const [selectedTier, setSelectedTier] = useState<'personal' | 'team'>('personal');
    const [teamSize, setTeamSize] = useState(2);

    useEffect(() => {
        // Sync selectedPackageId with first package from config based on tier
        const getPackages = () => {
            if (selectedTier === 'personal') {
                return config?.payment_config?.personalPackages?.length
                    ? config.payment_config.personalPackages
                    : config?.payment_config?.packages || [];
            }
            return config?.payment_config?.teamPackages || [];
        };

        const pkgs = getPackages();
        if (pkgs.length > 0) {
            // Only auto-select if current selection is not valid for new list or empty
            if (!pkgs.find(p => p.id === selectedPackageId)) {
                setSelectedPackageId(pkgs[0].id);
            }
        } else if (!selectedPackageId) {
            setSelectedPackageId('1-month'); // Legacy fallback
        }
    }, [config, selectedTier]);

    const handlePaymentProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { alert("File terlalu besar (Max 5MB)"); return; }
            const reader = new FileReader();
            reader.onloadend = () => setPaymentProof(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const submitPaymentConfirmation = async () => {
        if (!paymentProof) {
            setStatusModal({ isOpen: true, type: 'error', message: 'Harap lampirkan bukti pembayaran.' });
            return;
        }

        if (selectedTier === 'team' && teamSize < 2) {
            setStatusModal({ isOpen: true, type: 'error', message: 'Paket tim tidak bisa diisi hanya 1 orang. Minimal 2 orang (Admin + 1 Anggota).' });
            return;
        }

        try {
            const userId = localStorage.getItem('user_id');
            const userEmail = localStorage.getItem('user_email') || ''; // Assuming email is stored, or we can use empty
            const username = localStorage.getItem('user_username') || '';

            // Extract numeric price and duration if available from selectedPackage string
            // selectedPackage format: "Package Name (Rp 150.000)"
            // Extract data from selectedPackageId
            let amount = 0;
            let packageName = '';
            let durationDays = 30;

            const getPackages = () => {
                if (selectedTier === 'personal') {
                    return config?.payment_config?.personalPackages?.length
                        ? config.payment_config.personalPackages
                        : config?.payment_config?.packages || [];
                }
                return config?.payment_config?.teamPackages || [];
            };

            const pkgs = getPackages();
            const pkg = pkgs.find(p => p.id === selectedPackageId);
            if (pkg) {
                amount = pkg.price;
                packageName = `${selectedTier === 'personal' ? 'Personal' : 'Team'}: ${pkg.name} `;
                durationDays = pkg.durationDays || 30;

                // Adjust amount if team tier
                if (selectedTier === 'team') {
                    const rate = pkg.price || config?.payment_config?.teamPricePerPerson || 0;
                    amount = rate * teamSize;
                    packageName = `Team: ${pkg.name} (${teamSize} Orang)`;
                }
            }

            // Hardcoded Fallbacks if config missing or match failed
            if (!packageName) {
                if (selectedPackageId === '1-month') { amount = 150000; packageName = "1 Bulan"; durationDays = 30; }
                else if (selectedPackageId === '3-month') { amount = 400000; packageName = "3 Bulan"; durationDays = 90; }
                else if (selectedPackageId === 'lifetime') { amount = 1500000; packageName = "Lifetime"; durationDays = 36500; }
                else { packageName = selectedPackageId; } // Last resort
            }

            const { error } = await supabase.from('developer_inbox').insert([{
                user_id: userId,
                sender_name: userProfile.name,
                sender_email: userEmail,
                sender_username: username,
                subscription_code: userProfile.subscription_code || '', // Pass current code as fallback
                type: 'renewal',
                package_name: packageName,
                amount: amount,
                proof_url: paymentProof,
                duration_days: durationDays,
                message: `User ${userProfile.name} mengajukan perpanjangan langganan: ${packageName}.`
            }]);

            if (error) throw error;

            await notifyDevelopers({
                title: 'Konfirmasi Pembayaran Baru!',
                content: `${userProfile.name} telah mengirimkan bukti perpanjangan untuk paket ${packageName}.`,
                metadata: { type: 'renewal', user_id: userId, package: packageName }
            });

            setStatusModal({ isOpen: true, type: 'success', message: 'Bukti pembayaran berhasil dikirim! Developer akan segera memproses akun Anda.' });
            setShowPaymentModal(false);
            setPaymentProof('');
        } catch (err) {
            console.error(err);
            setStatusModal({ isOpen: true, type: 'error', message: 'Gagal mengirim konfirmasi. Coba sebentar lagi.' });
        }
    };

    const getNetworkColor = () => {
        switch (networkStatus) {
            case 'good': return 'text-green-500 bg-green-50 border-green-200';
            case 'unstable': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
            case 'bad': return 'text-red-500 bg-red-50 border-red-200';
            default: return 'text-slate-400 bg-slate-100 border-slate-200';
        }
    };

    const getNetworkLabel = () => {
        switch (networkStatus) {
            case 'good': return 'Online';
            case 'unstable': return 'Unstable';
            case 'bad': return 'Bad Conn.';
            default: return 'Offline';
        }
    };

    const toggleTab = (tab: 'profile' | 'branding' | 'webapp') => {
        setActiveTab(activeTab === tab ? null : tab);
    };

    type NavItem = {
        id: string;
        path: string;
        label: string;
        icon: React.ElementType;
        badge?: number | null;
        adminOnly?: boolean;
        developerOnly?: boolean;
    };

    const NAV_ITEMS: Record<string, NavItem[]> = {
        'Work Station': [
            { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'messages', path: '/messages', label: 'Messages', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : null },
            { id: 'plan', path: '/plan', label: 'Content Plan', icon: Layers },
            { id: 'flow', path: '/flow', label: 'Content Flow', icon: GitBranch },
            { id: 'calendar', path: '/calendar', label: 'Content Calendar', icon: CalendarDays },
            { id: 'approval', path: '/approval', label: 'Approval Area', icon: CheckCircle },
            { id: 'insight', path: '/insight', label: 'Content Data Insight', icon: Presentation },
            { id: 'carousel', path: '/carousel', label: 'Aruneeka makeDesign', icon: ImageIcon },
            { id: 'kpi', path: '/script', label: 'Team KPI Board', icon: BarChart2 },
        ],
        'Admin Zone': [
            { id: 'team', path: '/admin/team', label: 'Team Management', icon: Briefcase, adminOnly: true },
        ],
        'Superuser': [
            { id: 'users', path: '/admin/users', label: 'User Management', icon: Users, developerOnly: true },
            { id: 'inbox', path: '/admin/inbox', label: 'Developer Inbox', icon: Inbox, developerOnly: true },
            { id: 'analytics', path: '/admin/analytics', label: 'Analytics', icon: BarChart3, developerOnly: true },
            { id: 'workspace', path: '/admin/workspace', label: 'Workspace Settings', icon: Settings, developerOnly: true },
        ]
    };

    return (
        <>
            <div className={`flex h-screen w-full overflow-hidden bg-background relative theme-${currentTheme}`}>
                <UserPresence />
                {currentTheme !== 'light' && <style dangerouslySetInnerHTML={{ __html: THEME_STYLES[currentTheme](customColor) }} />}
                {/* Sidebar (Fixed position always - Hidden on Mobile) */}
                <aside
                    className={`hidden md:flex fixed inset-y-0 left-0 z-40 bg-card border-r-2 border-slate-200 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex-col ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-20 translate-x-0'}`}
                >
                    <div className={`h-auto flex flex-col shrink-0 py-10 transition-all duration-500 ${isSidebarOpen ? 'items-start px-8' : 'items-center px-0'} `}>
                        <div className={`flex items-center transition-all duration-500 ${isSidebarOpen ? 'justify-start w-full' : 'justify-center'} `}>
                            {(() => {
                                const isDarkTheme = currentTheme === 'dark' || currentTheme === 'midnight';
                                const activeLogo = isDarkTheme
                                    ? (config?.app_logo_light || branding.appLogoLight || config?.app_logo || branding.appLogo)
                                    : (config?.app_logo || branding.appLogo);

                                const favicon = config?.app_favicon || branding.appFavicon;

                                if (isSidebarOpen && activeLogo) {
                                    return <img src={activeLogo} className="max-w-[300px] max-h-20 object-contain animate-in fade-in duration-500" alt="Logo" />;
                                }

                                if (!isSidebarOpen && favicon) {
                                    return <img src={favicon} className="w-10 h-10 object-contain animate-in fade-in zoom-in duration-500 rounded-lg" alt="Favicon" />;
                                }

                                return (
                                    <div className={`bg-accent rounded-xl border-2 border-slate-800 flex items-center justify-center shadow-hard transition-all duration-500 ${isSidebarOpen ? 'w-14 h-14' : 'w-10 h-10'} `}>
                                        <Layers className="text-white" size={isSidebarOpen ? 28 : 20} />
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto py-4 px-4 custom-scrollbar">
                        {daysToSubExp !== null && daysToSubExp <= 5 && (
                            <div
                                onClick={() => setShowPaymentModal(true)}
                                className="w-full bg-red-500 border-4 border-slate-900 rounded-[24px] p-6 cursor-pointer hover:bg-red-600 transition-all shadow-[8px_8px_0px_#000] mb-8 relative group overflow-hidden"
                            >
                                <div className="relative z-10 text-white">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border-2 border-slate-900 shadow-hard-mini">
                                            <AlertTriangle size={20} className="text-red-600" />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-[0.2em]">Peringatan</span>
                                    </div>
                                    <h3 className="text-xl font-black leading-tight mb-2">
                                        {daysToSubExp === 0 ? "Hari ini" : `${daysToSubExp} Hari Lagi`} Langganan Habis!
                                    </h3>
                                    <p className="text-sm font-bold text-white/90 leading-relaxed mb-6">
                                        Segera perpanjang akun Anda agar akses tidak terhenti.
                                    </p>
                                    <button className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl Lowercase tracking-widest hover:bg-slate-800 transition-all border-2 border-slate-900 shadow-[4px_4px_0px_#fff] active:translate-y-1 active:shadow-none">
                                        Perpanjang Layanan
                                    </button>
                                </div>
                            </div>
                        )}
                        {Object.entries(NAV_ITEMS).map(([section, items]) => {
                            const filteredItems = items.filter(item => {
                                if (item.adminOnly && !isAdmin) return false;
                                if (item.developerOnly && !isDeveloper) return false;

                                // Developer bypasses all visual hiding logic to see everything
                                if (isDeveloper) return true;

                                // Package-based visibility restrictions & Role Access
                                if (item.id === 'team') {
                                    // Developer bypasses
                                    if (isDeveloper) return true;

                                    // Must be Admin/Owner AND Self-Registered (no parent)
                                    const isSelfRegisteredAdmin = (userProfile.role === 'Admin' || userProfile.role === 'Owner') && !userProfile.parentUserId;
                                    if (!isSelfRegisteredAdmin) return false;

                                    // Allow self-registered admins to see Team Mgmt regardless of package 
                                    // so they can manage/upgrade their team.
                                    return true;
                                }

                                // Known core pages that are visible by default unless explicitly hidden
                                const CORE_PAGES = ['dashboard', 'messages', 'plan', 'flow', 'calendar', 'approval', 'insight', 'carousel', 'kpi', 'team', 'users', 'inbox', 'workspace'];

                                const isHidden = config?.hidden_pages?.includes(item.id);

                                // Messages is always globally visible to all users
                                if (item.id === 'messages') return true;

                                // Safety: While loading for the first time (no cache),
                                // assume hidden for everything except dashboard to prevent flickering.
                                if (!config && configLoading && item.id !== 'dashboard') return false;

                                if (CORE_PAGES.includes(item.id)) {
                                    if (isHidden) return false;
                                } else {
                                    // For completely new pages added to NAV_ITEMS later: 
                                    // they are HIDDEN by default from non-developers.
                                    // The developer must explicitly 'unhide' them in Workspace Settings.
                                    // If a new page is NOT in hidden_pages, what does it mean?
                                    // Let's consider a new page visible ONLY if it is explicitly NOT hidden
                                    // Wait, if it's hidden by default, and`hidden_pages` means hidden, 
                                    // then we can't unhide it using`hidden_pages`. 
                                    // As a workaround, we treat`hidden_pages` for non-core pages as a WHITELIST if we invert logic,
                                    // but the UI uses`includes(id)` as hidden. 
                                    // If it's fully new (not in CORE_PAGES) and not explicitly set up in config.page_titles, hide it.
                                    if (!config?.page_titles?.[item.id]?.isGlobalVisible) return false;
                                }

                                return true;
                            });
                            if (filteredItems.length === 0) return null;
                            return (
                                <div key={section} className="mb-8 font-heading">
                                    {isSidebarOpen && (
                                        <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 animate-in fade-in slide-in-from-left-2">{section}</h3>
                                    )}
                                    <div className="space-y-1 flex flex-col items-center w-full">
                                        {filteredItems.map((item) => {
                                            const isActive = location.pathname === item.path;
                                            return (
                                                <button
                                                    key={item.path}
                                                    onClick={() => navigate(item.path)}
                                                    className={`flex items-center transition-all duration-500 group overflow-hidden ${isSidebarOpen ? 'w-full justify-start px-4 py-3 rounded-xl' : 'w-12 h-12 justify-center rounded-xl'} ${isActive ? 'bg-accent text-white shadow-hard-mini' : 'text-slate-500 hover:bg-slate-500/10 hover:text-accent'} ${isActive && isSidebarOpen ? 'translate-x-1' : ''} `}
                                                    title={!isSidebarOpen ? item.label : ''}
                                                >
                                                    <div className={`flex items-center ${isSidebarOpen ? 'gap-4 min-w-[200px]' : 'justify-center'} `}>
                                                        <item.icon size={20} className={`shrink-0 transition-all duration-500 ${isActive ? 'text-white' : 'group-hover:text-accent'} `} />
                                                        {isSidebarOpen && (
                                                            <span className={`font-bold text-sm tracking-tight whitespace-nowrap transition-all duration-500 ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'} `}>
                                                                {item.label}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.badge && isSidebarOpen && (
                                                        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-accent animate-in zoom-in">{item.badge}</span>
                                                    )}
                                                    {item.badge && !isSidebarOpen && (
                                                        <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className={`p-4 mt-auto border-t-2 border-slate-50 shrink-0 flex flex-col transition-all duration-500 items-center`}>
                        <button onClick={() => setShowThemeModal(true)} className={`flex items-center rounded-xl text-slate-500 hover:bg-slate-500/10 hover:text-accent transition-all font-bold text-sm mb-1 py-3 ${isSidebarOpen ? 'w-full px-4 gap-4' : 'w-12 h-12 justify-center'}`} title="UI Theme">
                            <Palette size={20} className="shrink-0" />
                            {isSidebarOpen && (
                                <span className="transition-all duration-500 opacity-100 whitespace-nowrap">UI Theme</span>
                            )}
                        </button>
                        <button onClick={handleLogout} className={`flex items-center rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-all font-bold text-sm py-3 ${isSidebarOpen ? 'w-full px-4 gap-4' : 'w-12 h-12 justify-center'}`} title="Sign Out">
                            <LogOut size={20} className="shrink-0" />
                            {isSidebarOpen && (
                                <span className="transition-all duration-500 opacity-100 whitespace-nowrap">Sign Out</span>
                            )}
                        </button>
                        {isSidebarOpen && (
                            <p className="text-[10px] text-slate-400 font-bold text-left px-4 mt-4 opacity-70 italic animate-in fade-in">v{config?.app_version || '1.0.5'} • {config?.app_name || branding.appName}</p>
                        )}
                    </div>
                </aside>

                {/* Main Wrapper-Uses padding left instead of flex width sharing */}
                <div className={`flex flex-col h-screen overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] w-full min-w-0 ${isSidebarOpen ? 'md:pl-72' : 'pl-0 md:pl-20'}`}>
                    <PresenceToast />
                    <ChatNotificationListener />
                    {/* Mobile & Tablet top safe area spacer - pushes header below status bar */}
                    <div className="lg:hidden flex-shrink-0 mobile-safe-top-spacer"></div>
                    <header className={`mt-0 sm:mt-0 lg:mt-4 shrink-0 z-50 mx-2 sm:mx-3 md:mx-4 lg:mx-6 mb-3 sm:mb-4 md:mb-3 lg:mb-2 h-auto sm:h-auto md:h-16 lg:h-20 bg-card rounded-lg sm:rounded-xl md:rounded-2xl border-2 border-border shadow-hard items-center justify-between px-4 sm:px-4 md:px-6 py-2 sm:py-2 md:py-3 lg:py-0 transition-all max-w-full ${location.pathname.startsWith('/carousel') ? 'hidden md:flex' : 'flex'}`}>

                        {/* ── MOBILE HEADER (< md) ── */}
                        <div className="flex md:hidden items-center justify-between w-full gap-1 pb-2">
                            {/* Left: Favicon/Logo */}
                            <div className="flex items-center flex-shrink-0">
                                {(() => {
                                    const isDarkTheme = currentTheme === 'dark' || currentTheme === 'midnight';
                                    const favicon = config?.app_favicon || branding.appFavicon;
                                    const activeLogo = isDarkTheme
                                        ? (config?.app_logo_light || branding.appLogoLight || config?.app_logo || branding.appLogo)
                                        : (config?.app_logo || branding.appLogo);
                                    if (favicon) return <img src={favicon} className="w-8 h-8 object-contain rounded-lg" alt="Logo" />;
                                    if (activeLogo) return <img src={activeLogo} className="max-h-7 max-w-[100px] object-contain" alt="Logo" />;
                                    return <div className="font-heading font-black text-sm text-accent tracking-tighter">CF</div>;
                                })()}
                            </div>

                            {/* Right: Connection + Notif + Settings + More */}
                            <div className="flex items-center gap-0.5 ml-auto">
                                {/* Network indicator */}
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[9px] font-bold transition-colors ${getNetworkColor()}`}>
                                    <Wifi size={11} />
                                </div>
                                {/* Notification Bell - opens full-screen notification page on mobile */}
                                <button onClick={() => setShowMobileNotifications(true)} className={`p-2 rounded-full transition-all relative ${showMobileNotifications ? 'text-accent bg-accent/5' : 'text-slate-500'}`}>
                                    <Bell size={18} />
                                    {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border border-white text-[7px] text-white flex items-center justify-center font-black">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                                </button>
                                <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-500 rounded-full transition-all"><Settings size={18} /></button>
                                <button onClick={() => setShowMobileMenu(!showMobileMenu)} className={`p-2 rounded-full transition-all ${showMobileMenu ? 'text-accent bg-accent/5' : 'text-slate-500'}`}><Menu size={18} /></button>
                            </div>
                        </div>

                        {/* ── DESKTOP HEADER (≥ md) ── */}
                        <div className="hidden md:flex items-center gap-3 md:gap-4">
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors shrink-0"><Menu size={22} /></button>
                            <div className="flex flex-col justify-center animate-in fade-in slide-in-from-left duration-500">
                                <span className="text-[10px] lg:text-[12px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                    {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                                <span className="text-sm lg:text-lg font-black text-slate-900 font-heading tracking-tight leading-none">
                                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                </span>
                            </div>
                        </div>

                        <div className="hidden md:flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-6">
                            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 py-1 relative">
                                <div className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border text-[10px] sm:text-[11px] font-bold transition-colors ${getNetworkColor()}`}>
                                    <Wifi size={14} className="sm:w-4 sm:h-4 md:w-4 md:h-4" />
                                    <span className="hidden sm:inline">{getNetworkLabel()}</span>
                                </div>
                                <div className="flex items-center gap-1 relative" ref={notificationRef}>
                                    <button onClick={() => setIsNotificationOpen(!isNotificationOpen)} className={`p-2 sm:p-2.5 rounded-full transition-all relative ${isNotificationOpen ? 'text-accent bg-accent/5' : 'text-slate-500 hover:text-accent hover:bg-slate-500/10'} `}>
                                        <Bell size={20} className="sm:w-5 sm:h-5 md:w-5.5 md:h-5.5" />
                                        {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 sm:w-4.5 sm:h-4.5 bg-red-500 rounded-full border-2 border-white text-[8px] sm:text-[10px] text-white flex items-center justify-center font-black">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                                    </button>
                                    {isNotificationOpen && (
                                        <div className="absolute top-full right-0 mt-2 sm:mt-3 w-[90vw] max-w-sm md:max-w-md lg:w-[400px] bg-card border-2 border-border shadow-hard rounded-lg sm:rounded-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 border-b-2 border-border flex items-center justify-between bg-muted/50">
                                                <div className="flex items-center gap-1.5 sm:gap-2"><Bell size={14} className="sm:w-4 sm:h-4 text-accent" /><span className="font-black font-heading text-slate-800 tracking-tight text-sm md:text-lg">Notifikasi</span></div>
                                                {unreadCount > 0 && <button onClick={(e) => { e.stopPropagation(); markAllAsRead(); }} className="text-[8px] sm:text-[10px] font-black text-accent hover:underline uppercase tracking-widest bg-accent/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg">Tandai</button>}
                                            </div>
                                            <div className="max-h-[280px] sm:max-h-[320px] overflow-y-auto custom-scrollbar">
                                                {notifications.length === 0 ? (
                                                    <div className="py-8 sm:py-12 flex flex-col items-center justify-center text-slate-400"><Bell size={32} className="sm:w-10 sm:h-10 opacity-10 mb-2" /><p className="font-bold text-xs sm:text-sm">Tidak ada notifikasi</p></div>
                                                ) : (
                                                    <div className="divide-y divide-border">
                                                        {notifications.map((notif) => (
                                                            <div key={notif.id} className={`p-4 flex gap-3 transition-colors hover:bg-muted/50 cursor-pointer relative ${!notif.is_read ? 'bg-accent/5' : ''}`} onClick={() => { handleNotificationClick(notif); setIsNotificationOpen(false); }}>
                                                                {!notif.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent"></div>}
                                                                <div className="shrink-0">
                                                                    {notif.actor?.avatar_url ? <img src={notif.actor.avatar_url} alt="" className="w-10 h-10 rounded-full border border-border object-cover" /> : <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-mutedForeground border border-border"><User size={18} /></div>}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex justify-between items-start mb-0.5"><h5 className="font-black text-[9px] text-accent uppercase tracking-widest truncate pr-2">{notif.title}</h5><span className="text-[9px] text-slate-400 font-medium">{new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div>
                                                                    <p className="text-xs font-bold text-slate-600 leading-snug">
                                                                        {notif.actor?.full_name && !notif.metadata?.hide_actor_name && (
                                                                            <span className="text-slate-900">{notif.actor.full_name} </span>
                                                                        )}
                                                                        {notif.content}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 text-slate-500 hover:text-accent hover:bg-slate-500/10 rounded-full transition-all"><Settings size={22} /></button>
                            </div>

                            <div className="h-6 w-[2px] bg-slate-100"></div>
                            <div className="flex items-center gap-3 md:gap-4 pl-1 cursor-pointer group" onClick={() => navigate('/profile')}>
                                <div className="text-right hidden md:block">
                                    <p className="font-bold text-sm md:text-base text-slate-800 leading-tight group-hover:text-accent transition-colors">{userProfile.name}</p>
                                    <p className="text-[11px] md:text-xs text-slate-500 font-bold">{userProfile.jobTitle || userProfile.role}</p>
                                </div>
                                <div className="relative">
                                    <img src={userProfile.avatar} alt="User" className="w-11 h-11 md:w-13 md:h-13 rounded-full border-2 border-slate-200 group-hover:border-accent transition-colors object-cover" />
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className={`flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar min-h-0 bg-background w-full ${location.pathname.startsWith('/carousel') ? 'p-2 sm:p-3 md:p-4 md:px-6 md:py-8 md:pb-8' : 'p-4 sm:p-4 md:p-6 md:py-6 md:pb-6 lg:px-6 lg:py-8 lg:pb-8 pb-20 sm:pb-20 md:pb-6 lg:pb-8'}`}>
                        <div className="animate-bounce-in flex-1 min-h-0 flex flex-col w-full max-w-full">
                            {children}
                        </div>
                    </main>
                </div>

                {/* --- MODALS --- */}
                <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Pengaturan Aplikasi">
                    <div className="space-y-4">
                        <div className={`rounded-xl border-2 border-slate-800 overflow-hidden shadow-hard transition-all duration-300 ${activeTab === 'profile' ? 'bg-card' : 'bg-card hover:bg-slate-500/5'} `}>
                            <button onClick={() => toggleTab('profile')} className={`w-full flex items-center justify-between p-4 font-black font-heading text-lg transition-colors ${activeTab === 'profile' ? 'bg-accent text-white' : 'text-foreground'} `}>
                                <div className="flex items-center gap-3"><User size={20} className={activeTab === 'profile' ? 'text-white' : 'text-accent'} /> Informasi Pengguna</div>
                                {activeTab === 'profile' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {activeTab === 'profile' && (
                                <div className="p-6 bg-card animate-in slide-in-from-top-2 duration-300">
                                    <form onSubmit={handleSaveProfile} className="space-y-4 sm:space-y-5">
                                        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 md:gap-6">
                                            <div className="relative group cursor-pointer w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-slate-800 bg-muted shadow-sm flex-shrink-0">
                                                <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Upload size={16} className="text-white sm:w-5 sm:h-5" /></div>
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload(e, 'user')} />
                                            </div>
                                            <div className="flex-1 text-center sm:text-left"><h4 className="font-bold text-sm sm:text-lg text-foreground">Foto Profil</h4><p className="text-xs sm:text-sm text-mutedForeground">Klik avatar untuk mengganti.</p></div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <Input label="Nama Lengkap" value={userProfile.name} onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })} />
                                            <Input label="Jabatan" value={userProfile.jobTitle} onChange={(e) => setUserProfile({ ...userProfile, jobTitle: e.target.value })} />
                                        </div>
                                        <div className="flex flex-col gap-1 w-full">
                                            <label className="font-bold text-[10px] sm:text-xs text-mutedForeground ml-1">Role Aplikasi</label>
                                            <select className="w-full bg-card border-2 border-slate-300 text-foreground rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm outline-none transition-all focus:border-accent" value={userProfile.role} onChange={(e) => setUserProfile({ ...userProfile, role: e.target.value })} disabled={!isAdmin && userProfile.role !== 'Developer'}>
                                                <option value="Member">Member</option><option value="Admin">Admin</option><option value="Owner">Owner</option><option value="Developer">Developer</option>
                                            </select>
                                        </div>
                                        <div className="pt-2 flex justify-center sm:justify-end"><Button type="submit" className="bg-accent w-full sm:w-auto" icon={<CheckCircle size={16} />}>Simpan Profil</Button></div>
                                    </form>
                                </div>
                            )}
                        </div>

                        {isDeveloper && (
                            <>
                                <div className={`rounded-xl border-2 border-slate-800 overflow-hidden shadow-hard transition-all duration-300 ${activeTab === 'branding' ? 'bg-card' : 'bg-card hover:bg-slate-500/5'} `}>
                                    <button onClick={() => toggleTab('branding')} className={`w-full flex items-center justify-between p-4 font-black font-heading text-lg transition-colors ${activeTab === 'branding' ? 'bg-secondary text-white' : 'text-foreground'} `}>
                                        <div className="flex items-center gap-3"><Palette size={20} className={activeTab === 'branding' ? 'text-white' : 'text-secondary'} /> Tampilan Aplikasi (Admin)</div>
                                        {activeTab === 'branding' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                    {activeTab === 'branding' && (
                                        <div className="p-4 sm:p-5 md:p-6 bg-card animate-in slide-in-from-top-2 duration-300">
                                            <form onSubmit={handleSaveBranding} className="space-y-4 sm:space-y-5 md:space-y-6">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                                                    <div className="flex flex-col gap-2">
                                                        <label className="font-bold text-[10px] sm:text-xs md:text-sm text-mutedForeground">Logo Sidebar (Standard)</label>
                                                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 border-2 border-dashed border-slate-300 rounded-lg sm:rounded-xl bg-slate-500/5 hover:bg-card transition-colors relative cursor-pointer group">
                                                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-card border-2 border-slate-200 rounded-lg flex items-center justify-center p-2 flex-shrink-0">{branding.appLogo ? <img src={branding.appLogo} alt="Logo" className="w-full h-full object-contain" /> : <Layers size={20} className="text-slate-300 sm:w-6 sm:h-6" />}</div>
                                                            <div><p className="font-bold text-foreground text-[10px] sm:text-xs md:text-sm text-center">Upload PNG</p></div>
                                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload(e, 'app')} />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <label className="font-bold text-[10px] sm:text-xs md:text-sm text-mutedForeground">&nbsp;</label>
                                                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 border-2 border-dashed border-slate-300 rounded-lg sm:rounded-xl bg-slate-500/10 hover:bg-slate-500/20 transition-colors relative cursor-pointer group">
                                                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-card border-2 border-slate-700 rounded-lg flex items-center justify-center p-2 flex-shrink-0">{branding.appLogoLight ? <img src={branding.appLogoLight} alt="Logo Light" className="w-full h-full object-contain" /> : <Layers size={20} className="text-slate-600 sm:w-6 sm:h-6" />}</div>
                                                            <div><p className="font-bold text-foreground text-[10px] sm:text-xs md:text-sm text-center">Upload PNG Putih</p></div>
                                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload(e, 'app_light')} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <Input label="Nama Aplikasi" value={branding.appName} onChange={(e) => setBranding({ ...branding, appName: e.target.value })} />
                                                <div className="pt-2 flex justify-center sm:justify-end"><Button type="submit" className="bg-secondary w-full sm:w-auto" icon={<CheckCircle size={16} />}>Simpan Global</Button></div>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Webapp Icon & Favicon Settings - Available to all users */}
                        <div className={`rounded-xl border-2 border-slate-800 overflow-hidden shadow-hard transition-all duration-300 ${activeTab === 'webapp' ? 'bg-card' : 'bg-card hover:bg-slate-500/5'} `}>
                            <button onClick={() => toggleTab('webapp')} className={`w-full flex items-center justify-between p-4 font-black font-heading text-lg transition-colors ${activeTab === 'webapp' ? 'bg-emerald-600 text-white' : 'text-foreground'} `}>
                                <div className="flex items-center gap-3"><Smartphone size={20} className={activeTab === 'webapp' ? 'text-white' : 'text-emerald-600'} /> Ikon Webapp & Favicon</div>
                                {activeTab === 'webapp' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            {activeTab === 'webapp' && (
                                <div className="p-4 sm:p-5 md:p-6 bg-card animate-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-5">
                                        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                                            <p className="text-xs font-bold text-emerald-700 leading-relaxed">
                                                <span className="font-black">Favicon</span> adalah ikon kecil yang muncul di tab browser. <span className="font-black">Ikon Webapp</span> digunakan saat aplikasi ditambahkan ke layar utama perangkat mobile (Add to Home Screen).
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Favicon Upload */}
                                            <div className="flex flex-col gap-2">
                                                <label className="font-bold text-xs text-mutedForeground flex items-center gap-1.5">
                                                    <Globe size={12} className="text-emerald-600" /> Favicon (Browser Tab)
                                                </label>
                                                <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-emerald-300 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 transition-colors relative cursor-pointer group">
                                                    <div className="w-16 h-16 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center p-2 shadow-sm">
                                                        {branding.appFavicon
                                                            ? <img src={branding.appFavicon} alt="Favicon" className="w-full h-full object-contain" />
                                                            : <Globe size={24} className="text-slate-300" />
                                                        }
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-bold text-foreground text-xs">Upload Favicon</p>
                                                        <p className="text-[10px] text-mutedForeground">PNG/ICO, 32×32 atau 64×64px</p>
                                                    </div>
                                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,.ico" onChange={(e) => handleImageUpload(e, 'favicon')} />
                                                </div>
                                                {branding.appFavicon && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setBranding(b => ({ ...b, appFavicon: '' }))}
                                                        className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1 justify-center"
                                                    >
                                                        <X size={10} /> Hapus Favicon
                                                    </button>
                                                )}
                                            </div>

                                            {/* Webapp Icon Upload */}
                                            <div className="flex flex-col gap-2">
                                                <label className="font-bold text-xs text-mutedForeground flex items-center gap-1.5">
                                                    <Smartphone size={12} className="text-emerald-600" /> Ikon Webapp (Mobile)
                                                </label>
                                                <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed border-emerald-300 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 transition-colors relative cursor-pointer group">
                                                    <div className="w-16 h-16 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center p-2 shadow-sm">
                                                        {branding.appFavicon
                                                            ? <img src={branding.appFavicon} alt="Webapp Icon" className="w-full h-full object-contain rounded-xl" />
                                                            : <Smartphone size={24} className="text-slate-300" />
                                                        }
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-bold text-foreground text-xs">Upload Ikon Webapp</p>
                                                        <p className="text-[10px] text-mutedForeground">PNG, 192×192 atau 512×512px</p>
                                                    </div>
                                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload(e, 'favicon')} />
                                                </div>
                                                <p className="text-[10px] text-mutedForeground text-center">Ikon ini juga digunakan sebagai favicon</p>
                                            </div>
                                        </div>

                                        {/* Preview Section */}
                                        {branding.appFavicon && (
                                            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
                                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Preview</p>
                                                <div className="flex items-center gap-6 flex-wrap">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                                                            <img src={branding.appFavicon} alt="" className="w-4 h-4 object-contain" />
                                                            <span className="text-xs text-slate-600 font-medium">{branding.appName}</span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400">Browser Tab</span>
                                                    </div>
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="w-14 h-14 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center shadow-md p-2">
                                                            <img src={branding.appFavicon} alt="" className="w-full h-full object-contain rounded-xl" />
                                                        </div>
                                                        <span className="text-[10px] text-slate-400">Home Screen</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {isDeveloper && (
                                            <div className="pt-2 flex justify-center sm:justify-end">
                                                <Button type="button" onClick={(e) => handleSaveBranding(e as any)} className="bg-emerald-600 w-full sm:w-auto" icon={<CheckCircle size={16} />}>
                                                    Simpan Ikon Global
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>

                <Modal isOpen={showRoleChangeModal} onClose={() => { }} title="Pemberitahuan Sistem">
                    <div className="flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 text-center space-y-3 sm:space-y-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-2"><Shield className="w-6 h-6 sm:w-8 sm:h-8" /></div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-800">Perubahan Akses</h3>
                        <p className="text-xs sm:text-sm text-slate-500">Role Anda telah berubah. Silakan login ulang.</p>
                        <button onClick={() => { clearSessionPreserveTheme(); navigate('/login'); }} className="w-full px-4 sm:px-6 py-2 sm:py-3 bg-slate-800 text-white font-bold rounded-lg sm:rounded-xl border-2 border-slate-900 shadow-hard text-sm sm:text-base">Login Ulang</button>
                    </div>
                </Modal>

                <Modal isOpen={showSubExpiredModal} onClose={() => { }} title="Akses Ditangguhkan">
                    <div className="flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 text-center space-y-3 sm:space-y-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-2"><Power className="w-6 h-6 sm:w-8 sm:h-8" /></div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-800">Akses Terhenti</h3>
                        <p className="text-xs sm:text-sm text-slate-500">Masa aktif subscription habis.</p>
                        <button onClick={() => { clearSessionPreserveTheme(); navigate('/login'); }} className="w-full px-6 py-3 bg-red-500 text-white font-bold rounded-xl border-2 border-red-700 shadow-hard">Keluar</button>
                    </div>
                </Modal>

                <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Perpanjang Masa Langganan">
                    <div className="p-4 space-y-5">
                        <p className="text-sm text-slate-600 font-bold">Harap lengkapi detail perpanjangan di bawah ini.</p>

                        <div className="flex bg-slate-100 p-1 rounded-2xl border-2 border-slate-200">
                            <button
                                onClick={() => setSelectedTier('personal')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${selectedTier === 'personal' ? 'bg-white text-accent border-2 border-slate-900 shadow-hard-mini' : 'text-slate-500'} `}
                            >
                                <User size={16} /> Personal
                            </button>
                            <button
                                onClick={() => setSelectedTier('team')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${selectedTier === 'team' ? 'bg-white text-secondary border-2 border-slate-900 shadow-hard-mini' : 'text-slate-500'} `}
                            >
                                <Users size={16} /> Team
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Pilih Paket {selectedTier === 'personal' ? 'Personal' : 'Team'}</label>
                            <select
                                className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-accent transition-colors"
                                value={selectedPackageId}
                                onChange={(e) => setSelectedPackageId(e.target.value)}
                            >
                                {(() => {
                                    const pkgs = selectedTier === 'personal'
                                        ? (config?.payment_config?.personalPackages?.length ? config.payment_config.personalPackages : (config?.payment_config?.packages || []))
                                        : (config?.payment_config?.teamPackages || []);

                                    if (pkgs.length > 0) {
                                        return pkgs.map(pkg => (
                                            <option key={pkg.id} value={pkg.id}>
                                                {pkg.name} (Rp {pkg.price.toLocaleString('id-ID')}{selectedTier === 'team' ? ' / orang' : ''})
                                            </option>
                                        ));
                                    }

                                    // Fallback for personal
                                    if (selectedTier === 'personal') {
                                        return (
                                            <>
                                                <option value="1-month">1 Bulan (Rp 150.000)</option>
                                                <option value="3-month">3 Bulan (Rp 400.000)</option>
                                                <option value="lifetime">Lifetime (Rp 1.500.000)</option>
                                            </>
                                        );
                                    }

                                    return <option value="">Belum ada paket team tersedia</option>;
                                })()}
                            </select>
                            {selectedTier === 'team' && (config?.payment_config?.teamPackages?.length || 0) === 0 && (
                                <p className="text-[10px] font-bold text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                    Saat ini belum ada paket khusus tim. Silakan hubungi admin untuk penawaran khusus.
                                </p>
                            )}
                        </div>

                        {selectedTier === 'team' && (
                            <div className="space-y-3 bg-secondary/5 border-2 border-secondary/20 rounded-2xl p-4 animate-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-secondary uppercase tracking-widest">Jumlah Anggota Tim</label>
                                    <div className="flex items-center bg-white border-2 border-slate-900 rounded-xl overflow-hidden shadow-hard-mini">
                                        <button
                                            onClick={() => setTeamSize(Math.max(2, teamSize - 1))}
                                            className="w-10 h-10 flex items-center justify-center font-black text-slate-800 hover:bg-slate-100 border-r-2 border-slate-900"
                                        >-</button>
                                        <input
                                            type="number"
                                            value={teamSize}
                                            onChange={(e) => setTeamSize(Math.max(2, parseInt(e.target.value) || 2))}
                                            className="w-12 h-10 text-center font-black text-slate-800 focus:outline-none"
                                        />
                                        <button
                                            onClick={() => setTeamSize(teamSize + 1)}
                                            className="w-10 h-10 flex items-center justify-center font-black text-slate-800 hover:bg-slate-100 border-l-2 border-slate-900"
                                        >+</button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-secondary/20">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Estimasi Total</span>
                                    <span className="font-black text-secondary">
                                        {(() => {
                                            const pkg = config?.payment_config?.teamPackages?.find(p => p.id === selectedPackageId);
                                            const rate = pkg ? pkg.price : (config?.payment_config?.teamPricePerPerson || 0);
                                            return `Rp ${(rate * teamSize).toLocaleString('id-ID')} `;
                                        })()}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5 space-y-3">
                            <div>
                                <h4 className="font-black text-sm text-slate-800">Instruksi Pembayaran</h4>
                                <p className="text-xs font-bold text-slate-500">Kirim pembayaran sesuai paket The Content Flow Anda.</p>
                            </div>
                            <div className="bg-white border-2 border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{config?.payment_config?.bankName || 'Bank BCA'}</p>
                                <p className="text-2xl font-black text-slate-800 font-mono tracking-wider mt-1 mb-1">{config?.payment_config?.accountNumber || '291 102 3456'}</p>
                                <p className="text-xs font-bold text-slate-500">A.N. {config?.payment_config?.accountName || 'PT Arunika Media Integra'}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Bukti Transfer (Screenshot/Foto)</label>
                            <div className="relative group cursor-pointer border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-white transition-colors overflow-hidden">
                                {paymentProof ? (
                                    <img src={paymentProof} alt="Bukti" className="w-full h-40 object-cover" />
                                ) : (
                                    <div className="p-6 text-center">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-200 mb-3"><Upload className="text-slate-400" size={20} /></div>
                                        <p className="text-xs font-bold text-slate-500">Pilih file gambar atau foto.</p>
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={handlePaymentProofUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        </div>

                        <Button
                            onClick={submitPaymentConfirmation}
                            className="w-full h-14 bg-accent mt-6 shadow-hard-mini"
                            icon={<CheckCircle size={18} />}
                            disabled={!paymentProof}
                        >
                            Konfirmasi Pembayaran
                        </Button>
                    </div>
                </Modal>

                <Modal isOpen={showRenewalSuccessModal} onClose={() => setShowRenewalSuccessModal(false)} title="Pembayaran Berhasil">
                    <div className="p-8 text-center space-y-4">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-200">
                            <CheckCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">Selamat!</h2>
                        <p className="text-slate-500 font-bold leading-relaxed">
                            Subscription Anda sudah diperpanjang. Terima kasih telah melakukan pembayaran dan tetap berlangganan layanan kami.
                        </p>
                        <Button onClick={() => setShowRenewalSuccessModal(false)} className="w-full bg-slate-900 mt-4">
                            Tutup
                        </Button>
                    </div>
                </Modal>

                <Modal
                    isOpen={showBroadcastModal}
                    onClose={() => {
                        if (activeBroadcast) {
                            localStorage.setItem('seen_broadcast_id', activeBroadcast.id);
                        }
                        setShowBroadcastModal(false);
                    }}
                    title={activeBroadcast?.type || 'Pengumuman'}
                >
                    <div className="p-6 space-y-4 text-center">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 border-4 border-slate-900 shadow-hard-mini ${activeBroadcast?.type === 'Promo' ? 'bg-amber-400' : activeBroadcast?.type === 'Maintenance' ? 'bg-red-400' : 'bg-accent'
                            } `}>
                            <Bell className="text-white" size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 font-heading leading-tight uppercase italic">{activeBroadcast?.title}</h3>
                            <p className="text-slate-500 font-bold mt-2 leading-relaxed">
                                {activeBroadcast?.message}
                            </p>
                        </div>
                        {/* Action buttons: Reload Now + Later */}
                        <div className="flex gap-3 mt-4">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    if (activeBroadcast) {
                                        localStorage.setItem('seen_broadcast_id', activeBroadcast.id);
                                    }
                                    setShowBroadcastModal(false);
                                }}
                                className="flex-1 h-12"
                            >
                                Nanti
                            </Button>
                            <Button
                                onClick={() => {
                                    if (activeBroadcast) {
                                        localStorage.setItem('seen_broadcast_id', activeBroadcast.id);
                                    }
                                    setShowBroadcastModal(false);
                                    window.location.reload();
                                }}
                                className="flex-1 h-12"
                            >
                                Reload Sekarang
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* Status Modal */}
                <Modal isOpen={statusModal.isOpen} onClose={() => setStatusModal({ ...statusModal, isOpen: false })} title={statusModal.title || (statusModal.type === 'success' ? 'Sukses' : statusModal.type === 'error' ? 'Gagal' : 'Konfirmasi')}>
                    <div className="p-8 text-center space-y-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-900 shadow-hard-mini ${statusModal.type === 'success' ? 'bg-emerald-100 text-emerald-600' : statusModal.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'} `}>
                            {statusModal.type === 'success' ? <CheckCircle size={32} /> : statusModal.type === 'error' ? <XCircle size={32} /> : <AlertTriangle size={32} />}
                        </div>
                        <p className="text-slate-800 font-bold">{statusModal.message}</p>
                        <div className="flex gap-3 pt-4">
                            {statusModal.type === 'confirm' ? (
                                <>
                                    <Button onClick={() => setStatusModal({ ...statusModal, isOpen: false })} variant="outline" className="flex-1">Batal</Button>
                                    <Button onClick={() => { statusModal.onConfirm?.(); setStatusModal({ ...statusModal, isOpen: false }); }} className="flex-1 bg-slate-900 text-white">Ya, Lanjutkan</Button>
                                </>
                            ) : (
                                <Button onClick={() => setStatusModal({ ...statusModal, isOpen: false })} className="w-full bg-slate-900 text-white mt-4">Tutup</Button>
                            )}
                        </div>
                    </div>
                </Modal>

                {/* Theme Modal */}
                {
                    showThemeModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <div className="bg-card border-4 border-slate-900 rounded-3xl p-6 w-[700px] shadow-[8px_8px_0px_0px_#0f172a] relative animate-in zoom-in-95 duration-200">
                                <button onClick={() => setShowThemeModal(false)} className="absolute top-4 right-4 hover:bg-slate-500/10 p-2 rounded-xl transition-colors">
                                    <X size={20} />
                                </button>
                                <h2 className="font-black text-2xl mb-6 flex items-center gap-2 text-foreground">
                                    <Palette className="text-accent" /> UI Theme Configuration
                                </h2>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { id: 'light', name: 'Light (Default)', colors: ['#f8fafc', '#ffffff', '#0f172a'] },
                                        { id: 'dark', name: 'Dark Mode', colors: ['#0f172a', '#1e293b', '#f8fafc'] },
                                        { id: 'midnight', name: 'Midnight', colors: ['#0c1130', '#1e1b4b', '#e0e7ff'] },
                                        { id: 'pastel', name: 'Pastel Pink', colors: ['#fff1f2', '#ffe4e6', '#881337'] },
                                        { id: 'pastel-green', name: 'Pastel Green', colors: ['#f0fdf4', '#dcfce7', '#14532d'] },
                                        { id: 'pastel-yellow', name: 'Pastel Yellow', colors: ['#fefce8', '#fef9c3', '#713f12'] }
                                    ].map(theme => (
                                        <button
                                            key={theme.id}
                                            onClick={() => {
                                                setCurrentTheme(theme.id);
                                                localStorage.setItem('app_ui_theme', theme.id);
                                            }}
                                            className={`p-4 rounded-xl border-4 text-left transition-all hover:-translate-y-1 ${currentTheme === theme.id ? 'border-accent shadow-hard-mini shadow-accent' : 'border-slate-100 hover:border-slate-900 bg-slate-50'}`}
                                        >
                                            <div className="flex gap-2 mb-3">
                                                {theme.colors.map((c, i) => (
                                                    <div key={i} className="w-5 h-5 rounded-full border-2 border-slate-800" style={{ backgroundColor: c }} />
                                                ))}
                                            </div>
                                            <span className="font-bold text-xs block text-slate-800">{theme.name}</span>
                                        </button>
                                    ))}

                                    <div className={`p-4 rounded-xl border-4 text-left transition-all ${currentTheme === 'custom' ? 'border-accent shadow-hard-mini shadow-accent' : 'border-slate-100 bg-slate-50'} `}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-8 h-8 rounded-full border-2 border-slate-800 flex items-center justify-center overflow-hidden cursor-pointer relative" style={{ backgroundColor: customColor }}>
                                                <input
                                                    type="color"
                                                    value={customColor}
                                                    onChange={(e) => {
                                                        setCustomColor(e.target.value);
                                                        localStorage.setItem('app_custom_color', e.target.value);
                                                        setCurrentTheme('custom');
                                                        localStorage.setItem('app_ui_theme', 'custom');
                                                    }}
                                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer p-0"
                                                />
                                            </div>
                                            {currentTheme !== 'custom' && (
                                                <button
                                                    onClick={() => {
                                                        setCurrentTheme('custom');
                                                        localStorage.setItem('app_ui_theme', 'custom');
                                                    }}
                                                    className="text-[10px] font-black underline text-slate-500 hover:text-slate-900"
                                                >
                                                    Pilih
                                                </button>
                                            )}
                                        </div>
                                        <span className="font-bold text-xs block text-slate-800">Warna Kustom</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                <FirstLoginModal
                    isOpen={showFirstLoginModal}
                    onComplete={() => {
                        setShowFirstLoginModal(false);
                        fetchUserProfile();
                        // Optional: show a success toast or alert
                        setStatusModal({
                            isOpen: true,
                            type: 'success',
                            message: 'Profil Anda telah berhasil diperbarui. Selamat menggunakan Aruneeka!'
                        });
                    }}
                />

                <EmailSetupModal
                    isOpen={showEmailSetupModal}
                    currentEmail={userEmail}
                    userId={localStorage.getItem('user_id') || ''}
                    onComplete={() => {
                        setShowEmailSetupModal(false);
                        setStatusModal({
                            isOpen: true,
                            type: 'success',
                            message: 'Email berhasil diperbarui! Login berikutnya bisa menggunakan email baru Anda.'
                        });
                    }}
                    onSkip={() => setShowEmailSetupModal(false)}
                />
            </div >

            {/* Mobile Nav & Menu (Only visible on small screens) */}
            {
                !isSidebarOpen && !location.pathname.startsWith('/carousel') && (
                    <>
                        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t-2 border-border shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex items-center justify-around px-1 pb-safe pt-1 h-[72px]">
                            {/* Left: Content Plan */}
                            <button onClick={() => { setShowMobileMenu(false); navigate('/plan'); }} className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${location.pathname === '/plan' ? 'text-accent' : 'text-slate-400 hover:text-slate-600'}`}>
                                <Layers size={22} className={location.pathname === '/plan' ? 'fill-accent/20' : ''} />
                                <span className="text-[9px] font-bold">Plan</span>
                            </button>
                            {/* Left: Calendar */}
                            <button onClick={() => { setShowMobileMenu(false); navigate('/calendar'); }} className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${location.pathname === '/calendar' ? 'text-accent' : 'text-slate-400 hover:text-slate-600'}`}>
                                <CalendarDays size={22} className={location.pathname === '/calendar' ? 'fill-accent/20' : ''} />
                                <span className="text-[9px] font-bold">Kalender</span>
                            </button>
                            {/* Center: Dashboard (elevated) */}
                            <div className="relative -top-5 flex-shrink-0">
                                <button onClick={() => { setShowMobileMenu(false); navigate('/'); }} className={`flex flex-col items-center justify-center w-14 h-14 rounded-full border-4 border-background shadow-[0_8px_16px_rgba(0,0,0,0.15)] transition-transform active:scale-95 ${location.pathname === '/' ? 'bg-accent text-white' : 'bg-slate-800 text-white'}`}>
                                    <LayoutDashboard size={24} />
                                </button>
                                <span className={`text-[9px] font-bold text-center block mt-1 ${location.pathname === '/' ? 'text-accent' : 'text-slate-400'}`}>Dasbor</span>
                            </div>
                            {/* Right: Approval */}
                            <button onClick={() => { setShowMobileMenu(false); navigate('/approval'); }} className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${location.pathname === '/approval' ? 'text-accent' : 'text-slate-400 hover:text-slate-600'}`}>
                                <CheckCircle size={22} className={location.pathname === '/approval' ? 'fill-accent/20' : ''} />
                                <span className="text-[9px] font-bold">Approval</span>
                            </button>
                            {/* Right: Messages */}
                            <button onClick={() => { setShowMobileMenu(false); navigate('/messages'); }} className={`relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${location.pathname === '/messages' ? 'text-accent' : 'text-slate-400 hover:text-slate-600'}`}>
                                <div className="relative">
                                    <MessageSquare size={22} className={location.pathname === '/messages' ? 'fill-accent/20' : ''} />
                                    {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border border-white text-[7px] text-white flex items-center justify-center font-black">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                                </div>
                                <span className="text-[9px] font-bold">Pesan</span>
                            </button>
                        </nav>

                        {/* Mobile Full Screen Notification Inbox */}
                        {showMobileNotifications && (
                            <div className="md:hidden fixed inset-0 z-[60] bg-background flex flex-col animate-in fade-in slide-in-from-right duration-300">
                                {/* Header */}
                                <div className="flex items-center justify-between px-4 py-3 bg-card border-b-2 border-border shadow-sm flex-shrink-0 pt-safe">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center">
                                            <Bell size={18} className="text-accent" />
                                        </div>
                                        <div>
                                            <h2 className="font-black font-heading text-lg text-foreground leading-tight">Notifikasi</h2>
                                            {unreadCount > 0 && <p className="text-[10px] font-bold text-accent">{unreadCount} belum dibaca</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={() => markAllAsRead()}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent rounded-xl text-[10px] font-black uppercase tracking-widest"
                                            >
                                                <CheckCheck size={12} /> Tandai Semua
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowMobileNotifications(false)}
                                            className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-xl text-slate-500"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Notification List */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar pb-[80px]">
                                    {notifications.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400 py-20">
                                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                                                <Bell size={36} className="opacity-30" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-black text-base text-slate-500">Kotak Masuk Kosong</p>
                                                <p className="text-sm font-bold text-slate-400 mt-1">Belum ada notifikasi untuk Anda</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border">
                                            {/* Date grouping header - Today */}
                                            {notifications.some(n => {
                                                const d = new Date(n.created_at);
                                                const today = new Date();
                                                return d.toDateString() === today.toDateString();
                                            }) && (
                                                <div className="px-4 py-2 bg-muted/30 sticky top-0 z-10">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hari Ini</span>
                                                </div>
                                            )}
                                            {notifications.map((notif) => {
                                                const notifDate = new Date(notif.created_at);
                                                const today = new Date();
                                                const isToday = notifDate.toDateString() === today.toDateString();
                                                const timeStr = isToday
                                                    ? notifDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                                    : notifDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

                                                const getNotifIcon = () => {
                                                    switch (notif.type) {
                                                        case 'MENTION': return <MessageSquare size={14} className="text-blue-500" />;
                                                        case 'STATUS_CHANGE': return <CheckCircle size={14} className="text-emerald-500" />;
                                                        case 'CONTENT_H1': return <AlertTriangle size={14} className="text-amber-500" />;
                                                        case 'APPROVAL': return <CheckCircle size={14} className="text-purple-500" />;
                                                        default: return <Bell size={14} className="text-accent" />;
                                                    }
                                                };

                                                return (
                                                    <div
                                                        key={notif.id}
                                                        className={`flex gap-3 p-4 transition-colors active:bg-muted/50 cursor-pointer relative ${!notif.is_read ? 'bg-accent/5' : 'bg-card'}`}
                                                        onClick={() => { handleNotificationClick(notif); setShowMobileNotifications(false); }}
                                                    >
                                                        {/* Unread indicator */}
                                                        {!notif.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-r-full"></div>}

                                                        {/* Avatar */}
                                                        <div className="shrink-0 relative">
                                                            {notif.actor?.avatar_url
                                                                ? <img src={notif.actor.avatar_url} alt="" className="w-11 h-11 rounded-full border-2 border-border object-cover" />
                                                                : <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-mutedForeground border-2 border-border"><User size={18} /></div>
                                                            }
                                                            {/* Type badge */}
                                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white border border-border rounded-full flex items-center justify-center shadow-sm">
                                                                {getNotifIcon()}
                                                            </div>
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <h5 className={`font-black text-[10px] uppercase tracking-widest truncate pr-2 ${!notif.is_read ? 'text-accent' : 'text-slate-500'}`}>
                                                                    {notif.title}
                                                                </h5>
                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                    <Clock size={9} className="text-slate-300" />
                                                                    <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">{timeStr}</span>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm font-bold text-slate-600 leading-snug">
                                                                {notif.actor?.full_name && !notif.metadata?.hide_actor_name && (
                                                                    <span className="text-slate-900 font-extrabold">{notif.actor.full_name} </span>
                                                                )}
                                                                {notif.content}
                                                            </p>
                                                            {!notif.is_read && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                                                                    className="mt-1.5 text-[9px] font-black text-accent/70 hover:text-accent uppercase tracking-widest"
                                                                >
                                                                    Tandai dibaca
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Action Bar */}
                                {notifications.length > 0 && (
                                    <div className="flex-shrink-0 px-4 py-3 bg-card border-t-2 border-border pb-safe">
                                        <button
                                            onClick={async () => {
                                                if (confirm('Hapus semua notifikasi? Tindakan ini tidak dapat dibatalkan.')) {
                                                    await clearAllNotifications();
                                                }
                                            }}
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 text-red-500 font-bold text-sm hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={14} /> Hapus Semua Notifikasi
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mobile Full Screen Menu Drawer */}
                        {showMobileMenu && (
                            <div className="md:hidden fixed inset-0 z-[45] bg-background flex flex-col animate-in fade-in slide-in-from-right duration-300">
                                {/* ── Drawer Header ── */}
                                <div className="flex items-center justify-between px-4 py-3 bg-card border-b-2 border-border shadow-sm flex-shrink-0 pt-safe">
                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const isDarkTheme = currentTheme === 'dark' || currentTheme === 'midnight';
                                            const favicon = config?.app_favicon || branding.appFavicon;
                                            const activeLogo = isDarkTheme
                                                ? (config?.app_logo_light || branding.appLogoLight || config?.app_logo || branding.appLogo)
                                                : (config?.app_logo || branding.appLogo);
                                            if (favicon) return <img src={favicon} className="w-7 h-7 object-contain rounded-lg" alt="Logo" />;
                                            if (activeLogo) return <img src={activeLogo} className="max-h-6 max-w-[80px] object-contain" alt="Logo" />;
                                            return <div className="font-heading font-black text-sm text-accent tracking-tighter">CF</div>;
                                        })()}
                                        <span className="font-heading font-black text-base text-foreground tracking-tight">{config?.app_name || branding.appName}</span>
                                    </div>
                                    <button
                                        onClick={() => setShowMobileMenu(false)}
                                        className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-xl text-slate-500 active:bg-slate-200 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* ── Scrollable Content ── */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar pb-[80px]">

                                    {/* ── Profile Card (Clickable → /profile) ── */}
                                    <div className="px-4 pt-4 pb-3">
                                        <button
                                            onClick={() => { setShowMobileMenu(false); navigate('/profile'); }}
                                            className="w-full flex items-center gap-3 p-3.5 bg-card border-2 border-border rounded-2xl shadow-sm active:scale-[0.98] transition-all hover:border-accent/40 hover:shadow-md group"
                                        >
                                            {/* Avatar with online dot */}
                                            <div className="relative flex-shrink-0">
                                                <img src={userProfile.avatar} alt="User" className="w-14 h-14 rounded-full border-2 border-slate-200 object-cover group-hover:border-accent transition-colors" />
                                                <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0 text-left">
                                                <h3 className="font-heading font-black text-base text-foreground leading-tight truncate">{userProfile.name}</h3>
                                                <p className="text-xs text-mutedForeground font-bold truncate">{userProfile.jobTitle || userProfile.role}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                        userProfile.role === 'Developer' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                        userProfile.role === 'Owner' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                        userProfile.role === 'Admin' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                        'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}>{userProfile.role}</span>
                                                </div>
                                            </div>
                                            {/* Arrow */}
                                            <ChevronRight size={18} className="text-slate-400 flex-shrink-0 group-hover:text-accent transition-colors" />
                                        </button>
                                    </div>

                                    {/* ── Quick Actions Row ── */}
                                    <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => { setShowMobileMenu(false); setIsSettingsOpen(true); }}
                                            className="flex flex-col items-center gap-1.5 p-3 bg-card border-2 border-border rounded-xl active:scale-95 transition-all hover:border-accent/30"
                                        >
                                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                <Settings size={16} className="text-slate-600" />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Pengaturan</span>
                                        </button>
                                        <button
                                            onClick={() => { setShowMobileMenu(false); setShowThemeModal(true); }}
                                            className="flex flex-col items-center gap-1.5 p-3 bg-card border-2 border-border rounded-xl active:scale-95 transition-all hover:border-accent/30"
                                        >
                                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                <Palette size={16} className="text-slate-600" />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Tema</span>
                                        </button>
                                        <button
                                            onClick={() => { setShowMobileMenu(false); handleLogout(); }}
                                            className="flex flex-col items-center gap-1.5 p-3 bg-red-50 border-2 border-red-100 rounded-xl active:scale-95 transition-all hover:border-red-300"
                                        >
                                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                                <LogOut size={16} className="text-red-500" />
                                            </div>
                                            <span className="text-[10px] font-black text-red-400 uppercase tracking-wide">Keluar</span>
                                        </button>
                                    </div>

                                    {/* ── Divider ── */}
                                    <div className="mx-4 border-t-2 border-border mb-3"></div>

                                    {/* ── Navigation Items ── */}
                                    <div className="px-4 pb-4">
                                        {Object.entries(NAV_ITEMS).map(([section, items]) => {
                                            const filteredItems = items.filter(item => {
                                                if (item.adminOnly && !isAdmin) return false;
                                                if (item.developerOnly && !isDeveloper) return false;
                                                if (isDeveloper) return true;
                                                if (item.id === 'team') {
                                                    const isSelfRegisteredAdmin = (userProfile.role === 'Admin' || userProfile.role === 'Owner') && !userProfile.parentUserId;
                                                    if (!isSelfRegisteredAdmin) return false;
                                                    return true;
                                                }
                                                if (item.id === 'messages') return true;
                                                const CORE_PAGES = ['dashboard', 'messages', 'plan', 'approval', 'insight', 'carousel', 'kpi', 'team', 'users', 'inbox', 'workspace', 'activity'];
                                                const isHidden = config?.hidden_pages?.includes(item.id);
                                                if (CORE_PAGES.includes(item.id)) { if (isHidden) return false; }
                                                else { if (!config?.page_titles?.[item.id]?.isGlobalVisible) return false; }
                                                return true;
                                            });

                                            if (filteredItems.length === 0) return null;
                                            return (
                                                <div key={section} className="mb-5">
                                                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{section}</h3>
                                                    <div className="space-y-1">
                                                        {filteredItems.map((item) => {
                                                            const isActive = location.pathname === item.path || location.pathname === `/${item.path}`;
                                                            return (
                                                                <button
                                                                    key={item.path}
                                                                    onClick={() => { setShowMobileMenu(false); navigate(item.path); }}
                                                                    className={`flex items-center w-full px-4 py-3 rounded-xl transition-all font-bold active:scale-[0.98] ${
                                                                        isActive
                                                                            ? 'bg-accent text-white shadow-sm'
                                                                            : 'text-slate-600 hover:bg-slate-500/10 bg-card border border-transparent hover:border-slate-200'
                                                                    }`}
                                                                >
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                                                                        <item.icon size={17} className={isActive ? 'text-white' : 'text-slate-500'} />
                                                                    </div>
                                                                    <span className="text-sm tracking-tight flex-1 text-left">{item.label}</span>
                                                                    {item.badge && (
                                                                        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white">{item.badge}</span>
                                                                    )}
                                                                    {isActive && <ChevronRight size={14} className="ml-auto text-white/70" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* ── App Version Footer ── */}
                                    <div className="px-4 pb-6 text-center">
                                        <p className="text-[10px] text-slate-400 font-bold opacity-60 italic">
                                            v{config?.app_version || '1.0.5'} • {config?.app_name || branding.appName}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
        </>
    );
};