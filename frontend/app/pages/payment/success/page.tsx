"use client";

import { motion } from "framer-motion";
import api from "../../../api/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SuccessPage() {
  const router = useRouter();
  const [updating, setUpdating] = useState(true);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id");
    const statusCode = params.get("status_code");
    const txStatus = params.get("transaction_status"); // settlement | capture | pending | deny | cancel | expire

    if (!orderId) {
      setUpdating(false);
      return;
    }

    // Map status Midtrans ke status internal sederhana (fallback: paid bila 200/settlement)
    const mapped =
      txStatus === "settlement" ||
      txStatus === "capture" ||
      statusCode === "200"
        ? "paid"
        : txStatus === "pending"
        ? "pending"
        : txStatus === "expire"
        ? "expired"
        : "failed";

    (async () => {
      try {
        await api.post("/orders/update-status", {
          order_id: orderId,
          status: mapped,
          transaction_status: txStatus,
        });
        setUpdateMsg("Status pesanan berhasil diperbarui.");
      } catch (e) {
        setUpdateMsg(
          "Gagal memperbarui status pesanan. Silakan cek riwayat pesanan."
        );
        // tetap lanjut, hanya info
      } finally {
        setUpdating(false);
      }
    })();
  }, []);

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
          className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <span className="text-4xl">✅</span>
        </motion.div>

        <h1 className="text-3xl font-bold mb-2 text-black">
          Pembayaran Berhasil!
        </h1>
        <p className="text-gray-600 mb-4">
          Terima kasih telah melakukan pembayaran. Pesanan kamu sedang diproses.
        </p>
        {updating ? (
          <p className="text-gray-500 text-sm mb-6">
            Memperbarui status pesanan...
          </p>
        ) : (
          updateMsg && <p className="text-gray-600 text-sm mb-6">{updateMsg}</p>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/")}
          className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors"
        >
          Kembali ke Beranda
        </motion.button>
      </motion.div>
    </div>
  );
}
