"use client";

import { useEffect, useState } from "react";
import ConnectStep from "./ConnectStep";
import MarketStep from "./MarketStep";
import StrategyStep from "./StrategyStep";
import ResultView from "./ResultView";
import { fetchCandles } from "@/lib/providers";
import { analyzeMarket } from "@/lib/analyze";
import { defaultAiConfig } from "@/lib/ai";
import { loadJson, saveJson, STORAGE } from "@/lib/storage";
import type { AiConfig, Market, ProviderConfig, Signal, StrategyId, Timeframe } from "@/lib/types";

type Step = "connect" | "market" | "strategy" | "analyzing" | "result";

interface SavedSelection {
  connected: boolean;
  market: Market | null;
  timeframe: Timeframe;
  strategies: StrategyId[];
}

const DEFAULT_PROVIDER: ProviderConfig = { provider: "twelvedata", apiKey: "" };
const DEFAULT_SELECTION: SavedSelection = {
  connected: false,
  market: null,
  timeframe: "1h",
  strategies: ["ema_trend", "macd_momentum", "supertrend"],
};

const STEPS: { id: Step; label: string }[] = [
  { id: "connect", label: "Connect" },
  { id: "market", label: "Market" },
  { id: "strategy", label: "Strategies" },
  { id: "result", label: "Signal" },
];

export default function ZelApp() {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("connect");
  const [provider, setProvider] = useState<ProviderConfig>(DEFAULT_PROVIDER);
  const [connected, setConnected] = useState(false);
  const [market, setMarket] = useState<Market | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [strategies, setStrategies] = useState<StrategyId[]>(DEFAULT_SELECTION.strategies);
  const [ai, setAi] = useState<AiConfig>(defaultAiConfig());
  const [signal, setSignal] = useState<Signal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  // Restore saved settings on the device.
  useEffect(() => {
    const savedProvider = loadJson<ProviderConfig>(STORAGE.provider, DEFAULT_PROVIDER);
    const saved = loadJson<SavedSelection>(STORAGE.selection, DEFAULT_SELECTION);
    const savedAi = loadJson<AiConfig>(STORAGE.ai, defaultAiConfig());
    setProvider(savedProvider);
    setConnected(saved.connected);
    setMarket(saved.market);
    setTimeframe(saved.timeframe);
    setStrategies(saved.strategies);
    setAi(savedAi);
    setStep(saved.connected ? "market" : "connect");
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveJson(STORAGE.provider, provider);
  }, [ready, provider]);

  useEffect(() => {
    if (ready) saveJson<SavedSelection>(STORAGE.selection, { connected, market, timeframe, strategies });
  }, [ready, connected, market, timeframe, strategies]);

  useEffect(() => {
    if (ready) saveJson(STORAGE.ai, ai);
  }, [ready, ai]);

  async function runAnalysis() {
    if (!market) return;
    setError(null);
    setStep("analyzing");
    setProgress(`Fetching ${market.symbol} candles…`);
    try {
      const candles = await fetchCandles(provider, market, timeframe, 300);
      setProgress(`Running ${strategies.length} strateg${strategies.length > 1 ? "ies" : "y"}…`);
      const sig = analyzeMarket({
        candles,
        market,
        timeframe,
        provider: provider.provider,
        strategyIds: strategies,
      });
      setSignal(sig);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
      setStep("strategy");
    }
  }

  const activeIndex = STEPS.findIndex((s) => s.id === (step === "analyzing" ? "strategy" : step));

  return (
    <div className="min-h-dvh bg-[#070b14] text-slate-100">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500 text-lg font-black text-slate-950">
                Z
              </span>
              <span className="text-lg font-bold tracking-tight">Zel Signals</span>
            </div>
            {connected && step !== "connect" && (
              <button
                type="button"
                onClick={() => setStep("connect")}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300"
              >
                API settings
              </button>
            )}
          </div>
          <div className="mt-5 grid grid-cols-4 gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s.id} className={`h-1 rounded-full ${i <= activeIndex ? "bg-emerald-400" : "bg-white/10"}`} />
            ))}
          </div>
          <p className="mt-2 text-[11px] uppercase tracking-widest text-slate-500">
            Step {activeIndex + 1} of {STEPS.length} · {STEPS[activeIndex]?.label}
          </p>
        </header>

        <main className="flex-1">
          {!ready && <p className="py-20 text-center text-sm text-slate-500">Loading…</p>}

          {ready && step === "connect" && (
            <ConnectStep
              value={provider}
              onChange={setProvider}
              onConnected={() => {
                setConnected(true);
                setStep("market");
              }}
            />
          )}

          {ready && step === "market" && (
            <MarketStep
              market={market}
              onMarket={setMarket}
              timeframe={timeframe}
              onTimeframe={setTimeframe}
              onNext={() => setStep("strategy")}
              onBack={() => setStep("connect")}
            />
          )}

          {ready && step === "strategy" && market && (
            <StrategyStep
              market={market}
              timeframe={timeframe}
              selected={strategies}
              onChange={setStrategies}
              onAnalyze={runAnalysis}
              onBack={() => setStep("market")}
              error={error}
            />
          )}

          {step === "analyzing" && (
            <div className="flex flex-col items-center justify-center gap-4 py-24">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent" />
              <p className="text-sm text-slate-200">{progress}</p>
              <p className="text-xs text-slate-500">Loading 300 candles and computing indicators…</p>
            </div>
          )}

          {ready && step === "result" && signal && (
            <ResultView
              signal={signal}
              ai={ai}
              onAiChange={setAi}
              onReanalyze={runAnalysis}
              onChangeMarket={() => setStep("market")}
              onChangeStrategies={() => setStep("strategy")}
            />
          )}
        </main>
      </div>
    </div>
  );
}
