// functions/api/sync.js
// Cloudflare Pages Function for local & production Cloudflare D1 SQLite database sync
// Provides dual endpoints (GET to load data, POST to persist changes to SQLite)
// Preserves lossless state via 'full_db_snapshot' in app_settings + relational table mirroring.

export async function onRequestGet({ env }) {
  if (!env || !env.DB) {
    return new Response(
      JSON.stringify({
        success: false,
        source: "LOCAL_FALLBACK",
        message: "Cloudflare D1 binding (DB) not found. Operating in local storage mode.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // 1. Attempt lossless full snapshot recovery from app_settings
    try {
      const { results: snapshotRows } = await env.DB.prepare(
        "SELECT value FROM app_settings WHERE key = 'full_db_snapshot'"
      ).all();

      if (snapshotRows && snapshotRows.length > 0 && snapshotRows[0].value) {
        const fullData = JSON.parse(snapshotRows[0].value);
        if (fullData && typeof fullData === "object" && Array.isArray(fullData.users)) {
          return new Response(
            JSON.stringify({
              success: true,
              source: "CLOUDFLARE_D1_SNAPSHOT",
              data: fullData,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }
    } catch {
      // Fall through to relational query
    }

    // 2. Relational fallback
    const { results: users } = await env.DB.prepare("SELECT * FROM users").all();
    const { results: progress } = await env.DB.prepare("SELECT * FROM topic_progress").all();
    const { results: attempts } = await env.DB.prepare("SELECT * FROM exam_attempts ORDER BY submitted_at DESC").all();
    const { results: papers } = await env.DB.prepare("SELECT * FROM exam_papers").all();
    const { results: customQuestions } = await env.DB.prepare("SELECT * FROM custom_questions").all();
    const { results: topicParts } = await env.DB.prepare("SELECT * FROM topic_parts").all();

    return new Response(
      JSON.stringify({
        success: true,
        source: "CLOUDFLARE_D1_SQLITE",
        data: {
          users: users || [],
          topicProgress: progress || [],
          examAttempts: attempts || [],
          examPapers: papers || [],
          customQuestions: customQuestions || [],
          topicParts: topicParts || [],
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function onRequestPost({ request, env }) {
  if (!env || !env.DB) {
    return new Response(
      JSON.stringify({
        success: false,
        source: "LOCAL_FALLBACK",
        message: "Cloudflare D1 binding (DB) not found. Saved in browser storage.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await request.json();
    const { action, payload } = body;

    if (action === "SYNC_ALL" && payload) {
      // 1. Persist lossless full JSON snapshot to app_settings
      try {
        await env.DB.prepare(
          `INSERT INTO app_settings (key, value)
           VALUES ('full_db_snapshot', ?)
           ON CONFLICT(key) DO UPDATE SET
             value = excluded.value,
             updated_at = CURRENT_TIMESTAMP`
        )
          .bind(JSON.stringify(payload))
          .run();
      } catch (e) {
        console.warn("Failed to write full_db_snapshot to app_settings:", e);
      }

      // 2. Mirror into relational users table
      if (Array.isArray(payload.users)) {
        for (const u of payload.users) {
          const pinVal = String(u.pin_code ?? u.pin ?? "").trim();
          await env.DB.prepare(
            `INSERT INTO users (id, name, role, avatar, pin_code, status, current_darjah, unlocked_darjah, year_access, reset_mode)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               avatar = excluded.avatar,
               pin_code = excluded.pin_code,
               status = excluded.status,
               current_darjah = excluded.current_darjah,
               unlocked_darjah = excluded.unlocked_darjah,
               year_access = excluded.year_access,
               reset_mode = excluded.reset_mode`
          )
            .bind(
              u.id,
              u.name,
              u.role || "STUDENT",
              u.avatar || "🦁",
              pinVal,
              u.status || "Active",
              Number(u.current_darjah || 1),
              JSON.stringify(u.unlocked_darjah || [1]),
              JSON.stringify(u.yearAccess || { 2: "AUTO", 3: "AUTO" }),
              u.reset_mode || "HARD_RESET"
            )
            .run();
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        source: "CLOUDFLARE_D1_SQLITE",
        message: "Successfully synchronized with Cloudflare D1 SQLite database.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
