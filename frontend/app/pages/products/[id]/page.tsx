"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  harga_modal: number;
  type: string;
  image: string;
  created_at: string;
  updated_at: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Fungsi untuk mendapatkan URL gambar yang benar
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return "/images/placeholder.jpg";

    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    if (imagePath.startsWith("storage/")) {
      return `http://127.0.0.1:8000/${imagePath}`;
    }

    return `http://127.0.0.1:8000/storage/${imagePath}`;
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `http://127.0.0.1:8000/api/products/${productId}`
        );
        console.log("Product detail:", res.data);
        setProduct(res.data);
      } catch (err: any) {
        console.error("Gagal mengambil detail produk:", err);
        setError(err.response?.data?.message || "Gagal memuat detail produk");
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const handleAddToCart = async () => {
    if (!product) return;

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
          quantity: quantity,
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

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;
    if (product && newQuantity > product.stock) return;
    setQuantity(newQuantity);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-gray-300 border-t-black rounded-full"
        />
        <span className="ml-4 text-gray-600">Memuat detail produk...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-2xl font-bold mb-4 text-black">
            Produk Tidak Ditemukan
          </h1>
          <p className="text-black mb-8">{error || "Produk tidak tersedia"}</p>
          <Link
            href="/"
            className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-6xl mx-auto px-6">
          <Link
            href="/"
            className="text-black font-bold text-xl hover:text-gray-700 transition-colors"
          >
            TechStore
          </Link>
        </div>
      </nav>

      {/* Product Detail Section */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-black mb-8">
            <Link href="/" className="hover:text-gray-700 transition-colors">
              Beranda
            </Link>
            <span>/</span>
            <Link href="/" className="hover:text-gray-700 transition-colors">
              Produk
            </Link>
            <span>/</span>
            <span className="font-semibold">{product.name}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              {/* Main Image */}
              <div className="bg-gray-100 rounded-2xl p-8 flex items-center justify-center h-96 overflow-hidden">
                {product.image ? (
                  <Image
                    src={getImageUrl(product.image)}
                    alt={product.name}
                    width={400}
                    height={400}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
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
                  <div className="text-6xl text-gray-600">📦</div>
                </div>
              </div>
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-4 text-black">
                  {product.name}
                </h1>
                <div className="flex items-center space-x-4 mb-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {product.type}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      product.stock > 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {product.stock > 0 ? "Stok Tersedia" : "Stok Habis"}
                  </span>
                </div>
              </div>

              {/* Price Section */}
              <div className="space-y-3">
                <div className="text-4xl font-bold text-black">
                  Rp {Number(product.price).toLocaleString("id-ID")}
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-black">
                  Deskripsi Produk
                </h3>
                <p className="text-black leading-relaxed">
                  {product.description || "Tidak ada deskripsi tersedia."}
                </p>
              </div>

              {/* Product Details */}
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-black">
                  Detail Produk
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-black font-medium">Stok:</span>
                    <span
                      className={`ml-2 font-bold ${
                        product.stock > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {product.stock} unit
                    </span>
                  </div>
                  <div>
                    <span className="text-black font-medium">Kategori:</span>
                    <span className="ml-2 font-bold text-black">
                      {product.type}
                    </span>
                  </div>
                  <div>
                    <span className="text-black font-medium">SKU:</span>
                    <span className="ml-2 font-bold text-black">
                      #{product.id.toString().padStart(6, "0")}
                    </span>
                  </div>
                  <div>
                    <span className="text-black font-medium">Harga:</span>
                    <span className="ml-2 font-bold text-black">
                      Rp {Number(product.price).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div>
                    <span className="text-black font-medium">Status:</span>
                    <span
                      className={`ml-2 font-bold ${
                        product.stock > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {product.stock > 0 ? "Tersedia" : "Habis"}
                    </span>
                  </div>
                  <div>
                    <span className="text-black font-medium">Garansi:</span>
                    <span className="ml-2 font-bold text-black">1 Tahun</span>
                  </div>
                  <div>
                    <span className="text-black font-medium">Ditambahkan:</span>
                    <span className="ml-2 font-bold text-black">
                      {new Date(product.created_at).toLocaleDateString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-black font-medium">Kondisi:</span>
                    <span className="ml-2 font-bold text-green-600">Baru</span>
                  </div>
                </div>
              </div>

              {/* Add to Cart Section */}
              {product.stock > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="space-y-4 pt-6 border-t border-gray-200"
                >
                  {/* Quantity Selector */}
                  <div className="flex items-center space-x-4">
                    <span className="text-black font-bold">Jumlah:</span>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleQuantityChange(quantity - 1)}
                        className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold"
                        disabled={quantity <= 1}
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-bold text-lg text-black">
                        {quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(quantity + 1)}
                        className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold"
                        disabled={quantity >= product.stock}
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm text-black">
                      Stok: {product.stock} unit
                    </span>
                  </div>

                  {/* Total Price */}
                  <div className="flex justify-between items-center py-4 bg-gray-50 rounded-lg px-4">
                    <span className="text-black font-bold text-lg">
                      Total Harga:
                    </span>
                    <span className="text-2xl font-bold text-black">
                      Rp{" "}
                      {(Number(product.price) * quantity).toLocaleString(
                        "id-ID"
                      )}
                    </span>
                  </div>

                  {/* Add to Cart Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddToCart}
                    className="w-full bg-black text-white py-4 rounded-xl text-lg font-bold hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>🛒</span>
                    <span>Tambah ke Keranjang</span>
                  </motion.button>

                  {/* Buy Now Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>⚡</span>
                    <span>Beli Sekarang</span>
                  </motion.button>
                </motion.div>
              )}

              {/* Out of Stock Message */}
              {product.stock <= 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-center py-8 border-t border-gray-200"
                >
                  <div className="text-red-600 font-bold mb-2 text-xl">
                    🔴 STOK HABIS
                  </div>
                  <p className="text-black mb-4 font-medium">
                    Maaf, produk ini sedang tidak tersedia. Silakan cek kembali
                    nanti.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full bg-gray-800 text-white py-3 rounded-lg font-bold hover:bg-gray-700 transition-colors"
                    >
                      Cek Ulang Stok
                    </button>
                    <Link
                      href="/"
                      className="block w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors text-center"
                    >
                      Lihat Produk Lainnya
                    </Link>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl mb-3">🚚</div>
              <h3 className="font-bold text-black mb-2">Gratis Pengiriman</h3>
              <p className="text-black">Untuk pembelian di atas Rp 1.000.000</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">🛡️</div>
              <h3 className="font-bold text-black mb-2">Garansi Resmi</h3>
              <p className="text-black">Garansi 1 tahun dari manufacturer</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="font-bold text-black mb-2">Bantuan 24/7</h3>
              <p className="text-black">Customer service siap membantu</p>
            </div>
          </div>
        </div>
      </section>

      {/* Back to Products */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 bg-black text-white px-8 py-4 rounded-lg font-bold hover:bg-gray-800 transition-colors text-lg"
          >
            <span>←</span>
            <span>Kembali ke Semua Produk</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
