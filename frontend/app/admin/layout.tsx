"use client";
import { usePathname } from "next/navigation";
import Sidebar from "./components/sidebar";
import { motion } from "framer-motion";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className=""
      >
        <Sidebar />
      </motion.div>

      {/* Konten utama */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
