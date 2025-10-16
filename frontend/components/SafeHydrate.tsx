"use client";
import { useEffect, useState } from "react";

export default function SafeHydrate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-white text-gray-800 flex justify-center items-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
