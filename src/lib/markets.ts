import type { Market, MarketCategory, Timeframe } from "./types";

export const CATEGORIES: { id: MarketCategory; label: string; emoji: string }[] = [
  { id: "forex", label: "Forex", emoji: "💱" },
  { id: "commodities", label: "Metals", emoji: "🥇" },
  { id: "crypto", label: "Crypto", emoji: "🪙" },
  { id: "stocks", label: "Stocks", emoji: "📈" },
];

export const MARKETS: Market[] = [
  { symbol: "EUR/USD", name: "Euro / US Dollar", category: "forex" },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", category: "forex" },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", category: "forex" },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", category: "forex" },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", category: "forex" },
  { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", category: "forex" },
  { symbol: "NZD/USD", name: "New Zealand Dollar / US Dollar", category: "forex" },
  { symbol: "EUR/GBP", name: "Euro / British Pound", category: "forex" },
  { symbol: "EUR/JPY", name: "Euro / Japanese Yen", category: "forex" },
  { symbol: "GBP/JPY", name: "British Pound / Japanese Yen", category: "forex" },
  { symbol: "XAU/USD", name: "Gold / US Dollar", category: "commodities" },
  { symbol: "XAG/USD", name: "Silver / US Dollar", category: "commodities" },
  { symbol: "BTC/USD", name: "Bitcoin", category: "crypto" },
  { symbol: "ETH/USD", name: "Ethereum", category: "crypto" },
  { symbol: "SOL/USD", name: "Solana", category: "crypto" },
  { symbol: "XRP/USD", name: "XRP", category: "crypto" },
  { symbol: "BNB/USD", name: "BNB", category: "crypto" },
  { symbol: "DOGE/USD", name: "Dogecoin", category: "crypto" },
  { symbol: "AAPL", name: "Apple Inc.", category: "stocks" },
  { symbol: "MSFT", name: "Microsoft", category: "stocks" },
  { symbol: "NVDA", name: "NVIDIA", category: "stocks" },
  { symbol: "TSLA", name: "Tesla", category: "stocks" },
  { symbol: "AMZN", name: "Amazon", category: "stocks" },
  { symbol: "GOOGL", name: "Alphabet (Google)", category: "stocks" },
  { symbol: "META", name: "Meta Platforms", category: "stocks" },
  { symbol: "SPY", name: "S&P 500 ETF", category: "stocks" },
];

export const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: "5m", label: "5 min" },
  { id: "15m", label: "15 min" },
  { id: "1h", label: "1 hour" },
  { id: "4h", label: "4 hours" },
  { id: "1D", label: "Daily" },
];
