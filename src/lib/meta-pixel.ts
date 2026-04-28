export const META_PIXEL_ID = "686289147266481";

type MetaParamValue = string | number | boolean | null | undefined;
type SanitizedMetaParams = Record<string, string | number | boolean | null>;

interface QueuedMetaEvent {
  eventName: string;
  params: SanitizedMetaParams;
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
    __dlMetaQueue?: QueuedMetaEvent[];
    __dlFlushMetaQueue?: () => void;
  }
}

function sanitizeMetaParams(params: Record<string, MetaParamValue>): SanitizedMetaParams {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined)
  ) as SanitizedMetaParams;
}

export function getMetaPageContext(): Record<string, string | null> {
  if (typeof window === "undefined") {
    return {
      source: null,
      page_path: null
    };
  }

  return {
    source: document.referrer || null,
    page_path: window.location.pathname
  };
}

export function flushQueuedMetaEvents(): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return;
  }

  const queue = window.__dlMetaQueue ?? [];
  window.__dlMetaQueue = [];

  queue.forEach(({ eventName, params }) => {
    window.fbq?.("trackCustom", eventName, params);
  });
}

export function trackMetaEvent(
  eventName: string,
  params: Record<string, MetaParamValue> = {}
): void {
  if (typeof window === "undefined") {
    return;
  }

  const sanitizedParams = sanitizeMetaParams(params);

  if (typeof window.fbq === "function") {
    window.fbq("trackCustom", eventName, sanitizedParams);
    return;
  }

  window.__dlMetaQueue = window.__dlMetaQueue ?? [];
  window.__dlMetaQueue.push({ eventName, params: sanitizedParams });
}
