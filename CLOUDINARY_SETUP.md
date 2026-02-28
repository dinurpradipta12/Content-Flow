# 📤 Cloudinary Upload Setup Guide

Panduan lengkap untuk setup icon upload ke Cloudinary.

## 🎯 Fitur

- **Upload icon langsung dari UI** - Tanpa perlu URL manual
- **3 ukuran icon** - 192×192, 512×512, dan maskable
- **Validasi file** - Size limit 5MB, format image only
- **Real-time preview** - Lihat hasil upload langsung
- **Database sync** - Otomatis update app_config di Supabase
- **History tracking** - Catat siapa upload apa dan kapan

---

## 📋 Setup Steps

### 1. **Buat Cloudinary Account**

- Daftar gratis di [cloudinary.com](https://cloudinary.com)
- Verifikasi email
- Login ke dashboard

### 2. **Dapatkan Credentials**

Dari Cloudinary Dashboard:
1. Copy **Cloud Name** (dashboard main)
2. Settings → Upload → Copy **Upload Preset name** (atau buat baru)

Untuk membuat Upload Preset (recommended):
1. Settings → Upload → Add upload preset
2. Signing Mode: **Unsigned** (safe untuk client-side)
3. Save

### 3. **Update .env File**

Edit `.env` di root project:

```env
# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_here
```

**Example:**
```env
VITE_CLOUDINARY_CLOUD_NAME=dmf2y5x7q
VITE_CLOUDINARY_UPLOAD_PRESET=aruneeka_icons
```

### 4. **Restart Dev Server**

```bash
npm run dev
```

Environment variables baru akan ter-load.

---

## 🚀 Cara Menggunakan

### Upload Icon dari UI

1. **Go to Settings** → Tab **Interface**
2. **Scroll ke bawah** → Icon upload section (3 fields)
3. **Click Upload Button** (icon) untuk setiap icon:
   - 192×192 (Home Screen)
   - 512×512 (PWA)
   - Maskable Icon

4. **Select file dari komputer** → PNG/SVG recommended
5. **Wait untuk upload** → Button jadi loading
6. **Preview akan muncul** → Pastikan ukuran benar
7. **Click "Simpan Semua"** → Save ke database

### Manual URL Input (Alternatif)

Jika sudah punya URL Cloudinary:
- Copy URL ke text input field
- Preview akan muncul otomatis
- Click save

---

## 📏 Icon Specifications

| Type | Size | Usage | Format |
|------|------|-------|--------|
| 192×192 | 192×192px | Home Screen Icon | PNG (recommended) |
| 512×512 | 512×512px | PWA Install | PNG (recommended) |
| Maskable | 192×192px+ | Adaptive Icon (Android) | PNG with transparent areas |

### Maskable Icon Tips
- Sisi aman (safe zone) = 40% dari ukuran terperkecil
- Contoh: Untuk 192px, safe zone = 77px di center
- Background harus transparent
- Logo/text di center untuk fit semua bentuk mask

---

## 🔑 Environment Variables

```typescript
// Diakses di code sebagai:
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
```

---

## ✅ Verification

Setelah upload:

1. **Check Preview** - Pastikan icon muncul di preview box
2. **Check Database** - Query `app_config` tabel:
   ```sql
   SELECT app_icon_192, app_icon_512, app_icon_mask, icon_updated_at 
   FROM app_config 
   WHERE id = 1;
   ```
3. **Check Cloudinary Dashboard** - File harus visible di Media Library
4. **Check History** - Lihat `app_icons_history` table:
   ```sql
   SELECT * FROM app_icons_history ORDER BY created_at DESC LIMIT 5;
   ```

---

## 🐛 Troubleshooting

### "VITE_CLOUDINARY_CLOUD_NAME tidak ditemukan"
- Update `.env` dengan cloud name
- Restart dev server
- Check `npm run dev` terminal output

### Upload Gagal - File Terlalu Besar
- Max size = 5MB
- Compress image terlebih dahulu
- Use online tools: tinypng.com, squoosh.app

### Upload Gagal - Invalid Format
- Only accept image/* MIME types
- Support: PNG, JPG, SVG, WebP
- Jangan upload file lain

### URL Tidak Bisa Diakses
- Pastikan URL public (bukan private)
- Cek cloudinary.com dashboard → Media Library
- URL harus starts dengan `https://`

### Upload Preset Invalid
- Verify di Cloudinary Settings → Upload
- Pastikan **Signing Mode = Unsigned**
- Check name case-sensitive

---

## 🎨 URL Structure

Cloudinary URL format:
```
https://res.cloudinary.com/{CLOUD_NAME}/image/upload/{TRANSFORMATIONS}/v1/{PUBLIC_ID}.{FORMAT}
```

Example:
```
https://res.cloudinary.com/dmf2y5x7q/image/upload/v1/aruneeka-icons/icon-192.png
```

---

## 💾 Database Schema

### app_config (Updated)
```sql
- app_icon_192 TEXT   -- URL icon 192×192
- app_icon_512 TEXT   -- URL icon 512×512
- app_icon_mask TEXT  -- URL maskable icon
- icon_updated_at TIMESTAMP  -- Last update time
```

### app_icons_history (New)
```sql
- id SERIAL PRIMARY KEY
- favicon_url TEXT
- icon_192_url TEXT
- icon_512_url TEXT
- icon_mask_url TEXT
- user_id UUID REFERENCES app_users(id)
- changed_by TEXT
- created_at TIMESTAMP DEFAULT now()
```

---

## 🔐 Security Notes

- **Unsigned Upload Preset** = Safe untuk client-side
- File dikompres otomatis oleh Cloudinary
- File discan antivirus otomatis
- Public folder names tidak sensitive

---

## 📱 iOS Integration

Setelah upload icon:

1. Icon 192×192 langsung set di `<apple-touch-icon>`
2. Manifest.json update otomatis dengan icons array
3. iPhone users bisa "Add to Home Screen" 
4. Custom icon muncul di home screen (bukan "A")

---

## 🧪 Test Cloudinary Upload (CLI)

```bash
# Manual upload test (via curl)
curl -X POST https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload \
  -F "file=@/path/to/icon-192.png" \
  -F "upload_preset=aruneeka_icons" \
  -F "folder=aruneeka-icons"
```

---

## 📞 Support

- **Cloudinary Docs**: https://cloudinary.com/documentation
- **Upload Preset Guide**: https://cloudinary.com/documentation/upload_presets
- **API Reference**: https://cloudinary.com/documentation/image_upload_api_reference

---

**Last Updated**: February 28, 2026  
**Status**: ✅ Production Ready
