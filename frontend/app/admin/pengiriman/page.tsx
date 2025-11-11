"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "../../api/api";
import ToastHost, { showToast } from "../../components/Toast";

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
  shipping_status?: string | null; // bisa: null | 'in_transit' | 'delivered_admin' | 'delivered'
  shipping_note?: string | null;
  shipping_updated_at?: string | null;
  items?: Item[];
  created_at?: string;
  shipping_method?: string | null;
  shipping_cost?: number | null;
};

export default function AdminPengirimanPage() {
  const router = useRouter();

  const allowed = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      const token = localStorage.getItem("token");
      const role =
        JSON.parse(localStorage.getItem("user") || "{}")?.role || "user";
      if (!token || role !== "admin") {
        router.replace("/admin/login");
        return false;
      }
      return true;
    } catch {
      router.replace("/admin/login");
      return false;
    }
  }, [router]);

  if (!allowed) return null;

  // NEW: logout handler
  const adminLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("authChange"));
    } catch {}
    router.replace("/admin/login");
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [note, setNote] = useState<Record<number, string>>({});

  // NEW: Pagination (maksimal 3 per halaman)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const totalPages = Math.max(1, Math.ceil(orders.length / itemsPerPage));
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = orders.slice(startIdx, startIdx + itemsPerPage);

  useEffect(() => {
    // Reset ke halaman 1 bila daftar order berubah
    setCurrentPage(1);
  }, [orders.length]);

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return "/images/placeholder.jpg";
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("storage/"))
      return `http://127.0.0.1:8000/${imagePath}`;
    return `http://127.0.0.1:8000/storage/${imagePath}`;
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/pages/auth/login");
        return;
      }
      const res = await api.get("/admin/shipping/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data?.orders || []);
    } catch (e) {
      console.error(e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateShipping = async (
    orderId: number,
    shipping_status: "in_transit" | "delivered_admin" | "delivered"
  ) => {
    try {
      setUpdating(orderId);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/pages/auth/login");
        return;
      }
      await api.post(
        `/admin/shipping/orders/${orderId}/status`,
        { shipping_status, shipping_note: note[orderId] || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchOrders();
      showToast("success", "Status pengiriman diperbarui");
    } catch (e) {
      console.error(e);
      showToast("error", "Gagal memperbarui status pengiriman");
    } finally {
      setUpdating(null);
    }
  };

  // NEW: compact user avatar state for sidebar
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userInitial, setUserInitial] = useState<string>("A");
  const [userTitle, setUserTitle] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return;
      const u = JSON.parse(raw || "{}");
      setUserInitial(String(u?.name?.[0] || "A").toUpperCase());
      setUserTitle([u?.name, u?.role].filter(Boolean).join(" • "));
      const path = u?.profile_image || null;
      if (path) {
        const norm = (p: string) => {
          if (!p) return null;
          const s = String(p).trim().replace(/^\/+/, "");
          if (s.startsWith("http")) return s;
          if (s.startsWith("storage/")) return `http://127.0.0.1:8000/${s}`;
          if (s.startsWith("public/"))
            return `http://127.0.0.1:8000/storage/${s.replace(
              /^public\//,
              ""
            )}`;
          return `http://127.0.0.1:8000/storage/${s}`;
        };
        setUserAvatar(norm(String(path)));
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <>
      <ToastHost />
      {/* NEW: Sidebar (compact, overflow-hidden, icon-only) */}
      <aside className="fixed left-0 top-0 bottom-0 w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2 z-40 overflow-hidden">
        {/* NEW: user avatar 40px */}
        <div
          title={userTitle || "Admin"}
          className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center"
        >
          {userAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userAvatar}
              alt="avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-xs font-bold text-gray-700 select-none">
              {userInitial}
            </span>
          )}
        </div>

        <a
          href="/admin/show"
          title="Produk"
          className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-xs font-bold hover:bg-gray-50"
        >
          P
        </a>
        <a
          href="/admin/pengiriman"
          title="Pengiriman"
          className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-xs font-bold hover:bg-gray-50"
        >
          K
        </a>
        <a
          href="/admin/upcoming"
          title="Upcoming"
          className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-xs font-bold hover:bg-gray-50"
        >
          U
        </a>
        {/* NEW: History selesai */}
        <a
          href="/admin/orders/completed"
          title="History Selesai"
          className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-[10px] font-bold hover:bg-gray-50"
        >
          H
        </a>
        <div className="flex-1" />
        <button
          onClick={adminLogout}
          title="Logout Admin"
          className="mb-2 w-10 h-10 rounded-lg border border-red-300 text-red-600 flex items-center justify-center text-[10px] font-bold hover:bg-red-50"
        >
          Out
        </button>
      </aside>

      {/* ...existing code... */}
      <div className="min-h-screen bg-white pt-20 font-poppins px-6 md:pl-[80px]">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-black text-black mb-6">
            Pengiriman (Testing)
          </h1>
          <p className="text-black mb-8">
            Semua user yang login bisa mengatur status pengiriman untuk
            keperluan testing.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mr-3" />
              <span className="text-gray-600 font-medium">
                Memuat orders...
              </span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-black py-8 text-center">
              Tidak ada order berstatus paid.
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {paginatedOrders.map((o) => {
                  const canToInTransit = !o.shipping_status;
                  const canToDeliveredAdmin =
                    o.shipping_status === "in_transit";
                  const waitingUser = o.shipping_status === "delivered_admin";
                  const isFinal = o.shipping_status === "delivered";

                  // NEW: fallback untuk ongkir jika null
                  const shippingCost =
                    typeof o.shipping_cost === "number" ? o.shipping_cost : 0;

                  return (
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
                          <div className="text-sm text-gray-600">
                            Status Pembayaran
                          </div>
                          <div className="text-green-600 font-bold capitalize">
                            {o.status}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">
                            Status Pengiriman
                          </div>
                          <div className="text-black font-semibold capitalize">
                            {o.shipping_status || "Belum dikirim"}
                          </div>
                          {o.shipping_note && (
                            <div className="text-xs text-gray-600">
                              Catatan: {o.shipping_note}
                            </div>
                          )}
                        </div>
                        {/* NEW: Info Kurir/Layanan */}
                        <div>
                          <div className="text-sm text-gray-600">
                            Metode Pengiriman
                          </div>
                          <div className="text-black font-semibold">
                            {o.shipping_method || "-"}
                          </div>
                          <div className="text-xs text-gray-600">
                            Ongkir: Rp{" "}
                            {Number(shippingCost).toLocaleString("id-ID")}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-sm text-gray-600 mb-1">
                          Catatan (opsional)
                        </div>
                        <input
                          type="text"
                          value={note[o.id] || ""}
                          onChange={(e) =>
                            setNote((p) => ({ ...p, [o.id]: e.target.value }))
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
                          placeholder="Masukkan catatan pengiriman (opsional)"
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Button: set in_transit */}
                        <motion.button
                          whileHover={{ scale: canToInTransit ? 1.02 : 1 }}
                          whileTap={{ scale: canToInTransit ? 0.98 : 1 }}
                          disabled={updating === o.id || !canToInTransit}
                          onClick={() => updateShipping(o.id, "in_transit")}
                          className={`py-2 rounded-lg font-bold ${
                            canToInTransit
                              ? "bg-black text-white hover:bg-gray-800"
                              : "bg-gray-200 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          Dalam Perjalanan
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: canToDeliveredAdmin ? 1.02 : 1 }}
                          whileTap={{ scale: canToDeliveredAdmin ? 0.98 : 1 }}
                          disabled={updating === o.id || !canToDeliveredAdmin}
                          onClick={() =>
                            updateShipping(o.id, "delivered_admin")
                          }
                          className={`py-2 rounded-lg font-bold ${
                            canToDeliveredAdmin
                              ? "bg-black text-white hover:bg-gray-800"
                              : "bg-gray-200 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          Admin Terkirim
                        </motion.button>
                      </div>

                      {waitingUser && (
                        <div className="mt-3 text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded-lg">
                          Menunggu konfirmasi penerimaan dari user.
                        </div>
                      )}
                      {isFinal && (
                        <div className="mt-3 text-sm text-green-700 bg-green-100 px-3 py-2 rounded-lg">
                          Pesanan selesai (user sudah konfirmasi).
                        </div>
                      )}

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
                                    it.product?.name ||
                                    `Produk ${it.product_id}`
                                  }
                                  className="w-12 h-12 rounded-md object-cover bg-white border border-gray-200"
                                  onError={(e) =>
                                    ((e.target as HTMLImageElement).src =
                                      "/images/placeholder.jpg")
                                  }
                                />
                                <div>
                                  <div className="text-black text-sm">
                                    {it.product?.name ||
                                      `Produk ${it.product_id}`}
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
                  );
                })}
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
    </>
  );
}
