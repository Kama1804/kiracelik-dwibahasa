// src/components/auth/PinLoginHomepage.jsx
// Dedicated PIN Login Homepage for KiraCelik Dwibahasa
// Role isolation: Tutors log into management workspace; students into their learning dashboard.
// Deactivated accounts are blocked; Graduate accounts enter in view-only mode.

import { useState, useEffect, useCallback } from "react";
import { BookOpen, ShieldCheck, Lock, ArrowLeft, Delete, AlertCircle } from "lucide-react";
import { verifyPin, updateUserPinSync } from "../../services/storageService.js";
import { toast } from "../ui/toast.js";
import Footer from "../layout/Footer.jsx";

export default function PinLoginHomepage({
  db,
  languageMode = "DWIBAHASA",
  setLanguageMode,
  onLoginSuccess,
}) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [confirmPinInput, setConfirmPinInput] = useState("");
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [isConfirmingPin, setIsConfirmingPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [blockedMessage, setBlockedMessage] = useState("");

  const tutorUsers = (db.users || []).filter((u) => u.role === "TUTOR");
  const studentUsers = (db.users || []).filter(
    (u) => u.role === "STUDENT" && u.status !== "Deactivate"
  );

  // Support 4-to-6 digit PINs: adapt dynamically to existing saved PIN length, or up to 6 for Tutor
  const activePin =
    (selectedUser?.pin_code && selectedUser.pin_code.trim().length > 0)
      ? selectedUser.pin_code.trim()
      : (selectedUser?.pin && selectedUser.pin.trim().length > 0)
      ? selectedUser.pin.trim()
      : null;

  const maxPinLength =
    activePin
      ? activePin.length
      : selectedUser?.role === "TUTOR"
      ? 6
      : 4;

  const handleSelectUser = (user) => {
    setErrorMessage("");
    setBlockedMessage("");
    setPinInput("");
    setConfirmPinInput("");
    setIsConfirmingPin(false);

    // Deactivated students cannot sign in
    if (user.role === "STUDENT" && user.status === "Deactivate") {
      setBlockedMessage(
        languageMode === "EN"
          ? `Account for "${user.name}" is deactivated. Please contact your tutor to reactivate.`
          : `Akaun "${user.name}" telah dinyahaktifkan oleh Tutor. Sila hubungi tutor anda untuk mengaktifkannya semula.`
      );
      return;
    }

    setSelectedUser(user);
    const hasPin =
      (user.pin_code && user.pin_code.trim() !== "") ||
      (user.pin && user.pin.trim() !== "");
    if (!hasPin) {
      setIsSettingPin(true);
    } else {
      setIsSettingPin(false);
    }
  };

  const handleBackToProfiles = () => {
    setSelectedUser(null);
    setPinInput("");
    setConfirmPinInput("");
    setIsSettingPin(false);
    setIsConfirmingPin(false);
    setErrorMessage("");
    setBlockedMessage("");
  };

  const checkPin = useCallback(
    (pin) => {
      if (!selectedUser) return;
      const res = verifyPin(db, selectedUser.id, pin);
      if (res.success) {
        const welcomeTitle =
          languageMode === "EN" ? "Login Successful" : "Log Masuk Berjaya";
        const welcomeMsg =
          selectedUser.role === "TUTOR"
            ? languageMode === "EN"
              ? `👋 Welcome back, Tutor ${selectedUser.name}!`
              : `👋 Selamat datang kembali, Tutor ${selectedUser.name}!`
            : languageMode === "EN"
            ? `👋 Welcome, ${selectedUser.name}! Let's start learning mathematics.`
            : `👋 Selamat datang, ${selectedUser.name}! Jom mulakan latihan matematik.`;
        toast.success(welcomeMsg, welcomeTitle);
        onLoginSuccess(selectedUser, db);
      } else {
        const errorMsg =
          languageMode === "EN"
            ? "⚠️ Incorrect PIN! Please try again."
            : "⚠️ PIN Tidak Tepat! Sila cuba lagi.";
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        setPinInput("");
      }
    },
    [db, selectedUser, onLoginSuccess, languageMode]
  );

  const handleSaveInitialPin = useCallback(
    (pinToConfirm) => {
      const confirmVal = pinToConfirm !== undefined ? pinToConfirm : confirmPinInput;
      if (pinInput.length !== maxPinLength) {
        setErrorMessage(
          languageMode === "EN"
            ? `Please enter a ${maxPinLength}-digit PIN.`
            : `Sila masukkan ${maxPinLength} angka PIN.`
        );
        return;
      }
      if (pinInput !== confirmVal) {
        const mismatchMsg =
          languageMode === "EN"
            ? "⚠️ PIN confirmation does not match! Please re-enter the correct confirmation PIN."
            : "⚠️ Pengesahan PIN tidak sepadan! Sila masukkan semula PIN pengesahan yang betul.";
        setErrorMessage(mismatchMsg);
        toast.warning(mismatchMsg);
        setConfirmPinInput("");
        // Keep on Step 2 (do not reset both fields or exit)
        return;
      }

      const successMsg =
        languageMode === "EN"
          ? `✅ PIN set up successfully! Welcome, ${selectedUser.name}.`
          : `✅ PIN berjaya ditetapkan! Selamat datang, ${selectedUser.name}.`;
      toast.success(successMsg);

      const updatedDb = updateUserPinSync(db, selectedUser.id, pinInput);
      const updatedUser = { ...selectedUser, pin_code: pinInput, pin: pinInput };
      onLoginSuccess(updatedUser, updatedDb);
    },
    [pinInput, maxPinLength, confirmPinInput, db, selectedUser, onLoginSuccess, languageMode]
  );

  const handleDigit = useCallback(
    (d) => {
      setErrorMessage("");
      if (isSettingPin) {
        if (!isConfirmingPin) {
          if (pinInput.length < maxPinLength) {
            const next = pinInput + d;
            setPinInput(next);
            if (next.length === maxPinLength) {
              setIsConfirmingPin(true);
              setConfirmPinInput("");
            }
          }
        } else {
          if (confirmPinInput.length < maxPinLength) {
            const next = confirmPinInput + d;
            setConfirmPinInput(next);
            if (next.length === maxPinLength) {
              handleSaveInitialPin(next);
            }
          }
        }
      } else {
        if (pinInput.length < maxPinLength) {
          const next = pinInput + d;
          setPinInput(next);
          if (next.length === maxPinLength) {
            checkPin(next);
          }
        }
      }
    },
    [isSettingPin, isConfirmingPin, pinInput, confirmPinInput, maxPinLength, checkPin, handleSaveInitialPin]
  );

  const handleBackspace = useCallback(() => {
    setErrorMessage("");
    if (isSettingPin) {
      if (isConfirmingPin) {
        if (confirmPinInput.length > 0) {
          setConfirmPinInput((prev) => prev.slice(0, -1));
        } else {
          setIsConfirmingPin(false);
        }
      } else {
        setPinInput((prev) => prev.slice(0, -1));
      }
    } else {
      setPinInput((prev) => prev.slice(0, -1));
    }
  }, [isSettingPin, isConfirmingPin, confirmPinInput.length]);

  // Physical Keyboard Listener
  useEffect(() => {
    if (!selectedUser) return;
    const handleKeyDown = (e) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape") {
        handleBackToProfiles();
      } else if (e.key === "Enter") {
        if (isSettingPin && isConfirmingPin) {
          handleSaveInitialPin();
        } else if (!isSettingPin && pinInput.length > 0) {
          checkPin(pinInput);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedUser,
    isSettingPin,
    isConfirmingPin,
    pinInput,
    handleDigit,
    handleBackspace,
    handleSaveInitialPin,
    checkPin,
  ]);

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-slate-900 flex flex-col justify-between">
      {/* ─── STICKY HEADER ─── */}
      <header className="border-b-2 border-slate-900 bg-[#FAF6EE] px-4 py-3 shadow-tactile-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-slate-900 bg-sky-400 text-slate-950 shadow-tactile-sm">
              <BookOpen className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl font-mono">
                KiraCelik
              </h1>
              <p className="text-xs font-bold text-slate-600">
                {languageMode === "EN"
                  ? "KSSR Mathematics Workbook & Assessment (Years 1, 2 & 3)"
                  : "Buku Latihan Matematik KSSR Tahap 1 (Tahun 1, 2 & 3)"}
              </p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex rounded-xl border-2 border-slate-900 bg-white p-1 shadow-tactile-sm">
            {[
              { id: "BM", label: "🇲🇾 BM" },
              { id: "EN", label: "🇬🇧 EN" },
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => setLanguageMode(lang.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-black transition-all ${
                  languageMode === lang.id
                    ? "border-2 border-slate-900 bg-amber-300 text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="mx-auto w-full max-w-4xl px-4 py-8 flex-1 flex flex-col justify-center">
        {!selectedUser ? (
          /* ─── 1. PROFILE SELECTION VIEW ─── */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <span className="inline-block rounded-xl border-2 border-slate-900 bg-sky-200 px-3 py-1 font-mono text-xs font-black text-slate-950 shadow-tactile-sm">
                {languageMode === "EN" ? "🔐 USER AUTHENTICATION" : "🔐 LOG MASUK BERPENGESAHAN PIN"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                {languageMode === "EN" ? "Choose Your Profile" : "Pilih Profil Anda"}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-600 max-w-md mx-auto">
                {languageMode === "EN"
                  ? "Select your account and enter your configured 4-digit PIN to continue."
                  : "Sila pilih akaun anda dan masukkan PIN 4-angka untuk memulakan latihan atau pengurusan."}
              </p>
            </div>

            {blockedMessage && (
              <div className="rounded-2xl border-2 border-rose-900 bg-rose-100 p-4 text-center shadow-tactile-sm flex items-center justify-center gap-2 text-rose-950 font-black text-xs sm:text-sm">
                <AlertCircle className="h-5 w-5 text-rose-700 flex-shrink-0" />
                <span>{blockedMessage}</span>
              </div>
            )}

            {/* Section A: Tutor Profiles */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 font-mono">
                {languageMode === "EN" ? "🛡️ Tutor Access" : "🛡️ Akses Tutor"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tutorUsers.map((tutor) => (
                  <button
                    key={tutor.id}
                    onClick={() => handleSelectUser(tutor)}
                    className="btn-tactile flex items-center justify-between rounded-3xl border-2 border-slate-900 bg-violet-100 p-5 text-left transition-all hover:bg-violet-200 shadow-tactile"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-violet-400 text-3xl shadow-tactile-sm">
                        {tutor.avatar || "👨‍🏫"}
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1 rounded-md border border-slate-900 bg-violet-600 px-2 py-0.5 text-[10px] font-mono font-black text-white">
                          <ShieldCheck className="h-3 w-3" />
                          <span>TUTOR</span>
                        </div>
                        <h4 className="mt-1 text-base font-black text-slate-900">{tutor.name}</h4>
                        <p className="text-[11px] font-bold text-slate-600">
                          {languageMode === "EN" ? "Question Bank & Records" : "Bank Soalan & Semakan PBD"}
                        </p>
                      </div>
                    </div>
                    <Lock className="h-5 w-5 text-violet-800" />
                  </button>
                ))}
              </div>
            </div>

            {/* Section B: Student Profiles */}
            <div className="space-y-3 pt-4 border-t-2 border-slate-200">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 font-mono">
                {languageMode === "EN" ? "📚 Student Learning Profiles" : "📚 Profil Pembelajaran Murid"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {studentUsers.map((student) => {
                  const status = student.status || "Active";
                  const isDeactivated = status === "Deactivate";
                  const isGraduated = status === "Graduate";

                  return (
                    <button
                      key={student.id}
                      onClick={() => handleSelectUser(student)}
                      className={`btn-tactile flex flex-col justify-between rounded-3xl border-2 border-slate-900 p-5 text-left transition-all shadow-tactile ${
                        isDeactivated
                          ? "bg-slate-100 opacity-60 hover:bg-slate-200 cursor-not-allowed"
                          : isGraduated
                          ? "bg-violet-50 hover:bg-violet-100"
                          : "bg-white hover:bg-sky-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-slate-900 bg-amber-300 text-2xl shadow-tactile-sm">
                          {student.avatar || "🦁"}
                        </div>
                        {isDeactivated && (
                          <span className="rounded-lg border border-rose-900 bg-rose-200 px-2 py-0.5 text-[10px] font-black text-rose-950 font-mono">
                            {languageMode === "EN" ? "DEACTIVATED" : "DINYAHAKTIFKAN"}
                          </span>
                        )}
                        {isGraduated && (
                          <span className="rounded-lg border border-violet-900 bg-violet-200 px-2 py-0.5 text-[10px] font-black text-violet-950 font-mono">
                            🎓 {languageMode === "EN" ? "GRADUATED" : "TAMAT"}
                          </span>
                        )}
                        {!isDeactivated && !isGraduated && (
                          <span className="rounded-lg border border-emerald-900 bg-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-950 font-mono">
                            {languageMode === "EN" ? "ACTIVE" : "AKTIF"}
                          </span>
                        )}
                      </div>

                      <div className="mt-3">
                        <h4 className="text-base font-black text-slate-900">{student.name}</h4>
                        <p className="text-[11px] font-bold text-slate-500">
                          {languageMode === "EN"
                            ? `Year ${student.darjah || 1} Student`
                            : `Murid Tahun ${student.darjah || 1}`}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-2 text-[11px] font-black text-slate-600">
                        <span>{languageMode === "EN" ? "Enter PIN" : "Masukkan PIN"}</span>
                        <Lock className="h-3.5 w-3.5 text-slate-700" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ─── 2. TACTILE PIN KEYPAD ENTRY VIEW ─── */
          <div className="mx-auto w-full max-w-md rounded-3xl border-3 border-slate-900 bg-white p-6 sm:p-8 shadow-tactile space-y-5">
            {/* Top Back Button & User Identifier */}
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
              <button
                onClick={handleBackToProfiles}
                className="btn-tactile flex items-center gap-1.5 rounded-xl border border-slate-900 bg-[#FAF6EE] px-3 py-1.5 text-xs font-black text-slate-800 hover:bg-slate-100"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{languageMode === "EN" ? "Switch Profile" : "Tukar Profil"}</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedUser.avatar}</span>
                <div className="text-right">
                  <h4 className="text-xs font-black text-slate-900">{selectedUser.name}</h4>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    {selectedUser.role === "TUTOR" ? "TUTOR" : "STUDENT"}
                  </span>
                </div>
              </div>
            </div>

            {/* Title / Instructions */}
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 font-mono">
                {isSettingPin
                  ? !isConfirmingPin
                    ? languageMode === "EN"
                      ? `Set New ${maxPinLength}-Digit PIN`
                      : `Tetapkan PIN ${maxPinLength}-Angka Baharu`
                    : languageMode === "EN"
                    ? `Confirm Your ${maxPinLength}-Digit PIN`
                    : `Sahkan PIN ${maxPinLength}-Angka Anda`
                  : languageMode === "EN"
                  ? `Enter Your ${maxPinLength}-Digit PIN`
                  : `Masukkan PIN ${maxPinLength}-Angka`}
              </h3>
              <p className="text-xs font-bold text-slate-500">
                {isSettingPin
                  ? languageMode === "EN"
                    ? "This account has no PIN configured yet. Please create one."
                    : "Akaun ini belum mempunyai PIN. Sila cipta PIN anda."
                  : languageMode === "EN"
                  ? `Enter PIN for ${selectedUser.name}`
                  : `Sila masukkan PIN bagi akaun ${selectedUser.name}`}
              </p>
            </div>

            {/* PIN Dots Display */}
            <div className="flex items-center justify-center gap-4 py-2">
              {Array.from({ length: maxPinLength }).map((_, idx) => {
                const activeVal = isSettingPin && isConfirmingPin ? confirmPinInput : pinInput;
                const isFilled = idx < activeVal.length;
                return (
                  <div
                    key={idx}
                    className={`h-5 w-5 rounded-full border-2 border-slate-900 transition-all ${
                      isFilled ? "bg-amber-400 scale-125 shadow-tactile-sm" : "bg-slate-100"
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="rounded-xl border-2 border-rose-900 bg-rose-100 p-2.5 text-center text-xs font-black text-rose-900 animate-shake">
                {errorMessage}
              </div>
            )}

            {/* Back to Step 1 Button when Confirming */}
            {isSettingPin && isConfirmingPin && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmingPin(false);
                    setConfirmPinInput("");
                    setErrorMessage("");
                  }}
                  className="inline-flex items-center gap-1 text-xs font-black text-sky-700 hover:text-sky-900 underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>{languageMode === "EN" ? "Change New PIN" : "Tukar PIN Baharu"}</span>
                </button>
              </div>
            )}

            {/* Save Initial PIN Button (When Setting PIN & Confirmed) */}
            {isSettingPin && isConfirmingPin && confirmPinInput.length === maxPinLength && (
              <button
                onClick={handleSaveInitialPin}
                className="btn-tactile w-full rounded-2xl bg-emerald-400 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300 shadow-tactile"
              >
                ✅ {languageMode === "EN" ? "Save PIN & Log In" : "Simpan PIN & Log Masuk"}
              </button>
            )}

            {/* Tactile Keypad */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleDigit(String(digit))}
                  className="btn-tactile flex h-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-white font-mono text-2xl font-black text-slate-900 hover:bg-amber-100 shadow-tactile-sm active:translate-y-1"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={() => {
                  setPinInput("");
                  setConfirmPinInput("");
                  setIsConfirmingPin(false);
                  setErrorMessage("");
                }}
                className="btn-tactile flex h-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-slate-100 font-mono text-xs font-black text-slate-700 hover:bg-slate-200"
              >
                {languageMode === "EN" ? "CLEAR" : "PADAM"}
              </button>
              <button
                onClick={() => handleDigit("0")}
                className="btn-tactile flex h-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-white font-mono text-2xl font-black text-slate-900 hover:bg-amber-100 shadow-tactile-sm active:translate-y-1"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="btn-tactile flex h-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-rose-100 font-mono text-base font-black text-rose-950 hover:bg-rose-200"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ─── FOOTER ─── */}
      <Footer languageMode={languageMode} />
    </div>
  );
}
