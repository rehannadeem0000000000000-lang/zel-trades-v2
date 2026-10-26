import type { Candle, StrategyId } from "./types";
import type { Series } from "./indicators";

export interface StrategyMeta {
  id: StrategyId;
  name: string;
  description: string;
  icon: string;
}

export const STRATEGIES: StrategyMeta[] = [
  {
    id: "ema_trend",
    name: "EMA Trend Cross",
    description: "EMA 9 / 21 alignment confirmed by price vs EMA 200",
    icon: "〰️",
  },
  {
    id: "rsi_reversal",
    name: "RSI Reversal",
    description: "RSI leaving the oversold (<30) or overbought (>70) zone",
    icon: "🔄",
  },
  {
    id: "macd_momentum",
    name: "MACD Momentum",
    description: "MACD crossing its signal line or expanding histogram",
    icon: "📊",
  },
  {
    id: "bollinger_bounce",
    name: "Bollinger Bounce",
    description: "Price rejecting the outer Bollinger Bands and closing back inside",
    icon: "🎯",
  },
  {
    id: "donchian_breakout",
    name: "Donchian Breakout",
    description: "Close breaking the 20-candle high or low",
    icon: "💥",
  },
  {
    id: "supertrend",
    name: "Supertrend",
    description: "ATR trailing trend (period 10, multiplier 3)",
    icon: "🚀",
  },
  {
    id: "stoch_cross",
    name: "Stochastic Cross",
    description: "%K / %D crossover inside oversold (<20) or overbought (>80)",
    icon: "⚡",
  },
];

type Vote = -1 | 0 | 1;
interface Result {
  vote: Vote;
  reason: string;
}

/** Returns 1 if series a crossed above b, -1 if below, 0 if no cross in the lookback window. */
function recentCross(a: number[], b: number[], i: number, lookback: number): 1 | -1 | 0 {
  for (let j = i; j > Math.max(0, i - lookback); j--) {
    if ([a[j - 1], a[j], b[j - 1], b[j]].some((v) => Number.isNaN(v))) continue;
    if (a[j - 1] <= b[j - 1] && a[j] > b[j]) return 1;
    if (a[j - 1] >= b[j - 1] && a[j] < b[j]) return -1;
  }
  return 0;
}

/** Sign flip detection on a ±1 series (e.g. Supertrend direction). */
function recentFlip(arr: number[], i: number, lookback: number): 1 | -1 | 0 {
  for (let j = i; j > Math.max(0, i - lookback); j--) {
    if (arr[j - 1] < 0 && arr[j] > 0) return 1;
    if (arr[j - 1] > 0 && arr[j] < 0) return -1;
  }
  return 0;
}

const evaluators: Record<StrategyId, (c: Candle[], s: Series, i: number) => Result> = {
  ema_trend: (c, s, i) => {
    const e200 = s.ema200[i];
    if (Number.isNaN(e200)) return { vote: 0, reason: "Need 200 candles for the EMA 200 filter" };
    const px = c[i].close;
    const cross = recentCross(s.ema9, s.ema21, i, 3);
    if (s.ema9[i] > s.ema21[i] && px > e200) {
      return { vote: 1, reason: `EMA 9 above EMA 21 and price above EMA 200${cross === 1 ? " (fresh cross)" : ""}` };
    }
    if (s.ema9[i] < s.ema21[i] && px < e200) {
      return { vote: -1, reason: `EMA 9 below EMA 21 and price below EMA 200${cross === -1 ? " (fresh cross)" : ""}` };
    }
    return { vote: 0, reason: "EMA 9/21 and the EMA 200 filter disagree" };
  },

  rsi_reversal: (_c, s, i) => {
    for (let j = i; j > Math.max(0, i - 3); j--) {
      const p = s.rsi[j - 1];
      const r = s.rsi[j];
      if (p < 30 && r >= 30) return { vote: 1, reason: `RSI left oversold zone (${p.toFixed(1)} → ${r.toFixed(1)})` };
      if (p > 70 && r <= 70) return { vote: -1, reason: `RSI left overbought zone (${p.toFixed(1)} → ${r.toFixed(1)})` };
    }
    return { vote: 0, reason: `RSI ${s.rsi[i].toFixed(1)} with no reversal out of extremes` };
  },

  macd_momentum: (_c, s, i) => {
    const cross = recentCross(s.macd, s.macdSignal, i, 3);
    if (cross === 1) return { vote: 1, reason: "MACD crossed above its signal line" };
    if (cross === -1) return { vote: -1, reason: "MACD crossed below its signal line" };
    const h = s.macdHist;
    if (h[i] > 0 && h[i] > h[i - 1]) return { vote: 1, reason: "MACD histogram positive and expanding" };
    if (h[i] < 0 && h[i] < h[i - 1]) return { vote: -1, reason: "MACD histogram negative and expanding" };
    return { vote: 0, reason: "MACD momentum flat or fading" };
  },

  bollinger_bounce: (c, s, i) => {
    for (let j = i; j > Math.max(0, i - 3); j--) {
      const prevClose = c[j - 1].close;
      const close = c[j].close;
      if (prevClose < s.bbLower[j - 1] && close > s.bbLower[j]) {
        return { vote: 1, reason: "Price closed back above the lower Bollinger Band" };
      }
      if (prevClose > s.bbUpper[j - 1] && close < s.bbUpper[j]) {
        return { vote: -1, reason: "Price closed back below the upper Bollinger Band" };
      }
    }
    return { vote: 0, reason: "Price inside the bands, no band rejection" };
  },

  donchian_breakout: (c, s, i) => {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = Math.max(0, i - 20); j < i; j++) {
      hi = Math.max(hi, c[j].high);
      lo = Math.min(lo, c[j].low);
    }
    const px = c[i].close;
    if (px > hi) return { vote: 1, reason: "Close broke above the 20-candle high" };
    if (px < lo) return { vote: -1, reason: "Close broke below the 20-candle low" };
    return { vote: 0, reason: "Price still inside the 20-candle range" };
  },

  supertrend: (_c, s, i) => {
    const t = s.stTrend[i];
    const flip = recentFlip(s.stTrend, i, 3);
    if (t === 1) return { vote: 1, reason: `Supertrend bullish${flip === 1 ? " (fresh flip up)" : ""}` };
    return { vote: -1, reason: `Supertrend bearish${flip === -1 ? " (fresh flip down)" : ""}` };
  },

  stoch_cross: (_c, s, i) => {
    const cross = recentCross(s.stK, s.stD, i, 3);
    if (cross === 1 && s.stK[i] < 20) return { vote: 1, reason: "%K crossed above %D in the oversold zone (<20)" };
    if (cross === -1 && s.stK[i] > 80) return { vote: -1, reason: "%K crossed below %D in the overbought zone (>80)" };
    if (cross !== 0) return { vote: 0, reason: "Stochastic cross happened outside the extreme zones" };
    return { vote: 0, reason: `Stochastic %K at ${s.stK[i].toFixed(0)}, no extreme-zone cross` };
  },
};

export function evaluateStrategy(id: StrategyId, candles: Candle[], s: Series): Result {
  return evaluators[id](candles, s, candles.length - 1);
}
