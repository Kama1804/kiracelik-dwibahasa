// src/components/auth/PinGateModal.jsx
// Tactile Neo-Brutalist PIN Authentication & Setup Modal
// Implements strict 2-step setup (SET PIN -> CONFIRM PIN) with mismatch warnings & success popups.

import { useState, useEffect, useCallback } from "react";
import { X, Check, ShieldCheck, User, ArrowRight, ArrowLeft, Delete, KeyRound } from "lucide-react";
import { verifyPin, updateUserPinSync } from "../../services/storageService.js";
import { toast } from "../ui/toast.js";

export default function PinGateModal({
  targetUser,
  currentDb,
  languageMode = "BM",
  onSuccess,
  onCancel,
}) {
  const isBlankPin =
    (!targetUser.pin_code || targetUser.pin_code.trim() === "") &&
    (!targetUser.pin || targetUser.pin.trim() === "");
  const minPinLength = 4;
  const maxPinLength = targetUser.role === "TUTOR" ? 6 : 4;

  // "SET_NEW" (when pin is blank or user clicks change pin) or "VERIFY" (when entering existing pin)
  const [mode, setMode] = useState(isBlankPin ? "SET_NEW" : "VERIFY");
  // In SET_NEW mode: step 1 (Enter New PIN) -> step 2 (Confirm PIN)
  const [step, setStep] = useState(1);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [verifyPinInput, setVerifyPinInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const expectedVerifyLength = targetUser.pin_code?.trim().length || targetUser.pin?.trim().length || 4;

  // Check entered PIN in VERIFY mode
  const checkEnteredPin = useCallback(
    (pinToCheck) => {
      const result = verifyPin(currentDb, targetUser.id, pinToCheck);
      if (result.success) {
        const welcomeTitle =
          languageMode === "EN" ? "Login Successful" : "Log Masuk Berjaya";
        const welcomeMsg =
          targetUser.role === "TUTOR"
            ? languageMode === "EN"
              ? `👋 Welcome back, Tutor ${targetUser.name}!`
              : `👋 Selamat datang kembali, Guru ${targetUser.name}!`
            : languageMode === "EN"
            ? `👋 Welcome, ${targetUser.name}! Let's start learning mathematics.`
            : `👋 Selamat datang, ${targetUser.name}! Jom mulakan latihan matematik.`;
        toast.success(welcomeMsg, welcomeTitle);
        onSuccess(currentDb, targetUser);
      } else {
        const errorMsg =
          languageMode === "EN"
            ? "⚠️ Incorrect PIN! Please try again."
            : "⚠️ PIN Salah! Sila cuba lagi.";
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        setVerifyPinInput("");
      }
    },
    [currentDb, targetUser, languageMode, onSuccess]
  );

  // Transition from Step 1 (Enter New PIN) to Step 2 (Confirm PIN)
  const handleProceedToConfirm = useCallback(() => {
    if (newPin.length < minPinLength) {
      const msg =
        languageMode === "EN"
          ? `Please enter at least ${minPinLength} digits.`
          : `Sila masukkan sekurang-kurangnya ${minPinLength} digit PIN.`;
      setErrorMessage(msg);
      return;
    }
    setStep(2);
    setConfirmPin("");
    setErrorMessage("");
  }, [newPin.length, minPinLength, languageMode]);

  // Validate confirmation and save PIN
  const handleValidateAndSavePin = useCallback(() => {
    if (confirmPin !== newPin) {
      const mismatchMsg =
        languageMode === "EN"
          ? "⚠️ PIN confirmation does not match! Please re-enter the correct confirmation PIN."
          : "⚠️ Pengesahan PIN tidak sepadan! Sila masukkan semula PIN pengesahan yang betul.";
      setErrorMessage(mismatchMsg);
      toast.warning(mismatchMsg);
      setConfirmPin("");
      // Keep user on Step 2
      return;
    }

    // Success! Show toast, update synchronously, and redirect
    const successMsg =
      languageMode === "EN"
        ? `✅ PIN set up successfully! Welcome, ${targetUser.name}.`
        : `✅ PIN berjaya ditetapkan! Selamat datang, ${targetUser.name}.`;
    toast.success(successMsg);

    const updatedDb = updateUserPinSync(currentDb, targetUser.id, newPin);
    const updatedUser = { ...targetUser, pin_code: newPin, pin: newPin };
    onSuccess(updatedDb, updatedUser);
  }, [confirmPin, newPin, currentDb, targetUser, languageMode, onSuccess]);

  // Keypad digit input handler
  const handleDigit = useCallback(
    (digit) => {
      setErrorMessage("");
      if (mode === "SET_NEW") {
        if (step === 1) {
          if (newPin.length < maxPinLength) {
            const next = newPin + digit;
            setNewPin(next);
          }
        } else {
          // Step 2: Confirmation
          if (confirmPin.length < newPin.length) {
            const next = confirmPin + digit;
            setConfirmPin(next);
          }
        }
      } else {
        // VERIFY Mode
        if (verifyPinInput.length < expectedVerifyLength) {
          const next = verifyPinInput + digit;
          setVerifyPinInput(next);
          if (next.length === expectedVerifyLength) {
            checkEnteredPin(next);
          }
        }
      }
    },
    [
      mode,
      step,
      newPin,
      confirmPin,
      verifyPinInput,
      maxPinLength,
      expectedVerifyLength,
      checkEnteredPin,
    ]
  );

  // Keypad backspace handler
  const handleBackspace = useCallback(() => {
    setErrorMessage("");
    if (mode === "SET_NEW") {
      if (step === 2) {
        if (confirmPin.length > 0) {
          setConfirmPin((prev) => prev.slice(0, -1));
        } else {
          setStep(1);
        }
      } else {
        setNewPin((prev) => prev.slice(0, -1));
      }
    } else {
      setVerifyPinInput((prev) => prev.slice(0, -1));
    }
  }, [mode, step, confirmPin.length]);

  // Keypad clear handler
  const handleClear = useCallback(() => {
    setErrorMessage("");
    if (mode === "SET_NEW") {
      if (step === 2) {
        setConfirmPin("");
      } else {
        setNewPin("");
      }
    } else {
      setVerifyPinInput("");
    }
  }, [mode, step]);

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter") {
        if (mode === "SET_NEW") {
          if (step === 1 && newPin.length >= minPinLength) {
            handleProceedToConfirm();
          } else if (step === 2 && confirmPin.length === newPin.length) {
            handleValidateAndSavePin();
          }
        } else if (mode === "VERIFY" && verifyPinInput.length > 0) {
          checkEnteredPin(verifyPinInput);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    mode,
    step,
    newPin.length,
    confirmPin.length,
    verifyPinInput,
    minPinLength,
    handleDigit,
    handleBackspace,
    handleProceedToConfirm,
    handleValidateAndSavePin,
    checkEnteredPin,
    onCancel,
  ]);

  // Display calculations
  const activeInputVal =
    mode === "SET_NEW" ? (step === 1 ? newPin : confirmPin) : verifyPinInput;
  const activeDotCount =
    mode === "SET_NEW"
      ? step === 1
        ? maxPinLength
        : newPin.length
      : expectedVerifyLength;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-sm rounded-3xl border-3 border-slate-900 bg-[#FAF6EE] p-5 sm:p-6 shadow-tactile-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-xl shadow-tactile-sm">
              {targetUser.avatar || "👤"}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                {targetUser.name}
              </h3>
              <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600 font-mono">
                {targetUser.role === "TUTOR" ? (
                  <>
                    <ShieldCheck className="h-3 w-3 text-violet-700" />
                    <span>{languageMode === "EN" ? "Tutor" : "Guru"}</span>
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 text-emerald-700" />
                    <span>
                      {languageMode === "EN"
                        ? `Year ${targetUser.current_darjah || 1} Student`
                        : `Murid Tahun ${targetUser.current_darjah || 1}`}
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-slate-900 bg-white text-slate-700 hover:bg-slate-100 shadow-tactile-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Body */}
        <div className="my-4 flex flex-col items-center">
          {/* Title & Instructions */}
          <div className="text-center space-y-1">
            <h4 className="text-sm sm:text-base font-black text-slate-900 font-mono">
              {mode === "SET_NEW"
                ? step === 1
                  ? languageMode === "EN"
                    ? `Set New ${maxPinLength}-Digit PIN`
                    : `Cipta PIN ${maxPinLength}-Digit Baharu`
                  : languageMode === "EN"
                  ? "Confirm Your New PIN"
                  : "Sahkan PIN Baharu Anda"
                : languageMode === "EN"
                ? `Enter ${expectedVerifyLength}-Digit PIN`
                : `Masukkan PIN ${expectedVerifyLength}-Digit`}
            </h4>
            <p className="text-xs font-bold text-slate-500 max-w-[260px]">
              {mode === "SET_NEW"
                ? step === 1
                  ? languageMode === "EN"
                    ? "Enter your secret PIN. Keep it safe."
                    : "Masukkan kod PIN rahsia anda."
                  : languageMode === "EN"
                  ? "Re-enter the exact same PIN to confirm."
                  : "Masukkan semula PIN yang sama untuk pengesahan."
                : languageMode === "EN"
                ? `Enter PIN for ${targetUser.name}`
                : `Sila masukkan PIN bagi akaun ${targetUser.name}`}
            </p>
          </div>

          {/* Circular Dots Indicator */}
          <div className="my-3 flex items-center justify-center gap-3">
            {Array.from({ length: activeDotCount }).map((_, idx) => {
              const filled = idx < activeInputVal.length;
              return (
                <div
                  key={idx}
                  className={`h-4 w-4 rounded-full border-2 border-slate-900 transition-all ${
                    filled
                      ? "bg-amber-400 scale-125 shadow-tactile-sm"
                      : "bg-white"
                  }`}
                />
              );
            })}
          </div>

          {/* Inline Error Message */}
          {errorMessage && (
            <div className="my-1.5 w-full rounded-xl border-2 border-rose-900 bg-rose-100 p-2 text-center text-xs font-black text-rose-950 animate-shake">
              {errorMessage}
            </div>
          )}

          {/* Tactile Keypad */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-[240px] pt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(String(digit))}
                className="btn-tactile flex h-12 items-center justify-center rounded-xl border-2 border-slate-900 bg-white font-mono text-xl font-black text-slate-900 hover:bg-amber-100 shadow-tactile-sm active:translate-y-0.5"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              className="btn-tactile flex h-12 items-center justify-center rounded-xl border-2 border-slate-900 bg-amber-100 font-mono text-xs font-black text-amber-950 hover:bg-amber-200 shadow-tactile-sm"
            >
              {languageMode === "EN" ? "CLR" : "PADAM"}
            </button>

            <button
              type="button"
              onClick={() => handleDigit("0")}
              className="btn-tactile flex h-12 items-center justify-center rounded-xl border-2 border-slate-900 bg-white font-mono text-xl font-black text-slate-900 hover:bg-amber-100 shadow-tactile-sm active:translate-y-0.5"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              className="btn-tactile flex h-12 items-center justify-center rounded-xl border-2 border-slate-900 bg-rose-100 font-mono text-base font-black text-rose-950 hover:bg-rose-200 shadow-tactile-sm"
            >
              <Delete className="h-4 w-4" />
            </button>
          </div>

          {/* Step Action Buttons */}
          {mode === "SET_NEW" && step === 1 && (
            <button
              type="button"
              disabled={newPin.length < minPinLength}
              onClick={handleProceedToConfirm}
              className={`btn-tactile mt-3.5 w-full max-w-[240px] rounded-xl border-2 border-slate-900 py-2.5 text-xs font-black shadow-tactile-sm flex items-center justify-center gap-1.5 font-mono ${
                newPin.length >= minPinLength
                  ? "bg-amber-300 text-slate-950 hover:bg-amber-200"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300"
              }`}
            >
              <span>{languageMode === "EN" ? "Continue to Confirm" : "Seterusnya: Sahkan PIN"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          {mode === "SET_NEW" && step === 2 && (
            <div className="mt-3.5 flex flex-col gap-2 w-full max-w-[240px]">
              <button
                type="button"
                disabled={confirmPin.length !== newPin.length}
                onClick={handleValidateAndSavePin}
                className={`btn-tactile w-full rounded-xl border-2 border-slate-900 py-2.5 text-xs font-black shadow-tactile-sm flex items-center justify-center gap-1.5 font-mono ${
                  confirmPin.length === newPin.length
                    ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300"
                }`}
              >
                <Check className="h-4 w-4" />
                <span>{languageMode === "EN" ? "Confirm & Save PIN" : "Sahkan & Simpan PIN"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setConfirmPin("");
                  setErrorMessage("");
                }}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline text-center flex items-center justify-center gap-1 font-mono pt-0.5"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>{languageMode === "EN" ? "Change New PIN" : "Tukar PIN Baharu"}</span>
              </button>
            </div>
          )}

          {/* Change PIN link in VERIFY mode */}
          {mode === "VERIFY" && (
            <button
              type="button"
              onClick={() => {
                setMode("SET_NEW");
                setStep(1);
                setNewPin("");
                setConfirmPin("");
                setErrorMessage("");
              }}
              className="mt-3 text-[11px] font-bold text-sky-700 underline hover:text-sky-900 flex items-center gap-1 font-mono"
            >
              <KeyRound className="h-3 w-3" />
              <span>
                {languageMode === "EN"
                  ? "Change or Reset PIN"
                  : "Tukar atau Tetapkan Semula PIN"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
