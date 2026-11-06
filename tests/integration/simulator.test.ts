import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "../../src/lib/db";
import { NextRequest } from "next/server";
import { POST as sendCallbackPost } from "../../src/app/api/simulator/send-callback/route";
import { createSessionToken, SESSION_COOKIE_NAME } from "../../src/lib/auth";

describe("PG Simulator Hak Akses Siswa (Integration)", () => {
  let siswaAhmad: any;
  let siswaSiti: any;
  let tokenAhmad: string;
  let tokenAdmin: string;

  beforeAll(async () => {
    siswaAhmad = await prisma.siswa.findUnique({
      where: { nis: "12345" },
      include: { virtual_account: true, user: true },
    });
    siswaSiti = await prisma.siswa.findUnique({
      where: { nis: "12346" },
      include: { virtual_account: true, user: true },
    });
    const adminUser = await prisma.users.findUnique({
      where: { username: "admin" },
    });

    tokenAhmad = await createSessionToken({
      id_user: siswaAhmad.id_user,
      username: siswaAhmad.user.username,
      nama: siswaAhmad.nama,
      role: "siswa",
      id_siswa: siswaAhmad.id_siswa,
      nis: siswaAhmad.nis,
      nomor_va: siswaAhmad.virtual_account.nomor_va,
      csrf_token: "test-csrf-token",
    });

    tokenAdmin = await createSessionToken({
      id_user: adminUser!.id_user,
      username: adminUser!.username,
      nama: adminUser!.nama,
      role: "admin",
      csrf_token: "test-csrf-token",
    });
  });

  it("1. Siswa ditolak dengan status 403 jika mencoba simulasi callback untuk VA siswa lain", async () => {
    const payload = {
      virtual_account: siswaSiti.virtual_account.nomor_va, // VA milik Siti Aminah
      amount: 350000,
      transaction_id: `TRX-SIM-MALICIOUS-${Date.now()}`,
      status: "PAID",
      paid_at: "2026-10-01 10:00:00",
    };

    const req = new NextRequest("http://localhost:3000/api/simulator/send-callback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${tokenAhmad}`,
      },
      body: JSON.stringify({ payload }),
    });

    const res = await sendCallbackPost(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/hanya dapat melakukan simulasi untuk Virtual Account miliknya sendiri/);
  });

  it("2. Siswa berhasil mengeksekusi simulasi callback untuk VA miliknya sendiri", async () => {
    const payload = {
      virtual_account: siswaAhmad.virtual_account.nomor_va,
      amount: 350000,
      transaction_id: `TRX-SIM-AHMAD-TEST-${Date.now()}`,
      status: "PAID",
      paid_at: "2026-10-01 10:00:00",
    };

    const req = new NextRequest("http://localhost:3000/api/simulator/send-callback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${tokenAhmad}`,
      },
      body: JSON.stringify({ payload }),
    });

    const res = await sendCallbackPost(req);
    // Respons status 200 dari send-callback
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.signature_sent).toBeDefined();
    expect(json.response_status).toBeDefined();
  });

  it("3. Admin memiliki kewenangan penuh untuk menguji simulasi VA siswa manapun saat demonstrasi", async () => {
    const payload = {
      virtual_account: siswaSiti.virtual_account.nomor_va,
      amount: 350000,
      transaction_id: `TRX-SIM-ADMIN-TEST-${Date.now()}`,
      status: "PAID",
      paid_at: "2026-10-01 10:00:00",
    };

    const req = new NextRequest("http://localhost:3000/api/simulator/send-callback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${tokenAdmin}`,
      },
      body: JSON.stringify({ payload }),
    });

    const res = await sendCallbackPost(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.signature_sent).toBeDefined();
  });
});
