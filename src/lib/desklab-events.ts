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

  const eventBody = {
    session_id: getDeskLabSessionId(),
    event_name: payload.event_name,
    question_id: payload.question_id ?? null,
    answer_value: payload.answer_value ?? null,
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
