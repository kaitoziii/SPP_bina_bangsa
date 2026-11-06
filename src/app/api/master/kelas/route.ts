import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { kelasSchema } from "@/lib/validations/master";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin", "kepala_sekolah", "teller"], req);
  if (!auth.success) return auth.response;

  const kelas = await prisma.kelas.findMany({
    include: {
      jurusan: true,
      tahun_ajaran: true,
      _count: { select: { siswa: true } },
    },
    orderBy: { nama_kelas: "asc" },
  });

  return NextResponse.json({ success: true, data: kelas });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"], req);
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const parseResult = kelasSchema.safeParse(body);
    if (!parseResult.success) {
      const msg = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const created = await prisma.kelas.create({
      data: parseResult.data,
    });

    return NextResponse.json({ success: true, message: "Kelas berhasil ditambahkan.", data: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal membuat kelas." }, { status: 500 });
  }
}
