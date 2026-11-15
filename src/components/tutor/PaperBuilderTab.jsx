// src/components/tutor/PaperBuilderTab.jsx
import { useState, useEffect, useMemo } from "react";
import { getTopicsByDarjah } from "../../engine/syllabusConfig.js";
import { getAllBankQuestions } from "../../services/storageService.js";
import { normalizeQuestionFields } from "../../engine/questionGenerator.js";
import {
  FilePlus,
  BookOpen,
  Save,
  Rocket,
  X,
  Eye,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import QuestionPreviewModal from "./QuestionPreviewModal.jsx";
import QuestionEditorModal from "./QuestionEditorModal.jsx";
import { toast, confirmAction } from "../ui/toast.js";

export default function PaperBuilderTab({
  db,
  selectedDarjah = 1,
  languageMode = "BM",
  onSaveExamPaper,
  onPublishExamPaper,
}) {
  const [pbDarjah, setPbDarjah] = useState(() => Number(selectedDarjah || 1));
  const [targetStudentId, setTargetStudentId] = useState("DEFAULT");
  const [sectionFilter, setSectionFilter] = useState("ALL"); // "ALL" | "A" | "B" | "C"

  const activeStudents = useMemo(() => {
    return (db?.users || []).filter((u) => u.role === "STUDENT" && u.status === "Active");
  }, [db?.users]);

  const currentPaper = useMemo(() => {
    if (targetStudentId && targetStudentId !== "DEFAULT") {
      return db?.studentExamPapers?.[`${pbDarjah}_${targetStudentId}`] || null;
    }
    return db?.examPapers?.[pbDarjah] || null;
  }, [db?.studentExamPapers, db?.examPapers, pbDarjah, targetStudentId]);

  const [paperTitleBm, setPaperTitleBm] = useState(
    () => currentPaper?.title_bm || `Kertas Peperiksaan Akhir Tahun ${selectedDarjah || 1}`
  );
  const [paperTitleEn, setPaperTitleEn] = useState(
    () => currentPaper?.title_en || `Year ${selectedDarjah || 1} Final Examination Paper`
  );
  const [builderQuestions, setBuilderQuestions] = useState(() =>
    Array.isArray(currentPaper?.questions) ? currentPaper.questions : []
  );
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [editingPaperQuestion, setEditingPaperQuestion] = useState(null);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [isChooseFromBankOpen, setIsChooseFromBankOpen] = useState(false);
  const [selectedBankIds, setSelectedBankIds] = useState([]);
  const [bankTopicFilter, setBankTopicFilter] = useState("ALL");
  const [bankSourceFilter, setBankSourceFilter] = useState("ALL");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Sync questions and title when switching pbDarjah or targetStudentId
  useEffect(() => {
    let paper = null;
    if (targetStudentId && targetStudentId !== "DEFAULT") {
      const key = `${pbDarjah}_${targetStudentId}`;
      paper = db?.studentExamPapers?.[key] || db?.examPapers?.[pbDarjah];
    } else {
      paper = db?.examPapers?.[pbDarjah];
    }
    setBuilderQuestions(Array.isArray(paper?.questions) ? paper.questions : []);
    const targetStudent = activeStudents.find((s) => s.id === targetStudentId);
    const suffix = targetStudent ? ` (${targetStudent.name})` : "";
    setPaperTitleBm(paper?.title_bm || `Kertas Peperiksaan Akhir Tahun ${pbDarjah}${suffix}`);
    setPaperTitleEn(paper?.title_en || `Year ${pbDarjah} Final Examination Paper${suffix}`);
  }, [pbDarjah, targetStudentId, db?.examPapers, db?.studentExamPapers, activeStudents]);

  const topics = getTopicsByDarjah(pbDarjah) || [];

  // Section Counts & Total Marks Calculation (supports decimal marks 0.5, 1.5, 2.5, 3.5)
  const secAQuestions = useMemo(
    () => (builderQuestions || []).filter((q) => q && (q.section || "A") === "A"),
    [builderQuestions]
  );
  const secBQuestions = useMemo(
    () => (builderQuestions || []).filter((q) => q && q.section === "B"),
    [builderQuestions]
  );
  const secCQuestions = useMemo(
    () => (builderQuestions || []).filter((q) => q && q.section === "C"),
    [builderQuestions]
  );

  const marksA = parseFloat(
    secAQuestions.reduce((s, q) => s + (parseFloat(q?.maxMarks) || 1), 0).toFixed(1)
  );
  const marksB = parseFloat(
    secBQuestions.reduce((s, q) => s + (parseFloat(q?.maxMarks) || 1), 0).toFixed(1)
  );
  const marksC = parseFloat(
    secCQuestions.reduce((s, q) => s + (parseFloat(q?.maxMarks) || 1), 0).toFixed(1)
  );
  const totalPaperMarks = parseFloat((marksA + marksB + marksC).toFixed(1));

  // Filter questions for display
  const displayedQuestions = useMemo(() => {
    if (sectionFilter === "ALL") return builderQuestions;
    return (builderQuestions || []).filter((q) => (q.section || "A") === sectionFilter);
  }, [builderQuestions, sectionFilter]);

  // Bank Questions Available to Pick From
  const availableBankQuestions = useMemo(() => {
    const list = getAllBankQuestions(
      db,
      pbDarjah,
      bankTopicFilter === "ALL" ? null : bankTopicFilter
    ) || [];
    if (bankSourceFilter === "ALL") return list;
    if (bankSourceFilter === "STANDARD") return list.filter((q) => q && q.source === "STANDARD");
    return list.filter((q) => q && q.source === "CUSTOM");
  }, [db, pbDarjah, bankTopicFilter, bankSourceFilter]);

  // Add selected questions from Bank (creates paper-local copies)
  const handleAddSelectedFromBank = () => {
    if (selectedBankIds.length === 0) return;
    const allBank = getAllBankQuestions(db, pbDarjah) || [];
    const selectedItems = allBank.filter((q) => q && selectedBankIds.includes(q.id));

    // Deep clone to ensure paper-local isolation
    const newItems = selectedItems.map((q, idx) => {
      const norm = normalizeQuestionFields(JSON.parse(JSON.stringify(q)));
      return {
        ...norm,
        id: `paper_q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        originalBankId: q.id,
        section: norm.section || (norm.answerFields?.length > 1 ? "B" : "A"),
        maxMarks: parseFloat(norm.maxMarks) || 1,
        questionNo: builderQuestions.length + idx + 1,
      };
    });

    const updated = [...builderQuestions, ...newItems].map((q, idx) => ({
      ...q,
      questionNo: idx + 1,
    }));
    setBuilderQuestions(updated);
    setSelectedBankIds([]);
    setIsChooseFromBankOpen(false);
    toast.success(
      languageMode === "EN"
        ? `${newItems.length} question(s) added to exam paper.`
        : `${newItems.length} soalan berjaya ditambah ke kertas peperiksaan.`
    );
  };

  // Reorder Questions
  const moveQuestion = (realIdx, direction) => {
    const targetIdx = realIdx + direction;
    if (targetIdx < 0 || targetIdx >= builderQuestions.length) return;
    const nextList = [...builderQuestions];
    const [moved] = nextList.splice(realIdx, 1);
    nextList.splice(targetIdx, 0, moved);
    setBuilderQuestions(nextList.map((q, idx) => ({ ...q, questionNo: idx + 1 })));
  };

  // Remove Question from Paper with tactile confirmation
  const removeQuestionFromPaper = (realIdx) => {
    confirmAction({
      title: languageMode === "EN" ? "Remove Question?" : "Keluarkan Soalan?",
      message: languageMode === "EN"
        ? `Remove Question ${realIdx + 1} from this exam paper?`
        : `Keluarkan Soalan ${realIdx + 1} daripada kertas peperiksaan ini?`,
      confirmText: languageMode === "EN" ? "Remove" : "Keluarkan",
      cancelText: languageMode === "EN" ? "Cancel" : "Batal",
      danger: true,
      onConfirm: () => {
        const nextList = builderQuestions.filter((_, idx) => idx !== realIdx);
        setBuilderQuestions(nextList.map((q, idx) => ({ ...q, questionNo: idx + 1 })));
        toast.info(
          languageMode === "EN"
            ? "Question removed from paper."
            : "Soalan dikeluarkan daripada kertas."
        );
      },
    });
  };

  // Change Question Section
  const changeQuestionSection = (realIdx, newSection) => {
    const nextList = [...builderQuestions];
    nextList[realIdx] = { ...nextList[realIdx], section: newSection };
    setBuilderQuestions(nextList);
    toast.info(
      languageMode === "EN"
        ? `Question moved to Section ${newSection}.`
        : `Soalan dialihkan ke Bahagian ${newSection}.`
    );
  };

  // Handle save from unified QuestionEditorModal
  const handleSaveQuestionFromEditor = (payload) => {
    if (editingPaperQuestion && editingPaperQuestion.realIdx !== undefined) {
      const idx = editingPaperQuestion.realIdx;
      const nextList = [...builderQuestions];
      nextList[idx] = {
        ...payload,
        section: payload.section || editingPaperQuestion.section || "A",
        maxMarks: parseFloat(payload.maxMarks) || 1,
        questionNo: idx + 1,
      };
      setBuilderQuestions(nextList);
      toast.success(
        languageMode === "EN"
          ? "Exam paper question updated."
          : "Soalan kertas peperiksaan berjaya dikemas kini."
      );
    } else {
      const item = {
        ...payload,
        section: payload.section || "A",
        maxMarks: parseFloat(payload.maxMarks) || 1,
        questionNo: builderQuestions.length + 1,
      };
      setBuilderQuestions([...builderQuestions, item]);
      toast.success(
        languageMode === "EN"
          ? "New question added to exam paper."
          : "Soalan baharu ditambah ke kertas peperiksaan."
      );
    }
    setIsEditorModalOpen(false);
    setEditingPaperQuestion(null);
  };

  // Save Draft Paper
  const handleSaveDraft = async () => {
    if (isSavingDraft || isPublishing) return;
    setIsSavingDraft(true);
    try {
      const paperPayload = {
        id: currentPaper?.id || `paper_d${pbDarjah}_${targetStudentId}_custom`,
        darjah: Number(pbDarjah),
        targetStudentId: targetStudentId || "DEFAULT",
        title_bm: paperTitleBm.trim(),
        title_en: paperTitleEn.trim(),
        status: "DRAFT",
        questions: builderQuestions,
        totalQuestions: builderQuestions.length,
        totalMarks: totalPaperMarks,
      };
      await onSaveExamPaper(pbDarjah, paperPayload, targetStudentId);
      toast.success(
        languageMode === "EN"
          ? "Exam paper draft saved successfully!"
          : "Draf kertas peperiksaan berjaya disimpan!"
      );
    } catch (err) {
      console.error("Failed to save draft:", err);
      toast.error(
        languageMode === "EN" ? "Failed to save draft." : "Gagal menyimpan draf."
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Publish Paper
  const handlePublish = () => {
    if (isSavingDraft || isPublishing) return;
    if (builderQuestions.length === 0) {
      toast.warning(
        languageMode === "EN"
          ? "Cannot publish empty paper. Add at least 1 question."
          : "Kertas peperiksaan mesti mengandungi sekurang-kurangnya 1 soalan sebelum diterbitkan."
      );
      return;
    }
    if (totalPaperMarks <= 0) {
      toast.warning(
        languageMode === "EN"
          ? "Total paper marks must be greater than 0."
          : "Jumlah markah kertas peperiksaan mestilah lebih daripada 0."
      );
      return;
    }

    const targetStudent = activeStudents.find((s) => s.id === targetStudentId);
    const targetLabel = targetStudent
      ? `${targetStudent.name} (${languageMode === "EN" ? "Personalized" : "Khusus"})`
      : languageMode === "EN"
      ? "All Students (Default)"
      : "Semua Murid (Asal)";

    confirmAction({
      title: languageMode === "EN" ? "Publish Exam Paper?" : "Terbitkan Kertas Peperiksaan?",
      message:
        languageMode === "EN"
          ? `Publish Year ${pbDarjah} Final Exam Paper for ${targetLabel} (${builderQuestions.length} Questions, ${totalPaperMarks} Marks)? Students with completed practice will be able to sit for this exam.`
          : `Terbitkan Kertas Peperiksaan Akhir Tahun ${pbDarjah} untuk ${targetLabel} (${builderQuestions.length} Soalan, ${totalPaperMarks} Markah)? Murid yang telah menamatkan latihan topik akan dapat menduduki peperiksaan ini.`,
      confirmText: languageMode === "EN" ? "Publish Now" : "Terbitkan Sekarang",
      cancelText: languageMode === "EN" ? "Cancel" : "Batal",
      danger: false,
      onConfirm: async () => {
        setIsPublishing(true);
        try {
          const paperPayload = {
            id: currentPaper?.id || `paper_d${pbDarjah}_${targetStudentId}_published`,
            darjah: Number(pbDarjah),
            targetStudentId: targetStudentId || "DEFAULT",
            title_bm: paperTitleBm.trim(),
            title_en: paperTitleEn.trim(),
            status: "PUBLISHED",
            publishedAt: new Date().toISOString(),
            questions: builderQuestions,
            totalQuestions: builderQuestions.length,
            totalMarks: totalPaperMarks,
          };
          const res = await onPublishExamPaper(pbDarjah, paperPayload, targetStudentId);
          if (res && res.success === false) {
            toast.error(res.reason || "Failed to publish paper.");
          } else {
            toast.success(
              languageMode === "EN"
                ? "Examination paper published successfully!"
                : "Kertas peperiksaan telah berjaya diterbitkan!"
            );
          }
        } catch (err) {
          console.error("Failed to publish paper:", err);
          toast.error(
            languageMode === "EN" ? "Failed to publish paper." : "Gagal menerbitkan kertas peperiksaan."
          );
        } finally {
          setIsPublishing(false);
        }
      },
    });
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* ─── TOP CONTROL BAR ─── */}
      <div className="rounded-xl border-2 border-slate-900 bg-white p-3.5 sm:p-4 shadow-tactile">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📝</span>
              <h3 className="text-sm sm:text-base font-black text-slate-900 font-mono">
                {languageMode === "EN"
                  ? `Exam Paper Builder (Year ${pbDarjah})`
                  : `Pembina Kertas Peperiksaan (Tahun ${pbDarjah})`}
              </h3>
              <span
                className={`rounded-lg border px-2 py-0.5 font-mono text-[11px] font-black ${
                  currentPaper?.status === "PUBLISHED"
                    ? "border-emerald-800 bg-emerald-100 text-emerald-950"
                    : "border-amber-800 bg-amber-100 text-amber-950"
                }`}
              >
                {currentPaper?.status === "PUBLISHED"
                  ? languageMode === "EN"
                    ? "🟢 PUBLISHED"
                    : "🟢 DITERBITKAN"
                  : languageMode === "EN"
                  ? "🟡 DRAFT / UNPUBLISHED"
                  : "🟡 DRAF / BELUM TERBIT"}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-600 mt-0.5">
              {languageMode === "EN"
                ? "Build standardized or personalized exam papers with Section A, B, and C questions and custom mark allocations."
                : "Bina kertas peperiksaan umum atau khusus bagi setiap murid dengan soalan Bahagian A, B, dan C berserta peruntukan markah."}
            </p>
          </div>

          {/* Action Buttons: Save Draft & Publish */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={isSavingDraft || isPublishing}
              onClick={handleSaveDraft}
              className="btn-tactile flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-800 hover:bg-slate-50 shadow-tactile-sm disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5 text-sky-600" />
              <span>
                {isSavingDraft
                  ? languageMode === "EN"
                    ? "Saving..."
                    : "Menyimpan..."
                  : languageMode === "EN"
                  ? "Save Draft"
                  : "Simpan Draf"}
              </span>
            </button>

            <button
              disabled={isSavingDraft || isPublishing}
              onClick={handlePublish}
              className="btn-tactile flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-emerald-400 px-3.5 py-1.5 text-xs font-black text-slate-950 hover:bg-emerald-300 shadow-tactile-sm disabled:opacity-50"
            >
              <Rocket className="h-3.5 w-3.5" />
              <span>
                {isPublishing
                  ? languageMode === "EN"
                    ? "Publishing..."
                    : "Menerbitkan..."
                  : languageMode === "EN"
                  ? "Publish Exam"
                  : "Terbitkan Peperiksaan"}
              </span>
            </button>
          </div>
        </div>

        {/* Configuration Grid Box: Year, Target Student, Paper Title */}
        <div className="mt-3 bg-slate-50 border-2 border-slate-900 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Cols 1–3: Academic Year */}
          <div className="sm:col-span-3">
            <label className="text-[10px] font-black uppercase text-slate-600 block mb-1 font-mono">
              {languageMode === "EN" ? "ACADEMIC YEAR" : "TAHUN PENGAJIAN"}
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => setPbDarjah(d)}
                  className={`btn-tactile flex-1 py-1 rounded-lg text-xs font-black border-2 border-slate-900 font-mono ${
                    pbDarjah === d
                      ? "bg-amber-300 text-slate-950 shadow-tactile-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {languageMode === "EN" ? `Y${d}` : `T${d}`}
                </button>
              ))}
            </div>
          </div>

          {/* Cols 4–7: Target Student */}
          <div className="sm:col-span-4">
            <label className="text-[10px] font-black uppercase text-slate-600 block mb-1 font-mono">
              {languageMode === "EN" ? "TARGET STUDENT" : "MURID SASARAN"}
            </label>
            <select
              value={targetStudentId}
              onChange={(e) => setTargetStudentId(e.target.value)}
              className="w-full max-w-full min-w-0 truncate rounded-lg border-2 border-slate-900 bg-white px-2 py-1 font-mono text-xs font-black text-slate-900 shadow-tactile-sm"
            >
              <option value="DEFAULT">
                {languageMode === "EN"
                  ? "Default (All Students)"
                  : "Asal (Semua Murid)"}
              </option>
              {activeStudents.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.avatar} {st.name} {languageMode === "EN" ? "(Personal)" : "(Khusus)"}
                </option>
              ))}
            </select>
          </div>

          {/* Cols 8–12: Paper Title */}
          <div className="sm:col-span-5">
            <label className="text-[10px] font-black uppercase text-slate-600 block mb-1 font-mono">
              {languageMode === "EN" ? "PAPER TITLE" : "TAJUK KERTAS"}
            </label>
            <input
              type="text"
              value={languageMode === "EN" ? paperTitleEn : paperTitleBm}
              onChange={(e) => {
                if (languageMode === "EN") {
                  setPaperTitleEn(e.target.value);
                } else {
                  setPaperTitleBm(e.target.value);
                }
              }}
              className="w-full rounded-lg border-2 border-slate-900 bg-white px-2.5 py-1 text-xs font-black shadow-tactile-sm"
            />
          </div>
        </div>

        {/* ─── SECTION METRICS SUMMARY ─── */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg border-2 border-slate-900 bg-sky-50 p-2 shadow-tactile-sm text-center">
            <span className="text-[10px] font-black uppercase text-sky-900 block font-mono">
              {languageMode === "EN" ? "Sec A (Objective)" : "Bahagian A (Objektif)"}
            </span>
            <p className="mt-0.5 font-mono text-base font-black text-slate-900">
              {secAQuestions.length} {languageMode === "EN" ? "Questions" : "Soalan"}
            </p>
            <span className="text-[11px] font-black text-sky-800 font-mono">
              {marksA} {languageMode === "EN" ? "Marks" : "Markah"}
            </span>
          </div>

          <div className="rounded-lg border-2 border-slate-900 bg-amber-50 p-2 shadow-tactile-sm text-center">
            <span className="text-[10px] font-black uppercase text-amber-900 block font-mono">
              {languageMode === "EN" ? "Sec B (Structure)" : "Bahagian B (Struktur)"}
            </span>
            <p className="mt-0.5 font-mono text-base font-black text-slate-900">
              {secBQuestions.length} {languageMode === "EN" ? "Questions" : "Soalan"}
            </p>
            <span className="text-[11px] font-black text-amber-800 font-mono">
              {marksB} {languageMode === "EN" ? "Marks" : "Markah"}
            </span>
          </div>

          <div className="rounded-lg border-2 border-slate-900 bg-violet-50 p-2 shadow-tactile-sm text-center">
            <span className="text-[10px] font-black uppercase text-violet-900 block font-mono">
              {languageMode === "EN" ? "Sec C (Problems)" : "Bahagian C (Masalah)"}
            </span>
            <p className="mt-0.5 font-mono text-base font-black text-slate-900">
              {secCQuestions.length} {languageMode === "EN" ? "Questions" : "Soalan"}
            </p>
            <span className="text-[11px] font-black text-violet-800 font-mono">
              {marksC} {languageMode === "EN" ? "Marks" : "Markah"}
            </span>
          </div>

          <div className="rounded-lg border-2 border-slate-900 bg-emerald-100 p-2 shadow-tactile-sm text-center">
            <span className="text-[10px] font-black uppercase text-emerald-950 block font-mono">
              {languageMode === "EN" ? "Total Paper" : "Jumlah Keseluruhan"}
            </span>
            <p className="mt-0.5 font-mono text-lg font-black text-slate-950">
              {builderQuestions.length} {languageMode === "EN" ? "Questions" : "Soalan"}
            </p>
            <span className="text-[11px] font-black text-emerald-900 font-mono">
              {totalPaperMarks} {languageMode === "EN" ? "Marks" : "Markah"}
            </span>
          </div>
        </div>

        {/* ─── AUTHOR / SELECT QUESTION CONTROLS & SECTION FILTER PILLS ─── */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t-2 border-slate-100 pt-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setSelectedBankIds([]);
                setIsChooseFromBankOpen(true);
              }}
              className="btn-tactile flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-sky-300 px-2.5 py-1.5 text-xs font-black text-slate-950 hover:bg-sky-200 shadow-tactile-sm"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>
                {languageMode === "EN"
                  ? "Choose from Question Bank"
                  : "Pilih dari Bank Soalan (KSSR & Ciptaan)"}
              </span>
            </button>

            <button
              onClick={() => {
                setEditingPaperQuestion(null);
                setIsEditorModalOpen(true);
              }}
              className="btn-tactile flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-white px-2.5 py-1.5 text-xs font-black text-slate-800 hover:bg-slate-50 shadow-tactile-sm"
            >
              <FilePlus className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                {languageMode === "EN" ? "+ Create New Question" : "+ Cipta Soalan Baharu"}
              </span>
            </button>
          </div>

          {/* Section Filter Pills */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-black text-slate-500 font-mono mr-1">
              {languageMode === "EN" ? "Filter:" : "Tapis:"}
            </span>
            {[
              { id: "ALL", label: languageMode === "EN" ? "All" : "Semua", count: builderQuestions.length },
              { id: "A", label: languageMode === "EN" ? "Sec A" : "Bahagian A", count: secAQuestions.length },
              { id: "B", label: languageMode === "EN" ? "Sec B" : "Bahagian B", count: secBQuestions.length },
              { id: "C", label: languageMode === "EN" ? "Sec C" : "Bahagian C", count: secCQuestions.length },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setSectionFilter(pill.id)}
                className={`rounded-lg px-2 py-0.5 text-[11px] font-black border-2 border-slate-900 transition-all font-mono ${
                  sectionFilter === pill.id
                    ? "bg-amber-300 text-slate-950 shadow-tactile-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {pill.label} ({pill.count})
              </button>
            ))}

            {builderQuestions.length > 0 && (
              <button
                onClick={() => {
                  confirmAction({
                    title: languageMode === "EN" ? "Clear All Questions?" : "Kosongkan Semua Soalan?",
                    message:
                      languageMode === "EN"
                        ? "Are you sure you want to remove all questions from this exam paper?"
                        : "Adakah anda pasti ingin mengeluarkan semua soalan daripada kertas ini?",
                    confirmText: languageMode === "EN" ? "Clear All" : "Kosongkan Semua",
                    cancelText: languageMode === "EN" ? "Cancel" : "Batal",
                    danger: true,
                    onConfirm: () => {
                      setBuilderQuestions([]);
                      toast.info(
                        languageMode === "EN"
                          ? "All questions removed."
                          : "Semua soalan telah dikeluarkan."
                      );
                    },
                  });
                }}
                className="text-[11px] font-bold text-rose-600 hover:underline ml-2"
              >
                {languageMode === "EN" ? "Clear All" : "Kosongkan Semua"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── QUESTIONS LIST IN PAPER ─── */}
      <div className="space-y-2.5">
        {builderQuestions.length === 0 ? (
          <div className="rounded-xl border-2 border-slate-900 bg-white p-6 sm:p-8 text-center shadow-tactile space-y-2.5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-900 bg-amber-100 text-2xl">
              📝
            </div>
            <h4 className="text-sm sm:text-base font-black text-slate-900 font-mono">
              {languageMode === "EN"
                ? "Exam Paper is Currently Empty"
                : "Kertas Peperiksaan Masih Kosong"}
            </h4>
            <p className="text-xs font-bold text-slate-600 max-w-md mx-auto">
              {languageMode === "EN"
                ? "Exams are 100% controlled by the tutor. Click 'Choose from Question Bank' or '+ Create New Question' to build this paper."
                : "Peperiksaan kini 100% dikawal oleh guru tanpa pengisian rawak automatik. Sila klik 'Pilih dari Bank Soalan' untuk memasukkan soalan."}
            </p>
            <button
              onClick={() => setIsChooseFromBankOpen(true)}
              className="btn-tactile rounded-lg border-2 border-slate-900 bg-sky-300 px-4 py-2 text-xs font-black text-slate-950 hover:bg-sky-200 shadow-tactile-sm"
            >
              {languageMode === "EN" ? "Choose Questions Now" : "Pilih Soalan Sekarang"}
            </button>
          </div>
        ) : displayedQuestions.length === 0 ? (
          <div className="rounded-xl border-2 border-slate-900 bg-white p-6 text-center shadow-tactile">
            <p className="text-xs font-bold text-slate-500 font-mono">
              {languageMode === "EN"
                ? `No questions found in Section ${sectionFilter}.`
                : `Tiada soalan ditemui dalam Bahagian ${sectionFilter}.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedQuestions.map((q) => {
              const realIdx = builderQuestions.findIndex((item) => item.id === q.id);
              const norm = normalizeQuestionFields(q);

              return (
                <div
                  key={q.id || realIdx}
                  className="rounded-xl border-2 border-slate-900 bg-white p-3 sm:p-3.5 shadow-tactile flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 flex-1">
                    {/* Question Number Pill */}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-slate-900 bg-sky-200 font-mono text-xs font-black text-slate-950 shadow-tactile-sm">
                      {realIdx + 1}
                    </span>

                    <div className="space-y-1 flex-1 pr-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Section Selector */}
                        <select
                          value={q.section || "A"}
                          onChange={(e) => changeQuestionSection(realIdx, e.target.value)}
                          className="rounded-lg border-2 border-slate-900 bg-[#FAF6EE] px-2 py-0.5 font-mono text-xs font-black shadow-tactile-sm"
                        >
                          <option value="A">
                            {languageMode === "EN" ? "Section A (Objective)" : "Bahagian A (Objektif)"}
                          </option>
                          <option value="B">
                            {languageMode === "EN" ? "Section B (Structure)" : "Bahagian B (Struktur)"}
                          </option>
                          <option value="C">
                            {languageMode === "EN" ? "Section C (Problems)" : "Bahagian C (Masalah)"}
                          </option>
                        </select>

                        {q.scratchpadRequired && (
                          <span className="rounded-md border border-amber-400 bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-900">
                            ✏️ {languageMode === "EN" ? "Scratchpad Req." : "Wajib Conteng"}
                          </span>
                        )}
                      </div>

                      {(languageMode === "EN" ? q.story_en || q.story_bm : q.story_bm) && (
                        <p className="text-xs italic font-bold text-slate-500 line-clamp-1">
                          📖 {languageMode === "EN" ? q.story_en || q.story_bm : q.story_bm}
                        </p>
                      )}

                      <p className="text-xs sm:text-sm font-black text-slate-900 line-clamp-2">
                        {languageMode === "EN" ? q.prompt_en || q.prompt_bm : q.prompt_bm}
                      </p>

                      <div className="text-[11px] font-bold text-slate-500 font-mono">
                        {norm.answerFields?.length || 1}{" "}
                        {languageMode === "EN" ? "Answer Field(s)" : "Ruang Jawapan"} •{" "}
                        {languageMode === "EN" ? "Expected:" : "Jawapan:"}{" "}
                        {norm.answerFields?.[0]?.type === "OPERATOR"
                          ? norm.answerFields?.[0]?.expectedOp || norm.answerFields?.[0]?.expectedAnswer || "+"
                          : norm.answerFields?.[0]?.expectedAnswer ||
                            q.correctAnswer ||
                            "Tutor Defined"}
                      </div>
                    </div>
                  </div>

                  {/* Reorder and Card Controls */}
                  <div className="flex flex-wrap items-center gap-1.5 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                    <button
                      disabled={realIdx === 0}
                      onClick={() => moveQuestion(realIdx, -1)}
                      className="btn-tactile rounded-lg border border-slate-900 bg-white p-1 text-slate-700 hover:bg-slate-50 disabled:opacity-30"
                      title={languageMode === "EN" ? "Move Up" : "Alih ke Atas"}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      disabled={realIdx === builderQuestions.length - 1}
                      onClick={() => moveQuestion(realIdx, 1)}
                      className="btn-tactile rounded-lg border border-slate-900 bg-white p-1 text-slate-700 hover:bg-slate-50 disabled:opacity-30"
                      title={languageMode === "EN" ? "Move Down" : "Alih ke Bawah"}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => setPreviewQuestion(norm)}
                      className="btn-tactile flex items-center gap-1 rounded-lg border border-slate-900 bg-white px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-50 shadow-tactile-sm"
                      title={languageMode === "EN" ? "Preview Question" : "Pratonton Soalan"}
                    >
                      <Eye className="h-3.5 w-3.5 text-sky-600" />
                      <span>{languageMode === "EN" ? "View" : "Lihat"}</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingPaperQuestion({
                          ...norm,
                          realIdx,
                        });
                        setIsEditorModalOpen(true);
                      }}
                      className="btn-tactile flex items-center gap-1 rounded-lg border border-slate-900 bg-white px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-50 shadow-tactile-sm"
                      title={
                        languageMode === "EN"
                          ? "Edit Question for this Paper"
                          : "Edit Soalan Khusus untuk Kertas Ini"
                      }
                    >
                      <Pencil className="h-3.5 w-3.5 text-amber-600" />
                      <span>{languageMode === "EN" ? "Edit" : "Edit"}</span>
                    </button>

                    <button
                      onClick={() => removeQuestionFromPaper(realIdx)}
                      className="btn-tactile flex items-center gap-1 rounded-lg border border-slate-900 bg-rose-50 px-2 py-1 text-xs font-black text-rose-700 hover:bg-rose-100 shadow-tactile-sm"
                      title={
                        languageMode === "EN"
                          ? "Remove from Paper"
                          : "Keluarkan dari Kertas"
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── MODAL 1: BROWSE & MULTI-SELECT FROM QUESTION BANK ─── */}
      {isChooseFromBankOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-xl border-3 border-slate-900 bg-white p-5 sm:p-6 shadow-tactile space-y-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5">
              <div>
                <h4 className="text-sm sm:text-base font-black text-slate-900 font-mono">
                  📚{" "}
                  {languageMode === "EN"
                    ? `Pick from Question Bank (Year ${pbDarjah})`
                    : `Pilih Soalan dari Bank Soalan (Tahun ${pbDarjah})`}
                </h4>
                <p className="text-xs font-bold text-slate-500">
                  {languageMode === "EN"
                    ? "Check questions you want to add to this exam paper."
                    : "Tandakan soalan yang ingin dimasukkan ke dalam kertas peperiksaan ini."}
                </p>
              </div>
              <button
                onClick={() => setIsChooseFromBankOpen(false)}
                className="rounded-lg border-2 border-slate-900 bg-white p-1 hover:bg-rose-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#FAF6EE] p-2.5 rounded-lg border-2 border-slate-900">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-700 font-mono">
                  {languageMode === "EN" ? "Topic:" : "Topik:"}
                </span>
                <select
                  value={bankTopicFilter}
                  onChange={(e) => setBankTopicFilter(e.target.value)}
                  className="w-full sm:w-auto max-w-full min-w-0 truncate rounded-lg border border-slate-900 bg-white px-2 py-1 text-xs font-bold"
                >
                  <option value="ALL">
                    {languageMode === "EN"
                      ? `All Topics (${topics.length})`
                      : `Semua Topik (${topics.length})`}
                  </option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.order}. {languageMode === "EN" ? t.title_en : t.title_bm}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-slate-700 font-mono">
                  {languageMode === "EN" ? "Source:" : "Sumber:"}
                </span>
                {[
                  { id: "ALL", label: languageMode === "EN" ? "All" : "Semua" },
                  { id: "STANDARD", label: languageMode === "EN" ? "Standard KSSR" : "Standard KSSR" },
                  { id: "CUSTOM", label: languageMode === "EN" ? "Tutor Custom" : "Ciptaan Guru" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setBankSourceFilter(s.id)}
                    className={`rounded-lg px-2 py-0.5 text-xs font-bold border ${
                      bankSourceFilter === s.id
                        ? "bg-amber-300 border-slate-900 font-black"
                        : "bg-white border-slate-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List with Checkboxes */}
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {availableBankQuestions.length === 0 ? (
                <p className="text-center py-8 text-xs font-bold text-slate-500 font-mono">
                  {languageMode === "EN"
                    ? "No questions found matching filter."
                    : "Tiada soalan ditemui bagi tapisan ini."}
                </p>
              ) : (
                availableBankQuestions.map((q, idx) => {
                  const isChecked = selectedBankIds.includes(q.id);
                  const isStd = q.source === "STANDARD";

                  return (
                    <label
                      key={q.id || idx}
                      className={`flex items-start gap-2.5 rounded-lg border-2 border-slate-900 p-2.5 transition-all cursor-pointer shadow-tactile-sm ${
                        isChecked
                          ? "bg-sky-100 border-sky-900 ring-2 ring-sky-500"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBankIds((prev) => [...prev, q.id]);
                          } else {
                            setSelectedBankIds((prev) => prev.filter((id) => id !== q.id));
                          }
                        }}
                        className="mt-1 h-4 w-4 rounded border-2 border-slate-900 text-sky-600"
                      />

                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`rounded-md border px-1.5 py-0.2 text-[10px] font-black font-mono ${
                              isStd
                                ? "border-emerald-800 bg-emerald-100 text-emerald-950"
                                : "border-violet-800 bg-violet-100 text-violet-950"
                            }`}
                          >
                            {isStd
                              ? languageMode === "EN"
                                ? "Standard KSSR"
                                : "Standard KSSR"
                              : languageMode === "EN"
                              ? "Tutor Custom"
                              : "Ciptaan Guru"}
                          </span>
                          <span className="font-mono text-xs text-slate-500">
                            {q.maxMarks || 1}m
                          </span>
                        </div>
                        <p className="text-xs font-black text-slate-900 line-clamp-2">
                          {languageMode === "EN" ? q.prompt_en || q.prompt_bm : q.prompt_bm}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPreviewQuestion(normalizeQuestionFields(q));
                        }}
                        className="btn-tactile rounded-md border border-slate-900 bg-white px-2 py-0.5 text-xs font-black text-slate-700 hover:bg-slate-100"
                      >
                        {languageMode === "EN" ? "View" : "Lihat"}
                      </button>
                    </label>
                  );
                })
              )}
            </div>

            {/* Bottom Modal Actions */}
            <div className="flex items-center justify-between border-t-2 border-slate-100 pt-2.5">
              <span className="font-mono text-xs font-black text-slate-700">
                {selectedBankIds.length}{" "}
                {languageMode === "EN" ? "question(s) selected" : "soalan dipilih"}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsChooseFromBankOpen(false)}
                  className="btn-tactile rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-700"
                >
                  {languageMode === "EN" ? "Cancel" : "Batal"}
                </button>
                <button
                  disabled={selectedBankIds.length === 0}
                  type="button"
                  onClick={handleAddSelectedFromBank}
                  className="btn-tactile rounded-lg border-2 border-slate-900 bg-emerald-400 px-4 py-1.5 text-xs font-black text-slate-950 hover:bg-emerald-300 shadow-tactile-sm disabled:opacity-50"
                >
                  + {languageMode === "EN" ? "Add Questions" : "Masukkan Soalan"} (
                  {selectedBankIds.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: QUESTION AUTHORING & LIVE PREVIEW (Shared QuestionEditorModal) ─── */}
      <QuestionEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => {
          setIsEditorModalOpen(false);
          setEditingPaperQuestion(null);
        }}
        onSave={handleSaveQuestionFromEditor}
        initialQuestion={editingPaperQuestion}
        darjah={pbDarjah}
        topicId={topics[0]?.id || ""}
        topics={topics}
        languageMode={languageMode}
        isPaperBuilder={true}
      />

      {/* ─── MODAL 3: STUDENT VIEW PREVIEW ─── */}
      {previewQuestion && (
        <QuestionPreviewModal
          question={previewQuestion}
          languageMode={languageMode}
          onClose={() => setPreviewQuestion(null)}
        />
      )}
    </div>
  );
}
