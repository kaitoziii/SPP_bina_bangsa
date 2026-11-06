"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Repeat,
  RotateCcw,
  Send,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatRupiah, formatTanggal, getNamaBulan } from "@/lib/format";
import { transitionSmooth } from "@/lib/motion";

interface SiswaOption {
  id_siswa: number;
  nis: string;
  nama: string;
  virtual_account: { nomor_va: string } | null;
  kelas: { nama_kelas: string } | null;
  tagihan_spp: {
    id_tagihan: number;
    bulan: number;
    tahun: number;
    nominal: number;
    status: string;
  }[];
}

const STEPS = [
  { id: 1, title: "Generate Payment" },
  { id: 2, title: "Payment Gateway" },
  { id: 3, title: "Virtual Account" },
  { id: 4, title: "Simulasi Bayar" },
  { id: 5, title: "Hasil Callback" },
];

export default function SimulatorPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [siswaList, setSiswaList] = useState<SiswaOption[]>([]);
  const [selectedSiswaId, setSelectedSiswaId] = useState<number | null>(null);
  const [loadingSiswa, setLoadingSiswa] = useState(true);
  const [currentUser, setCurrentUser] = useState<{
    id_user: number;
    nama: string;
    username: string;
    role: string;
    id_siswa?: number | null;
    nis?: string | null;
    nomor_va?: string | null;
  } | null>(null);

  // Form simulator values
  const [trxId, setTrxId] = useState("");
  const [amount, setAmount] = useState<number>(350000);
  const [statusTrx, setStatusTrx] = useState<"PAID" | "FAILED">("PAID");
  const [tamperSig, setTamperSig] = useState(false);

  // Hasil eksekusi callback
  const [isExecuting, setIsExecuting] = useState(false);
  const [resultData, setResultData] = useState<{
    signature_sent: string;
    payload_sent: string;
    response_status: number;
    response_body: {
      success: boolean;
      message: string;
      data?: any;
    };
  } | null>(null);

  const [copied, setCopied] = useState(false);

  // Muat data siswa untuk dipilih
  const loadSiswa = useCallback(async () => {
    try {
      setLoadingSiswa(true);
      const [meRes, siswaRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/master/siswa"),
      ]);

      let loggedInUser: any = null;
      if (meRes.ok) {
        const meJson = await meRes.json();
        if (meJson.authenticated && meJson.user) {
          loggedInUser = meJson.user;
          setCurrentUser(loggedInUser);
        }
      }

      if (siswaRes.ok) {
        const json = await siswaRes.json();
        if (json.success && json.data.length > 0) {
          const list: SiswaOption[] = json.data;

          // Jika yang login adalah siswa, HANYA muat data akun siswa miliknya sendiri (data orang lain tidak diperlihatkan)
          if (loggedInUser && loggedInUser.role === "siswa") {
            const mySiswa = list.find(
              (s) =>
                s.id_siswa === loggedInUser.id_siswa ||
                s.nis === loggedInUser.nis ||
                s.virtual_account?.nomor_va === loggedInUser.nomor_va
            );

            if (mySiswa) {
              setSiswaList([mySiswa]);
              setSelectedSiswaId(mySiswa.id_siswa);
            } else if (list.length > 0) {
              setSiswaList([list[0]]);
              setSelectedSiswaId(list[0].id_siswa);
            } else {
              setSiswaList([]);
              setSelectedSiswaId(null);
            }
            return;
          }

          setSiswaList(list);

          // Jika siswa sudah dipilih sebelumnya dan masih ada di list, pertahankan
          if (selectedSiswaId && list.some((s) => s.id_siswa === selectedSiswaId)) {
            return;
          }

          // Default jika bukan akun siswa: pilih Ahmad Fauzan (NIS 12345) atau siswa pertama
          const ahmad = list.find((s: SiswaOption) => s.nis === "12345");
          if (ahmad) {
            setSelectedSiswaId(ahmad.id_siswa);
          } else {
            setSelectedSiswaId(list[0].id_siswa);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSiswa(false);
    }
  }, [selectedSiswaId]);

  useEffect(() => {
    loadSiswa();
  }, [loadSiswa]);

  // Update transaction ID acak baru setiap step 1
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(100 + Math.random() * 900);
    setTrxId(`TRX-${today}-${random}`);
  }, [selectedSiswaId]);

  const selectedSiswa = siswaList.find((s) => s.id_siswa === selectedSiswaId);
  const nomorVa = selectedSiswa?.virtual_account?.nomor_va || "8800012345";

  // Sinkronkan nominal default dengan tagihan siswa yang dipilih jika ada
  useEffect(() => {
    if (selectedSiswa?.tagihan_spp) {
      const unpaid = selectedSiswa.tagihan_spp.find(
        (t) => t.status === "BELUM BAYAR" || t.status === "TUNGGAKAN"
      );
      if (unpaid) {
        setAmount(unpaid.nominal);
      }
    }
  }, [selectedSiswaId, selectedSiswa]);

  // Eksekusi callback
  const handleKirimCallback = async (override?: {
    tamper?: boolean;
    customAmount?: number;
    customTrxId?: string;
  }) => {
    setIsExecuting(true);
    setResultData(null);

    const now = new Date();
    const paidAt = `${now.toISOString().slice(0, 10)} ${now.toTimeString().split(" ")[0]}`;

    const useAmount = override?.customAmount ?? amount;
    const useTrxId = override?.customTrxId ?? trxId;
    const useTamper = override?.tamper ?? tamperSig;

    const payload = {
      virtual_account: nomorVa,
      amount: useAmount,
      transaction_id: useTrxId,
      status: statusTrx,
      paid_at: paidAt,
      payment_channel: "VIRTUAL_ACCOUNT",
    };

    try {
      const res = await fetch("/api/simulator/send-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          tamperSignature: useTamper,
        }),
      });
      const data = await res.json();
      setResultData(data);
      setCurrentStep(5);
      // Reload data siswa agar status tagihan ter-update
      loadSiswa();
    } catch (e) {
      console.error(e);
    } finally {
      setIsExecuting(false);
    }
  };

  const copyPayload = () => {
    if (resultData?.payload_sent) {
      navigator.clipboard.writeText(resultData.payload_sent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-black text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Bar Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Dashboard Sekolah</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Mock PG Sandbox v2.0</span>
          </div>
        </div>

        {/* Header */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Payment Gateway Simulator
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl">
            Simulasi alur pembayaran Virtual Account end-to-end. Mengirim HTTP POST webhook ke{" "}
            <code className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
              /api/payment/callback
            </code>{" "}
            dengan header <code className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">X-Signature</code> (HMAC-SHA256).
          </p>
        </div>

        {/* Stepper Progress Calm Bar */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-5 gap-2 text-center">
            {STEPS.map((step) => {
              const isPast = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className="flex items-center w-full">
                    <div
                      className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                        isPast
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : isCurrent
                          ? "ring-2 ring-zinc-900 dark:ring-zinc-100 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold"
                          : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                      }`}
                    >
                      {isPast ? <Check className="w-3.5 h-3.5" /> : step.id}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] mt-1.5 tracking-tight font-medium ${
                      isCurrent
                        ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Panels */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          <AnimatePresence mode="wait">
            {/* STEP 1: PILIH SISWA */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={transitionSmooth}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {currentUser?.role === "siswa"
                      ? "1. Generate Payment: Akun Siswa Anda"
                      : "1. Generate Payment: Pilih Siswa"}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {currentUser?.role === "siswa"
                      ? "Simulasi pembayaran Virtual Account khusus untuk akun dan tagihan SPP Anda sendiri."
                      : "Pilih akun siswa yang akan melakukan pembayaran SPP via Virtual Account."}
                  </p>
                </div>

                {currentUser?.role === "siswa" && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      Login aktif sebagai siswa: <strong>{currentUser.nama}</strong> (NIS: {currentUser.nis}). Sesuai aturan hak akses, Anda hanya melihat data akun Anda sendiri.
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {currentUser?.role === "siswa" ? "Data Akun Anda:" : "Siswa Terdaftar:"}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {siswaList.map((s) => {
                      const isSelected = s.id_siswa === selectedSiswaId;
                      const isMyAccount =
                        currentUser?.role === "siswa" &&
                        (s.id_siswa === currentUser.id_siswa || s.nis === currentUser.nis);
                      const unpaidCount = (s.tagihan_spp || []).filter(
                        (t) => t.status === "BELUM BAYAR" || t.status === "TUNGGAKAN"
                      ).length;

                      return (
                        <div
                          key={s.id_siswa}
                          onClick={() => setSelectedSiswaId(s.id_siswa)}
                          className={`cursor-pointer p-4 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800/80 ring-1 ring-zinc-900 dark:ring-zinc-100"
                              : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                  {s.nama}
                                </div>
                                {isMyAccount && (
                                  <span className="text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                                    Akun Anda
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                                NIS: {s.nis} · {s.kelas?.nama_kelas || "-"}
                              </div>
                            </div>
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                              {s.virtual_account?.nomor_va || "-"}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                            <span className="text-zinc-500">Tagihan belum lunas:</span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {unpaidCount} bulan
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <Button
                    onClick={() => setCurrentStep(2)}
                    disabled={!selectedSiswaId}
                    className="gap-2"
                  >
                    <span>Lanjut: Review Pembayaran</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: REVIEW PAYMENT GATEWAY */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={transitionSmooth}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    2. Payment Gateway: Pembentukan Transaksi
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Data transaksi yang dibentuk oleh Payment Gateway sebelum siswa mentransfer.
                  </p>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-5 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                  <div className="flex justify-between text-sm py-1 border-b border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-zinc-500">Nama Siswa:</span>
                    <span className="font-semibold">{selectedSiswa?.nama}</span>
                  </div>
                  <div className="flex justify-between text-sm py-1 border-b border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-zinc-500">NIS:</span>
                    <span className="font-mono">{selectedSiswa?.nis}</span>
                  </div>
                  <div className="flex justify-between text-sm py-1 border-b border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-zinc-500">Nomor Virtual Account:</span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {nomorVa}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm py-1 border-b border-zinc-200/60 dark:border-zinc-700/60">
                    <span className="text-zinc-500">Transaction ID:</span>
                    <span className="font-mono text-xs">{trxId}</span>
                  </div>
                  <div className="flex justify-between text-sm py-1">
                    <span className="text-zinc-500">Nominal Tagihan:</span>
                    <span className="font-semibold tabular-nums text-base">
                      {formatRupiah(amount)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                    Kembali
                  </Button>
                  <Button onClick={() => setCurrentStep(3)} className="gap-2">
                    <span>Lanjut ke Virtual Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: VIRTUAL ACCOUNT REVIEW */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={transitionSmooth}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    3. Virtual Account: Tampilan Tagihan di Kanal Bank
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Siswa membuka ATM/m-Banking memasukkan nomor VA.
                  </p>
                </div>

                {/* Simulated ATM / Banking Screen */}
                <div className="bg-zinc-900 text-white rounded-2xl p-6 sm:p-8 font-mono space-y-4 shadow-md border border-zinc-800">
                  <div className="flex justify-between items-center text-xs text-zinc-400 border-b border-zinc-800 pb-3">
                    <span>PEMBAYARAN VIRTUAL ACCOUNT</span>
                    <span>BANK MOCK SANDBOX</span>
                  </div>
                  <div className="space-y-2 text-sm pt-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">INSTITUSI:</span>
                      <span>SMK BINA BANGSA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">NOMOR VA:</span>
                      <span className="text-yellow-400 font-bold">{nomorVa}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">NAMA SISWA:</span>
                      <span>{selectedSiswa?.nama.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">TOTAL BAYAR:</span>
                      <span className="text-emerald-400 font-bold text-base">
                        {formatRupiah(amount)}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-500 pt-3 border-t border-zinc-800 text-center">
                    5 DIGIT TERAKHIR VA ({nomorVa.slice(-5)}) IDENTIK DENGAN NIS SISWA ({selectedSiswa?.nis})
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                    Kembali
                  </Button>
                  <Button onClick={() => setCurrentStep(4)} className="gap-2">
                    <span>Lanjut ke Opsi Simulasi</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: PILIH SKENARIO SIMULASI */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={transitionSmooth}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    4. Simulasi Bayar & Eksekusi Webhook
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Pilih skenario pengujian untuk demonstrasi ke asesor:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Skenario 1: Normal Berhasil */}
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100 transition-all flex flex-col justify-between space-y-3 bg-white dark:bg-zinc-900">
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-sm font-semibold">1. Berhasil (Normal Demo)</h4>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Amount Rp350.000 cocok, signature HMAC valid. Melunasi tagihan tertua otomatis.
                      </p>
                    </div>
                    <Button
                      onClick={() => handleKirimCallback({ tamper: false, customAmount: amount })}
                      isLoading={isExecuting}
                      size="sm"
                      className="w-full"
                    >
                      Kirim Callback Lunas
                    </Button>
                  </div>

                  {/* Skenario 2: Callback Duplikat */}
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100 transition-all flex flex-col justify-between space-y-3 bg-white dark:bg-zinc-900">
                    <div>
                      <div className="flex items-center gap-2">
                        <Repeat className="w-4 h-4 text-sky-600" />
                        <h4 className="text-sm font-semibold">2. Idempotensi (Duplikat)</h4>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Kirim ulang callback dengan Transaction ID yang sama. Sistem wajib mengembalikan HTTP 200 tanpa menduplikasi data pembayaran.
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        handleKirimCallback({
                          tamper: false,
                          customAmount: 350000,
                          customTrxId: "TRX-20260720-001", // Sudah ada di database seed
                        })
                      }
                      isLoading={isExecuting}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      Uji Duplicate Callback
                    </Button>
                  </div>

                  {/* Skenario 3: Signature Invalid */}
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100 transition-all flex flex-col justify-between space-y-3 bg-white dark:bg-zinc-900">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        <h4 className="text-sm font-semibold">3. Signature HMAC Palsu</h4>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Mengirim signature yang dirusak. Sistem wajib menolak dengan HTTP 401 Unauthorized via timingSafeEqual.
                      </p>
                    </div>
                    <Button
                      onClick={() => handleKirimCallback({ tamper: true })}
                      isLoading={isExecuting}
                      variant="outline"
                      size="sm"
                      className="w-full text-rose-600 border-rose-300 dark:border-rose-900"
                    >
                      Kirim Signature Rusak
                    </Button>
                  </div>

                  {/* Skenario 4: Nominal Tidak Cocok */}
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100 transition-all flex flex-col justify-between space-y-3 bg-white dark:bg-zinc-900">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <h4 className="text-sm font-semibold">4. Nominal Salah (Rp100.000)</h4>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Mengirim amount yang tidak cocok dengan tagihan (Rp100.000). Sistem wajib menolak dengan HTTP 400.
                      </p>
                    </div>
                    <Button
                      onClick={() => handleKirimCallback({ tamper: false, customAmount: 100000 })}
                      isLoading={isExecuting}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Kirim Nominal Beda
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <Button variant="secondary" onClick={() => setCurrentStep(3)}>
                    Kembali
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: HASIL EKSEKUSI CALLBACK */}
            {currentStep === 5 && resultData && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={transitionSmooth}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    5. Hasil Callback Webhook
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Respons dari server sistem sekolah terhadap webhook callback.
                  </p>
                </div>

                {/* HTTP Status Banner */}
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    resultData.response_status === 200
                      ? "bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800"
                      : "bg-rose-50 text-rose-950 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {resultData.response_status === 200 ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <div className="text-sm font-semibold">
                        HTTP Status: {resultData.response_status}{" "}
                        {resultData.response_status === 200 ? "OK" : "REJECTED"}
                      </div>
                      <p className="text-xs opacity-80 mt-0.5">
                        {resultData.response_body.message}
                      </p>
                    </div>
                  </div>
                  {resultData.response_body.data?.status && (
                    <StatusBadge status={resultData.response_body.data.status} />
                  )}
                </div>

                {/* Raw Signature & Payload Inspector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Header X-Signature (HMAC-SHA256):
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-900 text-zinc-100 text-xs font-mono rounded-lg overflow-x-auto break-all">
                    {resultData.signature_sent}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Raw Payload Dikirim:
                    </span>
                    <button
                      onClick={copyPayload}
                      className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 inline-flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Disalin" : "Salin JSON"}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-zinc-900 text-zinc-100 text-xs font-mono rounded-lg overflow-x-auto">
                    {JSON.stringify(JSON.parse(resultData.payload_sent), null, 2)}
                  </pre>
                </div>

                <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCurrentStep(1);
                      setResultData(null);
                    }}
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Ulangi Simulasi</span>
                  </Button>
                  <Link href="/dashboard">
                    <Button className="gap-2">
                      <span>Cek di Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
