import { NextRequest, NextResponse } from "next/server";
import { generateSignature } from "@/lib/signature";
import { processPaymentCallback } from "@/lib/services/payment.service";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const user = token ? await verifySessionToken(token) : null;

    const body = await req.json();
    const { payload, tamperSignature, customSignature } = body;

    const payloadObj = typeof payload === "string" ? JSON.parse(payload) : payload;

    // Jika yang melakukan simulasi adalah siswa, wajib validasi bahwa VA adalah milik akunnya sendiri
    if (user && user.role === "siswa") {
      if (user.nomor_va && payloadObj?.virtual_account !== user.nomor_va) {
        return NextResponse.json(
          { error: "Akses ditolak: Akun siswa hanya dapat melakukan simulasi untuk Virtual Account miliknya sendiri." },
          { status: 403 }
        );
      }
    }

    const payloadString =
      typeof payload === "string" ? payload : JSON.stringify(payload);

    const secret = process.env.PG_SECRET || "secret-payment-gateway-hmac-key-2026";

    let signature = generateSignature(payloadString, secret);

    if (tamperSignature) {
      // Rusak signature untuk menguji penolakan 401
      signature = signature.replace(/^[0-9a-f]{6}/, "bad999");
    } else if (customSignature) {
      signature = customSignature;
    }

    const ip = req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";

    // Kirim langsung ke service pipeline pemrosesan callback
    const result = await processPaymentCallback(payloadString, signature, ip);

    return NextResponse.json({
      signature_sent: signature,
      payload_sent: payloadString,
      response_status: result.statusCode,
      response_body: {
        success: result.success,
        message: result.message,
        data: result.data,
      },
    });
  } catch (error: any) {
    console.error("Simulator send callback error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengeksekusi simulasi callback." },
      { status: 500 }
    );
  }
}
