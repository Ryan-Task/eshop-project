"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  PlusCircle,
  ZoomIn,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import api from "../../api/api";
import ToastHost, { showToast } from "../../components/Toast";

interface Product {
  id: number;
  name: string;
  type: string;
  stock: number;
  harga_modal: number;
  price: number;
  description: string;
  image?: string;
  is_archived?: boolean; // NEW
}

export default function AdminShow() {
  const allowed = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      const token = localStorage.getItem("token");
      const role =
        JSON.parse(localStorage.getItem("user") || "{}")?.role || "user";
      if (!token || role !== "admin") {
        window.location.replace("/admin/login");
        return false;
      }
      return true;
    } catch {
      window.location.replace("/admin/login");
      return false;
    }
  }, []);
  if (!allowed) return null;

  const [products, setProducts] = useState<Product[]>([]);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  // NEW: loading + abort
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  // NEW: confirm delete state
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return "/images/placeholder.jpg";
    const p = String(imagePath).replace(/^\/+/, "");
    if (p.startsWith("http")) return p;
    if (p.startsWith("storage/")) return `http://127.0.0.1:8000/${p}`;
    if (p.startsWith("public/"))
      return `http://127.0.0.1:8000/storage/${p.replace(/^public\//, "")}`;
    if (!p.includes("/")) return `http://127.0.0.1:8000/storage/images/${p}`;
    return `http://127.0.0.1:8000/storage/${p}`;
  };

  const fetchProducts = () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    api
      .get("/products", {
        params: { include_archived: 1, admin_list: 1 },
        signal: ac.signal,
      })
      .then((res) => setProducts(res.data || []))
      .catch((err) => {
        if (err.name !== "CanceledError") console.error(err);
        if (!Array.isArray(products)) setProducts([]);
      })
      .finally(() => setLoading(false));
  };

  // REPLACE alert/confirm flows with toasts + modal
  const deleteProduct = (id: number) => {
    api
      .delete(`/products/${id}`)
      .then(() => {
        showToast("success", "Produk dihapus.");
        fetchProducts();
      })
      .catch((err) => {
        console.error(err);
        showToast("error", "Gagal menghapus produk.");
      });
  };

  const archiveProduct = async (id: number) => {
    try {
      await api.post(`/products/${id}/archive`);
      showToast("success", "Produk diarsipkan.");
      fetchProducts();
    } catch {
      showToast("error", "Gagal mengarsipkan produk");
    }
  };

  const unarchiveProduct = async (id: number) => {
    try {
      await api.post(`/products/${id}/unarchive`);
      showToast("success", "Arsip produk dibatalkan.");
      fetchProducts();
    } catch {
      showToast("error", "Gagal membatalkan arsip");
    }
  };

  useEffect(() => {
    fetchProducts();
    return () => abortRef.current?.abort();
  }, []);

  return (
    <>
      {/* NEW: Toast host */}
      <ToastHost />
      {/* NEW: Sidebar (compact, overflow-hidden, icon-only) */}
      <aside className="fixed left-0 top-0 bottom-0 w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2 z-40 overflow-hidden">
        <a
          href="/admin/show"
          title="Produk"
          className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-xs font-bold hover:bg-gray-50"
        >
          P
        </a>
        <a
          href="/admin/pengiriman"
          title="Pengiriman"
          className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-xs font-bold hover:bg-gray-50"
        >
          K
        </a>
        <a
          href="/admin/upcoming"
          title="Upcoming"
          className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-xs font-bold hover:bg-gray-50"
        >
          U
        </a>
        {/* spacer */}
        <div className="flex-1" />
      </aside>

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
          <table className="min-w-full border-collapse overflow-hidden rounded-xl shadow-xl bg-white border border-gray-200 text-black">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-700 uppercase text-sm font-semibold border-b border-gray-200">
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
                {loading ? (
                  // NEW: skeleton rows while loading
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-5 py-4">
                        <div className="w-16 h-16 bg-gray-200 animate-pulse rounded-md" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-40 bg-gray-200 animate-pulse rounded mb-2" />
                        <div className="h-3 w-24 bg-gray-100 animate-pulse rounded" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-12 bg-gray-200 animate-pulse rounded" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-52 bg-gray-200 animate-pulse rounded" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
                      </td>
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                  >
                    <td className="px-5 py-6 text-gray-700" colSpan={8}>
                      Tidak ada produk.
                    </td>
                  </motion.tr>
                ) : (
                  products.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: i * 0.02 }}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-all ${
                        p.is_archived ? "opacity-60" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="relative w-16 h-16 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getImageUrl(p.image)}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onClick={() => setZoomImage(getImageUrl(p.image))}
                            title="Klik untuk perbesar"
                            onError={(e) =>
                              ((e.currentTarget as HTMLImageElement).src =
                                "/images/placeholder.jpg")
                            }
                          />
                          <button
                            className="absolute bottom-1 right-1 bg-white/90 border border-gray-200 rounded-full p-1"
                            title="Perbesar"
                            onClick={() => setZoomImage(getImageUrl(p.image))}
                          >
                            <ZoomIn size={14} />
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        <div className="flex flex-col gap-1">
                          <span className="text-black">{p.name}</span>
                          {p.is_archived && (
                            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 w-fit">
                              Diarsipkan
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">{p.type}</td>
                      <td className="px-5 py-4">{p.stock}</td>
                      <td className="px-5 py-4">
                        Rp {Math.round(p.harga_modal).toLocaleString("id-ID")}
                      </td>
                      <td className="px-5 py-4">
                        Rp {Math.round(p.price).toLocaleString("id-ID")}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-gray-700 line-clamp-2 max-w-sm">
                          {p.description}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/admin/edit/${p.id}`}
                            className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-100 flex items-center gap-1"
                            title="Edit"
                          >
                            <Pencil size={14} />
                            Edit
                          </Link>
                          {p.is_archived ? (
                            <button
                              onClick={() => unarchiveProduct(p.id)}
                              className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-100 flex items-center gap-1"
                              title="Unarchive"
                            >
                              <ArchiveRestore size={14} />
                              Unarchive
                            </button>
                          ) : (
                            <button
                              onClick={() => archiveProduct(p.id)}
                              className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-100 flex items-center gap-1"
                              title="Archive"
                            >
                              <Archive size={14} />
                              Archive
                            </button>
                          )}
                          {/* NEW: open confirm modal instead of confirm() */}
                          <button
                            onClick={() => setConfirmId(p.id)}
                            className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-1"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
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

        {/* NEW: Confirm Delete Modal */}
        {confirmId !== null && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-[90%] max-w-md border border-gray-200">
              <h3 className="text-lg font-bold text-black mb-2">
                Hapus Produk?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Produk "
                {products.find((x) => x.id === confirmId)?.name || "tanpa nama"}
                " akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmId(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    const id = confirmId;
                    setConfirmId(null);
                    deleteProduct(id!);
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
