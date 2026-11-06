import { prisma } from "../db";

export interface CreateAuditLogParams {
  id_user?: number | null;
  aksi: string;
  entitas: string;
  id_entitas: string;
  data_sebelum?: unknown;
  data_sesudah?: unknown;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    return await prisma.audit_log.create({
      data: {
        id_user: params.id_user || null,
        aksi: params.aksi,
        entitas: params.entitas,
        id_entitas: String(params.id_entitas),
        data_sebelum: params.data_sebelum
          ? JSON.stringify(params.data_sebelum)
          : null,
        data_sesudah: params.data_sesudah
          ? JSON.stringify(params.data_sesudah)
          : null,
      },
    });
  } catch (error) {
    console.error("Gagal mencatat audit log:", error);
    return null;
  }
}
