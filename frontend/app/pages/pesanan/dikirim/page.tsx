"use client";

import { useEffect, useState } from "react";
import api from "../../../api/api";
import { useRouter } from "next/navigation";
import ToastHost, { showToast } from "../../../components/Toast";
import { motion } from "framer-motion";

type Product = { id: number; name: string; image?: string; price?: number };
type Item = {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  product?: Product;
};
type Order = {
  id: number;
  status: string;
  shipping_status?: string | null;
  shipping_method?: string | null;
  shipping_cost?: number | null;
  items?: Item[];
  created_at?: string;
};

export default function DikirimPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/pages/auth/login");
        return;
      }
      const res = await api.get("/orders", {
        params: { status: "paid" },
        headers: { Authorization: `Bearer ${token}` },
      });
      const list: Order[] = Array.isArray(res.data) ? res.data : [];
      // Ambil hanya yang menunggu konfirmasi user (shipping_status = delivered_admin)
      setOrders(list.filter((o) => o.shipping_status === "delivered_admin"));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return "/images/placeholder.jpg";
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("storage/"))
      return `http://127.0.0.1:8000/${imagePath}`;
    return `http://127.0.0.1:8000/storage/${imagePath}`;
  };

  const handleConfirm = async (orderId: number) => {
    try {
      setConfirming(orderId);
      await api.post(`/orders/${orderId}/confirm-delivered`, {});
      showToast("success", `Order #${orderId} dikonfirmasi diterima`);
      await fetchOrders();
      // Opsional: arahkan ke halaman penilaian jika ada
      router.push("/pages/pesanan/beri-penilaian");
    } catch (e: any) {
      showToast(
        "error",
        e?.response?.data?.message || "Gagal konfirmasi penerimaan"
      );
    } finally {
      setConfirming(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pt-20 font-poppins px-6">
      <ToastHost />
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-black mb-4">Pesanan Dikirim</h1>
        <p className="text-gray-600 mb-8">
          Berikut pesanan yang sudah dikirim oleh admin. Konfirmasi jika sudah
          kamu terima.
        </p>

        {orders.length === 0 ? (
          <div className="text-gray-700">
            Tidak ada pesanan yang menunggu konfirmasi.
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((o) => {
              const shippingCost = Number(o.shipping_cost || 0);
              const subtotal = (o.items || []).reduce(
                (s, it) =>
                  s + (Number(it.price) || 0) * (Number(it.quantity) || 0),
                0
              );
              return (
                <div
                  key={o.id}
                  className="border border-gray-200 rounded-2xl p-5 bg-gray-50"
                >
                  <div className="flex flex-wrap justify-between gap-3 mb-4">
                    <div>
                      <div className="text-xs text-gray-500">Order</div>
                      <div className="text-black font-bold">#{o.id}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Status</div>
                      <div className="text-blue-600 font-semibold">
                        {o.shipping_status === "delivered_admin"
                          ? "Menunggu Konfirmasi Kamu"
                          : o.shipping_status}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">
                        Metode Pengiriman
                      </div>
                      <div className="text-black font-semibold">
                        {o.shipping_method || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Ongkir</div>
                      <div className="text-black font-semibold">
                        Rp {shippingCost.toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Total</div>
                      <div className="text-black font-bold">
                        Rp {(subtotal + shippingCost).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {(o.items || []).map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 p-2"
                      >
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getImageUrl(it.product?.image)}
                            alt={it.product?.name || `Produk ${it.product_id}`}
                            className="w-12 h-12 rounded-md object-cover bg-gray-100 border border-gray-200"
                            onError={(e) =>
                              ((e.currentTarget as HTMLImageElement).src =
                                "/images/placeholder.jpg")
                            }
                          />
                          <div>
                            <div className="text-sm text-black font-semibold">
                              {it.product?.name || `Produk ${it.product_id}`}
                            </div>
                            <div className="text-xs text-gray-600">
                              Qty: {it.quantity} × Rp{" "}
                              {Number(it.price).toLocaleString("id-ID")}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-black whitespace-nowrap">
                          Rp{" "}
                          {(
                            Number(it.price) * Number(it.quantity)
                          ).toLocaleString("id-ID")}
                        </div>
                      </div>
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={confirming === o.id}
                    onClick={() => handleConfirm(o.id)}
                    className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-60"
                  >
                    {confirming === o.id
                      ? "Mengonfirmasi..."
                      : "Saya Sudah Menerima Barang"}
                  </motion.button>
                  <p className="text-xs text-gray-600 mt-3">
                    Setelah dikonfirmasi, pesanan akan masuk tahap selesai dan
                    dapat kamu beri rating.
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
