"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ToastHost, { showToast } from "../../components/Toast";

interface Product {
  id: number;
  name: string;
  type: string;
  price: number;
  stock: number;
  image: string;
  description?: string;
  rating_average?: number;
  rating_count?: number;
  sold_count?: number;
}

export default function ProductsFullPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch categories
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

  // Fetch all products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/products", {
          params: {
            minimal: 1,
          },
        });
        const list = Array.isArray(res.data) ? res.data : [];
        setProducts(list);
        setFilteredProducts(list);
      } catch (err) {
        console.error("Gagal mengambil produk:", err);
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Filter products by category and search
  useEffect(() => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.type === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [selectedCategory, searchQuery, products]);

  // NEW: helper
  const bumpCartLocal = (delta: number) => {
    try {
      const cur = parseInt(localStorage.getItem("cartCount") || "0", 10) || 0;
      localStorage.setItem("cartCount", String(Math.max(0, cur + delta)));
      window.dispatchEvent(new Event("cartLocal"));
    } catch {}
  };

  // REPLACE: handleAddToCart → optimistic
  const handleAddToCart = async (product: Product) => {
    const qty = 1;
    const token = localStorage.getItem("token");
    if (!token) {
      showToast("warning", "Silakan login terlebih dahulu.");
      router.push("/pages/auth/login");
      return;
    }

    bumpCartLocal(qty);
    showToast("success", `${product.name} ditambahkan ke keranjang`);

    try {
      await axios.post(
        "http://127.0.0.1:8000/api/cart",
        { product_id: product.id, quantity: qty },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      window.dispatchEvent(new Event("cartUpdate"));
    } catch (error: any) {
      bumpCartLocal(-qty);
      if (error?.response?.status === 401) {
        showToast("warning", "Sesi login habis, login ulang.");
      } else {
        showToast("error", "Gagal menambahkan produk ke keranjang.");
      }
    }
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return "/images/placeholder.jpg";
    if (imagePath.startsWith("http")) return imagePath;
    if (imagePath.startsWith("storage/"))
      return `http://127.0.0.1:8000/${imagePath}`;
    return `http://127.0.0.1:8000/storage/${imagePath}`;
  };

  // Helper bintang rating
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

  return (
    <main className="min-h-screen bg-white font-poppins pt-20">
      <ToastHost />
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
            All Products
          </h1>
          <div className="w-20 h-0.5 bg-black mb-6"></div>
          <p className="text-gray-600 text-lg">
            Temukan produk teknologi terbaik untuk kebutuhan Anda
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative max-w-2xl">
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 pl-12 border-2 border-gray-200 rounded-full focus:outline-none focus:border-black transition-colors text-black"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filter */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-24">
              <h3 className="text-lg font-bold text-black mb-4">Kategori</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    selectedCategory === "all"
                      ? "bg-black text-white font-semibold"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Semua Produk ({products.length})
                </button>
                {categories.map((cat) => {
                  const count = products.filter((p) => p.type === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                        selectedCategory === cat
                          ? "bg-black text-white font-semibold"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.aside>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full"
                />
                <span className="ml-4 text-gray-600">Memuat produk...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-black mb-2">
                  Produk Tidak Ditemukan
                </h3>
                <p className="text-gray-600 mb-6">
                  Coba ubah kata kunci atau kategori pencarian
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                >
                  Reset Filter
                </button>
              </motion.div>
            ) : (
              <>
                {/* Result Count */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-6 text-gray-600"
                >
                  Menampilkan {filteredProducts.length} produk
                  {searchQuery && ` untuk "${searchQuery}"`}
                </motion.div>

                {/* Products Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      whileHover={{ y: -5 }}
                      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-black hover:shadow-md transition-all duration-300"
                    >
                      {/* Product Image */}
                      <Link href={`/pages/products/${product.id}`}>
                        <div className="w-full aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden group cursor-pointer">
                          {product.image ? (
                            <Image
                              src={getImageUrl(product.image)}
                              alt={product.name}
                              width={300}
                              height={225}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 p-4"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                if (e.currentTarget.nextSibling) {
                                  (
                                    e.currentTarget.nextSibling as HTMLElement
                                  ).style.display = "flex";
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-full h-full flex items-center justify-center ${
                              product.image ? "hidden" : "flex"
                            }`}
                          >
                            <div className="text-4xl text-gray-600">📦</div>
                          </div>
                        </div>
                      </Link>

                      <div className="p-4">
                        {/* Category Badge */}
                        <div className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2">
                          {product.type}
                        </div>

                        {/* Product Name */}
                        <Link href={`/pages/products/${product.id}`}>
                          <h3 className="text-base font-bold text-black mb-2 hover:text-gray-700 transition-colors cursor-pointer line-clamp-2 min-h-[3rem]">
                            {product.name}
                          </h3>
                        </Link>

                        {/* Harga */}
                        <p className="text-lg font-bold text-black mb-2">
                          Rp {Number(product.price).toLocaleString("id-ID")}
                        </p>

                        {/* Rating + jumlah ulasan */}
                        <div className="flex items-center gap-2 mb-2">
                          {renderStars(product.rating_average)}
                          <span className="text-xs text-gray-600">
                            ({product.rating_count ?? 0})
                          </span>
                        </div>

                        {/* Stok + Terjual */}
                        <div className="text-xs text-gray-600 mb-3">
                          Stok:{" "}
                          <span className="font-semibold text-black">
                            {product.stock ?? 0}
                          </span>{" "}
                          • Terjual:{" "}
                          <span className="font-semibold text-black">
                            {product.sold_count ?? 0}
                          </span>
                        </div>

                        {/* Add to Cart Button */}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock <= 0}
                          className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
                            product.stock > 0
                              ? "bg-black text-white hover:bg-gray-800"
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
