import type { Candle } from "./types";

/** Simple moving average. Leading values are NaN until the window is full. */
export function sma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** SMA that tolerates leading NaN values (e.g. indicator outputs). */
function smaSafe(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  const first = values.findIndex((v) => !Number.isNaN(v));
  if (first < 0) return out;
  const s = sma(values.slice(first), period);
  s.forEach((v, j) => {
    out[first + j] = v;
  });
  return out;
}

/** Exponential moving average seeded with an SMA. */
export function ema(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  let prev = seed / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's RSI. */
export function rsi(closes: number[], period = 14): number[] {
  const out = new Array<number>(closes.length).fill(NaN);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

/** Wilder's Average True Range. */
export function atr(candles: Candle[], period = 14): number[] {
  const n = candles.length;
  const out = new Array<number>(n).fill(NaN);
  if (n <= period) return out;
  const tr = candles.map((c, i) =>
    i === 0
      ? c.high - c.low
      : Math.max(c.high - c.low, Math.abs(c.high - candles[i - 1].close), Math.abs(c.low - candles[i - 1].close)),
  );
  let prev = 0;
  for (let i = 1; i <= period; i++) prev += tr[i];
  prev /= period;
  out[period] = prev;
  for (let i = period + 1; i < n; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

export function macd(closes: number[], fast = 12, slow = 26, signalPeriod = 9) {
  const f = ema(closes, fast);
  const s = ema(closes, slow);
  const line = closes.map((_, i) => (Number.isNaN(f[i]) || Number.isNaN(s[i]) ? NaN : f[i] - s[i]));
  const signal = new Array<number>(closes.length).fill(NaN);
  const first = line.findIndex((v) => !Number.isNaN(v));
  if (first >= 0) {
    const sig = ema(line.slice(first), signalPeriod);
    sig.forEach((v, j) => {
      signal[first + j] = v;
    });
  }
  const hist = line.map((v, i) => v - signal[i]);
  return { line, signal, hist };
}

export function bollinger(closes: number[], period = 20, mult = 2) {
  const mid = sma(closes, period);
  const upper = new Array<number>(closes.length).fill(NaN);
  const lower = new Array<number>(closes.length).fill(NaN);
  for (let i = period - 1; i < closes.length; i++) {
    let sq = 0;
    for (let j = i - period + 1; j <= i; j++) sq += (closes[j] - mid[i]) ** 2;
    const sd = Math.sqrt(sq / period);
    upper[i] = mid[i] + mult * sd;
    lower[i] = mid[i] - mult * sd;
  }
  return { mid, upper, lower };
}

/** Supertrend: trend = 1 (bullish) or -1 (bearish). */
export function supertrend(candles: Candle[], period = 10, mult = 3) {
  const n = candles.length;
  const a = atr(candles, period);
  const trend = new Array<number>(n).fill(1);
  const line = new Array<number>(n).fill(NaN);
  let fu = NaN;
  let fl = NaN;
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(a[i])) continue;
    const hl2 = (candles[i].high + candles[i].low) / 2;
    const bu = hl2 + mult * a[i];
    const bl = hl2 - mult * a[i];
    if (Number.isNaN(fu)) {
      fu = bu;
      fl = bl;
    } else {
      const prevClose = candles[i - 1].close;
      fu = bu < fu || prevClose > fu ? bu : fu;
      fl = bl > fl || prevClose < fl ? bl : fl;
    }
    const prevTrend = i > 0 ? trend[i - 1] : 1;
    let t = prevTrend;
    if (prevTrend === 1 && candles[i].close < fl) t = -1;
    else if (prevTrend === -1 && candles[i].close > fu) t = 1;
    trend[i] = t;
    line[i] = t === 1 ? fl : fu;
  }
  return { trend, line };
}

/** Stochastic oscillator with smoothed %K and %D. */
export function stochastic(candles: Candle[], kPeriod = 14, kSmooth = 3, dPeriod = 3) {
  const n = candles.length;
  const raw = new Array<number>(n).fill(NaN);
  for (let i = kPeriod - 1; i < n; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      hh = Math.max(hh, candles[j].high);
      ll = Math.min(ll, candles[j].low);
    }
    raw[i] = hh === ll ? 50 : ((candles[i].close - ll) / (hh - ll)) * 100;
  }
  const k = smaSafe(raw, kSmooth);
  const d = smaSafe(k, dPeriod);
  return { k, d };
}

export interface Series {
  closes: number[];
  ema9: number[];
  ema21: number[];
  ema200: number[];
  rsi: number[];
  macd: number[];
  macdSignal: number[];
  macdHist: number[];
  atr: number[];
  bbUpper: number[];
  bbMid: number[];
  bbLower: number[];
  stK: number[];
  stD: number[];
  stTrend: number[];
  stLine: number[];
}

/** Computes every indicator series needed by the strategies in one pass. */
export function computeSeries(candles: Candle[]): Series {
  const closes = candles.map((c) => c.close);
  const m = macd(closes);
  const bb = bollinger(closes, 20, 2);
  const st = supertrend(candles, 10, 3);
  const sto = stochastic(candles, 14, 3, 3);
  return {
    closes,
    ema9: ema(closes, 9),
    ema21: ema(closes, 21),
    ema200: ema(closes, 200),
    rsi: rsi(closes, 14),
    macd: m.line,
    macdSignal: m.signal,
    macdHist: m.hist,
    atr: atr(candles, 14),
    bbUpper: bb.upper,
    bbMid: bb.mid,
    bbLower: bb.lower,
    stK: sto.k,
    stD: sto.d,
    stTrend: st.trend,
    stLine: st.line,
  };
}
