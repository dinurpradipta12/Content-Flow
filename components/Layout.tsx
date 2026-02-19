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
  Presentation
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { Modal } from './ui/Modal';
import { Workspace } from '../types';
import { updateSupabaseConfig, checkConnectionLatency, supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

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

-- 4. Table: App Config (Global Branding)
create table if not exists public.app_config (
  id int not null default 1,
  app_name text,
  app_logo text,
  app_favicon text,
  updated_at timestamp with time zone default now(),
  constraint app_config_pkey primary key (id),
  constraint single_row check (id = 1)
);

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
`;

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>({ id: '1', name: 'Arunika Personal', role: 'Owner' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'integration' | null>('profile');

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
    
    // 3. Listen for User Updates (Sync between Profile page and Layout)
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
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/plan', label: 'Content Plan', icon: <CalendarDays size={20} /> },
    { path: '/analysis', label: 'Analisa Konten', icon: <BarChart2 size={20} /> },
    { path: '/insight', label: 'Content Data Insight', icon: <Presentation size={20} /> },
    { path: '/carousel', label: 'Carousel Maker', icon: <ImageIcon size={20} /> },
    { path: '/script', label: 'Script Creator', icon: <PenTool size={20} /> },
  ];

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
              if (type === 'user') setUserProfile(p => ({...p, avatar: res}));
              else if (type === 'app') setBranding(b => ({...b, appLogo: res}));
              else if (type === 'favicon') setBranding(b => ({...b, appFavicon: res}));
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

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r-2 border-slate-200 transform transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Area */}
        <div className="h-24 flex items-center px-6 border-b-2 border-slate-100 shrink-0">
          <div className="flex items-center gap-3 w-full">
            {branding.appLogo ? (
                 <img src={branding.appLogo} className="w-10 h-10 object-contain shrink-0" alt="Logo" />
            ) : (
                <div className="w-10 h-10 bg-tertiary rounded-full border-2 border-slate-800 flex items-center justify-center flex-shrink-0">
                  <Layers size={20} className="text-slate-800" />
                </div>
            )}
            <h1 className="font-heading font-extrabold text-xl text-accent tracking-tight leading-tight">
              <span className="block">{branding.appName}</span>
              <span className="block text-slate-800">Content Flow.</span>
            </h1>
          </div>
        </div>

        {/* Workspace Switcher */}
        <div className="px-6 pt-6 pb-2 shrink-0">
          <div className="relative group">
            <button className="w-full flex items-center justify-between bg-muted border-2 border-transparent hover:border-slate-300 p-3 rounded-xl transition-all">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center text-white font-bold border-2 border-slate-800 flex-shrink-0">
                  {currentWorkspace.name.charAt(0)}
                </div>
                <div className="text-left truncate">
                  <p className="text-sm font-bold text-slate-800 leading-tight truncate">{currentWorkspace.name}</p>
                  <p className="text-xs text-slate-500">{currentWorkspace.role}</p>
                </div>
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </button>
            <div className="hidden group-hover:block absolute top-full left-0 w-full bg-white border-2 border-slate-200 rounded-xl shadow-hard mt-2 p-2 z-50">
              <button className="w-full text-left p-2 hover:bg-transparent hover:text-slate-900 rounded-lg text-sm font-medium transition-colors">Arunika Business</button>
              <button className="w-full text-left p-2 hover:bg-transparent hover:translate-x-1 rounded-lg text-sm font-medium text-accent flex items-center gap-2 transition-transform">
                <UserPlus size={14} /> Buat Workspace
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="px-2 pt-4 pb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 pb-1 mb-2">Work Station</p>
          </div>
          {mainNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200
                ${isActive 
                  ? 'bg-accent text-white shadow-hard border-2 border-slate-800 translate-x-1' 
                  : 'text-slate-600 hover:bg-transparent hover:text-slate-900 hover:translate-x-1'}
              `}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="px-2 pt-6 pb-2">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 pb-1 mb-2">Admin Zone</p>
              </div>
              <NavLink to="/admin/team" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 ${isActive ? 'bg-secondary text-white shadow-hard border-2 border-slate-800' : 'text-slate-600 hover:text-secondary hover:translate-x-1'}`}>
                <Briefcase size={20} /> Team Mgmt
              </NavLink>
               <NavLink to="/admin/workspace" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 ${isActive ? 'bg-secondary text-white shadow-hard border-2 border-slate-800' : 'text-slate-600 hover:text-secondary hover:translate-x-1'}`}>
                <Settings size={20} /> Workspace Settings
              </NavLink>
            </>
          )}

          {isDeveloper && (
            <>
              <div className="px-2 pt-6 pb-2">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-100 pb-1 mb-2">Superuser</p>
              </div>
              <NavLink to="/admin/users" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 ${isActive ? 'bg-slate-800 text-white shadow-hard border-2 border-slate-800' : 'text-slate-600 hover:text-slate-900 hover:translate-x-1'}`}>
                <Users size={20} /> User Management
              </NavLink>
            </>
          )}
        </nav>
        
        <div className="p-4 border-t-2 border-slate-100 shrink-0">
             <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 border-2 border-transparent transition-all">
                 <LogOut size={20} /> Sign Out
             </button>
             <p className="text-xs text-slate-400 font-bold text-center mt-4">v1.1.0 {branding.appName}</p>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isSidebarOpen ? 'md:pl-72' : 'pl-0'}`}>
        {/* Floating Navbar */}
        <header className="mt-4 shrink-0 z-30 mx-4 md:mx-6 mb-2 h-16 bg-white rounded-2xl border-2 border-slate-800 shadow-hard flex items-center justify-between px-4 transition-all">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                    <Menu size={20} />
                </button>
                {!isSidebarOpen && (
                   <h1 className="font-heading font-extrabold text-xl text-accent tracking-tight flex items-center gap-1">{branding.appName}</h1>
                )}
            </div>

            <div className="flex items-center gap-3 md:gap-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-colors ${getNetworkColor()}`} title={`Latency: ${latency.toFixed(0)}ms`}>
                    <Wifi size={14} className={networkStatus === 'unstable' ? 'animate-pulse' : ''} />
                    <span className="hidden sm:inline">{getNetworkLabel()}</span>
                </div>

                <div className="flex items-center gap-1">
                    <button className="p-2 text-slate-500 hover:text-accent hover:bg-slate-50 rounded-full transition-all relative">
                        <Bell size={18} />
                        <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-all">
                        <Settings size={18} />
                    </button>
                </div>

                <div className="h-6 w-[2px] bg-slate-100"></div>

                <div className="flex items-center gap-3 pl-1 cursor-pointer group" onClick={() => navigate('/profile')}>
                    <div className="text-right hidden md:block">
                        <p className="font-bold text-xs text-slate-800 leading-tight group-hover:text-accent transition-colors">{userProfile.name}</p>
                        {/* Display Job Title first, fallback to Role */}
                        <p className="text-[10px] text-slate-500 font-medium">{userProfile.jobTitle || userProfile.role}</p>
                    </div>
                    <div className="relative">
                        <img src={userProfile.avatar} alt="User" className="w-9 h-9 rounded-full border-2 border-slate-200 group-hover:border-accent transition-colors object-cover" />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                </div>
            </div>
        </header>

        <main className="flex-1 p-4 md:p-8 pb-24 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="max-w-[1600px] mx-auto animate-bounce-in h-full flex flex-col">
                {children}
            </div>
        </main>
      </div>

      {/* --- SETTINGS MODAL --- */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Pengaturan Aplikasi">
        <div className="space-y-4">
            
            {/* 1. PROFILE SECTION */}
            <div className={`rounded-xl border-2 border-slate-800 overflow-hidden shadow-hard transition-all duration-300 ${activeTab === 'profile' ? 'bg-white' : 'bg-white hover:bg-slate-50'}`}>
                <button onClick={() => toggleTab('profile')} className={`w-full flex items-center justify-between p-4 font-black font-heading text-lg transition-colors ${activeTab === 'profile' ? 'bg-accent text-white' : 'text-slate-800'}`}>
                    <div className="flex items-center gap-3"><User size={20} className={activeTab === 'profile' ? 'text-white' : 'text-accent'} /> Informasi Pengguna</div>
                    {activeTab === 'profile' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {activeTab === 'profile' && (
                    <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-bl-full -z-0"></div>
                        <form onSubmit={handleSaveProfile} className="space-y-5 relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="relative group cursor-pointer w-20 h-20 rounded-full overflow-hidden border-2 border-slate-800 bg-slate-50 shadow-sm">
                                    <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                                        <Upload className="text-white" size={20} />
                                    </div>
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload(e, 'user')} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-lg text-slate-800">Foto Profil</h4>
                                    <p className="text-sm text-slate-500">Klik avatar untuk mengganti.</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Nama Lengkap" value={userProfile.name} onChange={(e) => setUserProfile({...userProfile, name: e.target.value})} />
                                <Input label="Jabatan / Job Title" placeholder="Contoh: Social Media Manager" value={userProfile.jobTitle} onChange={(e) => setUserProfile({...userProfile, jobTitle: e.target.value})} />
                            </div>

                            <div className="flex flex-col gap-1 w-full">
                                <label className="font-bold text-xs text-slate-600 ml-1">Role Aplikasi (Access Level)</label>
                                <select 
                                    className="w-full bg-white border-2 border-slate-300 text-slate-800 rounded-lg px-4 py-3 outline-none transition-all duration-200 focus:border-accent focus:shadow-[4px_4px_0px_0px_#8B5CF6] appearance-none"
                                    value={userProfile.role}
                                    onChange={(e) => setUserProfile({...userProfile, role: e.target.value})}
                                    disabled={!isAdmin && userProfile.role !== 'Developer'} // Prevent standard users from promoting themselves
                                >
                                    <option value="Member">Member</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Owner">Owner</option>
                                    <option value="Developer">Developer (Superuser)</option>
                                </select>
                            </div>
                            
                            <div className="pt-2 flex justify-end">
                                <Button type="submit" className="bg-accent" icon={<CheckCircle size={16}/>}>Simpan Profil</Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* 2. BRANDING SECTION (Admin Only) */}
            {isAdmin && (
                <div className={`rounded-xl border-2 border-slate-800 overflow-hidden shadow-hard transition-all duration-300 ${activeTab === 'branding' ? 'bg-white' : 'bg-white hover:bg-slate-50'}`}>
                    <button onClick={() => toggleTab('branding')} className={`w-full flex items-center justify-between p-4 font-black font-heading text-lg transition-colors ${activeTab === 'branding' ? 'bg-secondary text-white' : 'text-slate-800'}`}>
                        <div className="flex items-center gap-3"><Palette size={20} className={activeTab === 'branding' ? 'text-white' : 'text-secondary'} /> Tampilan Aplikasi (Admin)</div>
                        {activeTab === 'branding' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    {activeTab === 'branding' && (
                        <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-300 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-bl-full -z-0"></div>
                            <form onSubmit={handleSaveBranding} className="space-y-6 relative z-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="font-bold text-sm text-slate-600">Logo Sidebar</label>
                                        <div className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-white hover:border-secondary transition-colors group relative cursor-pointer">
                                            <div className="w-14 h-14 bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center p-2">
                                                {branding.appLogo ? (
                                                    <img src={branding.appLogo} alt="Logo" className="w-full h-full object-contain" />
                                                ) : (
                                                    <Layers className="text-slate-300" size={24} />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700 text-sm">Upload PNG</p>
                                                <p className="text-[10px] text-slate-400">Transparan</p>
                                            </div>
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload(e, 'app')} />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="font-bold text-sm text-slate-600">Browser Favicon</label>
                                        <div className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-white hover:border-secondary transition-colors group relative cursor-pointer">
                                            <div className="w-14 h-14 bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center">
                                                {branding.appFavicon ? (
                                                    <img src={branding.appFavicon} alt="Favicon" className="w-8 h-8 object-contain" />
                                                ) : (
                                                    <Globe className="text-slate-300" size={24} />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700 text-sm">Upload Icon</p>
                                                <p className="text-[10px] text-slate-400">32x32 px</p>
                                            </div>
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => handleImageUpload(e, 'favicon')} />
                                        </div>
                                    </div>
                                </div>
                                <Input label="Nama Aplikasi" value={branding.appName} onChange={(e) => setBranding({...branding, appName: e.target.value})} />
                                <div className="pt-2 flex justify-end">
                                    <Button type="submit" className="bg-secondary" icon={<CheckCircle size={16}/>}>Simpan Global (Database)</Button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {/* 3. INTEGRATION SECTION (Admin Only) */}
            {isAdmin && (
                <div className={`rounded-xl border-2 border-slate-800 overflow-hidden shadow-hard transition-all duration-300 ${activeTab === 'integration' ? 'bg-white' : 'bg-white hover:bg-slate-50'}`}>
                    <button onClick={() => toggleTab('integration')} className={`w-full flex items-center justify-between p-4 font-black font-heading text-lg transition-colors ${activeTab === 'integration' ? 'bg-tertiary text-slate-800' : 'text-slate-800'}`}>
                        <div className="flex items-center gap-3"><Database size={20} className={activeTab === 'integration' ? 'text-slate-800' : 'text-tertiary'} /> Database & API (Admin)</div>
                        {activeTab === 'integration' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    {activeTab === 'integration' && (
                        <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-300 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-tertiary/10 rounded-bl-full -z-0"></div>
                            <div className="relative z-10 space-y-6">
                                <form onSubmit={handleSaveIntegration} className="space-y-4">
                                    <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-100 text-sm text-blue-800 flex gap-3 shadow-sm">
                                        <AlertCircle size={20} className="shrink-0 mt-0.5 text-blue-500" />
                                        <div className="space-y-1">
                                            <p className="font-bold">Konfigurasi Supabase</p>
                                            <p>Pastikan URL dan Key berasal dari Dashboard Supabase Anda.</p>
                                        </div>
                                    </div>
                                    <Input label="Supabase Project URL" value={sbConfig.url} onChange={(e) => setSbConfig({...sbConfig, url: e.target.value})} placeholder="https://..." />
                                    <Input label="Supabase Anon Key" value={sbConfig.key} onChange={(e) => setSbConfig({...sbConfig, key: e.target.value})} type="password" placeholder="eyJh..." />
                                    <div className="flex justify-end">
                                        <Button type="submit" className="bg-tertiary text-slate-800 hover:bg-yellow-400" icon={<CheckCircle size={16}/>}>Update Koneksi</Button>
                                    </div>
                                </form>
                                <div className="border-t-2 border-slate-100 pt-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="bg-slate-800 text-white p-1.5 rounded-lg"><Code size={16} /></div>
                                        <h4 className="font-bold text-slate-800">SQL Setup Script</h4>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2">Jalankan script ini di Supabase SQL Editor untuk membuat tabel yang diperlukan.</p>
                                    <div className="relative group">
                                        <textarea readOnly className="w-full h-40 bg-slate-900 text-green-400 text-xs font-mono p-4 rounded-xl outline-none resize-none border-2 border-slate-700 focus:border-tertiary transition-colors" value={INITIAL_SQL_SCRIPT} />
                                        <button onClick={() => { navigator.clipboard.writeText(INITIAL_SQL_SCRIPT); alert("SQL Script disalin!"); }} className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md">Copy Code</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </Modal>
    </div>
  );
};