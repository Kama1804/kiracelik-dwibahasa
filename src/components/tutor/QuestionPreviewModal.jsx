import { X } from "lucide-react";
import QuestionVisualFigure from "../visuals/QuestionVisualFigure.jsx";
import { normalizeQuestionFields } from "../../engine/questionGenerator.js";

export default function QuestionPreviewModal({
  question,
  languageMode = "BM",
  onClose,
}) {
  if (!question) return null;

  const normalized = normalizeQuestionFields(question);
  const fields = normalized.answerFields || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl sm:max-w-5xl rounded-3xl border-3 border-slate-900 bg-white p-6 sm:p-8 shadow-tactile space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded-xl border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black text-slate-950 shadow-tactile-sm">
              PRATONTON SOALAN
            </span>
            <span className="font-mono text-xs font-bold text-slate-600">
              Tahun {normalized.darjah || 1} • {normalized.section ? `Bahagian ${normalized.section}` : "Latihan"} • {normalized.maxMarks || 1} Markah
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border-2 border-slate-900 bg-white p-1.5 hover:bg-rose-100 transition-all shadow-tactile-sm"
            aria-label="Tutup / Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Question Prompt / Story Problem */}
        <div className="space-y-3">
          {/* Story problem if present */}
          {(normalized.story_bm || normalized.story_en) && (
            <div className="rounded-2xl border-2 border-slate-900 bg-[#FAF6EE] p-4 text-sm font-bold text-slate-800 leading-relaxed shadow-tactile-sm">
              <p>{normalized.story_bm}</p>
              {normalized.story_en && languageMode === "DWIBAHASA" && (
                <p className="mt-1 text-xs italic text-slate-500 font-semibold">{normalized.story_en}</p>
              )}
            </div>
          )}

          {/* Prompt */}
          <div className="space-y-1">
            <p className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
              {normalized.prompt_bm}
            </p>
            {normalized.prompt_en && (
              <p className="text-sm italic font-bold text-slate-500">{normalized.prompt_en}</p>
            )}
          </div>

          {/* Instructions if present */}
          {(normalized.instructions_bm || normalized.instructions_en) && (
            <div className="rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs font-bold text-slate-700">
              <p>📌 {normalized.instructions_bm}</p>
              {normalized.instructions_en && languageMode === "DWIBAHASA" && (
                <p className="italic text-slate-500">{normalized.instructions_en}</p>
              )}
            </div>
          )}

          {/* Figure visual spec or custom image */}
          {normalized.visualSpec && (
            <div className="my-3 rounded-2xl border-2 border-slate-900 bg-[#FAF6EE] p-3 flex flex-col items-center justify-center max-h-56 overflow-hidden">
              <QuestionVisualFigure visual={normalized.visualSpec} languageMode={languageMode} />
            </div>
          )}

          {/* Student View: Answer Fields / Interactive Inputs */}
          <div className="rounded-2xl border-2 border-dashed border-sky-400 bg-sky-50/50 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-black uppercase text-sky-900 block">
                👀 Paparan Murid (Student Interactive View):
              </span>
              {normalized.scratchpadRequired && (
                <span className="text-xs font-black text-amber-800 bg-amber-200/90 border border-amber-400 rounded-lg px-2.5 py-0.5">
                  ✏️ Kertas Conteng Diwajibkan ({normalized.scratchpadMarks || 0}m)
                </span>
              )}
            </div>

            {fields.map((field, idx) => {
              const isMcq = field.type === "MCQ" || (Array.isArray(field.options) && field.options.length > 0);
              const isOp = field.type === "OPERATOR";

              return (
                <div key={field.id || idx} className="rounded-xl border-2 border-slate-900 bg-white p-4 shadow-tactile-sm space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                    <span className="text-xs sm:text-base font-black text-slate-900 leading-snug flex-1">
                      {field.label_bm || field.label_en || `Ruang Jawapan ${idx + 1}`}
                    </span>
                    <span className="font-mono text-xs font-black text-slate-600 rounded bg-slate-100 px-2.5 py-0.5 border border-slate-300 shrink-0 self-start sm:self-auto">
                      {field.marks || 1} Markah
                    </span>
                  </div>

                  {isMcq ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {(field.options || []).map((opt, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-xl border-2 border-slate-900 bg-white p-3 text-xs sm:text-sm font-bold shadow-tactile-sm"
                        >
                          <span className="h-6 w-6 rounded-lg border-2 border-slate-900 bg-sky-200 flex items-center justify-center font-mono font-black text-xs">
                            {opt.value}
                          </span>
                          <span>{languageMode === "EN" ? opt.label_en : opt.label_bm}</span>
                        </div>
                      ))}
                    </div>
                  ) : isOp ? (
                    <div className="flex items-center gap-2 mt-2">
                      {["+", "−", "×", "÷"].map((op) => (
                        <span
                          key={op}
                          className="h-10 w-12 rounded-xl border-2 border-slate-900 bg-white flex items-center justify-center font-mono text-lg font-black shadow-tactile-sm"
                        >
                          {op}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        readOnly
                        placeholder={
                          field.placeholder ||
                          (field.type === "TEXT"
                            ? languageMode === "EN"
                              ? "Enter text in words..."
                              : "Tulis jawapan dalam perkataan..."
                            : languageMode === "EN"
                            ? "Enter number..."
                            : "Masukkan jawapan...")
                        }
                        className="w-full sm:w-auto sm:min-w-[340px] md:min-w-[460px] rounded-xl border-2 border-slate-900 bg-[#FAF6EE] px-4 py-2.5 font-mono text-sm sm:text-base font-black shadow-tactile-sm cursor-default"
                      />
                      {Boolean(normalized.scratchpadRequired && field.scratchpadRequired) && (
                        <span className="text-xs font-black text-amber-800 bg-amber-100 border border-amber-400 rounded-lg px-2.5 py-1">
                          ✏️ Kertas Conteng Diwajibkan
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tutor-Only Solution & Marking Rubric (Hidden from students) */}
          <div className="mt-5 rounded-2xl border-2 border-slate-900 bg-amber-100/70 p-4 sm:p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b-2 border-amber-900/20 pb-2">
              <span className="font-black text-amber-950 uppercase tracking-wide">
                🔒 Skema Pemarkahan Guru (Tutor Only - Hidden from Students)
              </span>
              <span className="font-bold text-amber-900">
                Jumlah: {normalized.maxMarks || 1} Markah
              </span>
            </div>

            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={f.id || i} className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/10 pb-1.5">
                  <span className="font-bold text-amber-950">
                    {f.label_bm || `Ruang ${i + 1}`}:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-200 border border-emerald-600 px-2 py-0.5 font-black text-emerald-950 font-mono">
                      {f.expectedOp
                        ? f.expectedOp
                        : f.type === "MCQ" && Array.isArray(f.options)
                        ? (() => {
                            const opt = f.options.find(
                              (o) =>
                                String(o.value).toUpperCase() === String(f.expectedAnswer || "").trim().toUpperCase() ||
                                String(o.label_bm || "").trim().toLowerCase() === String(f.expectedAnswer || "").trim().toLowerCase()
                            );
                            return opt ? `[${opt.value}] ${opt.label_bm}` : String(f.expectedAnswer ?? "-");
                          })()
                        : String(f.expectedAnswer ?? "-")}
                    </span>
                    <span className="text-amber-800 font-bold">({f.marks || 1}m)</span>
                  </div>
                </div>
              ))}
            </div>

            {normalized.explanation_bm && (
              <div className="pt-2 text-slate-700 font-sans font-bold text-xs">
                <span className="text-amber-950 font-black">Penerangan Guru: </span>
                <span>{normalized.explanation_bm}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
