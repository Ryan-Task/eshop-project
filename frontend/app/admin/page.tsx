"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../api/api";
import ToastHost, { showToast } from "../components/Toast";

type SummaryResp = {
  summary?: {
    profit?: number;
    avg_store_rating?: number;
  };
};

export default function AdminDashboard() {
  const router = useRouter();

  // Fast admin gate (no flash)
  const allowed = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      const token = localStorage.getItem("token");
      const role =
        JSON.parse(localStorage.getItem("user") || "{}")?.role || "user";
      if (!token || role !== "admin") {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!allowed) {
      showToast("warning", "Harus login sebagai admin.");
      router.replace("/admin/login");
    }
  }, [allowed, router]);

  if (!allowed)
    return (
      <main className="min-h-screen bg-white pt-24">
        <ToastHost />
      </main>
    );

  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);
  const [profit, setProfit] = useState(0);
  const [activeCustomers, setActiveCustomers] = useState(0);
  const [avgRating, setAvgRating] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [sumRes, prodRes, usersRes] = await Promise.all([
          api.get<SummaryResp>("/admin/summary", {
            params: { days: 30, scope: "completed" },
          }),
          api.get<any[]>("/products", { params: { include_archived: 1 } }),
          api.get<{ users: any[] }>("/admin/users"),
        ]);
        if (!mounted) return;

        const s = sumRes.data?.summary || {};
        setProfit(Number(s.profit || 0));
        setAvgRating(Number(s.avg_store_rating || 0));

        const products = Array.isArray(prodRes.data) ? prodRes.data : [];
        setProductCount(products.length);

        const users = Array.isArray(usersRes.data?.users)
          ? usersRes.data.users
          : [];
        setActiveCustomers(
          users.filter(
            (u) =>
              (u.is_active ?? true) &&
              String(u.role || "user").toLowerCase() !== "admin"
          ).length
        );
      } catch {
        if (!mounted) return;
        // Fallback ke 0 jika error (hindari “-”)
        setProfit(0);
        setAvgRating(0);
        setProductCount(0);
        setActiveCustomers(0);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const fmtNum = (n: number) => n.toLocaleString("id-ID");

  return (
    <main className="min-h-screen bg-white text-black md:pl-[80px] transition-all duration-300 py-10 font-[Poppins]">
      <div className="max-w-6xl mx-auto px-6">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Dashboard Admin
          </h1>
          <p className="text-sm text-gray-600">
            Ringkasan 30 hari terakhir (pesanan selesai).
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs uppercase text-gray-600 font-semibold">
              Total Produk
            </div>
            <div className="mt-2 text-3xl font-black">
              {loading ? "…" : productCount}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Semua produk terdaftar
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs uppercase text-gray-600 font-semibold">
              Total Untung
            </div>
            <div className="mt-2 text-3xl font-black">
              {loading ? "…" : `Rp ${fmtNum(profit)}`}
            </div>
            <div className="mt-1 text-xs text-gray-500">30 hari terakhir</div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs uppercase text-gray-600 font-semibold">
              Pelanggan Aktif
            </div>
            <div className="mt-2 text-3xl font-black">
              {loading ? "…" : activeCustomers}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Non-admin, is_active=true
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-xs uppercase text-gray-600 font-semibold">
              Rata-rata Rating
            </div>
            <div className="mt-2 text-3xl font-black">
              {loading ? "…" : avgRating.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-gray-500">Skala 0-5</div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-white text-black md:pl-[80px] py-10 px-6">
      <h1 className="text-3xl font-black">Admin Dashboard</h1>
      <p className="text-gray-600">Ringkasan admin.</p>
    </main>
  );
}
