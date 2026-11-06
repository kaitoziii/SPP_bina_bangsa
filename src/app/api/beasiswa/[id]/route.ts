import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BeasiswaService } from "@/lib/services/beasiswa.service";
import { keputusanBeasiswaSchema } from "@/lib/validations/beasiswa";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["admin", "kepala_sekolah", "siswa"], req);
  if (!auth.success) return auth.response;

  const { user } = auth;
  const id_pengajuan = Number(params.id);

  if (!id_pengajuan) {
    return NextResponse.json({ error: "ID pengajuan tidak valid." }, { status: 400 });
  }

  const pengajuan = await prisma.pengajuan_beasiswa.findUnique({
    where: { id_pengajuan },
    include: {
      siswa: {
        include: {
          kelas: true,
          virtual_account: true,
          tagihan_spp: {
            orderBy: [{ tahun: "asc" }, { bulan: "asc" }],
          },
        },
      },
      admin: {
        select: { nama: true, username: true },
      },
    },
  });

  if (!pengajuan) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  }

  // Siswa hanya boleh lihat pengajuan miliknya sendiri
  if (user.role === "siswa" && pengajuan.id_siswa !== user.id_siswa) {
    return NextResponse.json(
      { error: "Akses ditolak. Anda tidak memiliki izin untuk melihat data ini." },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true, data: pengajuan });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["admin", "siswa"], req);
  if (!auth.success) return auth.response;

  const { user } = auth;
  const id_pengajuan = Number(params.id);

  if (!id_pengajuan) {
    return NextResponse.json({ error: "ID pengajuan tidak valid." }, { status: 400 });
  }

  try {
    const body = await req.json();

    // 1. Aksi Pembatalan oleh Siswa
    if (body.action === "BATALKAN") {
      if (user.role !== "siswa" || !user.id_siswa) {
        return NextResponse.json(
          { error: "Hanya siswa pemilik pengajuan yang dapat membatalkan." },
          { status: 403 }
        );
      }

      const cancelled = await BeasiswaService.cancelPengajuan(
        id_pengajuan,
        user.id_siswa
      );
      return NextResponse.json({
        success: true,
        message: "Pengajuan beasiswa berhasil dibatalkan.",
        data: cancelled,
      });
    }

    // 2. Aksi Keputusan oleh Admin
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Hanya Admin yang memiliki hak untuk memutuskan beasiswa." },
        { status: 403 }
      );
    }

    const parseResult = keputusanBeasiswaSchema.safeParse(body);
    if (!parseResult.success) {
      const msg = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const decisionResult = await BeasiswaService.decidePengajuan(
      id_pengajuan,
      user.id_user,
      parseResult.data
    );

    return NextResponse.json({
      success: true,
      message:
        parseResult.data.status === "DISETUJUI"
          ? "Beasiswa berhasil disetujui dan tagihan periode terkait telah dibebaskan (status BEASISWA)."
          : "Pengajuan beasiswa telah ditolak.",
      data: decisionResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal memproses pengajuan beasiswa." },
      { status: 400 }
    );
  }
}
