"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  FileText,
  Search,
  Filter,
  AlertCircle,
  Eye,
  Upload,
  ExternalLink,
  Download,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTanggal, getNamaBulan } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { getCsrfToken, CSRF_HEADER_NAME } from "@/lib/csrf-client";

export default function BeasiswaPage() {
  const [user, setUser] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Ajukan Beasiswa (Siswa)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [jenisBeasiswa, setJenisBeasiswa] = useState<"PRESTASI" | "KURANG_MAMPU" | "LAINNYA">("PRESTASI");
  const [alasanPengajuan, setAlasanPengajuan] = useState("");
  const [dokumenText, setDokumenText] = useState("");
  const [lampiranFile, setLampiranFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Modal Review & Keputusan (Admin)
  const [selectedPengajuan, setSelectedPengajuan] = useState<any | null>(null);
  const [decisionAction, setDecisionAction] = useState<"DISETUJUI" | "DITOLAK">("DISETUJUI");
  const [jumlahBulan, setJumlahBulan] = useState(3);
  const [bulanMulai, setBulanMulai] = useState(new Date().getMonth() + 1);
  const [tahunMulai, setTahunMulai] = useState(new Date().getFullYear());
  const [catatanAdmin, setCatatanAdmin] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // Load User & Beasiswa Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const userRes = await fetch("/api/auth/me");
      const userJson = await userRes.json();
      if (userJson.authenticated) {
        setUser(userJson.user);
      }

      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      if (searchQuery) params.append("q", searchQuery);

      const res = await fetch(`/api/beasiswa?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setList(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Siswa: Kirim Pengajuan Beasiswa
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError(null);
    setSubmittingApply(true);

    try {
      const csrf = getCsrfToken();

      const formData = new FormData();
      formData.append("jenis", jenisBeasiswa);
      formData.append("alasan", alasanPengajuan);
      if (lampiranFile) {
        formData.append("lampiran", lampiranFile);
      }
      if (dokumenText) {
        formData.append("dokumen_text", dokumenText);
      }

      const headers: Record<string, string> = {};
      if (csrf) headers[CSRF_HEADER_NAME] = csrf;

      const res = await fetch("/api/beasiswa", {
        method: "POST",
        headers,
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setApplyError(json.error || "Gagal mengajukan beasiswa.");
        setSubmittingApply(false);
        return;
      }

      setIsApplyModalOpen(false);
      setAlasanPengajuan("");
      setDokumenText("");
      setLampiranFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadData();
    } catch {
      setApplyError("Terjadi gangguan koneksi ke server.");
    } finally {
      setSubmittingApply(false);
    }
  };

  // Siswa: Batalkan Pengajuan (hanya jika DIAJUKAN)
  const handleCancelPengajuan = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan pengajuan beasiswa ini?")) return;

    try {
      const csrf = getCsrfToken();
      const res = await fetch(`/api/beasiswa/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { [CSRF_HEADER_NAME]: csrf } : {}),
        },
        body: JSON.stringify({ action: "BATALKAN" }),
      });
      const json = await res.json();
      if (json.success) {
        loadData();
      } else {
        alert(json.error || "Gagal membatalkan pengajuan.");
      }
    } catch {
      alert("Terjadi kesalahan sistem.");
    }
  };

  // Admin: Putuskan Pengajuan (Setujui / Tolak)
  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPengajuan) return;

    setDecisionError(null);
    setSubmittingDecision(true);

    try {
      const payload: any = {
        status: decisionAction,
        catatan: catatanAdmin,
      };

      if (decisionAction === "DISETUJUI") {
        payload.jumlah_bulan = Number(jumlahBulan);
        payload.bulan_mulai = Number(bulanMulai);
        payload.tahun_mulai = Number(tahunMulai);
      }

      const csrf = getCsrfToken();
      const res = await fetch(`/api/beasiswa/${selectedPengajuan.id_pengajuan}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { [CSRF_HEADER_NAME]: csrf } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setDecisionError(json.error || "Gagal memproses keputusan.");
        setSubmittingDecision(false);
        return;
      }

      setSelectedPengajuan(null);
      setCatatanAdmin("");
      loadData();
    } catch {
      setDecisionError("Terjadi gangguan koneksi ke server.");
    } finally {
      setSubmittingDecision(false);
    }
  };

  const hasActiveApplication = list.some((item) => item.status === "DIAJUKAN");

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Top Header */}
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Pengajuan Beasiswa SPP</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {user?.role === "siswa"
              ? "Ajukan beasiswa pembebasan SPP dan pantau status pengajuan Anda."
              : "Kelola dan verifikasi permohonan beasiswa siswa sekolah."}
          </p>
        </div>

        {/* Siswa: Tombol Ajukan Beasiswa */}
        {user?.role === "siswa" && (
          <Button
            onClick={() => setIsApplyModalOpen(true)}
            disabled={hasActiveApplication}
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Beasiswa</span>
          </Button>
        )}
      </motion.div>

      {/* Info Notice jika siswa punya pengajuan aktif */}
      {user?.role === "siswa" && hasActiveApplication && (
        <motion.div
          variants={staggerItem}
          className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5"
        >
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Anda memiliki 1 pengajuan beasiswa aktif yang sedang menunggu keputusan admin. Anda dapat membatalkannya jika ingin mengubah data.
          </span>
        </motion.div>
      )}

      {/* Filter & Search Bar untuk Admin & Kepsek */}
      {user?.role !== "siswa" && (
        <motion.div variants={staggerItem} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama atau NIS siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs h-9"
              options={[
                { value: "ALL", label: "Semua Status" },
                { value: "DIAJUKAN", label: "Menunggu (DIAJUKAN)" },
                { value: "DISETUJUI", label: "Disetujui" },
                { value: "DITOLAK", label: "Ditolak" },
                { value: "DIBATALKAN", label: "Dibatalkan" },
              ]}
            />
          </div>
        </motion.div>
      )}

      {/* Tabel / List Pengajuan Beasiswa */}
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
              <GraduationCap className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700" />
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Belum ada pengajuan beasiswa
              </div>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {user?.role === "siswa"
                  ? "Anda belum pernah mengajukan beasiswa. Klik tombol 'Ajukan Beasiswa' di atas untuk memulai."
                  : "Tidak ada data pengajuan beasiswa yang cocok dengan kriteria filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tgl Pengajuan</th>
                    {user?.role !== "siswa" && <th className="px-4 py-3 font-medium">Siswa</th>}
                    <th className="px-4 py-3 font-medium">Jenis</th>
                    <th className="px-4 py-3 font-medium">Alasan / Keterangan</th>
                    <th className="px-4 py-3 font-medium">Berkas</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Keputusan</th>
                    <th className="px-4 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {list.map((item) => (
                    <tr key={item.id_pengajuan} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-mono text-zinc-500 whitespace-nowrap">
                        {formatTanggal(item.tanggal_pengajuan)}
                      </td>
                      {user?.role !== "siswa" && (
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.siswa?.nama}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            NIS: {item.siswa?.nis} · {item.siswa?.kelas?.nama_kelas || "-"}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 font-medium">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                          {item.jenis}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate" title={item.alasan}>
                        {item.alasan}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.lampiran ? (
                          <a
                            href={item.lampiran}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors"
                          >
                            <FileText className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                            <span>Lihat Berkas</span>
                          </a>
                        ) : (
                          <span className="text-zinc-400 text-[11px] italic">Tidak ada</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {item.status === "DISETUJUI" ? (
                          <div>
                            <span className="font-semibold text-sky-700 dark:text-sky-400">
                              {item.jumlah_bulan} Bulan
                            </span>
                            <div className="text-[11px]">
                              Mulai {getNamaBulan(item.bulan_mulai)} {item.tahun_mulai}
                            </div>
                          </div>
                        ) : item.status === "DITOLAK" ? (
                          <div className="text-rose-600 dark:text-rose-400 text-[11px] max-w-xs truncate" title={item.catatan_admin}>
                            Alasan: {item.catatan_admin || "-"}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {/* Siswa: Batalkan jika status DIAJUKAN */}
                        {user?.role === "siswa" && item.status === "DIAJUKAN" && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleCancelPengajuan(item.id_pengajuan)}
                            className="h-7 text-xs px-2.5"
                          >
                            Batalkan
                          </Button>
                        )}

                        {/* Admin: Buka Modal Keputusan jika status DIAJUKAN */}
                        {user?.role === "admin" && item.status === "DIAJUKAN" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedPengajuan(item);
                              setDecisionAction("DISETUJUI");
                              setCatatanAdmin("");
                            }}
                            className="h-7 text-xs px-2.5 gap-1.5"
                          >
                            <span>Putuskan</span>
                          </Button>
                        )}

                        {/* Detail View jika sudah final */}
                        {(item.status !== "DIAJUKAN" || user?.role === "kepala_sekolah") && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedPengajuan(item)}
                            className="h-7 text-xs px-2.5"
                          >
                            Detail
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>

      {/* MODAL: AJUKAN BEASISWA (SISWA) */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Form Pengajuan Beasiswa SPP"
        description="Isi alasan dan lampirkan dokumen pendukung persyaratan beasiswa sekolah."
      >
        <form onSubmit={handleApply} className="space-y-4">
          {applyError && (
            <div className="p-3 text-xs text-rose-800 bg-rose-50 rounded-lg border border-rose-200">
              {applyError}
            </div>
          )}

          <Select
            label="Kategori Beasiswa"
            value={jenisBeasiswa}
            onChange={(e: any) => setJenisBeasiswa(e.target.value)}
            options={[
              { value: "PRESTASI", label: "Beasiswa Prestasi (Akademik / Non-Akademik)" },
              { value: "KURANG_MAMPU", label: "Beasiswa Bantuan Ekonomi (SKTM / KIP)" },
              { value: "LAINNYA", label: "Kategori Lainnya / Khusus" },
            ]}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Alasan Pengajuan (minimal 10 karakter)
            </label>
            <textarea
              required
              rows={3}
              value={alasanPengajuan}
              onChange={(e) => setAlasanPengajuan(e.target.value)}
              placeholder="Jelaskan alasan atau kondisi yang mendasari permohonan beasiswa..."
              className="w-full p-3 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Dokumen Pendukung{" "}
              <span className="text-zinc-400 font-normal">(Opsional - PDF, JPG, PNG, DOCX)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Pilih file dokumen atau ketik tautan berkas..."
                value={dokumenText}
                onChange={(e) => {
                  setDokumenText(e.target.value);
                  if (!e.target.value && lampiranFile) {
                    setLampiranFile(null);
                  }
                }}
                className="flex-1 h-9 px-3 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setLampiranFile(file);
                  if (file) {
                    setDokumenText(file.name);
                  }
                }}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-3 gap-1.5 whitespace-nowrap text-xs shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih Berkas</span>
              </Button>
            </div>

            {lampiranFile && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium truncate">{lampiranFile.name}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">({(lampiranFile.size / 1024).toFixed(1)} KB)</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLampiranFile(null);
                    setDokumenText("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-rose-600 hover:text-rose-800 dark:hover:text-rose-400 ml-2 p-0.5"
                  title="Hapus file"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-[11px] text-zinc-500">
              Format: PDF, JPG, PNG, DOC, DOCX — maks. 5 MB. Bukti prestasi, SKTM, atau KIP.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsApplyModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" isLoading={submittingApply}>
              Kirim Pengajuan
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: KEPUTUSAN / DETAIL BEASISWA (ADMIN & DETAIL VIEW) */}
      <Modal
        isOpen={!!selectedPengajuan}
        onClose={() => setSelectedPengajuan(null)}
        title={
          selectedPengajuan?.status === "DIAJUKAN" && user?.role === "admin"
            ? "Keputusan Beasiswa Siswa"
            : "Detail Pengajuan Beasiswa"
        }
        description={`Siswa: ${selectedPengajuan?.siswa?.nama || "-"} (NIS: ${selectedPengajuan?.siswa?.nis || "-"})`}
      >
        <div className="space-y-4">
          {/* Detail Informasi */}
          <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-zinc-200/70 dark:border-zinc-800 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-500">Jenis Beasiswa:</span>
              <span className="font-semibold">{selectedPengajuan?.jenis}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Tanggal Pengajuan:</span>
              <span className="font-mono">{formatTanggal(selectedPengajuan?.tanggal_pengajuan)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Status Saat Ini:</span>
              <StatusBadge status={selectedPengajuan?.status} size="sm" />
            </div>
            <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
              <span className="text-zinc-500 block mb-1">Alasan Pengajuan:</span>
              <p className="text-zinc-800 dark:text-zinc-200 italic">{selectedPengajuan?.alasan}</p>
            </div>

            {/* Dokumen Pendukung / Berkas Pengajuan */}
            {selectedPengajuan?.lampiran ? (
              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
                <span className="text-zinc-500 block font-medium">Dokumen Pendukung / Berkas Pengajuan:</span>
                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span className="font-mono text-[11px] truncate text-zinc-800 dark:text-zinc-200" title={selectedPengajuan.lampiran}>
                        {selectedPengajuan.lampiran}
                      </span>
                    </div>
                    <a
                      href={selectedPengajuan.lampiran}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900 transition-colors shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Buka / Lihat Berkas</span>
                    </a>
                  </div>

                  {/* Preview jika gambar */}
                  {(selectedPengajuan.lampiran.toLowerCase().endsWith(".jpg") ||
                    selectedPengajuan.lampiran.toLowerCase().endsWith(".jpeg") ||
                    selectedPengajuan.lampiran.toLowerCase().endsWith(".png") ||
                    selectedPengajuan.lampiran.toLowerCase().endsWith(".webp")) && (
                    <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] text-zinc-400 mb-1">Pratinjau Gambar:</p>
                      <div className="relative max-h-56 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedPengajuan.lampiran}
                          alt="Lampiran Dokumen Beasiswa"
                          className="max-h-52 w-auto object-contain rounded"
                        />
                      </div>
                    </div>
                  )}

                  {/* Keterangan jika PDF */}
                  {selectedPengajuan.lampiran.toLowerCase().endsWith(".pdf") && (
                    <div className="text-[11px] text-zinc-500 bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Dokumen PDF tersedia. Klik tombol &quot;Buka / Lihat Berkas&quot; di atas untuk memeriksa isi dokumen lengkap di tab baru.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 text-zinc-400 italic">
                Tidak ada dokumen pendukung yang dilampirkan.
              </div>
            )}
          </div>

          {/* Form Keputusan Admin (Hanya jika status DIAJUKAN dan role Admin) */}
          {user?.role === "admin" && selectedPengajuan?.status === "DIAJUKAN" ? (
            <form onSubmit={handleDecision} className="space-y-4 pt-2">
              {decisionError && (
                <div className="p-3 text-xs text-rose-800 bg-rose-50 rounded-lg border border-rose-200">
                  {decisionError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Tindakan Keputusan Admin:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecisionAction("DISETUJUI")}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                      decisionAction === "DISETUJUI"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    Setujui Beasiswa
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecisionAction("DITOLAK")}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                      decisionAction === "DITOLAK"
                        ? "bg-rose-50 border-rose-500 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    Tolak Pengajuan
                  </button>
                </div>
              </div>

              {decisionAction === "DISETUJUI" ? (
                <div className="space-y-3 p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 rounded-xl">
                  <div className="text-[11px] text-emerald-900 dark:text-emerald-300 font-medium">
                    Aturan: Hanya tagihan BELUM BAYAR yang belum jatuh tempo yang akan dibebaskan (status BEASISWA).
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      label="Jumlah Bulan"
                      type="number"
                      min={1}
                      max={12}
                      value={jumlahBulan}
                      onChange={(e) => setJumlahBulan(Number(e.target.value))}
                      required
                    />
                    <Select
                      label="Bulan Mulai"
                      value={bulanMulai}
                      onChange={(e) => setBulanMulai(Number(e.target.value))}
                      options={Array.from({ length: 12 }, (_, i) => ({
                        value: i + 1,
                        label: getNamaBulan(i + 1),
                      }))}
                    />
                    <Input
                      label="Tahun Mulai"
                      type="number"
                      value={tahunMulai}
                      onChange={(e) => setTahunMulai(Number(e.target.value))}
                      required
                    />
                  </div>

                  <Input
                    label="Catatan Persetujuan (Opsional)"
                    placeholder="Contoh: Lolos seleksi beasiswa prestasi semester 1"
                    value={catatanAdmin}
                    onChange={(e) => setCatatanAdmin(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-2 p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 rounded-xl">
                  <label className="block text-xs font-medium text-rose-900 dark:text-rose-300">
                    Alasan Penolakan (Wajib diisi):
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={catatanAdmin}
                    onChange={(e) => setCatatanAdmin(e.target.value)}
                    placeholder="Sebutkan alasan penolakan secara jelas..."
                    className="w-full p-2.5 text-xs bg-white dark:bg-zinc-900 border border-rose-300 rounded-lg focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedPengajuan(null)}
                >
                  Tutup
                </Button>
                <Button type="submit" isLoading={submittingDecision}>
                  Simpan Keputusan Final
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="secondary" onClick={() => setSelectedPengajuan(null)}>
                Tutup
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </motion.div>
  );
}
