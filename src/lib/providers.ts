import { getJson, extractMessage } from "./http";
import { MARKETS } from "./markets";
import type { Candle, Market, ProviderConfig, ProviderId, Timeframe } from "./types";

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  needsKey: boolean;
  keyUrl: string;
  note: string;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "twelvedata",
    name: "Twelve Data",
    needsKey: true,
    keyUrl: "https://twelvedata.com/account/api-keys",
    note: "Forex, metals, crypto and stocks with one key. Free plan limits apply.",
  },
  {
    id: "alphavantage",
    name: "Alpha Vantage",
    needsKey: true,
    keyUrl: "https://www.alphavantage.co/support/#api-key",
    note: "Forex, crypto and stocks. Free plan is limited to a small number of calls per day.",
  },
  {
    id: "yahoo",
    name: "Yahoo Finance",
    needsKey: false,
    keyUrl: "",
    note: "No key needed. Unofficial public endpoint, so it can rate-limit at times.",
  },
  {
    id: "binance",
    name: "Binance",
    needsKey: false,
    keyUrl: "https://www.binance.com/en/my/settings/api-management",
    note: "Crypto only. Public market data needs no key (not available in every region).",
  },
];

const TD_INTERVAL: Record<Timeframe, string> = { "5m": "5min", "15m": "15min", "1h": "1h", "4h": "4h", "1D": "1day" };
const AV_INTERVAL: Partial<Record<Timeframe, string>> = { "5m": "5min", "15m": "15min", "1h": "60min" };
const YH_CFG: Record<Timeframe, { interval: string; range: string }> = {
  "5m": { interval: "5m", range: "60d" },
  "15m": { interval: "15m", range: "60d" },
  "1h": { interval: "60m", range: "730d" },
  "4h": { interval: "60m", range: "730d" },
  "1D": { interval: "1d", range: "5y" },
};
const BN_INTERVAL: Record<Timeframe, string> = { "5m": "5m", "15m": "15m", "1h": "1h", "4h": "4h", "1D": "1d" };

