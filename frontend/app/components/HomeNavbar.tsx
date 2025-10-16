"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function HomeNavbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted state untuk menghindari hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Cek scroll position dengan throttle
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          setIsScrolled(scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };

    setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fungsi untuk update login status
  const updateLoginStatus = () => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
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

        // Simpan ke localStorage untuk konsistensi
        localStorage.setItem("cart", JSON.stringify(cartData));
      }
    } catch (error) {
      console.error("Error fetching cart from API:", error);
      // Fallback ke localStorage jika API gagal
      updateCartCount();
    }
  };

  // Cek apakah sudah login dan get cart count
  useEffect(() => {
    if (!isMounted) return;

    updateLoginStatus();
    updateCartCountFromAPI();

    // Event listener untuk perubahan di localStorage
    const handleStorageChange = () => {
      updateLoginStatus();
      updateCartCount();
    };

    // Event listener untuk custom events
    const handleCartChange = () => {
      updateCartCountFromAPI();
    };

    // Listen untuk berbagai event
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("authChange", handleStorageChange);
    window.addEventListener("cartChange", handleCartChange);
    window.addEventListener("cartUpdate", handleCartChange);

    // Polling untuk perubahan (fallback)
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
    localStorage.removeItem("cart");
    alert("Berhasil logout!");
    setIsLoggedIn(false);
    setCartItemsCount(0);

    // Trigger events untuk sync semua komponen
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

  // Function untuk manual trigger cart update (bisa dipanggil dari komponen lain)
  const triggerCartUpdate = () => {
    window.dispatchEvent(new Event("cartUpdate"));
  };

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/98 backdrop-blur-lg shadow-md" : "bg-transparent"
      }`}
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
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isScrolled ? "bg-black" : "bg-white/20 backdrop-blur-sm"
              }`}
            >
              <span className="font-bold text-lg text-white">TS</span>
            </div>
            <span
              className={`text-2xl font-black tracking-tight transition-colors ${
                isScrolled ? "text-black" : "text-white"
              }`}
            >
              TECHSTORE
            </span>
          </motion.div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              className={`font-semibold transition-colors ${
                isScrolled
                  ? "text-gray-700 hover:text-black"
                  : "text-white/90 hover:text-white"
              }`}
              onClick={() => {
                const productsSection = document.getElementById("products");
                if (productsSection) {
                  productsSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              Products
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              className={`font-semibold transition-colors ${
                isScrolled
                  ? "text-gray-700 hover:text-black"
                  : "text-white/90 hover:text-white"
              }`}
              onClick={() => {
                const aboutSection = document.getElementById("about");
                if (aboutSection) {
                  aboutSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              About
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              className={`font-semibold transition-colors ${
                isScrolled
                  ? "text-gray-700 hover:text-black"
                  : "text-white/90 hover:text-white"
              }`}
              onClick={() => {
                const contactSection = document.getElementById("contact");
                if (contactSection) {
                  contactSection.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              Contact
            </motion.button>
          </div>

          {/* Auth Buttons & Cart */}
          <div className="flex items-center space-x-4">
            {/* Cart Icon with Badge */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative p-2 rounded-lg transition-all ${
                isScrolled
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  : "bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
              }`}
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

              {/* Cart Badge - Selalu tampilkan angka aktual */}
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
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95, y: 0 }}
                  onClick={handleLogin}
                  className={`px-6 py-2 rounded-full font-semibold transition-all border ${
                    isScrolled
                      ? "text-gray-700 hover:text-black border-gray-300 hover:border-black bg-transparent"
                      : "text-white border-white/50 hover:bg-white hover:text-black bg-white/10 backdrop-blur-sm"
                  }`}
                >
                  Login
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95, y: 0 }}
                  onClick={handleRegister}
                  className={`px-6 py-2 rounded-full font-semibold transition-all ${
                    isScrolled
                      ? "bg-black text-white hover:bg-gray-800 border border-black"
                      : "bg-white text-black hover:bg-gray-100 border border-white"
                  }`}
                >
                  Register
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                    isScrolled
                      ? "text-gray-700 hover:text-black"
                      : "text-white hover:text-white/80"
                  }`}
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
                  className={`px-4 py-2 rounded-full font-semibold transition-all border ${
                    isScrolled
                      ? "text-red-500 hover:text-red-700 border-red-200 hover:border-red-300 bg-transparent"
                      : "text-red-300 hover:text-red-200 border-red-300/50 hover:border-red-400/50 bg-white/10 backdrop-blur-sm"
                  }`}
                >
                  <span className="hidden sm:block">Logout</span>
                  <span className="sm:hidden">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </span>
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden absolute top-4 right-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`p-2 rounded-lg transition-colors ${
            isScrolled
              ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
              : "bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
          }`}
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </motion.button>
      </div>
    </motion.nav>
  );
}
