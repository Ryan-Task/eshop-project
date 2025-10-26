"use client";

import api from "../../../api/api";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/login", { email, password });
      localStorage.setItem("token", res.data.token);
      alert("Login berhasil!");
      router.push("/");
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Login gagal! Periksa email dan password."
      );
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

  return (
    <div className="flex justify-center items-center min-h-screen bg-white">
      <div className="flex bg-white rounded-2xl shadow-[0_0_25px_rgba(0,0,0,0.15)] overflow-visible w-[950px] h-[520px] relative">
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
            Masuk ke Akun
          </h2>

          {error && (
            <p className="text-red-500 text-center mb-3 font-semibold">
              {error}
            </p>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md text-gray-700 px-3 py-2 focus:outline-none focus:border-black"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">
                Password
              </label>
              <input
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md text-gray-700 px-3 py-2 focus:outline-none focus:border-black"
                required
              />
            </div>

            <div className="text-right">
              <a
                href="#"
                className="text-sm text-gray-600 hover:underline font-medium"
              >
                Lupa password?
              </a>
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

          {/* Google OAuth button */}
          <div className="mt-4 flex flex-col items-center gap-3">
            <button
              onClick={handleGoogleAuth}
              disabled={googleLoading}
              className={`w-full flex items-center justify-center gap-3 border rounded-md py-2 px-4 hover:shadow-sm transition ${
                googleLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              <img
                src="/images/google-icon.png"
                alt="Google"
                className="w-5 h-5"
              />
              <span className="font-medium">
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
  );
}
