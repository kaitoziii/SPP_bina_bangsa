import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function markOverdueBills() {
  console.log("🕒 Menjalankan job penentuan tunggakan SPP...");
  const now = new Date();

  // Cari tagihan yang masih BELUM BAYAR dan sudah melewati tanggal jatuh tempo
  // Catatan penting: Status BEASISWA dan LUNAS tidak boleh diubah menjadi TUNGGAKAN
  const result = await prisma.tagihan_spp.updateMany({
    where: {
      status: "BELUM BAYAR",
      tanggal_jatuh_tempo: {
        lt: now,
      },
    },
    data: {
      status: "TUNGGAKAN",
    },
  });

  if (result.count > 0) {
    // Catat ke audit log
    await prisma.audit_log.create({
      data: {
        aksi: "JOB_MARK_OVERDUE",
        entitas: "tagihan_spp",
        id_entitas: "BATCH",
        data_sebelum: JSON.stringify({ status: "BELUM BAYAR" }),
        data_sesudah: JSON.stringify({
          status: "TUNGGAKAN",
          total_tagihan_diupdate: result.count,
          eksekusi_pada: now.toISOString(),
        }),
      },
    });
  }

  console.log(`✅ Selesai. Sebanyak ${result.count} tagihan diperbarui menjadi TUNGGAKAN.`);
}

markOverdueBills()
  .catch((e) => {
    console.error("❌ Gagal mengeksekusi job tunggakan:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
