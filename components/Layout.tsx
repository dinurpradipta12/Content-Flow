import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    CalendarDays,
    BarChart2,
    Image as ImageIcon,
    PenTool,
    Settings,
    LogOut,
    ChevronDown,
    UserPlus,
    Layers,
    Menu,
    Bell,
    Wifi,
    Upload,
    User,
    Palette,
    Database,
    Code,
    CheckCircle,
    AlertCircle,
    Globe,
    ChevronUp,
    Shield,
    Briefcase,
    Users,
    Presentation,
    Power,
    MessageSquare,
    Inbox
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { Modal } from './ui/Modal';
import { Workspace } from '../types';
import { updateSupabaseConfig, checkConnectionLatency, supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from './NotificationProvider';
import { useAppConfig } from './AppConfigProvider';
import { CheckCircle2 } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

// --- SQL TEMPLATE FOR USER CONVENIENCE ---
const INITIAL_SQL_SCRIPT = `-- Script Update Database (Jalankan di Supabase SQL Editor)

-- 1. Table: Workspaces
create table if not exists public.workspaces (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  name text not null,
  role text null,
  platforms text[] null,
  color text null,
  description text null,
  period text null,
  account_name text null,
  logo_url text null,
  members text[] null,
  invite_code text null,
  constraint workspaces_pkey primary key (id)
);

-- 2. Table: Content Items
create table if not exists public.content_items (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  workspace_id uuid null,
  title text not null,
  pillar text null,
  type text null,
  platform text null,
  status text null,
  priority text null,
  date date null,
  script text null,
  pic text null,
  approval text null,
  content_link text null,
  metrics jsonb null,
  constraint content_items_pkey primary key (id),
  constraint content_items_workspace_id_fkey foreign key (workspace_id) references workspaces (id) on delete cascade
);

-- MIGRATION: Tambahkan kolom metrics jika tabel sudah ada
alter table public.content_items add column if not exists metrics jsonb null;

-- 3. Table: App Users
create table if not exists public.app_users (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  username text not null unique,
  password text not null,
  role text default 'Member',
  full_name text,
  avatar_url text,
  bio text,
  custom_status text,
  job_title text,
  email text,
  constraint app_users_pkey primary key (id)
);

-- MIGRATION: Tambahkan kolom jika tabel sudah ada (Anti Error)
alter table public.app_users add column if not exists job_title text;
alter table public.app_users add column if not exists email text;
alter table public.app_users add column if not exists is_active boolean default true;
alter table public.app_users add column if not exists subscription_start timestamptz default current_timestamp;
alter table public.app_users add column if not exists subscription_end timestamptz;
alter table public.app_users add column if not exists subscription_code text;
alter table public.app_users add column if not exists is_verified boolean default false;

-- Mengubah tipe kolom yang sudah ada jika masih bertipe "date"
alter table public.app_users alter column subscription_start type timestamptz using subscription_start::timestamptz;
alter table public.app_users alter column subscription_end type timestamptz using subscription_end::timestamptz;

-- 4. Table: App Config (Global Branding)
create table if not exists public.app_config (
  id int not null default 1,
  app_name text,
  app_logo text,
  app_favicon text,
  updated_at timestamp with time zone default now(),
  app_version text default 'v1.0.0',
  constraint app_config_pkey primary key (id),
  constraint single_row check (id = 1)
);

alter table public.app_config add column if not exists app_version text default 'v1.0.0';

-- 5. Insert Default Data
-- Superuser (Update jika sudah ada)
insert into public.app_users (username, password, role, full_name, avatar_url, job_title, email)
values ('arunika', 'ar4925', 'Developer', 'Super Admin', 'https://picsum.photos/seed/arunika/200', 'Lead Developer', 'admin@arunika.app')
on conflict (username) do update 
set job_title = excluded.job_title, email = excluded.email;

-- Default Config
insert into public.app_config (id, app_name, app_logo, app_favicon)
values (1, 'Arunika', '', '')
on conflict (id) do nothing;

-- 6. Policies (RLS)
alter table public.workspaces enable row level security;
alter table public.content_items enable row level security;
alter table public.app_users enable row level security;
alter table public.app_config enable row level security;

drop policy if exists "Enable all access" on public.workspaces;
drop policy if exists "Enable all access" on public.content_items;
drop policy if exists "Enable all access" on public.app_users;
drop policy if exists "Enable all access" on public.app_config;

create policy "Enable all access" on public.workspaces for all using (true) with check (true);
create policy "Enable all access" on public.content_items for all using (true) with check (true);
create policy "Enable all access" on public.app_users for all using (true) with check (true);
create policy "Enable all access" on public.app_config for all using (true) with check (true);

-- 7. Team KPI Board Tables
create table if not exists public.team_members (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  user_id uuid null,
  full_name text not null,
  role text default 'Member',
  department text default '',
  avatar_url text default '',
  status text default 'active',
  constraint team_members_pkey primary key (id),
  constraint team_members_user_id_fkey foreign key (user_id) references public.app_users(id) on delete set null
);

create table if not exists public.team_kpis (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  member_id uuid not null,
  metric_name text not null,
  category text default 'General',
  target_value numeric not null default 0,
  actual_value numeric not null default 0,
  unit text default '%',
  period text not null default 'monthly',
  period_date date not null default current_date,
  notes text default '',
  constraint team_kpis_pkey primary key (id),
  constraint team_kpis_member_id_fkey foreign key (member_id) references public.team_members(id) on delete cascade
);

alter table public.team_members enable row level security;
alter table public.team_kpis enable row level security;

drop policy if exists "Enable all access" on public.team_members;
drop policy if exists "Enable all access" on public.team_kpis;

create policy "Enable all access" on public.team_members for all using (true) with check (true);
create policy "Enable all access" on public.team_kpis for all using (true) with check (true);

-- Enable Realtime for live profile sync
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'app_users'
  ) then
    alter publication supabase_realtime add table public.app_users;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

-- 8. Notifications Table
create table if not exists public.notifications (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  recipient_id uuid not null,
  actor_id uuid null,
  workspace_id uuid null,
  type text not null,
  title text not null,
  content text not null,
  is_read boolean default false,
  metadata jsonb null,
  constraint notifications_pkey primary key (id),
  constraint notifications_recipient_id_fkey foreign key (recipient_id) references public.app_users(id) on delete cascade
);

alter table public.notifications enable row level security;
drop policy if exists "Enable all access" on public.notifications;
create policy "Enable all access" on public.notifications for all using (true) with check (true);
`;

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>({ id: '1', name: 'Arunika Personal', role: 'Owner' });
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();

    // Global Config
    const { config } = useAppConfig();

    // Settings State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'integration' | null>('profile');

    // Notification State
    const { notifications, unreadCount, markAsRead, markAllAsRead, handleNotificationClick } = useNotifications();
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationOpen(false);
            }
        };

        if (isNotificationOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isNotificationOpen]);

    // Role & Subscription Notification State
    const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
    const [showSubExpiredModal, setShowSubExpiredModal] = useState(false);

    // Network State
    const [networkStatus, setNetworkStatus] = useState<'good' | 'unstable' | 'bad' | 'offline'>('good');
    const [latency, setLatency] = useState(0);

    // User Profile State
    const [userProfile, setUserProfile] = useState({
        name: localStorage.getItem('user_name') || 'User',
        role: localStorage.getItem('user_role') || 'Member',
        avatar: localStorage.getItem('user_avatar') || 'https://picsum.photos/40/40',
        jobTitle: localStorage.getItem('user_job_title') || ''
    });

    // Branding State
    const [branding, setBranding] = useState({
        appName: 'Arunika',
        appLogo: '',
        appFavicon: '',
    });

    // Integration State
    const [sbConfig, setSbConfig] = useState({
        url: localStorage.getItem('sb_url') || '',
        key: localStorage.getItem('sb_key') || ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- ROLE CHECKERS ---
    const isDeveloper = userProfile.role === 'Developer';
    const isAdmin = userProfile.role === 'Admin' || userProfile.role === 'Owner' || isDeveloper;

    // --- INIT EFFECT ---
    useEffect(() => {
        // 1. Check Network
        const checkNetwork = async () => {
            if (!navigator.onLine) {
                setNetworkStatus('offline');
                return;
            }
            const ms = await checkConnectionLatency();
            setLatency(ms);
            if (ms === -1) setNetworkStatus('offline');
            else if (ms < 300) setNetworkStatus('good');
            else if (ms < 800) setNetworkStatus('unstable');
            else setNetworkStatus('bad');
        };
        checkNetwork();
        const interval = setInterval(checkNetwork, 10000);

        // 2. Fetch Global Branding from Supabase
        const fetchGlobalConfig = async () => {
            try {
                const { data, error } = await supabase.from('app_config').select('*').single();
                if (data && !error) {
                    setBranding({
                        appName: data.app_name || 'Arunika',
                        appLogo: data.app_logo || '',
                        appFavicon: data.app_favicon || ''
                    });
                    // Sync to local storage for backup
                    localStorage.setItem('app_name', data.app_name);
                    localStorage.setItem('app_logo', data.app_logo);
                    localStorage.setItem('app_favicon', data.app_favicon);
                } else {
                    // Fallback to local storage if DB fetch fails or empty
                    setBranding({
                        appName: localStorage.getItem('app_name') || 'Arunika',
                        appLogo: localStorage.getItem('app_logo') || '',
                        appFavicon: localStorage.getItem('app_favicon') || '',
                    });
                }
            } catch (e) {
                console.log("Branding fetch skipped (offline or config missing)");
            }
        };
        fetchGlobalConfig();

        // 3. Fetch Latest User Profile from Supabase
        const fetchUserProfile = async () => {
            const userId = localStorage.getItem('user_id');
            if (!userId) return;

            try {
                const { data, error } = await supabase.from('app_users').select('full_name, role, avatar_url, job_title').eq('id', userId).single();
                if (data && !error) {
                    const profileData = {
                        name: data.full_name || 'User',
                        role: data.role || 'Member',
                        avatar: data.avatar_url || 'https://picsum.photos/40/40',
                        jobTitle: data.job_title || ''
                    };
                    setUserProfile(profileData);

                    // Keep localStorage in sync
                    localStorage.setItem('user_name', profileData.name);
                    localStorage.setItem('user_role', profileData.role);
                    localStorage.setItem('user_avatar', profileData.avatar);
                    localStorage.setItem('user_job_title', profileData.jobTitle);
                }
            } catch (err) {
                console.warn("Failed to fetch user profile from DB, using localStorage fallback.");
            }
        };
        fetchUserProfile();

        // 4. Listen for User Updates (Sync between Profile page and Layout)
        const handleUserUpdate = () => {
            setUserProfile({
                name: localStorage.getItem('user_name') || 'User',
                role: localStorage.getItem('user_role') || 'Member',
                avatar: localStorage.getItem('user_avatar') || 'https://picsum.photos/40/40',
                jobTitle: localStorage.getItem('user_job_title') || ''
            });
        };
        window.addEventListener('user_updated', handleUserUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('user_updated', handleUserUpdate);
        };
    }, []);

    // --- BRANDING EFFECT (Title & Favicon) ---
    useEffect(() => {
        document.title = `${branding.appName} Content Flow`;
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        if (branding.appFavicon) link.href = branding.appFavicon;
        else if (branding.appLogo) link.href = branding.appLogo;
    }, [branding]);

    const mainNavItems = [
        { id: 'dashboard', path: '/', defaultLabel: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'messages', path: '/messages', defaultLabel: 'Messages', icon: <MessageSquare size={20} /> },
        { id: 'plan', path: '/plan', defaultLabel: 'Content Plan', icon: <CalendarDays size={20} /> },
        { id: 'approval', path: '/approval', defaultLabel: 'Approval', icon: <CheckCircle size={20} /> },
        { id: 'insight', path: '/insight', defaultLabel: 'Content Data Insight', icon: <Presentation size={20} /> },
        { id: 'carousel', path: '/carousel', defaultLabel: 'Carousel Maker', icon: <ImageIcon size={20} /> },
        { id: 'kpi', path: '/script', defaultLabel: 'Team KPI Board', icon: <BarChart2 size={20} /> },
    ];

    // Listen for Role & Subscription Changes via Realtime + Local Poll
    useEffect(() => {
        const currentUserId = localStorage.getItem('user_id');
        const tenantId = localStorage.getItem('tenant_id');
        if (!currentUserId) return;

        // 1. Realtime Listener for Current User
        const userChannel = supabase
            .channel('app_users_status_checker')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'app_users', filter: `id=eq.${currentUserId}` },
                async (payload: any) => {
                    const newRole = payload.new.role;
                    const oldRole = localStorage.getItem('user_role');

                    // A. Role check
                    if (newRole && oldRole && newRole !== oldRole) {
                        setShowRoleChangeModal(true);
                    }

                    // B. Active & Sub check
                    if (payload.new.is_active === false) {
                        setShowSubExpiredModal(true);
                    }
                    if (payload.new.subscription_end) {
                        localStorage.setItem('subscription_end', payload.new.subscription_end);
                        if (new Date() > new Date(payload.new.subscription_end)) {
                            // Auto deactivate
                            await supabase.from('app_users').update({ is_active: false }).eq('id', currentUserId);
                            setShowSubExpiredModal(true);
                        }
                    } else {
                        localStorage.removeItem('subscription_end'); // unlimited
                    }
                }
            )
            .subscribe();

        // 1b. Realtime Listener for Admin/Tenant (Auto Logout if Admin Deactivated)
        let tenantChannel: any = null;
        if (tenantId && tenantId !== currentUserId) {
            tenantChannel = supabase
                .channel('app_users_admin_checker')
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'app_users', filter: `id=eq.${tenantId}` },
                    (payload: any) => {
                        if (payload.new.is_active === false) {
                            alert("Sesi berakhir karena Administrator tim Anda telah dinonaktifkan.");
                            localStorage.clear();
                            navigate('/login');
                        }
                    }
                )
                .subscribe();
        }

        // 2. Local Polling for Time-based Expiration & Tenant Check
        const subInterval = setInterval(async () => {
            const subEnd = localStorage.getItem('subscription_end');
            if (subEnd) {
                if (new Date() > new Date(subEnd)) {
                    setShowSubExpiredModal(true);
                    await supabase.from('app_users').update({ is_active: false }).eq('id', currentUserId);
                    localStorage.removeItem('subscription_end'); // prevent looping updates
                }
            }

            // Check Admin Status periodically just in case realtime drops
            if (tenantId && tenantId !== currentUserId) {
                const { data: adminData } = await supabase.from('app_users').select('is_active').eq('id', tenantId).single();
                if (adminData && adminData.is_active === false) {
                    alert("Akses dihentikan: Administrator tim Anda sudah tidak aktif.");
                    localStorage.clear();
                    navigate('/login');
                }
            }

        }, 15000); // Check every 15 seconds

        return () => {
            supabase.removeChannel(userChannel);
            if (tenantChannel) supabase.removeChannel(tenantChannel);
            clearInterval(subInterval);
        };
    }, []);

    // Handlers
    const handleLogout = () => {
        if (confirm('Apakah Anda yakin ingin keluar?')) {
            localStorage.clear();
            navigate('/login');
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        const oldAvatar = localStorage.getItem('user_avatar');
        const newAvatar = userProfile.avatar;

        // 1. Save to LocalStorage
        localStorage.setItem('user_name', userProfile.name);
        localStorage.setItem('user_role', userProfile.role);
        localStorage.setItem('user_avatar', userProfile.avatar);
        localStorage.setItem('user_job_title', userProfile.jobTitle);

        // Trigger event for other components
        window.dispatchEvent(new Event('user_updated'));

        // 2. Persist to Database
        const userId = localStorage.getItem('user_id');
        if (userId) {
            try {
                // A. Update User Table
                const { error } = await supabase.from('app_users').update({
                    full_name: userProfile.name,
                    role: userProfile.role,
                    avatar_url: userProfile.avatar,
                    job_title: userProfile.jobTitle
                }).eq('id', userId);

                if (error) console.warn("Failed to sync profile to DB:", error);

                // B. Sync Avatar to Workspaces (Stack Views)
                if (oldAvatar && newAvatar && oldAvatar !== newAvatar) {
                    // Fetch all workspaces where the old avatar might be in members list
                    const { data: workspaces } = await supabase.from('workspaces').select('id, members');

                    if (workspaces) {
                        for (const ws of workspaces) {
                            if (ws.members && ws.members.includes(oldAvatar)) {
                                // Replace old avatar with new avatar in the array
                                const newMembers = ws.members.map((m: string) => m === oldAvatar ? newAvatar : m);
                                await supabase.from('workspaces').update({ members: newMembers }).eq('id', ws.id);
                            }
                        }
                    }
                }

            } catch (err) {
                console.warn("DB Update Error:", err);
            }
        }
        alert("Profil berhasil diperbarui dan disinkronisasi!");
    };

    const handleSaveBranding = async (e: React.FormEvent) => {
        e.preventDefault();

        // Only Admin/Developer can save branding
        if (!isAdmin) {
            alert("Akses ditolak. Hubungi Administrator.");
            return;
        }

        // 1. Update State & LocalStorage (Optimistic)
        localStorage.setItem('app_name', branding.appName);
        localStorage.setItem('app_logo', branding.appLogo);
        localStorage.setItem('app_favicon', branding.appFavicon);

        // 2. Persist to Global Config Table
        try {
            const { error } = await supabase.from('app_config').upsert({
                id: 1,
                app_name: branding.appName,
                app_logo: branding.appLogo,
                app_favicon: branding.appFavicon
            });
            if (error) throw error;
            alert("Branding Global berhasil diperbarui!");
        } catch (err) {
            console.error(err);
            alert("Gagal menyimpan ke database global. Cek koneksi.");
        }
    };

    const handleSaveIntegration = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdmin) return;
        if (confirm("Menyimpan konfigurasi baru akan me-refresh aplikasi. Lanjutkan?")) {
            updateSupabaseConfig(sbConfig.url, sbConfig.key);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'user' | 'app' | 'favicon') => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1024 * 1024) { alert("File terlalu besar (Max 1MB)"); return; }
            const reader = new FileReader();
            reader.onloadend = () => {
                const res = reader.result as string;
                if (type === 'user') setUserProfile(p => ({ ...p, avatar: res }));
                else if (type === 'app') setBranding(b => ({ ...b, appLogo: res }));
                else if (type === 'favicon') setBranding(b => ({ ...b, appFavicon: res }));
            };
            reader.readAsDataURL(file);
        }
    };

    // UI Helpers
    const getNetworkColor = () => {
        switch (networkStatus) {
            case 'good': return 'text-green-500 bg-green-50 border-green-200';
            case 'unstable': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
            case 'bad': return 'text-red-500 bg-red-50 border-red-200';
            default: return 'text-slate-400 bg-slate-100 border-slate-200';
        }
    };

    const getNetworkLabel = () => {
        switch (networkStatus) {
            case 'good': return 'Live Sync';
            case 'unstable': return 'Unstable';
            case 'bad': return 'Bad Conn.';
            default: return 'Offline';
        }
    };

    const toggleTab = (tab: 'profile' | 'branding' | 'integration') => {
        setActiveTab(activeTab === tab ? null : tab);
    };

    type NavItem = {
        id: string;
        path: string;
        label: string;
        icon: React.ElementType;
        badge?: number | null;
        adminOnly?: boolean;
        developerOnly?: boolean;
    };

    const NAV_ITEMS: Record<string, NavItem[]> = {
        'Work Station': [
            { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'messages', path: '/messages', label: 'Messages', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : null },
            { id: 'plan', path: '/plan', label: 'Content Plan', icon: CalendarDays },
            { id: 'approval', path: '/approval', label: 'Team Approval System', icon: CheckCircle },
            { id: 'insight', path: '/insight', label: 'Content Data Insight', icon: Presentation },
            { id: 'carousel', path: '/carousel', label: 'Aruneeka Carousel', icon: ImageIcon },
            { id: 'kpi', path: '/script', label: 'Team KPI Board', icon: BarChart2 },
        ],
        'Admin Zone': [
            { id: 'team', path: '/admin/team', label: 'Team Mgmt', icon: Briefcase, adminOnly: true },
        ],
        'Superuser': [
            { id: 'users', path: '/admin/users', label: 'User Management', icon: Users, developerOnly: true },
            { id: 'inbox', path: '/admin/inbox', label: 'Developer Inbox', icon: Inbox, developerOnly: true },
            { id: 'workspace', path: '/admin/workspace', label: 'Workspace Settings', icon: Settings, developerOnly: true },
        ]
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background relative">
            {/* Sidebar (Fixed position always) */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r-2 border-slate-200 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="h-auto flex items-center justify-center px-6 shrink-0 py-8">
                    <div className="flex items-center justify-center w-full">
                        {config?.app_logo || branding.appLogo ? (
                            <img src={config?.app_logo || branding.appLogo} className="w-full max-h-24 object-contain" alt="Logo" />
                        ) : (
                            <div className="w-16 h-16 bg-accent rounded-xl border-2 border-slate-800 flex items-center justify-center mx-auto shadow-hard">
                                <Layers className="text-white" size={32} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-4 custom-scrollbar">
                    {Object.entries(NAV_ITEMS).map(([section, items]) => {
                        const filteredItems = items.filter(item => {
                            if (item.adminOnly && !isAdmin) return false;
                            if (item.developerOnly && !isDeveloper) return false;
                            return true;
                        });
                        if (filteredItems.length === 0) return null;
                        return (
                            <div key={section} className="mb-8 font-heading">
                                <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{section}</h3>
                                <div className="space-y-1">
                                    {filteredItems.map((item) => (
                                        <button
                                            key={item.path}
                                            onClick={() => navigate(item.path)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${location.pathname === item.path ? 'bg-accent text-white shadow-hard-mini translate-x-1' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon size={20} className={location.pathname === item.path ? 'text-white' : 'group-hover:text-accent transition-colors'} />
                                                <span className="font-bold text-sm tracking-tight">{item.label}</span>
                                            </div>
                                            {item.badge && (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${location.pathname === item.path ? 'bg-white text-accent' : 'bg-accent text-white'}`}>{item.badge}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 mt-auto border-t-2 border-slate-50 shrink-0">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all font-bold text-sm">
                        <LogOut size={20} /> Sign Out
                    </button>
                    <p className="text-xs text-slate-400 font-bold text-center mt-4">v{config?.app_version || '1.0.0'} {config?.app_name || branding.appName}</p>
                </div>
            </aside>

            {/* Main Wrapper - Uses padding left instead of flex width sharing */}
            <div className={`flex flex-col h-screen overflow-hidden transition-[padding] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] w-full min-w-0 ${isSidebarOpen ? 'md:pl-72' : 'pl-0'}`}>
                <header className="mt-4 shrink-0 z-30 mx-4 md:mx-6 mb-2 h-16 bg-white rounded-2xl border-2 border-slate-800 shadow-hard flex items-center justify-between px-4 transition-all max-w-full">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors shrink-0"><Menu size={20} /></button>
                        {!isSidebarOpen && <h1 className="font-heading font-extrabold text-xl text-accent tracking-tight shrink-0 truncate">{branding.appName}</h1>}
                    </div>

                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-colors ${getNetworkColor()}`}>
                                <Wifi size={14} className={networkStatus === 'unstable' ? 'animate-pulse' : ''} />
                                <span className="hidden sm:inline">{getNetworkLabel()}</span>
                            </div>
                            <div className="flex items-center gap-1 relative" ref={notificationRef}>
                                <button onClick={() => setIsNotificationOpen(!isNotificationOpen)} className={`p-2 rounded-full transition-all relative ${isNotificationOpen ? 'text-accent bg-accent/5' : 'text-slate-500 hover:text-accent hover:bg-slate-50'}`}>
                                    <Bell size={18} />
                                    {unreadCount > 0 && <span className="absolute top-1.5 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[9px] text-white flex items-center justify-center font-black">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                                </button>
                                {isNotificationOpen && (
                                    <div className="absolute top-full right-0 mt-3 w-[400px] bg-white border-2 border-slate-800 shadow-hard rounded-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-6 py-4 border-b-2 border-slate-100 flex items-center justify-between bg-slate-50/50">
                                            <div className="flex items-center gap-2"><Bell size={16} className="text-accent" /><span className="font-black font-heading text-slate-800 tracking-tight text-lg">Notifikasi</span></div>
                                            {unreadCount > 0 && <button onClick={(e) => { e.stopPropagation(); markAllAsRead(); }} className="text-[10px] font-black text-accent hover:underline uppercase tracking-widest bg-accent/10 px-3 py-1.5 rounded-lg">Tandai Semua Dibaca</button>}
                                        </div>
                                        <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                                            {notifications.length === 0 ? (
                                                <div className="py-12 flex flex-col items-center justify-center text-slate-400"><Bell size={40} className="opacity-10 mb-3" /><p className="font-bold text-sm">Tidak ada notifikasi</p></div>
                                            ) : (
                                                <div className="divide-y divide-slate-50">
                                                    {notifications.map((notif) => (
                                                        <div key={notif.id} className={`p-4 flex gap-3 transition-colors hover:bg-slate-50 cursor-pointer relative ${!notif.is_read ? 'bg-accent/5' : ''}`} onClick={() => { handleNotificationClick(notif); setIsNotificationOpen(false); }}>
                                                            {!notif.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent"></div>}
                                                            <div className="shrink-0">
                                                                {notif.actor?.avatar_url ? <img src={notif.actor.avatar_url} alt="" className="w-10 h-10 rounded-full border border-slate-200 object-cover" /> : <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200"><User size={18} /></div>}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start mb-0.5"><h5 className="font-black text-[9px] text-accent uppercase tracking-widest truncate pr-2">{notif.title}</h5><span className="text-[9px] text-slate-400 font-medium">{new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div>
                                                                <p className="text-xs font-bold text-slate-600 leading-snug"><span className="text-slate-900">{notif.actor?.full_name}</span> {notif.content}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-all"><Settings size={18} /></button>
                        </div>

                        <div className="h-6 w-[2px] bg-slate-100"></div>
                        <div className="flex items-center gap-3 pl-1 cursor-pointer group" onClick={() => navigate('/profile')}>
                            <div className="text-right hidden md:block">
                                <p className="font-bold text-xs text-slate-800 leading-tight group-hover:text-accent transition-colors">{userProfile.name}</p>
                                <p className="text-[10px] text-slate-500 font-medium">{userProfile.jobTitle || userProfile.role}</p>
                            </div>
                            <div className="relative">
                                <img src={userProfile.avatar} alt="User" className="w-9 h-9 rounded-full border-2 border-slate-200 group-hover:border-accent transition-colors object-cover" />
                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 flex flex-col p-4 md:px-6 md:py-8 md:pb-8 pb-20 overflow-y-auto overflow-x-hidden custom-scrollbar min-h-0 bg-background w-full">
                    <div className="animate-bounce-in flex-1 min-h-0 flex flex-col w-full max-w-full">
                        {children}
                    </div>
                </main>
            </div>

            {/* --- MODALS --- */}
            <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Pengaturan Aplikasi">
                <div className="space-y-4">
                    <div className={`rounded-xl border-2 border-slate-800 overflow-hidden shadow-hard transition-all duration-300 ${activeTab === 'profile' ? 'bg-white' : 'bg-white hover:bg-slate-50'}`}>
                        <button onClick={() => toggleTab('profile')} className={`w-full flex items-center justify-between p-4 font-black font-heading text-lg transition-colors ${activeTab === 'profile' ? 'bg-accent text-white' : 'text-slate-800'}`}>
                            <div className="flex items-center gap-3"><User size={20} className={activeTab === 'profile' ? 'text-white' : 'text-accent'} /> Informasi Pengguna</div>
                            {activeTab === 'profile' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                        {activeTab === 'profile' && (
                            <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-300">
                                <form onSubmit={handleSaveProfile} className="space-y-5">
                                    <div className="flex items-center gap-6">
                                        <div className="relative group cursor-pointer w-20 h-20 rounded-full overflow-hidden border-2 border-slate-800 bg-slate-50 shadow-sm">
                                            <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Upload className="text-white" size={20} /></div>
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload(e, 'user')} />
                                        </div>
                                        <div className="flex-1"><h4 className="font-bold text-lg text-slate-800">Foto Profil</h4><p className="text-sm text-slate-500">Klik avatar untuk mengganti.</p></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input label="Nama Lengkap" value={userProfile.name} onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })} />
                                        <Input label="Jabatan" value={userProfile.jobTitle} onChange={(e) => setUserProfile({ ...userProfile, jobTitle: e.target.value })} />
                                    </div>
                                    <div className="flex flex-col gap-1 w-full">
                                        <label className="font-bold text-xs text-slate-600 ml-1">Role Aplikasi</label>
                                        <select className="w-full bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none transition-all focus:border-accent" value={userProfile.role} onChange={(e) => setUserProfile({ ...userProfile, role: e.target.value })} disabled={!isAdmin && userProfile.role !== 'Developer'}>
                                            <option value="Member">Member</option><option value="Admin">Admin</option><option value="Owner">Owner</option><option value="Developer">Developer</option>
                                        </select>
                                    </div>
                                    <div className="pt-2 flex justify-end"><Button type="submit" className="bg-accent" icon={<CheckCircle size={16} />}>Simpan Profil</Button></div>
                                </form>
                            </div>
                        )}
                    </div>

                    {isAdmin && (
                        <>
                            <div className={`rounded-xl border-2 border-slate-800 overflow-hidden shadow-hard transition-all duration-300 ${activeTab === 'branding' ? 'bg-white' : 'bg-white hover:bg-slate-50'}`}>
                                <button onClick={() => toggleTab('branding')} className={`w-full flex items-center justify-between p-4 font-black font-heading text-lg transition-colors ${activeTab === 'branding' ? 'bg-secondary text-white' : 'text-slate-800'}`}>
                                    <div className="flex items-center gap-3"><Palette size={20} className={activeTab === 'branding' ? 'text-white' : 'text-secondary'} /> Tampilan Aplikasi (Admin)</div>
                                    {activeTab === 'branding' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                {activeTab === 'branding' && (
                                    <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-300">
                                        <form onSubmit={handleSaveBranding} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="flex flex-col gap-2">
                                                    <label className="font-bold text-sm text-slate-600">Logo Sidebar</label>
                                                    <div className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-white transition-colors relative cursor-pointer group">
                                                        <div className="w-14 h-14 bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center p-2">{branding.appLogo ? <img src={branding.appLogo} alt="Logo" className="w-full h-full object-contain" /> : <Layers className="text-slate-300" size={24} />}</div>
                                                        <div><p className="font-bold text-slate-700 text-sm">Upload PNG</p></div>
                                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload(e, 'app')} />
                                                    </div>
                                                </div>
                                            </div>
                                            <Input label="Nama Aplikasi" value={branding.appName} onChange={(e) => setBranding({ ...branding, appName: e.target.value })} />
                                            <div className="pt-2 flex justify-end"><Button type="submit" className="bg-secondary" icon={<CheckCircle size={16} />}>Simpan Global</Button></div>
                                        </form>
                                    </div>
                                )}
                            </div>
                            <div className={`rounded-xl border-2 border-slate-800 overflow-hidden shadow-hard transition-all duration-300 ${activeTab === 'integration' ? 'bg-white' : 'bg-white hover:bg-slate-50'}`}>
                                <button onClick={() => toggleTab('integration')} className={`w-full flex items-center justify-between p-4 font-black font-heading text-lg transition-colors ${activeTab === 'integration' ? 'bg-tertiary text-slate-800' : 'text-slate-800'}`}>
                                    <div className="flex items-center gap-3"><Database size={20} className={activeTab === 'integration' ? 'text-slate-800' : 'text-tertiary'} /> Database & API (Admin)</div>
                                    {activeTab === 'integration' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                {activeTab === 'integration' && (
                                    <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-300">
                                        <form onSubmit={handleSaveIntegration} className="space-y-4">
                                            <Input label="Supabase Project URL" value={sbConfig.url} onChange={(e) => setSbConfig({ ...sbConfig, url: e.target.value })} />
                                            <Input label="Supabase Anon Key" value={sbConfig.key} onChange={(e) => setSbConfig({ ...sbConfig, key: e.target.value })} type="password" />
                                            <div className="flex justify-end"><Button type="submit" className="bg-tertiary text-slate-800" icon={<CheckCircle size={16} />}>Update Koneksi</Button></div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            <Modal isOpen={showRoleChangeModal} onClose={() => { }} title="Pemberitahuan Sistem">
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-2"><Shield className="w-8 h-8" /></div>
                    <h3 className="text-xl font-bold text-slate-800">Perubahan Akses</h3>
                    <p className="text-slate-500 text-sm">Role Anda telah berubah. Silakan login ulang.</p>
                    <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="w-full px-6 py-3 bg-slate-800 text-white font-bold rounded-xl border-2 border-slate-900 shadow-hard">Login Ulang</button>
                </div>
            </Modal>

            <Modal isOpen={showSubExpiredModal} onClose={() => { }} title="Akses Ditangguhkan">
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-2"><Power className="w-8 h-8" /></div>
                    <h3 className="text-xl font-bold text-slate-800">Akses Terhenti</h3>
                    <p className="text-slate-500 text-sm">Masa aktif subscription habis.</p>
                    <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="w-full px-6 py-3 bg-red-500 text-white font-bold rounded-xl border-2 border-red-700 shadow-hard">Keluar</button>
                </div>
            </Modal>
        </div>
    );
};