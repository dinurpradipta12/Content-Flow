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
    zoom: number;
    referenceData: any | null;
    customFonts: string[];
    
    // Actions
    setPages: (pages: CarouselPage[]) => void;
    setCurrentPageIndex: (index: number) => void;
    setCanvasSize: (size: CanvasSize) => void;
    setIsOnboarding: (val: boolean) => void;
    setCurrentLayers: (layers: any[]) => void;
    setZoom: (zoom: number) => void;
    setReferenceData: (data: any) => void;
    setCustomFonts: (fonts: string[]) => void;
    
    addPage: () => void;
    duplicatePage: (index: number) => void;
    deletePage: (index: number) => void;
    updatePageContent: (index: number, content: Partial<CarouselPage['content']>) => void;
    updatePageBackground: (index: number, background: string) => void;
    updatePageElements: (index: number, elements: any[]) => void;
    savePreset: (name: string) => Promise<void>;
    loadPresets: () => Promise<any[]>;
    uploadFont: (name: string, data: string) => Promise<void>;
    loadFonts: () => Promise<void>;
}

export const useCarouselStore = create<CarouselState>((set, get) => ({
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
    isOnboarding: false,
    currentLayers: [],
    zoom: 0.5,
    referenceData: null,
    customFonts: [],

    setPages: (pages) => set({ pages }),
    setCurrentPageIndex: (currentPageIndex) => set({ currentPageIndex }),
    setCanvasSize: (canvasSize) => set({ canvasSize }),
    setIsOnboarding: (isOnboarding) => set({ isOnboarding }),
    setCurrentLayers: (currentLayers) => set({ currentLayers }),
    setZoom: (zoom) => set({ zoom }),
    setReferenceData: (referenceData) => set({ referenceData }),
    setCustomFonts: (customFonts) => set({ customFonts }),

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

    updatePageElements: (index, elements) => set((state) => {
        const newPages = [...state.pages];
        newPages[index] = { ...newPages[index], elements };
        return { pages: newPages };
    }),

    savePreset: async (name) => {
        const { pages, canvasSize } = get();
        const { supabase } = await import('../services/supabaseClient');
        const userId = localStorage.getItem('user_id');
        
        const { error } = await supabase.from('carousel_presets').insert({
            name,
            user_id: userId,
            data: { pages, canvasSize }
        });

        if (error) throw error;
    },

    loadPresets: async () => {
        const { supabase } = await import('../services/supabaseClient');
        const userId = localStorage.getItem('user_id');
        const { data, error } = await supabase
            .from('carousel_presets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    uploadFont: async (name, data) => {
        const { supabase } = await import('../services/supabaseClient');
        const userId = localStorage.getItem('user_id');
        
        try {
            const { error } = await supabase.from('custom_fonts').insert({
                name,
                user_id: userId,
                font_data: data
            });

            if (error) {
                // Ignore if table doesn't exist (PGRST205)
                if (error.code === 'PGRST205' || error.message.includes('custom_fonts')) {
                    console.warn('Custom fonts table missing, skipping upload.');
                    return;
                }
                throw error;
            }
            await get().loadFonts();
        } catch (err) {
            console.error('Font upload failed:', err);
        }
    },

    loadFonts: async () => {
        const { supabase } = await import('../services/supabaseClient');
        const userId = localStorage.getItem('user_id');
        
        try {
            const { data, error } = await supabase
                .from('custom_fonts')
                .select('name, font_data')
                .eq('user_id', userId);

            if (error) {
                 // Ignore if table doesn't exist (PGRST205)
                 if (error.code === 'PGRST205' || error.message.includes('custom_fonts')) {
                    console.warn('Custom fonts table missing, skipping load.');
                    return;
                }
                throw error;
            }
            
            const fonts = data.map(f => f.name);
            set({ customFonts: fonts });

            // Load into document
            for (const font of data) {
                try {
                    const fontFace = new FontFace(font.name, `url(${font.font_data})`);
                    const loadedFace = await fontFace.load();
                    (document.fonts as any).add(loadedFace);
                } catch (e) {
                    console.error(`Failed to load font ${font.name}`, e);
                }
            }
        } catch (err) {
            console.error('Font load failed:', err);
        }
    }
}));
