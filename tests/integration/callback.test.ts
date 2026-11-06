import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/lib/db";
import { generateSignature } from "../../src/lib/signature";
import { processPaymentCallback } from "../../src/lib/services/payment.service";

describe("Payment Gateway Callback Pipeline (Integration)", () => {
  const secret = process.env.PG_SECRET || "secret-payment-gateway-hmac-key-2026";
  const vaAhmad = "8800012345";

  beforeAll(async () => {
    // Pastikan tagihan September Ahmad Fauzan berstatus BELUM BAYAR untuk pengujian
    const siswaAhmad = await prisma.siswa.findUnique({ where: { nis: "12345" } });
    if (siswaAhmad) {
      await prisma.tagihan_spp.updateMany({
        where: { id_siswa: siswaAhmad.id_siswa, bulan: 9, tahun: 2026 },
        data: { status: "BELUM BAYAR" },
      });
      // Bersihkan transaksi tes jika ada
      await prisma.pembayaran.deleteMany({
        where: { transaksi_payment_gateway: { transaction_id: "TRX-TEST-CALLBACK-001" } },
      });
      await prisma.transaksi_payment_gateway.deleteMany({
        where: { transaction_id: "TRX-TEST-CALLBACK-001" },
      });
    }
  });

  it("1. Callback dengan signature tidak valid ditolak dengan status 401", async () => {
    const payload = JSON.stringify({
      virtual_account: vaAhmad,
      amount: 350000,
      transaction_id: "TRX-TEST-INVALID-SIG",
      status: "PAID",
      paid_at: "2026-09-25 10:15:00",
    });

    const result = await processPaymentCallback(payload, "bad-fake-signature-1234567890abcdef");
    expect(result.statusCode).toBe(401);
    expect(result.success).toBe(false);
  });

  it("2. Callback normal yang sah memproses pelunasan: BELUM BAYAR -> LUNAS dalam transaksi atomik", async () => {
    const payload = JSON.stringify({
      virtual_account: vaAhmad,
      amount: 350000,
      transaction_id: "TRX-TEST-CALLBACK-001",
      status: "PAID",
      paid_at: "2026-09-25 10:15:00",
      payment_channel: "VIRTUAL_ACCOUNT",
    });

    const validSig = generateSignature(payload, secret);
    const result = await processPaymentCallback(payload, validSig);

    expect(result.statusCode).toBe(200);
    expect(result.success).toBe(true);

    // Verifikasi database: tagihan September Ahmad harus LUNAS
    const siswaAhmad = await prisma.siswa.findUnique({ where: { nis: "12345" } });
    const bill = await prisma.tagihan_spp.findUnique({
      where: {
        id_siswa_bulan_tahun: {
          id_siswa: siswaAhmad!.id_siswa,
          bulan: 9,
          tahun: 2026,
        },
      },
    });

    expect(bill!.status).toBe("LUNAS");

    // Verifikasi pencatatan pembayaran dan raw_response
    const trx = await prisma.transaksi_payment_gateway.findUnique({
      where: { transaction_id: "TRX-TEST-CALLBACK-001" },
      include: { pembayaran: true },
    });

    expect(trx).toBeDefined();
    expect(trx!.nominal).toBe(350000);
    expect(trx!.raw_response).toBe(payload);
    expect(trx!.pembayaran.length).toBe(1);
    expect(trx!.pembayaran[0].id_tagihan).toBe(bill!.id_tagihan);
  });

  it("3. Callback duplikat (idempotent) mengembalikan 200 OK tanpa menduplikasi data", async () => {
    const payload = JSON.stringify({
      virtual_account: vaAhmad,
      amount: 350000,
      transaction_id: "TRX-TEST-CALLBACK-001", // ID yang sama
      status: "PAID",
      paid_at: "2026-09-25 10:15:00",
    });

    const validSig = generateSignature(payload, secret);
    const result = await processPaymentCallback(payload, validSig);

    expect(result.statusCode).toBe(200);
    expect(result.data).toHaveProperty("idempotent", true);

    // Cek bahwa jumlah record transaksi tetap 1
    const count = await prisma.transaksi_payment_gateway.count({
      where: { transaction_id: "TRX-TEST-CALLBACK-001" },
    });
    expect(count).toBe(1);
  });

  it("4. Callback dengan nominal yang tidak cocok ditolak dengan status 400", async () => {
    // Gunakan VA Siti Aminah (8800012346) yang memiliki tagihan belum bayar Rp350.000
    const payload = JSON.stringify({
      virtual_account: "8800012346",
      amount: 100000, // Seharusnya 350000
      transaction_id: "TRX-TEST-WRONG-AMOUNT",
      status: "PAID",
      paid_at: "2026-09-25 10:15:00",
    });

    const validSig = generateSignature(payload, secret);
    const result = await processPaymentCallback(payload, validSig);

    expect(result.statusCode).toBe(400);
    expect(result.success).toBe(false);
  });

  it("5. Callback untuk VA yang tidak terdaftar ditolak dengan status 404", async () => {
    const payload = JSON.stringify({
      virtual_account: "8800099999", // VA fiktif
      amount: 350000,
      transaction_id: "TRX-TEST-UNKNOWN-VA",
      status: "PAID",
      paid_at: "2026-09-25 10:15:00",
    });

    const validSig = generateSignature(payload, secret);
    const result = await processPaymentCallback(payload, validSig);

    expect(result.statusCode).toBe(404);
    expect(result.success).toBe(false);
  });
});
