"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../api/api";
import ToastHost, { showToast } from "../../../components/Toast";

export default function AdminEditProductPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: "",
    stock: "",
    harga_modal: "",
    price: "",
    description: "",
    is_archived: false,
    image: "",
  });

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

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/products/${id}`);
        const d = res.data;
        setForm({
          name: d.name || "",
          type: d.type || "",
          stock: String(d.stock ?? ""),
          harga_modal: String(d.harga_modal ?? ""),
          price: String(d.price ?? ""),
          description: d.description || "",
          is_archived: !!d.is_archived,
          image: d.image || "",
        });
        setFilePreview(null);
        setFile(null);
      } catch {
        showToast("error", "Produk tidak ditemukan.");
        router.replace("/admin/show");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, router]);

  const onChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const target = e.currentTarget;
    const fieldName = (target as HTMLInputElement).name;
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setForm((p) => ({ ...p, [fieldName]: target.checked }));
    } else {
      setForm((p) => ({ ...p, [fieldName]: target.value }));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("type", form.type);
      fd.append("stock", form.stock);
      fd.append("harga_modal", form.harga_modal);
      fd.append("price", form.price);
      fd.append("description", form.description);
      fd.append("is_archived", form.is_archived ? "1" : "0");
      if (file) fd.append("image", file);
      fd.append("_method", "PUT");

      const res = await fetch(`http://127.0.0.1:8000/api/products/${id}`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: fd,
      });
      if (!res.ok) throw new Error("Gagal menyimpan perubahan");
      showToast("success", "Produk diperbarui.");
      router.push("/admin/show");
    } catch {
      showToast("error", "Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white md:pl-[80px] pt-16 px-6 font-poppins">
      <ToastHost />
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black mb-6 text-black">
          Edit Produk #{id}
        </h1>
        <form
          onSubmit={onSubmit}
          className="space-y-5 bg-gray-50 border border-gray-200 rounded-xl p-6"
        >
          <div>
            <label className="block text-sm mb-1 text-gray-700">Nama</label>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1 text-gray-700">Jenis</label>
              <input
                name="type"
                value={form.type}
                onChange={onChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-700">Stok</label>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={onChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1 text-gray-700">
                Harga Modal
              </label>
              <input
                type="number"
                name="harga_modal"
                value={form.harga_modal}
                onChange={onChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-700">
                Harga Jual
              </label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={onChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1 font-semibold text-black">
              Deskripsi
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_archived"
              checked={form.is_archived}
              onChange={onChange} // tetap pakai handler yang sudah aman
            />
            <span className="text-sm text-gray-700">
              Arsipkan produk ini (sembunyikan dari daftar publik)
            </span>
          </div>
          <div>
            <label className="block text-sm mb-1 font-semibold text-black">
              Gambar Produk
              <span className="ml-1 text-xs text-gray-600">
                (biarkan kosong jika tidak ganti)
              </span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                setFilePreview(f ? URL.createObjectURL(f) : null);
              }}
              className="w-full text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
            />
            <div className="mt-3 flex items-center gap-12">
              {form.image ? (
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">
                    Gambar Saat Ini
                  </div>
                  <img
                    src={getImageUrl(form.image)}
                    alt="current"
                    className="w-32 h-32 object-cover rounded-md border border-gray-300 bg-white shadow-sm"
                    onError={(e) =>
                      ((e.currentTarget as HTMLImageElement).src =
                        "/images/placeholder.jpg")
                    }
                  />
                </div>
              ) : null}
              {filePreview ? (
                <div>
                  <div className="text-xs font-semibold text-blue-700 mb-1">
                    Pratinjau Gambar Baru
                  </div>
                  <div className="relative">
                    <span className="absolute -top-2 -left-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow">
                      Baru
                    </span>
                    <img
                      src={filePreview}
                      alt="preview"
                      className="w-32 h-32 object-cover rounded-md border-2 border-blue-500 bg-white shadow"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-lg font-bold bg-black text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/show")}
              className="px-6 py-3 rounded-lg font-bold border border-red-300 text-red-600 hover:bg-red-50"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
