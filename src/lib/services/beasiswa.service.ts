import { prisma } from "../db";
import { createAuditLog } from "./audit.service";
import { PengajuanBeasiswaInput, KeputusanBeasiswaInput } from "../validations/beasiswa";

export class BeasiswaService {
  /**
   * Siswa mengajukan beasiswa baru.
   * Hanya diperbolehkan jika tidak memiliki pengajuan berstatus 'DIAJUKAN'.
   */
  static async submitPengajuan(id_siswa: number, input: PengajuanBeasiswaInput) {
    // 1. Cek apakah siswa sudah punya pengajuan aktif (DIAJUKAN)
    const existingActive = await prisma.pengajuan_beasiswa.findFirst({
      where: {
        id_siswa,
        status: "DIAJUKAN",
      },
    });

    if (existingActive) {
      throw new Error(
        "Anda sudah memiliki pengajuan beasiswa aktif yang sedang menunggu keputusan admin."
      );
    }

    // 2. Simpan pengajuan baru
    const pengajuan = await prisma.pengajuan_beasiswa.create({
      data: {
        id_siswa,
        jenis: input.jenis,
        alasan: input.alasan,
        lampiran: input.lampiran || null,
        status: "DIAJUKAN",
        tanggal_pengajuan: new Date(),
      },
      include: {
        siswa: {
          select: { nama: true, nis: true },
        },
      },
    });

    // Catat ke audit log
    await createAuditLog({
      id_user: null, // Dari siswa
      aksi: "PENGAJUAN_BEASISWA",
      entitas: "pengajuan_beasiswa",
      id_entitas: String(pengajuan.id_pengajuan),
      data_sebelum: null,
      data_sesudah: {
        id_siswa,
        jenis: input.jenis,
        alasan: input.alasan,
      },
    });

    return pengajuan;
  }

  /**
   * Siswa membatalkan pengajuan beasiswa (hanya bila status masih DIAJUKAN).
   */
  static async cancelPengajuan(id_pengajuan: number, id_siswa: number) {
    const pengajuan = await prisma.pengajuan_beasiswa.findUnique({
      where: { id_pengajuan },
    });

    if (!pengajuan) {
      throw new Error("Pengajuan beasiswa tidak ditemukan.");
    }

    if (pengajuan.id_siswa !== id_siswa) {
      throw new Error("Akses ditolak. Anda hanya dapat membatalkan pengajuan milik sendiri.");
    }

    if (pengajuan.status !== "DIAJUKAN") {
      throw new Error(
        `Pengajuan tidak dapat dibatalkan karena sudah berstatus ${pengajuan.status}.`
      );
    }

    const updated = await prisma.pengajuan_beasiswa.update({
      where: { id_pengajuan },
      data: {
        status: "DIBATALKAN",
        tanggal_keputusan: new Date(),
      },
    });

    await createAuditLog({
      id_user: null,
      aksi: "PEMBATALAN_BEASISWA",
      entitas: "pengajuan_beasiswa",
      id_entitas: String(id_pengajuan),
      data_sebelum: { status: "DIAJUKAN" },
      data_sesudah: { status: "DIBATALKAN" },
    });

    return updated;
  }

  /**
   * Admin memutuskan pengajuan beasiswa (DISETUJUI atau DITOLAK).
   * Seluruh proses dilakukan dalam satu database transaction.
   */
  static async decidePengajuan(
    id_pengajuan: number,
    adminId: number,
    input: KeputusanBeasiswaInput
  ) {
    const pengajuan = await prisma.pengajuan_beasiswa.findUnique({
      where: { id_pengajuan },
      include: { siswa: true },
    });

    if (!pengajuan) {
      throw new Error("Pengajuan beasiswa tidak ditemukan.");
    }

    if (pengajuan.status !== "DIAJUKAN") {
      throw new Error(
        `Keputusan final tidak dapat diubah. Pengajuan sudah berstatus ${pengajuan.status}.`
      );
    }

    const now = new Date();

    if (input.status === "DITOLAK") {
      // Tolak pengajuan beasiswa
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.pengajuan_beasiswa.update({
          where: { id_pengajuan },
          data: {
            status: "DITOLAK",
            catatan_admin: input.catatan,
            id_admin_pemutus: adminId,
            tanggal_keputusan: now,
          },
        });

        await tx.audit_log.create({
          data: {
            id_user: adminId,
            aksi: "PENOLAKAN_BEASISWA",
            entitas: "pengajuan_beasiswa",
            id_entitas: String(id_pengajuan),
            data_sebelum: JSON.stringify({ status: "DIAJUKAN" }),
            data_sesudah: JSON.stringify({
              status: "DITOLAK",
              alasan: input.catatan,
              admin_id: adminId,
            }),
          },
        });

        return updated;
      });

