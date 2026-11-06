import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin", "kepala_sekolah"], req);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(req.url);
  const entitas = searchParams.get("entitas");
  const limit = Number(searchParams.get("limit")) || 100;

  try {
    const where: any = {};
    if (entitas && entitas !== "ALL") {
      where.entitas = entitas;
    }

    const logs = await prisma.audit_log.findMany({
      where,
      include: {
        user: {
          select: { nama: true, username: true, role: true },
        },
      },
      orderBy: { created_at: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json({ error: "Gagal memuat audit log." }, { status: 500 });
  }
}
