import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username wajib diisi")
    .max(50, "Username maksimal 50 karakter"),
  password: z
    .string()
    .min(1, "Password wajib diisi")
    .max(100, "Password terlalu panjang"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username minimal 3 karakter")
      .max(50, "Username maksimal 50 karakter")
      .regex(
        /^[a-zA-Z0-9_.-]+$/,
        "Username hanya boleh berisi huruf, angka, titik, underscore, dan strip"
      )
      .optional(),
    current_password: z.string().optional(),
    new_password: z
      .string()
      .min(6, "Password baru minimal 6 karakter")
      .max(100, "Password terlalu panjang")
      .optional(),
    confirm_password: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.new_password && !data.current_password) {
        return false;
      }
      return true;
    },
    {
      message: "Password saat ini wajib diisi jika ingin mengganti password",
      path: ["current_password"],
    }
  )
  .refine(
    (data) => {
      if (data.new_password && data.new_password !== data.confirm_password) {
        return false;
      }
      return true;
    },
    {
      message: "Konfirmasi password baru tidak sesuai",
      path: ["confirm_password"],
    }
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
