// src/components/tutor/StudentManagementTab.jsx
import { useState, useMemo } from "react";
import { UserPlus, Trash2, Search, Filter, Edit3, X } from "lucide-react";
import { toast, confirmAction } from "../ui/toast.js";

export default function StudentManagementTab({
  db,
  activeUser,
  languageMode = "BM",
  onAddStudent,
  onDeleteStudent,
  onUpdateStudentPin,
  onSetStudentYearAccess,
  onSetStudentStatus,
  onUpdateStudentCurrentDarjah,
  onUpdateStudentProfile,
}) {
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentAvatar, setNewStudentAvatar] = useState("🦊");
  const [newStudentStartingYear, setNewStudentStartingYear] = useState(1);
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // Student Edit Modal state
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormName, setEditFormName] = useState("");
  const [editFormAvatar, setEditFormAvatar] = useState("🦊");
  const [editFormYear, setEditFormYear] = useState(1);
  const [editFormYear2Access, setEditFormYear2Access] = useState("LOCKED");
  const [editFormYear3Access, setEditFormYear3Access] = useState("LOCKED");
  const [editFormStatus, setEditFormStatus] = useState("Active");
  const [editFormPin, setEditFormPin] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Tutor Profile Edit Modal state
  const [isEditingTutor, setIsEditingTutor] = useState(false);
  const [tutorEditName, setTutorEditName] = useState("");
  const [tutorEditAvatar, setTutorEditAvatar] = useState("👨‍🏫");
  const [tutorEditPin, setTutorEditPin] = useState("");
  const [isSubmittingTutorEdit, setIsSubmittingTutorEdit] = useState(false);

  // Search and current year filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("ALL"); // "ALL" | 1 | 2 | 3

  const allStudents = (db?.users || []).filter((u) => u.role === "STUDENT");

  const filteredStudents = useMemo(() => {
    return allStudents.filter((stu) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || stu.name.toLowerCase().includes(q) || String(stu.id).toLowerCase().includes(q);
      const studentYear = Number(stu.current_darjah || 1);
      const matchesYear = yearFilter === "ALL" || studentYear === Number(yearFilter);
      return matchesSearch && matchesYear;
    });
  }, [allStudents, searchQuery, yearFilter]);

  const handleOpenEdit = (stu) => {
    setEditingStudent(stu);
    setEditFormName(stu.name || "");
    setEditFormAvatar(stu.avatar || "🦊");
    const y2Setting = stu.yearAccess?.[2] === "UNLOCKED" || stu.unlocked_darjah?.includes(2) ? "UNLOCKED" : "LOCKED";
    const y3Setting = stu.yearAccess?.[3] === "UNLOCKED" || stu.unlocked_darjah?.includes(3) ? "UNLOCKED" : "LOCKED";
    const computedDarjah = y3Setting === "UNLOCKED" ? 3 : y2Setting === "UNLOCKED" ? 2 : 1;
    setEditFormYear(Number(stu.current_darjah || computedDarjah));
    setEditFormYear2Access(y2Setting);
    setEditFormYear3Access(y3Setting);
    setEditFormStatus(stu.status || "Active");
    setEditFormPin(String(stu.pin_code ?? stu.pin ?? "").trim());
  };

  const handleSaveStudentEdit = async (e) => {
    e.preventDefault();
    if (!editingStudent || isSubmittingEdit) return;
    if (!editFormName.trim()) {
      toast.error(languageMode === "EN" ? "Student name cannot be empty." : "Nama murid tidak boleh kosong.");
      return;
    }
    if (editFormPin.trim() && !/^\d{4}$/.test(editFormPin.trim())) {
      toast.error(languageMode === "EN" ? "Student PIN must be exactly 4 digits." : "PIN murid mestilah tepat 4 digit nombor.");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const updates = {
        name: editFormName.trim(),
        avatar: editFormAvatar,
        current_darjah: Number(editFormYear),
        yearAccess: {
          2: editFormYear2Access,
          3: editFormYear3Access,
        },
        status: editFormStatus,
        pin: editFormPin.trim(),
      };

      if (onUpdateStudentProfile) {
        await onUpdateStudentProfile(editingStudent.id, updates);
      } else {
        if (onUpdateStudentCurrentDarjah) await onUpdateStudentCurrentDarjah(editingStudent.id, updates.current_darjah);
        if (onSetStudentYearAccess) {
          await onSetStudentYearAccess(editingStudent.id, 2, updates.yearAccess[2]);
          await onSetStudentYearAccess(editingStudent.id, 3, updates.yearAccess[3]);
        }
        if (onSetStudentStatus) await onSetStudentStatus(editingStudent.id, updates.status);
        if (onUpdateStudentPin) await onUpdateStudentPin(editingStudent.id, updates.pin);
      }

      toast.success(
        languageMode === "EN"
          ? `Profile for "${editFormName.trim()}" updated successfully!`
          : `Profil murid "${editFormName.trim()}" berjaya dikemaskini!`
      );
      setEditingStudent(null);
    } catch (err) {
      console.error("Failed to update student profile:", err);
      toast.error(languageMode === "EN" ? "Failed to save profile changes." : "Gagal menyimpan perubahan profil.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleOpenTutorEdit = () => {
    setTutorEditName(activeUser?.name || "Cikgu / Tutor");
    setTutorEditAvatar(activeUser?.avatar || "👨‍🏫");
    setTutorEditPin(String(activeUser?.pin_code ?? activeUser?.pin ?? "").trim());
    setIsEditingTutor(true);
  };

  const handleSaveTutorEdit = async (e) => {
    e.preventDefault();
    if (isSubmittingTutorEdit) return;
    if (!tutorEditName.trim()) {
      toast.error(languageMode === "EN" ? "Tutor name cannot be empty." : "Nama tutor tidak boleh kosong.");
      return;
    }
    if (tutorEditPin.trim() && !/^\d{4,6}$/.test(tutorEditPin.trim())) {
      toast.error(
        languageMode === "EN"
          ? "Tutor PIN must be 4 to 6 digits."
          : "PIN tutor mestilah 4 hingga 6 digit nombor."
      );
      return;
    }

    setIsSubmittingTutorEdit(true);
    try {
      const updates = {
        name: tutorEditName.trim(),
        avatar: tutorEditAvatar,
        pin: tutorEditPin.trim(),
      };
      if (onUpdateStudentProfile) {
        await onUpdateStudentProfile(activeUser.id, updates);
      } else if (onUpdateStudentPin) {
        await onUpdateStudentPin(activeUser.id, updates.pin);
      }
      toast.success(
        languageMode === "EN"
          ? `Tutor profile "${tutorEditName.trim()}" updated successfully!`
          : `Profil Tutor "${tutorEditName.trim()}" berjaya dikemaskini!`
      );
      setIsEditingTutor(false);
    } catch (err) {
      console.error("Failed to update tutor profile:", err);
      toast.error(languageMode === "EN" ? "Failed to save tutor profile." : "Gagal menyimpan perubahan profil tutor.");
    } finally {
      setIsSubmittingTutorEdit(false);
    }
  };

  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    if (isAddingStudent || !newStudentName.trim()) return;
    setIsAddingStudent(true);
    try {
      await onAddStudent(newStudentName, newStudentAvatar, newStudentStartingYear);
      setNewStudentName("");
      toast.success(
        languageMode === "EN"
          ? `Student profile "${newStudentName.trim()}" created successfully!`
          : `Profil murid "${newStudentName.trim()}" berjaya ditambah!`
      );
    } catch (err) {
      console.error("Failed to add student:", err);
      toast.error(
        languageMode === "EN" ? "Failed to add student profile." : "Gagal menambah profil murid."
      );
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleDeleteStudentPrompt = (stu) => {
    confirmAction({
      title: languageMode === "EN" ? "Confirm Student Deletion" : "Sahkan Pemadaman Murid",
      message:
        languageMode === "EN"
          ? `Are you sure you want to delete "${stu.name}"? All practice progress and examination records for this student will be deleted. This action cannot be undone.`
          : `Adakah anda pasti mahu memadam profil "${stu.name}"? Semua kemajuan latihan dan rekod peperiksaan murid ini akan dipadamkan sepenuhnya.`,
      confirmText: languageMode === "EN" ? "Delete Profile" : "Padam Profil",
      cancelText: languageMode === "EN" ? "Cancel" : "Batal",
      danger: true,
      onConfirm: async () => {
        try {
          await onDeleteStudent(stu.id);
          toast.info(
            languageMode === "EN"
              ? `Student "${stu.name}" has been deleted.`
              : `Profil murid "${stu.name}" telah dipadam.`
          );
        } catch (err) {
          console.error("Failed to delete student:", err);
          toast.error(
            languageMode === "EN" ? "Failed to delete student." : "Gagal memadam profil murid."
          );
        }
      },
    });
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* ─── HEADER & PROFILE ACTIONS ─── */}
      <div className="rounded-xl border-2 border-slate-900 bg-[#FAF6EE] p-3.5 sm:p-4 shadow-tactile">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-900 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 font-mono">
              {languageMode === "EN"
                ? "👥 Student Profiles & Access Control"
                : "👥 Pengurusan Murid & Kawalan Akses"}
            </h3>
            <p className="text-xs font-bold text-slate-600 mt-0.5">
              {languageMode === "EN"
                ? "Manage student profiles, search, filter by year, configure PINs, and grant syllabus access."
                : "Urus profil murid, cari nama, tapis mengikut tahun, tetapkan PIN, dan kawal kebenaran silibus."}
            </p>
          </div>

          {/* Tutor Profile Edit Button */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleOpenTutorEdit}
              className="btn-tactile flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-amber-200 shadow-tactile-sm"
              title={languageMode === "EN" ? "Edit Tutor Profile" : "Edit Profil Tutor"}
            >
              <Edit3 className="h-3.5 w-3.5 text-slate-950" />
              <span>{languageMode === "EN" ? "Edit Tutor Profile" : "Edit Profil Tutor"}</span>
            </button>
          </div>
        </div>

        {/* Quick Add Student Form */}
        <form
          onSubmit={handleAddStudentSubmit}
          className="mt-3 flex flex-wrap items-center gap-2 pt-0.5"
        >
          <div className="flex items-center gap-1.5">
            <select
              value={newStudentAvatar}
              onChange={(e) => setNewStudentAvatar(e.target.value)}
              className="rounded-lg border-2 border-slate-900 bg-white px-2 py-1 text-sm font-bold shadow-tactile-sm"
            >
              {["🦊", "🐼", "🐯", "🐸", "🚀", "⚽", "🦄", "🦁", "🐨", "🦉"].map((av) => (
                <option key={av} value={av}>
                  {av}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder={languageMode === "EN" ? "New Student Name..." : "Nama Murid Baharu..."}
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              className="rounded-lg border-2 border-slate-900 bg-white px-2.5 py-1 text-xs font-black shadow-tactile-sm w-full sm:w-auto min-w-0 max-w-full"
            />
          </div>
          <select
            value={newStudentStartingYear}
            onChange={(e) => setNewStudentStartingYear(Number(e.target.value))}
            className="rounded-lg border-2 border-slate-900 bg-white px-2 py-1 text-xs font-bold shadow-tactile-sm font-mono"
          >
            <option value={1}>{languageMode === "EN" ? "Year 1" : "Tahun 1"}</option>
            <option value={2}>{languageMode === "EN" ? "Year 2" : "Tahun 2"}</option>
            <option value={3}>{languageMode === "EN" ? "Year 3" : "Tahun 3"}</option>
          </select>
          <button
            type="submit"
            disabled={isAddingStudent}
            className="btn-tactile flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-violet-500 px-3 py-1 text-xs font-black text-white hover:bg-violet-400 disabled:opacity-50 shadow-tactile-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>
              {isAddingStudent
                ? languageMode === "EN"
                  ? "Adding..."
                  : "Menambah..."
                : languageMode === "EN"
                ? "Add Student"
                : "Tambah Murid"}
            </span>
          </button>
        </form>
      </div>

      {/* ─── SEARCH & CURRENT YEAR FILTER BAR ─── */}
      <div className="rounded-xl border-2 border-slate-900 bg-white p-3 sm:p-3.5 shadow-tactile flex flex-wrap items-center justify-between gap-3">
        {/* Name Search Input */}
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                languageMode === "EN" ? "Search student by name..." : "Cari murid mengikut nama..."
              }
              className="w-full rounded-lg border-2 border-slate-900 bg-[#FAF6EE] pl-8 pr-3 py-1 text-xs font-black shadow-tactile-sm placeholder:text-slate-400"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="btn-tactile rounded-lg border-2 border-slate-900 bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-600"
            >
              {languageMode === "EN" ? "Clear" : "Kosongkan"}
            </button>
          )}
        </div>

        {/* Current Year Filter Toggle */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 text-xs font-black text-slate-700 mr-1 font-mono">
            <Filter className="h-3 w-3" />
            <span>{languageMode === "EN" ? "Year:" : "Tahun:"}</span>
          </div>
          {[
            { id: "ALL", label: languageMode === "EN" ? "All" : "Semua" },
            { id: 1, label: languageMode === "EN" ? "Y1" : "T1" },
            { id: 2, label: languageMode === "EN" ? "Y2" : "T2" },
            { id: 3, label: languageMode === "EN" ? "Y3" : "T3" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setYearFilter(tab.id)}
              className={`btn-tactile rounded-lg px-2.5 py-1 text-xs font-black border-2 border-slate-900 transition-all font-mono ${
                yearFilter === tab.id
                  ? "bg-amber-300 text-slate-950 shadow-tactile-sm"
                  : "bg-white text-slate-700 hover:bg-[#FAF6EE]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── STUDENT CARDS GRID ─── */}
      {filteredStudents.length === 0 ? (
        <div className="rounded-xl border-2 border-slate-900 bg-white p-6 text-center shadow-tactile space-y-1.5">
          <p className="text-sm font-black text-slate-900 font-mono">
            {languageMode === "EN"
              ? "No students match the search filter."
              : "Tiada murid yang sepadan dengan carian ini."}
          </p>
          <p className="text-xs font-bold text-slate-500">
            {languageMode === "EN"
              ? "Try clearing the search query or year filter."
              : "Cuba kosongkan carian nama atau tukar pilihan tahun."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredStudents.map((stu) => {
            const y2Setting =
              stu.yearAccess?.[2] === "UNLOCKED" || stu.unlocked_darjah?.includes(2)
                ? "UNLOCKED"
                : "LOCKED";
            const y3Setting =
              stu.yearAccess?.[3] === "UNLOCKED" || stu.unlocked_darjah?.includes(3)
                ? "UNLOCKED"
                : "LOCKED";
            const computedDarjah = y3Setting === "UNLOCKED" ? 3 : y2Setting === "UNLOCKED" ? 2 : 1;

            return (
              <div
                key={stu.id}
                className="rounded-xl border-2 border-slate-900 bg-white p-3.5 sm:p-4 transition-all shadow-tactile flex flex-col justify-between"
              >
                <div>
                  {/* Top: Avatar, Name, Year & Status */}
                  <div className="flex items-start justify-between border-b-2 border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl sm:text-3xl shrink-0">{stu.avatar}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-black text-slate-900 truncate">{stu.name}</h4>
                          <span className="rounded-md border border-slate-900 bg-amber-200 px-1.5 py-0.2 font-mono text-[10px] font-black text-amber-950 shrink-0">
                            {languageMode === "EN" ? `Year ${computedDarjah}` : `Tahun ${computedDarjah}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`rounded-md border border-slate-900 px-2 py-0.5 text-[10px] font-black shrink-0 ${
                        (stu.status || "Active") === "Active"
                          ? "bg-emerald-100 text-emerald-950"
                          : (stu.status || "Active") === "Graduate"
                          ? "bg-violet-100 text-violet-950"
                          : "bg-rose-100 text-rose-950"
                      }`}
                    >
                      {(stu.status || "Active") === "Active"
                        ? languageMode === "EN" ? "🟢 Active" : "🟢 Aktif"
                        : (stu.status || "Active") === "Graduate"
                        ? languageMode === "EN" ? "🎓 Graduate" : "🎓 Tamat"
                        : languageMode === "EN" ? "🔴 Deactivated" : "🔴 Nyahaktif"}
                    </span>
                  </div>

                  {/* Summary Details: Clean Read-Only Indicators */}
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-600">
                        {languageMode === "EN" ? "Current Year:" : "Tahun Semasa:"}
                      </span>
                      <span className="rounded-md border border-slate-900 bg-amber-100 px-2 py-0.5 text-xs font-black text-slate-900 shadow-sm font-mono">
                        {languageMode === "EN" ? `Year ${computedDarjah}` : `Tahun ${computedDarjah}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-600 shrink-0">
                        {languageMode === "EN" ? "Year Access:" : "Akses Tahun:"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[11px] font-black font-mono ${
                            y2Setting === "UNLOCKED"
                              ? "border-emerald-900 bg-emerald-100 text-emerald-950"
                              : "border-slate-400 bg-slate-100 text-slate-600"
                          }`}
                        >
                          T2: {y2Setting === "UNLOCKED" ? "🔓" : "🔒"}
                        </span>
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[11px] font-black font-mono ${
                            y3Setting === "UNLOCKED"
                              ? "border-emerald-900 bg-emerald-100 text-emerald-950"
                              : "border-slate-400 bg-slate-100 text-slate-600"
                          }`}
                        >
                          T3: {y3Setting === "UNLOCKED" ? "🔓" : "🔒"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="font-bold text-slate-600">
                        {languageMode === "EN" ? "PIN Status:" : "Status PIN:"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-black font-mono ${
                          (stu.pin_code && String(stu.pin_code).trim() !== "") || (stu.pin && String(stu.pin).trim() !== "")
                            ? "border-emerald-900 bg-emerald-100 text-emerald-950"
                            : "border-slate-400 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {(stu.pin_code && String(stu.pin_code).trim() !== "") || (stu.pin && String(stu.pin).trim() !== "")
                          ? languageMode === "EN" ? "🔒 Configured" : "🔒 Ditetapkan"
                          : languageMode === "EN" ? "⚠️ No PIN" : "⚠️ Tiada PIN"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions: JUST EDIT & DELETE */}
                <div className="mt-4 flex items-center justify-between gap-2 border-t-2 border-slate-100 pt-3">
                  <button
                    onClick={() => handleOpenEdit(stu)}
                    className="btn-tactile flex-1 flex items-center justify-center gap-1.5 rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-amber-400 shadow-tactile-sm"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>{languageMode === "EN" ? "Edit Profile" : "Edit Murid"}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteStudentPrompt(stu)}
                    disabled={allStudents.length <= 1}
                    className={`btn-tactile flex items-center justify-center gap-1.5 rounded-lg border-2 border-slate-900 px-3 py-1.5 text-xs font-black shadow-tactile-sm ${
                      allStudents.length <= 1
                        ? "opacity-40 cursor-not-allowed bg-slate-100 text-slate-400"
                        : "bg-rose-100 text-rose-950 hover:bg-rose-200"
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-700" />
                    <span>{languageMode === "EN" ? "Delete" : "Padam"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── STUDENT EDIT MODAL ─── */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border-3 border-slate-900 bg-white p-4 sm:p-5 shadow-tactile space-y-4 max-h-[92vh] overflow-y-auto min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{editFormAvatar}</span>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 font-mono">
                    {languageMode === "EN" ? "Edit Student Profile" : "Edit Profil Murid"}
                  </h4>
                  <p className="text-xs font-bold text-slate-500 font-mono">
                    {editingStudent.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="rounded-lg border-2 border-slate-900 bg-white p-1 hover:bg-rose-100"
                aria-label={languageMode === "EN" ? "Close" : "Tutup"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentEdit} className="space-y-3.5 text-xs font-bold">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-slate-800 font-black">
                  {languageMode === "EN" ? "Student Name:" : "Nama Murid:"}
                </label>
                <input
                  type="text"
                  value={editFormName}
                  onChange={(e) => setEditFormName(e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-900 bg-[#FAF6EE] px-3 py-1.5 text-xs font-black shadow-tactile-sm"
                  placeholder={languageMode === "EN" ? "Enter student name..." : "Masukkan nama murid..."}
                />
              </div>

              {/* Avatar Selector */}
              <div className="space-y-1">
                <label className="text-slate-800 font-black">
                  {languageMode === "EN" ? "Avatar Icon:" : "Pilih Ikon Avatar:"}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {["🦊", "🐼", "🐯", "🐸", "🚀", "⚽", "🦄", "🦁", "🐨", "🦉"].map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setEditFormAvatar(av)}
                      className={`h-9 w-9 rounded-lg border-2 border-slate-900 text-lg flex items-center justify-center transition-all ${
                        editFormAvatar === av ? "bg-amber-300 scale-110 shadow-tactile-sm" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Academic Year */}
              <div className="space-y-1">
                <label className="text-slate-800 font-black">
                  {languageMode === "EN" ? "Current Academic Year:" : "Tahun Semasa Murid:"}
                </label>
                <select
                  value={editFormYear}
                  onChange={(e) => setEditFormYear(Number(e.target.value))}
                  className="w-full max-w-full min-w-0 truncate rounded-lg border-2 border-slate-900 bg-[#FAF6EE] px-3 py-1.5 text-xs font-black shadow-tactile-sm font-mono"
                >
                  <option value={1}>{languageMode === "EN" ? "Year 1 (Tahun 1)" : "Tahun 1"}</option>
                  <option value={2}>{languageMode === "EN" ? "Year 2 (Tahun 2)" : "Tahun 2"}</option>
                  <option value={3}>{languageMode === "EN" ? "Year 3 (Tahun 3)" : "Tahun 3"}</option>
                </select>
              </div>

              {/* Year Access Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                <div className="space-y-1">
                  <label className="text-slate-800 font-black">
                    {languageMode === "EN" ? "Year 2 Access:" : "Akses Tahun 2:"}
                  </label>
                  <select
                    value={editFormYear2Access}
                    onChange={(e) => setEditFormYear2Access(e.target.value)}
                    className="w-full max-w-full min-w-0 truncate rounded-lg border-2 border-slate-900 bg-[#FAF6EE] px-2 py-1.5 text-xs font-black shadow-tactile-sm font-mono"
                  >
                    <option value="UNLOCKED">{languageMode === "EN" ? "🔓 UNLOCKED" : "🔓 DIBUKA"}</option>
                    <option value="LOCKED">{languageMode === "EN" ? "🔒 LOCKED" : "🔒 DIKUNCI"}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-800 font-black">
                    {languageMode === "EN" ? "Year 3 Access:" : "Akses Tahun 3:"}
                  </label>
                  <select
                    value={editFormYear3Access}
                    onChange={(e) => setEditFormYear3Access(e.target.value)}
                    className="w-full max-w-full min-w-0 truncate rounded-lg border-2 border-slate-900 bg-[#FAF6EE] px-2 py-1.5 text-xs font-black shadow-tactile-sm font-mono"
                  >
                    <option value="UNLOCKED">{languageMode === "EN" ? "🔓 UNLOCKED" : "🔓 DIBUKA"}</option>
                    <option value="LOCKED">{languageMode === "EN" ? "🔒 LOCKED" : "🔒 DIKUNCI"}</option>
                  </select>
                </div>
              </div>

              {/* Student Status */}
              <div className="space-y-1">
                <label className="text-slate-800 font-black">
                  {languageMode === "EN" ? "Account Status:" : "Status Akaun:"}
                </label>
                <select
                  value={editFormStatus}
                  onChange={(e) => setEditFormStatus(e.target.value)}
                  className={`w-full max-w-full min-w-0 truncate rounded-lg border-2 border-slate-900 px-3 py-1.5 text-xs font-black shadow-tactile-sm font-mono ${
                    editFormStatus === "Active"
                      ? "bg-emerald-100 text-emerald-950"
                      : editFormStatus === "Graduate"
                      ? "bg-violet-100 text-violet-950"
                      : "bg-rose-100 text-rose-950"
                  }`}
                >
                  <option value="Active">{languageMode === "EN" ? "Active (Normal Learning)" : "Aktif (Latihan Biasa)"}</option>
                  <option value="Deactivate">{languageMode === "EN" ? "Deactivate (Account Blocked)" : "Nyahaktif (Akaun Disekat)"}</option>
                  <option value="Graduate">{languageMode === "EN" ? "Graduate (View-Only Archive)" : "Tamat / Graduate (Mod Arkib)"}</option>
                </select>
              </div>

              {/* Student PIN */}
              <div className="space-y-1 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-black">
                    {languageMode === "EN" ? "Student PIN (4 Digits):" : "Kod PIN Murid (4 Digit):"}
                  </label>
                  {editFormPin && (
                    <button
                      type="button"
                      onClick={() => setEditFormPin("")}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      {languageMode === "EN" ? "Clear PIN" : "Kosongkan PIN"}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={4}
                  value={editFormPin}
                  onChange={(e) => setEditFormPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="0000"
                  className="w-full rounded-lg border-2 border-slate-900 bg-[#FAF6EE] px-3 py-1.5 text-center font-mono text-base font-black tracking-widest shadow-tactile-sm"
                />
                <p className="text-[11px] text-slate-500 font-normal">
                  {languageMode === "EN"
                    ? "Leave blank if student does not require a PIN."
                    : "Kosongkan jika murid tidak memerlukan kod PIN."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t-2 border-slate-900">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="btn-tactile rounded-lg border-2 border-slate-900 bg-white px-4 py-1.5 text-xs font-black text-slate-700"
                >
                  {languageMode === "EN" ? "Cancel" : "Batal"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="btn-tactile rounded-lg border-2 border-slate-900 bg-emerald-400 px-5 py-1.5 text-xs font-black text-slate-950 hover:bg-emerald-300 shadow-tactile-sm disabled:opacity-50"
                >
                  {isSubmittingEdit
                    ? languageMode === "EN" ? "Saving..." : "Menyimpan..."
                    : languageMode === "EN" ? "Save Changes" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── TUTOR PROFILE EDIT MODAL ─── */}
      {isEditingTutor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border-3 border-slate-900 bg-white p-4 sm:p-5 shadow-tactile space-y-4 max-h-[92vh] overflow-y-auto min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{tutorEditAvatar}</span>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 font-mono">
                    {languageMode === "EN" ? "Edit Tutor Profile" : "Edit Profil Tutor"}
                  </h4>
                  <p className="text-xs font-bold text-slate-500 font-mono">
                    {activeUser?.name || "Tutor"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingTutor(false)}
                className="rounded-lg border-2 border-slate-900 bg-white p-1 hover:bg-rose-100"
                aria-label={languageMode === "EN" ? "Close" : "Tutup"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTutorEdit} className="space-y-3.5 text-xs font-bold">
              {/* Tutor Name */}
              <div className="space-y-1">
                <label className="text-slate-800 font-black">
                  {languageMode === "EN" ? "Tutor Name:" : "Nama Tutor:"}
                </label>
                <input
                  type="text"
                  value={tutorEditName}
                  onChange={(e) => setTutorEditName(e.target.value)}
                  className="w-full rounded-lg border-2 border-slate-900 bg-[#FAF6EE] px-3 py-1.5 text-xs font-black shadow-tactile-sm"
                  placeholder={languageMode === "EN" ? "Enter tutor name..." : "Masukkan nama tutor..."}
                />
              </div>

              {/* Tutor Avatar Selector */}
              <div className="space-y-1">
                <label className="text-slate-800 font-black">
                  {languageMode === "EN" ? "Avatar Icon:" : "Pilih Ikon Avatar:"}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {["👨‍🏫", "👩‍🏫", "🧑‍🏫", "🦁", "🦊", "🚀", "🦉", "⭐", "🎓", "📚"].map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setTutorEditAvatar(av)}
                      className={`h-9 w-9 rounded-lg border-2 border-slate-900 text-lg flex items-center justify-center transition-all ${
                        tutorEditAvatar === av ? "bg-amber-300 scale-110 shadow-tactile-sm" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tutor PIN */}
              <div className="space-y-1 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-black">
                    {languageMode === "EN" ? "Tutor PIN (4 to 6 Digits):" : "Kod PIN Tutor (4 hingga 6 Digit):"}
                  </label>
                  {tutorEditPin && (
                    <button
                      type="button"
                      onClick={() => setTutorEditPin("")}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      {languageMode === "EN" ? "Clear PIN" : "Kosongkan PIN"}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={tutorEditPin}
                  onChange={(e) => setTutorEditPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="1234"
                  className="w-full rounded-lg border-2 border-slate-900 bg-[#FAF6EE] px-3 py-1.5 text-center font-mono text-base font-black tracking-widest shadow-tactile-sm"
                />
                <p className="text-[11px] text-slate-500 font-normal">
                  {languageMode === "EN"
                    ? "Leave blank if tutor does not require a PIN."
                    : "Kosongkan jika tutor tidak memerlukan PIN untuk log masuk."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t-2 border-slate-900">
                <button
                  type="button"
                  onClick={() => setIsEditingTutor(false)}
                  className="btn-tactile rounded-lg border-2 border-slate-900 bg-white px-4 py-1.5 text-xs font-black text-slate-700"
                >
                  {languageMode === "EN" ? "Cancel" : "Batal"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTutorEdit}
                  className="btn-tactile rounded-lg border-2 border-slate-900 bg-emerald-400 px-5 py-1.5 text-xs font-black text-slate-950 hover:bg-emerald-300 shadow-tactile-sm disabled:opacity-50"
                >
                  {isSubmittingTutorEdit
                    ? languageMode === "EN" ? "Saving..." : "Menyimpan..."
                    : languageMode === "EN" ? "Save Changes" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
