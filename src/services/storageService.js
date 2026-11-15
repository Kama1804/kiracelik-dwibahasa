// src/services/storageService.js
// Centralized Persistence Layer for KiraCelik Dwibahasa
// Prepares service layer for Cloudflare (D1/KV/Workers) migration with Promise-returning interfaces.
// Provides pure in-memory business logic with asynchronous local persistence.

import { getTopicsByDarjah } from "../engine/syllabusConfig.js";
import {
  createDefaultExamPaper,
  getStandardQuestionCatalog,
  normalizeQuestionFields,
} from "../engine/questionGenerator.js";

export const DB_KEY = "kiracelik_db_v6_pin_reset";

const DEFAULT_DB = {
  activeUserId: "usr_testing_00",
  languageMode: "BM", // "BM" | "EN"
  users: [
    {
      id: "usr_tutor_admin",
      name: "Tutor",
      role: "TUTOR",
      avatar: "🎓",
      pin_code: "", // Blank by default, can be set via UI
    },
    {
      id: "usr_testing_00",
      name: "Testing",
      role: "STUDENT",
      avatar: "🧪",
      pin_code: "0000",
      status: "Active", // "Active" | "Deactivate" | "Graduate"
      current_darjah: 1,
      unlocked_darjah: [1],
      yearAccess: { 2: "LOCKED", 3: "LOCKED" }, // "LOCKED" | "UNLOCKED"
      reset_mode: "HARD_RESET", // "HARD_RESET" | "SMART_RESET"
    },
    {
      id: "usr_adik_01",
      name: "Adik",
      role: "STUDENT",
      avatar: "🦁",
      pin_code: "",
      status: "Active",
      current_darjah: 1,
      unlocked_darjah: [1],
      yearAccess: { 2: "LOCKED", 3: "LOCKED" },
      reset_mode: "HARD_RESET",
    },
    {
      id: "usr_daffa_02",
      name: "Daffa",
      role: "STUDENT",
      avatar: "🐼",
      pin_code: "",
      status: "Active",
      current_darjah: 1,
      unlocked_darjah: [1],
      yearAccess: { 2: "LOCKED", 3: "LOCKED" },
      reset_mode: "HARD_RESET",
    },
  ],
  topicProgress: {},
  examAttempts: [],
  customQuestions: [],
  questionOverrides: {},
  excludedQuestionIds: [],
  topicParts: {},
  examPapers: {
    1: null,
    2: null,
    3: null,
  },
  studentExamPapers: {},
};

function initStudentProgress(userId, existingProgress = {}) {
  const userProg = existingProgress[userId] || {};
  [1, 2, 3].forEach((darjah) => {
    const topics = getTopicsByDarjah(darjah);
    topics.forEach((t) => {
      if (!userProg[t.id]) {
        userProg[t.id] = {
          topicId: t.id,
          darjah,
          status: "IN_PROGRESS",
          bestScore: 0,
          lastScore: 0,
          attempts: 0,
          totalTimeSec: 0,
          recentQuestionHashes: [],
          completedPartIds: [],
        };
      } else {
        if (!Array.isArray(userProg[t.id].recentQuestionHashes)) {
          userProg[t.id].recentQuestionHashes = [];
        }
        if (!Array.isArray(userProg[t.id].completedPartIds)) {
          userProg[t.id].completedPartIds = [];
        }
      }
    });
  });
  return userProg;
}

// ─── Base Storage Operations (Sync & Async) ──────────────────────────

let simulatedStorageFailure = null;
let simulatedStorageDelayMs = 0;
let memoryDB = null;

export function resetMemoryDB() {
  memoryDB = null;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(DB_KEY);
    } catch {
      // ignore
    }
  }
}

function initDefaultMemoryDB() {
  const seeded = { ...DEFAULT_DB, users: [...DEFAULT_DB.users] };
  seeded.topicProgress = {};
  seeded.users
    .filter((u) => u.role === "STUDENT")
    .forEach((stu) => {
      seeded.topicProgress[stu.id] = initStudentProgress(stu.id);
    });
  [1, 2, 3].forEach((d) => {
    seeded.examPapers[d] = createDefaultExamPaper(d);
  });
  return seeded;
}

export function setSimulatedStorageFailure(errOrMessage) {
  simulatedStorageFailure = errOrMessage
    ? errOrMessage instanceof Error
      ? errOrMessage
      : new Error(String(errOrMessage))
    : null;
}

export function setSimulatedStorageDelay(delayMs) {
  simulatedStorageDelayMs = Math.max(0, Number(delayMs) || 0);
}

export function resetSimulatedStorage() {
  simulatedStorageFailure = null;
  simulatedStorageDelayMs = 0;
}

let persistenceChain = Promise.resolve();

export function withPersistenceLock(fn, passedDB = null) {
  const next = persistenceChain.then(async () => {
    if (simulatedStorageDelayMs > 0) {
      await new Promise((res) => setTimeout(res, simulatedStorageDelayMs));
    }
    if (simulatedStorageFailure) {
      throw simulatedStorageFailure;
    }
    let baseDB = loadDBSync();
    if (passedDB && typeof passedDB === "object" && Array.isArray(passedDB.users)) {
      const isIsolatedTestFixture = !passedDB.users.some(
        (u) => u.id === "usr_adik_01" || u.id === "usr_testing_00"
      );
      if (isIsolatedTestFixture) {
        return await fn(passedDB);
      }
      let needsMerge = false;
      const merged = { ...baseDB };
      passedDB.users.forEach((u) => {
        if (!merged.users.some((mu) => mu.id === u.id)) {
          merged.users = [...merged.users, u];
          needsMerge = true;
        }
      });
      if (passedDB.topicProgress) {
        Object.keys(passedDB.topicProgress).forEach((uid) => {
          if (!merged.topicProgress[uid]) {
            merged.topicProgress = { ...merged.topicProgress, [uid]: passedDB.topicProgress[uid] };
            needsMerge = true;
          }
        });
      }
      if (passedDB.examPapers) {
        Object.keys(passedDB.examPapers).forEach((d) => {
          if (!merged.examPapers[d] && passedDB.examPapers[d]) {
            merged.examPapers = { ...merged.examPapers, [d]: passedDB.examPapers[d] };
            needsMerge = true;
          }
        });
      }
      if (passedDB.studentExamPapers) {
        merged.studentExamPapers = {
          ...(merged.studentExamPapers || {}),
          ...passedDB.studentExamPapers,
        };
        needsMerge = true;
      }
      if (passedDB.customQuestions && Array.isArray(passedDB.customQuestions)) {
        passedDB.customQuestions.forEach((cq) => {
          if (!merged.customQuestions.some((mcq) => mcq.id === cq.id)) {
            merged.customQuestions = [...merged.customQuestions, cq];
            needsMerge = true;
          }
        });
      }
      if (passedDB.questionOverrides) {
        merged.questionOverrides = {
          ...(merged.questionOverrides || {}),
          ...passedDB.questionOverrides,
        };
        needsMerge = true;
      }
      if (passedDB.excludedQuestionIds && Array.isArray(passedDB.excludedQuestionIds)) {
        merged.excludedQuestionIds = Array.from(
          new Set([...(merged.excludedQuestionIds || []), ...passedDB.excludedQuestionIds])
        );
        needsMerge = true;
      }
      if (passedDB.topicParts) {
        merged.topicParts = {
          ...(merged.topicParts || {}),
          ...passedDB.topicParts,
        };
        needsMerge = true;
      }
      if (needsMerge) {
        saveDBSync(merged);
        baseDB = merged;
      }
    }

    const result = await fn(baseDB);
    if (result && typeof result === "object") {
      if (result.users && result.topicProgress) {
        saveDBSync(result);
      } else if (result.success && result.db && result.db.users) {
        saveDBSync(result.db);
      }
    }
    return result;
  });
  persistenceChain = next.catch(() => {});
  return next;
}

