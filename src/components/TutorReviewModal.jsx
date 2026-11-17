import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Check,
  RotateCcw,
  Pencil,
  FileText,
  Save,
  Maximize2,
} from "lucide-react";
import { normalizeQuestionFields } from "../engine/questionGenerator.js";
import QuestionVisualFigure from "./visuals/QuestionVisualFigure.jsx";
import { toast, confirmAction } from "./ui/toast.js";

function formatMathOp(op) {
  if (!op || op === "?") return "?";
  if (op === "*") return "×";
  if (op === "/") return "÷";
  if (op === "-") return "−";
  return op;
}

function getQuestionAwardedMarks(q, marksMap) {
  const norm = normalizeQuestionFields(q);
  let awarded = 0;
  if (norm.answerFields && norm.answerFields.length > 1) {
    awarded = norm.answerFields.reduce((sum, f) => {
      const k = `${q.questionNo}_${f.id}`;
      return sum + (parseFloat(marksMap[k]) || 0);
    }, 0);
  } else if (q.section === "C") {
    awarded = (parseFloat(marksMap[`${q.questionNo}_a`]) || 0) + (parseFloat(marksMap[`${q.questionNo}_b`]) || 0);
  } else {
    awarded = parseFloat(marksMap[q.questionNo]) || 0;
  }

  if (marksMap[`${q.questionNo}_scratchpad`] !== undefined) {
    awarded += parseFloat(marksMap[`${q.questionNo}_scratchpad`]) || 0;
  }

  const maxM = parseFloat(q.maxMarks || norm.maxMarks || 1);
  return parseFloat(Math.min(maxM, Math.max(0, awarded)).toFixed(1));
}

