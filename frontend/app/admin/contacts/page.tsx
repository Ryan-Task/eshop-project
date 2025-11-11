"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Contact = {
  id: number;
  name: string;
  email: string;
  subject?: string | null;
  message: string;
  created_at: string;
};

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const allowed = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      const token = localStorage.getItem("token");
      const role =
        JSON.parse(localStorage.getItem("user") || "{}")?.role || "user";
      if (!token || role !== "admin") {
        window.location.replace("/admin/login");
        return false;
      }
      return true;
    } catch {
      window.location.replace("/admin/login");
      return false;
    }
  }, []);

  useEffect(() => {
    // Guard admin
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    fetch("http://127.0.0.1:8000/api/user", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("unauthorized");
        const me = await res.json();
        if ((me?.role || "user") !== "admin") throw new Error("forbidden");
      })
      .catch(() => router.replace("/admin/login"))
      .finally(() => setCheckingAdmin(false));
  }, [router]);

  useEffect(() => {
    if (checkingAdmin) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    (async () => {
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch("http://127.0.0.1:8000/api/admin/contacts", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          signal: ac.signal,
        });
        if (!res.ok) throw new Error("Gagal memuat data");
        const data = await res.json();
        setContacts(Array.isArray(data) ? data : []);
      } catch (e) {
        if ((e as any).name !== "AbortError") setContacts([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [checkingAdmin]);

  if (checkingAdmin || !allowed) {
    return (
      <main className="min-h-screen bg-white pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black md:pl-[80px] py-10 px-6">
      <h1 className="text-2xl font-bold">Contact Us (Admin)</h1>
      <p className="text-gray-600">Kelola kontak pengguna.</p>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black text-black mb-6">Contact Us</h1>
        <div className="border-b border-black mb-6" />
        {loading ? (
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  {["ID", "Nama", "Email", "Subjek", "Pesan", "Tanggal"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-sm font-semibold text-gray-700"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-gray-600">Belum ada pesan.</div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                    ID
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                    Nama
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                    Subjek
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                    Pesan
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                    Tanggal
                  </th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="px-4 py-3 text-black text-sm">{c.id}</td>
                    <td className="px-4 py-3 text-black text-sm">{c.name}</td>
                    <td className="px-4 py-3 text-black text-sm">{c.email}</td>
                    <td className="px-4 py-3 text-gray-700 text-sm">
                      {c.subject || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-800 text-sm max-w-md">
                      <div className="line-clamp-3">{c.message}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {new Date(c.created_at).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