function normalizeLoadedDB(parsed) {
  if (!parsed || typeof parsed !== "object") return parsed;
  if (parsed.languageMode === "DWIBAHASA" || !parsed.languageMode) {
    parsed.languageMode = "BM";
  }
  // Normalize legacy user records
  if (Array.isArray(parsed.users)) {
    parsed.users.forEach((u) => {
      if (u.role === "TUTOR" && (u.name === "Abang (Tutor)" || !u.name)) {
        u.name = "Tutor";
      }
      if (u.pin_code !== undefined && u.pin === undefined) {
        u.pin = String(u.pin_code).trim();
      } else if (u.pin !== undefined && u.pin_code === undefined) {
        u.pin_code = String(u.pin).trim();
      }
      if (u.role === "STUDENT") {
        if (!u.status) u.status = "Active";
        if (!u.yearAccess) {
          u.yearAccess = {
            2: u.unlocked_darjah?.includes(2) ? "UNLOCKED" : "LOCKED",
            3: u.unlocked_darjah?.includes(3) ? "UNLOCKED" : "LOCKED",
          };
        } else {
          if (u.yearAccess[2] === "AUTO") {
            u.yearAccess[2] = u.unlocked_darjah?.includes(2) ? "UNLOCKED" : "LOCKED";
          }
          if (u.yearAccess[3] === "AUTO") {
            u.yearAccess[3] = u.unlocked_darjah?.includes(3) ? "UNLOCKED" : "LOCKED";
          }
        }
        if (!u.current_darjah) {
          u.current_darjah =
            Array.isArray(u.unlocked_darjah) && u.unlocked_darjah.length > 0
              ? Math.max(...u.unlocked_darjah)
              : 1;
        }
      }
    });

    if (!parsed.users.some((u) => u.id === "usr_testing_00")) {
      parsed.users.push({
        id: "usr_testing_00",
        name: "Testing",
        role: "STUDENT",
        avatar: "🧪",
        pin_code: "0000",
        status: "Active",
        current_darjah: 1,
        unlocked_darjah: [1],
        yearAccess: { 2: "LOCKED", 3: "LOCKED" },
        reset_mode: "HARD_RESET",
      });
    }
  }

  if (!parsed.studentExamPapers || typeof parsed.studentExamPapers !== "object") {
    parsed.studentExamPapers = {};
  }

  if (!Array.isArray(parsed.customQuestions)) {
    parsed.customQuestions = [];
  }

  if (!parsed.questionOverrides || typeof parsed.questionOverrides !== "object") {
    parsed.questionOverrides = {};
  }

  if (!Array.isArray(parsed.excludedQuestionIds)) {
    parsed.excludedQuestionIds = [];
  }

  if (!parsed.topicParts || typeof parsed.topicParts !== "object") {
    parsed.topicParts = {};
  }

  if (!parsed.examPapers || typeof parsed.examPapers !== "object") {
    parsed.examPapers = { 1: null, 2: null, 3: null };
  }
  [1, 2, 3].forEach((d) => {
    if (!parsed.examPapers[d]) {
      parsed.examPapers[d] = createDefaultExamPaper(d);
    }
  });

  if (parsed.topicProgress && Array.isArray(parsed.users)) {
    parsed.users
      .filter((u) => u.role === "STUDENT")
      .forEach((student) => {
        parsed.topicProgress[student.id] = initStudentProgress(
          student.id,
          parsed.topicProgress
        );
      });
  }
  return parsed;
}

export function loadDBSync() {
  if (typeof localStorage === "undefined") {
    if (!memoryDB) {
      memoryDB = initDefaultMemoryDB();
    }
    return normalizeLoadedDB(JSON.parse(JSON.stringify(memoryDB)));
  }
  try {
    // Clear legacy databases to ensure clean factory state
    [
      "kiracelik_db_v1",
      "kiracelik_db_v2",
      "kiracelik_db_v3",
      "kiracelik_db_v4",
      "kiracelik_db_v5_clean",
    ].forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (err) {
        console.warn("Could not remove legacy key", k, err);
      }
    });

    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const seeded = initDefaultMemoryDB();
      localStorage.setItem(DB_KEY, JSON.stringify(seeded));
      memoryDB = JSON.parse(JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return normalizeLoadedDB(parsed);
  } catch (e) {
    console.error("Failed to load DB, resetting to default", e);
    return DEFAULT_DB;
  }
}

export async function loadDB() {
  if (simulatedStorageDelayMs > 0) {
    await new Promise((res) => setTimeout(res, simulatedStorageDelayMs));
  }
  if (simulatedStorageFailure) {
    throw simulatedStorageFailure;
  }
  return Promise.resolve(loadDBSync());
}

export function saveDBSync(dbState) {
  if (!dbState || typeof dbState !== "object") return dbState;
  const existing = memoryDB || DEFAULT_DB;
  const users = Array.isArray(dbState.users)
    ? dbState.users
    : Array.isArray(existing.users)
    ? existing.users
    : DEFAULT_DB.users;
  const topicProgress = dbState.topicProgress || existing.topicProgress || {};
  const examPapers = dbState.examPapers || existing.examPapers || DEFAULT_DB.examPapers;
  const studentExamPapers = dbState.studentExamPapers || existing.studentExamPapers || {};
  const examAttempts = Array.isArray(dbState.examAttempts)
    ? dbState.examAttempts
    : Array.isArray(existing.examAttempts)
    ? existing.examAttempts
    : [];
  const customQuestions = Array.isArray(dbState.customQuestions)
    ? dbState.customQuestions
    : Array.isArray(existing.customQuestions)
    ? existing.customQuestions
    : [];
  const questionOverrides = dbState.questionOverrides || existing.questionOverrides || {};
  const excludedQuestionIds = Array.isArray(dbState.excludedQuestionIds)
    ? dbState.excludedQuestionIds
    : Array.isArray(existing.excludedQuestionIds)
    ? existing.excludedQuestionIds
    : [];
  const topicParts = dbState.topicParts || existing.topicParts || {};

  const safeState = {
    ...existing,
    ...dbState,
    users,
    topicProgress,
    examPapers,
    studentExamPapers,
    examAttempts,
    customQuestions,
    questionOverrides,
    excludedQuestionIds,
    topicParts,
  };

  memoryDB = JSON.parse(JSON.stringify(safeState));
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(safeState));
    } catch (err) {
      console.error("Storage persistence error:", err);
      throw new Error(`PERSISTENCE_ERROR: Failed to write to local storage (${err?.message || err})`);
    }
  }

  // Push latest snapshot to Cloudflare D1 asynchronously
  pushRemoteDB(safeState);

  return normalizeLoadedDB(safeState);
}

let syncTimeout = null;

export async function pushRemoteDB(dbState) {
  if (typeof fetch === "undefined" || !dbState) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC_ALL", payload: dbState }),
      });
    } catch {
      // Offline fallback
    }
  }, 100);
}

export async function fetchRemoteDB() {
  if (typeof fetch === "undefined") return loadDBSync();
  try {
    const res = await fetch("/api/sync");
    if (!res.ok) return loadDBSync();
    const result = await res.json();
    if (result && result.success && result.data) {
      const remote = result.data;
      if (Array.isArray(remote.users)) {
        const normalized = normalizeLoadedDB(remote);
        memoryDB = JSON.parse(JSON.stringify(normalized));
        if (typeof localStorage !== "undefined") {
          try {
            localStorage.setItem(DB_KEY, JSON.stringify(normalized));
          } catch {
            // ignore
          }
        }
        return normalized;
      }
    }
  } catch {
    // Offline or server unavailable
  }
  return loadDBSync();
}

export async function saveDB(dbState) {
  if (simulatedStorageDelayMs > 0) {
    await new Promise((res) => setTimeout(res, simulatedStorageDelayMs));
  }
  if (simulatedStorageFailure) {
    throw simulatedStorageFailure;
  }
  const saved = saveDBSync(dbState);
  return Promise.resolve(saved);
}

// ─── PIN & Authentication ───────────────────────────────────────────

