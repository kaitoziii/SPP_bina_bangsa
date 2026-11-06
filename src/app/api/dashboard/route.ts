import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TagihanService } from "@/lib/services/tagihan.service";
import { getNamaBulan } from "@/lib/format";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(["admin", "kepala_sekolah", "teller", "siswa"], req);
  if (!auth.success) return auth.response;

  const { user } = auth;

  try {
    // Sinkronisasi status tunggakan runtime
    if (user.role === "siswa") {
      await TagihanService.syncOverdueStatus(user.id_siswa!);
    } else {
      await TagihanService.syncOverdueStatus();
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // ==========================================
    // 1. DASHBOARD SISWA
    // ==========================================
    if (user.role === "siswa") {
      const siswa = await prisma.siswa.findUnique({
        where: { id_siswa: user.id_siswa! },
        include: {
          kelas: { include: { jurusan: true } },
          virtual_account: true,
          tagihan_spp: {
            orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
            include: {
              pembayaran: {
                include: { transaksi_payment_gateway: true },
              },
            },
          },
          pengajuan_beasiswa: {
            orderBy: { tanggal_pengajuan: "desc" },
          },
        },
      });

      if (!siswa) {
        return NextResponse.json({ error: "Data siswa tidak ditemukan." }, { status: 404 });
      }

      // Tagihan bulan ini
      const tagihanBulanIni = siswa.tagihan_spp.find(
        (t) => t.bulan === currentMonth && t.tahun === currentYear
      ) || null;

      // Hitung total tunggakan
      let totalTunggakanNominal = 0;
      let countTunggakan = 0;
      for (const t of siswa.tagihan_spp) {
        if (t.status === "TUNGGAKAN") {
          totalTunggakanNominal += t.nominal;
          countTunggakan++;
        }
      }

      // Riwayat pembayaran
      const riwayatPembayaran = await prisma.pembayaran.findMany({
        where: { tagihan_spp: { id_siswa: user.id_siswa! } },
        include: {
          tagihan_spp: true,
          transaksi_payment_gateway: true,
        },
        orderBy: { tanggal_pembayaran: "desc" },
        take: 10,
      });

      return NextResponse.json({
        success: true,
        role: "siswa",
        data: {
          profil: {
            id_siswa: siswa.id_siswa,
            nama: siswa.nama,
            nis: siswa.nis,
            nisn: siswa.nisn,
            kelas: siswa.kelas?.nama_kelas || "-",
            jurusan: siswa.kelas?.jurusan?.nama_jurusan || "-",
            nomor_va: siswa.virtual_account?.nomor_va || "-",
          },
          tagihanBulanIni,
          totalTunggakan: {
            nominal: totalTunggakanNominal,
            jumlah_bulan: countTunggakan,
          },
          daftarTagihan: siswa.tagihan_spp,
          riwayatPembayaran,
          pengajuanBeasiswa: siswa.pengajuan_beasiswa,
        },
      });
    }

    // ==========================================
    // 2. DASHBOARD TELLER
    // ==========================================
    if (user.role === "teller") {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const transaksiHariIni = await prisma.transaksi_payment_gateway.findMany({
        where: {
          created_at: {
            gte: todayStart,
            lte: todayEnd,
          },
          status_transaksi: "PAID",
        },
        include: {
          siswa: { include: { kelas: true } },
          pembayaran: { include: { tagihan_spp: true } },
        },
        orderBy: { created_at: "desc" },
      });

      const nominalHariIni = transaksiHariIni.reduce((acc, curr) => acc + curr.nominal, 0);

      // Transaksi terbaru
      const transaksiTerbaru = await prisma.transaksi_payment_gateway.findMany({
        take: 8,
        orderBy: { created_at: "desc" },
        include: {
          siswa: { include: { kelas: true } },
          pembayaran: { include: { tagihan_spp: true } },
        },
      });

      return NextResponse.json({
        success: true,
        role: "teller",
        data: {
          transaksiHariIniCount: transaksiHariIni.length,
          nominalHariIni,
          transaksiHariIni,
          transaksiTerbaru,
        },
      });
    }

    // ==========================================
    // 3. DASHBOARD ADMIN & KEPALA SEKOLAH
    // ==========================================
    const totalSiswa = await prisma.siswa.count({ where: { status: "AKTIF" } });
    const allTagihan = await prisma.tagihan_spp.findMany();

    let totalNominalLunas = 0;
    let totalNominalTunggakan = 0;
    let totalNominalBeasiswa = 0;
    let countLunas = 0;
    let countTunggakan = 0;
    let countBeasiswa = 0;
    let countBelumBayar = 0;

    for (const t of allTagihan) {
      if (t.status === "LUNAS") {
        totalNominalLunas += t.nominal;
        countLunas++;
      } else if (t.status === "TUNGGAKAN") {
        totalNominalTunggakan += t.nominal;
        countTunggakan++;
      } else if (t.status === "BEASISWA") {
        totalNominalBeasiswa += t.nominal;
        countBeasiswa++;
      } else if (t.status === "BELUM BAYAR") {
        countBelumBayar++;
      }
    }

    // Transaksi hari ini
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const countTrxHariIni = await prisma.transaksi_payment_gateway.count({
      where: { created_at: { gte: todayStart }, status_transaksi: "PAID" },
    });

    // Grafik bulanan (6 bulan terakhir)
    const monthlyStats: {
      bulan: string;
      pembayaran: number;
      tunggakan: number;
      beasiswa: number;
    }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const b = d.getMonth() + 1;
      const y = d.getFullYear();

      const billsForMonth = allTagihan.filter((t) => t.bulan === b && t.tahun === y);
      let pNominal = 0;
      let tNominal = 0;
      let bNominal = 0;

      for (const t of billsForMonth) {
        if (t.status === "LUNAS") pNominal += t.nominal;
        else if (t.status === "TUNGGAKAN") tNominal += t.nominal;
        else if (t.status === "BEASISWA") bNominal += t.nominal;
      }

      monthlyStats.push({
        bulan: `${getNamaBulan(b).slice(0, 3)} ${y}`,
        pembayaran: pNominal,
        tunggakan: tNominal,
        beasiswa: bNominal,
      });
    }

    // Transaksi terbaru
    const transaksiTerbaru = await prisma.transaksi_payment_gateway.findMany({
      take: 6,
      orderBy: { created_at: "desc" },
      include: {
        siswa: { include: { kelas: true } },
        pembayaran: { include: { tagihan_spp: true } },
      },
    });

    // Pengajuan beasiswa pending (untuk notifikasi admin/kepsek)
    const beasiswaPendingCount = await prisma.pengajuan_beasiswa.count({
      where: { status: "DIAJUKAN" },
    });

    return NextResponse.json({
      success: true,
      role: user.role,
      data: {
        totalSiswa,
        totalTagihanCount: allTagihan.length,
        totalPembayaran: totalNominalLunas,
        totalTunggakan: totalNominalTunggakan,
        totalBeasiswa: totalNominalBeasiswa,
        statusCounts: {
          lunas: countLunas,
          tunggakan: countTunggakan,
          beasiswa: countBeasiswa,
          belumBayar: countBelumBayar,
        },
        transaksiHariIniCount: countTrxHariIni,
        monthlyStats,
        transaksiTerbaru,
        beasiswaPendingCount,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Gagal memuat dashboard." }, { status: 500 });
  }
}
