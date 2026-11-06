import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

    if (status && status !== "ALL") {
      where.status = status;
    }
    if (bulan && bulan !== "ALL") {
      where.bulan = Number(bulan);
    }
    if (tahun && tahun !== "ALL") {
      where.tahun = Number(tahun);
    }
    if (id_tahun_ajaran && id_tahun_ajaran !== "ALL") {
      where.id_tahun_ajaran = Number(id_tahun_ajaran);
    }

    if (id_kelas && id_kelas !== "ALL") {
      where.siswa = { ...where.siswa, id_kelas: Number(id_kelas) };
    }

    if (id_jurusan && id_jurusan !== "ALL") {
      where.siswa = {
        ...where.siswa,
        kelas: { id_jurusan: Number(id_jurusan) },
      };
    }

    const tagihan = await prisma.tagihan_spp.findMany({
      where,
      include: {
        siswa: {
          include: {
            kelas: {
              include: { jurusan: true },
            },
            virtual_account: true,
          },
        },
        tahun_ajaran: true,
        pembayaran: {
          include: {
            transaksi_payment_gateway: true,
          },
        },
      },
      orderBy: [
        { tahun: "desc" },
        { bulan: "desc" },
        { siswa: { nama: "asc" } },
      ],
    });

    // Hitung ringkasan
    let totalPenerimaan = 0;
    let totalTunggakan = 0;
    let totalBeasiswa = 0;
    let totalBelumBayar = 0;

    for (const t of tagihan) {
      if (t.status === "LUNAS") {
        totalPenerimaan += t.nominal;
      } else if (t.status === "TUNGGAKAN") {
        totalTunggakan += t.nominal;
      } else if (t.status === "BEASISWA") {
        totalBeasiswa += t.nominal;
      } else if (t.status === "BELUM BAYAR") {
        totalBelumBayar += t.nominal;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total_penerimaan: totalPenerimaan,
        total_tunggakan: totalTunggakan,
        total_beasiswa: totalBeasiswa,
        total_belum_bayar: totalBelumBayar,
        count: tagihan.length,
      },
      data: tagihan,
    });
  } catch (error) {
    console.error("Laporan error:", error);
    return NextResponse.json({ error: "Gagal memuat laporan." }, { status: 500 });
  }
}
