import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type FeedbackRow = {
  id: string;
  source: string;
  category: string;
  details: string | null;
  exercise_id: string | null;
  snapshot_name: string | null;
  snapshot_description: string | null;
  snapshot_link: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
};

const EXERCISE_CATEGORY_LABELS: Record<string, string> = {
  wrong_description: "Wrong description",
  bad_link: "Broken or incorrect link",
  other: "Other",
};

const GENERAL_CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug",
  suggestion: "Suggestion",
  other: "Other",
};

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildExerciseSections(rows: FeedbackRow[]): string {
  const byExercise = new Map<string, FeedbackRow[]>();
  for (const row of rows) {
    const key = row.exercise_id ?? "_unknown";
    const list = byExercise.get(key) ?? [];
    list.push(row);
    byExercise.set(key, list);
  }

  const sections: string[] = [];
  for (const [, group] of byExercise) {
    const first = group[0];
    const title =
      first.snapshot_name ?? first.exercise_id ?? "Unknown exercise";
    const items = group
      .map((row) => {
        const cat = EXERCISE_CATEGORY_LABELS[row.category] ?? row.category;
        const detail = row.details?.trim()
          ? `<p style="margin:4px 0 0;color:#555">${escapeHtml(row.details.trim())}</p>`
          : "";
        const link = row.snapshot_link
          ? `<p style="margin:4px 0 0"><a href="${escapeHtml(row.snapshot_link)}">${escapeHtml(row.snapshot_link)}</a></p>`
          : "";
        return `<li style="margin-bottom:12px"><strong>${escapeHtml(cat)}</strong> <span style="color:#888">(${escapeHtml(row.source)} · ${escapeHtml(row.created_at)})</span>${detail}${link}</li>`;
      })
      .join("");
    sections.push(
      `<h3 style="margin:16px 0 8px">${escapeHtml(title)}</h3><ul style="padding-left:20px">${items}</ul>`,
    );
  }
  return sections.join("");
}

function buildGeneralSection(rows: FeedbackRow[]): string {
  if (rows.length === 0) return "";
  const items = rows
    .map((row) => {
      const cat = GENERAL_CATEGORY_LABELS[row.category] ?? row.category;
      const detail = row.details?.trim()
        ? `<p style="margin:4px 0 0;color:#333">${escapeHtml(row.details.trim())}</p>`
        : "";
      const route =
        typeof row.context?.route === "string"
          ? `<p style="margin:4px 0 0;color:#888">Route: ${escapeHtml(row.context.route)}</p>`
          : "";
      return `<li style="margin-bottom:12px"><strong>${escapeHtml(cat)}</strong> <span style="color:#888">(${escapeHtml(row.created_at)})</span>${detail}${route}</li>`;
    })
    .join("");
  return `<h2 style="margin:24px 0 12px">General feedback</h2><ul style="padding-left:20px">${items}</ul>`;
}

function buildDigestHtml(
  exerciseRows: FeedbackRow[],
  generalRows: FeedbackRow[],
): string {
  const total = exerciseRows.length + generalRows.length;
  const exerciseBlock =
    exerciseRows.length > 0
      ? `<h2 style="margin:0 0 12px">Exercise reports</h2>${buildExerciseSections(exerciseRows)}`
      : "";
  const generalBlock = buildGeneralSection(generalRows);

  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111"><h2>MyExercise feedback digest</h2><p>${total} new item(s) - ${exerciseRows.length} exercise, ${generalRows.length} general.</p>${exerciseBlock}${generalBlock}</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const adminEmail = Deno.env.get("ADMIN_REPORT_EMAIL");
  const fromEmail =
    Deno.env.get("FEEDBACK_FROM_EMAIL") ?? "feedback@resend.dev";

  if (!supabaseUrl || !serviceRoleKey || !resendKey || !adminEmail) {
    return new Response("Missing configuration", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: rows, error } = await supabase
    .from("user_feedback")
    .select(
      "id, source, category, details, exercise_id, snapshot_name, snapshot_description, snapshot_link, context, created_at",
    )
    .is("emailed_at", null)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("[feedback-digest] load", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const pending = (rows ?? []) as FeedbackRow[];
  if (pending.length === 0) {
    return new Response(JSON.stringify({ sent: false, count: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const exerciseRows = pending.filter(
    (r) => r.source === "exercise_row" || r.source === "library",
  );
  const generalRows = pending.filter((r) => r.source === "settings");

  const html = buildDigestHtml(exerciseRows, generalRows);
  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [adminEmail],
      subject: `MyExercise feedback digest (${pending.length})`,
      html,
    }),
  });

  if (!resendRes.ok) {
    const body = await resendRes.text();
    console.error("[feedback-digest] resend", resendRes.status, body);
    return new Response(JSON.stringify({ error: "Email send failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = new Date().toISOString();
  const ids = pending.map((r) => r.id);
  const { error: updateError } = await supabase
    .from("user_feedback")
    .update({ emailed_at: now })
    .in("id", ids);

  if (updateError) {
    console.error("[feedback-digest] mark emailed", updateError);
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      sent: true,
      count: pending.length,
      exercise: exerciseRows.length,
      general: generalRows.length,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
