"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { showToast } from "../components/Toast";

// NEW: inline avatar placeholder
const FALLBACK_AVATAR =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='100%' height='100%' rx='8' ry='8' fill='%23e5e7eb'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='12'>Avatar</text></svg>";

export default function DefaultNavbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [profileImg, setProfileImg] = useState<string | null>(null);
  const [showOrdersMenu, setShowOrdersMenu] = useState(false);
  const ordersMenuRef = useRef<HTMLDivElement | null>(null);
  const [ordersMenuClickOpen, setOrdersMenuClickOpen] = useState(false);

  const getImageUrl = (path?: string) => {
    if (!path) return "/images/placeholder.svg";
    if (path.startsWith("http")) return path;
    if (path.startsWith("storage/")) return `http://127.0.0.1:8000/${path}`;
    return `http://127.0.0.1:8000/storage/${path}`;
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updateLoginStatus = () => {
    const token = localStorage.getItem("token");
    const isVerified = localStorage.getItem("isVerified");
    // UBAH: gunakan flag isVerified yang diisi saat verify-token
    if (token && isVerified === "true") {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  };

  const updateCartCount = () => {
    // Prefer fast counter
    const fast = parseInt(localStorage.getItem("cartCount") || "0", 10) || 0;

    // Or compute from localStorage 'cart'
    let fromCart = 0;
    const cartData = localStorage.getItem("cart");
    if (cartData) {
      try {
        const cart = JSON.parse(cartData);
        fromCart = Array.isArray(cart)
          ? cart.reduce(
              (total: number, item: any) =>
                total + Number(item?.quantity ?? item?.qty ?? 0),
              0
            )
          : 0;
      } catch {
        fromCart = 0;
      }
    }

    setCartItemsCount(Math.max(fast, fromCart));
  };

  const updateCartCountFromAPI = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setCartItemsCount(0);
        return;
      }

      const response = await fetch("http://127.0.0.1:8000/api/cart", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const cartData = await response.json();
        const count = Array.isArray(cartData)
          ? cartData.reduce(
              (total: number, item: any) =>
                total + Number(item?.quantity ?? item?.qty ?? 0),
              0
            )
          : 0;
        setCartItemsCount(count || 0);
        localStorage.setItem("cart", JSON.stringify(cartData));
      } else {
        // fallback ke localStorage bila gagal
        updateCartCount();
      }
    } catch (error) {
      console.error("Error fetching cart from API:", error);
      updateCartCount();
    }
  };

  const fetchProfileImage = async () => {
    try {
      const token = localStorage.getItem("token");
      const isVerified = localStorage.getItem("isVerified");
      if (!token || isVerified !== "true") {
        setProfileImg(null);
        return;
      }
      const res = await fetch("http://127.0.0.1:8000/api/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const user = await res.json();
        const path = user?.profile_image || null;
        setProfileImg(path ? getImageUrl(path) : null);
        localStorage.setItem("user", JSON.stringify(user));
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  useEffect(() => {
    if (!isMounted) return;

    updateLoginStatus();
    updateCartCountFromAPI();
    fetchProfileImage();

    const handleStorageChange = () => {
      updateLoginStatus();
      updateCartCount();
      fetchProfileImage();
    };
    const handleCartChange = () => {
      updateCartCountFromAPI();
    };
    // NEW
    const handleCartLocal = () => {
      updateCartCount();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("authChange", handleStorageChange);
    window.addEventListener("cartChange", handleCartChange);
    window.addEventListener("cartUpdate", handleCartChange);
    window.addEventListener("cartLocal", handleCartLocal);

    const interval = setInterval(() => {
      updateLoginStatus();
      updateCartCount();
      fetchProfileImage();
    }, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("authChange", handleStorageChange);
      window.removeEventListener("cartChange", handleCartChange);
      window.removeEventListener("cartUpdate", handleCartChange);
      window.removeEventListener("cartLocal", handleCartLocal);
      clearInterval(interval);
    };
  }, [isMounted]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("cart");
    showToast("success", "Logout berhasil");
    router.push("/pages/auth/login");
  };

  const handleCartClick = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      showToast("info", "Silakan login untuk melihat keranjang");
      router.push("/pages/auth/login");
      return;
    }
    router.push("/pages/cart");
  };

  const handleLogin = () => {
    showToast("info", "Masuk untuk melanjutkan");
    router.push("/pages/auth/login");
  };

  const handleRegister = () => {
    showToast("info", "Buat akun baru");
    router.push("/pages/auth/register");
  };

  const handleProfile = () => {
    router.push("/pages/profile");
  };

  useEffect(() => {
    const onClickOutside = (e: MouseEvent | TouchEvent) => {
      if (!ordersMenuRef.current) return;
      if (!ordersMenuRef.current.contains(e.target as Node)) {
        setShowOrdersMenu(false);
        setOrdersMenuClickOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowOrdersMenu(false);
        setOrdersMenuClickOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("touchstart", onClickOutside, {
      passive: true,
    } as any);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("touchstart", onClickOutside as any);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!isMounted) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center py-4">
            <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/98 backdrop-blur-lg shadow-md"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => router.push("/")}
          >
            {/* UBAH: gunakan logo dari public/images/logoo.jpg */}
            <img
              src="/images/logoo.jpg"
              alt="TechStore"
              className="w-10 h-10 rounded-full object-cover border border-gray-300"
              onError={(e) =>
                ((e.currentTarget as HTMLImageElement).src =
                  "/images/placeholder.svg")
              }
            />
            <span className="text-2xl font-black tracking-tight text-black">
              TECHSTORE
            </span>
          </motion.div>

          {/* Links */}
          <div className="hidden md:flex items-center space-x-8">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              className="font-semibold text-gray-700 hover:text-black"
              onClick={() => router.push("/pages/productsfull")}
            >
              Products
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              className="font-semibold text-gray-700 hover:text-black"
              onClick={() => router.push("/pages/about")}
            >
              About
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              className="font-semibold text-gray-700 hover:text-black"
              onClick={() => router.push("/pages/contact")}
            >
              Contact
            </motion.button>

            {/* 🔽 Dropdown Pesanan Saya */}
            <div
              className="relative"
              ref={ordersMenuRef}
              onMouseEnter={() => setShowOrdersMenu(true)}
              onMouseLeave={() => {
                if (!ordersMenuClickOpen) setShowOrdersMenu(false);
              }}
            >
              <button
                className="font-semibold text-gray-700 hover:text-black"
                onClick={() => {
                  const next = !ordersMenuClickOpen;
                  setOrdersMenuClickOpen(next);
                  setShowOrdersMenu(next);
                }}
              >
                Pesanan Saya ▾
              </button>
              {showOrdersMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                  <ul className="py-2 text-sm text-gray-800">
                    <li>
                      <button
                        onClick={() => {
                          setShowOrdersMenu(false);
                          setOrdersMenuClickOpen(false);
                          router.push("/pages/payment/pending");
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100"
                      >
                        Belum Bayar
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setShowOrdersMenu(false);
                          setOrdersMenuClickOpen(false);
                          router.push("/pages/pesanan/dikemas");
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100"
                      >
                        Dikemas
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setShowOrdersMenu(false);
                          setOrdersMenuClickOpen(false);
                          router.push("/pages/pesanan/dikirim");
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100"
                      >
                        Dikirim
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setShowOrdersMenu(false);
                          setOrdersMenuClickOpen(false);
                          router.push("/pages/pesanan/beri-penilaian");
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100"
                      >
                        Beri Penilaian
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          setShowOrdersMenu(false);
                          setOrdersMenuClickOpen(false);
                          router.push("/pages/history");
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100"
                      >
                        History Penilaian
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Auth & Cart */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
              onClick={handleCartClick}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartItemsCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold border-2 border-white"
                >
                  {cartItemsCount}
                </motion.span>
              )}
            </motion.button>

            {!isLoggedIn ? (
              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogin}
                  className="px-6 py-2 rounded-full font-semibold border border-gray-300 hover:border-black text-gray-700 hover:text-black"
                >
                  Login
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRegister}
                  className="px-6 py-2 rounded-full font-semibold bg-black text-white hover:bg-gray-800 border border-black"
                >
                  Register
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                {/* Profil */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 p-1 text-gray-700 hover:text-black"
                  onClick={handleProfile}
                  title="Profil"
                >
                  <img
                    src={profileImg || FALLBACK_AVATAR}
                    alt="Avatar"
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    className="w-8 h-8 rounded-full object-cover border border-gray-300"
                    onError={(e) =>
                      ((e.currentTarget as HTMLImageElement).src =
                        FALLBACK_AVATAR)
                    }
                  />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-full font-semibold border border-red-200 hover:border-red-300 text-red-500 hover:text-red-700"
                >
                  Logout
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
