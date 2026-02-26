import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { RELIGION_CONTENT } from './religionData';
import { Button } from '../components/ui/Button';
import { Sun, Moon, Sunset, Sunrise, Bell, Calendar, Plus, Trash2, ArrowRight, CheckCircle, Book, Settings, Clock, Layers, Circle, Check, TrendingUp, ArrowUpRight, Eye, MousePointerClick, CalendarCheck, TrendingDown, X, CheckCheck } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../components/NotificationProvider';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

const getGreetingInfo = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Selamat Pagi', theme: 'from-[#f97316] to-[#ec4899]', icon: <Sunrise size={64} className="text-white" />, quote: "Fokus pada kualitas, bukan hanya kecepatan. 🌟" };
    if (hour >= 12 && hour < 15) return { text: 'Selamat Siang', theme: 'from-sky-400 to-indigo-500', icon: <Sun size={64} className="text-white" />, quote: "Tetap semangat dan selesaikan tugasmu dengan baik! 💪" };
    if (hour >= 15 && hour < 18) return { text: 'Selamat Sore', theme: 'from-amber-500 to-rose-600', icon: <Sunset size={64} className="text-white" />, quote: "Bagus sekali, waktu yang tepat untuk menyelesaikannya! ☕" };
    return { text: 'Selamat Malam', theme: 'from-indigo-600 to-purple-800', icon: <Moon size={64} className="text-white" />, quote: "Beristirahatlah, besok adalah hari yang baru! 🌙" };
};



const ChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card p-3 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] rounded-xl pointer-events-none">
                {label && <p className="text-mutedForeground font-bold text-[10px] uppercase mb-1 leading-none">{label}</p>}
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
                        <p className="text-foreground font-black text-xs">
                            <span className="opacity-50 font-bold">{entry.name}:</span> {entry.value.toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { notifications, handleNotificationClick, unreadCount, markAllAsRead, clearAllNotifications } = useNotifications();
    const [showNotifSidebar, setShowNotifSidebar] = useState(false);
    const userName = localStorage.getItem('user_name') || 'Aditya';

    // 1. Time Info
    const [timeInfo, setTimeInfo] = useState(getGreetingInfo());

    // Refresh greeting every minute to catch hour changes
    useEffect(() => {
        const timer = setInterval(() => setTimeInfo(getGreetingInfo()), 60000);
        return () => clearInterval(timer);
    }, []);

    // 2. Religion Settings & Prayer Times
    const [religion, setReligion] = useState<string | null>(localStorage.getItem('user_religion'));
    const [isSelectingReligion, setIsSelectingReligion] = useState(!localStorage.getItem('user_religion'));
    const [manualCity, setManualCity] = useState(localStorage.getItem('user_city') || '');
    const [manualTz, setManualTz] = useState(localStorage.getItem('user_tz') || 'WIB');

    const [dailyQuote, setDailyQuote] = useState<any>(null);

    const [prayerData, setPrayerData] = useState<any>(null);
    const [cityInfo, setCityInfo] = useState('Lokasi Anda');
    const [tzLabel, setTzLabel] = useState('WIB');
    const [nextPrayerState, setNextPrayerState] = useState({ name: '-', time: '-', countdown: '-' });

    // Sync from DB
    useEffect(() => {
        const syncPreferences = async () => {
            const userId = localStorage.getItem('user_id');
            if (!userId) return;

            const { data, error } = await supabase
                .from('app_users')
                .select('religion, city, timezone')
                .eq('id', userId)
                .single();

            if (data && !error) {
                if (data.religion) {
                    setReligion(data.religion);
                    localStorage.setItem('user_religion', data.religion);
                    setIsSelectingReligion(false);
                }
                if (data.city) {
                    setManualCity(data.city);
                    localStorage.setItem('user_city', data.city);
                }
                if (data.timezone) {
                    setManualTz(data.timezone);
                    localStorage.setItem('user_tz', data.timezone);
                }
            }
        };
        syncPreferences();
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const fetchQuoteOnline = async (rel: string) => {
            const timePhase = Math.floor(new Date().getTime() / 10800000);
            const cacheKey = `daily_quote_${rel}_${timePhase}`;
            const cached = localStorage.getItem(cacheKey);

            if (cached) {
                if (!isCancelled) setDailyQuote(JSON.parse(cached));
                return;
            }

            try {
                if (rel === 'Kristen' || rel === 'Katolik') {
                    const res = await fetch('https://labs.bible.org/api/?passage=random&type=json');
                    const data = await res.json();
                    const item = Array.isArray(data) ? data[0] : data;
                    const newQuote = {
                        text: item.text.replace(/<\/?b>/g, ''), // bersihkan label HTML
                        source: `${item.bookname} ${item.chapter}:${item.verse}`
                    };
                    if (!isCancelled) {
                        setDailyQuote(newQuote);
                        localStorage.setItem(cacheKey, JSON.stringify(newQuote));
                    }
                } else if (rel !== 'Islam') {
                    const res = await fetch('https://dummyjson.com/quotes/random');
                    const data = await res.json();
                    const newQuote = {
                        text: data.quote,
                        source: data.author
                    };
                    if (!isCancelled) {
                        setDailyQuote(newQuote);
                        localStorage.setItem(cacheKey, JSON.stringify(newQuote));
                    }
                }
            } catch (e) {
                // Fallback jika tidak ada internet
                if (!isCancelled && RELIGION_CONTENT[rel]) {
                    const quotes = RELIGION_CONTENT[rel].quotes;
                    setDailyQuote(quotes[timePhase % quotes.length]);
                }
            }
        };

        if (religion && RELIGION_CONTENT[religion]) {
            if (religion === 'Islam') {
                const quotes = RELIGION_CONTENT[religion].quotes;
                const timePhase = Math.floor(new Date().getTime() / 10800000);
                setDailyQuote(quotes[timePhase % quotes.length]);
            } else {
                fetchQuoteOnline(religion);
            }
        }

        // Refresh quote every minute to check if 3-hour boundary crossed
        const quoteIntv = setInterval(() => {
            if (religion) {
                if (religion === 'Islam') {
                    const quotes = RELIGION_CONTENT[religion].quotes;
                    const timePhase = Math.floor(new Date().getTime() / 10800000);
                    setDailyQuote(quotes[timePhase % quotes.length]);
                } else {
                    fetchQuoteOnline(religion);
                }
            }
        }, 60000);

        if (religion === 'Islam') {
            const fetchPrayer = async () => {
                try {
                    let url = '';
                    if (manualCity) {
                        url = `https://api.aladhan.com/v1/timingsByCity?city=${manualCity}&country=Indonesia&method=20`;
                        setCityInfo(manualCity);
                        setTzLabel(manualTz);
                    } else {
                        // fallback to geo
                        if ("geolocation" in navigator) {
                            navigator.geolocation.getCurrentPosition(
                                async (pos) => {
                                    const lat = pos.coords.latitude;
                                    const lon = pos.coords.longitude;
                                    url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=20`;
                                    setCityInfo('Lokasi Anda (Otomatis)');

                                    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                                    let currentTzLabel = 'WIB';
                                    if (tz && (tz.includes('Makassar') || tz.includes('Singapore') || tz.includes('Kuala_Lumpur') || tz.includes('Brunei'))) currentTzLabel = 'WITA';
                                    if (tz && tz.includes('Jayapura')) currentTzLabel = 'WIT';
                                    setTzLabel(currentTzLabel);

                                    const res = await fetch(url);
                                    const data = await res.json();
                                    if (data.data && data.data.timings) setPrayerData(data.data.timings);
                                },
                                async () => {
                                    // Blocked
                                    url = `https://api.aladhan.com/v1/timingsByCity?city=Jakarta&country=Indonesia&method=20`;
                                    setCityInfo('Jakarta dan sekitarnya');
                                    setTzLabel('WIB');
                                    const res = await fetch(url);
                                    const data = await res.json();
                                    if (data.data && data.data.timings) setPrayerData(data.data.timings);
                                },
                                { timeout: 5000 }
                            );
                            return; // Wait for geo callback
                        } else {
                            url = `https://api.aladhan.com/v1/timingsByCity?city=Jakarta&country=Indonesia&method=20`;
                            setCityInfo('Jakarta dan sekitarnya');
                            setTzLabel('WIB');
                        }
                    }

                    if (url) {
                        const res = await fetch(url);
                        const data = await res.json();
                        if (data.data && data.data.timings) setPrayerData(data.data.timings);
                    }

                } catch (e) {
                    console.error("Gagal mendapat jadwal:", e);
                }
            };
            fetchPrayer();
        }

        return () => {
            isCancelled = true;
            clearInterval(quoteIntv);
        }
    }, [religion, manualCity, manualTz]);

    const getReligionStyles = (rel: string | null) => {
        switch (rel) {
            case 'Kristen': return 'from-[#2563EB] to-[#1E3A8A]'; // Blue
            case 'Katolik': return 'from-[#E11D48] to-[#9F1239]'; // Rose/Red
            case 'Buddha': return 'from-[#F59E0B] to-[#B45309]'; // Amber
            case 'Hindu': return 'from-[#C026D3] to-[#86198F]'; // Fuchsia
            case 'Konghucu': return 'from-[#EF4444] to-[#B91C1C]'; // Red
            default: return 'from-[#475569] to-[#1E293B]'; // Slate for others
        }
    };
    // Countdown effect
    useEffect(() => {
        if (!prayerData) return;
        const calcNext = () => {
            const now = new Date();
            const currentM = now.getHours() * 60 + now.getMinutes();

            // Tahajud is estimated at 02:00 for simplicity as required
            const p = [
                { name: 'Tahajud', t: 2 * 60 + 0, raw: '02:00' },
                { name: 'Sahoor (Imsak)', t: parseInt(prayerData.Imsak.split(':')[0]) * 60 + parseInt(prayerData.Imsak.split(':')[1]), raw: prayerData.Imsak },
                { name: 'Subuh', t: parseInt(prayerData.Fajr.split(':')[0]) * 60 + parseInt(prayerData.Fajr.split(':')[1]), raw: prayerData.Fajr },
                { name: 'Dzuhur', t: parseInt(prayerData.Dhuhr.split(':')[0]) * 60 + parseInt(prayerData.Dhuhr.split(':')[1]), raw: prayerData.Dhuhr },
                { name: 'Ashar', t: parseInt(prayerData.Asr.split(':')[0]) * 60 + parseInt(prayerData.Asr.split(':')[1]), raw: prayerData.Asr },
                { name: 'Maghrib (Iftar)', t: parseInt(prayerData.Maghrib.split(':')[0]) * 60 + parseInt(prayerData.Maghrib.split(':')[1]), raw: prayerData.Maghrib },
                { name: 'Isya (Tarawih)', t: parseInt(prayerData.Isha.split(':')[0]) * 60 + parseInt(prayerData.Isha.split(':')[1]), raw: prayerData.Isha }
            ];

            let next = p.find(x => x.t > currentM);
            let isTomorrow = false;
            if (!next) {
                next = p[0];
                isTomorrow = true;
            }

            let diff = isTomorrow ? (24 * 60 - currentM + next.t) : (next.t - currentM);
            let h = Math.floor(diff / 60);
            let m = diff % 60;

            setNextPrayerState({
                name: next.name,
                time: next.raw,
                countdown: `${h > 0 ? h + ' Jam ' : ''}${m}`
            });
        };
        calcNext();
        const intv = setInterval(calcNext, 60000);
        return () => clearInterval(intv);
    }, [prayerData]);

    const handleSetReligion = async (rel: string) => {
        localStorage.setItem('user_religion', rel);
        setReligion(rel);
        setIsSelectingReligion(false);

        // Save to DB
        const userId = localStorage.getItem('user_id');
        if (userId) {
            await supabase.from('app_users').update({ religion: rel }).eq('id', userId);
        }
    };



    // 4. Daily Checklist
    const [checklists, setChecklists] = useState<{ id: string, text: string, done: boolean }[]>([]);
    const [newChecklist, setNewChecklist] = useState('');

    // 5. KPI Data
    const [kpis, setKpis] = useState<any[]>([]);
    useEffect(() => {
        const fetchKPIs = async () => {
            try {
                const userFullName = localStorage.getItem('user_name');
                const userAvatar = localStorage.getItem('user_avatar');

                if (!userFullName && !userAvatar) return;

                let tmData = null;
                const { data: allMembers } = await supabase.from('team_members').select('id, full_name, avatar_url');

                if (allMembers) {
                    tmData = allMembers.find(m => m.full_name === userFullName || m.avatar_url === userAvatar);
                }

                if (tmData) {
                    const { data: kData, error } = await supabase
                        .from('team_kpis')
                        .select('*')
                        .eq('member_id', tmData.id)
                        .order('created_at', { ascending: false });

                    if (error) throw error;
                    if (kData) setKpis(kData);
                }
            } catch (err) {
                console.error("Error fetching KPIs:", err);
            }
        };
        fetchKPIs();
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('daily_checklists');
        if (saved) setChecklists(JSON.parse(saved));
    }, []);

    const saveChecklists = (newList: any) => {
        setChecklists(newList);
        localStorage.setItem('daily_checklists', JSON.stringify(newList));
    };

    const addChecklist = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChecklist.trim()) return;
        const newList = [...checklists, { id: Date.now().toString(), text: newChecklist, done: false }];
        saveChecklists(newList);
        setNewChecklist('');
    };

    const toggleChecklist = (id: string) => {
        const newList = checklists.map(c => c.id === id ? { ...c, done: !c.done } : c);
        saveChecklists(newList);
    };

    const deleteChecklist = (id: string) => {
        const newList = checklists.filter(c => c.id !== id);
        saveChecklists(newList);
    };

    const [workspaces, setWorkspaces] = useState<any[]>([]);
    useEffect(() => {
        const fetchWs = async () => {
            const tenantId = localStorage.getItem('tenant_id') || localStorage.getItem('user_id');
            const currentUserAvatar = localStorage.getItem('user_avatar') || 'https://picsum.photos/40/40';
            const userRole = localStorage.getItem('user_role');

            const isBase64Avatar = currentUserAvatar?.startsWith('data:');
            const shouldSkipAvatarFilter = isBase64Avatar && currentUserAvatar.length > 500;

            let query = supabase.from('workspaces').select('*');

            if (shouldSkipAvatarFilter) {
                query = query.eq('admin_id', tenantId);
            } else {
                query = query.or(`admin_id.eq.${tenantId}${currentUserAvatar ? `,members.cs.{"${currentUserAvatar}"}` : ''}`);
            }

            const { data: wsData } = await query.order('name');
            const userId = localStorage.getItem('user_id');

            // Strict filtering for everyone
            let myWorkspaces = (wsData || []).filter(ws => {
                const isOwner = ws.owner_id === userId || (ws.admin_id === userId && !ws.owner_id);
                if (isOwner) return true;

                return (ws.members && ws.members.some((m: string) => {
                    try { return decodeURIComponent(m) === decodeURIComponent(currentUserAvatar) || m === currentUserAvatar; }
                    catch { return m === currentUserAvatar; }
                }));
            });

            setWorkspaces(myWorkspaces);
        };
        fetchWs();
    }, []);

    // 6. Analytics Metrics
    const [filterWs, setFilterWs] = useState('all');
    const [filterPlatform, setFilterPlatform] = useState('all');
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [selectedMetric, setSelectedMetric] = useState('views');
    const [metricsCurrent, setMetricsCurrent] = useState({ views: 0, er: 0, published: 0 });
    const [metricsPrev, setMetricsPrev] = useState({ views: 0, er: 0, published: 0 });
    const [chartData, setChartData] = useState<any[]>([]);
    const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
    const [pillarDistribution, setPillarDistribution] = useState<any[]>([]);

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (workspaces.length === 0) return;

            const startCurrent = new Date(filterYear, filterMonth, 1);
            const endCurrent = new Date(filterYear, filterMonth + 1, 0, 23, 59, 59);

            const startPrev = new Date(filterYear, filterMonth - 1, 1);
            const endPrev = new Date(filterYear, filterMonth, 0, 23, 59, 59);

            let query = supabase
                .from('content_items')
                .select('date, metrics, platform, workspace_id, status, pillar')
                .gte('date', startPrev.toISOString())
                .lte('date', endCurrent.toISOString());

            if (filterWs !== 'all') {
                query = query.eq('workspace_id', filterWs);
            } else {
                const wsIds = workspaces.map(w => w.id);
                query = query.in('workspace_id', wsIds);
            }

            if (filterPlatform !== 'all') query = query.eq('platform', filterPlatform);

            const { data, error } = await query;
            if (error) {
                console.error("Error fetching analytics:", error);
                return;
            }
            if (!data) return;

            // Prepare Chart Data (Days of selected month)
            const dailyDataMap: Record<string, any> = {};
            const daysInMonth = new Date(filterYear, filterMonth + 1, 0).getDate();

            for (let i = 1; i <= daysInMonth; i++) {
                const d = new Date(filterYear, filterMonth, i);
                const dateStr = d.toISOString().split('T')[0];
                dailyDataMap[dateStr] = {
                    date: dateStr,
                    formattedDate: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
                    views: 0,
                    likes: 0,
                    comments: 0,
                    shares: 0,
                    saves: 0,
                    interactions: 0
                };
            }

            let curViews = 0, curInteractions = 0, curPublished = 0;
            let prevViews = 0, prevInteractions = 0, prevPublished = 0;

            data.forEach((item: any) => {
                const dateToProcess = item.date || item.upload_date;
                if (!dateToProcess) return;
                const itemDate = new Date(dateToProcess);
                const dateStr = dateToProcess.split('T')[0];
                const m = item.metrics || {};
                const itemViews = m.views || 0;
                const itemLikes = m.likes || 0;
                const itemComments = m.comments || 0;
                const itemShares = m.shares || 0;
                const itemSaves = m.saves || 0;
                const itemInteractions = itemLikes + itemComments + itemShares + itemSaves;

                // Update Overview Metrics
                if (itemDate >= startCurrent && itemDate <= endCurrent) {
                    curViews += itemViews;
                    curInteractions += itemInteractions;
                    if (item.status === 'Published') curPublished++;
                } else if (itemDate >= startPrev && itemDate <= endPrev) {
                    prevViews += itemViews;
                    prevInteractions += itemInteractions;
                    if (item.status === 'Published') prevPublished++;
                }

                // Update Chart Data Map
                if (dailyDataMap[dateStr]) {
                    dailyDataMap[dateStr].views += itemViews;
                    dailyDataMap[dateStr].likes += itemLikes;
                    dailyDataMap[dateStr].comments += itemComments;
                    dailyDataMap[dateStr].shares += itemShares;
                    dailyDataMap[dateStr].saves += itemSaves;
                    dailyDataMap[dateStr].interactions += itemInteractions;
                }
            });

            const sortedChartData = Object.values(dailyDataMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
            setChartData(sortedChartData);

            // Calculate Distributions (Status & Pillar) for the same 30-day window
            const statusMap: Record<string, number> = {};
            const pillarMap: Record<string, number> = {};

            data.forEach((item: any) => {
                const dateToProcess = item.date || item.upload_date;
                if (!dateToProcess) return;
                const itemDate = new Date(dateToProcess);

                // Use the same month window as the chart
                if (itemDate >= startCurrent && itemDate <= endCurrent) {
                    // Status distribution
                    const s = item.status || 'Draft';
                    statusMap[s] = (statusMap[s] || 0) + 1;

                    // Pillar distribution
                    const p = item.pillar || 'Uncategorized';
                    pillarMap[p] = (pillarMap[p] || 0) + 1;
                }
            });

            setStatusDistribution(Object.entries(statusMap).map(([name, value]) => ({ name, value })));
            setPillarDistribution(Object.entries(pillarMap).map(([name, value]) => ({ name, value })));

            const curER = curViews > 0 ? (curInteractions / curViews) * 100 : 0;
            const prevER = prevViews > 0 ? (prevInteractions / prevViews) * 100 : 0;

            setMetricsCurrent({ views: curViews, er: curER, published: curPublished });
            setMetricsPrev({ views: prevViews, er: prevER, published: prevPublished });
        };
        fetchAnalytics();
    }, [filterWs, filterPlatform, filterMonth, filterYear, workspaces]);

    const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const renderMetricCompare = (current: number, previous: number, isPercent = false) => {
        const growth = calculateGrowth(current, previous);
        const isPositive = growth > 0;
        const isZero = growth === 0;
        const sign = isPositive ? '+' : '';
        const colorClass = isZero ? 'text-slate-400' : isPositive ? 'text-emerald-500' : 'text-red-500';
        const Icon = isPositive ? TrendingUp : TrendingDown;

        return (
            <div className={`flex items-center gap-1 text-xs font-bold ${colorClass}`}>
                {!isZero && <Icon size={12} strokeWidth={3} />}
                <span>{sign}{growth.toFixed(1)}% dari bulan lalu</span>
            </div>
        );
    };

    const formatShortNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    return (
        <div className="w-full px-6 md:px-10 space-y-8 animate-in fade-in duration-500 pb-20">
            {/* GRID LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* --- LEFT DESKTOP COLUMN (8 of 12) --- */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Welcome Banner */}
                    <div className="mb-2 pt-8">
                        <h1 className="text-4xl md:text-[3.5rem] font-heading font-black tracking-tight text-slate-800 leading-tight">
                            {timeInfo.text}, {userName}!
                        </h1>
                        <p className="text-slate-500 font-bold text-lg md:text-xl mt-2 max-w-2xl">
                            {timeInfo.quote} Konsistensi adalah kunci kesuksesan. Mari buat karya luar biasa hari ini! ✨
                        </p>
                    </div>

                    {/* Analytics Filtering & Cards */}
                    <div>
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                            <h2 className="text-2xl font-bold font-heading text-foreground">Overview Analytic</h2>

                            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                                <select
                                    className="px-3 py-1.5 border-2 border-slate-900 rounded-full font-black text-[10px] uppercase tracking-wider bg-card text-foreground outline-none focus:bg-slate-100 cursor-pointer shadow-hard-mini hover:translate-x-0.5 hover:translate-y-0.5"
                                    value={filterPlatform}
                                    onChange={(e) => setFilterPlatform(e.target.value)}
                                >
                                    <option value="all">PLATFORM</option>
                                    {['Instagram', 'Tiktok', 'Youtube', 'LinkedIn', 'Facebook', 'Twitter', 'Threads'].map(p => (
                                        <option key={p} value={p}>{p.toUpperCase()}</option>
                                    ))}
                                </select>
                                <select
                                    className="px-3 py-1.5 border-2 border-slate-900 rounded-full font-black text-[10px] uppercase tracking-wider bg-card text-foreground outline-none focus:bg-slate-100 cursor-pointer shadow-hard-mini hover:translate-x-0.5 hover:translate-y-0.5"
                                    value={filterWs}
                                    onChange={(e) => setFilterWs(e.target.value)}
                                >
                                    <option value="all">WORKSPACE</option>
                                    {workspaces.map(ws => (
                                        <option key={ws.id} value={ws.id}>{ws.name.toUpperCase()}</option>
                                    ))}
                                </select>
                                <div className="flex flex-wrap gap-2">
                                    <select
                                        className="px-3 py-1.5 border-2 border-slate-900 rounded-full font-black text-[10px] uppercase tracking-wider bg-card text-foreground outline-none focus:bg-slate-100 cursor-pointer shadow-hard-mini hover:translate-x-0.5 hover:translate-y-0.5"
                                        value={filterMonth}
                                        onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                                    >
                                        {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((m, i) => (
                                            <option key={m} value={i}>{m.toUpperCase()}</option>
                                        ))}
                                    </select>
                                    <select
                                        className="px-3 py-1.5 border-2 border-slate-900 rounded-full font-black text-[10px] uppercase tracking-wider bg-card text-foreground outline-none focus:bg-slate-100 cursor-pointer shadow-hard-mini hover:translate-x-0.5 hover:translate-y-0.5"
                                        value={filterYear}
                                        onChange={(e) => setFilterYear(parseInt(e.target.value))}
                                    >
                                        {[2024, 2025, 2026].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Total Views Card */}
                            <div className="bg-card rounded-[16px] border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] overflow-hidden flex flex-col h-[140px] transition-transform hover:-translate-y-1">
                                <div className="h-14 bg-accent px-4 flex items-center gap-3 border-b-[3px] border-slate-900">
                                    <div className="w-8 h-8 bg-card rounded-lg border-2 border-slate-900 flex items-center justify-center shrink-0">
                                        <Eye size={18} className="text-foreground" strokeWidth={2.5} />
                                    </div>
                                    <span className="font-black text-white text-sm uppercase tracking-wider mt-1">Total Views</span>
                                </div>
                                <div className="p-4 flex-1 flex flex-col justify-center bg-card">
                                    <h3 className="text-3xl font-black text-foreground mb-2 leading-none">{formatShortNumber(metricsCurrent.views)}</h3>
                                    {renderMetricCompare(metricsCurrent.views, metricsPrev.views)}
                                </div>
                            </div>

                            {/* Engagement Card */}
                            <div className="bg-card rounded-[16px] border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] overflow-hidden flex flex-col h-[140px] transition-transform hover:-translate-y-1">
                                <div className="h-14 bg-tertiary px-4 flex items-center gap-3 border-b-[3px] border-slate-900">
                                    <div className="w-8 h-8 bg-card rounded-lg border-2 border-slate-900 flex items-center justify-center shrink-0">
                                        <MousePointerClick size={18} className="text-slate-900" strokeWidth={2.5} />
                                    </div>
                                    <span className="font-black text-slate-900 text-sm uppercase tracking-wider mt-1">Engagement</span>
                                </div>
                                <div className="p-4 flex-1 flex flex-col justify-center bg-card">
                                    <h3 className="text-3xl font-black text-foreground mb-2 leading-none">{metricsCurrent.er.toFixed(1)}%</h3>
                                    {renderMetricCompare(metricsCurrent.er, metricsPrev.er)}
                                </div>
                            </div>

                            {/* Published Card */}
                            <div className="bg-card rounded-[16px] border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] overflow-hidden flex flex-col h-[140px] transition-transform hover:-translate-y-1">
                                <div className="h-14 bg-quaternary px-4 flex items-center gap-3 border-b-[3px] border-slate-900">
                                    <div className="w-8 h-8 bg-card rounded-lg border-2 border-slate-900 flex items-center justify-center shrink-0">
                                        <CalendarCheck size={18} className="text-slate-900" strokeWidth={2.5} />
                                    </div>
                                    <span className="font-black text-slate-900 text-sm uppercase tracking-wider mt-1">Published</span>
                                </div>
                                <div className="p-4 flex-1 flex flex-col justify-center bg-card">
                                    <h3 className="text-3xl font-black text-foreground mb-2 leading-none">{metricsCurrent.published}</h3>
                                    {renderMetricCompare(metricsCurrent.published, metricsPrev.published)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Minimalist Analytics Chart */}
                    <div className="bg-white rounded-[32px] border-[3px] border-slate-900 shadow-[0px_8px_0px_#0f172a] p-6 lg:p-8">
                        <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-6 mb-8">
                            <div className="flex items-center gap-3 shrink-0">
                                <TrendingUp size={24} className="text-slate-800" />
                                <h3 className="text-xl font-bold font-heading text-slate-800 whitespace-nowrap">Performance Trend</h3>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {['views', 'likes', 'comments', 'shares', 'interactions'].map((metric) => (
                                    <button
                                        key={metric}
                                        onClick={() => setSelectedMetric(metric)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border-2 transition-all ${selectedMetric === metric
                                            ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                                            : 'bg-card border-slate-200 text-mutedForeground hover:border-slate-400'
                                            }`}
                                    >
                                        {metric === 'interactions' ? 'Total Eng' : metric}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-[250px] min-w-[200px] w-full" style={{ minWidth: 0, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#A855F7" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="formattedDate"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                                        tickFormatter={formatShortNumber}
                                    />
                                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#0f172a', strokeWidth: 2 }} />
                                    <Area
                                        type="monotone"
                                        dataKey={selectedMetric}
                                        stroke="#A855F7"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Distribution Pie Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Status Distribution */}
                        <div className="bg-card rounded-[32px] border-[3px] border-slate-900 shadow-[0px_8px_0px_#0f172a] p-6 lg:p-8 flex flex-col items-center">
                            <div className="flex items-center gap-3 mb-8 self-start">
                                <CheckCircle size={24} className="text-foreground" />
                                <h3 className="text-xl font-bold font-heading text-foreground">Status Distribution</h3>
                            </div>
                            <div className="h-[300px] min-w-[200px] w-full" style={{ minWidth: 0, minHeight: 0 }}>
                                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                    <PieChart>
                                        <Pie
                                            data={statusDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            animationDuration={1500}
                                        >
                                            {statusDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#A855F7', '#34D399', '#FBBF24', '#F43F5E', '#3B82F6'][index % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Pillar Distribution */}
                        <div className="bg-card rounded-[32px] border-[3px] border-slate-900 shadow-[0px_8px_0px_#0f172a] p-6 lg:p-8 flex flex-col items-center">
                            <div className="flex items-center gap-3 mb-8 self-start">
                                <Layers size={24} className="text-foreground" />
                                <h3 className="text-xl font-bold font-heading text-foreground">Content Pillars</h3>
                            </div>
                            <div className="h-[300px] min-w-[200px] w-full" style={{ minWidth: 0, minHeight: 0 }}>
                                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                    <PieChart>
                                        <Pie
                                            data={pillarDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            animationDuration={1500}
                                        >
                                            {pillarDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#FBBF24', '#34D399', '#A855F7', '#3B82F6', '#F43F5E'][index % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>



                    {/* Workspace Gallery */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-6">
                            <Layers size={28} className="text-foreground" strokeWidth={2.5} />
                            <h2 className="text-2xl font-bold font-heading text-foreground">Workspace Gallery</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {workspaces.length === 0 ? (
                                <p className="text-slate-500 font-bold col-span-full">Belum ada workspace yang tersedia.</p>
                            ) : (
                                workspaces.map(ws => (
                                    <div
                                        key={ws.id}
                                        onClick={() => navigate(`/plan/${ws.id}`)}
                                        className="group cursor-pointer bg-card rounded-[32px] border-[3px] border-slate-900 p-6 shadow-[0px_8px_0px_#0f172a] hover:-translate-y-2 hover:shadow-[0px_12px_0px_#0f172a] transition-all flex flex-col relative overflow-hidden h-full min-h-[220px]"
                                    >
                                        {/* Top Section */}
                                        <div className="flex justify-between items-start gap-4 mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-xl md:text-2xl font-black text-slate-900 font-heading leading-tight truncate w-full mb-3" title={ws.name}>
                                                    {ws.name}
                                                </h3>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-slate-900 text-white border-2 border-slate-900 uppercase tracking-widest leading-none">
                                                        {ws.role || 'OWNER'}
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                        GENERAL • {ws.period || 'PERSONAL'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-14 h-14 rounded-2xl border-2 border-slate-900 bg-background flex items-center justify-center shrink-0 p-1 shadow-sm relative z-10 transition-transform group-hover:scale-105">
                                                {ws.logo_url ? <img src={ws.logo_url} className="w-full h-full object-contain" /> : <Layers size={24} className="text-slate-400" />}
                                            </div>
                                        </div>

                                        {/* Middle Section */}
                                        <p className="text-sm font-bold text-slate-500 mb-6 line-clamp-2 leading-relaxed flex-1">
                                            {ws.description || "Workspace ini diperuntukan untuk mencatat semua kegiatan atau event yang ada pada task"}
                                        </p>

                                        {/* Divider */}
                                        <div className="w-full h-[2px] bg-slate-100 mb-5 relative overflow-hidden">
                                            {/* decorative dashed effect */}
                                            <div className="absolute top-0 left-0 w-full border-t-2 border-dashed border-slate-200"></div>
                                        </div>

                                        {/* Bottom Section */}
                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex -space-x-2">
                                                {(ws.members && ws.members.length > 0) ? (
                                                    ws.members.slice(0, 3).map((url: string, i: number) => (
                                                        <img key={i} src={url} className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0 bg-slate-200 object-cover" />
                                                    ))
                                                ) : (
                                                    <>
                                                        <img src="https://ui-avatars.com/api/?name=User+One&background=0f172a&color=fff" className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0 object-cover" />
                                                        <img src="https://ui-avatars.com/api/?name=Tim+A&background=10b981&color=fff" className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0 object-cover" />
                                                    </>
                                                )}
                                                {ws.members && ws.members.length > 3 && (
                                                    <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm font-bold text-[10px] flex items-center justify-center bg-slate-100 text-slate-500 z-10 relative">
                                                        +{ws.members.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-900 text-white flex items-center justify-center group-hover:bg-slate-800 transition-all group-hover:-translate-y-1">
                                                <ArrowUpRight strokeWidth={2.5} size={20} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>

                {/* --- RIGHT DESKTOP COLUMN (4 of 12) --- */}
                <div className="lg:col-span-4 space-y-3 lg:pt-[220px]">

                    {/* Religious Card */}
                    <div className="space-y-2">
                        <div className="bg-slate-900 rounded-[32px] overflow-hidden border-4 border-slate-900 shadow-[0px_8px_0px_#0f172a] relative">
                            {isSelectingReligion ? (
                                <div className="p-6 bg-slate-50 h-full flex flex-col justify-center overflow-y-auto custom-scrollbar">
                                    <Book size={32} className="text-accent mb-4" />
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Quote Harian</h3>
                                    <p className="text-sm font-bold text-slate-500 mb-6">Pilih preferensi Anda untuk menyesuaikan motivasi harian.</p>
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        {Object.keys(RELIGION_CONTENT).map(rel => (
                                            <button
                                                key={rel}
                                                onClick={() => handleSetReligion(rel)}
                                                className={`px-4 py-3 border-2 rounded-xl font-bold transition-colors ${religion === rel ? 'bg-accent text-white border-slate-900' : 'bg-card border-slate-200 text-foreground hover:border-slate-900 hover:bg-slate-500/10'}`}
                                            >
                                                {rel}
                                            </button>
                                        ))}
                                    </div>

                                    {religion === 'Islam' && (
                                        <div className="bg-background p-4 rounded-xl border-2 border-slate-200 mt-2">
                                            <h4 className="font-bold text-sm text-slate-800 mb-2">Lokasi Jadwal Sholat (Opsi Manual)</h4>
                                            <p className="text-xs text-slate-500 mb-3 block">Bila kosong, sistem akan menggunakan lokasi otomatis GPS device Anda.</p>
                                            <div className="space-y-3">
                                                <input
                                                    className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                                                    placeholder="Contoh: Banjarmasin"
                                                    value={manualCity}
                                                    onChange={e => setManualCity(e.target.value)}
                                                />
                                                <select
                                                    className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                                                    value={manualTz}
                                                    onChange={e => setManualTz(e.target.value)}
                                                >
                                                    <option value="WIB">WIB (Waktu Indonesia Barat)</option>
                                                    <option value="WITA">WITA (Waktu Indonesia Tengah)</option>
                                                    <option value="WIT">WIT (Waktu Indonesia Timur)</option>
                                                </select>
                                                <button
                                                    onClick={async () => {
                                                        localStorage.setItem('user_city', manualCity);
                                                        localStorage.setItem('user_tz', manualTz);
                                                        setIsSelectingReligion(false);

                                                        // Save to DB
                                                        const userId = localStorage.getItem('user_id');
                                                        if (userId) {
                                                            await supabase.from('app_users').update({
                                                                city: manualCity,
                                                                timezone: manualTz
                                                            }).eq('id', userId);
                                                        }
                                                    }}
                                                    className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-emerald-700 transition"
                                                >
                                                    Simpan Preferensi Lokasi
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {religion !== 'Islam' && religion !== null && (
                                        <button
                                            onClick={() => setIsSelectingReligion(false)}
                                            className="w-full mt-2 bg-slate-900 text-white font-bold py-3 rounded-lg text-sm hover:bg-slate-800 transition"
                                        >
                                            Kembali ke Dashboard
                                        </button>
                                    )}
                                </div>
                            ) : religion === 'Islam' ? (
                                <div className="bg-gradient-to-br from-[#18B878] to-[#0D9F61] p-6 h-full flex flex-col items-center justify-center text-center text-white min-h-[240px] relative">
                                    <button onClick={() => setIsSelectingReligion(true)} className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
                                        <Settings size={20} />
                                    </button>

                                    <p className="font-bold text-white/90 text-sm md:text-base mb-1">
                                        {nextPrayerState.countdown} menit lagi memasuki waktu
                                    </p>
                                    <h3 className="text-5xl md:text-6xl font-black font-heading mb-2 drop-shadow-sm">{nextPrayerState.name}</h3>
                                    <p className="font-bold text-white/90 text-xs md:text-sm mb-4">
                                        {nextPrayerState.time} {tzLabel} - {cityInfo}
                                    </p>

                                    <div className="w-full h-[1px] bg-white/30 mb-4 max-w-sm"></div>
                                    {dailyQuote && typeof dailyQuote === 'object' ? (
                                        <>
                                            {dailyQuote.arabic && (
                                                <p className="text-2xl md:text-3xl font-bold font-heading mb-3 text-white leading-normal" dir="rtl">
                                                    {dailyQuote.arabic}
                                                </p>
                                            )}
                                            <p className="text-sm md:text-base font-bold italic mb-2 leading-relaxed">
                                                "{dailyQuote.text}"
                                            </p>
                                            <p className="text-xs font-bold text-white/80">
                                                - {dailyQuote.surah} -
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-sm md:text-base font-bold italic mb-2 leading-relaxed">"{String(dailyQuote)}"</p>
                                    )}
                                </div>
                            ) : (
                                <div className={`bg-gradient-to-br ${getReligionStyles(religion)} p-6 h-full flex flex-col items-center justify-center text-center text-white min-h-[220px] relative transition-colors duration-500`}>
                                    <button onClick={() => setIsSelectingReligion(true)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                                        <Settings size={20} />
                                    </button>

                                    <Book size={32} className="text-white/20 mb-4" />

                                    <div className="w-full h-[1px] bg-white/30 mb-4 max-w-sm"></div>

                                    <div className="flex-1 flex flex-col justify-center items-center">
                                        <h3 className="text-xl md:text-2xl font-bold font-heading leading-relaxed italic mb-4 max-w-md drop-shadow-sm">
                                            "{dailyQuote?.text || (typeof dailyQuote === 'string' ? dailyQuote : '')}"
                                        </h3>
                                        <p className="text-sm font-bold text-white/80 bg-black/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                                            - {dailyQuote?.source || 'Motivasi'} -
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Daily Checklist */}
                    <div id="daily-checklist" className="space-y-2">
                        <div className="flex items-center gap-3 mb-1">
                            <CheckCircle size={22} className="text-slate-800" strokeWidth={2.5} />
                            <h2 className="text-lg font-bold font-heading text-slate-800">Checklist</h2>
                        </div>
                        <div className="bg-card rounded-[32px] border-[3px] border-slate-900 p-6 shadow-[0px_8px_0px_#0f172a] flex flex-col min-h-[300px]">
                            <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2 rounded-xl">
                                {checklists.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="w-16 h-16 bg-slate-50 border-2 border-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Check size={24} className="text-slate-300" />
                                        </div>
                                        <p className="text-slate-500 font-bold text-sm">Checklist Anda kosong.<br />Tambahkan tugas hari ini!</p>
                                    </div>
                                ) : (
                                    checklists.map(c => (
                                        <div key={c.id} className="group flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 bg-card transition-colors">
                                            <button onClick={() => toggleChecklist(c.id)} className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${c.done ? 'bg-accent border-accent text-white' : 'border-slate-300 text-transparent'}`}>
                                                <Check size={14} className={c.done ? 'opacity-100' : 'opacity-0'} />
                                            </button>
                                            <p className={`flex-1 font-bold text-sm transition-all ${c.done ? 'text-mutedForeground line-through' : 'text-foreground'}`}>{c.text}</p>
                                            <button onClick={() => deleteChecklist(c.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                            <form onSubmit={addChecklist} className="flex gap-2">
                                <input
                                    className="flex-1 bg-background border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-sm focus:border-accent outline-none transition-colors"
                                    placeholder="Tugas baru..."
                                    value={newChecklist}
                                    onChange={e => setNewChecklist(e.target.value)}
                                />
                                <button type="submit" className="w-12 h-11 bg-slate-900 border-2 border-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-colors shadow-hard-mini shrink-0">
                                    <Plus size={20} />
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Notification Box */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 mb-1">
                            <Bell size={22} className="text-slate-800" strokeWidth={2.5} />
                            <h2 className="text-lg font-bold font-heading text-slate-800">Notifikasi</h2>
                        </div>
                        <div className="bg-card rounded-[32px] border-[3px] border-slate-900 p-6 shadow-[0px_8px_0px_#0f172a] flex flex-col min-h-[300px]">
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="w-16 h-16 bg-slate-50 border-2 border-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Bell size={24} className="text-slate-300" />
                                        </div>
                                        <p className="text-slate-500 font-bold text-sm">Belum ada notifikasi baru.</p>
                                    </div>
                                ) : (
                                    notifications.slice(0, 5).map(n => (
                                        <div
                                            key={n.id}
                                            onClick={() => handleNotificationClick(n)}
                                            className={`group flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${n.is_read ? 'border-slate-100 bg-slate-50 opacity-70' : 'border-slate-200 hover:border-slate-300 bg-card shadow-sm'}`}
                                        >
                                            <div className="shrink-0 relative mt-1">
                                                {n.actor?.avatar_url ? (
                                                    <img src={n.actor.avatar_url} className="w-8 h-8 rounded-full border border-slate-900 object-cover" alt="" />
                                                ) : (
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white border border-slate-900 text-[10px] font-bold ${n.type === 'DEVELOPER_ALERT' ? 'bg-amber-500' : 'bg-accent'}`}>
                                                        {n.type === 'DEVELOPER_ALERT' ? 'DEV' : (n.title?.[0] || 'N')}
                                                    </div>
                                                )}
                                                {!n.is_read && (
                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <p className="text-[9px] font-black uppercase text-accent tracking-widest line-clamp-1">{n.title}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 shrink-0 ml-2">
                                                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <p className="text-xs font-bold text-slate-700 leading-tight line-clamp-2">{n.content}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <Button className="w-full mt-6" variant="outline" size="sm" onClick={() => setShowNotifSidebar(true)}>
                                Lihat Semua <ArrowRight size={14} className="ml-2" />
                            </Button>
                        </div>
                    </div>

                    {/* KPI Targets Preview */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 mb-1">
                            <TrendingUp size={22} className="text-slate-800" strokeWidth={2.5} />
                            <h2 className="text-lg font-bold font-heading text-slate-800">KPI Targets</h2>
                        </div>
                        <div className="bg-card rounded-[32px] border-[3px] border-slate-900 shadow-[0px_8px_0px_#0f172a] p-6">
                            <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl mb-4">
                                <p className="text-xs font-bold text-yellow-800">
                                    Berikut adalah target bulan ini yang terkoneksi pada performa kerja Anda secara personal.
                                </p>
                            </div>
                            <div className="space-y-4">
                                {kpis.length === 0 ? (
                                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl">
                                        <p className="text-sm font-bold text-slate-400">Belum ada target KPI yang diassign untuk profil Anda bulan ini. ✨</p>
                                    </div>
                                ) : (
                                    kpis.map((kpi, idx) => {
                                        const progress = kpi.target_value > 0 ? (kpi.actual_value / kpi.target_value) * 100 : 0;
                                        const isCompleted = kpi.actual_value >= kpi.target_value;
                                        return (
                                            <div key={kpi.id || idx} className="bg-card border-2 border-border/20 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-colors">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="font-black text-slate-800 text-sm truncate pr-4">{kpi.metric_name}</h4>
                                                    <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                        {kpis[idx].actual_value} / {kpis[idx].target_value} {kpi.unit}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-background h-3 rounded-full overflow-hidden border border-slate-200">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-green-500' : 'bg-accent'}`}
                                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <Button className="w-full mt-6" variant="secondary" onClick={() => navigate('/script')}>
                                Lihat Board KPI Saya <ArrowRight size={16} className="ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Sidebar Overlay */}
            {showNotifSidebar && (
                <div className="fixed inset-0 z-[10001] flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setShowNotifSidebar(false)}
                    />

                    {/* Sidebar Content */}
                    <div className="relative w-full max-w-[450px] bg-card h-full border-l-4 border-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out">
                        {/* Header */}
                        <div className="p-6 border-b-2 border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-hard-mini">
                                    <Bell size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Semua Notifikasi</h2>
                                    <p className="text-[10px] font-black text-accent uppercase tracking-widest">{unreadCount} belum dibaca</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowNotifSidebar(false)}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all border-2 border-transparent hover:border-slate-200"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Top Action Bar */}
                        <div className="px-6 py-4 border-b-2 border-slate-50 flex items-center justify-between bg-white">
                            <div className="flex gap-4">
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[10px] font-black uppercase text-slate-600 hover:text-accent transition-colors flex items-center gap-2"
                                >
                                    <CheckCheck size={14} /> Tandai Semua Terbaca
                                </button>
                                <button
                                    onClick={() => {
                                        if (window.confirm('Hapus semua notifikasi permanen?')) {
                                            clearAllNotifications();
                                        }
                                    }}
                                    className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors flex items-center gap-2"
                                >
                                    <Trash2 size={14} /> Hapus Semua
                                </button>
                            </div>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Terbaru</span>
                        </div>

                        {/* Notification List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
                            {notifications.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-12">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
                                        <Bell size={32} className="text-slate-200" />
                                    </div>
                                    <h3 className="text-slate-900 font-black uppercase tracking-tight mb-1">Hening Sekali...</h3>
                                    <p className="text-xs font-bold text-slate-400">Belum ada notifikasi yang masuk untuk Anda saat ini.</p>
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => {
                                            handleNotificationClick(n);
                                        }}
                                        className={`group flex items-start gap-4 p-5 rounded-[24px] border-2 transition-all cursor-pointer relative overflow-hidden ${n.is_read
                                            ? 'border-slate-100 bg-white/50 opacity-60'
                                            : 'border-slate-900 bg-white shadow-hard-mini hover:-translate-y-1'
                                            }`}
                                    >
                                        <div className="shrink-0 relative">
                                            {n.actor?.avatar_url ? (
                                                <img src={n.actor.avatar_url} className="w-12 h-12 rounded-full border-2 border-slate-900 object-cover" alt="" />
                                            ) : (
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white border-2 border-slate-900 font-black text-sm ${n.type === 'DEVELOPER_ALERT' ? 'bg-amber-500' : 'bg-accent'}`}>
                                                    {n.type === 'DEVELOPER_ALERT' ? 'DEV' : (n.title?.[0] || 'N')}
                                                </div>
                                            )}
                                            {!n.is_read && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse shadow-sm"></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-[10px] font-black uppercase text-accent tracking-widest line-clamp-1">{n.title}</p>
                                                <p className="text-[9px] font-black text-slate-400 shrink-0 ml-2 bg-slate-50 px-2 py-0.5 rounded-full">
                                                    {new Date(n.created_at).toLocaleDateString() === new Date().toLocaleDateString()
                                                        ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                        : new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
                                                    }
                                                </p>
                                            </div>
                                            <p className="text-sm font-bold text-slate-700 leading-snug">
                                                {n.content}
                                            </p>

                                            {/* Action Indicator on dark border cards */}
                                            {!n.is_read && (
                                                <div className="mt-3 flex items-center gap-1.5 text-[10px] font-black text-slate-900 uppercase">
                                                    Lihat Detail <ArrowRight size={12} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
