"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../../api/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setInfo(null);
    try {
      await api.post("/password/forgot", { email });
      setInfo("Jika email terdaftar, kode OTP telah dikirim.");
      setTimeout(
        () =>
          router.push(`/pages/auth/reset?email=${encodeURIComponent(email)}`),
        800
      );
    } catch (e: any) {
      setInfo("Jika email terdaftar, kode OTP telah dikirim.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-black mb-1">Lupa Password</h1>
        <p className="text-sm text-gray-600 mb-4">
          Masukkan email akun Anda. Kami akan mengirim kode OTP.
        </p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="w-full bg-black text-white py-2.5 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-60"
          >
            {sending ? "Mengirim..." : "Kirim Kode OTP"}
          </button>
        </form>

        {info && <p className="mt-3 text-sm text-gray-700">{info}</p>}

        <button
          type="button"
          onClick={() => router.push("/pages/auth/login")}
          className="mt-4 w-full text-sm underline font-semibold text-black"
        >
          Kembali ke Login
        </button>
      </div>
    </main>
  );
}
