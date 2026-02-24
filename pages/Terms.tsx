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
                        onClick={() => navigate('/welcome')}
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
                    <p>Dengan mengakses dan menggunakan sistem ini ("Aplikasi"), Anda ("Pengguna") menyetujui untuk terikat oleh Syarat dan Ketentuan ("S&K") ini. Jika Anda tidak menyetujui seluruh atau sebagian dari S&K ini, Anda tidak diperbolehkan untuk menggunakan atau mengakses Aplikasi dalam bentuk apa pun.</p>

                    <h3 className="text-lg font-black text-slate-900">2. Lisensi Penggunaan</h3>
                    <p>Izin diberikan untuk menggunakan Aplikasi secara terbatas sesuai dengan paket langganan yang dipilih. Lisensi ini bersifat non-eksklusif, tidak dapat dipindahtangankan, dan dapat dicabut sewaktu-waktu. Anda tidak diperkenankan untuk:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Mendistribusikan ulang, menjual, atau menyewakan akses Aplikasi kepada pihak ketiga.</li>
                        <li>Memodifikasi, mendekompilasi, atau merekayasa balik kode sumber Aplikasi.</li>
                        <li>Menggunakan Aplikasi untuk tujuan yang melanggar hukum atau regulasi yang berlaku.</li>
                        <li>Membagikan akun atau kredensial login kepada pihak yang tidak berwenang.</li>
                    </ul>

                    <h3 className="text-lg font-black text-slate-900">3. Pendaftaran & Akun</h3>
                    <p>Untuk mengakses fitur penuh Aplikasi, Pengguna wajib mendaftarkan akun dengan menyediakan informasi yang benar, akurat, dan terkini. Informasi yang diperlukan meliputi:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li><strong>Nama Lengkap</strong> — Nama asli sesuai identitas.</li>
                        <li><strong>Email Aktif</strong> — Email yang valid dan dapat dihubungi.</li>
                        <li><strong>Username Login</strong> — Nama unik untuk masuk ke sistem.</li>
                        <li><strong>Password</strong> — Minimal 6 karakter, menjadi tanggung jawab Pengguna.</li>
                        <li><strong>Kode Unik Langganan</strong> — Kode khusus yang diberikan saat konfirmasi pembelian paket berlangganan.</li>
                    </ul>

                    <h3 className="text-lg font-black text-slate-900">4. Verifikasi & Aktivasi Akun</h3>
                    <p>Setelah pendaftaran, akun Pengguna akan masuk dalam status <strong>"Menunggu Verifikasi"</strong>. Proses verifikasi dilakukan oleh Administrator/Developer melalui mekanisme berikut:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Administrator akan mencocokkan <strong>Kode Unik Langganan</strong> yang dimasukkan Pengguna saat registrasi dengan data pembayaran/pembelian yang tercatat.</li>
                        <li>Jika kode cocok dan valid, akun akan diverifikasi dan Pengguna dapat langsung login ke Aplikasi.</li>
                        <li>Jika kode <strong>tidak cocok</strong> atau <strong>tidak valid</strong>, akun tidak akan diverifikasi dan Pengguna tidak akan dapat mengakses Aplikasi.</li>
                        <li>Administrator berhak menolak atau mencabut verifikasi kapan saja tanpa pemberitahuan terlebih dahulu.</li>
                    </ul>

                    <h3 className="text-lg font-black text-slate-900">5. Langganan & Pembayaran</h3>
                    <p>Akses ke Aplikasi tersedia melalui paket langganan berbayar. Dengan berlangganan, Pengguna menyetujui:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Pembayaran dilakukan sesuai metode dan nominal yang ditentukan oleh penyedia layanan.</li>
                        <li>Kode Unik Langganan yang diberikan bersifat satu kali pakai dan terikat pada satu akun.</li>
                        <li>Masa aktif langganan dapat diatur oleh Administrator. Akun yang masa aktifnya habis akan dinonaktifkan secara otomatis.</li>
                        <li>Perpanjangan langganan harus dilakukan sebelum masa aktif berakhir untuk memastikan akses tanpa gangguan.</li>
                    </ul>

                    <h3 className="text-lg font-black text-slate-900">6. Privasi & Keamanan Data</h3>
                    <p>Kami berkomitmen untuk melindungi privasi data Pengguna. Data yang dikumpulkan hanya digunakan untuk keperluan operasional Aplikasi. Pengguna bertanggung jawab atas:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Menjaga kerahasiaan username dan password akun masing-masing.</li>
                        <li>Segala aktivitas yang dilakukan melalui akun yang terdaftar atas namanya.</li>
                        <li>Melaporkan segala bentuk penyalahgunaan atau akses tidak sah ke Administrator.</li>
                    </ul>

                    <h3 className="text-lg font-black text-slate-900">7. Penolakan & Batasan Tanggung Jawab</h3>
                    <p>Aplikasi disediakan "sebagaimana adanya" (<em>as is</em>). Kami tidak memberikan jaminan, tersurat maupun tersirat, terkait ketersediaan, akurasi, atau kesesuaian Aplikasi untuk tujuan tertentu. Dalam keadaan apa pun, kami tidak bertanggung jawab atas:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Kehilangan data, keuntungan, atau kerugian bisnis akibat penggunaan Aplikasi.</li>
                        <li>Gangguan layanan yang disebabkan oleh faktor di luar kendali kami.</li>
                        <li>Kerusakan perangkat atau sistem akibat penggunaan fitur Aplikasi.</li>
                    </ul>

                    <h3 className="text-lg font-black text-slate-900">8. Hak Kekayaan Intelektual</h3>
                    <p>Seluruh konten, desain, kode sumber, dan aset visual dalam Aplikasi merupakan hak milik pengembang. Pengguna tidak diperkenankan untuk mereproduksi, menyalin, atau mengklaim kepemilikan atas komponen apa pun dari Aplikasi.</p>

                    <h3 className="text-lg font-black text-slate-900">9. Pemberhentian Layanan</h3>
                    <p>Kami berhak untuk menangguhkan atau menghentikan akses Pengguna tanpa pemberitahuan sebelumnya apabila ditemukan pelanggaran terhadap S&K ini, termasuk namun tidak terbatas pada:</p>
                    <ul className="list-disc pl-6 space-y-1">
                        <li>Penyalahgunaan fitur Aplikasi.</li>
                        <li>Penggunaan data atau informasi secara tidak sah.</li>
                        <li>Tindakan yang merugikan Pengguna lain atau penyedia layanan.</li>
                    </ul>

                    <h3 className="text-lg font-black text-slate-900">10. Perubahan Syarat & Ketentuan</h3>
                    <p>Kami berhak mengubah, memperbarui, atau menambahkan klausul dalam S&K ini kapan saja. Perubahan akan berlaku efektif segera setelah dipublikasikan. Pengguna disarankan untuk secara berkala meninjau S&K ini. Penggunaan Aplikasi yang berlanjut setelah perubahan dianggap sebagai persetujuan Pengguna terhadap S&K terbaru.</p>

                    <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 mt-6">
                        <p className="text-xs text-slate-500 font-bold text-center">
                            Syarat & Ketentuan ini berlaku sejak tanggal pendaftaran akun Anda. Dengan menekan tombol "Setuju & Lanjutkan", Anda menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan di atas.
                        </p>
                    </div>
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
