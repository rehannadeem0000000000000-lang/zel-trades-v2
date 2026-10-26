"use client";

import { useState } from "react";
import { AI_PROVIDERS, reviewSignal } from "@/lib/ai";
import type { AiConfig, AiProviderId, AiVerdict, Signal } from "@/lib/types";

interface Props {
  signal: Signal;
  value: AiConfig;
  onChange: (config: AiConfig) => void;
}

const VERDICT_STYLE: Record<AiVerdict["verdict"], { label: string; text: string; box: string }> = {
  GOOD: { label: "GOOD TRADE", text: "text-emerald-300", box: "border-emerald-400/40 bg-emerald-500/10" },
  CAUTION: { label: "CAUTION", text: "text-amber-300", box: "border-amber-400/40 bg-amber-500/10" },
  BAD: { label: "BAD TRADE", text: "text-rose-300", box: "border-rose-400/40 bg-rose-500/10" },
  UNKNOWN: { label: "UNCLEAR", text: "text-slate-300", box: "border-white/10 bg-white/5" },
};

export default function AiBox({ signal, value, onChange }: Props) {
  const [editing, setEditing] = useState(!value.apiKey);
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<AiVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const preset = AI_PROVIDERS.find((p) => p.id === value.provider) ?? AI_PROVIDERS[0];

  function selectProvider(id: AiProviderId) {
    const p = AI_PROVIDERS.find((x) => x.id === id) ?? AI_PROVIDERS[0];
    onChange({ ...value, provider: id, baseUrl: p.baseUrl, model: p.model });
  }

  async function review() {
    setLoading(true);
    setError(null);
    setVerdict(null);
    try {
      setVerdict(await reviewSignal(value, signal));
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  const vs = verdict ? VERDICT_STYLE[verdict.verdict] : null;

  return (
    <section className="rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-500/15 to-indigo-500/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">🤖 AI Analyst</h3>
          <p className="text-xs text-slate-400">
            {preset.name}
            {value.model ? ` · ${value.model}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300"
        >
          {editing ? "Close" : "AI settings"}
        </button>
      </div>

      {editing && (
        <div className="mt-4 space-y-3">
          <select
            value={value.provider}
            onChange={(e) => selectProvider(e.target.value as AiProviderId)}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-violet-400"
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="AI API key"
            value={value.apiKey}
            onChange={(e) => onChange({ ...value, apiKey: e.target.value.trim() })}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-violet-400"
          />
          <input
            placeholder="Model (e.g. gpt-4o-mini)"
            value={value.model}
            onChange={(e) => onChange({ ...value, model: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-violet-400"
          />
          <input
            placeholder="Base URL (OpenAI-compatible endpoint)"
            value={value.baseUrl}
            onChange={(e) => onChange({ ...value, baseUrl: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-violet-400"
          />
          {preset.keyUrl && (
            <a href={preset.keyUrl} target="_blank" rel="noreferrer" className="inline-block text-xs text-violet-300 underline">
              Get a key from {preset.name} ↗
            </a>
          )}
          <p className="text-[11px] text-slate-500">
            Any AI API works: OpenAI, Claude, Gemini, Groq, OpenRouter, DeepSeek or a custom OpenAI-compatible endpoint.
            The key is stored only on this device.
          </p>
        </div>
      )}

      {!editing && (
        <div className="mt-4 space-y-3">
          {!value.apiKey && <p className="text-sm text-slate-300">Add an AI key in settings to get a second opinion.</p>}
          <button
            type="button"
            disabled={loading || !value.apiKey}
            onClick={review}
            className="w-full rounded-2xl bg-violet-500 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {loading ? "AI is reviewing the signal…" : "Ask AI to judge this trade"}
          </button>

          {error && <div className="rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300">{error}</div>}

          {verdict && vs && (
            <div className={`rounded-2xl border p-4 ${vs.box}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xl font-black ${vs.text}`}>{vs.label}</span>
                <span className="text-xs text-slate-300">Score {verdict.score ?? "—"}/100</span>
              </div>
              <p className="mt-2 text-sm">
                <span className="text-slate-400">AI bias: </span>
                <span className="font-semibold">{verdict.bias}</span>
              </p>
              <p className="mt-2 text-sm text-slate-200">{verdict.reason}</p>
              <button
                type="button"
                onClick={() => setShowRaw(!showRaw)}
                className="mt-3 text-[11px] text-slate-400 underline"
              >
                {showRaw ? "Hide raw AI reply" : "Show raw AI reply"}
              </button>
              {showRaw && <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-400">{verdict.raw}</pre>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
