import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { CSRF_COOKIE_NAME } from "@/lib/csrf";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const response = NextResponse.json({
    authenticated: true,
    user: {
      id_user: session.id_user,
      nama: session.nama,
      username: session.username,
      role: session.role,
      id_siswa: session.id_siswa,
      nis: session.nis,
      nomor_va: session.nomor_va,
    },
    csrf_token: session.csrf_token,
  });

  if (session.csrf_token) {
    const isProd = process.env.NODE_ENV === "production";
    response.cookies.set(CSRF_COOKIE_NAME, session.csrf_token, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }

  return response;
}
