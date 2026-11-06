# AGENTS.md — Sistem Pembayaran SPP (VA + Payment Gateway)

Instruksi untuk AI coding agent. Baca `prd.md` untuk kebutuhan lengkap; file ini berisi aturan kerja dan batasan yang tidak boleh dilanggar.

## Ringkasan proyek

Aplikasi web pembayaran SPP sekolah. Siswa membayar hanya lewat Virtual Account. Payment Gateway (mock/sandbox) mengirim callback ke sistem; sistem mencocokkan VA → siswa → tagihan dan mengubah status menjadi LUNAS otomatis. Role: `admin`, `kepala_sekolah`, `teller`, `siswa`.

## Stack (default, ubah bila pemilik proyek menentukan lain)

- PHP 8.x + MySQL/MariaDB (PDO, prepared statement)
- HTML/CSS/JS, Chart.js untuk grafik
- Mock Payment Gateway sebagai modul terpisah (`/pg-simulator`) yang memanggil callback via HTTP

## Struktur direktori yang disarankan

```
/app            # logika aplikasi (controller, service, model)
/public         # entry point, assets
/pg-simulator   # mock payment gateway (terpisah dari app sekolah)
/database       # schema.sql, seed.sql, migrations
/tests          # pengujian
/docs           # prd.md, catatan
```

## Perintah

> Sesuaikan setelah stack final.

```bash
php -S localhost:8000 -t public        # jalankan app
mysql -u root -p < database/schema.sql # buat skema
mysql -u root -p < database/seed.sql   # data contoh
php tests/run.php                      # jalankan test (atau phpunit)
php bin/mark-overdue.php               # job penentu tunggakan
```

## ATURAN KERAS (jangan pernah dilanggar)

1. **Status LUNAS hanya boleh berubah lewat pemrosesan callback Payment Gateway.** Tidak boleh ada endpoint, tombol, form, atau query admin yang mengubah tagihan jadi LUNAS secara manual. Tombol "Bayar" di sisi siswa tidak boleh langsung mengubah status.
2. **Tidak ada fitur** pembayaran tunai, pembayaran langsung ke teller, upload screenshot bukti, atau form konfirmasi manual.
3. **VA:** unik, 1 siswa 1 VA, dan 5 digit terakhir **harus sama dengan NIS**. Validasi di server dan constraint DB.
4. **Siswa hanya bisa melihat data miliknya.** Ambil `id_siswa` dari session, **jangan** dari parameter request. Cek role/kepemilikan di server di setiap endpoint.
5. **Kepala Sekolah dan Teller tidak boleh** mengubah/menghapus transaksi atau mengubah status pembayaran. Siswa juga tidak.
6. **Callback harus idempotent:** `transaction_id` yang sudah diproses ditolak/di-ack tanpa efek ganda. Tagihan yang sudah LUNAS tidak diproses dua kali.
7. **Tanggal pembayaran sebenarnya selalu disimpan** (dari `paid_at`), termasuk saat melunasi tunggakan.
8. Simpan `raw_response` callback pada tabel transaksi untuk jejak audit.
9. Jangan hardcode kredensial/secret. Gunakan `.env` (jangan di-commit), sediakan `.env.example`.
10. Password wajib di-hash (`password_hash` / `password_verify`).

## Logika inti

### Status tagihan
- `BELUM BAYAR` → default saat tagihan dibuat.
- `TUNGGAKAN` → tidak ada pembayaran sampai akhir bulan; berlaku mulai **tanggal 1 bulan berikutnya**.
- `LUNAS` → hanya via transaksi PG yang valid.
- `tanggal_jatuh_tempo` = hari terakhir bulan tagihan (hitung dengan `LAST_DAY()` / `date('t')`, jangan hardcode 30).
- Bayar pada hari jatuh tempo (jam berapa pun) masih LUNAS, bukan tunggakan.
- Transisi: `BELUM BAYAR → LUNAS`, `BELUM BAYAR → TUNGGAKAN → LUNAS`.
- Penentuan tunggakan: job harian **dan** pengecekan saat query (`status = BELUM BAYAR AND jatuh_tempo < CURDATE()` dianggap TUNGGAKAN), supaya benar walau job terlewat.

### Pipeline callback (urutan wajib, dalam satu DB transaction)

```
terima → validasi signature/format → cek transaction_id duplikat
→ cari VA → cari siswa → cari tagihan (tertua yang belum lunas)
→ cocokkan nominal → simpan transaksi → insert pembayaran
→ update tagihan LUNAS → commit
```

