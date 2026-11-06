import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/hash";
import { generateNomorVa, validateVaWithNis } from "@/lib/format";
import { siswaSchema } from "@/lib/validations/master";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin", "kepala_sekolah", "teller", "siswa"], req);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const id_kelas = searchParams.get("id_kelas");

  try {
    const where: any = {};
    if (auth.user.role === "siswa") {
      if (auth.user.id_siswa) {
        where.id_siswa = auth.user.id_siswa;
      } else if (auth.user.nis) {
        where.nis = auth.user.nis;
      }
    } else {
      if (id_kelas && id_kelas !== "ALL") {
        where.id_kelas = Number(id_kelas);
      }
      if (q) {
        where.OR = [
          { nama: { contains: q } },
          { nis: { contains: q } },
          { nisn: { contains: q } },
        ];
      }
    }

    const siswa = await prisma.siswa.findMany({
      where,
      include: {
        kelas: {
          include: { jurusan: true },
        },
        tahun_ajaran: true,
        virtual_account: true,
        user: {
          select: { username: true, status: true },
        },
        tagihan_spp: {
          select: {
            id_tagihan: true,
            bulan: true,
            tahun: true,
            nominal: true,
            status: true,
          },
          orderBy: [{ tahun: "asc" }, { bulan: "asc" }],
        },
      },
      orderBy: { nama: "asc" },
    });

    return NextResponse.json({ success: true, data: siswa });
  } catch (error) {
    console.error("Error fetching siswa:", error);
    return NextResponse.json({ error: "Gagal memuat data siswa." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"], req);
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const parseResult = siswaSchema.safeParse(body);

    if (!parseResult.success) {
      const msg = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const data = parseResult.data;

    // Cek keunikan NIS & NISN
    const existingNis = await prisma.siswa.findUnique({ where: { nis: data.nis } });
    if (existingNis) {
      return NextResponse.json({ error: `NIS ${data.nis} sudah terdaftar.` }, { status: 400 });
    }

    const existingNisn = await prisma.siswa.findUnique({ where: { nisn: data.nisn } });
    if (existingNisn) {
      return NextResponse.json({ error: `NISN ${data.nisn} sudah terdaftar.` }, { status: 400 });
    }

    // Nomor VA: prefix 88000 + 5 digit terakhir NIS
    const prefix = process.env.VA_PREFIX || "88000";
    const nomorVa = generateNomorVa(prefix, data.nis);

    // Validasi aturan keras: 5 digit terakhir VA = NIS
    if (!validateVaWithNis(nomorVa, data.nis)) {
      return NextResponse.json(
        { error: "Validasi VA gagal: 5 digit terakhir VA harus sama dengan NIS." },
        { status: 400 }
      );
    }

    const existingVa = await prisma.virtual_account.findUnique({
      where: { nomor_va: nomorVa },
    });
    if (existingVa) {
      return NextResponse.json(
        { error: `Nomor VA ${nomorVa} sudah digunakan oleh siswa lain.` },
        { status: 400 }
      );
    }

    // Default password akun siswa: 'siswa123'
    const hashedPassword = await hashPassword("siswa123");

    // Simpan User, Siswa, dan Virtual Account dalam 1 transaksi
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat User
      const user = await tx.users.create({
        data: {
          nama: data.nama,
          username: data.nis,
          password: hashedPassword,
          role: "siswa",
          status: "AKTIF",
        },
      });

      // 2. Buat Siswa
      const siswa = await tx.siswa.create({
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
          id_user: user.id_user,
          status: data.status,
        },
      });

      // 3. Buat Virtual Account
      const va = await tx.virtual_account.create({
        data: {
          id_siswa: siswa.id_siswa,
          nomor_va: nomorVa,
          prefix,
          status: "AKTIF",
        },
      });

      // 4. Audit Log
      await tx.audit_log.create({
        data: {
          id_user: auth.user.id_user,
          aksi: "TAMBAH_SISWA",
          entitas: "siswa",
          id_entitas: String(siswa.id_siswa),
          data_sebelum: null,
          data_sesudah: JSON.stringify({
            nis: siswa.nis,
            nama: siswa.nama,
            nomor_va: va.nomor_va,
          }),
        },
      });

      return { siswa, va, user };
    });

    return NextResponse.json({
      success: true,
      message: `Siswa ${data.nama} berhasil didaftarkan dengan VA ${nomorVa}.`,
      data: result,
    });
  } catch (error: any) {
    console.error("Tambah siswa error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menambahkan siswa." },
      { status: 500 }
    );
  }
}
