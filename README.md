# kolik-web — Dashboard Prediksi Dini Kolik Kuda (Next.js)

Versi Next.js dari dashboard Streamlit di notebook, dengan empat halaman yang sama:

| Halaman | Isi |
|---|---|
| `/` Ringkasan kandang | Status 30 kuda pada satu waktu (slider hari/jam, tombol Putar), metrik, alarm 24 jam terakhir + alasannya |
| `/kuda` Detail kuda | 4 grafik tersinkron (HR, berbaring, makan vs baseline, skor risiko), kebenaran simulasi, tabel alarm benar/palsu |
| `/demo` Demo: suntik kolik | Simulasi kuda baru, kolik disuntikkan, diputar jam demi jam, hasil lead time + alasan alarm |
| `/klinis` Pemeriksaan klinis | Form 3 kolom berlabel Indonesia, contoh isian otomatis, risiko fatal + faktor berpengaruh |

Semua data dan prediksi diambil dari `kolik-api` lewat `/api/kolik/...` (file `app/api/kolik/[...path]/route.ts`).
Server Next.js meneruskan panggilan ke `KOLIK_API_URL`, jadi tidak ada masalah CORS.

## Jalankan di komputer sendiri

API harus jalan dulu (lihat README kolik-api). Lalu di terminal lain:

```bash
npm install
cp .env.example .env.local     # isi: KOLIK_API_URL=http://localhost:8000
npm run dev
```

Buka http://localhost:3000.

## Deploy ke Vercel

1. Push folder ini ke repo GitHub (mis. `kolik-web`).
2. vercel.com → **Add New → Project** → pilih repo → **Environment Variables**:
   `KOLIK_API_URL = https://<nama-api-kalian>.vercel.app` → **Deploy**.
3. Kalau URL API berubah, ganti env var tersebut lalu **Redeploy**.

## Struktur

- `app/page.tsx`, `app/kuda/page.tsx`, `app/demo/page.tsx`, `app/klinis/page.tsx`: empat halaman
- `components/HorseChart.tsx`: grafik 4 panel (Recharts), dipakai Detail kuda dan Demo
- `components/Nav.tsx`, `components/Slider.tsx`: menu samping dan slider
- `lib/api.ts`: tipe data dan fungsi pemanggil API
- `app/globals.css`: semua gaya tampilan (warna status di `:root`)