export function updateUserPinSync(db, userId, newPin) {
  const base = db && Array.isArray(db.users) ? db : loadDBSync();
  const updated = { ...base };
  const userIndex = updated.users.findIndex((u) => u.id === userId);
  if (userIndex === -1) return updated;

  const pinVal = String(newPin ?? "").trim();
  const user = {
    ...updated.users[userIndex],
    pin_code: pinVal,
    pin: pinVal,
  };
  const newUsers = [...updated.users];
  newUsers[userIndex] = user;
  updated.users = newUsers;
  updated.activeUserId = userId;

  saveDBSync(updated);
  return updated;
}

export async function updateUserPin(db, userId, newPin) {
  return withPersistenceLock((latestDB) => updateUserPinSync(latestDB, userId, newPin), db);
}

export function verifyPin(db, userId, enteredPin) {
  const user = db.users.find((u) => u.id === userId);
  if (!user) return { success: false, role: null, isDefaultBlank: false };

  const currentPin = String(user.pin_code ?? user.pin ?? "").trim();
  const entered = String(enteredPin ?? "").trim();

  if (currentPin === "") {
    const isMatch = entered === "";
    return { success: isMatch, role: user.role, isDefaultBlank: true };
  }

  const isMatch = currentPin === entered;
  return { success: isMatch, role: user.role, isDefaultBlank: false };
}

// ─── Sub-Skill / Question Hash Tracking ─────────────────────────────

export function trackSubSkillUsageSync(db, userId, topicId, subSkillIdOrHash) {
  const updated = { ...db };
  const userTopics = { ...(updated.topicProgress[userId] || {}) };
  const current = userTopics[topicId];
  if (!current) return updated;

  const existingList = Array.isArray(current.recentQuestionHashes)
    ? current.recentQuestionHashes
    : [];

  const nextList = [
    subSkillIdOrHash,
    ...existingList.filter((s) => s !== subSkillIdOrHash),
  ].slice(0, 10);

  userTopics[topicId] = {
    ...current,
    recentQuestionHashes: nextList,
  };

  updated.topicProgress = { ...updated.topicProgress, [userId]: userTopics };
  return updated;
}

export async function trackSubSkillUsage(db, userId, topicId, subSkillIdOrHash) {
  return withPersistenceLock((latestDB) => trackSubSkillUsageSync(latestDB, userId, topicId, subSkillIdOrHash), db);
}

export function getRecentSubSkills(db, userId, topicId) {
  return db?.topicProgress?.[userId]?.[topicId]?.recentQuestionHashes || [];
}

export function getRecentQuestionHashes(db, userId, topicId) {
  return getRecentSubSkills(db, userId, topicId);
}

export function getStudentProgress(db, userId) {
  return db?.topicProgress?.[userId] || {};
}

// ─── Practice & Exam Progression Logic ──────────────────────────────

export function hasYearAccess(db, userId, darjah) {
  const d = Number(darjah);
  if (d === 1) return true;
  const user = db?.users?.find((u) => u.id === userId);
  if (!user) return false;
  if (user.role === "TUTOR") return true;

  const access = user.yearAccess?.[d];
  if (access === "UNLOCKED") return true;
  if (access === "LOCKED") return false;
  return Boolean(user.unlocked_darjah?.includes(d));
}

export function setStudentYearAccessSync(db, studentId, darjah, setting) {
  const updated = { ...db };
  const uIdx = updated.users.findIndex((u) => u.id === studentId);
  if (uIdx === -1) return updated;

  const d = Number(darjah);
  const user = { ...updated.users[uIdx] };
  user.yearAccess = { ...(user.yearAccess || { 2: "LOCKED", 3: "LOCKED" }), [d]: setting };

  const currentUnlocked = new Set(user.unlocked_darjah || [1]);
  if (setting === "UNLOCKED") {
    currentUnlocked.add(d);
  } else if (setting === "LOCKED") {
    currentUnlocked.delete(d);
    if (d === 2) {
      user.yearAccess[3] = "LOCKED";
      currentUnlocked.delete(3);
    }
  }
  user.unlocked_darjah = Array.from(currentUnlocked);
  const maxUnlocked = Math.max(...user.unlocked_darjah, 1);
  user.current_darjah = maxUnlocked;
  updated.users = [...updated.users];
  updated.users[uIdx] = user;
  return updated;
}

export async function setStudentYearAccess(db, studentId, darjah, setting) {
  return withPersistenceLock((latestDB) => setStudentYearAccessSync(latestDB, studentId, darjah, setting), db);
}

export function setStudentStatusSync(db, studentId, status) {
  const allowed = ["Active", "Deactivate", "Graduate"];
  if (!allowed.includes(status)) return db;

  const updated = { ...db };
  const uIdx = updated.users.findIndex((u) => u.id === studentId);
  if (uIdx === -1) return updated;

  const user = { ...updated.users[uIdx], status };
  updated.users = [...updated.users];
  updated.users[uIdx] = user;
  return updated;
}

export async function setStudentStatus(db, studentId, status) {
  return withPersistenceLock((latestDB) => setStudentStatusSync(latestDB, studentId, status), db);
}

export function deleteStudentProfileSync(db, studentId) {
  const updated = { ...db };
  const student = updated.users.find((u) => u.id === studentId);
  if (!student || student.role !== "STUDENT") return updated;

  const remainingStudents = updated.users.filter(
    (u) => u.role === "STUDENT" && u.id !== studentId
  );

  updated.users = updated.users.filter((u) => u.id !== studentId);
  if (updated.topicProgress?.[studentId]) {
    delete updated.topicProgress[studentId];
  }

  if (updated.activeUserId === studentId) {
    updated.activeUserId = remainingStudents.length > 0
      ? remainingStudents[0].id
      : (updated.users[0]?.id || "");
  }

  return updated;
}

export async function deleteStudentProfile(db, studentId) {
  return withPersistenceLock((latestDB) => deleteStudentProfileSync(latestDB, studentId), db);
}

export function updateStudentCurrentDarjahSync(db, studentId, darjah) {
  const updated = { ...db };
  const uIdx = updated.users.findIndex((u) => u.id === studentId);
  if (uIdx === -1) return updated;

  const d = Number(darjah);
  const user = { ...updated.users[uIdx], current_darjah: d };
  const unlocked = new Set(user.unlocked_darjah || [1]);
  unlocked.add(d);
  user.unlocked_darjah = Array.from(unlocked);

  updated.users = [...updated.users];
  updated.users[uIdx] = user;
  return updated;
}

export async function updateStudentCurrentDarjah(db, studentId, darjah) {
  return withPersistenceLock((latestDB) => updateStudentCurrentDarjahSync(latestDB, studentId, darjah), db);
}

export function updateStudentProfileSync(db, studentId, updates = {}) {
  const updated = { ...db };
  const uIdx = updated.users.findIndex((u) => u.id === studentId);
  if (uIdx === -1) return updated;

  const current = { ...updated.users[uIdx] };
  if (updates.name !== undefined && String(updates.name).trim()) {
    current.name = String(updates.name).trim();
  }
  if (updates.avatar !== undefined && updates.avatar) {
    current.avatar = updates.avatar;
  }
  if (updates.current_darjah !== undefined) {
    const d = Number(updates.current_darjah);
    current.current_darjah = d;
    const unlocked = new Set(current.unlocked_darjah || [1]);
    unlocked.add(d);
    current.unlocked_darjah = Array.from(unlocked).sort((a, b) => a - b);
  }
  if (updates.yearAccess !== undefined && typeof updates.yearAccess === "object") {
    current.yearAccess = { ...(current.yearAccess || {}), ...updates.yearAccess };
    const unlocked = new Set(current.unlocked_darjah || [1]);
    if (updates.yearAccess[2] === "UNLOCKED") unlocked.add(2);
    if (updates.yearAccess[3] === "UNLOCKED") unlocked.add(3);
    current.unlocked_darjah = Array.from(unlocked).sort((a, b) => a - b);
  }
  if (updates.status !== undefined) {
    current.status = updates.status;
  }
  if (updates.pin !== undefined) {
    const cleanPin = String(updates.pin).trim();
    current.pin_code = cleanPin;
    current.pin = cleanPin;
  }

  updated.users = [...updated.users];
  updated.users[uIdx] = current;
  return updated;
}

