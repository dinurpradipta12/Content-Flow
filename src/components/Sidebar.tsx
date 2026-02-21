import React, { useState, useEffect } from 'react';
import { useCarouselStore, CANVAS_SIZES } from '../store/useCarouselStore';
import { Type, Image as ImageIcon, Palette, Layout, ChevronDown, Layers, Eye, EyeOff, Lock, Unlock, GripVertical, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Save, FolderOpen, Loader2, Plus, Square, Circle, Upload } from 'lucide-react';
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
                <p className="text-xs font-black uppercase truncate">{layer.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{layer.type}</p>
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
    
    const currentPage = pages[currentPageIndex];

    useEffect(() => {
        if (activeTab === 'content') {
            fetchPresets();
        }
    }, [activeTab]);

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
                    className={`flex-1 py-4 font-black uppercase text-xs tracking-widest transition-colors ${activeTab === 'content' ? 'bg-yellow-400 text-slate-900' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                >
                    Content
                </button>
                <button 
                    onClick={() => setActiveTab('layers')}
                    className={`flex-1 py-4 font-black uppercase text-xs tracking-widest transition-colors border-l-4 border-slate-900 ${activeTab === 'layers' ? 'bg-yellow-400 text-slate-900' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
                >
                    Layers
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {activeTab === 'content' ? (
                    <div className="space-y-8">
                        {/* Presets */}
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                                    <FolderOpen size={14} /> Presets
                                </label>
                                <button 
                                    onClick={handleSavePreset}
                                    disabled={isSaving}
                                    className="p-1.5 bg-accent text-white rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                </button>
                            </div>
                            <div className="space-y-2">
                                {isLoadingPresets ? (
                                    <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-300" size={20} /></div>
                                ) : presets.length > 0 ? (
                                    presets.map(preset => (
                                        <button 
                                            key={preset.id}
                                            onClick={() => handleLoadPreset(preset)}
                                            className="w-full text-left p-3 bg-slate-50 border-2 border-slate-900 rounded-xl hover:bg-yellow-50 transition-colors font-bold text-xs truncate uppercase"
                                        >
                                            {preset.name}
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-[10px] font-bold text-slate-400 italic text-center py-2">No presets saved yet</p>
                                )}
                            </div>
                        </section>

                        {/* Canvas Size */}
                        <section>
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                                <Layout size={14} /> Canvas Size
                            </label>
                            <div className="relative">
                                <select 
                                    value={canvasSize.id}
                                    onChange={(e) => {
                                        const size = CANVAS_SIZES.find(s => s.id === e.target.value);
                                        if (size) setCanvasSize(size);
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
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                                <Palette size={14} /> Background
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {['#ffffff', '#f8fafc', '#f27d26', '#0f172a', '#10b981', '#ef4444', '#3b82f6'].map(color => (
                                    <button
                                        key={color}
                                        onClick={() => updatePageBackground(currentPageIndex, color)}
                                        className={`w-10 h-10 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] transition-transform hover:-translate-y-1 ${currentPage.background === color ? 'ring-4 ring-accent ring-offset-2' : ''}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <label className="w-10 h-10 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center cursor-pointer hover:bg-slate-50 relative">
                                    <Plus size={18} className="text-slate-400" />
                                    <input 
                                        type="color" 
                                        className="absolute inset-0 opacity-0 cursor-pointer" 
                                        onChange={(e) => updatePageBackground(currentPageIndex, e.target.value)}
                                    />
                                </label>
                            </div>
                        </section>

                        {/* Add Elements */}
                        <section className="space-y-4">
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                                <Plus size={14} /> Add Elements
                            </label>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => window.dispatchEvent(new CustomEvent('canvas:add', { detail: { type: 'text' } }))}
                                    className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border-4 border-slate-900 rounded-2xl hover:bg-yellow-50 transition-colors group"
                                >
                                    <Type size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase">Add Text</span>
                                </button>
                                <button 
                                    onClick={() => window.dispatchEvent(new CustomEvent('canvas:add', { detail: { type: 'rect' } }))}
                                    className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border-4 border-slate-900 rounded-2xl hover:bg-yellow-50 transition-colors group"
                                >
                                    <Square size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase">Add Shape</span>
                                </button>
                                <label className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border-4 border-slate-900 rounded-2xl hover:bg-yellow-50 transition-colors group cursor-pointer">
                                    <ImageIcon size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase">Add Image</span>
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
                                    className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border-4 border-slate-900 rounded-2xl hover:bg-yellow-50 transition-colors group"
                                >
                                    <Circle size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase">Add Circle</span>
                                </button>
                                <label className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 border-4 border-slate-900 rounded-2xl hover:bg-yellow-50 transition-colors group cursor-pointer">
                                    <Upload size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase text-center">Upload Font</span>
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
                        <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
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
        </div>
    );
};

