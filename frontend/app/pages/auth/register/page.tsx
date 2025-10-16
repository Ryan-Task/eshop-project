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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // kirim data register ke backend Laravel
      const response = await api.post("/register", {
        ...formData,
        role: "user", // otomatis user
      });

      const { token, user } = response.data;

      // Simpan token dan data user
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Redirect ke beranda user
      router.push("/");
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

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-500 to-blue-600">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">
          Daftar Akun Baru
        </h1>

        {error && (
          <p className="text-red-500 text-center mb-4 font-semibold">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            name="name"
            placeholder="Nama Lengkap"
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password_confirmation"
            placeholder="Konfirmasi Password"
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.password_confirmation}
            onChange={handleChange}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className={`bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Mendaftar..." : "Daftar"}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600 text-sm">
          Sudah punya akun?{" "}
          <a
            href="/auth/login"
            className="text-blue-600 font-semibold hover:underline"
          >
            Masuk di sini
          </a>
        </p>
      </div>
    </main>
  );
}
