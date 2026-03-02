import React, { useState, useEffect } from 'react';
import { TrendingUp, Save, Users, Calendar, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AudienceGrowthTracker = ({ account, platform }: { account: string; platform: string }) => {
    const [data, setData] = useState<{ month: string; followers: number; connections: number }[]>([]);
    const [inputMonth, setInputMonth] = useState('');
    const [inputFollowers, setInputFollowers] = useState<number | ''>('');
    const [inputConnections, setInputConnections] = useState<number | ''>('');
    const [isFormOpen, setIsFormOpen] = useState(false);

    const storageKey = `audience_growth_${account}_${platform}`;

    useEffect(() => {
        const d = new Date();
        setInputMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);

        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                setData(parsed.sort((a: any, b: any) => a.month.localeCompare(b.month)));
            } else {
                setData([]);
            }
        } catch {
            setData([]);
        }
    }, [storageKey]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMonth) return;

        const newData = [...data];
        const existingIdx = newData.findIndex(d => d.month === inputMonth);

        const flw = typeof inputFollowers === 'number' ? inputFollowers : 0;
        const cnx = typeof inputConnections === 'number' ? inputConnections : 0;

        if (existingIdx >= 0) {
            newData[existingIdx] = { month: inputMonth, followers: flw, connections: cnx };
        } else {
            newData.push({ month: inputMonth, followers: flw, connections: cnx });
        }

        newData.sort((a, b) => a.month.localeCompare(b.month));
        setData(newData);
        localStorage.setItem(storageKey, JSON.stringify(newData));
        setIsFormOpen(false);
        setInputFollowers('');
        setInputConnections('');
    };

    const deleteEntry = (month: string) => {
        const newData = data.filter(d => d.month !== month);
        setData(newData);
        localStorage.setItem(storageKey, JSON.stringify(newData));
    }

    const showConnections = platform === 'all' || platform === 'LinkedIn';

    const currentFollowers = data.length > 0 ? data[data.length - 1].followers : 0;
    const prevFollowers = data.length > 1 ? data[data.length - 2].followers : 0;
    const followerGrowth = currentFollowers - prevFollowers;

    const currentConn = data.length > 0 ? data[data.length - 1].connections : 0;
    const prevConn = data.length > 1 ? data[data.length - 2].connections : 0;
    const connGrowth = currentConn - prevConn;

    return (
        <div className="bg-white rounded-xl border-2 border-slate-800 shadow-hard p-4 sm:p-5 mt-4 sm:mt-6 animate-in fade-in slide-in-from-bottom-4 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                        <Users size={20} className="text-teal-500" /> Audience Growth Tracker
                    </h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                        {account === 'all' ? 'Semua Akun' : account} • {platform === 'all' ? 'Semua Platform' : platform}
                    </p>
                </div>
                <button
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold shadow-[2px_2px_0px_0px_#14b8a6] hover:-translate-y-0.5 transition-transform"
                >
                    {isFormOpen ? 'Tutup Form' : <><Plus size={14} /> Update Data Bulan Ini</>}
                </button>
            </div>

            {isFormOpen && (
                <form onSubmit={handleSave} className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 mb-6 relative">
                    <div className="absolute top-0 w-2 h-full left-0 bg-teal-400 rounded-l-xl" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1 mb-1"><Calendar size={12} /> Bulan</label>
                            <input type="month" required value={inputMonth} onChange={e => setInputMonth(e.target.value)} className="w-full bg-white border-2 border-slate-300 rounded-lg px-3 py-2 text-xs font-bold focus:border-teal-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1 mb-1"><TrendingUp size={12} /> Total Followers</label>
                            <input type="number" required min="0" value={inputFollowers} onChange={e => setInputFollowers(parseInt(e.target.value) || '')} className="w-full bg-white border-2 border-slate-300 rounded-lg px-3 py-2 text-xs font-bold focus:border-teal-500 outline-none placeholder:text-slate-300 pointer-events-auto" placeholder="Misal: 15400" />
                        </div>
                        {showConnections && (
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1 mb-1"><Users size={12} /> Total Connections</label>
                                <input type="number" min="0" value={inputConnections} onChange={e => setInputConnections(parseInt(e.target.value) || '')} className="w-full bg-white border-2 border-slate-300 rounded-lg px-3 py-2 text-xs font-bold focus:border-teal-500 outline-none placeholder:text-slate-300" placeholder="Khusus LinkedIn" />
                            </div>
                        )}
                        <div className="flex items-end flex-1 h-full">
                            <button type="submit" className="w-full h-[36px] bg-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 hover:bg-teal-600 transition-colors border-2 border-teal-700">
                                <Save size={14} /> Simpan Data
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Top Growth Cards */}
                <div className="bg-gradient-to-br from-teal-400 to-emerald-500 p-4 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1e293b] text-white relative">
                    <p className="text-[9px] font-black uppercase tracking-wider opacity-90 mb-1">Total Followers Saat Ini</p>
                    <h3 className="text-xl md:text-2xl font-black">{currentFollowers.toLocaleString()}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 inline-block ${followerGrowth >= 0 ? 'bg-white/20' : 'bg-red-500/50'}`}>
                        {followerGrowth > 0 ? '+' : ''}{followerGrowth} dari bln lalu
                    </span>
                </div>
                {showConnections && (
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1e293b] text-white relative">
                        <p className="text-[9px] font-black uppercase tracking-wider opacity-90 mb-1">Total Connections Saat Ini</p>
                        <h3 className="text-xl md:text-2xl font-black">{currentConn.toLocaleString()}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 inline-block ${connGrowth >= 0 ? 'bg-white/20' : 'bg-red-500/50'}`}>
                            {connGrowth > 0 ? '+' : ''}{connGrowth} dari bln lalu
                        </span>
                    </div>
                )}
            </div>

            {data.length > 0 ? (
                <div className="h-[250px] w-full border-2 border-slate-100 rounded-xl p-2 md:p-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickFormatter={(val) => {
                                const d = new Date(val + '-01');
                                return d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
                            }} />
                            <YAxis stroke="#64748b" fontSize={10} />
                            <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#1e293b', fontWeight: 'bold', fontSize: '12px' }} />
                            <Line type="monotone" dataKey="followers" name="Followers" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4, fill: '#14b8a6' }} />
                            {showConnections && (
                                <Line type="monotone" dataKey="connections" name="Connections" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-[150px] flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl">
                    <p className="text-slate-400 font-bold text-xs">Belum ada data pertumbuhan followers. Silakan Update Data.</p>
                </div>
            )}

            {data.length > 0 && isFormOpen && (
                <div className="mt-4 pt-4 border-t-2 border-slate-100 flex flex-wrap gap-2">
                    {data.map(d => (
                        <span key={d.month} className="inline-flex items-center gap-2 bg-slate-100 border border-slate-300 px-2 py-1 mb-1 rounded text-[10px] font-bold text-slate-600">
                            {d.month}: {d.followers} <button type="button" onClick={() => deleteEntry(d.month)} className="text-red-500 hover:bg-red-100 rounded-full px-1.5 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors">x</button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};
