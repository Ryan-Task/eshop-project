"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../../api/api";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const email = params.get("email") || "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || pw !== pw2) {
      setMsg("Password tidak cocok");
      return;
    }
    try {
      setLoading(true);
      await api.post("/password/reset", {
        token,
        email,
        password: pw,
        password_confirmation: pw2,
      });
      alert("Password berhasil direset");
      router.push("/pages/auth/login");
    } catch (err: any) {
      setMsg(err?.response?.data?.message || "Gagal reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 border border-gray-200 p-6 rounded-xl bg-gray-50"
      >
        <h1 className="text-xl font-bold text-black">Reset Password</h1>
        {!token && (
          <div className="text-sm text-red-600">
            Token tidak ditemukan di URL.
          </div>
        )}
        <div>
          <label className="text-sm text-gray-700 block mb-1">
            Password Baru
          </label>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
          />
        </div>
        <div>
          <label className="text-sm text-gray-700 block mb-1">
            Konfirmasi Password
          </label>
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
          />
        </div>
        {msg && <div className="text-xs text-red-600">{msg}</div>}
        <button
          type="submit"
          disabled={loading || !token}
          className={`w-full py-2 rounded-lg font-semibold ${
            loading || !token
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-black text-white hover:bg-gray-800"
          }`}
        >
          {loading ? "Memproses..." : "Reset Password"}
        </button>
      </form>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-sm text-gray-600">Memuat...</div>
        </main>
      }
    >
      <ResetForm />
    </Suspense>
  );
}
