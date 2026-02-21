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
    Upload,
    ZoomIn,
    ZoomOut,
    Maximize,
    Palette,
    List,
    Type as KerningIcon,
    Bold,
    Italic
} from 'lucide-react';

export const Editor: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvas = useRef<fabric.Canvas | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const { pages, currentPageIndex, canvasSize, setCurrentLayers, zoom, setZoom, referenceData, customFonts, loadFonts } = useCarouselStore();
    const currentPage = pages[currentPageIndex];
    
    const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [objectProps, setObjectProps] = useState({
        opacity: 1,
        angle: 0,
        flipX: false,
        flipY: false,
        textAlign: 'left',
        fontFamily: 'Inter',
        fontSize: 40,
        shadowBlur: 0,
        shadowColor: '#000000',
        shadowOpacity: 1,
        shadowAngle: 45,
        shadowDistance: 5,
        strokeWidth: 0,
        strokeColor: '#000000',
        strokeType: 'middle' as 'inner' | 'outer' | 'middle',
        fill: '#000000',
        charSpacing: 0,
        lineHeight: 1.16,
        textCase: 'normal' as 'normal' | 'uppercase' | 'lowercase',
        cornerRadius: 0
    });

    const fonts = ['Inter', 'Space Grotesk', 'Playfair Display', 'JetBrains Mono', 'Anton', 'Montserrat', ...customFonts];

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
        loadFonts();
    }, []);

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
            backgroundColor: currentPage.background,
            preserveObjectStacking: true,
            selection: true,
            width: canvasSize.width,
            height: canvasSize.height
        });

        fabricCanvas.current = canvas;

        // Initialize with content
        if (currentPage.elements.length === 0) {
            const hook = new fabric.IText('Judul Utama', {
                id: 'hook',
                left: 100,
                top: 100,
                fontSize: 60,
                fontWeight: 'bold',
                fontFamily: 'Inter',
                fill: '#0f172a',
                name: 'hook'
            });
            canvas.add(hook);
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
                    fontFamily: (obj as any).fontFamily || 'Inter',
                    fontSize: (obj as any).fontSize || 40,
                    shadowBlur: (obj.shadow as any)?.blur || 0,
                    shadowColor: (obj.shadow as any)?.color || '#000000',
                    strokeWidth: obj.strokeWidth || 0,
                    strokeColor: obj.stroke as string || '#000000',
                    fill: obj.fill as string || '#000000',
                    charSpacing: (obj as any).charSpacing || 0,
                    lineHeight: (obj as any).lineHeight || 1.16,
                    textCase: (obj as any).textCase || 'normal',
                    cornerRadius: (obj as any).rx || 0
                });
            }
            updateLayers();
        });
        
        canvas.on('object:added', updateLayers);
        canvas.on('object:removed', updateLayers);

        // Mouse Wheel Zoom (Alt + Scroll)
        canvas.on('mouse:wheel', (opt) => {
            if (!opt.e.altKey) return;
            const delta = opt.e.deltaY;
            let newZoom = zoom;
            newZoom *= 0.999 ** delta;
            if (newZoom > 5) newZoom = 5;
            if (newZoom < 0.1) newZoom = 0.1;
            setZoom(newZoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();
        });

        // Panning Logic
        let isDragging = false;
        let lastPosX = 0;
        let lastPosY = 0;

        canvas.on('mouse:down', (opt) => {
            if (isPanning) {
                isDragging = true;
                canvas.selection = false;
                const e = opt.e as any;
                lastPosX = e.clientX;
                lastPosY = e.clientY;
            }
        });

        canvas.on('mouse:move', (opt) => {
            if (isDragging) {
                const e = opt.e as any;
                const vpt = canvas.viewportTransform;
                if (vpt) {
                    vpt[4] += e.clientX - lastPosX;
                    vpt[5] += e.clientY - lastPosY;
                    canvas.requestRenderAll();
                    lastPosX = e.clientX;
                    lastPosY = e.clientY;
                }
            }
        });

        canvas.on('mouse:up', () => {
            isDragging = false;
            canvas.selection = true;
        });

        const handleCanvasAction = (e: any) => {
            const { type, id, layers } = e.detail;
            
            if (type === 'reorder' && layers) {
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

        const handleCanvasAdd = (e: any) => {
            const { type, data } = e.detail;
            if (type === 'text') {
                const text = new fabric.IText('New Text', {
                    left: 100,
                    top: 100,
                    fontFamily: 'Inter',
                    fontSize: 40,
                    fill: '#000000'
                });
                canvas.add(text);
                canvas.setActiveObject(text);
            } else if (type === 'rect') {
                const rect = new fabric.Rect({
                    left: 100,
                    top: 100,
                    width: 100,
                    height: 100,
                    fill: '#f27d26',
                    rx: 0,
                    ry: 0
                });
                canvas.add(rect);
                canvas.setActiveObject(rect);
            } else if (type === 'circle') {
                const circle = new fabric.Circle({
                    left: 100,
                    top: 100,
                    radius: 50,
                    fill: '#f27d26'
                });
                canvas.add(circle);
                canvas.setActiveObject(circle);
            } else if (type === 'image' && data) {
                fabric.Image.fromURL(data).then((img) => {
                    img.scaleToWidth(300);
                    canvas.add(img);
                    canvas.setActiveObject(img);
                });
            }
            canvas.renderAll();
        };

        window.addEventListener('canvas:action', handleCanvasAction);
        window.addEventListener('canvas:add', handleCanvasAdd);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !isPanning) {
                setIsPanning(true);
                canvas.defaultCursor = 'grab';
                canvas.hoverCursor = 'grab';
                canvas.renderAll();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsPanning(false);
                canvas.defaultCursor = 'default';
                canvas.hoverCursor = 'move';
                canvas.renderAll();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('canvas:action', handleCanvasAction);
            window.removeEventListener('canvas:add', handleCanvasAdd);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            canvas.dispose();
        };
    }, [currentPageIndex, canvasSize.id, referenceData, isPanning]);

    // Immediate Background Update
    useEffect(() => {
        if (fabricCanvas.current) {
            fabricCanvas.current.set('backgroundColor', currentPage.background);
            fabricCanvas.current.renderAll();
        }
    }, [currentPage.background]);

    const handleFontSize = (size: number) => {
        if (!selectedObject || !fabricCanvas.current || !(selectedObject instanceof fabric.IText)) return;
        selectedObject.set('fontSize', size);
        fabricCanvas.current.renderAll();
        setObjectProps(prev => ({ ...prev, fontSize: size }));
    };

    const handleCornerRadius = (radius: number) => {
        if (!selectedObject || !fabricCanvas.current || !(selectedObject instanceof fabric.Rect)) return;
        selectedObject.set({ rx: radius, ry: radius });
        fabricCanvas.current.renderAll();
        setObjectProps(prev => ({ ...prev, cornerRadius: radius }));
    };

    const handleTextCase = (textCase: 'normal' | 'uppercase' | 'lowercase') => {
        if (!selectedObject || !fabricCanvas.current || !(selectedObject instanceof fabric.IText)) return;
        const text = selectedObject.text || '';
        let newText = text;
        if (textCase === 'uppercase') newText = text.toUpperCase();
        else if (textCase === 'lowercase') newText = text.toLowerCase();
        
        selectedObject.set({ text: newText });
        (selectedObject as any).textCase = textCase;
        fabricCanvas.current.renderAll();
        setObjectProps(prev => ({ ...prev, textCase }));
    };

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
        
        if (type === 'rect') shape = new fabric.Rect({ ...common, rx: 0, ry: 0 });
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

    const handleColor = (color: string) => {
        if (!selectedObject || !fabricCanvas.current) return;
        selectedObject.set('fill', color);
        fabricCanvas.current.renderAll();
        setObjectProps(prev => ({ ...prev, fill: color }));
    };

    const handleSpacing = (type: 'char' | 'line', value: number) => {
        if (!selectedObject || !fabricCanvas.current || !(selectedObject instanceof fabric.IText)) return;
        if (type === 'char') {
            selectedObject.set('charSpacing', value);
            setObjectProps(prev => ({ ...prev, charSpacing: value }));
        } else {
            selectedObject.set('lineHeight', value);
            setObjectProps(prev => ({ ...prev, lineHeight: value }));
        }
        fabricCanvas.current.renderAll();
    };

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
                } catch (err) {
                    console.error('Font load error:', err);
                }
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleShadow = (updates: Partial<typeof objectProps>) => {
        if (!selectedObject || !fabricCanvas.current) return;
        
        const newProps = { ...objectProps, ...updates };
        setObjectProps(newProps);

        const { shadowBlur, shadowColor, shadowOpacity, shadowAngle, shadowDistance } = newProps;

        // Convert hex to rgba for opacity
        const r = parseInt(shadowColor.slice(1, 3), 16);
        const g = parseInt(shadowColor.slice(3, 5), 16);
        const b = parseInt(shadowColor.slice(5, 7), 16);
        const color = `rgba(${r}, ${g}, ${b}, ${shadowOpacity})`;

        const offsetX = shadowDistance * Math.cos(shadowAngle * (Math.PI / 180));
        const offsetY = shadowDistance * Math.sin(shadowAngle * (Math.PI / 180));

        selectedObject.set('shadow', new fabric.Shadow({
            blur: shadowBlur,
            color: color,
            offsetX: offsetX,
            offsetY: offsetY
        }));
        fabricCanvas.current.renderAll();
    };

    const handleStroke = (updates: Partial<typeof objectProps>) => {
        if (!selectedObject || !fabricCanvas.current) return;
        
        const newProps = { ...objectProps, ...updates };
        setObjectProps(newProps);

        const { strokeWidth, strokeColor, strokeType } = newProps;

        selectedObject.set({
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            paintFirst: strokeType === 'outer' ? 'stroke' : 'fill' // 'stroke' draws stroke first (behind fill), 'fill' draws fill first (stroke on top)
        });
        fabricCanvas.current.renderAll();
    };

    const handleDelete = () => {
        if (!selectedObject || !fabricCanvas.current) return;
        fabricCanvas.current.remove(selectedObject);
        fabricCanvas.current.discardActiveObject();
        fabricCanvas.current.renderAll();
    };

    return (
        <div ref={containerRef} className="flex-1 bg-slate-200 flex flex-col overflow-hidden relative">
            {/* Canvas Wrapper for Zoom */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-200">
                <div 
                    className="transition-transform duration-200 ease-out shadow-[20px_20px_0px_0px_#0f172a] border-4 border-slate-900 bg-white"
                    style={{ 
                        transform: `scale(${zoom})`,
                        width: canvasSize.width,
                        height: canvasSize.height
                    }}
                >
                    <canvas ref={canvasRef} />
                </div>
            </div>

            {/* Top Right Toolbar: Zoom & Fullscreen */}
            <div className="absolute top-6 right-6 bg-white border-4 border-slate-900 rounded-2xl p-2 flex items-center gap-2 shadow-[4px_4px_0px_0px_#0f172a] z-20">
                <button onClick={() => setZoom(Math.max(0.1, zoom - 0.1))} className="p-1.5 hover:bg-slate-100 rounded-md"><ZoomOut size={16} /></button>
                <span className="text-[10px] font-black w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(Math.min(5, zoom + 0.1))} className="p-1.5 hover:bg-slate-100 rounded-md"><ZoomIn size={16} /></button>
                <div className="w-1 h-6 bg-slate-200 mx-1" />
                <button onClick={() => setZoom(1)} className="p-1.5 hover:bg-slate-100 rounded-md" title="Reset Zoom"><Maximize size={16} /></button>
            </div>

            {/* Left Vertical Toolbar */}
            {selectedObject && (
                <div className="absolute top-1/2 -translate-y-1/2 left-6 flex flex-col gap-4 z-30">
                    <div className="bg-white border-4 border-slate-900 rounded-2xl p-2 flex flex-col gap-2 shadow-[4px_4px_0px_0px_#0f172a]">
                        {/* Typography Group */}
                        {selectedObject instanceof fabric.IText && (
                            <>
                                <div className="relative group">
                                    <button 
                                        onClick={() => setActiveTool(activeTool === 'typography' ? null : 'typography')}
                                        className={`p-3 rounded-xl transition-all ${activeTool === 'typography' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}`}
                                        title="Typography"
                                    >
                                        <Type size={20} />
                                    </button>
                                    {activeTool === 'typography' && (
                                        <div className="absolute left-full top-0 ml-4 bg-white border-4 border-slate-900 rounded-2xl p-4 w-64 shadow-[8px_8px_0px_0px_#0f172a] z-50 animate-in slide-in-from-left-2">
                                            <h4 className="font-black text-xs uppercase tracking-widest mb-3">Typography</h4>
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-bold uppercase text-slate-500">Font Family</span>
                                                    <select 
                                                        value={objectProps.fontFamily}
                                                        onChange={(e) => handleFontFamily(e.target.value)}
                                                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none focus:border-slate-900"
                                                    >
                                                        {fonts.map(f => <option key={f} value={f}>{f}</option>)}
                                                    </select>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1 space-y-1">
                                                        <span className="text-[10px] font-bold uppercase text-slate-500">Size</span>
                                                        <input 
                                                            type="number" 
                                                            value={objectProps.fontSize} 
                                                            onChange={(e) => handleFontSize(parseInt(e.target.value))}
                                                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none focus:border-slate-900"
                                                        />
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <span className="text-[10px] font-bold uppercase text-slate-500">Color</span>
                                                        <div className="flex items-center gap-2 h-[34px] bg-slate-50 border-2 border-slate-200 rounded-lg px-2">
                                                            <input 
                                                                type="color" 
                                                                value={objectProps.fill} 
                                                                onChange={(e) => handleColor(e.target.value)}
                                                                className="w-6 h-6 rounded border border-slate-300 p-0 overflow-hidden cursor-pointer"
                                                            />
                                                            <span className="text-[10px] font-mono">{objectProps.fill}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 border-2 border-slate-200 rounded-lg p-1 bg-slate-50">
                                                    <button onClick={() => {
                                                        const isBold = (selectedObject as fabric.IText).fontWeight === 'bold';
                                                        (selectedObject as fabric.IText).set('fontWeight', isBold ? 'normal' : 'bold');
                                                        fabricCanvas.current?.renderAll();
                                                    }} className="flex-1 p-1.5 hover:bg-white rounded font-bold text-xs flex justify-center"><Bold size={14} /></button>
                                                    <button onClick={() => {
                                                        const isItalic = (selectedObject as fabric.IText).fontStyle === 'italic';
                                                        (selectedObject as fabric.IText).set('fontStyle', isItalic ? 'normal' : 'italic');
                                                        fabricCanvas.current?.renderAll();
                                                    }} className="flex-1 p-1.5 hover:bg-white rounded font-italic text-xs flex justify-center"><Italic size={14} /></button>
                                                </div>
                                                <div className="flex gap-1 border-2 border-slate-200 rounded-lg p-1 bg-slate-50">
                                                    <button onClick={() => handleTextAlign('left')} className={`flex-1 p-1.5 rounded flex justify-center ${objectProps.textAlign === 'left' ? 'bg-slate-900 text-white' : 'hover:bg-white'}`}><AlignLeft size={14} /></button>
                                                    <button onClick={() => handleTextAlign('center')} className={`flex-1 p-1.5 rounded flex justify-center ${objectProps.textAlign === 'center' ? 'bg-slate-900 text-white' : 'hover:bg-white'}`}><AlignCenter size={14} /></button>
                                                    <button onClick={() => handleTextAlign('right')} className={`flex-1 p-1.5 rounded flex justify-center ${objectProps.textAlign === 'right' ? 'bg-slate-900 text-white' : 'hover:bg-white'}`}><AlignRight size={14} /></button>
                                                </div>
                                                <div className="flex gap-1 border-2 border-slate-200 rounded-lg p-1 bg-slate-50">
                                                    <button onClick={() => handleTextCase('normal')} className={`flex-1 p-1.5 rounded text-[10px] font-bold ${objectProps.textCase === 'normal' ? 'bg-slate-900 text-white' : 'hover:bg-white'}`}>Aa</button>
                                                    <button onClick={() => handleTextCase('uppercase')} className={`flex-1 p-1.5 rounded text-[10px] font-bold ${objectProps.textCase === 'uppercase' ? 'bg-slate-900 text-white' : 'hover:bg-white'}`}>AA</button>
                                                    <button onClick={() => handleTextCase('lowercase')} className={`flex-1 p-1.5 rounded text-[10px] font-bold ${objectProps.textCase === 'lowercase' ? 'bg-slate-900 text-white' : 'hover:bg-white'}`}>aa</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="relative group">
                                    <button 
                                        onClick={() => setActiveTool(activeTool === 'spacing' ? null : 'spacing')}
                                        className={`p-3 rounded-xl transition-all ${activeTool === 'spacing' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}`}
                                        title="Spacing"
                                    >
                                        <KerningIcon size={20} />
                                    </button>
                                    {activeTool === 'spacing' && (
                                        <div className="absolute left-full top-0 ml-4 bg-white border-4 border-slate-900 rounded-2xl p-4 w-64 shadow-[8px_8px_0px_0px_#0f172a] z-50 animate-in slide-in-from-left-2">
                                            <h4 className="font-black text-xs uppercase tracking-widest mb-3">Spacing</h4>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                                                        <span>Letter Spacing</span>
                                                        <span>{objectProps.charSpacing}</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="-100" max="500" 
                                                        value={objectProps.charSpacing} 
                                                        onChange={(e) => handleSpacing('char', parseInt(e.target.value))}
                                                        className="w-full accent-slate-900"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                                                        <span>Line Height</span>
                                                        <span>{objectProps.lineHeight}</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="0.5" max="3" step="0.1"
                                                        value={objectProps.lineHeight} 
                                                        onChange={(e) => handleSpacing('line', parseFloat(e.target.value))}
                                                        className="w-full accent-slate-900"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => {
                                        if (selectedObject instanceof fabric.IText) {
                                            const text = selectedObject.text || '';
                                            const lines = text.split('\n');
                                            const allBulleted = lines.every(l => l.startsWith('• '));
                                            const newText = allBulleted 
                                                ? lines.map(l => l.replace(/^• /, '')).join('\n')
                                                : lines.map(l => l.startsWith('• ') ? l : `• ${l}`).join('\n');
                                            selectedObject.set('text', newText);
                                            fabricCanvas.current?.renderAll();
                                        }
                                    }}
                                    className="p-3 rounded-xl bg-white hover:bg-slate-100 transition-all"
                                    title="Toggle List"
                                >
                                    <List size={20} />
                                </button>
                            </>
                        )}

                        {/* Flip Tool */}
                        <div className="relative group">
                            <button 
                                onClick={() => setActiveTool(activeTool === 'flip' ? null : 'flip')}
                                className={`p-3 rounded-xl transition-all ${activeTool === 'flip' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}`}
                                title="Flip"
                            >
                                <FlipHorizontal size={20} />
                            </button>
                            {activeTool === 'flip' && (
                                <div className="absolute left-full top-0 ml-4 bg-white border-4 border-slate-900 rounded-2xl p-4 w-40 shadow-[8px_8px_0px_0px_#0f172a] z-50 animate-in slide-in-from-left-2">
                                    <h4 className="font-black text-xs uppercase tracking-widest mb-3">Flip</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleFlip('x')} className={`flex-1 p-2 rounded-lg border-2 border-slate-200 hover:border-slate-900 ${objectProps.flipX ? 'bg-slate-100' : ''}`}><FlipHorizontal className="mx-auto" size={20} /></button>
                                        <button onClick={() => handleFlip('y')} className={`flex-1 p-2 rounded-lg border-2 border-slate-200 hover:border-slate-900 ${objectProps.flipY ? 'bg-slate-100' : ''}`}><FlipVertical className="mx-auto" size={20} /></button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Stroke Tool */}
                        <div className="relative group">
                            <button 
                                onClick={() => setActiveTool(activeTool === 'stroke' ? null : 'stroke')}
                                className={`p-3 rounded-xl transition-all ${activeTool === 'stroke' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}`}
                                title="Stroke"
                            >
                                <div className={`w-5 h-5 border-2 rounded-sm ${activeTool === 'stroke' ? 'border-white' : 'border-slate-900'}`} />
                            </button>
                            
                            {activeTool === 'stroke' && (
                                <div className="absolute left-full top-0 ml-4 bg-white border-4 border-slate-900 rounded-2xl p-4 w-64 shadow-[8px_8px_0px_0px_#0f172a] z-50 animate-in slide-in-from-left-2">
                                    <h4 className="font-black text-xs uppercase tracking-widest mb-3">Stroke Settings</h4>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                                                <span>Width</span>
                                                <span>{objectProps.strokeWidth}px</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="20" 
                                                value={objectProps.strokeWidth} 
                                                onChange={(e) => handleStroke({ strokeWidth: parseInt(e.target.value) })}
                                                className="w-full accent-slate-900"
                                            />
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-bold uppercase text-slate-500">Position</span>
                                            <div className="flex gap-1 border-2 border-slate-200 rounded-lg p-1 bg-slate-50">
                                                <button 
                                                    onClick={() => handleStroke({ strokeType: 'middle' })}
                                                    className={`flex-1 p-1.5 rounded text-[10px] font-bold ${objectProps.strokeType === 'middle' ? 'bg-slate-900 text-white' : 'hover:bg-white'}`}
                                                >
                                                    Middle
                                                </button>
                                                <button 
                                                    onClick={() => handleStroke({ strokeType: 'outer' })}
                                                    className={`flex-1 p-1.5 rounded text-[10px] font-bold ${objectProps.strokeType === 'outer' ? 'bg-slate-900 text-white' : 'hover:bg-white'}`}
                                                >
                                                    Outer
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <span className="text-[10px] font-bold uppercase text-slate-500">Color</span>
                                            <div className="flex gap-2 flex-wrap">
                                                {['#000000', '#ffffff', '#f27d26', '#ef4444', '#3b82f6'].map(c => (
                                                    <button 
                                                        key={c}
                                                        onClick={() => handleStroke({ strokeColor: c })}
                                                        className={`w-6 h-6 rounded border-2 border-slate-200 ${objectProps.strokeColor === c ? 'ring-2 ring-slate-900' : ''}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                                <input 
                                                    type="color" 
                                                    value={objectProps.strokeColor}
                                                    onChange={(e) => handleStroke({ strokeColor: e.target.value })}
                                                    className="w-6 h-6 rounded border-2 border-slate-200 p-0 overflow-hidden"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Shadow Tool */}
                        <div className="relative group">
                            <button 
                                onClick={() => setActiveTool(activeTool === 'shadow' ? null : 'shadow')}
                                className={`p-3 rounded-xl transition-all ${activeTool === 'shadow' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}`}
                                title="Shadow"
                            >
                                <div className={`w-5 h-5 rounded-sm shadow-lg ${activeTool === 'shadow' ? 'bg-white' : 'bg-slate-300'}`} />
                            </button>

                            {activeTool === 'shadow' && (
                                <div className="absolute left-full top-0 ml-4 bg-white border-4 border-slate-900 rounded-2xl p-4 w-64 shadow-[8px_8px_0px_0px_#0f172a] z-50 animate-in slide-in-from-left-2">
                                    <h4 className="font-black text-xs uppercase tracking-widest mb-3">Shadow Settings</h4>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                                                <span>Distance (Value)</span>
                                                <span>{objectProps.shadowDistance}px</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="50" 
                                                value={objectProps.shadowDistance} 
                                                onChange={(e) => handleShadow({ shadowDistance: parseInt(e.target.value) })}
                                                className="w-full accent-slate-900"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                                                <span>Blur</span>
                                                <span>{objectProps.shadowBlur}px</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="50" 
                                                value={objectProps.shadowBlur} 
                                                onChange={(e) => handleShadow({ shadowBlur: parseInt(e.target.value) })}
                                                className="w-full accent-slate-900"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                                                <span>Rotation</span>
                                                <span>{objectProps.shadowAngle}°</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="360" 
                                                value={objectProps.shadowAngle} 
                                                onChange={(e) => handleShadow({ shadowAngle: parseInt(e.target.value) })}
                                                className="w-full accent-slate-900"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                                                <span>Opacity</span>
                                                <span>{Math.round(objectProps.shadowOpacity * 100)}%</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="1" step="0.01"
                                                value={objectProps.shadowOpacity} 
                                                onChange={(e) => handleShadow({ shadowOpacity: parseFloat(e.target.value) })}
                                                className="w-full accent-slate-900"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <span className="text-[10px] font-bold uppercase text-slate-500">Color</span>
                                            <div className="flex gap-2 flex-wrap">
                                                {['#000000', '#0f172a', '#94a3b8', '#f27d26'].map(c => (
                                                    <button 
                                                        key={c}
                                                        onClick={() => handleShadow({ shadowColor: c })}
                                                        className={`w-6 h-6 rounded border-2 border-slate-200 ${objectProps.shadowColor === c ? 'ring-2 ring-slate-900' : ''}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                                <input 
                                                    type="color" 
                                                    value={objectProps.shadowColor}
                                                    onChange={(e) => handleShadow({ shadowColor: e.target.value })}
                                                    className="w-6 h-6 rounded border-2 border-slate-200 p-0 overflow-hidden"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Radius Tool (Rect Only) */}
                        {selectedObject instanceof fabric.Rect && (
                            <div className="relative group">
                                <button 
                                    onClick={() => setActiveTool(activeTool === 'radius' ? null : 'radius')}
                                    className={`p-3 rounded-xl transition-all ${activeTool === 'radius' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}`}
                                    title="Corner Radius"
                                >
                                    <Square size={20} className="rounded-md" />
                                </button>
                                {activeTool === 'radius' && (
                                    <div className="absolute left-full top-0 ml-4 bg-white border-4 border-slate-900 rounded-2xl p-4 w-48 shadow-[8px_8px_0px_0px_#0f172a] z-50 animate-in slide-in-from-left-2">
                                        <h4 className="font-black text-xs uppercase tracking-widest mb-3">Corner Radius</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                                                <span>Value</span>
                                                <span>{objectProps.cornerRadius}px</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="100" 
                                                value={objectProps.cornerRadius} 
                                                onChange={(e) => handleCornerRadius(parseInt(e.target.value))}
                                                className="w-full accent-slate-900"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="h-px bg-slate-200 my-1" />

                        {/* Delete */}
                        <button onClick={handleDelete} className="p-3 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-xl transition-colors" title="Delete">
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
