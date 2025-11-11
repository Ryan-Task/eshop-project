"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../../../api/api";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

type Item = {
  id: number;
  product_id: number;
  name: string;
  image?: string | null;
  quantity: number;
  price: number;
  subtotal: number;
};
type OrderRow = {
  id: number;
  created_at?: string | null;
  delivered_at?: string | null;
  items_count: number;
  total_price: number;
  shipping_cost?: number;
  shipping_method?: string;
  revenue: number;
  cost: number;
  profit: number;
  customer?: string | null;
  items?: Item[];
  rating?: number | null; // NEW
  review_comment?: string | null; // NEW
};
type Summary = {
  days: number | "all";
  from?: string | null;
  to?: string | null;
  orders_completed: number;
  revenue: number;
  cost: number;
  profit: number;
};

export default function AdminCompletedOrdersPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [range, setRange] = useState<"7" | "30" | "90" | "all">("30");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<OrderRow[]>([]);

  useEffect(() => {
    // Guard admin
    try {
      const token = localStorage.getItem("token");
      const role = JSON.parse(localStorage.getItem("user") || "{}")?.role;
      if (!token || role !== "admin") {
        router.replace("/admin/login");
        return;
      }
    } finally {
      setChecking(false);
    }
  }, [router]);

  const getImageUrl = (p?: string | null) => {
    if (!p) return "/images/placeholder.jpg";
    const s = String(p).trim();
    if (s.startsWith("http")) return s;
    if (s.startsWith("storage/")) return `http://127.0.0.1:8000/${s}`;
    if (s.startsWith("public/"))
      return `http://127.0.0.1:8000/storage/${s.replace(/^public\//, "")}`;
    return `http://127.0.0.1:8000/storage/${s}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/orders/completed", {
        params: { days: range },
      });
      setSummary(res.data?.summary || null);
      setRows(res.data?.orders || []);
    } catch {
      setSummary(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checking) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, range]);

  const totalOrders = rows.length;
  const totalProfit = useMemo(
    () => rows.reduce((s, r) => s + Number(r.profit || 0), 0),
    [rows]
  );

  if (checking) return null;

  return (
    <main className="min-h-screen bg-white pt-20 font-poppins px-6 md:pl-[80px]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-black text-black">
              History (Selesai)
            </h1>
            <p className="text-gray-600">
              Pesanan berstatus paid + delivered, termasuk rating dan profit.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Rentang:</label>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-black"
            >
              <option value="7">7 hari</option>
              <option value="30">30 hari</option>
              <option value="90">90 hari</option>
              <option value="all">Semua</option>
            </select>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">Orders</div>
            <div className="text-2xl font-black text-black">
              {summary?.orders_completed ?? totalOrders}
            </div>
          </div>
          <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">Profit</div>
            <div className="text-2xl font-black text-black">
              Rp{" "}
              {Number(summary?.profit ?? totalProfit).toLocaleString("id-ID")}
            </div>
          </div>
          <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">Revenue</div>
            <div className="text-2xl font-black text-black">
              Rp {Number(summary?.revenue ?? 0).toLocaleString("id-ID")}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="min-h-[160px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-gray-700">Tidak ada order selesai.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-700">
              <div className="col-span-2">Order</div>
              <div className="col-span-2">Tgl Diterima</div>
              <div className="col-span-1 text-center">Item</div>
              <div className="col-span-1 text-center">Rating</div>
              <div className="col-span-2 text-right">Revenue</div>
              <div className="col-span-2 text-right">Cost</div>
              <div className="col-span-2 text-right">Profit</div>
            </div>
            <div className="divide-y divide-gray-200">
              {rows.map((r) => (
                <div key={r.id} className="px-4 py-3">
                  <div className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-12 md:col-span-2">
                      <div className="text-black font-bold">#{r.id}</div>
                      <div className="text-xs text-gray-600">
                        {r.customer || "-"}
                      </div>
                    </div>
                    <div className="col-span-6 md:col-span-2 text-gray-800">
                      <div className="text-sm">
                        {r.delivered_at
                          ? new Date(r.delivered_at).toLocaleString("id-ID")
                          : "-"}
                      </div>
                      <div className="text-xs text-gray-600">
                        {r.shipping_method || ""}
                      </div>
                    </div>
                    <div className="col-span-3 md:col-span-1 text-center text-black font-semibold">
                      {r.items_count}
                    </div>
                    <div className="col-span-3 md:col-span-1 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold border border-gray-300 text-gray-800">
                        {r.rating ?? "-"}
                      </span>
                    </div>
                    <div className="col-span-6 md:col-span-2 text-right text-black font-semibold">
                      Rp {Number(r.revenue).toLocaleString("id-ID")}
                    </div>
                    <div className="col-span-6 md:col-span-2 text-right text-black font-semibold">
                      Rp {Number(r.cost).toLocaleString("id-ID")}
                    </div>
                    <div className="col-span-12 md:col-span-2 text-right">
                      <span
                        className={`inline-block px-2 py-1 rounded-lg text-sm font-bold ${
                          (r.profit || 0) >= 0
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        Rp {Number(r.profit).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  {/* Items preview */}
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {(r.items || []).slice(0, 6).map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center gap-2 border border-gray-200 rounded-lg bg-white px-2 py-1"
                        title={`${it.name} • Qty ${it.quantity}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getImageUrl(it.image)}
                          alt={it.name}
                          className="w-8 h-8 rounded object-cover bg-white"
                          onError={(e) =>
                            ((e.currentTarget as HTMLImageElement).src =
                              "/images/placeholder.jpg")
                          }
                        />
                        <div className="text-xs text-gray-800">
                          {it.name}
                          <span className="text-gray-500">
                            {" "}
                            × {it.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {r.review_comment ? (
                    <div className="mt-2 text-xs text-gray-700 italic">
                      “{r.review_comment}”
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
