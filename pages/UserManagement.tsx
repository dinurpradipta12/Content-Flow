import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../services/supabaseClient';
import { Users, Trash2, RefreshCw, Loader2, Shield } from 'lucide-react';

interface AppUser {
    id: string;
    username: string;
    role: string;
    full_name: string;
    avatar_url: string;
    created_at: string;
}

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('app_users')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setUsers(data as AppUser[]);
        } catch (err) {
            console.error(err);
            alert("Gagal memuat users.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id: string, username: string) => {
        if (!confirm(`Hapus user ${username}?`)) return;
        try {
            const { error } = await supabase.from('app_users').delete().eq('id', id);
            if (error) throw error;
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (err) {
            console.error(err);
            alert("Gagal menghapus user.");
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 font-heading">User Management</h2>
                    <p className="text-slate-500">Kelola pengguna aplikasi (Developer Access Only).</p>
                </div>
                <Button onClick={fetchUsers} variant="secondary" icon={<RefreshCw size={18}/>}>
                    Refresh List
                </Button>
            </div>

            <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b-2 border-slate-100">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">User</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Username</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Role</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Bergabung</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="animate-spin" size={20}/> Memuat data...
                                        </div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">Tidak ada user.</td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <img 
                                                    src={user.avatar_url || 'https://picsum.photos/40/40'} 
                                                    className="w-10 h-10 rounded-full border border-slate-200 bg-slate-200 object-cover"
                                                    alt="Avatar"
                                                />
                                                <span className="font-bold text-slate-800">{user.full_name || 'No Name'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono text-sm text-slate-600">@{user.username}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                user.role === 'Developer' ? 'bg-slate-800 text-white border-slate-900' :
                                                user.role === 'Admin' || user.role === 'Owner' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => handleDeleteUser(user.id, user.username)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Hapus User"
                                                disabled={user.username === 'arunika'} // Protect superuser
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};