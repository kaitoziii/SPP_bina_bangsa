import { NextRequest, NextResponse } from "next/server";
import { processPaymentCallback } from "@/lib/services/payment.service";

export async function POST(req: NextRequest) {
  try {
    const rawPayload = await req.text();
    const signature = req.headers.get("x-signature") || req.headers.get("X-Signature");
    const ip = req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";

    const result = await processPaymentCallback(rawPayload, signature, ip);

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        data: result.data,
      },
      { status: result.statusCode }
    );
  } catch (error) {
    console.error("Payment callback unhandled error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan sistem saat memproses callback pembayaran.",
      },
      { status: 500 }
    );
  }
}
