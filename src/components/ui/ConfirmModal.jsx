// src/components/ui/ConfirmModal.jsx
import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const handleConfirmEvent = (e) => {
      setConfig(e.detail);
    };

    window.addEventListener("kiracelik-confirm", handleConfirmEvent);
    return () => window.removeEventListener("kiracelik-confirm", handleConfirmEvent);
  }, []);

  if (!config) return null;

  const handleCancel = () => {
    setConfig(null);
  };

  const handleConfirm = () => {
    const fn = config.onConfirm;
    setConfig(null);
    if (typeof fn === "function") {
      fn();
    }
  };

  const isDanger = config.variant === "danger";

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-xl border-2 border-slate-900 bg-[#FAF6EE] p-4 sm:p-5 shadow-[4px_4px_0px_#0F172A] space-y-4 animate-scale-in">
        <div className="flex items-start justify-between gap-3 border-b-2 border-slate-900 pb-2.5">
          <div className="flex items-center gap-2">
            <span className={`p-1 rounded-lg border border-slate-900 ${isDanger ? "bg-rose-200" : "bg-amber-200"}`}>
              <AlertTriangle className={`h-4 w-4 ${isDanger ? "text-rose-700" : "text-amber-800"}`} />
            </span>
            <h4 className="text-sm font-black text-slate-900 font-mono">
              {config.title || "Pengesahan / Confirmation"}
            </h4>
          </div>
          <button
            onClick={handleCancel}
            className="rounded-lg border border-slate-900 bg-white p-1 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs font-bold text-slate-700 leading-relaxed">
          {config.message}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={handleCancel}
            className="btn-tactile rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50 shadow-[2px_2px_0px_#0F172A]"
          >
            {config.cancelText || "Batal / Cancel"}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`btn-tactile rounded-lg border-2 border-slate-900 px-3.5 py-1.5 text-xs font-black shadow-[2px_2px_0px_#0F172A] ${
              isDanger
                ? "bg-rose-400 text-slate-950 hover:bg-rose-300"
                : "bg-amber-400 text-slate-950 hover:bg-amber-300"
            }`}
          >
            {config.confirmText || "Sahkan / Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
