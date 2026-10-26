import { postJson } from "./http";
import type { AiConfig, AiProviderId, AiVerdict, Signal } from "./types";

export interface AiPreset {
  id: AiProviderId;
  name: string;
  baseUrl: string;
  model: string;
  keyUrl: string;
}

export const AI_PROVIDERS: AiPreset[] = [
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", keyUrl: "https://platform.openai.com/api-keys" },
  { id: "anthropic", name: "Anthropic (Claude)", baseUrl: "https://api.anthropic.com/v1", model: "claude-sonnet-4-5", keyUrl: "https://console.anthropic.com/settings/keys" },
  { id: "gemini", name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.0-flash", keyUrl: "https://aistudio.google.com/app/apikey" },
  { id: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", keyUrl: "https://console.groq.com/keys" },
  { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini", keyUrl: "https://openrouter.ai/keys" },
  { id: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat", keyUrl: "https://platform.deepseek.com/api_keys" },
  { id: "custom", name: "Custom (OpenAI-compatible)", baseUrl: "", model: "", keyUrl: "" },
];

export function defaultAiConfig(): AiConfig {
  const p = AI_PROVIDERS[0];
  return { provider: p.id, apiKey: "", model: p.model, baseUrl: p.baseUrl };
}

export function buildPrompt(sig: Signal): { system: string; user: string } {
  const d = sig.decimals;
  const f = (n: number) => (Number.isFinite(n) ? n.toFixed(d) : "n/a");
  const ind = sig.indicators;
  const lv = sig.levels;
  const votes = sig.votes
    .map((v) => `- ${v.name}: ${v.vote === 1 ? "BUY" : v.vote === -1 ? "SELL" : "WAIT"} (${v.reason})`)
    .join("\n");
  const last = sig.candles
    .slice(-8)
    .map((c) => `O ${f(c.open)} H ${f(c.high)} L ${f(c.low)} C ${f(c.close)}`)
    .join("\n");

  const system =
    "You are a disciplined professional trading analyst reviewing an automated signal. " +
    "Be objective, name the main risks, and never guarantee profits.";

  const user = `Market: ${sig.marketName} (${sig.symbol}), timeframe ${sig.timeframe}
Automated signal: ${sig.direction} | strategy agreement ${sig.confidence}% (${sig.buyVotes} buy, ${sig.sellVotes} sell of ${sig.totalStrategies} strategies)
Strategy votes:
${votes}
Trade plan: ${
    lv
      ? `${lv.side} entry ${f(lv.entry)}, stop loss ${f(lv.stopLoss)}, TP1 ${f(lv.tp1)}, TP2 ${f(lv.tp2)}, TP3 ${f(lv.tp3)}, reward:risk to TP2 1:${lv.riskReward}`
      : "not available"
  }
Indicators: price ${f(ind.price)}, EMA9 ${f(ind.ema9)}, EMA21 ${f(ind.ema21)}, EMA200 ${f(ind.ema200)}, RSI ${ind.rsi.toFixed(1)}, MACD histogram ${ind.macdHist.toFixed(5)}, ATR ${f(ind.atr)} (${ind.atrPct.toFixed(2)}% of price), Stochastic K ${ind.stochK.toFixed(1)} / D ${ind.stochD.toFixed(1)}, Supertrend ${ind.supertrend === 1 ? "bullish" : "bearish"}, trend ${ind.trend}
Last 8 candles:
${last}

Judge whether this trade setup is GOOD, CAUTION or BAD. Reply in EXACTLY this format, 4 lines, nothing else:
VERDICT: <GOOD or CAUTION or BAD>
BIAS: <BULLISH or BEARISH or NEUTRAL>
SCORE: <0-100 setup quality>
REASON: <max 2 sentences>`;

  return { system, user };
}

export function parseVerdict(raw: string): Omit<AiVerdict, "raw"> {
  const field = (name: string) => {
    const m = raw.match(new RegExp(`${name}\\s*[:=-]\\s*(.+)`, "i"));
    return m ? m[1].trim() : "";
  };
  const v = field("VERDICT").toUpperCase();
  const b = field("BIAS").toUpperCase();
  const score = parseInt(field("SCORE"), 10);
  const reason = field("REASON");
  return {
    verdict: v.includes("GOOD") ? "GOOD" : v.includes("BAD") ? "BAD" : v.includes("CAUTION") ? "CAUTION" : "UNKNOWN",
    bias: b.includes("BULL") ? "BULLISH" : b.includes("BEAR") ? "BEARISH" : b.includes("NEUTRAL") ? "NEUTRAL" : "UNKNOWN",
    score: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null,
    reason: reason || raw.trim().slice(0, 280),
  };
}

/** Sends the signal to the configured AI and returns its verdict on the trade. */
export async function reviewSignal(cfg: AiConfig, signal: Signal): Promise<AiVerdict> {
  if (!cfg.apiKey) throw new Error("Add your AI API key first.");
  const model = cfg.model.trim();
  if (!model) throw new Error("Enter a model name.");
  const base = cfg.baseUrl.trim().replace(/\/$/, "");
  if (!base) throw new Error("Enter the AI base URL.");

  const { system, user } = buildPrompt(signal);
  let raw = "";

  if (cfg.provider === "anthropic") {
    const data = await postJson(
      `${base}/messages`,
      {
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      { model, max_tokens: 400, system, messages: [{ role: "user", content: user }] },
    );
    raw = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n");
  } else if (cfg.provider === "gemini") {
    const data = await postJson(
      `${base}/models/${encodeURIComponent(model)}:generateContent`,
      { "x-goog-api-key": cfg.apiKey },
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
      },
    );
    raw = (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("\n");
  } else {
    const data = await postJson(
      `${base}/chat/completions`,
      { Authorization: `Bearer ${cfg.apiKey}` },
      {
        model,
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      },
    );
    raw = data.choices?.[0]?.message?.content ?? "";
  }

  if (!raw.trim()) throw new Error("The AI returned an empty response.");
  return { ...parseVerdict(raw), raw };
}
