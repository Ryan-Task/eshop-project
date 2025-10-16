"use client";

import { useEffect, useState } from "react";
import api from "../../api/api";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Ambil data user
  const fetchProfile = async () => {
    const token = localStorage.getItem("token");

    // Jika belum login
    if (!token) {
      router.push("/pages/auth/login");
      return;
    }

    try {
      const res = await api.get("/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      // Kalau token invalid, hapus dan arahkan ke login
      localStorage.removeItem("token");
      router.push("/pages/auth/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-white pt-20 font-poppins">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-lg mx-auto bg-gray-50 rounded-2xl shadow-lg p-8 border border-gray-200"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-black mb-2">Profil Akun</h1>
          <p className="text-gray-600 text-sm">
            Informasi akun yang sedang login
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-700 font-medium">Nama</span>
            <span className="text-black font-semibold">{profile.name}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-700 font-medium">Email</span>
            <span className="text-black font-semibold">{profile.email}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-700 font-medium">Role</span>
            <span className="text-black font-semibold">
              {profile.role || "User"}
            </span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            localStorage.removeItem("token");
            router.push("/pages/auth/login");
          }}
          className="mt-8 w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors"
        >
          Logout
        </motion.button>
      </motion.div>
    </div>
  );
}
