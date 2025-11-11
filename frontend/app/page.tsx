"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import ToastHost, { showToast } from "./components/Toast";

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showCookieBanner, setShowCookieBanner] = useState(true);

  // Carousel state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);

  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [tick, setTick] = useState(0);
  const [testimonials, setTestimonials] = useState<any[]>([]); // NEW

  const productsAbortRef = useRef<AbortController | null>(null);

  const highlightProducts = [
    {
      id: 1,
      name: "MacBook Pro M3",
      category: "FLAGSHIP LAPTOP",
      price: "Rp 32.999.000",
      description:
        "Chip M3 terbaru dengan performa maksimal untuk produktivitas tanpa batas",
      specs: ["Apple M3 Chip", "16GB RAM", "512GB SSD", "Retina Display"],
      badge: "NEW",
      image: "/images/macbook-pro.jpg",
    },
    {
      id: 2,
      name: "iPhone 16 Pro",
      category: "FLAGSHIP SMARTPHONE",
      price: "Rp 24.999.000",
      description: "Kamera 48MP dengan computational photography terdepan",
      specs: ["A18 Pro Chip", '6.7" Super Retina', "5G", "Face ID"],
      badge: "BESTSELLER",
      image: "/images/iphone-pro.jpg",
    },
    {
      id: 3,
      name: "Samsung OLED TV",
      category: "PREMIUM TELEVISION",
      price: "Rp 18.750.000",
      description: "Gambar 4K dengan teknologi Quantum HDR dan AI enhancement",
      specs: ['65" OLED', "4K HDR", "Smart TV", "120Hz"],
      badge: "HOT",
      image: "/images/oled-tv.jpg",
    },
  ];

  // Ganti logo jadi file lokal dari Laravel: public/storage/images
  const paymentLogos = [
    {
      name: "MASTERCARD",
      src: "http://127.0.0.1:8000/storage/images/mastercard.jpg",
    },
    { name: "PAYPAL", src: "http://127.0.0.1:8000/storage/images/paypal.png" },
    { name: "GOPAY", src: "http://127.0.0.1:8000/storage/images/gopay.png" },
    { name: "OVO", src: "http://127.0.0.1:8000/storage/images/ovo.jpg" },
    { name: "BCA", src: "http://127.0.0.1:8000/storage/images/bca.png" },
    {
      name: "MANDIRI",
      src: "http://127.0.0.1:8000/storage/images/mandiri.jpg",
    },
    { name: "BNI", src: "http://127.0.0.1:8000/storage/images/bni.png" },
  ];

  const teamMembers = [
    {
      name: "Alex Johnson",
      role: "CEO & Founder",
      description:
        "Tech enthusiast dengan pengalaman 10+ tahun di industri elektronik",
    },
    {
      name: "Sarah Chen",
      role: "Head of Product",
      description: "Spesialis produk dan inovasi teknologi terkini",
    },
    {
      name: "Mike Rodriguez",
      role: "CTO",
      description:
        "Ahli teknologi dengan fokus pada pengembangan produk masa depan",
    },
  ];

  const stats = [
    { number: "50K+", label: "Produk Terjual" },
    { number: "5 Tahun", label: "Pengalaman" },
    { number: "98%", label: "Kepuasan Pelanggan" },
    { number: "24/7", label: "Customer Support" },
  ];

  // Fetch categories -> backend kembalikan daftar 'type'
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(
          "http://127.0.0.1:8000/api/products/categories"
        );
        setCategories(res.data || []);
      } catch (err) {
        console.error("Gagal mengambil kategori:", err);
      }
    };
    fetchCategories();
  }, []);

  // NEW: safe fetch (abort previous)
  const fetchProducts = async (category: string) => {
    productsAbortRef.current?.abort();
    const ac = new AbortController();
    productsAbortRef.current = ac;
    setLoading(true);
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/products", {
        params: {
          category, // 'all' is OK, backend ignores filter when 'all'
          minimal: 1, // smaller payload for list
          thumb: 1, // prefer thumbnails if available
          // include_archived: 1, // REMOVED: biarkan backend exclude archived
        },
        signal: ac.signal,
      });
      setProducts(Array.isArray(res.data) ? res.data : []);
      setCurrentIndex(0);
    } catch (err) {
      if (axios.isCancel(err)) return;
      showToast?.("error", "Gagal memuat produk");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // REPLACE existing useEffect(fetchProducts) with:
  useEffect(() => {
    fetchProducts(selectedCategory);
    return () => productsAbortRef.current?.abort();
  }, [selectedCategory]);

  // Ambil upcoming products
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(
          "http://127.0.0.1:8000/api/upcoming-products"
        );
        setUpcoming(res.data || []);
      } catch (e) {
        setUpcoming([]);
      }
    })();
  }, []);

  // NEW: Ambil testimonials (review pribadi rating > 3)
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/testimonials");
        setTestimonials(res.data || []);
      } catch (e) {
        setTestimonials([]);
      }
    })();
  }, []);

  // Tick tiap 1 detik untuk update countdown
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return "/images/placeholder.svg";

    // normalisasi
    let p = imagePath.trim().replace(/^\/+/, "");

    // Jika imagePath sudah berupa URL lengkap
    if (p.startsWith("http")) return p;

    // Jika dari symlink storage langsung
    if (p.startsWith("storage/")) return `http://127.0.0.1:8000/${p}`;

    // Jika path menyertakan 'public/', hilangkan karena symlink /storage sudah menunjuk ke public
    if (p.startsWith("public/")) p = p.replace(/^public\//, "");

    // Jika hanya nama file (tanpa folder), arahkan ke folder images
    if (!p.includes("/")) {
      return `http://127.0.0.1:8000/storage/images/${p}`;
    }

    // Path relatif lain di disk public
    return `http://127.0.0.1:8000/storage/${p}`;
  };

  const renderCountdown = (releaseAt?: string) => {
    if (!releaseAt) return "TBA";
    const now = new Date().getTime();
    const target = new Date(releaseAt).getTime();
    const diff = Math.max(0, target - now);
    if (diff <= 0) return "Rilis hari ini";
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `${d}h ${h.toString().padStart(2, "0")}j ${m
      .toString()
      .padStart(2, "0")}m ${s.toString().padStart(2, "0")}d`;
  };

  // FIX: parse rating (string/number) -> number, lalu warnai bintang sesuai nilai
  const renderStars = (avg?: number | string) => {
    const n = Number(avg ?? 0);
    const clamped = isNaN(n) ? 0 : Math.max(0, Math.min(5, n));
    const val = Math.round(clamped * 2) / 2; // nearest 0.5
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= Math.floor(val);
          const half = !filled && i - 0.5 === val;
          return (
            <span
              key={i}
              className={`text-sm ${
                filled || half ? "text-yellow-500" : "text-gray-300"
              }`}
            >
              ★
            </span>
          );
        })}
      </div>
    );
  };

  // Testimonials carousel state (3 cards per slide)
  const tItemsPerSlide = 3;
  const tTotalSlides = Math.ceil(testimonials.length / tItemsPerSlide) || 0;
  const [tIndex, setTIndex] = useState(0);
  const nextTestimonial = () =>
    setTIndex((p) => (tTotalSlides ? (p + 1) % tTotalSlides : 0));
  const prevTestimonial = () =>
    setTIndex((p) =>
      tTotalSlides ? (tTotalSlides + p - 1) % tTotalSlides : 0
    );

  // Reset index when data changes
  useEffect(() => {
    setTIndex(0);
  }, [testimonials.length]);

  // NEW: carousel sizing and navigation helpers (3 items per slide)
  const itemsPerSlide = 3;
  const totalSlides = Math.ceil(products.length / itemsPerSlide);

  const nextProduct = () => {
    setCurrentIndex((prev) => (totalSlides ? (prev + 1) % totalSlides : 0));
  };
  const prevProduct = () => {
    setCurrentIndex((prev) =>
      totalSlides ? (totalSlides + prev - 1) % totalSlides : 0
    );
  };

  // NEW: pointer handlers for swipe on products carousel
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setOffsetX(0);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffsetX(e.clientX - startX);
  };
  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 80;
    if (offsetX < -threshold) nextProduct();
    else if (offsetX > threshold) prevProduct();
    setOffsetX(0);
  };

  // NEW: add-to-cart handler
  const handleAddToCart = async (product: any) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showToast("warning", "Silakan login terlebih dahulu.");
        return;
      }
      await axios.post(
        "http://127.0.0.1:8000/api/cart",
        { product_id: product.id, quantity: 1 },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      showToast("success", `${product.name} ditambahkan ke keranjang`);
      // notify navbars to update cart badge
      window.dispatchEvent(new Event("cartChange"));
      window.dispatchEvent(new Event("cartUpdate"));
    } catch (error: any) {
      if (error?.response?.status === 401) {
        showToast("warning", "Sesi login habis, login ulang.");
      } else {
        showToast("error", "Gagal menambahkan ke keranjang.");
      }
    }
  };

  // NEW: consume ?token from OAuth/Register redirect and verify
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) return;

    // store token immediately
    try {
      localStorage.setItem("token", token);
    } catch {}

    (async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/verify-token", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        const user = res.data?.user ?? null;

        if (user) {
          try {
            localStorage.setItem("user", JSON.stringify(user));
            // consider verified if email_verified_at or is_verified is truthy
            const isVerified =
              !!user?.email_verified_at || !!user?.is_verified || false;
            localStorage.setItem("isVerified", isVerified ? "true" : "false");
          } catch {}
        } else {
          localStorage.removeItem("user");
          localStorage.setItem("isVerified", "false");
        }

        // notify other parts of app
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("authChange"));
      } catch (err) {
        // keep token stored but mark not verified
        localStorage.setItem("isVerified", "false");
      } finally {
        // clean URL without reloading
        const cleanUrl =
          window.location.origin +
          window.location.pathname +
          window.location.hash;
        history.replaceState(null, "", cleanUrl);
      }
    })();
  }, []);

  return (
    <main className="min-h-screen bg-white text-gray-900 font-poppins">
      <ToastHost />
      {/* Cookie Banner */}
      {showCookieBanner && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-0 left-0 right-0 bg-black text-white py-3 px-6 z-50"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm font-medium">
              We use cookies to enhance your experience.{" "}
              <button className="underline font-semibold hover:text-gray-300 transition-colors">
                Learn more
              </button>
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCookieBanner(false)}
              className="bg-white text-black px-4 py-2 text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors"
            >
              ACCEPT
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Hero Video Section */}
      <section className="relative h-screen bg-black overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/images/video.mp4" type="video/mp4" />
            <div className="w-full h-full bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-6xl mb-4">🚀</div>
                <p className="text-2xl font-bold">PREMIUM TECHNOLOGY</p>
              </div>
            </div>
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30" />
        </div>

        <div className="relative z-10 h-full flex items-center justify-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="max-w-4xl"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="inline-block mb-6"
            >
              <div className="w-20 h-0.5 bg-white mb-3 mx-auto"></div>
              <p className="text-white/90 text-sm font-semibold tracking-widest uppercase">
                Premium Collection
              </p>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white tracking-tight"
            >
              <span className="block">Tech</span>
              <span className="block bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Store
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed font-medium"
            >
              Discover the future of technology with our premium electronics
              collection
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-black px-8 py-3 rounded-full font-bold text-base hover:bg-gray-100 transition-all duration-300 shadow-xl"
              >
                Shop Now
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white px-8 py-3 rounded-full font-bold text-base hover:bg-white hover:text-black transition-all duration-300"
              >
                Explore Products
              </motion.button>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-white text-center"
          >
            <div className="text-xs font-semibold tracking-widest mb-2">
              Scroll Down
            </div>
            <div className="w-5 h-8 border border-white rounded-full flex justify-center mx-auto">
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-0.5 h-2 bg-white rounded-full mt-2"
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* About Us Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              About TechStore
            </h2>
            <div className="w-16 h-0.5 bg-black mx-auto mb-6"></div>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Sejak 2020, TechStore telah menjadi destinasi terpercaya untuk
              produk teknologi premium. Kami berkomitmen menyediakan perangkat
              elektronik terbaru dengan kualitas terbaik dan layanan pelanggan
              yang exceptional.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h3 className="text-2xl font-bold mb-6">Our Mission</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Menghubungkan masyarakat dengan teknologi terkini yang dapat
                meningkatkan produktivitas dan kualitas hidup. Kami percaya
                bahwa teknologi yang tepat dapat membawa perubahan positif dalam
                kehidupan sehari-hari.
              </p>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-black rounded-full mr-3"></div>
                  <span className="font-medium">
                    Produk berkualitas dengan garansi resmi
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-black rounded-full mr-3"></div>
                  <span className="font-medium">Layanan purna jual 24/7</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-black rounded-full mr-3"></div>
                  <span className="font-medium">
                    Update produk teknologi terbaru
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="bg-gray-100 rounded-2xl p-8"
            >
              <h3 className="text-2xl font-bold mb-6">Why Choose Us?</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-lg mb-2">🛡️ Garansi Resmi</h4>
                  <p className="text-gray-700">
                    Semua produk dilengkapi dengan garansi resmi dari
                    manufacturer
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-2">🚚 Free Shipping</h4>
                  <p className="text-gray-700">
                    Gratis pengiriman untuk pembelian di atas Rp 1.000.000
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-2">💬 Expert Support</h4>
                  <p className="text-gray-700">
                    Tim support yang berpengalaman siap membantu 24/7
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-black mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Team</h2>
            <div className="w-16 h-0.5 bg-black mx-auto mb-6"></div>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
              Tim profesional yang berdedikasi untuk memberikan pelayanan
              terbaik
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="text-center bg-white rounded-2xl p-8 shadow-lg"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-gray-900 to-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-white">👤</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{member.name}</h3>
                <div className="text-gray-500 font-medium mb-4">
                  {member.role}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {member.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* NEW: Testimonials Carousel (review pribadi rating > 3) */}
      {testimonials.length > 0 && (
        <section className="py-20 bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                What Our Customers Say
              </h2>
              <div className="w-16 h-1 bg-black mx-auto mb-4"></div>
              <p className="text-gray-600">
                Testimoni dari pelanggan (rating di atas 3 bintang)
              </p>
            </motion.div>

            <div className="relative">
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${tIndex * 100}%)` }}
                >
                  {Array.from({ length: tTotalSlides }).map((_, slideIdx) => {
                    const start = slideIdx * tItemsPerSlide;
                    const slice = testimonials.slice(
                      start,
                      start + tItemsPerSlide
                    );
                    return (
                      <div key={slideIdx} className="w-full shrink-0 px-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {slice.map((t, i) => (
                            <motion.div
                              key={t.id ?? `${slideIdx}-${i}`}
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4 }}
                              className="bg-gray-50 rounded-2xl p-6 shadow-sm border border-gray-200 h-full"
                            >
                              <div className="flex items-center justify-between mb-2">
                                {renderStars(t.rating)}
                                <span className="text-xs text-gray-500">
                                  {t.date
                                    ? new Date(t.date).toLocaleDateString(
                                        "id-ID"
                                      )
                                    : ""}
                                </span>
                              </div>
                              <p className="text-gray-800 text-sm leading-relaxed mb-4">
                                {t.comment && t.comment.trim().length > 0
                                  ? `“${t.comment}”`
                                  : `Pengguna memberikan rating ${t.rating}★`}
                              </p>
                              <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                                <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center">
                                  <span className="text-sm">
                                    {(t.user_name?.[0] || "?").toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-black truncate">
                                    {t.user_name || "Anonymous"}
                                  </div>
                                  <div className="text-xs text-gray-600 truncate">
                                    {t.product_name || ""}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {tTotalSlides > 1 && (
                <>
                  <button
                    onClick={prevTestimonial}
                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-white border border-gray-200 hover:border-black rounded-full w-10 h-10 flex items-center justify-center shadow-md"
                    aria-label="Prev testimonials"
                  >
                    ‹
                  </button>
                  <button
                    onClick={nextTestimonial}
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-white border border-gray-200 hover:border-black rounded-full w-10 h-10 flex items-center justify-center shadow-md"
                    aria-label="Next testimonials"
                  >
                    ›
                  </button>

                  <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: tTotalSlides }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setTIndex(i)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === tIndex ? "bg-black w-8" : "bg-gray-300 w-2"
                        }`}
                        aria-label={`Go to testimonial slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Payment Methods - UPDATED CAROUSEL */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <motion.h3
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center text-gray-900 mb-12 text-2xl font-bold tracking-tight"
          >
            Trusted Payment Partners
          </motion.h3>

          <div className="relative overflow-hidden">
            <div className="flex">
              {/* Duplicate the logos for seamless loop */}
              {[...paymentLogos, ...paymentLogos, ...paymentLogos].map(
                (logo, index) => (
                  <motion.div
                    key={index}
                    className="flex-shrink-0 px-4"
                    animate={{
                      x: ["0%", "-100%"],
                    }}
                    transition={{
                      duration: 30,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <div className="w-32 h-20 bg-white rounded-xl border border-gray-200 flex items-center justify-center p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-gray-300">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logo.src}
                        alt={logo.name}
                        className="h-10 w-auto object-contain max-w-full"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = "none";
                          const fallback =
                            el.nextElementSibling as HTMLSpanElement | null;
                          if (fallback) fallback.style.display = "block";
                        }}
                      />
                      <span className="hidden text-xs font-semibold text-gray-900 text-center">
                        {logo.name}
                      </span>
                    </div>
                  </motion.div>
                )
              )}
            </div>

            {/* Gradient overlays for smooth edges */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10" />
          </div>
        </div>
      </section>

      {/* All Products - CAROUSEL 3 ITEMS PER SLIDE */}
      <section id="products" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              All Products
            </h2>
            <div className="w-16 h-0.5 bg-black mx-auto mb-6"></div>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed mb-8">
              Jelajahi koleksi lengkap produk elektronik premium kami
            </p>

            {/* Category Dropdown */}
            <div className="flex justify-center mb-8">
              <div className="relative inline-block">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none bg-white border-2 border-gray-200 hover:border-black transition-colors rounded-full px-6 py-3 pr-10 font-semibold text-gray-900 cursor-pointer focus:outline-none focus:border-black"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </motion.div>

          {loading ? (
            <div className="text-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full mx-auto mb-4"
              />
              <p className="text-gray-600 font-medium">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 font-medium">
                Tidak ada produk di kategori ini.
              </p>
            </div>
          ) : (
            <div className="relative">
              <div
                className="relative overflow-hidden rounded-2xl"
                style={{ touchAction: "pan-y" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={() => {
                  if (isDragging) handlePointerUp();
                }}
              >
                <div
                  className="flex transition-transform duration-500 ease-out"
                  style={{
                    transform: `translateX(calc(-${
                      currentIndex * 100
                    }% + ${offsetX}px))`,
                  }}
                >
                  {Array.from({ length: totalSlides }).map((_, slideIndex) => {
                    const startIdx = slideIndex * itemsPerSlide;
                    const slideProducts = products.slice(
                      startIdx,
                      startIdx + itemsPerSlide
                    );

                    return (
                      <div key={slideIndex} className="w-full shrink-0 px-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {slideProducts.map((p) => {
                            const displayCategory =
                              p.category || p.type || "Produk";
                            return (
                              <motion.div
                                key={p.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: false }}
                                transition={{ duration: 0.5 }}
                                whileHover={{ y: -5 }}
                                className="bg-white rounded-xl border border-gray-200 hover:border-black transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md"
                              >
                                {/* Product Image - ukuran diperbaiki agar pas */}
                                <Link href={`/pages/products/${p.id}`}>
                                  <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden group cursor-pointer relative">
                                    {/* UBAH: pakai <img> langsung untuk hindari timeout optimizer */}
                                    <img
                                      src={getImageUrl(p.image)}
                                      alt={p.name}
                                      loading="lazy"
                                      decoding="async"
                                      fetchPriority="low"
                                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 p-4"
                                      onError={(e) => {
                                        (
                                          e.currentTarget as HTMLImageElement
                                        ).style.display = "none";
                                        const sib = e.currentTarget
                                          .nextElementSibling as HTMLElement | null;
                                        if (sib) sib.style.display = "flex";
                                      }}
                                    />
                                    <div className="w-full h-full hidden items-center justify-center">
                                      <div className="text-4xl text-gray-600">
                                        📦
                                      </div>
                                    </div>
                                  </div>
                                </Link>

                                <div className="p-4">
                                  {/* Category Badge */}
                                  <div className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                                    {displayCategory}
                                  </div>

                                  <Link href={`/pages/products/${p.id}`}>
                                    <h3 className="text-base font-bold mb-2 hover:text-gray-700 transition-colors cursor-pointer line-clamp-2 min-h-[3rem]">
                                      {p.name}
                                    </h3>
                                  </Link>

                                  {/* Harga */}
                                  <p className="text-lg font-bold text-black mb-2">
                                    Rp {Number(p.price).toLocaleString("id-ID")}
                                  </p>

                                  {/* NEW: Rating + jumlah ulasan */}
                                  <div className="flex items-center gap-2 mb-2">
                                    {renderStars(p.rating_average)}
                                    <span className="text-xs text-gray-600">
                                      ({p.rating_count || 0})
                                    </span>
                                  </div>

                                  {/* NEW: Stok dan Terjual */}
                                  <div className="text-xs text-gray-600 mb-3">
                                    Stok:{" "}
                                    <span className="font-semibold text-black">
                                      {p.stock ?? 0}
                                    </span>{" "}
                                    • Terjual:{" "}
                                    <span className="font-semibold text-black">
                                      {p.sold_count ?? 0}
                                    </span>
                                  </div>

                                  {/* Tombol Add to Cart */}
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-bold hover:bg-gray-800 transition-all duration-300"
                                    onClick={() => handleAddToCart(p)}
                                  >
                                    Add to Cart
                                  </motion.button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Controls */}
              {totalSlides > 1 && (
                <>
                  <button
                    aria-label="Previous products"
                    onClick={prevProduct}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-black border-2 border-gray-200 hover:border-black rounded-full w-12 h-12 flex items-center justify-center shadow-xl z-10 transition-all duration-300"
                  >
                    <span className="text-2xl">‹</span>
                  </button>
                  <button
                    aria-label="Next products"
                    onClick={nextProduct}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-black border-2 border-gray-200 hover:border-black rounded-full w-12 h-12 flex items-center justify-center shadow-xl z-10 transition-all duration-300"
                  >
                    <span className="text-2xl">›</span>
                  </button>

                  {/* Dots Indicator */}
                  <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: totalSlides }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === currentIndex
                            ? "bg-black w-8"
                            : "bg-gray-300 hover:bg-gray-400 w-2"
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* NEW: Upcoming Products */}
      {upcoming.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Upcoming Products
              </h2>
              <div className="w-16 h-1 bg-black mx-auto mb-4"></div>
              <p className="text-gray-600">
                Produk yang akan rilis. Pantau hitung mundurnya!
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcoming.map((u: any, i: number) => (
                <motion.div
                  key={u.id ?? i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                >
                  <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(u.teaser_image || "")}
                      alt={u.name}
                      className="w-full h-full object-contain p-4"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <div className="text-xs bg-gray-100 inline-block px-2 py-1 rounded-full font-bold text-gray-700 mb-2">
                      {u.type || "UPCOMING"}
                    </div>
                    <div className="text-lg font-bold text-black">{u.name}</div>
                    <div className="text-sm text-gray-600">
                      Rilis:{" "}
                      {u.release_at
                        ? new Date(u.release_at).toLocaleString("id-ID")
                        : "TBA"}
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      ⏳ {renderCountdown(u.release_at)}
                    </div>
                    {u.price_estimate ? (
                      <div className="mt-2 text-sm text-gray-800">
                        Perkiraan: Rp{" "}
                        {Number(u.price_estimate).toLocaleString("id-ID")}
                      </div>
                    ) : null}
                    {u.description ? (
                      <div className="mt-2 text-sm text-gray-700 line-clamp-2">
                        {u.description}
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="py-16 bg-black text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Stay Updated
            </h3>
            <p className="text-gray-300 mb-8 max-w-xl mx-auto leading-relaxed">
              Dapatkan informasi terbaru tentang produk dan penawaran eksklusif
            </p>
            <div className="max-w-md mx-auto flex bg-white rounded-lg overflow-hidden">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 text-black placeholder-gray-500 focus:outline-none text-base"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-black px-6 py-3 font-bold hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                Subscribe
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center">
            <div className="text-2xl font-bold mb-4">TechStore</div>
            <p className="text-gray-300 mb-8 max-w-md mx-auto leading-relaxed">
              Premium technology products for the modern lifestyle
            </p>

            <div className="flex justify-center space-x-8 mb-8">
              {["Products", "About", "Contact", "Support"].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-gray-300 hover:text-white transition-colors font-medium"
                >
                  {item}
                </a>
              ))}
            </div>

            <div className="text-gray-400 text-sm">
              © 2025 TechStore. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Cart Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 z-40 bg-black text-white p-4 rounded-full shadow-2xl hover:bg-gray-800 transition-colors"
      >
        <span className="text-lg font-bold">🛒</span>
      </motion.button>
    </main>
  );
}
