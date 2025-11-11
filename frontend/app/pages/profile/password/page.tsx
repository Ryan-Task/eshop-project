"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPass, setSavingPass] = useState(false);
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/pages/auth/login");
  }, [router]);

  const handleChangePassword = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/pages/auth/login");
      return;
    }
    // HANYA wajibkan password baru + konfirmasi
    if (!newPassword || !confirmPassword) {
      alert("Isi password baru dan konfirmasi.");
      return;
    }
    try {
      setSavingPass(true);
      const body: any = {
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      };
      // Sertakan current_password hanya jika diisi
      if (currentPassword) {
        body.current_password = currentPassword;
      }
      const res = await fetch("http://127.0.0.1:8000/api/user/password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Gagal mengubah password");
      }
      alert("Password berhasil diubah");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.push("/pages/profile");
    } catch (e: any) {
      alert(e?.message || "Gagal mengubah password");
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <main className="min-h-screen bg-white pt-20 font-poppins px-6">
      <div className="max-w-md mx-auto bg-gray-50 rounded-2xl border border-gray-200 p-6">
        <h1 className="text-2xl font-black text-black mb-1">Ubah Password</h1>
        <p className="text-sm text-gray-600 mb-6">
          Masukkan password baru Anda. Password saat ini opsional untuk akun
          Google.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-700 block mb-1">
              Password Saat Ini (opsional)
            </label>
            <div className="relative">
              <input
                type={showCur ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-14 text-black"
              />
              <button
                type="button"
                onClick={() => setShowCur((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center justify-center p-1 text-gray-600 hover:text-black"
                aria-label="Toggle current password"
              >
                {showCur ? (
                  // eye (open)
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
                  // eye-off (closed)
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
          <div>
            <label className="text-sm text-gray-700 block mb-1">
              Password Baru
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-14 text-black"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center justify-center p-1 text-gray-600 hover:text-black"
                aria-label="Toggle new password"
              >
                {showNew ? (
                  // eye (open)
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
                  // eye-off (closed)
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
          <div>
            <label className="text-sm text-gray-700 block mb-1">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <input
                type={showConf ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-14 text-black"
              />
              <button
                type="button"
                onClick={() => setShowConf((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center justify-center p-1 text-gray-600 hover:text-black"
                aria-label="Toggle confirm password"
              >
                {showConf ? (
                  // eye (open)
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
                  // eye-off (closed)
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
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={savingPass}
          onClick={handleChangePassword}
          className="mt-5 w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-70"
        >
          {savingPass ? "Menyimpan..." : "Simpan Password"}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/pages/profile")}
          className="mt-3 w-full border border-gray-300 text-black py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors"
        >
          Kembali ke Profil
        </motion.button>
      </div>
    </main>
  );
}
