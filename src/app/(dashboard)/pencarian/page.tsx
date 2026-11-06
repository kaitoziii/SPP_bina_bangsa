"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, User, CreditCard, Receipt, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatRupiah, formatTanggal, getNamaBulan } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";

export default function PencarianPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [matchedBy, setMatchedBy] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setMatchedBy(null);

    try {
      const res = await fetch(`/api/pencarian?q=${encodeURIComponent(query.trim())}`);
      const json = await res.json();
      if (json.success) {
        setResults(json.data);
        if (json.matchedBy) setMatchedBy(json.matchedBy);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={staggerItem} className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">Pencarian Cepat Siswa & Pembayaran</h1>
        <p className="text-xs text-zinc-500">
          Cari berdasarkan NIS, NISN, nama lengkap siswa, nomor Virtual Account, atau Transaction ID PG.
        </p>
      </motion.div>

      {/* Search Input Bar */}
      <motion.div variants={staggerItem}>
        <Card className="p-4 sm:p-5">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                placeholder="Masukkan NIS (12345), VA (8800012345), Nama, atau TRX ID..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <Button type="submit" isLoading={isSearching} className="h-10 px-5">
              Cari
            </Button>
          </form>
        </Card>
      </motion.div>

      {matchedBy === "TRANSACTION_ID" && (
        <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-mono text-zinc-700 dark:text-zinc-300">
          Ditemukan kecocokan langsung via Transaction ID: <span className="font-bold">{query}</span>
        </div>
      )}

      {/* Search Results */}
      {hasSearched && (
        <motion.div variants={staggerItem} className="space-y-4">
          {results.length === 0 ? (
            <Card className="p-12 text-center space-y-2">
              <Search className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700" />
              <div className="text-sm font-semibold">Tidak ada hasil yang cocok</div>
              <p className="text-xs text-zinc-500">
                Pastikan NIS, nomor VA, nama siswa, atau Transaction ID yang dimasukkan sudah benar.
              </p>
            </Card>
          ) : (
            results.map((siswa) => (
              <Card key={siswa.id_siswa} className="p-5 sm:p-6 space-y-5">
                {/* Siswa Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-0.5">
                    <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {siswa.nama}
                    </div>
                    <div className="text-xs text-zinc-500 font-mono">
                      NIS: {siswa.nis} · NISN: {siswa.nisn} · Kelas: {siswa.kelas?.nama_kelas || "-"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Virtual Account:</span>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
                      {siswa.virtual_account?.nomor_va || "-"}
                    </span>
                  </div>
                </div>

                {/* Status Pembayaran Per Bulan */}
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                    Status Tagihan Per Bulan (Tahun Ajaran Aktif):
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {siswa.tagihan_spp?.map((t: any) => {
                      const tglBayar = t.pembayaran?.[0]?.tanggal_pembayaran;

                      return (
                        <div
                          key={t.id_tagihan}
                          className="p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold">
                              {getNamaBulan(t.bulan)} {t.tahun}
                            </span>
                            <StatusBadge status={t.status} size="sm" />
                          </div>
                          <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                            {formatRupiah(t.nominal)}
                          </div>
                          {tglBayar && (
                            <div className="text-[10px] text-zinc-400 truncate">
                              Bayar: {formatTanggal(tglBayar)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
