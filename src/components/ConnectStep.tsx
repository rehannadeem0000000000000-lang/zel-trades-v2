"use client";

import { useState } from "react";
import { PROVIDERS, testProvider } from "@/lib/providers";
import type { ProviderConfig, ProviderId } from "@/lib/types";

interface Props {
  value: ProviderConfig;
  onChange: (value: ProviderConfig) => void;
  onConnected: () => void;
}

export default function ConnectStep({ value, onChange, onConnected }: Props) {
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const meta = PROVIDERS.find((p) => p.id === value.provider) ?? PROVIDERS[0];

  function pick(id: ProviderId) {
    onChange({ provider: id, apiKey: value.provider === id ? value.apiKey : "" });
    setStatus(null);
  }

  async function connect() {
    setTesting(true);
    setStatus(null);
    try {
      const price = await testProvider(value);
      setStatus({ ok: true, text: `Connected. Live test price: ${price}` });
      onConnected();
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : "Connection failed" });
    } finally {
      setTesting(false);
    }
  }

  const blocked = testing || (meta.needsKey && !value.apiKey);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Connect market data</h1>
        <p className="mt-1 text-sm text-slate-400">
          Choose a data provider and paste its API key. Keys stay on this device.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => pick(p.id)}
            aria-pressed={value.provider === p.id}
            className={`rounded-2xl border p-4 text-left transition ${
              value.provider === p.id ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 bg-white/5"
            }`}
          >
            <div className="font-semibold">{p.name}</div>
            <div className="mt-1 text-xs text-slate-400">{p.needsKey ? "API key required" : "No key needed"}</div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-slate-300">{meta.note}</p>
        {meta.needsKey && (
          <>
            <label htmlFor="api-key" className="mt-4 block text-sm font-medium text-slate-200">
              {meta.name} API key
            </label>
            <input
              id="api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={value.apiKey}
              onChange={(e) => onChange({ ...value, apiKey: e.target.value.trim() })}
              placeholder="Paste your API key"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-emerald-400"
            />
            {meta.keyUrl && (
              <a
                href={meta.keyUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs text-emerald-400 underline"
              >
                Get a key from {meta.name} ↗
              </a>
            )}
          </>
        )}
      </div>

      {status && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            status.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
          }`}
        >
          {status.text}
        </div>
      )}

      <button
        type="button"
        disabled={blocked}
        onClick={connect}
        className="w-full rounded-2xl bg-emerald-500 py-4 font-bold text-slate-950 transition disabled:opacity-40"
      >
        {testing ? "Testing connection…" : "Save & Connect"}
      </button>
      <button
        type="button"
        onClick={() => onConnected()}
        className="w-full rounded-2xl border border-white/10 py-3 text-sm text-slate-300"
      >
        Skip test and continue
      </button>
    </section>
  );
}
