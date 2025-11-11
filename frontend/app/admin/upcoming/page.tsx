"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "../../api/api";
import ToastHost, { showToast } from "../../components/Toast";

export default function AdminUpcomingCreatePage() {
  const router = useRouter();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [form, setForm] = useState({
    name: "",
    type: "",
    release_at: "",
    description: "",
    price_estimate: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // NEW: list + editing
  type Up = {
    id: number;
    name: string;
    type?: string | null;
    release_at: string;
    description?: string | null;
    price_estimate?: number | null;
    teaser_image?: string | null;
  };
  const [items, setItems] = useState<Up[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Up>>({});
  const [editFile, setEditFile] = useState<File | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
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
  }, [router]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get("/upcoming-products");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checkingAdmin) fetchItems();
  }, [checkingAdmin]);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      showToast("warning", "Harus login sebagai admin.");
      return;
    }
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("name", form.name);
      if (form.type) fd.append("type", form.type);
      fd.append("release_at", form.release_at);
      if (form.description) fd.append("description", form.description);
      if (form.price_estimate) fd.append("price_estimate", form.price_estimate);
      if (file) fd.append("teaser_image", file);

      const res = await fetch("http://127.0.0.1:8000/api/upcoming-products", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Gagal menyimpan");
      }
      showToast("success", "Upcoming product tersimpan.");
      setForm({
        name: "",
        type: "",
        release_at: "",
        description: "",
        price_estimate: "",
      });
      setFile(null);
      fetchItems();
    } catch (e: any) {
      showToast("error", "Gagal menyimpan: " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (it: Up) => {
    setEditingId(it.id);
    setEditForm({
      name: it.name,
      type: it.type || "",
      release_at: it.release_at ? it.release_at.slice(0, 16) : "",
      description: it.description || "",
      price_estimate: it.price_estimate ?? undefined,
    });
    setEditFile(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const token = localStorage.getItem("token");
    try {
      const fd = new FormData();
      if (editForm.name) fd.append("name", String(editForm.name));
      if (editForm.type !== undefined)
        fd.append("type", String(editForm.type || ""));
      if (editForm.release_at)
        fd.append("release_at", String(editForm.release_at));
      if (editForm.description !== undefined)
        fd.append("description", String(editForm.description || ""));
      if (editForm.price_estimate !== undefined)
        fd.append("price_estimate", String(editForm.price_estimate || ""));
      if (editFile) fd.append("teaser_image", editFile);
      const res = await fetch(
        `http://127.0.0.1:8000/api/upcoming-products/${editingId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: (() => {
            fd.append("_method", "PUT");
            return fd;
          })(),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      showToast("success", "Upcoming product diperbarui.");
      setEditingId(null);
      setEditFile(null);
      fetchItems();
    } catch (e: any) {
      showToast("error", e?.message || "Gagal memperbarui");
    }
  };

  const deleteItem = async (id: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/upcoming-products/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error(await res.text());
      showToast("success", "Upcoming product dihapus.");
      fetchItems();
    } catch (e: any) {
      showToast("error", e?.message || "Gagal menghapus");
    }
  };

  const getImg = (path?: string | null) => {
    if (!path) return "/images/placeholder.jpg";
    const p = String(path).replace(/^\/+/, "");
    if (p.startsWith("http")) return p;
    if (p.startsWith("storage/")) return `http://127.0.0.1:8000/${p}`;
    return `http://127.0.0.1:8000/storage/${p}`;
  };

  if (checkingAdmin) {
    return (
      <main className="min-h-screen bg-white pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pt-24 px-6 font-poppins">
      <ToastHost />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black text-black mb-6">Upcoming Produk</h1>
        <div className="border-b border-black mb-6" />
        {/* Form tambah */}
        <form
          onSubmit={onSubmit}
          className="space-y-4 bg-gray-50 border border-gray-200 rounded-xl p-6"
        >
          <div>
            <label className="block text-sm text-gray-700 mb-1">Nama</label>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Kategori (opsional)
            </label>
            <input
              name="type"
              value={form.type}
              onChange={onChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Tanggal & Jam Rilis
            </label>
            <input
              type="datetime-local"
              name="release_at"
              value={form.release_at}
              onChange={onChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Perkiraan Harga (opsional)
            </label>
            <input
              type="number"
              name="price_estimate"
              value={form.price_estimate}
              onChange={onChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Deskripsi (opsional)
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Gambar Teaser (opsional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-700"
            />
          </div>
          <button
            disabled={saving}
            type="submit"
            className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </form>

        {/* Daftar upcoming */}
        <h2 className="text-xl font-bold text-black mt-8 mb-3">
          Daftar Upcoming
        </h2>
        {loading ? (
          <div className="text-gray-600">Memuat...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-600">Belum ada upcoming product.</div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div
                key={it.id}
                className="border border-gray-200 rounded-xl p-4 bg-white"
              >
                {editingId === it.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-gray-700">Nama</label>
                        <input
                          value={String(editForm.name || "")}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, name: e.target.value }))
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-700">
                          Kategori
                        </label>
                        <input
                          value={String(editForm.type || "")}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, type: e.target.value }))
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-700">Rilis</label>
                        <input
                          type="datetime-local"
                          value={String(editForm.release_at || "")}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              release_at: e.target.value,
                            }))
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-700">
                          Perkiraan Harga
                        </label>
                        <input
                          type="number"
                          value={String(editForm.price_estimate ?? "")}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              price_estimate: Number(e.target.value),
                            }))
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Deskripsi</label>
                      <textarea
                        value={String(editForm.description || "")}
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">
                        Ganti Gambar (opsional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setEditFile(e.target.files?.[0] || null)
                        }
                        className="w-full text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="px-4 py-2 rounded-lg bg-black text-white font-bold hover:bg-gray-800"
                      >
                        Simpan
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditFile(null);
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 font-bold"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImg(it.teaser_image)}
                      alt={it.name}
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                      onError={(e) =>
                        ((e.currentTarget as HTMLImageElement).src =
                          "/images/placeholder.jpg")
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-black font-semibold truncate">
                        {it.name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {it.type || "-"} • Rilis:{" "}
                        {new Date(it.release_at).toLocaleString("id-ID")}
                      </div>
                      {it.price_estimate ? (
                        <div className="text-xs text-gray-800">
                          Perkiraan: Rp{" "}
                          {Number(it.price_estimate).toLocaleString("id-ID")}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(it)}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmId(it.id)}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Confirm Delete Modal */}
        {confirmId !== null && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-[90%] max-w-md border border-gray-200">
              <h3 className="text-lg font-bold text-black mb-2">
                Hapus Upcoming?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Item ini akan dihapus permanen.
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
                    deleteItem(id!);
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
