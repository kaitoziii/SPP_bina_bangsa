import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TagihanService } from "@/lib/services/tagihan.service";

export async function GET(req: NextRequest) {
  // PRD: Pencarian hanya untuk Admin & Teller
  const auth = await requireAuth(["admin", "teller"], req);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    await TagihanService.syncOverdueStatus();

    // 1. Cek apakah keyword cocok dengan Transaction ID
    const trx = await prisma.transaksi_payment_gateway.findFirst({
      where: { transaction_id: q },
      include: {
        siswa: {
          include: {
            kelas: true,
            virtual_account: true,
            tagihan_spp: {
              orderBy: [{ tahun: "asc" }, { bulan: "asc" }],
              include: {
                pembayaran: true,
              },
            },
          },
        },
      },
    });

    if (trx && trx.siswa) {
      return NextResponse.json({
        success: true,
        matchedBy: "TRANSACTION_ID",
        data: [trx.siswa],
      });
    }

    // 2. Pencarian Siswa berdasarkan NIS, NISN, Nama, atau Nomor VA
    const siswaList = await prisma.siswa.findMany({
      where: {
        OR: [
          { nis: { contains: q } },
          { nisn: { contains: q } },
          { nama: { contains: q } },
          { virtual_account: { nomor_va: { contains: q } } },
        ],
      },
      include: {
        kelas: true,
        virtual_account: true,
        tagihan_spp: {
          orderBy: [{ tahun: "asc" }, { bulan: "asc" }],
          include: {
            pembayaran: {
              include: {
                transaksi_payment_gateway: true,
              },
            },
          },
        },
      },
      take: 20,
    });

    return NextResponse.json({ success: true, data: siswaList });
  } catch (error) {
    console.error("Pencarian error:", error);
    return NextResponse.json({ error: "Gagal memproses pencarian." }, { status: 500 });
  }
}
