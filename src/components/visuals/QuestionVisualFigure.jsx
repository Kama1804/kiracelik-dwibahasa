export default function QuestionVisualFigure({ visual, languageMode = "BM" }) {
  if (!visual || !visual.type) return null;

  const { type, data = {} } = visual;

  return (
    <div className="w-full max-w-full max-h-full flex flex-col items-center justify-center p-1 sm:p-2 overflow-hidden">
      {renderVisualContent(type, data, languageMode)}
    </div>
  );
}

function renderVisualContent(type, data, languageMode) {
  switch (type) {
    case "BASE10_BLOCKS":
      return <Base10BlocksFigure data={data} languageMode={languageMode} />;
    case "ABACUS_4_1":
      return <Abacus41Figure data={data} languageMode={languageMode} />;
    case "NUMBER_BOND":
      return <NumberBondFigure data={data} languageMode={languageMode} />;
    case "NUMBER_LINE":
      return <NumberLineFigure data={data} languageMode={languageMode} />;
    case "BENTUK_LAZIM":
      return <BentukLazimPreviewFigure data={data} languageMode={languageMode} />;
    case "EQUAL_GROUPS_ARRAY":
      return <EqualGroupsArrayFigure data={data} languageMode={languageMode} />;
    case "BAR_MODEL":
      return <BarModelFigure data={data} languageMode={languageMode} />;
    case "FRACTION_SHAPE":
      return <FractionShapeFigure data={data} languageMode={languageMode} />;
    case "FRACTION_COMPARISON_BARS":
      return <FractionComparisonFigure data={data} languageMode={languageMode} />;
    case "HUNDRED_GRID":
      return <HundredGridFigure data={data} languageMode={languageMode} />;
    case "MONEY_TRAY":
      return <MoneyTrayFigure data={data} languageMode={languageMode} />;
    case "ANALOG_CLOCK":
      return <AnalogClockFigure data={data} languageMode={languageMode} />;
    case "RULER_SCALE":
      return <RulerScaleFigure data={data} languageMode={languageMode} />;
    case "GEOMETRY_2D_3D":
      return <GeometryFigure data={data} languageMode={languageMode} />;
    case "SHAPE_PATTERN":
      return <ShapePatternFigure data={data} languageMode={languageMode} />;
    case "COORDINATE_GRID":
      return <CoordinateGridFigure data={data} languageMode={languageMode} />;
    case "DATA_CHART":
      return <DataChartFigure data={data} languageMode={languageMode} />;
    case "IMAGE":
    case "CUSTOM_IMAGE":
      return <CustomImageFigure data={data} languageMode={languageMode} />;
    default:
      return null;
  }
}

// ─── 1. BASE 10 BLOCKS (BLOK ASAS 10) ──────────────────────────────
function Base10BlocksFigure({ data, languageMode = "BM" }) {
  const { hundreds = 0, tens = 0, ones = 0, total, comparison } = data;

  const lblHundreds =
    languageMode === "EN" ? "Hundreds" : languageMode === "DWIBAHASA" ? "Ratus / Hundreds" : "Ratus";
  const lblTens =
    languageMode === "EN" ? "Tens" : languageMode === "DWIBAHASA" ? "Puluh / Tens" : "Puluh";
  const lblOnes =
    languageMode === "EN" ? "Ones" : languageMode === "DWIBAHASA" ? "Sa / Ones" : "Sa";

  if (comparison) {
    const lblA = languageMode === "EN" ? "NUMBER A" : "NOMBOR A";
    const lblB = languageMode === "EN" ? "NUMBER B" : "NOMBOR B";
    return (
      <div className="flex flex-wrap items-center justify-center gap-8">
        <div className="flex flex-col items-center rounded-2xl border-3 border-slate-900 bg-amber-100 p-5 shadow-tactile">
          <span className="text-sm font-black text-amber-900 font-mono">{lblA}</span>
          <span className="text-4xl sm:text-5xl font-black text-slate-900 font-mono mt-1">{comparison.numA}</span>
        </div>
        <div className="text-3xl font-black text-slate-400 font-mono">VS</div>
        <div className="flex flex-col items-center rounded-2xl border-3 border-slate-900 bg-sky-100 p-5 shadow-tactile">
          <span className="text-sm font-black text-sky-900 font-mono">{lblB}</span>
          <span className="text-4xl sm:text-5xl font-black text-slate-900 font-mono mt-1">{comparison.numB}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full py-0.5 scale-90 sm:scale-100 origin-center max-w-full">
      <div className="flex flex-wrap items-end justify-center gap-4 sm:gap-6">
        {/* Hundreds flats (Amber Gold) */}
        {hundreds > 0 && (
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex flex-wrap gap-1.5 max-w-[220px] justify-center">
              {Array.from({ length: Math.min(hundreds, 9) }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-md border-2 border-slate-900 bg-amber-300 grid grid-cols-10 grid-rows-10 p-0.5 shadow-tactile-sm"
                  title="Blok Ratus"
                >
                  {Array.from({ length: 100 }).map((_, j) => (
                    <div key={j} className="border-[0.5px] border-amber-600/40" />
                  ))}
                </div>
              ))}
            </div>
            <span className="rounded-lg border border-slate-900 bg-amber-200 px-2 py-0.5 font-mono text-[11px] font-black text-amber-950 shadow-tactile-sm">
              {hundreds} {lblHundreds}
            </span>
          </div>
        )}

        {/* Tens rods (Emerald Green) */}
        {tens > 0 && (
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex gap-1.5 justify-center items-end">
              {Array.from({ length: Math.min(tens, 9) }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 w-5 sm:h-20 sm:w-6 rounded border-2 border-slate-900 bg-emerald-400 grid grid-rows-10 p-0.5 shadow-tactile-sm"
                  title="Blok Puluh"
                >
                  {Array.from({ length: 10 }).map((_, j) => (
                    <div key={j} className="border-b-[0.5px] border-emerald-700/50" />
                  ))}
                </div>
              ))}
            </div>
            <span className="rounded-lg border border-slate-900 bg-emerald-200 px-2 py-0.5 font-mono text-[11px] font-black text-emerald-950 shadow-tactile-sm">
              {tens} {lblTens}
            </span>
          </div>
        )}

        {/* Ones cubes (Sky Blue) */}
        {ones > 0 && (
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex flex-wrap gap-1.5 max-w-[120px] justify-center items-end">
              {Array.from({ length: Math.min(ones, 9) }).map((_, i) => (
                <div
                  key={i}
                  className="h-5 w-5 sm:h-6 sm:w-6 rounded border-2 border-slate-900 bg-sky-400 shadow-tactile-sm"
                  title="Blok Sa"
                />
              ))}
            </div>
            <span className="rounded-lg border border-slate-900 bg-sky-200 px-2 py-0.5 font-mono text-[11px] font-black text-sky-950 shadow-tactile-sm">
              {ones} {lblOnes}
            </span>
          </div>
        )}
      </div>

      {total && (
        <div className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 text-[11px] font-black text-slate-700 shadow-tactile-sm">
          {languageMode === "EN"
            ? "Place Value Guide: Hundreds (Amber) • Tens (Green) • Ones (Blue)"
            : languageMode === "DWIBAHASA"
            ? "Nilai Tempat: Ratus (Amber) • Puluh (Hijau) • Sa (Biru)"
            : "Petunjuk Nilai Tempat: Ratus (Amber) • Puluh (Hijau) • Sa (Biru)"}
        </div>
      )}
    </div>
  );
}

