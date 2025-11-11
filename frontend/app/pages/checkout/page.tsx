"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "../../api/api";
import ToastHost, { showToast } from "../../components/Toast";

type CartItem = {
  id: number;
  product_id: number;
  quantity: number;
  product: { id: number; name: string; price: number; image?: string };
};

type AddressObj = {
  province?: string;
  regency?: string;
  district?: string;
  detail?: string;
};

type Address = {
  id: number;
  recipient_name?: string;
  phone?: string;
  province?: string;
  regency?: string;
  district?: string;
  postal_code?: string;
  detail?: string;
  is_default?: boolean;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [address, setAddress] = useState<string>("Belum ada alamat");
  const [addressOk, setAddressOk] = useState(false);
  const [selectedShip, setSelectedShip] = useState<any | null>(null);
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddrPicker, setShowAddrPicker] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return "/images/placeholder.jpg";
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("storage/"))
      return `http://127.0.0.1:8000/${imagePath}`;
    return `http://127.0.0.1:8000/storage/${imagePath}`;
  };

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, it) =>
          sum + (Number(it.product?.price) || 0) * (Number(it.quantity) || 0),
        0
      ),
    [cart]
  );
  const total = subtotal + (selectedShip?.cost || 0);

  const addressSummary = useMemo(() => {
    if (!selectedAddress) return address;
    const a = selectedAddress;
    const parts = [
      a.detail,
      a.district,
      a.regency,
      a.province,
      a.postal_code,
    ].filter(Boolean);
    return parts.join(", ");
  }, [selectedAddress, address]);

  // Prefetch token, cart, address
  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/pages/auth/login");
        return;
      }
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const cartReq = api.get("/cart", { headers, signal: ac.signal });
        const addrReq = api.get("/addresses", { headers, signal: ac.signal });
        const userReq = api.get("/user", { headers, signal: ac.signal });

        const [cartRes, addrRes, userRes] = await Promise.allSettled([
          cartReq,
          addrReq,
          userReq,
        ]);

        // Cart
        if (cartRes.status === "fulfilled") {
          await fetchCart(ac.signal);
        } else {
          setCart([]);
        }

        // Addresses
        let defaultAddr: Address | null = null;
        if (addrRes.status === "fulfilled") {
          const list: Address[] = addrRes.value.data?.addresses || [];
          setAddresses(list);
          defaultAddr = list.find((a) => a.is_default) || list[0] || null;
          if (defaultAddr) setSelectedAddress(defaultAddr);
        }

        // Legacy address fallback
        if (!defaultAddr && userRes.status === "fulfilled") {
          const raw = userRes.value.data?.address;
          let ok = false;
          let summary = "Belum ada alamat";
          if (raw) {
            try {
              const obj: AddressObj =
                typeof raw === "string" ? JSON.parse(raw) : raw;
              ok = !!(
                obj?.province &&
                obj?.regency &&
                obj?.district &&
                obj?.detail
              );
              summary = [
                obj?.detail,
                obj?.district,
                obj?.regency,
                obj?.province,
              ]
                .filter(Boolean)
                .join(", ");
            } catch {
              ok = true;
              summary = String(raw);
            }
          }
          setAddressOk(ok);
          setAddress(summary || "Belum ada alamat");
        } else if (defaultAddr) {
          const parts = [
            defaultAddr.detail,
            defaultAddr.district,
            defaultAddr.regency,
            defaultAddr.province,
            defaultAddr.postal_code,
          ].filter(Boolean);
          setAddress(parts.join(", "));
          setAddressOk(true);
        }

        // Shipping options (only after address known)
        try {
          const params: any = {};
          if (defaultAddr?.id) params.address_id = defaultAddr.id;
          const shipRes = await api.get("/shipping/options", {
            params,
            headers,
            signal: ac.signal,
          });
          const opts = shipRes.data?.options || [];
          setShippingOptions(opts);
          setSelectedShip(opts[0] || null);
        } catch {
          setShippingOptions([
            {
              code: "REG",
              name: "Reguler",
              eta: "2-4 hari",
              cost: 20000,
              courier: "REG",
              service: "REG",
            },
            {
              code: "FAST",
              name: "Cepat",
              eta: "1-2 hari",
              cost: 40000,
              courier: "FAST",
              service: "FAST",
            },
          ]);
          setSelectedShip({
            code: "REG",
            name: "Reguler",
            eta: "2-4 hari",
            cost: 20000,
            courier: "REG",
            service: "REG",
          });
        }
      } finally {
        if (!abortRef.current?.signal.aborted) setLoading(false);
      }
    };
    run();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to refresh shipping options when address changed
  const refreshShippingForAddress = async (addr?: Address | null) => {
    try {
      const token = localStorage.getItem("token");
      const params: any = {};
      if (addr?.id) params.address_id = addr.id;
      const shipRes = await api.get("/shipping/options", {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      const opts = shipRes.data?.options || [];
      setShippingOptions(opts);
      setSelectedShip(opts[0] || null);
    } catch {}
  };

  // Load Midtrans snap script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.setAttribute(
      "data-client-key",
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ||
        "SB-Mid-client-xxxxxxxxxxxxxx"
    );
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchCart = async (signal?: AbortSignal) => {
    try {
      const res = await api.get("/cart", { signal });
      const data = Array.isArray(res.data) ? res.data : [];
      setCart(
        data.map((it: any) => ({
          id: it.id,
          product_id: it.product_id,
          quantity: it.quantity,
          product: {
            id: it.product?.id,
            name: it.product?.name,
            price: Number(it.product?.price || 0),
            image: it.product?.image,
          },
        }))
      );
      // sinkron local fast counter
      try {
        const totalQty = data.reduce(
          (s: number, c: any) => s + Number(c.quantity || 0),
          0
        );
        localStorage.setItem("cartCount", String(totalQty));
        window.dispatchEvent(new Event("cartLocal"));
      } catch {}
    } catch {
      setCart([]);
    }
  };

  const handlePay = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/pages/auth/login");
        return;
      }

      // REFRESH cart sebelum bayar (hindari keranjang kosong karena perubahan lain)
      await fetchCart();
      if (cart.length === 0) {
        showToast("warning", "Keranjang kosong. Tambahkan produk dulu.");
        router.push("/pages/cart");
        return;
      }

      // Validasi alamat (selectedAddress atau legacy)
      if (!selectedAddress && !addressOk) {
        showToast("warning", "Lengkapi alamat dulu.");
        router.push("/pages/alamat");
        return;
      }

      if (!selectedShip) {
        showToast("info", "Pilih metode pengiriman.");
        return;
      }

      // Format shipping_code sesuai backend (courier:service) bila tersedia
      const shipping_code =
        selectedShip.courier && selectedShip.service
          ? `${selectedShip.courier}:${selectedShip.service}`
          : undefined;

      const body = {
        shipping_method:
          selectedShip.name ||
          `${selectedShip.courier || ""} ${
            selectedShip.service || ""
          }`.trim() ||
          "Ongkos Kirim",
        shipping_cost: Number(selectedShip.cost || 0),
        buyer_note: note || "",
        shipping_code,
        address_id: selectedAddress?.id || undefined,
      };

      const res = await api.post("/midtrans/checkout", body);
      const { snap_token } = res.data || {};
      if (!snap_token) {
        showToast("error", "Gagal membuat transaksi.");
        return;
      }

      if (window.snap) {
        window.snap.pay(snap_token, {
          onSuccess: () => router.push("/pages/payment/success"),
          onPending: () => router.push("/pages/payment/pending"),
          onError: () => router.push("/pages/payment/failed"),
          onClose: () => router.push("/pages/payment/pending"),
        });
      } else {
        showToast("warning", "Midtrans Snap belum siap. Coba lagi.");
      }
    } catch (e: any) {
      // Tampilkan pesan server kalau ada
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Checkout gagal. Coba lagi.";
      showToast("error", msg);
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
    <div className="min-h-screen bg-white pt-20 font-poppins">
      <ToastHost />
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: address + shipping + note */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alamat */}
          <div className="border border-gray-200 rounded-2xl p-6 bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-black mb-2">
                  Alamat Pengiriman
                </h2>
                <p
                  className={`text-sm ${
                    addressOk ? "text-black" : "text-red-600"
                  }`}
                >
                  {selectedAddress ? addressSummary : address}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push("/pages/alamat")}
                  className="text-sm font-semibold underline text-black"
                  title="Kelola alamat"
                >
                  Kelola
                </button>
                {addresses.length > 0 && (
                  <button
                    onClick={() => setShowAddrPicker((v) => !v)}
                    className="text-sm font-semibold underline text-black"
                    title="Ganti alamat"
                  >
                    Ganti
                  </button>
                )}
              </div>
            </div>

            {/* NEW: Address picker */}
            {showAddrPicker && (
              <div className="mt-4 space-y-2">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
                      selectedAddress?.id === a.id
                        ? "border-black bg-white"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="addr"
                      checked={selectedAddress?.id === a.id}
                      onChange={async () => {
                        setSelectedAddress(a);
                        setShowAddrPicker(false);
                        // refresh shipping based on new address
                        await refreshShippingForAddress(a);
                      }}
                    />
                    <div className="text-sm">
                      <div className="text-gray-700">
                        {[
                          a.detail,
                          a.district,
                          a.regency,
                          a.province,
                          a.postal_code,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                      {a.is_default ? (
                        <span className="mt-1 inline-block text-xs bg-black text-white px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      ) : null}
                    </div>
                  </label>
                ))}
                {addresses.length === 0 && (
                  <div className="text-sm text-gray-600">
                    Belum ada alamat tersimpan.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Opsi Pengiriman */}
          <div className="border border-gray-200 rounded-2xl p-6 bg-gray-50">
            <h2 className="text-xl font-bold text-black mb-4">
              Opsi Pengiriman
            </h2>
            <div className="space-y-3">
              {loading && shippingOptions.length === 0 ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 rounded-xl bg-gray-200 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {shippingOptions.map((opt) => (
                    <label
                      key={opt.code}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${
                        selectedShip?.code === opt.code
                          ? "border-black bg-white"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="ship"
                          value={opt.code}
                          checked={selectedShip?.code === opt.code}
                          onChange={() => setSelectedShip(opt)}
                        />
                        <div>
                          <div className="font-semibold text-black">
                            {opt.name || `${opt.courier} ${opt.service}`}
                          </div>
                          <div className="text-xs text-gray-600">
                            Estimasi: {opt.eta}
                          </div>
                        </div>
                      </div>
                      <div className="font-bold text-black">
                        Rp {Number(opt.cost).toLocaleString("id-ID")}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Catatan untuk Penjual */}
          <div className="border border-gray-200 rounded-2xl p-6 bg-gray-50">
            <h2 className="text-xl font-bold text-black mb-3">
              Pesan untuk Penjual
            </h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Contoh: Tolong bungkus dengan bubble wrap."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-black"
            />
          </div>

          {/* Ringkasan Produk */}
          <div className="border border-gray-200 rounded-2xl p-6 bg-gray-50">
            <h2 className="text-xl font-bold text-black mb-4">
              Produk yang Dibeli
            </h2>
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                      src={getImageUrl(item.product?.image)}
                      alt={item.product?.name}
                      className="w-12 h-12 rounded-md object-cover bg-white border border-gray-200"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).src =
                          "/images/placeholder.jpg")
                      }
                    />
                    <div>
                      <div className="text-black text-sm">
                        {item.product?.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        Qty: {item.quantity} x Rp{" "}
                        {Number(item.product?.price).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                  <div className="text-black text-sm font-semibold whitespace-nowrap">
                    Rp{" "}
                    {(
                      Number(item.product?.price) * Number(item.quantity)
                    ).toLocaleString("id-ID")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: payment summary */}
        <div className="bg-gray-50 rounded-2xl p-6 h-fit border border-gray-200">
          <h2 className="text-2xl font-bold mb-6 text-black">
            Rincian Pembayaran
          </h2>
          <div className="space-y-4 mb-6">
            <div className="flex justify-between">
              <span className="text-black">Subtotal</span>
              <span className="font-medium text-black">
                Rp {subtotal.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-black">
                Pengiriman (
                {selectedShip?.name ||
                  `${selectedShip?.courier || ""} ${
                    selectedShip?.service || ""
                  }`}
                )
              </span>
              <span className="font-medium text-black">
                Rp {Number(selectedShip?.cost || 0).toLocaleString("id-ID")}
              </span>
            </div>
            <div className="border-t border-gray-300 pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-black">Total</span>
                <span className="text-black">
                  Rp {total.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePay}
            className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-colors"
          >
            Bayar Sekarang
          </motion.button>
        </div>
      </div>
    </div>
  );
}
