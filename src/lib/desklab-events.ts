type DeskLabEventName =
  | "assessment_started"
  | "question_answered"
  | "assessment_completed"
  | "product_clicked"
  | "desklab_landing_view"
  | "instant_value_seen"
  | "quick_fixes_seen"
  | "check_started"
  | "check_completed"
  | "result_viewed"
  | "product_fix_clicked"
  | "back_to_store_clicked";

interface DeskLabEventPayload {
  event_name: DeskLabEventName;
  question_id?: string;
  answer_value?: string;
  score?: number;
  main_issue?: string;
  product_name?: string;
  result_category?: string;
}

const sessionStorageKey = "desklab_session_id";

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `desklab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getTrackingContext(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const source = new URLSearchParams(window.location.search).get("utm_source") ?? "direct";
  const referrer = document.referrer ? new URL(document.referrer).hostname : "none";
  return `source:${source} | referrer:${referrer}`;
}

function buildAnswerValue(payload: DeskLabEventPayload): string | null {
  if (payload.event_name === "question_answered") {
    return payload.answer_value ?? null;
  }

  const contextParts = [
    payload.answer_value ?? null,
    payload.result_category ? `category:${payload.result_category}` : null,
    getTrackingContext()
  ].filter(Boolean);

  return contextParts.length > 0 ? contextParts.join(" | ").slice(0, 720) : null;
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

  const eventBody = {
    session_id: getDeskLabSessionId(),
    event_name: payload.event_name,
    question_id: payload.question_id ?? null,
    answer_value: buildAnswerValue(payload),
    score: payload.score ?? null,
    main_issue: payload.main_issue ?? null,
    product_name: payload.product_name ?? null
  };

  void fetch("/api/desklab-events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(eventBody),
    keepalive: true
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unable to read tracking API error body");
        console.error("[DeskLab tracking] Event insert failed", {
          eventName: payload.event_name,
          status: response.status,
          error: errorText
        });
      }
    })
    .catch((error: unknown) => {
      console.error("[DeskLab tracking] Event request failed", {
        eventName: payload.event_name,
        error
      });
    });
}
