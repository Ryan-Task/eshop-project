"use client";

import { useEffect, useMemo, useState } from "react";
import api from "../../api/api";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_verified?: boolean;
  is_active?: boolean;
  profile_image?: string | null;
  created_at?: string;
};

const getImageUrl = (path?: string | null) => {
  if (!path) return "/images/placeholder.jpg";
  const p = String(path).trim().replace(/^\/+/, "");
  if (p.startsWith("http")) return p;
  if (p.startsWith("storage/")) return `http://127.0.0.1:8000/${p}`;
  if (p.startsWith("public/"))
    return `http://127.0.0.1:8000/storage/${p.replace(/^public\//, "")}`;
  return `http://127.0.0.1:8000/storage/${p}`;
};

export default function AdminUsersPage() {
  // Fast gate (no flash)
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
  if (!allowed) return null;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [q, setQ] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (q) params.q = q;
      // Server sudah exclude admin; tetap filter di FE sebagai jaga-jaga
      const res = await api.get("/admin/users", { params });
      const data: User[] = res.data?.users || [];
      setUsers(
        data.filter((u) => (u.role || "user").toLowerCase() !== "admin")
      );
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const toggleActive = async (u: User) => {
    if ((u.role || "user").toLowerCase() === "admin") return;
    try {
      setSavingId(u.id);
      await api.post(`/admin/users/${u.id}/status`, {
        is_active: !u.is_active,
      });
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, is_active: !u.is_active } : x))
      );
    } catch (e: any) {
      alert(e?.response?.data?.message || "Gagal mengubah status user");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-white pt-20 font-poppins px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-black text-black">Manajemen User</h1>
            <p className="text-sm text-gray-600">
              Hanya menampilkan pelanggan (non-admin)
            </p>
          </div>
          <form onSubmit={onSearch} className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama/email..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-black bg-white"
            />
            <button className="px-3 py-2 rounded-lg text-sm font-semibold border bg-white text-black border-gray-300 hover:bg-gray-100">
              Cari
            </button>
          </form>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
          <table className="min-w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                  Profil
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                  Nama
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                  Email
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                  Role
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-gray-600"
                  >
                    Memuat data...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-gray-600"
                  >
                    Tidak ada user.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getImageUrl(u.profile_image)}
                          alt={u.name}
                          className="w-full h-full object-cover"
                          onError={(e) =>
                            ((e.currentTarget as HTMLImageElement).src =
                              "/images/placeholder.jpg")
                          }
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-black">{u.name}</td>
                    <td className="px-4 py-3 text-gray-800">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700">
                        {(u.role || "user").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_active ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={
                          savingId === u.id ||
                          (u.role || "user").toLowerCase() === "admin"
                        }
                        onClick={() => toggleActive(u)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${
                          u.is_active
                            ? "border-red-300 text-red-600 hover:bg-red-50"
                            : "border-green-300 text-green-700 hover:bg-green-50"
                        } disabled:opacity-60`}
                        title={
                          u.is_active ? "Nonaktifkan akun" : "Aktifkan akun"
                        }
                      >
                        {savingId === u.id
                          ? "Menyimpan..."
                          : u.is_active
                          ? "Nonaktifkan"
                          : "Aktifkan"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
