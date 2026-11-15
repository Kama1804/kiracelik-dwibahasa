// src/components/tutor/QuestionEditorModal.jsx
import { useState, useMemo } from "react";
import {
  X,
  Eye,
  CheckCircle2,
  Image as ImageIcon,
  RotateCcw,
} from "lucide-react";
import QuestionVisualFigure from "../visuals/QuestionVisualFigure.jsx";
import {
  normalizeQuestionFields,
  getStandardQuestionCatalog,
} from "../../engine/questionGenerator.js";
import { toast } from "../ui/toast.js";

export default function QuestionEditorModal({
  isOpen,
  onClose,
  onSave,
  initialQuestion = null,
  darjah = 1,
  topicId = null,
  topics = [],
  practiceParts = [],
  isPaperBuilder = false,
  languageMode = "BM",
}) {
  if (!isOpen) return null;

  return (
    <QuestionEditorModalContent
      onClose={onClose}
      onSave={onSave}
      initialQuestion={initialQuestion}
      darjah={darjah}
      topicId={topicId}
      topics={topics}
      practiceParts={practiceParts}
      isPaperBuilder={isPaperBuilder}
      languageMode={languageMode}
    />
  );
}

function QuestionEditorModalContent({
  onClose,
  onSave,
  initialQuestion,
  darjah,
  topicId,
  topics,
  practiceParts,
  isPaperBuilder,
  languageMode,
}) {
  const norm = useMemo(() => {
    return initialQuestion ? normalizeQuestionFields(initialQuestion) : null;
  }, [initialQuestion]);

  const [activeModalTab, setActiveModalTab] = useState("EDITOR"); // "EDITOR" | "PREVIEW"

  // Base identifiers
  const qDarjah = Number(norm?.darjah || darjah || 1);
  const qTopicId = norm?.topicId || topicId || (topics[0]?.id || "");
  const [qSection, setQSection] = useState(() => norm?.section || (isPaperBuilder ? "A" : "A"));
  const [qPartId, setQPartId] = useState(() => norm?.partId || "");

  // Story Problem & Prompts
  const [qStoryBm, setQStoryBm] = useState(() => norm?.story_bm || "");
  const [qStoryEn, setQStoryEn] = useState(() => norm?.story_en || "");
  const [qPromptBm, setQPromptBm] = useState(() => norm?.prompt_bm || "");
  const [qPromptEn, setQPromptEn] = useState(() => norm?.prompt_en || "");
  const qInstructionsBm = norm?.instructions_bm || "";
  const qInstructionsEn = norm?.instructions_en || "";
  const qHintBm = norm?.hint_bm || "";
  const qHintEn = norm?.hint_en || "";
  const [qExplBm, setQExplBm] = useState(() => norm?.explanation_bm || "");
  const qExplEn = norm?.explanation_en || "";
  const [qScratchpadRequired, setQScratchpadRequired] = useState(() => Boolean(norm?.scratchpadRequired));
  const [qScratchpadMarks, setQScratchpadMarks] = useState(() =>
    parseFloat(norm?.scratchpadMarks) || (norm?.scratchpadRequired ? 2 : 0)
  );
  const qForPractice = norm?.forPractice !== false;
  const qForExam = norm?.forExam !== false;

  // Visual / Figure
  const [qImageUrl, setQImageUrl] = useState(() => {
    if (norm?.visualSpec?.type === "CUSTOM_IMAGE") return norm.visualSpec.data?.url || "";
    return norm?.customImage || "";
  });
  const [qImageCaptionBm, setQImageCaptionBm] = useState(() => {
    if (norm?.visualSpec?.type === "CUSTOM_IMAGE") return norm.visualSpec.data?.caption_bm || "";
    return norm?.caption_bm || "";
  });
  const [qImageCaptionEn, setQImageCaptionEn] = useState(() => {
    if (norm?.visualSpec?.type === "CUSTOM_IMAGE") return norm.visualSpec.data?.caption_en || "";
    return norm?.caption_en || "";
  });

  const [hideVisual, setHideVisual] = useState(() => Boolean(norm?.hideVisual));
  const [currentVisualSpec, setCurrentVisualSpec] = useState(() => (norm?.hideVisual ? null : norm?.visualSpec || null));

  // Find original standard question visual for restoration
  const originalStandardVisual = useMemo(() => {
    if (norm?.source === "STANDARD" && norm?.id) {
      const catalog = getStandardQuestionCatalog(qDarjah, qTopicId);
      const found = catalog.find((sq) => sq.id === norm.id);
      return found?.visualSpec || null;
    }
    return null;
  }, [norm, qDarjah, qTopicId]);

  // Answer Fields
  const [answerFields, setAnswerFields] = useState(() => {
    if (Array.isArray(norm?.answerFields) && norm.answerFields.length > 0) {
      return norm.answerFields.map((f, i) => ({
        ...f,
        id: f.id || `f_${i + 1}`,
        marks: parseFloat(f.marks) || 1,
        type: String(f.type || "NUMERIC").toUpperCase(),
        scratchpadRequired: Boolean(norm?.scratchpadRequired && f.scratchpadRequired),
        options:
          Array.isArray(f.options) && f.options.length > 0
            ? f.options
            : [
                { label_bm: "Pilihan A", label_en: "Option A", value: "A" },
                { label_bm: "Pilihan B", label_en: "Option B", value: "B" },
                { label_bm: "Pilihan C", label_en: "Option C", value: "C" },
                { label_bm: "Pilihan D", label_en: "Option D", value: "D" },
              ],
      }));
    }
    return [
      {
        id: "f_1",
        label_bm: "Jawapan",
        label_en: "Answer",
        type: norm?.type === "MCQ" ? "MCQ" : "NUMERIC",
        options:
          norm?.options || [
            { label_bm: "Pilihan A", label_en: "Option A", value: "A" },
            { label_bm: "Pilihan B", label_en: "Option B", value: "B" },
            { label_bm: "Pilihan C", label_en: "Option C", value: "C" },
            { label_bm: "Pilihan D", label_en: "Option D", value: "D" },
          ],
        expectedAnswer: norm?.correctAnswer || "",
        expectedOp: norm?.type === "OPERATOR" ? "+" : undefined,
        marks: parseFloat(norm?.maxMarks) || 1,
        scratchpadRequired: false,
      },
    ];
  });

  const [isSaving, setIsSaving] = useState(false);

  // Compute blank marks & total max marks (supports decimal marks 0.5, 1.5, 2.5, 3.5)
  const blankMarks = useMemo(() => {
    return parseFloat(answerFields.reduce((sum, f) => sum + (parseFloat(f.marks) || 1), 0).toFixed(1));
  }, [answerFields]);

  const calculatedTotalMarks = useMemo(() => {
    const scMarks = qScratchpadRequired ? (parseFloat(qScratchpadMarks) || 0) : 0;
    return parseFloat((blankMarks + scMarks).toFixed(1));
  }, [blankMarks, qScratchpadRequired, qScratchpadMarks]);

  // Image Upload Handlers
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setQImageUrl(ev.target.result);
      setHideVisual(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFigure = () => {
    setQImageUrl("");
    setQImageCaptionBm("");
    setQImageCaptionEn("");
    setCurrentVisualSpec(null);
    setHideVisual(true);
  };

  const handleRestoreDefaultFigure = () => {
    setHideVisual(false);
    setQImageUrl("");
    setQImageCaptionBm("");
    setQImageCaptionEn("");
    setCurrentVisualSpec(originalStandardVisual);
  };

  // Answer Field Helpers
  const addAnswerField = (type = "NUMERIC") => {
    const newIdx = answerFields.length + 1;
    setAnswerFields((prev) => [
      ...prev,
      {
        id: `f_${Date.now()}_${newIdx}`,
        label_bm: `Bahagian (${String.fromCharCode(96 + newIdx)}): Jawapan`,
        label_en: `Part (${String.fromCharCode(96 + newIdx)}): Answer`,
        type,
        options: [
          { label_bm: "Pilihan A", label_en: "Option A", value: "A" },
          { label_bm: "Pilihan B", label_en: "Option B", value: "B" },
          { label_bm: "Pilihan C", label_en: "Option C", value: "C" },
          { label_bm: "Pilihan D", label_en: "Option D", value: "D" },
        ],
        expectedAnswer: type === "MCQ" ? "A" : "",
        expectedOp: type === "OPERATOR" ? "+" : undefined,
        marks: 1,
        scratchpadRequired: false,
      },
    ]);
  };

  const removeAnswerField = (fieldId) => {
    if (answerFields.length <= 1) {
      toast.warning(
        languageMode === "EN"
          ? "A question must have at least one answer field."
          : "Soalan mesti mempunyai sekurang-kurangnya satu ruang jawapan."
      );
      return;
    }
    setAnswerFields((prev) => prev.filter((f) => f.id !== fieldId));
  };

  const updateFieldProperty = (fieldId, prop, val) => {
    setAnswerFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, [prop]: val } : f))
    );
  };

  // Section Template Presets
  const applySectionBPreset = () => {
    setQSection("B");
    setQScratchpadRequired(true);
    setQScratchpadMarks(2);
    setAnswerFields([
      {
        id: "num1",
        label_bm: "Nombor 1",
        label_en: "Number 1",
        type: "NUMERIC",
        expectedAnswer: "",
        marks: 1,
      },
      {
        id: "op",
        label_bm: "Operasi (+, −, ×, ÷)",
        label_en: "Operation (+, −, ×, ÷)",
        type: "OPERATOR",
        expectedOp: "+",
        expectedAnswer: "+",
        marks: 0,
      },
      {
        id: "num2",
        label_bm: "Nombor 2",
        label_en: "Number 2",
        type: "NUMERIC",
        expectedAnswer: "",
        marks: 0,
      },
      {
        id: "final",
        label_bm: "Jawapan Akhir",
        label_en: "Final Answer",
        type: "NUMERIC",
        expectedAnswer: "",
        marks: 1,
        scratchpadRequired: true,
      },
    ]);
  };

  const applySectionCPreset = () => {
    setQSection("C");
    setQScratchpadRequired(true);
    setQScratchpadMarks(2);
    setAnswerFields([
      {
        id: "part_a",
        label_bm: "(a) Langkah Pengiraan & Jawapan",
        label_en: "(a) Calculation & Answer",
        type: "NUMERIC",
        expectedAnswer: "",
        marks: 2,
        scratchpadRequired: true,
      },
      {
        id: "part_b",
        label_bm: "(b) Penyelesaian Masalah Lanjutan",
        label_en: "(b) Further Problem Solving",
        type: "NUMERIC",
        expectedAnswer: "",
        marks: 2,
        scratchpadRequired: true,
      },
    ]);
  };

  // Submission: CRITICAL -> Pass (payload, qPartId) to immediately assign part in QuestionBankTab
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (!qPromptBm.trim() && !qPromptEn.trim()) {
      toast.warning(
        languageMode === "EN"
          ? "Please enter a question prompt."
          : "Sila masukkan teks soalan."
      );
      return;
    }

    const payload = {
      ...(initialQuestion || {}),
      id: initialQuestion?.id || `cq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      darjah: Number(qDarjah),
      topicId: qTopicId,
      section: qSection,
      partId: qPartId || null,
      subSkillId: initialQuestion?.subSkillId || `CUSTOM_${Date.now()}`,
      source: initialQuestion?.source || "CUSTOM",
      story_bm: qStoryBm.trim(),
      story_en: qStoryEn.trim(),
      prompt_bm: qPromptBm.trim() || qPromptEn.trim(),
      prompt_en: qPromptEn.trim() || qPromptBm.trim(),
      instructions_bm: qInstructionsBm.trim(),
      instructions_en: qInstructionsEn.trim(),
      hint_bm: qHintBm.trim(),
      hint_en: qHintEn.trim(),
      explanation_bm: qExplBm.trim(),
      explanation_en: qExplEn.trim(),
      answerFields: answerFields.map((f) => ({
        ...f,
        marks: parseFloat(f.marks) || 1,
        scratchpadRequired: qScratchpadRequired ? Boolean(f.scratchpadRequired) : false,
        expectedOp: f.type === "OPERATOR" ? (f.expectedOp || "+") : undefined,
        expectedAnswer: f.type === "OPERATOR" ? (f.expectedOp || "+") : String(f.expectedAnswer ?? "").trim(),
        options: f.type === "MCQ" ? f.options : null,
      })),
      blankMarks,
      scratchpadMarks: qScratchpadRequired ? (parseFloat(qScratchpadMarks) || 0) : 0,
      maxMarks: calculatedTotalMarks,
      scratchpadRequired: qScratchpadRequired,
      forPractice: qForPractice,
      forExam: qForExam,
      hideVisual: Boolean(hideVisual),
      visualSpec: hideVisual
        ? null
        : qImageUrl
        ? {
            type: "CUSTOM_IMAGE",
            data: {
              url: qImageUrl,
              alt: "Uploaded Question Diagram",
              caption_bm: qImageCaptionBm.trim(),
              caption_en: qImageCaptionEn.trim(),
            },
          }
        : currentVisualSpec || null,
      customImage: hideVisual ? null : qImageUrl || null,
      type: answerFields[0]?.type === "MCQ" ? "MCQ" : "KEYPAD",
      correctAnswer: answerFields[0]?.expectedAnswer || "",
      options: answerFields[0]?.type === "MCQ" ? answerFields[0]?.options : null,
    };

    setIsSaving(true);
    try {
      await onSave(payload, qPartId);
      onClose();
    } catch (err) {
      console.error("Failed to save question:", err);
      toast.error(
        languageMode === "EN"
          ? "Failed to save question. Please try again."
          : "Gagal menyimpan soalan. Sila cuba lagi."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Preview Object
  const previewQuestionObj = useMemo(() => {
    return {
      darjah: Number(qDarjah),
      topicId: qTopicId,
      section: qSection,
      story_bm: qStoryBm,
      story_en: qStoryEn,
      prompt_bm: qPromptBm || (languageMode === "EN" ? "(Please enter prompt)" : "(Sila masukkan teks soalan)"),
      prompt_en: qPromptEn,
      instructions_bm: qInstructionsBm,
      instructions_en: qInstructionsEn,
      answerFields: answerFields.map((f) => ({
        ...f,
        marks: parseFloat(f.marks) || 1,
        options: f.type === "MCQ" ? f.options : null,
      })),
      blankMarks,
      scratchpadMarks: qScratchpadRequired ? (parseFloat(qScratchpadMarks) || 0) : 0,
      maxMarks: calculatedTotalMarks,
      scratchpadRequired: qScratchpadRequired,
      hideVisual: Boolean(hideVisual),
      visualSpec: hideVisual
        ? null
        : qImageUrl
        ? {
            type: "CUSTOM_IMAGE",
            data: {
              url: qImageUrl,
              caption_bm: qImageCaptionBm,
              caption_en: qImageCaptionEn,
            },
          }
        : currentVisualSpec || null,
      customImage: hideVisual ? null : qImageUrl || null,
      explanation_bm: qExplBm,
      explanation_en: qExplEn,
    };
  }, [
    qDarjah,
    qTopicId,
    qSection,
    qStoryBm,
    qStoryEn,
    qPromptBm,
    qPromptEn,
    qInstructionsBm,
    qInstructionsEn,
    answerFields,
    blankMarks,
    qScratchpadRequired,
    qScratchpadMarks,
    calculatedTotalMarks,
    hideVisual,
    qImageUrl,
    qImageCaptionBm,
    qImageCaptionEn,
    currentVisualSpec,
    qExplBm,
    qExplEn,
    languageMode,
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl sm:max-w-5xl rounded-xl border-3 border-slate-900 bg-white p-3 sm:p-5 shadow-tactile space-y-4 max-h-[92vh] overflow-y-auto overflow-x-hidden min-w-0">
        {/* Header & Sub-Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-900 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 font-mono truncate">
              <span>✏️</span>
              <span className="truncate">
                {initialQuestion
                  ? languageMode === "EN"
                    ? "Edit Question & Answer Fields"
                    : "Edit Soalan & Ruang Jawapan"
                  : languageMode === "EN"
                  ? "Author New Question"
                  : "Cipta Soalan Baharu"}
              </span>
            </h4>
            <span className="rounded-lg border border-slate-900 bg-sky-200 px-2 py-0.5 font-mono text-xs font-black text-slate-950 shrink-0">
              {isPaperBuilder ? `Bahagian ${qSection}` : (languageMode === "EN" ? "Question Bank" : "Bank Soalan")}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle: Form vs Pratonton */}
            <div className="flex rounded-lg border-2 border-slate-900 bg-[#FAF6EE] p-0.5 shadow-tactile-sm">
              <button
                type="button"
                onClick={() => setActiveModalTab("EDITOR")}
                className={`rounded-md px-2.5 py-1 text-xs font-black transition-all ${
                  activeModalTab === "EDITOR"
                    ? "bg-amber-300 text-slate-950 shadow-sm"
                    : "text-slate-700 hover:text-slate-950"
                }`}
              >
                ✏️ {languageMode === "EN" ? "Editor" : "Editor"}
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("PREVIEW")}
                className={`rounded-md px-2.5 py-1 text-xs font-black transition-all ${
                  activeModalTab === "PREVIEW"
                    ? "bg-sky-400 text-slate-950 shadow-sm"
                    : "text-slate-700 hover:text-slate-950"
                }`}
              >
                👁️ {languageMode === "EN" ? "Preview" : "Pratonton"}
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg border-2 border-slate-900 bg-white p-1 hover:bg-rose-100"
              aria-label={languageMode === "EN" ? "Close" : "Tutup"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* TAB 1: QUESTION FORM EDITOR */}
        {activeModalTab === "EDITOR" && (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-bold min-w-0">
            {/* Section Presets & Classification */}
            <div className="rounded-xl border-2 border-slate-900 bg-[#FAF6EE] p-2.5 sm:p-3 space-y-2.5 overflow-hidden min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
                <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-slate-800 font-black font-mono shrink-0 text-xs">
                    {isPaperBuilder
                      ? languageMode === "EN"
                        ? "Exam Format:"
                        : "Format Peperiksaan:"
                      : languageMode === "EN"
                      ? "Format:"
                      : "Format:"}
                  </span>
                  <div className="grid grid-cols-3 sm:flex rounded-lg border-2 border-slate-900 bg-white p-0.5 shadow-tactile-sm w-full sm:w-auto min-w-0">
                    {[
                      {
                        id: "A",
                        label: isPaperBuilder
                          ? languageMode === "EN"
                            ? "Sec A"
                            : "Bhg A"
                          : languageMode === "EN"
                          ? "Objective"
                          : "Objektif",
                      },
                      {
                        id: "B",
                        label: isPaperBuilder
                          ? languageMode === "EN"
                            ? "Sec B"
                            : "Bhg B"
                          : languageMode === "EN"
                          ? "Equation"
                          : "Ayat Math",
                      },
                      {
                        id: "C",
                        label: isPaperBuilder
                          ? languageMode === "EN"
                            ? "Sec C"
                            : "Bhg C"
                          : languageMode === "EN"
                          ? "Story"
                          : "Cerita",
                      },
                    ].map((sec) => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => {
                          setQSection(sec.id);
                          if (sec.id === "B") applySectionBPreset();
                          if (sec.id === "C") applySectionCPreset();
                        }}
                        className={`rounded-md px-1 sm:px-2.5 py-1 text-[11px] sm:text-xs font-black transition-all text-center truncate ${
                          qSection === sec.id
                            ? "bg-amber-300 text-slate-950 shadow-sm"
                            : "text-slate-600 hover:text-slate-950"
                        }`}
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topic Practice Part Assignment (for Question Bank mode) */}
                {practiceParts && practiceParts.length > 0 && (
                  <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                    <span className="text-slate-800 font-black font-mono shrink-0 text-xs">
                      {languageMode === "EN" ? "Practice Part:" : "Bahagian Latihan:"}
                    </span>
                    <select
                      value={qPartId}
                      onChange={(e) => setQPartId(e.target.value)}
                      className="w-full sm:w-auto max-w-full min-w-0 truncate rounded-lg border-2 border-slate-900 bg-white px-2 py-1 text-xs font-black shadow-tactile-sm"
                    >
                      <option value="">
                        ⚪ {languageMode === "EN" ? "Unassigned" : "Belum Ditetapkan"}
                      </option>
                      {practiceParts.map((p, idx) => (
                        <option key={p.id || idx} value={p.id}>
                          📂 {languageMode === "EN" ? `Part ${p.partNo || idx + 1}:` : `Bahagian ${p.partNo || idx + 1}:`}{" "}
                          {p.title_bm.replace(/^(Bahagian|Part)\s*\d+\s*:\s*/i, "")}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Vertically Stacked Prompts & Story Problems (Figures 3, 4, 5) */}
            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-slate-800 font-black block">
                  {languageMode === "EN"
                    ? "Story Problem / Context (BM) - Optional:"
                    : "Petikan Cerita / Situasi Masalah (BM) - Pilihan:"}
                </label>
                <textarea
                  rows={2}
                  value={qStoryBm}
                  onChange={(e) => setQStoryBm(e.target.value)}
                  placeholder="Contoh: Pak Ali mempunyai 15 biji epal..."
                  className="w-full rounded-lg border-2 border-slate-900 bg-white p-2 text-xs font-bold shadow-tactile-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-800 font-black block">
                  {languageMode === "EN"
                    ? "Story Problem / Context (EN) - Optional:"
                    : "Petikan Cerita / Situasi Masalah (EN) - Pilihan:"}
                </label>
                <textarea
                  rows={2}
                  value={qStoryEn}
                  onChange={(e) => setQStoryEn(e.target.value)}
                  placeholder="Example: Pak Ali has 15 apples..."
                  className="w-full rounded-lg border-2 border-slate-900 bg-white p-2 text-xs font-bold shadow-tactile-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-800 font-black block">
                  {languageMode === "EN"
                    ? "Main Question Prompt (BM) *:"
                    : "Teks Soalan Utama (BM) *:"}
                </label>
                <textarea
                  rows={2}
                  value={qPromptBm}
                  onChange={(e) => setQPromptBm(e.target.value)}
                  placeholder="Contoh: Berapakah baki epal yang masih tinggal?"
                  className="w-full rounded-lg border-2 border-slate-900 bg-white p-2 text-xs font-bold shadow-tactile-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-800 font-black block">
                  {languageMode === "EN"
                    ? "Question Prompt (EN):"
                    : "Teks Soalan Utama (EN):"}
                </label>
                <textarea
                  rows={2}
                  value={qPromptEn}
                  onChange={(e) => setQPromptEn(e.target.value)}
                  placeholder="Example: How many apples does Pak Ali have left?"
                  className="w-full rounded-lg border-2 border-slate-900 bg-white p-2 text-xs font-bold shadow-tactile-sm"
                />
              </div>
            </div>

            {/* Figure Diagram / Image Upload */}
            <div className="rounded-xl border-2 border-slate-900 bg-[#FAF6EE] p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 font-mono">
                  <ImageIcon className="h-3.5 w-3.5 text-sky-700" />
                  <span>
                    {languageMode === "EN"
                      ? "Question Figure / Image Diagram"
                      : "Rajah Gambar Soalan"}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  {originalStandardVisual && (hideVisual || qImageUrl || (!currentVisualSpec && originalStandardVisual)) && (
                    <button
                      type="button"
                      onClick={handleRestoreDefaultFigure}
                      className="flex items-center gap-1 text-xs font-black text-sky-700 hover:underline"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>
                        {languageMode === "EN" ? "Restore Default Figure" : "Pulihkan Rajah Asal"}
                      </span>
                    </button>
                  )}
                  {!hideVisual && (qImageUrl || currentVisualSpec) && (
                    <button
                      type="button"
                      onClick={handleDeleteFigure}
                      className="text-xs font-black text-rose-600 hover:underline"
                    >
                      {languageMode === "EN" ? "Delete Figure" : "Padam Gambar"}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="btn-tactile flex cursor-pointer items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-white px-2.5 py-1 text-xs font-black text-slate-900 hover:bg-slate-50 shadow-tactile-sm">
                  <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                  <span>
                    {qImageUrl
                      ? languageMode === "EN"
                        ? "Change Image..."
                        : "Tukar Gambar..."
                      : languageMode === "EN"
                      ? "Upload Diagram..."
                      : "Muat Naik Gambar Rajah..."}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                <input
                  type="text"
                  placeholder={
                    languageMode === "EN"
                      ? "Figure caption..."
                      : "Keterangan rajah (Caption BM)..."
                  }
                  value={qImageCaptionBm}
                  onChange={(e) => setQImageCaptionBm(e.target.value)}
                  className="rounded-lg border-2 border-slate-900 bg-white px-2.5 py-1 text-xs font-bold shadow-tactile-sm w-full sm:flex-1 sm:min-w-[180px] max-w-full min-w-0"
                />
              </div>

              {/* Figure Preview Box */}
              {!hideVisual && (qImageUrl || currentVisualSpec) ? (
                <div className="rounded-lg border-2 border-slate-900 bg-white p-2 flex items-center justify-center max-h-44 overflow-hidden">
                  {qImageUrl ? (
                    <img
                      src={qImageUrl}
                      alt="Preview"
                      className="max-h-36 max-w-full object-contain rounded-md"
                    />
                  ) : currentVisualSpec ? (
                    <div className="max-h-36 flex items-center justify-center">
                      <QuestionVisualFigure visual={currentVisualSpec} languageMode={languageMode} />
                    </div>
                  ) : null}
                </div>
              ) : hideVisual ? (
                <div className="rounded-lg border border-dashed border-rose-300 bg-rose-50/60 p-2 text-center">
                  <p className="text-xs font-black text-rose-700">
                    {languageMode === "EN"
                      ? "Figure diagram deleted / hidden for this question."
                      : "Rajah gambar dipadam / disembunyikan untuk soalan ini."}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-2 text-center">
                  <p className="text-xs font-bold text-slate-400 italic">
                    {languageMode === "EN"
                      ? "No figure diagram for this question."
                      : "Tiada rajah gambar untuk soalan ini."}
                  </p>
                </div>
              )}
            </div>

            {/* ── MULTIPLE ANSWER FIELDS & MARKS ── */}
            <div className="rounded-xl border-2 border-slate-900 bg-white p-3 space-y-2.5 shadow-tactile-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-100 pb-2">
                <div>
                  <h5 className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                    🎯{" "}
                    {languageMode === "EN"
                      ? `Answer Fields (${answerFields.length} Fields • ${blankMarks}m Blanks + ${qScratchpadRequired ? qScratchpadMarks : 0}m Scratchpad = ${calculatedTotalMarks}m)`
                      : `Ruang Jawapan (${answerFields.length} Ruang • ${blankMarks}m Ruangan + ${qScratchpadRequired ? qScratchpadMarks : 0}m Conteng = ${calculatedTotalMarks}m)`}
                  </h5>
                  <p className="text-[11px] font-bold text-slate-500">
                    {languageMode === "EN"
                      ? "Supports multiple formats: numeric, text, MCQ, operator (+,−,×,÷), or multi-part equations."
                      : "Sokong pelbagai format: nombor, teks, MCQ, operator (+,−,×,÷), atau set ayat matematik."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => addAnswerField("NUMERIC")}
                    className="btn-tactile rounded-lg border-2 border-slate-900 bg-emerald-300 px-2 py-0.5 text-xs font-black text-slate-950 hover:bg-emerald-200 shadow-tactile-sm"
                  >
                    + {languageMode === "EN" ? "Number" : "Nombor"}
                  </button>
                  <button
                    type="button"
                    onClick={() => addAnswerField("TEXT")}
                    className="btn-tactile rounded-lg border-2 border-slate-900 bg-teal-200 px-2 py-0.5 text-xs font-black text-slate-950 hover:bg-teal-100 shadow-tactile-sm"
                  >
                    + {languageMode === "EN" ? "Text" : "Teks"}
                  </button>
                  <button
                    type="button"
                    onClick={() => addAnswerField("MCQ")}
                    className="btn-tactile rounded-lg border-2 border-slate-900 bg-amber-200 px-2 py-0.5 text-xs font-black text-slate-950 hover:bg-amber-100 shadow-tactile-sm"
                  >
                    + MCQ
                  </button>
                  <button
                    type="button"
                    onClick={() => addAnswerField("OPERATOR")}
                    className="btn-tactile rounded-lg border-2 border-slate-900 bg-sky-200 px-2 py-0.5 text-xs font-black text-slate-950 hover:bg-sky-100 shadow-tactile-sm"
                  >
                    + Operator
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {answerFields.map((field, fIdx) => (
                  <div
                    key={field.id}
                    className="rounded-lg border-2 border-slate-900 bg-[#FAF6EE] p-2.5 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-1">
                      <span className="font-mono text-xs font-black text-slate-900">
                        {languageMode === "EN" ? `Field ${fIdx + 1}` : `Ruang ${fIdx + 1}`} ({field.type})
                      </span>

                      <button
                        type="button"
                        onClick={() => removeAnswerField(field.id)}
                        className="text-rose-600 hover:text-rose-800 text-xs font-black font-mono"
                      >
                        {languageMode === "EN" ? "Delete Field" : "Padam Ruang"}
                      </button>
                    </div>

                    {field.type === "TEXT" ? (
                      <div className="space-y-2">
                        {/* Line 1: Field Label (Prompt), Type Selector, and Marks */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-6 space-y-0.5">
                            <label className="text-[11px] font-black text-slate-700">
                              {languageMode === "EN" ? "Field Label / Prompt" : "Label / Prompt Ruang"}
                            </label>
                            <input
                              type="text"
                              value={field.label_bm}
                              onChange={(e) => updateFieldProperty(field.id, "label_bm", e.target.value)}
                              placeholder={languageMode === "EN" ? "e.g. (a) 8.00 am" : "cth: (a) 8.00 am"}
                              className="w-full max-w-full min-w-0 truncate rounded-lg border-2 border-slate-900 bg-white px-2 py-1 text-xs font-bold shadow-tactile-sm"
                            />
                          </div>

                          <div className="sm:col-span-4 space-y-0.5">
                            <label className="text-[11px] font-black text-slate-700">
                              {languageMode === "EN" ? "Type" : "Jenis"}
                            </label>
                            <select
                              value={field.type}
                              onChange={(e) => {
                                const newType = e.target.value;
                                updateFieldProperty(field.id, "type", newType);
                                if (newType === "MCQ" && (!field.expectedAnswer || field.expectedAnswer === "")) {
                                  updateFieldProperty(field.id, "expectedAnswer", "A");
                                }
                              }}
                              className="w-full max-w-full min-w-0 truncate rounded-lg border-2 border-slate-900 bg-white px-2 py-1 text-xs font-bold shadow-tactile-sm"
                            >
                              <option value="NUMERIC">{languageMode === "EN" ? "Numeric" : "Nombor (Numeric)"}</option>
                              <option value="TEXT">{languageMode === "EN" ? "Text / Words" : "Teks / Perkataan"}</option>
                              <option value="MCQ">{languageMode === "EN" ? "MCQ" : "Pelbagai Pilihan (MCQ)"}</option>
                              <option value="OPERATOR">{languageMode === "EN" ? "Operator (+,−,×,÷)" : "Operator (+,−,×,÷)"}</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2 space-y-0.5">
                            <label className="text-[11px] font-black text-slate-700 text-center block">
                              {languageMode === "EN" ? "Marks" : "Markah"}
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min={0}
                              max={10}
                              value={field.marks}
                              onChange={(e) =>
                                updateFieldProperty(field.id, "marks", parseFloat(e.target.value) || 0)
                              }
                              className="w-full rounded-lg border-2 border-slate-900 bg-white px-1.5 py-1 text-xs font-mono font-black shadow-tactile-sm text-center"
                            />
                          </div>
                        </div>

                        {/* Line 2: Dedicated 1 Full Line for Text Expected Answer */}
                        <div className="space-y-0.5 rounded-lg border border-slate-300 bg-white/70 p-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-black text-slate-700">
                              📝 {languageMode === "EN" ? "Expected Answer (Text / Words):" : "Jawapan Betul (Teks / Perkataan):"}
                            </label>
                            <span className="text-[10px] font-bold text-slate-500 font-mono">
                              {languageMode === "EN" ? "1-line full width text input" : "Ruang penuh 1 baris untuk teks jawapan"}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={field.expectedAnswer}
                            onChange={(e) => updateFieldProperty(field.id, "expectedAnswer", e.target.value)}
                            placeholder={
                              languageMode === "EN"
                                ? "Enter expected text / words (e.g. eight o'clock in the morning)..."
                                : "Masukkan teks jawapan penuh (contoh: jam lapan pagi tepat)..."
                            }
                            className="w-full rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-bold shadow-tactile-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-5 space-y-0.5">
                          <label className="text-[11px] font-black text-slate-700">
                            {languageMode === "EN" ? "Field Label" : "Label / Prompt Ruang"}
                          </label>
                          <input
                            type="text"
                            value={field.label_bm}
                            onChange={(e) => updateFieldProperty(field.id, "label_bm", e.target.value)}
                            placeholder="e.g. (a) Jawapan Akhir"
                            className="w-full rounded-lg border-2 border-slate-900 bg-white px-2 py-1 text-xs font-bold shadow-tactile-sm"
                          />
                        </div>

                        <div className="sm:col-span-3 space-y-0.5">
                          <label className="text-[11px] font-black text-slate-700">
                            {languageMode === "EN" ? "Type" : "Jenis"}
                          </label>
                          <select
                            value={field.type}
                            onChange={(e) => {
                              const newType = e.target.value;
                              updateFieldProperty(field.id, "type", newType);
                              if (newType === "MCQ" && (!field.expectedAnswer || field.expectedAnswer === "")) {
                                updateFieldProperty(field.id, "expectedAnswer", "A");
                              }
                            }}
                            className="w-full rounded-lg border-2 border-slate-900 bg-white px-2 py-1 text-xs font-bold shadow-tactile-sm"
                          >
                            <option value="NUMERIC">{languageMode === "EN" ? "Numeric" : "Nombor (Numeric)"}</option>
                            <option value="TEXT">{languageMode === "EN" ? "Text / Words" : "Teks / Perkataan"}</option>
                            <option value="MCQ">{languageMode === "EN" ? "MCQ" : "Pelbagai Pilihan (MCQ)"}</option>
                            <option value="OPERATOR">{languageMode === "EN" ? "Operator (+,−,×,÷)" : "Operator (+,−,×,÷)"}</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2 space-y-0.5">
                          <label className="text-[11px] font-black text-slate-700">
                            {languageMode === "EN" ? "Expected" : "Jawapan Betul"}
                          </label>
                          {field.type === "OPERATOR" ? (
                            <select
                              value={field.expectedOp || "+"}
                              onChange={(e) => updateFieldProperty(field.id, "expectedOp", e.target.value)}
                              className="w-full max-w-full min-w-0 truncate rounded-lg border-2 border-slate-900 bg-white px-2 py-1 text-xs font-black shadow-tactile-sm font-mono"
                            >
                              <option value="+">+</option>
                              <option value="−">−</option>
                              <option value="×">×</option>
                              <option value="÷">÷</option>
                            </select>
                          ) : field.type === "MCQ" ? (
                            <select
                              value={
                                (field.options || []).find(
                                  (o) =>
                                    String(o.value).toUpperCase() === String(field.expectedAnswer || "").trim().toUpperCase() ||
                                    String(o.label_bm || "").trim().toLowerCase() === String(field.expectedAnswer || "").trim().toLowerCase()
                                )?.value || field.expectedAnswer || "A"
                              }
                              onChange={(e) => updateFieldProperty(field.id, "expectedAnswer", e.target.value)}
                              className="w-full max-w-full min-w-0 truncate rounded-lg border-2 border-slate-900 bg-amber-100 px-2 py-1 text-xs font-black shadow-tactile-sm font-mono"
                            >
                              {(field.options || []).map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.value}: {opt.label_bm ? (opt.label_bm.length > 20 ? opt.label_bm.substring(0, 20) + "…" : opt.label_bm) : `Option ${opt.value}`}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={field.expectedAnswer}
                              onChange={(e) => updateFieldProperty(field.id, "expectedAnswer", e.target.value)}
                              placeholder={languageMode === "EN" ? "Answer..." : "Jawapan..."}
                              className="w-full rounded-lg border-2 border-slate-900 bg-white px-2 py-1 text-xs font-black shadow-tactile-sm"
                            />
                          )}
                        </div>

                        {/* Decimal marks allowed (step="0.5", min="0") */}
                        <div className="sm:col-span-2 space-y-0.5">
                          <label className="text-[11px] font-black text-slate-700 text-center block">
                            {languageMode === "EN" ? "Marks" : "Markah"}
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min={0}
                            max={10}
                            value={field.marks}
                            onChange={(e) =>
                              updateFieldProperty(field.id, "marks", parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded-lg border-2 border-slate-900 bg-white px-1.5 py-1 text-xs font-mono font-black shadow-tactile-sm text-center"
                          />
                        </div>
                      </div>
                    )}

                    {/* MCQ Options Configuration */}
                    {field.type === "MCQ" && (
                      <div className="mt-1.5 space-y-1 border-t border-slate-300 pt-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-slate-700 font-mono">
                            {languageMode === "EN" ? "MCQ Options:" : "Pilihan Jawapan MCQ:"}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 font-mono">
                            {languageMode === "EN"
                              ? "Click letter or use dropdown above to set correct answer"
                              : "Klik huruf atau guna dropdown di atas untuk tetapkan jawapan"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(field.options || []).map((opt, oIdx) => {
                            const isExpected =
                              String(field.expectedAnswer || "").trim().toUpperCase() === String(opt.value).toUpperCase() ||
                              String(field.expectedAnswer || "").trim().toLowerCase() === String(opt.label_bm || "").trim().toLowerCase();
                            return (
                              <div
                                key={oIdx}
                                className={`flex items-center gap-1.5 rounded-lg border p-1 transition-all ${
                                  isExpected
                                    ? "border-amber-500 bg-amber-50 ring-1 ring-amber-400"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                <button
                                  type="button"
                                  title={languageMode === "EN" ? "Click to set as correct answer" : "Klik untuk pilih sebagai jawapan betul"}
                                  onClick={() => updateFieldProperty(field.id, "expectedAnswer", opt.value)}
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[11px] font-black border transition-all ${
                                    isExpected
                                      ? "bg-amber-400 text-slate-950 border-slate-900 shadow-sm"
                                      : "bg-slate-100 text-slate-700 border-slate-400 hover:bg-amber-200"
                                  }`}
                                >
                                  {opt.value}
                                </button>
                                <input
                                  type="text"
                                  value={opt.label_bm}
                                  onChange={(e) => {
                                    const nextOpts = [...field.options];
                                    nextOpts[oIdx] = { ...opt, label_bm: e.target.value, label_en: e.target.value };
                                    updateFieldProperty(field.id, "options", nextOpts);
                                  }}
                                  className="w-full rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold"
                                />
                                {isExpected && (
                                  <span className="shrink-0 text-[10px] font-black text-amber-800 bg-amber-200 px-1 rounded font-mono">
                                    ✓
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── KERTAS CONTENG & SPLIT MARKS (Supports decimal marks) ── */}
            <div className="rounded-xl border-2 border-slate-900 bg-[#FAF6EE] p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-black text-slate-800">
                  <input
                    type="checkbox"
                    checked={qScratchpadRequired}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setQScratchpadRequired(isChecked);
                      setAnswerFields((prev) =>
                        prev.map((f) => ({
                          ...f,
                          scratchpadRequired: isChecked ? Boolean(f.scratchpadRequired ?? true) : false,
                        }))
                      );
                    }}
                    className="rounded border-slate-900"
                  />
                  <span>
                    {languageMode === "EN"
                      ? "Scratchpad Working Required"
                      : "Wajibkan Lakaran Kertas Conteng (Scratchpad Required)"}
                  </span>
                </label>

                {qScratchpadRequired && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      {languageMode === "EN" ? "Scratchpad Marks:" : "Peruntukan Markah Contengan:"}
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={10}
                      value={qScratchpadMarks}
                      onChange={(e) => setQScratchpadMarks(parseFloat(e.target.value) || 0)}
                      className="w-16 rounded-lg border-2 border-slate-900 bg-white p-1 text-center font-mono font-black"
                    />
                    <span className="text-xs font-bold text-slate-600 font-mono">
                      {languageMode === "EN" ? "Marks" : "Markah"}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-300 pt-1.5 flex flex-wrap items-center justify-between text-xs font-black text-slate-900">
                <span className="font-mono">
                  {languageMode === "EN" ? "Total Question Allocation:" : "Peruntukan Markah Soalan:"}
                </span>
                <span className="font-mono text-emerald-800">
                  {languageMode === "EN"
                    ? `Fields: ${blankMarks}m + Scratchpad: ${qScratchpadRequired ? qScratchpadMarks : 0}m = ${calculatedTotalMarks} Marks Total`
                    : `Ruang Jawapan: ${blankMarks}m + Contengan: ${qScratchpadRequired ? qScratchpadMarks : 0}m = ${calculatedTotalMarks} Markah Keseluruhan`}
                </span>
              </div>
            </div>

            {/* Explanation / Notes */}
            <div className="space-y-1">
              <label className="text-slate-700 font-bold block">
                {languageMode === "EN"
                  ? "Explanation / Working Steps (BM):"
                  : "Penerangan / Langkah Pengiraan (BM):"}
              </label>
              <textarea
                rows={2}
                value={qExplBm}
                onChange={(e) => setQExplBm(e.target.value)}
                placeholder={
                  languageMode === "EN"
                    ? "Step by step guidance..."
                    : "Langkah penyelesaian untuk bimbingan guru/murid..."
                }
                className="w-full rounded-lg border-2 border-slate-900 bg-white p-2 text-xs font-bold shadow-tactile-sm"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-t-2 border-slate-900 pt-2.5">
              <button
                type="button"
                onClick={() => setActiveModalTab("PREVIEW")}
                className="btn-tactile flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-amber-200 shadow-tactile-sm"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>
                  {languageMode === "EN" ? "Student Preview" : "Pratonton Paparan Murid"}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-tactile rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-700"
                >
                  {languageMode === "EN" ? "Cancel" : "Batal"}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-tactile flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-emerald-400 px-4 py-1.5 text-xs font-black text-slate-950 hover:bg-emerald-300 shadow-tactile-sm disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    {isSaving
                      ? languageMode === "EN"
                        ? "Saving..."
                        : "Menyimpan..."
                      : languageMode === "EN"
                      ? "Save Question"
                      : "Simpan Soalan"}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: EMBEDDED LIVE PREVIEW & MARKING RUBRIC (FIGURE 1) */}
        {activeModalTab === "PREVIEW" && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
              <span className="font-mono text-xs font-black text-sky-950 uppercase">
                👁️{" "}
                {languageMode === "EN"
                  ? "Interactive Student View & Tutor Rubric:"
                  : "Paparan Murid Interaktif & Skema Pemarkahan Guru:"}
              </span>
              <span className="font-mono text-xs font-black text-slate-700">
                {languageMode === "EN"
                  ? `Total: ${calculatedTotalMarks} Marks (${blankMarks}m Blanks + ${qScratchpadRequired ? qScratchpadMarks : 0}m Scratchpad)`
                  : `Jumlah: ${calculatedTotalMarks} Markah (${blankMarks}m Ruangan + ${qScratchpadRequired ? qScratchpadMarks : 0}m Conteng)`}
              </span>
            </div>

            {/* Question Story / Prompt */}
            {(previewQuestionObj.story_bm || previewQuestionObj.story_en) && (
              <div className="rounded-xl border-2 border-slate-900 bg-[#FAF6EE] p-3 text-xs sm:text-sm font-bold text-slate-800 leading-relaxed shadow-tactile-sm">
                <p>📖 {previewQuestionObj.story_bm}</p>
                {previewQuestionObj.story_en && (
                  <p className="mt-1 text-xs italic text-slate-500 font-semibold">{previewQuestionObj.story_en}</p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <p className="text-sm sm:text-base font-black text-slate-900">
                {previewQuestionObj.prompt_bm}
              </p>
              {previewQuestionObj.prompt_en && (
                <p className="text-xs italic font-bold text-slate-500">{previewQuestionObj.prompt_en}</p>
              )}
            </div>

            {/* Visual Diagram */}
            {previewQuestionObj.visualSpec && (
              <div className="my-2.5 flex flex-col items-center justify-center rounded-xl border-2 border-slate-900 bg-[#FAF6EE] p-2.5 min-h-[120px] max-h-56 overflow-hidden">
                <QuestionVisualFigure visual={previewQuestionObj.visualSpec} languageMode={languageMode} />
              </div>
            )}

            {/* Student View Interactive Answer Fields */}
            <div className="rounded-xl border-2 border-dashed border-sky-400 bg-sky-50/50 p-3 space-y-2.5">
              <span className="font-mono text-xs font-black text-sky-900 block">
                {languageMode === "EN" ? "Student Answer Fields:" : "Ruangan Jawapan Murid:"}
              </span>

              {previewQuestionObj.answerFields.map((field, idx) => {
                const isMcq = field.type === "MCQ" && Array.isArray(field.options) && field.options.length > 0;
                const isOp = field.type === "OPERATOR";

                return (
                  <div key={field.id || idx} className="rounded-xl border-2 border-slate-900 bg-white p-3 sm:p-4 shadow-tactile-sm space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 border-b border-slate-100 pb-1.5 text-xs sm:text-sm font-black">
                      <span className="text-slate-900 leading-snug flex-1">
                        {field.label_bm || (languageMode === "EN" ? `Answer Field ${idx + 1}` : `Ruang Jawapan ${idx + 1}`)}
                      </span>
                      <span className="font-mono text-xs font-black text-slate-600 rounded bg-slate-100 px-2.5 py-0.5 border border-slate-300 shrink-0 self-start sm:self-auto">
                        {field.marks || 1}m
                      </span>
                    </div>

                    {isMcq ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                        {(field.options || []).map((opt, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-lg border-2 border-slate-900 bg-white p-2 text-xs font-bold shadow-tactile-sm"
                          >
                            <span className="h-5 w-5 rounded-md border-2 border-slate-900 bg-sky-200 flex items-center justify-center font-mono font-black text-[11px]">
                              {opt.value}
                            </span>
                            <span>{opt.label_bm}</span>
                          </div>
                        ))}
                      </div>
                    ) : isOp ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        {["+", "−", "×", "÷"].map((op) => (
                          <span
                            key={op}
                            className="h-8 w-10 rounded-lg border-2 border-slate-900 bg-white flex items-center justify-center font-mono text-sm font-black shadow-tactile-sm"
                          >
                            {op}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap items-center gap-2.5">
                        <input
                          type="text"
                          readOnly
                          placeholder={
                            field.type === "TEXT"
                              ? languageMode === "EN"
                                ? "Enter text in words..."
                                : "Tulis perkataan..."
                              : languageMode === "EN"
                              ? "Enter number..."
                              : "Tulis nombor..."
                          }
                          className={`w-full sm:w-auto rounded-xl border-2 border-slate-900 bg-[#FAF6EE] px-3.5 py-2 font-mono text-xs sm:text-sm font-black shadow-tactile-sm cursor-default ${
                            field.type === "TEXT" ? "sm:min-w-[340px] md:min-w-[440px]" : "sm:min-w-[200px]"
                          }`}
                        />
                        {Boolean(previewQuestionObj.scratchpadRequired && field.scratchpadRequired) && (
                          <span className="text-xs font-black text-amber-800 bg-amber-100 border border-amber-400 rounded-lg px-2.5 py-1">
                            ✏️ {languageMode === "EN" ? "Scratchpad Required" : "Kertas Conteng Diwajibkan"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {previewQuestionObj.scratchpadRequired && (
                <div className="rounded-lg border-2 border-amber-600 bg-amber-100 p-2 text-xs font-black text-amber-950 flex items-center justify-between">
                  <span>
                    ✏️{" "}
                    {languageMode === "EN"
                      ? "Scratchpad Required for this question"
                      : "Kertas Conteng Diwajibkan bagi soalan ini"}
                  </span>
                  <span className="font-mono">
                    {languageMode === "EN" ? "Allocation:" : "Peruntukan:"} {qScratchpadMarks}{" "}
                    {languageMode === "EN" ? "Marks" : "Markah"}
                  </span>
                </div>
              )}
            </div>

            {/* Marking Rubric (Figure 1) */}
            <div className="rounded-xl border-2 border-slate-900 bg-amber-100/70 p-3 space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between border-b-2 border-amber-900/20 pb-1">
                <span className="font-black text-amber-950 uppercase tracking-wide">
                  🔒 {languageMode === "EN" ? "Tutor Marking Rubric" : "Skema Pemarkahan Guru"}
                </span>
                <span className="font-bold text-amber-900">
                  {languageMode === "EN" ? "Total:" : "Jumlah:"} {calculatedTotalMarks}m
                </span>
              </div>

              <div className="space-y-1">
                {previewQuestionObj.answerFields.map((f, i) => (
                  <div key={f.id || i} className="flex items-center justify-between gap-2 border-b border-amber-900/10 pb-0.5">
                    <span className="font-bold text-amber-950">
                      {f.label_bm || (languageMode === "EN" ? `Field ${i + 1}` : `Ruang ${i + 1}`)}:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-emerald-200 border border-emerald-600 px-1.5 py-0.2 font-black text-emerald-950 font-mono">
                        {f.type === "OPERATOR"
                          ? (f.expectedOp || "+")
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

                {previewQuestionObj.scratchpadRequired && (
                  <div className="flex items-center justify-between gap-2 border-b border-amber-900/10 pb-0.5">
                    <span className="font-bold text-amber-950">
                      {languageMode === "EN"
                        ? "Scratchpad Working Steps:"
                        : "Lakaran Kertas Conteng (Langkah Kerja):"}
                    </span>
                    <span className="text-amber-800 font-bold">({qScratchpadMarks}m)</span>
                  </div>
                )}
              </div>

              {previewQuestionObj.explanation_bm && (
                <div className="pt-1 text-slate-700 font-sans font-bold text-xs">
                  <span className="text-amber-950 font-black">
                    {languageMode === "EN" ? "Explanation: " : "Penerangan: "}
                  </span>
                  <span>{previewQuestionObj.explanation_bm}</span>
                </div>
              )}
            </div>

            {/* Back to Edit Button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setActiveModalTab("EDITOR")}
                className="btn-tactile rounded-lg border-2 border-slate-900 bg-sky-300 px-3.5 py-1.5 text-xs font-black text-slate-950 hover:bg-sky-200 shadow-tactile-sm"
              >
                {languageMode === "EN" ? "Back to Editor" : "Kembali ke Editor Soalan"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
