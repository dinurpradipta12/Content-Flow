// services/scraperService.ts

/**
 * SCRAPER SERVICE MODULE
 * Menghubungkan aplikasi dengan RapidAPI untuk mengambil data real-time.
 */

export interface ScrapedMetrics {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    platform: string;
    username: string;
    caption?: string;
    thumbnail?: string;
}

const detectPlatformFromUrl = (url: string): string => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('instagram.com') || lowerUrl.includes('instagr.am')) return 'Instagram';
    if (lowerUrl.includes('tiktok.com') || lowerUrl.includes('vt.tiktok.com')) return 'TikTok';
    if (lowerUrl.includes('linkedin.com')) return 'LinkedIn';
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'YouTube';
    if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch')) return 'Facebook';
    if (lowerUrl.includes('threads.net')) return 'Threads';
    return 'Unknown';
};

// --- REAL API LOGIC (RapidAPI) ---
const fetchFromRapidAPI = async (url: string, platform: string): Promise<ScrapedMetrics> => {
    // Initialize with defaults to prevent crash
    let RAPIDAPI_KEY = '';
    let HOST_IG = 'instagram120.p.rapidapi.com';
    let HOST_TIKTOK = 'tiktok-api23.p.rapidapi.com';
    let HOST_LINKEDIN = 'linkedin-data-api.p.rapidapi.com';
    let HOST_THREADS = 'threads-scraper.p.rapidapi.com';

    // Safe Environment Access
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || '';
            // @ts-ignore
            HOST_IG = import.meta.env.VITE_RAPIDAPI_HOST_IG || HOST_IG;
            // @ts-ignore
            HOST_TIKTOK = import.meta.env.VITE_RAPIDAPI_HOST_TIKTOK || HOST_TIKTOK;
            // @ts-ignore
            HOST_LINKEDIN = import.meta.env.VITE_RAPIDAPI_HOST_LINKEDIN || HOST_LINKEDIN;
            // @ts-ignore
            HOST_THREADS = import.meta.env.VITE_RAPIDAPI_HOST_THREADS || HOST_THREADS;
        }
    } catch (e) {
        console.warn("[Scraper] Env vars not accessible, using defaults/empty.");
    }

    let apiUrl = '';
    let host = '';
    let method = 'GET';
    let body: any = null;
    
    // Default Header
    const headers: Record<string, string> = {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'Content-Type': 'application/json'
    };

    if (platform === 'Instagram') {
        host = HOST_IG;
        headers['x-rapidapi-host'] = host;
        method = 'POST';
        apiUrl = `https://${host}/api/instagram/url`; 
        body = { url: url };

    } else if (platform === 'TikTok') {
        host = HOST_TIKTOK;
        headers['x-rapidapi-host'] = host;
        apiUrl = `https://${host}/api/video/info?url=${encodeURIComponent(url)}`;

    } else if (platform === 'LinkedIn') {
        host = HOST_LINKEDIN;
        headers['x-rapidapi-host'] = host;
        apiUrl = `https://${host}/get-post-details?link=${encodeURIComponent(url)}`;

    } else if (platform === 'Threads') {
        host = HOST_THREADS;
        headers['x-rapidapi-host'] = host;
        apiUrl = `https://${host}/api/v1/thread?url=${encodeURIComponent(url)}`;

    } else {
        throw new Error(`Platform ${platform} belum didukung.`);
    }

    const options: RequestInit = { 
        method: method, 
        headers: headers 
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    console.log(`[Scraper] Requesting: ${method} ${apiUrl}`);

    try {
        const response = await fetch(apiUrl, options);
        
        if (!response.ok) {
            const errText = await response.text();
            console.error(`[Scraper] API Error (${response.status}):`, errText);
            throw new Error(`API Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`[Scraper] Raw Data:`, data);

        // --- MAPPING RESPONSE ---
        
        if (platform === 'Instagram') {
            const media = data.data || data; 
            const stats = media.statistics || media;
            
            return {
                platform,
                username: media.owner?.username || media.author?.username || 'unknown',
                views: stats.playCount || stats.viewCount || media.video_view_count || 0,
                likes: stats.likeCount || media.like_count || 0,
                comments: stats.commentCount || media.comment_count || 0,
                shares: stats.shareCount || media.share_count || 0,
                saves: stats.saveCount || media.save_count || 0,
                caption: media.caption?.text || media.caption || '',
                thumbnail: media.thumbnail_url || media.display_url || media.image_versions2?.candidates?.[0]?.url || ''
            };
        } 
        
        else if (platform === 'TikTok') {
            const item = data.data || data;
            const stats = item.stats || item.statistics || {};
            
            return {
                platform,
                username: item.author?.nickname || item.author?.unique_id || 'tiktok_user',
                views: stats.playCount || item.playCount || 0,
                likes: stats.diggCount || item.diggCount || 0,
                comments: stats.commentCount || item.commentCount || 0,
                shares: stats.shareCount || item.shareCount || 0,
                saves: stats.collectCount || item.collectCount || 0,
                caption: item.desc || item.description || '',
                thumbnail: item.cover || item.video?.cover || ''
            };
        } 
        
        else if (platform === 'LinkedIn') {
            const item = data.data || data;
            return {
                platform,
                username: item.author?.name || 'linkedin_user',
                views: item.num_views || item.views || 0,
                likes: item.num_likes || item.likes || 0,
                comments: item.num_comments || item.comments || 0,
                shares: item.num_shares || item.shares || 0,
                saves: 0,
                caption: item.text || item.commentary || '',
                thumbnail: item.images?.[0] || ''
            };
        } 
        
        else if (platform === 'Threads') {
             const thread = data.data?.containing_thread || data.thread || data;
             const post = thread?.thread_items?.[0]?.post || thread;
             
             return {
                 platform,
                 username: post?.user?.username || 'threads_user',
                 views: post?.view_count || 0,
                 likes: post?.like_count || 0,
                 comments: post?.reply_count || 0,
                 shares: post?.reshare_count || 0,
                 saves: 0,
                 caption: post?.caption?.text || '',
                 thumbnail: post?.image_versions2?.candidates?.[0]?.url || ''
             };
        }
        
        return {
            platform,
            username: 'unknown',
            views: 0, likes: 0, comments: 0, shares: 0, saves: 0
        };

    } catch (error) {
        console.error("[Scraper] Fetch Error:", error);
        throw error;
    }
};

const fetchSimulation = async (url: string, platform: string): Promise<ScrapedMetrics> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                platform,
                username: '@arunika_simulated',
                views: 12500,
                likes: 2300,
                comments: 450,
                shares: 120,
                saves: 85,
                caption: "Mode simulasi aktif. Periksa koneksi API.",
                thumbnail: ''
            });
        }, 1500);
    });
};

export const analyzeContentLink = async (url: string): Promise<ScrapedMetrics> => {
    if (!url || !url.startsWith('http')) {
        throw new Error("URL tidak valid.");
    }

    const platform = detectPlatformFromUrl(url);
    
    // Access safely
    let apiKey = '';
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            apiKey = import.meta.env.VITE_RAPIDAPI_KEY;
        }
    } catch (e) {
        console.warn("[Scraper] Could not read env apiKey");
    }

    console.log(`[Scraper] Analyzing: ${url} (${platform})`);
    
    if (apiKey && apiKey.length > 5) {
        return await fetchFromRapidAPI(url, platform);
    } else {
        console.warn("No RapidAPI Key found in .env (VITE_RAPIDAPI_KEY). Using Simulation.");
        return await fetchSimulation(url, platform);
    }
};