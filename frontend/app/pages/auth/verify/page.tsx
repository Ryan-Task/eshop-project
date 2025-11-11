"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../../api/api";
import ToastHost, { showToast } from "../../../components/Toast";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showResendCard, setShowResendCard] = useState(false);

  // Prefill email dari query
  useEffect(() => {
    const em = params?.get("email");
    if (em) setEmail(em);
  }, [params]);

  // Fungsi verifikasi kode
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !code.trim()) {
      showToast("warning", "Email dan kode wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/verify", {
        email: email.trim(),
        code: code.trim(),
      });
      const token = res.data?.token;
      const user = res.data?.user;
      if (token && user) {
        try {
          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(user));
          localStorage.setItem("isVerified", "true");
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new Event("authChange"));
        } catch {}
      }
      showToast("success", res.data?.message || "Verifikasi berhasil.");
      setTimeout(() => {
        router.replace("/"); // langsung masuk tanpa login ulang
      }, 900);
    } catch (err: any) {
      const data = err?.response?.data;
      const msg =
        data?.errors?.code?.[0] ||
        data?.errors?.verification_code?.[0] ||
        data?.message ||
        "Verifikasi gagal.";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  // Kirim ulang kode verifikasi
  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("Masukkan email terlebih dahulu sebelum mengirim ulang kode.");
      return;
    }

    setError("");
    setMessage("");
    setResending(true);

    try {
      await api.post("/resend-verification", { email });
      setMessage("Kode verifikasi baru telah dikirim ke email Anda.");
      setShowResendCard(false);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || "Gagal mengirim ulang kode verifikasi."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-white">
      <div className="bg-white shadow-xl border border-gray-200 rounded-2xl p-8 w-[420px] transition-all duration-300">
        <h2 className="text-2xl font-semibold text-center text-gray-900 mb-6">
          Verifikasi Akun
        </h2>

        {error && (
          <p className="text-red-600 text-center font-medium mb-3">{error}</p>
        )}
        {message && (
          <p className="text-green-600 text-center font-medium mb-3">
            {message}
          </p>
        )}

        {!showResendCard ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-black text-gray-800 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Kode Verifikasi
              </label>
              <input
                type="text"
                placeholder="Masukkan kode 6 digit"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-black text-gray-800 bg-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-black text-white font-semibold py-2 rounded-md transition-all duration-200 ${
                loading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-800"
              }`}
            >
              {loading ? "Memverifikasi..." : "Verifikasi Sekarang"}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setShowResendCard(true)}
                className="text-gray-800 underline font-medium hover:text-black transition-all"
              >
                Kirim ulang kode verifikasi
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={handleResend}
            className="space-y-4 animate-fadeIn transition-all"
          >
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Masukkan Email untuk Kirim Ulang
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-black text-gray-800 bg-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={resending}
              className={`w-full bg-black text-white font-semibold py-2 rounded-md transition-all duration-200 ${
                resending
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-gray-800"
              }`}
            >
              {resending ? "Mengirim ulang..." : "Kirim Ulang Kode"}
            </button>

            <button
              type="button"
              onClick={() => setShowResendCard(false)}
              className="w-full border border-gray-400 text-gray-700 font-semibold py-2 rounded-md hover:bg-gray-100 transition-all"
            >
              Kembali ke Verifikasi
            </button>
          </form>
        )}

        <p className="text-center text-gray-700 text-sm mt-5">
          Sudah verifikasi?{" "}
          <a
            href="/pages/auth/login"
            className="text-black underline font-medium hover:opacity-70"
          >
            Masuk di sini
          </a>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-sm text-gray-600">Memuat...</div>
        </main>
      }
    >
      <main className="min-h-screen bg-white pt-20">
        <ToastHost />
        <VerifyInner />
      </main>
    </Suspense>
  );
}
