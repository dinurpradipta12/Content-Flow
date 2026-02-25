import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    BarChart3, Users, CreditCard, TrendingUp, Calendar,
    ArrowUpRight, ArrowDownRight, Package, User,
    Briefcase, PieChart, Activity, RefreshCw, ChevronRight,
    Search, Download, DollarSign, Clock, ShieldCheck
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, PieChart as RePieChart,
    Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

interface AnalyticsData {
    totalRevenue: number;
    activeUsers: number;
    personalSubscribers: number;
    teamSubscribers: number;
    totalTenants: number;
    monthlySales: any[];
    packageDistribution: any[];
    topTenants: any[];
    paymentHistory: any[];
    growthRate: number;
}

export const DeveloperAnalytics: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'all'>('30d');

    const COLORS = ['#8B5CF6', '#F472B6', '#FBBF24', '#34D399', '#64748B'];

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Users
            const { data: users } = await supabase.from('app_users').select('*');
            const userList = users || [];

            // 2. Fetch Payments (Resolved Inbox Renewal Messages)
            const { data: payments } = await supabase
                .from('developer_inbox')
                .select('*')
                .eq('type', 'renewal')
                .eq('is_resolved', true)
                .order('created_at', { ascending: true });

            const paymentList = payments || [];

            // 3. Process Summary Stats
            const activeUsers = userList.filter(u => u.is_active).length;
            const personalSubs = userList.filter(u => u.subscription_package?.includes('Personal')).length;
            const teamSubs = userList.filter(u => u.subscription_package?.includes('Team')).length;

            // Tenants are owners (parent_user_id is null and package is Team)
            const tenants = userList.filter(u => u.subscription_package?.includes('Team') && !u.parent_user_id);

            const totalRevenue = paymentList.reduce((acc, curr) => acc + (curr.amount || 0), 0);

            // 4. Process Monthly Sales (Accumulated by month)
            const salesByMonth: { [key: string]: number } = {};
            paymentList.forEach(p => {
                const date = new Date(p.created_at);
                const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
                salesByMonth[month] = (salesByMonth[month] || 0) + (p.amount || 0);
            });

            const monthlySalesData = Object.keys(salesByMonth).map(month => ({
                name: month,
                revenue: salesByMonth[month]
            }));

            // 5. Package Distribution
            const pkgCounts: { [key: string]: number } = {};
            userList.forEach(u => {
                const pkg = u.subscription_package || 'Free';
                pkgCounts[pkg] = (pkgCounts[pkg] || 0) + 1;
            });

            const packageDistData = Object.keys(pkgCounts).map(pkg => ({
                name: pkg,
                value: pkgCounts[pkg]
            })).sort((a, b) => b.value - a.value).slice(0, 5);

            // 6. Top Tenants (By member count)
            const tenantMemberCounts: { [key: string]: { name: string, count: number } } = {};
            tenants.forEach(t => {
                const membersCount = userList.filter(u => u.parent_user_id === t.id).length;
                tenantMemberCounts[t.id] = { name: t.full_name, count: membersCount };
            });

            const topTenantsData = Object.values(tenantMemberCounts)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            // 7. Payment History (Recent 10)
            const paymentHistoryData = [...paymentList].reverse().slice(0, 10);

            setData({
                totalRevenue,
                activeUsers,
                personalSubscribers: personalSubs,
                teamSubscribers: teamSubs,
                totalTenants: tenants.length,
                monthlySales: monthlySalesData,
                packageDistribution: packageDistData,
                topTenants: topTenantsData,
                paymentHistory: paymentHistoryData,
                growthRate: 15.5 // Dummy for now
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <RefreshCw size={48} className="animate-spin text-accent opacity-20 mb-4" />
                <p className="text-slate-400 font-bold animate-pulse">Menganalisa data...</p>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3">
                        <div className="w-14 h-14 bg-accent text-white rounded-2xl flex items-center justify-center shadow-hard-mini transform -rotate-3 group-hover:rotate-0 transition-transform">
                            <TrendingUp size={30} />
                        </div>
                        Developer Analytics
                    </h1>
                    <p className="text-slate-500 font-bold text-lg mt-2 ml-1">Statistik performa dan pertumbuhan aplikasi secara mendalam.</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border-2 border-slate-900 shadow-hard-mini">
                    <button
                        onClick={() => setTimeRange('30d')}
                        className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${timeRange === '30d' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                    >30 Hari</button>
                    <button
                        onClick={() => setTimeRange('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${timeRange === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                    >Semua</button>
                    <div className="w-[2px] h-6 bg-slate-100 mx-1"></div>
                    <Button onClick={fetchData} variant="outline" className="h-10 border-none shadow-none"><RefreshCw size={16} /></Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 bg-violet-600 border-2 border-slate-900 shadow-hard h-32 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-all">
                    <div className="absolute top-0 right-0 p-2 opacity-20 transform translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform">
                        <DollarSign size={80} className="text-white" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Total Pendapatan</h3>
                        <p className="text-2xl font-black text-white">Rp {data.totalRevenue.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="relative z-10 flex items-center gap-1 text-emerald-300 font-black text-xs bg-white/10 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
                        <ArrowUpRight size={14} /> 12%
                    </div>
                </Card>

                <Card className="p-4 bg-blue-600 border-2 border-slate-900 shadow-hard h-32 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-all">
                    <div className="absolute top-0 right-0 p-2 opacity-20 transform translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform">
                        <Users size={80} className="text-white" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">User Aktif</h3>
                        <p className="text-2xl font-black text-white">{data.activeUsers}</p>
                    </div>
                    <div className="relative z-10 flex gap-2">
                        <span className="text-[9px] font-black text-white/70 bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-sm">P: {data.personalSubscribers}</span>
                        <span className="text-[9px] font-black text-white/70 bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-sm">T: {data.teamSubscribers}</span>
                    </div>
                </Card>

                <Card className="p-4 bg-pink-600 border-2 border-slate-900 shadow-hard h-32 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-all">
                    <div className="absolute top-0 right-0 p-2 opacity-20 transform translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform">
                        <Briefcase size={80} className="text-white" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Total Tim (Tenant)</h3>
                        <p className="text-2xl font-black text-white">{data.totalTenants}</p>
                    </div>
                    <div className="relative z-10 flex items-center gap-1 text-red-300 font-black text-xs bg-white/10 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
                        <ArrowDownRight size={14} /> 3%
                    </div>
                </Card>

                <Card className="p-4 bg-slate-900 border-2 border-slate-900 shadow-hard h-32 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-all">
                    <div className="absolute top-0 right-0 p-2 opacity-30 transform translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform">
                        <Activity size={80} className="text-white" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Konversi Rate</h3>
                        <p className="text-2xl font-black text-white">{data.growthRate}%</p>
                    </div>
                    <div className="relative z-10">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Target: 20%</span>
                    </div>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sales Accumulation Chart */}
                <Card className="p-8 border-2 border-slate-900 shadow-hard bg-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <TrendingUp size={20} className="text-accent" />
                                Penjualan Bulanan
                            </h3>
                            <p className="text-slate-400 text-sm font-bold mt-1">Akumulasi pendapatan per paket langganan.</p>
                        </div>
                        <Download size={20} className="text-slate-300 hover:text-slate-900 cursor-pointer transition-colors" />
                    </div>
                    <div className="h-80 w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.monthlySales}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }}
                                    tickFormatter={(val) => `Rp${(val / 1000000).toFixed(1)}M`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: '2px solid #1E293B',
                                        boxShadow: '4px 4px 0px 0px #1E293B',
                                        fontWeight: 'bold'
                                    }}
                                    formatter={(v) => `Rp ${v.toLocaleString('id-ID')}`}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Package Distribution Chart */}
                <Card className="p-8 border-2 border-slate-900 shadow-hard bg-white flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Package size={20} className="text-secondary" />
                                Distribusi Paket
                            </h3>
                            <p className="text-slate-400 text-sm font-bold mt-1">Pembagian kategori langganan user.</p>
                        </div>
                        <PieChart size={20} className="text-slate-300" />
                    </div>
                    <div className="flex-1 flex flex-col md:flex-row items-center justify-around gap-8">
                        <div className="h-64 w-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                        data={data.packageDistribution}
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {data.packageDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: '2px solid #1E293B', boxShadow: '4px 4px 0px 0px #1E293B' }}
                                    />
                                </RePieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-4">
                            {data.packageDistribution.map((item, index) => (
                                <div key={item.name} className="flex items-center gap-4 group">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <div className="flex-1 min-w-[120px]">
                                        <p className="text-xs font-black text-slate-900 group-hover:text-accent transition-colors">{item.name}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000"
                                                    style={{
                                                        backgroundColor: COLORS[index % COLORS.length],
                                                        width: `${(item.value / data.activeUsers) * 100}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400">{item.value}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Bottom Section: Tenant Ranking & History */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Top Tenants */}
                <Card className="lg:col-span-1 p-8 border-2 border-slate-900 shadow-hard">
                    <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                        <ShieldCheck size={20} className="text-quaternary" />
                        Top Team Tenants
                    </h3>
                    <div className="space-y-6">
                        {data.topTenants.map((tenant, idx) => (
                            <div key={tenant.name} className="flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black border-2 border-slate-900 shadow-hard-mini ${idx === 0 ? 'bg-tertiary text-slate-800' : 'bg-slate-50 text-slate-400'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-800 tracking-tight">{tenant.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Tenant Leader</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-accent">{tenant.count} User</p>
                                    <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg">Verified</span>
                                </div>
                            </div>
                        ))}
                        {data.topTenants.length === 0 && (
                            <p className="text-center py-8 text-slate-400 font-bold italic">Belum ada tim aktif.</p>
                        )}
                    </div>
                </Card>

                {/* History Table */}
                <Card className="lg:col-span-2 p-8 border-2 border-slate-900 shadow-hard overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Clock size={20} className="text-amber-500" />
                                Histori Pembayaran
                            </h3>
                            <p className="text-slate-400 text-sm font-bold mt-1">Data 10 transaksi perpanjangan terakhir.</p>
                        </div>
                        <Button variant="outline" className="border-slate-900 shadow-hard-mini h-10 text-xs">Lihat Semua</Button>
                    </div>

                    <div className="overflow-x-auto -mx-8">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-y-2 border-slate-900">
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Paket</th>
                                    <th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.paymentHistory.map((pmt) => (
                                    <tr key={pmt.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <p className="text-xs font-bold text-slate-800">{new Date(pmt.created_at).toLocaleDateString('id-ID')}</p>
                                            <p className="text-[10px] text-slate-400">{new Date(pmt.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                        </td>
                                        <td className="px-4 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-accent/10 border border-slate-200 flex items-center justify-center text-accent">
                                                    <User size={14} />
                                                </div>
                                                <p className="text-xs font-black text-slate-900 group-hover:text-accent transition-colors">{pmt.sender_name}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 whitespace-nowrap">
                                            <span className="px-3 py-1 bg-violet-50 text-violet-600 rounded-lg text-[10px] font-black border border-violet-100">
                                                {pmt.package_name || 'Personal'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right whitespace-nowrap">
                                            <p className="text-xs font-black text-slate-900">Rp {(pmt.amount || 0).toLocaleString('id-ID')}</p>
                                            <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">Sukses</span>
                                        </td>
                                    </tr>
                                ))}
                                {data.paymentHistory.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-bold italic font-heading">
                                            <CreditCard className="mx-auto mb-3 opacity-20" size={32} />
                                            Belum ada transaksi terekam.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};
