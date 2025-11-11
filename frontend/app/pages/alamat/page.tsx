"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../../api/api";
import { useRouter } from "next/navigation";
import ToastHost, { showToast } from "../../components/Toast";

type Address = {
  id: number;
  province?: string;
  regency?: string;
  district?: string;
  postal_code?: string;
  detail?: string;
  is_default?: boolean;
};

export default function ManageAddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);

  const [form, setForm] = useState<Partial<Address>>({
    province: "",
    regency: "",
    district: "",
    postal_code: "",
    detail: "",
    is_default: false,
  });

  // NEW: opsi wilayah Indonesia (dropdown)
  type Option = { id: string; name: string };
  const [provinces, setProvinces] = useState<Option[]>([]);
  const [regencies, setRegencies] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("");
  const [selectedRegencyId, setSelectedRegencyId] = useState<string>("");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");

  // NEW: loader provinces on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          "https://ibnux.github.io/data-indonesia/propinsi.json"
        );
        const data: { id: string; nama: string }[] = await res.json();
        setProvinces(data.map((d) => ({ id: d.id, name: d.nama })));
      } catch {
        setProvinces([]);
      }
    })();
  }, []);

  // NEW: helper to load regencies by province id
  const loadRegencies = async (provId: string) => {
    try {
      const res = await fetch(
        `https://ibnux.github.io/data-indonesia/kabupaten/${provId}.json`
      );
      const data: { id: string; nama: string }[] = await res.json();
      setRegencies(data.map((d) => ({ id: d.id, name: d.nama })));
    } catch {
      setRegencies([]);
    }
  };

  // NEW: helper to load districts by regency id
  const loadDistricts = async (kabId: string) => {
    try {
      const res = await fetch(
        `https://ibnux.github.io/data-indonesia/kecamatan/${kabId}.json`
      );
      const data: { id: string; nama: string }[] = await res.json();
      setDistricts(data.map((d) => ({ id: d.id, name: d.nama })));
    } catch {
      setDistricts([]);
    }
  };

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/addresses");
      setAddresses(res.data?.addresses || []);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const resetForm = () => {
    setForm({
      province: "",
      regency: "",
      district: "",
      postal_code: "",
      detail: "",
      is_default: false,
    });
    setEditing(null);
    // NEW: reset dropdown selections
    setSelectedProvinceId("");
    setSelectedRegencyId("");
    setSelectedDistrictId("");
    setRegencies([]);
    setDistricts([]);
  };

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  // NEW: handlers for dropdowns (set name to form, keep id locally)
  const onProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provId = e.target.value;
    setSelectedProvinceId(provId);
    setSelectedRegencyId("");
    setSelectedDistrictId("");
    setRegencies([]);
    setDistricts([]);
    const name = provinces.find((p) => p.id === provId)?.name || "";
    setForm((p) => ({ ...p, province: name, regency: "", district: "" }));
    if (provId) await loadRegencies(provId);
  };

  const onRegencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const kabId = e.target.value;
    setSelectedRegencyId(kabId);
    setSelectedDistrictId("");
    setDistricts([]);
    const name = regencies.find((r) => r.id === kabId)?.name || "";
    setForm((p) => ({ ...p, regency: name, district: "" }));
    if (kabId) await loadDistricts(kabId);
  };

  const onDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const kecId = e.target.value;
    setSelectedDistrictId(kecId);
    const name = districts.find((d) => d.id === kecId)?.name || "";
    setForm((p) => ({ ...p, district: name }));
  };

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editing) {
        await api.put(`/addresses/${editing.id}`, form);
      } else {
        await api.post("/addresses", form);
      }
      await fetchAddresses();
      resetForm();
      // REPLACE alert
      showToast("success", "Alamat tersimpan");
    } catch (err: any) {
      showToast(
        "error",
        err?.response?.data?.message || "Gagal menyimpan alamat"
      );
    } finally {
      setSaving(false);
    }
  };

  const editAddress = (a: Address) => {
    setEditing(a);
    setForm({
      province: a.province || "",
      regency: a.regency || "",
      district: a.district || "",
      postal_code: a.postal_code || "",
      detail: a.detail || "",
      is_default: !!a.is_default,
    });
    // NEW: preselect dropdowns by name (best-effort match)
    (async () => {
      try {
        // ensure provinces loaded
        if (provinces.length === 0) {
          const res = await fetch(
            "https://ibnux.github.io/data-indonesia/propinsi.json"
          );
          const data: { id: string; nama: string }[] = await res.json();
          setProvinces(data.map((d) => ({ id: d.id, name: d.nama })));
        }
        // pick province by name
        const prov = (provinces.length ? provinces : []).find(
          (p) => p.name.toLowerCase() === (a.province || "").toLowerCase()
        );
        if (prov) {
          setSelectedProvinceId(prov.id);
          await loadRegencies(prov.id);
          setForm((p) => ({ ...p, province: prov.name }));
          // pick regency by name
          const kab = regencies.find(
            (r) => r.name.toLowerCase() === (a.regency || "").toLowerCase()
          );
          if (kab) {
            setSelectedRegencyId(kab.id);
            await loadDistricts(kab.id);
            setForm((p) => ({ ...p, regency: kab.name }));
            // pick district by name
            const kec = districts.find(
              (d) => d.name.toLowerCase() === (a.district || "").toLowerCase()
            );
            if (kec) {
              setSelectedDistrictId(kec.id);
              setForm((p) => ({ ...p, district: kec.name }));
            }
          }
        }
      } catch {
        // ignore matching failure
      }
    })();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteAddress = async (a: Address) => {
    if (!confirm("Hapus alamat ini?")) return;
    try {
      await api.delete(`/addresses/${a.id}`);
      await fetchAddresses();
      showToast("success", "Alamat dihapus");
    } catch (err: any) {
      showToast(
        "error",
        err?.response?.data?.message || "Gagal menghapus alamat"
      );
    }
  };

  const setDefault = async (a: Address) => {
    try {
      await api.post(`/addresses/${a.id}/default`, {});
      setAddresses((prev) =>
        prev.map((x) => ({ ...x, is_default: x.id === a.id }))
      );
      showToast("success", "Alamat default diperbarui");
    } catch (err: any) {
      showToast("error", err?.response?.data?.message || "Gagal set default");
    }
  };

  const formatAddr = (a: Address) =>
    [a.detail, a.district, a.regency, a.province, a.postal_code]
      .filter(Boolean)
      .join(", ");

  return (
    <main className="min-h-screen bg-white pt-24 px-6 font-poppins">
      <ToastHost />
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-black text-black">Kelola Alamat</h1>
          <button
            onClick={() => router.push("/pages/profile")}
            className="text-sm underline font-semibold"
          >
            Kembali ke Profil
          </button>
        </div>

        {/* Form tambah/edit alamat */}
        <form
          onSubmit={saveAddress}
          className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-3 mb-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* REMOVE: Nama Penerima + No. Telepon */}
            <div>
              <label className="text-sm text-gray-700">Provinsi</label>
              <select
                required
                value={selectedProvinceId}
                onChange={onProvinceChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
              >
                <option value="">Pilih Provinsi</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-700">Kota/Kabupaten</label>
              <select
                required
                value={selectedRegencyId}
                onChange={onRegencyChange}
                disabled={!selectedProvinceId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black disabled:bg-gray-100"
              >
                <option value="">
                  {selectedProvinceId
                    ? "Pilih Kota/Kabupaten"
                    : "Pilih Provinsi dulu"}
                </option>
                {regencies.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-700">Kecamatan</label>
              <select
                required
                value={selectedDistrictId}
                onChange={onDistrictChange}
                disabled={!selectedRegencyId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black disabled:bg-gray-100"
              >
                <option value="">
                  {selectedRegencyId
                    ? "Pilih Kecamatan"
                    : "Pilih Kota/Kabupaten dulu"}
                </option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-700">Kode Pos</label>
              <input
                name="postal_code"
                value={form.postal_code || ""}
                onChange={onChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm text-gray-700">Detail Alamat</label>
              <textarea
                name="detail"
                required
                rows={2}
                value={form.detail || ""}
                onChange={onChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              name="is_default"
              checked={!!form.is_default}
              onChange={onChange}
            />
            <span className="text-sm text-gray-800">
              Jadikan sebagai alamat default
            </span>
          </label>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={saving}
            type="submit"
            className="mt-3 w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-70"
          >
            {saving
              ? "Menyimpan..."
              : editing
              ? "Simpan Perubahan"
              : "Tambah Alamat"}
          </motion.button>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="mt-2 w-full border border-gray-300 text-black py-3 rounded-xl font-bold hover:bg-gray-100"
            >
              Batalkan Edit
            </button>
          )}
        </form>

        {/* Daftar alamat (klik untuk pilih default) */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-gray-600">Memuat alamat...</div>
          ) : addresses.length === 0 ? (
            <div className="text-gray-600">Belum ada alamat.</div>
          ) : (
            addresses.map((a) => (
              <div
                key={a.id}
                className={`p-4 rounded-xl border cursor-pointer bg-white ${
                  a.is_default ? "border-black" : "border-gray-200"
                }`}
                onClick={() => setDefault(a)} // klik kartu langsung set default
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={!!a.is_default}
                      onChange={() => setDefault(a)}
                      className="mt-1"
                    />
                    <div className="text-sm">
                      {/* REMOVE: Nama penerima */}
                      <div className="text-gray-700">{formatAddr(a)}</div>
                      {/* REMOVE: No. Telepon */}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.is_default ? (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-black text-white">
                        Default
                      </span>
                    ) : null}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editAddress(a);
                      }}
                      className="px-3 py-1 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAddress(a);
                      }}
                      className="px-3 py-1 rounded-lg text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-gray-600 mt-4">
          Alamat default otomatis dipakai saat checkout, tapi Anda bisa
          menggantinya di halaman checkout dengan menekan alamat lain yang sudah
          ditambahkan.
        </p>
      </div>
    </main>
  );
}
