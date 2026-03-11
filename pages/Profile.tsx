import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Shield, Check, Edit3, Loader2,
  Calendar, Zap, Star, Upload, Target, CheckCircle, Clock, AlertCircle, TrendingUp
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { googleCalendarService } from '../services/googleCalendarService';
import { Globe, Smile } from 'lucide-react';
import { MoodIndicator } from '../components/MoodIndicator';
import { storageService } from '../services/storageService';

interface UserData {
  id: string;
  full_name: string;
  username: string;
  role: string;
  avatar_url: string;
  bio?: string;
  custom_status?: string;
  job_title?: string;
  created_at: string;
  email?: string;
  subscription_start?: string;
  subscription_end?: string;
  subscription_code?: string;
  gcal_access_token?: string;
  gcal_token_expiry?: string;
  presence_status?: 'online' | 'away' | 'busy' | 'offline';
}

interface KPI {
  id: string;
  metric_name: string;
  category: string;
  target_value: number;
  actual_value: number;
  unit: string;
  period: string;
  period_date: string;
}

const getCompletionColor = (rate: number) => {
  if (rate >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-200' };
  if (rate >= 50) return { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', border: 'border-amber-200' };
  return { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50', border: 'border-red-200' };
};

const getStatusBadge = (rate: number) => {
  if (rate >= 80) return { label: 'On Track', icon: <CheckCircle size={12} />, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (rate >= 50) return { label: 'In Progress', icon: <Clock size={12} />, cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Di Bawah Target', icon: <AlertCircle size={12} />, cls: 'bg-red-50 text-red-700 border-red-200' };
};

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('user_id');
  const [user, setUser] = useState<UserData | null>(null);

  // Edit Profile States
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [customStatus, setCustomStatus] = useState('');

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState('');

  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [presenceStatus, setPresenceStatus] = useState<'online' | 'away' | 'busy' | 'offline'>('online');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived
  const isSuperUser = user?.role === 'Developer';
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

  // --- FETCH DATA ---
  const fetchMood = async () => {
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];
    const { data: moodData } = await supabase
      .from('user_moods')
      .select('mood_emoji')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(1);
    if (moodData && moodData[0]) {
      setCurrentMood(moodData[0].mood_emoji);
    }
  };

  const fetchProfileData = async () => {
    // Note: Don't set global loading true on refresh to avoid flickering whole page
    if (!user) setLoading(true);
    try {
      if (!userId) {
        const storedUser = localStorage.getItem('user_name');
        if (!storedUser) {
          navigate('/login');
          return;
        }
      }

      let uData = null;
      if (userId) {
        const { data } = await supabase.from('app_users').select('*').eq('id', userId).single();
        uData = data;
      } else {
        const { data } = await supabase.from('app_users').select('*').limit(1).single();
        uData = data;
      }

      if (uData) {
        setUser(uData);
        setBio(uData.bio || 'Productivity Enthusiast.');
        setCustomStatus(uData.custom_status || 'Active Player');
        setEmail(uData.email || '');
        // Sync local storage on load to ensure consistency
        localStorage.setItem('user_avatar', uData.avatar_url);

        // Fetch User KPIs
        const tenantId = localStorage.getItem('tenant_id') || localStorage.getItem('user_id');
        const { data: tm } = await supabase.from('team_members')
          .select('id')
          .eq('full_name', uData.full_name)
          .eq('admin_id', tenantId)
          .maybeSingle();

        if (tm) {
          const { data: userKpis } = await supabase.from('team_kpis')
            .select('*')
            .eq('member_id', tm.id)
            .order('created_at', { ascending: false });
          if (userKpis) setKpis(userKpis);
        }

        fetchMood();
        setPresenceStatus(uData.presence_status || 'online');
      }
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();

    // Listen for updates from Layout modal
    const handleUserUpdate = () => {
      fetchProfileData();
    };
    const handleMoodUpdate = () => {
      fetchMood();
    };
    window.addEventListener('user_updated', handleUserUpdate);
    window.addEventListener('mood_updated', handleMoodUpdate);
    return () => {
      window.removeEventListener('user_updated', handleUserUpdate);
      window.removeEventListener('mood_updated', handleMoodUpdate);
    };
  }, []);

  const updateProfile = async (updates: any) => {
    if (!user) return;
    try {
      // Check for avatar change (SYNC LOGIC)
      if (updates.avatar_url && updates.avatar_url !== user.avatar_url) {
        const oldAvatar = user.avatar_url;
        const newAvatar = updates.avatar_url;

        // Sync to Workspaces (Stack Views)
        const { data: workspaces } = await supabase.from('workspaces').select('id, members');
        if (workspaces) {
          for (const ws of workspaces) {
            if (ws.members && ws.members.includes(oldAvatar)) {
              const newMembers = ws.members.map((m: string) => m === oldAvatar ? newAvatar : m);
              await supabase.from('workspaces').update({ members: newMembers }).eq('id', ws.id);
            }
          }
        }

        // Update Local Storage
        localStorage.setItem('user_avatar', newAvatar);
      }

      const { error } = await supabase.from('app_users').update(updates).eq('id', user.id);
      if (error) throw error;

      // Optimistic update
      setUser(prev => prev ? { ...prev, ...updates } : null);

      // Trigger event so Layout updates too
      window.dispatchEvent(new Event('user_updated'));
      window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: 'Profil berhasil diperbarui!' } }));

    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Gagal menyimpan perubahan.' } }));
    } finally {
      setIsEditingStatus(false);
      setIsEditingBio(false);
      setIsEditingEmail(false);
    }
  };

  const updatePresenceStatus = async (status: 'online' | 'away' | 'busy' | 'offline') => {
    if (!user) return;
    setPresenceStatus(status);
    try {
      const { error } = await supabase.from('app_users').update({ presence_status: status }).eq('id', user.id);
      if (error) throw error;
      localStorage.setItem('presence_status', status);
      window.dispatchEvent(new Event('user_presence_updated'));
      window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: `Status diubah ke ${status}!` } }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnectGCal = async () => {
    try {
      await googleCalendarService.connect();
      // Refresh user data to show connection status
      fetchProfileData();
      window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: 'Google Calendar Berhasil Terhubung!' } }));
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Gagal terhubung ke Google Calendar.' } }));
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'File terlalu besar (Max 5MB)' } }));
        return;
      }

      setUploadingAvatar(true);
      try {
        const publicUrl = await storageService.uploadFile(file, 'content-assets', 'avatars');
        if (publicUrl) {
          await updateProfile({ avatar_url: publicUrl });
          window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: 'Foto profil berhasil diperbarui!' } }));
        } else {
          throw new Error('Gagal mengunggah foto.');
        }
      } catch (err) {
        console.error('[Avatar] Upload error:', err);
        window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Gagal mengunggah foto profil.' } }));
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  if (loading || !user) return <div className="h-screen flex items-center justify-center"><Loader2 size={24} className="animate-spin text-slate-300 sm:w-8 sm:h-8 md:w-8 md:h-8" /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-12 sm:pb-16 md:pb-20 pt-4 sm:pt-6 md:pt-10 px-2 sm:px-4 md:px-8 max-w-7xl mx-auto">

      {/* Header Profile */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-10">
        <div className="relative group shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-44 md:h-44 rounded-full border-3 sm:border-4 border-slate-800 shadow-[6px_6px_0px_0px_#1E293B] sm:shadow-[8px_8px_0px_0px_#1E293B] overflow-hidden bg-card relative">
            {uploadingAvatar ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10">
                <Loader2 size={32} className="animate-spin text-accent" />
              </div>
            ) : (
              <img src={user.avatar_url} className="w-full h-full object-cover" alt="User Avatar" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
              <Upload size={24} className="text-white sm:w-8 sm:h-8 md:w-8 md:h-8" />
            </div>
            <MoodIndicator moodEmoji={currentMood} size="lg" />
          </div>
          <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 w-8 h-8 sm:w-10 sm:h-10 bg-card border-3 sm:border-4 border-slate-800 rounded-full flex items-center justify-center pointer-events-none">
            <div className={`w-full h-full rounded-full animate-ping opacity-75 absolute ${presenceStatus === 'online' ? 'bg-emerald-500' :
              presenceStatus === 'away' ? 'bg-amber-500' :
                presenceStatus === 'busy' ? 'bg-rose-500' :
                  'bg-slate-500'
              }`} />
            <div className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full relative z-10 ${presenceStatus === 'online' ? 'bg-emerald-500' :
              presenceStatus === 'away' ? 'bg-amber-500' :
                presenceStatus === 'busy' ? 'bg-rose-500' :
                  'bg-slate-500'
              }`} />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleAvatarUpload}
          />
        </div>

        <div className="flex-1 min-w-0 text-center md:text-left w-full">
          <div className="flex flex-col gap-0.5 sm:gap-1 mb-2 sm:mb-3">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-heading text-foreground leading-none tracking-tight">{user.full_name || user.username}</h2>
            {user.job_title && (
              <p className="text-sm sm:text-base md:text-xl font-bold text-slate-500">{user.job_title}</p>
            )}

            {/* Unified Row: Role + Status + Joined (Sejajar) */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2 md:gap-3 mt-2 sm:mt-3 md:mt-4">
              {/* 1. Role Badge */}
              {isSuperUser ? (
                <span className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] sm:text-xs font-black uppercase rounded-full border-[3px] border-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center gap-1">
                  <Star size={12} fill="currentColor" /> Superuser
                </span>
              ) : (
                <span className={`px-4 py-1.5 text-white text-xs font-black uppercase rounded-full border-[3.5px] border-slate-900 shadow-[3px_3px_0px_#0f172a] ${user.role === 'Owner' ? 'bg-tertiary text-foreground' : 'bg-muted0'}`}>
                  {user.role}
                </span>
              )}

              {/* 2. Custom Status (Active Player) */}
              {isEditingStatus ? (
                <div className="flex gap-2 animate-in fade-in">
                  <input
                    autoFocus
                    className="bg-card border-2 border-border text-foreground rounded-lg px-2 py-1 text-xs font-bold outline-none w-32 focus:border-accent"
                    value={customStatus}
                    onChange={(e) => setCustomStatus(e.target.value)}
                    onBlur={() => updateProfile({ custom_status: customStatus })}
                    onKeyDown={(e) => e.key === 'Enter' && updateProfile({ custom_status: customStatus })}
                  />
                  <button onMouseDown={() => updateProfile({ custom_status: customStatus })} className="p-1 bg-accent text-white rounded border-2 border-accent hover:bg-accent/80"><Check size={12} strokeWidth={3} /></button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingStatus(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-accent text-white text-xs font-black uppercase rounded-full border-[3.5px] border-slate-900 shadow-[3px_3px_0px_#0f172a] hover:scale-105 transition-all"
                >
                  <Zap size={12} strokeWidth={3} /> {customStatus} <Edit3 size={10} className="ml-1 opacity-70" />
                </button>
              )}

              {/* 3. Joined Date */}
              <span className="px-4 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-full border-[3px] border-slate-200 flex items-center gap-2">
                <Calendar size={12} strokeWidth={3} /> Joined {memberSince}
              </span>
            </div>
          </div>

          <div className="max-w-xl mx-auto md:mx-0 mt-6">
            {isEditingBio ? (
              <div className="relative">
                <textarea
                  autoFocus
                  className="w-full bg-muted border-2 border-slate-300 rounded-xl p-3 text-sm font-medium outline-none focus:border-slate-800 resize-none"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  onBlur={() => updateProfile({ bio })}
                />
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <span className="text-[9px] font-bold text-mutedForeground">{bio.length}/150</span>
                </div>
              </div>
            ) : (
              <p
                onClick={() => setIsEditingBio(true)}
                className="text-base font-medium text-slate-600 leading-relaxed cursor-pointer hover:bg-muted p-2 rounded-xl transition-colors border-2 border-transparent hover:border-slate-200 hover:border-dashed"
                title="Klik untuk edit bio"
              >
                "{bio || "Tulis bio singkat tentang dirimu..."}"
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Account Details" icon={<User size={20} />} headerColor="white">
          <div className="space-y-4">
            {/* Row 1: Role */}
            <div className="flex items-center gap-5 py-3 border-b-[3px] border-slate-50 last:border-0">
              <div className="w-14 h-14 rounded-2xl bg-card border-[3.5px] border-slate-900 shadow-[3px_3px_0px_#0f172a] flex items-center justify-center text-foreground shrink-0">
                <Shield size={24} strokeWidth={3} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-mutedForeground">System Role</p>
                <p className="font-black text-xl text-foreground">{user.role}</p>
              </div>
            </div>

            {/* Row 2: Email (Editable) */}
            <div className="flex items-center gap-5 py-3 border-b-[3px] border-slate-50 last:border-0 group">
              <div className="w-14 h-14 rounded-2xl bg-card border-[3.5px] border-slate-900 shadow-[3px_3px_0px_#0f172a] flex items-center justify-center text-foreground shrink-0">
                <Mail size={24} strokeWidth={3} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-mutedForeground">Email Address</p>
                  {!isEditingEmail && (
                    <button onClick={() => setIsEditingEmail(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-mutedForeground hover:text-accent">
                      <Edit3 size={16} />
                    </button>
                  )}
                </div>
                {/* ... email input/display content ... */}

                {isEditingEmail ? (
                  <div className="flex gap-2 mt-1 animate-in fade-in">
                    <input
                      autoFocus
                      className="w-full bg-card border-2 border-border text-foreground rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:border-accent"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && updateProfile({ email })}
                      placeholder="nama@email.com"
                    />
                    <button onClick={() => updateProfile({ email })} className="px-3 bg-accent text-white rounded-lg border-2 border-accent hover:bg-accent/90">
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <p className="font-bold text-lg text-foreground truncate cursor-text" onDoubleClick={() => setIsEditingEmail(true)}>
                    {email || <span className="text-mutedForeground italic font-normal">Belum ada email.</span>}
                  </p>
                )}
              </div>
            </div>

          </div>
        </Card>

        {/* Subscription Card */}
        <Card title="Status Berlangganan" icon={<Shield size={20} />} headerColor="emerald">
          <div className="space-y-4">
            <div className="flex items-center gap-4 py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border-2 border-emerald-500/20 shrink-0">
                <Zap size={24} fill="currentColor" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-mutedForeground">Paket Saat Ini</p>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-2xl text-foreground">{user.subscription_code || 'Free Member'}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border-2 shadow-sm ${new Date(user.subscription_end || '') > new Date() ? 'bg-emerald-500 text-white border-emerald-600 shadow-[2px_2px_0px_rgba(16,185,129,0.5)]' : 'bg-red-500 text-white border-red-600 shadow-[2px_2px_0px_#7f1d1d]'
                    }`}>
                    {new Date(user.subscription_end || '') > new Date() ? 'Aktif' : 'Expired'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-card border-[3.5px] border-slate-900 rounded-[2rem] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[4px_4px_0px_#0f172a]">
              <div className="text-center sm:text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-mutedForeground">Masa Aktif Hingga</p>
                <p className="font-black text-foreground mt-1">
                  {user.subscription_end ? new Date(user.subscription_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Tidak Terbatas'}
                </p>
              </div>
              <button
                onClick={() => window.dispatchEvent(new Event('open-payment-modal'))}
                className="w-full sm:w-auto px-6 py-3 bg-accent text-white font-black rounded-xl border-[3.5px] border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:bg-emerald-500 transition-all hover:-translate-y-1 active:translate-y-0"
              >
                UPGRADE / PERPANJANG
              </button>
            </div>
            <p className="text-[10px] font-bold text-mutedForeground text-center uppercase tracking-widest leading-relaxed">
              Klik upgrade untuk memilih paket baru dan memperpanjang akses eksklusif Anda.
            </p>
          </div>
        </Card>

        {/* Integration Card */}
        <Card title="Integrasi Layanan" icon={<Globe size={20} />} headerColor="pink">
          <div className="space-y-4">
            <div className={`p-5 rounded-[2rem] border-[3.5px] border-slate-900 transition-all ${user.gcal_access_token ? 'bg-emerald-50 shadow-[6px_6px_0px_#10b981]' : 'bg-muted shadow-[4px_4px_0px_#0f172a]'}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-[3px] shadow-[2px_2px_0px_#0f172a] ${user.gcal_access_token ? 'bg-card border-emerald-500 text-emerald-500' : 'bg-card border-slate-200 text-mutedForeground'}`}>
                    <Calendar size={28} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="font-black text-foreground text-lg">Google Calendar</h4>
                    <p className="text-[10px] font-black text-mutedForeground uppercase tracking-widest">
                      {user.gcal_access_token ? 'Sudah Terhubung' : 'Belum Terhubung'}
                    </p>
                  </div>
                </div>
                {user.gcal_access_token ? (
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase border-[3px] border-slate-900 shadow-[2px_2px_0px_#0f172a]">
                    <CheckCircle size={14} /> Terhubung
                  </div>
                ) : (
                  <button
                    onClick={handleConnectGCal}
                    className="px-5 py-2.5 bg-slate-900 text-white text-xs font-black rounded-xl border-[3px] border-slate-900 shadow-[4px_4px_0px_#0f172a] hover:-translate-y-1 active:translate-y-0 transition-all"
                  >
                    Hubungkan
                  </button>
                )}
              </div>
              <p className="text-[10px] font-black text-mutedForeground mt-5 leading-relaxed uppercase tracking-wide">
                Sinkronisasikan konten plan Anda secara otomatis ke Google Calendar sebagai event tugas agar tidak ada yang terlewat.
              </p>
            </div>
          </div>
        </Card>

        {/* KPI Card */}
        <Card title="My KPI Board" icon={<Target size={20} />} headerColor="violet">
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {kpis.length === 0 ? (
              <div className="text-center py-8 bg-muted border-2 border-dashed border-slate-200 rounded-xl">
                <Target className="mx-auto text-slate-300 mb-2" size={24} />
                <p className="text-xs font-bold text-mutedForeground">Belum ada KPI terdaftar.</p>
              </div>
            ) : (
              kpis.map(kpi => {
                const kpiRate = kpi.target_value > 0 ? Math.min(Math.round((kpi.actual_value / kpi.target_value) * 100), 100) : 0;
                const kpiColor = getCompletionColor(kpiRate);
                const kpiBadge = getStatusBadge(kpiRate);

                return (
                  <div key={kpi.id} className="bg-card border-[3.5px] border-slate-900 rounded-[2rem] p-5 shadow-[4px_4px_0px_#0f172a] mb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-black text-foreground text-base mb-1">{kpi.metric_name}</h4>
                        <p className="text-[10px] text-mutedForeground font-black uppercase tracking-widest leading-none">{kpi.category} · {kpi.period} · {new Date(kpi.period_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</p>
                      </div>
                      <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border-[3px] border-slate-900 shadow-[2px_2px_0px_#0f172a] ${kpiBadge.cls}`}>
                        {kpiBadge.icon} {kpiBadge.label}
                      </span>
                    </div>
                    <div className="mt-5">
                      <div className="flex justify-between items-end mb-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-foreground leading-none">{kpi.actual_value}</span>
                          <span className="text-xs font-black text-mutedForeground leading-none tracking-widest">/ {kpi.target_value} {kpi.unit}</span>
                        </div>
                        <span className={`text-sm font-black p-1 px-2 border-[2.5px] border-slate-900 rounded-lg shadow-[2px_2px_0px_#0f172a] ${kpiColor.text} ${kpiColor.light}`}>{kpiRate}%</span>
                      </div>
                      <div className="h-4 w-full rounded-full bg-slate-100 border-[3px] border-slate-900 shadow-inner overflow-hidden">
                        <div className={`h-full ${kpiColor.bg} border-r-[3px] border-slate-900 transition-all duration-1000 ease-out`} style={{ width: `${kpiRate}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Developer Presence Status - ONLY DEVELOPER */}
        {isSuperUser && (
          <Card title="Developer Stealth Mode" icon={<Zap size={20} />} headerColor="indigo">
            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-2xl border-2 border-slate-200 border-dashed">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Atur Status Kehadiran</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { id: 'online', label: 'Online', sub: 'Terlihat aktif', color: 'bg-emerald-500' },
                    { id: 'away', label: 'Away', sub: 'Lagi istirahat', color: 'bg-amber-500' },
                    { id: 'busy', label: 'Busy', sub: 'Jangan ganggu', color: 'bg-rose-500' },
                    { id: 'offline', label: 'Invisible', sub: 'Mode siluman', color: 'bg-slate-400' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => updatePresenceStatus(s.id as any)}
                      className={`relative flex flex-col items-center p-3 rounded-2xl border-[3px] transition-all ${presenceStatus === s.id
                          ? 'border-slate-900 bg-white shadow-[4px_4px_0px_#1e293b] -translate-y-1'
                          : 'border-transparent bg-card/50 hover:border-slate-200 shadow-sm'
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-full ${s.color} border-2 border-slate-900 shadow-mini mb-2 flex items-center justify-center text-white`}>
                        {presenceStatus === s.id && <Check size={14} strokeWidth={4} />}
                      </div>
                      <span className="text-xs font-black uppercase tracking-tighter text-foreground">{s.label}</span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">{s.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <Shield size={20} className="text-white" />
                </div>
                <div>
                  <h5 className="text-[11px] font-black uppercase text-indigo-600 tracking-widest">Developer Privilege</h5>
                  <p className="text-[10px] font-bold text-indigo-500 leading-relaxed uppercase tracking-tight">
                    Anda bisa mengatur status "Invisible" untuk tetap menggunakan aplikasi secara normal namun terlihat offline bagi anggota tim lainnya.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};