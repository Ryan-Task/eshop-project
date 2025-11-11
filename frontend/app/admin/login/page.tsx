"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../api/api";
import ToastHost, { showToast } from "../../components/Toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Jika sudah login admin, langsung arahkan ke dashboard admin
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      api
        .get("/user", { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          if ((res.data?.role || "user") === "admin") {
            router.replace("/admin/show");
          }
        })
        .catch(() => {});
    } catch {}
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("warning", "Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/login", { email, password });
      const token = res.data?.token;
      const user = res.data?.user;
      if (!token || !user) {
        showToast("error", "Login gagal.");
        return;
      }
      if (user.role !== "admin") {
        showToast("error", "Bukan akun admin.");
        return;
      }
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("isVerified", "true");
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new Event("authChange"));
      showToast("success", "Login admin berhasil.");
      setTimeout(() => router.replace("/admin"), 600);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        "Login gagal. Periksa email dan password.";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-white pt-20 px-4 font-poppins">
      <ToastHost />
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm"
      >
        <h1 className="text-2xl font-black text-black">Admin Login</h1>
        <p className="text-xs text-gray-600 -mt-1">
          Masuk sebagai administrator.
        </p>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Email Admin
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
            placeholder="********"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Login"}
        </button>
      </form>
    </main>
  );
}
