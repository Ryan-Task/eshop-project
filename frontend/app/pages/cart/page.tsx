"use client";

import { useEffect, useRef, useState } from "react";
import api from "../../api/api";
import ToastHost, { showToast } from "../../components/Toast";

type CartEntry = {
  id: number;
  product_id: number;
  quantity: number;
  product?: {
    id: number;
    name: string;
    price?: number;
    stock?: number;
    image?: string;
  };
};

export default function CartPage() {
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Record<number, boolean>>({});
  const inflight = useRef<Record<number, AbortController | null>>({});

  const getImageUrl = (p?: string) => {
    if (!p) return "/images/placeholder.jpg";
    if (p.startsWith("http")) return p;
    if (p.startsWith("storage/")) return `http://127.0.0.1:8000/${p}`;
    return `http://127.0.0.1:8000/storage/${p}`;
  };

  const syncBadge = (next?: CartEntry[]) => {
    const arr = next || cart;
    const total = arr.reduce((s, it) => s + Number(it.quantity || 0), 0);
    try {
      localStorage.setItem("cartCount", String(total));
      window.dispatchEvent(new Event("cartLocal"));
      window.dispatchEvent(new Event("cartUpdate"));
      window.dispatchEvent(new Event("cartChange"));
    } catch {}
  };

  const fetchCart = async () => {
    try {
      const res = await api.get("/cart");
      const data: CartEntry[] = Array.isArray(res.data) ? res.data : [];
      setCart(data);
      syncBadge(data);
    } catch {
      setCart([]);
      syncBadge([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const markUpdating = (id: number, on: boolean) =>
    setUpdating((prev) => ({ ...prev, [id]: on }));

  const optimisticSet = (id: number, qty: number) => {
    setCart((prev) =>
      prev.map((it) => (it.id === id ? { ...it, quantity: qty } : it))
    );
    syncBadge(cart.map((it) => (it.id === id ? { ...it, quantity: qty } : it)));
  };

  const updateQty = async (item: CartEntry, desired: number) => {
    const id = item.id;
    const max = Number(item.product?.stock ?? 0);
    if (max <= 0) {
      showToast("error", "Stok habis.");
      return;
    }
    const next = Math.max(1, Math.min(desired, max));
    if (next === item.quantity) return;

    // Optimistic
    const prevQty = item.quantity;
    optimisticSet(id, next);
    markUpdating(id, true);

    // Cancel previous
    try {
      inflight.current[id]?.abort();
    } catch {}
    const ac = new AbortController();
    inflight.current[id] = ac;

    try {
      await api.put(`/cart/${id}`, { quantity: next }, { signal: ac.signal });
      if (desired > max) showToast("info", `Maksimal ${max} sesuai stok.`);
    } catch (e: any) {
      const canceled =
        e?.name === "CanceledError" ||
        e?.code === "ERR_CANCELED" ||
        e?.message?.includes("canceled");
      if (!canceled) {
        const mx = Number(e?.response?.data?.max ?? 0);
        const msg =
          e?.response?.data?.message ||
          (mx ? `Maksimal ${mx} sesuai stok.` : "Gagal memperbarui.");
        showToast("error", msg);
        optimisticSet(id, mx > 0 ? mx : prevQty);
      }
    } finally {
      if (inflight.current[id] === ac) inflight.current[id] = null;
      markUpdating(id, false);
    }
  };

  const inc = (it: CartEntry) => updateQty(it, it.quantity + 1);
  const dec = (it: CartEntry) => updateQty(it, it.quantity - 1);

  const removeItem = async (id: number) => {
    try {
      await api.delete(`/cart/${id}`);
      setCart((prev) => prev.filter((c) => c.id !== id));
      syncBadge(cart.filter((c) => c.id !== id));
      showToast("success", "Item dihapus");
    } catch {
      showToast("error", "Gagal menghapus item");
    }
  };

  const calcSubtotal = (it: CartEntry) =>
    Number(it.product?.price || 0) * Number(it.quantity || 0);

  const calcTotal = () => cart.reduce((s, it) => s + calcSubtotal(it), 0);

  if (loading) {
    return (
      <main className="min-h-screen bg-white pt-20 flex items-center justify-center">
        <ToastHost />
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pt-20 font-poppins px-6">
      <ToastHost />
      <h1 className="text-3xl font-black mb-6">Keranjang</h1>
      {cart.length === 0 ? (
        <div className="text-gray-600">Keranjang kosong.</div>
      ) : (
        <div className="space-y-4">
          {cart.map((item) => {
            const q = item.quantity;
            const stock = Number(item.product?.stock ?? 0);
            const busy = updating[item.id];
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-4 border border-gray-200 rounded-xl p-4 bg-white"
              >
                <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImageUrl(item.product?.image)}
                    alt={item.product?.name || `Produk ${item.product_id}`}
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                    onError={(e) =>
                      ((e.currentTarget as HTMLImageElement).src =
                        "/images/placeholder.jpg")
                    }
                  />
                  <div>
                    <div className="font-semibold text-black text-sm">
                      {item.product?.name || `Produk ${item.product_id}`}
                    </div>
                    <div className="text-xs text-gray-600">
                      Harga: Rp{" "}
                      {Number(item.product?.price || 0).toLocaleString("id-ID")}
                    </div>
                    <div className="text-xs text-gray-600">
                      Stok:{" "}
                      <span className="font-semibold text-black">{stock}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => dec(item)}
                    disabled={busy || q <= 1}
                    className={`w-8 h-8 rounded-lg border font-bold ${
                      busy || q <= 1
                        ? "text-gray-400 border-gray-200 cursor-not-allowed"
                        : "text-black border-gray-300 hover:bg-gray-100"
                    }`}
                    aria-label="Kurangi"
                  >
                    −
                  </button>
                  <input
                    readOnly
                    value={q}
                    className="w-12 text-center border border-gray-300 rounded-lg py-1 text-black"
                    aria-label="Jumlah"
                  />
                  <button
                    onClick={() => inc(item)}
                    disabled={busy || q >= stock}
                    className={`w-8 h-8 rounded-lg border font-bold ${
                      busy || q >= stock
                        ? "text-gray-400 border-gray-200 cursor-not-allowed"
                        : "text-black border-gray-300 hover:bg-gray-100"
                    }`}
                    aria-label="Tambah"
                  >
                    +
                  </button>
                </div>

                <div className="text-sm font-semibold text-black ml-auto">
                  Rp {calcSubtotal(item).toLocaleString("id-ID")}
                </div>

                <button
                  onClick={() => removeItem(item.id)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 underline"
                >
                  Hapus
                </button>
              </div>
            );
          })}
        </div>
      )}

      {cart.length > 0 && (
        <div className="mt-8 border-t pt-6">
          <div className="flex justify-between text-lg font-bold">
            <span className="text-black">Total</span>
            <span className="text-black">
              Rp {calcTotal().toLocaleString("id-ID")}
            </span>
          </div>
          <button
            onClick={() => (window.location.href = "/pages/checkout")}
            className="mt-4 w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors"
          >
            Checkout
          </button>
        </div>
      )}
    </main>
  );
}
