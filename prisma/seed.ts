import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

async function main() {
  console.log("🌱 Memulai seeding database...");

  // Bersihkan data lama jika ada
  await prisma.audit_log.deleteMany();
  await prisma.callback_log.deleteMany();
  await prisma.pembayaran.deleteMany();
  await prisma.transaksi_payment_gateway.deleteMany();
  await prisma.pengajuan_beasiswa.deleteMany();
  await prisma.tagihan_spp.deleteMany();
  await prisma.virtual_account.deleteMany();
  await prisma.siswa.deleteMany();
  await prisma.tarif_spp.deleteMany();
  await prisma.kelas.deleteMany();
  await prisma.jurusan.deleteMany();
  await prisma.tahun_ajaran.deleteMany();
  await prisma.users.deleteMany();

  // 1. Tahun Ajaran
  const taAktif = await prisma.tahun_ajaran.create({
    data: {
      tahun_ajaran: "2026/2027",
      tanggal_mulai: new Date("2026-07-01T00:00:00.000Z"),
      tanggal_selesai: new Date("2027-06-30T23:59:59.000Z"),
      status: "AKTIF",
    },
  });

  // 2. Jurusan
  const jurusanRpl = await prisma.jurusan.create({
    data: {
      kode_jurusan: "RPL",
      nama_jurusan: "Rekayasa Perangkat Lunak",
      keterangan: "Pengembangan Perangkat Lunak dan Gim",
    },
  });

  const jurusanTkj = await prisma.jurusan.create({
    data: {
      kode_jurusan: "TKJ",
      nama_jurusan: "Teknik Komputer dan Jaringan",
      keterangan: "Infrastruktur Jaringan dan Komputasi Awan",
    },
  });

  // 3. Kelas
  const kelasXiRpl1 = await prisma.kelas.create({
    data: {
      nama_kelas: "XI RPL 1",
      tingkat: "XI",
      id_jurusan: jurusanRpl.id_jurusan,
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
    },
  });

  await prisma.kelas.create({
    data: {
      nama_kelas: "XI TKJ 1",
      tingkat: "XI",
      id_jurusan: jurusanTkj.id_jurusan,
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
    },
  });

  // 4. Tarif SPP
  const tarifSpp = await prisma.tarif_spp.create({
    data: {
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
      nominal: 350000,
      keterangan: "Tarif SPP Reguler Kelas XI TA 2026/2027",
      status: "AKTIF",
    },
  });

  // 5. Akun Pengguna (Admin, Kepsek, Teller)
  const passwordAdmin = await hashPassword("admin123");
  const userAdmin = await prisma.users.create({
    data: {
      nama: "Administrator Sekolah",
      username: "admin",
      password: passwordAdmin,
      role: "admin",
      status: "AKTIF",
    },
  });

  const passwordKepsek = await hashPassword("kepsek123");
  await prisma.users.create({
    data: {
      nama: "Drs. H. M. Mansur, M.Pd",
      username: "kepsek",
      password: passwordKepsek,
      role: "kepala_sekolah",
      status: "AKTIF",
    },
  });

  const passwordTeller = await hashPassword("teller123");
  await prisma.users.create({
    data: {
      nama: "Siti Rahayu, S.E.",
      username: "teller",
      password: passwordTeller,
      role: "teller",
      status: "AKTIF",
    },
  });

  // 6. Akun Siswa & Master Data Siswa
  const dataSiswa = [
    {
      nis: "12345",
      nisn: "0061234501",
      nama: "Ahmad Fauzan",
      jk: "L",
      tempatLahir: "Sidoarjo",
      tglLahir: "2009-05-14",
      alamat: "Jl. Pahlawan No. 12, Sidoarjo",
      noHp: "081234567890",
      ortu: "Fauzi Rahman",
      username: "12345",
      va: "8800012345",
    },
    {
      nis: "12346",
      nisn: "0061234502",
      nama: "Siti Aminah",
      jk: "P",
      tempatLahir: "Surabaya",
      tglLahir: "2009-08-20",
      alamat: "Jl. Diponegoro No. 45, Sidoarjo",
      noHp: "081234567891",
      ortu: "Amin Iskandar",
      username: "12346",
      va: "8800012346",
    },
    {
      nis: "12347",
      nisn: "0061234503",
      nama: "Budi Santoso",
      jk: "L",
      tempatLahir: "Mojokerto",
      tglLahir: "2009-01-10",
      alamat: "Jl. Veteran No. 8, Sidoarjo",
      noHp: "081234567892",
      ortu: "Santoso Broto",
      username: "12347",
      va: "8800012347",
    },
    {
      nis: "12348",
      nisn: "0061234504",
      nama: "Citra Lestari",
      jk: "P",
      tempatLahir: "Sidoarjo",
      tglLahir: "2009-11-03",
      alamat: "Jl. Raya Candi No. 99, Sidoarjo",
      noHp: "081234567893",
      ortu: "Hadi Lestari",
      username: "12348",
      va: "8800012348",
    },
  ];

  const passwordSiswa = await hashPassword("siswa123");
  const createdSiswaList = [];

  for (const s of dataSiswa) {
    const user = await prisma.users.create({
      data: {
        nama: s.nama,
        username: s.username,
        password: passwordSiswa,
        role: "siswa",
        status: "AKTIF",
      },
    });

    const siswaCreated = await prisma.siswa.create({
      data: {
        nis: s.nis,
        nisn: s.nisn,
        nama: s.nama,
        jenis_kelamin: s.jk,
        tempat_lahir: s.tempatLahir,
        tanggal_lahir: new Date(s.tglLahir),
        alamat: s.alamat,
        no_hp: s.noHp,
        nama_orang_tua: s.ortu,
        id_kelas: kelasXiRpl1.id_kelas,
        id_tahun_ajaran: taAktif.id_tahun_ajaran,
        id_user: user.id_user,
        status: "AKTIF",
      },
    });

    // Buat Virtual Account (5 digit terakhir = NIS)
    await prisma.virtual_account.create({
      data: {
        id_siswa: siswaCreated.id_siswa,
        nomor_va: s.va,
        prefix: "88000",
        status: "AKTIF",
      },
    });

    createdSiswaList.push({ ...siswaCreated, va: s.va });
  }

  // 7. Seed Tagihan & Pembayaran
  // Siswa 1 (Ahmad Fauzan - 12345):
  // Juli 2026: LUNAS (dibayar 2026-07-20)
  // Agustus 2026: LUNAS (dibayar 2026-08-22)
  // September 2026: BELUM BAYAR (jatuh tempo 2026-09-30) - untuk demo bayar!
  const ahmad = createdSiswaList[0];

  // Tagihan Juli Ahmad
  const tagihanJuliAhmad = await prisma.tagihan_spp.create({
    data: {
      id_siswa: ahmad.id_siswa,
      id_tarif: tarifSpp.id_tarif,
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
      bulan: 7,
      tahun: 2026,
      nominal: 350000,
      tanggal_jatuh_tempo: new Date("2026-07-31T23:59:59.000Z"),
      status: "LUNAS",
    },
  });

  const trxJuliAhmad = await prisma.transaksi_payment_gateway.create({
    data: {
      transaction_id: "TRX-20260720-001",
      virtual_account: ahmad.va,
      id_siswa: ahmad.id_siswa,
      tanggal_transaksi: new Date("2026-07-20T10:15:00.000Z"),
      waktu_transaksi: "10:15:00",
      nominal: 350000,
      status_transaksi: "PAID",
      payment_channel: "VIRTUAL_ACCOUNT",
      reference_number: "REF-20260720-001",
      raw_response: JSON.stringify({
        virtual_account: ahmad.va,
        amount: 350000,
        transaction_id: "TRX-20260720-001",
        status: "PAID",
        paid_at: "2026-07-20 10:15:00",
      }),
    },
  });

  await prisma.pembayaran.create({
    data: {
      id_transaksi: trxJuliAhmad.id_transaksi,
      id_tagihan: tagihanJuliAhmad.id_tagihan,
      tanggal_pembayaran: new Date("2026-07-20T10:15:00.000Z"),
      nominal_pembayaran: 350000,
      status: "BERHASIL",
    },
  });

  // Tagihan Agustus Ahmad
  const tagihanAgustusAhmad = await prisma.tagihan_spp.create({
    data: {
      id_siswa: ahmad.id_siswa,
      id_tarif: tarifSpp.id_tarif,
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
      bulan: 8,
      tahun: 2026,
      nominal: 350000,
      tanggal_jatuh_tempo: new Date("2026-08-31T23:59:59.000Z"),
      status: "LUNAS",
    },
  });

  const trxAgustusAhmad = await prisma.transaksi_payment_gateway.create({
    data: {
      transaction_id: "TRX-20260822-002",
      virtual_account: ahmad.va,
      id_siswa: ahmad.id_siswa,
      tanggal_transaksi: new Date("2026-08-22T14:30:00.000Z"),
      waktu_transaksi: "14:30:00",
      nominal: 350000,
      status_transaksi: "PAID",
      payment_channel: "VIRTUAL_ACCOUNT",
      reference_number: "REF-20260822-002",
      raw_response: JSON.stringify({
        virtual_account: ahmad.va,
        amount: 350000,
        transaction_id: "TRX-20260822-002",
        status: "PAID",
        paid_at: "2026-08-22 14:30:00",
      }),
    },
  });

  await prisma.pembayaran.create({
    data: {
      id_transaksi: trxAgustusAhmad.id_transaksi,
      id_tagihan: tagihanAgustusAhmad.id_tagihan,
      tanggal_pembayaran: new Date("2026-08-22T14:30:00.000Z"),
      nominal_pembayaran: 350000,
      status: "BERHASIL",
    },
  });

  // Tagihan September Ahmad (BELUM BAYAR untuk demo skenario utama!)
  await prisma.tagihan_spp.create({
    data: {
      id_siswa: ahmad.id_siswa,
      id_tarif: tarifSpp.id_tarif,
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
      bulan: 9,
      tahun: 2026,
      nominal: 350000,
      tanggal_jatuh_tempo: new Date("2026-09-30T23:59:59.000Z"),
      status: "BELUM BAYAR",
    },
  });

  // Siswa 2 (Siti Aminah - 12346):
  // Juli: LUNAS, Agustus: TUNGGAKAN, September: BELUM BAYAR
  const siti = createdSiswaList[1];
  await prisma.tagihan_spp.create({
    data: {
      id_siswa: siti.id_siswa,
      id_tarif: tarifSpp.id_tarif,
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
      bulan: 7,
      tahun: 2026,
      nominal: 350000,
      tanggal_jatuh_tempo: new Date("2026-07-31T23:59:59.000Z"),
      status: "LUNAS",
    },
  });

  await prisma.tagihan_spp.create({
    data: {
      id_siswa: siti.id_siswa,
      id_tarif: tarifSpp.id_tarif,
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
      bulan: 8,
      tahun: 2026,
      nominal: 350000,
      tanggal_jatuh_tempo: new Date("2026-08-31T23:59:59.000Z"),
      status: "TUNGGAKAN",
    },
  });

  await prisma.tagihan_spp.create({
    data: {
      id_siswa: siti.id_siswa,
      id_tarif: tarifSpp.id_tarif,
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
      bulan: 9,
      tahun: 2026,
      nominal: 350000,
      tanggal_jatuh_tempo: new Date("2026-09-30T23:59:59.000Z"),
      status: "BELUM BAYAR",
    },
  });

  // Siswa 3 (Budi Santoso - 12347):
  // Juli: TUNGGAKAN, Agustus: TUNGGAKAN, September: BELUM BAYAR, Oktober: BELUM BAYAR
  // Memiliki pengajuan beasiswa aktif (DIAJUKAN)
  const budi = createdSiswaList[2];
  await prisma.tagihan_spp.create({
    data: {
      id_siswa: budi.id_siswa,
      id_tarif: tarifSpp.id_tarif,
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
      bulan: 7,
      tahun: 2026,
      nominal: 350000,
      tanggal_jatuh_tempo: new Date("2026-07-31T23:59:59.000Z"),
      status: "TUNGGAKAN",
    },
  });

  await prisma.tagihan_spp.create({
    data: {
      id_siswa: budi.id_siswa,
      id_tarif: tarifSpp.id_tarif,
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
      bulan: 8,
      tahun: 2026,
      nominal: 350000,
      tanggal_jatuh_tempo: new Date("2026-08-31T23:59:59.000Z"),
      status: "TUNGGAKAN",
    },
  });

  await prisma.tagihan_spp.create({
    data: {
      id_siswa: budi.id_siswa,
      id_tarif: tarifSpp.id_tarif,
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
      bulan: 9,
      tahun: 2026,
      nominal: 350000,
      tanggal_jatuh_tempo: new Date("2026-09-30T23:59:59.000Z"),
      status: "BELUM BAYAR",
    },
  });

  await prisma.tagihan_spp.create({
    data: {
      id_siswa: budi.id_siswa,
      id_tarif: tarifSpp.id_tarif,
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
      bulan: 10,
      tahun: 2026,
      nominal: 350000,
      tanggal_jatuh_tempo: new Date("2026-10-31T23:59:59.000Z"),
      status: "BELUM BAYAR",
    },
  });

  // Contoh pengajuan beasiswa Budi yang berstatus DIAJUKAN
  await prisma.pengajuan_beasiswa.create({
    data: {
      id_siswa: budi.id_siswa,
      jenis: "KURANG_MAMPU",
      alasan: "Keluarga terdampak musibah ekonomi dan memegang Kartu Indonesia Pintar (KIP)",
      lampiran: "surat_keterangan_tidak_mampu.pdf",
      status: "DIAJUKAN",
      tanggal_pengajuan: new Date("2026-09-01T08:00:00.000Z"),
    },
  });

  // Siswa 4 (Citra Lestari - 12348):
  // Juli: LUNAS, Agustus: LUNAS, September: BELUM BAYAR
  const citra = createdSiswaList[3];
  await prisma.tagihan_spp.create({
    data: {
      id_siswa: citra.id_siswa,
      id_tarif: tarifSpp.id_tarif,
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
      bulan: 7,
      tahun: 2026,
      nominal: 350000,
      tanggal_jatuh_tempo: new Date("2026-07-31T23:59:59.000Z"),
      status: "LUNAS",
    },
  });
  await prisma.tagihan_spp.create({
    data: {
      id_siswa: citra.id_siswa,
      id_tarif: tarifSpp.id_tarif,
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
      bulan: 8,
      tahun: 2026,
      nominal: 350000,
      tanggal_jatuh_tempo: new Date("2026-08-31T23:59:59.000Z"),
      status: "LUNAS",
    },
  });
  await prisma.tagihan_spp.create({
    data: {
      id_siswa: citra.id_siswa,
      id_tarif: tarifSpp.id_tarif,
      id_tahun_ajaran: taAktif.id_tahun_ajaran,
      bulan: 9,
      tahun: 2026,
      nominal: 350000,
      tanggal_jatuh_tempo: new Date("2026-09-30T23:59:59.000Z"),
      status: "BELUM BAYAR",
    },
  });

  // Audit log inisial
  await prisma.audit_log.create({
    data: {
      id_user: userAdmin.id_user,
      aksi: "INISIALISASI_SISTEM",
      entitas: "sistem",
      id_entitas: "0",
      data_sebelum: null,
      data_sesudah: JSON.stringify({ pesan: "Inisialisasi data master dan akun demo" }),
    },
  });

  console.log("✅ Database berhasil di-seed!");
}

main()
  .catch((e) => {
    console.error("❌ Gagal seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