export async function updateStudentProfile(db, studentId, updates = {}) {
  return withPersistenceLock((latestDB) => updateStudentProfileSync(latestDB, studentId, updates), db);
}

export const updateUserProfileSync = updateStudentProfileSync;
export const updateUserProfile = updateStudentProfile;

// ─── Question Bank Authoring ────────────────────────────────────────

export function saveCustomQuestionSync(db, questionData) {
  const updated = { ...db };
  const list = [...(updated.customQuestions || [])];
  const qId = questionData.id || `cq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const visualSpec = questionData.hideVisual
    ? null
    : questionData.visualSpec ||
      (questionData.imageDataUrl || questionData.imageUrl
        ? {
            type: "CUSTOM_IMAGE",
            data: {
              url: questionData.imageDataUrl || questionData.imageUrl,
              alt: "Uploaded Question Figure",
              caption: questionData.imageCaption || questionData.caption_bm || "",
              caption_bm: questionData.imageCaption || questionData.caption_bm || "",
              caption_en: questionData.imageCaption || questionData.caption_en || "",
            },
          }
        : null);

  const fullQ = {
    ...questionData,
    id: qId,
    darjah: Number(questionData.darjah || 1),
    maxMarks: Number(questionData.maxMarks || 1),
    scratchpadRequired: Boolean(questionData.scratchpadRequired),
    forPractice: questionData.forPractice !== false,
    forExam: questionData.forExam !== false,
    visualSpec,
    hideVisual: Boolean(questionData.hideVisual),
    customImage: questionData.hideVisual ? null : questionData.customImage || null,
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = list.findIndex((q) => q.id === qId);
  if (existingIdx !== -1) {
    list[existingIdx] = fullQ;
  } else {
    list.push(fullQ);
  }

  updated.customQuestions = list;
  return updated;
}

export async function saveCustomQuestion(db, questionData) {
  return withPersistenceLock((latestDB) => saveCustomQuestionSync(latestDB, questionData), db);
}

export function deleteCustomQuestionSync(db, questionId) {
  const updated = { ...db };
  updated.customQuestions = (updated.customQuestions || []).filter(
    (q) => q.id !== questionId
  );
  return updated;
}

export async function deleteCustomQuestion(db, questionId) {
  return withPersistenceLock((latestDB) => deleteCustomQuestionSync(latestDB, questionId), db);
}

export function getCustomQuestions(db, darjah, topicId) {
  let list = db?.customQuestions || [];
  if (darjah) list = list.filter((q) => Number(q.darjah) === Number(darjah));
  if (topicId) list = list.filter((q) => q.topicId === topicId);
  return list;
}

export function getAllBankQuestions(db, darjah, topicId) {
  const d = Number(darjah || 1);
  const effectiveTopicId = (!topicId || topicId === "ALL") ? null : topicId;
  const stdCatalog = getStandardQuestionCatalog(d, effectiveTopicId);
  const excludedSet = new Set(db?.excludedQuestionIds || []);
  const overrides = db?.questionOverrides || {};

  const effectiveStd = stdCatalog
    .filter((q) => !excludedSet.has(q.id))
    .map((q) => {
      if (overrides[q.id]) {
        const ovr = overrides[q.id];
        const merged = {
          ...q,
          ...ovr,
          id: q.id,
          source: "STANDARD",
          isOverridden: true,
        };
        if (ovr.hideVisual === true) {
          merged.visualSpec = null;
          merged.customImage = null;
          merged.hideVisual = true;
        }
        return merged;
      }
      return {
        ...q,
        source: "STANDARD",
      };
    });

  const customList = (db?.customQuestions || [])
    .filter((q) => Number(q.darjah) === d && (!effectiveTopicId || q.topicId === effectiveTopicId))
    .map((q) => {
      const norm = normalizeQuestionFields(q);
      if (q.hideVisual === true) {
        norm.visualSpec = null;
        norm.customImage = null;
        norm.hideVisual = true;
      }
      return {
        ...norm,
        source: "CUSTOM",
      };
    });

  return [...effectiveStd, ...customList];
}

export function saveQuestionBankItemSync(db, questionData) {
  const updated = { ...db };
  const isStandard =
    questionData.source === "STANDARD" ||
    (typeof questionData.id === "string" && questionData.id.startsWith("std_"));

  if (isStandard) {
    const qId = questionData.id;
    const normalized = normalizeQuestionFields(questionData);
    if (questionData.hideVisual) {
      normalized.visualSpec = null;
      normalized.customImage = null;
      normalized.hideVisual = true;
    }
    updated.questionOverrides = {
      ...(updated.questionOverrides || {}),
      [qId]: {
        ...normalized,
        id: qId,
        source: "STANDARD",
        updatedAt: new Date().toISOString(),
      },
    };
    return updated;
  }

  return saveCustomQuestionSync(updated, questionData);
}

export async function saveQuestionBankItem(db, questionData) {
  return withPersistenceLock((latestDB) => saveQuestionBankItemSync(latestDB, questionData), db);
}

export function deleteQuestionBankItemSync(db, questionId) {
  const updated = { ...db };
  const isStandard = typeof questionId === "string" && questionId.startsWith("std_");

  if (isStandard) {
    const set = new Set(updated.excludedQuestionIds || []);
    set.add(questionId);
    updated.excludedQuestionIds = Array.from(set);
    if (updated.questionOverrides?.[questionId]) {
      const copy = { ...updated.questionOverrides };
      delete copy[questionId];
      updated.questionOverrides = copy;
    }
    return updated;
  }

  return deleteCustomQuestionSync(updated, questionId);
}

export async function deleteQuestionBankItem(db, questionId) {
  return withPersistenceLock((latestDB) => deleteQuestionBankItemSync(latestDB, questionId), db);
}

// ─── Topic Exercise Parts Management (Year -> Topic -> Parts -> Questions) ───

export function getDefaultTopicParts(darjah, topicId) {
  const d = Number(darjah || 1);
  const stdQuestions = getStandardQuestionCatalog(d, topicId);
  const count = stdQuestions.length;

  if (count <= 3) {
    return [
      {
        id: `part_${d}_${topicId}_1`,
        partNo: 1,
        title_bm: "Bahagian 1: Pengenalan & Asas",
        title_en: "Part 1: Introduction & Fundamentals",
        status: "PUBLISHED",
        questions: stdQuestions,
      },
    ];
  }

  const p1Count = Math.floor(count / 3);
  const p2Count = Math.floor((count - p1Count) / 2);

  const p1Q = stdQuestions.slice(0, p1Count);
  const p2Q = stdQuestions.slice(p1Count, p1Count + p2Count);
  const p3Q = stdQuestions.slice(p1Count + p2Count);

  return [
    {
      id: `part_${d}_${topicId}_1`,
      partNo: 1,
      title_bm: "Bahagian 1: Konsep & Kemahiran Asas",
      title_en: "Part 1: Basic Concepts & Skills",
      status: "PUBLISHED",
      questions: p1Q,
    },
    {
      id: `part_${d}_${topicId}_2`,
      partNo: 2,
      title_bm: "Bahagian 2: Aplikasi & Pengiraan",
      title_en: "Part 2: Application & Calculation",
      status: "PUBLISHED",
      questions: p2Q,
    },
    {
      id: `part_${d}_${topicId}_3`,
      partNo: 3,
      title_bm: "Bahagian 3: Pengukuhan & Penyelesaian Masalah",
      title_en: "Part 3: Mastery & Problem Solving",
      status: "PUBLISHED",
      questions: p3Q,
    },
  ];
}

export function getTopicParts(db, darjah, topicId) {
  const d = Number(darjah || 1);
  const overrides = db?.questionOverrides || {};
  const existingParts = db?.topicParts?.[d]?.[topicId];
  const parts =
    Array.isArray(existingParts) && existingParts.length > 0
      ? JSON.parse(JSON.stringify(existingParts))
      : getDefaultTopicParts(d, topicId);

  return parts.map((part) => ({
    ...part,
    questions: (part.questions || []).map((q) => {
      if (q && q.id && overrides[q.id]) {
        const ovr = overrides[q.id];
        const merged = { ...q, ...ovr };
        if (ovr.hideVisual === true) {
          merged.visualSpec = null;
          merged.customImage = null;
          merged.hideVisual = true;
        }
        return merged;
      }
      return q;
    }),
  }));
}

export function saveTopicPartSync(db, darjah, topicId, partData) {
  const updated = { ...db };
  const d = Number(darjah || 1);
  const currentParts = getTopicParts(updated, d, topicId);
  const partId = partData.id || `part_${d}_${topicId}_${Date.now()}`;

  const fullPart = {
    ...partData,
    id: partId,
    status: partData.status || "PUBLISHED",
    questions: Array.isArray(partData.questions) ? partData.questions : [],
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = currentParts.findIndex((p) => p.id === partId);
  let nextParts = [...currentParts];
  if (existingIdx !== -1) {
    nextParts[existingIdx] = fullPart;
  } else {
    nextParts.push({ ...fullPart, partNo: nextParts.length + 1 });
  }

  nextParts = nextParts.map((p, idx) => ({ ...p, partNo: idx + 1 }));

  updated.topicParts = {
    ...(updated.topicParts || {}),
    [d]: {
      ...(updated.topicParts?.[d] || {}),
      [topicId]: nextParts,
    },
  };
  return updated;
}

export async function saveTopicPart(db, darjah, topicId, partData) {
  return withPersistenceLock((latestDB) => saveTopicPartSync(latestDB, darjah, topicId, partData), db);
}

export function deleteTopicPartSync(db, darjah, topicId, partId) {
  const updated = { ...db };
  const d = Number(darjah || 1);
  const currentParts = getTopicParts(updated, d, topicId);
  let nextParts = currentParts.filter((p) => p.id !== partId);
  nextParts = nextParts.map((p, idx) => ({ ...p, partNo: idx + 1 }));

  updated.topicParts = {
    ...(updated.topicParts || {}),
    [d]: {
      ...(updated.topicParts?.[d] || {}),
      [topicId]: nextParts,
    },
  };
  return updated;
}

export async function deleteTopicPart(db, darjah, topicId, partId) {
  return withPersistenceLock((latestDB) => deleteTopicPartSync(latestDB, darjah, topicId, partId), db);
}

export function recordPartPracticeScoreSync(
  db,
  userId,
  darjah,
  topicId,
  partId,
  scorePercentage,
  timeSec,
  totalQuestions = 0,
  correctCount = 0
) {
  const updated = { ...db };
  const d = Number(darjah || 1);
  const userTopics = { ...(updated.topicProgress?.[userId] || {}) };
  const current = userTopics[topicId] || {
    status: "IN_PROGRESS",
    bestScore: 0,
    cumulativeScore: 0,
    lastScore: 0,
    attempts: 0,
    totalTimeSec: 0,
    completedPartIds: [],
    partScores: {},
  };

  const completedSet = new Set(Array.isArray(current.completedPartIds) ? current.completedPartIds : []);
  const partScores = { ...(current.partScores || {}) };

  // Approach C passing rule:
  // Standard sets (>= 4 questions): >= 70%
  // Micro-sets (<= 3 questions): >= 2 correct OR scorePercentage >= 66%
  const isMicroSet = totalQuestions > 0 ? totalQuestions <= 3 : false;
  const isPassed =
    scorePercentage >= 70 ||
    (isMicroSet && (correctCount >= 2 || scorePercentage >= 66)) ||
    (!isMicroSet && scorePercentage >= 66 && (totalQuestions === 0 || totalQuestions <= 3));

  if (isPassed) {
    completedSet.add(String(partId));
  }

  const scoreNum = Number(scorePercentage) || 0;
  partScores[partId] = Math.max(partScores[partId] || 0, scoreNum);

  const publishedParts = getTopicParts(updated, d, topicId).filter((p) => p.status === "PUBLISHED");
  const totalPublishedCount = Math.max(1, publishedParts.length);

  const allPartsCompleted =
    publishedParts.length > 0 && publishedParts.every((p) => completedSet.has(p.id));

  const sumPartScores = publishedParts.reduce((sum, p) => sum + (partScores[p.id] || 0), 0);
  const cumulativeScore = Math.round(sumPartScores / totalPublishedCount);

  const nextStatus = allPartsCompleted && cumulativeScore >= 70
    ? "COMPLETED"
    : current.status === "RETAKE_REQUIRED"
    ? "RETAKE_REQUIRED"
    : "IN_PROGRESS";

  userTopics[topicId] = {
    ...current,
    status: nextStatus,
    cumulativeScore,
    bestScore: cumulativeScore,
    lastScore: scoreNum,
    attempts: (current.attempts || 0) + 1,
    totalTimeSec: (current.totalTimeSec || 0) + (Number(timeSec) || 0),
    completedPartIds: Array.from(completedSet),
    partScores,
  };

  updated.topicProgress = {
    ...(updated.topicProgress || {}),
    [userId]: userTopics,
  };

  saveDBSync(updated);
  return updated;
}

export async function recordPartPracticeScore(
  db,
  userId,
  darjah,
  topicId,
  partId,
  scorePercentage,
  timeSec,
  totalQuestions = 0,
  correctCount = 0
) {
  return withPersistenceLock(
    (latestDB) =>
      recordPartPracticeScoreSync(
        latestDB,
        userId,
        darjah,
        topicId,
        partId,
        scorePercentage,
        timeSec,
        totalQuestions,
        correctCount
      ),
    db
  );
}

// ─── Paper Builder & Publishing ─────────────────────────────────────

export function saveExamPaperSync(db, darjah, paperData, targetStudentId = "DEFAULT") {
  const updated = { ...db };
  const d = Number(darjah);
  const questions = Array.isArray(paperData.questions) ? paperData.questions : [];
  const totalMarks = questions.reduce((sum, q) => sum + (parseFloat(q.maxMarks) || 1), 0);

  const formattedPaper = {
    ...paperData,
    darjah: d,
    targetStudentId: targetStudentId || "DEFAULT",
    totalQuestions: questions.length,
    totalMarks,
    updatedAt: new Date().toISOString(),
  };

  if (targetStudentId && targetStudentId !== "DEFAULT") {
    const key = `${d}_${targetStudentId}`;
    updated.studentExamPapers = {
      ...(updated.studentExamPapers || {}),
      [key]: formattedPaper,
    };
  } else {
    updated.examPapers = {
      ...(updated.examPapers || {}),
      [d]: formattedPaper,
    };
  }
  return updated;
}

export async function saveExamPaper(db, darjah, paperData, targetStudentId = "DEFAULT") {
  return withPersistenceLock((latestDB) => saveExamPaperSync(latestDB, darjah, paperData, targetStudentId), db);
}

export function publishExamPaperSync(db, darjah, paperData, targetStudentId = "DEFAULT") {
  let updated = { ...db };
  const d = Number(darjah);
  const isPersonalized = Boolean(targetStudentId && targetStudentId !== "DEFAULT");
  const key = `${d}_${targetStudentId}`;

  if (paperData) {
    updated = saveExamPaperSync(updated, d, paperData, targetStudentId);
  }
  const current = isPersonalized
    ? updated.studentExamPapers?.[key]
    : updated.examPapers?.[d];

  if (!current || !Array.isArray(current.questions) || current.questions.length === 0) {
    return { success: false, reason: "Paper must have at least 1 question." };
  }
  const totalMarks = current.questions.reduce((sum, q) => sum + (parseFloat(q.maxMarks) || 1), 0);
  if (totalMarks <= 0) {
    return { success: false, reason: "Paper total marks must be greater than 0." };
  }

  const publishedRecord = {
    ...current,
    status: "PUBLISHED",
    publishedAt: new Date().toISOString(),
    totalMarks,
    totalQuestions: current.questions.length,
  };

  if (isPersonalized) {
    updated.studentExamPapers = {
      ...(updated.studentExamPapers || {}),
      [key]: publishedRecord,
    };
  } else {
    updated.examPapers = {
      ...(updated.examPapers || {}),
      [d]: publishedRecord,
    };
  }
  return { success: true, db: updated };
}

export async function publishExamPaper(db, darjah, paperData, targetStudentId = "DEFAULT") {
  return withPersistenceLock((latestDB) => publishExamPaperSync(latestDB, darjah, paperData, targetStudentId), db);
}

export function getExamPaperForTarget(db, darjah, targetStudentId = "DEFAULT") {
  const d = Number(darjah);
  if (targetStudentId && targetStudentId !== "DEFAULT") {
    const key = `${d}_${targetStudentId}`;
    if (db?.studentExamPapers?.[key]) {
      return db.studentExamPapers[key];
    }
  }
  return db?.examPapers?.[d] || createDefaultExamPaper(d);
}

export function getPublishedPaper(db, darjah, studentId = null) {
  const d = Number(darjah);
  if (studentId && db?.studentExamPapers) {
    const key = `${d}_${studentId}`;
    const studentPaper = db.studentExamPapers[key];
    if (
      studentPaper &&
      studentPaper.status === "PUBLISHED" &&
      Array.isArray(studentPaper.questions) &&
      studentPaper.questions.length > 0 &&
      (parseFloat(studentPaper.totalMarks) || 0) > 0
    ) {
      return studentPaper;
    }
  }
  const paper = db?.examPapers?.[d];
  if (
    paper &&
    paper.status === "PUBLISHED" &&
    Array.isArray(paper.questions) &&
    paper.questions.length > 0 &&
    (parseFloat(paper.totalMarks) || 0) > 0
  ) {
    return paper;
  }
  return null;
}

export function recordPracticeScoreSync(db, userId, topicId, scorePercentage, timeSec) {
  const updated = { ...db };
  const userTopics = { ...(updated.topicProgress?.[userId] || {}) };
  const current = userTopics[topicId] || {
    status: "IN_PROGRESS",
    bestScore: 0,
    lastScore: 0,
    attempts: 0,
    totalTimeSec: 0,
  };

  // 70% Topic Completion Gate
  const nextStatus =
    scorePercentage >= 70
      ? "COMPLETED"
      : current.status === "RETAKE_REQUIRED"
      ? "RETAKE_REQUIRED"
      : current.status === "COMPLETED"
      ? "COMPLETED"
      : "IN_PROGRESS";

  userTopics[topicId] = {
    ...current,
    status: nextStatus,
    bestScore: Math.max(current.bestScore || 0, scorePercentage),
    lastScore: scorePercentage,
    attempts: (current.attempts || 0) + 1,
    totalTimeSec: (current.totalTimeSec || 0) + timeSec,
  };

  updated.topicProgress = {
    ...(updated.topicProgress || {}),
    [userId]: userTopics,
  };
  return updated;
}

export async function recordPracticeScore(db, userId, topicId, scorePercentage, timeSec) {
  return withPersistenceLock((latestDB) => recordPracticeScoreSync(latestDB, userId, topicId, scorePercentage, timeSec), db);
}

export function submitPractice(db, userId, topicId, scorePercentage, timeSec) {
  return recordPracticeScore(db, userId, topicId, scorePercentage, timeSec);
}

export function hasPendingExam(db, userId, darjah) {
  if (!db?.examAttempts) return false;
  return db.examAttempts.some(
    (e) => e.userId === userId && e.darjah === darjah && e.status === "PENDING_REVIEW"
  );
}

export function getExamLockReason(db, userId, darjah, languageMode = "BM") {
  const d = Number(darjah);

  if (hasPendingExam(db, userId, d)) {
    return languageMode === "EN"
      ? "Pending Tutor Review"
      : languageMode === "DWIBAHASA"
      ? "Sedang Disemak Tutor / Pending Review"
      : "Sedang Disemak Tutor";
  }

  if (!hasYearAccess(db, userId, d)) {
    return languageMode === "EN"
      ? `Year ${d} Locked by Tutor`
      : languageMode === "DWIBAHASA"
      ? `Tahun ${d} Dikunci / Year ${d} Locked`
      : `Tahun ${d} Dikunci`;
  }

  const pubPaper = getPublishedPaper(db, d, userId);
  if (!pubPaper) {
    return languageMode === "EN"
      ? "Waiting for Tutor to Publish Exam"
      : languageMode === "DWIBAHASA"
      ? "Menunggu Tutor Menerbitkan Peperiksaan / Waiting for Tutor to Publish"
      : "Menunggu Tutor Menerbitkan Peperiksaan";
  }

  const student = db?.users?.find((u) => u.id === userId);
  if (student) {
    if (student.status === "Deactivate") {
      return languageMode === "EN"
        ? "Student Account Deactivated"
        : languageMode === "DWIBAHASA"
        ? "Akaun Murid Dinyahaktifkan / Account Deactivated"
        : "Akaun Murid Dinyahaktifkan";
    }
    if (student.status === "Graduate") {
      return languageMode === "EN"
        ? "Student Has Graduated (View-Only Mode)"
        : languageMode === "DWIBAHASA"
        ? "Murid Telah Tamat Belajar / Graduated"
        : "Murid Telah Tamat Belajar";
    }
  }

  const topics = getTopicsByDarjah(d);
  const userTopics = db?.topicProgress?.[userId] || {};

  // Check if any topic with published parts is incomplete
  const hasConfiguredParts = Boolean(db?.topicParts?.[d]);
  if (hasConfiguredParts) {
    for (const t of topics) {
      const tProg = userTopics[t.id];
      const parts = (db.topicParts[d][t.id] || []).filter((p) => p.status === "PUBLISHED");
      if (parts.length > 0) {
        const completedParts = (tProg?.completedPartIds || []).filter((pid) =>
          parts.some((p) => p.id === pid)
        );
        if (completedParts.length < parts.length && tProg?.status !== "COMPLETED") {
          const tTitle = languageMode === "EN" ? t.title_en : t.title_bm;
          return languageMode === "EN"
            ? `Complete all ${parts.length} parts of ${tTitle} (${completedParts.length}/${parts.length} completed)`
            : languageMode === "DWIBAHASA"
            ? `Selesaikan semua ${parts.length} bahagian ${tTitle} (${completedParts.length}/${parts.length} selesai)`
            : `Selesaikan semua ${parts.length} bahagian ${tTitle} (${completedParts.length}/${parts.length} selesai)`;
        }
      }
    }
  }

  const completedCount = topics.filter((t) => userTopics[t.id]?.status === "COMPLETED").length;
  if (completedCount < topics.length) {
    return languageMode === "EN"
      ? `Complete Topic Practice (${completedCount}/${topics.length})`
      : languageMode === "DWIBAHASA"
      ? `Selesaikan Latihan Topik (${completedCount}/${topics.length})`
      : `Selesaikan Latihan Topik (${completedCount}/${topics.length} selesai)`;
  }

  return null; // All eligibility gates satisfied!
}

export function isExamUnlocked(db, userId, darjah) {
  return getExamLockReason(db, userId, darjah) === null;
}

export function recordExamSubmissionSync(db, userId, darjah, examResult) {
  const updated = { ...db };
  const attemptId = examResult.attemptId || `exam_${Date.now()}`;
  const existingAttempts = Array.isArray(updated.examAttempts) ? updated.examAttempts : [];

  // 1. Check for exact attemptId match
  const exactMatchIdx = existingAttempts.findIndex((e) => e.id === attemptId);
  if (exactMatchIdx !== -1) {
    const existing = existingAttempts[exactMatchIdx];
    // Reject conflicting duplicate attempt identity
    if (existing.userId !== userId || Number(existing.darjah) !== Number(darjah)) {
      throw new Error("CONFLICT_ERROR: Cannot overwrite existing attempt with conflicting student or darjah identity.");
    }
  }

  const userIndex = updated.users.findIndex((u) => u.id === userId);
  if (userIndex === -1) return updated;

  // 2. Check for an existing pending attempt for this user & darjah
  const pendingMatchIdx = existingAttempts.findIndex(
    (e) => e.userId === userId && Number(e.darjah) === Number(darjah) && e.status === "PENDING_REVIEW"
  );

  const paperTotalMarks = Number(
    examResult.paperTotalMarks ||
    examResult.maxMarks ||
    (examResult.paper ? examResult.paper.reduce((s, q) => s + (Number(q.maxMarks) || 1), 0) : 50)
  );

  const autoTotal = Number(
    examResult.totalMarks ?? ((examResult.scoreA || 0) + (examResult.scoreB || 0) + (examResult.scoreC || 0))
  );
  const autoPct = Math.round((autoTotal / (paperTotalMarks || 1)) * 100);

  // Snapshot: clone paper questions so future tutor edits to Question Bank do NOT mutate this submitted attempt
  const paperSnapshot = Array.isArray(examResult.paper)
    ? JSON.parse(JSON.stringify(examResult.paper))
    : [];

  const attemptRecord = {
    id: attemptId,
    userId,
    darjah: Number(darjah),
    status: "PENDING_REVIEW",
    scoreA_suggested: examResult.scoreA ?? 0,
    scoreB_suggested: examResult.scoreB ?? 0,
    scoreC_suggested: examResult.scoreC ?? 0,
    totalMarks_suggested: autoTotal,
    percentage_suggested: autoPct,
    scoreA: null,
    scoreB: null,
    scoreC: null,
    totalMarks: null,
    percentage: null,
    isPassed: null,
    tutorDecision: null, // "PASSED" | "FAILED"
    durationSec: examResult.durationSec || 0,
    paper: paperSnapshot,
    paperTotalMarks,
    paperTotalQuestions: examResult.paperTotalQuestions || paperSnapshot.length || 30,
    responses: examResult.responses ? JSON.parse(JSON.stringify(examResult.responses)) : {},
    scratchpads: examResult.scratchpads ? JSON.parse(JSON.stringify(examResult.scratchpads)) : {},
    answers: examResult.answers ? JSON.parse(JSON.stringify(examResult.answers)) : [],
    perItemMarks: examResult.suggestedPerItemMarks ? { ...examResult.suggestedPerItemMarks } : {},
    tutorNotes: "",
    submittedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    tutorReviewed: false,
  };

  // Case 1: Identical retry with matching attemptId
  if (exactMatchIdx !== -1) {
    const existing = existingAttempts[exactMatchIdx];
    // Reject conflicting duplicate attempt identity
    if (existing.userId !== userId || Number(existing.darjah) !== Number(darjah)) {
      throw new Error("CONFLICT_ERROR: Cannot overwrite existing attempt with conflicting student or darjah identity.");
    }
    // Idempotent retry: preserve tutor review, draft marks, finalized marks and decisions
    const merged = {
      ...existing,
      ...attemptRecord,
      id: existing.id,
      // Preserve final status if already marked
      status: existing.status !== "PENDING_REVIEW" ? existing.status : attemptRecord.status,
      // Preserve tutor evaluated marks & decisions
      scoreA: existing.scoreA !== null ? existing.scoreA : attemptRecord.scoreA,
      scoreB: existing.scoreB !== null ? existing.scoreB : attemptRecord.scoreB,
      scoreC: existing.scoreC !== null ? existing.scoreC : attemptRecord.scoreC,
      totalMarks: existing.totalMarks !== null ? existing.totalMarks : attemptRecord.totalMarks,
      percentage: existing.percentage !== null ? existing.percentage : attemptRecord.percentage,
      isPassed: existing.isPassed !== null ? existing.isPassed : attemptRecord.isPassed,
      tutorDecision: existing.tutorDecision !== null ? existing.tutorDecision : attemptRecord.tutorDecision,
      tutorReviewed: existing.tutorReviewed || false,
      tutorReviewedAt: existing.tutorReviewedAt || null,
      tutorNotes: existing.tutorNotes || attemptRecord.tutorNotes || "",
      tutorOverridden: existing.tutorOverridden || false,
      draftMarks: existing.draftMarks ? { ...existing.draftMarks } : (attemptRecord.draftMarks || null),
      perItemMarks: existing.perItemMarks && Object.keys(existing.perItemMarks).length > 0
        ? existing.perItemMarks
        : attemptRecord.perItemMarks,
      // Preserve original paper snapshot
      paper: existing.paper && existing.paper.length > 0 ? existing.paper : attemptRecord.paper,
      // Preserve submitted answers and responses unless existing didn't have them
      responses: existing.responses && Object.keys(existing.responses).length > 0 ? existing.responses : attemptRecord.responses,
      scratchpads: existing.scratchpads && Object.keys(existing.scratchpads).length > 0 ? existing.scratchpads : attemptRecord.scratchpads,
      answers: existing.answers && existing.answers.length > 0 ? existing.answers : attemptRecord.answers,
    };
    const list = [...existingAttempts];
    list[exactMatchIdx] = merged;
    updated.examAttempts = list;
    return updated;
  }

  // Case 2: Different attemptId, but another attempt is already pending review for this student and darjah
  if (pendingMatchIdx !== -1) {
    throw new Error("CONFLICT_ERROR: An exam submission is already pending tutor review for this student and darjah.");
  }

  // Case 3: Fresh attempt or legitimate retake after past finalized attempt
  updated.examAttempts = [attemptRecord, ...existingAttempts];
  return updated;
}

export async function recordExamSubmission(db, userId, darjah, examResult) {
  return withPersistenceLock((latestDB) => recordExamSubmissionSync(latestDB, userId, darjah, examResult), db);
}

export function saveDraftExamMarksSync(db, examAttemptId, draftData) {
  const updated = { ...db };
  const idx = updated.examAttempts.findIndex((e) => e.id === examAttemptId);
  if (idx === -1) return updated;

  const attempt = { ...updated.examAttempts[idx] };
  attempt.perItemMarks = { ...(attempt.perItemMarks || {}), ...(draftData.perItemMarks || {}) };
  if (draftData.tutorNotes !== undefined) {
    attempt.tutorNotes = draftData.tutorNotes;
  }
  if (draftData.scoreA !== undefined) attempt.scoreA_draft = draftData.scoreA;
  if (draftData.scoreB !== undefined) attempt.scoreB_draft = draftData.scoreB;
  if (draftData.scoreC !== undefined) attempt.scoreC_draft = draftData.scoreC;
  const total = draftData.totalMarks !== undefined
    ? draftData.totalMarks
    : (Number(draftData.scoreA || 0) + Number(draftData.scoreB || 0) + Number(draftData.scoreC || 0));
  attempt.totalMarks_draft = total;
  attempt.draftMarks = {
    ...(attempt.draftMarks || {}),
    ...draftData,
    totalMarks: total,
  };

  updated.examAttempts = [...updated.examAttempts];
  updated.examAttempts[idx] = attempt;
  return updated;
}

export async function saveDraftExamMarks(db, examAttemptId, draftData) {
  return withPersistenceLock((latestDB) => saveDraftExamMarksSync(latestDB, examAttemptId, draftData), db);
}

export function finalizeExamAttemptSync(db, examAttemptId, tutorGrades) {
  const updated = { ...db };
  const idx = updated.examAttempts.findIndex((e) => e.id === examAttemptId);
  if (idx === -1) return updated;

  const attempt = { ...updated.examAttempts[idx] };
  const uIdx = updated.users.findIndex((u) => u.id === attempt.userId);
  if (uIdx === -1) return updated;

  const user = { ...updated.users[uIdx] };

  const paperTotalMarks = Number(
    attempt.paperTotalMarks ||
    (attempt.paper ? attempt.paper.reduce((s, q) => s + (Number(q.maxMarks) || 1), 0) : 50)
  );

  const scoreA = Math.max(0, Number(tutorGrades.scoreA ?? attempt.scoreA_suggested ?? 0));
  const scoreB = Math.max(0, Number(tutorGrades.scoreB ?? attempt.scoreB_suggested ?? 0));
  const scoreC = Math.max(0, Number(tutorGrades.scoreC ?? attempt.scoreC_suggested ?? 0));
  const totalMarks = Number(tutorGrades.totalMarks ?? (scoreA + scoreB + scoreC));
  const percentage = Math.round((totalMarks / (paperTotalMarks || 1)) * 100);

  // Authoritative: The tutor explicitly determines Pass or Fail
  const tutorDecision = tutorGrades.tutorDecision || (tutorGrades.isPassed ? "PASSED" : (totalMarks >= Math.round(paperTotalMarks * 0.8) ? "PASSED" : "FAILED"));
  const isPassed = tutorDecision === "PASSED";

  const previousStatus = attempt.status;
  attempt.status = isPassed ? "PASSED" : "FAILED";
  attempt.scoreA = scoreA;
  attempt.scoreB = scoreB;
  attempt.scoreC = scoreC;
  attempt.totalMarks = totalMarks;
  attempt.percentage = percentage;
  attempt.isPassed = isPassed;
  attempt.tutorDecision = tutorDecision;
  attempt.tutorReviewed = true;
  attempt.tutorReviewedAt = new Date().toISOString();
  attempt.perItemMarks = tutorGrades.perItemMarks || attempt.perItemMarks || {};
  attempt.tutorNotes = tutorGrades.tutorNotes !== undefined ? tutorGrades.tutorNotes : (attempt.tutorNotes || "");

  // Progression handling (Idempotent: only apply on initial review from PENDING_REVIEW or state change)
  if (previousStatus === "PENDING_REVIEW" || (previousStatus === "FAILED" && isPassed) || (previousStatus === "PASSED" && !isPassed)) {
    if (isPassed) {
      const nextDarjah = attempt.darjah + 1;
      if (nextDarjah <= 3) {
        if (!user.yearAccess) user.yearAccess = { 2: "LOCKED", 3: "LOCKED" };
        user.yearAccess[nextDarjah] = "UNLOCKED";
        if (!user.unlocked_darjah.includes(nextDarjah)) {
          user.unlocked_darjah = [...user.unlocked_darjah, nextDarjah];
        }
      }
      const maxUnlocked = Math.max(...(user.unlocked_darjah || [1]), 1);
      user.current_darjah = maxUnlocked;
      updated.users = [...updated.users];
      updated.users[uIdx] = user;

      // Restore any RETAKE_REQUIRED topics for this darjah back to COMPLETED
      const darjahTopics = getTopicsByDarjah(attempt.darjah);
      const userTopics = { ...updated.topicProgress[attempt.userId] };
      darjahTopics.forEach((t) => {
        if (userTopics[t.id] && userTopics[t.id].status === "RETAKE_REQUIRED") {
          userTopics[t.id] = { ...userTopics[t.id], status: "COMPLETED" };
        }
      });
      updated.topicProgress = { ...updated.topicProgress, [attempt.userId]: userTopics };
    } else {
      // Fail: Re-lock exam & reset all topics in that Darjah to RETAKE_REQUIRED for a fresh practice cycle
      const userTopics = { ...updated.topicProgress[attempt.userId] };
      const darjahTopics = getTopicsByDarjah(attempt.darjah);
      darjahTopics.forEach((t) => {
        if (userTopics[t.id]) {
          userTopics[t.id] = { ...userTopics[t.id], status: "RETAKE_REQUIRED" };
        }
      });
      updated.topicProgress = { ...updated.topicProgress, [attempt.userId]: userTopics };
    }
  }

  updated.examAttempts = [...updated.examAttempts];
  updated.examAttempts[idx] = attempt;
  return updated;
}

export async function finalizeExamAttempt(db, examAttemptId, tutorGrades) {
  return withPersistenceLock((latestDB) => finalizeExamAttemptSync(latestDB, examAttemptId, tutorGrades), db);
}

export function submitExam(db, userId, darjah, examResult) {
  return recordExamSubmission(db, userId, darjah, examResult);
}

// ─── Student Profile Management ─────────────────────────────────────

export function addStudentProfileSync(db, name, avatar = "🦊", startingDarjah = 1) {
  const updated = { ...db };
  const newId = `usr_student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const unlocked = [1];
  if (startingDarjah >= 2) unlocked.push(2);
  if (startingDarjah >= 3) unlocked.push(3);

  const yearAccess = {
    2: startingDarjah >= 2 ? "UNLOCKED" : "LOCKED",
    3: startingDarjah >= 3 ? "UNLOCKED" : "LOCKED",
  };

  const newStudent = {
    id: newId,
    name: name.trim(),
    role: "STUDENT",
    avatar,
    pin_code: "", // Blank by default, can be set via UI
    status: "Active", // "Active" | "Deactivate" | "Graduate"
    current_darjah: Number(startingDarjah),
    unlocked_darjah: unlocked,
    yearAccess,
    reset_mode: "HARD_RESET",
  };

  updated.users = [...updated.users, newStudent];
  updated.topicProgress = {
    ...(updated.topicProgress || {}),
    [newId]: initStudentProgress(newId, updated.topicProgress),
  };
  updated.activeUserId = newId;
  return updated;
}

