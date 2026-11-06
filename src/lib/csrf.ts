import crypto from "crypto";

export const CSRF_HEADER_NAME = "x-csrf-token";
export const CSRF_COOKIE_NAME = "spp_csrf_token";

/**
 * Generate CSRF token string
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Validasi token CSRF dari request header atau body terhadap expected token
 */
export function validateCsrfToken(
  providedToken: string | null | undefined,
  expectedToken: string | null | undefined
): boolean {
  if (!providedToken || !expectedToken) {
    return false;
  }
  try {
    const providedBuf = Buffer.from(providedToken.trim());
    const expectedBuf = Buffer.from(expectedToken.trim());
    if (providedBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(providedBuf, expectedBuf);
  } catch {
    return false;
  }
}
