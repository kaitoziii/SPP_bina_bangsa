import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, validateCsrfToken } from "./csrf";

export const SESSION_COOKIE_NAME = "spp_session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "default-development-session-secret-at-least-32-chars-long"
);

export type UserRole = "admin" | "kepala_sekolah" | "teller" | "siswa";

export interface SessionPayload {
  id_user: number;
  nama: string;
  username: string;
  role: UserRole;
  id_siswa?: number | null;
  nis?: string | null;
  nomor_va?: string | null;
  csrf_token: string;
}

/**
 * Buat JWT session token terenkripsi/tertanda
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

/**
 * Verifikasi JWT session token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Ambil session user aktif dari cookies di Server Component / Route Handler
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return null;
  }
  return verifySessionToken(sessionCookie.value);
}

/**
 * Validasi session dan role di route handler / server actions
 */
export async function requireAuth(
  allowedRoles?: UserRole[],
  req?: NextRequest
): Promise<
  | { success: true; user: SessionPayload }
  | { success: false; response: NextResponse }
> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  } else {
    token = cookies().get(SESSION_COOKIE_NAME)?.value;
  }

  if (!token) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Sesi tidak ditemukan. Silakan login terlebih dahulu." },
        { status: 401 }
      ),
    };
  }

  const user = await verifySessionToken(token);
  if (!user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Sesi tidak valid atau telah kedaluwarsa." },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Akses ditolak. Anda tidak memiliki izin untuk tindakan ini." },
        { status: 403 }
      ),
    };
  }

  // Jika ada request mutasi (POST, PUT, DELETE, PATCH), periksa proteksi CSRF
  if (req && ["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    const csrfHeader = req.headers.get(CSRF_HEADER_NAME);
    const csrfCookie = req.cookies.get(CSRF_COOKIE_NAME)?.value;
    const expectedCsrf = user.csrf_token || csrfCookie;

    if (!validateCsrfToken(csrfHeader, expectedCsrf)) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Validasi CSRF gagal. Permintaan tidak sah." },
          { status: 403 }
        ),
      };
    }
  }

  return { success: true, user };
}

/**
 * Simpan cookie session dan csrf token pada response
 */
export function setSessionCookies(
  response: NextResponse,
  token: string,
  csrfToken: string
) {
  const isProd = process.env.NODE_ENV === "production";
  
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 jam
  });

  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // Boleh dibaca client untuk dimasukkan ke header x-csrf-token
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

/**
 * Hapus cookies session saat logout
 */
export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(CSRF_COOKIE_NAME, "", {
    httpOnly: false,
    path: "/",
    maxAge: 0,
  });
}
