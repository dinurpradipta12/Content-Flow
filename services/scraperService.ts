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

// Helper: Extract username from social media URL
const extractUsername = (url: string): string => {
    try {
        // Instagram: https://www.instagram.com/username/ or /p/postid/
        const instagramMatch = url.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/);
        if (instagramMatch) return instagramMatch[1];
        
        // Threads: https://www.threads.net/@username
        const threadsMatch = url.match(/threads\.net\/@([a-zA-Z0-9_.-]+)/);
        if (threadsMatch) return threadsMatch[1];
        
        // TikTok: https://www.tiktok.com/@username
        const tiktokMatch = url.match(/tiktok\.com\/@([a-zA-Z0-9_.-]+)/);
        if (tiktokMatch) return tiktokMatch[1];
        
        // LinkedIn: https://www.linkedin.com/in/username
        const linkedinMatch = url.match(/linkedin\.com\/(in|company)\/([a-zA-Z0-9_-]+)/);
        if (linkedinMatch) return linkedinMatch[2];
        
        return '';
    } catch (e) {
        return '';
    }
};

// --- INSTAGRAM LOOTER API FALLBACK (For View Counts) ---
// NOTE: Instagram Looter API endpoints are not available/working with current subscription
// Keeping this as placeholder for future use if API becomes available
const fetchFromInstagramLooterAPI = async (url: string): Promise<Partial<ScrapedMetrics> | null> => {
    console.log('[Scraper] Instagram Looter API fallback disabled - not available with current subscription');
    return null;
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
        apiUrl = `https://${host}/api/instagram/posts`; 
        body = { username: extractUsername(url), maxId: '' };

    } else if (platform === 'TikTok') {
        host = HOST_TIKTOK;
        headers['x-rapidapi-host'] = host;
        // Extract music ID or video ID from URL if needed
        apiUrl = `https://${host}/api/music/posts?musicId=7224128604890990593&count=30&cursor=0`;

    } else if (platform === 'LinkedIn') {
        host = HOST_LINKEDIN;
        headers['x-rapidapi-host'] = host;
        apiUrl = `https://${host}/get-company-by-domain?domain=linkedin.com`;

    } else if (platform === 'Threads') {
        host = HOST_THREADS;
        headers['x-rapidapi-host'] = host;
        // Extract username from Threads URL
        const threadUsername = extractUsername(url) || 'unknown';
        apiUrl = `https://${host}/api/v1/users/detail-with-biolink?username=${threadUsername}`;

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
            
            // Better error messages for common HTTP errors
            if (response.status === 403) {
                throw new Error(`Akses ditolak. Pastikan API key RapidAPI Anda valid dan memiliki subscription untuk ${platform}.`);
            } else if (response.status === 401) {
                throw new Error(`API key tidak valid. Periksa konfigurasi VITE_RAPIDAPI_KEY di .env`);
            } else if (response.status === 429) {
                throw new Error(`Terlalu banyak request. Coba lagi dalam beberapa saat.`);
            } else if (response.status === 404) {
                throw new Error(`Konten tidak ditemukan di ${platform}. Periksa kembali link-nya.`);
            } else {
                throw new Error(`API Error ${response.status}: ${response.statusText}`);
            }
        }
        
        const data = await response.json();
        console.log(`[Scraper] Raw Data:`, data);
        console.log(`[Scraper] Raw Data Keys:`, Object.keys(data));

        // --- MAPPING RESPONSE ---
        
        if (platform === 'Instagram') {
            // Instagram API returns: {result: {edges: [{node: {...}}], page_info: {...}}}
            const result = data.result || data.data || data;
            let media = result;
            
            // Handle paginated response with edges array
            if (result.edges && Array.isArray(result.edges) && result.edges.length > 0) {
                // Take first edge item, could be nested under .node
                media = result.edges[0].node || result.edges[0];
            } else if (Array.isArray(result)) {
                // If result itself is array, take first item
                media = result[0] || {};
            } else if (result.posts && Array.isArray(result.posts)) {
                // Alternative structure: {posts: [...]}
                media = result.posts[0] || {};
            } else if (result.user && result.user.node) {
                // Alternative: {user: {node: {...}}}
                media = result.user.node;
            }
            
            console.log('[Scraper] Instagram media object:', media);
            console.log('[Scraper] Media object keys:', Object.keys(media));
            
            // Extract metrics from Instagram API response fields
            let views = media.view_count || media.video_view_count || media.views || media.impression_count || 0;
            let likes = media.like_count || media.likes?.count || media.likeCount || 0;
            let comments = media.comment_count || media.comments?.count || media.commentCount || 0;
            
            // Check if metrics are disabled
            const metricsDisabled = media.like_and_view_counts_disabled === true;
            
            console.log('[Scraper] Instagram extracted metrics (primary API):', { views, likes, comments, metricsDisabled });
            console.log('[Scraper] Instagram raw fields:', { 
                view_count: media.view_count,
                like_count: media.like_count,
                comment_count: media.comment_count,
                like_and_view_counts_disabled: media.like_and_view_counts_disabled,
                caption: media.caption,
                owner_username: media.owner?.username
            });
            
            // NOTE: Instagram /api/instagram/posts endpoint does NOT return view_count data (it's always null)
            // This is a known API limitation. View counts are not available from this endpoint.
            // Likes and comments are working correctly.
            
            return {
                platform,
                username: media.owner?.username || media.user?.username || media.author?.username || extractUsername(url) || 'unknown',
                views: views || 0, // Will be 0 since view data isn't available from this API endpoint
                likes: likes || 0,
                comments: comments || 0,
                shares: media.shares || 0,
                saves: media.saves || 0,
                caption: media.caption?.text || media.caption || '',
                thumbnail: media.thumbnail_url || media.display_url || media.image_versions2?.candidates?.[0]?.url || ''
            };
        } 
        
        else if (platform === 'TikTok') {
            const item = data.data || data.result || data;
            const stats = item.stats || item.statistics || {};
            
            console.log('[Scraper] TikTok response structure:', { item, stats });
            
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