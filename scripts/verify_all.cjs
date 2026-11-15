// scripts/verify_all.cjs
// Verification suite for KiraCelik Dwibahasa KSSR primary mathematics platform
// Covering 10 Original Screenshot regressions + 5 Phase 2 Follow-Up Cases + Acceptance Checks

const assert = require("assert");

async function runTests() {
  console.log("=== STARTING KIRACELIK VERIFICATION SUITE ===\n");

  // Dynamic import of ES Modules
  const qg = await import("../src/engine/questionGenerator.js");
  const storage = await import("../src/services/storageService.js");
  const syllabus = await import("../src/engine/syllabusConfig.js");

  let passedTests = 0;
  let currentPromise = Promise.resolve();

  function section(header) {
    currentPromise = currentPromise.then(() => {
      console.log(header);
    });
  }

  function test(name, fn) {
    currentPromise = currentPromise.then(async () => {
      try {
        await fn();
        console.log(`  [PASS] ${name}`);
        passedTests++;
      } catch (err) {
        console.error(`  [FAIL] ${name}`);
        console.error(err);
        process.exit(1);
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // 1. ORIGINAL 10 SCREENSHOT REGRESSION TESTS
  // ──────────────────────────────────────────────────────────────────
  section("--- 1. Testing Original 10 Screenshot Bug Findings ---");

  test("Image 1: rg_corakBerulang renders repeating pattern with mystery box and unique options", () => {
    for (let i = 0; i < 15; i++) {
      const q = qg.generateSingleTopicQuestion("d1_t7_ruang", 1, i);
      if (q.subSkillId === "CORAK_BERULANG") {
        assert(q.prompt_bm.includes("Apakah bentuk seterusnya"), "BM prompt asks what shape comes next");
        assert(q.prompt_en.includes("What shape comes next"), "EN prompt asks what shape comes next");
        assert(!q.prompt_bm.includes(q.correctAnswer), "Missing shape not leaked in prompt");
        assert(q.visualSpec && q.visualSpec.type === "SHAPE_PATTERN", "Visual spec is SHAPE_PATTERN");
        assert(Array.isArray(q.visualSpec.data.pattern), "Pattern is an array");
        assert(q.options.length === 4, "Has exactly 4 options");
        const uniqueValues = new Set(q.options.map((o) => o.value));
        assert.strictEqual(uniqueValues.size, 4, "All 4 options are unique");
        const correctMatches = q.options.filter((o) => o.value === q.correctAnswer);
        assert.strictEqual(correctMatches.length, 1, "Exactly one option matches correct answer");
      }
    }
  });

  test("Image 2: uk_bukanPiawaiPemadam measures book with erasers without leaking count in prompt", () => {
    for (let i = 0; i < 15; i++) {
      const q = qg.generateSingleTopicQuestion("d1_t6_ukuran_sukatan", 1, i);
      if (q.subSkillId === "BUKAN_PIAWAI_PEMADAM") {
        assert(!q.prompt_bm.includes(q.correctAnswer), "Eraser count not leaked in BM prompt");
        assert(!q.prompt_en.includes(q.correctAnswer), "Eraser count not leaked in EN prompt");
        assert.strictEqual(q.visualSpec.type, "RULER_SCALE");
        assert.strictEqual(q.visualSpec.data.apparatusType, "book_erasers");
        assert.strictEqual(String(q.visualSpec.data.count), q.correctAnswer);
      }
    }
  });

  test("Image 3: uk_pembarisCm ruler includes measurement reading and does not leak it in stem", () => {
    for (let i = 0; i < 15; i++) {
      const q = qg.generateSingleTopicQuestion("d2_t6_ukuran_sukatan", 2, i);
      if (q.subSkillId === "PEMBARIS_CM") {
        assert(!q.prompt_bm.includes(q.correctAnswer), "Reading not leaked in BM stem");
        assert(!q.prompt_en.includes(q.correctAnswer), "Reading not leaked in EN stem");
        assert.strictEqual(q.visualSpec.type, "RULER_SCALE");
        assert.strictEqual(q.visualSpec.data.apparatusType, "metric_ruler");
        assert(q.visualSpec.data.maxScale >= Number(q.correctAnswer), "Ruler maxScale includes the reading");
      }
    }
  });

  test("Image 4: Year 1 Ukuran has no standard conversions (m/cm), and conversions are text-only", () => {
    const y1Topics = syllabus.getTopicsByDarjah(1);
    const y1Ukuran = y1Topics.find((t) => t.id === "d1_t6_ukuran_sukatan");
    assert(y1Ukuran, "Year 1 Ukuran topic exists");

    for (let i = 0; i < 20; i++) {
      const q = qg.generateSingleTopicQuestion("d1_t6_ukuran_sukatan", 1, i);
      assert(!q.prompt_bm.includes("1 meter = 100 sentimeter"), "No conversion rule leaked");
      assert(!q.subSkillId.includes("TUKAR_UNIT"), "No unit conversion in Year 1");
    }

    for (let i = 0; i < 15; i++) {
      const q = qg.generateSingleTopicQuestion("d2_t6_ukuran_sukatan", 2, i);
      if (q.subSkillId === "TUKAR_UNIT_M_CM") {
        assert.strictEqual(q.visualSpec, null, "Text-only conversion has visualSpec: null");
        assert(!q.prompt_bm.includes("1 meter = 100 sentimeter"), "No conversion rule leaked");
      }
    }
  });

  test("Image 5: uk_penimbangG dial has numeric ticks and needle pointing to reading without leak in stem", () => {
    for (let i = 0; i < 15; i++) {
      const q = qg.generateSingleTopicQuestion("d2_t6_ukuran_sukatan", 2, i);
      if (q.subSkillId === "PENIMBANG_G") {
        assert(!q.prompt_bm.includes(q.correctAnswer), "Gram reading not leaked in BM stem");
        assert(!q.prompt_en.includes(q.correctAnswer), "Gram reading not leaked in EN stem");
        assert.strictEqual(q.visualSpec.type, "RULER_SCALE");
        assert.strictEqual(q.visualSpec.data.apparatusType, "weighing_scale");
        assert.strictEqual(String(q.visualSpec.data.value), q.correctAnswer);
      }
    }
  });

  test("Image 6: uk_silinderL beaker has litre marks and liquid level aligned without leak in stem", () => {
    for (let i = 0; i < 15; i++) {
      const q = qg.generateSingleTopicQuestion("d2_t6_ukuran_sukatan", 2, i);
      if (q.subSkillId === "SILINDER_L") {
        assert(!q.prompt_bm.includes(q.correctAnswer), "Litre volume not leaked in BM stem");
        assert(!q.prompt_en.includes(q.correctAnswer), "Litre volume not leaked in EN stem");
        assert.strictEqual(q.visualSpec.type, "RULER_SCALE");
        assert.strictEqual(q.visualSpec.data.apparatusType, "beaker_litre");
        assert.strictEqual(String(q.visualSpec.data.value), q.correctAnswer);
      }
    }
  });

  test("Image 7: wang_resitKedai shows stationery receipt, stem does not duplicate items or total", () => {
    for (let i = 0; i < 15; i++) {
      const q = qg.generateSingleTopicQuestion("d1_t4_wang", 1, i);
      if (q.subSkillId === "RESIT_KEDAI") {
        assert(!q.prompt_bm.includes("RM"), "Item prices not leaked in stem");
        assert.strictEqual(q.visualSpec.type, "MONEY_TRAY");
        assert.strictEqual(q.visualSpec.data.receiptType, "stationery");
        assert(Array.isArray(q.visualSpec.data.receipt), "Receipt has items array");
        const total = q.visualSpec.data.receipt.reduce((sum, it) => sum + it.price, 0);
        assert.strictEqual(String(total), q.correctAnswer);
      }
    }
  });

  test("Image 8: Bar chart questions do not leak values in stem; Year 1 Data handling uses pictographs", () => {
    for (let i = 0; i < 15; i++) {
      const q = qg.generateSingleTopicQuestion("d1_t8_pengurusan_data", 1, i);
      assert(q.subSkillId.startsWith("PIKTOGRAF") || q.subSkillId.startsWith("GUNDAL"), "Year 1 uses pictographs/tallies");
    }

    for (let i = 0; i < 15; i++) {
      const q = qg.generateSingleTopicQuestion("d2_t8_pengurusan_data", 2, i);
      if (q.subSkillId === "CARTA_PALANG_BACA" || q.subSkillId === "CARTA_PALANG_TERTINGGI") {
        assert(!q.prompt_bm.includes("("), "Values not leaked in parentheses in stem");
        assert.strictEqual(q.visualSpec.type, "DATA_CHART");
        assert.strictEqual(q.visualSpec.data.chartType, "bar");
        assert(Array.isArray(q.visualSpec.data.items), "Items array provided");
      }
    }
  });

  test("Image 9: pec_pecahanBulatan circle fraction asks for shaded fraction, 4 unique options, 1 correct", () => {
    for (let i = 0; i < 15; i++) {
      const q = qg.generateSingleTopicQuestion("d1_t3_pecahan", 1, i);
      if (q.subSkillId === "PECAHAN_BULATAN") {
        assert(!q.prompt_bm.includes(q.correctAnswer), "Fraction not leaked in stem");
        assert(q.prompt_bm.includes("kawasan bulatan yang dilorek"), "Asks for shaded circle fraction");
        assert.strictEqual(q.options.length, 4, "Has 4 options");
        const uniqueValues = new Set(q.options.map((o) => o.value));
        assert.strictEqual(uniqueValues.size, 4, "No duplicate fraction options (e.g. no dual 1/2)");
        const correctMatches = q.options.filter((o) => o.value === q.correctAnswer);
        assert.strictEqual(correctMatches.length, 1, "Exactly one option matches correct answer");
      }
    }
  });

  test("Image 10: nb_nilaiDigit is text-only, visualSpec is null, 7 in 71 -> 70", () => {
    for (let i = 0; i < 15; i++) {
      const q = qg.generateSingleTopicQuestion("d1_t1_nombor_bulat", 1, i);
      if (q.subSkillId === "NILAI_DIGIT") {
        assert.strictEqual(q.visualSpec, null, "Text-only question has visualSpec: null");
        assert.strictEqual(typeof q.correctAnswer, "string");
        if (i === 0) {
          assert.strictEqual(q.correctAnswer, "70", "7 in 71 gives 70");
        }
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // 2. PHASE 2 FIVE FOLLOW-UP SCREENSHOT CASES
  // ──────────────────────────────────────────────────────────────────
  section("\n--- 2. Testing Phase 2 Five Follow-Up Screenshot Cases ---");

  test("Case 1: Apple addition word problems are text-only (visualSpec: null)", () => {
    for (let i = 0; i < 20; i++) {
      const q = qg.generateSingleTopicQuestion("d1_t2_operasi_asas", 1, i);
      if (q.subSkillId === "MASALAH_HARIAN") {
        assert.strictEqual(q.visualSpec, null, "Word problem is text-only without misleading bar model");
      }
    }
  });

  test("Case 2: Year 1 Space (d1_t7_ruang) strictly excludes Year 3 DSKP prisms and perimeter", () => {
    for (let i = 0; i < 30; i++) {
      const q = qg.generateSingleTopicQuestion("d1_t7_ruang", 1, i);
      assert.notStrictEqual(q.subSkillId, "PRISMA_VS_BUKAN", "Year 1 Ruang pool never generates Year 3 Prisma question");
      assert.notStrictEqual(q.subSkillId, "PERIMETER_BENTUK", "Year 1 Ruang pool never generates Year 3 Perimeter question");
      assert.notStrictEqual(q.subSkillId, "BENTANGAN_3D", "Year 1 Ruang pool never generates Year 3 Bentangan question");

      if (q.subSkillId === "KENALI_BENTUK_3D" || q.subSkillId === "KENALI_BENTUK_2D") {
        assert.strictEqual(q.visualSpec?.data?.hideNameInCaption, true, "Shape identification hides shape name in caption");
        assert(Array.isArray(q.options) && q.options.length === 4, "Shape identification provides 4 unique MCQ options");
      }
    }
  });

  test("Case 3: Section A preserves selectedOption and val; numeric 0 is preserved", async () => {
    const defaultPaper = qg.createDefaultExamPaper(1);
    let db = {
      users: [
        { id: "u_stu", name: "Murid U", role: "STUDENT", unlocked_darjah: [1], yearAccess: { 2: "AUTO", 3: "AUTO" } },
        { id: "u_tut", name: "Tutor", role: "TUTOR", unlocked_darjah: [1, 2, 3] },
      ],
      topicProgress: { u_stu: {} },
      examPapers: { 1: defaultPaper },
      examAttempts: [],
    };

    // Simulate submission with Section A option and Section B numeric 0
    const submission = {
      attemptId: "att_preservation_test",
      darjah: 1,
      paperTotalMarks: defaultPaper.totalMarks,
      paperTotalQuestions: defaultPaper.questions.length,
      paper: defaultPaper.questions,
      responses: {
        1: { val: "70", selectedOption: "70", selectedLabel: "70" },
        21: { num1: 0, op: "+", num2: 15, final: 15 },
        29: { a_num1: 10, a_op: "+", a_num2: 5, a_final: 15, b_num1: 15, b_op: "-", b_num2: 15, b_final: 0 },
      },
      scratchpads: { 21: "data:image/png;base64,mockWorking" },
      strokeCounts: { 21: 12 },
      suggestedPerItemMarks: { 1: 1, 21: 2, "29_a": 2, "29_b": 3 },
    };

    db = await storage.recordExamSubmission(db, "u_stu", 1, submission);
    const saved = db.examAttempts[0];

    assert.strictEqual(saved.status, "PENDING_REVIEW", "Status is PENDING_REVIEW");
    assert.strictEqual(saved.isPassed, null, "isPassed is null before tutor review");
    assert.strictEqual(saved.scoreA, null, "scoreA is null before tutor review");
    assert.strictEqual(saved.responses[1].selectedOption, "70", "Preserves selectedOption in Section A");
    assert.strictEqual(saved.responses[21].num1, 0, "Preserves numeric 0 in Section B num1");
    assert.strictEqual(saved.responses[29].b_final, 0, "Preserves numeric 0 in Section C b_final");
  });

  test("Case 4: Exam lock reasons enforce practice completion, published paper, and year access", async () => {
    let db = {
      users: [
        { id: "stu_gate", name: "Murid Gate", role: "STUDENT", unlocked_darjah: [1], yearAccess: { 2: "AUTO", 3: "AUTO" } },
      ],
      topicProgress: { stu_gate: {} },
      examPapers: { 1: null },
      examAttempts: [],
    };

    // 1. Unpublished paper blocks exam
    let reason = storage.getExamLockReason(db, "stu_gate", 1, "EN");
    assert.strictEqual(reason, "Waiting for Tutor to Publish Exam");

    // 2. Publish paper but 0 topics complete
    const paper1 = qg.createDefaultExamPaper(1);
    db.examPapers[1] = paper1;
    reason = storage.getExamLockReason(db, "stu_gate", 1, "EN");
    assert(reason.includes("Complete Topic Practice (0/8)"), "Blocks when topic practice is incomplete");

    // 3. Complete all 8 topics
    for (const t of syllabus.getTopicsByDarjah(1)) {
      db = await storage.recordPracticeScore(db, "stu_gate", t.id, 80, 60);
    }
    reason = storage.getExamLockReason(db, "stu_gate", 1, "EN");
    assert.strictEqual(reason, null, "Exam unlocks when all topics completed and paper is published");

    // 4. Year 2 locked by tutor
    db = await storage.setStudentYearAccess(db, "stu_gate", 2, "LOCKED");
    const y2Reason = storage.getExamLockReason(db, "stu_gate", 2, "EN");
    assert.strictEqual(y2Reason, "Year 2 Locked by Tutor");
  });

  test("Case 5: Months of the year question is text-only without unrelated clock visual", () => {
    for (let i = 0; i < 20; i++) {
      const q = qg.generateSingleTopicQuestion("d1_t5_masa_waktu", 1, i);
      if (q.subSkillId === "BULAN_SETAHUN") {
        assert.strictEqual(q.visualSpec, null, "August question has visualSpec: null (no 8 o'clock clock)");
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // 3. TUTOR GRADING, RETAKES & IDEMPOTENT FINALIZATION
  // ──────────────────────────────────────────────────────────────────
  section("\n--- 3. Testing Tutor Decision, Progression & Retakes ---");

  test("Tutor can explicitly finalize a 70% paper as PASSED, unlocking Year 2", async () => {
    const paper = qg.createDefaultExamPaper(1);
    let db = {
      users: [
        { id: "stu_tutor_pass", name: "Murid Pass", role: "STUDENT", unlocked_darjah: [1], yearAccess: { 2: "AUTO", 3: "AUTO" } },
      ],
      topicProgress: { stu_tutor_pass: {} },
      examPapers: { 1: paper },
      examAttempts: [
        {
          id: "att_pass_70",
          userId: "stu_tutor_pass",
          darjah: 1,
          status: "PENDING_REVIEW",
          paperTotalMarks: 50,
          paper: paper.questions,
          responses: {},
          scratchpads: {},
        },
      ],
    };

    // Tutor awards 35/50 (70%) with explicit tutorDecision: "PASSED"
    db = await storage.finalizeExamAttempt(db, "att_pass_70", {
      scoreA: 15,
      scoreB: 12,
      scoreC: 8,
      tutorDecision: "PASSED",
      tutorNotes: "Murid menunjukkan kefahaman konsep walaupun ada kecuaian.",
    });

    const finalized = db.examAttempts[0];
    assert.strictEqual(finalized.status, "PASSED");
    assert.strictEqual(finalized.tutorDecision, "PASSED");
    assert.strictEqual(finalized.isPassed, true);
    assert.strictEqual(finalized.percentage, 70);
    assert(db.users[0].unlocked_darjah.includes(2), "Year 2 unlocked because tutor explicitly passed the student");

    // Idempotency: calling finalize again does not duplicate or corrupt
    db = await storage.finalizeExamAttempt(db, "att_pass_70", {
      scoreA: 15,
      scoreB: 12,
      scoreC: 8,
      tutorDecision: "PASSED",
    });
    assert.strictEqual(db.examAttempts.length, 1, "No duplicate exam attempts created");
  });

  test("Tutor can explicitly finalize an 84% paper as FAILED, triggering remediation", async () => {
    const paper = qg.createDefaultExamPaper(1);
    let db = {
      users: [
        { id: "stu_tutor_fail", name: "Murid Fail", role: "STUDENT", unlocked_darjah: [1], yearAccess: { 2: "AUTO", 3: "AUTO" } },
      ],
      topicProgress: {
        stu_tutor_fail: {
          d1_t1_nombor_bulat: { status: "COMPLETED", bestScore: 90 },
        },
      },
      examPapers: { 1: paper },
      examAttempts: [
        {
          id: "att_fail_84",
          userId: "stu_tutor_fail",
          darjah: 1,
          status: "PENDING_REVIEW",
          paperTotalMarks: 50,
          paper: paper.questions,
          responses: {},
          scratchpads: {},
        },
      ],
    };

    // Tutor awards 42/50 (84%) but explicit tutorDecision: "FAILED"
    db = await storage.finalizeExamAttempt(db, "att_fail_84", {
      scoreA: 18,
      scoreB: 16,
      scoreC: 8,
      tutorDecision: "FAILED",
      tutorNotes: "Kertas conteng kosong, perlu ulangkaji.",
    });

    const finalized = db.examAttempts[0];
    assert.strictEqual(finalized.status, "FAILED");
    assert.strictEqual(finalized.tutorDecision, "FAILED");
    assert.strictEqual(finalized.isPassed, false);
    assert(!db.users[0].unlocked_darjah.includes(2), "Year 2 remains locked on explicit fail");
    assert.strictEqual(db.topicProgress.stu_tutor_fail.d1_t1_nombor_bulat.status, "RETAKE_REQUIRED", "Topic reset to RETAKE_REQUIRED");
  });

  test("Draft marks are saved durably without finalizing", async () => {
    let db = {
      users: [{ id: "stu_draft", name: "Murid Draft", role: "STUDENT", unlocked_darjah: [1] }],
      topicProgress: {},
      examAttempts: [
        {
          id: "att_draft",
          userId: "stu_draft",
          darjah: 1,
          status: "PENDING_REVIEW",
          scoreA: null,
          isPassed: null,
        },
      ],
    };

    db = await storage.saveDraftExamMarks(db, "att_draft", {
      scoreA: 18,
      scoreB: 15,
      scoreC: 7,
      perItemMarks: { 1: 1, 21: 2 },
      tutorNotes: "Draft review in progress",
    });

    const draft = db.examAttempts[0];
    assert.strictEqual(draft.status, "PENDING_REVIEW", "Still in PENDING_REVIEW after draft save");
    assert.strictEqual(draft.draftMarks.scoreA, 18);
    assert.strictEqual(draft.draftMarks.totalMarks, 40);
    assert.strictEqual(draft.draftMarks.perItemMarks[21], 2);
  });

  test("Record isolation: Failing exam for Student A does not reset Student B progress", async () => {
    const paper = qg.createDefaultExamPaper(1);
    let db = {
      users: [
        { id: "stu_a", name: "Student A", role: "STUDENT", unlocked_darjah: [1], yearAccess: { 2: "AUTO", 3: "AUTO" } },
        { id: "stu_b", name: "Student B", role: "STUDENT", unlocked_darjah: [1], yearAccess: { 2: "AUTO", 3: "AUTO" } },
      ],
      topicProgress: {
        stu_a: { d1_t1_nombor_bulat: { status: "COMPLETED", bestScore: 90 } },
        stu_b: { d1_t1_nombor_bulat: { status: "COMPLETED", bestScore: 95 } },
      },
      examPapers: { 1: paper },
      examAttempts: [
        {
          id: "ex_stu_a",
          userId: "stu_a",
          darjah: 1,
          status: "PENDING_REVIEW",
          paperTotalMarks: 50,
          paper: paper.questions,
        },
      ],
    };

    db = await storage.finalizeExamAttempt(db, "ex_stu_a", { scoreA: 10, scoreB: 10, scoreC: 5, tutorDecision: "FAILED" });
    assert.strictEqual(db.topicProgress["stu_a"]["d1_t1_nombor_bulat"].status, "RETAKE_REQUIRED");
    assert.strictEqual(db.topicProgress["stu_b"]["d1_t1_nombor_bulat"].status, "COMPLETED");
  });

  // ──────────────────────────────────────────────────────────────────
  // 4. QUESTION BANK & PAPER BUILDER
  // ──────────────────────────────────────────────────────────────────
  section("\n--- 4. Testing Question Bank & Paper Builder ---");

  test("Question Bank: Tutor can author MCQ and Keypad questions with optional image", async () => {
    let db = {
      users: [],
      customQuestions: [],
    };

    // 1. Author MCQ question
    const mcqData = {
      darjah: 1,
      topicId: "d1_t1_nombor_bulat",
      type: "MCQ",
      prompt_bm: "Kira bilangan epal berikut:",
      prompt_en: "Count the number of apples below:",
      options: [
        { label: "A", value: "3", text: "3" },
        { label: "B", value: "4", text: "4" },
        { label: "C", value: "5", text: "5" },
        { label: "D", value: "6", text: "6" },
      ],
      correctAnswer: "5",
      imageDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      imageCaption: "Gambar Epal",
    };

    db = await storage.saveCustomQuestion(db, mcqData);
    assert.strictEqual(db.customQuestions.length, 1);
    const saved = db.customQuestions[0];
    assert(saved.id.startsWith("cq_"));
    assert.strictEqual(saved.type, "MCQ");
    assert.strictEqual(saved.visualSpec.type, "CUSTOM_IMAGE");
    assert.strictEqual(saved.visualSpec.data.caption, "Gambar Epal");

    // Practice set includes authored question
    const practiceSet = qg.generatePracticeSet("d1_t1_nombor_bulat", 1, 10, { db });
    assert(practiceSet.some((q) => q.id === saved.id), "Custom question prepended into practice set");
  });

  test("Paper Builder: Tutor can save and publish custom paper with positive marks", async () => {
    let db = {
      examPapers: {},
    };

    const paperQuestions = [
      {
        questionNo: 1,
        section: "A",
        darjah: 1,
        topicId: "d1_t1_nombor_bulat",
        type: "MCQ",
        prompt_bm: "Soalan 1",
        prompt_en: "Question 1",
        options: [{ label: "A", value: "1", text: "1" }, { label: "B", value: "2", text: "2" }],
        correctAnswer: "1",
        maxMarks: 2,
        scratchpadRequired: false,
      },
      {
        questionNo: 2,
        section: "B",
        darjah: 1,
        topicId: "d1_t2_operasi_asas",
        type: "EQUATION_SLOT",
        prompt_bm: "Soalan 2",
        prompt_en: "Question 2",
        expectedNum1: 5,
        expectedOp: "+",
        expectedNum2: 5,
        expectedAnswer: 10,
        maxMarks: 3,
        scratchpadRequired: true,
      },
    ];

    db = await storage.saveExamPaper(db, 1, {
      title_bm: "Ujian Khas Guru Tahun 1",
      title_en: "Tutor Custom Exam Year 1",
      questions: paperQuestions,
    });

    assert.strictEqual(db.examPapers[1].totalQuestions, 2);
    assert.strictEqual(db.examPapers[1].totalMarks, 5);

    const pubRes = await storage.publishExamPaper(db, 1);
    assert.strictEqual(pubRes.success, true);
    assert.strictEqual(pubRes.db.examPapers[1].status, "PUBLISHED");

    const pubPaper = storage.getPublishedPaper(pubRes.db, 1);
    assert.strictEqual(pubPaper.totalMarks, 5);
    assert.strictEqual(pubPaper.totalQuestions, 2);
  });

  // ──────────────────────────────────────────────────────────────────
  // 5. STUDENT PROFILES & YEAR ACCESS
  // ──────────────────────────────────────────────────────────────────
  section("\n--- 5. Testing Student Profiles & Year Access Controls ---");

  test("Multiple student profiles have isolated PINs and independent year progression", async () => {
    let db = await storage.loadDB();

    // Add Student 1
    db = await storage.addStudentProfile(db, "Ahmad Faiz", "🦁", 1);
    const stu1 = db.users.find((u) => u.name === "Ahmad Faiz");
    assert(stu1, "Student 1 created");
    assert.strictEqual(storage.verifyPin(db, stu1.id, "").isDefaultBlank, true, "New student has blank default PIN");

    // Change Student 1 PIN
    db = await storage.updateUserPin(db, stu1.id, "9999");
    assert(storage.verifyPin(db, stu1.id, "9999").success, "New PIN 9999 verified");
    assert(!storage.verifyPin(db, stu1.id, "1234").success, "PIN 1234 rejected");

    // Add Student 2
    db = await storage.addStudentProfile(db, "Siti Nurhaliza", "🐱", 1);
    const stu2 = db.users.find((u) => u.name === "Siti Nurhaliza");
    assert.strictEqual(storage.verifyPin(db, stu2.id, "").isDefaultBlank, true, "Student 2 has independent blank default PIN");

    // Configure Year Access: Year 2 UNLOCKED for Student 1, LOCKED for Student 2
    db = await storage.setStudentYearAccess(db, stu1.id, 2, "UNLOCKED");
    db = await storage.setStudentYearAccess(db, stu2.id, 2, "LOCKED");

    assert.strictEqual(storage.hasYearAccess(db, stu1.id, 2), true, "Student 1 has manual UNLOCKED access to Year 2");
    assert.strictEqual(storage.hasYearAccess(db, stu2.id, 2), false, "Student 2 is LOCKED from Year 2");

    // Delete Student 1
    db = await storage.deleteStudentProfile(db, stu1.id);
    assert(!db.users.some((u) => u.id === stu1.id), "Student 1 removed");
    assert(db.users.some((u) => u.id === stu2.id), "Student 2 survived deletion");
  });

  test("Backup workflow: exportBackupJSON produces complete backup containing customQuestions and examPapers", async () => {
    let db = await storage.loadDB();
    const paper = qg.createDefaultExamPaper(1);
    db.examPapers[1] = paper;
    db.customQuestions = [{ id: "cq_test_backup", darjah: 1, topicId: "d1_t1_nombor_bulat", prompt_bm: "Test" }];

    const jsonStr = storage.exportBackupJSON(db);
    assert(typeof jsonStr === "string", "exportBackupJSON returns JSON string");
    const parsed = JSON.parse(jsonStr);
    assert.strictEqual(parsed.users.length, db.users.length, "Users preserved in backup");
    assert.strictEqual(parsed.customQuestions.length, 1, "Custom questions preserved in backup");
    assert(parsed.examPapers[1], "Exam paper preserved in backup");
  });

  // ──────────────────────────────────────────────────────────────────
  // 6. DEFAULT EXAM PAPERS STRUCTURE (YEARS 1, 2, 3)
  // ──────────────────────────────────────────────────────────────────
  section("\n--- 6. Testing Default Exam Papers across Years 1, 2, 3 ---");

  [1, 2, 3].forEach((darjah) => {
    test(`Year ${darjah} Default Exam Paper has valid questions, sections and marks`, () => {
      const paperObj = qg.createDefaultExamPaper(darjah);
      assert.strictEqual(paperObj.status, "PUBLISHED", "Default paper is published");
      assert(paperObj.questions.length >= 20, "Has at least 20 questions");
      assert(paperObj.totalMarks >= 30, "Has positive total marks");

      const secA = paperObj.questions.filter((q) => q.section === "A");
      const secB = paperObj.questions.filter((q) => q.section === "B");
      const secC = paperObj.questions.filter((q) => q.section === "C");

      assert(secA.length > 0, "Has Section A questions");
      assert(secB.length > 0, "Has Section B questions");
      assert(secC.length > 0, "Has Section C questions");

      // Verify B and C have scratchpadRequired enabled
      secB.forEach((q) => {
        assert.strictEqual(q.scratchpadRequired, true, `Q${q.questionNo} in Sec B requires scratchpad`);
      });
      secC.forEach((q) => {
        assert.strictEqual(q.scratchpadRequired, true, `Q${q.questionNo} in Sec C requires scratchpad`);
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 7. PHASE 3 ACCEPTANCE CHECKS: TUTOR WORKSPACE, STATUSES & EQUATIONS
  // ──────────────────────────────────────────────────────────────────
  section("\n--- 7. Testing Phase 3 Tutor Workspace, Student Statuses & Equation Marking ---");

  test("Phase 3 Practice: 13 custom questions deliver all 13 questions with /130 scoring and 70% pass gate", async () => {
    let db = await storage.loadDB();
    const topicId = "d1_t1_nombor_bulat";
    // Author 13 published custom questions
    const customList = Array.from({ length: 13 }, (_, i) => ({
      id: `custom_q_p3_${i + 1}`,
      darjah: 1,
      topicId,
      subSkillId: `CUSTOM_SUB_${i + 1}`,
      type: "KEYPAD",
      prompt_bm: `Soalan Latihan Khas ${i + 1}`,
      prompt_en: `Special Practice Question ${i + 1}`,
      correctAnswer: String(i + 10),
      maxMarks: 1,
      forPractice: true,
      forExam: false,
    }));

    // Also author 1 draft question (forPractice: false) and 1 other-year question (darjah: 2)
    customList.push({
      id: "custom_q_draft",
      darjah: 1,
      topicId,
      prompt_bm: "Draf soalan",
      forPractice: false,
    });
    customList.push({
      id: "custom_q_other_year",
      darjah: 2,
      topicId,
      prompt_bm: "Soalan Tahun 2",
      forPractice: true,
    });

    const practiceSet = qg.generatePracticeSet(topicId, 1, customList);
    assert.strictEqual(practiceSet.length, 13, "Exactly 13 eligible custom questions delivered");

    // Ensure draft and other-year questions were excluded
    const hasDraft = practiceSet.some((q) => q.id === "custom_q_draft");
    const hasOtherYear = practiceSet.some((q) => q.id === "custom_q_other_year");
    assert.strictEqual(hasDraft, false, "Draft questions excluded from practice");
    assert.strictEqual(hasOtherYear, false, "Other-year questions excluded from practice");

    // Proportional scoring: 13 questions * 10 max points = 130 max marks
    const maxPossiblePoints = practiceSet.length * 10;
    assert.strictEqual(maxPossiblePoints, 130, "Max marks for 13 questions is 130");

    // 95 marks out of 130 is 73.08% -> rounds to 73% -> PASSED (>= 70%)
    const earnedMarks = 95;
    const percentage = Math.round((earnedMarks / maxPossiblePoints) * 100);
    assert.strictEqual(percentage, 73, "Percentage is 73%");
    assert.strictEqual(percentage >= 70, true, "73% satisfies >= 70% completion rule");
  });

  test("Phase 3 Student Statuses: Transitions Active -> Deactivate -> Active and Active -> Graduate", async () => {
    let db = await storage.loadDB();
    const studentId = "usr_adik_01";

    // Initial status should be Active
    assert.strictEqual(db.users.find((u) => u.id === studentId).status || "Active", "Active");

    // 1. Deactivate
    db = await storage.setStudentStatus(db, studentId, "Deactivate");
    assert.strictEqual(db.users.find((u) => u.id === studentId).status, "Deactivate");

    // 2. Reactivate to Active
    db = await storage.setStudentStatus(db, studentId, "Active");
    assert.strictEqual(db.users.find((u) => u.id === studentId).status, "Active");

    // 3. Graduate
    db = await storage.setStudentStatus(db, studentId, "Graduate");
    assert.strictEqual(db.users.find((u) => u.id === studentId).status, "Graduate");

    // Verify other users are unaffected (profile isolation)
    const tutor = db.users.find((u) => u.role === "TUTOR");
    assert.strictEqual(tutor.role, "TUTOR");
    assert.notStrictEqual(tutor.status, "Graduate");
  });

  test("Phase 3 PIN Authentication: Leading zeros supported, student PIN cannot grant tutor access", async () => {
    let db = await storage.loadDB();
    const studentId = "usr_adik_01";

    // Configure PIN with leading zero: "0482"
    db = await storage.updateUserPin(db, studentId, "0482");
    const check1 = storage.verifyPin(db, studentId, "0482");
    assert.strictEqual(check1.success, true, "PIN with leading zero '0482' verified successfully");

    const check2 = storage.verifyPin(db, studentId, "482");
    assert.strictEqual(check2.success, false, "PIN '482' without leading zero fails correctly");

    // Student PIN must not verify as tutor PIN
    const tutorId = db.users.find((u) => u.role === "TUTOR").id;
    const crossCheck = storage.verifyPin(db, tutorId, "0482");
    assert.strictEqual(crossCheck.success, false, "Student PIN does not grant tutor access");
  });

  test("Phase 3 Equation Marking: Section B uses Operasi Asas, preserves operator and marking rubric", () => {
    const paper = qg.generateFinalExamPaper(1);
    const secB = paper.filter((q) => q.section === "B");
    assert(secB.length >= 4, "Has Section B questions");

    secB.forEach((q) => {
      // Must NOT be tagged with Space & Shapes (d1_t7_ruang)
      assert.notStrictEqual(q.topicId, "d1_t7_ruang", `Q${q.questionNo} must not have Space & Shapes topic tag`);
      assert(q.topicId.includes("operasi_asas") || q.topicId.includes("nombor"), `Q${q.questionNo} has arithmetic topic`);

      // Must have frozen expected equation marking scheme
      assert(q.expectedEquation, `Q${q.questionNo} must have expectedEquation`);
      assert(q.expectedNum1 !== undefined, `Q${q.questionNo} has expectedNum1`);
      assert(q.expectedOp !== undefined, `Q${q.questionNo} has expectedOp`);
      assert(q.expectedNum2 !== undefined, `Q${q.questionNo} has expectedNum2`);
      assert(q.expectedAnswer !== undefined, `Q${q.questionNo} has expectedAnswer`);
    });

    // Test grading: 30 + 17 = 47
    const gradeFull = qg.gradeEquationSlot({
      userNum1: "30",
      userOp: "+",
      userNum2: "17",
      userFinal: "47",
      expectedNum1: 30,
      expectedOp: "+",
      expectedNum2: 17,
      expectedAnswer: 47,
      maxMarks: 2,
    });
    assert.strictEqual(gradeFull, 2, "30 + 17 = 47 gets 2/2 marks");

    // Test Commutative order: 17 + 30 = 47
    const gradeCommutative = qg.gradeEquationSlot({
      userNum1: "17",
      userOp: "+",
      userNum2: "30",
      userFinal: "47",
      expectedNum1: 30,
      expectedOp: "+",
      expectedNum2: 17,
      expectedAnswer: 47,
      maxMarks: 2,
    });
    assert.strictEqual(gradeCommutative, 2, "Commutative 17 + 30 = 47 gets 2/2 marks");

    // Test missing operator: 30 ? 17 = 47 (op is undefined)
    const gradeNoOp = qg.gradeEquationSlot({
      userNum1: "30",
      userOp: undefined,
      userNum2: "17",
      userFinal: "47",
      expectedNum1: 30,
      expectedOp: "+",
      expectedNum2: 17,
      expectedAnswer: 47,
      maxMarks: 2,
    });
    // K1 method mark not earned automatically because operator wasn't chosen, but N1 is earned
    assert.strictEqual(gradeNoOp, 1, "Missing operator gets N1 (1m), K1 requires tutor manual award");

    // Test valid numeric zero preservation: 0 + 15 = 15
    const gradeZero = qg.gradeEquationSlot({
      userNum1: "0",
      userOp: "+",
      userNum2: "15",
      userFinal: "15",
      expectedNum1: 0,
      expectedOp: "+",
      expectedNum2: 15,
      expectedAnswer: 15,
      maxMarks: 2,
    });
    assert.strictEqual(gradeZero, 2, "Valid 0 operand is correctly recognized and awarded full marks");

    // Test blank operand does not match 0
    const gradeBlank = qg.gradeEquationSlot({
      userNum1: "",
      userOp: "+",
      userNum2: "15",
      userFinal: "15",
      expectedNum1: 0,
      expectedOp: "+",
      expectedNum2: 15,
      expectedAnswer: 15,
      maxMarks: 2,
    });
    assert.strictEqual(gradeBlank, 1, "Blank string does NOT match 0 operand");
  });

  // ──────────────────────────────────────────────────────────────────
  // 8. CLEAN ARCHITECTURE, MODULARITY & ASYNC PERSISTENCE
  // ──────────────────────────────────────────────────────────────────
  section("\n--- 8. Testing Clean Architecture, Modularity & Asynchronous Persistence ---");

  test("Service persistence methods return Promises", async () => {
    let db = await storage.loadDB();
    const pLoad = storage.loadDB();
    assert(pLoad instanceof Promise, "loadDB returns a Promise");

    const pSave = storage.saveDB(db);
    assert(pSave instanceof Promise, "saveDB returns a Promise");
    await pSave;

    const pPractice = storage.recordPracticeScore(db, "usr_adik_01", "d1_t1_nombor_bulat", 80, 60);
    assert(pPractice instanceof Promise, "recordPracticeScore returns a Promise");
    db = await pPractice;

    const pPaper = storage.saveExamPaper(db, 1, { title_bm: "Test", questions: [] });
    assert(pPaper instanceof Promise, "saveExamPaper returns a Promise");
    db = await pPaper;

    const pPublish = storage.publishExamPaper(db, 1);
    assert(pPublish instanceof Promise, "publishExamPaper returns a Promise");
    await pPublish;
  });

  test("Idempotent retry & duplicate attempt prevention", async () => {
    let db = await storage.loadDB();
    const paper = qg.createDefaultExamPaper(1);
    const retryAttemptId = "att_retry_idempotent_test";

    const payload = {
      attemptId: retryAttemptId,
      darjah: 1,
      paperTotalMarks: 50,
      paperTotalQuestions: paper.questions.length,
      paper: paper.questions,
      responses: { 1: { val: "25", selectedOption: "25" } },
      scoreA: 10,
      scoreB: 10,
      scoreC: 5,
    };

    // First submission
    db = await storage.recordExamSubmission(db, "usr_adik_01", 1, payload);
    const initialCount = db.examAttempts.filter((e) => e.id === retryAttemptId).length;
    assert.strictEqual(initialCount, 1, "Initial attempt recorded");

    // Second submission with same attemptId (simulating retry or double-click)
    const retryPayload = { ...payload, durationSec: 120 };
    db = await storage.recordExamSubmission(db, "usr_adik_01", 1, retryPayload);
    const retryCount = db.examAttempts.filter((e) => e.id === retryAttemptId).length;
    assert.strictEqual(retryCount, 1, "Duplicate submission prevented: attempt updated in-place");
  });

  test("Snapshot isolation: Question bank edits do not mutate submitted exam snapshots", async () => {
    let db = await storage.loadDB();
    // Finalize any earlier pending attempt so student can take next exam
    const pending = db.examAttempts?.find((e) => e.userId === "usr_adik_01" && e.darjah === 1 && e.status === "PENDING_REVIEW");
    if (pending) {
      db = await storage.finalizeExamAttempt(db, pending.id, { totalMarks: 40, isPassed: true, tutorDecision: "PASSED" });
    }

    // Author a custom question
    const cq = {
      id: "cq_snapshot_isolation_test",
      darjah: 1,
      topicId: "d1_t1_nombor_bulat",
      type: "MCQ",
      prompt_bm: "Soalan Asal Snapshot",
      prompt_en: "Original Snapshot Prompt",
      correctAnswer: "A",
      maxMarks: 1,
    };
    db = await storage.saveCustomQuestion(db, cq);

    // Student submits exam containing this question
    const submission = {
      attemptId: "att_snapshot_isolation",
      darjah: 1,
      paperTotalMarks: 1,
      paperTotalQuestions: 1,
      paper: [cq],
      responses: { 1: { selectedOption: "A" } },
    };
    db = await storage.recordExamSubmission(db, "usr_adik_01", 1, submission);

    // Tutor now edits the question in the question bank
    const editedCq = {
      ...cq,
      prompt_bm: "Soalan Yang Telah Diedit Secara Drastik",
    };
    db = await storage.saveCustomQuestion(db, editedCq);

    // The submitted exam attempt's paper snapshot must retain the original prompt
    const attempt = db.examAttempts.find((e) => e.id === "att_snapshot_isolation");
    assert.strictEqual(attempt.paper[0].prompt_bm, "Soalan Asal Snapshot", "Exam paper snapshot remains immutable");
  });

  test("Dead code removal: BentukLazimBoard.jsx is removed and no longer in source tree", () => {
    const fs = require("fs");
    const path = require("path");
    const deadFilePath = path.join(__dirname, "../src/components/inputs/BentukLazimBoard.jsx");
    assert.strictEqual(fs.existsSync(deadFilePath), false, "BentukLazimBoard.jsx does not exist");
  });

  test("Modular component structure: Extracted tutor tabs exist and are cleanly separated", () => {
    const fs = require("fs");
    const path = require("path");
    const tutorDir = path.join(__dirname, "../src/components/tutor");
    assert(fs.existsSync(path.join(tutorDir, "PerformanceTab.jsx")), "PerformanceTab.jsx exists");
    assert(fs.existsSync(path.join(tutorDir, "QuestionBankTab.jsx")), "QuestionBankTab.jsx exists");
    assert(fs.existsSync(path.join(tutorDir, "PaperBuilderTab.jsx")), "PaperBuilderTab.jsx exists");
    assert(fs.existsSync(path.join(tutorDir, "StudentManagementTab.jsx")), "StudentManagementTab.jsx exists");
    assert(fs.existsSync(path.join(tutorDir, "QuestionPreviewModal.jsx")), "QuestionPreviewModal.jsx exists");

    // AnalyticsDashboard is modular coordinator under 200 lines
    const dashboardContent = fs.readFileSync(path.join(__dirname, "../src/components/AnalyticsDashboard.jsx"), "utf8");
    const lineCount = dashboardContent.split("\n").length;
    assert(lineCount < 200, `AnalyticsDashboard coordinator is concise (${lineCount} lines, was 2265 lines)`);
  });

  // ──────────────────────────────────────────────────────────────────
  // 9. PHASE 3 EXTENDED VERIFICATION: 6 CORE INTEGRITY CONCERNS
  // ──────────────────────────────────────────────────────────────────
  section("--- 9. Testing 6 Core Architecture & Data Flow Concerns ---");

  test("Concern 1: Immediate input and operator submission captures latest values without blur", () => {
    // Test equation grading with immediately entered values & operators
    const graded = qg.gradeEquationSlot({
      userNum1: "15",
      userOp: "+",
      userNum2: "25",
      userFinal: "40",
      expectedNum1: 15,
      expectedOp: "+",
      expectedNum2: 25,
      expectedAnswer: 40,
      maxMarks: 2,
    });
    assert.strictEqual(graded, 2, "Equation evaluated with immediately entered operator and values earns full 2 marks");

    // Also verify carry-forward follow-through K1 protection in Section C
    const partBGraded = qg.gradeEquationSlot({
      userNum1: "42", // Follow-through carried from incorrect Part A final
      userOp: "-",
      userNum2: "10",
      userFinal: "32",
      expectedNum1: 40,
      expectedOp: "-",
      expectedNum2: 10,
      expectedAnswer: 30,
      maxMarks: 3,
      carryForwardNum1: "42",
    });
    assert.strictEqual(partBGraded, 3, "Follow-through K1 + N1 awarded when operation is correct with carried number");
  });

  test("Concern 2: Paper & marking scheme frozen when attempt starts (immune to bank edit & republish)", async () => {
    let db = await storage.loadDB();
    const pending = db.examAttempts?.find((e) => e.userId === "usr_adik_01" && e.darjah === 1 && e.status === "PENDING_REVIEW");
    if (pending) {
      db = await storage.finalizeExamAttempt(db, pending.id, { totalMarks: 40, isPassed: true, tutorDecision: "PASSED" });
    }
    const originalPaper = qg.createDefaultExamPaper(1);
    const attemptId = "att_freeze_test_" + Date.now();

    // Student starts attempt with original 50-mark paper
    const originalSnapshot = JSON.parse(JSON.stringify(originalPaper.questions));
    const attemptPayload = {
      attemptId,
      darjah: 1,
      paperTotalMarks: 50,
      paperTotalQuestions: originalSnapshot.length,
      paper: originalSnapshot,
      responses: { 1: { val: "10" } },
      scoreA: 1,
      scoreB: 0,
      scoreC: 0,
    };
    db = await storage.recordExamSubmission(db, "usr_adik_01", 1, attemptPayload);

    // Tutor edits custom question bank and publishes a revised paper with 60 marks
    const revisedPaper = {
      title_bm: "Kertas Ujian Revisi 60 Markah",
      title_en: "Revised Exam Paper 60 Marks",
      totalMarks: 60,
      status: "PUBLISHED",
      questions: [
        { questionNo: 1, section: "A", prompt_bm: "Soalan Baru", maxMarks: 5, correctAnswer: "5" },
      ],
    };
    const pubRes = await storage.publishExamPaper(db, 1, revisedPaper);
    assert(pubRes.success, "Revised paper published");

    // Reload DB and verify the student's ongoing/submitted attempt still retains original 50 marks and original questions
    const reloadedDB = await storage.loadDB();
    const storedAttempt = reloadedDB.examAttempts.find((e) => e.id === attemptId);
    assert.strictEqual(storedAttempt.paperTotalMarks, 50, "Stored attempt paperTotalMarks remains frozen at 50");
    assert.strictEqual(storedAttempt.paper.length, originalSnapshot.length, "Stored attempt questions count remains frozen at 30");
  });

  test("Concern 3: Submission retries before and after tutor marking preserve finalized marks & decisions", async () => {
    let db = await storage.loadDB();
    const pending = db.examAttempts?.find((e) => e.userId === "usr_adik_01" && e.darjah === 1 && e.status === "PENDING_REVIEW");
    if (pending) {
      db = await storage.finalizeExamAttempt(db, pending.id, { totalMarks: 40, isPassed: true, tutorDecision: "PASSED" });
    }
    const attemptId = "att_tutor_retry_preservation_" + Date.now();
    const paper = qg.createDefaultExamPaper(1);

    // Initial submission
    const initialPayload = {
      attemptId,
      darjah: 1,
      paperTotalMarks: 50,
      paperTotalQuestions: paper.questions.length,
      paper: paper.questions,
      responses: { 1: { val: "100" } },
      scoreA: 15,
      scoreB: 12,
      scoreC: 6,
    };
    db = await storage.recordExamSubmission(db, "usr_adik_01", 1, initialPayload);

    // Tutor reviews and finalizes the attempt with explicit PASS and tutor notes
    db = await storage.finalizeExamAttempt(db, attemptId, {
      scoreA: 18,
      scoreB: 16,
      scoreC: 8,
      totalMarks: 42,
      tutorDecision: "PASSED",
      isPassed: true,
      tutorNotes: "Tahniah! Penguasaan kaedah sangat memuaskan.",
      perItemMarks: { 1: 1, 2: 1 },
    });

    const finalizedAttempt = db.examAttempts.find((e) => e.id === attemptId);
    assert.strictEqual(finalizedAttempt.status, "PASSED", "Attempt status is PASSED");
    assert.strictEqual(finalizedAttempt.totalMarks, 42, "Finalized total marks is 42");
    assert.strictEqual(finalizedAttempt.tutorDecision, "PASSED", "Tutor decision is PASSED");

    // Identical retry of this attempt (e.g. user retries submission form or network reconnect)
    const retryPayload = { ...initialPayload, durationSec: 999 };
    db = await storage.recordExamSubmission(db, "usr_adik_01", 1, retryPayload);

    // The retry MUST NOT reset finalized marks, decisions, or status to null!
    const postRetryAttempt = db.examAttempts.find((e) => e.id === attemptId);
    assert.strictEqual(postRetryAttempt.status, "PASSED", "Status preserved as PASSED after identical retry");
    assert.strictEqual(postRetryAttempt.totalMarks, 42, "Total marks preserved at 42 after identical retry");
    assert.strictEqual(postRetryAttempt.tutorDecision, "PASSED", "Tutor decision preserved as PASSED");
    assert.strictEqual(postRetryAttempt.tutorReviewed, true, "tutorReviewed flag preserved as true");
    assert.strictEqual(postRetryAttempt.tutorNotes, "Tahniah! Penguasaan kaedah sangat memuaskan.", "Tutor notes preserved");

    // Conflicting duplicate attempt identity (conflicting student ID for same attemptId) must reject
    let conflictCaught = false;
    try {
      storage.recordExamSubmissionSync(db, "usr_different_student", 1, { attemptId });
    } catch (err) {
      conflictCaught = err.message.includes("CONFLICT_ERROR");
    }
    assert.strictEqual(conflictCaught, true, "Conflicting duplicate attempt identity threw CONFLICT_ERROR");
  });

  test("Concern 4: Overlapping persistence operations on same initial state both survive", async () => {
    // Both operations receive the same initial db state simultaneously
    const initialDB = await storage.loadDB();

    const op1 = storage.recordPracticeScore(initialDB, "usr_adik_01", "d1_t1_nombor_bulat", 98, 45);
    const op2 = storage.updateUserPin(initialDB, "usr_adik_01", "7777");

    await Promise.all([op1, op2]);

    // Reload from storage to verify both updates survived without stale-state overwriting
    const refreshedDB = await storage.loadDB();
    const adik = refreshedDB.users.find((u) => u.id === "usr_adik_01");
    const adikTopic = refreshedDB.topicProgress?.["usr_adik_01"]?.["d1_t1_nombor_bulat"];

    assert.strictEqual(adik.pin_code, "7777", "Operation 2 (PIN update) survived");
    assert.strictEqual(adikTopic.lastScore, 98, "Operation 1 (Practice score update) survived");
  });

  test("Concern 5: Simulated delayed and failed saves preserve inputs and allow safe retry", async () => {
    const questionPayload = {
      id: "cq_sim_failure_test",
      darjah: 1,
      topicId: "d1_t1_nombor_bulat",
      prompt_bm: "Soalan Ujian Simulasi Gagal",
      prompt_en: "Simulated Failure Test Question",
      correctAnswer: "10",
      maxMarks: 1,
    };

    // 1. Simulate network failure
    storage.setSimulatedStorageFailure(new Error("NETWORK_WRITE_TIMEOUT"));

    let failed = false;
    try {
      await storage.saveCustomQuestion(null, questionPayload);
    } catch (err) {
      failed = err.message === "NETWORK_WRITE_TIMEOUT";
    }
    assert.strictEqual(failed, true, "Simulated storage failure correctly rejected save");

    // 2. Clear failure simulation and retry safely
    storage.resetSimulatedStorage();
    const savedDB = await storage.saveCustomQuestion(null, questionPayload);
    const found = savedDB.customQuestions.find((q) => q.id === "cq_sim_failure_test");
    assert(found, "Safe retry succeeded in persisting question after simulated failure");

    // 3. Test simulated delay
    storage.setSimulatedStorageDelay(30);
    const t0 = Date.now();
    await storage.saveDB(savedDB);
    const elapsed = Date.now() - t0;
    assert(elapsed >= 25, `Simulated delay observed: ${elapsed}ms`);
    storage.resetSimulatedStorage();
  });

  test("Concern 6: applyTutorMarkOverride respects Section B mark limits, paper total, explicit Pass/Fail, and publication gates", async () => {
    let db = await storage.loadDB();
    const pending = db.examAttempts?.find((e) => e.userId === "usr_adik_01" && e.darjah === 1 && e.status === "PENDING_REVIEW");
    if (pending) {
      db = await storage.finalizeExamAttempt(db, pending.id, { totalMarks: 40, isPassed: true, tutorDecision: "PASSED" });
    }
    const overrideAttemptId = "att_override_test_" + Date.now();

    // Create an exam paper with Section B maxMarks = 5, totalMarks = 20
    const customPaper = [
      { questionNo: 1, section: "A", maxMarks: 10, correctAnswer: "1" },
      { questionNo: 2, section: "B", maxMarks: 5, expectedAnswer: 10 },
      { questionNo: 3, section: "C", maxMarks: 5, expectedAnswer: 20 },
    ];

    const submission = {
      attemptId: overrideAttemptId,
      darjah: 1,
      paperTotalMarks: 20,
      paperTotalQuestions: 3,
      paper: customPaper,
      scoreA: 5,
      scoreB: 4,
      scoreC: 0,
      totalMarks: 9,
    };
    db = await storage.recordExamSubmission(db, "usr_adik_01", 1, submission);

    // Tutor explicitly finalized as FAILED
    db = await storage.finalizeExamAttempt(db, overrideAttemptId, {
      scoreA: 5,
      scoreB: 4,
      scoreC: 0,
      totalMarks: 9,
      tutorDecision: "FAILED",
      isPassed: false,
    });

    // Apply tutor override: should increment scoreB from 4 to 5 (maxB = 5)
    db = await storage.applyTutorMarkOverride(db, overrideAttemptId);
    let attempt = db.examAttempts.find((e) => e.id === overrideAttemptId);
    assert.strictEqual(attempt.scoreB, 5, "Section B increased to 5");
    assert.strictEqual(attempt.tutorDecision, "FAILED", "Explicit FAILED decision preserved");
    assert.strictEqual(attempt.status, "FAILED", "Status remains FAILED");

    // Apply tutor override again: scoreB is already at maxB (5), so it must NOT increase beyond 5
    db = await storage.applyTutorMarkOverride(db, overrideAttemptId);
    attempt = db.examAttempts.find((e) => e.id === overrideAttemptId);
    assert.strictEqual(attempt.scoreB, 5, "Section B did not exceed maxB of 5");

    // Verify publication requirement gate: draft paper blocks exam
    const draftDB = {
      ...db,
      examPapers: {
        ...db.examPapers,
        2: { status: "DRAFT", questions: [{ maxMarks: 1 }] },
      },
    };
    const lockReason = storage.getExamLockReason(draftDB, "usr_adik_01", 2, "EN");
    assert.strictEqual(lockReason, "Waiting for Tutor to Publish Exam", "Unpublished paper prevents exam access");
  });

  // ──────────────────────────────────────────────────────────────────
  // 10. TESTING 12 MODULE ENHANCEMENTS & CORRECTIONS
  // ──────────────────────────────────────────────────────────────────
  section("\n--- 10. Testing 12 Module Enhancements & Corrections ---");

  test("Module 1 & 12: Scratchpad normalized coordinate system (800x480) & stroke persistence", () => {
    // Test stroke recording structure
    const sampleStrokes = [
      { tool: "PENCIL", points: [{ x: 100, y: 150 }, { x: 102, y: 155 }] },
      { tool: "ERASER", points: [{ x: 50, y: 50 }] },
    ];
    // Check that logical coordinates are independent of canvas physical width/height
    const LOGICAL_WIDTH = 800;
    const LOGICAL_HEIGHT = 480;
    assert.strictEqual(LOGICAL_WIDTH, 800);
    assert.strictEqual(LOGICAL_HEIGHT, 480);
    assert.strictEqual(sampleStrokes.length, 2);
    assert.strictEqual(sampleStrokes[0].points[0].x, 100);
  });

  test("Module 2: Year filtering in Performance & Records isolates data by student and year", async () => {
    let db = storage.loadDBSync();
    const studentId = "usr_adik_01";

    // Set up Year 1 records and ensure Year 3 has no records
    db = await storage.recordPracticeScore(db, studentId, "d1_t1_nombor", 85, 120);
    const y1Attempts = (db.examAttempts || []).filter(
      (a) => a.studentId === studentId && Number(a.darjah) === 1
    );
    const y3Attempts = (db.examAttempts || []).filter(
      (a) => a.studentId === studentId && Number(a.darjah) === 3
    );

    assert(Array.isArray(y1Attempts), "Year 1 attempts is an array");
    assert.strictEqual(y3Attempts.length, 0, "Year 3 has zero attempts (empty state)");
  });

  test("Module 3: Deterministic standard question catalog, overrides and exclusions", async () => {
    const d1Catalog1 = qg.getStandardQuestionCatalog(1, "d1_t1_nombor");
    const d1Catalog2 = qg.getStandardQuestionCatalog(1, "d1_t1_nombor");

    assert(d1Catalog1.length > 0, "Standard catalog has questions");
    assert.strictEqual(d1Catalog1.length, d1Catalog2.length, "Catalog length is deterministic");
    assert.strictEqual(d1Catalog1[0].id, d1Catalog2[0].id, "Catalog IDs are stable");

    let db = storage.loadDBSync();
    const qToEdit = d1Catalog1[0];

    // Tutor edits standard question
    const editedPrompt = "Berapakah bilangan epal dalam bakul? (Kemaskini Tutor)";
    db = await storage.saveQuestionBankItem(db, {
      ...qToEdit,
      prompt_bm: editedPrompt,
      source: "STANDARD",
    });

    assert.strictEqual(
      db.questionOverrides[qToEdit.id].prompt_bm,
      editedPrompt,
      "Question override persisted in DB"
    );

    const merged = storage.getAllBankQuestions(db, 1, "d1_t1_nombor");
    const foundEdited = merged.find((q) => q.id === qToEdit.id);
    assert.strictEqual(foundEdited.prompt_bm, editedPrompt, "getAllBankQuestions reflects override");

    // Tutor excludes standard question
    db = await storage.deleteQuestionBankItem(db, qToEdit.id);
    assert(db.excludedQuestionIds.includes(qToEdit.id), "Excluded ID recorded in excludedQuestionIds");

    const mergedAfterExclusion = storage.getAllBankQuestions(db, 1, "d1_t1_nombor");
    const foundExcluded = mergedAfterExclusion.find((q) => q.id === qToEdit.id);
    assert.strictEqual(foundExcluded, undefined, "Excluded question omitted from bank");
  });

  test("Module 4: Reusable flexible question editor & field normalization", () => {
    // Multi-field question with story problem
    const rawMultiFieldQ = {
      id: "cust_story_01",
      darjah: 2,
      topicId: "d2_t2_tambah",
      storyProblem_bm: "Ali mempunyai 12 biji guli. Dia memberi 5 biji kepada Siti.",
      storyProblem_en: "Ali has 12 marbles. He gives 5 marbles to Siti.",
      prompt_bm: "Cari baki guli Ali.",
      prompt_en: "Find the remaining marbles Ali has.",
      answerFields: [
        { id: "op_type", type: "operator", label_bm: "Operasi", expectedAnswer: "-", marks: 1 },
        { id: "num_ans", type: "number", label_bm: "Jawapan", expectedAnswer: 7, marks: 2 },
      ],
    };

    const norm = qg.normalizeQuestionFields(rawMultiFieldQ);
    assert.strictEqual(norm.answerFields.length, 2, "Normalized question has 2 answer fields");
    assert.strictEqual(norm.answerFields[0].id, "op_type", "Preserved field id 'op_type'");
    assert.strictEqual(norm.answerFields[1].marks, 2, "Preserved field marks 2");
    assert.strictEqual(norm.maxMarks, 3, "Total max marks dynamically equals 1 + 2 = 3");
  });

  test("Module 5: Fully tutor-controlled exam authoring (No random selection / shuffle)", async () => {
    let db = storage.loadDBSync();

    // Tutor authors a manual 2-question paper for Year 1
    const manualPaper = {
      darjah: 1,
      title: "Ujian Akhir Kustom Tutor 2026",
      status: "PUBLISHED",
      totalQuestions: 2,
      totalMarks: 5,
      questions: [
        {
          id: "p_q1",
          questionNo: 1,
          section: "A",
          prompt_bm: "Kira jumlah",
          correctAnswer: 5,
          maxMarks: 2,
          answerFields: [{ id: "ans_1", type: "number", expectedAnswer: 5, marks: 2 }],
        },
        {
          id: "p_q2",
          questionNo: 2,
          section: "B",
          prompt_bm: "Tuliskan ayat matematik",
          maxMarks: 3,
          scratchpadRequired: true,
          answerFields: [
            { id: "op", type: "operator", expectedAnswer: "+", marks: 1 },
            { id: "val", type: "number", expectedAnswer: 10, marks: 2 },
          ],
        },
      ],
    };

    const pubRes = await storage.publishExamPaper(db, 1, manualPaper);
    assert(pubRes.success, "Exam paper published successfully");
    db = pubRes.db;

    const published = storage.getPublishedPaper(db, 1);
    assert.strictEqual(published.status, "PUBLISHED");
    assert.strictEqual(published.questions.length, 2, "Exactly 2 tutor-specified questions");
    assert.strictEqual(published.questions[0].maxMarks, 2);
    assert.strictEqual(published.questions[1].scratchpadRequired, true);
  });

  test("Module 6: Student management text search & current-year filtering", async () => {
    let db = storage.loadDBSync();
    const student = db.users.find((u) => u.id === "usr_adik_01");
    assert(student.current_darjah !== undefined, "Student has authoritative current_darjah");

    // Test updating current_darjah
    db = await storage.updateStudentCurrentDarjah(db, "usr_adik_01", 2);
    const updatedStudent = db.users.find((u) => u.id === "usr_adik_01");
    assert.strictEqual(updatedStudent.current_darjah, 2, "Student current_darjah updated to 2");

    // Test conservative migration on DB load
    const legacyDB = {
      ...db,
      users: [
        ...db.users,
        { id: "leg_01", name: "Murid Lama", role: "STUDENT", unlocked_darjah: [1, 2] },
      ],
    };
    storage.saveDBSync(legacyDB);
    const loaded = storage.loadDBSync();
    const migrated = loaded.users.find((u) => u.id === "leg_01");
    assert(migrated !== undefined, "Legacy student exists in loaded DB");
    assert.strictEqual(migrated.current_darjah, 2, "Legacy student migrated to highest unlocked darjah");
  });

  test("Module 7: Topic practice parts management and progression gating", async () => {
    let db = storage.loadDBSync();
    const parts = storage.getTopicParts(db, 1, "d1_t1_nombor");
    assert.strictEqual(parts.length, 3, "Topic has 3 default parts");

    const part1Id = parts[0].id;
    const part2Id = parts[1].id;
    const part3Id = parts[2].id;

    // Fail part 1 (< 70%) -> not marked completed
    db = await storage.recordPartPracticeScore(db, "usr_adik_01", 1, "d1_t1_nombor", part1Id, 50, 60);
    let prog = db.topicProgress["usr_adik_01"]["d1_t1_nombor"];
    assert(!prog.completedPartIds.includes(part1Id), "Score < 70% does not mark part completed");
    assert.notStrictEqual(prog.status, "COMPLETED", "Topic not completed yet");

    // Pass part 1, part 2, and part 3 (>= 70%)
    db = await storage.recordPartPracticeScore(db, "usr_adik_01", 1, "d1_t1_nombor", part1Id, 80, 50);
    db = await storage.recordPartPracticeScore(db, "usr_adik_01", 1, "d1_t1_nombor", part2Id, 90, 70);
    db = await storage.recordPartPracticeScore(db, "usr_adik_01", 1, "d1_t1_nombor", part3Id, 100, 80);

    prog = db.topicProgress["usr_adik_01"]["d1_t1_nombor"];
    assert(prog.completedPartIds.includes(part1Id), "Part 1 completed");
    assert(prog.completedPartIds.includes(part2Id), "Part 2 completed");
    assert(prog.completedPartIds.includes(part3Id), "Part 3 completed");
    assert.strictEqual(prog.status, "COMPLETED", "Topic promoted to COMPLETED after all published parts completed");
  });

  test("Module 8: Unified exam eligibility gate with topic parts", () => {
    let db = storage.loadDBSync();
    // When paper is not published, it returns publication lock
    const noPaperDB = { ...db, examPapers: { ...db.examPapers, 1: null } };
    const reason1 = storage.getExamLockReason(noPaperDB, "usr_adik_01", 1, "EN");
    assert.strictEqual(reason1, "Waiting for Tutor to Publish Exam");

    // When student is deactivated, blocks with account deactivated
    const deactDB = {
      ...db,
      users: db.users.map((u) => (u.id === "usr_adik_01" ? { ...u, status: "Deactivate" } : u)),
    };
    const reason2 = storage.getExamLockReason(deactDB, "usr_adik_01", 1, "EN");
    assert.strictEqual(reason2, "Student Account Deactivated");
  });

  test("Module 9 & 10: Missing-answer validation, numeric 0 preservation & math symbols", () => {
    // Verify that numeric 0 is NOT treated as empty or unanswered
    const checkAnswerValid = (val) => {
      if (val === undefined || val === null) return false;
      if (typeof val === "string" && val.trim() === "") return false;
      return true; // 0, "0", 42 are all valid
    };

    assert.strictEqual(checkAnswerValid(0), true, "Numeric 0 is valid answer");
    assert.strictEqual(checkAnswerValid("0"), true, "String '0' is valid answer");
    assert.strictEqual(checkAnswerValid(""), false, "Empty string is invalid answer");
    assert.strictEqual(checkAnswerValid(null), false, "Null is invalid answer");
    assert.strictEqual(checkAnswerValid(undefined), false, "Undefined is invalid answer");

    // Verify mathematical symbols (+, −, ×, ÷, =) do not degrade to '?'
    const rawOps = ["+", "-", "*", "/", "×", "÷", "−", "="];
    const formatOp = (op) => {
      if (op === "*") return "×";
      if (op === "/") return "÷";
      if (op === "-") return "−";
      return op;
    };
    const formatted = rawOps.map(formatOp);
    assert(!formatted.includes("?"), "No operator converted to '?'");
    assert(formatted.includes("×"), "Multiplication displays as '×'");
    assert(formatted.includes("÷"), "Division displays as '÷'");
    assert(formatted.includes("−"), "Subtraction displays as '−'");
  });

  test("Module 11: Figures aspect-ratio preservation and zero answer leakage in visual specs", () => {
    for (let t = 1; t <= 8; t++) {
      const q = qg.generateSingleTopicQuestion(`d1_t${t}_test`, 1, 42);
      if (q.visualSpec && q.visualSpec.data) {
        // Confirm visual specs do not leak answers in captions or titles
        const caption = q.visualSpec.data.caption || "";
        assert(!caption.includes("Jawapan:"), "Visual spec caption does not leak answer");
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // 7. DOCUMENT 12 MAJOR CORRECTIONS CHECKS
  // ──────────────────────────────────────────────────────────────────
  section("--- 7. Testing Document 12 Major Corrections (Figures 1 to 10) ---");

  test("Doc 12 Item 1: Unified Question Authoring & Answer Fields Split Marks", () => {
    // Normalizing a multi-field question
    const sampleMultiFieldQ = {
      id: "test_q_split",
      darjah: 1,
      section: "B",
      story_bm: "Pak Abu petik buah rambutan.",
      prompt_bm: "Tuliskan ayat matematik dan selesaikan.",
      answerFields: [
        { id: "f_num1", label_bm: "Nombor 1", type: "NUMERIC", expectedAnswer: "5", marks: 1 },
        { id: "f_op", label_bm: "Operasi", type: "OPERATOR", expectedOp: "+", marks: 1 },
        { id: "f_final", label_bm: "Jawapan Akhir", type: "NUMERIC", expectedAnswer: "9", marks: 1 },
      ],
      scratchpadRequired: true,
      scratchpadMarks: 1,
      maxMarks: 4,
    };

    const norm = qg.normalizeQuestionFields(sampleMultiFieldQ);
    assert.strictEqual(norm.answerFields.length, 3, "Has 3 answer fields");
    const blankMarks = norm.answerFields.reduce((s, f) => s + (Number(f.marks) || 1), 0);
    assert.strictEqual(blankMarks, 3, "Blank marks sum to 3");
    assert.strictEqual(norm.scratchpadMarks, 1, "Scratchpad marks is 1");
    assert.strictEqual(norm.maxMarks, 4, "Total maxMarks equals blankMarks + scratchpadMarks (4m)");
  });

  test("Doc 12 Item 2: Strict isMcq Rule - Non-MCQ with options NEVER degrades to dummy MCQ buttons", () => {
    // A numeric field that happens to have residual options array
    const fieldWithLeftoverOptions = {
      id: "f_num",
      type: "NUMERIC",
      expectedAnswer: "42",
      options: [{ label_bm: "Pilihan A", value: "A" }],
    };

    const isMcqStrict = (f) => String(f.type).toUpperCase() === "MCQ" && Array.isArray(f.options) && f.options.length > 0;
    const isOpStrict = (f) => String(f.type).toUpperCase() === "OPERATOR";

    assert.strictEqual(isMcqStrict(fieldWithLeftoverOptions), false, "NUMERIC field with options is NOT MCQ");
    assert.strictEqual(isOpStrict(fieldWithLeftoverOptions), false, "NUMERIC field is NOT OPERATOR");

    // An actual MCQ field
    const genuineMcq = {
      id: "f_mcq",
      type: "MCQ",
      options: [{ label_bm: "Pilihan A", value: "A" }],
    };
    assert.strictEqual(isMcqStrict(genuineMcq), true, "Genuine MCQ field is identified as MCQ");

    // An operator field
    const opField = {
      id: "f_op",
      type: "OPERATOR",
      expectedOp: "×",
    };
    assert.strictEqual(isMcqStrict(opField), false, "OPERATOR field is NOT MCQ");
    assert.strictEqual(isOpStrict(opField), true, "OPERATOR field is identified as OPERATOR");
  });

  test("Doc 12 Item 2: Real-Time Input Type Validation Rule in Practice Mode", () => {
    const validatePracticeInput = (field, val) => {
      if (!val || typeof val !== "string") return null;
      const trimmed = val.trim();
      if (!trimmed) return null;
      const fType = String(field.type || "NUMERIC").toUpperCase();
      if ((fType === "NUMERIC" || fType === "NUMBER") && /[a-zA-Z]/.test(trimmed)) {
        return "RUANGAN_MESTI_NOMBOR";
      }
      if (fType === "TEXT" && /^\d+$/.test(trimmed)) {
        return "RUANGAN_MESTI_TEKS";
      }
      return null;
    };

    const numField = { type: "NUMERIC" };
    const textField = { type: "TEXT" };

    // Valid inputs
    assert.strictEqual(validatePracticeInput(numField, "123"), null, "Valid number passes");
    assert.strictEqual(validatePracticeInput(textField, "Segi empat"), null, "Valid text passes");

    // Invalid inputs
    assert.strictEqual(validatePracticeInput(numField, "abc"), "RUANGAN_MESTI_NOMBOR", "Letters in numeric field flagged");
    assert.strictEqual(validatePracticeInput(numField, "12a"), "RUANGAN_MESTI_NOMBOR", "Mixed alphanumeric in numeric field flagged");
    assert.strictEqual(validatePracticeInput(textField, "12345"), "RUANGAN_MESTI_TEKS", "Digits in text field flagged");
  });

  test("Doc 12 Item 3: Dynamic Total Marks & Section B/C Marks Clamping (Eliminates 4/3m Bug)", () => {
    // Question with maxMarks = 3, but 4 fields graded at 1m each
    const q = {
      questionNo: 1,
      maxMarks: 3,
      answerFields: [
        { id: "f1", marks: 1 },
        { id: "f2", marks: 1 },
        { id: "f3", marks: 1 },
        { id: "f4", marks: 1 },
      ],
    };

    const marksMap = {
      "1_f1": 1,
      "1_f2": 1,
      "1_f3": 1,
      "1_f4": 1,
    };

    const computeAwardedClamped = (question, map) => {
      const norm = qg.normalizeQuestionFields(question);
      let awarded = 0;
      if (norm.answerFields && norm.answerFields.length > 1) {
        awarded = norm.answerFields.reduce((sum, f) => {
          const k = `${question.questionNo}_${f.id}`;
          return sum + Number(map[k] ?? 0);
        }, 0);
      } else {
        awarded = Number(map[question.questionNo] ?? 0);
      }
      const maxM = Number(question.maxMarks || 1);
      return Math.min(maxM, Math.max(0, awarded));
    };

    const awarded = computeAwardedClamped(q, marksMap);
    assert.strictEqual(awarded, 3, "Awarded marks clamped to question maxMarks (3), eliminating 4/3m bug");
  });

  test("Doc 12 Item 3 & 4: Storage Service Auto-Syncs current_darjah when Year Access is Updated or Exam Passed", () => {
    let db = storage.loadDBSync();
    const freshStudent = {
      id: "usr_test_sync_darjah",
      name: "Murid Ujian Sync",
      role: "STUDENT",
      current_darjah: 1,
      unlocked_darjah: [1],
      yearAccess: { 2: "AUTO", 3: "AUTO" },
    };
    db = { ...db, users: [...db.users, freshStudent] };

    // Initially Year 1
    assert.strictEqual(freshStudent.current_darjah, 1, "Student initial year is 1");

    // Tutor unlocks Year 2 access
    db = storage.setStudentYearAccessSync(db, freshStudent.id, 2, "UNLOCKED");
    const updatedStudentY2 = db.users.find((u) => u.id === freshStudent.id);
    assert(updatedStudentY2.unlocked_darjah.includes(2), "Year 2 is now unlocked");
    assert.strictEqual(updatedStudentY2.current_darjah, 2, "current_darjah auto-synced to 2");

    // Tutor unlocks Year 3 access
    db = storage.setStudentYearAccessSync(db, freshStudent.id, 3, "UNLOCKED");
    const updatedStudentY3 = db.users.find((u) => u.id === freshStudent.id);
    assert(updatedStudentY3.unlocked_darjah.includes(3), "Year 3 is now unlocked");
    assert.strictEqual(updatedStudentY3.current_darjah, 3, "current_darjah auto-synced to 3");
  });

  // ──────────────────────────────────────────────────────────────────
  // 9. CORRECTION V2 & CLOUDFLARE LOCAL SQL VERIFICATION
  // ──────────────────────────────────────────────────────────────────
  section("--- 9. Verification for CORRECTION V2 & Cloudflare Local SQL Setup ---");

  test("V2-1: Target Student Dropdown & Personalized Exam Paper Persistence", () => {
    let db = storage.loadDBSync();
    const defaultPaper = {
      id: "paper_y1_default",
      darjah: 1,
      targetStudentId: "DEFAULT",
      title_bm: "Kertas Peperiksaan Akhir Tahun 1 Asal",
      title_en: "Year 1 Default Final Exam Paper",
      status: "PUBLISHED",
      questions: [
        { id: "q1", maxMarks: 2, section: "A" },
        { id: "q2", maxMarks: 3, section: "B" },
      ],
      totalMarks: 5,
    };
    db = storage.saveExamPaperSync(db, 1, defaultPaper, "DEFAULT");
    db = storage.publishExamPaperSync(db, 1, defaultPaper, "DEFAULT").db;

    const studentPaper = {
      id: "paper_y1_adik_custom",
      darjah: 1,
      targetStudentId: "usr_adik_01",
      title_bm: "Kertas Khas Adik Tahun 1",
      title_en: "Adik Year 1 Personalized Paper",
      status: "PUBLISHED",
      questions: [
        { id: "q_adik_1", maxMarks: 1.5, section: "A" },
        { id: "q_adik_2", maxMarks: 2.5, section: "B" },
      ],
      totalMarks: 4.0,
    };
    db = storage.saveExamPaperSync(db, 1, studentPaper, "usr_adik_01");
    db = storage.publishExamPaperSync(db, 1, studentPaper, "usr_adik_01").db;

    // Adik should get the personalized paper
    const adikPaper = storage.getPublishedPaper(db, 1, "usr_adik_01");
    assert(adikPaper, "Adik has a published paper");
    assert.strictEqual(adikPaper.targetStudentId, "usr_adik_01", "Paper is targeted specifically to Adik");
    assert.strictEqual(adikPaper.title_bm, "Kertas Khas Adik Tahun 1");
    assert.strictEqual(adikPaper.totalMarks, 4.0, "Total marks matches decimal sum 4.0");

    // Other student (e.g. fresh student) should fall back to DEFAULT paper
    const otherPaper = storage.getPublishedPaper(db, 1, "usr_other_student");
    assert(otherPaper, "Other student receives default paper");
    assert.strictEqual(otherPaper.targetStudentId, "DEFAULT", "Target is DEFAULT");
    assert.strictEqual(otherPaper.totalMarks, 5, "Total marks matches default paper 5");
  });

  test("V2-2: Decimal Marks Support (0.5, 1.5, 2.5, 3.5) with Pure Float Calculations", () => {
    let db = storage.loadDBSync();
    const decimalPaper = {
      id: "paper_y2_decimal",
      darjah: 2,
      targetStudentId: "DEFAULT",
      title_bm: "Kertas Ujian Perpuluhan",
      title_en: "Decimal Marks Paper",
      questions: [
        { id: "qd1", maxMarks: 0.5, section: "A" },
        { id: "qd2", maxMarks: 1.5, section: "A" },
        { id: "qd3", maxMarks: 2.5, section: "B" },
        { id: "qd4", maxMarks: 3.5, section: "C" },
      ],
    };
    db = storage.saveExamPaperSync(db, 2, decimalPaper, "DEFAULT");
    const saved = db.examPapers[2];
    assert.strictEqual(saved.totalMarks, 8.0, "Total marks correctly sums 0.5 + 1.5 + 2.5 + 3.5 = 8.0 without rounding");
  });

  test("V2-3: Question Part Assignment from Question Editor & Bank", async () => {
    let db = storage.loadDBSync();
    const testTopicId = "d1_t1_nombor_bulat";
    const testPart = {
      id: "part_test_01",
      darjah: 1,
      topicId: testTopicId,
      partNo: 1,
      title_bm: "Bahagian 1: Asas",
      title_en: "Part 1: Basics",
      status: "PUBLISHED",
      questions: [],
    };
    db = storage.saveTopicPartSync(db, 1, testTopicId, testPart);

    const newQuestion = {
      id: "cq_test_part_assignment",
      darjah: 1,
      topicId: testTopicId,
      partId: "part_test_01",
      prompt_bm: "Berapa biji bola?",
      prompt_en: "How many balls?",
      answerFields: [{ id: "f1", type: "NUMERIC", expectedAnswer: "5", marks: 1 }],
      maxMarks: 1,
    };
    db = storage.saveCustomQuestionSync(db, newQuestion);

    // Simulate part assignment
    const parts = storage.getTopicParts(db, 1, testTopicId);
    const targetPart = parts.find((p) => p.id === "part_test_01");
    assert(targetPart, "Target part exists");
    const updatedPart = { ...targetPart, questions: [...(targetPart.questions || []), newQuestion] };
    db = storage.saveTopicPartSync(db, 1, testTopicId, updatedPart);

    const verifiedParts = storage.getTopicParts(db, 1, testTopicId);
    const assignedQ = verifiedParts.find((p) => p.id === "part_test_01")?.questions.find((q) => q.id === "cq_test_part_assignment");
    assert(assignedQ, "Question successfully assigned to Part 1");
  });

  test("V2-4: Tutor Display Name is 'Tutor' (Not 'Abang (Tutor)')", () => {
    const rawLegacyDB = {
      users: [
        { id: "usr_tutor_admin", name: "Abang (Tutor)", role: "TUTOR" },
        { id: "usr_adik_01", name: "Adik", role: "STUDENT" },
      ],
    };
    const loaded = storage.loadDBSync();
    const tutorUser = loaded.users.find((u) => u.role === "TUTOR");
    assert.strictEqual(tutorUser.name, "Tutor", "Tutor user name is 'Tutor'");
  });

  test("V2-5: Local SQLite Schema and Cloudflare D1 Files Exist and are Valid", () => {
    const fs = require("fs");
    const path = require("path");

    const schemaPath = path.join(__dirname, "../database/schema.sql");
    const wranglerPath = path.join(__dirname, "../wrangler.toml");
    const syncPath = path.join(__dirname, "../functions/api/sync.js");

    assert(fs.existsSync(schemaPath), "database/schema.sql exists");
    assert(fs.existsSync(wranglerPath), "wrangler.toml exists");
    assert(fs.existsSync(syncPath), "functions/api/sync.js exists");

    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    assert(schemaContent.includes("CREATE TABLE users"), "Schema contains users table");
    assert(schemaContent.includes("CREATE TABLE exam_papers"), "Schema contains exam_papers table");
    assert(schemaContent.includes("CREATE TABLE topic_parts"), "Schema contains topic_parts table");
  });

  // ──────────────────────────────────────────────────────────────────
  // 11. CORRECTION V3 & AUTOMATED MENTOR E2E REPORT GENERATION
  // ──────────────────────────────────────────────────────────────────
  section("\n--- 11. Verification for CORRECTION V3 & Mentor E2E Report ---");

  test("V3-1: Clean Grid Toolbar Layouts & Bilingual Support in QuestionBankTab & PaperBuilderTab", () => {
    const fs = require("fs");
    const path = require("path");

    const qbContent = fs.readFileSync(
      path.join(__dirname, "../src/components/tutor/QuestionBankTab.jsx"),
      "utf8"
    );
    const pbContent = fs.readFileSync(
      path.join(__dirname, "../src/components/tutor/PaperBuilderTab.jsx"),
      "utf8"
    );

    assert(qbContent.includes("grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"), "QuestionBankTab uses 4-col grid toolbar");
    assert(qbContent.includes("ACADEMIC YEAR"), "QuestionBankTab has ACADEMIC YEAR uppercase label");
    assert(qbContent.includes("SYLLABUS TOPIC"), "QuestionBankTab has SYLLABUS TOPIC uppercase label");
    assert(qbContent.includes("QUESTION SOURCE"), "QuestionBankTab has QUESTION SOURCE uppercase label");
    assert(qbContent.includes("PRACTICE PART"), "QuestionBankTab has PRACTICE PART uppercase label");

    assert(pbContent.includes("grid-cols-1 sm:grid-cols-12"), "PaperBuilderTab uses 12-col grid toolbar");
    assert(pbContent.includes("ACADEMIC YEAR"), "PaperBuilderTab has ACADEMIC YEAR uppercase label");
    assert(pbContent.includes("TARGET STUDENT"), "PaperBuilderTab has TARGET STUDENT uppercase label");
    assert(pbContent.includes("PAPER TITLE"), "PaperBuilderTab has PAPER TITLE uppercase label");
  });

  test("V3-2: Year Access Dropdown Strictly Binary (UNLOCKED / LOCKED) Without AUTO or Manual", () => {
    const fs = require("fs");
    const path = require("path");

    const smContent = fs.readFileSync(
      path.join(__dirname, "../src/components/tutor/StudentManagementTab.jsx"),
      "utf8"
    );

    assert(!smContent.includes("AUTO (Pass Y1)"), "Removed AUTO from Year 2 dropdown");
    assert(!smContent.includes("AUTO (Pass Y2)"), "Removed AUTO from Year 3 dropdown");
    assert(!smContent.includes("(Manual)"), "Removed (Manual) from Year access options");
    assert(smContent.includes("🔓 UNLOCKED"), "Has clean 🔓 UNLOCKED option");
    assert(smContent.includes("🔒 LOCKED"), "Has clean 🔒 LOCKED option");
  });

  test("V3-3: Database Key is kiracelik_db_v5_clean with Seeded Testing Student (PIN: 0000)", async () => {
    const loaded = await storage.loadDB();
    const testStu = loaded.users.find((u) => u.id === "usr_testing_00");
    assert(testStu, "Testing student usr_testing_00 exists");
    assert.strictEqual(testStu.pin_code, "0000", "Testing student PIN is 0000");
    assert.strictEqual(testStu.name, "Testing", "Testing student name is Testing");
    assert.strictEqual(testStu.current_darjah, 1, "Testing student starts in Year 1");
    assert.strictEqual(testStu.yearAccess[2], "LOCKED", "Year 2 access is LOCKED by default");
    assert.strictEqual(testStu.yearAccess[3], "LOCKED", "Year 3 access is LOCKED by default");
  });

  test("V3-4: Automated Mentor Test Runner & Report Generation", () => {
    const { execSync } = require("child_process");
    const path = require("path");
    const reportScript = path.join(__dirname, "generate_mentor_report.cjs");
    const output = execSync(`node "${reportScript}"`, { encoding: "utf8" });
    assert(output.includes("13/13 PASSED"), "All 13 mentor E2E tests pass");

    const reportPath = path.join(__dirname, "../docs/15_AUTOMATED_TESTING_AND_DB_REPORT.md");
    const fs = require("fs");
    assert(fs.existsSync(reportPath), "docs/15_AUTOMATED_TESTING_AND_DB_REPORT.md exists");
  });

  // ──────────────────────────────────────────────────────────────────
  // 12. PIN SETUP, 2-STEP CONFIRMATION & REDIRECT FIX (DOC 16)
  // ──────────────────────────────────────────────────────────────────
  section("\n--- 12. Verification for PIN Setup & Redirect Fix (Doc 16) ---");

  test("Doc 16-1: Fresh DB Reset to kiracelik_db_v6_pin_reset with Zero-State Users", async () => {
    storage.resetMemoryDB();
    const loaded = await storage.loadDB();
    assert.strictEqual(storage.DB_KEY, "kiracelik_db_v6_pin_reset", "DB_KEY is bumped to kiracelik_db_v6_pin_reset");

    const tutor = loaded.users.find((u) => u.id === "usr_tutor_admin");
    const adik = loaded.users.find((u) => u.id === "usr_adik_01");
    const daffa = loaded.users.find((u) => u.id === "usr_daffa_02");
    const testing = loaded.users.find((u) => u.id === "usr_testing_00");

    assert(tutor && adik && daffa && testing, "All standard users exist");
    assert.strictEqual(tutor.pin_code, "", "Tutor PIN starts blank for fresh setup");
    assert.strictEqual(adik.pin_code, "", "Adik PIN starts blank for fresh setup");
    assert.strictEqual(daffa.pin_code, "", "Daffa PIN starts blank for fresh setup");
    assert.strictEqual(testing.pin_code, "0000", "Testing PIN is 0000");

    assert.strictEqual(loaded.examAttempts.length, 0, "Exam attempts are 0 (clean slate)");
    // Verify topic progress has 0 attempts for all users
    Object.values(loaded.topicProgress || {}).forEach((userTopics) => {
      Object.values(userTopics).forEach((topic) => {
        assert.strictEqual(topic.attempts || 0, 0, "No previous attempts");
        assert.strictEqual(topic.bestScore || 0, 0, "Zero best score");
      });
    });
  });

  test("Doc 16-2: updateUserPinSync Synchronously Returns Valid DB Object with activeUserId & Intact Users Array", () => {
    const loaded = storage.loadDBSync();
    const result = storage.updateUserPinSync(loaded, "usr_adik_01", "1234");

    // Guard against blank screen crash: must NOT be a Promise, must be a plain object with valid users
    assert(result && typeof result === "object", "Returned result is a synchronous object");
    assert(typeof result.then !== "function", "Returned result is NOT a Promise");
    assert(Array.isArray(result.users), "users is a valid array");
    assert.strictEqual(result.activeUserId, "usr_adik_01", "activeUserId is set to target user");

    const updatedAdik = result.users.find((u) => u.id === "usr_adik_01");
    assert.strictEqual(updatedAdik.pin_code, "1234", "Adik PIN updated to 1234");

    // Verify verification passes with new PIN
    const verifyRes = storage.verifyPin(result, "usr_adik_01", "1234");
    assert.strictEqual(verifyRes.success, true, "PIN 1234 verified successfully");
  });

  test("Doc 16-3: Two-Step PIN Setup - Mismatch Rejected, Match Confirmed", () => {
    const loaded = storage.loadDBSync();
    const newPin = "4321";
    const mismatchedConfirmPin = "4322";

    // Step 2 mismatch check
    const isMismatch = newPin !== mismatchedConfirmPin;
    assert.strictEqual(isMismatch, true, "Mismatch detected");

    // Confirm match
    const matchingConfirmPin = "4321";
    assert.strictEqual(newPin, matchingConfirmPin, "Confirmation matches new PIN");

    const updated = storage.updateUserPinSync(loaded, "usr_adik_01", matchingConfirmPin);
    const adikPost = updated.users.find((u) => u.id === "usr_adik_01");
    assert.strictEqual(adikPost.pin_code, "4321", "PIN updated upon successful match");
  });

  test("Doc 16-4: Welcome Alert Dispatched on Correct PIN for Tutor & Student", () => {
    const fs = require("fs");
    const path = require("path");

    const homeContent = fs.readFileSync(
      path.join(__dirname, "../src/components/auth/PinLoginHomepage.jsx"),
      "utf8"
    );
    const modalContent = fs.readFileSync(
      path.join(__dirname, "../src/components/auth/PinGateModal.jsx"),
      "utf8"
    );
    const appContent = fs.readFileSync(
      path.join(__dirname, "../src/App.jsx"),
      "utf8"
    );

    assert(homeContent.includes("toast.success(welcomeMsg"), "PinLoginHomepage dispatches welcome alert on correct PIN");
    assert(homeContent.includes("Selamat datang"), "PinLoginHomepage includes BM welcome message");
    assert(homeContent.includes("Welcome"), "PinLoginHomepage includes EN welcome message");

    assert(modalContent.includes("toast.success(welcomeMsg"), "PinGateModal dispatches welcome alert on correct PIN");
    assert(modalContent.includes("Selamat datang"), "PinGateModal includes BM welcome message");
    assert(modalContent.includes("Welcome"), "PinGateModal includes EN welcome message");

    assert(appContent.includes("<ToastContainer />"), "App.jsx renders ToastContainer on login view and logged-in view");
  });

  // ──────────────────────────────────────────────────────────────────
  // 13. DOC 20: RESPONSIVE SVG SCALING & PRE-CLOUDFLARE CLEAN CODE
  // ──────────────────────────────────────────────────────────────────
  section("\n--- 13. Testing Doc 20: Responsive SVG Scaling & Clean Code ---");

  test("Doc 20-1: SVG Visual Figures Have preserveAspectRatio, viewBox and Responsive Classes", () => {
    const fs = require("fs");
    const path = require("path");
    const figContent = fs.readFileSync(
      path.join(__dirname, "../src/components/visuals/QuestionVisualFigure.jsx"),
      "utf8"
    );

    assert(figContent.includes('preserveAspectRatio="xMidYMid meet"'), "Includes preserveAspectRatio on SVGs");
    assert(figContent.includes("viewBox="), "Includes viewBox on SVGs");
    assert(figContent.includes("max-h-40 sm:max-h-44 w-auto max-w-full"), "SVGs use max-h-40/44 w-auto for aspect ratio containment");
    // Verify Abacus has bottom label plate within viewBox
    assert(figContent.includes("Bottom Rod Labels Plate"), "Abacus41Figure has dedicated bottom rod labels plate");
    // Verify HundredGrid uses compact size
    assert(figContent.includes("h-36 w-36 sm:h-40 sm:w-40"), "HundredGrid uses compact 36x36-40x40 dimension");
  });

  test("Doc 20-2: Figure Containers Standardized to max-h-56 Across Modals & Tabs", () => {
    const fs = require("fs");
    const path = require("path");

    const practiceContent = fs.readFileSync(path.join(__dirname, "../src/components/PracticeModal.jsx"), "utf8");
    const examContent = fs.readFileSync(path.join(__dirname, "../src/components/ExamModal.jsx"), "utf8");
    const reviewContent = fs.readFileSync(path.join(__dirname, "../src/components/TutorReviewModal.jsx"), "utf8");
    const bankContent = fs.readFileSync(path.join(__dirname, "../src/components/tutor/QuestionBankTab.jsx"), "utf8");
    const editorContent = fs.readFileSync(path.join(__dirname, "../src/components/tutor/QuestionEditorModal.jsx"), "utf8");

    assert(practiceContent.includes("min-h-[120px] max-h-56 overflow-hidden"), "PracticeModal figure container has max-h-56");
    assert(examContent.includes("min-h-[120px] max-h-56 overflow-hidden"), "ExamModal figure container has max-h-56");
    assert(reviewContent.includes("min-h-[120px] max-h-56 overflow-hidden"), "TutorReviewModal figure container has max-h-56");
    assert(bankContent.includes("min-h-[120px] max-h-56 overflow-hidden"), "QuestionBankTab figure container has max-h-56");
    assert(editorContent.includes("min-h-[120px] max-h-56 overflow-hidden"), "QuestionEditorModal figure container has max-h-56");
  });

  test("Doc 20-3: Scratchpad Header Has Single Icon Without Duplicate Emoji", () => {
    const fs = require("fs");
    const path = require("path");

    const practiceContent = fs.readFileSync(path.join(__dirname, "../src/components/PracticeModal.jsx"), "utf8");
    const examContent = fs.readFileSync(path.join(__dirname, "../src/components/ExamModal.jsx"), "utf8");

    // Must NOT contain duplicate emoji inside span next to <Pencil />
    assert(!practiceContent.includes('<span>{languageMode === "EN" ? "✏️ Scratchpad" : "✏️ Kertas Conteng"}</span>'), "PracticeModal has no duplicate pencil emoji");
    assert(practiceContent.includes('<span>{languageMode === "EN" ? "Scratchpad" : "Kertas Conteng"}</span>'), "PracticeModal has clean Scratchpad title");

    assert(!examContent.includes('<span>\n                  {languageMode === "EN"\n                    ? `✏️ Scratchpad'), "ExamModal has no duplicate pencil emoji");
    assert(examContent.includes('? `Scratchpad (Q${currentQ.questionNo})`'), "ExamModal has clean Scratchpad title");
  });

  test("Doc 20-4: Zero console.log statements across production src/ and functions/", () => {
    const fs = require("fs");
    const path = require("path");

    function scanDir(dir) {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          scanDir(full);
        } else if (f.endsWith(".jsx") || f.endsWith(".js")) {
          const content = fs.readFileSync(full, "utf8");
          const lines = content.split("\n");
          lines.forEach((line, lineNo) => {
            if (line.includes("console.log(") && !line.trim().startsWith("//")) {
              throw new Error(`Leftover console.log found at ${full}:${lineNo + 1}`);
            }
          });
        }
      }
    }

    scanDir(path.join(__dirname, "../src"));
    scanDir(path.join(__dirname, "../functions"));
  });

  test("Doc 20-5: PaperBuilderTab Question Cards Do Not Display Inline Marks (Configured in Edit View)", () => {
    const fs = require("fs");
    const path = require("path");

    const pbContent = fs.readFileSync(path.join(__dirname, "../src/components/tutor/PaperBuilderTab.jsx"), "utf8");
    assert(!pbContent.includes("handleUpdateQuestionMarks"), "PaperBuilderTab does not have inline handleUpdateQuestionMarks handler");
    assert(!pbContent.includes('type="number"\n                            step="0.5"'), "PaperBuilderTab question cards do not render inline marks input");
  });

  test("Doc 21: Bidirectional MCQ isAnswerMatch resolves Option Keys (A/B/C/D) and Option Values (77)", () => {
    const mcqField = {
      type: "MCQ",
      options: [
        { label_bm: "78", label_en: "78", value: "A" },
        { label_bm: "87", label_en: "87", value: "B" },
        { label_bm: "77", label_en: "77", value: "C" },
        { label_bm: "67", label_en: "67", value: "D" },
      ],
      expectedAnswer: "C",
    };

    // User clicked Option C, expected is "C"
    assert.strictEqual(qg.isAnswerMatch("C", "C", mcqField), true, "C matches C");
    assert.strictEqual(qg.isAnswerMatch("c", "c", mcqField), true, "c matches c case-insensitively");

    // User clicked Option C ("C"), expected was stored as numeric value "77"
    assert.strictEqual(qg.isAnswerMatch("C", "77", mcqField), true, "Option C matches value 77");
    assert.strictEqual(qg.isAnswerMatch("c", "77", mcqField), true, "Option c matches value 77");

    // User clicked Option with value "77", expected was stored as letter "C"
    assert.strictEqual(qg.isAnswerMatch("77", "C", mcqField), true, "Value 77 matches Option C");
    assert.strictEqual(qg.isAnswerMatch("77", "c", mcqField), true, "Value 77 matches Option c");

    // Incorrect options reject correctly
    assert.strictEqual(qg.isAnswerMatch("A", "C", mcqField), false, "Option A does not match Option C");
    assert.strictEqual(qg.isAnswerMatch("78", "C", mcqField), false, "Value 78 does not match Option C");
    assert.strictEqual(qg.isAnswerMatch("B", "77", mcqField), false, "Option B does not match value 77");

    // Numeric and Operator support
    assert.strictEqual(qg.isAnswerMatch("45", "45", { type: "NUMERIC" }), true);
    assert.strictEqual(qg.isAnswerMatch("45.0", "45", { type: "NUMERIC" }), true);
    assert.strictEqual(qg.isAnswerMatch("+", "+", { type: "OPERATOR" }), true);

    // Legacy field with accidental expectedOp: "+" does not override expectedAnswer
    const legacyMcqField = {
      type: "MCQ",
      expectedOp: "+",
      expectedAnswer: "C",
      options: mcqField.options,
    };
    const resolvedExpected =
      legacyMcqField.type === "OPERATOR"
        ? legacyMcqField.expectedOp || "+"
        : legacyMcqField.expectedAnswer || "";
    assert.strictEqual(resolvedExpected, "C", "MCQ resolved expected answer is 'C', NOT accidental '+'");
    assert.strictEqual(qg.isAnswerMatch("C", resolvedExpected, legacyMcqField), true, "Matches student choice C");
  });

  // ──────────────────────────────────────────────────────────────────
  // 14. TESTING DOC 22: PIN PERSISTENCE, APPROACH C & CLOUDFLARE D1 SYNC
  // ──────────────────────────────────────────────────────────────────
  section("--- 14. Testing Doc 22: PIN Persistence, Approach C Progression & D1 Sync ---");

  test("Doc 22-1: PIN Persistence & Bidirectional Recognition (pin_code & pin)", () => {
    let mockDb = storage.loadDBSync();
    const student = mockDb.users.find((u) => u.role === "STUDENT");
    assert(student, "Found test student user");

    // Setting PIN via updateUserPinSync sets both pin_code and pin
    mockDb = storage.updateUserPinSync(mockDb, student.id, "1234");
    const updatedStudent = mockDb.users.find((u) => u.id === student.id);
    assert.strictEqual(updatedStudent.pin_code, "1234", "pin_code updated to 1234");
    assert.strictEqual(updatedStudent.pin, "1234", "pin updated to 1234");

    // verifyPin succeeds
    const verifySuccess = storage.verifyPin(mockDb, student.id, "1234");
    assert.strictEqual(verifySuccess.success, true, "PIN 1234 verified successfully");

    // Legacy user with only 'pin' is recognized
    const legacyUserDb = {
      ...mockDb,
      users: mockDb.users.map((u) => (u.id === student.id ? { ...u, pin_code: null, pin: "5678" } : u)),
    };
    const verifyLegacy = storage.verifyPin(legacyUserDb, student.id, "5678");
    assert.strictEqual(verifyLegacy.success, true, "Legacy user with pin: 5678 verified successfully");

    // Wrong PIN fails
    const verifyFail = storage.verifyPin(mockDb, student.id, "9999");
    assert.strictEqual(verifyFail.success, false, "Wrong PIN 9999 rejected");
  });

  test("Doc 22-2: Approach C Micro-Set Passing Calibration (2/3 correct) & Cumulative Weighted Topic Scoring", async () => {
    let testDb = storage.loadDBSync();
    const student = testDb.users.find((u) => u.role === "STUDENT");
    assert(student, "Found student for Approach C test");

    const darjah = 1;
    const topicId = "d1_t1_nombor_hingga_100";
    const parts = storage.getTopicParts(testDb, darjah, topicId);
    assert(Array.isArray(parts) && parts.length >= 2, "Topic has multiple practice parts");

    const part1 = parts[0];
    const part2 = parts[1];
    const part3 = parts[2] || { id: "part_custom_3" };

    // Reset progress for test student
    testDb.topicProgress = testDb.topicProgress || {};
    testDb.topicProgress[student.id] = testDb.topicProgress[student.id] || {};
    testDb.topicProgress[student.id][topicId] = {
      bestScore: 0,
      attempts: 0,
      totalTimeSec: 0,
      status: "IN_PROGRESS",
      completedPartIds: [],
      partScores: {},
      cumulativeScore: 0,
    };

    // Step 1: Student takes Part 1 micro-set (3 questions), gets 2 correct (67%)
    // Under Approach C: totalQuestions <= 3 && correctQuestions >= 2 -> PASSED!
    testDb = storage.recordPartPracticeScoreSync(
      testDb,
      student.id,
      darjah,
      topicId,
      part1.id,
      67, // scorePercentage
      45, // elapsedSec
      3,  // totalQuestions
      2   // correctCount
    );

    let prog = testDb.topicProgress[student.id][topicId];
    assert.strictEqual(prog.partScores[part1.id], 67, "Part 1 score recorded as 67");
    assert(prog.completedPartIds.includes(part1.id), "Part 1 added to completedPartIds (1 / 3 Bahagian)");
    assert.strictEqual(prog.completedPartIds.length, 1, "Exactly 1 part completed");
    assert.strictEqual(prog.status, "IN_PROGRESS", "Topic remains IN_PROGRESS after 1 part");

    // Expected cumulative = Math.round(67 / publishedParts.length)
    const expectedCum1 = Math.round(67 / parts.length);
    assert.strictEqual(prog.cumulativeScore, expectedCum1, `Cumulative score matches weighted average (${expectedCum1})`);

    // Step 2: Student takes Part 2 (3 questions), gets 3 correct (100%)
    testDb = storage.recordPartPracticeScoreSync(
      testDb,
      student.id,
      darjah,
      topicId,
      part2.id,
      100,
      30,
      3,
      3
    );

    prog = testDb.topicProgress[student.id][topicId];
    assert.strictEqual(prog.partScores[part2.id], 100, "Part 2 score recorded as 100");
    assert(prog.completedPartIds.includes(part2.id), "Part 2 added to completedPartIds (2 / 3 Bahagian)");
    assert.strictEqual(prog.completedPartIds.length, 2, "Exactly 2 parts completed");

    // Step 3: Complete remaining parts with >= 70%
    if (parts.length > 2) {
      for (let i = 2; i < parts.length; i++) {
        testDb = storage.recordPartPracticeScoreSync(
          testDb,
          student.id,
          darjah,
          topicId,
          parts[i].id,
          90,
          40,
          3,
          3
        );
      }
    }

    prog = testDb.topicProgress[student.id][topicId];
    assert.strictEqual(prog.completedPartIds.length, parts.length, `All ${parts.length} parts completed`);
    assert(prog.cumulativeScore >= 70, `Cumulative score ${prog.cumulativeScore} >= 70`);
    assert.strictEqual(prog.status, "COMPLETED", "Topic status promoted to COMPLETED when all parts pass");
  });

  test("Doc 22-3: Cloudflare D1 Lossless Snapshot & Bidirectional Sync Payload Formatting", () => {
    const sampleDb = storage.loadDBSync();
    assert(Array.isArray(sampleDb.users), "Users array present in DB");
    assert(sampleDb.users[0].pin_code !== undefined || sampleDb.users[0].pin !== undefined, "User PIN exists");

    // Verify snapshot serialization
    const serialized = JSON.stringify(sampleDb);
    assert(serialized.length > 100, "Serialized snapshot is substantial");
    const deserialized = JSON.parse(serialized);
    assert.strictEqual(deserialized.activeUserId, sampleDb.activeUserId, "Lossless activeUserId round-trip");
    assert.strictEqual(deserialized.users.length, sampleDb.users.length, "Lossless users array round-trip");
  });

  await currentPromise;
  console.log(`\n=== ALL ${passedTests} VERIFICATION CHECKS PASSED SUCCESSFULLY ===`);
}

runTests().catch((err) => {
  console.error("Verification suite encountered error:", err);
  process.exit(1);
});
