import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../../src/lib/db";
import { BeasiswaService } from "../../src/lib/services/beasiswa.service";
import { processPaymentCallback } from "../../src/lib/services/payment.service";
import { generateSignature } from "../../src/lib/signature";

describe("Fitur Pengajuan Beasiswa (Integration)", () => {
  let siswaCitra: any;
  let adminUser: any;
  const secret = process.env.PG_SECRET || "secret-payment-gateway-hmac-key-2026";

  beforeAll(async () => {
    siswaCitra = await prisma.siswa.findUnique({
      where: { nis: "12348" },
      include: { virtual_account: true },
    });
    adminUser = await prisma.users.findUnique({
      where: { username: "admin" },
    });

    const tarif = await prisma.tarif_spp.findFirst();
    const ta = await prisma.tahun_ajaran.findFirst();

    // Bersihkan pengajuan beasiswa siswaCitra
    if (siswaCitra && tarif && ta) {
      await prisma.pengajuan_beasiswa.deleteMany({
        where: { id_siswa: siswaCitra.id_siswa },
      });

      // Pastikan ada 1 tagihan BELUM BAYAR bulan depan (belum jatuh tempo)
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 2);
      const b = futureDate.getMonth() + 1;
      const y = futureDate.getFullYear();

      await prisma.tagihan_spp.upsert({
        where: {
          id_siswa_bulan_tahun: {
            id_siswa: siswaCitra.id_siswa,
            bulan: b,
            tahun: y,
          },
        },
        create: {
          id_siswa: siswaCitra.id_siswa,
          id_tarif: tarif.id_tarif,
          id_tahun_ajaran: ta.id_tahun_ajaran,
          bulan: b,
          tahun: y,
          nominal: 350000,
          tanggal_jatuh_tempo: new Date(y, b, 0, 23, 59, 59),
          status: "BELUM BAYAR",
        },
        update: {
          status: "BELUM BAYAR",
          tanggal_jatuh_tempo: new Date(y, b, 0, 23, 59, 59),
        },
      });
    }
  });

  it("1. Siswa dapat mengajukan beasiswa dengan status awal DIAJUKAN", async () => {
    const pengajuan = await BeasiswaService.submitPengajuan(siswaCitra.id_siswa, {
      jenis: "PRESTASI",
      alasan: "Juara 1 Lomba Kompetensi Siswa (LKS) Web Technologies",
      lampiran: "piagam_lks.pdf",
    });

    expect(pengajuan.status).toBe("DIAJUKAN");
    expect(pengajuan.id_siswa).toBe(siswaCitra.id_siswa);
  });

  it("2. Siswa ditolak jika mencoba memiliki 2 pengajuan aktif bersamaan", async () => {
    await expect(
      BeasiswaService.submitPengajuan(siswaCitra.id_siswa, {
        jenis: "KURANG_MAMPU",
        alasan: "Permohonan kedua yang seharusnya ditolak",
      })
    ).rejects.toThrow(/sudah memiliki pengajuan beasiswa aktif/);
  });

  it("3. Siswa dapat membatalkan pengajuannya selama masih DIAJUKAN", async () => {
    const active = await prisma.pengajuan_beasiswa.findFirst({
      where: { id_siswa: siswaCitra.id_siswa, status: "DIAJUKAN" },
    });
    expect(active).toBeDefined();

    const cancelled = await BeasiswaService.cancelPengajuan(
      active!.id_pengajuan,
      siswaCitra.id_siswa
    );
    expect(cancelled.status).toBe("DIBATALKAN");
  });

  it("4. Siswa tidak dapat membatalkan pengajuan milik siswa lain", async () => {
    // Buat pengajuan untuk siswa lain (Ahmad Fauzan - 12345)
    const ahmad = await prisma.siswa.findUnique({ where: { nis: "12345" } });
    await prisma.pengajuan_beasiswa.deleteMany({ where: { id_siswa: ahmad!.id_siswa } });

    const pengajuanAhmad = await BeasiswaService.submitPengajuan(ahmad!.id_siswa, {
      jenis: "KURANG_MAMPU",
      alasan: "Permohonan bantuan Ahmad",
    });

    // Siswa Citra mencoba membatalkan pengajuan Ahmad -> ditolak
    await expect(
      BeasiswaService.cancelPengajuan(pengajuanAhmad.id_pengajuan, siswaCitra.id_siswa)
    ).rejects.toThrow(/Akses ditolak/);
  });

  it("5. Admin menyetujui beasiswa: HANYA mengubah tagihan BELUM BAYAR yang belum jatuh tempo menjadi BEASISWA", async () => {
    // Siapkan pengajuan baru untuk Citra
    const pengajuanBaru = await BeasiswaService.submitPengajuan(siswaCitra.id_siswa, {
      jenis: "PRESTASI",
      alasan: "Prestasi akademik semester genap",
    });

    // Tanggal bulan depan
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 2);
    const targetBulan = futureDate.getMonth() + 1;
    const targetTahun = futureDate.getFullYear();

    // Pastikan tagihan Juli Citra yang LUNAS tidak disentuh
    const tagihanJuliSebelum = await prisma.tagihan_spp.findUnique({
      where: {
        id_siswa_bulan_tahun: {
          id_siswa: siswaCitra.id_siswa,
          bulan: 7,
          tahun: 2026,
        },
      },
    });

    // Admin setujui 1 bulan
    const decision = await BeasiswaService.decidePengajuan(
      pengajuanBaru.id_pengajuan,
      adminUser.id_user,
      {
        status: "DISETUJUI",
        jumlah_bulan: 1,
        bulan_mulai: targetBulan,
        tahun_mulai: targetTahun,
        catatan: "Disetujui beasiswa 1 bulan",
      }
    );

    expect(decision.updatedPengajuan.status).toBe("DISETUJUI");

    // Periksa status tagihan bulan depan: HARUS menjadi BEASISWA (bukan LUNAS)
    const targetBill = await prisma.tagihan_spp.findUnique({
      where: {
        id_siswa_bulan_tahun: {
          id_siswa: siswaCitra.id_siswa,
          bulan: targetBulan,
          tahun: targetTahun,
        },
      },
    });

    expect(targetBill!.status).toBe("BEASISWA");

    // Tagihan Juli yang berstatus LUNAS tidak berubah
    const tagihanJuliSesudah = await prisma.tagihan_spp.findUnique({
      where: {
        id_siswa_bulan_tahun: {
          id_siswa: siswaCitra.id_siswa,
          bulan: 7,
          tahun: 2026,
        },
      },
    });
    expect(tagihanJuliSesudah!.status).toBe(tagihanJuliSebelum!.status);
  });

  it("6. Tagihan berstatus BEASISWA tidak dapat dibayar via VA Payment Gateway", async () => {
    // Ubah semua tagihan Citra menjadi BEASISWA untuk menguji penolakan
    await prisma.tagihan_spp.updateMany({
      where: { id_siswa: siswaCitra.id_siswa, status: "BELUM BAYAR" },
      data: { status: "BEASISWA" },
    });

    const trxId = `TRX-TEST-BEASISWA-REJECT-${Date.now()}`;
    const payload = JSON.stringify({
      virtual_account: siswaCitra.virtual_account.nomor_va,
      amount: 350000,
      transaction_id: trxId,
      status: "PAID",
      paid_at: "2026-10-01 10:00:00",
    });

    const sig = generateSignature(payload, secret);
    const result = await processPaymentCallback(payload, sig);

    // Harus ditolak karena tidak ada tagihan belum lunas yang dapat dibayar (status BEASISWA dibebaskan)
    expect(result.statusCode).toBe(404);
    expect(result.message).toMatch(/BEASISWA/);
  });

  it("7. Keputusan final tidak bisa diubah kembali", async () => {
    const finalPengajuan = await prisma.pengajuan_beasiswa.findFirst({
      where: { id_siswa: siswaCitra.id_siswa, status: "DISETUJUI" },
    });

    await expect(
      BeasiswaService.decidePengajuan(
        finalPengajuan!.id_pengajuan,
        adminUser.id_user,
        {
          status: "DITOLAK",
          catatan: "Mencoba mengubah yang sudah disetujui",
        }
      )
    ).rejects.toThrow(/Keputusan final tidak dapat diubah/);
  });

  it("8. Seluruh mutasi persetujuan beasiswa tercatat di audit_log", async () => {
    const log = await prisma.audit_log.findFirst({
      where: { aksi: "PERSETUJUAN_BEASISWA" },
      orderBy: { created_at: "desc" },
    });

    expect(log).toBeDefined();
    expect(log!.id_user).toBe(adminUser.id_user);
    expect(log!.entitas).toBe("pengajuan_beasiswa");
  });

  it("9. Pengajuan beasiswa mendukung berkas dokumen pendukung dan dapat diakses oleh Admin & Kepala Sekolah", async () => {
    // Siswa Budi mengajukan beasiswa dengan dokumen pendukung
    const budi = await prisma.siswa.findUnique({ where: { nis: "12347" } });
    await prisma.pengajuan_beasiswa.deleteMany({ where: { id_siswa: budi!.id_siswa } });

    const pengajuanBudi = await BeasiswaService.submitPengajuan(budi!.id_siswa, {
      jenis: "KURANG_MAMPU",
      alasan: "Surat Keterangan Tidak Mampu (SKTM) dari Kelurahan",
      lampiran: "/uploads/lampiran/sktm_budi_12347.pdf",
    });

    expect(pengajuanBudi.lampiran).toBe("/uploads/lampiran/sktm_budi_12347.pdf");

    // Admin & Kepsek membaca data pengajuan
    const pengajuanInDb = await prisma.pengajuan_beasiswa.findUnique({
      where: { id_pengajuan: pengajuanBudi.id_pengajuan },
      include: { siswa: { include: { kelas: true } } },
    });

    expect(pengajuanInDb).toBeDefined();
    expect(pengajuanInDb!.lampiran).toBe("/uploads/lampiran/sktm_budi_12347.pdf");
    expect(pengajuanInDb!.siswa.nis).toBe("12347");
  });
});
