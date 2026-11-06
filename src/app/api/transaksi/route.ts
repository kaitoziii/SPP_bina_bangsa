import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  // PRD: Admin, Kepala Sekolah, Teller boleh lihat transaksi PG. Siswa ❌
  const auth = await requireAuth(["admin", "kepala_sekolah", "teller"], req);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const status = searchParams.get("status");
  const limit = Number(searchParams.get("limit")) || 50;

  try {
    const where: any = {};

    if (status && status !== "ALL") {
      where.status_transaksi = status;
    }

    if (q) {
      where.OR = [
        { transaction_id: { contains: q } },
        { virtual_account: { contains: q } },
        { siswa: { nama: { contains: q } } },
        { siswa: { nis: { contains: q } } },
      ];
    }

    const transactions = await prisma.transaksi_payment_gateway.findMany({
      where,
      include: {
        siswa: {
          include: {
            kelas: true,
          },
        },
        pembayaran: {
          include: {
            tagihan_spp: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: "Gagal memuat transaksi PG." }, { status: 500 });
  }
}
