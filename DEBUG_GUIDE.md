# Debug Guide: Content Link Fetching

## Masalah
Content Data Insight page tidak dapat menemukan link yang sudah disimpan di Content Plan Detail page.

## Cara Debug

### 1. Buka Content Data Insight Page
- Navigasi ke Analytics > Content Data Insight

### 2. Buka Browser DevTools (F12 atau Cmd+Option+I)
- Pergi ke tab **Console**

### 3. Lihat Log Message
Setelah page load, cari log message seperti ini:

```
[ContentDataInsight] Fetched items with links: [
  { id: "...", title: "...", contentLink: "https://..." },
  ...
]
```

### Interpretasi Hasil

#### Jika contentLink berisi URL:
```
✅ BENAR - Link sudah tersimpan di database
→ Masalahnya kemungkinan ada di API atau network
```

#### Jika contentLink kosong/null:
```
❌ SALAH - Link tidak tersimpan di database
→ Masalahnya di Content Plan Detail:
  - User belum input link
  - Link tidak tersimpan dengan benar saat klik save
```

### 4. Cek di Content Plan Detail
- Buka Content Plan page
- Pilih salah satu konten yang sudah di-publish
- Lihat field "Link Postingan (Opsional)"
- Pastikan sudah diisi dengan URL
- Klik "Simpan Perubahan"

### 5. Kembali ke Content Data Insight
- Refresh page (F5)
- Lihat log di console
- Coba klik "Analyze" button

## Expected Flow

1. User input link di Content Plan Detail page
2. User klik "Simpan Perubahan"
3. Link tersimpan ke database dengan column `content_link`
4. Content Data Insight fetch data dengan query yang include `content_link`
5. Data di-mapping dari `content_link` ke `contentLink` di frontend
6. Button "Analyze" dapat menerima URL dan mengirim ke API

## API Request Flow

```
handleAnalyze(e, id, url)
  ↓
analyzeContentLink(url) [scraperService.ts]
  ↓
fetchFromRapidAPI(url, platform)
  ↓
API Response dengan metrics (likes, views, comments, shares)
  ↓
Update database dengan metrics
```

## Troubleshooting Checklist

- [ ] Link input field ada di Content Plan Detail form
- [ ] Link field tersimpan ke database (column: `content_link`)
- [ ] Query ContentDataInsight include `content_link` field
- [ ] Mapping `content_link` → `contentLink` benar
- [ ] Console log menunjukkan contentLink berisi URL
- [ ] Button "Analyze" tidak disabled
- [ ] API key sudah diset di `.env` file
- [ ] Network request sukses (status 200/404, bukan 403/401)
