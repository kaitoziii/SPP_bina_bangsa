# PRD — Sistem Informasi Pembayaran SPP Berbasis Web (Virtual Account + Payment Gateway)

| | |
|---|---|
| Studi kasus | SMK Bina Bangsa (cover materi: SMK Antartika 2 Sidoarjo) |
| Jenis | Web application |
| Konteks | Materi Uji Sertifikasi Praktik Demonstrasi, TA 2026-2027 |
| Status | Draft v1 |

---

## 1. Ringkasan

Sekolah butuh sistem pembayaran SPP yang transparan dan otomatis. Siswa membayar **hanya lewat Virtual Account (VA)** masing-masing. Payment Gateway (sandbox / mock / simulasi buatan sendiri) memproses transaksi lalu mengirim **callback/webhook** ke sistem sekolah. Sistem mencocokkan VA → siswa → tagihan, lalu mengubah status menjadi **LUNAS** secara otomatis. Tidak ada konfirmasi manual, tidak ada tunai, tidak ada screenshot bukti transfer.

**Poin penilaian utama:** status lunas HARUS berubah karena transaksi diterima sistem lewat callback, bukan karena tombol "Bayar" atau edit database manual.

## 2. Tujuan

1. Mengelola master data: siswa, user, kelas, jurusan, tahun ajaran, tarif SPP, VA.
2. Membentuk tagihan SPP bulanan.
3. Menerima transaksi dari Payment Gateway (callback/webhook) dan memperbarui tagihan otomatis.
4. Menentukan tunggakan otomatis berdasarkan jatuh tempo.
5. Menyediakan dashboard per role, laporan, dan pencarian.
6. Menerapkan hak akses berbasis role; siswa hanya melihat data sendiri.
7. Dapat didemonstrasikan ke asesor secara end-to-end.

### Non-goals
- Pembayaran tunai / langsung ke teller.
- Transfer ke rekening umum sekolah.
- Upload screenshot bukti transfer.
- Form konfirmasi pembayaran manual.
- Integrasi bank sungguhan (cukup sandbox/mock).

## 3. Pengguna & Role

| Role | Fungsi |
|---|---|
| **Admin** | Kelola data dan sistem: dashboard, master data, user, transaksi, tagihan. |
| **Kepala Sekolah** | Monitoring & laporan (read-only). Tidak boleh ubah/hapus transaksi atau ubah status manual. |
| **Teller** | Monitoring transaksi & administrasi pembayaran. Cari siswa, lihat VA/tagihan/transaksi, cetak laporan. **Tidak** terima tunai, **tidak** ubah status jadi lunas manual. |
| **Siswa** | Lihat data sendiri saja: profil, VA, tagihan, tunggakan, riwayat. Tidak bisa ubah data/status, hapus transaksi, atau lihat data siswa lain. |

### Matriks hak akses

| Fitur | Admin | Kepsek | Teller | Siswa |
|---|:-:|:-:|:-:|:-:|
| Dashboard | ✅ | ✅ | ✅ | ✅ (milik sendiri) |
| CRUD master data (siswa, kelas, jurusan, tahun ajaran, tarif, VA) | ✅ | ❌ | ❌ | ❌ |
| Kelola user | ✅ | ❌ | ❌ | ❌ |
| Lihat data siswa | ✅ | ✅ | ✅ (via pencarian) | ❌ (hanya diri sendiri) |
| Lihat tagihan / tunggakan | ✅ | ✅ | ✅ | ✅ (milik sendiri) |
| Lihat transaksi PG | ✅ | ✅ | ✅ | ❌ |
| Laporan + filter | ✅ | ✅ | ✅ (cetak sesuai kewenangan) | ❌ |
| Pencarian (NIS/NISN/nama/VA/Transaction ID) | ✅ | ❌ | ✅ | ❌ |
| Ubah/hapus transaksi | ❌ | ❌ | ❌ | ❌ |
| Ubah status jadi LUNAS manual | ❌ | ❌ | ❌ | ❌ |

## 4. Alur Bisnis

```
Siswa → bayar ke Virtual Account → Payment Gateway → transaksi diproses
→ PG kirim callback/webhook → Sistem sekolah terima
→ Identifikasi VA → Identifikasi siswa → Cari tagihan → Cocokkan nominal
→ Simpan transaksi → Update tagihan → Status = LUNAS
```

