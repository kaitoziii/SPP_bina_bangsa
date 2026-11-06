import { z } from "zod";

export const callbackPayloadSchema = z.object({
  virtual_account: z
    .string({ required_error: "virtual_account wajib diisi" })
    .min(5, "Nomor virtual account tidak valid"),
  amount: z
    .number({ required_error: "amount wajib diisi" })
    .positive("Nomor nominal harus lebih dari 0"),
  transaction_id: z
    .string({ required_error: "transaction_id wajib diisi" })
    .min(1, "transaction_id tidak boleh kosong"),
  status: z.enum(["PAID", "FAILED", "PENDING"], {
    errorMap: () => ({ message: "status harus salah satu dari: PAID, FAILED, PENDING" }),
  }),
  paid_at: z
    .string({ required_error: "paid_at wajib diisi" })
    .min(1, "paid_at tidak boleh kosong"),
  payment_channel: z.string().optional().default("VIRTUAL_ACCOUNT"),
  reference_number: z.string().optional(),
});

export type CallbackPayload = z.infer<typeof callbackPayloadSchema>;
