"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCookieBanner, setShowCookieBanner] = useState(true);

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

  const paymentLogos = [
    "VISA",
    "MASTERCARD",
    "PAYPAL",
    "GOPAY",
    "OVO",
    "BCA",
    "MANDIRI",
    "BNI",
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

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/products");
        console.log("Products data:", res.data); // Debug log
        setProducts(res.data);
      } catch (err) {
        console.error("Gagal mengambil produk:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleAddToCart = async (product: any) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Silakan login terlebih dahulu untuk menambahkan ke keranjang!");
        return;
      }

      const res = await axios.post(
        "http://127.0.0.1:8000/api/cart",
        {
          product_id: product.id,
          quantity: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      alert(`${product.name} berhasil ditambahkan ke keranjang!`);
    } catch (error: any) {
      console.error("Gagal menambahkan ke keranjang:", error);
      if (error.response && error.response.status === 401) {
        alert("Sesi login habis, silakan login ulang.");
      } else {
        alert("Terjadi kesalahan saat menambahkan produk ke keranjang.");
      }
    }
  };

  // Fungsi untuk mendapatkan URL gambar yang benar
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return "/images/placeholder.jpg";

    // Jika imagePath sudah berupa URL lengkap
    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    // Jika imagePath adalah path relatif dari storage
    if (imagePath.startsWith("storage/")) {
      return `http://127.0.0.1:8000/${imagePath}`;
    }

    // Jika imagePath hanya nama file
    return `http://127.0.0.1:8000/storage/${imagePath}`;
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 font-poppins">
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

      {/* Featured Products */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Featured Products
            </h2>
            <div className="w-16 h-0.5 bg-black mx-auto mb-6"></div>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
              Pilihan produk terbaik kami dengan teknologi paling mutakhir
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {highlightProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                whileHover={{ y: -5 }}
                className="group relative bg-white rounded-2xl p-6 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div className="absolute top-4 right-4 z-20">
                  <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold">
                    {product.badge}
                  </span>
                </div>

                <div className="w-full h-48 bg-gray-100 rounded-xl mb-6 flex items-center justify-center group-hover:bg-gray-200 transition-all duration-300 overflow-hidden">
                  <div className="text-4xl text-gray-600">💻</div>
                </div>

                <div className="text-sm font-bold text-gray-500 tracking-widest uppercase mb-3">
                  {product.category}
                </div>

                <h3 className="text-xl font-bold mb-3 group-hover:text-gray-800 transition-colors">
                  {product.name}
                </h3>

                <p className="text-gray-600 mb-4 leading-relaxed text-sm">
                  {product.description}
                </p>

                <div className="flex flex-wrap gap-1 mb-4">
                  {product.specs.map((spec, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-gray-900">
                    {product.price}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors"
                  >
                    View Details
                  </motion.button>
                </div>
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

      {/* Payment Methods */}
      <section className="py-16 bg-black">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h3
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center text-white mb-8 text-lg font-bold"
          >
            Trusted Payment Partners
          </motion.h3>

          <div className="relative overflow-hidden py-6">
            <motion.div
              animate={{
                x: [0, -1200],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: "linear",
              }}
              className="flex space-x-8"
            >
              {[...paymentLogos, ...paymentLogos].map((logo, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  className="flex-shrink-0 w-32 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg"
                >
                  <span className="text-sm font-bold text-gray-900">
                    {logo}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* All Products - FIXED IMAGE DISPLAY */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              All Products
            </h2>
            <div className="w-16 h-0.5 bg-black mx-auto mb-6"></div>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
              Jelajahi koleksi lengkap produk elektronik premium kami
            </p>
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
                No products available.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p, index) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -3 }}
                  className="group bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-300 overflow-hidden cursor-pointer shadow-sm hover:shadow-md"
                >
                  {/* Product Image - FIXED */}
                  <Link href={`/pages/products/${p.id}`}>
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-all duration-300 overflow-hidden">
                      {p.image ? (
                        <Image
                          src={getImageUrl(p.image)}
                          alt={p.name}
                          width={300}
                          height={200}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            // Fallback jika gambar error
                            e.currentTarget.style.display = "none";
                            if (
                              e.currentTarget.nextSibling &&
                              (e.currentTarget.nextSibling as HTMLElement).style
                            ) {
                              (
                                e.currentTarget.nextSibling as HTMLElement
                              ).style.display = "flex";
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-full h-full flex items-center justify-center ${
                          p.image ? "hidden" : "flex"
                        }`}
                      >
                        <div className="text-3xl text-gray-600">📦</div>
                      </div>
                    </div>
                  </Link>

                  <div className="p-5">
                    <Link href={`/products/${p.id}`}>
                      <h3 className="text-lg font-bold mb-2 group-hover:text-gray-800 transition-colors cursor-pointer">
                        {p.name}
                      </h3>
                    </Link>
                    <p className="text-xl font-bold text-gray-900 mb-4">
                      Rp {Number(p.price).toLocaleString("id-ID")}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-black text-white py-3 rounded-lg text-base font-bold hover:bg-gray-800 transition-colors"
                      onClick={() => handleAddToCart(p)}
                    >
                      Add to Cart
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

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
