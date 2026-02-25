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
    XCircle,
    AlertCircle,
    Globe,
    ChevronUp,
    Shield,
    Briefcase,
    Users,
    Presentation,
    Power,
    MessageSquare,
    Inbox,
    AlertTriangle
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
import { notifyDevelopers } from '../services/notificationService';

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
alter table public.app_users add column if not exists religion text;
alter table public.app_users add column if not exists city text;
alter table public.app_users add column if not exists timezone text;
alter table public.app_users add column if not exists subscription_package text;

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

-- 8. Table: Global Broadcasts
create table if not exists public.global_broadcasts (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  sender_id uuid references app_users(id),
  title text not null,
  message text not null,
  type text default 'Announcement',
  is_active boolean default true,
  constraint global_broadcasts_pkey primary key (id)
);

-- Enable RLS & Realtime
alter table public.global_broadcasts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Public view for global_broadcasts') then
    create policy "Public view for global_broadcasts" on public.global_broadcasts for select using (true);
  end if;
end $$;
alter publication supabase_realtime add table global_broadcasts;

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

-- 8. Notifications Table (Success feedback for users)
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

-- 9. Developer Inbox (Registration & Renewal)
create table if not exists public.developer_inbox (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  user_id uuid null,
  sender_name text,
  sender_email text,
  sender_username text,
  subscription_code text,
  message text,
  is_read boolean default false,
  is_resolved boolean default false,
  -- Additional columns for Renewal Workflow
  type text default 'registration', -- 'registration' or 'renewal'
  package_name text,
  amount numeric,
  proof_url text,
  duration_days int,
  constraint developer_inbox_pkey primary key (id)
);

-- MIGRATION: Tambahkan kolom baru jika tabel sudah ada (Anti Error)
alter table public.developer_inbox add column if not exists type text default 'registration';
alter table public.developer_inbox add column if not exists package_name text;
alter table public.developer_inbox add column if not exists amount numeric;
alter table public.developer_inbox add column if not exists proof_url text;
alter table public.developer_inbox add column if not exists duration_days int;

-- Fix Not-Null Constraint on subscription_code for renewals
alter table public.developer_inbox alter column subscription_code drop not null;

alter table public.notifications enable row level security;
alter table public.developer_inbox enable row level security;

drop policy if exists "Enable all access" on public.notifications;
drop policy if exists "Enable all access" on public.developer_inbox;

create policy "Enable all access" on public.notifications for all using (true) with check (true);
create policy "Enable all access" on public.developer_inbox for all using (true) with check (true);

-- Enable Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'developer_inbox'
  ) then
    alter publication supabase_realtime add table public.developer_inbox;
  end if;
