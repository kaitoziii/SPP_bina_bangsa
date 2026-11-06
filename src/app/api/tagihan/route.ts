import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TagihanService } from "@/lib/services/tagihan.service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin", "kepala_sekolah", "teller", "siswa"], req);
  if (!auth.success) return auth.response;

  const { user } = auth;
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status");
  const bulan = searchParams.get("bulan");
  const tahun = searchParams.get("tahun");
  const id_kelas = searchParams.get("id_kelas");
  const q = searchParams.get("q");

  try {
    // Sinkronisasi status tunggakan secara runtime
    if (user.role === "siswa") {
      await TagihanService.syncOverdueStatus(user.id_siswa!);
    } else {
      await TagihanService.syncOverdueStatus();
    }

    const where: any = {};

    if (user.role === "siswa") {
      where.id_siswa = user.id_siswa;
    } else {
      const paramSiswaId = searchParams.get("id_siswa");
      if (paramSiswaId) {
        where.id_siswa = Number(paramSiswaId);
      }
      if (id_kelas) {
        where.siswa = { ...where.siswa, id_kelas: Number(id_kelas) };
      }
      if (q) {
        where.siswa = {
          ...where.siswa,
          OR: [
            { nama: { contains: q } },
            { nis: { contains: q } },
            { nisn: { contains: q } },
          ],
        };
      }
    }

    if (status && status !== "ALL") {
      where.status = status;
    }
    if (bulan && bulan !== "ALL") {
      where.bulan = Number(bulan);
    }
    if (tahun && tahun !== "ALL") {
      where.tahun = Number(tahun);
    }

    const tagihan = await prisma.tagihan_spp.findMany({
      where,
      include: {
        siswa: {
          include: {
            kelas: true,
            virtual_account: true,
          },
        },
        tarif_spp: true,
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

    return NextResponse.json({ success: true, data: tagihan });
  } catch (error) {
    console.error("Error fetching tagihan:", error);
    return NextResponse.json({ error: "Gagal memuat data tagihan." }, { status: 500 });
  }
}
