# ⚡ Cloudinary Quick Setup (5 Menit)

## 1️⃣ Create Cloudinary Account (1 min)
- Go to https://cloudinary.com/users/register/free
- Sign up & verify email
- Login to dashboard

## 2️⃣ Get Credentials (1 min)
1. **Cloud Name**: Copy dari main dashboard (big text at top)
2. **Upload Preset**: 
   - Settings → Upload → "Add upload preset"
   - Name: `aruneeka_icons`
   - Signing Mode: **Unsigned**
   - Save

## 3️⃣ Update .env (1 min)
```env
# Tambah 2 baris ini ke .env:
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=aruneeka_icons
```

Replace `your_cloud_name` dengan yang dikopi dari step 2️⃣

## 4️⃣ Restart Dev Server (1 min)
```bash
npm run dev
```

## 5️⃣ Upload Icons (1 min)
1. Open App → Settings → Interface
2. Find "Web App Icon 192×192 (Home Screen)" section
3. Click **Upload** button (image icon)
4. Select PNG file dari komputer
5. Preview muncul → Click **Save All**
6. Done! ✅

---

## 📋 Checklist
- [ ] Cloudinary account created
- [ ] Cloud Name copied
- [ ] Upload Preset created (mode: Unsigned)
- [ ] .env updated dengan 2 env vars
- [ ] Dev server restarted
- [ ] Icons uploaded dan saved

---

## 💡 Tips
- Icon 192×192 untuk home screen
- Icon 512×512 untuk PWA manifest  
- Maskable harus transparent areas untuk adaptive icons
- Max file size: 5MB

---

**Need help?** See [CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md) for detailed guide.
