import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/hash";
import { createSessionToken, setSessionCookies } from "@/lib/auth";
import { generateCsrfToken } from "@/lib/csrf";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      const msg = parseResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { username, password } = parseResult.data;

    // Cari user berdasarkan username
    const user = await prisma.users.findUnique({
      where: { username },
      include: {
        siswa: {
          include: {
            virtual_account: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Username atau password salah." },
        { status: 401 }
      );
    }

    if (user.status !== "AKTIF") {
      return NextResponse.json(
        { error: "Akun Anda berstatus nonaktif. Hubungi administrator." },
        { status: 403 }
      );
    }

    // Verifikasi password hash bcrypt
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Username atau password salah." },
        { status: 401 }
      );
    }

    // Siapkan data session
    const csrfToken = generateCsrfToken();
    const sessionToken = await createSessionToken({
      id_user: user.id_user,
      nama: user.nama,
      username: user.username,
      role: user.role as any,
      id_siswa: user.siswa?.id_siswa || null,
      nis: user.siswa?.nis || null,
      nomor_va: user.siswa?.virtual_account?.nomor_va || null,
      csrf_token: csrfToken,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id_user: user.id_user,
        nama: user.nama,
        username: user.username,
        role: user.role,
        id_siswa: user.siswa?.id_siswa || null,
        nis: user.siswa?.nis || null,
        nomor_va: user.siswa?.virtual_account?.nomor_va || null,
      },
      csrf_token: csrfToken,
    });

    setSessionCookies(response, sessionToken, csrfToken);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pada server." },
      { status: 500 }
    );
  }
}
