// @vitest-environment node
import { describe, it, expect } from "vitest";
import { prisma } from "../../src/lib/db";
import { verifyPassword } from "../../src/lib/hash";
import { createSessionToken, verifySessionToken } from "../../src/lib/auth";
import { generateCsrfToken, validateCsrfToken } from "../../src/lib/csrf";

describe("Autentikasi & Kendali Hak Akses Role (Integration)", () => {
  it("1. Kredensial akun demo (admin, kepsek, teller, siswa) tersimpan dengan hash bcrypt yang valid", async () => {
    const admin = await prisma.users.findUnique({ where: { username: "admin" } });
    expect(admin).toBeDefined();
    expect(await verifyPassword("admin123", admin!.password)).toBe(true);

    const kepsek = await prisma.users.findUnique({ where: { username: "kepsek" } });
    expect(kepsek).toBeDefined();
    expect(await verifyPassword("kepsek123", kepsek!.password)).toBe(true);

    const teller = await prisma.users.findUnique({ where: { username: "teller" } });
    expect(teller).toBeDefined();
    expect(await verifyPassword("teller123", teller!.password)).toBe(true);

    const siswa = await prisma.users.findUnique({ where: { username: "12345" } });
    expect(siswa).toBeDefined();
    expect(await verifyPassword("siswa123", siswa!.password)).toBe(true);
  });

  it("2. Password salah ditolak oleh verifikasi hash", async () => {
    const admin = await prisma.users.findUnique({ where: { username: "admin" } });
    expect(await verifyPassword("wrongpassword", admin!.password)).toBe(false);
  });

  it("3. Session JWT dibentuk dan dapat didekode dengan payload role dan csrf token yang benar", async () => {
    const csrf = generateCsrfToken();
    const token = await createSessionToken({
      id_user: 1,
      nama: "Administrator",
      username: "admin",
      role: "admin",
      csrf_token: csrf,
    });

    const decoded = await verifySessionToken(token);
    expect(decoded).toBeDefined();
    expect(decoded!.username).toBe("admin");
    expect(decoded!.role).toBe("admin");
    expect(decoded!.csrf_token).toBe(csrf);
  });

  it("4. Proteksi CSRF memvalidasi token yang cocok secara timing-safe", () => {
    const validToken = generateCsrfToken();
    expect(validateCsrfToken(validToken, validToken)).toBe(true);
    expect(validateCsrfToken("wrong-csrf-token", validToken)).toBe(false);
    expect(validateCsrfToken(null, validToken)).toBe(false);
    expect(validateCsrfToken(validToken, undefined)).toBe(false);
  });
});
