"use client";

import { usePathname } from "next/navigation";
import HomeNavbar from "./HomeNavbar";
import DefaultNavbar from "./DefaultNavbar";

export default function Navbar() {
  const pathname = usePathname();

  // Jika di homepage, gunakan HomeNavbar (transparan)
  // Jika di halaman lain, gunakan DefaultNavbar (putih)
  return pathname === "/" ? <HomeNavbar /> : <DefaultNavbar />;
}
