"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Receipt,
  FilePlus,
  GraduationCap,
  Users,
  Database,
  ArrowRightLeft,
  FileText,
  Search,
  ShieldCheck,
  CreditCard,
  LogOut,
  Menu,
  X,
  History,
  CheckCircle2,
  UserCog,
} from "lucide-react";
import { pageVariants } from "@/lib/motion";
import { CSRF_COOKIE_NAME, initCsrfInterceptor } from "@/lib/csrf-client";

interface UserInfo {
  id_user: number;
  nama: string;
  username: string;
  role: string;
  id_siswa?: number | null;
  nis?: string | null;
  nomor_va?: string | null;
  csrf_token?: string;
}

interface AppShellProps {
  user: UserInfo;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ user, children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  React.useEffect(() => {
    initCsrfInterceptor();
    if (user.csrf_token) {
      document.cookie = `${CSRF_COOKIE_NAME}=${user.csrf_token}; path=/; SameSite=Lax`;
    }
  }, [user.csrf_token]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  // Navigasi disesuaikan dengan Role
  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "kepala_sekolah", "teller", "siswa"],
    },
    {
      label: "Tagihan & Tunggakan",
      href: "/tagihan",
      icon: Receipt,
      roles: ["admin", "kepala_sekolah", "teller", "siswa"],
    },
    {
      label: "Generate Tagihan",
      href: "/tagihan/generate",
      icon: FilePlus,
      roles: ["admin"],
    },
    {
      label: "Beasiswa",
      href: "/beasiswa",
      icon: GraduationCap,
      roles: ["admin", "kepala_sekolah", "siswa"], // Teller dilarang akses
    },
    {
      label: "Pencarian",
      href: "/pencarian",
      icon: Search,
      roles: ["admin", "teller"], // Admin & Teller
    },
    {
      label: "Transaksi PG",
      href: "/transaksi",
      icon: ArrowRightLeft,
      roles: ["admin", "kepala_sekolah", "teller"],
    },
    {
      label: "Log Callback",
      href: "/callback-log",
      icon: History,
      roles: ["admin", "kepala_sekolah"],
    },
    {
      label: "Laporan",
      href: "/laporan",
      icon: FileText,
      roles: ["admin", "kepala_sekolah", "teller"],
    },
    {
      label: "Master Data",
      href: "/master",
      icon: Database,
      roles: ["admin"],
    },
    {
      label: "Kelola Pengguna",
      href: "/users",
      icon: Users,
      roles: ["admin"],
    },
    {
      label: "Audit Log",
      href: "/audit-log",
      icon: ShieldCheck,
      roles: ["admin", "kepala_sekolah"],
    },
    {
      label: "Simulator PG",
      href: "/pg-simulator",
      icon: CreditCard,
      roles: ["admin", "siswa", "teller", "kepala_sekolah"],
    },
    {
      label: "Profil & Akun",
      href: "/profil",
      icon: UserCog,
      roles: ["admin", "siswa", "teller", "kepala_sekolah"],
    },
  ];

  const allowedNav = navItems.filter((item) => item.roles.includes(user.role));

  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    kepala_sekolah: "Kepala Sekolah",
    teller: "Teller Pembayaran",
    siswa: "Siswa",
  };

  return (
    <div className="min-h-screen bg-surface-subtle dark:bg-black text-foreground flex flex-col md:flex-row">
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-xs font-semibold">
            S
          </div>
          <span className="text-sm font-semibold tracking-tight">SPP Bina Bangsa</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation (Desktop & Mobile Sheet) */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200/80 dark:border-zinc-800 flex flex-col z-40 transition-transform duration-200 md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand & App Info */}
        <div className="px-5 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-semibold text-xs tracking-tight shadow-sm">
              SPP
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight leading-tight">
                SMK Bina Bangsa
              </div>
              <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono tracking-tight">
                VA Payment Gateway
              </div>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {user.nama}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {roleLabels[user.role] || user.role}
              </span>
              {user.nomor_va && (
                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                  VA: {user.nomor_va}
                </span>
              )}
            </div>
          </div>
          <Link
            href="/profil"
            title="Pengaturan Akun & Password"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors ml-2 shrink-0"
          >
            <UserCog className="w-4 h-4" />
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
          {allowedNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`relative flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                  isActive
                    ? "text-zinc-900 dark:text-zinc-50 font-semibold bg-zinc-100 dark:bg-zinc-800/80"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeNavIndicator"
                    className="absolute left-1 w-1 h-4 bg-zinc-900 dark:bg-zinc-100 rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>{isLoggingOut ? "Keluar..." : "Keluar dari Akun"}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <motion.div
          key={pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};
