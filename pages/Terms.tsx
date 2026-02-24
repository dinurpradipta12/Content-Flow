import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, ShieldAlert, ArrowLeft } from 'lucide-react';

export const Terms: React.FC = () => {
    const navigate = useNavigate();
    const [agreed, setAgreed] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-white border-4 border-slate-900 rounded-3xl shadow-[8px_8px_0px_0px_#0f172a] overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b-4 border-slate-900 bg-amber-50 flex items-center gap-4 shrink-0">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 hover:bg-amber-100 rounded-xl transition-colors border-2 border-transparent hover:border-slate-900"
                    >
                        <ArrowLeft size={24} className="text-slate-900" />
                    </button>
                    <div className="w-12 h-12 bg-amber-400 rounded-full border-2 border-slate-900 flex items-center justify-center shrink-0">
                        <ShieldAlert size={24} className="text-slate-900" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Syarat & Ketentuan</h1>
                        <p className="text-sm font-bold text-slate-600">Harap baca dengan seksama sebelum mendaftar.</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto space-y-6 text-slate-700 leading-relaxed font-medium text-sm custom-scrollbar flex-1">
                    <h3 className="text-lg font-black text-slate-900">1. Penerimaan Syarat</h3>
                    <p>Dengan mengakses dan menggunakan sistem ini, Anda menyetujui untuk terikat oleh Syarat dan Ketentuan. Jika Anda tidak menyetujui, Anda dilarang menggunakan atau mengakses sistem.</p>

                    <h3 className="text-lg font-black text-slate-900">2. Lisensi Penggunaan</h3>
                    <p>Izin diberikan untuk menggunakan sementara materi (informasi atau perangkat lunak) pada sistem hanya untuk penggunaan personal maupun bisnis non-komersial sementara.</p>

                    <h3 className="text-lg font-black text-slate-900">3. Penolakan</h3>
                    <p>Materi pada sistem disediakan 'sebagaimana adanya'. Kami tidak memberikan jaminan, tersurat maupun tersirat, dan dengan ini menolak dan meniadakan semua jaminan lainnya, termasuk tanpa batasan, jaminan tersirat atau kondisi yang dapat diperjualbelikan, kesesuaian untuk tujuan tertentu, atau non-pelanggaran kekayaan intelektual atau pelanggaran hak lainnya.</p>

                    <h3 className="text-lg font-black text-slate-900">4. Batasan</h3>
                    <p>Dalam keadaan apa pun kami atau pamasok kami tidak bertanggung jawab atas kerugian finansial maupun non finansial apa pun (termasuk, tanpa batasan, ganti rugi atas hilangnya data atau keuntungan, atau karena gangguan bisnis) yang timbul dari penggunaan atau ketidakmampuan untuk menggunakan materi pada sistem.</p>

                    <h3 className="text-lg font-black text-slate-900">5. Akurasi Materi</h3>
                    <p>Materi yang muncul di sistem bisa mencakup kesalahan teknis, tipografi, atau fotografi. Kami tidak menjamin bahwa salah satu materi di sistemnya akurat, lengkap, atau berstatus saat ini. Kami dapat membuat perubahan pada materi yang terkandung dalam sistem kapan saja tanpa pemberitahuan.</p>

                    <h3 className="text-lg font-black text-slate-900">6. Verifikasi & Pendaftaran</h3>
                    <p>Pendaftaran akun akan diproses melalui tahap verifikasi administrator. Kode Unik langganan Anda akan dicocokkan dengan data pembayaran / kepemilikan. Akun yang tidak tervalidasi akan dicabut aksesnya.</p>
                </div>

                {/* Footer & Actions */}
                <div className="p-6 border-t-4 border-slate-900 bg-slate-50 shrink-0">
                    <label className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 border-slate-200 hover:border-slate-900 transition-colors bg-white mb-6 group">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${agreed ? 'bg-slate-900 border-slate-900' : 'border-slate-400 group-hover:border-slate-900'}`}>
                            {agreed && <Check size={16} className="text-white" />}
                        </div>
                        <input
                            type="checkbox"
                            className="hidden"
                            checked={agreed}
                            onChange={() => setAgreed(!agreed)}
                        />
                        <span className="font-bold text-slate-800 text-sm">Saya telah membaca dan menyetujui seluruh Syarat & Ketentuan di atas.</span>
                    </label>

                    <button
                        onClick={() => {
                            if (agreed) navigate('/register');
                        }}
                        disabled={!agreed}
                        className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 border-4 border-slate-900 transition-all ${agreed
                                ? 'bg-emerald-400 text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#0f172a]'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                            }`}
                    >
                        Setuju & Lanjutkan <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
