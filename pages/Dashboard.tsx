import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { RELIGION_CONTENT } from './religionData';
import { Button } from '../components/ui/Button';
import { Sun, Moon, Sunset, Sunrise, Bell, Calendar, Plus, Trash2, ArrowRight, CheckCircle, Book, Settings, Clock, Layers, Circle, Check, TrendingUp, ArrowUpRight, Eye, MousePointerClick, CalendarCheck, TrendingDown, X, CheckCheck, Sparkles, Zap, PlusCircle, UserPlus, Heart, MessageSquare, Share2, BarChart3, Layout, Command, Send, Users, User, Quote, Library } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../components/NotificationProvider';
import { useUserPreferences, useTeamKpis, useWorkspaces } from '../src/hooks/useDataQueries';
import { DashboardAddContentModal } from '@/components/DashboardAddContentModal';
import { DashboardAddMissionModal } from '@/components/DashboardAddMissionModal';
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
    if (hour >= 5 && hour < 12) return { text: 'Selamat Pagi', theme: 'border-amber-200 bg-amber-50/10', icon: <Sunrise size={64} className="text-amber-500" />, quote: "Fokus pada kualitas, bukan hanya kecepatan. 🌟" };
    if (hour >= 12 && hour < 15) return { text: 'Selamat Siang', theme: 'border-sky-200 bg-sky-50/10', icon: <Sun size={64} className="text-sky-500" />, quote: "Tetap semangat dan selesaikan tugasmu dengan baik! 💪" };
    if (hour >= 15 && hour < 18) return { text: 'Selamat Sore', theme: 'border-rose-200 bg-rose-50/10', icon: <Sunset size={64} className="text-rose-500" />, quote: "Bagus sekali, waktu yang tepat untuk menyelesaikannya! ☕" };
    return { text: 'Selamat Malam', theme: 'border-indigo-200 bg-indigo-50/10', icon: <Moon size={64} className="text-indigo-500" />, quote: "Beristirahatlah, besok adalah hari yang baru! 🌙" };
};


const ChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-card p-4 border-[3px] border-border shadow-[6px_6px_0px_#0f172a] rounded-[20px] pointer-events-none">
                {label && <p className="text-mutedForeground font-black text-[10px] uppercase tracking-widest mb-2 leading-none border-b-2 border-border/50 pb-1">{label}</p>}
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
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const navigate = useNavigate();
    const { notifications, handleNotificationClick, unreadCount, markAllAsRead, clearAllNotifications } = useNotifications();
    const [showNotifSidebar, setShowNotifSidebar] = useState(false);
    const [isAddContentModalOpen, setIsAddContentModalOpen] = useState(false);
    const [isAddMissionModalOpen, setIsAddMissionModalOpen] = useState(false);
    const userName = localStorage.getItem('user_name') || 'Aditya';
    const userAvatar = localStorage.getItem('user_avatar') || '';
    const userId = localStorage.getItem('user_id');
    const userRole = localStorage.getItem('user_role');
    const subPkg = localStorage.getItem('subscription_package') || 'Free';

    const getPlanDisplay = () => {
        if (userRole === 'Developer') return 'Developer';

        const pkg = subPkg.toLowerCase();
        const isAdmin = (userRole === 'Admin' || userRole === 'Owner');

        if (pkg.includes('team') && isAdmin) return 'Team Admin';
        if (pkg.includes('team') && pkg.includes('personal')) return 'Personal Team';
        if (pkg.includes('team')) return 'Team Plan';
        if (isAdmin) return 'Admin';
        if (pkg.includes('personal')) return 'Personal';
        if (pkg === 'free' || pkg === 'none') return 'Free Member';

        return `${subPkg} Member`;
    };

    const canInviteTeam = () => {
        if (userRole === 'Developer' || userRole === 'Admin' || userRole === 'Owner') return true;
        const pkg = subPkg.toLowerCase();
        if (pkg.includes('team') && !pkg.includes('personal')) return true;
        if (pkg === 'free-team') return true;
        return false;
    };

    // 1. Time Info
    const [timeInfo, setTimeInfo] = useState(getGreetingInfo());

    // Refresh greeting every minute to catch hour changes
    useEffect(() => {
        const timer = setInterval(() => setTimeInfo(getGreetingInfo()), 60000);
        return () => clearInterval(timer);
    }, []);

    // 2. Religion Settings & Prayer Times - Using React Query for caching
    const { data: userPrefs } = useUserPreferences(userId);
    const [religion, setReligion] = useState<string | null>(localStorage.getItem('user_religion'));
    const [isSelectingReligion, setIsSelectingReligion] = useState(!localStorage.getItem('user_religion'));
    const [manualCity, setManualCity] = useState(localStorage.getItem('user_city') || '');
    const [manualTz, setManualTz] = useState(localStorage.getItem('user_tz') || 'WIB');

    const [dailyQuote, setDailyQuote] = useState<any>(null);

    const [prayerData, setPrayerData] = useState<any>(null);
    const [cityInfo, setCityInfo] = useState('Lokasi Anda');
    const [tzLabel, setTzLabel] = useState('WIB');
    const [nextPrayerState, setNextPrayerState] = useState({ name: '-', time: '-', countdown: '-' });

    // Sync preferences from React Query hook
    useEffect(() => {
        if (!userPrefs) return;

        const { religion: dbReligion, city: dbCity, timezone: dbTz } = userPrefs;

        if (dbReligion && dbReligion !== religion) {
            setReligion(dbReligion);
            localStorage.setItem('user_religion', dbReligion);
            setIsSelectingReligion(false);
        }
        if (dbCity && dbCity !== manualCity) {
            setManualCity(dbCity);
            localStorage.setItem('user_city', dbCity);
        }
        if (dbTz && dbTz !== manualTz) {
            setManualTz(dbTz);
            localStorage.setItem('user_tz', dbTz);
        }
    }, [userPrefs]);

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



    // 4. Daily Checklist / Missions
    const [checklists, setChecklists] = useState<{ id: string, text: string, done: boolean, time?: string, notifPref?: string, notified?: boolean }[]>([]);
    const [newChecklist, setNewChecklist] = useState('');

    // 5. KPI Data - Using React Query for caching
    const userFullName = localStorage.getItem('user_name');
    const [memberId, setMemberId] = useState<string | null>(null);

    // First, fetch all team members to get current user's member_id
    useEffect(() => {
        const fetchMemberId = async () => {
            try {
                if (!userFullName && !userAvatar) return;

                const { data: allMembers } = await supabase.from('team_members').select('id, full_name, avatar_url');

                if (allMembers) {
                    const tmData = allMembers.find(m => m.full_name === userFullName || m.avatar_url === userAvatar);
                    if (tmData) setMemberId(tmData.id);
                }
            } catch (err) {
                console.error("Error fetching member ID:", err);
            }
        };
        fetchMemberId();
    }, [userFullName, userAvatar]);

    // Then fetch KPIs using the hook with automatic caching
    const { data: kpis = [] } = useTeamKpis(memberId);

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
        const newList = [...checklists, { id: Date.now().toString(), text: newChecklist, done: false, time: '09:00', notifPref: '15m' }];
        saveChecklists(newList);
        setNewChecklist('');
    };

    const addMission = (mission: { text: string, time: string, notifPref: string }) => {
        const newList = [...checklists, { id: Date.now().toString(), text: mission.text, done: false, time: mission.time, notifPref: mission.notifPref }];
        saveChecklists(newList);

        // Show success alert
        window.dispatchEvent(new CustomEvent('app-alert', {
            detail: { type: 'success', message: `Mission "${mission.text}" ditambahkan!` }
        }));
    };

    const toggleChecklist = (id: string) => {
        const newList = checklists.map(c => c.id === id ? { ...c, done: !c.done } : c);
        saveChecklists(newList);
    };

    const deleteChecklist = (id: string) => {
        const newList = checklists.filter(c => c.id !== id);
        saveChecklists(newList);
    };

    // 6. Mission Notifications Logic
    useEffect(() => {
        if (!checklists.length) return;

        const checkMissions = () => {
            const now = new Date();
            let changed = false;

            const updatedChecklists = checklists.map(mission => {
                if (mission.done || !mission.time || mission.notifPref === 'none' || (mission as any).notified) return mission;

                const [hours, minutes] = mission.time.split(':').map(Number);
                const missionTime = new Date();
                missionTime.setHours(hours, minutes, 0, 0);

                let targetTime = new Date(missionTime);
                if (mission.notifPref === '15m') targetTime.setMinutes(targetTime.getMinutes() - 15);
                else if (mission.notifPref === '30m') targetTime.setMinutes(targetTime.getMinutes() - 30);
                else if (mission.notifPref === '1d') targetTime.setDate(targetTime.getDate() - 1);

                if (now >= targetTime && now < missionTime) {
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification(`Reminder: ${mission.text}`, {
                            body: `Mission kamu akan dimulai pada pukul ${mission.time}. Semangat!`,
                        });
                    }

                    window.dispatchEvent(new CustomEvent('app-alert', {
                        detail: { type: 'info', message: `Reminder: Mission "${mission.text}" mendekati jam task (${mission.time})!` }
                    }));

                    changed = true;
                    return { ...mission, notified: true };
                }
                return mission;
            });

            if (changed) {
                saveChecklists(updatedChecklists);
            }
        };

        const timer = setInterval(checkMissions, 15000);
        checkMissions();
        return () => clearInterval(timer);
    }, [checklists]);

    // Fetch workspaces using React Query for automatic caching
    const { data: workspacesData = [] } = useWorkspaces(userId);
    const workspaces = workspacesData;

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
    const [recentContent, setRecentContent] = useState<any[]>([]);

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (workspaces.length === 0) return;

            const startCurrent = new Date(filterYear, filterMonth, 1);
            const endCurrent = new Date(filterYear, filterMonth + 1, 0, 23, 59, 59);

            const startPrev = new Date(filterYear, filterMonth - 1, 1);
            const endPrev = new Date(filterYear, filterMonth, 0, 23, 59, 59);

            let query = supabase
                .from('content_items')
                .select('id, title, date, metrics, platform, workspace_id, status, pillar, thumbnail_url, updated_at')
                .gte('date', startPrev.toISOString())
                .lte('date', endCurrent.toISOString());

            if (filterWs !== 'all') {
                query = query.eq('workspace_id', filterWs);
            } else {
                const wsIds = workspaces.map(w => w.id);
                query = query.in('workspace_id', wsIds);
            }

            if (filterPlatform !== 'all') query = query.eq('platform', filterPlatform);

            const { data, error } = await query.order('updated_at', { ascending: false });
            if (error) {
                console.error("Error fetching analytics:", error);
                return;
            }
            if (!data) return;

            // Set Recent Content (Pipeline)
            setRecentContent(data.slice(0, 5));

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

    }, [filterWs, filterPlatform, filterMonth, filterYear, workspaces, userId]);

    const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const renderMetricCompare = (current: number, previous: number, isPercent = false) => {
        const growth = calculateGrowth(current, previous);
        const isPositive = growth > 0;
        const isZero = growth === 0;
        const sign = isPositive ? '+' : '';
        const colorClass = isZero ? 'text-mutedForeground' : isPositive ? 'text-emerald-500' : 'text-red-500';
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
        <div className="min-h-screen bg-transparent pb-20 selection:bg-accent/30 selection:text-white">
            {/* ═══════════════════════════════════════════════════════════════════
            MOBILE VIEW (Premium Overhaul)
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="block md:hidden w-full pb-32 animate-in fade-in duration-700 font-sans selection:bg-accent/40 selection:text-white">

                {/* 1. Compact Dynamic Header (Refined Polish) */}
                <header className="px-5 pt-10 pb-28 relative overflow-hidden bg-slate-900 rounded-b-[2.5rem] shadow-hard z-20">
                    <div className="absolute inset-0 bg-[radial-gradient(var(--dot-color)_1.2px,transparent_1.2px)] [background-size:20px:20px] opacity-10" />
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent/40 rounded-full blur-[90px] animate-pulse" />

                    <div className="relative z-10 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">{timeInfo.text}</span>
                            <h1 className="text-4xl font-black font-heading text-white tracking-tight">
                                Halo, <span className="text-white italic">{userName}!</span>
                            </h1>
                            <div className="flex items-center gap-2 mt-3">
                                <span className="px-3 py-1 bg-accent/20 border border-accent/30 rounded-full text-[9px] font-black text-white uppercase tracking-widest backdrop-blur-md">
                                    {getPlanDisplay()}
                                </span>
                            </div>
                        </div>
                        <div className="relative group p-1 bg-white/5 rounded-3xl border-2 border-white/10 backdrop-blur-xl shadow-hard-mini">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-900 group-active:scale-95 transition-transform">
                                {userAvatar ? <img src={userAvatar} className="w-full h-full object-cover" /> : <User className="text-white/40 m-auto h-full" size={32} />}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-hard-mini">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="px-5 -mt-14 space-y-12 relative z-30">

                    {/* 2. Daily Guide Card (Featured Full-width) - (Premium Modal-Sheet Style) */}
                    {religion && !isSelectingReligion && (
                        <section className={`p-7 rounded-[2rem] bg-gradient-to-br ${religion === 'Islam' ? 'from-emerald-600 to-emerald-900 text-white shadow-emerald-500/20' : getReligionStyles(religion) + ' text-slate-900'} border-[4.5px] border-slate-900 shadow-[0_12px_0_0_rgba(15,23,42,1)] relative overflow-hidden group`}>
                            {/* Decorative Notched Handle for Integrated Look */}
                            <div className="flex flex-col items-center mb-6">
                                <div className={`w-12 h-1 ${religion === 'Islam' ? 'bg-white/30' : 'bg-slate-900/10'} rounded-full mb-1`} />
                            </div>

                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.05)_1.5px,transparent_1.5px)] background-size-[18px_18px] opacity-20" />
                            <div className="absolute -right-10 -bottom-10 opacity-10 group-active:scale-110 transition-transform duration-700">
                                {religion === 'Islam' ? <Sunrise size={180} /> : <Book size={180} className="text-slate-900/20" />}
                            </div>

                            <div className="flex justify-between items-center mb-10 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-11 h-11 ${religion === 'Islam' ? 'bg-white/20' : 'bg-slate-900/10'} rounded-2xl flex items-center justify-center backdrop-blur-md border ${religion === 'Islam' ? 'border-white/20' : 'border-slate-900/20'} shadow-hard-mini-accent`}>
                                        {religion === 'Islam' ? <Clock size={20} /> : <Sparkles size={20} className="text-slate-900" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${religion === 'Islam' ? 'text-white/90' : 'text-slate-900/60'}`}>Daily {religion} Assistant</span>
                                        {religion === 'Islam' && (
                                            <span className="text-[9px] font-black opacity-60 uppercase tracking-widest">{cityInfo} • {tzLabel}</span>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setIsSelectingReligion(true)} className={`w-10 h-10 flex items-center justify-center ${religion === 'Islam' ? 'bg-white/10 border-white/20' : 'bg-slate-900/10 border-slate-900/20'} rounded-2xl border backdrop-blur-sm active:rotate-45 transition-transform`}>
                                    <Settings size={16} className="opacity-80" />
                                </button>
                            </div>

                            {religion === 'Islam' && prayerData ? (
                                <div className="space-y-4 relative z-10">
                                    <div>
                                        <h3 className="text-[10px] font-black uppercase text-white/50 tracking-widest mb-1">Mendekati Waktu</h3>
                                        <h2 className="text-5xl font-black font-heading leading-none tracking-tight">{nextPrayerState.name}</h2>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="px-5 py-3 bg-white text-emerald-950 font-black rounded-[1.5rem] text-3xl shadow-lg border-2 border-emerald-400/20">
                                                {nextPrayerState.time}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-white/60 uppercase">Menghitung</span>
                                                <span className="text-lg font-black">{nextPrayerState.countdown} <span className="text-xs opacity-60">MENIT</span></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative z-10 py-2">
                                    <Quote className="text-white/30 mb-5" size={32} />
                                    <p className="text-2xl font-black leading-tight italic">"{dailyQuote?.text || String(dailyQuote || '')}"</p>
                                    <div className="mt-8 flex items-center gap-3">
                                        <div className="h-[2px] w-8 bg-white/30 rounded-full" />
                                        <p className="text-[11px] font-black uppercase tracking-widest opacity-80">{dailyQuote?.source || 'Wisdom of the Day'}</p>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* 3. Primary Portal: Workspaces Carousel (Refined Layout) - (Moved Down) */}
                    <section className="space-y-6">
                        <div className="flex flex-col gap-4 px-1">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black font-heading flex items-center gap-2 text-slate-900">
                                    <Library size={24} className="text-accent" /> Workspace
                                    <span className="text-xs font-bold text-slate-400 ml-1">({workspaces.length})</span>
                                </h3>
                            </div>
                            <button
                                onClick={() => navigate('/plan')}
                                className="w-full text-[11px] font-black text-white bg-slate-900 py-3.5 px-6 rounded-2xl border-2 border-slate-900 shadow-hard-mini uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.97] transition-all"
                            >
                                Lihat Semua Workspace <ArrowUpRight size={14} className="text-accent" />
                            </button>
                        </div>

                        <div className="flex gap-5 overflow-x-auto pb-6 px-1 no-scrollbar -mx-5 pl-5 snap-x snap-mandatory">
                            {workspaces.slice(0, 5).map(ws => (
                                <div key={ws.id} onClick={() => navigate(`/plan/${ws.id}`)} className="min-w-[280px] bg-card border-[3.5px] border-border rounded-[1.8rem] p-8 pt-8 pr-8 shadow-hard active:scale-[0.98] transition-all snap-center relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Layers size={80} className="text-slate-300" />
                                    </div>
                                    <div className="flex justify-between items-start mb-6">
                                        {ws.logo_url ? (
                                            <div className="w-16 h-16 bg-white flex items-center justify-center shrink-0 overflow-hidden group-hover:rotate-6 transition-transform">
                                                <img src={ws.logo_url} className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 rounded-2xl border-[3.5px] border-border bg-card p-2 flex items-center justify-center shadow-hard-mini overflow-hidden group-hover:rotate-6 transition-transform">
                                                <Layers className="text-slate-300" size={24} />
                                            </div>
                                        )}
                                        <div className="flex flex-col items-end">
                                            <span className="text-[8px] font-black text-mutedForeground uppercase tracking-widest bg-muted px-3 py-1 rounded-full border border-border/50">{ws.period || 'Personal'}</span>
                                            <ArrowUpRight size={20} className="text-slate-300 mt-2" />
                                        </div>
                                    </div>
                                    <h4 className="text-2xl font-black font-heading truncate leading-none">{ws.name}</h4>
                                    <div className="flex items-center justify-between mt-8">
                                        <div className="flex -space-x-3">
                                            {ws.members?.slice(0, 3).map((m: any, idx: number) => (
                                                <img key={idx} src={m.includes('/') ? m : `https://ui-avatars.com/api/?name=${m}&background=random&color=fff`} className="w-10 h-10 rounded-full border-[3px] border-card bg-muted object-cover shadow-soft" />
                                            ))}
                                            {ws.members?.length > 3 && (
                                                <div className="w-10 h-10 rounded-full border-[3px] border-card bg-muted flex items-center justify-center text-[10px] font-black text-slate-400">+{ws.members.length - 3}</div>
                                            )}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400">Tap to Enter</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>


                    {/* 4. Glanceable KPI (2x2 Grid Stats) */}
                    <section className="space-y-4">
                        <h3 className="text-xl font-black font-heading px-1 flex items-center gap-2">
                            <BarChart3 size={20} className="text-accent" /> Power Insight
                        </h3>
                        <div className="grid grid-cols-2 gap-5 p-1">
                            {[
                                { title: 'Viral Reach', value: formatShortNumber(metricsCurrent.views), icon: <Eye size={20} />, color: 'bg-sky-500', shadow: 'shadow-sky-500/10' },
                                { title: 'Eng. Power', value: metricsCurrent.er.toFixed(1) + '%', icon: <MousePointerClick size={20} />, color: 'bg-indigo-600', shadow: 'shadow-indigo-500/10' },
                                { title: 'Consistent', value: metricsCurrent.published, icon: <CalendarCheck size={20} />, color: 'bg-emerald-600', shadow: 'shadow-emerald-500/10' },
                                { title: 'Active Day', value: '24/30', icon: <Sparkles size={20} />, color: 'bg-amber-500', shadow: 'shadow-amber-500/10' }
                            ].map((stat, i) => (
                                <div key={i} className={`bg-card border-[3.5px] border-border rounded-[1.8rem] p-6 shadow-hard-mini ${stat.shadow} flex flex-col gap-4 active:scale-95 transition-all`}>
                                    <div className={`w-12 h-12 ${stat.color} text-white rounded-2xl flex items-center justify-center border-2 border-slate-900 shadow-hard-mini`}>
                                        {stat.icon}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-mutedForeground uppercase tracking-wider mb-1 opacity-70">{stat.title}</p>
                                        <h4 className="text-2xl font-black text-foreground">{stat.value}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 5. Today's Journey (Vertical Timeline Pipeline) */}
                    <section className="bg-card border-[3.5px] border-border rounded-[1.8rem] p-8 shadow-hard relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(var(--dot-color)_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <div className="space-y-1">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent font-heading">The Journey</h3>
                                <h2 className="text-2xl font-black font-heading tracking-tight">Today's Pipeline</h2>
                            </div>
                            <Command size={24} className="text-slate-400" />
                        </div>

                        <div className="space-y-0 relative z-10">
                            {recentContent.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 font-bold italic">Belum ada rute konten hari ini...</div>
                            ) : (
                                <div className="space-y-8 relative before:absolute before:left-[23px] before:top-2 before:bottom-2 before:w-[2.5px] before:bg-slate-100 before:dashed">
                                    {recentContent.slice(0, 4).map((item, idx) => (
                                        <div key={item.id} className="flex gap-6 items-start group relative">
                                            <div className={`w-12 h-12 rounded-2xl border-[3px] border-slate-900 z-10 shrink-0 flex items-center justify-center shadow-hard-mini ${item.status === 'Published' ? 'bg-emerald-400' : 'bg-amber-400'}`}>
                                                <span className="text-[10px] font-black text-slate-900">{idx + 1}</span>
                                            </div>
                                            <div className="flex-1 min-w-0 bg-muted/30 p-4 rounded-2xl border-2 border-transparent hover:border-slate-200 transition-colors">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className="text-sm font-black truncate text-foreground leading-tight mb-1">{item.title}</p>
                                                    <span className="text-[8px] font-black text-mutedForeground uppercase tracking-tighter shrink-0">{item.platform}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className={`w-2 h-2 rounded-full ${item.status === 'Published' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                                                    <span className="text-[9px] font-bold text-mutedForeground uppercase opacity-70 tracking-widest">{item.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 6. Mini Analytics Peek (Visual Trend Chart) */}
                    <section className="bg-slate-900 rounded-[1.8rem] p-8 shadow-hard text-white relative overflow-hidden h-[300px]">
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent/80 mb-1">Growth Trend</h3>
                                <h2 className="text-2xl font-black font-heading tracking-tight">Active Analytics</h2>
                            </div>
                            <TrendingUp className="text-emerald-400" size={24} />
                        </div>

                        <div className="absolute inset-x-0 bottom-0 h-[180px] pointer-events-none opacity-50">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData.slice(-7)}>
                                    <defs>
                                        <linearGradient id="mobileTrend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.6} />
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey={selectedMetric} stroke="#8B5CF6" strokeWidth={5} fillOpacity={1} fill="url(#mobileTrend)" animationDuration={3000} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-8 flex items-center gap-4 relative z-10">
                            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10">
                                <p className="text-[9px] font-black opacity-50 uppercase mb-1">{selectedMetric}</p>
                                <p className="text-xl font-black text-accent">{formatShortNumber(metricsCurrent[selectedMetric as keyof typeof metricsCurrent] || 0)}</p>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold opacity-40 leading-relaxed italic">"Performa Anda meningkat 12% dibanding minggu lalu."</p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* FAB: Floating Action Button (Centered Alignment Fix) */}
                <div className="fixed bottom-24 right-6 z-[110] flex flex-col items-center gap-3">
                    <div className="bg-slate-900 text-white text-[9px] font-black uppercase py-2 px-4 rounded-full border-2 border-border shadow-hard-mini animate-bounce whitespace-nowrap text-center">
                        New Post
                    </div>
                    <button
                        onClick={() => setIsAddContentModalOpen(true)}
                        className="w-16 h-16 bg-accent text-white rounded-2xl border-[4px] border-slate-900 shadow-[6px_6px_0px_#0f172a] flex items-center justify-center active:translate-x-1 active:translate-y-1 active:shadow-none transition-all group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <Plus size={32} strokeWidth={4} className="relative z-10" />
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
  DESKTOP VIEW (Bento Command Center)
  ═══════════════════════════════════════════════════════════════════ */}
            <div className="hidden md:block w-full px-8 lg:px-12 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-1000">
                {/* 1. TOP HEADER SECTION */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 bg-card p-10 rounded-[3rem] border-[3.5px] border-border shadow-hard">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="px-4 py-1.5 rounded-full border-[3px] border-border bg-card text-foreground font-black text-[10px] uppercase tracking-[0.2em] shadow-hard-mini">
                                {getPlanDisplay()}
                            </div>
                            <div className="flex items-center gap-2 text-mutedForeground font-bold text-sm bg-muted px-3 py-1 rounded-lg">
                                <Calendar size={14} className="text-accent" /> {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                        </div>
                        <h1 className="text-4xl lg:text-6xl xl:text-7xl font-heading font-black text-foreground leading-tight">
                            {timeInfo.text}, <span className="text-accent">{userName}!</span>
                        </h1>
                        <p className="text-slate-500 font-bold max-w-3xl text-xl leading-relaxed">
                            <Sparkles size={20} className="inline mr-2 text-amber-400 animate-pulse" />
                            "{timeInfo.quote}"
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {[
                            { label: 'Add Daily Mission', icon: <PlusCircle size={22} />, action: () => setIsAddMissionModalOpen(true), color: 'bg-foreground text-background', show: true },
                            { label: 'Papan Ide', icon: <Zap size={22} />, action: () => navigate('/collect-idea'), color: 'bg-card border-[3px] border-border', show: true },
                            { label: 'Undang Tim', icon: <UserPlus size={22} />, action: () => navigate('/admin/team'), color: 'bg-card border-[3px] border-border', show: canInviteTeam() }
                        ].filter(btn => btn.show).map((btn, i) => (
                            <button key={i} onClick={btn.action} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black text-base transition-all hover:-translate-y-2 hover:shadow-hard active:translate-y-0 active:shadow-none ${btn.color} shadow-hard-mini`}>
                                {btn.icon} <span>{btn.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. MAIN BENTO GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* --- LEFT AREA: COMMAND CENTER (9 cols) --- */}
                    <div className="lg:col-span-9 space-y-10">

                        {/* Summary Metrics Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                            {[
                                { title: 'Viral Reach', value: formatShortNumber(metricsCurrent.views), prev: metricsPrev.views, cur: metricsCurrent.views, icon: <Eye size={24} />, color: 'bg-sky-400 text-white border-border shadow-hard-mini' },
                                { title: 'Eng. Power', value: metricsCurrent.er.toFixed(2) + '%', prev: metricsPrev.er, cur: metricsCurrent.er, icon: <MousePointerClick size={24} />, color: 'bg-indigo-500 text-white border-border shadow-hard-mini' },
                                { title: 'Consistency', value: metricsCurrent.published, prev: metricsPrev.published, cur: metricsCurrent.published, icon: <CalendarCheck size={24} />, color: 'bg-emerald-500 text-white border-border shadow-hard-mini' }
                            ].map((card, i) => (
                                <div key={i} className="group bg-card rounded-[3rem] border-[3.5px] border-border shadow-hard hover:shadow-hard-hover transition-all p-8 relative overflow-hidden">
                                    <div className={`w-16 h-16 ${card.color} rounded-[1.5rem] border-[3.5px] flex items-center justify-center mb-6 shadow-hard-mini group-hover:rotate-12 transition-transform`}>
                                        {card.icon}
                                    </div>
                                    <p className="text-[12px] font-black text-mutedForeground uppercase tracking-[0.2em] mb-2">{card.title}</p>
                                    <h3 className="text-4xl lg:text-5xl font-black text-foreground leading-none">{card.value}</h3>
                                    <div className="mt-4">
                                        {renderMetricCompare(card.cur, card.prev)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Chart: The Big Bento Block */}
                        <div className="bg-card rounded-[3.5rem] border-[3.5px] border-border shadow-hard p-10">
                            <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-8 mb-12">
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black font-heading text-foreground flex items-center gap-4">
                                        <BarChart3 className="text-accent w-10 h-10" strokeWidth={2.5} /> Content Growth Trend
                                    </h3>
                                    <p className="text-mutedForeground font-bold text-lg">Visualisasi performa konten berdasarkan metrik terpilih.</p>
                                </div>
                                <div className="flex flex-wrap bg-muted p-2 rounded-[1.5rem] border-[3px] border-border shadow-inner">
                                    {['views', 'likes', 'comments', 'shares', 'interactions'].map((m) => (
                                        <button key={m} onClick={() => setSelectedMetric(m)} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedMetric === m ? 'bg-foreground text-background shadow-lg' : 'text-mutedForeground hover:text-foreground'}`}>
                                            {m === 'interactions' ? 'Eng' : m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#A855F7" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: '800', fill: '#94a3b8' }} minTickGap={30} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: '800', fill: '#94a3b8' }} tickFormatter={formatShortNumber} dx={-10} />
                                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--foreground)', strokeWidth: 3 }} />
                                        <Area type="monotone" dataKey={selectedMetric} stroke="#A855F7" strokeWidth={6} fillOpacity={1} fill="url(#colorValue)" animationDuration={2000} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Bottom Double Bento: Pipeline & Distribution */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                            <div className="bg-card rounded-[3.5rem] border-[3.5px] border-border shadow-hard p-10">
                                <div className="flex items-center justify-between mb-10">
                                    <h3 className="text-2xl font-black font-heading flex items-center gap-4">
                                        <Command className="text-amber-500 w-8 h-8" /> Smart Pipeline
                                    </h3>
                                    <button onClick={() => navigate('/plan')} className="text-sm font-black text-accent hover:underline flex items-center gap-2">View Calendar <ArrowUpRight size={16} /></button>
                                </div>
                                <div className="space-y-6">
                                    {recentContent.length === 0 ? (
                                        <div className="py-20 text-center text-mutedForeground/30 font-bold italic text-lg">No content in pipeline.</div>
                                    ) : recentContent.map(item => (
                                        <div key={item.id} className="group flex items-center gap-6 p-5 rounded-[2rem] border-[3px] border-border transition-all bg-card shadow-hard-mini hover:shadow-hard hover:-translate-y-1">
                                            <div className="w-20 h-16 bg-muted rounded-2xl border-[3px] border-border overflow-hidden shrink-0 group-hover:rotate-2 transition-transform">
                                                {item.thumbnail_url ? <img src={item.thumbnail_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-2xl uppercase">{item.platform?.[0]}</div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-lg font-black truncate text-foreground ">{item.title}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-black text-mutedForeground uppercase tracking-widest">{item.platform}</span>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                    <span className="text-[10px] font-black text-mutedForeground uppercase tracking-widest">{new Date(item.updated_at || item.date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase border-[3px] shadow-hard-mini ${item.status === 'Published' ? 'bg-emerald-400 text-foreground border-border animate-pulse' : 'bg-amber-400 text-foreground border-border'}`}>
                                                {item.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-card rounded-[3.5rem] border-[3.5px] border-border shadow-hard p-10 flex flex-col items-center">
                                <h3 className="text-2xl font-black font-heading self-start mb-10 flex items-center gap-4">
                                    <Layout className="text-emerald-500 w-8 h-8" /> Status Ratio
                                </h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={10} dataKey="value" stroke="none">
                                                {statusDistribution.map((_, index) => <Cell key={index} fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#A855F7'][index % 5]} className="stroke-card stroke-[5px]" />)}
                                            </Pie>
                                            <Tooltip content={<ChartTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-2 gap-x-10 gap-y-4 mt-8">
                                    {statusDistribution.map((d, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-lg border-[3px] border-border" style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#A855F7'][i % 5] }} />
                                            <span className="text-xs font-black text-mutedForeground uppercase tracking-widest">{d.name} <span className="opacity-30 ml-1">{d.value}</span></span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Recent Workspaces Triple Scroll */}
                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-3xl font-black font-heading flex items-center gap-4">
                                    <Send className="text-indigo-500 w-10 h-10 -rotate-12" strokeWidth={3} /> My Power Workspaces
                                </h2>
                                <Button variant="secondary" onClick={() => navigate('/plan')} className="shadow-hard rounded-[1.5rem] px-8 py-6 font-black text-base uppercase tracking-widest border-[3px] border-border">Explore Labs</Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                                {workspaces.slice(0, 6).map(ws => (
                                    <div key={ws.id} onClick={() => navigate(`/plan/${ws.id}`)} className="group bg-card rounded-[3.5rem] border-[3.5px] border-border p-8 shadow-hard hover:shadow-[14px_14px_0px_rgba(15,23,42,0.25)] hover:border-slate-900 transition-all hover:-translate-y-3 cursor-pointer flex flex-col h-full relative overflow-hidden">
                                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-muted rounded-full group-hover:scale-110 transition-transform duration-500" />
                                        <div className="flex justify-between items-start mb-8 relative z-10">
                                            {ws.logo_url ? (
                                                <div className="w-20 h-20 bg-white flex items-center justify-center shrink-0 overflow-hidden group-hover:rotate-6 transition-transform">
                                                    <img src={ws.logo_url} className="w-full h-full object-contain" />
                                                </div>
                                            ) : (
                                                <div className="w-20 h-20 rounded-[2rem] border-[3.5px] border-border bg-card p-2.5 flex items-center justify-center shadow-hard-mini overflow-hidden group-hover:rotate-6 transition-transform">
                                                    <div className="text-4xl font-black text-mutedForeground uppercase">{ws.name?.[0]}</div>
                                                </div>
                                            )}
                                            <div className="px-5 py-2 bg-foreground text-background rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-hard-mini">{ws.period || 'PERSONAL'}</div>
                                        </div>
                                        <h4 className="text-2xl font-black text-foreground font-heading mb-4 group-hover:text-slate-900 transition-colors truncate relative z-10">{ws.name}</h4>
                                        <p className="text-sm font-bold text-slate-500 mb-10 line-clamp-3 leading-relaxed flex-1 relative z-10">{ws.description || "Content Plan Workspace untuk memanajemen konten secara tersistem & maksimal."}</p>
                                        <div className="flex items-center justify-between pt-6 border-t-[3.5px] border-dashed border-border relative z-10">
                                            <div className="flex -space-x-4">
                                                {ws.members?.slice(0, 4).map((m: any, idx: number) => (
                                                    <img key={idx} src={m.includes('/') ? m : `https://ui-avatars.com/api/?name=${m}&background=random&color=fff`} className="w-12 h-12 rounded-full border-[3.5px] border-card bg-muted object-cover shadow-soft" />
                                                ))}
                                                {ws.members && ws.members.length > 4 && <div className="w-12 h-12 rounded-full border-[3.5px] border-card bg-muted text-xs font-black flex items-center justify-center text-mutedForeground z-10 shadow-soft">+{ws.members.length - 4}</div>}
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-foreground text-background flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white group-hover:scale-110 transition-all shadow-hard-mini">
                                                <ArrowUpRight size={22} strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- RIGHT AREA: PRIVATE HUB (3 cols) --- */}
                    <div className="lg:col-span-3 space-y-10">

                        {/* 1. Global Filter Hub */}
                        <div className="bg-card rounded-[3rem] border-[3.5px] border-border p-8 shadow-hard space-y-6">
                            <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-mutedForeground/30">Hub Filter</h4>
                            <div className="grid grid-cols-1 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-mutedForeground ml-2">Platform Focus</label>
                                    <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="w-full bg-muted border-[3px] border-border rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest outline-none focus:bg-card cursor-pointer shadow-hard-mini transition-all">
                                        <option value="all">ALL PLATFORM</option>
                                        {['Instagram', 'Tiktok', 'Youtube', 'LinkedIn', 'Facebook', 'Twitter', 'Threads'].map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-mutedForeground ml-2">Workspace Filter</label>
                                    <select value={filterWs} onChange={(e) => setFilterWs(e.target.value)} className="w-full bg-muted border-[3px] border-border rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest outline-none focus:bg-card cursor-pointer shadow-hard-mini transition-all">
                                        <option value="all">ALL WORKSPACE</option>
                                        {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-mutedForeground ml-2">Month</label>
                                        <select value={filterMonth} onChange={(e) => setFilterMonth(parseInt(e.target.value))} className="w-full bg-muted border-[3px] border-border rounded-2xl px-4 py-4 text-xs font-black uppercase outline-none focus:bg-card cursor-pointer shadow-hard-mini">
                                            {['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'].map((m, i) => <option key={m} value={i}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-mutedForeground ml-2">Year</label>
                                        <select value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))} className="w-full bg-muted border-[3px] border-border rounded-2xl px-4 py-4 text-xs font-black uppercase outline-none focus:bg-card cursor-pointer shadow-hard-mini">
                                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Personalized Insight (Religious/Quote) */}
                        <div className="bg-foreground rounded-[3.5rem] overflow-hidden border-[4px] border-border shadow-hard relative group">
                            {isSelectingReligion ? (
                                <div className="p-10 bg-card h-full space-y-8 animate-in zoom-in-95 duration-300">
                                    <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter">Set Preference</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {Object.keys(RELIGION_CONTENT).map(rel => (
                                            <button key={rel} onClick={() => handleSetReligion(rel)} className={`px-4 py-5 border-[3px] rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${religion === rel ? 'bg-foreground border-foreground text-background shadow-hard' : 'border-border/50 hover:border-foreground'}`}>{rel}</button>
                                        ))}
                                    </div>
                                    <Button className="w-full py-8 text-lg rounded-3xl" variant="outline" onClick={() => setIsSelectingReligion(false)}>Go Back</Button>
                                </div>
                            ) : religion === 'Islam' ? (
                                <div className="bg-gradient-to-br from-[#10B981] via-[#059669] to-[#064E3B] p-10 text-white min-h-[420px] flex flex-col items-center justify-center text-center relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-card/5 rounded-bl-full" />
                                    <button onClick={() => setIsSelectingReligion(true)} className="absolute top-8 right-8 bg-card/10 hover:bg-card/20 p-2 rounded-xl transition-all backdrop-blur-md"><Settings size={20} /></button>
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-6 text-emerald-200 flex items-center gap-2"><Clock size={14} /> Next Prayer</p>
                                    <h3 className="text-6xl font-black font-heading mb-6 drop-shadow-hard">{nextPrayerState.name}</h3>
                                    <div className="bg-black/20 px-6 py-3 rounded-3xl backdrop-blur-xl border border-white/10 shadow-xl">
                                        <p className="font-black text-xl">{nextPrayerState.time} <span className="text-[10px] text-emerald-300 ml-1">{tzLabel}</span></p>
                                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1">In {nextPrayerState.countdown} mins • {cityInfo}</p>
                                    </div>
                                    <div className="w-full h-px bg-card/10 my-10" />
                                    {dailyQuote && typeof dailyQuote === 'object' && (
                                        <div className="space-y-4 animate-in slide-in-from-bottom-2">
                                            <p className="text-lg font-bold italic leading-relaxed">"{dailyQuote.text}"</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300/80 bg-card/5 px-4 py-2 rounded-full inline-block">- {dailyQuote.surah} -</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={`bg-gradient-to-br ${getReligionStyles(religion)} p-10 text-white min-h-[420px] flex flex-col items-center justify-center text-center relative`}>
                                    <button onClick={() => setIsSelectingReligion(true)} className="absolute top-8 right-8 bg-card/10 hover:bg-card/20 p-2 rounded-xl transition-all backdrop-blur-md"><Settings size={20} /></button>
                                    <Book size={60} className="opacity-10 mb-8 animate-bounce-slow" />
                                    <h3 className="text-2xl font-black font-heading italic leading-relaxed mb-8 drop-shadow-md">"{dailyQuote?.text || String(dailyQuote || '')}"</h3>
                                    <div className="bg-black/10 px-6 py-3 rounded-full backdrop-blur-md border border-white/5">
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em]">- {dailyQuote?.source || 'Motivasi'} -</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-card rounded-[3rem] border-[3.5px] border-border shadow-hard p-10">
                            <div className="flex items-center justify-between mb-10">
                                <h3 className="text-2xl font-black font-heading flex items-center gap-4">
                                    <CheckCircle size={28} className="text-foreground" strokeWidth={3} /> Daily Mission
                                </h3>
                                <div className="px-4 py-1.5 bg-foreground text-background rounded-full text-[10px] font-black shadow-hard-mini">{checklists.filter(c => c.done).length}/{checklists.length}</div>
                            </div>
                            <div className="space-y-4 mb-10 max-h-[350px] overflow-y-auto pr-4 custom-scrollbar">
                                {checklists.length === 0 ? (
                                    <div className="py-12 text-center bg-muted rounded-3xl border-2 border-dashed border-slate-200">
                                        <p className="text-xs font-bold text-mutedForeground">Zero tasks today. Relax!</p>
                                    </div>
                                ) : checklists.map(c => (
                                    <div key={c.id} className="flex flex-col group p-4 rounded-3xl hover:bg-muted transition-all border-[3px] border-transparent hover:border-border">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => toggleChecklist(c.id)} className={`w-9 h-9 rounded-xl border-[3.5px] flex items-center justify-center transition-all shadow-hard-mini active:translate-y-0.5 active:shadow-none ${c.done ? 'bg-emerald-400 border-border text-background' : 'bg-card border-border'}`}>
                                                {c.done && <Check size={20} strokeWidth={5} />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-black truncate ${c.done ? 'text-slate-300 line-through' : 'text-foreground'}`}>{c.text}</p>
                                                {c.time && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-[10px] font-black text-mutedForeground">
                                                            <Clock size={10} /> {c.time}
                                                        </div>
                                                        {c.notifPref && c.notifPref !== 'none' && (
                                                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent/10 text-[10px] font-black text-accent">
                                                                <Bell size={10} /> {c.notifPref}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <button onClick={() => deleteChecklist(c.id)} className="opacity-0 group-hover:opacity-100 w-10 h-10 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50 transition-all"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={addChecklist} className="flex gap-3">
                                <input className="flex-1 bg-muted border-[3px] border-border rounded-[1.5rem] px-6 py-4 text-sm font-black outline-none focus:bg-card shadow-hard-mini transition-all" placeholder="New mission..." value={newChecklist} onChange={e => setNewChecklist(e.target.value)} />
                                <button type="submit" className="w-14 h-14 bg-foreground text-background rounded-[1.5rem] flex items-center justify-center shadow-hard hover:scale-110 active:scale-95 transition-all"><Plus size={28} strokeWidth={3} /></button>
                            </form>
                        </div>

                        {/* 5. KPI Live Preview */}
                        <div className="bg-card rounded-[3rem] border-[3.5px] border-border shadow-hard p-10">
                            <h3 className="text-2xl font-black font-heading mb-10 flex items-center gap-4">
                                <TrendingUp size={28} className="text-foreground " strokeWidth={3} /> My KPI Targets
                            </h3>
                            <div className="space-y-8">
                                {kpis.length === 0 ? (
                                    <div className="py-12 text-center bg-muted rounded-3xl border-2 border-dashed border-slate-200 ">
                                        <p className="text-xs font-bold text-mutedForeground">No active KPIs. Keep up the vibe!</p>
                                    </div>
                                ) : kpis.map((kpi, idx) => {
                                    const progress = kpi.target_value > 0 ? (kpi.actual_value / kpi.target_value) * 100 : 0;
                                    const isCompleted = kpi.actual_value >= kpi.target_value;
                                    return (
                                        <div key={kpi.id || idx} className="space-y-3">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <h4 className="font-black text-foreground text-base leading-none mb-2">{kpi.metric_name}</h4>
                                                    <p className="text-[10px] font-black text-mutedForeground uppercase tracking-widest">{kpi.unit} Base Target</p>
                                                </div>
                                                <span className="text-xs font-black bg-foreground text-background px-3 py-1 rounded-lg shadow-hard-mini">
                                                    {kpi.actual_value} / {kpi.target_value}
                                                </span>
                                            </div>
                                            <div className="w-full bg-muted h-6 rounded-2xl overflow-hidden border-[3.5px] border-border p-0.5 shadow-hard-mini">
                                                <div className={`h-full rounded-xl transition-all duration-1000 ${isCompleted ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-blue-400 to-accent'}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <Button className="w-full mt-12 py-8 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.3em]" variant="secondary" onClick={() => navigate('/script')}>View Full Board</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Notification Hub Sidebar Overlay */}
            {showNotifSidebar && (
                <div className="fixed inset-0 z-[10001] flex justify-end">
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setShowNotifSidebar(false)} />
                    <div className="relative w-full max-w-[500px] bg-card h-full border-l-[6px] border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-700 ease-out">
                        <div className="p-10 border-b-[4px] border-border flex items-center justify-between bg-card ">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-foreground text-background flex items-center justify-center shadow-hard"><Bell size={32} /></div>
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter">Activity</h2>
                                    <p className="text-xs font-bold text-accent uppercase tracking-[0.3em]">{unreadCount} UNREAD PULSE</p>
                                </div>
                            </div>
                            <button onClick={() => setShowNotifSidebar(false)} className="w-12 h-12 rounded-2xl flex items-center justify-center text-foreground hover:bg-rose-100 hover:text-rose-600 transition-all border-[3px] border-border shadow-hard-mini hover:shadow-none hover:translate-y-0.5"><X size={32} strokeWidth={3} /></button>
                        </div>
                        <div className="px-10 py-6 border-b-2 border-border/50 flex items-center justify-between bg-muted">
                            <button onClick={markAllAsRead} className="text-[10px] font-black uppercase text-slate-500 hover:text-accent flex items-center gap-2"><CheckCheck size={16} /> Mark All Clear</button>
                            <button onClick={() => window.confirm('Purge all notifications?') && clearAllNotifications()} className="text-[10px] font-black uppercase text-mutedForeground hover:text-red-500 flex items-center gap-2"><Trash2 size={16} /> Purge Hub</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale">
                                    <Bell size={80} className="mb-6" />
                                    <h3 className="text-2xl font-black uppercase tracking-widest">Hub Empty</h3>
                                    <p className="text-xs font-bold">Waiting for new activity...</p>
                                </div>
                            ) : Object.entries(notifications.reduce((acc: any, n) => {
                                const date = new Date(n.created_at).toLocaleDateString();
                                if (!acc[date]) acc[date] = [];
                                acc[date].push(n);
                                return acc;
                            }, {})).map(([date, group]: any) => (
                                <div key={date} className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] whitespace-nowrap">{date}</span>
                                        <div className="h-px w-full bg-slate-100 " />
                                    </div>
                                    {group.map((n: any) => (
                                        <div key={n.id} onClick={() => handleNotificationClick(n)} className={`group relative p-8 rounded-[2.5rem] border-[3.5px] transition-all cursor-pointer overflow-hidden ${n.is_read ? 'bg-muted border-border/50 opacity-50' : 'bg-card border-border shadow-hard hover:-translate-y-2'}`}>
                                            {!n.is_read && <div className="absolute top-0 right-0 w-20 h-20 bg-accent/5 rounded-bl-[4rem]" />}
                                            <div className="flex items-start gap-6 relative z-10">
                                                <div className="shrink-0 relative">
                                                    {n.actor?.avatar_url ? (
                                                        <img src={n.actor.avatar_url} className="w-14 h-14 rounded-2xl border-[3px] border-border object-cover" />
                                                    ) : (
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-background border-[3px] border-border font-black text-xl ${n.type === 'DEVELOPER_ALERT' ? 'bg-amber-500' : 'bg-accent'}`}>
                                                            {n.type === 'DEVELOPER_ALERT' ? 'DEV' : (n.title?.[0] || 'N')}
                                                        </div>
                                                    )}
                                                    {!n.is_read && <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 border-[4px] border-white rounded-full animate-pulse" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <p className="text-[11px] font-black uppercase text-accent tracking-[0.2em]">{n.title}</p>
                                                        <p className="text-[10px] font-bold text-mutedForeground">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                    <p className="text-base font-bold text-foreground leading-snug">{n.content}</p>
                                                    {!n.is_read && <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-foreground uppercase">Inspect Signal <ArrowRight size={14} strokeWidth={3} /></div>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))
                            }
                        </div>
                    </div>
                </div>
            )}

            <DashboardAddContentModal
                isOpen={isAddContentModalOpen}
                onClose={() => setIsAddContentModalOpen(false)}
                workspaces={workspaces}
                onSuccess={() => {
                    // Refetch data is auto-handled by dependency arrays in useEffects
                    window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: 'Konten berhasil ditambahkan ke Planning!' } }));
                }}
            />

            <DashboardAddMissionModal
                isOpen={isAddMissionModalOpen}
                onClose={() => setIsAddMissionModalOpen(false)}
                onSuccess={addMission}
            />
        </div>
    );
};

export default Dashboard;
