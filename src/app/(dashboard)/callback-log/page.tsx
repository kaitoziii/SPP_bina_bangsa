"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { History, Search, Code, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTanggal } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";

export default function CallbackLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/callback-log");
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Log Callback Webhook</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Audit trail seluruh pemanggilan webhook Payment Gateway, termasuk callback yang ditolak beserta alasan penolakannya.
          </p>
        </div>
      </motion.div>

      {/* Log Table */}
      <motion.div variants={staggerItem}>
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <History className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700" />
              <div className="text-sm font-semibold">Belum ada riwayat callback</div>
              <p className="text-xs text-zinc-500">
                Setiap request yang masuk ke endpoint /api/payment/callback akan tercatat di sini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Waktu Request</th>
                    <th className="px-4 py-3 font-medium">Status HTTP</th>
                    <th className="px-4 py-3 font-medium">Hasil</th>
                    <th className="px-4 py-3 font-medium">Pesan Respon / Alasan</th>
                    <th className="px-4 py-3 font-medium">IP Address</th>
                    <th className="px-4 py-3 font-medium text-right">Detail Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {logs.map((log) => (
                    <tr key={log.id_callback} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-mono text-zinc-500 whitespace-nowrap">
                        {formatTanggal(log.created_at, true)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            log.status_code === 200
                              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                          }`}
                        >
                          HTTP {log.status_code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.is_success ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Sukses</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Ditolak</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 max-w-sm truncate" title={log.response_message}>
                        {log.response_message}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-500 text-[11px]">
                        {log.ip_address || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <Code className="w-3.5 h-3.5" />
                          <span>Payload</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Modal Detail Payload & Signature */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Detail Payload & Header Callback"
        description={`Status HTTP ${selectedLog?.status_code} — ${selectedLog?.is_success ? "Berhasil Diproses" : "Ditolak Sistem"}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Header X-Signature:</label>
            <div className="p-2.5 bg-zinc-900 text-zinc-100 text-xs font-mono rounded-lg break-all">
              {selectedLog?.signature || "None (Header Tidak Dikirim)"}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Raw Body Payload:</label>
            <div className="p-3 bg-zinc-900 text-zinc-100 text-xs font-mono rounded-lg overflow-x-auto max-h-80">
              <pre>
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(selectedLog?.payload || "{}"), null, 2);
                  } catch {
                    return selectedLog?.payload || "-";
                  }
                })()}
              </pre>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
            <div className="text-zinc-500 font-medium">Pesan Respon Sistem:</div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedLog?.response_message}</div>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
