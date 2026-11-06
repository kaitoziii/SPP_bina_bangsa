import { test, expect } from "@playwright/test";

test.describe("Demo Sertifikasi End-to-End", () => {
  test("Alur Demo Lengkap: Login Siswa -> Cek Tagihan -> Simulasi Bayar VA -> Callback Webhook -> LUNAS", async ({
    page,
    request,
  }) => {
    // 1. Kunjungi halaman Login
    await page.goto("/login");
    await expect(page).toHaveTitle(/Sistem Pembayaran SPP/);

    // 2. Login sebagai Siswa Ahmad Fauzan (NIS 12345)
    await page.fill('input[placeholder="Masukkan username atau NIS"]', "12345");
    await page.fill('input[type="password"]', "siswa123");
    await page.click('button[type="submit"]');

    // 3. Masuk ke Dashboard Siswa
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("text=Ahmad Fauzan")).toBeVisible();
    await expect(page.locator("text=8800012345")).toBeVisible();

    // 4. Buka halaman Simulator Payment Gateway
    await page.goto("/pg-simulator");
    await expect(page.locator("text=Payment Gateway Simulator")).toBeVisible();

    // 5. Jalankan simulasi pembayaran normal
    // Navigasi ke Step 4 (Simulasi Bayar)
    await page.click("text=Lanjut: Review Pembayaran");
    await page.click("text=Lanjut ke Virtual Account");
    await page.click("text=Lanjut ke Opsi Simulasi");

    // Klik tombol "Kirim Callback Lunas"
    await page.click("text=Kirim Callback Lunas");

    // 6. Verifikasi hasil callback: HTTP 200 OK
    await expect(page.locator("text=HTTP Status: 200 OK")).toBeVisible();
    await expect(page.locator("text=LUNAS")).toBeVisible();

    // 7. Buka Dashboard kembali dan verifikasi status tagihan
    await page.goto("/dashboard");
    await expect(page.locator("text=LUNAS").first()).toBeVisible();
  });

  test("Uji Idempotensi: Duplicate callback ditolak ganda / di-acknowledge idempotent", async ({
    request,
  }) => {
    // Kirim langsung ke API simulator helper
    const payload = {
      virtual_account: "8800012345",
      amount: 350000,
      transaction_id: "TRX-20260720-001", // Sudah pernah diproses di seed
      status: "PAID",
      paid_at: "2026-07-20 10:15:00",
    };

    const res = await request.post("/api/simulator/send-callback", {
      data: { payload, tamperSignature: false },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.response_status).toBe(200);
    expect(json.response_body.message).toMatch(/idempotent/i);
  });
});
