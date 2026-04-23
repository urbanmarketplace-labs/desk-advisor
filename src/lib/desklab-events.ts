type DeskLabEventName =
  | "assessment_started"
  | "question_answered"
  | "assessment_completed"
  | "product_clicked";

interface DeskLabEventPayload {
  event_name: DeskLabEventName;
  question_id?: string;
  answer_value?: string;
  score?: number;
  main_issue?: string;
  product_name?: string;
}

const sessionStorageKey = "desklab_session_id";

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `desklab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function getDeskLabSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const existingSessionId = window.localStorage.getItem(sessionStorageKey);
  if (existingSessionId) {
    return existingSessionId;
  }

  const nextSessionId = createSessionId();
  window.localStorage.setItem(sessionStorageKey, nextSessionId);
  return nextSessionId;
}

export function trackDeskLabEvent(payload: DeskLabEventPayload): void {
  if (typeof window === "undefined") {
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return;
  }

  const eventBody = {
    session_id: getDeskLabSessionId(),
    event_name: payload.event_name,
    question_id: payload.question_id ?? null,
    answer_value: payload.answer_value ?? null,
    score: payload.score ?? null,
    main_issue: payload.main_issue ?? null,
    product_name: payload.product_name ?? null,
    created_at: new Date().toISOString()
  };

  void fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/desklab_events`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(eventBody),
    keepalive: true
  }).catch(() => {
    // Analytics must never interrupt the assessment flow.
  });
}
