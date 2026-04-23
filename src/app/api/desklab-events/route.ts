import { NextResponse } from "next/server";

const eventsTableName = "desklab_events";
const allowedEventNames = new Set([
  "assessment_started",
  "question_answered",
  "assessment_completed",
  "product_clicked"
]);

type DeskLabEventPayload = {
  session_id?: unknown;
  event_name?: unknown;
  question_id?: unknown;
  answer_value?: unknown;
  score?: unknown;
  main_issue?: unknown;
  product_name?: unknown;
};

export const dynamic = "force-dynamic";

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function cleanEnvValue(value: string | undefined): string | undefined {
  const cleaned = value?.trim().replace(/^['"]|['"]$/g, "");
  return cleaned && cleaned.length > 0 ? cleaned : undefined;
}

function getSupabaseConfig() {
  const supabaseUrl = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY) ?? cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return { supabaseUrl, supabaseKey };
}

export async function POST(request: Request) {
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  if (!supabaseUrl || !supabaseKey) {
    console.error("[DeskLab tracking] Missing Supabase env in API route", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasSupabaseKey: Boolean(supabaseKey)
    });
    return NextResponse.json({ ok: false, error: "Supabase environment variables are missing" }, { status: 500 });
  }

  let payload: DeskLabEventPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  if (typeof payload.event_name !== "string" || !allowedEventNames.has(payload.event_name)) {
    return NextResponse.json({ ok: false, error: "Invalid event_name" }, { status: 400 });
  }

  if (typeof payload.session_id !== "string" || payload.session_id.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "Missing session_id" }, { status: 400 });
  }

  const eventBody = {
    session_id: payload.session_id,
    event_name: payload.event_name,
    question_id: toNullableString(payload.question_id),
    answer_value: toNullableString(payload.answer_value),
    score: toNullableNumber(payload.score),
    main_issue: toNullableString(payload.main_issue),
    product_name: toNullableString(payload.product_name)
  };

  const insertUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${eventsTableName}`;

  console.info("[DeskLab tracking] Inserting event via API route", {
    eventName: eventBody.event_name,
    table: eventsTableName,
    hasScore: eventBody.score !== null,
    hasProductName: eventBody.product_name !== null
  });

  const response = await fetch(insertUrl, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(eventBody),
    cache: "no-store"
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error("[DeskLab tracking] Supabase insert failed in API route", {
      status: response.status,
      statusText: response.statusText,
      error: responseText,
      table: eventsTableName
    });
    return NextResponse.json(
      { ok: false, error: "Supabase insert failed", details: responseText },
      { status: 502 }
    );
  }

  console.info("[DeskLab tracking] Supabase insert succeeded in API route", {
    eventName: eventBody.event_name,
    status: response.status,
    table: eventsTableName
  });

  return NextResponse.json({ ok: true, inserted: responseText ? JSON.parse(responseText) : null }, { status: 201 });
}
