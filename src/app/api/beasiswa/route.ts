import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BeasiswaService } from "@/lib/services/beasiswa.service";
import { pengajuanBeasiswaSchema } from "@/lib/validations/beasiswa";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin", "kepala_sekolah", "siswa"], req);
  if (!auth.success) return auth.response;

  const { user } = auth;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const id_kelas = searchParams.get("id_kelas");
  const q = searchParams.get("q");

  try {
    const where: any = {};

    if (user.role === "siswa") {
      // Siswa HANYA dapat melihat data miliknya sendiri (diambil dari session)
      if (!user.id_siswa) {
        return NextResponse.json({ error: "Data profil siswa tidak ditemukan." }, { status: 400 });
      }
      where.id_siswa = user.id_siswa;
    } else {
      // Admin dan Kepala Sekolah boleh memfilter
      if (status && status !== "ALL") {
        where.status = status;
      }
      if (id_kelas) {
        where.siswa = { ...where.siswa, id_kelas: Number(id_kelas) };
      }
      if (q) {
        where.siswa = {
          ...where.siswa,
          OR: [
            { nama: { contains: q } },
            { nis: { contains: q } },
          ],
        };
      }
    }

    const list = await prisma.pengajuan_beasiswa.findMany({
      where,
      include: {
        siswa: {
          include: {
            kelas: true,
            virtual_account: true,
          },
        },
        admin: {
          select: { nama: true, username: true },
        },
      },
      orderBy: { tanggal_pengajuan: "desc" },
    });

    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("Error fetching beasiswa:", error);
    return NextResponse.json({ error: "Gagal memuat data beasiswa." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Hanya siswa yang boleh mengajukan beasiswa
  const auth = await requireAuth(["siswa"], req);
  if (!auth.success) return auth.response;

  const { user } = auth;
  if (!user.id_siswa) {
    return NextResponse.json({ error: "Data siswa tidak ditemukan pada sesi." }, { status: 400 });
  }

  try {
    // Support both multipart/form-data (with file) and application/json (legacy)
    const contentType = req.headers.get("content-type") || "";
    let jenis: string;
    let alasan: string;
    let lampiranPath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      jenis = formData.get("jenis") as string;
      alasan = formData.get("alasan") as string;
      const dokumenText =
        (formData.get("dokumen_text") as string) ||
        (formData.get("teks_lampiran") as string) ||
        null;

      const file = formData.get("lampiran") as File | null;
      if (file && typeof file === "object" && typeof file.size === "number" && file.size > 0) {
        // Validasi ukuran (maks 5 MB)
        if (file.size > 5 * 1024 * 1024) {
          return NextResponse.json({ error: "Ukuran file lampiran maksimal 5 MB." }, { status: 400 });
        }

        // Validasi tipe file
        const allowedTypes = [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/jpg",
          "image/webp",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        if (!allowedTypes.includes(file.type)) {
          return NextResponse.json(
            { error: "Format file tidak didukung. Gunakan PDF, JPG, PNG, DOC, atau DOCX." },
            { status: 400 }
          );
        }

        // Simpan file ke public/uploads/lampiran/
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "lampiran");
        await mkdir(uploadsDir, { recursive: true });

        const ext = path.extname(file.name) || ".bin";
        const safeName = `${Date.now()}_${user.id_siswa}${ext}`;
        const filePath = path.join(uploadsDir, safeName);

        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        lampiranPath = `/uploads/lampiran/${safeName}`;
      } else if (dokumenText && dokumenText.trim().length > 0) {
        lampiranPath = dokumenText.trim();
      }
    } else {
      // Legacy JSON body
      const body = await req.json();
      jenis = body.jenis;
      alasan = body.alasan;
      lampiranPath = body.lampiran || null;
    }

    const parseResult = pengajuanBeasiswaSchema.safeParse({ jenis, alasan, lampiran: lampiranPath });

    if (!parseResult.success) {
      const msg = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const pengajuan = await BeasiswaService.submitPengajuan(user.id_siswa, parseResult.data);

    return NextResponse.json({
      success: true,
      message: "Pengajuan beasiswa berhasil dikirim dan menunggu verifikasi admin.",
      data: pengajuan,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengajukan beasiswa." },
      { status: 400 }
    );
  }
}
