export type ProviderId = "twelvedata" | "alphavantage" | "yahoo" | "binance";
export type Timeframe = "5m" | "15m" | "1h" | "4h" | "1D";
export type MarketCategory = "forex" | "commodities" | "crypto" | "stocks";
export type Direction = "BUY" | "SELL" | "NO_TRADE";
export type StrategyId =
  | "ema_trend"
  | "rsi_reversal"
  | "macd_momentum"
  | "bollinger_bounce"
  | "donchian_breakout"
  | "supertrend"
  | "stoch_cross";
export type AiProviderId = "openai" | "anthropic" | "gemini" | "groq" | "openrouter" | "deepseek" | "custom";

export interface Market {
  symbol: string;
  name: string;
  category: MarketCategory;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ProviderConfig {
  provider: ProviderId;
  apiKey: string;
}

export interface AiConfig {
  provider: AiProviderId;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface StrategyVote {
  id: StrategyId;
  name: string;
  vote: -1 | 0 | 1;
  reason: string;
}

export interface Indicators {
  price: number;
  ema9: number;
  ema21: number;
  ema200: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  atr: number;
  atrPct: number;
  bbUpper: number;
  bbMid: number;
  bbLower: number;
  stochK: number;
  stochD: number;
  supertrend: 1 | -1;
  trend: "Bullish" | "Bearish" | "Neutral";
}

export interface TradeLevels {
  side: "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  riskReward: number;
}

export interface Signal {
  id: string;
  symbol: string;
  marketName: string;
  category: MarketCategory;
  timeframe: Timeframe;
  provider: ProviderId;
  generatedAt: number;
  candleCount: number;
  direction: Direction;
  confidence: number;
  buyVotes: number;
  sellVotes: number;
  totalStrategies: number;
  votes: StrategyVote[];
  levels: TradeLevels | null;
  indicators: Indicators;
  candles: Candle[];
  decimals: number;
}

export interface AiVerdict {
  verdict: "GOOD" | "CAUTION" | "BAD" | "UNKNOWN";
  bias: "BULLISH" | "BEARISH" | "NEUTRAL" | "UNKNOWN";
  score: number | null;
  reason: string;
  raw: string;
}
