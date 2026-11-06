"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Code } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTanggal } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/audit-log");
      const json = await res.json();
      if (json.success) setLogs(json.data);
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
      <motion.div variants={staggerItem} className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">Audit Log Sistem</h1>
        <p className="text-xs text-zinc-500">
          Jejak rekaman seluruh perubahan mutasi penting, keputusan beasiswa, dan aksi administratif.
        </p>
      </motion.div>

      <motion.div variants={staggerItem}>
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500">
              Belum ada rekaman audit log.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Waktu</th>
                    <th className="px-4 py-3 font-medium">Pengguna</th>
                    <th className="px-4 py-3 font-medium">Aksi</th>
                    <th className="px-4 py-3 font-medium">Entitas</th>
                    <th className="px-4 py-3 font-medium">ID Entitas</th>
                    <th className="px-4 py-3 font-medium text-right">Data Sebelum / Sesudah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {logs.map((log) => (
                    <tr key={log.id_log} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-mono text-zinc-500 whitespace-nowrap">
                        {formatTanggal(log.created_at, true)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {log.user?.nama || "Sistem / Otomatis"}
                        </div>
                        {log.user?.username && (
                          <div className="text-[11px] text-zinc-400 font-mono">
                            @{log.user.username}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                          {log.aksi}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                        {log.entitas}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-500">
                        {log.id_entitas}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <Code className="w-3.5 h-3.5" />
                          <span>Rincian</span>
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

      {/* Modal Detail JSON Log */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Rincian Mutasi Data Audit Log"
        description={`Aksi: ${selectedLog?.aksi} pada entitas ${selectedLog?.entitas} #${selectedLog?.id_entitas}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-500">Data Sebelum:</span>
            <div className="p-3 bg-zinc-900 text-zinc-100 text-xs font-mono rounded-lg overflow-x-auto max-h-48">
              <pre>
                {(() => {
                  try {
                    return selectedLog?.data_sebelum
                      ? JSON.stringify(JSON.parse(selectedLog.data_sebelum), null, 2)
                      : "null";
                  } catch {
                    return selectedLog?.data_sebelum || "null";
                  }
                })()}
              </pre>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-500">Data Sesudah:</span>
            <div className="p-3 bg-zinc-900 text-zinc-100 text-xs font-mono rounded-lg overflow-x-auto max-h-48">
              <pre>
                {(() => {
                  try {
                    return selectedLog?.data_sesudah
                      ? JSON.stringify(JSON.parse(selectedLog.data_sesudah), null, 2)
                      : "null";
                  } catch {
                    return selectedLog?.data_sesudah || "null";
                  }
                })()}
              </pre>
            </div>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
