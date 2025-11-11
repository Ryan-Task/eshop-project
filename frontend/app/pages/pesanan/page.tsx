"use client";

import { useEffect, useState, useMemo } from "react"; // + useMemo
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "../../api/api";

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
  total_price: number;
  status: string;
  shipping_status?: string | null;
  shipping_note?: string | null;
  shipping_updated_at?: string | null;
  created_at?: string;
  items?: Item[];
};

const statusLabel: Record<string, string> = {
  shipped: "Barang dikirim",
  in_transit: "Barang sedang di perjalanan",
  delivered: "Barang sudah sampai",
};

export default function PesananPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return "/images/placeholder.jpg";
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("storage/"))
      return `http://127.0.0.1:8000/${imagePath}`;
    return `http://127.0.0.1:8000/storage/${imagePath}`;
  };

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/pages/auth/login");
          return;
        }
        const res = await api.get("/orders", {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: "paid" }, // hanya ambil paid
        });
        setOrders(res.data || []);
      } catch (e) {
        console.error(e);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // NEW: Pagination (maksimal 3 per halaman)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const totalPages = Math.max(1, Math.ceil(orders.length / itemsPerPage));
  const paginatedOrders = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return orders.slice(startIdx, startIdx + itemsPerPage);
  }, [orders, currentPage]);
  useEffect(() => {
    setCurrentPage(1);
  }, [orders.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-20 font-poppins px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black text-black mb-6">Status Pesanan</h1>
        <p className="text-black mb-8">
          Lihat status pengiriman untuk pesanan kamu.
        </p>

        {orders.length === 0 ? (
          <div className="text-black">Belum ada pesanan berstatus paid.</div>
        ) : (
          <>
            <div className="space-y-6">
              {paginatedOrders.map((o) => (
                <div
                  key={o.id}
                  className="border border-gray-200 rounded-2xl p-5 bg-gray-50"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <div className="text-sm text-gray-600">Order ID</div>
                      <div className="text-black font-bold">#{o.id}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total</div>
                      <div className="text-black font-bold">
                        Rp {Number(o.total_price).toLocaleString("id-ID")}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Pembayaran</div>
                      <div
                        className={`font-bold capitalize ${
                          o.status === "paid" ? "text-green-600" : "text-black"
                        }`}
                      >
                        {o.status}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Pengiriman</div>
                      <div className="text-black font-semibold">
                        {o.shipping_status
                          ? statusLabel[o.shipping_status] || o.shipping_status
                          : "Belum dikirim"}
                      </div>
                      {o.shipping_note && (
                        <div className="text-xs text-gray-600">
                          Catatan: {o.shipping_note}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timeline sederhana */}
                  <div className="mt-4 flex items-center gap-3">
                    {["shipped", "in_transit", "delivered"].map((s, i) => {
                      const active =
                        o.shipping_status === s ||
                        (o.shipping_status === "in_transit" &&
                          (s === "shipped" || s === "in_transit")) ||
                        o.shipping_status === "delivered";
                      return (
                        <div key={s} className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              active
                                ? "bg-black text-white"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {i + 1}
                          </div>
                          {i < 2 && (
                            <div
                              className={`w-16 h-1 ${
                                active ? "bg-black" : "bg-gray-200"
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Items */}
                  <div className="mt-5">
                    <div className="text-sm text-gray-600 mb-2">Item</div>
                    <div className="space-y-2">
                      {(o.items || []).map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getImageUrl(it.product?.image)}
                              alt={
                                it.product?.name || `Produk ${it.product_id}`
                              }
                              className="w-12 h-12 rounded-md object-cover bg-white border border-gray-200"
                              onError={(e) =>
                                ((e.target as HTMLImageElement).src =
                                  "/images/placeholder.jpg")
                              }
                            />
                            <div>
                              <div className="text-black text-sm">
                                {it.product?.name || `Produk ${it.product_id}`}
                              </div>
                              <div className="text-xs text-gray-600">
                                Qty: {it.quantity} x Rp{" "}
                                {Number(it.price).toLocaleString("id-ID")}
                              </div>
                            </div>
                          </div>
                          <div className="text-black text-sm font-semibold whitespace-nowrap">
                            Rp{" "}
                            {(
                              Number(it.price) * Number(it.quantity)
                            ).toLocaleString("id-ID")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* NEW: Pagination controls */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                  currentPage === 1
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed border-gray-200"
                    : "bg-white text-black hover:bg-gray-100 border-gray-300"
                }`}
              >
                Sebelumnya
              </button>

              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold border ${
                    currentPage === i + 1
                      ? "bg-black text-white border-black"
                      : "bg-white text-black hover:bg-gray-100 border-gray-300"
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                  currentPage === totalPages
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed border-gray-200"
                    : "bg-white text-black hover:bg-gray-100 border-gray-300"
                }`}
              >
                Berikutnya
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
