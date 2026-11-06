import { describe, it, expect } from "vitest";
import { generateSignature, verifySignature } from "../../src/lib/signature";

describe("HMAC Signature Utilities", () => {
  const secret = "secret-payment-gateway-hmac-key-2026";
  const payload = JSON.stringify({
    virtual_account: "8800012345",
    amount: 350000,
    transaction_id: "TRX-20260918-001",
    status: "PAID",
    paid_at: "2026-09-25 10:15:00",
  });

  it("generateSignature menghasilkan heksadesimal SHA256 yang deterministik", () => {
    const sig1 = generateSignature(payload, secret);
    const sig2 = generateSignature(payload, secret);
    expect(sig1).toHaveLength(64);
    expect(sig1).toBe(sig2);
  });

  it("verifySignature mengembalikan true untuk signature yang valid", () => {
    const sig = generateSignature(payload, secret);
    expect(verifySignature(payload, sig, secret)).toBe(true);
  });

  it("verifySignature mengembalikan false jika payload diubah", () => {
    const sig = generateSignature(payload, secret);
    const alteredPayload = payload.replace("350000", "500000");
    expect(verifySignature(alteredPayload, sig, secret)).toBe(false);
  });

  it("verifySignature mengembalikan false jika signature dirusak atau beda panjang", () => {
    expect(verifySignature(payload, "invalid-hex-string", secret)).toBe(false);
    expect(verifySignature(payload, "", secret)).toBe(false);
    expect(verifySignature(payload, null, secret)).toBe(false);

    const validSig = generateSignature(payload, secret);
    const tamperedSig = "a" + validSig.slice(1);
    expect(verifySignature(payload, tamperedSig, secret)).toBe(false);
  });
});
