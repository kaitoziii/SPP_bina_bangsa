import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../../src/lib/db";
import { TagihanService } from "../../src/lib/services/tagihan.service";

describe("Job Penentuan Tunggakan (Integration)", () => {
  let siswaSiti: any;
  let idTarif: number;
  let idTa: number;

  beforeAll(async () => {
    siswaSiti = await prisma.siswa.findUnique({ where: { nis: "12346" } });
    const tarif = await prisma.tarif_spp.findFirst();
    const ta = await prisma.tahun_ajaran.findFirst();
    idTarif = tarif!.id_tarif;
    idTa = ta!.id_tahun_ajaran;
  });

  it("1. Tagihan BELUM BAYAR yang telah melewati tanggal jatuh tempo otomatis berubah menjadi TUNGGAKAN", async () => {
    // Buat tagihan masa lalu (jatuh tempo kemarin) dengan status BELUM BAYAR
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    const testBill = await prisma.tagihan_spp.upsert({
      where: {
        id_siswa_bulan_tahun: {
          id_siswa: siswaSiti.id_siswa,
          bulan: 1,
          tahun: 2025,
        },
      },
      create: {
        id_siswa: siswaSiti.id_siswa,
        id_tarif: idTarif,
        id_tahun_ajaran: idTa,
        bulan: 1,
        tahun: 2025,
        nominal: 350000,
        tanggal_jatuh_tempo: pastDate,
        status: "BELUM BAYAR",
      },
      update: {
        tanggal_jatuh_tempo: pastDate,
        status: "BELUM BAYAR",
      },
    });

    expect(testBill.status).toBe("BELUM BAYAR");

    // Jalankan sync
    await TagihanService.syncOverdueStatus(siswaSiti.id_siswa);

    // Verifikasi berubah menjadi TUNGGAKAN
    const updated = await prisma.tagihan_spp.findUnique({
      where: { id_tagihan: testBill.id_tagihan },
    });
    expect(updated!.status).toBe("TUNGGAKAN");
  });

  it("2. Tagihan berstatus BEASISWA yang telah melewati jatuh tempo TIDAK PERNAH menjadi TUNGGAKAN", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    const beasiswaBill = await prisma.tagihan_spp.upsert({
      where: {
        id_siswa_bulan_tahun: {
          id_siswa: siswaSiti.id_siswa,
          bulan: 2,
          tahun: 2025,
        },
      },
      create: {
        id_siswa: siswaSiti.id_siswa,
        id_tarif: idTarif,
        id_tahun_ajaran: idTa,
        bulan: 2,
        tahun: 2025,
        nominal: 350000,
        tanggal_jatuh_tempo: pastDate,
        status: "BEASISWA",
      },
      update: {
        tanggal_jatuh_tempo: pastDate,
        status: "BEASISWA",
      },
    });

    // Jalankan sync
    await TagihanService.syncOverdueStatus(siswaSiti.id_siswa);

    // Verifikasi status tetap BEASISWA
    const check = await prisma.tagihan_spp.findUnique({
      where: { id_tagihan: beasiswaBill.id_tagihan },
    });
    expect(check!.status).toBe("BEASISWA");
  });

  it("3. Tagihan berstatus LUNAS yang telah melewati jatuh tempo TIDAK PERNAH menjadi TUNGGAKAN", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    const lunasBill = await prisma.tagihan_spp.upsert({
      where: {
        id_siswa_bulan_tahun: {
          id_siswa: siswaSiti.id_siswa,
          bulan: 3,
          tahun: 2025,
        },
      },
      create: {
        id_siswa: siswaSiti.id_siswa,
        id_tarif: idTarif,
        id_tahun_ajaran: idTa,
        bulan: 3,
        tahun: 2025,
        nominal: 350000,
        tanggal_jatuh_tempo: pastDate,
        status: "LUNAS",
      },
      update: {
        tanggal_jatuh_tempo: pastDate,
        status: "LUNAS",
      },
    });

    await TagihanService.syncOverdueStatus(siswaSiti.id_siswa);

    const check = await prisma.tagihan_spp.findUnique({
      where: { id_tagihan: lunasBill.id_tagihan },
    });
    expect(check!.status).toBe("LUNAS");
  });
});
