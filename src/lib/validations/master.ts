import { z } from "zod";

export const siswaSchema = z.object({
  nis: z.string().min(1, "NIS wajib diisi").max(20, "NIS terlalu panjang"),
  nisn: z.string().min(1, "NISN wajib diisi").max(20, "NISN terlalu panjang"),
  nama: z.string().min(1, "Nama wajib diisi").max(100, "Nama terlalu panjang"),
  jenis_kelamin: z.enum(["L", "P"], { errorMap: () => ({ message: "Pilih jenis kelamin L atau P" }) }),
  tempat_lahir: z.string().min(1, "Tempat lahir wajib diisi"),
  tanggal_lahir: z.string().min(1, "Tanggal lahir wajib diisi"),
  alamat: z.string().min(1, "Alamat wajib diisi"),
  no_hp: z.string().min(1, "Nomor HP wajib diisi"),
  nama_orang_tua: z.string().min(1, "Nama orang tua wajib diisi"),
  id_kelas: z.coerce.number().int().positive("Pilih kelas yang valid"),
  id_tahun_ajaran: z.coerce.number().int().positive("Pilih tahun ajaran yang valid"),
  status: z.string().default("AKTIF"),
});

export const kelasSchema = z.object({
  nama_kelas: z.string().min(1, "Nama kelas wajib diisi"),
  tingkat: z.string().min(1, "Tingkat wajib diisi"),
  id_jurusan: z.coerce.number().int().positive("Pilih jurusan"),
  id_tahun_ajaran: z.coerce.number().int().positive("Pilih tahun ajaran"),
});

export const jurusanSchema = z.object({
  kode_jurusan: z.string().min(1, "Kode jurusan wajib diisi").max(10),
  nama_jurusan: z.string().min(1, "Nama jurusan wajib diisi"),
  keterangan: z.string().optional().nullable(),
});

export const tahunAjaranSchema = z.object({
  tahun_ajaran: z.string().min(1, "Tahun ajaran wajib diisi (mis. 2026/2027)"),
  tanggal_mulai: z.string().min(1, "Tanggal mulai wajib diisi"),
  tanggal_selesai: z.string().min(1, "Tanggal selesai wajib diisi"),
  status: z.enum(["AKTIF", "NONAKTIF"]).default("AKTIF"),
});

export const tarifSppSchema = z.object({
  id_tahun_ajaran: z.coerce.number().int().positive("Pilih tahun ajaran"),
  nominal: z.coerce.number().positive("Nominal tarif harus lebih dari 0"),
  keterangan: z.string().optional().nullable(),
  status: z.enum(["AKTIF", "NONAKTIF"]).default("AKTIF"),
});

export const generateTagihanSchema = z.object({
  id_tahun_ajaran: z.coerce.number().int().positive("Tahun ajaran wajib dipilih"),
  bulan: z.coerce.number().int().min(1).max(12, "Bulan harus antara 1 sampai 12"),
  tahun: z.coerce.number().int().min(2000, "Tahun tidak valid"),
  id_kelas: z.coerce.number().int().optional().nullable(), // jika null/undefined, generate seluruh siswa aktif
});

export const userSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
  role: z.enum(["admin", "kepala_sekolah", "teller", "siswa"]),
  status: z.enum(["AKTIF", "NONAKTIF"]).default("AKTIF"),
  // Data opsional khusus role siswa
  id_kelas: z.coerce.number().int().optional().nullable(),
  id_tahun_ajaran: z.coerce.number().int().optional().nullable(),
  nis: z.string().optional().nullable(),
  nisn: z.string().optional().nullable(),
  jenis_kelamin: z.enum(["L", "P"]).optional().nullable(),
  no_hp: z.string().optional().nullable(),
  alamat: z.string().optional().nullable(),
});

export const updateUserSchema = z.object({
  id_user: z.coerce.number().int().positive("ID user wajib diisi"),
  nama: z.string().min(1, "Nama wajib diisi").optional(),
  username: z.string().min(3, "Username minimal 3 karakter").optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional().nullable(),
  role: z.enum(["admin", "kepala_sekolah", "teller", "siswa"]).optional(),
  status: z.enum(["AKTIF", "NONAKTIF"]).optional(),
  // Khusus siswa
  id_kelas: z.coerce.number().int().optional().nullable(),
  id_tahun_ajaran: z.coerce.number().int().optional().nullable(),
});
