"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  ShieldCheck,
  UserCheck,
  Edit,
  Trash2,
  KeyRound,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTanggal } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { getCsrfToken, CSRF_HEADER_NAME } from "@/lib/csrf-client";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Data master referensi untuk role siswa
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [jurusanList, setJurusanList] = useState<any[]>([]);
  const [tahunAjaranList, setTahunAjaranList] = useState<any[]>([]);

  // Modal Tambah User
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    nama: "",
    username: "",
    password: "",
    role: "teller",
    status: "AKTIF",
    // Data siswa
    id_tahun_ajaran: "",
    id_jurusan: "",
    id_kelas: "",
    nis: "",
    nisn: "",
  });
  const [savingAdd, setSavingAdd] = useState(false);
  const [errorAdd, setErrorAdd] = useState<string | null>(null);

  // Modal Edit / Ubah Hak Akses User
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    id_user: 0,
    nama: "",
    username: "",
    role: "teller",
    status: "AKTIF",
    new_password: "",
    id_kelas: "",
    id_tahun_ajaran: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState<string | null>(null);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Muat data pengguna dan referensi master
  const loadUsers = async () => {
    try {
      setLoading(true);
      const [userRes, meRes, kRes, jRes, taRes] = await Promise.all([
        fetch("/api/master/users"),
        fetch("/api/auth/me"),
        fetch("/api/master/kelas"),
        fetch("/api/master/jurusan"),
        fetch("/api/master/tahun-ajaran"),
      ]);

      const [uJson, meJson, kJson, jJson, taJson] = await Promise.all([
        userRes.json(),
        meRes.json(),
        kRes.json(),
        jRes.json(),
        taRes.json(),
      ]);

      if (uJson.success) setUsers(uJson.data);
      if (meJson.authenticated) setCurrentUser(meJson.user);
      if (kJson.success) setKelasList(kJson.data);
      if (jJson.success) setJurusanList(jJson.data);
      if (taJson.success) setTahunAjaranList(taJson.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filter kelas berdasarkan jurusan yang dipilih di form tambah
  const filteredKelasTambah = form.id_jurusan
    ? kelasList.filter((k) => k.id_jurusan === Number(form.id_jurusan))
    : kelasList;

  // Handler Tambah User
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAdd(null);
    setSavingAdd(true);

    try {
      const csrf = getCsrfToken();
      const payload: any = {
        nama: form.nama.trim(),
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        status: form.status,
      };

      if (form.role === "siswa") {
        if (!form.id_kelas) {
          setErrorAdd("Pilihan Kelas wajib diisi untuk role Siswa.");
          setSavingAdd(false);
          return;
        }
        payload.id_kelas = Number(form.id_kelas);
        payload.id_tahun_ajaran = form.id_tahun_ajaran
          ? Number(form.id_tahun_ajaran)
          : null;
        payload.nis = form.nis ? form.nis.trim() : form.username.trim();
        payload.nisn = form.nisn ? form.nisn.trim() : null;
      }

      const res = await fetch("/api/master/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { [CSRF_HEADER_NAME]: csrf } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorAdd(json.error || "Gagal membuat pengguna.");
        setSavingAdd(false);
        return;
      }

      setIsAddOpen(false);
      setForm({
        nama: "",
        username: "",
        password: "",
        role: "teller",
        status: "AKTIF",
        id_tahun_ajaran: "",
        id_jurusan: "",
        id_kelas: "",
        nis: "",
        nisn: "",
      });
      setNotification({
        type: "success",
        message: json.message || "Pengguna baru berhasil ditambahkan.",
      });
      loadUsers();
    } catch {
      setErrorAdd("Terjadi gangguan koneksi ke server.");
    } finally {
      setSavingAdd(false);
    }
  };

  // Buka Modal Edit Hak Akses
  const openEditModal = (u: any) => {
    setSelectedUser(u);
    setErrorEdit(null);
    setEditForm({
      id_user: u.id_user,
      nama: u.nama,
      username: u.username,
      role: u.role,
      status: u.status,
      new_password: "",
      id_kelas: u.siswa?.id_kelas ? String(u.siswa.id_kelas) : "",
      id_tahun_ajaran: u.siswa?.id_tahun_ajaran
        ? String(u.siswa.id_tahun_ajaran)
        : "",
    });
    setIsEditOpen(true);
  };

  // Handler Update Hak Akses & Profil Pengguna oleh Admin
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorEdit(null);
    setSavingEdit(true);

    try {
      const csrf = getCsrfToken();
      const payload: any = {
        id_user: editForm.id_user,
        nama: editForm.nama.trim(),
        username: editForm.username.trim(),
        role: editForm.role,
        status: editForm.status,
      };

      if (editForm.new_password && editForm.new_password.trim().length >= 6) {
        payload.password = editForm.new_password.trim();
      }

      if (editForm.role === "siswa" && editForm.id_kelas) {
        payload.id_kelas = Number(editForm.id_kelas);
      }
      if (editForm.role === "siswa" && editForm.id_tahun_ajaran) {
        payload.id_tahun_ajaran = Number(editForm.id_tahun_ajaran);
      }

      const res = await fetch("/api/master/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { [CSRF_HEADER_NAME]: csrf } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorEdit(json.error || "Gagal memperbarui hak akses pengguna.");
        setSavingEdit(false);
        return;
      }

      setIsEditOpen(false);
      setSelectedUser(null);
      setNotification({
        type: "success",
        message: json.message || "Hak akses pengguna berhasil diperbarui.",
      });
      loadUsers();
    } catch {
      setErrorEdit("Terjadi gangguan koneksi ke server.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Handler Hapus User
  const handleDeleteUser = async (u: any) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus pengguna "${u.nama}" (${u.username})? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }

    try {
      const csrf = getCsrfToken();
      const res = await fetch(`/api/master/users?id_user=${u.id_user}`, {
        method: "DELETE",
        headers: {
          ...(csrf ? { [CSRF_HEADER_NAME]: csrf } : {}),
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Gagal menghapus pengguna.");
        return;
      }

      setNotification({
        type: "success",
        message: json.message || "Pengguna berhasil dihapus.",
      });
      loadUsers();
    } catch {
      alert("Terjadi kesalahan saat menghapus pengguna.");
    }
  };

  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    kepala_sekolah: "Kepala Sekolah",
    teller: "Teller",
    siswa: "Siswa",
  };

  const roleColors: Record<string, string> = {
    admin:
      "bg-purple-50 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    kepala_sekolah:
      "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    teller:
      "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    siswa:
      "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header Top Bar */}
      <motion.div
        variants={staggerItem}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight">Kelola Pengguna Sistem</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manajemen akun pengguna dan otoritas hak akses: Administrator, Kepala Sekolah, Teller, dan Siswa.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </Button>
      </motion.div>

      {/* Notifikasi Global */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            notification.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Tabel Pengguna */}
      <motion.div variants={staggerItem}>
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nama Pengguna</th>
                    <th className="px-4 py-3 font-medium">Username</th>
                    <th className="px-4 py-3 font-medium">Peran / Hak Akses</th>
                    <th className="px-4 py-3 font-medium">Informasi Siswa / VA</th>
                    <th className="px-4 py-3 font-medium">Status Akun</th>
                    <th className="px-4 py-3 font-medium">Terdaftar</th>
                    <th className="px-4 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {users.map((u) => {
                    const isSelf = currentUser?.id_user === u.id_user;

                    return (
                      <tr
                        key={u.id_user}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <span>{u.nama}</span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono">
                                Anda
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                          {u.username}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border font-mono ${
                              roleColors[u.role] ||
                              "bg-zinc-100 text-zinc-800 border-zinc-200"
                            }`}
                          >
                            {roleLabels[u.role] || u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.siswa ? (
                            <div>
                              <div className="font-mono text-[11px] text-zinc-800 dark:text-zinc-200">
                                NIS: {u.siswa.nis} · {u.siswa.kelas?.nama_kelas || "-"}
                              </div>
                              <div className="font-mono text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold">
                                VA: {u.siswa.virtual_account?.nomor_va || "-"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                              u.status === "AKTIF"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                          {formatTanggal(u.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Tombol Ubah Hak Akses */}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openEditModal(u)}
                              className="h-7 text-xs px-2.5 gap-1"
                              title="Ubah peran dan hak akses"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                              <span>Ubah Hak Akses</span>
                            </Button>

                            {/* Tombol Hapus (jika bukan akun sendiri) */}
                            {!isSelf && (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleDeleteUser(u)}
                                className="h-7 text-xs px-2"
                                title="Hapus pengguna"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
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

      {/* MODAL 1: TAMBAH PENGGUNA (Mendukung Role Siswa + Kelas, Jurusan, Tahun Ajaran) */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Tambah Akun Pengguna Baru"
        description="Pilih hak akses role. Untuk role siswa, lengkapi data kelas, jurusan, dan tahun ajaran."
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          {errorAdd && (
            <div className="p-3 text-xs text-rose-800 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800">
              {errorAdd}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nama Lengkap"
              placeholder="Contoh: Ahmad Fauzan"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              required
            />

            <Input
              label="Username Login"
              placeholder="Contoh: 12345 atau fauzan"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Password Akun"
              type="password"
              placeholder="Minimal 6 karakter"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />

            <Select
              label="Status Akun"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[
                { value: "AKTIF", label: "AKTIF" },
                { value: "NONAKTIF", label: "NONAKTIF" },
              ]}
            />
          </div>

          {/* Pemilihan Role / Hak Akses */}
          <Select
            label="Hak Akses / Peran (Role)"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={[
              { value: "admin", label: "Administrator (Akses Penuh)" },
              {
                value: "kepala_sekolah",
                label: "Kepala Sekolah (Monitoring Read-Only)",
              },
              {
                value: "teller",
                label: "Teller (Administrasi & Monitoring Transaksi)",
              },
              {
                value: "siswa",
                label: "Siswa (Akses Mandiri & Virtual Account SPP)",
              },
            ]}
          />

          {/* BIDANG KHUSUS JIKA ROLE = SISWA */}
          {form.role === "siswa" && (
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span>Pengaturan Data Akademik Siswa & Virtual Account</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="NIS (Nomor Induk Siswa)"
                  placeholder="5 digit angka, contoh: 12349"
                  value={form.nis}
                  onChange={(e) => setForm({ ...form, nis: e.target.value })}
                  helper="5 digit terakhir nomor VA akan identik dengan NIS."
                  required
                />

                <Input
                  label="NISN (Opsional)"
                  placeholder="Contoh: 0081234567"
                  value={form.nisn}
                  onChange={(e) => setForm({ ...form, nisn: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Pilihan Tahun Ajaran */}
                <Select
                  label="Tahun Ajaran"
                  value={form.id_tahun_ajaran}
                  onChange={(e) =>
                    setForm({ ...form, id_tahun_ajaran: e.target.value })
                  }
                  options={[
                    { value: "", label: "-- Pilih Tahun Ajaran --" },
                    ...tahunAjaranList.map((ta) => ({
                      value: String(ta.id_tahun_ajaran),
                      label: `${ta.tahun_ajaran} (${ta.status})`,
                    })),
                  ]}
                />

                {/* Pilihan Jurusan */}
                <Select
                  label="Jurusan"
                  value={form.id_jurusan}
                  onChange={(e) => {
                    const newJurusan = e.target.value;
                    setForm({ ...form, id_jurusan: newJurusan, id_kelas: "" });
                  }}
                  options={[
                    { value: "", label: "-- Pilih Jurusan --" },
                    ...jurusanList.map((j) => ({
                      value: String(j.id_jurusan),
                      label: `${j.kode_jurusan} - ${j.nama_jurusan}`,
                    })),
                  ]}
                />

                {/* Pilihan Kelas */}
                <Select
                  label="Kelas"
                  value={form.id_kelas}
                  onChange={(e) => setForm({ ...form, id_kelas: e.target.value })}
                  options={[
                    { value: "", label: "-- Pilih Kelas --" },
                    ...filteredKelasTambah.map((k) => ({
                      value: String(k.id_kelas),
                      label: k.nama_kelas,
                    })),
                  ]}
                  required
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" isLoading={savingAdd}>
              Simpan Pengguna
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: UBAH HAK AKSES & STATUS PENGGUNA (ADMIN ONLY) */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Ubah Hak Akses & Status Pengguna"
        description={`Mengubah wewenang akun "${selectedUser?.nama || ""}" (${selectedUser?.username || ""}).`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {errorEdit && (
            <div className="p-3 text-xs text-rose-800 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800">
              {errorEdit}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nama Lengkap"
              value={editForm.nama}
              onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
              required
            />

            <Input
              label="Username Akun"
              value={editForm.username}
              onChange={(e) =>
                setEditForm({ ...editForm, username: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Otoritas Mengubah Seluruh Hak Akses User */}
            <Select
              label="Peran / Hak Akses (Role)"
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              options={[
                { value: "admin", label: "Administrator (Akses Penuh)" },
                {
                  value: "kepala_sekolah",
                  label: "Kepala Sekolah (Monitoring Read-Only)",
                },
                {
                  value: "teller",
                  label: "Teller (Administrasi & Monitoring Transaksi)",
                },
                {
                  value: "siswa",
                  label: "Siswa (Akses Mandiri & VA)",
                },
              ]}
            />

            <Select
              label="Status Akun"
              value={editForm.status}
              onChange={(e) =>
                setEditForm({ ...editForm, status: e.target.value })
              }
              options={[
                { value: "AKTIF", label: "AKTIF" },
                { value: "NONAKTIF", label: "NONAKTIF (Blokir Akses)" },
              ]}
            />
          </div>

          {/* Jika Akun Adalah Siswa: Pilihan Update Kelas */}
          {editForm.role === "siswa" && (
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-2.5 text-xs">
              <span className="font-medium text-zinc-700 dark:text-zinc-300 block">
                Penempatan Kelas Siswa:
              </span>
              <Select
                label="Kelas"
                value={editForm.id_kelas}
                onChange={(e) =>
                  setEditForm({ ...editForm, id_kelas: e.target.value })
                }
                options={[
                  { value: "", label: "-- Tetapkan / Ubah Kelas --" },
                  ...kelasList.map((k) => ({
                    value: String(k.id_kelas),
                    label: `${k.nama_kelas} (${k.jurusan?.nama_jurusan || "-"})`,
                  })),
                ]}
              />
            </div>
          )}

          {/* Opsi Reset Password Pengguna */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
              <span>Reset Password Pengguna (Opsional):</span>
            </div>
            <Input
              type="password"
              placeholder="Kosongkan jika tidak ingin mengganti password"
              value={editForm.new_password}
              onChange={(e) =>
                setEditForm({ ...editForm, new_password: e.target.value })
              }
              helper="Minimal 6 karakter jika ingin mereset password pengguna."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" isLoading={savingEdit}>
              Simpan Perubahan Hak Akses
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
