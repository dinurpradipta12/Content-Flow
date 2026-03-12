import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CanvasSize = {
    width: number;
    height: number;
    label: string;
    id: string;
};

export const CANVAS_SIZES: CanvasSize[] = [
    { id: 'ig-square', label: 'Instagram Square (1:1)', width: 1080, height: 1080 },
    { id: 'ig-portrait', label: 'Instagram Portrait (4:5)', width: 1080, height: 1350 },
    { id: 'ig-story', label: 'Instagram Story (9:16)', width: 1080, height: 1920 },
    { id: 'tiktok-carousel', label: 'Tiktok Carousel (9:16)', width: 1080, height: 1920 },
];

export interface CarouselPage {
    id: string;
    background: string;
    elements: any[]; // Fabric.js objects as JSON
    previewUrl?: string;
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
    projects: any[];
    presets: any[]; // Added for local storage
    currentProjectId: string | null;

    // Actions
    setPages: (pages: CarouselPage[]) => void;
    setCurrentPageIndex: (index: number) => void;
    setCanvasSize: (size: CanvasSize) => void;
    setIsOnboarding: (val: boolean) => void;
    setCurrentLayers: (layers: any[]) => void;
    setZoom: (zoom: number) => void;
    setReferenceData: (data: any) => void;
    setCustomFonts: (fonts: string[]) => void;
    setCurrentProjectId: (id: string | null) => void;

    addPage: () => void;
    duplicatePage: (index: number) => void;
    deletePage: (index: number) => void;
    updatePageContent: (index: number, content: Partial<CarouselPage['content']>) => void;
    updatePageBackground: (index: number, background: string) => void;
    updateAllPageBackgrounds: (background: string) => void;
    updatePageElements: (index: number, elements: any[], previewUrl?: string) => void;
    savePreset: (name: string, presetData?: { pages: CarouselPage[], canvasSize: CanvasSize }) => Promise<void>;
    loadPresets: () => Promise<any[]>;
    deletePreset: (id: string) => Promise<void>; // Added delete action for local
    saveProject: (name: string) => Promise<void>;
    loadProjects: () => Promise<any[]>;
    deleteProject: (id: string) => Promise<void>;
    uploadFont: (name: string, data: string) => Promise<void>;
    loadFonts: () => Promise<void>;
    resetCanvas: () => void;
}

export const useCarouselStore = create<CarouselState>()(
    persist(
        (set, get) => ({
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
            projects: [],
            presets: [],
            currentProjectId: null,

            setPages: (pages) => set({ pages }),
            setCurrentPageIndex: (currentPageIndex) => set({ currentPageIndex }),
            setCanvasSize: (canvasSize) => set({ canvasSize }),
            setIsOnboarding: (isOnboarding) => set({ isOnboarding }),
            setCurrentLayers: (currentLayers) => set({ currentLayers }),
            setZoom: (zoom) => set({ zoom }),
            setReferenceData: (referenceData) => set({ referenceData }),
            setCustomFonts: (customFonts) => set({ customFonts }),
            setCurrentProjectId: (currentProjectId) => set({ currentProjectId }),

            resetCanvas: () => set({
                pages: [{
                    id: Math.random().toString(36).substr(2, 9),
                    background: '#ffffff',
                    elements: [],
                    content: {
                        hook: 'Your Catchy Hook Here',
                        subHeadline: 'A compelling sub-headline',
                        body: 'The main value proposition or story goes here.',
                        cta: 'Swipe to learn more'
                    }
                }],
                currentPageIndex: 0,
                currentLayers: [],
                currentProjectId: null,
                zoom: 0.5,
                referenceData: null
            }),

            addPage: () => set((state) => {
                const currentBg = state.pages.length > 0 && state.currentPageIndex >= 0 ? state.pages[state.currentPageIndex].background : '#ffffff';
                return {
                    pages: [
                        ...state.pages,
                        {
                            id: Math.random().toString(36).substr(2, 9),
                            background: currentBg,
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
                };
            }),

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

            updateAllPageBackgrounds: (background) => set((state) => {
                const newPages = state.pages.map(page => ({ ...page, background }));
                return { pages: newPages };
            }),

            updatePageElements: (index, elements, previewUrl) => set((state) => {
                const newPages = [...state.pages];
                newPages[index] = { ...newPages[index], elements };
                if (previewUrl) {
                    newPages[index].previewUrl = previewUrl;
                }
                return { pages: newPages };
            }),

            savePreset: async (name, presetData) => {
                const { pages, canvasSize, presets } = get();
                const newPreset = {
                    id: Math.random().toString(36).substr(2, 9),
                    name,
                    data: presetData ?? { pages, canvasSize },
                    created_at: new Date().toISOString()
                };
                set({ presets: [newPreset, ...presets] });
            },

            loadPresets: async () => {
                return get().presets;
            },

            deletePreset: async (id) => {
                const { presets } = get();
                set({ presets: presets.filter(p => p.id !== id) });
            },

            saveProject: async (name) => {
                const { pages, canvasSize, projects, currentProjectId } = get();
                const updated_at = new Date().toISOString();
                const preview_url = pages[0]?.previewUrl || '';

                const projectData = {
                    id: currentProjectId || Math.random().toString(36).substr(2, 9),
                    name,
                    data: { pages, canvasSize },
                    updated_at,
                    preview_url
                };

                let newProjects;
                if (currentProjectId) {
                    newProjects = projects.map(p => p.id === currentProjectId ? projectData : p);
                } else {
                    newProjects = [projectData, ...projects];
                    set({ currentProjectId: projectData.id });
                }
                set({ projects: newProjects });
            },

            loadProjects: async () => {
                return get().projects;
            },

            deleteProject: async (id) => {
                const { projects, currentProjectId } = get();
                const newProjects = projects.filter(p => p.id !== id);
                set({
                    projects: newProjects,
                    currentProjectId: currentProjectId === id ? null : currentProjectId
                });
            },

            uploadFont: async (name, data) => {
                const { supabase } = await import('../../services/supabaseClient');
                const userId = localStorage.getItem('user_id');
                if (!userId) throw new Error('User not logged in');

                try {
                    const { error } = await supabase.from('custom_fonts').upsert({
                        name,
                        user_id: userId,
                        font_data: data
                    }, { onConflict: 'user_id,name' });

                    if (error) throw error;
                    await get().loadFonts();
                } catch (err) {
                    console.error('Font upload failed:', err);
                    throw err;
                }
            },

            loadFonts: async () => {
                const { supabase } = await import('../../services/supabaseClient');
                const userId = localStorage.getItem('user_id');
                if (!userId) return;

                try {
                    const { data, error } = await supabase
                        .from('custom_fonts')
                        .select('name, font_data')
                        .eq('user_id', userId);

                    if (error) {
                        if (error.code === 'PGRST204') return;
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
        }),
        {
            name: 'carousel-storage',
            partialize: (state) => ({
                ...state,
                // Exclude heavy previewUrls from persistence to avoid QuotaExceededError (5MB limit)
                pages: state.pages.map(({ previewUrl, ...page }) => page),
                projects: state.projects.map(project => ({
                    ...project,
                    preview_url: undefined,
                    data: {
                        ...project.data,
                        pages: project.data.pages.map(({ previewUrl, ...page }: any) => page)
                    }
                })),
                presets: state.presets.map(preset => ({
                    ...preset,
                    data: {
                        ...preset.data,
                        pages: preset.data.pages.map(({ previewUrl, ...page }: any) => page)
                    }
                }))
            })
        }
    ));
