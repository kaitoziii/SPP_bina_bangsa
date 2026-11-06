# Asumsi Teknis & Bisnis

1. **Stack & Runtime:**
   - Framework: Next.js 14/15 (App Router) dengan TypeScript mode strict.
   - Database: SQLite secara default (`file:./dev.db`) agar langsung berjalan di mesin pengujian/demo tanpa ketergantungan daemon eksternal, dengan dukungan penuh untuk MySQL/MariaDB jika `DATABASE_URL` MySQL diberikan.
   - Autentikasi: Stateless encrypted JWT session cookie (httpOnly, sameSite lax, secure saat production) menggunakan secret `SESSION_SECRET` dari `.env`.
   - CSRF: Menggunakan header anti-CSRF / double-submit cookie pada mutasi POST/PUT/DELETE.

2. **Format Virtual Account:**
   - 5 digit terakhir nomor VA selalu sama dengan 5 digit NIS siswa.
   - Prefix default adalah `88000` sehingga nomor VA berformat `88000 + NIS` (contoh: NIS `12345` -> VA `8800012345`).

3. **Status Tagihan & Logika Jatuh Tempo:**
   - Setiap tagihan berstatus awal `BELUM BAYAR`.
   - Tanggal jatuh tempo adalah hari terakhir bulan tagihan (misal 30 September pukul 23:59:59).
   - Tagihan yang belum dibayar melewati tanggal jatuh tempo otomatis dianggap `TUNGGAKAN` (baik melalui pengecekan runtime query maupun CLI cron `npm run mark-overdue`).
   - Tagihan yang dibayar setelah jatuh tempo tetap dapat dilunasi dan status berubah menjadi `LUNAS`, dengan `tanggal_pembayaran` mencatat waktu bayar sesungguhnya.
   - Status `BEASISWA` menandai tagihan yang dibebaskan melalui persetujuan beasiswa. Tagihan `BEASISWA` tidak dapat dibayar via VA, tidak dapat berubah menjadi `TUNGGAKAN`, dan dilewati saat pelunasan tagihan tertua.

4. **Kerahasiaan & Keamanan Callback Payment Gateway:**
   - Webhook callback `/api/payment/callback` memverifikasi header `X-Signature` menggunakan HMAC-SHA256 dari raw payload body dan secret `PG_SECRET`.
   - Komparasi signature menggunakan `crypto.timingSafeEqual` untuk mencegah timing attacks.
   - Callback idempotent: jika `transaction_id` yang sama dikirim ulang, sistem mencatat callback log dan mengembalikan HTTP 200 OK dengan status bahwa transaksi sudah pernah diproses tanpa menduplikasi data pembayaran.

5. **Fitur Beasiswa:**
   - Siswa hanya dapat memiliki 1 pengajuan dengan status `DIAJUKAN` pada satu waktu.
   - Admin menentukan `jumlah_bulan` (minimal 1) dan `bulan_mulai`. Sistem memvalidasi bahwa hanya tagihan berstatus `BELUM BAYAR` yang belum jatuh tempo yang diubah menjadi `BEASISWA`.
   - Tagihan yang digenerate pada masa depan akan otomatis mendapatkan status `BEASISWA` jika jatuh pada rentang beasiswa aktif siswa.
   - Seluruh mutasi persetujuan beasiswa dieksekusi dalam satu transaksi database dan dicatat di `audit_log`.
