// src/components/ExamModal.jsx
// Official Malaysian Primary School Final Exam Paper (Ujian Akhir Darjah)
// Full-Screen Dedicated View, tactile Neo-Brutalist primary school aesthetic,
// normalized logical scratchpad (800x480) with Undo/Clear and touch-action none,
// missing-answer & scratchpad notification dialog with direct question jump buttons,
// confirmation dialog before final submission, arithmetic symbols (+, −, ×, ÷),
// and responsive desktop/laptop layout.

import { useState, useCallback, useRef, useEffect } from "react";
import {
  generateFinalExamPaper,
  gradeEquationSlot,
  normalizeQuestionFields,
  isAnswerMatch,
} from "../engine/questionGenerator.js";
import {
  X,
  Flag,
  ArrowLeft,
  Pencil,
  RotateCcw,
  Maximize2,
  Send,
} from "lucide-react";
import QuestionVisualFigure from "./visuals/QuestionVisualFigure.jsx";

const LOGICAL_WIDTH = 800;
const LOGICAL_HEIGHT = 480;

export default function ExamModal({
  darjah,
  languageMode = "BM",
  paper: publishedPaper,
  onClose,
  onSubmitExamResult,
}) {
  // Snapshot/freeze the paper configuration when attempt starts
  const [frozenExam] = useState(() => {
    const rawQuestions =
      publishedPaper && Array.isArray(publishedPaper.questions) && publishedPaper.questions.length > 0
        ? publishedPaper.questions
        : generateFinalExamPaper(darjah);
    const clonedQuestions = JSON.parse(JSON.stringify(rawQuestions)).map((q, idx) => ({
      ...normalizeQuestionFields(q),
      questionNo: idx + 1,
    }));
    const totalMarks =
      Number(publishedPaper?.totalMarks) ||
      clonedQuestions.reduce((sum, q) => sum + (Number(q.maxMarks) || 1), 0);
    const titleBm = publishedPaper?.title_bm || `Ujian Akhir Tahun ${darjah}`;
    const titleEn = publishedPaper?.title_en || `Year ${darjah} Final Exam`;
    return {
      questions: clonedQuestions,
      totalMarks,
      title_bm: titleBm,
      title_en: titleEn,
    };
  });

  const paper = frozenExam.questions;
  const paperTotalMarks = frozenExam.totalMarks;
  const paperTitle = languageMode === "EN" ? frozenExam.title_en : frozenExam.title_bm;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState({});
  const responsesRef = useRef({});
  const [flagged, setFlagged] = useState({});
  const [startTime] = useState(() => Date.now());
  const [examSummary, setExamSummary] = useState(null);
  const [sessionAttemptId] = useState(() => `exam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notification Modals
  const [incompleteModalData, setIncompleteModalData] = useState(null); // { unanswered: [], missingScratchpad: [] }
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Scratchpad state: stroke lists per question { [qNo]: Array of Strokes }
  const [scratchpadStrokes, setScratchpadStrokes] = useState({});
  const [scratchpads, setScratchpads] = useState({}); // { [qNo]: dataURL }
  const [strokeCounts, setStrokeCounts] = useState({}); // { [qNo]: number }
  const [canvasTool, setCanvasTool] = useState("PENCIL"); // "PENCIL" | "ERASER"
  const [isExpandedScratchpad, setIsExpandedScratchpad] = useState(false);
  const canvasRef = useRef(null);
  const modalCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  const currentQ = paper[currentIdx] || paper[0];
  const fields = currentQ.answerFields || [];
  const curResp = responses[currentQ.questionNo] || {};

  // Redraw canvas with grid and strokes
  const redrawCanvas = useCallback((canvas, strokesList) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

  const saveCurrentScratchpadBitmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL();
      setScratchpads((prev) => ({
        ...prev,
        [currentQ.questionNo]: dataUrl,
      }));
    } catch {
      // ignore
    }
  }, [currentQ.questionNo]);

  useEffect(() => {
    const list = scratchpadStrokes[currentQ.questionNo] || [];
    if (canvasRef.current) redrawCanvas(canvasRef.current, list);
    if (modalCanvasRef.current) redrawCanvas(modalCanvasRef.current, list);
  }, [currentQ.questionNo, scratchpadStrokes, redrawCanvas]);

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
    const newStroke = { tool: canvasTool, points: [pt] };

    setScratchpadStrokes((prev) => {
      const existing = prev[currentQ.questionNo] || [];
      const updated = [...existing, newStroke];
      setStrokeCounts((sc) => ({ ...sc, [currentQ.questionNo]: updated.length }));
      return { ...prev, [currentQ.questionNo]: updated };
    });
  };

  const handleDrawMove = (e, activeCanvas) => {
    if (!isDrawingRef.current || !activeCanvas) return;
    const pt = getLogicalCoords(e, activeCanvas);

    setScratchpadStrokes((prev) => {
      const existing = prev[currentQ.questionNo] || [];
      if (existing.length === 0) return prev;
      const lastStroke = existing[existing.length - 1];
      const updatedStroke = {
        ...lastStroke,
        points: [...lastStroke.points, pt],
      };
      const copy = [...existing];
      copy[copy.length - 1] = updatedStroke;
      return { ...prev, [currentQ.questionNo]: copy };
    });
  };

  const handleEndDraw = () => {
    isDrawingRef.current = false;
    saveCurrentScratchpadBitmap();
  };

  const handleUndoScratchpad = () => {
    setScratchpadStrokes((prev) => {
      const existing = prev[currentQ.questionNo] || [];
      if (existing.length === 0) return prev;
      const copy = existing.slice(0, -1);
      setStrokeCounts((sc) => ({ ...sc, [currentQ.questionNo]: copy.length }));
      return { ...prev, [currentQ.questionNo]: copy };
    });
  };

  const clearCanvas = () => {
    setScratchpadStrokes((prev) => ({ ...prev, [currentQ.questionNo]: [] }));
    setStrokeCounts((sc) => ({ ...sc, [currentQ.questionNo]: 0 }));
    setScratchpads((prev) => {
      const copy = { ...prev };
      delete copy[currentQ.questionNo];
      return copy;
    });
  };

  const handleNavQuestion = (nextIdx) => {
    saveCurrentScratchpadBitmap();
    setCurrentIdx(nextIdx);
  };

  const updateResponseValue = (fieldKey, value) => {
    const qNo = currentQ.questionNo;
    const currentEntry = { ...(responsesRef.current[qNo] || {}) };
    currentEntry[fieldKey] = value;

    // Maintain backwards compatibility with Section A/B/C test keys
    if (fieldKey === "val" || fieldKey === "ans_1" || currentQ.type === "MCQ" || currentQ.section === "A") {
      currentEntry.val = value;
      currentEntry.selectedOption = value;
    }

    responsesRef.current = {
      ...responsesRef.current,
      [qNo]: currentEntry,
    };
    setResponses({ ...responsesRef.current });
  };

  const handleInitiateSubmission = () => {
    if (isSubmitting) return;

    // Capture active DOM input directly before blur
    if (typeof document !== "undefined" && document.activeElement) {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "SELECT")) {
        const qNo = activeEl.getAttribute("data-qno");
        const field = activeEl.getAttribute("data-field");
        if (qNo && field) {
          const val = activeEl.value;
          const currentEntry = { ...(responsesRef.current[qNo] || {}) };
          currentEntry[field] = val;
          if (field === "val") currentEntry.selectedOption = val;
          responsesRef.current = {
            ...responsesRef.current,
            [qNo]: currentEntry,
          };
          setResponses({ ...responsesRef.current });
        }
      }
      if (typeof activeEl.blur === "function") activeEl.blur();
    }
    saveCurrentScratchpadBitmap();

    const currentResponses = responsesRef.current;

    // Identify incomplete questions (0 is valid!)
    const unanswered = paper.filter((q) => {
      const resp = currentResponses[q.questionNo];
      if (!resp) return true;

      // Flexible answer fields check
      if (Array.isArray(q.answerFields) && q.answerFields.length > 0) {
        return q.answerFields.some((f) => {
          const v = resp[f.id] ?? resp[f.type === "MCQ" ? "selectedOption" : "val"];
          if (v === undefined || v === null) return true;
          return String(v).trim() === "";
        });
      }

      // Legacy fallback checks
      if (q.section === "A") {
        if (q.type === "MCQ") return !resp.selectedOption && resp.val === undefined;
        return resp.val === undefined || resp.val === null || String(resp.val).trim() === "";
      }
      if (q.section === "B") {
        const hasNum1 = resp.num1 !== undefined && resp.num1 !== "";
        const hasNum2 = resp.num2 !== undefined && resp.num2 !== "";
        const hasFinal = resp.final !== undefined && resp.final !== "";
        const hasOp = Boolean(resp.op);
        return !hasNum1 && !hasNum2 && !hasFinal && !hasOp;
      }
      if (q.section === "C") {
        const hasA = resp.a_num1 !== undefined && resp.a_num1 !== "";
        const hasB = resp.b_final !== undefined && resp.b_final !== "";
        return !hasA && !hasB;
      }
      return false;
    });

    // Check required scratchpad working
    const missingScratchpad = paper.filter((q) => {
      if (!q.scratchpadRequired) return false;
      const count = strokeCounts[q.questionNo] || 0;
      const pad = scratchpads[q.questionNo];
      return !pad || count === 0;
    });

    if (unanswered.length > 0 || missingScratchpad.length > 0) {
      setIncompleteModalData({ unanswered, missingScratchpad });
      return;
    }

    // All complete -> Proceed to explicit confirmation dialog
    setShowConfirmSubmit(true);
  };

  const executeFinalSubmission = async () => {
    setShowConfirmSubmit(false);
    setIncompleteModalData(null);
    const currentResponses = responsesRef.current;

    let scoreA = 0;
    let scoreB = 0;
    let scoreC = 0;
    const failedTopicSet = new Set();
    const gradedAnswers = [];
    const suggestedPerItemMarks = {};

    paper.forEach((q) => {
      const userAns = currentResponses[q.questionNo] || {};
      const hasWorking =
        !q.scratchpadRequired ||
        ((strokeCounts[q.questionNo] || 0) > 0 && Boolean(scratchpads[q.questionNo]));
      let earned = 0;

      if (q.section === "A") {
        const f0 = q.answerFields?.[0];
        const fieldKey = f0?.id || "val";
        const rawVal =
          userAns[fieldKey] !== undefined && userAns[fieldKey] !== ""
            ? userAns[fieldKey]
            : userAns.val !== undefined && userAns.val !== ""
            ? userAns.val
            : (userAns.selectedOption || "");
        const expected = f0?.expectedAnswer || q.correctAnswer || "";
        const isCorrect = isAnswerMatch(rawVal, expected, f0 || q);
        earned = isCorrect ? 1 : 0;
        if (!hasWorking) earned = 0;
        scoreA += earned;
        suggestedPerItemMarks[q.questionNo] = earned;
      } else if (q.section === "B") {
        earned = gradeEquationSlot({
          userNum1: userAns.num1,
          userOp: userAns.op,
          userNum2: userAns.num2,
          userFinal: userAns.final,
          expectedNum1: q.expectedNum1,
          expectedOp: q.expectedOp,
          expectedNum2: q.expectedNum2,
          expectedAnswer: q.expectedAnswer,
          maxMarks: q.maxMarks || 2,
        });
        if (!hasWorking) earned = 0;
        scoreB += earned;
        suggestedPerItemMarks[q.questionNo] = earned;
      } else if (q.section === "C") {
        const earnedPartA = gradeEquationSlot({
          userNum1: userAns.a_num1,
          userOp: userAns.a_op || "+",
          userNum2: userAns.a_num2,
          userFinal: userAns.a_final,
          expectedNum1: q.partA?.expectedNum1,
          expectedOp: q.partA?.expectedOp,
          expectedNum2: q.partA?.expectedNum2,
          expectedAnswer: q.partA?.expectedAnswer,
          maxMarks: q.partA?.maxMarks || 2,
        });
        const earnedPartB = gradeEquationSlot({
          userNum1: userAns.b_num1,
          userOp: userAns.b_op || "-",
          userNum2: userAns.b_num2,
          userFinal: userAns.b_final,
          expectedNum1: q.partB?.expectedNum1,
          expectedOp: q.partB?.expectedOp,
          expectedNum2: q.partB?.expectedNum2,
          expectedAnswer: q.partB?.expectedAnswer,
          maxMarks: q.partB?.maxMarks || 3,
          carryForwardNum1: userAns.a_final,
        });
        earned = hasWorking ? earnedPartA + earnedPartB : 0;
        scoreC += earned;
        suggestedPerItemMarks[`${q.questionNo}_a`] = hasWorking ? earnedPartA : 0;
        suggestedPerItemMarks[`${q.questionNo}_b`] = hasWorking ? earnedPartB : 0;
      } else {
        // Generic multi-field fallback
        earned = hasWorking ? (q.maxMarks || 1) : 0;
      }

      if (earned < q.maxMarks) {
        failedTopicSet.add(q.topicId);
      }

      gradedAnswers.push({
        questionNo: q.questionNo,
        section: q.section,
        topicId: q.topicId,
        earnedMarks: earned,
        maxMarks: q.maxMarks,
        scratchpadRequired: Boolean(q.scratchpadRequired),
        hasWorking,
      });
    });

    const totalMarks = scoreA + scoreB + scoreC;
    const percentage = Math.round((totalMarks / (paperTotalMarks || 1)) * 100);

    const canvasSnapshots = { ...scratchpads };
    if (canvasRef.current) {
      try {
        canvasSnapshots[currentQ.questionNo] = canvasRef.current.toDataURL();
      } catch {
        // ignore
      }
    }

    const resultPayload = {
      attemptId: sessionAttemptId,
      darjah,
      scoreA,
      scoreB,
      scoreC,
      totalMarks,
      paperTotalMarks,
      paperTotalQuestions: paper.length,
      percentage,
      durationSec: Math.round((Date.now() - startTime) / 1000),
      failedTopicIds: [...failedTopicSet],
      answers: gradedAnswers,
      paper,
      responses: JSON.parse(JSON.stringify(currentResponses)),
      scratchpads: canvasSnapshots,
      strokeCounts,
      suggestedPerItemMarks,
    };

    setIsSubmitting(true);
    try {
      await onSubmitExamResult(resultPayload);
      setExamSummary(resultPayload);
    } catch (err) {
      console.error("Failed to submit exam:", err);
      alert(
        languageMode === "EN"
          ? "Failed to submit exam paper. Your answers are kept safe. Please try again."
          : "Gagal menghantar kertas peperiksaan. Jawapan anda masih disimpan. Sila cuba lagi."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (examSummary) {
    return (
      <div className="fixed inset-0 z-50 bg-[#FAF6EE] flex items-center justify-center p-4 min-h-screen overflow-y-auto">
        <div className="w-full max-w-lg rounded-3xl border-3 border-slate-900 bg-white p-6 sm:p-8 text-center shadow-tactile space-y-4">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-slate-900 bg-amber-300 text-5xl shadow-tactile-sm">
            📬
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {languageMode === "EN" ? "Exam Submitted! 🎉" : "Kertas Berjaya Dihantar! 🎉"}
          </h2>
          <p className="text-sm font-bold text-slate-600">
            {paperTitle}
          </p>

          <div className="my-5 rounded-2xl border-2 border-slate-900 bg-[#FAF6EE] p-5 text-left space-y-2 text-xs font-bold">
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-600">Status Semakan:</span>
              <span className="font-mono text-amber-800 font-black">SEDANG DISEMAK TUTOR</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-600">Jumlah Soalan:</span>
              <span className="font-mono font-black">{paper.length} Soalan</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Peruntukan Markah:</span>
              <span className="font-mono font-black">{paperTotalMarks} Markah</span>
            </div>
          </div>

          <p className="text-xs font-bold text-slate-500">
            {languageMode === "EN"
              ? "Your submission has been securely recorded. The tutor will inspect your rough work, mathematical equations, and answers before finalizing the official result."
              : "Jawapan anda telah dihantar. Tutor akan menyemak jalan kerja, ayat matematik, dan memberikan keputusan rasmi di Papan Prestasi."}
          </p>

          <button
            onClick={onClose}
            className="btn-tactile w-full rounded-2xl border-2 border-slate-900 bg-sky-400 py-3.5 text-base font-black text-slate-950 hover:bg-sky-300 shadow-tactile"
          >
            {languageMode === "EN" ? "Return to Dashboard ➔" : "Kembali ke Papan Utama ➔"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#FAF6EE] flex flex-col min-h-screen overflow-y-auto">
      {/* ─── 1. TOP HEADER ─── */}
      <header className="sticky top-0 z-40 border-b-2 border-slate-900 bg-white px-4 sm:px-6 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl xl:max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="btn-tactile flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-black text-slate-900 hover:bg-slate-50 border-2 border-slate-900"
              title="Keluar dari Peperiksaan"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Peta Pembelajaran</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg border-2 border-slate-900 bg-amber-300 px-2.5 py-0.5 font-mono text-xs font-black text-slate-950 shadow-tactile-sm">
                  {paperTitle.toUpperCase()}
                </span>
                <span className="text-xs font-bold text-slate-600 font-mono">
                  {paperTotalMarks} Markah • {paper.length} Soalan
                </span>
              </div>
              <h2 className="mt-1 text-base sm:text-lg font-black text-slate-900 font-mono">
                Soalan {currentIdx + 1} daripada {paper.length} • Bahagian {currentQ.section || "A"} ({currentQ.maxMarks || 1} Markah)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setFlagged((p) => ({
                  ...p,
                  [currentQ.questionNo]: !p[currentQ.questionNo],
                }))
              }
              className={`btn-tactile flex items-center gap-1.5 rounded-xl border-2 border-slate-900 px-3 py-1.5 text-xs font-black transition-all ${
                flagged[currentQ.questionNo]
                  ? "bg-amber-300 text-slate-950 shadow-tactile-sm"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Flag className="h-4 w-4" />
              <span>Semak Semula</span>
            </button>

            <button
              disabled={isSubmitting}
              onClick={handleInitiateSubmission}
              className="btn-tactile flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-emerald-400 px-4 py-2 text-xs sm:text-sm font-black text-slate-950 hover:bg-emerald-300 shadow-tactile-sm disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? "Menghantar..." : "Hantar Peperiksaan"}</span>
            </button>

            <button
              onClick={onClose}
              className="btn-tactile flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-slate-700 hover:bg-rose-100"
              title="Tutup Ujian"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. QUESTION PALETTE NAV BAR (1 - N) ─── */}
      <div className="border-b-2 border-slate-900 bg-white px-4 sm:px-6 py-2.5">
        <div className="mx-auto flex max-w-5xl xl:max-w-6xl flex-wrap gap-1.5">
          {paper.map((q, i) => {
            const resp = responses[q.questionNo];
            const isAnswered =
              resp !== undefined &&
              Object.values(resp).some((v) => v !== "" && v !== undefined && v !== null);
            const isFlag = flagged[q.questionNo];
            const isCurrent = currentIdx === i;

            return (
              <button
                key={q.questionNo}
                onClick={() => handleNavQuestion(i)}
                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border-2 font-mono text-xs font-black transition-all ${
                  isCurrent
                    ? "border-slate-900 bg-sky-400 text-slate-950 ring-2 ring-slate-900 shadow-tactile-sm scale-105"
                    : isFlag
                    ? "border-slate-900 bg-amber-300 text-slate-950"
                    : isAnswered
                    ? "border-slate-900 bg-emerald-200 text-emerald-950"
                    : "border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 3. QUESTION WORKSPACE & ENLARGED SCRATCHPAD ─── */}
      <main className="mx-auto flex-1 w-full max-w-5xl xl:max-w-6xl px-3.5 sm:px-6 py-3.5 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-start">
          {/* LEFT: Question Stem, Visual Diagram & Input Form */}
          <div className="lg:col-span-7 rounded-xl border-2 border-slate-900 bg-white p-3.5 sm:p-4 shadow-tactile space-y-3">
            {/* Story problem if present */}
            {(currentQ.story_bm || currentQ.story_en) && (
              <div className="rounded-xl border-2 border-slate-900 bg-[#FAF6EE] p-2.5 text-xs font-bold text-slate-800 leading-relaxed shadow-tactile-sm">
                <p>📖 {languageMode === "EN" ? currentQ.story_en || currentQ.story_bm : currentQ.story_bm}</p>
                {currentQ.story_en && languageMode === "DWIBAHASA" && (
                  <p className="mt-0.5 text-[11px] italic text-slate-500 font-semibold">{currentQ.story_en}</p>
                )}
              </div>
            )}

            {/* Prompt */}
            <div className="space-y-0.5">
              <p className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                {languageMode === "EN" ? currentQ.prompt_en || currentQ.prompt_bm : currentQ.prompt_bm}
              </p>
              {currentQ.prompt_en && languageMode === "DWIBAHASA" && (
                <p className="text-xs italic font-bold text-slate-500">{currentQ.prompt_en}</p>
              )}
            </div>

            {/* Visual Spec if present */}
            {currentQ.visualSpec && (
              <div className="my-2 flex w-full max-w-full flex-col items-center justify-center rounded-xl border-2 border-slate-900 bg-[#FAF6EE] p-2 sm:p-2.5 min-h-[120px] max-h-56 overflow-hidden">
                <QuestionVisualFigure visual={currentQ.visualSpec} languageMode={languageMode} />
              </div>
            )}

            {/* ─── INPUT FIELDS (Flexible Multi-Field & Legacy Sections A/B/C) ─── */}
            <div className="space-y-3 pt-2.5 border-t-2 border-slate-100">
              {/* Case 1: Standard Flexible Answer Fields */}
              {fields.length > 0 &&
                fields.map((field, fIdx) => {
                  const val = curResp[field.id] ?? curResp.val ?? "";
                  const fieldType = String(field.type || "NUMERIC").toUpperCase();
                  const isMcq = fieldType === "MCQ" && Array.isArray(field.options) && field.options.length > 0;
                  const isOp = fieldType === "OPERATOR";

                  return (
                    <div key={field.id || fIdx} className="space-y-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 border-b border-slate-100 pb-1">
                        <span className="text-xs sm:text-sm font-black text-slate-800 leading-snug flex-1">
                          {languageMode === "EN"
                            ? (field.label_en || field.label_bm || `Answer Field ${fIdx + 1}`)
                            : (field.label_bm || `Ruang Jawapan ${fIdx + 1}`)}
                        </span>
                        <span className="font-mono text-xs font-black text-slate-600 rounded bg-slate-100 px-2 py-0.5 border border-slate-300 shrink-0 self-start sm:self-auto">
                          ({field.marks || 1} {languageMode === "EN" ? "Marks" : "Markah"})
                        </span>
                      </div>

                      {isMcq ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {(field.options || []).map((opt) => {
                            const isSelected = String(val) === String(opt.value);
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                data-qno={currentQ.questionNo}
                                data-field={field.id}
                                onClick={() => updateResponseValue(field.id, opt.value)}
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
                              data-qno={currentQ.questionNo}
                              data-field={field.id}
                              onClick={() => updateResponseValue(field.id, op)}
                              className={`btn-tactile h-9 w-11 rounded-lg border-2 border-slate-900 font-mono text-lg font-black shadow-tactile-sm transition-all ${
                                val === op ? "bg-amber-300 text-slate-950 ring-2 ring-amber-500" : "bg-white hover:bg-slate-50"
                              }`}
                            >
                              {op}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          data-qno={currentQ.questionNo}
                          data-field={field.id}
                          value={val}
                          onChange={(e) => updateResponseValue(field.id, e.target.value)}
                          placeholder={
                            String(field.type).toUpperCase() === "TEXT"
                              ? languageMode === "EN"
                                ? "Enter text in words..."
                                : "Tulis jawapan dalam perkataan..."
                              : languageMode === "EN"
                              ? "Enter your answer..."
                              : "Masukkan jawapan anda..."
                          }
                          className={`w-full rounded-xl border-2 border-slate-900 bg-[#FAF6EE] px-3.5 py-2.5 font-mono text-sm sm:text-base font-black shadow-tactile-sm ${
                            String(field.type).toUpperCase() === "TEXT" ? "w-full" : "max-w-sm sm:max-w-md"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}

              {/* Case 2: Legacy Section B Equation Builder */}
              {fields.length === 0 && currentQ.section === "B" && (
                <div className="rounded-xl border-2 border-slate-900 bg-[#FAF6EE] p-3 space-y-2.5">
                  <span className="font-mono text-xs font-black text-slate-700 block">
                    {languageMode === "EN" ? "Complete Mathematical Sentence:" : "Lengkapkan Ayat Matematik:"}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-black">
                    <input
                      type="text"
                      data-qno={currentQ.questionNo}
                      data-field="num1"
                      value={curResp.num1 ?? ""}
                      onChange={(e) => updateResponseValue("num1", e.target.value)}
                      placeholder={languageMode === "EN" ? "Num 1" : "Nombor 1"}
                      className="w-20 rounded-lg border-2 border-slate-900 bg-white p-1.5 text-center font-mono font-black shadow-tactile-sm text-xs"
                    />
                    <select
                      data-qno={currentQ.questionNo}
                      data-field="op"
                      value={curResp.op ?? "+"}
                      onChange={(e) => updateResponseValue("op", e.target.value)}
                      className="rounded-lg border-2 border-slate-900 bg-white p-1.5 font-mono font-black shadow-tactile-sm text-xs"
                    >
                      <option value="+">+</option>
                      <option value="−">−</option>
                      <option value="×">×</option>
                      <option value="÷">÷</option>
                    </select>
                    <input
                      type="text"
                      data-qno={currentQ.questionNo}
                      data-field="num2"
                      value={curResp.num2 ?? ""}
                      onChange={(e) => updateResponseValue("num2", e.target.value)}
                      placeholder={languageMode === "EN" ? "Num 2" : "Nombor 2"}
                      className="w-20 rounded-lg border-2 border-slate-900 bg-white p-1.5 text-center font-mono font-black shadow-tactile-sm text-xs"
                    />
                    <span className="text-base font-black">=</span>
                    <input
                      type="text"
                      data-qno={currentQ.questionNo}
                      data-field="final"
                      value={curResp.final ?? ""}
                      onChange={(e) => updateResponseValue("final", e.target.value)}
                      placeholder={languageMode === "EN" ? "Answer" : "Jawapan"}
                      className="w-24 rounded-lg border-2 border-slate-900 bg-white p-1.5 text-center font-mono font-black shadow-tactile-sm text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Nav Prev/Next Buttons (Strict single row: Prev on Left, Next on Right) */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-2.5 border-t border-slate-200">
              <button
                disabled={currentIdx === 0}
                onClick={() => handleNavQuestion(currentIdx - 1)}
                className="btn-tactile flex items-center gap-1 rounded-xl border-2 border-slate-900 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-black text-slate-700 disabled:opacity-30 hover:bg-slate-50 shadow-tactile-sm shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{languageMode === "EN" ? "Prev" : "Sebelum"}</span>
              </button>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  disabled={currentIdx === paper.length - 1}
                  onClick={() => handleNavQuestion(currentIdx + 1)}
                  className="btn-tactile rounded-xl border-2 border-slate-900 bg-sky-300 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-black text-slate-950 hover:bg-sky-200 shadow-tactile-sm disabled:opacity-40 whitespace-nowrap"
                >
                  <span>{languageMode === "EN" ? "Next ➔" : "Seterus ➔"}</span>
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
                  <span>
                    {languageMode === "EN"
                      ? `Scratchpad (Q${currentQ.questionNo})`
                      : `Kertas Conteng (S${currentQ.questionNo})`}
                  </span>
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
                  onClick={clearCanvas}
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

            {/* Normalized Canvas Container (Impeccable h-48 sm:h-64) */}
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
                ? "Perform your calculations here. Sketches are submitted to the tutor."
                : "Lakukan pengiraan bentuk lazim di sini. Lakaran dihantar bersama kertas peperiksaan kepada tutor."}
            </p>
          </div>
        </div>
      </main>

      {/* ─── MODAL: INCOMPLETE QUESTIONS & MISSING SCRATCHPAD NOTIFICATION ─── */}
      {incompleteModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border-3 border-slate-900 bg-white p-6 sm:p-8 shadow-tactile space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-900 bg-amber-300 text-xl shadow-tactile-sm">
                ⚠️
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 font-mono">
                  Soalan Belum Lengkap / Incomplete Questions
                </h4>
                <p className="text-xs font-bold text-slate-600">
                  Sila semak soalan berikut sebelum menghantar peperiksaan.
                </p>
              </div>
            </div>

            {/* Missing Answers Count & Direct Jump Buttons */}
            {incompleteModalData.unanswered.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-black text-slate-800">
                  Terdapat {incompleteModalData.unanswered.length} soalan yang belum dijawab:
                </p>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                  {incompleteModalData.unanswered.map((uq) => (
                    <button
                      key={uq.questionNo}
                      onClick={() => {
                        setIncompleteModalData(null);
                        setCurrentIdx(uq.questionNo - 1);
                      }}
                      className="btn-tactile rounded-xl border-2 border-slate-900 bg-sky-200 px-3 py-1 font-mono text-xs font-black text-slate-950 hover:bg-sky-300 shadow-tactile-sm"
                    >
                      Soalan {uq.questionNo} ➔
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Scratchpad Warning */}
            {incompleteModalData.missingScratchpad.length > 0 && (
              <div className="rounded-2xl border-2 border-amber-500 bg-amber-50 p-3.5 text-xs font-bold text-amber-900 space-y-1">
                <span className="font-black block text-amber-950">
                  ✏️ Peringatan Lakaran Kertas Conteng:
                </span>
                <p>
                  Soalan {incompleteModalData.missingScratchpad.map((q) => q.questionNo).join(", ")} mewajibkan lakaran jalan kerja pada Kertas Conteng tetapi belum mempunyai lakaran. Soalan tanpa jalan kerja boleh dipotong markah oleh tutor.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-slate-100">
              <button
                onClick={() => setIncompleteModalData(null)}
                className="btn-tactile rounded-xl border-2 border-slate-900 bg-sky-400 px-5 py-2.5 text-xs font-black text-slate-950 hover:bg-sky-300 shadow-tactile-sm"
              >
                Kembali Menyemak Soalan
              </button>

              <button
                onClick={() => {
                  setIncompleteModalData(null);
                  setShowConfirmSubmit(true);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
              >
                Teruskan Hantar Walaupun Belum Lengkap ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: EXPLICIT CONFIRMATION BEFORE SUBMISSION ─── */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-md rounded-3xl border-3 border-slate-900 bg-white p-6 sm:p-8 shadow-tactile text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-emerald-200 text-3xl shadow-tactile-sm">
              📬
            </div>
            <h4 className="text-base sm:text-lg font-black text-slate-900 font-mono">
              Sahkan Penghantaran Peperiksaan
            </h4>
            <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed">
              Adakah anda pasti mahu menghantar kertas peperiksaan ini sekarang? Jawapan dan contengan anda akan dihantar kepada tutor untuk semakan rasmi.
            </p>

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="btn-tactile rounded-xl border-2 border-slate-900 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
              >
                Batal / Semak Semula
              </button>
              <button
                onClick={executeFinalSubmission}
                className="btn-tactile rounded-xl border-2 border-slate-900 bg-emerald-400 px-6 py-2.5 text-xs sm:text-sm font-black text-slate-950 hover:bg-emerald-300 shadow-tactile"
              >
                Ya, Sahkan & Hantar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: FULLSCREEN EXPANDED SCRATCHPAD ─── */}
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
                      ? `Expanded Scratchpad (Q${currentQ.questionNo})`
                      : `Kertas Conteng Terperinci (Soalan ${currentQ.questionNo})`}
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
                  onClick={clearCanvas}
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
