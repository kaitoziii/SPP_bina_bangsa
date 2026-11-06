"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  GraduationCap,
  Layers,
  Calendar,
  CreditCard,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { getCsrfToken, CSRF_HEADER_NAME } from "@/lib/csrf-client";

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<"siswa" | "kelas" | "jurusan" | "ta" | "tarif">("siswa");

  const [siswaList, setSiswaList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [jurusanList, setJurusanList] = useState<any[]>([]);
  const [taList, setTaList] = useState<any[]>([]);
  const [tarifList, setTarifList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Tambah Siswa
  const [isAddSiswaOpen, setIsAddSiswaOpen] = useState(false);
  const [formSiswa, setFormSiswa] = useState({
    nis: "",
    nisn: "",
    nama: "",
    jenis_kelamin: "L",
    tempat_lahir: "",
    tanggal_lahir: "2009-01-01",
    alamat: "",
    no_hp: "",
    nama_orang_tua: "",
    id_kelas: 0,
    id_tahun_ajaran: 0,
  });
  const [savingSiswa, setSavingSiswa] = useState(false);
  const [errorSiswa, setErrorSiswa] = useState<string | null>(null);

  // Modal Tambah Kelas
  const [isAddKelasOpen, setIsAddKelasOpen] = useState(false);
  const [formKelas, setFormKelas] = useState({
    nama_kelas: "",
    tingkat: "XI",
    id_jurusan: 0,
    id_tahun_ajaran: 0,
  });

  // Modal Tambah Jurusan
  const [isAddJurusanOpen, setIsAddJurusanOpen] = useState(false);
  const [formJurusan, setFormJurusan] = useState({
    kode_jurusan: "",
    nama_jurusan: "",
    keterangan: "",
  });

  // Modal Tambah Tarif
  const [isAddTarifOpen, setIsAddTarifOpen] = useState(false);
  const [formTarif, setFormTarif] = useState({
    id_tahun_ajaran: 0,
    nominal: 350000,
    keterangan: "Tarif SPP Reguler",
  });

  const loadAll = async () => {
    try {
      setLoading(true);
      const [sRes, kRes, jRes, taRes, tRes] = await Promise.all([
        fetch("/api/master/siswa"),
        fetch("/api/master/kelas"),
        fetch("/api/master/jurusan"),
        fetch("/api/master/tahun-ajaran"),
        fetch("/api/master/tarif"),
      ]);

      const [sJson, kJson, jJson, taJson, tJson] = await Promise.all([
        sRes.json(),
        kRes.json(),
        jRes.json(),
        taRes.json(),
        tRes.json(),
      ]);

      if (sJson.success) setSiswaList(sJson.data);
      if (kJson.success) setKelasList(kJson.data);
      if (jJson.success) setJurusanList(jJson.data);
      if (taJson.success) {
        setTaList(taJson.data);
        if (taJson.data.length > 0) {
          setFormSiswa((prev) => ({ ...prev, id_tahun_ajaran: taJson.data[0].id_tahun_ajaran }));
          setFormKelas((prev) => ({ ...prev, id_tahun_ajaran: taJson.data[0].id_tahun_ajaran }));
          setFormTarif((prev) => ({ ...prev, id_tahun_ajaran: taJson.data[0].id_tahun_ajaran }));
        }
      }
      if (tJson.success) setTarifList(tJson.data);
      if (kJson.data?.length > 0) {
        setFormSiswa((prev) => ({ ...prev, id_kelas: kJson.data[0].id_kelas }));
      }
      if (jJson.data?.length > 0) {
        setFormKelas((prev) => ({ ...prev, id_jurusan: jJson.data[0].id_jurusan }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Submit Siswa
  const handleSaveSiswa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorSiswa(null);
    setSavingSiswa(true);

    try {
      const csrf = getCsrfToken();
      const res = await fetch("/api/master/siswa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { [CSRF_HEADER_NAME]: csrf } : {}),
        },
        body: JSON.stringify(formSiswa),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorSiswa(json.error || "Gagal mendaftarkan siswa.");
        setSavingSiswa(false);
        return;
      }

      setIsAddSiswaOpen(false);
      setFormSiswa({
        nis: "",
        nisn: "",
        nama: "",
        jenis_kelamin: "L",
        tempat_lahir: "",
        tanggal_lahir: "2009-01-01",
        alamat: "",
        no_hp: "",
        nama_orang_tua: "",
        id_kelas: kelasList[0]?.id_kelas || 0,
        id_tahun_ajaran: taList[0]?.id_tahun_ajaran || 0,
      });
      loadAll();
    } catch {
      setErrorSiswa("Terjadi gangguan koneksi ke server.");
    } finally {
      setSavingSiswa(false);
    }
  };

  // Submit Kelas
  const handleSaveKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const csrf = getCsrfToken();
      const res = await fetch("/api/master/kelas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { [CSRF_HEADER_NAME]: csrf } : {}),
        },
        body: JSON.stringify(formKelas),
      });
      const json = await res.json();
      if (json.success) {
        setIsAddKelasOpen(false);
        loadAll();
      } else {
        alert(json.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Jurusan
  const handleSaveJurusan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const csrf = getCsrfToken();
      const res = await fetch("/api/master/jurusan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { [CSRF_HEADER_NAME]: csrf } : {}),
        },
        body: JSON.stringify(formJurusan),
      });
      const json = await res.json();
      if (json.success) {
        setIsAddJurusanOpen(false);
        loadAll();
      } else {
        alert(json.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Tarif
  const handleSaveTarif = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const csrf = getCsrfToken();
      const res = await fetch("/api/master/tarif", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { [CSRF_HEADER_NAME]: csrf } : {}),
        },
        body: JSON.stringify(formTarif),
      });
      const json = await res.json();
      if (json.success) {
        setIsAddTarifOpen(false);
        loadAll();
      } else {
        alert(json.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Siswa
  const handleDeleteSiswa = async (id: number) => {
    if (!confirm("Hapus data siswa ini?")) return;
    try {
      const csrf = getCsrfToken();
      const res = await fetch(`/api/master/siswa/${id}`, {
        method: "DELETE",
        headers: {
          ...(csrf ? { [CSRF_HEADER_NAME]: csrf } : {}),
        },
      });
      const json = await res.json();
      if (json.success) {
        loadAll();
      } else {
        alert(json.error || "Gagal menghapus.");
      }
    } catch {
      alert("Terjadi kesalahan.");
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
        <h1 className="text-xl font-bold tracking-tight">Master Data Sekolah</h1>
        <p className="text-xs text-zinc-500">
          Kelola entitas data sekolah: Siswa, Kelas, Jurusan, Tahun Ajaran, dan Tarif SPP.
        </p>
      </motion.div>

      {/* Tabs Bar with layoutId */}
      <motion.div variants={staggerItem} className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1 overflow-x-auto">
        {[
          { id: "siswa", label: "Siswa & VA", count: siswaList.length },
          { id: "kelas", label: "Kelas", count: kelasList.length },
          { id: "jurusan", label: "Jurusan", count: jurusanList.length },
          { id: "ta", label: "Tahun Ajaran", count: taList.length },
          { id: "tarif", label: "Tarif SPP", count: tarifList.length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <span>{tab.label}</span>
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {tab.count}
              </span>
              {isActive && (
                <motion.div
                  layoutId="tabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-zinc-100"
                />
              )}
            </button>
          );
        })}
      </motion.div>

      {/* TAB CONTENT: SISWA */}
      {activeTab === "siswa" && (
        <motion.div variants={staggerItem} className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500">
              Total {siswaList.length} siswa terdaftar dengan Virtual Account unik.
            </span>
            <Button size="sm" onClick={() => setIsAddSiswaOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              <span>Tambah Siswa</span>
            </Button>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">NIS</th>
                    <th className="px-4 py-3 font-medium">NISN</th>
                    <th className="px-4 py-3 font-medium">Nama Siswa</th>
                    <th className="px-4 py-3 font-medium">Kelas</th>
                    <th className="px-4 py-3 font-medium">Nomor Virtual Account</th>
                    <th className="px-4 py-3 font-medium">Status Akun</th>
                    <th className="px-4 py-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {siswaList.map((s) => (
                    <tr key={s.id_siswa} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-mono font-semibold">{s.nis}</td>
                      <td className="px-4 py-3 font-mono text-zinc-500">{s.nisn}</td>
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        {s.nama}
                      </td>
                      <td className="px-4 py-3">{s.kelas?.nama_kelas || "-"}</td>
                      <td className="px-4 py-3 font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        {s.virtual_account?.nomor_va || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteSiswa(s.id_siswa)}
                          className="text-zinc-400 hover:text-rose-600 p-1 rounded"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* TAB CONTENT: KELAS */}
      {activeTab === "kelas" && (
        <motion.div variants={staggerItem} className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500">Daftar kelas di sekolah.</span>
            <Button size="sm" onClick={() => setIsAddKelasOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              <span>Tambah Kelas</span>
            </Button>
          </div>

          <Card className="overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama Kelas</th>
                  <th className="px-4 py-3 font-medium">Tingkat</th>
                  <th className="px-4 py-3 font-medium">Jurusan</th>
                  <th className="px-4 py-3 font-medium">Tahun Ajaran</th>
                  <th className="px-4 py-3 font-medium">Jumlah Siswa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {kelasList.map((k) => (
                  <tr key={k.id_kelas} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-semibold">{k.nama_kelas}</td>
                    <td className="px-4 py-3">{k.tingkat}</td>
                    <td className="px-4 py-3">{k.jurusan?.nama_jurusan}</td>
                    <td className="px-4 py-3 font-mono">{k.tahun_ajaran?.tahun_ajaran}</td>
                    <td className="px-4 py-3">{k._count?.siswa || 0} siswa</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </motion.div>
      )}

      {/* TAB CONTENT: JURUSAN */}
      {activeTab === "jurusan" && (
        <motion.div variants={staggerItem} className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500">Daftar kompetensi keahlian/jurusan.</span>
            <Button size="sm" onClick={() => setIsAddJurusanOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              <span>Tambah Jurusan</span>
            </Button>
          </div>

          <Card className="overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Kode</th>
                  <th className="px-4 py-3 font-medium">Nama Jurusan</th>
                  <th className="px-4 py-3 font-medium">Keterangan</th>
                  <th className="px-4 py-3 font-medium">Total Kelas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {jurusanList.map((j) => (
                  <tr key={j.id_jurusan} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-mono font-bold">{j.kode_jurusan}</td>
                    <td className="px-4 py-3 font-semibold">{j.nama_jurusan}</td>
                    <td className="px-4 py-3 text-zinc-500">{j.keterangan || "-"}</td>
                    <td className="px-4 py-3">{j._count?.kelas || 0} kelas</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </motion.div>
      )}

      {/* TAB CONTENT: TAHUN AJARAN */}
      {activeTab === "ta" && (
        <motion.div variants={staggerItem} className="space-y-4">
          <Card className="overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Tahun Ajaran</th>
                  <th className="px-4 py-3 font-medium">Tanggal Mulai</th>
                  <th className="px-4 py-3 font-medium">Tanggal Selesai</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {taList.map((ta) => (
                  <tr key={ta.id_tahun_ajaran} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-semibold font-mono">{ta.tahun_ajaran}</td>
                    <td className="px-4 py-3 text-zinc-500">{formatTanggal(ta.tanggal_mulai)}</td>
                    <td className="px-4 py-3 text-zinc-500">{formatTanggal(ta.tanggal_selesai)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {ta.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </motion.div>
      )}

      {/* TAB CONTENT: TARIF */}
      {activeTab === "tarif" && (
        <motion.div variants={staggerItem} className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500">Daftar tarif SPP per tahun ajaran.</span>
            <Button size="sm" onClick={() => setIsAddTarifOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              <span>Tambah Tarif</span>
            </Button>
          </div>

          <Card className="overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Tahun Ajaran</th>
                  <th className="px-4 py-3 font-medium">Nominal Tarif Bulanan</th>
                  <th className="px-4 py-3 font-medium">Keterangan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {tarifList.map((tf) => (
                  <tr key={tf.id_tarif} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-mono font-semibold">{tf.tahun_ajaran?.tahun_ajaran}</td>
                    <td className="px-4 py-3 font-mono font-bold text-base text-zinc-900 dark:text-zinc-100">
                      {formatRupiah(tf.nominal)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{tf.keterangan || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {tf.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </motion.div>
      )}

      {/* MODAL: TAMBAH SISWA */}
      <Modal
        isOpen={isAddSiswaOpen}
        onClose={() => setIsAddSiswaOpen(false)}
        title="Daftarkan Siswa Baru"
        description="Nomor Virtual Account otomatis dibuat (5 digit terakhir = NIS siswa)."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveSiswa} className="space-y-4">
          {errorSiswa && (
            <div className="p-3 text-xs text-rose-800 bg-rose-50 rounded-lg border border-rose-200">
              {errorSiswa}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="NIS Siswa (5 digit)"
              placeholder="Contoh: 12349"
              value={formSiswa.nis}
              onChange={(e) => setFormSiswa({ ...formSiswa, nis: e.target.value })}
              required
            />
            <Input
              label="NISN Siswa (Unik)"
              placeholder="Contoh: 0061234509"
              value={formSiswa.nisn}
              onChange={(e) => setFormSiswa({ ...formSiswa, nisn: e.target.value })}
              required
            />
          </div>

          <Input
            label="Nama Lengkap Siswa"
            placeholder="Contoh: Muhammad Rizky Pratama"
            value={formSiswa.nama}
            onChange={(e) => setFormSiswa({ ...formSiswa, nama: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Kelas"
              value={formSiswa.id_kelas}
              onChange={(e) => setFormSiswa({ ...formSiswa, id_kelas: Number(e.target.value) })}
              options={kelasList.map((k) => ({ value: k.id_kelas, label: k.nama_kelas }))}
            />
            <Select
              label="Jenis Kelamin"
              value={formSiswa.jenis_kelamin}
              onChange={(e) => setFormSiswa({ ...formSiswa, jenis_kelamin: e.target.value })}
              options={[
                { value: "L", label: "Laki-laki (L)" },
                { value: "P", label: "Perempuan (P)" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tempat Lahir"
              placeholder="Sidoarjo"
              value={formSiswa.tempat_lahir}
              onChange={(e) => setFormSiswa({ ...formSiswa, tempat_lahir: e.target.value })}
              required
            />
            <Input
              label="Tanggal Lahir"
              type="date"
              value={formSiswa.tanggal_lahir}
              onChange={(e) => setFormSiswa({ ...formSiswa, tanggal_lahir: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nomor HP Siswa / Ortu"
              placeholder="08123456789"
              value={formSiswa.no_hp}
              onChange={(e) => setFormSiswa({ ...formSiswa, no_hp: e.target.value })}
              required
            />
            <Input
              label="Nama Orang Tua / Wali"
              placeholder="Bambang Wijaya"
              value={formSiswa.nama_orang_tua}
              onChange={(e) => setFormSiswa({ ...formSiswa, nama_orang_tua: e.target.value })}
              required
            />
          </div>

          <Input
            label="Alamat Rumah"
            placeholder="Jl. Raya No. 10, Sidoarjo"
            value={formSiswa.alamat}
            onChange={(e) => setFormSiswa({ ...formSiswa, alamat: e.target.value })}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button type="button" variant="secondary" onClick={() => setIsAddSiswaOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={savingSiswa}>
              Simpan & Generate VA
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: TAMBAH KELAS */}
      <Modal
        isOpen={isAddKelasOpen}
        onClose={() => setIsAddKelasOpen(false)}
        title="Tambah Kelas"
      >
        <form onSubmit={handleSaveKelas} className="space-y-4">
          <Input
            label="Nama Kelas"
            placeholder="Contoh: XI RPL 3"
            value={formKelas.nama_kelas}
            onChange={(e) => setFormKelas({ ...formKelas, nama_kelas: e.target.value })}
            required
          />
          <Input
            label="Tingkat"
            placeholder="XI"
            value={formKelas.tingkat}
            onChange={(e) => setFormKelas({ ...formKelas, tingkat: e.target.value })}
            required
          />
          <Select
            label="Jurusan"
            value={formKelas.id_jurusan}
            onChange={(e) => setFormKelas({ ...formKelas, id_jurusan: Number(e.target.value) })}
            options={jurusanList.map((j) => ({ value: j.id_jurusan, label: j.nama_jurusan }))}
          />
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="secondary" onClick={() => setIsAddKelasOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan Kelas</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: TAMBAH JURUSAN */}
      <Modal
        isOpen={isAddJurusanOpen}
        onClose={() => setIsAddJurusanOpen(false)}
        title="Tambah Jurusan"
      >
        <form onSubmit={handleSaveJurusan} className="space-y-4">
          <Input
            label="Kode Jurusan"
            placeholder="Contoh: MM"
            value={formJurusan.kode_jurusan}
            onChange={(e) => setFormJurusan({ ...formJurusan, kode_jurusan: e.target.value })}
            required
          />
          <Input
            label="Nama Jurusan"
            placeholder="Contoh: Multimedia"
            value={formJurusan.nama_jurusan}
            onChange={(e) => setFormJurusan({ ...formJurusan, nama_jurusan: e.target.value })}
            required
          />
          <Input
            label="Keterangan"
            placeholder="Desain Komunikasi Visual"
            value={formJurusan.keterangan}
            onChange={(e) => setFormJurusan({ ...formJurusan, keterangan: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="secondary" onClick={() => setIsAddJurusanOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan Jurusan</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: TAMBAH TARIF */}
      <Modal
        isOpen={isAddTarifOpen}
        onClose={() => setIsAddTarifOpen(false)}
        title="Tambah Tarif SPP"
      >
        <form onSubmit={handleSaveTarif} className="space-y-4">
          <Select
            label="Tahun Ajaran"
            value={formTarif.id_tahun_ajaran}
            onChange={(e) => setFormTarif({ ...formTarif, id_tahun_ajaran: Number(e.target.value) })}
            options={taList.map((t) => ({ value: t.id_tahun_ajaran, label: t.tahun_ajaran }))}
          />
          <Input
            label="Nominal (Rp)"
            type="number"
            value={formTarif.nominal}
            onChange={(e) => setFormTarif({ ...formTarif, nominal: Number(e.target.value) })}
            required
          />
          <Input
            label="Keterangan"
            value={formTarif.keterangan}
            onChange={(e) => setFormTarif({ ...formTarif, keterangan: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="secondary" onClick={() => setIsAddTarifOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan Tarif</Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