### Pemrosesan callback (urutan wajib)
1. Terima callback
2. Validasi (signature/token, format, field wajib)
3. Cek `transaction_id` belum pernah diproses (anti-duplikat)
4. Cari VA (harus terdaftar)
5. Cari siswa dari VA
6. Cari tagihan yang sesuai (tagihan tertua belum lunas)
7. Cocokkan nominal
8. Simpan transaksi (+ `raw_response`)
9. Update tagihan → LUNAS, simpan `tanggal_pembayaran` sebenarnya
10. Catat riwayat

### Contoh payload callback
```json
{
  "virtual_account": "8800012345",
  "amount": 350000,
  "transaction_id": "TRX-20260918-001",
  "status": "PAID",
  "paid_at": "2026-09-25 10:15:00"
}
```

## 5. Aturan Bisnis

### Virtual Account
- Setiap siswa punya tepat 1 VA unik.
- **5 digit terakhir VA = NIS siswa.** Prefix bebas (contoh `88000` + `12345` = `8800012345`).
- VA tidak boleh dipakai siswa lain; dipakai untuk identifikasi transaksi.

### Jatuh tempo & status tagihan
- SPP wajib dibayar paling lambat **tanggal terakhir setiap bulan**.
- Status: `BELUM BAYAR`, `LUNAS`, `TUNGGAKAN`.
- Belum dibayar sampai akhir bulan → mulai **tanggal 1 bulan berikutnya** otomatis `TUNGGAKAN`.
- Bayar setelah jatuh tempo tetap boleh dan **melunasi tunggakan**; tanggal bayar asli tetap disimpan.

| Kasus | Contoh | Hasil |
|---|---|---|
| Sebelum jatuh tempo | Bayar 25 Sep, jatuh tempo 30 Sep | LUNAS |
| Tepat hari terakhir | Bayar 30 Sep | LUNAS |
| Tidak bayar | Tidak ada transaksi s.d. 30 Sep → 1 Okt | TUNGGAKAN |
| Bayar setelah tunggakan | Bayar 5 Okt via callback | TUNGGAKAN → LUNAS (tanggal bayar 5 Okt 2026 dicatat) |

### Integritas
- Pembayaran ganda dicegah; tagihan lunas tidak diproses dua kali.
- Transaction ID unik; semua transaksi dapat ditelusuri via nomor transaksi/referensi.
- Transaksi punya histori.
- Status LUNAS tidak boleh diubah manual tanpa lewat Payment Gateway.

## 6. Kebutuhan Fungsional

### 6.1 Autentikasi
- Login username + password; validasi field kosong, username salah, password salah.
- Password di-hash. Session aman, redirect sesuai role.

### 6.2 Master data (Admin)
Siswa, kelas, jurusan, tahun ajaran, tarif SPP, VA, user (admin/kepsek/teller/siswa). Fitur tambah, edit, hapus, cari, validasi.

### 6.3 Tagihan
- Generate tagihan SPP bulanan per siswa dari tarif aktif tahun ajaran.
- Cegah duplikat tagihan (siswa + bulan + tahun).
- Penentuan TUNGGAKAN otomatis (scheduled job harian dan/atau dihitung saat query).

### 6.4 Payment Gateway (simulasi)
Pilih salah satu atau gabungan: sandbox API, mock PG, simulasi API, atau callback/webhook buatan sendiri.
- UI/endpoint simulator: generate payment → PG → VA → simulasi bayar → payment berhasil → kirim callback ke endpoint sistem.
- Harus nyata sebagai alur integrasi, **bukan** tombol "Bayar" yang langsung mengubah status.
- Skenario simulasi: berhasil, gagal, callback tidak valid, callback duplikat, transaction ID duplikat.

### 6.5 Dashboard

| Role | Minimal tampil |
|---|---|
| Admin | Total siswa, total tagihan, total pembayaran, total tunggakan, transaksi hari ini, grafik pembayaran, grafik tunggakan, transaksi terbaru |
| Kepala Sekolah | Siswa aktif, siswa lunas, belum bayar, menunggak, total penerimaan SPP, total tunggakan, grafik pembayaran/bulan, grafik tunggakan/bulan |
| Teller | Transaksi hari ini, nominal transaksi hari ini, transaksi terbaru, pencarian VA, pencarian NIS, status pembayaran |
| Siswa | Nama, NIS, kelas, nomor VA, tagihan bulan ini, status, total tunggakan, riwayat pembayaran (contoh: Juli–Sep LUNAS, Okt TUNGGAKAN) |

