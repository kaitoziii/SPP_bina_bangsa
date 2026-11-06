"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  UserCog,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  GraduationCap,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { getCsrfToken, CSRF_HEADER_NAME } from "@/lib/csrf-client";

export default function ProfilPage() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  // Form states untuk Username
  const [username, setUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameSuccess, setUsernameSuccess] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Form states untuk Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Load current user profile
  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/profile");
      const json = await res.json();
      if (json.success && json.data) {
        setProfileData(json.data);
        setUsername(json.data.username);
      }
    } catch (e) {
      console.error(e);
      setUsernameError("Gagal memuat profil pengguna.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Handler simpan username
  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(null);
    setUsernameSuccess(null);

    if (!username || username.trim().length < 3) {
      setUsernameError("Username minimal 3 karakter.");
      return;
    }

    setSavingUsername(true);

    try {
      const csrf = getCsrfToken();
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { [CSRF_HEADER_NAME]: csrf } : {}),
        },
        body: JSON.stringify({
          username: username.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setUsernameError(json.error || "Gagal memperbarui username.");
        return;
      }

      setUsernameSuccess(json.message || "Username berhasil diperbarui.");
      loadProfile();
    } catch {
      setUsernameError("Terjadi gangguan koneksi ke server.");
    } finally {
      setSavingUsername(false);
    }
  };

  // Handler ubah password khusus
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validasi client-side
    if (!currentPassword) {
      setPasswordError("Password saat ini wajib diisi.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password baru tidak cocok dengan password baru.");
      return;
    }

    setSavingPassword(true);

    try {
      const csrf = getCsrfToken();
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { [CSRF_HEADER_NAME]: csrf } : {}),
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setPasswordError(json.error || "Gagal mengubah kata sandi.");
        return;
      }

      setPasswordSuccess(json.message || "Kata sandi berhasil diperbarui.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Terjadi gangguan koneksi ke server.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const siswa = profileData?.siswa;
  const isSiswa = profileData?.role === "siswa";

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-4xl"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="space-y-1">
        <div className="flex items-center gap-2">
          <UserCog className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
          <h1 className="text-xl font-bold tracking-tight">Pengaturan Akun & Profil</h1>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Kelola informasi login Anda, perbarui username dan kata sandi akun secara mandiri.
        </p>
      </motion.div>

      {/* Info Siswa / User Card (Read Only) */}
      {isSiswa && siswa && (
        <motion.div variants={staggerItem}>
          <Card className="p-5 sm:p-6 bg-zinc-900 text-white border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-zinc-400" />
                <span className="text-xs font-semibold tracking-wide uppercase text-zinc-300">
                  Identitas Siswa Terdaftar
                </span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 font-medium">
                Akun Terverifikasi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <span className="text-zinc-400 block text-[11px]">Nama Lengkap:</span>
                <span className="text-sm font-semibold text-white font-sans mt-0.5 block">
                  {siswa.nama}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">NIS / NISN:</span>
                <span className="text-white mt-0.5 block">
                  {siswa.nis} / {siswa.nisn || "-"}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">Kelas & Jurusan:</span>
                <span className="text-white mt-0.5 block font-sans">
                  {siswa.kelas?.nama_kelas || "-"} ({siswa.kelas?.jurusan?.nama_jurusan || "-"})
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">Virtual Account SPP:</span>
                <span className="text-yellow-400 font-bold mt-0.5 block">
                  {siswa.virtual_account?.nomor_va || "-"}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">No. Handphone:</span>
                <span className="text-white mt-0.5 block">{siswa.no_hp || "-"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">Status Akun:</span>
                <span className="text-emerald-400 font-medium mt-0.5 block">
                  {profileData.status}
                </span>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Bagian 1: Ubah Username */}
      <motion.div variants={staggerItem}>
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <User className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Informasi Username & Role
            </h2>
          </div>

          {usernameSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{usernameSuccess}</span>
            </div>
          )}

          {usernameError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{usernameError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateUsername} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Username Akun:
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username login"
                  required
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Digunakan untuk login ke sistem. Minimal 3 karakter.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Hak Akses (Role):
                </label>
                <Input
                  type="text"
                  value={profileData?.role?.toUpperCase()}
                  disabled
                  className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono text-xs cursor-not-allowed"
                />
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Dikelola secara terpusat oleh Administrator.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" isLoading={savingUsername} size="sm" className="gap-2">
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Username</span>
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>

      {/* Bagian 2: Ganti Password Khusus */}
      <motion.div variants={staggerItem}>
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Ganti Kata Sandi (Password)
              </h2>
            </div>
            <span className="text-[11px] text-zinc-400">
              Gunakan kombinasi minimal 6 karakter
            </span>
          </div>

          {passwordSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Password Saat Ini */}
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                Password Saat Ini: <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ketik password saat ini untuk verifikasi"
                  required
                  className="pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-0.5"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password Baru */}
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Password Baru: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    className="pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-0.5"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password Baru */}
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Ulangi Password Baru: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password baru"
                    required
                    className="pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-0.5"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                isLoading={savingPassword}
                size="sm"
                className="gap-2 px-5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Ganti Kata Sandi</span>
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}
