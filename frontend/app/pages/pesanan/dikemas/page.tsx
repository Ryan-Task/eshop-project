"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "../../../api/api";

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
  created_at?: string;
  items?: Item[];
};

export default function DikemasPage() {
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
        if (!token) return router.push("/pages/auth/login");
        const res = await api.get("/orders", {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: "paid" },
        });
        const all: Order[] = res.data || [];
        setOrders(all.filter((o) => !o.shipping_status));
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const totalPages = Math.max(1, Math.ceil(orders.length / itemsPerPage));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return orders.slice(start, start + itemsPerPage);
  }, [orders, currentPage]);
  useEffect(() => setCurrentPage(1), [orders.length]);

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
        <h1 className="text-3xl font-black text-black mb-6">Pesanan Dikemas</h1>
        <p className="text-black mb-8">
          Pesanan yang sudah dibayar dan sedang diproses penjual.
        </p>

        {orders.length === 0 ? (
          <div className="text-black">Belum ada pesanan dikemas.</div>
        ) : (
          <>
            <div className="space-y-6">
              {paginated.map((o) => (
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
                      <div className="text-green-600 font-bold capitalize">
                        {o.status}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Status</div>
                      <div className="text-black font-semibold">Dikemas</div>
                    </div>
                  </div>

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

            {/* Pagination */}
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