end
$$;
`;

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>({ id: '1', name: 'Arunika Personal', role: 'Owner' });
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();

    // Global Config
    const { config, loading: configLoading } = useAppConfig();

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

    // Payment Extension State
    const [daysToSubExp, setDaysToSubExp] = useState<number | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showRenewalSuccessModal, setShowRenewalSuccessModal] = useState(false);

    // Broadcast State
    const [activeBroadcast, setActiveBroadcast] = useState<{ id: string, title: string, message: string, type: string } | null>(null);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);

    // Status Modal State
    const [statusModal, setStatusModal] = useState<{
        isOpen: boolean;
        type: 'success' | 'error' | 'confirm';
        message: string;
        title?: string;
        onConfirm?: () => void;
    }>({ isOpen: false, type: 'success', message: '' });

    // Network State
    const [networkStatus, setNetworkStatus] = useState<'good' | 'unstable' | 'bad' | 'offline'>('good');
    const [latency, setLatency] = useState(0);

    // User Profile State
    const [userProfile, setUserProfile] = useState({
        name: localStorage.getItem('user_name') || 'User',
        role: localStorage.getItem('user_role') || 'Member',
        avatar: localStorage.getItem('user_avatar') || 'https://picsum.photos/40/40',
        jobTitle: localStorage.getItem('user_job_title') || '',
        subscriptionPackage: localStorage.getItem('user_subscription_package') || 'Personal'
    });

    // Branding State
    const [branding, setBranding] = useState({
        appName: localStorage.getItem('app_name') || 'Arunika',
        appLogo: localStorage.getItem('app_logo') || '',
        appFavicon: localStorage.getItem('app_favicon') || '',
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

    // 3. Fetch Latest User Profile from Supabase
    const fetchUserProfile = async () => {
        const userId = localStorage.getItem('user_id');
        if (!userId) return;

        try {
            const { data, error } = await supabase.from('app_users').select('full_name, role, avatar_url, job_title, subscription_end, subscription_package').eq('id', userId).single();
            if (data && !error) {
                const profileData = {
                    name: data.full_name || 'User',
                    role: data.role || 'Member',
                    avatar: data.avatar_url || 'https://picsum.photos/40/40',
                    jobTitle: data.job_title || '',
                    subscriptionPackage: data.subscription_package || 'Personal'
                };
                setUserProfile(profileData);

                if (data.subscription_end) {
                    localStorage.setItem('subscription_end', data.subscription_end);
                } else {
                    localStorage.removeItem('subscription_end');
                }

                window.dispatchEvent(new Event('sub_updated'));

                // Keep localStorage in sync
                localStorage.setItem('user_name', profileData.name);
                localStorage.setItem('user_role', profileData.role);
                localStorage.setItem('user_avatar', profileData.avatar);
                localStorage.setItem('user_job_title', profileData.jobTitle);
                localStorage.setItem('user_subscription_package', profileData.subscriptionPackage);
            }
        } catch (err) {
            console.warn("Failed to fetch user profile from DB, using localStorage fallback.");
        }
    };

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

        // Global Config is now managed by AppConfigProvider
        fetchUserProfile();

        // 4. Listen for User Updates (Sync between Profile page and Layout)
        const handleUserUpdate = () => {
            setUserProfile({
                name: localStorage.getItem('user_name') || 'User',
                role: localStorage.getItem('user_role') || 'Member',
                avatar: localStorage.getItem('user_avatar') || 'https://picsum.photos/40/40',
                jobTitle: localStorage.getItem('user_job_title') || '',
                subscriptionPackage: localStorage.getItem('user_subscription_package') || 'Personal'
            });
        };
        window.addEventListener('user_updated', handleUserUpdate);
        window.addEventListener('sub_updated', handleUserUpdate);


        // 5. Global Event Listeners
        const handleOpenPayment = () => setShowPaymentModal(true);
        const handleAppAlert = (e: any) => {
            setStatusModal({
                isOpen: true,
                type: e.detail.type || 'success',
                message: e.detail.message,
                title: e.detail.title
            });
        };
        const handleAppConfirm = (e: any) => {
            setStatusModal({
                isOpen: true,
                type: 'confirm',
                message: e.detail.message,
                title: e.detail.title || 'Konfirmasi',
                onConfirm: e.detail.onConfirm
            });
        };

        window.addEventListener('open-payment-modal', handleOpenPayment);
        window.addEventListener('app-alert', handleAppAlert);
        window.addEventListener('app-confirm', handleAppConfirm);

        return () => {
            clearInterval(interval);
            window.removeEventListener('user_updated', handleUserUpdate);
            window.removeEventListener('sub_updated', handleUserUpdate);
            window.removeEventListener('open-payment-modal', handleOpenPayment);
            window.removeEventListener('app-alert', handleAppAlert);
            window.removeEventListener('app-confirm', handleAppConfirm);
        };

        // 6. Fetch Global Broadcast
        const fetchLatestBroadcast = async () => {
            const { data } = await supabase
                .from('global_broadcasts')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) {
                const seenId = localStorage.getItem('seen_broadcast_id');
                if (seenId !== data.id) {
                    setActiveBroadcast(data);
                    setShowBroadcastModal(true);
                }
            }
        };
        fetchLatestBroadcast();

        // 7. Realtime Listener for New Broadcasts
        const broadcastChannel = supabase
            .channel('global_broadcast_listener')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'global_broadcasts' },
                (payload: any) => {
                    const newMsg = payload.new;
                    if (newMsg.is_active && newMsg.sender_id !== localStorage.getItem('user_id')) {
                        setActiveBroadcast(newMsg);
                        setShowBroadcastModal(true);
                    }
                }
            )
            .subscribe();

        return () => {
            clearInterval(interval);
            window.removeEventListener('user_updated', handleUserUpdate);
            window.removeEventListener('open-payment-modal', handleOpenPayment);
            supabase.removeChannel(broadcastChannel);
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

    // Sync local branding state with global config
    useEffect(() => {
        if (config) {
            setBranding({
                appName: config.app_name || 'Arunika',
                appLogo: config.app_logo || '',
                appFavicon: config.app_favicon || ''
            });
            // Update cache for next refresh
            localStorage.setItem('app_name', config.app_name);
            localStorage.setItem('app_logo', config.app_logo);
            localStorage.setItem('app_favicon', config.app_favicon);
        }
    }, [config]);

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
                        } else {
                            window.dispatchEvent(new Event('sub_updated'));
                        }
                    } else {
                        localStorage.removeItem('subscription_end'); // unlimited
                        window.dispatchEvent(new Event('sub_updated'));
                    }
                }
            )
            .subscribe();

        // 1c. Realtime Listener for Renewal Success Notifications
        const notifChannel = supabase
            .channel('renewal_success_checker')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${currentUserId}` },
                (payload: any) => {
                    if (payload.new.type === 'renewal_success') {
                        setShowRenewalSuccessModal(true);
                        // Refresh profile to get new date
                        fetchUserProfile();
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
        const checkExpiration = async () => {
            const subEnd = localStorage.getItem('subscription_end');
            if (subEnd) {
                const endDate = new Date(subEnd);
                const now = new Date();

                // If past endDate and it's not the exact same calendar day
                if (now > endDate && now.getDate() !== endDate.getDate()) {
                    setShowSubExpiredModal(true);
                    await supabase.from('app_users').update({ is_active: false }).eq('id', currentUserId);
                    localStorage.removeItem('subscription_end'); // prevent looping updates
                    setDaysToSubExp(null);
                } else {
                    const diffTime = endDate.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays <= 5) {
                        setDaysToSubExp(diffDays < 0 ? 0 : diffDays);
                        console.log(`[Subscription] Banner showing! Days left: ${diffDays}`);
                    } else {
                        setDaysToSubExp(null);
                        console.log(`[Subscription] Banner hidden. Days left: ${diffDays} (Target <= 5)`);
                    }
                }
            } else {
                setDaysToSubExp(null);
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
        };

        checkExpiration();
        const subInterval = setInterval(checkExpiration, 15000); // Check every 15 seconds
        window.addEventListener('sub_updated', checkExpiration);

        return () => {
            supabase.removeChannel(userChannel);
            if (tenantChannel) supabase.removeChannel(tenantChannel);
            clearInterval(subInterval);
            window.removeEventListener('sub_updated', checkExpiration);
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

        // Only Developer can save branding
        if (!isDeveloper) {
            alert("Akses ditolak. Halaman ini khusus untuk Developer.");
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
        if (!isDeveloper) return;
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
    const [selectedPackageId, setSelectedPackageId] = useState('');
    const [paymentProof, setPaymentProof] = useState('');
    const [selectedTier, setSelectedTier] = useState<'personal' | 'team'>('personal');
    const [teamSize, setTeamSize] = useState(1);

    useEffect(() => {
        // Sync selectedPackageId with first package from config based on tier
        const getPackages = () => {
            if (selectedTier === 'personal') {
                return config?.payment_config?.personalPackages?.length
                    ? config.payment_config.personalPackages
                    : config?.payment_config?.packages || [];
            }
            return config?.payment_config?.teamPackages || [];
        };

        const pkgs = getPackages();
        if (pkgs.length > 0) {
            // Only auto-select if current selection is not valid for new list or empty
            if (!pkgs.find(p => p.id === selectedPackageId)) {
                setSelectedPackageId(pkgs[0].id);
            }
        } else if (!selectedPackageId) {
            setSelectedPackageId('1-month'); // Legacy fallback
        }
    }, [config, selectedTier]);

    const handlePaymentProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { alert("File terlalu besar (Max 2MB)"); return; }
            const reader = new FileReader();
            reader.onloadend = () => setPaymentProof(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const submitPaymentConfirmation = async () => {
        if (!paymentProof) {
            alert('Harap lampirkan bukti pembayaran.');
            return;
        }

        try {
            const userId = localStorage.getItem('user_id');
            const userEmail = localStorage.getItem('user_email') || ''; // Assuming email is stored, or we can use empty
            const username = localStorage.getItem('user_username') || '';

            // Extract numeric price and duration if available from selectedPackage string
            // selectedPackage format: "Package Name (Rp 150.000)"
            // Extract data from selectedPackageId
            let amount = 0;
            let packageName = '';
            let durationDays = 30;

            const getPackages = () => {
                if (selectedTier === 'personal') {
                    return config?.payment_config?.personalPackages?.length
                        ? config.payment_config.personalPackages
                        : config?.payment_config?.packages || [];
                }
                return config?.payment_config?.teamPackages || [];
            };

            const pkgs = getPackages();
            const pkg = pkgs.find(p => p.id === selectedPackageId);
            if (pkg) {
                amount = pkg.price;
                packageName = `${selectedTier === 'personal' ? 'Personal' : 'Team'}: ${pkg.name}`;
                durationDays = pkg.durationDays || 30;

                // Adjust amount if team tier
                if (selectedTier === 'team') {
                    const rate = pkg.price || config?.payment_config?.teamPricePerPerson || 0;
                    amount = rate * teamSize;
                    packageName = `Team: ${pkg.name} (${teamSize} Orang)`;
                }
            }

            // Hardcoded Fallbacks if config missing or match failed
            if (!packageName) {
                if (selectedPackageId === '1-month') { amount = 150000; packageName = "1 Bulan"; durationDays = 30; }
                else if (selectedPackageId === '3-month') { amount = 400000; packageName = "3 Bulan"; durationDays = 90; }
                else if (selectedPackageId === 'lifetime') { amount = 1500000; packageName = "Lifetime"; durationDays = 36500; }
                else { packageName = selectedPackageId; } // Last resort
            }

            const { error } = await supabase.from('developer_inbox').insert([{
                user_id: userId,
                sender_name: userProfile.name,
                sender_email: userEmail,
                sender_username: username,
                subscription_code: userProfile.subscription_code || '', // Pass current code as fallback
                type: 'renewal',
                package_name: packageName,
                amount: amount,
                proof_url: paymentProof,
                duration_days: durationDays,
                message: `User ${userProfile.name} mengajukan perpanjangan langganan: ${packageName}.`
            }]);

            if (error) throw error;

            await notifyDevelopers({
                title: 'Konfirmasi Pembayaran Baru!',
                content: `${userProfile.name} telah mengirimkan bukti perpanjangan untuk paket ${packageName}.`,
                metadata: { type: 'renewal', user_id: userId, package: packageName }
            });

            setStatusModal({ isOpen: true, type: 'success', message: 'Bukti pembayaran berhasil dikirim! Developer akan segera memproses akun Anda.' });
            setShowPaymentModal(false);
            setPaymentProof('');
        } catch (err) {
            console.error(err);
            setStatusModal({ isOpen: true, type: 'error', message: 'Gagal mengirim konfirmasi. Coba sebentar lagi.' });
        }
    };

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
                <div className="h-auto flex flex-col items-center justify-center px-6 shrink-0 py-8 gap-4">
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
                    {daysToSubExp !== null && daysToSubExp <= 5 && (
                        <div
                            onClick={() => setShowPaymentModal(true)}
                            className="w-full bg-red-500 border-4 border-slate-900 rounded-[24px] p-6 cursor-pointer hover:bg-red-600 transition-all shadow-[8px_8px_0px_#000] mb-8 relative group overflow-hidden"
                        >
                            <div className="relative z-10 text-white">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border-2 border-slate-900 shadow-hard-mini">
                                        <AlertTriangle size={20} className="text-red-600" />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-[0.2em]">Peringatan</span>
                                </div>
                                <h3 className="text-xl font-black leading-tight mb-2">
                                    {daysToSubExp === 0 ? "Hari ini" : `${daysToSubExp} Hari Lagi`} Langganan Habis!
                                </h3>
                                <p className="text-sm font-bold text-white/90 leading-relaxed mb-6">
                                    Segera perpanjang akun Anda agar akses tidak terhenti.
                                </p>
                                <button className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl Lowercase tracking-widest hover:bg-slate-800 transition-all border-2 border-slate-900 shadow-[4px_4px_0px_#fff] active:translate-y-1 active:shadow-none">
                                    Tutup Banner
                                </button>
                            </div>
                        </div>
                    )}
                    {Object.entries(NAV_ITEMS).map(([section, items]) => {
                        const filteredItems = items.filter(item => {
                            if (item.adminOnly && !isAdmin) return false;
                            if (item.developerOnly && !isDeveloper) return false;

                            // Developer bypasses all visual hiding logic to see everything
                            if (isDeveloper) return true;

                            // Package-based visibility restrictions
                            // If user profile package starts with "Personal" or is empty/Free, hide Team Mgmt
                            if (item.id === 'team' && (!userProfile.subscriptionPackage || userProfile.subscriptionPackage.startsWith('Personal') || userProfile.subscriptionPackage === 'Free')) {
                                return false;
                            }

                            // Known core pages that are visible by default unless explicitly hidden
                            const CORE_PAGES = ['dashboard', 'messages', 'plan', 'approval', 'insight', 'carousel', 'kpi', 'team', 'users', 'inbox', 'workspace'];

                            const isHidden = config?.hidden_pages?.includes(item.id);

                            // Safety: While loading for the first time (no cache), 
                            // assume hidden for everything except dashboard to prevent flickering.
                            if (!config && configLoading && item.id !== 'dashboard') return false;

                            if (CORE_PAGES.includes(item.id)) {
                                if (isHidden) return false;
                            } else {
                                // For completely new pages added to NAV_ITEMS later: 
                                // they are HIDDEN by default from non-developers.
                                // The developer must explicitly 'unhide' them in Workspace Settings.
                                // If a new page is NOT in hidden_pages, what does it mean?
                                // Let's consider a new page visible ONLY if it is explicitly NOT hidden
                                // Wait, if it's hidden by default, and `hidden_pages` means hidden, 
                                // then we can't unhide it using `hidden_pages`. 
                                // As a workaround, we treat `hidden_pages` for non-core pages as a WHITELIST if we invert logic,
                                // but the UI uses `includes(id)` as hidden. 
                                // If it's fully new (not in CORE_PAGES) and not explicitly set up in config.page_titles, hide it.
                                if (!config?.page_titles?.[item.id]?.isGlobalVisible) return false;
                            }

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

                    {isDeveloper && (
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

            <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Perpanjang Masa Langganan">
                <div className="p-4 space-y-5">
                    <p className="text-sm text-slate-600 font-bold">Harap lengkapi detail perpanjangan di bawah ini.</p>

                    <div className="flex bg-slate-100 p-1 rounded-2xl border-2 border-slate-200">
                        <button
                            onClick={() => setSelectedTier('personal')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${selectedTier === 'personal' ? 'bg-white text-accent border-2 border-slate-900 shadow-hard-mini' : 'text-slate-500'}`}
                        >
                            <User size={16} /> Personal
                        </button>
                        <button
                            onClick={() => setSelectedTier('team')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${selectedTier === 'team' ? 'bg-white text-secondary border-2 border-slate-900 shadow-hard-mini' : 'text-slate-500'}`}
                        >
                            <Users size={16} /> Team
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Pilih Paket {selectedTier === 'personal' ? 'Personal' : 'Team'}</label>
                        <select
                            className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-accent transition-colors"
                            value={selectedPackageId}
                            onChange={(e) => setSelectedPackageId(e.target.value)}
                        >
                            {(() => {
                                const pkgs = selectedTier === 'personal'
                                    ? (config?.payment_config?.personalPackages?.length ? config.payment_config.personalPackages : (config?.payment_config?.packages || []))
                                    : (config?.payment_config?.teamPackages || []);

                                if (pkgs.length > 0) {
                                    return pkgs.map(pkg => (
                                        <option key={pkg.id} value={pkg.id}>
                                            {pkg.name} (Rp {pkg.price.toLocaleString('id-ID')}{selectedTier === 'team' ? ' / orang' : ''})
                                        </option>
                                    ));
                                }

                                // Fallback for personal
                                if (selectedTier === 'personal') {
                                    return (
                                        <>
                                            <option value="1-month">1 Bulan (Rp 150.000)</option>
                                            <option value="3-month">3 Bulan (Rp 400.000)</option>
                                            <option value="lifetime">Lifetime (Rp 1.500.000)</option>
                                        </>
                                    );
                                }

                                return <option value="">Belum ada paket team tersedia</option>;
                            })()}
                        </select>
                        {selectedTier === 'team' && (config?.payment_config?.teamPackages?.length || 0) === 0 && (
                            <p className="text-[10px] font-bold text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                Saat ini belum ada paket khusus tim. Silakan hubungi admin untuk penawaran khusus.
                            </p>
                        )}
                    </div>

                    {selectedTier === 'team' && (
                        <div className="space-y-3 bg-secondary/5 border-2 border-secondary/20 rounded-2xl p-4 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black text-secondary uppercase tracking-widest">Jumlah Anggota Tim</label>
                                <div className="flex items-center bg-white border-2 border-slate-900 rounded-xl overflow-hidden shadow-hard-mini">
                                    <button
                                        onClick={() => setTeamSize(Math.max(1, teamSize - 1))}
                                        className="w-10 h-10 flex items-center justify-center font-black text-slate-800 hover:bg-slate-100 border-r-2 border-slate-900"
                                    >-</button>
                                    <input
                                        type="number"
                                        value={teamSize}
                                        onChange={(e) => setTeamSize(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-12 h-10 text-center font-black text-slate-800 focus:outline-none"
                                    />
                                    <button
                                        onClick={() => setTeamSize(teamSize + 1)}
                                        className="w-10 h-10 flex items-center justify-center font-black text-slate-800 hover:bg-slate-100 border-l-2 border-slate-900"
                                    >+</button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-secondary/20">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Estimasi Total</span>
                                <span className="font-black text-secondary">
                                    {(() => {
                                        const pkg = config?.payment_config?.teamPackages?.find(p => p.id === selectedPackageId);
                                        const rate = pkg ? pkg.price : (config?.payment_config?.teamPricePerPerson || 0);
                                        return `Rp ${(rate * teamSize).toLocaleString('id-ID')}`;
                                    })()}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5 space-y-3">
                        <div>
                            <h4 className="font-black text-sm text-slate-800">Instruksi Pembayaran</h4>
                            <p className="text-xs font-bold text-slate-500">Kirim pembayaran sesuai paket The Content Flow Anda.</p>
                        </div>
                        <div className="bg-white border-2 border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{config?.payment_config?.bankName || 'Bank BCA'}</p>
                            <p className="text-2xl font-black text-slate-800 font-mono tracking-wider mt-1 mb-1">{config?.payment_config?.accountNumber || '291 102 3456'}</p>
                            <p className="text-xs font-bold text-slate-500">A.N. {config?.payment_config?.accountName || 'PT Arunika Media Integra'}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Bukti Transfer (Screenshot/Foto)</label>
                        <div className="relative group cursor-pointer border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-white transition-colors overflow-hidden">
                            {paymentProof ? (
                                <img src={paymentProof} alt="Bukti" className="w-full h-40 object-cover" />
                            ) : (
                                <div className="p-6 text-center">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-200 mb-3"><Upload className="text-slate-400" size={20} /></div>
                                    <p className="text-xs font-bold text-slate-500">Pilih file gambar atau foto.</p>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={handlePaymentProofUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                    </div>

                    <Button
                        onClick={submitPaymentConfirmation}
                        className="w-full h-14 bg-accent mt-6 shadow-hard-mini"
                        icon={<CheckCircle size={18} />}
                        disabled={!paymentProof}
                    >
                        Konfirmasi Pembayaran
                    </Button>
                </div>
            </Modal>

            <Modal isOpen={showRenewalSuccessModal} onClose={() => setShowRenewalSuccessModal(false)} title="Pembayaran Berhasil">
                <div className="p-8 text-center space-y-4">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-200">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">Selamat!</h2>
                    <p className="text-slate-500 font-bold leading-relaxed">
                        Subscription Anda sudah diperpanjang. Terima kasih telah melakukan pembayaran dan tetap berlangganan layanan kami.
                    </p>
                    <Button onClick={() => setShowRenewalSuccessModal(false)} className="w-full bg-slate-900 mt-4">
                        Tutup
                    </Button>
                </div>
            </Modal>

            <Modal
                isOpen={showBroadcastModal}
                onClose={() => {
                    if (activeBroadcast) {
                        localStorage.setItem('seen_broadcast_id', activeBroadcast.id);
                    }
                    setShowBroadcastModal(false);
                }}
                title={activeBroadcast?.type || 'Pengumuman'}
            >
                <div className="p-6 space-y-4 text-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2 border-4 border-slate-900 shadow-hard-mini ${activeBroadcast?.type === 'Promo' ? 'bg-amber-400' : activeBroadcast?.type === 'Maintenance' ? 'bg-red-400' : 'bg-accent'
                        }`}>
                        <Bell className="text-white" size={32} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 font-heading leading-tight uppercase italic">{activeBroadcast?.title}</h3>
                        <p className="text-slate-500 font-bold mt-2 leading-relaxed">
                            {activeBroadcast?.message}
                        </p>
                    </div>
                    <Button
                        onClick={() => {
                            if (activeBroadcast) {
                                localStorage.setItem('seen_broadcast_id', activeBroadcast.id);
                            }
                            setShowBroadcastModal(false);
                        }}
                        className="w-full h-12 mt-4"
                    >
                        MENGERTI
                    </Button>
                </div>
            </Modal>

            {/* Status Modal */}
            <Modal isOpen={statusModal.isOpen} onClose={() => setStatusModal({ ...statusModal, isOpen: false })} title={statusModal.title || (statusModal.type === 'success' ? 'Sukses' : statusModal.type === 'error' ? 'Gagal' : 'Konfirmasi')}>
                <div className="p-8 text-center space-y-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-900 shadow-hard-mini ${statusModal.type === 'success' ? 'bg-emerald-100 text-emerald-600' : statusModal.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                        {statusModal.type === 'success' ? <CheckCircle size={32} /> : statusModal.type === 'error' ? <XCircle size={32} /> : <AlertTriangle size={32} />}
                    </div>
                    <p className="text-slate-800 font-bold">{statusModal.message}</p>
                    <div className="flex gap-3 pt-4">
                        {statusModal.type === 'confirm' ? (
                            <>
                                <Button onClick={() => setStatusModal({ ...statusModal, isOpen: false })} variant="outline" className="flex-1">Batal</Button>
                                <Button onClick={() => { statusModal.onConfirm?.(); setStatusModal({ ...statusModal, isOpen: false }); }} className="flex-1 bg-slate-900 text-white">Ya, Lanjutkan</Button>
                            </>
                        ) : (
                            <Button onClick={() => setStatusModal({ ...statusModal, isOpen: false })} className="w-full bg-slate-900 text-white mt-4">Tutup</Button>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};