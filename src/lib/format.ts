/**
 * Format angka ke format Rupiah standar Indonesia:
 * Contoh: 350000 -> "Rp350.000"
 */
export function formatRupiah(amount: number): string {
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp${formatted}`;
}

/**
 * Format tanggal ke bahasa Indonesia
 * Contoh: 2026-09-25 -> "25 Sep 2026" atau "25 September 2026"
 */
export function formatTanggal(
  date: string | Date | null | undefined,
  includeTime = false
): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };

  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
    options.second = "2-digit";
    options.hour12 = false;
  }

  return new Intl.DateTimeFormat("id-ID", options).format(d);
}

/**
 * Daftar nama bulan dalam bahasa Indonesia
 */
export const NAMA_BULAN = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function getNamaBulan(bulan: number): string {
  return NAMA_BULAN[bulan] || `Bulan ${bulan}`;
}

/**
 * Hitung tanggal jatuh tempo (hari terakhir bulan berjalan pukul 23:59:59)
 */
export function hitungJatuhTempo(bulan: number, tahun: number): Date {
  // Bulan di JS Date adalah 0-indexed (0=Januari), jadi bulan berikutnya dengan hari 0 menghasilkan hari terakhir bulan tersebut
  return new Date(tahun, bulan, 0, 23, 59, 59, 999);
}

/**
 * Validasi apakah 5 digit terakhir VA sama dengan NIS
 */
export function validateVaWithNis(va: string, nis: string): boolean {
  if (!va || !nis) return false;
  const cleanVa = va.trim();
  const cleanNis = nis.trim();
  if (cleanNis.length < 5) {
    // Pad NIS with leading zeroes if shorter than 5 chars
    const paddedNis = cleanNis.padStart(5, "0");
    return cleanVa.endsWith(paddedNis);
  }
  const expectedEnd = cleanNis.slice(-5);
  return cleanVa.endsWith(expectedEnd);
}

/**
 * Generate nomor VA berdasarkan prefix dan NIS
 */
export function generateNomorVa(prefix: string, nis: string): string {
  const cleanNis = nis.trim();
  const nisPart = cleanNis.length < 5 ? cleanNis.padStart(5, "0") : cleanNis.slice(-5);
  return `${prefix.trim()}${nisPart}`;
}
