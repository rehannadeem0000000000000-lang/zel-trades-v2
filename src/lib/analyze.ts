import { computeSeries } from "./indicators";
import { evaluateStrategy, STRATEGIES } from "./strategies";
import type {
  Candle,
  Direction,
  Indicators,
  Market,
  ProviderId,
  Signal,
  StrategyId,
  StrategyVote,
  Timeframe,
  TradeLevels,
} from "./types";

/** Decimal places to show for a price, based on the market type. */
export function decimalsFor(market: Market, price: number): number {
  if (market.category === "forex") return market.symbol.includes("JPY") ? 3 : 5;
  if (market.category === "commodities" || market.category === "stocks") return 2;
  return price < 1 ? 5 : price < 100 ? 3 : 2;
}

/** ATR-based plan: stop = 1.5 × ATR, TP1 = 1R, TP2 = 2R, TP3 = 3R. */
function buildLevels(price: number, atr: number, side: 1 | -1): TradeLevels {
  const risk = atr * 1.5;
  return {
    side: side === 1 ? "BUY" : "SELL",
    entry: price,
    stopLoss: price - side * risk,
    tp1: price + side * risk,
    tp2: price + side * 2 * risk,
    tp3: price + side * 3 * risk,
    riskReward: 2,
  };
}

export interface AnalyzeInput {
  candles: Candle[];
  market: Market;
  timeframe: Timeframe;
  provider: ProviderId;
  strategyIds: StrategyId[];
}

/**
 * Runs every selected strategy on the latest candles and combines the votes.
 * One strategy: its vote is the signal. Several: a strict majority must agree, otherwise NO TRADE.
 */
export function analyzeMarket({ candles, market, timeframe, provider, strategyIds }: AnalyzeInput): Signal {
  if (strategyIds.length === 0) throw new Error("Select at least one strategy");
  if (candles.length < 60) throw new Error("Not enough candles to analyze");

  const s = computeSeries(candles);
  const i = candles.length - 1;
  const price = candles[i].close;

  const votes: StrategyVote[] = strategyIds.map((id) => {
    const meta = STRATEGIES.find((m) => m.id === id);
    const r = evaluateStrategy(id, candles, s);
    return { id, name: meta?.name ?? id, vote: r.vote, reason: r.reason };
  });

  const n = votes.length;
  const buy = votes.filter((v) => v.vote === 1).length;
  const sell = votes.filter((v) => v.vote === -1).length;

  let direction: Direction = "NO_TRADE";
  if (n === 1) direction = buy ? "BUY" : sell ? "SELL" : "NO_TRADE";
  else if (buy * 2 > n) direction = "BUY";
  else if (sell * 2 > n) direction = "SELL";

  const confidence = Math.round((Math.max(buy, sell) / n) * 100);

  // Side used for reference levels (also used for NO TRADE to show what the bias would look like)
  const lean: 1 | -1 =
    direction === "BUY" ? 1 : direction === "SELL" ? -1 : buy !== sell ? (buy > sell ? 1 : -1) : s.stTrend[i] === 1 ? 1 : -1;

  const atrVal = s.atr[i];
  const levels = Number.isNaN(atrVal) ? null : buildLevels(price, atrVal, lean);

  const e200 = s.ema200[i];
  const bull = s.ema9[i] > s.ema21[i] && price > e200;
  const bear = s.ema9[i] < s.ema21[i] && price < e200;
  const indicators: Indicators = {
    price,
    ema9: s.ema9[i],
    ema21: s.ema21[i],
    ema200: e200,
    rsi: s.rsi[i],
    macd: s.macd[i],
    macdSignal: s.macdSignal[i],
    macdHist: s.macdHist[i],
    atr: atrVal,
    atrPct: (atrVal / price) * 100,
    bbUpper: s.bbUpper[i],
    bbMid: s.bbMid[i],
    bbLower: s.bbLower[i],
    stochK: s.stK[i],
    stochD: s.stD[i],
    supertrend: s.stTrend[i] === 1 ? 1 : -1,
    trend: bull ? "Bullish" : bear ? "Bearish" : "Neutral",
  };

  return {
    id: `${Date.now()}`,
    symbol: market.symbol,
    marketName: market.name,
    category: market.category,
    timeframe,
    provider,
    generatedAt: Date.now(),
    candleCount: candles.length,
    direction,
    confidence,
    buyVotes: buy,
    sellVotes: sell,
    totalStrategies: n,
    votes,
    levels,
    indicators,
    candles: candles.slice(-80),
    decimals: decimalsFor(market, price),
  };
}