### 6.6 Laporan
- **Laporan pembayaran** — filter: tanggal, bulan, tahun, tahun ajaran, kelas, jurusan, siswa, status.
- **Laporan tunggakan** — minimal: NIS, nama, kelas, bulan tunggakan, jumlah tunggakan, total nominal.
- Rekap pembayaran. Cetak (Teller sesuai kewenangan).

### 6.7 Pencarian (Admin & Teller)
Berdasarkan NIS, NISN, nama, nomor VA, Transaction ID. Hasil menampilkan NIS, nama, kelas, VA, dan status per bulan (mis. September: LUNAS, Oktober: TUNGGAKAN, November: BELUM BAYAR).

## 7. Validasi Minimal

- Username & password wajib diisi.
- NIS unik, NISN unik, VA unik.
- 5 digit terakhir VA = NIS.
- Nominal pembayaran valid (sama dengan tagihan).
- VA harus terdaftar; tagihan harus tersedia.
- Transaction ID unik.
- Callback harus divalidasi.
- Tagihan lunas tidak boleh diproses dua kali.
- Siswa hanya lihat data sendiri; siswa tidak bisa ubah status.
- Transaksi harus punya histori.

## 8. Model Data

> Kolom mengikuti materi uji. Catatan tambahan di bagian 12.

| # | Tabel | Kolom |
|---|---|---|
| 1 | `users` | id_user, nama, username, password, role, status |
| 2 | `siswa` | id_siswa, nis, (nisn*), nama, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_hp, nama_orang_tua, id_kelas, id_tahun_ajaran, id_user, status |
| 3 | `jurusan` | id_jurusan, kode_jurusan, nama_jurusan, keterangan |
| 4 | `kelas` | id_kelas, nama_kelas, tingkat, id_jurusan, id_tahun_ajaran |
| 5 | `tahun_ajaran` | id_tahun_ajaran, tahun_ajaran, tanggal_mulai, tanggal_selesai, status |
| 6 | `tarif_spp` | id_tarif, id_tahun_ajaran, nominal, keterangan, status |
| 7 | `virtual_account` | id_va, id_siswa, nomor_va, prefix, status, tanggal_dibuat |
| 8 | `tagihan_spp` | id_tagihan, id_siswa, id_tarif, id_tahun_ajaran, bulan, tahun, nominal, tanggal_jatuh_tempo, status |
| 9 | `transaksi_payment_gateway` | id_transaksi, transaction_id, virtual_account, id_siswa, tanggal_transaksi, waktu_transaksi, nominal, status_transaksi, payment_channel, reference_number, raw_response, created_at, updated_at |
| 10 | `pembayaran` | id_pembayaran, id_transaksi, id_tagihan, tanggal_pembayaran, nominal_pembayaran, status |

\* kolom `nisn` diwajibkan unik oleh aturan validasi dan pencarian, tapi tidak ada di daftar kolom `siswa` pada materi — tambahkan.

### Relasi utama
`users 1—1 siswa` · `jurusan 1—N kelas` · `tahun_ajaran 1—N kelas/tarif/tagihan` · `kelas 1—N siswa` · `siswa 1—1 virtual_account` · `siswa 1—N tagihan_spp` · `transaksi_payment_gateway 1—N pembayaran` · `tagihan_spp 1—N pembayaran`

### Constraint
UNIQUE: `siswa.nis`, `siswa.nisn`, `virtual_account.nomor_va`, `transaksi_payment_gateway.transaction_id`, `tagihan_spp(id_siswa, bulan, tahun)`.

## 9. Kebutuhan Non-Fungsional

- **Keamanan:** hash password, prepared statement/ORM (anti SQL injection), CSRF, escape output, cek role di server (bukan hanya menyembunyikan menu), validasi signature callback.
- **Idempotensi:** callback yang sama dikirim ulang tidak menggandakan pembayaran.
- **Atomicity:** simpan transaksi + update tagihan dalam satu DB transaction.
- **Auditability:** semua transaksi dapat ditelusuri; `raw_response` disimpan.
- **Kegunaan:** responsif, dapat dipakai di laptop saat demo.

