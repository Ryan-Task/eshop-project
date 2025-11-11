"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import api from "../../api/api";
import { useRouter } from "next/navigation";

type Product = { id: number; name: string; image?: string };
type Item = {
  id: number;
  product_id: number;
  price: number;
  quantity: number;
  product?: Product;
};
type Order = {
  id: number;
  rating: number | null;
  review_comment?: string | null;
  created_at?: string;
  items?: Item[];
  // NEW:
  can_edit?: boolean;
  edit_deadline?: string;
  rating_at?: string | null;
};

export default function HistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  // NEW: edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editComment, setEditComment] = useState<string>("");

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return "/images/placeholder.jpg";
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("storage/"))
      return `http://127.0.0.1:8000/${imagePath}`;
    return `http://127.0.0.1:8000/storage/${imagePath}`;
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get("/orders/reviews");
      setOrders(res.data?.orders || []);
    } catch (e) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const renderStars = (n?: number | null) => {
    const val = Math.max(0, Math.min(5, Number(n || 0)));
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => (editingId ? setEditRating(i) : undefined)}
            className={`text-sm ${
              i <= (editingId ? editRating : val)
                ? "text-yellow-500"
                : "text-gray-300"
            }`}
            disabled={!editingId}
            aria-label={`rating-${i}`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  const removeReview = async (orderId: number) => {
    if (!confirm("Hapus review untuk pesanan ini?")) return;
    try {
      setDeleting(orderId);
      await api.delete(`/orders/${orderId}/review`);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Gagal menghapus review");
    } finally {
      setDeleting(null);
    }
  };

  // NEW: begin editing
  const startEdit = (o: Order) => {
    setEditingId(o.id);
    setEditRating(Number(o.rating || 5));
    setEditComment(o.review_comment || "");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditRating(5);
    setEditComment("");
  };
  const saveEdit = async (orderId: number) => {
    try {
      await api.put(`/orders/${orderId}/review`, {
        rating: editRating,
        comment: editComment,
      });
      // update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, rating: editRating, review_comment: editComment }
            : o
        )
      );
      cancelEdit();
      alert("Review diperbarui");
    } catch (e: any) {
      alert(e?.response?.data?.message || "Gagal memperbarui review");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white pt-24 px-6 font-poppins">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-black mb-2">
          History Penilaian
        </h1>
        <p className="text-gray-600 mb-6">
          Lihat, ubah (maks 3 bulan), atau hapus penilaian kamu.
        </p>

        {orders.length === 0 ? (
          <div className="text-gray-700">Belum ada history penilaian.</div>
        ) : (
          <div className="space-y-5">
            {orders.map((o) => {
              const first = o.items?.[0]?.product;
              const canEdit = o.can_edit !== false; // default true if undefined
              return (
                <div
                  key={o.id}
                  className="border border-gray-200 rounded-2xl p-5 bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getImageUrl(first?.image)}
                        alt={first?.name || "Produk"}
                        className="w-16 h-16 rounded-lg object-cover bg-white border border-gray-200"
                        onError={(e) =>
                          ((e.currentTarget as HTMLImageElement).src =
                            "/images/placeholder.jpg")
                        }
                      />
                      <div>
                        <div className="text-sm text-gray-500">
                          Tanggal:{" "}
                          {o.created_at
                            ? new Date(o.created_at).toLocaleString("id-ID")
                            : "-"}
                        </div>
                        <div className="font-bold text-black">
                          Order #{o.id}
                        </div>
                        <div className="mt-1">{renderStars(o.rating)}</div>

                        {editingId === o.id ? (
                          <div className="mt-2">
                            <textarea
                              value={editComment}
                              onChange={(e) => setEditComment(e.target.value)}
                              rows={3}
                              placeholder="Ubah komentar (opsional)"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
                            />
                          </div>
                        ) : o.review_comment ? (
                          <div className="mt-2 text-sm text-gray-800">
                            “{o.review_comment}”
                          </div>
                        ) : null}

                        <div className="mt-2 text-xs text-gray-600">
                          {o.edit_deadline
                            ? `Batas ubah hingga: ${new Date(
                                o.edit_deadline
                              ).toLocaleString("id-ID")}`
                            : ""}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {editingId === o.id ? (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => saveEdit(o.id)}
                                className="px-4 py-2 rounded-lg font-bold bg-black text-white hover:bg-gray-800"
                              >
                                Simpan
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={cancelEdit}
                                className="px-4 py-2 rounded-lg font-bold border border-gray-300 text-gray-700 hover:bg-gray-100"
                              >
                                Batal
                              </motion.button>
                            </>
                          ) : (
                            <>
                              <motion.button
                                whileHover={{ scale: canEdit ? 1.02 : 1 }}
                                whileTap={{ scale: canEdit ? 0.98 : 1 }}
                                disabled={!canEdit}
                                onClick={() => startEdit(o)}
                                className={`px-4 py-2 rounded-lg font-bold ${
                                  canEdit
                                    ? "bg-black text-white hover:bg-gray-800"
                                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                }`}
                                title={
                                  canEdit
                                    ? "Ubah review"
                                    : "Batas waktu ubah review telah lewat"
                                }
                              >
                                Ubah Review
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={deleting === o.id}
                                onClick={() => removeReview(o.id)}
                                className="px-4 py-2 rounded-lg font-bold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
                              >
                                {deleting === o.id
                                  ? "Menghapus..."
                                  : "Hapus Review"}
                              </motion.button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/")}
            className="text-gray-700 underline text-sm"
          >
            Kembali ke Beranda
          </motion.button>
        </div>
      </div>
    </main>
  );
}
