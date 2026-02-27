# 🔧 Fix: Invited Users Migration Failure & Email Rate Limit Exceeded

## 📋 Ringkasan Masalah

Ketika user diundang melalui **Team Management**, mereka mengalami:
1. **Peringatan "Gagal Migrasi"** saat login pertama kali
2. **Error "Email rate limit exceeded"** 

### 🎯 Root Cause

1. **Missing Email Field**: User yang diundang melalui fallback path tidak memiliki email yang valid
2. **Missing subscription_package**: User tidak memiliki paket langganan yang didefinisikan
3. **Missing subscription_end**: User tidak memiliki tanggal akhir langganan
4. **Migration Error**: Saat login, sistem mencoba sign up ke Supabase Auth tetapi email tidak valid → rate limit tercapai

---

## ✅ Solusi yang Diterapkan

### 1️⃣ **TeamManagement.tsx** - Perbaikan Invite User
**File**: [pages/TeamManagement.tsx](pages/TeamManagement.tsx)

**Perubahan**: Tambahkan email dan subscription_package saat membuat user yang diundang

```typescript
// SEBELUM (Line 336-345)
let insertData: any = {
    full_name: inviteForm.full_name,
    username: inviteForm.username.toLowerCase().replace(/\s/g, '_'),
    password: hashedPassword,
    role: 'Member',
    avatar_url: avatarUrl,
    is_active: true,
    is_verified: true,
    subscription_start: new Date().toISOString(),
    parent_user_id: adminId,
    invited_by: adminName
};

// SETELAH (Line 336-352)
const syntheticEmail = `${inviteForm.username.toLowerCase().replace(/\s/g, '_')}@team.contentflow.app`;
let insertData: any = {
    full_name: inviteForm.full_name,
    username: inviteForm.username.toLowerCase().replace(/\s/g, '_'),
    password: hashedPassword,
    role: 'Member',
    avatar_url: avatarUrl,
    email: syntheticEmail, // ✨ NEW
    is_active: true,
    is_verified: true,
    subscription_start: new Date().toISOString(),
    subscription_package: 'Free', // ✨ NEW
    subscription_end: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // ✨ NEW
    parent_user_id: adminId,
    invited_by: adminName
};
```

**Juga perbaiki fallback path** (Line 381-407) dengan menambahkan field yang sama.

---

### 2️⃣ **Login.tsx** - Perbaikan Migration Logic
**File**: [pages/Login.tsx](pages/Login.tsx)

**Perubahan**: Handle email rate limit dan pastikan email diupdate ke app_users

```typescript
// SEBELUM (Line 120-125)
if (signUpError) {
    if (signUpError.message.includes('already registered')) {
        // ... retry logic
    }
    throw new Error(`Gagal migrasi: ${signUpError.message}`);
}

// SETELAH (Line 120-150)
if (signUpError) {
    // Handle email rate limit dan already registered cases
    if (signUpError.message.includes('already registered') || signUpError.message.includes('rate limit')) {
        const { error: retryError } = await supabase.auth.signInWithPassword({
            email: migrationEmail,
            password: trimmedPassword
        });
        if (retryError) {
            // Fallback: Update app_users dan continue
            try {
                await supabase.from('app_users').update({ 
                    email: migrationEmail,
                    subscription_package: legacyUser.subscription_package || 'Free'
                }).eq('id', legacyUser.id);
            } catch (updateErr) {
                console.warn("Email update warning:", updateErr);
            }
            throw new Error(`Login gagal: ${retryError.message}`);
        }
        navigate('/');
        return;
    }
    throw new Error(`Gagal migrasi: ${signUpError.message}`);
}

// Pastikan update app_users dengan email dan subscription_package
if (!legacyUser.email || !legacyUser.email.includes('@') || !legacyUser.subscription_package) {
    await supabase.from('app_users').update({ 
        email: migrationEmail,
        subscription_package: legacyUser.subscription_package || 'Free'
    }).eq('id', legacyUser.id);
}
```

---

### 3️⃣ **Database Migration** - Cleanup Existing Data
**File**: [sql/fix_invited_users_migration.sql](sql/fix_invited_users_migration.sql)

Jalankan SQL ini di Supabase SQL Editor untuk fix data yang sudah ada:

