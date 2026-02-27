import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Filter,
    Layers,
    Instagram,
    Video,
    Linkedin,
    Youtube,
    Facebook,
    AtSign,
    Plus,
    Search,
    X,
    Check,
    Palette,
    ChevronDown
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Input';
import { useAppConfig } from '../components/AppConfigProvider';

interface WorkspaceFilter {
    id: string;
    name: string;
    color: string;
    calendarColor: string;
}

const DEFAULT_PALETTE = [
    '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#3b82f6', '#ef4444', '#f97316', '#06b6d4',
    '#84cc16', '#6366f1', '#14b8a6', '#a855f7',
];

const getDefaultCalendarColor = (colorTheme: string): string => {
    switch (colorTheme) {
        case 'violet': return '#8b5cf6';
        case 'pink': return '#ec4899';
        case 'yellow': return '#f59e0b';
        case 'green': return '#10b981';
        default: return '#8b5cf6';
    }
};

const MONTH_NAMES = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const getPlatformIcon = (platform: string, size = 12) => {
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
        default: return <Layers size={size} />;
    }
};

const getStatusDot = (status: string) => {
    switch (status) {
        case 'Published': return 'bg-emerald-500';
        case 'Scheduled': return 'bg-blue-500';
        case 'Review': return 'bg-amber-500';
        case 'In Progress': return 'bg-purple-500';
        default: return 'bg-slate-400';
    }
};

