import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jurusanSchema } from "@/lib/validations/master";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin", "kepala_sekolah", "teller"], req);
  if (!auth.success) return auth.response;

  const jurusan = await prisma.jurusan.findMany({
    include: {
      _count: { select: { kelas: true } },
    },
    orderBy: { kode_jurusan: "asc" },
  });

  return NextResponse.json({ success: true, data: jurusan });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"], req);
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const parseResult = jurusanSchema.safeParse(body);
    if (!parseResult.success) {
      const msg = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const created = await prisma.jurusan.create({
      data: parseResult.data,
    });

    return NextResponse.json({ success: true, message: "Jurusan berhasil dibuat.", data: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal membuat jurusan." }, { status: 500 });
  }
}
