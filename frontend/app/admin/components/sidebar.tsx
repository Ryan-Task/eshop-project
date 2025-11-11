"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Home,
  PlusCircle,
  MonitorSmartphone,
  Menu,
  X,
  Truck,
  MessageSquare,
  Calendar,
  Users,
  CheckCircle2,
  LogOut, // NEW
  User as UserIcon, // NEW
} from "lucide-react";
import { BarChart2 } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // NEW: user state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("user");
  const [userImg, setUserImg] = useState<string | null>(null);
  // NEW: fallback avatar flag (jika gambar gagal dimuat)
  const [showFallback, setShowFallback] = useState(false);

  // NEW: helper image URL
  const getImageUrl = (path?: string | null) => {
    if (!path) return null;
    const p = String(path).trim().replace(/^\/+/, "");
    if (!p) return null;
    if (p.startsWith("http")) return p;
    if (p.startsWith("storage/")) return `http://127.0.0.1:8000/${p}`;
    if (p.startsWith("public/"))
      return `http://127.0.0.1:8000/storage/${p.replace(/^public\//, "")}`;
    return `http://127.0.0.1:8000/storage/${p}`;
  };

  // Deteksi ukuran layar
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // NEW: sync user from localStorage
  useEffect(() => {
    const syncUser = () => {
      try {
        const token = localStorage.getItem("token");
        const raw = localStorage.getItem("user");
        if (!token || !raw) {
          setIsLoggedIn(false);
          setUserName("");
          setUserRole("user");
          setUserImg(null);
          setShowFallback(false); // reset
          return;
        }
        const u = JSON.parse(raw);
        setIsLoggedIn(true);
        setUserName(u?.name || "");
        setUserRole(u?.role || "user");
        const imgUrl = getImageUrl(u?.profile_image);
        setUserImg(imgUrl);
        setShowFallback(false); // reset fallback ketika source berubah
      } catch {
        setIsLoggedIn(false);
        setUserName("");
        setUserRole("user");
        setUserImg(null);
        setShowFallback(false);
      }
    };
    syncUser();
    const onChange = () => syncUser();
    window.addEventListener("storage", onChange);
    window.addEventListener("authChange", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("authChange", onChange);
    };
  }, []);

  // NEW: admin logout
  const adminLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("authChange"));
      window.dispatchEvent(new Event("cartChange"));
      window.dispatchEvent(new Event("cartUpdate"));
    } catch {}
    if (typeof window !== "undefined") {
      window.location.replace("/admin/login");
    }
  };

  const navItems = [
    { href: "/admin", label: "Dashboard Admin", icon: <Home size={20} /> },
    {
      href: "/admin/create",
      label: "Tambah Produk",
      icon: <PlusCircle size={20} />,
    },
    {
      href: "/admin/show",
      label: "Barang Elektronik",
      icon: <MonitorSmartphone size={20} />,
    },
    {
      href: "/admin/pengiriman",
      label: "Pengiriman",
      icon: <Truck size={20} />,
    },
    // NEW: Ringkasan
    {
      href: "/admin/summary",
      label: "Ringkasan",
      icon: <BarChart2 size={20} />,
    },
    // NEW: Order Selesai
    {
      href: "/admin/orders/completed",
      label: "Order Selesai",
      icon: <CheckCircle2 size={20} />,
    },
    {
      href: "/admin/contacts",
      label: "Contact Us",
      icon: <MessageSquare size={20} />,
    },
    {
      href: "/admin/upcoming",
      label: "Upcoming",
      icon: <Calendar size={20} />,
    },
    // NEW: Users management
    {
      href: "/admin/users",
      label: "Users",
      icon: <Users size={20} />,
    },
  ];

  return (
    <div className="flex">
      {/* Tombol toggle (hanya tampil di HP) */}
      {isMobile && (
        <button
          onClick={() => setExpanded(true)}
          className="fixed top-4 left-4 z-50 bg-black text-white p-2 rounded-lg shadow-lg hover:bg-gray-800"
        >
          <Menu size={22} />
        </button>
      )}

      {/* Overlay saat sidebar terbuka di HP */}
      {isMobile && expanded && (
        <div
          onClick={() => setExpanded(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        />
      )}

      {/* Sidebar utama */}
      <motion.aside
        animate={{
          width: isMobile ? (expanded ? 220 : 0) : expanded ? 220 : 80,
          x: isMobile && !expanded ? -220 : 0,
        }}
        transition={{ duration: 0.3, type: "spring", stiffness: 120 }}
        onMouseEnter={() => !isMobile && setExpanded(true)}
        onMouseLeave={() => !isMobile && setExpanded(false)}
        className={`h-screen bg-black fixed left-0 top-0 flex flex-col items-center py-6 border-r border-gray-800 z-50 overflow-hidden`}
      >
        {/* Tombol close di mode mobile */}
        {isMobile && expanded && (
          <button
            onClick={() => setExpanded(false)}
            className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-lg"
          >
            <X size={20} />
          </button>
        )}

        {/* Logo (klik untuk ke beranda user) */}
        <Link
          href="/"
          onClick={() => isMobile && setExpanded(false)}
          className={`flex items-center justify-center transition-all duration-300 ${
            expanded ? "mb-8" : "mb-4"
          }`}
        >
          <Image
            src="/images/logoo.jpg"
            alt="Logo"
            width={expanded ? 60 : 40}
            height={expanded ? 60 : 40}
            className="rounded-full object-cover shadow-md hover:scale-110 transition-transform duration-300"
            priority
          />
        </Link>

        {/* Judul (muncul saat sidebar diperluas) */}
        {expanded && (
          <h2 className="text-xl font-extrabold tracking-wide text-white mb-6 font-sans">
            Admin Panel
          </h2>
        )}

        {/* Navigasi */}
        <nav className="flex flex-col gap-2 w-full px-3 mt-2 font-semibold font-sans">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <Link
                href={item.href}
                key={index}
                onClick={() => isMobile && setExpanded(false)}
                className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 border ${
                  isActive
                    ? "bg-white text-black font-bold border-gray-400 shadow-inner"
                    : "hover:bg-white/10 hover:border-white/20 border-transparent"
                }`}
              >
                {/* Icon */}
                <div
                  className={`flex justify-center w-6 group-hover:scale-110 transition-transform duration-200 ${
                    isActive ? "text-black" : "text-white/80"
                  }`}
                >
                  {item.icon}
                </div>

                {/* Label */}
                {expanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className={`text-sm group-hover:text-black-200 ${
                      isActive ? "text-black" : "text-white/80"
                    }`}
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User box + Logout (fixed at bottom) */}
        <div className="mt-auto w-full px-3 pb-4">
          {isLoggedIn ? (
            <div
              className={`flex items-center gap-2 bg-white/10 rounded-xl border border-white/20 ${
                expanded ? "p-2 justify-between" : "p-1.5 justify-center"
              }`}
            >
              {/* Avatar + info */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white/20 flex items-center justify-center border border-white/30 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {userImg && !showFallback ? (
                    <img
                      src={userImg}
                      alt={userName || "User"}
                      className="w-full h-full object-cover"
                      onError={() => setShowFallback(true)}
                    />
                  ) : (
                    <UserIcon size={18} className="text-white/80" />
                  )}
                </div>
                {expanded && (
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-white text-sm font-bold leading-tight truncate"
                      title={userName || "Admin"}
                    >
                      {userName || "Admin"}
                    </span>
                    <span className="text-[11px] text-white/70 uppercase truncate">
                      {userRole}
                    </span>
                  </div>
                )}
              </div>

              {/* Logout button */}
              <button
                onClick={adminLogout}
                title="Logout"
                className={`flex items-center gap-1 rounded-lg border ${
                  expanded
                    ? "px-2 py-1 text-sm bg-white text-black border-gray-300 hover:bg-gray-100"
                    : "w-9 h-9 justify-center border-white/30 text-white hover:bg-white/10"
                }`}
              >
                <LogOut size={16} />
                {expanded && <span className="font-semibold">Logout</span>}
              </button>
            </div>
          ) : (
            // If not logged in (fallback)
            <Link
              href="/admin/login"
              className={`block text-center rounded-xl border border-white/20 text-white hover:bg-white/10 ${
                expanded ? "py-2" : "py-2"
              }`}
            >
              Login Admin
            </Link>
          )}
        </div>

        {/* Garis pemisah bawah */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </motion.aside>
    </div>
  );
}
