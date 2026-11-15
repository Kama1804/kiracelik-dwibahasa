// src/components/tutor/QuestionBankTab.jsx
import { useState, useMemo } from "react";
import { getTopicsByDarjah } from "../../engine/syllabusConfig.js";
import {
  getAllBankQuestions,
  getTopicParts,
  saveQuestionBankItem,
  deleteQuestionBankItem,
  saveTopicPart,
  deleteTopicPart,
} from "../../services/storageService.js";
import {
  normalizeQuestionFields,
} from "../../engine/questionGenerator.js";
import {
  FilePlus,
  X,
  Eye,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import QuestionPreviewModal from "./QuestionPreviewModal.jsx";
import QuestionEditorModal from "./QuestionEditorModal.jsx";
import { toast, confirmAction } from "../ui/toast.js";
import QuestionVisualFigure from "../visuals/QuestionVisualFigure.jsx";

export default function QuestionBankTab({
  db,
  selectedDarjah = 1,
  languageMode = "BM",
  onSaveQuestionBankItem: propSaveBankItem,
  onDeleteQuestionBankItem: propDeleteBankItem,
  onSaveCustomQuestion,
  onDeleteCustomQuestion,
  onSaveTopicPart: propSaveTopicPart,
  onDeleteTopicPart: propDeleteTopicPart,
}) {
  const [subTab, setSubTab] = useState("QUESTIONS"); // "QUESTIONS" | "TOPIC_PARTS"
  const [qbDarjah, setQbDarjah] = useState(() => Number(selectedDarjah || 1));
  const qbTopics = getTopicsByDarjah(qbDarjah);
  const [qbTopicId, setQbTopicId] = useState(qbTopics[0]?.id || "");
  const [sourceFilter, setSourceFilter] = useState("ALL"); // "ALL" | "STANDARD" | "CUSTOM"

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [partFilter, setPartFilter] = useState("ALL"); // "ALL" | 1 | 2 | 3 | "UNASSIGNED"

  // Topic Parts Manager State
  const [editingPart, setEditingPart] = useState(null);
  const [isPartEditorOpen, setIsPartEditorOpen] = useState(false);
  const [partTitleBm, setPartTitleBm] = useState("");
  const [partTitleEn, setPartTitleEn] = useState("");
  const [partStatus, setPartStatus] = useState("PUBLISHED");
  const [isSelectQuestionsForPartOpen, setIsSelectQuestionsForPartOpen] = useState(false);
  const [targetPartId, setTargetPartId] = useState(null);

  const currentTopicParts = useMemo(() => {
    return getTopicParts(db, qbDarjah, qbTopicId);
  }, [db, qbDarjah, qbTopicId]);

  // Map each question ID to its practice part assignment
  const questionPartMap = useMemo(() => {
    const map = {};
    (currentTopicParts || []).forEach((part) => {
      (part.questions || []).forEach((q) => {
        if (q && q.id) {
          map[q.id] = {
            partId: part.id,
            partNo: part.partNo,
            title_bm: part.title_bm,
            title_en: part.title_en,
          };
        }
      });
    });
    return map;
  }, [currentTopicParts]);

  // Queries
  const allQuestionsForView = useMemo(() => {
    let list = getAllBankQuestions(db, qbDarjah, qbTopicId);
    if (sourceFilter === "STANDARD") list = list.filter((q) => q.source === "STANDARD");
    else if (sourceFilter === "CUSTOM") list = list.filter((q) => q.source === "CUSTOM");

    if (partFilter !== "ALL") {
      list = list.filter((q) => {
        const assigned = questionPartMap[q.id];
        if (partFilter === "UNASSIGNED") return !assigned;
        return assigned?.partNo === Number(partFilter);
      });
    }
    return list;
  }, [db, qbDarjah, qbTopicId, sourceFilter, partFilter, questionPartMap]);

  // Handlers for Save / Delete
  const handleSaveBankItem = async (payload) => {
    if (propSaveBankItem) {
      await propSaveBankItem(payload);
    } else if (onSaveCustomQuestion) {
      await onSaveCustomQuestion(payload);
    } else {
      await saveQuestionBankItem(db, payload);
    }
  };

  const handleDeleteBankItem = async (questionId) => {
    if (propDeleteBankItem) {
      await propDeleteBankItem(questionId);
    } else if (onDeleteCustomQuestion) {
      await onDeleteCustomQuestion(questionId);
    } else {
      await deleteQuestionBankItem(db, questionId);
    }
  };

  const handleSaveTopicPartAction = async (darjah, topicId, partPayload) => {
    if (propSaveTopicPart) {
      await propSaveTopicPart(darjah, topicId, partPayload);
    } else {
      await saveTopicPart(db, darjah, topicId, partPayload);
    }
  };

  const handleDeleteTopicPartAction = async (darjah, topicId, partId) => {
    if (propDeleteTopicPart) {
      await propDeleteTopicPart(darjah, topicId, partId);
    } else {
      await deleteTopicPart(db, darjah, topicId, partId);
    }
  };

  const handleReassignQuestionPart = async (question, targetPartId) => {
    try {
      for (const part of currentTopicParts) {
        const hasQ = (part.questions || []).some((pq) => pq.id === question.id);
        if (targetPartId && part.id === targetPartId) {
          const updatedQuestions = hasQ
            ? (part.questions || []).map((pq) => (pq.id === question.id ? question : pq))
            : [...(part.questions || []), question];
          await handleSaveTopicPartAction(qbDarjah, qbTopicId, {
            ...part,
            questions: updatedQuestions,
          });
        } else if ((!targetPartId || part.id !== targetPartId) && hasQ) {
          await handleSaveTopicPartAction(qbDarjah, qbTopicId, {
            ...part,
            questions: (part.questions || []).filter((pq) => pq.id !== question.id),
          });
        }
      }
    } catch (err) {
      console.error("Failed to reassign question part:", err);
    }
  };

  // Open Question Editor Modal
  const openNewQuestionEditor = () => {
    setEditingQuestion(null);
    setIsEditorOpen(true);
  };

  const openEditQuestionEditor = (q) => {
    const norm = normalizeQuestionFields(q);
    const assignedPart = currentTopicParts.find((p) =>
      (p.questions || []).some((pq) => pq.id === q.id)
    );
    const enriched = {
      ...norm,
      partId: norm.partId || assignedPart?.id || "",
    };
    setEditingQuestion(enriched);
    setIsEditorOpen(true);
  };

  const handleSaveQuestionSubmit = async (payload, targetPartIdForQuestion) => {
    await handleSaveBankItem(payload);
    await handleReassignQuestionPart(payload, targetPartIdForQuestion);
    setIsEditorOpen(false);
    setEditingQuestion(null);
    toast.success(
      languageMode === "EN"
        ? "Question saved to bank successfully!"
        : "Soalan berjaya disimpan ke dalam Bank Soalan!"
    );
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* ─── TOP CONTROL BAR ─── */}
      <div className="rounded-xl border-2 border-slate-900 bg-white p-3.5 sm:p-4 shadow-tactile">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 font-mono">
              <span>📚</span>
              <span>
                {languageMode === "EN"
                  ? "Question Bank & Topic Practice Builder"
                  : "Bank Soalan & Latihan Topik"}
              </span>
            </h3>
            <p className="text-xs font-bold text-slate-600 mt-0.5">
              {languageMode === "EN"
                ? "Manage standard KSSR syllabus and custom tutor questions, organize practice into topic parts, and author multi-field exercises."
                : "Urus soalan kurikulum standard KSSR dan ciptaan guru, susun latihan mengikut bahagian topik, serta cipta soalan anjal."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: Bank Questions vs Topic Practice Parts */}
            <div className="flex rounded-lg border-2 border-slate-900 bg-[#FAF6EE] p-0.5 shadow-tactile-sm font-mono">
              <button
                onClick={() => setSubTab("QUESTIONS")}
                className={`rounded-md px-2.5 py-1 text-xs font-black transition-all ${
                  subTab === "QUESTIONS"
                    ? "bg-amber-300 text-slate-950 shadow-sm"
                    : "text-slate-700 hover:text-slate-950"
                }`}
              >
                {languageMode === "EN"
                  ? `📚 Question Bank (${allQuestionsForView.length})`
                  : `📚 Bank Soalan (${allQuestionsForView.length})`}
              </button>
              <button
                onClick={() => setSubTab("TOPIC_PARTS")}
                className={`rounded-md px-2.5 py-1 text-xs font-black transition-all ${
                  subTab === "TOPIC_PARTS"
                    ? "bg-sky-400 text-slate-950 shadow-sm"
                    : "text-slate-700 hover:text-slate-950"
                }`}
              >
                {languageMode === "EN"
                  ? `🗂️ Practice Parts (${currentTopicParts.length})`
                  : `🗂️ Bahagian Latihan (${currentTopicParts.length})`}
              </button>
            </div>

            {subTab === "QUESTIONS" && (
              <button
                onClick={openNewQuestionEditor}
                className="btn-tactile flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-emerald-300 shadow-tactile-sm border-2 border-slate-900 font-mono"
              >
                <FilePlus className="h-3.5 w-3.5" />
                <span>{languageMode === "EN" ? "+ Author Question" : "+ Cipta Soalan"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Grid Box: Year, Topic, Source, Practice Part */}
        <div className="mt-3 bg-slate-50 border-2 border-slate-900 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Column 1: Academic Year */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-600 block mb-1 font-mono">
              {languageMode === "EN" ? "ACADEMIC YEAR" : "TAHUN PENGAJIAN"}
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setQbDarjah(d);
                    const nextTopics = getTopicsByDarjah(d);
                    setQbTopicId(nextTopics[0]?.id || "");
                  }}
                  className={`btn-tactile flex-1 py-1 rounded-lg text-xs font-black border-2 border-slate-900 font-mono ${
                    qbDarjah === d
                      ? "bg-amber-300 text-slate-950 shadow-tactile-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {languageMode === "EN" ? `Y${d}` : `T${d}`}
                </button>
              ))}
            </div>
          </div>

          {/* Column 2: Syllabus Topic */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-600 block mb-1 font-mono">
              {languageMode === "EN" ? "SYLLABUS TOPIC" : "TOPIK KURIKULUM"}
            </label>
            <select
              value={qbTopicId}
              onChange={(e) => setQbTopicId(e.target.value)}
              className="w-full rounded-lg border-2 border-slate-900 bg-white px-2 py-1 text-xs font-bold shadow-tactile-sm truncate"
            >
              {qbTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.order}. {languageMode === "EN" ? t.title_en : t.title_bm}
                </option>
              ))}
            </select>
          </div>

          {/* Column 3: Question Source */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-600 block mb-1 font-mono">
              {languageMode === "EN" ? "QUESTION SOURCE" : "SUMBER SOALAN"}
            </label>
            <div className="flex items-center gap-1">
              {[
                { id: "ALL", labelEn: "All", labelBm: "Semua" },
                { id: "STANDARD", labelEn: "Standard", labelBm: "Standard" },
                { id: "CUSTOM", labelEn: "Custom", labelBm: "Ciptaan" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSourceFilter(s.id)}
                  className={`btn-tactile flex-1 py-1 rounded-lg text-xs font-black border-2 border-slate-900 ${
                    sourceFilter === s.id
                      ? "bg-sky-200 text-slate-950 shadow-tactile-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {languageMode === "EN" ? s.labelEn : s.labelBm}
                </button>
              ))}
            </div>
          </div>

          {/* Column 4: Practice Part */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-600 block mb-1 font-mono">
              {languageMode === "EN" ? "PRACTICE PART" : "BAHAGIAN LATIHAN"}
            </label>
            <select
              value={partFilter}
              onChange={(e) => setPartFilter(e.target.value)}
              className="w-full rounded-lg border-2 border-slate-900 bg-white px-2 py-1 text-xs font-bold shadow-tactile-sm"
            >
              <option value="ALL">{languageMode === "EN" ? "All Parts" : "Semua Bahagian"}</option>
              <option value="1">{languageMode === "EN" ? "Part 1" : "Bahagian 1"}</option>
              <option value="2">{languageMode === "EN" ? "Part 2" : "Bahagian 2"}</option>
              <option value="3">{languageMode === "EN" ? "Part 3" : "Bahagian 3"}</option>
              <option value="UNASSIGNED">
                {languageMode === "EN" ? "Unassigned" : "Belum Ditetapkan"}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── SUB-TAB 1: QUESTION BANK LIST ─── */}
      {subTab === "QUESTIONS" && (
        <div className="space-y-4">
          {allQuestionsForView.length === 0 ? (
            <div className="rounded-3xl border-2 border-slate-900 bg-white p-8 text-center shadow-tactile space-y-2">
              <p className="text-base font-black text-slate-900 font-mono">
                {languageMode === "EN" ? "No questions match this filter." : "Tiada soalan bagi tapisan ini."}
              </p>
              <button
                onClick={openNewQuestionEditor}
                className="btn-tactile rounded-xl border-2 border-slate-900 bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-emerald-300 font-mono"
              >
                {languageMode === "EN" ? "+ Create Question Now" : "+ Cipta Soalan Sekarang"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {allQuestionsForView.map((q, idx) => {
                const norm = normalizeQuestionFields(q);
                const isStd = q.source === "STANDARD";
                const isOverridden = Boolean(q.isOverridden);

                return (
                  <div
                    key={q.id || idx}
                    className="rounded-xl border-2 border-slate-900 bg-white p-3.5 sm:p-4 shadow-tactile flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* Badges & Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-100 pb-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-lg border px-2 py-0.5 text-[11px] font-black font-mono ${
                              isStd
                                ? "border-emerald-800 bg-emerald-100 text-emerald-950"
                                : "border-violet-800 bg-violet-100 text-violet-950"
                            }`}
                          >
                            {isStd
                              ? "Standard KSSR"
                              : languageMode === "EN"
                              ? "Custom"
                              : "Ciptaan Guru"}
                          </span>
                          {isOverridden && (
                            <span className="rounded-lg border border-amber-800 bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-950 font-mono">
                              {languageMode === "EN" ? "Edited" : "Disunting Guru"}
                            </span>
                          )}
                          {(() => {
                            const assignedPart = questionPartMap[q.id];
                            if (assignedPart) {
                              const rawTitle = (languageMode === "EN" && assignedPart.title_en ? assignedPart.title_en : assignedPart.title_bm) || "";
                              const cleanTitle = rawTitle.replace(/^(Bahagian|Part)\s*\d+\s*:\s*/i, "").trim();
                              return (
                                <span className="rounded-lg border border-sky-800 bg-sky-100 px-2 py-0.5 text-[11px] font-black text-sky-950 font-mono">
                                  📂 {languageMode === "EN" ? "Part" : "Bahagian"} {assignedPart.partNo}{cleanTitle ? `: ${cleanTitle}` : ""}
                                </span>
                              );
                            }
                            return (
                              <span className="rounded-lg border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500 font-mono">
                                ⚪ {languageMode === "EN" ? "Unassigned" : "Belum Ditetapkan"}
                              </span>
                            );
                          })()}
                          <span className="rounded-lg border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-700">
                            {norm.maxMarks || 1}m
                          </span>
                        </div>

                        {/* Card Controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setPreviewQuestion(norm)}
                            className="btn-tactile flex items-center gap-1 rounded-lg border border-slate-900 bg-white px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-50 shadow-tactile-sm"
                            title={languageMode === "EN" ? "Preview Question (Student View)" : "Pratonton Soalan (Student View)"}
                          >
                            <Eye className="h-3.5 w-3.5 text-sky-600" />
                            <span>{languageMode === "EN" ? "Preview" : "Lihat"}</span>
                          </button>
                          <button
                            onClick={() => openEditQuestionEditor(norm)}
                            className="btn-tactile flex items-center gap-1 rounded-lg border border-slate-900 bg-white px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-50 shadow-tactile-sm"
                            title={languageMode === "EN" ? "Edit Question Content" : "Edit Kandungan Soalan"}
                          >
                            <Pencil className="h-3.5 w-3.5 text-amber-600" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              confirmAction({
                                title: languageMode === "EN" ? "Delete Question?" : "Padam Soalan?",
                                message: isStd
                                  ? languageMode === "EN"
                                    ? "Delete this standard question? It will be excluded from future practice sets and paper builder selection."
                                    : "Padam soalan standard ini? Soalan ini akan dikecualikan daripada latihan dan pembina peperiksaan akan datang."
                                  : languageMode === "EN"
                                  ? "Delete this custom question?"
                                  : "Padam soalan tersuai ini?",
                                confirmText: languageMode === "EN" ? "Delete" : "Padam",
                                cancelText: languageMode === "EN" ? "Cancel" : "Batal",
                                danger: true,
                                onConfirm: async () => {
                                  await handleDeleteBankItem(q.id);
                                  toast.info(
                                    languageMode === "EN"
                                      ? "Question deleted from bank."
                                      : "Soalan dipadam daripada bank."
                                  );
                                },
                              });
                            }}
                            className="btn-tactile flex items-center gap-1 rounded-lg border border-slate-900 bg-rose-50 px-2 py-1 text-xs font-black text-rose-700 hover:bg-rose-100 shadow-tactile-sm"
                            title={languageMode === "EN" ? "Delete Question" : "Padam Soalan"}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-700" />
                            <span>{languageMode === "EN" ? "Delete" : "Padam"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Prompt */}
                      <div className="mt-2 space-y-1">
                        {norm.story_bm && (
                          <p className="text-xs font-bold text-slate-600 italic bg-[#FAF6EE] p-2 rounded-lg border border-slate-200 line-clamp-2">
                            {norm.story_bm}
                          </p>
                        )}
                        <p className="text-sm font-black text-slate-900 line-clamp-3">
                          {norm.prompt_bm}
                        </p>
                        {norm.prompt_en && (
                          <p className="text-xs italic text-slate-500 line-clamp-2">
                            {norm.prompt_en}
                          </p>
                        )}
                      </div>

                      {/* Visual Diagram Thumbnail */}
                      {!norm.hideVisual && norm.visualSpec && (
                        <div className="my-2 flex flex-col items-center justify-center rounded-xl border-2 border-slate-900 bg-[#FAF6EE] p-2.5 min-h-[120px] max-h-56 overflow-hidden">
                          <QuestionVisualFigure visual={norm.visualSpec} languageMode={languageMode} />
                        </div>
                      )}
                    </div>

                    {/* Answer Fields Summary & Part Assignment */}
                    <div className="space-y-2">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 flex flex-wrap items-center justify-between text-xs font-bold">
                        <span className="text-slate-600">
                          {norm.answerFields?.length || 1} {languageMode === "EN" ? "Field(s)" : "Ruang"} ({norm.answerFields?.[0]?.type || "NUMERIC"})
                        </span>
                        <span className="font-mono text-emerald-800 font-black">
                          {languageMode === "EN" ? "Ans:" : "Jawapan:"}{" "}
                          {norm.answerFields?.[0]?.type === "OPERATOR"
                            ? norm.answerFields?.[0]?.expectedOp || norm.answerFields?.[0]?.expectedAnswer || "+"
                            : norm.answerFields?.[0]?.expectedAnswer ||
                              norm.correctAnswer ||
                              "Tutor Defined"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 px-1 text-xs">
                        <span className="font-bold text-slate-500 text-[11px] shrink-0">
                          {languageMode === "EN" ? "Assign Part:" : "Tugaskan Bahagian:"}
                        </span>
                        <select
                          value={questionPartMap[q.id]?.partId || ""}
                          onChange={(e) => handleReassignQuestionPart(norm, e.target.value)}
                          className="w-auto max-w-[220px] truncate rounded-lg border border-slate-900 bg-white px-2 py-1 text-[11px] font-black text-slate-800 shadow-sm"
                        >
                          <option value="">{languageMode === "EN" ? "Unassigned" : "Belum Ditetapkan"}</option>
                          {currentTopicParts.map((p, pIdx) => {
                            const rawTitle = (languageMode === "EN" && p.title_en ? p.title_en : p.title_bm) || "";
                            const cleanTitle = rawTitle.replace(/^(Bahagian|Part)\s*\d+\s*:\s*/i, "").trim();
                            return (
                              <option key={p.id || pIdx} value={p.id}>
                                {languageMode === "EN" ? "Part" : "Bahagian"} {p.partNo || pIdx + 1}{cleanTitle ? `: ${cleanTitle}` : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── SUB-TAB 2: TOPIC PRACTICE PARTS MANAGER (Year -> Topic -> Parts -> Questions) ─── */}
      {subTab === "TOPIC_PARTS" && (
        <div className="space-y-4">
          <div className="rounded-xl border-2 border-slate-900 bg-sky-50 p-3.5 sm:p-4 shadow-tactile flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm sm:text-base font-black text-slate-900 font-mono">
                {languageMode === "EN" ? "Topic Practice Parts: " : "Bahagian Latihan Topik: "}
                {languageMode === "EN"
                  ? qbTopics.find((t) => t.id === qbTopicId)?.title_en
                  : qbTopics.find((t) => t.id === qbTopicId)?.title_bm}
              </h4>
              <p className="text-xs font-bold text-slate-600 mt-0.5">
                {languageMode === "EN"
                  ? "Students must complete all PUBLISHED parts to master this topic."
                  : "Murid mesti melengkapkan semua bahagian bertaraf TERBIT (PUBLISHED) untuk menguasai topik ini sepenuhnya."}
              </p>
            </div>

            <button
              onClick={() => {
                setEditingPart(null);
                setPartTitleBm(`Bahagian ${currentTopicParts.length + 1}: Latihan Lanjut`);
                setPartTitleEn(`Part ${currentTopicParts.length + 1}: Further Practice`);
                setPartStatus("PUBLISHED");
                setIsPartEditorOpen(true);
              }}
              className="btn-tactile flex items-center gap-1.5 rounded-lg bg-sky-400 px-3.5 py-1.5 text-xs font-black text-slate-950 hover:bg-sky-300 border-2 border-slate-900 shadow-tactile-sm font-mono"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{languageMode === "EN" ? "+ Create New Part" : "+ Cipta Bahagian Baharu"}</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {currentTopicParts.map((part, pIdx) => {
              const partQuestions = part.questions || [];
              const isDraft = part.status === "DRAFT";

              return (
                <div
                  key={part.id || pIdx}
                  className="rounded-xl border-2 border-slate-900 bg-white p-3.5 sm:p-4 shadow-tactile space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-slate-900 bg-amber-300 font-mono text-xs font-black text-slate-950">
                        {part.partNo || pIdx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-slate-900">
                          {languageMode === "EN" && part.title_en ? part.title_en : part.title_bm}
                        </h4>
                        {languageMode !== "EN" && part.title_en && (
                          <p className="text-[11px] italic text-slate-500">{part.title_en}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 font-mono">
                      <span
                        className={`rounded-lg border px-2 py-0.5 text-[11px] font-black ${
                          isDraft
                            ? "border-amber-700 bg-amber-100 text-amber-950"
                            : "border-emerald-700 bg-emerald-100 text-emerald-950"
                        }`}
                      >
                        {isDraft
                          ? languageMode === "EN"
                            ? "DRAFT (Hidden)"
                            : "DRAF (Tersembunyi)"
                          : languageMode === "EN"
                          ? "PUBLISHED (Active)"
                          : "DITERBITKAN (Aktif)"}
                      </span>

                      {/* Part actions */}
                      <button
                        onClick={() => {
                          setEditingPart(part);
                          setPartTitleBm(part.title_bm);
                          setPartTitleEn(part.title_en || "");
                          setPartStatus(part.status || "PUBLISHED");
                          setIsPartEditorOpen(true);
                        }}
                        className="btn-tactile rounded-lg border border-slate-900 bg-white px-2.5 py-1 text-xs font-black text-slate-700 hover:bg-slate-50 shadow-tactile-sm"
                      >
                        {languageMode === "EN" ? "Edit Title" : "Edit Nama"}
                      </button>

                      <button
                        onClick={() => {
                          setTargetPartId(part.id);
                          setIsSelectQuestionsForPartOpen(true);
                        }}
                        className="btn-tactile rounded-lg border border-slate-900 bg-emerald-300 px-2.5 py-1 text-xs font-black text-slate-950 hover:bg-emerald-200 shadow-tactile-sm"
                      >
                        {languageMode === "EN" ? "+ Add Questions" : "+ Tambah Soalan"} ({partQuestions.length})
                      </button>

                      <button
                        onClick={() => {
                          confirmAction({
                            title: languageMode === "EN" ? "Delete Practice Part?" : "Padam Bahagian Latihan?",
                            message: languageMode === "EN"
                              ? "Delete this practice part? Questions inside will become unassigned."
                              : "Padam bahagian latihan ini? Soalan di dalamnya akan menjadi belum ditetapkan.",
                            confirmText: languageMode === "EN" ? "Delete" : "Padam",
                            cancelText: languageMode === "EN" ? "Cancel" : "Batal",
                            danger: true,
                            onConfirm: async () => {
                              await handleDeleteTopicPartAction(qbDarjah, qbTopicId, part.id);
                              toast.info(
                                languageMode === "EN"
                                  ? "Practice part deleted."
                                  : "Bahagian latihan dipadam."
                              );
                            },
                          });
                        }}
                        className="btn-tactile rounded-lg border border-slate-900 bg-rose-50 px-2 py-1 text-xs font-black text-rose-700 hover:bg-rose-100 shadow-tactile-sm"
                        title={languageMode === "EN" ? "Delete Part" : "Padam Bahagian"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Questions in this part */}
                  {partQuestions.length === 0 ? (
                    <p className="text-xs font-bold text-slate-500 py-1 italic">
                      {languageMode === "EN"
                        ? 'No questions in this part yet. Click "+ Add Questions" to assign from bank.'
                        : 'Tiada soalan dalam bahagian ini. Klik "+ Tambah Soalan" untuk memasukkan soalan dari bank.'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {partQuestions.map((q, qIdx) => (
                        <div
                          key={q.id || qIdx}
                          className="rounded-lg border-2 border-slate-900 bg-[#FAF6EE] p-2.5 text-xs font-bold flex flex-col justify-between shadow-tactile-sm"
                        >
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pb-1 border-b border-slate-200 mb-1">
                              <span>
                                {languageMode === "EN" ? `Question ${qIdx + 1}` : `Soalan ${qIdx + 1}`}
                              </span>
                              <span>{q.maxMarks || 1}m</span>
                            </div>
                            <p className="font-black text-slate-900 line-clamp-2">
                              {languageMode === "EN" && q.prompt_en ? q.prompt_en : q.prompt_bm}
                            </p>
                          </div>
                          <div className="mt-2 pt-1.5 border-t border-slate-200 flex items-center justify-between">
                            <button
                              onClick={() => setPreviewQuestion(normalizeQuestionFields(q))}
                              className="text-sky-700 hover:underline font-black text-[11px]"
                            >
                              {languageMode === "EN" ? "Preview" : "Pratonton"}
                            </button>
                            <button
                              onClick={async () => {
                                const nextQuestions = partQuestions.filter((_, idx) => idx !== qIdx);
                                await handleSaveTopicPartAction(qbDarjah, qbTopicId, {
                                  ...part,
                                  questions: nextQuestions,
                                });
                              }}
                              className="text-rose-600 hover:underline font-black text-[11px]"
                            >
                              {languageMode === "EN" ? "Remove" : "Keluarkan"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: QUESTION EDITOR & LIVE PREVIEW (Shared with Paper Builder) ─── */}
      <QuestionEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingQuestion(null);
        }}
        onSave={handleSaveQuestionSubmit}
        initialQuestion={editingQuestion}
        darjah={qbDarjah}
        topicId={qbTopicId}
        topics={qbTopics}
        practiceParts={currentTopicParts}
        languageMode={languageMode}
        isPaperBuilder={false}
      />

      {/* ─── MODAL 2: TOPIC PART TITLE & STATUS EDITOR ─── */}
      {isPartEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-xl border-2 border-slate-900 bg-white p-5 shadow-tactile space-y-4">
            <h4 className="text-sm sm:text-base font-black text-slate-900 font-mono">
              {editingPart
                ? languageMode === "EN"
                  ? "Edit Part Details"
                  : "Edit Maklumat Bahagian"
                : languageMode === "EN"
                ? "Create New Part"
                : "Cipta Bahagian Baharu"}
            </h4>

            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">
                  {languageMode === "EN" ? "Part Title (BM) *" : "Tajuk Bahagian (BM) *"}
                </label>
                <input
                  type="text"
                  value={partTitleBm}
                  onChange={(e) => setPartTitleBm(e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-900 p-2 font-black shadow-tactile-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">
                  {languageMode === "EN" ? "Part Title (EN)" : "Tajuk Bahagian (EN)"}
                </label>
                <input
                  type="text"
                  value={partTitleEn}
                  onChange={(e) => setPartTitleEn(e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-900 p-2 font-bold shadow-tactile-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">
                  {languageMode === "EN" ? "Availability Status" : "Status Ketersediaan"}
                </label>
                <select
                  value={partStatus}
                  onChange={(e) => setPartStatus(e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-900 p-2 font-black shadow-tactile-sm font-mono"
                >
                  <option value="PUBLISHED">
                    {languageMode === "EN"
                      ? "🟢 PUBLISHED (Visible to students)"
                      : "🟢 DITERBITKAN (Dapat dilihat oleh murid)"}
                  </option>
                  <option value="DRAFT">
                    {languageMode === "EN"
                      ? "🟡 DRAFT (Hidden from students)"
                      : "🟡 DRAF (Tersembunyi daripada murid)"}
                  </option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsPartEditorOpen(false)}
                className="btn-tactile rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-700"
              >
                {languageMode === "EN" ? "Cancel" : "Batal"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!partTitleBm.trim()) return;
                  const partPayload = {
                    ...(editingPart || {}),
                    id: editingPart?.id,
                    title_bm: partTitleBm.trim(),
                    title_en: partTitleEn.trim(),
                    status: partStatus,
                    questions: editingPart?.questions || [],
                  };
                  await handleSaveTopicPartAction(qbDarjah, qbTopicId, partPayload);
                  setIsPartEditorOpen(false);
                }}
                className="btn-tactile rounded-lg border-2 border-slate-900 bg-emerald-400 px-3.5 py-1.5 text-xs font-black text-slate-950 hover:bg-emerald-300 shadow-tactile-sm"
              >
                {languageMode === "EN" ? "Save Part" : "Simpan Bahagian"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: SELECT QUESTIONS FOR PART FROM BANK ─── */}
      {isSelectQuestionsForPartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl border-2 border-slate-900 bg-white p-5 shadow-tactile space-y-3 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5">
              <h4 className="text-sm sm:text-base font-black text-slate-900 font-mono">
                {languageMode === "EN"
                  ? "Select Questions from Bank to Assign to Part"
                  : "Pilih Soalan dari Bank untuk Dimasukkan ke Bahagian"}
              </h4>
              <button
                onClick={() => setIsSelectQuestionsForPartOpen(false)}
                className="rounded-lg border-2 border-slate-900 bg-white p-1 hover:bg-rose-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {allQuestionsForView.map((q, idx) => {
                const targetPart = currentTopicParts.find((p) => p.id === targetPartId);
                const isAlreadyInPart = (targetPart?.questions || []).some((pq) => pq.id === q.id);

                return (
                  <div
                    key={q.id || idx}
                    className="rounded-lg border-2 border-slate-900 bg-[#FAF6EE] p-2.5 text-xs font-bold flex items-center justify-between gap-3 shadow-tactile-sm"
                  >
                    <div className="flex-1 pr-2">
                      <span className="font-mono text-[11px] text-slate-500 block">
                        ID: {q.id} • {q.maxMarks || 1}m
                      </span>
                      <p className="font-black text-slate-900 line-clamp-2">
                        {languageMode === "EN" && q.prompt_en ? q.prompt_en : q.prompt_bm}
                      </p>
                    </div>

                    <button
                      disabled={isAlreadyInPart}
                      onClick={async () => {
                        const target = currentTopicParts.find((p) => p.id === targetPartId);
                        if (!target) return;
                        const nextQuestions = [...(target.questions || []), q];
                        await handleSaveTopicPartAction(qbDarjah, qbTopicId, {
                          ...target,
                          questions: nextQuestions,
                        });
                      }}
                      className={`btn-tactile rounded-lg border-2 border-slate-900 px-2.5 py-1 text-xs font-black shadow-tactile-sm ${
                        isAlreadyInPart
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed border-slate-400"
                          : "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                      }`}
                    >
                      {isAlreadyInPart
                        ? languageMode === "EN"
                          ? "Already Added"
                          : "Telah Ada"
                        : languageMode === "EN"
                        ? "+ Add"
                        : "+ Masukkan"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setIsSelectQuestionsForPartOpen(false)}
                className="btn-tactile rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-700"
              >
                {languageMode === "EN" ? "Close" : "Tutup"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: STUDENT VIEW PREVIEW ─── */}
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
