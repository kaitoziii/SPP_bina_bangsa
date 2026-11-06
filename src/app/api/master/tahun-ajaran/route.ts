import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tahunAjaranSchema } from "@/lib/validations/master";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin", "kepala_sekolah", "teller", "siswa"], req);
  if (!auth.success) return auth.response;

  const list = await prisma.tahun_ajaran.findMany({
    include: {
      tarif_spp: true,
      _count: { select: { kelas: true, siswa: true } },
    },
    orderBy: { tahun_ajaran: "desc" },
  });

  return NextResponse.json({ success: true, data: list });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"], req);
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const parseResult = tahunAjaranSchema.safeParse(body);
    if (!parseResult.success) {
      const msg = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { tahun_ajaran, tanggal_mulai, tanggal_selesai, status } = parseResult.data;

    const created = await prisma.tahun_ajaran.create({
      data: {
        tahun_ajaran,
        tanggal_mulai: new Date(tanggal_mulai),
        tanggal_selesai: new Date(tanggal_selesai),
        status,
      },
    });

    return NextResponse.json({ success: true, message: "Tahun ajaran berhasil dibuat.", data: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal membuat tahun ajaran." }, { status: 500 });
  }
}