// ─── 2. ABAKUS 4:1 (MALAYSIAN SOROBAN - 2.5x SIZE) ─────────────────
function Abacus41Figure({ data, languageMode = "BM" }) {
  const { thousands = 0, hundreds = 0, tens = 0, ones = 0 } = data;

  const rodLabels = {
    Ribu: languageMode === "EN" ? "Th" : languageMode === "DWIBAHASA" ? "Ribu/Th" : "Ribu",
    Ratus: languageMode === "EN" ? "H" : languageMode === "DWIBAHASA" ? "Ratus/H" : "Ratus",
    Puluh: languageMode === "EN" ? "T" : languageMode === "DWIBAHASA" ? "Puluh/T" : "Puluh",
    Sa: languageMode === "EN" ? "O" : languageMode === "DWIBAHASA" ? "Sa/O" : "Sa",
  };

  const rods = [
    { labelKey: "Ribu", label: rodLabels.Ribu, val: thousands, show: thousands > 0 || hundreds > 0 },
    { labelKey: "Ratus", label: rodLabels.Ratus, val: hundreds, show: hundreds > 0 || tens > 0 },
    { labelKey: "Puluh", label: rodLabels.Puluh, val: tens, show: true },
    { labelKey: "Sa", label: rodLabels.Sa, val: ones, show: true },
  ].filter((r, idx, arr) => r.show || idx >= arr.length - 2);

  const rodWidth = 84;
  const totalWidth = rods.length * rodWidth + 40;
  const frameHeight = 192;
  const beamY = 66;
  const svgHeight = 236;

  const footnote =
    languageMode === "EN"
      ? "Abacus 4:1 (Upper Bead = 5 • Lower Bead = 1)"
      : languageMode === "DWIBAHASA"
      ? "Abakus 4:1 (Atas / Upper = 5 • Bawah / Lower = 1)"
      : "Abakus 4:1 (Manik Atas = 5 • Manik Bawah = 1)";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={totalWidth}
        height={svgHeight}
        viewBox={`0 0 ${totalWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block h-auto max-h-40 sm:max-h-44 w-auto max-w-full rounded-2xl border-4 border-amber-950 bg-amber-50 shadow-tactile"
      >
        {/* Outer Wooden Frame */}
        <rect x="4" y="6" width={totalWidth - 8} height={frameHeight} fill="#FEF3C7" stroke="#78350F" strokeWidth="8" rx="12" />
        {/* Horizontal Beam */}
        <rect x="8" y={beamY} width={totalWidth - 16} height="14" fill="#78350F" stroke="#451A03" strokeWidth="2" />
        {/* Bottom Rod Labels Plate */}
        <rect x="8" y={frameHeight + 8} width={totalWidth - 16} height="30" fill="#78350F" stroke="#451A03" strokeWidth="2" rx="6" />

        {rods.map((rod, idx) => {
          const x = 20 + idx * rodWidth + rodWidth / 2;
          const upperActive = rod.val >= 5;
          const lowerCount = rod.val % 5;
          const upperY = upperActive ? beamY - 24 : 14;

          return (
            <g key={idx}>
              {/* Rod Metal Bar */}
              <line x1={x} y1="12" x2={x} y2={frameHeight - 2} stroke="#64748B" strokeWidth="4" />

              {/* Unit Alignment Dot on Beam */}
              {(rod.labelKey === "Sa" || rod.labelKey === "Ribu") && (
                <circle cx={x} cy={beamY + 7} r="3.5" fill="#FFFFFF" />
              )}

              {/* Upper Bead (Val 5) */}
              <g transform={`translate(${x - 24}, ${upperY})`}>
                <polygon
                  points="24,0 48,11 24,22 0,11"
                  fill={upperActive ? "#D97706" : "#E2E8F0"}
                  stroke="#0F172A"
                  strokeWidth="2"
                />
              </g>

              {/* 4 Lower Beads (Val 1 each) */}
              {[0, 1, 2, 3].map((bIdx) => {
                const isActive = bIdx < lowerCount;
                const beadY = isActive
                  ? beamY + 16 + bIdx * 20
                  : frameHeight - 16 - (4 - bIdx) * 20;

                return (
                  <g key={bIdx} transform={`translate(${x - 24}, ${beadY})`}>
                    <polygon
                      points="24,0 48,10 24,20 0,10"
                      fill={isActive ? "#0284C7" : "#E2E8F0"}
                      stroke="#0F172A"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}

              {/* Rod Label inside Bottom Plate */}
              <text
                x={x}
                y={frameHeight + 28}
                textAnchor="middle"
                fontSize="13"
                fontWeight="900"
                fill="#FEF3C7"
                fontFamily="monospace"
              >
                {rod.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
        {footnote}
      </div>
    </div>
  );
}

// ─── 3. NUMBER BOND (KOMBINASI NOMBOR - 2.5x SIZE) ──────────────────
function NumberBondFigure({ data, languageMode = "BM" }) {
  const { whole, part1, part2, missingPart } = data;

  const footnote =
    languageMode === "EN"
      ? "Number Bond (Part-Whole Model)"
      : languageMode === "DWIBAHASA"
      ? "Kombinasi Nombor / Number Bond"
      : "Kombinasi Nombor (Kombinasi Sebahagian-Semua)";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width="340"
        height="210"
        viewBox="0 0 340 210"
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full overflow-visible"
      >
        <line x1="170" y1="56" x2="80" y2="150" stroke="#0F172A" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="170" y1="56" x2="260" y2="150" stroke="#0F172A" strokeWidth="4.5" strokeLinecap="round" />

        <circle cx="170" cy="50" r="38" fill="#FEF08A" stroke="#0F172A" strokeWidth="3.5" />
        <text x="170" y="58" textAnchor="middle" fontSize="22" fontWeight="900" fill="#0F172A" fontFamily="monospace">
          {whole}
        </text>

        <circle
          cx="80"
          cy="154"
          r="34"
          fill={missingPart === 1 ? "#FEE2E2" : "#E0F2FE"}
          stroke="#0F172A"
          strokeWidth="3.5"
          strokeDasharray={missingPart === 1 ? "5,4" : "none"}
        />
        <text x="80" y="162" textAnchor="middle" fontSize="20" fontWeight="900" fill="#0F172A" fontFamily="monospace">
          {missingPart === 1 ? "?" : part1}
        </text>

        <circle
          cx="260"
          cy="154"
          r="34"
          fill={missingPart === 2 ? "#FEE2E2" : "#DCFCE7"}
          stroke="#0F172A"
          strokeWidth="3.5"
          strokeDasharray={missingPart === 2 ? "5,4" : "none"}
        />
        <text x="260" y="162" textAnchor="middle" fontSize="20" fontWeight="900" fill="#0F172A" fontFamily="monospace">
          {missingPart === 2 ? "?" : part2}
        </text>
      </svg>
      <span className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-700 shadow-tactile-sm">
        {footnote}
      </span>
    </div>
  );
}

// ─── 4. NUMBER LINE (GARIS NOMBOR - 2.5x SIZE) ──────────────────────
function NumberLineFigure({ data, languageMode = "BM" }) {
  const { values = [], step = 1, missingIndex = -1, highlight } = data;
  const count = values.length || 5;
  const width = Math.min(680, Math.max(380, count * 90));
  const height = 150;
  const yLine = 95;
  const paddingX = 40;
  const stepWidth = (width - paddingX * 2) / Math.max(1, count - 1);

  const footnote =
    languageMode === "EN"
      ? "Number Line (Number Pattern)"
      : languageMode === "DWIBAHASA"
      ? "Garis Nombor / Number Line"
      : "Garis Nombor (Pola Nombor)";

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block h-auto max-h-32 sm:max-h-36 w-auto max-w-full overflow-visible"
      >
        <line x1={paddingX - 15} y1={yLine} x2={width - paddingX + 15} y2={yLine} stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
        <polygon points={`${paddingX - 20},${yLine} ${paddingX - 8},${yLine - 6} ${paddingX - 8},${yLine + 6}`} fill="#0F172A" />
        <polygon points={`${width - paddingX + 20},${yLine} ${width - paddingX + 8},${yLine - 6} ${width - paddingX + 8},${yLine + 6}`} fill="#0F172A" />

        {values.map((val, idx) => {
          const x = paddingX + idx * stepWidth;
          const isMissing = idx === missingIndex;
          const isHighlight = highlight !== undefined && Math.abs(val - highlight) < 0.01;

          return (
            <g key={idx}>
              <line x1={x} y1={yLine - 12} x2={x} y2={yLine + 12} stroke="#0F172A" strokeWidth="3.5" />

              {idx < count - 1 && (
                <path
                  d={`M ${x} ${yLine - 14} Q ${x + stepWidth / 2} ${yLine - 60} ${x + stepWidth} ${yLine - 14}`}
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="3"
                  strokeDasharray="4,3"
                />
              )}

              {idx < count - 1 && (
                <text
                  x={x + stepWidth / 2}
                  y={yLine - 46}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="900"
                  fill="#0284C7"
                  fontFamily="monospace"
                >
                  {step > 0 ? `+${step}` : step}
                </text>
              )}

              {isMissing ? (
                <g transform={`translate(${x - 22}, ${yLine + 18})`}>
                  <rect width="44" height="34" rx="8" fill="#FEF3C7" stroke="#D97706" strokeWidth="2.5" strokeDasharray="4,3" />
                  <text x="22" y="24" textAnchor="middle" fontSize="18" fontWeight="900" fill="#B45309" fontFamily="monospace">
                    ?
                  </text>
                </g>
              ) : (
                <text
                  x={x}
                  y={yLine + 34}
                  textAnchor="middle"
                  fontSize="18"
                  fontWeight="900"
                  fill={isHighlight ? "#0284C7" : "#0F172A"}
                  fontFamily="monospace"
                >
                  {val}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <span className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-700 shadow-tactile-sm">
        {footnote}
      </span>
    </div>
  );
}

// ─── 5. BENTUK LAZIM PREVIEW (ZERO ANSWER LEAKS: '? ?' IN AMBER BOX) ──
function BentukLazimPreviewFigure({ data, languageMode = "BM" }) {
  const { operand1 = 0, operand2 = 0, operator = "+" } = data;

  const title =
    languageMode === "EN"
      ? "Standard Written Method"
      : languageMode === "DWIBAHASA"
      ? "Bentuk Lazim Rasmi / Standard Method"
      : "Bentuk Lazim Rasmi";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="rounded-2xl border-3 border-slate-900 bg-[#FAF6EE] p-3 sm:p-4 font-mono text-2xl sm:text-3xl font-black text-slate-900 shadow-tactile min-w-[150px]">
        <div className="text-right pr-2">{operand1}</div>
        <div className="flex items-center justify-between gap-4 border-b-4 border-slate-900 pb-1">
          <span className="text-sky-600">{operator}</span>
          <span>{operand2}</span>
        </div>
        {/* Anti-spoiler amber mystery box: NEVER leak the final answer number */}
        <div className="flex justify-end pt-1.5">
          <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-amber-500 bg-amber-100 px-3 py-0.5 text-xl font-black text-amber-800 shadow-sm">
            ? ?
          </div>
        </div>
      </div>
      <span className="text-[11px] font-black text-slate-600 font-mono">{title}</span>
    </div>
  );
}

// ─── 6. EQUAL GROUPS ARRAY (KUMPULAN SAMA BANYAK - NO LEAKS, NO CLIPPING) ─
function EqualGroupsArrayFigure({ data, languageMode = "BM" }) {
  const { groupSize = 2, groupCount = 3, objectEmoji = "⭐" } = data;

  const grpWord =
    languageMode === "EN" ? "Group" : languageMode === "DWIBAHASA" ? "Kumpulan / Group" : "Kumpulan";
  const itemWord =
    languageMode === "EN" ? "Items" : languageMode === "DWIBAHASA" ? "Item / Items" : "Item";

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-2xl px-2">
      {/* Scrollable / wrap container to prevent clipping when multiple rows */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 max-h-[160px] sm:max-h-[180px] overflow-y-auto p-1">
        {Array.from({ length: Math.min(groupCount, 8) }).map((_, gIdx) => (
          <div
            key={gIdx}
            className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-900 bg-white p-2 sm:p-2.5 shadow-tactile-sm"
          >
            <div className="flex flex-wrap gap-1 justify-center max-w-[120px] text-xl sm:text-2xl">
              {Array.from({ length: Math.min(groupSize, 12) }).map((_, oIdx) => (
                <span key={oIdx}>{objectEmoji}</span>
              ))}
            </div>
            <span className="mt-1.5 text-[10px] font-black font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-400">
              {grpWord} {gIdx + 1} ({groupSize})
            </span>
          </div>
        ))}
      </div>
      {/* Anti-spoiler bottom badge: Never show '= {total}' */}
      <div className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
        {groupCount} {grpWord} × {groupSize} {itemWord}
      </div>
    </div>
  );
}

// ─── 7. BAR MODEL (MODEL BAR SINGAPURA / KSSR) ───────────────────────
function BarModelFigure({ data, languageMode = "BM" }) {
  const { whole = 100, partKnown = 60, partUnknown = 40, isAddForm = true } = data;
  const pctKnown = Math.round((partKnown / ((partKnown + partUnknown) || whole || 1)) * 100);
  const pctUnknown = 100 - pctKnown;

  // Case 1 Anti-Spoiler: In addition problems asking for total, NEVER leak the total in the header!
  const totalLabel = isAddForm
    ? languageMode === "EN"
      ? "Total: ?"
      : languageMode === "DWIBAHASA"
      ? "Jumlah / Total: ?"
      : "Jumlah: ?"
    : languageMode === "EN"
    ? `Total: ${whole}`
    : languageMode === "DWIBAHASA"
    ? `Jumlah / Total: ${whole}`
    : `Jumlah: ${whole}`;

  const footnote =
    languageMode === "EN"
      ? "Bar Model (Part-Whole)"
      : languageMode === "DWIBAHASA"
      ? "Model Bar / Bar Model"
      : "Model Bar (Sebahagian-Semua)";

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-xl">
      <div className="w-full text-center font-mono text-base font-black text-slate-900 border-b-2 border-slate-900 pb-1">
        {totalLabel}
      </div>

      <div className="flex w-full h-12 sm:h-14 overflow-hidden rounded-2xl border-3 border-slate-900 shadow-tactile">
        <div
          style={{ width: `${Math.max(15, pctKnown)}%` }}
          className="flex items-center justify-center bg-sky-200 border-r-3 border-slate-900 font-mono text-lg sm:text-xl font-black text-sky-950"
        >
          {partKnown}
        </div>
        <div
          style={{ width: `${Math.max(15, pctUnknown)}%` }}
          className="flex items-center justify-center bg-amber-200 font-mono text-xl sm:text-2xl font-black text-amber-950 border-dashed"
        >
          {isAddForm ? partUnknown : "?"}
        </div>
      </div>
      <span className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-700 shadow-tactile-sm">
        {footnote}
      </span>
    </div>
  );
}

// ─── 8. FRACTION SHAPE (PECAHAN - 2.5x SIZE) ────────────────────────
function FractionShapeFigure({ data, languageMode = "BM" }) {
  const { numerator = 1, denominator = 2, shape = "circle" } = data;

  if (shape === "circle") {
    const size = 230;
    const center = size / 2;
    const radius = 95;
    const slices = [];

    for (let i = 0; i < denominator; i++) {
      const startAngle = (i * 360) / denominator - 90;
      const endAngle = ((i + 1) * 360) / denominator - 90;
      const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
      const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
      const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
      const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
      const largeArc = 360 / denominator > 180 ? 1 : 0;
      const isShaded = i < numerator;

      const pathData =
        denominator === 1
          ? `M ${center} ${center} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`
          : `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      slices.push(
        <path
          key={i}
          d={pathData}
          fill={isShaded ? "#10B981" : "#FFFFFF"}
          stroke="#0F172A"
          strokeWidth="3.5"
        />
      );
    }

    const circleBadge =
      languageMode === "EN"
        ? "Circle Fraction"
        : languageMode === "DWIBAHASA"
        ? "Pecahan Bulatan / Circle Fraction"
        : "Pecahan Bulatan";

    return (
      <div className="flex flex-col items-center gap-2">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          preserveAspectRatio="xMidYMid meet"
          className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full drop-shadow-sm"
        >
          {slices}
        </svg>
        <span className="rounded-xl border-2 border-slate-900 bg-emerald-100 px-3 py-0.5 font-mono text-[11px] font-black text-emerald-950 shadow-tactile-sm">
          {circleBadge}
        </span>
      </div>
    );
  }

  // Rectangle Strip Shape
  const stripBadge =
    languageMode === "EN"
      ? "Fraction Strip"
      : languageMode === "DWIBAHASA"
      ? "Jalur Pecahan / Fraction Strip"
      : "Jalur Pecahan";

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-lg">
      <div className="flex w-full h-14 sm:h-16 rounded-2xl border-3 border-slate-900 overflow-hidden shadow-tactile">
        {Array.from({ length: denominator }).map((_, idx) => (
          <div
            key={idx}
            className={`flex-1 border-r-3 border-slate-900 last:border-r-0 ${
              idx < numerator ? "bg-emerald-400" : "bg-white"
            }`}
          />
        ))}
      </div>
      <span className="rounded-xl border-2 border-slate-900 bg-emerald-100 px-3 py-0.5 font-mono text-[11px] font-black text-emerald-950 shadow-tactile-sm">
        {stripBadge}
      </span>
    </div>
  );
}

