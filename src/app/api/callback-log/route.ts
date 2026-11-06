import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin", "kepala_sekolah"], req);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(req.url);
  const status_code = searchParams.get("status_code");
  const is_success = searchParams.get("is_success");
  const limit = Number(searchParams.get("limit")) || 100;

  try {
    const where: any = {};

    if (status_code && status_code !== "ALL") {
      where.status_code = Number(status_code);
    }

    if (is_success && is_success !== "ALL") {
      where.is_success = is_success === "true";
    }

    const logs = await prisma.callback_log.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("Error fetching callback logs:", error);
    return NextResponse.json({ error: "Gagal memuat log callback." }, { status: 500 });
  }
}
