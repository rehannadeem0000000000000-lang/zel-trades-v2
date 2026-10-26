"use client";

import { STRATEGIES } from "@/lib/strategies";
import { TIMEFRAMES } from "@/lib/markets";
import type { Market, StrategyId, Timeframe } from "@/lib/types";

interface Props {
  market: Market;
  timeframe: Timeframe;
  selected: StrategyId[];
  onChange: (ids: StrategyId[]) => void;
  onAnalyze: () => void;
  onBack: () => void;
  error: string | null;
}

export default function StrategyStep({ market, timeframe, selected, onChange, onAnalyze, onBack, error }: Props) {
  const tfLabel = TIMEFRAMES.find((t) => t.id === timeframe)?.label ?? timeframe;

  function toggle(id: StrategyId) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Pick strategies</h1>
        <p className="mt-1 text-sm text-slate-400">
          Select one or more. With several selected, a BUY or SELL needs a strict majority to agree.
        </p>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {selected.length} of {STRATEGIES.length} selected
        </span>
        <div className="flex gap-4">
          <button type="button" onClick={() => onChange(STRATEGIES.map((s) => s.id))} className="text-emerald-400">
            Select all
          </button>
          <button type="button" onClick={() => onChange([])} className="text-slate-400">
            Clear
          </button>
        </div>
      </div>

      <ul className="space-y-3">
        {STRATEGIES.map((s) => {
          const on = selected.includes(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => toggle(s.id)}
                aria-pressed={on}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  on ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 bg-white/5"
                }`}
              >
                <span className="text-2xl leading-none">{s.icon}</span>
                <span className="flex-1">
                  <span className="block font-semibold">{s.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{s.description}</span>
                </span>
                <span
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs ${
                    on ? "border-emerald-400 bg-emerald-400 font-bold text-slate-950" : "border-white/20 text-transparent"
                  }`}
                >
                  ✓
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && <div className="rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300">{error}</div>}

      <button
        type="button"
        disabled={selected.length === 0}
        onClick={onAnalyze}
        className="w-full rounded-2xl bg-emerald-500 py-4 font-bold text-slate-950 disabled:opacity-40"
      >
        Analyze {market.symbol} · {tfLabel}
      </button>
      <button type="button" onClick={onBack} className="w-full py-2 text-sm text-slate-400">
        ← Back to markets
      </button>
    </section>
  );
}
