// src/components/tutor/PerformanceTab.jsx
import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { getTopicsByDarjah } from "../../engine/syllabusConfig.js";
import { getTopicParts } from "../../services/storageService.js";
import {
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  FolderOpen,
} from "lucide-react";

function getTahapPenguasaan(avgScore, languageMode = "BM") {
  if (avgScore >= 90)
    return {
      tp: "TP 6",
      label:
        languageMode === "EN"
          ? "Exemplary 🌟"
          : languageMode === "DWIBAHASA"
          ? "Cemerlang / Exemplary 🌟"
          : "Cemerlang 🌟",
      color: "bg-emerald-400 text-slate-950",
    };
  if (avgScore >= 80)
    return {
      tp: "TP 5",
      label:
        languageMode === "EN"
          ? "Very Good 🏆"
          : languageMode === "DWIBAHASA"
          ? "Sangat Baik / Very Good 🏆"
          : "Sangat Baik 🏆",
      color: "bg-sky-400 text-slate-950",
    };
  if (avgScore >= 70)
    return {
      tp: "TP 4",
      label:
        languageMode === "EN"
          ? "Good 👍"
          : languageMode === "DWIBAHASA"
          ? "Baik / Good 👍"
          : "Baik 👍",
      color: "bg-teal-400 text-slate-950",
    };
  if (avgScore >= 40)
    return {
      tp: "TP 3",
      label:
        languageMode === "EN"
          ? "Satisfactory 📈"
          : languageMode === "DWIBAHASA"
          ? "Memuaskan / Satisfactory 📈"
          : "Memuaskan 📈",
      color: "bg-amber-300 text-slate-950",
    };
  return {
    tp: "TP 1–2",
    label:
      languageMode === "EN"
        ? "Needs Guidance 🌱"
        : languageMode === "DWIBAHASA"
        ? "Perlu Bimbingan / Needs Guidance 🌱"
        : "Perlu Bimbingan 🌱",
    color: "bg-rose-300 text-slate-950",
  };
}

