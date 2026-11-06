"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, User, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { transitionSmooth } from "@/lib/motion";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setError(null);
    setIsLoading(true);

    const u = customUser ?? username;
    const p = customPass ?? password;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Gagal masuk. Periksa kembali username dan password.");
        setIsLoading(false);
        return;
      }

      if (data.csrf_token) {
        document.cookie = `spp_csrf_token=${data.csrf_token}; path=/; SameSite=Lax`;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Terjadi gangguan koneksi ke server.");
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    handleSubmit(undefined, u, p);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitionSmooth}
        className="w-full max-w-md space-y-6"
      >
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-11 h-11 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 items-center justify-center font-bold text-sm tracking-tight shadow-sm mb-1">
            SPP
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Sistem Pembayaran SPP
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            SMK Bina Bangsa · Otomasi Virtual Account & Payment Gateway
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="p-6 sm:p-8 space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-3 text-xs font-medium text-rose-800 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Username / NIS"
              placeholder="Masukkan username atau NIS"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
            />

            <Input
              label="Kata Sandi"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full h-10 mt-2 gap-2"
            >
              <span>Masuk ke Sistem</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Quick Demo Login Preset Buttons for Assessor */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
            <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-center">
              Akses Cepat Demo Pengujian:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("12345", "siswa123")}
                disabled={isLoading}
                className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors"
              >
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">Siswa (Ahmad)</div>
                <div className="text-[11px] text-zinc-400 font-mono">12345 · Belum Bayar</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("admin", "admin123")}
                disabled={isLoading}
                className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors"
              >
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">Admin</div>
                <div className="text-[11px] text-zinc-400 font-mono">admin · Full Akses</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("kepsek", "kepsek123")}
                disabled={isLoading}
                className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors"
              >
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">Kepala Sekolah</div>
                <div className="text-[11px] text-zinc-400 font-mono">kepsek · Read-only</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("teller", "teller123")}
                disabled={isLoading}
                className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors"
              >
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">Teller</div>
                <div className="text-[11px] text-zinc-400 font-mono">teller · Monitoring</div>
              </button>
            </div>
          </div>
        </Card>

        {/* Simulator Link */}
        <div className="text-center">
          <Link
            href="/pg-simulator"
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 underline underline-offset-4"
          >
            Buka Simulator Payment Gateway (Mock PG)
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
