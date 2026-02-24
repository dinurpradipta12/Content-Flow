import React, { useState, useEffect } from 'react';
import { useCarouselStore, CANVAS_SIZES } from '../store/useCarouselStore';
import { Type, Image as ImageIcon, Palette, Layout, ChevronDown, Layers, Eye, EyeOff, Lock, Unlock, GripVertical, Save, FolderOpen, Loader2, Plus, Square, Circle, Upload, Download, Trash2, X, Triangle, Paintbrush, Star, Keyboard } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableLayerItem: React.FC<{ layer: any }> = ({ layer }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: layer.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-3 bg-slate-50 border-2 border-slate-900 rounded-xl hover:bg-yellow-50 transition-colors group"
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-900"
            >
                <GripVertical size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{layer.name}</p>
                <p className="text-[10px] font-bold text-slate-400">{layer.type}</p>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('canvas:action', { detail: { type: 'visibility', id: layer.id } }));
                    }}
                    className={`p-1.5 rounded-md hover:bg-white transition-colors ${!layer.visible ? 'text-red-500' : 'text-slate-400'}`}
                >
                    {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('canvas:action', { detail: { type: 'lock', id: layer.id } }));
                    }}
                    className={`p-1.5 rounded-md hover:bg-white transition-colors ${layer.locked ? 'text-accent' : 'text-slate-400'}`}
                >
                    {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
            </div>
        </div>
    );
};

