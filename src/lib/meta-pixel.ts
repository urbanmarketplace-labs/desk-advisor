export const META_PIXEL_ID = "686289147266481";

type MetaParamValue = string | number | boolean | null | undefined;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

function sanitizeMetaParams(params: Record<string, MetaParamValue>): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined)
  ) as Record<string, string | number | boolean | null>;
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

export function trackMetaEvent(
  eventName: string,
  params: Record<string, MetaParamValue> = {}
): void {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("trackCustom", eventName, sanitizeMetaParams(params));
  }
}