/** Parses "2026-10-26 22:00:00", "2026-10-26", ISO strings into epoch ms (UTC). */
function parseTs(input: string): number {
  const t = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return Date.parse(`${t}T00:00:00Z`);
  const iso = t.replace(" ", "T");
  return Date.parse(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
}

function numField(row: Record<string, string>, name: string): number {
  const key = Object.keys(row).find((k) => k.toLowerCase().includes(name));
  return key ? Number(row[key]) : 0;
}

function sortUnique(candles: Candle[]): Candle[] {
  const map = new Map<number, Candle>();
  for (const c of candles) {
    if ([c.open, c.high, c.low, c.close].every((v) => Number.isFinite(v))) map.set(c.time, c);
  }
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

/** Groups lower-timeframe candles into larger buckets (used for 4h when a provider lacks it). */
function aggregate(candles: Candle[], minutes: number): Candle[] {
  const bucketMs = minutes * 60_000;
  const map = new Map<number, Candle>();
  for (const c of candles) {
    const key = Math.floor(c.time / bucketMs) * bucketMs;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, { time: key, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume });
    } else {
      cur.high = Math.max(cur.high, c.high);
      cur.low = Math.min(cur.low, c.low);
      cur.close = c.close;
      cur.volume += c.volume;
    }
  }
  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

async function fromTwelveData(apiKey: string, market: Market, tf: Timeframe, count: number): Promise<Candle[]> {
  const qs = new URLSearchParams({
    symbol: market.symbol,
    interval: TD_INTERVAL[tf],
    outputsize: String(count),
    timezone: "UTC",
    format: "JSON",
    apikey: apiKey,
  });
  const data = await getJson(`https://api.twelvedata.com/time_series?${qs.toString()}`);
  if (!Array.isArray(data.values)) {
    throw new Error(extractMessage(data) ?? "Twelve Data returned no candles for this market");
  }
  return data.values.map((v: Record<string, string>) => ({
    time: parseTs(v.datetime),
    open: Number(v.open),
    high: Number(v.high),
    low: Number(v.low),
    close: Number(v.close),
    volume: Number(v.volume ?? 0),
  }));
}

async function fromAlphaVantage(apiKey: string, market: Market, tf: Timeframe): Promise<Candle[]> {
  const [base, quote = "USD"] = market.symbol.split("/");
  const intraday = tf !== "1D";
  const interval = AV_INTERVAL[tf] ?? "60min";
  let params: Record<string, string>;
  if (market.category === "forex" || market.category === "commodities") {
    params = intraday
      ? { function: "FX_INTRADAY", from_symbol: base, to_symbol: quote, interval, outputsize: "full" }
      : { function: "FX_DAILY", from_symbol: base, to_symbol: quote, outputsize: "full" };
  } else if (market.category === "crypto") {
    params = intraday
      ? { function: "CRYPTO_INTRADAY", symbol: base, market: quote, interval, outputsize: "full" }
      : { function: "DIGITAL_CURRENCY_DAILY", symbol: base, market: quote };
  } else {
    params = intraday
      ? { function: "TIME_SERIES_INTRADAY", symbol: base, interval, outputsize: "full" }
      : { function: "TIME_SERIES_DAILY", symbol: base, outputsize: "full" };
  }
  const qs = new URLSearchParams({ ...params, apikey: apiKey });
  const data = await getJson(`https://www.alphavantage.co/query?${qs.toString()}`);
  const seriesKey = Object.keys(data).find((k) => /time series|digital currency/i.test(k));
  if (!seriesKey) throw new Error(extractMessage(data) ?? "Alpha Vantage returned no candles for this market");
  const series = data[seriesKey] as Record<string, Record<string, string>>;
  return Object.entries(series).map(([t, row]) => ({
    time: parseTs(t),
    open: numField(row, "open"),
    high: numField(row, "high"),
    low: numField(row, "low"),
    close: numField(row, "close"),
    volume: numField(row, "volume"),
  }));
}

function yahooSymbol(market: Market): string {
  if (market.category === "forex" || market.category === "commodities") return `${market.symbol.replace("/", "")}=X`;
  if (market.category === "crypto") return market.symbol.replace("/", "-");
  return market.symbol;
}

async function fromYahoo(market: Market, tf: Timeframe): Promise<Candle[]> {
  const cfg = YH_CFG[tf];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol(market),
  )}?interval=${cfg.interval}&range=${cfg.range}`;
  const data = await getJson(url);
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(extractMessage(data) ?? "Yahoo Finance returned no data for this market");
  const q = result.indicators.quote[0];
  const timestamps: number[] = result.timestamp ?? [];
  const candles: Candle[] = [];
  timestamps.forEach((t: number, i: number) => {
    if (q.open[i] == null || q.high[i] == null || q.low[i] == null || q.close[i] == null) return;
    candles.push({
      time: t * 1000,
      open: q.open[i],
      high: q.high[i],
      low: q.low[i],
      close: q.close[i],
      volume: q.volume?.[i] ?? 0,
    });
  });
  return candles;
}

async function fromBinance(market: Market, tf: Timeframe, count: number): Promise<Candle[]> {
  const [base] = market.symbol.split("/");
  const symbol = `${base}USDT`;
  const data = await getJson(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${BN_INTERVAL[tf]}&limit=${Math.min(count, 1000)}`,
  );
  if (!Array.isArray(data)) throw new Error(extractMessage(data) ?? "Binance returned no candles");
  return data.map((k: (string | number)[]) => ({
    time: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

/**
 * Fetches the most recent `count` candles for a market, normalised to ascending time.
 */
export async function fetchCandles(cfg: ProviderConfig, market: Market, tf: Timeframe, count = 300): Promise<Candle[]> {
  const meta = PROVIDERS.find((p) => p.id === cfg.provider);
  if (!meta) throw new Error("Unknown data provider");
  const apiKey = cfg.apiKey.trim();
  if (meta.needsKey && !apiKey) throw new Error(`${meta.name} needs an API key`);
  if (cfg.provider === "binance" && market.category !== "crypto") {
    throw new Error("Binance only supports crypto markets. Pick a crypto pair or another provider.");
  }

  const needsAgg = tf === "4h" && (cfg.provider === "yahoo" || cfg.provider === "alphavantage");
  const fetchTf: Timeframe = needsAgg ? "1h" : tf;
  const fetchCount = needsAgg ? count * 4 : count;

  let candles: Candle[] = [];
  switch (cfg.provider) {
    case "twelvedata":
      candles = await fromTwelveData(apiKey, market, fetchTf, fetchCount);
      break;
    case "alphavantage":
      candles = await fromAlphaVantage(apiKey, market, fetchTf);
      break;
    case "yahoo":
      candles = await fromYahoo(market, fetchTf);
      break;
    case "binance":
      candles = await fromBinance(market, fetchTf, fetchCount);
      break;
  }

  candles = sortUnique(candles);
  if (needsAgg) candles = aggregate(candles, 240);
  candles = candles.slice(-count);
  if (candles.length < 60) {
    throw new Error(`Only ${candles.length} candles were returned, which is not enough to analyze.`);
  }
  return candles;
}

/** Quick connectivity check used by the "Save & Connect" button. Returns the latest close. */
export async function testProvider(cfg: ProviderConfig): Promise<number> {
  const market =
    cfg.provider === "binance"
      ? MARKETS.find((m) => m.symbol === "BTC/USD")!
      : MARKETS.find((m) => m.symbol === "EUR/USD")!;
  const candles = await fetchCandles(cfg, market, "1h", 80);
  return candles[candles.length - 1].close;
}
