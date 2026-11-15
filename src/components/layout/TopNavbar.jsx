// src/components/layout/TopNavbar.jsx
// Authentic Malaysian Primary School Math Workbook aesthetic
// Zero audio/TTS, crisp 2px solid #0F172A structural borders & tactile 3D buttons.

import { BookOpen, LogOut } from "lucide-react";

export default function TopNavbar({
  activeUser,
  languageMode,
  setLanguageMode,
  onLogout,
}) {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-slate-900 bg-[#FAF6EE] px-3 sm:px-4 py-2 sm:py-3 shadow-tactile-sm">
      <div className="mx-auto flex max-w-4xl px-1 sm:px-6 flex-wrap items-center justify-between gap-2 sm:gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl border-2 border-slate-900 bg-sky-400 text-slate-950 shadow-tactile-sm shrink-0">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black tracking-tight text-slate-900 sm:text-2xl font-mono truncate">
              KiraCelik
            </h1>
            <p className="text-[11px] sm:text-xs font-bold text-slate-600 truncate">
              {languageMode === "EN"
                ? "KSSR Level 1 Mathematics • Year 1, 2 & 3"
                : "Buku Latihan KSSR Tahap 1 • Tahun 1, 2 & 3"}
            </p>
          </div>
        </div>

        {/* Right Controls: Language Toggle & User Welcome / Logout */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Language Mode Selector */}
          <div className="flex rounded-xl border-2 border-slate-900 bg-white p-0.5 sm:p-1 shadow-tactile-sm">
            {[
              { id: "BM", label: "🇲🇾 BM" },
              { id: "EN", label: "🇬🇧 EN" },
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => setLanguageMode(lang.id)}
                className={`rounded-lg px-2 sm:px-2.5 py-1 text-xs font-black transition-all ${
                  languageMode === lang.id
                    ? "border-2 border-slate-900 bg-amber-300 text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Authenticated User Identity Display: Welcome, {name} */}
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl border-2 border-slate-900 bg-white px-2 sm:px-3 py-1 sm:py-1.5 shadow-tactile-sm max-w-[160px] sm:max-w-none">
            <span className="text-base sm:text-lg shrink-0">{activeUser.avatar}</span>
            <div className="text-left leading-tight min-w-0">
              <span className="block text-[9px] sm:text-[10px] font-mono font-bold text-slate-500 uppercase">
                {languageMode === "EN" ? "Welcome" : "Selamat Datang"}
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-900 truncate block">
                {activeUser.name}
              </span>
            </div>
            {activeUser.role === "TUTOR" ? (
              <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-black text-violet-900 border border-violet-300 font-mono shrink-0">
                Tutor
              </span>
            ) : (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-900 border border-emerald-300 font-mono shrink-0">
                {languageMode === "EN" ? "Student" : "Murid"}
              </span>
            )}
          </div>

          {/* Logout / Switch Account Button */}
          <button
            onClick={onLogout}
            className="btn-tactile flex items-center gap-1 rounded-xl border-2 border-slate-900 bg-rose-100 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-black text-rose-950 hover:bg-rose-200 shadow-tactile-sm shrink-0"
            title={languageMode === "EN" ? "Logout & Switch Account" : "Log Keluar & Tukar Akaun"}
          >
            <LogOut className="h-4 w-4 text-rose-800" />
            <span className="hidden sm:inline">
              {languageMode === "EN" ? "Logout" : "Log Keluar"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
