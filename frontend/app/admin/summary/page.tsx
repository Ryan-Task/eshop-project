"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/api";
import { useRouter } from "next/navigation";

type ProductRow = {
  product_id: number;
  name: string;
  image?: string | null;
  qty_sold: number;
  revenue: number;
  cost: number;
  profit: number;
  rating_average: number;
};

type Summary = {
  days: number;
  from: string;
  to: string;
  scope: string;
  revenue: number;
  cost: number;
  profit: number;
  qty_sold: number;
  avg_store_rating: number;
  unique_customers: number;
  new_users: number;
  orders_completed: number;
};

type DailyData = {
  labels: string[];
  data_profit: number[];
  data_qty: number[];
  data_revenue: number[];
  data_cost: number[];
};

type Payload = {
  summary: Summary;
  products: ProductRow[];
  daily_data?: DailyData;
  // NEW: fallback shape (backend versi lama)
  labels?: string[];
  data_profit?: number[];
  data_qty?: number[];
  data_revenue?: number[];
  data_cost?: number[];
};

const fmtRp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
// NEW: inline placeholder to prevent 404
const FALLBACK_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%23e5e7eb'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='12'>No Image</text></svg>";
const getImageUrl = (imagePath?: string | null) => {
  if (!imagePath) return FALLBACK_IMG;
  const p = String(imagePath).replace(/^\/+/, "");
  if (p.startsWith("http")) return p;
  if (p.startsWith("storage/")) return `http://127.0.0.1:8000/${p}`;
  if (p.startsWith("public/"))
    return `http://127.0.0.1:8000/storage/${p.replace(/^public\//, "")}`;
  if (!p.includes("/")) return `http://127.0.0.1:8000/storage/images/${p}`;
  return `http://127.0.0.1:8000/storage/${p}`;
};