export async function addStudentProfile(db, name, avatar = "🦊", startingDarjah = 1) {
  return withPersistenceLock((latestDB) => addStudentProfileSync(latestDB, name, avatar, startingDarjah), db);
}

// ─── Tutor Mark Override ────────────────────────────────────────────

export function applyTutorMarkOverrideSync(db, examAttemptId) {
  const attempt = db.examAttempts?.find((e) => e.id === examAttemptId);
  if (!attempt) return db;

  const currentA = Number(attempt.scoreA ?? attempt.scoreA_suggested ?? 0);
  const currentB = Number(attempt.scoreB ?? attempt.scoreB_suggested ?? 0);
  const currentC = Number(attempt.scoreC ?? attempt.scoreC_suggested ?? 0);

  // Dynamic max marks for Section B
  const maxB = attempt.paper && Array.isArray(attempt.paper)
    ? attempt.paper.filter((q) => q.section === "B").reduce((s, q) => s + (Number(q.maxMarks) || 1), 0)
    : 20;

  // Dynamic paper total marks
  const paperTotalMarks = Number(
    attempt.paperTotalMarks ||
    (attempt.paper && Array.isArray(attempt.paper) ? attempt.paper.reduce((s, q) => s + (Number(q.maxMarks) || 1), 0) : 50)
  );

  // Check mark limits: cannot exceed paper total marks, and Section B cannot exceed maxB
  if (currentA + currentB + currentC >= paperTotalMarks) return db;
  if (currentB >= maxB) return db;

  const newB = Math.min(maxB, currentB + 1);

  // Explicit Pass/Fail decision must be preserved!
  const existingDecision = attempt.tutorDecision || (attempt.status === "PASSED" ? "PASSED" : attempt.status === "FAILED" ? "FAILED" : null);

  const updated = finalizeExamAttemptSync(db, examAttemptId, {
    scoreA: currentA,
    scoreB: newB,
    scoreC: currentC,
    tutorDecision: existingDecision,
    isPassed: existingDecision ? existingDecision === "PASSED" : undefined,
    perItemMarks: attempt.perItemMarks ? { ...attempt.perItemMarks } : undefined,
    tutorNotes: (attempt.tutorNotes || "") + " (+1 K1 bonus applied)",
  });

  const finalIdx = updated.examAttempts.findIndex((e) => e.id === examAttemptId);
  if (finalIdx !== -1) {
    updated.examAttempts = [...updated.examAttempts];
    updated.examAttempts[finalIdx] = {
      ...updated.examAttempts[finalIdx],
      tutorOverridden: true,
    };
  }
  return updated;
}

export async function applyTutorMarkOverride(db, examAttemptId) {
  return withPersistenceLock((latestDB) => applyTutorMarkOverrideSync(latestDB, examAttemptId), db);
}

export function tutorOverride(db, examAttemptId) {
  return applyTutorMarkOverride(db, examAttemptId);
}

// ─── Backup & Restore ───────────────────────────────────────────────

export function exportBackupJSON(db) {
  const jsonStr = JSON.stringify(db, null, 2);
  if (typeof document !== "undefined") {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(jsonStr);
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute(
      "download",
      `kiracelik_backup_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  return jsonStr;
}
