"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FilePlus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  Send,
  GraduationCap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { formatRupiah, getNamaBulan } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { getCsrfToken, CSRF_HEADER_NAME } from "@/lib/csrf-client";

export default function GenerateTagihanPage() {
  const router = useRouter();

  const [tahunAjaranList, setTahunAjaranList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);

  const [selectedTa, setSelectedTa] = useState<number>(0);
  const [selectedBulan, setSelectedBulan] = useState<number>(new Date().getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState<number>(new Date().getFullYear());
  const [selectedKelas, setSelectedKelas] = useState<string>("ALL");

  const [previewData, setPreviewData] = useState<any | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Muat master TA & Kelas
    const loadMaster = async () => {
      try {
        const [taRes, kRes] = await Promise.all([
          fetch("/api/master/tahun-ajaran"),
          fetch("/api/master/kelas"),
        ]);
        const taJson = await taRes.json();
        const kJson = await kRes.json();

        if (taJson.success && taJson.data.length > 0) {
          setTahunAjaranList(taJson.data);
          setSelectedTa(taJson.data[0].id_tahun_ajaran);
        }
        if (kJson.success) {
          setKelasList(kJson.data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadMaster();
  }, []);

  // Request Preview
  const handlePreview = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoadingPreview(true);
    setPreviewData(null);

    try {
      const csrfToken = getCsrfToken();
      const res = await fetch("/api/tagihan/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
        },
        body: JSON.stringify({
          action: "PREVIEW",
          id_tahun_ajaran: Number(selectedTa),
          bulan: Number(selectedBulan),
          tahun: Number(selectedTahun),
          id_kelas: selectedKelas === "ALL" ? null : Number(selectedKelas),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || "Gagal memuat pratinjau tagihan.");
        setIsLoadingPreview(false);
        return;
      }

      setPreviewData(json.data);
    } catch {
      setErrorMsg("Terjadi gangguan koneksi ke server.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Eksekusi Generate
  const handleExecute = async () => {
    if (!previewData) return;
    if (!confirm(`Konfirmasi generate tagihan untuk periode ${getNamaBulan(selectedBulan)} ${selectedTahun}?`)) return;

    setErrorMsg(null);
    setIsExecuting(true);

    try {
      const csrfToken = getCsrfToken();
      const res = await fetch("/api/tagihan/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
        },
        body: JSON.stringify({
          action: "EXECUTE",
          id_tahun_ajaran: Number(selectedTa),
          bulan: Number(selectedBulan),
          tahun: Number(selectedTahun),
          id_kelas: selectedKelas === "ALL" ? null : Number(selectedKelas),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || "Gagal mengeksekusi generate tagihan.");
        setIsExecuting(false);
        return;
      }

      setSuccessMsg(json.message);
      setPreviewData(null);
    } catch {
      setErrorMsg("Terjadi gangguan koneksi ke server.");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={staggerItem} className="flex items-center gap-3">
        <Link
          href="/tagihan"
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 text-zinc-600 dark:text-zinc-400"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Generate Tagihan SPP Bulanan</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Membentuk tagihan SPP massal untuk siswa aktif dengan proteksi anti-duplikasi dan alokasi status beasiswa otomatis.
          </p>
        </div>
      </motion.div>

      {errorMsg && (
        <div className="p-3.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <Link href="/tagihan">
            <Button size="sm">Lihat Daftar Tagihan</Button>
          </Link>
        </div>
      )}

      {/* Form Kriteria Generate */}
      <motion.div variants={staggerItem}>
        <Card className="p-6 space-y-5">
          <h3 className="text-sm font-semibold tracking-tight">Pilih Periode & Lingkup Siswa</h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Select
              label="Tahun Ajaran"
              value={selectedTa}
              onChange={(e) => setSelectedTa(Number(e.target.value))}
              options={tahunAjaranList.map((ta) => ({
                value: ta.id_tahun_ajaran,
                label: `${ta.tahun_ajaran} (${ta.status})`,
              }))}
            />

            <Select
              label="Bulan Tagihan"
              value={selectedBulan}
              onChange={(e) => setSelectedBulan(Number(e.target.value))}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: i + 1,
                label: getNamaBulan(i + 1),
              }))}
            />

            <Select
              label="Tahun Kalender"
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(Number(e.target.value))}
              options={[
                { value: "2026", label: "2026" },
                { value: "2027", label: "2027" },
              ]}
            />

            <Select
              label="Kelas (Opsional)"
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              options={[
                { value: "ALL", label: "Semua Kelas" },
                ...kelasList.map((k) => ({
                  value: k.id_kelas,
                  label: k.nama_kelas,
                })),
              ]}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handlePreview} isLoading={isLoadingPreview} className="gap-2">
              <Eye className="w-4 h-4" />
              <span>Pratinjau (Preview) Pembentukan</span>
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Preview Result Summary & Table */}
      {previewData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1">
              <div className="text-[11px] text-zinc-500">TOTAL SISWA LINGKUP</div>
              <div className="text-xl font-bold">{previewData.totalSiswa}</div>
            </Card>

            <Card className="p-4 space-y-1 border-slate-200">
              <div className="text-[11px] text-slate-600 font-medium">AKAN DIBUAT (BELUM BAYAR)</div>
              <div className="text-xl font-bold text-slate-900">{previewData.akanDibuatBelumBayar}</div>
            </Card>

            <Card className="p-4 space-y-1 border-sky-200 bg-sky-50/30">
              <div className="text-[11px] text-sky-700 font-medium">AKAN DIBUAT (BEASISWA)</div>
              <div className="text-xl font-bold text-sky-900">{previewData.akanDibuatBeasiswa}</div>
            </Card>

            <Card className="p-4 space-y-1 border-zinc-200 bg-zinc-50/50">
              <div className="text-[11px] text-zinc-500">SUDAH MEMILIKI TAGIHAN</div>
              <div className="text-xl font-bold text-zinc-500">{previewData.sudahAda}</div>
            </Card>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              Tarif per siswa:{" "}
              <span className="font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                {formatRupiah(previewData.tarif)}
              </span>
              . Siswa dengan status BEASISWA otomatis dibebaskan.
            </div>

            <Button
              onClick={handleExecute}
              isLoading={isExecuting}
              disabled={previewData.akanDibuatBelumBayar + previewData.akanDibuatBeasiswa === 0}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              <span>
                Eksekusi Generate ({previewData.akanDibuatBelumBayar + previewData.akanDibuatBeasiswa} Siswa)
              </span>
            </Button>
          </div>

          {/* Student List in Preview */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nama Siswa</th>
                    <th className="px-4 py-3 font-medium">NIS</th>
                    <th className="px-4 py-3 font-medium">Kelas</th>
                    <th className="px-4 py-3 font-medium">Nominal</th>
                    <th className="px-4 py-3 font-medium">Status Hasil Generate</th>
                    <th className="px-4 py-3 font-medium">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {previewData.items.map((item: any) => (
                    <tr key={item.id_siswa} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.nama}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-500">{item.nis}</td>
                      <td className="px-4 py-3">{item.kelas}</td>
                      <td className="px-4 py-3 font-mono font-medium">{formatRupiah(item.nominal)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-[11px]">
                        {item.alasanStatus || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
