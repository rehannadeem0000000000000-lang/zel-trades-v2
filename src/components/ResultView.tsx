"use client";

import AiBox from "./AiBox";
import CandleChart from "./CandleChart";
import { PROVIDERS } from "@/lib/providers";
import { TIMEFRAMES } from "@/lib/markets";
import type { AiConfig, Direction, Signal, TradeLevels } from "@/lib/types";

const DIRECTION_STYLE: Record<Direction, { label: string; text: string; bg: string; border: string; bar: string }> = {
  BUY: { label: "BUY", text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-400/40", bar: "bg-emerald-400" },
  SELL: { label: "SELL", text: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-400/40", bar: "bg-rose-400" },
  NO_TRADE: { label: "NO TRADE", text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-400/40", bar: "bg-amber-400" },
};

interface Props {
  signal: Signal;
  ai: AiConfig;
  onAiChange: (config: AiConfig) => void;
  onReanalyze: () => void;
  onChangeMarket: () => void;
  onChangeStrategies: () => void;
}

function Level({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl bg-black/30 p-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-base font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export default function ResultView({
  signal,
  ai,
  onAiChange,
  onReanalyze,
  onChangeMarket,
  onChangeStrategies,
}: Props) {
  const style = DIRECTION_STYLE[signal.direction];
  const d = signal.decimals;
  const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(d) : "—");
  const ind = signal.indicators;
  const lv: TradeLevels | null = signal.levels;
  const tfLabel = TIMEFRAMES.find((t) => t.id === signal.timeframe)?.label ?? signal.timeframe;
  const providerName = PROVIDERS.find((p) => p.id === signal.provider)?.name ?? signal.provider;
  const agreeing =
    signal.direction === "BUY"
      ? signal.buyVotes
      : signal.direction === "SELL"
        ? signal.sellVotes
        : Math.max(signal.buyVotes, signal.sellVotes);

  const indicatorItems: [string, string][] = [
    ["Trend", ind.trend],
    ["RSI (14)", ind.rsi.toFixed(1)],
    ["EMA 9", fmt(ind.ema9)],
    ["EMA 21", fmt(ind.ema21)],
    ["EMA 200", fmt(ind.ema200)],
    ["MACD hist", ind.macdHist.toFixed(d >= 5 ? 6 : 4)],
    ["ATR (14)", fmt(ind.atr)],
    ["ATR % of price", `${ind.atrPct.toFixed(2)}%`],
    ["Stoch K / D", `${ind.stochK.toFixed(0)} / ${ind.stochD.toFixed(0)}`],
    ["Supertrend", ind.supertrend === 1 ? "Bullish" : "Bearish"],
    ["BB upper", fmt(ind.bbUpper)],
    ["BB lower", fmt(ind.bbLower)],
  ];

  return (
    <div className="space-y-5">
      <section className={`rounded-3xl border ${style.border} ${style.bg} p-5`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">{signal.marketName}</p>
            <h2 className="text-xl font-bold">
              {signal.symbol} · {tfLabel}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {providerName} · {signal.candleCount} candles · {new Date(signal.generatedAt).toLocaleTimeString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Last price</p>
            <p className="font-mono text-lg font-semibold">{fmt(ind.price)}</p>
          </div>
        </div>

        <p className={`mt-5 text-center text-5xl font-black tracking-tight ${style.text}`}>{style.label}</p>
        <p className="mt-2 text-center text-sm text-slate-300">
          {signal.direction === "NO_TRADE"
            ? `Strategies disagree (${signal.buyVotes} buy · ${signal.sellVotes} sell). Wait for confirmation.`
            : `${agreeing} of ${signal.totalStrategies} selected strategies agree`}
        </p>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Strategy agreement</span>
            <span>{signal.confidence}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${signal.confidence}%` }} />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Trade plan</h3>
          {lv && (
            <span className="text-xs text-slate-400">
              {lv.side} · R:R 1:{lv.riskReward} (TP2)
            </span>
          )}
        </div>
        {lv ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Level label="Entry" value={fmt(lv.entry)} tone="text-slate-100" />
              <Level label="Stop loss" value={fmt(lv.stopLoss)} tone="text-rose-300" />
              <Level label="TP 1 (1R)" value={fmt(lv.tp1)} tone="text-emerald-300" />
              <Level label="TP 2 (2R)" value={fmt(lv.tp2)} tone="text-emerald-300" />
              <Level label="TP 3 (3R)" value={fmt(lv.tp3)} tone="text-emerald-300" />
              <Level label="ATR (14)" value={fmt(ind.atr)} tone="text-slate-300" />
            </div>
            {signal.direction === "NO_TRADE" && (
              <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">
                These are reference levels for a {lv.side} bias only. Do not enter until the strategies agree.
              </p>
            )}
            <p className="mt-3 text-[11px] text-slate-500">
              Stop loss = 1.5 × ATR(14) from entry. TP1, TP2 and TP3 are 1R, 2R and 3R of that risk.
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-400">Not enough data for ATR-based levels.</p>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-3 px-1 font-semibold">Price action · last 60 candles</h3>
        <CandleChart candles={signal.candles} levels={lv} decimals={d} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h3 className="font-semibold">Strategy breakdown</h3>
        <ul className="mt-2 divide-y divide-white/5">
          {signal.votes.map((v) => {
            const t =
              v.vote === 1
                ? { label: "BUY", cls: "bg-emerald-500/20 text-emerald-300" }
                : v.vote === -1
                  ? { label: "SELL", cls: "bg-rose-500/20 text-rose-300" }
                  : { label: "WAIT", cls: "bg-white/10 text-slate-300" };
            return (
              <li key={v.id} className="flex items-start gap-3 py-3">
                <span className={`mt-0.5 w-14 shrink-0 rounded-lg py-1 text-center text-[11px] font-bold ${t.cls}`}>
                  {t.label}
                </span>
                <div>
                  <p className="text-sm font-semibold">{v.name}</p>
                  <p className="text-xs text-slate-400">{v.reason}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h3 className="font-semibold">Indicators</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {indicatorItems.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-black/25 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
              <p className="font-mono text-sm text-slate-100">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <AiBox key={signal.id} signal={signal} value={ai} onChange={onAiChange} />

      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={onReanalyze} className="rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-slate-950">
          Re-analyze
        </button>
        <button type="button" onClick={onChangeStrategies} className="rounded-2xl border border-white/10 py-3 text-sm text-slate-200">
          Strategies
        </button>
        <button type="button" onClick={onChangeMarket} className="rounded-2xl border border-white/10 py-3 text-sm text-slate-200">
          Market
        </button>
      </div>

      <p className="text-center text-[11px] text-slate-500">
        Generated from historical candles for education and research. Not financial advice.
      </p>
    </div>
  );
}
