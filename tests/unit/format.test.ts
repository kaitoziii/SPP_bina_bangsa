import { describe, it, expect } from "vitest";
import {
  formatRupiah,
  formatTanggal,
  hitungJatuhTempo,
  validateVaWithNis,
  generateNomorVa,
  getNamaBulan,
} from "../../src/lib/format";

describe("Format Utilities", () => {
  it("formatRupiah memformat angka dengan pemisah ribuan titik dan prefiks Rp", () => {
    expect(formatRupiah(350000)).toBe("Rp350.000");
    expect(formatRupiah(0)).toBe("Rp0");
    expect(formatRupiah(1500000)).toBe("Rp1.500.000");
  });

  it("getNamaBulan mengembalikan nama bulan bahasa Indonesia", () => {
    expect(getNamaBulan(1)).toBe("Januari");
    expect(getNamaBulan(7)).toBe("Juli");
    expect(getNamaBulan(9)).toBe("September");
    expect(getNamaBulan(12)).toBe("Desember");
  });

  it("hitungJatuhTempo mengembalikan hari terakhir bulan pukul 23:59:59", () => {
    // September 2026 memiliki 30 hari
    const sep = hitungJatuhTempo(9, 2026);
    expect(sep.getFullYear()).toBe(2026);
    expect(sep.getMonth()).toBe(8); // 0-indexed (8 = September)
    expect(sep.getDate()).toBe(30);

    // Februari 2028 (kabisat) memiliki 29 hari
    const febKabisat = hitungJatuhTempo(2, 2028);
    expect(febKabisat.getDate()).toBe(29);

    // Februari 2027 (bukan kabisat) memiliki 28 hari
    const febBiasa = hitungJatuhTempo(2, 2027);
    expect(febBiasa.getDate()).toBe(28);
  });

  it("validateVaWithNis memastikan 5 digit terakhir nomor VA sama dengan NIS siswa", () => {
    expect(validateVaWithNis("8800012345", "12345")).toBe(true);
    expect(validateVaWithNis("9912345", "12345")).toBe(true);
    expect(validateVaWithNis("8800012346", "12345")).toBe(false);
    expect(validateVaWithNis("", "12345")).toBe(false);
    expect(validateVaWithNis("8800012345", "")).toBe(false);
  });

  it("generateNomorVa membentuk nomor VA dari prefix dan NIS", () => {
    expect(generateNomorVa("88000", "12345")).toBe("8800012345");
    expect(generateNomorVa("88000", "12346")).toBe("8800012346");
    // Jika NIS kurang dari 5 karakter, otomatis di-pad dengan nol di depan
    expect(generateNomorVa("88000", "42")).toBe("8800000042");
  });
});