export default function TutorReviewModal({
  attempt,
  studentUser,
  languageMode = "BM",
  onClose,
  onFinalize,
  onSaveDraft,
}) {
  const [activeSectionFilter, setActiveSectionFilter] = useState("ALL"); // "ALL" | "A" | "B" | "C"
  const [tutorNotes, setTutorNotes] = useState(attempt.tutorNotes || "");
  const [enlargedScratchpad, setEnlargedScratchpad] = useState(null);

  // Lock document body scroll while Tutor Review modal is active
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const paper = useMemo(() => attempt.paper || [], [attempt.paper]);
  const responses = attempt.responses || {};
  const scratchpads = attempt.scratchpads || {};

  // Initialize per-item marks from existing perItemMarks or auto-graded suggestion
  const [itemMarks, setItemMarks] = useState(() => {
    const marks = {};
    if (attempt.perItemMarks && Object.keys(attempt.perItemMarks).length > 0) {
      return { ...attempt.perItemMarks };
    }
    if (attempt.suggestedPerItemMarks && Object.keys(attempt.suggestedPerItemMarks).length > 0) {
      return { ...attempt.suggestedPerItemMarks };
    }
    if (Array.isArray(attempt.answers) && attempt.answers.length > 0) {
      attempt.answers.forEach((ans) => {
        if (ans.section === "C") {
          marks[`${ans.questionNo}_a`] = parseFloat(ans.marksA) || 0;
          marks[`${ans.questionNo}_b`] = parseFloat(ans.marksB) || 0;
        } else {
          marks[ans.questionNo] = parseFloat(ans.awardedMarks ?? (ans.isCorrect ? 1 : 0)) || 0;
        }
      });
    } else {
      paper.forEach((q) => {
        const norm = normalizeQuestionFields(q);
        if (norm.answerFields && norm.answerFields.length > 1) {
          norm.answerFields.forEach((f) => {
            marks[`${q.questionNo}_${f.id}`] = 0;
          });
        } else if (q.section === "C") {
          marks[`${q.questionNo}_a`] = 0;
          marks[`${q.questionNo}_b`] = 0;
        } else {
          marks[q.questionNo] = 0;
        }
      });
    }
    return marks;
  });

  const maxA = useMemo(
    () => paper.filter((q) => q.section === "A").reduce((s, q) => s + (parseFloat(q.maxMarks) || 1), 0),
    [paper]
  );
  const maxB = useMemo(
    () => paper.filter((q) => q.section === "B").reduce((s, q) => s + (parseFloat(q.maxMarks) || 1), 0),
    [paper]
  );
  const maxC = useMemo(
    () => paper.filter((q) => q.section === "C").reduce((s, q) => s + (parseFloat(q.maxMarks) || 1), 0),
    [paper]
  );
  const paperTotalMarks = parseFloat(attempt.paperTotalMarks || (maxA + maxB + maxC) || 50);

  // Compute live section sums (supports decimal marks)
  const sumA = useMemo(() => {
    return parseFloat(
      paper
        .filter((q) => q.section === "A")
        .reduce((s, q) => s + getQuestionAwardedMarks(q, itemMarks), 0)
        .toFixed(1)
    );
  }, [paper, itemMarks]);

  const sumB = useMemo(() => {
    return parseFloat(
      paper
        .filter((q) => q.section === "B")
        .reduce((s, q) => s + getQuestionAwardedMarks(q, itemMarks), 0)
        .toFixed(1)
    );
  }, [paper, itemMarks]);

  const sumC = useMemo(() => {
    return parseFloat(
      paper
        .filter((q) => q.section === "C")
        .reduce((s, q) => s + getQuestionAwardedMarks(q, itemMarks), 0)
        .toFixed(1)
    );
  }, [paper, itemMarks]);

  const totalMarks = useMemo(() => {
    return parseFloat(
      paper.reduce((s, q) => s + getQuestionAwardedMarks(q, itemMarks), 0).toFixed(1)
    );
  }, [paper, itemMarks]);

  const percentage = Math.round((totalMarks / (paperTotalMarks || 1)) * 100);

  // Explicit Pass / Fail decision chosen by Tutor
  const [tutorDecision, setTutorDecision] = useState(() => {
    if (attempt.tutorDecision) return attempt.tutorDecision;
    if (attempt.status === "PASSED") return "PASSED";
    if (attempt.status === "FAILED") return "FAILED";
    return null;
  });

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const filteredQuestions = useMemo(() => {
    if (activeSectionFilter === "ALL") return paper;
    return paper.filter((q) => q.section === activeSectionFilter);
  }, [paper, activeSectionFilter]);

  const setMark = (key, val) => {
    const parsed = parseFloat(val);
    setItemMarks((prev) => ({
      ...prev,
      [key]: isNaN(parsed) || parsed < 0 ? 0 : parsed,
    }));
  };

  const handleResetToSuggestions = () => {
    const marks = {};
    if (attempt.suggestedPerItemMarks && Object.keys(attempt.suggestedPerItemMarks).length > 0) {
      setItemMarks({ ...attempt.suggestedPerItemMarks });
      return;
    }
    if (Array.isArray(attempt.answers)) {
      attempt.answers.forEach((ans) => {
        if (ans.section === "C") {
          marks[`${ans.questionNo}_a`] = parseFloat(ans.marksA) || 0;
          marks[`${ans.questionNo}_b`] = parseFloat(ans.marksB) || 0;
        } else {
          marks[ans.questionNo] = parseFloat(ans.awardedMarks ?? (ans.isCorrect ? 1 : 0)) || 0;
        }
      });
    }
    setItemMarks(marks);
    toast.info(
      languageMode === "EN" ? "Marks reset to auto-grading suggestions." : "Markah dipulihkan ke cadangan automatik."
    );
  };

  const handleSaveDraft = async () => {
    if (isSavingDraft || isFinalizing) return;
    setIsSavingDraft(true);
    try {
      if (onSaveDraft) {
        await onSaveDraft({
          scoreA: sumA,
          scoreB: sumB,
          scoreC: sumC,
          totalMarks,
          percentage,
          tutorDecision,
          perItemMarks: itemMarks,
          tutorNotes,
        });
        toast.success(
          languageMode === "EN" ? "Draft marks saved successfully!" : "Draf markah berjaya disimpan!"
        );
      }
    } catch (err) {
      console.error("Save draft failed:", err);
      toast.error(languageMode === "EN" ? "Failed to save draft." : "Gagal menyimpan draf markah.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmitFinal = () => {
    if (isSavingDraft || isFinalizing) return;
    if (!tutorDecision) {
      toast.warning(
        languageMode === "EN"
          ? "Please select a decision: PASS or FAIL before finalizing."
          : "Sila pilih keputusan rasmi tutor: LULUS atau GAGAL sebelum memuktamadkan."
      );
      return;
    }

    confirmAction({
      title: languageMode === "EN" ? "Finalize Exam Result?" : "Sahkan Keputusan Peperiksaan?",
      message:
        languageMode === "EN"
          ? `Finalize result for ${studentUser?.name} (Year ${attempt.darjah}): ${totalMarks}/${paperTotalMarks} (${percentage}%) - ${tutorDecision}?`
          : `Muktamadkan keputusan ${studentUser?.name} (Tahun ${attempt.darjah}): ${totalMarks}/${paperTotalMarks} (${percentage}%) - ${tutorDecision === "PASSED" ? "LULUS" : "GAGAL"}?`,
      confirmText: languageMode === "EN" ? "Finalize Result" : "Muktamadkan",
      cancelText: languageMode === "EN" ? "Cancel" : "Batal",
      danger: false,
      onConfirm: async () => {
        setIsFinalizing(true);
        try {
          await onFinalize({
            scoreA: sumA,
            scoreB: sumB,
            scoreC: sumC,
            totalMarks,
            percentage,
            tutorDecision,
            isPassed: tutorDecision === "PASSED",
            perItemMarks: itemMarks,
            tutorNotes,
          });
          toast.success(
            languageMode === "EN"
              ? "Exam result finalized successfully!"
              : "Keputusan peperiksaan berjaya dimuktamadkan!"
          );
        } catch (err) {
          console.error("Finalize exam failed:", err);
          toast.error(
            languageMode === "EN"
              ? "Failed to finalize exam."
              : "Gagal memuktamadkan keputusan peperiksaan."
          );
        } finally {
          setIsFinalizing(false);
        }
      },
    });
  };

  const modalContent = (
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[9999] m-0 p-0 w-screen h-screen overflow-y-auto no-scrollbar bg-[#FAF6EE] flex flex-col [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* ─── STICKY TOP APPBAR (Zero gap at top, max-w-4xl) ─── */}
      <header className="sticky top-0 z-40 border-b-2 border-slate-900 bg-[#FAF6EE] px-4 sm:px-6 py-2.5 shadow-tactile-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="btn-tactile flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-900 hover:bg-slate-50 shadow-tactile-sm"
            >
              <X className="h-4 w-4" />
              <span>{languageMode === "EN" ? "Close" : "Tutup"}</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-slate-900 bg-violet-600 px-2 py-0.5 text-[11px] font-black uppercase text-white shadow-tactile-sm font-mono">
                  🛡️ {languageMode === "EN" ? "TUTOR REVIEW" : "SEMAKAN TUTOR"}
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                  {studentUser?.avatar} {studentUser?.name} • {languageMode === "EN" ? `Year ${attempt.darjah}` : `Tahun ${attempt.darjah}`}
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-600">
                {languageMode === "EN"
                  ? `Submitted: ${new Date(attempt.completedAt || attempt.submittedAt || Date.now()).toLocaleDateString("en-GB")}`
                  : `Dihantar: ${new Date(attempt.completedAt || attempt.submittedAt || Date.now()).toLocaleDateString("ms-MY")}`}
              </p>
            </div>
          </div>

          {/* Quick Score Metrics in Header */}
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg border-2 border-slate-900 bg-white px-2.5 py-1 text-center shadow-tactile-sm">
              <span className="block text-[10px] font-black uppercase text-slate-500 font-mono">
                {languageMode === "EN" ? "Live Total" : "Jumlah Markah"}
              </span>
              <span className="font-mono text-xs sm:text-sm font-black text-slate-900">
                {totalMarks} / {paperTotalMarks}
              </span>
            </div>
            <div
              className={`rounded-lg border-2 border-slate-900 px-2.5 py-1 text-center shadow-tactile-sm ${
                percentage >= 70 ? "bg-emerald-200" : "bg-amber-200"
              }`}
            >
              <span className="block text-[10px] font-black uppercase text-slate-700 font-mono">
                {percentage}%
              </span>
              <span className="font-mono text-xs font-black">
                {percentage >= 70 ? (languageMode === "EN" ? "PASS" : "LULUS") : (languageMode === "EN" ? "REVISION" : "ULANGKAJI")}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── MAIN SCROLLABLE CONTENT (Centered max-w-4xl) ─── */}
      <main className="mx-auto flex-1 w-full max-w-4xl px-4 sm:px-6 py-4 space-y-4">
        {/* KPI Score Cards & Section Marks Breakdown */}
        <div className="rounded-xl border-2 border-slate-900 bg-white p-3.5 sm:p-4 shadow-tactile space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-100 pb-2.5">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 font-mono">
                {languageMode === "EN"
                  ? "📊 Official Final Examination Grading"
                  : "📊 Pemarkahan Peperiksaan Akhir Rasmi"}
              </h3>
              <p className="text-xs font-bold text-slate-500">
                {languageMode === "EN"
                  ? "Review student scratchpad working, adjust decimal marks (0.5 steps), and decide official result."
                  : "Semak lakaran kertas conteng murid, laras markah perpuluhan (langkah 0.5), dan tentukan keputusan rasmi."}
              </p>
            </div>
            <button
              onClick={handleResetToSuggestions}
              className="btn-tactile flex items-center gap-1 rounded-lg border border-slate-900 bg-white px-2.5 py-1 text-xs font-black text-slate-700 hover:bg-slate-50 shadow-tactile-sm"
              title={languageMode === "EN" ? "Reset all marks to system suggestions" : "Pulihkan markah cadangan sistem"}
            >
              <RotateCcw className="h-3.5 w-3.5 text-sky-600" />
              <span>{languageMode === "EN" ? "Reset Suggestions" : "Cadangan Asal"}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono">
            <div className="rounded-lg border-2 border-slate-900 bg-sky-50 p-2 shadow-tactile-sm">
              <span className="text-[10px] font-black uppercase text-sky-900 block">
                {languageMode === "EN" ? "Section A (Objective)" : "Bahagian A (Objektif)"}
              </span>
              <p className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                {sumA} / {maxA}
              </p>
            </div>
            <div className="rounded-lg border-2 border-slate-900 bg-amber-50 p-2 shadow-tactile-sm">
              <span className="text-[10px] font-black uppercase text-amber-900 block">
                {languageMode === "EN" ? "Section B (Structure)" : "Bahagian B (Struktur)"}
              </span>
              <p className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                {sumB} / {maxB}
              </p>
            </div>
            <div className="rounded-lg border-2 border-slate-900 bg-violet-50 p-2 shadow-tactile-sm">
              <span className="text-[10px] font-black uppercase text-violet-900 block">
                {languageMode === "EN" ? "Section C (Problems)" : "Bahagian C (Masalah)"}
              </span>
              <p className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                {sumC} / {maxC}
              </p>
            </div>
            <div className="rounded-lg border-2 border-slate-900 bg-emerald-100 p-2 shadow-tactile-sm">
              <span className="text-[10px] font-black uppercase text-emerald-950 block">
                {languageMode === "EN" ? "Total Paper" : "Jumlah Keseluruhan"}
              </span>
              <p className="text-sm sm:text-base font-black text-slate-950 mt-0.5">
                {totalMarks} / {paperTotalMarks} ({percentage}%)
              </p>
            </div>
          </div>

          {/* Section Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-black text-slate-600 font-mono mr-1">
              {languageMode === "EN" ? "Filter:" : "Tapis:"}
            </span>
            {[
              { id: "ALL", label: languageMode === "EN" ? "All Questions" : "Semua Soalan" },
              { id: "A", label: languageMode === "EN" ? "Section A" : "Bahagian A" },
              { id: "B", label: languageMode === "EN" ? "Section B" : "Bahagian B" },
              { id: "C", label: languageMode === "EN" ? "Section C" : "Bahagian C" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSectionFilter(tab.id)}
                className={`btn-tactile rounded-lg px-2.5 py-1 text-xs font-black border-2 border-slate-900 transition-all font-mono ${
                  activeSectionFilter === tab.id
                    ? "bg-amber-300 text-slate-950 shadow-tactile-sm"
                    : "bg-white text-slate-700 hover:bg-[#FAF6EE]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── QUESTIONS & STUDENT RESPONSES LIST ─── */}
        <div className="space-y-3">
          {filteredQuestions.map((q) => {
            const norm = normalizeQuestionFields(q);
            const resp = responses[q.questionNo] || {};
            const scratchpadImg = scratchpads[q.questionNo] || null;
            const hasMultipleFields = Array.isArray(norm.answerFields) && norm.answerFields.length > 0;
            const awardedTotalForQ = getQuestionAwardedMarks(q, itemMarks);

            return (
              <div
                key={q.questionNo || q.id}
                className="rounded-xl border-2 border-slate-900 bg-white p-3.5 sm:p-4 shadow-tactile space-y-3"
              >
                {/* Header: Question Number, Section & Live Marks Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-slate-900 bg-sky-200 font-mono text-xs font-black text-slate-950 shadow-tactile-sm">
                      {q.questionNo}
                    </span>
                    <span className="rounded-md border border-slate-900 bg-slate-100 px-2 py-0.5 font-mono text-xs font-black">
                      {languageMode === "EN" ? `Section ${q.section}` : `Bahagian ${q.section}`}
                    </span>
                    {q.scratchpadRequired && (
                      <span className="rounded-md border border-amber-400 bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-900">
                        ✏️ {languageMode === "EN" ? "Scratchpad Required" : "Kertas Conteng Wajib"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-xs font-black text-slate-600">
                      {languageMode === "EN" ? "Awarded:" : "Diberi:"}
                    </span>
                    <span className="rounded-lg border-2 border-slate-900 bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-950 shadow-tactile-sm">
                      {awardedTotalForQ} / {q.maxMarks || norm.maxMarks || 1}m
                    </span>
                  </div>
                </div>

                {/* Story Context & Prompt */}
                {q.story_bm && (
                  <p className="text-xs italic font-bold text-slate-600 bg-[#FAF6EE] p-2 rounded-lg border border-slate-200">
                    📖 {languageMode === "EN" ? q.story_en || q.story_bm : q.story_bm}
                  </p>
                )}

                <p className="text-xs sm:text-sm font-black text-slate-900">
                  {languageMode === "EN" ? q.prompt_en || q.prompt_bm : q.prompt_bm}
                </p>

                {/* Question Figure / Image */}
                {norm.visualSpec && (
                  <div className="my-2 flex flex-col items-center justify-center rounded-xl border-2 border-slate-900 bg-[#FAF6EE] p-2.5 min-h-[120px] max-h-56 overflow-hidden">
                    <QuestionVisualFigure visual={norm.visualSpec} languageMode={languageMode} />
                  </div>
                )}

                {/* ── ANSWER FIELDS DISPLAY & MARK INPUTS (Supports Decimal Marks 0.5, 1.5, etc.) ── */}
                {hasMultipleFields ? (
                  <div className="space-y-2.5">
                    {norm.answerFields.map((field, fIdx) => {
                      const fieldKey = `${q.questionNo}_${field.id}`;
                      const currentAwarded = parseFloat(itemMarks[fieldKey] ?? 0);
                      const fieldMaxMarks = parseFloat(field.marks) || 1;
                      const studentFieldAnswer =
                        resp[field.id] !== undefined
                          ? resp[field.id]
                          : resp[`field_${fIdx}`] !== undefined
                          ? resp[`field_${fIdx}`]
                          : fIdx === 0 && resp.answer !== undefined
                          ? resp.answer
                          : "(Tiada Jawapan)";

                      return (
                        <div
                          key={field.id}
                          className="rounded-lg border-2 border-slate-900 bg-[#FAF6EE] p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 flex-1 min-w-[240px]">
                            <span className="font-black text-slate-900 block font-mono">
                              {field.label_bm || (languageMode === "EN" ? `Field ${fIdx + 1}` : `Ruang ${fIdx + 1}`)} ({field.type})
                            </span>
                            <div>
                              <span className="font-bold text-slate-600">
                                {languageMode === "EN" ? "Student Answer: " : "Jawapan Murid: "}
                              </span>
                              <span className="font-mono font-black text-slate-950">
                                {field.type === "operator" ? formatMathOp(studentFieldAnswer) : String(studentFieldAnswer)}
                              </span>
                            </div>
                            {field.expectedAnswer && (
                              <div>
                                <span className="font-bold text-slate-600">
                                  {languageMode === "EN" ? "Expected: " : "Dijangka: "}
                                </span>
                                <span className="font-mono font-black text-slate-700">
                                  {field.type === "operator" ? formatMathOp(field.expectedAnswer) : String(field.expectedAnswer)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Marks Adjuster allowing decimal input (step="0.5") */}
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-xs font-black text-slate-700">
                              {languageMode === "EN" ? "Mark:" : "Markah:"}
                            </span>
                            <input
                              type="number"
                              step="0.5"
                              min={0}
                              max={fieldMaxMarks}
                              value={currentAwarded}
                              onChange={(e) => setMark(fieldKey, e.target.value)}
                              className="w-16 rounded-md border-2 border-slate-900 bg-white px-1.5 py-0.5 text-xs font-mono font-black shadow-tactile-sm text-center"
                            />
                            <span className="text-xs text-slate-500 font-bold">/ {fieldMaxMarks}m</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ── SINGLE / LEGACY QUESTION MARK INPUT ── */
                  <div className="rounded-lg border-2 border-slate-900 bg-[#FAF6EE] p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div>
                        <span className="font-bold text-slate-600">
                          {languageMode === "EN" ? "Student Response: " : "Jawapan Murid: "}
                        </span>
                        <span className="font-mono font-black text-slate-950">
                          {String(resp.answer ?? "(Tiada Jawapan)")}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-600">
                          {languageMode === "EN" ? "Correct Answer: " : "Jawapan Betul: "}
                        </span>
                        <span className="font-mono font-black text-slate-700">
                          {String(q.correctAnswer ?? "-")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-xs font-black text-slate-700">
                        {languageMode === "EN" ? "Mark:" : "Markah:"}
                      </span>
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        max={parseFloat(q.maxMarks) || 1}
                        value={parseFloat(itemMarks[q.questionNo] ?? 0)}
                        onChange={(e) => setMark(q.questionNo, e.target.value)}
                        className="w-16 rounded-md border-2 border-slate-900 bg-white px-1.5 py-0.5 text-xs font-mono font-black shadow-tactile-sm text-center"
                      />
                      <span className="text-xs text-slate-500 font-bold">/ {q.maxMarks || 1}m</span>
                    </div>
                  </div>
                )}

                {/* Student Scratchpad Display */}
                {(scratchpadImg || q.scratchpadRequired) && (
                  <div className="mt-3 rounded-lg border-2 border-dashed border-slate-400 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                        <Pencil className="h-3.5 w-3.5 text-sky-600" />
                        <span>
                          {languageMode === "EN" ? "Student Scratchpad Rough Work:" : "Lakaran Kertas Conteng Murid:"}
                        </span>
                        {q.scratchpadRequired && (
                          <span className="rounded bg-amber-200 px-1.5 py-0.2 text-[10px] font-bold text-amber-950 border border-amber-400">
                            {languageMode === "EN" ? "Required" : "Wajib"}
                          </span>
                        )}
                      </div>
                      {scratchpadImg && (
                        <button
                          type="button"
                          onClick={() => setEnlargedScratchpad({ questionNo: q.questionNo, imgUrl: scratchpadImg })}
                          className="btn-tactile flex items-center gap-1 text-xs font-black text-sky-700 hover:underline"
                        >
                          <Maximize2 className="h-3 w-3" />
                          <span>{languageMode === "EN" ? "Enlarge" : "Besarkan"}</span>
                        </button>
                      )}
                    </div>
                    {scratchpadImg ? (
                      <div
                        onClick={() => setEnlargedScratchpad({ questionNo: q.questionNo, imgUrl: scratchpadImg })}
                        className="cursor-pointer overflow-hidden rounded-lg border border-slate-300 bg-white p-2 hover:border-slate-600 transition-colors"
                        title={languageMode === "EN" ? "Click to enlarge scratchpad" : "Klik untuk membesarkan contengan"}
                      >
                        <img
                          src={scratchpadImg}
                          alt={`Scratchpad Q${q.questionNo}`}
                          className="max-h-56 w-auto object-contain mx-auto"
                        />
                      </div>
                    ) : (
                      <p className="text-xs font-bold italic text-slate-500">
                        {languageMode === "EN"
                          ? "(No scratchpad drawing recorded for this question)"
                          : "(Tiada lakaran kertas conteng direkodkan bagi soalan ini)"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ─── TUTOR NOTES & OFFICIAL DECISION FOOTER ─── */}
        <div className="rounded-xl border-2 border-slate-900 bg-white p-4 shadow-tactile space-y-3">
          <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2">
            <FileText className="h-4 w-4 text-violet-700" />
            <h4 className="text-xs sm:text-sm font-black text-slate-900 font-mono">
              {languageMode === "EN" ? "Tutor Official Feedback & Comments" : "Ulasan & Bimbingan Tutor"}
            </h4>
          </div>

          <textarea
            rows={2}
            value={tutorNotes}
            onChange={(e) => setTutorNotes(e.target.value)}
            placeholder={
              languageMode === "EN"
                ? "Enter guidance notes or encouragement for this student..."
                : "Masukkan ulasan bimbingan atau pujian untuk murid ini..."
            }
            className="w-full rounded-lg border-2 border-slate-900 bg-[#FAF6EE] p-2.5 text-xs font-bold text-slate-900 focus:outline-none shadow-tactile-sm"
          />

          {/* Tutor Decision Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-slate-100 pt-3">
            <div>
              <span className="text-xs font-black uppercase text-slate-700 font-mono">
                {languageMode === "EN" ? "Official Pass/Fail Decision:" : "Keputusan Rasmi Tutor (Lulus / Gagal):"}
              </span>
              <p className="text-[11px] font-bold text-slate-600">
                {languageMode === "EN"
                  ? "Tutor decision determines academic year promotion independently of numerical percentage."
                  : "Keputusan tutor menentukan kenaikan tahun murid secara bebas daripada peratusan markah."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTutorDecision("PASSED")}
                className={`btn-tactile flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-black border-2 border-slate-900 transition-all font-mono ${
                  tutorDecision === "PASSED"
                    ? "bg-emerald-400 text-slate-950 ring-2 ring-emerald-600 shadow-tactile"
                    : "bg-white text-slate-700 hover:bg-emerald-50"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-800" />
                <span>{languageMode === "EN" ? "✅ PASSED" : "✅ LULUS"}</span>
              </button>

              <button
                type="button"
                onClick={() => setTutorDecision("FAILED")}
                className={`btn-tactile flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-black border-2 border-slate-900 transition-all font-mono ${
                  tutorDecision === "FAILED"
                    ? "bg-rose-400 text-slate-950 ring-2 ring-rose-600 shadow-tactile"
                    : "bg-white text-slate-700 hover:bg-rose-50"
                }`}
              >
                <AlertCircle className="h-3.5 w-3.5 text-rose-800" />
                <span>{languageMode === "EN" ? "❌ FAILED" : "❌ GAGAL"}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-slate-100 pt-3">
            <div className="text-xs font-black text-slate-700 font-mono">
              {languageMode === "EN" ? "Score: " : "Markah Semasa: "}
              <span className="text-sm font-black text-slate-950">
                {totalMarks} / {paperTotalMarks} ({percentage}%) • {tutorDecision || "PENDING"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSavingDraft || isFinalizing}
                onClick={handleSaveDraft}
                className="btn-tactile flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-800 hover:bg-slate-50 shadow-tactile-sm disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5 text-sky-600" />
                <span>{isSavingDraft ? "Menyimpan..." : languageMode === "EN" ? "Save Draft" : "Simpan Draf"}</span>
              </button>

              <button
                type="button"
                disabled={isSavingDraft || isFinalizing}
                onClick={handleSubmitFinal}
                className="btn-tactile flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-emerald-400 px-4 py-1.5 text-xs font-black text-slate-950 hover:bg-emerald-300 shadow-tactile disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                <span>
                  {isFinalizing
                    ? "Memuktamadkan..."
                    : languageMode === "EN"
                    ? "Finalize & Record Result"
                    : "Sahkan & Simpan Keputusan"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ─── ENLARGED SCRATCHPAD LIGHTBOX MODAL ─── */}
      {enlargedScratchpad && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative max-h-[90vh] max-w-4xl w-full rounded-xl border-3 border-slate-900 bg-white p-4 shadow-tactile flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b-2 border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-sky-600" />
                <h4 className="text-sm sm:text-base font-black text-slate-900 font-mono">
                  {languageMode === "EN"
                    ? `Student Scratchpad - Question ${enlargedScratchpad.questionNo}`
                    : `Lakaran Kertas Conteng - Soalan ${enlargedScratchpad.questionNo}`}
                </h4>
              </div>
              <button
                onClick={() => setEnlargedScratchpad(null)}
                className="btn-tactile rounded-lg border-2 border-slate-900 bg-white p-1 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex-1 overflow-auto no-scrollbar flex items-center justify-center p-2 bg-[#FAF6EE] rounded-lg border-2 border-slate-900 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <img
                src={enlargedScratchpad.imgUrl}
                alt={`Scratchpad Q${enlargedScratchpad.questionNo}`}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
