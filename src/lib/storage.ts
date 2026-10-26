/** Local, on-device persistence (localStorage works inside the Android WebView). */
export const STORAGE = {
  provider: "zel.provider",
  selection: "zel.selection",
  ai: "zel.ai",
} as const;

export function loadJson<T extends object>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: the app still works for this session.
  }
}
