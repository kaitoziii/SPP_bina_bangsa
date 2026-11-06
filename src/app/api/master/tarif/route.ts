import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tarifSppSchema } from "@/lib/validations/master";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin", "kepala_sekolah", "teller"], req);
  if (!auth.success) return auth.response;

  const tarif = await prisma.tarif_spp.findMany({
    include: {
      tahun_ajaran: true,
    },
    orderBy: { id_tarif: "desc" },
  });

  return NextResponse.json({ success: true, data: tarif });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"], req);
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const parseResult = tarifSppSchema.safeParse(body);
    if (!parseResult.success) {
      const msg = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const created = await prisma.tarif_spp.create({
      data: parseResult.data,
    });

    return NextResponse.json({ success: true, message: "Tarif SPP berhasil dibuat.", data: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal membuat tarif SPP." }, { status: 500 });
  }
}
