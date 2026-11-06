import { prisma } from "../db";
import { verifySignature } from "../signature";
import { callbackPayloadSchema, CallbackPayload } from "../validations/payment";

export interface ProcessCallbackResult {
  statusCode: number;
  success: boolean;
  message: string;
  data?: unknown;
}

export async function processPaymentCallback(
  payloadRaw: string,
  signatureHeader: string | null | undefined,
  ipAddress?: string
): Promise<ProcessCallbackResult> {
  const secret = process.env.PG_SECRET || "secret-payment-gateway-hmac-key-2026";

  // 1. Verifikasi Signature HMAC-SHA256 (timing safe)
  const isSignatureValid = verifySignature(payloadRaw, signatureHeader, secret);
  if (!isSignatureValid) {
    await prisma.callback_log.create({
      data: {
        ip_address: ipAddress || null,
        signature: signatureHeader || null,
        payload: payloadRaw,
        status_code: 401,
        response_message: "Signature HMAC-SHA256 tidak valid atau header X-Signature hilang",
        is_success: false,
      },
    });

    return {
      statusCode: 401,
      success: false,
      message: "Signature HMAC-SHA256 tidak valid atau header X-Signature hilang",
    };
  }

  // 2. Parse & Validasi payload schema
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payloadRaw);
  } catch {
    await prisma.callback_log.create({
      data: {
        ip_address: ipAddress || null,
        signature: signatureHeader || null,
        payload: payloadRaw,
        status_code: 400,
        response_message: "Format payload bukan JSON yang valid",
        is_success: false,
      },
    });
    return {
      statusCode: 400,
      success: false,
      message: "Format payload bukan JSON yang valid",
    };
  }

  const validationResult = callbackPayloadSchema.safeParse(parsedPayload);
  if (!validationResult.success) {
    const errorMsg = validationResult.error.errors.map((e) => e.message).join(", ");
    await prisma.callback_log.create({
      data: {
        ip_address: ipAddress || null,
        signature: signatureHeader || null,
        payload: payloadRaw,
        status_code: 400,
        response_message: `Validasi data gagal: ${errorMsg}`,
        is_success: false,
      },
    });
    return {
      statusCode: 400,
      success: false,
      message: `Validasi data gagal: ${errorMsg}`,
    };
  }

  const payload: CallbackPayload = validationResult.data;

  // 3. Cek Idempotensi: transaction_id duplikat
  const existingTrx = await prisma.transaksi_payment_gateway.findUnique({
    where: { transaction_id: payload.transaction_id },
  });

  if (existingTrx) {
    // Idempotent: acknowledge 200 OK tanpa menduplikasi data pembayaran
    await prisma.callback_log.create({
      data: {
        ip_address: ipAddress || null,
        signature: signatureHeader || null,
        payload: payloadRaw,
        status_code: 200,
        response_message: `Callback idempotent: transaksi ${payload.transaction_id} sudah pernah diproses sebelumnya`,
        is_success: true,
      },
    });
    return {
      statusCode: 200,
      success: true,
      message: `Transaksi ${payload.transaction_id} sudah pernah diproses sebelumnya (idempotent)`,
      data: {
        transaction_id: payload.transaction_id,
        idempotent: true,
      },
    };
  }

  // 4. Cari Virtual Account di database
  const vaRecord = await prisma.virtual_account.findUnique({
    where: { nomor_va: payload.virtual_account },
    include: { siswa: true },
  });

  if (!vaRecord || vaRecord.status !== "AKTIF" || !vaRecord.siswa) {
    const msg = `Virtual Account ${payload.virtual_account} tidak terdaftar atau tidak aktif`;
    await prisma.callback_log.create({
      data: {
        ip_address: ipAddress || null,
        signature: signatureHeader || null,
        payload: payloadRaw,
        status_code: 404,
        response_message: msg,
        is_success: false,
      },
    });
    return {
      statusCode: 404,
      success: false,
      message: msg,
    };
  }

  // Jika status bukan PAID (misal FAILED / PENDING)
  if (payload.status !== "PAID") {
    await prisma.$transaction(async (tx) => {
      await tx.transaksi_payment_gateway.create({
        data: {
          transaction_id: payload.transaction_id,
          virtual_account: payload.virtual_account,
          id_siswa: vaRecord.id_siswa,
          tanggal_transaksi: new Date(payload.paid_at),
          waktu_transaksi: new Date(payload.paid_at).toTimeString().split(" ")[0] || "00:00:00",
          nominal: payload.amount,
          status_transaksi: payload.status,
          payment_channel: payload.payment_channel || "VIRTUAL_ACCOUNT",
          reference_number: payload.reference_number || null,
          raw_response: payloadRaw,
        },
      });

      await tx.callback_log.create({
        data: {
          ip_address: ipAddress || null,
          signature: signatureHeader || null,
          payload: payloadRaw,
          status_code: 200,
          response_message: `Transaksi dicatat dengan status ${payload.status} (tidak mengubah tagihan)`,
          is_success: true,
        },
      });
    });

    return {
      statusCode: 200,
      success: true,
      message: `Transaksi status ${payload.status} berhasil dicatat tanpa pelunasan tagihan`,
    };
  }

  // 5. Cari tagihan tertua yang belum lunas (status: BELUM BAYAR atau TUNGGAKAN)
  // Aturan keras: Tagihan berstatus BEASISWA dan LUNAS DILEWATI
  const unpaidBills = await prisma.tagihan_spp.findMany({
    where: {
      id_siswa: vaRecord.id_siswa,
      status: { in: ["BELUM BAYAR", "TUNGGAKAN"] },
    },
    orderBy: [
      { tahun: "asc" },
      { bulan: "asc" },
    ],
  });

  if (unpaidBills.length === 0) {
    // Cek apakah siswa hanya punya tagihan beasiswa
    const beasiswaBills = await prisma.tagihan_spp.findMany({
      where: {
        id_siswa: vaRecord.id_siswa,
        status: "BEASISWA",
      },
    });

    const msg = beasiswaBills.length > 0
      ? "Siswa tidak memiliki tagihan aktif yang belum dibayar (tagihan dalam status BEASISWA dibebaskan dan tidak dapat dibayar via VA)"
      : "Tidak ditemukan tagihan yang belum lunas untuk siswa ini";

    await prisma.callback_log.create({
      data: {
        ip_address: ipAddress || null,
        signature: signatureHeader || null,
        payload: payloadRaw,
        status_code: 404,
        response_message: msg,
        is_success: false,
      },
    });
    return {
      statusCode: 404,
      success: false,
      message: msg,
    };
  }

  // Ambil tagihan tertua
  const targetBill = unpaidBills[0];

  // 6. Cocokkan nominal tagihan dengan amount callback
  if (targetBill.nominal !== payload.amount) {
    const msg = `Nominal callback (Rp${payload.amount.toLocaleString("id-ID")}) tidak sesuai dengan tagihan tertua bulan ${targetBill.bulan}/${targetBill.tahun} (Rp${targetBill.nominal.toLocaleString("id-ID")})`;
    await prisma.callback_log.create({
      data: {
        ip_address: ipAddress || null,
        signature: signatureHeader || null,
        payload: payloadRaw,
        status_code: 400,
        response_message: msg,
        is_success: false,
      },
    });
    return {
      statusCode: 400,
      success: false,
      message: msg,
    };
  }

  // 7. Simpan transaksi + pembayaran + update status LUNAS dalam satu transaksi atomik
  const paidDate = new Date(payload.paid_at);
  const timeString = isNaN(paidDate.getTime())
    ? "00:00:00"
    : paidDate.toTimeString().split(" ")[0];

  const transactionExecution = await prisma.$transaction(async (tx) => {
    // 7.1 Simpan Transaksi PG
    const trx = await tx.transaksi_payment_gateway.create({
      data: {
        transaction_id: payload.transaction_id,
        virtual_account: payload.virtual_account,
        id_siswa: vaRecord.id_siswa,
        tanggal_transaksi: paidDate,
        waktu_transaksi: timeString,
        nominal: payload.amount,
        status_transaksi: "PAID",
        payment_channel: payload.payment_channel || "VIRTUAL_ACCOUNT",
        reference_number: payload.reference_number || null,
        raw_response: payloadRaw,
      },
    });

    // 7.2 Insert Pembayaran dengan tanggal bayar sebenarnya (paid_at asli)
    const pembayaran = await tx.pembayaran.create({
      data: {
        id_transaksi: trx.id_transaksi,
        id_tagihan: targetBill.id_tagihan,
        tanggal_pembayaran: paidDate,
        nominal_pembayaran: payload.amount,
        status: "BERHASIL",
      },
    });

    // 7.3 Update Tagihan menjadi LUNAS
    const updatedBill = await tx.tagihan_spp.update({
      where: { id_tagihan: targetBill.id_tagihan },
      data: { status: "LUNAS" },
    });

    // 7.4 Catat Callback Log Sukses
    await tx.callback_log.create({
      data: {
        ip_address: ipAddress || null,
        signature: signatureHeader || null,
        payload: payloadRaw,
        status_code: 200,
        response_message: `Pembayaran berhasil. Tagihan bulan ${targetBill.bulan}/${targetBill.tahun} senilai Rp${payload.amount.toLocaleString("id-ID")} lunas.`,
        is_success: true,
      },
    });

    return { trx, pembayaran, updatedBill };
  });

  return {
    statusCode: 200,
    success: true,
    message: `Pembayaran berhasil diproses. Tagihan bulan ${targetBill.bulan}/${targetBill.tahun} telah LUNAS.`,
    data: {
      transaction_id: transactionExecution.trx.transaction_id,
      id_tagihan: transactionExecution.updatedBill.id_tagihan,
      bulan: transactionExecution.updatedBill.bulan,
      tahun: transactionExecution.updatedBill.tahun,
      status: transactionExecution.updatedBill.status,
      tanggal_pembayaran: transactionExecution.pembayaran.tanggal_pembayaran,
    },
  };
}
