"use client";

import React from "react";
import { motion } from "framer-motion";
import { badgeVariants } from "@/lib/motion";

export type StatusTagihanType =
  | "LUNAS"
  | "BELUM BAYAR"
  | "TUNGGAKAN"
  | "BEASISWA"
  | "DIAJUKAN"
  | "DISETUJUI"
  | "DITOLAK"
  | "DIBATALKAN"
  | "PAID"
  | "FAILED"
  | "PENDING"
  | "AKTIF"
  | "NONAKTIF";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "md",
  className = "",
}) => {
  const norm = (status || "").toUpperCase();

  // Konfigurasi warna semantik Apple Minimalist:
  // Latar halus, teks berbobot 500, dot indikator yang kontras namun tenang
  let styleClasses = "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  let dotColor = "bg-zinc-500";
  let label = status;

  if (norm === "LUNAS" || norm === "PAID" || norm === "DISETUJUI" || norm === "AKTIF") {
    styleClasses =
      "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60";
    dotColor = "bg-emerald-500";
    label = norm === "PAID" ? "BERHASIL" : norm;
  } else if (norm === "TUNGGAKAN" || norm === "FAILED" || norm === "DITOLAK" || norm === "NONAKTIF") {
    styleClasses =
      "bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60";
    dotColor = "bg-rose-500";
    label = norm === "FAILED" ? "GAGAL" : norm;
  } else if (norm === "BEASISWA") {
    styleClasses =
      "bg-sky-50 text-sky-800 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60";
    dotColor = "bg-sky-500";
    label = "BEASISWA";
  } else if (norm === "DIAJUKAN" || norm === "PENDING") {
    styleClasses =
      "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60";
    dotColor = "bg-amber-500";
    label = norm === "PENDING" ? "MENUNGGU" : "DIAJUKAN";
  } else if (norm === "BELUM BAYAR") {
    styleClasses =
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700";
    dotColor = "bg-slate-400";
    label = "BELUM BAYAR";
  } else if (norm === "DIBATALKAN") {
    styleClasses =
      "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
    dotColor = "bg-zinc-400";
    label = "DIBATALKAN";
  }

  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2 py-0.5 tracking-tight font-medium"
      : "text-xs px-2.5 py-1 tracking-tight font-medium";

  return (
    <motion.span
      variants={badgeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`inline-flex items-center gap-1.5 rounded-full border ${styleClasses} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{label}</span>
    </motion.span>
  );
};
