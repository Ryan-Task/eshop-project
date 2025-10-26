"use client";

import { motion } from "framer-motion";
import api from "../../../api/api";

import { useRouter } from "next/navigation";

export default function FailedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center bg-white font-poppins px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
          className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <span className="text-4xl">❌</span>
        </motion.div>

        <h1 className="text-3xl font-bold mb-4 text-black">Pembayaran Gagal</h1>
        <p className="text-gray-600 mb-8">
          Terjadi kesalahan saat memproses pembayaran kamu. Silakan coba lagi.
        </p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/cart")}
          className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors"
        >
          Coba Lagi
        </motion.button>
      </motion.div>
    </div>
  );
}
