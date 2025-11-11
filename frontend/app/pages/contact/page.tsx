"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await axios.post("http://127.0.0.1:8000/api/contacts", form, {
        headers: { Accept: "application/json" },
      });
      alert("Pesan berhasil dikirim. Terima kasih!");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      alert(err?.response?.data?.message || "Gagal mengirim pesan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white pt-24 px-6 font-poppins">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-black text-black mb-4">
          Contact Us
        </h1>
        <p className="text-gray-600 mb-8">
          Ada pertanyaan atau masukan? Kirimkan pesanmu melalui formulir di
          bawah.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nama</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-black"
              placeholder="Nama lengkap"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-black"
              placeholder="email@contoh.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Subjek (opsional)
            </label>
            <input
              name="subject"
              value={form.subject}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-black"
              placeholder="Subjek pesan"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Pesan</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              required
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black text-black"
              placeholder="Tulis pesanmu di sini..."
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={submitting}
            type="submit"
            className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-60"
          >
            {submitting ? "Mengirim..." : "Kirim Pesan"}
          </motion.button>
        </form>
      </div>
    </main>
  );
}
