import crypto from "crypto";

/**
 * Generate HMAC-SHA256 signature dari payload string dan secret
 */
export function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/**
 * Verifikasi signature dengan perbandingan aman terhadap timing attack (timingSafeEqual)
 */
export function verifySignature(
  payload: string,
  signatureHeader: string | null | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  try {
    const expectedSignature = generateSignature(payload, secret);
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const providedBuffer = Buffer.from(signatureHeader.trim(), "hex");

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}
