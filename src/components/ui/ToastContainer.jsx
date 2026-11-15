// src/components/ui/ToastContainer.jsx
import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

let globalToasts = [];
const listeners = new Set();

function broadcast() {
  listeners.forEach((listener) => {
    try {
      listener([...globalToasts]);
    } catch {
      // ignore
    }
  });
}

function addToastNotification(toastObj) {
  globalToasts = [...globalToasts.slice(-3), toastObj];
  broadcast();

  setTimeout(() => {
    globalToasts = globalToasts.filter((t) => t.id !== toastObj.id);
    broadcast();
  }, 3800);
}

function removeToastNotification(id) {
  globalToasts = globalToasts.filter((t) => t.id !== id);
  broadcast();
}

if (typeof window !== "undefined" && !window.__kiracelik_toast_initialized) {
  window.__kiracelik_toast_initialized = true;
  window.addEventListener("kiracelik-toast", (e) => {
    const { type = "info", message, title = "" } = e.detail || {};
    const id = Date.now() + Math.random().toString(36).slice(2, 6);
    addToastNotification({ id, type, message, title });
  });
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState(globalToasts);

  useEffect(() => {
    setToasts([...globalToasts]);
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-3">
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isWarning = t.type === "warning";
        const isError = t.type === "error";

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border-2 border-slate-900 p-3 shadow-[3px_3px_0px_#0F172A] transition-all animate-bounce-subtle ${
              isSuccess
                ? "bg-emerald-100 text-emerald-950"
                : isWarning
                ? "bg-amber-100 text-amber-950"
                : isError
                ? "bg-rose-100 text-rose-950"
                : "bg-sky-100 text-sky-950"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
              {isWarning && <AlertTriangle className="h-4 w-4 text-amber-700" />}
              {isError && <XCircle className="h-4 w-4 text-rose-700" />}
              {!isSuccess && !isWarning && !isError && <Info className="h-4 w-4 text-sky-700" />}
            </div>

            <div className="flex-1 min-w-0">
              {t.title && <div className="text-xs font-black leading-tight mb-0.5">{t.title}</div>}
              <div className="text-xs font-bold leading-relaxed break-words">{t.message}</div>
            </div>

            <button
              onClick={() => removeToastNotification(t.id)}
              className="text-slate-600 hover:text-slate-950 shrink-0 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
