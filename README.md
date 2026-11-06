# Sistem Pembayaran SPP (Virtual Account + Payment Gateway)
**Studi Kasus: SMK Bina Bangsa**

Aplikasi web modern untuk manajemen dan pembayaran SPP sekolah otomatis berbasis **Virtual Account (VA)** dan **Payment Gateway Webhook Integration** dengan arsitektur **Next.js App Router**, **TypeScript (Strict)**, **Prisma ORM**, **Tailwind CSS**, dan **Framer Motion**, serta modul baru **Pengajuan Beasiswa**.

---

## 1. Menjalankan di Mesin Bersih

Aplikasi dapat dijalankan secara instan dengan urutan standar berikut:

```bash
# 1. Pasang dependensi
npm install

# 2. Salin environment variable
cp .env.example .env

# 3. Sinkronkan skema database & masukkan data seed demo
npm run db:migrate && npm run db:seed

# 4. Bangun versi produksi (TypeScript & Linting check)
npm run build

# 5. Jalankan server produksi
npm run start
```

Aplikasi dapat diakses melalui browser pada: **`http://localhost:3000`**

### Perintah Tambahan

- `npm run dev`: Menjalankan development server dengan hot reload.
- `npm run test`: Menjalankan suite pengujian unit & integrasi otomatis (Vitest).
- `npm run mark-overdue`: Menjalankan job CLI penentuan tunggakan (mengubah tagihan lewat jatuh tempo menjadi `TUNGGAKAN`).
- `npm run lint`: Memeriksa kepatuhan kode dan kaidah ESLint.

---

## 2. Akun Demo untuk Pengujian & Asesor

Semua password demo telah di-hash secara aman menggunakan **bcrypt**:

| Peran (Role) | Username | Password | Deskripsi / Hak Akses |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Akses penuh master data, user, generate tagihan, putuskan beasiswa, audit log. |
| **Kepala Sekolah** | `kepsek` | `kepsek123` | Monitoring & laporan read-only. Tidak bisa ubah status / mutasi. |
| **Teller** | `teller` | `teller123` | Monitoring transaksi harian, pencarian siswa/VA/tagihan, cetak laporan. *(Tidak terima tunai, 403 ke beasiswa)* |
| **Siswa (Ahmad Fauzan)** | `12345` | `siswa123` | NIS 12345, VA `8800012345`. Tagihan September Rp350.000 **BELUM BAYAR** *(siap didemokan bayar)*. |
| **Siswa (Siti Aminah)** | `12346` | `siswa123` | NIS 12346, VA `8800012346`. Memiliki tagihan berstatus **TUNGGAKAN**. |
| **Siswa (Budi Santoso)** | `12347` | `siswa123` | NIS 12347, VA `8800012347`. Memiliki pengajuan beasiswa aktif berstatus **DIAJUKAN**. |
| **Siswa (Citra Lestari)** | `12348` | `siswa123` | NIS 12348, VA `8800012348`. Data siswa reguler. |

> *Catatan: Pada halaman login (`/login`), tersedia tombol **Akses Cepat Demo Pengujian** untuk login satu klik ke masing-masing role tanpa perlu mengetik manual.*

---

## 3. Aturan Bisnis & Integritas Sistem (Anti-Bypass)

1. **Status LUNAS Hanya Lewat Webhook Callback Payment Gateway:**
   - Tidak ada tombol "Set Lunas Manual", form konfirmasi transfer, upload bukti screenshot, maupun pembayaran tunai.
   - Status tagihan hanya diperbarui menjadi `LUNAS` setelah webhook callback sah diterima di endpoint `/api/payment/callback` dan diverifikasi dengan signature HMAC-SHA256 (`crypto.timingSafeEqual`).
2. **Kaidah Virtual Account:**
   - 1 Siswa memiliki tepat 1 Virtual Account unik.
   - 5 Digit terakhir nomor VA **selalu identik dengan NIS siswa** (contoh NIS `12345` -> VA `8800012345`).
3. **Idempotensi & Atomicity:**
   - Transaksi callback dieksekusi dalam satu transaksi database (`prisma.$transaction`).
   - Callback dengan `transaction_id` yang sama diakui dengan respons HTTP 200 OK tanpa menduplikasi data pembayaran.
4. **Tanggal Bayar Sebenarnya (`paid_at`):**
   - Tanggal pembayaran asli dari payment gateway selalu disimpan pada tabel `pembayaran` dan `transaksi_payment_gateway`, termasuk saat melunasi tunggakan.
5. **Skema Status Baru `BEASISWA`:**
   - Beasiswa **TIDAK** mengubah tagihan menjadi `LUNAS`. Status tagihan yang dibebaskan adalah **`BEASISWA`**.
   - Tagihan berstatus `BEASISWA` tidak dapat dibayar via VA (callback ditolak 4xx) dan tidak pernah menjadi `TUNGGAKAN`.
   - Hanya tagihan berstatus `BELUM BAYAR` yang belum jatuh tempo yang dapat dijadikan `BEASISWA`. Tagihan `LUNAS` atau `TUNGGAKAN` tidak disentuh.
   - Tagihan yang belum dibentuk (generate masa depan) otomatis berstatus `BEASISWA` jika masuk dalam rentang beasiswa aktif siswa.
   - Seluruh keputusan beasiswa dicatat ke dalam `audit_log`.

