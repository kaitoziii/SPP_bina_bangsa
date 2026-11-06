import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/hash";
import { generateNomorVa, validateVaWithNis } from "@/lib/format";
import { userSchema, updateUserSchema } from "@/lib/validations/master";
import { createAuditLog } from "@/lib/services/audit.service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin"], req);
  if (!auth.success) return auth.response;

  try {
    const users = await prisma.users.findMany({
      select: {
        id_user: true,
        nama: true,
        username: true,
        role: true,
        status: true,
        created_at: true,
        siswa: {
          select: {
            id_siswa: true,
            nis: true,
            nisn: true,
            nama: true,
            id_kelas: true,
            id_tahun_ajaran: true,
            kelas: {
              select: {
                id_kelas: true,
                nama_kelas: true,
                id_jurusan: true,
                jurusan: {
                  select: {
                    id_jurusan: true,
                    kode_jurusan: true,
                    nama_jurusan: true,
                  },
                },
              },
            },
            tahun_ajaran: {
              select: {
                id_tahun_ajaran: true,
                tahun_ajaran: true,
              },
            },
            virtual_account: {
              select: {
                nomor_va: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error("Gagal memuat pengguna:", error);
    return NextResponse.json(
      { error: "Gagal memuat daftar pengguna." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(["admin"], req);
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const parseResult = userSchema.safeParse(body);
    if (!parseResult.success) {
      const msg = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const {
      nama,
      username,
      password,
      role,
      status,
      id_kelas,
      id_tahun_ajaran,
      nis,
      nisn,
      jenis_kelamin,
      no_hp,
      alamat,
    } = parseResult.data;

    // Cek duplikasi username
    const existingUsername = await prisma.users.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json(
        { error: `Username "${username}" sudah digunakan.` },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password || "password123");

    // Jika Role adalah SISWA: wajib buat data siswa & virtual account
    if (role === "siswa") {
      const effectiveNis = (nis || username).trim();
      const effectiveNisn = (nisn || `00${effectiveNis}`).trim();

      if (!id_kelas) {
        return NextResponse.json(
          { error: "Untuk role Siswa, pilihan Kelas wajib ditentukan." },
          { status: 400 }
        );
      }

      // Cari kelas untuk mendapatkan tahun ajaran jika tidak dispesifikasikan
      let effectiveTahunAjaranId = id_tahun_ajaran;
      if (!effectiveTahunAjaranId) {
        const k = await prisma.kelas.findUnique({ where: { id_kelas } });
        if (!k) {
          return NextResponse.json({ error: "Kelas yang dipilih tidak ditemukan." }, { status: 400 });
        }
        effectiveTahunAjaranId = k.id_tahun_ajaran;
      }

      // Cek keunikan NIS & NISN
      const existNis = await prisma.siswa.findUnique({ where: { nis: effectiveNis } });
      if (existNis) {
        return NextResponse.json(
          { error: `NIS "${effectiveNis}" sudah terdaftar pada data siswa lain.` },
          { status: 400 }
        );
      }

      const existNisn = await prisma.siswa.findUnique({ where: { nisn: effectiveNisn } });
      if (existNisn) {
        return NextResponse.json(
          { error: `NISN "${effectiveNisn}" sudah terdaftar pada data siswa lain.` },
          { status: 400 }
        );
      }

      // Nomor VA: 5 digit terakhir VA = NIS
      const prefix = process.env.VA_PREFIX || "88000";
      const nomorVa = generateNomorVa(prefix, effectiveNis);

      if (!validateVaWithNis(nomorVa, effectiveNis)) {
        return NextResponse.json(
          { error: "Aturan VA gagal: 5 digit terakhir VA harus sama dengan NIS." },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Buat User
        const user = await tx.users.create({
          data: {
            nama,
            username,
            password: hashedPassword,
            role: "siswa",
            status: status || "AKTIF",
          },
        });

        // 2. Buat Siswa
        const siswa = await tx.siswa.create({
          data: {
            nis: effectiveNis,
            nisn: effectiveNisn,
            nama,
            jenis_kelamin: jenis_kelamin || "L",
            tempat_lahir: "Sidoarjo",
            tanggal_lahir: new Date("2008-01-01"),
            alamat: alamat || "Jl. Raya Sekolah",
            no_hp: no_hp || "08123456789",
            nama_orang_tua: "Wali Murid",
            id_kelas,
            id_tahun_ajaran: effectiveTahunAjaranId!,
            id_user: user.id_user,
            status: status || "AKTIF",
          },
        });

        // 3. Buat VA
        const va = await tx.virtual_account.create({
          data: {
            id_siswa: siswa.id_siswa,
            nomor_va: nomorVa,
            prefix,
            status: "AKTIF",
          },
        });

        // Audit Log
        await tx.audit_log.create({
          data: {
            id_user: auth.user.id_user,
            aksi: "TAMBAH_USER_SISWA",
            entitas: "users",
            id_entitas: String(user.id_user),
            data_sebelum: null,
            data_sesudah: JSON.stringify({
              username: user.username,
              role: user.role,
              nis: siswa.nis,
              nomor_va: va.nomor_va,
            }),
          },
        });

        return { user, siswa, va };
      });

      return NextResponse.json({
        success: true,
        message: `User siswa ${nama} berhasil dibuat dengan nomor VA ${result.va.nomor_va}.`,
        data: result.user,
      });
    }

    // Role NON-SISWA (Admin, Kepala Sekolah, Teller)
    const created = await prisma.users.create({
      data: {
        nama,
        username,
        password: hashedPassword,
        role,
        status: status || "AKTIF",
      },
      select: {
        id_user: true,
        nama: true,
        username: true,
        role: true,
        status: true,
      },
    });

    await createAuditLog({
      id_user: auth.user.id_user,
      aksi: "TAMBAH_USER",
      entitas: "users",
      id_entitas: String(created.id_user),
      data_sebelum: null,
      data_sesudah: {
        username: created.username,
        role: created.role,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Pengguna ${nama} (${role}) berhasil dibuat.`,
      data: created,
    });
  } catch (error: any) {
    console.error("Gagal membuat user:", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat pengguna." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(["admin"], req);
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const parseResult = updateUserSchema.safeParse(body);
    if (!parseResult.success) {
      const msg = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const {
      id_user,
      nama,
      username,
      password,
      role,
      status,
      id_kelas,
      id_tahun_ajaran,
    } = parseResult.data;

    // Cari user yang akan diubah
    const userInDb = await prisma.users.findUnique({
      where: { id_user },
      include: { siswa: true },
    });

    if (!userInDb) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    // Cek duplikasi username jika username diubah
    if (username && username !== userInDb.username) {
      const existUser = await prisma.users.findUnique({ where: { username } });
      if (existUser && existUser.id_user !== id_user) {
        return NextResponse.json(
          { error: `Username "${username}" sudah digunakan pengguna lain.` },
          { status: 400 }
        );
      }
    }

    const updateUserData: any = {};
    if (nama) updateUserData.nama = nama;
    if (username) updateUserData.username = username;
    if (role) updateUserData.role = role;
    if (status) updateUserData.status = status;
    if (password && password.trim().length >= 6) {
      updateUserData.password = await hashPassword(password);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update data User
      const updatedUser = await tx.users.update({
        where: { id_user },
        data: updateUserData,
        select: {
          id_user: true,
          nama: true,
          username: true,
          role: true,
          status: true,
        },
      });

      // 2. Jika user ini terhubung dengan profil siswa dan ada data kelas/tahun ajaran yang diubah
      if (userInDb.siswa && (id_kelas || id_tahun_ajaran || nama || status)) {
        const updateSiswaData: any = {};
        if (nama) updateSiswaData.nama = nama;
        if (id_kelas) updateSiswaData.id_kelas = id_kelas;
        if (id_tahun_ajaran) updateSiswaData.id_tahun_ajaran = id_tahun_ajaran;
        if (status) updateSiswaData.status = status;

        await tx.siswa.update({
          where: { id_siswa: userInDb.siswa.id_siswa },
          data: updateSiswaData,
        });
      }

      // 3. Catat ke Audit Log bahwa Admin telah mengubah hak akses / data user
      await tx.audit_log.create({
        data: {
          id_user: auth.user.id_user,
          aksi: "UBAH_HAK_AKSES_USER",
          entitas: "users",
          id_entitas: String(id_user),
          data_sebelum: JSON.stringify({
            role: userInDb.role,
            status: userInDb.status,
            nama: userInDb.nama,
            username: userInDb.username,
          }),
          data_sesudah: JSON.stringify({
            role: updatedUser.role,
            status: updatedUser.status,
            nama: updatedUser.nama,
            username: updatedUser.username,
            password_direset: !!updateUserData.password,
          }),
        },
      });

      return updatedUser;
    });

    return NextResponse.json({
      success: true,
      message: `Hak akses pengguna ${result.nama} berhasil diperbarui (Peran: ${result.role}, Status: ${result.status}).`,
      data: result,
    });
  } catch (error: any) {
    console.error("Gagal mengubah pengguna:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui hak akses pengguna." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(["admin"], req);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id_user = Number(searchParams.get("id_user"));

    if (!id_user) {
      return NextResponse.json({ error: "ID pengguna tidak valid." }, { status: 400 });
    }

    if (id_user === auth.user.id_user) {
      return NextResponse.json(
        { error: "Anda tidak dapat menghapus akun Anda sendiri saat sedang login." },
        { status: 400 }
      );
    }

    const user = await prisma.users.findUnique({
      where: { id_user },
      include: { siswa: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    // Jika siswa punya pembayaran, cegah penghapusan
    if (user.siswa) {
      const hasPayment = await prisma.pembayaran.findFirst({
        where: { tagihan_spp: { id_siswa: user.siswa.id_siswa } },
      });
      if (hasPayment) {
        return NextResponse.json(
          { error: "Pengguna siswa ini tidak dapat dihapus karena telah memiliki transaksi pembayaran yang sah." },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      if (user.siswa) {
        await tx.tagihan_spp.deleteMany({ where: { id_siswa: user.siswa.id_siswa } });
        await tx.pengajuan_beasiswa.deleteMany({ where: { id_siswa: user.siswa.id_siswa } });
        await tx.virtual_account.deleteMany({ where: { id_siswa: user.siswa.id_siswa } });
        await tx.siswa.delete({ where: { id_siswa: user.siswa.id_siswa } });
      }
      await tx.users.delete({ where: { id_user } });

      await tx.audit_log.create({
        data: {
          id_user: auth.user.id_user,
          aksi: "HAPUS_USER",
          entitas: "users",
          id_entitas: String(id_user),
          data_sebelum: JSON.stringify({
            nama: user.nama,
            username: user.username,
            role: user.role,
          }),
          data_sesudah: null,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Pengguna ${user.nama} berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error("Gagal menghapus user:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menghapus pengguna." },
      { status: 500 }
    );
  }
}
