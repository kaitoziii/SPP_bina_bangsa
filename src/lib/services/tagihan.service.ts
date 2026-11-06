import { prisma } from "../db";
import { hitungJatuhTempo } from "../format";
import { BeasiswaService } from "./beasiswa.service";
import { createAuditLog } from "./audit.service";

export interface GenerateTagihanOptions {
  id_tahun_ajaran: number;
  bulan: number;
  tahun: number;
  id_kelas?: number | null;
  adminId?: number;
}

export interface PreviewTagihanItem {
  id_siswa: number;
  nis: string;
  nama: string;
  kelas: string;
  bulan: number;
  tahun: number;
  nominal: number;
  status: "BELUM BAYAR" | "BEASISWA" | "SUDAH_ADA";
  alasanStatus?: string;
}

export class TagihanService {
  /**
   * Preview pembentukan tagihan sebelum benar-benar di-generate ke database
   */
  static async previewGenerateTagihan(options: GenerateTagihanOptions): Promise<{
    tarif: number;
    totalSiswa: number;
    akanDibuatBelumBayar: number;
    akanDibuatBeasiswa: number;
    sudahAda: number;
    items: PreviewTagihanItem[];
  }> {
    const { id_tahun_ajaran, bulan, tahun, id_kelas } = options;

    // 1. Ambil tarif SPP aktif
    const tarif = await prisma.tarif_spp.findFirst({
      where: { id_tahun_ajaran, status: "AKTIF" },
    });

    if (!tarif) {
      throw new Error("Tarif SPP aktif untuk tahun ajaran ini belum ditentukan.");
    }

    // 2. Ambil siswa aktif
    const whereSiswa: {
      id_tahun_ajaran: number;
      status: string;
      id_kelas?: number;
    } = {
      id_tahun_ajaran,
      status: "AKTIF",
    };
    if (id_kelas) {
      whereSiswa.id_kelas = id_kelas;
    }

    const siswaList = await prisma.siswa.findMany({
      where: whereSiswa,
      include: {
        kelas: true,
        tagihan_spp: {
          where: { bulan, tahun },
        },
      },
      orderBy: { nama: "asc" },
    });

    const items: PreviewTagihanItem[] = [];
    let akanDibuatBelumBayar = 0;
    let akanDibuatBeasiswa = 0;
    let sudahAda = 0;

    for (const s of siswaList) {
      if (s.tagihan_spp.length > 0) {
        sudahAda++;
        items.push({
          id_siswa: s.id_siswa,
          nis: s.nis,
          nama: s.nama,
          kelas: s.kelas?.nama_kelas || "-",
          bulan,
          tahun,
          nominal: tarif.nominal,
          status: "SUDAH_ADA",
          alasanStatus: `Tagihan sudah ada (${s.tagihan_spp[0].status})`,
        });
      } else {
        const hasBeasiswa = await BeasiswaService.checkBeasiswaActiveForMonth(
          s.id_siswa,
          bulan,
          tahun
        );
        if (hasBeasiswa) {
          akanDibuatBeasiswa++;
          items.push({
            id_siswa: s.id_siswa,
            nis: s.nis,
            nama: s.nama,
            kelas: s.kelas?.nama_kelas || "-",
            bulan,
            tahun,
            nominal: tarif.nominal,
            status: "BEASISWA",
            alasanStatus: "Siswa memiliki program beasiswa aktif pada bulan ini",
          });
        } else {
          akanDibuatBelumBayar++;
          items.push({
            id_siswa: s.id_siswa,
            nis: s.nis,
            nama: s.nama,
            kelas: s.kelas?.nama_kelas || "-",
            bulan,
            tahun,
            nominal: tarif.nominal,
            status: "BELUM BAYAR",
          });
        }
      }
    }

    return {
      tarif: tarif.nominal,
      totalSiswa: siswaList.length,
      akanDibuatBelumBayar,
      akanDibuatBeasiswa,
      sudahAda,
      items,
    };
  }

  /**
   * Eksekusi generate tagihan secara batch
   */
  static async executeGenerateTagihan(options: GenerateTagihanOptions) {
    const preview = await this.previewGenerateTagihan(options);
    const { id_tahun_ajaran, bulan, tahun, adminId } = options;

    const tarif = await prisma.tarif_spp.findFirst({
      where: { id_tahun_ajaran, status: "AKTIF" },
    });

    if (!tarif) {
      throw new Error("Tarif SPP aktif tidak ditemukan.");
    }

    const jatuhTempo = hitungJatuhTempo(bulan, tahun);
    const billsToCreate = preview.items.filter((item) => item.status !== "SUDAH_ADA");

    if (billsToCreate.length === 0) {
      return {
        dibuat: 0,
        dilewati: preview.sudahAda,
        pesan: "Semua siswa sudah memiliki tagihan untuk periode ini.",
      };
    }

    const created = await prisma.$transaction(async (tx) => {
      const records = [];
      for (const item of billsToCreate) {
        const tagihan = await tx.tagihan_spp.create({
          data: {
            id_siswa: item.id_siswa,
            id_tarif: tarif.id_tarif,
            id_tahun_ajaran,
            bulan,
            tahun,
            nominal: tarif.nominal,
            tanggal_jatuh_tempo: jatuhTempo,
            status: item.status, // 'BELUM BAYAR' atau 'BEASISWA'
          },
        });
        records.push(tagihan);
      }

      await tx.audit_log.create({
        data: {
          id_user: adminId || null,
          aksi: "GENERATE_TAGIHAN",
          entitas: "tagihan_spp",
          id_entitas: `BULAN-${bulan}-${tahun}`,
          data_sebelum: null,
          data_sesudah: JSON.stringify({
            bulan,
            tahun,
            id_tahun_ajaran,
            total_dibuat: records.length,
            beasiswa: preview.akanDibuatBeasiswa,
            regular: preview.akanDibuatBelumBayar,
          }),
        },
      });

      return records;
    });

    return {
      dibuat: created.length,
      dilewati: preview.sudahAda,
      beasiswa: preview.akanDibuatBeasiswa,
      regular: preview.akanDibuatBelumBayar,
    };
  }

  /**
   * Evaluasi runtime penentuan tunggakan:
   * Jika tagihan berstatus BELUM BAYAR dan tanggal_jatuh_tempo < sekarang,
   * perbarui menjadi TUNGGAKAN. Tagihan BEASISWA dan LUNAS tidak tersentuh.
   */
  static async syncOverdueStatus(id_siswa?: number) {
    const now = new Date();
    const whereClause: {
      status: string;
      tanggal_jatuh_tempo: { lt: Date };
      id_siswa?: number;
    } = {
      status: "BELUM BAYAR",
      tanggal_jatuh_tempo: { lt: now },
    };

    if (id_siswa) {
      whereClause.id_siswa = id_siswa;
    }

    await prisma.tagihan_spp.updateMany({
      where: whereClause,
      data: { status: "TUNGGAKAN" },
    });
  }
}
