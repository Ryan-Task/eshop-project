"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "../../../api/api";

interface Product {
  id: number;
  name: string;
  image?: string;
  image_url?: string;
  price?: number;
}
interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  product?: Product;
}
interface Order {
  id: number;
  total_price: number;
  status: string;
  created_at?: string; // tampilkan tanggal & jam
  items?: OrderItem[];
  // NEW: tambahan dari backend (fallback akan dihitung di frontend bila tidak ada)
  computed_shipping_cost?: number;
  shipping_method?: string;
  shipping_cost?: number; // NEW: kolom dari DB
}

declare global {
  interface Window {
    snap: any;
  }
}

// NEW: inline placeholder to prevent 404
const FALLBACK_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%23e5e7eb'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='12'>No Image</text></svg>";

export default function PendingPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Carousel order
  const [orderIdx, setOrderIdx] = useState(0);
  const [isDraggingOrder, setIsDraggingOrder] = useState(false);
  const [startXOrder, setStartXOrder] = useState(0);
  const [offsetXOrder, setOffsetXOrder] = useState(0);

  // Carousel gambar per order
  const [indices, setIndices] = useState<Record<number, number>>({});
  const [draggingImg, setDraggingImg] = useState<Record<number, boolean>>({});
  const [startXImg, setStartXImg] = useState<Record<number, number>>({});
  const [offsetXImg, setOffsetXImg] = useState<Record<number, number>>({});

  useEffect(() => {
    const fetchPendingOrder = async () => {
      try {
        const response = await api.get("/orders/pending");
        if (response.data && Array.isArray(response.data.orders)) {
          setOrders(response.data.orders);
        } else {
          setOrders([]);
        }
      } catch (error) {
        console.error("Gagal mengambil order pending:", error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPendingOrder();
  }, []);

  const handlePayAgain = async (orderId: number) => {
    try {
      const response = await api.post("/midtrans/checkout", {
        order_id: orderId,
      });
      const { snap_token } = response.data;
      if (!snap_token) throw new Error("Snap token tidak ditemukan");
      window.snap.pay(snap_token, {
        onSuccess: () => router.push("/pages/payment/success"),
        onPending: () => router.push("/pages/payment/pending"),
        onError: () => router.push("/pages/payment/failed"),
        onClose: () => router.push("/pages/payment/pending"),
      });
    } catch (error) {
      console.error("Gagal membuat ulang pembayaran:", error);
    }
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute(
      "data-client-key",
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ""
    );
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Helper URL gambar (sama seperti beranda)
  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return FALLBACK_IMG;
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("storage/"))
      return `http://127.0.0.1:8000/${imagePath}`;
    return `http://127.0.0.1:8000/storage/${imagePath}`;
  };

  // Format tanggal & jam Indonesia
  const formatDateTime = (iso?: string) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return iso;
    }
  };

  // Kumpulan gambar unik per order (berdasarkan product_id)
  const uniqueProductImagesByOrder = useMemo(() => {
    const map: Record<number, { url: string; name: string }[]> = {};
    for (const o of orders) {
      const seen = new Set<number>();
      const imgs: { url: string; name: string }[] = [];
      (o.items || []).forEach((it) => {
        if (!it.product_id || seen.has(it.product_id)) return;
        seen.add(it.product_id);
        const raw = it.product?.image_url || it.product?.image || "";
        imgs.push({
          url: getImageUrl(raw),
          name: it.product?.name || `Produk ${it.product_id}`,
        });
      });
      map[o.id] = imgs.length
        ? imgs
        : [{ url: getImageUrl(""), name: "Produk" }];
    }
    return map;
  }, [orders]);

  // Hitung waktu tersisa
  const getTimeRemaining = (createdAt?: string) => {
    if (!createdAt) return "N/A";
    try {
      const created = new Date(createdAt);
      const now = new Date();
      const expiryTime = new Date(created.getTime() + 24 * 60 * 60 * 1000); // +24 jam
      const remaining = expiryTime.getTime() - now.getTime();

      if (remaining <= 0) return "Expired";

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      return `${hours} jam ${minutes} menit`;
    } catch {
      return "N/A";
    }
  };

  // Auto refresh setiap menit untuk update countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders((prev) => [...prev]); // Force re-render untuk update countdown
    }, 60000); // Update setiap 1 menit

    return () => clearInterval(interval);
  }, []);

  // Carousel order: prev/next
  const nextOrder = () =>
    setOrderIdx((i) => (orders.length ? (i + 1) % orders.length : 0));
  const prevOrder = () =>
    setOrderIdx((i) =>
      orders.length ? (orders.length + i - 1) % orders.length : 0
    );

  // Carousel order: drag handlers
  const handlePointerDownOrder = (e: React.PointerEvent) => {
    setIsDraggingOrder(true);
    setStartXOrder(e.clientX);
    setOffsetXOrder(0);
  };
  const handlePointerMoveOrder = (e: React.PointerEvent) => {
    if (!isDraggingOrder) return;
    setOffsetXOrder(e.clientX - startXOrder);
  };
  const handlePointerUpOrder = () => {
    if (!isDraggingOrder) return;
    setIsDraggingOrder(false);
    const threshold = 50;
    if (offsetXOrder < -threshold) nextOrder();
    else if (offsetXOrder > threshold) prevOrder();
    setOffsetXOrder(0);
  };

  // Carousel gambar: prev/next per order
  const nextImg = (orderId: number) => {
    const total = uniqueProductImagesByOrder[orderId]?.length || 1;
    setIndices((prev) => ({
      ...prev,
      [orderId]: ((prev[orderId] ?? 0) + 1) % total,
    }));
  };
  const prevImg = (orderId: number) => {
    const total = uniqueProductImagesByOrder[orderId]?.length || 1;
    setIndices((prev) => ({
      ...prev,
      [orderId]: (total + (prev[orderId] ?? 0) - 1) % total,
    }));
  };

  // Carousel gambar: drag handlers per order
  const handlePointerDownImg = (orderId: number, e: React.PointerEvent) => {
    setDraggingImg((prev) => ({ ...prev, [orderId]: true }));
    setStartXImg((prev) => ({ ...prev, [orderId]: e.clientX }));
    setOffsetXImg((prev) => ({ ...prev, [orderId]: 0 }));
  };
  const handlePointerMoveImg = (orderId: number, e: React.PointerEvent) => {
    if (!draggingImg[orderId]) return;
    const start = startXImg[orderId] ?? e.clientX;
    setOffsetXImg((prev) => ({ ...prev, [orderId]: e.clientX - start }));
  };
  const handlePointerUpImg = (orderId: number) => {
    if (!draggingImg[orderId]) return;
    setDraggingImg((prev) => ({ ...prev, [orderId]: false }));
    const threshold = 50;
    const offset = offsetXImg[orderId] ?? 0;
    if (offset < -threshold) nextImg(orderId);
    else if (offset > threshold) prevImg(orderId);
    setOffsetXImg((prev) => ({ ...prev, [orderId]: 0 }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-gray-500 text-lg"
        >
          Memuat data pembayaran...
        </motion.div>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-gray-600 text-lg"
        >
          Tidak ada pembayaran pending.
        </motion.div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/")}
          className="mt-6 bg-black text-white px-8 py-3 rounded-full font-semibold"
        >
          Kembali ke Beranda
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center bg-white font-poppins px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-5xl"
      >
        <h1 className="text-3xl font-bold mb-6 text-black">
          Menunggu Pembayaran
        </h1>
        <p className="text-gray-600 mb-8">
          Geser kartu ke kanan/kiri untuk melihat semua pesanan yang belum
          dibayar.
        </p>

        {/* Carousel Order */}
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{ touchAction: "pan-y" }}
        >
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(calc(-${
                orderIdx * 100
              }% + ${offsetXOrder}px))`,
            }}
            onPointerDown={handlePointerDownOrder}
            onPointerMove={handlePointerMoveOrder}
            onPointerUp={handlePointerUpOrder}
            onPointerLeave={() => {
              if (isDraggingOrder) handlePointerUpOrder();
            }}
          >
            {orders.map((order) => {
              const imgs = uniqueProductImagesByOrder[order.id] || [];
              const idx = indices[order.id] ?? 0;
              const imgOffset = offsetXImg[order.id] ?? 0;
              const timeRemaining = getTimeRemaining(order.created_at);

              // NEW: hitung subtotal & ongkir (fallback jika backend belum kirim)
              const subtotal = (order.items || []).reduce(
                (s, it) =>
                  s + (Number(it.price) || 0) * (Number(it.quantity) || 0),
                0
              );
              const shippingCost =
                typeof order.shipping_cost === "number"
                  ? Math.max(0, Number(order.shipping_cost))
                  : typeof order.computed_shipping_cost === "number"
                  ? Math.max(0, Number(order.computed_shipping_cost))
                  : Math.max(0, Number(order.total_price || 0) - subtotal);
              const shippingMethod = order.shipping_method || "Ongkos Kirim";

              return (
                <div key={order.id} className="w-full shrink-0 px-2">
                  <div className="bg-gray-50 rounded-2xl p-5 shadow-md text-left">
                    {/* ✅ Waktu Tersisa Badge */}
                    <div className="mb-3 inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-semibold">
                      ⏰ Waktu tersisa: {timeRemaining}
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-5">
                      {/* Left: info */}
                      <div className="flex-1">
                        <div className="mb-2 text-sm text-gray-500">
                          Tanggal:{" "}
                          <span className="font-medium text-gray-800">
                            {formatDateTime(order.created_at)}
                          </span>
                        </div>
                        <p className="text-gray-700 font-semibold mb-1">
                          ID Pesanan:
                        </p>
                        <p className="text-black mb-3">#{order.id}</p>

                        {/* NEW: breakdown pembayaran */}
                        <p className="text-gray-700 font-semibold mb-1">
                          Rincian Pembayaran:
                        </p>
                        <div className="mb-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-700">Subtotal</span>
                            <span className="text-black">
                              Rp {subtotal.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">
                              Ongkir
                              {shippingMethod ? ` (${shippingMethod})` : ""}
                            </span>
                            <span className="text-black">
                              Rp {shippingCost.toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="border-t border-gray-300 my-2" />
                          <div className="flex justify-between font-bold">
                            <span className="text-gray-900">Total</span>
                            <span className="text-black">
                              Rp{" "}
                              {Number(order.total_price).toLocaleString(
                                "id-ID"
                              )}
                            </span>
                          </div>
                        </div>

                        <p className="text-gray-700 font-semibold mb-1">
                          Status:
                        </p>
                        <p className="text-yellow-500 font-bold capitalize mb-4">
                          {order.status}
                        </p>

                        {/* Detail Barang - tampilkan semua item pada order */}
                        <div className="mt-3">
                          <p className="text-gray-700 font-semibold mb-2">
                            Detail Barang ({order.items?.length || 0})
                          </p>
                          <div className="space-y-2">
                            {(order.items || []).map((it) => {
                              const imgUrl = getImageUrl(
                                it.product?.image || it.product?.image_url || ""
                              );
                              return (
                                <div
                                  key={it.id}
                                  className="flex items-center justify-between gap-3 border border-gray-200 bg-white rounded-lg p-2"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={imgUrl}
                                      alt={
                                        it.product?.name ||
                                        `Produk ${it.product_id}`
                                      }
                                      loading="lazy"
                                      decoding="async"
                                      fetchPriority="low"
                                      className="w-12 h-12 rounded-md object-cover bg-gray-100 border border-gray-200 flex-shrink-0"
                                      onError={(e) =>
                                        ((
                                          e.currentTarget as HTMLImageElement
                                        ).src = FALLBACK_IMG)
                                      }
                                    />
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-black truncate">
                                        {it.product?.name ||
                                          `Produk ${it.product_id}`}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        Qty: {it.quantity} × Rp{" "}
                                        {Number(it.price).toLocaleString(
                                          "id-ID"
                                        )}
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
                              );
                            })}
                            {(!order.items || order.items.length === 0) && (
                              <div className="text-xs text-gray-500">
                                Tidak ada item pada order ini.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                          <button
                            onClick={() => handlePayAgain(order.id)}
                            className="px-5 py-2.5 rounded-lg font-bold text-sm bg-black text-white hover:bg-gray-800 transition-colors"
                          >
                            Bayar Sekarang
                          </button>
                          <button
                            onClick={() => router.push("/pages/cart")}
                            className="px-5 py-2.5 rounded-lg font-bold text-sm border border-gray-300 text-black hover:bg-gray-100 transition-colors"
                          >
                            Lihat Keranjang
                          </button>
                        </div>
                      </div>

                      {/* Right: carousel gambar produk unik */}
                      <div
                        className="w-full md:w-72 bg-white rounded-2xl border border-gray-200 p-4 flex flex-col"
                        onPointerDown={(e) => handlePointerDownImg(order.id, e)}
                        onPointerMove={(e) => handlePointerMoveImg(order.id, e)}
                        onPointerUp={() => handlePointerUpImg(order.id)}
                        onPointerLeave={() => handlePointerUpImg(order.id)}
                        style={{ touchAction: "pan-y" }}
                      >
                        <div className="flex-1 flex items-center justify-center overflow-hidden relative">
                          <div
                            className="flex transition-transform duration-300 ease-out w-full"
                            style={{
                              transform: `translateX(calc(-${
                                idx * 100
                              }% + ${imgOffset}px))`,
                            }}
                          >
                            {imgs.map((im, i) => (
                              <div key={i} className="w-full shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={im.url}
                                  alt={im.name}
                                  loading="lazy"
                                  decoding="async"
                                  fetchPriority="low"
                                  className="object-contain w-full h-56 p-3"
                                  draggable={false}
                                  onError={(e) =>
                                    ((e.currentTarget as HTMLImageElement).src =
                                      FALLBACK_IMG)
                                  }
                                />
                                <div className="text-center text-xs text-gray-700 font-medium truncate px-1">
                                  {im.name}
                                </div>
                              </div>
                            ))}
                          </div>
                          {imgs.length > 1 && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  prevImg(order.id);
                                }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-black border border-gray-300 hover:border-black rounded-full w-8 h-8 flex items-center justify-center text-sm shadow"
                                aria-label="Prev image"
                              >
                                ‹
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  nextImg(order.id);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-black border border-gray-300 hover:border-black rounded-full w-8 h-8 flex items-center justify-center text-sm shadow"
                                aria-label="Next image"
                              >
                                ›
                              </button>
                            </>
                          )}
                        </div>
                        {imgs.length > 1 && (
                          <div className="flex justify-center gap-1 mt-2">
                            {imgs.map((_, i) => (
                              <button
                                key={i}
                                onClick={() =>
                                  setIndices((p) => ({ ...p, [order.id]: i }))
                                }
                                className={`h-1.5 rounded-full transition-all ${
                                  i === idx ? "bg-black w-6" : "bg-gray-300 w-2"
                                }`}
                                aria-label={`Go to image ${i + 1}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigasi antar order */}
          {orders.length > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={prevOrder}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-100"
              >
                ‹ Sebelumnya
              </button>
              <div className="flex gap-1">
                {orders.map((o, i) => (
                  <button
                    key={o.id}
                    onClick={() => setOrderIdx(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === orderIdx ? "bg-black w-8" : "bg-gray-300 w-2"
                    }`}
                    aria-label={`Go to order ${o.id}`}
                  />
                ))}
              </div>
              <button
                onClick={nextOrder}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-100"
              >
                Berikutnya ›
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
