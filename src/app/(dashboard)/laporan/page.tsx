"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah, formatTanggal, getNamaBulan } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";

export default function LaporanPage() {
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState("ALL");
  const [bulan, setBulan] = useState("ALL");
  const [tahun, setTahun] = useState("2026");
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [selectedKelas, setSelectedKelas] = useState("ALL");

  useEffect(() => {
    fetch("/api/master/kelas")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setKelasList(json.data);
      })
      .catch(console.error);
  }, []);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status !== "ALL") params.append("status", status);
      if (bulan !== "ALL") params.append("bulan", bulan);
      if (tahun !== "ALL") params.append("tahun", tahun);
      if (selectedKelas !== "ALL") params.append("id_kelas", selectedKelas);

      const res = await fetch(`/api/laporan?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setReportData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [status, bulan, tahun, selectedKelas]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (status !== "ALL") params.append("status", status);
    if (bulan !== "ALL") params.append("bulan", bulan);
    if (tahun !== "ALL") params.append("tahun", tahun);
    if (selectedKelas !== "ALL") params.append("id_kelas", selectedKelas);

    window.open(`/api/laporan/export?${params.toString()}`, "_blank");
  };

  const summary = reportData?.summary;
  const list = reportData?.data || [];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Laporan Rekap Pembayaran & Tunggakan</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Laporan keuangan SPP terpadu dengan rincian penerimaan, tunggakan, dan pembebasan beasiswa.
          </p>
        </div>

        <Button onClick={handleExportCsv} size="sm" variant="secondary" className="gap-2">
          <Download className="w-4 h-4" />
          <span>Ekspor CSV</span>
        </Button>
      </motion.div>

      {/* Summary Cards */}
      {summary && (
        <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1 border-emerald-200 bg-emerald-50/20">
            <div className="text-[11px] text-emerald-800 font-medium">TOTAL PENERIMAAN (LUNAS)</div>
            <div className="text-xl font-bold text-emerald-950 font-mono">
              {formatRupiah(summary.total_penerimaan)}
            </div>
          </Card>

          <Card className="p-4 space-y-1 border-rose-200 bg-rose-50/20">
            <div className="text-[11px] text-rose-800 font-medium">TOTAL TUNGGAKAN</div>
            <div className="text-xl font-bold text-rose-950 font-mono">
              {formatRupiah(summary.total_tunggakan)}
            </div>
          </Card>

          <Card className="p-4 space-y-1 border-sky-200 bg-sky-50/20">
            <div className="text-[11px] text-sky-800 font-medium">BEASISWA DIBEBASKAN</div>
            <div className="text-xl font-bold text-sky-950 font-mono">
              {formatRupiah(summary.total_beasiswa)}
            </div>
          </Card>

          <Card className="p-4 space-y-1 border-slate-200 bg-slate-50/40">
            <div className="text-[11px] text-slate-700 font-medium">BELUM JATUH TEMPO</div>
            <div className="text-xl font-bold text-slate-900 font-mono">
              {formatRupiah(summary.total_belum_bayar)}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Filter Bar */}
      <motion.div variants={staggerItem} className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs h-9 w-40"
          options={[
            { value: "ALL", label: "Semua Status" },
            { value: "LUNAS", label: "Lunas" },
            { value: "TUNGGAKAN", label: "Tunggakan" },
            { value: "BEASISWA", label: "Beasiswa" },
            { value: "BELUM BAYAR", label: "Belum Bayar" },
          ]}
        />

        <Select
          value={bulan}
          onChange={(e) => setBulan(e.target.value)}
          className="text-xs h-9 w-36"
          options={[
            { value: "ALL", label: "Semua Bulan" },
            ...Array.from({ length: 12 }, (_, i) => ({
              value: String(i + 1),
              label: getNamaBulan(i + 1),
            })),
          ]}
        />

        <Select
          value={tahun}
          onChange={(e) => setTahun(e.target.value)}
          className="text-xs h-9 w-32"
          options={[
            { value: "ALL", label: "Semua Tahun" },
            { value: "2026", label: "2026" },
            { value: "2027", label: "2027" },
          ]}
        />

        <Select
          value={selectedKelas}
          onChange={(e) => setSelectedKelas(e.target.value)}
          className="text-xs h-9 w-36"
          options={[
            { value: "ALL", label: "Semua Kelas" },
            ...kelasList.map((k) => ({
              value: String(k.id_kelas),
              label: k.nama_kelas,
            })),
          ]}
        />
      </motion.div>

      {/* Report Table */}
      <motion.div variants={staggerItem}>
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : list.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <FileText className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700" />
              <div className="text-sm font-semibold">Tidak ada data laporan</div>
              <p className="text-xs text-zinc-500">Sesuaikan filter untuk melihat data.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Siswa</th>
                    <th className="px-4 py-3 font-medium">Kelas / Jurusan</th>
                    <th className="px-4 py-3 font-medium">Virtual Account</th>
                    <th className="px-4 py-3 font-medium">Periode</th>
                    <th className="px-4 py-3 font-medium">Nominal</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Tanggal Bayar</th>
                    <th className="px-4 py-3 font-medium">Transaction ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {list.map((item: any) => {
                    const pembayaran = item.pembayaran?.[0];
                    const trxId = pembayaran?.transaksi_payment_gateway?.transaction_id || "-";

                    return (
                      <tr key={item.id_tagihan} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.siswa?.nama}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            NIS: {item.siswa?.nis}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                          {item.siswa?.kelas?.nama_kelas || "-"}
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                          {item.siswa?.virtual_account?.nomor_va || "-"}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {getNamaBulan(item.bulan)} {item.tahun}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold">
                          {formatRupiah(item.nominal)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                          {pembayaran ? formatTanggal(pembayaran.tanggal_pembayaran, true) : "-"}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
                          {trxId}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
