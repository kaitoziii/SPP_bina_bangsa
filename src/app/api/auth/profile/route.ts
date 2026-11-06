import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createSessionToken, setSessionCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/hash";
import { updateProfileSchema } from "@/lib/validations/auth";
import { createAuditLog } from "@/lib/services/audit.service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["siswa", "admin", "kepala_sekolah", "teller"], req);
  if (!auth.success) return auth.response;

  try {
    const user = await prisma.users.findUnique({
      where: { id_user: auth.user.id_user },
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
            jenis_kelamin: true,
            no_hp: true,
            alamat: true,
            kelas: {
              select: {
                nama_kelas: true,
                jurusan: { select: { nama_jurusan: true } },
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
    });

    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Gagal memuat profil pengguna." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(["siswa", "admin", "kepala_sekolah", "teller"], req);
  if (!auth.success) return auth.response;

  try {
    const body = await req.json();
    const parseResult = updateProfileSchema.safeParse(body);

    if (!parseResult.success) {
      const msg = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { username, current_password, new_password } = parseResult.data;

    // Ambil data user dari database
    const userInDb = await prisma.users.findUnique({
      where: { id_user: auth.user.id_user },
    });

    if (!userInDb) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    const updateData: { username?: string; password?: string } = {};

    // 1. Validasi & Update Username
    if (username && username !== userInDb.username) {
      const existing = await prisma.users.findUnique({
        where: { username },
      });

      if (existing && existing.id_user !== userInDb.id_user) {
        return NextResponse.json(
          { error: `Username "${username}" sudah digunakan oleh akun lain.` },
          { status: 400 }
        );
      }
      updateData.username = username;
    }

    // 2. Validasi & Update Password
    if (new_password) {
      if (!current_password) {
        return NextResponse.json(
          { error: "Password saat ini wajib diisi untuk mengubah password." },
          { status: 400 }
        );
      }

      const isCurrentValid = await verifyPassword(current_password, userInDb.password);
      if (!isCurrentValid) {
        return NextResponse.json(
          { error: "Password saat ini yang Anda masukkan salah." },
          { status: 400 }
        );
      }

      updateData.password = await hashPassword(new_password);
    }

    // Cek apakah ada data yang berubah
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada perubahan data.",
        data: {
          id_user: userInDb.id_user,
          username: userInDb.username,
          nama: userInDb.nama,
        },
      });
    }

    // Eksekusi update
    const updated = await prisma.users.update({
      where: { id_user: userInDb.id_user },
      data: updateData,
      select: {
        id_user: true,
        nama: true,
        username: true,
        role: true,
      },
    });

    // Catat Audit Log
    await createAuditLog({
      id_user: auth.user.id_user,
      aksi: "UPDATE_PROFILE",
      entitas: "users",
      id_entitas: String(auth.user.id_user),
      data_sebelum: {
        username: userInDb.username,
      },
      data_sesudah: {
        username: updated.username,
        password_diubah: !!updateData.password,
      },
    });

    // Perbarui token session cookie jika username berubah
    const newSessionToken = await createSessionToken({
      ...auth.user,
      username: updated.username,
    });

    const response = NextResponse.json({
      success: true,
      message: updateData.password
        ? "Username dan password berhasil diperbarui."
        : "Username berhasil diperbarui.",
      data: updated,
    });

    setSessionCookies(response, newSessionToken, auth.user.csrf_token);
    return response;
  } catch (error: any) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui profil." },
      { status: 500 }
    );
  }
}
