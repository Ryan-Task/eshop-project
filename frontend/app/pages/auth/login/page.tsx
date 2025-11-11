"use client";

import api from "../../../api/api";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ToastHost, { showToast } from "../../../components/Toast";

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad: () => void;
  }
}

const RECAPTCHA_SITE_KEY = "6LfzwggsAAAAADmhExwubliK08jKwMF_okcHnYv6";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [info, setInfo] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const recaptchaRef = useRef<HTMLDivElement | null>(null);
  const [captchaWidgetId, setCaptchaWidgetId] = useState<number | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // load reCAPTCHA v2 script once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const alreadyLoaded = !!document.querySelector("#recaptcha-script");
    const render = () => {
      if (!window.grecaptcha || !recaptchaRef.current) return;
      try {
        const id = window.grecaptcha.render(recaptchaRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: (token: string) => setCaptchaToken(token),
          "expired-callback": () => setCaptchaToken(null),
          "error-callback": () => setCaptchaToken(null),
          theme: "light",
        });
        setCaptchaWidgetId(id);
      } catch {
        // ignore
      }
    };
    if (alreadyLoaded) {
      // script already there; try render
      if (window.grecaptcha?.render) render();
      else window.onRecaptchaLoad = render;
      return;
    }
    const s = document.createElement("script");
    s.id = "recaptcha-script";
    s.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
    s.async = true;
    s.defer = true;
    window.onRecaptchaLoad = render;
    document.body.appendChild(s);
    return () => {
      // optional cleanup
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await api.post("/login", { ...form, captcha_token: captchaToken });
      // 2FA required?
      if (res.data?.requires_otp) {
        setAwaitingOtp(true);
        setInfo("Kode OTP telah dikirim ke email Anda.");
        return;
      }
      // Normal login
      const token = res.data?.token;
      const user = res.data?.user;
      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem(
          "isVerified",
          user?.email_verified_at || user?.is_verified ? "true" : "false"
        );
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("authChange"));
      }
      router.push("/");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Login gagal. Periksa kredensial Anda.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await api.post("/2fa/verify", {
        email: form.email,
        code: otp,
      });
      const token = res.data?.token;
      const user = res.data?.user;
      if (token && user) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem(
          "isVerified",
          user?.email_verified_at || user?.is_verified ? "true" : "false"
        );
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("authChange"));
        router.push("/");
      } else {
        setError("Verifikasi OTP gagal.");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Kode OTP tidak valid atau kedaluwarsa.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setGoogleLoading(true);
      const res = await api.get("/auth/google");
      const url = res.data?.url;
      if (url) {
        // langsung redirect ke URL Google OAuth
        window.location.href = url;
      } else {
        const serverErr =
          res.data?.error || res.data?.detail || JSON.stringify(res.data);
        alert("Server returned unexpected response: " + serverErr);
      }
    } catch (err: any) {
      console.error("Google OAuth error:", err);
      const serverData = err.response?.data;
      const msg =
        serverData?.error ||
        serverData?.detail ||
        serverData?.response ||
        err.message ||
        "Gagal memulai login dengan Google. Coba lagi.";
      alert("Google OAuth failed: " + msg);
      console.error("Server response data:", serverData);
    } finally {
      setGoogleLoading(false);
    }
  };

  // TEMP: call this in your login submit handler (before calling API)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      showToast?.("warning", "Mohon selesaikan captcha terlebih dahulu.");
      return;
    }
    try {
      const res = await api.post("/login", { ...form, captcha_token: captchaToken });
      // 2FA required?
      if (res.data?.requires_otp) {
        setAwaitingOtp(true);
        setInfo("Kode OTP telah dikirim ke email Anda.");
        return;
      }
      // Normal login
      const token = res.data?.token;
      const user = res.data?.user;
      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem(
          "isVerified",
          user?.email_verified_at || user?.is_verified ? "true" : "false"
        );
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("authChange"));
      }
      router.push("/");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Login gagal. Periksa kredensial Anda.";
      setError(msg);
    } finally {
      setLoading(false);
      // reset widget untuk submit berikutnya
      try {
        if (captchaWidgetId !== null && window.grecaptcha) {
          window.grecaptcha.reset(captchaWidgetId);
          setCaptchaToken(null);
        }
      } catch {}
    }
  };

  return (
    <>
      <ToastHost />
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="flex bg-white rounded-2xl shadow-[0_0_25px_rgba(0,0,0,0.1)] overflow-visible w-[950px] h-[520px] relative">
          {/* Bagian kiri (robot + logo) */}
          <div className="w-1/2 bg-black flex flex-col justify-center items-center relative p-6 overflow-visible rounded-l-2xl">
            <div className="absolute top-6 left-6 bg-white p-2 rounded-full shadow-sm flex items-center gap-2">
              <img
                src="/images/logoo.jpg"
                alt="Logo"
                className="w-6 h-6 rounded-full"
              />
              <span className="font-semibold text-gray-700">TechStore</span>
            </div>

            <img
              src="/images/robot.png"
              alt="Robot"
              className="w-[410px] object-contain absolute right-[-15px]"
            />
          </div>

          {/* Bagian kanan (form login) */}
          <div className="w-1/2 flex flex-col justify-center px-12 z-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              {awaitingOtp ? "Verifikasi OTP" : "Masuk ke Akun"}
            </h2>

            {error && (
              <p className="text-red-500 text-center mb-3 font-semibold">
                {error}
              </p>
            )}
            {info && (
              <p className="text-green-600 text-center mb-3 font-semibold">
                {info}
              </p>
            )}

            {!awaitingOtp ? (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    className="w-full border border-gray-300 rounded-md text-gray-500 px-3 py-2 focus:outline-none focus:border-[#00c5e7]"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="********"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md text-gray-500 px-3 py-2 pr-14 focus:outline-none focus:border-[#00c5e7]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center justify-center p-1 text-gray-600 hover:text-black"
                      aria-label="Toggle password"
                    >
                      {showPassword ? (
                        // NEW eye (open)
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2.036 12.322a1 1 0 0 1 0-.644C3.423 7.51 7.36 4.5 12 4.5s8.577 3.01 9.964 7.178a1 1 0 0 1 0 .644C20.577 16.49 16.64 19.5 12 19.5s-8.577-3.01-9.964-7.178Z" />
                          <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      ) : (
                        // NEW eye-off (closed)
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c1.658 0 3.233-.335 4.657-.94" />
                          <path d="M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.5a10.523 10.523 0 0 1-4.293 5.774" />
                          <path d="M3 3l18 18" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => router.push("/pages/auth/forgot")}
                    className="text-sm text-gray-600 hover:underline font-medium"
                  >
                    Lupa password?
                  </button>
                </div>

                {/* reCAPTCHA widget */}
                <div className="mt-3">
                  <div ref={recaptchaRef} />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`bg-black text-white font-semibold py-2 rounded-md hover:bg-gray-900 transition-colors duration-200 ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? "Memproses..." : "Masuk"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    Kode OTP
                  </label>
                  <input
                    type="text"
                    placeholder="6 digit"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full border border-gray-300 rounded-md text-gray-700 px-3 py-2 focus:outline-none focus:border-[#00c5e7]"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`bg-black text-white font-semibold py-2 rounded-md hover:bg-gray-900 transition-colors duration-200 ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? "Memproses..." : "Verifikasi & Masuk"}
                </button>
                <button
                  type="button"
                  onClick={() => setAwaitingOtp(false)}
                  className="text-sm underline text-gray-700"
                >
                  Kembali ke login
                </button>
              </form>
            )}

            {/* Google OAuth button */}
            <div className="mt-4 flex flex-col items-center gap-3">
              <button
                onClick={handleGoogleAuth}
                disabled={googleLoading}
                className={`w-full flex items-center justify-center gap-3 border rounded-md py-2 px-4 hover:shadow-sm transition text-black hover:bg-gray-100 hover:border-black transition-colors ${
                  googleLoading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {/* UBAH: ikon google dengan fallback */}
                <img
                  src="/images/google-icon.png"
                  alt="Google"
                  className="w-5 h-5"
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    if (el.src.includes("/images/google-icon.png")) {
                      el.src =
                        "http://127.0.0.1:8000/storage/images/google-icon.png";
                    } else {
                      el.style.display = "none";
                      const span = document.createElement("span");
                      span.textContent = "G";
                      span.className =
                        "w-5 h-5 flex items-center justify-center font-bold text-gray-700";
                      el.parentElement?.insertBefore(span, el.nextSibling);
                    }
                  }}
                />
                <span className="font-semibold text-black">
                  {googleLoading ? "Menghubungkan..." : "Continue with Google"}
                </span>
              </button>
            </div>

            <p className="text-center mt-5 text-gray-600 text-sm">
              Belum punya akun?{" "}
              <a
                href="/pages/auth/register"
                className="text-black font-semibold hover:underline"
              >
                Daftar di sini
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
