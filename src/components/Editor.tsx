import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { useCarouselStore } from '../store/useCarouselStore';
import { 
    Square, 
    Circle, 
    Triangle, 
    Image as ImageIcon, 
    FlipHorizontal, 
    FlipVertical, 
    RotateCw, 
    ArrowUp, 
    ArrowDown, 
    Trash2,
    Lock,
    Unlock,
    Eye,
    EyeOff,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Type,
    Type as FontIcon,
    Upload
} from 'lucide-react';

export const Editor: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvas = useRef<fabric.Canvas | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const { pages, currentPageIndex, canvasSize, setCurrentLayers } = useCarouselStore();
    const currentPage = pages[currentPageIndex];
    
    const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
    const [objectProps, setObjectProps] = useState({
        opacity: 1,
        angle: 0,
        flipX: false,
        flipY: false,
        textAlign: 'left',
        fontFamily: 'Inter',
        shadowBlur: 0,
        shadowColor: '#000000',
        strokeWidth: 0,
        strokeColor: '#000000'
    });

    const fonts = ['Inter', 'Space Grotesk', 'Playfair Display', 'JetBrains Mono', 'Anton', 'Montserrat'];

    const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (f) => {
            const data = f.target?.result;
            if (data instanceof ArrayBuffer) {
                const fontName = file.name.split('.')[0];
                const fontFace = new FontFace(fontName, data);
                try {
                    const loadedFace = await fontFace.load();
                    (document.fonts as any).add(loadedFace);
                    alert(`Font ${fontName} loaded!`);
                    // Add to fonts list if needed or just use it
                } catch (err) {
                    console.error('Font load error:', err);
                }
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleShadow = (blur: number, color: string) => {
        if (!selectedObject || !fabricCanvas.current) return;
        selectedObject.set('shadow', new fabric.Shadow({
            blur: blur,
            color: color,
            offsetX: blur / 2,
            offsetY: blur / 2
        }));
        fabricCanvas.current.renderAll();
        setObjectProps(prev => ({ ...prev, shadowBlur: blur, shadowColor: color }));
    };

    const handleStroke = (width: number, color: string) => {
        if (!selectedObject || !fabricCanvas.current) return;
        selectedObject.set({
            stroke: color,
            strokeWidth: width
        });
        fabricCanvas.current.renderAll();
        setObjectProps(prev => ({ ...prev, strokeWidth: width, strokeColor: color }));
    };

    const updateLayers = () => {
        if (!fabricCanvas.current) return;
        const objects = fabricCanvas.current.getObjects().map((obj, index) => ({
            id: (obj as any).id || `obj-${index}`,
            type: obj.type,
            name: (obj as any).name || `${obj.type} ${index + 1}`,
            visible: obj.visible,
            locked: obj.lockMovementX,
            zIndex: index
        })).reverse();
        setCurrentLayers(objects);
    };

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
            backgroundColor: currentPage.background,
            preserveObjectStacking: true,
        });

        fabricCanvas.current = canvas;

        if (currentPage.elements.length === 0) {
            const hook = new fabric.IText(currentPage.content.hook, {
                id: 'hook',
                left: 100,
                top: 100,
                fontSize: 60,
                fontWeight: 'bold',
                fontFamily: 'Inter',
                fill: '#0f172a',
                name: 'hook'
            });

            const subHeadline = new fabric.IText(currentPage.content.subHeadline, {
                id: 'subHeadline',
                left: 100,
                top: 200,
                fontSize: 30,
                fontFamily: 'Inter',
                fill: '#64748b',
                name: 'subHeadline'
            });

            const body = new fabric.IText(currentPage.content.body, {
                id: 'body',
                left: 100,
                top: 300,
                fontSize: 24,
                fontFamily: 'Inter',
                fill: '#334155',
                width: 600,
                name: 'body'
            });

            const cta = new fabric.IText(currentPage.content.cta, {
                id: 'cta',
                left: 100,
                top: 500,
                fontSize: 24,
                fontWeight: 'bold',
                fontFamily: 'Inter',
                fill: '#ffffff',
                backgroundColor: '#f27d26',
                padding: 10,
                name: 'cta'
            });

            canvas.add(hook, subHeadline, body, cta);
        }

        canvas.on('selection:created', (e) => setSelectedObject(e.selected[0]));
        canvas.on('selection:updated', (e) => setSelectedObject(e.selected[0]));
        canvas.on('selection:cleared', () => setSelectedObject(null));
        
        canvas.on('object:modified', () => {
            if (canvas.getActiveObject()) {
                const obj = canvas.getActiveObject()!;
                setObjectProps({
                    opacity: obj.opacity || 1,
                    angle: obj.angle || 0,
                    flipX: obj.flipX || false,
                    flipY: obj.flipY || false,
                    textAlign: (obj as any).textAlign || 'left',
                    fontFamily: (obj as any).fontFamily || 'Inter'
                });
            }
            updateLayers();
        });
        
        canvas.on('object:added', updateLayers);
        canvas.on('object:removed', updateLayers);

        const handleCanvasAction = (e: any) => {
            const { type, id, layers } = e.detail;
            
            if (type === 'reorder' && layers) {
                // Reorder objects based on layers list
                const objects = canvas.getObjects();
                const sortedObjects = [...layers].reverse().map(layer => 
                    objects.find((obj: any) => obj.id === layer.id)
                ).filter(Boolean);
                
                canvas.clear();
                canvas.set('backgroundColor', currentPage.background);
                sortedObjects.forEach(obj => canvas.add(obj as fabric.Object));
                canvas.renderAll();
                return;
            }

            const obj = canvas.getObjects().find((o: any) => o.id === id);
            if (!obj) return;

            if (type === 'visibility') {
                obj.set('visible', !obj.visible);
            } else if (type === 'lock') {
                const isLocked = !obj.lockMovementX;
                obj.set({
                    lockMovementX: isLocked,
                    lockMovementY: isLocked,
                    lockScalingX: isLocked,
                    lockScalingY: isLocked,
                    lockRotation: isLocked,
                    hasControls: !isLocked
                });
            }
            canvas.renderAll();
            updateLayers();
        };

        window.addEventListener('canvas:action', handleCanvasAction);

        const resizeCanvas = () => {
            if (!containerRef.current || !fabricCanvas.current) return;
            const container = containerRef.current;
            const scale = Math.min(
                (container.clientWidth - 100) / canvasSize.width,
                (container.clientHeight - 100) / canvasSize.height
            );

            fabricCanvas.current.setDimensions({
                width: canvasSize.width * scale,
                height: canvasSize.height * scale
            });
            fabricCanvas.current.setZoom(scale);
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        updateLayers();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('canvas:action', handleCanvasAction);
            canvas.dispose();
        };
    }, [currentPageIndex, canvasSize.id]);

    useEffect(() => {
        if (!fabricCanvas.current) return;
        const canvas = fabricCanvas.current;
        
        const updateText = (name: string, text: string) => {
            const obj = canvas.getObjects().find(o => (o as any).name === name) as fabric.IText;
            if (obj) {
                obj.set('text', text);
                canvas.renderAll();
            }
        };

        updateText('hook', currentPage.content.hook);
        updateText('subHeadline', currentPage.content.subHeadline);
        updateText('body', currentPage.content.body);
        updateText('cta', currentPage.content.cta);
        
        canvas.set('backgroundColor', currentPage.background);
        canvas.renderAll();
    }, [currentPage.content, currentPage.background]);

    const addShape = (type: 'rect' | 'circle' | 'triangle') => {
        if (!fabricCanvas.current) return;
        let shape;
        const common = { 
            id: `shape-${Date.now()}`,
            left: 200, 
            top: 200, 
            fill: '#f27d26', 
            width: 150, 
            height: 150,
            cornerStyle: 'circle' as const,
            transparentCorners: false,
            cornerColor: '#f27d26',
            cornerStrokeColor: '#0f172a',
            cornerSize: 12
        };
        
        if (type === 'rect') shape = new fabric.Rect(common);
        else if (type === 'circle') shape = new fabric.Circle({ ...common, radius: 75 });
        else shape = new fabric.Triangle(common);
        
        fabricCanvas.current.add(shape);
        fabricCanvas.current.setActiveObject(shape);
    };

    const addImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !fabricCanvas.current) return;
        
        const reader = new FileReader();
        reader.onload = (f) => {
            const data = f.target?.result;
            if (typeof data === 'string') {
                fabric.Image.fromURL(data).then((img) => {
                    (img as any).id = `img-${Date.now()}`;
                    img.scaleToWidth(300);
                    fabricCanvas.current?.add(img);
                    fabricCanvas.current?.setActiveObject(img);
                });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleFlip = (dir: 'x' | 'y') => {
        if (!selectedObject || !fabricCanvas.current) return;
        if (dir === 'x') selectedObject.set('flipX', !selectedObject.flipX);
        else selectedObject.set('flipY', !selectedObject.flipY);
        fabricCanvas.current.renderAll();
        setObjectProps(prev => ({ ...prev, flipX: selectedObject.flipX, flipY: selectedObject.flipY }));
    };

    const handleRotate = (angle: number) => {
        if (!selectedObject || !fabricCanvas.current) return;
        selectedObject.set('angle', angle);
        fabricCanvas.current.renderAll();
        setObjectProps(prev => ({ ...prev, angle }));
    };

    const handleOpacity = (opacity: number) => {
        if (!selectedObject || !fabricCanvas.current) return;
        selectedObject.set('opacity', opacity);
        fabricCanvas.current.renderAll();
        setObjectProps(prev => ({ ...prev, opacity }));
    };

    const handleZIndex = (action: 'front' | 'back' | 'forward' | 'backward') => {
        if (!selectedObject || !fabricCanvas.current) return;
        if (action === 'front') selectedObject.bringToFront();
        else if (action === 'back') selectedObject.sendToBack();
        else if (action === 'forward') selectedObject.bringForward();
        else if (action === 'backward') selectedObject.sendBackwards();
        fabricCanvas.current.renderAll();
        updateLayers();
    };

    const handleTextAlign = (align: 'left' | 'center' | 'right') => {
        if (!selectedObject || !fabricCanvas.current || !(selectedObject instanceof fabric.IText)) return;
        selectedObject.set('textAlign', align);
        fabricCanvas.current.renderAll();
        setObjectProps(prev => ({ ...prev, textAlign: align }));
    };

    const handleFontFamily = (font: string) => {
        if (!selectedObject || !fabricCanvas.current || !(selectedObject instanceof fabric.IText)) return;
        selectedObject.set('fontFamily', font);
        fabricCanvas.current.renderAll();
        setObjectProps(prev => ({ ...prev, fontFamily: font }));
    };

    const handleDelete = () => {
        if (!selectedObject || !fabricCanvas.current) return;
        fabricCanvas.current.remove(selectedObject);
        fabricCanvas.current.discardActiveObject();
        fabricCanvas.current.renderAll();
    };

    return (
        <div ref={containerRef} className="flex-1 bg-slate-200 flex items-center justify-center overflow-hidden relative p-10">
            {/* Top Toolbar: Add Elements */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white border-4 border-slate-900 rounded-2xl p-2 flex items-center gap-2 shadow-[4px_4px_0px_0px_#0f172a] z-10">
                <button onClick={() => addShape('rect')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Add Square"><Square size={20} /></button>
                <button onClick={() => addShape('circle')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Add Circle"><Circle size={20} /></button>
                <button onClick={() => addShape('triangle')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Add Triangle"><Triangle size={20} /></button>
                <div className="w-1 h-8 bg-slate-200 mx-1" />
                <label className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" title="Add Image">
                    <ImageIcon size={20} />
                    <input type="file" className="hidden" onChange={addImage} accept="image/*" />
                </label>
            </div>

            {/* Selection Toolbar */}
            {selectedObject && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white border-4 border-white rounded-2xl p-4 flex items-center gap-6 shadow-2xl z-20 animate-in slide-in-from-bottom-4 max-w-[90vw] overflow-x-auto custom-scrollbar">
                    {/* Text Specific Tools */}
                    {selectedObject instanceof fabric.IText && (
                        <>
                            <div className="flex flex-col gap-1 shrink-0">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Typography</span>
                                <div className="flex gap-1 items-center">
                                    <select 
                                        value={objectProps.fontFamily}
                                        onChange={(e) => handleFontFamily(e.target.value)}
                                        className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs font-bold focus:outline-none"
                                    >
                                        {fonts.map(f => <option key={f} value={f} className="text-slate-900">{f}</option>)}
                                    </select>
                                    <label className="p-1.5 hover:bg-white/20 rounded-md cursor-pointer" title="Upload Font">
                                        <Upload size={14} />
                                        <input type="file" className="hidden" onChange={handleFontUpload} accept=".ttf,.otf,.woff,.woff2" />
                                    </label>
                                    <div className="flex border border-white/20 rounded overflow-hidden">
                                        <button onClick={() => handleTextAlign('left')} className={`p-1.5 hover:bg-white/20 ${objectProps.textAlign === 'left' ? 'bg-accent' : ''}`}><AlignLeft size={14} /></button>
                                        <button onClick={() => handleTextAlign('center')} className={`p-1.5 hover:bg-white/20 ${objectProps.textAlign === 'center' ? 'bg-accent' : ''}`}><AlignCenter size={14} /></button>
                                        <button onClick={() => handleTextAlign('right')} className={`p-1.5 hover:bg-white/20 ${objectProps.textAlign === 'right' ? 'bg-accent' : ''}`}><AlignRight size={14} /></button>
                                    </div>
                                </div>
                            </div>
                            <div className="w-px h-10 bg-white/20 shrink-0" />

                            {/* Effects */}
                            <div className="flex flex-col gap-1 shrink-0">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Effects</span>
                                <div className="flex gap-2">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[8px] font-bold opacity-50">Shadow</span>
                                        <input 
                                            type="range" min="0" max="20" 
                                            value={objectProps.shadowBlur} 
                                            onChange={(e) => handleShadow(parseInt(e.target.value), objectProps.shadowColor)}
                                            className="accent-accent w-16"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[8px] font-bold opacity-50">Stroke</span>
                                        <input 
                                            type="range" min="0" max="10" 
                                            value={objectProps.strokeWidth} 
                                            onChange={(e) => handleStroke(parseInt(e.target.value), objectProps.strokeColor)}
                                            className="accent-accent w-16"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="w-px h-10 bg-white/20 shrink-0" />
                        </>
                    )}

                    {/* Flip */}
                    <div className="flex flex-col gap-1 shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Flip</span>
                        <div className="flex gap-1">
                            <button onClick={() => handleFlip('x')} className={`p-1.5 rounded-md hover:bg-white/20 ${objectProps.flipX ? 'bg-accent' : ''}`}><FlipHorizontal size={16} /></button>
                            <button onClick={() => handleFlip('y')} className={`p-1.5 rounded-md hover:bg-white/20 ${objectProps.flipY ? 'bg-accent' : ''}`}><FlipVertical size={16} /></button>
                        </div>
                    </div>

                    <div className="w-px h-10 bg-white/20 shrink-0" />

                    {/* Rotate */}
                    <div className="flex flex-col gap-1 w-24 shrink-0">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Rotate</span>
                            <span className="text-[10px] font-bold">{Math.round(objectProps.angle)}°</span>
                        </div>
                        <input 
                            type="range" min="0" max="360" 
                            value={objectProps.angle} 
                            onChange={(e) => handleRotate(parseInt(e.target.value))}
                            className="accent-accent w-full"
                        />
                    </div>

                    <div className="w-px h-10 bg-white/20 shrink-0" />

                    {/* Opacity */}
                    <div className="flex flex-col gap-1 w-24 shrink-0">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Opacity</span>
                            <span className="text-[10px] font-bold">{Math.round(objectProps.opacity * 100)}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="1" step="0.01"
                            value={objectProps.opacity} 
                            onChange={(e) => handleOpacity(parseFloat(e.target.value))}
                            className="accent-accent w-full"
                        />
                    </div>

                    <div className="w-px h-10 bg-white/20 shrink-0" />

                    {/* Z-Index */}
                    <div className="flex flex-col gap-1 shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Order</span>
                        <div className="flex gap-1">
                            <button onClick={() => handleZIndex('front')} className="p-1.5 rounded-md hover:bg-white/20" title="Bring to Front"><ArrowUp size={16} className="text-accent" /></button>
                            <button onClick={() => handleZIndex('back')} className="p-1.5 rounded-md hover:bg-white/20" title="Send to Back"><ArrowDown size={16} /></button>
                        </div>
                    </div>

                    <div className="w-px h-10 bg-white/20 shrink-0" />

                    {/* Delete */}
                    <button onClick={handleDelete} className="p-3 bg-red-500 rounded-xl hover:bg-red-600 transition-colors shadow-[2px_2px_0px_0px_#ffffff] shrink-0">
                        <Trash2 size={20} />
                    </button>
                </div>
            )}

            <div className="shadow-[20px_20px_0px_0px_#0f172a] border-4 border-slate-900 bg-white">
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
};
