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
    AlignVerticalSpaceAround as KerningIcon,
    Bold,
    Italic,
    Copy,
    Clipboard,
    Undo2,
    Redo2,
    ArrowUpToLine,
    ArrowDownToLine,
    ArrowLeftToLine,
    ArrowRightToLine,
    AlignHorizontalJustifyCenter,
    AlignVerticalJustifyCenter,
    X,
    Group,
    Ungroup,
    ChevronsUp,
    ChevronsDown,
    Wand2,
    Crop
} from 'lucide-react';

// Monkey patch Fabric.js to add padding and rounded corners to text background color
if (!(fabric.Text.prototype as any)._patchedTextBg) {
    const origRenderBg = (fabric.Text.prototype as any)._renderTextLinesBackground;
    if (origRenderBg) {
        (fabric.Text.prototype as any)._renderTextLinesBackground = function (this: any, ctx: CanvasRenderingContext2D) {
            if (!this.textBackgroundColor && !this.styleHas('textBackgroundColor')) {
                return origRenderBg.call(this, ctx);
            }
            // Calculate proportional padding based on font size
            const padX = this.fontSize * 0.25;
            const padY = this.fontSize * 0.05;

            const originalFillRect = ctx.fillRect;
            ctx.fillRect = function (x, y, w, h) {
                if (typeof ctx.roundRect === 'function') {
                    ctx.beginPath();
                    ctx.roundRect(x - padX, y - padY, w + padX * 2, h + padY * 2, 4);
                    ctx.fill();
                } else {
                    originalFillRect.call(ctx, x - padX, y - padY, w + padX * 2, h + padY * 2);
                }
            };
            origRenderBg.call(this, ctx);
            ctx.fillRect = originalFillRect; // Restore normal behavior afterwards
        };
        (fabric.Text.prototype as any)._patchedTextBg = true;
    }
}

