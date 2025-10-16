"use client";

import { useState } from "react";
import api from "../../api/api";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeftCircle, Save } from "lucide-react";
import Link from "next/link";

export default function CreateProduct() {
  const router = useRouter();
  const [data, setData] = useState({
    name: "",
    type: "",
    stock: "",
    price: "",
    harga_modal: "",
    description: "",
    image: null as File | null,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, files } = e.target as HTMLInputElement;
    if (name === "image" && files) {
      setData({ ...data, image: files[0] });
    } else {
      setData({ ...data, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value) formData.append(key, value as any);
      });

      await api.post("/products", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      router.push("/admin/show");
    } catch (error) {
      alert("Gagal menambahkan produk!");
    }
  };

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
              Tambah Produk
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Lengkapi informasi produk di bawah ini
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
              placeholder="Contoh: iPhone 15 Pro"
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
              placeholder="Contoh: Smartphone"
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
              placeholder="Tuliskan deskripsi produk..."
              onChange={handleChange}
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
                placeholder="Jumlah stok"
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
                placeholder="Rp"
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
              placeholder="Rp"
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
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-all"
          >
            <Save size={20} />
            Simpan Produk
          </button>
        </form>
      </motion.div>
    </main>
  );
}
