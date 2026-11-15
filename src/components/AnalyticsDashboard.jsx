// src/components/AnalyticsDashboard.jsx
// Tactile Neo-Brutalist Swiss Educational Grid Dashboard
// Coordinated tutor workspace: Performance, Question Bank, Paper Builder, and Student Management tabs.
// Full BM | EN | DWIBAHASA localization support.

import { useState } from "react";
import PerformanceTab from "./tutor/PerformanceTab.jsx";
import QuestionBankTab from "./tutor/QuestionBankTab.jsx";
import PaperBuilderTab from "./tutor/PaperBuilderTab.jsx";
import StudentManagementTab from "./tutor/StudentManagementTab.jsx";
import TutorReviewModal from "./TutorReviewModal.jsx";

export default function AnalyticsDashboard({
  db,
  studentUser,
  activeUser,
  selectedDarjah,
  onTutorBonusMark,
  onSaveDraftMarks,
  onFinalizeExam,
  onAddStudent,
  onDeleteStudent,
  onUpdateStudentPin,
  onSetStudentYearAccess,
  onSetStudentStatus,
  onUpdateStudentCurrentDarjah,
  onUpdateStudentProfile,
  onSaveCustomQuestion,
  onDeleteCustomQuestion,
  onSaveQuestionBankItem,
  onDeleteQuestionBankItem,
  onSaveTopicPart,
  onDeleteTopicPart,
  onSaveExamPaper,
  onPublishExamPaper,
  onSelectStudent,
  onExportJSON,
  onImportJSON,
  languageMode = "BM",
}) {
  const [tutorTab, setTutorTab] = useState("PERFORMANCE"); // "PERFORMANCE" | "QUESTION_BANK" | "PAPER_BUILDER" | "STUDENTS"
  const [reviewExamAttempt, setReviewExamAttempt] = useState(null);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ─── TUTOR TOP NAVIGATION TABS (Visible in Tutor Mode) ─── */}
      {activeUser.role === "TUTOR" && (
        <div className="rounded-xl border-2 border-slate-900 bg-white p-2.5 shadow-tactile flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {[
              {
                id: "PERFORMANCE",
                label: languageMode === "EN" ? "📊 Performance & Records" : "📊 Rekod & Prestasi",
              },
              {
                id: "QUESTION_BANK",
                label: languageMode === "EN" ? "📚 Question Bank" : "📚 Bank Soalan",
              },
              {
                id: "PAPER_BUILDER",
                label: languageMode === "EN" ? "📝 Exam Paper Builder" : "📝 Pembina Peperiksaan",
              },
              {
                id: "STUDENTS",
                label: languageMode === "EN" ? "👥 Student Management" : "👥 Pengurusan Murid",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTutorTab(tab.id)}
                className={`btn-tactile rounded-2xl px-4 py-2 text-xs sm:text-sm font-black border-2 border-slate-900 transition-all ${
                  tutorTab === tab.id
                    ? "bg-sky-400 text-slate-950 shadow-tactile-sm"
                    : "bg-white text-slate-700 hover:bg-[#FAF6EE]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 1: PERFORMANCE & OFFICIAL EXAM RECORDS ─── */}
      {(tutorTab === "PERFORMANCE" || activeUser.role !== "TUTOR") && (
        <PerformanceTab
          db={db}
          studentUser={studentUser}
          activeUser={activeUser}
          selectedDarjah={selectedDarjah}
          languageMode={languageMode}
          onSelectStudent={onSelectStudent}
          onReviewExamAttempt={(attempt) => setReviewExamAttempt(attempt)}
          onTutorBonusMark={onTutorBonusMark}
        />
      )}

      {/* ─── TAB 2: QUESTION BANK & AUTHORING ─── */}
      {tutorTab === "QUESTION_BANK" && activeUser.role === "TUTOR" && (
        <QuestionBankTab
          db={db}
          selectedDarjah={selectedDarjah}
          languageMode={languageMode}
          onSaveCustomQuestion={onSaveCustomQuestion}
          onDeleteCustomQuestion={onDeleteCustomQuestion}
          onSaveQuestionBankItem={onSaveQuestionBankItem}
          onDeleteQuestionBankItem={onDeleteQuestionBankItem}
          onSaveTopicPart={onSaveTopicPart}
          onDeleteTopicPart={onDeleteTopicPart}
        />
      )}

      {/* ─── TAB 3: EXAM PAPER BUILDER & PUBLISHING ─── */}
      {tutorTab === "PAPER_BUILDER" && activeUser.role === "TUTOR" && (
        <PaperBuilderTab
          db={db}
          selectedDarjah={selectedDarjah}
          languageMode={languageMode}
          onSaveExamPaper={onSaveExamPaper}
          onPublishExamPaper={onPublishExamPaper}
        />
      )}

      {/* ─── TAB 4: STUDENT PROFILES & PER-STUDENT YEAR ACCESS ─── */}
      {tutorTab === "STUDENTS" && activeUser.role === "TUTOR" && (
        <StudentManagementTab
          db={db}
          activeUser={activeUser}
          languageMode={languageMode}
          onAddStudent={onAddStudent}
          onDeleteStudent={onDeleteStudent}
          onUpdateStudentPin={onUpdateStudentPin}
          onSetStudentYearAccess={onSetStudentYearAccess}
          onSetStudentStatus={onSetStudentStatus}
          onUpdateStudentCurrentDarjah={onUpdateStudentCurrentDarjah}
          onUpdateStudentProfile={onUpdateStudentProfile}
          onExportJSON={onExportJSON}
          onImportJSON={onImportJSON}
        />
      )}

      {/* ─── TUTOR REVIEW & GRADING MODAL ─── */}
      {reviewExamAttempt && (
        <TutorReviewModal
          attempt={reviewExamAttempt}
          studentUser={studentUser}
          languageMode={languageMode}
          onClose={() => setReviewExamAttempt(null)}
          onSaveDraft={async (draftData) => {
            if (onSaveDraftMarks) {
              await onSaveDraftMarks(reviewExamAttempt.id, draftData);
            }
          }}
          onFinalize={async (grades) => {
            await onFinalizeExam(reviewExamAttempt.id, grades);
            setReviewExamAttempt(null);
          }}
        />
      )}
    </div>
  );
}
