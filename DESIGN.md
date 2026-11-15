# DESIGN.md — KiraCelik Dwibahasa Visual Direction & Liveliness Spec

## 1. Identity & Soul
- **Product:** KiraCelik Dwibahasa (KSSR Semakan Tahap 1 Primary Mathematics Workbook & PBD Assessment Platform)
- **Archetype:** Authentic Malaysian Primary School Square-Grid Exercise Book (*Buku Latihan Matematik Kotak Sekolah Rendah*) + Teacher's Official Record Book (*Buku Rekod Pengajaran & Pentaksiran*).
- **Audience:** 7–9 year old primary students (Tahun 1, 2, 3) and school teachers/tutors.
- **Core Ethos:** Tactile, physical paper-and-ink clarity. Zero dark-mode neon, zero glassmorphism, zero floating SaaS gradients, zero audio distraction.

## 2. Liveliness Toolkit Dials (AntiSlop Part 3)
- **ENERGY:** `6 / 10` (Warm, encouraging classroom energy for students via tactile 3D button presses and first-try confetti bursts; calm, authoritative editorial precision for Tutors).
- **RHYTHM:** `7 / 10` (Structured Swiss educational grid rhythm; clear contrast between compact metadata badges, generous mathematical figure canvases, and crisp tabular score sheets).
- **MOTION:** `4 / 10` (Instant, mechanical physical button depression `translateY(3px)` in `50ms`; zero slow fade-in delays or bouncy springs that slow down arithmetic drills).

## 3. Color Palette & Surface Tokens
- **Primary Paper Surface (`.bg-math-paper`):** Warm Unbleached Daylight Paper `#FAF6EE` with subtle `#E2D9C8` radial grain (`24px`).
- **Workbook Exercise Grid (`.bg-math-grid`):** Crisp `28px × 28px` square exercise book lines in soft cyan `#E0F2FE` over `#FFFFFF` / `#FAF6EE`.
- **Structural Ink Border:** Deep Slate Ink `#0F172A` (`2px solid #0F172A` on cards, inputs, and buttons).
- **Tactile Shadow Physics:** Hard offset ink shadow `3px 3px 0px #0F172A` (cards) and `0 3px 0 #0F172A` (buttons). Never use blurry `rgba()` drop shadows.
- **Pedagogical Semantic Accents:**
  - **Amber Gold (`#FCD34D` / `#F59E0B`):** Active selection, hint callouts, and scratchpad indicators.
  - **Sky Blue (`#38BDF8` / `#BAE6FD`):** Primary navigation, interactive student prompts, and Tahun badges.
  - **Emerald Green (`#34D399` / `#A7F3D0`):** Mastery completed (`>= 70%`), `LULUS / PASSED` status, and correct answer feedback.
  - **Rose Coral (`#F43F5E` / `#FFE4E6`):** Revision needed, delete confirmation, and input validation alerts.

## 4. Typography & Hierarchy
- **Headings & Numerals:** High-legibility geometric/humanist sans (`Plus Jakarta Sans` / `Inter` / system sans) with `font-extrabold` (`800`) and `tabular-nums` for all mathematical equations, scores, timers, and place-value columns so digits never jitter.
- **Container Discipline:** Centered `max-w-4xl` (`896px`) workbook proportion to prevent wide-screen eye fatigue.
- **Anti-Slop Copywriting Rules:**
  - Eliminate decorative emoji spam on every single secondary pill or label; reserve icons/emojis strictly for primary navigation, student avatars, and celebration states.
  - Use authentic KPM DSKP Bahasa Melayu (*Bentuk Lazim, Nilai Tempat, Cerakin, Kertas Conteng, Tahap Penguasaan*) and natural Cambridge Primary English.