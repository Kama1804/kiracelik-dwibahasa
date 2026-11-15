// src/App.jsx
// Authentic Malaysian Primary School Buku Latihan Matematik Kotak (KSSR Tahap 1: Tahun 1, 2 & 3)
// Tactile Neo-Brutalist Swiss Educational Grid design, dedicated PIN login homepage, role-isolated tutor workspace.

import { useState, useEffect } from "react";
import TopNavbar from "./components/layout/TopNavbar.jsx";
import Footer from "./components/layout/Footer.jsx";
import PracticeModal from "./components/PracticeModal.jsx";
import ExamModal from "./components/ExamModal.jsx";
import AnalyticsDashboard from "./components/AnalyticsDashboard.jsx";
import PinGateModal from "./components/auth/PinGateModal.jsx";
import PinLoginHomepage from "./components/auth/PinLoginHomepage.jsx";
import ToastContainer from "./components/ui/ToastContainer.jsx";
import ConfirmModal from "./components/ui/ConfirmModal.jsx";
import { KSSR_SYLLABUS, getTopicsByDarjah } from "./engine/syllabusConfig.js";
import {
  loadDB,
  loadDBSync,
  saveDB,
  fetchRemoteDB,
  recordPracticeScore,
  recordPartPracticeScore,
  recordExamSubmission,
  hasPendingExam,
  getExamLockReason,
  getPublishedPaper,
  finalizeExamAttempt,
  saveDraftExamMarks,
  addStudentProfile,
  deleteStudentProfile,
  updateUserPin,
  setStudentYearAccess,
  setStudentStatus,
  hasYearAccess,
  saveCustomQuestion,
  deleteCustomQuestion,
  saveExamPaper,
  publishExamPaper,
  applyTutorMarkOverride,
  exportBackupJSON,
  trackSubSkillUsage,
  saveQuestionBankItem,
  deleteQuestionBankItem,
  saveTopicPart,
  deleteTopicPart,
  updateStudentCurrentDarjah,
  updateStudentProfile,
  getTopicParts,
} from "./services/storageService.js";
import {
  CheckCircle2,
  Lock,
  Play,
  Trophy,
  Sparkles,
  ShieldAlert,
  Clock,
  GraduationCap,
  Layers,
  X,
} from "lucide-react";

