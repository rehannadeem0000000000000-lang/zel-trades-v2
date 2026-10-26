"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, MARKETS, TIMEFRAMES } from "@/lib/markets";
import type { Market, MarketCategory, Timeframe } from "@/lib/types";

interface Props {
  market: Market | null;
  onMarket: (market: Market) => void;
  timeframe: Timeframe;
  onTimeframe: (tf: Timeframe) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function MarketStep({ market, onMarket, timeframe, onTimeframe, onNext, onBack }: Props) {
  const [category, setCategory] = useState<MarketCategory>(market?.category ?? "forex");
  const [query, setQuery] = useState("");
  const q = query.trim().toUpperCase();

  const list = useMemo(() => {
    if (q) return MARKETS.filter((m) => m.symbol.includes(q) || m.name.toUpperCase().includes(q));
    return MARKETS.filter((m) => m.category === category);
  }, [q, category]);

  const exists = MARKETS.some((m) => m.symbol === q);
  const catLabel = CATEGORIES.find((c) => c.id === category)?.label ?? category;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Choose a market</h1>
        <p className="mt-1 text-sm text-slate-400">Currency pair, metal, crypto coin or stock.</p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search EUR/USD, BTC, AAPL…"
        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-emerald-400"
      />

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm ${
              category === c.id ? "border-emerald-400 bg-emerald-400/15 text-emerald-200" : "border-white/10 text-slate-300"
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {list.map((m) => {
          const on = market?.symbol === m.symbol;
          return (
            <li key={m.symbol}>
              <button
                type="button"
                onClick={() => onMarket(m)}
                aria-pressed={on}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
                  on ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 bg-white/5"
                }`}
              >
                <span>
                  <span className="block font-semibold">{m.symbol}</span>
                  <span className="block text-xs text-slate-400">{m.name}</span>
                </span>
                {on && <span className="text-emerald-300">✓</span>}
              </button>
            </li>
          );
        })}
        {list.length === 0 && !q && <li className="text-sm text-slate-500">No markets in this category.</li>}
      </ul>

      {q && !exists && q.length >= 2 && (
        <button
          type="button"
          onClick={() => onMarket({ symbol: q, name: "Custom symbol", category })}
          className="w-full rounded-xl border border-dashed border-emerald-400/50 px-4 py-3 text-left text-sm text-emerald-200"
        >
          Use custom symbol “{q}” as {catLabel}
        </button>
      )}

      <div>
        <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">Timeframe</p>
        <div className="flex flex-wrap gap-2">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTimeframe(t.id)}
              aria-pressed={timeframe === t.id}
              className={`rounded-full border px-4 py-2 text-sm ${
                timeframe === t.id ? "border-emerald-400 bg-emerald-400/15 text-emerald-200" : "border-white/10 text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={!market}
        onClick={onNext}
        className="w-full rounded-2xl bg-emerald-500 py-4 font-bold text-slate-950 disabled:opacity-40"
      >
        {market ? `Continue with ${market.symbol} →` : "Select a market"}
      </button>
      <button type="button" onClick={onBack} className="w-full py-2 text-sm text-slate-400">
        ← Back to data connection
      </button>
    </section>
  );
}
