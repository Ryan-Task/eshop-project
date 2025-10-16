"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ShoppingBag, Users, Package, BarChart3 } from "lucide-react";

export default function AdminHome() {
  const [cards] = useState([
    {
      title: "Total Produk",
      value: "120",
      icon: <Package size={28} />,
      color: "from-blue-500 to-cyan-400",
    },
    {
      title: "Total Penjualan",
      value: "Rp 24.500.000",
      icon: <ShoppingBag size={28} />,
      color: "from-green-500 to-emerald-400",
    },
    {
      title: "Pelanggan Aktif",
      value: "534",
      icon: <Users size={28} />,
      color: "from-purple-500 to-pink-400",
    },
    {
      title: "Grafik Penjualan",
      value: "Naik 12%",
      icon: <BarChart3 size={28} />,
      color: "from-orange-400 to-amber-300",
    },
  ]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800  transition-all duration-300">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}  
        transition={{ duration: 0.6 }}
        className="text-4xl font-extrabold mb-3 mt-8 text-center text-gray-900"
      >
        Selamat Datang di Dashboard Admin
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-gray-500 text-center mb-10"
      >
        Pantau performa toko Anda dan kelola semua data dengan mudah.
      </motion.p>

      {/* GRID CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-6 w-full max-w-6xl">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: i * 0.1 + 0.3,
              type: "spring",
              stiffness: 100,
            }}
            className="bg-white shadow-md rounded-2xl p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300 border border-gray-100"
          >
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${card.color} text-white shadow-inner mb-4`}
            >
              {card.icon}
            </div>
            <h2 className="text-lg font-semibold">{card.title}</h2>
            <p className="text-2xl font-bold mt-2">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* CTA BUTTON */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className="mt-10 bg-black text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-gray-800 transition-all"
      >
        Tambah Produk Baru
      </motion.button>
    </main>
  );
}
