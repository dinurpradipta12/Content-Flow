import { create } from 'zustand';

export type CanvasSize = {
    width: number;
    height: number;
    label: string;
    id: string;
};

export const CANVAS_SIZES: CanvasSize[] = [
    { id: 'ig-portrait', label: 'Instagram Portrait (4:5)', width: 1080, height: 1350 },
    { id: 'ig-square', label: 'Instagram Square (1:1)', width: 1080, height: 1080 },
    { id: 'linkedin-post', label: 'LinkedIn Post', width: 1200, height: 627 },
];

export interface CarouselPage {
    id: string;
    background: string;
    elements: any[]; // Fabric.js objects as JSON
    content: {
        hook: string;
        subHeadline: string;
        body: string;
        cta: string;
    };
}

interface CarouselState {
    pages: CarouselPage[];
    currentPageIndex: number;
    canvasSize: CanvasSize;
    isOnboarding: boolean;
    currentLayers: any[];
    
    // Actions
    setPages: (pages: CarouselPage[]) => void;
    setCurrentPageIndex: (index: number) => void;
    setCanvasSize: (size: CanvasSize) => void;
    setIsOnboarding: (val: boolean) => void;
    setCurrentLayers: (layers: any[]) => void;
    
    addPage: () => void;
    duplicatePage: (index: number) => void;
    deletePage: (index: number) => void;
    updatePageContent: (index: number, content: Partial<CarouselPage['content']>) => void;
    updatePageBackground: (index: number, background: string) => void;
}

export const useCarouselStore = create<CarouselState>((set) => ({
    pages: [
        {
            id: '1',
            background: '#ffffff',
            elements: [],
            content: {
                hook: 'Your Catchy Hook Here',
                subHeadline: 'A compelling sub-headline',
                body: 'The main value proposition or story goes here.',
                cta: 'Swipe to learn more'
            }
        }
    ],
    currentPageIndex: 0,
    canvasSize: CANVAS_SIZES[0],
    isOnboarding: true,
    currentLayers: [],

    setPages: (pages) => set({ pages }),
    setCurrentPageIndex: (currentPageIndex) => set({ currentPageIndex }),
    setCanvasSize: (canvasSize) => set({ canvasSize }),
    setIsOnboarding: (isOnboarding) => set({ isOnboarding }),
    setCurrentLayers: (currentLayers) => set({ currentLayers }),

    addPage: () => set((state) => ({
        pages: [
            ...state.pages,
            {
                id: Math.random().toString(36).substr(2, 9),
                background: '#ffffff',
                elements: [],
                content: {
                    hook: 'New Hook',
                    subHeadline: 'New Sub-headline',
                    body: 'New body text',
                    cta: 'New CTA'
                }
            }
        ],
        currentPageIndex: state.pages.length
    })),

    duplicatePage: (index) => set((state) => {
        const pageToDuplicate = state.pages[index];
        const newPage = {
            ...pageToDuplicate,
            id: Math.random().toString(36).substr(2, 9),
        };
        const newPages = [...state.pages];
        newPages.splice(index + 1, 0, newPage);
        return { pages: newPages, currentPageIndex: index + 1 };
    }),

    deletePage: (index) => set((state) => {
        if (state.pages.length <= 1) return state;
        const newPages = state.pages.filter((_, i) => i !== index);
        const newIndex = Math.min(state.currentPageIndex, newPages.length - 1);
        return { pages: newPages, currentPageIndex: newIndex };
    }),

    updatePageContent: (index, content) => set((state) => {
        const newPages = [...state.pages];
        newPages[index] = {
            ...newPages[index],
            content: { ...newPages[index].content, ...content }
        };
        return { pages: newPages };
    }),

    updatePageBackground: (index, background) => set((state) => {
        const newPages = [...state.pages];
        newPages[index] = { ...newPages[index], background };
        return { pages: newPages };
    }),
}));
