"use client";

import api from "../../../api/api";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/login", { email, password });
      localStorage.setItem("token", res.data.token);
      alert("Login berhasil!");
      router.push("/");
    } catch (err) {
      console.error(err);
      alert("Login gagal!");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-cyan-100 to-sky-200">
      <div className="flex bg-white rounded-2xl shadow-xl overflow-visible w-[950px] h-[520px] relative">
        {/* Bagian kiri (robot) */}
        <div className="w-1/2 bg-[#00c5e7] flex flex-col justify-center items-center relative p-6 overflow-visible rounded-l-2xl">
          {/* Logo bundar di pojok kiri atas */}
          <div className="absolute top-6 left-6 bg-white p-2 rounded-full shadow-sm flex items-center gap-2">
            <img src="/images/logoo.jpg" alt="Logo" className="w-6 h-6 rounded-full" />
            <span className="font-semibold text-gray-700">TechStore</span>
          </div>

          {/* Gambar robot lebih besar dan sedikit keluar */}
          <img
            src="/images/robot.png"
            alt="Robot"
            className="w-[410px] object-contain absolute  right-[-15px]"
          />

          {/* Elemen dekoratif lembut */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-6 h-6 bg-white/25 rounded-full top-12 right-20 blur-sm"></div>
            <div className="absolute w-5 h-5 bg-white/25 rounded-full bottom-16 left-14 blur-sm"></div>
            <div className="absolute w-8 h-8 bg-white/25 rounded-full top-1/3 left-1/4 blur-sm"></div>
          </div>
        </div>

        {/* Bagian kanan (form login) */}
        <div className="w-1/2 flex flex-col justify-center px-12 z-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Login Teknisi
          </h2>
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
                className="w-full border border-gray-300 rounded-md text-gray-500 px-3 py-2 focus:outline-none focus:border-[#00c5e7]"
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
                className="w-full border border-gray-300 rounded-md text-gray-500 px-3 py-2 focus:outline-none focus:border-[#00c5e7]"
              />
            </div>

            <div className="text-right">
              <a
                href="#"
                className="text-sm text-[#00c5e7] hover:underline font-medium"
              >
                forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="bg-[#00c5e7] text-white font-semibold py-2 rounded-md hover:bg-[#00aac5] transition-colors duration-200"
            >
              Log in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