// ─── 9. FRACTION COMPARISON BARS ────────────────────────────────────
function FractionComparisonFigure({ data, languageMode = "BM" }) {
  const { fraction1 = { n: 1, d: 2 }, fraction2 = { n: 2, d: 4 } } = data;

  const lbl1 = languageMode === "EN" ? "Fraction 1" : languageMode === "DWIBAHASA" ? "Pecahan 1 / Frac 1" : "Pecahan 1";
  const lbl2 = languageMode === "EN" ? "Fraction 2" : languageMode === "DWIBAHASA" ? "Pecahan 2 / Frac 2" : "Pecahan 2";

  const footnote =
    languageMode === "EN"
      ? "Fraction Comparison"
      : languageMode === "DWIBAHASA"
      ? "Perbandingan Pecahan / Comparison"
      : "Perbandingan Pecahan Wajar";

  return (
    <div className="flex flex-col items-center gap-2.5 w-full max-w-lg">
      <div className="w-full">
        <div className="mb-1 text-xs sm:text-sm font-black text-slate-800 font-mono">{lbl1}: {fraction1.n}/{fraction1.d}</div>
        <div className="flex w-full h-10 sm:h-11 rounded-xl border-3 border-slate-900 overflow-hidden shadow-tactile-sm">
          {Array.from({ length: fraction1.d }).map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 border-r-2 border-slate-900 last:border-r-0 ${
                idx < fraction1.n ? "bg-sky-400" : "bg-white"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="w-full">
        <div className="mb-1 text-xs sm:text-sm font-black text-slate-800 font-mono">{lbl2}: {fraction2.n}/{fraction2.d}</div>
        <div className="flex w-full h-10 sm:h-11 rounded-xl border-3 border-slate-900 overflow-hidden shadow-tactile-sm">
          {Array.from({ length: fraction2.d }).map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 border-r-2 border-slate-900 last:border-r-0 ${
                idx < fraction2.n ? "bg-emerald-400" : "bg-white"
              }`}
            />
          ))}
        </div>
      </div>
      <span className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-700 shadow-tactile-sm">
        {footnote}
      </span>
    </div>
  );
}

// ─── 10. HUNDRED GRID (PETAK SERATUS 10x10 - NO ANSWER LEAKS) ───────
function HundredGridFigure({ data, languageMode = "BM" }) {
  const { shaded = 50 } = data;

  const caption =
    languageMode === "EN"
      ? `Hundred Grid (10×10) • ${shaded} Shaded Squares`
      : languageMode === "DWIBAHASA"
      ? `Petak Seratus (10×10) • ${shaded} Berlorek / Shaded`
      : `Petak Seratus (10×10) • ${shaded} Petak Berlorek`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="grid grid-cols-10 grid-rows-10 h-36 w-36 sm:h-40 sm:w-40 rounded-2xl border-3 border-slate-900 bg-white p-1 shadow-tactile">
        {Array.from({ length: 100 }).map((_, idx) => (
          <div
            key={idx}
            className={`border-[0.5px] border-slate-900/50 ${
              idx < shaded ? "bg-amber-400" : "bg-white"
            }`}
          />
        ))}
      </div>
      {/* Anti-spoiler: do NOT display decimal / percentage equation */}
      <div className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
        {caption}
      </div>
    </div>
  );
}

// ─── 11. MALAYSIAN MONEY TRAY (WANG RM & SEN - NO LEAKS) ────────────
function MoneyTrayFigure({ data, languageMode = "BM" }) {
  const { notes = [], coins = [], receipt, financialConcept, aseanCountry, currency } = data;

  if (financialConcept) {
    const conceptTag =
      languageMode === "EN"
        ? "KSSR Financial Concept"
        : languageMode === "DWIBAHASA"
        ? "Konsep Kewangan / Financial Concept"
        : "Konsep Kewangan KSSR";
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border-3 border-slate-900 bg-amber-100 p-6 shadow-tactile">
        <span className="text-xs font-black uppercase text-amber-900 font-mono tracking-wider">{conceptTag}</span>
        <span className="text-3xl font-black text-slate-900">{financialConcept.bm}</span>
        <span className="text-sm font-bold text-slate-600 italic">({financialConcept.en})</span>
      </div>
    );
  }

  if (aseanCountry) {
    const aseanTag =
      languageMode === "EN" ? "ASEAN Currencies" : languageMode === "DWIBAHASA" ? "Mata Wang ASEAN / Currencies" : "Mata Wang Negara ASEAN";
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-3 border-slate-900 bg-sky-100 p-6 shadow-tactile">
        <span className="text-xs font-black uppercase text-sky-900 font-mono tracking-wider">{aseanTag}</span>
        <span className="text-3xl sm:text-4xl font-black text-slate-900">{aseanCountry}</span>
        <span className="rounded-xl border-2 border-slate-900 bg-white px-4 py-1.5 text-lg font-black text-emerald-800 shadow-tactile-sm">
          {currency}
        </span>
      </div>
    );
  }

  if (receipt && Array.isArray(receipt)) {
    const isStationery = data.receiptType === "stationery";
    const rcptTitle = isStationery
      ? languageMode === "EN"
        ? "🧾 STATIONERY RECEIPT"
        : languageMode === "DWIBAHASA"
        ? "🧾 RESIT ALAT TULIS / STATIONERY RECEIPT"
        : "🧾 RESIT ALAT TULIS"
      : languageMode === "EN"
      ? "🧾 STORE RECEIPT"
      : languageMode === "DWIBAHASA"
      ? "🧾 RESIT KEDAI / RECEIPT"
      : "🧾 RESIT KEDAI";
    const totalTag =
      languageMode === "EN" ? "TOTAL:" : languageMode === "DWIBAHASA" ? "JUMLAH / TOTAL:" : "JUMLAH:";

    return (
      <div className="w-full max-w-sm rounded-2xl border-3 border-slate-900 bg-white p-5 font-mono text-sm shadow-tactile">
        <div className="border-b-2 border-dashed border-slate-900 pb-2 text-center font-black text-base">
          {rcptTitle}
        </div>
        <div className="my-3 space-y-1.5">
          {receipt.map((item, idx) => (
            <div key={idx} className="flex justify-between">
              <span>{item.name}</span>
              <span className="font-bold">RM {item.price}</span>
            </div>
          ))}
        </div>
        {/* Anti-spoiler: Never print {totalRM}! Show RM [ ? ] mystery box */}
        <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-center font-black text-base">
          <span>{totalTag}</span>
          <span className="rounded-lg border-2 border-dashed border-amber-500 bg-amber-100 px-3 py-0.5 text-amber-900 font-mono">
            RM [ ? ]
          </span>
        </div>
      </div>
    );
  }

  const noteColorMap = {
    1: { bg: "bg-sky-500", border: "border-sky-800" },
    5: { bg: "bg-emerald-500", border: "border-emerald-800" },
    10: { bg: "bg-rose-500", border: "border-rose-800" },
    20: { bg: "bg-amber-500", border: "border-amber-800" },
    50: { bg: "bg-teal-600", border: "border-teal-900" },
    100: { bg: "bg-purple-600", border: "border-purple-900" },
  };

  const footnote =
    languageMode === "EN"
      ? "Malaysian Currency (Ringgit & Sen)"
      : languageMode === "DWIBAHASA"
      ? "Mata Wang Malaysia / Malaysian Currency"
      : "Mata Wang Malaysia (Ringgit & Sen)";

  return (
    <div className="flex flex-col items-center gap-2.5 max-w-full scale-90 sm:scale-100 origin-center">
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {notes.map((val, idx) => {
          const style = noteColorMap[val] || { bg: "bg-slate-500", border: "border-slate-800" };
          return (
            <div
              key={idx}
              className={`flex h-14 w-32 sm:h-16 sm:w-36 items-center justify-between rounded-xl border-3 border-slate-900 ${style.bg} text-white p-2.5 shadow-tactile`}
            >
              <div className="flex flex-col">
                <span className="text-[9px] font-black tracking-tight opacity-90 font-mono">BANK NEGARA</span>
                <span className="text-xs font-bold font-mono">RM</span>
              </div>
              <span className="font-mono text-3xl sm:text-4xl font-black drop-shadow">{val}</span>
            </div>
          );
        })}

        {coins.map((sen, idx) => (
          <div
            key={idx}
            className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-3 border-slate-900 bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 font-mono text-sm sm:text-base font-black text-amber-950 shadow-tactile"
          >
            {sen}¢
          </div>
        ))}
      </div>
      <span className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-700 shadow-tactile-sm">
        {footnote}
      </span>
    </div>
  );
}

// ─── 12. ANALOG CLOCK (MUKA JAM - 2.5x SIZE) ─────────────────────────
function AnalogClockFigure({ data, languageMode = "BM" }) {
  const { hour = 12, minute = 0, showQuarterShading = false, schedule } = data;

  if (schedule && Array.isArray(schedule)) {
    const schedTitle =
      languageMode === "EN" ? "DAILY SCHEDULE" : languageMode === "DWIBAHASA" ? "JADUAL HARIAN / SCHEDULE" : "JADUAL AKTIVITI HARIAN";
    return (
      <div className="w-full max-w-sm rounded-2xl border-3 border-slate-900 bg-white p-4 shadow-tactile">
        <div className="border-b-2 border-slate-900 pb-2 text-center font-black text-sm">
          {schedTitle}
        </div>
        <div className="mt-3 space-y-2">
          {schedule.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-xl border border-slate-900 bg-[#FAF6EE] p-2.5 text-xs font-black"
            >
              <span>{languageMode === "EN" ? (item.activityEN || item.activityBM) : item.activityBM}</span>
              <span className="font-mono text-sky-800">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const size = 250;
  const center = size / 2;
  const radius = 108;

  const minuteAngle = minute * 6;
  const hourAngle = ((hour % 12) + minute / 60) * 30;

  const footnote =
    languageMode === "EN"
      ? "Short Hand: Hour • Long Hand: Minute"
      : languageMode === "DWIBAHASA"
      ? "Jarum Pendek: Jam (Hr) • Jarum Panjang: Minit (Min)"
      : "Jarum Pendek: Jam • Jarum Panjang: Minit";

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-xs">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full overflow-visible drop-shadow-md"
      >
        <circle cx={center} cy={center} r={radius} fill="#FFFFFF" stroke="#0F172A" strokeWidth="5" />
        <circle cx={center} cy={center} r={radius - 6} fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1" />

        {showQuarterShading && minute > 0 && (
          <path
            d={`M ${center} ${center} L ${center} ${center - radius + 14} A ${radius - 14} ${radius - 14} 0 ${
              minute > 30 ? 1 : 0
            } 1 ${center + (radius - 14) * Math.sin((minuteAngle * Math.PI) / 180)} ${
              center - (radius - 14) * Math.cos((minuteAngle * Math.PI) / 180)
            } Z`}
            fill="#BAE6FD"
            opacity="0.6"
          />
        )}

        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => {
          const angle = (num * 30 - 90) * (Math.PI / 180);
          const x = center + (radius - 22) * Math.cos(angle);
          const y = center + (radius - 22) * Math.sin(angle);
          return (
            <text
              key={num}
              x={x}
              y={y + 6}
              textAnchor="middle"
              fontSize="16"
              fontWeight="900"
              fill="#0F172A"
              fontFamily="monospace"
            >
              {num}
            </text>
          );
        })}

        <line
          x1={center}
          y1={center}
          x2={center + 50 * Math.sin((hourAngle * Math.PI) / 180)}
          y2={center - 50 * Math.cos((hourAngle * Math.PI) / 180)}
          stroke="#0F172A"
          strokeWidth="6"
          strokeLinecap="round"
        />

        <line
          x1={center}
          y1={center}
          x2={center + 80 * Math.sin((minuteAngle * Math.PI) / 180)}
          y2={center - 80 * Math.cos((minuteAngle * Math.PI) / 180)}
          stroke="#0284C7"
          strokeWidth="4"
          strokeLinecap="round"
        />

        <circle cx={center} cy={center} r="6" fill="#EF4444" stroke="#0F172A" strokeWidth="2" />
      </svg>
      <div className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
        {footnote}
      </div>
    </div>
  );
}

// ─── 13. RULER & MEASURING SCALES (2.5x SIZE - NO LEAKS) ────────────
function RulerScaleFigure({ data, languageMode = "BM" }) {
  const { count, objectLength, apparatusType, value, maxScale = 1000, objectName, unit } = data;

  // 1. ANALOG WEIGHING SCALE (DIAL WITH READABLE NUMERIC TICKS)
  if (apparatusType === "weighing_scale") {
    const scaleMax = maxScale || (data.unit === "kg" ? 10 : 1000);
    const needleAngle = -90 + (value / scaleMax) * 360;
    const footnote =
      languageMode === "EN"
        ? `Weighing Scale (${data.unitEn || data.unit || "g"})`
        : languageMode === "DWIBAHASA"
        ? `Penimbang / Scale (${data.unit || "g"})`
        : `Penimbang Analog (${data.unit || "g"})`;

    const majorStep = scaleMax >= 100 ? 200 : 2;
    const numMajor = Math.floor(scaleMax / majorStep);

    return (
      <div className="flex flex-col items-center gap-2">
        <svg
          width="240"
          height="240"
          viewBox="0 0 240 240"
          preserveAspectRatio="xMidYMid meet"
          className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full overflow-visible"
        >
          {/* Bezel */}
          <circle cx="120" cy="120" r="105" fill="#FEF3C7" stroke="#0F172A" strokeWidth="5" />
          <circle cx="120" cy="120" r="95" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.5" />

          {/* Unit Label */}
          <text x="120" y="80" textAnchor="middle" fontSize="16" fontWeight="900" fill="#78350F" fontFamily="monospace">
            {data.unit || "g"}
          </text>

          {/* Graduation Ticks & Numeric Labels */}
          {Array.from({ length: numMajor }).map((_, i) => {
            const tickVal = i * majorStep;
            const tAngle = -90 + (tickVal / scaleMax) * 360;
            const rad = (tAngle * Math.PI) / 180;
            const x1 = 120 + 95 * Math.cos(rad);
            const y1 = 120 + 95 * Math.sin(rad);
            const x2 = 120 + 80 * Math.cos(rad);
            const y2 = 120 + 80 * Math.sin(rad);
            const tx = 120 + 64 * Math.cos(rad);
            const ty = 120 + 64 * Math.sin(rad) + 4;

            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0F172A" strokeWidth="2.5" />
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="900"
                  fontFamily="monospace"
                  fill="#1E293B"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* Needle (Points accurately to value) */}
          <line
            x1="120"
            y1="120"
            x2={120 + 74 * Math.cos((needleAngle * Math.PI) / 180)}
            y2={120 + 74 * Math.sin((needleAngle * Math.PI) / 180)}
            stroke="#EF4444"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="120" cy="120" r="7" fill="#0F172A" />
        </svg>
        <span className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
          {footnote}
        </span>
      </div>
    );
  }

  // 2. GRADUATED LITRE BEAKER (LITRE TICKS & MENISCUS)
  if (apparatusType === "beaker_litre") {
    const scaleMax = maxScale || 5;
    const fillHeight = Math.round((value / scaleMax) * 135);
    const footnote =
      languageMode === "EN"
        ? `Graduated Beaker (Litres - l)`
        : languageMode === "DWIBAHASA"
        ? `Bikar Bersenggat / Beaker (l)`
        : `Bikar Bersenggat (Liter - l)`;

    return (
      <div className="flex flex-col items-center gap-2">
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          preserveAspectRatio="xMidYMid meet"
          className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full overflow-visible"
        >
          {/* Beaker Outline */}
          <path
            d="M 50,30 L 50,185 Q 50,195 65,195 L 155,195 Q 170,195 170,185 L 170,30"
            fill="#F8FAFC"
            stroke="#0F172A"
            strokeWidth="4"
          />
          {/* Pouring Lip */}
          <path d="M 45,30 L 55,30" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />

          {/* Liquid Fill */}
          <rect
            x="54"
            y={192 - fillHeight}
            width="112"
            height={fillHeight}
            fill="#38BDF8"
            stroke="#0284C7"
            strokeWidth="2"
          />

          {/* Litre Graduation Ticks */}
          {Array.from({ length: scaleMax }).map((_, i) => {
            const litreMark = i + 1;
            const yPos = 192 - Math.round((litreMark / scaleMax) * 135);
            return (
              <g key={i}>
                <line x1="140" y1={yPos} x2="168" y2={yPos} stroke="#0F172A" strokeWidth="2.5" />
                <text
                  x="132"
                  y={yPos + 4}
                  textAnchor="end"
                  fontSize="12"
                  fontWeight="900"
                  fontFamily="monospace"
                  fill="#0F172A"
                >
                  {litreMark} l
                </text>
              </g>
            );
          })}
        </svg>
        <span className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
          {footnote}
        </span>
      </div>
    );
  }

  // 3. MEASURING CYLINDER (ML TICKS)
  if (apparatusType === "measuring_cylinder") {
    const fillPct = Math.min(90, Math.max(10, Math.round((value / (maxScale || 1000)) * 100)));
    const footnote =
      languageMode === "EN"
        ? `Measuring Cylinder (${data.unitEn || data.unit || "ml"})`
        : languageMode === "DWIBAHASA"
        ? `Silinder Penyukat / Cylinder (${data.unit || "ml"})`
        : `Silinder Penyukat (${data.unit || "ml"})`;

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative h-44 w-20 rounded-b-2xl border-4 border-slate-900 bg-white overflow-hidden shadow-tactile">
          <div
            style={{ height: `${fillPct}%` }}
            className="absolute bottom-0 w-full bg-sky-400 border-t-4 border-sky-600 transition-all"
          />
          <div className="absolute inset-0 flex flex-col justify-between py-3 pl-1.5">
            {[4, 3, 2, 1].map((t) => (
              <div key={t} className="w-5 border-b-2 border-slate-900 text-[9px] font-black text-slate-900 font-mono">
                {t * 250}
              </div>
            ))}
          </div>
        </div>
        <span className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
          {footnote}
        </span>
      </div>
    );
  }

  // 4. NON-STANDARD: STORYBOOK WITH ERASERS
  if (apparatusType === "book_erasers" || objectName === "buku" || unit === "pemadam") {
    const eraserCount = count || 10;
    const footnote =
      languageMode === "EN"
        ? "Count the erasers aligned along the storybook"
        : languageMode === "DWIBAHASA"
        ? "Kira pemadam di sepanjang buku / Count erasers"
        : "Kira bilangan pemadam di sepanjang buku cerita";

    return (
      <div className="flex flex-col items-center gap-3 w-full max-w-lg">
        {/* Storybook Rectangle */}
        <div className="h-16 w-full max-w-[360px] rounded-xl border-3 border-slate-900 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 flex items-center justify-center font-black font-mono text-base text-slate-900 shadow-tactile">
          📖 {languageMode === "EN" ? "STORYBOOK" : languageMode === "DWIBAHASA" ? "BUKU CERITA / STORYBOOK" : "BUKU CERITA"}
        </div>

        {/* Row of Equal Erasers End-to-End */}
        <div className="flex w-full max-w-[360px] items-center justify-between gap-1 mt-1">
          {Array.from({ length: eraserCount }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-9 rounded-md border-2 border-slate-900 bg-rose-200 flex items-center justify-center text-[10px] font-black text-rose-950 shadow-sm"
              title="Pemadam"
            >
              🧹
            </div>
          ))}
        </div>

        {/* Anti-spoiler footnote */}
        <span className="rounded-lg border border-slate-900 bg-white px-3 py-1 font-mono text-xs font-black text-slate-700 shadow-tactile-sm">
          {footnote}
        </span>
      </div>
    );
  }

  // 5. NON-STANDARD: PENCIL WITH PAPERCLIPS
  if (count) {
    const footnote =
      languageMode === "EN"
        ? "Count the paperclips for pencil length"
        : languageMode === "DWIBAHASA"
        ? "Kira bilangan klip kertas / Count paperclips"
        : "Kira bilangan klip kertas bagi panjang pensil";

    return (
      <div className="flex flex-col items-center gap-3 w-full max-w-lg">
        <div className="flex items-center gap-1 w-full justify-center">
          <div className="h-10 w-64 sm:w-80 rounded-l-lg border-3 border-slate-900 bg-amber-400 flex items-center justify-center text-sm font-black font-mono shadow-tactile-sm">
            {languageMode === "EN" ? "PENCIL" : languageMode === "DWIBAHASA" ? "PENSIL / PENCIL" : "PENSIL"}
          </div>
          <div className="h-0 w-0 border-y-[20px] border-y-transparent border-l-[24px] border-l-amber-700" />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="flex h-9 w-10 items-center justify-center rounded-lg border-2 border-slate-900 bg-sky-200 text-base font-bold shadow-tactile-sm"
            >
              📎
            </div>
          ))}
        </div>
        <span className="rounded-lg border border-slate-900 bg-white px-3 py-1 font-mono text-xs font-black text-slate-700 shadow-tactile-sm">
          {footnote}
        </span>
      </div>
    );
  }

  // 6. METRIC CM RULER (ALIGNED TO EXACT TICKS ON SCALE)
  const len = objectLength || 10;
  const scaleLimit = Math.max(20, maxScale || 20);
  const footnote =
    languageMode === "EN"
      ? "Centimeter Ruler (cm)"
      : languageMode === "DWIBAHASA"
      ? "Pembaris Sentimeter / Ruler (cm)"
      : "Pembaris Sentimeter (cm)";

  const rulerWidth = 380;
  const startX = 30;
  const stepPx = rulerWidth / scaleLimit;
  const objectWidthPx = len * stepPx;

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-lg">
      <svg
        width="440"
        height="95"
        viewBox="0 0 440 95"
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block h-auto max-h-24 sm:max-h-28 w-auto max-w-full overflow-visible"
      >
        {/* Measured Object (Starts at 0 tick, ends at len tick) */}
        <rect
          x={startX}
          y="10"
          width={objectWidthPx}
          height="28"
          rx="5"
          fill="#F43F5E"
          stroke="#0F172A"
          strokeWidth="3"
        />

        {/* Ruler Body */}
        <rect
          x={startX}
          y="45"
          width={rulerWidth}
          height="45"
          rx="6"
          fill="#FEF3C7"
          stroke="#0F172A"
          strokeWidth="3.5"
        />

        {/* Graduation Ticks on Ruler */}
        {Array.from({ length: scaleLimit + 1 }).map((_, i) => {
          const x = startX + i * stepPx;
          const isMajor = i % 5 === 0;
          return (
            <g key={i}>
              <line
                x1={x}
                y1="45"
                x2={x}
                y2={isMajor ? 66 : 56}
                stroke="#0F172A"
                strokeWidth={isMajor ? 2.5 : 1.5}
              />
              {isMajor && (
                <text
                  x={x}
                  y="80"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="900"
                  fontFamily="monospace"
                  fill="#0F172A"
                >
                  {i}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <span className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-700 shadow-tactile-sm">
        {footnote}
      </span>
    </div>
  );
}

// ─── 14. GEOMETRY 2D & 3D (TRUE 3D ISOMETRIC FIGURES & 2D POLYGONS) ──
function GeometryFigure({ data, languageMode = "BM" }) {
  const {
    shapeName = "Kubus",
    shapeBm,
    shapeEn,
    sides = 4,
    showSymmetryLines = false,
    dimension = "2D",
    hideNameInCaption = false,
  } = data;

  const shapeStr = (shapeBm || shapeName || "").toLowerCase();

  // ── 3D Net ──
  if (dimension === "3D_NET") {
    const netTitle =
      languageMode === "EN"
        ? `3D Net: ${shapeEn || shapeName}`
        : languageMode === "DWIBAHASA"
        ? `Bentangan 3D: ${shapeBm || shapeName} / ${shapeEn || shapeName}`
        : `Bentangan 3D: ${shapeBm || shapeName}`;

    return (
      <div className="flex flex-col items-center gap-2">
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          preserveAspectRatio="xMidYMid meet"
          className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full border-2 border-dashed border-slate-900 bg-white p-2 rounded-2xl shadow-tactile-sm"
        >
          <rect x="75" y="10" width="45" height="45" fill="#BAE6FD" stroke="#0F172A" strokeWidth="2.5" />
          <rect x="30" y="55" width="45" height="45" fill="#BAE6FD" stroke="#0F172A" strokeWidth="2.5" />
          <rect x="75" y="55" width="45" height="45" fill="#38BDF8" stroke="#0F172A" strokeWidth="2.5" />
          <rect x="120" y="55" width="45" height="45" fill="#BAE6FD" stroke="#0F172A" strokeWidth="2.5" />
          <rect x="165" y="55" width="45" height="45" fill="#BAE6FD" stroke="#0F172A" strokeWidth="2.5" />
          <rect x="75" y="100" width="45" height="45" fill="#BAE6FD" stroke="#0F172A" strokeWidth="2.5" />
        </svg>
        <span className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
          {netTitle}
        </span>
      </div>
    );
  }

  // ── 3D Solids (True 3D Isometric Projection with Depth, Hidden Dashed Edges & Vertices) ──
  if (dimension === "3D") {
    const isPyramid = shapeStr.includes("piramid") || shapeStr.includes("pyramid");
    const isCube = shapeStr.includes("kubus") || shapeStr.includes("cube");
    const isCuboid = shapeStr.includes("kuboid") || shapeStr.includes("cuboid");
    const isCylinder = shapeStr.includes("silinder") || shapeStr.includes("cylinder");
    const isCone = shapeStr.includes("kon") || shapeStr.includes("cone");
    const isSphere = shapeStr.includes("sfera") || shapeStr.includes("sphere");
    const isPrism = shapeStr.includes("prisma") || shapeStr.includes("prism");

    const badgeLabel = hideNameInCaption
      ? languageMode === "EN"
        ? "3D Shape"
        : languageMode === "DWIBAHASA"
        ? "Bentuk 3D / 3D Shape"
        : "Bentuk 3D"
      : languageMode === "EN"
      ? `3D Shape: ${shapeEn || shapeName}`
      : languageMode === "DWIBAHASA"
      ? `Bentuk 3D: ${shapeBm || shapeName} / ${shapeEn || shapeName}`
      : `Bentuk 3D: ${shapeBm || shapeName}`;

    // 1. KUBUS / CUBE
    if (isCube) {
      return (
        <div className="flex flex-col items-center gap-2">
          <svg
            width="240"
            height="220"
            viewBox="0 0 240 220"
            preserveAspectRatio="xMidYMid meet"
            className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full overflow-visible"
          >
            {/* Hidden back interior edges (dashed) */}
            <line x1="120" y1="110" x2="120" y2="40" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="5,4" />
            <line x1="120" y1="110" x2="60" y2="145" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="5,4" />
            <line x1="120" y1="110" x2="180" y2="145" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="5,4" />

            {/* Left face */}
            <polygon points="60,75 120,110 120,180 60,145" fill="#93C5FD" stroke="#0F172A" strokeWidth="3.5" />
            {/* Right face */}
            <polygon points="120,110 180,75 180,145 120,180" fill="#60A5FA" stroke="#0F172A" strokeWidth="3.5" />
            {/* Top face */}
            <polygon points="120,40 180,75 120,110 60,75" fill="#BAE6FD" stroke="#0F172A" strokeWidth="3.5" />

            {/* Vertices marked with golden dots */}
            <circle cx="120" cy="40" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="180" cy="75" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="60" cy="75" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="120" cy="110" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="60" cy="145" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="180" cy="145" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="120" cy="180" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
          </svg>
          <div className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
            {badgeLabel}
          </div>
        </div>
      );
    }

    // 2. KUBOID / CUBOID
    if (isCuboid) {
      return (
        <div className="flex flex-col items-center gap-2">
          <svg
            width="250"
            height="220"
            viewBox="0 0 250 220"
            preserveAspectRatio="xMidYMid meet"
            className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full overflow-visible"
          >
            {/* Hidden back interior edges (dashed) */}
            <line x1="125" y1="115" x2="125" y2="35" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="5,4" />
            <line x1="125" y1="115" x2="45" y2="150" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="5,4" />
            <line x1="125" y1="115" x2="205" y2="150" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="5,4" />

            {/* Left face */}
            <polygon points="45,70 125,105 125,185 45,150" fill="#A7F3D0" stroke="#0F172A" strokeWidth="3.5" />
            {/* Right face */}
            <polygon points="125,105 205,70 205,150 125,185" fill="#34D399" stroke="#0F172A" strokeWidth="3.5" />
            {/* Top face */}
            <polygon points="125,35 205,70 125,105 45,70" fill="#D1FAE5" stroke="#0F172A" strokeWidth="3.5" />

            {/* Vertices marked with golden dots */}
            <circle cx="125" cy="35" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="205" cy="70" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="45" cy="70" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="125" cy="105" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="45" cy="150" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="205" cy="150" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="125" cy="185" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
          </svg>
          <div className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
            {badgeLabel}
          </div>
        </div>
      );
    }

    // 3. PIRAMID SEGI EMPAT / SQUARE PYRAMID
    if (isPyramid) {
      return (
        <div className="flex flex-col items-center gap-2">
          <svg
            width="240"
            height="220"
            viewBox="0 0 240 220"
            preserveAspectRatio="xMidYMid meet"
            className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full overflow-visible"
          >
            {/* Hidden back base edges & apex link (dashed) */}
            <line x1="120" y1="125" x2="120" y2="35" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="5,4" />
            <line x1="120" y1="125" x2="45" y2="155" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="5,4" />
            <line x1="120" y1="125" x2="195" y2="155" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="5,4" />

            {/* Left visible triangular face */}
            <polygon points="120,35 45,155 120,185" fill="#93C5FD" stroke="#0F172A" strokeWidth="3.5" />
            {/* Right visible triangular face */}
            <polygon points="120,35 120,185 195,155" fill="#60A5FA" stroke="#0F172A" strokeWidth="3.5" />

            {/* Vertices marked with golden dots (5 vertices in total) */}
            <circle cx="120" cy="35" r="5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="45" cy="155" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="120" cy="185" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="195" cy="155" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="120" cy="125" r="4" fill="#94A3B8" stroke="#0F172A" strokeWidth="1.5" />
          </svg>
          <div className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
            {badgeLabel}
          </div>
        </div>
      );
    }

    // 4. SILINDER / CYLINDER
    if (isCylinder) {
      return (
        <div className="flex flex-col items-center gap-2">
          <svg
            width="240"
            height="220"
            viewBox="0 0 240 220"
            preserveAspectRatio="xMidYMid meet"
            className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full overflow-visible"
          >
            {/* Shaded Body */}
            <path
              d="M 60,60 L 60,160 A 60 22 0 0 0 180,160 L 180,60 Z"
              fill="#7DD3FC"
              stroke="#0F172A"
              strokeWidth="3.5"
            />
            {/* Bottom Back Curve (Hidden dashed) */}
            <path
              d="M 60,160 A 60 22 0 0 1 180,160"
              fill="none"
              stroke="#64748B"
              strokeWidth="2.5"
              strokeDasharray="5,4"
            />
            {/* Top Flat Elliptical Face */}
            <ellipse cx="120" cy="60" rx="60" ry="22" fill="#BAE6FD" stroke="#0F172A" strokeWidth="3.5" />
          </svg>
          <div className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
            {badgeLabel}
          </div>
        </div>
      );
    }

    // 5. KON / CONE
    if (isCone) {
      return (
        <div className="flex flex-col items-center gap-2">
          <svg
            width="240"
            height="220"
            viewBox="0 0 240 220"
            preserveAspectRatio="xMidYMid meet"
            className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full overflow-visible"
          >
            {/* Shaded Body */}
            <path
              d="M 120,35 L 55,165 A 65 24 0 0 0 185,165 Z"
              fill="#FED7AA"
              stroke="#0F172A"
              strokeWidth="3.5"
            />
            {/* Bottom Back Curve (Hidden dashed) */}
            <path
              d="M 55,165 A 65 24 0 0 1 185,165"
              fill="none"
              stroke="#64748B"
              strokeWidth="2.5"
              strokeDasharray="5,4"
            />
            {/* Apex Vertex Dot */}
            <circle cx="120" cy="35" r="5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
          </svg>
          <div className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
            {badgeLabel}
          </div>
        </div>
      );
    }

    // 6. SFERA / SPHERE
    if (isSphere) {
      return (
        <div className="flex flex-col items-center gap-2">
          <svg
            width="240"
            height="220"
            viewBox="0 0 240 220"
            preserveAspectRatio="xMidYMid meet"
            className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full overflow-visible"
          >
            {/* Main Outer Circle */}
            <circle cx="120" cy="110" r="75" fill="#FEF08A" stroke="#0F172A" strokeWidth="3.5" />
            {/* Equator Front Curve */}
            <path
              d="M 45,110 A 75 22 0 0 0 195,110"
              fill="none"
              stroke="#D97706"
              strokeWidth="2.5"
            />
            {/* Equator Back Curve (Hidden dashed) */}
            <path
              d="M 45,110 A 75 22 0 0 1 195,110"
              fill="none"
              stroke="#D97706"
              strokeWidth="2"
              strokeDasharray="5,4"
            />
          </svg>
          <div className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
            {badgeLabel}
          </div>
        </div>
      );
    }

    // 7. PRISMA SEGI TIGA / TRIANGULAR PRISM
    if (isPrism) {
      return (
        <div className="flex flex-col items-center gap-2">
          <svg
            width="240"
            height="220"
            viewBox="0 0 240 220"
            preserveAspectRatio="xMidYMid meet"
            className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full overflow-visible"
          >
            {/* Hidden back edges */}
            <line x1="115" y1="130" x2="60" y2="175" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="5,4" />
            <line x1="115" y1="130" x2="150" y2="70" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="5,4" />
            <line x1="115" y1="130" x2="185" y2="130" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="5,4" />

            {/* Front triangular face */}
            <polygon points="60,175 130,175 95,115" fill="#DDD6FE" stroke="#0F172A" strokeWidth="3.5" />
            {/* Top-Right connecting rectangle */}
            <polygon points="95,115 150,70 185,130 130,175" fill="#C4B5FD" stroke="#0F172A" strokeWidth="3.5" />

            {/* Vertices marked with golden dots (6 vertices) */}
            <circle cx="60" cy="175" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="130" cy="175" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="95" cy="115" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="150" cy="70" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="185" cy="130" r="4.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2" />
            <circle cx="115" cy="130" r="4" fill="#94A3B8" stroke="#0F172A" strokeWidth="1.5" />
          </svg>
          <div className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
            {badgeLabel}
          </div>
        </div>
      );
    }
  }

  // ── 2D Polygons (Authentic flat 2D shapes with optional symmetry lines) ──
  const isCircle = shapeStr.includes("bulatan") || shapeStr.includes("circle") || sides === 0;
  const isTriangle = sides === 3 || shapeStr.includes("segi tiga") || shapeStr.includes("triangle");
  const isRectangle = shapeStr.includes("tepat") || shapeStr.includes("rectangle");
  const isSquare = sides === 4 && !isRectangle;
  const isPentagon = sides === 5 || shapeStr.includes("pentagon");
  const isHexagon = sides === 6 || shapeStr.includes("heksagon") || shapeStr.includes("hexagon");
  const isHeptagon = sides === 7 || shapeStr.includes("heptagon");
  const isOctagon = sides === 8 || shapeStr.includes("oktagon") || shapeStr.includes("octagon");

  const badge2D = hideNameInCaption
    ? languageMode === "EN"
      ? "2D Shape"
      : languageMode === "DWIBAHASA"
      ? "Bentuk 2D / 2D Shape"
      : "Bentuk 2D"
    : languageMode === "EN"
    ? `2D Shape: ${shapeEn || shapeName}`
    : languageMode === "DWIBAHASA"
    ? `Bentuk 2D: ${shapeBm || shapeName} / ${shapeEn || shapeName}`
    : `Bentuk 2D: ${shapeBm || shapeName}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width="220"
        height="220"
        viewBox="0 0 220 220"
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full overflow-visible"
      >
        {isCircle ? (
          <circle cx="110" cy="110" r="80" fill="#FDE68A" stroke="#0F172A" strokeWidth="4" />
        ) : isTriangle ? (
          <polygon points="110,25 25,185 195,185" fill="#FED7AA" stroke="#0F172A" strokeWidth="4" />
        ) : isRectangle ? (
          <rect x="25" y="55" width="170" height="110" rx="6" fill="#BAE6FD" stroke="#0F172A" strokeWidth="4" />
        ) : isSquare ? (
          <rect x="35" y="35" width="150" height="150" rx="6" fill="#BAE6FD" stroke="#0F172A" strokeWidth="4" />
        ) : isPentagon ? (
          <polygon points="110,20 195,85 165,185 55,185 25,85" fill="#BBF7D0" stroke="#0F172A" strokeWidth="4" />
        ) : isHexagon ? (
          <polygon points="110,20 185,65 185,155 110,200 35,155 35,65" fill="#DDD6FE" stroke="#0F172A" strokeWidth="4" />
        ) : isHeptagon ? (
          <polygon points="110,20 178,55 195,130 148,190 72,190 25,130 42,55" fill="#FBCFE8" stroke="#0F172A" strokeWidth="4" />
        ) : isOctagon ? (
          <polygon points="75,25 145,25 195,75 195,145 145,195 75,195 25,145 25,75" fill="#FECDD3" stroke="#0F172A" strokeWidth="4" />
        ) : (
          <rect x="35" y="35" width="150" height="150" rx="6" fill="#BAE6FD" stroke="#0F172A" strokeWidth="4" />
        )}

        {/* Dashed Symmetry Line if requested */}
        {showSymmetryLines && (
          <line x1="110" y1="10" x2="110" y2="210" stroke="#EF4444" strokeWidth="3" strokeDasharray="5,4" />
        )}
      </svg>
      {/* Anti-spoiler: do NOT print sides or symmetry count in badge */}
      <div className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
        {badge2D}
      </div>
    </div>
  );
}

// ─── 15. COORDINATE GRID (KOORDINAT SUKU PERTAMA - 2.5x SIZE) ───────
function CoordinateGridFigure({ data, languageMode = "BM" }) {
  const { items = [] } = data;
  const size = 260;
  const padding = 35;
  const gridCells = 5;
  const step = (size - padding * 2) / gridCells;

  const footnote =
    languageMode === "EN"
      ? "Coordinate Grid (Horizontal: Column • Vertical: Row)"
      : languageMode === "DWIBAHASA"
      ? "Satah Koordinat / Coordinate Grid"
      : "Satah Koordinat (Paksi Mengufuk: Lajur • Paksi Mencancang: Baris)";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full overflow-visible rounded-2xl border-3 border-slate-900 bg-white p-2 shadow-tactile"
      >
        {Array.from({ length: gridCells + 1 }).map((_, i) => (
          <g key={i}>
            <line
              x1={padding}
              y1={padding + i * step}
              x2={size - padding}
              y2={padding + i * step}
              stroke="#E2E8F0"
              strokeWidth="1.5"
            />
            <line
              x1={padding + i * step}
              y1={padding}
              x2={padding + i * step}
              y2={size - padding}
              stroke="#E2E8F0"
              strokeWidth="1.5"
            />
            <text x={padding + i * step} y={size - padding + 16} textAnchor="middle" fontSize="11" fontWeight="900" fill="#0F172A">
              {i}
            </text>
            <text x={padding - 12} y={size - padding - i * step + 4} textAnchor="middle" fontSize="11" fontWeight="900" fill="#0F172A">
              {i}
            </text>
          </g>
        ))}

        <line x1={padding} y1={padding} x2={padding} y2={size - padding} stroke="#0F172A" strokeWidth="3" />
        <line x1={padding} y1={size - padding} x2={size - padding} y2={size - padding} stroke="#0F172A" strokeWidth="3" />

        {items.map((it, idx) => {
          const x = padding + it.x * step;
          const y = size - padding - it.y * step;
          return (
            <text key={idx} x={x} y={y + 6} textAnchor="middle" fontSize="24">
              {it.emoji || "⭐"}
            </text>
          );
        })}
      </svg>
      <span className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
        {footnote}
      </span>
    </div>
  );
}

// ─── 16. DATA CHART (GUNDAL, PIKTOGRAF, CARTA PALANG, CARTA PAI) ────

function SvgTallyBundle({ stroke = "#0284C7" }) {
  return (
    <svg width="68" height="52" viewBox="0 0 68 52" className="inline-block mx-1 drop-shadow-sm">
      <line x1="12" y1="8" x2="12" y2="44" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <line x1="24" y1="8" x2="24" y2="44" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <line x1="36" y1="8" x2="36" y2="44" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <line x1="48" y1="8" x2="48" y2="44" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <line x1="4" y1="42" x2="56" y2="10" stroke="#DC2626" strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  );
}

function SvgTallySingle({ count = 1, stroke = "#0284C7" }) {
  const width = count * 16 + 14;
  return (
    <svg width={width} height="52" viewBox={`0 0 ${width} 52`} className="inline-block mx-1">
      {Array.from({ length: count }).map((_, i) => (
        <line
          key={i}
          x1={10 + i * 16}
          y1="8"
          x2={10 + i * 16}
          y2="44"
          stroke={stroke}
          strokeWidth="5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function DataChartFigure({ data, languageMode = "BM" }) {
  const { chartType = "BAR_CHART", items = [], symbolValue = 1 } = data;

  // 1. TALLY CHART (ZERO ANSWER LEAKS: completely remove ({count}))
  if (chartType === "TALLY") {
    const chartTitle =
      languageMode === "EN" ? "📋 TALLY CHART" : languageMode === "DWIBAHASA" ? "📋 JADUAL GUNDAL (TALLY CHART)" : "📋 JADUAL GUNDAL";
    const legendText =
      languageMode === "EN"
        ? "= 1 Tally Bundle (Value 5)"
        : languageMode === "DWIBAHASA"
        ? "= 1 Kumpulan Gundal / 1 Tally Bundle (5)"
        : "= 1 Kumpulan Gundal (Nilai 5)";

    return (
      <div className="w-full max-w-xl rounded-2xl border-3 border-slate-900 bg-white p-5 sm:p-6 shadow-tactile">
        <div className="border-b-3 border-slate-900 pb-2 text-center text-sm sm:text-base font-black font-mono tracking-wider text-slate-900">
          {chartTitle}
        </div>
        <div className="mt-4 space-y-3">
          {items.map((it, idx) => {
            const count = it.count || 5;
            const fullFives = Math.floor(count / 5);
            const remainder = count % 5;
            const itemLabel = languageMode === "EN" ? (it.label_en || it.en || it.label_bm || it.bm) : (it.label_bm || it.bm);

            return (
              <div
                key={idx}
                className="flex items-center justify-between border-b-2 border-slate-100 pb-3"
              >
                <span className="text-base sm:text-lg font-black text-slate-900">
                  {itemLabel}
                </span>

                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-300">
                    {Array.from({ length: fullFives }).map((_, fIdx) => (
                      <SvgTallyBundle key={fIdx} stroke="#0284C7" />
                    ))}
                    {remainder > 0 && <SvgTallySingle count={remainder} stroke="#0284C7" />}
                  </div>
                  {/* Anti-spoiler: DO NOT display '({count})' which gave away the answer! */}
                </div>
              </div>
            );
          })}
        </div>

        {/* Explicit Visual Legend */}
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-amber-50 p-2.5 border-2 border-amber-300 text-xs font-black text-amber-950 font-mono">
          <SvgTallyBundle stroke="#0284C7" />
          <span>{legendText}</span>
        </div>
      </div>
    );
  }

  // 2. PICTOGRAPH
  if (chartType === "PICTOGRAPH") {
    const chartTitle =
      languageMode === "EN" ? "🎨 PICTOGRAPH" : languageMode === "DWIBAHASA" ? "🎨 PIKTOGRAF / PICTOGRAPH" : "🎨 PIKTOGRAF";
    const legendText =
      languageMode === "EN"
        ? `Key: 1 symbol represents ${symbolValue} unit${symbolValue > 1 ? "s" : ""}`
        : languageMode === "DWIBAHASA"
        ? `Petunjuk: 1 simbol mewakili ${symbolValue} unit / 1 symbol = ${symbolValue}`
        : `Petunjuk: 1 simbol mewakili ${symbolValue} unit`;

    return (
      <div className="w-full max-w-lg rounded-2xl border-3 border-slate-900 bg-white p-5 sm:p-6 shadow-tactile">
        <div className="border-b-3 border-slate-900 pb-2 text-center text-sm sm:text-base font-black font-mono">
          {chartTitle}
        </div>
        <div className="mt-4 space-y-3">
          {items.map((it, idx) => {
            const numSymbols = Math.max(1, Math.round((it.count || symbolValue) / symbolValue));
            const itemLabel = languageMode === "EN" ? (it.label_en || it.en || it.label_bm || it.bm) : (it.label_bm || it.bm);

            return (
              <div key={idx} className="flex items-center justify-between border-b-2 border-slate-100 pb-2.5">
                <span className="text-base font-black text-slate-800">{itemLabel}</span>
                <div className="flex gap-2 text-3xl sm:text-4xl">
                  {Array.from({ length: numSymbols }).map((_, sIdx) => (
                    <span key={sIdx}>{it.emoji || "🍎"}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 rounded-xl bg-amber-100 p-2.5 text-center text-xs sm:text-sm font-black text-amber-950 border-2 border-amber-400">
          {legendText}
        </div>
      </div>
    );
  }

  // 3. PIE CHART (Anti-spoiler for target sector)
  if (chartType === "PIE_CHART") {
    const chartTitle =
      languageMode === "EN" ? "🥧 PIE CHART" : languageMode === "DWIBAHASA" ? "🥧 CARTA PAI / PIE CHART" : "🥧 CARTA PAI";

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="text-center font-mono text-xs font-black text-slate-800">
          {chartTitle}
        </div>
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          preserveAspectRatio="xMidYMid meet"
          className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full overflow-visible drop-shadow"
        >
          <circle cx="110" cy="110" r="85" fill="#38BDF8" stroke="#0F172A" strokeWidth="4" />
          <path d="M 110 110 L 110 25 A 85 85 0 0 1 195 110 Z" fill="#34D399" stroke="#0F172A" strokeWidth="3" />
          <path d="M 110 110 L 195 110 A 85 85 0 0 1 110 195 Z" fill="#FBBF24" stroke="#0F172A" strokeWidth="3" />
        </svg>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {items.map((it, idx) => {
            const itemLabel = languageMode === "EN" ? (it.label_en || it.en || it.label_bm || it.bm) : (it.label_bm || it.bm);
            const valDisplay = (it.hidePercentage || it.percentage === "?") ? "[ ? ]%" : `${it.percentage}%`;

            return (
              <div key={idx} className="flex items-center gap-1.5 rounded-lg border border-slate-900 bg-white px-2 py-0.5 text-[11px] font-black">
                <span className={`h-2.5 w-2.5 rounded-full ${idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-sky-500" : "bg-amber-500"}`} />
                <span>{itemLabel}: {valDisplay}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 4. BAR CHART (RESPONSIVE SVG WITH SCALED BARS & SHARED ZERO BASELINE)
  const chartTitle =
    languageMode === "EN" ? "📊 BAR CHART" : languageMode === "DWIBAHASA" ? "📊 CARTA PALANG / BAR CHART" : "📊 CARTA PALANG";
  const maxVal = Math.max(...items.map((it) => it.count || 10), 10);
  const chartH = 140;
  const baselineY = 170;

  return (
    <div className="w-full max-w-lg rounded-2xl border-3 border-slate-900 bg-white p-3.5 sm:p-4 shadow-tactile">
      <div className="border-b-2 border-slate-900 pb-1.5 text-center text-xs sm:text-sm font-black font-mono">
        {chartTitle}
      </div>
      <div className="mt-2.5 w-full flex justify-center">
        <svg
          viewBox="0 0 360 215"
          preserveAspectRatio="xMidYMid meet"
          className="mx-auto block h-auto max-h-36 sm:max-h-40 w-auto max-w-full overflow-visible"
        >
          {/* Y Axis Gridlines & Values */}
          {[0, Math.round(maxVal / 2), maxVal].map((val, gIdx) => {
            const y = baselineY - Math.round((val / maxVal) * chartH);
            return (
              <g key={gIdx}>
                <line x1="38" y1={y} x2="340" y2={y} stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="3,3" />
                <text x="32" y={y + 4} textAnchor="end" fontSize="10" fontWeight="900" fontFamily="monospace" fill="#64748B">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line x1="40" y1="20" x2="40" y2={baselineY} stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
          <line x1="40" y1={baselineY} x2="345" y2={baselineY} stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />

          {/* Scaled Bars on Shared Baseline */}
          {items.map((it, idx) => {
            const count = it.count || 0;
            const barHeight = Math.max(10, Math.round((count / maxVal) * chartH));
            const barY = baselineY - barHeight;
            const slotWidth = 280 / (items.length || 1);
            const barWidth = Math.min(52, slotWidth * 0.65);
            const barX = 55 + idx * slotWidth + (slotWidth - barWidth) / 2;
            const itemLabel = languageMode === "EN" ? (it.label_en || it.en || it.label_bm || it.bm) : (it.label_bm || it.bm);
            const fillColors = ["#38BDF8", "#34D399", "#FBBF24", "#F472B6"];
            const fillColor = fillColors[idx % fillColors.length];

            return (
              <g key={idx}>
                {/* Bar */}
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx="5"
                  fill={fillColor}
                  stroke="#0F172A"
                  strokeWidth="2.5"
                />
                {/* Bar Value */}
                <text
                  x={barX + barWidth / 2}
                  y={barY - 6}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="900"
                  fontFamily="monospace"
                  fill="#0F172A"
                >
                  {count}
                </text>
                {/* Category Label */}
                <text
                  x={barX + barWidth / 2}
                  y={baselineY + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="800"
                  fill="#1E293B"
                >
                  {itemLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── 17. SHAPE PATTERN (POLA BENTUK 2D - REPEATING PATTERN) ──────────
function ShapePatternFigure({ data, languageMode = "BM" }) {
  const { pattern = ["triangle", "circle", "triangle", "circle"] } = data;

  const caption =
    languageMode === "EN"
      ? "Repeating Shape Pattern"
      : languageMode === "DWIBAHASA"
      ? "Pola Bentuk Berulang / Shape Pattern"
      : "Pola Bentuk Berulang";

  const renderSingleShape = (shapeKey, idx) => {
    switch (shapeKey) {
      case "triangle":
        return (
          <div key={idx} className="flex flex-col items-center gap-1.5">
            <svg width="55" height="55" viewBox="0 0 60 60">
              <polygon points="30,8 52,50 8,50" fill="#FED7AA" stroke="#0F172A" strokeWidth="3" strokeLinejoin="round" />
            </svg>
            <span className="text-[10px] font-bold text-slate-700">
              {languageMode === "EN" ? "Triangle" : "Segi Tiga"}
            </span>
          </div>
        );
      case "circle":
        return (
          <div key={idx} className="flex flex-col items-center gap-1.5">
            <svg width="55" height="55" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="22" fill="#FDE68A" stroke="#0F172A" strokeWidth="3" />
            </svg>
            <span className="text-[10px] font-bold text-slate-700">
              {languageMode === "EN" ? "Circle" : "Bulatan"}
            </span>
          </div>
        );
      case "square":
        return (
          <div key={idx} className="flex flex-col items-center gap-1.5">
            <svg width="55" height="55" viewBox="0 0 60 60">
              <rect x="9" y="9" width="42" height="42" rx="4" fill="#BAE6FD" stroke="#0F172A" strokeWidth="3" />
            </svg>
            <span className="text-[10px] font-bold text-slate-700">
              {languageMode === "EN" ? "Square" : "Segi Empat"}
            </span>
          </div>
        );
      case "star":
        return (
          <div key={idx} className="flex flex-col items-center gap-1.5">
            <svg width="55" height="55" viewBox="0 0 60 60">
              <polygon
                points="30,4 37,21 56,21 41,33 46,50 30,39 14,50 19,33 4,21 23,21"
                fill="#FDE047"
                stroke="#0F172A"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[10px] font-bold text-slate-700">
              {languageMode === "EN" ? "Star" : "Bintang"}
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xl">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-2xl border-3 border-slate-900 bg-white p-4 shadow-tactile">
        {pattern.map((shapeKey, idx) => (
          <div key={idx} className="flex items-center gap-2 sm:gap-3">
            {renderSingleShape(shapeKey, idx)}
            <span className="text-xl font-black text-slate-400">➔</span>
          </div>
        ))}
        {/* Missing item mystery box [ ? ] */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-[55px] w-[55px] rounded-xl border-3 border-dashed border-amber-600 bg-amber-100 flex items-center justify-center font-mono text-2xl font-black text-amber-900 shadow-sm">
            ?
          </div>
          <span className="text-[10px] font-bold text-amber-800">[ ? ]</span>
        </div>
      </div>
      <span className="rounded-lg border border-slate-900 bg-white px-3 py-1 font-mono text-xs font-black text-slate-700 shadow-tactile-sm">
        {caption}
      </span>
    </div>
  );
}

// ─── 17. CUSTOM UPLOADED IMAGE FIGURE ───────────────────────────────
function CustomImageFigure({ data, languageMode = "BM" }) {
  const { url, alt = "Question diagram", caption_bm, caption_en } = data;
  const caption =
    languageMode === "EN"
      ? caption_en || caption_bm
      : languageMode === "DWIBAHASA"
      ? caption_bm
        ? `${caption_bm} / ${caption_en || caption_bm}`
        : caption_en
      : caption_bm;

  if (!url) return null;

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-lg">
      <div className="overflow-hidden rounded-2xl border-3 border-slate-900 bg-white p-2 shadow-tactile w-full flex items-center justify-center">
        <img
          src={url}
          alt={alt}
          className="max-h-40 sm:max-h-44 max-w-full object-contain rounded-xl"
        />
      </div>
      {caption && (
        <span className="rounded-lg border border-slate-900 bg-white px-2.5 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-tactile-sm">
          {caption}
        </span>
      )}
    </div>
  );
}