export const CalendarPage: React.FC = () => {
    const navigate = useNavigate();
    const { config } = useAppConfig();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [workspaces, setWorkspaces] = useState<WorkspaceFilter[]>([]);
    const [contentItems, setContentItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Detail Modal
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [updating, setUpdating] = useState(false);

    // Day view
    const [dayViewDate, setDayViewDate] = useState<number | null>(null);
    const [isDayViewOpen, setIsDayViewOpen] = useState(false);

    // Color picker
    const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
    const [savingColor, setSavingColor] = useState<string | null>(null);
    const colorPickerRef = useRef<HTMLDivElement>(null);

    const userId = localStorage.getItem('user_id');
    const userAvatar = localStorage.getItem('user_avatar') || '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const today = new Date();

    useEffect(() => { fetchData(); }, [userId]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
                setColorPickerOpen(null);
            }
        };
        if (colorPickerOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [colorPickerOpen]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: wsData } = await supabase
                .from('workspaces')
                .select('id, name, color, calendar_color, members, owner_id')
                .or(`owner_id.eq.${userId},members.cs.{"${userId}"}`);

            const fws = (wsData || [])
                .filter(ws => {
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

            setWorkspaces(fws);
            setSelectedWorkspaces(fws.map(w => w.id));

            if (fws.length > 0) {
                const wsIds = fws.map(w => w.id);
                const { data: items } = await supabase
                    .from('content_items')
                    .select('id, title, status, platform, type, date, workspace_id, pic, workspaces(name)')
                    .in('workspace_id', wsIds)
                    .order('date', { ascending: true });
                setContentItems(items || []);
            }
        } catch (err) {
            console.error("Error fetching calendar data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCalendarColor = async (wsId: string, color: string) => {
        setSavingColor(wsId);
        try {
            await supabase.from('workspaces').update({ calendar_color: color }).eq('id', wsId);
            setWorkspaces(prev => prev.map(ws => ws.id === wsId ? { ...ws, calendarColor: color } : ws));
            setColorPickerOpen(null);
        } catch (err) {
            console.error('Error saving color:', err);
        } finally {
            setSavingColor(null);
        }
    };

    const getWorkspaceColor = (workspaceId: string): string => {
        return workspaces.find(w => w.id === workspaceId)?.calendarColor || '#8b5cf6';
    };

    const filteredItems = contentItems.filter(item => {
        const matchWs = selectedWorkspaces.includes(item.workspace_id);
        const matchPlatform = selectedPlatforms.length === 0 || selectedPlatforms.includes(item.platform);
        const matchSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchWs && matchPlatform && matchSearch;
    });

    const getItemsForDay = (day: number) => filteredItems.filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });

    const handleUpdateStatus = async (newStatus: string) => {
        if (!selectedItem) return;
        setUpdating(true);
        try {
            await supabase.from('content_items').update({ status: newStatus }).eq('id', selectedItem.id);
            setContentItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, status: newStatus } : i));
            setSelectedItem({ ...selectedItem, status: newStatus });
        } catch (err) { console.error(err); }
        finally { setUpdating(false); }
    };

    const totalThisMonth = filteredItems.filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        return d.getMonth() === month && d.getFullYear() === year;
    }).length;

    return (
        <div className="flex flex-col h-full gap-4">
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h2 className="text-2xl font-extrabold text-foreground font-heading">
                        {config?.page_titles?.['calendar']?.title || 'Content Calendar'}
                    </h2>
                    <p className="text-sm text-mutedForeground mt-0.5">
                        {totalThisMonth} konten di {MONTH_NAMES[month]} {year}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mutedForeground" />
                        <input
                            type="text"
                            placeholder="Cari konten..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 pr-3 py-2 bg-muted border-2 border-border rounded-xl text-sm font-medium focus:border-accent transition-colors w-44 sm:w-56 text-foreground"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-mutedForeground hover:text-foreground">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Filter toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-bold transition-all ${showFilters ? 'bg-accent text-white border-accent' : 'bg-card border-border text-foreground hover:border-accent'}`}
                    >
                        <Filter size={14} />
                        <span className="hidden sm:inline">Filter</span>
                        {(selectedPlatforms.length > 0 || selectedWorkspaces.length < workspaces.length) && (
                            <span className="w-4 h-4 rounded-full bg-white/30 text-[9px] font-black flex items-center justify-center">
                                {selectedPlatforms.length + (workspaces.length - selectedWorkspaces.length)}
                            </span>
                        )}
                    </button>

                    {/* Month nav */}
                    <div className="flex items-center bg-muted rounded-xl border-2 border-border overflow-hidden">
                        <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 hover:bg-card transition-colors text-foreground">
                            <ChevronLeft size={16} />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 text-xs font-black text-foreground hover:bg-card transition-colors whitespace-nowrap">
                            {MONTH_NAMES[month].slice(0, 3)} {year}
                        </button>
                        <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 hover:bg-card transition-colors text-foreground">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <Button icon={<Plus size={14} />} onClick={() => navigate('/plan')} className="text-xs px-3 py-2">
                        <span className="hidden sm:inline">Tambah</span>
                    </Button>
                </div>
            </div>

            {/* ── Filter Panel (collapsible) ── */}
            {showFilters && (
                <div className="bg-card border-2 border-border rounded-2xl p-4 flex flex-wrap gap-6 animate-in slide-in-from-top-2 duration-200">
                    {/* Workspaces */}
                    <div className="flex-1 min-w-[200px]">
                        <p className="text-[10px] font-black uppercase tracking-widest text-mutedForeground mb-2">Workspace</p>
                        <div className="flex flex-wrap gap-2">
                            {workspaces.map(ws => (
                                <div key={ws.id} className="relative">
                                    <div className="flex items-center gap-1.5">
                                        {/* Color dot - opens color picker */}
                                        <button
                                            type="button"
                                            onClick={() => setColorPickerOpen(colorPickerOpen === ws.id ? null : ws.id)}
                                            className="w-4 h-4 rounded-full border-2 border-white shadow-sm hover:scale-125 transition-transform flex-shrink-0"
                                            style={{ backgroundColor: ws.calendarColor }}
                                            title="Ubah warna"
                                        />
                                        {/* Name toggle */}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedWorkspaces(prev =>
                                                prev.includes(ws.id) ? prev.filter(id => id !== ws.id) : [...prev, ws.id]
                                            )}
                                            className={`px-2.5 py-1 rounded-lg border-2 text-xs font-bold transition-all ${selectedWorkspaces.includes(ws.id)
                                                ? 'border-border bg-muted text-foreground'
                                                : 'border-transparent text-mutedForeground opacity-50'
                                            }`}
                                        >
                                            {ws.name}
                                        </button>
                                    </div>

                                    {/* Color Picker */}
                                    {colorPickerOpen === ws.id && (
                                        <div
                                            ref={colorPickerRef}
                                            className="absolute left-0 top-full mt-1 z-50 bg-card border-2 border-border rounded-xl shadow-hard p-3 w-48"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <p className="text-[9px] font-black uppercase tracking-widest text-mutedForeground mb-2">Warna Kalender</p>
                                            <div className="grid grid-cols-6 gap-1.5 mb-2">
                                                {DEFAULT_PALETTE.map(color => (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        onClick={() => handleSaveCalendarColor(ws.id, color)}
                                                        disabled={savingColor === ws.id}
                                                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-125 transition-transform flex items-center justify-center"
                                                        style={{ backgroundColor: color }}
                                                    >
                                                        {ws.calendarColor === color && <Check size={10} className="text-white" strokeWidth={3} />}
                                                    </button>
                                                ))}
                                            </div>
                                            <input
                                                type="color"
                                                value={ws.calendarColor}
                                                onChange={e => setWorkspaces(prev => prev.map(w => w.id === ws.id ? { ...w, calendarColor: e.target.value } : w))}
                                                onBlur={e => handleSaveCalendarColor(ws.id, e.target.value)}
                                                className="w-full h-7 rounded-lg border-2 border-border cursor-pointer"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Platforms */}
                    <div className="flex-1 min-w-[200px]">
                        <p className="text-[10px] font-black uppercase tracking-widest text-mutedForeground mb-2">Platform</p>
                        <div className="flex flex-wrap gap-2">
                            {['Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'Facebook', 'Threads'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setSelectedPlatforms(prev =>
                                        prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                                    )}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 text-xs font-bold transition-all ${selectedPlatforms.includes(p)
                                        ? 'bg-accent/10 border-accent text-accent'
                                        : 'border-border text-mutedForeground hover:border-accent/50'
                                    }`}
                                >
                                    {getPlatformIcon(p, 12)}
                                    <span>{p}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reset */}
                    {(selectedPlatforms.length > 0 || selectedWorkspaces.length < workspaces.length) && (
                        <button
                            onClick={() => { setSelectedPlatforms([]); setSelectedWorkspaces(workspaces.map(w => w.id)); }}
                            className="text-xs font-bold text-mutedForeground hover:text-foreground flex items-center gap-1 self-end"
                        >
                            <X size={12} /> Reset
                        </button>
                    )}
                </div>
            )}

            {/* ── Calendar Grid ── */}
            <div className="flex-1 bg-card border-2 border-border rounded-2xl overflow-hidden flex flex-col min-h-0">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b-2 border-border bg-muted/40">
                    {DAY_NAMES.map(d => (
                        <div key={d} className="py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-mutedForeground">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Grid body */}
                {loading ? (
                    <div className="flex-1 flex items-center justify-center text-mutedForeground">
                        <div className="text-sm font-bold animate-pulse">Memuat kalender...</div>
                    </div>
                ) : (
                    <div className="flex-1 grid grid-cols-7 overflow-y-auto" style={{ gridAutoRows: 'minmax(100px, 1fr)' }}>
                        {/* Prev month empty cells */}
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                            <div key={`e-${i}`} className="border-r border-b border-border bg-muted/20" />
                        ))}

                        {/* Days */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dayItems = getItemsForDay(day);
                            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                            const MAX_VISIBLE = 3;

                            return (
                                <div
                                    key={day}
                                    className={`border-r border-b border-border p-1.5 flex flex-col gap-1 overflow-hidden transition-colors hover:bg-muted/30 ${isToday ? 'bg-accent/5' : ''}`}
                                >
                                    {/* Day number */}
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-black ${isToday
                                            ? 'bg-accent text-white'
                                            : 'text-mutedForeground'
                                        }`}>
                                            {day}
                                        </span>
                                        {dayItems.length > 0 && (
                                            <span className="text-[9px] font-black text-mutedForeground/60">{dayItems.length}</span>
                                        )}
                                    </div>

                                    {/* Content cards */}
                                    {dayItems.slice(0, MAX_VISIBLE).map(item => {
                                        const wsColor = getWorkspaceColor(item.workspace_id);
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => { setSelectedItem(item); setIsDetailOpen(true); }}
                                                className="w-full text-left rounded-md px-1.5 py-1 text-[10px] font-bold leading-tight line-clamp-1 transition-all hover:brightness-110 hover:scale-[1.02]"
                                                style={{
                                                    backgroundColor: `${wsColor}20`,
                                                    borderLeft: `2.5px solid ${wsColor}`,
                                                    color: wsColor
                                                }}
                                                title={item.title}
                                            >
                                                <span className="flex items-center gap-1">
                                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDot(item.status)}`} />
                                                    <span className="truncate">{item.title}</span>
                                                </span>
                                            </button>
                                        );
                                    })}

                                    {dayItems.length > MAX_VISIBLE && (
                                        <button
                                            onClick={() => { setDayViewDate(day); setIsDayViewOpen(true); }}
                                            className="text-[9px] font-black text-mutedForeground/60 hover:text-accent transition-colors text-left pl-1"
                                        >
                                            +{dayItems.length - MAX_VISIBLE} lagi
                                        </button>
                                    )}
                                </div>
                            );
                        })}

                        {/* Next month empty cells */}
                        {Array.from({ length: Math.max(0, 35 - (daysInMonth + firstDayOfMonth)) }).map((_, i) => (
                            <div key={`n-${i}`} className="border-r border-b border-border bg-muted/20" />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Content Detail Modal ── */}
            <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Detail Konten">
                {selectedItem && (
                    <div className="space-y-4">
                        {/* Title & workspace */}
                        <div
                            className="p-4 rounded-xl"
                            style={{
                                backgroundColor: `${getWorkspaceColor(selectedItem.workspace_id)}15`,
                                borderLeft: `4px solid ${getWorkspaceColor(selectedItem.workspace_id)}`
                            }}
                        >
                            <h3 className="text-lg font-black text-foreground leading-tight mb-1">{selectedItem.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-mutedForeground font-medium">
                                {getPlatformIcon(selectedItem.platform, 14)}
                                <span>{selectedItem.platform}</span>
                                {selectedItem.workspaces?.name && (
                                    <>
                                        <span>·</span>
                                        <Layers size={12} />
                                        <span>{selectedItem.workspaces.name}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Status & Type */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase text-mutedForeground tracking-widest block mb-1.5">Status</label>
                                <Select
                                    value={selectedItem.status}
                                    onChange={e => handleUpdateStatus(e.target.value)}
                                    disabled={updating}
                                >
                                    <option value="To-Do">To-Do</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Review">Review</option>
                                    <option value="Scheduled">Scheduled</option>
                                    <option value="Published">Published</option>
                                </Select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-mutedForeground tracking-widest block mb-1.5">Tipe</label>
                                <div className="px-3 py-2.5 bg-muted rounded-xl border border-border font-bold text-foreground text-sm capitalize">
                                    {selectedItem.type || 'Standard'}
                                </div>
                            </div>
                        </div>

                        {/* Date */}
                        {selectedItem.date && (
                            <div className="flex items-center gap-2 text-sm text-mutedForeground font-medium">
                                <span className="font-black text-foreground">Tanggal:</span>
                                {new Date(selectedItem.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-between pt-2 border-t border-border">
                            <Button variant="outline" onClick={() => navigate(`/plan/${selectedItem.workspace_id}`)}>
                                Buka Workspace
                            </Button>
                            <Button onClick={() => setIsDetailOpen(false)}>Tutup</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── Day View Modal ── */}
            <Modal
                isOpen={isDayViewOpen}
                onClose={() => setIsDayViewOpen(false)}
                title={`${MONTH_NAMES[month]} ${dayViewDate}, ${year}`}
                maxWidth="max-w-lg"
            >
                <div className="space-y-2">
                    {dayViewDate && getItemsForDay(dayViewDate).map(item => {
                        const wsColor = getWorkspaceColor(item.workspace_id);
                        return (
                            <button
                                key={item.id}
                                onClick={() => { setSelectedItem(item); setIsDayViewOpen(false); setIsDetailOpen(true); }}
                                className="w-full text-left p-3 rounded-xl border-2 border-border hover:border-accent transition-all group"
                                style={{ borderLeftColor: wsColor, borderLeftWidth: 4 }}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 text-mutedForeground group-hover:text-accent transition-colors">
                                        {getPlatformIcon(item.platform, 16)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-foreground text-sm line-clamp-2 group-hover:text-accent transition-colors">{item.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`w-2 h-2 rounded-full ${getStatusDot(item.status)}`} />
                                            <span className="text-[10px] font-bold text-mutedForeground">{item.status}</span>
                                            {item.workspaces?.name && (
                                                <span className="text-[10px] text-mutedForeground/60">· {item.workspaces.name}</span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-mutedForeground group-hover:text-accent transition-colors flex-shrink-0 mt-0.5" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </Modal>
        </div>
    );
};
