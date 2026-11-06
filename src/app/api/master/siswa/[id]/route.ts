import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { siswaSchema } from "@/lib/validations/master";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["admin", "kepala_sekolah", "teller", "siswa"], req);
  if (!auth.success) return auth.response;

  const id_siswa = Number(params.id);
  if (!id_siswa) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  // Siswa hanya boleh lihat data miliknya sendiri
  if (auth.user.role === "siswa" && auth.user.id_siswa !== id_siswa) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const siswa = await prisma.siswa.findUnique({
    where: { id_siswa },
    include: {
      kelas: { include: { jurusan: true } },
      tahun_ajaran: true,
      virtual_account: true,
      tagihan_spp: {
        orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
        include: { pembayaran: true },
      },
      pengajuan_beasiswa: {
        orderBy: { tanggal_pengajuan: "desc" },
      },
    },
  });

  if (!siswa) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ success: true, data: siswa });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["admin"], req);
  if (!auth.success) return auth.response;

  const id_siswa = Number(params.id);
  if (!id_siswa) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  try {
    const body = await req.json();
    const parseResult = siswaSchema.safeParse(body);
    if (!parseResult.success) {
      const msg = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const data = parseResult.data;

    // Cek duplikasi NIS/NISN di siswa lain
    const existingNis = await prisma.siswa.findFirst({
      where: { nis: data.nis, NOT: { id_siswa } },
    });
    if (existingNis) {
      return NextResponse.json({ error: "NIS sudah digunakan oleh siswa lain" }, { status: 400 });
    }

    const updated = await prisma.siswa.update({
      where: { id_siswa },
      data: {
        nis: data.nis,
        nisn: data.nisn,
        nama: data.nama,
        jenis_kelamin: data.jenis_kelamin,
        tempat_lahir: data.tempat_lahir,
        tanggal_lahir: new Date(data.tanggal_lahir),
        alamat: data.alamat,
        no_hp: data.no_hp,
        nama_orang_tua: data.nama_orang_tua,
        id_kelas: data.id_kelas,
        id_tahun_ajaran: data.id_tahun_ajaran,
        status: data.status,
      },
    });

    return NextResponse.json({ success: true, message: "Data siswa berhasil diperbarui", data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal memperbarui siswa" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(["admin"], req);
  if (!auth.success) return auth.response;

  const id_siswa = Number(params.id);
  if (!id_siswa) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  try {
    // Cek apakah sudah ada transaksi pembayaran
    const hasPayment = await prisma.pembayaran.findFirst({
      where: { tagihan_spp: { id_siswa } },
    });

    if (hasPayment) {
      return NextResponse.json(
        { error: "Siswa tidak dapat dihapus karena sudah memiliki riwayat transaksi pembayaran." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.tagihan_spp.deleteMany({ where: { id_siswa } });
      await tx.pengajuan_beasiswa.deleteMany({ where: { id_siswa } });
      await tx.virtual_account.deleteMany({ where: { id_siswa } });
      const s = await tx.siswa.delete({ where: { id_siswa } });
      await tx.users.delete({ where: { id_user: s.id_user } });
    });

    return NextResponse.json({ success: true, message: "Siswa berhasil dihapus." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal menghapus siswa" }, { status: 500 });
  }
}
