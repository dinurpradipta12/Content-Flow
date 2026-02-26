import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Workspace } from '../types';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Search, Users, Briefcase, ChevronRight, UserMinus, Key, EyeOff, Eye, Loader2, Globe, Layers, X, Plus, Target, Edit3, Save, Bell } from 'lucide-react';
import { useNotifications } from '../components/NotificationProvider';
import { useAppConfig } from '../components/AppConfigProvider';

interface AppUser {
    id: string;
    username: string;
    password: string;
    role: string;
    full_name: string;
    avatar_url: string;
    email: string;
    is_active: boolean;
    subscription_start: string | null;
    subscription_end: string | null;
    created_at: string;
    parent_user_id?: string;
    invited_by?: string;
    member_limit?: number;
    subscription_package?: string;
    online_status?: 'online' | 'idle' | 'offline';
    last_activity_at?: string;
}

interface WorkspaceData extends Workspace {
    members?: string[];
}

interface KPI {
    id: string;
    member_id: string;
    metric_name: string;
    category: string;
    target_value: number;
    actual_value: number;
    unit: string;
    period: string;
    period_date: string;
    notes: string;
}

export const TeamManagement: React.FC = () => {
    const { config } = useAppConfig();
    const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
    const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceData[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [kpis, setKpis] = useState<KPI[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceData | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Refs for stable logic
    const hasLoadedOnce = React.useRef(false);
    const isFetching = React.useRef(false);
    const fetchTimer = React.useRef<any>(null);

    // Modal state
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [currentAdmin, setCurrentAdmin] = useState<AppUser | null>(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [upgradeStep, setUpgradeStep] = useState<'info' | 'payment' | 'success'>('info');
    const [selectedPkgId, setSelectedPkgId] = useState('');
    const [upgradeOrderId, setUpgradeOrderId] = useState('');
    const [requestingUpgrade, setRequestingUpgrade] = useState(false);

    // KPI Add Form
    const [showAddKPI, setShowAddKPI] = useState(false);
    const [kpiForm, setKpiForm] = useState({ metric_name: '', category: 'General', target_value: 100, actual_value: 0, unit: '%', period: 'Monthly', period_date: new Date().toISOString().split('T')[0], notes: '' });
    const [addingKPI, setAddingKPI] = useState(false);
    const [minCompletionRate, setMinCompletionRate] = useState(80);
    // KPI Edit
    const [editingKPIId, setEditingKPIId] = useState<string | null>(null);
    const [editKPIForm, setEditKPIForm] = useState({ metric_name: '', category: 'General', target_value: 100, actual_value: 0, unit: '%', period: 'Monthly', period_date: new Date().toISOString().split('T')[0], notes: '' });
    const [savingEditKPI, setSavingEditKPI] = useState(false);

    const currentUserAvatar = localStorage.getItem('user_avatar') || 'https://picsum.photos/40/40';

    const { sendNotification } = useNotifications();

    const notifyByMention = async (text: string, sourceTitle: string) => {
        if (!text || typeof text !== 'string') return;

        const mentionedIds = new Set<string>();

        // 1. Traditional @mentions
        if (text.includes('@')) {
            const mentions = text.match(/@\[([^\]]+)\]|@(\w+)/g);
            if (mentions) {
                const names = mentions.map(m => m.startsWith('@[') ? m.slice(2, -1) : m.slice(1));
                for (const name of names) {
                    const user = users.find(u => u.full_name === name || u.username === name);
                    if (user) mentionedIds.add(user.id);
                }
            }
        }

        // 2. Scan for full names (even without @) - Global Mentioning
        users.forEach(user => {
            const fullName = user.full_name?.toLowerCase();
            const userName = user.username?.toLowerCase();
            const lowerText = text.toLowerCase();
            if ((fullName && lowerText.includes(fullName)) || (userName && lowerText.includes(userName))) {
                mentionedIds.add(user.id);
            }
        });

        // Send notifications
        for (const userId of Array.from(mentionedIds)) {
            await sendNotification({
                recipientId: userId,
                type: 'MENTION',
                title: 'Anda disebut dalam KPI',
                content: `menyebut Anda dalam catatan KPI: ${sourceTitle}`,
            });
        }
    };


    const fetchData = React.useCallback(async () => {
        if (isFetching.current) return;
        isFetching.current = true;

        const isInitial = !hasLoadedOnce.current;
        if (isInitial) setLoading(true);
        else setRefreshing(true);

        try {
            const tenantId = localStorage.getItem('tenant_id') || localStorage.getItem('user_id');
            const userRole = localStorage.getItem('user_role');
            const currentUserId = localStorage.getItem('user_id');
            const isDeveloper = userRole === 'Developer';

            const isBase64Avatar = currentUserAvatar?.startsWith('data:');
            const shouldSkipAvatarFilter = isBase64Avatar && currentUserAvatar.length > 500;

            // 1. Fetch Workspaces
            let wsQuery = supabase.from('workspaces').select('*');
            if (!isDeveloper) {
                if (shouldSkipAvatarFilter) {
                    wsQuery = wsQuery.eq('admin_id', tenantId);
                } else {
                    wsQuery = wsQuery.or(`admin_id.eq.${tenantId}${currentUserAvatar ? `,members.cs.{"${currentUserAvatar}"}` : ''}`);
                }
            }
            const { data: wsData } = await wsQuery.order('name');
            const myWorkspaces = (wsData || []).filter(w =>
                isDeveloper ||
                w.owner_id === currentUserId ||
                (w.admin_id === currentUserId && !w.owner_id) ||
                (w.members || []).some((m: string) => {
                    try { return decodeURIComponent(m) === decodeURIComponent(currentUserAvatar) || m === currentUserAvatar; }
                    catch { return m === currentUserAvatar; }
                })
            );

            // 2. Fetch All User Data
            const { data: userData } = await supabase.from('app_users').select('*').order('full_name');
            let isolatedUsers = (userData || []) as any[];
            let finalUsers = isolatedUsers;

            if (!isDeveloper) {
                const myWsMemberAvatars = new Set<string>();
                myWorkspaces.forEach(ws => (ws.members || []).forEach((m: string) => myWsMemberAvatars.add(m)));
                finalUsers = isolatedUsers.filter(u =>
                    u.admin_id === currentUserId ||
                    u.id === currentUserId ||
                    Array.from(myWsMemberAvatars).some(m => {
                        try { return decodeURIComponent(m) === decodeURIComponent(u.avatar_url) || m === u.avatar_url; }
                        catch { return m === u.avatar_url; }
                    })
                );
            }

            // 3. Fetch Team Members & KPIs
            const [tmRes, kRes] = await Promise.all([
                supabase.from('team_members').select('*').eq('admin_id', tenantId),
                supabase.from('team_kpis').select('*')
            ]);

            // 4. Batch Updates
            setWorkspaces(myWorkspaces);
            setAllWorkspaces(wsData || []);
            setUsers(finalUsers as AppUser[]);
            if (tmRes.data) setTeamMembers(tmRes.data);
            if (kRes.data) setKpis(kRes.data);

            // Update Selected Workspace ONLY if it changed to avoid flickering
            if (myWorkspaces.length > 0) {
                if (!selectedWorkspace) {
                    setSelectedWorkspace(myWorkspaces[0]);
                } else {
                    const updatedSelected = myWorkspaces.find(w => w.id === selectedWorkspace.id);
                    if (updatedSelected) {
                        // Compare simple fields to avoid unnecessary state update
                        const hasChanged = updatedSelected.name !== selectedWorkspace.name ||
                            updatedSelected.description !== selectedWorkspace.description ||
                            (updatedSelected.members || []).length !== (selectedWorkspace.members || []).length;

                        if (hasChanged) {
                            setSelectedWorkspace(updatedSelected);
                        }
                    }
                }
            }

            // Update Admin Data
            const currentAdminData = finalUsers.find(u => u.id === currentUserId);
            if (currentAdminData) setCurrentAdmin(currentAdminData);
            else {
                const { data: me } = await supabase.from('app_users').select('*').eq('id', currentUserId).single();
                if (me) setCurrentAdmin(me);
            }
        } catch (err) {
            console.error("Error fetching team management data:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
            isFetching.current = false;
            hasLoadedOnce.current = true;
        }
    }, [selectedWorkspace, workspaces.length, users.length]);

    // Debounced version for realtime events
    const debouncedFetch = () => {
        if (fetchTimer.current) clearTimeout(fetchTimer.current);
        fetchTimer.current = setTimeout(() => {
            fetchData();
        }, 300); // 300ms debounce
    };

    useEffect(() => {
        fetchData();

        // Supabase Realtime
        const appUsersChannel = supabase.channel('team_mgmt_app_users')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, debouncedFetch)
            .subscribe();

        const workspacesChannel = supabase.channel('team_mgmt_workspaces')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces' }, debouncedFetch)
            .subscribe();

        return () => {
            if (fetchTimer.current) clearTimeout(fetchTimer.current);
            supabase.removeChannel(appUsersChannel);
            supabase.removeChannel(workspacesChannel);
        };
    }, [fetchData]);

    const getUserKPIs = (user: AppUser) => {
        const tm = teamMembers.find(t => t.full_name === user.full_name);
        if (!tm) return [];
        return kpis.filter(k => k.member_id === tm.id);
    };

    const getKPICompletion = (user: AppUser) => {
        const ukpis = getUserKPIs(user);
        if (ukpis.length === 0) return 0;
        const total = ukpis.reduce((sum, k) => sum + Math.min((k.target_value > 0 ? k.actual_value / k.target_value : 0) * 100, 100), 0);
        return Math.round(total / ukpis.length);
    };

    const currentWorkspaceUsers = users.filter(u =>
        selectedWorkspace?.members?.some(m => {
            try {
                return decodeURIComponent(u.avatar_url) === decodeURIComponent(m) || u.avatar_url === m;
            } catch {
                return u.avatar_url === m;
            }
        })
    );

    const filteredUsers = currentWorkspaceUsers.filter(u =>
        (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ===================================
    // NEW LOGIC: ADMIN ADDS USERS
    // ===================================
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ full_name: '', username: '', password: '' });
    const [inviting, setInviting] = useState(false);
    const [inviteSuccess, setInviteSuccess] = useState<{ username: string; password: string; fullName: string } | null>(null);

    const getLoginLink = () => {
        return `${window.location.origin}${window.location.pathname}#/login`;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: 'Info login berhasil disalin!' } }));
    };

    const handleCopyLoginInfo = () => {
        if (!inviteSuccess) return;
        const text = `Halo ${inviteSuccess.fullName},\n\nAkun Anda telah dibuat di Aruneeka.\n\nLink Login: ${getLoginLink()}\nUsername: ${inviteSuccess.username}\nPassword: ${inviteSuccess.password}\n\nSilakan login dan segera ganti password Anda.`;
        copyToClipboard(text);
    };

    const handleShareViaWhatsApp = () => {
        if (!inviteSuccess) return;
        const text = encodeURIComponent(
            `Halo ${inviteSuccess.fullName},\n\nAkun Anda telah dibuat di Aruneeka.\n\nLink Login: ${getLoginLink()}\nUsername: ${inviteSuccess.username}\nPassword: ${inviteSuccess.password}\n\nSilakan login dan segera ganti password Anda.`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWorkspace || !inviteForm.full_name || !inviteForm.username || !inviteForm.password) return;
        setInviting(true);

        const adminId = localStorage.getItem('user_id');
        const adminName = localStorage.getItem('user_name') || 'Admin';
        const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(inviteForm.full_name)}`;

        try {
            let insertData: any = {
                full_name: inviteForm.full_name,
                username: inviteForm.username.toLowerCase().replace(/\s/g, '_'),
                password: inviteForm.password,
                role: 'Member',
                avatar_url: avatarUrl,
                is_active: true,
                is_verified: true, // Admin-invited users are auto-verified
                subscription_start: new Date().toISOString(),
                parent_user_id: adminId, // Track parent admin
                invited_by: adminName // Track who invited
            };
            if (adminId) {
                insertData.admin_id = adminId;
            }

            const { data: newUser, error: insertError } = await supabase.from('app_users').insert([insertData]).select().single();
            if (insertError) throw insertError;

            // Automatically append this member's avatar to selectedWorkspace.members
            const updatedMembers = [...(selectedWorkspace.members || []), avatarUrl];
            const { error: wsError } = await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', selectedWorkspace.id);

            if (wsError) throw wsError;

            // Show success with login link
            setInviteSuccess({
                username: inviteForm.username.toLowerCase().replace(/\s/g, '_'),
                password: inviteForm.password,
                fullName: inviteForm.full_name
            });
            setInviteForm({ full_name: '', username: '', password: '' });
            fetchData();
        } catch (error: any) {
            console.error('Invite error', error);
            if (error?.message?.includes('admin_id') || error?.message?.includes('parent_user_id') || error?.message?.includes('invited_by')) {
                // Temporary fallback if columns are not yet migrated
                let insertData = {
                    full_name: inviteForm.full_name,
                    username: inviteForm.username.toLowerCase().replace(/\s/g, '_'),
                    password: inviteForm.password,
                    role: 'Member',
                    avatar_url: avatarUrl,
                    is_active: true,
                    is_verified: true,
                    subscription_start: new Date().toISOString()
                };
                const { error: fallbackError } = await supabase.from('app_users').insert([insertData]);
                if (!fallbackError) {
                    const updatedMembers = [...(selectedWorkspace.members || []), avatarUrl];
                    await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', selectedWorkspace.id);
                    setInviteSuccess({
                        username: inviteForm.username.toLowerCase().replace(/\s/g, '_'),
                        password: inviteForm.password,
                        fullName: inviteForm.full_name
                    });
                    setInviteForm({ full_name: '', username: '', password: '' });
                    fetchData();
                    return;
                }
            }
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Gagal menambahkan anggota. Cek apakah username sudah ada.' } }));
        } finally {
            setInviting(false);
        }
    };

    const handleOpenDetail = (user: AppUser) => {
        setSelectedUser(user);
        setNewPassword('');
        setShowPassword(false);
        setIsDetailOpen(true);
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !newPassword) return;

        setSaving(true);
        try {
            // Because passwords are plaintext in this MVP implementation
            const { error } = await supabase
                .from('app_users')
                .update({ password: newPassword })
                .eq('id', selectedUser.id);
            if (error) throw error;

            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: 'Password berhasil diperbarui.' } }));
            setNewPassword('');
            fetchData();
            // Automatically update the local selectedUser object so we can see it
            setSelectedUser(prev => prev ? { ...prev, password: newPassword } : null);
        } catch (error) {
            console.error(error);
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Gagal mengupdate password.' } }));
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveFromWorkspace = async () => {
        if (!selectedUser || !selectedWorkspace) return;
        if (!confirm(`Keluarkan ${selectedUser.full_name} dari workspace ${selectedWorkspace.name}?`)) return;

        try {
            const updatedMembers = (selectedWorkspace.members || []).filter(url => url !== selectedUser.avatar_url);

            const { error } = await supabase
                .from('workspaces')
                .update({ members: updatedMembers })
                .eq('id', selectedWorkspace.id);
            if (error) throw error;

            // Local state update before refresh to make it snappier
            setSelectedWorkspace(prev => prev ? { ...prev, members: updatedMembers } : null);
            setIsDetailOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Gagal mengeluarkan anggota.' } }));
        }
    };

    const handleAddToOtherWorkspace = async (workspaceId: string) => {
        if (!selectedUser) return;
        const wsToUpdate = allWorkspaces.find(w => w.id === workspaceId);
        if (!wsToUpdate) return;
        if (wsToUpdate.members?.includes(selectedUser.avatar_url)) {
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'User sudah ada di workspace ini.' } }));
            return;
        }

        const updatedMembers = [...(wsToUpdate.members || []), selectedUser.avatar_url];
        const { error } = await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', workspaceId);
        if (error) {
            console.error(error);
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Gagal menambahkan ke workspace.' } }));
        } else {
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'success', message: 'Berhasil mengundang ke workspace!' } }));
            fetchData();
        }
    };

    const handleRemoveFromSpecificWorkspace = async (wsId: string, wsName: string) => {
        if (!selectedUser) return;
        if (!confirm(`Hapus ${selectedUser.full_name} dari workspace "${wsName}"?`)) return;
        const ws = allWorkspaces.find(w => w.id === wsId);
        if (!ws) return;
        const updatedMembers = (ws.members || []).filter(m => m !== selectedUser.avatar_url);
        const { error } = await supabase.from('workspaces').update({ members: updatedMembers }).eq('id', wsId);
        if (error) { console.error(error); window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Gagal menghapus dari workspace.' } })); }
        else { fetchData(); }
    };

    const handleAddKPI = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setAddingKPI(true);
        try {
            // Try to find existing team_member record
            let tm = teamMembers.find(t =>
                t.full_name === selectedUser.full_name ||
                t.avatar_url === selectedUser.avatar_url
            );

            // Auto-create if not found
            if (!tm) {
                const tenantId = localStorage.getItem('tenant_id') || localStorage.getItem('user_id');
                const { data: newTm, error: tmErr } = await supabase.from('team_members').insert([{
                    full_name: selectedUser.full_name,
                    role: selectedUser.role || 'Member',
                    department: '',
                    avatar_url: selectedUser.avatar_url,
                    admin_id: tenantId,
                    status: 'active'
                }]).select().single();
                if (tmErr) throw new Error('Gagal membuat team member record: ' + tmErr.message);
                tm = newTm;
                setTeamMembers(prev => [...prev, newTm]);
            }

            const { error } = await supabase.from('team_kpis').insert([{
                member_id: tm.id,
                metric_name: kpiForm.metric_name,
                category: kpiForm.category,
                target_value: kpiForm.target_value,
                actual_value: kpiForm.actual_value,
                unit: kpiForm.unit,
                period: kpiForm.period,
                period_date: kpiForm.period_date,
                notes: kpiForm.notes
            }]);
            if (error) throw error;
            await notifyByMention(kpiForm.notes, kpiForm.metric_name);
            setKpiForm({ metric_name: '', category: 'General', target_value: 100, actual_value: 0, unit: '%', period: 'Monthly', period_date: new Date().toISOString().split('T')[0], notes: '' });
            setShowAddKPI(false);
            fetchData();
        } catch (err: any) { console.error(err); window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Gagal menambahkan KPI: ' + (err?.message || '') } })); }
        finally { setAddingKPI(false); }
    };

    const handleOpenEditKPI = (kpi: KPI) => {
        setEditingKPIId(kpi.id);
        setEditKPIForm({
            metric_name: kpi.metric_name,
            category: kpi.category,
            target_value: kpi.target_value,
            actual_value: kpi.actual_value,
            unit: kpi.unit,
            period: kpi.period,
            period_date: kpi.period_date ?? new Date().toISOString().split('T')[0],
            notes: kpi.notes ?? '',
        });
    };

    const handleSaveEditKPI = async (kpiId: string) => {
        setSavingEditKPI(true);
        try {
            const { error } = await supabase.from('team_kpis').update({
                metric_name: editKPIForm.metric_name,
                category: editKPIForm.category,
                target_value: editKPIForm.target_value,
                actual_value: editKPIForm.actual_value,
                unit: editKPIForm.unit,
                period: editKPIForm.period,
                period_date: editKPIForm.period_date,
                notes: editKPIForm.notes,
            }).eq('id', kpiId);
            if (error) throw error;
            await notifyByMention(editKPIForm.notes, editKPIForm.metric_name);
            setEditingKPIId(null);
            fetchData();
        } catch (err: any) { window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Gagal menyimpan: ' + err?.message } })); }
    };

    const handleSendUpgradeRequest = async () => {
        if (!currentAdmin || !selectedPkgId || !upgradeOrderId) {
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Pilih paket dan masukkan Order ID!' } }));
            return;
        }

        const pkg = [...(config?.payment_config?.teamPackages || []), ...(config?.payment_config?.personalPackages || [])].find(p => p.id === selectedPkgId);

        setRequestingUpgrade(true);
        try {
            const { error } = await supabase.from('developer_inbox').insert([{
                sender_name: currentAdmin.full_name,
                sender_email: currentAdmin.email,
                sender_username: currentAdmin.username,
                subscription_code: upgradeOrderId,
                user_id: currentAdmin.id,
                message: `PERMINTAAN UPGRADE/TAMBAH KUOTA:\nPaket yang dipilih: ${pkg?.name}\nOrder ID: ${upgradeOrderId}\nUser ingin menambah kapasitas tim.`,
                is_read: false,
                is_resolved: false
            }]);

            if (error) throw error;
            setUpgradeStep('success');
        } catch (err: any) {
            window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Gagal mengirim permintaan: ' + err.message } }));
        } finally {
            setRequestingUpgrade(false);
        }
    };

    const handleWhatsAppFollowUp = () => {
        const waNumber = config?.payment_config?.whatsappNumber || '6289619941101';
        const msg = encodeURIComponent(`Halo Developer,\n\nSaya ${currentAdmin?.full_name} (@${currentAdmin?.username}) telah melakukan pembayaran untuk upgrade paket ke ${[...(config?.payment_config?.teamPackages || []), ...(config?.payment_config?.personalPackages || [])].find(p => p.id === selectedPkgId)?.name}.\n\nOrder ID: ${upgradeOrderId}\n\nMohon diverifikasi. Terima kasih!`);
        window.open(`https://wa.me/${waNumber}?text=${msg}`, '_blank');
    };

    const handleUpgradePackage = () => {
        setUpgradeStep('payment');
    };

    const userRole = localStorage.getItem('user_role');
    const isDeveloper = userRole === 'Developer';
    const subUsersCount = users.filter(u => u.parent_user_id === currentAdmin?.id && u.role !== 'Admin').length;
    const isLimitReached = !isDeveloper && subUsersCount >= (currentAdmin?.member_limit || 2);

    return (
        <div className="space-y-6 pb-0 animate-in fade-in duration-300 relative w-full flex-1 flex flex-col min-h-0">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
                <div>
                    <h2 className="text-4xl md:text-4xl font-heading font-black text-slate-900 tracking-tight flex items-center gap-3">
                        {config?.page_titles?.['team']?.title || 'Team Management'}
                    </h2>
                    <p className="text-slate-500 font-bold mt-2">{config?.page_titles?.['team']?.subtitle || 'Kelola akses anggota dalam workspace spesifik Anda.'}</p>
                </div>
                <div className="flex z-10 items-center gap-3">
                    {currentAdmin && (
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kapasitas Tim</span>
                            <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${isLimitReached ? 'bg-red-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.min((subUsersCount / (currentAdmin.member_limit || 2)) * 100, 100)}%` }}
                                    />
                                </div>
                                <span className={`text-xs font-black ${isLimitReached ? 'text-red-500' : 'text-slate-700'}`}>
                                    {isDeveloper ? 'Unlimited' : `${subUsersCount}/${currentAdmin.member_limit || 2}`}
                                </span>
                            </div>
                        </div>
                    )}
                    <Button
                        className={`${isLimitReached ? 'bg-slate-400 hover:bg-slate-400 border-slate-500 grayscale' : 'whitespace-nowrap'} shadow-[4px_4px_0px_0px_#0f172a] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all`}
                        onClick={() => {
                            if (isLimitReached) {
                                setIsUpgradeModalOpen(true);
                                return;
                            }
                            if (!selectedWorkspace) {
                                window.dispatchEvent(new CustomEvent('app-alert', { detail: { type: 'error', message: 'Pilih Workspace di kiri dulu!' } }));
                                return;
                            }
                            setIsInviteOpen(!isInviteOpen);
                        }}
                    >
                        {isLimitReached ? 'Kuota Penuh (Upgrade)' : '+ Mendaftarkan Anggota'}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                {/* LEFT: WORKSPACES LIST */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4 min-h-0">
                    <div className="bg-card rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a] overflow-hidden flex flex-col h-full">
                        <div className="p-4 bg-primary flex items-center gap-3">
                            <Layers className="text-white" size={24} />
                            <h3 className="font-heading font-black text-white text-lg">Workspace</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-500/5">
                            {loading && !workspaces.length ? (
                                <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" /></div>
                            ) : workspaces.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 font-bold">Tidak ada workspace ditemukan.</div>
                            ) : (
                                workspaces.map(ws => (
                                    <button
                                        key={ws.id}
                                        onClick={() => setSelectedWorkspace(ws)}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${selectedWorkspace?.id === ws.id
                                            ? 'bg-card border-slate-900 shadow-[4px_4px_0px_#0f172a] transform -translate-y-1'
                                            : 'bg-card border-transparent hover:border-slate-300 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-lg bg-pink-500/10 border-2 border-pink-500/20 flex items-center justify-center flex-shrink-0">
                                                <Globe className="text-pink-500" size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-heading font-black text-foreground truncate">{ws.name}</h4>
                                                <p className="text-xs font-bold text-slate-500">{ws.members?.length || 0} Members</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={20} className={selectedWorkspace?.id === ws.id ? 'text-accent' : 'text-slate-300'} />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: USERS LIST IN WORKSPACE */}
                <div className="w-full lg:w-2/3 flex flex-col min-h-0">
                    <div className="bg-card rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_#0f172a] overflow-hidden flex flex-col h-full">
                        <div className="px-6 py-5 border-b-4 border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between bg-accent relative gap-4">
                            {/* Geometric detail */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full pointer-events-none"></div>

                            <div className="flex items-center gap-3 relative z-10">
                                <div className="bg-white p-2 border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_#0f172a]">
                                    <Users className="text-slate-800" size={20} />
                                </div>
                                <h3 className="font-heading font-black text-white text-xl">
                                    Anggota di Workspace {selectedWorkspace ? selectedWorkspace.name : '...'}
                                </h3>
                            </div>

                            {/* SEARCH BAR (Button moved out) */}
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto z-10">
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Cari anggota tim..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white border-2 border-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-[2px_2px_0px_#0f172a]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Invite Form inline dropdown */}
                        {isInviteOpen && selectedWorkspace && (
                            <div className="bg-emerald-500/10 border-b-4 border-slate-900 border-dashed p-6 animate-in fade-in slide-in-from-top-4">
                                {inviteSuccess ? (
                                    /* Success Panel with Login Link */
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-400 rounded-full flex items-center justify-center border-2 border-slate-900">
                                                <Plus size={20} className="text-slate-900" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-foreground text-sm">✅ Berhasil Mendaftarkan {inviteSuccess.fullName}!</h4>
                                                <p className="text-xs text-slate-400 font-medium">Kirimkan informasi login berikut ke anggota baru:</p>
                                            </div>
                                        </div>

                                        <div className="bg-card border-2 border-slate-900 rounded-xl p-4 space-y-2 shadow-[2px_2px_0px_#0f172a]">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Link Login</span>
                                            </div>
                                            <p className="text-sm font-mono font-bold text-blue-500 break-all">{getLoginLink()}</p>
                                            <div className="border-t border-slate-800 pt-2 mt-2 grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Username</span>
                                                    <p className="font-black text-foreground">{inviteSuccess.username}</p>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</span>
                                                    <p className="font-black text-foreground">{inviteSuccess.password}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleCopyLoginInfo}
                                                className="flex-1 px-4 py-2.5 bg-card text-foreground font-bold text-xs rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] hover:bg-slate-500/10 transition-colors flex items-center justify-center gap-2"
                                            >
                                                📋 Salin Info Login
                                            </button>
                                            <button
                                                onClick={handleShareViaWhatsApp}
                                                className="flex-1 px-4 py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-xl border-2 border-emerald-700 hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                                            >
                                                📱 Kirim via WhatsApp
                                            </button>
                                            <button
                                                onClick={() => { setInviteSuccess(null); setIsInviteOpen(false); }}
                                                className="px-4 py-2.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-300 transition-colors"
                                            >
                                                Tutup
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Invite Form */
                                    <form onSubmit={handleInviteUser}>
                                        <h4 className="font-black text-foreground mb-4 tracking-wide text-sm flex items-center gap-2">
                                            <UserMinus size={16} />
                                            Daftarkan & Undang Member Baru
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <input type="text" value={inviteForm.full_name} onChange={e => setInviteForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Nama Lengkap" required className="bg-transparent border-2 border-slate-900 rounded-xl px-4 py-2 text-sm font-bold text-foreground shadow-[2px_2px_0px_#0f172a] focus:outline-none focus:ring-2 focus:ring-accent" />
                                            <input type="text" value={inviteForm.username} onChange={e => setInviteForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/\s/g, '_') }))} placeholder="Username Login" required className="bg-transparent border-2 border-slate-900 rounded-xl px-4 py-2 text-sm font-bold text-foreground shadow-[2px_2px_0px_#0f172a] focus:outline-none focus:ring-2 focus:ring-accent" />
                                            <input type="password" value={inviteForm.password} onChange={e => setInviteForm(p => ({ ...p, password: e.target.value }))} placeholder="Password Sementara" required className="bg-transparent border-2 border-slate-900 rounded-xl px-4 py-2 text-sm font-bold text-foreground shadow-[2px_2px_0px_#0f172a] focus:outline-none focus:ring-2 focus:ring-accent" />
                                        </div>
                                        <div className="mt-4 flex gap-3">
                                            <Button type="submit" disabled={inviting}>
                                                {inviting ? <Loader2 className="animate-spin" size={16} /> : 'Daftarkan & Tambahkan'}
                                            </Button>
                                            <Button type="button" variant="secondary" onClick={() => setIsInviteOpen(false)}>Batal</Button>
                                        </div>
                                        <p className="text-xs text-slate-400 font-bold mt-3">User yang didaftarkan oleh Admin otomatis terverifikasi dan bisa langsung login. Link login akan ditampilkan setelah berhasil.</p>
                                    </form>
                                )}
                            </div>
                        )}

                        {/* List Area */}
                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3 relative">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-slate-400 z-10" size={32} />
                                </div>
                            ) : !selectedWorkspace ? (
                                <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-400">
                                    <Briefcase size={48} className="mb-2 opacity-50" />
                                    <p className="font-bold">Pilih workspace di panel kiri</p>
                                </div>
                            ) : filteredUsers.length === 0 && !refreshing ? (
                                <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-400">
                                    <Users size={48} className="mb-2 opacity-50" />
                                    <p className="font-bold">Belum ada anggota di workspace ini</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {filteredUsers.map(user => {
                                        const rate = getKPICompletion(user);
                                        return (
                                            <div
                                                key={user.id}
                                                className="bg-card border-2 border-slate-900 rounded-xl p-3 flex flex-col gap-2 cursor-pointer hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#0f172a] shadow-[2px_2px_0px_#0f172a] transition-all group"
                                                onClick={() => handleOpenDetail(user)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="relative shrink-0 transition-transform group-hover:-rotate-3">
                                                        <img
                                                            src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name || 'U')}`}
                                                            className="w-9 h-9 rounded-xl border-2 border-slate-900 object-cover"
                                                            alt="Avatar"
                                                        />
                                                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${user.online_status === 'online' ? 'bg-emerald-500' : user.online_status === 'idle' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-black text-xs text-foreground truncate leading-tight">{user.full_name}</p>
                                                        <p className="text-[10px] font-bold text-slate-500 truncate">@{user.username}</p>
                                                    </div>
                                                </div>
                                                <span className={`self-start inline-block px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase border border-slate-900 ${user.role === 'Developer' ? 'bg-slate-900 text-white' :
                                                    user.role === 'Admin' || user.role === 'Owner' ? 'bg-accent text-white' :
                                                        'bg-slate-50 text-slate-700'
                                                    }`}>{user.role}</span>
                                                <div>
                                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                        <div className={`h-full rounded-full ${rate >= minCompletionRate ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-400' : 'bg-red-500'
                                                            }`} style={{ width: `${rate}%` }} />
                                                    </div>
                                                    <p className={`text-[10px] font-bold text-right mt-0.5 ${rate >= minCompletionRate ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-red-500'
                                                        }`}>{rate}%</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* DETAIL MODAL */}
            <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Manajemen Anggota Tim" maxWidth="max-w-5xl">
                {selectedUser && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                        {/* LEFT COL */}
                        <div className="space-y-6">
                            {/* Header User */}
                            <div className="flex items-start gap-4 p-4 border-2 border-border rounded-2xl bg-muted relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl"></div>
                                <img src={selectedUser.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedUser.full_name || 'U')}`}
                                    className="w-16 h-16 rounded-xl border-2 border-border shadow-sm object-cover relative z-10 bg-card" alt="Avatar" />
                                <div className="relative z-10 w-full">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="text-xl font-heading font-black text-foreground">{selectedUser.full_name}</h3>
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${selectedUser.online_status === 'online' ? 'text-emerald-500' : selectedUser.online_status === 'idle' ? 'text-amber-500' : 'text-slate-400'}`}>
                                            <div className={`w-2 h-2 rounded-full ${selectedUser.online_status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : selectedUser.online_status === 'idle' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                                            {selectedUser.online_status === 'online' ? 'Online' : selectedUser.online_status === 'idle' ? 'Idle' : 'Offline'}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-mutedForeground mb-1 flex items-center gap-2">
                                        @{selectedUser.username}
                                        {selectedUser.last_activity_at && selectedUser.online_status !== 'online' && (
                                            <span className="text-[10px] font-bold text-slate-400">
                                                (Aktif: {new Date(selectedUser.last_activity_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})
                                            </span>
                                        )}
                                    </p>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-black bg-accent text-white border-accent shadow-sm">
                                        {selectedUser.role}
                                    </span>
                                </div>
                            </div>

                            {/* Reset Password */}
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-foreground mb-2 uppercase tracking-wide">
                                    <Key size={16} /> Password User
                                </h4>
                                <div className="bg-card rounded-2xl border-2 border-border shadow-sm p-4">
                                    <div className="mb-4">
                                        <p className="text-sm font-bold text-mutedForeground mb-2">Password Saat Ini:</p>
                                        <div className="flex justify-between items-center bg-muted border-2 border-border p-3 rounded-xl shadow-inner">
                                            <span className="font-mono font-bold text-foreground">
                                                {showPassword ? selectedUser.password : '••••••••'}
                                            </span>
                                            <button onClick={() => setShowPassword(!showPassword)} className="text-mutedForeground hover:text-foreground">
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <form onSubmit={handleUpdatePassword} className="border-t-2 border-border pt-4 flex gap-3">
                                        <input
                                            type="text"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            placeholder="Ketik password baru..."
                                            required
                                            className="flex-1 bg-muted border-2 border-border rounded-xl px-4 py-2 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-accent shadow-sm placeholder:text-mutedForeground"
                                        />
                                        <Button type="submit" disabled={saving || !newPassword}>
                                            {saving ? <Loader2 className="animate-spin" size={16} /> : 'Ubah Password'}
                                        </Button>
                                    </form>
                                </div>
                            </div>

                            {/* WORKSPACES INFO & INVITE */}
                            <div className="space-y-3 pt-4 border-t-2 border-border">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-foreground mb-2 uppercase tracking-wide">
                                    <Globe size={16} /> Workspaces
                                </h4>
                                {/* Workspace tags with individual remove button */}
                                <div className="flex flex-wrap gap-2">
                                    {allWorkspaces.filter(ws => ws.members?.includes(selectedUser.avatar_url)).map(ws => (
                                        <span key={ws.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-card border-2 border-border rounded-lg text-xs font-bold text-foreground shadow-sm">
                                            {ws.name}
                                            <button
                                                onClick={() => handleRemoveFromSpecificWorkspace(ws.id, ws.name)}
                                                className="text-mutedForeground hover:text-red-500 transition-colors ml-0.5"
                                                title={`Hapus dari ${ws.name}`}
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                    {allWorkspaces.filter(ws => ws.members?.includes(selectedUser.avatar_url)).length === 0 && (
                                        <p className="text-xs text-mutedForeground italic">Tidak ada workspace</p>
                                    )}
                                </div>

                                {/* Add to Workspace feature */}
                                <div className="bg-emerald-500/10 rounded-2xl border-2 border-emerald-500/20 p-3">
                                    <p className="text-xs font-bold text-emerald-500 mb-2">Undang ke workspace lain:</p>
                                    <div className="flex gap-2 items-center">
                                        <select
                                            id="ws-select"
                                            className="flex-1 bg-muted/50 border-2 border-border rounded-xl px-3 py-2 text-sm font-bold text-foreground shadow-sm appearance-none"
                                        >
                                            <option value="">-- Pilih Workspace --</option>
                                            {allWorkspaces.filter(ws => !ws.members?.includes(selectedUser.avatar_url)).map(ws => (
                                                <option key={ws.id} value={ws.id}>{ws.name}</option>
                                            ))}
                                        </select>
                                        <Button onClick={() => {
                                            const selectEl = document.getElementById('ws-select') as HTMLSelectElement;
                                            if (selectEl && selectEl.value) handleAddToOtherWorkspace(selectEl.value);
                                        }}>Undang</Button>
                                    </div>
                                </div>
                            </div>

                            {/* Hapus dari workspace aktif */}
                            <div className="pt-4 border-t-2 border-border">
                                <div className="bg-red-500/10 rounded-2xl border-2 border-red-500/30 p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
                                    <p className="text-xs font-bold text-red-500">
                                        Keluarkan dari workspace <span className="italic">{selectedWorkspace?.name}</span>.
                                    </p>
                                    <button
                                        onClick={handleRemoveFromWorkspace}
                                        className="whitespace-nowrap bg-card text-red-500 hover:bg-red-500 hover:text-white font-black text-xs px-4 py-2.5 rounded-xl border-2 border-red-500/50 shadow-sm transition-all hover:translate-y-[2px] hover:shadow-none"
                                    >
                                        <UserMinus size={14} className="inline mr-1" /> Keluarkan
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COL - KPI */}
                        <div className="space-y-4 bg-muted/30 p-6 rounded-2xl border-2 border-border shadow-sm h-full flex flex-col">
                            {/* KPI Header */}
                            <div className="pb-3 border-b-2 border-border">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-heading font-black text-xl text-foreground">Daftar KPI</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm px-3 py-1 bg-accent text-white rounded-full shadow-[2px_2px_0px_#0f172a]">
                                            {getKPICompletion(selectedUser)}% Selesai
                                        </span>
                                        <button
                                            onClick={() => setShowAddKPI(!showAddKPI)}
                                            className="p-1.5 bg-emerald-500 text-white rounded-lg border-2 border-emerald-600 shadow-sm hover:bg-emerald-600 transition-colors"
                                            title="Tambah KPI"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                                {/* Min Completion Rate setter */}
                                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                                    <Target size={14} className="text-amber-500 shrink-0" />
                                    <span className="text-xs font-bold text-amber-500">Completion min:</span>
                                    <input
                                        type="number"
                                        min={0} max={100}
                                        value={minCompletionRate}
                                        onChange={e => setMinCompletionRate(Number(e.target.value))}
                                        className="w-16 bg-card border mx-2 border-amber-500/30 rounded px-2 py-0.5 text-xs font-black text-amber-500 text-center focus:outline-none"
                                    />
                                    <span className="text-xs font-bold text-amber-500">%</span>
                                </div>
                                {/* Add KPI Form */}
                                {showAddKPI && (
                                    <form onSubmit={handleAddKPI} className="mt-3 bg-white border-2 border-slate-900 rounded-xl p-4 space-y-3 shadow-[3px_3px_0px_#0f172a] animate-in fade-in slide-in-from-top-2">
                                        <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Tambah KPI Baru</p>
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                                            {/* Nama Metrik */}
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-0.5">Nama Metrik *</label>
                                                <input required placeholder="Contoh: Jumlah Post, Revenue, dll." value={kpiForm.metric_name} onChange={e => setKpiForm(p => ({ ...p, metric_name: e.target.value }))} className="w-full border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:bg-yellow-50" />
                                            </div>
                                            {/* Kategori */}
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-0.5">Kategori</label>
                                                <input placeholder="General, Sales, dll." value={kpiForm.category} onChange={e => setKpiForm(p => ({ ...p, category: e.target.value }))} className="w-full border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:bg-yellow-50" />
                                            </div>
                                            {/* Periode */}
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-0.5">Periode</label>
                                                <select value={kpiForm.period} onChange={e => setKpiForm(p => ({ ...p, period: e.target.value }))} className="w-full border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold bg-white focus:outline-none focus:bg-yellow-50">
                                                    <option>Monthly</option>
                                                    <option>Quarterly</option>
                                                    <option>Yearly</option>
                                                    <option>Weekly</option>
                                                </select>
                                            </div>
                                            {/* Target */}
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-0.5">Target</label>
                                                <input type="number" min={0} placeholder="100" value={kpiForm.target_value} onChange={e => setKpiForm(p => ({ ...p, target_value: Number(e.target.value) }))} className="w-full border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:bg-yellow-50" />
                                            </div>
                                            {/* Aktual */}
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-0.5">Nilai Aktual</label>
                                                <input type="number" min={0} placeholder="0" value={kpiForm.actual_value} onChange={e => setKpiForm(p => ({ ...p, actual_value: Number(e.target.value) }))} className="w-full border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:bg-yellow-50" />
                                            </div>
                                            {/* Unit */}
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-0.5">Satuan (Unit)</label>
                                                <input placeholder="%, pcs, rupiah, post, dll." value={kpiForm.unit} onChange={e => setKpiForm(p => ({ ...p, unit: e.target.value }))} className="w-full border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:bg-yellow-50" />
                                            </div>
                                            {/* Tanggal Periode */}
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block mb-0.5">Tanggal Periode</label>
                                                <input type="date" value={kpiForm.period_date} onChange={e => setKpiForm(p => ({ ...p, period_date: e.target.value }))} className="w-full border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:bg-yellow-50" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button type="submit" disabled={addingKPI} className="text-xs py-1.5">{addingKPI ? <Loader2 className="animate-spin" size={14} /> : 'Simpan KPI'}</Button>
                                            <Button type="button" variant="secondary" onClick={() => setShowAddKPI(false)} className="text-xs py-1.5">Batal</Button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            {/* KPI List */}
                            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 min-h-[300px]">
                                {getUserKPIs(selectedUser).length === 0 ? (
                                    <div className="text-slate-400 font-bold text-center py-10">
                                        <Target className="mx-auto mb-2 opacity-40" size={32} />
                                        Belum ada KPI terdaftar
                                    </div>
                                ) : (
                                    getUserKPIs(selectedUser).map(kpi => {
                                        const progress = kpi.target_value > 0 ? (kpi.actual_value / kpi.target_value) * 100 : 0;
                                        const pVal = Math.min(progress, 100);
                                        const isSuccess = pVal >= minCompletionRate;
                                        const isEditingThis = editingKPIId === kpi.id;
                                        return (
                                            <div key={kpi.id} className={`bg-card p-4 rounded-xl border-2 transition-colors ${isEditingThis ? 'border-violet-400 shadow-[2px_2px_0px_#7c3aed]' : 'border-slate-200 hover:border-slate-900'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h5 className="font-bold text-foreground text-sm truncate pr-2">{kpi.metric_name}</h5>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${isSuccess ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' : 'bg-red-500/10 text-red-500 border-red-500/10'
                                                            }`}>{isSuccess ? '✓ Berhasil' : '✗ Perlu Ditingkatkan'}</span>
                                                        <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-700 shadow-sm">{kpi.period}</span>
                                                        {/* Edit button */}
                                                        {!isEditingThis ? (
                                                            <button
                                                                onClick={() => handleOpenEditKPI(kpi)}
                                                                className="p-1.5 hover:bg-violet-50 text-slate-400 hover:text-violet-600 rounded-lg transition-colors"
                                                                title="Edit KPI"
                                                            >
                                                                <Edit3 size={12} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setEditingKPIId(null)}
                                                                className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors"
                                                                title="Tutup"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-end mb-1">
                                                    <span className="text-xs font-bold text-slate-500">{kpi.category}</span>
                                                    <span className="text-xs font-black text-foreground">{kpi.actual_value} / {kpi.target_value} {kpi.unit}</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2 border border-slate-200 overflow-hidden">
                                                    <div className={`h-2 rounded-full ${pVal >= minCompletionRate ? 'bg-emerald-500' : pVal >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pVal}%` }} />
                                                </div>

                                                {/* Inline Edit Form */}
                                                {isEditingThis && (
                                                    <div className="mt-3 pt-3 border-t-2 border-violet-100 space-y-2 animate-in fade-in slide-in-from-top-2">
                                                        <p className="text-[10px] font-black text-violet-600 uppercase tracking-wide">Edit KPI</p>
                                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                                                            <div className="col-span-2">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Nama Metrik</label>
                                                                <input value={editKPIForm.metric_name} onChange={e => setEditKPIForm(p => ({ ...p, metric_name: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-violet-400" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Kategori</label>
                                                                <input value={editKPIForm.category} onChange={e => setEditKPIForm(p => ({ ...p, category: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-violet-400" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-black text-slate-500 uppercase block mb-0.5">Periode</label>
                                                                <select value={editKPIForm.period} onChange={e => setEditKPIForm(p => ({ ...p, period: e.target.value }))} className="w-full border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold bg-transparent text-foreground focus:outline-none focus:border-violet-400">
                                                                    <option className="bg-card">Monthly</option>
                                                                    <option className="bg-card">Quarterly</option>
                                                                    <option className="bg-card">Yearly</option>
                                                                    <option className="bg-card">Weekly</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Tanggal Periode</label>
                                                                <input type="date" value={editKPIForm.period_date} onChange={e => setEditKPIForm(p => ({ ...p, period_date: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-violet-400" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Target</label>
                                                                <input type="number" min={0} value={editKPIForm.target_value} onChange={e => setEditKPIForm(p => ({ ...p, target_value: Number(e.target.value) }))} className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-violet-400" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Aktual</label>
                                                                <input type="number" min={0} value={editKPIForm.actual_value} onChange={e => setEditKPIForm(p => ({ ...p, actual_value: Number(e.target.value) }))} className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-violet-400" />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Satuan (Unit)</label>
                                                                <input value={editKPIForm.unit} onChange={e => setEditKPIForm(p => ({ ...p, unit: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-violet-400" />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Catatan</label>
                                                                <input placeholder="Catatan..." value={editKPIForm.notes} onChange={e => setEditKPIForm(p => ({ ...p, notes: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-violet-400" />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleSaveEditKPI(kpi.id)}
                                                            disabled={savingEditKPI}
                                                            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-black transition-colors"
                                                        >
                                                            {savingEditKPI ? <Loader2 className="animate-spin" size={11} /> : <Save size={11} />}
                                                            {savingEditKPI ? 'Menyimpan...' : 'Simpan Perubahan'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
            {/* UPGRADE PACKAGE MODAL */}
            <Modal
                isOpen={isUpgradeModalOpen}
                onClose={() => {
                    setIsUpgradeModalOpen(false);
                    setTimeout(() => setUpgradeStep('info'), 300);
                }}
                title={upgradeStep === 'success' ? 'Permintaan Terkirim' : 'Upgrade Kuota Tim'}
                maxWidth="max-w-md"
            >
                {upgradeStep === 'info' && (
                    <div className="flex flex-col items-center justify-center text-center space-y-5 p-4 animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-[4px_4px_0px_#0f172a]">
                            <Users size={40} className="text-amber-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-900 font-heading tracking-tight">Kuota Tim Tercapai</h3>
                            <p className="text-sm font-bold text-slate-500 leading-relaxed">
                                Batas maksimal anggota tim Anda ({currentAdmin?.member_limit || 2} orang) telah terpenuhi.
                                Silakan upgrade paket Anda untuk menambah kapasitas anggota.
                            </p>
                        </div>

                        <div className="w-full bg-slate-50 border-4 border-slate-900 rounded-2xl p-4 text-left my-2 shadow-[4px_4px_0px_#0f172a]">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black uppercase text-slate-400">Status Saat Ini</span>
                                <span className="text-[10px] font-black uppercase bg-slate-900 text-white px-2 py-0.5 rounded">{currentAdmin?.subscription_package}</span>
                            </div>
                            <p className="text-sm font-black text-slate-700">Penggunaan: {subUsersCount}/{currentAdmin?.member_limit || 2} Orang</p>
                        </div>

                        <div className="grid grid-cols-1 w-full gap-3">
                            <Button
                                onClick={handleUpgradePackage}
                                className="w-full h-12 text-sm font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 border-emerald-700 shadow-[4px_4px_0px_#064e3b]"
                            >
                                Upgrade Sekarang
                            </Button>
                            <button
                                onClick={() => setIsUpgradeModalOpen(false)}
                                className="w-full h-12 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Nanti Saja
                            </button>
                        </div>
                    </div>
                )}

                {upgradeStep === 'payment' && (
                    <div className="p-4 space-y-5 animate-in slide-in-from-right duration-300">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Pilih Paket Baru</label>
                                <select
                                    value={selectedPkgId}
                                    onChange={e => setSelectedPkgId(e.target.value)}
                                    className="w-full bg-slate-50 border-4 border-slate-900 rounded-xl p-3 text-sm font-black focus:outline-none focus:ring-4 focus:ring-accent/10"
                                >
                                    <option value="">-- Pilih Paket --</option>
                                    {config?.payment_config?.teamPackages?.map((pkg: any) => (
                                        <option key={pkg.id} value={pkg.id}>
                                            {pkg.name} - Rp {pkg.price.toLocaleString('id-ID')}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedPkgId && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="bg-slate-900 text-white rounded-2xl p-4 border-4 border-slate-800 shadow-[4px_4px_0px_#334155]">
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Informasi Pembayaran</p>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black">{config?.payment_config?.bankName || 'BANK MANDIRI'}</p>
                                            <p className="text-xl font-mono font-black tracking-wider text-accent">{config?.payment_config?.accountNumber || '1234567890'}</p>
                                            <p className="text-xs font-bold text-slate-300 uppercase">A.N {config?.payment_config?.accountName || 'DEVELOPER ARUNEEKA'}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                            <Key size={12} /> Masukkan Order ID Invoice / Bukti Bayar
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="CONTOH: ORDER-001"
                                            value={upgradeOrderId}
                                            onChange={e => setUpgradeOrderId(e.target.value.toUpperCase())}
                                            className="w-full bg-amber-50 border-4 border-amber-400 rounded-xl p-3 text-lg font-black text-center tracking-widest focus:outline-none focus:bg-white uppercase"
                                        />
                                        <p className="text-[9px] font-bold text-slate-400 mt-2 leading-tight italics">
                                            * Masukkan kode yang Anda terima setelah pembayaran sukses. Permintaan akan diverifikasi dalam 1x24 jam.
                                        </p>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => setUpgradeStep('info')}
                                            className="px-6 py-3 border-4 border-slate-900 rounded-xl font-black text-xs uppercase"
                                        >
                                            Kembali
                                        </button>
                                        <Button
                                            onClick={handleSendUpgradeRequest}
                                            disabled={requestingUpgrade || !selectedPkgId || !upgradeOrderId}
                                            className="flex-1 shadow-[4px_4px_0px_#0f172a]"
                                        >
                                            {requestingUpgrade ? <Loader2 size={16} className="animate-spin" /> : 'Kirim Permintaan'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {upgradeStep === 'success' && (
                    <div className="flex flex-col items-center justify-center text-center space-y-6 p-6 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-[4px_4px_0px_#064e3b]">
                            <Save size={40} className="text-emerald-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-900 font-heading">Permintaan Terkirim!</h3>
                            <p className="text-sm font-bold text-slate-500 leading-relaxed">
                                Bukti pembayaran Anda telah masuk ke antrean verifikasi Developer. Akun Anda akan di-upgrade secara otomatis setelah divalidasi.
                            </p>
                        </div>

                        <div className="w-full space-y-3">
                            <Button
                                onClick={handleWhatsAppFollowUp}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 border-emerald-700 shadow-[4px_4px_0px_#064e3b]"
                            >
                                Konfirmasi via WhatsApp
                            </Button>
                            <button
                                onClick={() => setIsUpgradeModalOpen(false)}
                                className="w-full py-3 text-xs font-black uppercase text-slate-400 hover:text-slate-900"
                            >
                                Tutup Halaman
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
