# Deploy Catur Mini App ke Vercel

## 1. Deploy hanya folder ini

Upload isi `vercel-miniapp/` ke repository GitHub khusus Mini App, lalu import ke Vercel. Jika repository berisi seluruh bot, pilih Root Directory `vercel-miniapp`. Jangan upload config bot yang berisi token ke repository publik.

- Framework Preset: Other
- Node.js: 22.x atau versi yang mendukung >=22
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `public`

Bot utama tetap berjalan di VPS/Termux/panel melalui `npm start`. Vercel menjalankan halaman Mini App dan API game. Jangan menjalankan long polling bot kedua di Vercel dan jangan mengganti webhook bot.

## 2. Redis dan Environment Variables

Tambahkan Upstash Redis melalui Vercel Marketplace atau dashboard Upstash. Isi Environment Variables Vercel untuk Production:

| Nama | Isi |
|---|---|
| `BOT_TOKEN` | Token bot yang sama dengan bot Rich Builder |
| `BOT_USERNAME` | Username bot, tanpa @ |
| `GAME_SERVICE_SECRET` | Secret acak minimal 32 karakter |
| `UPSTASH_REDIS_REST_URL` | REST URL Redis |
| `UPSTASH_REDIS_REST_TOKEN` | REST token Redis, bukan read-only |

Buat secret sendiri dengan `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Jangan kirim secret lewat chat atau taruh di frontend. Setelah mengisi variabel, redeploy.

Gunakan URL Production HTTPS yang bisa diakses publik, misalnya `https://catur-kamu.vercel.app`. Halaman/API tidak boleh terhalang Vercel Authentication. Autentikasi pemain dilakukan server menggunakan tanda tangan Telegram initData. Jangan membuka kredensial Redis atau token bot ke browser.

Redis wajib untuk versi ini. State pertandingan tidak disimpan pada filesystem Vercel. Data server memakai TTL 48 jam; batas idle permainan tetap 24 jam. Game lokal lama tidak otomatis dipindah, mulai pertandingan baru setelah konfigurasi.

## 3. Hubungkan BotFather

Buka @BotFather > `/mybots` > pilih bot > Bot Settings > Configure Mini App > Enable Mini App. Isi URL Production Vercel sebagai Main Mini App URL. Nama tombol/menu BotFather dapat berbeda menurut versi.

Versi ini menggunakan tautan Main Mini App `https://t.me/USERNAME_BOT?startapp=...`, bukan tombol `web_app` yang dibatasi konteks chat. Tombol tersebut dapat dikirim di grup. `startapp` membawa ID pertandingan, sedangkan identitas pemain diverifikasi lewat initData Telegram.

Jangan mengisi URL langsung Vercel sebagai tombol pertandingan di kode. Membuka URL Vercel di browser biasa memang menampilkan pesan agar game dibuka dari Telegram.

## 4. Konfigurasi bot utama

Di `games.config.js` pada root bot:

```js
export default {
  miniAppUrl: 'https://catur-kamu.vercel.app',
  serviceSecret: 'ISI_SAMA_DENGAN_GAME_SERVICE_SECRET',
};
```

Jalankan `npm install`, kemudian restart bot dengan `npm start`. Jika `miniAppUrl` masih kosong, bot tetap menggunakan papan chat lama. Tidak perlu mengubah config.js atau map emoji lama.

Jadikan bot admin grup untuk pemeriksaan keanggotaan. Pemain yang belum muncul dalam daftar dapat mengirim `/catur daftar`. Admin anonim harus beralih ke akun pribadi.

## 5. Uji di Telegram

1. Di grup, kirim `/catur`, pilih lawan, lalu lawan menekan Terima. Bisa juga `/catur ai`.
2. Pesan pertandingan menampilkan tombol Buka Catur. Kedua pemain membuka tombol yang sama.
3. Sentuh bidak sendiri. Petak tujuan yang sah diberi penanda. Sentuh tujuan untuk menjalankan langkah.
4. Giliran lawan tersinkron melalui polling setiap 4 detik ketika aplikasi terbuka. AI menjawab di server.
5. Coba promosi pion, Balik papan, Riwayat langkah, dan Menyerah.
6. Private chat tetap menolak pembuatan pertandingan. Mini App hanya dapat diakses dua pemain yang terdaftar dalam pertandingan, dan server memeriksa anggota grup sebelum aksi.

## Pemecahan masalah

- Masih papan teks: isi `games.config.js` dan restart bot.
- Tautan membuka profil bot: konfigurasi Main Mini App di BotFather belum aktif atau username berbeda.
- Autentikasi bot ditolak: secret bot dan Vercel harus sama persis.
- Tanda tangan Telegram tidak valid: `BOT_TOKEN` Vercel tidak cocok dengan bot yang membuka Mini App.
- Game tidak ditemukan: tombol lama, database berbeda, atau TTL habis. Mulai `/catur` baru di grup.
- 401 halaman Vercel: nonaktifkan Deployment Protection untuk domain Production yang dipakai.
- API gagal: periksa Vercel Function Logs, Redis REST URL/token, dan hak admin bot.

State dan giliran divalidasi di server. Kunci Redis menserialkan perubahan pertandingan; nomor revisi menolak permintaan ganda. Klik tombol tidak melakukan request ketika request aksi sebelumnya masih berlangsung.
