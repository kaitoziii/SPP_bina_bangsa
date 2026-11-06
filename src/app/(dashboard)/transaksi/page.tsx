"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowRightLeft, Search, Code, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";

export default function TransaksiPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRawJson, setSelectedRawJson] = useState<any | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);

      const res = await fetch(`/api/transaksi?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTransactions(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Riwayat Transaksi Payment Gateway</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Daftar seluruh transaksi yang diproses melalui webhook Payment Gateway lengkap dengan jejak audit raw_response.
          </p>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={staggerItem} className="relative w-full max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
        <input
          type="text"
          placeholder="Cari Transaction ID, VA, atau nama siswa..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-9 pr-3 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </motion.div>

      {/* Table Transaksi */}
      <motion.div variants={staggerItem}>
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ArrowRightLeft className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700" />
              <div className="text-sm font-semibold">Belum ada transaksi</div>
              <p className="text-xs text-zinc-500">
                Lakukan pembayaran melalui Virtual Account di simulator PG untuk melihat pencatatan transaksi di sini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Transaction ID</th>
                    <th className="px-4 py-3 font-medium">Virtual Account</th>
                    <th className="px-4 py-3 font-medium">Siswa</th>
                    <th className="px-4 py-3 font-medium">Nominal</th>
                    <th className="px-4 py-3 font-medium">Waktu Transaksi</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Raw Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {transactions.map((t) => (
                    <tr key={t.id_transaksi} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                        {t.transaction_id}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                        {t.virtual_account}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {t.siswa?.nama || "-"}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          NIS: {t.siswa?.nis || "-"} · {t.siswa?.kelas?.nama_kelas || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">
                        {formatRupiah(t.nominal)}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                        {formatTanggal(t.tanggal_transaksi, true)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status_transaksi} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedRawJson(t)}
                          className="inline-flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          <Code className="w-3.5 h-3.5" />
                          <span>Lihat JSON</span>
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

      {/* Modal Raw Response JSON */}
      <Modal
        isOpen={!!selectedRawJson}
        onClose={() => setSelectedRawJson(null)}
        title="Raw Response Payment Gateway"
        description={`Jejak audit payload callback untuk transaksi ${selectedRawJson?.transaction_id}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-zinc-900 text-zinc-100 text-xs font-mono rounded-lg overflow-x-auto max-h-96">
            <pre>
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(selectedRawJson?.raw_response || "{}"), null, 2);
                } catch {
                  return selectedRawJson?.raw_response || "-";
                }
              })()}
            </pre>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
