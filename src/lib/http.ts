/**
 * Small HTTP helpers shared by market-data and AI clients.
 * On Android, Capacitor's native HTTP bridge handles these calls (no CORS limits).
 */

export function withTimeout<T>(promise: Promise<T>, ms = 25000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Request timed out. Check your connection and try again.")),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function extractMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, any>;
  const candidates = [
    d.error?.message,
    typeof d.error === "string" ? d.error : undefined,
    d.message,
    d.msg,
    d["Error Message"],
    d.Information,
    d.Note,
    d.chart?.error?.description,
  ];
  return candidates.find((v): v is string => typeof v === "string" && v.length > 0);
}

async function parseResponse(res: Response): Promise<any> {
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Unexpected response from server (HTTP ${res.status})`);
  }
  if (!res.ok) {
    throw new Error(extractMessage(data) ?? `Request failed (HTTP ${res.status})`);
  }
  return data;
}

export async function getJson(url: string, ms = 25000): Promise<any> {
  const res = await withTimeout(fetch(url, { headers: { Accept: "application/json" } }), ms);
  return parseResponse(res);
}

export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  ms = 60000,
): Promise<any> {
  const res = await withTimeout(
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
    ms,
  );
  return parseResponse(res);
}