export default function App() {
  const [db, setDb] = useState(() => loadDBSync());
  const [authenticatedUserId, setAuthenticatedUserId] = useState(() => {
    try {
      return sessionStorage.getItem("kiracelik_session_user") || null;
    } catch {
      return null;
    }
  });

  const [selectedDarjah, setSelectedDarjah] = useState(1);
  const [selectedTopicForParts, setSelectedTopicForParts] = useState(null);
  const [activePracticeTopic, setActivePracticeTopic] = useState(null);
  const [activePracticePart, setActivePracticePart] = useState(null);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [pinModalUser, setPinModalUser] = useState(null);

  // Hydrate from asynchronous persistence on mount & sync with remote Cloudflare D1
  useEffect(() => {
    let isMounted = true;
    loadDB()
      .then((loaded) => {
        if (isMounted && loaded) {
          setDb(loaded);
        }
      })
      .catch((err) => {
        console.error("Failed to load database:", err);
      });

    // Remote D1 hydration on mount
    fetchRemoteDB()
      .then((remote) => {
        if (isMounted && remote) {
          setDb(remote);
        }
      })
      .catch(() => {});

    // Listen to focus and visibility change for seamless cross-device / multi-tab synchronization
    const handleSyncOnFocus = () => {
      fetchRemoteDB()
        .then((remote) => {
          if (isMounted && remote) {
            setDb(remote);
          }
        })
        .catch(() => {});
    };

    window.addEventListener("focus", handleSyncOnFocus);
    document.addEventListener("visibilitychange", handleSyncOnFocus);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleSyncOnFocus);
      document.removeEventListener("visibilitychange", handleSyncOnFocus);
    };
  }, []);

  // Defensive guard for db.users
  const userList = Array.isArray(db?.users) ? db.users : [];

  // Authenticated user (null means at PIN Login Homepage)
  const authenticatedUser = authenticatedUserId
    ? userList.find((u) => u.id === authenticatedUserId) || null
    : null;

  // Selected student for tutor workspace inspection
  const [selectedStudentId, setSelectedStudentId] = useState("usr_adik_01");
  const studentUser =
    (authenticatedUser?.role === "STUDENT" ? authenticatedUser : null) ||
    userList.find((u) => u.id === selectedStudentId && u.role === "STUDENT") ||
    userList.find((u) => u.role === "STUDENT") ||
    userList[0] ||
    null;

  const languageMode = db?.languageMode === "DWIBAHASA" ? "BM" : db?.languageMode || "BM";

  const setLanguageMode = async (mode) => {
    const safeMode = mode === "DWIBAHASA" ? "BM" : mode;
    const next = { ...db, languageMode: safeMode };
    setDb(next);
    await saveDB(next);
  };

  const handleLoginSuccess = async (user, updatedDb) => {
    let next = updatedDb && typeof updatedDb.then === "function" ? await updatedDb : (updatedDb || db);
    if (!next || typeof next !== "object" || !Array.isArray(next.users)) {
      next = loadDBSync();
    }
    setDb(next);
    await saveDB(next);
    setAuthenticatedUserId(user.id);
    try {
      sessionStorage.setItem("kiracelik_session_user", user.id);
    } catch {
      // ignore
    }
    if (user.role === "STUDENT") {
      setSelectedStudentId(user.id);
      setSelectedDarjah(user.current_darjah || 1);
    }
  };

  const handleLogout = () => {
    setAuthenticatedUserId(null);
    try {
      sessionStorage.removeItem("kiracelik_session_user");
    } catch {
      // ignore
    }
    // Remote refresh on logout to ensure any newly updated PINs or records are immediately ready for homepage
    fetchRemoteDB()
      .then((remote) => {
        if (remote) setDb(remote);
      })
      .catch(() => {});
  };

  const handleSetStudentStatus = async (studentId, status) => {
    const next = await setStudentStatus(db, studentId, status);
    setDb(next);
  };

  const handleFinishPractice = async (
    scorePercentage,
    elapsedSec,
    partIdOrSubSkills = null,
    totalQuestions = null,
    correctCount = null
  ) => {
    if (!activePracticeTopic) return;
    const currentTopicId = activePracticeTopic.id;
    const currentStudentId = studentUser.id;
    let next = db;
    if (typeof partIdOrSubSkills === "string") {
      next = await recordPartPracticeScore(
        next,
        currentStudentId,
        selectedDarjah,
        currentTopicId,
        partIdOrSubSkills,
        scorePercentage,
        elapsedSec,
        totalQuestions,
        correctCount
      );
    } else {
      next = await recordPracticeScore(
        next,
        currentStudentId,
        currentTopicId,
        scorePercentage,
        elapsedSec
      );
      if (Array.isArray(partIdOrSubSkills) && partIdOrSubSkills.length > 0) {
        for (const sid of partIdOrSubSkills) {
          next = await trackSubSkillUsage(next, currentStudentId, currentTopicId, sid);
        }
      }
    }
    setDb(next);
    setActivePracticeTopic(null);
    setActivePracticePart(null);
  };

  const handleFinishExam = async (examSummary) => {
    const next = await recordExamSubmission(
      db,
      studentUser.id,
      selectedDarjah,
      examSummary
    );
    setDb(next);
    setIsExamModalOpen(false);
  };

  const handleAddStudent = async (name, avatar, darjah) => {
    const next = await addStudentProfile(db, name, avatar, darjah);
    setDb(next);
    setSelectedStudentId(next.activeUserId);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (imported.users && imported.topicProgress) {
          await saveDB(imported);
          setDb(imported);
          alert("Data berjaya diimport! / Backup restored!");
        }
      } catch {
        alert("Fail JSON tidak sah! / Invalid JSON file!");
      }
    };
    reader.readAsText(file);
  };

  const renderText = (
    bm,
    en,
    primaryClass = "",
    subClass = "text-xs text-slate-600 italic block font-sans font-medium"
  ) => {
    if (languageMode === "BM") return <span className={primaryClass}>{bm}</span>;
    if (languageMode === "EN") return <span className={primaryClass}>{en}</span>;
    return (
      <span>
        <span className={primaryClass}>{bm}</span>
        <span className={subClass}>{en}</span>
      </span>
    );
  };

  // PIN login homepage for unauthenticated sessions
  if (!authenticatedUser) {
    return (
      <>
        <PinLoginHomepage
          db={db}
          languageMode={languageMode}
          setLanguageMode={setLanguageMode}
          onLoginSuccess={handleLoginSuccess}
        />
        <ToastContainer />
      </>
    );
  }

  // Check if student was deactivated while session is active
  if (authenticatedUser.role === "STUDENT" && authenticatedUser.status === "Deactivate") {
    handleLogout();
    return null;
  }

  const isGraduatedStudent =
    authenticatedUser.role === "STUDENT" && authenticatedUser.status === "Graduate";

  const topics = getTopicsByDarjah(selectedDarjah);
  const studentProgress =
    db?.topicProgress && studentUser?.id ? db.topicProgress[studentUser.id] || {} : {};
  const completedCount = topics.filter(
    (t) => studentProgress[t.id]?.status === "COMPLETED"
  ).length;
  const isPendingExamThisYear = studentUser?.id
    ? hasPendingExam(db, studentUser.id, selectedDarjah)
    : false;
  const examLockReason = studentUser?.id
    ? getExamLockReason(db, studentUser.id, selectedDarjah, languageMode)
    : null;
  const isExamReady = examLockReason === null;
  const publishedPaper = studentUser?.id
    ? getPublishedPaper(db, selectedDarjah, studentUser.id)
    : null;
  const isDarjahUnlocked =
    authenticatedUser.role === "TUTOR" ||
    (studentUser?.id ? hasYearAccess(db, studentUser.id, selectedDarjah) : false);

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-slate-900 flex flex-col justify-between">
      <div className="flex-1 pb-16">
        {/* ─── STICKY TOP NAVBAR: Welcome, {name} & Logout ─── */}
      <TopNavbar
        activeUser={authenticatedUser}
        languageMode={languageMode}
        setLanguageMode={setLanguageMode}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-6">
        {/* ─── CASE 1 & 2: DEDICATED TUTOR WORKSPACE ─── */}
        {authenticatedUser.role === "TUTOR" ? (
          <AnalyticsDashboard
            db={db}
            studentUser={studentUser}
            activeUser={authenticatedUser}
            selectedDarjah={selectedDarjah}
            languageMode={languageMode}
            onTutorBonusMark={async (examId) =>
              setDb(await applyTutorMarkOverride(db, examId))
            }
            onSaveDraftMarks={async (attemptId, draftGrades) =>
              setDb(await saveDraftExamMarks(db, attemptId, draftGrades))
            }
            onFinalizeExam={async (attemptId, grades) =>
              setDb(await finalizeExamAttempt(db, attemptId, grades))
            }
            onAddStudent={handleAddStudent}
            onDeleteStudent={async (studentId) => {
              const next = await deleteStudentProfile(db, studentId);
              setDb(next);
              if (selectedStudentId === studentId) {
                const fallback = next.users.find((u) => u.role === "STUDENT")?.id || "";
                setSelectedStudentId(fallback);
              }
            }}
            onUpdateStudentPin={async (userId, newPin) =>
              setDb(await updateUserPin(db, userId, newPin))
            }
            onSetStudentYearAccess={async (studentId, darjah, access) =>
              setDb(await setStudentYearAccess(db, studentId, darjah, access))
            }
            onSetStudentStatus={handleSetStudentStatus}
            onUpdateStudentCurrentDarjah={async (studentId, darjah) =>
              setDb(await updateStudentCurrentDarjah(db, studentId, darjah))
            }
            onUpdateStudentProfile={async (studentId, updates) =>
              setDb(await updateStudentProfile(db, studentId, updates))
            }
            onSaveCustomQuestion={async (q) =>
              setDb(await saveCustomQuestion(db, q))
            }
            onDeleteCustomQuestion={async (qId) =>
              setDb(await deleteCustomQuestion(db, qId))
            }
            onSaveQuestionBankItem={async (item) =>
              setDb(await saveQuestionBankItem(db, item))
            }
            onDeleteQuestionBankItem={async (itemId) =>
              setDb(await deleteQuestionBankItem(db, itemId))
            }
            onSaveTopicPart={async (darjah, topicId, part) =>
              setDb(await saveTopicPart(db, darjah, topicId, part))
            }
            onDeleteTopicPart={async (darjah, topicId, partId) =>
              setDb(await deleteTopicPart(db, darjah, topicId, partId))
            }
            onSaveExamPaper={async (darjah, paperData, targetStudentId) =>
              setDb(await saveExamPaper(db, darjah, paperData, targetStudentId))
            }
            onPublishExamPaper={async (darjah, paperData, targetStudentId) => {
              const res = await publishExamPaper(db, darjah, paperData, targetStudentId);
              if (res.success) {
                setDb(res.db);
              }
              return res;
            }}
            onSelectStudent={(id) => setSelectedStudentId(id)}
            onExportJSON={() => exportBackupJSON(db)}
            onImportJSON={handleImportJSON}
            onOpenPinModal={(user) => setPinModalUser(user)}
          />
        ) : (
          /* ─── STUDENT LEARNING DASHBOARD ─── */
          <>
            {/* Graduate Banner (If Student is Graduated) */}
            {isGraduatedStudent && (
              <div className="mb-6 rounded-3xl border-2 border-violet-900 bg-violet-100 p-5 shadow-tactile text-violet-950 flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-violet-900 bg-violet-300 text-2xl shadow-tactile-sm flex-shrink-0">
                  <GraduationCap className="h-6 w-6 text-violet-950" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    {languageMode === "EN"
                      ? "Graduated Student (View-Only Mode)"
                      : "Status Tamat Belajar (Mod Semakan Sahaja)"}
                  </h3>
                  <p className="text-xs font-bold text-violet-800 leading-relaxed mt-0.5">
                    {languageMode === "EN"
                      ? "You have successfully graduated! You may view your mastery progress and exam records, but new practice and examination attempts are disabled."
                      : "Tahniah! Anda telah tamat pengajian. Anda boleh menyemak penguasaan topik dan rekod peperiksaan anda, namun latihan dan peperiksaan baharu telah dinyahaktifkan."}
                  </p>
                </div>
              </div>
            )}

            {/* Darjah 1, 2, 3 Selector Tabs */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  darjah: 1,
                  range: "Nombor hingga 100",
                  rangeEn: "Numbers up to 100",
                  color: "bg-emerald-300",
                },
                {
                  darjah: 2,
                  range: "Nombor hingga 1 000",
                  rangeEn: "Numbers up to 1 000",
                  color: "bg-amber-300",
                },
                {
                  darjah: 3,
                  range: "Nombor hingga 10 000",
                  rangeEn: "Numbers up to 10 000",
                  color: "bg-violet-300",
                },
              ].map((item) => {
                const unlocked = hasYearAccess(db, authenticatedUser.id, item.darjah);
                const isSelected = selectedDarjah === item.darjah;

                return (
                  <button
                    key={item.darjah}
                    onClick={() => setSelectedDarjah(item.darjah)}
                    className={`btn-tactile flex items-center justify-between rounded-3xl p-5 text-left transition-all ${
                      isSelected
                        ? `${item.color} text-slate-950 shadow-tactile`
                        : "bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                        {languageMode === "EN" ? "KSSR Level 1" : "KSSR Semakan Tahap 1"}
                      </span>
                      <h2 className="text-xl font-black font-mono text-slate-900">
                        {languageMode === "EN" ? `Year ${item.darjah}` : `Tahun ${item.darjah}`}
                      </h2>
                      <p className="mt-0.5 text-xs font-bold text-slate-600">
                        {languageMode === "EN"
                          ? item.rangeEn
                          : languageMode === "DWIBAHASA"
                          ? `${item.range} / ${item.rangeEn}`
                          : item.range}
                      </p>
                    </div>
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-slate-900 ${
                        unlocked
                          ? "bg-white text-emerald-700 shadow-tactile-sm"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {unlocked ? (
                        <Sparkles className="h-5 w-5" />
                      ) : (
                        <Lock className="h-5 w-5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Mastery Progress Bar & Final Exam Gate Card */}
            <div className="mb-8 rounded-3xl border-2 border-slate-900 bg-white p-6 shadow-tactile">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-900 bg-sky-100 px-3 py-0.5 text-xs font-black text-sky-950">
                    📘 SUKATAN PELAJARAN KSSR SEMAKAN
                  </div>
                  <h3 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl font-mono">
                    {renderText(
                      KSSR_SYLLABUS[selectedDarjah].title_bm,
                      KSSR_SYLLABUS[selectedDarjah].title_en
                    )}
                  </h3>
                  <p className="mt-1 text-xs font-bold text-slate-600 sm:text-sm">
                    {renderText(
                      `Kemajuan Topik: ${completedCount} / ${topics.length} Selesai (Lulus ≥ 70%)`,
                      `Topic Progress: ${completedCount} / ${topics.length} Completed (Pass ≥ 70%)`
                    )}
                  </p>
                </div>

                <button
                  disabled={isGraduatedStudent || !isExamReady || !publishedPaper}
                  onClick={() => {
                    if (isGraduatedStudent) return;
                    if (!isExamReady) return;
                    if (!publishedPaper) {
                      alert(
                        languageMode === "EN"
                          ? "Waiting for tutor to publish the examination paper for Year " + selectedDarjah + "."
                          : "Menunggu guru menerbitkan kertas peperiksaan untuk Tahun " + selectedDarjah + "."
                      );
                      return;
                    }
                    setIsExamModalOpen(true);
                  }}
                  className={`btn-tactile flex items-center gap-2.5 rounded-2xl px-5 py-3.5 text-sm font-black transition-all ${
                    isGraduatedStudent
                      ? "opacity-50 cursor-not-allowed bg-slate-100 border-2 border-slate-300 text-slate-400 shadow-none"
                      : isPendingExamThisYear
                      ? "bg-amber-100 border-2 border-amber-600 text-amber-900 cursor-not-allowed shadow-none"
                      : isExamReady && publishedPaper
                      ? "bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-tactile"
                      : "cursor-not-allowed bg-slate-100 border-2 border-slate-300 text-slate-400 shadow-none"
                  }`}
                >
                  {isPendingExamThisYear ? (
                    <Clock className="h-5 w-5 text-amber-800" />
                  ) : isExamReady && publishedPaper ? (
                    <Trophy className="h-5 w-5 text-amber-900 fill-current" />
                  ) : (
                    <Lock className="h-5 w-5" />
                  )}
                  <span>
                    {isGraduatedStudent
                      ? languageMode === "EN"
                        ? "Graduated (Exams Disabled)"
                        : "Tamat Belajar (Ujian Dinyahaktif)"
                      : isPendingExamThisYear
                      ? examLockReason
                      : !isExamReady
                      ? examLockReason
                      : !publishedPaper
                      ? languageMode === "EN"
                        ? "Waiting for Tutor to Publish Exam"
                        : "Menunggu Guru Menerbitkan Peperiksaan"
                      : languageMode === "EN"
                      ? `Final Exam Year ${selectedDarjah} (${publishedPaper.totalQuestions}Q / ${publishedPaper.totalMarks}M)`
                      : languageMode === "DWIBAHASA"
                      ? `Ujian Akhir Tahun ${selectedDarjah} (${publishedPaper.totalQuestions}Q / ${publishedPaper.totalMarks}M)`
                      : `Ujian Akhir Tahun ${selectedDarjah} (${publishedPaper.totalQuestions} Soalan / ${publishedPaper.totalMarks} Markah)`}
                  </span>
                </button>
              </div>

              {/* Step Progress Line */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-black text-slate-700 mb-1.5 font-mono">
                  <span>PENGUASAAN TOPIK</span>
                  <span>{Math.round((completedCount / (topics.length || 1)) * 100)}%</span>
                </div>
                <div className="h-5 w-full overflow-hidden rounded-full border-2 border-slate-900 bg-slate-100 p-0.5 shadow-inner">
                  <div
                    className="h-full rounded-full bg-emerald-400 border-r-2 border-slate-900 transition-all duration-500"
                    style={{
                      width: `${Math.round(
                        (completedCount / (topics.length || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Locked Darjah Warning or Topic Workbook Cards */}
            {!isDarjahUnlocked ? (
              <div className="rounded-3xl border-2 border-slate-900 bg-amber-100 p-8 text-center shadow-tactile">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-amber-300 text-amber-950 shadow-tactile-sm">
                  <Lock className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-xl font-black text-slate-900 font-mono">
                  Tahun {selectedDarjah} Masih Dikunci!
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs font-bold text-slate-700 sm:text-sm">
                  Sila minta guru membuka akses Tahun {selectedDarjah} atau lulus peperiksaan Tahun sebelumnya.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {topics.map((topic) => {
                  const prog = studentProgress[topic.id] || {
                    status: "IN_PROGRESS",
                    bestScore: 0,
                  };
                  const isDone = prog.status === "COMPLETED";
                  const isRetake = prog.status === "RETAKE_REQUIRED";
                  const topicPartsList = getTopicParts(db, selectedDarjah, topic.id).filter(
                    (p) => p.status !== "DRAFT"
                  );
                  const userCompletedParts = (prog.completedPartIds || []).filter((id) =>
                    topicPartsList.some((p) => p.id === id)
                  );

                  return (
                    <div
                      key={topic.id}
                      className={`flex flex-col justify-between rounded-3xl border-2 border-slate-900 p-5 shadow-tactile transition-all ${
                        isDone
                          ? "bg-emerald-50/60"
                          : isRetake
                          ? "bg-rose-50/70"
                          : "bg-white hover:bg-sky-50/30"
                      }`}
                    >
                      <div>
                        {/* Header Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="rounded-lg border-2 border-slate-900 bg-sky-200 px-3 py-1 font-mono text-xs font-black text-slate-950 shadow-tactile-sm">
                            {languageMode === "EN" ? `TOPIC ${topic.order}` : `TOPIK ${topic.order}`}
                          </span>
                          {isDone && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-emerald-300 px-2.5 py-1 text-xs font-black text-emerald-950 shadow-tactile-sm">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {languageMode === "EN" ? "PASSED" : "LULUS"} ({prog.bestScore}%)
                            </span>
                          )}
                          {isRetake && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-rose-300 px-2.5 py-1 text-xs font-black text-rose-950 shadow-tactile-sm">
                              <ShieldAlert className="h-3.5 w-3.5" /> {languageMode === "EN" ? "REVISION" : "ULANG KAJI"}
                            </span>
                          )}
                        </div>

                        <h4 className="mt-3 text-lg font-black text-slate-900">
                          {renderText(topic.title_bm, topic.title_en)}
                        </h4>
                        <p className="mt-1 text-xs text-slate-600 font-bold">
                          {renderText(topic.desc_bm, topic.desc_en)}
                        </p>

                        {/* Topic Parts Progress Indicator */}
                        {topicPartsList.length > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md border border-slate-900 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                              <Layers className="h-3 w-3 text-sky-600" />
                              <span>
                                {languageMode === "EN"
                                  ? `Parts: ${userCompletedParts.length}/${topicPartsList.length} Completed`
                                  : `Bahagian: ${userCompletedParts.length}/${topicPartsList.length} Selesai`}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Score & Practice Button */}
                      <div className="mt-5 flex items-center justify-between border-t-2 border-slate-200 pt-4">
                        <div className="text-xs font-black text-slate-700">
                          {languageMode === "EN" ? "Best Score: " : "Skor Terbaik: "}
                          <span className="font-mono text-base font-black text-slate-950">
                            {prog.bestScore}%
                          </span>
                        </div>

                        <button
                          disabled={isGraduatedStudent}
                          onClick={() => setSelectedTopicForParts(topic)}
                          className={`btn-tactile flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all ${
                            isGraduatedStudent
                              ? "opacity-50 cursor-not-allowed bg-slate-200 text-slate-500 shadow-none border-2 border-slate-300"
                              : "bg-sky-400 text-slate-950 hover:bg-sky-300 shadow-tactile-sm"
                          }`}
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>
                            {isGraduatedStudent
                              ? languageMode === "EN"
                                ? "Graduated (View Only)"
                                : "Tamat Belajar"
                              : languageMode === "EN"
                              ? "Select Part"
                              : "Pilih Bahagian"}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* ─── TOPIC PARTS SELECTION MODAL ─── */}
      {selectedTopicForParts && (() => {
        const partsList = getTopicParts(db, selectedDarjah, selectedTopicForParts.id).filter(
          (p) => p.status !== "DRAFT"
        );
        const userProgress = db.topicProgress?.[studentUser.id]?.[selectedTopicForParts.id] || {};
        const completedIds = userProgress.completedPartIds || [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
            <div className="relative max-h-[90vh] max-w-2xl w-full rounded-3xl border-2 border-slate-900 bg-white p-6 sm:p-7 shadow-tactile overflow-y-auto">
              <div className="flex items-start justify-between gap-3 border-b-2 border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-slate-900 bg-sky-200 px-2.5 py-0.5 text-xs font-black text-slate-900">
                      {languageMode === "EN"
                        ? `Topic ${selectedTopicForParts.order} • Year ${selectedDarjah}`
                        : `Topik ${selectedTopicForParts.order} • Tahun ${selectedDarjah}`}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {languageMode === "EN"
                        ? `${partsList.length} ${partsList.length === 1 ? "Part" : "Parts"} Available`
                        : `${partsList.length} Bahagian Tersedia`}
                    </span>
                  </div>
                  <h3 className="mt-2 text-xl font-black text-slate-900">
                    {languageMode === "EN" ? selectedTopicForParts.title_en : selectedTopicForParts.title_bm}
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-600 mt-0.5">
                    {languageMode === "EN"
                      ? "Complete all published parts (≥ 70%) to unlock topic mastery and final exam eligibility."
                      : "Selesaikan semua bahagian latihan berstatus lulus (≥ 70%) untuk menguasai topik dan melayakkan diri ke peperiksaan akhir."}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTopicForParts(null)}
                  className="btn-tactile rounded-xl border-2 border-slate-900 bg-white p-2 hover:bg-slate-50"
                  aria-label={languageMode === "EN" ? "Close" : "Tutup"}
                  title={languageMode === "EN" ? "Close" : "Tutup"}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Parts List */}
              <div className="mt-5 space-y-3.5">
                {partsList.map((part, idx) => {
                  const isPartDone = completedIds.includes(part.id);
                  const qCount = part.questions?.length || 0;

                  return (
                    <div
                      key={part.id || idx}
                      className={`rounded-2xl border-2 border-slate-900 p-4 sm:p-5 transition-all flex flex-wrap items-center justify-between gap-4 ${
                        isPartDone ? "bg-emerald-50/70" : "bg-[#FAF6EE]"
                      }`}
                    >
                      <div className="space-y-1 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-slate-700">
                            {languageMode === "EN"
                              ? `Part ${part.partNo || idx + 1}`
                              : `Bahagian ${part.partNo || idx + 1}`}
                          </span>
                          {isPartDone ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-600 bg-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-950">
                              <CheckCircle2 className="h-3 w-3" /> {languageMode === "EN" ? "PASSED" : "LULUS"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border border-slate-400 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              ⏳ {languageMode === "EN" ? "INCOMPLETE" : "BELUM SELESAI"}
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-black text-slate-900">
                          {languageMode === "EN" ? part.title_en || part.title_bm : part.title_bm}
                        </h4>
                        <p className="text-xs font-bold text-slate-600">
                          {languageMode === "EN"
                            ? `${qCount} practice questions • Minimum passing score: 70%`
                            : `${qCount} soalan latihan • Skor minimum lulus: 70%`}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setActivePracticeTopic(selectedTopicForParts);
                          setActivePracticePart(part);
                          setSelectedTopicForParts(null);
                        }}
                        className={`btn-tactile flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-black border-2 border-slate-900 transition-all ${
                          isPartDone
                            ? "bg-white text-slate-800 hover:bg-slate-50"
                            : "bg-sky-400 text-slate-950 hover:bg-sky-300 shadow-tactile-sm"
                        }`}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>
                          {isPartDone
                            ? languageMode === "EN"
                              ? "Retake Part"
                              : "Ulang Bahagian"
                            : languageMode === "EN"
                            ? "Start Part"
                            : "Mula Bahagian"}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Close Button */}
              <div className="mt-6 flex justify-end border-t-2 border-slate-100 pt-4">
                <button
                  onClick={() => setSelectedTopicForParts(null)}
                  className="btn-tactile rounded-xl border-2 border-slate-900 bg-white px-5 py-2 text-xs sm:text-sm font-black text-slate-800 hover:bg-slate-50 shadow-tactile-sm"
                >
                  {languageMode === "EN" ? "Close" : "Tutup"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      </div>

      {/* Universal Footer */}
      <Footer languageMode={languageMode} />

      {/* Practice Modal */}
      {activePracticeTopic && (
        <PracticeModal
          topic={activePracticeTopic}
          part={activePracticePart}
          darjah={selectedDarjah}
          languageMode={languageMode}
          recentSubSkills={
            db.topicProgress?.[studentUser.id]?.[activePracticeTopic.id]?.recentQuestionHashes || []
          }
          customQuestions={db.customQuestions || []}
          onClose={() => {
            setActivePracticeTopic(null);
            setActivePracticePart(null);
          }}
          onFinishPractice={handleFinishPractice}
        />
      )}

      {/* Final Exam Modal */}
      {isExamModalOpen && (
        <ExamModal
          darjah={selectedDarjah}
          languageMode={languageMode}
          paper={publishedPaper}
          onClose={() => setIsExamModalOpen(false)}
          onSubmitExamResult={handleFinishExam}
        />
      )}

      {/* Tactile PIN Authentication Modal (Fallback / Direct) */}
      {pinModalUser && (
        <PinGateModal
          targetUser={pinModalUser}
          currentDb={db}
          languageMode={languageMode}
          onSuccess={async (updatedDb, user) => {
            let next = updatedDb && typeof updatedDb.then === "function" ? await updatedDb : (updatedDb || db);
            if (!next || typeof next !== "object" || !Array.isArray(next.users)) {
              next = loadDBSync();
            }
            setDb(next);
            await saveDB(next);
            setPinModalUser(null);
            const target = user || pinModalUser;
            if (target) {
              setAuthenticatedUserId(target.id);
              try {
                sessionStorage.setItem("kiracelik_session_user", target.id);
              } catch {
                // ignore
              }
              if (target.role === "STUDENT") {
                setSelectedStudentId(target.id);
                setSelectedDarjah(target.current_darjah || 1);
              }
            }
          }}
          onCancel={() => setPinModalUser(null)}
        />
      )}

      {/* Tactile Toast Notifications & Confirmation Dialog */}
      <ToastContainer />
      <ConfirmModal />
    </div>
  );
}
