"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function SuccessHandler() {
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = params.get("token");

    // Jika ada token, simpan dan verifikasi, lalu redirect ke beranda
    (async () => {
      try {
        if (token) {
          localStorage.setItem("token", token);

          const res = await fetch("http://127.0.0.1:8000/api/verify-token", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const user = data?.user ?? null;
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
          }

          // Beritahu navbar/komponen lain
          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new Event("authChange"));
        }
      } catch {
        // abaikan error kecil, tetap redirect
      } finally {
        router.replace("/");
      }
    })();
  }, [params, router]);

  return null;
}

export default function AuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="animate-spin h-10 w-10 rounded-full border-b-2 border-black" />
        </div>
      }
    >
      <SuccessHandler />
    </Suspense>
  );
}
