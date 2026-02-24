import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Shield, Check, Edit3, Loader2,
  Calendar, Zap, Star, Upload, Target, CheckCircle, Clock, AlertCircle, TrendingUp
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

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
  const [kpis, setKpis] = useState<KPI[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived
  const isSuperUser = user?.role === 'Developer';
  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

  // --- FETCH DATA ---
  useEffect(() => {
    fetchProfileData();

    // Listen for updates from Layout modal
    const handleUserUpdate = () => {
      fetchProfileData();
    };
    window.addEventListener('user_updated', handleUserUpdate);
    return () => window.removeEventListener('user_updated', handleUserUpdate);
  }, []);

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
      }

    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  };

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

    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Gagal menyimpan perubahan.");
    } finally {
      setIsEditingStatus(false);
      setIsEditingBio(false);
      setIsEditingEmail(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { alert("File terlalu besar (Max 1MB)"); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        updateProfile({ avatar_url: res });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading || !user) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" size={32} /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20 pt-10 px-4 md:px-8 max-w-7xl mx-auto">

      {/* Header Profile */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-10">
        <div className="relative group shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-44 h-44 rounded-full border-4 border-slate-800 shadow-[8px_8px_0px_0px_#1E293B] overflow-hidden bg-white relative">
            <img src={user.avatar_url} className="w-full h-full object-cover" alt="User Avatar" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
              <Upload className="text-white" size={32} />
            </div>
          </div>
          <div className="absolute bottom-3 right-3 w-10 h-10 bg-quaternary border-4 border-slate-800 rounded-full flex items-center justify-center pointer-events-none">
            <div className="w-full h-full rounded-full bg-quaternary animate-ping opacity-75 absolute" />
            <div className="w-3.5 h-3.5 bg-white rounded-full relative z-10" />
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
          <div className="flex flex-col gap-1 mb-3">
            <h2 className="text-5xl font-heading text-slate-900 leading-none tracking-tight">{user.full_name || user.username}</h2>
            {user.job_title && (
              <p className="text-xl font-bold text-slate-500">{user.job_title}</p>
            )}

            {/* Unified Row: Role + Status + Joined (Sejajar) */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
              {/* 1. Role Badge */}
              {isSuperUser ? (
                <span className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-black uppercase rounded-full border-2 border-slate-800 shadow-sm flex items-center gap-1">
                  <Star size={12} fill="currentColor" /> Superuser
                </span>
              ) : (
                <span className={`px-3 py-1.5 text-white text-xs font-black uppercase rounded-full border-2 border-slate-800 shadow-sm ${user.role === 'Owner' ? 'bg-tertiary text-slate-900' : 'bg-slate-500'}`}>
                  {user.role}
                </span>
              )}

              {/* 2. Custom Status (Active Player) */}
              {isEditingStatus ? (
                <div className="flex gap-2 animate-in fade-in">
                  <input
                    autoFocus
                    className="bg-white border-2 border-slate-800 rounded-lg px-2 py-1 text-xs font-bold outline-none w-32"
                    value={customStatus}
                    onChange={(e) => setCustomStatus(e.target.value)}
                    onBlur={() => updateProfile({ custom_status: customStatus })}
                    onKeyDown={(e) => e.key === 'Enter' && updateProfile({ custom_status: customStatus })}
                  />
                  <button onMouseDown={() => updateProfile({ custom_status: customStatus })} className="p-1 bg-quaternary text-slate-900 rounded border-2 border-slate-800"><Check size={12} strokeWidth={3} /></button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingStatus(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-black uppercase rounded-full border-2 border-slate-800 shadow-sm hover:scale-105 transition-transform"
                >
                  <Zap size={12} strokeWidth={3} /> {customStatus} <Edit3 size={10} className="opacity-70" />
                </button>
              )}

              {/* 3. Joined Date */}
              <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-full border-2 border-slate-200 flex items-center gap-1">
                <Calendar size={12} /> Joined {memberSince}
              </span>
            </div>
          </div>

          <div className="max-w-xl mx-auto md:mx-0 mt-6">
            {isEditingBio ? (
              <div className="relative">
                <textarea
                  autoFocus
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-3 text-sm font-medium outline-none focus:border-slate-800 resize-none"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  onBlur={() => updateProfile({ bio })}
                />
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <span className="text-[9px] font-bold text-slate-400">{bio.length}/150</span>
                </div>
              </div>
            ) : (
              <p
                onClick={() => setIsEditingBio(true)}
                className="text-base font-medium text-slate-600 leading-relaxed cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors border-2 border-transparent hover:border-slate-200 hover:border-dashed"
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
            <div className="flex items-center gap-4 py-2 border-b-2 border-slate-50 last:border-0">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 border-2 border-slate-200 shrink-0">
                <Shield size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Role</p>
                <p className="font-bold text-lg text-slate-800">{user.role}</p>
              </div>
            </div>

            {/* Row 2: Email (Editable) */}
            <div className="flex items-center gap-4 py-2 border-b-2 border-slate-50 last:border-0 group">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 border-2 border-slate-200 shrink-0">
                <Mail size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</p>
                  {!isEditingEmail && (
                    <button onClick={() => setIsEditingEmail(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-accent">
                      <Edit3 size={14} />
                    </button>
                  )}
                </div>

                {isEditingEmail ? (
                  <div className="flex gap-2 mt-1 animate-in fade-in">
                    <input
                      autoFocus
                      className="w-full bg-slate-50 border-2 border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:border-accent"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && updateProfile({ email })}
                      placeholder="nama@email.com"
                    />
                    <button onClick={() => updateProfile({ email })} className="px-3 bg-accent text-white rounded-lg border-2 border-slate-800 hover:bg-accent/90">
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <p className="font-bold text-lg text-slate-800 truncate" onDoubleClick={() => setIsEditingEmail(true)}>
                    {email || <span className="text-slate-400 italic font-normal">Belum ada email.</span>}
                  </p>
                )}
              </div>
            </div>

          </div>
        </Card>

        {/* KPI Card */}
        <Card title="My KPI Board" icon={<Target size={20} />} headerColor="violet">
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {kpis.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                <Target className="mx-auto text-slate-300 mb-2" size={24} />
                <p className="text-xs font-bold text-slate-400">Belum ada KPI terdaftar.</p>
              </div>
            ) : (
              kpis.map(kpi => {
                const kpiRate = kpi.target_value > 0 ? Math.min(Math.round((kpi.actual_value / kpi.target_value) * 100), 100) : 0;
                const kpiColor = getCompletionColor(kpiRate);
                const kpiBadge = getStatusBadge(kpiRate);

                return (
                  <div key={kpi.id} className="bg-white border-2 border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm mb-0.5">{kpi.metric_name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{kpi.category} · {kpi.period} · {new Date(kpi.period_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</p>
                      </div>
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border ${kpiBadge.cls}`}>
                        {kpiBadge.icon} {kpiBadge.label}
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between items-end mb-1.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-slate-800 leading-none">{kpi.actual_value}</span>
                          <span className="text-xs font-bold text-slate-400 leading-none">/ {kpi.target_value} {kpi.unit}</span>
                        </div>
                        <span className={`text-xs font-black ${kpiColor.text}`}>{kpiRate}%</span>
                      </div>
                      <div className={`h-2.5 w-full rounded-full ${kpiColor.light} overflow-hidden`}>
                        <div className={`h-full ${kpiColor.bg} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${kpiRate}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};