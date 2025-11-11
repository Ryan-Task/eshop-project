"use client";
import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";
type Toast = { id: number; type: ToastType; message: string };

let pushFn: ((t: Omit<Toast, "id">) => void) | null = null;

export function showToast(
  type: ToastType,
  message: string | number | boolean | object
) {
  if (typeof window === "undefined") return;
  if (!pushFn) {
    // fallback jika host belum dirender: simpan di queue sementara
    (window as any).__TOAST_QUEUE__ = (window as any).__TOAST_QUEUE__ || [];
    (window as any).__TOAST_QUEUE__.push({ type, message: String(message) });
    return;
  }
  pushFn({ type, message: String(message) });
}

// Override alert bawaan -> info toast
if (typeof window !== "undefined" && !(window as any).__ALERT_OVERRIDDEN__) {
  const orig = window.alert;
  (window as any).__ALERT_OVERRIDDEN__ = true;
  window.alert = (msg?: any) => {
    showToast("info", msg ?? "");
    try {
      orig.call(window, ""); // diam (atau bisa di-skip total)
    } catch {}
  };
}

const palette: Record<ToastType, string> = {
  success: "from-green-500 to-emerald-600",
  error: "from-red-500 to-rose-600",
  info: "from-blue-500 to-indigo-600",
  warning: "from-amber-500 to-orange-500",
};

const icon: Record<ToastType, string> = {
  success: "✔",
  error: "✖",
  info: "ℹ",
  warning: "⚠",
};

export default function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    pushFn = ({ type, message }) => {
      setToasts((prev) => [
        ...prev,
        { id: Date.now() + Math.random(), type, message },
      ]);
    };
    // Replay queue bila ada
    const q = (window as any).__TOAST_QUEUE__;
    if (Array.isArray(q) && q.length) {
      q.splice(0).forEach((t: any) =>
        pushFn?.({ type: t.type || "info", message: t.message })
      );
    }
    return () => {
      if (pushFn) pushFn = null;
    };
  }, []);

  const remove = (id: number) => setToasts((p) => p.filter((t) => t.id !== id));

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) => setTimeout(() => remove(t.id), 3500));
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  return (
    <div className="pointer-events-none fixed z-[9999] bottom-4 right-4 flex flex-col gap-3 w-[300px] max-w-[90vw]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`group relative overflow-hidden rounded-xl shadow-lg border border-black/10 bg-gradient-to-br ${
            palette[t.type]
          } text-white px-4 py-3 pr-10 animate-[fadeIn_.35s_ease]`}
        >
          <div className="flex gap-3">
            <span className="text-lg leading-none mt-[2px]">
              {icon[t.type]}
            </span>
            <p className="text-sm font-medium leading-relaxed break-words">
              {t.message}
            </p>
          </div>
          <button
            onClick={() => remove(t.id)}
            className="pointer-events-auto absolute top-1 right-1 rounded-md px-2 py-1 text-xs font-bold bg-white/20 hover:bg-white/30 backdrop-blur-sm"
            aria-label="Close"
          >
            ×
          </button>
          <div className="absolute bottom-0 left-0 h-0.5 bg-white/60 w-full origin-left animate-[shrink_3.2s_linear_forwards]" />
        </div>
      ))}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes shrink {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
      `}</style>
    </div>
  );
}
