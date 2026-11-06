"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  CreditCard,
  ArrowRight,
  TrendingUp,
  Receipt,
  Copy,
  Check,
  Search,
  UserCog,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah, formatTanggal, getNamaBulan } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedVa, setCopiedVa] = useState(false);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const role = data.role;
  const d = data.data;

  // ==========================================
  // VIEW: SISWA
  // ==========================================
  if (role === "siswa") {
    const profil = d.profil;
    const tagihanBulanIni = d.tagihanBulanIni;
    const totalTunggakan = d.totalTunggakan;

    const copyVa = () => {
      if (profil.nomor_va) {
        navigator.clipboard.writeText(profil.nomor_va);
        setCopiedVa(true);
        setTimeout(() => setCopiedVa(false), 2000);
      }
    };

    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Welcome Header */}
        <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">Halo, {profil.nama}</h1>
            <p className="text-xs text-zinc-500">
              Kelas {profil.kelas} · NIS {profil.nis} · Virtual Account Pembayaran SPP
            </p>
          </div>
          <Link
            href="/profil"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors self-start sm:self-auto"
          >
            <UserCog className="w-3.5 h-3.5" />
            <span>Pengaturan Akun</span>
          </Link>
        </motion.div>

        {/* VA Card & Current Month Bill */}
        <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Virtual Account Card */}
          <Card className="p-6 bg-zinc-900 text-white border-zinc-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400">VIRTUAL ACCOUNT SAYA</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-yellow-400 font-semibold">
                BANK MOCK SANDBOX
              </span>
            </div>
            <div>
              <div className="text-xs text-zinc-400">Nomor Virtual Account:</div>
              <div className="text-2xl font-mono font-bold tracking-wider text-white mt-1 flex items-center gap-3">
                <span>{profil.nomor_va}</span>
                <button
                  onClick={copyVa}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  title="Salin Nomor VA"
                >
                  {copiedVa ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-[11px] text-zinc-500 mt-1 font-mono">
                5 digit terakhir ({profil.nomor_va?.slice(-5)}) identik dengan NIS Anda.
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs">
              <span className="text-zinc-400">Status VA:</span>
              <span className="text-emerald-400 font-medium">Aktif untuk Pembayaran</span>
            </div>
          </Card>

          {/* Current Month Bill Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">TAGIHAN BULAN INI</span>
              {tagihanBulanIni && <StatusBadge status={tagihanBulanIni.status} />}
            </div>

            {tagihanBulanIni ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="text-xl font-bold tracking-tight">
                    {getNamaBulan(tagihanBulanIni.bulan)} {tagihanBulanIni.tahun}
                  </div>
                  <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {formatRupiah(tagihanBulanIni.nominal)}
                  </div>
                </div>
                <div className="text-xs text-zinc-500">
                  Jatuh tempo: {formatTanggal(tagihanBulanIni.tanggal_jatuh_tempo)}
                </div>

                {tagihanBulanIni.status === "BELUM BAYAR" || tagihanBulanIni.status === "TUNGGAKAN" ? (
                  <div className="pt-2">
                    <Link href="/pg-simulator">
                      <Button className="w-full gap-2">
                        <CreditCard className="w-4 h-4" />
                        <span>Simulasi Bayar via Virtual Account</span>
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Tagihan bulan ini telah selesai ({tagihanBulanIni.status}).</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-zinc-500">
                Belum ada tagihan untuk bulan berjalan.
              </div>
            )}
          </Card>
        </motion.div>

        {/* Tunggakan Alert Card if any */}
        {totalTunggakan?.nominal > 0 && (
          <motion.div
            variants={staggerItem}
            className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 dark:bg-rose-950/30 dark:border-rose-900 text-rose-900 dark:text-rose-200 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <div className="text-sm font-semibold">
                  Terdapat Tunggakan SPP ({totalTunggakan.jumlah_bulan} Bulan)
                </div>
                <div className="text-xs opacity-90">
                  Total tunggakan: {formatRupiah(totalTunggakan.nominal)}. Bayar melalui VA untuk otomatis melunasi tagihan tertua.
                </div>
              </div>
            </div>
            <Link href="/pg-simulator">
              <Button size="sm" variant="danger">
                Lunasi Tunggakan
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Daftar Riwayat Tagihan Siswa */}
        <motion.div variants={staggerItem} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">Daftar Tagihan SPP</h3>
            <Link
              href="/tagihan"
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Lihat Semua
            </Link>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Periode</th>
                    <th className="px-4 py-3 font-medium">Jatuh Tempo</th>
                    <th className="px-4 py-3 font-medium">Nominal</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Tanggal Bayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {d.daftarTagihan?.map((t: any) => {
                    const pembayaran = t.pembayaran?.[0];
                    return (
                      <tr key={t.id_tagihan} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                        <td className="px-4 py-3 font-medium">
                          {getNamaBulan(t.bulan)} {t.tahun}
                        </td>
                        <td className="px-4 py-3 text-zinc-500">
                          {formatTanggal(t.tanggal_jatuh_tempo)}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium">
                          {formatRupiah(t.nominal)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={t.status} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-zinc-500">
                          {pembayaran ? formatTanggal(pembayaran.tanggal_pembayaran, true) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  // ==========================================
  // VIEW: TELLER
  // ==========================================
  if (role === "teller") {
    return (
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        <motion.div variants={staggerItem} className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Dashboard Teller</h1>
          <p className="text-xs text-zinc-500">
            Monitoring transaksi harian dan verifikasi status pembayaran siswa.
          </p>
        </motion.div>

        {/* Metric Cards */}
        <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-5 space-y-2">
            <div className="text-xs font-medium text-zinc-500">TRANSAKSI HARI INI</div>
            <div className="text-2xl font-bold">
              <AnimatedNumber value={d.transaksiHariIniCount} />
              <span className="text-xs font-normal text-zinc-500 ml-1.5">transaksi</span>
            </div>
          </Card>

          <Card className="p-5 space-y-2">
            <div className="text-xs font-medium text-zinc-500">NOMINAL HARI INI</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              <AnimatedNumber value={d.nominalHariIni} formatAsRupiah />
            </div>
          </Card>
        </motion.div>

        {/* Quick Search Action */}
        <motion.div variants={staggerItem}>
          <Card className="p-5 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Pencarian Siswa & Virtual Account</h4>
              <p className="text-xs text-zinc-500 mt-0.5">
                Cari tagihan siswa via NIS, NISN, nama, nomor VA, atau Transaction ID.
              </p>
            </div>
            <Link href="/pencarian">
              <Button size="sm" className="gap-2">
                <Search className="w-3.5 h-3.5" />
                <span>Buka Pencarian</span>
              </Button>
            </Link>
          </Card>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div variants={staggerItem} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">Transaksi PG Terbaru</h3>
            <Link
              href="/transaksi"
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Lihat Semua
            </Link>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Transaction ID</th>
                    <th className="px-4 py-3 font-medium">Nama Siswa</th>
                    <th className="px-4 py-3 font-medium">Virtual Account</th>
                    <th className="px-4 py-3 font-medium">Nominal</th>
                    <th className="px-4 py-3 font-medium">Waktu</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {d.transaksiTerbaru?.map((t: any) => (
                    <tr key={t.id_transaksi} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-mono font-medium">{t.transaction_id}</td>
                      <td className="px-4 py-3">{t.siswa?.nama || "-"}</td>
                      <td className="px-4 py-3 font-mono text-zinc-500">{t.virtual_account}</td>
                      <td className="px-4 py-3 font-mono font-semibold">{formatRupiah(t.nominal)}</td>
                      <td className="px-4 py-3 text-zinc-500">{formatTanggal(t.tanggal_transaksi, true)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status_transaksi} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  // ==========================================
  // VIEW: ADMIN & KEPALA SEKOLAH
  // ==========================================
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={staggerItem} className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">
          {role === "admin" ? "Dashboard Administrator" : "Dashboard Kepala Sekolah"}
        </h1>
        <p className="text-xs text-zinc-500">
          Ringkasan penerimaan SPP, status tunggakan, beasiswa, dan aktivitas pembayaran.
        </p>
      </motion.div>

      {/* Notification Banner for Pending Scholarships */}
      {d.beasiswaPendingCount > 0 && (
        <motion.div
          variants={staggerItem}
          className="p-4 rounded-xl border border-sky-200 bg-sky-50/70 dark:bg-sky-950/30 dark:border-sky-900 text-sky-900 dark:text-sky-200 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-sky-600 shrink-0" />
            <div>
              <div className="text-sm font-semibold">
                {d.beasiswaPendingCount} Pengajuan Beasiswa Menunggu Review
              </div>
              <div className="text-xs opacity-90">
                Siswa telah mengajukan permohonan beasiswa yang memerlukan keputusan admin.
              </div>
            </div>
          </div>
          <Link href="/beasiswa">
            <Button size="sm">Review Beasiswa</Button>
          </Link>
        </motion.div>
      )}

      {/* Metric Cards Grid */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Siswa Aktif */}
        <Card className="p-5 space-y-2">
          <div className="text-xs font-medium text-zinc-500">TOTAL SISWA AKTIF</div>
          <div className="text-2xl font-bold">
            <AnimatedNumber value={d.totalSiswa} />
            <span className="text-xs font-normal text-zinc-500 ml-1.5">siswa</span>
          </div>
        </Card>

        {/* Total Penerimaan SPP */}
        <Card className="p-5 space-y-2 border-emerald-100 dark:border-emerald-950/60">
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            TOTAL PENERIMAAN (LUNAS)
          </div>
          <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">
            <AnimatedNumber value={d.totalPembayaran} formatAsRupiah />
          </div>
        </Card>

        {/* Total Tunggakan */}
        <Card className="p-5 space-y-2 border-rose-100 dark:border-rose-950/60">
          <div className="text-xs font-medium text-rose-700 dark:text-rose-400">
            TOTAL TUNGGAKAN
          </div>
          <div className="text-2xl font-bold text-rose-900 dark:text-rose-300">
            <AnimatedNumber value={d.totalTunggakan} formatAsRupiah />
          </div>
        </Card>

        {/* Beasiswa Diberikan */}
        <Card className="p-5 space-y-2 border-sky-100 dark:border-sky-950/60">
          <div className="text-xs font-medium text-sky-700 dark:text-sky-400">
            BEASISWA DIBEBASKAN
          </div>
          <div className="text-2xl font-bold text-sky-900 dark:text-sky-300">
            <AnimatedNumber value={d.totalBeasiswa} formatAsRupiah />
          </div>
        </Card>
      </motion.div>

      {/* Monthly Chart Bar */}
      <motion.div variants={staggerItem}>
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">
                Tren Pembayaran, Tunggakan & Beasiswa Bulanan
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Perbandingan nominal penerimaan SPP vs tunggakan vs beasiswa per bulan.
              </p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.monthlyStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `Rp${(val / 1000).toLocaleString("id-ID")}k`}
                />
                <Tooltip
                  formatter={(val: any) => [formatRupiah(Number(val)), ""]}
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                    border: "none",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Bar dataKey="pembayaran" name="Penerimaan Lunas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tunggakan" name="Tunggakan" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="beasiswa" name="Beasiswa" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Recent Transactions Table */}
      <motion.div variants={staggerItem} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight">Transaksi PG Terbaru</h3>
          <Link
            href="/transaksi"
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Lihat Semua Transaksi
          </Link>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Transaction ID</th>
                  <th className="px-4 py-3 font-medium">Nama Siswa</th>
                  <th className="px-4 py-3 font-medium">Virtual Account</th>
                  <th className="px-4 py-3 font-medium">Nominal</th>
                  <th className="px-4 py-3 font-medium">Waktu Transaksi</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {d.transaksiTerbaru?.map((t: any) => (
                  <tr key={t.id_transaksi} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-mono font-medium">{t.transaction_id}</td>
                    <td className="px-4 py-3">{t.siswa?.nama || "-"}</td>
                    <td className="px-4 py-3 font-mono text-zinc-500">{t.virtual_account}</td>
                    <td className="px-4 py-3 font-mono font-semibold">{formatRupiah(t.nominal)}</td>
                    <td className="px-4 py-3 text-zinc-500">{formatTanggal(t.tanggal_transaksi, true)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status_transaksi} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
