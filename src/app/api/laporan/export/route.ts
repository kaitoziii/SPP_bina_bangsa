import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatTanggal, getNamaBulan } from "@/lib/format";
import { TagihanService } from "@/lib/services/tagihan.service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin", "kepala_sekolah", "teller"], req);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const bulan = searchParams.get("bulan");
  const tahun = searchParams.get("tahun");
  const id_tahun_ajaran = searchParams.get("id_tahun_ajaran");
  const id_kelas = searchParams.get("id_kelas");
  const id_jurusan = searchParams.get("id_jurusan");

  try {
    await TagihanService.syncOverdueStatus();

    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (bulan && bulan !== "ALL") where.bulan = Number(bulan);
    if (tahun && tahun !== "ALL") where.tahun = Number(tahun);
    if (id_tahun_ajaran && id_tahun_ajaran !== "ALL") where.id_tahun_ajaran = Number(id_tahun_ajaran);
    if (id_kelas && id_kelas !== "ALL") where.siswa = { ...where.siswa, id_kelas: Number(id_kelas) };
    if (id_jurusan && id_jurusan !== "ALL") {
      where.siswa = { ...where.siswa, kelas: { id_jurusan: Number(id_jurusan) } };
    }

    const tagihan = await prisma.tagihan_spp.findMany({
      where,
      include: {
        siswa: {
          include: {
            kelas: { include: { jurusan: true } },
            virtual_account: true,
          },
        },
        tahun_ajaran: true,
        pembayaran: {
          include: { transaksi_payment_gateway: true },
        },
      },
      orderBy: [{ tahun: "desc" }, { bulan: "desc" }, { siswa: { nama: "asc" } }],
    });

    // Build CSV Content
    const headers = [
      "No",
      "NIS",
      "NISN",
      "Nama Siswa",
      "Kelas",
      "Jurusan",
      "Virtual Account",
      "Periode",
      "Nominal (Rp)",
      "Status",
      "Tanggal Bayar",
      "Transaction ID",
    ];

    const rows = tagihan.map((t, idx) => {
      const pembayaran = t.pembayaran[0];
      const tglBayar = pembayaran ? formatTanggal(pembayaran.tanggal_pembayaran, true) : "-";
      const trxId = pembayaran?.transaksi_payment_gateway?.transaction_id || "-";
      const periode = `${getNamaBulan(t.bulan)} ${t.tahun}`;

      return [
        idx + 1,
        `"${t.siswa.nis}"`,
        `"${t.siswa.nisn}"`,
        `"${t.siswa.nama.replace(/"/g, '""')}"`,
        `"${t.siswa.kelas?.nama_kelas || "-"}"`,
        `"${t.siswa.kelas?.jurusan?.nama_jurusan || "-"}"`,
        `"${t.siswa.virtual_account?.nomor_va || "-"}"`,
        `"${periode}"`,
        t.nominal,
        `"${t.status}"`,
        `"${tglBayar}"`,
        `"${trxId}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-spp-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export CSV error:", error);
    return NextResponse.json({ error: "Gagal mengekspor laporan CSV." }, { status: 500 });
  }
}
