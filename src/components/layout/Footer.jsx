// src/components/layout/Footer.jsx
// Universal Footer component for KiraCelik across all views
// Displays official branding and "Hak Cipta Terpelihara" copyright notice.

export default function Footer({ languageMode = "BM" }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t-2 border-slate-900 bg-[#FAF6EE] py-3.5 px-4 text-center text-xs font-bold text-slate-600 mt-auto">
      <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="font-mono font-black text-slate-800">
          KiraCelik{" "}
          <span className="font-sans font-bold text-slate-500">
            • {languageMode === "EN" ? "Malaysian Primary School Mathematics (KSSR)" : "Buku Latihan Matematik KSSR Tahap 1"}
          </span>
        </p>
        <p className="text-[11px] font-mono text-slate-600">
          {languageMode === "EN"
            ? `© ${currentYear} KiraCelik. Hak Cipta Terpelihara (All Rights Reserved).`
            : `© ${currentYear} KiraCelik. Hak Cipta Terpelihara.`}
        </p>
      </div>
    </footer>
  );
}
