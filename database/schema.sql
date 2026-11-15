-- database/schema.sql
-- SQLite Schema for KiraCelik Dwibahasa
-- Compatible with Cloudflare D1 (Local SQLite & Production D1)
-- Run locally via: npx wrangler d1 execute kiracelik-db --local --file=./database/schema.sql

-- Drop existing tables if recreating
DROP TABLE IF EXISTS exam_answers;
DROP TABLE IF EXISTS exam_attempts;
DROP TABLE IF EXISTS exam_papers;
DROP TABLE IF EXISTS custom_questions;
DROP TABLE IF EXISTS question_overrides;
DROP TABLE IF EXISTS topic_parts;
DROP TABLE IF EXISTS topic_progress;
DROP TABLE IF EXISTS app_settings;
DROP TABLE IF EXISTS users;

-- 1. Users Table (Students & Tutor)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT CHECK(role IN ('STUDENT', 'TUTOR')) NOT NULL DEFAULT 'STUDENT',
    avatar TEXT NOT NULL DEFAULT '🦁',
    pin_code TEXT NOT NULL DEFAULT '', -- Blank by default, updated via PIN modal
    status TEXT CHECK(status IN ('Active', 'Deactivate', 'Graduate')) NOT NULL DEFAULT 'Active',
    current_darjah INTEGER NOT NULL DEFAULT 1,
    unlocked_darjah TEXT NOT NULL DEFAULT '[1]', -- JSON array: [1, 2, 3]
    year_access TEXT NOT NULL DEFAULT '{"2":"LOCKED","3":"LOCKED"}', -- JSON object
    reset_mode TEXT CHECK(reset_mode IN ('HARD_RESET', 'SMART_RESET')) DEFAULT 'HARD_RESET',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default initial users (Zero-State Fresh Factory Reset)
INSERT INTO users (id, name, role, avatar, pin_code, status, current_darjah, unlocked_darjah, year_access, reset_mode)
VALUES 
    ('usr_tutor_admin', 'Tutor', 'TUTOR', '🎓', '', 'Active', 1, '[1,2,3]', '{"2":"UNLOCKED","3":"UNLOCKED"}', 'HARD_RESET'),
    ('usr_testing_00', 'Testing', 'STUDENT', '🧪', '0000', 'Active', 1, '[1]', '{"2":"LOCKED","3":"LOCKED"}', 'HARD_RESET'),
    ('usr_adik_01', 'Adik', 'STUDENT', '🦁', '', 'Active', 1, '[1]', '{"2":"LOCKED","3":"LOCKED"}', 'HARD_RESET'),
    ('usr_daffa_02', 'Daffa', 'STUDENT', '🐼', '', 'Active', 1, '[1]', '{"2":"LOCKED","3":"LOCKED"}', 'HARD_RESET');

-- 2. Topic Progress Table (Tracks per-topic mastery and gates exam readiness at >=70%)
CREATE TABLE topic_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL,
    darjah INTEGER NOT NULL,
    status TEXT CHECK(status IN ('IN_PROGRESS', 'COMPLETED', 'RETAKE_REQUIRED')) DEFAULT 'IN_PROGRESS',
    best_score REAL DEFAULT 0,
    last_score REAL DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    total_time_seconds INTEGER DEFAULT 0,
    completed_part_ids TEXT DEFAULT '[]', -- JSON array of completed topic part IDs
    recent_question_hashes TEXT DEFAULT '[]', -- JSON array
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, topic_id)
);

-- 3. Exam Papers Table (Default Year Papers and Personalized Student Papers)
CREATE TABLE exam_papers (
    id TEXT PRIMARY KEY, -- e.g. "d1_default", "d1_usr_adik_01"
    darjah INTEGER NOT NULL,
    target_student_id TEXT NOT NULL DEFAULT 'DEFAULT', -- 'DEFAULT' or specific student user_id
    title_bm TEXT NOT NULL,
    title_en TEXT NOT NULL,
    status TEXT CHECK(status IN ('DRAFT', 'PUBLISHED')) NOT NULL DEFAULT 'DRAFT',
    total_marks REAL NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    questions_json TEXT NOT NULL, -- JSON array of question objects
    published_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(darjah, target_student_id)
);

-- 4. Exam Attempts Table (Records student submissions and tutor grading)
CREATE TABLE exam_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    darjah INTEGER NOT NULL,
    paper_id TEXT,
    target_student_id TEXT DEFAULT 'DEFAULT',
    score_a REAL DEFAULT 0,
    score_b REAL DEFAULT 0,
    score_c REAL DEFAULT 0,
    total_marks REAL DEFAULT 0,
    paper_total_marks REAL DEFAULT 50,
    percentage REAL DEFAULT 0,
    status TEXT CHECK(status IN ('PENDING_REVIEW', 'PASSED', 'FAILED')) NOT NULL DEFAULT 'PENDING_REVIEW',
    tutor_decision TEXT CHECK(tutor_decision IN ('PASSED', 'FAILED', NULL)),
    tutor_notes TEXT DEFAULT '',
    per_item_marks_json TEXT DEFAULT '{}', -- JSON object: {"1": 1, "2_num1": 1, ...}
    responses_json TEXT DEFAULT '{}',      -- JSON object of student answers
    scratchpads_json TEXT DEFAULT '{}',    -- JSON object of data URLs / canvas snapshots
    duration_seconds INTEGER DEFAULT 0,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 5. Custom & Modified Questions Bank Table
CREATE TABLE custom_questions (
    id TEXT PRIMARY KEY,
    darjah INTEGER NOT NULL,
    topic_id TEXT NOT NULL,
    part_id TEXT,
    section TEXT CHECK(section IN ('A', 'B', 'C')) DEFAULT 'A',
    source TEXT DEFAULT 'CUSTOM',
    story_bm TEXT DEFAULT '',
    story_en TEXT DEFAULT '',
    prompt_bm TEXT NOT NULL,
    prompt_en TEXT DEFAULT '',
    instructions_bm TEXT DEFAULT '',
    instructions_en TEXT DEFAULT '',
    answer_fields_json TEXT NOT NULL, -- JSON array: [{id, type, expectedAnswer, marks, ...}]
    max_marks REAL NOT NULL DEFAULT 1,
    scratchpad_required BOOLEAN DEFAULT 0,
    scratchpad_marks REAL DEFAULT 0,
    visual_spec_json TEXT, -- JSON object: SVG visual parameters or custom image URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Question Overrides Table (Per-question customizations on standard catalog)
CREATE TABLE question_overrides (
    question_id TEXT PRIMARY KEY,
    override_json TEXT NOT NULL, -- JSON object of overrides
    hide_visual BOOLEAN DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Topic Practice Parts Table (Organizes syllabus topics into Parts 1, 2, 3...)
CREATE TABLE topic_parts (
    id TEXT PRIMARY KEY,
    darjah INTEGER NOT NULL,
    topic_id TEXT NOT NULL,
    part_no INTEGER NOT NULL,
    title_bm TEXT NOT NULL,
    title_en TEXT NOT NULL,
    status TEXT CHECK(status IN ('DRAFT', 'PUBLISHED')) NOT NULL DEFAULT 'PUBLISHED',
    questions_json TEXT NOT NULL DEFAULT '[]', -- JSON array of questions assigned to this part
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Application Global Settings
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_settings (key, value)
VALUES 
    ('languageMode', 'BM'),
    ('activeUserId', 'usr_testing_00');
