"use client";

import { useState, useEffect, useMemo } from "react";
import api from "../../api/api";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeftCircle, Save } from "lucide-react";
import Link from "next/link";

export default function CreateProduct() {
  const router = useRouter();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [data, setData] = useState({
    name: "",
    type: "",
    stock: "",
    price: "",
    harga_modal: "",
    description: "",
    image: null as File | null,
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [newType, setNewType] = useState("");

  // NEW: state tampilan input harga (berformat rupiah)
  const [priceInput, setPriceInput] = useState<string>("");
  const [modalInput, setModalInput] = useState<string>("");

  // NEW: helper format & digits
  const digitsOnly = (v: string) => v.replace(/\D/g, "");
  const formatRpInput = (v: string) => {
    const d = digitsOnly(v);
    if (!d) return "";
    return Number(d).toLocaleString("id-ID");
  };

  useEffect(() => {
    api
      .get("/products/categories")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setCategories(list);
      })
      .catch(() => setCategories([]));
  }, []);

  // UBAH: support input, textarea, dan select
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const target = e.target as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement;
    const name = (target as any).name as string;
    const value = (target as any).value as string;

    // Formatter harga
    if (name === "price") {
      setPriceInput(formatRpInput(value));
      setData({ ...data, price: digitsOnly(value) });
      return;
    }
    if (name === "harga_modal") {
      setModalInput(formatRpInput(value));
      setData({ ...data, harga_modal: digitsOnly(value) });
      return;
    }

    // File input
    if (
      name === "image" &&
      "files" in target &&
      (target as HTMLInputElement).files
    ) {
      setData({ ...data, image: (target as HTMLInputElement).files![0] });
      return;
    }

    // Select/type biasa
    setData({ ...data, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value) formData.append(key, value as any);
      });
      // Pastikan angka murni untuk harga
      formData.set("price", digitsOnly(priceInput || String(data.price || "")));
      formData.set(
        "harga_modal",
        digitsOnly(modalInput || String(data.harga_modal || ""))
      );

      // UBAH: kirim type yang benar (ganti "__new__" dengan newType)
      const typeToSend = data.type === "__new__" ? newType : data.type;
      if (typeToSend) formData.set("type", typeToSend);

      await api.post("/products", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setNewType("");
      router.push("/admin/show");
    } catch (error) {
      alert("Gagal menambahkan produk!");
    }
  };

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

  useEffect(() => {
    if (!allowed) return;

    // Guard admin
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    api
      .get("/user", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if ((res.data?.role || "user") !== "admin") {
          router.replace("/admin/login");
        }
      })
      .catch(() => router.replace("/admin/login"))
      .finally(() => setCheckingAdmin(false));
  }, [router, allowed]);

  if (checkingAdmin) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black" />
      </main>
    );
  }

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
            <select
              name="type"
              value={data.type}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white"
              required
            >
              <option value="">
                {categories.length
                  ? "Pilih tipe..."
                  : "Ketik tipe baru di bawah"}
              </option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__new__">+ Tambah tipe baru…</option>
            </select>

            {data.type === "__new__" && (
              <div className="mt-2">
                <input
                  type="text"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="Tulis tipe produk baru (misal: Aksesoris)"
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">
                  Tipe baru akan otomatis ditambahkan.
                </p>
              </div>
            )}
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
                type="text" // NEW: text agar bisa diformat
                value={modalInput}
                onChange={handleChange}
                placeholder="Contoh: 1.500.000"
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none"
                required
                inputMode="numeric"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Harga Jual
            </label>
            <input
              name="price"
              type="text" // NEW: text agar bisa diformat
              value={priceInput}
              onChange={handleChange}
              placeholder="Contoh: 2.000.000"
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none"
              required
              inputMode="numeric"
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

export function AdminCreateProductPage() {
  return (
    <main className="min-h-screen bg-white text-black md:pl-[80px] py-10 px-6">
      <h1 className="text-2xl font-bold">Tambah Produk</h1>
      <p className="text-gray-600">Form tambah produk.</p>
    </main>
  );
}
