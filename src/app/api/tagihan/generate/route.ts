import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { TagihanService } from "@/lib/services/tagihan.service";
import { generateTagihanSchema } from "@/lib/validations/master";

export async function POST(req: NextRequest) {
  // Hanya Admin yang boleh men-generate tagihan
  const auth = await requireAuth(["admin"], req);
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const action = body.action || "PREVIEW"; // "PREVIEW" atau "EXECUTE"

    const parseResult = generateTagihanSchema.safeParse(body);
    if (!parseResult.success) {
      const msg = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { id_tahun_ajaran, bulan, tahun, id_kelas } = parseResult.data;

    if (action === "PREVIEW") {
      const preview = await TagihanService.previewGenerateTagihan({
        id_tahun_ajaran,
        bulan,
        tahun,
        id_kelas,
      });
      return NextResponse.json({ success: true, data: preview });
    }

    if (action === "EXECUTE") {
      const result = await TagihanService.executeGenerateTagihan({
        id_tahun_ajaran,
        bulan,
        tahun,
        id_kelas,
        adminId: auth.user.id_user,
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil membentuk ${result.dibuat} tagihan (${result.regular} reguler, ${result.beasiswa} beasiswa). ${result.dilewati} siswa dilewati karena sudah memiliki tagihan.`,
        data: result,
      });
    }

    return NextResponse.json({ error: "Action tidak dikenali." }, { status: 400 });
  } catch (error: any) {
    console.error("Generate tagihan error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal membentuk tagihan." },
      { status: 400 }
    );
  }
}