export const Editor: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvas = useRef<fabric.Canvas | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const { pages, currentPageIndex, canvasSize, setCurrentLayers, zoom, setZoom, referenceData, customFonts, loadFonts, updatePageElements } = useCarouselStore();
    const currentPage = pages[currentPageIndex];

    const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
    const isActiveSelection = selectedObject instanceof fabric.ActiveSelection;
    const isGroup = selectedObject instanceof fabric.Group && !isActiveSelection;
    const [isPanning, setIsPanning] = useState(false);
    const isPanningRef = useRef(false);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [brushSettings, setBrushSettings] = useState({ width: 10, color: '#f27d26' });

    // Sync isPanning state to ref for event handlers
    useEffect(() => {
        isPanningRef.current = isPanning;
    }, [isPanning]);

    const isRestoringHistory = useRef(false);
    const [cropRect, setCropRect] = useState<fabric.Rect | null>(null);

    const saveCanvas = () => {
        if (!fabricCanvas.current) return;
        const json = fabricCanvas.current.toJSON(['id', 'name', 'locked', 'selectable', 'evented', 'hoverCursor', 'textCase', 'charSpacing', 'lineHeight', 'paintFirst', 'textBackgroundColor', 'fill', 'opacity', 'filters', 'clipPath']);
        const previewUrl = fabricCanvas.current.toDataURL({ format: 'png', multiplier: 0.2 });
        updatePageElements(currentPageIndex, json.objects, previewUrl);
    };
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
        cornerRadius: 0,
        textBgColor: 'transparent',
        brightness: 0,
        contrast: 0,
        blur: 0,
        grayscale: false,
        sepia: false,
        mask: 'none' as 'none' | 'circle' | 'square'
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

    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef<number>(-1);

    // Sync state with refs
    useEffect(() => {
        historyRef.current = history;
        historyIndexRef.current = historyIndex;
    }, [history, historyIndex]);

    const [clipboard, setClipboard] = useState<fabric.Object | null>(null);
    const [floatingMenuPos, setFloatingMenuPos] = useState({ top: 0, left: 0 });

    const addToHistory = () => {
        if (!fabricCanvas.current || isRestoringHistory.current) return;
        const json = JSON.stringify(fabricCanvas.current.toJSON(['id', 'name', 'locked', 'selectable', 'evented', 'hoverCursor', 'textCase', 'charSpacing', 'lineHeight', 'paintFirst', 'textBackgroundColor', 'fill', 'opacity', 'filters', 'clipPath']));
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndexRef.current + 1);
            newHistory.push(json);
            return newHistory;
        });
        setHistoryIndex(prev => prev + 1);
    };

    const handleUndo = async () => {
        if (historyIndexRef.current <= 0 || !fabricCanvas.current) return;
        isRestoringHistory.current = true;
        const json = historyRef.current[historyIndexRef.current - 1];
        if (!json) {
            isRestoringHistory.current = false;
            return;
        }
        await fabricCanvas.current.loadFromJSON(JSON.parse(json));
        fabricCanvas.current.renderAll();
        updateLayers();
        setHistoryIndex(prev => prev - 1);
        isRestoringHistory.current = false;
    };

    const handleRedo = async () => {
        if (historyIndexRef.current >= historyRef.current.length - 1 || !fabricCanvas.current) return;
        isRestoringHistory.current = true;
        const json = historyRef.current[historyIndexRef.current + 1];
        if (!json) {
            isRestoringHistory.current = false;
            return;
        }
        await fabricCanvas.current.loadFromJSON(JSON.parse(json));
        fabricCanvas.current.renderAll();
        updateLayers();
        setHistoryIndex(prev => prev + 1);
        isRestoringHistory.current = false;
    };

    const handleCopy = async () => {
        if (!selectedObject || !fabricCanvas.current) return;
        const cloned = await selectedObject.clone();
        setClipboard(cloned);
    };

    const handlePaste = async () => {
        if (!clipboard || !fabricCanvas.current) return;
        const cloned = await clipboard.clone();
        fabricCanvas.current.discardActiveObject();
        cloned.set({
            left: cloned.left! + 10,
            top: cloned.top! + 10,
            evented: true,
        });
        if (cloned instanceof fabric.ActiveSelection) {
            cloned.canvas = fabricCanvas.current;
            (cloned as fabric.ActiveSelection).forEachObject((obj: any) => {
                fabricCanvas.current?.add(obj);
            });
            cloned.setCoords();
        } else {
            fabricCanvas.current.add(cloned);
        }
        clipboard.top! += 10;
        clipboard.left! += 10;
        fabricCanvas.current.setActiveObject(cloned);
        fabricCanvas.current.requestRenderAll();
        addToHistory();
    };

    const handleDuplicate = async () => {
        if (!selectedObject || !fabricCanvas.current) return;
        const cloned = await selectedObject.clone();
        fabricCanvas.current.discardActiveObject();
        cloned.set({
            left: cloned.left! + 20,
            top: cloned.top! + 20,
            evented: true,
        });
        fabricCanvas.current.add(cloned);
        fabricCanvas.current.setActiveObject(cloned);
        fabricCanvas.current.requestRenderAll();
        addToHistory();
    };

    const handleAlign = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        if (!selectedObject || !fabricCanvas.current) return;
        const canvasWidth = fabricCanvas.current.width || 0;
        const canvasHeight = fabricCanvas.current.height || 0;
        const objWidth = selectedObject.getScaledWidth();
        const objHeight = selectedObject.getScaledHeight();
        const originX = selectedObject.originX || 'left';
        const originY = selectedObject.originY || 'top';

        switch (alignment) {
            case 'left':
                selectedObject.set({ left: originX === 'center' ? objWidth / 2 : originX === 'right' ? objWidth : 0 });
                break;
            case 'center':
                selectedObject.set({ left: originX === 'center' ? canvasWidth / 2 : originX === 'right' ? canvasWidth / 2 + objWidth / 2 : (canvasWidth - objWidth) / 2 });
                break;
            case 'right':
                selectedObject.set({ left: originX === 'center' ? canvasWidth - objWidth / 2 : originX === 'right' ? canvasWidth : canvasWidth - objWidth });
                break;
            case 'top':
                selectedObject.set({ top: originY === 'center' ? objHeight / 2 : originY === 'bottom' ? objHeight : 0 });
                break;
            case 'middle':
                selectedObject.set({ top: originY === 'center' ? canvasHeight / 2 : originY === 'bottom' ? canvasHeight / 2 + objHeight / 2 : (canvasHeight - objHeight) / 2 });
                break;
            case 'bottom':
                selectedObject.set({ top: originY === 'center' ? canvasHeight - objHeight / 2 : originY === 'bottom' ? canvasHeight : canvasHeight - objHeight });
                break;
        }
        selectedObject.setCoords();
        fabricCanvas.current.renderAll();
        addToHistory();
    };

    const handleGroup = () => {
        const canvas = fabricCanvas.current;
        if (!canvas || !selectedObject || !isActiveSelection) return;
        const activeSelection = selectedObject as fabric.ActiveSelection;
        const objects = activeSelection.getObjects().slice();
        canvas.discardActiveObject();
        // Remove individual objects from canvas
        objects.forEach(obj => canvas.remove(obj));
        // Create a new group
        const group = new fabric.Group(objects);
        (group as any).id = `group-${Date.now()}`;
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.requestRenderAll();
        updateLayers();
        saveCanvas();
        addToHistory();
    };

    const handleUngroup = () => {
        const canvas = fabricCanvas.current;
        if (!canvas || !selectedObject || !isGroup) return;
        const group = selectedObject as fabric.Group;
        // removeAll() detaches children and restores their absolute positions automatically
        const objects = [...group.removeAll()];
        // Remove the now-empty group from canvas
        canvas.remove(group);
        // Add children back to canvas
        objects.forEach(obj => {
            obj.setCoords();
            canvas.add(obj);
        });
        // Select all ungrouped objects
        if (objects.length > 0) {
            const sel = new fabric.ActiveSelection(objects, { canvas });
            canvas.setActiveObject(sel);
            setSelectedObject(sel);
        }
        canvas.requestRenderAll();
        updateLayers();
        saveCanvas();
        addToHistory();
    };

    useEffect(() => {
        if (!canvasRef.current) return;

        // --- GLOBAL FABRIC SETTINGS: Enhance UI Selection visibility ---
        fabric.FabricObject.prototype.set({
            transparentCorners: false,
            cornerColor: '#ffffff',
            borderColor: '#3b82f6', // High contrast blue
            cornerStrokeColor: '#000000', // Black stroke for visibility on white
            cornerSize: 14,
            cornerStyle: 'circle',
            borderScaleFactor: 3, // Very thick border
            padding: 10,
            borderDashArray: null
        });

        setHistory([]);
        setHistoryIndex(-1);
        historyRef.current = [];
        historyIndexRef.current = -1;

        const canvas = new fabric.Canvas(canvasRef.current, {
            backgroundColor: currentPage.background,
            preserveObjectStacking: true,
            selection: true,
            width: canvasSize.width,
            height: canvasSize.height,
            controlsAboveOverlay: true
        });

        // Allow objects to be visible outside canvas bounds
        if (canvas.wrapperEl) {
            canvas.wrapperEl.style.overflow = 'visible';
        }
        if (canvas.lowerCanvasEl) {
            canvas.lowerCanvasEl.style.overflow = 'visible';
        }
        if (canvas.upperCanvasEl) {
            canvas.upperCanvasEl.style.overflow = 'visible';
        }

        fabricCanvas.current = canvas;

        const initCanvas = async () => {
            if (currentPage.elements && currentPage.elements.length > 0) {
                isRestoringHistory.current = true;
                await canvas.loadFromJSON({ objects: currentPage.elements });
                canvas.renderAll();
                updateLayers();
                isRestoringHistory.current = false;
                addToHistory(); // Initial state
            } else {
                addToHistory(); // Initial empty state
            }
        };
        initCanvas();

        const syncObjectProps = (obj: any) => {
            if (!obj) return;
            const filters = obj.filters || [];

            let maskType: 'none' | 'circle' | 'square' = 'none';
            if (obj.clipPath) {
                if (obj.clipPath.type === 'circle') maskType = 'circle';
                else if (obj.clipPath.type === 'rect') maskType = 'square';
            }

            setObjectProps({
                opacity: obj.opacity || 1,
                angle: obj.angle || 0,
                flipX: obj.flipX || false,
                flipY: obj.flipY || false,
                textAlign: obj.textAlign || 'left',
                fontFamily: obj.fontFamily || 'Inter',
                fontSize: obj.fontSize || 40,
                shadowBlur: obj.shadow?.blur || 0,
                shadowColor: obj.shadow?.color || '#000000',
                shadowOpacity: 1,
                shadowAngle: 45,
                shadowDistance: 5,
                strokeWidth: obj.strokeWidth || 0,
                strokeColor: obj.stroke as string || '#000000',
                strokeType: obj.paintFirst === 'stroke' ? 'outer' : 'middle',
                fill: obj.fill as string || '#000000',
                charSpacing: obj.charSpacing || 0,
                lineHeight: obj.lineHeight || 1.16,
                textCase: obj.textCase || 'normal',
                cornerRadius: obj.rx || 0,
                textBgColor: obj.textBackgroundColor || 'transparent',
                brightness: filters.find((f: any) => f.type === 'Brightness')?.brightness || 0,
                contrast: filters.find((f: any) => f.type === 'Contrast')?.contrast || 0,
                blur: filters.find((f: any) => f.type === 'Blur')?.blur || 0,
                grayscale: !!filters.find((f: any) => f.type === 'Grayscale'),
                sepia: !!filters.find((f: any) => f.type === 'Sepia'),
                mask: maskType
            });
        };

        canvas.on('selection:created', () => {
            const activeObj = canvas.getActiveObject();
            setSelectedObject(activeObj || null);
            updateFloatingMenuPos(activeObj || undefined);
            if (activeObj) syncObjectProps(activeObj);
        });
        canvas.on('selection:updated', () => {
            const activeObj = canvas.getActiveObject();
            setSelectedObject(activeObj || null);
            updateFloatingMenuPos(activeObj || undefined);
            if (activeObj) syncObjectProps(activeObj);
        });
        canvas.on('selection:cleared', () => setSelectedObject(null));

        canvas.on('object:modified', () => {
            if (canvas.getActiveObject()) {
                const obj = canvas.getActiveObject()!;
                syncObjectProps(obj);
                updateFloatingMenuPos(obj);
            }
            updateLayers();
            saveCanvas();
            addToHistory();
        });

        canvas.on('object:moving', (e) => updateFloatingMenuPos(e.target));
        canvas.on('object:scaling', (e) => updateFloatingMenuPos(e.target));
        canvas.on('object:rotating', (e) => updateFloatingMenuPos(e.target));

        // Snapping Lines (Smart Guides)
        let vLine: fabric.Line | null = null;
        let hLine: fabric.Line | null = null;

        canvas.on('object:moving', (e) => {
            const obj = e.target;
            if (!obj) return;

            const cw = canvasSize.width;
            const ch = canvasSize.height;
            const centerX = cw / 2;
            const centerY = ch / 2;

            const objCenter = obj.getCenterPoint();
            const threshold = 15;

            let finalX = objCenter.x;
            let finalY = objCenter.y;

            // Snap X
            if (Math.abs(objCenter.x - centerX) < threshold) {
                finalX = centerX;
                if (!vLine) {
                    vLine = new fabric.Line([centerX, -ch, centerX, ch * 2], {
                        stroke: '#10b981', strokeWidth: 2, selectable: false,
                        evented: false, opacity: 0.8, excludeFromExport: true
                    });
                    (vLine as any).isGuideLine = true;
                    canvas.add(vLine);
                }
            } else if (vLine) {
                canvas.remove(vLine);
                vLine = null;
            }

            // Snap Y
            if (Math.abs(objCenter.y - centerY) < threshold) {
                finalY = centerY;
                if (!hLine) {
                    hLine = new fabric.Line([-cw, centerY, cw * 2, centerY], {
                        stroke: '#10b981', strokeWidth: 2, selectable: false,
                        evented: false, opacity: 0.8, excludeFromExport: true
                    });
                    (hLine as any).isGuideLine = true;
                    canvas.add(hLine);
                }
            } else if (hLine) {
                canvas.remove(hLine);
                hLine = null;
            }

            if (finalX !== objCenter.x || finalY !== objCenter.y) {
                obj.setPositionByOrigin(new fabric.Point(finalX, finalY), 'center', 'center');
            }

            updateFloatingMenuPos(obj);
        });

        canvas.on('mouse:up', () => {
            if (vLine) { canvas.remove(vLine); vLine = null; }
            if (hLine) { canvas.remove(hLine); hLine = null; }
        });

        canvas.on('object:added', (e) => {
            if (e.target && (e.target as any).isGuideLine) return;
            updateLayers(); saveCanvas(); addToHistory();
        });
        canvas.on('object:removed', (e) => {
            if (e.target && (e.target as any).isGuideLine) return;
            updateLayers(); saveCanvas(); addToHistory();
        });

        // Global Event Listeners for External Controls (Undo/Redo)
        const undoListener = () => handleUndo();
        const redoListener = () => handleRedo();
        window.addEventListener('canvas:undo', undoListener);
        window.addEventListener('canvas:redo', redoListener);

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
            if (isPanningRef.current) {
                isDragging = true;
                canvas.selection = false;
                const e = opt.e as any;
                lastPosX = e.clientX;
                lastPosY = e.clientY;
                canvas.defaultCursor = 'grabbing';
                // Disable object selection while panning
                canvas.forEachObject(obj => {
                    obj.selectable = false;
                    obj.evented = false;
                });
            }
        });

        canvas.on('mouse:move', (opt) => {
            if (isDragging && isPanningRef.current) {
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
            if (isPanningRef.current) {
                canvas.defaultCursor = 'grab';
            } else {
                canvas.defaultCursor = 'default';
                // Re-enable object selection
                canvas.forEachObject(obj => {
                    obj.selectable = true;
                    obj.evented = true;
                });
            }
        });

        const handleCanvasAction = (e: any) => {
            const { type, id, layers } = e.detail;

            if (type === 'reorder' && layers) {
                const objects = canvas.getObjects();
                const reversedLayers = [...layers].reverse();
                reversedLayers.forEach((layer, index) => {
                    const obj = objects.find((o: any) => o.id === layer.id);
                    if (obj) {
                        canvas.moveObjectTo(obj, index);
                    }
                });
                canvas.renderAll();
                updateLayers();
                addToHistory();
                return;
            }

            const obj = canvas.getObjects().find((o: any) => o.id === id);
            if (!obj) return;

            if (type === 'visibility') {
                const isVisible = !obj.visible;
                obj.set({
                    visible: isVisible,
                    evented: isVisible,
                    selectable: isVisible
                });
                if (!isVisible) {
                    canvas.discardActiveObject();
                }
            } else if (type === 'lock') {
                const isLocked = !obj.lockMovementX;
                obj.set({
                    lockMovementX: isLocked,
                    lockMovementY: isLocked,
                    lockScalingX: isLocked,
                    lockScalingY: isLocked,
                    lockRotation: isLocked,
                    hasControls: !isLocked,
                    selectable: !isLocked,
                    evented: !isLocked
                });
                if (isLocked) {
                    canvas.discardActiveObject();
                }
            }
            canvas.renderAll();
            updateLayers();
            addToHistory();
        };

        const handleCanvasAdd = (e: any) => {
            const { type, data } = e.detail;
            const centerX = canvasSize.width / 2;
            const centerY = canvasSize.height / 2;
            if (type === 'text') {
                const text = new fabric.IText('New Text', {
                    left: centerX,
                    top: centerY,
                    originX: 'center',
                    originY: 'center',
                    fontFamily: 'Inter',
                    fontSize: 40,
                    fill: '#000000'
                });
                (text as any).id = `text-${Date.now()}`;
                canvas.add(text);
                canvas.setActiveObject(text);
            } else if (type === 'rect') {
                const rect = new fabric.Rect({
                    left: centerX,
                    top: centerY,
                    originX: 'center',
                    originY: 'center',
                    width: 100,
                    height: 100,
                    fill: '#f27d26',
                    rx: 0,
                    ry: 0
                });
                (rect as any).id = `rect-${Date.now()}`;
                canvas.add(rect);
                canvas.setActiveObject(rect);
            } else if (type === 'circle') {
                const circle = new fabric.Circle({
                    left: centerX,
                    top: centerY,
                    originX: 'center',
                    originY: 'center',
                    radius: 50,
                    fill: '#f27d26'
                });
                (circle as any).id = `circle-${Date.now()}`;
                canvas.add(circle);
                canvas.setActiveObject(circle);
            } else if (type === 'triangle') {
                const triangle = new fabric.Triangle({
                    left: centerX,
                    top: centerY,
                    originX: 'center',
                    originY: 'center',
                    width: 100,
                    height: 100,
                    fill: '#f27d26'
                });
                (triangle as any).id = `triangle-${Date.now()}`;
                canvas.add(triangle);
                canvas.setActiveObject(triangle);
            } else if (type === 'brush') {
                const newDrawingMode = !canvas.isDrawingMode;
                canvas.isDrawingMode = newDrawingMode;
                setIsDrawingMode(newDrawingMode);
                if (newDrawingMode) {
                    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
                    canvas.freeDrawingBrush.color = brushSettings.color;
                    canvas.freeDrawingBrush.width = brushSettings.width;
                    canvas.discardActiveObject();
                }
                canvas.renderAll();
                return; // let 'object:added' handle history for brush strokes
            } else if (type === 'sticker-star') {
                const svgStar = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
                fabric.loadSVGFromString(svgStar).then(({ objects, options }) => {
                    const validObjects = objects.filter(o => o !== null) as fabric.FabricObject[];
                    const obj = fabric.util.groupSVGElements(validObjects, options);
                    obj.set({
                        left: centerX, top: centerY, originX: 'center', originY: 'center',
                        fill: '#f27d26'
                    });
                    obj.scaleToWidth(150);
                    (obj as any).id = `sticker-${Date.now()}`;
                    canvas.add(obj);
                    canvas.setActiveObject(obj);
                    canvas.renderAll();
                    addToHistory();
                }).catch(console.error);
            } else if (type === 'image' && data) {
                fabric.Image.fromURL(data).then((img) => {
                    (img as any).id = `img-${Date.now()}`;
                    img.scaleToWidth(300);
                    img.set({
                        left: centerX,
                        top: centerY,
                        originX: 'center',
                        originY: 'center'
                    });
                    canvas.add(img);
                    canvas.setActiveObject(img);
                });
            }
            canvas.renderAll();
            addToHistory();
        };

        const handleExport = async (e: any) => {
            const { pages: selectedPages, format, quality } = e.detail;

            if (selectedPages.length === 1) {
                const pageIndex = selectedPages[0];
                const page = pages[pageIndex];

                let dataUrl = '';
                if (pageIndex === currentPageIndex) {
                    fabricCanvas.current?.discardActiveObject();
                    fabricCanvas.current?.renderAll();
                    dataUrl = fabricCanvas.current?.toDataURL({
                        format: format === 'jpg' ? 'jpeg' : 'png',
                        quality: quality / 100,
                        multiplier: 1
                    }) || '';
                } else {
                    const tempCanvasEl = document.createElement('canvas');
                    tempCanvasEl.width = canvasSize.width;
                    tempCanvasEl.height = canvasSize.height;
                    const tempCanvas = new fabric.Canvas(tempCanvasEl, {
                        backgroundColor: page.background,
                        width: canvasSize.width,
                        height: canvasSize.height
                    });
                    await tempCanvas.loadFromJSON({ objects: page.elements });
                    tempCanvas.renderAll();
                    dataUrl = tempCanvas.toDataURL({
                        format: format === 'jpg' ? 'jpeg' : 'png',
                        quality: quality / 100,
                        multiplier: 1
                    });
                    tempCanvas.dispose();
                }

                if (dataUrl) {
                    const { saveAs } = await import('file-saver');
                    saveAs(dataUrl, `arunika-page-${pageIndex + 1}.${format}`);
                }
            } else {
                const JSZip = (await import('jszip')).default;
                const { saveAs } = await import('file-saver');
                const zip = new JSZip();

                for (const pageIndex of selectedPages) {
                    const page = pages[pageIndex];
                    let dataUrl = '';
                    if (pageIndex === currentPageIndex) {
                        fabricCanvas.current?.discardActiveObject();
                        fabricCanvas.current?.renderAll();
                        dataUrl = fabricCanvas.current?.toDataURL({
                            format: format === 'jpg' ? 'jpeg' : 'png',
                            quality: quality / 100,
                            multiplier: 1
                        }) || '';
                    } else {
                        const tempCanvasEl = document.createElement('canvas');
                        tempCanvasEl.width = canvasSize.width;
                        tempCanvasEl.height = canvasSize.height;
                        const tempCanvas = new fabric.Canvas(tempCanvasEl, {
                            backgroundColor: page.background,
                            width: canvasSize.width,
                            height: canvasSize.height
                        });
                        await tempCanvas.loadFromJSON({ objects: page.elements });
                        tempCanvas.renderAll();
                        dataUrl = tempCanvas.toDataURL({
                            format: format === 'jpg' ? 'jpeg' : 'png',
                            quality: quality / 100,
                            multiplier: 1
                        });
                        tempCanvas.dispose();
                    }

                    if (dataUrl) {
                        const base64Data = dataUrl.replace(/^data:image\/(png|jpeg);base64,/, "");
                        zip.file(`arunika-page-${pageIndex + 1}.${format}`, base64Data, { base64: true });
                    }
                }

                const content = await zip.generateAsync({ type: "blob" });
                saveAs(content, "arunika-export.zip");
            }
        };

        window.addEventListener('canvas:export', handleExport);
        window.addEventListener('canvas:action', handleCanvasAction);
        window.addEventListener('canvas:add', handleCanvasAdd);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !isPanningRef.current) {
                setIsPanning(true);
                canvas.defaultCursor = 'grab';
                canvas.hoverCursor = 'grab';
                canvas.forEachObject(obj => {
                    obj.selectable = false;
                    obj.evented = false;
                });
                canvas.selection = false;
                canvas.renderAll();
            }

            // Read shortcuts
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
            let sc = defaultShortcuts;
            try {
                const saved = localStorage.getItem('carousel_shortcuts');
                if (saved) sc = JSON.parse(saved);
            } catch (e) { }

            const isCtrl = e.ctrlKey || e.metaKey;
            const isAlt = e.altKey;

            // Shortcuts
            if (isCtrl && (e.key === sc.undo || e.key.toLowerCase() === sc.undo.toLowerCase() && !e.shiftKey)) {
                handleUndo();
                e.preventDefault();
            }
            if (isCtrl && (e.key === sc.redo || (e.key.toLowerCase() === sc.undo.toLowerCase() && e.shiftKey))) {
                handleRedo();
                e.preventDefault();
            }
            if (isCtrl && e.key.toLowerCase() === sc.duplicate.toLowerCase()) {
                handleDuplicate();
                e.preventDefault();
            }
            if (isCtrl && e.key.toLowerCase() === sc.copy.toLowerCase()) {
                handleCopy();
                // Don't prevent default copy to allow system clipboard if needed, but here we use internal
            }
            if (isCtrl && e.key.toLowerCase() === sc.paste.toLowerCase()) {
                handlePaste();
            }
            if (isAlt && e.key.toLowerCase() === sc.addText.toLowerCase()) {
                window.dispatchEvent(new CustomEvent('canvas:add', { detail: { type: 'text' } }));
                e.preventDefault();
            }
            if (isAlt && e.key.toLowerCase() === sc.addRect.toLowerCase()) {
                window.dispatchEvent(new CustomEvent('canvas:add', { detail: { type: 'rect' } }));
                e.preventDefault();
            }
            if (isAlt && e.key.toLowerCase() === sc.addCircle.toLowerCase()) {
                window.dispatchEvent(new CustomEvent('canvas:add', { detail: { type: 'circle' } }));
                e.preventDefault();
            }

            if (e.key === 'Escape') {
                if (activeTool) {
                    setActiveTool(null);
                } else {
                    canvas.discardActiveObject();
                    canvas.requestRenderAll();
                }
            }
            if (e.key === sc.delete || e.key === 'Delete' || e.key === 'Backspace') {
                const activeObjects = canvas.getActiveObjects();
                if (activeObjects.length > 0) {
                    // Check if a text object is currently being edited so we don't delete the whole object
                    const isEditingText = activeObjects.some(obj => (obj as fabric.IText).isEditing);
                    if (!isEditingText) {
                        activeObjects.forEach(obj => canvas.remove(obj));
                        canvas.discardActiveObject();
                        canvas.requestRenderAll();
                    }
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                setIsPanning(false);
                canvas.defaultCursor = 'default';
                canvas.hoverCursor = 'move';
                canvas.forEachObject(obj => {
                    obj.selectable = true;
                    obj.evented = true;
                });
                canvas.selection = true;
                canvas.renderAll();
            }
        };

        const handleSystemPaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (!blob) continue;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const data = event.target?.result as string;
                        fabric.Image.fromURL(data).then((img) => {
                            (img as any).id = `img-${Date.now()}`;
                            img.scaleToWidth(300);
                            img.set({
                                left: canvasSize.width / 2,
                                top: canvasSize.height / 2,
                                originX: 'center',
                                originY: 'center'
                            });
                            canvas.add(img);
                            canvas.setActiveObject(img);
                            canvas.renderAll();
                            addToHistory();
                        });
                    };
                    reader.readAsDataURL(blob);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('paste', handleSystemPaste);

        return () => {
            window.removeEventListener('canvas:export', handleExport);
            window.removeEventListener('canvas:action', handleCanvasAction);
            window.removeEventListener('canvas:add', handleCanvasAdd);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('paste', handleSystemPaste);
            window.removeEventListener('canvas:undo', undoListener);
            window.removeEventListener('canvas:redo', redoListener);
            canvas.dispose();
        };
    }, [currentPageIndex, referenceData]);

    // Only passively sync size for preset loads, no shifting
    useEffect(() => {
        const canvas = fabricCanvas.current;
        if (!canvas) return;
        if (canvas.width !== canvasSize.width || canvas.height !== canvasSize.height) {
            canvas.setWidth(canvasSize.width);
            canvas.setHeight(canvasSize.height);
            canvas.renderAll();
        }
    }, [canvasSize.width, canvasSize.height]);

    // Handle manual resize with centering logic
    useEffect(() => {
        const handleCanvasResize = (e: any) => {
            const { newSize } = e.detail;
            const canvas = fabricCanvas.current;
            if (!canvas) return;

            const oldWidth = canvas.width || newSize.width;
            const oldHeight = canvas.height || newSize.height;

            canvas.setWidth(newSize.width);
            canvas.setHeight(newSize.height);

            const deltaX = (newSize.width - oldWidth) / 2;
            const deltaY = (newSize.height - oldHeight) / 2;

            if (deltaX !== 0 || deltaY !== 0) {
                canvas.getObjects().forEach((obj) => {
                    obj.set({
                        left: (obj.left || 0) + deltaX,
                        top: (obj.top || 0) + deltaY
                    });
                    obj.setCoords();
                });
                saveCanvas();
            }
            canvas.renderAll();
        };

        window.addEventListener('canvas:resize', handleCanvasResize);
        return () => window.removeEventListener('canvas:resize', handleCanvasResize);
    }, []);

    // Handle Preset Load Event
    useEffect(() => {
        const handlePresetLoad = async (e: any) => {
            const canvas = fabricCanvas.current;
            if (!canvas) return;
            const { pages: newPages } = e.detail;
            const firstPage = newPages[0];
            if (firstPage) {
                isRestoringHistory.current = true;
                canvas.set('backgroundColor', firstPage.background || '#ffffff');
                await canvas.loadFromJSON({ objects: firstPage.elements });
                canvas.renderAll();
                updateLayers();
                isRestoringHistory.current = false;
                addToHistory();
            }
        };

        window.addEventListener('canvas:load-preset', handlePresetLoad);
        return () => window.removeEventListener('canvas:load-preset', handlePresetLoad);
    }, []);

    const updateFloatingMenuPos = (obj: fabric.Object | undefined) => {
        if (!obj || !fabricCanvas.current) return;
        const bound = obj.getBoundingRect();
        // Adjust for zoom and viewport if needed, but getBoundingRect usually returns canvas pixel coords
        // Since the toolbar is inside the canvas wrapper which is scaled by `zoom`, we might need to adjust.
        // Wait, the wrapper has `transform: scale(zoom)`. 
        // If we put the toolbar inside the wrapper, it will scale with the canvas.
        // If we put it outside, we need to calculate screen coords.
        // Let's put it inside the wrapper for simplicity, so it moves with the object.
        // But if it scales, the buttons will shrink/grow.
        // Better to put it outside or use `transform: scale(1/zoom)` on the toolbar.

        // Actually, let's just use the values directly and see.
        setFloatingMenuPos({
            top: bound.top,
            left: bound.left + bound.width / 2
        });
    };

    // Immediate Background Update
    useEffect(() => {
        if (fabricCanvas.current) {
            const bg = currentPage.background;
            if (bg.startsWith('grad-')) {
                let grad;
                if (bg === 'grad-1') grad = new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: 0, x2: canvasSize.width, y2: canvasSize.height }, colorStops: [{ offset: 0, color: '#ff9a9e' }, { offset: 1, color: '#fecfef' }] });
                else if (bg === 'grad-2') grad = new fabric.Gradient({ type: 'radial', coords: { x1: canvasSize.width / 2, y1: canvasSize.height / 2, r1: 0, x2: canvasSize.width / 2, y2: canvasSize.height / 2, r2: canvasSize.width }, colorStops: [{ offset: 0, color: '#d4fc79' }, { offset: 1, color: '#96e6a1' }] });
                else if (bg === 'grad-3') grad = new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: canvasSize.height, x2: canvasSize.width, y2: 0 }, colorStops: [{ offset: 0, color: '#accbee' }, { offset: 1, color: '#e7f0fd' }] });
                fabricCanvas.current.set('backgroundColor', grad);
            } else {
                fabricCanvas.current.set('backgroundColor', bg);
            }
            fabricCanvas.current.renderAll();
        }
    }, [currentPage.background, canvasSize.width, canvasSize.height]);

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
        const centerX = canvasSize.width / 2;
        const centerY = canvasSize.height / 2;
        const common = {
            id: `shape-${Date.now()}`,
            left: centerX,
            top: centerY,
            originX: 'center' as const,
            originY: 'center' as const,
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
                // Check if it's a valid image data URL
                if (data.startsWith('data:image')) {
                    fabric.Image.fromURL(data).then((img) => {
                        (img as any).id = `img-${Date.now()}`;
                        img.scaleToWidth(300);
                        fabricCanvas.current?.add(img);
                        fabricCanvas.current?.setActiveObject(img);
                        fabricCanvas.current?.renderAll();
                        addToHistory();
                    }).catch(err => {
                        console.error("Error loading image:", err);
                        alert("Failed to load image. Please try a different file.");
                    });
                } else {
                    console.error("Invalid image data");
                    alert("Invalid image file.");
                }
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
        const canvas = fabricCanvas.current;
        if (action === 'front') canvas.bringObjectToFront(selectedObject);
        else if (action === 'back') canvas.sendObjectToBack(selectedObject);
        else if (action === 'forward') canvas.bringObjectForward(selectedObject);
        else if (action === 'backward') canvas.sendObjectBackwards(selectedObject);
        canvas.renderAll();
        updateLayers();
        saveCanvas();
        addToHistory();
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

    const handleTextBgColor = (color: string) => {
        if (!selectedObject || !fabricCanvas.current) return;
        setObjectProps(prev => ({ ...prev, textBgColor: color }));
        if (selectedObject instanceof fabric.IText || selectedObject instanceof fabric.Text) {
            selectedObject.set('textBackgroundColor', color === 'transparent' ? '' : color);
            fabricCanvas.current.renderAll();
            saveCanvas();
            addToHistory();
        }
    };

    const handleFilter = (type: string, prop: string, value: any) => {
        if (!selectedObject || !fabricCanvas.current || !(selectedObject instanceof fabric.Image)) return;

        const img = selectedObject as fabric.Image;
        let filters = img.filters || [];
        filters = filters.filter((f: any) => f.type !== type);

        if (value !== 0 && value !== false) {
            let newFilter;
            switch (type) {
                case 'Brightness': newFilter = new fabric.filters.Brightness({ brightness: value }); break;
                case 'Contrast': newFilter = new fabric.filters.Contrast({ contrast: value }); break;
                case 'Blur': newFilter = new fabric.filters.Blur({ blur: value }); break;
                case 'Grayscale': newFilter = new fabric.filters.Grayscale(); break;
                case 'Sepia': newFilter = new fabric.filters.Sepia(); break;
            }
            if (newFilter) filters.push(newFilter);
        }

        img.filters = filters;
        img.applyFilters();
        fabricCanvas.current.renderAll();

        setObjectProps(prev => ({ ...prev, [prop]: value }));
        saveCanvas();
        addToHistory();
    };

    const handleMask = (shape: 'none' | 'circle' | 'square') => {
        if (!selectedObject || !fabricCanvas.current || !(selectedObject instanceof fabric.Image)) return;

        const img = selectedObject as fabric.Image;
        const width = img.width || 0;
        const height = img.height || 0;

        if (shape === 'none') {
            img.set('clipPath', undefined);
        } else if (shape === 'circle') {
            const minDim = Math.min(width, height);
            const clipPath = new fabric.Circle({
                radius: minDim / 2,
                originX: 'center',
                originY: 'center',
            });
            img.set('clipPath', clipPath);
        } else if (shape === 'square') {
            const minDim = Math.min(width, height);
            const clipPath = new fabric.Rect({
                width: minDim,
                height: minDim,
                rx: minDim * 0.1,
                ry: minDim * 0.1,
                originX: 'center',
                originY: 'center',
            });
            img.set('clipPath', clipPath);
        }

        setObjectProps(prev => ({ ...prev, mask: shape }));
        fabricCanvas.current.renderAll();
        saveCanvas();
        addToHistory();
    };

    const handleStartFreeCrop = () => {
        if (!selectedObject || !fabricCanvas.current || !(selectedObject instanceof fabric.Image)) return;
        const img = selectedObject as fabric.Image;
        const width = img.getScaledWidth();
        const height = img.getScaledHeight();

        const rect = new fabric.Rect({
            left: img.left, top: img.top, width: width, height: height,
            originX: img.originX, originY: img.originY,
            fill: 'rgba(0,0,0,0.3)', stroke: '#ef4444', strokeWidth: 4, strokeDashArray: [5, 5],
            transparentCorners: false, cornerColor: '#ef4444'
        });
        (rect as any).isCropRect = true;
        (rect as any).targetImgId = (img as any).id;

        fabricCanvas.current.add(rect);
        fabricCanvas.current.setActiveObject(rect);
        setCropRect(rect);
    };

    const handleApplyFreeCrop = () => {
        if (!cropRect || !fabricCanvas.current) return;
        const canvas = fabricCanvas.current;
        const targetId = (cropRect as any).targetImgId;
        const img = canvas.getObjects().find((o: any) => o.id === targetId) as fabric.Image;

        if (img) {
            const cropW = cropRect.getScaledWidth();
            const cropH = cropRect.getScaledHeight();

            const clipPath = new fabric.Rect({
                width: cropW / img.scaleX!,
                height: cropH / img.scaleY!,
                left: (cropRect.left! - img.left!) / img.scaleX!,
                top: (cropRect.top! - img.top!) / img.scaleY!,
                originX: 'center', originY: 'center',
            });
            img.set('clipPath', clipPath);
            setObjectProps(prev => ({ ...prev, mask: 'custom' }));
        }

        canvas.remove(cropRect);
        setCropRect(null);
        canvas.renderAll();
        saveCanvas();
        addToHistory();
    };

    const handleDelete = () => {
        if (!selectedObject || !fabricCanvas.current) return;
        fabricCanvas.current.remove(selectedObject);
        fabricCanvas.current.discardActiveObject();
        fabricCanvas.current.renderAll();
    };

    return (
        <div ref={containerRef} className="flex-1 bg-slate-200 flex flex-col overflow-hidden relative">
            {cropRect && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-3 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] z-50 flex gap-4 items-center animate-in slide-in-from-top-4">
                    <span className="text-xs font-bold text-slate-500">Sesuaikan area pemotongan</span>
                    <button onClick={handleApplyFreeCrop} className="text-xs font-black bg-accent text-slate-900 border-2 border-slate-900 px-4 py-2 rounded-xl hover:bg-yellow-400 transition-colors shadow-[2px_2px_0px_#0f172a] active:translate-y-[2px] active:shadow-none">Apply Crop</button>
                    <button onClick={() => { setActiveTool(null); fabricCanvas.current?.remove(cropRect); setCropRect(null); }} className="text-xs font-bold text-slate-400 hover:text-red-500">Cancel</button>
                </div>
            )}

            {/* Canvas Wrapper for Zoom */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-200">
                <div
                    className="transition-transform duration-200 ease-out shadow-[8px_8px_0px_0px_#0f172a] border-4 border-slate-900"
                    style={{
                        transform: `scale(${zoom})`,
                        width: canvasSize.width,
                        height: canvasSize.height,
                        overflow: 'visible',
                        backgroundColor: currentPage.background || '#ffffff'
                    }}
                >
                    <canvas ref={canvasRef} style={{ overflow: 'visible' }} />
                </div>
            </div>

            {/* Top Right Toolbar: Zoom & Fullscreen & Alignment */}
            <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
                {/* Arrange & Group Tools */}
                {selectedObject && (
                    <div className="bg-white border-4 border-slate-900 rounded-2xl p-2 flex items-center gap-1 shadow-[4px_4px_0px_0px_#0f172a] animate-in slide-in-from-right-4">
                        {/* Group / Ungroup */}
                        {isActiveSelection && (
                            <button onClick={handleGroup} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition-colors" title="Group selected layers">
                                <Group size={14} />
                                <span>Group</span>
                            </button>
                        )}
                        {isGroup && (
                            <button onClick={handleUngroup} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition-colors" title="Ungroup layers">
                                <Ungroup size={14} />
                                <span>Ungroup</span>
                            </button>
                        )}
                        {(isActiveSelection || isGroup) && (
                            <div className="w-px h-5 bg-slate-200 mx-1" />
                        )}

                        {/* Arrange Layer */}
                        <button onClick={() => handleZIndex('front')} className="p-1.5 hover:bg-slate-100 rounded-md" title="Bring to Front"><ChevronsUp size={16} /></button>
                        <button onClick={() => handleZIndex('forward')} className="p-1.5 hover:bg-slate-100 rounded-md" title="Bring Forward"><ArrowUp size={16} /></button>
                        <button onClick={() => handleZIndex('backward')} className="p-1.5 hover:bg-slate-100 rounded-md" title="Send Backward"><ArrowDown size={16} /></button>
                        <button onClick={() => handleZIndex('back')} className="p-1.5 hover:bg-slate-100 rounded-md" title="Send to Back"><ChevronsDown size={16} /></button>
                        <div className="w-px h-5 bg-slate-200 mx-1" />

                        {/* Alignment */}
                        <button onClick={() => handleAlign('left')} className="p-1.5 hover:bg-slate-100 rounded-md" title="Align Left"><AlignLeft size={16} /></button>
                        <button onClick={() => handleAlign('center')} className="p-1.5 hover:bg-slate-100 rounded-md" title="Align Center"><AlignHorizontalJustifyCenter size={16} /></button>
                        <button onClick={() => handleAlign('right')} className="p-1.5 hover:bg-slate-100 rounded-md" title="Align Right"><AlignRight size={16} /></button>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <button onClick={() => handleAlign('top')} className="p-1.5 hover:bg-slate-100 rounded-md" title="Align Top"><ArrowUpToLine size={16} /></button>
                        <button onClick={() => handleAlign('middle')} className="p-1.5 hover:bg-slate-100 rounded-md" title="Align Middle"><AlignVerticalJustifyCenter size={16} /></button>
                        <button onClick={() => handleAlign('bottom')} className="p-1.5 hover:bg-slate-100 rounded-md" title="Align Bottom"><ArrowDownToLine size={16} /></button>
                    </div>
                )}

                {/* Zoom Tools */}
                <div className="bg-white border-4 border-slate-900 rounded-2xl p-2 flex items-center gap-2 shadow-[4px_4px_0px_0px_#0f172a]">
                    <button onClick={() => setZoom(Math.max(0.1, zoom - 0.1))} className="p-1.5 hover:bg-slate-100 rounded-md"><ZoomOut size={16} /></button>
                    <span className="text-[10px] font-black w-10 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(Math.min(5, zoom + 0.1))} className="p-1.5 hover:bg-slate-100 rounded-md"><ZoomIn size={16} /></button>
                    <div className="w-1 h-6 bg-slate-200 mx-1" />
                    <button onClick={() => setZoom(1)} className="p-1.5 hover:bg-slate-100 rounded-md" title="Reset Zoom"><Maximize size={16} /></button>
                </div>
            </div>

            {/* Floating Context Menu */}
            {selectedObject && (
                <div
                    className="absolute z-40 flex gap-1 bg-white border-4 border-slate-900 text-slate-900 p-1.5 rounded-xl shadow-[4px_4px_0px_0px_#0f172a] -translate-x-1/2 animate-in fade-in zoom-in-95 duration-100"
                    style={{
                        top: `calc(50% - ${canvasSize.height * zoom / 2}px + ${floatingMenuPos.top * zoom}px - 60px)`,
                        left: `calc(50% - ${canvasSize.width * zoom / 2}px + ${floatingMenuPos.left * zoom}px)`
                    }}
                >
                    {isActiveSelection && (
                        <button onClick={handleGroup} className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg" title="Group"><Group size={16} /></button>
                    )}
                    {isGroup && (
                        <button onClick={handleUngroup} className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg" title="Ungroup"><Ungroup size={16} /></button>
                    )}
                    {(isActiveSelection || isGroup) && (
                        <div className="w-px h-4 bg-slate-200" />
                    )}
                    <button onClick={() => { if (selectedObject && fabricCanvas.current) { fabricCanvas.current.bringForward(selectedObject); updateLayers(); saveCanvas(); } }} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Bring Forward"><ArrowUpToLine size={16} /></button>
                    <button onClick={() => { if (selectedObject && fabricCanvas.current) { fabricCanvas.current.sendBackwards(selectedObject); updateLayers(); saveCanvas(); } }} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Send Backward"><ArrowDownToLine size={16} /></button>
                    <div className="w-px h-4 bg-slate-200" />
                    <button onClick={handleDuplicate} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Duplicate (Ctrl+D)"><Copy size={16} /></button>
                    <button onClick={handleCopy} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Copy (Ctrl+C)"><Clipboard size={16} /></button>
                    <button onClick={handleDelete} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg" title="Delete"><Trash2 size={16} /></button>
                </div>
            )}

            {/* Left Vertical Toolbar */}
            <div className="absolute top-24 left-6 flex flex-col gap-4 z-30">
                {selectedObject && (
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
                                            <h4 className="font-black text-xs mb-3">Typography</h4>
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-bold text-slate-500">Font Family</span>
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
                                                        <span className="text-[10px] font-bold text-slate-500">Size</span>
                                                        <input
                                                            type="number"
                                                            value={objectProps.fontSize}
                                                            onChange={(e) => handleFontSize(parseInt(e.target.value))}
                                                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-2 text-xs font-bold focus:outline-none focus:border-slate-900"
                                                        />
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-500">Color</span>
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
                                            <h4 className="font-black text-xs mb-3">Spacing</h4>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
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
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
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

                        {/* Color Tool */}
                        <div className="relative group">
                            <button
                                onClick={() => setActiveTool(activeTool === 'color' ? null : 'color')}
                                className={`p-3 rounded-xl transition-all ${activeTool === 'color' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}`}
                                title="Color"
                            >
                                <Palette size={20} />
                            </button>
                            {activeTool === 'color' && (
                                <div className="absolute left-full top-0 ml-4 bg-white border-4 border-slate-900 rounded-2xl p-4 w-64 shadow-[8px_8px_0px_0px_#0f172a] z-50 animate-in slide-in-from-left-2">
                                    <h4 className="font-black text-xs mb-3">Color</h4>
                                    <div className="space-y-4">
                                        <div className="flex gap-2 flex-wrap">
                                            {['#000000', '#ffffff', '#f27d26', '#ef4444', '#3b82f6', 'transparent'].map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => handleColor(c)}
                                                    className={`w-6 h-6 rounded border-2 border-slate-200 ${objectProps.fill === c ? 'ring-2 ring-slate-900' : ''}`}
                                                    style={{ backgroundColor: c === 'transparent' ? '#fff' : c, backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px' }}
                                                />
                                            ))}
                                            <input
                                                type="color"
                                                value={objectProps.fill === 'transparent' ? '#000000' : objectProps.fill}
                                                onChange={(e) => handleColor(e.target.value)}
                                                className="w-6 h-6 rounded border-2 border-slate-200 p-0 overflow-hidden"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

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
                                    <h4 className="font-black text-xs mb-3">Flip</h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleFlip('x')} className={`flex-1 p-2 rounded-lg border-2 border-slate-200 hover:border-slate-900 ${objectProps.flipX ? 'bg-slate-100' : ''}`}><FlipHorizontal className="mx-auto" size={20} /></button>
                                        <button onClick={() => handleFlip('y')} className={`flex-1 p-2 rounded-lg border-2 border-slate-200 hover:border-slate-900 ${objectProps.flipY ? 'bg-slate-100' : ''}`}><FlipVertical className="mx-auto" size={20} /></button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Opacity Tool */}
                        <div className="relative group">
                            <button
                                onClick={() => setActiveTool(activeTool === 'opacity' ? null : 'opacity')}
                                className={`p-3 rounded-xl transition-all ${activeTool === 'opacity' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}`}
                                title="Opacity"
                            >
                                <div className="flex items-center justify-center w-5 h-5">
                                    <div className="w-4 h-4 rounded-full bg-current opacity-50 border border-current" />
                                </div>
                            </button>
                            {activeTool === 'opacity' && (
                                <div className="absolute left-full top-0 ml-4 bg-white border-4 border-slate-900 rounded-2xl p-4 w-48 shadow-[8px_8px_0px_0px_#0f172a] z-50 animate-in slide-in-from-left-2">
                                    <h4 className="font-black text-xs mb-3">Opacity</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                            <span>Value</span>
                                            <span>{Math.round(objectProps.opacity * 100)}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="1" step="0.01"
                                            value={objectProps.opacity}
                                            onChange={(e) => handleOpacity(parseFloat(e.target.value))}
                                            className="w-full accent-slate-900"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Image Filters Tool */}
                        {selectedObject instanceof fabric.Image && (
                            <div className="relative group">
                                <button
                                    onClick={() => setActiveTool(activeTool === 'filters' ? null : 'filters')}
                                    className={`p-3 rounded-xl transition-all ${activeTool === 'filters' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}`}
                                    title="Image Filters"
                                >
                                    <Wand2 size={20} />
                                </button>
                                {activeTool === 'filters' && (
                                    <div className="absolute left-full top-0 ml-4 bg-white border-4 border-slate-900 rounded-2xl p-4 w-64 shadow-[8px_8px_0px_0px_#0f172a] z-50 animate-in slide-in-from-left-2">
                                        <h4 className="font-black text-xs mb-3">Image Filters</h4>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                                    <span>Brightness</span>
                                                    <span>{Math.round(objectProps.brightness * 100)}%</span>
                                                </div>
                                                <input
                                                    type="range" min="-1" max="1" step="0.05"
                                                    value={objectProps.brightness}
                                                    onChange={(e) => handleFilter('Brightness', 'brightness', parseFloat(e.target.value))}
                                                    className="w-full accent-slate-900"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                                    <span>Contrast</span>
                                                    <span>{Math.round(objectProps.contrast * 100)}%</span>
                                                </div>
                                                <input
                                                    type="range" min="-1" max="1" step="0.05"
                                                    value={objectProps.contrast}
                                                    onChange={(e) => handleFilter('Contrast', 'contrast', parseFloat(e.target.value))}
                                                    className="w-full accent-slate-900"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                                    <span>Blur</span>
                                                    <span>{Math.round(objectProps.blur * 100)}%</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="1" step="0.05"
                                                    value={objectProps.blur}
                                                    onChange={(e) => handleFilter('Blur', 'blur', parseFloat(e.target.value))}
                                                    className="w-full accent-slate-900"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-4">
                                                <button
                                                    onClick={() => handleFilter('Grayscale', 'grayscale', !objectProps.grayscale)}
                                                    className={`py-2 px-3 rounded-lg text-[10px] font-bold border-2 transition-colors ${objectProps.grayscale ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 hover:border-slate-900 hover:bg-slate-50'}`}
                                                >
                                                    Grayscale
                                                </button>
                                                <button
                                                    onClick={() => handleFilter('Sepia', 'sepia', !objectProps.sepia)}
                                                    className={`py-2 px-3 rounded-lg text-[10px] font-bold border-2 transition-colors ${objectProps.sepia ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 hover:border-slate-900 hover:bg-slate-50'}`}
                                                >
                                                    Sepia
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mask/Crop Tool */}
                        {selectedObject instanceof fabric.Image && (
                            <div className="relative group">
                                <button
                                    onClick={() => setActiveTool(activeTool === 'mask' ? null : 'mask')}
                                    className={`p-3 rounded-xl transition-all ${activeTool === 'mask' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}`}
                                    title="Crop to Shape"
                                >
                                    <Crop size={20} />
                                </button>
                                {activeTool === 'mask' && (
                                    <div className="absolute left-full top-0 ml-4 bg-white border-4 border-slate-900 rounded-2xl p-4 w-48 shadow-[8px_8px_0px_0px_#0f172a] z-50 animate-in slide-in-from-left-2">
                                        <h4 className="font-black text-xs mb-3">Crop Shape</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                onClick={() => handleMask('none')}
                                                className={`p-2 rounded-lg border-2 ${objectProps.mask === 'none' ? 'border-slate-900 bg-slate-100' : 'border-slate-200 hover:border-slate-900'}`}
                                                title="None"
                                            >
                                                <Square size={20} className="mx-auto" />
                                            </button>
                                            <button
                                                onClick={() => handleMask('circle')}
                                                className={`p-2 rounded-lg border-2 ${objectProps.mask === 'circle' ? 'border-slate-900 bg-slate-100' : 'border-slate-200 hover:border-slate-900'}`}
                                                title="Circle"
                                            >
                                                <Circle size={20} className="mx-auto" />
                                            </button>
                                            <button
                                                onClick={() => handleMask('square')}
                                                className={`p-2 rounded-lg border-2 ${objectProps.mask === 'square' ? 'border-slate-900 bg-slate-100' : 'border-slate-200 hover:border-slate-900'}`}
                                                title="Rounded Square"
                                            >
                                                <Square size={20} className="mx-auto rounded-md" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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
                                    <h4 className="font-black text-xs mb-3">Stroke Settings</h4>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
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
                                            <span className="text-[10px] font-bold text-slate-500">Position</span>
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
                                            <span className="text-[10px] font-bold text-slate-500">Color</span>
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
                                    <h4 className="font-black text-xs mb-3">Shadow Settings</h4>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
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
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
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
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
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
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
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
                                            <span className="text-[10px] font-bold text-slate-500">Color</span>
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

                        {/* Text Background Tool (Text Only) */}
                        {(selectedObject instanceof fabric.IText || selectedObject instanceof fabric.Text) && (
                            <div className="relative group">
                                <button
                                    onClick={() => setActiveTool(activeTool === 'textbg' ? null : 'textbg')}
                                    className={`p-3 rounded-xl transition-all ${activeTool === 'textbg' ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}`}
                                    title="Text Block Background"
                                >
                                    <div className={`w-5 h-5 rounded flex items-center justify-center text-[12px] font-black leading-none ${activeTool === 'textbg' ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-800'}`}>T</div>
                                </button>

                                {activeTool === 'textbg' && (
                                    <div className="absolute left-full top-0 ml-4 bg-white border-4 border-slate-900 rounded-2xl p-4 w-64 shadow-[8px_8px_0px_0px_#0f172a] z-50 animate-in slide-in-from-left-2">
                                        <h4 className="font-black text-xs mb-3">Text Background</h4>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-bold text-slate-500">Color</span>
                                                <div className="flex gap-2 flex-wrap">
                                                    <button
                                                        onClick={() => handleTextBgColor('transparent')}
                                                        className={`w-6 h-6 rounded border-2 border-slate-200 relative overflow-hidden ${objectProps.textBgColor === 'transparent' ? 'ring-2 ring-slate-900' : ''}`}
                                                    >
                                                        <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAFiUAABYlAUlSJPAAAAAoSURBVChTY/gPBmAMZkBUg9QyMDD8x4YZ8CoYxUCwQ4kwfFQAIMAA6Hsc7rEusGMAAAAASUVORK5CYII=')] opacity-50" />
                                                    </button>
                                                    {['#000000', '#ffffff', '#f27d26', '#ef4444', '#3b82f6'].map(c => (
                                                        <button
                                                            key={c}
                                                            onClick={() => handleTextBgColor(c)}
                                                            className={`w-6 h-6 rounded border-2 border-slate-200 ${objectProps.textBgColor === c ? 'ring-2 ring-slate-900' : ''}`}
                                                            style={{ backgroundColor: c }}
                                                        />
                                                    ))}
                                                    <input
                                                        type="color"
                                                        value={objectProps.textBgColor === 'transparent' ? '#ffffff' : objectProps.textBgColor}
                                                        onChange={(e) => handleTextBgColor(e.target.value)}
                                                        className="w-6 h-6 rounded border-2 border-slate-200 p-0 overflow-hidden"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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
                                        <h4 className="font-black text-xs mb-3">Corner Radius</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
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
                )}

                {/* Drawing Mode Tools */}
                {isDrawingMode && (
                    <div className="bg-white border-4 border-slate-900 rounded-2xl p-4 flex flex-col gap-4 shadow-[4px_4px_0px_0px_#0f172a] animate-in slide-in-from-left-2 w-48">
                        <h4 className="font-black text-xs">Brush Settings</h4>

                        <div className="space-y-2">
                            <span className="text-[10px] font-bold text-slate-500">Size ({brushSettings.width}px)</span>
                            <input
                                type="range" min="1" max="50"
                                value={brushSettings.width}
                                onChange={(e) => {
                                    const width = parseInt(e.target.value);
                                    setBrushSettings(prev => ({ ...prev, width }));
                                    if (fabricCanvas.current && fabricCanvas.current.freeDrawingBrush) {
                                        fabricCanvas.current.freeDrawingBrush.width = width;
                                    }
                                }}
                                className="w-full accent-slate-900"
                            />
                        </div>

                        <div className="space-y-2">
                            <span className="text-[10px] font-bold text-slate-500">Color</span>
                            <div className="flex gap-2 flex-wrap">
                                {['#000000', '#ffffff', '#f27d26', '#ef4444', '#3b82f6'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => {
                                            setBrushSettings(prev => ({ ...prev, color: c }));
                                            if (fabricCanvas.current && fabricCanvas.current.freeDrawingBrush) {
                                                fabricCanvas.current.freeDrawingBrush.color = c;
                                            }
                                        }}
                                        className={`w-6 h-6 rounded border-2 border-slate-200 ${brushSettings.color === c ? 'ring-2 ring-slate-900' : ''}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={brushSettings.color}
                                    onChange={(e) => {
                                        const color = e.target.value;
                                        setBrushSettings(prev => ({ ...prev, color }));
                                        if (fabricCanvas.current && fabricCanvas.current.freeDrawingBrush) {
                                            fabricCanvas.current.freeDrawingBrush.color = color;
                                        }
                                    }}
                                    className="w-6 h-6 rounded border-2 border-slate-200 p-0 overflow-hidden"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Undo / Redo */}
                <div className="bg-white border-4 border-slate-900 rounded-2xl p-2 flex flex-col gap-2 shadow-[4px_4px_0px_0px_#0f172a]">
                    <button
                        onClick={handleUndo}
                        disabled={historyIndex <= 0}
                        className="p-3 bg-white hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 size={20} />
                    </button>
                    <button
                        onClick={handleRedo}
                        disabled={historyIndex >= history.length - 1}
                        className="p-3 bg-white hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        <Redo2 size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
