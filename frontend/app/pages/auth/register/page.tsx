"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ToastHost, { showToast } from "../../../components/Toast";

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoadRegister?: () => void;
  }
}

const SITE_KEY = "6LfzwggsAAAAADmhExwubliK08jKwMF_okcHnYv6";
const NAME_REGEX = /^[A-Za-z\s]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [widgetId, setWidgetId] = useState<number | null>(null);
  const recaptchaRef = useRef<HTMLDivElement | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  // Load reCAPTCHA
  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = document.querySelector("#recaptcha-script");
    const render = () => {
      if (!window.grecaptcha || !recaptchaRef.current) return;
      try {
        const id = window.grecaptcha.render(recaptchaRef.current, {
          sitekey: SITE_KEY,
          callback: (t: string) => setCaptchaToken(t),
          "expired-callback": () => setCaptchaToken(null),
          "error-callback": () => setCaptchaToken(null),
          theme: "light",
        });
        setWidgetId(id);
      } catch {}
    };
    if (existing) {
      if (window.grecaptcha?.render) render();
      else window.onRecaptchaLoadRegister = render;
      return;
    }
    const s = document.createElement("script");
    s.id = "recaptcha-script";
    s.src =
      "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoadRegister&render=explicit";
    s.async = true;
    s.defer = true;
    window.onRecaptchaLoadRegister = render;
    document.body.appendChild(s);
  }, []);

  const resetCaptcha = () => {
    try {
      if (widgetId !== null && window.grecaptcha) {
        window.grecaptcha.reset(widgetId);
        setCaptchaToken(null);
      }
    } catch {}
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("warning", "Nama wajib diisi.");
      return;
    }
    if (!NAME_REGEX.test(name)) {
      showToast("error", "Nama hanya boleh huruf dan spasi.");
      return;
    }
    if (!email.trim()) {
      showToast("warning", "Email wajib diisi.");
      return;
    }
    if (pw.length < 8) {
      showToast("warning", "Password minimal 8 karakter.");
      return;
    }
    if (pw !== pw2) {
      showToast("error", "Konfirmasi password tidak cocok.");
      return;
    }
    if (!captchaToken) {
      showToast("warning", "Selesaikan captcha terlebih dahulu.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/register", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: pw,
          password_confirmation: pw2,
          captcha_token: captchaToken,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast("error", json?.message || "Registrasi gagal.");
        return;
      }
      showToast(
        "success",
        json?.message || "Registrasi berhasil. OTP dikirim."
      );
      setTimeout(() => {
        router.replace(
          "/pages/auth/verify?email=" + encodeURIComponent(email.trim())
        );
      }, 1000);
    } catch {
      showToast("error", "Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
      resetCaptcha();
    }
  };

  return (
    <>
      <ToastHost />
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="flex bg-white rounded-2xl shadow-[0_0_25px_rgba(0,0,0,0.1)] overflow-visible w-[950px] h-[520px] relative">
          {/* Bagian kiri (robot + logo) - SAMA PERSIS DENGAN LOGIN */}
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

          {/* Bagian kanan (form register) - DIMIRIPKAN DENGAN LOGIN */}
          <div className="w-1/2 flex flex-col justify-center px-12 z-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              Daftar Akun Baru
            </h2>

            <form onSubmit={submitRegister} className="flex flex-col gap-4">
              {/* Nama */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Nama Lengkap
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md text-gray-500 px-3 py-2 focus:outline-none focus:border-[#00c5e7]"
                  placeholder="Contoh: Budi Setiawan"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-md text-gray-500 px-3 py-2 focus:outline-none focus:border-[#00c5e7]"
                  placeholder="you@example.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    className="w-full border border-gray-300 rounded-md text-gray-500 px-3 py-2 pr-14 focus:outline-none focus:border-[#00c5e7]"
                    placeholder="********"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center justify-center p-1 text-gray-600 hover:text-black"
                    aria-label="Toggle password"
                  >
                    {showPw ? (
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

              {/* Konfirmasi Password */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <input
                    type={showPw2 ? "text" : "password"}
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    className="w-full border border-gray-300 rounded-md text-gray-500 px-3 py-2 pr-14 focus:outline-none focus:border-[#00c5e7]"
                    placeholder="********"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw2((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center justify-center p-1 text-gray-600 hover:text-black"
                    aria-label="Toggle confirm password"
                  >
                    {showPw2 ? (
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
                {loading ? "Memproses..." : "Daftar"}
              </button>
            </form>

            <p className="text-center mt-5 text-gray-600 text-sm">
              Sudah punya akun?{" "}
              <a
                href="/pages/auth/login"
                className="text-black font-semibold hover:underline"
              >
                Masuk di sini
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
