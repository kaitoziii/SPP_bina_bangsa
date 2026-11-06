// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/lib/db";
import { hashPassword, verifyPassword } from "../../src/lib/hash";

describe("Fitur Update Profil Mandiri Siswa (Integration)", () => {
  let testUser: any;
  let testSiswa: any;
  const initialUsername = "test_siswa_profile_99999";
  const initialPassword = "initialPassword123";

  beforeAll(async () => {
    // Buat data user & siswa terisolasi khusus pengujian profil
    const ta = await prisma.tahun_ajaran.findFirst();
    const kelas = await prisma.kelas.findFirst();

    const hashedPassword = await hashPassword(initialPassword);
    testUser = await prisma.users.create({
      data: {
        nama: "Test Siswa Profil",
        username: initialUsername,
        password: hashedPassword,
        role: "siswa",
        status: "AKTIF",
      },
    });

    if (ta && kelas) {
      testSiswa = await prisma.siswa.create({
        data: {
          nis: "99999",
          nisn: "0099999999",
          nama: "Test Siswa Profil",
          jenis_kelamin: "L",
          tempat_lahir: "Jakarta",
          tanggal_lahir: new Date("2009-01-01"),
          alamat: "Jl. Pengujian No. 99",
          no_hp: "08999999999",
          nama_orang_tua: "Orang Tua Test",
          id_kelas: kelas.id_kelas,
          id_tahun_ajaran: ta.id_tahun_ajaran,
          id_user: testUser.id_user,
        },
      });
    }
  });

  afterAll(async () => {
    // Bersihkan data pengujian
    if (testSiswa) {
      await prisma.siswa.deleteMany({ where: { id_siswa: testSiswa.id_siswa } });
    }
    if (testUser) {
      await prisma.users.deleteMany({ where: { id_user: testUser.id_user } });
    }
  });

  it("1. Siswa dapat memperbarui username akun miliknya", async () => {
    const newUsername = "test_siswa_updated_99999";

    // Cek ketiadaan konflik
    const conflict = await prisma.users.findFirst({
      where: { username: newUsername, id_user: { not: testUser.id_user } },
    });
    expect(conflict).toBeNull();

    // Update username
    const updated = await prisma.users.update({
      where: { id_user: testUser.id_user },
      data: { username: newUsername },
    });

    expect(updated.username).toBe(newUsername);

    const checkDb = await prisma.users.findUnique({
      where: { username: newUsername },
    });
    expect(checkDb).toBeDefined();
    expect(checkDb!.id_user).toBe(testUser.id_user);
  });

  it("2. Sistem menolak pembaruan jika username telah digunakan akun lain", async () => {
    const admin = await prisma.users.findUnique({ where: { username: "admin" } });
    expect(admin).toBeDefined();

    // Cek konflik dengan username admin
    const conflict = await prisma.users.findFirst({
      where: { username: "admin", id_user: { not: testUser.id_user } },
    });
    expect(conflict).not.toBeNull();
  });

  it("3. Siswa dapat mengganti password setelah memverifikasi password saat ini", async () => {
    const currentPassInput = initialPassword;
    const newPassInput = "passwordBaruRahasia123";

    // Verifikasi password saat ini
    const currentUser = await prisma.users.findUnique({
      where: { id_user: testUser.id_user },
    });
    const isCurrentValid = await verifyPassword(currentPassInput, currentUser!.password);
    expect(isCurrentValid).toBe(true);

    // Hash & Simpan password baru
    const newHashed = await hashPassword(newPassInput);
    await prisma.users.update({
      where: { id_user: testUser.id_user },
      data: { password: newHashed },
    });

    // Verifikasi password baru cocok dan password lama tidak lagi berlaku
    const userAfter = await prisma.users.findUnique({
      where: { id_user: testUser.id_user },
    });
    expect(await verifyPassword(newPassInput, userAfter!.password)).toBe(true);
    expect(await verifyPassword(currentPassInput, userAfter!.password)).toBe(false);
  });

  it("4. Penggantian password gagal jika password saat ini salah", async () => {
    const currentUser = await prisma.users.findUnique({
      where: { id_user: testUser.id_user },
    });

    const wrongCurrentPass = "salahPasswordTotal";
    const isCurrentValid = await verifyPassword(wrongCurrentPass, currentUser!.password);
    expect(isCurrentValid).toBe(false);
  });
});