      return result;
    }

    // Status DISETUJUI
    const jumlahBulan = input.jumlah_bulan!;
    const bulanMulai = input.bulan_mulai!;
    const tahunMulai = input.tahun_mulai!;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update pengajuan_beasiswa
      const updatedPengajuan = await tx.pengajuan_beasiswa.update({
        where: { id_pengajuan },
        data: {
          status: "DISETUJUI",
          jumlah_bulan: jumlahBulan,
          bulan_mulai: bulanMulai,
          tahun_mulai: tahunMulai,
          catatan_admin: input.catatan || null,
          id_admin_pemutus: adminId,
          tanggal_keputusan: now,
        },
      });

      // 2. Tentukan daftar bulan & tahun yang dicakup beasiswa
      const targetBulanTahun: { bulan: number; tahun: number }[] = [];
      let curBulan = bulanMulai;
      let curTahun = tahunMulai;

      for (let i = 0; i < jumlahBulan; i++) {
        targetBulanTahun.push({ bulan: curBulan, tahun: curTahun });
        curBulan++;
        if (curBulan > 12) {
          curBulan = 1;
          curTahun++;
        }
      }

      // 3. Aturan keras:
      // Hanya tagihan berstatus BELUM BAYAR dan BELUM JATUH TEMPO (tanggal_jatuh_tempo >= now)
      // yang diubah menjadi BEASISWA. Tagihan LUNAS atau TUNGGAKAN tidak disentuh!
      const affectedBills: number[] = [];

      for (const target of targetBulanTahun) {
        const bill = await tx.tagihan_spp.findUnique({
          where: {
            id_siswa_bulan_tahun: {
              id_siswa: pengajuan.id_siswa,
              bulan: target.bulan,
              tahun: target.tahun,
            },
          },
        });

        if (bill) {
          // Hanya jika status === 'BELUM BAYAR' dan belum jatuh tempo
          const isBelumJatuhTempo = new Date(bill.tanggal_jatuh_tempo) >= now;
          if (bill.status === "BELUM BAYAR" && isBelumJatuhTempo) {
            await tx.tagihan_spp.update({
              where: { id_tagihan: bill.id_tagihan },
              data: { status: "BEASISWA" },
            });
            affectedBills.push(bill.id_tagihan);
          }
        }
      }

      // 4. Audit log
      await tx.audit_log.create({
        data: {
          id_user: adminId,
          aksi: "PERSETUJUAN_BEASISWA",
          entitas: "pengajuan_beasiswa",
          id_entitas: String(id_pengajuan),
          data_sebelum: JSON.stringify({ status: "DIAJUKAN" }),
          data_sesudah: JSON.stringify({
            status: "DISETUJUI",
            jumlah_bulan: jumlahBulan,
            bulan_mulai: bulanMulai,
            tahun_mulai: tahunMulai,
            catatan: input.catatan,
            tagihan_terdampak: affectedBills,
          }),
        },
      });

      return { updatedPengajuan, affectedBills };
    });

    return result;
  }

  /**
   * Cek apakah seorang siswa memiliki beasiswa aktif untuk bulan & tahun tertentu
   */
  static async checkBeasiswaActiveForMonth(
    id_siswa: number,
    bulan: number,
    tahun: number
  ): Promise<boolean> {
    const approvedList = await prisma.pengajuan_beasiswa.findMany({
      where: {
        id_siswa,
        status: "DISETUJUI",
        jumlah_bulan: { not: null },
        bulan_mulai: { not: null },
        tahun_mulai: { not: null },
      },
    });

    for (const b of approvedList) {
      let bBulan = b.bulan_mulai!;
      let bTahun = b.tahun_mulai!;
      for (let i = 0; i < b.jumlah_bulan!; i++) {
        if (bBulan === bulan && bTahun === tahun) {
          return true;
        }
        bBulan++;
        if (bBulan > 12) {
          bBulan = 1;
          bTahun++;
        }
      }
    }

    return false;
  }
}
