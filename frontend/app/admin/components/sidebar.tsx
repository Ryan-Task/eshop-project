"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Home, PlusCircle, MonitorSmartphone, Menu, X } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Deteksi ukuran layar
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        className={`h-screen bg-black fixed left-0 top-0 flex flex-col items-center py-6 border-r border-gray-800 z-50 ${
          isMobile ? "overflow-hidden" : ""
        }`}
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

        {/* Garis pemisah bawah */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </motion.aside>
    </div>
  );
}
