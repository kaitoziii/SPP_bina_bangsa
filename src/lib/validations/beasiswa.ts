import { z } from "zod";

export const pengajuanBeasiswaSchema = z.object({
  jenis: z.enum(["PRESTASI", "KURANG_MAMPU", "LAINNYA"], {
    errorMap: () => ({ message: "Jenis beasiswa harus PRESTASI, KURANG_MAMPU, atau LAINNYA" }),
  }),
  alasan: z
    .string({ required_error: "Alasan pengajuan wajib diisi" })
    .min(10, "Alasan pengajuan minimal 10 karakter")
    .max(1000, "Alasan pengajuan maksimal 1000 karakter"),
  lampiran: z.string().optional().nullable(),
});

export type PengajuanBeasiswaInput = z.infer<typeof pengajuanBeasiswaSchema>;

export const keputusanBeasiswaSchema = z
  .object({
    status: z.enum(["DISETUJUI", "DITOLAK"], {
      errorMap: () => ({ message: "Keputusan harus DISETUJUI atau DITOLAK" }),
    }),
    jumlah_bulan: z.coerce.number().int().optional(),
    bulan_mulai: z.coerce.number().int().min(1).max(12).optional(),
    tahun_mulai: z.coerce.number().int().optional(),
    catatan: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "DISETUJUI") {
      if (!data.jumlah_bulan || data.jumlah_bulan < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["jumlah_bulan"],
          message: "Jumlah bulan beasiswa minimal 1 bulan",
        });
      }
      if (!data.bulan_mulai) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bulan_mulai"],
          message: "Bulan mulai beasiswa wajib ditentukan",
        });
      }
      if (!data.tahun_mulai) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tahun_mulai"],
          message: "Tahun mulai beasiswa wajib ditentukan",
        });
      }
    } else if (data.status === "DITOLAK") {
      if (!data.catatan || data.catatan.trim().length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["catatan"],
          message: "Alasan penolakan wajib diisi (minimal 5 karakter)",
        });
      }
    }
  });

export type KeputusanBeasiswaInput = z.infer<typeof keputusanBeasiswaSchema>;
