# Step-by-Step Cara Mengaktifkan Google Calendar API

Agar fitur sinkronisasi kalender berjalan, Anda perlu mendaftarkan aplikasi di Google Cloud Console.

### 1. Buat Project di Google Cloud
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat project baru (misal: "Content-Flow Planner").

### 2. Aktifkan Calendar API
1. Cari "Google Calendar API" di kolom search atas.
2. Klik **Enable**.

### 3. Konfigurasi OAuth Consent Screen
1. Buka menu **APIs & Services** > **OAuth consent screen**.
2. Pilih **External** (jika untuk umum) atau **Internal** (jika untuk organisasi/workspace email Anda sendiri).
3. Isi App Name, User Support Email, dan Developer Contact.
4. Pada bagian **Scopes**, tambahkan: `.../auth/calendar.events`.
5. Tambahkan email Anda sendiri ke **Test Users** (Sangat Penting selama status masih Testing).

### 4. Buat OAuth Client ID
1. Buka menu **Credentials**.
2. Klik **+ Create Credentials** > **OAuth client ID**.
3. Application Type: **Web application**.
4. Name: "Aruneeka Content Flow".
5. **Authorized JavaScript origins**:
   - `http://localhost:5173`
6. **Authorized redirect URIs**:
   - `http://localhost:5173`
7. Klik **Create**. Anda akan mendapatkan **Client ID**.

### 5. Tambahkan ke Project Environment
1. Buka file `.env` di root project Anda.
2. Tambahkan baris berikut:
   ```env
   VITE_GOOGLE_CLIENT_ID=Tulis_Client_ID_Anda_Disini
   ```
3. Restart development server (`npm run dev`).

### 6. Tambahkan Script Google Identity Services
Tambahkan baris berikut di file `index.html` (di dalam tag `<head>`):
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

---
**Catatan Penting:** Karena aplikasi ini bersifat client-side (Vite), koneksi akan bertahan selama token aktif. Jika token habis (Expired), user perlu menekan tombol "Connect" lagi di halaman Profile.