export default function PerformanceTab({
  db,
  studentUser,
  activeUser,
  selectedDarjah = 1,
  languageMode = "BM",
  onSelectStudent,
  onReviewExamAttempt,
}) {
  const [viewDarjah, setViewDarjah] = useState(() => Number(selectedDarjah || 1));
  const [selectedStudentFilter, setSelectedStudentFilter] = useState(() => studentUser?.id || "ALL");

  const activeStudents = useMemo(() => {
    return (db?.users || []).filter(
      (u) => u.role === "STUDENT" && (u.status === "Active" || !u.status)
    );
  }, [db?.users]);

  // Sync if parent passes different student
  useEffect(() => {
    if (studentUser?.id && selectedStudentFilter !== "ALL") {
      setSelectedStudentFilter(studentUser.id);
    }
  }, [studentUser?.id, selectedStudentFilter]);

  // Sync when selectedDarjah changes from parent
  useEffect(() => {
    if (selectedDarjah) {
      setViewDarjah(Number(selectedDarjah));
    }
  }, [selectedDarjah]);

  const handleStudentChange = (val) => {
    setSelectedStudentFilter(val);
    if (val !== "ALL" && onSelectStudent) {
      onSelectStudent(val);
    }
  };

  const isAllStudents = selectedStudentFilter === "ALL";
  const currentStudent = isAllStudents
    ? null
    : activeStudents.find((s) => s.id === selectedStudentFilter) || studentUser;

  const topics = useMemo(() => getTopicsByDarjah(viewDarjah), [viewDarjah]);

  const chartData = useMemo(() => {
    return topics.map((t) => {
      const parts = getTopicParts(db, viewDarjah, t.id).filter((p) => p.status === "PUBLISHED");

      if (isAllStudents) {
        // Aggregated across all active students
        let sumScore = 0;
        let studentsWithAttempts = 0;
        let totalAttempts = 0;
        let totalTimeSec = 0;
        let completedCount = 0;
        let totalCompletedParts = 0;

        activeStudents.forEach((stu) => {
          const prog = db?.topicProgress?.[stu.id]?.[t.id];
          if (prog && prog.attempts > 0) {
            sumScore += Number(prog.bestScore) || 0;
            studentsWithAttempts++;
            totalAttempts += Number(prog.attempts) || 0;
            totalTimeSec += Number(prog.totalTimeSec) || 0;
            if (prog.status === "COMPLETED") completedCount++;
            const pCount = (prog.completedPartIds || []).filter((pid) =>
              parts.some((p) => p.id === pid)
            ).length;
            totalCompletedParts += pCount;
          }
        });

        const avgTopicScore = studentsWithAttempts > 0 ? Math.round(sumScore / studentsWithAttempts) : 0;
        const avgCompletedParts = studentsWithAttempts > 0 ? Math.round(totalCompletedParts / studentsWithAttempts) : 0;

        return {
          id: t.id,
          name: `T${t.order}`,
          fullTitle: languageMode === "EN" ? t.title_en : t.title_bm,
          score: avgTopicScore,
          attempts: totalAttempts,
          timeSec: totalTimeSec,
          status:
            completedCount > 0 && completedCount === activeStudents.length
              ? "COMPLETED"
              : totalAttempts > 0
              ? "IN_PROGRESS"
              : "NOT_STARTED",
          totalParts: parts.length,
          completedPartsCount: avgCompletedParts,
        };
      }

      // Individual student
      const userTopics = db?.topicProgress?.[currentStudent?.id] || {};
      const prog = userTopics[t.id] || {
        bestScore: 0,
        attempts: 0,
        totalTimeSec: 0,
        status: "IN_PROGRESS",
        completedPartIds: [],
      };
      const completedPartsCount = (prog.completedPartIds || []).filter((pid) =>
        parts.some((p) => p.id === pid)
      ).length;

      return {
        id: t.id,
        name: `T${t.order}`,
        fullTitle: languageMode === "EN" ? t.title_en : t.title_bm,
        score: prog.bestScore || 0,
        attempts: prog.attempts || 0,
        timeSec: prog.totalTimeSec || 0,
        status: prog.status || "IN_PROGRESS",
        totalParts: parts.length,
        completedPartsCount,
      };
    });
  }, [db, viewDarjah, topics, isAllStudents, activeStudents, currentStudent?.id, languageMode]);

  const totalAttempts = chartData.reduce((sum, item) => sum + item.attempts, 0);
  const attemptedTopics = chartData.filter((item) => item.attempts > 0);
  const avgScore = attemptedTopics.length > 0
    ? Math.round(attemptedTopics.reduce((sum, item) => sum + item.score, 0) / attemptedTopics.length)
    : 0;
  const totalTimeMins = Math.round(
    chartData.reduce((sum, item) => sum + item.timeSec, 0) / 60
  );
  const tpBadge = getTahapPenguasaan(avgScore, languageMode);

  const studentExams = useMemo(() => {
    if (isAllStudents || !currentStudent) return [];
    return (db?.examAttempts || []).filter(
      (e) => e.userId === currentStudent.id && Number(e.darjah) === Number(viewDarjah)
    );
  }, [db?.examAttempts, isAllStudents, currentStudent, viewDarjah]);

  const weakTopics = chartData.filter((c) => c.score < 70 && c.attempts > 0);
  const unstartedTopics = chartData.filter((c) => c.attempts === 0);
  const completedTopicsCount = chartData.filter((c) => c.attempts > 0 && c.score >= 70).length;
  const hasAnyRecords = totalAttempts > 0 || studentExams.length > 0;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* ─── STUDENT SELECTOR & ACADEMIC YEAR FILTER BAR ─── */}
      <div className="rounded-xl border-2 border-slate-900 bg-white p-3.5 sm:p-4 shadow-tactile flex flex-wrap items-center justify-between gap-3">
        {/* Student Dropdown Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-black text-slate-700">{languageMode === "EN" ? "Student:" : "Murid:"}</span>
          <select
            value={selectedStudentFilter}
            onChange={(e) => handleStudentChange(e.target.value)}
            className="w-full sm:w-auto max-w-full min-w-0 truncate rounded-xl border-2 border-slate-900 bg-[#FAF6EE] px-3 py-1.5 text-xs sm:text-sm font-black shadow-tactile-sm"
          >
            <option value="ALL">
              {languageMode === "EN"
                ? `All Active Students (${activeStudents.length})`
                : `Semua Murid Aktif (${activeStudents.length})`}
            </option>
            {activeStudents.map((stu) => (
              <option key={stu.id} value={stu.id}>
                {stu.avatar} {stu.name} ({languageMode === "EN" ? `Year ${stu.current_darjah || 1}` : `Tahun ${stu.current_darjah || 1}`})
              </option>
            ))}
          </select>
        </div>

        {/* Year 1 / Year 2 / Year 3 Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-slate-700">{languageMode === "EN" ? "Year:" : "Tahun:"}</span>
          {[1, 2, 3].map((d) => (
            <button
              key={d}
              onClick={() => setViewDarjah(d)}
              className={`btn-tactile rounded-2xl px-3.5 py-1.5 text-xs sm:text-sm font-black border-2 border-slate-900 transition-all ${
                viewDarjah === d
                  ? "bg-amber-300 text-slate-950 shadow-tactile-sm ring-2 ring-amber-500"
                  : "bg-white text-slate-700 hover:bg-[#FAF6EE]"
              }`}
            >
              {languageMode === "EN" ? `Year ${d}` : `Tahun ${d}`}
            </button>
          ))}
        </div>
      </div>

      {/* ─── EMPTY STATE NOTICE (If no records exist for selected year) ─── */}
      {!hasAnyRecords && (
        <div className="rounded-3xl border-2 border-slate-900 bg-amber-50 p-5 sm:p-6 text-center shadow-tactile space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-slate-900 bg-amber-200 text-2xl shadow-tactile-sm">
            <FolderOpen className="h-6 w-6 text-amber-900" />
          </div>
          <h3 className="text-base font-black text-slate-900 font-mono">
            {languageMode === "EN"
              ? `No Records for Year ${viewDarjah} Yet`
              : `Tiada Rekod bagi Tahun ${viewDarjah} Buat Masa Ini`}
          </h3>
          <p className="text-xs sm:text-sm font-bold text-slate-600 max-w-md mx-auto">
            {isAllStudents
              ? languageMode === "EN"
                ? `No practice exercises or examination records found for active students in Year ${viewDarjah}.`
                : `Tiada rekod latihan atau peperiksaan dijumpai bagi murid aktif dalam Tahun ${viewDarjah}.`
              : languageMode === "EN"
              ? `${currentStudent?.name} has not attempted any practice exercises or examination papers for Year ${viewDarjah}. Records will populate automatically once exercises commence.`
              : `${currentStudent?.name} belum membuat sebarang latihan topik atau peperiksaan bagi Tahun ${viewDarjah}. Rekod akan dipaparkan secara automatik sebaik sahaja murid memulakan latihan.`}
          </p>
        </div>
      )}

      {/* ─── TOP 3 KPI SUMMARY CARDS ─── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border-2 border-slate-900 bg-white p-3.5 shadow-tactile">
          <span className="text-[11px] font-black uppercase text-slate-500 font-mono">
            {isAllStudents
              ? languageMode === "EN"
                ? `Cohort Average Score (Year ${viewDarjah})`
                : `Purata Skor Kohort (Tahun ${viewDarjah})`
              : languageMode === "EN"
              ? `Topic Average Score (Year ${viewDarjah})`
              : `Purata Skor Topik (Tahun ${viewDarjah})`}
          </span>
          <p className="mt-0.5 font-mono text-2xl font-black text-slate-900">{avgScore}%</p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            {languageMode === "EN"
              ? `${completedTopicsCount}/${topics.length} topics mastered (≥70%)`
              : `${completedTopicsCount}/${topics.length} topik dikuasai (≥70%)`}
          </p>
        </div>

        <div className="rounded-xl border-2 border-slate-900 bg-white p-3.5 shadow-tactile">
          <span className="text-[11px] font-black uppercase text-slate-500 font-mono">
            {isAllStudents
              ? languageMode === "EN"
                ? `Cohort Mastery Level (Year ${viewDarjah})`
                : `Tahap Penguasaan Kohort (Tahun ${viewDarjah})`
              : languageMode === "EN"
              ? `KSSR Mastery Level (Year ${viewDarjah})`
              : `Tahap Penguasaan KSSR (Tahun ${viewDarjah})`}
          </span>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className={`rounded-lg border-2 border-slate-900 px-2.5 py-0.5 font-mono text-base font-black shadow-tactile-sm ${tpBadge.color}`}
            >
              {totalAttempts > 0 ? tpBadge.tp : "TP -"}
            </span>
            <Award className="h-6 w-6 text-amber-500" />
          </div>
          <p className="mt-1 text-xs font-black text-slate-800">
            {totalAttempts > 0 ? tpBadge.label : languageMode === "EN" ? "Not Assessed Yet" : "Belum Dinilai"}
          </p>
        </div>

        <div className="rounded-xl border-2 border-slate-900 bg-white p-3.5 shadow-tactile">
          <span className="text-[11px] font-black uppercase text-slate-500 font-mono">
            {isAllStudents
              ? languageMode === "EN"
                ? "Combined Practice Time"
                : "Jumlah Masa Latihan Terkumpul"
              : languageMode === "EN"
              ? "Total Practice Time"
              : "Jumlah Masa Latihan"}
          </span>
          <div className="mt-0.5 flex items-center gap-2">
            <Clock className="h-5 w-5 text-sky-600" />
            <p className="font-mono text-2xl font-black text-slate-900">
              {totalTimeMins} {languageMode === "EN" ? "mins" : "minit"}
            </p>
          </div>
          <p className="mt-1.5 text-xs font-bold text-slate-600">
            {isAllStudents
              ? languageMode === "EN"
                ? `${totalAttempts} attempts across ${activeStudents.length} active students`
                : `${totalAttempts} percubaan dari ${activeStudents.length} murid aktif`
              : languageMode === "EN"
              ? `Total attempts across Year ${viewDarjah}: ${totalAttempts}`
              : `Jumlah percubaan latihan Tahun ${viewDarjah}: ${totalAttempts}`}
          </p>
        </div>
      </div>

      {/* ─── TOPIC ACCURACY BAR CHART & WEAK-SPOT DETECTOR ─── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8 rounded-3xl border-2 border-slate-900 bg-white p-4 sm:p-5 shadow-tactile">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-100 pb-2.5">
            <div>
              <h3 className="text-base font-black text-slate-900">
                {languageMode === "EN"
                  ? `📊 Topic Performance Graph (Year ${viewDarjah})`
                  : `📊 Graf Prestasi Mengikut Topik (Tahun ${viewDarjah})`}
              </h3>
              <p className="text-xs font-bold text-slate-500">
                {languageMode === "EN"
                  ? "Green (≥70% Mastered) • Amber (<70% Revision Needed) • Gray (Not Attempted)"
                  : "Hijau (≥70% Dikuasai) • Amber (<70% Perlu Ulangkaji) • Kelabu (Belum Dimulakan)"}
              </p>
            </div>
            <span className="font-mono text-xs font-black text-slate-600">
              {completedTopicsCount}/{topics.length} {languageMode === "EN" ? "Completed" : "Selesai"}
            </span>
          </div>

          <div className="mt-2.5 h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: "bold" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fontWeight: "bold" }} />
                <Tooltip
                  formatter={(value, _name, props) => [
                    `${value}% (${props.payload.attempts} ${languageMode === "EN" ? "attempts" : "cubaan"})`,
                    props.payload.fullTitle,
                  ]}
                  contentStyle={{
                    border: "2px solid #0F172A",
                    borderRadius: "14px",
                    fontWeight: "bold",
                    backgroundColor: "#FAF6EE",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.attempts === 0 ? "#CBD5E1" : entry.score >= 70 ? "#10B981" : "#F59E0B"}
                      stroke="#0F172A"
                      strokeWidth={1.5}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Diagnostic Focus & Topic Parts Breakdown */}
        <div className="lg:col-span-4 rounded-3xl border-2 border-slate-900 bg-[#FAF6EE] p-4 sm:p-5 shadow-tactile flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">
              {isAllStudents
                ? languageMode === "EN"
                  ? `🎯 Guidance Focus (Cohort Year ${viewDarjah})`
                  : `🎯 Fokus Bimbingan (Kohort Tahun ${viewDarjah})`
                : languageMode === "EN"
                ? `🎯 Guidance Focus (${currentStudent?.name})`
                : `🎯 Fokus Bimbingan (${currentStudent?.name})`}
            </h3>
            <p className="mt-1 text-xs font-bold text-slate-600">
              {isAllStudents
                ? languageMode === "EN"
                  ? `Topics needing cohort revision for Year ${viewDarjah}:`
                  : `Topik yang memerlukan perhatian kohort bagi Tahun ${viewDarjah}:`
                : languageMode === "EN"
                ? `Topics needing practice or revision for Year ${viewDarjah}:`
                : `Topik yang memerlukan bimbingan atau ulangkaji bagi Tahun ${viewDarjah}:`}
            </p>

            {weakTopics.length === 0 && unstartedTopics.length === 0 ? (
              <div className="mt-4 rounded-2xl border-2 border-slate-900 bg-emerald-100 p-3.5 text-center text-emerald-950 shadow-tactile-sm">
                <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-700" />
                <p className="mt-2 text-xs font-black">
                  {languageMode === "EN"
                    ? `All Year ${viewDarjah} Topics Mastered (≥70%)!`
                    : `Semua Topik Tahun ${viewDarjah} Telah Dikuasai (≥70%)!`}
                </p>
              </div>
            ) : (
              <ul className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                {weakTopics.map((wt) => (
                  <li
                    key={wt.name}
                    className="flex items-center justify-between rounded-xl border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black shadow-tactile-sm"
                  >
                    <span className="truncate pr-2 text-slate-800">
                      {wt.name}: {wt.fullTitle}
                    </span>
                    <span className="rounded-md border border-slate-900 bg-amber-200 px-2 py-0.5 text-amber-950 font-mono">
                      {wt.score}%
                    </span>
                  </li>
                ))}
                {unstartedTopics.map((ut) => (
                  <li
                    key={ut.name}
                    className="flex items-center justify-between rounded-xl border-2 border-dashed border-slate-400 bg-white/70 px-3 py-1.5 text-xs font-bold text-slate-500"
                  >
                    <span className="truncate pr-2">
                      {ut.name}: {ut.fullTitle}
                    </span>
                    <span className="text-[11px] font-mono">
                      {languageMode === "EN" ? "Not Started" : "Belum Mula"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t-2 border-slate-900/10 text-xs font-bold text-slate-600">
            {languageMode === "EN"
              ? "All topic parts must be completed with ≥70% to unlock the Year Final Exam."
              : "Semua bahagian latihan topik mesti diselesaikan dengan markah ≥70% untuk melayakkan peperiksaan."}
          </div>
        </div>
      </div>

      {/* ─── GRANULAR STUDENT LOGS: TOPIC BREAKDOWN & EXAM RECORDS ─── */}
      {!isAllStudents ? (
        <>
          {/* Topic Exercise & Parts Status Table */}
          <div className="rounded-3xl border-2 border-slate-900 bg-white p-4 sm:p-5 shadow-tactile">
            <h3 className="text-base font-black text-slate-900">
              {languageMode === "EN"
                ? `📋 Topic Exercises & Parts Breakdown (Year ${viewDarjah})`
                : `📋 Ringkasan Latihan & Bahagian Topik (Tahun ${viewDarjah})`}
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm font-bold">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-700 font-black">
                    <th className="py-2.5">{languageMode === "EN" ? "Topic" : "Topik"}</th>
                    <th className="py-2.5">{languageMode === "EN" ? "Part Progress" : "Kemajuan Bahagian"}</th>
                    <th className="py-2.5">{languageMode === "EN" ? "Best Score" : "Skor Terbaik"}</th>
                    <th className="py-2.5">{languageMode === "EN" ? "Attempts" : "Percubaan"}</th>
                    <th className="py-2.5">{languageMode === "EN" ? "Total Time" : "Masa Terkumpul"}</th>
                    <th className="py-2.5">{languageMode === "EN" ? "Mastery Status" : "Status Penguasaan"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b-2 border-slate-900 divide-slate-200">
                  {chartData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 font-black text-slate-900">
                        {item.name}: {item.fullTitle}
                      </td>
                      <td className="py-2.5 font-mono">
                        <span className="rounded-md border border-slate-900 bg-sky-100 px-2 py-0.5 text-xs font-black text-slate-900">
                          {item.completedPartsCount} / {item.totalParts || 1} {languageMode === "EN" ? "Parts" : "Bahagian"}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono font-black">
                        {item.attempts > 0 ? (
                          <span className={item.score >= 70 ? "text-emerald-700" : "text-amber-700"}>
                            {item.score}%
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2.5 font-mono">{item.attempts}</td>
                      <td className="py-2.5 font-mono">{Math.round(item.timeSec / 60)} {languageMode === "EN" ? "mins" : "min"}</td>
                      <td className="py-2.5">
                        {item.status === "COMPLETED" ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-900 bg-emerald-200 px-2.5 py-0.5 text-xs font-black text-emerald-950">
                            <CheckCircle2 className="h-3.5 w-3.5" /> {languageMode === "EN" ? "PASSED / COMPLETED" : "LULUS / SELESAI"}
                          </span>
                        ) : item.status === "RETAKE_REQUIRED" ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-900 bg-rose-200 px-2.5 py-0.5 text-xs font-black text-rose-950">
                            <AlertCircle className="h-3.5 w-3.5" /> {languageMode === "EN" ? "REVISION" : "ULANGKAJI"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                            {languageMode === "EN" ? "IN PROGRESS" : "SEDANG BELAJAR"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Exam Attempt Log & Tutor Review Table */}
          <div className="rounded-3xl border-2 border-slate-900 bg-white p-4 sm:p-5 shadow-tactile">
            <h3 className="text-base font-black text-slate-900">
              {languageMode === "EN"
                ? `📝 Official Year ${viewDarjah} Final Exam Records`
                : languageMode === "DWIBAHASA"
                ? `📝 Rekod Rasmi Ujian Akhir Tahun ${viewDarjah} / Official Final Exam Records`
                : `📝 Rekod Rasmi Ujian Akhir Tahun ${viewDarjah}`}
            </h3>
            {studentExams.length === 0 ? (
              <p className="mt-2.5 text-xs sm:text-sm font-bold text-slate-500">
                {languageMode === "EN"
                  ? `No exam attempts recorded for Year ${viewDarjah} yet.`
                  : `Tiada rekod percubaan peperiksaan bagi Tahun ${viewDarjah} buat masa ini.`}
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm font-bold">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-700 font-black">
                      <th className="py-2.5">{languageMode === "EN" ? "Date" : "Tarikh"}</th>
                      <th className="py-2.5">{languageMode === "EN" ? "Sec. A" : "Bah. A"}</th>
                      <th className="py-2.5">{languageMode === "EN" ? "Sec. B" : "Bah. B"}</th>
                      <th className="py-2.5">{languageMode === "EN" ? "Sec. C" : "Bah. C"}</th>
                      <th className="py-2.5">{languageMode === "EN" ? "Total Marks" : "Jumlah"}</th>
                      <th className="py-2.5">{languageMode === "EN" ? "Tutor Decision" : "Keputusan"}</th>
                      {activeUser?.role === "TUTOR" && (
                        <th className="py-2.5">{languageMode === "EN" ? "Tutor Actions" : "Tindakan Tutor"}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y border-b-2 border-slate-900 divide-slate-200">
                    {studentExams.map((ex) => {
                      const isPending = ex.status === "PENDING_REVIEW";
                      const maxTotal = ex.paperTotalMarks || 50;
                      return (
                        <tr key={ex.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 font-mono text-slate-700">
                            {new Date(ex.completedAt || ex.submittedAt).toLocaleDateString(
                              languageMode === "EN" ? "en-GB" : "ms-MY"
                            )}
                          </td>
                          <td className="py-2.5 font-mono">{isPending ? "-" : `${ex.scoreA ?? 0}`}</td>
                          <td className="py-2.5 font-mono">{isPending ? "-" : `${ex.scoreB ?? 0}`}</td>
                          <td className="py-2.5 font-mono">{isPending ? "-" : `${ex.scoreC ?? 0}`}</td>
                          <td className="py-2.5 font-mono font-black text-slate-900">
                            {isPending ? "-" : `${ex.totalMarks} / ${maxTotal} (${ex.percentage}%)`}
                          </td>
                          <td className="py-2.5">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-amber-600 bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-950">
                                <Clock className="h-3.5 w-3.5 text-amber-700" />
                                {languageMode === "EN" ? "Pending Tutor Review" : "Menunggu Semakan"}
                              </span>
                            ) : ex.isPassed ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-slate-900 bg-emerald-200 px-2.5 py-0.5 text-xs font-black text-emerald-950">
                                <CheckCircle2 className="h-3.5 w-3.5" /> {languageMode === "EN" ? "PASSED" : "LULUS"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md border border-slate-900 bg-rose-200 px-2.5 py-0.5 text-xs font-black text-rose-950">
                                <AlertCircle className="h-3.5 w-3.5" /> {languageMode === "EN" ? "FAILED (Reset)" : "GAGAL (Reset)"}
                              </span>
                            )}
                          </td>
                          {activeUser?.role === "TUTOR" && (
                            <td className="py-2.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => onReviewExamAttempt(ex)}
                                  className={`btn-tactile flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black ${
                                    isPending
                                      ? "bg-amber-400 text-slate-950 hover:bg-amber-300 ring-2 ring-amber-600 shadow-tactile-sm"
                                      : "bg-sky-200 text-sky-950 hover:bg-sky-300 border-2 border-slate-900"
                                  }`}
                                >
                                  <BookOpen className="h-4 w-4" />
                                  <span>
                                    {isPending
                                      ? languageMode === "EN"
                                        ? "Grade Exam"
                                        : "Semak Kertas"
                                      : languageMode === "EN"
                                      ? "Inspect Paper"
                                      : "Semak Semula"}
                                  </span>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Empty / informative state when viewing All Active Students */
        <div className="rounded-3xl border-2 border-dashed border-slate-400 bg-white/80 p-5 text-center shadow-tactile-sm">
          <p className="text-xs sm:text-sm font-black text-slate-700">
            {languageMode === "EN"
              ? "💡 Select an individual student from the dropdown menu above to inspect topic part exercise details and official exam papers."
              : "💡 Pilih murid individu dari menu di atas untuk melihat ringkasan latihan bahagian topik dan kertas peperiksaan terperinci."}
          </p>
        </div>
      )}
    </div>
  );
}
