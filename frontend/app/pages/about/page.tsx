"use client";

import { motion, Variants } from "framer-motion";
import { useRouter } from "next/navigation";

export default function AboutPage() {
  const router = useRouter();

  const stats = [
    { number: "50,000+", label: "Produk Terjual", icon: "◼" },
    { number: "5 Tahun", label: "Pengalaman", icon: "◆" },
    { number: "98%", label: "Kepuasan Pelanggan", icon: "★" },
    { number: "24/7", label: "Customer Support", icon: "●" },
  ];

  const values = [
    {
      icon: "◉",
      title: "Kualitas Terjamin",
      description:
        "Semua produk yang kami jual adalah 100% original dengan garansi resmi dari manufacturer.",
    },
    {
      icon: "▲",
      title: "Pengiriman Cepat",
      description:
        "Kami bekerja sama dengan kurir terpercaya untuk memastikan produk sampai dengan cepat dan aman.",
    },
    {
      icon: "◆",
      title: "Harga Kompetitif",
      description:
        "Dapatkan produk teknologi terbaik dengan harga yang bersaing dan berbagai promo menarik.",
    },
    {
      icon: "■",
      title: "Garansi Resmi",
      description:
        "Setiap pembelian dilindungi dengan garansi resmi dan layanan purna jual yang responsif.",
    },
  ];

  const teamMembers = [
    {
      name: "Alex Johnson",
      role: "CEO & Founder",
      initial: "AJ",
      description:
        "Visioner di balik TechStore dengan pengalaman 15+ tahun di industri teknologi.",
    },
    {
      name: "Sarah Chen",
      role: "Head of Product",
      initial: "SC",
      description:
        "Memastikan setiap produk yang kami jual memenuhi standar kualitas tertinggi.",
    },
    {
      name: "Mike Rodriguez",
      role: "CTO",
      initial: "MR",
      description:
        "Arsitek teknologi yang membangun platform e-commerce terdepan.",
    },
    {
      name: "Lisa Wang",
      role: "Customer Success",
      initial: "LW",
      description:
        "Memastikan setiap pelanggan mendapatkan pengalaman berbelanja terbaik.",
    },
  ];

  const milestones = [
    {
      year: "2020",
      title: "TechStore Berdiri",
      description: "Memulai perjalanan dengan 100 produk pertama",
    },
    {
      year: "2021",
      title: "Ekspansi Kategori",
      description: "Menambah kategori smartphone, laptop, dan aksesori",
    },
    {
      year: "2022",
      title: "Partnership",
      description:
        "Kerjasama resmi dengan brand ternama seperti Apple, Samsung, dll",
    },
    {
      year: "2023",
      title: "50K Pelanggan",
      description: "Mencapai milestone 50,000 pelanggan puas",
    },
    {
      year: "2024",
      title: "Inovasi Platform",
      description: "Peluncuran aplikasi mobile dan fitur AR preview",
    },
  ];

  // Animation variants dengan viewport once: false agar animasi muncul tiap scroll
  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  return (
    <div className="min-h-screen bg-white pt-20 font-poppins">
      {/* Hero Section */}
      <section className="relative py-32 bg-black text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            variants={fadeInUp}
            className="text-center"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.8 }}
              className="w-20 h-0.5 bg-white mb-8 mx-auto origin-center"
            />

            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
              Tentang <span className="italic">TechStore</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-light">
              Destinasi terpercaya untuk produk elektronik premium sejak 2020
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="text-center group"
              >
                <div className="text-5xl mb-4 text-black group-hover:scale-110 transition-transform duration-300">
                  {stat.icon}
                </div>
                <div className="text-4xl md:text-5xl font-bold text-black mb-2 tracking-tight">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium uppercase text-sm tracking-wider">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, amount: 0.3 }}
              variants={fadeInUp}
            >
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: false }}
                transition={{ duration: 0.8 }}
                className="w-20 h-0.5 bg-black mb-8 origin-left"
              />
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-black tracking-tight">
                Cerita Kami
              </h2>
              <p className="text-gray-700 mb-6 leading-relaxed text-lg font-light">
                TechStore lahir dari passion terhadap teknologi dan keinginan
                untuk membuat produk elektronik premium lebih mudah diakses oleh
                masyarakat Indonesia.
              </p>
              <p className="text-gray-700 mb-6 leading-relaxed text-lg font-light">
                Dimulai dari sebuah toko kecil di tahun 2020, kini kami telah
                berkembang menjadi salah satu e-commerce elektronik terpercaya
                dengan ribuan pelanggan puas di seluruh Indonesia.
              </p>
              <p className="text-gray-700 leading-relaxed text-lg font-light">
                Kami terus berinovasi untuk memberikan pengalaman belanja
                terbaik, dari pemilihan produk berkualitas hingga layanan purna
                jual yang responsif.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, amount: 0.3 }}
              variants={fadeInUp}
              className="relative"
            >
              <div className="aspect-square bg-black rounded-none flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors duration-500"></div>
                <div className="text-center text-white p-12 relative z-10">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="text-8xl mb-6"
                  >
                    ◆
                  </motion.div>
                  <h3 className="text-3xl font-bold mb-4 tracking-tight">
                    Misi Kami
                  </h3>
                  <p className="text-gray-300 text-lg font-light leading-relaxed">
                    Menghubungkan masyarakat dengan teknologi terkini yang dapat
                    meningkatkan produktivitas dan kualitas hidup.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-32 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={fadeInUp}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.8 }}
              className="w-20 h-0.5 bg-black mx-auto mb-8"
            />
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-black tracking-tight">
              Nilai-Nilai Kami
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-light">
              Prinsip yang menjadi fondasi dalam setiap keputusan dan tindakan
              kami
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.1 }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {values.map((value, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                className="bg-white p-8 text-center group border border-gray-200 hover:border-black transition-all duration-300"
              >
                <div className="text-6xl mb-6 text-black group-hover:scale-110 transition-transform duration-300">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold mb-4 text-black tracking-tight">
                  {value.title}
                </h3>
                <p className="text-gray-600 leading-relaxed font-light">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={fadeInUp}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.8 }}
              className="w-20 h-0.5 bg-black mx-auto mb-8"
            />
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-black tracking-tight">
              Perjalanan Kami
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-light">
              Momen penting dalam sejarah TechStore
            </p>
          </motion.div>

          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-px bg-gray-200 hidden md:block"></div>

            {milestones.map((milestone, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, amount: 0.3 }}
                variants={fadeInUp}
                className={`relative mb-16 md:flex md:items-center ${
                  index % 2 === 0 ? "md:flex-row-reverse" : ""
                }`}
              >
                <div className="md:w-1/2"></div>
                <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-black border-4 border-white shadow-lg hidden md:block"></div>
                <div
                  className={`md:w-1/2 ${
                    index % 2 === 0 ? "md:pr-16" : "md:pl-16"
                  }`}
                >
                  <motion.div
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    className="bg-white border border-gray-200 p-8 hover:border-black transition-colors duration-300"
                  >
                    <div className="text-4xl font-bold text-black mb-3 tracking-tight">
                      {milestone.year}
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-black tracking-tight">
                      {milestone.title}
                    </h3>
                    <p className="text-gray-600 font-light leading-relaxed">
                      {milestone.description}
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-32 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={fadeInUp}
            className="text-center mb-20"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.8 }}
              className="w-20 h-0.5 bg-black mx-auto mb-8"
            />
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-black tracking-tight">
              Tim Kami
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-light">
              Para profesional berdedikasi di balik kesuksesan TechStore
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.1 }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {teamMembers.map((member, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                className="bg-white p-8 text-center group border border-gray-200 hover:border-black transition-all duration-300"
              >
                <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl font-bold text-white tracking-tight">
                    {member.initial}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-black tracking-tight">
                  {member.name}
                </h3>
                <div className="text-gray-500 font-medium mb-4 uppercase text-sm tracking-wider">
                  {member.role}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed font-light">
                  {member.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            variants={fadeInUp}
          >
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.8 }}
              className="w-20 h-0.5 bg-white mx-auto mb-8"
            />
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              Siap Berbelanja?
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
              Jelajahi koleksi produk elektronik premium kami dan temukan
              teknologi yang sempurna untuk kebutuhan Anda
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/")}
                className="bg-white text-black px-10 py-4 font-bold text-lg hover:bg-gray-100 transition-colors tracking-tight"
              >
                Lihat Produk
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/")}
                className="border-2 border-white text-white px-10 py-4 font-bold text-lg hover:bg-white hover:text-black transition-all tracking-tight"
              >
                Hubungi Kami
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