---

## 4. Skenario Demonstrasi ke Asesor Uji Sertifikasi

### Skenario 1: Alur Pembayaran Utama (BELUM BAYAR → LUNAS)
1. Buka browser ke `http://localhost:3000/login`, klik tombol cepat **Siswa (Ahmad)**.
2. Pada Dashboard Siswa, perlihatkan data:
   - Nama: **Ahmad Fauzan**, NIS: **12345**, Kelas: **XI RPL 1**
   - Nomor Virtual Account: **8800012345** (5 digit terakhir = NIS `12345`)
   - Tagihan September 2026: **Rp350.000**, Status: **BELUM BAYAR**.
3. Klik tombol **Simulasi Bayar via Virtual Account** (membuka `/pg-simulator`).
4. Ikuti tahapan stepper animasi:
   - Step 1: Generate Payment (Ahmad Fauzan dipilih)
   - Step 2: Payment Gateway Review
   - Step 3: Tampilan Virtual Account pada kanal ATM / Mobile Banking
   - Step 4: Klik tombol **Kirim Callback Lunas**
5. Tunjukkan hasil respons callback: **HTTP Status 200 OK**, `status: "LUNAS"`.
6. Kembali ke Dashboard Siswa: Tagihan September 2026 telah berubah otomatis menjadi **LUNAS** dengan tanggal bayar asli tercatat.
7. Buka menu **Transaksi PG** dan **Log Callback** untuk menunjukkan jejak audit `raw_response` dan verifikasi signature.

### Skenario 2: Uji Idempotensi (Duplicate Callback)
1. Pada `/pg-simulator` di Step 4, klik tombol **Uji Duplicate Callback**.
2. Sistem mendeteksi `transaction_id` sudah pernah diproses, mengembalikan HTTP 200 OK dengan catatan `idempotent: true`, dan tidak menduplikasi data pembayaran.

### Skenario 3: Uji Signature Palsu & Nominal Salah
1. Klik **Kirim Signature Rusak**: Sistem menolak dengan **HTTP 401 Unauthorized** via komparasi `timingSafeEqual`.
2. Klik **Kirim Nominal Beda (Rp100.000)**: Sistem menolak dengan **HTTP 400 Bad Request** karena nominal tidak sesuai tagihan.

### Skenario 4: Fitur Pengajuan Beasiswa
1. Login sebagai Siswa **Budi Santoso** (`12347` / `siswa123`).
2. Buka menu **Beasiswa**: Tampilkan pengajuan beasiswa aktif Budi dengan status **DIAJUKAN**.
3. Logout dan login sebagai **Admin** (`admin` / `admin123`).
4. Buka menu **Beasiswa**, klik tombol **Putuskan** pada pengajuan Budi Santoso.
5. Pilih **Setujui Beasiswa**, tentukan durasi (misal 3 bulan) dan simpan.
6. Periksa daftar tagihan Budi di menu **Tagihan**: Tagihan periode terkait berubah status menjadi **BEASISWA** (bukan LUNAS).
7. Buka menu **Audit Log**: Tunjukkan catatan jejak keputusan persetujuan beasiswa lengkap dengan data sebelum dan sesudah.

---

## 5. Ringkasan Arsitektur & Teknologi

```
src/
├── app/
│   ├── (dashboard)/        # Route group terproteksi: dashboard, master, tagihan, beasiswa, transaksi, laporan
│   ├── pg-simulator/       # UI Simulator Payment Gateway mandiri (HMAC-SHA256 stepper)
│   ├── api/                # REST API & Webhook callback endpoint
│   ├── login/              # Halaman login minimalis Apple
│   ├── globals.css         # CSS Variables untuk Design Token & Semantic Status
│   └── layout.tsx          # Root Layout Next.js
├── components/
│   ├── layout/             # AppShell (Sidebar responsif, role badge, page transitions)
│   ├── motion/             # AnimatedNumber (count-up)
│   ├── status-badge.tsx    # Semantic Badge: LUNAS, BELUM BAYAR, TUNGGAKAN, BEASISWA
│   └── ui/                 # Button, Input, Select, Modal, Card, Skeleton
├── lib/
│   ├── db.ts               # Prisma singleton client (SQLite default / MySQL)
│   ├── auth.ts             # JWT Stateless session cookie (httpOnly) & Role Guard
│   ├── csrf.ts             # Double-submit cookie CSRF protection
│   ├── signature.ts        # HMAC-SHA256 signature generator & timingSafeEqual
│   ├── format.ts           # Format Rupiah (Rp350.000 tabular-nums), VA validation, jatuh tempo
│   └── services/           # Business logic: PaymentCallback, Beasiswa, Tagihan, Audit
└── prisma/
    ├── schema.prisma       # Skema 13 tabel (10 PRD + nisn + beasiswa + audit_log + callback_log)
    └── seed.ts             # Data seed demo studi kasus
```

---

## 6. Lisensi & Hak Cipta
Dibuat untuk keperluan **Uji Sertifikasi Praktik Demonstrasi LSP**, TA 2026-2027.
SMK Bina Bangsa.
