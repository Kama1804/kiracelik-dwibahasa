// src/components/PracticeModal.jsx
// Authentic Malaysian Primary School Math Workbook Practice Screen
// Full-Screen Dedicated View, tactile Neo-Brutalist primary school aesthetic,
// normalized logical scratchpad (800x480) with Undo/Clear and touch-action none,
// topic parts support with skip and return navigation, arithmetic symbols (+, −, ×, ÷),
// and responsive desktop/laptop layout.

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import confetti from "canvas-confetti";
import {
  X,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Pencil,
  Maximize2,
  HelpCircle,
} from "lucide-react";
import { generatePracticeSet, normalizeQuestionFields, isAnswerMatch } from "../engine/questionGenerator.js";
import QuestionVisualFigure from "./visuals/QuestionVisualFigure.jsx";

const LOGICAL_WIDTH = 800;
const LOGICAL_HEIGHT = 480;

export default function PracticeModal({
  topic,
  part = null,
  darjah = 1,
  languageMode = "BM",
  recentSubSkills = [],
  customQuestions = [],
  onClose,
  onFinishPractice,
}) {
  // Questions from Part or Generated Practice Set
  const questions = useMemo(() => {
    if (part && Array.isArray(part.questions) && part.questions.length > 0) {
      return part.questions.map((q, idx) => ({
        ...normalizeQuestionFields(q),
        questionNo: idx + 1,
      }));
    }
    const raw = generatePracticeSet(topic.id, darjah, recentSubSkills, customQuestions);
    return raw.map((q, idx) => ({
      ...normalizeQuestionFields(q),
      questionNo: idx + 1,
    }));
  }, [part, topic.id, darjah, recentSubSkills, customQuestions]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qIdx]: { [fieldId]: val } }
  const [feedbackState, setFeedbackState] = useState(null); // "CORRECT" | "HINT" | "REVEAL" | null
  const [attemptCounts, setAttemptCounts] = useState({}); // { [qIdx]: number }
  const [scores, setScores] = useState({}); // { [qIdx]: score }
  const [startTime] = useState(() => Date.now());
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Scratchpad State per Question: { [qIdx]: Array of Strokes }
  // Stroke = { tool: "PENCIL" | "ERASER", points: [{x, y}, ...] }
  const [scratchpadStrokes, setScratchpadStrokes] = useState({});
  const [canvasTool, setCanvasTool] = useState("PENCIL"); // "PENCIL" | "ERASER"
  const [isExpandedScratchpad, setIsExpandedScratchpad] = useState(false);
  const canvasRef = useRef(null);
  const modalCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  const currentQ = questions[currentIndex] || questions[0];
  const fields = currentQ.answerFields || [];
  const currentAnswers = answers[currentIndex] || {};

  // Redraw canvas with grid and all strokes
  const redrawCanvas = useCallback((canvas, strokesList) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw background and faint grid lines
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    for (let x = 0; x <= LOGICAL_WIDTH; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, LOGICAL_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= LOGICAL_HEIGHT; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(LOGICAL_WIDTH, y);
      ctx.stroke();
    }

    // Draw strokes
    (strokesList || []).forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return;
      ctx.beginPath();
      ctx.lineWidth = stroke.tool === "ERASER" ? 28 : 3.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = stroke.tool === "ERASER" ? "#FFFFFF" : "#0F172A";

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, []);

  // Update canvas when currentIndex changes or strokes update
  useEffect(() => {
    const list = scratchpadStrokes[currentIndex] || [];
    if (canvasRef.current) redrawCanvas(canvasRef.current, list);
    if (modalCanvasRef.current) redrawCanvas(modalCanvasRef.current, list);
    setFeedbackState(null);
  }, [currentIndex, scratchpadStrokes, redrawCanvas]);

  // Pointer drawing handlers using normalized logical coordinates
  const getLogicalCoords = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
    const x = ((clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;
    return { x: Math.max(0, Math.min(LOGICAL_WIDTH, x)), y: Math.max(0, Math.min(LOGICAL_HEIGHT, y)) };
  };

  const handleStartDraw = (e, activeCanvas) => {
    if (!activeCanvas) return;
    isDrawingRef.current = true;
    const pt = getLogicalCoords(e, activeCanvas);

    const newStroke = {
      tool: canvasTool,
      points: [pt],
    };

    setScratchpadStrokes((prev) => {
      const existing = prev[currentIndex] || [];
      return {
        ...prev,
        [currentIndex]: [...existing, newStroke],
      };
    });
  };

  const handleDrawMove = (e, activeCanvas) => {
    if (!isDrawingRef.current || !activeCanvas) return;
    const pt = getLogicalCoords(e, activeCanvas);

    setScratchpadStrokes((prev) => {
      const existing = prev[currentIndex] || [];
      if (existing.length === 0) return prev;
      const lastStroke = existing[existing.length - 1];
      const updatedStroke = {
        ...lastStroke,
        points: [...lastStroke.points, pt],
      };
      const copy = [...existing];
      copy[copy.length - 1] = updatedStroke;
      return {
        ...prev,
        [currentIndex]: copy,
      };
    });
  };

  const handleEndDraw = () => {
    isDrawingRef.current = false;
  };

  const handleUndoScratchpad = () => {
    setScratchpadStrokes((prev) => {
      const existing = prev[currentIndex] || [];
      if (existing.length === 0) return prev;
      const copy = existing.slice(0, -1);
      return {
        ...prev,
        [currentIndex]: copy,
      };
    });
  };

  const handleClearScratchpad = () => {
    setScratchpadStrokes((prev) => ({
      ...prev,
      [currentIndex]: [],
    }));
  };

  // Answer Input Handler
  const handleAnswerChange = (fieldId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: {
        ...(prev[currentIndex] || {}),
        [fieldId]: value,
      },
    }));
  };

  // Check Answer Handler
  const handleCheckAnswer = () => {
    let allCorrect = true;

    fields.forEach((field) => {
      const userVal = currentAnswers[field.id];
      const expected =
        field.type === "OPERATOR"
          ? field.expectedOp || field.expectedAnswer || "+"
          : field.expectedAnswer || "";

      const match = isAnswerMatch(userVal, expected, field);
      if (!match) allCorrect = false;
    });

    const currentAttempts = attemptCounts[currentIndex] || 0;

    if (allCorrect) {
      setFeedbackState("CORRECT");
      const earned = currentAttempts === 0 ? 10 : 5;
      setScores((prev) => ({ ...prev, [currentIndex]: earned }));
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } else {
      if (currentAttempts === 0) {
        setAttemptCounts((prev) => ({ ...prev, [currentIndex]: 1 }));
        setFeedbackState("HINT");
      } else {
        setFeedbackState("REVEAL");
        setScores((prev) => ({ ...prev, [currentIndex]: 0 }));
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleFinish = async () => {
    if (isSaving) return;
    setIsFinished(true);
    const totalPossible = questions.length * 10;
    const earnedTotal = Object.values(scores).reduce((s, v) => s + v, 0);
    const pct = Math.round((earnedTotal / (totalPossible || 1)) * 100);
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    const correctCount = Object.values(scores).filter((v) => v >= 5).length;

    setIsSaving(true);
    try {
      if (onFinishPractice) {
        await onFinishPractice(pct, elapsedSec, part?.id || null, questions.length, correctCount);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const totalPoints = Object.values(scores).reduce((s, v) => s + v, 0);
  const maxPossible = Math.max(10, questions.length * 10);
  const scorePercentage = Math.round((totalPoints / maxPossible) * 100);
  const correctCount = Object.values(scores).filter((v) => v >= 5).length;
  const isMicroSet = questions.length <= 3;
  const passed = scorePercentage >= 70 || (isMicroSet && (correctCount >= 2 || scorePercentage >= 66));

  if (isFinished) {
    return (
      <div className="fixed inset-0 z-50 bg-[#FAF6EE] flex items-center justify-center p-4 min-h-screen overflow-y-auto">
        <div className="w-full max-w-lg rounded-3xl border-3 border-slate-900 bg-white p-6 sm:p-8 text-center shadow-tactile space-y-4">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-slate-900 bg-amber-200 text-5xl shadow-tactile-sm">
            {passed ? "🏆" : "💪"}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {passed
              ? languageMode === "EN" ? "Congratulations! Completed! 🎉" : "Tahniah! Bahagian Selesai! 🎉"
              : languageMode === "EN" ? "Good Effort! Keep Going! 💪" : "Usaha Yang Baik! Teruskan! 💪"}
          </h2>

          <p className="text-sm font-bold text-slate-600">
            {(languageMode === "EN" ? part?.title_en || topic?.title_en : null) || part?.title_bm || topic?.title_bm}
          </p>

          <div className="my-5 rounded-2xl border-2 border-slate-900 bg-[#FAF6EE] p-5">
            <span className="text-xs font-black uppercase text-slate-500 font-mono">
              {languageMode === "EN" ? "Practice Score" : "Markah Latihan"}
            </span>
            <div className="mt-1 font-mono text-5xl font-black text-slate-900">
              {scorePercentage}%
            </div>
            <p className="mt-2 text-xs font-bold text-slate-600">
              {languageMode === "EN"
                ? `Criteria: ${isMicroSet ? "≥2 correct answers (≥66%)" : "≥70%"} required to complete this part. Status: ${passed ? "PASSED" : "REVISION NEEDED"}`
                : `Syarat: ${isMicroSet ? "≥2 jawapan betul (≥66%)" : "≥70%"} diperlukan untuk melengkapkan bahagian ini. Status: ${passed ? "LULUS" : "PERLU ULANGKAJI"}`}
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn-tactile w-full rounded-2xl border-2 border-slate-900 bg-sky-400 py-3.5 text-base font-black text-slate-950 hover:bg-sky-300 shadow-tactile"
          >
            {languageMode === "EN" ? "Return to Dashboard" : "Kembali ke Papan Utama"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#FAF6EE] text-slate-900 flex flex-col min-h-screen overflow-y-auto">
      {/* ─── STICKY HEADER ─── */}
      <header className="sticky top-0 z-40 border-b-2 border-slate-900 bg-white px-4 sm:px-6 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl xl:max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border-2 border-slate-900 bg-emerald-300 px-3 py-1 font-mono text-xs font-black text-slate-950 shadow-tactile-sm">
              {languageMode === "EN" ? `Year ${darjah}` : `Tahun ${darjah}`}
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                {(languageMode === "EN" ? part?.title_en || topic?.title_en : null) || part?.title_bm || topic?.title_bm}
              </h2>
              <span className="text-xs font-bold text-slate-500">
                {languageMode === "EN"
                  ? `Question ${currentIndex + 1} of ${questions.length}`
                  : `Soalan ${currentIndex + 1} daripada ${questions.length}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border-2 border-slate-900 bg-white p-1.5 hover:bg-rose-100 shadow-tactile-sm"
              aria-label={languageMode === "EN" ? "Close" : "Tutup"}
              title={languageMode === "EN" ? "Close" : "Tutup"}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="mx-auto flex-1 w-full max-w-5xl xl:max-w-6xl px-3.5 sm:px-6 py-3.5 space-y-3">
        {/* Question Navigation Pills (Allows skip and return freely) */}
        <div className="rounded-xl border-2 border-slate-900 bg-white p-2 sm:p-2.5 shadow-tactile-sm flex flex-wrap items-center gap-1.5">
          {questions.map((q, idx) => {
            const hasAns = answers[idx] && Object.values(answers[idx]).some((v) => v !== "" && v !== undefined);
            const isCur = idx === currentIndex;

            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-7 w-7 rounded-lg font-mono text-xs font-black border-2 border-slate-900 transition-all ${
                  isCur
                    ? "bg-sky-400 text-slate-950 shadow-tactile-sm ring-2 ring-sky-500"
                    : hasAns
                    ? "bg-emerald-200 text-slate-900"
                    : "bg-[#FAF6EE] text-slate-600 hover:bg-slate-100"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Question + Side-by-Side Scratchpad Grid on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-start">
          {/* LEFT: Question Stem, Visual Figure & Answer Fields */}
          <div className="lg:col-span-7 rounded-xl border-2 border-slate-900 bg-white p-3.5 sm:p-4 shadow-tactile space-y-3">
            {/* Story problem if present */}
            {(currentQ.story_bm || currentQ.story_en) && (
              <div className="rounded-xl border-2 border-slate-900 bg-[#FAF6EE] p-2.5 text-xs font-bold text-slate-800 leading-relaxed shadow-tactile-sm">
                <p>📖 {languageMode === "EN" ? currentQ.story_en || currentQ.story_bm : currentQ.story_bm}</p>
                {languageMode === "DWIBAHASA" && currentQ.story_en && (
                  <p className="mt-0.5 text-[11px] italic text-slate-500 font-semibold">{currentQ.story_en}</p>
                )}
              </div>
            )}

            {/* Prompt */}
            <div className="space-y-0.5">
              <p className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                {languageMode === "EN" ? currentQ.prompt_en || currentQ.prompt_bm : currentQ.prompt_bm}
              </p>
              {languageMode === "DWIBAHASA" && currentQ.prompt_en && (
                <p className="text-xs italic font-bold text-slate-500">{currentQ.prompt_en}</p>
              )}
            </div>

            {/* Visual Spec if present */}
            {currentQ.visualSpec && (
              <div className="my-2 flex w-full max-w-full flex-col items-center justify-center rounded-xl border-2 border-slate-900 bg-[#FAF6EE] p-2 sm:p-2.5 min-h-[120px] max-h-56 overflow-hidden">
                <QuestionVisualFigure visual={currentQ.visualSpec} languageMode={languageMode} />
              </div>
            )}

            {/* Answer Fields Inputs */}
            <div className="space-y-3 pt-2 border-t-2 border-slate-100">
              {fields.map((field, fIdx) => {
                const userVal = currentAnswers[field.id] ?? "";
                const fieldType = String(field.type || "NUMERIC").toUpperCase();
                const isMcq = fieldType === "MCQ" && Array.isArray(field.options) && field.options.length > 0;
                const isOp = fieldType === "OPERATOR";

                // Real-time input validation rule (Practice mode ONLY)
                let warnMsg = null;
                if (typeof userVal === "string" && userVal.trim().length > 0) {
                  if ((fieldType === "NUMERIC" || fieldType === "NUMBER") && /[a-zA-Z]/.test(userVal)) {
                    warnMsg = languageMode === "EN"
                      ? "⚠️ This section must be a number only!"
                      : languageMode === "DWIBAHASA"
                      ? "⚠️ Perhatian: Nombor sahaja / Numbers only!"
                      : "⚠️ Perhatian: Ruangan ini mesti diisi dengan NOMBOR sahaja!";
                  } else if (fieldType === "TEXT" && /^\d+$/.test(userVal.trim())) {
                    warnMsg = languageMode === "EN"
                      ? "⚠️ This section must be text only!"
                      : languageMode === "DWIBAHASA"
                      ? "⚠️ Perhatian: Teks sahaja / Text only!"
                      : "⚠️ Perhatian: Ruangan ini mesti diisi dengan PERKATAAN / TEKS!";
                  }
                }

                return (
                  <div key={field.id || fIdx} className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 border-b border-slate-100 pb-1">
                      <span className="text-xs sm:text-sm font-black text-slate-800 leading-snug flex-1">
                        {languageMode === "EN"
                          ? (field.label_en || field.label_bm || `Answer Field ${fIdx + 1}`)
                          : (field.label_bm || `Ruang Jawapan ${fIdx + 1}`)}
                      </span>
                      <span className="font-mono text-xs font-black text-slate-600 rounded bg-slate-100 px-2 py-0.5 border border-slate-300 shrink-0 self-start sm:self-auto">
                        ({field.marks || 1}m)
                      </span>
                    </div>

                    {isMcq ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(field.options || []).map((opt) => {
                          const isSelected = String(userVal) === String(opt.value);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleAnswerChange(field.id, opt.value)}
                              className={`btn-tactile flex items-center gap-2.5 rounded-xl border-2 border-slate-900 p-2.5 text-left text-xs sm:text-sm font-black shadow-tactile-sm transition-all ${
                                isSelected
                                  ? "bg-amber-300 text-slate-950 shadow-tactile ring-2 ring-amber-500"
                                  : "bg-white text-slate-800 hover:bg-[#FAF6EE]"
                              }`}
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 border-slate-900 bg-sky-200 font-mono text-xs font-black">
                                {opt.value}
                              </span>
                              <span>{languageMode === "EN" ? opt.label_en : opt.label_bm}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : isOp ? (
                      <div className="flex items-center gap-2">
                        {["+", "−", "×", "÷"].map((op) => (
                          <button
                            key={op}
                            type="button"
                            onClick={() => handleAnswerChange(field.id, op)}
                            className={`btn-tactile h-9 w-11 rounded-lg border-2 border-slate-900 font-mono text-lg font-black shadow-tactile-sm transition-all ${
                              userVal === op ? "bg-amber-300 text-slate-950 ring-2 ring-amber-500" : "bg-white hover:bg-slate-50"
                            }`}
                          >
                            {op}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <input
                          type="text"
                          value={userVal}
                          onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                          placeholder={
                            fieldType === "TEXT"
                              ? languageMode === "EN"
                                ? "Enter text in words..."
                                : "Tulis jawapan dalam perkataan..."
                              : languageMode === "EN"
                              ? "Enter your answer..."
                              : "Masukkan jawapan anda..."
                          }
                          className={`w-full rounded-xl border-2 border-slate-900 bg-[#FAF6EE] px-3.5 py-2.5 font-mono text-sm sm:text-base font-black shadow-tactile-sm ${
                            fieldType === "TEXT" ? "w-full" : "max-w-sm sm:max-w-md"
                          }`}
                        />
                      </div>
                    )}

                    {/* Immediate Validation Warning Banner */}
                    {warnMsg && (
                      <div className="rounded-lg border-2 border-amber-800 bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-950 flex items-center gap-1.5 animate-pulse shadow-sm">
                        <span>{warnMsg}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Feedback Banners */}
            {feedbackState === "CORRECT" && (
              <div className="rounded-xl border-2 border-slate-900 bg-emerald-100 p-3 text-emerald-950 flex items-center gap-2.5 shadow-tactile-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="text-xs sm:text-sm font-black block">
                    {languageMode === "EN" ? "Correct! Well done! 🎉" : "Tepat Sekali! Syabas! 🎉"}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800">
                    {languageMode === "EN" ? "Your answer is correct. Continue to next question." : "Jawapan anda betul. Sila teruskan ke soalan seterusnya."}
                  </span>
                </div>
              </div>
            )}

            {feedbackState === "HINT" && (
              <div className="rounded-xl border-2 border-slate-900 bg-amber-100 p-3 text-amber-950 flex items-center gap-2.5 shadow-tactile-sm">
                <Lightbulb className="h-5 w-5 text-amber-700 shrink-0" />
                <div>
                  <span className="text-xs sm:text-sm font-black block">
                    {languageMode === "EN" ? "Not Quite, Try Again!" : "Belum Tepat, Cuba Sekali Lagi!"}
                  </span>
                  <span className="text-[11px] font-bold text-amber-800">
                    {(languageMode === "EN" && currentQ.hint_en ? currentQ.hint_en : currentQ.hint_bm) ||
                      (languageMode === "EN" ? "Review the diagram or check your calculation steps." : "Perhatikan rajah atau semak semula langkah pengiraan anda.")}
                  </span>
                </div>
              </div>
            )}

            {feedbackState === "REVEAL" && (
              <div className="rounded-xl border-2 border-slate-900 bg-rose-100 p-3 text-rose-950 flex items-center gap-2.5 shadow-tactile-sm">
                <HelpCircle className="h-5 w-5 text-rose-700 shrink-0" />
                <div>
                  <span className="text-xs sm:text-sm font-black block">
                    {languageMode === "EN" ? "Correct Answer Revealed" : "Jawapan Sebenar Ditunjukkan"}
                  </span>
                  <span className="text-[11px] font-bold text-rose-800">
                    {(languageMode === "EN" && currentQ.explanation_en ? currentQ.explanation_en : currentQ.explanation_bm) ||
                      `${languageMode === "EN" ? "Correct answer" : "Jawapan betul"}: ${fields
                        .map((f) => {
                          if (f.type === "OPERATOR") return f.expectedOp || f.expectedAnswer || "+";
                          if (f.type === "MCQ" && Array.isArray(f.options)) {
                            const opt = f.options.find(
                              (o) =>
                                String(o.value).toUpperCase() === String(f.expectedAnswer || "").trim().toUpperCase() ||
                                String(o.label_bm || "").trim().toLowerCase() === String(f.expectedAnswer || "").trim().toLowerCase()
                            );
                            return opt ? `[${opt.value}] ${opt.label_bm}` : f.expectedAnswer;
                          }
                          return f.expectedAnswer || "";
                        })
                        .join(", ")}`}
                  </span>
                </div>
              </div>
            )}

            {/* Check / Next Navigation Buttons (Strict Single Row: Prev on Left, Check + Next on Right) */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-2.5 border-t border-slate-200">
              <button
                disabled={currentIndex === 0}
                onClick={handlePrev}
                className="btn-tactile flex items-center gap-1 rounded-xl border-2 border-slate-900 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-black text-slate-700 disabled:opacity-30 hover:bg-slate-50 shadow-tactile-sm shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{languageMode === "EN" ? "Prev" : "Sebelum"}</span>
              </button>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={handleCheckAnswer}
                  className="btn-tactile rounded-xl border-2 border-slate-900 bg-sky-300 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-black text-slate-950 hover:bg-sky-200 shadow-tactile-sm whitespace-nowrap"
                >
                  {languageMode === "EN" ? "Check" : "Semak"}
                </button>
                <button
                  onClick={handleNext}
                  className="btn-tactile flex items-center gap-1 rounded-xl border-2 border-slate-900 bg-emerald-400 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-black text-slate-950 hover:bg-emerald-300 shadow-tactile-sm whitespace-nowrap"
                >
                  <span>
                    {currentIndex === questions.length - 1
                      ? languageMode === "EN" ? "Finish" : "Selesai"
                      : languageMode === "EN" ? "Next" : "Seterus"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Enlarged Digital Scratchpad (Beside Question on Desktop, Impeccable Mobile 2-Row Header) */}
          <div className="lg:col-span-5 rounded-xl border-2 border-slate-900 bg-white p-3 sm:p-4 shadow-tactile space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-slate-100 pb-2">
              <div className="flex items-center justify-between w-full sm:w-auto">
                <span className="font-mono text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5 shrink-0">
                  <Pencil className="h-3.5 w-3.5 text-sky-600" />
                  <span>{languageMode === "EN" ? "Scratchpad" : "Kertas Conteng"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsExpandedScratchpad(true)}
                  className="btn-tactile rounded-lg border border-slate-900 bg-sky-100 p-1.5 text-sky-950 hover:bg-sky-200 sm:hidden"
                  title={languageMode === "EN" ? "Expand Scratchpad" : "Kembangkan Kertas Conteng"}
                  aria-label={languageMode === "EN" ? "Expand Scratchpad" : "Kembangkan Kertas Conteng"}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto sm:flex sm:items-center">
                <button
                  type="button"
                  onClick={() => setCanvasTool("PENCIL")}
                  className={`btn-tactile min-h-[40px] sm:min-h-0 flex items-center justify-center rounded-lg border border-slate-900 px-2 py-1 text-xs font-black ${
                    canvasTool === "PENCIL" ? "bg-amber-300 text-slate-950 shadow-tactile-sm" : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  title={languageMode === "EN" ? "Pencil" : "Pensel"}
                >
                  {languageMode === "EN" ? "Pencil" : "Pensel"}
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasTool("ERASER")}
                  className={`btn-tactile min-h-[40px] sm:min-h-0 flex items-center justify-center rounded-lg border border-slate-900 px-2 py-1 text-xs font-black ${
                    canvasTool === "ERASER" ? "bg-amber-300 text-slate-950 shadow-tactile-sm" : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  title={languageMode === "EN" ? "Eraser" : "Pemadam"}
                >
                  {languageMode === "EN" ? "Eraser" : "Pemadam"}
                </button>
                <button
                  type="button"
                  onClick={handleUndoScratchpad}
                  className="btn-tactile min-h-[40px] sm:min-h-0 flex items-center justify-center rounded-lg border border-slate-900 bg-white p-1 text-xs font-black text-slate-700 hover:bg-slate-50"
                  title={languageMode === "EN" ? "Undo" : "Undur"}
                  aria-label={languageMode === "EN" ? "Undo Stroke" : "Undur Coretan"}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-0.5 sm:mr-0" />
                  <span className="sm:hidden">{languageMode === "EN" ? "Undo" : "Undur"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearScratchpad}
                  className="btn-tactile min-h-[40px] sm:min-h-0 flex items-center justify-center rounded-lg border border-slate-900 bg-rose-50 px-2 py-1 text-xs font-black text-rose-700 hover:bg-rose-100"
                  title={languageMode === "EN" ? "Clear" : "Padam"}
                  aria-label={languageMode === "EN" ? "Clear Scratchpad" : "Padam Kertas Conteng"}
                >
                  {languageMode === "EN" ? "Clear" : "Padam"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpandedScratchpad(true)}
                  className="hidden sm:inline-flex btn-tactile rounded-lg border border-slate-900 bg-sky-100 p-1.5 text-sky-950 hover:bg-sky-200"
                  title={languageMode === "EN" ? "Expand Scratchpad" : "Kembangkan Kertas Conteng"}
                  aria-label={languageMode === "EN" ? "Expand Scratchpad" : "Kembangkan Kertas Conteng"}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Normalized Scratchpad Canvas Container (Impeccable h-48 sm:h-64) */}
            <div className="relative overflow-hidden rounded-xl border-2 border-slate-900 bg-white shadow-tactile-sm h-48 sm:h-64 w-full touch-none">
              <canvas
                ref={canvasRef}
                width={LOGICAL_WIDTH}
                height={LOGICAL_HEIGHT}
                className="w-full h-full object-contain touch-none block"
                onMouseDown={(e) => handleStartDraw(e, canvasRef.current)}
                onMouseMove={(e) => handleDrawMove(e, canvasRef.current)}
                onMouseUp={handleEndDraw}
                onMouseLeave={handleEndDraw}
                onTouchStart={(e) => handleStartDraw(e, canvasRef.current)}
                onTouchMove={(e) => handleDrawMove(e, canvasRef.current)}
                onTouchEnd={handleEndDraw}
              />
            </div>
            <p className="text-[11px] font-bold text-slate-500 text-center">
              {languageMode === "EN"
                ? "Perform your calculations here. Sketches are saved automatically."
                : "Lakukan pengiraan bentuk lazim di sini. Lakaran disimpan secara automatik."}
            </p>
          </div>
        </div>
      </main>

      {/* ─── FULLSCREEN EXPANDED SCRATCHPAD MODAL (Mobile / Desktop) ─── */}
      {isExpandedScratchpad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-2 sm:p-4">
          <div className="w-full max-w-4xl rounded-3xl border-3 border-slate-900 bg-white p-3 sm:p-5 shadow-tactile space-y-3 overflow-x-hidden">
            {/* Header: Title + Close on Row 1 on mobile, tools on Row 2 */}
            <div className="border-b-2 border-slate-900 pb-2.5 sm:pb-3 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0">
                <span className="font-mono text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5 truncate">
                  <Maximize2 className="h-4 w-4 text-sky-600 shrink-0" />
                  <span className="truncate">
                    {languageMode === "EN"
                      ? `Expanded Scratchpad (Q${currentIndex + 1})`
                      : `Kertas Conteng Terperinci (Soalan ${currentIndex + 1})`}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsExpandedScratchpad(false)}
                  className="sm:hidden rounded-xl border-2 border-slate-900 bg-white p-1 hover:bg-rose-100 shrink-0"
                  aria-label={languageMode === "EN" ? "Close Expanded Scratchpad" : "Tutup Kertas Conteng Kembangan"}
                  title={languageMode === "EN" ? "Close" : "Tutup"}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
                <button
                  type="button"
                  onClick={() => setCanvasTool("PENCIL")}
                  className={`btn-tactile rounded-xl border border-slate-900 px-2 sm:px-3 py-1 text-xs font-black text-center ${
                    canvasTool === "PENCIL" ? "bg-amber-300 text-slate-950" : "bg-white text-slate-700"
                  }`}
                >
                  {languageMode === "EN" ? "Pencil" : "Pensel"}
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasTool("ERASER")}
                  className={`btn-tactile rounded-xl border border-slate-900 px-2 sm:px-3 py-1 text-xs font-black text-center ${
                    canvasTool === "ERASER" ? "bg-amber-300 text-slate-950" : "bg-white text-slate-700"
                  }`}
                >
                  {languageMode === "EN" ? "Eraser" : "Pemadam"}
                </button>
                <button
                  type="button"
                  onClick={handleUndoScratchpad}
                  className="btn-tactile rounded-xl border border-slate-900 bg-white px-2 sm:px-2.5 py-1 text-xs font-black text-slate-700 text-center"
                  aria-label={languageMode === "EN" ? "Undo Stroke" : "Undur Coretan"}
                  title={languageMode === "EN" ? "Undo" : "Undur"}
                >
                  {languageMode === "EN" ? "Undo" : "Undur"}
                </button>
                <button
                  type="button"
                  onClick={handleClearScratchpad}
                  className="btn-tactile rounded-xl border border-slate-900 bg-rose-50 px-2 sm:px-3 py-1 text-xs font-black text-rose-700 text-center truncate"
                  aria-label={languageMode === "EN" ? "Clear Scratchpad" : "Padam"}
                  title={languageMode === "EN" ? "Clear All" : "Padam"}
                >
                  {languageMode === "EN" ? "Clear" : "Padam"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpandedScratchpad(false)}
                  className="hidden sm:inline-flex rounded-xl border-2 border-slate-900 bg-white p-1 hover:bg-rose-100 shrink-0"
                  aria-label={languageMode === "EN" ? "Close Expanded Scratchpad" : "Tutup Kertas Conteng Kembangan"}
                  title={languageMode === "EN" ? "Close" : "Tutup"}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border-2 border-slate-900 bg-white shadow-tactile-sm">
              <canvas
                ref={modalCanvasRef}
                width={LOGICAL_WIDTH}
                height={LOGICAL_HEIGHT}
                style={{ width: "100%", height: "auto", aspectRatio: "800/480", touchAction: "none" }}
                onMouseDown={(e) => handleStartDraw(e, modalCanvasRef.current)}
                onMouseMove={(e) => handleDrawMove(e, modalCanvasRef.current)}
                onMouseUp={handleEndDraw}
                onMouseLeave={handleEndDraw}
                onTouchStart={(e) => handleStartDraw(e, modalCanvasRef.current)}
                onTouchMove={(e) => handleDrawMove(e, modalCanvasRef.current)}
                onTouchEnd={handleEndDraw}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
