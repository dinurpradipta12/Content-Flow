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
  ChevronUp
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { Modal } from './ui/Modal';
import { Workspace } from '../types';
import { updateSupabaseConfig, checkConnectionLatency } from '../services/supabaseClient';

interface LayoutProps {
  children: React.ReactNode;
}

// --- SQL TEMPLATE FOR USER CONVENIENCE ---
const INITIAL_SQL_SCRIPT = `-- Script ini AMAN dijalankan berkali-kali (Anti-Error)

-- 1. Buat tabel workspaces jika belum ada
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

-- 2. Buat tabel content_items jika belum ada
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
  constraint content_items_pkey primary key (id),
  constraint content_items_workspace_id_fkey foreign key (workspace_id) references workspaces (id) on delete cascade
);

-- 3. Update Kolom (Jika tabel sudah ada tapi kolom belum lengkap)
alter table public.workspaces add column if not exists logo_url text;
alter table public.workspaces add column if not exists account_name text;
alter table public.workspaces add column if not exists platforms text[];
alter table public.workspaces add column if not exists members text[];
alter table public.workspaces add column if not exists invite_code text;

-- Tambahan kolom baru untuk content_link
alter table public.content_items add column if not exists content_link text;

-- 4. Enable RLS (Optional - Supaya aman)
alter table public.workspaces enable row level security;
alter table public.content_items enable row level security;

-- Policy sederhana: Bolehkan semua akses (public) untuk development
create policy "Enable all access for all users" on public.workspaces for all using (true) with check (true);
create policy "Enable all access for all users" on public.content_items for all using (true) with check (true);
`;

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>({ id: '1', name: 'Arunika Personal', role: 'Owner' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'integration' | null>('profile');

  // Network State
  const [networkStatus, setNetworkStatus] = useState<'good' | 'unstable' | 'bad' | 'offline'>('good');
  const [latency, setLatency] = useState(0);

  // User Profile State (Persisted in localStorage for demo)
  const [userProfile, setUserProfile] = useState({
      name: localStorage.getItem('user_name') || 'Aditya W.',
      email: localStorage.getItem('user_email') || 'aditya@arunika.id',
      role: localStorage.getItem('user_role') || 'Pro Plan',
      avatar: localStorage.getItem('user_avatar') || 'https://picsum.photos/40/40'
  });

  // Branding State (Persisted)
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

  // --- NETWORK CHECKER ---
  useEffect(() => {
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

    checkNetwork(); // Initial check
    const interval = setInterval(checkNetwork, 10000); // Check every 10s
    
    // Listen for offline/online events
    window.addEventListener('offline', () => setNetworkStatus('offline'));
    window.addEventListener('online', checkNetwork);

    return () => {
        clearInterval(interval);
        window.removeEventListener('offline', () => setNetworkStatus('offline'));
        window.removeEventListener('online', checkNetwork);
    };
  }, []);

  // --- BRANDING EFFECT (Title & Favicon) ---
  useEffect(() => {
      // Update Title
      document.title = `${branding.appName} Content Flow`;
      
      // Update Favicon
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      // Prioritize uploaded favicon, fallback to logo, then default
      if (branding.appFavicon) {
          link.href = branding.appFavicon;
      } else if (branding.appLogo) {
          link.href = branding.appLogo;
      }
  }, [branding]);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/plan', label: 'Content Plan', icon: <CalendarDays size={20} /> },
    { path: '/analysis', label: 'Analisa Konten', icon: <BarChart2 size={20} /> },
    { path: '/carousel', label: 'Carousel Maker', icon: <ImageIcon size={20} /> },
    { path: '/script', label: 'Script Creator', icon: <PenTool size={20} /> },
  ];

  // Handlers
  const handleSaveProfile = (e: React.FormEvent) => {
      e.preventDefault();
      localStorage.setItem('user_name', userProfile.name);
      localStorage.setItem('user_email', userProfile.email);
      localStorage.setItem('user_role', userProfile.role);
      localStorage.setItem('user_avatar', userProfile.avatar);
      alert("Profil berhasil diperbarui!");
  };

  const handleSaveBranding = (e: React.FormEvent) => {
      e.preventDefault();
      localStorage.setItem('app_name', branding.appName);
      localStorage.setItem('app_logo', branding.appLogo);
      localStorage.setItem('app_favicon', branding.appFavicon);
      alert("Branding berhasil diperbarui! Favicon dan Logo telah diupdate.");
  };

  const handleSaveIntegration = (e: React.FormEvent) => {
      e.preventDefault();
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

  // Helper for Network Indicator
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

  // Helper to toggle Accordion
  const toggleTab = (tab: 'profile' | 'branding' | 'integration') => {
      if (activeTab === tab) {
          setActiveTab(null);
      } else {
          setActiveTab(tab);
      }
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
        <div className="h-20 flex items-center px-6 border-b-2 border-slate-100">
          <h1 className="font-heading font-extrabold text-2xl text-accent tracking-tight flex items-center gap-2 truncate">
            {branding.appLogo ? (
                 <img src={branding.appLogo} className="w-8 h-8 object-contain" alt="Logo" />
            ) : (
                <div className="w-8 h-8 bg-tertiary rounded-full border-2 border-slate-800 flex items-center justify-center flex-shrink-0">
                  <Layers size={18} className="text-slate-800" />
                </div>
            )}
            <span className="truncate">{branding.appName}<span className="text-slate-800">.</span></span>
          </h1>
        </div>

        {/* Workspace Switcher */}
        <div className="px-6 py-6">
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
            {/* Mock Dropdown */}
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
          {navItems.map((item) => (
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
        </nav>
        
        {/* Footer info (optional) */}
        <div className="p-6 text-center">
            <p className="text-xs text-slate-400 font-bold">v1.0.0 {branding.appName}</p>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div 
        className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isSidebarOpen ? 'md:pl-72' : 'pl-0'
        }`}
      >
        {/* Floating Navbar (Popup Style) */}
        <header className="mt-4 shrink-0 z-30 mx-4 md:mx-6 mb-2 h-16 bg-white rounded-2xl border-2 border-slate-800 shadow-hard flex items-center justify-between px-4 transition-all">
            {/* Left: Sidebar Toggle */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                >
                    <Menu size={20} />
                </button>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-3 md:gap-4">
                {/* Network Indicator */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-colors ${getNetworkColor()}`} title={`Latency: ${latency.toFixed(0)}ms`}>
                    <Wifi size={14} className={networkStatus === 'unstable' ? 'animate-pulse' : ''} />
                    <span className="hidden sm:inline">{getNetworkLabel()}</span>
                </div>

                {/* Icons */}
                <div className="flex items-center gap-1">
                    <button className="p-2 text-slate-500 hover:text-accent hover:bg-slate-50 rounded-full transition-all relative">
                        <Bell size={18} />
                        <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </button>
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-all"
                    >
                        <Settings size={18} />
                    </button>
                </div>

                {/* Vertical Divider */}
                <div className="h-6 w-[2px] bg-slate-100"></div>

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-1 cursor-pointer group" onClick={() => setIsSettingsOpen(true)}>
                    <div className="text-right hidden md:block">
                        <p className="font-bold text-xs text-slate-800 leading-tight group-hover:text-accent transition-colors">{userProfile.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{userProfile.role}</p>
                    </div>
                    <div className="relative">
                        <img 
                            src={userProfile.avatar} 
                            alt="User" 
                            className="w-9 h-9 rounded-full border-2 border-slate-200 group-hover:border-accent transition-colors object-cover" 
                        />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                </div>
            </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 pb-24 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="max-w-[1600px] mx-auto animate-bounce-in h-full flex flex-col">
                {children}
            </div>
        </main>
      </div>

      {/* --- SETTINGS MODAL --- */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Pengaturan Aplikasi"
      >
        <div className="space-y-4">
            
            {/* 1. PROFILE SECTION DROPDOWN */}
            <div className={`rounded-xl border-2 border-slate-800 overflow-hidden shadow-hard transition-all duration-300 ${activeTab === 'profile' ? 'bg-white' : 'bg-white hover:bg-slate-50'}`}>
                <button 
                    onClick={() => toggleTab('profile')}
                    className={`w-full flex items-center justify-between p-4 font-black font-heading text-lg transition-colors ${activeTab === 'profile' ? 'bg-accent text-white' : 'text-slate-800'}`}
                >
                    <div className="flex items-center gap-3">
                        <User size={20} className={activeTab === 'profile' ? 'text-white' : 'text-accent'} />
                        Informasi Pengguna
                    </div>
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
                                <Input label="Role / Plan" value={userProfile.role} onChange={(e) => setUserProfile({...userProfile, role: e.target.value})} />
                            </div>
                            <Input label="Email Address" value={userProfile.email} onChange={(e) => setUserProfile({...userProfile, email: e.target.value})} />
                            
                            <div className="pt-2 flex justify-end">
                                <Button type="submit" className="bg-accent" icon={<CheckCircle size={16}/>}>Simpan Profil</Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* 2. BRANDING SECTION DROPDOWN */}
            <div className={`rounded-xl border-2 border-slate-800 overflow-hidden shadow-hard transition-all duration-300 ${activeTab === 'branding' ? 'bg-white' : 'bg-white hover:bg-slate-50'}`}>
                <button 
                    onClick={() => toggleTab('branding')}
                    className={`w-full flex items-center justify-between p-4 font-black font-heading text-lg transition-colors ${activeTab === 'branding' ? 'bg-secondary text-white' : 'text-slate-800'}`}
                >
                    <div className="flex items-center gap-3">
                        <Palette size={20} className={activeTab === 'branding' ? 'text-white' : 'text-secondary'} />
                        Tampilan Aplikasi
                    </div>
                    {activeTab === 'branding' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {activeTab === 'branding' && (
                    <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-300 relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-bl-full -z-0"></div>
                        <form onSubmit={handleSaveBranding} className="space-y-6 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Logo Upload */}
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

                                {/* Favicon Upload */}
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
                                <Button type="submit" className="bg-secondary" icon={<CheckCircle size={16}/>}>Simpan Branding</Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* 3. INTEGRATION SECTION DROPDOWN */}
            <div className={`rounded-xl border-2 border-slate-800 overflow-hidden shadow-hard transition-all duration-300 ${activeTab === 'integration' ? 'bg-white' : 'bg-white hover:bg-slate-50'}`}>
                <button 
                    onClick={() => toggleTab('integration')}
                    className={`w-full flex items-center justify-between p-4 font-black font-heading text-lg transition-colors ${activeTab === 'integration' ? 'bg-tertiary text-slate-800' : 'text-slate-800'}`}
                >
                    <div className="flex items-center gap-3">
                        <Database size={20} className={activeTab === 'integration' ? 'text-slate-800' : 'text-tertiary'} />
                        Database & API
                    </div>
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
                                        <p>Pastikan URL dan Key berasal dari Dashboard Supabase Anda. Key disimpan lokal.</p>
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
                                    <div className="bg-slate-800 text-white p-1.5 rounded-lg">
                                        <Code size={16} />
                                    </div>
                                    <h4 className="font-bold text-slate-800">SQL Setup Script</h4>
                                </div>
                                <p className="text-xs text-slate-500 mb-2">Jalankan script ini di SQL Editor Supabase.</p>
                                <div className="relative group">
                                    <textarea 
                                        readOnly 
                                        className="w-full h-40 bg-slate-900 text-green-400 text-xs font-mono p-4 rounded-xl outline-none resize-none border-2 border-slate-700 focus:border-tertiary transition-colors"
                                        value={INITIAL_SQL_SCRIPT}
                                    />
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(INITIAL_SQL_SCRIPT);
                                            alert("SQL Script disalin!");
                                        }}
                                        className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md"
                                    >
                                        Copy Code
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
      </Modal>
    </div>
  );
};