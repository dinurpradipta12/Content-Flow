# RapidAPI Endpoints Mapping

## Issue Found
Endpoint paths dalam `scraperService.ts` tidak sesuai dengan dokumentasi RapidAPI Anda.

## Fixed Endpoints

### Instagram API
**Old:** `/api/instagram/url` ❌ (404 Not Found)
**New:** `/api/instagram/posts` ✅

**Method:** POST
**Body:** 
```json
{
  "username": "extracted_from_url",
  "maxId": ""
}
```

**Response:** Data tentang posts dari Instagram username

---

### TikTok API  
**Endpoint:** `/api/music/posts`
**Method:** GET
**Parameters:**
- `musicId`: ID musik dari TikTok
- `count`: Jumlah posts (default: 30)
- `cursor`: Pagination cursor (default: 0)

**Note:** Endpoint ini adalah generic. Untuk URL-specific, perlu diekstrak music ID dari URL TikTok.

---

### LinkedIn API
**Endpoint:** `/get-company-by-domain`
**Method:** GET
**Parameters:**
- `domain`: Company domain (e.g., apple.com)

**Note:** Endpoint ini untuk company data. Untuk post analytics, mungkin perlu endpoint berbeda.

---

### Threads API
**Endpoint:** `/api/v1/users/detail-with-biolink`
**Method:** GET
**Parameters:**
- `username`: Threads username (ekstrak dari @username)

**Note:** Menggunakan username yang diekstrak dari Threads URL.

---

## Next Steps

1. **Test Instagram:** Endpoint `/api/instagram/posts` sudah diperbaiki
2. **Verify TikTok:** Cek apakah API tersedia untuk menganalisis video URL
3. **Verify LinkedIn:** Cek apakah ada endpoint untuk post analytics, bukan hanya company data
4. **Verify Threads:** Test dengan username extraction

## Testing Checklist

- [ ] Restart dev server: `npm run dev`
- [ ] Test Instagram Analyze button
- [ ] Check console logs untuk API requests
- [ ] Verify response format sesuai dengan mapping di `fetchFromRapidAPI`
