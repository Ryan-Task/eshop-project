"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "../../../api/api";

type Product = { id: number; name: string; image?: string; price?: number };
type Item = {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  product?: Product;
  rating?: number | null;
};
type Order = {
  id: number;
  total_price: number;
  status: string;
  shipping_status?: string | null;
  rating?: number | null;
  items?: Item[];
  customer_confirmed_at?: string | null; // NEW
};

const Star = ({
  filled,
  size = "text-4xl",
}: {
  filled: boolean;
  size?: string;
}) => (
  <span className={`${size} ${filled ? "text-yellow-500" : "text-gray-300"}`}>
    ★
  </span>
);

export default function BeriPenilaianPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);

  // Hanya rating order + komentar
  const [orderRatings, setOrderRatings] = useState<Record<number, number>>({});
  const [orderComments, setOrderComments] = useState<Record<number, string>>(
    {}
  );

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return "/images/placeholder.svg";
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
          params: { status: "paid" },
        });
        const all: Order[] = res.data || [];
        const candidates = all.filter(
          (o) =>
            o.shipping_status === "delivered" &&
            !!o.customer_confirmed_at && // NEW: wajib sudah dikonfirmasi user
            (o.rating === null || typeof o.rating === "undefined")
        );
        setOrders(candidates);

        // init default rating 5 dan komentar kosong
        const initR: Record<number, number> = {};
        const initC: Record<number, string> = {};
        candidates.forEach((o) => {
          initR[o.id] = 5;
          initC[o.id] = "";
        });
        setOrderRatings(initR);
        setOrderComments(initC);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (orderId: number) => {
    try {
      setSubmitting(orderId);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/pages/auth/login");
        return;
      }
      const payload = {
        rating: orderRatings[orderId] || 5,
        comment: orderComments[orderId] || "",
      };
      await api.post(`/orders/${orderId}/rate`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Terima kasih! Penilaian kamu sudah tersimpan.");
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (e: any) {
      console.error(e);
      alert(
        e?.response?.data?.message ||
          "Gagal menyimpan penilaian. Pastikan pesanan sudah delivered dan belum pernah dinilai."
      );
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-20 font-poppins px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black text-black mb-6">Beri Penilaian</h1>
        <p className="text-black mb-8">
          Beri penilaian untuk pesanan yang telah terkirim.
        </p>

        {orders.length === 0 ? (
          <div className="text-black">
            Tidak ada pesanan delivered yang perlu dinilai.
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((o) => (
              <div
                key={o.id}
                className="border border-gray-200 rounded-2xl p-5 bg-gray-50"
              >
                <div className="flex flex-wrap justify-between gap-3 mb-4">
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
                    <div className="text-sm text-gray-600">Status</div>
                    <div className="text-green-600 font-bold capitalize">
                      {o.shipping_status}
                    </div>
                  </div>
                </div>

                {/* Produk ringkasan singkat (opsional) */}
                <div className="mt-2 mb-4">
                  <div className="flex flex-wrap gap-2">
                    {(o.items || []).slice(0, 3).map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center gap-2 border border-gray-200 rounded-md bg-white px-2 py-1"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getImageUrl(it.product?.image)}
                          alt={it.product?.name || `Produk ${it.product_id}`}
                          className="w-8 h-8 rounded object-cover"
                          onError={(e) =>
                            ((e.target as HTMLImageElement).src =
                              "/images/placeholder.svg")
                          }
                        />
                        <span className="text-xs text-black">
                          {it.product?.name || `Produk ${it.product_id}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rating Order - hanya satu blok, bintang besar */}
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">
                    Rating Pesanan
                  </div>
                  <div className="flex items-center gap-3">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        onClick={() =>
                          setOrderRatings((p) => ({ ...p, [o.id]: v }))
                        }
                        className="focus:outline-none"
                        aria-label={`Rating ${v}`}
                      >
                        <Star
                          filled={(orderRatings[o.id] || 0) >= v}
                          size="text-4xl"
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-black text-sm">
                      {orderRatings[o.id] || 0}/5
                    </span>
                  </div>
                </div>

                {/* Komentar Review */}
                <div className="mb-2">
                  <div className="text-sm text-gray-600 mb-2">
                    Komentar (opsional)
                  </div>
                  <textarea
                    value={orderComments[o.id] || ""}
                    onChange={(e) =>
                      setOrderComments((p) => ({
                        ...p,
                        [o.id]: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Ceritakan pengalaman belanjamu... (kualitas produk, pengemasan, pengiriman, dsb.)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-black"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={submitting === o.id}
                  onClick={() => handleSubmit(o.id)}
                  className="mt-4 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-60"
                >
                  {submitting === o.id ? "Menyimpan..." : "Kirim Penilaian"}
                </motion.button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