## 10. Rencana Pengujian Fungsional (minimal)

| Area | Skenario |
|---|---|
| Login | valid, username salah, password salah, field kosong |
| Data | tambah, edit, hapus, cari, validasi |
| Virtual Account | VA valid, duplikat, tidak terdaftar, 5 digit terakhir sesuai NIS |
| Payment Gateway | berhasil, gagal, callback diterima, callback tidak valid, duplicate callback, Transaction ID duplikat |
| Tagihan | belum bayar, lunas, tunggakan |
| Pembayaran | bayar sebelum jatuh tempo, tepat hari terakhir, tidak bayar → tunggakan, bayar setelah tunggakan |
| Hak akses | admin, kepala sekolah, teller, siswa (termasuk siswa akses data siswa lain → ditolak) |

## 11. Skenario Demo ke Asesor

1. Tampilkan data siswa: NIS 12345, Ahmad Fauzan, VA 8800012345.
2. Tampilkan tagihan SPP September 2026, Rp350.000, **BELUM BAYAR**.
3. Jalankan simulasi: Generate Payment → Payment Gateway → Virtual Account → Simulasi Pembayaran → Payment Berhasil.
4. Callback diterima sistem (tunjukkan log/transaksi).
5. Tagihan berubah **LUNAS** otomatis.
6. Tunjukkan skenario tunggakan: tagihan menjadi TUNGGAKAN pada tanggal 1, lalu dibayar 5 Okt 2026 → TUNGGAKAN → LUNAS, tanggal bayar tetap tercatat.
7. Tunjukkan tiap role dan batasan hak aksesnya.
8. Tunjukkan duplicate callback ditolak.

## 12. Catatan & Ambiguitas pada Materi

- Nama sekolah tidak konsisten: isi materi **SMK Bina Bangsa**, cover **SMK Antartika 2 Sidoarjo**. Pakai nama dari studi kasus (Bina Bangsa), konfigurasi lewat setting.
- `siswa` tidak punya kolom `nisn` padahal wajib unik (lihat bagian 8).
- Contoh callback: `transaction_id` bertanggal `20260918` sedangkan `paid_at` `2026-09-25` — hanya contoh format, jangan dijadikan aturan.
- Contoh dashboard: tagihan bulan ini Rp350.000 BELUM BAYAR sementara total tunggakan Rp700.000 → tunggakan = jumlah tagihan berstatus TUNGGAKAN, tidak termasuk tagihan bulan berjalan.
- Satu callback = satu tagihan (nominal harus sama persis). Pembayaran parsial / lebih dari satu bulan di luar scope; tolak dengan pesan jelas. Jika ada beberapa tunggakan, lunasi yang tertua dulu.
- Tidak disebut apakah tarif SPP boleh beda per jurusan/kelas; asumsi: tarif per tahun ajaran.

## 13. Asumsi Teknis (dapat diubah)

- **Stack:** PHP 8 + MySQL/MariaDB + HTML/CSS/JS (sesuai buku di cover: PHP, MySQL, JavaScript). Laravel opsional.
- **Payment Gateway:** mock PG buatan sendiri (modul/route terpisah dari aplikasi sekolah) yang mengirim callback HTTP POST ke `/api/payment/callback` dengan signature HMAC.
- **Penentuan tunggakan:** cron/scheduled job harian pukul 00:05, ditambah pengecekan saat query agar tetap benar bila job terlewat.
- **Grafik:** Chart.js.

## 14. Kriteria Penerimaan

- [ ] Semua 20 ketentuan khusus terpenuhi.
- [ ] Alur callback end-to-end berjalan dan dapat didemokan.
- [ ] Tidak ada jalur UI/API untuk menandai LUNAS tanpa transaksi PG.
- [ ] Semua validasi pada bagian 7 aktif.
- [ ] Semua skenario uji pada bagian 10 lulus.
- [ ] Dashboard 4 role, laporan, dan pencarian berfungsi.
- [ ] Hak akses dipaksa di sisi server.
