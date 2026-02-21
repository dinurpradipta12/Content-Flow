import React, { useState } from 'react';
import { useCarouselStore, CANVAS_SIZES } from '../store/useCarouselStore';
import { Type, Image as ImageIcon, Palette, Layout, ChevronDown, Layers, Eye, EyeOff, Lock, Unlock, GripVertical, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';
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
    const { pages, currentPageIndex, updatePageContent, updatePageBackground, canvasSize, setCanvasSize, currentLayers, setCurrentLayers } = useCarouselStore();
    const [activeTab, setActiveTab] = useState<'content' | 'layers'>('content');
    const currentPage = pages[currentPageIndex];

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

    const fonts = ['Inter', 'Space Grotesk', 'Playfair Display', 'JetBrains Mono', 'Anton', 'Montserrat'];

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
                                <label className="w-10 h-10 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] flex items-center justify-center cursor-pointer hover:bg-slate-50">
                                    <ImageIcon size={18} className="text-slate-400" />
                                    <input type="file" className="hidden" />
                                </label>
                            </div>
                        </section>

                        {/* Content Form */}
                        <section className="space-y-6">
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                                <Type size={14} /> Structured Content
                            </label>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black uppercase mb-1 text-slate-600">Hook</label>
                                    <input 
                                        type="text"
                                        value={currentPage.content.hook}
                                        onChange={(e) => handleContentChange('hook', e.target.value)}
                                        className="w-full border-4 border-slate-900 rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:bg-yellow-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase mb-1 text-slate-600">Sub-Headline</label>
                                    <input 
                                        type="text"
                                        value={currentPage.content.subHeadline}
                                        onChange={(e) => handleContentChange('subHeadline', e.target.value)}
                                        className="w-full border-4 border-slate-900 rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:bg-yellow-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase mb-1 text-slate-600">Body Text</label>
                                    <textarea 
                                        rows={4}
                                        value={currentPage.content.body}
                                        onChange={(e) => handleContentChange('body', e.target.value)}
                                        className="w-full border-4 border-slate-900 rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:bg-yellow-50 resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase mb-1 text-slate-600">Call to Action</label>
                                    <input 
                                        type="text"
                                        value={currentPage.content.cta}
                                        onChange={(e) => handleContentChange('cta', e.target.value)}
                                        className="w-full border-4 border-slate-900 rounded-xl px-4 py-2 font-bold text-sm focus:outline-none focus:bg-yellow-50"
                                    />
                                </div>
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
