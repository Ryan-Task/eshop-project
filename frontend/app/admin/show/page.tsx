"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Edit3, PlusCircle, Package, ZoomIn } from "lucide-react";
import Link from "next/link";
import api from "../../api/api";
import "../../globals.css"; // pastikan font Poppins di-load di sini

interface Product {
  id: number;
  name: string;
  type: string;
  stock: number;
  harga_modal: number;
  price: number;
  description: string;
  image?: string;
}

export default function AdminShow() {
  const [products, setProducts] = useState<Product[]>([]);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const fetchProducts = () => {
    api
      .get("/products")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error(err));
  };

  const deleteProduct = (id: number) => {
    if (!confirm("Yakin ingin menghapus produk ini?")) return;
    api
      .delete(`/products/${id}`)
      .then(() => fetchProducts())
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <main className="min-h-screen bg-white text-black md:pl-[80px] transition-all duration-300 py-10 font-[Poppins]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 mb-10"
      >
        <div className="flex items-center gap-3">
          <Package size={36} className="text-black" />
          <h1 className="text-3xl font-extrabold tracking-tight text-black">
            Manajemen Produk
          </h1>
        </div>
        <Link
          href="/admin/create"
          className="flex items-center gap-2 bg-black text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-all shadow-md"
        >
          <PlusCircle size={20} />
          Tambah Produk
        </Link>
      </motion.div>

      {/* Table Container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="overflow-x-auto px-6"
      >
        <table className="min-w-full border-collapse overflow-hidden rounded-xl shadow-xl bg-[#0d0d0d] border border-gray-800 text-white">
          <thead>
            <tr className="bg-[#111] text-left text-gray-300 uppercase text-sm font-semibold border-b border-gray-700">
              <th className="px-5 py-4">Gambar</th>
              <th className="px-5 py-4">Nama</th>
              <th className="px-5 py-4">Jenis</th>
              <th className="px-5 py-4">Stok</th>
              <th className="px-5 py-4">Harga Modal</th>
              <th className="px-5 py-4">Harga Jual</th>
              <th className="px-5 py-4">Deskripsi</th>
              <th className="px-5 py-4 text-center">Aksi</th>
            </tr>
          </thead>

          <tbody>
            <AnimatePresence>
              {products.length > 0 ? (
                products.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-gray-800 hover:bg-[#1a1a1a] transition-all"
                  >
                    <td className="px-5 py-4">
                      {p.image ? (
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="relative cursor-pointer"
                          onClick={() =>
                            setZoomImage(
                              `http://localhost:8000/storage/${p.image}`
                            )
                          }
                        >
                          <img
                            src={`http://localhost:8000/storage/${p.image}`}
                            alt={p.name}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-600"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 transition">
                            <ZoomIn size={20} className="text-white" />
                          </div>
                        </motion.div>
                      ) : (
                        <span className="text-gray-500 italic">Tidak ada</span>
                      )}
                    </td>

                    <td className="px-5 py-4 font-semibold text-white">
                      {p.name}
                    </td>
                    <td className="px-5 py-4 text-gray-300">{p.type}</td>
                    <td className="px-5 py-4 text-gray-300">{p.stock}</td>
                    <td className="px-5 py-4 text-green-400 font-semibold">
                      Rp {p.harga_modal.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-blue-400 font-semibold">
                      Rp {p.price.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-gray-300 max-w-[300px] whitespace-pre-wrap">
                      {p.description}
                    </td>

                    <td className="px-5 py-4 flex items-center justify-center gap-3">
                      <Link
                        href={`/admin/edit/${p.id}`}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-all"
                      >
                        <Edit3 size={18} />
                        <span className="hidden sm:inline">Edit</span>
                      </Link>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="flex items-center gap-1 text-red-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={18} />
                        <span className="hidden sm:inline">Hapus</span>
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <td colSpan={8} className="py-10 text-gray-400 italic">
                    Tidak ada produk tersedia.
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </motion.div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setZoomImage(null)}
          >
            <motion.img
              src={zoomImage}
              alt="Zoomed"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="max-w-[90%] max-h-[85%] rounded-lg shadow-2xl border border-gray-700"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
