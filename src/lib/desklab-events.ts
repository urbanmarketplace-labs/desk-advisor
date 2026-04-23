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
const eventsTableName = "desklab_events";

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `desklab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getSupabaseProjectInfo(supabaseUrl: string): { host: string; projectRef: string } {
  try {
    const host = new URL(supabaseUrl).host;
    return {
      host,
      projectRef: host.split(".")[0] ?? "unknown"
    };
  } catch {
    return {
      host: "invalid-url",
      projectRef: "unknown"
    };
  }
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

  console.debug("[DeskLab tracking] Event attempted", payload.event_name, payload);
  console.debug("[DeskLab tracking] Env check", {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasSupabaseAnonKey: Boolean(supabaseAnonKey)
  });

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[DeskLab tracking] Missing Supabase public environment variables", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasSupabaseAnonKey: Boolean(supabaseAnonKey)
    });
    return;
  }

  const projectInfo = getSupabaseProjectInfo(supabaseUrl);
  const insertUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${eventsTableName}`;
  const eventBody = {
    session_id: getDeskLabSessionId(),
    event_name: payload.event_name,
    question_id: payload.question_id ?? null,
    answer_value: payload.answer_value ?? null,
    score: payload.score ?? null,
    main_issue: payload.main_issue ?? null,
    product_name: payload.product_name ?? null
  };

  console.debug("[DeskLab tracking] Supabase target", {
    table: eventsTableName,
    host: projectInfo.host,
    projectRef: projectInfo.projectRef,
    url: insertUrl
  });
  console.debug("[DeskLab tracking] Insert payload", eventBody);

  void fetch(insertUrl, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(eventBody),
    keepalive: true
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unable to read Supabase error body");
        console.error("[DeskLab tracking] Supabase insert failed", {
          eventName: payload.event_name,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          table: eventsTableName,
          projectRef: projectInfo.projectRef
        });
        return;
      }

      console.debug("[DeskLab tracking] Supabase insert succeeded", {
        eventName: payload.event_name,
        status: response.status,
        table: eventsTableName,
        projectRef: projectInfo.projectRef
      });
    })
    .catch((error: unknown) => {
      console.error("[DeskLab tracking] Supabase insert request errored", {
        eventName: payload.event_name,
        error,
        table: eventsTableName,
        projectRef: projectInfo.projectRef
      });
    });
}
