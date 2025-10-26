"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../../api/api";

export default function AuthSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      router.replace("/auth/login");
      return;
    }

    (async () => {
      try {
        // simpan token segera
        localStorage.setItem("token", token);

        // verifikasi token dan ambil user
        const res = await api.get("/verify-token", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const user = res.data?.user ?? null;
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
          localStorage.setItem(
            "isVerified",
            user.is_verified ? "true" : "false"
          );
        } else {
          localStorage.removeItem("user");
          localStorage.setItem("isVerified", "false");
        }

        // beri tahu komponen lain (navbar) untuk update
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("authChange"));
      } catch (err) {
        console.error("verify-token failed:", err);
        // tetap simpan token namun tandai tidak verified supaya UI tidak menampilkan login state penuh
        localStorage.setItem("isVerified", "false");
      } finally {
        // hapus token dari URL agar pengguna berada di "/" bersih
        try {
          const cleanUrl = window.location.origin + "/";
          history.replaceState(null, "", cleanUrl);
        } catch (e) {
          // ignore
        }
        // arahkan ke homepage
        router.replace("/");
      }
    })();
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">
          Mengautentikasi...
        </h2>
        <p className="text-gray-500">
          Mohon tunggu sebentar, Anda akan diarahkan.
        </p>
      </div>
    </div>
  );
}
