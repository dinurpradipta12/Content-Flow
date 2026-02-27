## 🔧 Debugging Presence Notifications

Jika presence popup masih tidak muncul, ikuti langkah debugging ini:

### 1️⃣ Check Browser Console untuk Error Messages

1. Buka **DevTools** (F12)
2. Buka tab **Console**
3. Cari log dari Presence System:

```
✅ Harus ada logs seperti:
[Presence] Presence System: Tracking 2 peers
[Presence] Subscription status: SUBSCRIBED
[Presence] User A is now online
```

❌ Jika ada error, catat error messagenya.

---

### 2️⃣ Common Issues & Solutions

#### Issue: "Presence System: Tracking 0 peers"
**Masalah**: Tidak ada workspace members ditemukan
**Solusi**:
- Pastikan user sudah bergabung ke workspace (Ruang Sosmed)
- Refresh halaman
- Check apakah workspace `members[]` array memiliki data

#### Issue: "SUBSCRIBED" status tidak muncul
**Masalah**: Real-time subscription gagal
**Solusi**:
- Check Supabase realtime status di dashboard
- Pastikan RLS policy sudah di-apply (run migration SQL)
- Check network tab untuk websocket connection

#### Issue: Permission Denied Error saat UPDATE
**Masalah**: RLS policy tidak mengizinkan UPDATE
**Solusi**:
- Run migration: `20260227_enable_presence_rls.sql`
- Drop old policies dulu dengan `20260227_cleanup_presence_rls.sql`
- Refresh browser setelah migration

---

### 3️⃣ Manual Testing

**Test Case 1: Single Workspace Member Joins Online**
1. Buka 2 browser tabs dengan user berbeda
2. Tab 1: User A (Admin)
3. Tab 2: User B (Member di Ruang Sosmed)
4. Di Tab 2, refresh halaman
5. Di Tab 1, seharusnya muncul popup: "User B saat ini sedang online"

**Test Case 2: User Goes Idle**
1. User A idle untuk 5+ menit (tidak ada activity)
2. Di Tab 1, seharusnya popup berubah: "User B sedang idle"

**Test Case 3: User Logout**
1. User B close tab
2. Di Tab 1, seharusnya popup: "User B telah offline"

---

### 4️⃣ If Still Not Working

Cek data di Supabase:

```sql
-- Check if online_status column exists
SELECT id, full_name, online_status, last_activity_at 
FROM app_users 
WHERE id = 'user-b-id'
LIMIT 1;

-- Check workspace members
SELECT id, name, members 
FROM workspaces 
WHERE name LIKE 'Ruang%'
LIMIT 1;

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'app_users' 
AND policyname LIKE '%resence%';
```

---

### 5️⃣ Contact Support

Jika masih error, kumpulkan:
1. Error message dari console
2. User IDs involved
3. Workspace name
4. Screenshot dari Network tab (WebSocket connection)
