import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TrendingUp, Users, Eye, MousePointerClick, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { getChartInsights } from '../services/geminiService';
import { useAppConfig } from '../components/AppConfigProvider';

const data = [
    { name: 'Jan', views: 4000, likes: 2400 },
    { name: 'Feb', views: 3000, likes: 1398 },
    { name: 'Mar', views: 2000, likes: 9800 },
    { name: 'Apr', views: 2780, likes: 3908 },
    { name: 'May', views: 1890, likes: 4800 },
    { name: 'Jun', views: 2390, likes: 3800 },
];

export const Dashboard: React.FC = () => {
    const { config } = useAppConfig();
    const [insight, setInsight] = useState<string>("Memuat analisa AI...");

    useEffect(() => {
        // Mock loading AI insight
        const fetchInsight = async () => {
            const result = await getChartInsights(data);
            setInsight(result);
        };
        fetchInsight();
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold text-slate-800 font-heading mb-2">
                        {config?.page_titles?.['dashboard']?.title || 'Halo, Aditya!'} <span className="inline-block">👋</span>
                    </h2>
                    <p className="text-slate-500 font-medium">{config?.page_titles?.['dashboard']?.subtitle || 'Berikut laporan performa kontenmu bulan ini.'}</p>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="secondary" icon={<Calendar size={16} />}>Bulan Ini</Button>
                    <Button size="sm">Export Report</Button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card headerColor="violet" icon={<Eye size={24} />} title="Total Views">
                    <div className="text-4xl font-black text-slate-800">124.5K</div>
                    <div className="text-green-500 font-bold text-sm mt-2 flex items-center gap-1">
                        <TrendingUp size={16} /> +12% dari bulan lalu
                    </div>
                </Card>
                <Card headerColor="pink" icon={<Users size={24} />} title="New Followers">
                    <div className="text-4xl font-black text-slate-800">1,203</div>
                    <div className="text-red-500 font-bold text-sm mt-2 flex items-center gap-1">
                        <TrendingUp size={16} className="rotate-180" /> -2% dari bulan lalu
                    </div>
                </Card>
                <Card headerColor="yellow" icon={<MousePointerClick size={24} />} title="Engagement">
                    <div className="text-4xl font-black text-slate-800">8.5%</div>
                    <div className="text-green-500 font-bold text-sm mt-2 flex items-center gap-1">
                        <TrendingUp size={16} /> +5% dari bulan lalu
                    </div>
                </Card>
                <Card headerColor="green" icon={<Calendar size={24} />} title="Published">
                    <div className="text-4xl font-black text-slate-800">12</div>
                    <div className="text-slate-400 font-bold text-sm mt-2">
                        4 Konten dijadwalkan
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart */}
                <Card className="lg:col-span-2" title="Statistik Pertumbuhan">
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#64748B' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748B' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '2px solid #1E293B', boxShadow: '4px 4px 0px #1E293B' }}
                                    cursor={{ fill: '#F1F5F9' }}
                                />
                                <Bar dataKey="views" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="likes" fill="#F472B6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* AI Insights */}
                <Card title="Rekomendasi AI" headerColor="yellow" className="bg-yellow-50/50">
                    <div className="prose prose-sm text-slate-700">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center border-2 border-slate-800 flex-shrink-0">
                                <span className="text-lg">🤖</span>
                            </div>
                            <p className="italic text-slate-600 leading-relaxed">
                                "{insight}"
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
                            <h4 className="font-bold text-slate-800 mb-2">Saran Cepat:</h4>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Posting video reels pada jam 19:00 WIB.</li>
                                <li>Gunakan hook pertanyaan di 3 detik pertama.</li>
                                <li>Topik "Produktivitas" sedang naik daun.</li>
                            </ul>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};