"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../api/api";
import { motion } from "framer-motion";
import { ArrowLeftCircle, Save } from "lucide-react";
import Link from "next/link";

export default function EditProduct() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    api.get(`/products/${id}`).then((res) => setProduct(res.data));
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, files } = e.target as HTMLInputElement;
    if (name === "image" && files) {
      setProduct({ ...product, image: files[0] });
    } else {
      setProduct({ ...product, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(product).forEach(([key, value]) => {
        if (value) formData.append(key, value as any);
      });

      await api.post(`/products/${id}?_method=PUT`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      router.push("/admin/show");
    } catch (error) {
      alert("Gagal memperbarui produk!");
    }
  };

  if (!product)
    return (
      <main className="flex items-center justify-center min-h-screen text-gray-600">
        Memuat data produk...
      </main>
    );

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-10 text-gray-900">
      {/* Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg bg-gray-100 rounded-2xl shadow-xl p-8 border border-gray-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800">
              Edit Produk
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Ubah informasi produk di bawah ini
            </p>
          </div>
          <Link
            href="/admin/show"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-all"
          >
            <ArrowLeftCircle size={22} />
            <span>Kembali</span>
          </Link>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Nama Produk
            </label>
            <input
              name="name"
              type="text"
              value={product.name || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Jenis / Tipe
            </label>
            <input
              name="type"
              type="text"
              value={product.type || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Deskripsi
            </label>
            <textarea
              name="description"
              value={product.description || ""}
              onChange={handleChange}
              placeholder="Tuliskan deskripsi produk..."
              className="w-full border border-gray-300 p-2.5 rounded-lg h-24 resize-none focus:ring-2 focus:ring-black outline-none"
              required
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Stok</label>
              <input
                name="stock"
                type="number"
                value={product.stock || ""}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">
                Harga Modal
              </label>
              <input
                name="harga_modal"
                type="number"
                value={product.harga_modal || ""}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Harga Jual
            </label>
            <input
              name="price"
              type="number"
              value={product.price || ""}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Gambar Produk
            </label>
            <input
              name="image"
              type="file"
              accept="image/*"
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-black outline-none"
            />
            {product.image && typeof product.image === "string" && (
              <img
                src={`http://localhost:8000/storage/${product.image}`}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg mt-3 border border-gray-300 shadow-sm"
              />
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-all"
          >
            <Save size={20} />
            Simpan Perubahan
          </button>
        </form>
      </motion.div>
    </main>
  );
}