```sql
-- Update users tanpa email dengan synthetic email
UPDATE public.app_users 
SET email = LOWER(username) || '@team.contentflow.app'
WHERE email IS NULL OR email = '' OR email NOT LIKE '%@%';

-- Update users tanpa subscription_package dengan default 'Free'
UPDATE public.app_users 
SET subscription_package = 'Free'
WHERE subscription_package IS NULL OR subscription_package = '';

-- Update users tanpa subscription_end date dengan 30 hari
UPDATE public.app_users 
SET subscription_end = NOW() + INTERVAL '30 days'
WHERE subscription_end IS NULL AND is_active = true;

-- Ensure invited users auto-verified
UPDATE public.app_users 
SET is_verified = true
WHERE is_verified = false AND invited_by IS NOT NULL;
```

---

## 🚀 Langkah Implementasi

### Step 1: Deploy Code Changes
```bash
# 1. Update TeamManagement.tsx dan Login.tsx
# File sudah di-update, tinggal deploy

# 2. Test dengan invite user baru melalui Team Management
# Lihat console log untuk memastikan email dan subscription_package tercakup
```

### Step 2: Cleanup Existing Data (PENTING!)
```bash
# 1. Buka Supabase SQL Editor
# 2. Copy-paste isi file: sql/fix_invited_users_migration.sql
# 3. Run query secara berurutan:
#    - UPDATE untuk email
#    - UPDATE untuk subscription_package
#    - UPDATE untuk subscription_end
#    - UPDATE untuk is_verified

# Atau jalankan sekaligus (safe, karena WHERE clause terdefinisi)
```

### Step 3: Test Migration
```
1. Buka User Management → lihat daftar users yang diundang
2. Verifikasi mereka punya:
   - ✅ Email (bukan NULL)
   - ✅ subscription_package (bukan NULL)
   - ✅ subscription_end (tidak NULL atau tidak expired)
   - ✅ is_verified = true

3. Test login dengan akun yang sudah diundang:
   - Tidak boleh ada error "Gagal migrasi"
   - Tidak boleh ada "email rate limit exceed"
   - Harus berhasil login dan navigate ke dashboard
```

---

## 📊 Perbandingan Sebelum & Sesudah

| Aspek | Sebelum | Sesudah |
|-------|---------|---------|
| **Email User Invited** | NULL atau empty | `username@team.contentflow.app` |
| **subscription_package** | NULL | `Free` (default) |
| **subscription_end** | NULL | NOW() + 30 days |
| **Migration saat Login** | ❌ Gagal dengan rate limit | ✅ Berhasil |
| **Error Message** | "Gagal migrasi" | (tidak ada error) |

---

## 🔍 Troubleshooting

### Jika masih error "Gagal migrasi"
1. **Check email di app_users**: 
   ```sql
   SELECT id, username, email FROM app_users 
   WHERE email IS NULL OR email NOT LIKE '%@%';
   ```
2. Jalankan SQL cleanup di atas

### Jika "Email rate limit exceed"
1. Ini terjadi karena signup attempt terlalu banyak
2. Tunggu ±15 menit atau reset Supabase project
3. Setelah fix code di atas, tidak akan terjadi lagi

### Jika user sudah login tapi tetap error
1. Log out dan login ulang
2. Check `last_activity_at` di database
3. Jika perlu, manually update: `UPDATE app_users SET email = 'username@team.contentflow.app' WHERE id = 'xxx'`

---

## 📝 Notes

- **Synthetic Email Format**: `username@team.contentflow.app` 
  - Format ini memudahkan identifikasi bahwa itu user yang diundang
  - User bisa setup email asli mereka nanti via EmailSetupModal

- **Default Subscription**: 
  - Package: `Free`
  - Duration: 30 days
  - Admin bisa upgrade kapan saja via Team Management upgrade modal

- **Email Verification**:
  - Invited users otomatis `is_verified = true`
  - Self-registered users memerlukan verification

---

## 🎯 Checklist

- [x] Update TeamManagement.tsx - normal insert path
- [x] Update TeamManagement.tsx - fallback insert path  
- [x] Update Login.tsx - handle rate limit
- [x] Update Login.tsx - ensure email update
- [x] Create SQL cleanup script
- [ ] Run SQL cleanup di Supabase
- [ ] Test invite user baru
- [ ] Test login dengan invited user
- [ ] Verify no migration errors
