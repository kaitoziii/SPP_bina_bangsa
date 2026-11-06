"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  CreditCard,
  FileDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah, formatTanggal, getNamaBulan } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";

export default function TagihanPage() {
  const [user, setUser] = useState<any>(null);
  const [tagihan, setTagihan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [status, setStatus] = useState("ALL");
  const [bulan, setBulan] = useState("ALL");
  const [tahun, setTahun] = useState("2026");
  const [searchQuery, setSearchQuery] = useState("");

  const loadTagihan = useCallback(async () => {
    try {
      setLoading(true);
      const userRes = await fetch("/api/auth/me");
      const userJson = await userRes.json();
      if (userJson.authenticated) {
        setUser(userJson.user);
      }

      const params = new URLSearchParams();
      if (status !== "ALL") params.append("status", status);
      if (bulan !== "ALL") params.append("bulan", bulan);
      if (tahun !== "ALL") params.append("tahun", tahun);
      if (searchQuery) params.append("q", searchQuery);

      const res = await fetch(`/api/tagihan?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTagihan(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [status, bulan, tahun, searchQuery]);

  useEffect(() => {
    loadTagihan();
  }, [loadTagihan]);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Tagihan & Tunggakan SPP</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {user?.role === "siswa"
              ? "Daftar seluruh tagihan SPP dan status pembayaran Virtual Account Anda."
              : "Monitoring tagihan SPP seluruh siswa, status pelunasan, tunggakan, dan beasiswa."}
          </p>
        </div>

        {user?.role === "admin" && (
          <Link href="/tagihan/generate">
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              <span>Generate Tagihan Baru</span>
            </Button>
          </Link>
        )}
      </motion.div>

      {/* Filter Bar */}
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row items-center gap-3">
        {user?.role !== "siswa" && (
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama, NIS, atau NISN siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs h-9"
            options={[
              { value: "ALL", label: "Semua Status" },
              { value: "BELUM BAYAR", label: "Belum Bayar" },
              { value: "LUNAS", label: "Lunas" },
              { value: "TUNGGAKAN", label: "Tunggakan" },
              { value: "BEASISWA", label: "Beasiswa" },
            ]}
          />

          <Select
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="text-xs h-9"
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
            className="text-xs h-9"
            options={[
              { value: "ALL", label: "Semua Tahun" },
              { value: "2026", label: "2026" },
              { value: "2027", label: "2027" },
            ]}
          />
        </div>
      </motion.div>

      {/* Table Tagihan */}
      <motion.div variants={staggerItem}>
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : tagihan.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Receipt className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700" />
              <div className="text-sm font-semibold">Tidak ada tagihan yang ditemukan</div>
              <p className="text-xs text-zinc-500">
                Ubah filter status, periode bulan, atau kata kunci pencarian.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Periode</th>
                    {user?.role !== "siswa" && <th className="px-4 py-3 font-medium">Siswa</th>}
                    <th className="px-4 py-3 font-medium">Virtual Account</th>
                    <th className="px-4 py-3 font-medium">Nominal</th>
                    <th className="px-4 py-3 font-medium">Jatuh Tempo</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Tanggal Bayar</th>
                    {user?.role === "siswa" && <th className="px-4 py-3 font-medium text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {tagihan.map((t) => {
                    const pembayaran = t.pembayaran?.[0];
                    const isUnpaid = t.status === "BELUM BAYAR" || t.status === "TUNGGAKAN";

                    return (
                      <tr key={t.id_tagihan} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                        <td className="px-4 py-3 font-medium">
                          {getNamaBulan(t.bulan)} {t.tahun}
                        </td>
                        {user?.role !== "siswa" && (
                          <td className="px-4 py-3">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {t.siswa?.nama}
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono">
                              NIS: {t.siswa?.nis} · {t.siswa?.kelas?.nama_kelas || "-"}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                          {t.siswa?.virtual_account?.nomor_va || "-"}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold">
                          {formatRupiah(t.nominal)}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                          {formatTanggal(t.tanggal_jatuh_tempo)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={t.status} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                          {pembayaran ? formatTanggal(pembayaran.tanggal_pembayaran, true) : "-"}
                        </td>
                        {user?.role === "siswa" && (
                          <td className="px-4 py-3 text-right">
                            {isUnpaid ? (
                              <Link href="/pg-simulator">
                                <Button size="sm" className="h-7 text-xs px-2.5 gap-1.5">
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Bayar</span>
                                </Button>
                              </Link>
                            ) : (
                              <span className="text-zinc-400 text-xs">-</span>
                            )}
                          </td>
                        )}
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
