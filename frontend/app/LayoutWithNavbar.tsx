"use client";

import { usePathname } from "next/navigation";
import Navbar from "./components/Navbar";

function SafeHydrate({ children }: { children: React.ReactNode }) {
  if (typeof window === "undefined") return <>{children}</>;
  return <>{children}</>;
}

export default function LayoutWithNavbar({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      {!isAdmin && <Navbar />}
      <SafeHydrate>{children}</SafeHydrate>
    </>
  );
}