export const Sidebar: React.FC = () => {
    const {
        pages,
        currentPageIndex,
        updatePageContent,
        updatePageBackground,
        updateAllPageBackgrounds,
        canvasSize,
        setCanvasSize,
        currentLayers,
        setCurrentLayers,
        savePreset,
        loadPresets,
        setPages,
        uploadFont
    } = useCarouselStore();

    const [activeTab, setActiveTab] = useState<'content' | 'layers'>('content');
    const [isSaving, setIsSaving] = useState(false);
    const [presets, setPresets] = useState<any[]>([]);
    const [isLoadingPresets, setIsLoadingPresets] = useState(false);
    const [applyBgToAll, setApplyBgToAll] = useState(false);
    const [showShortcutsModal, setShowShortcutsModal] = useState(false);
    const importInputRef = React.useRef<HTMLInputElement>(null);

    const defaultShortcuts = {
        undo: 'z',
        redo: 'Z',
        duplicate: 'd',
        copy: 'c',
        paste: 'v',
        delete: 'Backspace',
        addText: 't',
        addRect: 'r',
        addCircle: 'o'
    };

    const [shortcuts, setShortcuts] = useState<Record<string, string>>(() => {
        const saved = localStorage.getItem('carousel_shortcuts');
        return saved ? JSON.parse(saved) : defaultShortcuts;
    });

    const handleShortcutKeyDown = (action: string, e: React.KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Meta' || e.key === 'Alt') return;

        let newKey = e.key;
        if (e.shiftKey && newKey.length === 1) {
            newKey = newKey.toUpperCase();
        }

        const newShortcuts = { ...shortcuts, [action]: newKey };
        setShortcuts(newShortcuts);
        localStorage.setItem('carousel_shortcuts', JSON.stringify(newShortcuts));
        window.dispatchEvent(new CustomEvent('canvas:shortcuts-updated'));
    };

    const currentPage = pages[currentPageIndex];

    const handleBackgroundChange = (color: string) => {
        if (applyBgToAll) {
            updateAllPageBackgrounds(color);
        } else {
            updatePageBackground(currentPageIndex, color);
        }
    };

    useEffect(() => {
        if (activeTab === 'content') {
            fetchPresets();
        }
    }, [activeTab]);

    // Listen for open-shortcuts event from BottomBar
    useEffect(() => {
        const handleOpenShortcuts = () => setShowShortcutsModal(true);
        window.addEventListener('canvas:open-shortcuts', handleOpenShortcuts);
        return () => window.removeEventListener('canvas:open-shortcuts', handleOpenShortcuts);
    }, []);

    const fetchPresets = async () => {
        try {
            setIsLoadingPresets(true);
            const data = await loadPresets();
            setPresets(data);
        } catch (err) {
            console.error('Failed to load presets:', err);
        } finally {
            setIsLoadingPresets(false);
        }
    };

    const handleSavePreset = async () => {
        const name = prompt('Enter preset name:');
        if (!name) return;

        try {
            setIsSaving(true);
            await savePreset(name);
            alert('Preset saved successfully!');
            fetchPresets();
        } catch (err) {
            alert('Failed to save preset. Make sure you are logged in.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadPreset = (preset: any) => {
        if (confirm(`Load preset "${preset.name}"? This will replace your current design.`)) {
            setPages(preset.data.pages);
            setCanvasSize(preset.data.canvasSize);
            window.dispatchEvent(new CustomEvent('canvas:load-preset', { detail: preset.data }));
        }
    };

    const handleExportPreset = (preset: any, e: React.MouseEvent) => {
        e.stopPropagation();
        const { supabase: _sb, ...exportData } = preset;
        const fileContent = JSON.stringify({
            __cfpreset: true,
            version: '1.0',
            exportedAt: new Date().toISOString(),
            name: preset.name,
            data: preset.data
        }, null, 2);
        const blob = new Blob([fileContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${preset.name.replace(/\s+/g, '_')}.cfpreset`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (f) => {
            try {
                const json = JSON.parse(f.target?.result as string);
                if (!json.__cfpreset) {
                    alert('File tidak valid. Gunakan file .cfpreset yang valid.');
                    return;
                }
                const importedName = json.name || file.name.replace('.cfpreset', '');
                const confirmName = prompt(`Import preset sebagai:`, importedName);
                if (!confirmName) return;
                setIsSaving(true);
                await savePreset(confirmName, json.data);
                alert(`Preset "${confirmName}" berhasil diimport!`);
                fetchPresets();
            } catch (err) {
                console.error('Import error', err);
                alert('Gagal membaca file preset. Pastikan format file benar.');
            } finally {
                setIsSaving(false);
                if (importInputRef.current) importInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleDeletePreset = async (preset: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Hapus preset "${preset.name}"?`)) return;
        try {
            const { supabase } = await import('../services/supabaseClient');
            const { error } = await supabase.from('carousel_presets').delete().eq('id', preset.id);
            if (error) throw error;
            fetchPresets();
        } catch (err) {
            console.error('Delete error', err);
            alert('Gagal menghapus preset.');
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = currentLayers.findIndex((item) => item.id === active.id);
            const newIndex = currentLayers.findIndex((item) => item.id === over.id);
            const newLayers = arrayMove(currentLayers, oldIndex, newIndex);
            setCurrentLayers(newLayers);
            window.dispatchEvent(new CustomEvent('canvas:action', { detail: { type: 'reorder', layers: newLayers } }));
        }
    };

    const handleContentChange = (key: string, value: string) => {
        updatePageContent(currentPageIndex, { [key]: value });
    };

    return (
        <div className="w-80 bg-white border-r-4 border-slate-900 flex flex-col h-full overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b-4 border-slate-900 shrink-0">
                <button
                    onClick={() => setActiveTab('content')}
                    className={`flex-1 py-4 font-bold text-xs tracking-widest transition-colors ${activeTab === 'content' ? 'bg-yellow-400 text-slate-900' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                >
                    Content
                </button>
                <button
                    onClick={() => setActiveTab('layers')}
                    className={`flex-1 py-4 font-bold text-xs tracking-widest transition-colors border-l-4 border-slate-900 ${activeTab === 'layers' ? 'bg-yellow-400 text-slate-900' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                >
                    Layers
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {activeTab === 'content' ? (
                    <div className="space-y-8">
                        {/* Presets */}
                        <section>
                            <label className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-400 mb-2">
                                <FolderOpen size={14} /> Presets
                            </label>

                            {/* Action Pills — single row */}
                            <div className="flex items-center gap-1.5 mb-3">
                                {/* Save */}
                                <button
                                    onClick={handleSavePreset}
                                    disabled={isSaving}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-accent text-white rounded-full border border-slate-900 shadow-[1px_1px_0px_0px_#0f172a] hover:brightness-110 transition-all disabled:opacity-50 text-[10px] font-black"
                                    title="Simpan preset"
                                >
                                    {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                                    Save
                                </button>

                                {/* Export — Upload icon (kirim keluar = upload) */}
                                <div className="relative group">
                                    <button
                                        disabled={presets.length === 0}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-full border border-slate-900 shadow-[1px_1px_0px_0px_#0f172a] hover:brightness-110 transition-all disabled:opacity-40 text-[10px] font-black"
                                        title="Export preset ke file .cfpreset"
                                    >
                                        <Upload size={11} />
                                        Export
                                    </button>
                                    {presets.length > 0 && (
                                        <div className="hidden group-hover:flex absolute top-full left-0 z-50 flex-col bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] overflow-hidden mt-1 min-w-[150px]">
                                            {presets.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={(e) => handleExportPreset(p, e)}
                                                    className="text-left px-3 py-2 text-xs font-bold hover:bg-emerald-50 truncate border-b border-slate-100 last:border-0"
                                                >
                                                    ↑ {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Import — Download icon (terima dari luar = download) */}
                                <label
                                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-400 text-slate-900 rounded-full border border-slate-900 shadow-[1px_1px_0px_0px_#0f172a] hover:brightness-110 transition-all cursor-pointer text-[10px] font-black"
                                    title="Import preset dari file .cfpreset"
                                >
                                    <Download size={11} />
                                    Import
                                    <input
                                        ref={importInputRef}
                                        type="file"
                                        accept=".cfpreset,application/json"
                                        className="hidden"
                                        onChange={handleImportPreset}
                                    />
                                </label>
                            </div>

                            {/* Presets Grid — small cards */}
                            {isLoadingPresets ? (
                                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-300" size={18} /></div>
                            ) : presets.length > 0 ? (
                                <div className="grid grid-cols-2 gap-1.5">
                                    {presets.map(preset => (
                                        <div
                                            key={preset.id}
                                            className="group relative flex flex-col bg-slate-50 border-2 border-slate-900 rounded-xl p-2 hover:bg-yellow-50 transition-colors cursor-pointer overflow-hidden"
                                            onClick={() => handleLoadPreset(preset)}
                                            title={`${preset.name}\n${preset.data?.pages?.length ?? 1} slide · ${preset.data?.canvasSize?.label ?? 'Custom'}`}
                                        >
                                            {/* Name */}
                                            <p className="font-black text-[11px] text-slate-900 leading-tight line-clamp-2 pr-5">{preset.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 mt-0.5 truncate">{preset.data?.pages?.length ?? 1}s · {preset.data?.canvasSize?.label?.split('(')[0]?.trim() ?? 'Custom'}</p>

                                            {/* Action buttons — top-right, visible on hover */}
                                            <div className="absolute top-1 right-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => handleExportPreset(preset, e)}
                                                    className="p-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-500 hover:text-white transition-colors"
                                                    title="Export"
                                                >
                                                    <Upload size={9} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeletePreset(preset, e)}
                                                    className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-500 hover:text-white transition-colors"
                                                    title="Hapus preset"
                                                >
                                                    <Trash2 size={9} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-5 px-3 border-2 border-dashed border-slate-200 rounded-xl">
                                    <p className="text-[10px] font-bold text-slate-400 italic">Belum ada preset</p>
                                    <p className="text-[9px] text-slate-300 mt-0.5">Save atau Import .cfpreset</p>
                                </div>
                            )}
                        </section>

                        {/* Canvas Size */}
                        <section>
                            <label className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-400 mb-3">
                                <Layout size={14} /> Canvas Size
                            </label>
                            <div className="relative">
                                <select
                                    value={canvasSize.id}
                                    onChange={(e) => {
                                        const size = CANVAS_SIZES.find(s => s.id === e.target.value);
                                        if (size) {
                                            setCanvasSize(size);
                                            window.dispatchEvent(new CustomEvent('canvas:resize', { detail: { newSize: size } }));
                                        }
                                    }}
                                    className="w-full bg-slate-50 border-4 border-slate-900 rounded-xl px-4 py-3 font-bold text-sm appearance-none focus:outline-none focus:bg-yellow-50 transition-colors cursor-pointer"
                                >
                                    {CANVAS_SIZES.map(size => (
                                        <option key={size.id} value={size.id}>{size.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={18} />
                            </div>
                        </section>

                        {/* Background */}
                        <section>
                            <label className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-400 mb-3">
                                <Palette size={14} /> Background
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {['#ffffff', '#f8fafc', '#f27d26', '#0f172a', '#10b981', '#ef4444', '#3b82f6', 'grad-1', 'grad-2', 'grad-3'].map(color => {
                                    const bgStyle = color === 'grad-1' ? 'linear-gradient(45deg, #ff9a9e, #fecfef)' :
                                        color === 'grad-2' ? 'radial-gradient(circle, #d4fc79, #96e6a1)' :
                                            color === 'grad-3' ? 'linear-gradient(to top right, #accbee, #e7f0fd)' : color;
                                    return (
                                        <button
                                            key={color}
                                            onClick={() => handleBackgroundChange(color)}
                                            className={`w-10 h-10 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-transform hover:-translate-y-1 ${currentPage.background === color ? 'ring-4 ring-accent ring-offset-2' : ''}`}
                                            style={{ background: bgStyle }}
                                        />
                                    );
                                })}
                                <label className="w-10 h-10 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center cursor-pointer hover:bg-slate-50 relative">
                                    <Plus size={18} className="text-slate-400" />
                                    <input
                                        type="color"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => handleBackgroundChange(e.target.value)}
                                    />
                                </label>
                            </div>
                            <div className="mt-4 flex bg-slate-100 rounded-xl p-1 border-2 border-slate-200">
                                <button
                                    onClick={() => setApplyBgToAll(false)}
                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${!applyBgToAll ? 'bg-white shadow border-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Hanya Page Ini
                                </button>
                                <button
                                    onClick={() => setApplyBgToAll(true)}
                                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${applyBgToAll ? 'bg-white shadow border-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Terapkan ke Semua
                                </button>
                            </div>
                        </section>

                        {/* Add Elements */}
                        <section className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-400">
                                <Plus size={14} /> Add Elements
                            </label>

                            <div className="grid grid-cols-4 gap-1.5">
                                <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('canvas:add', { detail: { type: 'text' } }))}
                                    className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-50 border-2 border-slate-900 rounded-xl hover:bg-yellow-50 transition-colors group"
                                >
                                    <Type size={16} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[8px] font-bold">Text</span>
                                </button>
                                <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('canvas:add', { detail: { type: 'rect' } }))}
                                    className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-50 border-2 border-slate-900 rounded-xl hover:bg-yellow-50 transition-colors group"
                                >
                                    <Square size={16} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[8px] font-bold">Shape</span>
                                </button>
                                <label className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-50 border-2 border-slate-900 rounded-xl hover:bg-yellow-50 transition-colors group cursor-pointer">
                                    <ImageIcon size={16} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[8px] font-bold">Image</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (f) => {
                                                    window.dispatchEvent(new CustomEvent('canvas:add', { detail: { type: 'image', data: f.target?.result } }));
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        accept="image/*"
                                    />
                                </label>
                                <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('canvas:add', { detail: { type: 'circle' } }))}
                                    className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-50 border-2 border-slate-900 rounded-xl hover:bg-yellow-50 transition-colors group"
                                >
                                    <Circle size={16} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[8px] font-bold">Circle</span>
                                </button>
                                <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('canvas:add', { detail: { type: 'triangle' } }))}
                                    className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-50 border-2 border-slate-900 rounded-xl hover:bg-yellow-50 transition-colors group"
                                >
                                    <Triangle size={16} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[8px] font-bold">Triangle</span>
                                </button>
                                <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('canvas:add', { detail: { type: 'brush' } }))}
                                    className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-50 border-2 border-slate-900 rounded-xl hover:bg-yellow-50 transition-colors group"
                                >
                                    <Paintbrush size={16} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[8px] font-bold">Brush</span>
                                </button>
                                <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('canvas:add', { detail: { type: 'sticker-star' } }))}
                                    className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-50 border-2 border-slate-900 rounded-xl hover:bg-yellow-50 transition-colors group"
                                >
                                    <Star size={16} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[8px] font-bold">Sticker</span>
                                </button>
                                <label className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-50 border-2 border-slate-900 rounded-xl hover:bg-yellow-50 transition-colors group cursor-pointer">
                                    <Upload size={16} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[8px] font-bold">Font</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = async (f) => {
                                                    const data = f.target?.result;
                                                    if (typeof data === 'string') {
                                                        const fontName = file.name.split('.')[0];
                                                        try {
                                                            await uploadFont(fontName, data);
                                                            alert(`Font ${fontName} uploaded and synced!`);
                                                        } catch (err) {
                                                            console.error('Font upload error:', err);
                                                            alert('Failed to upload font.');
                                                        }
                                                    }
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        accept=".ttf,.otf,.woff,.woff2"
                                    />
                                </label>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <label className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-400 mb-4">
                            <Layers size={14} /> Layers Order
                        </label>

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={currentLayers.map(l => l.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-2">
                                    {currentLayers.map((layer) => (
                                        <SortableLayerItem key={layer.id} layer={layer} />
                                    ))}
                                    {currentLayers.length === 0 && (
                                        <p className="text-xs font-bold text-slate-400 italic text-center py-10">
                                            No elements on this page
                                        </p>
                                    )}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                )}
            </div>

            {/* Custom Shortcuts Modal */}
            {showShortcutsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white border-4 border-slate-900 rounded-3xl p-6 w-[400px] shadow-[8px_8px_0px_0px_#0f172a] relative max-h-[80vh] overflow-y-auto">
                        <button onClick={() => setShowShortcutsModal(false)} className="absolute top-4 right-4 hover:bg-slate-100 p-2 rounded-xl">
                            <X size={20} />
                        </button>
                        <h2 className="font-black text-2xl mb-2 flex items-center gap-3"><Keyboard /> Custom Shortcuts</h2>
                        <p className="text-xs font-bold text-slate-500 mb-6">Click input and press any key to reassign shortcut. (Ctrl/Cmd is default for actions like Copy, Undo, etc.)</p>

                        <div className="space-y-4">
                            {[
                                { action: 'undo', label: 'Undo', prefix: 'Ctrl/Cmd +' },
                                { action: 'redo', label: 'Redo', prefix: 'Ctrl/Cmd + Shift +' },
                                { action: 'duplicate', label: 'Duplicate', prefix: 'Ctrl/Cmd +' },
                                { action: 'copy', label: 'Copy', prefix: 'Ctrl/Cmd +' },
                                { action: 'paste', label: 'Paste', prefix: 'Ctrl/Cmd +' },
                                { action: 'delete', label: 'Delete Object', prefix: '' },
                                { action: 'addText', label: 'Add Text', prefix: 'Alt +' },
                                { action: 'addRect', label: 'Add Square', prefix: 'Alt +' },
                                { action: 'addCircle', label: 'Add Circle', prefix: 'Alt +' },
                            ].map(({ action, label, prefix }) => (
                                <div key={action} className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700">{label}</span>
                                    <div className="flex items-center gap-2">
                                        {prefix && <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">{prefix}</span>}
                                        <input
                                            type="text"
                                            readOnly
                                            value={shortcuts[action]}
                                            onKeyDown={(e) => handleShortcutKeyDown(action, e)}
                                            className="w-20 p-2 border-2 border-slate-200 rounded-lg text-center font-bold text-xs uppercase focus:border-slate-900 focus:outline-none cursor-pointer hover:bg-slate-50"
                                            title="Click and press a key"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 pt-4 border-t-2 border-slate-100 text-center">
                            <button
                                onClick={() => {
                                    setShortcuts(defaultShortcuts);
                                    localStorage.setItem('carousel_shortcuts', JSON.stringify(defaultShortcuts));
                                    window.dispatchEvent(new CustomEvent('canvas:shortcuts-updated'));
                                }}
                                className="text-xs font-bold text-red-500 hover:text-red-600 underline"
                            >
                                Reset to Defaults
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

