import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Filter,
    Layers,
    Instagram,
    Video,
    Linkedin,
    Youtube,
    Facebook,
    AtSign,
    MoreHorizontal,
    Plus,
    Search,
    Clock,
    Palette,
    Check
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../services/supabaseClient';
import { ContentItem, ContentStatus, Platform } from '../types';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';

interface WorkspaceFilter {
    id: string;
    name: string;
    color: string;
    calendarColor: string; // Custom hex color for calendar
}

// Default color palette for workspace calendar colors
const DEFAULT_PALETTE = [
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#3b82f6', // blue
    '#ef4444', // red
    '#f97316', // orange
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#a855f7', // purple
];

// Get default color based on workspace color theme
const getDefaultCalendarColor = (colorTheme: string): string => {
    switch (colorTheme) {
        case 'violet': return '#8b5cf6';
        case 'pink': return '#ec4899';
        case 'yellow': return '#f59e0b';
        case 'green': return '#10b981';
        default: return '#8b5cf6';
    }
};

export const CalendarPage: React.FC = () => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [workspaces, setWorkspaces] = useState<WorkspaceFilter[]>([]);
    const [contentItems, setContentItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Detail Modal
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [selectedDateForDay, setSelectedDateForDay] = useState<number | null>(null);
    const [isDayViewOpen, setIsDayViewOpen] = useState(false);

    // Color picker state
    const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null); // workspace id
    const [savingColor, setSavingColor] = useState<string | null>(null);
    const colorPickerRef = useRef<HTMLDivElement>(null);

    const userId = localStorage.getItem('user_id');
    const userAvatar = localStorage.getItem('user_avatar') || '';

    useEffect(() => {
        fetchData();
    }, [userId]);

    // Close color picker on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
                setColorPickerOpen(null);
            }
        };
        if (colorPickerOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [colorPickerOpen]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Workspaces (include calendar_color)
            const { data: wsData } = await supabase
                .from('workspaces')
                .select('id, name, color, calendar_color, members, owner_id')
                .or(`owner_id.eq.${userId},members.cs.{"${userId}"}`);

            const formattedWorkspaces = (wsData || [])
                .filter(ws => {
                    // Filter: only workspaces user is owner or member of
                    if (ws.owner_id === userId) return true;
                    const members: string[] = ws.members || [];
                    if (members.includes(userId || '')) return true;
                    if (userAvatar && members.some((m: string) => {
                        try { return decodeURIComponent(m) === decodeURIComponent(userAvatar) || m === userAvatar; }
                        catch { return m === userAvatar; }
                    })) return true;
                    return false;
                })
                .map(ws => ({
                    id: ws.id,
                    name: ws.name,
                    color: ws.color || 'violet',
                    calendarColor: ws.calendar_color || getDefaultCalendarColor(ws.color || 'violet')
                }));
            setWorkspaces(formattedWorkspaces);
            setSelectedWorkspaces(formattedWorkspaces.map(w => w.id));

            // 2. Fetch Content Items for these workspaces
            if (formattedWorkspaces.length > 0) {
                const wsIds = formattedWorkspaces.map(w => w.id);
                const { data: items } = await supabase
                    .from('content_items')
                    .select('*, workspaces(name, color, calendar_color)')
                    .in('workspace_id', wsIds);

                setContentItems(items || []);
            }
        } catch (err) {
            console.error("Error fetching calendar data:", err);
        } finally {
            setLoading(false);
        }
    };

    // Save workspace calendar color to database
    const handleSaveCalendarColor = async (wsId: string, color: string) => {
        setSavingColor(wsId);
        try {
            const { error } = await supabase
                .from('workspaces')
                .update({ calendar_color: color })
                .eq('id', wsId);

            if (error) throw error;

            // Update local state
            setWorkspaces(prev => prev.map(ws =>
                ws.id === wsId ? { ...ws, calendarColor: color } : ws
            ));
            setColorPickerOpen(null);
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: 'Warna workspace diperbarui!' } }));
        } catch (err) {
            console.error('Error saving calendar color:', err);
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Gagal menyimpan warna.' } }));
        } finally {
            setSavingColor(null);
        }
    };

    // Get workspace calendar color by workspace_id
    const getWorkspaceColor = (workspaceId: string): string => {
        const ws = workspaces.find(w => w.id === workspaceId);
        if (ws) return ws.calendarColor;
        // Fallback: check from content item's workspace data
        return '#8b5cf6';
    };

    // Calendar logic
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1));
    const goToToday = () => setCurrentDate(new Date());

    const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    // Filter items
    const filteredItems = contentItems.filter(item => {
        const matchesWorkspace = selectedWorkspaces.includes(item.workspace_id);
        const matchesPlatform = selectedPlatforms.length === 0 || selectedPlatforms.includes(item.platform);
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesWorkspace && matchesPlatform && matchesSearch;
    });

    const getItemsForDay = (day: number) => {
        return filteredItems.filter(item => {
            if (!item.date) return false;
            const itemDate = new Date(item.date);
            return itemDate.getDate() === day &&
                itemDate.getMonth() === month &&
                itemDate.getFullYear() === year;
        });
    };

    const toggleWorkspace = (id: string) => {
        setSelectedWorkspaces(prev =>
            prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
        );
    };

    const togglePlatform = (p: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
        );
    };

    const getPlatformIcon = (platform: string) => {
        const size = 12;
        switch (platform) {
            case 'Instagram': return <Instagram size={size} />;
            case 'TikTok': return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
            );
            case 'LinkedIn': return <Linkedin size={size} />;
            case 'YouTube': return <Youtube size={size} />;
            case 'Facebook': return <Facebook size={size} />;
            case 'Threads': return <AtSign size={size} />;
            default: return null;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Published': return 'bg-emerald-500';
            case 'Scheduled': return 'bg-blue-500';
            case 'Review': return 'bg-amber-500';
            case 'In Progress': return 'bg-purple-500';
            default: return 'bg-slate-400';
        }
    };

    const getPlatformCardStyle = (platform: string): string => {
        // Use data attribute for calendar-specific styling that won't conflict with theme-dark globals
        switch (platform) {
            case 'Instagram': return 'cal-card cal-instagram';
            case 'TikTok': return 'cal-card cal-tiktok';
            case 'LinkedIn': return 'cal-card cal-linkedin';
            case 'YouTube': return 'cal-card cal-youtube';
            case 'Facebook': return 'cal-card cal-facebook';
            case 'Threads': return 'cal-card cal-threads';
            default: return 'cal-card cal-default';
        }
    };

    const getTypeIcon = (type: string) => {
        const t = (type || '').toLowerCase();
        const size = 10;
        if (t.includes('video') || t.includes('reels')) return <Video size={size} />;
        return <Layers size={size} />;
    };

    const handleOpenDetail = (item: any) => {
        setSelectedItem(item);
        setIsDetailOpen(true);
    };

    const handleUpdateStatus = async (newStatus: string) => {
        if (!selectedItem) return;
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('content_items')
                .update({ status: newStatus })
                .eq('id', selectedItem.id);

            if (error) throw error;

            // Update local state
            setContentItems(prev => prev.map(item =>
                item.id === selectedItem.id ? { ...item, status: newStatus } : item
            ));
            setSelectedItem({ ...selectedItem, status: newStatus });
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: 'Status konten diperbarui!' } }));
        } catch (err) {
            console.error(err);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] gap-2 sm:gap-3 md:gap-6 overflow-hidden">
            {/* Sidebar Filters - Collapsible on Mobile */}
            <aside className={`${isFilterOpen ? 'w-full flex flex-col' : 'hidden'} md:flex md:flex-col md:w-60 lg:w-72 gap-2 sm:gap-3 md:gap-6 shrink-0 overflow-y-auto pr-1 md:pr-2 pb-2 sm:pb-3 md:pb-6 scrollbar-hide border-b md:border-b-0 md:border-r border-border max-h-[70vh] md:max-h-none`}>
                {/* Mobile Filter Header */}
                <div className="md:hidden flex items-center justify-between px-2 py-2 border-b border-border">
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        <Filter size={14} /> Filters
                    </h3>
                    <button 
                        onClick={() => setIsFilterOpen(false)}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                </div>

                <div className="bg-card border-2 border-border p-2 sm:p-3 md:p-5 rounded-lg sm:rounded-2xl shadow-sm">
                    <h3 className="font-black text-slate-800 mb-1.5 sm:mb-2 md:mb-4 flex items-center gap-2 text-[10px] sm:text-xs md:text-base hidden md:flex">
                        <Filter size={12} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] text-secondary" />
                        Filters
                    </h3>

                    <div className="space-y-2 sm:space-y-3 md:space-y-6">
                        {/* Workspaces */}
                        <div>
                            <label className="text-[6px] sm:text-[7px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1 sm:mb-2">
                                Workspaces <span className="normal-case font-medium opacity-60">(klik warna untuk ubah)</span>
                            </label>
                            <div className="space-y-1 sm:space-y-1.5 md:max-h-none overflow-y-auto md:overflow-y-visible">
                                {workspaces.map(ws => (
                                    <div key={ws.id} className="relative">
                                        <div className={`w-full flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-2.5 rounded-lg sm:rounded-xl border-2 transition-all font-bold text-[8px] sm:text-xs md:text-sm ${selectedWorkspaces.includes(ws.id)
                                            ? 'bg-muted/50 border-border text-foreground shadow-sm'
                                            : 'bg-transparent border-transparent text-mutedForeground opacity-60'
                                            }`}
                                        >
                                            {/* Color dot - clickable to open color picker */}
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setColorPickerOpen(colorPickerOpen === ws.id ? null : ws.id); }}
                                                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0 border-2 border-white/80 shadow-sm hover:scale-125 transition-transform"
                                                style={{ backgroundColor: ws.calendarColor }}
                                                title="Ubah warna workspace di kalender"
                                            />
                                            {/* Workspace name - clickable to toggle filter */}
                                            <button
                                                type="button"
                                                onClick={() => toggleWorkspace(ws.id)}
                                                className="flex-1 text-left truncate hidden sm:block"
                                            >
                                                {ws.name}
                                            </button>
                                        </div>

                                        {/* Color Picker Dropdown */}
                                        {colorPickerOpen === ws.id && (
                                            <div
                                                ref={colorPickerRef}
                                                className="absolute left-0 top-full mt-1 z-50 bg-card border-2 border-border rounded-xl shadow-hard p-3 w-52"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <p className="text-[9px] font-black uppercase tracking-widest text-mutedForeground mb-2">Warna Kalender — {ws.name}</p>
                                                {/* Preset palette */}
                                                <div className="grid grid-cols-6 gap-1.5 mb-3">
                                                    {DEFAULT_PALETTE.map(color => (
                                                        <button
                                                            key={color}
                                                            type="button"
                                                            onClick={() => handleSaveCalendarColor(ws.id, color)}
                                                            disabled={savingColor === ws.id}
                                                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-125 transition-transform flex items-center justify-center"
                                                            style={{ backgroundColor: color }}
                                                            title={color}
                                                        >
                                                            {ws.calendarColor === color && (
                                                                <Check size={10} className="text-white" strokeWidth={3} />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                                {/* Custom hex input */}
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-7 h-7 rounded-lg border-2 border-border flex-shrink-0"
                                                        style={{ backgroundColor: ws.calendarColor }}
                                                    />
                                                    <input
                                                        type="color"
                                                        value={ws.calendarColor}
                                                        onChange={(e) => {
                                                            setWorkspaces(prev => prev.map(w =>
                                                                w.id === ws.id ? { ...w, calendarColor: e.target.value } : w
                                                            ));
                                                        }}
                                                        onBlur={(e) => handleSaveCalendarColor(ws.id, e.target.value)}
                                                        className="flex-1 h-7 rounded-lg border-2 border-border cursor-pointer"
                                                        title="Pilih warna kustom"
                                                    />
                                                </div>
                                                {savingColor === ws.id && (
                                                    <p className="text-[9px] text-mutedForeground mt-1 text-center">Menyimpan...</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Platforms */}
                        <div>
                            <label className="text-[6px] sm:text-[7px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1 sm:mb-2">Platforms</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'Facebook', 'Threads'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => togglePlatform(p)}
                                        className={`flex items-center gap-2 px-2 py-2 rounded-lg border-2 transition-all font-bold text-[9px] sm:text-[10px] ${selectedPlatforms.includes(p)
                                            ? 'bg-accent/10 border-accent/30 text-accent shadow-sm'
                                            : 'bg-transparent border-transparent text-slate-400'
                                            }`}
                                    >
                                        <div className="shrink-0">{getPlatformIcon(p)}</div>
                                        <span className="hidden sm:inline">{p}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Today's Stats Card */}
                <div className="bg-slate-900 text-white p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-2xl shadow-hard relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                    <h4 className="text-[9px] sm:text-xs md:text-xs font-bold opacity-60 mb-1">Today's Schedule</h4>
                    <p className="text-2xl sm:text-3xl md:text-3xl font-black mb-3 sm:mb-4">
                        {getItemsForDay(new Date().getDate()).length} <span className="text-[9px] sm:text-xs md:text-xs font-bold opacity-60 uppercase">Posts</span>
                    </p>
                    <div className="space-y-2 sm:space-y-3 relative z-10">
                        {getItemsForDay(new Date().getDate()).slice(0, 2).map((item, idx) => (
                            <div key={idx} className="bg-white/10 rounded-lg p-2 flex items-center gap-2 sm:gap-3">
                                <div className="shrink-0 text-amber-400">{getPlatformIcon(item.platform)}</div>
                                <p className="text-[8px] sm:text-[10px] font-bold truncate">{item.title}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Mobile Filter Toggle Button */}
            {!isFilterOpen && (
                <button
                    onClick={() => setIsFilterOpen(true)}
                    className="md:hidden fixed bottom-24 sm:bottom-32 right-4 z-20 w-12 h-12 bg-accent text-white rounded-full border-2 border-slate-900 shadow-[3px_3px_0px_0px_#0f172a] flex items-center justify-center hover:brightness-110 transition-all flex-shrink-0"
                    title="Open Filters"
                >
                    <Filter size={20} />
                </button>
            )}

            {/* Main Calendar Content */}
            <main className="flex-1 flex flex-col bg-card border-2 border-border rounded-2xl sm:rounded-3xl overflow-hidden shadow-hard">
                {/* Calendar Header */}
                <header className="p-3 sm:p-4 md:p-6 border-b-2 border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-1">
                            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900">{monthNames[month]}</h2>
                            <span className="text-lg sm:text-xl md:text-2xl font-medium text-slate-400">{year}</span>
                        </div>
                        <div className="flex items-center bg-muted rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-border shadow-sm">
                            <button onClick={prevMonth} className="p-1 sm:p-1.5 hover:bg-card rounded-lg transition-colors text-slate-600"><ChevronLeft size={16} className="sm:w-5 sm:h-5" /></button>
                            <button onClick={goToToday} className="px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-xs font-black text-slate-600 hover:bg-card rounded-lg transition-colors">Hari Ini</button>
                            <button onClick={nextMonth} className="p-1 sm:p-1.5 hover:bg-card rounded-lg transition-colors text-slate-600"><ChevronRight size={16} className="sm:w-5 sm:h-5" /></button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto hide-scrollbar">
                        <div className="relative shrink-0">
                            <Search size={14} className="sm:w-[18px] sm:h-[18px] absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari..."
                                className="pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-muted border-2 border-border rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold focus:border-accent transition-colors w-40 sm:w-64"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button icon={<Plus size={14} />} onClick={() => navigate('/plan')} className="text-[10px] sm:text-xs px-2 sm:px-4 py-1.5 sm:py-2">
                            <span className="hidden sm:inline">Add</span>
                        </Button>
                    </div>
                </header>

                {/* Calendar Grid Header */}
                <div className="grid grid-cols-7 bg-muted/50 border-b border-border">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                        <div key={day} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid Body */}
                <div className="flex-1 grid grid-cols-7 auto-rows-min overflow-y-auto scrollbar-hide">
                    {/* Empty slots for previous month */}
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                        <div key={`prev-${i}`} className="border-r border-b border-border bg-slate-100/30 dark:bg-slate-950/50" />
                    ))}

                    {/* Actual month days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dayItems = getItemsForDay(day);
                        const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                        return (
                            <div key={day} className={`min-h-[140px] border-r border-b border-border p-1.5 group bg-card hover:bg-slate-50/50 transition-colors flex flex-col gap-1 overflow-hidden relative`}>
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black transition-all ${isToday ? 'bg-accent text-white shadow-[0_4px_10px_rgba(59,130,246,0.3)]' : 'text-slate-400 group-hover:text-slate-900 group-hover:scale-110 dark:text-slate-500'
                                        }`}>
                                        {day}
                                    </span>
                                    {dayItems.length > 0 && <span className="text-[10px] font-black text-slate-400 px-1.5 py-0.5 bg-muted rounded-full border border-border dark:text-slate-500">{dayItems.length}</span>}
                                </div>

                                <div className="space-y-1">
                                    {dayItems.slice(0, 5).map((item, idx) => {
                                        const wsColor = getWorkspaceColor(item.workspace_id);
                                        return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleOpenDetail(item)}
                                            className="group/item relative rounded-lg p-1.5 shadow-sm transition-all cursor-pointer z-10 hover:z-20 hover:scale-[1.02] hover:shadow-md"
                                            style={{
                                                backgroundColor: `${wsColor}18`,
                                                borderLeft: `3px solid ${wsColor}`,
                                                borderTop: `1px solid ${wsColor}33`,
                                                borderRight: `1px solid ${wsColor}33`,
                                                borderBottom: `1px solid ${wsColor}33`,
                                                color: wsColor
                                            }}
                                        >
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(item.status)} shrink-0`} />
                                                <div className="font-black text-[10px] leading-tight line-clamp-1 w-full" title={item.title}
                                                    style={{ color: 'inherit' }}>
                                                    {item.title}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between" style={{ opacity: 0.8 }}>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-bold scale-75 origin-left">{getPlatformIcon(item.platform)}</span>
                                                    <span className="text-[7px] font-black uppercase tracking-wider">{item.platform}</span>
                                                </div>
                                                {item.type && (
                                                    <div className="flex items-center gap-1 text-[7px] font-bold">
                                                        <span className="scale-75 origin-right">{getTypeIcon(item.type)}</span>
                                                        <span className="uppercase">{item.type}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        );
                                    })}
                                    {dayItems.length > 5 && (
                                        <div 
                                            onClick={() => { setSelectedDateForDay(day); setIsDayViewOpen(true); }}
                                            className="text-center text-[7px] font-black text-slate-400 py-0.5 cursor-pointer hover:text-accent transition-colors"
                                        >
                                            + {dayItems.length - 5} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Empty slots for next month */}
                    {Array.from({ length: 35 - (daysInMonth + firstDayOfMonth) }).map((_, i) => (
                        <div key={`next-${i}`} className="border-r border-b border-border bg-slate-100/30 dark:bg-slate-950/50" />
                    ))}
                </div>
            </main>

            {/* Content Detail Modal */}
            <Modal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                title="Content Details"
            >
                {selectedItem && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 py-4 border-b border-border">
                            <div className={`p-4 rounded-2xl border-4 border-slate-900 shadow-hard ${getPlatformCardStyle(selectedItem.platform)}`}>
                                {getPlatformIcon(selectedItem.platform)}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">{selectedItem.title}</h3>
                                <p className="text-slate-500 font-bold flex items-center gap-2">
                                    <Layers size={14} className="text-accent" />
                                    {selectedItem.workspaces?.name} · {selectedItem.platform}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status Konten</label>
                                <Select
                                    value={selectedItem.status}
                                    onChange={(e) => handleUpdateStatus(e.target.value)}
                                    disabled={updating}
                                >
                                    <option value="Draft">Draft</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Review">Review</option>
                                    <option value="Scheduled">Scheduled</option>
                                    <option value="Published">Published</option>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipe Konten</label>
                                <div className="px-4 py-2.5 bg-muted rounded-xl border border-border font-bold text-slate-700 capitalize">
                                    {selectedItem.type || 'Standard'}
                                </div>
                            </div>
                        </div>

                        {selectedItem.script && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Script / Caption</label>
                                <div className="p-4 bg-muted rounded-2xl border border-border text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                    {selectedItem.script}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-6 border-t border-border">
                            <Button
                                variant="outline"
                                color="slate"
                                onClick={() => navigate(`/plan/${selectedItem.workspace_id}`)}
                            >
                                Pergi ke Workspace
                            </Button>
                            <Button onClick={() => setIsDetailOpen(false)}>Tutup</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Day View Modal - Mobile */}
            <Modal
                isOpen={isDayViewOpen}
                onClose={() => setIsDayViewOpen(false)}
                title={`Events - ${monthNames[month]} ${selectedDateForDay || ''}`}
                maxWidth="max-w-2xl"
            >
                {selectedDateForDay && (
                    <div className="space-y-4">
                        {getItemsForDay(selectedDateForDay).length === 0 ? (
                            <div className="text-center py-12">
                                <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                                <p className="text-slate-500 font-medium">Tidak ada events pada tanggal ini</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {getItemsForDay(selectedDateForDay).map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => { handleOpenDetail(item); setIsDayViewOpen(false); }}
                                        className="bg-gradient-to-br from-slate-50 to-slate-100/50 border-2 border-border rounded-2xl p-4 sm:p-5 hover:shadow-lg hover:border-accent transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Platform Icon & Color */}
                                            <div className={`p-3 rounded-xl border-2 border-slate-900 shadow-sm flex-shrink-0 ${getPlatformCardStyle(item.platform)}`}>
                                                {getPlatformIcon(item.platform)}
                                            </div>

                                            {/* Event Details */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm sm:text-base font-black text-slate-900 line-clamp-2 mb-1.5 group-hover:text-accent transition-colors">
                                                    {item.title}
                                                </h4>
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white bg-slate-400 px-2 py-1 rounded-lg">
                                                        {item.platform}
                                                    </span>
                                                    {item.type && (
                                                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-accent bg-accent/10 px-2 py-1 rounded-lg border border-accent/30">
                                                            {item.type}
                                                        </span>
                                                    )}
                                                    <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-lg border-2 ${
                                                        item.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        item.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        item.status === 'Review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        item.status === 'In Progress' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                        'bg-slate-50 text-slate-700 border-slate-200'
                                                    }`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                                {item.workspaces?.name && (
                                                    <p className="text-xs text-slate-600 font-bold flex items-center gap-1">
                                                        <Layers size={12} className="text-accent" />
                                                        {item.workspaces.name}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Arrow Indicator */}
                                            <div className="text-slate-300 group-hover:text-accent transition-colors flex-shrink-0 pt-1">
                                                <ChevronRight size={20} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};
