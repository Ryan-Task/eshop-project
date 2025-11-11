"use client";

import { useEffect, useState, useMemo } from "react";
import api from "../../api/api";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ToastHost, { showToast } from "../../components/Toast";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState<string>("");
  const [twoFactor, setTwoFactor] = useState<boolean>(false);
  const [phone, setPhone] = useState<string>(""); // NEW
  const [birthPlace, setBirthPlace] = useState<string>(""); // NEW
  const [birthDate, setBirthDate] = useState<string>(""); // NEW

  // NEW: states untuk multi-alamat
  type Address = {
    id: number;
    recipient_name?: string;
    phone?: string;
    province?: string;
    regency?: string;
    district?: string;
    postal_code?: string;
    detail?: string;
    is_default?: boolean;
  };
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrLoading, setAddrLoading] = useState<boolean>(true);

  // Helper gambar (sesuai backend storage)
  const getImageUrl = (path?: string) => {
    if (!path) return "/images/placeholder.jpg";
    if (path.startsWith("http")) return path;
    if (path.startsWith("storage/")) return `http://127.0.0.1:8000/${path}`;
    return `http://127.0.0.1:8000/storage/${path}`;
  };

  // NEW: helper format alamat default (user_addresses)
  const formatAddr = (a?: Address | null) => {
    if (!a) return "";
    return [a.detail, a.district, a.regency, a.province, a.postal_code]
      .filter(Boolean)
      .join(", ");
  };

  // NEW: hoisted helper so it can be used before initialization
  function renderAddressSummary(raw?: any) {
    if (!raw) return "Belum ada alamat.";
    try {
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      const { detail, district, regency, province } = obj || {};
      const parts = [detail, district, regency, province].filter(Boolean);
      return parts.length ? parts.join(", ") : "Belum ada alamat.";
    } catch {
      return String(raw);
    }
  }

  // Ambil data user
  const fetchProfile = async () => {
    const token = localStorage.getItem("token");

    // Jika belum login
    if (!token) {
      router.push("/pages/auth/login");
      return;
    }

    try {
      const res = await api.get("/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
      // NEW: set name state from profile
      setName(res.data?.name || "");
      // NEW: init 2FA toggle
      setTwoFactor(!!res.data?.two_factor_enabled);
      // Hapus inisialisasi alamat; cukup set preview foto
      setPreview(
        res.data?.profile_image ? getImageUrl(res.data.profile_image) : null
      );
      setPhone(res.data?.phone || "");
      setBirthPlace(res.data?.birth_place || "");
      setBirthDate(res.data?.birth_date || "");
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      // Kalau token invalid, hapus dan arahkan ke login
      localStorage.removeItem("token");
      router.push("/pages/auth/login");
    } finally {
      setLoading(false);
    }
  };

  // NEW: Ambil semua alamat user
  const fetchAddresses = async () => {
    try {
      setAddrLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await api.get("/addresses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAddresses(res.data?.addresses || []);
    } catch {
      setAddresses([]);
    } finally {
      setAddrLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // NEW: Load alamat setelah profil terambil
  useEffect(() => {
    fetchAddresses();
  }, [profile?.id]);

  // handle pilih file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      setPreview(URL.createObjectURL(f));
    }
  };

  // Simpan hanya foto profil (alamat dipindah ke halaman /pages/alamat)
  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/pages/auth/login");
      return;
    }
    try {
      setSaving(true);
      const form = new FormData();
      if (file) form.append("profile_image", file);
      // NEW: include name if changed/non-empty
      if (name && name !== profile?.name) form.append("name", name);
      // NEW: include toggle 2FA state
      form.append("two_factor_enabled", String(twoFactor ? 1 : 0));
      if (phone) form.append("phone", phone);
      if (birthPlace) form.append("birth_place", birthPlace);
      if (birthDate) form.append("birth_date", birthDate);

      const res = await fetch("http://127.0.0.1:8000/api/user/profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) throw new Error("Gagal menyimpan profil");
      const updated = await res.json();
      setProfile(updated);
      // NEW: update localStorage so navbar reflects new name
      try {
        localStorage.setItem("user", JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("authChange"));
      } catch {}
      setPreview(
        updated?.profile_image ? getImageUrl(updated.profile_image) : preview
      );
      // Ensure state name mirrors server
      setName(updated?.name || name);
      // NEW: sync 2FA state
      setTwoFactor(!!updated?.two_factor_enabled);
      setPhone(updated?.phone || phone);
      setBirthPlace(updated?.birth_place || birthPlace);
      setBirthDate(updated?.birth_date || birthDate);
      // REPLACE ↓
      showToast("success", "Profil berhasil disimpan");
    } catch (e) {
      // REPLACE ↓
      showToast("error", "Gagal menyimpan profil");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // NEW: Set default address
  const handleSetDefault = async (addrId: number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/pages/auth/login");
        return;
      }
      await api.post(
        `/addresses/${addrId}/default`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Update lokal: tandai is_default
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === addrId }))
      );
      // REPLACE ↓
      showToast("success", "Alamat default diperbarui");
    } catch (e: any) {
      showToast(
        "error",
        e?.response?.data?.message || "Gagal mengubah alamat default"
      );
    }
  };

  // NEW: derive default address and its summary
  const defaultAddress = useMemo(
    () => addresses.find((x) => x.is_default) || addresses[0] || null,
    [addresses]
  );
  const defaultAddressSummary = useMemo(() => {
    // if has user_addresses, show default; else fallback to legacy single address
    if (defaultAddress) return formatAddr(defaultAddress);
    return renderAddressSummary(profile?.address);
  }, [defaultAddress, profile?.address]);

  // Render
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-white pt-20 font-poppins">
      <ToastHost />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-lg mx-auto bg-gray-50 rounded-2xl shadow-lg p-8 border border-gray-200"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-black mb-2">Profil Akun</h1>
          <p className="text-gray-600 text-sm">
            Informasi akun yang sedang login
          </p>
        </div>

        {/* Foto profil */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-28 h-28 rounded-full bg-gray-200 overflow-hidden border border-gray-300 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview || getImageUrl(profile?.profile_image)}
              alt="Profile"
              className="w-full h-full object-cover"
              onError={(e) => (e.currentTarget.src = "/images/placeholder.jpg")}
            />
          </div>
          <label className="cursor-pointer text-sm font-semibold text-black hover:underline">
            Ubah Foto
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {/* Info dasar */}
        <div className="space-y-4">
          {/* NEW: Editable name */}
          <div className="border-b border-gray-200 pb-2">
            <label className="text-gray-700 font-medium block mb-1">Nama</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
            />
          </div>

          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-700 font-medium">Email</span>
            <span className="text-black font-semibold">{profile.email}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-700 font-medium">Role</span>
            <span className="text-black font-semibold">
              {profile.role || "User"}
            </span>
          </div>

          {/* Ringkasan Alamat (default dari daftar alamat jika ada) */}
          <div className="border-b border-gray-200 pb-2">
            <span className="text-gray-700 font-medium block">Alamat</span>
            <span className="text-black">
              {defaultAddressSummary || "Belum ada alamat."}
            </span>
          </div>

          <div className="border-b border-gray-200 pb-2">
            <label className="text-gray-700 font-medium block mb-1">
              Nomor Telepon
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contoh: 081234567890"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
            />
          </div>
          <div className="border-b border-gray-200 pb-2">
            <label className="text-gray-700 font-medium block mb-1">
              Tempat Lahir
            </label>
            <input
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              placeholder="Contoh: Bandung"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
            />
          </div>
          <div className="border-b border-gray-200 pb-2">
            <label className="text-gray-700 font-medium block mb-1">
              Tanggal Lahir
            </label>
            <input
              type="date"
              value={birthDate ? birthDate.substring(0, 10) : ""}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
            />
          </div>
        </div>

        {/* NEW: Alamat Tersimpan (pilih default) */}
        <div className="mt-8 border border-gray-200 rounded-2xl p-6 bg-white">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-bold text-black">Alamat Tersimpan</h2>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/pages/alamat")}
                className="text-sm font-semibold underline text-black"
                title="Kelola alamat"
              >
                Kelola
              </button>
            </div>
          </div>

          {addrLoading ? (
            <div className="text-sm text-gray-600 mt-3">Memuat alamat...</div>
          ) : addresses.length === 0 ? (
            <div className="text-sm text-gray-600 mt-3">
              Belum ada alamat. Tambahkan alamat melalui tombol Kelola.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${
                    a.is_default
                      ? "border-black bg-white"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="addr_default"
                    checked={!!a.is_default}
                    onChange={() => handleSetDefault(a.id)}
                  />
                  <div className="text-sm">
                    {/* REMOVE: nama penerima + phone */}
                    <div className="text-gray-700">
                      {[
                        a.detail,
                        a.district,
                        a.regency,
                        a.province,
                        a.postal_code,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                    {a.is_default ? (
                      <span className="mt-1 inline-block text-xs bg-black text-white px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-600 mt-3">
            Alamat default akan otomatis digunakan saat checkout. Anda tetap
            bisa menggantinya di halaman checkout.
          </p>
        </div>

        {/* NEW: Keamanan Akun - 2FA toggle */}
        <div className="mt-8 border border-gray-200 rounded-2xl p-6 bg-white">
          <h2 className="text-lg font-bold text-black mb-2">Keamanan Akun</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-black">
                Aktifkan Verifikasi OTP saat Login
              </p>
              <p className="text-sm text-gray-600">
                Jika diaktifkan, Anda akan diminta memasukkan kode OTP yang
                dikirim ke email setiap kali login.
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={twoFactor}
                onChange={(e) => setTwoFactor(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-black relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={saving}
            onClick={handleSave}
            className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-70"
          >
            {saving ? "Menyimpan..." : "Simpan Keamanan"}
          </motion.button>
        </div>

        {/* Aksi */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/pages/alamat")}
            className="w-full bg-white text-black border border-gray-300 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors"
          >
            Tambahkan Alamat Baru
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/pages/profile/password")}
            className="w-full bg-white text-black border border-gray-300 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors"
          >
            Ubah Password
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={saving}
            onClick={handleSave}
            className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-70"
          >
            {saving ? "Menyimpan..." : "Simpan Profil"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
