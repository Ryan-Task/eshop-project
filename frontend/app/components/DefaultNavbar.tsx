"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function DefaultNavbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted state untuk menghindari hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fungsi untuk update login status (hanya aktif jika user sudah verifikasi)
  const updateLoginStatus = () => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      setIsLoggedIn(false);
      return;
    }

    try {
      const user = JSON.parse(userData);

      // Jika belum verifikasi, jangan dianggap login
      if (!user.email_verified_at) {
        setIsLoggedIn(false);
        return;
      }

      setIsLoggedIn(true);
    } catch (error) {
      console.error("Error parsing user data:", error);
      setIsLoggedIn(false);
    }
  };

  // Fungsi untuk update cart count dari localStorage
  const updateCartCount = () => {
    const cartData = localStorage.getItem("cart");
    if (cartData) {
      try {
        const cart = JSON.parse(cartData);
        const count = cart.reduce(
          (total: number, item: any) => total + item.quantity,
          0
        );
        setCartItemsCount(count);
      } catch (error) {
        console.error("Error parsing cart data:", error);
        setCartItemsCount(0);
      }
    } else {
      setCartItemsCount(0);
    }
  };

  // Fungsi untuk update cart count dari API
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
        const count = cartData.reduce(
          (total: number, item: any) => total + item.quantity,
          0
        );
        setCartItemsCount(count);

        localStorage.setItem("cart", JSON.stringify(cartData));
      }
    } catch (error) {
      console.error("Error fetching cart from API:", error);
      updateCartCount();
    }
  };

  // Cek login + cart saat komponen mount
  useEffect(() => {
    if (!isMounted) return;

    updateLoginStatus();
    updateCartCountFromAPI();

    const handleStorageChange = () => {
      updateLoginStatus();
      updateCartCount();
    };

    const handleCartChange = () => {
      updateCartCountFromAPI();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("authChange", handleStorageChange);
    window.addEventListener("cartChange", handleCartChange);
    window.addEventListener("cartUpdate", handleCartChange);

    const interval = setInterval(() => {
      updateLoginStatus();
      updateCartCount();
    }, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("authChange", handleStorageChange);
      window.removeEventListener("cartChange", handleCartChange);
      window.removeEventListener("cartUpdate", handleCartChange);
      clearInterval(interval);
    };
  }, [isMounted]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("cart");
    alert("Berhasil logout!");
    setIsLoggedIn(false);
    setCartItemsCount(0);

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("authChange"));
    window.dispatchEvent(new Event("cartChange"));
    window.dispatchEvent(new Event("cartUpdate"));

    router.push("/pages/auth/login");
  };

  const handleCartClick = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Silakan login terlebih dahulu untuk melihat keranjang!");
      router.push("/pages/auth/login");
      return;
    }
    router.push("/pages/cart");
  };

  const handleLogin = () => {
    router.push("/pages/auth/login");
  };

  const handleRegister = () => {
    router.push("/pages/auth/register");
  };

  const handleProfile = () => {
    router.push("/pages/profile");
  };

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
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black">
              <span className="font-bold text-lg text-white">TS</span>
            </div>
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
              onClick={() => router.push("/#products")}
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
              onClick={() => router.push("/#contact")}
            >
              Contact
            </motion.button>
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
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 p-2 text-gray-700 hover:text-black"
                  onClick={handleProfile}
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span className="font-medium hidden sm:block">Profile</span>
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