Respons: HTTP 200 + JSON untuk sukses/duplikat yang sudah diproses; 4xx dengan alasan jelas untuk VA tidak terdaftar, nominal tidak cocok, signature tidak valid, tagihan tidak ditemukan. Jangan ubah data jika ada langkah yang gagal (rollback).

### Payload callback

```json
{
  "virtual_account": "8800012345",
  "amount": 350000,
  "transaction_id": "TRX-20260918-001",
  "status": "PAID",
  "paid_at": "2026-09-25 10:15:00"
}
```

Hanya `status = "PAID"` yang melunasi tagihan. Status lain dicatat sebagai transaksi gagal tanpa mengubah tagihan.

### Validasi callback
Signature HMAC-SHA256 pada body dengan secret bersama (header `X-Signature`), bandingkan dengan `hash_equals`. Cek field wajib, tipe, `amount > 0`, format `paid_at`.

## Skema database

Gunakan 10 tabel pada `prd.md` bagian 8. Catatan:
- Tambahkan kolom `siswa.nisn` (UNIQUE) walau tidak ada di daftar materi.
- UNIQUE: `siswa.nis`, `siswa.nisn`, `virtual_account.nomor_va`, `transaksi_payment_gateway.transaction_id`, `tagihan_spp(id_siswa, bulan, tahun)`.
- Foreign key + index pada kolom pencarian (`nis`, `nisn`, `nomor_va`, `transaction_id`).
- Nama tabel dan kolom pakai bahasa Indonesia persis seperti materi (`tagihan_spp`, `id_siswa`, dll.) agar sesuai penilaian.

## Konvensi kode

- Bahasa UI dan label: **Indonesia**. Identifier tabel/kolom: mengikuti materi. Identifier kode lain: Inggris boleh, konsisten.
- Semua query pakai prepared statement. Output di-escape (`htmlspecialchars`). Form pakai token CSRF.
- Logika bisnis di service layer, bukan di template/view.
- Format rupiah: `Rp350.000` (pemisah ribuan titik).
- Satu fungsi satu tanggung jawab; hindari file lebih dari ~300 baris.
- Commit kecil dengan pesan jelas (Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`).

## Pengujian

Wajib ada test untuk:
- Login: valid, username salah, password salah, field kosong.
- VA: valid, duplikat, tidak terdaftar, 5 digit terakhir ≠ NIS ditolak.
- Callback: berhasil, gagal, tidak valid (signature salah), duplicate callback, transaction ID duplikat, nominal tidak cocok.
- Tagihan: belum bayar, lunas, tunggakan; bayar sebelum jatuh tempo, tepat hari terakhir, setelah jadi tunggakan.
- Hak akses: tiap role; siswa mengakses data siswa lain harus 403/404.
- Tidak ada jalur untuk set LUNAS tanpa transaksi PG.

Jalankan semua test sebelum menyatakan pekerjaan selesai.

## Data seed untuk demo

| NIS | Nama | VA |
|---|---|---|
| 12345 | Ahmad Fauzan (XI RPL 1) | 8800012345 |
| 12346 | Siti Aminah | 8800012346 |
| 12347 | Budi Santoso | 8800012347 |
| 12348 | Citra Lestari | 8800012348 |

Tarif SPP: Rp350.000/bulan. Sediakan 1 akun per role (admin, kepsek, teller, siswa) dengan password demo yang di-hash. Seed tagihan: Juli–Agustus LUNAS, September BELUM BAYAR (untuk demo bayar), plus satu siswa dengan tunggakan.

## Cara bekerja

1. Baca `prd.md` sebelum mengerjakan fitur; ikuti urutan: skema → auth/role → master data → generate tagihan → callback + simulator → dashboard → laporan/pencarian → test.
2. Kerjakan bertahap; jelaskan singkat apa yang diubah dan cara mengujinya.
3. Jika materi ambigu (lihat `prd.md` bagian 12), pilih asumsi paling sederhana, catat di `docs/`, dan tanyakan bila berdampak besar.
4. Jangan menambah fitur di luar PRD (mis. pembayaran parsial, tunai) tanpa persetujuan.
5. Jangan menghapus atau melemahkan validasi/constraint agar test lolos; perbaiki penyebabnya.
6. Sebelum selesai: jalankan test, cek bahwa demo skenario BELUM BAYAR → simulasi bayar → callback → LUNAS berjalan end-to-end.

## Yang perlu persetujuan dulu

- Mengganti stack/framework.
- Mengubah skema tabel dari materi (selain penambahan `nisn`).
- Menambah dependency besar.
- Operasi destruktif pada database (drop/truncate) di luar seed/migrasi.
