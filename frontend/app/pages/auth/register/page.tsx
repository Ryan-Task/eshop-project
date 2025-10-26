"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../../api/api";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/register", {
        ...formData,
        role: "user",
      });

      const { token, user } = response.data;
      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
      }

      alert(
        "Registrasi berhasil! Silakan verifikasi akun Anda terlebih dahulu."
      );
      router.push("/auth/verify");
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Terjadi kesalahan saat registrasi. Coba lagi."
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
        // arahkan ke URL Google OAuth yang dikembalikan oleh backend
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
        serverData?.hint ||
        err.message ||
        "Gagal memulai login dengan Google. Coba lagi.";
      alert("Google OAuth failed: " + msg);
      console.error("Server response data:", serverData);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-white to-sky-200">
      <div className="flex bg-white rounded-2xl shadow-[0_0_25px_rgba(0,0,0,0.1)] overflow-visible w-[950px] h-[520px] relative">
        {/* Bagian kiri (robot + logo) */}
        <div className="w-1/2 bg-black flex flex-col justify-center items-center relative p-6 overflow-visible rounded-l-2xl">
          {/* Logo bundar di pojok kiri atas */}
          <div className="absolute top-6 left-6 bg-white p-2 rounded-full shadow-sm flex items-center gap-2">
            <img
              src="/images/logoo.jpg"
              alt="Logo"
              className="w-6 h-6 rounded-full"
            />
            <span className="font-semibold text-gray-700">TechStore</span>
          </div>

          {/* Gambar robot lebih besar dan sedikit keluar */}
          <img
            src="/images/robot.png"
            alt="Robot"
            className="w-[410px] object-contain absolute right-[-15px]"
          />

          {/* Dekorasi lembut */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-6 h-6 bg-white/25 rounded-full top-12 right-20 blur-sm"></div>
            <div className="absolute w-5 h-5 bg-white/25 rounded-full bottom-16 left-14 blur-sm"></div>
            <div className="absolute w-8 h-8 bg-white/25 rounded-full top-1/3 left-1/4 blur-sm"></div>
          </div>
        </div>

        {/* Bagian kanan (form register) */}
        <div className="w-1/2 flex flex-col justify-center px-12 z-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Daftar Akun Baru
          </h2>

          {error && (
            <p className="text-red-500 text-center mb-3 font-semibold">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">
                Nama Lengkap
              </label>
              <input
                type="text"
                name="name"
                placeholder="Masukkan nama lengkap"
                className="w-full border border-gray-300 rounded-md text-gray-500 px-3 py-2 focus:outline-none focus:border-[#00c5e7]"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-md text-gray-500 px-3 py-2 focus:outline-none focus:border-[#00c5e7]"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">
                Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="********"
                className="w-full border border-gray-300 rounded-md text-gray-500 px-3 py-2 focus:outline-none focus:border-[#00c5e7]"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">
                Konfirmasi Password
              </label>
              <input
                type="password"
                name="password_confirmation"
                placeholder="********"
                className="w-full border border-gray-300 rounded-md text-gray-500 px-3 py-2 focus:outline-none focus:border-[#00c5e7]"
                value={formData.password_confirmation}
                onChange={handleChange}
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
              {loading ? "Mendaftar..." : "Daftar"}
            </button>
          </form>

          {/* Tombol Google OAuth */}
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
  );
}
