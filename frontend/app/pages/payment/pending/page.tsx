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
}

declare global {
  interface Window {
    snap: any;
  }
}

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
      const response = await api.post("/midtrans/checkout", { order_id: orderId });
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
    script.setAttribute("data-client-key", process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "");
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Helper URL gambar (sama seperti beranda)
  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return "/images/placeholder.jpg";
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("storage/")) return `http://127.0.0.1:8000/${imagePath}`;
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
      map[o.id] = imgs.length ? imgs : [{ url: getImageUrl(""), name: "Produk" }];
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
  const nextOrder = () => setOrderIdx((i) => (orders.length ? (i + 1) % orders.length : 0));
  const prevOrder = () => setOrderIdx((i) => (orders.length ? (orders.length + i - 1) % orders.length : 0));

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
    setIndices((prev) => ({ ...prev, [orderId]: ((prev[orderId] ?? 0) + 1) % total }));
  };
  const prevImg = (orderId: number) => {
    const total = uniqueProductImagesByOrder[orderId]?.length || 1;
    setIndices((prev) => ({ ...prev, [orderId]: (total + (prev[orderId] ?? 0) - 1) % total }));
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-500 text-lg">
          Memuat data pembayaran...
        </motion.div>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-600 text-lg">
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
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-6 text-black">Menunggu Pembayaran</h1>
        <p className="text-gray-600 mb-8">Geser kartu ke kanan/kiri untuk melihat semua pesanan yang belum dibayar.</p>

        {/* Carousel Order */}
        <div className="relative overflow-hidden rounded-2xl" style={{ touchAction: "pan-y" }}>
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(calc(-${orderIdx * 100}% + ${offsetXOrder}px))`,
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
                          Tanggal: <span className="font-medium text-gray-800">{formatDateTime(order.created_at)}</span>
                        </div>
                        <p className="text-gray-700 font-semibold mb-1">ID Pesanan:</p>
                        <p className="text-black mb-3">#{order.id}</p>

                        <p className="text-gray-700 font-semibold mb-1">Total Pembayaran:</p>
                        <p className="text-black mb-3">Rp {order.total_price.toLocaleString("id-ID")}</p>

                        <p className="text-gray-700 font-semibold mb-1">Status:</p>
                        <p className="text-yellow-500 font-bold capitalize mb-4">{order.status}</p>

                        {/* Detail Barang - tampilkan semua item pada order */}
                        <div className="mt-3">
                          <p className="text-gray-700 font-semibold mb-2">
                            Detail Barang ({order.items?.length || 0})
                          </p>
                          <div className="space-y-2 max-h-44 overflow-auto pr-1">
                            {(order.items || []).map((it) => {
                              const imgUrl = getImageUrl(it.product?.image_url || it.product?.image || "");
                              const name = it.product?.name || `Produk ${it.product_id}`;
                              const lineTotal = (Number(it.price) || 0) * (Number(it.quantity) || 0);
                              return (
                                <div key={it.id} className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={imgUrl}
                                      alt={name}
                                      className="w-12 h-12 rounded-md object-cover bg-white border border-gray-200 flex-shrink-0"
                                      onError={(e) => ((e.target as HTMLImageElement).src = "/images/placeholder.jpg")}
                                    />
                                    <div className="min-w-0">
                                      <p className="text-sm text-black truncate">{name}</p>
                                      <p className="text-xs text-gray-500">
                                        Qty: {it.quantity} x Rp {Number(it.price).toLocaleString("id-ID")}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-sm font-semibold text-black whitespace-nowrap">
                                    Rp {lineTotal.toLocaleString("id-ID")}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePayAgain(order.id)}
                          className="mt-4 bg-black text-white px-6 py-2 rounded-full font-bold hover:bg-gray-800 transition-colors"
                          disabled={timeRemaining === "Expired"}
                        >
                          {timeRemaining === "Expired" ? "Expired" : "Bayar Sekarang"}
                        </motion.button>
                      </div>

                      {/* Right: carousel gambar */}
                      <div className="w-full md:w-72 lg:w-80 self-stretch md:self-center">
                        <div
                          className="relative overflow-hidden rounded-xl border border-gray-200 bg-white select-none"
                          style={{ touchAction: "pan-y" }}
                        >
                          <div
                            className="flex transition-transform duration-300 ease-out"
                            style={{
                              transform: `translateX(calc(-${idx * 100}% + ${imgOffset}px))`,
                            }}
                            onPointerDown={(e) => handlePointerDownImg(order.id, e)}
                            onPointerMove={(e) => handlePointerMoveImg(order.id, e)}
                            onPointerUp={() => handlePointerUpImg(order.id)}
                            onPointerLeave={() => {
                              if (draggingImg[order.id]) handlePointerUpImg(order.id);
                            }}
                          >
                            {imgs.map((im, i) => (
                              <div key={i} className="w-full shrink-0 aspect-square flex items-center justify-center bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={im.url}
                                  alt={im.name}
                                  className="object-contain w-full h-full p-3"
                                  draggable={false}
                                  onError={(e) => ((e.target as HTMLImageElement).src = "/images/placeholder.jpg")}
                                />
                              </div>
                            ))}
                          </div>

                          {imgs.length > 1 && (
                            <>
                              <button
                                aria-label="Sebelumnya"
                                onClick={() => prevImg(order.id)}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 border border-gray-200 rounded-full w-9 h-9 flex items-center justify-center shadow z-10"
                              >
                                ‹
                              </button>
                              <button
                                aria-label="Berikutnya"
                                onClick={() => nextImg(order.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 border border-gray-200 rounded-full w-9 h-9 flex items-center justify-center shadow z-10"
                              >
                                ›
                              </button>
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                {imgs.map((_, i) => (
                                  <span key={i} className={`w-2.5 h-2.5 rounded-full ${i === idx ? "bg-gray-800" : "bg-gray-300"}`} />
                                ))}
                              </div>
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

          {/* Kontrol carousel order */}
          {orders.length > 1 && (
            <>
              <button
                aria-label="Order sebelumnya"
                onClick={prevOrder}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 border border-gray-200 rounded-full w-10 h-10 flex items-center justify-center shadow z-10"
              >
                ‹
              </button>
              <button
                aria-label="Order berikutnya"
                onClick={nextOrder}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 border border-gray-200 rounded-full w-10 h-10 flex items-center justify-center shadow z-10"
              >
                ›
              </button>
              <div className="mt-4 flex justify-center gap-2">
                {orders.map((_, i) => (
                  <span key={i} className={`w-2.5 h-2.5 rounded-full ${i === orderIdx ? "bg-gray-800" : "bg-gray-300"}`} />
                ))}
              </div>
            </>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/")}
          className="mt-8 text-gray-700 underline text-sm"
        >
          Kembali ke Beranda
        </motion.button>
      </motion.div>
    </div>
  );
}