export default function AdminSummaryPage() {
  const router = useRouter();
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<Payload | null>(null);
  const [downloading, setDownloading] = useState(false);
  // NEW: pilih grup laporan (PDF)
  const [group, setGroup] = useState<"day" | "week">("day");

  // HAPUS: state chartMetric jika tidak dipakai lagi (opsional)
  // const [chartMetric, setChartMetric] = useState<"profit" | "qty">("profit");

  // NEW: refs untuk Chart.js
  const profitCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const qtyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const profitChartRef = useRef<any>(null);
  const qtyChartRef = useRef<any>(null);

  // controls
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "sold" | "profit" | "revenue" | "rating"
  >("sold");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  // pagination
  const [page, setPage] = useState(1);
  const perPage = 8;
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const fetchData = async (d: number) => {
    try {
      setLoading(true);
      const res = await api.get("/admin/summary", {
        params: { days: d, scope: "completed" },
      });
      setData(res.data);
      setPage(1);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Guard admin
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    api
      .get("/user", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if ((res.data?.role || "user") !== "admin") {
          router.replace("/admin/login");
        }
      })
      .catch(() => router.replace("/admin/login"))
      .finally(() => setCheckingAdmin(false));
  }, [router]);

  useEffect(() => {
    if (!checkingAdmin) fetchData(days);
  }, [days, checkingAdmin]);

  const filteredSorted = useMemo(() => {
    const list = (data?.products || []).filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
    const cmp = (a: ProductRow, b: ProductRow) => {
      let va = 0;
      let vb = 0;
      if (sortBy === "sold") {
        va = a.qty_sold;
        vb = b.qty_sold;
      } else if (sortBy === "profit") {
        va = a.profit;
        vb = b.profit;
      } else if (sortBy === "revenue") {
        va = a.revenue;
        vb = b.revenue;
      } else if (sortBy === "rating") {
        va = a.rating_average;
        vb = b.rating_average;
      }
      const base = va === vb ? 0 : va < vb ? -1 : 1;
      return sortDir === "asc" ? base : -base;
    };
    return list.sort(cmp);
  }, [data?.products, search, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / perPage));
  const start = (page - 1) * perPage;
  const pageItems = filteredSorted.slice(start, start + perPage);

  useEffect(() => {
    setPage(1);
  }, [search, sortBy, sortDir]);

  // NEW: util untuk load Chart.js CDN
  const ensureChartJs = async (): Promise<any> => {
    const w = window as any;
    if (w.Chart) return w.Chart;
    await new Promise<void>((resolve, reject) => {
      const el = document.createElement("script");
      el.src =
        "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error("Failed to load Chart.js"));
      document.body.appendChild(el);
    });
    return (window as any).Chart;
  };

  // NEW: ambil data harian (fallback ke bentuk lama dari API) dengan safe-cast
  const dailyLabels = useMemo(
    () => data?.daily_data?.labels || (data as any)?.labels || [],
    [data]
  );
  const dailyProfit = useMemo(
    () => data?.daily_data?.data_profit || (data as any)?.data_profit || [],
    [data]
  );
  const dailyQty = useMemo(
    () => data?.daily_data?.data_qty || (data as any)?.data_qty || [],
    [data]
  );

  // NEW: render Chart.js setiap data berubah
  useEffect(() => {
    if (!data || dailyLabels.length === 0) return;
    let destroyed = false;

    (async () => {
      const Chart = await ensureChartJs();
      if (destroyed) return;

      // Destroy prev charts
      try {
        profitChartRef.current?.destroy();
      } catch {}
      try {
        qtyChartRef.current?.destroy();
      } catch {}

      // Profit chart
      if (profitCanvasRef.current) {
        const ctx = profitCanvasRef.current.getContext("2d");
        if (ctx) {
          profitChartRef.current = new Chart(ctx, {
            type: "bar",
            data: {
              labels: dailyLabels,
              datasets: [
                {
                  label: "Untung (Profit)",
                  data: dailyProfit,
                  backgroundColor: "#000000",
                  borderColor: "#000000",
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  ticks: {
                    callback: (v: any) =>
                      `Rp ${Math.round(Number(v)).toLocaleString("id-ID")}`,
                  },
                  grid: { color: "rgba(0,0,0,0.06)" },
                },
                x: { grid: { display: false } },
              },
              plugins: {
                legend: { display: true },
                tooltip: {
                  callbacks: {
                    label: (ctx: any) =>
                      `Untung: Rp ${Math.round(
                        Number(ctx.parsed.y)
                      ).toLocaleString("id-ID")}`,
                  },
                },
              },
            },
          });
        }
      }

      // Qty chart
      if (qtyCanvasRef.current) {
        const ctx2 = qtyCanvasRef.current.getContext("2d");
        if (ctx2) {
          qtyChartRef.current = new Chart(ctx2, {
            type: "bar",
            data: {
              labels: dailyLabels,
              datasets: [
                {
                  label: "Barang Terjual",
                  data: dailyQty,
                  backgroundColor: "#16a34a",
                  borderColor: "#16a34a",
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  ticks: {
                    callback: (v: any) =>
                      `${Math.round(Number(v)).toLocaleString("id-ID")} unit`,
                  },
                  grid: { color: "rgba(0,0,0,0.06)" },
                },
                x: { grid: { display: false } },
              },
              plugins: {
                legend: { display: true },
                tooltip: {
                  callbacks: {
                    label: (ctx: any) =>
                      `Terjual: ${Math.round(
                        Number(ctx.parsed.y)
                      ).toLocaleString("id-ID")} unit`,
                  },
                },
              },
            },
          });
        }
      }
    })();

    return () => {
      destroyed = true;
      try {
        profitChartRef.current?.destroy();
        qtyChartRef.current?.destroy();
      } catch {}
    };
  }, [data, dailyLabels, dailyProfit, dailyQty]);

  // NEW: helper load jsPDF (fallback)
  const loadJsPDF = () =>
    new Promise<void>((resolve, reject) => {
      if ((window as any).jspdf) return resolve();
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject();
      document.body.appendChild(s);
    });

  // NEW: download PDF (server → fallback client)
  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const scopeParam = data?.summary?.scope || "completed";
      const res = await fetch(
        `http://127.0.0.1:8000/api/admin/summary/pdf?days=${days}&scope=${scopeParam}&group=${group}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );
      if (!res.ok) throw new Error("Server PDF gagal");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `summary-${data?.summary?.from}_${data?.summary?.to}-${group}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      try {
        await loadJsPDF();
        const summary = data?.summary;
        // @ts-ignore
        const doc = new window.jspdf.jsPDF();
        doc.setFontSize(14);
        doc.text(
          `Ringkasan Penjualan (${group === "day" ? "Harian" : "Mingguan"})`,
          14,
          16
        );
        doc.setFontSize(10);
        doc.text(`Periode: ${summary?.from} s/d ${summary?.to}`, 14, 24);
        const lines = [
          `Revenue : Rp ${Math.round(
            Number(summary?.revenue || 0)
          ).toLocaleString("id-ID")}`,
          `Cost    : Rp ${Math.round(Number(summary?.cost || 0)).toLocaleString(
            "id-ID"
          )}`,
          `Profit  : Rp ${Math.round(
            Number(summary?.profit || 0)
          ).toLocaleString("id-ID")}`,
          `Qty Sold: ${summary?.qty_sold}`,
          `Orders Completed: ${summary?.orders_completed}`,
          `Avg Store Rating: ${Number(summary?.avg_store_rating || 0).toFixed(
            2
          )}`,
        ];
        lines.forEach((l, i) => doc.text(l, 14, 34 + i * 7));
        doc.save(`summary-${summary?.from}_${summary?.to}-${group}.pdf`);
      } catch {
        alert("Gagal membuat PDF.");
      }
    } finally {
      setDownloading(false);
    }
  };

  if (checkingAdmin) {
    return (
      <main className="min-h-screen bg-white pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pt-20 font-poppins px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-black">Ringkasan Admin</h1>
            <p className="text-sm text-gray-600">
              Rentang: {data?.summary.from || "-"} s/d {data?.summary.to || "-"}{" "}
              • Scope: {data?.summary.scope || "completed"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[7, 30, 90].map((opt) => (
              <button
                key={opt}
                onClick={() => setDays(opt)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                  days === opt
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-gray-300 hover:bg-gray-100"
                }`}
              >
                {opt} Hari
              </button>
            ))}
            {/* NEW: Group toggle */}
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value as "day" | "week")}
              className="px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 bg-white text-black"
              title="Grup laporan PDF"
            >
              <option value="day">Per Hari</option>
              <option value="week">Per Minggu</option>
            </select>
            {/* Download */}
            <button
              onClick={downloadPdf}
              disabled={downloading || loading || !data}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                downloading || loading || !data
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed border-gray-200"
                  : "bg-white text-black border-gray-300 hover:bg-gray-100"
              }`}
              title="Download ringkasan (PDF)"
            >
              {downloading ? "Menyiapkan..." : "Download PDF"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="min-h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
          </div>
        ) : !data ? (
          <div className="text-gray-700">Data tidak tersedia.</div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                <div className="text-xs text-gray-600 mb-1">Pendapatan</div>
                <div className="text-2xl font-bold text-black">
                  {fmtRp(data.summary.revenue)}
                </div>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                <div className="text-xs text-gray-600 mb-1">Untung</div>
                <div className="text-2xl font-bold text-black">
                  {fmtRp(data.summary.profit)}
                </div>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                <div className="text-xs text-gray-600 mb-1">Terjual</div>
                <div className="text-2xl font-bold text-black">
                  {data.summary.qty_sold}
                </div>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                <div className="text-xs text-gray-600 mb-1">Rating Toko</div>
                <div className="text-2xl font-bold text-black">
                  {data.summary.avg_store_rating.toFixed(2)}
                </div>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                <div className="text-xs text-gray-600 mb-1">Order Selesai</div>
                <div className="text-2xl font-bold text-black">
                  {data.summary.orders_completed}
                </div>
              </div>
            </div>

            {/* Diagram Batang Harian */}
            {dailyLabels.length > 0 && (
              <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50">
                  <h2 className="text-xl font-bold text-black mb-4">
                    Untung Harian (Chart.js)
                  </h2>
                  <div className="h-72">
                    <canvas ref={profitCanvasRef} />
                  </div>
                </div>
                <div className="p-6 rounded-2xl border border-gray-200 bg-gray-50">
                  <h2 className="text-xl font-bold text-black mb-4">
                    Barang Terjual Harian (Chart.js)
                  </h2>
                  <div className="h-72">
                    <canvas ref={qtyCanvasRef} />
                  </div>
                </div>
              </div>
            )}

            {/* Controls: Search + Sort */}
            <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex-1">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari produk..."
                  className="w-full sm:max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-black bg-white"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-black bg-white"
                >
                  <option value="sold">Urutkan: Terjual</option>
                  <option value="profit">Urutkan: Profit</option>
                  <option value="revenue">Urutkan: Revenue</option>
                  <option value="rating">Urutkan: Rating</option>
                </select>
                <button
                  onClick={() =>
                    setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                  }
                  className="px-3 py-2 rounded-lg border border-gray-300 text-black font-semibold hover:bg-gray-100"
                  title="Urutan"
                >
                  {sortDir === "desc" ? "↓" : "↑"}
                </button>
              </div>
            </div>

            {/* Produk Grid */}
            {pageItems.length === 0 ? (
              <div className="text-gray-700 p-8 text-center border border-gray-200 rounded-2xl bg-gray-50">
                Tidak ada produk yang sesuai dengan filter pencarian.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pageItems.map((p) => (
                  <div
                    key={p.product_id}
                    className="border border-gray-200 rounded-2xl bg-white overflow-hidden hover:shadow-sm transition-shadow"
                  >
                    <div className="w-full aspect-[4/3] bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getImageUrl(p.image)}
                        alt={p.name}
                        className="w-full h-full object-contain p-3"
                        onError={(e) =>
                          ((e.currentTarget as HTMLImageElement).src =
                            FALLBACK_IMG)
                        }
                      />
                    </div>
                    <div className="p-4">
                      <div className="text-sm font-bold text-black line-clamp-2 min-h-[2.5rem]">
                        {p.name}
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                          <div className="text-gray-600">Terjual</div>
                          <div className="text-black font-semibold">
                            {p.qty_sold}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                          <div className="text-gray-600">Rating</div>
                          <div className="text-black font-semibold">
                            {p.rating_average.toFixed(2)}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                          <div className="text-gray-600">Revenue</div>
                          <div className="text-black font-semibold">
                            {fmtRp(p.revenue)}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                          <div className="text-gray-600">Profit</div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-lg font-bold text-black border border-black">
                            {fmtRp(p.profit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                  page === 1
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed border-gray-200"
                    : "bg-white text-black hover:bg-gray-100 border-gray-300"
                }`}
              >
                Sebelumnya
              </button>

              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold border ${
                    page === i + 1
                      ? "bg-black text-white border-black"
                      : "bg-white text-black hover:bg-gray-100 border-gray-300"
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                  page === totalPages
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
    </main>
  );
}
